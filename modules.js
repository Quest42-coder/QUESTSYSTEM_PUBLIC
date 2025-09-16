// modules.js — Liste & Suche für alle 42 Module (liest ./MODULES/modules.json)

(async function(){
  const $ = sel => document.querySelector(sel);
  const q = $('#q'), srt = $('#sort');
  const fEx = $('#f-ex'), fSo = $('#f-so'), fSt = $('#f-st');
  const list = $('#results'), empty = $('#empty'), count = $('#count');

  // Daten laden
  let data;
  try{
    const res = await fetch('./MODULES/modules.json');
    data = await res.json();
  }catch(e){
    list.innerHTML = '';
    empty.style.display = 'block';
    empty.textContent = 'Fehler: MODULES/modules.json konnte nicht geladen werden.';
    return;
  }

  const modules = (data.modules || []).slice();
  const links = data.links || {};

  // Renderer
  function render(items){
    list.innerHTML = '';
    if(items.length === 0){
      empty.style.display = 'block';
      count.textContent = '0 Treffer';
      return;
    }
    empty.style.display = 'none';
    count.textContent = `${items.length} Treffer`;

    items.forEach(m=>{
      const a = document.createElement('a');
      a.href = hrefFor(m);
      a.className = 'card';
      a.setAttribute('aria-label', `${pad(m.id)} ${m.name || 'Modul'} – ${m.ring} Ring`);

      const h3 = document.createElement('h3');
      h3.textContent = `${pad(m.id)} ${m.name || 'Modul'}`;
      const badge = document.createElement('span');
      badge.className = `badge badge--${m.ring}`;
      badge.textContent = m.ring;
      h3.appendChild(badge);

      const p = document.createElement('p');
      p.textContent = m.desc && m.desc.trim() ? m.desc : 'Keine Kurzbeschreibung hinterlegt.';

      const peers = (links[String(m.id)] || []);
      const meta = document.createElement('p');
      meta.className = 'muted';
      if(peers.length){
        meta.textContent = `Verknüpft mit: ${peers.slice(0,5).map(id=>pad(id)).join(', ')}${peers.length>5?' …':''}`;
      }else{
        meta.textContent = 'Keine Verknüpfungen hinterlegt.';
      }

      a.append(h3,p,meta);
      list.appendChild(a);
    });
  }

  // Logik: Filter + Suche + Sort
  function apply(){
    const term = normalize(q.value);
    const rings = new Set([
      fEx.checked && 'Existential',
      fSo.checked && 'Societal',
      fSt.checked && 'Structural'
    ].filter(Boolean));

    let items = modules.filter(m => rings.has(m.ring));

    if(term){
      // Präzisere ID-Treffer: "01 " trifft Modul 01
      const idMatch = term.match(/^(\d{1,2})(?:\s|_|-)?$/);
      if(idMatch){
        const target = parseInt(idMatch[1],10);
        items = items.filter(m=>m.id===target);
      }else{
        items = items.filter(m=>{
          const hay = `${pad(m.id)} ${m.name||''} ${m.ring} ${m.desc||''}`;
          return normalize(hay).includes(term);
        });
      }
    }

    const mode = srt.value;
    if(mode === 'name'){
      items.sort((a,b)=> (a.name||'').localeCompare(b.name||'') || a.id - b.id);
    }else if(mode === 'ring'){
      const order = {Existential:0, Societal:1, Structural:2};
      items.sort((a,b)=> (order[a.ring]-order[b.ring]) || (a.id - b.id));
    }else{
      items.sort((a,b)=> a.id - b.id);
    }

    render(items);
  }

  function hrefFor(m){
    if (m.href && m.href.startsWith('./module.html')) return m.href;
    return `./module.html?id=${pad(m.id)}${m.name ? '_' + slug(m.name) : ''}`;
  }
  function pad(n){ return String(n).padStart(2,'0'); }
  function slug(s){ return String(s).toUpperCase().replace(/\s+/g,'_').replace(/[^A-Z0-9_]/g,''); }
  function normalize(s){ return String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,''); }

  // Debounce Suche
  let t=null;
  q.addEventListener('input', ()=>{ clearTimeout(t); t=setTimeout(apply, 80); });
  [fEx,fSo,fSt,srt].forEach(el=> el.addEventListener('change', apply));

  // initial
  apply();
})();
