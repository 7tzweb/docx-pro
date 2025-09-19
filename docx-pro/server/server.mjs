import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

/* DB (lowdb) */
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import { nanoid } from "nanoid";

/* מודולים מפוצלים */
import { buildSwaggerFromProject } from "./buildSwagger.mjs";
import { generateDocxBuffer, buildAppendixFromProject } from "./generateDocx.mjs";
import { generateCodeFromProject } from "./generateCode.mjs";

/* YAML לפענוח הדבקות YAML */
import YAML from "yaml";

/* ====== INIT APP ====== */
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "20mb" }));

/* ====== INIT DB ====== */
const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbFile = join(dataDir, "projects.json");

const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { projects: [] });
await db.read();
db.data ||= { projects: [] };
await db.write();

/* ===== helpers ===== */
function parseSchemasText(text) {
  const raw = String(text || "").trim();
  if (!raw) return { object: {}, ok: true, kind: "empty" };

  // JSON first
  try {
    const obj = JSON.parse(raw);
    const clean = unwrapSchemasRoot(obj);
    if (clean && typeof clean === "object" && !Array.isArray(clean)) {
      return { object: clean, ok: true, kind: "json" };
    }
  } catch {}

  // YAML fallback
  try {
    const y = YAML.parse(raw);
    const clean = unwrapSchemasRoot(y);
    if (clean && typeof clean === "object" && !Array.isArray(clean)) {
      return { object: clean, ok: true, kind: "yaml" };
    }
    return { object: {}, ok: false, error: "YAML must be a mapping (key/value object)" };
  } catch (e) {
    return { object: {}, ok: false, error: String(e?.message || e) };
  }
}
function unwrapSchemasRoot(o) {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    const keys = Object.keys(o);
    if (keys.length === 1 && keys[0] === "schemas" && o.schemas && typeof o.schemas === "object") {
      return o.schemas;
    }
  }
  return o;
}

/* ====== PROJECTS REST ====== */
app.get("/api/projects", async (_req, res) => {
  await db.read();
  const list = db.data.projects.map(p => ({ id: p.id, name: p.name, updatedAt: p.updatedAt }));
  res.json({ projects: list });
});

app.get("/api/projects/:id", async (req, res) => {
  await db.read();
  const proj = db.data.projects.find(p => p.id === req.params.id);
  if (!proj) return res.status(404).json({ message: "Not found" });
  res.json({ project: proj });
});

app.post("/api/projects", async (req, res) => {
  const { name, introText = "", requests = [], extra = {}, managerEmail = "", swaggerDescription = "", jiraTicket = "", schema = "" } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ message: "name is required" });

  const parsed = parseSchemasText(schema);
  if (!parsed.ok) return res.status(400).json({ message: "Invalid schema", error: parsed.error });

  await db.read();
  const now = new Date().toISOString();
  const project = {
    id: nanoid(12),
    name: String(name).trim(),
    introText,
    requests,
    extra,
    managerEmail,
    swaggerDescription,
    jiraTicket: String(jiraTicket || "").trim(),
    schema: String(schema || ""),   // המקור
    schemas: parsed.object,         // האובייקט הנקי
    createdAt: now,
    updatedAt: now
  };
  db.data.projects.push(project);
  await db.write();

  const swagger = buildSwaggerFromProject(project);
  res.json({ project, swagger });
});

app.put("/api/projects/:id", async (req, res) => {
  const id = req.params.id;
  await db.read();
  const idx = db.data.projects.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ message: "Not found" });

  const { name, introText, requests, extra, managerEmail, swaggerDescription, jiraTicket, schema } = req.body || {};

  let schemaPatch = {};
  if (schema !== undefined) {
    const parsed = parseSchemasText(schema);
    if (!parsed.ok) return res.status(400).json({ message: "Invalid schema", error: parsed.error });
    schemaPatch = { schema: String(schema || ""), schemas: parsed.object };
  }

  const curr = db.data.projects[idx];
  const updated = {
    ...curr,
    ...(name !== undefined ? { name } : {}),
    ...(introText !== undefined ? { introText } : {}),
    ...(requests !== undefined ? { requests } : {}),
    ...(extra !== undefined ? { extra } : {}),
    ...(managerEmail !== undefined ? { managerEmail } : {}),
    ...(swaggerDescription !== undefined ? { swaggerDescription } : {}),
    ...(jiraTicket !== undefined ? { jiraTicket: String(jiraTicket || "").trim() } : {}),
    ...schemaPatch,
    updatedAt: new Date().toISOString()
  };
  db.data.projects[idx] = updated;
  await db.write();

  const swagger = buildSwaggerFromProject(updated);
  res.json({ project: updated, swagger });
});

/* Swagger לפי פרויקט */
app.get("/api/projects/:id/swagger", async (req, res) => {
  await db.read();
  const proj = db.data.projects.find(p => p.id === req.params.id);
  if (!proj) return res.status(404).json({ message: "Not found" });
  const swagger = buildSwaggerFromProject(proj);
  res.type("text/yaml").send(swagger);
});

/* ====== Appendix HTML ====== */
app.get("/api/projects/:id/appendix", async (req, res) => {
  await db.read();
  const proj = db.data.projects.find(p => p.id === req.params.id);
  if (!proj) return res.status(404).json({ message: "Not found" });
  const rtl = String(req.query.rtl ?? "true") !== "false";
  const html = buildAppendixFromProject(proj, rtl) || "";
  res.type("text/html").send(html);
});

/* ====== DOCX ====== */
app.post("/api/generate", async (req, res) => {
  try {
    let { title, html, rtl, project, projectId } = req.body || {};
    await db.read();

    if (!project && projectId) {
      project = db.data.projects.find(p => p.id === projectId) || null;
    }
    if (project?.id) {
      const fromDb = db.data.projects.find(p => p.id === project.id);
      if (fromDb) project = fromDb;
    }
    if (!project && db.data.projects.length === 1) {
      project = db.data.projects[0];
    }

    const buffer = await generateDocxBuffer({ title, html, rtl, project });
    const safe = String(title || "Document").replace(/[\\/:*?"<>|]/g, " ").trim() || "Document";
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(safe)}.docx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "DOCX generation failed", error: String(err) });
  }
});

/* ====== יצירת קוד ====== */
app.post("/api/generate-code", async (req, res) => {
  try {
    await db.read();
    const language = req.body?.language || "node-express";
    let project = req.body?.project;

    if (!project && req.body?.projectId) {
      project = db.data.projects.find(p => p.id === req.body.projectId);
    }
    if (!project) return res.status(400).json({ message: "project or projectId is required" });

    const code = generateCodeFromProject(project, language);
    res.json({ code, language });
  } catch (e) {
    res.status(500).json({ message: "code generation failed", error: String(e) });
  }
});

app.listen(4000, () => console.log("API listening on http://localhost:4000"));
