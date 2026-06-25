const mongoose = require('mongoose');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const AddFundRequest = require('../../models/AddFundRequest');
const Withdrawal = require('../../models/Withdrawal');
const PrimeRequest = require('../../models/PrimeRequest');

// @route   GET /api/admin/users
// @desc    Get all users with advanced filtering, searching, and pagination
// @access  Private
exports.getUsers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;
        const searchQuery = req.query.search ? req.query.search.trim() : '';

        let query = {};

        // 1. Core Search Filters
        if (searchQuery && searchQuery.length >= 2) {
            query.$or = [
                { username: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } },
                { mobile: { $regex: searchQuery, $options: 'i' } },
                { referral_code: { $regex: searchQuery, $options: 'i' } }
            ];
        }

        // 2. Advanced Categorization Filters
        if (req.query.status) {
            if (req.query.status === 'Inactive') {
                query.is_active = false;
            } else {
                query.status = req.query.status; // 'Active' or 'Blocked'
            }
        }

        if (req.query.is_prime) {
            query.is_prime = req.query.is_prime === 'true';
        }

        if (req.query.kyc_status) {
            query.kyc_status = req.query.kyc_status; // 'Not Submitted', 'Pending', 'Approved', 'Rejected'
        }

        if (req.query.rank) {
            query.rank = req.query.rank;
        }

        const [users, totalUsers] = await Promise.all([
            User.find(query)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
                .select('-password'),
            User.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalUsers / limit);

        return res.status(200).json({
            success: true,
            message: 'Users fetched successfully',
            data: {
                users,
                pagination: {
                    totalUsers,
                    currentPage: page,
                    totalPages,
                    limit
                }
            }
        });

    } catch (error) {
        console.error('Admin Get Users Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching users'
        });
    }
};

// @route   GET /api/admin/user/:id
// @desc    Get detailed user profile (100% Backward Compatible)
// @access  Private
exports.getUserById = async (req, res) => {
    try {
        const userId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Fetching the raw document to preserve native primitive types
        const userDoc = await User.findById(userId).select('-password');

        if (!userDoc) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Convert to plain JavaScript object to append properties safely
        const user = userDoc.toObject();

        if (user.referred_by) {
            const sponsor = await User.findById(user.referred_by).select('username referral_code email');
            user.sponsor_details = sponsor ? sponsor : null;
        } else {
            user.sponsor_details = null;
        }

        return res.status(200).json({
            success: true,
            message: 'User details fetched successfully',
            data: user
        });

    } catch (error) {
        console.error('Admin Get Single User Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching user details'
        });
    }
};

// @route   PUT /api/admin/user/block/:id
// @desc    Block a user from accessing the platform
// @access  Private
exports.blockUser = async (req, res) => {
    try {
        const userId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.status === 'Blocked') {
            return res.status(400).json({
                success: false,
                message: 'User is already blocked'
            });
        }

        user.status = 'Blocked';
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'User has been blocked successfully',
            data: {
                _id: user._id,
                status: user.status
            }
        });

    } catch (error) {
        console.error('Admin Block User Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while blocking user'
        });
    }
};

// @route   PUT /api/admin/user/unblock/:id
// @desc    Unblock a user
// @access  Private
exports.unblockUser = async (req, res) => {
    try {
        const userId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.status === 'Active') {
            return res.status(400).json({
                success: false,
                message: 'User is already active'
            });
        }

        user.status = 'Active';
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'User has been unblocked successfully',
            data: {
                _id: user._id,
                status: user.status
            }
        });

    } catch (error) {
        console.error('Admin Unblock User Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while unblocking user'
        });
    }
};

