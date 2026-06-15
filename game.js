/* ===================================================================
   MAROMBINHA - Jogo estilo Tamagotchi Fitness
   MVP v0.1 - Vanilla JS, salva no navegador (localStorage)
   =================================================================== */

// ---------- CONFIGURACAO DO JOGO ----------
const CFG = {
  // Empregos (carreira) - foco do ranking e o SHAPE, nao o emprego
  jobs: [
    { name: 'Estagiario',      emoji:'\u{1F4DA}', pay: 5,   minShape: 0,  daysToPromo: 3 },
    { name: 'Analista Jr',     emoji:'\u{1F4BC}', pay: 15,  minShape: 10, daysToPromo: 5 },
    { name: 'Analista Pleno',  emoji:'\u{1F4CA}', pay: 35,  minShape: 25, daysToPromo: 8 },
    { name: 'Analista Senior', emoji:'\u{1F3AF}', pay: 65,  minShape: 40, daysToPromo: 12 },
    { name: 'Gerente',         emoji:'\u{1F454}', pay: 120, minShape: 60, daysToPromo: 16 },
    { name: 'Diretor',         emoji:'\u{1F3E2}', pay: 200, minShape: 75, daysToPromo: 20 },
    { name: 'CEO',             emoji:'\u{1F3C6}', pay: 350, minShape: 90, daysToPromo: 25 },
    { name: 'Empreendedor',    emoji:'\u{1F680}', pay: 500, minShape: 95, daysToPromo: 999 }
  ],
  // Veiculos: reduzem tempo de trabalho/treino
  vehicles: [
    { id:'pe',    name:'A pe',         emoji:'\u{1F6B6}', cost:0,     mult:1.0 },
    { id:'bike',  name:'Bicicleta',    emoji:'\u{1F6B2}', cost:500,   mult:0.5 },
    { id:'moto',  name:'Motocicleta',  emoji:'\u{1F3CD}', cost:2000,  mult:0.35 },
    { id:'carro', name:'Carro',        emoji:'\u{1F697}', cost:5000,  mult:0.25 },
    { id:'heli',  name:'Helicoptero',  emoji:'\u{1F681}', cost:50000, mult:0.10 }
  ],
  // tempos base em segundos (acelerados para teste/diversao)
  workSecs: 20,
  trainSecs: 15,
  // ganhos/custos
  trainShape: 2,
  eatCost: 5,
  eatEnergy: 30,
  eatLife: 12,
  // esteroide
  roidCost: 150,
  roidShape: 10,
  roidLifeCost: 10,
  roidDeathRiskPerDose: 2, // % por dia, acumula
  // degradacao
  workEnergy: 25, workLife: 2,
  trainEnergy: 35, trainLife: 3,
  noEnergyLifeDrain: 1, // %/checktick quando energia 0
  maxShape: 100
};

// ---------- ESTADO ----------
let S = null;
function defaultState(){
  return {
    created:false, name:'', gender:'M', skin:'#e0ac69', hair:'#2b1d0e',
    shape:1, life:100, energy:100, hunger:100,
    coins:0, jobIndex:0, daysInJob:0, vehicle:'pe',
    roidDoses:0, streak:0, lastDay:null, deaths:0, alive:true, grayUntil:0,
    busyUntil:0, busyAction:null, lastTick:Date.now()
  };
}
function load(){
  try{ S = JSON.parse(localStorage.getItem('marombinha')); }catch(e){ S=null; }
  if(!S) S = defaultState();
}
function save(){ localStorage.setItem('marombinha', JSON.stringify(S)); }

