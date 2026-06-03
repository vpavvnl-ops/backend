const AppVersion = require('../models/AppVersion');

// GET /api/app/version
const getLatestVersion = async (req, res) => {
    try {
        // Find the configuration with the highest version_code
        const latestVersion = await AppVersion.findOne().sort({ version_code: -1 });

        if (!latestVersion) {
            return res.status(404).json({
                success: false,
                message: "No app version data found"
            });
        }

        res.status(200).json({
            success: true,
            version_code: latestVersion.version_code,
            version_name: latestVersion.version_name,
            apk_url: latestVersion.apk_url,
            force_update: latestVersion.force_update,
            release_notes: latestVersion.release_notes
        });

    } catch (error) {
        console.error("Error fetching app version:", error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

module.exports = {
    getLatestVersion
};