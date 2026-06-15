/* MAROMBINHA v0.2 - Avatar 3D (Three.js) + design moderno + sem piscar */

// ---------- CONFIG ----------
var CFG = {
  jobs: [
    { name:'Estagiario',      emoji:'\uD83D\uDCDA', pay:5,   minShape:0,  daysToPromo:3 },
    { name:'Analista Jr',     emoji:'\uD83D\uDCBC', pay:15,  minShape:10, daysToPromo:5 },
    { name:'Analista Pleno',  emoji:'\uD83D\uDCCA', pay:35,  minShape:25, daysToPromo:8 },
    { name:'Analista Senior', emoji:'\uD83C\uDFAF', pay:65,  minShape:40, daysToPromo:12 },
    { name:'Gerente',         emoji:'\uD83D\uDC54', pay:120, minShape:60, daysToPromo:16 },
    { name:'Diretor',         emoji:'\uD83C\uDFE2', pay:200, minShape:75, daysToPromo:20 },
    { name:'CEO',             emoji:'\uD83C\uDFC6', pay:350, minShape:90, daysToPromo:25 },
    { name:'Empreendedor',    emoji:'\uD83D\uDE80', pay:500, minShape:95, daysToPromo:999 }
  ],
  vehicles: [
    { id:'pe',   name:'A pe',        emoji:'\uD83D\uDEB6', cost:0,     mult:1.0 },
    { id:'bike', name:'Bicicleta',   emoji:'\uD83D\uDEB2', cost:500,   mult:0.5 },
    { id:'moto', name:'Motocicleta', emoji:'\uD83C\uDFCD', cost:2000,  mult:0.35 },
    { id:'carro',name:'Carro',       emoji:'\uD83D\uDE97', cost:5000,  mult:0.25 },
    { id:'heli', name:'Helicoptero', emoji:'\uD83D\uDE81', cost:50000, mult:0.10 }
  ],
  workSecs:20, trainSecs:15, trainShape:2,
  eatCost:5, eatEnergy:30, eatLife:12,
  roidCost:150, roidShape:10, roidLifeCost:10, roidDeathRiskPerDose:2,
  workEnergy:25, workLife:2, trainEnergy:35, trainLife:3,
  noEnergyLifeDrain:1, maxShape:100
};

// ---------- ESTADO ----------
var S = null;
function defaultState(){
  return { created:false, name:'', gender:'M', skin:'#e0ac69', hair:'#2b1d0e',
    shape:1, life:100, energy:100, hunger:100, coins:0, jobIndex:0, daysInJob:0,
    vehicle:'pe', ownedVehicles:['pe'], roidDoses:0, streak:0, lastDay:null,
    deaths:0, alive:true, grayUntil:0, busyUntil:0, busyAction:null, lastTick:Date.now() };
}
function load(){ try{ S=JSON.parse(localStorage.getItem('marombinha')); }catch(e){ S=null; } if(!S) S=defaultState(); if(!S.ownedVehicles) S.ownedVehicles=['pe']; }
function save(){ localStorage.setItem('marombinha', JSON.stringify(S)); }

