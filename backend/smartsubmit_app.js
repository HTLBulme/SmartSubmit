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

const upload = multer({ //Instance von multer
  storage: multer.memoryStorage(), // File in RAM speichern
  limits: { fileSize: 5 * 1024 * 1024 } //Grösse der File auf 5MB beschränken
});

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
const authenticateAdmin = async (req, res, next) => {
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

//-----------------------------Hilfsfunktionen-----------------------------

//JWT Token generator
const generateToken = (userId) => {
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
    }
  } catch (error) {
    console.error('DB-Init Fehler:', error);
  }
};

//------------------------------API Routers----------------------------------

//Statuscode: 400 Bad Request，401 Unauthorized，403 Forbidden, 500 Internal Server Error，201 Created

// ******************Admin Login*********************

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



// ******************Schüler-Liste importieren*********************

/*
<form action="/api/admin/import/students" method="POST" enctype="multipart/form-data">
    <input type="file" name="file" /> 
    <button type="submit">Studenten importieren</button>
</form>*/

app.post('/api/admin/import/students', authenticateAdmin, upload.single('file'), async (req, res) => {
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
        const { vorname, nachname, email, klasse, jahrgang } = row; //zb.jahrgang 2025

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

        results.success.push({ vorname: vorname, nachname: nachname, email: email, klassen: klasseNames, jahrgang: jahrgang });
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

//******************Anmeldung*******************
/*
 Request-Informationen abrufen
   ↓
2. Request-Informationen validieren (Format, Pflichtfelder)
   ↓
3. Datenbankabfrage (Benutzer per E-Mail suchen + Rolleninformationen)
   ↓
4. Passwort verifizieren (bcrypt.compare)
   ↓
5. Token generieren (JWT Token)
   ↓
6. (Optional) Letzten Login-Zeitpunkt aktualisieren
   ↓
7.Token, Benutzerinformationen und Rolleninformationen zurückgeben
*/

app.post('/api/login', async (req, res) => {//-------------------------------------------------------'/api/auth/login'
  try {
    const { email, passwort = req.body.password } = req.body;

    if (!email || !passwort) {
      return res.status(400).json({
        success: false,
        message: 'Bitte geben Sie die E-Mail-Adresse und das Passwort an.'
      });
    }

    const user = await prisma.benutzer.findUnique({ // !!!email-check!!! user mit dieser email abfragen
      where: { email: email },
      include: {
        benutzer_rollen: {
          include: {
            rolle: true
          }
        }
      }
    });

    if (!user) { // !!! email-check fail!!!  ohne registrierter user mit dieser email
      return res.status(401).json({
        success: false,
        message: 'E-Mail oder Passwort falsch.'
      });
    }

    const isPasswordValid = await bcrypt.compare(passwort, user.passwort_hash);// !!!password-check!!!

    if (!isPasswordValid) { //!!! password-check fail!!!
      return res.status(401).json({
        success: false,
        message: 'E-Mail oder Passwort falsch.'
      });
    }

    const token = generateToken(user.id);  //dynamisch generiert jedes mal anders-------------------------------------------------es fehlt bei frontend!!!

    const roles = user.benutzer_rollen.map(br => ({ //roles array
      id: br.rolle.id,
      bezeichnung: br.rolle.bezeichnung,
      beschreibung: br.rolle.beschreibung
    }));

    res.json({
      success: true,
      message: 'Anmeldung erfolgreich',
      data: {
        user: {
          id: user.id,
          vorname: user.vorname,
          nachname: user.nachname,
          email: user.email,
          erstellt_am: user.erstellt_am,
          roles: roles
        },
        token //-------------------------------------------------------------------------es fehlt bei frontend!!!
      }
    });

  } catch (error) {
    console.error('Anmeldung fehlgeschlagen:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler, bitte versuchen Sie es später erneut'
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

// ****************Abmeldung****************

app.post('/api/logout', (req, res) => { // Kein Token-Validierung erforderlich， Frontend kann es selbst entfernen.
  res.json({
    success: true,
    message: 'Abmeldung erfolgreich'
  });
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