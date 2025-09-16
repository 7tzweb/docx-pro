import React, { useEffect, useMemo, useState } from "react";
import RequestEditor from "./RequestEditor";
import { Editor } from "@tinymce/tinymce-react";

/* TinyMCE resources */
import "tinymce/tinymce";
import "tinymce/icons/default";
import "tinymce/themes/silver";
import "tinymce/models/dom";
import "tinymce/plugins/advlist";
import "tinymce/plugins/autolink";
import "tinymce/plugins/code";
import "tinymce/plugins/directionality";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/table";
import "tinymce/plugins/wordcount";
import "tinymce/plugins/image";
import "tinymce/plugins/visualblocks";
import "tinymce/plugins/visualchars";
import "tinymce/skins/ui/oxide/skin.min.css";
import "tinymce/skins/ui/oxide/content.min.css";
import "tinymce/skins/content/default/content.min.css";

export default function ProjectModal({ open, mode, initial, rtl, onClose, onSave }) {
  const [name, setName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [swaggerDescription, setSwaggerDescription] = useState(""); // NEW
  const [intro, setIntro] = useState("");
  const [requests, setRequests] = useState([]);
  const [vitality, setVitality] = useState(false);
  const [ping, setPing] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setName(initial.name || "");
      setManagerEmail(initial.managerEmail || "");
      setSwaggerDescription(initial.swaggerDescription || ""); // NEW
      setIntro(initial.introText || "");
      setRequests(
        (initial.requests || []).map((r) => ({
          id: r.id || randId(),
          url: r.url || "",
          method: r.method || "GET",
          headers: r.headers || "",
          request: r.request || "",
          response: r.response || "",
          stdHeaders: Array.isArray(r.stdHeaders) ? r.stdHeaders : [],
        }))
      );
      setVitality(!!initial?.extra?.vitality);
      setPing(!!initial?.extra?.ping);
      setEmailError("");
    } else {
      setName("");
      setManagerEmail("");
      setSwaggerDescription(""); // NEW
      setIntro("");
      setRequests([]);
      setVitality(false);
      setPing(false);
      setEmailError("");
    }
  }, [open, mode, initial]);

  const tinymceInit = useMemo(
    () => ({
      license_key: "gpl",
      promotion: false,
      menubar: false,
      branding: false,
      rtl_ui: true,
      directionality: rtl ? "rtl" : "ltr",
      height: 360,
      toolbar_mode: "wrap",
      toolbar_sticky: true,
      skin: false,
      content_css: false,
      entity_encoding: "raw",
      convert_urls: false,
      forced_root_block: "p",
      plugins: [
        "advlist",
        "autolink",
        "lists",
        "link",
        "table",
        "code",
        "directionality",
        "wordcount",
        "image",
        "visualblocks",
        "visualchars",
      ],
      toolbar:
        "undo redo | blocks | bold italic underline strikethrough | " +
        "forecolor backcolor | alignleft aligncenter alignright alignjustify | " +
        "bullist numlist outdent indent | table | ltr rtl | link image | visualblocks code",
      block_formats: "כותרת 1=h1; כותרת 2=h2; כותרת 3=h3; פסקה=p",
      content_style: `
        body { font-family: Inter, system-ui, -apple-system, "Segoe UI", Arial, Helvetica, sans-serif;
               font-size: 16px; line-height: 1.85;
               direction: ${rtl ? "rtl" : "ltr"}; text-align: ${rtl ? "right" : "left"}; }
        table { border-collapse: collapse; width: 100%; }
        table, th, td { border: 1px solid #e6e8ee; }
        th, td { padding: 8px; }
      `,
    }),
    [rtl]
  );

  const addRequest = () =>
    setRequests((prev) => [
      ...prev,
      { id: randId(), url: "", method: "GET", headers: "", request: "", response: "", stdHeaders: [] },
    ]);

  const updateRequest = (rid, patch) => setRequests((prev) => prev.map((r) => (r.id === rid ? { ...r, ...patch } : r)));
  const cloneRequest = (rid) =>
    setRequests((prev) => {
      const r = prev.find((x) => x.id === rid);
      if (!r) return prev;
      return [...prev, { ...r, id: randId() }];
    });
  const deleteRequest = (rid) => setRequests((prev) => prev.filter((r) => r.id !== rid));

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // בסיסי, טוב לרוב המקרים
    return re.test(String(email).toLowerCase());
  };

  const handleSave = () => {
    if (!name.trim()) return alert("שם פרויקט חובה");
    if (!managerEmail.trim() || !validateEmail(managerEmail)) {
      setEmailError("כתובת אימייל לא תקינה");
      return;
    }
    if (!swaggerDescription.trim()) {
      alert("יש למלא תיאור ל-Swagger (info.description)");
      return;
    }
    setEmailError("");

    onSave({
      name: name.trim(),
      managerEmail: managerEmail.trim(),
      swaggerDescription: swaggerDescription.trim(), // NEW
      introText: intro,
      requests,
      extra: { vitality, ping },
    });
  };

  if (!open) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>{mode === "edit" ? "עריכת פרויקט" : "פרויקט חדש"}</h2>
          <button className="btn" onClick={onClose}>סגור</button>
        </div>

        {/* שתי עמודות: שם הפרויקט + מייל מנהל */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={styles.label}>שם הפרויקט</label>
            <input
              style={styles.input}
              type="text"
              placeholder="לדוגמה: שליפת תשובות"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label style={styles.label}>מייל מנהל הפרויקט</label>
            <input
              style={{ ...styles.input, borderColor: emailError ? "#dc2626" : "var(--border)", outlineColor: emailError ? "#dc2626" : undefined }}
              type="email"
              placeholder="name@company.com"
              value={managerEmail}
              onChange={(e) => { setManagerEmail(e.target.value); if (emailError) setEmailError(""); }}
            />
            {!!emailError && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{emailError}</div>}
          </div>
        </div>

        {/* תיאור ל-Swagger (חובה) */}
        <div style={{ marginTop: 12 }}>
          <label style={styles.label}>תיאור ל-Swagger (info.description)</label>
          <textarea
            style={{ ...styles.input, minHeight: 84, resize: "vertical" }}
            value={swaggerDescription}
            onChange={(e)=>setSwaggerDescription(e.target.value)}
            placeholder="תיאור קצר שיופיע בסעיף info.description של ה-Swagger"
          />
        </div>

        {/* פתיח (details) ברירת מחדל סגור */}
        <details style={{ margin: "14px 0" }}>
          <summary style={{ cursor: "pointer", color: "var(--muted)" }}>טקסט מבוא למסמך (אופציונלי)</summary>
          <div style={{ marginTop: 10 }}>
            <Editor value={intro} onEditorChange={setIntro} init={tinymceInit} />
          </div>
        </details>

        <div style={{ marginTop: 10, marginBottom: 8, fontWeight: 600 }}>בקשות API</div>
        {requests.map((r, idx) => (
          <RequestEditor
            key={r.id}
            r={r}
            idx={idx}
            rtl={rtl}
            onChange={(patch) => updateRequest(r.id, patch)}
            onClone={() => cloneRequest(r.id)}
            onDelete={() => deleteRequest(r.id)}
          />
        ))}

        <button className="btn" onClick={addRequest}>הוסף בקשה</button>

        <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={vitality} onChange={(e) => setVitality(e.target.checked)} />
            vitality
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={ping} onChange={(e) => setPing(e.target.checked)} />
            ping
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "end", marginTop: 16 }}>
          <button className="btn" onClick={onClose}>ביטול</button>
          <button className="btn btn-primary" onClick={handleSave}>{mode === "edit" ? "עדכן" : "שמירה"}</button>
        </div>
      </div>
    </div>
  );
}

function randId() { return Math.random().toString(36).slice(2, 10); }

const styles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(2,6,23,.55)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" },
  modal:   { width: "min(1100px, 98vw)", maxHeight: "90vh", overflow: "auto", background: "#fff", border: "1px solid var(--border)", borderRadius: "18px", boxShadow: "0 30px 80px rgba(2,6,23,.18)", padding: "16px 16px 22px" },
  label:   { fontWeight: 600, marginBottom: 6, display: "block" },
  input:   { width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "12px", background: "#fff" },
};
