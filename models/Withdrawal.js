const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    // =====================================
    // TDS & PAYOUT SYSTEM
    // =====================================

    tds_deducted: {
        type: Number,
        default: 0
    },

    payable_amount: {
        type: Number,
        required: true
    },

    // =====================================
    // BANK DETAILS
    // =====================================

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

    account_holder_name: {
        type: String,
        default: ''
    },

    // =====================================
    // STATUS
    // =====================================

    status: {
        type: String,
        enum: [
            'Pending',
            'Approved',
            'Rejected'
        ],
        default: 'Pending'
    },

    rejectReason: {
        type: String,
        default: ''
    },

    approvedAt: {
        type: Date,
        default: null
    }

}, {
    timestamps: true
});

module.exports = mongoose.model(
    'Withdrawal',
    withdrawalSchema
);