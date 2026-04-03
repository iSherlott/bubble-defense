// ─── TalentTree — backward-compat shim over the new SkillTree ─────────────────
// All existing code that uses TalentTree continues to work.
// New code should use SkillTree directly.

export { SkillTree as TalentTree } from './SkillTree';
export { SkillTree } from './SkillTree';
