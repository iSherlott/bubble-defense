// ─── AnimationRenderer — draws all active animation instances ─────────────────

import type { AnimationInstance } from '../types/animation';

/**
 * Iterates all live AnimationInstances and delegates drawing to each
 * instance's AnimationDefinition.draw(). Zero hardcoded animation logic.
 */
export class AnimationRenderer {
  render(ctx: CanvasRenderingContext2D, instances: ReadonlyArray<AnimationInstance>): void {
    for (const inst of instances) {
      ctx.save();
      inst.def.draw(ctx, inst);
      ctx.restore();
    }
  }
}
