#!/usr/bin/env node
/* 截图：node <skill目录>/tools/snap.mjs <网页.html> <输出目录> 节:步 [节:步 ...] [--width 1040]
 *   节 = 上方标签从左数第几个，最左边那个是 0
 *   步 = 网页右下角「第 k / n 步」里的 k（从 1 数）
 * 例：node tools/snap.mjs examples/binary-search.html shots 0:1 1:5 3:3 --width 760
 * 每张图会等动画播完（约 3 秒）再截。需要 puppeteer-core。 */
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2), wi = argv.indexOf('--width');
const WIDTH = wi >= 0 ? +argv[wi + 1] : 1040; if (wi >= 0) argv.splice(wi, 2);
const [file, outDir, ...specs] = argv;
if (!file || !outDir || !specs.length || !(WIDTH > 0)) { console.error('用法：node tools/snap.mjs <网页.html> <输出目录> 节:步 [节:步 ...] [--width 1040]'); process.exit(2); }
if (!existsSync(file)) { console.error('找不到网页：' + file); process.exit(2); }

let puppeteer;
try { puppeteer = (await import('puppeteer-core')).default; }
catch { console.error('缺少 puppeteer-core：在 skill 目录里运行 npm install 一次。'); process.exit(2); }
const exe = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean).find(p => existsSync(p));
if (!exe) { console.error('找不到 Chrome/Edge，请设置环境变量 CHROME_PATH'); process.exit(2); }

mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: 1400, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(resolve(file)).href);
  for (const sp of specs) {
    const [i, k] = sp.split(':').map(Number);
    const n = await page.evaluate(i => (SC[i] && SC[i].steps) ? SC[i].steps.length : -1, i);
    if (!Number.isInteger(i) || !Number.isInteger(k) || n < 0 || k < 1 || k > n) {
      console.error(`${sp}：超出范围（${n < 0 ? `没有第 ${i} 节，一共 ${await page.evaluate(() => SC.length)} 节` : `第 ${i} 节一共 ${n} 步`}），跳过`);
      process.exitCode = 1; continue;
    }
    await page.evaluate((i, k) => { playing = false; upd(); return go(i, k - 1, true); }, i, k);
    await new Promise(r => setTimeout(r, 3200));
    const h = await page.evaluate(() => document.querySelector('.wrap').getBoundingClientRect().bottom);
    const out = join(outDir, `${basename(file, '.html')}_${i}-${k}${wi >= 0 ? '_w' + WIDTH : ''}.png`);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: WIDTH, height: Math.ceil(h) }, captureBeyondViewport: false });
    console.log(out);
  }
} finally { await browser.close(); }
