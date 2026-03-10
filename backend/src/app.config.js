const { PrismaClient } = require('@prisma/client'); // Loads Prisma Client, an ORM (Object-Relational Mapper), as a JavaScript object for CRUD operations
const multer = require('multer'); // Middleware for handling file uploads
const path = require('path');
const fs = require('fs'); // Add fs module (for filesystem operations)

// --- Prisma Client with Docker Support ---
const isDocker = process.env.IS_DOCKER === 'true'; // e.g. process.env.DATABASE_URL: read sys-env, local:IS_DOCKER=false, with docker:IS_DOCKER=true (from yml)
const databaseUrl = isDocker ? process.env.DATABASE_DOCKER_URL : process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

// --- Upload Directories ---
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
  return cb(new Error('Invalid file type'));
}

// --- Multer Configuration ---
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

// --- Database Init ---
const initDatabase = async () => {
  try {
    const roleCount = await prisma.role.count();
    if (roleCount === 0) {
      await prisma.role.createMany({
        data: [
          { name: 'Student', description: 'Student can submit assignments' },
          { name: 'Teacher', description: 'Teacher can create, grade, and manage assignments' },
          { name: 'Admin', description: 'Admin can manage the system' }
        ]
      });
      console.log('✅ Roles initialized');
    }
  } catch (error) {
    console.error('❌ DB init error:', error);
  }
};

module.exports = {
  prisma,       // object
  uploadMemory, // object
  uploadDisk,   // object
  initDatabase, // function
  uploadSubmissionsDisk // object
};