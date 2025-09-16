import React from "react";
import ProjectPicker from "./ProjectPicker"; // בוחר פרויקט עם חיפוש

/**
 * AppHeader – כותרת עליונה + ניווט שלבים + פעולות
 *
 * props:
 *  - proc: שם התהליך (מחרוזת)
 *  - step: מספר שלב נוכחי (1|2|3)
 *  - onGotoStep(n)
 *  - loading: האם יש פעולה רצה
 *
 *  - a4Preview, onToggleA4(bool)
 *  - rtl, onToggleRTL(bool)
 *
 *  - currentProject: אובייקט פרויקט נוכחי (או null)
 *  - projects: רשימת פרויקטים לתיבה נפתחת
 *  - onLoadProject(id)  – בעת בחירה מרשימה
 *  - onCreateProject()  – כפתור "פרויקט חדש"
 *  - onEditProject()    – כפתור "עריכת פרויקט"
 *
 *  - downloadWord()
 *  - downloadSwagger()
 *  - downloadCode()
 *  - generateSwagger()  // היסטורי: בזרימה החדשה לא בשימוש מהכותרת (הבנייה נעשית אוטומטית)
 *  - generateCode()
 *  - lang, onChangeLang(value)
 *  - swaggerText (טקסט קיים לצורך Disable של יצירת קוד)
 *
 *  - readySteps: {1:boolean, 2:boolean, 3:boolean} – אילו שלבים מוכנים לניווט (בזמן בנייה מוצג לודר קטן)
 *  - building: האם מתבצעת בנייה/הכנה של השלבים (אופציונלי, להצגת סטטוס)
 */
export default function AppHeader({
  proc,
  step,
  onGotoStep,
  loading,

  a4Preview,
  onToggleA4,
  rtl,
  onToggleRTL,

  currentProject,
  projects,
  onLoadProject,
  onCreateProject,
  onEditProject,

  downloadWord,
  downloadSwagger,
  downloadCode,
  generateSwagger, // נשמר לשם תאימות לאחור; לא מופעל מכאן בזרימה החדשה
  generateCode,
  lang,
  onChangeLang,
  swaggerText,

  // חדשים/אופציונליים:
  readySteps = { 1: true, 2: true, 3: true },
  building,
}) {
  // כפתור שלב עם נעילה עד שהשלב מוכן
  const StepBtn = ({ n, children }) => {
    const active = step === n;
    const ready = !!readySteps[n];
    const disabled = !ready;

    return (
      <div
        className={`step ${active ? "active" : ""} ${disabled ? "disabled" : ""}`}
        title={disabled ? "השלב עדיין נבנה…" : ""}
        onClick={() => !disabled && onGotoStep?.(n)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        {children}
        {!ready && <span aria-hidden style={{ fontSize: 12 }}>⏳</span>}
      </div>
    );
  };

  return (
    <div className="header">
      <div className="container">
        {/* שורה עליונה */}
        <div className="toprow">
          <div className="process-pill">{proc}</div>

          {currentProject && (
            <div className="process-pill" title="הפרויקט הפעיל">
              פרויקט: <b style={{ marginInlineStart: 6 }}>{currentProject.name}</b>
            </div>
          )}

          {/* בחירת פרויקט – עם חיפוש (ProjectPicker) */}
          <ProjectPicker
            projects={projects || []}
            onSelect={(id) => id && onLoadProject?.(id)}
            buttonStyle={{ marginInlineStart: 12 }}
          />

          {/* יצירה/עריכה */}
          <button className="btn btn-primary" style={{ marginInlineStart: 8 }} onClick={onCreateProject}>
            פרויקט חדש
          </button>

          {currentProject && (
            <button className="btn" style={{ marginInlineStart: 8 }} onClick={onEditProject}>
              עריכת פרויקט
            </button>
          )}

          {/* טוגל A4/RTL */}
          <div style={{ marginInlineStart: "auto", display: "flex", gap: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)" }}>
              <input type="checkbox" checked={a4Preview} onChange={(e) => onToggleA4?.(e.target.checked)} />
              תצוגת A4 (סימולציה)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)" }}>
              <input type="checkbox" checked={rtl} onChange={(e) => onToggleRTL?.(e.target.checked)} />
              RTL ברירת-מחדל
            </label>
          </div>
        </div>

        {/* שלבים – ניווט חופשי כשהשלב מוכן */}
        <div className="steps">
          <StepBtn n={1}>שלב 1: אפיון</StepBtn>
          <StepBtn n={2}>שלב 2: Swagger</StepBtn>
          <StepBtn n={3}>שלב 3: קוד</StepBtn>
        </div>

        {/* פעולות */}
        <div className="actions">
          <div className="right">
            {step === 1 && (
              <button className="btn" onClick={downloadWord} disabled={!!loading || !readySteps[1]}>
                {loading ? "יוצר…" : "הורד Word"}
              </button>
            )}
            {step === 2 && (
              <button className="btn" onClick={downloadSwagger} disabled={!readySteps[2]}>
                הורד Swagger
              </button>
            )}
            {step === 3 && (
              <button className="btn" onClick={downloadCode} disabled={!readySteps[3]}>
                הורד קוד
              </button>
            )}
          </div>

          <div className="left">
            {/* בזרימה החדשה אין יותר "עבור לשלב הבא (צור Swagger)" מהכותרת */}
            {/* יצירת קוד עברה לשלב 3, כולל בחירת שפה */}

            {step === 3 && (
              <>
                <select
                  value={lang}
                  onChange={(e) => onChangeLang?.(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    background: "#fff",
                    marginInlineEnd: "8px",
                  }}
                  disabled={!readySteps[3]}
                >
                  {/* לפי הבקשה: בחירה בין Node.js ל-.NET */}
                  <option value="node-express">Node.js</option>
                  <option value="dotnet-webapi">.NET</option>
                </select>

                <button
                  className="btn btn-primary"
                  onClick={generateCode}
                  disabled={!!loading || !String(swaggerText || "").trim() || !readySteps[3]}
                >
                  {loading ? "יוצר קוד…" : "צור קוד מה-Swagger"}
                </button>
              </>
            )}

           
          </div>
        </div>
      </div>
    </div>
  );
}
