import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import HTMLtoDOCX from "html-to-docx";
import { decode } from "html-entities";

/* === DB קבצי פשוט עם lowdb === */
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import { nanoid } from "nanoid";

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

/* ====== helpers ====== */
const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").toLowerCase());

/* ====== PROJECTS REST ====== */
// list
app.get("/api/projects", async (_req, res) => {
  await db.read();
  const list = db.data.projects.map((p) => ({
    id: p.id,
    name: p.name,
    updatedAt: p.updatedAt,
  }));
  res.json({ projects: list });
});

// get by id
app.get("/api/projects/:id", async (req, res) => {
  await db.read();
  const proj = db.data.projects.find((p) => p.id === req.params.id);
  if (!proj) return res.status(404).json({ message: "Not found" });
  res.json({ project: proj });
});

// create
app.post("/api/projects", async (req, res) => {
  const { name, managerEmail, introText = "", requests = [], extra = {} } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "name is required" });
  }
  if (!isValidEmail(managerEmail)) {
    return res.status(400).json({ message: "invalid managerEmail" });
  }

  await db.read();
  const now = new Date().toISOString();
  const project = {
    id: nanoid(12),
    name: String(name).trim(),
    managerEmail: String(managerEmail).trim(),
    introText,
    requests, // [{id?, url, method, headers, request, response, stdHeaders?}]
    extra, // מקום לכל דבר עתידי
    createdAt: now,
    updatedAt: now,
  };
  db.data.projects.push(project);
  await db.write();
  res.json({ project });
});

// update (full replace)
app.put("/api/projects/:id", async (req, res) => {
  const id = req.params.id;
  await db.read();
  const idx = db.data.projects.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ message: "Not found" });

  const { name, managerEmail, introText, requests, extra } = req.body || {};
  if (name !== undefined && !String(name).trim()) {
    return res.status(400).json({ message: "name is required" });
  }
  if (managerEmail !== undefined && !isValidEmail(managerEmail)) {
    return res.status(400).json({ message: "invalid managerEmail" });
  }

  const curr = db.data.projects[idx];
  const updated = {
    ...curr,
    ...(name !== undefined ? { name: String(name).trim() } : {}),
    ...(managerEmail !== undefined ? { managerEmail: String(managerEmail).trim() } : {}),
    ...(introText !== undefined ? { introText } : {}),
    ...(requests !== undefined ? { requests } : {}),
    ...(extra !== undefined ? { extra } : {}),
    updatedAt: new Date().toISOString(),
  };
  db.data.projects[idx] = updated;
  await db.write();
  res.json({ project: updated });
});

/* ====== DOCX (כפי שהיה) ====== */
app.post("/api/generate", async (req, res) => {
  const { title = "Document", html = "", rtl = true } = req.body || {};
  const decoded = decode(html, { level: "html5" }).replace(/&nbsp;/g, "\u00A0");

  const pageHtml = `
    <!doctype html>
    <html lang="${rtl ? "he" : "en"}" dir="${rtl ? "rtl" : "ltr"}">
      <head>
        <meta charset="utf-8"/>
        <style>
          @page { size: A4; margin: 20mm; }
          body {
            direction: ${rtl ? "rtl" : "ltr"};
            unicode-bidi: embed;
            font-family: "Calibri","Arial","Noto Sans Hebrew",sans-serif;
            font-size: 11pt; line-height: 1.6; color: #000;
          }
          p { margin: 0 0 8pt 0; }
          h1 { font-size: 20pt; margin: 0 0 12pt 0; }
          h2 { font-size: 16pt; margin: 0 0 10pt 0; }
          h3 { font-size: 14pt; margin: 0 0 8pt 0; }
          ul,ol { margin: 0 0 8pt 0; padding-inline-start: 18pt; }
          li { margin: 0 0 4pt 0; }
          table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
          th,td { border: 1px solid #999; padding: 4pt 6pt; vertical-align: top; }
          a { color:#0563C1; text-decoration: underline; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>${decoded}</body>
    </html>
  `;

  try {
    const buffer = await HTMLtoDOCX(pageHtml, null, {
      margin: { top: 720, right: 720, bottom: 720, left: 720 },
      table: { row: { cantSplit: true } },
      footer: false,
      header: false,
      pageNumber: false,
      font: "Calibri",
      rtl,
    });

    const safe = String(title).replace(/[\\/:*?"<>|]/g, " ").trim() || "Document";
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(safe)}.docx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "DOCX generation failed", error: String(err) });
  }
});

/* ====== MOCKS: Swagger & Code (נשארים) ====== */
app.post("/api/generate-swagger", async (req, res) => {
  const { title = "API", format = "yaml" } = req.body || {};
  const yaml = `openapi: 3.0.3
info:
  title: ${String(title).replace(/\n/g, " ")}
  version: 1.0.0
  description: Generated preview from specification
servers:
  - url: https://api.example.com
paths:
  /items:
    get:
      summary: List items
      responses:
        '200':
          description: OK
`;
  if (format === "json") {
    return res.json({
      swagger: JSON.stringify(
        {
          openapi: "3.0.3",
          info: { title, version: "1.0.0", description: "Generated preview from specification" },
          servers: [{ url: "https://api.example.com" }],
          paths: { "/items": { get: { summary: "List items", responses: { "200": { description: "OK" } } } } },
        },
        null,
        2
      ),
    });
  }
  res.json({ swagger: yaml });
});

app.post("/api/generate-code", async (req, res) => {
  const { language = "node-express" } = req.body || {};
  const templates = {
    "node-express": `// generated from swagger (node + express)
import express from "express";
const app = express();
app.use(express.json());
app.get("/items", (req,res) => res.json([{id:1,name:"item"}]));
app.listen(8080, () => console.log("API on 8080"));`,

    // ‎.NET – שמרתי את התבנית שלך והוספתי אליאס dotnet-webapi
    "csharp-aspnet": `// generated from swagger (csharp + aspnet minimal)
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
app.MapGet("/items", () => new[]{ new { id=1, name="item"} });
app.Run();`,

    "dotnet-webapi": `// generated from swagger (csharp + aspnet minimal)
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
app.MapGet("/items", () => new[]{ new { id=1, name="item"} });
app.Run();`,

    "python-fastapi": `# generated from swagger (python + fastapi)
from fastapi import FastAPI
app = FastAPI()
@app.get("/items")
def items():
    return [{"id": 1, "name": "item"}]`,

    "java-spring": `// generated from swagger (java + spring boot)
@RestController
public class ItemsController {
  @GetMapping("/items")
  public List<Map<String,Object>> items() {
    return List.of(Map.of("id",1,"name","item"));
  }
}`,

    "go-chi": `// generated from swagger (go + chi)
package main
import (
  "net/http"
  "github.com/go-chi/chi/v5"
  "encoding/json"
)
func main(){
  r := chi.NewRouter()
  r.Get("/items", func(w http.ResponseWriter, r *http.Request){
    json.NewEncoder(w).Encode([]map[string]any{{"id":1,"name":"item"}})
  })
  http.ListenAndServe(":8080", r)
}`,

    "php-laravel": `// generated from swagger (php + laravel)
// routes/api.php
Route::get('/items', function () {
    return response()->json([['id'=>1,'name'=>'item']]);
});`,
  };

  res.json({ code: templates[language] || templates["node-express"], language });
});

app.listen(4000, () =>
  console.log("API listening on http://localhost:4000  (Projects + DOCX + Swagger + Code)")
);
