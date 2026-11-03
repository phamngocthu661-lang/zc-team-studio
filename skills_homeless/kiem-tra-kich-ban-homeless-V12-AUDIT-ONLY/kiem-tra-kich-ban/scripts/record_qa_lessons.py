#!/usr/bin/env python3
"""Create an evidence-linked learning-candidate report; never auto-change skill rules.
Only user/editor-approved, QA-verified fixes should be marked VERIFIED manually.
"""
import argparse,hashlib,json,sys
from pathlib import Path

def sha(data):return hashlib.sha256(data).hexdigest()
def main(ns):
 base=ns.baseline_qa.read_bytes();b=json.loads(base);after=ns.postrepair_qa.read_bytes();q=json.loads(after)
 proof=json.loads(ns.repair_proof.read_text('utf-8'))
 if b.get('schema')!='HOMELESS_QA_FROZEN_V1.8.1' or q.get('schema')!='HOMELESS_QA_FROZEN_V1.8.1':raise ValueError('Only frozen official QA may support lessons')
 if proof.get('source_baseline_sha256')!=b.get('frozen_source',{}).get('file_sha256'):raise ValueError('Unrelated baseline')
 if b.get('video_id')!=proof.get('video_id') or q.get('video_id')!=proof.get('video_id'):raise ValueError('Cross-video QA lesson mixing forbidden')
 if proof.get('revised_file_sha256')!=q.get('frozen_source',{}).get('file_sha256'):raise ValueError('Unrelated postrepair QA source')
 findings={x['id']:x for x in b.get('frozen_patch_ledger',[])}
 proposal=[]
 for f in findings.values():
  proposal.append({'lesson_id':'L-'+proof['video_id']+'-'+f['id'],'origin_video_id':proof['video_id'],
    'defect_ids':[f['id']],'root_cause':f.get('root_cause','REVIEW_REQUIRED'),
    'classification':f.get('classification','OTHER'),'evidence_anchor':f['anchor'],
    'preferred_prevention_test':f.get('prevention_candidate','REVIEW_REQUIRED'),
    'owning_step':f.get('owning_step','REVIEW_REQUIRED'), 'confidence':f.get('confidence','UNASSESSED'),
    'status':'PROPOSED','human_approved':False})
 obj={'schema':'HOMELESS_QA_LESSON_CANDIDATES_V12','baseline_qa_sha256':sha(base),
      'postrepair_qa_sha256':sha(after),'repair_proof_sha256':sha(ns.repair_proof.read_bytes()),
      'lessons':proposal,'notes':'Proposals only. No automatic skill mutation or claim of persistent model learning.'}
 ns.out.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 return {'pass':True,'output':str(ns.out),'candidates':len(proposal),'verified_automatically':0}
if __name__=='__main__':
 p=argparse.ArgumentParser()
 for t in ('baseline-qa','postrepair-qa','repair-proof','out'):p.add_argument('--'+t,dest=t.replace('-','_'),type=Path,required=True)
 ns=p.parse_args()
 try:r=main(ns)
 except (KeyError,ValueError,OSError,json.JSONDecodeError) as e:r={'pass':False,'error':str(e)}
 print(json.dumps(r,ensure_ascii=False,indent=2));sys.exit(0 if r['pass'] else 2)
