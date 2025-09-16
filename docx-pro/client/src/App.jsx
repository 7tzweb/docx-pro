import React, { useEffect, useRef, useState } from "react";
import { Editor } from "@tinymce/tinymce-react";
import ProjectModal from "./components/ProjectModal";
import AppHeader from "./components/AppHeader";

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
import "tinymce/skins/ui/oxide/skin.min.css";
import "tinymce/skins/ui/oxide/content.min.css";
import "tinymce/skins/content/default/content.min.css";

/* endpoints */
const API_BASE       = "http://localhost:4000";
const DOCX_API_URL   = `${API_BASE}/api/generate`;
const AI_SWAGGER_URL = `${API_BASE}/api/generate-swagger`;
const AI_CODE_URL    = `${API_BASE}/api/generate-code`;
const PROJECTS_URL   = `${API_BASE}/api/projects`;
const PROJECT_SWAGGER_URL = (id) => `${API_BASE}/api/projects/${id}/swagger`;

/** מחליף/מוסיף בלוק מבוא בתוך תוכן העורך */
function ensureIntroInEditor(currentHtml, introHtml) {
  const INTRO_RE = /<section[^>]*data-intro=["']1["'][^>]*>[\s\S]*?<\/section>/i;
  const cleanIntro = (introHtml || "").trim();
  const body = (currentHtml || "");

  if (cleanIntro) {
    const block = `<section data-intro="1">${cleanIntro}</section>`;
    if (INTRO_RE.test(body)) {
      return body.replace(INTRO_RE, block);
    }
    return `${block}\n${body}`;
  } else {
    // אין מבוא – מסירים בלוק קיים אם היה
    return body.replace(INTRO_RE, "");
  }
}

/** שם קובץ בטוח */
function safeFile(str, suffix) {
  const base = String(str || "").replace(/[\\/:*?"<>|]+/g, " ").trim() || "document";
  return `${base} - ${suffix}`;
}

export default function App(){
  const [proc] = useState("תהליך אפיון API");
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("מסמך אפיון");
  const [rtl, setRtl] = useState(true);
  const [a4Preview, setA4Preview] = useState(false);

  const [specHtml, setSpecHtml] = useState("");
  const [swaggerText, setSwaggerText] = useState("");
  const [codeText, setCodeText] = useState("");
  const [loading, setLoading] = useState(false);

  // שפה לשלב 3
  const [lang, setLang] = useState("node-express");

  // Projects
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);

  // Modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"

  const editorRef = useRef(null);
  const gotoStep = (n) => setStep(n);

  /* load list + last */
  useEffect(() => {
    fetchProjectsList();
    const lastId = localStorage.getItem("lastProjectId");
    if (lastId) { loadProject(lastId); }
  }, []);

  async function fetchProjectsList(){
    try{
      const resp = await fetch(PROJECTS_URL);
      const data = await resp.json();
      setProjects(data.projects || []);
    }catch(e){ console.error(e); }
  }

  async function loadProject(id){
    try{
      const resp = await fetch(`${PROJECTS_URL}/${id}`);
      if (!resp.ok) throw new Error("not found");
      const data = await resp.json();
      setCurrentProject(data.project);

      // מעדכן כותרת ברירת-מחדל עם שם הפרויקט
      if (data?.project?.name) {
        setTitle(`מסמך אפיון ${data.project.name}`);
      }

      // מזריק/מעודכן את בלוק המבוא בתוך תוכן העורך עצמו
      const intro = data?.project?.introText || "";
      setSpecHtml(prev => ensureIntroInEditor(prev, intro));

      // מושך Swagger שנבנה מהפרויקט ומציג בשלב 2
      try {
        const sw = await fetch(PROJECT_SWAGGER_URL(id));
        if (sw.ok) setSwaggerText(await sw.text());
      } catch {}

      localStorage.setItem("lastProjectId", data.project.id);
    }catch(e){ console.error(e); }
  }

  /* Word */
  const downloadWord = async () => {
    setLoading(true);
    try{
      const resp = await fetch(DOCX_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // כעת התוכן של העורך כבר כולל את המבוא
        body: JSON.stringify({ title, html: specHtml, rtl })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const base = currentProject?.name || title || "document";
      triggerBlobDownload(blob, `${safeFile(base, "Word")}.docx`);
    }catch(e){ alert("שגיאה ביצירת Word: " + e.message); }
    finally{ setLoading(false); }
  };

  /* Step 1 -> 2 (אופציונלי – משאיר את הכפתור הקיים) */
  const generateSwagger = async () => {
    setLoading(true);
    try{
      const resp = await fetch(AI_SWAGGER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // גם כאן שולחים את תוכן העורך הכולל מבוא
        body: JSON.stringify({ title, html: specHtml, format: "yaml", rtl })
      });
      const data = await resp.json();
      if(!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);
      setSwaggerText(data.swagger || "");
      setStep(2);
    }catch(e){
      console.error(e);
      setSwaggerText(`openapi: 3.0.3
info:
  title: ${title || "API"}
  version: 1.0.0
  description: Local mock (server unavailable)
paths: {}
`);
      setStep(2);
    }finally{ setLoading(false); }
  };

  const downloadSwagger = () => {
    if(!swaggerText?.trim()) return alert("אין Swagger להורדה.");
    const isJson = swaggerText.trim().startsWith("{");
    const ext = isJson ? "json" : "yaml";
    const base = currentProject?.name || title || "swagger";
    const blob = new Blob([swaggerText], { type: "text/plain;charset=utf-8" });
    triggerBlobDownload(blob, `${safeFile(base, "Swagger")}.${ext}`);
  };

  /* Step 2 -> 3 */
  const generateCode = async () => {
    if(!swaggerText?.trim()) return alert("אין Swagger. צור קודם או הדבק ידנית.");
    setLoading(true);
    try{
      const resp = await fetch(AI_CODE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swagger: swaggerText, language: lang, rtl })
      });
      const data = await resp.json();
      if(!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);
      setCodeText(data.code || "");
      setStep(3);
    }catch(e){
      console.error(e);
      setCodeText(`// local mock – server unavailable (language: ${lang})
console.log("Generated from swagger locally");`);
      setStep(3);
    }finally{ setLoading(false); }
  };

  const downloadCode = () => {
    if(!codeText?.trim()) return alert("אין קוד להורדה.");
    const base = currentProject?.name || "generated";
    const blob = new Blob([codeText], { type: "text/plain;charset=utf-8" });
    triggerBlobDownload(blob, `${safeFile(base, lang)}.txt`);
  };

  /* Project modal open/save */
  const openCreateProjectModal = () => {
    setModalMode("create");
    setShowProjectModal(true);
  };
  const openEditProjectModal = () => {
    if (!currentProject) return;
    setModalMode("edit");
    setShowProjectModal(true);
  };

  const saveProjectFromModal = async (payload) => {
    try{
      if (modalMode === "edit" && currentProject) {
        const resp = await fetch(`${PROJECTS_URL}/${currentProject.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);
        setCurrentProject(data.project);
        if (data?.project?.name) setTitle(`מסמך אפיון ${data.project.name}`);
        // מעדכנים את בלוק המבוא בתוך המסמך לאחר עריכה
        setSpecHtml(prev => ensureIntroInEditor(prev, data?.project?.introText || ""));
        // Swagger שנבנה ע״י השרת
        if (data?.swagger) setSwaggerText(data.swagger);
        localStorage.setItem("lastProjectId", data.project.id);
      } else {
        const resp = await fetch(PROJECTS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);
        setCurrentProject(data.project);
        if (data?.project?.name) setTitle(`מסמך אפיון ${data.project.name}`);
        // גם בפרויקט חדש – מזריקים מבוא למסמך
        setSpecHtml(prev => ensureIntroInEditor(prev, data?.project?.introText || ""));
        // Swagger שנבנה ע״י השרת
        if (data?.swagger) setSwaggerText(data.swagger);
        localStorage.setItem("lastProjectId", data.project.id);
      }
      setShowProjectModal(false);
      fetchProjectsList();
      // לא מחייב לעבור אוטומטית, אבל אם תרצה:
      // setStep(2);
    }catch(e){
      alert("שמירת פרויקט נכשלה: " + e.message);
    }
  };

  return (
    <>
      {/* HEADER */}
      <AppHeader
        proc={proc}
        step={step}
        onGotoStep={setStep}
        loading={loading}
        a4Preview={a4Preview}
        onToggleA4={setA4Preview}
        rtl={rtl}
        onToggleRTL={setRtl}
        currentProject={currentProject}
        projects={projects}
        onLoadProject={loadProject}
        onCreateProject={openCreateProjectModal}
        onEditProject={openEditProjectModal}
        downloadWord={downloadWord}
        downloadSwagger={downloadSwagger}
        downloadCode={downloadCode}
        generateSwagger={generateSwagger}
        generateCode={generateCode}
        lang={lang}
        onChangeLang={setLang}
        swaggerText={swaggerText}
      />

      {/* WORKSPACE */}
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
                        entity_encoding: "raw",
                        convert_urls: false,
                        forced_root_block: "p",
                        plugins: [
                          "advlist","autolink","lists","link",
                          "table","code","directionality",
                          "wordcount","image"
                        ],
                        toolbar:
                          "undo redo | blocks | bold italic underline strikethrough | " +
                          "forecolor backcolor | alignleft aligncenter alignright alignjustify | " +
                          "bullist numlist outdent indent | table | ltr rtl | link image | code",
                        block_formats:
                          "כותרת 1=h1; כותרת 2=h2; כותרת 3=h3; פסקה=p",
                        paste_data_images: true,
                        automatic_uploads: false,
                        images_file_types: "jpeg,jpg,png,gif,webp",
                        content_style: `
                          body { font-family: Inter, system-ui, -apple-system, "Segoe UI", Arial, Helvetica, sans-serif;
                                 font-size: 17.5px; line-height: 1.85;
                                 direction: ${rtl ? "rtl" : "ltr"}; text-align: ${rtl ? "right" : "left"}; }
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
                    הקוד של ה-Swagger שנבנה מפרטי הפרויקט:
                  </div>
                  <textarea
                    className="swagger-area"
                    value={swaggerText}
                    onChange={(e)=>setSwaggerText(e.target.value)}
                    placeholder="openapi: 3.0.3..."
                  />
                </>
              )}

              {step===3 && (
                <>
                  <div style={{marginBottom:10, color:"var(--muted)"}}>
                    קוד שנוצר מה-Swagger ({lang}):
                  </div>
                  <pre className="code-area">{codeText || "// כאן יופיע הקוד שנוצר…"}</pre>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Project Modal */}
      <ProjectModal
        open={showProjectModal}
        mode={modalMode}
        initial={modalMode === "edit" ? currentProject : null}
        rtl={rtl}
        onClose={()=>setShowProjectModal(false)}
        onSave={saveProjectFromModal}
      />
    </>
  );
}

/* Helpers */
function triggerBlobDownload(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
