/* Gentle background animations for the e-book reader.
   EBAmbient.start(type, {colors, density}) draws on one canvas behind the book. */
window.EBAmbient = (function () {
  const LIST = {
    none: 'None',
    bubbles: 'Rising bubbles',
    fireflies: 'Fireflies',
    leaves: 'Falling leaves',
    petals: 'Drifting petals',
    stars: 'Twinkling stars',
    sparkles: 'Sparkles',
    rain: 'Light rain',
    snow: 'Snowfall',
    dust: 'Chalk dust',
    balloons: 'Floating balloons',
    clouds: 'Drifting clouds',
    jasmine: 'Jasmine flowers',
    kites: 'Flying kites',
    birds: 'Birds in flight'
  };
  const COLORS = {
    bubbles: ['rgba(255,255,255,.75)'], fireflies: ['#FFF3A0', '#C8FF9E'], leaves: ['#5DA34F', '#8BBE4A', '#E2A53A', '#C9692C'],
    petals: ['#F7B6C5', '#F2A0B4', '#FFD3DC'], stars: ['#FFFFFF', '#FFF3C4'], sparkles: ['#FFD86B', '#FFFFFF'],
    rain: ['rgba(255,255,255,.55)'], snow: ['#FFFFFF'], dust: ['rgba(255,255,255,.55)'],
    balloons: ['#FF6B57', '#FFD23F', '#3EA6E8', '#7AC943', '#9B5DE5'], clouds: ['rgba(255,255,255,.85)'], jasmine: ['#FFFFFF'], kites: ['#E53935', '#FDD835', '#1E88E5', '#8E24AA', '#43A047'], birds: ['rgba(40,30,30,.55)']
  };
  let raf = 0, cvs = null, stopFn = null;
  const R = (a, b) => a + Math.random() * (b - a);
  const pickC = cs => cs[Math.floor(Math.random() * cs.length)];

  function start(type, opt = {}) {
    stop();
    if (!type || type === 'none' || !LIST[type]) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    cvs = document.createElement('canvas');
    cvs.className = 'ambient';
    cvs.setAttribute('aria-hidden', 'true');
    cvs.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';
    document.body.insertBefore(cvs, document.querySelector('.app') || document.body.firstChild);
    const x = cvs.getContext('2d');
    let W, H, dpr;
    const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cvs.width = W * dpr; cvs.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    const cols = (opt.colors && opt.colors.length) ? opt.colors : COLORS[type];
    const dens = opt.density === 'lively' ? 1.8 : 1;
    const area = Math.min(1.6, (W * H) / (1280 * 800));
    const N = { bubbles: 22, fireflies: 26, leaves: 14, petals: 18, stars: 90, sparkles: 22, rain: 110, snow: 70, dust: 45, balloons: 7, clouds: 5, jasmine: 16, kites: 5, birds: 9 }[type];
    const n = Math.max(3, Math.round(N * dens * area));
    const make = (init) => {
      const p = { c: pickC(cols), x: R(0, W), y: init ? R(0, H) : 0, t: R(0, 1000), a: 1 };
      switch (type) {
        case 'bubbles': p.r = R(3, 14); p.vy = -R(.3, .9); p.y = init ? R(0, H) : H + 20; break;
        case 'fireflies': p.r = R(1.5, 3); p.vx = R(-.3, .3); p.vy = R(-.3, .3); p.y = R(H * .3, H); break;
        case 'leaves': case 'petals': p.r = type === 'leaves' ? R(7, 13) : R(5, 9); p.vy = R(.4, 1); p.rot = R(0, 6.28); p.vr = R(-.03, .03); p.sw = R(.6, 1.6); p.y = init ? R(-H, H) : -20; break;
        case 'stars': p.r = R(.5, 1.8); p.y = R(0, H * .9); p.sp = R(.01, .04); break;
        case 'sparkles': p.r = R(3, 7); p.life = 0; p.max = R(80, 160); p.y = R(0, H); break;
        case 'rain': p.l = R(10, 22); p.vy = R(7, 12); p.y = init ? R(0, H) : -30; break;
        case 'snow': case 'dust': p.r = type === 'snow' ? R(1.2, 3.5) : R(.8, 2); p.vy = type === 'snow' ? R(.3, 1) : R(.05, .25); p.vx = R(-.2, .2); p.y = init ? R(0, H) : -10; break;
        case 'balloons': p.r = R(16, 26); p.vy = -R(.25, .55); p.y = init ? R(H * .3, H + 200) : H + 60; break;
        case 'jasmine': p.r = R(5, 9); p.vy = R(.35, .8); p.rot = R(0, 6.28); p.vr = R(-.02, .02); p.sw = R(.5, 1.3); p.y = init ? R(-H, H) : -20; break;
        case 'kites': p.r = R(16, 26); p.vx = R(.15, .4); p.y = R(H * .08, H * .55); p.x = init ? R(-60, W) : -80; p.ph = R(0, 6.28); break;
        case 'birds': p.r = R(6, 11); p.vx = R(.5, 1.1); p.y = R(H * .05, H * .4); p.x = init ? R(-100, W) : -40; p.ph = R(0, 6.28); break;
        case 'clouds': p.r = R(40, 80); p.vx = R(.08, .25); p.y = R(20, H * .45); p.x = init ? R(-100, W) : -200; break;
      }
      return p;
    };
    const ps = Array.from({ length: n }, () => make(true));
    let shoot = null;

    function drawLeaf(p) { x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.fillStyle = p.c; x.beginPath();
      if (type === 'leaves') { x.moveTo(0, -p.r); x.quadraticCurveTo(p.r * .8, 0, 0, p.r); x.quadraticCurveTo(-p.r * .8, 0, 0, -p.r); x.fill(); x.strokeStyle = 'rgba(0,0,0,.15)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, -p.r); x.lineTo(0, p.r); x.stroke(); }
      else { x.ellipse(0, 0, p.r, p.r * .6, 0, 0, 6.28); x.fill(); }
      x.restore(); }
    function star4(cx, cy, r, c, a) { x.save(); x.globalAlpha = a; x.fillStyle = c; x.beginPath(); x.moveTo(cx, cy - r); x.quadraticCurveTo(cx, cy, cx + r, cy); x.quadraticCurveTo(cx, cy, cx, cy + r); x.quadraticCurveTo(cx, cy, cx - r, cy); x.quadraticCurveTo(cx, cy, cx, cy - r); x.fill(); x.restore(); }

    function frame() {
      x.clearRect(0, 0, W, H);
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]; p.t++;
        switch (type) {
          case 'bubbles': p.y += p.vy; p.x += Math.sin(p.t / 40) * .3;
            x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.28); x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1; x.stroke();
            x.fillStyle = 'rgba(255,255,255,.15)'; x.fill(); x.beginPath(); x.arc(p.x - p.r * .35, p.y - p.r * .35, p.r * .25, 0, 6.28); x.fillStyle = 'rgba(255,255,255,.8)'; x.fill();
            if (p.y < -20) ps[i] = make(false); break;
          case 'fireflies': p.x += p.vx + Math.sin(p.t / 50) * .3; p.y += p.vy + Math.cos(p.t / 60) * .3;
            if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10; if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
            { const a = .35 + .65 * Math.abs(Math.sin(p.t / 45)); const g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6); g.addColorStop(0, p.c); g.addColorStop(1, 'transparent');
              x.globalAlpha = a; x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, p.r * 6, 0, 6.28); x.fill(); x.globalAlpha = 1; } break;
          case 'leaves': case 'petals': p.y += p.vy; p.x += Math.sin(p.t / 30) * p.sw * .6; p.rot += p.vr; drawLeaf(p); if (p.y > H + 20) ps[i] = make(false); break;
          case 'stars': { const a = .3 + .7 * Math.abs(Math.sin(p.t * p.sp)); x.globalAlpha = a; x.fillStyle = p.c; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.28); x.fill(); x.globalAlpha = 1; } break;
          case 'sparkles': p.life++; { const k = p.life / p.max, a = Math.sin(k * Math.PI); star4(p.x, p.y, p.r * (.5 + a * .5), p.c, a * .9); } if (p.life > p.max) ps[i] = make(true); break;
          case 'rain': p.y += p.vy; p.x += p.vy * .15; x.strokeStyle = p.c; x.lineWidth = 1.2; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x + p.l * .15, p.y + p.l); x.stroke(); if (p.y > H) ps[i] = make(false); break;
          case 'snow': case 'dust': p.y += p.vy; p.x += p.vx + Math.sin(p.t / 60) * .2; x.fillStyle = p.c; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.28); x.fill(); if (p.y > H + 10 || (type === 'dust' && p.t > 2000)) ps[i] = make(type === 'dust'); break;
          case 'balloons': p.y += p.vy; p.x += Math.sin(p.t / 70) * .3;
            x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; x.beginPath(); x.moveTo(p.x, p.y + p.r * 1.2); x.quadraticCurveTo(p.x + 6, p.y + p.r * 2, p.x, p.y + p.r * 3); x.stroke();
            x.fillStyle = p.c; x.globalAlpha = .85; x.beginPath(); x.ellipse(p.x, p.y, p.r, p.r * 1.2, 0, 0, 6.28); x.fill(); x.globalAlpha = 1;
            x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.ellipse(p.x - p.r * .35, p.y - p.r * .4, p.r * .2, p.r * .32, -.5, 0, 6.28); x.fill();
            if (p.y < -p.r * 4) ps[i] = make(false); break;
          case 'jasmine': p.y += p.vy; p.x += Math.sin(p.t / 34) * p.sw * .5; p.rot += p.vr;
            x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.fillStyle = '#FFFFFF'; x.strokeStyle = 'rgba(180,170,140,.6)'; x.lineWidth = .8;
            for (let k = 0; k < 5; k++) { x.rotate(1.2566); x.beginPath(); x.ellipse(0, -p.r * .7, p.r * .38, p.r * .7, 0, 0, 6.28); x.fill(); x.stroke(); }
            x.fillStyle = '#F2C94C'; x.beginPath(); x.arc(0, 0, p.r * .22, 0, 6.28); x.fill(); x.restore();
            if (p.y > H + 20) ps[i] = make(false); break;
          case 'kites': { p.x += p.vx; const yy = p.y + Math.sin(p.t / 90 + p.ph) * 18, tilt = Math.sin(p.t / 70 + p.ph) * .25, r = p.r;
            x.save(); x.translate(p.x, yy); x.rotate(tilt);
            x.strokeStyle = 'rgba(80,60,40,.45)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, r * 1.3);
            for (let k = 1; k <= 6; k++) x.lineTo(Math.sin(p.t / 20 + k) * 6, r * 1.3 + k * 9); x.stroke();
            x.fillStyle = p.c; x.beginPath(); x.moveTo(0, -r); x.lineTo(r * .8, 0); x.lineTo(0, r * 1.3); x.lineTo(-r * .8, 0); x.closePath(); x.fill();
            x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.moveTo(0, -r); x.lineTo(r * .8, 0); x.lineTo(0, 0); x.closePath(); x.fill();
            x.restore(); if (p.x > W + 80) ps[i] = make(false); } break;
          case 'birds': { p.x += p.vx; const f = Math.sin(p.t / 6 + p.ph) * p.r * .6, yy = p.y + Math.sin(p.t / 80 + p.ph) * 8;
            x.strokeStyle = p.c; x.lineWidth = 1.8; x.lineCap = 'round'; x.beginPath(); x.moveTo(p.x - p.r, yy - f); x.quadraticCurveTo(p.x - p.r * .4, yy - p.r * .2, p.x, yy); x.quadraticCurveTo(p.x + p.r * .4, yy - p.r * .2, p.x + p.r, yy - f); x.stroke();
            if (p.x > W + 40) ps[i] = make(false); } break;
          case 'clouds': p.x += p.vx; x.fillStyle = p.c; x.beginPath();
            x.arc(p.x, p.y, p.r * .6, 0, 6.28); x.arc(p.x + p.r * .55, p.y - p.r * .25, p.r * .7, 0, 6.28); x.arc(p.x + p.r * 1.15, p.y, p.r * .55, 0, 6.28); x.fill();
            if (p.x > W + 200) ps[i] = make(false); break;
        }
      }
      if (type === 'stars') {
        if (!shoot && Math.random() < .002) shoot = { x: R(W * .2, W), y: R(0, H * .3), l: 0 };
        if (shoot) { shoot.l += 1; const tx = shoot.x - shoot.l * 8, ty = shoot.y + shoot.l * 4; const g = x.createLinearGradient(tx, ty, tx + 80, ty - 40); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'transparent');
          x.strokeStyle = g; x.lineWidth = 2; x.beginPath(); x.moveTo(tx, ty); x.lineTo(tx + 80, ty - 40); x.stroke(); if (shoot.l > 40) shoot = null; }
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    }
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden && !reduce) raf = requestAnimationFrame(frame); };
    document.addEventListener('visibilitychange', vis);
    frame(); // with reduced motion this paints one still frame
    stopFn = () => { cancelAnimationFrame(raf); removeEventListener('resize', size); document.removeEventListener('visibilitychange', vis); cvs.remove(); };
  }
  function stop() { if (stopFn) stopFn(); stopFn = null; }
  return { start, stop, LIST };
})();
