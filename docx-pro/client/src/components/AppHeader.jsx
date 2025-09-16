import React from "react";

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
 *  - generateSwagger()
 *  - generateCode()
 *  - lang, onChangeLang(value)
 *  - swaggerText (טקסט קיים לצורך Disable של יצירת קוד)
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
  generateSwagger,
  generateCode,
  lang,
  onChangeLang,
  swaggerText,
}) {
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

          {/* בחירת פרויקט */}
          <select
            onChange={(e) => e.target.value && onLoadProject?.(e.target.value)}
            defaultValue=""
            style={{
              marginInlineStart: "12px",
              padding: "10px 12px",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              background: "#fff",
              color: "var(--text)",
            }}
          >
            <option value="" disabled>
              פתח פרויקט…
            </option>
            {(projects || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {new Date(p.updatedAt).toLocaleDateString()}
              </option>
            ))}
          </select>

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

        {/* שלבים */}
        <div className="steps">
          <div className={`step ${step === 1 ? "active" : ""}`} onClick={() => onGotoStep?.(1)}>
            שלב 1: אפיון
          </div>
          <div className={`step ${step === 2 ? "active" : ""}`} onClick={() => onGotoStep?.(2)}>
            שלב 2: Swagger
          </div>
          <div className={`step ${step === 3 ? "active" : ""}`} onClick={() => onGotoStep?.(3)}>
            שלב 3: קוד
          </div>
        </div>

        {/* פעולות */}
        <div className="actions">
          <div className="right">
            {step === 1 && (
              <button className="btn" onClick={downloadWord} disabled={!!loading}>
                {loading ? "יוצר…" : "הורד Word"}
              </button>
            )}
            {step === 2 && <button className="btn" onClick={downloadSwagger}>הורד Swagger</button>}
            {step === 3 && <button className="btn" onClick={downloadCode}>הורד קוד</button>}
          </div>

          <div className="left">
            {step === 1 && (
              <button className="btn btn-primary" onClick={generateSwagger} disabled={!!loading}>
                {loading ? "יוצר Swagger…" : "עבור לשלב הבא (צור Swagger)"}
              </button>
            )}

            {step === 2 && (
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
                >
                  <option value="node-express">Node + Express</option>
                  <option value="python-fastapi">Python + FastAPI</option>
                  <option value="java-spring">Java + Spring</option>
                  <option value="csharp-aspnet">C# + ASP.NET</option>
                  <option value="go-chi">Go + Chi</option>
                  <option value="php-laravel">PHP + Laravel</option>
                </select>

                <button
                  className="btn btn-primary"
                  onClick={generateCode}
                  disabled={!!loading || !String(swaggerText || "").trim()}
                >
                  {loading ? "יוצר קוד…" : "עבור לשלב הבא (צור קוד)"}
                </button>
              </>
            )}

            {step === 3 && <button className="btn" onClick={() => onGotoStep?.(1)}>חזרה לשלב 1</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
