/**
 * Main server file for the QuickSend application
 * Sets up Express server with middleware, routes, and database connection
 * Handles API endpoints for file upload, download, and management
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
// import connectDB from './config/database'; // Remove MongoDB connection
import './config/firebase'; // Import to initialize Firebase Admin SDK
import env from './config/environments';
import fileRoutes from './routes/fileRoutes';
import errorHandler from './middleware/errorHandler';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize database connection
// connectDB(); // Remove MongoDB connection call

// Create Express application instance
const app = express();
const PORT = env.port;

// Setup Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://quicksend-frontend-service-627959729856.us-central1.run.app',
        'https://quicksend-frontend-service-*.run.app',
        'https://quicksend-frontend-service.run.app'
      ] // Production domains
    : 'http://localhost:5173', // Development domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Register API routes
app.use('/api', fileRoutes);

/**
 * Health check endpoint
 * Used for monitoring and ensuring the server is running properly
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Global error handling middleware
app.use(errorHandler);

// Start the server and listen on specified port
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export app for testing purposes
export default app; 