#!/usr/bin/env python3
"""MEXICO_FAMILY QA V12 evidence tool (frozen-schema backward compatibility 1.8.1): provenance and completeness gate.

Does NOT perform a literary/forensic audit, create findings, assign PASS, or invent score.
The reviewer must actually inspect manuscript and supply evidence in checkpoint JSON.

  python scripts/qa_checkpoint.py init FULL_SCRIPT.txt --out QA_CHECKPOINT.json --title '...'
  python scripts/qa_checkpoint.py inspect QA_CHECKPOINT.json
  python scripts/qa_checkpoint.py freeze QA_CHECKPOINT.json --out QA_FROZEN.json
"""
import argparse, hashlib, json, re, sys
from pathlib import Path

DIMS = [
 'Title/Hook','Timeline','Age','Money','Knowledge','Location/Access','Object/Inventory',
 'Naming','Exact Numbers','Clue Setup/Payoff','Open Loops','Causality',
 'Why-not-earlier','Legal/Authority','Historical/Period','Physical/Mechanical',
 'Professional Behavior','Human Incentives','Retention','Prose/TTS',
 'Ortografía/español MX','Platform','Ending','Length'
]
STAGES = ['Read #1 whole story','Read #2 line-by-line','Read #3 reverse dependencies',
          'Exact number and state sweeps','Omission sweep','Hook/retention sweep',
          'Legal/physical/professional sweep','Spelling/platform/ending sweep',
          'Repair simulation','Strong-span identification']
RUBRIC = [
 ('Title Fulfillment + Hook',10),('Causality / Discovery / Why-now',15),
 ('Timeline / Money / State / Knowledge',15),
 ('Legal / Historical / Authority / Professional',10),('Physical / Mechanical',10),
 ('Mystery / Clue / Reveal',10),('Retention / Pressure / Pacing',10),
 ('Character Agency / Competence / Human Behavior',8),
 ('Prosa humana / diálogo / MX45+ / TTS / plataforma',7),
 ('Emotional Payoff / Ending-by-Action',5),
]
GATES = ['title_and_hook','causality','timeline_money_knowledge','legal_authority',
         'physical_mechanical','clues_and_payoffs','retention','platform','ending','spelling']
H = re.compile(r'^\[PART ([1-7])\]$')
def sha(b): return hashlib.sha256(b).hexdigest()
def dump(path, x):
    p=Path(path); p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def load(path): return json.loads(Path(path).read_text(encoding='utf-8'))

def source_snapshot(path):
    path=Path(path).resolve(); raw=path.read_bytes(); txt=raw.decode('utf-8','strict')
    errors=[]
    if raw.startswith(b'\xef\xbb\xbf'): errors.append('UTF-8 BOM is not allowed')
    if '\r' in txt: errors.append('Only LF line endings are supported')
    nums=[]; body=[]; parts={}; part=None
    for line in txt.splitlines(keepends=True):
        m=H.fullmatch(line.rstrip('\r\n'))
        if m:
            n=int(m.group(1)); nums.append(n); part=n; parts.setdefault(f'Part {n}', '')
        else:
            if part is None and line.strip(): errors.append('Non-heading prose before Part 1')
            body.append(line)
            if part is not None: parts[f'Part {part}']+=line
    if nums!=list(range(1,8)): errors.append(f'Part heading sequence invalid: {nums}')
    if any(len(parts.get(f'Part {i}',''))<200 for i in range(1,8)): errors.append('One or more Parts too short/missing')
    b=''.join(body)
    return {'path':str(path),'file_bytes':len(raw),'file_sha256':sha(raw),
        'body_sha256':sha(b.encode('utf-8')),'body_chars':len(b),'body_words':len(b.split()),
        'part_chars':{k:len(v) for k,v in parts.items()},'headings':nums,
        'count_rule':'Remove only standalone [PART N] heading lines including their newline',
        'length_gate':'PASS' if 70000<=len(b)<=80000 else 'FAIL',
        'structural_errors':errors},txt

