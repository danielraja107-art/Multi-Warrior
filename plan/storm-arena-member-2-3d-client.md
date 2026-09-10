# Storm Arena — Member 2 Development TODO

**Role:** Member 2 — 3D Client / Gameplay Presentation Lead  
**Primary Areas:** React Three Fiber, Three.js, Rapier client integration, player/enemy/boss rendering, camera, effects, animation, assets, audio  
**Works With:** Member 1 (Tech Lead / Server) and Member 3 (UI / Platform)

## ⚡ PHASE STATUS OVERVIEW

| Phase | Status |
|------|--------|
| Phase 0 — Client Foundation | ✅ DONE |
| Phase 1 — Player Controller | ✅ DONE |
| Phase 2 — Camera System | ✅ DONE |
| Phase 3 — Character Model + Animation | ✅ DONE (controller live; real GLB pending assets) |
| Phase 4 — Combat Presentation | ✅ DONE |
| Phase 5 — Weapon Visual System | ✅ DONE |
| Phase 6 — Enemy Presentation | ✅ DONE |
| Phase 7 — Physics Presentation | ✅ DONE (enemy collider/weapon sensors remain) |
| Phase 8 — Wave + Environment | ✅ DONE |
| Phase 9 — Audio | ✅ DONE (synthesized WebAudio; mp3 swap hooks ready) |
| Phase 10 — Boss Asset Pipeline | 🔄 IN PROGRESS (GLB placed + client loading live; Mixamo/Blender/Compress pending) |
| Phase 11 — Boss Client | ✅ DONE (real GLB loaded + procedural motion) |
| Phase 12 — Network Client | ✅ DONE |
| Phase 13 — Effects | ✅ DONE |
| Phase 14 — Performance | ⏳ PENDING |
| Phase 15 — Member 3 Integration | ⏳ PARTIAL (HUD pending Member 3) |
| Phase 16 — Multiplayer Playtest | ⏳ PENDING |
| Phase 17 — Latency Testing | ⏳ PENDING |
| Phase 18 — Vertical Slice | ⏳ PENDING |
| Phase 19 — Production Client | ⏳ PENDING |

---

# 0. ROLE RULES

Member 2 owns the **visual and client-side game experience**.

You are responsible for making the server state look and feel like a real game in the browser.

### Primary ownership

- [x] ~~React Three Fiber / Three.js scene~~
- [x] ~~Player rendering~~
- [x] ~~Player controller and local input~~
- [x] ~~Movement presentation~~
- [x] ~~Client-side movement prediction / reconciliation~~
- [x] ~~Enemy rendering~~
- [x] ~~Weapon rendering~~
- [x] ~~Boss rendering~~
- [x] ~~Group-follow camera~~
- [x] ~~Client-side Rapier integration~~
- [x] ~~Animation playback~~
- [x] ~~Hit effects~~
- [x] ~~Knockback presentation~~
- [x] ~~Weapon trails~~
- [x] ~~Rain / lightning / environmental effects~~
- [x] ~~Audio manager and gameplay audio~~
- [ ] Asset loading / organization / optimization support
- [ ] Client-side performance

### Do NOT own

- [ ] Server-authoritative damage
- [ ] Server hit validation
- [ ] Server enemy AI decisions
- [ ] Server wave decisions
- [ ] Server boss phase authority
- [ ] Database schema / migrations
- [ ] Authentication implementation
- [Authoritative game-state decisions]

Those belong primarily to Member 1 and Member 3.

---

# 1. CORE PROJECT CONTRACT

The game is an online 2–4 player cooperative 3D arena beat-'em-up.

Core pillars:

- [ ] Cooperative gameplay
- [ ] Melee-only combat
- [ ] Wave-based progression
- [ ] Server-authoritative simulation

The client must treat server state as authoritative.

Reference gameplay flow:

```text
MAIN MENU
   ↓
CREATE / JOIN ROOM
   ↓
LOBBY
   ↓
START
   ↓
WAVE 1
   ↓
WAVE 2
   ↓
WAVE 3
   ↓
ELITE ASSAULT
   ↓
BOSS
   ↓
VICTORY
   ↓
RESULTS + XP
```

---

# 2. PHASE 0 — CLIENT FOUNDATION ✅ DONE

## Goal

Create the complete client-side foundation so Member 2 can work independently without waiting for the entire backend.

Member 1 only needs to provide the initial shared contracts needed for integration.

## 2.1 Project setup