// ---------- AVATAR (SVG que cresce de musculo) ----------
function avatarSVG(opts){
  var sh = opts.shape, roid = opts.roid||0, gray = opts.gray;
  var skin = gray ? '#777' : (opts.skin||'#e0ac69');
  var hair = gray ? '#555' : (opts.hair||'#2b1d0e');
  var bulk = 1 + (sh/100)*1.6 + (roid*0.18);
  if(bulk>3.2) bulk=3.2;
  var shoulder = 30*bulk, arm = 9*bulk, chest = 26*bulk, neck = 8 + bulk*3;
  var veined = roid>=3;
  var s = '';
  s += '<svg viewBox="0 0 200 240" width="100%" style="max-width:240px;display:block;margin:0 auto">';
  s += '<ellipse cx="100" cy="232" rx="'+(shoulder+10)+'" ry="8" fill="#000" opacity="0.25"/>';
  s += '<rect x="'+(100-chest*0.5)+'" y="170" width="'+(chest*0.42)+'" height="60" rx="14" fill="'+skin+'"/>';
  s += '<rect x="'+(100+chest*0.08)+'" y="170" width="'+(chest*0.42)+'" height="60" rx="14" fill="'+skin+'"/>';
  s += '<path d="M '+(100-shoulder)+' 95 Q 100 80 '+(100+shoulder)+' 95 L '+(100+chest*0.6)+' 180 Q 100 195 '+(100-chest*0.6)+' 180 Z" fill="'+skin+'"/>';
  if(veined){ s += '<path d="M85 120 q15 -10 30 0" stroke="#8a2a2a" stroke-width="2" fill="none" opacity="0.5"/>'; }
  s += '<ellipse cx="'+(100-chest*0.28)+'" cy="118" rx="'+(chest*0.3)+'" ry="'+(14*bulk)+'" fill="'+skin+'"/>';
  s += '<ellipse cx="'+(100+chest*0.28)+'" cy="118" rx="'+(chest*0.3)+'" ry="'+(14*bulk)+'" fill="'+skin+'"/>';
  s += '<ellipse cx="'+(100-shoulder)+'" cy="120" rx="'+arm+'" ry="'+(arm*2.2)+'" fill="'+skin+'" transform="rotate(-15 '+(100-shoulder)+' 120)"/>';
  s += '<ellipse cx="'+(100+shoulder)+'" cy="120" rx="'+arm+'" ry="'+(arm*2.2)+'" fill="'+skin+'" transform="rotate(15 '+(100+shoulder)+' 120)"/>';
  s += '<rect x="'+(100-neck/2)+'" y="62" width="'+neck+'" height="22" fill="'+skin+'"/>';
  s += '<circle cx="100" cy="48" r="26" fill="'+skin+'"/>';
  s += '<path d="M76 40 Q100 14 124 40 Q124 26 100 24 Q76 26 76 40Z" fill="'+hair+'"/>';
  s += '<circle cx="91" cy="48" r="3" fill="#222"/><circle cx="109" cy="48" r="3" fill="#222"/>';
  if(opts.sleeping){ s += '<path d="M86 48 q5 4 10 0" stroke="#222" stroke-width="2" fill="none"/><path d="M104 48 q5 4 10 0" stroke="#222" stroke-width="2" fill="none"/><text x="128" y="40" font-size="16">\uD83D\uDCA4</text>'; }
  else { s += '<path d="M90 60 q10 6 20 0" stroke="#7a4" stroke-width="2" fill="none"/>'; }
  if(roid>=5){ s += '<text x="150" y="60" font-size="22">\uD83D\uDC80</text>'; }
  s += '</svg>';
  return s;
}
// ---------- HELPERS ----------
function job(){ return CFG.jobs[S.jobIndex]; }
function vehicle(){ return CFG.vehicles.find(function(v){return v.id===S.vehicle;}); }
function clamp(v){ return Math.max(0, Math.min(100, v)); }
function isBusy(){ return S.busyUntil > Date.now(); }
function busyLeft(){ return Math.max(0, Math.ceil((S.busyUntil-Date.now())/1000)); }
function isNatural(){ return S.roidDoses===0; }
function naturalSeal(){
  if(S.roidDoses===0) return {txt:'Natural', color:'#4ade80', icon:'\u2705'};
  if(S.roidDoses<3)  return {txt:'Suspeito', color:'#fbbf24', icon:'\u2753'};
  return {txt:'Bombado', color:'#ef4444', icon:'\uD83D\uDC80'};
}

