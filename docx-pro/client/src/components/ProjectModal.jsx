import React, { useEffect, useMemo, useState } from "react";
import RichTextEditor from "./RichTextEditor";
import RequestEditor from "./RequestEditor";
import SchemaBuilder from "./SchemaBuilder";
import YAML from "yaml";

/**
 * ProjectModal – יצירה/עריכת פרויקט מלא.
 */
export default function ProjectModal({ open, mode = "create", initial, rtl = true, onClose, onSave }) {
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [jiraTicket, setJiraTicket] = useState("");
  const [introText, setIntroText] = useState("");
  const [requests, setRequests] = useState([]);
  const [extra, setExtra] = useState({ vitality: false, ping: false });

  // Schema text + params
  const [schemaText, setSchemaText] = useState("");
  const [schemaView] = useState("yaml");
  const [schemasCount, setSchemasCount] = useState(0);
  const [schemaError, setSchemaError] = useState("");
  const [schemaParams, setSchemaParams] = useState([]); // ← שמות כל הסכמות לבחירה

  useEffect(() => {
    if (!open) return;
    if (isEdit && initial) {
      setName(initial.name || "");
      setManagerEmail(initial.managerEmail || "");
      setJiraTicket(initial.jiraTicket || "");
      setIntroText(initial.introText || "");
      const reqs = (Array.isArray(initial.requests) ? initial.requests : []).filter(Boolean);
      setRequests(reqs);
      setExtra({ vitality: !!initial?.extra?.vitality, ping: !!initial?.extra?.ping });

      if (typeof initial?.schema === "string" && initial.schema.trim()) {
        setSchemaText(initial.schema);
        computeParams(initial.schema);
      } else if (initial?.schemas && typeof initial.schemas === "object") {
        try {
          const t = YAML.stringify(initial.schemas, { indent: 2 });
          setSchemaText(t);
          setSchemaParams(Object.keys(initial.schemas || {}));
        } catch {
          setSchemaText("");
          setSchemaParams([]);
        }
      } else {
        setSchemaText("");
        setSchemaParams([]);
      }
      setSchemaError("");
      setSchemasCount(countSchemasSafe(initial?.schemas));
    } else {
      setName("");
      setManagerEmail("");
      setJiraTicket("");
      setIntroText("");
      setRequests([defaultRequest()]);
      setExtra({ vitality: false, ping: false });
      setSchemaText("");
      setSchemaError("");
      setSchemasCount(0);
      setSchemaParams([]);
    }
  }, [open, isEdit, initial]);

  const validEmail = useMemo(() => /^\S+@\S+\.\S+$/.test(managerEmail), [managerEmail]);
  const canSave = name.trim().length > 0 && validEmail && !schemaError;

  function updateRequest(idx, patch) {
    setRequests((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }
  function cloneRequest(idx) {
    setRequests((prev) => {
      const c = prev[idx] || {};
      const copy = { ...c, id: cryptoRandomId() };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }
  function deleteRequest(idx) {
    setRequests((prev) => prev.filter((_, i) => i !== idx));
  }
  function addRequest() {
    setRequests((prev) => [...prev, defaultRequest()]);
  }

  // מחשב שמות סכמות מתוך טקסט
  function computeParams(text) {
    try {
      const raw = String(text || "").trim();
      if (!raw) { setSchemaParams([]); return; }
      let obj;
      if (raw.startsWith("{") || raw.startsWith("[")) {
        obj = JSON.parse(raw);
      } else {
        obj = YAML.parse(raw);
      }
      if (obj && typeof obj === "object" && obj.schemas && typeof obj.schemas === "object") {
        obj = obj.schemas;
      }
      const keys = obj && typeof obj === "object" ? Object.keys(obj) : [];
      setSchemaParams(keys);
      setSchemasCount(keys.length);
      setSchemaError("");
    } catch (e) {
      setSchemaParams([]);
      setSchemaError(String(e?.message || e));
    }
  }

  // ===== Save =====
  async function handleSave() {
    if (!canSave) return;
    const payload = {
      name: name.trim(),
      managerEmail: managerEmail.trim(),
      jiraTicket: jiraTicket.trim(),
      introText: introText || "",
      requests,
      extra: { ...extra },
      schema: schemaText || "", // השרת יפיק components.schemas על בסיס זה
    };
    await onSave?.(payload);
  }

  if (!open) return null;

  return (
    <div style={backdropStyle} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div style={{ ...modalStyle, direction: rtl ? "rtl" : "ltr", textAlign: rtl ? "right" : "left" }}>
        <div style={headerStyle}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>
            {isEdit ? "עריכת פרויקט" : "פרויקט חדש"}
          </div>
          <button className="btn" onClick={onClose}>סגור</button>
        </div>

        {/* פרטי פרויקט */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Labeled label="שם הפרויקט">
            <input style={inputStyle} value={name} onChange={(e)=>setName(e.target.value)} placeholder="MyService" />
          </Labeled>
          <Labeled label="מייל מנהל הפרויקט">
            <input
              style={{ ...inputStyle, borderColor: managerEmail && !validEmail ? "#ff6b6b" : "var(--border)" }}
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              placeholder="name@company.com"
            />
            {!validEmail && managerEmail ? (
              <div style={{ color: "#ff6b6b", fontSize: 12, marginTop: 4 }}>מייל לא תקין</div>
            ) : null}
          </Labeled>
          <Labeled label="Jira Ticket">
            <input style={inputStyle} value={jiraTicket} onChange={(e)=>setJiraTicket(e.target.value)} placeholder="APIA-1234" />
          </Labeled>
        </div>

        {/* מבוא למסמך */}
        <details open={false} style={{ marginBottom: 12 }}>
          <summary style={{ cursor: "pointer", color: "var(--muted)", marginBottom: 8 }}>
            טקסט מבוא למסמך (אופציונלי)
          </summary>
          <RichTextEditor value={introText} onChange={setIntroText} rtl={rtl} height={360} />
        </details>

        {/* רשימת בקשות */}
        <div style={{ fontSize: 14, fontWeight: 600, margin: "6px 0" }}>בקשות API</div>
        {requests.map((req, idx) => (
          <RequestEditor
            key={req?.id || idx}
            r={req || {}}
            idx={idx}
            rtl={rtl}
            schemaParams={schemaParams}
            onChange={(patch) => updateRequest(idx, patch)}
            onClone={() => cloneRequest(idx)}
            onDelete={() => deleteRequest(idx)}
          />
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0 12px" }}>
          <button className="btn" onClick={addRequest}>הוסף בקשה</button>
          <div />
        </div>

        {/* === Schema – Accordion (סגור כברירת-מחדל) === */}
        <details className="schema-accordion" open={false}>
          <summary className="schema-accordion-summary">
            <span className="tag">Schema</span>
            <span className="muted"> יצירת סכמה מלאה</span>
            {schemaError ? (
              <span className="badge error" style={{ marginInlineStart: 8 }}>שגיאה</span>
            ) : (
              <span className="badge ok" style={{ marginInlineStart: 8 }}>{schemasCount} פרמטרים</span>
            )}
          </summary>

          <SchemaBuilder
            initialText={schemaText}
            initialView={schemaView}
            onTextChange={(t) => { setSchemaText(t); computeParams(t); }}
            onStats={({ count, error, params }) => {
              setSchemasCount(count ?? 0);
              setSchemaError(error ? String(error) : "");
              if (Array.isArray(params)) setSchemaParams(params);
            }}
          />
        </details>

        {/* ping + vitality */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, alignItems: "center", marginTop: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={!!extra?.ping} onChange={(e)=>setExtra(x=>({ ...x, ping: e.target.checked }))} />
            ping
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={!!extra?.vitality} onChange={(e)=>setExtra(x=>({ ...x, vitality: e.target.checked }))} />
            vitality
          </label>
        </div>

        {/* פעולות */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={onClose}>ביטול</button>
          <button className="btn primary" disabled={!canSave} onClick={handleSave}>
            {isEdit ? "עדכן" : "צור"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== helpers ===== */
function defaultRequest() {
  return {
    id: cryptoRandomId(),
    url: "",
    method: "GET",
    stdHeaders: [],
    headers: "",
    request: "",
    response: "",
    summary: "",
    description: "",
    operationId: "",
    requestRefs: [],
    responseRefs: [],
  };
}
function countSchemasSafe(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return 0;
  return Object.keys(o).length;
}
function cryptoRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2, 10);
}
function Labeled({ label, children }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

/* ===== styles מקומיים ===== */
const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(20,22,38,0.42)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};
const modalStyle = {
  width: "min(1320px, 98vw)",
  maxHeight: "94vh",
  overflow: "auto",
  background: "#fff",
  borderRadius: 16,
  border: "1px solid var(--border)",
  padding: 20,
  boxShadow: "0 20px 70px rgba(0,0,0,0.25)",
};
const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
};
const labelStyle = { fontSize: 13, color: "var(--muted)", marginBottom: 4 };
const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--border)",
  borderRadius: 12,
  background: "#fff",
};
