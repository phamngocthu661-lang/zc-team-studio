#!/usr/bin/env python3
"""Verify/save HOMELESS staged script proofs and byte-assemble complete manuscript.

Does NOT generate prose. Segment files must already exist and contain complete
real narrative written in the active session. Manifest is an integrity record,
not evidence of editorial QA. JSON output; 0 PASS and 2 FAIL.
"""
import argparse
import hashlib
import json
import os
import re
import sys
import tempfile
from pathlib import Path

STAGES = {'A': [1,2], 'B': [3,4,5], 'C': [6,7]}
HEADING = re.compile(r'^\[PART ([0-9]+)\]$')


def hash_bytes(data):
    return hashlib.sha256(data).hexdigest()


def error(message):
    raise ValueError(message)


def sha12(title):
    return hash_bytes(title.encode('utf-8'))[:12]

def outline_identity(title, path):
    raw = path.read_bytes()
    raw.decode('utf-8','strict')
    if not raw or not raw.strip():
        error('Outline file is empty')
    osh = hash_bytes(raw)
    return osh, hash_bytes((title+'\n'+osh).encode('utf-8'))[:16]


def read_segment(path, expected):
    raw = path.read_bytes()
    if not raw: error(f'Empty segment file: {path}')
    try:
        content = raw.decode('utf-8', 'strict')
    except UnicodeDecodeError as exc:
        error(f'Segment not valid UTF-8: {path}: {exc}')
    if raw.startswith(b'\xef\xbb\xbf'): error('UTF-8 BOM prohibited')
    if '\r' in content: error('CR/CRLF prohibited: use LF')
    if not content.endswith('\n'): error('Segment must end with newline for exact byte concatenation')
    parts, bodies, seen_first = [], [], False
    for line in content.splitlines(keepends=True):
        m = HEADING.fullmatch(line.rstrip('\n'))
        if m:
            parts.append(int(m.group(1)))
            bodies.append('')
            seen_first = True
        else:
            if not seen_first:
                error('Prose/whitespace before the first heading is forbidden')
            bodies[-1] += line
    if parts != expected: error(f'Expected ordered headings {expected}, found {parts}')
    part_sizes = [len(x) for x in bodies]
    if any(v < 200 for v in part_sizes): error(f'Empty or suspiciously short Part(s): {part_sizes}')
    body = ''.join(bodies)
    return {
        'file_sha256': hash_bytes(raw), 'file_bytes': len(raw),
        'headings': parts, 'part_chars': part_sizes,
        'body_chars': len(body), 'body_words': len(body.split()),
        'body_sha256': hash_bytes(body.encode('utf-8')),
    }, raw


def paths(title, directory):
    token = sha12(title)
    base = f'HML_{token}'
    return {
        'manifest': directory / f'{base}_SCRIPT_MANIFEST.json',
        'full': directory / f'{base}_FULL_SCRIPT.txt',
        **{key: directory / f'{base}_SCRIPT_{key}.txt' for key in STAGES}
    }


def load_manifest(path, title, outline_sha=None, video_id=None):
    if not path.is_file():
        return None
    data = json.loads(path.read_text('utf-8'))
    if data.get('title') != title or data.get('title_sha12') != sha12(title):
        error('Manifest belongs to a different locked title')
    if data.get('version') != 2: error('Legacy V11 or unknown manifest schema: explicit migration required, never silently overwrite')
    if data.get('outline_sha256') != outline_sha or data.get('video_id') != video_id:
        error('Outline/video identity differs from staged manifest; same title does not imply same video')
    if not isinstance(data.get('segments'), dict): error('Malformed manifest segments')
    return data


def atomic_bytes(path, blob):
    path.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=str(path.parent), delete=False, prefix='.hml_staging_') as temp:
        temp.write(blob)
        tmp=Path(temp.name)
    try: os.replace(tmp,path)
    finally:
        if tmp.exists():tmp.unlink()


def check_existing(manifest, ps, ignore=None):
    for k in STAGES:
        if k not in manifest['segments'] or k==ignore: continue
        exp = manifest['segments'][k]
        p = ps[k]
        if not p.is_file(): error(f'Locked segment {k} is missing at {p}; do not reconstruct from chat memory')
        info, _ = read_segment(p, STAGES[k])
        if info['file_sha256'] != exp['file_sha256'] or info['body_chars'] != exp['body_chars']:
            error(f'Locked segment {k} changed (file hash or chars mismatch). Do not silently use new source.')


