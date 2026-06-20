const Settings = require('../../models/Settings');

exports.getSettings = async (req, res) => {
    try {

        let settings = await Settings.findOne();

        if (!settings) {
            settings = await Settings.create({});
        }

        res.status(200).json({
            success: true,
            message: 'Settings fetched successfully',
            data: settings
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }
};
exports.updateSettings = async (req, res) => {
    try {

        const {
            daily_checkin_reward,
            daily_reel_reward,
            daily_spin_max_reward,
            direct_referral_bonus,
            level_percentages,
            prime_amount,
            reactivation_fee,
            min_withdrawal,
            monthly_withdrawal_limit,
            daily_income_limit,
            tds_percentage,
            upi_id,
            company_name
        } = req.body;

        let settings = await Settings.findOne();

        if (!settings) {
            settings = new Settings();
        }

        if (daily_checkin_reward !== undefined)
            settings.daily_checkin_reward = Number(daily_checkin_reward);

        if (daily_reel_reward !== undefined)
            settings.daily_reel_reward = Number(daily_reel_reward);

        if (daily_spin_max_reward !== undefined)
            settings.daily_spin_max_reward = Number(daily_spin_max_reward);

        if (direct_referral_bonus !== undefined)
            settings.direct_referral_bonus = Number(direct_referral_bonus);

        if (level_percentages)
            settings.level_percentages = level_percentages;

        if (prime_amount !== undefined)
            settings.prime_amount = Number(prime_amount);

        if (reactivation_fee !== undefined)
            settings.reactivation_fee = Number(reactivation_fee);

        if (min_withdrawal !== undefined)
            settings.min_withdrawal = Number(min_withdrawal);

        if (monthly_withdrawal_limit !== undefined)
            settings.monthly_withdrawal_limit = Number(monthly_withdrawal_limit);

        if (daily_income_limit !== undefined)
            settings.daily_income_limit = Number(daily_income_limit);

        if (tds_percentage !== undefined)
            settings.tds_percentage = Number(tds_percentage);

        if (upi_id !== undefined)
            settings.upi_id = upi_id;

        if (company_name !== undefined)
            settings.company_name = company_name;

        await settings.save();

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            data: settings
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }
};