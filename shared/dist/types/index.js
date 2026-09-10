"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEvent = exports.EnemyType = exports.AttackType = exports.WeaponType = exports.PlayerColor = exports.Difficulty = exports.ConnectionStatus = exports.RoomPhase = exports.BossAttack = exports.BossPhase = exports.EnemyState = exports.PlayerState = void 0;
var PlayerState;
(function (PlayerState) {
    PlayerState["IDLE"] = "idle";
    PlayerState["RUNNING"] = "running";
    PlayerState["ATTACKING"] = "attacking";
    PlayerState["DODGING"] = "dodging";
    PlayerState["BLOCKING"] = "blocking";
    PlayerState["STAGGERED"] = "staggered";
    PlayerState["DEAD"] = "dead";
})(PlayerState || (exports.PlayerState = PlayerState = {}));
var EnemyState;
(function (EnemyState) {
    EnemyState["IDLE"] = "idle";
    EnemyState["DETECT"] = "detect";
    EnemyState["CHASE"] = "chase";
    EnemyState["ATTACK"] = "attack";
    EnemyState["RECOVER"] = "recover";
    EnemyState["STAGGER"] = "stagger";
    EnemyState["KNOCKBACK"] = "knockback";
    EnemyState["DEAD"] = "dead";
})(EnemyState || (exports.EnemyState = EnemyState = {}));
var BossPhase;
(function (BossPhase) {
    BossPhase["PHASE_1"] = "phase_1";
    BossPhase["PHASE_2"] = "phase_2";
    BossPhase["PHASE_3"] = "phase_3";
    BossPhase["ENRAGED"] = "enraged";
})(BossPhase || (exports.BossPhase = BossPhase = {}));
var BossAttack;
(function (BossAttack) {
    BossAttack["HEAVY_PUNCH"] = "heavy_punch";
    BossAttack["SWEEP"] = "sweep";
    BossAttack["CHARGE"] = "charge";
    BossAttack["SLAM"] = "slam";
    BossAttack["ROAR"] = "roar";
    BossAttack["SPIN_ATTACK"] = "spin_attack";
    BossAttack["GRAB_THROW"] = "grab_throw";
})(BossAttack || (exports.BossAttack = BossAttack = {}));
var RoomPhase;
(function (RoomPhase) {
    RoomPhase["LOBBY"] = "lobby";
    RoomPhase["GAME"] = "game";
    RoomPhase["VICTORY"] = "victory";
    RoomPhase["GAME_OVER"] = "game_over";
})(RoomPhase || (exports.RoomPhase = RoomPhase = {}));
var ConnectionStatus;
(function (ConnectionStatus) {
    ConnectionStatus["DISCONNECTED"] = "disconnected";
    ConnectionStatus["CONNECTING"] = "connecting";
    ConnectionStatus["CONNECTED"] = "connected";
    ConnectionStatus["RECONNECTING"] = "reconnecting";
})(ConnectionStatus || (exports.ConnectionStatus = ConnectionStatus = {}));
var Difficulty;
(function (Difficulty) {
    Difficulty["EASY"] = "easy";
    Difficulty["NORMAL"] = "normal";
    Difficulty["HARD"] = "hard";
})(Difficulty || (exports.Difficulty = Difficulty = {}));
var PlayerColor;
(function (PlayerColor) {
    PlayerColor["RED"] = "red";
    PlayerColor["BLUE"] = "blue";
    PlayerColor["GREEN"] = "green";
    PlayerColor["YELLOW"] = "yellow";
})(PlayerColor || (exports.PlayerColor = PlayerColor = {}));
var WeaponType;
(function (WeaponType) {
    WeaponType["FIST"] = "fist";
    WeaponType["STICK"] = "stick";
    WeaponType["BASEBALL_BAT"] = "baseball_bat";
    WeaponType["AXE"] = "axe";
    WeaponType["HAMMER"] = "hammer";
    WeaponType["ROCK"] = "rock";
})(WeaponType || (exports.WeaponType = WeaponType = {}));
var AttackType;
(function (AttackType) {
    AttackType["LIGHT"] = "light";
    AttackType["HEAVY"] = "heavy";
})(AttackType || (exports.AttackType = AttackType = {}));
var EnemyType;
(function (EnemyType) {
    EnemyType["BASIC"] = "basic";
    EnemyType["FAST"] = "fast";
    EnemyType["HEAVY"] = "heavy";
    EnemyType["SHIELD"] = "shield";
    EnemyType["RANGED"] = "ranged";
    EnemyType["ELITE"] = "elite";
})(EnemyType || (exports.EnemyType = EnemyType = {}));
var GameEvent;
(function (GameEvent) {
    GameEvent["WAVE_START"] = "wave_start";
    GameEvent["WAVE_COMPLETE"] = "wave_complete";
    GameEvent["BOSS_SPAWN"] = "boss_spawn";
    GameEvent["BOSS_PHASE_CHANGE"] = "boss_phase_change";
    GameEvent["BOSS_DEFEATED"] = "boss_defeated";
    GameEvent["PLAYER_DIED"] = "player_died";
    GameEvent["PLAYER_KILLED"] = "player_killed";
    GameEvent["WEAPON_PICKUP"] = "weapon_pickup";
    GameEvent["WEAPON_DROP"] = "weapon_drop";
    GameEvent["MATCH_END"] = "match_end";
})(GameEvent || (exports.GameEvent = GameEvent = {}));
//# sourceMappingURL=index.js.map