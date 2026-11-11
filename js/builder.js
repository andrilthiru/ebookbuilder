/* Ebook Builder — editor UI. Data lives in IndexedDB; export uses EBCompose. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const THEMES = window.EB_THEMES;
  const KINDS = { story: 'Story · கதை', script: 'Script · நாடகம்', poem: 'Poem · கவிதை' };
  const ACTS = {
    mcq: ['Multiple choice', 'One correct answer'],
    match: ['Match pairs', 'Word ↔ meaning'],
    order: ['Put in order', 'Sequence events'],
    blank: ['Fill in blanks', 'Cloze passage'],
    jigsaw: ['Picture puzzle', 'Jigsaw from an image'],
    reflect: ['Reflection', 'Open written answer']
  };
  const I = {
    up: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>',
    del: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    img: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'
  };

  /* ---------- storage ---------- */
  const DB = {
    open() { return new Promise((res, rej) => { const r = indexedDB.open('ebookbuilder', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
    async get(k) { const d = await this.open(); return new Promise(res => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); },
    async set(k, v) { const d = await this.open(); return new Promise((res, rej) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
  };
  let saveT;
  function save() {
    $('#saved').textContent = 'Saving…'; clearTimeout(saveT);
    saveT = setTimeout(() => DB.set('book', book).then(() => $('#saved').textContent = 'Saved').catch(() => $('#saved').textContent = 'Not saved — storage full?'), 400);
  }

  /* ---------- model ---------- */
  const newPage = () => ({ img: '', audio: '', ta: '', en: '' });
  const newStory = (kind = 'story') => ({ id: uid(), kind, layout: 'image', title_ta: 'புதிய ' + ({ story: 'கதை', script: 'நாடகம்', poem: 'கவிதை' }[kind]), title_en: '', author: '', thumb: '', pages: [newPage()], glossary: {}, activities: [] });
  const newSection = () => ({ id: uid(), title_ta: 'புதிய பகுதி', title_en: 'New section', intro: '', stories: [newStory()] });
  const newBook = () => ({ version: 1, type: 'single', theme: 'toy-blocks', title_ta: 'என் மின்னூல்', title_en: 'My e-book', subtitle: '', cover: '', sections: [{ id: uid(), title_ta: 'கதைகள்', title_en: 'Stories', intro: '', stories: [newStory()] }] });
  const ACT_NEW = {
    mcq: () => ({ type: 'mcq', q_ta: '', q_en: '', options: ['', '', ''], answer: 0 }),
    match: () => ({ type: 'match', q_ta: 'பொருத்துக.', q_en: 'Match the pairs.', pairs: [['', ''], ['', ''], ['', '']] }),
    order: () => ({ type: 'order', q_ta: 'வரிசைப்படுத்துக.', q_en: 'Put in order.', items: ['', '', ''] }),
    blank: () => ({ type: 'blank', q_ta: 'நிரப்புக.', q_en: 'Fill in the blanks.', text: '', showBank: true }),
    jigsaw: () => ({ type: 'jigsaw', q_ta: 'படத்தைச் சரிசெய்க.', q_en: 'Fix the picture.', img: '', size: 3 }),
    reflect: () => ({ type: 'reflect', q_ta: '', q_en: '' })
  };

  let book, sel = { sec: 0, st: 0, page: 0, tab: 'pages' };
  const story = () => book.sections[sel.sec]?.stories[sel.st];
  const getP = p => p.split('.').reduce((o, k) => o?.[k], book);
  const setP = (p, v) => { const ks = p.split('.'), last = ks.pop(); const o = ks.reduce((o, k) => o[k], book); o[last] = v; };
  const P = (...a) => a.join('.');
  const base = () => `sections.${sel.sec}.stories.${sel.st}`;

  /* ---------- images & audio ---------- */
  function readFile(f) { return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); }); }
  async function loadImage(f) {
    const url = await readFile(f);
    if (f.type === 'image/svg+xml' || f.type === 'image/gif') return url;
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const max = 1600, s = Math.min(1, max / Math.max(img.width, img.height));
    if (s === 1 && f.size < 500e3) return url;
    const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return f.type === 'image/png' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', .85);
  }
  function pick(accept) { return new Promise(res => { const i = $('#filePick'); i.value = ''; i.accept = accept; i.onchange = () => res(i.files[0]); i.click(); }); }

  /* ---------- sidebar ---------- */
  function renderSide() {
    const t = book.type;
    const sw = th => `<span class="sw" style="background:${th.vars.bg}"><i style="background:${th.vars.btn}"></i><i style="background:${th.vars.accent}"></i><i style="background:${th.vars.card.startsWith('rep') ? '#FFFEF8' : th.vars.card}"></i></span>`;
    const themeGrid = age => THEMES.filter(x => x.age === age).map(th => `<button class="theme ${book.theme === th.id ? 'on' : ''}" data-theme="${th.id}">${sw(th)}<span class="nm">${esc(th.name)}</span></button>`).join('');
    $('#side').innerHTML = `
      <div class="stack">
        <h3 class="label">Book</h3>
        <label class="field"><span>Title (Tamil)</span><input class="ta" data-path="title_ta" value="${esc(book.title_ta)}"></label>
        <label class="field en-field"><span>Title (English, optional)</span><input data-path="title_en" value="${esc(book.title_en)}"></label>
        <label class="field"><span>Subtitle / level</span><input class="ta" data-path="subtitle" value="${esc(book.subtitle)}"></label>
        <div class="field"><span>Cover picture</span>${drop('cover', book.cover, 'sm')}</div>
      </div>
      <div class="stack">
        <h3 class="label">Book language</h3>
        <div class="seg" role="group"><button data-lang="ta" class="${book.lang !== 'bi' ? 'on' : ''}">தமிழ் மட்டும்</button><button data-lang="bi" class="${book.lang === 'bi' ? 'on' : ''}">Tamil + English</button></div>
        <p class="help">${book.lang !== 'bi' ? 'All buttons, titles and messages in the e-book are in Tamil. English fields are hidden here.' : 'Readers get a தமிழ் / EN switch, and buttons show both languages.'}</p>
      </div>
      <div class="stack">
        <h3 class="label">Book type</h3>
        <div class="seg" role="group"><button data-type="single" class="${t === 'single' ? 'on' : ''}">One story</button><button data-type="collection" class="${t === 'collection' ? 'on' : ''}">Collection</button></div>
        <p class="help">${t === 'single' ? 'Cover → story pages → activities.' : 'Cover → contents page with sections → pick a story.'}</p>
      </div>
      <div class="stack">
        <h3 class="label">Theme</h3>
        <span class="help">Tamil &amp; Singapore</span><div class="themes">${themeGrid('tamil')}</div>
        <span class="help">Festive &amp; wedding</span><div class="themes">${themeGrid('festive')}</div>
        <span class="help">All ages</span><div class="themes">${themeGrid('all')}</div>
        <span class="help">Under 10</span><div class="themes">${themeGrid('kids')}</div>
        <span class="help">Teens 13+</span><div class="themes">${themeGrid('teens')}</div>
      </div>
      <div class="stack">
        <h3 class="label">Background animation</h3>
        <div class="anim-row">
          <label class="field"><span>Effect</span><select id="animSel" data-path="anim" data-rerender>${(() => { const th = THEMES.find(x => x.id === book.theme) || THEMES[0]; const def = th.cfg.anim || 'none'; return `<option value="theme" ${!book.anim || book.anim === 'theme' ? 'selected' : ''}>Theme default (${esc(EBAmbient.LIST[def])})</option>` + Object.entries(EBAmbient.LIST).map(([k, v]) => `<option value="${k}" ${book.anim === k ? 'selected' : ''}>${esc(v)}</option>`).join(''); })()}</select></label>
          <div class="seg" role="group" aria-label="Amount"><button data-dens="calm" class="${book.animDensity !== 'lively' ? 'on' : ''}">Calm</button><button data-dens="lively" class="${book.animDensity === 'lively' ? 'on' : ''}">Lively</button></div>
        </div>
        <p class="help">Animations pause for readers who turn on reduced motion in their device settings.</p>
      </div>
      <div class="stack">
        <h3 class="label">${t === 'single' ? 'Story' : 'Contents'} ${t === 'collection' ? `<button class="link" data-add-sec>+ Section</button>` : ''}</h3>
        <div class="tree">${book.sections.map((s, si) => (t === 'single' && si > 0) ? '' : `
          <div class="sec">
            ${t === 'collection' ? `<div class="sec-h"><span class="nm">${esc(s.title_ta)}<small>${s.stories.length}</small></span>
              <button class="mini" data-sec-edit="${si}" title="Edit section">✎</button>
              <button class="mini" data-sec-mv="${si}:-1" title="Move up">${I.up}</button><button class="mini" data-sec-mv="${si}:1" title="Move down">${I.down}</button>
              <button class="mini" data-sec-del="${si}" title="Delete section">${I.del}</button></div>` : ''}
            <div class="items">${s.stories.map((st, i) => (t === 'single' && i > 0) ? '' : `
              <div class="item ${sel.sec === si && sel.st === i && !sel.secEdit ? 'on' : ''}" role="button" tabindex="0" data-sel="${si}:${i}">
                <span class="k ${st.kind}">${st.kind}</span><span class="t">${esc(st.title_ta)}</span>
                ${t === 'collection' ? `<button class="mini" data-st-mv="${si}:${i}:-1" title="Move up">${I.up}</button><button class="mini" data-st-mv="${si}:${i}:1" title="Move down">${I.down}</button><button class="mini" data-st-del="${si}:${i}" title="Delete">${I.del}</button>` : ''}
              </div>`).join('')}
              ${t === 'collection' ? `<div class="add-row row"><button class="link" data-add-st="${si}:story">+ Story</button><button class="link" data-add-st="${si}:script">+ Script</button><button class="link" data-add-st="${si}:poem">+ Poem</button></div>` : ''}
            </div>
          </div>`).join('')}</div>
        ${t === 'single' && (book.sections.length > 1 || book.sections[0].stories.length > 1) ? '<p class="help">This book has more stories saved. Switch to Collection to use them.</p>' : ''}
      </div>`;
  }
  function drop(path, src, cls = '') {
    return `<div class="drop ${cls} ${src ? 'has' : ''}" tabindex="0" role="button" aria-label="Choose picture" data-img="${path}" style="${src ? `background-image:url('${src}')` : ''}">
      <div class="hint">${I.img}<b>Add picture</b><small>Click or drop an image</small></div>
      ${src ? `<button class="btn sm rm" data-img-rm="${path}">Remove</button>` : ''}</div>`;
  }

  /* ---------- main ---------- */
  function renderMain() {
    const m = $('#main');
    if (sel.secEdit != null) {
      const s = book.sections[sel.secEdit], b = `sections.${sel.secEdit}`;
      m.innerHTML = `<div class="card stack"><div class="crumb">Section</div>
        <div class="grid2"><label class="field"><span>Section title (Tamil)</span><input class="ta" data-path="${b}.title_ta" value="${esc(s.title_ta)}"></label>
        <label class="field en-field"><span>Section title (English)</span><input data-path="${b}.title_en" value="${esc(s.title_en)}"></label></div>
        <label class="field"><span>Short introduction shown on the contents page (optional)</span><textarea class="ta" data-path="${b}.intro">${esc(s.intro)}</textarea></label></div>`;
      return;
    }
    const st = story();
    if (!st) { m.innerHTML = `<div class="empty card"><b>No story selected</b><button class="btn primary" data-add-st="0:story">Add a story</button></div>`; return; }
    const b = base();
    const nGl = Object.keys(st.glossary || {}).length;
    m.innerHTML = `
      <div class="card stack">
        <div class="ed-head"><div><div class="crumb">${book.type === 'collection' ? esc(book.sections[sel.sec].title_ta) + ' · ' : ''}${KINDS[st.kind]}</div><h1>${esc(st.title_ta)}</h1></div>
          <button class="btn" data-cmd="preview-here">Preview this</button></div>
        <div class="grid2">
          <label class="field"><span>Title (Tamil)</span><input class="ta" data-path="${b}.title_ta" data-live="h1" value="${esc(st.title_ta)}"></label>
          <label class="field en-field"><span>Title (English, optional)</span><input data-path="${b}.title_en" value="${esc(st.title_en)}"></label>
          <label class="field"><span>Author / credit</span><input class="ta" data-path="${b}.author" value="${esc(st.author)}"></label>
          <div class="grid2">
            <label class="field"><span>Type</span><select data-path="${b}.kind" data-rerender>${Object.entries(KINDS).map(([k, v]) => `<option value="${k}" ${st.kind === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
            <label class="field"><span>Layout</span><select data-path="${b}.layout" data-rerender><option value="image" ${st.layout !== 'text' ? 'selected' : ''}>Picture + text</option><option value="text" ${st.layout === 'text' ? 'selected' : ''}>Text only</option></select></label>
          </div>
        </div>
      </div>
      <div class="tabs" role="tablist">
        <button data-tab="pages" class="${sel.tab === 'pages' ? 'on' : ''}">Pages <span class="cnt">${st.pages.length}</span></button>
        <button data-tab="activities" class="${sel.tab === 'activities' ? 'on' : ''}">Activities <span class="cnt">${st.activities.length}</span></button>
        <button data-tab="glossary" class="${sel.tab === 'glossary' ? 'on' : ''}">Word meanings <span class="cnt">${nGl}</span></button>
      </div>
      ${sel.tab === 'pages' ? pagesTab(st, b) : sel.tab === 'activities' ? actsTab(st, b) : glossTab(st)}`;
  }

  function pagesTab(st, b) {
    sel.page = Math.min(sel.page, st.pages.length - 1);
    const p = st.pages[sel.page], pb = `${b}.pages.${sel.page}`;
    const help = { story: 'Leave a blank line between paragraphs.', script: 'One line per speech, written as  Name: words.  Put stage directions in (brackets).', poem: 'One line per verse line. Leave a blank line between stanzas.' }[st.kind];
    return `
      <div class="strip">${st.pages.map((x, i) => `<button class="thumb ${i === sel.page ? 'on' : ''}" data-page="${i}"><span class="no">${i + 1}</span><div class="im" style="${x.img ? `background-image:url('${x.img}')` : ''}">${x.img ? '' : (st.layout === 'text' ? 'Text' : 'No picture')}</div><div class="tx">${esc((x.ta || '').slice(0, 40)) || '—'}</div></button>`).join('')}
        <button class="thumb add" data-add-page>${I.plus} Page</button></div>
      <div class="card stack">
        <div class="row" style="justify-content:space-between"><b>Page ${sel.page + 1} of ${st.pages.length}</b>
          <div class="row"><button class="btn sm" data-page-mv="-1">${I.up} Earlier</button><button class="btn sm" data-page-mv="1">${I.down} Later</button><button class="btn sm danger" data-page-del ${st.pages.length < 2 ? 'disabled' : ''}>${I.del} Delete page</button></div></div>
        <div class="page-ed" ${st.layout === 'text' ? 'style="grid-template-columns:1fr"' : ''}>
          ${st.layout === 'text' ? '' : `<div class="stack"><span class="help"><b>Left panel · picture</b></span>${drop(pb + '.img', p.img)}</div>`}
          <div class="stack">
            <span class="help"><b>Right panel · text</b> — ${help}</span>
            <label class="field"><span>Tamil text</span><textarea class="ta" rows="8" data-path="${pb}.ta" data-live="thumb">${esc(p.ta)}</textarea></label>
            <label class="field en-field"><span>English text (optional — readers get a language switch)</span><textarea rows="4" data-path="${pb}.en">${esc(p.en)}</textarea></label>
            <div class="field"><span>Narration audio (optional — without it, the device voice reads aloud)</span>
              <div class="audio-row">${p.audio ? `<audio controls src="${p.audio}"></audio><button class="btn sm danger" data-audio-rm="${pb}">Remove</button>` : `<button class="btn sm" data-audio="${pb}">Add audio (MP3)</button>`}</div></div>
          </div>
        </div>
      </div>
      <details class="card"><summary><b>Paste a whole ${st.kind} to make pages</b></summary>
        <div class="stack" style="margin-top:10px"><p class="help">Paste the full text. Put a line with three dashes <b>---</b> wherever a new page should start. This replaces the text on the existing pages and keeps their pictures.</p>
        <textarea class="ta" id="bulk" rows="8" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:10px"></textarea>
        <div class="row end"><button class="btn primary" data-bulk>Make pages</button></div></div></details>`;
  }

  function actsTab(st, b) {
    return `<div class="acts">${st.activities.map((a, i) => actCard(a, `${b}.activities.${i}`, i, st.activities.length)).join('') || '<p class="help">No activities yet. They appear after the last page of this story.</p>'}</div>
      <div class="card stack"><b>Add an activity</b><div class="add-acts">${Object.entries(ACTS).map(([k, [n, d]]) => `<button data-add-act="${k}"><b>${n}</b><small>${d}</small></button>`).join('')}</div></div>`;
  }
  function actCard(a, ab, i, n) {
    const q = `<div class="grid2"><label class="field"><span>Question / instruction (Tamil)</span><input class="ta" data-path="${ab}.q_ta" value="${esc(a.q_ta)}"></label>
      <label class="field en-field"><span>English (optional)</span><input data-path="${ab}.q_en" value="${esc(a.q_en)}"></label></div>`;
    let body = '';
    if (a.type === 'mcq') body = `<div class="field"><span>Options — tick the correct one</span><div class="list-ed">${a.options.map((o, k) => `<div class="li"><input type="radio" name="ans-${ab}" data-ans="${ab}" value="${k}" ${+a.answer === k ? 'checked' : ''} aria-label="Correct answer"><input data-path="${ab}.options.${k}" value="${esc(o)}" placeholder="Option ${k + 1}"><button class="mini" data-li-del="${ab}.options:${k}">${I.del}</button></div>`).join('')}</div><button class="link" data-li-add="${ab}.options">+ Option</button></div>`;
    if (a.type === 'match') body = `<div class="field"><span>Pairs (left ↔ right)</span><div class="list-ed">${a.pairs.map((p, k) => `<div class="li"><input data-path="${ab}.pairs.${k}.0" value="${esc(p[0])}" placeholder="Word"><input data-path="${ab}.pairs.${k}.1" value="${esc(p[1])}" placeholder="Meaning"><button class="mini" data-li-del="${ab}.pairs:${k}">${I.del}</button></div>`).join('')}</div><div class="row"><button class="link" data-li-add="${ab}.pairs">+ Pair</button><button class="link" data-from-gloss="${ab}">Fill from word meanings</button></div></div>`;
    if (a.type === 'order') body = `<div class="field"><span>Items in the correct order (readers see them shuffled)</span><div class="list-ed">${a.items.map((o, k) => `<div class="li"><b style="width:20px">${k + 1}</b><input data-path="${ab}.items.${k}" value="${esc(o)}"><button class="mini" data-li-del="${ab}.items:${k}">${I.del}</button></div>`).join('')}</div><button class="link" data-li-add="${ab}.items">+ Item</button></div>`;
    if (a.type === 'blank') body = `<label class="field"><span>Passage — put each answer in [square brackets]</span><textarea class="ta" rows="4" data-path="${ab}.text" placeholder="சிறுதுளிகள் விழுந்தன [மண்ணில்].">${esc(a.text)}</textarea></label>
      <label class="row"><input type="checkbox" data-check="${ab}.showBank" ${a.showBank !== false ? 'checked' : ''}> Show the answer words as hints</label>`;
    if (a.type === 'jigsaw') body = `<div class="grid2"><div class="field"><span>Puzzle picture (empty = first page picture)</span>${drop(ab + '.img', a.img, 'sm')}</div>
      <label class="field"><span>Grid size</span><select data-path="${ab}.size" data-num>${[2, 3, 4, 5].map(k => `<option value="${k}" ${+a.size === k ? 'selected' : ''}>${k} × ${k}</option>`).join('')}</select></label></div>`;
    return `<div class="act-card"><header><b>${i + 1}. ${ACTS[a.type][0]}</b>
      <button class="mini" data-act-mv="${i}:-1" title="Move up">${I.up}</button><button class="mini" data-act-mv="${i}:1" title="Move down">${I.down}</button><button class="mini" data-act-del="${i}" title="Delete">${I.del}</button></header>
      <div class="body">${q}${body}</div></div>`;
  }

  function glossTab(st) {
    const g = Object.entries(st.glossary || {});
    return `<div class="card stack"><p class="help">Readers tap these words in the text to see the meaning. Words also show in the word bank on teen themes. A word matches any form that starts with it (பணப்பை matches பணப்பையைக்).</p>
      <div class="list-ed" id="gloss">${g.map(([w, m]) => `<div class="li"><input class="ta" value="${esc(w)}" placeholder="Tamil word"><input value="${esc(m)}" placeholder="Meaning"><button class="mini" data-gl-del>${I.del}</button></div>`).join('')}
      <div class="li"><input class="ta" placeholder="Tamil word"><input placeholder="Meaning"><span class="mini"></span></div></div>
      <p class="help">A new empty row appears when you fill the last one.</p></div>`;
  }
  function readGloss() {
    const g = {}; $('#gloss').querySelectorAll('.li').forEach(li => { const [w, m] = li.querySelectorAll('input'); if (w.value.trim()) g[w.value.trim()] = m.value.trim(); });
    story().glossary = g; save();
  }

  function renderAll() { document.body.classList.toggle('ta-only', book.lang !== 'bi'); renderSide(); renderMain(); }

  /* ---------- events ---------- */
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.closest('#gloss')) { readGloss(); const rows = $('#gloss').querySelectorAll('.li'); const last = rows[rows.length - 1]; if ([...last.querySelectorAll('input')].some(i => i.value)) { last.querySelector('.mini').outerHTML = `<button class="mini" data-gl-del>${I.del}</button>`; last.insertAdjacentHTML('afterend', `<div class="li"><input class="ta" placeholder="Tamil word"><input placeholder="Meaning"><span class="mini"></span></div>`); } return; }
    if (t.dataset.path && t.tagName !== 'SELECT') {
      setP(t.dataset.path, t.value); save();
      if (t.dataset.live === 'h1') { $('#main h1').textContent = t.value; renderSide(); }
      if (t.dataset.live === 'thumb') { const th = $('.thumb.on .tx'); if (th) th.textContent = t.value.slice(0, 40) || '—'; }
      if (/^(title_ta|sections\.\d+\.title_ta)$/.test(t.dataset.path)) renderSide();
    }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.tagName === 'SELECT' && t.dataset.path) { setP(t.dataset.path, t.dataset.num != null ? +t.value : t.value); save(); if (t.dataset.rerender != null) renderAll(); }
    if (t.dataset.ans) { setP(t.dataset.ans + '.answer', +t.value); save(); }
    if (t.dataset.check) { setP(t.dataset.check, t.checked); save(); }
  });

  document.addEventListener('click', async e => {
    const t = e.target.closest('button,[data-sel],[data-img]'); if (!t) { $('#fileMenu').hidden = true; return; }
    const d = t.dataset;
    if (t.id !== 'fileBtn' && !t.closest('#fileMenu')) $('#fileMenu').hidden = true;
    if (t.id === 'fileBtn') { $('#fileMenu').hidden = !$('#fileMenu').hidden; return; }

    if (d.imgRm) { e.stopPropagation(); setP(d.imgRm, ''); save(); renderAll(); return; }
    if (d.img != null && !e.target.closest('.rm')) { const f = await pick('image/*'); if (f) { setP(d.img, await loadImage(f)); save(); renderAll(); } return; }
    if (d.sel) { const [s, i] = d.sel.split(':').map(Number); if (e.target.closest('.mini')) return; sel = { sec: s, st: i, page: 0, tab: sel.tab }; renderAll(); return; }
    if (d.type) { book.type = d.type; if (d.type === 'single') sel = { sec: 0, st: 0, page: 0, tab: sel.tab }; save(); renderAll(); return; }
    if (d.theme) { book.theme = d.theme; save(); renderSide(); return; }
    if (d.lang) { book.lang = d.lang; save(); renderAll(); return; }
    if (d.dens) { book.animDensity = d.dens; save(); renderSide(); return; }
    if (d.tab) { sel.tab = d.tab; renderMain(); return; }
    if (d.page) { sel.page = +d.page; renderMain(); return; }

    const st = story();
    if (d.addPage != null) { st.pages.splice(sel.page + 1, 0, newPage()); sel.page++; save(); renderAll(); }
    if (d.pageDel != null && st.pages.length > 1) { if (!confirmInline(t, 'Delete page?')) return; st.pages.splice(sel.page, 1); save(); renderAll(); }
    if (d.pageMv) { const j = sel.page + +d.pageMv; if (j >= 0 && j < st.pages.length) { [st.pages[sel.page], st.pages[j]] = [st.pages[j], st.pages[sel.page]]; sel.page = j; save(); renderMain(); } }
    if (d.audio) { const f = await pick('audio/*'); if (f) { if (f.size > 8e6) toast('That audio file is over 8 MB. Please compress it to MP3 first.'); else { setP(d.audio + '.audio', await readFile(f)); save(); renderMain(); } } }
    if (d.audioRm) { setP(d.audioRm + '.audio', ''); save(); renderMain(); }
    if (d.bulk != null) {
      const txt = $('#bulk').value.trim(); if (!txt) return;
      const parts = txt.split(/\n\s*-{3,}\s*\n/).map(s => s.trim()).filter(Boolean);
      parts.forEach((p, i) => { if (!st.pages[i]) st.pages.push(newPage()); st.pages[i].ta = p; });
      sel.page = 0; save(); renderAll(); toast(`${parts.length} page${parts.length > 1 ? 's' : ''} filled`);
    }

    // sections & stories
    if (d.addSec != null) { book.sections.push(newSection()); sel = { sec: book.sections.length - 1, st: 0, page: 0, tab: 'pages' }; save(); renderAll(); }
    if (d.secEdit) { sel.secEdit = +d.secEdit; renderAll(); delete sel.secEdit; return; }
    if (d.secMv) { const [i, k] = d.secMv.split(':').map(Number), j = i + k; if (j >= 0 && j < book.sections.length) { [book.sections[i], book.sections[j]] = [book.sections[j], book.sections[i]]; sel.sec = j; save(); renderAll(); } }
    if (d.secDel) { if (book.sections.length < 2) return toast('A book needs at least one section.'); if (!confirmInline(t, 'Delete section?')) return; book.sections.splice(+d.secDel, 1); sel = { sec: 0, st: 0, page: 0, tab: 'pages' }; save(); renderAll(); }
    if (d.addSt) { const [s, kind] = d.addSt.split(':'); book.sections[+s].stories.push(newStory(kind)); sel = { sec: +s, st: book.sections[+s].stories.length - 1, page: 0, tab: 'pages' }; save(); renderAll(); }
    if (d.stMv) { const [s, i, k] = d.stMv.split(':').map(Number), arr = book.sections[s].stories, j = i + k; if (j >= 0 && j < arr.length) { [arr[i], arr[j]] = [arr[j], arr[i]]; sel = { ...sel, sec: s, st: j }; save(); renderAll(); } }
    if (d.stDel) { const [s, i] = d.stDel.split(':').map(Number); if (book.sections[s].stories.length < 2) return toast('A section needs at least one item.'); if (!confirmInline(t, 'Delete?')) return; book.sections[s].stories.splice(i, 1); sel = { sec: s, st: 0, page: 0, tab: 'pages' }; save(); renderAll(); }

    // activities
    if (d.addAct) { st.activities.push(ACT_NEW[d.addAct]()); save(); renderMain(); $('#main').scrollTop = 1e6; }
    if (d.actDel) { if (!confirmInline(t, '?')) return; st.activities.splice(+d.actDel, 1); save(); renderMain(); }
    if (d.actMv) { const [i, k] = d.actMv.split(':').map(Number), j = i + k, a = st.activities; if (j >= 0 && j < a.length) { [a[i], a[j]] = [a[j], a[i]]; save(); renderMain(); } }
    if (d.liAdd) { const arr = getP(d.liAdd); arr.push(d.liAdd.endsWith('pairs') ? ['', ''] : ''); save(); renderMain(); }
    if (d.liDel) { const [p, k] = d.liDel.split(':'); const arr = getP(p); if (arr.length > 2) { arr.splice(+k, 1); const a = getP(p.replace(/\.options$/, '')); if (p.endsWith('options') && a.answer >= arr.length) a.answer = 0; save(); renderMain(); } else toast('Keep at least two.'); }
    if (d.fromGloss) { const g = Object.entries(st.glossary || {}); if (!g.length) return toast('Add word meanings first.'); setP(d.fromGloss + '.pairs', g.slice(0, 8).map(([w, m]) => [w, m])); save(); renderMain(); }
    if (d.glDel != null) { t.closest('.li').remove(); readGloss(); }

    // commands
    const cmd = d.cmd;
    if (cmd === 'preview' || cmd === 'preview-here') openPreview(cmd === 'preview-here');
    if (cmd === 'close-preview') { $('#preview').hidden = true; $('#frame').srcdoc = ''; }
    if (cmd === 'export') { const kb = new Blob([JSON.stringify(book)]).size / 1024 * .78 + 90; $('#exportSize').textContent = `Estimated size: about ${kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : Math.round(kb) + ' KB'}`; syncExportOpts(); $('#exportDlg').hidden = false; }
    if (cmd === 'close-export') $('#exportDlg').hidden = true;
    if (cmd === 'do-export') {
      const kind = document.querySelector('[name=fmt]:checked').value;
      t.disabled = true; const old = t.textContent; t.textContent = 'Preparing…';
      try {
        if (kind === 'html') download(new Blob([await EBCompose.html(book)], { type: 'text/html' }), slug() + '.html');
        else {
          const pass = $('#pass').value.trim();
          const blob = await EBCompose.zip(book, { kind, rule: $('#rule').value, pass: pass === '' ? null : Math.max(0, Math.min(100, +pass)) });
          download(blob, slug() + (kind === 'web' ? '-web' : kind === 'scorm2004' ? '-scorm2004' : '-scorm12') + '.zip');
        }
        $('#exportDlg').hidden = true; toast('Download started');
      } catch (err) { toast(err.message || 'Export failed'); }
      t.disabled = false; t.textContent = old;
    }
    if (cmd === 'save') download(new Blob([JSON.stringify(book, null, 1)], { type: 'application/json' }), slug() + '.ebook.json');
    if (cmd === 'open') { const f = await pick('.json,application/json'); if (f) { try { const b = JSON.parse(await f.text()); if (!b.sections) throw 0; book = b; sel = { sec: 0, st: 0, page: 0, tab: 'pages' }; save(); renderAll(); toast('Project opened'); } catch { toast('That file is not an Ebook Builder project.'); } } }
    if (cmd === 'new') { if (!confirmInline(t, 'Replace current book? Click again')) return; book = newBook(); sel = { sec: 0, st: 0, page: 0, tab: 'pages' }; save(); renderAll(); }
    if (cmd === 'sample') { if (!confirmInline(t, 'Replace current book? Click again')) return; book = await fetch('samples/nop-sample.json').then(r => r.json()); sel = { sec: 0, st: 0, page: 0, tab: 'pages' }; save(); renderAll(); }
  });

  // drag & drop images
  document.addEventListener('dragover', e => { const z = e.target.closest('[data-img]'); if (z) { e.preventDefault(); z.classList.add('over'); } });
  document.addEventListener('dragleave', e => { const z = e.target.closest('[data-img]'); if (z) z.classList.remove('over'); });
  document.addEventListener('drop', async e => { const z = e.target.closest('[data-img]'); if (!z) return; e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) { setP(z.dataset.img, await loadImage(f)); save(); renderAll(); } });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-sel],[data-img]')) { e.preventDefault(); e.target.click(); } if (e.key === 'Escape') { $('#preview').hidden = true; $('#exportDlg').hidden = true; } });

  function syncExportOpts() { const k = document.querySelector('[name=fmt]:checked').value; $('#scormOpts').hidden = !k.startsWith('scorm'); }
  document.addEventListener('change', e => { if (e.target.name === 'fmt') syncExportOpts(); });
  // preview
  async function openPreview(here) {
    const start = here ? { view: 'story', sec: book.type === 'collection' ? sel.sec : 0, i: book.type === 'collection' ? sel.st : 0, page: sel.tab === 'activities' ? story().pages.length : sel.page } : null;
    $('#frame').srcdoc = await EBCompose.html(book, { start });
    $('#preview').hidden = false;
  }
  $('#devices').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('#devices').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); $('#frame').style.width = b.dataset.w; });

  // helpers
  function confirmInline(btn, msg) { if (btn.dataset.armed) { delete btn.dataset.armed; return true; } btn.dataset.armed = 1; const old = btn.innerHTML; btn.innerHTML = msg; setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.innerHTML = old; } }, 2500); return false; }
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
  function slug() { return (book.title_en || 'ebook').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ebook'; }
  function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }

  // boot
  (async () => {
    try { book = await DB.get('book'); } catch { book = null; }
    if (!book) { try { book = await fetch('samples/nop-sample.json').then(r => r.json()); } catch { book = newBook(); } }
    renderAll();
  })();
})();
