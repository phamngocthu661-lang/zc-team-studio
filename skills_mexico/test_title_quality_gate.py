#!/usr/bin/env python3
"""Synthetic regression tests: only structure/eligibility; NO creative quality claim."""
from __future__ import annotations
import importlib.util
from pathlib import Path
from copy import deepcopy

here=Path(__file__).resolve().parent
path=here/'01_TITULOS_MEXICO/scripts/title_quality_gate.py'
spec=importlib.util.spec_from_file_location('title_quality_gate',path)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)

def make(title, weak=False):
    click={'injustice':19,'stakes':14,'contrast':13,'reversal':8 if weak else 18,
           'open_loop':5 if weak else 13,'clarity':9,'language':5}
    story={'promise':23,'causality':18,'evidence':13,'agency':14,'escalation':13,'mx_plausibility':9}
    return {
        'title':title, 'dna':'B', 'click':click,'story':story,
        'deduction_ledger':{'click':{k:mod.CLICK[k]-v for k,v in click.items()},
                            'story':{k:mod.STORY[k]-v for k,v in story.items()}},
        'composite':round(.75*sum(click.values())+.25*sum(story.values())),
        'guards':{'originality':True,'legal_mx':True,'deliverability':True},
        'benchmark_verdict':'PARITY',
        'benchmarks':[
            {'id':'E01','match':'ADJACENT','reason':'Family betrayal and comparison with another elder is explicit'},
            {'id':'E02','match':'SAME','reason':'Personal residence becomes a battleground and agency changes'},
            {'id':'S01','match':'ADJACENT','reason':'Humiliation and a fair reversal create an open question'}],
        'deductions':['Injustice minus one because object detail is compressed for small screens'],
        'story_payoff':'A lawful owner makes a costly decision witnessed by her family, causing durable conflict before a nuanced reconciliation.'
    }

titles=[
    'Mi hija dijo que mi casa ya no era mía… y le pedí que mostrara la escritura',
    'Mi nuera ocupó mi recámara sin preguntar… y cancelé el trato que la respaldaba',
    'Mis hijos contaron mi herencia antes de tiempo… les mostré el contrato pendiente',
    'Mi hijo pagó la fiesta de su suegra con mi pensión… y dejé de cubrir su renta',
    'Mi consuegra eligió mis muebles sin permiso… y pedí que retiraran las cajas'
]
packet={'candidates':[make(t) for t in titles], 'suggested_winner':1}

def check(name,p,should):
    r=mod.validate(p)
    assert r['passed'] is should,(name,r['errors'])
    return {'name':name,'pass':r['passed']==should,'errors':r['errors'][:2]}

results=[]
results.append(check('valid calibrated five',deepcopy(packet),True))
p=deepcopy(packet);p['candidates'][0]=make(titles[0],weak=True)
results.append(check('weak evidence-only cannot win',p,False))
p=deepcopy(packet);p['candidates'][0]['title']='La casa '+('muy '*30)
results.append(check('overlong must reject',p,False))
p=deepcopy(packet);p['candidates'][1]['composite']=100
results.append(check('fake composite rejected',p,False))
p=deepcopy(packet);p['candidates'][1]['benchmarks']=p['candidates'][1]['benchmarks'][:1]
results.append(check('missing comparisons rejected',p,False))
p=deepcopy(packet);p['candidates'][1]['title']=p['candidates'][0]['title']
results.append(check('duplicate title rejected',p,False))
p=deepcopy(packet);p['candidates'][0]['guards']['legal_mx']=False
results.append(check('hard guard blocks winner',p,False))
p=deepcopy(packet);p['candidates'][0]['benchmark_verdict']='WEAKER'
results.append(check('weaker benchmark cannot win',p,False))
p=deepcopy(packet);p['suggested_winner']=None;p['allow_no_winner_reason']='Editorial review found parity comparisons too fragile.'
results.append(check('no-winner with editorial explanation allowed',p,True))
p=deepcopy(packet);p['suggested_winner']=None
results.append(check('unjustified no-winner rejected',p,False))
p=deepcopy(packet);p['candidates'][0]['click']=['invalid', 'schema']
results.append(check('malformed click payload rejected gracefully',p,False))
p=deepcopy(packet);p['candidates'][0]['story']['causality']='maximum'
results.append(check('malformed number rejected gracefully',p,False))

import json
print(json.dumps({'passed':True,'cases':len(results),'tests':results,
                  'disclaimer':'Synthetic scoring/structure only; no literary or empirical CTR validation'},
                 ensure_ascii=False,indent=2))
