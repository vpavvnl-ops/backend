const mongoose = require('mongoose');

const addFundRequestSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    amount: { 
        type: Number, 
        required: true,
        min: [100, 'Minimum add fund amount is ₹100']
    },
    payment_method: { 
        type: String, 
        enum: ['manual', 'gateway'], 
        required: true 
    },
    transaction_id: { 
        type: String, 
        sparse: true, 
        unique: true 
    },
    gateway_order_id: { 
        type: String,
        sparse: true,
        unique: true
    },
    gateway_payment_id: { 
        type: String 
    },
    payment_proof: { 
        type: String 
    },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected', 'success', 'failed'], 
        default: 'pending' 
    },
    admin_remark: { 
        type: String 
    },
    approved_at: { 
        type: Date 
    }
}, { timestamps: true });

module.exports = mongoose.model('AddFundRequest', addFundRequestSchema);