// ===== Util & konstanta =====
const EMO={happy:['Senang','#f59e0b'],neutral:['Netral','#8492a6'],sad:['Sedih','#3b82f6'],angry:['Marah','#ef4444'],surprise:['Terkejut','#8b5cf6'],fear:['Takut','#14b8a6'],disgust:['Jijik','#84cc16']};
const KEYS=Object.keys(EMO);
const NAV={dashboard:['Dashboard','<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'],
 deteksi:['Deteksi','<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'],
 analitik:['Analitik','<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],
 riwayat:['Riwayat','<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
 pengaturan:['Pengaturan','<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>']};
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dot=k=>`<i class="dot" style="background:${EMO[k][1]}"></i>`;
const fmt=t=>new Date(t).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'});
const day=t=>{const d=new Date(t);d.setHours(0,0,0,0);return +d};
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2200)}
document.querySelectorAll('aside a').forEach(a=>{const n=NAV[a.dataset.r];a.innerHTML=`<svg class="i" viewBox="0 0 24 24">${n[1]}</svg>${n[0]}`});

// ===== Pengaturan =====
const DEF={theme:'light',interval:3,saveImages:true,backend:'http://127.0.0.1:5000'};
let S={...DEF};
try{S={...DEF,...JSON.parse(localStorage.getItem('emotilens_settings')||'{}')}}catch(e){}
function saveS(){try{localStorage.setItem('emotilens_settings',JSON.stringify(S))}catch(e){}theme()}
function theme(){const r=document.documentElement;S.theme==='auto'?r.removeAttribute('data-theme'):r.setAttribute('data-theme',S.theme)}
theme();

// ===== Database (API PHP -> MySQL; jika offline, data disimpan sementara di memori) =====
const DB={ok:false,mem:[],
 async call(m,q='',b){const r=await fetch('api/detections.php'+q,{method:m,headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined});if(!r.ok)throw new Error(r.status);return r.json()},
 async open(){try{await this.call('GET','?limit=1');this.ok=true}catch(e){this.ok=false;toast('Database MySQL belum terhubung, data bersifat sementara')}},
 async add(d){if(!this.ok){d.id=Date.now()+Math.random();this.mem.push(d);return}await this.call('POST','',d)},
 async all(){return this.ok?this.call('GET'):[...this.mem].sort((x,y)=>y.created_at-x.created_at)},
 async del(id){this.ok?await this.call('DELETE','?id='+id):this.mem=this.mem.filter(x=>x.id!==id)},
 async clear(){this.ok?await this.call('DELETE','?all=1'):this.mem=[]}};

