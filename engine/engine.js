/* =====================================================================
 * step-animation engine v1
 * 分步动画学习网页的引擎。build.mjs 会把它整段内联进生成的网页。
 * 课程文件（*.lesson.js）只需要：
 *   const LESSON = {title:'…'};
 *   SC.push({n:'节名', build(){…; return S}, steps:[{c:'代码', p:'说明', run(S){…}}]});
 * API 说明见 reference/api.md。
 * ===================================================================== */
const CO = '#D85A30', BL = '#378ADD', GR = '#888780', RD = '#E24B4A', GN = '#1D9E75';
const $ = s => document.querySelector(s);
const SC = [];
let stage = null, timers = [], pending = 0, INST = false, speed = 1, frames = {}, marks = {};

/* ---------- 计时：INST（瞬间重放）时直接执行，否则按速度延迟 ---------- */
function later(fn, ms) {
  pending++;
  const id = setTimeout(() => { pending--; fn(); }, ms);
  timers.push(id);
  return id;
}
function T(fn, ms) { if (INST) { fn(); return; } later(fn, (ms || 0) / speed); }
function clearT() { timers.forEach(clearTimeout); timers = []; pending = 0; }
/* rAF 在后台标签页里不触发，所以加一个 setTimeout 兜底 */
function nextFrame(cb) { let done = false; const f = () => { if (!done) { done = true; cb(); } }; requestAnimationFrame(f); setTimeout(f, 60); }

/* ---------- DOM 小工具 ---------- */
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function row(...n) { const d = el('div', 'row'); n.forEach(x => d.appendChild(x.w || x)); return d; }
function flow(...n) { const d = el('div', 'flow'); n.forEach((x, i) => { if (i) d.appendChild(el('div', 'arrow', '→')); d.appendChild(x.w || x); }); return d; }
function col(...n) { const d = el('div', 'col'); n.forEach(x => d.appendChild(x.w || x)); return d; }
function pop(e) { if (!INST) { e.classList.add('pop'); setTimeout(() => e.classList.remove('pop'), 280); } }
const arr = x => Array.isArray(x) ? x : (x && x.length !== undefined && !(x instanceof Element) ? [...x] : [x]);

/* ---------- 数字格子 ---------- */
/* 状态 st：''  'img'(按亮度上色)  'imgh'(上色但不显示数字)  'pos'(绿)  'neg'(红)  'hl'(黄)  'dim'(变淡)  'done'(灰掉)  'empty'(虚线空格) */
function setCell(d, v, st) {
  d.className = 'cell'; d.style.background = ''; d.style.color = '';
  const blank = v === null || v === undefined || st === 'imgh' || st === 'empty';
  d.textContent = blank ? '' : v;
  if (st === 'img' || st === 'imgh') { d.style.background = `rgb(${v},${v},${v})`; d.style.color = v > 120 ? '#2C2C2A' : '#F1EFE8'; if (v > 200) d.classList.add('bright'); }
  else if (st) d.classList.add(st);
  else if (blank) d.classList.add('empty');
  pop(d);
}
/* grid(二维数组, {s:格子边长, label, idx:显示列号, img:按亮度上色, hide:不显示数字, st:(r,c,v)=>状态, below:下方给指针留几行}) */
function grid(m, o) {
  o = o || {}; if (!Array.isArray(m[0])) m = [m];
  const s = o.s || 52, w = el('div', 'gw');
  if (o.label) w.appendChild(el('div', 'lab', o.label));
  const g = el('div', 'grid'); g.style.gridTemplateColumns = `repeat(${m[0].length},${s}px)`;
  if (o.idx) m[0].forEach((_, c) => g.appendChild(el('div', 'idx', c)));
  const vals = m.map(r => r.slice());
  const cells = m.map(r_ => r_.map(() => { const d = el('div', 'cell'); d.style.width = d.style.height = s + 'px'; d.style.fontSize = (o.fs || Math.round(Math.min(17, s * 0.33))) + 'px'; g.appendChild(d); return d; }));
  w.appendChild(g);
  if (o.below) w.style.paddingBottom = (o.below * 22) + 'px';
  const G = {
    w, cells, vals,
    set(r, c, v, st) { vals[r][c] = v; setCell(cells[r][c], v, st); changed(); },
    get(r, c) { return vals[r][c]; },
    c(r, c) { if (c === undefined) { c = r; r = 0; } return cells[r][c]; },
    all() { return cells.flat(); },
    rng(r0, c0, r1, c1) { const a = []; for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) a.push(cells[r][c]); return a; },
    /* 一维数组的快捷写法：cols(2,5) = 第 0 行第 2~5 格 */
    cols(c0, c1) { return this.rng(0, c0, 0, c1); },
  };
  const def = (r, c, v) => o.st ? o.st(r, c, v) : (v === null ? 'empty' : (o.img ? (o.hide ? 'imgh' : 'img') : ''));
  const wasInst = INST; INST = true;
  m.forEach((r_, r) => r_.forEach((v, c) => G.set(r, c, v, def(r, c, v))));
  INST = wasInst;
  return G;
}