// ---------- ACOES ----------
function startAction(action, secs){
  if(!S.alive){ toast('Seu avatar esta morto!'); return; }
  if(isBusy()){ toast('Avatar ocupado...'); return; }
  if(S.energy<=0 && action!=='sleep' && action!=='eat'){ toast('Sem energia! Mande dormir.'); return; }
  var mult = vehicle().mult;
  var dur = (action==='work'||action==='train') ? Math.round(secs*mult) : secs;
  S.busyAction = action; S.busyUntil = Date.now()+dur*1000; save(); render();
}
function finishAction(){
  var a = S.busyAction; S.busyAction=null; S.busyUntil=0;
  if(a==='work'){
    S.coins += job().pay;
    S.energy = clamp(S.energy - CFG.workEnergy);
    S.life = clamp(S.life - CFG.workLife);
    toast('+'+job().pay+' moedas \uD83D\uDCB0');
  } else if(a==='train'){
    S.shape = Math.min(CFG.maxShape, S.shape + CFG.trainShape);
    S.energy = clamp(S.energy - CFG.trainEnergy);
    S.life = clamp(S.life - CFG.trainLife);
    toast('+'+CFG.trainShape+' SHAPE \uD83D\uDCAA');
  }
  save(); render();
}
function eat(){
  if(isBusy()){ toast('Avatar ocupado...'); return; }
  if(S.coins<CFG.eatCost){ toast('Sem moedas para comer!'); return; }
  S.coins -= CFG.eatCost;
  S.energy = clamp(S.energy + CFG.eatEnergy);
  S.life = clamp(S.life + CFG.eatLife);
  S.hunger = clamp(S.hunger + 40);
  toast('Comeu! +energia +vida'); save(); render();
}
function sleep(){
  if(isBusy()){ toast('Avatar ocupado...'); return; }
  // dorme a qualquer momento. Qualidade depende da energia.
  var q = S.energy>=80?1.0 : S.energy>=50?0.7 : S.energy>=30?0.5 : 0.35;
  S.energy = 100;
  S.life = clamp(S.life + Math.round(100*q));
  // novo dia / streak
  var today = new Date().toDateString();
  if(S.lastDay!==today){ S.streak += 1; S.daysInJob += 1; S.lastDay=today; checkPromo(); }
  toast(q>=1?'Dormiu como uma pedra! Vida 100%':'Dormiu mal, vida parcial'); 
  save(); render();
}
function takeRoid(){
  if(isBusy()){ toast('Avatar ocupado...'); return; }
  if(S.coins<CFG.roidCost){ toast('Sem moedas para o esteroide!'); return; }
  S.coins -= CFG.roidCost;
  S.roidDoses += 1;
  S.shape = Math.min(CFG.maxShape, S.shape + CFG.roidShape);
  S.life = clamp(S.life - CFG.roidLifeCost);
  S.energy = 100; // recupera energia automatico
  toast('\uD83D\uDC89 Bombou! +'+CFG.roidShape+' shape, -'+CFG.roidLifeCost+'% vida');
  if(S.life<=0){ die('overdose de bomba'); }
  save(); render();
}
function checkPromo(){
  var j = job();
  if(S.jobIndex < CFG.jobs.length-1){
    var next = CFG.jobs[S.jobIndex+1];
    if(S.daysInJob>=j.daysToPromo && S.shape>=next.minShape){
      S.jobIndex++; S.daysInJob=0; toast('\uD83C\uDF89 PROMOVIDO a '+CFG.jobs[S.jobIndex].name+'!');
    }
  }
}
function die(cause){
  S.alive=false; S.deaths++; S.grayUntil=Date.now()+24*3600*1000;
  S.busyUntil=0; S.busyAction=null;
  toast('\u26B0\uFE0F Avatar morreu: '+cause); save();
}
function respawn(){
  var keepName=S.name, keepGender=S.gender, keepSkin=S.skin, keepHair=S.hair, keepDeaths=S.deaths;
  S = defaultState();
  S.created=true; S.name=keepName; S.gender=keepGender; S.skin=keepSkin; S.hair=keepHair; S.deaths=keepDeaths;
  toast('Renasceu do shape 1! \uD83D\uDD25 Phoenix'); save(); render();
}
// ---------- TICK (passagem de tempo real) ----------
function tick(){
  var now = Date.now();
  // finaliza acao se acabou o tempo
  if(S.busyAction && now>=S.busyUntil){ finishAction(); }
  // ressuscita do estado cinza apos 24h
  if(!S.alive && S.grayUntil && now>=S.grayUntil){ /* aguarda clique respawn */ }
  if(!S.alive){ S.lastTick=now; return; }
  var elapsedMin = (now - (S.lastTick||now))/60000;
  if(elapsedMin>0.05){
    // fome cai com o tempo (1% a cada ~3min)
    S.hunger = clamp(S.hunger - elapsedMin*0.33);
    // se com fome, vida cai
    if(S.hunger<=0){ S.life = clamp(S.life - elapsedMin*0.5); }
    // se energia 0, vida cai (definhacao)
    if(S.energy<=0){ S.life = clamp(S.life - elapsedMin*CFG.noEnergyLifeDrain*0.3); }
    // risco de morte por esteroide (acumulado)
    if(S.roidDoses>0){
      var riskPerMin = (S.roidDoses*CFG.roidDeathRiskPerDose)/(24*60);
      if(Math.random()*100 < riskPerMin*elapsedMin){ die('overdose de bomba'); }
    }
    if(S.life<=0 && S.alive){ die('fome / exaustao'); }
    S.lastTick = now; save();
  }
}

