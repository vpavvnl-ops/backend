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

        if (searchQuery) {
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