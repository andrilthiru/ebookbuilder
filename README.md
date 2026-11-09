# Ebook Builder · மின்னூல் உருவாக்கி

Build bilingual (Tamil + English) HTML5 e-books in the browser — single stories or collections with a contents page — and export them as one self-contained HTML file.

**Live:** https://andrilthiru.github.io/ebookbuilder/ (after GitHub Pages is switched on)

## Features
- **Book types:** one story, or a collection with sections (e.g. Budding Writers / Artistes / Poets) and a contents page.
- **Content types:** story (paragraphs), script (`Name: line`, `(stage directions)`), poem (lines and stanzas).
- **Layout:** picture panel on the left, text on the right (or text only). Stacks on phones.
- **6 themes:** Toy Blocks, Jungle Safari, Under the Sea (under 10) · Sketch Journal, Comic Panels, Neon Night (teens 13+).
- **Reader tools:** Tamil/English switch, tap-a-word meanings, word bank, read-aloud (your MP3 or device voice), text size A-/A+, full screen, swipe and arrow keys.
- **Activities after each story:** multiple choice, match pairs, put in order, fill in blanks, picture jigsaw, reflection.
- **Saving:** autosaves in the browser. Use File → Save project file to back up or move to another computer.
- **Export:** one HTML file with all pictures and audio embedded.

## Turn on GitHub Pages
Settings → Pages → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → Save.

## Files
- `index.html`, `css/builder.css`, `js/builder.js` — the editor
- `js/reader.js`, `css/reader-base.css`, `css/reader-extra.css` — the e-book runtime (used by preview and export)
- `js/themes.js` — theme definitions
- `js/compose.js` — builds the exported HTML
- `samples/nop-sample.json` — sample collection
