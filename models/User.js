const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({

    // =====================================
    // BASIC DETAILS
    // =====================================

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

    mobile: {
        type: String,
        default: ''
    },

    profile_image: {
        type: String,
        default: ''
    },


    // =====================================
    // REFERRAL SYSTEM
    // =====================================

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

    direct_team_count: {
        type: Number,
        default: 0
    },

    total_team_count: {
        type: Number,
        default: 0
    },


    // =====================================
    // OTP SYSTEM
    // =====================================

    otp: {
        type: String,
        default: null
    },

    otp_expiry: {
        type: Date,
        default: null
    },


    // =====================================
    // ACCOUNT STATUS & PRIME SYSTEM
    // =====================================

    is_verified: {
        type: Boolean,
        default: false
    },

    status: {
        type: String,
        enum: ['Active', 'Blocked'],
        default: 'Active'
    },

    is_prime: {
        type: Boolean,
        default: false
    },

    prime_activation_date: {
        type: Date,
        default: null
    },

    is_active: {
        type: Boolean,
        default: true
    },


    // =====================================
    // WALLET SYSTEM
    // =====================================

    available_balance: {
        type: Number,
        default: 0
    },

    locked_balance: {
        type: Number,
        default: 0
    },

    wallet_balance: {
        type: Number,
        default: 0
    },

    total_income: {
        type: Number,
        default: 0
    },

    today_income: {
        type: Number,
        default: 0
    },

    monthly_income: {
        type: Number,
        default: 0
    },

    direct_income: {
        type: Number,
        default: 0
    },

    level_income: {
        type: Number,
        default: 0
    },

    reward_income: {
        type: Number,
        default: 0
    },

    offer_income: {
        type: Number,
        default: 0
    },


    // =====================================
    // RANK SYSTEM
    // =====================================

    rank: {
        type: String,
        default: 'Basic'
    },


    // =====================================
    // ADVANCED KYC DETAILS
    // =====================================

    full_name: {
        type: String,
        default: ''
    },

    aadhaar_number: {
        type: String,
        default: ''
    },

    pan_number: {
        type: String,
        default: ''
    },

    bank_name: {
        type: String,
        default: ''
    },

    account_number: {
        type: String,
        default: ''
    },

    ifsc_code: {
        type: String,
        default: ''
    },


    // =====================================
    // KYC DOCUMENTS
    // =====================================

    aadhaar_front_image: {
        type: String,
        default: ''
    },

    aadhaar_back_image: {
        type: String,
        default: ''
    },

    pan_card_image: {
        type: String,
        default: ''
    },

    selfie_image: {
        type: String,
        default: ''
    },

    self_auth_image: {
        type: String,
        default: ''
    },

    signature_image: {
        type: String,
        default: ''
    },


    // =====================================
    // KYC STATUS
    // =====================================

    kyc_status: {
        type: String,
        enum: [
            'Not Submitted',
            'Pending',
            'Approved',
            'Rejected'
        ],
        default: 'Not Submitted'
    },


    // =====================================
    // LOGIN DETAILS
    // =====================================

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