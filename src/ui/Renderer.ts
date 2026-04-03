import type { GameScreen, ProjectileData, Vec2, ElementType, Puddle, OwnedItem, ItemDropAnim, Stats } from '../types';
import type { Tower } from '../entities/Tower';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../player/Player';
import type { TalentTree } from '../player/TalentTree';
import type { WaveManager } from '../game/WaveManager';
import type { UpgradePopup } from '../game/Game';
import type { MapData } from '../game/MapGenerator';
import { CELL_SIZE, SIDEBAR_W, WAVE_BAR_H, TOWER_DEFS,
  ELEMENT_COLORS, ELEMENT_NAMES, ELEMENT_ICONS, ELEMENT_DESCRIPTIONS,
  STAT_LABELS, STAT_DESCRIPTIONS, STAT_ICONS, OPPOSITE_ELEMENT,
  MAX_LEVEL, TALENT_POINT_EVERY, MAX_TOWER_LEVEL, MAP_EXPAND_COST,
  ENEMY_DEFS, GOLEM_DEFS, BOSS_DEFS, ITEM_DEFS, ITEM_RARITY_COLORS,
  ITEM_RARITY_NAMES, getFusionDef, ARCHETYPE_DEFS } from '../constants';
import { hasSave } from '../game/SaveSystem';

type Rect = { x:number; y:number; w:number; h:number };

interface AoeFlash { x:number; y:number; r:number; life:number; }

interface RenderState {
  screen: GameScreen;
  paused: boolean;
  autoWave: boolean;
  game: {
    towers: Tower[];
    enemies: Enemy[];
    projectiles: ProjectileData[];
    floatingTexts: Array<{x:number;y:number;text:string;color:string;life:number;maxLife:number}>;
    puddles: Puddle[];
    gold:number; lives:number; score:number;
    selectedTowerType: string;
    hoveredCell: Vec2|null;
    waveManager: WaveManager;
    upgradePopup: UpgradePopup|null;
    movingTower: Tower|null;
    currentMapTier: number;
    items: OwnedItem[];
    itemDropAnim: ItemDropAnim|null;
    canFuse: boolean;
  };
  player: Player;
  talentTree: TalentTree;
  towersAt: (c:number,r:number) => Tower[];
  towerCost: (id:string) => number;
  towerUpgradeCost: (t?:Tower) => number;
  gameSpeed: 1 | 2;
  debugMode: boolean;
  pendingAffinity: ElementType;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private map: MapData;

  private menuBtns: Record<string,Rect> = {};
  private affinityRects: Map<string,Rect> = new Map();
  private gameUIBtns: Record<string,Rect> = {};
  private towerSelRects: Map<string,Rect> = new Map();
  private levelUpBtns: Record<string,Rect> = {};
  private talentRects: Map<string,Rect> = new Map();
  private talentBackRect: Rect|null = null;
  private gameOverBtns: Record<string,Rect> = {};
  private upgradeBtns: Record<string,Rect> = {};
  private upgradePopupRect: Rect = {x:0,y:0,w:0,h:0};
  private bestiaryRects: Record<string,Rect> = {};
  private bestiaryPage = 0;  // 0=towers, 1=enemies, 2=golems
  private debugBtns: Record<string,Rect> = {};
  private archetypeRects: Map<string,Rect> = new Map();
  private archetypeBackRect: Rect|null = null;

