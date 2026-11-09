/* Builds a complete, standalone e-book HTML file from book data + a theme. */
window.EBCompose = (function () {
  let cache = null;
  async function sources() {
    if (cache) return cache;
    const get = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.text(); });
    const [base, extra, reader] = await Promise.all([get('css/reader-base.css'), get('css/reader-extra.css'), get('js/reader.js')]);
    return (cache = { base, extra, reader });
  }
  const safeJSON = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const themeCSS = t => ':root{' + Object.entries(t.vars).map(([k, v]) => `--${k}:${v}`).join(';') + '}\n' + t.css;

  async function html(book, { start = null } = {}) {
    const src = await sources();
    const theme = (window.EB_THEMES || []).find(t => t.id === book.theme) || window.EB_THEMES[0];
    const title = (book.title_ta || 'E-book') + (book.title_en ? ' · ' + book.title_en : '');
    return `<!doctype html><html lang="ta"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title.replace(/</g, '&lt;')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${theme.fonts}&family=Noto+Sans+Tamil:wght@400;600;700&display=swap" rel="stylesheet">
<style>${themeCSS(theme)}\n${src.base}\n${src.extra}</style></head><body>
<script>window.BOOK=${safeJSON(book)};window.THEME=${safeJSON(theme)};window.START=${safeJSON(start)};</script>
<script>${src.reader.replace(/<\/script/gi, '<\\/script')}</script>
</body></html>`;
  }
  return { html };
})();
