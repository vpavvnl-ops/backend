

const User = require('../../models/User');
const mongoose = require('mongoose');// @route   GET /api/admin/kyc/pending
// @desc    Get all users with pending KYC status (Optimized payload)
// @access  Private (super_admin, sub_admin, staff_admin)
exports.getPendingKyc = async (req, res) => {
  try {
    // 1. Extract and format pagination parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    // 2. Build query for pending KYC
    const query = { kyc_status: 'Pending' };

    // 3. Execute database queries concurrently with strict field projection
    const [users, totalPending] = await Promise.all([
      User.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id username email mobile kyc_status created_at'), // Explicitly select only required fields
      User.countDocuments(query)
    ]);

    // 4. Calculate pagination metadata
    const totalPages = Math.ceil(totalPending / limit);

    // 5. Return strictly formatted response
    return res.status(200).json({
      success: true,
      message: 'Pending KYC applications fetched successfully',
      data: {
        users,
        pagination: {
          totalPending,
          currentPage: page,
          totalPages,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Admin Get Pending KYC Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching pending KYC applications'
    });
  }
};

// @route   GET /api/admin/kyc/:id
// @desc    Get single user KYC details by ID (KYC fields only)
// @access  Private (super_admin, sub_admin, staff_admin)
exports.getKycDetails = async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // 2. Find user by ID and explicitly select ONLY KYC and basic identity fields
    const kycFields = 'full_name aadhaar_number pan_number bank_name account_number ifsc_code aadhaar_front_image aadhaar_back_image pan_card_image selfie_image self_auth_image signature_image kyc_status username email mobile';
    
    const user = await User.findById(userId).select(kycFields);

    // 3. Handle case where user does not exist
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 4. Return standard response
    return res.status(200).json({
      success: true,
      message: 'KYC details fetched successfully',
      data: user
    });

  } catch (error) {
    console.error('Admin Get KYC Details Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching KYC details'
    });
  }
};
// @route   PUT /api/admin/kyc/approve/:id
// @desc    Approve a user's pending KYC
// @access  Private (super_admin, sub_admin)
exports.approveKyc = async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // 2. Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 3. Check current KYC status
    if (user.kyc_status === 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'KYC is already approved for this user'
      });
    }

    if (user.kyc_status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve KYC. Current status is '${user.kyc_status}'`
      });
    }

    // 4. Update status
    user.kyc_status = 'Approved';
    await user.save();

    // 5. Return response
    return res.status(200).json({
      success: true,
      message: 'KYC has been successfully approved',
      data: {
        _id: user._id,
        kyc_status: user.kyc_status
      }
    });

  } catch (error) {
    console.error('Admin Approve KYC Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while approving KYC'
    });
  }
};

// @route   PUT /api/admin/kyc/reject/:id
// @desc    Reject a user's pending KYC
// @access  Private (super_admin, sub_admin)
exports.rejectKyc = async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // 2. Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 3. Check current KYC status
    if (user.kyc_status === 'Rejected') {
      return res.status(400).json({
        success: false,
        message: 'KYC is already rejected for this user'
      });
    }

    if (user.kyc_status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject KYC. Current status is '${user.kyc_status}'`
      });
    }

    // 4. Update status
    user.kyc_status = 'Rejected';
    // Optional: You might want to clear the uploaded images here so the user can re-upload,
    // depending on your specific business logic.
    await user.save();

    // 5. Return response
    return res.status(200).json({
      success: true,
      message: 'KYC has been rejected',
      data: {
        _id: user._id,
        kyc_status: user.kyc_status
      }
    });

  } catch (error) {
    console.error('Admin Reject KYC Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while rejecting KYC'
    });
  }
};