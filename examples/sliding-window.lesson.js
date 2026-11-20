/* 这个例子是一个全新的 Claude 只读 SKILL.md、没看过其他上下文的情况下写出来的（验证 skill 能复用）。 */
/* 滑动窗口：连续 k 个数的最大和
 * 生成：node <skill>/build.mjs sliding-window.lesson.js
 * 所有数字都由下面的 JS 真的算出来，不手填。 */
const LESSON = { title: '滑动窗口：连续 k 个数的最大和' };

/* ---------- 演示数据 ---------- */
const A = [2, 1, 5, 1, 3, 2, 6, 1];
const K = 3;
const N = A.length;
const NW = N - K + 1;                       // 窗口个数
const CODE = `def max_window_sum(a, k):
    s = sum(a[:k])
    best = s
    for i in range(k, len(a)):
        s += a[i] - a[i - k]
        best = max(best, s)
    return best`;

/* ---------- 真的跑一遍 ---------- */
const sumOf = arr => arr.reduce((x, y) => x + y, 0);
/* 暴力：每个窗口重新加 k 个数 */
const BRUTE = Array.from({ length: NW }, (_, j) => sumOf(A.slice(j, j + K)));
const BRUTE_BEST = Math.max(...BRUTE);
const BRUTE_BEST_J = BRUTE.indexOf(BRUTE_BEST);
/* 滑动窗口：记下每一轮的 s、best */
function trace(a, k) {
  const ev = []; let s = sumOf(a.slice(0, k)); let best = s;
  ev.push({ t: 'init', s });
  ev.push({ t: 'best0', best });
  for (let i = k; i < a.length; i++) {
    const old = s; s += a[i] - a[i - k];
    ev.push({ t: 'move', i, old, s, inV: a[i], outV: a[i - k] });
    const ob = best; best = Math.max(best, s);
    ev.push({ t: 'max', i, s, old: ob, best });
  }
  ev.push({ t: 'ret', best });
  return ev;
}
const EV = trace(A, K);
const SLIDE_BEST = EV[EV.length - 1].best;
const BEST_START = BRUTE_BEST_J;            // 最大和的窗口从哪个下标开始
/* 两种做法各「碰」了几个数（加一次或减一次算一次） */
const bruteOps = (n, k) => (n - k + 1) * k;
const slideOps = (n, k) => k + 2 * (n - k);
const fmtN = v => v.toLocaleString('en-US');

/* ================= 0 数据长什么样 ================= */
SC.push({
  n: '0 数据和窗口',
  build() {
    const g = grid(A, { s: 54, label: `a（${N} 个数）`, idx: 1, below: 1 });
    const r = valBox('结果', { w: 160 });
    stage.appendChild(flow(g, r));
    return { g, r };
  },
  steps: [
    { c: `a = [${A.join(', ')}]`,
      p: `Python 的列表就当成 Java 的 <code>int[]</code>：一排格子，上面的小字是<b>下标</b>，从 0 数到 ${N - 1}。`,
      run(S) { frame('a', CO, S.g.all()); } },
    { c: `k = ${K}`,
      p: `「连续 k 个数」就是一个 ${K} 格宽的框（橙框），叫<b>窗口</b>。题目问：这个框放在哪，框里 ${K} 个数加起来<b>最大</b>？`,
      run(S) { frame('a', CO, S.g.cols(0, K - 1)); } },
    { c: `a[:k]   →   [${A.slice(0, K).join(', ')}]`,
      p: `<code>a[:k]</code> 叫<b>切片</b>：取下标 0 到 k−1 这 ${K} 个数（不含下标 k），相当于 Java 的 <code>Arrays.copyOfRange(a, 0, k)</code>。`,
      run(S) {
        frame('a', CO, S.g.cols(0, K - 1)); frame('b', BL, [S.r.el]);
        for (let c = 0; c < K; c++) fly(S.g.c(c), S.r.el, A[c], c === K - 1 ? () => S.r.set(`[${A.slice(0, K).join(', ')}]`) : null, null, c * 250);
      } },
    { c: `sum(a[:k])   →   ${sumOf(A.slice(0, K))}`,
      p: `<code>sum(...)</code> 把这几个数加起来：${A.slice(0, K).join(' + ')} = <b>${sumOf(A.slice(0, K))}</b>。Java 里要自己写个 for 循环累加，Python 一个函数搞定。`,
      run(S) {
        frame('a', CO, S.g.cols(0, K - 1)); frame('b', BL, [S.r.el]);
        for (let c = 0; c < K; c++) fly(S.g.c(c), S.r.el, A[c], c === K - 1 ? () => S.r.set(sumOf(A.slice(0, K))) : null, null, c * 250);
      } },
    { c: `for i in range(k, len(a)):     # i = ${Array.from({ length: N - K }, (_, j) => K + j).join(', ')}`,
      p: `<code>range(k, len(a))</code> 从 k 数到 len(a)−1（<b>不含 len(a)</b>），整句等于 Java 的 <code>for (int i = k; i &lt; a.length; i++)</code>，这里 i 依次是 ${K} 到 ${N - 1}。`,
      run(S) {
        frame('a', CO, S.g.cols(K, N - 1)); noFrame('b');
        for (let i = K; i < N; i++) T(() => mark('i', S.g.c(i), 'i', BL), (i - K) * 300);
        T(() => S.r.set(`${K} … ${N - 1}`), (N - 1 - K) * 300);
      } },
  ],
});

