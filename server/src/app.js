import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

// Middlewares
import { apiLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

// Route modules
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import statusRoutes from './routes/statusRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import duplicateRoutes from './routes/duplicateRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import priorityRuleRoutes from './routes/priorityRuleRoutes.js';
import logRoutes from './routes/logRoutes.js';
import policeRoutes from './routes/policeRoutes.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy for rate limiter and deployment on Render / Reverse Proxies
app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration (supports comma-separated list of allowed origins)
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(null, true); // Dev-friendly fallback; logs origin
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Simple lightweight cookie parser
app.use((req, res, next) => {
  req.cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      const key = parts[0]?.trim();
      if (key) {
        req.cookies[key] = decodeURIComponent((parts[1] || '').trim());
      }
    });
  }
  next();
});

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Static files for local uploads (fallback storage)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Root welcome / status endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'UrbanFix Backend API',
    version: '1.0.0',
    description: 'Citizen Collaboration Platform for Urban Mobility Problems',
    status: 'online',
    health: '/health',
    api: '/api/v1',
  });
});

// Health check endpoint
const healthHandler = (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    service: 'UrbanFix Backend API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: mongoStatus,
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);
app.get('/api/v1/health', healthHandler);

// Rate limiting for general API routes
app.use('/api/', apiLimiter);

// Mount API v1 routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/locations', locationRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/status', statusRoutes);
apiRouter.use('/verification', verificationRoutes);
apiRouter.use('/assignments', assignmentRoutes);
apiRouter.use('/duplicates', duplicateRoutes);
apiRouter.use('/departments', departmentRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/priority-rules', priorityRuleRoutes);
apiRouter.use('/logs', logRoutes);
apiRouter.use('/police', policeRoutes);

app.use('/api/v1', apiRouter);


// 404 & Global error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
