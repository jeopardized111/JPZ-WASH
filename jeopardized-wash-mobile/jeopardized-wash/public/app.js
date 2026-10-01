const $ = s => document.querySelector(s);
const els = {
  body: document.body, cityButton: $('#cityButton'), cityMenu: $('#cityMenu'), cityList: $('#cityList'),
  citySearch: $('#citySearch'), cityLabel: $('#cityLabel'), currentCity: $('#currentCity'),
  themeToggle: $('#themeToggle'), menuButton: $('#menuButton'), sideMenu: $('#sideMenu'), overlay: $('#overlay'),
  registrationModal: $('#registrationModal'), registrationForm: $('#registrationForm'), contactInput: $('#contactInput'), emailTab: $('#emailTab'), phoneTab: $('#phoneTab'), emailField: $('#emailField'), phoneField: $('#phoneField'), countrySelect: $('#countrySelect'), phoneInput: $('#phoneInput'),
  profileAvatar: $('#profileAvatar'), profileName: $('#profileName'), panelModal: $('#panelModal'), panelContent: $('#panelContent'),
  panelClose: $('#panelClose'), searchForm: $('#searchForm'), mainCityInput: $('#mainCityInput'),
  currentIcon: $('#currentIcon'), currentTemp: $('#currentTemp'), humidity: $('#humidity'), wind: $('#wind'),
  pressure: $('#pressure'), precip: $('#precip'), conditionText: $('#conditionText'),
  forecastDays: $('#forecastDays'), recommendationTitle: $('#recommendationTitle'), recommendationText: $('#recommendationText'),
  detailsBtn: $('#detailsBtn'), weatherBgA: $('#weatherBgA'), weatherBgB: $('#weatherBgB')
};

const CITIES = [
  ["Санкт-Петербург",59.9343,30.3351],["Москва",55.7558,37.6173],["Казань",55.7961,49.1064],
  ["Нижний Новгород",56.3269,44.0059],["Екатеринбург",56.8389,60.6057],["Новосибирск",55.0084,82.9357],
  ["Самара",53.1959,50.1008],["Ростов-на-Дону",47.2357,39.7015],["Краснодар",45.0355,38.9753],
  ["Воронеж",51.6755,39.2089],["Уфа",54.7388,55.9721],["Пермь",58.0105,56.2502],
  ["Волгоград",48.708,44.5133],["Сочи",43.6028,39.7342],["Калининград",54.7104,20.4522],
  ["Саратов",51.5336,46.0343],["Омск",54.9885,73.3242],["Тюмень",57.153,65.5343],
  ["Минск",53.9,27.5667],["Таллин",59.437,24.7536],["Хельсинки",60.1699,24.9384],
  ["Берлин",52.52,13.405],["Прага",50.0755,14.4378],["Стамбул",41.0082,28.9784]
];

let selectedCity = JSON.parse(localStorage.getItem("jw-city") || "null") || {name:"Санкт-Петербург",lat:59.9343,lon:30.3351};
let pinned = JSON.parse(localStorage.getItem("jw-pinned") || "[]");
let profile = JSON.parse(localStorage.getItem("jw-profile") || "null");
let forecastCache = null;

const icons = {
  0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",51:"🌦️",53:"🌦️",55:"🌧️",
  56:"🌧️",57:"🌧️",61:"🌦️",63:"🌧️",65:"🌧️",66:"🌧️",67:"🌧️",71:"🌨️",
  73:"🌨️",75:"❄️",77:"❄️",80:"🌦️",81:"🌧️",82:"⛈️",85:"🌨️",86:"❄️",95:"⛈️",96:"⛈️",99:"⛈️"
};
const descriptions = {
  0:"Ясно",1:"Преимущественно ясно",2:"Переменная облачность",3:"Пасмурно",45:"Туман",48:"Туман",
  51:"Морось",53:"Морось",55:"Сильная морось",56:"Ледяная морось",57:"Ледяная морось",
  61:"Небольшой дождь",63:"Дождь",65:"Сильный дождь",66:"Ледяной дождь",67:"Ледяной дождь",
  71:"Небольшой снег",73:"Снег",75:"Сильный снег",77:"Снежная крупа",80:"Ливень",81:"Ливень",
  82:"Сильный ливень",85:"Снегопад",86:"Сильный снегопад",95:"Гроза",96:"Гроза с градом",99:"Гроза с градом"
};
const badCodes = new Set([45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99]);

