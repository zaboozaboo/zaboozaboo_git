# Active Balance Contract

상점·패스·승급의 가격 기준, 무료 수급과 사용 단위, 일일 상품 배율은 [경제 계약](CommerceBalance.md)을 따른다.

`ResourceShopInfo`의 모든 열은 활성 게임 수치로 서버 게시 대상이다. 가격·광고 수량·한도·해금은 [일일 소환 재화 상점](CommerceBalance.md#일일-소환-재화-상점)을 따른다.

## 캐릭터 레벨·계급 차트

`PlayerLevelInfo`(920행)와 `MilitaryRankInfo`(32행)는 [계급 설계 원본](design/military-ranks/README.md)에서 `python3 Tools/build_military_rank_data.py`로 생성한다. `--check`가 원본과 실행 차트 일치를 검증하며 기준선 도구에도 연결한다. 레벨 EXP·고정 공격력/체력, 계급 상한·전투/구슬 조건·고정 능력치·재화 보상·시간 저장 상한·현재 생산 추가분은 모두 활성 게임 수치이므로 서버 밸런스와 경제 자료에 게시한다. `Level/Stage/ForgeRewardType`·`RewardAmount`는 과제별 보상 원천이며 빈 유형·0 수량은 보상 없는 조건이다. 계급의 재화별 총액은 과제 합계와 같아야 하며 별도로 중복 지급하지 않는다. 계급 표시명은 숫자 ID에 대응하는 Language 키로만 연결한다. 길드 연구 `026_Guild_Tech`를 포함한 게시 표는 51개다.

구슬 승급 조건은 첫 미션 Lv.2부터 계급마다 한 레벨씩 높여 최종 과제 Lv.33을 요구한다. 강화 대기 시간과 기존 완료·수령 상태의 처리는 [승급 조건](design/military-ranks/계급_승급_시스템_기획안.md#4-32개-계급과-승급-조건)을 따른다.

레벨 증가량은 `fixed-v4-half-level-2026-10-19`의 누적 정수 올림값이고 계급 보너스는 원안 유지다. 런타임 적용·저장·동기화는 [성장 계약](GrowthRuntime.md#캐릭터-레벨계급-승급)을 따른다. 기능 검증과 전체 v4 전투 난이도 재검증은 구분한다.

The [Forge Master 2.10.0 comparison](research/forge-master/README.md#apk-2100-comparison)
and [versioned extraction](research/forge-master/data/apk-2.10.0/manifest.json)
are research inputs. They do not supersede the adopted balance sources below;
source-game configuration equality does not establish native combat equivalence.

Canonical balance input is `Handoff/Data/Tables/` from Forge_Master_Developer_Handoff_FULL_2026-08-18, snapshot 2026_07_15_12_09. The two arena CSVs are replaced by APK 2.9.0 projections: 8 leagues, 64 rank bands and 354 reward entries. Their source is [ArenaLeagueLibrary](research/forge-master/data/apk-2.9.0/ArenaLeagueLibrary.json) and [ArenaRewardLibrary](research/forge-master/data/apk-2.9.0/ArenaRewardLibrary.json); the former six-league charts are not retained. 용병 `012_Pets`는 시대별 10종·10티어의 100종 실행 차트다. `RecruitRarity`가 5티어 훈련병과 각 20종의 용병을 연결한다. `014_Pet_Upgrades`는 10티어·100레벨이며, `015_Eggs`는 5티어다. 서버와 클라이언트가 소비하는 `MaterialExperience`는 원본 `PetUpgradeLibrary.LevelInfo[0].Experience`를 투영한 훈련생 합성 경험치이며, 일반 100·희귀 500·영웅 7,000·전설 150,000·궁극 750,000이다. `018_Summon_Rates`의 훈련병 신화 확률은 궁극으로 합친다. 기존 저장은 [명시적 이관표](art-source/character-sets/mercenary-retired-species.json)와 [성장 계약](GrowthRuntime.md#mercenaries-pet-compatible-progression)에 따라 보유 성장치와 진행 중 훈련 종료 시각을 보존한다. 원본 차트와 감사 workbook은 보존한다. 탈것 `016_Mounts`는 원본을 보존하고 현행 12종의 등급별 전용 외형으로 투영한다. 전역 `Species` ID와 기존 보유 데이터 정규화는 [탈것 성장 계약](GrowthRuntime.md#mounts)을 따른다. `Tools/import_handoff.py` verifies the current package manifest and reproduces runtime projections. The old implementation baseline is historical evidence in `SourceCharts/pre-handoff-baseline.json`, not a design authority.

Runtime clients download the active gameplay fields at login. Local gameplay fields are available only when `ServerManager.AllowClientSheet` is explicitly enabled; download failure otherwise blocks access. Language and presentation fields remain client-owned. Publication and version matching follow the [login sheet contract](CloudBackend.md#클라이언트-소유권과-게스트-복구).

## Sheet publication classification

The explicit table/column allowlist and global-key list in [build_balance_data.py](../Tools/build_balance_data.py) own the export boundary. The current bundle has 45 tables; adding a CSV or column does not automatically publish it. Economy and combat exports use the same projection. Source CSVs remain intact for authoring and historical/reference use.

| Published gameplay group | Tables |
|---|---|
| Shared configuration | `001_Global_Config` (24 consumed gameplay keys only), `GameplayConfig`, `040_Stats` |
| Equipment, forge and options | `003_Item_Base_Stats`, `004_Item_Drop_Chances`, `005_Item_Level_Brackets`, `006_Weapons`, `007_Secondary_Stats`, `008_Item_Stat_Unlocks`, `EquipmentCatalog`, `EquipmentTierInfo`, `EquipmentPartInfo`, `ForgeUpgradeInfo` |
| Pets, mounts and summoning | `012_Pets`, `013_Pet_Balance`, `014_Pet_Upgrades`, `015_Eggs`, `016_Mounts`, `017_Mount_Upgrades`, `018_Summon_Rates` |
| Skills | `019_Skills`, `020_Skill_Passive`, `021_Skill_Upgrades`, `SpellInfo`, `SkillSummonInfo`, `SkillAscensionInfo` |
| Research and unlock conditions | `022_Tech_Nodes`, `023_Tech_Values`, `024_Tech_Layout`, `025_Tech_Tier_Costs`, `026_Guild_Tech`, `FeatureUnlock` |
| Battles and dungeons | `028_Enemies`, `029_Enemy_Scaling`, `030_Dungeons`, `031_Dungeon_Rewards`, `041_Projectiles`, `EnemyPreset`, `StageData`, `StageWave`, `MainBattleDifficulty` |
| Offers and rewards | `036_Progress_Pass`, `039_Economy_Deals`, `ShopProductInfo`, `StoreProductInfo` |
| Arena leagues and rewards | `032_Arena_Leagues`, `033_Arena_Rewards` |

Mixed tables publish only gameplay fields. `EquipmentCatalog` publishes age, part, item identity and balance-template identity; shape, name key and icon ID/path stay client-side. `SpellInfo` keeps name/description keys local; `006_Weapons` keeps hand/visual-offset coordinates local. `ShopProductInfo` keeps store IDs and the display-only KRW price local. These four tables join local presentation fields by their stable identity, never by row position. Local gameplay values cannot fill missing server fields or replace downloaded values. Missing/duplicate presentation identities block initialization rather than silently borrowing another item's display.

Unused enemy helmet/armor appearance IDs, mount offsets, center-of-mass/radius metadata, tier color labels, deal display names/store IDs, unused global settings (including profile icon counts, notification and world-index data) and language/interface sheets are not published. `024_Tech_Layout` stays in balance because it defines prerequisite node IDs, tiers and requirements. Projectile speed, collision radius and gravity stay in balance because combat simulation consumes them. `008_Item_Stat_Unlocks.SourceFile` is retained as an existing rule discriminator, not a client asset path.

직접 실행 다운로드에서 제외하는 11개 파일은 `002_Forge_Upgrades`, `009_Sets`, `010_Skins`, `011_Skin_Upgrades`, `027_Main_Battles`, `034_Guild_Tiers`, `035_Guild_War_Days`, `037_Missions`, `038_Mission_Rewards`, `042_Ascension_Bonuses`, `043_Reference_Configs`입니다. 이 파일들은 원본·참고·후속 기능 자료이며, 제련/스테이지는 `ForgeUpgradeInfo`와 `StageData`/`StageWave`, 스킬 승천은 `SkillAscensionInfo`를 사용합니다. 제외는 파생 게임 규칙을 클라이언트 소유로 전환한다는 의미가 아닙니다.

`026_Guild_Tech`는 APK 2.10.0의 업그레이드 61종과 배치 7분류를 사용합니다. `Upgrade` 행의 `PointsPerLevel`은 정수 포인트, `ValuePerLevel`은 레벨당 효과이며 `Position` 행의 `Nodes`는 순서 있는 타입 목록입니다. 무한 레벨 nullable 필드는 보존하지만 아직 활성화하지 않습니다. 원본 재투영은 `Tools/import_handoff.py`의 `project_guild_research`가 소유하고 `Tools/verify_baseline.py`가 원본 대비 일치를 검사합니다. 현재 소비 노드와 기부 규칙은 [길드 연구 계약](GuildDevelopment.md#길드-연구-현행-계약)을 따릅니다.

Arena league and reward authority is the published `032`/`033` CSV projection. Both tables are required in the 44-table client catalog. The client reads promotion/demotion ranges and reward previews directly from this catalog; arena entry responses supply player standings and settled season rewards, without replacing the downloaded preview rules. Promotion uses `PromotionEnd` as a one-based inclusive rank; demotion displays `DemotionStart + 1`, and `-1` disables the corresponding range. The server reconstructs the existing nested arena API shape from these tables, and derives the arena rules version from the balance bundle version. The archived `ArenaLeagueLibrary.json` and `ArenaRewardLibrary.json` remain reference inputs for import/parity checks; runtime server code does not import them. The dashboard can export both current sheets. Uploaded revisions stay drafts until the dashboard Deploy action validates and atomically publishes them to the server. Runtime publication and failure behavior follow [administrator balance management](CloudBackend.md#밸런스-표-관리). `PvpBaseConfig.json` still supplies arena battle settings; this change does not move those settings into the league or reward sheets.


`OptionList` has been removed. Valid option IDs, their stable display/draw order and numeric ranges derive from `007_Secondary_Stats` through `HandoffBalance.OptionKeys`; no duplicate min/max/weight sheet is published or loaded.

보조 옵션의 현행 범위는 `Tools/import_handoff.py::project_secondary_stats`에서 원본 `007_Secondary_Stats`를 투영한다. 원본 파일과 옵션 ID·추첨 순서·저장된 roll은 보존한다. 적용값은 범위 내 선형 보간 후 0.1%p 단위 사사오입하며 클라이언트와 아레나 서버에 동일하게 적용한다. roll 증가에 따른 적용값은 감소하지 않으며 같은 반올림 구간에서는 같을 수 있다. 장비 레벨은 기본 공격력·체력을 성장시키고 옵션 퍼센트 자체에는 곱하지 않는다.

| 옵션 | 현행 범위 |
|---|---|
| 치명타 확률 | 4~12% |
| 치명타 추가 피해 | 10~60% |
| 막기 확률 | 1~5% |
| 5초당 체력 재생 | 1~2% |
| 흡혈 | 2~8% |
| 추가 공격 확률 | 3~12% |
| 공격력 | 1~15% |
| 체력 | 1~15% |
| 근접 피해 | 1~50% |
| 원거리 피해 | 1~15% |
| 공격 속도 | 3~25% |
| 스킬 효과 | 10~40% |
| 스킬 재사용 대기시간 감소 | 1~6% |

공격력·체력·근접·원거리 피해 범위는 원본을 사용한다. 원거리는 사거리 이점, 근접은 원본의 높은 피해 보정이라는 역할 차이를 유지한다. 동일 옵션은 합산하고 일반 공격력과 무기 유형 피해는 서로 곱한다. 8부위 최대 중첩 시 두 공격 옵션의 배율은 원거리 4.84배·근접 11배이며 체력 옵션은 2.2배다. 옵션 자체에 시대·장비 레벨 배율을 추가하지 않는다. 나머지 옵션의 완화된 회복·확률·공속·쿨다운 상한과 기존 스탯 레이어 계산 순서는 유지한다. 치명타·막기·추가 공격의 최종 확률은 100%로 제한한다. 재생은 배율 적용 전 체력을 기준으로 `SecondsToFullyRegenerate=5`에 따라 매 프레임 연속 적용한다. 표시값은 5초 동안의 회복률이며 5초마다 한 번 회복하는 방식은 아니다. 이 전역 값은 `project_combat_globals`가 원본에서 투영하며 클라이언트·아레나 서버가 공유한다. 흡혈은 실제 일반 공격 피해를 기준으로 적용한다. 재생·흡혈·공격 속도는 확률이 아니므로 100% 확률 상한을 적용하지 않는다. 스킬 효과는 기존 Damage·Health 대상 모두에 적용한다. 8부위 최대 중첩은 치명타·추가 공격 각각 96%, 막기 40%, 재생 초당 3.2%, 흡혈 64%, 공속 +200%, 쿨다운 감소 48%다. 확률 상한으로 최상위 추첨값이 낭비되거나 회복·쿨다운 한 가지 축이 성장 부족을 무제한 보완하지 않도록 한 기준이다. 연구 최대 75%는 유지한다. [이전 조합 비교 기록](archive/validation/2026-10-23-option-balance.md)은 당시 장비 성장·옵션 범위의 고정 편성 비교이며 현행 성장 곡선과 옵션 범위의 검증으로 재사용하지 않는다.


## Active source consumers

The game's ten age identities and presentation themes follow the [era identity contract](GrowthRuntime.md#era-identity). The mapping preserves the source age indices and numeric balance below.

| System | Source | Runtime contract |
|---|---|---|
| Battles | 027 Main Battles | Reuse the 210 age/battle definitions and all 718 ordered wave groups (including duplicates) for each of difficulty indices 0, 1 and 2. The runtime projection contains 630 stage IDs and 2,154 wave groups. First age has 10 battles; subsequent ages have 20. 모든 스테이지에서 원본 적 수를 유지한다. |
| 적 편성 | `StageEncounter`, `StageWave`, `006_Weapons` | 일반 스테이지의 지역·의상·근거리/원거리 비율·진형은 [진행도별 편성](art-source/character-sets/stage-encounters.md)을 따른다. `StageWave`는 원본 웨이브 순서·그룹·적 수를 유지하며, 실제 무기와 의상은 같은 편성 결과를 소비한다. 마지막 원본 AgeIndex 10은 양자 외형을 사용한다. 일반 난이도에서는 양자 시대의 체력·공격력도 유지하며, 하드·나이트메어는 원본 배율을 사용한다. |
| Enemy scaling | 029 Enemy Scaling, Runtime Logic C6:C7 | Era base multiplied by the APK 2.10.0 MainBattleDifficulty table: HP and damage factors are 1, 6,000,000 and 36,000,000,000,000 for indices 0, 1 and 2. Ranged damage multiplier 0.67. Apply the public BattleSimulator calibration 0.02 after source scaling. 원본 첫 적은 HP 70·공격력 10이며, 현행 1.5배 조정과 정수화 후 HP 1,050·공격력 150다. 일반 시대 진입의 단계별 보간은 아래 전투 수치 조정을 따른다. |
| Equipment | 003 Item Base Stats, 001 Global Config | Preserve source age/type/index and all additive Damage/Health contributions. Local display Level/Tier are one-based; source LevelIndex/Age are display minus one. 장비는 원본 1% 복리 성장과 아래 최소 정수 증가 규칙을 적용한다. 최종 플레이어 공격력·체력도 1 단위 정수다. |
| Weapon presentation | User direction | Source item ID is distinct from generated artwork Shape. Weapon, armor and helmet change character appearance; ring, necklace, gloves, shoes and belt remain thumbnail/stat-only. |
| Player | 001 Global Config | 원본 기본 공격력 10·체력 80 → 실행 기본 공격력 150·체력 1,200. The base melee multiplier 1.6 applies only to weapon damage, before player-wide modifiers. Critical bonus is base plus option contributions. 전투력은 조정된 기본 수치를 빼고 `((공격력-기본 공격력)*8+최대 체력-기본 체력)*3`을 같은 정수화 규칙으로 정리한다. |
| Options | 007 Secondary Stats, 008 Item Stat Unlocks | 현행 투영 범위와 원본 unlock counts·condition/target/layer metadata를 사용한다. Persist independent rolls. Separate player/active-skill and melee/ranged contributions. |
| Forge age | 004 Item Drop Chances | Use the original floating probabilities at forge display level minus one. No conversion to integer weights. Eight equipment slots; weapon identity selects role. |
| Forge upgrades | 002 Forge Upgrades, 001 Global Config | Display level 1 corresponds to source level zero. 34 upgrades, 35 displayed levels. Unlock after 8 forges. 업그레이드는 현행 `ForgeUpgradeInfo`의 금액과 시간을 인용하며, 아래 성장 흐름 정책을 적용한다; the first 3 upgrades allow skipping the remaining time without gems. Starting an upgrade does not raise the level; skipping or timer completion does. 현행 비용을 분할 수로 정수 나눈 뒤 할인을 적용하고, 각 납부액은 아래 경제 수치 정리 규칙으로 반올림한다. Paid gem skips round half up with minimum one while time remains; expired timers cost no gems. |
| Offline | IdleConfig / APK 2.9.0 claim action | 첫 서버 로그인 경제 조회부터 적립하며 최고 진행도 6부터 수령한다. 해금 전용 동기화 없이 해금 전 시간도 첫 수령에 포함한다. 수령 최소 60초, 자동 팝업 기준 600초, 기본 상한 14,400초다. 마법 구슬 레벨당 초당 골드 1(1레벨 1·35레벨 35), 분당 소환 카드 1에 기술·길드 연구와 계급 효과를 적용한다. 서버가 완성된 분을 차감하고 남은 초와 Q32 분수 잔여량을 보존한다. 기존 로컬 누적·잔여량은 서버로 이전하지 않는다. [서버 원장 계약](CloudBackend.md#시간-보상-서버-원장), [원본 수령 근거](research/forge-master/evidence/idle-claim-arm64.txt). |
| Initial resources | 001 Global Config, GameplayConfig | New saves read StartingGems (30) and StartingHammers (100) from the source config, and StartingGold (0) from the local gameplay sheet. Existing currency is preserved. Starting gold is a local policy because the source does not specify it. |
| Combat rewards | 001 Global Config | One coin per enemy killed, settled atomically even on defeat; no inherited stage-clear hammer grant. |
| Skills | SkillSummonInfo, 019 Skills, 020 Skill Passive, 021 Skill Upgrades | All 18 identities, exact level curves and passive stats, three equipped slots, summon progression and shard upgrades. Damage timing and explicit per-hit exceptions are documented in GrowthRuntime.md. |

Equipment generation uses the 282 active identities in [EquipmentCatalog.csv](../Assets/_Project/Data/Charts/EquipmentCatalog.csv). Its ten eras follow the [approved concept roster](art-source/equipment-era-drafts/README.md) in order, independently of rarity labels. Each entry explicitly selects an existing same-age/slot balance template; source `003` stats, `006` timing/projectiles, level scaling, options and era/slot probabilities remain the balance basis. New names use the Language charts. Primitive, Bronze, Classical and Medieval Ages have 24, 29, 27 and 34 produced inventory icons respectively; the other eras use explicitly bound temporary icons. This catalog changes item identity and the per-slot rotation pool, without adding combat mechanics implied by item names or new worn character art.

카탈로그 무기에 같은 시대·실제 아이템 ID의 `006_Weapons` 행이 명시되어 있으면 그 행의 전투 설정을 사용하고, 나머지는 지정된 balance template을 복제한다. 세계대전 총기 템플릿(시대 6, 아이템 3)의 사거리는 기존 원거리 무기와 같은 7칸이며, 화염방사기(시대 6, 아이템 104)는 해당 템플릿의 나머지 필드를 유지하는 명시 행으로 사거리를 2칸으로 정한다. [데이터 검사](../Tools/verify_baseline.py)는 보관 원본을 유지하면서 화염방사기의 명시 행 추가만 허용하고, 그 밖의 무기 필드·행 변경은 거절한다. 사거리 4칸 이하의 원거리 플레이어는 적이 접근 중이어도 기다리지 않고 스스로 유효 사거리까지 전진한 뒤 발사한다. 이 규칙은 플레이어·적·용병과 아레나 서버·고스트 생성에 동일하게 적용한다. 저장 ID·스탯 템플릿은 유지한다.

Equipment comparisons display every nonzero Damage and Health contribution from the selected balance template, with independent comparison trends. The active catalog governs generation and current saved-item validity. Imported source IDs remain internal balance/enemy templates, not obtainable player equipment. Identity-to-template mappings are fixed in the catalog and do not consume gameplay random draws.


## 전투 수치 조정

[GameplayConfig](../Assets/_Project/Data/Charts/GameplayConfig.csv)와 [CombatBalance](../Assets/_Project/Domain/CombatBalance.cs)가 현행 조정을 소유한다. 보존 원본 CSV의 수치를 다시 쓰지 않고 소비할 때 적용한다.

- `CombatStatUnitMultiplier=10`은 모든 전투 절대 수치의 단위를 10배 키운다. 장비 5를 1.5배 한 7.5가 10으로 정리되어 강화폭이 2배가 되는 초기 오차를 줄인다. `5→75`, 기본 공격력 `10→150`, 기본 체력 `80→1200`, 첫 적 `HP 70→1050·공격력 10→150`이다. 플레이어·적·스킬·보너스 모두 같은 단위를 사용하므로 단위 확대 자체는 난이도 배율이 아니다.
- `CombatStatScalePermille=1500`: 기본 공격력·체력, 장비의 레벨 성장값, 용병 보너스, 탈것, 스킬의 액티브·패시브 절대 수치를 1.5배 한다. 확률·비율·공격 주기·쿨다운·사거리·재화·경험치는 이 배율의 대상이 아니다. 기존 저장의 ID·레벨·경험치·옵션 roll은 유지한다.
- 양수는 최소 5이며 0은 유지한다. 기본 간격은 5이고 값이 간격의 200배에 도달할 때 간격을 10배 올린다. 중간값은 위로 반올림한다. 따라서 정수이며 끝자리는 0 또는 5이고 대략 세 자리 유효숫자다. 반올림 자체는 `7.5→10`, `124→125`, `729747→730000`이다. 단위 10배와 1.5배는 그 전에 적용한다. 장비 레벨 성장값은 이 5 단위 반올림에서 제외하고 1 단위로 반올림한다. `B=base×1.5×10`, `n=LevelIndex`일 때 양수 장비 기여는 `max(round(B×LevelScalingBase^n), round(B)+n)`이다. 반올림은 사사오입하며 0 기여는 0으로 유지한다. 원본 1% 복리를 사용하되 작은 기여도 레벨마다 최소 1 증가하도록 한다. 1시대 무기는 Lv.1~4에서 75·76·77·78이다. 같은 아이템의 양수 능력치는 Lv.1~149에서 반드시 증가하며, 고레벨 하위 시대와 저레벨 상위 시대의 역전은 허용한다. 기존 레벨·아이템 ID·옵션은 그대로 사용하고 판매가는 원본 `LevelScalingBase` 곡선을 유지한다.
- 최종 플레이어 공격력·최대 체력은 연구·옵션 적용 후 1 단위로 반올림하고, 표시 전투력은 위의 5 단위 규칙으로 정리한다. 상위 장비 판정·자동 제련 알림은 반올림 전 전투력을 비교해 작은 레벨 상승도 감지한다. 공격력·체력·무기 유형·사거리가 같으면 공격 주기·준비 시간과 유효 옵션에 손실 없이 개선되는 경우도 알린다. 옵션끼리의 장단점 교환은 일방적인 상향으로 판정하지 않으며 표시 전투력 공식에 임의의 옵션 가중치를 넣지 않는다. 용병의 독립 공격력·최대 체력은 기존 1/3 배분 후 내림한 값을 같은 규칙으로 정리하며 공격 버프에도 적용한다. 스킬은 타격당 공격력을 정리하고 타격 수를 곱해 총량을 맞추므로 총량은 세∼네 자리 유효숫자가 될 수 있다. 치명타·흡혈·재생의 비율 계산과 전투 중 현재 체력의 내부 소수는 유지한다.
- 용병은 기존 능력치 보너스 외에 독립 공격한다. 현재 무기 기본 주기 1.5초와 공통 공격속도를 기준으로 최대 4명이 기본 공격량을 약 7/3배로 늘린다. 이는 제자리에 있는 대상에 모두 공격할 때의 상한 설명이며 이동·거리·생존을 포함한 플레이 실측이 아니다.
- 적에게 용병 해금·보유 수나 중세 진입을 이유로 추가 체력·공격 배율을 적용하지 않는다. 기존 용병 슬롯 램프(체력 최대 ×2·공격 최대 ×1.45)와 중세 ×1.2 보정은 제거했다. 성장 기능을 해금한 이득은 적의 자동 강화로 상쇄하지 않는다.
- 일반 캠페인의 원시 시대는 원본 기준값을 사용한다. 시대 1~9는 이전 시대 기준값에서 현재 시대 기준값까지 20개 스테이지에 걸쳐 같은 비율로 증가한다. `previous × (current / previous)^((BattleIndex+1)/20)`을 원본 체력·공격력 각각에 적용한 뒤 기존 0.02 보정과 공통 단위·정수화를 수행한다. 시대 마지막에 원본 기준값에 도달하며 시대 첫 단계의 일괄 급증은 없다. 공격 주기·병종·편성의 차이는 유지하므로 실전 난도가 매 단계 엄격하게 증가한다는 뜻은 아니다.
- 일반 191~210은 장비 시대가 유지되는 연장 구간이므로 AgeIndex 9의 최종 기준값을 유지한다. 하드·나이트메어의 원본 난이도·시대 배율은 유지한다. 아레나 고스트는 별도 작업이다.
- 원본 웨이브 인원을 그대로 사용하며 추가 25% 증원·시대별 최소 인원·마지막 웨이브 1명 추가 규칙을 제거한다. 처치당 골드 규칙은 유지하므로 한 스테이지의 처치 보상도 실제 적 수에 맞게 감소한다. 진행 보상·패스·던전 보상 단가는 변경하지 않는다.
- 던전 적은 해당 종류·레벨의 `030_Dungeons` 원본 수치에 공통 단위·정수화만 적용한다. 캠페인 진행·용병 해금 스테이지와 연동한 추가 강화가 없으며 던전 레벨의 원본 성장으로 어려워진다. 던전 웨이브·보상·시간·체력 유지 규칙은 유지한다.
- 아레나 서버와 고스트 생성기도 동일한 정수화·1.5배 계산을 사용한다. 서버는 체력 보너스 출처별 아레나 가중치를 적용한 `combat.arenaHealth`를 직접 제공한다. 클라이언트가 반올림된 일반 체력에서 비율로 다시 환산하지 않아 경계값 오차를 피한다. 새 계산·차트는 배포와 밸런스 게시가 별도로 필요하며 구 서버 표로 대체하지 않는다.

기존 아레나 재생 자료의 고정 입력은 유지하며 계산 규칙 변경에 따른 기대결과는 Unity 측 독립 계산으로 갱신한다. 이 자료는 전송된 전투 입력에 대한 양쪽 시뮬레이터의 일치를 검증하며 현재 성장 수치·획득 속도의 검증을 대신하지 않는다.

### 스킬 시대와 소환

스킬은 희귀도 없이 `SpellInfo.Era`(0~8)만 사용한다. 기존 18종의 ID·보유·레벨·조각·장착·승급은 보존한다. 서버의 누적 소환 횟수는 새 요구량으로 소환 레벨에 재투영하며 횟수를 삭제하지 않는다. 소환 레벨은 1~100이며 캠페인 시대와 독립적이다. `SkillSummonInfo`에 레벨별 진행 요구량·단가와 `Era0Chance`~`Era8Chance`를 둔다. 스킬 확률은 레벨 1·13·25·37·49·61·73·85·100의 기준 분포 사이를 레벨별 선형 보간한다. Lv.1은 시대 0·1에 95%·5%다. 시대 1~7의 기준 레벨에는 이전 시대 전체 30%·해당 시대 60%·다음 시대 10%를 배분하고, Lv.100은 이전 시대 전체 30%·시대 8에 70%를 배분한다. 이전 시대 30%는 각 시대의 스킬 수에 비례해 배분하여 이전 시대의 개별 스킬끼리 같은 획득 확률을 갖게 한다. Lv.100에서는 이전 시대 15종이 각각 2%를 가지며, 하위 스킬도 중복 재료를 계속 얻을 수 있다. 스킬 Lv.1→100에는 중복 688개가 필요하므로 Lv.100 소환 확률을 고정했을 때 하위 스킬 하나의 전 구간 강화에는 평균 34,400회가 필요하다(이미 보유한 레벨·조각 제외 전, 시간·확정 상한이 아닌 기대값). 모든 스킬 만렙은 승천 조건이 아니며 승천은 보유 스킬·조각을 초기화한다. 모든 레벨에서 평균 획득 시대가 증가하고, 특정 시대 이상을 얻을 누적 확률은 감소하지 않는다. 보간 중 다음 기준 분포의 앞선 시대도 점진적으로 등장한다.

시대 확률을 해당 시대의 스킬 수로 나눠 균등 추첨한다. 확률창은 시대 전체 확률을 표시하며 개별 스킬 확률과 구분한다. 양자 시대는 배정 스킬이 없으므로 추첨하지 않는다. 단가 40장과 소환 레벨별 요구량은 Handoff 원본을 사용한다. Lv.100 승천 조건과 승천 시 보유·강화 초기화는 유지한다. 묶음 소환도 매 추첨 뒤 레벨을 갱신한다. 비용 차감·보유·조각·진행의 원자성과 저장 실패·서버 영수증 복구 계약을 유지한다.

용병 훈련병은 두 시대가 한 등급에 묶이므로 별도의 기준 분포를 사용한다. 아래 일반·희귀·영웅·전설·궁극 확률(%) 사이를 레벨별 선형 보간한다.

| 소환 레벨 | 일반 | 희귀 | 영웅 | 전설 | 궁극 |
|---|---:|---:|---:|---:|---:|
| 1 | 98 | 2 | 0 | 0 | 0 |
| 20 | 55 | 35 | 9 | 1 | 0 |
| 40 | 25 | 40 | 27 | 7 | 1 |
| 60 | 12 | 23 | 38 | 23 | 4 |
| 80 | 8 | 14 | 25 | 38 | 15 |
| 100 | 5 | 10 | 20 | 30 | 35 |

모든 레벨에서 평균 훈련병 등급이 증가하고 상위 등급 누적 확률은 감소하지 않는다. 신화 확률은 0이며 기존 신화 보유 데이터의 궁극 이관 계약은 유지한다. 훈련 완료 후 해당 등급의 두 시대·20종 균등 추첨, 훈련 시간·비용·소환 요구량은 유지한다. 탈것 확률은 변경하지 않는다.

`019_Skills`의 희귀도 열을 제거하고 스킬별 발동·레벨 곡선은 유지한다. `020_Skill_Passive`는 공통 100레벨 곡선이며 시대별 기본 기여율은 아래 비장비 성장 계약으로 계산한다. 생성 도구는 `Tools/import_handoff.py`의 `project_skill_charts`이며 Handoff·Extracted 원본은 수정하지 않는다. 차트 게시와 서버 경제·아레나 계산 배포, 클라이언트 반영이 함께 필요하다.

## 비장비 성장 기여

[성장 기여 프로브](../Tools/probe_combat_balance.md)의 `Growth` 진입점은 장비를 고정한 능력치 비교와 스킬 패킷을 재현한다. 일반 전투·아레나의 체력 소비 경로를 구분하며 실제 획득 시간·사용자 플레이 감각을 대신하지 않는다.

`CombatProfile.GrowthBasis`는 기본 수치와 장비를 합산하고 장비 연구·무기 근접 배율을 적용한 공격력·체력이다. 장비 옵션, 스킬 패시브, 용병, 탈것, 전투 버프는 기준값에 넣지 않는다. 각 성장원은 이 동일한 기준값을 사용하므로 다른 보너스를 반복해서 자기 기준으로 가져오지 않는다. 장비 옵션은 모든 출처를 합산한 뒤 기존 stat layer에서 한 번 적용한다.

| 성장원 | 시작 1레벨 | 성장 축과 증가 | 최종 1레벨 |
|---|---:|---:|---:|
| 용병 장착 보너스 | 원시 시대 기준 능력치 5% | 시대당 12.5/9%p | 양자 시대 17.5% |
| 탈것 장착 보너스 | 기준 능력치 10% | 5%p | 35% |

| 스킬 성장원 | 원시 시대 1레벨 | 시대당 증가 | 우주 시대 1레벨 |
|---|---:|---:|---:|
| 보유 스킬 1종의 패시브 | 기준 능력치 0.7% | 0.21%p | 2.38% |
| 공격 스킬의 6초 기준 발동 총량 | 기준 공격력 105% | 21%p | 273% |
| 지속 버프의 공격력·체력 | 해당 기준 능력치 14% | 2.1%p | 30.8% |

- 스킬의 액티브·패시브·버프 기여율은 `SkillEffectScalePermille=700`을 한 번 곱한 값이다. 레벨 성장·승급·연구·타격 수·지속 시간·쿨다운은 유지하며 표시와 실전·아레나 서버가 같은 정수화 전 배율을 사용한다.
- 설정은 `GameplayConfig`의 `PetBonus`·`MountBonus`·`SkillPassive`·`SkillActive`·`SkillBuff`의 `BasePermille`와 용병의 `PetBonusMaximumPermille`(시대 0~9 선형 보간), 탈것의 `RarityStepPermille`, 스킬의 `EraStepPermille`가 소유한다. 스킬 패시브는 희귀도 없는 공통 `020_Skill_Passive` 레벨 곡선을 사용한다. 각 출처의 1레벨 값에 대한 현재 레벨 값의 비율을 곱한다. 용병 성장 비용은 아래 졸업 계약을 사용하며 능력치 곡선과 탈것은 유지한다. 원본 희귀도 간 절대 수치의 30배·수백 배 차이를 그대로 초기 보너스로 쓰지 않는다.
- 용병 유형은 균형형 공격력/체력 1/1, 공격형 1.25/0.75, 체력형 0.75/1.25다. 100종의 무기·역할에 맞춘 배정은 `012_Pets.Type`이며 제작 명세의 `mercenary_type`도 함께 맞춘다. 중갑·전열은 체력형, 화력은 공격형, 기동·지원·복합 역할은 균형형이다. 장착한 용병만 보너스와 독립 전투원을 제공하고, 스킬 패시브는 모든 보유 스킬에서 제공한다. 탈것은 장착한 1종만 제공한다. 용병 독립 전투 능력치의 1/3 배분은 유지한다.
- 연구는 기존 장비·용병·탈것·액티브·패시브의 해당 출처에만 적용한다. 전투 능력치 연구 15종은 `Tools/import_handoff.py::project_combat_research`로 원본을 투영하며 단계당 3%p, 노드 5레벨에서 15%, 같은 효과의 5개 노드를 모두 완료하면 75%다. 비용·시간·소환 확률·레벨 상한 등 비전투 연구 수치는 유지한다. 원본 차트와 저장된 연구 ID·레벨·진행 타이머는 보존한다. 기준값에 들어가는 장비 연구와 개별 성장원 연구는 서로 다른 효과이며, 같은 연구 정의의 여러 stat 행을 중복 구매·중복 배율로 적용하지 않는다. 탈것은 기본 보너스를 정리한 뒤 연구를 곱하고, 용병·스킬은 해당 연구 적용 후 정리한다. 스킬 승급은 정리된 기여에 기존 승급 배율을 곱하고 다시 정리하며 아래 승급 반올림 계약을 따른다.
- 액티브 스킬의 원본 `Damage`·`Health`가 0 또는 빈 값인 속성은 계속 0이다. 공격 스킬은 위 총량에 `원본 쿨다운+활성 시간`을 `SkillActiveReferenceCycleSeconds=6`으로 나눈 비율을 곱한다. 긴 주기의 스킬이 같은 시대의 짧은 주기 스킬보다 지속 공격량부터 불리해지지 않으며, 광역은 `SkillAreaDamagePermille=750`으로 단일 대상 공격량을 75%로 낮춰 다수 대상에서 이득을 얻는다. 쿨다운 감소 옵션은 이 원본 총량을 줄이지 않고 실제 재사용 시간을 단축한다. 총량은 `CombatRules.AreaTick`과 같은 0.05초·엄격한 `>` 조건으로 산출한 실제 타격 수에 나눠 배분한다. 먼저 타격당 수치를 정리하므로 최종 총량에는 반올림 오차가 있다. 광역 공격은 이 총량을 대상마다 적용한다. 발동 간격·효과 지속 시간·공격 대상·재생·치명타 규칙은 유지한다.
- 자동 장착과 알림은 같은 `SpellProfile.Rank`를 사용한다. 현재 연구·승급·장비 옵션·공격 주기·용병 수를 반영하며 반복 공격은 실제 총량, 버프는 지속 시간과 기본 공격량 지원 효과로 평가한다. 광역 대상 수와 조합 시너지를 예측하는 최적 편성 판정은 아니다.
- 기존 저장의 ID·레벨·경험치·스킬 보유·승급·연구 완료와 진행 중 타이머는 유지한다. 변경은 파생 전투 수치에만 적용한다. 새로운 성장 설정을 포함한 서버 차트 게시와 서버 계산 배포가 함께 필요하다.

## 콘텐츠 해금과 성장 흐름

해금은 현행 로컬 기획을 따른다. 길드는 기존 설정을 적용하라는 요청에 따라 원본 `PlayerSegments.Guilds`의 일반 난이도 4-15 조건을 채택했다. `FeatureUnlock`과 재생성 원천 `Tools/import_handoff.py`가 소유하며 `HighestStage`는 다음 입장 가능한 스테이지이므로 표의 직전 스테이지를 클리어하면 열린다. 기능의 입장·저장·잠금 표시·아레나 서버도 같은 차트를 읽는다.

| 최고 진행도 | 새 경험 | 수급·다음 목표 |
|---:|---|---|
| 6 | 시간 보상 | 소환 카드·마법 구슬 골드 확보 |
| 8 | 자동 소환 | 반복 입력 부담 감소 |
| 14 | 상점 | 기본 전투·성장을 익힌 뒤 선택적으로 이용 |
| 21 | 고대의 신전·던전 메뉴 | 소환 카드 60·골드 4,000으로 장비 성장 지원 |
| 31 | 용병·첫 슬롯·콜로세움 | 고대 진입 후 알껍질 200으로 첫 2회 소환, Common 훈련 5분 |
| 31 | 고대 진입 아르케부스 제안 | 1시간 한정, 이후 산업·정보시대에 상위 무기 제안 |
| 36 | 장비 소환 2회 배치 | 반복 장비 성장 확장 |
| 46 | 용병 두 번째 슬롯 | 스킬 도입 전에 전열·후열 편성을 익힘 |
| 51 | 스킬·첫 슬롯·병기 제작소 | 중세 진입 후 티켓 200으로 최소 5회 소환 가능 |
| 51 | 기기 연결 안내 | 축적 진행 보호 |
| 65 | 길드 | 보통 4-14 클리어 후 창설·가입·멤버 관리 |
| 66 | 용병 세 번째·스킬 두 번째 슬롯·장비 소환 3회 배치 | 용병 편성을 완성하고 액티브 조합 시작 |
| 71 | 기술 연구·해적의 섬 | 다음 시대 진입 후 포션 100으로 초기 연구 시작 |
| 86 | 스킬 세 번째 슬롯 | 전체 편성 완성 |
| 91 | 아레나 | 완성된 편성을 익힌 뒤 경쟁 진입 |

던전은 20·30·50·70스테이지 클리어 뒤 순서대로 연다. 용병을 스킬보다 먼저 도입하고 각 성장 기능·첫 슬롯·재료 던전을 동시에 해금해 재료 없는 빈 기능을 만들지 않는다. 시간 보상·자동 소환은 초반 장비 수급과 반복 입력 완화를 위해 유지한다. 이 간격은 진행 구간 기준이며 실제 소요 시간의 실측값은 아니다.

- 마법 구슬 연속 보관은 연구 6레벨에 열린다. 해금값을 내리기만 하고 보관 기능을 며칠 뒤로 남기지 않는다.
- 마법 구슬 2~4레벨의 금액·무료 스킵은 유지하며 인용 시간을 5·10·15분으로 정리한다. 5레벨부터 원본 비용의 1/4을 기준으로 하되 최소 비용은 `2,000+500×(레벨−5)`이며 분할 납부액을 500 단위로 정리한다. 표시 총액은 분할 납부액의 정확한 합이다. 시간은 원본의 1/4을 1시간 미만에서는 5분, 그 이상에서는 1시간 단위로 정리하고 최대 24시간으로 제한한다. 전체 인용 시간의 합은 약 21.4일이며 실제 완료 시간은 재화·무료 스킵·연구·접속 행동에 따라 달라진다.
- 시간 보상 골드는 `기본 초당 골드×(1+(마법 구슬 레벨−1)×OfflineGoldResearchStep)`이며 설정값은 1이다. 장비 시대가 늘어도 골드 수급이 초당 1에 고정되어 비용만 커지는 정체를 줄인다. 지급은 수령 시 현행 레벨과 기술 연구로 계산한다. 소환 카드 수급·시간 상한·분 단위 수령·분수 잔여 저장은 유지한다.
- 새 용병 훈련은 원본 시간에 `HatchDurationDivisor=6`을 적용한 뒤 해당 기술 연구로 줄인다. Common 5분·Rare 20분·Epic 40분·Legendary 80분·Ultimate 160분·Mythic 320분이다. 확률·경험치·종류 선택·서버 영수증과 슬롯 소유권은 유지한다.
- 기술 연구는 현행 `025_Tech_Tier_Costs`의 시간을 `TechDurationDivisor=2`로 나눈 뒤 속도 연구를 적용한다. 단계별 기본 대기는 1티어 1~15분, 2티어 30~150분, 3티어 180~220분, 4티어 255~295분, 5티어 305~345분이다. 기존의 후반 6시간 고정을 단계별 증가로 바꾸며, 25개 비용 단계의 시간 합은 383,445초에서 268,800초로 약 29.9% 줄어든다. 실제 노드 수를 반영한 합도 같은 비율이며 속도 연구·재화·접속 행동에 따른 달력상의 완료 시간과는 다르다. 물약 기본 비용은 보존 원본 대비 약 70%를 유지하는 단계표로 정리한다. 100 미만은 10 단위, 100~499는 10·50 단위, 500~999는 50 단위, 1,000 이상은 100 단위로 두며 `Tools/import_handoff.py`의 단계표가 실행 차트를 재생성한다. 할인 후 비용에는 공통 경제 반올림을 적용한다. 효과·레벨·선행 조건은 유지하고, 모든 브랜치를 합쳐 한 번에 한 항목만 연구하며, 타이머 종료 후에도 직접 완료를 수령하기 전에는 새 연구를 시작할 수 없다. `TechDurationCapSeconds=21,600`은 상한으로 유지한다.
- 이미 시작한 연구·훈련의 저장된 종료 시각, 완료한 레벨·납부 횟수·사용한 재화는 덮어쓰지 않는다. 조정 비용·시간은 이후 시작·납부에 적용하며 보유 콘텐츠를 초기화하지 않는다. 해금 조건은 현재 최고 진행도에 다시 적용하며, 잠긴 슬롯의 장착은 기존 저장 정리 규칙으로 해제한다. 보유 스킬·용병·성장 레벨·던전 단계·열쇠와 아레나 등급·별·보상 기록은 보존한다.

## Campaign difficulties

[MainBattleDifficulty.csv](../Assets/_Project/Data/Charts/MainBattleDifficulty.csv) projects the ordered `DifficultyScaling` array from [APK 2.10.0 MainBattleConfig](research/forge-master/data/apk-2.10.0/MainBattleConfig.json). Lookup clamps the index to the first/last row, matching the source accessor; empty, non-positive and non-contiguous tables are rejected. The local campaign exposes only configured indices 0–2: Normal, Hard and Nightmare (local display names). Stage 210 advances to 211 (Hard 1-1), and 420 to 421 (Nightmare 1-1). Stage 630 remains the replayable local cap; this is not a claim about the source game's final progression limit. Defeat cannot cross the current difficulty/age's first battle. Kill and stage reward rules do not gain an extra difficulty multiplier.

The existing stage ID remains an adapter for the difficulty/age/battle tuple. No new save migration or source-game progress relocation is introduced. Floating-point combat arithmetic retains the project's existing double precision. Published login sheets must include the difficulty table and expanded stages/waves before this client can use server sheets; there is no fallback to stale server data.

## Explicit implementation gaps and local assumptions

These are not claims of extracted source behavior. Do not describe the whole game as independently verified original-runtime behavior.

- Main-stage and dungeon combat run at a fixed 1.25× real-time rate. Movement, attacks, skill cooldowns, wave/stage transitions and combat visuals share this rate through [GameSession](../Assets/_Project/Application/GameSession.cs) and [GameRoot](../Assets/_Project/Presentation/GameRoot.cs). AutoForge, research, hatching, offline rewards and ordinary UI retain their existing real-time clocks. 보존 원본 수치와 저장된 ID·레벨은 유지하며 전투 절대 수치만 위 조정 계약에 따라 환산한다.
- Enemy calibration 0.02 is verified in the pinned public BattleSimulator caller, not independently in the original APK. Raw table import alone omits that step. See `SourceCharts/handoff-source-check.md`. Passing starter tests does not prove full original-game progression parity.
- 장비 능력치와 판매가는 원본 `LevelScalingBase`의 복리 곡선을 사용한다. 장비 능력치에만 위 최소 정수 증가 규칙을 적용한다.
- Item levels use all 29 bracket rows and persistent hidden progress per equipment slot and age. Each forge rolls inclusively between LowerRange and min(UpperRange, floor(MaxLevel)), then advances that slot/age by one bracket up to the first row whose UpperRange reaches MaxLevel. Base MaxLevel is 98, with equipment-type research bonuses. Display levels add one. Normal and automatic forging share this path, including sold items. See [native evidence](research/forge-master/evidence/native-forge-levels-arm64.txt).
- 누적 첫 25회 소환은 같은 부위·같은 시대의 현재 장착 장비가 있으면 결과를 최소 장착 레벨 + 1로 보정한다. 더 높은 추첨 레벨은 유지하며 미장착 보유 장비·다른 시대 장비는 비교하지 않는다. 수동·자동·무료·확정 소환에 함께 적용하고 26회부터 기존 구간 추첨만 적용한다. 추가 난수나 별도 카운터를 사용하지 않는다.
- Saves predating hidden forge progress start each slot/age at bracket zero. Existing equipment is preserved; historical sold-item counts were not recorded and cannot be reconstructed from total forge count.
- 장비 판매가는 원본 SellBasePrice × pow(LevelScalingBase, LevelIndex)에 판매 연구 배율과 현행 시대 보너스를 적용하고, 아래 경제 수치 정리 규칙으로 반올림한다. 중간 계산은 double 정밀도를 유지한다.
- Stat layers apply None first, then the current contribution encounter order, following the APK restoration. None uses multiplier/divisor defaults from 040_Stats. Exact original contribution collection order across deferred systems is not reconstructed. Unsupported qualifiers fail explicitly. Current equipment option consumers have empty qualifiers. Technology and pet consumers use slot, rarity and node identity explicitly. The equipped mount contributes damage/health multiplied by its respective mount research bonus before player-wide layers.
- Normal-attack projectile IDs come from `006_Weapons` and speed/radius/gravity definitions from `041_Projectiles`. The local homing, footprint contact, visual gravity and unmapped-ID policies are documented in [CombatFormulas.md](CombatFormulas.md#normal-attack-projectiles). Original detailed combat targeting is not reconstructed; the recovered forge PCG path is described below.
- Skill ascension uses extracted unlock/multiplier configuration and an explicit reset contract documented in GrowthRuntime.md. Other ascension pillars remain deferred.
- Skill damage divisors, pulse timing, hit boundaries, double-attack scheduling and regeneration follow the APK 2.9.0 arithmetic restoration. Lightning divides by five. These are locally tested formulas, not a claim of identical original-game combat replay; see CombatFormulas.md.
- 자동 소환은 최고 진행도 8, 기본 2·3회 배치는 36·66에서 열린다. 기술 연구의 추가 배치는 기존대로 합산하며 연속 보관은 마법 구슬 6레벨에서 열린다. The option filter unlocks when the highest droppable age and its predecessor both have secondary stats, and keeps any matching selected option. Zero initial gold and retry delays remain local policies. Current HP carries across waves.

ForgeRandom reproduces the APK PCG seed initialization, 32-bit output, modulo integer draws and Q32.32 unit draws. A saved forge seed advances once per generated item, independently of combat RNG. Source order is age, slot, GUID, unused identity, bracket level, secondary types/rolls, then free-forge chance. Appearance is derived from source identity without consuming a gameplay draw. Slot/age rotation excludes previously drawn identities until all are exhausted; melee/ranged weapons share a pool. The first two forges supply catalog Stone Axe (age 0/index 100) and Mammoth Fur Armor (age 0/index 101) at level zero. Afterward the first upgraded-forge reward is Linen Sandals (age 1/index 100) at level zero if no higher age has been forged. Scripted rewards also advance hidden levels and rotation. Opposing melee/ranged bonuses cannot appear together on nonweapon equipment.

Manual and automatic generation share the seeded path, including free pulls, partial batches, sold-item progress and detached persistence. Current-version saves without rotation history begin with empty pools; their existing items stay intact. The balance-version-2 roster migration retires previous equipment and starts new rotation pools. Missing seeds are initialized once on session load and saved through normal persistence. Existing owned items supply a conservative highest-forged-age migration; sold history cannot be recovered. Original account seeds and full original-app execution have not been replayed. Forge ascension remains a separate unimplemented progression feature; these rules cover the currently playable, unascended forge.

The pending equipment stack has a local capacity of 20 cards (`Rules.ForgeStackCapacity`); an exact source capacity has not been recovered. Automatic forging pauses immediately when a retained card fills the stack, including inside a batch, without charging for another pull. Manual forging also respects this limit. Existing larger saved stacks remain available for resolution. Opening the stack pauses automatic forging before showing the newest card; selling or resolving that card exposes the next card from the top. Replaced equipment remains pending under the existing equipment swap contract. A full-stack or matched-item pause lasts until the pending cards are resolved. A manually opened comparison pauses until it closes or its cards are resolved. The active run then resumes automatically; only explicit Stop, insufficient currency, unrecoverable inventory capacity or a persistence error ends it. Other open menus also pause the active run.
- Dungeon stages/rewards, all 18 skills, owned skill passives, egg summoning/hatching, pet equipment, mount single/bulk summoning, merging, equipment and stats and local technology research have active consumers described in GrowthRuntime.md. Mount merging consumes selected mounts and transfers their cumulative XP while preserving target rarity/species. 탈것 UI는 보유 카드·장착·1~50회 자동 소환·확률 안내를 제공하며, 소환 횟수·공간·추가 획득 처리는 [탈것 런타임 계약](GrowthRuntime.md#mounts)을 따른다. Arena and missions remain deferred. Shop gem packs and progress-pass rewards are active as described in GrowthRuntime.md; other shop offers remain deferred. Purchases use an isolated Editor/Development sandbox; no production billing SDK, server or advertising service is added.

<a id="server-arena-ghost-tuning"></a>
## 서버 아레나 고스트 밸런스

[아레나 고스트 정의](CloudBackend.md#고스트-전투-표와-활동)는 52개 장비 구성과 [등급별 계급 조정표](../cloudflare-event-server/data/arenaGhostTuning.json)를 사용한다. 계급은 명시적인 프로젝트 튜닝이며 캠페인 클리어 측정으로 자동 변경하지 않는다. 신규 고스트는 해당 계급의 진입~최대 레벨을 균등 확률로 한 번 배정하고 실제 유저와 같은 고정 ATK/HP를 적용한다. 기존 고스트 저장과 재시도 불변성은 유지한다. `Tools/build_arena_ghosts.py --check`는 현재 차트·공식으로 빠르게 재생성해 비교하며 캠페인 대량 측정을 요구하지 않는다. 실계정 도달시간이나 PvP 실측 난도를 보장하지 않는다.

## Deferred: forge ascension

Forge ascension is intentionally deferred by user decision (2026-09-22). The current delivery covers ordinary manual forging, automatic forging and forge-level upgrades without ascension. Do not include ascension in this delivery or describe its absence as unfinished ordinary forging.

Ascension is a separate progression feature that resets forge progression in exchange for permanent equipment stat bonuses. Its extracted configuration is available in `research/forge-master/data/apk-2.9.0/AscensionConfigsLibrary.json`; importing that data does not implement the feature. When explicitly requested later, verify the original unlock conditions, costs, reset/preservation rules and bonus application before implementing its UI, save state and runtime consumers. Validate persistence and the effect on subsequent item generation and combat together.

## Save versions

The active snapshot store accepts schema 3 and balance version 2. Valid balance-version-1 snapshots retire all old inventory, pending equipment, equipped references and rotation history. Progression, currencies, forge count/seed and level-bracket progress remain. Unknown versions and malformed snapshots are rejected without overwriting their files; the migrated state commits through the normal two-slot transaction. Its separate `local-save-v1` directory starts fresh; migration from older files or the original project's PlayerPrefs is excluded. Automatic recovery operates between the two current-format slots. See [LocalPersistence.md](LocalPersistence.md).

The following conversion remains in the legacy JSON transport and its tests, not in the runtime snapshot load path:

Storage schema 3 gains a separate balance version, source item index, option rolls and total forge count. Migration is detached and idempotent. Currency remains; balance version 2 retires the previous equipment roster and its equipped references. Existing stages map to their previous era/battle positions, clamping the former 20-battle first era to the available 10. Forge levels above the source maximum clamp to 35; skill levels above 100 clamp to 100. Existing installment counts clamp to the new target while currency already spent and existing timers remain. This mapping is lossy at unavailable progression levels and is documented rather than described as exact parity.

The JSON store preserves the first pre-migration save in `.pre-handoff-v0.bak`, which later autosaves do not overwrite, and also creates its normal rolling `.backup` before replacement. No original project PlayerPrefs data is opened. Legacy artwork variants are converted to matching source weapon roles before the retired equipment is removed; artwork values never determine stats.

## Dungeon and growth consumers

See [GrowthRuntime.md](GrowthRuntime.md) for the authoritative active contract of dungeon stages, rewards, skill mechanics/passives, pet hatch/equipment, summon progression and technology effects. 원본 보존과 현행 투영을 구분한다. 상점·패스 보상 수량은 [경제 계약](CommerceBalance.md)의 현행 투영을 사용한다.

## 추가 경제 수치 개편

이번 세션의 전투·비장비 성장·해금·대기 시간 개편에서 남아 있던 던전 보상, 장비 판매가, 연구 재료·마법 구슬 강화·소환 비용을 조정한다. 원본 차트는 보존하고 `GameplayConfig`와 Domain 소비 규칙, 서버 `economy.ts`를 동일하게 적용한다.

- 던전 첫 보상은 유지한다. 내부 레벨 0–399의 레벨당 증가량은 소환 카드 2, 골드 250, 스킬 티켓 5, 연구 물약 5, 알껍질 2다. 보상 연구를 적용한 뒤 금액을 반올림한다. 예를 들어 내부 레벨 100의 연구 물약은 연구 보너스 없이 200에서 600으로, 스킬 티켓은 400에서 700으로 증가한다. 동일 단계 재도전에도 같은 금액을 주며 입장 횟수와 단계별 적 수치는 유지한다.
- 장비 판매가는 기존 레벨 곡선에 시대당 25%를 가산한다. 1시대는 배율 1, 10시대는 3.25다. 품질·옵션으로 판매가를 중복 증폭하지 않는다.
- 판매가, 던전 보상, 연구 재료 비용, 소환 총 비용, 마법 구슬 강화의 분할 납부액은 할인·보너스 후 5 간격으로 중간값을 올려 반올림한다. 금액이 간격의 200배 이상이면 간격을 10배씩 키워 대략 세 자리 유효숫자와 0·5 끝자리를 유지한다. 양수 5 미만은 기존 정수 단위를 유지하고 0은 그대로다. 분할 연구는 납부액을 먼저 정리한 뒤 분할 수를 곱하므로 표시 총액과 실제 납부액이 일치한다. 작은 할인·단계 증가에는 같은 금액이 이어질 수 있다.
- 기존 지갑·서버 시간 보상의 소수 누적 잔여분을 반올림하거나 소급 재산정하지 않는다. 시간 보상 서버 전환 시 로컬 누적을 가져오지 않는 정책은 위 Offline 계약을 따른다. 확률·옵션 비율·쿨다운·경험치와 누적 경험치·스킬 조각·입장권·보석 소액 비용은 각각의 의미를 유지한다. 원본의 확률 합과 저장된 경험치 관계를 단순 끝자리 정리 대상으로 취급하지 않는다. 아레나 순위 보상·상점 상품·진행 패스 지급량도 별도 보상 계약을 유지한다.

이 변경은 수치·정산 경로 개선이다. 실제 플레이타임과 전투 난이도의 체감 검증은 사용자 리뷰 시 확인한다.

## 승급 반올림과 성장 조회

스킬 승급의 누적 배율은 승급 전 표시·실전 기준인 정수화된 패시브 기여와 액티브의 회당 피해·회복량에 적용하고 다시 정수화한다. 최소 5로 표시된 패시브를 승급 때 원래의 1.5로 되돌려 50배를 계산하지 않는다. 최소 단위 때문에 5로 표시된 기여는 첫 승급에서 250이 된다. 큰 수의 최종 유효숫자 정리는 유지한다. 승급 레벨·비용·초기화·저장 계약은 바꾸지 않으며 서버 아레나 프로필도 같은 순서를 따른다.

스킬 곡선 조회는 불변 차트의 `SkillKey` 인덱스를 사용해 해당 스킬의 레벨만 확인한다. 비장비 성장의 기준이 되는 장비·기본 스탯 조회는 장비 옵션 modifier·bonus 컨테이너를 만들거나 옵션 행을 읽지 않는다. 실제 플레이어 전투 프로필은 기존처럼 옵션을 수집하고 적용한다. 별도 플레이어 상태 캐시를 추가하지 않는다.


## 성장 비용과 수급 기준

성장 관측 기준은 양자 시대 주력 용병 4명 Lv.100, 스킬 승천 1회 후 18종 Lv.100이다. 특정 완료 일수를 맞추기 위해 소환·강화·합성 비용이나 패스 보상에 일괄 배율을 적용하지 않는다. 스킬 2·3회 승천은 이후 장기 성장으로 남긴다. 전체 용병 100종 수집·최대 육성을 요구하지 않는다.

용병의 공격력·체력 버프 곡선은 기존 차트를 유지한다. 균형형·연구 없음의 장착 기여율은 Lv.1 원시 5%·양자 17.5%, Lv.100 약 13.4%·46.87%다. 이 수치는 장비 기반 플레이어 기준 능력치에 대한 장착 기여이며 독립 전투원의 능력치 비율이 아니다. 독립 용병 전투원은 기존 소유자 능력치 1/3 배분을 유지한다. 유형 보정과 콘셉트 재배치는 적용하되 버프량 상향·초반 공격력/체력 곡선 변경은 적용하지 않는다.

용병 합성의 레벨별·누적 경험치 요구량과 Lv.1 재료 가치는 Handoff 원본을 사용하며 시대별 Tier 매핑은 유지한다. 기존 저장의 레벨·잔여 경험치·신원은 지우지 않으며 다음 합성에서 현행 요구량을 적용한다. 강화된 재료는 현재 레벨의 누적 경험치와 저장된 잔여 경험치를 모두 전달한다. 훈련 시간·슬롯·500개 수용량·재료 최대 5개 제한은 유지한다.

스킬 강화 요구 조각과 누적 조각은 Handoff 원본을 사용한다. MainGame 패스의 해금 연계·성장 묶음·총량은 [경제 계약](CommerceBalance.md#성장-패스)의 현행 투영을 사용하며 던전 보상 계약은 유지한다. 보상 상세 JSON과 실제 지급량을 일치시키며 이미 수령한 패스를 재지급하거나 회수하지 않는다. 아레나·광고·유료 구매·연구 혜택은 기준 수급에서 제외한다. 과거 200일 수급 측정은 현행 차트의 완료 기간 근거로 사용하지 않는다.

재현 조건과 측정 한계는 [졸업 수급 프로브](../Tools/probe_combat_balance.md#졸업-수급-프로브)를 따른다. 프로브는 지정 관측 기간 안의 완료 여부를 보고하며, 미완료를 수치 축소의 근거로 삼지 않는다. 실제 캠페인 전투 승률 검증과도 구분한다.


### 스토어 상품 매핑

`StoreProductInfo`는 스토어 ID·내부 상품·일일 특가 종류/가격 단계·Unity 상품 유형·기준 USD를 소유하는 서버 배포 차트다. 32개 상품을 클라이언트와 구매 검증 서버가 같은 표로 선택한다. `ShopProductInfo.GoogleId/AppleId`는 일반 상품의 기존 표시 필드이며 실제 결제 라우팅은 `StoreProductInfo`만 사용한다. 등록용 `Docs/store/google-play/in-app-products.csv`는 `Tools/build_balance_data.py`가 이 원천에서 복사하고 `--check`로 일치 여부를 확인한다. 실판매 가격 표시는 Google Play의 현지 가격을 사용한다.
