import React, { useRef, useState } from "react";
import { Editor } from "@tinymce/tinymce-react";

/* TinyMCE לוקאלי */
import "tinymce/tinymce";
import "tinymce/icons/default";
import "tinymce/themes/silver";
import "tinymce/models/dom";

/* פלאגינים */
import "tinymce/plugins/advlist";
import "tinymce/plugins/autolink";
import "tinymce/plugins/code";
import "tinymce/plugins/directionality";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/table";
import "tinymce/plugins/wordcount";
import "tinymce/plugins/image";

/* סקינים ותוכן – נטענים מקומית */
import "tinymce/skins/ui/oxide/skin.min.css";
import "tinymce/skins/ui/oxide/content.min.css";
import "tinymce/skins/content/default/content.min.css";

const AI_SWAGGER_URL = "http://localhost:5001/api/generate-swagger";
const AI_CODE_URL    = "http://localhost:5002/api/generate-code";
const DOCX_API_URL   = "http://localhost:4000/api/generate";

export default function App(){
  const [proc] = useState("תהליך אפיון API");
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("מסמך אפיון");
  const [rtl, setRtl] = useState(true);
  const [a4Preview, setA4Preview] = useState(false); // תצוגת A4 אופציונלית

  const [specHtml, setSpecHtml] = useState("");
  const [swaggerText, setSwaggerText] = useState("");
  const [codeText, setCodeText] = useState("");
  const [loading, setLoading] = useState(false);

  const editorRef = useRef(null);
  const gotoStep = (n) => setStep(n);

  const downloadWord = async () => {
    setLoading(true);
    try{
      const resp = await fetch(DOCX_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, html: specHtml, rtl })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      triggerBlobDownload(blob, `${title || "document"}.docx`);
    }catch(e){ alert("שגיאה ביצירת Word: " + e.message); }
    finally{ setLoading(false); }
  };

  const generateSwagger = async () => {
    setLoading(true);
    try{
      const resp = await fetch(AI_SWAGGER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, html: specHtml, format: "yaml", rtl })
      });
      const data = await resp.json();
      if(!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);
      setSwaggerText(data.swagger || "");
      setStep(2);
    }catch(e){ alert("שגיאה ביצירת Swagger: " + e.message); }
    finally{ setLoading(false); }
  };

  const downloadSwagger = () => {
    if(!swaggerText?.trim()) return alert("אין Swagger להורדה.");
    const isJson = swaggerText.trim().startsWith("{");
    const ext = isJson ? "json" : "yaml";
    const blob = new Blob([swaggerText], { type: "text/plain;charset=utf-8" });
    triggerBlobDownload(blob, `swagger.${ext}`);
  };

  const generateCode = async () => {
    if(!swaggerText?.trim()) return alert("אין Swagger. צור קודם או הדבק ידנית.");
    setLoading(true);
    try{
      const resp = await fetch(AI_CODE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swagger: swaggerText, language: "node-express", rtl })
      });
      const data = await resp.json();
      if(!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);
      setCodeText(data.code || "");
      setStep(3);
    }catch(e){ alert("שגיאה ביצירת קוד: " + e.message); }
    finally{ setLoading(false); }
  };

  const downloadCode = () => {
    if(!codeText?.trim()) return alert("אין קוד להורדה.");
    const blob = new Blob([codeText], { type: "text/plain;charset=utf-8" });
    triggerBlobDownload(blob, `generated-code.txt`);
  };

  return (
    <>
      {/* HEADER */}
      <div className="header">
        <div className="container">
          <div className="toprow">
            <div className="process-pill">{proc}</div>

            <div style={{marginInlineStart:"auto", display:"flex", gap:14}}>
              <label style={{display:"flex", alignItems:"center", gap:6, color:"var(--muted)"}}>
                <input type="checkbox" checked={rtl} onChange={e=>setRtl(e.target.checked)} />
                RTL ברירת-מחדל
              </label>
              <label style={{display:"flex", alignItems:"center", gap:6, color:"var(--muted)"}}>
                <input type="checkbox" checked={a4Preview} onChange={e=>setA4Preview(e.target.checked)} />
                תצוגת A4 (סימולציה)
              </label>
            </div>
          </div>

          <div className="steps">
            <div className={`step ${step===1?'active':''}`} onClick={()=>gotoStep(1)}>שלב 1: אפיון</div>
            <div className={`step ${step===2?'active':''}`} onClick={()=>gotoStep(2)}>שלב 2: Swagger</div>
            <div className={`step ${step===3?'active':''}`} onClick={()=>gotoStep(3)}>שלב 3: קוד</div>
          </div>

          <div className="actions">
            <div className="right">
              {step===1 && <button className="btn" onClick={downloadWord} disabled={loading}>{loading ? "יוצר…" : "הורד Word"}</button>}
              {step===2 && <button className="btn" onClick={downloadSwagger}>הורד Swagger</button>}
              {step===3 && <button className="btn" onClick={downloadCode}>הורד קוד</button>}
            </div>
            <div className="left">
              {step===1 && <button className="btn btn-primary" onClick={generateSwagger} disabled={loading}>{loading ? "יוצר Swagger…" : "עבור לשלב הבא (צור Swagger)"}</button>}
              {step===2 && <button className="btn btn-primary" onClick={generateCode} disabled={loading || !swaggerText.trim()}>{loading ? "יוצר קוד…" : "עבור לשלב הבא (צור קוד)"}</button>}
              {step===3 && <button className="btn" onClick={()=>setStep(1)}>חזרה לשלב 1</button>}
            </div>
          </div>
        </div>
      </div>

      {/* WORKSPACE / PAGE */}
      <main className="main">
        <div className={`workspace ${a4Preview ? "a4" : "full"}`}>
          <div className="stage">
            <div className="page">
              {step===1 && (
                <>
                  <input
                    className="input-title"
                    type="text"
                    placeholder="כותרת המסמך"
                    value={title}
                    onChange={(e)=>setTitle(e.target.value)}
                  />

                  <div className="tiny-wrap">
                    <Editor
                      onInit={(_evt, editor) => (editorRef.current = editor)}
                      value={specHtml}
                      onEditorChange={(val) => setSpecHtml(val)}
                      init={{
                        license_key: "gpl",
                        promotion: false,

                        menubar: false,
                        branding: false,
                        rtl_ui: true,
                        directionality: rtl ? "rtl" : "ltr",
                        height: 720,

                        toolbar_mode: "wrap",
                        toolbar_sticky: true,

                        skin: false,
                        content_css: false,

                        // ✅ מפחית המרות ישויות (nbsp וכו')
                        entity_encoding: "raw",
                        convert_urls: false,
                        forced_root_block: "p",

                        plugins: [
                          "advlist", "autolink", "lists", "link",
                          "table", "code", "directionality",
                          "wordcount", "image"
                        ],
                        toolbar:
                          "undo redo | blocks | " +
                          "bold italic underline strikethrough | " +
                          "forecolor backcolor | alignleft aligncenter alignright alignjustify | " +
                          "bullist numlist outdent indent | table | ltr rtl | link image | code",
                        block_formats:
                          "כותרת 1=h1; כותרת 2=h2; כותרת 3=h3; פסקה=p",

                        paste_data_images: true,
                        automatic_uploads: false,
                        images_file_types: "jpeg,jpg,png,gif,webp",

                        content_style: `
                          body {
                            font-family: Inter, system-ui, -apple-system, "Segoe UI", Arial, Helvetica, sans-serif;
                            font-size: 17.5px; line-height: 1.85;
                            direction: ${rtl ? "rtl" : "ltr"}; text-align: ${rtl ? "right" : "left"};
                          }
                          table { border-collapse: collapse; width: 100%; }
                          table, th, td { border: 1px solid #e6e8ee; }
                          th, td { padding: 8px; }
                        `
                      }}
                    />
                  </div>
                </>
              )}

              {step===2 && (
                <>
                  <div style={{marginBottom:10, color:"var(--muted)"}}>
                    הדבק/י או ערוך/ערכי כאן את ה-Swagger (YAML/JSON).
                  </div>
                  <textarea
                    className="swagger-area"
                    value={swaggerText}
                    onChange={(e)=>setSwaggerText(e.target.value)}
                    placeholder={`openapi: 3.0.3
info:
  title: My API
  version: 1.0.0
paths:
  /users:
    get:
      summary: Get users
      responses:
        '200':
          description: ok
`}
                  />
                </>
              )}

              {step===3 && (
                <>
                  <div style={{marginBottom:10, color:"var(--muted)"}}>
                    הקוד שנוצר מה-Swagger (ניתן להוריד או להעתיק).
                  </div>
                  <pre className="code-area">{codeText || "// כאן יופיע הקוד שנוצר…"}</pre>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

/* Utils */
function triggerBlobDownload(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