def command_stage(args):
    title=args.title
    ps=paths(title,args.directory)
    osha,vid=outline_identity(title,args.outline_file)
    seg=args.segment
    if args.file.resolve()!=ps[seg].resolve():
        error(f'Segment path must match title-locked output path {ps[seg]}')
    if not ps[seg].is_file(): error(f'Segment has not been written: {ps[seg]}')
    info,_=read_segment(ps[seg], STAGES[seg])
    m=load_manifest(ps['manifest'],title,osha,vid)
    if m is None:
        if seg != 'A': error('No manifest/A found; cannot stage B or C')
        m={'version':2,'title':title,'title_sha12':sha12(title),'outline_sha256':osha,'video_id':vid,'segments':{}}
    previous={'A':[],'B':['A'],'C':['A','B']}[seg]
    if any(k not in m['segments'] for k in previous):
        error(f'Cannot stage {seg}; missing previously locked stage(s): {[k for k in previous if k not in m["segments"]]}')
    check_existing(m,ps, ignore=seg if args.replace else None)
    existing=m['segments'].get(seg)
    if existing and existing['file_sha256']!=info['file_sha256']:
        if not args.replace: error(f'{seg} changed; supply --replace only when explicitly authorized')
        later=[k for k in STAGES if list(STAGES).index(k)>list(STAGES).index(seg) and k in m['segments']]
        if later: error(f'Cannot replace {seg} while later stages {later} are locked. Start a versioned revision instead.')
        m.pop('full',None)
        if ps['full'].exists():
            error('Full script exists. Refuse staged replacement; user must create a versioned revision.')
    if not existing and seg != list(STAGES)[len(m['segments'])]:
        error('Stage must be sequential (A then B then C)')
    m['segments'][seg]={'file':ps[seg].name,**info}
    atomic_bytes(ps['manifest'], (json.dumps(m,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
    return {'pass':True,'action':'stage','segment':seg,'title_sha12':sha12(title),
            'video_id':vid,'outline_sha256':osha,
            'segment_path':str(ps[seg]),'manifest_path':str(ps['manifest']),**info,
            'full_script_ready': bool(m.get('full'))}


def command_inspect(args):
    ps=paths(args.title,args.directory)
    osha,vid=outline_identity(args.title,args.outline_file)
    m=load_manifest(ps['manifest'],args.title,osha,vid)
    if not m:error('Manifest not found')
    check_existing(m,ps)
    stages=list(m['segments'])
    if stages!=list(STAGES)[:len(stages)]:error(f'Nonsequential stages in manifest: {stages}')
    nxt=next((k for k in STAGES if k not in m['segments']),None)
    if m.get('full'):
        if not ps['full'].exists():error('Manifest says full assembled but full file not found')
        from verify_full_script import report
        full=report(ps['full'])
        if not full['pass'] or full['file_sha256']!=m['full']['file_sha256']:
            error('Full script changed or did not pass verification')
    return {'pass':True,'action':'inspect','manifest_path':str(ps['manifest']),
            'video_id':vid,'stages_verified':stages, 'next_stage':nxt, 'full_script_ready':bool(m.get('full'))}


def command_assemble(args):
    ps=paths(args.title,args.directory)
    osha,vid=outline_identity(args.title,args.outline_file)
    m=load_manifest(ps['manifest'],args.title,osha,vid)
    if not m: error('Manifest missing')
    if list(m['segments']) != list(STAGES):
        error('Must first stage/verify A, B, C in order')
    check_existing(m,ps)
    complete=b''.join(ps[k].read_bytes() for k in STAGES)
    if ps['full'].is_file() and ps['full'].read_bytes()!=complete:
        error('Existing FULL_SCRIPT differs; will not overwrite it')
    from verify_full_script import report
    with tempfile.NamedTemporaryFile(dir=str(args.directory), delete=False, prefix='.hml_unverified_',suffix='.txt') as temp:
        temp.write(complete)
        temporary=Path(temp.name)
    try:
        result=report(temporary)
        if not result['pass']:
            error('FULL_SCRIPT gate failed; source segments kept. '+', '.join(result['failures']))
        if not ps['full'].is_file():
            os.replace(temporary,ps['full'])
        verified=report(ps['full'])
        if not verified['pass'] or verified['file_sha256']!=hash_bytes(complete):
            error('Final readback SHA/verification mismatch')
        m['full']={'file':ps['full'].name,'file_sha256':verified['file_sha256'],
                  'body_sha256':verified['script_body_sha256'],'body_chars':verified['script_body_chars'],
                  'body_words':verified['script_body_words']}
        atomic_bytes(ps['manifest'],(json.dumps(m,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
        verified.update({'action':'assemble','manifest_path':str(ps['manifest']),'video_id':vid,'source_stage_file_hashes':{k:m['segments'][k]['file_sha256'] for k in STAGES}})
        return verified
    finally:
        if temporary.exists():temporary.unlink()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    subs=parser.add_subparsers(dest='action',required=True)
    for action in ('stage','inspect','assemble'):
        p=subs.add_parser(action)
        p.add_argument('--title',required=True,help='Exact locked title')
        p.add_argument('--directory',type=Path,default=Path('/mnt/data'))
        p.add_argument('--outline-file',type=Path,required=True,help='Exact locked CURRENT_FINAL_OUTLINE file for video binding')
        if action=='stage':
            p.add_argument('--segment',required=True,choices=list(STAGES))
            p.add_argument('--file',required=True,type=Path)
            p.add_argument('--replace',action='store_true')
    args=parser.parse_args()
    try:
        result={'stage':command_stage,'inspect':command_inspect,'assemble':command_assemble}[args.action](args)
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as ex:
        result={'pass':False,'action':args.action,'error':str(ex)}
    print(json.dumps(result,ensure_ascii=False,indent=2))
    return 0 if result['pass'] else 2

if __name__=='__main__':sys.exit(main())
