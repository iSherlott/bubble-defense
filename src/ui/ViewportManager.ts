// ─── ViewportManager — responsive canvas scaling + DPR ───────────────────────
// Centralises all viewport/scaling logic. The game renders at its logical
// resolution; CSS transform scales the canvas to fill the window.
// DPR backing ensures crisp text/icons on HiDPI displays.

export class ViewportManager {
  private canvas: HTMLCanvasElement;
  private container: HTMLElement;

  /** CSS scale applied to the canvas element (fit-to-window) */
  cssScale = 1;
  /** Device pixel ratio (1 on standard, 2 on retina, etc.) */
  dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.container = canvas.parentElement ?? document.body;

    window.addEventListener('resize', () => this.refresh());
    // Respond to DPR changes (e.g. dragging window to a different monitor)
    window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      .addEventListener('change', () => this.refresh());
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /** Call after every canvas.width / canvas.height change (e.g. map resize). */
  refresh() {
    const newDpr = Math.min(window.devicePixelRatio || 1, 3);
    if (newDpr !== this.dpr) {
      this.dpr = newDpr;
      // Re-derive logical size from CSS style (stable across DPR changes)
      const logW = parseFloat(this.canvas.style.width)  || 800;
      const logH = parseFloat(this.canvas.style.height) || 600;
      this.canvas.width  = logW * this.dpr;
      this.canvas.height = logH * this.dpr;
      const ctx = this.canvas.getContext('2d');
      if (ctx) ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    this.fitToWindow();
  }

  /** Toggle browser fullscreen on the game container. */
  toggleFullscreen() {
    const el = this.container;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {/* user denied */});
    } else {
      document.exitFullscreen?.();
    }
  }

  get isFullscreen(): boolean {
    return !!document.fullscreenElement;
  }

  // ─── Internals ──────────────────────────────────────────────────────────────

  private fitToWindow() {
    const pad = 16; // breathing room
    const availW = window.innerWidth  - pad;
    const availH = window.innerHeight - pad;

    // Logical canvas dimensions (CSS pixels, before DPR)
    const logW = parseFloat(this.canvas.style.width)  || (this.canvas.width / this.dpr);
    const logH = parseFloat(this.canvas.style.height) || (this.canvas.height / this.dpr);

    const scaleX = availW / logW;
    const scaleY = availH / logH;
    this.cssScale = Math.min(scaleX, scaleY, 1.8); // cap so it never over-zooms on huge screens
    // Ensure a minimum scale that keeps things readable
    this.cssScale = Math.max(this.cssScale, 0.5);

    this.canvas.style.transform = `scale(${this.cssScale})`;
    this.canvas.style.transformOrigin = 'center center';
  }

  /**
   * Initialise canvas dimensions (called once after logical size is set).
   * Sets CSS size, applies DPR backing, then fits to window.
   */
  init(logicalW: number, logicalH: number) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);

    // Backing store: multiply by DPR for crisp rendering
    this.canvas.width  = logicalW * this.dpr;
    this.canvas.height = logicalH * this.dpr;

    // CSS size: logical pixels
    this.canvas.style.width  = `${logicalW}px`;
    this.canvas.style.height = `${logicalH}px`;

    // Scale context so all drawing uses logical coordinates
    const ctx = this.canvas.getContext('2d');
    if (ctx) ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.fitToWindow();
  }
}