/* ================= ① 暴力做法 ================= */
const bruteSteps = [];
BRUTE.forEach((sum, j) => {
  const nums = A.slice(j, j + K);
  bruteSteps.push({
    c: `sum(a[${j}:${j + K}])   →   ${nums.join(' + ')} = ${sum}`,
    p: j === 0
      ? `暴力做法：把窗口放在每个位置，<b>每次都重新把 ${K} 个数加一遍</b>。第 0 个窗口：${nums.join(' + ')} = <b>${sum}</b>。`
      : `窗口右移到下标 ${j}~${j + K - 1}，又从头加 ${K} 个数：${nums.join(' + ')} = <b>${sum}</b>。到现在一共加了 ${(j + 1) * K} 个数。`,
    run(S) {
      noFrame('c');
      frame('a', CO, S.g.cols(j, j + K - 1)); frame('b', BL, [S.sums.c(j)]);
      nums.forEach((v, t) => fly(S.g.c(j + t), S.sums.c(j), v,
        t === K - 1 ? () => { S.sums.set(0, j, sum, ''); S.cnt.set((j + 1) * K); } : null, null, t * 250));
    },
  });
  if (j === 1) bruteSteps.push({
    c: `# a[1:3] = [${A.slice(1, K).join(', ')}] 被加了两次`,
    p: `发现浪费了吗？第 0 个和第 1 个窗口<b>重叠了 ${K - 1} 个数</b>（红框里的 ${A.slice(1, K).join(' 和 ')}），它们被重复加了一遍。窗口越宽，重复得越多。`,
    run(S) { noFrame('b'); frame('a', CO, S.g.cols(0, K)); frame('c', RD, S.g.cols(1, K - 1), 9); },
  });
});
bruteSteps.push({
  c: `max(${BRUTE.join(', ')})   →   ${BRUTE_BEST}`,
  p: `${NW} 个窗口的和里挑最大的：<b>${BRUTE_BEST}</b>（下标 ${BRUTE_BEST_J}~${BRUTE_BEST_J + K - 1} 那个窗口）。一共加了 ${NW} 个窗口 × ${K} = <b>${NW * K}</b> 个数，也就是 <b>O(n·k)</b>：n 个位置，每个位置干 k 次活。`,
  run(S) {
    noFrame('c');
    frame('a', GN, S.g.cols(BRUTE_BEST_J, BRUTE_BEST_J + K - 1)); frame('b', GN, [S.sums.c(BRUTE_BEST_J)]);
    S.sums.set(0, BRUTE_BEST_J, BRUTE_BEST, 'pos');
    fly(S.sums.c(BRUTE_BEST_J), S.res.el, BRUTE_BEST, () => S.res.set(BRUTE_BEST), GN);
  },
});
SC.push({
  n: '① 暴力：每次重新加',
  build() {
    const g = grid(A, { s: 54, label: 'a', idx: 1 });
    const sums = grid(Array(NW).fill(null), { s: 54, label: '每个窗口的和（第 j 格 = 从下标 j 开始的窗口）', idx: 1 });
    const cnt = valBox('一共加了几个数'), res = valBox('最大和');
    stage.appendChild(col(g, row(sums, cnt, res)));
    return { g, sums, cnt, res };
  },
  steps: bruteSteps,
});

