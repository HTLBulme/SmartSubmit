const path = require('path');//  Path-Modul importieren (für Dateipfade) !!!!für frontend-backend gemeinsamen Deploy 单体架构部署 (Monolithic Deployment)
const express = require('express'); // Lädt das Express-Framework(Factory Function), um den Webserver zu erstellen
const cors = require('cors');   //Lädt die CORS-Middleware zur Handhabung von Cross-Origin-Anfragen，const cors ist eine Factory Function
const dotenv = require('dotenv');   //Zum Laden von Umgebungsvariablen aus .env
const { PrismaClient } = require('@prisma/client'); //Lädt den Prisma-Client, einen ORM (Object-Relational Mapper),als JavaScript-Objekt,für CRUD-Operationen
const bcrypt = require('bcryptjs'); //Passwort mit bcrypt hashen.
const jwt = require('jsonwebtoken');
const multer = require('multer');//Datei-Uploads verarbeiten middleware
const XLSX = require('xlsx');//Excel-Dateien lesen und schreiben

dotenv.config(); //Führt die config von dotenv aus, um .env-Variablen zu laden.

const app = express();
const prisma = new PrismaClient();

//-----------------------------Konfiguration Datei-Upload-----------------------------

const fs = require('fs'); // Füge das fs-Modul hinzu (für Dateisystem-Operationen)

// Erstelle die Upload-Verzeichnisse
// UPLOAD_DIR: Pfad zum Haupt-Upload-Ordner (z.B. /app/uploads)
const UPLOAD_DIR = path.join(__dirname, 'uploads');
// ASSIGNMENTS_DIR: Pfad zum Unterordner für Aufgaben-Anhänge
const ASSIGNMENTS_DIR = path.join(UPLOAD_DIR, 'assignments');

// Prüfen und Erstellen der Verzeichnisse (falls sie nicht existieren)
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(ASSIGNMENTS_DIR)) fs.mkdirSync(ASSIGNMENTS_DIR);

// ============ Memory Storage (Für Excel-Import) ============
const uploadMemory = multer({
  storage: multer.memoryStorage(), // File in RAM speichern
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ============ Disk Storage (Für Aufgaben-Anhänge) ============
const uploadDisk = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, ASSIGNMENTS_DIR);
    },
    filename: function (req, file, cb) {
      // Generiere einen eindeutigen Dateinamen: Zeitstempel-Zufallszahl-Originalname
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },// 10MB
  fileFilter: function (req, file, cb) {
    // Beschränke die Dateitypen (Sicherheitsmassnahme)
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar/;
    // 1. Prüfe die Dateiendung (extname)
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    // 2. Prüfe den echten MIME-Typ der Datei, um Fälschung der Dateierweiterung zu verhindern
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Ungültiger Dateityp'));
    }
  }
});


// Pfad zum Frontend-Ordner berechnen
// Projektstruktur im Container:
// /app/
// ├── backend/
// │   └── smartsubmit_app.js    ← Diese Datei
// └── frontend/                  ← Ziel
//     ├── login.html
//     └── ...
//
// __dirname = '/app/backend'
// '..' = eine Ebene höher = '/app'
// Ergebnis: '/app/frontend'
const FRONTEND_PATH = path.join(__dirname, '..', 'frontend');//!!!!für frontend-backend gemeinsamen Deploy 


//-----------------------------Middleware ausführen-----------------------------
app.use(cors());
app.use(express.json()); // Führt JSON-req.body(js-object)-Parser-Middleware aus 
app.use(express.urlencoded({ extended: true }));  // für traditionelle HTML-Formularübermittlung



