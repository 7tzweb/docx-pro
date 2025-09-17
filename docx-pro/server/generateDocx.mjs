import HTMLtoDOCX from "html-to-docx";

/**
 * יצירת DOCX מתוך HTML + (אופציונלי) אוביקט פרויקט לנספח אוטומטי
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.html   // חלק 1 – ה-HTML מהעורך
 * @param {boolean} opts.rtl
 * @param {Object|null} opts.project // חלק 2 – נספח בקשות (אופציונלי)
 */
export async function generateDocxBuffer({ title = "Document", html = "", rtl = true, project = null } = {}) {
  const appendix = project ? buildAppendixFromProject(project, rtl) : "";

  const fullHtml =
    `<div style="font-family:Arial,Helvetica,sans-serif; ${rtl ? "direction:rtl; text-align:right;" : "direction:ltr; text-align:left;"}">
      ${html || ""}
      ${appendix}
    </div>`;

  const buffer = await HTMLtoDOCX(fullHtml, undefined, {
    table: { row: { cantSplit: true } },
    pageNumber: true,
    orientation: "portrait",
    margins: { top: 720, right: 720, bottom: 720, left: 720 }, // 2.54cm
  });

  return buffer;
}

/* ======================== helpers ======================== */

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const asTitle = (s) => esc(s).replace(/\s+/g, " ").trim();

function h2(txt) { return `<h2 style="margin:28px 0 6px; font-size:20px;">${asTitle(txt)}</h2>`; }
function h3(txt) { return `<h3 style="margin:16px 0 6px; font-size:16px;">${asTitle(txt)}</h3>`; }
function p(txt)  { return `<p style="margin:6px 0; font-size:12px; white-space:pre-wrap;">${esc(txt)}</p>`; }

/** טבלת 5 עמודות */
function table5(head, rows) {
  const th = (t) => `<th style="background:#dfe7f3; border:1px solid #999; padding:6px; font-size:12px;">${esc(t)}</th>`;
  const td = (t) => `<td style="border:1px solid #999; padding:6px; font-size:12px; vertical-align:top; word-break:break-word;">${t ?? ""}</td>`;

  const openRow  = (label) => `<tr><td colspan="5" style="background:#e6e6e6; border:1px solid #999; padding:6px; font-weight:700;">${esc(label)} — אלמנט פותח</td></tr>`;
  const closeRow = (label) => `<tr><td colspan="5" style="background:#e6e6e6; border:1px solid #999; padding:6px; font-weight:700;">${esc(label)} — אלמנט סוגר</td></tr>`;

  const bodyHtml = rows.map((r) => {
    if (r && r.__open)  return openRow(r.__open);
    if (r && r.__close) return closeRow(r.__close);
    return `<tr>${td(r[0])}${td(r[1])}${td(r[2])}${td(r[3])}${td(r[4])}</tr>`;
  }).join("");

  return `
    <table style="width:100%; border-collapse:collapse; margin:8px 0;">
      <thead><tr>${head.map(th).join("")}</tr></thead>
      <tbody>${bodyHtml}</tbody>
    </table>`;
}

function tryParseJSON(txt) {
  if (!txt || !String(txt).trim()) return undefined;
  try { return JSON.parse(txt); } catch { return undefined; }
}

/** בניית שורות מטבלת JSON (רקורסיבי) + אלמנט פותח/סוגר למבנים */
function buildRowsFromJson(value, labelForGroup) {
  const rows = [];
  const addRow = (name, type, mandatory = "yes") => rows.push([esc(name), "", mandatory, type, ""]);

  const walk = (val, name) => {
    if (Array.isArray(val)) {
      rows.push({ __open: name || labelForGroup });
      if (val.length > 0) walk(val[0], name ? `${name}[]` : "item");
      rows.push({ __close: name || labelForGroup });
      return;
    }
    const t = typeof val;
    if (val !== null && t === "object") {
      rows.push({ __open: name || labelForGroup });
      for (const k of Object.keys(val)) walk(val[k], k);
      rows.push({ __close: name || labelForGroup });
      return;
    }
    const type =
      t === "string" ? "String" :
      t === "number" ? "Number" :
      t === "boolean" ? "Boolean" :
      val === null    ? "Null"    : "String";
    addRow(name ?? "", type, "yes");
  };

  walk(value, labelForGroup);
  return rows;
}

