#!/usr/bin/env node
/* 逐帧渲染 promo.html → MP4（带背景音乐）。
 * 用法：node promo/render.mjs <录屏帧目录> <音乐.wav> <输出.mp4>
 * 需要 puppeteer-core 和 ffmpeg（环境变量 FFMPEG 指定路径，默认用 PATH 里的 ffmpeg）。 */
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [framesDir, music, out] = process.argv.slice(2).map(p => resolve(p));
const FPS = 30, DUR = 39, FF = process.env.FFMPEG || 'ffmpeg';
const exe = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].filter(Boolean).find(p => existsSync(p));
const count = Object.fromEntries(['search', 'chart', 'bubble'].map(n => [n, readdirSync(join(framesDir, n)).length]));
const extra = join(here, '..', 'docs', 'shot-window.png');
const url = pathToFileURL(join(here, 'promo.html')).href + '?' + new URLSearchParams({
  frames: pathToFileURL(framesDir).href, count: JSON.stringify(count), extra: existsSync(extra) ? pathToFileURL(extra).href : '' });

const ff = spawn(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-i', music, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  '-af', 'loudnorm=I=-20:TP=-2,afade=t=out:st=' + (DUR - 3) + ':d=3', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-shortest', out], { stdio: ['pipe', 'inherit', 'inherit'] });

const browser = await puppeteer.launch({ executablePath: exe, headless: true, defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 } });
const page = await browser.newPage();
await page.goto(url);
await page.evaluate(() => document.fonts.ready);
const N = DUR * FPS;
for (let f = 0; f < N; f++) {
  await page.evaluate(t => render(t), f / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 92, captureBeyondViewport: false });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 150 === 0) console.log(`帧 ${f}/${N}`);
}
ff.stdin.end();
await browser.close();
await new Promise(r => ff.on('close', r));
console.log('已生成', out);
