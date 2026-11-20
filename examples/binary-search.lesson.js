/* 示例课程：二分查找
 * 生成网页：node build.mjs examples/binary-search.lesson.js
 * 写法要点：先用 JS 把算法真的跑一遍、记下 trace（每一步的 lo/hi/mid），再按 trace 生成步骤，
 * 这样网页上的每个数字都是算出来的，不是手填的。 */
const LESSON = { title: '二分查找：每一步在比什么' };

const A = [3, 8, 12, 17, 23, 31, 42, 56, 64, 77, 85, 93];
const N = A.length;
const CODE = `def binary_search(a, target):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == target:
            return mid
        elif a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`;

/* 真的跑一遍二分查找，把每一步记下来 */
function trace(a, target) {
  const ev = []; let lo = 0, hi = a.length - 1;
  ev.push({ t: 'init', lo, hi });
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    ev.push({ t: 'mid', lo, hi, mid });
    if (a[mid] === target) { ev.push({ t: 'found', mid }); return ev; }
    if (a[mid] < target) { ev.push({ t: 'less', mid, lo: mid + 1, hi, oldLo: lo }); lo = mid + 1; }
    else { ev.push({ t: 'greater', mid, lo, hi: mid - 1, oldHi: hi }); hi = mid - 1; }
  }
  ev.push({ t: 'none', lo, hi });
  return ev;
}

/* 0 有序数组是什么 */
SC.push({
  n: '0 有序数组',
  build() {
    const g = grid(A, { s: 54, label: 'a（12 个数，已经从小到大排好）', idx: 1 });
    const r = valBox('结果');
    stage.appendChild(flow(g, r));
    return { g, r };
  },
  steps: [
    { c: 'a = [3, 8, 12, 17, 23, 31, 42, 56, 64, 77, 85, 93]',
      p: 'Python 的列表就像 Java 的 <code>int[]</code>：一排格子，上面的小字是<b>下标</b>，从 0 开始数。二分查找有个前提：数组必须<b>已经排好序</b>。',
      run(S) { frame('a', CO, S.g.all()); } },
    { c: 'a[5]   →   31',
      p: '用下标取值：<code>a[5]</code> 就是第 5 格（从 0 数），值是 <b>31</b>。和 Java 的 <code>a[5]</code> 一模一样。',
      run(S) { frame('a', CO, [S.g.c(5)]); fly(S.g.c(5), S.r.el, '31', () => S.r.set('31')); } },
    { c: 'len(a)   →   12',
      p: '<code>len(a)</code> 是格子个数，相当于 Java 的 <code>a.length</code>。最后一格的下标是 <b>len(a) − 1 = 11</b>。',
      run(S) { frame('a', CO, S.g.all()); fly(S.g.c(11), S.r.el, '12 个', () => S.r.set('12')); } },
  ],
});

