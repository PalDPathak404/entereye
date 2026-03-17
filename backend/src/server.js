const config = require('./config/env');
const app = require('./app');
const connectDB = require('./config/db');

// Start Server
const startServer = async () => {
  try {
    console.log('Starting server...');
    
    // Connect to MongoDB
    console.log('Connecting DB...');
    await connectDB();

    const PORT = config.port || 5000;
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Routes loaded...');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
