const path = require('path');
const express = require('express'); // Lädt das Express-Framework(Factory Function), um den Webserver zu erstellen
const cors = require('cors');   //Lädt die CORS-Middleware zur Handhabung von Cross-Origin-Anfragen，const cors ist eine Factory Function
const dotenv = require('dotenv');   //Zum Laden von Umgebungsvariablen aus .env
const { PrismaClient } = require('@prisma/client'); //Lädt den Prisma-Client, einen ORM (Object-Relational Mapper),als JavaScript-Objekt,für CRUD-Operationen
const bcrypt = require('bcryptjs'); //Passwort mit bcrypt hashen.
const jwt = require('jsonwebtoken');

dotenv.config(); //Führt die config von dotenv aus, um .env-Variablen zu laden.

const app = express();
const prisma = new PrismaClient();

//-----------------------------Middleware ausführen-----------------------------
app.use(cors());
app.use(express.json()); // Führt JSON-req.body(js-object)-Parser-Middleware aus 
app.use(express.urlencoded({ extended: true }));  // für traditionelle HTML-Formularübermittlung

// 1. Definition des Pfades zum Frontend-Ordner:
// '__dirname' ist der aktuelle Ordner ('backend'). '..' geht einen Ordner hoch.
const FRONTEND_PATH = path.join(__dirname, '..', 'frontend');

// 2. Statische Dateien aus dem 'frontend'-Ordner bereitstellen:
// Alle Dateien im 'frontend'-Ordner (wie /js/login.js, /register.html, etc.)
// sind nun direkt unter der Haupt-URL erreichbar.
app.use(express.static(FRONTEND_PATH));

// 3. Route für die Stamm-URL (/) definieren, um die UI zu laden:
// Dadurch wird der "Cannot GET /" Fehler behoben, da nun eine Datei geliefert wird.
app.get('/', (req, res) => {
    // Schickt die Login-Seite als Einstiegspunkt.
    res.sendFile(path.join(FRONTEND_PATH, 'login.html')); 
});

//-----------------------------authenticateToken Middleware definieren-----------------------------
/*
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未提供认证令牌'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: '令牌无效或已过期'
      });
    }
    req.userId = decoded.userId;
    next();
  });
};
*/
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
  try {
    // Bei jedem Starten des Servers die Rolle Tabelle checken, ob es leer ist.
    const roleCount = await prisma.rolle.count();
    
    if (roleCount === 0) {
      console.log('Rolle-Daten init...');
      
      await prisma.rolle.createMany({ //此处rolleId顺序要和前端一致
        data: [
          { 
            bezeichnung: 'Schüler', 
            beschreibung: 'Schüler，kann Aufgaben abgeben' 
          },
          { 
            bezeichnung: 'Lehrer', 
            beschreibung: 'Lehrer，kann Aufgaben erstellen, bewerten und verwalten' 
          },
          { 
            bezeichnung: 'Admin', 
            beschreibung: 'Adimin，kann das System Verwalten' 
          },
        ]
      });
      
      console.log('Init fertig!');
    } else {
      console.log('Rolle-Daten bereits existieren');
    }
  } catch (error) {
    console.error('Es ist schief gegangen beim Init-Prozess', error);
  }
}


//------------------------------API Routers----------------------------------

//Statuscode: 400 Bad Request，401 Unauthorized， 500 Internal Server Error，201 Created