//-----------------------------authenticateToken Middleware definieren-----------------------------
/*
fetch(apiEndpoint, {
    method: 'post', / 'GET', 'PUT', 'DELETE'
    headers: {
        'Authorization': `Bearer ${adminToken}`, 
        'Content-Type': 'application/json' 
    }
    // body: JSON.stringify({ key: 'value' })
})
*/
const authenticateAdmin = async (req, res, next) => {//token-->user_id
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
                                        
    if (!token) {
      return res.status(401).json({ success: false, message: 'Kein Token' });
    }
                             
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
       if (err) {
         return res.status(403).json({ success: false, message: 'Token ungültig' });
       }

       const userRole = await prisma.benutzerRolle.findFirst({
         where: { benutzer_id: decoded.userId, rolle_id: 3 }
       });

       if (!userRole) {
         return res.status(403).json({ success: false, message: 'Nur für Admins' });
       } 

       req.userId = decoded.userId;
       next();
  });
};

const authenticateToken = async (req, res, next) => { //token-->user_id
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
                                      
  if (!token) {
    return res.status(401).json({ success: false, message: 'Kein Token' });
  }
                           
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token ungültig' });
    }

    req.userId = decoded.userId;
    next();
  });
};


//-----------------------------Hilfsfunktionen-----------------------------

