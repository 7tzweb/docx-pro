import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * ProjectPicker
 * כפתור שפותח פופ-אובר עם חיפוש ורשימת פרויקטים מסוננת.
 * props:
 *  - projects: [{id,name,updatedAt}]
 *  - onSelect: (id) => void
 *  - buttonStyle: style obj (אופציונלי)
 */
export default function ProjectPicker({ projects = [], onSelect, buttonStyle }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return projects;
    return projects.filter((p) => `${p.name}`.toLowerCase().includes(s));
  }, [projects, q]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!boxRef.current) return;
      if (boxRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      // פוקוס על שדה החיפוש כשנפתח
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQ("");
    }
  }, [open]);

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        className="btn"
        style={{
          padding: "10px 14px",
          border: "1px solid var(--primary)",
          color: "var(--primary)",
          background: "#fff",
          borderRadius: 12,
          ...buttonStyle,
        }}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        פתח פרויקט…
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            insetInlineStart: 0,
            marginTop: 8,
            width: 360,
            maxHeight: 380,
            overflow: "auto",
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "0 20px 60px rgba(2,6,23,.18)",
            zIndex: 100,
            padding: 10,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="חפש לפי שם…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--border)",
              borderRadius: 10,
              marginBottom: 8,
            }}
          />

          <div>
            {filtered.length === 0 && (
              <div style={{ padding: "8px 6px", color: "var(--muted)" }}>לא נמצאו פרויקטים תואמים</div>
            )}

            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelect?.(p.id);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "start",
                  padding: "10px 12px",
                  border: "1px solid transparent",
                  borderRadius: 8,
                  background: "transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f7f8fb")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  עודכן: {p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "-"}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
