const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================= API Routes =============================
app.use('/api', apiRoutes);

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