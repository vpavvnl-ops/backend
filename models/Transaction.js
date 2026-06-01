const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    type: {
        type: String,
        enum: [
            'credit',
            'debit',
            'direct_income',
            'level_income',
            'reward_income',
            'offer_income',
            'withdrawal',
            'task_income' // NEW: Added for Check-in, Reels, and Spin Wheel earnings
        ],
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    description: {
        type: String,
        default: ''
    },

    status: {
        type: String,
        enum: ['success', 'pending', 'failed'],
        default: 'success'
    }

}, {
    timestamps: true
});

module.exports = mongoose.model(
    'Transaction',
    transactionSchema
);