// ===== Deteksi =====
const cam={stream:null,timer:null,busy:false,n:0,last:null};
function fake(){const w=KEYS.map(()=>Math.random()**3),s=w.reduce((a,b)=>a+b),sc={};KEYS.forEach((k,i)=>sc[k]=w[i]/s);return sc}
async function detect(img){
  try{const c=new AbortController(),t=setTimeout(()=>c.abort(),4000);
    const r=await fetch(S.backend.replace(/\/$/,'')+'/detect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:img}),signal:c.signal});
    clearTimeout(t);const d=await r.json();
    if(d.emotion){const e=String(d.emotion).toLowerCase();return{emotion:KEYS.includes(e)?e:'neutral',confidence:+d.confidence||.9,scores:d.scores||null,source:'model'}}
  }catch(e){}
  const sc=fake(),e=Object.entries(sc).sort((a,b)=>b[1]-a[1])[0];return{emotion:e[0],confidence:+Math.max(e[1],.5).toFixed(2),scores:sc,source:'demo'}}
function snap(w){const v=$('#vid');if(!v||!v.videoWidth)return null;const c=document.createElement('canvas');c.width=w;c.height=v.videoHeight*w/v.videoWidth;c.getContext('2d').drawImage(v,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.6)}
async function capture(){
  if(cam.busy)return;cam.busy=true;
  try{const img=snap(480),r=await detect(img||''),rec={emotion:r.emotion,confidence:r.confidence,source:r.source,image:S.saveImages&&img?snap(160):null,created_at:Date.now()};
    await DB.add(rec);cam.n++;cam.last={...rec,scores:r.scores};showRes()}finally{cam.busy=false}}
function ring(p,c){const R=26,L=2*Math.PI*R;return `<svg width="68" height="68" viewBox="0 0 68 68"><circle cx="34" cy="34" r="${R}" fill="none" stroke="var(--bg)" stroke-width="7"/><circle cx="34" cy="34" r="${R}" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${L*p} ${L}" transform="rotate(-90 34 34)"/><text x="34" y="38" text-anchor="middle" font-size="13" font-weight="600" fill="var(--tx)" font-family="IBM Plex Mono,monospace">${Math.round(p*100)}%</text></svg>`}
function showRes(){const r=cam.last,el=$('#res');if(!el)return;
  if(!r){el.innerHTML='<div class="empty">Nyalakan kamera lalu mulai deteksi.</div>';return}
  const sc=r.scores||{[r.emotion]:r.confidence};
  el.innerHTML=`<div class="big">${ring(r.confidence,EMO[r.emotion][1])}<div><h3>${EMO[r.emotion][0]}</h3><p>${r.source==='model'?'Hasil model backend':'Mode demo · backend tidak terhubung'}</p></div></div>`+
   Object.entries(sc).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`<div class="bar"><span>${dot(k)}${EMO[k][0]}</span><i><u style="width:${v*100}%;background:${EMO[k][1]}"></u></i><em>${(v*100).toFixed(0)}%</em></div>`).join('');
  $('#cnt').textContent=cam.n}
async function camOn(){
  const md=navigator.mediaDevices;let msg='';
  if(!md||!md.getUserMedia)msg='Halaman harus dibuka lewat http://localhost/... atau https://';
  else{try{try{cam.stream=await md.getUserMedia({video:{facingMode:'user'}})}catch(e){if(e.name==='OverconstrainedError')cam.stream=await md.getUserMedia({video:true});else throw e}
    $('#vid').srcObject=cam.stream;$('#ph').hidden=true;$('#pill').className='pill live';$('#pill').lastChild.textContent='Aktif'}
   catch(e){msg={NotAllowedError:'Izin kamera ditolak. Klik ikon gembok di address bar, izinkan Kamera, lalu muat ulang halaman.',
    NotFoundError:'Perangkat kamera tidak ditemukan.',NotReadableError:'Kamera sedang dipakai aplikasi lain (Zoom/Teams/Meet/Camera) atau diblokir Windows. Tutup aplikasi itu lalu coba lagi.'}[e.name]||('Kamera gagal dibuka ('+e.name+')')}}
  if(msg){$('#ph').hidden=false;$('#ph').textContent=msg;$('#ph').style.cssText='padding:0 24px;text-align:center';toast('Kamera tidak aktif, mode demo tetap bisa dipakai')}
  $('#bAuto').disabled=$('#bCap').disabled=false;$('#bCam').textContent='Matikan kamera'}
function camOff(){stopAuto();cam.stream&&cam.stream.getTracks().forEach(t=>t.stop());cam.stream=null;const v=$('#vid');if(v){v.srcObject=null;$('#ph').hidden=false;$('#ph').textContent='Kamera belum aktif';$('#pill').className='pill';$('#pill').lastChild.textContent='Standby';$('#bCam').textContent='Nyalakan kamera';$('#bAuto').disabled=$('#bCap').disabled=true}}
function stopAuto(){clearInterval(cam.timer);cam.timer=null;const b=$('#bAuto');if(b)b.textContent='Mulai otomatis'}

