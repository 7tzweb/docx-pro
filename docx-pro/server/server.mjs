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
import { generateDocxBuffer } from "./generateDocx.mjs";
import { generateCodeFromProject } from "./generateCode.mjs";   // ← שינוי שם הייבוא

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
  const { name, introText = "", requests = [], extra = {}, managerEmail = "", swaggerDescription = "", jiraTicket = "" } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ message: "name is required" });

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
    createdAt: now,
    updatedAt: now
  };
  db.data.projects.push(project);
  await db.write();

  const swagger = buildSwaggerFromProject(project); // נשאר
  res.json({ project, swagger });
});

app.put("/api/projects/:id", async (req, res) => {
  const id = req.params.id;
  await db.read();
  const idx = db.data.projects.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ message: "Not found" });

  const { name, introText, requests, extra, managerEmail, swaggerDescription, jiraTicket } = req.body || {};
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
    updatedAt: new Date().toISOString()
  };
  db.data.projects[idx] = updated;
  await db.write();

  const swagger = buildSwaggerFromProject(updated); // נשאר
  res.json({ project: updated, swagger });
});

/* Swagger לפי פרויקט – ללא שינוי */
app.get("/api/projects/:id/swagger", async (req, res) => {
  await db.read();
  const proj = db.data.projects.find(p => p.id === req.params.id);
  if (!proj) return res.status(404).json({ message: "Not found" });
  const swagger = buildSwaggerFromProject(proj);
  res.type("text/yaml").send(swagger);
});

/* ====== DOCX ====== */
app.post("/api/generate", async (req, res) => {
  try {
    const buffer = await generateDocxBuffer(req.body || {});
    const safe = String(req.body?.title || "Document").replace(/[\\/:*?"<>|]/g, " ").trim() || "Document";
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(safe)}.docx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "DOCX generation failed", error: String(err) });
  }
});

/* ====== יצירת קוד מתוך האובייקט ====== */
app.post("/api/generate-code", async (req, res) => {
  try {
    await db.read();
    const language = req.body?.language || "node-express";
    let project = req.body?.project;

    // אם הגיע projectId – נטען מה-DB
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
