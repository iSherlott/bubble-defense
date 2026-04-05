# Como Adicionar uma Nova Animação (Skill / Magia)

## Resumo

| Passo | Arquivo | Obrigatório? |
|-------|---------|:---:|
| 1. Definição + draw | `src/content/animations.ts` | ✅ |
| 2. Trigger em behavior | behavior que dispara a animação | ✅ |

## Passo 1 — Definição (obrigatório)

Adicione uma `AnimationDefinition` e registre via `registerAnimation()` dentro de `registerAnimations()` em `src/content/animations.ts`.

### Contrato: AnimationDefinition

```typescript
export interface AnimationDefinition {
  id: string;                    // ID único, snake_case (ex: 'frost_nova')
  defaultDuration: number;       // Duração padrão em ms
  draw(ctx: CanvasRenderingContext2D, instance: AnimationInstance): void;
}
```

### Contrato: AnimationInstance (recebido no draw)

```typescript
export interface AnimationInstance {
  def: AnimationDefinition;
  sourceX: number;               // Posição X de origem (torre)
  sourceY: number;               // Posição Y de origem
  targetX: number;               // Posição X de destino (alvo), ou = sourceX
  targetY: number;               // Posição Y de destino
  duration: number;              // Duração em ms (pode ser custom via request)
  elapsed: number;               // Tempo decorrido em ms
  progress: number;              // 0.0 → 1.0 (elapsed / duration)
  radius: number;                // Raio do efeito (default: 0)
  color: string;                 // Cor primária (default: '#ffffff')
  secondaryColor?: string;       // Cor secundária
  payload?: unknown;             // Dados custom passados pelo request
}
```

### Exemplo completo

```typescript
// Em registerAnimations():
registerAnimation({
  id: 'frost_nova',
  defaultDuration: 600,
  draw(ctx: CanvasRenderingContext2D, inst: AnimationInstance) {
    const { sourceX, sourceY, radius, progress, color } = inst;
    const r = radius * progress;
    const alpha = 1 - progress;

    ctx.save();
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sourceX, sourceY, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
});
```

### Animações existentes

| ID | Efeito visual |
|----|---------------|
| `aoe_flash` | Flash circular expandindo |
| `fire_burst` | Explosão de fogo com partículas |
| `frost_nova` | Anel de gelo expandindo |
| `earth_quake` | Tremor com linhas |
| `wind_gust` | Arcos de vento |
| `chain_lightning` | Raio entre pontos |
| `fusion_burst` | Explosão com anel duplo |

## Passo 2 — Trigger (obrigatório)

Para que a animação toque, é preciso dispará-la com `ctx.animations.request()`.

### Contrato: AnimationRequest

```typescript
export interface AnimationRequest {
  id: string;                    // ID da animação registrada
  sourceX: number;               // Posição X de origem
  sourceY: number;               // Posição Y de origem
  targetX?: number;              // Destino X (default: sourceX)
  targetY?: number;              // Destino Y (default: sourceY)
  duration?: number;             // Override do defaultDuration em ms
  radius?: number;               // Raio do efeito
  color?: string;                // Override da cor
  secondaryColor?: string;       // Cor secundária
  payload?: unknown;             // Dados custom
}
```

### Onde disparar

Na maioria dos casos, a animação é disparada dentro de um behavior:

```typescript
// Em um MagicBehavior.cast():
ctx.animations.request({
  id: 'frost_nova',
  sourceX: tower.pixelX,
  sourceY: tower.pixelY,
  radius: tower.getRange(),
  color: '#88ccff',
  duration: 800,
});
```

```typescript
// Em um FusionBehavior.execute():
ctx.animations.request({
  id: 'fusion_burst',
  sourceX: tower.pixelX,
  sourceY: tower.pixelY,
  targetX: target.pos.x,
  targetY: target.pos.y,
  color: fusion.color,
  radius: 60,
});
```

### Atalho: triggerAoeFlash

Para AoE simples, use o atalho já existente:

```typescript
ctx.triggerAoeFlash(x, y, radius);
// Equivale a: ctx.animations.request({ id: 'aoe_flash', sourceX: x, sourceY: y, radius })
```

## Dicas de Draw

1. **Use `progress`** (0→1) para controlar fade, escala, rotação
2. **Sempre `ctx.save()` / `ctx.restore()`** para isolar transformações
3. **Raio real** = `radius * progress` para efeitos expansivos
4. **Alpha** = `1 - progress` para fade-out natural
5. **`secondaryColor`** útil para efeitos bicolores (fusões)
6. **`payload`** para dados extras (chain targets, etc.)

## Pipeline de Animação

```
Behavior dispara → AnimationRequest
                        ↓
             AnimationSystem.request()
                        ↓
             AnimationInstance criada (def + params)
                        ↓
             AnimationSystem.update(dt) avança elapsed/progress
                        ↓
             AnimationSystem.draw(ctx) chama def.draw()
                        ↓
             progress >= 1.0 → instância removida
```

## Checklist Final

- [ ] `AnimationDefinition` criada em `src/content/animations.ts`
- [ ] `registerAnimation()` chamado dentro de `registerAnimations()`
- [ ] Trigger adicionado no behavior correspondente via `ctx.animations.request()`
- [ ] Build passa: `npx tsc --noEmit`
- [ ] Testado in-game: animação aparece quando o efeito é disparado