- [x] ~~Verify React + Vite project~~
- [x] ~~Verify TypeScript configuration~~
- [x] ~~Install React Three Fiber~~
- [x] ~~Install Three.js~~
- [x] ~~Install `@react-three/drei`~~
- [x] ~~Install client-side Rapier package~~
- [x] ~~Install Zustand~~
- [ ] Install Tailwind CSS if required by the project setup
- [x] ~~Establish client source folders~~

Expected structure:

```text
client/
└── src/
    ├── app/
    ├── ui/
    ├── game/
    │   ├── scene/
    │   ├── camera/
    │   ├── players/
    │   ├── enemies/
    │   ├── bosses/
    │   ├── weapons/
    │   ├── effects/
    │   ├── physics/
    │   └── audio/
    ├── network/
    └── state/
```

## 2.2 3D renderer foundation

- [x] ~~Create R3F `<Canvas>`~~
- [x] ~~Add scene~~
- [x] ~~Add basic lighting~~
- [x] ~~Add test floor~~
- [x] ~~Add placeholder player~~
- [x] ~~Verify camera rendering~~
- [x] ~~Verify responsive canvas~~
- [ ] Verify development FPS is stable

## 2.3 Placeholder player

- [x] ~~Create placeholder player mesh~~
- [x] ~~Add player transform~~
- [x] ~~Add player rotation~~
- [x] ~~Add player color system~~
- [x] ~~Support four player colors:~~
  - [x] ~~Red~~
  - [x] ~~Blue~~
  - [x] ~~Green~~
  - [x] ~~Yellow~~

## 2.4 Client physics

- [x] ~~Create `PhysicsWorld.tsx`~~
- [x] ~~Initialize Rapier world~~
- [x] ~~Create arena floor collider~~
- [x] ~~Create basic player collider~~
- [x] ~~Verify player remains grounded~~
- [x] ~~Verify collision with walls~~
- [x] ~~Keep collider dimensions aligned with the project specification~~

Player collider:

```text
Capsule
height: 1.8
radius: 0.3
```

## 2.5 Input foundation

- [x] ~~Implement WASD movement input~~
- [x] ~~Prepare controller for left-stick support~~
- [x] ~~Implement Shift / L2 run~~
- [x] ~~Implement Space / Cross dodge input~~
- [x] ~~Implement left-click / Square light attack input~~
- [x] ~~Implement right-click / Triangle heavy attack input~~
- [x] ~~Implement E / Circle interaction input~~
- [x] ~~Implement Q / L1 block input~~
- [x] ~~Implement F / R1 throw input~~
- [x] ~~Keep input generation separate from rendering~~

---

# 3. PHASE 0 HANDOFF GATE ✅ DONE

Member 2 does NOT need the whole server before continuing.

You may proceed independently when the following are available:

### Required from Member 1

- [x] ~~Basic `GameState` shape~~
- [x] ~~Player state fields~~
- [x] ~~Player position fields~~
- [x] ~~Player rotation field~~
- [x] ~~Player color field~~
- [x] ~~Player state field~~
- [x] ~~`PLAYER_MOVE` message contract~~

### After those contracts exist

Member 2 can continue:

```text
Client scene
   +
Player controller
   +
Camera
   +
Local movement
   +
Placeholder networking adapter
```

Do NOT wait for:

- [ ] Combat server
- [ ] Enemy AI
- [ ] Wave system
- [ ] Boss system
- [ ] Database
- [ ] Authentication

---

# 4. PHASE 1 — PLAYER CONTROLLER ✅ DONE

## Goal

Create the complete client-side player movement experience.

## 4.1 Player controller

- [ ] Create `PlayerController.tsx`
- [x] ~~Read input~~
- [x] ~~Calculate desired movement direction~~
- [x] ~~Normalize movement vector~~
- [x] ~~Apply walk speed~~
- [x] ~~Apply run speed~~
- [x] ~~Rotate player toward movement direction~~
- [x] ~~Handle stopped / moving state~~
- [x] ~~Handle basic gravity~~
- [x] ~~Handle floor contact~~
- [x] ~~Keep movement logic independent from player mesh~~

Base values:

```text
Move Speed: 5 units/s
Run Speed: 9 units/s
```

## 4.2 Movement prediction

The project predicts movement locally and lets the server correct disagreement.

Implement:

- [x] ~~Local movement prediction~~
- [x] ~~Send movement intent to server~~
- [x] ~~Receive authoritative position~~
- [x] ~~Compare predicted position vs server position~~
- [x] ~~Apply smooth correction~~
- [x] ~~Avoid obvious rubber-banding for small differences~~
- [x] ~~Handle large corrections safely~~
- [x] ~~Prevent prediction from changing server authority~~

Expected concept:

```text
W pressed
   ↓
LOCAL movement immediately
   ↓
PLAYER_MOVE sent
   ↓
server validates
   ↓
server position received
   ↓
client reconciles
```

## 4.3 Remote players

- [x] ~~Render remote players~~
- [x] ~~Apply authoritative positions~~
- [x] ~~Smooth remote movement~~
- [x] ~~Avoid visually snapping every state update~~
- [x] ~~Apply player-specific colors~~
- [ ] Show nameplate when supported
- [x] ~~Distinguish local player from remote players~~

---

# 5. PHASE 2 — CAMERA SYSTEM ✅ DONE

## Goal

Implement the documented cinematic group-follow camera.

Create:

```text
client/src/game/camera/GroupCamera.tsx
```

## Tasks

- [x] ~~Track all active players~~
- [x] ~~Calculate group center~~
- [x] ~~Calculate player spread~~
- [x] ~~Follow group center~~
- [x] ~~Zoom based on player separation~~
- [x] ~~Clamp zoom to configured limits~~
- [x] ~~Smooth camera movement~~
- [x] ~~Avoid excessive camera movement~~
- [x] ~~Keep all active players visible~~
- [x] ~~Handle dead / disconnected players correctly~~
- [x] ~~Prepare boss cinematic mode~~

Camera configuration:

```text
defaultHeight: 12
defaultDistance: 18
minZoom: 14
maxZoom: 28
zoomSpeed: 0.05
followSmoothness: 0.08
angle: -45°
```

## Boss camera

- [x] ~~Detect boss appearance~~
- [x] ~~Push camera toward boss for approximately one second~~
- [x] ~~Return to group-follow mode~~
- [x] ~~Smooth transition~~
- [x] ~~Avoid breaking multiplayer camera framing~~

---

# 6. PHASE 3 — CHARACTER MODEL + ANIMATION FOUNDATION ✅ DONE

## Goal

Replace placeholders with real character assets.

The specification uses Mixamo-standard skeletons for players and enemies.

## 6.1 Player asset

- [ ] Obtain player base GLB
- [ ] Verify Mixamo skeleton
- [ ] Verify scale
- [ ] Verify orientation
- [ ] Verify materials
- [ ] Verify animation compatibility
- [ ] Place model under:

```text
client/public/assets/players/
```

## 6.2 Player animations

Required animation set:

- [x] ~~idle~~
- [x] ~~walk~~
- [x] ~~run~~
- [ ] jump
- [ ] fall
- [ ] dodge
- [ ] block
- [ ] block_hit
- [ ] punch_light
- [ ] punch_heavy
- [ ] bat_swing
- [ ] axe_swing
- [ ] hammer_swing
- [ ] stick_swing
- [ ] rock_throw
- [ ] hit_light
- [ ] hit_heavy
- [x] ~~knockdown~~
- [x] ~~getup~~
- [ ] pickup
- [x] ~~death~~
- [ ] victory

## 6.3 Animation controller

- [x] ~~Create reusable animation controller~~
- [x] ~~Map server state → visual animation~~
- [x] ~~Blend idle ↔ walk~~
- [x] ~~Blend walk ↔ run~~
- [x] ~~Trigger dodge~~
- [x] ~~Trigger attacks~~
- [x] ~~Trigger hit reactions~~
- [x] ~~Trigger knockdown~~
- [x] ~~Trigger death~~
- [x] ~~Trigger victory~~
- [x] ~~Avoid restarting an animation every frame~~
- [x] ~~Support animation playback speed where needed~~

---

# 7. PHASE 4 — COMBAT PRESENTATION ✅ DONE

## Goal

Make combat visually responsive while server logic remains authoritative.

The documented flow is:

```text
PLAYER ATTACK
     ↓
client plays swing animation
     ↓
attack request sent
     ↓
server validates
     ↓
server determines hit
     ↓
all clients receive result
     ↓
client displays feedback
```

## Tasks

- [x] ~~Connect attack input to animations~~
- [x] ~~Play light attack animation~~
- [x] ~~Play heavy attack animation~~
- [x] ~~Play weapon swing animation~~
- [x] ~~Never apply authoritative damage locally~~
- [x] ~~Receive confirmed hit result~~
- [x] ~~Spawn hit effect~~
- [x] ~~Show reaction animation~~
- [x] ~~Show knockback presentation~~
- [x] ~~Trigger screen shake~~
- [x] ~~Play impact sound~~
- [x] ~~Handle miss without creating false damage feedback~~

## Hit effects

