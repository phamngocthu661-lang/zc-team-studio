#!/usr/bin/env python3
"""Independent deterministic comparison of the one-repair script vs original/contract.
Checks all untouched bytes, changed chunks, heading safety, protected quote overlap.
Does NOT assess literary quality or establish human consent.
"""
import argparse,hashlib,json,sys
from pathlib import Path

def sha(b):return hashlib.sha256(b).hexdigest()
def chk(condition,message):
 if not condition:raise ValueError(message)
def verify(baseline,revised,contract,proof,frozen):
 source=Path(baseline).read_bytes();new=Path(revised).read_bytes()
 c=json.loads(Path(contract).read_text(encoding='utf-8'))
 p=json.loads(Path(proof).read_text(encoding='utf-8'))
 q=json.loads(Path(frozen).read_text(encoding='utf-8'))
 chk(c.get('schema')=='PADRE_MX_QA_REPAIR_CONTRACT_V1','Invalid contract schema')
 chk(p.get('schema')=='PADRE_MX_WRITER_REPAIR_PROOF_V1','Invalid proof schema')
 chk(q.get('schema')=='PADRE_MX_QA_FROZEN_V1','Invalid frozen QA schema')
 chk(c.get('repair_round')==q.get('repair_round')==0 and p.get('repair_round')==1,'Not exactly one repair')
 chk(sha(source)==c['baseline_file_sha256']==p['source_baseline_sha256']==q['frozen_source']['file_sha256'],'Source baseline SHA inconsistent')
 chk(sha(new)==p.get('revised_file_sha256'),'Revised SHA mismatched proof')
 chk(sha(Path(frozen).read_bytes())==c['qa_frozen_file_sha256']==p['frozen_QA_sha256'],'QA binding mismatched')
 chk(c['video_id']==q['video_id']==p['video_id'],'Video ID mismatch')
 z=c['zones'];zp=p['zones'];chk(len(z)==len(zp)>0,'Zone counts differ')
 a=b=0
 for x,y in zip(z,zp):
  st,en=x['start_byte'],x['end_byte']
  chk(a<=st<en<=len(source),'Invalid/overlap zone')
  chk(x['zone_id']==y['zone_id'] and y['source_range']==[st,en],'Proof zone identity mismatch')
  chk(sha(source[st:en])==x['original_sha256']==y['original_sha256'],'Original zone SHA mismatch')
  fixed=source[a:st];chk(new[b:b+len(fixed)]==fixed,'Untouched middle bytes changed')
  b+=len(fixed);n=y['replacement_bytes'];chunk=new[b:b+n]
  chk(sha(chunk)==y['replacement_sha256'],'Replacement bytes changed')
  try:chunk.decode('utf-8','strict')
  except UnicodeError:raise ValueError('Invalid UTF8 replacement')
  for strong in q.get('strong_span_ledger',[]):
   word=strong.get('anchor','').encode('utf-8')
   if word:
    at=source.find(word)
    while at!=-1:
     chk(not (st<at+len(word) and en>at),'Protected strong quote overlap')
     at=source.find(word,at+1)
  b+=n;a=en
 chk(new[b:]==source[a:],'Untouched trailing bytes changed')
 from verify_full_script import report
 snap=report(Path(revised))
 chk(snap.get('pass'),'Revised seven-Part structural/length gate failed')
 chk(snap['script_body_sha256']==p['revised_body_sha256'],'Body hash mismatch')
 return {'pass':True,'untouched_bytes_verified':True,'zones':len(z),'video_id':c['video_id'],'repair_round':1,'revised_file_sha256':sha(new)}
if __name__=='__main__':
 a=argparse.ArgumentParser()
 for k in ('baseline','revised','contract','proof','frozen'):a.add_argument('--'+k,required=True,type=Path)
 ns=a.parse_args()
 try:r=verify(ns.baseline,ns.revised,ns.contract,ns.proof,ns.frozen)
 except (ValueError,OSError,KeyError,TypeError,UnicodeError,json.JSONDecodeError) as e:r={'pass':False,'error':str(e)}
 print(json.dumps(r,ensure_ascii=False,indent=2));sys.exit(0 if r['pass'] else 2)