let activeWeatherLayer = 0;
function setWeatherBackground(code){
  const file = `assets/${badCodes.has(code) ? "rain" : "clear"}.jpg`;
  const current = activeWeatherLayer === 0 ? els.weatherBgA : els.weatherBgB;
  const next = activeWeatherLayer === 0 ? els.weatherBgB : els.weatherBgA;
  if(!next || !current) return;
  next.style.backgroundImage = `url("${file}")`;
  next.classList.add("active");
  current.classList.remove("active");
  activeWeatherLayer = activeWeatherLayer === 0 ? 1 : 0;
}

function renderAvatar(el, avatar){
  if(!el) return;
  if(typeof avatar === "string" && avatar.startsWith("data:image/")){
    el.innerHTML = `<img class="avatar-img" src="${avatar}" alt="Аватар">`;
  } else {
    el.textContent = avatar || "🚘";
  }
}

function applyTheme(){
  const dark = localStorage.getItem("jw-theme")==="dark";
  els.body.classList.toggle("dark",dark);
  els.themeToggle.textContent = dark ? "☾" : "☀";
  els.themeToggle.setAttribute("aria-label", dark ? "Переключить на светлую тему" : "Переключить на тёмную тему");
  els.themeToggle.title = dark ? "Светлая тема" : "Тёмная тема";
}
function saveProfile(p){ profile=p; localStorage.setItem("jw-profile",JSON.stringify(p)); updateProfileUI(); }
function updateProfileUI(){
  if(!profile)return;
  els.profileName.textContent=profile.nickname||"Новый водитель";
  renderAvatar(els.profileAvatar, profile.avatar||"🚘");
}
function openMenu(){els.sideMenu.classList.add("open");els.overlay.classList.remove("hidden")}
function closeMenu(){els.sideMenu.classList.remove("open");els.overlay.classList.add("hidden")}
function openPanel(title,html){
  els.panelContent.innerHTML=`<h2 class="panel-title">${title}</h2>${html}`;
  els.panelModal.classList.remove("hidden");
}
function closePanel(){els.panelModal.classList.add("hidden")}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function renderCityList(filter=""){
  const q=filter.trim().toLowerCase();
  const common=CITIES.filter(c=>c[0].toLowerCase().includes(q));
  const pinnedItems=pinned.map(name=>CITIES.find(c=>c[0]===name)).filter(Boolean).filter(c=>c[0].toLowerCase().includes(q));
  const all=[...pinnedItems,...common.filter(c=>!pinned.includes(c[0]))];
  els.cityList.innerHTML=all.map(c=>`
    <div class="city-row" data-name="${escapeHtml(c[0])}" data-lat="${c[1]}" data-lon="${c[2]}">
      <span>📍</span><span>${escapeHtml(c[0])}</span>
      <span class="pin" data-pin="${escapeHtml(c[0])}" title="Закрепить">${pinned.includes(c[0])?"★":"☆"}</span>
    </div>`).join("") || `<div class="city-row">Город не найден. Нажми Enter для поиска.</div>`;
}
function localUsers(){
  try{return JSON.parse(localStorage.getItem("jw-users")||"[]")}catch{return []}
}
function saveLocalUsers(users){localStorage.setItem("jw-users",JSON.stringify(users))}
function localRegister(contact){
  const users=localUsers();
  const existing=users.find(u=>u.contact===contact);
  if(existing) return existing;
  const user={id:"local-"+Date.now(),nickname:"Новый водитель",avatar:"🚘",washes:0,contact,lastSurvey:null,lastWashed:false};
  users.push(user); saveLocalUsers(users); return user;
}
function localProfile(id,nickname,avatar){
  const users=localUsers(); const u=users.find(x=>x.id===id); if(!u) throw new Error("Пользователь не найден");
  u.nickname=nickname||u.nickname; u.avatar=avatar||u.avatar; saveLocalUsers(users); return u;
}
function localSurvey(id,washed){
  const users=localUsers(); const u=users.find(x=>x.id===id); if(!u) throw new Error("Пользователь не найден");
  const now=Date.now();
  if(u.lastSurvey && now-u.lastSurvey<12*60*60*1000){
    const remaining=12*60*60*1000-(now-u.lastSurvey); throw new Error("Опрос уже пройден. Повторно можно через 12 часов.");
  }
  u.lastSurvey=now; u.lastWashed=Boolean(washed); if(washed)u.washes=(u.washes||0)+1; saveLocalUsers(users); return u;
}
function normalizePhone(){
  const code=els.countrySelect.value;
  const digits=(els.phoneInput.value||"").replace(/\D/g,"");
  return code+digits;
}
function formatPhone(){
  const code=els.countrySelect.value; let d=(els.phoneInput.value||"").replace(/\D/g,"");
  if(d.startsWith(code.replace("+",""))) d=d.slice(code.replace("+","").length);
  const groups=code==="+7"?[3,3,2,2]:code==="+375"?[2,3,2,2]:[3,3,3,3];
  let out="",pos=0;
  for(const n of groups){if(pos>=d.length)break; const part=d.slice(pos,pos+n); out+=(out?" ":"")+part; pos+=n;}
  els.phoneInput.value=out;
}
function contactValue(){
  if(!els.phoneField.classList.contains("hidden")) return normalizePhone();
  return els.contactInput.value.trim();
}
function validContact(){
  if(els.phoneField.classList.contains("hidden")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(els.contactInput.value.trim());
  return normalizePhone().replace(/\D/g,"").length>=9;
}

async function geocode(query){
  const url=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=ru&format=json`;
  const r=await fetch(url); if(!r.ok) throw new Error("Не удалось найти город");
  const d=await r.json(); if(!d.results?.length) throw new Error("Город не найден");
  const q=query.trim().toLowerCase();
  const x=d.results.find(item => String(item.name||"").toLowerCase()===q) || d.results[0];
  return {name:[x.name,x.admin1,x.country].filter(Boolean).join(", "),lat:x.latitude,lon:x.longitude};
}
async function selectCity(city){
  els.body.classList.add('city-changing');
  selectedCity=city; localStorage.setItem("jw-city",JSON.stringify(city));
  els.cityLabel.textContent=city.name.split(",")[0]; els.currentCity.textContent=city.name.split(",")[0];
  els.cityMenu.classList.remove("open");
  try { await loadWeather(); } finally { setTimeout(()=>els.body.classList.remove('city-changing'), 520); }
}
function renderForecast(d){
  els.forecastDays.innerHTML=d.daily.time.slice(0,7).map((date,i)=>{
    const code=d.daily.weather_code[i], temp=Math.round(d.daily.temperature_2m_max[i]);
    const desc=descriptions[code]||"Погода";
    const label=i===0?"Сегодня":i===1?"Завтра":new Date(`${date}T12:00:00`).toLocaleDateString("ru-RU",{weekday:"short"}).replace(".","");
    const sign=temp>0?"+":"";
    return `<div class="day ${i===0?"active":""}">
      <div class="day-name">${label}</div>
      <div class="day-mid"><span class="day-icon">${icons[code]||"🌤️"}</span><span class="day-temp">${sign}${temp}°</span></div>
      <div class="day-desc">${desc}</div>
    </div>`;
  }).join("");
}

function openRecommendationDetails(){
  if(!forecastCache){
    openPanel("Рекомендация", `<p class="details-text">Прогноз ещё загружается. Попробуй нажать кнопку ещё раз через несколько секунд.</p>`);
    return;
  }
  const d=forecastCache, best=findBestDay(d);
  const current=d.current;
  const currentCode=current.weather_code;
  const currentRain=Math.round(d.daily.precipitation_probability_max?.[0] ?? 0);
  let html;
  if(best){
    const date=new Date(`${d.daily.time[best.i]}T12:00:00`);
    const label=best.i===0?"сегодня":best.i===1?"завтра":date.toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"});
    const wind=Math.round((d.daily.wind_speed_10m_max?.[best.i] ?? 0)*10)/10;
    html=`
      <div class="details-hero">
        <div class="details-icon">${icons[best.code]||"🌤️"}</div>
        <div><span>Для ${escapeHtml(selectedCity.name.split(",")[0])}</span><b>Лучшее время — ${label}</b></div>
      </div>
      <div class="details-grid">
        <div class="detail-box"><small>Температура</small><strong>${best.temp>0?"+":""}${Math.round(best.temp)}°</strong></div>
        <div class="detail-box"><small>Вероятность осадков</small><strong>${Math.round(best.rain)}%</strong></div>
        <div class="detail-box"><small>Максимальный ветер</small><strong>${wind} м/с</strong></div>
        <div class="detail-box"><small>Погода</small><strong>${descriptions[best.code]||"Подходящие условия"}</strong></div>
      </div>
      <p class="details-text">Мы выбрали этот день по нескольким параметрам: вероятность дождя не выше 25%, температура не ниже +7°C, а сильного ветра нет. После мойки машине будет проще высохнуть, а риск быстро испачкать кузов ниже.</p>
      <div class="details-good"><b>✓ Что делать:</b><br>Можно планировать мойку. Лучше выбрать время после окончания утренней влажности и до возможного ухудшения погоды.</div>
      <div class="details-bad"><b>⚠ На что обратить внимание:</b><br>Прогноз может обновляться. Если осадки или ветер усилятся, рекомендация автоматически изменится.</div>`;
  } else {
    html=`
      <div class="details-hero"><div class="details-icon">🌧️</div><div><span>${escapeHtml(selectedCity.name.split(",")[0])}</span><b>Подходящего окна пока нет</b></div></div>
      <p class="details-text">В ближайшие дни прогноз показывает условия, при которых после мойки автомобиль может быстро снова испачкаться: осадки, высокая вероятность дождя, снег или сильный ветер.</p>
      <div class="details-bad"><b>⚠ Что лучше сделать:</b><br>Подождать следующего обновления прогноза и проверить рекомендацию позже. Сайт автоматически пересчитает подходящий день.</div>`;
  }
  openPanel("Рекомендация для мойки", html);
}
function findBestDay(d){
  for(let i=0;i<d.daily.time.length;i++){
    const code=d.daily.weather_code[i], rain=d.daily.precipitation_probability_max[i]??100;
    const temp=d.daily.temperature_2m_max[i], wind=d.daily.wind_speed_10m_max[i]??99;
    if(!badCodes.has(code) && rain<=25 && temp>=7 && wind<=30) return {i, temp, rain, code};
  }
  return null;
}
function updateRecommendation(d){
  const best=findBestDay(d);
  if(best){
    const date=new Date(d.daily.time[best.i]);
    const label=best.i===0?"сегодня":best.i===1?"завтра":date.toLocaleDateString("ru-RU",{weekday:"long"});
    els.recommendationTitle.textContent=`Лучшее время для мойки — ${label}`;
    els.recommendationText.textContent=`Ожидается ${descriptions[best.code].toLowerCase()} и около +${Math.round(best.temp)}°. Вероятность осадков до ${Math.round(best.rain)}%.`;
  } else {
    els.recommendationTitle.textContent="Подходящего окна пока нет";
    els.recommendationText.textContent="В ближайшие дни есть осадки или слишком сильный ветер. Проверь прогноз позже.";
  }
}
async function loadWeather(){
  try{
    const params=new URLSearchParams({
      latitude:selectedCity.lat,longitude:selectedCity.lon,
      current:"temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_gusts_10m",
      daily:"weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max",
      hourly:"temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m",
      timezone:"auto",forecast_days:"7",
      temperature_unit:"celsius",wind_speed_unit:"ms",precipitation_unit:"mm"
    });
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if(!r.ok)throw new Error("Ошибка погоды");
    const d=await r.json(); forecastCache=d;
    const c=d.current, code=c.weather_code;
    els.currentIcon.textContent=icons[code]||"🌤️";
    els.currentTemp.textContent=`${c.temperature_2m>0?"+":""}${Math.round(c.temperature_2m)}°`;
    els.humidity.textContent=`${Math.round(c.relative_humidity_2m)}%`;
    els.wind.textContent=`${Math.round(c.wind_speed_10m*10)/10} м/с`;
    els.pressure.textContent=`${Math.round(c.pressure_msl*0.7500617)} мм рт. ст.`;
    els.precip.textContent=`${Number(c.precipitation||0).toFixed(1)} мм`;
    els.conditionText.textContent=descriptions[code]||"Погода";
    setWeatherBackground(code); renderForecast(d); updateRecommendation(d);
  }catch(e){
    els.conditionText.textContent="Не удалось получить прогноз";
    console.error(e);
  }
}

els.cityButton.addEventListener("click",()=>{els.cityMenu.classList.toggle("open");renderCityList()});
els.citySearch.addEventListener("input",()=>renderCityList(els.citySearch.value));
els.citySearch.addEventListener("keydown",async e=>{
  if(e.key==="Enter"){
    try{const c=await geocode(els.citySearch.value); await selectCity(c); els.citySearch.value="";}
    catch(err){alert(err.message)}
  }
});
els.cityList.addEventListener("click",async e=>{
  const pin=e.target.closest("[data-pin]");
  if(pin){
    e.stopPropagation();
    const name=pin.dataset.pin;
    pinned=pinned.includes(name)?pinned.filter(x=>x!==name):[name,...pinned];
    localStorage.setItem("jw-pinned",JSON.stringify(pinned)); renderCityList(els.citySearch.value); return;
  }
  const row=e.target.closest(".city-row"); if(!row?.dataset.name)return;
  await selectCity({name:row.dataset.name,lat:Number(row.dataset.lat),lon:Number(row.dataset.lon)});
});
els.searchForm.addEventListener("submit",async e=>{
  e.preventDefault(); const q=els.mainCityInput.value.trim(); if(!q)return;
  try{await selectCity(await geocode(q)); els.mainCityInput.value="";}catch(err){alert(err.message)}
});
els.themeToggle.addEventListener("click",()=>{const d=!els.body.classList.contains("dark");localStorage.setItem("jw-theme",d?"dark":"light");applyTheme();});
els.menuButton.addEventListener("click",openMenu); $('#menuClose').addEventListener("click",closeMenu); els.overlay.addEventListener("click",closeMenu);
document.querySelectorAll(".close").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close).classList.add("hidden")));
els.emailTab.addEventListener("click",()=>{
  els.emailTab.classList.add("active"); els.phoneTab.classList.remove("active");
  els.emailField.classList.remove("hidden"); els.phoneField.classList.add("hidden");
  els.contactInput.required=true; els.phoneInput.required=false; els.contactInput.focus();
});
els.phoneTab.addEventListener("click",()=>{
  els.phoneTab.classList.add("active"); els.emailTab.classList.remove("active");
  els.phoneField.classList.remove("hidden"); els.emailField.classList.add("hidden");
  els.contactInput.required=false; els.phoneInput.required=true; els.phoneInput.focus();
});
els.countrySelect.addEventListener("change",()=>{els.phoneInput.value=""; els.phoneInput.placeholder=els.countrySelect.value==="+7"?"(999) 123-45-67":"Номер телефона";});
els.phoneInput.addEventListener("input",formatPhone);
els.registrationForm.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!validContact()) { alert(els.phoneField.classList.contains("hidden")?"Введите корректную почту.":"Введите корректный номер телефона."); return; }
  const contact=contactValue();
  try{
    let data=null;
    if(location.protocol!=="file:"){
      const r=await fetch("/api/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contact})});
      const raw=await r.text(); let parsed={}; try{parsed=JSON.parse(raw)}catch{}
      if(!r.ok)throw new Error(parsed.error||"Сервер не принял регистрацию.");
      data=parsed;
    } else {
      data=localRegister(contact);
    }
    saveProfile(data); els.registrationModal.classList.add("hidden");
  }catch(err){
    // Если пользователь открыл index.html двойным кликом или сервер временно недоступен,
    // регистрация всё равно работает в локальном режиме и больше не показывает "Failed to fetch".
    if(err instanceof TypeError || /Failed to fetch|NetworkError/i.test(err.message)){
      saveProfile(localRegister(contact)); els.registrationModal.classList.add("hidden");
    } else alert(err.message);
  }
});

document.querySelectorAll(".menu-item").forEach(btn=>btn.addEventListener("click",()=>openNamedPanel(btn.dataset.panel)));

async function compressAvatar(file){
  const bitmap=await createImageBitmap(file);
  const size=256, canvas=document.createElement("canvas");
  canvas.width=size; canvas.height=size;
  const ctx=canvas.getContext("2d");
  const scale=Math.max(size/bitmap.width,size/bitmap.height);
  const w=bitmap.width*scale,h=bitmap.height*scale;
  ctx.drawImage(bitmap,(size-w)/2,(size-h)/2,w,h);
  return canvas.toDataURL("image/jpeg",0.82);
}

async function openNamedPanel(panel){
  if(!profile){closeMenu();els.registrationModal.classList.remove("hidden");return}
  if(panel==="profilePanel"){
    openPanel("Профиль",`<div class="profile-mini"><div class="avatar">${typeof profile.avatar === "string" && profile.avatar.startsWith("data:image/") ? `<img class="avatar-img" src="${profile.avatar}" alt="Аватар">` : escapeHtml(profile.avatar||"🚘")}</div><div><b>${escapeHtml(profile.nickname)}</b><span>${profile.washes||0} моек</span></div></div><p style="color:#7b9bb9">Город по умолчанию: ${escapeHtml(selectedCity.name)}</p>`);
  }
  if(panel==="editPanel"){
    const av=["🚘","🚗","🏎️","🚙","🚕","🚓","🫧","⭐","🔥","🌊","🐺","🦊"];
    openPanel("Редактировать профиль",`<label>Никнейм</label><input id="editNick" class="edit-input" value="${escapeHtml(profile.nickname||"Новый водитель")}"><p>Аватар</p><div class="custom-avatar-row"><div id="editAvatarPreview" class="avatar avatar-preview"></div><label class="upload-avatar-btn" for="avatarFile">Загрузить своё фото</label><input id="avatarFile" type="file" accept="image/png,image/jpeg,image/webp" hidden></div><div class="avatar-grid">${av.map(a=>`<button type="button" class="avatar-choice ${a===profile.avatar?"selected":""}" data-avatar="${a}">${a}</button>`).join("")}</div><button id="saveProfileBtn" class="primary-btn" style="width:100%">Сохранить</button>`);
    let picked=profile.avatar||"🚘";
    const preview=els.panelContent.querySelector("#editAvatarPreview");
    renderAvatar(preview,picked);
    els.panelContent.querySelectorAll("[data-avatar]").forEach(b=>b.onclick=()=>{picked=b.dataset.avatar;els.panelContent.querySelectorAll("[data-avatar]").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");renderAvatar(preview,picked)});
    els.panelContent.querySelector("#avatarFile").addEventListener("change",async e=>{
      const file=e.target.files?.[0]; if(!file) return;
      if(file.size>5*1024*1024){alert("Файл слишком большой. Выбери изображение до 5 МБ.");e.target.value="";return;}
      try{
        picked=await compressAvatar(file);
        els.panelContent.querySelectorAll("[data-avatar]").forEach(x=>x.classList.remove("selected"));
        renderAvatar(preview,picked);
      }catch(err){alert("Не удалось загрузить изображение.");}
    });
    $("#saveProfileBtn").onclick=async()=>{
      const nickname=$("#editNick").value.trim()||"Новый водитель";
      try{
        let p;
        if(location.protocol==="file:") p=localProfile(profile.id,nickname,picked);
        else {const r=await fetch("/api/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:profile.id,nickname,avatar:picked})}); const raw=await r.text(); p=JSON.parse(raw); if(!r.ok)throw new Error(p.error||"Ошибка сохранения");}
        saveProfile(p); closePanel();
      }catch(e){
        if(e instanceof TypeError || /Failed to fetch|NetworkError/i.test(e.message)){saveProfile(localProfile(profile.id,nickname,picked));closePanel();}
        else alert(e.message);
      }
    };
  }
  if(panel==="leaderPanel"){
    let rows=[];
    try{
      if(location.protocol==="file:") throw new TypeError("local");
      const r=await fetch("/api/leaderboard"); rows=await r.json(); if(!r.ok)throw new Error("Ошибка таблицы");
    }catch(e){
      rows=localUsers().sort((a,b)=>(b.washes||0)-(a.washes||0));
    }
    openPanel("Таблица лидеров",`<p style="color:#7b9bb9">Место определяется количеством отмеченных моек.</p><div>${rows.map((u,i)=>`<div class="leader-row"><span class="rank">${i+1}</span><span class="leader-avatar">${typeof u.avatar === "string" && u.avatar.startsWith("data:image/") ? `<img class="avatar-img" src="${u.avatar}" alt="Аватар">` : escapeHtml(u.avatar||"🚘")}</span><span class="name"><b>${escapeHtml(u.nickname)}</b></span><span class="washes">${u.washes||0} 🚿</span></div>`).join("")}</div>`);
  }
  if(panel==="surveyPanel"){
    openPanel("Краткий опрос",`<p>Мыл ли ты сегодня машину? Один ответ можно отправить раз в 12 часов.</p><div class="survey-buttons"><button id="surveyYes" class="yes">Да, мыл 🚿</button><button id="surveyNo" class="no">Нет</button></div><p id="surveyStatus" style="color:#7b9bb9"></p>`);
    $("#surveyYes").onclick=()=>sendSurvey(true); $("#surveyNo").onclick=()=>sendSurvey(false);
  }
  if(panel==="washGuidePanel"){
    openPanel("Как правильно мыть машину", `
      <div class="wash-guide-intro"><div class="guide-badge">🚘</div><div><b>Чистый кузов без царапин</b><span>Короткая инструкция для обычной мойки автомобиля.</span></div></div>
      <div class="wash-guide-photo photo-foam"><img src="assets/clear.jpg" alt="Автомобиль перед мойкой"><div><b>1. Сначала смой грязь</b><span>Обильно пролей кузов водой сверху вниз. Это убирает песок и крупную грязь до контакта с губкой.</span></div></div>
      <div class="wash-guide-photo photo-wash"><img src="assets/rain.jpg" alt="Автомобиль на мокром покрытии"><div><b>2. Мой сверху вниз</b><span>Используй автошампунь и мягкую микрофибру. Работай по секциям: крыша, стёкла, капот, двери, нижняя часть.</span></div></div>
      <div class="guide-grid">
        <div class="guide-tip"><strong>🧽 Микрофибра</strong><span>Не используй грязную губку — песок может оставить царапины.</span></div>
        <div class="guide-tip"><strong>💧 Два ведра</strong><span>Одно для шампуня, второе для промывки микрофибры.</span></div>
        <div class="guide-tip"><strong>☀️ Не на жаре</strong><span>Не давай шампуню высыхать на кузове под прямым солнцем.</span></div>
        <div class="guide-tip"><strong>🧴 Сушка</strong><span>После ополаскивания вытри кузов чистой сушильной микрофиброй.</span></div>
      </div>
      <div class="guide-warning"><b>⚠️ Важно</b><span>Если на улице жара, сильный ветер, песок или дождь — лучше выбрать другое время. Сайт учитывает прогноз при рекомендации мойки.</span></div>
    `);
  }
  closeMenu();
}
async function sendSurvey(washed){
  const status=$("#surveyStatus");
  try{
    let d;
    if(location.protocol==="file:") d=localSurvey(profile.id,washed);
    else {const r=await fetch("/api/survey",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:profile.id,washed})}); const raw=await r.text(); d=JSON.parse(raw); if(!r.ok)throw new Error(d.error);}
    saveProfile(d); status.textContent=washed?"Ответ принят! +1 мойка в таблицу лидеров.":"Ответ принят. Спасибо!";
  }catch(e){status.textContent=e.message}
}

els.panelClose.addEventListener("click",closePanel);
els.detailsBtn.addEventListener("click",openRecommendationDetails);

applyTheme(); updateProfileUI(); renderCityList(); loadWeather();
if(!profile) setTimeout(()=>els.registrationModal.classList.remove("hidden"),450);
