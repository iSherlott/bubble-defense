# Arquitetura — bubble-defense

## Visão Geral

Tower defense em canvas 2D com mecânicas elementais (fogo, água, terra, vento), fusão de torres, sistema de itens/relíquias, árvore de talentos e progressão por ondas.

## Camadas

```
src/
├── config/       Parâmetros de balanceamento (CombatConfig, EconomyConfig, etc.)
├── constants/    Constantes globais (CELL_SIZE, BASE_LIVES, etc.)
├── types/        Interfaces e tipos compartilhados (index.ts, wave.ts, animation.ts)
├── content/      Definições data-driven (torres, inimigos, fusões, itens, animações, wave rules)
├── registries/   Registros centrais (TowerRegistry, EnemyRegistry, FusionRegistry, ItemRegistry, AnimationRegistry)
├── factories/    Criação de instâncias (TowerFactory, EnemyFactory, ProjectileFactory)
├── entities/     Objetos de domínio (BaseTower, BaseEnemy, BaseEntity, subclasses)
├── behaviors/    Estratégias plugáveis (MagicBehaviors, EnemyBehaviors, FusionBehaviors, ItemEffects)
├── systems/      Lógica de gameplay por frame (CombatSystem, AnimationSystem, WaveManager, MapGenerator, etc.)
├── services/     Serviços de aplicação (TowerService, DebugService, SaveSystem)
├── player/       Progressão do jogador (Player, SkillTree, TalentTree)
├── core/         Interface central (GameContext — contrato entre camadas)
├── game/         Orquestração (Game.ts, GameFlowController, GameInputController)
└── ui/           Renderização pura (Renderer, GameRenderer, sub-renderers)
```

## Padrões Arquiteturais

### Registry + Blueprint
Cada tipo de conteúdo tem:
- **Definição** (`*Def`) — dados puros em `content/`
- **Blueprint** — definição + behavior(s) resolvidos
- **Registry** — mapa `id → blueprint` em `registries/`

### Factory
Factories em `factories/` criam instâncias runtime a partir de blueprints.
- `createTower(def, col, row, slot)` → `SingleTower | FusionTower`
- `createEnemy(def, wave)` → `StandardEnemy | BossEnemy | GolemEnemy`
- `createProjectile(params)` → `ProjectileData`

### Strategy (Behaviors)
Comportamentos especiais são interfaces plugáveis:
- `MagicBehavior.cast()` — magia de torre
- `FusionBehavior.execute()` — efeito de fusão
- `EnemyBehavior.onUpdate()` — lógica por frame de inimigos
- `ItemEffect.modify*()` — modificadores passivos de itens

### Data-driven
Toda definição de conteúdo fica em `content/`. Nenhum arquivo fora de `content/` e `behaviors/` precisa ser tocado para adicionar novo conteúdo.

## Ponto de Registro

Arquivo: `src/content/registerAll.ts`

Única função `registerAllContent()` chamada na inicialização. Registra tudo:
1. Behaviors (enemy, magic, item effects)
2. Definições (enemies, towers, fusions, items)
3. Render profiles
4. Animações

## Fluxo de Extensão

| Tipo | Dados | Behavior | Visual | Wave |
|------|-------|----------|--------|------|
| Inimigo | `content/enemies.ts` | `behaviors/EnemyBehaviors.ts` | `content/enemyRenderProfiles.ts` | `content/waveRules.ts` |
| Torre | `content/towers.ts` | `behaviors/MagicBehaviors.ts` | (automático por cor) | — |
| Fusão | `content/fusions.ts` | `behaviors/FusionBehaviors.ts` | (automático por cor) | — |
| Item | `content/items.ts` | `behaviors/ItemEffects.ts` | — | — |
| Animação | `content/animations.ts` | — | (inline no def) | — |

Guias detalhados: `docs/how-to-add-*.md`

## GameContext (IGameContext)

Interface central em `core/GameContext.ts`. Todo system/service recebe `ctx: IGameContext` que expõe:
- Estado do jogo: `towers`, `enemies`, `projectiles`, `gold`, `lives`
- Mapa: `map` (waypoints, pathCells, dims)
- Player: `player` (stats, affinity)
- Items: `items` (owned items array)
- Animações: `animations.request()`
- Utilidades: `addFT()` (floating text), `triggerAoeFlash()`

## GameRenderState

Contrato entre gameplay e renderização. Pré-computa todos os valores que a UI precisa:
- `mapExpandCost`, `canExpandMap` — economia de mapa
- `bossBarState` — HP do boss para a barra
- `isCellFull()`, `getMoveCost()`, `getSellRefund()` — queries delegadas a TowerService
- `towerCost()`, `towerUpgradeCost()`, `getSynergyBonus()` — queries delegadas a services

A UI **nunca** calcula lógica de domínio. Apenas lê estado e desenha.
