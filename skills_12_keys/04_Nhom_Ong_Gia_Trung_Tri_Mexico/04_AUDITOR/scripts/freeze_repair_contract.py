#!/usr/bin/env python3
"""QA-owned: turn frozen actual findings + manually located exact byte windows into a CLOSED repair contract.

NO prose changes, NO narrative audit, NO automatic approval. Rejects missing patch IDs,
ambiguous anchors, protected strong quotes inside windows, heading edits or mixed lineage.

  python freeze_repair_contract.py --baseline FULL.txt --frozen QA_FROZEN.json \
    --zones QA_ZONE_SPEC.json --outline-file FINAL_OUTLINE.txt --out REPAIR_CONTRACT.json
"""
import argparse,hashlib,json,re,sys
from pathlib import Path

def sha(x):return hashlib.sha256(x).hexdigest()
def fail(x):raise ValueError(x)
def load(p):return json.loads(Path(p).read_text(encoding='utf-8'))
def canonical(x):return json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode('utf-8')
def make(ns):
 baseline=ns.baseline.read_bytes(); text=baseline.decode('utf-8','strict'); fb=ns.frozen.read_bytes(); frozen=json.loads(fb.decode('utf-8')); proposed=load(ns.zones)
 if frozen.get('schema')!='PADRE_MX_QA_FROZEN_V1':fail('Unsupported frozen QA format')
 stored=frozen.get('manifest_sha256')
 if not stored or sha(canonical({k:v for k,v in frozen.items() if k!='manifest_sha256'}))!=stored:
  fail('Frozen QA manifest checksum invalid')
 source=frozen.get('frozen_source',{})
 if source.get('file_sha256')!=sha(baseline):fail('Frozen QA source SHA does not equal exact baseline SHA')
 if frozen.get('repair_round')!=0:fail('One repair only: postrepair QA cannot authorize a second repair')
 if frozen.get('publication_readiness')!='NOT_READY_REPAIR_ELIGIBLE':fail('Repair not authorized for current QA status')
 if not isinstance(frozen.get('frozen_patch_ledger'),list) or not frozen['frozen_patch_ledger']:fail('No frozen actionable patches')
 title=frozen.get('title','')
 if not title:fail('Missing locked QA title')
 outline=ns.outline_file.read_bytes(); outline.decode('utf-8','strict')
 outline_sha=sha(outline); video_id=sha((title+'\n'+outline_sha).encode('utf-8'))[:16]
 if frozen.get('outline_sha256')!=outline_sha or frozen.get('video_id')!=video_id:
  fail('QA frozen source is bound to DIFFERENT outline/video identity')
 by_id={x['id']:x for x in frozen['frozen_patch_ledger']}
 if len(by_id)!=len(frozen['frozen_patch_ledger']):fail('Duplicate frozen defect IDs')
 if 'zones' not in proposed or not isinstance(proposed['zones'],list) or not proposed['zones']:fail('Missing proposed zones')
 headings=[m.span() for m in re.finditer(rb'(?m)^\[PART [1-7]\]\n',baseline)]
 if len(headings)!=7:fail('Expected seven standalone LF headings')
 ranges=[]; seen=set(); used=set()
 for z in proposed['zones']:
  ident=z.get('zone_id')
  if not isinstance(ident,str) or not re.fullmatch('Z[0-9]{3,}',ident) or ident in seen:fail('Duplicate/invalid zone ID: '+str(ident))
  seen.add(ident)
  st=z.get('start_byte'); en=z.get('end_byte')
  if type(st)!=int or type(en)!=int or not 0<=st<en<=len(baseline):fail('Invalid half-open byte window '+ident)
  if any(st<h1 and en>h0 for h0,h1 in headings):fail('Editing a heading is prohibited: '+ident)
  first_part=sum(h1<=st for h0,h1 in headings)
  last_part=sum(h1<en for h0,h1 in headings)
  if first_part!=last_part or not 1<=first_part<=7:fail('Zone must stay wholly within one Part: '+ident)
  win=baseline[st:en]
  try:sub=win.decode('utf-8','strict')
  except UnicodeDecodeError:fail('Byte boundary splits UTF-8 codepoint: '+ident)
  ids=z.get('patch_ids')
  if not isinstance(ids,list) or not ids or len(ids)!=len(set(ids)) or any(x not in by_id for x in ids):fail('Invalid patch IDs in '+ident)
  for pid in ids:
   finding=by_id[pid]
   if finding.get('part')!=f'Part {first_part}':fail(ident+' crosses QA patch Part '+pid)
   anchors=[finding.get('anchor','')]+[o.get('anchor','') for o in finding.get('occurrences',[]) if isinstance(o,dict)]
   anchors += [d.get('anchor','') for d in finding.get('approved_dependencies',[]) if isinstance(d,dict)]
   if not any(a and a in sub for a in anchors):fail(ident+' lacks an exact finding/occurrence/dependency anchor for '+pid)
   used.add(pid)
  for strong in frozen.get('strong_span_ledger',[]):
   anch=strong.get('anchor','')
   if anch:
    protected=anch.encode('utf-8')
    pos=baseline.find(protected)
    while pos!=-1:
     if st<pos+len(protected) and en>pos:fail('Zone overlaps ANY BYTES of protected strong quote: '+ident)
     pos=baseline.find(protected,pos+1)
  ranges.append((st,en,{'zone_id':ident,'patch_ids':ids,'part':first_part,'start_byte':st,'end_byte':en,
                          'original_sha256':sha(win),'original_bytes':len(win),'length_intents':{pid:by_id[pid]['length_intent'] for pid in ids}}))
 ranges.sort()
 for (a,b,_),(c,d,_) in zip(ranges,ranges[1:]):
  if b>c:fail('Overlapping zones (including overlapping bytes)')
 if used!=set(by_id):fail('Frozen defects missing authorized zones: '+str(sorted(set(by_id)-used)))
 contract={'schema':'PADRE_MX_QA_REPAIR_CONTRACT_V1','locked_title':title,'video_id':video_id,'outline_sha256':outline_sha,
           'baseline_path':str(ns.baseline.resolve()),'baseline_file_sha256':sha(baseline),
           'baseline_body_sha256':source.get('body_sha256'), 'qa_frozen_file_sha256':sha(fb),
           'qa_frozen_path':str(ns.frozen.resolve()),'status':'FROZEN_UNAPPROVED','repair_round':0,
           'patch_ids':sorted(used),'zones':[x[2] for x in ranges],
           'user_approval':'Required at Step 5: explicit step5 command on this exact QA ledger; never presume approval in Step 4',
           'note':'Exact source bytes and QA anchors have been checked; this is edit scope, NOT replacement prose.'}
 contract['contract_sha256']=sha(canonical(contract))
 ns.out.parent.mkdir(parents=True,exist_ok=True);ns.out.write_text(json.dumps(contract,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 return {'pass':True,'contract_path':str(ns.out),'contract_sha256':contract['contract_sha256'],
         'video_id':video_id,'zone_count':len(ranges),'patch_count':len(used),'baseline_sha256':sha(baseline)}
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--baseline',type=Path,required=True);ap.add_argument('--frozen',type=Path,required=True);ap.add_argument('--zones',type=Path,required=True);ap.add_argument('--outline-file',type=Path,required=True);ap.add_argument('--out',type=Path,required=True)
 ns=ap.parse_args()
 try:r=make(ns)
 except (ValueError,OSError,KeyError,TypeError,json.JSONDecodeError) as ex:r={'pass':False,'error':str(ex)}
 print(json.dumps(r,ensure_ascii=False,indent=2));sys.exit(0 if r['pass'] else 2)
