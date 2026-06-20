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
const {
  getPendingPrimeRequests,
  getPrimeRequestDetails,
  approvePrimeRequest,
  rejectPrimeRequest
} = require('../../controllers/admin/adminPrimeController');
const {
  getPendingAddFunds,
  getAddFundDetails,
  approveAddFund,
  rejectAddFund
} = require('../../controllers/admin/adminAddFundController');
const {
    getSettings,
    updateSettings
} = require('../../controllers/admin/adminSettingsController');

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
router.get(
  '/prime/pending',
  adminAuth,
  allowRoles('super_admin', 'sub_admin', 'staff_admin'),
  getPendingPrimeRequests
);

router.get(
  '/prime/:id',
  adminAuth,
  allowRoles('super_admin', 'sub_admin', 'staff_admin'),
  getPrimeRequestDetails
);

router.put(
  '/prime/approve/:id',
  adminAuth,
  allowRoles('super_admin', 'sub_admin'),
  approvePrimeRequest
);

router.put(
  '/prime/reject/:id',
  adminAuth,
  allowRoles('super_admin', 'sub_admin'),
  rejectPrimeRequest
);
// ==========================================
// Add Fund Management
// ==========================================
router.get(
  '/addfund/pending', 
  adminAuth, 
  allowRoles('super_admin', 'sub_admin', 'staff_admin'), 
  getPendingAddFunds
);

router.get(
  '/addfund/:id', 
  adminAuth, 
  allowRoles('super_admin', 'sub_admin', 'staff_admin'), 
  getAddFundDetails
);

router.put(
  '/addfund/approve/:id', 
  adminAuth, 
  allowRoles('super_admin', 'sub_admin'), 
  approveAddFund
);

router.put(
  '/addfund/reject/:id', 
  adminAuth, 
  allowRoles('super_admin', 'sub_admin'), 
  rejectAddFund
);
router.get(
    '/settings',
    adminAuth,
    allowRoles('super_admin'),
    getSettings
);

router.put(
    '/settings',
    adminAuth,
    allowRoles('super_admin'),
    updateSettings
);
module.exports = router;