#!/usr/bin/env python3
"""Read-only SEO preflight: matches exact script to independent frozen QA READY.
Does not assess factual correctness of proposed packaging content.
"""
import argparse,hashlib,json,sys
from pathlib import Path

def sha(data):return hashlib.sha256(data).hexdigest()
def fail(msg):raise ValueError(msg)
def run(ns):
 q=json.loads(ns.qa_frozen.read_text('utf-8'));raw=ns.script.read_bytes();raw.decode('utf-8','strict')
 if q.get('schema')!='DADUS_QA_FROZEN_V1.8.1':fail('Unknown QA checkpoint freeze schema; must migrate with evidence')
 fingerprint=q.get('manifest_sha256','')
 snap={k:v for k,v in q.items() if k!='manifest_sha256'}
 if sha(json.dumps(snap,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode('utf-8'))!=fingerprint:fail('QA frozen manifest integrity mismatch')
 if q.get('title')!=ns.title:fail('Title mismatch between locked primary title and QA')
 if q.get('publication_readiness')!='READY' or not q.get('hard_gate_pass'):fail('QA NOT READY / hard gate FAIL')
 if not isinstance(q.get('frozen_baseline_score'),(int,float)) or q['frozen_baseline_score']<98:fail('QA score <98 or missing')
 if q.get('frozen_patch_ledger'):fail('READY QA may not have remaining actionable patches')
 source=q.get('frozen_source',{})
 if sha(raw)!=source.get('file_sha256'):fail('Script is NOT the exact file QA judged READY')
 if source.get('length_gate')!='PASS' or source.get('headings')!=list(range(1,8)):fail('QA file is not seven-Part valid-length script')
 outline=ns.outline_file.read_bytes();outline.decode('utf-8','strict')
 osh=sha(outline);vid=sha((ns.title+'\n'+osh).encode('utf-8'))[:16]
 if q.get('outline_sha256')!=osh or q.get('video_id')!=vid:fail('Independent frozen QA is not bound to this video/outline')
 if ns.script_manifest:
  manifest=json.loads(ns.script_manifest.read_text('utf-8'))
  if manifest.get('video_id')!=vid or manifest.get('title')!=ns.title:fail('Script manifest video identity mismatch')
 return {'pass':True,'title':ns.title,'video_id':vid,'script_file_sha256':sha(raw),
         'qa_frozen_sha256':sha(ns.qa_frozen.read_bytes()), 'qa_score':q['frozen_baseline_score'],
         'publication_readiness':'READY','fact_lock_requirement':'Extract facts from exact script; tool does not invent or verify packaged claims'}
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--script',type=Path,required=True);a.add_argument('--qa-frozen',type=Path,required=True);a.add_argument('--outline-file',type=Path,required=True);a.add_argument('--script-manifest',type=Path);a.add_argument('--title',required=True);n=a.parse_args()
 try:r=run(n)
 except (ValueError,KeyError,TypeError,OSError,UnicodeError,json.JSONDecodeError) as e:r={'pass':False,'error':str(e)}
 print(json.dumps(r,ensure_ascii=False,indent=2));sys.exit(0 if r['pass'] else 2)
