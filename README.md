# Ebook Builder · மின்னூல் உருவாக்கி

Build bilingual (Tamil + English) HTML5 e-books in the browser — single stories or collections with a contents page — and export them as one self-contained HTML file.

**Live:** https://andrilthiru.github.io/ebookbuilder/ (after GitHub Pages is switched on)

## Features
- **Book types:** one story, or a collection with sections (e.g. Budding Writers / Artistes / Poets) and a contents page.
- **Content types:** story (paragraphs), script (`Name: line`, `(stage directions)`), poem (lines and stanzas).
- **Layout:** picture panel on the left, text on the right (or text only). Stacks on phones.
- **20 themes:** Zari Marquee, Maavilai Thoranam, Jasmine & Marigold, Kalyana Pandal (festive & wedding) · Tamil Collage, Singai Tamil, Kanchi Silk, Village Evening, Kolam (Tamil & Singapore) · Starry Night, Paper Cut, Watercolour Garden, Chalkboard, Rainy Day (all ages) · Toy Blocks, Jungle Safari, Under the Sea (under 10) · Sketch Journal, Comic Panels, Neon Night (teens 13+).
- **Book language:** Tamil only (default — every button and message in Tamil) or Tamil + English with a language switch.
- **Background animations:** bubbles, fireflies, leaves, petals, twinkling stars, sparkles, rain, snow, chalk dust, balloons, clouds, jasmine flowers, flying kites, birds — calm or lively. Turned off for readers who choose reduced motion.
- **Reader tools:** Tamil/English switch, tap-a-word meanings, word bank, read-aloud (your MP3 or device voice), text size A-/A+, full screen, swipe and arrow keys.
- **Activities after each story:** multiple choice, match pairs, put in order, fill in blanks, picture jigsaw, reflection.
- **Saving:** autosaves in the browser. Use File → Save project file to back up or move to another computer.
- **Export:** SCORM 1.2 zip, SCORM 2004 zip, website zip, or a single HTML file.
- **SCORM tracking:** completion (all pages viewed, or pages + activities), score from the auto-marked activities, optional pass mark, bookmark/resume, session time.

## Turn on GitHub Pages
Settings → Pages → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → Save.

## Files
- `index.html`, `css/builder.css`, `js/builder.js` — the editor
- `js/reader.js`, `css/reader-base.css`, `css/reader-extra.css` — the e-book runtime (used by preview and export)
- `js/themes.js` — theme definitions
- `js/ambient.js` — background animations
- `js/compose.js` — builds exports (HTML, website zip, SCORM zips)
- `samples/nop-sample.json` — sample collection

## Artwork
- Collage stickers (palm, jasmine, filter coffee, banana leaf, kite, letters, mango, pot, parai, coconut, HDB block, shophouse, orchid, kopi, prata, MRT, street sign), the moving zari border, mango-leaf thoranam, banana trees and jasmine/marigold garlands are original SVG drawings in `js/themes.js`.

## Third-party artwork
- Kolam theme ornament: Pngtree item 15396985 "colorful deepavali kolam patterns", Premium licence (Personal Commercial) held by Andril Thirumaran. File: `assets/kolam-pngtree-15396985.webp` (also embedded in `js/themes.js`).
