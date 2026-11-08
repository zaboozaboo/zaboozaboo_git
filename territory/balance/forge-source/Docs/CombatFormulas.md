# Combat formulas

Reference: [Forge Master APK 2.9.0 combat restoration](research/forge-master/README.md#combat)
and its runnable [arithmetic checks](research/forge-master/tools/combat_reference.py).
Canonical handoff CSVs remain unchanged. 현행 1.5배 절대 수치·0/5 정수화·용병 대응 적 보정은 [밸런스 계약](BalanceContract.md#전투-수치-조정)을 따른다. Domain combat owns results; presentation
only consumes snapshots and actual HP-loss events.

The [APK 2.10.0 comparison](research/forge-master/README.md#apk-2100-comparison)
records newer source-game difficulty tables, progress relocation, clan stat layers,
and secondary-stat display rounding. Only the campaign difficulty table is adopted here,
as specified in [BalanceContract](BalanceContract.md#campaign-difficulties); the other findings remain research references.

| Path | Runtime formula |
|---|---|
| Main enemies | Source age health/damage times the HP/damage factor selected by DifficultyIndex from MainBattleDifficulty (APK 2.10.0); ranged multiplier affects damage only. The handoff Raw values use the existing 0.02 conversion, producing source HP 70/damage 10 for age zero; 실행값은 공통 1.5배·정수화와 진행도별 용병 보정을 추가 적용한다. |
| Dungeon enemies | 던전 원본 Health/Damage에 공통 1.5배·정수화와 입장 시 최고 진행도의 용병 보정을 적용한다. 일반전 0.02 환산·난이도 배율은 적용하지 않는다. |
| Stat layers | None first, then contribution encounter order. `(incoming + additive) * (defaultMultiplier + multiplier) * (1 - reduction) / (defaultDivisor + divisor)`. Later layers use defaults of one. None reads 040_Stats; missing defaults are one. Zero divisor is rejected. |
| Hit draws | Dodge `<=`, then independent block `<=`, reflect `<=`, critical `<`. Dodge exits immediately. Critical damage multiplies the source damage by its critical multiplier. |
| Block and reflect | Block skips target HP loss and life steal. Reflection still subtracts the full computed damage from the source, without recursive hit rolls. |
| Life steal | Normal attacks heal computed damage times life steal, capped at source maximum HP. Overkill uses computed damage; displayed damage remains actual HP lost. |
| Double attack | One normal attack, then an inclusive double-chance draw. A success schedules the next attack after one quarter of its normal interval. That follow-up cannot chain another double attack. |
| Attack speed | Weapon duration and windup divided by the current attack-speed multiplier. |
| Regeneration | Every simulation step: unmultiplied health plus active health buffs, times regen, times dt / SecondsToFullyRegenerate; capped at current maximum HP. |
| Skill damage | 기본·장비 기준 능력치 × 등급별 발동 계수 × 원본 레벨 성장비 × 액티브 연구·승급·옵션. 실제 반복 타격 수에 총량을 나눈 뒤 정리한다. 최종 플레이어 공격력·다른 성장 보너스를 다시 곱하지 않는다. 일반 공격의 치명타·이중 공격·흡혈은 상속하지 않고 대상 방어 판정은 적용한다. [비장비 성장 계약](BalanceContract.md#비장비-성장-기여)을 따른다. |
| Buffs | Add active damage/health. Activation adds health to current HP; removal clamps to the reduced maximum. Active duration precedes cooldown; excess dt is not carried into cooldown. |

## Skill pulse constants

아래 `S_D`는 원본 차트의 절대 공격력이 아니라 `SpellProfile.Resolved`에 전달된 패킷 수치다. 실제 타격당 공격력은 이 수치를 아래 divisor로 나눈 값이며, `ForSkill`은 먼저 전체 발동 공격량을 실제 타격 수에 배분한 뒤 이 패킷 형식으로 변환한다.

| Skill | Damage per hit | Timing |
|---|---|---|
| Arrows, CannonBarrage | S_D / 3 | Three effects |
| Shuriken, Meteorite, Lightning | S_D / 5 | Five effects |
| Shout | S_D / 8 | Interval 1.5/8, duration 1.5 |
| RainOfArrows | S_D / 15 | Interval 0.2, initial pulse timer -1, duration 4 |
| Bomb | S_D | Final pulse after duration 1 |
| Worm | S_D | Final pulse after duration 0.1 |
| Thorns | S_D | Interval 0.5, initial pulse timer -0.5, duration 1, final pulse |
| Stampede | S_D | Interval 0.25, duration 8 |
| StrafeRun | S_D | Interval 0.25, duration 1 |
| Drone | S_D | Attack interval 10/60 during chart ActiveDuration |

Area timing uses strict `>` comparisons. A frame executes at most one regular
pulse, resets the pulse timer to zero, and may also execute an expiration pulse.

## Validation and limits

NativeCombatTests exercise reference hit boundaries, block plus reflection,
layer order and defaults, skill damage isolation, regeneration, divisors and
pulse boundaries. CombatContractTests verify scheduled double attacks and
actual battle HP/attack changes. The source Python checks remain runnable.

## Normal-attack projectiles

`006_Weapons.ProjectileId` selects the immutable `041_Projectiles` profile for player,
main-stage enemy and dungeon enemy attacks. All 16 source IDs are supported.
`041` is required at load time; duplicate IDs, invalid speed/radius/gravity flags and
dangling weapon references fail validation. ID `-1` is an explicit unmapped source
value: ranged attacks with that ID retain the local speed-15, zero-radius, straight
projectile. They are not assigned a guessed source projectile or changed to instant hits.

Normal projectiles launch from the attacker's 0.35-unit footprint edge and stop at
the target footprint expanded by `CollisionRadius`. Flight time is
`max(0.05, (centerDistance - 0.7 - CollisionRadius) / Speed)` seconds.
The fixed-step simulation applies damage once on completion, never on launch;
dead targets cancel their pending shots. The flight profile is captured when the
attack is scheduled and retained through weapon changes and source death after
launch. Flight time is fixed at launch while the endpoint tracks the living target's
current ground position; this is a local homing contract, not an interception simulation.

`AffectedByGravity` adds a visual arc of `0.5 * 9.81 * duration² * p * (1-p)` at
normalized progress `p`. The visual gravity constant is local, not recovered source
data. Straight projectiles have no added height. Gravity does not change hit timing,
damage, targeting or obstruction. Rendering uses simulation coordinates and the
shared board projection, including after source removal or viewport resizing.
No Rigidbody, Collider, area damage or additional target collision is introduced.
Skill effects retain their separate timing and targeting contracts.

The simulation still uses doubles and fixed 50 ms steps, not the original F64/FD6
quantization or RandomPCG state. Nonempty stat qualifiers remain unsupported in
the shared modifier resolver. Area targeting still uses the local board's living
enemies, rather than original moving-area radii and collision geometry; Drone
uses periodic target hits rather than an independently positioned unit. Discrete
projectile cadence and grid movement remain local
presentation/simulation contracts. Attack-speed changes apply when the next
attack is scheduled; already scheduled strikes retain their delay. These limits
prevent a claim of bit-identical or frame-identical original combat replay.

## Skill presentation

All 18 source kinds have serialized sprites in `Battle2DView`. Domain `SkillCueFrame` snapshots expose active buffs, sustained pulses and delayed strikes, including elapsed effect time and the next hit delay. Presentation animates arrows/shuriken/cannon volleys, descending effects, ground eruptions, stampedes, aircraft, a hovering drone and buff emblems without deciding damage or timing. Cue renderers are pooled and released on expiration, unequip, ascension and battle reset. The artwork is a local interpretation; original spatial hitboxes and native visual assets are not claimed.