// ---------- TOAST ----------
var toastTimer=null;
function toast(msg){
  var t = document.getElementById('toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t);
    t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#1f2937;border:1px solid #374151;color:#fff;padding:10px 18px;border-radius:30px;font-size:14px;z-index:999;box-shadow:0 6px 20px #000a;max-width:90%;text-align:center';
  }
  t.textContent=msg; t.style.opacity='1';
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){ t.style.transition='opacity .4s'; t.style.opacity='0'; },1800);
}
// ---------- RANKING (bots ficticios + voce) ----------
// foco no SHAPE. emprego pode ser comicamente baixo com shape alto.
var BOT_NAMES = ['Rambao','Marquinhos','Bruta','Zé Monstro','Helena Forte','Tonho','Bia Bombada','Cleitin','Vera Veia','Juninho','Sandra','Maromba King','Tiãozão','Paty Fit','Gugu','Nanda','Robson','Carlão','Duda','Magrão'];
function buildRanking(){
  var list = [];
  for(var i=0;i<BOT_NAMES.length;i++){
    var seed=(i*37+13)%100;
    var bshape = 5 + ((seed*7)%96);
    var bjob = Math.min(CFG.jobs.length-1, Math.floor(bshape/14));
    // alguns bots: shape alto, emprego baixo (comico)
    if(i%5===0) bjob = Math.max(0, bjob-3);
    var roid = (i%4===0)? (1+i%4) : 0;
    list.push({name:BOT_NAMES[i], shape:bshape, job:CFG.jobs[bjob].name, roid:roid, you:false});
  }
  list.push({name:S.name||'Você', shape:S.shape, job:job().name, roid:S.roidDoses, you:true});
  list.sort(function(a,b){ return b.shape-a.shape; });
  return list;
}
function myRank(){
  var r=buildRanking(); for(var i=0;i<r.length;i++){ if(r[i].you) return {pos:i+1,total:r.length}; }
  return {pos:0,total:r.length};
}
function percentStronger(){
  var mr=myRank(); return Math.round(((mr.total-mr.pos)/mr.total)*100);
}
// ---------- UI / RENDER ----------
var TAB='home';
function bar(label,val,color){
  return '<div style="margin:6px 0"><div style="display:flex;justify-content:space-between;font-size:12px;color:#9ca3af;margin-bottom:3px"><span>'+label+'</span><span>'+Math.round(val)+'%</span></div><div style="background:#1f2937;border-radius:8px;height:12px;overflow:hidden"><div style="width:'+clamp(val)+'%;height:100%;background:'+color+';transition:width .4s;border-radius:8px"></div></div></div>';
}
function btn(label,sub,onclick,bg,disabled){
  return '<button '+(disabled?'disabled':'')+' onclick="'+onclick+'" style="flex:1;min-width:46%;background:'+(disabled?'#374151':bg)+';border:none;color:#fff;padding:14px 8px;border-radius:14px;font-size:15px;font-weight:600;opacity:'+(disabled?0.5:1)+'">'+label+'<div style="font-size:11px;font-weight:400;opacity:.85;margin-top:2px">'+sub+'</div></button>';
}

