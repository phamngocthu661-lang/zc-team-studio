#!/usr/bin/env python3
"""Structural preflight for WRV outline V1.1. Does not assess legal merits or creative quality.

CLI: python story_preflight_v11.py STORY_PREFLIGHT_V11.json [--report PREFLIGHT_REPORT.json]
Return 0=PASS, 2=REPLAN. Input schema is additive to legacy canonical outline.
"""
import argparse, json, re, sys
from pathlib import Path
from datetime import date

NEEDED=('trigger','decision','state_before','state_after','new_fact','cost','next_question')
def meaningful(v, min_chars=9):
    if not isinstance(v,str) or len(v.strip())<min_chars:return False
    return not bool(re.search(r'<[^<>]*>|(?:tbd|todo|placeholder|lorem ipsum|fill here)',v,re.I))
def check(obj):
    errors=[];warnings=[]
    if obj.get('schema')!='WRV_STORY_PREFLIGHT_V1_1':errors.append('schema must be WRV_STORY_PREFLIGHT_V1_1')
    if obj.get('primary_dna') not in ('IRON_ROSE','QUIET_TRIUMPH'):errors.append('primary_dna invalid')
    title=obj.get('locked_title','')
    if not meaningful(title,15) or len(title)>100:errors.append('locked_title empty/placeholder/>100 chars')
    for key in ('narrator','state_jurisdiction'):
        if not meaningful(obj.get(key,''),5):errors.append(key+' missing or placeholder')
    pp=obj.get('promise',{})
    if not isinstance(pp,dict):errors.append('promise invalid');pp={}
    for key in ('explicit_claim','payoff_owner','owner_evidence','irreplaceable_role','observed_payoff','remedy_basis'):
        if not meaningful(pp.get(key,''),10):errors.append('promise.'+key+' missing/placeholder')
    setup=pp.get('setup_part');payoff=pp.get('payoff_part')
    if not isinstance(setup,int) or isinstance(setup,bool) or not 1<=setup<=3:errors.append('Promise must be seeded in Part 1–3')
    if not isinstance(payoff,int) or isinstance(payoff,bool) or not 5<=payoff<=7:errors.append('Promise must be fulfilled in Part 5–7')
    # Recognizable named witness promise should map to actual evidence owner (not registrar substitution)
    for phrase in ('teacher','doctor','grandmother','neighbor'):
        if phrase in title.lower() and phrase not in str(pp.get('payoff_owner','')).lower():
            errors.append('Title promises a '+phrase+' but promise.payoff_owner does not name it')
    parts=obj.get('parts')
    if not isinstance(parts,list) or len(parts)!=7:errors.append('parts must contain exactly 7 entries');parts=[]
    scene_ids=set(); all_signatures=set(); counts=[]
    for idx,p in enumerate(parts,1):
        if not isinstance(p,dict):errors.append('Part '+str(idx)+': invalid object');continue
        if p.get('part')!=idx:errors.append('Part order/number mismatch at '+str(idx))
        scenes=p.get('scenes')
        if not isinstance(scenes,list) or len(scenes)<3:
            errors.append('Part '+str(idx)+': fewer than 3 causally distinct scenes');continue
        counts.append(len(scenes))
        for j,sc in enumerate(scenes,1):
            if not isinstance(sc,dict):errors.append('Part '+str(idx)+' scene '+str(j)+': invalid object');continue
            sid=sc.get('scene_id','')
            if not isinstance(sid,str) or not re.fullmatch(r'P[1-7]S\d+',sid) or not sid.startswith(f'P{idx}S') or sid in scene_ids:
                errors.append('Bad or duplicate scene_id: '+str(sid))
            scene_ids.add(sid)
            for k in NEEDED:
                if not meaningful(sc.get(k,'')):errors.append(str(sid)+': missing '+k)
            if sc.get('state_before','').strip().casefold()==sc.get('state_after','').strip().casefold():errors.append(str(sid)+': no state change')
            signature=(str(sc.get('decision','')).strip().casefold(),str(sc.get('new_fact','')).strip().casefold())
            if signature in all_signatures:errors.append(str(sid)+': duplicate decision+fact pair (potential filler)')
            all_signatures.add(signature)
    ag=obj.get('agency_ledger')
    if not isinstance(ag,list) or len(ag)!=7:errors.append('agency_ledger must have one action per Part')
    else:
        ns=[]
        for a in ag:
            if not isinstance(a,dict):errors.append('bad agency ledger item');continue
            ns.append(a.get('part'))
            if not meaningful(a.get('her_action','')) or not meaningful(a.get('direct_consequence','')):errors.append('Part '+str(a.get('part'))+' agency action/consequence missing')
        if ns!=list(range(1,8)):errors.append('agency_ledger incorrect Part sequence')
    fit=obj.get('runtime_fit',{})
    if not isinstance(fit,dict):fit={}
    n=fit.get('target_body_chars')
    if not isinstance(n,int) or isinstance(n,bool) or not 70000<=n<=80000:errors.append('runtime_fit.target_body_chars outside legacy 70–80k range')
    if not meaningful(fit.get('why_unique_plot_supports_length',''),35):errors.append('runtime_fit lacks distinct narrative sustainability rationale')
    reversals=fit.get('unique_major_reversals')
    if not isinstance(reversals,list) or len(set(map(str,reversals)))<2 or any(not meaningful(v) for v in reversals):errors.append('Need >=2 distinct evidence/choice-based reversals')
    law=obj.get('legal_research',{})
    if not isinstance(law,dict):law={}
    if law.get('outcome_determinative') is not True and law.get('outcome_determinative') is not False:
        errors.append('legal_research.outcome_determinative must be boolean')
    claims=law.get('claims',[])
    if not isinstance(claims,list):errors.append('legal_research.claims must be a list');claims=[]
    if law.get('outcome_determinative') is True and len(claims)<1:errors.append('No cited legal research for an outcome-determinative legal remedy')
    for i,c in enumerate(claims):
        if not isinstance(c,dict):errors.append('legal claim invalid');continue
        for key in ('claim','story_application','jurisdiction'):
            if not meaningful(c.get(key,'')):errors.append('legal claim '+str(i)+' missing '+key)
        url=c.get('source_url','')
        if not isinstance(url,str) or not re.match(r'^https?://[^/]+/\S+',url):errors.append('legal claim '+str(i)+' missing specific source_url')
        if c.get('source_type') not in ('primary','secondary'):errors.append('legal claim '+str(i)+' source_type invalid')
        try:
            dd=date.fromisoformat(c.get('verified_on',''))
            if dd>date.today():warnings.append('legal claim '+str(i)+' verification date in future; verify user clock/timezone')
        except (ValueError,TypeError):errors.append('legal claim '+str(i)+' verified_on not YYYY-MM-DD')
    return {'schema':'WRV_STORY_PREFLIGHT_REPORT_V1_1','pass':not errors,'verdict':'PASS_STRUCTURAL_ONLY' if not errors else 'REPLAN_BEFORE_WRITING','errors':errors,'warnings':warnings,'parts_checked':len(parts),'scenes_checked':len(scene_ids),'note':'PASS does not verify truth of URLs, legal correctness, copyright originality, literary quality or actual retention.'}
def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('input',type=Path);p.add_argument('--report',type=Path)
    ns=p.parse_args()
    try:r=check(json.loads(ns.input.read_text(encoding='utf-8')))
    except (ValueError,TypeError,OSError,json.JSONDecodeError) as e:
        r={'schema':'WRV_STORY_PREFLIGHT_REPORT_V1_1','pass':False,'verdict':'REPLAN_BEFORE_WRITING','errors':[str(e)],'warnings':[]}
    if ns.report:
        ns.report.parent.mkdir(parents=True,exist_ok=True)
        ns.report.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(r,ensure_ascii=False,indent=2))
    sys.exit(0 if r.get('pass') else 2)
if __name__=='__main__':main()