/** Headers – מאחד stdHeaders + חופשיים */
function buildHeaderRows(req = {}) {
  const rows = [];
  const std = Array.isArray(req?.stdHeaders) ? req.stdHeaders : [];
  let extra = [];
  if (typeof req?.headers === "string" && req.headers.trim()) {
    const j = tryParseJSON(req.headers);
    if (j && typeof j === "object" && !Array.isArray(j)) extra = Object.keys(j);
    else extra = String(req.headers).split("\n").map((s) => s.trim()).filter(Boolean);
  }
  const names = [...new Set([...(std || []), ...(extra || [])])];
  for (const h of names) rows.push([esc(h), "לא רלוונטי", "yes", "String", ""]);
  return rows;
}

/** PATH – מתוך {curly} ב־URL */
function buildPathRowsFromUrl(url = "") {
  const rows = [];
  const m = String(url).match(/{([^}]+)}/g) || [];
  for (const token of m) rows.push([esc(token.slice(1, -1)), "", "yes", "String", ""]);
  return rows;
}

/** Query string – מתוך ?a=1&b=2 */
function buildQueryRowsFromUrl(url = "") {
  const rows = [];
  const qIndex = url.indexOf("?");
  if (qIndex === -1) return rows;
  const qs = url.slice(qIndex + 1);
  for (const part of qs.split("&")) {
    if (!part) continue;
    const [k] = part.split("=");
    if (!k) continue;
    rows.push([esc(decodeURIComponent(k)), "", "no", "String", ""]);
  }
  return rows;
}

/** נספח לכל בקשה */
function buildAppendixFromProject(project = {}, rtl = true) {
  const reqs = Array.isArray(project?.requests) ? project.requests : [];
  if (!reqs.length) return "";

  const title = project?.name ? `נספח API – ${project.name}` : "נספח API";
  const parts = [
    `<hr style="margin-top:24px; border:none; border-top:2px solid #ccc;" />`,
    h2(title),
  ];

  for (const r of reqs) {
    const method = String(r?.method || "GET").toUpperCase();
    const url    = String(r?.url || "/path");
    parts.push(h3(`${method} ${url}`));

    // כתובת הבקשה
    parts.push(h3("כתובת הבקשה"));
    parts.push(p(url));

    // summary/description/operationId
    const metaLines = [
      r?.summary ? `summary: ${r.summary}` : "",
      r?.description ? `description: ${r.description}` : "",
      r?.operationId ? `operationId: ${r.operationId}` : "",
    ].filter(Boolean).join("\n");
    if (metaLines) parts.push(p(metaLines));

    // Headers
    const headers = buildHeaderRows(r);
    if (headers.length) {
      parts.push(h3("Headers"));
      parts.push(table5(
        ["Field name","Description / value","Mandatory","Format","Source/Logic/Default value"],
        [{ __open: "RequestHeader" }, ...headers, { __close: "RequestHeader" }]
      ));
    }

    // PATH
    const pathRows = buildPathRowsFromUrl(url);
    if (pathRows.length) {
      parts.push(h3("PATH"));
      parts.push(table5(
        ["Field name","Description / value","Mandatory","Format","Source/Logic/Default value"],
        pathRows
      ));
    }

    // Query string
    const qsRows = buildQueryRowsFromUrl(url);
    if (qsRows.length) {
      parts.push(h3("Query string"));
      parts.push(table5(
        ["Field name","Description / value","Mandatory","Format","Source/Logic/Default value"],
        qsRows
      ));
    }

    // Body (רק אם המתודה לא GET ויש JSON בדוגמה)
    const reqBody = tryParseJSON(r?.request);
    if (method !== "GET" && reqBody !== undefined) {
      parts.push(h3("Body"));
      const bodyRows = buildRowsFromJson(reqBody, "Body");
      parts.push(table5(
        ["Field name","Description / value","Mandatory","Format","Source/Logic/Default value"],
        bodyRows
      ));
    }

    // Response
    const resBody = tryParseJSON(r?.response);
    if (resBody !== undefined) {
      parts.push(h3("Response"));
      const respRows = buildRowsFromJson(resBody, "Response");
      parts.push(table5(
        ["Field name","Description / value","Mandatory","Format","Source/Logic/Default value"],
        respRows.length ? [{ __open: "ResponseHeader" }, ...respRows, { __close: "ResponseHeader" }] : respRows
      ));
    }
  }

  return parts.join("\n");
}
