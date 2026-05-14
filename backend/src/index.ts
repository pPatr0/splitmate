import './env.js';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { User } from './models/User.js';
import { Group } from './models/Group.js';
import { Expense } from './models/Expense.js';
import authRouter from './routes/auth.js';
import groupsRouter from './routes/groups.js';
import expensesRouter from './routes/expenses.js';


const app: Express = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
// CORS configuration
const allowedOrigins = [
  'http://localhost:5173', // Vite dev server
  process.env.FRONTEND_URL, // Production frontend (Netlify)
].filter((origin): origin is string => Boolean(origin));

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// Mount auth routes
app.use('/api/auth', authRouter);
app.use('/api/groups', groupsRouter);
app.use('/api', expensesRouter);


// Test endpoint: vytvoří dummy data a vrátí counts
app.get('/api/debug/seed', async (_req: Request, res: Response) => {
  try {
    const userCount = await User.countDocuments();
    const groupCount = await Group.countDocuments();
    const expenseCount = await Expense.countDocuments();

    res.json({
      message: 'Database models are working',
      counts: {
        users: userCount,
        groups: groupCount,
        expenses: expenseCount,
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Health check route
app.get('/api/health', (_req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    message: 'SplitMate backend is running',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// Connect to MongoDB and start server
async function start() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    app.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();