const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================= Prisma Client with Docker Support =============================
const isDocker = process.env.IS_DOCKER === 'true';
const databaseUrl = isDocker ? process.env.DATABASE_DOCKER_URL : process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

// ============================= Upload Directories =============================
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const ASSIGNMENTS_DIR = path.join(UPLOAD_DIR, 'assignments');
const SUBMISSIONS_DIR = path.join(UPLOAD_DIR, 'submissions');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(ASSIGNMENTS_DIR)) fs.mkdirSync(ASSIGNMENTS_DIR);
if (!fs.existsSync(SUBMISSIONS_DIR)) fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });

function allowListedFileFilter(req, file, cb) {
  const allowedTypes = /\.(jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)$/;
  const extnameOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  const allowedMimes = /^(image\/(jpeg|png|gif)|application\/pdf|text\/plain|application\/(zip|x-zip-compressed|x-rar-compressed|vnd\.rar|msword|vnd\.ms-excel|vnd\.ms-powerpoint)|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation))$/;
  const mimetype = (file.mimetype || '').toLowerCase();
  const mimetypeOk = allowedMimes.test(mimetype);
  const mimetypeGeneric = mimetype === '' || mimetype === 'application/octet-stream';

  if (extnameOk && (mimetypeOk || mimetypeGeneric)) return cb(null, true);
  return cb(new Error('Ungültiger Dateityp'));
}

// ============================= Multer Configuration =============================
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadDisk = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, ASSIGNMENTS_DIR);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: allowListedFileFilter
});

const uploadSubmissionsDisk = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, SUBMISSIONS_DIR);
    },
    filename: function (req, file, cb) {      
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: allowListedFileFilter
});

// ============================= Database Init =============================
const initDatabase = async () => {
  try {
    const roleCount = await prisma.rolle.count();
    
    if (roleCount === 0) {
      await prisma.rolle.createMany({
        data: [
          { bezeichnung: 'Schüler', beschreibung: 'Schüler，kann Aufgaben abgeben' },
          { bezeichnung: 'Lehrer', beschreibung: 'Lehrer，kann Aufgaben erstellen, bewerten und verwalten' },
          { bezeichnung: 'Admin', beschreibung: 'Admin，kann das System Verwalten' }
        ]
      });
      console.log('✅ Rollen initialisiert');
    }
  } catch (error) {
    console.error('❌ DB-Init Fehler:', error);
  }
};

module.exports = {
  prisma,
  uploadMemory,
  uploadDisk,
  uploadSubmissionsDisk,
  initDatabase
};