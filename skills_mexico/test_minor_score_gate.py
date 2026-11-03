#!/usr/bin/env python3
"""Synthetic test of >=98 editorial bookkeeping only. Not story QA."""
import sys,json,hashlib,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent
Q=ROOT/'04_AUDITOR_MEXICO/scripts/qa_checkpoint.py'

def call(*args,expected=0):
 r=subprocess.run([sys.executable,str(Q),*map(str,args)],capture_output=True,text=True)
 if r.returncode!=expected:raise AssertionError(f'Expected {expected}, got {r.returncode}\n{r.stdout}\n{r.stderr}')
 return json.loads(r.stdout)
with tempfile.TemporaryDirectory() as tmp:
 d=Path(tmp)
 title='Mi nuera quiso quedarse con mi casa, pero nunca leyó la escritura'
 outline=d/'OUTLINE.txt';outline.write_text('Cánones y partes originales, prueba técnica de sintaxis solamente.\n',encoding='utf8')
 sections=[]
 for n in range(1,8):
  piece=f'ENGLISH PLACEHOLDER FICTITIOUS NON-LITERARY TEST {n}. '
  sections.append(f'[PART {n}]\n'+piece*205+'\n')
 full=d/'SCRIPT.txt';full.write_text(''.join(sections),encoding='utf8')
 from importlib.util import spec_from_file_location,module_from_spec
 spec=spec_from_file_location('audit',Q);mod=module_from_spec(spec);spec.loader.exec_module(mod)
 count=mod.source_snapshot(full)[0]['body_chars']
 assert 70000<=count<=80000,count
 cp=d/'QA.json';call('init',full,'--title',title,'--outline-file',outline,'--out',cp)
 x=json.loads(cp.read_text(encoding='utf8'))
 for v in x['stages'].values():v.update(done=True,evidence='SYNTHETIC: source structural regression test, no actual story read')
 for part in x['coverage'].values():
  for v in part.values():v.update(status='PASS',evidence='SYNTHETIC evidence cell; not an actual editorial assessment',patch_ids=[])
 for v in x['hard_gates'].values():v.update(status='PASS',evidence='SYNTHETIC: hard-gate bookkeeping only')
 x['saturation_passes']=[{'complete':True,'body_sha256':x['source']['body_sha256'],'new_defect_ids':[],'evidence':'SYNTHETIC zero-new cycle'}]
 x['rubric']={name:score for name,score in mod.RUBRIC}
 cat=mod.RUBRIC[-1][0]
 x['rubric'][cat]-=2
 anchor='ENGLISH PLACEHOLDER FICTITIOUS NON-LITERARY TEST 1.'
 x['minor_observations']=[{'part':'Part 1','anchor':anchor,'observation':'Synthetic punctuation issue','evidence':'Not an actual manuscript judgment','rubric_category':cat,'deduction':2}]
 cp.write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf8')
 f=d/'FROZEN.json';v=call('freeze',cp,'--out',f)
 assert v['score']==98 and v['publication_readiness']=='READY',v
 # 97 with no actionable defects must not be READY, remaining 3 residuals invalid by design.
 x['minor_observations'][0]['deduction']=3
 x['rubric'][cat]-=1
 cp.write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf8')
 r=call('inspect',cp,expected=2)
 assert any('Residual minor deduction exceeds' in e or 'invalid deduction' in e for e in r['blockers'])
 print(json.dumps({'synthetic_gate_pass':True,'ready_score_98':True,'invalid_minor_3_rejected':True,'body_chars':count,'editorial_QA_performed':False},ensure_ascii=False,indent=2))
