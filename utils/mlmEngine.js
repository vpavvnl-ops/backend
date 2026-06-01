const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');

exports.recalculateTeamCount = async (userId) => {
    let currentLevelUserIds = [userId];
    let totalTeam = 0;

    for (let level = 1; level <= 7; level++) {
        if (currentLevelUserIds.length === 0) break;
        const downline = await User.find({ referred_by: { $in: currentLevelUserIds } }).select('_id');
        totalTeam += downline.length;
        currentLevelUserIds = downline.map(u => u._id);
    }
    return totalTeam;
};

exports.checkAndUpgradeRank = async (user) => {
    if (!user.is_prime) {
        user.rank = 'Basic';
        return;
    }

    const directTeamCount = await User.countDocuments({ referred_by: user._id });
    const teamCount = await exports.recalculateTeamCount(user._id);
    
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

exports.distributeActivationIncome = async (activatedUserId, activationType = 'activation') => {
    try {
        const settings = await Settings.findOne() || new Settings();
        const activatedUser = await User.findById(activatedUserId);
        
        if (!activatedUser || !activatedUser.referred_by) return;

        let currentSponsorId = activatedUser.referred_by;
        let level = 1;

        // 1. Direct Bonus (Only on First Activation)
        if (activationType === 'activation') {
            const directSponsor = await User.findById(currentSponsorId);
            
            if (directSponsor && directSponsor.is_active && directSponsor.is_prime) {
                directSponsor.available_balance += settings.direct_referral_bonus;
                directSponsor.wallet_balance = directSponsor.available_balance; // Sync wallet_balance
                directSponsor.direct_income += settings.direct_referral_bonus;
                directSponsor.today_income += settings.direct_referral_bonus;
                directSponsor.total_income += settings.direct_referral_bonus;
                
                await directSponsor.save();
                
                await Transaction.create({
                    user: directSponsor._id,
                    type: 'direct_income',
                    amount: settings.direct_referral_bonus,
                    description: `Direct Bonus from ${activatedUser.username}`,
                    status: 'success'
                });
            }
        }

        // 2. 7-Level Distribution
        const baseAmount = activationType === 'reactivation' ? settings.reactivation_fee : settings.prime_amount;
        
        while (currentSponsorId && level <= 7) {
            const sponsor = await User.findById(currentSponsorId);
            if (!sponsor) break;
            
            if (sponsor.is_active && sponsor.is_prime) {
                const percentage = settings.level_percentages[level - 1] || 0;
                const levelIncomeAmount = (baseAmount * percentage) / 100;

                if (levelIncomeAmount > 0) {
                    sponsor.available_balance += levelIncomeAmount;
                    sponsor.wallet_balance = sponsor.available_balance; // Sync wallet_balance
                    sponsor.level_income += levelIncomeAmount;
                    sponsor.today_income += levelIncomeAmount;
                    sponsor.total_income += levelIncomeAmount;

                    const descAction = activationType === 'reactivation' ? 'Reactivation' : 'Activation';

                    await Transaction.create({
                        user: sponsor._id,
                        type: 'level_income',
                        amount: levelIncomeAmount,
                        description: `Level ${level} Income from ${activatedUser.username} ${descAction}`,
                        status: 'success'
                    });
                }
            }

            await exports.checkAndUpgradeRank(sponsor);
            await sponsor.save();

            currentSponsorId = sponsor.referred_by;
            level++;
        }
    } catch (error) {
        console.error("MLM Engine Error:", error);
    }
};