/* בניית Swagger (YAML) מתוך אובייקט פרויקט */
import YAML from "yaml";

const IND = (n) => "  ".repeat(n);

const STD_HEADERS = new Set([
  "x-transaction-id","x-message-id","x-trace-id","x-channel-id",
  "x-user-id","x-app-id","x-uuid-id","x-ip-id"
]);

function contactNameFromEmail(email = "") {
  const local = String(email).trim().split("@")[0] || "";
  if (!local) return "";
  return local.includes(".") ? local.split(".").filter(Boolean).join(" ") : local;
}

function buildComponentsParameters(allHeaders) {
  const lines = [];
  lines.push(`${IND(1)}# jwt security per method`);
  lines.push(`${IND(1)}#security:`);
  lines.push(`${IND(1)}#  - BearerAuth: []`);
  lines.push(`${IND(1)}parameters:`);
  lines.push(`${IND(2)}originalUserId:`);
  lines.push(`${IND(3)}name: originalUserId`);
  lines.push(`${IND(3)}in: path`);
  lines.push(`${IND(3)}schema:`);
  lines.push(`${IND(4)}$ref: '#/components/schemas/User-id-ref'`);
  lines.push(`${IND(3)}description: Qualifier Reference`);
  lines.push(`${IND(3)}required: true`);

  const bitbucket = (name) =>
    `'https://bitbucket.hq.il.tleumi/projects/PLA/repos/openapi-dictionaries/raw/Bank_Leumi_Org/Leumi_Base_Type_Components/1.6.yaml#/components/parameters/${name}'`;

  for (const h of allHeaders) {
    if (STD_HEADERS.has(h)) {
      lines.push(`${IND(2)}${h}:`);
      lines.push(`${IND(3)}$ref: ${bitbucket(h)}`);
    } else {
      lines.push(`${IND(2)}${h}:`);
      lines.push(`${IND(3)}name: ${h}`);
      lines.push(`${IND(3)}in: header`);
      lines.push(`${IND(3)}required: false`);
      lines.push(`${IND(3)}schema:`);
      lines.push(`${IND(4)}type: string`);
    }
  }
  return lines.join("\n");
}

function buildPathFromRequest(req) {
  const url = String(req?.url || "/path").trim() || "/path";
  const method = String(req?.method || "GET").toLowerCase();

  const std = Array.isArray(req?.stdHeaders) ? req.stdHeaders : (Array.isArray(req?.selectedHeaders) ? req.selectedHeaders : []);
  let extra = [];
  try { const obj = JSON.parse(req?.headers || "{}"); extra = Object.keys(obj || {}); } catch {}

  const uniqueHeaders = [...new Set([...(std||[]), ...(extra||[])])];

  const lines = [];
  lines.push(`${IND(1)}${url}:`);
  lines.push(`${IND(2)}${method}:`);
  lines.push(`${IND(3)}tags:`);
  lines.push(`${IND(4)}- info`);
  lines.push(`${IND(3)}summary: ${req?.summary ? String(req.summary) : `Auto summary for ${method.toUpperCase()} ${url}`}`);
  lines.push(`${IND(3)}description: ${req?.description ? String(req.description) : `Auto description for ${method.toUpperCase()} ${url}`}`);
  lines.push(`${IND(3)}operationId: ${req?.operationId ? String(req.operationId) : (method + url.replace(/[\/{}-]+/g,"_"))}`);
  lines.push(`${IND(3)}# jwt security per method`);
  lines.push(`${IND(3)}#security:`);
  lines.push(`${IND(3)}#  - BearerAuth: []`);
  if (uniqueHeaders.length) {
    lines.push(`${IND(3)}parameters:`);
    for (const h of uniqueHeaders) lines.push(`${IND(4)}- $ref: '#/components/parameters/${h}'`);
  }
  lines.push(`${IND(3)}responses:`);
  lines.push(`${IND(4)}'200':`);
  lines.push(`${IND(5)}description: Successful`);
  return lines.join("\n");
}

function buildVitalityPing(extra = {}) {
  const lines = [];
  if (extra?.vitality) {
    lines.push(`${IND(1)}/vitality:`);
    lines.push(`${IND(2)}get:`);
    lines.push(`${IND(3)}summary: Service status endpoint. Indication that the service actually cant do what it was designed to do.`);
    lines.push(`${IND(3)}description: Indication that the service actually cant do what it was designed to do.`);
    lines.push(`${IND(3)}tags:`);
    lines.push(`${IND(4)}- ping`);
    lines.push(`${IND(3)}responses:`);
    lines.push(`${IND(4)}'200':`);
    lines.push(`${IND(5)}description: Success`);
    lines.push(`${IND(3)}operationId: getMyVitality`);
  }
  if (extra?.ping) {
    lines.push(`${IND(1)}/Ping:`);
    lines.push(`${IND(2)}get:`);
    lines.push(`${IND(3)}summary: Your GET endpoint.`);
    lines.push(`${IND(3)}description: Validate that the connection to te server is alive (kept alive)`);
    lines.push(`${IND(3)}tags:`);
    lines.push(`${IND(4)}- ping`);
    lines.push(`${IND(3)}responses:`);
    lines.push(`${IND(4)}'200':`);
    lines.push(`${IND(5)}description: Success`);
    lines.push(`${IND(3)}operationId: getMyPing`);
  }
  return lines.join("\n");
}

