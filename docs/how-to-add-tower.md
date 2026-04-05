# Como Adicionar uma Nova Torre

## Resumo

| Passo | Arquivo | Obrigatório? |
|-------|---------|:---:|
| 1. Definição | `src/content/towers.ts` | ✅ |
| 2. Magic behavior | `src/behaviors/MagicBehaviors.ts` + `src/content/registerAll.ts` | Opcional (default = elemento) |
| 3. Constantes visuais | `src/content/elements.ts` | Só se novo elemento |

## Passo 1 — Definição (obrigatório)

Adicione um objeto `TowerDef` ao array `TOWER_DEFS` em `src/content/towers.ts`.

### Contrato: TowerDef

```typescript
{
  id: string;                    // ID único (ex: 'fire')
  name: string;                  // Nome de display (ex: 'Torre de Fogo')
  element: ElementType;          // Elemento ('fire' | 'water' | 'earth' | 'wind')
  baseDamage: number;            // Dano por tiro
  baseRange: number;             // Alcance em pixels
  baseFireRate: number;          // Tiros por segundo (1.0 = 1 tiro/s)
  baseCost: number;              // Custo base em ouro
  color: string;                 // Cor hex do corpo
  accentColor: string;           // Cor hex do contorno/brilho
  magicBarMax: number;           // Carga necessária para magia
  magicBarGain: number;          // Carga ganha por tiro
  magicBaseDamage: number;       // Dano base da magia
  description: string;           // Tooltip
  magicDescription?: string;     // Label curta da magia (ex: '✨ 3-alvo')
  magicBehaviorId?: string;      // ID do magic behavior (default: element)
}
```

### Exemplo

```typescript
{
  id: 'fire',
  name: 'Torre de Fogo',
  element: 'fire',
  baseDamage: 30, baseRange: 140, baseFireRate: 1.0, baseCost: 50,
  color: '#aa3300', accentColor: '#ff8844',
  magicBarMax: 100, magicBarGain: 15, magicBaseDamage: 55,
  description: 'Ataque normal. Magia: 3 bolas (1º, meio, último do range).',
  magicDescription: '✨ 3-alvo',
}
```

**Registro automático**: `registerAll.ts` itera `TOWER_DEFS` e registra cada torre no `towerRegistry`. O `magicBehaviorId` (default = `element`) é resolvido automaticamente para o behavior correspondente.

## Passo 2 — Magic Behavior (opcional)

Se a torre precisa de magia diferente do padrão do seu elemento.

### Contrato: MagicBehavior

```typescript
export interface MagicBehavior {
  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void;
}
```

Parâmetros:
- `ctx` — contexto do jogo (inimigos, efeitos, animações)
- `tower` — torre que está lançando (posição, range, dano)
- `affM` — multiplicador de afinidade do jogador
- `extra` — array onde push novos projéteis

### Behaviors existentes

| ID | Classe | Efeito |
|----|--------|--------|
| `fire` | `FireMagicBehavior` | 3 projéteis (primeiro, meio, último no range) |
| `water` | `WaterMagicBehavior` | Alvo único + slow permanente |
| `earth` | `EarthMagicBehavior` | Alvo único + dano AoE |
| `wind` | `WindMagicBehavior` | Alvo único + knockback |

### Onde implementar

1. Crie a classe em `src/behaviors/MagicBehaviors.ts`:

```typescript
export class CustomMagicBehavior implements MagicBehavior {
  cast(ctx: IGameContext, tower: BaseTower, affM: number, extra: ProjectileData[]): void {
    const dmg = tower.getMagicDamage(ctx.player.stats, affM);
    const target = tower.findTarget(ctx.enemies);
    if (!target) return;
    extra.push(createProjectile({
      towerId: tower.id,
      startX: tower.pixelX, startY: tower.pixelY,
      targetEnemyId: target.id,
      damage: dmg, element: tower.def.element,
      color: tower.def.color, isMagic: true,
    }));
  }
}
```

2. Registre em `src/content/registerAll.ts` (seção de magic behaviors):

```typescript
registerMagicBehavior('custom_magic', new CustomMagicBehavior());
```

3. Referencie no `TowerDef`:

```typescript
magicBehaviorId: 'custom_magic',
```

Se `magicBehaviorId` não é definido, o sistema usa `element` como ID do behavior (ex: torre de fogo → `'fire'` → `FireMagicBehavior`).

## Renderização

Torres são renderizadas automaticamente pelo `EntityRenderer.drawTower()`:
- Corpo: círculo com `def.color`
- Contorno: `def.accentColor`
- Ícone: emoji do elemento (`ELEMENT_ICONS[def.element]`)
- Barra de magia: arco colorido pelo elemento
- Badge de nível
- Aura de fusão (se fusionada)

Não há sistema de render profiles para torres — todas usam o mesmo template visual.

## Custo e Economia

- `baseCost` é o custo da primeira torre desse tipo
- Custo escala: `baseCost × (count + 1)` onde count = torres desse tipo já existentes
- Segunda torre na mesma célula custa 2×
- Descontos de itens aplicados automaticamente via `TowerService.towerCost()`

## Checklist Final

- [ ] `TowerDef` adicionado em `src/content/towers.ts`
- [ ] Magic behavior implementado e registrado (se customizado)
- [ ] Build passa: `npx tsc --noEmit`
- [ ] Testado in-game: torre aparece na sidebar, pode ser colocada, ataca, usa magia
