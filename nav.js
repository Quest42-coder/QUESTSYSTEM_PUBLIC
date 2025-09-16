// nav.js — Globales Menü für QUESTSYSTEM (Start · Karte · Liste · Zufall · Lizenz)

(async function(){
  const host = document.getElementById('global-nav');
  if(!host) return;

  const path = (location.pathname || '').toLowerCase();
  const isIndex   = path.endsWith('/') || path.endsWith('/index.html') || path.endsWith('index.html');
  const isMap     = path.endsWith('/map.html')     || path.endsWith('map.html');
  const isModules = path.endsWith('/modules.html') || path.endsWith('modules.html');
  const isModule  = path.endsWith('/module.html')  || path.endsWith('module.html');
  const isLicence = path.endsWith('/licence.html') || path.endsWith('licence.html');

  host.className = 'global-nav';
  host.innerHTML = `
    <a href="./index.html"  class="${isIndex?'is-active':''}">Start</a>
    <a href="./map.html"    class="${isMap?'is-active':''}">Karte</a>
    <a href="./modules.html"class="${isModules?'is-active':''}">Liste</a>
    <a href="#" id="nav-random">Zufall</a>
    <span class="spacer"></span>
    <a href="./module.html?id=32_LICENCE" class="${isLicence?'is-active':''}">Lizenz</a>
    <span class="legend">Ringe:
      <span class="dot ex"></span>Existential
      <span class="dot so"></span>Societal
      <span class="dot st"></span>Structural
    </span>
  `;

  const btn = document.getElementById('nav-random');
  if(btn){
    btn.addEventListener('click', async (e)=>{
      e.preventDefault();
      try{
        const res = await fetch('./MODULES/modules.json');
        const data = await res.json();
        const mods = (data.modules || []).filter(Boolean);
        if(!mods.length) return;
        const pick = mods[Math.floor(Math.random()*mods.length)];
        const href = pick.href && pick.href.startsWith('./module.html')
          ? pick.href
          : `./module.html?id=${String(pick.id).padStart(2,'0')}${pick.name?'_'+slug(pick.name):''}`;
        location.href = href;
      }catch(err){
        location.href = './module.html?id=01_RESETBOX';
      }
    });
  }

  function slug(s){ return String(s).toUpperCase().replace(/\s+/g,'_').replace(/[^A-Z0-9_]/g,''); }
})();
