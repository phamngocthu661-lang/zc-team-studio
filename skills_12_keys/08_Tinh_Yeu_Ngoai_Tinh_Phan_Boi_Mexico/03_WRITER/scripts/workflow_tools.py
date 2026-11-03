#!/usr/bin/env python3
"""Offline artifact validator for MEX_INFIDELIDAD_V1. Pure file/hash/byte checks; not creative or legal QA."""
from __future__ import annotations
import argparse
import datetime
import hashlib
import json
import re
import sys
import collections
import csv
import unicodedata
from pathlib import Path

NICHE = 'MEX_INFIDELIDAD_V1'
HEADINGS = re.compile(r'(?m)^\[PART ([1-7])\][ \t]*$')
WORD = re.compile(r"[^\W\d_]+(?:['’\-][^\W\d_]+)*|\d+(?:[.,]\d+)*", re.UNICODE)
STAGES = {'A': [1, 2], 'B': [3, 4, 5], 'C': [6, 7]}

class ContractError(ValueError):
    pass

def fail(message):
    raise ContractError(message)

def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()

def read_bytes(path):
    p = Path(path)
    if not p.is_file(): fail(f'Missing file: {p}')
    return p.read_bytes()

def read_utf8(path):
    raw = read_bytes(path)
    try: txt = raw.decode('utf-8-sig')
    except UnicodeDecodeError as e: fail(f'Invalid UTF-8 {path}: {e}')
    if b'\r' in raw: fail(f'CRLF not allowed; use LF in {path}')
    return txt

def read_json(path):
    try: return json.loads(read_utf8(path))
    except json.JSONDecodeError as e: fail(f'Invalid JSON {path}: {e}')

def emit_json(obj):
    print(json.dumps(obj, ensure_ascii=False, indent=2))

def save_json_new(path, obj):
    p=Path(path);p.parent.mkdir(parents=True,exist_ok=True)
    with p.open('x',encoding='utf-8',newline='\n') as f:
        json.dump(obj,f,ensure_ascii=False,indent=2,sort_keys=True)
        f.write('\n')

def title_info(title_file):
    title=read_utf8(title_file).strip('\n').strip()
    if '\n' in title or not title: fail('Title file must be one nonempty exact title')
    if len(title)>100: fail('Title exceeds 100 Unicode chars')
    return dict(title=title, title_sha256=sha_bytes(title.encode('utf-8')),video_id=sha_bytes(title.encode('utf-8'))[:12])

def heading_locations(text):
    matches=list(HEADINGS.finditer(text))
    return matches

def check_headings(text, expected):
    matches=heading_locations(text)
    parts=[int(m.group(1)) for m in matches]
    if parts != expected:
        fail(f'Part headings mismatch: expected {expected}, got {parts}; headings must be alone on lines')
    if not text.strip().startswith(f'[PART {expected[0]}]'):
        fail('Content before first part heading')
    if any(not text[m.end(): (matches[i+1].start() if i+1 < len(matches) else len(text))].strip() for i,m in enumerate(matches)):
        fail('Empty part body')
    return matches

def metrics(text, parts=None):
    if parts is not None: check_headings(text, parts)
    body=HEADINGS.sub('',text).strip()
    return {'spoken_words':len(WORD.findall(body)),'body_chars':len(body),'part_count':len(heading_locations(text))}

def length_gate(info):
    if not (12500<=info['spoken_words']<=14500):fail(f"Spoken words outside 12500..14500: {info['spoken_words']}")
    if not (75000<=info['body_chars']<=100000):fail(f"Body chars outside 75000..100000: {info['body_chars']}")

def no_overlap(a,b,c,d):
    return max(a,c) >= min(b,d)

def find_unique_bytes(raw, snippet, name):
    if not isinstance(snippet,str) or not snippet:fail(f'{name} empty or invalid')
    b=snippet.encode('utf-8')
    start=raw.find(b)
    if start<0:fail(f'{name} exact quote not found in baseline')
    if raw.find(b,start+1)>=0:fail(f'{name} ambiguous: quote appears multiple times')
    return start,start+len(b),sha_bytes(b)

