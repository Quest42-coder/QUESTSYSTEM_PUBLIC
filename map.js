// map.js — QUESTSYSTEM Map (STATIC CORE V5.0 LOCKED)
// Features: sichere Tooltips, Enter/Leave-Kanten, Mobile Tap Toggle, A11y, Tooltip-Clamping

(async function () {
  const svg = document.getElementById('map');
  const tip = document.getElementById('tooltip');

  // Daten laden (Service Worker darf cachen)
  let data;
  try {
    const res = await fetch('./MODULES/modules.json'); // kein no-store → SW kann arbeiten
    data = await res.json();
  } catch (e) {
    console.error('modules.json konnte nicht geladen werden:', e);
    renderFatal('Konnte MODULES/modules.json nicht laden.');
    return;
  }

  const modules = data.modules || [];
  const links = data.links || {};

  // Grundgeometrie
  const cx = 600, cy = 450;
  const radii = { Existential: 180, Societal: 310, Structural: 440 };
  const nodeR = 18;

  // Ringe einsortieren
  const perRing = { Existential: [], Societal: [], Structural: [] };
  modules.forEach(m => { if (perRing[m.ring]) perRing[m.ring].push(m); });

  // Ebenen
  const ringLayer = el('g', { class: 'rings' });
  ['Existential', 'Societal', 'Structural'].forEach(rk => {
    ringLayer.appendChild(el('circle', { class: 'ring', cx, cy, r: radii[rk] }));
  });
  svg.appendChild(ringLayer);

  const edgeLayer = el('g', { class: 'edges' });
  svg.appendChild(edgeLayer);

  const nodeLayer = el('g', { class: 'nodes' });
  svg.appendChild(nodeLayer);

  // Positionen berechnen (gleichmäßig pro Ring)
  const pos = {}; // id -> {x,y}
  Object.keys(perRing).forEach(rk => {
    const arr = perRing[rk];
    const n = arr.length || 1;
    arr.forEach((m, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2; // Start oben
      const x = cx + radii[rk] * Math.cos(angle);
      const y = cy + radii[rk] * Math.sin(angle);
      pos[m.id] = { x, y };
    });
  });

  // State für Mobile Toggle
  let activeId = null;

  // Nodes zeichnen
  modules.forEach(m => {
    const g = el('g', { class: 'node', tabindex: 0, 'data-id': m.id });
    g.setAttribute('role', 'button');
    const label = m.name ? `${pad(m.id)} ${m.name}` : `Modul ${pad(m.id)}`;
    g.setAttribute('aria-label', `${label} – ${m.ring} Ring`);

    const color = (m.ring === 'Existential') ? 'var(--red)'
                : (m.ring === 'Societal')    ? 'var(--yellow)'
                :                              'var(--blue)';
    const { x, y } = pos[m.id];

    // Kreis
    g.appendChild(el('circle', {
      cx: x, cy: y, r: nodeR, fill: color, 'fill-opacity': 0.9, stroke: '#000', 'stroke-opacity': .35
    }));

    // Label (mit Background-Puffer)
    const text = el('text', { x, y: y + nodeR + 18, class: 'label' }, label);
    const boxW = (label.length * 7.0) + 16, boxH = 18;
    g.appendChild(el('rect', {
      x: x - boxW / 2, y: y + nodeR + 8, width: boxW, height: boxH, class: 'label-bg'
    }));
    g.appendChild(text);

    // Hover (Desktop): nur bei Enter/Leave Kanten zeichnen
    g.addEventListener('mouseenter', () => {
      activeId = m.id;
      showTooltipAtNode(m);
      drawEdgesFor(m.id, true);
    });
    g.addEventListener('mouseleave', () => {
      if (activeId === m.id) {
        activeId = null;
        hideTooltip();
        drawEdgesFor(m.id, false);
      }
    });

    // Fokus (Keyboard)
    g.addEventListener('focus', () => {
      activeId = m.id;
      showTooltipAtNode(m);
      drawEdgesFor(m.id, true);
    });
    g.addEventListener('blur', () => {
      if (activeId === m.id) {
        activeId = null;
        hideTooltip();
        drawEdgesFor(m.id, false);
      }
    });
    g.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        openModule(m);
      }
    });

    // Touch (Mobile): Tap toggelt an/aus
    g.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const turnOn = activeId !== m.id;
      activeId = turnOn ? m.id : null;
      if (turnOn) {
        showTooltipAtNode(m);
        drawEdgesFor(m.id, true);
      } else {
        hideTooltip();
        drawEdgesFor(m.id, false);
      }
    }, { passive: false });

    // Click → Detailseite
    g.addEventListener('click', () => openModule(m));

    nodeLayer.appendChild(g);
  });

  // ————— Helper —————

  function drawEdgesFor(id, on) {
    // Vorherige Kanten entfernen
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

  function showTooltipAtNode(m) {
    const t = m.name ? `${pad(m.id)} — ${m.name}` : `Modul ${pad(m.id)}`;
    const d = m.desc || (m.ring ? `${m.ring} Ring` : '');

    // sichere Inhalte (keine innerHTML)
    tip.replaceChildren();
    const h3 = document.createElement('h3'); h3.textContent = t;
    const p = document.createElement('p'); p.textContent = d;
    tip.append(h3, p);
    tip.hidden = false;

    // in Node-Nähe platzieren + clampen
    const { x, y } = pos[m.id];
    const rect = svg.getBoundingClientRect();
    tip.style.left = (x - rect.left + 16) + 'px';
    tip.style.top  = (y - rect.top  + 16) + 'px';
    clampTip();
  }

  function hideTooltip() {
    tip.hidden = true;
  }

  function clampTip() {
    // Nach dem Platzieren sicherstellen, dass Tooltip im Container bleibt
    const r = svg.getBoundingClientRect();
    const tw = tip.offsetWidth || 240;
    const th = tip.offsetHeight || 80;
    let left = parseInt(tip.style.left, 10) || (r.left + 8);
    let top  = parseInt(tip.style.top, 10)  || (r.top + 8);
    left = Math.min(Math.max(left,  r.left + 8),  r.right - tw - 8);
    top  = Math.min(Math.max(top,   r.top  + 8),  r.bottom - th - 8);
    tip.style.left = left + 'px';
    tip.style.top  = top + 'px';
  }

  function openModule(m) {
    const href = m.href && m.href.length ? m.href : (`./module.html?id=${pad(m.id)}${m.name ? '_' + slug(m.name) : ''}`);
    window.location.href = href;
  }

  function el(tag, attrs = {}, text) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function slug(s) { return String(s).toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''); }

  function renderFatal(msg) {
    // Fallback ins SVG schreiben
    const t = el('text', { x: cx, y: cy, class: 'label' }, msg);
    t.setAttribute('text-anchor', 'middle');
    svg.appendChild(t);
    // Tooltip aus
    tip.hidden = true;
  }
})();
