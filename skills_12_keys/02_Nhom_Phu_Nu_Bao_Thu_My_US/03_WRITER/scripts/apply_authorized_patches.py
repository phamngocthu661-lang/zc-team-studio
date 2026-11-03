#!/usr/bin/env python3
"""Writer-owned deterministic byte-splice of QA-approved edit windows only.

Run only on explicit user Step 5 approval for the exact ledger. The --user-approved
flag records the caller's assertion, not cryptographic evidence of user consent.
This tool checks SHA, frozen QA, window hashes, headings, body length, and every
untouched byte. It cannot determine literary quality. A fresh Step 4 is required.

Example:
 python apply_authorized_patches.py --baseline FULL.txt --frozen QA_FROZEN.json \
  --contract REPAIR_CONTRACT.json --replacements REPLACEMENTS.json \
  --outline-file FINAL_OUTLINE.txt --user-approved \
  --out FULL_SCRIPT_REVISED.txt --proof REPAIR_PROOF.json
"""
import argparse,hashlib,json,re,sys,os,tempfile
from pathlib import Path

def sha(x):return hashlib.sha256(x).hexdigest()
def canon(x):return json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode('utf-8')
def load(p):return json.loads(Path(p).read_text(encoding='utf-8'))
def fail(x):raise ValueError(x)
def atomic(path,b):
 path.parent.mkdir(parents=True,exist_ok=True)
 with tempfile.NamedTemporaryFile(dir=path.parent,delete=False,prefix='.wrv_patch_') as f:f.write(b);temp=Path(f.name)
 try:os.replace(temp,path)
 finally:
  if temp.exists():temp.unlink()
