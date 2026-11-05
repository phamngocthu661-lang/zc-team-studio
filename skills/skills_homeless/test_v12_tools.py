#!/usr/bin/env python3
"""Synthetic integrity regression tests only. Never treat fixture as real narrative QA."""
import tempfile,subprocess,json,hashlib,sys,shutil
from pathlib import Path
ROOT=Path(__file__).parent
W=ROOT/'Writer'/'scripts';Q=ROOT/'QA'/'scripts';S=ROOT/'SEO'/'scripts'
N=0

def sh(b):return hashlib.sha256(b).hexdigest()
def cmd(script,*args,ok=True):
 global N
 r=subprocess.run([sys.executable,str(script),*map(str,args)],capture_output=True,text=True)
 N+=1
 if ok and r.returncode!=0:raise AssertionError(f'{script.name} failed {r.returncode}: {r.stdout} {r.stderr}')
 if not ok and r.returncode==0:raise AssertionError(f'{script.name} improperly accepted invalid source: {r.stdout}')
 try:return json.loads(r.stdout)
 except json.JSONDecodeError:raise AssertionError(r.stdout+'\n'+r.stderr)

def jsfile(path,obj):path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def fake_frozen(path, title, full, info,anchor, outline, status='NOT READY'):
 osh=sh(outline.read_bytes());vid=sh((title+'\n'+osh).encode('utf-8'))[:16]
 q={'schema':'HOMELESS_QA_FROZEN_V1.8.1','title':title,'video_id':vid,'outline_sha256':osh,
    'frozen_source':{'file_sha256':info['file_sha256'],'body_sha256':info['script_body_sha256'],'body_chars':info['script_body_chars'],'headings':list(range(1,8)),'length_gate':'PASS'},
    'publication_readiness':status,'hard_gate_pass':status=='READY','frozen_baseline_score':95 if status!='READY' else 100,
    'frozen_patch_ledger':[] if status=='READY' else [{'id':'P01','part':'Part 3','severity':'P1','anchor':anchor,'length_intent':'KEEP','occurrences':[]}],
    'strong_span_ledger':[{'part':'Part 1','anchor':'PROTECTED S01 SENTENCE'}]}
 q['manifest_sha256']=sh(json.dumps(q,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode('utf-8'))
 jsfile(path,q)

def tests():
 global N
 with tempfile.TemporaryDirectory(prefix='hml_v12_syntest_') as temp:
  d=Path(temp);title='She Bought the Forgotten House — A Hidden Truth Changed Everything'
  osh=(d/'outline.txt');osh.write_text('PART 1 ... PART 2 ... PART 3 ... PART 4 ... PART 5 ... PART 6 ... PART 7 ...\nCANON TEST ONLY\n',encoding='utf-8')
  badoutline=d/'other.txt';badoutline.write_text(osh.read_text()+'CHANGED CANON',encoding='utf-8')
  token=sh(title.encode('utf-8'))[:12]
  full=d/f'HML_{token}_FULL_SCRIPT.txt'
  strings=[];anchor='The blue lantern waited at the door.'
  for i in range(1,8):
   intro=('PROTECTED S01 SENTENCE ' if i==1 else '')+(anchor+' ' if i==3 else '')
   strings.append(f'[PART {i}]\n'+intro+('The old door opened slowly. '*380)+'\n')
  total=sum(len(x.split('\n',1)[1]) for x in strings)
  assert 70000<=total<=80000,total
  for stage,ixs in [('A',(0,1)),('B',(2,3,4)),('C',(5,6))]:
   file=d/f'HML_{token}_SCRIPT_{stage}.txt';file.write_text(''.join(strings[x] for x in ixs),encoding='utf-8')
   cmd(W/'segment_workflow.py','stage','--title',title,'--outline-file',osh,'--segment',stage,'--file',file,'--directory',d)
   if stage=='A':
    cmd(W/'segment_workflow.py','inspect','--title',title,'--outline-file',badoutline,'--directory',d,ok=False)
  inspect=cmd(W/'segment_workflow.py','inspect','--title',title,'--outline-file',osh,'--directory',d)
  assert inspect['full_script_ready'] is False
  cmd(W/'segment_workflow.py','assemble','--title',title,'--outline-file',badoutline,'--directory',d,ok=False)
  verification=cmd(W/'segment_workflow.py','assemble','--title',title,'--outline-file',osh,'--directory',d)
  assert verification['pass'] and verification['script_body_chars']==total
  cmd(W/'verify_full_script.py',full)
  assert full.read_bytes()==''.join(strings).encode('utf-8')
  checkpoint=d/'checkpoint.json';cmd(Q/'qa_checkpoint.py','init',full,'--title',title,'--outline-file',osh,'--out',checkpoint)
  cmd(Q/'qa_checkpoint.py','inspect',checkpoint,ok=False)
  qa=d/'qa_frozen.json';fake_frozen(qa,title,full,verification,anchor,osh)
  a=full.read_bytes();start=a.index(anchor.encode('utf-8'));end=start+len(anchor.encode('utf-8'))
  zone=d/'zones.json';jsfile(zone,{'zones':[{'zone_id':'Z001','patch_ids':['P01'],'start_byte':start,'end_byte':end}]})
  contract=d/'contract.json'
  cmd(Q/'freeze_repair_contract.py','--baseline',full,'--frozen',qa,'--zones',zone,'--outline-file',badoutline,'--out',contract,ok=False)
  cmd(Q/'freeze_repair_contract.py','--baseline',full,'--frozen',qa,'--zones',zone,'--outline-file',osh,'--out',contract)
  wrongzone=d/'wrongzones.json';jsfile(wrongzone,{'zones':[{'zone_id':'Z001','patch_ids':['P01'],'start_byte':start+1,'end_byte':end-1}]})
  cmd(Q/'freeze_repair_contract.py','--baseline',full,'--frozen',qa,'--zones',wrongzone,'--outline-file',osh,'--out',d/'badcontract.json',ok=False)
  badqa=d/'badqa.json';bad= json.loads(qa.read_text());bad['frozen_source']['file_sha256']='f'*64;jsfile(badqa,bad)
  cmd(Q/'freeze_repair_contract.py','--baseline',full,'--frozen',badqa,'--zones',zone,'--outline-file',osh,'--out',d/'badcontract.json',ok=False)
  repl=d/'replacements.json';updated='The blue lantern had been moved into the barn.'
  jsfile(repl,{'schema':'HOMELESS_REPAIR_REPLACEMENTS_V12','replacements':[{'zone_id':'Z001','text':updated}]})
  revised=d/'revised.txt';proof=d/'proof.json'
  opt=['--baseline',full,'--frozen',qa,'--contract',contract,'--outline-file',osh,'--replacements',repl,'--out',revised,'--proof',proof]
  cmd(W/'apply_authorized_patches.py',*opt,ok=False)
  cmd(W/'apply_authorized_patches.py',*opt,'--user-approved')
  assert revised.read_bytes()==a[:start]+updated.encode('utf-8')+a[end:]
  assert json.loads(proof.read_text())['untouched_spans_byte_exact']
  cmd(W/'apply_authorized_patches.py',*opt[:opt.index('--outline-file')], '--outline-file',badoutline,*opt[opt.index('--replacements'):],'--user-approved',ok=False)
  # Oversized replacement rejected, never creates asserted 'ready' file.
  too_big=d/'toolarge.json';jsfile(too_big,{'schema':'HOMELESS_REPAIR_REPLACEMENTS_V12','replacements':[{'zone_id':'Z001','text':'x'*20000}]})
  opts=[('--replacements',too_big) if i=='--replacements' else i for i in []]
  opts=opt.copy();opts[opts.index('--replacements')+1]=too_big;opts[opts.index('--out')+1]=d/'should_not_exist.txt';opts[opts.index('--proof')+1]=d/'should_not_exist.json'
  cmd(W/'apply_authorized_patches.py',*opts,'--user-approved',ok=False)
  assert not (d/'should_not_exist.txt').exists()
  cmd(S/'verify_seo_ready.py','--script',revised,'--qa-frozen',qa,'--title',title,'--outline-file',osh,ok=False)
  ready=d/'ready.json';revinfo=cmd(W/'verify_full_script.py',revised);fake_frozen(ready,title,revised,revinfo,anchor,osh,status='READY')
  seo=cmd(S/'verify_seo_ready.py','--script',revised,'--qa-frozen',ready,'--title',title,'--outline-file',osh)
  assert seo['pass'] and seo['publication_readiness']=='READY'
  cmd(S/'verify_seo_ready.py','--script',full,'--qa-frozen',ready,'--title',title,'--outline-file',osh,ok=False)
  return {'passed':True,'cases':N,'fixture_type':'synthetic structural source, NOT a completed literary QA',
         'body_chars':total,'draft_manifest':'v2 title+outline bound','qa_checkpoint_unfilled_rejected':True,
         'qa_scoped_windows':'verified','immutable_spans':'byte-identical',
         'QA_readiness':'synthetic format validated only, NOT editorial score/approval'}
if __name__=='__main__':
 try:
  print(json.dumps(tests(),ensure_ascii=False,indent=2))
 except Exception as e:
  print('TEST FAILED',repr(e),file=sys.stderr);raise
