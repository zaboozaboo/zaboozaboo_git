"""Project the local Forge reference charts into the browser game's immutable inputs."""
import csv,json,hashlib,argparse
parser=argparse.ArgumentParser();parser.add_argument("--check",action="store_true");args=parser.parse_args()
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'balance/forge-source/Charts'
snapshot=json.loads((source.parent/'manifest.json').read_text())
for entry in snapshot['files']:
 p=source.parent/entry['path']
 if hashlib.sha256(p.read_bytes()).hexdigest()!=entry['sha256']:raise SystemExit('Source snapshot hash mismatch: '+entry['path'])
files={'upgrades':'ForgeUpgradeInfo','odds':'004_Item_Drop_Chances','brackets':'005_Item_Level_Brackets','tiers':'EquipmentTierInfo','levels':'PlayerLevelInfo','waves':'StageWave','stages':'StageData','enemy':'029_Enemy_Scaling'}
files.update({'config':'GameplayConfig','global':'001_Global_Config','base':'003_Item_Base_Stats','options':'007_Secondary_Stats','difficulty':'MainBattleDifficulty','dungeons':'030_Dungeons','rewards':'031_Dungeon_Rewards','unlocks':'FeatureUnlock','techLayout':'024_Tech_Layout','techValues':'023_Tech_Values','techCosts':'025_Tech_Tier_Costs','weapons':'006_Weapons','presets':'EnemyPreset','enemies':'028_Enemies'})
data={};manifest={}
for key,name in files.items():
 p=source/(name+'.csv');rows=list(csv.DictReader(p.open()))
 def number(v):
  try:return int(v)
  except ValueError:
   try:return float(v)
   except ValueError:return v
 data[key]=[{k:number(v) for k,v in r.items()} for r in rows]
 manifest[name]={'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'rows':len(rows)}
data['source']={'project':'forge-clone-2','charts':manifest,'adaptation':'장비 8부위→유닛 3역할. 전투·생산 비용은 포탈마스터용. 확률·레벨 구간·강화 비용/시간·시대 순서·판매 기본값은 원천 유지.'}
output=("'use strict';\nconst FORGE_BALANCE = "+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')

target=root/'js/forge-balance.js'
if args.check:
 if target.read_text()!=output:raise SystemExit('Generated forge-balance.js differs; run importer to review update')
 print('PASS pinned source hashes and generated runtime tables')
else:target.write_text(output)
