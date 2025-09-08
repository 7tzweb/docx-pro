import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import HTMLtoDOCX from "html-to-docx";
import { decode } from "html-entities";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "20mb" }));

app.post("/api/generate", async (req, res) => {
  const { title = "Document", html = "", rtl = true } = req.body || {};

  // 1) פענוח ישויות HTML (כולל &nbsp;) + תיקון לרווח קשיח אמיתי
  const decoded = decode(html, { level: "html5" });
  const withNbsp = decoded.replace(/&nbsp;/g, "\u00A0");

  // 2) מעטפת HTML עם CSS שמכויל ל-Word (RTL, רשימות, טבלאות, קישורים, פסקאות)
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
            font-size: 11pt;
            line-height: 1.6;
            color: #000;
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
      <body>
        ${withNbsp}
      </body>
    </html>
  `;

  try {
    const buffer = await HTMLtoDOCX(pageHtml, null, {
      // מרווחים ב־twips (720 = חצי אינץ', אבל @page מגדיר 20mm – זה לגיבוי בלבד)
      margin: { top: 720, right: 720, bottom: 720, left: 720 },
      table: { row: { cantSplit: true } },
      footer: false,
      header: false,
      pageNumber: false,
      font: "Calibri",
      // גרסאות חדשות תומכות גם במפתח rtl/bidi; אם ייתעלם – ה־HTML למעלה כבר מכתיב RTL
      rtl: rtl
    });

    const safe = String(title).replace(/[\\/:*?"<>|]/g, " ").trim() || "Document";
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(safe)}.docx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "DOCX generation failed", error: String(err) });
  }
});

app.listen(4000, () =>
  console.log("DOCX API listening on http://localhost:4000")
);
