const mongoose = require('mongoose');

const ReelSchema = new mongoose.Schema({
    video_url: { 
        type: String, 
        required: true 
    },
    title: { 
        type: String 
    },
    assigned_date: { 
        type: String, 
        required: true 
    },
    is_active: { 
        type: Boolean, 
        default: true 
    }
}, { 
    timestamps: true 
});

// Index to quickly fetch today's active reels
ReelSchema.index({ assigned_date: 1, is_active: 1 });

module.exports = mongoose.model('Reel', ReelSchema);