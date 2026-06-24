const mongoose = require('mongoose');
const User = require('../../models/User');

exports.getUsers = async (req, res) => {
    try {

        const page = Math.max(
            1,
            parseInt(req.query.page) || 1
        );

        const limit = Math.max(
            1,
            parseInt(req.query.limit) || 10
        );

        const skip = (page - 1) * limit;

        const searchQuery = req.query.search
            ? req.query.search.trim()
            : '';

        let query = {};

        if (searchQuery && searchQuery.length >= 2) {
            query = {
  $or: [
    {
      username: {
        $regex: searchQuery,
        $options: 'i'
      }
    },
    {
      email: {
        $regex: searchQuery,
        $options: 'i'
      }
    },
    {
      mobile: {
        $regex: searchQuery,
        $options: 'i'
      }
    },
             {
                   referral_code: {
                 $regex: searchQuery,
                $options: 'i'
               }
             }
           ]
          };
        }

        const [users, totalUsers] =
            await Promise.all([
                User.find(query)
                    .sort({ created_at: -1 })
                    .skip(skip)
                    .limit(limit)
                    .select('-password'),

                User.countDocuments(query)
            ]);

        const totalPages =
            Math.ceil(totalUsers / limit);

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

        console.error(
            'Admin Get Users Error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Server error while fetching users'
        });
    }
};
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(userId)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User details fetched successfully',
      data: user
    });

  } catch (error) {

    console.error(
      'Admin Get Single User Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Server error while fetching user details'
    });
  }
};
// @route   PUT /api/admin/user/block/:id
// @desc    Block a user from accessing the platform
// @access  Private (super_admin, sub_admin only)
exports.blockUser = async (req, res) => {
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

    // 3. Check if user is already blocked
    if (user.status === 'Blocked') {
      return res.status(400).json({
        success: false,
        message: 'User is already blocked'
      });
    }

    // 4. Update status to Blocked
    user.status = 'Blocked';
    await user.save();

    // 5. Return standard response
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
// @access  Private (super_admin, sub_admin only)
exports.unblockUser = async (req, res) => {
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

    // 3. Check if user is already active
    if (user.status === 'Active') {
      return res.status(400).json({
        success: false,
        message: 'User is already active'
      });
    }

    // 4. Update status to Active
    user.status = 'Active';
    await user.save();

    // 5. Return standard response
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