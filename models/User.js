const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({

    // BASIC DETAILS
    username: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: true
    },

    // REFERRAL SYSTEM
    referral_code: {
        type: String,
        required: true,
        unique: true
    },

    referred_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    // OTP
    otp: {
        type: String,
        default: null
    },

    otp_expiry: {
        type: Date,
        default: null
    },

    // ACCOUNT STATUS
    is_verified: {
        type: Boolean,
        default: false
    },

    status: {
        type: String,
        enum: ['Active', 'Blocked'],
        default: 'Active'
    },

    // PROFILE
    mobile: {
        type: String,
        default: ''
    },

    profile_image: {
        type: String,
        default: ''
    },

    // WALLET
    wallet_balance: {
        type: Number,
        default: 0
    },

    // TOTAL INCOME
    total_income: {
        type: Number,
        default: 0
    },

    // TODAY INCOME
    today_income: {
        type: Number,
        default: 0
    },

    // MONTHLY INCOME
    monthly_income: {
        type: Number,
        default: 0
    },

    // DIRECT INCOME
    direct_income: {
        type: Number,
        default: 0
    },

    // LEVEL INCOME
    level_income: {
        type: Number,
        default: 0
    },

    // REWARD INCOME
    reward_income: {
        type: Number,
        default: 0
    },

    // OFFER INCOME
    offer_income: {
        type: Number,
        default: 0
    },

    // TEAM
    direct_team_count: {
        type: Number,
        default: 0
    },

    total_team_count: {
        type: Number,
        default: 0
    },

    // RANK
    rank: {
        type: String,
        default: 'Starter'
    },

    // LOGIN DETAILS
    last_login: {
        type: Date,
        default: null
    }

}, {

    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }

});

module.exports = mongoose.model('User', userSchema);