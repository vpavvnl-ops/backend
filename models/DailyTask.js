const mongoose = require('mongoose');

const DailyTaskSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    date: { 
        type: String, 
        required: true 
    },
    check_in_completed: { 
        type: Boolean, 
        default: false 
    },
    spins_used: { 
        type: Number, 
        default: 0 
    },
    pending_spin_reward: { 
        type: Number, 
        default: null 
    },
    spin_completed: { 
        type: Boolean, 
        default: false 
    },
    reels_progress: [{
        reel_id: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Reel' 
        },
        start_time: { 
            type: Date 
        },
        completed: { 
            type: Boolean, 
            default: false 
        }
    }],
    all_reels_completed: { 
        type: Boolean, 
        default: false 
    }
}, { 
    timestamps: true 
});

// Ensure a user can only have one daily task record per day
DailyTaskSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyTask', DailyTaskSchema);