def initialize(ns):
    snap,_=source_snapshot(ns.manuscript)
    outline_path=Path(ns.outline_file).resolve()
    outline_raw=outline_path.read_bytes()
    outline_raw.decode('utf-8','strict')
    outline_sha=sha(outline_raw)
    video_id=sha((ns.title+'\n'+outline_sha).encode('utf-8'))[:16]
    cp={
        'schema':'MEXICO_FAMILY_QA_CHECKPOINT_v1.8.1',
        'title':ns.title or '',
        'video_id':video_id,
        'outline_source':{'path':str(outline_path),'file_sha256':outline_sha},
        'source':snap,
        'stages':{s:{'done':False,'evidence':''} for s in STAGES},
        'coverage':{f'Part {n}':{d:{'status':'PENDING','evidence':'','patch_ids':[]} for d in DIMS} for n in range(1,8)},
        'strong_spans':[],
        'defects':[],
        'saturation_passes':[],
        'rubric':{name:None for name,_ in RUBRIC},
        'minor_observations':[],
        'hard_gates':{name:{'status':'PENDING','evidence':''} for name in GATES},
        'notes':'Fill based on genuine review. Never mark PASS without reading that source span.',
    }
    dump(ns.out,cp)
    print(json.dumps({'checkpoint':str(Path(ns.out).resolve()),'source':snap,'pending_cells':7*len(DIMS)},ensure_ascii=False,indent=2))

