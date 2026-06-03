const mongoose = require('mongoose');

const appVersionSchema = new mongoose.Schema({
    version_code: {
        type: Number,
        required: true,
        unique: true
    },
    version_name: {
        type: String,
        required: true
    },
    apk_url: {
        type: String,
        required: true
    },
    force_update: {
        type: Boolean,
        default: false
    },
    release_notes: {
        type: String,
        default: "Bug fixes and performance improvements"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('AppVersion', appVersionSchema);