function render(){
  var app=document.getElementById('app');
  if(!S.created){ app.innerHTML=screenCreate(); return; }
  if(!S.alive){ app.innerHTML=screenDead(); return; }
  var content='';
  if(TAB==='home') content=screenHome();
  else if(TAB==='rank') content=screenRank();
  else if(TAB==='shop') content=screenShop();
  else if(TAB==='stats') content=screenStats();
  app.innerHTML=content+navBar();
}

function navBar(){
  var tabs=[['home','\uD83C\uDFE0','Avatar'],['rank','\uD83C\uDFC6','Ranking'],['shop','\uD83C\uDFEA','Loja'],['stats','\uD83D\uDCCA','Stats']];
  var h='<div style="position:fixed;bottom:0;left:0;right:0;max-width:480px;margin:0 auto;display:flex;background:#0f0f17;border-top:1px solid #1f2937">';
  for(var i=0;i<tabs.length;i++){ var t=tabs[i]; var on=TAB===t[0];
    h+='<button onclick="setTab(\''+t[0]+'\')" style="flex:1;background:none;border:none;color:'+(on?'#fbbf24':'#6b7280')+';padding:10px 0;font-size:11px"><div style="font-size:20px">'+t[1]+'</div>'+t[2]+'</button>'; }
  h+='</div>'; return h;
}
function setTab(t){ TAB=t; render(); }
// ----- TELA: CRIAR AVATAR -----
function screenCreate(){
  var skins=['#ffdbac','#f1c27d','#e0ac69','#c68642','#8d5524','#5a3a22'];
  var hairs=['#2b1d0e','#000000','#7a4a12','#d4b483','#9aa0a6','#b33b3b'];
  var h='<div class="screen active" style="text-align:center">';
  h+='<h1 style="font-size:28px;margin:20px 0 4px;color:#fbbf24">\uD83D\uDCAA MAROMBINHA</h1>';
  h+='<p style="color:#9ca3af;font-size:13px;margin-bottom:16px">Crie seu monstro do shape</p>';
  h+='<div style="background:#0f0f17;border-radius:16px;padding:16px;margin-bottom:14px">'+avatarSVG({shape:8,skin:S.skin,hair:S.hair})+'</div>';
  h+='<input id="avname" placeholder="Nome do avatar" value="'+(S.name||'')+'" oninput="S.name=this.value" style="width:100%;padding:12px;border-radius:10px;border:1px solid #374151;background:#1f2937;color:#fff;font-size:15px;margin-bottom:14px">';
  h+='<div style="text-align:left;color:#9ca3af;font-size:12px;margin-bottom:6px">Genero</div>';
  h+='<div style="display:flex;gap:8px;margin-bottom:14px">';
  h+='<button onclick="S.gender=\'M\';render()" style="flex:1;padding:12px;border-radius:10px;border:2px solid '+(S.gender==='M'?'#fbbf24':'#374151')+';background:#1f2937;color:#fff">\uD83D\uDC68 Homem</button>';
  h+='<button onclick="S.gender=\'F\';render()" style="flex:1;padding:12px;border-radius:10px;border:2px solid '+(S.gender==='F'?'#fbbf24':'#374151')+';background:#1f2937;color:#fff">\uD83D\uDC69 Mulher</button>';
  h+='</div>';
  h+='<div style="text-align:left;color:#9ca3af;font-size:12px;margin-bottom:6px">Cor da pele</div><div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">';
  for(var i=0;i<skins.length;i++){ h+='<button onclick="S.skin=\''+skins[i]+'\';render()" style="width:42px;height:42px;border-radius:50%;background:'+skins[i]+';border:3px solid '+(S.skin===skins[i]?'#fbbf24':'transparent')+'"></button>'; }
  h+='</div>';
  h+='<div style="text-align:left;color:#9ca3af;font-size:12px;margin-bottom:6px">Cor do cabelo</div><div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">';
  for(var j=0;j<hairs.length;j++){ h+='<button onclick="S.hair=\''+hairs[j]+'\';render()" style="width:42px;height:42px;border-radius:50%;background:'+hairs[j]+';border:3px solid '+(S.hair===hairs[j]?'#fbbf24':'transparent')+'"></button>'; }
  h+='</div>';
  h+='<button onclick="createAvatar()" style="width:100%;padding:16px;border-radius:14px;border:none;background:#fbbf24;color:#000;font-size:17px;font-weight:700">COMEÇAR \uD83D\uDD25</button>';
  h+='</div>'; return h;
}
function createAvatar(){
  var n=document.getElementById('avname').value.trim();
  if(!n){ toast('Digite um nome!'); return; }
  S.name=n; S.created=true; S.alive=true; S.lastDay=new Date().toDateString(); S.streak=1;
  save(); render();
}
// ----- TELA: HOME -----
function screenHome(){
  var seal=naturalSeal(); var mr=myRank(); var busy=isBusy();
  var statusTxt = busy ? (S.busyAction==='work'?'\uD83D\uDCBC Trabalhando ('+busyLeft()+'s)':'\uD83D\uDCAA Treinando ('+busyLeft()+'s)') : (S.energy<=0?'\uD83D\uDE29 Exausto, precisa dormir':'\uD83D\uDE42 Descansando');
  var h='<div class="screen active">';
  // topo
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
  h+='<div><span style="font-size:20px;font-weight:700;color:#fbbf24">'+S.name+'</span> <span style="font-size:12px;color:'+seal.color+'">'+seal.icon+' '+seal.txt+'</span></div>';
  h+='<div style="text-align:right;font-size:12px;color:#9ca3af">#'+mr.pos+' de '+mr.total+'<br><span style="color:#fff">'+job().emoji+' '+job().name+'</span></div>';
  h+='</div>';
  // avatar
  h+='<div style="background:radial-gradient(circle at 50% 30%,#1a1a28,#0a0a0f);border-radius:18px;padding:10px;margin-bottom:6px;position:relative">';
  h+=avatarSVG({shape:S.shape,roid:S.roidDoses,skin:S.skin,hair:S.hair,sleeping:false});
  h+='<div style="text-align:center;font-size:22px;font-weight:800;color:#fff">SHAPE '+S.shape+'</div>';
  h+='<div style="text-align:center;font-size:13px;color:#9ca3af">'+statusTxt+'</div>';
  h+='</div>';
  // barras
  h+='<div style="background:#0f0f17;border-radius:14px;padding:10px 14px;margin-bottom:10px">';
  h+=bar('\uD83D\uDCAA Força (Shape)', S.shape, '#22c55e');
  h+=bar('\u26A1 Energia', S.energy, '#3b82f6');
  h+=bar('\u2764\uFE0F Vida', S.life, '#ef4444');
  h+=bar('\uD83C\uDF54 Fome', S.hunger, '#f97316');
  h+='</div>';
  // coins + streak
  h+='<div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:14px"><span>\uD83D\uDCB0 '+S.coins+' moedas</span><span>\uD83D\uDD25 Streak '+S.streak+' dias</span></div>';
  // botoes de acao
  h+='<div style="display:flex;flex-wrap:wrap;gap:8px">';
  h+=btn('\uD83D\uDCBC Trabalhar','+'+job().pay+' moedas','startAction(\'work\','+CFG.workSecs+')','#2563eb',busy);
  h+=btn('\uD83D\uDCAA Treinar','+'+CFG.trainShape+' shape','startAction(\'train\','+CFG.trainSecs+')','#16a34a',busy||S.energy<=0);
  h+=btn('\uD83C\uDF54 Comer','-'+CFG.eatCost+' moedas','eat()','#ea580c',busy);
  h+=btn('\uD83D\uDE34 Dormir','recupera vida','sleep()','#7c3aed',busy);
  h+='</div>';
  if(S.energy<=0){ h+='<div style="margin-top:10px;background:#7c2d12;padding:10px;border-radius:10px;text-align:center;font-size:13px">\uD83D\uDE34 Sem energia! Mande dormir para recuperar.</div>'; }
  h+='</div>'; return h;
}