def validate(cp):
    errors=[]; source=cp.get('source',{}); title=cp.get('title','')
    if cp.get('schema')!='MEXICO_FAMILY_QA_CHECKPOINT_v1.8.1': errors.append('Schema mismatch')
    try: current, manuscript=source_snapshot(source['path'])
    except (OSError, UnicodeError,KeyError) as e:
        return ['Source missing/unreadable: '+str(e)],{},'',None
    for k in ('file_sha256','body_sha256','body_chars','body_words','part_chars','headings','count_rule'):
        if source.get(k)!=current[k]: errors.append('SOURCE CHANGED: '+k)
    errors.extend(current['structural_errors'])
    if not title.strip(): errors.append('Locked title missing')
    osrc=cp.get('outline_source',{})
    try:
        obytes=Path(osrc['path']).read_bytes()
        obytes.decode('utf-8','strict')
        osh=sha(obytes)
        if osrc.get('file_sha256')!=osh:errors.append('OUTLINE SOURCE SHA CHANGED')
        if cp.get('video_id')!=sha((title+'\n'+osh).encode('utf-8'))[:16]:errors.append('VIDEO ID / outline identity mismatch')
    except (KeyError,OSError,UnicodeError) as ex:errors.append('Outline file missing/unreadable: '+str(ex))
    part_text={}
    for n in range(1,8):
        m=re.search(r'^\[PART '+str(n)+r'\]\n(.*?)(?=^\[PART \d\]|\Z)',manuscript,re.M|re.S)
        part_text[f'Part {n}']=m.group(1) if m else ''
    for stage in STAGES:
        v=cp.get('stages',{}).get(stage,{})
        if v.get('done') is not True or not str(v.get('evidence','')).strip(): errors.append('PENDING STAGE: '+stage)
    findings=cp.get('defects',[]); ids=[]
    rubrics=dict(RUBRIC)
    for f in findings:
        pid=f.get('id',''); ids.append(pid)
        if not re.fullmatch(r'P\d{2,}',pid): errors.append('Invalid patch id: '+str(pid))
        if f.get('severity') not in ('P0','P1','P2','P3'): errors.append(pid+': invalid severity')
        p=f.get('part')
        if p not in part_text: errors.append(pid+': invalid part')
        for key in ('problem','repair','zone','length_intent'):
            if not str(f.get(key,'')).strip(): errors.append(pid+': missing '+key)
        if f.get('length_intent') not in ('KEEP','ADD','CUT','REDISTRIBUTE'):
            errors.append(pid+': invalid length intent')
        if f.get('rubric_category') not in rubrics: errors.append(pid+': unknown rubric category')
        if not isinstance(f.get('deduction'),(int,float)) or not 0<=f['deduction']<=100: errors.append(pid+': invalid deduction')
        anc=f.get('anchor','')
        if not anc or p not in part_text or anc not in part_text[p]:errors.append(pid+': exact anchor not found within Part')
        # V12 detailed diagnostic gate (source-tied fields, not automatically generated).
        for key in ('root_cause','viewer_impact','classification','owning_step'):
            if not str(f.get(key,'')).strip(): errors.append(pid+': missing V12 diagnostic '+key)
        tests=f.get('acceptance_tests')
        if not isinstance(tests,list) or not tests or any(not isinstance(x,str) or not x.strip() for x in tests):
            errors.append(pid+': missing objective acceptance_tests')
        if f.get('classification') not in ('CANON','LOGIC','TIMELINE','MONEY','KNOWLEDGE','ACCESS','LEGAL','HISTORY','PHYSICS','CLUE','RETENTION','VOICE','ENDING','LENGTH','OTHER'):
            errors.append(pid+': invalid V12 classification')
        if f.get('owning_step') not in ('Title','Outline','Writer','QA','SEO','INDETERMINATE'):
            errors.append(pid+': invalid owning_step')
        for key in ('dependencies','occurrences'):
            if not isinstance(f.get(key),list): errors.append(pid+': missing '+key+' list')
        for occ in f.get('occurrences',[]):
            if not isinstance(occ,dict) or not occ.get('anchor') or not occ.get('action') or occ['anchor'] not in part_text.get(p,''):
                errors.append(pid+': occurrence lacking exact same-Part quote/action')
    if len(set(ids))!=len(ids): errors.append('Duplicate Patch ID')
    # Non-actionable residual polish issues can explain <=2 rubric points without
    # authorizing patches. Distinguish them from actionable Pxx defects.
    minors=cp.get('minor_observations',[])
    if not isinstance(minors,list):
        errors.append('minor_observations must be list'); minors=[]
    for i,o in enumerate(minors):
        if o.get('rubric_category') not in rubrics:errors.append(f'minor[{i}]: unknown rubric category')
        if o.get('part') not in part_text:errors.append(f'minor[{i}]: invalid part')
        if not isinstance(o.get('deduction'),(int,float)) or not 0<o.get('deduction',0)<=2:
            errors.append(f'minor[{i}]: invalid deduction 0..2')
        if not str(o.get('observation','')).strip() or not str(o.get('evidence','')).strip():
            errors.append(f'minor[{i}]: missing observation/evidence')
        if not o.get('anchor') or o.get('anchor') not in part_text.get(o.get('part'),''):
            errors.append(f'minor[{i}]: source anchor missing')
    if sum(o.get('deduction',0) for o in minors if isinstance(o.get('deduction'),(int,float)))>2.0001:
        errors.append('Residual minor deduction exceeds 2; issue Pxx patches instead')
    idset=set(ids)
    counts={'PASS':0,'PATCH':0,'PENDING':0}
    for pn in part_text:
        for dim in DIMS:
            cell=cp.get('coverage',{}).get(pn,{}).get(dim,{})
            st=cell.get('status','PENDING')
            counts[st]=counts.get(st,0)+1
            if st not in ('PASS','PATCH'): errors.append(f'Coverage missing: {pn}/{dim}')
            if not str(cell.get('evidence','')).strip():errors.append(f'Coverage evidence missing: {pn}/{dim}')
            if st=='PATCH':
                if not cell.get('patch_ids') or any(pid not in idset for pid in cell['patch_ids']):
                    errors.append(f'Coverage PATCH without valid Pxx: {pn}/{dim}')
    for strong in cp.get('strong_spans',[]):
        p=strong.get('part'); anchor=strong.get('anchor','')
        if p not in part_text or not anchor or anchor not in part_text[p]: errors.append('Strong-span anchor missing: '+str(strong))
    sat=cp.get('saturation_passes',[])
    if not sat: errors.append('Saturation pass not recorded')
    else:
        for index,run in enumerate(sat):
            if run.get('complete') is not True or run.get('body_sha256')!=current['body_sha256'] or not str(run.get('evidence','')).strip():
                errors.append(f'Saturation cycle {index+1} incomplete/unbound/no evidence')
            new=run.get('new_defect_ids')
            if not isinstance(new,list) or any(pid not in idset for pid in new): errors.append(f'Saturation cycle {index+1} unknown findings')
        if sat[-1].get('new_defect_ids')!=[]: errors.append('Final full saturation pass did not find zero new defects')
        if len(sat)>1 and any(r.get('new_defect_ids') for r in sat[:-1]) and sat[-1].get('complete') is not True:
            errors.append('New findings require subsequent complete zero-new-defect sweep')
    for gate in GATES:
        g=cp.get('hard_gates',{}).get(gate,{})
        if g.get('status') not in ('PASS','FAIL') or not str(g.get('evidence','')).strip(): errors.append('Hard gate not evidenced: '+gate)
        if g.get('status')=='FAIL' and not findings: errors.append('Hard gate FAIL without actionable defect: '+gate)
    vals=cp.get('rubric',{}); earned={}
    for name,mx in RUBRIC:
        val=vals.get(name)
        if not isinstance(val,(int,float)) or val<0 or val>mx: errors.append('Rubric missing/out of bounds: '+name)
        else: earned[name]=val
    score=sum(earned.values()) if len(earned)==len(RUBRIC) else None
    if score is not None:
        total_deductions=sum(f.get('deduction',0) for f in findings if isinstance(f.get('deduction'),(int,float))) + sum(o.get('deduction',0) for o in minors if isinstance(o.get('deduction'),(int,float)))
        if abs((100-score)-total_deductions)>0.001:
            errors.append(f'Rubric/patch deduction mismatch: 100-{score} vs {total_deductions}')
        for cat,mx in RUBRIC:
            d=sum(f.get('deduction',0) for f in findings if f.get('rubric_category')==cat and isinstance(f.get('deduction'),(int,float))) + sum(o.get('deduction',0) for o in minors if o.get('rubric_category')==cat and isinstance(o.get('deduction'),(int,float)))
            if abs((mx-earned[cat])-d)>0.001:errors.append('Category deduction mismatch: '+cat)
    if current['length_gate']=='FAIL':
        intent='ADD' if current['body_chars']<70000 else 'CUT'
        if not any(f.get('severity')=='P0' and f.get('length_intent')==intent for f in findings):
            errors.append('OUT-OF-RANGE BODY requires P0 length normalization patch: '+intent)
    detail={'source':current,'score':score,'coverage_counts':counts,'patch_count':len(findings),'last_saturation_zero_new':bool(sat and sat[-1].get('complete') and sat[-1].get('new_defect_ids')==[])}
    return errors,detail,manuscript,current

