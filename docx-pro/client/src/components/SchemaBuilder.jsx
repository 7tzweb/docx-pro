import React, { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import YAML from "yaml";

/* dnd-kit (גרירה מדויקת) */
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * SchemaBuilder – כלי מלא להדבקה/עריכה/גרירה של סכמות, כולל המרה JSON↔YAML.
 *
 * props:
 *  - initialText?: string                // טקסט YAML/JSON התחלתי (למשל project.schema)
 *  - initialView?: "yaml" | "json"      // ברירת מחדל: "yaml"
 *  - onTextChange?: (text: string)      // ייקרא בכל שינוי שנשלח חזרה לטקסט הראשי (לשמירה בפרויקט)
 *  - onStats?: ({count, error})         // עדכון סטטוס/שגיאה/מספר סכמות
 */
export default function SchemaBuilder({
  initialText = "",
  initialView = "yaml",
  onTextChange,
  onStats,
}) {
  /** מצב כללי */
  const [tab, setTab] = useState("paste"); // "paste" | "builder"
  const [view, setView] = useState(initialView === "json" ? "json" : "yaml");
  const [text, setText] = useState(initialText || "");
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);

  /** מודל הבילדר */
  const [schemas, setSchemas] = useState([]); // [{name, type, props:[{...}]}]

  /** חיישני DND */
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  /** לטעון נתונים ראשוניים */
  useEffect(() => {
    setText(initialText || "");
    setView(initialView === "json" ? "json" : "yaml");
    setError("");
    try {
      const { object } = parseAnySchemas(initialText || "");
      const clean = unwrapSchemasRoot(object);
      setCount(Object.keys(clean || {}).length);
    } catch {
      setCount(0);
    }
  }, [initialText, initialView]);

  /** דיווח למעלה (סטטוס) */
  useEffect(() => {
    onStats?.({ count, error });
  }, [count, error, onStats]);

  /** שינוי טקסט חופשי */
  function onChangeText(v) {
    const t = v ?? "";
    setText(t);
    setError("");
    onTextChange?.(t);
  }

  /** Normalize – קבלה של JSON/YAML (עם/בלי root: schemas) והמרה חזרה לתצוגה הנוכחית */
  function normalize() {
    try {
      const { object } = parseAnySchemas(text);
      const clean = unwrapSchemasRoot(object);
      const out = view === "json" ? JSON.stringify(clean, null, 2) : YAML.stringify(clean, { indent: 2 });
      setText(out);
      setCount(Object.keys(clean || {}).length);
      setError("");
      onTextChange?.(out);
    } catch (e) {
      setError(String(e?.message || e));
    }
  }

  /** העברה ל־Builder */
  function loadToBuilder() {
    try {
      const { object } = parseAnySchemas(text);
      const clean = unwrapSchemasRoot(object);
      setSchemas(objectToBuilder(clean));
      setTab("builder");
      setError("");
    } catch (e) {
      setError("לא הצלחתי לנתח ל־Builder: " + String(e?.message || e));
    }
  }

  /** החזרה מה־Builder לטקסט */
  function applyBuilderToEditor() {
    const obj = builderToObject(schemas);
    setCount(Object.keys(obj).length);
    const out = view === "json" ? JSON.stringify(obj, null, 2) : YAML.stringify(obj, { indent: 2 });
    setText(out);
    setTab("paste");
    setError("");
    onTextChange?.(out);
  }

  /** פעולות ברמת סכמות */
  function addSchema() {
    setSchemas((prev) => [...prev, { name: "MySchema", type: "object", props: [] }]);
  }
  function removeSchema(i) {
    setSchemas((prev) => prev.filter((_, idx) => idx !== i));
  }
  function setSchemaName(i, v) {
    setSchemas((prev) => patchIndex(prev, i, { name: v }));
  }
  function setSchemaType(i, v) {
    setSchemas((prev) => patchIndex(prev, i, { type: v }));
  }

  /** פעולות ברמת שדה */
  function addProp(i) {
    setSchemas((prev) => {
      const n = [...prev];
      const s = n[i];
      const props = [...(s.props || []), blankProp()];
      n[i] = { ...s, props };
      return n;
    });
  }
  function updateProp(i, j, patch) {
    setSchemas((prev) => {
      const n = [...prev];
      const s = n[i];
      const props = [...(s.props || [])];
      props[j] = { ...props[j], ...patch };
      n[i] = { ...s, props };
      return n;
    });
  }
  function removeProp(i, j) {
    setSchemas((prev) => {
      const n = [...prev];
      const s = n[i];
      const props = (s.props || []).filter((_, idx) => idx !== j);
      n[i] = { ...s, props };
      return n;
    });
  }

  /** DND: מיקומי סכמות ושדות */
  function onDragEndSchema(ev) {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const oldIndex = schemas.findIndex((_, idx) => `schema-${idx}` === active.id);
    const newIndex = schemas.findIndex((_, idx) => `schema-${idx}` === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setSchemas((prev) => arrayMove(prev, oldIndex, newIndex));
  }
  function onDragEndProp(schemaIdx, ev) {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const list = schemas[schemaIdx]?.props || [];
    const oldIndex = list.findIndex((_, idx) => `prop-${schemaIdx}-${idx}` === active.id);
    const newIndex = list.findIndex((_, idx) => `prop-${schemaIdx}-${idx}` === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setSchemas((prev) => {
      const n = [...prev];
      const s = n[schemaIdx];
      n[schemaIdx] = { ...s, props: arrayMove(s.props || [], oldIndex, newIndex) };
      return n;
    });
  }

  return (
    <div className="schema-box">
      <div className="schema-toolbar">
        <div className="schema-tabs">
          <button className={`btn ${tab === "builder" ? "primary" : ""}`} onClick={() => setTab("builder")}>Builder</button>
          <button className={`btn ${tab === "paste" ? "primary" : ""}`} onClick={() => setTab("paste")}>Paste</button>
        </div>

        <div className="schema-right">
          <span className="muted">תצוגה:</span>
          <button className={`btn ${view === "yaml" ? "primary" : ""}`} onClick={() => setView("yaml")}>YAML</button>
          <button className={`btn ${view === "json" ? "primary" : ""}`} onClick={() => setView("json")}>JSON</button>
          <button className="btn" onClick={normalize}>נרמל והצג</button>
          {tab === "paste" ? (
            <button className="btn" onClick={loadToBuilder}>טען לבילדר</button>
          ) : (
            <button className="btn primary" onClick={applyBuilderToEditor}>החזר לעורך</button>
          )}
        </div>
      </div>

      {tab === "paste" ? (
        <div className="schema-editor-shell">
          <div dir="ltr" style={{ height: 360 }}>
            <Editor
              key={view}
              height="360px"
              language={view === "json" ? "json" : "yaml"}
              theme="vs"
              value={text}
              onChange={onChangeText}
              options={{
                readOnly: false,
                fontSize: 13,
                minimap: { enabled: false },
                wordWrap: "on",
                lineNumbers: "on",
                folding: true,
                automaticLayout: true,
                renderWhitespace: "selection",
                tabSize: 2,
              }}
            />
          </div>
          <div className="schema-status">
            {error ? (
              <div className="badge error">שגיאה: {error}</div>
            ) : (
              <div className="badge ok">נותח בהצלחה · {count} פרמטרים</div>
            )}
            <div className="muted small">הדבק YAML/JSON → “נרמל והצג” → “טען לבילדר”.</div>
          </div>
        </div>
      ) : (
        <div className="schema-builder">
          <div className="schema-builder-head">
            <div className="title">Builder</div>
            <div className="actions">
              <button className="btn" onClick={addSchema}>סכמה חדשה</button>
              <button className="btn primary" onClick={applyBuilderToEditor}>החזר לעורך</button>
            </div>
          </div>

          {!schemas.length ? (
            <div className="muted small">אין עדיין סכמות. לחץ “טען לבילדר” מהטאב של Paste, או “סכמה חדשה”.</div>
          ) : null}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndSchema}>
            <SortableContext items={schemas.map((_, i) => `schema-${i}`)} strategy={verticalListSortingStrategy}>
              {schemas.map((s, i) => (
                <SchemaCard
                  key={`schema-${i}`}
                  id={`schema-${i}`}
                  schema={s}
                  index={i}
                  onName={(v) => setSchemaName(i, v)}
                  onType={(v) => setSchemaType(i, v)}
                  onRemove={() => removeSchema(i)}
                  onAddProp={() => addProp(i)}
                  sensors={sensors}
                  onDragEndProp={(ev) => onDragEndProp(i, ev)}
                  onUpdateProp={(j, patch) => updateProp(i, j, patch)}
                  onRemoveProp={(j) => removeProp(i, j)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

/* ====== כרטיס סכמה עם DnD ====== */
function SchemaCard({
  id, schema, index, onName, onType, onRemove, onAddProp,
  sensors, onDragEndProp, onUpdateProp, onRemoveProp
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} className="schema-card" style={style}>
      <div className="schema-card-head">
        <DragHandle {...attributes} {...listeners} />
        <input className="input" value={schema.name} onChange={(e)=>onName(e.target.value)} placeholder="SchemaName" />
        <select className="input" value={schema.type} onChange={(e)=>onType(e.target.value)}>
          <option value="object">object</option>
          <option value="array">array</option>
        </select>
        <div className="row-actions">
          <button className="btn" onClick={onRemove}>מחק סכמה</button>
        </div>
      </div>

      {/* Properties (אינדנטציה = היררכיה) */}
      <div className="props-wrap">
        <div className="props-head">
          <div className="title">שדות</div>
          <button className="btn" onClick={onAddProp}>הוסף שדה</button>
        </div>

        <HeaderRow />

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndProp}>
          <SortableContext
            items={(schema.props || []).map((_, j) => `prop-${index}-${j}`)}
            strategy={verticalListSortingStrategy}
          >
            {(schema.props || []).map((p, j) => (
              <PropRow
                key={`prop-${index}-${j}`}
                id={`prop-${index}-${j}`}
                prop={p}
                onChange={(patch)=>onUpdateProp(j, patch)}
                onRemove={()=>onRemoveProp(j)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

/* ====== שורת שדה הניתנת לגרירה ====== */
function PropRow({ id, prop, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} className="prop-row" style={style}>
      <DragHandle {...attributes} {...listeners} />
      <input className="cell name" value={prop.key} onChange={(e)=>onChange({ key:e.target.value })} placeholder="fieldName" />
      <select className="cell type" value={prop.type} onChange={(e)=>onChange({ type:e.target.value })}>
        <option value="string">string</option>
        <option value="number">number</option>
        <option value="integer">integer</option>
        <option value="boolean">boolean</option>
        <option value="array">array</option>
        <option value="ref">$ref</option>
      </select>

      <div className="cell flags">
        <label className="flag"><input type="checkbox" checked={!!prop.required} onChange={(e)=>onChange({ required:e.target.checked })} /> req</label>
        {prop.type !== "ref" ? (
          <label className="flag"><input type="checkbox" checked={!!prop.nullable} onChange={(e)=>onChange({ nullable:e.target.checked })} /> nul</label>
        ) : <span className="flag muted">—</span>}
      </div>

      <input className="cell desc" value={prop.description} onChange={(e)=>onChange({ description:e.target.value })} placeholder="description" />
      <input className="cell example" value={prop.example} onChange={(e)=>onChange({ example:e.target.value })} placeholder='example (אפשר JSON)' />
      <input className="cell num" value={prop.maxLength} onChange={(e)=>onChange({ maxLength:e.target.value })} placeholder="maxLen" />
      <input className="cell pattern" value={prop.pattern} onChange={(e)=>onChange({ pattern:e.target.value })} placeholder="pattern (regex)" />
      {prop.type === "ref" ? (
        <input className="cell ref" value={prop.ref} onChange={(e)=>onChange({ ref:e.target.value })} placeholder="#/components/schemas/Other | URL" />
      ) : <div />}

      <div className="cell actions">
        <button className="btn" onClick={onRemove}>מחק</button>
      </div>
    </div>
  );
}

/* ====== UI helpers ====== */
function DragHandle(props) {
  return (
    <div {...props} className="drag-handle" title="גרור להזיז">⋮⋮</div>
  );
}
function HeaderRow() {
  return (
    <div className="prop-row header">
      <div />
      <div>name</div>
      <div>type</div>
      <div className="center">flags</div>
      <div>description</div>
      <div>example</div>
      <div>maxLen</div>
      <div>pattern</div>
      <div>ref</div>
      <div />
    </div>
  );
}

/* ====== טרנספורמציות נתונים ====== */
function objectToBuilder(schemasObj = {}) {
  const result = [];
  for (const [name, def] of Object.entries(schemasObj || {})) {
    const type = def?.type || "object";
    const entry = { name, type, props: [] };
    if (type === "object" && def?.properties && typeof def.properties === "object") {
      const requiredSet = new Set(Array.isArray(def.required) ? def.required : []);
      for (const [k, v] of Object.entries(def.properties)) {
        entry.props.push(propFromSchema(k, v, requiredSet.has(k)));
      }
    } else if (type === "array") {
      entry.props = [];
    }
    result.push(entry);
  }
  return result;
}
function propFromSchema(key, v, isRequired) {
  const p = blankProp();
  p.key = key;
  if (v && typeof v === "object" && "$ref" in v) {
    p.type = "ref";
    p.ref = String(v["$ref"] || "");
  } else if (v?.type === "array") {
    p.type = "array";
  } else {
    p.type = v?.type || "string";
  }
  if (v?.description) p.description = String(v.description);
  if (v?.example !== undefined) p.example = stringifyExample(v.example);
  if (v?.maxLength !== undefined) p.maxLength = String(v.maxLength);
  if (v?.pattern) p.pattern = String(v.pattern);
  if (v?.nullable) p.nullable = !!v.nullable;
  p.required = !!isRequired;
  return p;
}
function builderToObject(model = []) {
  const out = {};
  for (const s of model) {
    if (!s?.name) continue;
    if (s.type === "array") {
      out[s.name] = { type: "array", items: { type: "object" } };
      continue;
    }
    const required = [];
    const properties = {};
    for (const p of (s.props || [])) {
      if (!p?.key) continue;
      const base = {};
      if (p.type === "ref") {
        base["$ref"] = String(p.ref || "#/components/schemas/SomeRef");
      } else if (p.type === "array") {
        base.type = "array"; base.items = { type: "string" };
      } else {
        base.type = p.type || "string";
      }
      if (p.description) base.description = String(p.description);
      if (p.example) base.example = safeParseExample(p.example);
      if (p.maxLength) base.maxLength = Number(p.maxLength);
      if (p.pattern) base.pattern = String(p.pattern);
      if (p.nullable) base.nullable = true;
      properties[p.key] = base;
      if (p.required) required.push(p.key);
    }
    out[s.name] = { type: "object", properties };
    if (required.length) out[s.name].required = required;
  }
  return out;
}

/* ====== utils ====== */
function blankProp() {
  return {
    key: "field",
    type: "string",
    ref: "",
    required: false,
    description: "",
    example: "",
    maxLength: "",
    pattern: "",
    nullable: false,
  };
}
function stringifyExample(v) {
  try { return typeof v === "string" ? v : JSON.stringify(v); } catch { return String(v); }
}
function safeParseExample(v) {
  const t = String(v ?? "").trim();
  if (!t) return "";
  try { return JSON.parse(t); } catch { return t; }
}
function parseAnySchemas(text) {
  const raw = String(text || "").trim();
  if (!raw) return { object: {}, kind: "empty" };
  if (raw.startsWith("{") || raw.startsWith("[")) {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      throw new Error("JSON צריך להיות אובייקט של סכמות");
    }
    return { object: obj, kind: "json" };
  }
  const y = YAML.parse(raw);
  if (!y || typeof y !== "object" || Array.isArray(y)) throw new Error("YAML צריך להיות מבנה מפתח/ערך");
  return { object: y, kind: "yaml" };
}
function unwrapSchemasRoot(o) {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    const keys = Object.keys(o);
    if (keys.length === 1 && keys[0] === "schemas" && o.schemas && typeof o.schemas === "object") return o.schemas;
  }
  return o;
}
function patchIndex(arr, i, patch) {
  const n = [...arr]; n[i] = { ...n[i], ...patch }; return n;
}
