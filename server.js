require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');

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


// =====================================
// MONGODB CONNECTION
// =====================================

mongoose.connect(process.env.MONGODB_URI)

.then(() => {

    console.log(
        '✅ MongoDB Connected Successfully'
    );

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
// AUTH ROUTES
// =====================================

app.use('/api/auth', authRoutes);


// =====================================
// GLOBAL ERROR HANDLER
// =====================================

app.use((err, req, res, next) => {

    console.error(err.stack);

    res.status(500).json({

        success: false,
        message: 'Internal Server Error',
        error: err.message

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