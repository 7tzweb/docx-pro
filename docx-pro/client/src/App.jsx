import React, { useEffect, useState } from "react";
import ProjectModal from "./components/ProjectModal";
import AppHeader from "./components/AppHeader";
import MonacoEditor from "@monaco-editor/react";
import RichTextEditor from "./components/RichTextEditor";

/* endpoints */
const API_BASE       = "http://localhost:4000";
const DOCX_API_URL   = `${API_BASE}/api/generate`;
const AI_SWAGGER_URL = `${API_BASE}/api/generate-swagger`;
const AI_CODE_URL    = `${API_BASE}/api/generate-code`;
const PROJECTS_URL   = `${API_BASE}/api/projects`;
const PROJECT_SWAGGER_URL = (id) => `${API_BASE}/api/projects/${id}/swagger`;

/** הזרקה/עדכון של בלוק המבוא בתוך תוכן העורך */
function ensureIntroInEditor(currentHtml, introHtml) {
  const INTRO_RE = /<section[^>]*data-intro=["']1["'][^>]*>[\s\S]*?<\/section>/i;
  const cleanIntro = (introHtml || "").trim();
  const body = (currentHtml || "");
  if (cleanIntro) {
    const block = `<section data-intro="1">${cleanIntro}</section>`;
    return INTRO_RE.test(body) ? body.replace(INTRO_RE, block) : `${block}\n${body}`;
  }
  return body.replace(INTRO_RE, "");
}

/** שם קובץ בטוח */
function safeFile(str, suffix) {
  const base = String(str || "").replace(/[\\/:*?"<>|]+/g, " ").trim() || "document";
  return `${base} - ${suffix}`;
}

/** מיפוי שפה לעורך Monaco בשלב 3 */
function monacoLanguageFor(langKey) {
  switch (langKey) {
    case "node-express":   return "javascript";
    case "dotnet-webapi":  return "csharp";
    case "csharp-aspnet":  return "csharp";
    case "python-fastapi": return "python";
    case "java-spring":    return "java";
    case "go-chi":         return "go";
    case "php-laravel":    return "php";
    default:               return "javascript";
  }
}

/** העתקה ללוח – תומך גם ב-HTML */
async function copyToClipboard(text, html) {
  try {
    if (window.ClipboardItem && html) {
      const item = new ClipboardItem({
        "text/plain": new Blob([text ?? ""], { type: "text/plain" }),
        "text/html":  new Blob([html ?? text ?? ""], { type: "text/html" }),
      });
      await navigator.clipboard.write([item]);
      return true;
    }
    await navigator.clipboard.writeText(text ?? "");
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.style.position = "fixed"; ta.style.opacity = "0";
      ta.value = text ?? "";
      document.body.appendChild(ta);
      ta.select(); document.execCommand("copy"); ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

async function withMinDelay(promise, ms = 800) {
  const [res] = await Promise.all([promise, new Promise((r) => setTimeout(r, ms))]);
  return res;
}
function mapLanguageForServer(langKey) {
  if (langKey === "dotnet-webapi") return "csharp-aspnet";
  return langKey;
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
  const [codeLoading, setCodeLoading] = useState(false);

  const [lang, setLang] = useState("node-express");
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");

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
      if (data?.project?.name) setTitle(`מסמך אפיון ${data.project.name}`);
      setSpecHtml(prev => ensureIntroInEditor(prev, data?.project?.introText || ""));
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
        // ← נוסף project (אופציונלי; השרת יתעלם אם לא נשלח)
        body: JSON.stringify({ title, html: specHtml, rtl, project: currentProject })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const base = currentProject?.name || title || "document";
      triggerBlobDownload(blob, `${safeFile(base, "Word")}.docx`);
    }catch(e){ alert("שגיאה ביצירת Word: " + e.message); }
    finally{ setLoading(false); }
  };

  const copyWord = async () => {
    const ok = await copyToClipboard(specHtml, specHtml);
    if (!ok) alert("נכשל בהעתקה ללוח.");
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

  const copySwagger = async () => {
    if(!swaggerText?.trim()) return alert("אין Swagger להעתקה.");
    const ok = await copyToClipboard(swaggerText);
    if (!ok) alert("נכשל בהעתקה ללוח.");
  };

  async function generateCodeFromProject(projectObj, languageKey){
    const resp = await fetch(AI_CODE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: projectObj, language: mapLanguageForServer(languageKey) })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);
    return data.code || "";
  }

  const generateCode = async () => {
    if (!currentProject) return alert("אין פרויקט טעון.");
    setCodeLoading(true);
    try{
      const code = await withMinDelay(generateCodeFromProject(currentProject, lang), 900);
      setCodeText(code);
      setStep(3);
    }catch(e){
      console.error(e);
      alert("יצירת קוד נכשלה: " + e.message);
    }finally{ setCodeLoading(false); }
  };

  const handleChangeLang = async (newLang) => {
    setLang(newLang);
    if (!currentProject) return;
    setCodeLoading(true);
    try{
      const code = await withMinDelay(generateCodeFromProject(currentProject, newLang), 900);
      setCodeText(code);
    }catch(e){ console.error(e); }
    finally{ setCodeLoading(false); }
  };

  const downloadCode = () => {
    if(!codeText?.trim()) return alert("אין קוד להורדה.");
    const base = currentProject?.name || "generated";
    const blob = new Blob([codeText], { type: "text/plain;charset=utf-8" });
    triggerBlobDownload(blob, `${safeFile(base, lang)}.txt`);
  };

  const copyCode = async () => {
    if(!codeText?.trim()) return alert("אין קוד להעתקה.");
    const ok = await copyToClipboard(codeText);
    if (!ok) alert("נכשל בהעתקה ללוח.");
  };

  const openCreateProjectModal = () => { setModalMode("create"); setShowProjectModal(true); };
  const openEditProjectModal   = () => { if (currentProject){ setModalMode("edit"); setShowProjectModal(true); } };

  const saveProjectFromModal = async (payload) => {
    try{
      if (modalMode === "edit" && currentProject) {
        const resp = await fetch(`${PROJECTS_URL}/${currentProject.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);
        setCurrentProject(data.project);
        if (data?.project?.name) setTitle(`מסמך אפיון ${data.project.name}`);
        setSpecHtml(prev => ensureIntroInEditor(prev, data?.project?.introText || ""));
        if (data?.swagger) setSwaggerText(data.swagger);
        localStorage.setItem("lastProjectId", data.project.id);

        setCodeLoading(true);
        try{
          const code = await withMinDelay(generateCodeFromProject(data.project, lang), 600);
          setCodeText(code);
        } finally { setCodeLoading(false); }
      } else {
        const resp = await fetch(PROJECTS_URL, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);
        setCurrentProject(data.project);
        if (data?.project?.name) setTitle(`מסמך אפיון ${data.project.name}`);
        setSpecHtml(prev => ensureIntroInEditor(prev, data?.project?.introText || ""));
        if (data?.swagger) setSwaggerText(data.swagger);
        localStorage.setItem("lastProjectId", data.project.id);

        setCodeLoading(true);
        try{
          const code = await withMinDelay(generateCodeFromProject(data.project, lang), 600);
          setCodeText(code);
        } finally { setCodeLoading(false); }
      }
      setShowProjectModal(false);
      fetchProjectsList();
    }catch(e){
      alert("שמירת פרויקט נכשלה: " + e.message);
    }
  };

  return (
    <>
      <AppHeader
        proc={proc}
        step={step}
        onGotoStep={setStep}
        loading={loading || codeLoading}
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
        copyWord={copyWord}
        copySwagger={copySwagger}
        copyCode={copyCode}
        lang={lang}
        onChangeLang={handleChangeLang}
        swaggerText={swaggerText}
      />

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
                    <RichTextEditor value={specHtml} onChange={setSpecHtml} rtl={rtl} height={720} />
                  </div>
                </>
              )}

              {step===2 && (
                <>
                  <div style={{marginBottom:10, color:"var(--muted)"}}>
                    הקוד של ה-Swagger שנבנה מפרטי הפרויקט:
                  </div>
                  <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", direction:"ltr" }}>
                    <MonacoEditor
                      height="620px"
                      language="yaml"
                      theme="vs-dark"
                      value={swaggerText}
                      onChange={(val) => setSwaggerText(val ?? "")}
                      onMount={(editor) => {
                        editor.updateOptions({ fontSize: 14, lineNumbers: "on" });
                        setTimeout(() => editor.layout(), 0);
                      }}
                      options={{
                        readOnly: false,
                        minimap: { enabled: true },
                        wordWrap: "off",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        insertSpaces: true,
                      }}
                    />
                  </div>
                </>
              )}

              {step===3 && (
                <>
                  <div style={{marginBottom:10, color:"var(--muted)"}}>
                    קוד שנוצר מהפרויקט ({lang}):
                  </div>
                  <div style={{ position:"relative", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", direction:"ltr" }}>
                    <MonacoEditor
                      height="620px"
                      language={monacoLanguageFor(lang)}
                      theme="vs-dark"
                      value={codeText}
                      onMount={(editor) => {
                        editor.updateOptions({ fontSize: 14, lineNumbers: "on" });
                        setTimeout(() => editor.layout(), 0);
                      }}
                      options={{
                        readOnly: true,
                        minimap: { enabled: true },
                        wordWrap: "off",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        insertSpaces: true,
                      }}
                    />
                    {codeLoading && (
                      <div style={{
                        position:"absolute", inset:0,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        background:"rgba(0,0,0,0.35)", color:"#fff", fontWeight:600, fontSize:16
                      }}>
                        מחליף שפה…
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

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

function triggerBlobDownload(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
