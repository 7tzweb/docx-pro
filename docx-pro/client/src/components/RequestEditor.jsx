import React, { useEffect, useMemo, useRef, useState } from "react";
import { HEADER_CANDIDATES } from "../constants";

/**
 * עורך של בקשה אחת במודאל הפרויקט.
 * r: {
 *   id, url, method, headers, request, response, stdHeaders?,
 *   summary?, description?, operationId?,
 *   requestRefs?: string[], responseRefs?: string[]
 * }
 */
export default function RequestEditor({
  r = {},
  idx,
  rtl,
  onChange,
  onClone,
  onDelete,
  schemaParams = [],
}) {
  const std = Array.isArray(r?.stdHeaders) ? r.stdHeaders : [];

  const allSelected = HEADER_CANDIDATES.every((k) => std.includes(k));
  const someSelected = std.length > 0 && !allSelected;

  const selectAllRef = useRef(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleStdHeader = (key) => {
    const next = std.includes(key) ? std.filter((k) => k !== key) : [...std, key];
    onChange({ stdHeaders: next });
  };

  const toggleSelectAll = () => {
    onChange({
      stdHeaders: allSelected ? [] : [...HEADER_CANDIDATES],
    });
  };

  /* ----- בחירת רפרנסים לסכמה (רב-בחירה) ----- */
  const [openReqMenu, setOpenReqMenu] = useState(false);
  const [openResMenu, setOpenResMenu] = useState(false);
  const requestRefs = Array.isArray(r?.requestRefs) ? r.requestRefs : [];
  const responseRefs = Array.isArray(r?.responseRefs) ? r.responseRefs : [];

  const hasParams = (schemaParams || []).length > 0;

  const toggleRef = (kind, name) => {
    if (kind === "req") {
      const next = requestRefs.includes(name)
        ? requestRefs.filter((x) => x !== name)
        : [...requestRefs, name];
      onChange({ requestRefs: next });
    } else {
      const next = responseRefs.includes(name)
        ? responseRefs.filter((x) => x !== name)
        : [...responseRefs, name];
      onChange({ responseRefs: next });
    }
  };

  return (
    <div style={styles.card}>
      {/* שורה 1: URL + Method + פעולות */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: 8 }}>
        <div>
          <label style={styles.sublabel}>URL</label>
          <input
            style={styles.input}
            placeholder="/items"
            value={r.url || ""}
            onChange={(e) => onChange({ url: e.target.value })}
          />
        </div>
        <div>
          <label style={styles.sublabel}>Method</label>
          <select
            style={styles.input}
            value={r.method || "GET"}
            onChange={(e) => onChange({ method: e.target.value })}
          >
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>PATCH</option>
            <option>DELETE</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
          <button className="btn" onClick={onClone}>
            שכפל
          </button>
          <button className="btn" onClick={onDelete}>
            מחק
          </button>
        </div>
      </div>

      {/* שורה 2: summary + description + operationId */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 220px", gap: 8, marginTop: 8 }}>
        <div>
          <label style={styles.sublabel}>summary</label>
          <input
            style={styles.input}
            placeholder="תקציר קצר לפעולה (מופיע ב-Swagger)"
            value={r.summary || ""}
            onChange={(e) => onChange({ summary: e.target.value })}
          />
        </div>
        <div>
          <label style={styles.sublabel}>description</label>
          <input
            style={styles.input}
            placeholder="תיאור מפורט יותר לפעולה"
            value={r.description || ""}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>
        <div>
          <label style={styles.sublabel}>operationId</label>
          <input
            style={styles.input}
            placeholder="getItems / createOrder וכו׳"
            value={r.operationId || ""}
            onChange={(e) => onChange({ operationId: e.target.value })}
          />
        </div>
      </div>

      {/* צ׳קבוקסי כותרות סטנדרטיות */}
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
          כותרות נפוצות לבקשה:
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          {/* בחר את כולם */}
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
            <input
              type="checkbox"
              ref={selectAllRef}
              checked={allSelected}
              onChange={toggleSelectAll}
            />
            בחר את כולם
          </label>

          {HEADER_CANDIDATES.map((k) => (
            <label key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={std.includes(k)} onChange={() => toggleStdHeader(k)} />
              {k}
            </label>
          ))}
        </div>
      </div>

      {/* שליש / שליש / שליש */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
        {/* Request Body + קישור לרפרנסים */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={styles.sublabel}>Request Body (טקסט JSON)</label>
            <div style={{ position: "relative" }}>
              <button
                className="btn"
                onClick={() => setOpenReqMenu((v) => !v)}
                title="קישור ל־ref$ מתוך הסכמה"
              >
                {hasParams ? "פרמטרים מסכמה" : "אין פרמטרים בסכמה"}
              </button>
              {openReqMenu && (
                <div style={styles.menu} onMouseLeave={() => setOpenReqMenu(false)}>
                  {hasParams ? (
                    schemaParams.map((name) => (
                      <label key={name} style={styles.menuItem}>
                        <input
                          type="checkbox"
                          checked={requestRefs.includes(name)}
                          onChange={() => toggleRef("req", name)}
                        />
                        <span>{name}</span>
                      </label>
                    ))
                  ) : (
                    <div style={{ padding: 8, color: "var(--muted)" }}>אין פרמטרים בסכמה</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* chips נבחרים */}
          {requestRefs.length > 0 && (
            <div style={styles.chips}>
              {requestRefs.map((n) => (
                <span key={n} style={styles.chip} onClick={() => toggleRef("req", n)}>
                  {n} ✕
                </span>
              ))}
            </div>
          )}

          <textarea
            style={styles.textarea}
            placeholder='{"name":"item"}'
            value={r.request || ""}
            onChange={(e) => onChange({ request: e.target.value })}
          />
        </div>

        {/* Headers (אין רפרנס לסכמה בשלב זה – רק טקסט חופשי) */}
        <div>
          <label style={styles.sublabel}>Headers (טקסט JSON)</label>
          <textarea
            style={styles.textarea}
            placeholder='{"Authorization":"Bearer ..."}'
            value={r.headers || ""}
            onChange={(e) => onChange({ headers: e.target.value })}
          />
        </div>

        {/* Response Example + קישור לרפרנסים */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={styles.sublabel}>Response Example 200 (טקסט JSON)</label>
            <div style={{ position: "relative" }}>
              <button
                className="btn"
                onClick={() => setOpenResMenu((v) => !v)}
                title="קישור ל־ref$ מתוך הסכמה"
              >
                {hasParams ? "פרמטרים מסכמה" : "אין פרמטרים בסכמה"}
              </button>
              {openResMenu && (
                <div style={styles.menu} onMouseLeave={() => setOpenResMenu(false)}>
                  {hasParams ? (
                    schemaParams.map((name) => (
                      <label key={name} style={styles.menuItem}>
                        <input
                          type="checkbox"
                          checked={responseRefs.includes(name)}
                          onChange={() => toggleRef("res", name)}
                        />
                        <span>{name}</span>
                      </label>
                    ))
                  ) : (
                    <div style={{ padding: 8, color: "var(--muted)" }}>אין פרמטרים בסכמה</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* chips נבחרים */}
          {responseRefs.length > 0 && (
            <div style={styles.chips}>
              {responseRefs.map((n) => (
                <span key={n} style={styles.chip} onClick={() => toggleRef("res", n)}>
                  {n} ✕
                </span>
              ))}
            </div>
          )}

          <textarea
            style={styles.textarea}
            placeholder='[{"id":1,"name":"item"}]'
            value={r.response || ""}
            onChange={(e) => onChange({ response: e.target.value })}
          />
        </div>
      </div>

      <div style={{ textAlign: "start", color: "var(--muted)" }}>#{idx + 1}</div>
    </div>
  );
}

const styles = {
  card: {
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "12px",
    marginBottom: "10px",
    background: "#fafbff",
  },
  sublabel: { fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 4 },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    background: "#fff",
  },
  textarea: {
    width: "100%",
    minHeight: 110,
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    background: "#fff",
    resize: "vertical",
    fontFamily: "monospace",
  },
  menu: {
    position: "absolute",
    top: "110%",
    insetInlineEnd: 0,
    zIndex: 20,
    minWidth: 220,
    maxHeight: 260,
    overflow: "auto",
    background: "#fff",
    border: "1px solid var(--border)",
    borderRadius: 12,
    boxShadow: "0 12px 28px rgba(2,6,23,.12)",
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    cursor: "pointer",
  },
  chips: { display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0" },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 8px",
    border: "1px solid var(--border)",
    borderRadius: 999,
    background: "#f8fafc",
    cursor: "pointer",
    fontSize: 12,
  },
};