// ===== Komponen grafik =====
const count=a=>{const c={};KEYS.forEach(k=>c[k]=0);a.forEach(d=>c[d.emotion]++);return c};
function donut(a){const c=count(a),n=a.length,R=52,L=2*Math.PI*R;let off=0;
  const seg=n?KEYS.filter(k=>c[k]).map(k=>{const l=c[k]/n*L,s=`<circle cx="70" cy="70" r="${R}" fill="none" stroke="${EMO[k][1]}" stroke-width="18" stroke-dasharray="${l} ${L-l}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"/>`;off+=l;return s}).join(''):'';
  return `<div class="donut"><svg width="150" height="150" viewBox="0 0 140 140"><circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--bg)" stroke-width="18"/>${seg}<text x="70" y="68" text-anchor="middle" font-size="24" font-weight="700" fill="var(--tx)">${n}</text><text x="70" y="86" text-anchor="middle" font-size="11" fill="var(--mu)">deteksi</text></svg>
  <div class="lg">${KEYS.map(k=>`<div><span>${dot(k)}${EMO[k][0]}</span><b class="mono">${n?Math.round(c[k]/n*100):0}%</b></div>`).join('')}</div></div>`}
function bars(a){const c=count(a),n=a.length||1;return [...KEYS].sort((x,y)=>c[y]-c[x]).map(k=>`<div class="bar"><span>${dot(k)}${EMO[k][0]}</span><i><u style="width:${c[k]/n*100}%;background:${EMO[k][1]}"></u></i><em>${c[k]} · ${Math.round(c[k]/n*100)}%</em></div>`).join('')}
function week(a){const t=day(Date.now()),ds=[...Array(7)].map((_,i)=>t-(6-i)*864e5),m=ds.map(d=>a.filter(x=>day(x.created_at)===d).length),mx=Math.max(1,...m);
  return `<div class="wk">${ds.map((d,i)=>`<div><span class="mono">${m[i]}</span><u style="height:${m[i]/mx*100}%"></u><span>${new Date(d).toLocaleDateString('id-ID',{weekday:'short'})}</span></div>`).join('')}</div>`}
const avg=a=>a.length?Math.round(a.reduce((s,d)=>s+d.confidence,0)/a.length*100):0;
const empty='<div class="empty">Belum ada data. Mulai deteksi atau isi data contoh di Pengaturan.</div>';

