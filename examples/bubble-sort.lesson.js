/* 示例课程：冒泡排序
 * 生成网页：node build.mjs examples/bubble-sort.lesson.js
 * 演示 swapFly（两个格子交换）和 mark（指针标签）。所有数字都来自下面真的跑一遍的 trace。 */
const LESSON = { title: '冒泡排序：大的数怎么一路「冒」到最后' };

const START = [5, 2, 8, 1, 4];
const CODE = `n = len(a)
for i in range(n - 1):
    for j in range(n - 1 - i):
        if a[j] > a[j + 1]:
            a[j], a[j + 1] = a[j + 1], a[j]`;

/* 真的排一遍，记下每次比较 */
function trace(a0) {
  const a = a0.slice(), ev = [], n = a.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      const x = a[j], y = a[j + 1], sw = x > y;
      if (sw) { a[j] = y; a[j + 1] = x; }
      ev.push({ t: 'cmp', i, j, x, y, sw, after: a.slice() });
    }
    ev.push({ t: 'pass', i, fixed: n - 1 - i, after: a.slice() });
  }
  return ev;
}
const EV = trace(START);

SC.push({
  n: '① 一轮一轮地比',
  code: CODE,
  build() {
    const g = grid(START, { s: 64, label: 'a', idx: 1, below: 2 });
    const v = vars(['i', 'j', '交换次数'], '变量');
    v.set('交换次数', 0);
    stage.appendChild(row(g, v));
    return { g, v, swaps: 0 };
  },
  steps: [
    { c: [1, 2, 3],
      p: '冒泡排序只做一件事：<b>相邻两个比一比，左边大就交换</b>。两层循环和 Java 的 <code>for (int i = 0; i &lt; n - 1; i++)</code> 一样，<code>range(n - 1)</code> 就是 0 到 n − 2。',
      run(S) { frame('a', CO, S.g.all()); } },
    ...EV.map(e => e.t === 'cmp' ? {
      c: e.sw ? [4, 5] : [4],
      p: `i = ${e.i}，j = ${e.j}：比较 a[${e.j}] = ${e.x} 和 a[${e.j + 1}] = ${e.y}。` +
        (e.sw ? `${e.x} > ${e.y}，<b>交换</b>。Python 一行就能换：<code>a[j], a[j+1] = a[j+1], a[j]</code>；Java 要借一个临时变量 <code>int t = a[j]; a[j] = a[j+1]; a[j+1] = t;</code>`
              : `${e.x} ≤ ${e.y}，顺序已经对了，<b>不动</b>。`),
      run(S) {
        S.v.set('i', e.i); S.v.set('j', e.j);
        mark('j', S.g.c(e.j), 'j', BL); mark('j1', S.g.c(e.j + 1), 'j+1', BL);
        frame('a', CO, S.g.cols(e.j, e.j + 1));
        if (e.sw) {
          S.swaps++;
          const n = S.swaps;
          swapFly(S.g.c(e.j), S.g.c(e.j + 1), e.x, e.y, () => {
            S.g.set(0, e.j, e.after[e.j], ''); S.g.set(0, e.j + 1, e.after[e.j + 1], ''); S.v.set('交换次数', n);
          });
        }
      },
    } : {
      c: [2],
      p: `第 ${e.i + 1} 轮比完：这一轮里最大的数已经被一路换到了 a[${e.fixed}]，<b>位置固定了</b>（变绿）。下一轮内层循环少比一次：<code>range(n − 1 − i)</code> 就是这个意思。` +
        (e.i === START.length - 2 ? `全部 ${START.length - 1} 轮结束，数组排好了：<b>[${e.after.join(', ')}]</b>。` : ''),
      run(S) {
        noMark('j', 'j1'); noFrame('a');
        const last = e.i === START.length - 2;
        for (let c = last ? 0 : e.fixed; c <= e.fixed; c++) S.g.set(0, c, e.after[c], 'pos');
        frame('b', GN, S.g.cols(last ? 0 : e.fixed, START.length - 1));
      },
    }),
  ],
});

/* ② 比较次数：真的对 n = 2..40 的随机数组跑一遍冒泡排序，数比较次数 */
function countCompares(n) { const a = Array.from({ length: n }, () => Math.random()); let c = 0;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < n - 1 - i; j++) { c++; if (a[j] > a[j + 1]) [a[j], a[j + 1]] = [a[j + 1], a[j]]; } return c; }
const NN = Array.from({ length: 39 }, (_, i) => i + 2), CMP = NN.map(countCompares);
SC.push({
  n: '② 要比多少次（图）',
  build() {
    const C = chart({ w: 820, h: 260, xmin: 0, xmax: 40, xt: [0, 10, 20, 30, 40], ymin: 0, ymax: 800, yt: [0, 200, 400, 600, 800], xl: '数组长度 n', yl: '比较次数', label: '把冒泡排序真的跑一遍，数比较了几次' });
    stage.appendChild(C.w);
    return { C };
  },
  steps: [
    { c: 'for i in range(n - 1):\n    for j in range(n - 1 - i):   # 第 i 轮比 n − 1 − i 次',
      p: `n = 5 时比了 4 + 3 + 2 + 1 = <b>10</b> 次（上一节正好 10 次比较）。一般是 (n − 1) + … + 1 = <b>n(n − 1) / 2</b>。`,
      run(S) { S.C.dot(5, 10, CO, 5); S.C.text(5, 10, 'n = 5：10 次', CO, 'start'); } },
    { c: '# n 从 2 到 40，每个都真的排一遍',
      p: `连起来是一条<b>越来越陡的弯线</b>：n = 40 时要比 ${CMP[CMP.length - 1]} 次。n 翻一倍，次数大约变成 4 倍，这就是 <b>O(n²)</b>。和二分查找的 O(log n) 正好相反，所以数据一多冒泡排序就很慢。`,
      wait: 2500,
      run(S) { S.C.line(NN, CMP, BL, 2.5, 2500); T(() => { S.C.ring(40, CMP[CMP.length - 1], BL); S.C.text(39.5, CMP[CMP.length - 1], `n = 40：${CMP[CMP.length - 1]} 次`, BL, 'end'); }, 2500); } },
  ],
});
