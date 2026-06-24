const User = require('../models/User');
const PrimeRequest = require('../models/PrimeRequest');
const Settings = require('../models/Settings');

// =====================================
// REFERRAL TREE (7 LEVELS)
// =====================================

exports.getReferralTree = async (req, res) => {
    try {
        const userId = req.user.userId;
        let currentLevelUsers = [userId];
        
        const tree = {};
        const level_counts = {};
        let total_team_count = 0;

        // Initialize all 7 levels so they always return, even if empty
        for (let i = 1; i <= 7; i++) {
            tree[`level_${i}`] = [];
            level_counts[`level_${i}`] = 0;
        }

        for (let level = 1; level <= 7; level++) {
            // Break early to save DB queries if no users are in the current downline.
            // Because of the initialization above, empty levels still get returned.
            if (currentLevelUsers.length === 0) break;
            
            const downline = await User.find({ referred_by: { $in: currentLevelUsers } })
                .select('username email mobile referral_code rank is_prime is_active createdAt');

            const count = downline.length;
            
            tree[`level_${level}`] = downline;
            level_counts[`level_${level}`] = count;
            total_team_count += count;
            
            currentLevelUsers = downline.map(u => u._id);
        }

        res.status(200).json({ 
            success: true, 
            total_team_count,
            level_counts,
            tree 
        });
    } catch (error) { 
        console.error("REFERRAL TREE ERROR =>", error);
        res.status(500).json({ success: false, message: 'Server Error' }); 
    }
};

// =====================================
// LEADERBOARD
// =====================================

exports.getLeaderboard = async (req, res) => {
    try {
        // Top 10 by Total Income
        const topEarners = await User.find({ is_prime: true })
            .sort({ total_income: -1 })
            .limit(10)
            .select('username total_income rank');
        
        // Top 10 by Direct Referrals
        const topDirects = await User.aggregate([
            { $group: { _id: "$referred_by", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: "$user" },
            { $project: { username: "$user.username", rank: "$user.rank", direct_count: "$count" } }
        ]);

        // Top 10 by Total Team Size
        const topTeamSizes = await User.find({ total_team_count: { $gt: 0 } })
            .sort({ total_team_count: -1 })
            .limit(10)
            .select('username total_team_count rank');

        res.status(200).json({ success: true, topEarners, topDirects, topTeamSizes });
    } catch (error) { 
        console.error("LEADERBOARD ERROR =>", error);
        res.status(500).json({ success: false, message: 'Server Error' }); 
    }
};

// =====================================
// SUBMIT PRIME REQUEST
// =====================================

exports.submitPrimeRequest = async (req, res) => {
    try {
        const { type } = req.body;
        const userId = req.user.userId;

        if (!['activation', 'reactivation'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request type'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (type === 'activation' && user.is_prime) {
            return res.status(400).json({
                success: false,
                message: 'User is already prime'
            });
        }

        if (
            type === 'reactivation' &&
            (!user.is_prime || user.is_active)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Reactivation is only for inactive prime users'
            });
        }

        const settings = await Settings.findOne() || new Settings();

        const requiredAmount =
            type === 'activation'
                ? settings.prime_amount
                : settings.reactivation_fee;

        if ((user.wallet_balance || 0) < requiredAmount) {
            return res.status(400).json({
                success: false,
               message: `Insufficient wallet balance. Required ₹${requiredAmount}`
            });
        }

        const existingPending = await PrimeRequest.findOne({
            user: userId,
            status: 'pending'
        });

        if (existingPending) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending request.'
            });
        }
            user.wallet_balance -= requiredAmount;
            user.available_balance -= requiredAmount;

            await user.save();
        
        await PrimeRequest.create({
            user: userId,
            type,
            amount: requiredAmount
        });

        res.status(200).json({
            success: true,
            message: 'Prime request submitted successfully. Waiting for admin approval.'
        });

    } catch (error) {

        console.error(
            'PRIME REQUEST ERROR =>',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }
};