// @route   GET /api/admin/user/network/:id
// @desc    Get 7-Level Upline, Downline and Metric Totals
// @access  Private
exports.getUserNetwork = async (req, res) => {
    try {
        const userId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        // 1. Recursive Downline Query (Level 1 to 7)
        const downlineTree = await User.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(userId) } },
            {
                $graphLookup: {
                    from: 'users',
                    startWith: '$_id',
                    connectFromField: '_id',
                    connectToField: 'referred_by',
                    as: 'downline',
                    maxDepth: 6,
                    depthField: 'level'
                }
            },
            { $project: { downline: 1 } }
        ]);

        // 2. Recursive Upline Query (Level 1 to 7)
        const uplineTree = await User.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(userId) } },
            {
                $graphLookup: {
                    from: 'users',
                    startWith: '$referred_by',
                    connectFromField: 'referred_by',
                    connectToField: '_id',
                    as: 'upline',
                    maxDepth: 6,
                    depthField: 'level'
                }
            },
            { $project: { upline: 1 } }
        ]);

        const downlineList = (downlineTree[0] && downlineTree[0].downline) || [];
        const uplineList = (uplineTree[0] && uplineTree[0].upline) || [];

        // Formatting Downline structural levels
        const organizedDownline = Array.from({ length: 7 }, (_, i) => ({
            level: i + 1,
            members: downlineList
                .filter(u => u.level === i)
                .map(u => ({
                    _id: u._id,
                    username: u.username,
                    email: u.email,
                    mobile: u.mobile,
                    status: u.status,
                    is_prime: u.is_prime,
                    rank: u.rank,
                    created_at: u.created_at
                }))
        }));

        // Formatting Upline structural levels
        const organizedUpline = Array.from({ length: 7 }, (_, i) => ({
            level: i + 1,
            members: uplineList
                .filter(u => u.level === i)
                .map(u => ({
                    _id: u._id,
                    username: u.username,
                    email: u.email,
                    mobile: u.mobile,
                    status: u.status,
                    is_prime: u.is_prime,
                    rank: u.rank,
                    created_at: u.created_at
                }))
        }));

        // Calculating explicit team total metrics
        const directTeamCount = downlineList.filter(u => u.level === 0).length;
        const totalTeamCount = downlineList.length;
        const primeTeamCount = downlineList.filter(u => u.is_prime === true).length;
        const activeTeamCount = downlineList.filter(u => u.status === 'Active' || u.is_active === true).length;
        const inactiveTeamCount = downlineList.filter(u => u.status === 'Blocked' || u.status === 'Inactive' || u.is_active === false).length;

        const networkPayload = {
            upline: organizedUpline,
            downline: organizedDownline,
            totals: {
                direct_team: directTeamCount,
                total_team: totalTeamCount,
                prime_team: primeTeamCount,
                active_team: activeTeamCount,
                inactive_team: inactiveTeamCount
            }
        };

        // Gated parameter fallback to retain 100% exact array response structure backward compatibility
        if (req.query.format !== 'extended') {
            return res.status(200).json({
                success: true,
                message: 'Referral network tree pulled successfully',
                data: organizedDownline
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Extended referral network profiles compiled successfully',
            data: networkPayload
        });

    } catch (error) {
        console.error('Admin Get Network Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error tracking referral structural lineage'
        });
    }
};

