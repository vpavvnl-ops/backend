const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const PrimeRequest = require('../models/PrimeRequest');
const MLMExecution = require('../models/MLMExecution');

let cachedSettings = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000;

async function getSystemSettings(session) {
const now = Date.now();
if (cachedSettings && (now - cacheTimestamp < CACHE_TTL)) {
return cachedSettings;
}

let settings = await Settings.findOne({}).session(session).lean();
if (!settings) {
    settings = {
        prime_amount: 1000,
        direct_referral_bonus: 100,
        level_percentages: [5, 3, 2, 2, 2, 2, 2],
        daily_income_limit: 5000,
        reactivation_fee: 500
    };
}

cachedSettings = settings;
cacheTimestamp = now;
return settings;
}

async function creditWallet({ userId, amount, type, description, session, settings }) {
if (amount <= 0) return 0;

const dailyLimit = settings ? settings.daily_income_limit : Infinity;

const baseInc = {
    available_balance: amount,
    wallet_balance: amount,
    today_income: amount,
    total_income: amount
};

if (type === 'direct_income') {
    baseInc.direct_income = amount;
} else if (type === 'level_income') {
    baseInc.level_income = amount;
}

const updatedUser = await User.findOneAndUpdate(
    { 
        _id: userId,
        today_income: { $lt: dailyLimit } 
    },
    { $inc: baseInc },
    { session, new: true }
);

if (!updatedUser) {
    const user = await User.findById(userId).session(session).lean();
    if (!user || user.today_income >= dailyLimit) return 0;

    const remainingLimit = dailyLimit - user.today_income;
    if (remainingLimit <= 0) return 0;

    const cappedInc = {
        available_balance: remainingLimit,
        wallet_balance: remainingLimit,
        today_income: remainingLimit,
        total_income: remainingLimit
    };
    if (type === 'direct_income') cappedInc.direct_income = remainingLimit;
    if (type === 'level_income') cappedInc.level_income = remainingLimit;

    await User.updateOne({ _id: userId }, { $inc: cappedInc }, { session });
    
    await createLedger({
        userId,
        amount: remainingLimit,
        type,
        description,
        session
    });
    return remainingLimit;
}

await createLedger({
    userId,
    amount,
    type,
    description,
    session
});

return amount;
}

async function createLedger({ userId, amount, type, description, status = 'success', session }) {
const transaction = new Transaction({
user: userId,
type,
amount,
description,
status
});
await transaction.save({ session });
}

function isEligibleSponsor(user) {
return user && user.is_prime === true && user.is_active === true;
}

exports.recalculateTeamCount = async (userId, session) => {
let currentLevelUserIds = [userId];
let totalTeam = 0;

for (let level = 1; level <= 7; level++) {
    if (currentLevelUserIds.length === 0) break;
    const downline = await User.find({ referred_by: { $in: currentLevelUserIds } })
        .select('_id')
        .session(session)
        .lean();
    totalTeam += downline.length;
    currentLevelUserIds = downline.map(u => u._id);
}
return totalTeam;
};

exports.checkAndUpgradeRank = async (user, session) => {
if (!user.is_prime) {
user.rank = 'Basic';
return;
}

const directTeamCount = await User.countDocuments({ referred_by: user._id }).session(session);
const teamCount = await exports.recalculateTeamCount(user._id, session);

user.direct_team_count = directTeamCount;
user.total_team_count = teamCount;

let newRank = 'Starter';
if (directTeamCount >= 2) newRank = 'Silver';
if (directTeamCount >= 10) newRank = 'Gold';
if (directTeamCount >= 50) newRank = 'Platinum';
if (teamCount >= 5000) newRank = 'Diamond';
if (teamCount >= 25000) newRank = 'Crown Diamond';
if (teamCount >= 50000) newRank = 'Global Crown';

user.rank = newRank;
};

exports.distributeActivationIncome = async (primeRequestId, activationType = 'activation') => {
if (!primeRequestId) {
throw new Error("Prime Request ID is required.");
}

const session = await mongoose.startSession();
session.startTransaction();

try {
    const result = await MLMExecution.updateOne(
        { prime_request: primeRequestId },
        { $setOnInsert: { prime_request: primeRequestId, createdAt: new Date() } },
        { upsert: true, session }
    );

    if (result.upsertedCount === 0) {
        await session.commitTransaction();
        return { success: true, message: "Transaction already processed via absolute atomic upsert lock." };
    }

    const primeRequest = await PrimeRequest.findById(primeRequestId).session(session);
    if (!primeRequest) {
        throw new Error(`PrimeRequest with ID ${primeRequestId} not found.`);
    }

    const settings = await getSystemSettings(session);
    const primeAmount = settings.prime_amount || 1000;
    const directBonusAmount = settings.direct_referral_bonus || 100;
    const levelPercentages = settings.level_percentages || [5, 3, 2, 2, 2, 2, 2];

    const activatedUser = await User.findOneAndUpdate(
        { _id: primeRequest.user },
        { 
            $set: { 
                is_prime: true,
                is_active: true,
                prime_activation_date: new Date()
            } 
        },
        { session, new: true }
    ).lean();

    if (!activatedUser) {
        throw new Error(`Target User ${primeRequest.user} not found.`);
    }

    if (!activatedUser.referred_by) {
        primeRequest.status = 'approved';
        await primeRequest.save({ session });
        await session.commitTransaction();
        return { success: true, message: "Root user activated without referral tree." };
    }

    let currentSponsorId = activatedUser.referred_by;
    let level = 1;

    if (activationType === 'activation') {
        const directSponsor = await User.findById(currentSponsorId).session(session);
        if (directSponsor && isEligibleSponsor(directSponsor)) {
            await creditWallet({
                userId: directSponsor._id,
                amount: directBonusAmount,
                type: 'direct_income',
                description: `Direct Bonus from ${activatedUser.username}`,
                session,
                settings
            });
        }
    }

    const baseAmount = activationType === 'reactivation' ? (settings.reactivation_fee || 500) : primeAmount;
    
    while (currentSponsorId && level <= 7) {
        const sponsor = await User.findById(currentSponsorId).session(session);
        if (!sponsor) break;
        
        if (isEligibleSponsor(sponsor)) {
            const percentage = levelPercentages[level - 1] || 0;
            const levelIncomeAmount = (baseAmount * percentage) / 100;

            if (levelIncomeAmount > 0) {
                const descAction = activationType === 'reactivation' ? 'Reactivation' : 'Activation';
                await creditWallet({
                    userId: sponsor._id,
                    amount: levelIncomeAmount,
                    type: 'level_income',
                    description: `Level ${level} Income from ${activatedUser.username} ${descAction}`,
                    session,
                    settings
                });
            }
        }

        await exports.checkAndUpgradeRank(sponsor, session);
        await sponsor.save({ session });

        currentSponsorId = sponsor.referred_by;
        level++;
    }

    primeRequest.status = 'approved';
    await primeRequest.save({ session });

    await session.commitTransaction();
    return { success: true, message: "MLM Engine distribution complete." };
} catch (error) {
    await session.abortTransaction();
    throw error;
} finally {
    session.endSession();
}
};