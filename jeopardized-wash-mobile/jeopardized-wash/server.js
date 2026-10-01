const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DB = path.join(__dirname, "data.json");

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

function readDb() {
  if (!fs.existsSync(DB)) {
    const initial = {
      users: [
        { id: "demo-1", nickname: "АвтоЛюбитель", avatar: "🚘", washes: 17 },
        { id: "demo-2", nickname: "CleanCar", avatar: "✨", washes: 14 },
        { id: "demo-3", nickname: "Синий BMW", avatar: "🔵", washes: 11 },
        { id: "demo-4", nickname: "RoadStar", avatar: "⭐", washes: 8 },
        { id: "demo-5", nickname: "Мойка PRO", avatar: "🫧", washes: 6 }
      ]
    };
    fs.writeFileSync(DB, JSON.stringify(initial, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB, "utf8"));
}
function writeDb(db) { fs.writeFileSync(DB, JSON.stringify(db, null, 2)); }

app.get("/api/leaderboard", (req, res) => {
  const db = readDb();
  res.json(db.users.sort((a,b)=>b.washes-a.washes).slice(0,50));
});

app.post("/api/register", (req,res)=>{
  const { contact } = req.body || {};
  if (!contact || String(contact).trim().length < 5) return res.status(400).json({error:"Введите корректную почту или номер телефона."});
  const db=readDb();
  const user={id: "u-"+Date.now(), nickname:"Новый водитель", avatar:"🚘", washes:0, contact:String(contact).trim()};
  db.users.push(user); writeDb(db);
  res.json(user);
});

app.post("/api/profile", (req,res)=>{
  const {id,nickname,avatar}=req.body||{};
  const db=readDb(); const u=db.users.find(x=>x.id===id);
  if(!u) return res.status(404).json({error:"Пользователь не найден"});
  if(nickname) u.nickname=String(nickname).trim().slice(0,24);
  if(avatar) u.avatar=String(avatar).slice(0, 1200000);
  writeDb(db); res.json(u);
});

app.post("/api/survey", (req,res)=>{
  const {id, washed}=req.body||{};
  const db=readDb(); const u=db.users.find(x=>x.id===id);
  if(!u) return res.status(404).json({error:"Пользователь не найден"});
  const now=Date.now();
  if (u.lastSurvey && now - u.lastSurvey < 12*60*60*1000) {
    const remaining=12*60*60*1000-(now-u.lastSurvey);
    return res.status(429).json({error:"Опрос уже пройден. Повторно можно через 12 часов.", remaining});
  }
  u.lastSurvey=now;
  u.lastWashed=Boolean(washed);
  if (washed) u.washes=(u.washes||0)+1;
  writeDb(db); res.json(u);
});

app.listen(PORT, ()=>console.log(`Jeopardized Wash: http://localhost:${PORT}`));
