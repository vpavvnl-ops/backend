const jwt = require('jsonwebtoken');

exports.verifyToken = async (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {

            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });

        }

        // Bearer TOKEN
        const token = authHeader.split(' ')[1];

        if (!token) {

            return res.status(401).json({
                success: false,
                message: 'Invalid token format.'
            });

        }

        // Verify JWT
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Save User Data
        req.user = decoded;

        next();

    } catch (error) {

        console.log(error);

        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token.'
        });

    }

};