/* 1、2 两节结构一样，只是要找的数不同：用一个函数按 trace 生成 */
function searchScene(name, target, intro) {
  const ev = trace(A, target), steps = [];
  const rel = m => A[m] === target ? '==' : A[m] < target ? '<' : '>';
  ev.forEach(e => {
    if (e.t === 'init') steps.push({
      c: [1, 2],
      p: `${intro}先放两个指针：<b>lo = 0</b> 指向第一格，<b>hi = len(a) − 1 = ${N - 1}</b> 指向最后一格。要找的数如果存在，一定在 lo 到 hi 之间（橙框）。`,
      run(S) { S.v.set('lo', 0); S.v.set('hi', N - 1); mark('lo', S.g.c(0), 'lo', BL); mark('hi', S.g.c(N - 1), 'hi', BL); frame('a', CO, S.g.cols(0, N - 1)); },
    });
    if (e.t === 'mid') steps.push({
      c: [3, 4],
      p: `lo = ${e.lo} ≤ hi = ${e.hi}，范围里还有格子，继续。取正中间：mid = (${e.lo} + ${e.hi}) // 2 = <b>${e.mid}</b>。<code>//</code> 是整除，和 Java 里两个 int 相除一样，小数直接丢掉。`,
      run(S) {
        frame('a', CO, S.g.cols(e.lo, e.hi));
        fly(S.v.el('lo'), S.v.el('mid'), `(${e.lo}+${e.hi})//2`, () => { S.v.set('mid', e.mid); mark('mid', S.g.c(e.mid), 'mid', CO); });
      },
    });
    if (e.t === 'found' || e.t === 'less' || e.t === 'greater') {
      const r = rel(e.mid);
      steps.push({
        c: r === '==' ? [5] : r === '<' ? [5, 7] : [5, 7, 9],
        p: `看中间那格：a[${e.mid}] = <b>${A[e.mid]}</b>，和要找的 ${target} 比，${A[e.mid]} ${r} ${target}。` +
          (r === '==' ? '<b>相等，找到了！</b>' : r === '<' ? '中间的数<b>太小</b>，走 elif 分支。' : '中间的数<b>太大</b>，走 else 分支。'),
        run(S) {
          frame('a', CO, [S.g.c(e.mid)]); frame('b', BL, [S.cmp.el]);
          fly(S.g.c(e.mid), S.cmp.el, A[e.mid], () => { S.v.set('a[mid]', A[e.mid]); S.cmp.set(`${A[e.mid]} ${r} ${target}`); });
        },
      });
    }
    if (e.t === 'found') steps.push({
      c: [6],
      p: `返回下标 <b>${e.mid}</b>。一共只看了 ${ev.filter(x => x.t === 'mid').length} 个格子；如果从头一个个找（顺序查找），要看 ${e.mid + 1} 个。`,
      run(S) { noFrame('b'); frame('a', GN, [S.g.c(e.mid)]); S.g.set(0, e.mid, A[e.mid], 'pos'); fly(S.v.el('mid'), S.res.el, e.mid, () => S.res.set(e.mid)); },
    });
    if (e.t === 'less') steps.push({
      c: [8],
      p: `数组是排好序的，a[${e.mid}] 已经比 ${target} 小，那 mid 和它<b>左边的格子全都更小</b>，整段丢掉（变淡）：lo = mid + 1 = <b>${e.lo}</b>。一下排除了 ${e.mid - e.oldLo + 1} 个格子。`,
      run(S) {
        for (let c = e.oldLo; c <= e.mid; c++) T(() => S.g.set(0, c, A[c], 'dim'), (c - e.oldLo) * 60);
        noMark('mid'); noFrame('b'); frame('a', CO, S.g.cols(e.lo, e.hi));
        fly(S.v.el('mid'), S.v.el('lo'), 'mid + 1', () => { S.v.set('lo', e.lo); mark('lo', S.g.c(Math.min(e.lo, N - 1)), 'lo', BL); });
      },
    });
    if (e.t === 'greater') steps.push({
      c: [10],
      p: `a[${e.mid}] 比 ${target} 大，那 mid 和它<b>右边的格子全都更大</b>，整段丢掉：hi = mid − 1 = <b>${e.hi}</b>。一下排除了 ${e.oldHi - e.mid + 1} 个格子。`,
      run(S) {
        for (let c = e.mid; c <= e.oldHi; c++) T(() => S.g.set(0, c, A[c], 'dim'), (e.oldHi - c) * 60);
        noMark('mid'); noFrame('b'); frame('a', CO, S.g.cols(e.lo, e.hi));
        fly(S.v.el('mid'), S.v.el('hi'), 'mid − 1', () => { S.v.set('hi', e.hi); mark('hi', S.g.c(Math.max(e.hi, 0)), 'hi', BL); });
      },
    });
    if (e.t === 'none') steps.push({
      c: [3, 11],
      p: `现在 lo = ${e.lo} > hi = ${e.hi}：lo 跑到了 hi 的右边，中间<b>一个格子都不剩</b>，while 条件不成立，退出循环。说明 ${target} 不在数组里，返回 <b>-1</b>（Java 的 <code>indexOf</code> 找不到也返回 -1）。`,
      run(S) { noFrame(); fly(S.v.el('lo'), S.res.el, '-1', () => S.res.set('-1')); },
    });
  });
  return {
    n: name, code: CODE,
    build() {
      const g = grid(A, { s: 54, label: `a，要找 target = ${target}`, idx: 1, below: 3 });
      const v = vars(['target', 'lo', 'hi', 'mid', 'a[mid]'], '变量');
      const cmp = valBox('比较', { w: 150 }), res = valBox('返回值');
      v.set('target', target);
      stage.appendChild(col(g, row(v, cmp, res)));
      return { g, v, cmp, res };
    },
    steps,
  };
}
SC.push(searchScene('① 找 77（找得到）', 77, '在 a 里找 77。'));
SC.push(searchScene('② 找 50（找不到）', 50, '这次找一个<b>不在</b>数组里的数：50。'));

