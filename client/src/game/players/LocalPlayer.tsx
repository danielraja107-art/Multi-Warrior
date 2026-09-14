import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, type RapierRigidBody } from '@react-three/rapier';
import { Vector3, Quaternion, Euler, type Group } from 'three';
import { WeaponType, AttackType } from '@storm-arena/shared';
import { input, endInputFrame } from '../Input';
import { useGameStore } from '../../state/GameStore';
import { sendPlayerMove, sendPlayerAttack, sendPlayerDodge, sendPlayerBlock } from '../../network/commands';
import { setLiveTransform } from './registry';
import { PlaceholderPlayer } from './PlaceholderPlayer';
import { defaultPose, type PlaceholderPose } from './pose';
import { playSound } from '../audio/AudioManager';

const WALK_SPEED = 5.0;
const RUN_SPEED = 9.0;
const SEND_INTERVAL_MS = 50;
const CORRECT_SOFT = 0.6;
const CORRECT_HARD = 3.0;
const DODGE_SPEED = 14.0;
const DODGE_TIME_MS = 250;

const _forward = new Vector3();
const _right = new Vector3();
const _desired = new Vector3();
const _cur = new Vector3();
const _euler = new Euler();
const _quat = new Quaternion();
const _up = new Vector3(0, 1, 0);

interface LocalPlayerProps {
  sessionId: string;
  color: string;
}

