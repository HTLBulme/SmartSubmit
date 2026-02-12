const T = {
  de: {
    title: "Anmeldung",
    subtitle: "Bitte melde dich in deinem Konto an",
    email: "E-Mail-Adresse",
    password: "Passwort",
    selectRole: "Rolle auswählen",
    admin: "Admin",
    teacher: "Lehrer",
    student: "Schüler",
    login: "Anmelden",
    forgot: "Passwort vergessen?",
    roleError: "Diese Rolle ist für diesen Benutzer nicht verfügbar.",
    loginFailed: "Anmeldung fehlgeschlagen",
    serverError: "Serverfehler – bitte später erneut versuchen",
    adminTitle: "Admin-Registrierung",
    adminSubtitle: "Bitte erstellen Sie das erste Administratorkonto",
    register: "Registrieren",
    regDisabled: "Die Admin-Registrierung ist deaktiviert, da bereits ein Admin existiert.",
    registerSuccess: "Registrierung erfolgreich!",
    registerFail: "Registrierung fehlgeschlagen",
    goToLogin: "Zum Login",
    loginTitle: "Anmeldung",
    register: "Registrieren",
    password: "Passwort",
    email: "E-Mail",
    teacherPanel: "Lehrerbereich",
    classLbl: "Klasse",
    subjectLbl: "Fach",
    titleLbl: "Titel",
    textLbl: "Beschreibung",
    filesLbl: "Dateien",
    dueLbl: "Abgabetermin",
    selectPlaceholder: "-- auswählen --",
    titlePh: "Aufgabentitel eingeben",
    textPh: "Beschreibung oder Anweisungen...",
    dndTitle: "Dateien hierher ziehen",
    dndSubtitle: "oder klicken, um auszuwählen",
    dndHint: "Enter zum Auswählen",
    chooseFile: "Datei wählen",
    remove: "Entfernen",
    saveAssgn: "Aufgabe speichern",
    assgnSaved: "Aufgabe wurde gespeichert",
    assgnError: "Fehler beim Speichern",
    userImport: "Benutzerimport",
    uploadHint: "Ziehen Sie eine Excel-Datei hierher oder klicken Sie, um sie auszuwählen.",
    dragHere: "Datei hierher ziehen oder klicken",
    uploadButton: "Daten hochladen",
    success: "✅ Import erfolgreich!",
    uploadError: "❌ Fehler beim Hochladen",
    serverError: "⚠️ Serverfehler",
    noFile: "Bitte wählen Sie eine Datei aus",
    previewTitle: "Vorschau (erste 5 Zeilen)",
    firstName: "Vorname",
    lastName: "Nachname",
    gradeLevel: "Jahrgang",
    subjectAbbrev: "Fachkürzel",
    userImport: "Benutzerimport",
    uploadHint: "Ziehen Sie eine Excel-Datei hierher oder klicken Sie, um sie auszuwählen.",
    dragHere: "Datei hierher ziehen oder klicken",
    uploadButton: "Daten hochladen",
    success: "Import erfolgreich!",
    uploadError: "Fehler beim Hochladen",
    serverError: "Serverfehler",
    noFile: "Bitte wählen Sie eine Datei aus",
    roleStudents: "Schüler",
    roleTeachers: "Lehrer",
    welcome: "Willkommen",
    myAssignments: "Meine Aufgaben",
    myGrades: "Meine Noten",
    noAssignments: "Keine Aufgaben vorhanden",
    noGrades: "Keine Noten verfügbar",
    assignment: "Aufgabe",
    dueDate: "Fälligkeitsdatum",
    status: "Status",
    grade: "Note",
    feedback: "Rückmeldung",
    submitted: "Eingereicht",
    notSubmitted: "Nicht eingereicht",
    viewDetails: "Details anzeigen",
    submitWork: "Abgabe einreichen",
    logout: "Abmelden",
    fetchError: "Fehler beim Laden der Daten",
    loading: "Wird geladen...",
    linkLbl: "Aufgaben-Link (URL)",
    linkPh: "https://...",
    abgabenBtn: "Abgabenliste",
    assignmentBtn: "Aufgabenliste",

     // Help page
    helpTitle: "Hilfe & Anleitung",
    helpBtn: "Hilfe",
    quickStart: "Schnellstart",
    forAdmins: "Für Administratoren",
    forTeachers: "Für Lehrer",
    forStudents: "Für Schüler",
    excelImport: "Excel-Import",
    studentImport: "Schüler importieren",
    teacherImport: "Lehrer importieren",
    fileUpload: "Datei-Upload",
    faq: "Häufig gestellte Fragen (FAQ)",
    contact: "Kontakt & Support",
    back: "Zurück",

    // HELP CONTENT

    adminSteps: [
      "Melden Sie sich mit Admin-Zugangsdaten an",
      "Gehen Sie zum Admin-Panel",
      "Importieren Sie Schüler und Lehrer über Excel-Dateien",
      "Benutzer können sich nun mit ihren Zugangsdaten anmelden"
    ],

    teacherSteps: [
      "Melden Sie sich mit Ihren Zugangsdaten an",
      "Wählen Sie Klasse und Fach aus",
      "Erstellen Sie eine neue Aufgabe",
      "Fügen Sie Dateien hinzu (optional)",
      "Setzen Sie eine Frist und speichern Sie",
      "Sehen Sie Abgaben unter \"Abgabenliste\""
    ],

    studentSteps: [
      "Melden Sie sich mit Ihren Zugangsdaten an",
      "Sehen Sie alle zugewiesenen Aufgaben",
      "Klicken Sie auf eine Aufgabe für Details",
      "Reichen Sie Ihre Arbeit mit Text und/oder Dateien ein",
      "Verfolgen Sie Ihre Abgaben im Dashboard"
    ],

    columndHint: "Excel-Datei muss folgende Spalten enthalten:",

    excelStudentColumns: [
      "vorname: Vorname des Schülers",
      "nachname: Nachname des Schülers",
      "email: E-Mail-Adresse (muss eindeutig sein)",
      "klasse: Klassenname (z.B. \"5A\" oder \"5A,5B\")",
      "jahrgang: Jahr (z.B. 2025)"
    ],

    excelTeacherColumns: [
      "vorname: Vorname des Lehrers",
      "nachname: Nachname des Lehrers",
      "email: E-Mail-Adresse (muss eindeutig sein)",
      "klasse: Klassenname (optional)",
      "jahrgang: Jahr (optional)",
      "fach_kuerzel: Fachkürzel (z.B. \"MATH,DE\")"
    ],

    passwordHint:
      "Hinweis: Anfangspasswort für neue Benutzer ist \"vorname nachname\" in Kleinbuchstaben. Beispiel: Max Mustermann → Passwort: \"maxmustermann\"",

    supportedFormats: "Unterstützte Dateiformate:",
    
    fileFormats: [
      "Dokumente: PDF, DOCX, DOC, TXT",
      "Tabellen: XLSX, XLS, CSV",
      "Bilder: JPG, JPEG, PNG, GIF",
      "Präsentationen: PPTX, PPT",
      "Andere: ZIP, RAR"
    ],

    maxFileSize: [
    "Maximale Dateigröße:",
    "5 MB pro Datei"
    ],

    multiUpload: [
      "Mehrere Dateien hochladen:", 
      "Sie können mehrere Dateien gleichzeitig hochladen, indem Sie sie alle auf einmal auswählen oder einzeln hinzufügen."
    ],

    faqPassword: [
      "Wie ändere ich mein Passwort?",
      "Klicken Sie auf Ihren Namen in der oberen rechten Ecke und wählen Sie \"Passwort ändern\".",
    ],
    faqLate: [
      "Was passiert, wenn ich die Frist verpasse?", 
      "Sie können die Aufgabe weiterhin abgeben, aber sie wird als verspätet markiert."
    ],

    faqEdit: [
      "Kann ich eine Abgabe nach der Einreichung bearbeiten?",
      "Nein, nach der Abgabe können Sie die Einreichung nicht mehr bearbeiten. Kontaktieren Sie Ihren Lehrer, wenn Sie Änderungen vornehmen müssen."
    ],

    faqMultiClass: [
      "Kann ich eine Aufgabe mehreren Klassen zuweisen?",
      "Als Lehrer können Sie die Klasse im Dropdown-Menü auswählen, bevor Sie eine Aufgabe erstellen.",
    ],    

    faqStatus: [
      "Was bedeuten die verschiedenen Status?",
      "Aktiv: Aufgabe ist noch offen für Abgaben.",
      "Abgelaufen: Frist ist überschritten.",
      "Abgegeben: Sie haben bereits abgegeben."
    ],

    contactText: [
      "Bei weiteren Fragen wenden Sie sich bitte an:",
      "E-Mail: support@smartsubmit.com",
      "Institution: HTL Bulme"
    ]
  },
  
  en: {
    title: "Login",
    subtitle: "Please sign in to your account",
    email: "Email address",
    password: "Password",
    selectRole: "Select role",
    admin: "Admin",
    teacher: "Teacher",
    student: "Student",
    login: "Login",
    forgot: "Forgot password?",
    roleError: "This role is not available for this user.",
    loginFailed: "Login failed",
    serverError: "Server error – please try again later",
    adminTitle: "Admin Registration",
    adminSubtitle: "Please create the first administrator account",
    register: "Register",
    regDisabled: "Admin registration is disabled because an admin already exists.",
    registerSuccess: "Registration successful!",
    registerFail: "Registration failed",
    goToLogin: "Go to login",
    loginTitle: "Login",
    register: "Register",
    password: "Password",
    email: "Email",
    teacherPanel: "Teacher Panel",
    classLbl: "Class",
    subjectLbl: "Subject",
    titleLbl: "Title",
    textLbl: "Description",
    filesLbl: "Files",
    dueLbl: "Due date",
    selectPlaceholder: "-- select --",
    titlePh: "Enter assignment title",
    textPh: "Description or instructions...",
    dndTitle: "Drag & drop files here",
    dndSubtitle: "or click to choose",
    dndHint: "Press Enter to choose",
    chooseFile: "Choose file",
    remove: "Remove",
    saveAssgn: "Save assignment",
    assgnSaved: "Assignment saved",
    assgnError: "Error while saving",
    userImport: "User Import",
    uploadHint: "Drag an Excel file here or click to select one.",
    dragHere: "Drag or click to upload a file",
    uploadButton: "Upload data",
    success: "✅ Import successful!",
    uploadError: "❌ Upload failed",
    serverError: "⚠️ Server error",
    noFile: "Please select a file",
    previewTitle: "Preview (first 5 rows)",
    firstName: "First name",
    lastName: "Last name",
    gradeLevel: "Grade",
    subjectAbbrev: "Subject code",
    userImport: "User Import",
    uploadHint: "Drag an Excel file here or click to select it.",
    dragHere: "Drag or click to upload a file",
    uploadButton: "Upload data",
    success: "Import successful!",
    uploadError: "Upload failed",
    serverError: "Server error",
    noFile: "Please select a file",
    roleStudents: "Students",
    roleTeachers: "Teachers",
    welcome: "Welcome",
    myAssignments: "My Assignments",
    myGrades: "My Grades",
    noAssignments: "No assignments yet",
    noGrades: "No grades available",
    assignment: "Assignment",
    dueDate: "Due Date",
    status: "Status",
    grade: "Grade",
    feedback: "Feedback",
    submitted: "Submitted",
    notSubmitted: "Not Submitted",
    viewDetails: "View Details",
    submitWork: "Submit Work",
    logout: "Abmelden",
    fetchError: "Fehler beim Laden der Daten",
    loading: "Wird geladen...",
    logout: "Logout",
    fetchError: "Error loading data",
    loading: "Loading...",
    linkLbl: "Assignment link (URL)",
    linkPh: "https://...",
    abgabenBtn: "Submissions list",
    assignmentBtn: "Assignments list",

    // Help page
    helpTitle: "Help & Instructions",
    helpBtn: "Help",
    quickStart: "Quick Start",
    forAdmins: "For Administrators",
    forTeachers: "For Teachers",
    forStudents: "For Students",
    excelImport: "Excel Import",
    studentImport: "Import Students",
    teacherImport: "Import Teachers",
    fileUpload: "File Upload",
    faq: "Frequently Asked Questions (FAQ)",
    contact: "Contact & Support",
    back: "Back",

    adminSteps: [
      "Log in with admin credentials",
      "Go to the admin panel",
      "Import students and teachers via Excel files",
      "Users can now log in with their credentials"
    ],

    teacherSteps: [
      "Log in with your credentials",
      "Select class and subject",
      "Create a new assignment",
      "Add files (optional)",
      "Set a deadline and save",
      "View submissions under \"Submission list\""
    ],

    studentSteps: [
      "Log in with your credentials",
      "View all assigned tasks",
      "Click on an assignment for details",
      "Submit your work with text and/or files",
      "Track your submissions in the dashboard"
    ],

    columndHint: "Excel file must contain the following columns:",

    excelStudentColumns: [
      "vorname: First name",
      "nachname: Last name",
      "email: Email address (must be unique)",
      "klasse: Class name (e.g. \"5A\" or \"5A,5B\")",
      "jahrgang: Year (e.g. 2025)"
    ],

    excelTeacherColumns: [
      "vorname: First name",
      "nachname: Last name",
      "email: Email address (must be unique)",
      "klasse: Class name (optional)",
      "jahrgang: Year (optional)",
      "fach_kuerzel: Subject code (e.g. \"MATH,DE\")"
    ],

    passwordHint:
      "Note: The initial password for new users is \"firstname lastname\" in lowercase. Example: Max Mustermann → password: \"maxmustermann\"",
    
    supportedFormats: "Supported file formats:",

    fileFormats: [
      "Documents: PDF, DOCX, DOC, TXT",
      "Spreadsheets: XLSX, XLS, CSV",
      "Images: JPG, JPEG, PNG, GIF",
      "Presentations: PPTX, PPT",
      "Others: ZIP, RAR"
    ],

    maxFileSize: [
      "Maximum file size:",
      "5 MB per file"
    ],

    multiUpload: [
      "Upload multiple files:",
      "You can upload multiple files at once by selecting them together or adding them individually."
    ],

    faqPassword: [
      "How do I change my password?",
      "Click on your name in the top right corner and select \"Change password\"."
    ],

    faqLate: [
      "What happens if I miss the deadline?",
      "You can still submit the assignment, but it will be marked as late.",
    ], 

    faqEdit: [
      "Can I edit a submission after it's been made?",
      "No, once a submission is made, it cannot be edited. Contact your teacher if you need to make changes."
    ],

    faqMultiClass: [
      "Can I assign an assignment to multiple classes?",
      "As a teacher, you can select the class from the dropdown before creating an assignment." 
    ],

    faqStatus: [
      "What do the different statuses mean?",
      "Active: Assignment is still open.",
      "Expired: Deadline has passed.",
      "Submitted: You already submitted."
    ],

    contactText: [
      "For further questions please contact:",
      "E-Mail: support@smartsubmit.com",
      "Institution: HTL Bulme"
    ]
  },

};

export default T;
