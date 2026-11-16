"""Validate the complete authored roster without modifying image pixels."""
from pathlib import Path
import struct, hashlib, json
root=Path(__file__).resolve().parents[1]
folder=root/'assets/portal-units-v1'
errors=[]; hashes=set(); total=0; rows=[]
for era in range(10):
 for variant in range(6):
  ident=f'pm_{era}_{variant}';p=(root/'assets/portal-spearmen-v1' if variant==4 else folder)/(ident+'.png')
  if not p.exists():errors.append(ident+': missing');continue
  data=p.read_bytes()
  if data[:8]!=b'\x89PNG\r\n\x1a\n':errors.append(ident+': not PNG');continue
  w,h,depth,color=struct.unpack('>IIBB',data[16:26])
  if abs(w/h-2)>.1:errors.append(ident+': expected 2 square cells')
  if color!=6:errors.append(ident+': expected RGBA')
  sha=hashlib.sha256(data).hexdigest()
  if sha in hashes:errors.append(ident+': duplicated file')
  hashes.add(sha);total+=len(data);rows.append(dict(id=ident,width=w,height=h,bytes=len(data),sha256=sha))
if errors:raise SystemExit('\n'.join(errors))
print(f'PASS 60 unique RGBA PNGs, 120 direction cells, {total/1024/1024:.1f} MiB')
(folder/'validation.json').write_text(json.dumps({'count':len(rows),'directionFrames':len(rows)*2,'files':rows},indent=2)+'\n')