// ----- TELA: MORTE -----
function screenDead(){
  var canRespawn = Date.now()>=S.grayUntil;
  var h='<div class="screen active" style="text-align:center;padding-top:40px">';
  h+='<div style="filter:grayscale(1);opacity:.6">'+avatarSVG({shape:S.shape,roid:S.roidDoses,gray:true})+'</div>';
  h+='<h2 style="color:#ef4444;margin:14px 0">\u26B0\uFE0F Seu avatar morreu</h2>';
  h+='<p style="color:#9ca3af;font-size:14px;margin-bottom:8px">Ele aparece cinza no ranking por 24h.</p>';
  if(canRespawn){ h+='<button onclick="respawn()" style="margin-top:20px;padding:16px 30px;border-radius:14px;border:none;background:#fbbf24;color:#000;font-size:16px;font-weight:700">\uD83D\uDD25 Renascer (Shape 1)</button>'; }
  else { h+='<p style="color:#fbbf24;margin-top:20px">Renasce em breve...</p><button onclick="S.grayUntil=Date.now();render()" style="margin-top:14px;padding:10px 20px;border-radius:10px;border:1px solid #374151;background:#1f2937;color:#fff;font-size:13px">Pular espera (teste)</button>'; }
  h+='</div>'; return h;
}
// ----- TELA: RANKING -----
function screenRank(){
  var r=buildRanking(); var pct=percentStronger(); var mr=myRank();
  var h='<div class="screen active">';
  h+='<div style="background:linear-gradient(135deg,#1e3a8a,#7c3aed);border-radius:16px;padding:16px;margin-bottom:14px;text-align:center">';
  h+='<div style="font-size:13px;opacity:.9">SHAPE DO DIA</div>';
  h+='<div style="font-size:30px;font-weight:800;margin:4px 0">#'+mr.pos+'</div>';
  h+='<div style="font-size:14px">Você está mais forte que <b>'+pct+'%</b> dos jogadores</div>';
  h+='</div>';
  h+='<div style="font-size:13px;color:#9ca3af;margin-bottom:8px">Ranking por SHAPE \uD83D\uDCAA</div>';
  for(var i=0;i<Math.min(r.length,30);i++){ var p=r[i];
    var medal = i===0?'\uD83E\uDD47':i===1?'\uD83E\uDD48':i===2?'\uD83E\uDD49':(i+1);
    var seal = p.roid===0?'<span style="color:#4ade80;font-size:11px">\u2705</span>':(p.roid<3?'<span style="color:#fbbf24;font-size:11px">\u2753</span>':'<span style="color:#ef4444;font-size:11px">\uD83D\uDC80</span>');
    h+='<div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;margin-bottom:6px;background:'+(p.you?'#fbbf2422':'#0f0f17')+';border:'+(p.you?'1px solid #fbbf24':'1px solid transparent')+'">';
    h+='<div style="width:28px;text-align:center;font-weight:700">'+medal+'</div>';
    h+='<div style="flex:1"><div style="font-weight:600">'+(p.you?'\uD83D\uDC49 ':'')+p.name+' '+seal+'</div><div style="font-size:11px;color:#6b7280">'+p.job+'</div></div>';
    h+='<div style="font-weight:800;color:#22c55e">'+p.shape+'</div>';
    h+='</div>';
  }
  h+='</div>'; return h;
}