// ---------- HELPERS ----------
function job(){ return CFG.jobs[S.jobIndex]; }
function vehicle(){ return CFG.vehicles.find(function(v){return v.id===S.vehicle;}); }
function clamp(v){ return Math.max(0, Math.min(100, v)); }
function isBusy(){ return S.busyUntil > Date.now(); }
function busyLeft(){ return Math.max(0, Math.ceil((S.busyUntil-Date.now())/1000)); }
function naturalSeal(){
  if(S.roidDoses===0) return {txt:'Natural', color:'#4ade80', icon:'\u2705'};
  if(S.roidDoses<3)  return {txt:'Suspeito', color:'#fbbf24', icon:'\u2753'};
  return {txt:'Bombado', color:'#ef4444', icon:'\uD83D\uDC80'};
}
// ====================================================================
//  AVATAR 3D (Three.js r128 compativel)
// ====================================================================
var A3D = { scene:null, camera:null, renderer:null, group:null, raf:null, mount:null };
function hexToColor(h){ return new THREE.Color(h); }
function capsule(radius, length, mat){
  var grp = new THREE.Group();
  var cyl = new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,16), mat);
  grp.add(cyl);
  var top = new THREE.Mesh(new THREE.SphereGeometry(radius,16,12), mat); top.position.y=length/2; grp.add(top);
  var bot = new THREE.Mesh(new THREE.SphereGeometry(radius,16,12), mat); bot.position.y=-length/2; grp.add(bot);
  return grp;
}
function init3D(mountEl){
  if(A3D.renderer && A3D.mount===mountEl) return;
  dispose3D();
  A3D.mount = mountEl;
  var w = mountEl.clientWidth || 400, h = mountEl.clientHeight || 300;
  A3D.scene = new THREE.Scene();
  A3D.camera = new THREE.PerspectiveCamera(38, w/h, 0.1, 100);
  A3D.camera.position.set(0, 1.3, 6.4);
  A3D.camera.lookAt(0,0.9,0);
  A3D.renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  A3D.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  A3D.renderer.setSize(w,h);
  mountEl.innerHTML='';
  mountEl.appendChild(A3D.renderer.domElement);
  var key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(3,6,5); A3D.scene.add(key);
  var rim = new THREE.DirectionalLight(0x6699ff, 0.9); rim.position.set(-4,3,-3); A3D.scene.add(rim);
  var fill = new THREE.DirectionalLight(0xffaa55, 0.5); fill.position.set(-3,1,4); A3D.scene.add(fill);
  A3D.scene.add(new THREE.AmbientLight(0x505070, 1.0));
  var floorMat = new THREE.MeshBasicMaterial({color:0x000000, transparent:true, opacity:0.3});
  var floor = new THREE.Mesh(new THREE.CircleGeometry(2.2,48), floorMat);
  floor.rotation.x=-Math.PI/2; floor.position.y=-1.7; A3D.scene.add(floor);
  A3D.group = new THREE.Group(); A3D.scene.add(A3D.group);
  animate3D();
}
function buildAvatar(opts){
  if(!A3D.group) return;
  while(A3D.group.children.length) A3D.group.remove(A3D.group.children[0]);
  var sh=opts.shape||1, roid=opts.roid||0, gray=opts.gray;
  var skinHex = gray ? '#8a8a8a' : (opts.skin||'#e0ac69');
  var hairHex = gray ? '#666666' : (opts.hair||'#2b1d0e');
  var skin = new THREE.MeshStandardMaterial({color:hexToColor(skinHex), roughness:0.6, metalness:0.05});
  if(roid>=3){ skin.color.lerp(new THREE.Color('#d98a8a'), 0.25); }
  var hairMat = new THREE.MeshStandardMaterial({color:hexToColor(hairHex), roughness:0.85});
  var shortMat = new THREE.MeshStandardMaterial({color:hexToColor('#243049'), roughness:0.7});
  var bulk = 1 + (sh/100)*1.4 + roid*0.22; if(bulk>3.0) bulk=3.0;
  var g = A3D.group;
  function add(m,x,y,z){ if(x!==undefined){m.position.set(x,y,z);} g.add(m); return m; }
  var legR2 = 0.2*(1+(bulk-1)*0.45);
  add(capsule(legR2,1.0,skin), -0.26,-1.0,0);
  add(capsule(legR2,1.0,skin), 0.26,-1.0,0);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.34*bulk*0.75,0.38*bulk*0.75,0.5,16),shortMat),0,-0.42,0);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.4*bulk*0.7,0.27*bulk*0.7,1.25,18),skin),0,0.4,0);
  var pec=new THREE.SphereGeometry(0.2*bulk*0.8,16,14);
  var pL=add(new THREE.Mesh(pec,skin), -0.16*bulk*0.7,0.66,0.24*bulk*0.6); pL.scale.set(1,0.85,0.7);
  var pR=add(new THREE.Mesh(pec,skin), 0.16*bulk*0.7,0.66,0.24*bulk*0.6); pR.scale.set(1,0.85,0.7);
  var sho=new THREE.SphereGeometry(0.21*bulk*0.78,16,14);
  add(new THREE.Mesh(sho,skin), -0.42*bulk*0.7,0.92,0);
  add(new THREE.Mesh(sho,skin), 0.42*bulk*0.7,0.92,0);
  var armR3=0.15*bulk*0.8;
  var aL=add(capsule(armR3,0.85,skin), -0.5*bulk*0.7,0.3,0); aL.rotation.z=0.2;
  var aR=add(capsule(armR3,0.85,skin), 0.5*bulk*0.7,0.3,0); aR.rotation.z=-0.2;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.13+bulk*0.04,0.15+bulk*0.04,0.28,12),skin),0,1.12,0);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.4,24,20),skin),0,1.52,0);
  var hg=new THREE.SphereGeometry(0.43,24,18,0,Math.PI*2,0,Math.PI*0.55);
  add(new THREE.Mesh(hg,hairMat),0,1.56,0);
  var em=new THREE.MeshStandardMaterial({color:0x111111});
  var eg=new THREE.SphereGeometry(0.05,10,10);
  add(new THREE.Mesh(eg,em), -0.14,1.54,0.36);
  add(new THREE.Mesh(eg,em), 0.14,1.54,0.36);
  g.position.y = 0.25; g.rotation.y = 0;
}
function animate3D(){
  A3D.raf=requestAnimationFrame(animate3D);
  if(A3D.group) A3D.group.rotation.y += 0.007;
  if(A3D.renderer&&A3D.scene&&A3D.camera) A3D.renderer.render(A3D.scene,A3D.camera);
}
function dispose3D(){
  if(A3D.raf) cancelAnimationFrame(A3D.raf); A3D.raf=null;
  if(A3D.renderer){ try{A3D.renderer.dispose();}catch(e){} A3D.renderer=null; }
  A3D.scene=null;A3D.camera=null;A3D.group=null;A3D.mount=null;
}
// ====================================================================
//  ACOES E LOGICA
// ====================================================================
function startAction(action, secs){
  if(!S.alive){ toast('Seu avatar esta morto!'); return; }
  if(isBusy()){ toast('Avatar ocupado...'); return; }
  if(S.energy<=0 && action!=='sleep' && action!=='eat'){ toast('\u26A1 Sem energia! Manda dormir.'); return; }
  var mult = vehicle().mult;
  var dur = (action==='work'||action==='train') ? Math.max(2,Math.round(secs*mult)) : secs;
  S.busyAction=action; S.busyUntil=Date.now()+dur*1000; save(); render();
}
function finishAction(){
  var a=S.busyAction; S.busyAction=null; S.busyUntil=0;
  if(a==='work'){ S.coins+=job().pay; S.energy=clamp(S.energy-CFG.workEnergy); S.life=clamp(S.life-CFG.workLife); toast('+'+job().pay+' moedas \uD83D\uDCB0'); }
  else if(a==='train'){ S.shape=Math.min(CFG.maxShape,S.shape+CFG.trainShape); S.energy=clamp(S.energy-CFG.trainEnergy); S.life=clamp(S.life-CFG.trainLife); toast('+'+CFG.trainShape+' SHAPE \uD83D\uDCAA'); }
  save(); render();
}
function eat(){
  if(isBusy()){ toast('Ocupado...'); return; }
  if(S.coins<CFG.eatCost){ toast('Sem moedas pra comer!'); return; }
  S.coins-=CFG.eatCost; S.energy=clamp(S.energy+CFG.eatEnergy); S.life=clamp(S.life+CFG.eatLife); S.hunger=clamp(S.hunger+40);
  toast('\uD83C\uDF54 Comeu! +energia +vida'); save(); render();
}
function sleep(){
  if(isBusy()){ toast('Ocupado...'); return; }
  var q = S.energy>=80?1.0 : S.energy>=50?0.7 : S.energy>=30?0.5 : 0.35;
  S.energy=100; S.life=clamp(S.life+Math.round(100*q));
  var today=new Date().toDateString();
  if(S.lastDay!==today){ S.streak+=1; S.daysInJob+=1; S.lastDay=today; checkPromo(); }
  toast(q>=1?'\uD83D\uDE34 Dormiu bem! Vida cheia':'\uD83D\uDE34 Dormiu mal, vida parcial'); save(); render();
}
function takeRoid(){
  if(isBusy()){ toast('Ocupado...'); return; }
  if(S.coins<CFG.roidCost){ toast('Sem moedas pro esteroide!'); return; }
  S.coins-=CFG.roidCost; S.roidDoses+=1; S.shape=Math.min(CFG.maxShape,S.shape+CFG.roidShape);
  S.life=clamp(S.life-CFG.roidLifeCost); S.energy=100;
  toast('\uD83D\uDC89 Bombou! +'+CFG.roidShape+' shape, -'+CFG.roidLifeCost+'% vida');
  if(S.life<=0){ die('overdose de bomba'); }
  save(); render();
}
function checkPromo(){
  var j=job();
  if(S.jobIndex<CFG.jobs.length-1){
    var next=CFG.jobs[S.jobIndex+1];
    if(S.daysInJob>=j.daysToPromo && S.shape>=next.minShape){ S.jobIndex++; S.daysInJob=0; toast('\uD83C\uDF89 PROMOVIDO a '+CFG.jobs[S.jobIndex].name+'!'); }
  }
}
function die(cause){ S.alive=false; S.deaths++; S.grayUntil=Date.now()+24*3600*1000; S.busyUntil=0; S.busyAction=null; toast('\u26B0\uFE0F Morreu: '+cause); save(); }
function respawn(){
  var n=S.name,g=S.gender,sk=S.skin,h=S.hair,d=S.deaths;
  S=defaultState(); S.created=true; S.name=n; S.gender=g; S.skin=sk; S.hair=h; S.deaths=d;
  toast('\uD83D\uDD25 Renasceu do shape 1!'); save(); CURRENT=''; render();
}
function tick(){
  var now=Date.now();
  if(S.busyAction && now>=S.busyUntil){ finishAction(); }
  if(!S.alive){ S.lastTick=now; return; }
  var em=(now-(S.lastTick||now))/60000;
  if(em>0.05){
    S.hunger=clamp(S.hunger-em*0.33);
    if(S.hunger<=0){ S.life=clamp(S.life-em*0.5); }
    if(S.energy<=0){ S.life=clamp(S.life-em*CFG.noEnergyLifeDrain*0.3); }
    if(S.roidDoses>0){ var r=(S.roidDoses*CFG.roidDeathRiskPerDose)/(24*60); if(Math.random()*100<r*em){ die('overdose de bomba'); } }
    if(S.life<=0 && S.alive){ die('fome / exaustao'); }
    S.lastTick=now; save();
  }
}
var BOT_NAMES=['Rambao','Marquinhos','Bruta','Ze Monstro','Helena Forte','Tonho','Bia Bombada','Cleitin','Vera Veia','Juninho','Sandra','Maromba King','Tiaozao','Paty Fit','Gugu','Nanda','Robson','Carlao','Duda','Magrao'];
function buildRanking(){
  var list=[];
  for(var i=0;i<BOT_NAMES.length;i++){
    var seed=(i*37+13)%100; var bshape=5+((seed*7)%96); var bjob=Math.min(CFG.jobs.length-1,Math.floor(bshape/14));
    if(i%5===0) bjob=Math.max(0,bjob-3);
    var roid=(i%4===0)?(1+i%4):0;
    list.push({name:BOT_NAMES[i],shape:bshape,job:CFG.jobs[bjob].name,roid:roid,you:false});
  }
  list.push({name:S.name||'Voce',shape:S.shape,job:job().name,roid:S.roidDoses,you:true});
  list.sort(function(a,b){return b.shape-a.shape;});
  return list;
}
function myRank(){ var r=buildRanking(); for(var i=0;i<r.length;i++){ if(r[i].you) return {pos:i+1,total:r.length}; } return {pos:0,total:r.length}; }
function percentStronger(){ var m=myRank(); return Math.round(((m.total-m.pos)/m.total)*100); }
var toastTimer=null;
function toast(msg){ var t=document.getElementById('toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(function(){ t.classList.remove('show'); },1900); }
// ====================================================================
//  UI / RENDER (sem piscar)
// ====================================================================
var TAB='home';
var CURRENT='';
function setTab(t){ TAB=t; render(); }
function bar(id,label,val,color){
  return '<div style="margin:7px 0"><div style="display:flex;justify-content:space-between;font-size:12px;color:#9ca3af;margin-bottom:4px"><span>'+label+'</span><span id="'+id+'_t">'+Math.round(val)+'%</span></div><div class="barwrap"><div class="barfill" id="'+id+'_b" style="width:'+clamp(val)+'%;background:'+color+'"></div></div></div>';
}
function actBtn(label,sub,onclick,grad,disabled,id){
  return '<button class="btn3d" id="'+id+'" '+(disabled?'disabled':'')+' onclick="'+onclick+'" style="flex:1;min-width:46%;padding:16px 8px;background:'+grad+';box-shadow:0 6px 0 rgba(0,0,0,0.3),0 8px 18px rgba(0,0,0,0.4)"><div style="font-size:16px">'+label+'</div><div style="font-size:11px;font-weight:500;opacity:.9;margin-top:3px">'+sub+'</div></button>';
}
function render(){
  var app=document.getElementById('app');
  var sig;
  if(!S.created) sig='create'; else if(!S.alive) sig='dead'; else sig=TAB;
  if(sig!==CURRENT){
    dispose3D();
    if(sig==='create') app.innerHTML=screenCreate();
    else if(sig==='dead') app.innerHTML=screenDead();
    else if(sig==='home') app.innerHTML=screenHome()+navBar();
    else if(sig==='rank') app.innerHTML=screenRank()+navBar();
    else if(sig==='shop') app.innerHTML=screenShop()+navBar();
    else if(sig==='stats') app.innerHTML=screenStats()+navBar();
    CURRENT=sig;
    mount3DIfNeeded(sig);
  } else {
    if(sig==='home') updateHome();
  }
}
function mount3DIfNeeded(sig){
  var el=document.getElementById('avatar3d');
  if(el && (typeof THREE!=='undefined')){
    init3D(el);
    buildAvatar({shape:S.shape, roid:S.roidDoses, skin:S.skin, hair:S.hair, gray:(sig==='dead')});
    lastShapeBuilt=S.shape; lastRoidBuilt=S.roidDoses;
  }
}
var lastShapeBuilt=-1, lastRoidBuilt=-1;
function updateHome(){
  var set=function(id,txt){ var e=document.getElementById(id); if(e) e.textContent=txt; };
  var setW=function(id,v){ var e=document.getElementById(id); if(e) e.style.width=clamp(v)+'%'; };
  setW('forca_b',S.shape); set('forca_t',Math.round(S.shape)+'%');
  setW('energia_b',S.energy); set('energia_t',Math.round(S.energy)+'%');
  setW('vida_b',S.life); set('vida_t',Math.round(S.life)+'%');
  setW('fome_b',S.hunger); set('fome_t',Math.round(S.hunger)+'%');
  set('shapeNum','SHAPE '+S.shape);
  set('coinsTxt','\uD83D\uDCB0 '+S.coins+' moedas');
  set('streakTxt','\uD83D\uDD25 '+S.streak+' dias');
  var busy=isBusy();
  var st=busy?(S.busyAction==='work'?'\uD83D\uDCBC Trabalhando ('+busyLeft()+'s)':'\uD83D\uDCAA Treinando ('+busyLeft()+'s)'):(S.energy<=0?'\uD83D\uDE29 Exausto, precisa dormir':'\uD83D\uDE42 Descansando');
  set('statusTxt',st);
  var bw=document.getElementById('btn_work'), bt=document.getElementById('btn_train'), be=document.getElementById('btn_eat'), bs=document.getElementById('btn_sleep');
  if(bw){ bw.disabled=busy; } if(bt){ bt.disabled=busy||S.energy<=0; } if(be){ be.disabled=busy; } if(bs){ bs.disabled=busy; }
  if((S.shape!==lastShapeBuilt || S.roidDoses!==lastRoidBuilt) && A3D.group){
    buildAvatar({shape:S.shape, roid:S.roidDoses, skin:S.skin, hair:S.hair});
    lastShapeBuilt=S.shape; lastRoidBuilt=S.roidDoses;
  }
  var warn=document.getElementById('energyWarn'); if(warn) warn.style.display=(S.energy<=0?'block':'none');
}
// ----- TELA CRIAR -----
function screenCreate(){
  var skins=['#ffdbac','#f1c27d','#e0ac69','#c68642','#8d5524','#5a3a22'];
  var hairs=['#2b1d0e','#000000','#7a4a12','#d4b483','#9aa0a6','#b33b3b'];
  var h='<div class="screen active" style="text-align:center">';
  h+='<h1 style="font-size:30px;margin:18px 0 2px;background:linear-gradient(90deg,#fbbf24,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:800">\uD83D\uDCAA MAROMBINHA</h1>';
  h+='<p style="color:#9ca3af;font-size:13px;margin-bottom:14px">Crie seu monstro do shape</p>';
  h+='<div class="glass" style="padding:6px;margin-bottom:14px"><div id="avatar3d"></div></div>';
  h+='<input id="avname" placeholder="Nome do avatar" value="'+(S.name||'')+'" style="width:100%;padding:14px;border-radius:14px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;font-size:15px;margin-bottom:14px">';
  h+='<div style="text-align:left;color:#9ca3af;font-size:12px;margin-bottom:6px">Genero</div><div style="display:flex;gap:8px;margin-bottom:14px">';
  h+='<button onclick="S.gender=&quot;M&quot;;save();render()" style="flex:1;padding:13px;border-radius:12px;border:2px solid '+(S.gender==='M'?'#fbbf24':'rgba(255,255,255,0.1)')+';background:rgba(255,255,255,0.05);color:#fff">\uD83D\uDC68 Homem</button>';
  h+='<button onclick="S.gender=&quot;F&quot;;save();render()" style="flex:1;padding:13px;border-radius:12px;border:2px solid '+(S.gender==='F'?'#fbbf24':'rgba(255,255,255,0.1)')+';background:rgba(255,255,255,0.05);color:#fff">\uD83D\uDC69 Mulher</button></div>';
  h+='<div style="text-align:left;color:#9ca3af;font-size:12px;margin-bottom:6px">Cor da pele</div><div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">';
  for(var i=0;i<skins.length;i++){ h+='<button onclick="S.skin=&quot;'+skins[i]+'&quot;;save();render()" style="width:42px;height:42px;border-radius:50%;background:'+skins[i]+';border:3px solid '+(S.skin===skins[i]?'#fbbf24':'transparent')+'"></button>'; }
  h+='</div>';
  h+='<div style="text-align:left;color:#9ca3af;font-size:12px;margin-bottom:6px">Cor do cabelo</div><div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">';
  for(var j=0;j<hairs.length;j++){ h+='<button onclick="S.hair=&quot;'+hairs[j]+'&quot;;save();render()" style="width:42px;height:42px;border-radius:50%;background:'+hairs[j]+';border:3px solid '+(S.hair===hairs[j]?'#fbbf24':'transparent')+'"></button>'; }
  h+='</div>';
  h+='<button class="btn3d" onclick="createAvatar()" style="width:100%;padding:17px;background:linear-gradient(90deg,#fbbf24,#f97316);color:#1a1200;font-size:17px;box-shadow:0 6px 0 #b45309,0 10px 20px rgba(249,115,22,0.4)">COMECAR \uD83D\uDD25</button>';
  h+='</div>'; return h;
}
function createAvatar(){
  var n=document.getElementById('avname').value.trim();
  if(!n){ toast('Digite um nome!'); return; }
  S.name=n; S.created=true; S.alive=true; S.lastDay=new Date().toDateString(); S.streak=1;
  CURRENT=''; save(); render();
}
// ----- TELA HOME -----
function screenHome(){
  var seal=naturalSeal(); var mr=myRank(); var busy=isBusy();
  var st=busy?(S.busyAction==='work'?'\uD83D\uDCBC Trabalhando ('+busyLeft()+'s)':'\uD83D\uDCAA Treinando ('+busyLeft()+'s)'):(S.energy<=0?'\uD83D\uDE29 Exausto, precisa dormir':'\uD83D\uDE42 Descansando');
  var h='<div class="screen active">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  h+='<div><span style="font-size:20px;font-weight:800;color:#fbbf24">'+S.name+'</span> <span style="font-size:12px;color:'+seal.color+'">'+seal.icon+' '+seal.txt+'</span></div>';
  h+='<div style="text-align:right;font-size:12px;color:#9ca3af">#'+mr.pos+' de '+mr.total+'<br><span style="color:#fff">'+job().emoji+' '+job().name+'</span></div></div>';
  h+='<div class="glass" style="padding:4px;margin-bottom:10px;background:radial-gradient(circle at 50% 25%,rgba(99,102,241,0.15),rgba(255,255,255,0.02))">';
  h+='<div id="avatar3d"></div>';
  h+='<div style="text-align:center;font-size:24px;font-weight:800;margin-top:-6px" id="shapeNum">SHAPE '+S.shape+'</div>';
  h+='<div style="text-align:center;font-size:13px;color:#9ca3af;padding-bottom:8px" id="statusTxt">'+st+'</div></div>';
  h+='<div class="glass" style="padding:10px 14px;margin-bottom:10px">';
  h+=bar('forca','\uD83D\uDCAA Forca (Shape)',S.shape,'linear-gradient(90deg,#16a34a,#22c55e)');
  h+=bar('energia','\u26A1 Energia',S.energy,'linear-gradient(90deg,#2563eb,#3b82f6)');
  h+=bar('vida','\u2764\uFE0F Vida',S.life,'linear-gradient(90deg,#dc2626,#ef4444)');
  h+=bar('fome','\uD83C\uDF54 Fome',S.hunger,'linear-gradient(90deg,#ea580c,#f97316)');
  h+='</div>';
  h+='<div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:14px"><span id="coinsTxt">\uD83D\uDCB0 '+S.coins+' moedas</span><span id="streakTxt">\uD83D\uDD25 '+S.streak+' dias</span></div>';
  h+='<div style="display:flex;flex-wrap:wrap;gap:9px">';
  h+=actBtn('\uD83D\uDCBC Trabalhar','+'+job().pay+' moedas','startAction(&quot;work&quot;,'+CFG.workSecs+')','linear-gradient(135deg,#2563eb,#1d4ed8)',busy,'btn_work');
  h+=actBtn('\uD83D\uDCAA Treinar','+'+CFG.trainShape+' shape','startAction(&quot;train&quot;,'+CFG.trainSecs+')','linear-gradient(135deg,#16a34a,#15803d)',busy||S.energy<=0,'btn_train');
  h+=actBtn('\uD83C\uDF54 Comer','-'+CFG.eatCost+' moedas','eat()','linear-gradient(135deg,#ea580c,#c2410c)',busy,'btn_eat');
  h+=actBtn('\uD83D\uDE34 Dormir','recupera vida','sleep()','linear-gradient(135deg,#7c3aed,#6d28d9)',busy,'btn_sleep');
  h+='</div>';
  h+='<div id="energyWarn" style="display:'+(S.energy<=0?'block':'none')+';margin-top:10px;background:rgba(124,45,18,0.6);padding:10px;border-radius:12px;text-align:center;font-size:13px">\uD83D\uDE34 Sem energia! Manda dormir.</div>';
  h+='</div>'; return h;
}
// ----- TELA MORTE -----
function screenDead(){
  var can=Date.now()>=S.grayUntil;
  var h='<div class="screen active" style="text-align:center;padding-top:24px">';
  h+='<div class="glass" style="padding:4px;margin-bottom:14px;filter:grayscale(1)"><div id="avatar3d"></div></div>';
  h+='<h2 style="color:#ef4444;margin:6px 0">\u26B0\uFE0F Seu avatar morreu</h2>';
  h+='<p style="color:#9ca3af;font-size:14px">Aparece cinza no ranking por 24h.</p>';
  if(can){ h+='<button class="btn3d" onclick="respawn()" style="margin-top:20px;padding:16px 30px;background:linear-gradient(90deg,#fbbf24,#f97316);color:#1a1200;font-size:16px;box-shadow:0 6px 0 #b45309">\uD83D\uDD25 Renascer (Shape 1)</button>'; }
  else { h+='<p style="color:#fbbf24;margin-top:18px">Renasce em breve...</p><button onclick="S.grayUntil=Date.now();CURRENT=&quot;&quot;;render()" style="margin-top:12px;padding:10px 20px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;font-size:13px">Pular espera (teste)</button>'; }
  h+='</div>'; return h;
}
// ----- NAV -----
function navBar(){
  var tabs=[['home','\uD83C\uDFE0','Avatar'],['rank','\uD83C\uDFC6','Ranking'],['shop','\uD83C\uDFEA','Loja'],['stats','\uD83D\uDCCA','Stats']];
  var h='<div id="nav">';
  for(var i=0;i<tabs.length;i++){ var t=tabs[i]; h+='<button class="'+(TAB===t[0]?'on':'')+'" onclick="setTab(&quot;'+t[0]+'&quot;)"><span class="ico">'+t[1]+'</span>'+t[2]+'</button>'; }
  return h+'</div>';
}
// ----- RANKING -----
function screenRank(){
  var r=buildRanking(); var pct=percentStronger(); var mr=myRank();
  var h='<div class="screen active">';
  h+='<div style="background:linear-gradient(135deg,#4338ca,#7c3aed);border-radius:20px;padding:18px;margin-bottom:14px;text-align:center;box-shadow:0 10px 30px rgba(124,58,237,0.4)">';
  h+='<div style="font-size:13px;opacity:.9;letter-spacing:1px">SHAPE DO DIA</div>';
  h+='<div style="font-size:34px;font-weight:800;margin:4px 0">#'+mr.pos+'</div>';
  h+='<div style="font-size:14px">Voce esta mais forte que <b>'+pct+'%</b> dos jogadores</div></div>';
  h+='<div style="font-size:13px;color:#9ca3af;margin-bottom:8px">Ranking por SHAPE \uD83D\uDCAA</div>';
  for(var i=0;i<Math.min(r.length,30);i++){ var p=r[i];
    var medal=i===0?'\uD83E\uDD47':i===1?'\uD83E\uDD48':i===2?'\uD83E\uDD49':(i+1);
    var seal=p.roid===0?'<span style="color:#4ade80;font-size:11px">\u2705</span>':(p.roid<3?'<span style="color:#fbbf24;font-size:11px">\u2753</span>':'<span style="color:#ef4444;font-size:11px">\uD83D\uDC80</span>');
    h+='<div class="glass" style="display:flex;align-items:center;gap:10px;padding:11px;margin-bottom:7px;'+(p.you?'border:1px solid #fbbf24;background:rgba(251,191,36,0.1)':'')+'">';
    h+='<div style="width:28px;text-align:center;font-weight:700">'+medal+'</div>';
    h+='<div style="flex:1"><div style="font-weight:600">'+(p.you?'\uD83D\uDC49 ':'')+p.name+' '+seal+'</div><div style="font-size:11px;color:#6b7280">'+p.job+'</div></div>';
    h+='<div style="font-weight:800;color:#22c55e;font-size:18px">'+p.shape+'</div></div>';
  }
  h+='</div>'; return h;
}
// ----- LOJA -----
function screenShop(){
  var h='<div class="screen active">';
  h+='<div class="glass" style="display:flex;justify-content:space-between;align-items:center;padding:13px;margin-bottom:14px"><span style="font-size:16px">\uD83D\uDCB0 '+S.coins+' moedas</span><button class="btn3d" onclick="buyCoins()" style="background:linear-gradient(90deg,#fbbf24,#f97316);color:#1a1200;padding:9px 14px;font-size:13px;box-shadow:0 4px 0 #b45309">+ Comprar moedas</button></div>';
  h+='<div style="color:#ef4444;font-size:13px;font-weight:700;margin-bottom:6px">\u26A0\uFE0F ESTEROIDES (PERIGO)</div>';
  h+='<div style="background:linear-gradient(135deg,rgba(127,29,29,0.4),rgba(20,5,5,0.6));border:1px solid #7f1d1d;border-radius:16px;padding:14px;margin-bottom:14px">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-weight:700">\uD83D\uDC89 Injecao de Bomba \uD83D\uDC80</div><div style="font-size:12px;color:#9ca3af">+'+CFG.roidShape+' shape, -'+CFG.roidLifeCost+'% vida, +risco morte</div></div>';
  h+='<button class="btn3d" onclick="takeRoid()" style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:11px 15px;box-shadow:0 5px 0 #7f1d1d">'+CFG.roidCost+' \uD83D\uDCB0</button></div>';
  h+='<div style="font-size:11px;color:#fca5a5;margin-top:8px">Voce tem '+Math.round(S.life)+'% de vida. Doses: '+S.roidDoses+'. Calcule o risco!</div></div>';
  h+='<div style="font-size:13px;font-weight:700;margin-bottom:6px">\uD83D\uDE97 VEICULOS (aceleram trabalho e treino)</div>';
  for(var i=1;i<CFG.vehicles.length;i++){ var v=CFG.vehicles[i]; var owned=S.ownedVehicles.indexOf(v.id)>=0; var eq=S.vehicle===v.id;
    h+='<div class="glass" style="display:flex;justify-content:space-between;align-items:center;padding:11px;margin-bottom:7px"><div><div style="font-weight:600">'+v.emoji+' '+v.name+'</div><div style="font-size:11px;color:#6b7280">tempo x'+v.mult+'</div></div>';
    if(eq) h+='<span style="color:#fbbf24;font-size:13px">Equipado \u2705</span>';
    else if(owned) h+='<button onclick="equipVehicle(&quot;'+v.id+'&quot;)" style="background:rgba(255,255,255,0.1);border:none;color:#fff;padding:9px 13px;border-radius:10px;font-size:13px">Equipar</button>';
    else h+='<button class="btn3d" onclick="buyVehicle(&quot;'+v.id+'&quot;)" style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:9px 13px;font-size:13px;box-shadow:0 4px 0 #1e3a8a">'+v.cost+' \uD83D\uDCB0</button>';
    h+='</div>';
  }
  h+='</div>'; return h;
}
function buyVehicle(id){ var v=CFG.vehicles.find(function(x){return x.id===id;}); if(S.coins<v.cost){ toast('Sem moedas!'); return; } S.coins-=v.cost; S.ownedVehicles.push(id); S.vehicle=id; toast('Comprou '+v.name+'!'); save(); CURRENT=''; render(); }
function equipVehicle(id){ S.vehicle=id; toast('Equipado!'); save(); CURRENT=''; render(); }
function buyCoins(){ S.coins+=500; toast('(DEMO) +500 moedas. Na versao final sera compra real.'); save(); CURRENT=''; render(); }
// ----- STATS -----
function screenStats(){
  var seal=naturalSeal();
  var h='<div class="screen active"><h2 style="font-size:20px;margin-bottom:14px">\uD83D\uDCCA Estatisticas</h2>';
  h+=statBlock('CARREIRA',[['Emprego',job().emoji+' '+job().name],['Dias no cargo',S.daysInJob+''],['Veiculo',vehicle().emoji+' '+vehicle().name]]);
  h+=statBlock('SAUDE',[['Shape atual',S.shape+''],['Selo',seal.icon+' '+seal.txt],['Doses de bomba',S.roidDoses+''],['Mortes',S.deaths+'']]);
  h+=statBlock('STREAK',[['Streak atual',S.streak+' dias \uD83D\uDD25']]);
  h+='<button onclick="if(confirm(&quot;Resetar tudo?&quot;)){localStorage.removeItem(&quot;marombinha&quot;);location.reload();}" style="width:100%;margin-top:14px;padding:12px;border-radius:12px;border:1px solid #7f1d1d;background:rgba(26,13,13,0.6);color:#fca5a5;font-size:13px">Resetar jogo (apagar tudo)</button>';
  h+='</div>'; return h;
}
function statBlock(title,rows){
  var h='<div class="glass" style="padding:14px;margin-bottom:12px"><div style="color:#fbbf24;font-size:12px;font-weight:700;margin-bottom:8px">'+title+'</div>';
  for(var i=0;i<rows.length;i++){ h+='<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.06)"><span style="color:#9ca3af">'+rows[i][0]+'</span><span>'+rows[i][1]+'</span></div>'; }
  return h+'</div>';
}
// ---------- INIT ----------
load();
render();
setInterval(function(){ tick(); render(); }, 1000);
window.S=S;
