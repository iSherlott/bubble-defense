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
  id: string;                    // Mesmo id do ItemDef
  modifyDamage?(base: number, tower: BaseTower, ctx: IGameContext): number;
  modifySpeed?(base: number, tower: BaseTower, ctx: IGameContext): number;
  modifyRange?(base: number, tower: BaseTower, ctx: IGameContext): number;
  modifyMagicCharge?(base: number, tower: BaseTower, ctx: IGameContext): number;
  modifyGoldPerKill?(base: number, ctx: IGameContext): number;
  modifyCost?(base: number, tower: BaseTower, ctx: IGameContext): number;
  modifyXp?(base: number, ctx: IGameContext): number;
  modifyLivesLost?(base: number, enemy: BaseEnemy, ctx: IGameContext): number;
  onWaveStart?(ctx: IGameContext): void;
  onWaveComplete?(ctx: IGameContext): void;
  onEnemyKill?(ctx: IGameContext, enemy: BaseEnemy, tower: BaseTower): void;
  onTowerPlace?(ctx: IGameContext, tower: BaseTower): void;
}
```

### Tipos de hook

| Tipo | Quando é chamado | Retorno |
|------|------------------|---------|
| `modifyDamage` | Ao calcular dano de tiro | número (dano final) |
| `modifySpeed` | Ao calcular fire rate | número (rate final) |
| `modifyRange` | Ao calcular alcance | número (range final) |
| `modifyMagicCharge` | Ao calcular ganho de carga | número (charge final) |
| `modifyGoldPerKill` | Ao calcular ouro por kill | número (ouro final) |
| `modifyCost` | Ao calcular custo de torre | número (custo final) |
| `modifyXp` | Ao calcular XP ganho | número (xp final) |
| `modifyLivesLost` | Ao calcular vidas perdidas | número (vidas final) |
| `onWaveStart` | No início de cada wave | void |
| `onWaveComplete` | No fim de cada wave | void |
| `onEnemyKill` | Quando inimigo morre | void |
| `onTowerPlace` | Quando torre é colocada | void |

Hooks `modify*` recebem valor acumulado (pipeline). Se não quer modificar, retorne `base`.

### Onde implementar

1. Crie o efeito em `src/behaviors/ItemEffects.ts`:

```typescript
export const infernoCrownEffect: ItemEffect = {
  id: 'inferno_crown',
  modifyDamage(base: number, tower: BaseTower, ctx: IGameContext): number {
    return tower.def.element === 'fire' ? base * 1.3 : base;
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