- [x] ~~Fist → small white spark~~
- [x] ~~Stick → wood crack particles~~
- [x] ~~Bat → stars + impact flash~~
- [x] ~~Axe → dark/blood particles~~
- [x] ~~Hammer → shockwave ring~~
- [x] ~~Rock → dust cloud~~

Do not move damage authority into the client.

---

# 8. PHASE 5 — WEAPON VISUAL SYSTEM ✅ DONE

## Goal

Create reusable weapon visuals that work with server-defined weapon state.

Weapons:

- [x] ~~Fist~~
- [x] ~~Stick~~
- [x] ~~Baseball Bat~~
- [x] ~~Axe~~
- [x] ~~Hammer~~
- [x] ~~Rock~~

## Tasks

- [x] ~~Create `WeaponMesh.tsx`~~
- [x] ~~Create `WeaponPickup.tsx`~~
- [x] ~~Load correct model from weapon type~~
- [x] ~~Attach held weapon to player~~
- [x] ~~Detach when dropped~~
- [x] ~~Render pickup on arena~~
- [x] ~~Hide pickup after server confirms collection~~
- [x] ~~Render dropped weapon~~
- [x] ~~Render thrown rock~~
- [x] ~~Ensure visual weapon matches server weapon type~~

## Weapon-specific visual feedback

- [x] ~~Fist impact~~
- [ ] Stick impact
- [x] ~~Bat impact~~
- [x] ~~Axe impact~~
- [x] ~~Hammer impact~~
- [x] ~~Rock impact~~

## Weapon trails

- [x] ~~Create `WeaponTrail.tsx`~~
- [x] ~~Trigger only during relevant swing~~
- [x] ~~Keep trails lightweight~~
- [x] ~~Support different weapon sizes~~
- [x] ~~Avoid generating excessive objects every frame~~

---

# 9. PHASE 6 — ENEMY PRESENTATION ✅ DONE

## Goal

Render server-controlled enemies convincingly.

Enemy types:

- [x] ~~Basic~~
- [x] ~~Fast~~
- [x] ~~Heavy~~
- [x] ~~Shield~~
- [x] ~~Ranged~~
- [x] ~~Elite~~

## Tasks

- [x] ~~Create reusable `Enemy.tsx`~~
- [x] ~~Create specialized enemy components when needed~~
- [x] ~~Render enemy position from server state~~
- [x] ~~Smooth remote enemy movement~~
- [x] ~~Render correct enemy model~~
- [x] ~~Render health state~~
- [x] ~~Map enemy states to animations~~
- [x] ~~Render attack animation~~
- [x] ~~Render stagger~~
- [x] ~~Render knockdown~~
- [x] ~~Render death~~
- [x] ~~Remove dead enemy visuals safely~~
- [x] ~~Avoid unnecessary React re-renders~~

Enemy animations:

- [x] ~~idle~~
- [x] ~~walk~~
- [x] ~~run~~
- [x] ~~attack~~
- [x] ~~stagger~~
- [x] ~~knockdown~~
- [x] ~~getup~~
- [x] ~~death~~

---

# 10. PHASE 7 — PHYSICS PRESENTATION ✅ DONE

## Goal

Keep client-side physical presentation consistent with the documented Rapier setup.

Collider definitions:

```text
Player → Capsule
Enemy  → Capsule
Boss   → Capsule
Arena  → Static box/trimesh
Weapon → Sensor
Rock   → Sphere
```

Tasks:

- [x] ~~Player collider~~
- [ ] Enemy collider
- [x] ~~Boss collider~~
- [x] ~~Arena collision~~
- [ ] Weapon sensors
- [x] ~~Rock projectile visual physics~~
- [x] ~~Ground detection~~
- [x] ~~Knockback visual response~~
- [x] ~~Fall / knockdown presentation~~
- [ ] Wall collision feedback
- [ ] Avoid client physics becoming authoritative over server state

---

# 11. PHASE 8 — WAVE + ENVIRONMENT PRESENTATION ✅ DONE

## Goal

Create the complete visual presentation for a wave-based match.

## Wave UI/game-world presentation

Member 3 owns the formal HUD, but Member 2 owns world-side visual effects.

- [x] ~~Enemy spawn visual~~
- [ ] Spawn timing presentation
- [x] ~~Wave start effect~~
- [x] ~~Wave completion effect~~
- [ ] Rest-period presentation
- [ ] Weapon respawn visual

## Storm Rooftop

Create:

```text
client/src/game/scene/Arena.tsx
```

Tasks:

