#!/usr/bin/env python3
"""Manga JP V1: deterministic UTF-8 title/outline locks, speaker-char counts, stage assembly."""
import argparse, hashlib, json, re, sys
from pathlib import Path

HEADER = re.compile(r'^\[PART ([1-7])\]$')
SPEECH = re.compile(r'^@([A-Za-z_][A-Za-z0-9_-]{0,32}):\s*(?:\[[^\]\n]{1,30}\]\s*)?(.+)$')
STAGES = {'A':[1,2], 'B':[3,4,5], 'C':[6,7]}
LIMIT=(13900,16300)
STAGE_LIMIT={'A':(3500,4700),'B':(5900,7400),'C':(3500,5100)}

def sha(b):return hashlib.sha256(b).hexdigest()
def read_bytes(p):return Path(p).read_bytes()
def canonical_json(o):return json.dumps(o,ensure_ascii=False,indent=2,sort_keys=True)+'\n'
def put_json(path,o):Path(path).write_text(canonical_json(o),encoding='utf-8')
def load_json(path):return json.loads(Path(path).read_text(encoding='utf-8'))

def parse_script(b, expected=None, strict_length=False):
    try:s=b.decode('utf-8',errors='strict')
    except UnicodeDecodeError as e:raise ValueError('not valid UTF-8') from e
    if '\r' in s:raise ValueError('Only LF newlines supported, CRLF not allowed')
    parts={};seen=[];current=None;previous=None;linecount=0
    for no,line in enumerate(s.splitlines(),1):
        if not line.strip():continue
        m=HEADER.fullmatch(line)
        if m:
            n=int(m.group(1))
            if n in parts:raise ValueError(f'Duplicate PART {n}')
            parts[n]={'chars':0,'lines':0,'speakers':set()};seen.append(n);current=n;continue
        if line.startswith('[PART'):raise ValueError(f'Malformed PART heading line {no}: {line[:80]}')
        if current is None:raise ValueError(f'Content before first PART line {no}')
        m=SPEECH.fullmatch(line)
        if m is None:raise ValueError(f'Bad speaker format line {no}: {line[:100]}')
        spoken=m.group(2).strip()
        if not spoken:raise ValueError(f'Empty spoken line {no}')
        parts[current]['chars']+=sum(not c.isspace() for c in spoken)
        parts[current]['lines']+=1
        parts[current]['speakers'].add(m.group(1))
        linecount+=1
    if expected is not None and seen!=expected:
        raise ValueError(f'PART ordering differs: actual={seen}, expected={expected}')
    if not parts or any(v['lines']==0 for v in parts.values()):raise ValueError('Missing/empty PART')
    total=sum(p['chars'] for p in parts.values())
    if strict_length and not (LIMIT[0] <= total <= LIMIT[1]):raise ValueError(f'Readable chars {total} outside {LIMIT}')
    return {'part_order':seen,'total_readable_chars':total,'per_part':{str(k):{'chars':v['chars'],'lines':v['lines'],'speakers':sorted(v['speakers'])} for k,v in parts.items()},'speech_lines':linecount,'sha256':sha(b),'strict_length_pass':LIMIT[0]<=total<=LIMIT[1]}

def cmd_title(args):
    b=read_bytes(args.title_file);s=b.decode('utf-8','strict')
    if not s or '\n' in s or '\r' in s:raise ValueError('Title must be a single exact line without trailing LF')
    if len(s)>100:raise ValueError(f'Title too long: {len(s)} > 100 codepoints')
    if len(s)<12:raise ValueError('Title too short; is this a real video title?')
    o={'version':'1.1.0','current_final_title':s,'title_chars':len(s),'title_sha256':sha(b),'title_sha12':sha(b)[:12]}
    put_json(args.out,o);print(canonical_json(o))

def cmd_outline(args):
    t=load_json(args.title_lock)
    tb=t['current_final_title'].encode('utf-8')
    if sha(tb)!=t['title_sha256']:raise ValueError('TITLE_LOCK tampered')
    b=read_bytes(args.outline);s=b.decode('utf-8','strict')
    if len(s)<500:raise ValueError('Outline too short to support seven parts')
    for i in range(1,8):
        if f'PART {i}' not in s:raise ValueError(f'Outline missing PART {i}')
    outline_sha=sha(b)
    vid=sha(tb+b'\n'+outline_sha.encode('ascii'))[:16]
    o={'version':'1.1.0','current_final_title':t['current_final_title'],'title_sha256':t['title_sha256'],'outline_sha256':outline_sha,'video_id':vid,'outline_bytes':len(b)}
    put_json(args.out,o);print(canonical_json(o))

