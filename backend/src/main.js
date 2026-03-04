const path = require('path');// Import the path module (for file paths)
const express = require('express');
const cors = require('cors');//Loads the CORS middleware for handling cross-origin requests, const cors is a factory function
const dotenv = require('dotenv');//For loading environment variables from .env

// Load environment variables
dotenv.config();

// Import modules
const { prisma, initDatabase } = require('./app.config');
const apiRoutes = require('./app.routes');

// Create Express app
const app = express();

// Frontend path (for monolithic deployment) - points to dist folder
const FRONTEND_PATH = path.join(__dirname, '..', '..', 'frontend', 'dist');

// ============================= Middleware =============================
app.use(cors());
app.use(express.json());//  Runs the JSON req.body (JS object) parser middleware
app.use(express.urlencoded({ extended: true }));

// ============================= API Routes =============================
app.use('/api', apiRoutes);

// ============================= Uploads Serving =============================
// Serve uploaded assignment/submission files
const UPLOADS_PATH = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(UPLOADS_PATH));

// ============================= Error Handling =============================
app.use((err, req, res, next) => {
  if (!err) return next();

  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (typeof err.message === 'string' && err.message.includes('Ungültiger Dateityp')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  return res.status(500).json({ success: false, message: 'Server Fehler' });
});

// ============================= Frontend Serving =============================
app.use(express.static(FRONTEND_PATH));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

// ============================= Server Start =============================
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
  await initDatabase();
  
  app.listen(PORT, HOST, () => {
    console.log(`🚀 SmartSubmit Server betriebt im Port ${PORT}`);
    console.log(`📍 API-Addresse: ${HOST}:${PORT}`);
  });
};

if (require.main === module) {
  startServer();

  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    console.log('\nServer abgeschaltet!');
    process.exit(0);
  });
}

module.exports = app;