- [x] ~~Build Storm Rooftop arena~~
- [x] ~~Add platform~~
- [x] ~~Add railings~~
- [x] ~~Add background industrial buildings~~
- [x] ~~Add night sky~~
- [x] ~~Add wet surfaces~~
- [x] ~~Add dark cinematic lighting~~
- [x] ~~Add neon accents~~
- [x] ~~Add rain particles~~
- [x] ~~Add lightning flashes~~
- [x] ~~Add arena boundaries~~
- [x] ~~Verify collision boundaries~~
- [ ] Keep visual quality balanced with FPS

---

# 12. PHASE 9 — AUDIO SYSTEM ✅ DONE

Create:

```text
client/src/game/audio/AudioManager.ts
```

**Status:** All sounds below are currently implemented as procedural WebAudio synthesis (no `.mp3` assets). The `SoundKey` union is the swap hook; drop in the real asset and update `playSound` when assets are ready.

## Combat audio

- [x] ~~punch_light.mp3~~
- [x] ~~punch_heavy.mp3~~
- [x] ~~punch_miss.mp3~~
- [x] ~~bat_swing.mp3~~
- [x] ~~bat_impact.mp3~~
- [x] ~~axe_swing.mp3~~
- [x] ~~axe_impact.mp3~~
- [x] ~~hammer_swing.mp3~~
- [x] ~~hammer_impact.mp3~~
- [x] ~~stick_swing.mp3~~
- [x] ~~stick_impact.mp3~~
- [x] ~~rock_throw.mp3~~
- [x] ~~rock_impact.mp3~~
- [x] ~~block.mp3~~

## Enemy audio

- [x] ~~enemy_grunt.mp3~~
- [x] ~~enemy_stagger.mp3~~
- [x] ~~enemy_knockdown.mp3~~
- [x] ~~enemy_death.mp3~~
- [x] ~~elite_roar.mp3~~

## Event audio

- [x] ~~weapon_pickup.mp3~~
- [x] ~~weapon_drop.mp3~~
- [x] ~~wave_start.mp3~~
- [x] ~~wave_complete.mp3~~
- [x] ~~boss_entrance.mp3~~
- [x] ~~boss_phase_change.mp3~~
- [x] ~~boss_enraged.mp3~~
- [x] ~~boss_death.mp3~~
- [x] ~~player_death.mp3~~
- [x] ~~player_respawn.mp3~~
- [x] ~~victory.mp3~~

## Environment audio

- [x] ~~rain_ambient.mp3~~
- [x] ~~thunder_01.mp3~~
- [x] ~~thunder_02.mp3~~
- [x] ~~lightning_crack.mp3~~
- [x] ~~arena_hum.mp3~~

## Adaptive music

- [x] ~~Base combat music~~
- [x] ~~Increase intensity as enemies become fewer~~
- [x] ~~Elite intensity~~
- [x] ~~Boss phase 1~~
- [x] ~~Boss phase 2 layer~~
- [x] ~~Boss phase 3 layer~~
- [x] ~~Enraged layer~~
- [x] ~~Silence after boss death~~
- [x] ~~Victory theme~~

---

# 13. PHASE 10 — BOSS ASSET PIPELINE 🔄 IN PROGRESS (GLB placed + loads in client; Mixamo/Blender/Compress blocked on tools)

## Goal

Integrate the custom villain GLB.

The specification says:

```text
Custom GLB
   ↓
Inspect
   ↓
Mixamo
   ↓
Animations
   ↓
Blender
   ↓
Merge
   ↓
Export GLB
   ↓
Compress
   ↓
React Three Fiber
```

## 13.1 Inspect villain

- [x] ~~Inspect GLB using gltf.report~~
- [x] ~~Check file size~~
- [x] ~~Check skeleton~~
- [x] ~~Check textures~~
- [x] ~~Check materials~~
- [x] ~~Check scale~~
- [x] ~~Determine whether re-rigging is required~~

**Findings (boss.glb):** THREE.GLTFExporter, 2.2 MB (PNG texture ~1.5 MB), 7.4k tris / 19,648 verts, 1 material (red, metallic 0.7 / rough 0.6 + texture), **no skeleton, no animations** → re-rigging in Mixamo required. Model is ~1.0 m tall (set to 2.1× in scene; feet at y=0 via +0.5 offset). Compressed copy pending `gltf-transform` (registry offline).

## 13.2 Mixamo

- [ ] Upload villain
- [ ] Verify skeleton
- [ ] Get boss animations

Required boss animations:

- [ ] idle
- [ ] walk
- [ ] attack_heavy_punch
- [ ] attack_sweep
- [ ] roar
- [ ] phase2_transition
- [ ] attack_charge
- [ ] attack_slam
- [ ] phase3_transition
- [ ] attack_spin
- [ ] attack_grab_throw
- [ ] enrage
- [ ] death