def run(ns):
 if not ns.user_approved:fail('No explicit Step 5 user approval assertion; abort')
 baseline=ns.baseline.read_bytes(); frozen_raw=ns.frozen.read_bytes(); frozen=json.loads(frozen_raw); c=load(ns.contract); payload=load(ns.replacements)
 if c.get('schema')!='WRV_QA_REPAIR_CONTRACT_V12':fail('Not V12 contract')
 if frozen.get('schema')!='WRV_QA_FROZEN_V1.8.1' or sha(canon({k:v for k,v in frozen.items() if k!='manifest_sha256'}))!=frozen.get('manifest_sha256'):
  fail('Frozen QA JSON integrity or schema incorrect')
 token=c.get('contract_sha256');unsigned={k:v for k,v in c.items() if k!='contract_sha256'}
 if sha(canon(unsigned))!=token:fail('Repair contract content was changed')
 if c.get('status')!='FROZEN_UNAPPROVED':fail('Unexpected source contract status')
 if sha(baseline)!=c.get('baseline_file_sha256') or frozen.get('frozen_source',{}).get('file_sha256')!=sha(baseline):fail('Baseline differs from frozen QA; do not patch')
 if sha(frozen_raw)!=c.get('qa_frozen_file_sha256'):fail('Frozen QA artifact differs from approved contract')
 if frozen.get('title')!=c.get('locked_title') or frozen.get('publication_readiness')=='READY':fail('QA title or readiness invalid')
 if frozen.get('video_id')!=c.get('video_id') or frozen.get('outline_sha256')!=c.get('outline_sha256'):
  fail('Frozen QA not bound to the same video and exact outline')
 osha=sha(ns.outline_file.read_bytes())
 if osha!=c.get('outline_sha256') or sha((c['locked_title']+'\n'+osha).encode('utf-8'))[:16]!=c.get('video_id'):fail('Outline/video identity mismatched')
 
 # One-repair-per-video-id lock in canonical immutable original baseline directory.
 # All final files and proof must live alongside the baseline to share the guard.
 if ns.out.resolve().parent != ns.baseline.resolve().parent or ns.proof.resolve().parent != ns.baseline.resolve().parent:
  fail('One-shot repair requires revised script and proof in original baseline directory')
 repair_marker=ns.baseline.resolve().parent / f"WRV_{c['video_id']}_REPAIR_USED.json"
 if repair_marker.exists():fail('ONE REPAIR ALREADY USED for this video_id; Step5 cannot run twice')
 if ns.out.exists() or ns.proof.exists():fail('Existing revision/proof prevents overwrite (one-shot repair)')

 if payload.get('schema')!='WRV_REPAIR_REPLACEMENTS_V1':fail('Replacements schema missing')
 reps=payload.get('replacements')
 if not isinstance(reps,list):fail('Missing replacements array')
 if len({r.get('zone_id') for r in reps})!=len(reps):fail('Duplicate replacement zone_id')
 by_id={r['zone_id']:r for r in reps}
 zones=c.get('zones',[])
 if not zones or set(by_id)!={z['zone_id'] for z in zones}:fail('Every authorized zone must have exactly one replacement; no extras')
 headings=list(re.finditer(rb'(?m)^\[PART [1-7]\]\n',baseline)); heading_bytes=[m.group() for m in headings]
 if len(headings)!=7:fail('Invalid source heading count')
 out=bytearray(); prev=0; proofs=[]
 for z in zones:
  st,en=z['start_byte'],z['end_byte']
  if type(st)!=int or type(en)!=int or st<prev or st>=en or en>len(baseline):fail('Invalid or overlapping zone')
  if sha(baseline[st:en])!=z.get('original_sha256'):fail('Edited/incorrect original source zone: '+z['zone_id'])
  if any(st<m.end() and en>m.start() for m in headings):fail('Part heading editable window prohibited')
  original=baseline[st:en];original.decode('utf-8','strict')
  rep=by_id[z['zone_id']].get('text')
  if not isinstance(rep,str) or not rep.strip():fail('Missing substantive replacement text: '+z['zone_id'])
  raw=rep.encode('utf-8');
  if b'\r' in raw or b'\xef\xbb\xbf' in raw:fail('No CR/BOM permitted in replacements')
  if re.search(rb'(?m)^\[PART [1-7]\]$',raw):fail('Replacement cannot include a standalone heading')
  out.extend(baseline[prev:st]);out.extend(raw);prev=en
  proofs.append({'zone_id':z['zone_id'],'patch_ids':z['patch_ids'],'source_range':[st,en],
                 'original_sha256':z['original_sha256'],'replacement_sha256':sha(raw),'replacement_bytes':len(raw)})
 out.extend(baseline[prev:]);result=bytes(out)
 # Explicit untouched-span equality audit independent of the splice construction.
 src_prev=0;new_prev=0
 for z in zones:
  a,b=z['start_byte'],z['end_byte'];unchanged=baseline[src_prev:a]
  if result[new_prev:new_prev+len(unchanged)]!=unchanged:fail('Immutable bytes changed')
  new_prev+=len(unchanged)+len(by_id[z['zone_id']]['text'].encode('utf-8'));src_prev=b
 if result[new_prev:]!=baseline[src_prev:]:fail('Immutable trailer changed')
 original_headings=[m.group().decode() for m in headings]
 from verify_full_script import report
 with tempfile.NamedTemporaryFile(dir=ns.out.parent if ns.out.parent.exists() else None,delete=False,prefix='.wrv_revision_preview_',suffix='.txt') as tf:
  tf.write(result);temp=Path(tf.name)
 try: verification=report(temp)
 finally:temp.unlink(missing_ok=True)
 if not verification.get('pass'):fail('Revised full script hard gate failed; no file published: '+', '.join(verification.get('failures',[])))
 if result==baseline:fail('No changes made; do not misstate repair')
 atomic(ns.out,result)
 marker_payload={'schema':'WRV_ONE_REPAIR_MARKER_V1','video_id':c['video_id'],'baseline_file_sha256':sha(baseline),'revision_file_sha256':sha(result),'status':'USED_ONCE_NO_SECOND_REPAIR'}
 try:
  fd=os.open(repair_marker,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o644)
  with os.fdopen(fd,'wb') as mf:mf.write((json.dumps(marker_payload,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
 except FileExistsError:fail('Repair one-shot marker already exists')
 if sha(ns.out.read_bytes())!=sha(result):fail('Readback revision hash mismatch')
 proof={'schema':'WRV_WRITER_REPAIR_PROOF_V12','proof_is_editorial_QA':False,
        'title':c['locked_title'],'video_id':c['video_id'],'source_baseline_sha256':sha(baseline),
        'frozen_QA_sha256':sha(frozen_raw),'repair_contract_sha256':token,'user_approved_flag_asserted':True,
        'revised_file_sha256':sha(result),'revised_body_sha256':verification['script_body_sha256'],
        'revised_body_chars':verification['script_body_chars'],'revised_body_words':verification['script_body_words'],
        'full_length_pass':True,'untouched_spans_byte_exact':True,'heading_sequence_pass':True,
        'all_approved_zones_applied':True,'zones':proofs,'source_script_path':str(ns.baseline.resolve()),
        'revised_script_path':str(ns.out.resolve()),'publication_readiness':'UNDETERMINED_NEEDS_STEP4', 'one_shot_marker_path':str(repair_marker)}
 atomic(ns.proof,(json.dumps(proof,indent=2,ensure_ascii=False)+'\n').encode('utf-8'))
 return {'pass':True,'revised_path':str(ns.out),'proof_path':str(ns.proof),
         'revised_file_sha256':sha(result),'revised_body_chars':verification['script_body_chars'],
         'immutable_byte_comparison':'PASS','next_required_step':'step4'}
if __name__=='__main__':
 ap=argparse.ArgumentParser()
 for p in ('baseline','frozen','contract','replacements','outline-file','out','proof'):
  ap.add_argument('--'+p,type=Path,required=True,dest=p.replace('-','_'))
 ap.add_argument('--user-approved',action='store_true')
 ns=ap.parse_args()
 try:r=run(ns)
 except (ValueError,OSError,KeyError,TypeError,UnicodeError,json.JSONDecodeError) as ex:r={'pass':False,'error':str(ex)}
 print(json.dumps(r,indent=2,ensure_ascii=False));sys.exit(0 if r['pass'] else 2)
