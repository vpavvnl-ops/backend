const allowRoles = (...allowedRoles) => {
    return (req, res, next) => {

        if (!req.admin) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        if (!allowedRoles.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        next();

    };
};

module.exports = {
    allowRoles
};