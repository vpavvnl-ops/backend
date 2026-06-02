const cron = require('node-cron');
const User = require('../models/User');

const startDailyResetCron = () => {
    // Runs every day at 00:00 (Midnight) in the specified timezone
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('Running daily reset cron job (IST)...');
            
            // Reset today_income to 0 for all users
            const result = await User.updateMany({}, { $set: { today_income: 0 } });
            
            console.log(`Daily reset complete. Modified ${result.modifiedCount} users.`);
        } catch (error) {
            console.error('Daily reset cron failed:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata" // Ensures it fires exactly at Midnight IST
    });
};

module.exports = startDailyResetCron;