const path = require('path'); // Import path module (for file paths)
const express = require('express');
const cors = require('cors'); // Loads CORS middleware for handling cross-origin requests
const dotenv = require('dotenv'); // For loading environment variables from .env

// --- Load environment variables ---
dotenv.config();

// --- Import modules ---
const { prisma, initDatabase } = require('./app.config');
const passport = require('./app.passport'); // Import configured passport
const apiRoutes = require('./app.routes');

// --- Create Express app ---
// --- Frontend path (for monolithic deployment) - points to dist folder ---
const FRONTEND_PATH = path.join(__dirname, '..', '..', 'frontend', 'dist');

// --- Middleware ---
const app = express(); // Create Express app instance
app.use(cors());
app.use(express.json()); // Runs JSON req.body (js-object) parser middleware
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize()); // Initialize Passport middleware

// --- API Routes ---
app.use('/api', apiRoutes);

// --- Uploads Serving ---
// --- Serve uploaded assignment/submission files ---
const UPLOADS_PATH = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(UPLOADS_PATH));

// --- Error Handling ---
app.use((err, req, res, next) => {
  if (!err) return next();
  console.error("Global Error Handler caught:", err);

  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (typeof err.message === 'string' && (err.message.includes('Invalid') || err.message.includes('Ungültig'))) {
    return res.status(400).json({ success: false, message: err.message });
  }

  return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
});

// --- Frontend Serving ---
app.use(express.static(FRONTEND_PATH));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

// --- Server Start ---
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
  await initDatabase();
  
  app.listen(PORT, HOST, () => {
    console.log(`🚀 SmartSubmit Server running on port ${PORT}`);
    console.log(`📍 API address: ${HOST}:${PORT}`);
  });
};

if (require.main === module) {
  startServer();

  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    console.log('\nServer shut down!');
    process.exit(0);
  });
}

module.exports = app;