import HTMLtoDOCX from "html-to-docx";
import { decode } from "html-entities";

export async function generateDocxBuffer({ title = "Document", html = "", rtl = true }) {
  const decoded = decode(html, { level: "html5" }).replace(/&nbsp;/g, "\u00A0");
  const pageHtml = `
    <!doctype html>
    <html lang="${rtl ? "he" : "en"}" dir="${rtl ? "rtl" : "ltr"}">
      <head>
        <meta charset="utf-8"/>
        <style>
          @page { size: A4; margin: 20mm; }
          body { direction: ${rtl ? "rtl" : "ltr"}; unicode-bidi: embed;
                 font-family: "Calibri","Arial","Noto Sans Hebrew",sans-serif;
                 font-size: 11pt; line-height: 1.6; color: #000; }
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
    </html>`;
  const buffer = await HTMLtoDOCX(pageHtml, null, {
    margin: { top: 720, right: 720, bottom: 720, left: 720 },
    table: { row: { cantSplit: true } },
    footer: false, header: false, pageNumber: false,
    font: "Calibri", rtl
  });
  return Buffer.from(buffer);
}
