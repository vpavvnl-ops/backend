const AddFundRequest = require('../../models/AddFundRequest');
const User = require('../../models/User');
const mongoose = require('mongoose');

// @route   GET /api/admin/addfund/pending
// @desc    Get all pending add fund requests with pagination
// @access  Private (super_admin, sub_admin, staff_admin)
exports.getPendingAddFunds = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const query = { status: 'pending' };

    const [requests, totalPending] = await Promise.all([
      AddFundRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'username email mobile wallet_balance available_balance'),
      AddFundRequest.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalPending / limit);

    return res.status(200).json({
      success: true,
      message: 'Pending add fund requests fetched successfully',
      data: {
        requests,
        pagination: {
          totalPending,
          currentPage: page,
          totalPages,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Admin Get Pending Add Funds Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching pending add fund requests'
    });
  }
};

// @route   GET /api/admin/addfund/:id
// @desc    Get single add fund request details
// @access  Private (super_admin, sub_admin, staff_admin)
exports.getAddFundDetails = async (req, res) => {
  try {
    const requestId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format'
      });
    }

    const request = await AddFundRequest.findById(requestId)
      .populate('user', '-password');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Add fund request not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Add fund details fetched successfully',
      data: request
    });

  } catch (error) {
    console.error('Admin Get Add Fund Details Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching add fund details'
    });
  }
};

// @route   PUT /api/admin/addfund/approve/:id
// @desc    Approve add fund request and credit user wallet
// @access  Private (super_admin, sub_admin)
exports.approveAddFund = async (req, res) => {
  try {
    const requestId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format'
      });
    }

    // Find request and populate user to ensure they exist
    const request = await AddFundRequest.findById(requestId).populate('user');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Add fund request not found'
      });
    }

    if (!request.user) {
      return res.status(404).json({
        success: false,
        message: 'Associated user account no longer exists'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve. Request is already ${request.status}`
      });
    }

    const user = request.user;
    const amount = Number(request.amount);

    // 1. Update Request Status
    request.status = 'approved';
    request.approved_at = new Date();

    // 2. Apply Funds to User Balances
    user.wallet_balance += amount;
    user.available_balance += amount;

    // 3. Save concurrently
    await Promise.all([
      request.save(),
      user.save()
    ]);

    return res.status(200).json({
      success: true,
      message: 'Add fund request approved and wallet credited successfully',
      data: {
        requestId: request._id,
        userId: user._id,
        credited_amount: amount,
        new_wallet_balance: user.wallet_balance,
        new_available_balance: user.available_balance,
        status: request.status
      }
    });

  } catch (error) {
    console.error('Admin Approve Add Fund Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while approving add fund request'
    });
  }
};

// @route   PUT /api/admin/addfund/reject/:id
// @desc    Reject add fund request with a reason
// @access  Private (super_admin, sub_admin)
exports.rejectAddFund = async (req, res) => {
  try {
    const requestId = req.params.id;
    const { admin_remark } = req.body;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format'
      });
    }

    if (!admin_remark || admin_remark.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Rejection remark is required'
      });
    }

    const request = await AddFundRequest.findById(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Add fund request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject. Request is already ${request.status}`
      });
    }

    // 1. Update Status and Remark
    request.status = 'rejected';
    request.admin_remark = admin_remark.trim();
    
    await request.save();

    return res.status(200).json({
      success: true,
      message: 'Add fund request rejected successfully',
      data: {
        requestId: request._id,
        status: request.status,
        admin_remark: request.admin_remark
      }
    });

  } catch (error) {
    console.error('Admin Reject Add Fund Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while rejecting add fund request'
    });
  }
};