// ----- TELA: LOJA -----
function screenShop(){
  var h='<div class="screen active">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;background:#0f0f17;border-radius:12px;padding:12px;margin-bottom:14px"><span style="font-size:16px">\uD83D\uDCB0 '+S.coins+' moedas</span><button onclick="buyCoins()" style="background:#fbbf24;border:none;color:#000;padding:8px 14px;border-radius:10px;font-weight:700;font-size:13px">+ Comprar moedas</button></div>';
  // esteroide
  h+='<div style="color:#ef4444;font-size:13px;font-weight:700;margin-bottom:6px">\u26A0\uFE0F ESTEROIDES (PERIGO)</div>';
  h+='<div style="background:#1a0d0d;border:1px solid #7f1d1d;border-radius:12px;padding:12px;margin-bottom:14px">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-weight:700">\uD83D\uDC89 Injeção de Bomba \uD83D\uDC80</div><div style="font-size:12px;color:#9ca3af">+'+CFG.roidShape+' shape, -'+CFG.roidLifeCost+'% vida, +risco de morte</div></div>';
  h+='<button onclick="takeRoid()" style="background:#dc2626;border:none;color:#fff;padding:10px 14px;border-radius:10px;font-weight:700">'+CFG.roidCost+' \uD83D\uDCB0</button></div>';
  h+='<div style="font-size:11px;color:#fca5a5;margin-top:8px">Você tem '+S.life+'% de vida. Doses tomadas: '+S.roidDoses+'. Calcule o risco!</div>';
  h+='</div>';
  // veiculos
  h+='<div style="font-size:13px;font-weight:700;margin-bottom:6px">\uD83D\uDE97 VEÍCULOS (aceleram trabalho e treino)</div>';
  for(var i=1;i<CFG.vehicles.length;i++){ var v=CFG.vehicles[i]; var owned=ownsVehicle(v.id); var equipped=S.vehicle===v.id;
    h+='<div style="display:flex;justify-content:space-between;align-items:center;background:#0f0f17;border-radius:10px;padding:10px;margin-bottom:6px">';
    h+='<div><div style="font-weight:600">'+v.emoji+' '+v.name+'</div><div style="font-size:11px;color:#6b7280">tempo x'+v.mult+'</div></div>';
    if(equipped) h+='<span style="color:#fbbf24;font-size:13px">Equipado \u2705</span>';
    else if(owned) h+='<button onclick="equipVehicle(\''+v.id+'\')" style="background:#374151;border:none;color:#fff;padding:8px 12px;border-radius:8px;font-size:13px">Equipar</button>';
    else h+='<button onclick="buyVehicle(\''+v.id+'\')" style="background:#2563eb;border:none;color:#fff;padding:8px 12px;border-radius:8px;font-size:13px">'+v.cost+' \uD83D\uDCB0</button>';
    h+='</div>';
  }
  h+='</div>'; return h;
}
function ownsVehicle(id){ S.ownedVehicles=S.ownedVehicles||['pe']; return S.ownedVehicles.indexOf(id)>=0; }
function buyVehicle(id){ var v=CFG.vehicles.find(function(x){return x.id===id;}); if(S.coins<v.cost){ toast('Sem moedas!'); return; } S.coins-=v.cost; S.ownedVehicles=S.ownedVehicles||['pe']; S.ownedVehicles.push(id); S.vehicle=id; toast('Comprou '+v.name+'!'); save(); render(); }
function equipVehicle(id){ S.vehicle=id; toast('Equipado!'); save(); render(); }
function buyCoins(){ S.coins+=500; toast('(DEMO) +500 moedas. Na versão final será compra real.'); save(); render(); }

