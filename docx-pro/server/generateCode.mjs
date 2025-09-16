/* החזרת קוד לדוגמה לפי שפה (אפשר להחליף אח"כ במחולל אמיתי) */
const templates = {
  "node-express": `// generated from swagger (node + express)
import express from "express";
const app = express();
app.use(express.json());
app.get("/items", (req,res) => res.json([{id:1,name:"item"}]));
app.listen(8080, () => console.log("API on 8080"));`,
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
  "csharp-aspnet": `// generated from swagger (csharp + aspnet minimal)
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
app.MapGet("/items", () => new[]{ new { id=1, name="item"} });
app.Run();`,
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
});`
};

export function generateCodeFromSwagger(_swaggerText, language = "node-express") {
  return templates[language] || templates["node-express"];
}