/* 3 为什么快：真的跑两种查找，数比较了几次 */
function linearCount(n) { let c = 0; for (let i = 0; i < n; i++) c++; return c; }           // 最坏情况：要找的数不在里面
function binaryCount(n) { let lo = 0, hi = n - 1, c = 0; while (lo <= hi) { c++; lo = ((lo + hi) >> 1) + 1; } return c; } // 最坏：target 比所有数都大
const NS_ = Array.from({ length: 1000 }, (_, i) => i + 1);
const LIN = NS_.map(linearCount), BIN = NS_.map(binaryCount);
SC.push({
  n: '③ 为什么快（图）',
  build() {
    const C = chart({ w: 860, h: 220, xmin: 0, xmax: 1000, xt: [0, 200, 400, 600, 800, 1000], ymin: 0, ymax: 1000, yt: [0, 250, 500, 750, 1000], xl: '数组长度 n', yl: '最坏要比几次', label: '比较次数（把两种查找真的跑一遍数出来的）' });
    const Z = chart({ w: 860, h: 190, xmin: 0, xmax: 1000, xt: [0, 200, 400, 600, 800, 1000], ymin: 0, ymax: 12, yt: [0, 4, 8, 12], xl: '数组长度 n', yl: '二分查找比几次', label: '把二分查找那条线放大看' });
    stage.appendChild(col(C, Z));
    return { C, Z };
  },
  steps: [
    { c: 'for x in a:            # 顺序查找：从头一个个比\n    if x == target: ...',
      p: '顺序查找：最坏情况要把<b>每个格子都看一遍</b>。n 个数就比 n 次，所以是一条斜着往上的直线：1000 个数要比 1000 次。',
      wait: 2500,
      run(S) { S.C.line(NS_, LIN, GR, 2.5, 2500); T(() => S.C.text(1000, 1000, '顺序查找：1000 次', GR, 'end'), 2500); } },
    { c: 'binary_search(a, target)',
      p: '二分查找每比一次就<b>丢掉一半</b>，1000 个数最多比 <b>10 次</b>。在同一张图里，它几乎贴着横轴，看不出在涨。',
      wait: 2500,
      run(S) { S.C.line(NS_, BIN, BL, 2.5, 2500); T(() => { S.C.dot(1000, 10, BL, 5); S.C.text(990, 60, '二分查找：10 次', BL, 'end'); }, 2500); } },
    { c: '# 放大看二分查找',
      p: '放大以后是一级一级的<b>台阶</b>：n 每翻一倍（红虚线：2、4、8 … 512），才多比 1 次。这就是常说的 <b>O(log n)</b>：log₂1000 ≈ 10。',
      wait: 2500,
      run(S) {
        S.Z.line(NS_, BIN, BL, 2, 2500);
        [2, 4, 8, 16, 32, 64, 128, 256, 512].forEach((p, i) => T(() => S.Z.vline(p, RD), 2500 + i * 80));
        T(() => S.Z.text(512, 11.4, 'n = 512 → 10 次', RD, 'start'), 3300);
      } },
  ],
});