## 13.3 Blender

- [ ] Import GLB
- [ ] Import animations
- [ ] Merge animations
- [ ] Name animation tracks exactly
- [ ] Verify animation transitions
- [ ] Export GLB
- [ ] Confirm animations are included

## 13.4 Compression

- [ ] Compress final GLB
- [ ] Inspect optimized output
- [ ] Verify animations still work
- [ ] Verify materials
- [ ] Verify textures
- [ ] Verify loading performance

---

# 14. PHASE 11 — BOSS CLIENT IMPLEMENTATION ✅ DONE (real GLB loaded + procedural motion)

Create:

```text
client/src/game/bosses/VillainBoss.tsx
```

**Status:** The real villain GLB (`client/public/assets/bosses/boss.glb`) loads via `BossModel.tsx` (phase/enrage tint, procedural sway/lunge). Rigged animations fire through `AnimationController` when the Phase 10 animated build lands.

## Tasks

- [x] ~~Load villain model~~
- [ ] Load boss animations
- [ ] Create animation actions
- [x] ~~Render boss position~~
- [x] ~~Render boss rotation~~
- [x] ~~Read boss health~~
- [x] ~~Read boss phase~~
- [x] ~~Read enraged state~~
- [x] ~~Play phase transition animation~~
- [x] ~~Play attack animations~~
- [x] ~~Play enrage animation~~
- [x] ~~Play death animation~~

## Boss phase presentation

```text
100–75% → Phase 1
75–50%  → Phase 2
50–20%  → Phase 3
<20%    → Enraged
0       → Death
```

## Enraged

- [x] ~~Set animation mixer speed to 1.6x when instructed by server state~~
- [x] ~~Restore normal speed when no longer enraged if applicable~~
- [x] ~~Add additional visual intensity~~
- [x] ~~Add stronger effects~~
- [ ] Coordinate with environment effects

## Boss environment reaction

- [ ] Phase 1 → normal storm
- [ ] Phase 2 → lights flicker/break
- [ ] Phase 3 → stronger rain/lightning
- [ ] Enraged → edge lightning hazards
- [ ] Death → storm clears + dramatic silence

Server remains the authority for phase changes.

---

# 15. PHASE 12 — NETWORK CLIENT INTEGRATION ✅ DONE

Member 1 owns the server protocol.

Member 2 owns the client-side consumption of that protocol for rendering.

Create / maintain:

```text
client/src/network/
├── ColyseusClient.ts
└── MessageHandlers.ts
```

## Tasks

- [x] ~~Connect to Colyseus~~
- [x] ~~Join room~~
- [x] ~~Receive state~~
- [x] ~~Subscribe to player changes~~
- [x] ~~Subscribe to enemy changes~~
- [x] ~~Subscribe to weapon changes~~
- [x] ~~Subscribe to boss changes~~
- [x] ~~Handle wave events~~
- [x] ~~Handle player death~~
- [ ] Handle player respawn
- [x] ~~Handle victory~~
- [x] ~~Handle disconnect~~
- [ ] Handle reconnect
- [x] ~~Keep network code separated from rendering components~~

## Client/server separation

Client sends:

```text
PLAYER_MOVE
PLAYER_ATTACK
PLAYER_DODGE
PLAYER_BLOCK
PLAYER_PICKUP
PLAYER_THROW
```

Client never sends:

```text
"my position is X"
"my health is 100"
"enemy is dead"
"boss health is 0"
"damage = 9999"
```

Those remain server-authoritative.

---

# 16. PHASE 13 — EFFECTS SYSTEM ✅ DONE

## Goal

Make the game feel impactful.

Create:

```text
effects/
├── HitEffect.tsx
├── KnockbackEffect.tsx
└── WeaponTrail.tsx
```

## Tasks

- [x] ~~Hit sparks~~
- [x] ~~Impact flash~~
- [x] ~~Dust~~
- [x] ~~Shockwave~~
- [x] ~~Weapon trail~~
- [x] ~~Knockback effect~~
- [x] ~~Death effect~~
- [x] ~~Damage feedback~~
- [x] ~~Screen shake~~
- [x] ~~Lightning flash~~
- [ ] Rain impact
- [x] ~~Boss phase effect~~
- [x] ~~Boss death effect~~

## Performance rules

- [x] ~~Reuse effects where possible~~
- [x] ~~Avoid unbounded particle creation~~
- [x] ~~Clean up temporary objects~~
- [ ] Avoid per-frame allocations
- [ ] Profile GPU usage
- [ ] Profile draw calls
- [ ] Check memory after long matches

