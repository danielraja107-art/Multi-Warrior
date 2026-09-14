import { Room } from 'colyseus';
import { GameEvent, GameState, BossAttack, BossPhase, RoomPhase } from '@storm-arena/shared';
import { getBossHealth } from '@storm-arena/shared';

export class BossSystem {
  private room: Room<GameState>;
  private lastAttackAt = 0;
  private attackIntervalMs = 3500;

  constructor(room: Room<GameState>) {
    this.room = room;
  }

  spawnBoss(playerCount = this.room.state.players.size): void {
    const maxHealth = getBossHealth(playerCount);
    const boss = this.room.state.boss;

    boss.id = 'boss-main';
    boss.maxHealth = maxHealth;
    boss.health = maxHealth;
    boss.phase = BossPhase.PHASE_1;
    boss.currentAttack = BossAttack.HEAVY_PUNCH;
    boss.isEnraged = false;
    boss.isActive = true;
    boss.position.x = 0;
    boss.position.y = 0;
    boss.position.z = 0;
    boss.rotation.x = 0;
    boss.rotation.y = 0;
    boss.rotation.z = 0;

    this.lastAttackAt = 0;

    this.room.broadcast('GAME_EVENT', {
      event: GameEvent.BOSS_SPAWN,
      data: {
        wave: this.room.state.currentWave,
        phase: boss.phase,
        maxHealth,
      },
    });
  }

  update(deltaTime: number): void {
    const boss = this.room.state.boss;
    if (!boss.isActive) return;

    const elapsed = this.room.state.elapsedTime;
    if (elapsed - this.lastAttackAt >= this.attackIntervalMs) {
      this.triggerAttack();
      this.lastAttackAt = elapsed;
    }
  }

  applyDamage(amount: number): boolean {
    const boss = this.room.state.boss;
    if (!boss.isActive) return false;

    const damage = Math.max(0, Number(amount) || 0);
    boss.health = Math.max(0, boss.health - damage);

    this.syncPhaseFromHealth();
    if (boss.health <= 0) {
      return this.defeatBoss();
    }

    return false;
  }

  private triggerAttack(): void {
    const boss = this.room.state.boss;
    const pool = this.getAttackPoolForPhase(boss.phase);
    const nextAttack = pool[Math.floor(Math.random() * pool.length)] ?? BossAttack.HEAVY_PUNCH;

    boss.currentAttack = nextAttack;
    this.room.broadcast('GAME_EVENT', {
      event: 'boss_attack',
      data: {
        phase: boss.phase,
        attack: nextAttack,
      },
    });
  }

  private getAttackPoolForPhase(phase: string): BossAttack[] {
    switch (phase) {
      case BossPhase.PHASE_3:
        return [BossAttack.SPIN_ATTACK, BossAttack.GRAB_THROW, BossAttack.ROAR];
      case BossPhase.PHASE_2:
        return [BossAttack.CHARGE, BossAttack.SLAM, BossAttack.ROAR];
      case BossPhase.ENRAGED:
        return [BossAttack.SPIN_ATTACK, BossAttack.GRAB_THROW, BossAttack.ROAR, BossAttack.CHARGE];
      case BossPhase.PHASE_1:
      default:
        return [BossAttack.HEAVY_PUNCH, BossAttack.SWEEP];
    }
  }

  private syncPhaseFromHealth(): void {
    const boss = this.room.state.boss;
    if (!boss.isActive) return;

    const ratio = boss.maxHealth > 0 ? boss.health / boss.maxHealth : 0;
    let nextPhase = BossPhase.PHASE_1;

    if (ratio < 0.2) nextPhase = BossPhase.ENRAGED;
    else if (ratio <= 0.5) nextPhase = BossPhase.PHASE_3;
    else if (ratio <= 0.75) nextPhase = BossPhase.PHASE_2;

    if (nextPhase !== boss.phase) {
      boss.phase = nextPhase;
      boss.isEnraged = nextPhase === BossPhase.ENRAGED;
      this.room.broadcast('GAME_EVENT', {
        event: GameEvent.BOSS_PHASE_CHANGE,
        data: {
          phase: boss.phase,
          isEnraged: boss.isEnraged,
        },
      });
    } else {
      boss.isEnraged = nextPhase === BossPhase.ENRAGED;
    }
  }

  private defeatBoss(): boolean {
    const boss = this.room.state.boss;
    boss.health = 0;
    boss.isActive = false;
    boss.isEnraged = false;
    boss.currentAttack = '';
    this.room.state.phase = RoomPhase.VICTORY;

    this.room.broadcast('GAME_EVENT', {
      event: GameEvent.BOSS_DEFEATED,
      data: {
        phase: boss.phase,
        health: boss.health,
        maxHealth: boss.maxHealth,
        victory: true,
      },
    });

    this.room.broadcast('GAME_EVENT', {
      event: GameEvent.MATCH_END,
      data: { victory: true },
    });

    return true;
  }

  getBoss() {
    return this.room.state.boss;
  }
}
