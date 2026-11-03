#!/usr/bin/env python3
"""Frozen QA ledger -> exactly one byte-scoped replacement transaction -> read-only verification."""
import argparse, hashlib, json, re, sys, os
from pathlib import Path
from project_tools import sha, read_bytes, parse_script, canonical_json, put_json, load_json

HEX=re.compile('^[0-9a-f]{64}$')
def verify_patches(b,ledger):
    if sha(b)!=ledger.get('baseline_sha256'):raise ValueError('QA baseline SHA mismatch; cannot rebase repair')
    patches=ledger.get('patches')
    if not isinstance(patches,list) or len(patches)>25:raise ValueError('Ledger must have 0..25 patches')
    ids=set();prev_end=-1
    for i,p in enumerate(patches):
        ident=p.get('id');start=p.get('start_byte');end=p.get('end_byte')
        if not isinstance(ident,str) or not ident or ident in ids:raise ValueError(f'Bad/duplicate patch ID {ident!r}')
        ids.add(ident)
        if not isinstance(start,int) or not isinstance(end,int) or not 0<=start<end<=len(b):raise ValueError(f'Bad span {ident}')
        if start<prev_end:raise ValueError(f'Overlapping or unsorted spans {ident}')
        prev_end=end
        if start>0 and b[start-1:start]!=b'\n':raise ValueError(f'Patch span must begin at a speaker line boundary {ident}')
        if end<len(b) and b[end-1:end]!=b'\n':raise ValueError(f'Patch span must end at line boundary {ident}')
        if b'[PART ' in b[start:end]:raise ValueError(f'Patch must NOT include heading {ident}')
        try:b[start:end].decode('utf-8','strict')
        except UnicodeDecodeError:raise ValueError(f'Patch splits UTF-8 char {ident}')
        if sha(b[start:end]) != p.get('before_sha256'):raise ValueError(f'Before hash mismatch {ident}')
        if p.get('severity') not in ('P0','P1','P2'):raise ValueError('Only real P0/P1/P2 defects can be patched')
        if not p.get('reason') or not p.get('evidence'):raise ValueError('Reason/evidence required')
    return patches

def cmd_freeze(a):
    b=read_bytes(a.baseline);s=load_json(a.draft_ledger)
    if 'baseline_sha256' in s and s['baseline_sha256']!=sha(b):raise ValueError('Proposed ledger baseline SHA wrong')
    ledger={'version':'1.1.0','baseline_sha256':sha(b),'patches':[]}
    for p in s.get('patches',[]):
        st,ed=p['start_byte'],p['end_byte']
        if not (isinstance(st,int) and isinstance(ed,int) and 0<=st<ed<=len(b)):raise ValueError('Invalid patch offset')
        ledger['patches'].append({k:p[k] for k in ['id','start_byte','end_byte','reason','evidence','severity']})
        ledger['patches'][-1]['before_sha256']=sha(b[st:ed])
    verify_patches(b,ledger)
    out=Path(a.out)
    if out.exists():raise ValueError('FROZEN_QA_LEDGER already exists; cannot overwrite')
    put_json(out,ledger)
    print(canonical_json({'status':'LEDGER_FROZEN','baseline_sha256':sha(b),'patches':len(ledger['patches']),'ledger_sha256':sha(read_bytes(out))}))

def apply_bytes(b,ledger,replacements):
    patches=verify_patches(b,ledger)
    if replacements.get('baseline_sha256')!=sha(b):raise ValueError('Replacement baseline SHA mismatch')
    rs=replacements.get('replacements')
    if not isinstance(rs,list) or set(x.get('id') for x in rs)!=set(p['id'] for p in patches) or len(rs)!=len(patches):raise ValueError('Replacement IDs must equal exactly the frozen ledger IDs')
    replacement_by_id={r['id']:r['replacement'] for r in rs}
    if any(not isinstance(v,str) for v in replacement_by_id.values()):raise ValueError('Replacement text must be string')
    out=[];cursor=0;proof=[]
    for p in patches:
        begin=p['start_byte'];end=p['end_byte'];ident=p['id'];change=replacement_by_id[ident]
        if not change or '[PART ' in change:raise ValueError(f'Invalid replacement heading/empty patch {ident}')
        if not change.endswith('\n'):raise ValueError(f'Replacement must end LF {ident}')
        for line in change.splitlines():
            if line.strip() and not re.match(r'^@[A-Za-z_][A-Za-z0-9_-]{0,32}:\s*.+$',line):raise ValueError(f'Bad repaired speaker line {ident}: {line[:60]}')
        block=change.encode('utf-8')
        out.append(b[cursor:begin]);out.append(block);cursor=end
        proof.append({'id':ident,'original_sha256':p['before_sha256'],'replacement_sha256':sha(block),'start_byte':begin,'end_byte':end})
    out.append(b[cursor:]);return b''.join(out),proof