// @route   GET /api/admin/user/ledger/:id
// @desc    Get Unified Transaction Ledger with advanced filters & native data exports
// @access  Private
exports.getUserLedger = async (req, res) => {
    try {
        const userId = req.params.id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);
        let globalMatch = {};

        // 1. Parameter Filter Integrations
        if (req.query.type) {
            globalMatch.type = req.query.type;
        }
        if (req.query.status) {
            globalMatch.status = req.query.status;
        }
        if (req.query.startDate || req.query.endDate) {
            globalMatch.createdAt = {};
            if (req.query.startDate) globalMatch.createdAt.$gte = new Date(req.query.startDate);
            if (req.query.endDate) globalMatch.createdAt.$lte = new Date(req.query.endDate);
        }

        // 2. Transaction ID Search (Targeting Native MongoDB _id match or Description regex fallback)
        if (req.query.search) {
            const searchToken = req.query.search.trim();
            if (mongoose.Types.ObjectId.isValid(searchToken)) {
                globalMatch._id = new mongoose.Types.ObjectId(searchToken);
            } else {
                globalMatch.description = { $regex: searchToken, $options: 'i' };
            }
        }

        const aggregationPipeline = [
            { $match: { user: userObjectId } },
            {
                $project: {
                    amount: 1,
                    type: 1,
                    status: 1,
                    description: 1,
                    createdAt: 1,
                    origin: { $literal: 'General Ledger' }
                }
            },
            {
                $unionWith: {
                    coll: 'addfundrequests',
                    pipeline: [
                        { $match: { user: userObjectId } },
                        {
                            $project: {
                                amount: 1,
                                type: { $literal: 'deposit_fund' },
                                status: 1,
                                description: { $ifNull: ['$admin_remark', 'Manual Fund Request Processed'] },
                                createdAt: 1,
                                origin: { $literal: 'Add Fund Request' }
                            }
                        }
                    ]
                }
            },
            {
                $unionWith: {
                    coll: 'withdrawals',
                    pipeline: [
                        { $match: { user: userObjectId } },
                        {
                            $project: {
                                amount: 1,
                                type: { $literal: 'withdrawal' },
                                status: { $toLower: '$status' },
                                description: { $ifNull: ['$rejectReason', 'Payout Withdrawal Executed'] },
                                createdAt: '$createdAt',
                                origin: { $literal: 'Withdrawal Request' }
                            }
                        }
                    ]
                }
            },
            {
                $unionWith: {
                    coll: 'primerequests',
                    pipeline: [
                        { $match: { user: userObjectId } },
                        {
                            $project: {
                                amount: 1,
                                type: { $concat: ['prime_', '$type'] },
                                status: 1,
                                description: { $ifNull: ['$admin_remark', 'Prime Plan Processing Fees'] },
                                createdAt: '$createdAt',
                                origin: { $literal: 'Prime Request' }
                            }
                        }
                    ]
                }
            },
            { $match: globalMatch },
            { $sort: { createdAt: -1 } }
        ];

        // 3. Execution of Native Export Logic (Excel-Compatible with UTF-8 BOM Prefix)
        if (req.query.export === 'csv' || req.query.export === 'excel') {
            const exportRecords = await Transaction.aggregate(aggregationPipeline);
            
            // Injects Byte Order Mark (\ufeff) to safely mandate explicit cell parsing within Excel
            let docContent = '\ufeffTransaction ID,Origin,Type,Amount,Status,Description,Date\n';
            exportRecords.forEach(r => {
                const escapedDesc = r.description ? r.description.replace(/"/g, '""') : '';
                docContent += `"${r._id}","${r.origin}","${r.type}",${r.amount},"${r.status}","${escapedDesc}","${r.createdAt}"\n`;
            });

            const mimeType = req.query.export === 'excel' ? 'application/vnd.ms-excel' : 'text/csv';
            const fileExtension = req.query.export === 'excel' ? 'xls' : 'csv';

            res.setHeader('Content-Type', `${mimeType}; charset=utf-8`);
            res.setHeader('Content-Disposition', `attachment; filename=ledger_${userId}_${Date.now()}.${fileExtension}`);
            return res.status(200).send(Buffer.from(docContent, 'utf-8'));
        }

        // 4. Fallback Paginated JSON execution
        const [completeLedger, totalRecordsResult] = await Promise.all([
            Transaction.aggregate([...aggregationPipeline, { $skip: skip }, { $limit: limit }]),
            Transaction.aggregate([...aggregationPipeline, { $count: 'count' }])
        ]);

        const totalRecords = (totalRecordsResult[0] && totalRecordsResult[0].count) || 0;
        const totalPages = Math.ceil(totalRecords / limit);

        return res.status(200).json({
            success: true,
            message: 'Unified financial ledger compiled successfully',
            data: {
                ledger: completeLedger,
                pagination: {
                    totalRecords,
                    currentPage: page,
                    totalPages,
                    limit
                }
            }
        });

    } catch (error) {
        console.error('Admin Compile Ledger Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during unified calculation pipeline compilation'
        });
    }
};