/* ================= ② 滑动窗口 ================= */
const slideSteps = [];
EV.forEach(e => {
  if (e.t === 'init') slideSteps.push({
    c: [1, 2],
    p: `第一步和暴力一样：先把前 ${K} 个数加起来，${A.slice(0, K).join(' + ')} = <b>${e.s}</b>，存进 <code>s</code>（当前窗口的和）。`,
    run(S) {
      frame('a', CO, S.g.cols(0, K - 1)); frame('b', BL, [S.v.row('s')]);
      for (let c = 0; c < K; c++) fly(S.g.c(c), S.v.el('s'), A[c], c === K - 1 ? () => S.v.set('s', e.s) : null, null, c * 250);
    },
  });
  if (e.t === 'best0') slideSteps.push({
    c: [3],
    p: `<code>best</code> 记「到目前为止见过的最大和」。现在只见过一个窗口，所以 best = <b>${e.best}</b>。`,
    run(S) { frame('b', BL, [S.v.row('best')]); fly(S.v.el('s'), S.v.el('best'), e.best, () => S.v.set('best', e.best)); },
  });
  if (e.t === 'move') slideSteps.push({
    c: [4, 5],
    p: (e.i === K ? `进循环，i = ${e.i}。<code>s += x</code> 和 Java 一样是 <code>s = s + x</code>。` : `i = ${e.i}，窗口再右移一格。`) +
      `进来 a[${e.i}] = ${e.inV}，出去 a[${e.i - K}] = ${e.outV}：s = ${e.old} + ${e.inV} − ${e.outV} = <b>${e.s}</b>。` +
      (e.i === K ? `<b>只做 1 次加、1 次减</b>，不用再加 ${K} 个数。` : ''),
    run(S) {
      S.v.set('i', e.i);
      mark('i', S.g.c(e.i), 'i', BL); mark('out', S.g.c(e.i - K), 'i−k', RD);
      frame('a', CO, S.g.cols(e.i - K + 1, e.i)); frame('b', BL, [S.v.row('s')]);
      S.g.set(0, e.i - K, A[e.i - K], 'dim');
      fly(S.g.c(e.i), S.v.el('s'), '+' + e.inV, null, GN);
      fly(S.g.c(e.i - K), S.v.el('s'), '−' + e.outV, () => { S.v.set('s', e.s); S.calc.set(`${e.old}+${e.inV}−${e.outV}=${e.s}`); }, RD, 350);
    },
  });
  if (e.t === 'max') slideSteps.push({
    c: [6],
    p: `<code>max</code> 就是 Java 的 <code>Math.max</code>：max(${e.old}, ${e.s}) = <b>${e.best}</b>。` +
      (e.best > e.old ? `新窗口<b>更大</b>，best 更新成 ${e.best}。` : `新窗口没有更大，best <b>不变</b>。`),
    run(S) {
      frame('b', BL, [S.v.row('best')]);
      fly(S.v.el('s'), S.v.el('best'), `max(${e.old},${e.s})`, () => { S.v.set('best', e.best); S.calc.set(`max(${e.old},${e.s})=${e.best}`); });
    },
  });
  if (e.t === 'ret') slideSteps.push({
    c: [7],
    p: `循环结束，返回 <b>${e.best}</b>，和暴力做法的答案一样（绿框是和最大的那个窗口）。整个过程每个数只进窗口一次、出窗口一次，所以是 <b>O(n)</b>。`,
    run(S) {
      noMark(); frame('a', GN, S.g.cols(BEST_START, BEST_START + K - 1)); frame('b', GN, [S.res.el]);
      for (let c = BEST_START; c < BEST_START + K; c++) S.g.set(0, c, A[c], 'pos');
      fly(S.v.el('best'), S.res.el, e.best, () => S.res.set(e.best), GN);
    },
  });
});
SC.push({
  n: '② 滑动窗口：一进一出',
  code: CODE,
  build() {
    const g = grid(A, { s: 54, label: `a，k = ${K}`, idx: 1, below: 2 });
    const v = vars(['k', 'i', 's', 'best'], '变量');
    const calc = valBox('这一步算了什么', { w: 230, fs: 20 }), res = valBox('返回值');
    v.set('k', K);
    stage.appendChild(col(g, row(v, calc, res)));
    return { g, v, calc, res };
  },
  steps: slideSteps,
});

