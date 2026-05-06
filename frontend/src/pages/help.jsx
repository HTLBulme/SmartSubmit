import { useLang } from "../context/LanguageContext";
import T from "../i18n"; 
import { useNavigate } from 'react-router-dom';
import overviewVideo from "../assets/Overview_Instruction.mp4";
import HomepagePhoto from "../assets/Homepage.png";



export default function Help() {
  const [lang] = useLang();
  const t = T[lang] || T.en;
  const navigate = useNavigate();

  return (
    <div className="container mt-5">
      <div className="row">
        <div className="col-lg-10 mx-auto">
          
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>{t.helpTitle || "Hilfe & Anleitung"}</h1>
            <button 
              className="btn btn-secondary" 
              onClick={() => navigate(-1)}
            >
              {t.back || "Zurück"}
            </button>
          </div>

          {/* Quick Start Guide */}
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h3>{t.quickStart || "Schnellstart"}</h3>
            </div>
            <div className="card-body">
              <h4>{t.forAdmins || "Für Administratoren"}</h4>
              <ol>
                {t.adminSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                ))}
              </ol>

              <h4 className="mt-4">{t.forTeachers || "Für Lehrer"}</h4>
              <ol>
                {t.teacherSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                ))}
              </ol>

              <h4 className="mt-4">{t.forStudents || "Für Schüler"}</h4>
              <ol>
                {t.studentSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                ))}
              </ol>

            </div>
          </div>

          {/* Excel Import Guide */}
          <div className="card mb-4">
            <div className="card-header bg-success text-white">
              <h3>{t.excelImport || "Excel-Import"}</h3>
            </div>
            <div className="card-body">
              <h4>{t.studentImport || "Schüler importieren"}</h4>
              <p>{t.columndHint || "Excel file must contain the following columns:"}</p>
              <ul>               
                {t.excelStudentColumns.map((col, index) => (
                    <li key={index}>{col}</li>
                ))}                              
              </ul>
              
              <h4 className="mt-3">{t.teacherImport || "Lehrer importieren"}</h4>
              <p>{t.columndHint || "Excel file must contain the following columns:"}</p>
              <ul>
                {t.excelTeacherColumns.map((col, index) => (
                    <li key={index}>{col}</li>
                ))}
              </ul>

              <div className="alert alert-info mt-3">
               {t.passwordHint || "Note: The password for all imported users will be set to 'password123' by default. Please instruct them to change it after their first login."}
              </div>
            </div>
          </div>

          {/* File Upload Guide */}
          <div className="card mb-4">
            <div className="card-header bg-info text-white">
              <h3>{t.fileUpload || "Datei-Upload"}</h3>
            </div>
            <div className="card-body">
              <h4>{t.supportedFormats || "Supported file formats:"}</h4>
                <ul>
                    {t.fileFormats.map((format, index) => (
                        <li key={index}>{format}</li>
                    ))}
                </ul>
              <h4 className="mt-3">{t.maxFileSize[0] || "Maximum file size:"}</h4>
                <p>{t.maxFileSize[1] || "5 MB per file"}</p>
              <h4>{t.multiUpload[0] || "Upload multiple files:"}</h4>
                <p>{t.multiUpload[1] || "You can upload multiple files at once by selecting them together or adding them individually."}</p>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-header bg-dark text-white">
              <h3>{t.videoTutorial || "Video Tutorial"}</h3>
            </div>
            <div className="card-body">
              <div className="ratio ratio-16x9">
                <video controls poster={HomepagePhoto}>
                  <source src={overviewVideo} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="card mb-4">
            <div className="card-header bg-warning">
              <h3>{t.faq || "Häufig gestellte Fragen (FAQ)"}</h3>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <h4>{t.faqPassword[0] || "How do I change my password?"}</h4>
                <p>{t.faqPassword[1] || "Click on your name in the top right corner and select \"Change password\"."}</p>
              </div>

              <div className="mb-3">
                <h4>{t.faqLate[0] || "What happens if I miss the deadline?"}</h4>
                <p>{t.faqLate[1] || "You can still submit the assignment, but it will be marked as late."}</p>
              </div>

              <div className="mb-3">
                <h4>{t.faqEdit[0] || "Can I edit a submission after it's been made?"}</h4>
                <p>{t.faqEdit[1] || "No, once a submission is made, it cannot be edited. Contact your teacher if you need to make changes."}</p>
              </div>

              <div className="mb-3">
                <h4>{t.faqMultiClass[0] || "Can I assign an assignment to multiple classes?"}</h4>
                <p>{t.faqMultiClass[1] || "As a teacher, you can select the class in the dropdown menu before creating an assignment."}</p>
              </div>

              <div className="mb-3">
                <h4>{t.faqStatus[0] || "What do the different statuses mean?"}</h4>
                <p>
                 {t.faqStatus[1] || "Active: Assignment is still open for submissions. Expired: Deadline has passed. Submitted: You already submitted."}
                </p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="card mb-4">
            <div className="card-header bg-secondary text-white">
              <h3>{t.contact || "Contact & Support"}</h3>
            </div>
            <div className="card-body">
              <p>{t.contactText[0] || "For further questions, please contact:"}</p>
              <ul>
                <li>{t.contactText[1] || "E-Mail: support@smartsubmit.com"}</li>
                <li>{t.contactText[2] || "Institution: HTL Bulme"}</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}