// ----- TELA: STATS -----
function screenStats(){
  var seal=naturalSeal();
  var h='<div class="screen active">';
  h+='<h2 style="font-size:20px;margin-bottom:14px">\uD83D\uDCCA Estatísticas</h2>';
  h+=statBlock('CARREIRA',[['Emprego',job().emoji+' '+job().name],['Dias no cargo',S.daysInJob+''],['Veículo',vehicle().emoji+' '+vehicle().name]]);
  h+=statBlock('SAÚDE',[['Shape atual',S.shape+''],['Selo',seal.icon+' '+seal.txt],['Doses de bomba',S.roidDoses+''],['Mortes',S.deaths+'']]);
  h+=statBlock('STREAK',[['Streak atual',S.streak+' dias \uD83D\uDD25']]);
  h+='<button onclick="if(confirm(\'Resetar tudo?\')){localStorage.removeItem(\'marombinha\');location.reload();}" style="width:100%;margin-top:14px;padding:12px;border-radius:10px;border:1px solid #7f1d1d;background:#1a0d0d;color:#fca5a5;font-size:13px">Resetar jogo (apagar tudo)</button>';
  h+='</div>'; return h;
}
function statBlock(title,rows){
  var h='<div style="background:#0f0f17;border-radius:12px;padding:14px;margin-bottom:12px"><div style="color:#fbbf24;font-size:12px;font-weight:700;margin-bottom:8px">'+title+'</div>';
  for(var i=0;i<rows.length;i++){ h+='<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:14px;border-bottom:1px solid #1f2937"><span style="color:#9ca3af">'+rows[i][0]+'</span><span>'+rows[i][1]+'</span></div>'; }
  return h+'</div>';
}

// ---------- INIT ----------
load();
render();
setInterval(function(){ tick(); if(S.busyAction||TAB==='home'){ render(); } }, 1000);
window.S=S;
