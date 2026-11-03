#!/usr/bin/env python3
"""V1.2 ADDITIVE title niche structural gate, not a semantic classifier nor CTR prediction."""
from __future__ import annotations
import json, argparse, re, sys, unicodedata
from pathlib import Path

KINSHIP=re.compile(r'\b(?:hijos?|hijas?|nuera|yerno|nieta|nieto|espos[ao]|marido|herman[oa]s?|cuñad[ao]s?|suegr[ao]s?|consuegr[ao]s?|madre|padre|sobrin[ao]s?)\b',re.I)
FIRST_PERSON=re.compile(r'\b(?:me|mi|mis|conmigo|yo|mía|mío|nos)\b',re.I)
MALE_CENTRAL=re.compile(r'\b(?:un millonario|el millonario|hombre millonario|un empresario|niño pobre|niña pobre|zapatos rotos)\b',re.I)
WEAK_TAIL=re.compile(r'\b(?:todos lloraron|se pusieron a llorar|recibieron una llamada|recibí una llamada|descubri[oó] la verdad|todos se quedaron helados|nadie podía creerlo|todo cambió|algo inesperado)\b',re.I)
MANDATORY={'lead_role','lead_age','lead_gender','narrative_pov','family_culprit','culprit_title_span', 'family_betrayal_title_span','reversal_title_span','mother_decision','decision_cost','seven_part_payoff','reversal_lever','lead_agency','family_betrayal','no_outsider_savior','no_magic_reveal','length_contract'}

def norm(s): return unicodedata.normalize('NFC',s).casefold()

def validate(packet):
    errors=[]; result=[]
    if not isinstance(packet,dict) or not isinstance(packet.get('candidates'),list) or len(packet['candidates'])!=5:
        return {'passed':False,'errors':['Exactly five candidates are required'], 'candidates':[]}
    for i,c in enumerate(packet['candidates'],1):
        pre=f'candidate[{i}]'
        if not isinstance(c,dict):errors.append(f'{pre}: candidate is not an object');continue
        title=c.get('title','');locks=c.get('niche_lock')
        if not isinstance(title,str) or not title.strip(): errors.append(f'{pre}: title absent');continue
        if not isinstance(locks,dict):errors.append(f'{pre}: niche_lock absent');continue
        for k in MANDATORY-set(locks): errors.append(f'{pre}: missing niche_lock.{k}')
        if locks.get('lead_role') not in ('madre','abuela'):errors.append(f'{pre}: lead must be an older mother/grandmother')
        if type(locks.get('lead_age'))!=int or not 58<=locks['lead_age']<=95:errors.append(f'{pre}: lead_age outside default 58..95 (explicit user exception requires separate project gate)')
        if locks.get('lead_gender')!='mujer':errors.append(f'{pre}: central narrator must be mujer')
        if locks.get('narrative_pov')!='primera_persona':errors.append(f'{pre}: first-person POV required')
        if locks.get('length_contract')!='70k-80k-7part':errors.append(f'{pre}: wrong full-script length/part contract')
        if not FIRST_PERSON.search(norm(title)):errors.append(f'{pre}: no visible first-person marker')
        if MALE_CENTRAL.search(norm(title)):errors.append(f'{pre}: male/child poverty-savior headline drift')
        for k in ('lead_agency','family_betrayal','no_outsider_savior','no_magic_reveal'):
            if locks.get(k) is not True:errors.append(f'{pre}: niche_lock.{k} must be true')
        for k in ('culprit_title_span','family_betrayal_title_span','reversal_title_span'):
            t=locks.get(k)
            if not isinstance(t,str) or len(t.strip())<5 or norm(t.strip()) not in norm(title):
                errors.append(f'{pre}: {k} must be a visible, specific continuous title span')
        offender=locks.get('culprit_title_span','')
        if not isinstance(offender,str) or not KINSHIP.search(norm(offender)):
            errors.append(f'{pre}: title must explicitly identify a family culprit, not vague "me echaron"')
        culprit=locks.get('family_culprit','')
        if not isinstance(culprit,str) or not KINSHIP.search(norm(culprit)):
            errors.append(f'{pre}: specific family relationship required')
        tail=locks.get('reversal_title_span','')
        if isinstance(tail,str) and WEAK_TAIL.search(norm(tail)):
            errors.append(f'{pre}: reversal is generic / phone-call-only; requires concrete action')
        if WEAK_TAIL.search(norm(title)):
            errors.append(f'{pre}: title contains prohibited generic revelation ending')
        for k in ('mother_decision','decision_cost','seven_part_payoff','reversal_lever'):
            t=locks.get(k)
            if not isinstance(t,str) or len(t.strip())<35:
                errors.append(f'{pre}: {k} needs a credible, detailed story explanation (>=35 chars)')
        result.append({'index':i,'title':title,'niche_metadata_complete':set(locks)>=MANDATORY})
    winner=packet.get('suggested_winner')
    if winner is not None and (type(winner)!=int or not 1<=winner<=5):errors.append('invalid suggested_winner')
    return {'passed':not errors,'errors':errors,'candidates':result,'suggested_winner':winner,
            'note':'Structural and limited text gates only; human must verify real kinship, heroine agency, Mexican plausibility, originality, story quality. Run legacy score gate too.'}

def main():
    a=argparse.ArgumentParser();a.add_argument('packet',type=Path);a.add_argument('--output',type=Path)
    opts=a.parse_args()
    try: r=validate(json.loads(opts.packet.read_text('utf-8')))
    except (json.JSONDecodeError,UnicodeDecodeError,OSError) as e: r={'passed':False,'errors':[f'Input error: {e}'],'candidates':[]}
    s=json.dumps(r,indent=2,ensure_ascii=False);print(s)
    if opts.output:opts.output.write_text(s+'\n','utf-8')
    return 0 if r['passed'] else 1
if __name__=='__main__':sys.exit(main())