---

# 17. PHASE 14 — PERFORMANCE PASS ⏳ PENDING

## Goal

Maintain smooth browser gameplay.

Tasks:

- [ ] Test player count 1
- [ ] Test player count 2
- [ ] Test player count 3
- [ ] Test player count 4
- [ ] Test large enemy counts
- [ ] Test boss
- [ ] Test rain + lightning
- [ ] Test particles + audio together
- [ ] Test lower-end hardware if available

## Optimize

- [ ] GLB sizes
- [ ] Texture sizes
- [ ] Draw calls
- [ ] Particle count
- [ ] Shadow usage
- [ ] React re-renders
- [ ] Zustand subscriptions
- [ ] Network update handling
- [ ] Object allocation
- [ ] Animation update cost

---

# 18. PHASE 15 — INTEGRATION WITH MEMBER 3 ⏳ PARTIAL (core wired, HUD pending Member 3)

Member 3 owns UI/HUD.

Member 2 provides the game-world values and render events they need.

Integration tasks:

- [x] ~~Connect Lobby → game scene~~
- [x] ~~Connect HUD player health to game state~~
- [ ] Connect wave count to world
- [ ] Connect enemy count to world
- [x] ~~Connect boss state to boss presentation~~
- [ ] Connect victory event to results screen
- [x] ~~Connect player death to visual state~~
- [ ] Connect weapon state to HUD
- [x] ~~Connect audio settings to UI settings~~

Do not duplicate state in multiple places unnecessarily.

---

# 19. PHASE 16 — MULTIPLAYER PLAYTEST ⏳ PENDING

## Test with real clients

Minimum:

- [ ] 1 client
- [ ] 2 clients
- [ ] 3 clients
- [ ] 4 clients

## Test

- [ ] All players visible
- [ ] Player colors correct
- [ ] Players move smoothly
- [ ] Camera frames all players
- [ ] Remote player movement is smooth
- [ ] Attack animations synchronize
- [ ] Enemies appear consistently
- [ ] Enemy reactions synchronize
- [ ] Weapon pickups synchronize
- [ ] Boss state synchronizes
- [ ] Wave transitions synchronize
- [ ] Victory synchronizes

---

# 20. PHASE 17 — LATENCY / RECONCILIATION TESTING ⏳ PENDING

The game uses movement prediction and server confirmation.

Test:

- [ ] Low latency
- [ ] Medium latency
- [ ] High latency
- [ ] Packet delay
- [ ] Temporary connection interruption
- [ ] Reconnection

Verify:

- [ ] Local movement remains responsive
- [ ] Server corrections are smooth
- [ ] No uncontrolled teleporting
- [ ] Remote players remain readable
- [ ] Combat effects use confirmed server results
- [ ] No client-generated false damage

---

# 21. PHASE 18 — VERTICAL SLICE INTEGRATION ⏳ PENDING

The vertical slice is complete when the following visual/client experience is playable:

- [ ] 2–4 players connect
- [ ] Lobby works with Member 3
- [ ] Storm Rooftop loads
- [ ] Player colors work
- [ ] Player movement works
- [ ] Client prediction works
- [ ] Fist light attack animation works
- [ ] Fist heavy attack animation works
- [ ] 5 weapon visuals work
- [ ] 3 enemy visual types work
- [ ] Elite enemy visual works
- [ ] Five-wave flow displays correctly
- [ ] Boss model loads
- [ ] Boss animations work
- [ ] Boss phase visuals work
- [ ] Enraged visuals work
- [ ] Boss death visual works
- [ ] Screen shake works
- [ ] Hit effects work
- [ ] Audio works
- [ ] Victory presentation works

The project specification defines the vertical slice around 2–4 players, one arena, fist combat, five weapons, enemy types, five waves, boss, victory/XP, networking, lag compensation, and effects.

---

# 22. PHASE 19 — PRODUCTION CLIENT CHECKLIST ⏳ PENDING

Before launch:

- [ ] Remove development debug visuals
- [ ] Remove unused assets
- [ ] Verify all GLBs load
- [ ] Verify all audio loads
- [ ] Verify all animation names
- [ ] Verify mobile/responsive UI integration
- [ ] Verify browser compatibility
- [ ] Verify asset loading failures are handled
- [ ] Verify disconnect visuals
- [ ] Verify reconnect visuals
- [ ] Verify loading states
- [ ] Verify no console errors
- [ ] Verify no memory leaks
- [ ] Verify acceptable FPS
- [ ] Verify compressed assets
- [ ] Verify production asset paths

