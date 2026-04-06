# Como Adicionar um Novo Item/Relíquia

## Resumo

| Passo | Arquivo | Obrigatório? |
|-------|---------|:---:|
| 1. Definição | `src/content/items.ts` | ✅ |
| 2. Efeito | `src/behaviors/ItemEffects.ts` + `src/content/registerAll.ts` | ✅ |

## Passo 1 — Definição (obrigatório)

Adicione um objeto `ItemDef` ao array `ITEM_DEFS` em `src/content/items.ts`.

### Contrato: ItemDef

```typescript
{
  id: string;                  // ID único, snake_case (ex: 'inferno_crown')
  name: string;                // Nome de display (ex: 'Coroa Infernal')
  icon: string;                // Emoji (ex: '👑')
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;         // Tooltip com efeito
  effectType: string;          // Tipo de efeito (ex: 'damage_boost', 'custom')
  effectValue: number;         // Valor numérico do efeito
}
```

### Raridades e drop

| Raridade | Peso | Visual |
|----------|------|--------|
| `common` | 60% | Sem borda |
| `rare` | 25% | Borda azul |
| `epic` | 12% | Borda roxo |
| `legendary` | 3% | Borda dourada |

### Exemplo

```typescript
{
  id: 'inferno_crown',
  name: 'Coroa Infernal',
  icon: '👑',
  rarity: 'legendary',
  description: '+30% dano para torres de fogo',
  effectType: 'fire_damage_boost',
  effectValue: 0.3,
}
```

## Passo 2 — Efeito (obrigatório)

Todo item precisa de um `ItemEffect` registrado.

### Contrato: ItemEffect

```typescript
export interface ItemEffect {
  id: string;

  // Additive modifier hooks (return the bonus amount to add)
  modifyDamage?(element: ElementType, stacks: number): number;
  modifySpeed?(element: ElementType, stacks: number): number;
  modifyRange?(element: ElementType, stacks: number): number;
  modifyMagicCharge?(element: ElementType, stacks: number): number;
  modifyGoldPerKill?(stacks: number): number;
  modifyCost?(stacks: number): number;
  modifySlowAura?(stacks: number): number;
  modifyWindPush?(stacks: number): number;
  modifyWindStun?(stacks: number): number;
  modifyWaterSlow?(stacks: number): number;
  modifyEarthRadius?(stacks: number): number;

  // Multiplicative damage modifiers (return multiplier, e.g. 1.18)
  modifyHunterDmg?(enemy: BaseEnemy, stacks: number): number;
  modifyBossDmg?(enemy: BaseEnemy, stacks: number): number;

  // Flag-based effects
  hasEffect?(effectId: string): boolean;
  getEffectChance?(effectId: string, stacks: number): number;
  getEffectValue?(effectId: string, stacks: number): number;

  // Event hooks
  onWaveStart?(ctx: IGameContext, stacks: number): void;
  onWaveComplete?(ctx: IGameContext, stacks: number): void;
}
```

### Tipos de hook

| Tipo | Parâmetros | Retorno |
|------|------------|---------|
| `modifyDamage` | `(element, stacks)` | bônus aditivo de dano |
| `modifySpeed` | `(element, stacks)` | bônus aditivo de fire rate |
| `modifyRange` | `(element, stacks)` | bônus aditivo de alcance |
| `modifyMagicCharge` | `(element, stacks)` | bônus aditivo de carga mágica |
| `modifyGoldPerKill` | `(stacks)` | bônus aditivo de ouro |
| `modifyCost` | `(stacks)` | bônus aditivo de custo |
| `modifyHunterDmg` | `(enemy, stacks)` | multiplicador (ex: 1.18) |
| `modifyBossDmg` | `(enemy, stacks)` | multiplicador (ex: 1.15) |
| `hasEffect` | `(effectId)` | boolean — item tem este efeito? |
| `getEffectChance` | `(effectId, stacks)` | chance do efeito (0–1) |
| `getEffectValue` | `(effectId, stacks)` | valor numérico do efeito |
| `onWaveStart` | `(ctx, stacks)` | void |
| `onWaveComplete` | `(ctx, stacks)` | void |

### Onde implementar

1. Crie o efeito em `src/behaviors/ItemEffects.ts`:

```typescript
export const infernoCrownEffect: ItemEffect = {
  id: 'inferno_crown',
  modifyDamage(element: ElementType, stacks: number): number {
    return element === 'fire' ? 0.30 * stacks : 0;
  },
};
```

2. Registre no mapa em `src/content/registerAll.ts`:

```typescript
const itemEffects: Record<string, ItemEffect> = {
  // ...existentes...
  inferno_crown: infernoCrownEffect,  // ← adicionar aqui
};
```

**A chave deve ser exatamente `itemDef.id`.**

### Exemplos de efeitos existentes

| ID | Tipo | Efeito |
|----|------|--------|
| `ember_sentry` | modifyDamage | ×1.12 para torres de fogo |
| `tide_drop` | modifyRange | +20% para torres de água |
| `runic_pebble` | modifyDamage + modifyMagicCharge | +8% dano + +10% carga |
| `goblin_throne` | modifyGoldPerKill | +1 ouro por kill |
| `crystal_prism` | modifyDamage | +40% dano para torres nível max |
| `chrono_shard` | modifySpeed | +20% fire rate |
| `soul_lantern` | onEnemyKill | +2% dano por kill cumulativo |

## Quando o item é oferecido

Itens são oferecidos ao fim de cada wave via `RewardSystem`.
- O jogador escolhe 1 entre N opções (baseado no nível)
- Itens ficam no inventário permanente (`ctx.items`)
- Todos os hooks ativos são aplicados automaticamente pela pipeline de combat/economy

## Checklist Final

- [ ] `ItemDef` adicionado em `src/content/items.ts`
- [ ] `ItemEffect` implementado em `src/behaviors/ItemEffects.ts`
- [ ] Efeito registrado no mapa `itemEffects` em `src/content/registerAll.ts`
- [ ] Chave no mapa = `itemDef.id`
- [ ] Build passa: `npx tsc --noEmit`
- [ ] Testado in-game: item aparece como recompensa, efeito aplica corretamente
