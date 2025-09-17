// map.js — QUESTSYSTEM Map (robuste Version mit Pfad-Fallbacks + klaren Logs)
// - versucht MODULES/modules.json → modules/modules.json → modules.json
// - zeigt klare Fehlermeldung im UI, wenn Daten nicht geladen werden
// - Nodes sind klickbar; Edges bei Hover/Focus/Touch

(async function () {
  const svg = document.getElementById('map');
  const tip = document.getElementById('tooltip');

  console.log('[map.js] boot');

  // ---------- Daten laden mit Fallbacks ----------
  const jsonCandidates = [
    './MODULES/modules.json',
    './modules/modules.json',
    './modules.json'
  ];

  let data = null, lastErr = null, usedPath = null;
  for (const p of jsonCandidates) {
    try {
      console.log('[map.js] try', p);
      const res = await fetch(p, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
      usedPath = p;
      break;
    } catch (e) {
      lastErr = e;
      console.warn('[map.js] fail', p, e);
    }
  }
  if (!data) {
    renderFatal('Konnte Daten nicht laden. Prüfe MODULES/modules.json (Groß-/Kleinschreibung).');
    console.error('[map.js] all paths failed', lastErr);
    return;
  }
  console.log('[map.js] loaded', usedPath, {
    modules: (data.modules || []).length,
    hasLinks: !!data.links
  });

  const modules = Array.isArray(data.modules) ? data.modules : [];
  const links = data.links || {};
  if (!modules.length) {
    renderFatal('Keine Module gefunden (leere modules.json).');
    return;
  }

  // ---------- Grundgeometrie ----------
  const cx = 600, cy = 450;
  const radii = { Existential: 180, Societal: 310, Structural: 440 };
  const nodeR = 18;

  // Ringe sortiert
  const order = ['Existential', 'Societal', 'Structural'];
  const perRing = { Existential: [], Societal: [], Structural: [] };
  modules.forEach(m => { if (perRing[m.ring]) perRing[m.ring].push(m); });

  // Ebenen
  const ringLayer = el('g', { class: 'rings' });
  order.forEach(rk => ringLayer.appendChild(el('circle', { class: 'ring', cx, cy, r: radii[rk] })));
  svg.appendChild(ringLayer);

  const edgeLayer = el('g', { class: 'edges' });
  svg.appendChild(edgeLayer);

  const nodeLayer = el('g', { class: 'nodes' });
  svg.appendChild(nodeLayer);

  // ---------- Positionen berechnen ----------
  const pos = {}; // id -> {x,y}
  order.forEach(rk => {
    const arr = perRing[rk];
    const n = arr.length || 1;
    arr.forEach((m, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      pos[m.id] = {
        x: cx + radii[rk] * Math.cos(angle),
        y: cy + radii[rk] * Math.sin(angle)
      };
    });
  });

  // ---------- Interaktion ----------
  let activeId = null;

  modules.forEach(m => {
    const { x, y } = pos[m.id] || { x: cx, y: cy };
    const g = el('g', { class: 'node', tabindex: 0, 'data-id': m.id });
    g.setAttribute('role', 'button');

    const label = `${pad(m.id)} ${m.name || 'MODUL'}`;
    g.setAttribute('aria-label', `${label} – ${m.ring || ''} Ring`);

    const color = (m.ring === 'Existential') ? 'var(--red)'
                : (m.ring === 'Societal')    ? 'var(--yellow)'
                :                              'var(--blue)';

    // Kreis
    g.appendChild(el('circle', {
      cx: x, cy: y, r: nodeR, fill: color, 'fill-opacity': 0.9, stroke: '#000', 'stroke-opacity': .35
    }));

    // Label + Background
    const text = el('text', { x, y: y + nodeR + 18, class: 'label' }, label);
    const boxW = (label.length * 7.0) + 16, boxH = 18;
    g.appendChild(el('rect', {
      x: x - boxW / 2, y: y + nodeR + 8, width: boxW, height: boxH, class: 'label-bg', rx: 4, ry: 4
    }));
    g.appendChild(text);

    // Hover/Focus: Edges + Tooltip
    g.addEventListener('mouseenter', () => { activeId = m.id; showTooltipAt(m); drawEdgesFor(m.id, true); });
    g.addEventListener('mouseleave', () => { if (activeId === m.id) { activeId = null; hideTooltip(); drawEdgesFor(m.id, false); }});
    g.addEventListener('focus',      () => { activeId = m.id; showTooltipAt(m); drawEdgesFor(m.id, true); });
    g.addEventListener('blur',       () => { if (activeId === m.id) { activeId = null; hideTooltip(); drawEdgesFor(m.id, false); }});

    // Keyboard öffnen
    g.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openModule(m); }
    });

    // Touch: Toggle
    g.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const on = activeId !== m.id;
      activeId = on ? m.id : null;
      if (on) { showTooltipAt(m); drawEdgesFor(m.id, true); }
      else    { hideTooltip();    drawEdgesFor(m.id, false); }
    }, { passive: false });

    // Click → Detail
    g.addEventListener('click', () => openModule(m));

    nodeLayer.appendChild(g);
  });

  // ---------- Helpers ----------
  function drawEdgesFor(id, on) {
    while (edgeLayer.firstChild) edgeLayer.removeChild(edgeLayer.firstChild);
    if (!on) return;
    const peers = links[String(id)] || [];
    peers.forEach(pid => {
      if (!pos[pid]) return;
      const p1 = pos[id], p2 = pos[pid];
      edgeLayer.appendChild(el('line', {
        x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, class: 'edge edge--hi'
      }));
    });
  }

  function showTooltipAt(m) {
    const t = `${pad(m.id)} — ${m.name || 'MODUL'}`;
    const d = m.desc || (m.ring ? `${m.ring} Ring` : '');
    tip.replaceChildren();
    const h3 = document.createElement('h3'); h3.textContent = t;
    const p = document.createElement('p');  p.textContent  = d;
    tip.append(h3, p);
    tip.hidden = false;

    const pxy = pos[m.id];
    const rect = svg.getBoundingClientRect();
    tip.style.left = (pxy.x - rect.left + 16) + 'px';
    tip.style.top  = (pxy.y - rect.top  + 16) + 'px';
    clampTip();
  }
  function hideTooltip(){ tip.hidden = true; }

  function clampTip(){
    const r = svg.getBoundingClientRect();
    const tw = tip.offsetWidth || 240, th = tip.offsetHeight || 80;
    let left = parseInt(tip.style.left,10) || r.left+8;
    let top  = parseInt(tip.style.top,10)  || r.top +8;
    left = Math.min(Math.max(left, r.left+8), r.right - tw - 8);
    top  = Math.min(Math.max(top,  r.top +8), r.bottom - th - 8);
    tip.style.left = left + 'px';
    tip.style.top  = top  + 'px';
  }

  function openModule(m){
    const href = m.href && m.href.length
      ? m.href
      : `./module.html?id=${pad(m.id)}${m.name ? '_' + slug(m.name) : ''}`;
    console.log('[map.js] open', href);
    location.href = href;
  }

  function el(tag, attrs = {}, text){
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function pad(n){ return String(n).padStart(2,'0'); }
  function slug(s){ return String(s).toUpperCase().replace(/\s+/g,'_').replace(/[^A-Z0-9_]/g,''); }

  function renderFatal(msg){
    const t = el('text', { x: 600, y: 450, class: 'label' }, msg);
    t.setAttribute('text-anchor', 'middle');
    svg.appendChild(t);
    if (tip) tip.hidden = true;
  }
})();
