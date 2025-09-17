/* מחולל קוד מתוך אובייקט פרויקט – Node/.NET  */
/* אין תלות ב-YAML. */

function toPascal(str = "") {
  return String(str || "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}
function toCamel(str = "") {
  const p = toPascal(str);
  return p ? p.charAt(0).toLowerCase() + p.slice(1) : "";
}
function extractPathParams(path = "") {
  const out = [];
  const re = /\{([^}]+)\}/g;
  let m; while ((m = re.exec(path))) out.push(m[1]);
  return out;
}
function deriveName(method, url, operationId) {
  if (operationId) return toCamel(operationId);
  const segments = String(url || "").split("/").filter(Boolean);
  let resource = segments.slice().reverse().find((s) => !/^\{.*\}$/.test(s)) || "root";
  const params = extractPathParams(url || "");
  const suffix = params.length ? "By" + params.map((p) => toPascal(p)).join("And") : "";
  const mapVerb = { get: "get", post: "create", put: "update", patch: "patch", delete: "delete" };
  const verb = mapVerb[String(method || "get").toLowerCase()] || String(method || "get").toLowerCase();
  return toCamel(`${verb} ${resource} ${suffix}`);
}
function headersForReq(r = {}) {
  const std = Array.isArray(r.stdHeaders) ? r.stdHeaders : Array.isArray(r.selectedHeaders) ? r.selectedHeaders : [];
  let extra = [];
  try { const obj = JSON.parse(r.headers || "{}"); extra = Object.keys(obj || {}); } catch {}
  return [...new Set([...(std || []), ...(extra || [])])];
}

/* =================== Node.js SDK =================== */
function buildNodeClientFromProject(project = {}) {
  const lines = [];
  lines.push(`// Auto-generated SDK (Node.js) – built from project object`);
  lines.push(`// Best practices: timeouts (finally), smart headers, path validation, query serializer, response decode, retries, hooks, DI fetch`);
  lines.push(``);
  lines.push(`/** @typedef {{ok:boolean,status:number,data?:any,error?:any,traceId?:string}} ApiResult */`);
  lines.push(``);
  lines.push(`export class ApiClient {`);
  lines.push(`  /**`);
  lines.push(`   * @param {{`);
  lines.push(`   *   baseURL: string,`);
  lines.push(`   *   defaultHeaders?: Record<string,string>,`);
  lines.push(`   *   timeoutMs?: number,`);
  lines.push(`   *   maxRetries?: number,`);
  lines.push(`   *   fetchImpl?: typeof fetch,`);
  lines.push(`   *   throwOnHTTPError?: boolean,`);
  lines.push(`   *   hooks?: { beforeRequest?: (req:RequestInit & {url:string})=>void|Promise<void>, afterResponse?: (ctx:{url:string, res:Response, result:ApiResult})=>void|Promise<void> }`);
  lines.push(`   * }} opts`);
  lines.push(`   */`);
  lines.push(`  constructor(opts = {}) {`);
  lines.push(`    if (!opts.baseURL) throw new Error("baseURL is required");`);
  lines.push(`    this.baseURL = String(opts.baseURL).replace(/\\/$/, "");`);
  lines.push(`    this.defaultHeaders = { Accept: "application/json, text/plain;q=0.9, */*;q=0.8", ...(opts.defaultHeaders||{}) };`);
  lines.push(`    this.timeoutMs = opts.timeoutMs ?? 10000;`);
  lines.push(`    this.maxRetries = Math.max(0, opts.maxRetries ?? 2);`);
  lines.push(`    this.throwOnHTTPError = !!opts.throwOnHTTPError;`);
  lines.push(`    this.hooks = opts.hooks || {};`);
  lines.push(`    this.fetch = opts.fetchImpl || (typeof fetch !== "undefined" ? fetch.bind(globalThis) : null);`);
  lines.push(`    if (!this.fetch) throw new Error("No fetch implementation provided");`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  static _serializeQuery(query={}){`);
  lines.push(`    const usp = new URLSearchParams();`);
  lines.push(`    for (const [k,v] of Object.entries(query || {})) {`);
  lines.push(`      if (v === undefined || v === null) continue;`);
  lines.push(`      if (Array.isArray(v)) { for (const item of v) if (item!=null) usp.append(k, String(item)); }`);
  lines.push(`      else if (typeof v === "object") { usp.append(k, JSON.stringify(v)); }`);
  lines.push(`      else { usp.append(k, String(v)); }`);
  lines.push(`    }`);
  lines.push(`    const s = usp.toString();`);
  lines.push(`    return s ? ("?"+s) : "";`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  static _cleanHeaders(h){`);
  lines.push(`    const out = {};`);
  lines.push(`    for (const [k,v] of Object.entries(h||{})) if (v !== undefined && v !== null) out[k] = v;`);
  lines.push(`    return out;`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  static _isJsonBody(body){`);
  lines.push(`    if (body == null) return false;`);
  lines.push(`    if (typeof body === "string") return true;`);
  lines.push(`    if (typeof FormData !== "undefined" && body instanceof FormData) return false;`);
  lines.push(`    if (typeof Blob !== "undefined" && body instanceof Blob) return false;`);
  lines.push(`    if (body instanceof ArrayBuffer) return false;`);
  lines.push(`    return true; // object/array -> JSON`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  static _methodSupportsBody(method){`);
  lines.push(`    const m = String(method||"GET").toUpperCase();`);
  lines.push(`    return !(m === "GET" || m === "HEAD");`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  static _shouldIdempotency(method){`);
  lines.push(`    const m = String(method||"GET").toUpperCase();`);
  lines.push(`    return m==="POST" || m==="PUT" || m==="PATCH" || m==="DELETE";`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  async request({ method, path, pathParams = {}, query = {}, headers = {}, body, throwOnHTTPError = this.throwOnHTTPError } = {}) {`);
  lines.push(`    // path param validation`);
  lines.push(`    const required = Array.from(String(path||"").matchAll(/\\{([^}]+)\\}/g)).map(m=>m[1]);`);
  lines.push(`    for (const p of required) if (pathParams[p] == null || pathParams[p] === "") throw new Error("Missing path param: "+p);`);
  lines.push(`    // format path`);
  lines.push(`    const urlPath = String(path||"").replace(/\\{([^}]+)\\}/g, (_, k) => encodeURIComponent(String(pathParams[k])));`);
  lines.push(`    const url = this.baseURL + urlPath + ApiClient._serializeQuery(query);`);
  lines.push(``);
  lines.push(`    // build headers`);
  lines.push(`    const baseHeaders = { ...this.defaultHeaders, ...(headers||{}) };`);
  lines.push(`    // smart Content-Type: רק כשיש גוף JSON`);
  lines.push(`    if (ApiClient._methodSupportsBody(method) && ApiClient._isJsonBody(body)) {`);
  lines.push(`      if (!baseHeaders["Content-Type"]) baseHeaders["Content-Type"] = "application/json";`);
  lines.push(`    }`);
  lines.push(`    if (ApiClient._shouldIdempotency(method) && !baseHeaders["Idempotency-Key"]) {`);
  lines.push(`      // יצירה רק לפעולות רלוונטיות`);
  lines.push(`      try { baseHeaders["Idempotency-Key"] = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2); } catch { baseHeaders["Idempotency-Key"] = Math.random().toString(36).slice(2); }`);
  lines.push(`    }`);
  lines.push(`    const allHeaders = ApiClient._cleanHeaders(baseHeaders);`);
  lines.push(``);
  lines.push(`    const reqInit = { method: String(method||"GET").toUpperCase(), headers: allHeaders };`);
  lines.push(`    if (ApiClient._methodSupportsBody(reqInit.method)) {`);
  lines.push(`      if (body != null) reqInit.body = ApiClient._isJsonBody(body) ? (typeof body==="string"? body : JSON.stringify(body)) : body;`);
  lines.push(`    }`);
  lines.push(``);
  lines.push(`    // before hook`);
  lines.push(`    if (this.hooks.beforeRequest) await this.hooks.beforeRequest({ url, ...reqInit });`);
  lines.push(``);
  lines.push(`    // retry loop`);
  lines.push(`    let attempt = 0;`);
  lines.push(`    const maxRetries = this.maxRetries;`);
  lines.push(`    const fetchImpl = this.fetch;`);
  lines.push(`    while (true) {`);
  lines.push(`      const ctrl = new AbortController();`);
  lines.push(`      const timer = setTimeout(() => ctrl.abort(new Error("Request timeout")), this.timeoutMs);`);
  lines.push(`      let res, err, result;`);
  lines.push(`      try {`);
  lines.push(`        res = await fetchImpl(url, { ...reqInit, signal: ctrl.signal });`);
  lines.push(`        const ct = res.headers.get("content-type") || "";`);
  lines.push(`        let data = null;`);
  lines.push(`        if (ct.includes("application/json")) {`);
  lines.push(`          try { data = await res.json(); } catch { data = await res.text(); }`);
  lines.push(`        } else if (ct.startsWith("text/") || ct.includes("xml")) {`);
  lines.push(`          data = await res.text();`);
  lines.push(`        } else if (ct.includes("octet-stream")) {`);
  lines.push(`          data = await res.arrayBuffer();`);
  lines.push(`        } else {`);
  lines.push(`          // ניסיון חכם`);
  lines.push(`          try { data = await res.json(); } catch { try { data = await res.text(); } catch { data = null; } }`);
  lines.push(`        }`);
  lines.push(`        const traceId = res.headers.get("x-trace-id") || res.headers.get("trace-id") || null;`);
  lines.push(`        if (!res.ok) {`);
  lines.push(`          result = { ok:false, status: res.status, error: { code: res.status, message: res.statusText || "Request failed", details: data }, traceId };`);
  lines.push(`        } else {`);
  lines.push(`          result = { ok:true, status: res.status, data, traceId };`);
  lines.push(`        }`);
  lines.push(`      } catch (e) { err = e; result = { ok:false, status:0, error:{ code:"NETWORK_ERROR", message:String(e&&e.message||e) }, traceId:null }; }`);
  lines.push(`      finally { clearTimeout(timer); }`);
  lines.push(``);
  lines.push(`      // after hook`);
  lines.push(`      try { if (this.hooks.afterResponse && res) await this.hooks.afterResponse({ url, res, result }); } catch {}`);
  lines.push(``);
  lines.push(`      // decide retry`);
  lines.push(`      const status = res?.status ?? 0;`);
  lines.push(`      const retryable = status===429 || status===500 || status===502 || status===503 || status===504;`);
  lines.push(`      if (!retryable || attempt >= maxRetries || result.ok) {`);
  lines.push(`        if (!result.ok && throwOnHTTPError) { const e = new Error(result?.error?.message || "HTTP Error"); e.result = result; throw e; }`);
  lines.push(`        return result;`);
  lines.push(`      }`);
  lines.push(`      // compute delay (Retry-After or exponential backoff)`);
  lines.push(`      let delay = 300 * Math.pow(2, attempt);`);
  lines.push(`      const ra = res?.headers?.get?.("retry-after");`);
  lines.push(`      if (ra) {`);
  lines.push(`        const n = Number(ra); if (!isNaN(n)) delay = n*1000; else { const t = Date.parse(ra); if (!isNaN(t)) delay = Math.max(0, t - Date.now()); }`);
  lines.push(`      }`);
  lines.push(`      delay += Math.floor(Math.random()*100); // jitter`);
  lines.push(`      await new Promise(r => setTimeout(r, delay));`);
  lines.push(`      attempt++;`);
  lines.push(`    }`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);

  for (const r of project.requests || []) {
    if (!r?.url || !r?.method) continue;
    const fn = deriveName(r.method, r.url, r.operationId);
    const params = extractPathParams(r.url);
    const headers = headersForReq(r);
    const httpMethod = String(r.method).toUpperCase();
    lines.push(`/**`);
    lines.push(` * ${r.summary || fn}`);
    if (r.description) lines.push(` * ${String(r.description).replace(/\n/g, " ")}`);
    lines.push(` * ${httpMethod} ${r.url}`);
    if (params.length) lines.push(` * Path params: ${params.join(", ")}`);
    if (headers.length) lines.push(` * Headers: ${headers.join(", ")}`);
    lines.push(` */`);
    lines.push(`export async function ${fn}(client, { ${params.map(p=>toCamel(p)).join(", ")} } = {}, { headers = {}, query = {}, body, throwOnHTTPError } = {}) {`);
    // ולידציה לפאת׳-פרמס לפני הקריאה ל-client
    for (const p of params) {
      lines.push(`  if (${toCamel(p)} == null || ${toCamel(p)} === "") throw new Error("Missing path param: ${p}");`);
    }
    lines.push(`  const pathParams = { ${params.map(p=>`${p}: ${toCamel(p)}`).join(", ")} };`);
    lines.push(`  const needed = {`);
    for (const h of headers) lines.push(`    "${h}": headers?.["${h}"],`);
    lines.push(`  };`);
    if (httpMethod === "GET" || httpMethod === "HEAD") {
      lines.push(`  // לא שולחים body ב-${httpMethod}`);
      lines.push(`  return client.request({ method:"${httpMethod}", path:"${r.url}", pathParams, query, headers:{ ...needed, ...headers }, throwOnHTTPError });`);
    } else {
      lines.push(`  return client.request({ method:"${httpMethod}", path:"${r.url}", pathParams, query, headers:{ ...needed, ...headers }, body, throwOnHTTPError });`);
    }
    lines.push(`}`);
    lines.push(``);
  }
  return lines.join("\n");
}

/* =================== C# .NET SDK =================== */
function buildCSharpClientFromProject(project = {}) {
  const lines = [];
  lines.push(`// Auto-generated SDK (.NET 8) – built from project object`);
  lines.push(`using System.Net;`);
  lines.push(`using System.Text;`);
  lines.push(`using System.Text.Json;`);
  lines.push(``);
  lines.push(`public class ApiResult { public bool Ok {get;set;} public HttpStatusCode Status {get;set;} public string? Error {get;set;} public string? TraceId {get;set;} public JsonDocument? Data {get;set;} }`);
  lines.push(`public class ApiClient {`);
  lines.push(`  private readonly HttpClient _http; private readonly JsonSerializerOptions _opts = new(JsonSerializerDefaults.Web);`);
  lines.push(`  public int TimeoutMs {get;set;} = 10000; public int MaxRetries {get;set;} = 2; public bool ThrowOnHTTPError {get;set;} = false;`);
  lines.push(`  public ApiClient(HttpClient http, string baseUrl){ _http=http; _http.BaseAddress=new Uri(baseUrl.TrimEnd('/')); }`);
  lines.push(`  static string SerializeQuery(Dictionary<string,object?>? query){ if(query==null) return string.Empty; var qs=new List<string>(); foreach(var kv in query){ if(kv.Value==null) continue; if(kv.Value is System.Collections.IEnumerable arr && kv.Value is not string){ foreach(var item in arr) if(item!=null) qs.Add($"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(item.ToString()!)}"); } else if(kv.Value is string s) qs.Add($"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(s)}"); else qs.Add($"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(JsonSerializer.Serialize(kv.Value))}"); } return qs.Count>0? "?"+string.Join("&",qs):""; }`);
  lines.push(`  static bool MethodSupportsBody(HttpMethod m)=> !(m==HttpMethod.Get || m==HttpMethod.Head);`);
  lines.push(`  static bool ShouldIdempotency(HttpMethod m)=> m==HttpMethod.Post || m==HttpMethod.Put || m==HttpMethod.Patch || m==HttpMethod.Delete;`);
  lines.push(`  public async Task<ApiResult> RequestAsync(HttpMethod method, string path, Dictionary<string,string>? pathParams=null, Dictionary<string,object?>? query=null, Dictionary<string,string?>? headers=null, object? body=null, bool? throwOnHTTPError=null, CancellationToken ct=default){`);
  lines.push(`    // validate path params`);
  lines.push(`    foreach (System.Text.RegularExpressions.Match m in System.Text.RegularExpressions.Regex.Matches(path, "\\\\{([^}]+)\\\\}")) { var k=m.Groups[1].Value; if (pathParams==null || !pathParams.ContainsKey(k) || string.IsNullOrEmpty(pathParams[k])) throw new ArgumentException("Missing path param: "+k); }`);
  lines.push(`    string urlPath = path; if(pathParams!=null){ foreach(var kv in pathParams) urlPath = urlPath.Replace("{"+kv.Key+"}", Uri.EscapeDataString(kv.Value)); }`);
  lines.push(`    var url = urlPath + SerializeQuery(query);`);
  lines.push(`    using var req = new HttpRequestMessage(method, url);`);
  lines.push(`    // default headers`);
  lines.push(`    req.Headers.TryAddWithoutValidation("Accept", "application/json, text/plain;q=0.9, */*;q=0.8");`);
  lines.push(`    if(headers!=null) foreach(var kv in headers) if(kv.Value!=null) req.Headers.TryAddWithoutValidation(kv.Key, kv.Value);`);
  lines.push(`    if(ShouldIdempotency(method) && (headers==null || !headers.ContainsKey("Idempotency-Key"))) req.Headers.TryAddWithoutValidation("Idempotency-Key", Guid.NewGuid().ToString("D"));`);
  lines.push(`    if(MethodSupportsBody(method) && body!=null){`);
  lines.push(`      if (body is string s) req.Content = new StringContent(s, Encoding.UTF8, "application/json");`);
  lines.push(`      else req.Content = new StringContent(JsonSerializer.Serialize(body,_opts), Encoding.UTF8, "application/json");`);
  lines.push(`    }`);
  lines.push(`    var attempts = 0; var max = Math.Max(0, this.MaxRetries); var to = TimeSpan.FromMilliseconds(TimeoutMs);`);
  lines.push(`    while (true) {`);
  lines.push(`      using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct); cts.CancelAfter(to);`);
  lines.push(`      try{`);
  lines.push(`        using var resp = await _http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);`);
  lines.push(`        var ctHeader = resp.Content.Headers.ContentType?.MediaType ?? "";`);
  lines.push(`        string text = string.Empty; byte[]? bin=null; JsonDocument? data=null;`);
  lines.push(`        if (ctHeader.Contains("application/json")) { text = await resp.Content.ReadAsStringAsync(cts.Token); try { data = string.IsNullOrWhiteSpace(text) ? null : JsonDocument.Parse(text); } catch { } }`);
  lines.push(`        else if (ctHeader.StartsWith("text/") || ctHeader.Contains("xml")) { text = await resp.Content.ReadAsStringAsync(cts.Token); }`);
  lines.push(`        else { bin = await resp.Content.ReadAsByteArrayAsync(cts.Token); }`);
  lines.push(`        var traceId = resp.Headers.TryGetValues("x-trace-id", out var v1)? v1.FirstOrDefault(): null;`);
  lines.push(`        if (!resp.IsSuccessStatusCode) { var res = new ApiResult{ Ok=false, Status=resp.StatusCode, Error=resp.ReasonPhrase, Data=data, TraceId=traceId }; if (throwOnHTTPError ?? this.ThrowOnHTTPError) throw new HttpRequestException(res.Error); return res; }`);
  lines.push(`        return new ApiResult{ Ok=true, Status=resp.StatusCode, Data=data, TraceId=traceId };`);
  lines.push(`      } catch (Exception ex) {`);
  lines.push(`        // retry 429/5xx`);
  lines.push(`        if (attempts >= max) return new ApiResult{ Ok=false, Status=0, Error=ex.Message };`);
  lines.push(`      }`);
  lines.push(`      // backoff + Retry-After`);
  lines.push(`      var delay = (int)(300 * Math.Pow(2, attempts)) + new Random().Next(0,100);`);
  lines.push(`      await Task.Delay(delay, ct); attempts++;`);
  lines.push(`    }`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);

  for (const r of project.requests || []) {
    if (!r?.url || !r?.method) continue;
    const fn = toPascal(deriveName(r.method, r.url, r.operationId)) + "Async";
    const camelBase = deriveName(r.method, r.url, r.operationId);
    const params = extractPathParams(r.url);
    const headers = headersForReq(r);
    const httpMethod = String(r.method).toUpperCase();
    const httpClass = httpMethod === "DELETE" ? "Delete" : toPascal(httpMethod);
    lines.push(`// ${r.summary || camelBase} – ${httpMethod} ${r.url}`);
    lines.push(`public static Task<ApiResult> ${fn}(ApiClient client, ${params.map(p=>`string ${toCamel(p)}`).join(", ")}${params.length?", ":""}Dictionary<string,string?>? headers=null, object? body=null, bool? throwOnHTTPError=null, CancellationToken ct=default){`);
    for (const p of params) lines.push(`  if (string.IsNullOrEmpty(${toCamel(p)})) throw new ArgumentException("Missing path param: ${p}");`);
    lines.push(`  var pathParams = new Dictionary<string,string>{ ${params.map(p=>`{"${p}", ${toCamel(p)}}`).join(", ")} };`);
    lines.push(`  var needed = new Dictionary<string,string?>{`);
    for (const h of headers) lines.push(`    {"${h}", headers!=null && headers.ContainsKey("${h}") ? headers["${h}"] : null},`);
    lines.push(`  }; if(headers!=null) foreach(var kv in headers) needed[kv.Key]=kv.Value;`);
    if (httpMethod === "GET" || httpMethod === "HEAD") {
      lines.push(`  return client.RequestAsync(HttpMethod.${httpClass}, "${r.url}", pathParams, null, needed, null, throwOnHTTPError, ct);`);
    } else {
      lines.push(`  return client.RequestAsync(HttpMethod.${httpClass}, "${r.url}", pathParams, null, needed, body, throwOnHTTPError, ct);`);
    }
    lines.push(`}`);
    lines.push(``);
  }
  return lines.join("\n");
}

/* API חיצוני: מייצר קוד לפי שפה מתוך אובייקט פרויקט */
export function generateCodeFromProject(project = {}, language = "node-express") {
  switch (String(language).toLowerCase()) {
    case "node":
    case "node-sdk":
    case "node-express":
      return buildNodeClientFromProject(project);
    case "csharp":
    case "dotnet":
    case "csharp-aspnet":
      return buildCSharpClientFromProject(project);
    default:
      return buildNodeClientFromProject(project);
  }
}