// ===== Halaman =====
const V={
async dashboard(){const a=await DB.all(),c=count(a),top=[...KEYS].sort((x,y)=>c[y]-c[x])[0],td=a.filter(x=>day(x.created_at)===day(Date.now())).length;
 return `<div class="hd"><div><h1>Dashboard</h1><p>Ringkasan aktivitas analisis emosi wajah.</p></div><a class="btn p" href="#deteksi">Mulai deteksi</a></div>
 <div class="g4"><div class="card kpi"><small>Total deteksi</small><b>${a.length}</b></div><div class="card kpi"><small>Emosi dominan</small><b>${a.length?EMO[top][0]:'–'}</b></div>
 <div class="card kpi"><small>Rata-rata keyakinan</small><b>${a.length?avg(a)+'%':'–'}</b></div><div class="card kpi"><small>Deteksi hari ini</small><b>${td}</b></div></div>
 <div class="g2"><div class="card"><h2>Distribusi emosi</h2>${a.length?donut(a):empty}</div><div class="card"><h2>Aktivitas 7 hari terakhir</h2>${week(a)}</div></div>
 <div class="card"><h2>Deteksi terbaru</h2>${a.length?`<div class="tw"><table>${a.slice(0,5).map(d=>`<tr><td>${dot(d.emotion)}${EMO[d.emotion][0]}</td><td class="mono">${Math.round(d.confidence*100)}%</td><td class="mono">${fmt(d.created_at)}</td><td><span class="tag">${d.source}</span></td></tr>`).join('')}</table></div>`:empty}</div>`},
async deteksi(){return `<div class="hd"><div><h1>Deteksi real-time</h1><p>Interval otomatis ${S.interval} detik, dapat diubah di Pengaturan.</p></div></div>
 <div class="split"><div class="card"><div class="cam"><video id="vid" autoplay playsinline muted></video><div class="fr"></div><span id="ph">Kamera belum aktif</span><div class="pill" id="pill"><i></i>Standby</div></div>
  <div class="row" style="margin-top:16px"><button class="btn p" id="bCam">Nyalakan kamera</button><button class="btn" id="bAuto" disabled>Mulai otomatis</button><button class="btn" id="bCap" disabled>Capture</button></div></div>
 <div class="card"><h2>Hasil analisis</h2><div id="res"></div><div class="row" style="justify-content:space-between;margin-top:14px;color:var(--mu);font-size:13px"><span>Deteksi pada sesi ini</span><b class="mono" id="cnt">${cam.n}</b></div></div></div>`},
async analitik(){return `<div class="hd"><div><h1>Analitik</h1><p>Pola emosi berdasarkan rentang waktu.</p></div><div class="seg" id="rng"><button data-v="1">Hari ini</button><button data-v="7">7 hari</button><button data-v="0" class="on">Semua</button></div></div><div id="an"></div>`},
async riwayat(){return `<div class="hd"><div><h1>Riwayat</h1><p>Seluruh hasil deteksi tersimpan di database.</p></div>
 <div class="row"><select id="fe"><option value="">Semua emosi</option>${KEYS.map(k=>`<option value="${k}">${EMO[k][0]}</option>`).join('')}</select><button class="btn" id="exJ">JSON</button><button class="btn" id="exC">CSV</button><button class="btn d" id="clr">Hapus semua</button></div></div><div class="card" id="tb"></div>`},
async pengaturan(){return `<div class="hd"><div><h1>Pengaturan</h1><p>Preferensi disimpan pada peramban ini.</p></div></div><div class="card" style="max-width:720px">
 <div class="sw"><div><b>Tema</b><p>Pilih tampilan terang atau gelap.</p></div><select id="sT"><option value="light">Terang</option><option value="dark">Gelap lembut</option><option value="auto">Ikuti sistem</option></select></div>
 <div class="sw"><div><b>Interval deteksi</b><p>Jeda antar deteksi otomatis (detik).</p></div><input type="number" id="sI" min="1" max="30" style="width:84px"></div>
 <div class="sw"><div><b>Simpan thumbnail wajah</b><p>Foto kecil ikut tersimpan di riwayat.</p></div><input type="checkbox" id="sM"></div>
 <div class="sw"><div><b>URL backend</b><p>Server Flask untuk endpoint /detect.</p></div><input type="text" id="sB" style="width:min(250px,100%)"></div>
 <div class="sw"><div><b>Data contoh</b><p>Tambah 60 data acak untuk mencoba tampilan.</p></div><button class="btn" id="sD">Tambah data</button></div></div>`}};