def cmd_apply(a):
    d=Path(a.project_dir);d.mkdir(parents=True,exist_ok=True)
    final=d/'FULL_SCRIPT_REVISED.txt';proof_path=d/'REPAIR_PROOF.json'
    if final.exists() or proof_path.exists():raise ValueError('ONE REPAIR ALREADY USED. A second repair is forbidden.')
    b=read_bytes(a.baseline);ledger=load_json(a.ledger);rs=load_json(a.replacements)
    revised,proof=apply_bytes(b,ledger,rs)
    if revised==b:raise ValueError('No changes; do not consume repair budget for no-op')
    r=parse_script(revised,expected=list(range(1,8)),strict_length=True)
    if not proof:raise ValueError('Empty patch ledger; no repair needed')
    result={'version':'1.1.0','status':'ONE_PASS_APPLIED_AWAITING_INDEPENDENT_FINAL_QA','repair_attempts_used':1,'baseline_sha256':sha(b),'revised_sha256':sha(revised),'ledger_sha256':sha(read_bytes(a.ledger)),'replacements_sha256':sha(read_bytes(a.replacements)),'approved_patches':proof,'readable_chars':r['total_readable_chars'],'unchanged_segments_verified':True}
    # Exclusive mode: do not silently overwrite any existing artifacts.
    with final.open('xb') as fp:fp.write(revised)
    with proof_path.open('x',encoding='utf-8') as fp:fp.write(canonical_json(result))
    print(canonical_json(result))

def cmd_verify(a):
    d=Path(a.project_dir)
    info=load_json(d/'REPAIR_PROOF.json');b=read_bytes(a.baseline)
    ledger=load_json(a.ledger);rs=load_json(a.replacements)
    if info['repair_attempts_used']!=1 or info['baseline_sha256']!=sha(b):raise ValueError('Proof baseline invalid')
    if info['ledger_sha256']!=sha(read_bytes(a.ledger)) or info['replacements_sha256']!=sha(read_bytes(a.replacements)):raise ValueError('Ledger or replacements modified after repair')
    expected,proof=apply_bytes(b,ledger,rs)
    revised=read_bytes(d/'FULL_SCRIPT_REVISED.txt')
    if revised != expected or sha(revised)!=info['revised_sha256']:raise ValueError('Unauthorized byte changes in revised script')
    if proof!=info['approved_patches']:raise ValueError('Patch proof differs')
    r=parse_script(revised,expected=list(range(1,8)),strict_length=True)
    print(canonical_json({'status':'INTEGRITY_VERIFIED_NOT_CREATIVE_QA_READY','revised_sha256':sha(revised),'repair_attempts_used':1,'readable_chars':r['total_readable_chars'],'outside_patches_identical':True}))

def main():
    p=argparse.ArgumentParser(description=__doc__);subs=p.add_subparsers(dest='command',required=True)
    x=subs.add_parser('freeze');x.add_argument('--baseline',required=True);x.add_argument('--draft-ledger',required=True);x.add_argument('--out',required=True);x.set_defaults(run=cmd_freeze)
    x=subs.add_parser('apply');x.add_argument('--baseline',required=True);x.add_argument('--ledger',required=True);x.add_argument('--replacements',required=True);x.add_argument('--project-dir',required=True);x.set_defaults(run=cmd_apply)
    x=subs.add_parser('verify');x.add_argument('--baseline',required=True);x.add_argument('--ledger',required=True);x.add_argument('--replacements',required=True);x.add_argument('--project-dir',required=True);x.set_defaults(run=cmd_verify)
    a=p.parse_args()
    try:a.run(a)
    except (OSError,ValueError,KeyError,UnicodeDecodeError) as e:
        print('BLOCKED:',str(e),file=sys.stderr);sys.exit(2)
if __name__=='__main__':main()
