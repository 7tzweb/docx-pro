
---

## 🚀 התקנת תלויות
בפעם הראשונה, או אחרי שינוי ב־`package.json`:

```bash
cd client
npm install

cd ../server
npm install


cd client
npm start
cd server
node server.mjs

##או 
npx concurrently "cd server && node server.mjs" "cd client && npm run dev"



npm run build
```