//die available-roles in DB holen, für Frontend zum Rendern
//diese abfrage On Page Load automatisch an backend abschicken
//wenn Frontend mit Hardcode für rolle-rendern, braucht man dies net.
app.get('/api/auth/available-roles', async (req, res) => {
  try {
    const roles = await prisma.rolle.findMany({
      select: {   //3 felder zuruckgeben
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
      message: 'Serverfehler, bitte versuchen Sie es später erneut.'
    });
  }
});

//******************Registrierung*******************
/*
1. Request-Informationen abrufen
   ↓
2. Request-Informationen validieren (Format, Pflichtfelder)
   ↓
3. Datenbankabfrage (prüfen, ob E-Mail bereits existiert)
   ↓
4. Passwort verschlüsseln (bcrypt)
   ↓
5. Benutzer erstellen (in Datenbank einfügen)
   ↓
6. Token generieren (JWT Token)
   ↓
7.Token und Benutzerinformationen zurückgeben
*/

app.post('/api/register', async (req, res) => {  //!!von Frontend-------------------------------------'/api/auth/register'
  try {
    const { vorname = "song", nachname = "jin", email, passwort = req.body.password, rolleId = 1 } = req.body; //!!rolleId von Frontend -------------------------------------kein name von frontend

    // Pflichtfelder validieren
    if (!vorname || !nachname || !email || !passwort || !rolleId) {
      return res.status(400).json({
        success: false,
        message: 'Bitte geben Sie alle Pflichtfelder (einschließlich des Rollentyps) an.'
      });
    }

    // Rollentyp(nur Student oder Lehrer) validieren 
    const allowedRoleIds = [1, 2];
    if (!allowedRoleIds.includes(rolleId)) {
      return res.status(400).json({
        success: false,
        message: 'nur Student oder Lehrer sind zuverlässige Rollentypen.'
      });
    }

    // E-Mail-Format validieren
    if (!validateEmail(email)) { // Definitionsfunktion sieh oberst
      return res.status(400).json({
        success: false,
        message: 'Ungültiges E-Mail-Format.'
      });
    }

    // Passwortstärke validieren
    if (passwort.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Das Passwort muss mindestens 6 Zeichen lang sein.'
      });
    }

    // Prüfen, ob E-Mail-Adresse bereits existiert
    const existingUser = await prisma.benutzer.findUnique({ //SELECT sytaxen von prisma: obj.obj.methode({where: {email: email }})
      where: { email: email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail-Adresse bereits existiert'
      });
    };

    const hashedPassword = await bcrypt.hash(passwort, 10);//hashen, Salt Rounds 10 ist momentan genug default

    // ****************Benutzerinformationen erstellen（ACID mit transaction-commit）****************

    const newUser = await prisma.$transaction(async (prisma) => {  //bei prisma auto commit, die zweite prisma ist ein transaction-client，$ steht für Integrierte Methode
      // Bentzer erstellen
      const user = await prisma.benutzer.create({  //Zurückgegeben wird ein Datensatz (key:value) aus der Benutzer-Tabelle.
        data: {     //id und erstellt_am werden automatisch generiert
          vorname: vorname,
          nachname: nachname,
          email: email,
          passwort_hash: hashedPassword
        }
      });
      //BenutzerRolle tabelle eintragen
      const benutzerRolle = await prisma.benutzerRolle.create({
        data: {
          benutzer_id: user.id,
          rolle_id: parseInt(rolleId)
        }
      });

      return {user: user, benutzerRolle: benutzerRolle}; // return an object
    });

    const rolle = await prisma.rolle.findUnique({
      where:{
        id:rolleId
      }
    })

    const token = generateToken(newUser.user.id);

    res.status(201).json({  // Rückmeldung zum Frontend
      success: true,
      message: 'Registrierung erfolgreich!',
      data: {
        user: {
          id: newUser.user.id,
          vorname: newUser.user.vorname,
          nachname: newUser.user.nachname,
          email: newUser.user.email,
          erstellt_am: newUser.user.erstellt_am,
          rolle: {
            id: newUser.benutzerRolle.rolle_id,
            bezeichnung: rolle.bezeichnung,
            beschreibung: rolle.beschreibung
          }
        },
        token: token //dynamisch generiert jedes mal anders-------------------------------------------------es fehlt bei frontend!!!
      }
    });
}catch (error) {
    console.error('Registrierungsfehler:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler, bitte versuchen Sie es später erneut.'
    });
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
8.Token, Benutzerinformationen und Rolleninformationen zurückgeben
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