/* ---------- 结果框 ---------- */
function valBox(label, o) {
  o = o || {}; const w = el('div', 'gw'); w.appendChild(el('div', 'lab', label)); const v = el('div', 'val'); w.appendChild(v);
  if (o.w) v.style.minWidth = o.w + 'px'; if (o.fs) v.style.fontSize = o.fs + 'px'; if (o.h) v.style.height = o.h + 'px';
  return { w, el: v, set(t) { v.textContent = t; v.style.outline = 'none'; pop(v); changed(); }, clear() { v.textContent = ''; v.style.outline = ''; changed(); } };
}

/* ---------- 变量面板：vars(['lo','hi','mid'], '变量') ---------- */
function vars(names, label) {
  const w = el('div', 'gw'); if (label) w.appendChild(el('div', 'lab', label));
  const box = el('div', 'vars'); w.appendChild(box); const rows = {};
  names.forEach(n => { const r = el('div', 'vr', `<span class="vk">${n} =</span><span class="vv"></span>`); box.appendChild(r); rows[n] = r; });
  return {
    w,
    set(n, v) { const r = rows[n]; r.querySelector('.vv').textContent = v; if (!INST) { r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 700); } changed(); },
    el(n) { return rows[n].querySelector('.vv'); },
    row(n) { return rows[n]; },
  };
}

/* ---------- 表格：table([[表头...],[...],...], {label}) ---------- */
function table(rows, o) {
  o = o || {}; const w = el('div', 'gw'); if (o.label) w.appendChild(el('div', 'lab', o.label));
  const t = el('table', 'tbl'); w.appendChild(t);
  const trs = [];
  const add = (r, head, hl) => { const tr = el('tr'); if (hl) tr.className = 'hlrow'; r.forEach(v => tr.appendChild(el(head ? 'th' : 'td', '', v))); t.appendChild(tr); trs.push(tr);
    if (!INST && !head) { tr.style.opacity = 0; tr.offsetWidth; tr.style.transition = 'opacity .5s'; tr.style.opacity = 1; } return tr; };
  rows.forEach((r, i) => add(r, i === 0 && o.head !== false, false));
  return { w, el: t, trs, add(r, hl) { const tr = add(r, false, hl); changed(); return tr; }, cell(r, c) { return trs[r].children[c]; } };
}

