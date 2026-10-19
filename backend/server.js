const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');

// Load environment variables from .env file
dotenv.config();

const app = express();

// Enable CORS for frontend integration
app.use(cors());

// Middleware for parsing JSON and urlencoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Informative system status endpoint
app.get('/api/test', (req, res) => {
  const isCloudConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    message: 'Cloud File Storage backend is running',
    databaseConnected: isCloudConnected,
    storageEngine: isCloudConnected
      ? 'MongoDB Atlas (Cloud DBaaS)'
      : 'Local Resilient Storage (MongoDB Atlas reconnecting in background)'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// 404 Handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    message: 'Route not found'
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack || err);

  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : (err.message || 'Internal Server Error');

  res.status(statusCode).json({
    message
  });
});

const PORT = process.env.PORT || 5000;

// Start Express server and connect to database with automatic retry
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});
