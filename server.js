const express = require('express');
const cors = require('cors');

// Import configurations and utilities
const config = require('./config/env');
const connectDB = require('./config/database');

// Import middleware
const {
  errorHandler,
  securityHeaders,
  sanitizeInput
} = require('./middleware');

// Import routes
const { authRoutes, playerRoutes, matchRoutes, scheduleRoutes, statisticsRoutes } = require('./routes');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Minimal, beginner-friendly middleware
app.set('trust proxy', 1);

// Basic security headers
app.use(securityHeaders);

// CORS middleware (allow frontend origin or all during development)
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Basic input sanitization
app.use(sanitizeInput);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Junior Soccer API is running',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: '1.0.0'
  });
});

// Simple API info endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Junior Soccer Tool API',
    version: '1.0.0',
      endpoints: {
        authentication: {
          login: 'POST /api/auth/login',
          register: 'POST /api/auth/register',
          logout: 'POST /api/auth/logout',
          profile: 'GET /api/auth/me'
        },
        players: {
          list: 'GET /api/players',
          create: 'POST /api/players',
          get: 'GET /api/players/:id',
          update: 'PUT /api/players/:id',
          delete: 'DELETE /api/players/:id',
          available: 'GET /api/players/available',
          byPosition: 'GET /api/players/position/:position',
          updateInjury: 'PUT /api/players/:id/injury'
        },
        matches: {
          list: 'GET /api/matches',
          create: 'POST /api/matches/start',
          get: 'GET /api/matches/:id',
          startExisting: 'PUT /api/matches/:id/start',
          substitute: 'POST /api/matches/:id/substitute',
          playtime: 'GET /api/matches/:id/playtime',
          end: 'PUT /api/matches/:id/end'
        },
        schedules: {
          list: 'GET /api/schedules',
          create: 'POST /api/schedules',
          update: 'PUT /api/schedules/:id',
          cancel: 'DELETE /api/schedules/:id',
          generateTeam: 'POST /api/schedules/:id/generate-team',
          playerSchedules: 'GET /api/schedules/player/:playerId'
        },
        statistics: {
          playerStats: 'GET /api/statistics/player/:id',
          matchStats: 'GET /api/statistics/match/:id',
          teamStats: 'GET /api/statistics/team',
          logInjury: 'POST /api/statistics/log-injury'
        }
      }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/statistics', statisticsRoutes);

// Catch 404 and forward to error handler
app.all('*', (req, res, next) => {
  const err = new Error(`Route ${req.originalUrl} not found`);
  err.statusCode = 404;
  next(err);
});

// Error handling middleware (must be last)
app.use(errorHandler);

// For Vercel serverless functions, export the Express app
// This allows Vercel to handle the server lifecycle
module.exports = app;

// For local development, you can still run the server
if (require.main === module) {
  const PORT = config.PORT || 5001;

  // Graceful shutdown handling (only for local development)
  const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    server.close((err) => {
      if (err) {
        console.error('Error during server shutdown:', err);
        process.exit(1);
      }

      console.log('HTTP server closed.');

      // Close database connection
      require('mongoose').connection.close(false, () => {
        console.log('MongoDB connection closed.');
        process.exit(0);
      });
    });

    // Force close after 30 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  // Listen for termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    console.error('Shutting down the server due to uncaught exception');
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', err);
    console.error('Shutting down the server due to unhandled promise rejection');
    server.close(() => {
      process.exit(1);
    });
  });

  const server = app.listen(PORT, () => {
    console.log(`
🚀 Junior Soccer Monitoring Tool API Server Started!

Port: ${PORT}
Database: ${config.MONGODB_URI}

API Endpoints:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Health Check:        GET /health
📚 API Documentation:   GET /api
🔐 Authentication:      /api/auth/*
👥 Players:            /api/players/*
⚽ Matches:            /api/matches/*
📅 Schedules:          /api/schedules/*
📊 Statistics:         /api/statistics/*

Ready to manage players, matches, schedules, statistics, and authentication! ⚽📅📊🔐
    `);
  });
}
