"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BossAI = void 0;
const shared_1 = require("@storm-arena/shared");
const shared_2 = require("@storm-arena/shared");
const BOSS_CONFIGS = {
    easy: {
        speed: 2.5,
        enragedSpeed: 4.0,
        attackRange: 2.5,
        chargeRange: 12,
        detectionRange: 20,
        attackCooldown: 1800,
        slamCooldown: 3000,
        sweepCooldown: 2500,
        spinCooldown: 2800,
        grabCooldown: 3500,
        roarCooldown: 5000,
        chargeSpeed: 8,
        chargeDamage: 20,
        slamDamage: 25,
        sweepDamage: 15,
        punchDamage: 18,
        spinDamage: 12,
        grabDamage: 22,
        roarDamage: 0,
    },
    normal: {
        speed: 3.0,
        enragedSpeed: 5.0,
        attackRange: 2.8,
        chargeRange: 14,
        detectionRange: 22,
        attackCooldown: 1500,
        slamCooldown: 2500,
        sweepCooldown: 2200,
        spinCooldown: 2500,
        grabCooldown: 3000,
        roarCooldown: 4000,
        chargeSpeed: 10,
        chargeDamage: 25,
        slamDamage: 30,
        sweepDamage: 20,
        punchDamage: 22,
        spinDamage: 15,
        grabDamage: 28,
        roarDamage: 0,
    },
    hard: {
        speed: 3.5,
        enragedSpeed: 6.0,
        attackRange: 3.0,
        chargeRange: 16,
        detectionRange: 25,
        attackCooldown: 1200,
        slamCooldown: 2000,
        sweepCooldown: 1800,
        spinCooldown: 2000,
        grabCooldown: 2500,
        roarCooldown: 3000,
        chargeSpeed: 12,
        chargeDamage: 30,
        slamDamage: 38,
        sweepDamage: 25,
        punchDamage: 28,
        spinDamage: 18,
        grabDamage: 35,
        roarDamage: 0,
    },
};
class BossAI {
    constructor(boss, difficulty) {
        this.state = 'idle';
        this.targetPlayerId = null;
        this.lastAttackTime = 0;
        this.lastSweepTime = 0;
        this.lastSlamTime = 0;
        this.lastSpinTime = 0;
        this.lastGrabTime = 0;
        this.lastRoarTime = 0;
        this.lastChargeTime = 0;
        this.attackAnimating = false;
        this.attackAnimTimer = 0;
        this.chargeAnimating = false;
        this.chargeTimer = 0;
        this.chargeDir = { x: 0, z: 0 };
        this.phaseTransitionPending = false;
        this.phaseTransitionTimer = 0;
        this.now = 0;
        this.boss = boss;
        this.config = BOSS_CONFIGS[difficulty] ?? BOSS_CONFIGS.normal;
    }
    spawn(playerCount) {
        const health = (0, shared_2.getBossHealth)(playerCount);
        this.boss.id = 'boss_001';
        this.boss.health = health;
        this.boss.maxHealth = health;
        this.boss.phase = shared_1.BossPhase.PHASE_1;
        this.boss.currentAttack = '';
        this.boss.isEnraged = false;
        this.boss.isActive = true;
        this.boss.position.x = 0;
        this.boss.position.y = 0;
        this.boss.position.z = -15;
        this.boss.rotation.x = 0;
        this.boss.rotation.y = 0;
        this.boss.rotation.z = 0;
        this.state = 'idle';
        this.targetPlayerId = null;
        this.lastAttackTime = 0;
        this.lastSweepTime = 0;
        this.lastSlamTime = 0;
        this.lastSpinTime = 0;
        this.lastGrabTime = 0;
        this.lastRoarTime = 0;
        this.lastChargeTime = 0;
        this.attackAnimating = false;
        this.chargeAnimating = false;
        this.phaseTransitionPending = false;
    }
    tick(deltaMs, players) {
        if (!this.boss.isActive)
            return;
        this.now = performance.now();
        const dt = deltaMs / 1000;
        if (this.boss.health <= 0) {
            this.handleDeath();
            return;
        }
        if (this.phaseTransitionPending) {
            this.phaseTransitionTimer -= deltaMs;
            if (this.phaseTransitionTimer <= 0) {
                this.phaseTransitionPending = false;
            }
            return;
        }
        if (this.attackAnimating) {
            this.attackAnimTimer -= deltaMs;
            if (this.attackAnimTimer <= 0) {
                this.attackAnimating = false;
                this.boss.currentAttack = '';
            }
            return;
        }
        if (this.chargeAnimating) {
            this.tickCharge(dt);
            return;
        }
        this.updatePhase();
        this.selectTarget(players);
        if (!this.targetPlayerId) {
            this.state = this.boss.isEnraged ? 'enraged_idle' : 'idle';
            this.faceForward();
            return;
        }
        const target = players.get(this.targetPlayerId);
        if (!target || !target.isAlive) {
            this.targetPlayerId = null;
            this.state = 'idle';
            return;
        }
        const dx = target.position.x - this.boss.position.x;
        const dz = target.position.z - this.boss.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        this.faceTarget(target);
        if (this.boss.isEnraged) {
            this.tickEnraged(dist, target, dt);
        }
        else {
            this.tickNormal(dist, target, dt);
        }
    }
    tickNormal(dist, target, dt) {
        if (dist <= this.config.attackRange) {
            const attack = this.pickAttack(dist);
            if (attack) {
                this.executeAttack(attack, target);
                return;
            }
        }
        if (dist <= this.config.attackRange) {
            this.state = 'idle';
            return;
        }
        if (dist <= this.config.chargeRange && this.canCharge()) {
            this.startCharge(target);
            return;
        }
        this.state = 'chase';
        this.moveToward(target, this.config.speed, dt);
    }
    tickEnraged(dist, target, dt) {
        if (dist <= this.config.attackRange) {
            const attack = this.pickAttack(dist);
            if (attack) {
                this.executeAttack(attack, target);
                return;
            }
        }
        if (dist <= this.config.attackRange) {
            this.state = 'enraged_idle';
            return;
        }
        if (dist <= this.config.chargeRange && this.canCharge()) {
            this.startCharge(target);
            return;
        }
        this.state = 'enraged_chase';
        this.moveToward(target, this.config.enragedSpeed, dt);
    }
    pickAttack(dist) {
        const now = this.now;
        if (dist <= 2.0 && this.canSlam(now)) {
            return shared_1.BossAttack.SLAM;
        }
        if (dist <= 2.5 && this.canSweep(now)) {
            return shared_1.BossAttack.SWEEP;
        }
        if (dist <= 2.0 && this.canGrab(now)) {
            return shared_1.BossAttack.GRAB_THROW;
        }
        if (dist <= 2.5 && this.canSpin(now)) {
            return shared_1.BossAttack.SPIN_ATTACK;
        }
        if (this.canPunch(now)) {
            return shared_1.BossAttack.HEAVY_PUNCH;
        }
        if (this.canRoar(now)) {
            return shared_1.BossAttack.ROAR;
        }
        return null;
    }
    executeAttack(attack, target) {
        this.boss.currentAttack = attack;
        this.attackAnimating = true;
        switch (attack) {
            case shared_1.BossAttack.HEAVY_PUNCH:
                this.attackAnimTimer = 800;
                this.lastAttackTime = this.now;
                break;
            case shared_1.BossAttack.SWEEP:
                this.attackAnimTimer = 1000;
                this.lastSweepTime = this.now;
                this.state = 'sweep';
                break;
            case shared_1.BossAttack.SLAM:
                this.attackAnimTimer = 1200;
                this.lastSlamTime = this.now;
                this.state = 'slam';
                break;
            case shared_1.BossAttack.SPIN_ATTACK:
                this.attackAnimTimer = 1100;
                this.lastSpinTime = this.now;
                this.state = 'spin';
                break;
            case shared_1.BossAttack.GRAB_THROW:
                this.attackAnimTimer = 1400;
                this.lastGrabTime = this.now;
                this.state = 'grab';
                break;
            case shared_1.BossAttack.ROAR:
                this.attackAnimTimer = 1500;
                this.lastRoarTime = this.now;
                this.state = 'roar';
                break;
            case shared_1.BossAttack.CHARGE:
                break;
        }
    }
    startCharge(target) {
        this.chargeAnimating = true;
        this.chargeTimer = 1500;
        this.boss.currentAttack = shared_1.BossAttack.CHARGE;
        this.state = 'charge';
        this.lastChargeTime = this.now;
        const dx = target.position.x - this.boss.position.x;
        const dz = target.position.z - this.boss.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0.01) {
            this.chargeDir = { x: dx / dist, z: dz / dist };
        }
    }
    tickCharge(dt) {
        this.chargeTimer -= dt * 1000;
        this.boss.position.x += this.chargeDir.x * this.config.chargeSpeed * dt;
        this.boss.position.z += this.chargeDir.z * this.config.chargeSpeed * dt;
        const boundary = 20;
        this.boss.position.x = Math.max(-boundary, Math.min(boundary, this.boss.position.x));
        this.boss.position.z = Math.max(-boundary, Math.min(boundary, this.boss.position.z));
        if (this.chargeDir.x !== 0 || this.chargeDir.z !== 0) {
            this.boss.rotation.y = Math.atan2(this.chargeDir.x, this.chargeDir.z);
        }
        if (this.chargeTimer <= 0) {
            this.chargeAnimating = false;
            this.boss.currentAttack = '';
            this.attackAnimTimer = 600;
            this.attackAnimating = true;
        }
    }
    moveToward(target, speed, dt) {
        const dx = target.position.x - this.boss.position.x;
        const dz = target.position.z - this.boss.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 0.1)
            return;
        const nx = dx / dist;
        const nz = dz / dist;
        this.boss.position.x += nx * speed * dt;
        this.boss.position.z += nz * speed * dt;
        const boundary = 20;
        this.boss.position.x = Math.max(-boundary, Math.min(boundary, this.boss.position.x));
        this.boss.position.z = Math.max(-boundary, Math.min(boundary, this.boss.position.z));
    }
    faceTarget(target) {
        const dx = target.position.x - this.boss.position.x;
        const dz = target.position.z - this.boss.position.z;
        if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
            this.boss.rotation.y = Math.atan2(dx, dz);
        }
    }
    faceForward() {
        // keep current rotation
    }
    selectTarget(players) {
        let closest = null;
        let closestDist = Infinity;
        players.forEach((player, id) => {
            if (!player.isAlive)
                return;
            const dx = player.position.x - this.boss.position.x;
            const dz = player.position.z - this.boss.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < closestDist) {
                closestDist = dist;
                closest = id;
            }
        });
        this.targetPlayerId = closest;
    }
    updatePhase() {
        if (this.phaseTransitionPending)
            return;
        const hpPct = this.boss.health / Math.max(1, this.boss.maxHealth);
        if (hpPct <= 0.2 && this.boss.phase !== shared_1.BossPhase.ENRAGED) {
            this.boss.isEnraged = true;
            this.boss.phase = shared_1.BossPhase.ENRAGED;
            this.triggerPhaseTransition();
            return;
        }
        if (hpPct <= 0.5 && this.boss.phase === shared_1.BossPhase.PHASE_1) {
            this.boss.phase = shared_1.BossPhase.PHASE_3;
            this.triggerPhaseTransition();
            return;
        }
        if (hpPct <= 0.75 && this.boss.phase === shared_1.BossPhase.PHASE_1) {
            this.boss.phase = shared_1.BossPhase.PHASE_2;
            this.triggerPhaseTransition();
            return;
        }
    }
    triggerPhaseTransition() {
        this.phaseTransitionPending = true;
        this.phaseTransitionTimer = 1500;
        this.boss.currentAttack = '';
        this.attackAnimating = false;
        this.chargeAnimating = false;
    }
    handleDeath() {
        if (this.state === 'death')
            return;
        this.state = 'death';
        this.boss.currentAttack = '';
        this.boss.isActive = false;
        this.attackAnimating = false;
        this.chargeAnimating = false;
    }
    canPunch(now) {
        return now - this.lastAttackTime >= this.config.attackCooldown;
    }
    canSweep(now) {
        return now - this.lastSweepTime >= this.config.sweepCooldown;
    }
    canSlam(now) {
        return now - this.lastSlamTime >= this.config.slamCooldown;
    }
    canSpin(now) {
        return now - this.lastSpinTime >= this.config.spinCooldown;
    }
    canGrab(now) {
        return now - this.lastGrabTime >= this.config.grabCooldown;
    }
    canRoar(now) {
        return now - this.lastRoarTime >= this.config.roarCooldown;
    }
    canCharge() {
        return this.now - this.lastChargeTime >= 4000;
    }
    getAttackHitbox() {
        if (!this.attackAnimating && !this.chargeAnimating)
            return null;
        const attack = this.boss.currentAttack;
        if (!attack)
            return null;
        let radius = 2.5;
        let damage = this.config.punchDamage;
        switch (attack) {
            case shared_1.BossAttack.HEAVY_PUNCH:
                radius = 2.5;
                damage = this.config.punchDamage;
                break;
            case shared_1.BossAttack.SWEEP:
                radius = 3.5;
                damage = this.config.sweepDamage;
                break;
            case shared_1.BossAttack.SLAM:
                radius = 4.0;
                damage = this.config.slamDamage;
                break;
            case shared_1.BossAttack.SPIN_ATTACK:
                radius = 3.0;
                damage = this.config.spinDamage;
                break;
            case shared_1.BossAttack.GRAB_THROW:
                radius = 2.0;
                damage = this.config.grabDamage;
                break;
            case shared_1.BossAttack.CHARGE:
                radius = 2.0;
                damage = this.config.chargeDamage;
                break;
            case shared_1.BossAttack.ROAR:
                return null;
            default:
                return null;
        }
        return {
            x: this.boss.position.x,
            z: this.boss.position.z,
            radius,
            damage,
            type: attack,
        };
    }
    getChargeHitbox() {
        if (!this.chargeAnimating)
            return null;
        return {
            x: this.boss.position.x,
            z: this.boss.position.z,
            radius: 2.0,
            damage: this.config.chargeDamage,
        };
    }
    isAttackActive() {
        return this.attackAnimating || this.chargeAnimating;
    }
}
exports.BossAI = BossAI;
//# sourceMappingURL=BossAI.js.map