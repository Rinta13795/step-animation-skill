/* 课程文件骨架：复制一份，改名成 xxx.lesson.js，然后
 *   node <skill 目录>/build.mjs xxx.lesson.js
 *   node <skill 目录>/check.mjs xxx.html
 * 函数说明见 reference/api.md，完整例子见 examples/。 */
const LESSON = { title: '标题：这一页讲什么' };

/* 1. 演示数据：要小、要好算 */
const A = [[10, 20], [30, 40]];

/* 2. 用 JS 把材料里的计算真的跑一遍，结果拿来生成步骤（不要手填数字） */
const SUM = A.flat().reduce((a, b) => a + b, 0);
const MEAN = SUM / A.flat().length;

/* 0 数据长什么样 */
SC.push({
  n: '0 数据是什么',
  build() {
    const g = grid(A, { s: 64, label: 'a（2 行 2 列）', idx: 1 });
    const r = valBox('结果');
    stage.appendChild(flow(g, r));
    return { g, r };
  },
  steps: [
    { c: 'a',
      p: 'a 就是一张<b>数字表格</b>，相当于 C 的 <code>int a[2][2]</code>。',
      run(S) { frame('a', CO, S.g.all()); } },
    { c: 'a[1, 0]   →   30',
      p: `取第 1 行第 0 列（都从 0 数）：<b>${A[1][0]}</b>。`,
      run(S) { frame('a', CO, [S.g.c(1, 0)]); fly(S.g.c(1, 0), S.r.el, A[1][0], () => S.r.set(A[1][0])); } },
  ],
});

/* ① 一个函数一节 */
SC.push({
  n: '① 求平均',
  build() {
    const g = grid(A, { s: 64, label: 'a' });
    const m = valBox('a.mean()');
    stage.appendChild(flow(g, m));
    return { g, m };
  },
  steps: [
    { c: 'a.mean()',
      p: `所有格子加起来除以个数：(${A.flat().join(' + ')}) ÷ ${A.flat().length} = <b>${MEAN}</b>。`,
      run(S) {
        frame('a', CO, S.g.all()); frame('b', BL, [S.m.el]);
        S.g.all().forEach((c, i, all) => fly(c, S.m.el, c.textContent, i === all.length - 1 ? () => S.m.set(MEAN) : null, null, i * 120));
      } },
  ],
});
