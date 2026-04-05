import type { AnimationRequest, ActiveAnimation, IAnimationProvider } from '../animations/types';

/**
 * AnimationSystem — manages visual animations decoupled from gameplay logic.
 *
 * Behaviors and systems emit animation requests via play().
 * The system ticks elapsed time and expires completed animations.
 * Renderers query getActive() / getByType() to draw what's live.
 */
export class AnimationSystem implements IAnimationProvider {
  private animations: ActiveAnimation[] = [];

  /** Queue a new animation */
  play(req: AnimationRequest): void {
    this.animations.push({
      id: req.id,
      sourceX: req.sourceX,
      sourceY: req.sourceY,
      targetX: req.targetX ?? req.sourceX,
      targetY: req.targetY ?? req.sourceY,
      duration: req.duration,
      radius: req.radius ?? 0,
      elapsed: 0,
      progress: 0,
      color: req.color ?? '#ffffff',
      secondaryColor: req.secondaryColor ?? req.color ?? '#ffffff',
      payload: req.payload ?? {},
    });
  }

  /** Tick all active animations, removing expired ones */
  update(dt: number): void {
    for (const anim of this.animations) {
      anim.elapsed += dt;
      anim.progress = Math.min(1, anim.elapsed / anim.duration);
    }
    this.animations = this.animations.filter(a => a.progress < 1);
  }

  /** Get all currently active animations */
  getActive(): ReadonlyArray<ActiveAnimation> {
    return this.animations;
  }

  /** Get active animations filtered by type */
  getByType(id: string): ReadonlyArray<ActiveAnimation> {
    return this.animations.filter(a => a.id === id);
  }

  /** Remove all active animations */
  clear(): void {
    this.animations = [];
  }
}
