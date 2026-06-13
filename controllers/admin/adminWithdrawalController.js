const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const Withdrawal = require('../../models/Withdrawal');
const mongoose = require('mongoose');
// @route   GET /api/admin/withdrawals/pending
// @desc    Get all pending withdrawal requests with pagination (Optimized payload)
// @access  Private (super_admin, sub_admin, staff_admin)
exports.getPendingWithdrawals = async (req, res) => {
  try {
    // 1. Extract and format pagination parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    // 2. Build query for pending withdrawals
    const query = { status: 'Pending' };

    // 3. Execute database queries concurrently with explicit field selection
    const [withdrawals, totalPending] = await Promise.all([
      Withdrawal.find(query)
        .sort({ createdAt: -1 }) 
        .skip(skip)
        .limit(limit)
        .select('_id amount payable_amount tds_deducted status createdAt') // Select specific withdrawal fields
        .populate('user', 'username email mobile'), // Select specific user fields
      Withdrawal.countDocuments(query)
    ]);

    // 4. Calculate pagination metadata
    const totalPages = Math.ceil(totalPending / limit);

    // 5. Return strictly formatted response
    return res.status(200).json({
      success: true,
      message: 'Pending withdrawals fetched successfully',
      data: {
        withdrawals,
        pagination: {
          totalPending,
          currentPage: page,
          totalPages,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Admin Get Pending Withdrawals Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching pending withdrawals'
    });
  }
};

// @route   GET /api/admin/withdrawal/:id
// @desc    Get single withdrawal details by ID (Specific fields only)
// @access  Private (super_admin, sub_admin, staff_admin)
exports.getWithdrawalDetails = async (req, res) => {
  try {
    const withdrawalId = req.params.id;

    // 1. Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid withdrawal ID format'
      });
    }

    // 2. Define specific fields to select
    const withdrawalFields = '_id amount tds_deducted payable_amount bank_name account_number ifsc_code account_holder_name status rejectReason approvedAt createdAt updatedAt';
    const userFields = '_id username email mobile kyc_status status';

    // 3. Find withdrawal by ID, select specific fields, and populate specific user fields
    const withdrawal = await Withdrawal.findById(withdrawalId)
      .select(withdrawalFields)
      .populate('user', userFields);

    // 4. Handle case where withdrawal does not exist
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal record not found'
      });
    }

    // 5. Return standard response
    return res.status(200).json({
      success: true,
      message: 'Withdrawal details fetched successfully',
      data: withdrawal
    });

  } catch (error) {
    console.error('Admin Get Withdrawal Details Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching withdrawal details'
    });
  }
};
exports.approveWithdrawal = async (req, res) => {
    try {

        const { withdrawalId } = req.body;

        const withdrawal = await Withdrawal.findById(withdrawalId);

        if (!withdrawal) {
            return res.status(404).json({
                success: false,
                message: 'Withdrawal not found'
            });
        }

        if (withdrawal.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: `Withdrawal is already ${withdrawal.status}`
            });
        }

        withdrawal.status = 'Approved';
        withdrawal.approvedAt = new Date();

        await withdrawal.save();

        await Transaction.findOneAndUpdate(
            {
                user: withdrawal.user,
                type: 'withdrawal',
                amount: withdrawal.amount,
                status: 'pending'
            },
            {
                status: 'success'
            },
            {
                sort: { createdAt: -1 }
            }
        );

        res.status(200).json({
            success: true,
            message: 'Withdrawal approved successfully'
        });

    } catch (error) {

        console.log(
            'APPROVE WITHDRAWAL ERROR =>',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }
};
exports.rejectWithdrawal = async (req, res) => {
    try {
        const { withdrawalId, rejectReason } = req.body;
        
        // 1. Find and validate the withdrawal request
        const withdrawal = await Withdrawal.findById(withdrawalId);
        if (!withdrawal) {
            return resexports.approveWithdrawal.status(404).json({ success: false, message: 'Withdrawal request not found' });
        }
        
        // 2. Prevent duplicate rejections (Idempotency check)
        if (withdrawal.status !== 'Pending') {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot reject. Withdrawal is already ${withdrawal.status}` 
            });
        }

        const reason = rejectReason || 'Rejected by Admin due to policy violation';

        // 3. Atomically refund both balances to prevent race conditions
        const updatedUser = await User.findOneAndUpdate(
            { _id: withdrawal.user },
            { 
                $inc: { 
                    available_balance: withdrawal.amount, 
                    wallet_balance: withdrawal.amount 
                } 
            },
            { new: true } // Returns the updated document with the new balances
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User associated with this withdrawal not found' });
        }

        // 4. Update the withdrawal record
        withdrawal.status = 'Rejected';
        withdrawal.rejectReason = reason;
        await withdrawal.save();

        // 5. Update the corresponding pending transaction
        await Transaction.findOneAndUpdate(
            { 
                user: withdrawal.user, 
                type: 'withdrawal', 
                amount: withdrawal.amount, 
                status: 'pending' 
            },
            { 
                status: 'failed', 
                description: `Withdrawal Rejected: ${reason}` 
            },
            { sort: { createdAt: -1 } } // Ensures we update the most recent matching transaction
        );

        // 6. Return success with the dynamically updated balances
        res.status(200).json({ 
            success: true, 
            message: 'Withdrawal rejected successfully. Funds have been refunded to the user.',
            refunded_amount: withdrawal.amount,
            updated_balances: {
                available_balance: updatedUser.available_balance,
                wallet_balance: updatedUser.wallet_balance
            }
        });

    } catch (error) {
        console.error("REJECT WITHDRAWAL ERROR =>", error);
        res.status(500).json({ success: false, message: 'Server Error processing rejection' });
    }
};
