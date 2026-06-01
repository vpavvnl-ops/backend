const mongoose = require('mongoose');

const PrimeRequestSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['activation', 'reactivation'], 
        required: true 
    },
    amount: { 
        type: Number, 
        required: true 
    },
    transaction_id: { 
        type: String, 
        required: true,
        unique: true
    },
    payment_proof: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },
    admin_remark: {
        type: String,
        default: ''
    },
    approved_at: {
        type: Date,
        default: null
    }
}, { 
    timestamps: true 
});

// Index to quickly check if a user has an active pending request
PrimeRequestSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('PrimeRequest', PrimeRequestSchema);