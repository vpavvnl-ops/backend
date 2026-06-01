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

        for (let level = 1; level <= 7; level++) {
            if (currentLevelUsers.length === 0) break;
            
            const downline = await User.find({ referred_by: { $in: currentLevelUsers } })
                .select('username email mobile referral_code rank is_prime is_active createdAt');

            tree[`level_${level}`] = downline;
            currentLevelUsers = downline.map(u => u._id);
        }

        res.status(200).json({ success: true, tree });
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
        const { type, amount, transaction_id } = req.body;
        const userId = req.user.userId;
        const payment_proof = req.file ? req.file.path : req.body.payment_proof;

        if (!['activation', 'reactivation'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid request type' });
        }
        
        if (!amount || !transaction_id || !payment_proof) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (type === 'activation' && user.is_prime) {
            return res.status(400).json({ success: false, message: 'User is already prime' });
        }
        
        if (type === 'reactivation' && (!user.is_prime || user.is_active)) {
            return res.status(400).json({ success: false, message: 'Reactivation is only for inactive prime users' });
        }

        const settings = await Settings.findOne() || new Settings();
        
        if (type === 'activation' && Number(amount) !== settings.prime_amount) {
            return res.status(400).json({ success: false, message: `Activation requires ₹${settings.prime_amount}` });
        }
        
        if (type === 'reactivation' && Number(amount) !== settings.reactivation_fee) {
            return res.status(400).json({ success: false, message: `Reactivation requires ₹${settings.reactivation_fee}` });
        }

        const duplicateTx = await PrimeRequest.findOne({ transaction_id });
        if (duplicateTx) {
            return res.status(400).json({ success: false, message: 'Transaction ID already used' });
        }

        const existingPending = await PrimeRequest.findOne({ user: userId, status: 'pending' });
        if (existingPending) {
            return res.status(400).json({ success: false, message: 'You already have a pending request.' });
        }

        await PrimeRequest.create({ 
            user: userId, 
            type, 
            amount: Number(amount), 
            transaction_id, 
            payment_proof 
        });

        res.status(200).json({ success: true, message: 'Request submitted successfully. Waiting for admin approval.' });

    } catch (error) { 
        console.error("PRIME REQUEST ERROR =>", error);
        res.status(500).json({ success: false, message: 'Server Error' }); 
    }
};