export function LocalPlayer({ sessionId, color }: LocalPlayerProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const groupRef = useRef<Group>(null);
  const lastSend = useRef(0);
  const dodgeUntil = useRef(0);
  const blockingRef = useRef(false);
  const dampX = useRef(0);
  const dampZ = useRef(0);
  const attackUntil = useRef(0);
  const attackKindRef = useRef<PlaceholderPose['attackKind']>(null);
  const weaponRef = useRef<WeaponType>(WeaponType.FIST);
  const pose = useRef(defaultPose()).current;

  useFrame(({ camera }, delta) => {
    const body = bodyRef.current;
    if (!body) return;

    endInputFrame();

    const store = useGameStore.getState();

    if (store.phase !== 'game') {
      body.setLinvel({ x: 0, y: body.linvel().y, z: 0 }, true);
      pose.speed = 0;
      pose.idle = true;
      pose.blocking = false;
      syncGroupAndRegistry();
      return;
    }

    const player = store.players[sessionId];
    pose.fallen = player ? !player.isAlive : false;
    if (player && player.weapon) weaponRef.current = player.weapon;

    camera.getWorldDirection(_forward);
    _forward.y = 0;
    if (_forward.lengthSq() < 1e-6) _forward.set(0, 0, -1);
    _forward.normalize();
    _right.crossVectors(_up, _forward).normalize();

    let mx = input.moveX;
    let my = input.moveY;
    const mag = Math.sqrt(mx * mx + my * my);
    if (mag > 1) {
      mx /= mag;
      my /= mag;
    }

    _desired.set(0, 0, 0);
    _desired.addScaledVector(_forward, my);
    _desired.addScaledVector(_right, mx);
    const moving = _desired.lengthSq() > 1e-6;
    if (moving) _desired.normalize();

    const now = performance.now();
    const isDodging = now < dodgeUntil.current;
    const requestedSpeed = input.run ? RUN_SPEED : WALK_SPEED;

    const lin = body.linvel();
    if (isDodging) {
      _cur.set(_desired.x * DODGE_SPEED, 0, _desired.z * DODGE_SPEED);
      body.setLinvel({ x: _cur.x, y: lin.y, z: _cur.z }, true);
    } else if (moving) {
      const targetSpeed = requestedSpeed;
      dampX.current += (_desired.x * targetSpeed - dampX.current) * Math.min(1, 12 * delta);
      dampZ.current += (_desired.z * targetSpeed - dampZ.current) * Math.min(1, 12 * delta);
      body.setLinvel({ x: dampX.current, y: lin.y, z: dampZ.current }, true);

      _euler.set(0, Math.atan2(_desired.x, _desired.z), 0);
      _quat.setFromEuler(_euler);
      body.setRotation(_quat, true);
    } else {
      dampX.current *= Math.max(0, 1 - 8 * delta);
      dampZ.current *= Math.max(0, 1 - 8 * delta);
      body.setLinvel({ x: dampX.current, y: lin.y, z: dampZ.current }, true);
    }

    if (input.dodgePressedThisFrame && !isDodging) {
      dodgeUntil.current = now + DODGE_TIME_MS;
      pose.dodge = 1;
      const dirX = moving ? _desired.x : forwardYawX(body);
      const dirZ = moving ? _desired.z : forwardYawZ(body);
      body.setLinvel({ x: dirX * DODGE_SPEED, y: lin.y, z: dirZ * DODGE_SPEED }, true);
      sendPlayerDodge({ x: dirX, y: 0, z: dirZ });
    }

    if (input.blockPressedThisFrame) {
      blockingRef.current = !blockingRef.current;
      sendPlayerBlock(blockingRef.current);
    }

    const weapon = useGameStore.getState().players[sessionId]?.weapon ?? WeaponType.FIST;
    if (input.attackPressedThisFrame) {
      attackUntil.current = now + 400;
      attackKindRef.current = weapon === WeaponType.ROCK ? 'rock_throw' : weapon === WeaponType.FIST ? 'punch_light' : 'swing';
      sendPlayerAttack(AttackType.LIGHT, weapon);
      playAttackSwing(weapon, false);
    }
    if (input.heavyAttackPressedThisFrame) {
      attackUntil.current = now + 600;
      attackKindRef.current = weapon === WeaponType.FIST ? 'punch_heavy' : 'swing';
      sendPlayerAttack(AttackType.HEAVY, weapon);
      playAttackSwing(weapon, true);
    }

    const elapsed = now - lastSend.current;
    if (elapsed >= SEND_INTERVAL_MS) {
      lastSend.current = now;
      const rot = body.rotation();
      const yaw = getYaw(rot);
      const vel = body.linvel();
      const speed = Math.hypot(vel.x, vel.z) || 1;
      sendPlayerMove({ x: vel.x / speed, y: 0, z: vel.z / speed }, { x: 0, y: yaw }, now);
    }

    updatePose(delta, moving);
    reconcile(body, delta);
    syncGroupAndRegistry();
  });

  function updatePose(delta: number, moving: boolean) {
    const body = bodyRef.current;
    if (!body) return;
    const vel = body.linvel();
    const speed = Math.hypot(vel.x, vel.z);
    pose.speed = speed;
    pose.idle = speed < 0.2 && !moving;
    pose.runAmount = Math.max(0, Math.min(1, (speed - WALK_SPEED) / (RUN_SPEED - WALK_SPEED)));
    pose.blocking = blockingRef.current;
    pose.dodge = Math.max(0, pose.dodge - delta * 4);
    pose.stagger = Math.max(0, pose.stagger - delta * 3);

    const now = performance.now();
    if (now < attackUntil.current) {
      const t = (attackUntil.current - now) / 400;
      pose.attack = Math.sin((1 - t) * Math.PI);
      pose.attackKind = attackKindRef.current;
    } else {
      pose.attack = 0;
      pose.attackKind = null;
    }
  }

  function playAttackSwing(weapon: WeaponType, heavy: boolean) {
    if (weapon === WeaponType.FIST) {
      playSound(heavy ? 'punch_heavy' : 'punch_light');
    } else if (weapon === WeaponType.STICK) {
      playSound('stick_swing');
    } else if (weapon === WeaponType.BASEBALL_BAT) {
      playSound('bat_swing');
    } else if (weapon === WeaponType.AXE) {
      playSound('axe_swing');
    } else if (weapon === WeaponType.HAMMER) {
      playSound('hammer_swing');
    } else if (weapon === WeaponType.ROCK) {
      playSound('rock_throw');
    }
  }

  function forwardYawX(body: RapierRigidBody): number {
    return Math.sin(getYaw(body.rotation()));
  }

  function forwardYawZ(body: RapierRigidBody): number {
    return Math.cos(getYaw(body.rotation()));
  }

  function getYaw(q: { x: number; y: number; z: number; w: number }): number {
    const e = new Euler().setFromQuaternion(new Quaternion(q.x, q.y, q.z, q.w));
    return e.y;
  }

  function reconcile(body: RapierRigidBody, delta: number) {
    const local = useGameStore.getState().players[sessionId];
    if (!local) return;

    _cur.set(local.position.x, local.position.y, local.position.z);
    const t = body.translation();
    const curPos = new Vector3(t.x, t.y, t.z);
    const dist = curPos.distanceTo(_cur);

    if (dist > CORRECT_HARD) {
      const alpha = 1 - Math.exp(-10 * delta);
      curPos.lerp(_cur, alpha);
      body.setTranslation(curPos, true);
    } else if (dist > CORRECT_SOFT) {
      const alpha = (1 - Math.exp(-4 * delta)) * 0.35;
      curPos.lerp(_cur, alpha);
      body.setTranslation(curPos, true);
    }
  }

  function syncGroupAndRegistry() {
    const body = bodyRef.current;
    const group = groupRef.current;
    if (!body || !group) return;
    const t = body.translation();
    const r = body.rotation();
    group.position.set(t.x, t.y, t.z);
    group.quaternion.set(r.x, r.y, r.z, r.w);
    setLiveTransform(sessionId, new Vector3(t.x, t.y, t.z), new Quaternion(r.x, r.y, r.z, r.w));
  }

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      colliders={false}
      position={[0, 1.1, 0]}
      enabledRotations={[false, true, false]}
      ccd
    >
      <CapsuleCollider args={[0.6, 0.3]} position={[0, 0.9, 0]} />
      <group ref={groupRef}>
        <PlaceholderPlayer
          color={color as never}
          poseRef={{ current: pose }}
          isLocal
          weapon={weaponRef.current}
          weaponSwing={pose.attack}
          playerState={pose.fallen ? 'dead' : pose.idle ? 'idle' : pose.speed > 7.5 ? 'running' : 'running'}
          speed={pose.speed}
          alive={!pose.fallen}
        />
      </group>
    </RigidBody>
  );
}