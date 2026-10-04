(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('sky-data').textContent);
  const svg = document.getElementById('research-sky-map');
  const detail = document.getElementById('sky-detail');
  const select = document.getElementById('sky-region');
  const sources = new Map(Array.from(document.querySelectorAll('.sky-source'), el => [el.dataset.id, el]));
  const regions = new Map(data.regions.map(region => [region.id, region]));
  const publicStars = data.stars.filter(star => sources.has(star.id));
  const occupiedRegions = new Set(publicStars.flatMap(star => [...(star.methods || []), ...(star.applications || [])]));
  const visibleRegions = data.regions.filter(region => occupiedRegions.has(region.id));
  Array.from(select.options).forEach(option => { if (option.value && !occupiedRegions.has(option.value)) option.remove(); });
  const stars = new Map(publicStars.map(s => [s.id, s]));
  const threads = data.threads.map(thread => ({ ...thread,
    papers: thread.papers.filter(id => stars.has(id)),
    edges: thread.edges.filter(edge => stars.has(edge.from) && stars.has(edge.to))
  })).filter(thread => thread.papers.length > 1);
  const belongsToRegion = star => !select.value || [...(star.methods || []), ...(star.applications || [])].includes(select.value);
  const elements = new Map();
  const edges = [];
  const container = document.querySelector('.research-sky');
  const tooltip = document.createElement('div');
  tooltip.id = 'sky-tooltip';
  tooltip.className = 'sky-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  container.appendChild(tooltip);
  let tooltipStar = null;
  let tooltipTimer;
  function hideTooltip() {
    clearTimeout(tooltipTimer);
    tooltip.hidden = true;
    tooltipStar?.removeAttribute('aria-describedby');
    tooltipStar = null;
  }
  function scheduleHide() {
    clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(hideTooltip, 180);
  }
  function showTooltip(starElement, source) {
    hideTooltip();
    tooltipStar = starElement;
    const reference = document.createElement('small');
    reference.textContent = source.dataset.status || [source.dataset.authors, source.dataset.year].filter(Boolean).join(' · ');
    const title = document.createElement('strong');
    title.textContent = source.querySelector('h3').textContent.trim();
    const venue = document.createElement('small');
    venue.textContent = source.dataset.venue || 'Provisional title · select for details';
    tooltip.replaceChildren(reference, title, venue);
    tooltip.hidden = false;
    starElement.setAttribute('aria-describedby', tooltip.id);
    const bounds = container.getBoundingClientRect();
    const target = starElement.getBoundingClientRect();
    const left = target.left + target.width / 2 - bounds.left - tooltip.offsetWidth / 2;
    tooltip.style.left = `${Math.max(12, Math.min(left, container.clientWidth - tooltip.offsetWidth - 12))}px`;
    const above = target.top - bounds.top - tooltip.offsetHeight - 8;
    tooltip.style.top = `${above > 12 ? above : target.bottom - bounds.top + 8}px`;
  }
  tooltip.addEventListener('pointerenter', () => clearTimeout(tooltipTimer));
  tooltip.addEventListener('pointerleave', scheduleHide);
  document.querySelector('.sky-stage').addEventListener('scroll', hideTooltip);
  window.addEventListener('resize', hideTooltip);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hideTooltip(); });
  const make = (tag, attrs, parent = svg) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    parent.appendChild(el);
    return el;
  };
  const defs = make('defs', {});
  visibleRegions.forEach(region => {
    const gradient = make('radialGradient', { id: `sky-region-${region.id}` }, defs);
    make('stop', { offset: '0%', 'stop-color': region.color, 'stop-opacity': region.kind === 'application' ? '.11' : '.2' }, gradient);
    make('stop', { offset: '100%', 'stop-color': region.color, 'stop-opacity': '0' }, gradient);
    region.clouds.forEach(cloud => make('ellipse', { cx: cloud.x, cy: cloud.y, rx: cloud.rx, ry: cloud.ry, fill: `url(#sky-region-${region.id})`, 'aria-hidden': 'true' }));
  });
  // Deterministic decoration, deliberately much fainter than research stars.
  let seed = 42;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const { width: skyWidth, height: skyHeight } = svg.viewBox.baseVal;
  for (let i = 0; i < 125; i++) make('circle', { cx: random() * skyWidth, cy: random() * skyHeight, r: .3 + random() * .65, fill: '#cbd5ed', opacity: .1 + random() * .25, 'aria-hidden': 'true' });
  visibleRegions.forEach(region => {
    make('text', { x: region.label.x, y: region.label.y, class: `sky-region sky-region--${region.kind}`, style: `fill: ${region.color}` }).textContent = region.name;
  });
  threads.forEach(thread => thread.edges.forEach(link => {
    const a = stars.get(link.from), b = stars.get(link.to);
    if (!a || !b) return;
    const el = make('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'sky-edge', 'aria-hidden': 'true' });
    edges.push({ el, link, threadId: thread.id });
  }));
  let selected = null;
  let activeThread = null;
  function update() {
    elements.forEach((el, id) => {
      const inConstellation = Boolean(activeThread?.papers.includes(id));
      el.classList.toggle('is-constellation', inConstellation);
      el.classList.toggle('is-muted', !inConstellation && id !== selected && Boolean(selected || !belongsToRegion(stars.get(id))));
      el.setAttribute('aria-pressed', String(selected === id));
    });
    edges.forEach(({ el, threadId }) => {
      const highlighted = activeThread?.id === threadId;
      el.classList.toggle('is-adjacent', highlighted);
      el.classList.toggle('is-subdued', Boolean(selected && !highlighted));
      el.style.display = highlighted ? '' : 'none';
    });
  }
  function overview() {
    hideTooltip();
    selected = null;
    activeThread = null;
    detail.replaceChildren();
    detail.hidden = true;
    update();
  }
  function activate(id, threadId = null) {
    hideTooltip();
    detail.hidden = false;
    selected = id;
    const availableThreads = threads.filter(thread => thread.papers.includes(id));
    activeThread = availableThreads.find(thread => thread.id === threadId) || availableThreads[0] || null;
    const source = sources.get(id);
    detail.replaceChildren();
    const status = document.createElement('small');
    status.textContent = [source.dataset.status || source.closest('[data-sky-status]').dataset.skyStatus, source.dataset.year].filter(Boolean).join(' · ');
    detail.appendChild(status);
    const star = stars.get(id);
    const affiliations = document.createElement('p');
    affiliations.className = 'sky-affiliations';
    [...(star.methods || []), ...(star.applications || [])].forEach(regionId => {
      const region = regions.get(regionId);
      const tag = document.createElement('span');
      tag.textContent = region.name;
      tag.className = `sky-tag sky-tag--${region.kind}`;
      affiliations.appendChild(tag);
    });
    detail.appendChild(affiliations);
    Array.from(source.children).forEach(child => {
      const clone = child.cloneNode(true);
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      detail.appendChild(clone);
    });
    if (activeThread) {
      const narrative = document.createElement('section');
      narrative.className = 'sky-thread';
      const heading = document.createElement('h4');
      heading.textContent = activeThread.title;
      narrative.appendChild(heading);
      if (availableThreads.length > 1) {
        const choices = document.createElement('div');
        choices.className = 'sky-thread-choices';
        choices.setAttribute('aria-label', 'Research threads involving this paper');
        availableThreads.forEach(thread => {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = thread.title;
          button.setAttribute('aria-pressed', String(thread.id === activeThread.id));
          button.addEventListener('click', () => {
            activate(id, thread.id);
            detail.querySelector('.sky-thread-choices [aria-pressed="true"]').focus();
          });
          choices.appendChild(button);
        });
        narrative.appendChild(choices);
      }
      activeThread.edges.filter(edge => edge.text).forEach(edge => {
        const paragraph = document.createElement('p');
        // Support italic spans without interpreting narrative text as HTML.
        edge.text.split(/(\*[^*]+\*)/g).forEach(part => {
          if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
            const emphasis = document.createElement('em');
            emphasis.textContent = part.slice(1, -1);
            paragraph.appendChild(emphasis);
          } else {
            paragraph.appendChild(document.createTextNode(part));
          }
        });
        narrative.appendChild(paragraph);
      });
      detail.appendChild(narrative);
    }
    update();
  }
  publicStars.forEach(star => {
    const source = sources.get(star.id);
    if (!source) return;
    const color = regions.get(star.methods?.[0])?.color || regions.get(star.applications?.[0])?.color || '#c7d0df';
    const project = source.dataset.status === 'Work in progress';
    const preprint = source.closest('[data-sky-status]')?.dataset.skyStatus === 'Preprint';
    const g = make('g', { transform: `translate(${star.x} ${star.y})`, class: `sky-star${preprint ? ' sky-star--preprint' : ''}`, role: 'button', tabindex: '0', 'aria-label': `${source.querySelector('h3').textContent.trim()} — ${project ? 'work in progress' : source.dataset.year}${preprint ? ' — preprint' : ''}`, 'aria-pressed': 'false' });
    g.style.setProperty('--star-color', color);
    make('circle', { r: 24, fill: 'transparent' }, g);
    make('circle', { r: 18, class: 'sky-focus' }, g);
    make('circle', { r: 14, fill: color, opacity: '.18' }, g);
    make('circle', { r: 8, fill: color, opacity: '.34' }, g);
    if (project) make('path', { d: 'M0 -6 L6 0 L0 6 L-6 0 Z', fill: '#0b1324', stroke: color, 'stroke-width': '2' }, g);
    else {
      make('path', { d: 'M-9 0 H9 M0 -9 V9', stroke: color, 'stroke-width': '.7', opacity: '.7' }, g);
      make('circle', { r: preprint ? 5 : 3.8, fill: preprint ? '#080f20' : '#fff', stroke: preprint ? color : 'none', 'stroke-width': preprint ? 1.8 : 0 }, g);
    }
    g.addEventListener('click', () => activate(star.id));
    g.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') showTooltip(g, source); });
    g.addEventListener('pointerleave', scheduleHide);
    g.addEventListener('focus', () => showTooltip(g, source));
    g.addEventListener('blur', scheduleHide);
    g.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(star.id); } });
    elements.set(star.id, g);
  });
  select.addEventListener('change', overview);
  svg.addEventListener('click', event => { if (!event.target.closest('.sky-star')) overview(); });
  document.getElementById('sky-reset').addEventListener('click', () => { select.value = ''; overview(); });
  svg.addEventListener('keydown', event => { if (event.key === 'Escape') overview(); });
  document.querySelector('.sky-toolbar').hidden = false;
  document.querySelector('.sky-stage').hidden = false;
  overview();
})();
