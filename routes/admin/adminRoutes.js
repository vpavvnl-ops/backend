const express = require('express');
const router = express.Router();


const {
    loginAdmin,
    getProfile
} = require('../../controllers/admin/adminAuthController');
const {
    getDashboardStats
} = require('../../controllers/admin/adminDashboardController');

const { adminAuth } = require('../../middleware/adminAuthMiddleware');
const { allowRoles } = require('../../middleware/adminRoleMiddleware');
const {
  getUsers,
   getUserById,
    blockUser,
  unblockUser
} = require('../../controllers/admin/adminUsersController');
const {
  getPendingKyc,
  getKycDetails,
   approveKyc,
  rejectKyc
} = require('../../controllers/admin/adminKycController');
const {
  getPendingWithdrawals,
  getWithdrawalDetails,
   approveWithdrawal,
  rejectWithdrawal
} = require('../../controllers/admin/adminWithdrawalController');

router.post('/login', loginAdmin);
router.get('/profile', adminAuth, getProfile);

router.get(
    '/dashboard',
    adminAuth,
    allowRoles(
        'super_admin',
        'sub_admin',
        'staff_admin'
    ),
    getDashboardStats
);
router.get(
    '/users',
    adminAuth,
    allowRoles(
        'super_admin',
        'sub_admin',
        'staff_admin'
    ),
    getUsers
);
router.get(
    '/user/:id',
    adminAuth,
    allowRoles(
        'super_admin',
        'sub_admin',
        'staff_admin'
    ),
    getUserById
);

router.put(
    '/user/block/:id',
    adminAuth,
    allowRoles(
        'super_admin',
        'sub_admin'
    ),
    blockUser
);

router.put(
    '/user/unblock/:id',
    adminAuth,
    allowRoles(
        'super_admin',
        'sub_admin'
    ),
    unblockUser
);
// KYC Management
router.get(
  '/kyc/pending',
  adminAuth,
  allowRoles(
    'super_admin',
    'sub_admin',
    'staff_admin'
  ),
  getPendingKyc
);

router.get(
  '/kyc/:id',
  adminAuth,
  allowRoles(
    'super_admin',
    'sub_admin',
    'staff_admin'
  ),
  getKycDetails
);
router.put(
  '/kyc/approve/:id',
  adminAuth,
  allowRoles(
    'super_admin',
    'sub_admin'
  ),
  approveKyc
);

router.put(
  '/kyc/reject/:id',
  adminAuth,
  allowRoles(
    'super_admin',
    'sub_admin'
  ),
  rejectKyc
);
// Withdrawal Management

router.get(
    '/withdrawals/pending',
    adminAuth,
    allowRoles(
        'super_admin',
        'sub_admin',
        'staff_admin'
    ),
    getPendingWithdrawals
);

router.get(
    '/withdrawal/:id',
    adminAuth,
    allowRoles(
        'super_admin',
        'sub_admin',
        'staff_admin'
    ),
    getWithdrawalDetails
);
router.put(
    '/withdrawal/approve',
    adminAuth,
    allowRoles(
        'super_admin',
        'sub_admin'
    ),
    approveWithdrawal
);

router.put(
    '/withdrawal/reject',
    adminAuth,
    allowRoles(
        'super_admin',
        'sub_admin'
    ),
    rejectWithdrawal
);

module.exports = router;