# Como Adicionar um Novo Inimigo

## Resumo

| Passo | Arquivo | Obrigatório? |
|-------|---------|:---:|
| 1. Definição | `src/content/enemies.ts` | ✅ |
| 2. Behavior | `src/behaviors/EnemyBehaviors.ts` + `src/content/registerAll.ts` | Opcional |
| 3. Render profile | `src/content/enemyRenderProfiles.ts` | Opcional |
| 4. Spawn pool | `src/content/waveRules.ts` | ✅ |

## Passo 1 — Definição (obrigatório)

Adicione um objeto `EnemyDef` ao array correspondente em `src/content/enemies.ts`:
- `ENEMY_DEFS` — inimigos padrão
- `BOSS_DEFS` — bosses (`isBoss: true`)
- `GOLEM_DEFS` — golems (`golemType: ElementType`)

### Contrato: EnemyDef

```typescript
{
  id: string;                    // ID único, snake_case (ex: 'wraith')
  name: string;                  // Nome de display (ex: 'Espectro')
  baseHp: number;                // HP base (escalado por wave)
  speed: number;                 // Velocidade em pixels/s
  agility: number;               // Chance de esquiva (0~20)
  immune: ElementType;           // Elemento ao qual é imune
  halfElements: [ElementType, ElementType]; // Elementos que causam ½ dano
  color: string;                 // Cor hex (ex: '#aaaaff')
  size: number;                  // Raio em pixels (8~40)
  baseLivesLost: number;         // Vidas perdidas ao escapar (1~5)
  reward: number;                // Ouro ao morrer
  xp: number;                    // XP ao morrer
  description: string;           // Tooltip
  isBoss?: boolean;              // true → cria BossEnemy
  golemType?: ElementType;       // se definido → cria GolemEnemy
  behaviorIds?: string[];        // IDs de behaviors especiais
  renderProfileId?: string;      // ID do render profile (default: id)
}
```

### Exemplo: Inimigo padrão

```typescript
// Em ENEMY_DEFS:
{
  id: 'wraith',
  name: 'Espectro',
  baseHp: 150, speed: 120, agility: 8,
  immune: 'wind', halfElements: ['water', 'earth'],
  color: '#aaaaff', size: 15,
  baseLivesLost: 1, reward: 25, xp: 8,
  description: 'Criatura etérea, rápida e resistente ao vento.',
}
```

### Exemplo: Boss com behavior

```typescript
// Em BOSS_DEFS:
{
  id: 'boss_wraith_lord',
  name: 'Senhor Espectral',
  baseHp: 2000, speed: 60, agility: 15,
  immune: 'wind', halfElements: ['water', 'earth'],
  color: '#7777ff', size: 38,
  baseLivesLost: 5, reward: 200, xp: 80,
  description: 'Boss espectral que invoca wraiths.',
  isBoss: true,
  behaviorIds: ['summon_adds'],
}
```

**Registro automático**: `registerAll.ts` itera todos os arrays e registra no `enemyRegistry`.

## Passo 2 — Behavior especial (opcional)

Se o inimigo precisa de lógica especial por frame (invocar adds, escudo, trilha de fogo), crie um behavior.

### Contrato: EnemyBehavior

```typescript
export interface EnemyBehavior {
  id: string;                    // ID único (ex: 'phase_shift')
  onUpdate?(ctx: IGameContext, enemy: BaseEnemy, dt: number): void;
}
```

### Onde implementar

1. Crie a classe em `src/behaviors/EnemyBehaviors.ts`:

```typescript
export class PhaseShiftBehavior implements EnemyBehavior {
  id = 'phase_shift';
  onUpdate(ctx: IGameContext, enemy: BaseEnemy, dt: number): void {
    // Lógica por frame
  }
}
```

2. Registre em `src/content/registerAll.ts` (seção de enemy behaviors):

```typescript
registerEnemyBehavior(new PhaseShiftBehavior());
```

3. Referencie no `EnemyDef`:

```typescript
behaviorIds: ['phase_shift'],
```

### Behaviors existentes

| ID | Classe | Efeito |
|----|--------|--------|
| `summon_adds` | `SummonAddsBehavior` | Invoca adds a cada 25% HP perdido |
| `fire_trail` | `FireTrailBehavior` | Cria burn zones no caminho |
| `shield_phase` | `ShieldPhaseBehavior` | Fase de invencibilidade temporária |

## Passo 3 — Render profile (opcional)

Se o inimigo precisa de visual customizado além de um círculo colorido.

### Contrato: EnemyDrawFn

```typescript
type EnemyDrawFn = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number,    // posição central
  r: number,               // raio
  color: string,           // cor do EnemyDef
  isBoss: boolean,
) => void;
```

### Onde registrar

Em `src/content/enemyRenderProfiles.ts`:

```typescript
registerEnemyRenderProfile('wraith', (ctx, x, y, r, color, isBoss) => {
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
});
```

### Cadeia de fallback

O `EntityRenderer` procura na ordem:
1. `def.renderProfileId` (se definido)
2. `def.id` (ex: `'wraith'`)
3. Base type sem sufixo (ex: `'golem'` para `'golem_fire'`)
4. Círculo preenchido (default)

Se o visual padrão (círculo com `def.color`) é suficiente, não precisa registrar profile.

## Passo 4 — Spawn pool (obrigatório)

Adicione ao pool de spawn em `src/content/waveRules.ts`:

```typescript
spawnPool: [
  // ...existentes...
  { typeId: 'wraith', fromWave: 18 },
]
```

- `typeId` deve corresponder ao `id` do `EnemyDef`
- `fromWave` define a onda a partir da qual o inimigo pode aparecer

Para bosses, use a seção `bossPool`:

```typescript
bossPool: [
  { typeId: 'boss_wraith_lord', fromWave: 30 },
]
```

## Checklist Final

- [ ] `EnemyDef` adicionado em `src/content/enemies.ts`
- [ ] Behavior implementado e registrado (se necessário)
- [ ] Render profile registrado (se visual customizado)
- [ ] Adicionado ao spawn pool em `src/content/waveRules.ts`
- [ ] Build passa: `npx tsc --noEmit`
- [ ] Testado in-game: inimigo aparece, morre, dá reward
