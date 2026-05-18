require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');

const app = express();

// CORS Middleware
app.use(cors());

// JSON Middleware
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err);
  });

// Test Route
app.get('/', (req, res) => {
  res.send('Backend Running Successfully');
});

// Auth Routes
app.use('/api/auth', authRoutes);

// Global Error Handler
app.use((err, req, res, next) => {

  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: 'Internal Server Error'
  });

});

// Server Start
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});