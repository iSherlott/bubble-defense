# Como Adicionar uma Nova Fusão

## Resumo

| Passo | Arquivo | Obrigatório? |
|-------|---------|:---:|
| 1. Definição | `src/content/fusions.ts` | ✅ |
| 2. Behavior | `src/behaviors/FusionBehaviors.ts` + `src/content/registerAll.ts` | ✅ |

## Passo 1 — Definição (obrigatório)

Adicione um objeto `FusionDef` ao array `FUSION_DEFS` em `src/content/fusions.ts`.

### Contrato: FusionDef

```typescript
{
  id: string;                      // ID único (ex: 'earth+fire')
  name: string;                    // Nome de display (ex: 'Magma')
  primaryElement: ElementType;     // Elemento da torre primária
  secondaryElement: ElementType;   // Elemento da torre secundária
  icon: string;                    // Emoji (ex: '🌋')
  color: string;                   // Cor hex para visuais
  description: string;             // Tooltip curto
  magicDamageMult: number;         // Multiplicador de dano mágico (1.0~3.0)
  magicBarMaxMult?: number;        // Multiplicador da barra de magic (default: 1.0)
  specialEffect: string;           // ID do behavior — DEVE existir no mapa de behaviors
}
```

### Convenção de nomes

- `id`: `"<primary>+<secondary>"` (ex: `'earth+fire'`)
- `specialEffect`: snake_case descritivo (ex: `'magma_pool'`, `'chain_lightning'`)

### Exemplo

```typescript
{
  id: 'fire+water',
  name: 'Vapor',
  primaryElement: 'fire',
  secondaryElement: 'water',
  icon: '♨️',
  color: '#ccaaff',
  description: 'Explosão de vapor que atordoa inimigos.',
  magicDamageMult: 1.9,
  specialEffect: 'steam_blast',
}
```

### Requisito de fusão

Para que a fusão aconteça em jogo:
- 2 torres na mesma célula (primária + secundária)
- Ambas no nível máximo
- Torre primária **não** pode já ser uma fusão
- Par de elementos registrado no `FusionRegistry`

## Passo 2 — Behavior (obrigatório)

Toda fusão precisa de um behavior registrado. Se o efeito é parecido com um existente, reutilize (ex: `AoeFusionBehavior`).

### Contrato: FusionBehavior

```typescript
export interface FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void;
}
```

Parâmetros:
- `ctx` — contexto do jogo
- `tower` — torre fusionada
- `fusion` — definição da fusão (cores, elementos, mult)
- `baseDmg` — dano base já calculado (inclui `magicDamageMult`)
- `extra` — array onde push projéteis criados

### Behaviors existentes (reutilizáveis)

| specialEffect | Classe | Efeito |
|---------------|--------|--------|
| `magma_pool` | `AoeFusionBehavior(true)` | AoE + burn on hit |
| `fireball_aoe` | `AoeFusionBehavior(true)` | AoE + burn |
| `sandstorm` | `AoeFusionBehavior(false)` | AoE sem burn |
| `tornado` | `AoeFusionBehavior(false)` | AoE sem burn |
| `inferno` | `InfernoFusionBehavior` | Single target + burn zone |
| `steam` | `StunFusionBehavior(3, 1.5)` | Stun 3 alvos por 1.5s |
| `blizzard` | `BlizzardFusionBehavior` | AoE stun + slow |
| `chain_lightning` | `LightningFusionBehavior` | Chain 5 alvos |
| `tsunami` | `TsunamiFusionBehavior` | Push em todos |
| `slow_puddle` | `SlowPuddleFusionBehavior` | Puddle persistente |
| `solar_core` | `SolarCoreFusionBehavior` | AoE + burn zone |
| `abyssal_vortex` | `AbyssalVortexFusionBehavior` | AoE + 3 stacks slow |
| `primal_quake` | `PrimalQuakeFusionBehavior` | Tremor global |
| `eternal_hurricane` | `EternalHurricaneFusionBehavior` | Push + stun em range 1.5× |

### Onde implementar behavior customizado

1. Crie a classe em `src/behaviors/FusionBehaviors.ts`:

```typescript
export class SteamBlastBehavior implements FusionBehavior {
  execute(ctx: IGameContext, tower: BaseTower, fusion: FusionDef, baseDmg: number, extra: ProjectileData[]): void {
    const targets = tower.findAllInRange(ctx.enemies);
    if (targets.length === 0) return;
    for (const t of targets) {
      extra.push(createProjectile({
        towerId: tower.id,
        startX: tower.pixelX, startY: tower.pixelY,
        targetEnemyId: t.id,
        damage: baseDmg, element: fusion.primaryElement,
        color: fusion.color, isMagic: true,
        components: [
          { element: fusion.primaryElement, amount: baseDmg * 0.6 },
          { element: fusion.secondaryElement, amount: baseDmg * 0.4 },
        ],
      }));
      t.stunRemaining = Math.max(t.stunRemaining, 1.2);
    }
    ctx.triggerAoeFlash(targets[0].pos.x, targets[0].pos.y, tower.getRange() * 0.8);
  }
}
```

2. Registre no mapa de behaviors em `src/content/registerAll.ts`:

```typescript
const fusionBehaviors: Record<string, FusionBehavior> = {
  magma_pool: new AoeFusionBehavior(true),
  // ...existentes...
  steam_blast: new SteamBlastBehavior(),  // ← adicionar aqui
};
```

**O `specialEffect` do FusionDef deve corresponder exatamente à chave no mapa.**

## Renderização

Fusões são renderizadas automaticamente:
- Aura colorida com `fusion.color` ao redor da torre
- Ícone `fusion.icon` no tooltip e popup
- Projéteis com dual-color (anel externo do segundo elemento)
- Animações via `ctx.triggerAoeFlash()` ou `ctx.animations.request()`

## Checklist Final

- [ ] `FusionDef` adicionado em `src/content/fusions.ts`
- [ ] Behavior implementado em `src/behaviors/FusionBehaviors.ts`
- [ ] Behavior registrado no mapa `fusionBehaviors` em `src/content/registerAll.ts`
- [ ] `specialEffect` coincide com a chave no mapa
- [ ] Build passa: `npx tsc --noEmit`
- [ ] Testado in-game: 2 torres max level na mesma célula → botão de fusão aparece → fusão funciona
