const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const { prisma } = require('../app.config');
const { validateEmail } = require('../app.utils');

// --- Check if admin exists ---
const checkAdminExists = async (req, res) => {
  try {
    const adminCount = await prisma.benutzerRolle.count({
      where: { rolle_id: 3 }
    });

    res.json({
      success: true,
      adminExists: adminCount > 0
    });
  } catch (error) {
    console.error('Admin check error', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// --- Import students from Excel ---
const importStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const results = { success: [], failed: [] };

    for (const row of data) {
      try {
        const { vorname, nachname, email, klasse, jahrgang } = row;

        if (!vorname || !nachname || !email || !klasse || !jahrgang) {
          results.failed.push({ row: row, reason: 'Missing required fields' });
          continue;
        }

        if (!validateEmail(email)) {
          results.failed.push({ row: row, reason: 'Invalid email' });
          continue;
        }

        const existingUser = await prisma.benutzer.findUnique({ where: { email } });
        if (existingUser) {
          results.failed.push({ row: row, reason: 'Email already exists' });
          continue;
        }

        const initialPassword = `${vorname}${nachname}`.toLowerCase();
        const hashedPassword = await bcrypt.hash(initialPassword, 10);

        // --- Students can belong to multiple classes (separated by comma) ---
        const klasseNames = klasse.split(',').map(k => k.trim());

        await prisma.$transaction(async (tx) => {
          // --- 1. Create user ---
          const user = await tx.benutzer.create({
            data: {
              vorname: vorname,
              nachname: nachname,
              email: email,
              passwort_hash: hashedPassword
            }
          });

          // --- 2. Assign student role ---
          await tx.benutzerRolle.create({
            data: { benutzer_id: user.id, rolle_id: 1 }
          });

          // --- 3. Create/link classes ---
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
      message: `${results.success.length} students imported, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Import error' });
  }
};

// --- Import teachers from Excel ---
const importTeachers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file' });
    }

    const workbook = XLSX.read(req.file.buffer);
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const results = { success: [], failed: [] };

    for (const row of data) {
      try {
        const { vorname, nachname, email, klasse, jahrgang, fach_kuerzel } = row;

        if (!vorname || !nachname || !email) {
          results.failed.push({ row, reason: 'Missing required fields' });
          continue;
        }

        if (!validateEmail(email)) {
          results.failed.push({ row, reason: 'Invalid email' });
          continue;
        }

        const existingUser = await prisma.benutzer.findUnique({ where: { email: email } });
        if (existingUser) {
          results.failed.push({ row: row, reason: 'Email already exists' });
          continue;
        }

        const initialPassword = `${vorname}${nachname}`.toLowerCase();
        const hashedPassword = await bcrypt.hash(initialPassword, 10);

        await prisma.$transaction(async (tx) => {
          // --- 1. Create user ---
          const user = await tx.benutzer.create({
            data: { vorname, nachname, email, passwort_hash: hashedPassword }
          });

          // --- 2. Assign teacher role ---
          await tx.benutzerRolle.create({
            data: { benutzer_id: user.id, rolle_id: 2 }
          });

          // --- 3. Link to classes (if provided) ---
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

          // --- 4. Link to subjects (if provided) ---
          if (fach_kuerzel) {
            const fachKuerzels = fach_kuerzel.split(',').map(k => k.trim());
            
            for (const kuerzel of fachKuerzels) {
              let fach = await tx.fach.findUnique({
                where: { kuerzel: kuerzel }
              });

              if (!fach) {
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
      message: `${results.success.length} teachers imported, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Import error' });
  }
};

module.exports = {
  checkAdminExists,
  importStudents,
  importTeachers
};