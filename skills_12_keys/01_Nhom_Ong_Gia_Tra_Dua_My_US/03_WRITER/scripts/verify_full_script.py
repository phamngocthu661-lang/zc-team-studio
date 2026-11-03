#!/usr/bin/env python3
"""Read-only verifier for DADUS 7-Part assembled UTF-8 full scripts.

Count = Python Unicode code points in complete text after removing ONLY
standalone [PART 1]...[PART 7] lines INCLUDING their newline. Hash = SHA256
UTF-8 of that same body. Never modifies the manuscript.

Usage: python verify_full_script.py /mnt/data/DADUS_<title_sha12>_FULL_SCRIPT.txt
Returns exit 0 on PASS and 2 on FAIL; emits JSON to stdout.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

HEADING = re.compile(r"^\[PART ([1-7])\]$")

def sha(data):
    return hashlib.sha256(data).hexdigest()

def get_profile(outline_file=None):
    if outline_file is None: return 'LONG_V12',(70000,80000)
    data=Path(outline_file).read_bytes().decode('utf-8','strict')
    matches=re.findall(r'(?m)^LENGTH_PROFILE:\s*(LONG_V12|COMPETITOR_CUT)\s*$',data)
    if len(matches)>1: raise ValueError('Outline has multiple LENGTH_PROFILE lines')
    if not matches and re.search(r'(?m)^LENGTH_PROFILE:',data): raise ValueError('Unsupported LENGTH_PROFILE')
    name=matches[0] if matches else 'LONG_V12'
    return name,({'LONG_V12':(70000,80000),'COMPETITOR_CUT':(30000,45000)}[name])

def report(path,outline_file=None):
    profile,(minchars,maxchars)=get_profile(outline_file)
    raw = path.read_bytes()
    failures=[]
    try:
        text=raw.decode('utf-8','strict')
    except UnicodeDecodeError as e:
        return {'path':str(path),'pass':False,'failures':[f'UTF-8 decode error: {e}']}
    if raw.startswith(b'\xef\xbb\xbf'):
        failures.append('UTF-8 BOM not allowed')
    if '\r' in text:
        failures.append('CR/CRLF line ending is not allowed; use LF consistently')
    headings=[]
    body_lines=[]
    part_lengths=[]
    current=None
    for line in text.splitlines(keepends=True):
        ln=line.rstrip('\r\n')
        m=HEADING.fullmatch(ln)
        if m:
            headings.append(int(m.group(1)));
            if current is not None:part_lengths.append(len(current))
            current=''
        else:
            body_lines.append(line)
            if current is None:
                if line.strip(): failures.append('Non-heading manuscript content appears before PART 1')
            else: current+=line
    if current is not None:part_lengths.append(len(current))
    if headings!=list(range(1,8)):
        failures.append(f'Expected exact ordered headings 1..7; found {headings}')
    if len(part_lengths)!=7 or any(n<200 for n in part_lengths):
        failures.append(f'One or more Parts missing or suspiciously short: {part_lengths}')
    body=''.join(body_lines)
    chars=len(body)
    if not minchars<=chars<=maxchars:
        failures.append(f'Length hard fail: {chars} not in {minchars}..{maxchars} ({profile})')
    result={
      'path':str(path),'pass':not failures,'failures':failures,
      'file_bytes':len(raw),'file_sha256':sha(raw),
      'headings':headings,'part_characters_including_prose_whitespace':part_lengths,
      'script_body_chars':chars,'script_body_words':len(body.split()),
      'script_body_sha256':sha(body.encode('utf-8')),
      'count_rule':'Remove only standalone [PART N] heading lines and their line endings',
      'valid_range':f'{minchars}..{maxchars} inclusive','length_profile':profile,
    }
    return result

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('path',type=Path)
    ap.add_argument('--outline-file',type=Path)
    ns=ap.parse_args()
    try: res=report(ns.path,outline_file=ns.outline_file)
    except (OSError,ValueError,UnicodeError) as e:
        res={'path':str(ns.path),'pass':False,'failures':[str(e)]}
    print(json.dumps(res,ensure_ascii=False,indent=2))
    raise SystemExit(0 if res['pass'] else 2)

if __name__=='__main__': main()