def part_for_offset(text, start_byte):
    heads=heading_locations(text)
    spans=[len(text[:m.start()].encode('utf-8')) for m in heads]
    ix=-1
    for i,s in enumerate(spans):
        if s<=start_byte:ix=i
    return int(heads[ix].group(1)) if ix>=0 else None

def checked_freeze(base, findings):
    raw=read_bytes(base);text=read_utf8(base)
    check_headings(text,list(range(1,8)))
    if findings.get('niche_id')!=NICHE:fail('Wrong niche ID in QA findings')
    if findings.get('source_sha256')!=sha_bytes(raw):fail('QA baseline source SHA mismatch')
    entries=findings.get('issues',[])
    if not isinstance(entries,list): fail('issues must be list')
    protected=findings.get('protected_spans',[])
    if not isinstance(protected,list):fail('protected_spans must be list')
    zones=[];seen=set()
    heading_borders=[]
    for m in heading_locations(text):
        a=len(text[:m.start()].encode('utf-8')); b=len(text[:m.end()].encode('utf-8'))
        heading_borders.append((a,b))
    for issue in entries:
        ident=issue.get('id')
        if not isinstance(ident,str) or not re.fullmatch(r'P\d{2,3}',ident): fail(f'Invalid issue id {ident}')
        if ident in seen:fail(f'Duplicate issue id {ident}')
        seen.add(ident)
        if issue.get('severity') not in {'P0','P1','P2'}:fail(f'Only actionable P0..P2 can enter repair: {ident}')
        for k in ['root_cause','acceptance_test','category']:
            if not isinstance(issue.get(k),str) or not issue[k].strip():fail(f'Missing {k} for {ident}')
        a,b,old_sha=find_unique_bytes(raw,issue.get('old_text'),f'issue {ident}')
        part=part_for_offset(text,a)
        if part!=issue.get('part'):fail(f'{ident} belongs to PART {part}, not {issue.get("part")}')
        if any(not no_overlap(a,b,c,d) for c,d in heading_borders):fail(f'{ident} would edit Part heading')
        zones.append(dict(issue, start_byte=a,end_byte=b,old_sha256=old_sha))
    for i,x in enumerate(zones):
        for y in zones[i+1:]:
            if not no_overlap(x['start_byte'],x['end_byte'],y['start_byte'],y['end_byte']):
                fail(f'Edit windows overlap: {x["id"]} and {y["id"]}')
    pz=[]; p_seen=set()
    for prot in protected:
        ident=prot.get('id')
        if not isinstance(ident,str) or ident in p_seen:fail(f'Invalid protected id {ident}')
        p_seen.add(ident)
        a,b,old_sha=find_unique_bytes(raw,prot.get('text'),f'protected {ident}')
        for z in zones:
            # catches any overlap, including partial overlap
            if not no_overlap(a,b,z['start_byte'],z['end_byte']):
                fail(f'Protected overlap: {ident} x {z["id"]}')
        pz.append(dict(prot,start_byte=a,end_byte=b,original_sha256=old_sha))
    return {'contract_version':'MEX_QA_ONE_REPAIR_V1','niche_id':NICHE,'source_sha256':sha_bytes(raw),
            'repair_count':0,'one_pass_only':True,'issues':zones,'protected_spans':pz,
            'created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()}

def patch_from_proof(base_raw,frozen,proof):
    if proof.get('repair_count')!=1:fail('Proof must indicate exactly one repair')
    if proof.get('contract_version')!='MEX_REPAIR_PROOF_V1':fail('Wrong repair proof version')
    if proof.get('source_sha256')!=sha_bytes(base_raw) or proof.get('source_sha256')!=frozen['source_sha256']:fail('Baseline vs proof SHA conflict')
    zones=frozen['issues'];rep=proof.get('replacements')
    if not isinstance(rep,list) or set(x.get('id') for x in rep)!=set(z['id'] for z in zones) or len(rep)!=len(zones):
        fail('Proof replacements do not match frozen issue set')
    mapping={x['id']:x for x in rep}
    for zone in zones:
        p=mapping[zone['id']]
        if not isinstance(p.get('text'),str) or not p['text'] or p['text']==zone['old_text']:fail('Bad replacement text')
        if sha_bytes(p['text'].encode('utf-8'))!=p.get('new_sha256'):fail(f'Wrong replacement hash {zone["id"]}')
        if sha_bytes(base_raw[zone['start_byte']:zone['end_byte']])!=zone['old_sha256']:fail('Old bytes mismatch')
    out=base_raw
    for z in sorted(zones,key=lambda x:x['start_byte'],reverse=True):
        new=mapping[z['id']]['text'].encode('utf-8');out=out[:z['start_byte']]+new+out[z['end_byte']:]
    return out



def stage_path(workdir, record, stage_name):
    """Resolve stage records portably, including legacy V1 absolute paths after a ZIP move."""
    loc=record.get('file')
    if not isinstance(loc,str) or not loc.strip():fail(f'Missing file reference for stage {stage_name}')
    orig=Path(loc)
    # Prefer the project workdir. An external original path may point to ANOTHER run:
    # even a matching hash from it is not sufficient to select that source after a copy.
    local=Path(workdir)/orig.name
    if local.is_file():
        if sha_bytes(local.read_bytes())!=record.get('sha256'):
            fail(f'Local stage {stage_name} differs from locked manifest')
        return local
    if orig.is_file():
        if sha_bytes(orig.read_bytes())!=record.get('sha256'):
            fail(f'Original stage {stage_name} differs from locked manifest')
        return orig
    fail(f'Stage {stage_name} unavailable: neither {local} nor legacy path {orig} exists')


def lint_story(text):
    """Conservative mechanical hints, never a substitute for Spanish-language QA."""
    warnings=[]
    body=HEADINGS.sub('',text)
    for m in re.finditer(r'\b([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{4,})s?\s+de\s+\1\b',body,re.I):
        word=m.group(1).lower()
        warnings.append({'type':'POSSIBLE_LEXICAL_DUPLICATION','excerpt':body[max(0,m.start()-45):m.end()+45].replace('\n',' ')})
    for m in re.finditer(r'\b(de|que|la|el|y)\s+\1\b',body,re.I):
        warnings.append({'type':'REPEATED_FUNCTION_WORD','excerpt':body[max(0,m.start()-35):m.end()+35].replace('\n',' ')})
    return warnings[:40]


def audit_workdir(workdir, require_seo=False, ledger=None):
    """Verify file-level cross-step dependencies; editorial accuracy is NOT machine-certified."""
    w=Path(workdir)
    if not w.is_dir():fail('Run folder does not exist')
    title=title_info(w/'CURRENT_FINAL_TITLE.txt')
    tlock=read_json(w/'TITLE_LOCK.json')
    if any(tlock.get(k)!=v for k,v in [('niche_id',NICHE),('title',title['title']),('title_sha256',title['title_sha256']),('video_id',title['video_id'])]):
        fail('TITLE_LOCK does not match original title file')
    outline_raw=read_bytes(w/'FINAL_OUTLINE.md');ohash=sha_bytes(outline_raw)
    ol=read_json(w/'OUTLINE_LOCK.json')
    if ol.get('niche_id')!=NICHE or ol.get('title_sha256')!=title['title_sha256'] or ol.get('outline_sha256')!=ohash or ol.get('parts')!=7:
        fail('Outline lock / title / actual outline mismatch')
    manifest=read_json(w/'SCRIPT_MANIFEST.json')
    if any(manifest.get(k)!=v for k,v in [('niche_id',NICHE),('title_sha256',title['title_sha256']),('video_id',title['video_id']),('outline_sha256',ohash)]):
        fail('SCRIPT_MANIFEST title/outline chain is broken')
    if set(manifest.get('stages',{}))!=set(STAGES):fail('Stage manifest incomplete')
    segment_text=[]
    for stage,expected in STAGES.items():
        rec=manifest['stages'][stage]
        source=stage_path(w,rec,stage)
        raw=read_bytes(source)
        if sha_bytes(raw)!=rec.get('sha256'):fail('Stage file/hash mismatch')
        txt=read_utf8(source)
        met=metrics(txt,expected)
        if any(rec.get(k)!=met[k] for k in ['spoken_words','body_chars','part_count']):
            fail(f'Stage {stage} count manifest disagrees with actual bytes')
        segment_text.append(txt.rstrip('\n'))
    assembled=('\n\n'.join(segment_text)+'\n').encode('utf-8')
    original=read_bytes(w/'FULL_SCRIPT.txt')
    if assembled!=original:fail('Original full script differs from deterministic A/B/C assembly')
    findings=read_json(w/'QA_FINDINGS.json')
    if findings.get('source_sha256')!=sha_bytes(original):fail('QA findings do not refer to original')
    regenerated=checked_freeze(w/'FULL_SCRIPT.txt',findings)
    if (w/'QA_FROZEN.json').is_file():
        frozen=read_json(w/'QA_FROZEN.json')
        for k in ['niche_id','source_sha256','repair_count','one_pass_only','issues','protected_spans']:
            if regenerated.get(k)!=frozen.get(k):fail(f'QA frozen contract differs from QA findings: {k}')
    else:
        if findings.get('issues'):fail('Missing frozen QA contract for actionable issues')
        frozen=regenerated
    final=read_json(w/'QA_FINAL.json')
    if any(final.get(k)!=v for k,v in [('niche_id',NICHE),('video_id',title['video_id']),('title_sha256',title['title_sha256']),('outline_sha256',ohash)]):
        fail('QA_FINAL identity chain mismatch')
    if final.get('repair_count') not in (0,1) or type(final.get('repair_count')) is not int:
        fail('QA_FINAL invalid repair count')
    if final['repair_count']==1:
        if not (w/'QA_FROZEN.json').is_file():fail('One repair requires a durable QA frozen file')
        proof=read_json(w/'REPAIR_PROOF.json')
        marker=read_json(w/'ONE_REPAIR_USED.json')
        if sha_bytes(read_bytes(w/'QA_FROZEN.json'))!=proof.get('frozen_sha256'):
            fail('Frozen QA changed after repair')
        revised=read_bytes(w/'FULL_SCRIPT_REVISED.txt')
        if revised!=patch_from_proof(original,frozen,proof):fail('Revised bytes differ from frozen one-pass patches')
        if sha_bytes(revised)!=proof.get('revised_sha256'):fail('Repair proof revised SHA mismatch')
        for k in ['source_sha256','revised_sha256','frozen_sha256']:
            if marker.get(k)!=proof.get(k):fail(f'ONE_REPAIR_USED disagrees with proof: {k}')
        if marker.get('status')!='CONSUMED' or marker.get('repair_count')!=1:fail('One-repair marker invalid')
        original_issues=final.get('original_issues')
        if not isinstance(original_issues,list) or set((x.get('id'),x.get('result')) for x in original_issues)!=set((x.get('id'),'FIXED') for x in frozen['issues']):
            fail('Final QA did not explicitly attest resolution for all original issues')
        if final.get('regressions') not in ([],):fail('Final QA reports regressions; not READY')
        script_path=w/'FULL_SCRIPT_REVISED.txt'
    else:
        if frozen['issues']:fail('Final QA says no repair even though frozen actionable issues exist')
        script_path=w/'FULL_SCRIPT.txt'
    sraw=read_bytes(script_path);script=read_utf8(script_path)
    met=metrics(script,list(range(1,8)));length_gate(met)
    if sha_bytes(sraw)!=final.get('script_sha256'):fail('QA final script SHA mismatch')
    if final.get('status')!='READY' or type(final.get('qa_score')) not in (int,float) or final['qa_score']<97 or final['qa_score']>100 or final.get('blocking_issues')!=[]:
        fail('Final QA is not READY with score 97-100 and zero blockers')
    for k in ('complete_full_read','logic_sweep_done','orthography_sweep_done','all_original_issues_checked'):
        if final.get(k) is not True:fail(f'QA did not attest {k}')
    if require_seo:
        for fname in ('SEO_PACKAGE.md','seo.txt','THUMBNAIL_A_PROMPT.txt','THUMBNAIL_B_PROMPT.txt','THUMBNAIL_C_PROMPT.txt','TRAILER_PROMPT.txt'):
            if not read_utf8(w/fname).strip():fail(f'Missing/blank SEO artifact {fname}')
        seo=read_utf8(w/'SEO_PACKAGE.md')
        if title['title'] not in seo or final['script_sha256'] not in seo:fail('SEO package lacks exact primary title or script SHA')
    ledger_verified=False
    if ledger is not None:
        with Path(ledger).open(encoding='utf-8-sig',newline='') as h:
            rows=list(csv.DictReader(h))
        matches=[r for r in rows if r.get('video_id')==title['video_id'] and r.get('final_title')==title['title'] and r.get('status') in ('LOCKED','PUBLISHED')]
        if len(matches)!=1:fail('Title history ledger has no unique matching LOCKED/PUBLISHED row')
        ledger_verified=True
    return {'status':'MECHANICAL_PASS_EDITORIAL_REVIEW_REQUIRED','niche_id':NICHE,'video_id':title['video_id'],
        'title_ledger_verified':ledger_verified,
        'script_file':str(script_path),'script_sha256':sha_bytes(sraw),'repair_count':final['repair_count'],
        'qa_claimed_score':final['qa_score'],'editorial_certified':False,'warnings':lint_story(script),**met}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    sub=p.add_subparsers(dest='command',required=True)
    c=sub.add_parser('count');c.add_argument('--file',required=True);c.add_argument('--enforce-length',action='store_true')
    st=sub.add_parser('stage');st.add_argument('--workdir',required=True);st.add_argument('--segment',choices=STAGES,required=True);st.add_argument('--file',required=True);st.add_argument('--title-file',required=True);st.add_argument('--outline-file',required=True)
    a=sub.add_parser('assemble');a.add_argument('--workdir',required=True);a.add_argument('--out',required=True);a.add_argument('--enforce-length',action='store_true')
    q=sub.add_parser('qa-freeze');q.add_argument('--baseline',required=True);q.add_argument('--findings',required=True);q.add_argument('--out',required=True)
    r=sub.add_parser('repair-apply');r.add_argument('--baseline',required=True);r.add_argument('--frozen',required=True);r.add_argument('--replacements',required=True);r.add_argument('--out',required=True);r.add_argument('--proof',required=True)
    v=sub.add_parser('repair-verify');v.add_argument('--baseline',required=True);v.add_argument('--frozen',required=True);v.add_argument('--revised',required=True);v.add_argument('--proof',required=True)
    s=sub.add_parser('seo-gate');s.add_argument('--title-file',required=True);s.add_argument('--script',required=True);s.add_argument('--qa-final',required=True);s.add_argument('--workdir',help='V1.1 strict cross-step run verification; REQUIRED for production gate')
    ar=sub.add_parser('audit-run');ar.add_argument('--workdir',required=True);ar.add_argument('--require-seo',action='store_true');ar.add_argument('--ledger',help='Optional persistent title ledger to verify cross-video reservation')
    args=p.parse_args()
    if args.command=='count':
        txt=read_utf8(args.file);met=metrics(txt,list(range(1,8)));met['file_sha256']=sha_bytes(read_bytes(args.file))
        if args.enforce_length:length_gate(met)
        emit_json({'status':'PASS','metrics':met});return
    if args.command=='audit-run':
        emit_json(audit_workdir(args.workdir,args.require_seo,args.ledger));return
    if args.command=='stage':
        work=Path(args.workdir);work.mkdir(parents=True,exist_ok=True)
        title=title_info(args.title_file);outline_sha=sha_bytes(read_bytes(args.outline_file))
        text=read_utf8(args.file);check_headings(text,STAGES[args.segment]);chunk=read_bytes(args.file);chash=sha_bytes(chunk)
        mf=work/'SCRIPT_MANIFEST.json'
        if mf.exists():
            manifest=read_json(mf)
            if manifest.get('video_id')!=title['video_id'] or manifest.get('title_sha256')!=title['title_sha256'] or manifest.get('outline_sha256')!=outline_sha:
                fail('Title/outline hashes changed: cannot resume this run')
        else:
            manifest={'niche_id':NICHE,**title,'outline_sha256':outline_sha,'stages':{}}
        idx=list(STAGES).index(args.segment)
        for prev in list(STAGES)[:idx]:
            old=manifest['stages'].get(prev)
            if not old or sha_bytes(read_bytes(stage_path(work,old,prev)))!=old['sha256']:
                fail(f'Previous stage {prev} missing or changed')
        old=manifest['stages'].get(args.segment)
        if old and old['sha256']!=chash:fail('Locked stage cannot be overwritten or recomposed')
        if idx<2 and any(x in manifest['stages'] for x in list(STAGES)[idx+1:]):fail('Cannot revise earlier segment after downstream stage')
        manifest['stages'][args.segment]={'file':(Path(args.file).name if Path(args.file).resolve().parent==work.resolve() else str(Path(args.file).resolve())),'sha256':chash,**metrics(text,STAGES[args.segment])}
        mf.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        emit_json({'status':'PASS','segment':args.segment,'manifest':str(mf),'file_sha256':chash});return
    if args.command=='assemble':
        work=Path(args.workdir);mf=read_json(work/'SCRIPT_MANIFEST.json')
        segs=mf.get('stages',{});
        if set(segs)!=set(STAGES):fail('Stages A/B/C not all verified')
        parts=[]
        for s_name,p_numbers in STAGES.items():
            stage=segs[s_name]
            raw=read_bytes(stage_path(work,stage,s_name))
            if sha_bytes(raw)!=stage['sha256']:fail(f'Stage {s_name} file changed')
            txt=read_utf8(stage_path(work,stage,s_name));check_headings(txt,p_numbers)
            parts.append(txt.rstrip('\n'))
        alltext='\n\n'.join(parts)+'\n';met=metrics(alltext,list(range(1,8)))
        if args.enforce_length:length_gate(met)
        out=Path(args.out)
        if out.exists():fail('Assembled output already exists; no silent overwrites')
        out.write_text(alltext,encoding='utf-8',newline='\n')
        emit_json({'status':'PASS','out':str(out),'script_sha256':sha_bytes(out.read_bytes()),**met});return
    if args.command=='qa-freeze':
        contract=checked_freeze(args.baseline,read_json(args.findings));save_json_new(args.out,contract)
        emit_json({'status':'PASS','out':args.out,'issues':len(contract['issues']),'protected':len(contract['protected_spans'])});return
    if args.command=='repair-apply':
        raw=read_bytes(args.baseline);text=read_utf8(args.baseline)
        frozen=read_json(args.frozen)
        if frozen.get('contract_version')!='MEX_QA_ONE_REPAIR_V1' or frozen.get('niche_id')!=NICHE:fail('Invalid frozen QA contract')
        if sha_bytes(raw)!=frozen.get('source_sha256'):fail('Source SHA conflict with frozen QA')
        if frozen.get('repair_count')!=0 or not frozen.get('one_pass_only'):fail('Contract is not initial one-pass repair')
        zones=frozen.get('issues',[])
        if not zones:fail('Nothing to repair. Skip S5 and use final QA with repair_count=0')
        replacements=read_json(args.replacements).get('replacements',[])
        if not isinstance(replacements,list) or len(replacements)!=len(zones) or set(r.get('id') for r in replacements)!=set(z['id'] for z in zones):
            fail('Require exactly one replacement for every frozen issue')
        if len(set(r['id'] for r in replacements))!=len(replacements):fail('Duplicate replacement IDs')
        mapping={r['id']:r for r in replacements}
        rep=[]
        for z in zones:
            new=mapping[z['id']].get('text')
            if not isinstance(new,str) or not new or new==z['old_text'] or '[PART ' in new:fail(f'Invalid replacement {z["id"]}')
            if sha_bytes(raw[z['start_byte']:z['end_byte']])!=z['old_sha256']:fail('Frozen anchor mismatch')
            rep.append({'id':z['id'],'text':new,'new_sha256':sha_bytes(new.encode('utf-8'))})
        proof={'contract_version':'MEX_REPAIR_PROOF_V1','niche_id':NICHE,'repair_count':1,
               'source_sha256':sha_bytes(raw),'frozen_sha256':sha_bytes(read_bytes(args.frozen)),
               'replacements':rep}
        new_raw=patch_from_proof(raw,frozen,proof)
        revised=new_raw.decode('utf-8');newmet=metrics(revised,list(range(1,8)))
        # If source length is within default bounds, revised must still obey both limits.
        oldmet=metrics(text,list(range(1,8)))
        if 12500<=oldmet['spoken_words']<=14500 and 75000<=oldmet['body_chars']<=100000:
            length_gate(newmet)
        proof['revised_sha256']=sha_bytes(new_raw)
        out=Path(args.out);pr=Path(args.proof)
        usage_marker=Path(args.frozen).parent/'ONE_REPAIR_USED.json'
        if usage_marker.exists():fail('ONE_REPAIR_USED already exists: a second automated S5 pass is forbidden')
        if out.exists() or pr.exists():fail('Repair output or proof already exists: ONE-PASS repair cannot be repeated')
        out.parent.mkdir(parents=True,exist_ok=True);pr.parent.mkdir(parents=True,exist_ok=True)
        # Durable marker blocks second repair with renamed output files in the same run.
        # If subsequent IO fails, block for manual intervention rather than silently retry.
        save_json_new(usage_marker,{'niche_id':NICHE,'source_sha256':proof['source_sha256'],
                                    'frozen_sha256':proof['frozen_sha256'],'revised_sha256':proof['revised_sha256'],
                                    'repair_count':1,'status':'CONSUMED'})
        with out.open('xb') as f:f.write(new_raw)
        save_json_new(pr,proof)
        emit_json({'status':'PASS','one_repair_count':1,'revised_sha256':proof['revised_sha256'],'replacements':len(rep),**newmet});return
    if args.command=='repair-verify':
        raw=read_bytes(args.baseline);frozen=read_json(args.frozen);proof=read_json(args.proof)
        if sha_bytes(read_bytes(args.frozen))!=proof.get('frozen_sha256'):fail('Frozen QA file changed after repair')
        if sha_bytes(raw)!=frozen.get('source_sha256'):fail('Baseline changed after freeze')
        want=patch_from_proof(raw,frozen,proof);have=read_bytes(args.revised)
        if want!=have or sha_bytes(have)!=proof.get('revised_sha256'):fail('Revised file differs from approved patches')
        emit_json({'status':'PASS','repair_count':1,'revised_sha256':proof['revised_sha256'],'scope_verified':True});return
    if args.command=='seo-gate':
        if args.workdir:
            strict=audit_workdir(args.workdir,False)
            if Path(args.script).resolve()!=Path(strict['script_file']).resolve() or Path(args.title_file).resolve()!=Path(args.workdir,'CURRENT_FINAL_TITLE.txt').resolve() or Path(args.qa_final).resolve()!=Path(args.workdir,'QA_FINAL.json').resolve():
                fail('Strict SEO gate input paths must match audited run files')
        title=title_info(args.title_file);script=read_bytes(args.script);info=read_json(args.qa_final)
        if info.get('niche_id')!=NICHE:fail('Wrong niche in final QA')
        if title['title_sha256']!=info.get('title_sha256') or sha_bytes(script)!=info.get('script_sha256'):
            fail('Title/script bytes mismatch QA_FINAL')
        if info.get('status')!='READY' or not isinstance(info.get('qa_score'),(int,float)) or info['qa_score']<97:
            fail('QA not READY >=97')
        if info.get('repair_count') not in (0,1) or info.get('blocking_issues')!=[]:
            fail('Invalid repair_count or unresolved blocking issues')
        for key in ('complete_full_read','logic_sweep_done','orthography_sweep_done','all_original_issues_checked'):
            if info.get(key) is not True:fail(f'Missing independently attested final QA: {key}')
        met=metrics(read_utf8(args.script),list(range(1,8)));length_gate(met)
        emit_json({'status':('PASS_STRICT_MECHANICAL_ONLY' if args.workdir else 'PASS_BASIC_UNLINKED'), 'seo_eligible':True,'editorial_certified':False,'title':title['title'],'script_sha256':sha_bytes(script),**met});return

if __name__=='__main__':
    try:main()
    except ContractError as e:
        print(f'BLOCKED: {e}',file=sys.stderr);sys.exit(2)
