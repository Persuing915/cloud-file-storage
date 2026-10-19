const mongoose = require('mongoose');

let isConnecting = false;

/**
 * Connect to MongoDB with automatic retry and resilient background reconnection
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error('Database Configuration Error: MONGODB_URI is not defined in the environment variables (.env)');
    return;
  }

  if (isConnecting || mongoose.connection.readyState === 1) {
    return;
  }

  isConnecting = true;

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`MongoDB Connected successfully: ${conn.connection.host}`);
    isConnecting = false;
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Waiting: ${error.message}`);
    isConnecting = false;
    // Auto-retry connection in 5 seconds in background without crashing the server
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
