// module.js — QUESTSYSTEM Modul-Detailseite (STATIC CORE V5.0 LOCKED)

(async function(){
  const qs = new URLSearchParams(location.search);
  const qid = qs.get('id') || ''; // erwartet "XX_NAME" oder "XX"
  const idNum = parseInt(qid.slice(0,2), 10);

  // DOM refs
  const elTitle = document.getElementById('mod-title');
  const elId    = document.getElementById('mod-id');
  const elDesc  = document.getElementById('mod-desc');
  const elBadge = document.getElementById('ring-badge');
  const linkPills = document.getElementById('link-pills');
  const noLinks = document.getElementById('no-links');
  const prevnext = document.getElementById('prevnext');

  // Daten laden
  let data;
  try{
    const res = await fetch('./MODULES/modules.json');
    data = await res.json();
  }catch(e){
    renderError('Konnte MODULES/modules.json nicht laden.');
    return;
  }

  const modules = data.modules || [];
  const links = data.links || {};
  if(!Number.isInteger(idNum)){
    renderError('Ungültige Modul-ID.');
    return;
  }

  // Modul finden
  const mod = modules.find(m => m.id === idNum);
  if(!mod){
    renderError(`Modul ${pad(idNum)} nicht gefunden.`);
    return;
  }

  // Titel + Meta
  const fullName = mod.name && mod.name.length ? `${pad(mod.id)} – ${mod.name}` : `Modul ${pad(mod.id)}`;
  document.title = `QUESTSYSTEM · ${fullName}`;
  elTitle.textContent = fullName;
  elId.textContent = `ID: ${pad(mod.id)}  ·  Ring: ${mod.ring}`;

  // Ring-Badge
  elBadge.textContent = mod.ring;
  elBadge.classList.add(`badge--${mod.ring}`);

  // Beschreibung
  elDesc.textContent = (mod.desc && mod.desc.trim().length)
    ? mod.desc
    : 'Für dieses Modul ist noch keine Kurzbeschreibung hinterlegt.';

  // Verknüpfungen (Pills)
  const peerIds = (links[String(mod.id)] || []);
  if(peerIds.length === 0){
    noLinks.style.display = 'block';
  }else{
    const peers = peerIds
      .map(pid => modules.find(m => m && m.id === pid))
      .filter(Boolean);
    peers.forEach(p=>{
      const a = document.createElement('a');
      a.className = 'pill';
      a.href = hrefFor(p);
      a.textContent = p.name && p.name.length ? `${pad(p.id)} ${p.name}` : `Modul ${pad(p.id)}`;
      linkPills.appendChild(a);
    });
  }

  // Prev / Next — im Kreis
  let prev = null, next = null;
  for(let i=1;i<=42;i++){
    const cand = (mod.id - i + 42) % 42 || 42;
    if(modules.find(m=>m.id===cand)){ prev = modules.find(m=>m.id===cand); break; }
  }
  for(let i=1;i<=42;i++){
    const cand = (mod.id + i - 1) % 42 + 1;
    if(modules.find(m=>m.id===cand)){ next = modules.find(m=>m.id===cand); break; }
  }

  const prevBtn = makeNavBtn('← Vorheriges', prev);
  const backBtn = makeNavBtn('Zur Karte', null, './map.html');
  const nextBtn = makeNavBtn('Nächstes →', next);
  prevnext.append(prevBtn, backBtn, nextBtn);

  // Hilfsfunktionen
  function pad(n){ return String(n).padStart(2,'0'); }
  function hrefFor(m){
    if (m.href && m.href.startsWith('./module.html')) return m.href;
    return `./module.html?id=${pad(m.id)}${m.name ? '_' + slug(m.name) : ''}`;
  }
  function slug(s){
    return String(s).toUpperCase().replace(/\s+/g,'_').replace(/[^A-Z0-9_]/g,'');
  }
  function makeNavBtn(label, modObj, hrefOverride){
    const a = document.createElement('a');
    a.className = 'button--ghost';
    a.textContent = label;
    a.href = hrefOverride || hrefFor(modObj);
    return a;
  }
  function renderError(msg){
    elTitle.textContent = 'Fehler';
    elDesc.textContent = msg;
    elBadge.textContent = '—';
    elId.textContent = '';
    noLinks.style.display = 'block';
    const back=document.createElement('a');
    back.className='button--ghost';
    back.href='./map.html';
    back.textContent='Zur Karte';
    prevnext.append(back);
  }
})();
