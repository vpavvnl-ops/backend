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

    status: {
        type: String,
        enum: [
            'Pending',
            'Approved',
            'Rejected'
        ],
        default: 'Pending'
    }

}, {
    timestamps: true
});

module.exports = mongoose.model(
    'Withdrawal',
    withdrawalSchema
);