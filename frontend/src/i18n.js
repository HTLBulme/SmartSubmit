const T = {
  de: {
    // --- Auth & Generic ---
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
    logout: "Abmelden",
    fetchError: "Fehler beim Laden der Daten",
    loading: "Wird geladen...",
    success: "✅ Import erfolgreich!",
    uploadError: "❌ Fehler beim Hochladen",

    // --- Admin & Registration ---
    adminTitle: "Admin-Registrierung",
    adminSubtitle: "Bitte erstellen Sie das erste Administratorkonto",
    register: "Registrieren",
    regDisabled: "Die Admin-Registrierung ist deaktiviert, da bereits ein Admin existiert.",
    registerSuccess: "Registrierung erfolgreich!",
    registerFail: "Registrierung fehlgeschlagen",
    goToLogin: "Zum Login",
    loginTitle: "Anmeldung",

    // --- Teacher Panel & Assignment Creation ---
    teacherPanel: "Lehrerbereich",
    classLbl: "Klasse",
    subjectLbl: "Fach",
    titleLbl: "Titel",
    textLbl: "Beschreibung",
    filesLbl: "Dateien",
    dueLbl: "Abgabetermin",
    duePresetPlaceholder: "Schnellwahl",
    duePresetDay: "+ 1 Tag",
    duePresetWeek: "+ 1 Woche",
    duePresetMonth: "+ 1 Monat",
    selectPlaceholder: "-- auswählen --",
    titlePh: "Aufgabentitel eingeben",
    textPh: "Beschreibung oder Anweisungen...",
    saveAssgn: "Aufgabe speichern",
    assgnSaved: "Aufgabe wurde gespeichert",
    assgnError: "Fehler beim Speichern",
    assignmentBtn: "Aufgabenliste",
    abgabenBtn: "Abgabenliste",
    submissionsTitle: "Abgabenliste",
    noSubmissions: "Keine Abgaben vorhanden",

    // --- Drag & Drop / Files ---
    dndTitle: "Dateien hierher ziehen",
    dndSubtitle: "oder klicken, um auszuwählen",
    dndHint: "Enter zum Auswählen",
    chooseFile: "Datei wählen",
    remove: "Entfernen",
    dragHere: "Datei hierher ziehen oder klicken",
    uploadButton: "Daten hochladen",
    noFile: "Bitte wählen Sie eine Datei aus",

    // --- User Import ---
    userImport: "Benutzerimport",
    uploadHint: "Ziehen Sie eine Excel-Datei hierher oder klicken Sie, um sie auszuwählen.",
    previewTitle: "Vorschau (erste 5 Zeilen)",
    firstName: "Vorname",
    lastName: "Nachname",
    gradeLevel: "Jahrgang",
    subjectAbbrev: "Fachkürzel",

    // --- Student Panel ---
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
    active: "Aktiv",
    overdue: "Überfällig",
    pendingGrade: "Wird bewertet",
    submittedText: "Mein Text",
    submittedFiles: "Meine Dateien",
    viewDetails: "Details anzeigen",
    hideDetails: "Details schließen",
    submitWork: "Abgabe einreichen",
    submissionClosed: "Abgabe geschlossen (Frist abgelaufen)",
    submitSuccess: "Abgabe gespeichert",
    submitError: "Fehler beim Speichern der Abgabe",

    // --- Password Change (New) ---
    changePassword: "Passwort ändern",
    changePasswordTitle: "Passwort ändern",
    changePasswordSubtitle: "Gib dein aktuelles und neues Passwort ein",
    oldPassword: "Aktuelles Passwort",
    newPassword: "Neues Passwort",
    confirmPassword: "Passwort bestätigen",
    cancel: "Abbrechen",
    passwordChangeSuccess: "Passwort erfolgreich geändert!",
    passwordMismatch: "Passwörter stimmen nicht überein",
    passwordTooShort: "Passwort muss mindestens 6 Zeichen lang sein",
    wrongOldPassword: "Aktuelles Passwort ist falsch",
    samePassword: "Neues Passwort darf nicht mit dem alten übereinstimmen",
    notLoggedIn: "Bitte melde dich zuerst an",
    redirecting: "Du wirst in 3 Sekunden weitergeleitet...",

    // --- Archiving & Actions ---
    close: "Schließen",
    save: "Speichern",
    saving: "Speichert...",
    gradeSaved: "Gespeichert",
    gradeError: "Fehler beim Speichern",
    gradeRange: "Ungültige Bewertung (0-100)",
    linkLbl: "Aufgaben-Link (URL)",
    linkPh: "https://...",
    archive: "Archivieren",
    restore: "Zurückholen",
    activeTab: "Aktiv",
    archiveTab: "Archiv",
    archiveError: "Fehler beim Archivieren",
    deleteLbl: "Löschen",
    deleteConfirm: "Aufgabe wirklich löschen? Alle Abgaben werden ebenfalls gelöscht.",
    deleteError: "Fehler beim Löschen",
        
    // --- Help page ---
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

    // --- Help Content ---
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

    // --- Password Hint ---
    passwordHint:
      "Hinweis: Anfangspasswort für neue Benutzer ist \"vorname nachname\" in Kleinbuchstaben. Beispiel: Max Mustermann → Passwort: \"maxmustermann\"",
    
      // --- File Upload Help ---
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
    // --- Auth & Generic ---
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
    logout: "Logout",
    fetchError: "Error loading data",
    loading: "Loading...",
    success: "✅ Import successful!",
    uploadError: "❌ Upload failed",

    // --- Admin & Registration ---
    adminTitle: "Admin Registration",
    adminSubtitle: "Please create the first administrator account",
    register: "Register",
    regDisabled: "Admin registration is disabled because an admin already exists.",
    registerSuccess: "Registration successful!",
    registerFail: "Registration failed",
    goToLogin: "Go to login",
    loginTitle: "Login",

    // --- Teacher Panel & Assignment Creation ---
    teacherPanel: "Teacher Panel",
    classLbl: "Class",
    subjectLbl: "Subject",
    titleLbl: "Title",
    textLbl: "Description",
    filesLbl: "Files",
    dueLbl: "Due date",
    duePresetPlaceholder: "Quick select",
    duePresetDay: "+ 1 day",
    duePresetWeek: "+ 1 week",
    duePresetMonth: "+ 1 month",
    selectPlaceholder: "-- select --",
    titlePh: "Enter assignment title",
    textPh: "Description or instructions...",
    saveAssgn: "Save assignment",
    assgnSaved: "Assignment saved",
    assgnError: "Error while saving",
    assignmentBtn: "Assignments list",
    abgabenBtn: "Submissions list",
    submissionsTitle: "Submissions",
    noSubmissions: "No submissions yet",

    // --- Drag & Drop / Files ---
    dndTitle: "Drag & drop files here",
    dndSubtitle: "or click to choose",
    dndHint: "Press Enter to choose",
    chooseFile: "Choose file",
    remove: "Remove",
    dragHere: "Drag or click to upload a file",
    uploadButton: "Upload data",
    noFile: "Please select a file",

    // --- User Import ---
    userImport: "User Import",
    uploadHint: "Drag an Excel file here or click to select it.",
    previewTitle: "Preview (first 5 rows)",
    firstName: "First name",
    lastName: "Last name",
    gradeLevel: "Grade",
    subjectAbbrev: "Subject code",

    // --- Student Panel ---
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
    active: "Active",
    overdue: "Overdue",
    pendingGrade: "Pending grading",
    submittedText: "My text",
    submittedFiles: "My files",
    viewDetails: "View Details",
    hideDetails: "Hide details",
    submitWork: "Submit Work",
    submissionClosed: "Submission closed (deadline passed)",
    submitSuccess: "Submission saved",
    submitError: "Failed to save submission",

    // --- Password Change (New) ---
    changePassword: "Change Password",
    changePasswordTitle: "Change Password",
    changePasswordSubtitle: "Enter your current and new password",
    oldPassword: "Current Password",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
    cancel: "Cancel",
    passwordChangeSuccess: "Password successfully changed!",
    passwordMismatch: "Passwords do not match",
    passwordTooShort: "Password must be at least 6 characters long",
    wrongOldPassword: "Current password is incorrect",
    samePassword: "New password must be different from the old one",
    notLoggedIn: "Please log in first",
    redirecting: "Redirecting in 3 seconds...",

    // --- Archiving & Actions ---
    close: "Close",
    save: "Save",
    saving: "Saving...",
    gradeSaved: "Saved",
    gradeError: "Save failed",
    gradeRange: "Invalid grade (0-100)",
    linkLbl: "Assignment link (URL)",
    linkPh: "https://...",
    archive: "Archive",
    restore: "Restore",
    activeTab: "Active",
    archiveTab: "Archive",
    archiveError: "Archive failed",
    deleteLbl: "Delete",
    deleteConfirm: "Delete this assignment? All submissions will be deleted too.",
    deleteError: "Delete failed",

    // --- Help page ---
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

    // --- Help Content ---
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

    // --- Password Hint ---
    passwordHint:
      "Note: The initial password for new users is \"firstname lastname\" in lowercase. Example: Max Mustermann → password: \"maxmustermann\"",
    
    // --- File Upload Help ---
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