//JWT Token generator
const generateToken = (userId) => { //user_id-->token
  return jwt.sign(
    { userId: userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

//email-addresse validator
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

//------------------------------DB init----------------------------------

const initDatabase = async () => {
  try { // Bei jedem Starten des Servers die Rolle Tabelle checken, ob es leer ist.
    const roleCount = await prisma.rolle.count();
    
    if (roleCount === 0) {
      await prisma.rolle.createMany({//Tabelle Rolle ausfühlen
        data: [
          { bezeichnung: 'Schüler', beschreibung: 'Schüler，kann Aufgaben abgeben' },
          { bezeichnung: 'Lehrer', beschreibung: 'Lehrer，kann Aufgaben erstellen, bewerten und verwalten' },
          { bezeichnung: 'Admin', beschreibung: 'Adimin，kann das System Verwalten' }
        ]
      });
      console.log('Rollen initialisiert');
    }
    /*
    const adminCount = await prisma.benutzerRolle.count({ where: { rolle_id: 3 } });
    
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const admin = await prisma.benutzer.create({ //wenn laut benutzerRolle keine Admin vorhanden dann neu setzen
        data: {
          vorname: 'Admin',
          nachname: 'System',
          email: 'admin@smartsubmit.com',
          passwort_hash: hashedPassword
        }
      });

      await prisma.benutzerRolle.create({ //benutzerRolle aktuallisieren
        data: { benutzer_id: admin.id, rolle_id: 3 }
      });

      console.log('init-Admin erstellt');
      console.log('Email: admin@smartsubmit.com');
      console.log('Passwort: admin123');
  }*/
  } catch (error) {
    console.error('DB-Init Fehler:', error);
  }
};

//------------------------------API Routers----------------------------------

//Statuscode: 400 Bad Request，401 Unauthorized，403 Forbidden, 500 Internal Server Error，201 Created


// ******************Verfügbare Rollenliste abrufen (für das Dropdown-Menü im Frontend)*********************
/*
app.get('/api/auth/available-roles', async (req, res) => {
  try {
    const roles = await prisma.rolle.findMany({
      select: {
        id: true,
        bezeichnung: true,
        beschreibung: true
      }
    });

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Rollenliste', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});
*/

// ******************Prüfen, ob bereits ein Administrator existiert*********************
app.get('/api/admin/check', async (req, res) => {
  try {
    const adminCount = await prisma.benutzerRolle.count({
      where: { rolle_id: 3 }
    });

    res.json({
      success: true,
      adminExists: adminCount > 0
    });
  } catch (error) {
    console.error('Fehler bei der Administratorprüfung', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});


// ******************Benutzerregistrierung (nur bei der ersten Admin-Registrierung)*********************
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, roleId } = req.body;

    // 1. Pflichtfelder validieren
    if (!email || !password || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'Email, Passwort und Rolle sind erforderlich'
      });
    }

    // 2. Prüfen, ob bereits ein Admin existiert
    const adminCount = await prisma.benutzerRolle.count({
      where: { rolle_id: 3 }
    });

    if (adminCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'Registrierung ist deaktiviert. Bitte wenden Sie sich an den Administrator.'
      });
    }

    // 3. Nur Admin-Registrierung zulassen (rolle_id muss 3 sein)
    if (parseInt(roleId) !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Nur Admin-Registrierung ist erlaubt'
      });
    }

    // 4. E-Mail-Format validieren
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige E-Mail-Adresse'
      });
    }

    // 5. Prüfen, ob die E-Mail bereits existiert
    const existingUser = await prisma.benutzer.findUnique({
      where: { email: email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail-Adresse bereits registriert'
      });
    }

    // 6. Passwortstärke überprüfen
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Passwort muss mindestens 6 Zeichen lang sein'
      });
    }

    // 7. Passwort verschlüsseln
    const hashedPassword = await bcrypt.hash(password, 10);

    // 8. Benutzer erstellen und Rolle zuweisen (Transaktion verwenden)
    const newUser = await prisma.$transaction(async (tx) => {
      // Benutzer erstellen (Standardname: Admin)
      const user = await tx.benutzer.create({
        data: {
          vorname: 'Admin',
          nachname: 'System',
          email: email,
          passwort_hash: hashedPassword
        }
      });

      // Admin-Rolle zuweisen
      await tx.benutzerRolle.create({
        data: {
          benutzer_id: user.id,
          rolle_id: 3
        }
      });

      return user;
    });

    // 9. Token generieren
    const token = generateToken(newUser.id);

    // 10. Erfolgreiche Antwort zurückgeben
    res.status(201).json({
      success: true,
      message: 'Registrierung erfolgreich',
      data: {
        user: {
          id: newUser.id,
          vorname: newUser.vorname,
          nachname: newUser.nachname,
          email: newUser.email
        },
        token: token
      }
    });

  } catch (error) {
    console.error('Registrierung Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});



// ******************Admin Login*********************
/*
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, passwort } = req.body;

    if(!email || !passwort){ //email und passwort dürfen nicht leer sein 
      return res.status(400).json(
        {
          success: false, 
          message: 'Email oder Passwort fehlen' 
        }
      )
    }

-----{
  "id": 123,
  "email": "...",
  "benutzer_rollen": [
    {
      "benutzer_id": 123,
      "rolle_id": 1,
      "rolle": { "id": 1, "bezeichnung": "Schüler", "beschreibung": "..." } // 包含了详细信息
    },
    {
      "benutzer_id": 123,
      "rolle_id": 3,
      "rolle": { "id": 3, "bezeichnung": "Admin", "beschreibung": "..." }
    }
  ]
-------} 

    const user = await prisma.benutzer.findUnique({ //über email den Benutzer abfragen
      where: { email: email },
      include: { benutzer_rollen: { include: { rolle: true } } }
    });

    if (!user || !await bcrypt.compare(passwort, user.passwort_hash)) { //keine Benutzer mit dieser email oder ps falsch 
      return res.status(401).json({ success: false, message: 'Falsche Anmeldedaten' });
    }
    
    const isAdmin = user.benutzer_rollen.some(br => br.rolle_id === 3);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Nur für Admins' });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          vorname: user.vorname,
          nachname: user.nachname,
          email: user.email
        },
        token
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Fehler' });
  }
});
*/

// ******************Schüler-Liste importieren*********************

/*
<form action="/api/admin/import/students" method="POST" enctype="multipart/form-data">
    <input type="file" name="file" /> 
    <button type="submit">Studenten importieren</button>
</form>*/

app.post('/api/admin/import/students', authenticateAdmin, uploadMemory.single('file'), async (req, res) => {
  try {
    if (!req.file) { /*req.file vom Multer-Middleware erstellt,
                       enthält filename size MIMEtype und Dateipuffer.*/
      return res.status(400).json({ success: false, message: 'Keine Datei hochgeladen' });
    }

    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);//data ist json objekt

    const results = { success: [], failed: [] };

    for (const row of data) {
      try {
        const { vorname, nachname, email, klasse, jahrgang } = row; //zb.jahrgang 2025  in tabelle Schüler-Liste muss spalt jahrgang eindeutig sein

        if (!vorname || !nachname || !email || !klasse || !jahrgang) {
          results.failed.push({ row: row, reason: 'Fehlende Pflichtfelder' });
          continue;
        }

        if (!validateEmail(email)) {
          results.failed.push({ row: row, reason: 'Ungültige E-Mail' });
          continue;
        }

        const existingUser = await prisma.benutzer.findUnique({ where: { email } });
        if (existingUser) {
          results.failed.push({ row: row, reason: 'E-Mail existiert bereits' });
          continue;
        }

        const initialPassword = `${vorname}${nachname}`.toLowerCase();
        const hashedPassword = await bcrypt.hash(initialPassword, 10);

        // Ein Schüler kann mehreren Klassen gehören（im excel mit "," getrennt wie "AKIFT,BKIFT"）
        const klasseNames = klasse.split(',').map(k => k.trim());

        await prisma.$transaction(async (tx) => {//ACID Transaction
          // 1. Benutzer ertellen
          const user = await tx.benutzer.create({
            data: {
              vorname: vorname,
              nachname: nachname,
              email: email,
              passwort_hash: hashedPassword
            }
          });

          // 2. Benutzer_Rolle (Schüler-Rolle)
          await tx.benutzerRolle.create({
            data: { benutzer_id: user.id, rolle_id: 1 }
          });

          // 3. Klasse + Benutzer_Klasse
          for (const klasseName of klasseNames) {
            let klasseRecord = await tx.klasse.findFirst({
              where: { name: klasseName, jahrgang: parseInt(jahrgang) }
            });

            if (!klasseRecord) {
              klasseRecord = await tx.klasse.create({
                data: { name: klasseName, jahrgang: parseInt(jahrgang) }
              });
            }

            await tx.benutzerKlasse.create({
              data: { benutzer_id: user.id, klasse_id: klasseRecord.id }
            });
          }
        });

        results.success.push({ vorname: vorname, nachname: nachname, email: email});
      } catch (err) {
        results.failed.push({ row: row, reason: err.message });
      }
    }

    res.json({
      success: true,
      message: `${results.success.length} Schüler importiert, ${results.failed.length} fehlgeschlagen`,
      data: results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Import Fehler' });
  }
});

// ******************Leher-Liste importieren*********************

app.post('/api/admin/import/teachers', authenticateAdmin, uploadMemory.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Keine Datei' });
    }

    const workbook = XLSX.read(req.file.buffer);
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const results = { success: [], failed: [] };

    for (const row of data) {
      try {
        const { vorname, nachname, email, klasse, jahrgang, fach_kuerzel } = row; //in tabelle Leher-Liste muss spalt jahrgang eindeutig sein

        if (!vorname || !nachname || !email) {
          results.failed.push({ row, reason: 'Fehlende Pflichtfelder' });
          continue;
        }

        if (!validateEmail(email)) {
          results.failed.push({ row, reason: 'Ungültige E-Mail' });
          continue;
        }

        const existingUser = await prisma.benutzer.findUnique({ where: { email: email } });
        if (existingUser) {
          results.failed.push({ row: row, reason: 'E-Mail existiert bereits' });
          continue;
        }

        const initialPassword = `${vorname}${nachname}`.toLowerCase();
        const hashedPassword = await bcrypt.hash(initialPassword, 10);

        await prisma.$transaction(async (tx) => {
          // 1. benutzer erstellen
          const user = await tx.benutzer.create({
            data: { vorname, nachname, email, passwort_hash: hashedPassword }
          });

          // 2. benutzer_rolle (Lehrer-Rolle)
          await tx.benutzerRolle.create({
            data: { benutzer_id: user.id, rolle_id: 2 }
          });

          // 3. klasse benutzerKlasse (wenn klasse angegeben)
          if (klasse && jahrgang) {
            const klasseNames = klasse.split(',').map(k => k.trim());
            
            for (const klasseName of klasseNames) {
              let klasseRecord = await tx.klasse.findFirst({
                where: { name: klasseName, jahrgang: parseInt(jahrgang) }
              });

              if (!klasseRecord) {
                klasseRecord = await tx.klasse.create({
                  data: { name: klasseName, jahrgang: parseInt(jahrgang) }
                });
              }

              await tx.benutzerKlasse.create({
                data: { benutzer_id: user.id, klasse_id: klasseRecord.id }
              });
            }
          }

          // 4. benutzerFach (wenn fach angegeben)
          if (fach_kuerzel) {
            const fachKuerzels = fach_kuerzel.split(',').map(k => k.trim());
            
            for (const kuerzel of fachKuerzels) {
              let fach = await tx.fach.findUnique({
                where: { kuerzel: kuerzel }
              });

              if(!fach){
                  fach = await tx.fach.create({
                  data: { name: kuerzel, kuerzel: kuerzel }
                });
              }
              const existing = await tx.benutzerFach.findFirst({
                  where: {
                    benutzer_id: user.id,
                    fach_id: fach.id
                  }
                });

                if (!existing) {
                  await tx.benutzerFach.create({
                    data: {
                      benutzer_id: user.id,
                      fach_id: fach.id
                    }
                  });
                }
            }
          }
        });

        results.success.push({ vorname :vorname, nachname: nachname, email: email });
      } catch (err) {
        results.failed.push({ row: row, reason: err.message });
      }
    }

    res.json({
      success: true,
      message: `${results.success.length} Lehrer importiert, ${results.failed.length} fehlgeschlagen`,
      data: results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Import Fehler' });
  }
});


//**************************Benutzer Anmeldung*******************

app.post('/api/login', async (req, res) => {
  try {
    const { email, passwort, role } = req.body;  // ← NEU: Empfange den 'role'-Parameter

    // 1. Eingabefelder validieren
    if (!email || !passwort) {
      return res.status(400).json({
        success: false, 
        message: 'Email oder Passwort fehlen' 
      });
    }

    // 2. Benutzer suchen
    const user = await prisma.benutzer.findUnique({
      where: { email: email },
      include: {
        benutzer_rollen: { include: { rolle: true } }
      }
    });
    
    // 3. Benutzer und Passwort validieren
    if (!user || !await bcrypt.compare(passwort, user.passwort_hash)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Falsche Anmeldedaten' 
      });
    }

    // 4. Alle Rollen des Benutzers abrufen
    const roles = user.benutzer_rollen.map(br => ({
      id: br.rolle_id,
      bezeichnung: br.rolle.bezeichnung
    }));
    
    // 5. Wenn eine Rolle vom Frontend angegeben wurde, prüfen ob der Benutzer diese besitzt
    if (role) {
      const hasRole = roles.some(
        r => r.bezeichnung.toLowerCase() === role.toLowerCase()
      );
      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: `Sie haben keine ${role}-Berechtigung`
        });
      }
    }

    // 6. Token generieren
    const token = generateToken(user.id);
    
    // 7. Erfolgreiche Antwort senden
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          vorname: user.vorname,
          nachname: user.nachname,
          email: user.email,
          roles  // Alle Rollen zurückgeben
        },
        token
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Fehler' 
    });
  }
});

