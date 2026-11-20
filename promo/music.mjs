#!/usr/bin/env node
/* 用代码合成一段柔和的背景音乐（无版权问题）：电钢琴琶音 + 铺底和弦 + 低音 + 简单混响。
 * 用法：node promo/music.mjs <输出.wav> <秒数> */
import { writeFileSync } from 'node:fs';
const [out = 'music.wav', secArg = '40'] = process.argv.slice(2);
const SR = 44100, DUR = +secArg, N = Math.ceil(SR * DUR);
const L = new Float32Array(N), R = new Float32Array(N);
const BPM = 72, beat = 60 / BPM, bar = beat * 4;
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

/* 和弦进行：Cmaj7 → Am7 → Fmaj7 → G6（MIDI 音高） */
const CHORDS = [
  { root: 48, tones: [60, 64, 67, 71] },   // Cmaj7
  { root: 45, tones: [57, 60, 64, 67] },   // Am7
  { root: 41, tones: [57, 60, 64, 65] },   // Fmaj7 (A C E F)
  { root: 43, tones: [59, 62, 67, 64] },   // G6 (B D G E)
];
/* 简单的旋律点缀（每两小节一个短句），音高取自 C 大调五声 */
const MEL = [[0, 76], [1.5, 74], [2, 72], [6, 79], [7, 76], [8.5, 74], [10, 72], [11.5, 69], [12, 72]];

function add(buf, i, v) { if (i >= 0 && i < N) buf[i] += v; }
/* 电钢琴：几个正弦泛音 + 指数衰减，起音很软 */
function epiano(t0, m, vel, len, pan) {
  const f = hz(m), s0 = Math.floor(t0 * SR), n = Math.floor((len + 1.8) * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.012) * Math.exp(-t * 2.2) * (t > len ? Math.exp(-(t - len) * 6) : 1);
    const v = vel * env * (Math.sin(2 * Math.PI * f * t) + 0.28 * Math.exp(-t * 3) * Math.sin(2 * Math.PI * 2 * f * t) + 0.06 * Math.exp(-t * 5) * Math.sin(2 * Math.PI * 3 * f * t));
    add(L, s0 + i, v * (1 - pan)); add(R, s0 + i, v * pan);
  }
}
/* 铺底：慢起慢收的柔和和弦，两个略微走调的正弦叠出合唱感 */
function pad(t0, m, vel, len) {
  const f = hz(m), s0 = Math.floor(t0 * SR), n = Math.floor((len + 1.2) * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 1.1) * (t > len ? Math.max(0, 1 - (t - len) / 1.2) : 1);
    const v = vel * env * 0.5 * (Math.sin(2 * Math.PI * f * 1.003 * t) + Math.sin(2 * Math.PI * f * 0.997 * t + 1));
    add(L, s0 + i, v * 0.55); add(R, s0 + i, v * 0.45);
  }
}
function bass(t0, m, vel, len) {
  const f = hz(m), s0 = Math.floor(t0 * SR), n = Math.floor((len + 0.5) * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR; const env = Math.min(1, t / 0.08) * Math.exp(-t * 0.9) * (t > len ? Math.max(0, 1 - (t - len) / 0.5) : 1);
    const v = vel * env * Math.sin(2 * Math.PI * f * t); add(L, s0 + i, v); add(R, s0 + i, v);
  }
}

const bars = Math.ceil(DUR / bar);
for (let b = 0; b < bars; b++) {
  const ch = CHORDS[b % 4], t = b * bar;
  /* 第一小节只有琶音，第二小节起加铺底，第三小节起加低音：慢慢进来 */
  const arp = [0, 1, 2, 3, 2, 1, 2, 3];
  arp.forEach((ix, k) => epiano(t + k * beat / 2, ch.tones[ix] + 12 * (k === 3 ? 0 : 0), 0.085 * (k % 2 ? 0.75 : 1), beat * 0.9, 0.35 + 0.3 * (ix / 3)));
  if (b >= 1) ch.tones.forEach(m => pad(t, m - 12, 0.03, bar));
  if (b >= 2) { bass(t, ch.root, 0.05, beat * 1.8); bass(t + beat * 2, ch.root + 7, 0.035, beat * 1.6); }
}
/* 旋律从第 3 小节开始，每 4 小节重复一次 */
for (let rep = 0; rep * 4 * bar + 2 * bar < DUR; rep++) MEL.forEach(([bt, m]) => epiano(2 * bar + rep * 4 * bar + bt * beat, m, 0.06, beat * 1.2, 0.5));

/* Schroeder 混响：4 个梳状滤波 + 2 个全通滤波，干湿混合 */
function reverb(x) {
  const y = new Float32Array(N);
  const combs = [1557, 1617, 1491, 1422].map(d => ({ d, buf: new Float32Array(d), i: 0 }));
  for (let n = 0; n < N; n++) { let s = 0; for (const c of combs) { const o = c.buf[c.i]; c.buf[c.i] = x[n] + o * 0.8; c.i = (c.i + 1) % c.d; s += o; } y[n] = s / 4; }
  for (const d of [225, 556]) { const buf = new Float32Array(d); let i = 0; for (let n = 0; n < N; n++) { const o = buf[i]; const v = y[n] + o * 0.5; buf[i] = v; y[n] = o - 0.5 * v; i = (i + 1) % d; } }
  return y;
}
const rl = reverb(L), rr = reverb(R);
/* 低通让声音更软一点（一阶），加淡入淡出，归一化 */
let pl = 0, pr = 0, peak = 0;
const mixL = new Float32Array(N), mixR = new Float32Array(N);
for (let n = 0; n < N; n++) {
  const t = n / SR, fade = Math.min(1, t / 1.5) * Math.min(1, (DUR - t) / 3.5);
  pl += 0.35 * ((L[n] * 0.75 + rl[n] * 0.45) - pl); pr += 0.35 * ((R[n] * 0.75 + rr[n] * 0.45) - pr);
  mixL[n] = pl * fade; mixR[n] = pr * fade; peak = Math.max(peak, Math.abs(mixL[n]), Math.abs(mixR[n]));
}
const g = 0.7 / peak, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) { buf.writeInt16LE(Math.round(mixL[n] * g * 32767), 44 + n * 4); buf.writeInt16LE(Math.round(mixR[n] * g * 32767), 46 + n * 4); }
writeFileSync(out, buf);
console.log('已生成', out, DUR + 's');
