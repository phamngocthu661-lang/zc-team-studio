#!/usr/bin/env python3
"""Structural title scoring audit: not a CTR or artistic quality predictor."""
import json, argparse, sys, unicodedata
from pathlib import Path
CLICK={'injustice':20,'stakes':15,'contrast':15,'reversal':20,'open_loop':15,'clarity':10,'language':5}
STORY={'promise':25,'causality':20,'evidence':15,'agency':15,'escalation':15,'mx_plausibility':10}
REFS={'E01','E02','S01','S02'}

def validate(packet):
    errors=[]; results=[]; seen=set()
    if not isinstance(packet,dict):
        return {'passed':False,'errors':['Top-level JSON object required'],'candidates':[]}
    cc=packet.get('candidates')
    if not isinstance(cc,list) or len(cc)!=5:
        return {'passed':False,'errors':['Exactly 5 candidates required'],'candidates':[]}
    for n,c in enumerate(cc,1):
        p=f'candidate[{n}]'
        if not isinstance(c,dict):
            errors.append(f'{p}: not object');continue
        title=c.get('title')
        if not isinstance(title,str) or not title.strip():
            errors.append(f'{p}: missing title');continue
        chars=len(title)
        if chars>100: errors.append(f'{p}: title too long: {chars}/100')
        norm=unicodedata.normalize('NFC',title).casefold().strip()
        if norm in seen: errors.append(f'{p}: duplicate title')
        seen.add(norm)
        totals={}
        for name,scale in [('click',CLICK),('story',STORY)]:
            row=c.get(name)
            if not isinstance(row,dict) or set(row)!=set(scale):
                errors.append(f'{p}: {name} must contain exact keys {list(scale)}');totals[name]=-1;continue
            total=0
            for key,cap in scale.items():
                v=row[key]
                if type(v)!=int or not 0<=v<=cap:errors.append(f'{p}: {name}.{key} out of range')
                else:total+=v
            totals[name]=total
        ledger=c.get('deduction_ledger')
        if not isinstance(ledger,dict) or set(ledger)!={'click','story'}:
            errors.append(f'{p}: deduction_ledger missing click/story maps')
        else:
            for scale_name,maxima in [('click',CLICK),('story',STORY)]:
                reported=ledger.get(scale_name)
                scored=c.get(scale_name)
                if not isinstance(reported,dict) or set(reported)!=set(maxima) or not isinstance(scored,dict):
                    errors.append(f'{p}: incomplete deduction_ledger.{scale_name}');continue
                for k,maximum in maxima.items():
                    awarded=scored.get(k)
                    if type(reported[k]) is not int or type(awarded) is not int or reported[k]!=maximum-awarded:
                        errors.append(f'{p}: deduction_ledger.{scale_name}.{k} must equal {maximum} minus score')
        click=totals['click'];story=totals['story']
        if click==100 and story==100:errors.append(f'{p}: perfect unqualified 200/200 scores are not calibrated')
        comp=round(.75*click+.25*story) if min(click,story)>=0 else -1
        if c.get('composite')!=comp:errors.append(f'{p}: composite must be {comp}')
        guards=c.get('guards')
        if not isinstance(guards,dict) or set(guards)!={'originality','legal_mx','deliverability'} or any(type(v)!=bool for v in guards.values()):
            errors.append(f'{p}: invalid hard guards');guards={}
        benchmark=c.get('benchmark_verdict')
        if benchmark not in {'STRONG','PARITY','WEAKER','DATA_LIMITED'}:errors.append(f'{p}: invalid benchmark verdict')
        refs=c.get('benchmarks')
        if not isinstance(refs,list) or len(refs)<3:errors.append(f'{p}: minimum 3 comparisons')
        else:
            ids=[]
            for j,r in enumerate(refs,1):
                if not isinstance(r,dict):errors.append(f'{p}: comparison {j} must be object');continue
                rid=r.get('id');ids.append(rid)
                if rid not in REFS:errors.append(f'{p}: comparison {j} unknown source ID')
                if r.get('match') not in ('SAME','ADJACENT'):errors.append(f'{p}: invalid match label')
                if not isinstance(r.get('reason'),str) or len(r['reason'].strip())<25:errors.append(f'{p}: comparison reason too generic')
            if len(set(ids))!=len(ids):errors.append(f'{p}: duplicate comparison ID')
        d=c.get('deductions')
        if not isinstance(d,list) or not d or any(not isinstance(s,str) or len(s.strip())<15 for s in d):
            errors.append(f'{p}: explain scoring deductions concretely')
        payoff=c.get('story_payoff')
        if not isinstance(payoff,str) or len(payoff.strip())<40:errors.append(f'{p}: credible story payoff explanation missing')
        valid_click=c.get('click') if isinstance(c.get('click'),dict) else {}
        eligible=(chars<=100 and click>=85 and story>=80 and bool(guards) and all(guards.values())
                  and valid_click.get('reversal',-1)>=13 and valid_click.get('open_loop',-1)>=10
                  and benchmark in ('STRONG','PARITY'))
        results.append({'index':n,'title':title,'characters':chars,'click':click,'story':story,
                        'composite':comp,'benchmark':benchmark,'eligible':eligible})
    winner=packet.get('suggested_winner')
    if winner is None:
        if any(r['eligible'] for r in results) and not packet.get('allow_no_winner_reason'):
            errors.append('Eligible candidates exist; include allow_no_winner_reason if suggesting NONE')
    elif type(winner)!=int or winner<1 or winner>5:
        errors.append('suggested_winner must be 1..5 or null')
    elif len(results)!=5 or not results[winner-1]['eligible']:
        errors.append('suggested_winner not eligible')
    return {'passed':not errors,'errors':errors,'candidates':results,'suggested_winner':winner,
            'note':'Syntax/arithmetic only; cannot validate click performance, semantics or originality'}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('packet',type=Path);ap.add_argument('--output',type=Path)
    a=ap.parse_args();res=validate(json.loads(a.packet.read_text('utf-8')))
    result=json.dumps(res,ensure_ascii=False,indent=2)
    print(result)
    if a.output:a.output.write_text(result+'\n','utf-8')
    return 0 if res['passed'] else 1
if __name__=='__main__':sys.exit(main())
