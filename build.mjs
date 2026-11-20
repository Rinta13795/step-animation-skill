#!/usr/bin/env node
/* 把 课程文件（*.lesson.js）+ 引擎 拼成一个独立的 HTML 网页（不依赖任何外部文件，双击就能打开）。
 * 用法：node build.mjs <课程.lesson.js> [输出.html]
 * 不写输出路径时，生成在课程文件旁边，同名 .html。 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [src, outArg] = process.argv.slice(2);
if (!src) { console.error('用法：node build.mjs <课程.lesson.js> [输出.html]'); process.exit(2); }
if (!existsSync(src)) { console.error('找不到课程文件：' + src); process.exit(2); }

const lesson = readFileSync(resolve(src), 'utf8');
const css = readFileSync(join(here, 'engine', 'engine.css'), 'utf8');
const js = readFileSync(join(here, 'engine', 'engine.js'), 'utf8');
const m = lesson.match(/title\s*:\s*(['"`])(.*?)\1/);
const title = m ? m[2] : basename(src).replace(/(\.lesson)?\.[cm]?js$/i, '');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
/* 防止课程文字里的 </script>、<!--、<script 把页面截断：把 < 换成 JS 转义 \x3C（在字符串、模板字符串、正则里意思都不变） */
const safe = s => s.replace(/<(!--|\/?script)/gi, '\\x3C$1');

const html = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
${css}
</style>
</head>
<body>
<script>
${safe(js)}
</script>
<script>
/* 课程代码放在自己的作用域里：课程里起的名字（比如 next、k、arr）不会和引擎的名字打架 */
(function () {
${safe(lesson)}
;if (typeof LESSON !== 'undefined') window.LESSON = LESSON;
})();
</script>
<script>boot();</script>
</body>
</html>
`;
const out = outArg ? resolve(outArg) : resolve(src).replace(/(\.lesson)?\.[cm]?js$/i, '') + '.html';
if (out === resolve(src)) { console.error('输出路径和课程文件是同一个，已拒绝覆盖：' + out); process.exit(2); }
writeFileSync(out, html);
console.log('已生成', out);
