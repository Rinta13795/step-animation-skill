/* 示例课程：复利（输入是一段自然语言讲解，没有代码）
 * 生成网页：node build.mjs examples/compound-interest.lesson.js
 *
 * 原材料（一段讲义文字）：
 *   复利就是利滚利：每年的利息会加进本金，下一年连利息一起生利息。单利只按最初的本金算利息。
 *   本金 1000 元，年利率 10%，10 年后单利得 2000 元，复利得 2594 元。时间越长差距越大。
 *   72 法则：用 72 除以年利率（百分数），大约就是本金翻倍需要的年数。
 *
 * 没有代码时，每一步的 c 写「这一步对应的原文那句话 / 公式」，p 照样用大白话讲这一步在算什么。
 * 数字照样先用 JS 真的算一遍。 */
const LESSON = { title: '复利：利息怎么「滚」起来' };

const P0 = 1000, R = 0.10, Y = 5;
const yuan = v => (Math.round(v * 100) / 100).toString();
/* 真的一年一年算出来 */
const SIMPLE = [P0], COMP = [P0];
for (let y = 1; y <= 30; y++) { SIMPLE.push(SIMPLE[y - 1] + P0 * R); COMP.push(COMP[y - 1] * (1 + R)); }
const COLS = Array.from({ length: Y + 1 }, (_, y) => y);

/* ① 单利 */
SC.push({
  n: '① 单利',
  build() {
    const g = grid([Array(Y + 1).fill(null)], { s: 76, fs: 15, label: '单利：每年年底的钱（上面的小字是第几年）', idx: 1 });
    const it = valBox('今年的利息');
    g.set(0, 0, P0, 'hl');
    stage.appendChild(flow(g, it));
    return { g, it };
  },
  steps: [
    { c: '「本金 1000 元，年利率 10%」',
      p: '第 0 年存进去 <b>1000</b> 元（黄色格子），这就是<b>本金</b>。年利率 10% 的意思是：一年的利息 = 本金 × 10%。',
      run(S) { frame('a', CO, [S.g.c(0)]); } },
    ...[1, 2, 3].map(y => ({
      c: '「单利只按最初的本金算利息」',
      p: `第 ${y} 年：利息永远拿<b>最初的 1000</b> 来算，1000 × 10% = <b>100</b>。年底一共 ${yuan(SIMPLE[y - 1])} + 100 = <b>${yuan(SIMPLE[y])}</b>。`,
      run(S) {
        frame('a', CO, [S.g.c(0)]); frame('b', BL, [S.g.c(y)]);
        fly(S.g.c(0), S.it.el, '1000 × 10%', () => S.it.set('100'));
        fly(S.it.el, S.g.c(y), '+100', () => S.g.set(0, y, yuan(SIMPLE[y]), ''), null, 900);
      },
    })),
    { c: '「单利只按最初的本金算利息」',
      p: `每年都是 +100，像<b>走楼梯</b>一样一格一格地涨：第 5 年是 <b>${yuan(SIMPLE[5])}</b>。`,
      run(S) { noFrame('a'); frame('b', BL, S.g.cols(4, 5)); [4, 5].forEach((y, i) => T(() => S.g.set(0, y, yuan(SIMPLE[y]), ''), i * 250)); } },
  ],
});

/* ② 复利 */
SC.push({
  n: '② 复利',
  build() {
    const s = grid([SIMPLE.slice(0, Y + 1).map(yuan)], { s: 76, fs: 15, label: '单利（上一节算好的）', idx: 1 });
    const c = grid([Array(Y + 1).fill(null)], { s: 76, fs: 15, label: '复利：每年年底的钱' });
    const it = valBox('今年的利息');
    c.set(0, 0, P0, 'hl');
    stage.appendChild(row(col(s, c), it));
    return { s, c, it };
  },
  steps: [
    ...[1, 2, 3].map(y => {
      const base = COMP[y - 1], intr = base * R;
      return {
        c: y === 1 ? '「复利就是利滚利」' : '「每年的利息会加进本金，下一年连利息一起生利息」',
        p: y === 1
          ? `第 1 年和单利一样：1000 × 10% = <b>100</b>，年底 <b>1100</b>。区别从第 2 年开始。`
          : `第 ${y} 年：拿<b>去年年底的 ${yuan(base)}</b>（不是 1000）来算利息，${yuan(base)} × 10% = <b>${yuan(intr)}</b>。年底 = <b>${yuan(COMP[y])}</b>，比单利多了 ${yuan(COMP[y] - SIMPLE[y])}。`,
        run(S) {
          frame('a', CO, [S.c.c(y - 1)]); frame('b', BL, [S.c.c(y)]);
          fly(S.c.c(y - 1), S.it.el, `${yuan(base)} × 10%`, () => S.it.set(yuan(intr)));
          fly(S.it.el, S.c.c(y), '+' + yuan(intr), () => S.c.set(0, y, yuan(COMP[y]), ''), null, 900);
        },
      };
    }),
    { c: '本金 × (1 + 10%) × (1 + 10%) × …   每年乘一次 1.1',
      p: `所以复利每年是<b>乘 1.1</b>，单利每年是<b>加 100</b>。第 5 年：单利 ${yuan(SIMPLE[5])}，复利 <b>${yuan(COMP[5])}</b>。差距每年都在变大（绿色）。`,
      run(S) {
        noFrame('a'); frame('b', BL, S.c.cols(4, 5));
        [4, 5].forEach((y, i) => T(() => S.c.set(0, y, yuan(COMP[y]), ''), i * 250));
        T(() => [2, 3, 4, 5].forEach(y => S.c.set(0, y, yuan(COMP[y]), 'pos')), 700);
      } },
  ],
});