// ***************Passwort ändern (Authentifizierung erforderlich)***************
/*
app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { altesPasswort, neuesPasswort } = req.body;

    if (!altesPasswort || !neuesPasswort) {
      return res.status(400).json({
        success: false,
        message: '请提供旧密码和新密码'
      });
    }

    if (neuesPasswort.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码至少需要6个字符'
      });
    }

    const user = await prisma.benutzer.findUnique({
      where: { id: req.userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const isOldPasswordValid = await bcrypt.compare(altesPasswort, user.passwort_hash);

    if (!isOldPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '旧密码错误'
      });
    }

    const hashedNewPassword = await bcrypt.hash(neuesPasswort, 10);

    await prisma.benutzer.update({
      where: { id: req.userId },
      data: { passwort_hash: hashedNewPassword }
    });

    res.json({
      success: true,
      message: '密码修改成功'
    });

  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
});
*/



// *************************Lehrer erstellt Aufgaben***********************

app.post('/api/teacher/assignments', authenticateToken, uploadDisk.array('files', 10), async (req, res) => {
  try {
    const { class: className, subject, title, text, dueDate } = req.body;
    const teacherId = req.userId;

    // 1. Pflichtfelder validieren
    if (!className || !subject || !title || !text || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Alle Felder sind erforderlich'
      });
    }

    // 2. Lehrer-Berechtigung validieren (Redundant, da authenticateTeacher besser ist, aber hier beibehalten)
    const isTeacher = await prisma.benutzerRolle.findFirst({
      where: { 
        benutzer_id: teacherId, 
        rolle_id: 2
      }
    });

    if (!isTeacher) {
      return res.status(403).json({
        success: false,
        message: 'Nur für Lehrer'
      });
    }

    // 3. Klasse-Namen und Jahrgang parsen (Versuch, Jahrgang aus className zu extrahieren)
    let klasseName, jahrgang;
    
    const match1 = className.match(/^([A-Za-z]+)(\d{4})$/);//()()Fanggruppen 2
    const match2 = className.match(/^(\d{4})([A-Za-z]+)$/);
    const match3 = className.match(/^(\d+)([A-Z])$/);
    
    if (match1) {
      klasseName = match1[1];
      jahrgang = parseInt(match1[2]);
    } else if (match2) {
      jahrgang = parseInt(match2[1]);
      klasseName = match2[2];
    } else if (match3) {
      klasseName = className;
      jahrgang = new Date().getFullYear();
    } else {
      klasseName = className;
      jahrgang = new Date().getFullYear();
    }

    // 4. Klasse suchen oder erstellen
    let klasse = await prisma.klasse.findFirst({
      where: { name: klasseName, jahrgang: jahrgang }
    });

    if (!klasse) {
      klasse = await prisma.klasse.create({
        data: { name: klasseName, jahrgang: jahrgang }
      });
    }

    // 5. Fach suchen oder erstellen
    let fach = await prisma.fach.findUnique({
      where: { kuerzel: subject }
    });

    if (!fach) {
      fach = await prisma.fach.create({
        data: { name: subject, kuerzel: subject }
      });
    }

    // 6. Automatische Verknüpfung Lehrer <-> Fach (Falls noch nicht vorhanden)
    const teacherFach = await prisma.benutzerFach.findFirst({
      where: { benutzer_id: teacherId, fach_id: fach.id }
    });

    if (!teacherFach) {
      await prisma.benutzerFach.create({
        data: { benutzer_id: teacherId, fach_id: fach.id }
      });
    }

    // 7. Anhänge-Informationen verarbeiten (wurde auf Disk gespeichert)
    let anhaenge = null;
    if (req.files && req.files.length > 0) {
      const filePaths = req.files.map(f => ({
        originalName: f.originalname,
        filename: f.filename,        // "1730457930123-751234567-report.docx"
        path: f.path,                // f.path=/app/uploads/assignments/1730457930123-report.pdf
        size: f.size,
        mimetype: f.mimetype,
        uploadDate: new Date().toISOString() //"2025-11-01T21:05:30.456Z"
      }));
      anhaenge = JSON.stringify(filePaths); //array--> filePaths = [ { originalName: "report.pdf", path: "/app/..." }, { ... } ]
    }                                       //string--> stringify(filePaths) = '[{"originalName":"report.pdf","path":"/app/..."},{"originalName":"image.png","path":"/app/..."}]'

    // 8. Deadline validieren
    /*
    const terminDate = new Date("2025-12-31");
    console.log(typeof terminDate);       // "object"
    console.log(terminDate);              // 2025-12-31T00:00:00.000Z
    console.log(terminDate.getFullYear()); // 2025 
    console.log(terminDate.getMonth());    // 11 (0-11) 
    console.log(terminDate.getDate());     // 31 
     */
    const terminDate = new Date(dueDate); //dueDate "2025-12-31" ist "string"
    if (isNaN(terminDate.getTime())) { //1970-01-01T00:00:00.000Z bis 2025-12-31T00:00:00.000Z 1767139200000ms
      return res.status(400).json({
        success: false,
        message: 'Ungültiges Datum-Format'
      });
    }

    // 9. Aufgaben erstellen
    const aufgabe = await prisma.aufgabe.create({
      data: { //Daten in die Datenbank schreiben
        titel: title,
        beschreibung: text,
        termin: terminDate,
        klasse_id: klasse.id,
        fach_id: fach.id,
        lehrer_id: teacherId,
        anhaenge: anhaenge
      },
      include: { //Verbundene Daten auslesen
        klasse: true,
        fach: true,
        lehrer: {
          select: {
            id: true,
            vorname: true,
            nachname: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Aufgabe erfolgreich erstellt',
      data: {
        id: aufgabe.id,
        titel: aufgabe.titel,
        beschreibung: aufgabe.beschreibung,
        termin: aufgabe.termin,
        klasse: aufgabe.klasse.name,
        fach: aufgabe.fach.name,
        lehrer: `${aufgabe.lehrer.vorname} ${aufgabe.lehrer.nachname}`,
        anhaenge: aufgabe.anhaenge ? JSON.parse(aufgabe.anhaenge) : []
      }
    });

  } catch (error) {
    console.error('Aufgabe erstellen Fehler:', error);
    
    // Beim Fehler werden alle hochgeladenen Dateien gelÖcht
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) { //fs.existsSync(datein oder verzeichnis mit pfad)
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server Fehler',
      error: error.message
    });
  }
});

