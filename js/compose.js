/* Builds exported e-books: a single HTML file, or a SCORM 1.2 / 2004 zip package. */
window.EBCompose = (function () {
  let cache = null;
  async function sources() {
    if (cache) return cache;
    const get = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.text(); });
    const [base, extra, reader, ambient] = await Promise.all([get('css/reader-base.css'), get('css/reader-extra.css'), get('js/reader.js'), get('js/ambient.js')]);
    return (cache = { base, extra, reader, ambient });
  }
  const safeJSON = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const themeCSS = t => ':root{' + Object.entries(t.vars).map(([k, v]) => `--${k}:${v}`).join(';') + '}\n' + t.css;
  const xmlEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

  async function html(book, { start = null, scorm = null } = {}) {
    const src = await sources();
    const theme = (window.EB_THEMES || []).find(t => t.id === book.theme) || window.EB_THEMES[0];
    const title = (book.title_ta || 'E-book') + (book.title_en ? ' · ' + book.title_en : '');
    return `<!doctype html><html lang="ta"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title.replace(/</g, '&lt;')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${theme.fonts}&family=Noto+Sans+Tamil:wght@400;600;700&display=swap" rel="stylesheet">
<style>${src.base}\n${src.extra}\n${themeCSS(theme)}</style></head><body>
<script>window.BOOK=${safeJSON(book)};window.THEME=${safeJSON(theme)};window.START=${safeJSON(start)};window.SCORM=${safeJSON(scorm)};</script>
<script>${src.ambient.replace(/<\/script/gi, '<\\/script')}</script>
<script>${src.reader.replace(/<\/script/gi, '<\\/script')}</script>
</body></html>`;
  }

  /* Move embedded pictures/audio out of the JSON into media/ files. */
  function extractMedia(book) {
    const files = [], seen = new Map();
    const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac' };
    const walk = o => {
      if (Array.isArray(o)) return o.map(walk);
      if (o && typeof o === 'object') { const r = {}; for (const k in o) r[k] = walk(o[k]); return r; }
      if (typeof o === 'string' && o.startsWith('data:')) {
        if (seen.has(o)) return seen.get(o);
        const m = o.match(/^data:([^;,]+)(;base64)?,(.*)$/s); if (!m) return o;
        const name = `media/${String(files.length + 1).padStart(3, '0')}.${EXT[m[1]] || 'bin'}`;
        files.push({ name, data: m[3], base64: !!m[2] });
        seen.set(o, name); return name;
      }
      return o;
    };
    return { book: walk(book), files };
  }

  function manifest(version, title, files) {
    const id = 'EBOOK-' + Date.now();
    const fileTags = ['index.html', ...files].map(f => `      <file href="${xmlEsc(f)}"/>`).join('\n');
    if (version === '2004') return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>2004 3rd Edition</schemaversion></metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>${xmlEsc(title)}</title>
      <item identifier="ITEM-1" identifierref="RES-1"><title>${xmlEsc(title)}</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormType="sco" href="index.html">
${fileTags}
    </resource>
  </resources>
</manifest>`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>${xmlEsc(title)}</title>
      <item identifier="ITEM-1" identifierref="RES-1" isvisible="true"><title>${xmlEsc(title)}</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
${fileTags}
    </resource>
  </resources>
</manifest>`;
  }

  /* kind: 'scorm12' | 'scorm2004' | 'web'. Returns a Blob (zip). */
  async function zip(book, { kind = 'scorm12', rule = 'pages', pass = null } = {}) {
    if (!window.JSZip) throw new Error('The zip library did not load. Check your internet connection and reload the page.');
    const { book: b2, files } = extractMedia(book);
    const scorm = kind === 'web' ? null : { version: kind === 'scorm2004' ? '2004' : '1.2', rule, pass: pass === '' ? null : pass };
    const z = new JSZip();
    z.file('index.html', await html(b2, { scorm }));
    files.forEach(f => z.file(f.name, f.data, f.base64 ? { base64: true } : {}));
    if (scorm) z.file('imsmanifest.xml', manifest(scorm.version, book.title_ta + (book.title_en ? ' · ' + book.title_en : ''), files.map(f => f.name)));
    return z.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  }
  return { html, zip };
})();
