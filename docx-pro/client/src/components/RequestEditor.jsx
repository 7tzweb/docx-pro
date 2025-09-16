import React, { useEffect, useRef } from "react";
import { HEADER_CANDIDATES } from "../constants";

/**
 * עורך של בקשה אחת במודאל הפרויקט.
 * props:
 *  - r: אובייקט בקשה { id, url, method, headers, request, response, stdHeaders? }
 *  - idx: אינדקס (לתצוגה)
 *  - rtl: האם RTL
 *  - onChange(patch)
 *  - onClone()
 *  - onDelete()
 */
export default function RequestEditor({ r, idx, rtl, onChange, onClone, onDelete }) {
  const std = Array.isArray(r.stdHeaders) ? r.stdHeaders : [];

  const allSelected = HEADER_CANDIDATES.every((k) => std.includes(k));
  const someSelected = std.length > 0 && !allSelected;

  // כדי להציג מצב "חלקי" על הצ'קבוקס של "בחר את כולם"
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

  return (
    <div style={styles.card}>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
        <div>
          <label style={styles.sublabel}>Headers (טקסט JSON)</label>
          <textarea
            style={styles.textarea}
            placeholder='{"Authorization":"Bearer ..."}'
            value={r.headers || ""}
            onChange={(e) => onChange({ headers: e.target.value })}
          />
          <div style={styles.hint}>
            * הצ׳קבוקסים נשמרים בשדה <code>stdHeaders</code>. ניתן לשלב כאן ערכים ידניים/דינמיים.
          </div>
        </div>
        <div>
          <label style={styles.sublabel}>Request Body (טקסט JSON)</label>
          <textarea
            style={styles.textarea}
            placeholder='{"name":"item"}'
            value={r.request || ""}
            onChange={(e) => onChange({ request: e.target.value })}
          />
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <label style={styles.sublabel}>Response Example (טקסט JSON)</label>
        <textarea
          style={styles.textarea}
          placeholder='[{"id":1,"name":"item"}]'
          value={r.response || ""}
          onChange={(e) => onChange({ response: e.target.value })}
        />
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
  hint: { fontSize: 12, color: "var(--muted)", marginTop: 6 },
};
