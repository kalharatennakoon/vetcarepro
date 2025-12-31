import app from './app.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const PORT = process.env.PORT || 5000;

// Test database connection before starting server
let server;

const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Start Express server and store reference
    server = app.listen(PORT, () => {
      console.log('🚀 VetCare Pro Server is running');
      console.log(`📡 Server: http://localhost:${PORT}`);
      console.log(`🏥 API: http://localhost:${PORT}/api`);
      console.log(`💚 Health: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
const closeDatabase = () => {
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
};

const gracefulShutdown = (signal) => {
  console.log(`${signal} signal received: closing HTTP server`);
  
  if (server) {
    server.close((err) => {
      if (err) {
        console.error('Error during server shutdown:', err);
        process.exit(1);
      }
      console.log('HTTP server closed');
      closeDatabase();
    });
  } else {
    closeDatabase();
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();