import { Room } from 'colyseus';
import { Schema } from '@colyseus/schema';
import { GameState, WeaponPickup, WeaponType, WeaponProfile } from '@storm-arena/shared';
import { getWeaponStats } from '@storm-arena/shared';
import { MOVEMENT_BOUNDARY } from '../movement/MovementSystem';

export interface WeaponInstance {
  schema: WeaponPickup;
  profile: WeaponProfile;
  wave: number;
  spawnTime: number;
}

const WEAPON_SPAWN_RADIUS = 12;
const WEAPON_RESPAWN_MS = 10000;
const PICKUP_RANGE = 2.5;

export class WeaponSystem {
  private room: Room<GameState>;
  private weapons: Map<string, WeaponInstance> = new Map();
  private currentWave = 0;
  private respawnTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(room: Room<GameState>) {
    this.room = room;
  }

  startWave(wave: number): void {
    this.currentWave = wave;
    this.clearAll();

    const weaponTypes = this.selectWeaponsForWave(wave);
    const count = Math.min(weaponTypes.length, 3);

    for (let i = 0; i < count; i++) {
      this.spawnWeapon(weaponTypes[i]);
    }
  }

  private selectWeaponsForWave(wave: number): WeaponType[] {
    const pool: WeaponType[] = [WeaponType.FIST];
    if (wave >= 1) pool.push(WeaponType.STICK);
    if (wave >= 2) pool.push(WeaponType.BASEBALL_BAT);
    if (wave >= 3) pool.push(WeaponType.AXE);
    if (wave >= 4) pool.push(WeaponType.HAMMER);
    if (wave >= 5) pool.push(WeaponType.ROCK);
    return pool;
  }

  spawnWeapon(type: WeaponType, position?: { x: number; y: number; z: number }): WeaponInstance {
    const profile = getWeaponStats(type);
    const pos = position ?? this.getRandomSpawnPosition();

    const pickup = new WeaponPickup();
    pickup.id = `weapon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    pickup.type = type;
    pickup.position.x = pos.x;
    pickup.position.y = pos.y;
    pickup.position.z = pos.z;
    pickup.isAvailable = true;

    const instance: WeaponInstance = {
      schema: pickup,
      profile,
      wave: 0,
      spawnTime: Date.now(),
    };

    this.weapons.set(pickup.id, instance);
    this.room.state.weaponPickups.set(pickup.id, pickup);

    return instance;
  }

  private getRandomSpawnPosition(): { x: number; y: number; z: number } {
    const angle = Math.random() * Math.PI * 2;
    const radius = WEAPON_SPAWN_RADIUS * (0.5 + Math.random() * 0.5);
    return {
      x: Math.cos(angle) * radius,
      y: 0.5,
      z: Math.sin(angle) * radius,
    };
  }

  tryPickup(playerId: string, weaponId: string): boolean {
    const weapon = this.weapons.get(weaponId);
    if (!weapon || !weapon.schema.isAvailable) return false;

    const player = this.room.state.players.get(playerId);
    if (!player || !player.isAlive) return false;

    const dx = player.position.x - weapon.schema.position.x;
    const dz = player.position.z - weapon.schema.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > PICKUP_RANGE) return false;

    const oldWeapon = player.weapon;
    if (oldWeapon !== WeaponType.FIST) {
      this.dropWeapon(playerId, oldWeapon as WeaponType);
    }

    player.weapon = weapon.schema.type;
    weapon.schema.isAvailable = false;
    this.weapons.delete(weaponId);
    this.room.state.weaponPickups.delete(weaponId);

    this.room.broadcast('GAME_EVENT', {
      event: 'weapon_pickup',
      data: { playerId, weapon: weapon.schema.type as WeaponType },
    });

    this.scheduleRespawn(weapon.profile.type as WeaponType);

    return true;
  }

  dropWeapon(playerId: string, type: WeaponType): void {
    const player = this.room.state.players.get(playerId);
    if (!player) return;

    const profile = getWeaponStats(type);
    const pos = {
      x: player.position.x + (Math.random() - 0.5) * 2,
      y: 0.5,
      z: player.position.z + (Math.random() - 0.5) * 2,
    };

    const pickup = new WeaponPickup();
    pickup.id = `weapon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    pickup.type = type;
    pickup.position.x = pos.x;
    pickup.position.y = pos.y;
    pickup.position.z = pos.z;
    pickup.isAvailable = true;

    const instance: WeaponInstance = {
      schema: pickup,
      profile,
      wave: 0,
      spawnTime: Date.now(),
    };

    this.weapons.set(pickup.id, instance);
    this.room.state.weaponPickups.set(pickup.id, pickup);

    this.room.broadcast('GAME_EVENT', {
      event: 'weapon_drop',
      data: { playerId, weapon: type as WeaponType },
    });
  }

  private scheduleRespawn(type: WeaponType): void {
    const timer = setTimeout(() => {
      this.spawnWeapon(type);
      this.respawnTimers.delete(type);
    }, WEAPON_RESPAWN_MS);
    this.respawnTimers.set(type, timer);
  }

  onPlayerDeath(playerId: string): void {
    const player = this.room.state.players.get(playerId);
    if (player && player.weapon !== WeaponType.FIST) {
      this.dropWeapon(playerId, player.weapon as WeaponType);
      player.weapon = WeaponType.FIST;
    }
  }

  update(deltaTime: number): void {
  }

  clearAll(): void {
    this.room.state.weaponPickups.clear();
    this.weapons.clear();
    this.respawnTimers.forEach(t => clearTimeout(t));
    this.respawnTimers.clear();
  }

  getWeapons(): ReadonlyMap<string, WeaponInstance> {
    return this.weapons;
  }
}