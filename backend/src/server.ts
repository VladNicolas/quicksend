import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from './config/database';
import env from './config/environments';
import fileRoutes from './routes/fileRoutes';
import errorHandler from './middleware/errorHandler';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to MongoDB
connectDB();

const app = express();
const PORT = env.port;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', fileRoutes);

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app; 