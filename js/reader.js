/* E-book reader runtime. Used by the builder preview and by every exported book.
   Expects window.BOOK (book data) and window.THEME (one entry of EB_THEMES). */
(function () {
  const B = window.BOOK, T = window.THEME || { cfg: {} }, C = T.cfg || {};
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const I = {
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5z"/><path d="M4 19.5V21h16"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z"/></svg>'
  };
  const TA = B.lang !== 'bi';   // Tamil-only interface unless the book is set to Tamil + English
  const LT = { start: 'தொடங்கு', resume: 'தொடர்க', prev: 'முந்தைய', next: 'அடுத்து', read: 'கேள்', stop: 'நிறுத்து', toc: 'பொருளடக்கம்', bank: 'சொல் வங்கி', again: 'மீண்டும் படி', nextStory: 'அடுத்த கதை', end: 'முற்றும்', right: 'சரி!', wrong: 'மீண்டும் முயல்க', check: 'சரிபார்', answer: 'உங்கள் பதில்…', page: 'பக்கம்', cover: 'அட்டைப்படம்', noPic: 'இந்தப் புதிருக்கு ஒரு படம் சேர்க்கவும்.' };
  const LB = { start: C.startLabel || 'தொடங்கு · Start', resume: C.resumeLabel || 'தொடர்க · Continue', prev: C.prevLabel || 'Back', next: C.nextLabel || 'Next', read: C.readLabel || 'Listen', stop: C.stopLabel || 'Stop', toc: C.tocTitle || 'பொருளடக்கம் · Contents', bank: C.bankTitle || 'சொல் வங்கி · Word bank', again: C.againLabel || 'மீண்டும் · Read again', nextStory: 'அடுத்தது · Next', end: C.endTa || 'முற்றும்', right: C.rightMsg || 'சரி! · Correct!', wrong: C.wrongMsg || 'மீண்டும் முயலுங்கள் · Try again', check: 'சரிபார் · Check', answer: 'உங்கள் பதில்… / Your answer…', page: 'PAGE', cover: 'COVER', noPic: 'Add a picture to this puzzle.' };
  const L = k => (TA ? LT : LB)[k];
  const KIND = TA ? { story: 'கதை', script: 'நாடகம்', poem: 'கவிதை' } : { story: 'கதை · Story', script: 'நாடகம் · Script', poem: 'கவிதை · Poem' };
  const isKids = T.age === 'kids';
  const hasEn = !TA && B.sections.some(s => s.stories.some(st => st.pages.some(p => (p.en || '').trim())));
  const stories = B.sections.flatMap((s, si) => s.stories.map((st, i) => ({ st, si, i })));

  /* ---------- shell ---------- */
  document.body.insertAdjacentHTML('afterbegin', T.scene || '');
  const app = el('div', 'app'); document.body.appendChild(app);
  const book = el('div', 'book'); app.appendChild(book);
  const top = el('div', 'topbar');
  top.innerHTML = `<button class="icon-btn" data-act="home" aria-label="Cover">${I.home}</button>
    ${B.type === 'collection' ? `<button class="icon-btn" data-act="toc" aria-label="Contents">${I.list}</button>` : ''}
    <div class="title"></div>
    <div class="tools">
      ${hasEn ? '<div class="lang" role="group" aria-label="Language"><button data-l="ta">தமிழ்</button><button data-l="both">இரண்டும்</button><button data-l="en">EN</button></div>' : ''}
      <button class="icon-btn sm" data-act="fs-" aria-label="Smaller text">A-</button>
      <button class="icon-btn sm" data-act="fs+" aria-label="Larger text">A+</button>
      ${C.wordBank ? `<button class="icon-btn" data-act="bank" aria-label="Word bank">${I.book}</button>` : ''}
      <button class="icon-btn" data-act="full" aria-label="Full screen">${I.full}</button>
    </div>`;
  book.appendChild(top);
  const prog = el('div', 'progress', '<i></i>'); if (C.progressBar) book.appendChild(prog);
  const stage = el('div', 'pages'); book.appendChild(stage);
  const nav = el('div', 'navbar');
  nav.innerHTML = `<button class="nav-btn" data-act="prev">${I.prev}<span>${esc(L('prev'))}</span></button><div class="dots"></div><span class="counter"></span><button class="nav-btn" data-act="next"><span>${esc(L('next'))}</span>${I.next}</button>`;
  book.appendChild(nav);
  const drawer = el('aside', 'drawer'); book.appendChild(drawer);
  const pop = el('div', 'pop'); document.body.appendChild(pop);

  /* ---------- state ---------- */
  let view = { name: 'cover' }, slides = [], idx = 0, fs = 1, score = { right: 0, total: 0 };
  const setLang = l => { document.body.classList.remove('l-ta', 'l-en', 'l-both'); document.body.classList.add('l-' + l); top.querySelectorAll('.lang button').forEach(b => b.classList.toggle('on', b.dataset.l === l)); };
  setLang(hasEn ? (C.defaultLang || 'both') : 'ta');

  /* ---------- progress tracking (works with or without an LMS) ---------- */
  const SC = window.SCORM || null;   // {version:'1.2'|'2004', rule:'pages'|'activities', pass:number|null}
  const SCORABLE = ['mcq', 'match', 'order', 'jigsaw', 'blank'];
  const prog$ = { v: {}, a: {}, loc: '' };
  const totalScorable = B.sections.reduce((n, s) => n + s.stories.reduce((m, st) => m + (st.activities || []).filter(a => SCORABLE.includes(a.type)).length, 0), 0);
  const LMS = (function () {
    if (!SC) return null;
    const find = w => { for (let i = 0; w && i < 12; i++) { const api = SC.version === '2004' ? w.API_1484_11 : w.API; if (api) return api; if (w.parent === w) break; w = w.parent; } return null; };
    let api = find(window) || (window.opener && find(window.opener));
    if (!api) return null;
    const v4 = SC.version === '2004';
    const call = (a, b, c) => { try { return v4 ? api[a.replace('LMS', '')](b, c) : api[a](b, c); } catch (e) { return ''; } };
    const K = v4 ? { status: 'cmi.completion_status', success: 'cmi.success_status', loc: 'cmi.location', susp: 'cmi.suspend_data', raw: 'cmi.score.raw', min: 'cmi.score.min', max: 'cmi.score.max', scaled: 'cmi.score.scaled', time: 'cmi.session_time', exit: 'cmi.exit', entry: 'cmi.entry' }
                 : { status: 'cmi.core.lesson_status', loc: 'cmi.core.lesson_location', susp: 'cmi.suspend_data', raw: 'cmi.core.score.raw', min: 'cmi.core.score.min', max: 'cmi.core.score.max', time: 'cmi.core.session_time', exit: 'cmi.core.exit', entry: 'cmi.core.entry' };
    call('LMSInitialize', '');
    const t0 = Date.now();
    const o = { v4, K, get: k => call('LMSGetValue', k), set: (k, v) => call('LMSSetValue', k, String(v)), commit: () => call('LMSCommit', '') };
    o.finish = () => { if (o.done) return; o.done = true; o.set(K.time, fmtTime((Date.now() - t0) / 1000)); o.set(K.exit, 'suspend'); o.commit(); call('LMSFinish', ''); };
    function fmtTime(sec) { sec = Math.round(sec); if (v4) return 'PT' + Math.floor(sec / 3600) + 'H' + Math.floor(sec % 3600 / 60) + 'M' + (sec % 60) + 'S'; const p = n => String(n).padStart(2, '0'); return p(Math.floor(sec / 3600)) + ':' + p(Math.floor(sec % 3600 / 60)) + ':' + p(sec % 60); }
    try { const d = JSON.parse(o.get(K.susp) || '{}'); Object.assign(prog$, { v: d.v || {}, a: d.a || {} }); } catch (e) {}
    prog$.loc = o.get(K.loc) || '';
    const st = o.get(K.status);
    if (!st || st === 'not attempted' || st === 'unknown') o.set(K.status, 'incomplete');
    addEventListener('pagehide', o.finish); addEventListener('beforeunload', o.finish);
    return o;
  })();
  const keyOf = (si, i) => si + '.' + i;
  function storyDone(si, i) {
    const st = B.sections[si].stories[i], v = prog$.v[keyOf(si, i)] || '';
    for (let k = 0; k < st.pages.length; k++) if (v[k] !== '1') return false;
    if (SC && SC.rule === 'activities') for (let k = 0; k < (st.activities || []).length; k++) if (st.activities[k].type !== 'reflect' && !(keyOf(si, i) + '.' + k in prog$.a)) return false;
    return true;
  }
  let syncT = 0;
  function record() {
    clearTimeout(syncT); syncT = setTimeout(sync, 300);
  }
  function sync() {
    if (!LMS) return;
    const K = LMS.K;
    LMS.set(K.susp, JSON.stringify({ v: prog$.v, a: prog$.a }).slice(0, LMS.v4 ? 64000 : 4096));
    LMS.set(K.loc, prog$.loc);
    const right = Object.values(prog$.a).filter(x => x === 1).length;
    const score = totalScorable ? Math.round(right / totalScorable * 100) : null;
    if (score != null) { LMS.set(K.min, 0); LMS.set(K.max, 100); LMS.set(K.raw, score); if (LMS.v4) LMS.set(K.scaled, (score / 100).toFixed(2)); }
    const complete = stories.every(x => storyDone(x.si, x.i));
    const pass = SC.pass != null && SC.pass !== '' && score != null ? score >= +SC.pass : null;
    if (LMS.v4) {
      LMS.set(K.status, complete ? 'completed' : 'incomplete');
      if (pass != null && complete) LMS.set(K.success, pass ? 'passed' : 'failed');
    } else if (complete) LMS.set(K.status, pass == null ? 'completed' : pass ? 'passed' : 'failed');
    LMS.commit();
  }

  /* ---------- text helpers ---------- */
  let gl = {}, glKeys = [];
  const useGlossary = g => { gl = g || {}; glKeys = Object.keys(gl).sort((a, b) => b.length - a.length); };
  const findGl = w => { const c = w.replace(/[“”"'‘’.,!?;:()]/g, ''); return glKeys.find(k => c.startsWith(k)); };
  const words = (txt, lang) => esc(txt).split(/(\s+)/).map(w => {
    if (!w.trim()) return w;
    const k = lang === 'ta' ? findGl(w) : null;
    return `<span class="w${k ? ' gl' : ''}" data-k="${k ? esc(k) : ''}" data-lang="${lang}">${w}</span>`;
  }).join('');
  function renderText(kind, txt, lang) {
    txt = (txt || '').trim(); if (!txt) return '';
    const cls = 'line-' + lang;
    if (kind === 'poem') return txt.split(/\n\s*\n/).map(st => `<div class="stanza ${cls}">${st.split('\n').map(l => words(l, lang)).join('<br>')}</div>`).join('');
    if (kind === 'script') return txt.split('\n').filter(l => l.trim()).map(l => {
      const m = l.match(/^\s*([^:：]{1,30})[:：]\s*(.*)$/);
      if (/^\s*[(（\[]/.test(l)) return `<p class="${cls} dir">${words(l, lang)}</p>`;
      if (m) return `<p class="${cls} say"><span class="who">${esc(m[1])}</span><span>${words(m[2], lang)}</span></p>`;
      return `<p class="${cls}">${words(l, lang)}</p>`;
    }).join('');
    return txt.split(/\n\s*\n/).map(p => `<p class="${cls}">${p.split('\n').map(l => words(l, lang)).join('<br>')}</p>`).join('');
  }
  const art = (src, label) => `<div class="art">${src ? `<img src="${esc(src)}" alt="">` : `<div class="ph"><b>${T.cfg?.phGlyph || '✦'}</b>${esc(label)}</div>`}</div>`;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const shuffled = a => { let s = shuffle(a); if (a.length > 1 && s.every((x, i) => x === a[i])) s.push(s.shift()); return s; };

  /* ---------- views ---------- */
  function setTitle(h) { $('.title', top).innerHTML = h; }
  function showNav(on) { nav.style.visibility = on ? 'visible' : 'hidden'; }
  function mount(node, back) { stopRead(); pop.classList.remove('show'); stage.innerHTML = ''; if (back) node.classList.add('back'); stage.appendChild(node); stage.scrollTop = 0; }

  function showCover() {
    view = { name: 'cover' }; useGlossary({});
    setTitle(esc(B.title_ta) + (!TA && B.title_en ? ` <span class="sec">· ${esc(B.title_en)}</span>` : ''));
    const n = el('section', 'page full cover');
    n.innerHTML = `<div><h1>${esc(B.title_ta)}</h1>${!TA && B.title_en ? `<h2>${esc(B.title_en)}</h2>` : ''}${art(B.cover, L('cover'))}
      ${B.subtitle ? `<div class="meta">${esc(B.subtitle)}</div>` : ''}
      <div class="end-actions"><button class="nav-btn big-btn" data-act="start">${esc(L('start'))}</button>
      ${prog$.loc ? `<button class="nav-btn big-btn" data-act="resume">${esc(L('resume'))}</button>` : ''}</div></div>`;
    mount(n); showNav(false); drawer.classList.remove('open'); updateProg(0);
  }

  function showToc(sec = view.sec ?? 0) {
    if (B.type !== 'collection') return openStory(0, 0);
    view = { name: 'toc', sec }; useGlossary({});
    setTitle(esc(B.title_ta));
    const s = B.sections[sec];
    const n = el('section', 'toc');
    n.innerHTML = `<h1>${esc(L('toc'))}</h1>
      ${B.sections.length > 1 ? `<div class="tabs" role="tablist">${B.sections.map((x, i) => `<button role="tab" class="${i === sec ? 'on' : ''}" data-sec="${i}">${esc(x.title_ta)}${!TA && x.title_en ? `<small>${esc(x.title_en)}</small>` : ''}</button>`).join('')}</div>` : ''}
      ${s.intro ? `<p class="sec-intro">${esc(s.intro)}</p>` : ''}
      <div class="cards">${s.stories.map((st, i) => {
        const th = st.thumb || st.pages.find(p => p.img)?.img;
        return `<button class="scard" data-open="${sec}:${i}"><div class="thumb">${th ? `<img src="${esc(th)}" alt="">` : `<span>${i + 1}</span>`}</div>
        <div class="info"><span class="no">${String(i + 1).padStart(2, '0')} · ${esc(TA ? KIND[st.kind] : ((KIND[st.kind] || '').split(' · ')[1] || ''))}${storyDone(sec, i) ? ' <span class="done-tick" title="Finished">✓</span>' : ''}</span><b>${esc(st.title_ta)}</b>${st.author ? `<small>${esc(st.author)}</small>` : ''}</div></button>`;
      }).join('')}</div>`;
    mount(n); showNav(false); updateProg(0);
  }

  function openStory(si, i, at = 0) {
    const st = B.sections[si]?.stories[i]; if (!st) return showToc();
    view = { name: 'story', sec: si, i }; useGlossary(st.glossary);
    score = { right: 0, total: 0 };
    setTitle(`${esc(st.title_ta)}${B.type === 'collection' ? ` <span class="sec">· ${esc(B.sections[si].title_ta)}</span>` : ''}`);
    slides = [
      ...st.pages.map((p, pi) => ({ type: 'page', p, pi })),
      ...(st.activities || []).map((a, k) => ({ type: 'act', a, k })),
      { type: 'end' }
    ];
    // bank
    drawer.innerHTML = `<h3>${esc(L('bank'))}<button class="icon-btn" data-act="bank">✕</button></h3><dl>${Object.keys(gl).sort().map(k => `<div><dt>${esc(k)}</dt><dd>${esc(gl[k])}</dd></div>`).join('') || '<dd>—</dd>'}</dl>`;
    const dots = $('.dots', nav); dots.innerHTML = '';
    if (slides.length <= 14) slides.forEach((_, k) => { const b = el('button'); b.setAttribute('aria-label', 'Page ' + (k + 1)); b.onclick = () => go(k); dots.appendChild(b); });
    showNav(true); go(at);
  }

  function go(n) {
    const back = n < idx;
    idx = Math.max(0, Math.min(slides.length - 1, n));
    const st = B.sections[view.sec].stories[view.i], s = slides[idx];
    let node;
    if (s.type === 'page') {
      const showArt = st.layout !== 'text';
      node = el('section', `page story kind-${st.kind}${showArt ? '' : ' noimg'}`);
      node.innerHTML = `${showArt ? art(s.p.img, L('page') + ' ' + (s.pi + 1)) : ''}
        <div class="text"><div class="textbox">${s.pi === 0 ? `<p class="line-ta" style="font-family:var(--font-head);color:var(--head-ink)">${esc(st.title_ta)}</p>${st.author ? `<p class="line-en" style="display:block">${esc(st.author)}</p>` : ''}` : ''}
        ${renderText(st.kind, s.p.ta, 'ta')}${renderText(st.kind, s.p.en, 'en')}</div>
        ${s.p.audio || 'speechSynthesis' in window ? `<button class="read" data-act="read">${I.play}<span>${esc(L('read'))}</span></button>` : ''}</div>`;
    } else if (s.type === 'act') {
      node = el('section', 'page full'); node.appendChild(renderActivity(s.a, st, keyOf(view.sec, view.i) + '.' + s.k));
    } else {
      node = el('section', 'page full cover');
      const nextS = nextStory();
      node.innerHTML = `<div><h1>${esc(L('end'))}</h1><h2>${esc(st.title_ta)}</h2>
        ${C.stars && score.total ? `<div class="stars">${I.star.repeat(3)}</div>` : ''}
        <div class="end-actions">
          <button class="nav-btn" data-act="restart">${esc(L('again'))}</button>
          ${B.type === 'collection' ? `<button class="nav-btn" data-act="toc">${esc(TA ? LT.toc : 'பொருளடக்கம் · Contents')}</button>` : ''}
          ${nextS ? `<button class="nav-btn" data-act="nextstory">${esc(L('nextStory'))} ${I.next}</button>` : ''}
        </div></div>`;
      if (C.stars && score.total) { const k = Math.max(1, Math.round(score.right / score.total * 3)); setTimeout(() => node.querySelectorAll('.stars svg').forEach((s, i) => setTimeout(() => s.classList.toggle('on', i < k), i * 300)), 200); if (k >= 2 && C.confetti) confetti(); }
    }
    { const k = keyOf(view.sec, view.i); let v = (prog$.v[k] || '').padEnd(slides.length, '0').split(''); v[idx] = '1'; prog$.v[k] = v.join('').replace(/0+$/, ''); prog$.loc = k + '.' + idx; record(); }
    mount(node, back);
    [...$('.dots', nav).children].forEach((d, k) => d.classList.toggle('on', k === idx));
    $('.counter', nav).textContent = `${idx + 1} / ${slides.length}`;
    $('[data-act=prev]', nav).disabled = idx === 0;
    $('[data-act=next]', nav).disabled = idx === slides.length - 1;
    updateProg(idx / (slides.length - 1));
  }
  function nextStory() { const k = stories.findIndex(x => x.si === view.sec && x.i === view.i); return stories[k + 1]; }
  function updateProg(f) { const i = $('i', prog); if (i) i.style.width = (f * 100) + '%'; }

  /* ---------- activities ---------- */
  const qBlock = a => `<p class="q"><span class="line-ta">${esc(a.q_ta || '')}</span>${!TA && a.q_en ? `<br><span class="line-en">${esc(a.q_en)}</span>` : ''}</p>`;
  const TITLES = TA ? { mcq: 'கேள்வி', reflect: 'சிந்திப்போம்', match: 'பொருத்துக', order: 'வரிசைப்படுத்துக', jigsaw: 'படப் புதிர்', blank: 'கோடிட்ட இடங்களை நிரப்புக' } : { mcq: 'கேள்வி · Question', reflect: 'சிந்திப்போம் · Reflect', match: 'பொருத்துக · Match', order: 'வரிசைப்படுத்துக · Put in order', jigsaw: 'புதிர் · Puzzle', blank: 'நிரப்புக · Fill in the blanks' };
  function renderActivity(a, st, akey) {
    const box = el('div', 'act');
    box.innerHTML = `<h3>${esc(a.title || TITLES[a.type] || '')}</h3>${qBlock(a)}`;
    const fb = el('div', 'feedback');
    const right = () => { fb.textContent = L('right'); if (C.confetti) confetti(.4); };
    const wrong = () => { fb.textContent = L('wrong'); };
    const tally = ok => { if (!box.dataset.scored) { box.dataset.scored = 1; score.total++; if (ok) score.right++; if (!(akey in prog$.a)) { prog$.a[akey] = ok ? 1 : 0; record(); } } };

    if (a.type === 'mcq') {
      const o = el('div', 'opts'); let tried = false;
      (a.options || []).forEach((t, i) => { const b = el('button', 'opt', esc(t)); b.onclick = () => {
        if (o.dataset.done) return;
        if (i === +a.answer) { b.classList.add('ok'); o.dataset.done = 1; if (!tried) tally(true); else tally(false); right(); }
        else { tried = true; b.classList.add('no'); wrong(); setTimeout(() => b.classList.remove('no'), 500); }
      }; o.appendChild(b); });
      box.append(o, fb);
    }
    if (a.type === 'reflect') {
      const t = el('textarea'); t.placeholder = L('answer'); t.setAttribute('aria-label', 'Your answer');
      box.classList.add('reflect'); t.oninput = () => { if (!(akey in prog$.a)) { prog$.a[akey] = -1; record(); } }; box.append(t);
    }
    if (a.type === 'match') {
      const pairs = (a.pairs || []).filter(p => p[0] && p[1]);
      const m = el('div', 'match'), L = el('div', 'col'), R = el('div', 'col'); let sel = null, miss = false, done = 0;
      pairs.forEach((p, i) => { const b = el('button', 'opt', esc(p[0])); b.dataset.i = i; L.appendChild(b); });
      shuffled(pairs.map((p, i) => i)).forEach(i => { const b = el('button', 'opt', esc(pairs[i][1])); b.dataset.i = i; R.appendChild(b); });
      L.onclick = e => { const b = e.target.closest('.opt'); if (!b) return; L.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); sel = b; };
      R.onclick = e => { const b = e.target.closest('.opt'); if (!b || !sel) return;
        if (b.dataset.i === sel.dataset.i) { b.classList.add('done'); sel.classList.add('done'); sel.classList.remove('sel'); sel = null; if (++done === pairs.length) { tally(!miss); right(); } }
        else { miss = true; b.classList.add('no'); setTimeout(() => b.classList.remove('no'), 500); wrong(); } };
      m.append(L, R); box.append(m, fb);
    }
    if (a.type === 'order') {
      const items = (a.items || []).filter(Boolean); let cur = shuffled(items.map((_, i) => i));
      const ul = el('ol', 'order');
      const draw = () => { ul.innerHTML = cur.map((k, p) => `<li data-p="${p}"><span>${esc(items[k])}</span><button class="icon-btn" data-mv="-1" aria-label="Move up">${I.up}</button><button class="icon-btn" data-mv="1" aria-label="Move down">${I.down}</button></li>`).join(''); };
      ul.onclick = e => { const b = e.target.closest('[data-mv]'); if (!b) return; const p = +b.closest('li').dataset.p, q = p + +b.dataset.mv; if (q < 0 || q >= cur.length) return; [cur[p], cur[q]] = [cur[q], cur[p]]; draw(); };
      const chk = el('button', 'nav-btn check', L('check'));
      chk.onclick = () => { const ok = cur.every((k, p) => k === p); ul.querySelectorAll('li').forEach((li, p) => li.classList.add(cur[p] === p ? 'ok' : 'no')); setTimeout(() => ul.querySelectorAll('li').forEach(li => li.classList.remove('ok', 'no')), 1500); tally(ok); ok ? right() : wrong(); };
      draw(); box.append(ul, chk, fb);
    }
    if (a.type === 'jigsaw') {
      const n = Math.max(2, Math.min(5, +a.size || 3)), img = a.img || st.pages.find(p => p.img)?.img;
      if (!img) { box.append(el('p', 'q', L('noPic'))); return box; }
      const g = el('div', 'jig'); g.style.gridTemplateColumns = `repeat(${n},1fr)`;
      let cur = shuffled([...Array(n * n).keys()]), sel = null;
      const draw = () => { g.innerHTML = ''; cur.forEach((k, p) => { const b = el('button'); b.setAttribute('aria-label', 'Tile ' + (p + 1));
        b.style.backgroundImage = `url("${img}")`; b.style.backgroundSize = `${n * 100}% ${n * 100}%`;
        b.style.backgroundPosition = `${(k % n) / (n - 1) * 100}% ${Math.floor(k / n) / (n - 1) * 100}%`;
        b.onclick = () => { if (g.classList.contains('solved')) return; if (sel === null) { sel = p; b.classList.add('sel'); return; }
          [cur[sel], cur[p]] = [cur[p], cur[sel]]; sel = null; draw(); if (cur.every((k, i) => k === i)) { g.classList.add('solved'); tally(true); right(); } };
        g.appendChild(b); }); };
      draw(); box.append(g, fb);
    }
    if (a.type === 'blank') {
      const answers = [];
      const html = esc(a.text || '').replace(/\[([^\]]+)\]/g, (_, w) => { answers.push(w.trim()); return `<input data-k="${answers.length - 1}" aria-label="Blank ${answers.length}">`; });
      const p = el('div', 'blank-text', html.replace(/\n/g, '<br>'));
      if (a.showBank !== false) box.append(el('div', 'bank-chips', shuffled(answers).map(w => `<span>${esc(w)}</span>`).join('')));
      const chk = el('button', 'nav-btn check', L('check'));
      chk.onclick = () => { let ok = true; p.querySelectorAll('input').forEach(i => { const g = i.value.trim() === answers[i.dataset.k]; i.classList.toggle('ok', g); i.classList.toggle('no', !g); ok = ok && g; }); tally(ok); ok ? right() : wrong(); };
      box.append(p, chk, fb);
    }
    return box;
  }

  /* ---------- read aloud ---------- */
  let audio = null, reading = null;
  function stopRead() { if (audio) { audio.pause(); audio = null; } if (window.speechSynthesis) speechSynthesis.cancel(); document.querySelectorAll('.w.hl').forEach(w => w.classList.remove('hl')); if (reading) { reading.innerHTML = `${I.play}<span>${esc(L('read'))}</span>`; reading = null; } }
  function read(btn) {
    if (reading === btn) return stopRead();
    stopRead(); reading = btn; btn.innerHTML = `${I.stop}<span>${esc(L('stop'))}</span>`;
    const p = slides[idx].p, lang = document.body.classList.contains('l-en') ? 'en' : 'ta';
    const src = lang === 'en' ? p.audio_en : p.audio;
    if (src) { audio = new Audio(src); audio.onended = stopRead; audio.play().catch(stopRead); return; }
    if (!window.speechSynthesis) return stopRead();
    const ws = [...stage.querySelectorAll(`.w[data-lang=${lang}]`)];
    const u = new SpeechSynthesisUtterance(ws.map(w => w.textContent).join(' '));
    u.lang = lang === 'en' ? 'en-GB' : 'ta-IN'; u.rate = C.speechRate || .85;
    const v = speechSynthesis.getVoices().find(v => v.lang.startsWith(u.lang.slice(0, 2))); if (v) u.voice = v;
    const starts = []; let pos = 0; ws.forEach(w => { starts.push(pos); pos += w.textContent.length + 1; });
    u.onboundary = e => { let k = starts.length - 1; while (k > 0 && starts[k] > e.charIndex) k--; ws.forEach((w, j) => w.classList.toggle('hl', j === k)); };
    u.onend = stopRead; speechSynthesis.speak(u);
  }

  /* ---------- events ---------- */
  top.querySelectorAll('.lang button').forEach(b => b.onclick = () => setLang(b.dataset.l));
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act]');
    if (a) {
      const act = a.dataset.act;
      if (act === 'home') showCover();
      if (act === 'toc') showToc();
      if (act === 'start') B.type === 'collection' ? showToc(0) : openStory(0, 0);
      if (act === 'next') go(idx + 1);
      if (act === 'prev') go(idx - 1);
      if (act === 'restart') go(0);
      if (act === 'resume') { const [s0, i0, p0] = prog$.loc.split('.').map(Number); if (B.sections[s0]?.stories[i0]) openStory(s0, i0, p0 || 0); else showToc(); }
      if (act === 'nextstory') { const n = nextStory(); if (n) openStory(n.si, n.i); }
      if (act === 'read') read(a);
      if (act === 'bank') drawer.classList.toggle('open');
      if (act === 'fs+' || act === 'fs-') { fs = Math.max(.8, Math.min(1.6, fs + (act === 'fs+' ? .1 : -.1))); document.body.style.setProperty('--fs', fs); }
      if (act === 'full') { const d = document; (d.fullscreenElement ? d.exitFullscreen() : d.documentElement.requestFullscreen?.())?.catch?.(() => {}); }
    }
    const t = e.target.closest('[data-sec]'); if (t) showToc(+t.dataset.sec);
    const o = e.target.closest('[data-open]'); if (o) { const [s, i] = o.dataset.open.split(':'); openStory(+s, +i); }
    const w = e.target.closest('.w');
    if (w && w.dataset.k) { const r = w.getBoundingClientRect(); pop.innerHTML = `<b>${esc(w.dataset.k)}</b>${esc(gl[w.dataset.k])}`; pop.classList.add('show'); pop.style.left = Math.min(innerWidth - 250, Math.max(8, r.left)) + 'px'; pop.style.top = Math.min(innerHeight - 90, r.bottom + 8) + 'px'; return; }
    if (!e.target.closest('.pop')) pop.classList.remove('show');
  });
  document.addEventListener('keydown', e => { if (/TEXTAREA|INPUT/.test(e.target.tagName) || view.name !== 'story') return; if (e.key === 'ArrowRight') go(idx + 1); if (e.key === 'ArrowLeft') go(idx - 1); });
  let sx = null;
  stage.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
  stage.addEventListener('touchend', e => { if (sx == null || view.name !== 'story') return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 60 && !e.target.closest('.jig,.match,.order')) go(idx + (dx < 0 ? 1 : -1)); sx = null; });

  function confetti(amt = 1) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = el('canvas', 'confetti'); document.body.appendChild(c); c.width = innerWidth; c.height = innerHeight; const x = c.getContext('2d');
    const cols = C.confettiColors || ['#FF5A5F', '#FFC93C', '#3EC1D3', '#7AC943', '#9B5DE5'];
    const ps = Array.from({ length: Math.round(120 * amt) }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * .3, vx: (Math.random() - .5) * 4, vy: 2 + Math.random() * 4, r: Math.random() * 6.28, s: 6 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
    let t = 0; (function f() { x.clearRect(0, 0, c.width, c.height); ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.r += .1; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); }); if (++t < 160) requestAnimationFrame(f); else c.remove(); })();
  }

  if (window.EBAmbient) EBAmbient.start(B.anim && B.anim !== 'theme' ? B.anim : (C.anim || 'none'), { density: B.animDensity, colors: B.anim && B.anim !== 'theme' ? null : C.animColors });
  /* start: optional window.START = {sec, i, page} for builder preview */
  const S = window.START;
  if (S && S.view === 'story') openStory(S.sec, S.i, S.page || 0);
  else if (S && S.view === 'toc') showToc(S.sec || 0);
  else showCover();
})();
