const User = require('../../models/User');
const Withdrawal = require('../../models/Withdrawal');
const PrimeRequest = require('../../models/PrimeRequest');

// @route   GET /api/admin/dashboard
// @desc    Get complete dashboard statistics
// @access  Private (Admin + Allowed Roles)
exports.getDashboardStats = async (req, res) => {
    try {

        

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const [
            totalUsers,
            primeUsers,
            nonPrimeUsers,
            todayRegistrations,
            pendingKyc,
            pendingPrimeRequests,
            pendingWithdrawals,
            approvedWithdrawals,
            totalWithdrawals
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ is_prime: true }),
            User.countDocuments({ is_prime: false }),
            User.countDocuments({
                created_at: { $gte: startOfToday }
            }),
            User.countDocuments({
                kyc_status: 'Pending'
            }),
            PrimeRequest.countDocuments({
                status: 'pending'
            }),
            Withdrawal.countDocuments({
                status: 'Pending'
            }),
            Withdrawal.countDocuments({
                status: 'Approved'
            }),
            Withdrawal.countDocuments()
        ]);

        return res.status(200).json({
            success: true,
            message: 'Dashboard stats fetched successfully',
            data: {
                totalUsers,
                primeUsers,
                nonPrimeUsers,
                todayRegistrations,
                pendingKyc,
                pendingPrimeRequests,
                pendingWithdrawals,
                approvedWithdrawals,
                totalWithdrawals
            }
        });

    } catch (error) {

        console.error(
            'Admin Dashboard Stats Error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Server error while fetching dashboard statistics'
        });

    }
};