import React, { useEffect, useMemo, useState } from "react";
import RichTextEditor from "./RichTextEditor";
import RequestEditor from "./RequestEditor";

/**
 * ProjectModal – יצירה/עריכת פרויקט מלא.
 */
export default function ProjectModal({ open, mode = "create", initial, rtl = true, onClose, onSave }) {
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [jiraTicket, setJiraTicket] = useState("");          // ← חדש
  const [introText, setIntroText] = useState("");
  const [requests, setRequests] = useState([]);
  const [extra, setExtra] = useState({ vitality: false, ping: false });

  useEffect(() => {
    if (!open) return;
    if (isEdit && initial) {
      setName(initial.name || "");
      setManagerEmail(initial.managerEmail || "");
      setJiraTicket(initial.jiraTicket || "");               // ← חדש
      setIntroText(initial.introText || "");
      setRequests(Array.isArray(initial.requests) ? [...initial.requests] : []);
      setExtra({ vitality: !!initial?.extra?.vitality, ping: !!initial?.extra?.ping });
    } else {
      setName("");
      setManagerEmail("");
      setJiraTicket("");                                     // ← חדש
      setIntroText("");
      setRequests([{
        id: cryptoRandomId(), url: "", method: "GET", stdHeaders: [],
        headers: "", request: "", response: "", summary: "", description: "", operationId: "",
      }]);
      setExtra({ vitality: false, ping: false });
    }
  }, [open, isEdit, initial]);

  const validEmail = useMemo(() => /^\S+@\S+\.\S+$/.test(managerEmail), [managerEmail]);
  const canSave = name.trim().length > 0 && validEmail;

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
  function deleteRequest(idx) { setRequests((prev) => prev.filter((_, i) => i !== idx)); }
  function addRequest() {
    setRequests((prev) => [...prev, {
      id: cryptoRandomId(), url: "", method: "GET", stdHeaders: [],
      headers: "", request: "", response: "", summary: "", description: "", operationId: "",
    }]);
  }

  async function handleSave() {
    if (!canSave) return;
    const payload = {
      name: name.trim(),
      managerEmail: managerEmail.trim(),
      jiraTicket: (jiraTicket || "").trim(),                 // ← נשלח לשרת
      introText: introText || "",
      requests,
      extra: { ...extra },
    };
    await onSave?.(payload);
  }

  if (!open) return null;

  return (
    <div style={backdropStyle} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div style={{ ...modalStyle, direction: rtl ? "rtl" : "ltr", textAlign: rtl ? "right" : "left" }}>
        <div style={headerStyle}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{isEdit ? "עריכת פרויקט" : "פרויקט חדש"}</div>
          <button className="btn" onClick={onClose}>סגור</button>
        </div>

        {/* שם + מייל + Jira */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={labelStyle}>שם הפרויקט</div>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="MyService" />
          </div>
          <div>
            <div style={labelStyle}>מייל מנהל הפרויקט</div>
            <input
              style={{ ...inputStyle, borderColor: managerEmail && !validEmail ? "#ff6b6b" : "var(--border)" }}
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              placeholder="name@company.com"
            />
            {!validEmail && managerEmail ? (
              <div style={{ color: "#ff6b6b", fontSize: 12, marginTop: 4 }}>מייל לא תקין</div>
            ) : null}
          </div>
          <div>
            <div style={labelStyle}>Jira Ticket</div>
            <input style={inputStyle} value={jiraTicket} onChange={(e) => setJiraTicket(e.target.value)} placeholder="APIA-1234" />
          </div>
        </div>

        {/* טקסט מבוא למסמך */}
        <details open={false} style={{ marginBottom: 12 }}>
          <summary style={{ cursor: "pointer", color: "var(--muted)", marginBottom: 8 }}>טקסט מבוא למסמך (אופציונלי)</summary>
          <RichTextEditor value={introText} onChange={setIntroText} rtl={rtl} height={320} />
        </details>

        {/* רשימת בקשות */}
        <div style={{ fontSize: 14, fontWeight: 600, margin: "6px 0" }}>בקשות API</div>
        {requests.map((r, idx) => (
          <RequestEditor
            key={r.id || idx}
            r={r}
            idx={idx}
            rtl={rtl}
            onChange={(patch) => updateRequest(idx, patch)}
            onClone={() => cloneRequest(idx)}
            onDelete={() => deleteRequest(idx)}
          />
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0 12px" }}>
          <button className="btn" onClick={addRequest}>הוסף בקשה</button>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={!!extra?.ping} onChange={(e) => setExtra((x) => ({ ...x, ping: e.target.checked }))} />
              ping
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={!!extra?.vitality} onChange={(e) => setExtra((x) => ({ ...x, vitality: e.target.checked }))} />
              vitality
            </label>
          </div>
        </div>

        {/* כפתורי פעולה */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <button className="btn" onClick={onClose}>ביטול</button>
          <button className="btn primary" disabled={!canSave} onClick={handleSave}>{isEdit ? "עדכן" : "צור"}</button>
        </div>
      </div>
    </div>
  );
}

/* === styles === */
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(20,22,38,0.42)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const modalStyle = { width: "min(1020px, 96vw)", maxHeight: "90vh", overflow: "auto", background: "#fff", borderRadius: 16, border: "1px solid var(--border)", padding: 16, boxShadow: "0 20px 70px rgba(0,0,0,0.25)" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 };
const labelStyle = { fontSize: 13, color: "var(--muted)", marginBottom: 4 };
const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 12, background: "#fff" };

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2, 10);
}
