const mongoose = require('mongoose');

const MLMExecutionSchema = new mongoose.Schema({
    prime_request: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PrimeRequest',
        required: true,
        unique: true,
        index: true
    }
}, {
    timestamps: true
});

module.exports =
    mongoose.models.MLMExecution ||
    mongoose.model('MLMExecution', MLMExecutionSchema);