/* הזרקת סכמות הפרויקט אל components.schemas */
function emitProjectSchemasBlock(project = {}) {
  const obj = project?.schemas;
  if (!obj || typeof obj !== "object" || Array.isArray(obj) || !Object.keys(obj).length) return "";
  const yaml = YAML.stringify(obj, { indent: 2 }).trimEnd().split("\n");
  const lines = [];
  for (const line of yaml) lines.push(IND(2) + line);
  return lines.join("\n");
}

export function buildSwaggerFromProject(project = {}) {
  const name = String(project?.name || "API").trim();
  const desc = String(project?.swaggerDescription || "").trim();
  const email = String(project?.managerEmail || "").trim();
  const contactName = contactNameFromEmail(email) || name;
  const jira = String(project?.jiraTicket || "").trim(); // ← נשלף מהפרויקט

  const headersSet = new Set();
  for (const r of project?.requests || []) {
    (Array.isArray(r?.stdHeaders) ? r.stdHeaders : []).forEach(h => headersSet.add(h));
    try {
      const extra = JSON.parse(r?.headers || "{}");
      Object.keys(extra || {}).forEach(h => headersSet.add(h));
    } catch {}
  }
  const allHeaders = [...headersSet];

  const y = [];
  y.push(`openapi: 3.0.3`);
  y.push(`info:`);
  y.push(`${IND(1)}version: 1.0.0`);
  y.push(`${IND(1)}title: ${name}`);
  y.push(`${IND(1)}description: ${desc || "—"}`);
  y.push(`${IND(1)}contact:`);
  y.push(`${IND(2)}name: ${contactName}`);
  y.push(`${IND(2)}email: ${email || "api@example.com"}`);
  y.push(`${IND(2)}# leumi openapi extensions`);
  y.push(`${IND(1)}x-jira-ticket: ${jira || "APIA-8584"}`); // ← מוזרק מה-UI (עם fallback)
  y.push(`${IND(1)}x-api-template: TMPLT_Base_1.2.0 # do not change`);
  y.push(`${IND(1)}x-api-environment: campus  # default: campus`);
  y.push(`${IND(1)}x-api-organization: leumi #default: leumi`);
  y.push(`${IND(1)}x-apigee-server:  leuminp  #leumitest, default leuminp`);
  y.push(`${IND(1)}x-proxy-name: "${name}" # final proxy name in apigee`);
  y.push(``);
  y.push(`# instructions`);
  y.push(`# 1. all swagger files must be based on the current version of the API Template`);
  y.push(`# 2. all string placed in <- ->  should be replaced with your values`);
  y.push(`# 3. all code is CamelCase syntex`);
  y.push(`# 4. objects start with uppercase`);
  y.push(`# 5. fields start with lowercase`);
  y.push(`# 6. service domain names come from UrlExcel`);
  y.push(`# 7. qualifier names come from UrlExcel`);
  y.push(`# 8. r-reference-id is the primary id`);
  y.push(`# 9. q-reference-id is the secondary id`);
  y.push(`# 10. tags are from the list in UrlExcel`);
  y.push(`# 11. define types by using the dictionaries : BaseTypes, Business etc where possible`);
  y.push(`# 12. define header params for request and response`);
  y.push(`# 13. never finish object definition with additionalProperties: true`);
  y.push(``);
  y.push(`tags: # do not change`);
  y.push(`- name: AAB`);
  y.push(`${IND(1)}description: AAB approved Swagger`);
  y.push(``);
  y.push(`servers:`);
  y.push(`${IND(1)}# added apigee setup - only change when api version changes`);
  y.push(``);
  y.push(`paths:`);

  for (const r of project?.requests || []) y.push(buildPathFromRequest(r));
  const extraPaths = buildVitalityPing(project?.extra || {});
  if (extraPaths) y.push(extraPaths);

  y.push(``);
  y.push(`security:`);
  y.push(`${IND(1)}- ApiKeyAuth: []`);
  y.push(``);
  y.push(`components:`);
  y.push(`${IND(1)}securitySchemes:`);
  y.push(`${IND(2)}ApiKeyAuth:`);
  y.push(`${IND(3)}name: X-APG-APIKey`);
  y.push(`${IND(3)}type: apiKey`);
  y.push(`${IND(3)}in: header`);
  y.push(`${IND(2)}BearerAuth:`);
  y.push(`${IND(3)}type: http`);
  y.push(`${IND(3)}scheme: bearer`);
  y.push(`${IND(3)}bearerFormat: JWT`);
  y.push(``);
  y.push(`${IND(1)}schemas:`);
  y.push(`${IND(2)}User-id-ref:`);
  y.push(`${IND(3)}type: string`);
  y.push(`${IND(3)}example: K4F6TRW`);

  // === הזרקה של סכמות הפרויקט (בסוף הקובץ תחת components.schemas) ===
  const schemasBlock = emitProjectSchemasBlock(project);
  if (schemasBlock) y.push(schemasBlock);

  y.push(``);
  y.push(buildComponentsParameters(allHeaders));
  
  return y.join("\n");
}
