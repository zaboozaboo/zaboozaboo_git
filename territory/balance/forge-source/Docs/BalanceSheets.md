# Balance sheets

`Managers.prefab/BalanceInfoManager` binds the 53 balance CSVs directly under
`Assets/_Project/Data/Charts`. `Language` and `Extracted` are excluded from that binding. `GameRoot` loads them
before constructing the session. `Catalog.TableNames` lists the loaded sheets;
`Catalog.Rows` and `Catalog.Find` expose immutable rows.

The 53 runtime sheets include all 43 canonical developer-handoff tables, byte
for byte. Gameplay continues to consume these existing table names and projections.
The 76 `APK_*` sheets preserve all settings extracted from Forge Master 2.9.0,
including fields not represented by the handoff projections. They are separate
source snapshots for offline inspection, not runtime catalog entries, overrides of the handoff,
or proof that deferred gameplay features are implemented.

`022_Tech_Nodes` is a validated effect-definition contract for the explicit research consumers.
`023` supplies level values, `024` supplies layout/prerequisites, and `025` supplies costs/timers.
See [GrowthRuntime.md](GrowthRuntime.md#research) for validation and deferred-effect boundaries.

## Extracted categories

Each source configuration has its own CSV under `Charts/Extracted/<category>`.
Definitions, growth, costs, probabilities, rewards and layouts remain separate
when the source provides separate libraries.

| Folder | Contents |
|---|---|
| Core | Global, idle, profile, segments, tracking, worlds, stats |
| Forge | Forge settings/upgrades, age probabilities, level brackets |
| Equipment | Item balance, weapons, secondary stats and unlocks |
| Skills | Definitions, passive growth, upgrades, summoning |
| Pets | Definitions, balance, upgrades, eggs, summoning, stat unlocks |
| Mounts | Definitions, upgrades, summoning |
| Research | Nodes, values, layout, tier costs |
| Battle | Main battles, enemies, scaling, projectiles |
| Dungeons | Settings, rewards, four battle libraries, migration |
| Arena | Settings, leagues, rewards |
| Guild | Settings, tiers, emblem colors |
| GuildResearch | Layout and upgrades |
| GuildRace | Elimination and rewards |
| GuildWar | Settings, day configuration, progress pass |
| Missions | Settings, levels, battles, rally times, rewards |
| Shop | Daily deals, products, resources |
| Passes | Main-game progress pass |
| Skins | Definitions, upgrades, sets |
| Ascension | Configuration and star bonuses |
| Fairy | Upgrades |

## Reading source values

Extracted sheets use `JsonPointer,Type,Value` columns. JSON pointers preserve
array indices and escape object keys (`~0` for `~`, `~1` for `/`). Scalar values
retain their source types; empty objects and arrays have explicit rows. No
probabilities, duplicates, nulls, or empty strings are normalized away.

```csharp
var catalog = balanceInfoManager.Catalog;
var mounts = catalog.Rows("016_Mounts");
int startingGems = catalog.Find("001_Global_Config", "Path", "StartingGems").Int("Value");
var definitions = catalog.Rows("022_Tech_Nodes");
```

`Tools/import_apk_balance.py` reproduces the 76 source sheets from
`Docs/research/forge-master/data/apk-2.9.0/manifest.json` and its JSON files.
`python3 Tools/import_apk_balance.py --check` verifies exact coverage and CSV
content without modifying files. `Tools/verify_baseline.py` checks the archived baseline
and handoff manifest; its legacy baseline includes removed local sheets. Use the Editor menu
`Tools/Conquest GO!/Bind Handoff Charts` to refresh serialized bindings after
adding a sheet. Duplicate filenames and missing required charts fail loading.
