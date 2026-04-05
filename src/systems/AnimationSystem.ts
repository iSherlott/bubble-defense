import type { AnimationRequest, AnimationInstance } from '../types/animation';
import { getAnimationDef } from '../registries/AnimationRegistry';

/**
 * AnimationSystem — manages the lifecycle of pluggable visual animations.
 *
 * Flow: request(req) → registry lookup → AnimationInstance created → update(dt) ticks → renderer draws → instance dies.
 * Each AnimationInstance carries a back-reference to its AnimationDefinition, which owns the draw() logic.
 */
export class AnimationSystem {
  private instances: AnimationInstance[] = [];

  /**
   * Request a new animation by ID.
   * Looks up the AnimationDefinition in the registry.
   * Silently ignores unknown IDs (graceful degradation).
   */
  request(req: AnimationRequest): void {
    const def = getAnimationDef(req.id);
    if (!def) return;  // unknown animation — skip silently

    this.instances.push({
      def,
      sourceX: req.sourceX,
      sourceY: req.sourceY,
      targetX: req.targetX ?? req.sourceX,
      targetY: req.targetY ?? req.sourceY,
      duration: req.duration ?? def.defaultDuration,
      radius: req.radius ?? 0,
      elapsed: 0,
      progress: 0,
      color: req.color ?? '#ffffff',
      secondaryColor: req.secondaryColor ?? req.color ?? '#ffffff',
      payload: req.payload ?? {},
    });
  }

  /** Tick all active instances, removing expired ones */
  update(dt: number): void {
    for (const inst of this.instances) {
      inst.elapsed += dt;
      inst.progress = Math.min(1, inst.elapsed / inst.duration);
    }
    this.instances = this.instances.filter(i => i.progress < 1);
  }

  /** Get all currently active animation instances */
  getActive(): ReadonlyArray<AnimationInstance> {
    return this.instances;
  }

  /** Get active instances filtered by animation ID */
  getByType(id: string): ReadonlyArray<AnimationInstance> {
    return this.instances.filter(i => i.def.id === id);
  }

  /** Remove all active animations */
  clear(): void {
    this.instances = [];
  }
}
