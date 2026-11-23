/**
 * Giới hạn tốc độ khung hình (Frame Rate Limiter) tối đa 30 FPS
 * Giảm tải tối đa cho laptop GPU tích hợp khi stream TikTok LIVE Studio.
 */
export class FpsLimiter {
  private lastFrameTime = 0;
  private readonly targetFrameInterval: number;
  private isRunning = false;
  private animFrameId: number | null = null;

  constructor(targetFps = 30) {
    this.targetFrameInterval = 1000 / targetFps;
  }

  public start(onTick: (deltaTimeMs: number) => void): void {
    this.isRunning = true;
    this.lastFrameTime = performance.now();

    const loop = (currentTime: number) => {
      if (!this.isRunning) return;

      const delta = currentTime - this.lastFrameTime;
      if (delta >= this.targetFrameInterval) {
        // Trừ bớt phần dư để tránh tích tụ độ trễ
        this.lastFrameTime = currentTime - (delta % this.targetFrameInterval);
        onTick(delta);
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
}