/* ---------- 框：橙框 = 正在读，蓝框 = 正在写；同名的框会平滑移动 ---------- */
/* 量位置时忽略「弹一下」的放大效果，不然框会跟着变大 */
function rawRect(e) {
  if (!e.classList || !e.classList.contains('pop')) return e.getBoundingClientRect();
  e.style.transition = 'none'; e.classList.remove('pop'); const r = e.getBoundingClientRect();
  e.classList.add('pop'); e.offsetWidth; e.style.transition = ''; return r;
}
function rectOf(cells) {
  const sr = stage.getBoundingClientRect(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  arr(cells).forEach(c => { const r = rawRect(c); x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); });
  return { x: x0 - sr.left, y: y0 - sr.top, w: x1 - x0, h: y1 - y0 };
}
/* 框应该在的位置（相对画布，并且不伸出画布，被裁掉就看不见边了） */
function frameBox(cells, pad) {
  const R = rectOf(cells), sw = stage.clientWidth, sh = stage.clientHeight;
  const x0 = Math.max(1, R.x - pad), y0 = Math.max(1, R.y - pad), x1 = Math.min(sw - 1, R.x + R.w + pad), y1 = Math.min(sh - 1, R.y + R.h + pad);
  return { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
}
function placeFrame(f, instant) {
  const b = frameBox(f.__cells, f.__pad);
  if (instant) f.style.transition = 'none'; else { f.offsetWidth; f.style.transition = ''; }
  Object.assign(f.style, { left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px' });
}
function frame(name, color, cells, pad) {
  cells = arr(cells).filter(Boolean); if (!cells.length) { noFrame(name); return; }
  pad = pad == null ? 5 : pad; let f = frames[name]; const fresh = !f;
  if (fresh) { f = el('div', 'frame'); stage.appendChild(f); frames[name] = f; }
  f.__cells = cells; f.__pad = pad; f.__on = true;
  placeFrame(f, INST || fresh);
  Object.assign(f.style, { borderColor: color, opacity: 1 });
  if (fresh && !INST) { f.style.opacity = 0; f.offsetWidth; f.style.transition = ''; f.style.opacity = 1; }
}
function noFrame(...names) { (names.length ? names : Object.keys(frames)).forEach(n => { if (frames[n]) { frames[n].style.opacity = 0; frames[n].__on = false; } }); }
/* 布局变了（结果框变宽、表格加了一行……）以后，让框和指针重新对准它们的格子 */
function relayout() {
  if (!stage) return;
  Object.values(frames).forEach(f => { if (f.__on) placeFrame(f, INST); });
  if (Object.values(marks).some(m => m.on)) layoutMarks();
}
/* 动画模式下改了内容就马上重新对准；瞬间重放时由 go() 在最后统一对准一次 */
function changed() { if (!INST) relayout(); }

/* ---------- 指针标签：mark('lo', 格子, 'lo', BL)；同一格子上的多个标签会自动上下错开 ---------- */
function mark(name, cell, text, color, side) {
  let m = marks[name]; const fresh = !m;
  if (fresh) { const e = el('div', 'mk'); stage.appendChild(e); m = marks[name] = { e, order: Object.keys(marks).length }; }
  m.cell = cell; m.side = side || 'below'; m.on = true;
  m.e.textContent = text == null ? name : text; m.e.style.background = color || BL;
  layoutMarks(fresh ? name : null);
}
function noMark(...names) { (names.length ? names : Object.keys(marks)).forEach(n => { const m = marks[n]; if (m) { m.on = false; m.e.style.opacity = 0; } }); layoutMarks(); }
function layoutMarks(freshName) {
  const sr = stage.getBoundingClientRect(), groups = {};
  Object.entries(marks).filter(([, m]) => m.on).sort((a, b) => a[1].order - b[1].order).forEach(([n, m]) => {
    const key = m.side + '|' + (m.cell.__mkid || (m.cell.__mkid = Math.random().toString(36).slice(2)));
    const k = (groups[key] = (groups[key] || 0) + 1) - 1;
    const r = rawRect(m.cell), e = m.e;
    if (INST || n === freshName) e.style.transition = 'none'; else { e.offsetWidth; e.style.transition = ''; }
    const x = r.left - sr.left + r.width / 2;
    const y = m.side === 'above' ? r.top - sr.top - 22 - k * 21 : r.bottom - sr.top + 4 + k * 21;
    Object.assign(e.style, { left: x + 'px', top: y + 'px', opacity: 1 });
  });
}

/* ---------- 飞行数字：从一个格子飞到另一个格子，到了再执行 then ---------- */
function fly(from, to, text, then, color, delay) {
  if (INST) { then && then(); return; }
  T(() => {
    const sr = stage.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const f = el('div', 'fly'); f.textContent = text; if (color) f.style.background = color;
    f.style.left = a.left - sr.left + a.width / 2 + 'px'; f.style.top = a.top - sr.top + a.height / 2 + 'px'; stage.appendChild(f);
    f.offsetWidth; const d = 750 / speed;
    f.style.transition = `transform ${d}ms cubic-bezier(.5,0,.25,1)`;
    f.style.transform = `translate(-50%,-50%) translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px,${b.top + b.height / 2 - (a.top + a.height / 2)}px)`;
    later(() => { f.remove(); then && then(); }, d);
  }, delay || 0);
}
/* 两个格子交换（冒泡排序之类）：两个数字交叉飞过去，落地后执行 then */
function swapFly(a, b, ta, tb, then, color) { fly(a, b, ta, null, color); fly(b, a, tb, then, color || BL); }

/* ---------- SVG 折线图 ---------- */
/* 曲线上每隔几个像素取一个点（缓存），用来判断文字是不是压在线上 */
function pathPts(p) { if (p.__pts) return p.__pts; const L = p.getTotalLength(), pts = []; for (let d = 0; d <= L; d += 3) { const q = p.getPointAtLength(d); pts.push([q.x, q.y]); } return (p.__pts = pts); }
function hitsPath(b, p, m) { m = m || 2; return pathPts(p).some(([x, y]) => x > b.x - m && x < b.x + b.width + m && y > b.y - m && y < b.y + b.height + m); }
const NS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const a in attrs) e.setAttribute(a, attrs[a]); if (parent) parent.appendChild(e); return e; }
/* chart({w,h, xmin,xmax,xt:[横轴刻度], ymin,ymax,yt:[纵轴刻度], xl:'横轴名', yl:'纵轴名', label:'图标题', fmt:v=>刻度文字}) */
function chart(o) {
  const W = o.w || 880, H = o.h || 250, fmt = o.fmt || (v => v);
  const xmin = o.xmin ?? 0, xmax = o.xmax ?? 1, ymin = o.ymin ?? 0, ymax = o.ymax ?? 1;
  const yw = Math.max(...(o.yt || [ymax]).map(v => String(fmt(v)).length)) * 7 + 14;
  const L = Math.max(40, yw), R = 18, TP = 30, BT = 42;
  const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  const x = t => L + (t - xmin) / (xmax - xmin) * (W - L - R), y = v => H - BT - (v - ymin) / (ymax - ymin) * (H - BT - TP);
  (o.yt || []).forEach(v => { sv('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: 'var(--bd)' }, svg); const t = sv('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--mu)', class: 'tick' }, svg); t.textContent = fmt(v); });
  (o.xt || []).forEach(v => { const t = sv('text', { x: x(v), y: H - BT + 16, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--mu)', class: 'tick' }, svg); t.textContent = v; });
  if (o.xl) { const t = sv('text', { x: (L + W - R) / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--mu)', class: 'axis' }, svg); t.textContent = o.xl; }
  if (o.yl) { const t = sv('text', { x: L - 6, y: 14, 'text-anchor': 'start', 'font-size': 12, fill: 'var(--mu)', class: 'axis' }, svg); t.textContent = o.yl; }
  const w = el('div', 'gw chart'); if (o.label) w.appendChild(el('div', 'lab', o.label)); w.appendChild(svg);
  const plot = svg.lastChild; /* 曲线插在网格线之后 */
  const C = {
    w, svg, x, y, W, H, L, R, TP, BT,
    /* 折线：xs、ys 两个等长数组；不在 INST 时线条会逐渐画出来 */
    line(xs, ys, color, width, dur) {
      const d = xs.map((t, i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(ys[i]).toFixed(1)}`).join('');
      const p = sv('path', { d, fill: 'none', stroke: color || GR, 'stroke-width': width || 2, 'stroke-linejoin': 'round' }, svg);
      if (!INST) { const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; p.getBoundingClientRect();
        p.style.transition = `stroke-dashoffset ${(dur || 2500) / speed}ms linear`; p.style.strokeDashoffset = 0; }
      return p;
    },
    vline(t, color, dash) { return sv('line', { x1: x(t), x2: x(t), y1: TP, y2: H - BT, stroke: color || RD, 'stroke-dasharray': dash || '5 4', 'stroke-width': 1, opacity: .6 }, svg); },
    hline(v, color, dash) { return sv('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: color || RD, 'stroke-dasharray': dash || '5 4', 'stroke-width': 1, opacity: .6 }, svg); },
    dot(t, v, color, r) { return sv('circle', { cx: x(t), cy: y(v), r: r || 4, fill: color || CO }, svg); },
    ring(t, v, color) { return sv('circle', { cx: x(t), cy: y(v), r: 9, fill: 'none', stroke: color || CO, 'stroke-width': 2.5 }, svg); },
    band(v0, v1, color) { const r = sv('rect', { x: L, width: W - L - R, y: y(v1), height: y(v0) - y(v1), fill: color || BL, opacity: .15 }); svg.insertBefore(r, plot ? plot.nextSibling : svg.firstChild); return r; },
    guide(t, v, color) { sv('line', { x1: x(t), x2: x(t), y1: y(v), y2: H - BT, stroke: color || CO, 'stroke-dasharray': '3 3' }, svg); sv('line', { x1: L, x2: x(t), y1: y(v), y2: y(v), stroke: color || CO, 'stroke-dasharray': '3 3' }, svg); },
    /* 文字标注：默认会自动上下挪，躲开已有的文字，并且不超出图表 */
    text(t, v, s, color, anchor, size, avoid) {
      const e = sv('text', { x: x(t), y: y(v), 'text-anchor': anchor || 'middle', 'font-size': size || 12, fill: color || 'var(--tx)', 'font-weight': 600, class: 'lbl' }, svg);
      e.textContent = s; if (avoid !== false) later_(() => place(e)); return e;
    },
    /* 图例：legend([['不遮水印','#9a9890'],['遮掉水印',BL]])，放在图的右上角 */
    legend(items) {
      later_(() => {
        let cx = W - R; const yy = 14;
        [...items].reverse().forEach(([name, color]) => {
          const t = sv('text', { x: cx, y: yy, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--tx)', class: 'lbl' }, svg); t.textContent = name;
          const tw = t.getBBox().width;
          sv('line', { x1: cx - tw - 22, x2: cx - tw - 6, y1: yy - 4, y2: yy - 4, stroke: color, 'stroke-width': 3 }, svg);
          cx -= tw + 36;
        });
      });
    },
  };
  /* 需要量文字大小的操作，要等 SVG 挂到页面上才能做：build() 里调用的先排队，go() 挂好以后统一执行 */
  function later_(fn) { if (svg.isConnected) fn(); else (svg.__pending = svg.__pending || []).push(fn); }
  /* 躲开已有文字：依次尝试 原位、上、下、更上、更下……；再把超出左右边界的拉回来 */
  function place(e) {
    if (!svg.isConnected) return;
    const y0 = +e.getAttribute('y'), x0 = +e.getAttribute('x');
    const others = [...svg.querySelectorAll('text,circle')].filter(t => t !== e).map(t => t.getBBox());
    const paths = [...svg.querySelectorAll('path')];
    const hit = b => others.some(o => b.x < o.x + o.width && b.x + b.width > o.x && b.y < o.y + o.height && b.y + b.height > o.y) || paths.some(p => hitsPath(b, p));
    let b = e.getBBox();
    if (b.x < 2) e.setAttribute('x', x0 + (2 - b.x)); else if (b.x + b.width > W - 2) e.setAttribute('x', x0 - (b.x + b.width - W + 2));
    const step = b.height + 2;
    for (const k of [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6, -8, 8, -10, 10]) {
      const ny = y0 + k * step; if (ny - b.height < 0 || ny > H - BT) continue;
      e.setAttribute('y', ny); b = e.getBBox(); if (!hit(b)) return;
    }
    e.setAttribute('y', y0);
  }
  return C;
}

/* ---------- 代码区：step.c 可以是字符串，也可以是行号（配合 scene.code 显示整段代码并高亮当前行） ---------- */
function showCode(sc, st) {
  const box = $('#code'); if (st.c == null) { box.textContent = ''; return; }
  if (sc.code && (typeof st.c === 'number' || Array.isArray(st.c))) {
    const hl = arr(st.c); box.innerHTML = '';
    sc.code.split('\n').forEach((ln, i) => { const d = el('span', 'ln' + (hl.includes(i + 1) ? ' cur' : '')); d.textContent = ln || ' '; box.appendChild(d); });
  } else box.textContent = st.c;
}

/* ---------- 播放控制 ---------- */
let si = 0, k = 0, playing = true, auto = null, goTok = 0;
function tabs() { const t = $('#tabs'); t.innerHTML = ''; SC.forEach((s, i) => { const b = el('button', i == si ? 'on' : '', s.n); b.onclick = () => { go(i, 0); }; t.appendChild(b); }); }
/* go：先瞬间重放本节前面所有步骤（INST），再带动画播放当前这一步。返回 Promise，这一步 run 完就 resolve。 */
function go(i, kk, anim) {
  anim = anim !== false; clearT(); clearTimeout(auto);
  if (!SC.length) { stage.innerHTML = '<div class="lab">没有任何内容：课程文件可能有语法错误（按 F12 看控制台）。</div>'; return Promise.resolve(false); }
  i = Math.max(0, Math.min(i, SC.length - 1));
  if (!SC[i].steps || !SC[i].steps.length) { si = i; k = 0; stage.innerHTML = '<div class="lab">这一节还没有步骤。</div>'; tabs(); return Promise.resolve(false); }
  kk = Math.max(0, Math.min(kk, SC[i].steps.length - 1));
  si = i; k = kk; const sc = SC[i]; stage.innerHTML = ''; frames = {}; marks = {};
  stage.classList.add('inst'); /* 重放期间关掉 CSS 过渡，前面步骤的颜色/透明度直接到位，不会每翻一步都重新淡入 */
  INST = true; const S = sc.build(); INST = false; const tok = ++goTok;
  tabs();
  const st = sc.steps[kk], cap = st.p == null ? '' : String(st.p);
  return new Promise(res => nextFrame(() => {
    if (tok !== goTok) return res(false);
    try {
      /* 先把代码和说明放好再量位置：说明变长可能让页面出现滚动条，宽度会变 */
      showCode(sc, st); $('#cap').innerHTML = cap;
      $('#cnt').textContent = `${sc.n}：第 ${kk + 1} / ${sc.steps.length} 步`;
      const total = SC.reduce((a, s) => a + (s.steps || []).length, 0), done = SC.slice(0, i).reduce((a, s) => a + (s.steps || []).length, 0) + kk + 1;
      $('#prog').style.width = (100 * done / total) + '%';
      /* build 里画的图表标注/图例，等 SVG 挂到页面上以后再量大小、躲重叠 */
      stage.querySelectorAll('svg').forEach(v => (v.__pending || []).splice(0).forEach(fn => fn()));
      INST = true; for (let j = 0; j < kk; j++) sc.steps[j].run(S);
      relayout();
      stage.offsetWidth; stage.classList.remove('inst');
      INST = !anim; sc.steps[kk].run(S);
      if (INST) relayout();
    } catch (e) { __errs.push(String(e && e.stack || e)); console.error(e); }
    finally { INST = false; stage.classList.remove('inst'); }
    /* 停留时间按说明文字长短算，留足阅读时间；step.wait 给长动画额外加时间 */
    const plain = cap.replace(/<[^>]+>/g, '');
    if (playing) auto = setTimeout(next, (4000 + plain.length * 70 + (+st.wait || 0)) / speed);
    res(true);
  }));
}
function next() { const sc = SC[si]; if (!sc) return; if (k < (sc.steps || []).length - 1) go(si, k + 1); else if (si < SC.length - 1) go(si + 1, 0); else { playing = false; upd(); } }
function prev() { if (k > 0) go(si, k - 1); else if (si > 0) go(si - 1, (SC[si - 1].steps || []).length - 1); }
function upd() { $('#play').textContent = playing ? '⏸ 暂停' : '▶ 播放'; }

function boot() {
  const L = (typeof LESSON !== 'undefined' && LESSON) || {};
  document.title = L.title || document.title;
  const wrap = el('div', 'wrap');
  wrap.innerHTML = `<h1></h1><div id="tabs"></div><div id="stage"></div><div class="prog"><i id="prog"></i></div><div id="code"></div><div id="cap"></div>
<div class="ctl"><button id="play">⏸ 暂停</button><button id="prev">← 上一步</button><button id="next">下一步 →</button><button id="again">↺ 这一节重看</button>
<label>速度 <select id="speed"><option value="0.6">慢</option><option value="1" selected>正常</option><option value="1.6">快</option></select></label><span id="cnt"></span></div>
<div class="hint">橙框 = 正在读的格子，蓝框 = 正在写的格子。键盘 ← → 翻步，空格暂停。</div>`;
  wrap.querySelector('h1').textContent = L.title || '';
  document.body.appendChild(wrap); stage = $('#stage');
  $('#play').onclick = () => { playing = !playing; upd(); clearTimeout(auto); if (!playing) return;
    const atEnd = si === SC.length - 1 && k >= (SC[si].steps || []).length - 1; if (atEnd) go(0, 0); else next(); };
  $('#next').onclick = () => { playing = false; upd(); next(); };
  $('#prev').onclick = () => { playing = false; upd(); prev(); };
  $('#again').onclick = () => go(si, 0);
  $('#speed').onchange = e => { speed = +e.target.value; };
  document.addEventListener('keydown', e => { if (e.target.tagName === 'SELECT') return; if (e.key == 'ArrowRight') $('#next').click(); else if (e.key == 'ArrowLeft') $('#prev').click(); else if (e.key == ' ') { e.preventDefault(); $('#play').click(); } });
  let lastW = innerWidth; /* 只有宽度变了才重排（手机滚动时地址栏伸缩只改高度） */
  window.addEventListener('resize', () => { if (CHECKING || innerWidth === lastW) return; lastW = innerWidth; go(si, k, false); });
  if (/[?#&]check\b/.test(location.search + location.hash)) { playing = false; upd(); runCheck(); }
  else go(0, 0);
}

/* =====================================================================
 * 自检：网址后面加 ?check 打开（例如 file:///…/lesson.html?check）
 * 每一步做两遍：
 *   1. 瞬间模式跑到这一步 → 查：标注互相重叠、超出画布/图表、文字撑出格子、说明或代码为空
 *   2. 带动画（8 倍速）跑这一步，等所有计时器跑完 → 查：动画回调里的报错、
 *      动画结束后的画面和「瞬间重放」不一致（会导致上一步/下一步时画面不对）
 * 结果：页面顶部出现报告；window.__CHECK__ = {ok, steps, problems:[…]}
 * ===================================================================== */
let CHECKING = false;
const __errs = [];
window.addEventListener('error', e => __errs.push(String(e.message || e)));
window.addEventListener('unhandledrejection', e => __errs.push('Promise: ' + String(e.reason)));
function visible(e) {
  for (let n = e; n && n !== document.body; n = n.parentElement || n.parentNode) {
    if (!(n instanceof Element)) break; const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false;
  }
  const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0;
}
function desc(e) { const t = (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24); return `<${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''}>「${t}」`; }
function inter(a, b, tol) { return Math.min(a.right, b.right) - Math.max(a.left, b.left) > tol && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > tol; }
function layoutProblems() {
  const P = [], sr = stage.getBoundingClientRect();
  /* 1. 东西超出画布（画布 overflow:hidden，超出部分会被裁掉看不见） */
  const outs = [];
  stage.querySelectorAll('*').forEach(e => {
    if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') return;
    if (outs.some(o => o.contains(e))) return; /* 只报最外层那个，里面的不重复报 */
    if (!visible(e)) return; const r = e.getBoundingClientRect();
    const d = [r.left < sr.left - 1 && '左', r.right > sr.right + 1 && '右', r.top < sr.top - 1 && '上', r.bottom > sr.bottom + 1 && '下'].filter(Boolean);
    if (d.length) { outs.push(e); P.push(['超出画布', desc(e) + ' 从' + d.join('、') + '边伸出去了']); }
  });
  /* 2. 文字标注之间重叠 */
  const labs = [...stage.querySelectorAll('.lab,.mk,.val,.vars .vr,.idx,.cell,.tbl,.arrow,svg text')].filter(e => visible(e) && (e.textContent || '').trim());
  for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) {
    const a = labs[i], b = labs[j]; if (a.contains(b) || b.contains(a)) continue;
    if (inter(a.getBoundingClientRect(), b.getBoundingClientRect(), 1)) P.push(['标注重叠', desc(a) + ' 和 ' + desc(b)]);
  }
  /* 3. SVG 里的文字超出图表 */
  stage.querySelectorAll('svg').forEach(s => { const R = s.getBoundingClientRect(); s.querySelectorAll('text').forEach(t => { if (!visible(t)) return; const r = t.getBoundingClientRect();
    if (r.left < R.left - 1 || r.right > R.right + 1 || r.top < R.top - 1 || r.bottom > R.bottom + 1) P.push(['超出图表', desc(t)]); }); });
  /* 3b. 图表文字压住圆点/圆圈 */
  stage.querySelectorAll('svg').forEach(s => { const cs = [...s.querySelectorAll('circle')].filter(visible);
    s.querySelectorAll('text').forEach(t => { if (!visible(t)) return; const r = t.getBoundingClientRect();
      cs.forEach(c => { if (inter(r, c.getBoundingClientRect(), 1)) P.push(['标注压住圆点', desc(t)]); }); }); });
  /* 3c. 图表文字压在曲线上 */
  stage.querySelectorAll('svg').forEach(s => { const ps = [...s.querySelectorAll('path')].filter(visible);
    s.querySelectorAll('text').forEach(t => { if (!visible(t)) return; const b = t.getBBox(); if (ps.some(p => hitsPath(b, p, 0))) P.push(['标注压线', desc(t)]); }); });
  /* 3d. 框和指针要对准它们的格子 */
  Object.entries(frames).forEach(([n, f]) => { if (!f.__on) return; const b = frameBox(f.__cells, f.__pad);
    if (['left', 'top', 'width', 'height'].some(p => Math.abs(parseFloat(f.style[p]) - b[p]) > 2)) P.push(['框没对准', `框 '${n}' 不在它要框的格子上`]); });
  Object.entries(marks).forEach(([n, m]) => { if (!m.on) return; const r = rawRect(m.cell);
    if (Math.abs(parseFloat(m.e.style.left) - (r.left - sr.left + r.width / 2)) > 2) P.push(['框没对准', `指针 '${n}' 没有对准它的格子`]); });
  /* 4. 文字撑出格子/结果框 */
  stage.querySelectorAll('.cell,.val').forEach(e => { if (visible(e) && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)) P.push(['文字撑出格子', desc(e)]); });
  return P;
}
function signature() {
  const t = stage.innerText.replace(/\s+/g, ' ');
  const f = Object.entries(frames).map(([n, e]) => n + ':' + (+e.style.opacity ? [e.style.left, e.style.top, e.style.width, e.style.height].join(',') : 'off')).join(';');
  const m = Object.entries(marks).map(([n, o]) => n + ':' + (o.on ? o.e.textContent + '@' + o.e.style.left + ',' + o.e.style.top : 'off')).join(';');
  const s = [...stage.querySelectorAll('svg')].map(v => v.querySelectorAll('*').length).join(',');
  const c = [...stage.querySelectorAll('.cell')].map(e => e.className.replace(' pop', '')).join(',');
  return { t, f, m, s, c };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function runCheck() {
  CHECKING = true; playing = false; upd();
  const problems = [], add = (si_, k_, kind, msg) => problems.push({ scene: SC[si_].n, step: k_ + 1, kind, msg });
  /* 自检开始前就有的报错（多半是课程文件本身出错） */
  __errs.splice(0).forEach(m => problems.push({ scene: '(加载)', step: 0, kind: '报错', msg: '课程脚本加载时出错：' + m }));
  if (!SC.length) problems.push({ scene: '(加载)', step: 0, kind: '缺内容', msg: '没有任何一节：SC 是空的（课程文件可能有语法错误，或者忘了 SC.push）' });
  SC.forEach(sc => { if (!sc.steps || !sc.steps.length) problems.push({ scene: sc.n, step: 0, kind: '缺内容', msg: '这一节没有任何步骤（steps 是空的）' }); });
  let steps = 0;
  for (let i = 0; i < SC.length; i++) for (let kk = 0; kk < (SC[i].steps || []).length; kk++) {
    steps++; __errs.length = 0;
    /* 第 1 遍：瞬间模式 */
    try { await go(i, kk, false); } catch (e) { add(i, kk, '报错', String(e && e.stack || e)); continue; }
    await sleep(30);
    layoutProblems().forEach(([kind, msg]) => add(i, kk, kind, msg));
    const st = SC[i].steps[kk];
    if (typeof st.p !== 'string' || !st.p.trim()) add(i, kk, '缺内容', '这一步没有说明文字 p');
    if (st.c == null || st.c === '') add(i, kk, '缺内容', '这一步没有代码行 c');
    const s1 = signature();
    __errs.splice(0).forEach(m => add(i, kk, '报错', m));
    /* 第 2 遍：带动画，8 倍速 */
    speed = 8;
    try { await go(i, kk, true); } catch (e) { add(i, kk, '报错', '动画模式：' + String(e && e.stack || e)); speed = 1; continue; }
    const t0 = Date.now(); while (pending > 0 && Date.now() - t0 < 8000) await sleep(40);
    if (pending > 0) add(i, kk, '动画没结束', '8 秒后还有计时器没跑完');
    await sleep(120);
    speed = 1;
    __errs.splice(0).forEach(m => add(i, kk, '报错', '动画模式：' + m));
    const s2 = signature();
    if (s1.t !== s2.t) add(i, kk, '重放不一致', '动画播完后的文字和瞬间重放不一样（检查 run 里是不是有只在动画回调里才 set 的值）');
    else if (s1.c !== s2.c) add(i, kk, '重放不一致', '格子的状态（颜色）和瞬间重放不一样');
    if (s1.f !== s2.f) add(i, kk, '重放不一致', '框的位置和瞬间重放不一样（如果直接改了元素的 textContent/innerHTML，改用 valBox.set / vars.set / grid.set，引擎才知道布局变了）');
    if (s1.m !== s2.m) add(i, kk, '重放不一致', '指针标签和瞬间重放不一样');
    if (s1.s !== s2.s) add(i, kk, '重放不一致', '图表里的元素个数和瞬间重放不一样');
  }
  const ok = problems.length === 0 && steps > 0;
  window.__CHECK__ = { ok, steps, problems };
  const p = el('div', ok ? 'ok' : 'bad'); p.id = 'checkPanel';
  p.innerHTML = ok ? `✅ 自检通过：${SC.length} 节、${steps} 步，没有报错，没有重叠或超出。`
    : `❌ 自检发现 ${problems.length} 个问题（共 ${steps} 步）：<ul>` + problems.map(q => `<li>[${q.kind}] ${q.scene} 第 ${q.step} 步：${q.msg.replace(/</g, '&lt;')}</li>`).join('') + '</ul>';
  document.querySelector('.wrap').prepend(p);
  console.log('__CHECK__', JSON.stringify(window.__CHECK__));
  CHECKING = false;
  go(0, 0, false);
  return window.__CHECK__;
}