const H={
deteksi(){showRes();
 $('#bCam').onclick=()=>cam.stream||!$('#bAuto').disabled?camOff():camOn();
 $('#bAuto').onclick=()=>{if(cam.timer){stopAuto();return}capture();cam.timer=setInterval(capture,S.interval*1000);$('#bAuto').textContent='Hentikan otomatis'};
 $('#bCap').onclick=capture},
analitik(){let v=0;const draw=async()=>{let a=await DB.all();if(v)a=a.filter(d=>d.created_at>=(v===1?day(Date.now()):Date.now()-v*864e5));
  $('#an').innerHTML=`<div class="g4"><div class="card kpi"><small>Deteksi</small><b>${a.length}</b></div><div class="card kpi"><small>Rata-rata keyakinan</small><b>${a.length?avg(a)+'%':'–'}</b></div></div>
  <div class="g2"><div class="card"><h2>Proporsi emosi</h2>${a.length?donut(a):empty}</div><div class="card"><h2>Jumlah per emosi</h2>${a.length?bars(a):empty}</div></div><div class="card"><h2>Aktivitas harian</h2>${week(a)}</div>`};
 $('#rng').onclick=e=>{const b=e.target.closest('button');if(!b)return;v=+b.dataset.v;document.querySelectorAll('#rng button').forEach(x=>x.classList.toggle('on',x===b));draw()};draw()},
async riwayat(){let rows=[],p=0;const N=12;
 const draw=()=>{const f=$('#fe').value,a=rows.filter(d=>!f||d.emotion===f),pages=Math.max(1,Math.ceil(a.length/N));p=Math.min(p,pages-1);
  $('#tb').innerHTML=a.length?`<div class="tw"><table><tr><th>Waktu</th><th>Emosi</th><th>Keyakinan</th><th>Foto</th><th>Sumber</th><th></th></tr>${a.slice(p*N,p*N+N).map(d=>`<tr><td class="mono">${fmt(d.created_at)}</td><td>${dot(d.emotion)}${EMO[d.emotion][0]}</td><td class="mono">${Math.round(d.confidence*100)}%</td><td>${d.image?`<img src="${esc(d.image)}" alt="">`:'–'}</td><td><span class="tag">${esc(d.source)}</span></td><td><button class="btn d" data-id="${d.id}">Hapus</button></td></tr>`).join('')}</table></div>
  <div class="pg"><span>${a.length} data · halaman ${p+1}/${pages}</span><span class="row"><button class="btn" id="pv" ${p?'':'disabled'}>Sebelumnya</button><button class="btn" id="nx" ${p<pages-1?'':'disabled'}>Berikutnya</button></span></div>`:empty;
  const pv=$('#pv');if(pv){pv.onclick=()=>{p--;draw()};$('#nx').onclick=()=>{p++;draw()}}};
 const load=async()=>{rows=await DB.all();draw()};await load();
 $('#fe').onchange=()=>{p=0;draw()};
 $('#tb').onclick=async e=>{const b=e.target.closest('[data-id]');if(b){await DB.del(+b.dataset.id);await load()}};
 const dl=(n,t,m)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:m}));a.download=n;a.click()};
 $('#exJ').onclick=()=>dl('emotilens.json',JSON.stringify(rows.map(({image,...r})=>r),null,2),'application/json');
 $('#exC').onclick=()=>dl('emotilens.csv','waktu,emosi,keyakinan,sumber\n'+rows.map(d=>[new Date(d.created_at).toISOString(),d.emotion,d.confidence,d.source].join(',')).join('\n'),'text/csv');
 $('#clr').onclick=async()=>{if(confirm('Hapus semua riwayat?')){await DB.clear();await load();toast('Riwayat dihapus')}}},
pengaturan(){$('#sT').value=S.theme;$('#sI').value=S.interval;$('#sM').checked=S.saveImages;$('#sB').value=S.backend;
 $('#sT').onchange=e=>{S.theme=e.target.value;saveS()};
 $('#sI').onchange=e=>{S.interval=Math.min(30,Math.max(1,+e.target.value||3));saveS();toast('Tersimpan')};
 $('#sM').onchange=e=>{S.saveImages=e.target.checked;saveS()};
 $('#sB').onchange=e=>{S.backend=e.target.value.trim()||DEF.backend;saveS();toast('Tersimpan')};
 $('#sD').onclick=async()=>{for(let i=0;i<60;i++){const sc=fake(),e=Object.entries(sc).sort((a,b)=>b[1]-a[1])[0];await DB.add({emotion:e[0],confidence:+Math.max(e[1],.5).toFixed(2),source:'demo',image:null,created_at:Date.now()-Math.random()*6.9*864e5})}toast('60 data contoh ditambahkan')}}};

// ===== Router =====
async function route(){const k=V[location.hash.slice(1)]?location.hash.slice(1):'dashboard';
 if(k!=='deteksi')camOff();
 document.querySelectorAll('aside a').forEach(a=>a.classList.toggle('on',a.dataset.r===k));
 $('#app').innerHTML=await V[k]();H[k]&&H[k]();scrollTo(0,0);
 $('#foot').textContent=DB.ok?'Terhubung ke database MySQL':'Database offline · data sementara'}
addEventListener('hashchange',route);addEventListener('pagehide',camOff);
DB.open().then(route);