/* ================= ③ 差多少（图） ================= */
const KF = 50, NF = 1000;
const NSX = []; for (let n = KF; n <= NF; n += 10) NSX.push(n);
const KSX = []; for (let k = 1; k <= NF; k += 5) KSX.push(k);
const B1 = NSX.map(n => bruteOps(n, KF)), S1 = NSX.map(n => slideOps(n, KF));
const B2 = KSX.map(k => bruteOps(NF, k)), S2 = KSX.map(k => slideOps(NF, k));
const PEAK_K = KSX[B2.indexOf(Math.max(...B2))];
const wan = v => v === 0 ? '0' : (v / 10000) + '万';
SC.push({
  n: '③ 差多少（图）',
  build() {
    const C = chart({ w: 860, h: 210, xmin: 0, xmax: NF, xt: [0, 200, 400, 600, 800, 1000], ymin: 0, ymax: 50000, yt: [0, 10000, 20000, 30000, 40000, 50000], fmt: wan,
      xl: '数组长度 n', yl: '要加/减几次', label: `k 固定 = ${KF}，数组越来越长（两种做法真的数出来的次数）` });
    const Z = chart({ w: 860, h: 190, xmin: 0, xmax: NF, xt: [0, 200, 400, 600, 800, 1000], ymin: 0, ymax: 260000, yt: [0, 100000, 200000], fmt: wan,
      xl: '窗口宽度 k', yl: '要加/减几次', label: `n 固定 = ${NF}，窗口越来越宽` });
    stage.appendChild(col(C, Z));
    return { C, Z };
  },
  steps: [
    { c: '# 暴力：每个窗口重新加 k 个数  →  (n − k + 1) × k 次',
      p: `暴力做法：n = ${NF}、k = ${KF} 时，有 ${NF - KF + 1} 个窗口，每个加 ${KF} 个数，一共 <b>${fmtN(bruteOps(NF, KF))}</b> 次。n 越大越多，是一条斜线。`,
      wait: 2500,
      run(S) { S.C.line(NSX, B1, GR, 2.5, 2500); T(() => S.C.text(NF, bruteOps(NF, KF), `暴力：${fmtN(bruteOps(NF, KF))} 次`, GR, 'end'), 2500); } },
    { c: '# 滑动窗口：先加 k 个，之后每挪一格 1 加 1 减  →  k + 2(n − k) 次',
      p: `滑动窗口：先加 ${KF} 个，之后每挪一格只做 1 加 1 减，一共 ${KF} + 2 × ${NF - KF} = <b>${fmtN(slideOps(NF, KF))}</b> 次，差了 <b>${Math.round(bruteOps(NF, KF) / slideOps(NF, KF))} 倍</b>，在图上几乎贴着横轴。`,
      wait: 2500,
      run(S) { S.C.line(NSX, S1, BL, 2.5, 2500); T(() => { S.C.dot(NF, slideOps(NF, KF), BL, 4); S.C.text(NF - 10, slideOps(NF, KF) + 6000, `滑动窗口：${fmtN(slideOps(NF, KF))} 次`, BL, 'end'); }, 2500); } },
    { c: '# 暴力 O(n·k)，滑动窗口 O(n)：和 k 无关',
      p: `再把 n 固定成 ${NF}、让窗口变宽：暴力做法在 k = ${PEAK_K} 时要 <b>${fmtN(bruteOps(NF, PEAK_K))}</b> 次；滑动窗口始终不超过 2n = ${fmtN(2 * NF)} 次。这就是 <b>O(n·k)</b> 和 <b>O(n)</b> 的区别：滑动窗口的工作量<b>跟 k 没关系</b>。`,
      wait: 2500,
      run(S) {
        S.Z.line(KSX, B2, GR, 2.5, 2500); S.Z.line(KSX, S2, BL, 2.5, 2500);
        T(() => { S.Z.dot(PEAK_K, bruteOps(NF, PEAK_K), GR, 4); S.Z.text(PEAK_K, bruteOps(NF, PEAK_K) - 45000, `k=${PEAK_K}：${fmtN(bruteOps(NF, PEAK_K))} 次`, GR, 'middle'); S.Z.text(PEAK_K, 30000, `滑动窗口：始终 ≤ ${fmtN(2 * NF)} 次`, BL, 'middle'); }, 2500);
      } },
  ],
});
