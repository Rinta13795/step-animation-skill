#!/usr/bin/env node
/* 录制示例网页的真实播放画面（CDP screencast），整理成 30fps 的 JPEG 序列。
 * 用法：node promo/capture.mjs <输出目录>
 * 每段录一个文件夹：<输出目录>/<段名>/0001.jpg … */
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || 'promo/frames');
const exe = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].filter(Boolean).find(p => existsSync(p));
const FPS = 30, W = 1040, H = 960, DSF = 1.5;

/* 每段：哪个网页，按什么节奏翻到哪些步（[节, 步(从0数), 停多久ms]） */
const SEGMENTS = [
  { name: 'search', file: 'examples/binary-search.html', start: [1, 0], plan: [[1, 1, 1900], [1, 2, 1900], [1, 3, 2300], [1, 4, 1900], [1, 5, 1900], [1, 6, 2300]] },
  { name: 'chart', file: 'examples/binary-search.html', start: [3, 0], startAnim: true, plan: [[3, 0, 3600], [3, 1, 3600], [3, 2, 4200]] },
  { name: 'bubble', file: 'examples/bubble-sort.html', start: [0, 0], plan: [[0, 1, 2000], [0, 2, 1700], [0, 3, 2000], [0, 4, 1900], [0, 5, 2200]] },
];

const browser = await puppeteer.launch({ executablePath: exe, headless: true, defaultViewport: { width: W, height: H, deviceScaleFactor: DSF } });
for (const seg of SEGMENTS) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(join(root, seg.file)).href);
  /* 显示成「正在自动播放」的样子，但由脚本控制翻页节奏 */
  await page.evaluate(([i, k]) => { playing = true; upd(); return go(i, k, false).then(() => clearTimeout(auto)); }, seg.start);
  await new Promise(r => setTimeout(r, 600));
  const cdp = await page.createCDPSession();
  const frames = [];
  cdp.on('Page.screencastFrame', async f => { frames.push({ t: f.metadata.timestamp, data: f.data }); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {} });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
  await new Promise(r => setTimeout(r, 500));
  for (const [i, k, ms] of seg.plan) {
    await page.evaluate(([i, k]) => go(i, k, true).then(() => clearTimeout(auto)), [i, k]);
    await new Promise(r => setTimeout(r, ms));
  }
  await cdp.send('Page.stopScreencast');
  /* 按时间戳重采样成恒定 30fps */
  const dir = join(out, seg.name); mkdirSync(dir, { recursive: true });
  const t0 = frames[0].t, t1 = frames[frames.length - 1].t, n = Math.floor((t1 - t0) * FPS);
  let j = 0;
  for (let f = 0; f < n; f++) {
    const t = t0 + f / FPS; while (j + 1 < frames.length && frames[j + 1].t <= t) j++;
    writeFileSync(join(dir, String(f + 1).padStart(4, '0') + '.jpg'), Buffer.from(frames[j].data, 'base64'));
  }
  console.log(seg.name, `${frames.length} 原始帧 → ${n} 帧 (${(n / FPS).toFixed(1)}s)`);
  await page.close();
}
await browser.close();
