import React from "react";
import ProjectPicker from "./ProjectPicker"; // בוחר פרויקט עם חיפוש

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
  generateSwagger, // תאימות לאחור
  generateCode,
  lang,
  onChangeLang,
  swaggerText,

  // חדשים:
  copyWord,
  copySwagger,
  copyCode,

  // אופציונלי:
  readySteps = { 1: true, 2: true, 3: true },
  building,
}) {
  const StepBtn = ({ n, children }) => {
    const active = step === n;
    const ready = !!readySteps[n];
    const disabled = !ready || !!loading;
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
        {/* שורה עליונה - זהה */}
        <div className="toprow">
          <div className="process-pill">{proc}</div>

          {currentProject && (
            <div className="process-pill" title="הפרויקט הפעיל">
              פרויקט: <b style={{ marginInlineStart: 6 }}>{currentProject.name}</b>
            </div>
          )}

          <ProjectPicker
            projects={projects || []}
            onSelect={(id) => id && onLoadProject?.(id)}
            buttonStyle={{ marginInlineStart: 10 }}
          />

          <button className="btn btn-primary" style={{ marginInlineStart: 6 }} onClick={onCreateProject}>
            פרויקט חדש
          </button>

          {currentProject && (
            <button className="btn" style={{ marginInlineStart: 6 }} onClick={onEditProject}>
              עריכת פרויקט
            </button>
          )}

          {/* טוגלים */}
          <div style={{ marginInlineStart: "auto", display: "flex", gap: 12 }}>
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

        {/* שורה שנייה: שלבים + פעולות (באותה שורה) */}
        <div className="steps actions-inline">
          {/* צד ימין: שלבים */}
          <div className="steps-left">
            <StepBtn n={1}>שלב 1: אפיון</StepBtn>
            <StepBtn n={2}>שלב 2: Swagger</StepBtn>
            <StepBtn n={3}>שלב 3: קוד</StepBtn>
          </div>

          {/* צד שמאל: כפתורי פעולה + בורר שפה (באותה השורה) */}
          <div className="steps-right">
            {/* כפתורי הורדה/העתקה לפי שלב */}
            {step === 1 && (
              <>
                <button className="btn" onClick={downloadWord} disabled={!!loading || !readySteps[1]}>
                  {loading ? "יוצר…" : "הורד Word"}
                </button>
                <button className="btn" onClick={copyWord} disabled={!!loading || !readySteps[1]}>
                  העתק Word
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button className="btn" onClick={downloadSwagger} disabled={!!loading || !readySteps[2]}>
                  הורד Swagger
                </button>
                <button className="btn" onClick={copySwagger} disabled={!!loading || !readySteps[2] || !swaggerText}>
                  העתק Swagger
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <button className="btn" onClick={downloadCode} disabled={!!loading || !readySteps[3]}>
                  הורד קוד
                </button>
                <button className="btn" onClick={copyCode} disabled={!!loading || !readySteps[3]}>
                  העתק קוד
                </button>
                <select
                  value={lang}
                  onChange={(e) => onChangeLang?.(e.target.value)}
                  style={{
                    padding: "8px 10px",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    background: "#fff",
                    minWidth: 120,
                  }}
                  disabled={!readySteps[3] || !!loading}
                  title={loading ? "מחליף שפה…" : "בחר שפה"}
                >
                  <option value="node-express">Node.js</option>
                  <option value="dotnet-webapi">.NET</option>
                </select>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
