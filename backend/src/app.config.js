const { PrismaClient } = require('@prisma/client');//Lädt den Prisma-Client, einen ORM (Object-Relational Mapper),als JavaScript-Objekt,für CRUD-Operationen
const multer = require('multer');//Datei-Uploads verarbeiten middleware
const path = require('path');
const fs = require('fs');// Füge das fs-Modul hinzu (für Dateisystem-Operationen)

// ============================= Prisma Client with Docker Support =============================
const isDocker = process.env.IS_DOCKER === 'true';//z.B. process.env.DATABASE_URL: sys-env ablesen，wenn local:IS_DOCKER=false, mit docker:IS_DOCKER=true(von yml zwingend abgelesen)
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

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(ASSIGNMENTS_DIR)) fs.mkdirSync(ASSIGNMENTS_DIR);

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
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Ungültiger Dateityp'));
    }
  }
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
  prisma,       //objekt
  uploadMemory, //objekt
  uploadDisk,   //objekt
  initDatabase  //funktion
};