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
   getUserById
} = require('../../controllers/admin/adminUsersController');

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


module.exports = router;