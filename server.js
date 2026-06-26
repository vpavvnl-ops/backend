require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const adminRoutes = require('./routes/admin/adminRoutes');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const featureRoutes = require('./routes/featureRoutes');
const appVersionRoutes = require('./routes/appVersionRoutes');


// Cron Job Imports
const startDailyResetCron = require('./cron/dailyReset');

const app = express();

// =====================================
// MIDDLEWARE
// =====================================

// CORS
app.use(cors());

// JSON
app.use(express.json());

// STATIC UPLOADS
app.use(
    '/uploads',
    express.static(
        path.join(__dirname, 'uploads')
    )
);
app.use('/api/admin', adminRoutes);

// =====================================
// MONGODB CONNECTION & CRON INITIALIZATION
// =====================================

mongoose.connect(process.env.MONGODB_URI)
.then(() => {
    console.log('✅ MongoDB Connected Successfully');
    startDailyResetCron();
})
.catch((err) => {
    console.error(
        '❌ MongoDB Connection Error:',
        err
    );
});

// =====================================
// TEST ROUTE
// =====================================

app.get('/', (req, res) => {
    res.send(
        '🚀 Backend Running Successfully'
    );
});

// =====================================
// ROUTES
// =====================================

app.use('/api/auth', authRoutes);
app.use('/api/task', taskRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/app', appVersionRoutes);

// =====================================
// GLOBAL ERROR HANDLER
// =====================================

const multer = require('multer');

app.use((err, req, res, next) => {

    console.error(err);

    // Multer File Size Error
    if (err instanceof multer.MulterError) {

        if (err.code === 'LIMIT_FILE_SIZE') {

            return res.status(400).json({
                success: false,
                message: 'Image size must be less than 100 KB.'
            });

        }

        return res.status(400).json({
            success: false,
            message: err.message
        });

    }

    // Other Errors
    return res.status(500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });

});

// =====================================
// SERVER START
// =====================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(
        `🚀 Server running on port ${PORT}`
    );
});