def cmd_check(args):
    b=read_bytes(args.script)
    o=parse_script(b,expected=list(range(1,8)) if args.full else None,strict_length=args.strict)
    print(canonical_json(o))

def verify_locks(directory):
    t=load_json(directory/'TITLE_LOCK.json');o=load_json(directory/'OUTLINE_LOCK.json')
    if t['title_sha256']!=o['title_sha256']:raise ValueError('Locked title mismatch')
    if sha(t['current_final_title'].encode('utf-8'))!=t['title_sha256']:raise ValueError('Title sha incorrect')
    if sha(read_bytes(directory/'CURRENT_FINAL_OUTLINE.txt'))!=o['outline_sha256']:raise ValueError('Outline sha incorrect')
    expected_vid=sha(t['current_final_title'].encode()+b'\n'+o['outline_sha256'].encode())[:16]
    if o['video_id']!=expected_vid:raise ValueError('video_id differs')
    return t,o

def cmd_stage(args):
    d=Path(args.project_dir); d.mkdir(parents=True,exist_ok=True)
    verify_locks(d)
    st=args.name.upper()
    b=read_bytes(args.input)
    result=parse_script(b,expected=STAGES[st])
    if args.strict and not (STAGE_LIMIT[st][0]<=result['total_readable_chars']<=STAGE_LIMIT[st][1]):
        raise ValueError(f'Stage {st} chars={result["total_readable_chars"]} outside {STAGE_LIMIT[st]}')
    if not b.endswith(b'\n'):raise ValueError('Stage file needs a final LF newline')
    dest=d/f'PARTS_{st}.txt'
    if dest.exists():
        if read_bytes(dest)!=b:raise ValueError('Stage already saved with different bytes; do not overwrite')
    else:dest.write_bytes(b)
    print(canonical_json({'stage':st,'path':str(dest),'bytes':len(b),**result}))

def cmd_assemble(args):
    d=Path(args.project_dir); t,o=verify_locks(d)
    files=[d/f'PARTS_{s}.txt' for s in STAGES]
    if any(not f.exists() for f in files):raise ValueError('All A/B/C are required')
    source=[]
    for name,p in zip(STAGES,files):
        b=read_bytes(p);r=parse_script(b,expected=STAGES[name]);source.append({'stage':name,'sha256':sha(b),'readable_chars':r['total_readable_chars']})
    b=b''.join(read_bytes(p) for p in files)
    report=parse_script(b,expected=list(range(1,8)),strict_length=not args.dev_skip_length)
    final=d/'FULL_SCRIPT.txt';proof=d/'DRAFT_PROOF.json'
    if final.exists() and read_bytes(final)!=b:raise ValueError('Existing FULL_SCRIPT differs; immutable assembled baseline')
    final.write_bytes(b)
    data={'version':'1.1.0','video_id':o['video_id'],'title_sha256':t['title_sha256'],'outline_sha256':o['outline_sha256'],'script_sha256':sha(b),'readable_chars':report['total_readable_chars'],'part_order':report['part_order'],'stages':source,'status':'DRAFT_FROZEN_NOT_QA_READY'}
    if proof.exists() and load_json(proof)['script_sha256']!=data['script_sha256']:raise ValueError('Existing DRAFT_PROOF mismatch')
    put_json(proof,data)
    print(canonical_json(data))

def main():
    p=argparse.ArgumentParser(description=__doc__); sub=p.add_subparsers(dest='command',required=True)
    a=sub.add_parser('lock-title');a.add_argument('--title-file',required=True);a.add_argument('--out',required=True);a.set_defaults(run=cmd_title)
    a=sub.add_parser('lock-outline');a.add_argument('--title-lock',required=True);a.add_argument('--outline',required=True);a.add_argument('--out',required=True);a.set_defaults(run=cmd_outline)
    a=sub.add_parser('check-script');a.add_argument('--script',required=True);a.add_argument('--full',action='store_true');a.add_argument('--strict',action='store_true');a.set_defaults(run=cmd_check)
    a=sub.add_parser('save-stage');a.add_argument('--name',required=True,choices=['A','B','C']);a.add_argument('--input',required=True);a.add_argument('--project-dir',required=True);a.add_argument('--strict',action='store_true');a.set_defaults(run=cmd_stage)
    a=sub.add_parser('assemble');a.add_argument('--project-dir',required=True);a.add_argument('--dev-skip-length',action='store_true');a.set_defaults(run=cmd_assemble)
    args=p.parse_args()
    try:args.run(args)
    except (ValueError,OSError,KeyError,UnicodeDecodeError) as e:
        print('BLOCKED:',str(e),file=sys.stderr);sys.exit(2)
if __name__=='__main__':main()