def inspect(ns, freeze=False):
    cp=load(ns.checkpoint)
    errors,detail,_,snapshot=validate(cp)
    detail['audit_complete']=not errors
    detail['blockers']=errors[:300]
    detail['additional_blockers_omitted']=max(0,len(errors)-300)
    if freeze:
        if errors:
            print(json.dumps(detail,ensure_ascii=False,indent=2)); return 2
        score=detail['score']
        all_hard=all(x['status']=='PASS' for x in cp['hard_gates'].values())
        no_defects=not cp['defects']
        readiness='READY' if score>=98 and all_hard and snapshot['length_gate']=='PASS' and no_defects else 'NOT READY'
        status={
            'schema':'MEXICO_FAMILY_QA_FROZEN_V1.8.1','frozen_source':snapshot,
            'title':cp['title'],'video_id':cp['video_id'], 'outline_sha256':cp['outline_source']['file_sha256'], 'frozen_baseline_score':score,
            'publication_readiness':readiness,'hard_gate_pass':all_hard and snapshot['length_gate']=='PASS',
            'frozen_patch_ledger':cp['defects'],'strong_span_ledger':cp['strong_spans'],
            'minor_observations':cp.get('minor_observations',[]),
            'coverage_counts':detail['coverage_counts'],'saturation_passes':cp['saturation_passes'],
            'score_deduction_ledger':{name:mx-cp['rubric'][name] for name,mx in RUBRIC},
            'rubric':cp['rubric'],'count_proof_record':snapshot,
        }
        raw=json.dumps(status,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode('utf-8')
        status['manifest_sha256']=sha(raw)
        dump(ns.out,status)
        detail['frozen_file']=str(Path(ns.out).resolve())
        detail['manifest_sha256']=status['manifest_sha256']
        detail['publication_readiness']=readiness
    print(json.dumps(detail,ensure_ascii=False,indent=2))
    return 0 if not errors else 2

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    sub=ap.add_subparsers(dest='cmd',required=True)
    s=sub.add_parser('init'); s.add_argument('manuscript'); s.add_argument('--title',required=True);s.add_argument('--outline-file',required=True);s.add_argument('--out',required=True)
    s=sub.add_parser('inspect');s.add_argument('checkpoint')
    s=sub.add_parser('freeze');s.add_argument('checkpoint');s.add_argument('--out',required=True)
    ns=ap.parse_args()
    if ns.cmd=='init':initialize(ns);return 0
    return inspect(ns,ns.cmd=='freeze')
if __name__=='__main__':
    try:sys.exit(main())
    except (ValueError,KeyError,TypeError,OSError,UnicodeError) as e:
        print(json.dumps({'error':str(e),'audit_complete':False},ensure_ascii=False),file=sys.stderr)
        sys.exit(2)
