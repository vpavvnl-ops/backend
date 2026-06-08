const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    daily_checkin_reward: { 
        type: Number, 
        default: 15 
    },
    daily_reel_reward: { 
        type: Number, 
        default: 20 
    },
    daily_spin_max_reward: { 
        type: Number, 
        default: 15 
    },
    direct_referral_bonus: { 
        type: Number, 
        default: 100 
    },
    level_percentages: { 
        type: [Number], 
        default: [5, 3, 2, 2, 2, 2, 2] 
    },
    prime_amount: { 
        type: Number, 
        default: 1000 
    },
    reactivation_fee: { 
        type: Number, 
        default: 1000 
    },
    min_withdrawal: { 
        type: Number, 
        default: 1000 
    },
    monthly_withdrawal_limit: { 
        type: Number, 
        default: 3 
    },
    daily_income_limit: { 
        type: Number, 
        default: 5000 
    },
    tds_percentage: { 
        type: Number, 
        default: 5 
    },
    upi_id: {
    type: String,
    default: 'vpajmerpnb@ybl'
},

company_name: {
    type: String,
    default: 'D-Task'
}
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Settings', SettingsSchema);