// @route   GET /api/admin/user/timeline/:id
// @desc    Get Virtual Chronological Activity Timeline from stored database vectors
// @access  Private
exports.getUserTimeline = async (req, res) => {
    try {
        const userId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        const targetUser = await User.findById(userId).select('created_at last_login username');
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User profile tracking targets not found'
            });
        }

        let events = [];

        events.push({
            event_type: 'Account Created',
            timestamp: targetUser.created_at,
            details: 'Profile recorded into server database successfully.'
        });

        if (targetUser.last_login) {
            events.push({
                event_type: 'User Login',
                timestamp: targetUser.last_login,
                details: 'User authorization token generated successfully.'
            });
        }

        const [funds, withdrawals, primes] = await Promise.all([
            AddFundRequest.find({ user: userId, status: { $in: ['approved', 'success'] } }).select('amount approved_at createdAt'),
            Withdrawal.find({ user: userId, status: 'Approved' }).select('amount approvedAt createdAt'),
            PrimeRequest.find({ user: userId, status: 'approved' }).select('amount approved_at type createdAt')
        ]);

        funds.forEach(f => {
            events.push({
                event_type: 'Funds Credited',
                timestamp: f.approved_at || f.createdAt,
                details: `Wallet entry executed successfully for value amount of ₹${f.amount}.`
            });
        });

        withdrawals.forEach(w => {
            events.push({
                event_type: 'Withdrawal Approved',
                timestamp: w.approvedAt || w.createdAt,
                details: `Payout authorization successfully validated for total value of ₹${w.amount}.`
            });
        });

        primes.forEach(p => {
            events.push({
                event_type: `Prime Plan ${p.type === 'activation' ? 'Activated' : 'Reactivated'}`,
                timestamp: p.approved_at || p.createdAt,
                details: `Premium access tier configuration applied successfully via package allocation fee of ₹${p.amount}.`
            });
        });

        events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return res.status(200).json({
            success: true,
            message: 'Virtual database activity tracking trace completed',
            data: events
        });

    } catch (error) {
        console.error('Admin Compile Timeline Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error processing system historical execution arrays'
        });
    }
};

// @route   POST /api/admin/user/adjust-balance
// @desc    Perform manual direct atomic balance updates wrapped inside a safe MongoDB storage session transaction context
// @access  Private
exports.adjustUserBalance = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const { userId, amount, action_type, remark } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid operational user target identification token'
            });
        }

        if (!['credit', 'debit'].includes(action_type)) {
            return res.status(400).json({
                success: false,
                message: 'Adjustment operations must explicitly be configuration types credit or debit'
            });
        }

        const adjustmentVal = parseFloat(amount);
        if (isNaN(adjustmentVal) || adjustmentVal <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Adjustment baseline numeric criteria must be positive configuration floats'
            });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'Target operational profile cannot be located'
            });
        }

        if (action_type === 'debit' && targetUser.available_balance < adjustmentVal) {
            return res.status(400).json({
                success: false,
                message: `Insufficient profile liquidity ledger. Present status balance: ₹${targetUser.available_balance}`
            });
        }

        const numericShiftValue = action_type === 'credit' ? adjustmentVal : -adjustmentVal;
        let finalUpdatedUser = null;

        // Executing atomic sequence mapping within safe transaction layer boundaries
        await session.withTransaction(async () => {
            finalUpdatedUser = await User.findByIdAndUpdate(
                userId,
                {
                    $inc: {
                        available_balance: numericShiftValue,
                        wallet_balance: numericShiftValue
                    }
                },
                { new: true, runValidators: true, session }
            );

            const ledgerRecord = new Transaction({
                user: userId,
                type: action_type,
                amount: adjustmentVal,
                description: remark ? remark.trim() : `Manual Adjustment modification executed by system management protocols.`,
                status: 'success'
            });

            await ledgerRecord.save({ session });
        });

        return res.status(200).json({
            success: true,
            message: 'Liquidity structural adjustments verified and finalized safely',
            data: {
                _id: finalUpdatedUser._id,
                username: finalUpdatedUser.username,
                available_balance: finalUpdatedUser.available_balance,
                wallet_balance: finalUpdatedUser.wallet_balance
            }
        });

    } catch (error) {
        console.error('Admin Wallet Adjustment Atomic Transaction Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server transaction failure handling manual currency modification pipelines'
        });
    } finally {
        await session.endSession();
    }
};