  private aoeFlashes: AoeFlash[] = [];

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, map: MapData) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.map = map;
    this.resizeCanvas();
  }

  updateMap(map: MapData) {
    this.map = map;
    this.resizeCanvas();
  }

  private resizeCanvas() {
    const { gameWidth, gameHeight } = this.map;
    this.canvas.width  = gameWidth  + SIDEBAR_W;
    this.canvas.height = gameHeight + WAVE_BAR_H;
  }

  private get cw() { return this.canvas.width; }
  private get ch() { return this.canvas.height; }
  private get gw() { return this.map.gameWidth; }
  private get gh() { return this.map.gameHeight; }

  triggerAoe(x:number,y:number,r:number) { this.aoeFlashes.push({x,y,r,life:0.35}); }

  render(state: RenderState) {
    for (const f of this.aoeFlashes) f.life -= 0.016;
    this.aoeFlashes = this.aoeFlashes.filter(f => f.life > 0);
    this.ctx.clearRect(0, 0, this.cw, this.ch);

    switch (state.screen) {
      case 'menu':      this.renderMenu(); break;
      case 'affinity':  this.renderAffinity(state.player); break;
      case 'archetype': this.renderArchetype(state.pendingAffinity); break;
      case 'game':      this.renderGame(state); break;
      case 'levelup':   this.renderLevelUp(state.player); break;
      case 'talent':    this.renderTalents(state.player, state.talentTree); break;
      case 'gameover':  this.renderGameOver(state.game.score, state.game.waveManager.currentWave); break;
      case 'bestiary':  this.renderBestiary(); break;
    }
  }

  // ─── Menu ──────────────────────────────────────────────────────────────────
  private renderMenu() {
    const ctx=this.ctx, cw=this.cw, ch=this.ch;
    const bg=ctx.createLinearGradient(0,0,0,ch);
    bg.addColorStop(0,'#08081a'); bg.addColorStop(1,'#0d0d22');
    ctx.fillStyle=bg; ctx.fillRect(0,0,cw,ch);

    const rng=mulberry32(42);
    ctx.fillStyle='rgba(255,255,255,0.45)';
    for(let i=0;i<110;i++) ctx.fillRect(rng()*cw,rng()*ch,rng()*2+0.5,rng()*2+0.5);

    ctx.textAlign='center';
    ctx.fillStyle='#aaaaff'; ctx.font='bold 58px Segoe UI';
    ctx.shadowColor='#6666ff'; ctx.shadowBlur=22;
    ctx.fillText('DEFENSE POWER',cw/2,140); ctx.shadowBlur=0;
    ctx.font='17px Segoe UI'; ctx.fillStyle='#6666aa';
    ctx.fillText('4 Elementos · Torres Evolutivas · Magia · Talentos',cw/2,184);

    const bw=260,bh=50,bx=cw/2-bw/2;
    const ng={x:bx,y:240,w:bw,h:bh};
    this.btn(ctx,ng,'⚔  Novo Jogo','#2a2a5a','#8888ff'); this.menuBtns['newGame']=ng;
    const hasS=hasSave();
    const lg={x:bx,y:308,w:bw,h:bh};
    this.btn(ctx,lg,'💾  Carregar Save',hasS?'#1a3a1a':'#1a1a2a',hasS?'#55cc55':'#445566');
    this.menuBtns['loadGame']=lg;

    const elems:ElementType[]=['fire','water','earth','wind'];
    const ew=192,eh=74,gap=8,tw=elems.length*(ew+gap)-gap;
    elems.forEach((el,i)=>{
      const rx=cw/2-tw/2+i*(ew+gap),ry=400;
      ctx.fillStyle=ELEMENT_COLORS[el]+'22'; ctx.strokeStyle=ELEMENT_COLORS[el]+'88';
      ctx.lineWidth=1; this.rr(ctx,rx,ry,ew,eh,8); ctx.fill(); ctx.stroke();
      ctx.fillStyle=ELEMENT_COLORS[el]; ctx.font='24px serif'; ctx.fillText(ELEMENT_ICONS[el],rx+24,ry+42);
      ctx.font='bold 13px Segoe UI'; ctx.fillText(ELEMENT_NAMES[el],rx+ew/2+12,ry+28);
      ctx.font='10px Segoe UI'; ctx.fillStyle='#666688';
      ctx.fillText('vs '+ELEMENT_NAMES[OPPOSITE_ELEMENT[el]],rx+ew/2+12,ry+46);
    });
    ctx.fillStyle='#444466'; ctx.font='12px Segoe UI';
    ctx.fillText('Clique direito → detalhes  |  P = pausar  |  Custo inicial: 50g (multiplica por torres colocadas)',cw/2,520);
  }

  // ─── Affinity ──────────────────────────────────────────────────────────────
  private renderAffinity(player: Player) {
    const ctx=this.ctx,cw=this.cw,ch=this.ch;
    ctx.fillStyle='#09091c'; ctx.fillRect(0,0,cw,ch);
    ctx.textAlign='center';
    ctx.fillStyle='#ddddff'; ctx.font='bold 36px Segoe UI';
    ctx.fillText('✨  Escolha sua Aptidão Elemental',cw/2,72);
    ctx.font='14px Segoe UI'; ctx.fillStyle='#8888aa';
    ctx.fillText('Seu elemento: 2× dano.  Elemento oposto: ½ dano.',cw/2,104);
    ctx.fillText('50 atributos iniciais distribuídos aleatoriamente (mín. 5 cada).',cw/2,122);

    const elems:ElementType[]=['fire','water','earth','wind'];
    const cW=206,cH=268,gap=16,total=elems.length*(cW+gap)-gap;
    const startX=cw/2-total/2,cardY=150;
    this.affinityRects.clear();
    elems.forEach((el,i)=>{
      const rx=startX+i*(cW+gap);
      ctx.fillStyle=ELEMENT_COLORS[el]+'18'; ctx.strokeStyle=ELEMENT_COLORS[el]+'cc';
      ctx.lineWidth=2; this.rr(ctx,rx,cardY,cW,cH,14); ctx.fill(); ctx.stroke();
      ctx.fillStyle=ELEMENT_COLORS[el]; ctx.font='48px serif';
      ctx.fillText(ELEMENT_ICONS[el],rx+cW/2,cardY+64);
      ctx.font='bold 18px Segoe UI'; ctx.fillText(ELEMENT_NAMES[el],rx+cW/2,cardY+96);
      ctx.font='12px Segoe UI'; ctx.fillStyle='#88ff88';
      ctx.fillText('2× dano',rx+cW/2,cardY+118);
      ctx.fillStyle='#ff8888';
      ctx.fillText('½ dano: '+ELEMENT_NAMES[OPPOSITE_ELEMENT[el]],rx+cW/2,cardY+136);
      ctx.fillStyle='#778899'; ctx.font='10px Segoe UI';
      wrapText(ELEMENT_DESCRIPTIONS[el],28).forEach((l,li)=>ctx.fillText(l,rx+cW/2,cardY+158+li*14));
      const by=cardY+cH-40;
      this.rr(ctx,rx+14,by,cW-28,30,8);
      ctx.fillStyle=ELEMENT_COLORS[el]+'44'; ctx.fill();
      ctx.strokeStyle=ELEMENT_COLORS[el]; ctx.lineWidth=1.5;
      this.rr(ctx,rx+14,by,cW-28,30,8); ctx.stroke();
      ctx.fillStyle=ELEMENT_COLORS[el]; ctx.font='bold 12px Segoe UI';
      ctx.fillText('Escolher',rx+cW/2,by+20);
      this.affinityRects.set(el,{x:rx,y:cardY,w:cW,h:cH});
    });
    ctx.fillStyle='#555566'; ctx.font='12px Segoe UI';
    ctx.fillText('Clique em um elemento para iniciar',cw/2,cardY+cH+26);
  }

  // ─── Archetype Selection ────────────────────────────────────────────────────
  private renderArchetype(affinity: ElementType) {
    const ctx=this.ctx,cw=this.cw,ch=this.ch;
    ctx.fillStyle='#09091c'; ctx.fillRect(0,0,cw,ch);
    ctx.textAlign='center';
    ctx.fillStyle='#ddddff'; ctx.font='bold 32px Segoe UI';
    ctx.fillText('🛡  Escolha seu Arquétipo',cw/2,60);
    ctx.font='13px Segoe UI'; ctx.fillStyle='#8888aa';
    ctx.fillText(`Aptidão: ${ELEMENT_ICONS[affinity]} ${ELEMENT_NAMES[affinity]}  —  Cada arquétipo define seus atributos base + 5 pontos bônus.`,cw/2,90);

    const archs=ARCHETYPE_DEFS;
    const cW=200,cH=280,gap=16,total=archs.length*(cW+gap)-gap;
    const startX=cw/2-total/2,cardY=115;
    this.archetypeRects.clear();

    const statKeys:(keyof Stats)[]=['strength','intelligence','dexterity','agility','luck','vitality'];
    archs.forEach((arch,i)=>{
      const rx=startX+i*(cW+gap);
      ctx.fillStyle=arch.color+'18'; ctx.strokeStyle=arch.color+'cc';
      ctx.lineWidth=2; this.rr(ctx,rx,cardY,cW,cH,14); ctx.fill(); ctx.stroke();

      ctx.fillStyle=arch.color; ctx.font='42px serif';
      ctx.fillText(arch.icon,rx+cW/2,cardY+52);
      ctx.font='bold 17px Segoe UI'; ctx.fillText(arch.name,rx+cW/2,cardY+78);

      ctx.font='10px Segoe UI'; ctx.fillStyle='#aaaacc';
      wrapText(arch.description,24).forEach((l,li)=>ctx.fillText(l,rx+cW/2,cardY+96+li*13));

      // Stat bars
      let sy=cardY+148;
      ctx.textAlign='left';
      for(const k of statKeys){
        const v=arch.baseStats[k];
        ctx.fillStyle='#667788'; ctx.font='9px Segoe UI';
        ctx.fillText(`${STAT_ICONS[k]} ${STAT_LABELS[k]}`,rx+10,sy+9);
        // Bar background
        ctx.fillStyle='#1a1a2e';
        ctx.fillRect(rx+100,sy,86,10);
        // Bar fill (scale: max 20)
        const pct=Math.min(1,v/20);
        ctx.fillStyle=arch.color+'88';
        ctx.fillRect(rx+100,sy,86*pct,10);
        ctx.fillStyle='#ddddee'; ctx.font='bold 8px Segoe UI'; ctx.textAlign='right';
        ctx.fillText(String(v),rx+cW-10,sy+9);
        ctx.textAlign='left';
        sy+=16;
      }
      ctx.textAlign='center';

      // Select button
      const by=cardY+cH-36;
      this.rr(ctx,rx+14,by,cW-28,28,8);
      ctx.fillStyle=arch.color+'44'; ctx.fill();
      ctx.strokeStyle=arch.color; ctx.lineWidth=1.5;
      this.rr(ctx,rx+14,by,cW-28,28,8); ctx.stroke();
      ctx.fillStyle=arch.color; ctx.font='bold 12px Segoe UI';
      ctx.fillText('Escolher',rx+cW/2,by+19);
      this.archetypeRects.set(arch.id,{x:rx,y:cardY,w:cW,h:cH});
    });

    // Back button
    const backW=120,backH=28;
    const backRect={x:cw/2-backW/2,y:cardY+cH+16,w:backW,h:backH};
    this.btn(ctx,backRect,'← Voltar','#1a1a2a','#8888aa');
    this.archetypeBackRect=backRect;

    ctx.textAlign='left';
  }

  // ─── Game ──────────────────────────────────────────────────────────────────
  private renderGame(state: RenderState) {
    const ctx=this.ctx, g=state.game;
    const {waypoints,pathCells,cols,rows}=this.map;

    // Grid bg
    ctx.fillStyle='#111118'; ctx.fillRect(0,0,this.gw,this.gh);
    ctx.strokeStyle='#1a1a28'; ctx.lineWidth=0.5;
    for(let c=0;c<=cols;c++){ctx.beginPath();ctx.moveTo(c*CELL_SIZE,0);ctx.lineTo(c*CELL_SIZE,this.gh);ctx.stroke();}
    for(let r=0;r<=rows;r++){ctx.beginPath();ctx.moveTo(0,r*CELL_SIZE);ctx.lineTo(this.gw,r*CELL_SIZE);ctx.stroke();}

    // Path cells
    ctx.fillStyle='#1f1a0f';
    for(let c=0;c<cols;c++) for(let r=0;r<rows;r++)
      if(pathCells.has(`${c},${r}`)) ctx.fillRect(c*CELL_SIZE,r*CELL_SIZE,CELL_SIZE,CELL_SIZE);

    // Path line
    ctx.strokeStyle='#554422'; ctx.lineWidth=3; ctx.lineJoin='round';
    ctx.beginPath();
    waypoints.forEach((wp,i)=>i===0?ctx.moveTo(wp.x,wp.y):ctx.lineTo(wp.x,wp.y));
    ctx.stroke();
    // Arrows
    ctx.fillStyle='#776644';
    for(let i=1;i<waypoints.length;i++){
      const a=waypoints[i-1],b=waypoints[i];
      const ang=Math.atan2(b.y-a.y,b.x-a.x),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
      ctx.save();ctx.translate(mx,my);ctx.rotate(ang);
      ctx.beginPath();ctx.moveTo(6,0);ctx.lineTo(-4,-4);ctx.lineTo(-4,4);ctx.closePath();ctx.fill();
      ctx.restore();
    }

    // Puddles
    for(const p of g.puddles){
      const a=Math.min(1,p.remaining/2)*0.4;
      ctx.fillStyle=`rgba(40,120,255,${a})`;
      ctx.strokeStyle=`rgba(80,180,255,${a+0.2})`;
      ctx.lineWidth=1; ctx.beginPath(); ctx.arc(p.x,p.y,p.radius,0,Math.PI*2); ctx.fill(); ctx.stroke();
    }

    // AoE flashes
    for(const f of this.aoeFlashes){
      const a=(f.life/0.35)*0.4;
      ctx.fillStyle=`rgba(150,220,80,${a})`; ctx.strokeStyle=`rgba(180,255,100,${a+0.2})`;
      ctx.lineWidth=2; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2); ctx.fill(); ctx.stroke();
    }

    // Hover
    if(g.hoveredCell && g.hoveredCell.x<cols && g.hoveredCell.y<rows){
      const hc=g.hoveredCell;
      const isMoving=!!g.movingTower;
      const blocked=pathCells.has(`${hc.x},${hc.y}`)||(!isMoving&&state.towersAt(hc.x,hc.y).length>=2);
      ctx.fillStyle=isMoving?'rgba(100,200,255,0.12)':blocked?'rgba(255,50,50,0.10)':'rgba(100,255,100,0.10)';
      ctx.strokeStyle=isMoving?'rgba(100,200,255,0.6)':blocked?'rgba(255,50,50,0.5)':'rgba(100,255,100,0.5)';
      ctx.lineWidth=1; ctx.fillRect(hc.x*CELL_SIZE,hc.y*CELL_SIZE,CELL_SIZE,CELL_SIZE);
      ctx.strokeRect(hc.x*CELL_SIZE,hc.y*CELL_SIZE,CELL_SIZE,CELL_SIZE);
      if(isMoving && g.movingTower){
        // Ghost tower preview
        const t=g.movingTower;
        ctx.globalAlpha=0.4; this.drawTower(ctx,t); ctx.globalAlpha=1;
      } else if(!blocked && g.selectedTowerType){
        const def=TOWER_DEFS.find(d=>d.id===g.selectedTowerType);
        if(def){
          ctx.beginPath(); ctx.arc(hc.x*CELL_SIZE+CELL_SIZE/2,hc.y*CELL_SIZE+CELL_SIZE/2,def.baseRange,0,Math.PI*2);
          ctx.strokeStyle='rgba(255,255,255,0.10)'; ctx.lineWidth=1; ctx.stroke();
        }
      }
    }

    // Towers
    for(const t of g.towers) this.drawTower(ctx,t);

    // Hovered tower range
    if(g.hoveredCell){
      for(const t of state.towersAt(g.hoveredCell.x,g.hoveredCell.y)){
        ctx.beginPath(); ctx.arc(t.pixelX,t.pixelY,t.def.baseRange,0,Math.PI*2);
        ctx.strokeStyle='rgba(255,255,255,0.20)'; ctx.lineWidth=1; ctx.stroke();
      }
    }

    // Projectiles
    for(const proj of g.projectiles){
      const r=proj.isMagic?7:proj.isCrit?6:4;
      ctx.beginPath(); ctx.arc(proj.x,proj.y,r,0,Math.PI*2);
      ctx.fillStyle=proj.color;
      ctx.shadowColor=proj.color; ctx.shadowBlur=proj.isMagic?16:proj.isCrit?10:5;
      ctx.fill(); ctx.shadowBlur=0;
      if(proj.isMagic){
        ctx.beginPath(); ctx.arc(proj.x,proj.y,r+3,0,Math.PI*2);
        ctx.strokeStyle=proj.color+'66'; ctx.lineWidth=2; ctx.stroke();
      }
    }

    // Enemies
    for(const e of g.enemies) this.drawEnemy(ctx,e);

    // Floating texts
    for(const ft of g.floatingTexts){
      ctx.globalAlpha=ft.life/ft.maxLife;
      ctx.fillStyle=ft.color;
      ctx.font=ft.text.includes('CRÍTICO')?'bold 13px Segoe UI':'bold 11px Segoe UI';
      ctx.textAlign='center'; ctx.fillText(ft.text,ft.x,ft.y);
    }
    ctx.globalAlpha=1;

    // Sidebar
    this.renderSidebar(state);

    // Items HUD (top of game area)
    this.renderItemsHUD(ctx, g.items);

    // Wave progress bar (bottom strip)
    this.renderWaveBar(state.game.waveManager, state.game.enemies);

    // Upgrade popup
    if(g.upgradePopup)
      this.renderUpgradePopup(ctx,g.upgradePopup,state.towersAt,state.towerCost,state.towerUpgradeCost(),g.gold,g.canFuse);

    // Item drop animation
    if(g.itemDropAnim) this.renderItemDropAnim(ctx,g.itemDropAnim);

    // Pause overlay
    if(state.paused){
      ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,this.gw,this.gh);
      ctx.fillStyle='#aaaaff'; ctx.font='bold 44px Segoe UI'; ctx.textAlign='center';
      ctx.fillText('⏸  PAUSADO',this.gw/2,this.gh/2);
      ctx.font='17px Segoe UI'; ctx.fillStyle='#7777aa';
      ctx.fillText('P ou ESC para continuar',this.gw/2,this.gh/2+44);
    }

    // Debug overlay
    if(state.debugMode) this.renderDebugPanel(ctx);
  }

  // ─── Wave progress bar ─────────────────────────────────────────────────────
  private renderWaveBar(wm: WaveManager, enemies: Enemy[]) {
    const ctx=this.ctx;
    const barY=this.gh;
    const barW=this.gw;
    const allDefs=[...ENEMY_DEFS,...GOLEM_DEFS,...BOSS_DEFS];

    ctx.fillStyle='#0a0a14'; ctx.fillRect(0,barY,barW+SIDEBAR_W,WAVE_BAR_H);
    ctx.strokeStyle='#252540'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,barY); ctx.lineTo(barW+SIDEBAR_W,barY); ctx.stroke();

    if(wm.waveActive){
      // Boss wave: show boss HP bar
      if(wm.isBossWave){
        const boss=enemies.find(e=>e.def.isBoss && !e.dead);
        const pct=boss ? boss.hp/boss.maxHp : (wm.waveProgress);
        ctx.fillStyle='#1a0a14'; ctx.fillRect(8,barY+6,barW-16,WAVE_BAR_H-12);
        const grad=ctx.createLinearGradient(8,0,barW-8,0);
        grad.addColorStop(0,'#cc0044');grad.addColorStop(1,'#ff4488');
        ctx.fillStyle=grad;
        ctx.fillRect(8,barY+6,(barW-16)*pct,WAVE_BAR_H-12);
        ctx.fillStyle='#ffffff'; ctx.font='bold 11px Segoe UI'; ctx.textAlign='center';
        const hpText=boss ? `${Math.round(boss.hp)} / ${boss.maxHp}` : 'Derrotado!';
        ctx.fillText(`💀 BOSS — ${hpText}  (${Math.round(pct*100)}%)`,barW/2,barY+WAVE_BAR_H/2+4);
      } else {
        const pct=wm.waveProgress;
        ctx.fillStyle='#1a1a2a'; ctx.fillRect(8,barY+6,barW-16,WAVE_BAR_H-12);
        const grad=ctx.createLinearGradient(8,0,barW-8,0);
        grad.addColorStop(0,'#2255ff');grad.addColorStop(1,'#44aaff');
        ctx.fillStyle=grad;
        ctx.fillRect(8,barY+6,(barW-16)*pct,WAVE_BAR_H-12);
        ctx.fillStyle='#ffffff'; ctx.font='bold 11px Segoe UI'; ctx.textAlign='center';
        ctx.fillText(`Onda ${wm.currentWave} — ${wm.enemiesKilledThisWave}/${wm.totalEnemiesThisWave} eliminados`,barW/2,barY+WAVE_BAR_H/2+4);
      }
    } else {
      // Between waves: show preview of next wave
      ctx.fillStyle='#1a1a28'; ctx.fillRect(8,barY+6,barW-16,WAVE_BAR_H-12);
      ctx.textAlign='center';
      if(wm.currentWave===0){
        ctx.fillStyle='#888899'; ctx.font='11px Segoe UI';
        ctx.fillText('Pronto para começar — clique em "Próxima Onda"',barW/2,barY+WAVE_BAR_H/2+4);
      } else {
        const preview=wm.getNextWavePreview();
        const names=preview.types.map(id=>{
          const d=allDefs.find(d=>d.id===id);
          return d ? d.name : id;
        });
        let txt=`Próxima: Onda ${wm.currentWave+1}  ▸  `;
        if(preview.isBoss) txt+=`💀 BOSS: ${names[0]}`;
        else {
          txt+=names.join(', ');
          txt+=` (${preview.enemyCount})`;
          if(preview.eliteCount>0) txt+=`  ⭐${preview.eliteCount} elites`;
        }
        ctx.fillStyle='#aabb99'; ctx.font='11px Segoe UI';
        ctx.fillText(txt,barW/2,barY+WAVE_BAR_H/2+4);
      }
    }
  }

  // ─── Items HUD (top of game area) ──────────────────────────────────────────
  private renderItemsHUD(ctx: CanvasRenderingContext2D, items: OwnedItem[]) {
    if(items.length===0) return;
    const padding=4, iconSize=28, gap=3;
    const totalW=items.length*(iconSize+gap)-gap+padding*2;
    const hx=this.gw/2-totalW/2, hy=2;

    // Background strip
    ctx.fillStyle='rgba(10,10,30,0.75)';
    this.rr(ctx,hx,hy,totalW,iconSize+padding*2,6); ctx.fill();
    ctx.strokeStyle='#333366'; ctx.lineWidth=1;
    this.rr(ctx,hx,hy,totalW,iconSize+padding*2,6); ctx.stroke();

    let ix=hx+padding;
    for(const owned of items){
      const def=ITEM_DEFS.find(d=>d.id===owned.defId);
      if(!def) continue;
      const rc=ITEM_RARITY_COLORS[def.rarity];

      // Item background
      ctx.fillStyle=def.rarity==='legendary'?'#2a2000':def.rarity==='rare'?'#0a1530':'#141422';
      this.rr(ctx,ix,hy+padding,iconSize,iconSize,4); ctx.fill();
      ctx.strokeStyle=rc+'aa'; ctx.lineWidth=1;
      this.rr(ctx,ix,hy+padding,iconSize,iconSize,4); ctx.stroke();

      // Icon
      ctx.font='14px serif'; ctx.textAlign='center';
      ctx.fillText(def.icon,ix+iconSize/2,hy+padding+iconSize/2+5);

      // Stack count
      if(owned.stacks>1){
        ctx.fillStyle='#ffffff'; ctx.font='bold 8px Segoe UI';
        ctx.fillText(`×${owned.stacks}`,ix+iconSize-4,hy+padding+iconSize-1);
      }
      ctx.textAlign='left';
      ix+=iconSize+gap;
    }
  }

  // ─── Item Drop Animation ───────────────────────────────────────────────────
  private renderItemDropAnim(ctx: CanvasRenderingContext2D, anim: ItemDropAnim) {
    const cx=this.gw/2, cy=this.gh/2;
    const t=anim.timer;
    const item=anim.item;
    const rc=ITEM_RARITY_COLORS[item.rarity];

    ctx.save();

    if(anim.phase==='rising'){
      // Rising phase: item scales up from center with glow
      const p=Math.min(1,t/0.6);
      const scale=p*1.2;
      const alpha=p;
      ctx.globalAlpha=alpha;

      // Glow
      ctx.shadowColor=rc; ctx.shadowBlur=30+p*20;
      ctx.fillStyle='rgba(0,0,0,0.6)';
      this.rr(ctx,cx-100,cy-60,200,120,16); ctx.fill();
      ctx.shadowBlur=0;

      // Border
      ctx.strokeStyle=rc; ctx.lineWidth=3;
      this.rr(ctx,cx-100,cy-60,200,120,16); ctx.stroke();

      // Icon
      ctx.font=`${Math.round(40*scale)}px serif`; ctx.textAlign='center';
      ctx.fillStyle='#ffffff';
      ctx.fillText(item.icon,cx,cy+5*scale);

    } else if(anim.phase==='showing'){
      // Showing phase: full display with sparkle
      ctx.globalAlpha=1;
      const sparkle=0.7+0.3*Math.sin(t*8);

      // Card background
      ctx.shadowColor=rc; ctx.shadowBlur=25*sparkle;
      ctx.fillStyle='rgba(8,8,25,0.92)';
      this.rr(ctx,cx-120,cy-80,240,160,16); ctx.fill();
      ctx.shadowBlur=0;

      // Border with pulse
      ctx.strokeStyle=rc; ctx.lineWidth=3;
      this.rr(ctx,cx-120,cy-80,240,160,16); ctx.stroke();

      // Rarity banner
      ctx.fillStyle=rc; ctx.font='bold 10px Segoe UI'; ctx.textAlign='center';
      ctx.fillText(ITEM_RARITY_NAMES[item.rarity].toUpperCase(),cx,cy-60);

      // Icon
      ctx.font='44px serif';
      ctx.fillText(item.icon,cx,cy+4);

      // Name
      ctx.fillStyle='#ffffff'; ctx.font='bold 14px Segoe UI';
      ctx.fillText(item.name,cx,cy+36);

      // Description  
      ctx.fillStyle='#aaaacc'; ctx.font='10px Segoe UI';
      ctx.fillText(item.description,cx,cy+54);

      // Sparkle particles
      for(let i=0;i<6;i++){
        const ang=i/6*Math.PI*2+t*2;
        const dist=50+15*Math.sin(t*4+i);
        const sx=cx+Math.cos(ang)*dist, sy=cy+Math.sin(ang)*dist;
        ctx.fillStyle=`rgba(255,255,200,${sparkle*0.6})`;
        ctx.beginPath(); ctx.arc(sx,sy,2+sparkle,0,Math.PI*2); ctx.fill();
      }

    } else {
      // Fading phase
      const fadeStart=2.0;
      const p=Math.max(0,1-(t-fadeStart)/0.5);
      ctx.globalAlpha=p;

      ctx.fillStyle='rgba(8,8,25,0.92)';
      this.rr(ctx,cx-120,cy-80,240,160,16); ctx.fill();
      ctx.strokeStyle=rc; ctx.lineWidth=3;
      this.rr(ctx,cx-120,cy-80,240,160,16); ctx.stroke();

      ctx.fillStyle=rc; ctx.font='bold 10px Segoe UI'; ctx.textAlign='center';
      ctx.fillText(ITEM_RARITY_NAMES[item.rarity].toUpperCase(),cx,cy-60);
      ctx.font='44px serif'; ctx.fillText(item.icon,cx,cy+4);
      ctx.fillStyle='#ffffff'; ctx.font='bold 14px Segoe UI';
      ctx.fillText(item.name,cx,cy+36);
    }

    ctx.globalAlpha=1;
    ctx.restore();
  }

  // ─── Tower drawing ─────────────────────────────────────────────────────────
  private drawTower(ctx: CanvasRenderingContext2D, tower: Tower) {
    const x=tower.pixelX, y=tower.pixelY, r=CELL_SIZE/2-5;
    const col=ELEMENT_COLORS[tower.def.element];

    // Fusion aura
    if(tower.fusionDef){
      const pulse=0.4+0.6*Math.sin(Date.now()/300);
      ctx.beginPath(); ctx.arc(x,y,r+10,0,Math.PI*2);
      ctx.strokeStyle=tower.fusionDef.color+Math.round(pulse*200).toString(16).padStart(2,'0');
      ctx.lineWidth=4;
      ctx.shadowColor=tower.fusionDef.color; ctx.shadowBlur=18; ctx.stroke(); ctx.shadowBlur=0;
    }

    // Dual magic aura
    if(tower.dualMagic){
      const pulse=0.5+0.5*Math.sin(Date.now()/220);
      ctx.beginPath(); ctx.arc(x,y,r+8,0,Math.PI*2);
      ctx.strokeStyle=`rgba(255,255,80,${pulse*0.9})`; ctx.lineWidth=3;
      ctx.shadowColor='#ffff44'; ctx.shadowBlur=14; ctx.stroke(); ctx.shadowBlur=0;
    }

    ctx.fillStyle=tower.def.color;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=tower.def.accentColor; ctx.lineWidth=2; ctx.stroke();

    // Element symbol / Fusion symbol
    ctx.fillStyle=col; ctx.font='10px serif'; ctx.textAlign='center';
    if(tower.fusionDef){
      ctx.fillText(tower.fusionDef.icon,x,y+4);
    } else {
      ctx.fillText(tower.def.element==='fire'?'🔥':tower.def.element==='water'?'💧':tower.def.element==='earth'?'🌍':'💨',x,y+4);
    }

    // Cooldown arc
    if(tower.cooldown>0){
      const prog=tower.cooldown/(1/tower.def.baseFireRate);
      ctx.beginPath(); ctx.arc(x,y,r+2,-Math.PI/2,-Math.PI/2+prog*Math.PI*2);
      ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=2; ctx.stroke();
    }

    // Magic bar arc (colored outer ring)
    if(tower.magicBar>0){
      const ratio=tower.magicBarRatio();
      ctx.beginPath(); ctx.arc(x,y,r+5,-Math.PI/2,-Math.PI/2+ratio*Math.PI*2);
      ctx.strokeStyle=col; ctx.lineWidth=3;
      ctx.shadowColor=col; ctx.shadowBlur=ratio>=1?14:4; ctx.stroke(); ctx.shadowBlur=0;
    }

    // Level badge (only show if level > 1)
    if(tower.level>1){
      const bx=x+r-3, by=y-r+3;
      const isMax=tower.isMaxLevel;
      ctx.beginPath(); ctx.arc(bx,by,7,0,Math.PI*2);
      ctx.fillStyle=isMax?'#ffcc00':'#223355'; ctx.fill();
      ctx.strokeStyle=isMax?'#ffffff':'#aaddff'; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle=isMax?'#000':'#ffffff';
      ctx.font=`bold 7px Segoe UI`; ctx.textAlign='center';
      ctx.fillText(isMax?'★':`${tower.level}`,bx,by+2.5);
    }
  }

  // ─── Enemy drawing (distinct per type) ────────────────────────────────────
  private drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
    const {x,y}=enemy.pos, r=enemy.def.size;

    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(x,y+r,r*0.8,4,0,0,Math.PI*2); ctx.fill();

    // Boss glow
    if(enemy.def.isBoss){
      const p=0.5+0.5*Math.sin(Date.now()/280);
      ctx.beginPath(); ctx.arc(x,y,r+9,0,Math.PI*2);
      ctx.strokeStyle=`rgba(255,80,200,${p*0.7})`; ctx.lineWidth=5; ctx.stroke();
    }

    // Stun ring
    if(enemy.stunRemaining>0){
      ctx.beginPath(); ctx.arc(x,y,r+5,0,Math.PI*2);
      ctx.strokeStyle='#ffffaa88'; ctx.lineWidth=2; ctx.setLineDash([4,4]); ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Draw unique shape per enemy type ──
    const type = enemy.def.id;
    if(type==='goblin' || type==='boss_goblin_king') {
      this.drawGoblin(ctx, x, y, r, enemy.def.color, enemy.def.isBoss);
    } else if(type==='troll') {
      this.drawTroll(ctx, x, y, r, enemy.def.color);
    } else if(type==='harpy') {
      this.drawHarpy(ctx, x, y, r, enemy.def.color);
    } else if(type==='golem') {
      this.drawGolem(ctx, x, y, r, enemy.def.color);
    } else {  // dragon / boss_chaos_dragon / boss_shadow_titan
      this.drawDragon(ctx, x, y, r, enemy.def.color, !!enemy.def.isBoss);
    }

    // Slow ring (temp)
    if(enemy.effects.find(e=>e.type==='slow')){
      ctx.strokeStyle='#88ddff'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(x,y,r+3,0,Math.PI*2); ctx.stroke();
    }

    // Permanent slow dots
    const stacks=Math.min(enemy.permanentSlowStacks,8);
    for(let i=0;i<stacks;i++){
      const ang=(i/stacks)*Math.PI*2-Math.PI/2;
      ctx.beginPath(); ctx.arc(x+Math.cos(ang)*(r+7),y+Math.sin(ang)*(r+7),2.5,0,Math.PI*2);
      ctx.fillStyle='#44aaff'; ctx.fill();
    }

    // Burn particle
    if(enemy.effects.find(e=>e.type==='burn')){
      ctx.fillStyle='#ff660099';
      ctx.beginPath(); ctx.arc(x,y-r-5,4,0,Math.PI*2); ctx.fill();
    }

    // HP bar
    const bw=r*2.8,bh=5,bx=x-bw/2,by=y-r-13;
    ctx.fillStyle='#330000'; ctx.fillRect(bx,by,bw,bh);
    const hpr=enemy.hp/enemy.maxHp;
    ctx.fillStyle=hpr>0.6?'#44cc44':hpr>0.3?'#ddcc22':'#cc3333';
    ctx.fillRect(bx,by,bw*hpr,bh);

    if(enemy.def.isBoss){
      ctx.fillStyle='#ff88ff'; ctx.font='bold 9px Segoe UI'; ctx.textAlign='center';
      ctx.fillText('BOSS',x,by-3);
    }

    // Weakness / immunity icons above HP bar
    const iconY = by - 11;
    const iconS = 8;
    ctx.font = `${iconS}px serif`;
    ctx.textAlign = 'center';
    // Immune element (grey with 🚫)
    if (enemy.def.immune) {
      ctx.fillStyle = '#666';
      ctx.fillText(ELEMENT_ICONS[enemy.def.immune], x - iconS, iconY);
      ctx.fillStyle = '#ff4444aa';
      ctx.font = '6px serif';
      ctx.fillText('✕', x - iconS + 5, iconY - 2);
      ctx.font = `${iconS}px serif`;
    }
    // Weak element (bright with glow)
    const weak = enemy.weakElement();
    ctx.fillStyle = ELEMENT_COLORS[weak];
    ctx.fillText(ELEMENT_ICONS[weak], x + iconS, iconY);
  }

  // ── Enemy shapes ──────────────────────────────────────────────────────────
  private drawGoblin(ctx: CanvasRenderingContext2D, x:number,y:number,r:number,color:string,isBoss?:boolean){
    // Pointy diamond body
    ctx.fillStyle=color;
    ctx.beginPath(); ctx.moveTo(x,y-r); ctx.lineTo(x+r*0.7,y); ctx.lineTo(x,y+r*0.8); ctx.lineTo(x-r*0.7,y); ctx.closePath(); ctx.fill();
    // Ears
    ctx.fillStyle=isBoss?'#ffdd22':'#22aa22';
    ctx.beginPath(); ctx.moveTo(x-r*0.5,y-r*0.4); ctx.lineTo(x-r,y-r*0.9); ctx.lineTo(x-r*0.1,y-r*0.6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+r*0.5,y-r*0.4); ctx.lineTo(x+r,y-r*0.9); ctx.lineTo(x+r*0.1,y-r*0.6); ctx.closePath(); ctx.fill();
    // Eyes
    ctx.fillStyle='#ffff00';
    ctx.beginPath(); ctx.arc(x-r*0.25,y-r*0.1,r*0.18,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+r*0.25,y-r*0.1,r*0.18,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#000';
    ctx.beginPath(); ctx.arc(x-r*0.25,y-r*0.1,r*0.08,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+r*0.25,y-r*0.1,r*0.08,0,Math.PI*2); ctx.fill();
  }

  private drawTroll(ctx: CanvasRenderingContext2D, x:number,y:number,r:number,color:string){
    // Wide rounded rectangle body
    ctx.fillStyle=color;
    ctx.beginPath(); ctx.ellipse(x,y,r*0.85,r,0,0,Math.PI*2); ctx.fill();
    // Horns
    ctx.fillStyle='#ccaa44';
    ctx.beginPath(); ctx.moveTo(x-r*0.4,y-r*0.7); ctx.lineTo(x-r*0.55,y-r*1.3); ctx.lineTo(x-r*0.2,y-r*0.8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+r*0.4,y-r*0.7); ctx.lineTo(x+r*0.55,y-r*1.3); ctx.lineTo(x+r*0.2,y-r*0.8); ctx.closePath(); ctx.fill();
    // Eyes
    ctx.fillStyle='#ff2200';
    ctx.beginPath(); ctx.arc(x-r*0.3,y-r*0.15,r*0.18,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+r*0.3,y-r*0.15,r*0.18,0,Math.PI*2); ctx.fill();
  }

  private drawHarpy(ctx: CanvasRenderingContext2D, x:number,y:number,r:number,color:string){
    // Wings
    ctx.fillStyle=color+'aa';
    ctx.beginPath(); ctx.ellipse(x-r*1.0,y,r*0.7,r*0.4,Math.PI/5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+r*1.0,y,r*0.7,r*0.4,-Math.PI/5,0,Math.PI*2); ctx.fill();
    // Body (oval)
    ctx.fillStyle=color;
    ctx.beginPath(); ctx.ellipse(x,y,r*0.6,r,0,0,Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle='#ffffff';
    ctx.beginPath(); ctx.arc(x-r*0.2,y-r*0.2,r*0.2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+r*0.2,y-r*0.2,r*0.2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#6600cc';
    ctx.beginPath(); ctx.arc(x-r*0.2,y-r*0.2,r*0.1,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+r*0.2,y-r*0.2,r*0.1,0,Math.PI*2); ctx.fill();
  }

  private drawGolem(ctx: CanvasRenderingContext2D, x:number,y:number,r:number,color:string){
    // Block body
    ctx.fillStyle=color;
    ctx.fillRect(x-r*0.85,y-r,r*1.7,r*2);
    // Stone texture lines
    ctx.strokeStyle='#ffffff22'; ctx.lineWidth=1;
    ctx.strokeRect(x-r*0.85,y-r,r*1.7,r*2);
    ctx.beginPath(); ctx.moveTo(x-r*0.85,y); ctx.lineTo(x+r*0.85,y); ctx.stroke();
    // Glowing eye
    ctx.fillStyle='#8888ff';
    ctx.beginPath(); ctx.arc(x,y-r*0.25,r*0.28,0,Math.PI*2); ctx.fill();
    ctx.shadowColor='#aaaaff'; ctx.shadowBlur=8;
    ctx.fillStyle='#ffffff';
    ctx.beginPath(); ctx.arc(x,y-r*0.25,r*0.12,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
  }

  private drawDragon(ctx: CanvasRenderingContext2D, x:number,y:number,r:number,color:string,isBoss:boolean){
    // Body
    ctx.fillStyle=color;
    ctx.beginPath(); ctx.ellipse(x,y,r,r*0.75,0,0,Math.PI*2); ctx.fill();
    // Wings
    ctx.fillStyle=color+'88';
    ctx.beginPath(); ctx.moveTo(x,y-r*0.3); ctx.bezierCurveTo(x-r*1.5,y-r*1.5,x-r*2,y,x-r*0.8,y+r*0.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x,y-r*0.3); ctx.bezierCurveTo(x+r*1.5,y-r*1.5,x+r*2,y,x+r*0.8,y+r*0.2); ctx.closePath(); ctx.fill();
    // Spine
    ctx.fillStyle=isBoss?'#ff8800':'#ffcc00';
    for(let i=0;i<4;i++){
      const sx=x-r*0.5+i*r*0.33,sy=y-r*0.6;
      ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx-r*0.1,sy-r*(0.3+i*0.05)); ctx.lineTo(sx+r*0.1,sy-r*(0.15+i*0.03)); ctx.closePath(); ctx.fill();
    }
    // Eyes
    ctx.fillStyle='#ff4400';
    ctx.beginPath(); ctx.arc(x-r*0.35,y-r*0.1,r*0.2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+r*0.35,y-r*0.1,r*0.2,0,Math.PI*2); ctx.fill();
    if(isBoss){
      ctx.shadowColor='#ff2200'; ctx.shadowBlur=10;
      ctx.fillStyle='#ffff00';
      ctx.beginPath(); ctx.arc(x-r*0.35,y-r*0.1,r*0.1,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x+r*0.35,y-r*0.1,r*0.1,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    }
  }

  // ─── Sidebar ───────────────────────────────────────────────────────────────
  private renderSidebar(state: RenderState) {
    const ctx=this.ctx, g=state.game, p=state.player;
    const sx=this.gw, sw=SIDEBAR_W;

    ctx.fillStyle='#0c0c1c'; ctx.fillRect(sx,0,sw,this.gh+WAVE_BAR_H);
    ctx.strokeStyle='#252540'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(sx,0); ctx.lineTo(sx,this.gh+WAVE_BAR_H); ctx.stroke();
    ctx.textAlign='left';
    let y=10;

    // Affinity badge
    const aff=p.affinity;
    ctx.fillStyle=ELEMENT_COLORS[aff]+'28';
    this.rr(ctx,sx+8,y,sw-16,22,6); ctx.fill();
    ctx.strokeStyle=ELEMENT_COLORS[aff]+'88'; ctx.lineWidth=1;
    this.rr(ctx,sx+8,y,sw-16,22,6); ctx.stroke();
    ctx.fillStyle=ELEMENT_COLORS[aff]; ctx.font='bold 10px Segoe UI';
    ctx.fillText(`${ELEMENT_ICONS[aff]} Aptidão: ${ELEMENT_NAMES[aff]} (2×)  |  Tier: ${this.map.tier+1}`,sx+12,y+15);
    y+=30;

    // Resources
    ctx.fillStyle='#aaaaff'; ctx.font='bold 12px Segoe UI';
    ctx.fillText(`❤ ${g.lives}   💰 ${g.gold}   ⭐ ${g.score}`,sx+10,y+12);
    y+=26;

    // Level / XP
    ctx.fillStyle='#7777bb'; ctx.font='10px Segoe UI';
    ctx.fillText(`Nível ${p.level}/${MAX_LEVEL}  | Tal. em: ${TALENT_POINT_EVERY-(p.level%TALENT_POINT_EVERY)}nív`,sx+10,y+10);
    y+=14;
    const xpN=p.xpToNextLevel(), xpR=xpN===Infinity?1:p.xp/xpN;
    ctx.fillStyle='#1a1a2e'; ctx.fillRect(sx+10,y,sw-20,7);
    ctx.fillStyle='#5555ff'; ctx.fillRect(sx+10,y,(sw-20)*xpR,7);
    ctx.fillStyle='#5555aa'; ctx.font='8px Segoe UI';
    ctx.fillText(xpN===Infinity?'MAX':`${p.xp}/${xpN}XP`,sx+12,y+6);
    y+=16;

    // Stats
    const st=p.stats;
    const rows:[string,string,number][]=[
      ['⚔','Força',st.strength],['🔮','Intel.',st.intelligence],
      ['🎯','Destr.',st.dexterity],['⚡','Agi.',st.agility],
      ['🍀','Sorte',st.luck],['❤','Vita.',st.vitality],
    ];
    for(let i=0;i<rows.length;i+=2){
      const [ia,la,va]=rows[i],[ib,lb,vb]=rows[i+1]??['','',0];
      ctx.fillStyle='#6666aa'; ctx.font='10px Segoe UI';
      ctx.fillText(`${ia}${la}:${va}`,sx+10,y+10);
      if(ib) ctx.fillText(`${ib}${lb}:${vb}`,sx+sw/2-4,y+10);
      y+=13;
    }
    y+=6;

    // Wave
    const wm=g.waveManager;
    ctx.fillStyle=wm.isBossWave?'#ff88ff':'#aa88ff';
    ctx.font='bold 11px Segoe UI';
    ctx.fillText(`Onda ${wm.currentWave}${wm.isBossWave?' 💀 BOSS':''}`,sx+10,y+12);
    y+=24;

    const bw=sw-20;

    // ── Single contextual action button ──
    {
      let label=''; let bg=''; let fg='';
      if(state.paused){
        label='▶  Continuar'; bg='#1a2a1a'; fg='#55cc55';
      } else if(wm.waveActive){
        label='⏸  Pausar'; bg='#1c1c3c'; fg='#6666aa';
      } else {
        label='⚡  Próxima Onda'; bg='#1a2a1a'; fg='#55cc55';
      }
      const mainRect={x:sx+10,y,w:bw,h:32};
      this.btn(ctx,mainRect,label,bg,fg);
      this.gameUIBtns['mainAction']=mainRect; y+=38;

      // Indicators row (auto + speed + expand)
      const indY=y;
      ctx.font='9px Segoe UI';

      const colW=Math.floor((bw-8)/3);

      // Auto indicator
      const autoRect={x:sx+10,y:indY,w:colW,h:22};
      this.btn(ctx,autoRect,
        state.autoWave?'🔄 Auto: ON':'🔄 Auto: OFF',
        state.autoWave?'#1a2a0a':'#1c1c1c',
        state.autoWave?'#88ff44':'#557755');
      this.gameUIBtns['autoWave']=autoRect;

      // Speed toggle
      const spdRect={x:sx+10+colW+4,y:indY,w:colW,h:22};
      const fast=state.gameSpeed===2;
      this.btn(ctx,spdRect,fast?'⏩ 2x':'▶ 1x',
        fast?'#2a1a00':'#1c1c1c',
        fast?'#ffaa44':'#777766');
      this.gameUIBtns['speedToggle']=spdRect;

      // Expand indicator
      const canExpand=g.currentMapTier<3&&wm.betweenWaves;
      const expAfford=g.gold>=MAP_EXPAND_COST;
      const expRect={x:sx+10+2*(colW+4),y:indY,w:bw-2*(colW+4),h:22};
      const expLabel=g.currentMapTier>=3?'🗺 Max':canExpand?`🗺 ${MAP_EXPAND_COST}g`:'🗺 ---';
      this.btn(ctx,expRect,expLabel,
        canExpand&&expAfford?'#0a1a1a':'#141414',
        canExpand&&expAfford?'#44cccc':'#335555');
      this.gameUIBtns['expandMap']=expRect;
      y+=28;
    }

    // Talent
    const tp=p.talentPoints;
    const talBtn={x:sx+10,y,w:bw,h:28};
    this.btn(ctx,talBtn,`🌟  Talentos${tp>0?` (+${tp})`:''}`,tp>0?'#2a2a00':'#181820',tp>0?'#dddd44':'#777788');
    this.gameUIBtns['talentBtn']=talBtn; y+=34;

    // Bestiary button
    const bstRect={x:sx+10,y,w:bw,h:28};
    this.btn(ctx,bstRect,'📖  Mostruário','#0d0d22','#8888cc');
    this.gameUIBtns['bestiary']=bstRect; y+=34;

    // Move mode indicator
    if(g.movingTower){
      ctx.fillStyle='rgba(100,200,255,0.15)';
      this.rr(ctx,sx+4,y,sw-8,22,6); ctx.fill();
      ctx.fillStyle='#88ddff'; ctx.font='bold 10px Segoe UI'; ctx.textAlign='center';
      ctx.fillText('📦 Clique no destino para mover  (ESC=cancelar)',sx+sw/2,y+15);
      ctx.textAlign='left'; y+=28;
    }

    // Tower list
    ctx.fillStyle='#777799'; ctx.font='bold 10px Segoe UI';
    ctx.fillText('── Torres ──',sx+10,y); y+=12;
    ctx.fillStyle='#445544'; ctx.font='8px Segoe UI';
    const noSel=!g.selectedTowerType;
    ctx.fillText(noSel?'Clique em torre para ações':'Clique no mapa para colocar',sx+10,y); y+=12;

    this.towerSelRects.clear();
    for(const def of TOWER_DEFS){
      const cost=state.towerCost(def.id);
      const rect={x:sx+4,y,w:sw-8,h:48};
      const sel=g.selectedTowerType===def.id, afford=g.gold>=cost;
      ctx.fillStyle=sel?'#141428':'#0e0e1e';
      this.rr(ctx,rect.x,rect.y,rect.w,rect.h,6); ctx.fill();
      ctx.strokeStyle=sel?'#6666ff':afford?'#222244':'#3a2020';
      ctx.lineWidth=sel?2:1; this.rr(ctx,rect.x,rect.y,rect.w,rect.h,6); ctx.stroke();

      const ec=ELEMENT_COLORS[def.element];
      ctx.fillStyle=def.color;
      ctx.beginPath(); ctx.arc(rect.x+13,rect.y+17,7,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=def.accentColor; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle=ec; ctx.font='9px serif'; ctx.textAlign='center';
      ctx.fillText(ELEMENT_ICONS[def.element],rect.x+13,rect.y+20);
      ctx.textAlign='left';

      ctx.fillStyle=afford?'#ddddff':'#887777';
      ctx.font=`${sel?'bold ':''}11px Segoe UI`;
      ctx.fillText(def.name,rect.x+26,rect.y+14);
      ctx.fillStyle=afford?'#88cc88':'#aa6666'; ctx.font='10px Segoe UI';
      ctx.fillText(`💰${cost}g`,rect.x+26,rect.y+27);
      ctx.fillStyle='#445566'; ctx.font='8px Segoe UI';
      ctx.fillText(this.magicLabel(def.element),rect.x+26,rect.y+40);

      this.towerSelRects.set(def.id,rect);
      y+=52;
    }
    ctx.textAlign='center';
  }

  private magicLabel(el: ElementType): string {
    return({fire:'✨ 3-alvo',water:'✨ -5%vel perm.',earth:'✨ AoE',wind:'✨ empurrão 3t'})[el];
  }

  // ─── Upgrade Popup ─────────────────────────────────────────────────────────
  private renderUpgradePopup(
    ctx: CanvasRenderingContext2D,
    popup: UpgradePopup,
    towersAt: (c:number,r:number)=>Tower[],
    towerCost: (id:string)=>number,
    upgCost: number,
    gold: number,
    canFuse: boolean = false,
  ){
    const here=towersAt(popup.col,popup.row);
    const pw=252, towerH=60, actionH=26, headerH=34, add2H=60, closeH=28;
    const fusionH = canFuse ? 36 : 0;
    const towerRows=here.reduce((_,__)=>_+towerH+actionH+6,0);
    const ph=headerH + towerRows + (here.length<2 ? add2H : 0) + fusionH + closeH + 20;

    let px=popup.col*CELL_SIZE+CELL_SIZE+4;
    let py=popup.row*CELL_SIZE;
    if(px+pw>this.gw) px=popup.col*CELL_SIZE-pw-4;
    if(py+ph>this.gh) py=this.gh-ph-4;
    py=Math.max(4,py);
    this.upgradePopupRect={x:px,y:py,w:pw,h:ph};
    this.upgradeBtns={};

    ctx.fillStyle='#111128'; this.rr(ctx,px,py,pw,ph,10); ctx.fill();
    ctx.strokeStyle='#5555aa'; ctx.lineWidth=1.5; this.rr(ctx,px,py,pw,ph,10); ctx.stroke();

    ctx.textAlign='left';
    let ry=py+10;
    ctx.fillStyle='#aaaaff'; ctx.font='bold 12px Segoe UI';
    ctx.fillText(`📍 Célula (${popup.col},${popup.row})`,px+12,ry+12); ry+=headerH;

    here.forEach((tower,i)=>{
      // Info row
      const infoRect={x:px+8,y:ry,w:pw-16,h:towerH-4};
      const maxed=tower.isMaxLevel;
      ctx.fillStyle=maxed?'#1a1500':'#141420';
      this.rr(ctx,infoRect.x,infoRect.y,infoRect.w,infoRect.h,6); ctx.fill();
      ctx.strokeStyle=maxed?'#aaaa00':'#333355'; ctx.lineWidth=1;
      this.rr(ctx,infoRect.x,infoRect.y,infoRect.w,infoRect.h,6); ctx.stroke();

      const ec=ELEMENT_COLORS[tower.def.element];
      const lvlBx=infoRect.x+12, lvlBy=infoRect.y+towerH/2-4;
      ctx.beginPath(); ctx.arc(lvlBx,lvlBy,9,0,Math.PI*2);
      ctx.fillStyle=maxed?'#ffcc00':ec; ctx.fill();
      ctx.fillStyle='#000'; ctx.font='bold 8px Segoe UI'; ctx.textAlign='center';
      ctx.fillText(maxed?'★':`${tower.level}`,lvlBx,lvlBy+3);

      ctx.textAlign='left';
      const role=tower.isSecondary?'[2ª-Magia]':tower.fusionDef?`[${tower.fusionDef.icon} ${tower.fusionDef.name}]`:'[Base]';
      ctx.fillStyle=tower.fusionDef?tower.fusionDef.color:'#aaaaee'; ctx.font='bold 10px Segoe UI';
      ctx.fillText(`${tower.def.name} ${role}`,infoRect.x+27,infoRect.y+15);
      ctx.fillStyle='#777788'; ctx.font='8px Segoe UI';
      const dmgUps=tower.upgradeHistory.filter(h=>h==='damage').length;
      const spdUps=tower.upgradeHistory.filter(h=>h==='speed').length;
      ctx.fillText(`Dmg×${tower.damageMult.toFixed(1)} Spd×${tower.speedMult.toFixed(1)}${tower.upgradeCount>0?` ⚔${dmgUps}⚡${spdUps}`:''}`,infoRect.x+27,infoRect.y+27);
      ctx.fillText(`Venda: ${Math.floor(tower.goldSpent/2)}g | Mover: ${tower.placedCost*2}g`,infoRect.x+27,infoRect.y+39);
      if(tower.dualMagic){ctx.fillStyle='#ffff44'; ctx.font='bold 7px Segoe UI'; ctx.fillText('✨DUAL',infoRect.x+pw-60,infoRect.y+15);}

      ry+=towerH;

      // Action buttons row: Upgrade | Mover | Vender
      const bw3=(pw-28)/3;
      const upRect={x:px+8,y:ry,w:bw3,h:actionH};
      const mvRect={x:px+12+bw3,y:ry,w:bw3,h:actionH};
      const slRect={x:px+16+bw3*2,y:ry,w:bw3,h:actionH};

      const canUp=!maxed&&gold>=upgCost;
      this.btn(ctx,upRect,maxed?'★ Máx':`⬆ ${upgCost}g`,canUp?'#0d1f0d':'#1a1a1a',canUp?'#55bb55':'#445544');
      const canMv=gold>=tower.placedCost*2;
      this.btn(ctx,mvRect,`📦 ${tower.placedCost*2}g`,canMv?'#0d1522':'#1a1a1a',canMv?'#4499cc':'#335577');
      this.btn(ctx,slRect,`🏷 ${Math.floor(tower.goldSpent/2)}g`,'#220f0f','#cc5533');

      this.upgradeBtns[`upgrade_${i}`]=upRect;
      this.upgradeBtns[`move_${i}`]=mvRect;
      this.upgradeBtns[`sell_${i}`]=slRect;
      ry+=actionH+6;
    });

    // Add 2nd tower: 4-element grid
    if(here.length<2){
      ctx.fillStyle='#888899'; ctx.font='bold 9px Segoe UI';
      ctx.fillText('➕ Adicionar 2ª Torre (só dispara magia):',px+10,ry+12);
      ry+=16;
      const bw2=(pw-20)/2, bh2=20;
      TOWER_DEFS.forEach((def,idx)=>{
        const cost=towerCost(def.id)*2;
        const af=gold>=cost;
        const bx=px+8+(idx%2)*(bw2+4), by=ry+Math.floor(idx/2)*(bh2+4);
        const r2={x:bx,y:by,w:bw2,h:bh2};
        ctx.fillStyle=af?'#12122a':'#0e0e1e'; this.rr(ctx,r2.x,r2.y,r2.w,r2.h,5); ctx.fill();
        ctx.strokeStyle=af?ELEMENT_COLORS[def.element]+'88':'#333344'; ctx.lineWidth=1;
        this.rr(ctx,r2.x,r2.y,r2.w,r2.h,5); ctx.stroke();
        ctx.fillStyle=af?ELEMENT_COLORS[def.element]:'#554444'; ctx.font='9px Segoe UI';
        ctx.textAlign='center';
        ctx.fillText(`${ELEMENT_ICONS[def.element]} ${def.name} (${cost}g)`,r2.x+bw2/2,r2.y+14);
        ctx.textAlign='left';
        this.upgradeBtns[`addSecond_${def.id}`]=r2;
      });
      ry+=bh2*2+8+4;
    }

    // Fusion button (shown when both towers are max level)
    if(canFuse){
      const primary = here.find(t => !t.isSecondary);
      const secondary = here.find(t => t.isSecondary);
      if(primary && secondary){
        const fusion = getFusionDef(primary.def.element, secondary.def.element);
        if(fusion){
          const fusRect={x:px+8,y:ry,w:pw-16,h:30};

          // Glowing background
          ctx.shadowColor=fusion.color; ctx.shadowBlur=12;
          ctx.fillStyle='#1a0a2a'; this.rr(ctx,fusRect.x,fusRect.y,fusRect.w,fusRect.h,8); ctx.fill();
          ctx.shadowBlur=0;
          ctx.strokeStyle=fusion.color; ctx.lineWidth=2;
          this.rr(ctx,fusRect.x,fusRect.y,fusRect.w,fusRect.h,8); ctx.stroke();
          ctx.lineWidth=1;

          ctx.fillStyle=fusion.color; ctx.font='bold 11px Segoe UI'; ctx.textAlign='center';
          ctx.fillText(`${fusion.icon} FUSÃO: ${fusion.name}`,fusRect.x+fusRect.w/2,fusRect.y+14);
          ctx.fillStyle='#ccccee'; ctx.font='8px Segoe UI';
          ctx.fillText(fusion.description,fusRect.x+fusRect.w/2,fusRect.y+25);
          ctx.textAlign='left';

          this.upgradeBtns['fusion']=fusRect;
          ry+=36;
        }
      }
    }

    const closeRect={x:px+8,y:ry+4,w:pw-16,h:closeH-6};
    this.btn(ctx,closeRect,'✕ Fechar','#220000','#aa4444');
    this.upgradeBtns['close']=closeRect;
    ctx.textAlign='center';
  }

  // ─── Level Up ──────────────────────────────────────────────────────────────
  private renderLevelUp(player: Player){
    const ctx=this.ctx,cw=this.cw,ch=this.ch;
    ctx.fillStyle='rgba(0,0,0,0.88)'; ctx.fillRect(0,0,cw,ch);
    ctx.textAlign='center';
    ctx.fillStyle='#ddddff'; ctx.font='bold 38px Segoe UI';
    ctx.fillText(`🎉  Nível ${player.level}!`,cw/2,106);
    if(player.level%TALENT_POINT_EVERY===0){
      ctx.fillStyle='#ffdd44'; ctx.font='bold 16px Segoe UI';
      ctx.fillText('⭐ Ponto de Talento desbloqueado!',cw/2,140);
    }
    ctx.font='16px Segoe UI'; ctx.fillStyle='#9999cc';
    ctx.fillText('Escolha um atributo:',cw/2,player.level%TALENT_POINT_EVERY===0?166:148);

    const keys=['strength','intelligence','dexterity','agility','luck','vitality'] as const;
    const cols=3,bw=240,bh=84,gap=16,totalW=cols*bw+(cols-1)*gap;
    const startX=cw/2-totalW/2,startY=player.level%TALENT_POINT_EVERY===0?188:170;
    this.levelUpBtns={};
    keys.forEach((stat,i)=>{
      const col=i%cols,row=Math.floor(i/cols);
      const rect={x:startX+col*(bw+gap),y:startY+row*(bh+gap),w:bw,h:bh};
      ctx.fillStyle='#0c0c22'; this.rr(ctx,rect.x,rect.y,rect.w,rect.h,10); ctx.fill();
      ctx.strokeStyle='#4444aa'; ctx.lineWidth=1.5; this.rr(ctx,rect.x,rect.y,rect.w,rect.h,10); ctx.stroke();
      ctx.fillStyle='#aaaaff'; ctx.font='bold 15px Segoe UI';
      ctx.fillText(`${STAT_ICONS[stat]} ${STAT_LABELS[stat]}`,rect.x+bw/2,rect.y+26);
      ctx.fillStyle='#7777aa'; ctx.font='12px Segoe UI';
      ctx.fillText(STAT_DESCRIPTIONS[stat],rect.x+bw/2,rect.y+44);
      ctx.fillStyle='#6666aa'; ctx.font='11px Segoe UI';
      ctx.fillText(`Atual: ${player.stats[stat]}`,rect.x+bw/2,rect.y+62);
      this.levelUpBtns[stat]=rect;
    });
  }

  // ─── Talent Tree ───────────────────────────────────────────────────────────
  private renderTalents(player: Player, talentTree: TalentTree){
    const ctx=this.ctx,cw=this.cw,ch=this.ch;
    ctx.fillStyle='#07071a'; ctx.fillRect(0,0,cw,ch);
    ctx.textAlign='center';
    ctx.fillStyle='#ddddff'; ctx.font='bold 28px Segoe UI';
    ctx.fillText('🌟  Árvore de Talentos',cw/2,40);
    ctx.fillStyle='#8888aa'; ctx.font='13px Segoe UI';
    ctx.fillText(`Pontos: ${player.talentPoints}  |  Nível: ${player.level}  |  Próximo: nível ${Math.ceil(Math.max(1,player.level)/TALENT_POINT_EVERY)*TALENT_POINT_EVERY}`,cw/2,62);

    const elems:ElementType[]=['fire','water','earth','wind'];
    const nw=200,nh=78,gy=90,sy=96,colW=cw/4;
    this.talentRects.clear();

    elems.forEach((el,branch)=>{
      const cx=branch*colW+colW/2;
      ctx.fillStyle=ELEMENT_COLORS[el]; ctx.font='bold 13px Segoe UI';
      ctx.fillText(`${ELEMENT_ICONS[el]} ${ELEMENT_NAMES[el]}`,cx,sy-4);

      talentTree.talents.filter(t=>t.branch===branch).sort((a,b)=>a.tier-b.tier).forEach((talent,ti)=>{
        const tx=cx-nw/2,ty=sy+ti*gy;
        const rect={x:tx,y:ty,w:nw,h:nh};
        const canBuy=talentTree.canPurchase(talent,player.level,player.stats,player.talentPoints);
        ctx.fillStyle=talent.purchased?'#152215':canBuy?'#141428':'#0e0e1a';
        this.rr(ctx,tx,ty,nw,nh,8); ctx.fill();
        ctx.strokeStyle=talent.purchased?'#44cc44':canBuy?'#6666cc':'#2a2a40';
        ctx.lineWidth=talent.purchased?2:1; this.rr(ctx,tx,ty,nw,nh,8); ctx.stroke();
        if(ti>0){
          const prev=talentTree.talents.find(t=>t.branch===branch&&t.tier===ti-1);
          ctx.strokeStyle=prev?.purchased?'#33aa3355':'#33333355'; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(cx,sy+(ti-1)*gy+nh); ctx.lineTo(cx,ty); ctx.stroke();
        }
        ctx.fillStyle=talent.purchased?'#88ff88':canBuy?'#aaaaff':'#445566';
        ctx.font='bold 11px Segoe UI'; ctx.fillText(talent.name,cx,ty+17);
        ctx.fillStyle=talent.purchased?'#66aa66':'#666688'; ctx.font='10px Segoe UI';
        wrapText(talent.description,26).forEach((l,li)=>ctx.fillText(l,cx,ty+31+li*12));
        ctx.fillStyle='#445544'; ctx.font='8px Segoe UI';
        ctx.fillText(`Nível ${talent.requiredLevel}`,cx,ty+nh-15);
        if(!talent.purchased){ctx.fillStyle=canBuy?'#dddd44':'#444433'; ctx.fillText(`${talent.cost}pt`,cx,ty+nh-4);}
        this.talentRects.set(talent.id,rect);
      });
    });

    const backRect={x:20,y:ch-48,w:160,h:34};
    this.btn(ctx,backRect,'← Voltar','#1a1a2e','#6666aa');
    this.talentBackRect=backRect;
    ctx.textAlign='center';
  }

  // ─── Bestiary ──────────────────────────────────────────────────────────────
  private renderBestiary(){
    const ctx=this.ctx, cw=this.cw, ch=this.ch;
    this.bestiaryRects={};
    ctx.fillStyle='#080814'; ctx.fillRect(0,0,cw,ch);
    ctx.textAlign='center';

    // Title
    ctx.fillStyle='#aaaaff'; ctx.font='bold 20px Segoe UI';
    ctx.fillText('📖 Mostruário',cw/2,34);

    // Tab buttons
    const tabs=['Torres','Inimigos','Golems Elementais'];
    const tw=180, tgap=12, totalTW=tabs.length*tw+(tabs.length-1)*tgap;
    const tx0=cw/2-totalTW/2;
    tabs.forEach((tab,i)=>{
      const r={x:tx0+i*(tw+tgap),y:48,w:tw,h:28};
      const sel=this.bestiaryPage===i;
      ctx.fillStyle=sel?'#1e1e44':'#0e0e22';
      this.rr(ctx,r.x,r.y,r.w,r.h,6); ctx.fill();
      ctx.strokeStyle=sel?'#8888ff':'#333355'; ctx.lineWidth=sel?2:1;
      this.rr(ctx,r.x,r.y,r.w,r.h,6); ctx.stroke();
      ctx.fillStyle=sel?'#ddddff':'#666688'; ctx.font=`${sel?'bold ':''}11px Segoe UI`;
      ctx.fillText(tab,r.x+tw/2,r.y+19);
      this.bestiaryRects[`tab_${i}`]=r;
    });

    const startY=88;

    if(this.bestiaryPage===0){
      // ── Towers ──
      const cols=2, bw=(cw-60)/cols, bh=160, gap=12;
      TOWER_DEFS.forEach((def,i)=>{
        const col=i%cols, row=Math.floor(i/cols);
        const bx=30+col*(bw+gap), by=startY+row*(bh+gap);
        const ec=ELEMENT_COLORS[def.element];
        ctx.fillStyle='#0d0d20'; this.rr(ctx,bx,by,bw,bh,10); ctx.fill();
        ctx.strokeStyle=ec+'66'; ctx.lineWidth=1.5; this.rr(ctx,bx,by,bw,bh,10); ctx.stroke();

        // Tower icon circle
        ctx.fillStyle=def.color;
        ctx.beginPath(); ctx.arc(bx+36,by+40,22,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=def.accentColor; ctx.lineWidth=2; ctx.stroke();
        ctx.font='18px serif'; ctx.fillStyle=ec; ctx.textAlign='center';
        ctx.fillText(ELEMENT_ICONS[def.element],bx+36,by+47);

        ctx.textAlign='left';
        ctx.fillStyle=ec; ctx.font='bold 13px Segoe UI';
        ctx.fillText(def.name,bx+70,by+22);
        ctx.fillStyle='#8888aa'; ctx.font='9px Segoe UI';
        ctx.fillText(`Elemento: ${ELEMENT_NAMES[def.element]}  |  Custo base: ${def.baseCost}g`,bx+70,by+36);
        ctx.fillStyle='#777799'; ctx.font='9px Segoe UI';
        ctx.fillText(`Dano: ${def.baseDamage}  Range: ${def.baseRange}  Cadência: ${def.baseFireRate}/s`,bx+70,by+50);
        ctx.fillText(`Magia: ${def.magicBaseDamage} dmg  |  Barra: ${def.magicBarMax} (gain ${def.magicBarGain}/tiro)`,bx+70,by+63);

        // Description
        ctx.fillStyle='#5566aa'; ctx.font='10px Segoe UI';
        wrapTextLeft(ctx, def.description, bx+12, by+85, bw-20, 14);

        // Magic description
        ctx.fillStyle='#446666'; ctx.font='9px Segoe UI';
        ctx.fillText(`✨ ${this.magicLabel(def.element)}`,bx+12,by+bh-14);
      });
    }

    else if(this.bestiaryPage===1){
      // ── Regular Enemies + Bosses ──
      const allEnemies=[...ENEMY_DEFS, ...BOSS_DEFS];
      const cols=2, bw=(cw-60)/cols, bh=130, gap=10;
      allEnemies.forEach((def,i)=>{
        const col=i%cols, row=Math.floor(i/cols);
        const bx=30+col*(bw+gap), by=startY+row*(bh+gap);
        ctx.fillStyle=def.isBoss?'#1a0a1a':'#0d0d1e';
        this.rr(ctx,bx,by,bw,bh,10); ctx.fill();
        ctx.strokeStyle=def.color+'55'; ctx.lineWidth=1.5; this.rr(ctx,bx,by,bw,bh,10); ctx.stroke();

        // Color swatch
        ctx.fillStyle=def.color;
        ctx.beginPath(); ctx.arc(bx+30,by+35,def.isBoss?20:15,0,Math.PI*2); ctx.fill();

        ctx.textAlign='left';
        ctx.fillStyle=def.isBoss?'#ff88ff':def.color; ctx.font=`bold 12px Segoe UI`;
        ctx.fillText(`${def.isBoss?'💀 ':''} ${def.name}`,bx+60,by+18);
        ctx.fillStyle='#777799'; ctx.font='9px Segoe UI';
        ctx.fillText(`HP: ${def.baseHp}  Vel: ${def.speed}  Agi: ${def.agility}  Vidas: ${def.baseLivesLost}  XP: ${def.xp}`,bx+60,by+32);
        const immN=ELEMENT_NAMES[def.immune];
        const halfN=def.halfElements.map(e=>ELEMENT_NAMES[e]).join(', ');
        const allEl: Array<'fire'|'water'|'earth'|'wind'>=['fire','water','earth','wind'];
        const weak=allEl.find(e=>e!==def.immune&&!def.halfElements.includes(e))!;
        ctx.fillText(`Imune: ${immN}  |  Metade: ${halfN}  |  Fraco: ${ELEMENT_NAMES[weak]}`,bx+60,by+46);
        ctx.fillStyle='#556688'; ctx.font='9px Segoe UI';
        wrapTextLeft(ctx, def.description, bx+8, by+68, bw-16, 13);
      });
    }

    else {
      // ── Golem variants ──
      const bw=(cw-60)/2, bh=150, gap=12;
      GOLEM_DEFS.forEach((def,i)=>{
        const col=i%2, row=Math.floor(i/2);
        const bx=30+col*(bw+gap), by=startY+row*(bh+gap);
        const ec=ELEMENT_COLORS[def.golemType!];
        ctx.fillStyle='#0e0e18'; this.rr(ctx,bx,by,bw,bh,10); ctx.fill();
        ctx.strokeStyle=ec+'88'; ctx.lineWidth=2; this.rr(ctx,bx,by,bw,bh,10); ctx.stroke();

        ctx.fillStyle=def.color;
        ctx.beginPath(); ctx.arc(bx+32,by+40,18,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=ec; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle='#111'; ctx.fillRect(bx+23,by+35,18,5);  // golem eye slot
        ctx.fillStyle=ec; ctx.font='bold 9px Segoe UI'; ctx.textAlign='center';
        ctx.fillText(ELEMENT_ICONS[def.golemType!],bx+32,by+55);

        ctx.textAlign='left';
        ctx.fillStyle=ec; ctx.font='bold 13px Segoe UI';
        ctx.fillText(def.name,bx+58,by+22);
        ctx.fillStyle='#888899'; ctx.font='9px Segoe UI';
        ctx.fillText(`HP: ${def.baseHp}  Vel: ${def.speed}  Agi: ${def.agility}`,bx+58,by+36);
        ctx.fillText(`Imune: ${ELEMENT_NAMES[def.immune]}`,bx+58,by+48);
        ctx.fillStyle='#6688aa'; ctx.font='10px Segoe UI';
        wrapTextLeft(ctx, def.description, bx+8, by+75, bw-16, 13);
        // Ability label
        const abilities: Record<string,string>={
          fire:'🔥 Cura por dano recebido',
          water:'💧 Cura em poças de água',
          earth:'🌍 Absorve dano de aliados próximos',
          wind:'💨 Imune ao empurrão'
        };
        ctx.fillStyle=ec; ctx.font='bold 9px Segoe UI';
        ctx.fillText(abilities[def.golemType!]??'',bx+8,by+bh-12);
      });
    }

    // Back button
    const backR={x:20,y:ch-50,w:180,h:34};
    this.btn(ctx,backR,'← Voltar ao Jogo','#1a1a2e','#6666aa');
    this.bestiaryRects['back']=backR;
    ctx.textAlign='center';
  }

  // ─── Game Over ─────────────────────────────────────────────────────────────
  private renderGameOver(score:number,wave:number){
    const ctx=this.ctx,cw=this.cw,ch=this.ch;
    ctx.fillStyle='rgba(10,0,0,0.95)'; ctx.fillRect(0,0,cw,ch);
    ctx.textAlign='center';
    ctx.fillStyle='#ff4444'; ctx.font='bold 50px Segoe UI';
    ctx.shadowColor='#ff0000'; ctx.shadowBlur=20;
    ctx.fillText('💀  GAME OVER',cw/2,170); ctx.shadowBlur=0;
    ctx.fillStyle='#cc8888'; ctx.font='20px Segoe UI';
    ctx.fillText(`Onda: ${wave}    |    Pontuação: ${score}`,cw/2,230);
    const bw=230,bh=48,bx=cw/2-bw/2;
    const rr={x:bx,y:295,w:bw,h:bh};
    this.btn(ctx,rr,'⚔  Novo Jogo','#3a0000','#ff6666'); this.gameOverBtns['restart']=rr;
    const mr={x:bx,y:360,w:bw,h:bh};
    this.btn(ctx,mr,'🏠  Menu Principal','#1a1a2e','#6666aa'); this.gameOverBtns['menu']=mr;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  private btn(ctx:CanvasRenderingContext2D,rect:Rect,label:string,bg:string,fg:string){
    ctx.fillStyle=bg; this.rr(ctx,rect.x,rect.y,rect.w,rect.h,8); ctx.fill();
    ctx.strokeStyle=fg; ctx.lineWidth=1.5; this.rr(ctx,rect.x,rect.y,rect.w,rect.h,8); ctx.stroke();
    ctx.fillStyle=fg; ctx.font='bold 12px Segoe UI'; ctx.textAlign='center';
    ctx.fillText(label,rect.x+rect.w/2,rect.y+rect.h/2+5);
  }
  private rr(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
    ctx.beginPath();
    ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
  }

  // ─── Debug Panel ───────────────────────────────────────────────────────────
  private renderDebugPanel(ctx: CanvasRenderingContext2D) {
    this.debugBtns = {};
    const pw=240, pad=8, btnH=26, gap=4;
    const cmds: [string,string][] = [
      ['gold_1000',    '💰  +1 000 Ouro'],
      ['gold_10000',   '💰  +10 000 Ouro'],
      ['levelup',      '⬆  Level Up (escolha)'],
      ['levelup10',    '⬆  +10 Levels (auto)'],
      ['maxlevel',     '⬆  Max Level 50'],
      ['heal',         '❤  Curar (max vidas)'],
      ['kill_all',     '💀  Matar Todos'],
      ['skip_wave',    '⏭  Pular Onda'],
      ['skip10',       '⏭  Pular +10 Ondas'],
      ['give_item',    '🎁  Item Aleatório'],
      ['max_towers',   '🏗  Max Todas Torres'],
      ['god_mode',     '🛡  God Mode (9999 HP)'],
    ];
    const ph=pad*2+cmds.length*(btnH+gap)-gap+24;
    const px=10, py=10;

    // backdrop
    ctx.fillStyle='rgba(0,0,0,0.85)';
    this.rr(ctx,px,py,pw,ph,8); ctx.fill();
    ctx.strokeStyle='#ff4444'; ctx.lineWidth=2;
    this.rr(ctx,px,py,pw,ph,8); ctx.stroke();

    ctx.fillStyle='#ff4444'; ctx.font='bold 13px Segoe UI'; ctx.textAlign='left';
    ctx.fillText('🐛 DEBUG  (F12 para fechar)',px+pad,py+18);

    let by=py+28;
    for(const [id,label] of cmds){
      const r={x:px+pad,y:by,w:pw-pad*2,h:btnH};
      this.btn(ctx,r,label,'#1a0a0a','#ff8866');
      this.debugBtns[id]=r;
      by+=btnH+gap;
    }
    ctx.textAlign='left';
  }

  // ─── Public accessors ──────────────────────────────────────────────────────
  getMenuButtonRects()      { return this.menuBtns; }
  getAffinityRects()        { return this.affinityRects; }
  getGameUIRects()          { return this.gameUIBtns; }
  getTowerSelectionRects()  { return this.towerSelRects; }
  getLevelUpButtonRects()   { return this.levelUpBtns; }
  getTalentRects()          { return this.talentRects; }
  getTalentBackRect()       { return this.talentBackRect; }
  getGameOverButtonRects()  { return this.gameOverBtns; }
  getUpgradePopupBtns()     { return this.upgradeBtns; }
  getUpgradePopupRect()     { return this.upgradePopupRect; }
  getBestiaryRects()        { return this.bestiaryRects; }
  getDebugBtns()             { return this.debugBtns; }
  getArchetypeRects()        { return this.archetypeRects; }
  getArchetypeBackRect()     { return this.archetypeBackRect; }
  handleBestiaryTabClick(p: {x:number;y:number}, hit: (p:{x:number;y:number},r:{x:number;y:number;w:number;h:number})=>boolean) {
    for(let i=0;i<3;i++){
      const r=this.bestiaryRects[`tab_${i}`];
      if(r && hit(p,r)){ this.bestiaryPage=i; break; }
    }
  }
}

function mulberry32(seed:number){
  return()=>{
    seed|=0;seed=seed+0x6D2B79F5|0;
    let t=Math.imul(seed^(seed>>>15),1|seed);
    t=t+Math.imul(t^(t>>>7),61|t)^t;
    return((t^(t>>>14))>>>0)/4294967296;
  };
}
function wrapText(text:string,maxLen:number):string[]{
  if(text.length<=maxLen)return[text];
  const words=text.split(' '),lines:string[]=[];let cur='';
  for(const w of words){
    if((cur+' '+w).trim().length>maxLen){if(cur)lines.push(cur.trim());cur=w;}
    else cur=(cur+' '+w).trim();
  }
  if(cur)lines.push(cur.trim());return lines;
}

function wrapTextLeft(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,maxW:number,lineH:number){
  const words=text.split(' ');let line='';
  for(const w of words){
    const test=line?line+' '+w:w;
    if(ctx.measureText(test).width>maxW&&line){
      ctx.fillText(line,x,y); y+=lineH; line=w;
    } else { line=test; }
  }
  if(line)ctx.fillText(line,x,y);
}