// ****************Abmeldung****************

app.post('/api/logout', (req, res) => { // Kein Token-Validierung erforderlich， Frontend kann es selbst entfernen.
  res.json({
    success: true,
    message: 'Abmeldung erfolgreich'
  });
});


// Statische Dateien automatisch bereitstellen
// Diese Middleware liefert alle Dateien aus dem Frontend-Ordner:
// - GET /login.html        → /app/frontend/login.html
// - GET /css/style.css     → /app/frontend/css/style.css
// - GET /js/script.js      → /app/frontend/js/script.js
// Erspart uns, für jede Datei eine eigene Route zu schreiben!
app.use(express.static(FRONTEND_PATH));            //!!!!für frontend-backend gemeinsamen Deploy
 
// Fängt alle GET-Anfragen ab, die von den vorherigen Routes nicht behandelt wurden
// Wichtig für:
// - Frontend-Routing (/dashboard, /profile, etc.)
// - Seite neu laden (F5) → funktioniert ohne 404-Fehler
// '*' = alle Pfade
app.get(/.*/, (req, res) => {                      //!!!!für frontend-backend gemeinsamen Deploy
                                    // Liefert /app/frontend/login.html
      res.sendFile(path.join(FRONTEND_PATH, 'login.html')); 
});



// -----------------------------------Server starten-------------------------------------------

const PORT = process.env.PORT || 3000;

const startServer = async () =>{
  await initDatabase(); // db init warten
  app.listen(PORT, () => {
  console.log(`🚀 SmartSubmit Server betriebt im Port ${PORT}`);
  console.log(`📍 API-Addresse: http://localhost:${PORT}`);
});
};

startServer();

process.on('SIGINT', async () => {  //STOP-Signal von Ctrl + C
  await prisma.$disconnect();
  console.log('\nServer abgeschaltet!');
  process.exit(0);
});