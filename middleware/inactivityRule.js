const User = require('../models/User');

exports.enforceInactivityRule = async (req, res, next) => {
    try {
        if (!req.user || !req.user.userId) {
            return next();
        }

        const user = await User.findById(req.user.userId);
        
        if (user && user.is_prime && user.is_active && user.prime_activation_date) {
            const activationDate = new Date(user.prime_activation_date);
            const daysSinceActivation = (new Date() - activationDate) / (1000 * 60 * 60 * 24);
            
            // Rule: If 15 or more days have passed since activation and user has less than 2 direct referrals, mark as inactive.
            if (daysSinceActivation >= 15) {
                const directCount = await User.countDocuments({ referred_by: user._id });
                if (directCount < 2) {
                    user.is_active = false;
                    await user.save();
                }
            }
        }
        next();
    } catch (err) {
        console.error("Inactivity Rule Error:", err);
        next(); // Proceed to the next middleware even if there's an error, to avoid blocking the user completely
    }
};