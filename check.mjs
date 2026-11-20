#!/usr/bin/env node
/* 用本机的 Chrome/Edge 无界面打开网页的 ?check 模式，把每一步都跑一遍，打印自检结果。
 * 用法：node check.mjs <网页.html> [--width 1000]
 * 需要 puppeteer-core（在本目录 npm install 一次即可）。没有的话，也可以手动在浏览器里打开
 *   file:///…/网页.html?check
 * 看页面顶部的报告，或在控制台读 window.__CHECK__。
 * 退出码：0 = 全部通过，1 = 有问题，2 = 用法/环境错误。 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const wi = args.indexOf('--width'); const width = wi >= 0 ? +args[wi + 1] : 1040;
const file = args.find((a, i) => !a.startsWith('--') && !(wi >= 0 && i === wi + 1));
if (!file || !(width > 0)) { console.error('用法：node check.mjs <网页.html> [--width 1000]'); process.exit(2); }
if (!existsSync(file)) { console.error('找不到网页：' + file); process.exit(2); }

let puppeteer;
try { puppeteer = (await import('puppeteer-core')).default; }
catch { console.error('缺少 puppeteer-core：在 skill 目录里运行 npm install 一次。\n或者手动在浏览器打开 ' + pathToFileURL(resolve(file)).href + '?check'); process.exit(2); }

const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);
const exe = candidates.find(p => existsSync(p));
if (!exe) { console.error('找不到 Chrome/Edge，请设置环境变量 CHROME_PATH'); process.exit(2); }

const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 1000 });
  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(String(e)));
  await page.goto(pathToFileURL(resolve(file)).href + '?check');
  try { await page.waitForFunction('window.__CHECK__', { timeout: 600000, polling: 500 }); }
  catch { console.log('❌ 10 分钟内自检没有结束（某一步卡住了）。页面报错：\n  ' + (consoleErrors.join('\n  ') || '无')); await browser.close(); process.exit(1); }
  const r = await page.evaluate(() => window.__CHECK__);
  if (r.ok) console.log(`✅ 自检通过：${r.steps} 步，宽度 ${width}px，没有报错、重叠或超出。`);
  else {
    console.log(`❌ ${r.problems.length} 个问题（共 ${r.steps} 步，宽度 ${width}px）：`);
    r.problems.forEach(p => console.log(`  [${p.kind}] ${p.scene} 第 ${p.step} 步：${p.msg}`));
  }
  if (consoleErrors.length) console.log('页面报错（可能在自检开始前）：\n  ' + consoleErrors.join('\n  '));
  process.exitCode = r.ok && !consoleErrors.length ? 0 : 1;
} finally { await browser.close(); }