---

# 23. GIT OWNERSHIP

Recommended branches:

```text
main
develop

feature/member2-player
feature/member2-camera
feature/member2-combat-vfx
feature/member2-enemies
feature/member2-boss
feature/member2-assets
feature/member2-audio
```

Rules:

- [ ] Do not push directly to `main`
- [ ] Use feature branches
- [ ] Keep commits focused
- [ ] Open pull requests
- [ ] Rebase/merge from current `develop` before integration when appropriate
- [ ] Test before requesting review
- [ ] Do not modify Member 1's server logic without discussion
- [ ] Do not modify shared contracts casually
- [ ] Tell Member 1 before changing assumptions about server state

---

# 24. SHARED FILE RULES

Potentially shared files:

```text
shared/schemas/GameState.ts
shared/types/index.ts
shared/messages/index.ts
shared/constants/*
```

Rules:

- [x] ~~Read contracts before implementing against them~~
- [x] ~~Do not invent message names~~
- [x] ~~Do not invent state fields~~
- [x] ~~Do not change authoritative semantics in the client~~
- [ ] Ask for contract changes through the Tech Lead
- [ ] Update client code when a contract officially changes
- [x] ~~Keep visual logic separate from authoritative gameplay logic~~

---

# 25. DEFINITION OF DONE — MEMBER 2

A Member 2 task is DONE only when:

- [x] ~~Code is implemented~~
- [x] ~~TypeScript passes~~
- [ ] No runtime console errors
- [ ] Feature works with placeholder/server state
- [x] ~~Feature works with multiplayer state when applicable~~
- [ ] Assets are correctly placed
- [ ] Temporary resources are cleaned up
- [ ] Performance is acceptable
- [ ] Feature branch is pushed
- [ ] Pull request created
- [ ] Integration tested
- [ ] Tech Lead integration issues resolved

---

# 26. WHAT MEMBER 2 CAN DO WITHOUT WAITING

Member 2 can work independently on:

```text
✅ R3F scene
✅ Three.js lighting
✅ Arena placeholders
✅ Player model
✅ Player animation controller
✅ Camera
✅ Client physics
✅ Local movement
✅ Effects
✅ Weapon visuals
✅ Enemy models
✅ Boss asset preparation
✅ Audio manager
✅ Rain
✅ Lightning
✅ Screen shake
✅ Asset optimization
✅ Performance testing
```

Member 2 should wait for a shared contract only when the feature specifically needs server data.

---

# 27. DO NOT WAIT FOR THE WHOLE SERVER

Bad workflow:

```text
Member 1:
"Backend must be 100% complete."

Member 2:
"Okay, I'll wait."
```

Correct workflow:

```text
Member 1:
"PLAYER state + PLAYER_MOVE contract ready."

        ↓

Member 2:
Build Player + Controller + Camera

        ↓

Member 1:
Continue combat/networking

        ↓

Member 2:
Build animations + effects

        ↓

Member 3:
Build HUD + lobby

        ↓

Integration
```

This is the intended parallel-development model.

---

# 28. FINAL MEMBER 2 ROADMAP

```text
PHASE 0
Client foundation
    ↓
PHASE 1
Player controller
    ↓
PHASE 2
Group camera
    ↓
PHASE 3
Character + animation system
    ↓
PHASE 4
Combat presentation
    ↓
PHASE 5
Weapon visuals
    ↓
PHASE 6
Enemy presentation
    ↓
PHASE 7
Physics presentation
    ↓
PHASE 8
Wave + Storm Rooftop presentation
    ↓
PHASE 9
Audio
    ↓
PHASE 10
Boss asset pipeline
    ↓
PHASE 11
Boss implementation
    ↓
PHASE 12
Network client integration
    ↓
PHASE 13
Effects
    ↓
PHASE 14
Performance
    ↓
PHASE 15
UI integration
    ↓
PHASE 16
Multiplayer playtest
    ↓
PHASE 17
Latency testing
    ↓
PHASE 18
Vertical slice
    ↓
PHASE 19
Production client
```

# MEMBER 2 SUCCESS CONDITION

Member 2 is successful when:

```text
SERVER STATE
     ↓
CLIENT NETWORK
     ↓
3D WORLD
     ↓
CHARACTER
     ↓
ANIMATION
     ↓
COMBAT FEEDBACK
     ↓
CAMERA
     ↓
VFX
     ↓
AUDIO
     ↓
POLISHED MULTIPLAYER EXPERIENCE
```

The client should **never become the authority**. Its job is to make the authoritative game state feel immediate, readable, cinematic, and responsive.
