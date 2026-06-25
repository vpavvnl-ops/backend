const PrimeRequest = require('../../models/PrimeRequest');
const User = require('../../models/User');
const mongoose = require('mongoose');
const mlmEngine = require('../../utils/mlmEngine');

// @route   GET /api/admin/prime/pending
// @desc    Get all pending prime activation/reactivation requests
// @access  Private (super_admin, sub_admin, staff_admin)
exports.getPendingPrimeRequests = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const query = { status: 'pending' };

    const [requests, totalPending] = await Promise.all([
      PrimeRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'username email mobile is_prime is_active'),
      PrimeRequest.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalPending / limit);

    return res.status(200).json({
      success: true,
      message: 'Pending prime requests fetched successfully',
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
    console.error('Admin Get Pending Prime Requests Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching pending prime requests'
    });
  }
};

// @route   GET /api/admin/prime/:id
// @desc    Get single prime request details
// @access  Private (super_admin, sub_admin, staff_admin)
exports.getPrimeRequestDetails = async (req, res) => {
  try {
    const requestId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format'
      });
    }

    const request = await PrimeRequest.findById(requestId)
      .populate('user', '-password');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Prime request not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Prime request details fetched successfully',
      data: request
    });

  } catch (error) {
    console.error('Admin Get Prime Request Details Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching prime request details'
    });
  }
};

// @route   PUT /api/admin/prime/approve/:id
// @desc    Approve prime request and upgrade user
// @access  Private (super_admin, sub_admin)
exports.approvePrimeRequest = async (req, res) => {
  try {
    const requestId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format'
      });
    }

    // Find request and strictly require the user object
    const request = await PrimeRequest.findById(requestId).populate('user');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Prime request not found'
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
    if (user.is_prime) {
    return res.status(400).json({
        success: false,
        message: 'User is already a Prime member'
    });
}
    const currentDate = new Date();

    // 1. Update Request Status
    request.status = 'approved';
    request.approved_at = currentDate;
    request.admin_remark = 'Approved by Admin';

  
// 4. Activate Prime

user.is_prime = true;
user.is_active = true;
user.prime_activation_date = currentDate;

    // 3. Save both documents concurrently
    await Promise.all([
      request.save(),
      user.save()
    ]);
    await mlmEngine.distributeActivationIncome(
    user._id,
    request.type
);

    return res.status(200).json({
      success: true,
      message: 'Prime request approved and user upgraded successfully',
      data: {
        requestId: request._id,
        userId: user._id,
        is_prime: user.is_prime,
        status: request.status
      }
    });

  } catch (error) {
    console.error('Admin Approve Prime Request Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while approving prime request'
    });
  }
};

// @route   PUT /api/admin/prime/reject/:id
// @desc    Reject prime request with a reason
// @access  Private (super_admin, sub_admin)
exports.rejectPrimeRequest = async (req, res) => {
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

    const request = await PrimeRequest.findById(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Prime request not found'
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
    // Refund amount back to user's wallet
    const user = await User.findById(request.user);

    if (!user) {
    return res.status(404).json({
    success: false,
    message: 'Associated user not found'
    });
    }

    user.wallet_balance += request.amount;
    user.available_balance += request.amount;

    await user.save();
    await request.save();

    return res.status(200).json({
      success: true,
      message: 'Prime request rejected successfully',
      data: {
        requestId: request._id,
        status: request.status,
        admin_remark: request.admin_remark
      }
    });

  } catch (error) {
    console.error('Admin Reject Prime Request Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while rejecting prime request'
    });
  }
};