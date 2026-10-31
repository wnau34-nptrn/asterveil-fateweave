// W8 on-device measurement (UNIT_ANIMATION_ROLLOUT_TH.md §7): open the game with `?perf=1` on a phone. A small panel shows
// how long each field takes to become ready (Start enabled), frame pacing while the battle view is visible (slow frames and
// stalls), the textures the battle holds, and JS heap where the browser exposes it. "คัดลอกผล" copies a JSON report for the owner
// to send back. Loaded only behind the flag (dynamic import); it reads state and never touches battle input, rules or saves.
import type Phaser from 'phaser';

export interface PerfProbeTarget { game: Phaser.Game; textures: () => Phaser.Textures.TextureManager | undefined }
interface FieldSample { at: number; readyMs: number }
const SLOW = 50, STALL = 100; // ms: a frame over 50ms is visibly slow, over 100ms a stall
const MiB = 1048576;

export function startPerfProbe(target: PerfProbeTarget): void {
  const t0 = performance.now();
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const fields: FieldSample[] = [];
  let frames: number[] = [], last = 0, waitingSince: number | undefined, wasEnabled = false, peakTextures = 0, peakHeap = 0;
  const firstReady = { title: undefined as number | undefined, field: undefined as number | undefined };
  const battleVisible = () => !document.querySelector('#battle-view')?.classList.contains('view-off') && document.visibilityState === 'visible';
  const startButton = () => document.querySelector<HTMLButtonElement>('#start');
  const textureBytes = () => {
    const manager = target.textures(); if (!manager) return 0;
    let n = 0;
    for (const key of manager.getTextureKeys()) for (const src of manager.get(key).source) n += src.width * src.height * 4;
    return n;
  };
  const heap = () => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;

  const tick = (now: number) => {
    if (battleVisible()) { if (last) frames.push(now - last); last = now; } else last = 0;
    if (frames.length > 20000) frames = frames.slice(-10000);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  // Field readiness: the time from the Start button appearing disabled ("กำลังเตรียมสนาม…") to it becoming enabled.
  setInterval(() => {
    if (firstReady.title === undefined && (window as unknown as { __fateweaveReady?: boolean }).__fateweaveReady) firstReady.title = performance.now();
    const button = startButton(), enabled = !!button && !button.disabled;
    if (button && !enabled && waitingSince === undefined) waitingSince = performance.now();
    if (enabled && !wasEnabled && waitingSince !== undefined) {
      const now = performance.now(); fields.push({ at: Math.round(now - t0), readyMs: Math.round(now - waitingSince) });
      firstReady.field ??= now; waitingSince = undefined;
    }
    if (!button) waitingSince = undefined;
    wasEnabled = enabled;
    peakTextures = Math.max(peakTextures, textureBytes()); peakHeap = Math.max(peakHeap, heap() ?? 0);
    render();
  }, 100);

  const stats = () => {
    const sorted = [...frames].sort((a, b) => a - b), total = frames.reduce((s, f) => s + f, 0);
    const p = (q: number) => sorted.length ? Math.round(sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]! * 10) / 10 : 0;
    return { frames: frames.length, seconds: Math.round(total / 100) / 10, fps: total ? Math.round(frames.length / total * 10000) / 10 : 0,
      p50: p(.5), p95: p(.95), worst: Math.round(sorted.at(-1) ?? 0), slow: frames.filter(f => f > SLOW).length, stalls: frames.filter(f => f > STALL).length };
  };
  const report = () => {
    const renderer = target.game.renderer as unknown as { type?: number; gl?: WebGLRenderingContext };
    const gl = renderer.gl, debug = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
      version: 1, when: new Date().toISOString(), url: location.href.split('?')[0], userAgent: navigator.userAgent,
      screen: { width: screen.width, height: screen.height, dpr: devicePixelRatio, viewport: [innerWidth, innerHeight] },
      renderer: renderer.type === 2 ? 'WebGL' : 'Canvas', gpu: debug && gl ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : undefined,
      canvas: [target.game.canvas.width, target.game.canvas.height],
      startup: { domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : undefined, titleReadyMs: firstReady.title && Math.round(firstReady.title),
        firstFieldReadyMs: firstReady.field && Math.round(firstReady.field) },
      fields, frames: stats(),
      memory: { texturesMiB: +(textureBytes() / MiB).toFixed(1), peakTexturesMiB: +(peakTextures / MiB).toFixed(1),
        heapMiB: heap() !== undefined ? +(heap()! / MiB).toFixed(1) : 'ไม่รองรับในเบราว์เซอร์นี้', peakHeapMiB: peakHeap ? +(peakHeap / MiB).toFixed(1) : undefined },
    };
  };

  const panel = document.createElement('aside');
  panel.className = 'perf-probe'; panel.setAttribute('aria-label', 'ผลวัดประสิทธิภาพ');
  panel.style.cssText = 'position:fixed;left:4px;top:4px;z-index:2147483000;max-width:min(92vw,340px);font:12px/1.35 system-ui,sans-serif;color:#eaf2ff;background:rgba(10,18,40,.86);border:1px solid #5b7bd0;border-radius:8px;padding:6px 8px;pointer-events:auto';
  const body = document.createElement('pre'); body.style.cssText = 'margin:0 0 6px;white-space:pre-wrap;font:inherit';
  const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
  const button = (label: string, run: () => void) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    b.style.cssText = 'min-height:44px;min-width:44px;padding:0 10px;border-radius:6px;border:1px solid #7f9be6;background:#1d2d5c;color:#fff;font:inherit';
    b.addEventListener('click', e => { e.stopPropagation(); run(); }); row.append(b); return b;
  };
  let open = true;
  const copy = button('คัดลอกผล', () => {
    const text = JSON.stringify(report(), null, 1);
    const done = () => { copy.textContent = 'คัดลอกแล้ว'; setTimeout(() => { copy.textContent = 'คัดลอกผล'; }, 1500); };
    if (navigator.clipboard) void navigator.clipboard.writeText(text).then(done, () => fallback(text)); else fallback(text);
  });
  button('ล้างเฟรม', () => { frames = []; last = 0; });
  const toggle = button('ย่อ', () => { open = !open; body.hidden = !open; toggle.textContent = open ? 'ย่อ' : 'ขยาย'; });
  const fallback = (text: string) => {
    const area = document.createElement('textarea'); area.value = text; area.style.cssText = 'width:100%;height:160px;font:11px monospace'; panel.append(area); area.select();
  };
  panel.append(body, row); document.body.append(panel);
  function render(): void {
    if (!open) return;
    const r = report(), f = r.frames, lastField = r.fields.at(-1);
    body.textContent = [
      `เริ่มเกม ${r.startup.titleReadyMs ?? '…'} ms · สนามแรกพร้อม ${r.startup.firstFieldReadyMs ?? '…'} ms`,
      `เตรียมสนามล่าสุด ${lastField ? `${lastField.readyMs} ms` : '…'} (${r.fields.length} ครั้ง)`,
      `เฟรมในศึก ${f.frames} (${f.seconds}s) · ${f.fps} fps · p95 ${f.p95} ms`,
      `ช้า>${SLOW}ms ${f.slow} · กระตุก>${STALL}ms ${f.stalls} · แย่สุด ${f.worst} ms`,
      `texture ${r.memory.texturesMiB} MiB (สูงสุด ${r.memory.peakTexturesMiB}) · heap ${r.memory.heapMiB}`,
      `${r.renderer} · ${r.canvas.join('×')} · dpr ${r.screen.dpr}`,
    ].join('\n');
  }
}