/* ③ 拉长时间看 */
const YS = Array.from({ length: 31 }, (_, y) => y);
SC.push({
  n: '③ 时间越长差距越大（图）',
  build() {
    const C = chart({ w: 860, h: 300, xmin: 0, xmax: 30, xt: [0, 5, 10, 15, 20, 25, 30], ymin: 0, ymax: 18000, yt: [0, 4000, 8000, 12000, 16000], xl: '第几年', yl: '钱（元）', label: '1000 元、年利率 10%，一年一年真的算出来' });
    stage.appendChild(C.w);
    return { C };
  },
  steps: [
    { c: '「单利只按最初的本金算利息」',
      p: '单利每年 +100，画出来是一条<b>直线</b>：30 年后是 4000 元。',
      wait: 2000,
      run(S) { S.C.line(YS, SIMPLE, GR, 2.5, 2000); T(() => S.C.text(30, SIMPLE[30], `单利：${yuan(SIMPLE[30])}`, GR, 'end'), 2000); } },
    { c: '「10 年后单利得 2000 元，复利得 2594 元」',
      p: `复利每年 ×1.1，是一条<b>越来越陡</b>的弯线。第 10 年：单利 ${yuan(SIMPLE[10])}，复利 <b>${Math.round(COMP[10])}</b>，和讲义里说的一样。`,
      wait: 2000,
      run(S) {
        S.C.line(YS, COMP, BL, 2.5, 2000);
        T(() => { S.C.dot(10, SIMPLE[10], GR); S.C.dot(10, COMP[10], BL); S.C.text(10, COMP[10] + 1400, `第 10 年：${Math.round(COMP[10])}`, BL, 'middle'); }, 2000);
      } },
    { c: '「时间越长差距越大」',
      p: `到第 30 年：单利 ${yuan(SIMPLE[30])}，复利 <b>${Math.round(COMP[30])}</b>，是单利的 <b>${(COMP[30] / SIMPLE[30]).toFixed(1)} 倍</b>。前几年两条线几乎重合，越往后分得越开。`,
      run(S) { S.C.ring(30, COMP[30], BL); S.C.text(29.5, COMP[30], `复利：${Math.round(COMP[30])}`, BL, 'end'); } },
  ],
});

/* ④ 72 法则：真的一年一年滚，看几年翻倍 */
const RATES = [4, 6, 8, 10, 12];
const doubleYears = r => { let m = 1, y = 0; while (m < 2) { m *= 1 + r / 100; y++; } return y; };
const exactYears = r => Math.log(2) / Math.log(1 + r / 100);
SC.push({
  n: '④ 72 法则',
  build() {
    const t = table([['年利率', '72 ÷ 利率', '真实翻倍年数', '第几年底超过 2 倍']], { label: '把每个利率真的滚一遍' });
    const q = valBox('72 ÷ 10', { w: 150 });
    stage.appendChild(row(t, q));
    return { t, q };
  },
  steps: [
    { c: '「用 72 除以年利率（百分数），大约就是本金翻倍需要的年数」',
      p: '利率 10%：72 ÷ 10 = <b>7.2 年</b>。意思是 1000 元大约 7 年多就变成 2000 元。',
      run(S) { frame('a', BL, [S.q.el]); S.q.set('7.2 年'); } },
    { c: '1000 × 1.1 × 1.1 × …  直到超过 2000',
      p: `真的一年一年滚：第 7 年底是 ${yuan(COMP[7])}，还差一点；第 8 年底 ${yuan(COMP[8])}，超过了。精确算是 <b>${exactYears(10).toFixed(2)} 年</b>，和 7.2 只差一点点。`,
      run(S) { S.t.add(['10%', '7.2', exactYears(10).toFixed(2), doubleYears(10)], true); frame('a', CO, [S.t.trs[1]]); } },
    { c: '「大约」',
      p: '换几个利率试试：72 法则在常见的利率（4%~12%）上都<b>只差零点几年</b>，所以心算够用了。',
      run(S) { noFrame(); RATES.filter(r => r !== 10).forEach((r, i) => T(() => S.t.add([r + '%', (72 / r).toFixed(1), exactYears(r).toFixed(2), doubleYears(r)]), i * 200)); } },
  ],
});
