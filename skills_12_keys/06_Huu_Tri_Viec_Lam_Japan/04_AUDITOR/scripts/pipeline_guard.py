#!/usr/bin/env python3
"""Japan Senior Kuchikomi V1.1: deterministic artifact guard (not semantic QA).
UTF-8 only. Python 3.9+ stdlib. Single repair pass is enforced by proof + immutable output.
"""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

MIN_BODY, MAX_BODY = 10500, 13500
REVIEW_PATTERN = re.compile(r'^\s*口コミ\s*(\d{1,2})(?=\s*[:：\-]|\s*$)', re.M)
PART_PATTERN = re.compile(r'^## PART\s+([1-7])\s*$', re.M)
JAPANESE = re.compile(r'[\u3040-\u30ff\u3400-\u9fff]')
EXPECTED = {1: range(1, 5), 2: range(5, 9), 3: range(9, 13),
            4: range(13, 17), 5: range(17, 21), 6: range(21, 26),
            7: range(26, 31)}


def need(ok, msg):
    if not ok:
        raise ValueError(msg)


def readb(path):
    return Path(path).read_bytes()


def readtxt(path):
    return readb(path).decode('utf-8-sig')


def digest(raw):
    if isinstance(raw, str):
        raw = raw.encode('utf-8')
    return hashlib.sha256(raw).hexdigest()


def getjson(path):
    return json.loads(readtxt(path))


def put(path, content):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    need(not p.exists(), f'IMMUTABLE_OUTPUT_EXISTS: {p}')
    raw = content if isinstance(content, bytes) else content.encode('utf-8')
    with p.open('xb') as f:
        f.write(raw)
    return str(p)


def putjson(path, data):
    return put(path, json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + '\n')


def review_ids(text):
    return [int(x) for x in REVIEW_PATTERN.findall(text)]


def part_ids(text):
    return [int(x) for x in PART_PATTERN.findall(text)]


def shape(text):
    parts = list(PART_PATTERN.finditer(text))
    need([int(m.group(1)) for m in parts] == list(range(1, 8)), 'Require ## PART 1..7 exactly once, in order')
    ids = review_ids(text)
    need(ids == list(range(1, 31)), f'Require 口コミ01..30 exactly once/in order, got {ids}')
    for i, m in enumerate(parts):
        end = parts[i+1].start() if i+1 < len(parts) else len(text)
        got = review_ids(text[m.end():end])
        need(got == list(EXPECTED[i+1]), f'PART {i+1} expected {list(EXPECTED[i+1])}, got {got}')
    return 7, 30


def review_sections(text):
    """Return each review heading + body span, ending before next review or PART.
    A patch must be entirely inside the declared review body, not any heading.
    """
    pat = re.compile(r'^\s*口コミ\s*(\d{1,2})\s*[:：-].*$', re.M)
    heads=list(pat.finditer(text))
    parts=list(PART_PATTERN.finditer(text))
    spans={}
    for i,h in enumerate(heads):
        candidates=[len(text)]
        if i+1<len(heads):candidates.append(heads[i+1].start())
        candidates += [x.start() for x in parts if x.start()>h.end()]
        spans[int(h.group(1))]=(h.end(),min(candidates))
    return spans


def editorial_diagnostics(text):
    """Mechanical warnings for editors, NOT a semantic, kanji or native-language verdict."""
    shape(text)
    spans=review_sections(text)
    issues=[]
    endings={}
    consult=[]
    body_lens={}
    for n,(start,end) in spans.items():
        body=text[start:end].strip()
        body_lens[f'{n:02d}']=len(''.join(body.split()))
        if len(body)<230:
            issues.append({'review':n,'code':'VERY_SHORT_SCENE','detail':'<230 nonspace characters; check emotional scene depth'})
        # Diagnostics are deliberately heuristic; repeats/phrases are not automatically errors.
        if '相談' in body or '担当者に' in body or '店長に' in body:
            consult.append(n)
        if 'シルバー人材セーター' in body:
            issues.append({'review':n,'code':'LIKELY_JAPANESE_TYPO','detail':'シルバー人材セーター -> センター'})
        tail=''.join(body.split())[-28:]
        endings.setdefault(tail,[]).append(n)
    if len(consult)>=12:
        issues.append({'code':'CONSULTATION_REPETITION_RISK','reviews':consult,
            'detail':'12+ reviews contain consultation/manager motif: audit whether endings are too similar'})
    for tail,ids in endings.items():
        if len(ids)>=3: issues.append({'code':'IDENTICAL_ENDINGS','reviews':ids,'excerpt':tail})
    return {'schema':'japan-kuchikomi-editorial-diagnostics-v1.1',
            'technical_only':True,'editorial_result':'NOT_CHECKED',
            'review_body_chars':body_lens,'consultation_motif_reviews':consult,
            'length_target_warning': not (11800<=narrated_chars(text)<=12600),
            'heuristic_warnings':issues}


def diagnostics_command(args):
    data=editorial_diagnostics(readtxt(args.script))
    data['script_sha256']=digest(readb(args.script))
    putjson(args.output,data)
    return data


def narrated_chars(text):
    total = 0
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith('## PART') or s.startswith('# '):
            continue
        if REVIEW_PATTERN.match(s):
            continue  # review title/headline is metadata, not spoken body
        if s.startswith('```'):
            raise ValueError('Markdown code fence not allowed in narration')
        total += len(''.join(s.split()))
    return total


def inspect_script(text, low=MIN_BODY, high=MAX_BODY):
    p, r = shape(text)
    chars = narrated_chars(text)
    need(low <= chars <= high, f'NARRATED_CHAR_GATE: {chars} outside {low}..{high}')
    need(bool(JAPANESE.search(text)), 'Missing Japanese-language content')
    return {'part_count':p, 'review_count':r, 'narrated_chars':chars,
            'min_chars':low, 'max_chars':high}


def title_lock(args):
    title = args.title.strip()
    need(title == args.title and 1 <= len(title) <= 100, 'TITLE must have 1..100 Unicode characters, no extra outer spaces')
    need(bool(JAPANESE.search(title)), 'TITLE must contain Japanese writing')
    item = {'current_final_title':title,'title_sha256':digest(title),
            'title_characters':len(title),'source':args.source,
            'schema':'japan-kuchikomi-title-v1'}
    putjson(args.output, item)
    return item


def outline_lock(args):
    lock = getjson(args.title_lock)
    need(digest(lock['current_final_title']) == lock['title_sha256'], 'TITLE_LOCK hash inconsistent')
    outline_raw = readb(args.outline)
    o = outline_raw.decode('utf-8-sig')
    shape(o)
    h = digest(outline_raw)
    video_id = digest(lock['current_final_title'] + '\n' + h)[:16]
    item = {'outline_sha256':h,'title_sha256':lock['title_sha256'],
            'video_id':video_id,'part_count':7,'review_count':30,
            'schema':'japan-kuchikomi-outline-v1'}
    putjson(args.output, item)
    return item


def check_locks(title, outline, outline_path=None):
    t, o = getjson(title), getjson(outline)
    need(digest(t['current_final_title']) == t['title_sha256'], 'TITLE_LOCK hash invalid')
    need(o['title_sha256'] == t['title_sha256'], 'TITLE_LOCK and OUTLINE_LOCK mismatch')
    need(o['video_id'] == digest(t['current_final_title'] + '\n' + o['outline_sha256'])[:16], 'video_id invalid')
    if outline_path:
        need(digest(readb(outline_path)) == o['outline_sha256'], 'outline file hash changed')
        shape(readtxt(outline_path))
    return t, o


def assemble(args):
    t, o = check_locks(args.title_lock, args.outline_lock, args.outline)
    chunks = [readb(args.a),readb(args.b),readb(args.c)]
    need(all(x.endswith(b'\n') for x in chunks), 'Every A/B/C must end with a newline (UTF-8)')
    ranges = [(1,8),(9,20),(21,30)]
    for raw,(lo,hi) in zip(chunks,ranges):
        ids = review_ids(raw.decode('utf-8'))
        need(ids == list(range(lo,hi+1)), f'Stage must have exactly reviews {lo}..{hi}; got {ids}')
    joined = b''.join(chunks)
    data = inspect_script(joined.decode('utf-8'),args.min_chars,args.max_chars)
    item={'schema':'japan-kuchikomi-manifest-v1', 'video_id':o['video_id'],
          'title_sha256':t['title_sha256'],'outline_sha256':o['outline_sha256'],
          'stage_sha256':{'A':digest(chunks[0]),'B':digest(chunks[1]),'C':digest(chunks[2])},
          'script_sha256':digest(joined),'script_bytes':len(joined), **data}
    need(not Path(args.out_script).exists() and not Path(args.manifest).exists(),'script/manifest already exists')
    put(args.out_script,joined)
    putjson(args.manifest,item)
    return item


def qa_preflight(args):
    raw=readb(args.script)
    m=getjson(args.manifest)
    need(digest(raw) == m['script_sha256'], 'SOURCE MANIFEST DOES NOT MATCH SCRIPT')
    vals=inspect_script(raw.decode('utf-8'),m.get('min_chars',MIN_BODY),m.get('max_chars',MAX_BODY))
    item={'script_sha256':digest(raw),'manifest_sha256':digest(readb(args.manifest)),
          'technical_result':'PASS','editorial_result':'NOT_CHECKED', **vals}
    putjson(args.output,item)
    return item


def repair_once(args):
    need(not Path(args.out_script).exists() and not Path(args.proof).exists(),
         'ONE_REPAIR_LOCK: output/proof already exists; second rewrite forbidden')
    raw=readb(args.script)
    # Stable per-baseline lock prevents bypass by choosing another proof filename.
    pass_lock = Path(args.script).parent / ('.ONE_REPAIR_' + digest(raw)[:16] + '.lock.json')
    need(not pass_lock.exists(), 'ONE_REPAIR_LOCK: this baseline has already been repaired')
    baseline=raw.decode('utf-8')
    qa=getjson(args.qa_frozen)
    need(qa.get('original_sha256') == digest(raw), 'QA frozen not bound to EXACT original')
    need(qa.get('qa_decision') == 'NEEDS_ONE_REPAIR', 'QA does not permit a repair pass')
    need(qa.get('editorial_review_completed') is True and qa.get('covered_reviews') == 30,
         'QA must cover all 30 stories before repair')
    frozen=qa.get('authorized_patches',[])
    requests=getjson(args.patches).get('patches',[])
    need(0<len(frozen)<=100 and len(frozen)==len(requests),'All frozen defects must be patched once in one run')
    fs={x['patch_id']:x for x in frozen}
    rs={x['patch_id']:x for x in requests}
    need(len(fs)==len(frozen) and len(rs)==len(requests) and set(fs)==set(rs),'Patch IDs missing/duplicate/extra')
    changes=[]
    for ident, spec in fs.items():
        old=spec.get('old_text','')
        new=rs[ident].get('new_text','')
        need(spec.get('category') in ('logic','spelling','fact','continuity'),'Unsupported patch category')
        need(isinstance(old,str) and old and isinstance(new,str) and new and old!=new,'Patch must be local change')
        need(len(old)<=900 and len(new)<=1100,'Patch too large: repair not full rewrite')
        need('## PART' not in old+new and not REVIEW_PATTERN.search(old+'\n'+new), 'Part/review heading alteration forbidden')
        need(baseline.count(old)==1, f'Patch source must occur once exactly: {ident}')
        a=baseline.index(old);b=a+len(old)
        # Exact target review is mandatory; prevents changing another speaker's passage.
        n=spec.get('review_id')
        need(type(n) is int and 1<=n<=30, f'Frozen patch {ident} missing valid review_id')
        spans=review_sections(baseline)
        need(n in spans and spans[n][0] <= a and b <= spans[n][1],
             f'Patch {ident} is outside declared 口コミ{n:02d} body')
        need('\n' not in old and '\n' not in new, 'Patches must remain within one line (not headings)')
        changes.append((a,b,new,ident,old))
    changes.sort(key=lambda x:x[0]);
    for x,y in zip(changes,changes[1:]):
        need(x[1]<=y[0],'Frozen patch ranges overlap')
    revised=baseline
    for start,end,new,ident,old in reversed(changes):
        revised=revised[:start]+new+revised[end:]
    vals=inspect_script(revised,args.min_chars,args.max_chars)
    proof={'schema':'japan-kuchikomi-repair-proof-v1', 'repair_rounds':1,
           'baseline_script_sha256':digest(raw),'revised_script_sha256':digest(revised),
           'qa_frozen_sha256':digest(readb(args.qa_frozen)),
           'patch_ids':[c[3] for c in changes],'repaired_count':len(changes), **vals}
    put(args.out_script,revised)
    putjson(args.proof,proof)
    putjson(pass_lock, {'original_sha256':digest(raw),'proof_path':str(args.proof),'repair_rounds':1})
    return proof


def seo_verify(args):
    t,o=check_locks(args.title_lock,args.outline_lock,args.outline)
    qa=getjson(args.qa_final)
    script=readb(args.script)
    need(qa.get('status')=='READY','SEO BLOCKED: QA_FINAL not READY')
    need(qa.get('editorial_verified') is True and qa.get('checked_review_count') == 30,
         'SEO BLOCKED: no independent completed editorial check')
    need(qa.get('blocking_issue_count') == 0,'SEO BLOCKED: defects remain')
    need(qa.get('script_sha256') == digest(script),'SEO BLOCKED: script SHA mismatch')
    need(qa.get('title_sha256') == t['title_sha256'] and qa.get('outline_sha256') == o['outline_sha256'],
         'SEO BLOCKED: title/outline mismatch')
    rounds=qa.get('repair_rounds')
    need(rounds in (0,1),'SEO BLOCKED: invalid repair rounds')
    if rounds==1:
        need(args.proof is not None,'SEO BLOCKED: repair proof required')
        proof=getjson(args.proof)
        need(proof.get('repair_rounds')==1 and proof.get('revised_script_sha256')==digest(script),
             'SEO BLOCKED: repair proof mismatch')
        frozen=getattr(args,'qa_frozen',None)
        if frozen:
            need(proof.get('qa_frozen_sha256') == digest(readb(frozen)),
                 'SEO BLOCKED: frozen QA provenance mismatch')
        baseline=getattr(args,'baseline',None)
        if baseline:
            need(proof.get('baseline_script_sha256') == digest(readb(baseline)),
                 'SEO BLOCKED: baseline provenance mismatch')
    # Do not trust length limits supplied by QA_FINAL; it is an assertion, not authority.
    # Older V1.0 products remain valid if they meet the global 10.5k--13.5k contract.
    vals=inspect_script(script.decode('utf-8'),MIN_BODY,MAX_BODY)
    need(qa.get('narrated_chars',vals['narrated_chars'])==vals['narrated_chars'],
         'SEO BLOCKED: declared narrator length mismatch')
    if rounds==1:
        need(proof.get('baseline_script_sha256') != digest(script),
             'SEO BLOCKED: repair proof baseline equals final; no change')
        need(proof.get('narrated_chars')==vals['narrated_chars'],
             'SEO BLOCKED: proof narrator length mismatch')
    return {'SEO_GATE':'PASS','video_id':o['video_id'], 'script_sha256':digest(script),
            'title_sha256':t['title_sha256'],'outline_sha256':o['outline_sha256'],
            'repair_rounds':rounds, **vals}


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    s=p.add_subparsers(dest='command',required=True)
    a=s.add_parser('title-lock'); a.add_argument('--title',required=True);a.add_argument('--source',default='user-provided');a.add_argument('--output',required=True);a.set_defaults(action=title_lock)
    a=s.add_parser('outline-lock');a.add_argument('--title-lock',required=True);a.add_argument('--outline',required=True);a.add_argument('--output',required=True);a.set_defaults(action=outline_lock)
    a=s.add_parser('assemble');
    for x in ('title-lock','outline-lock','outline','a','b','c','out-script','manifest'):a.add_argument('--'+x,required=True)
    a.add_argument('--min-chars',type=int,default=MIN_BODY);a.add_argument('--max-chars',type=int,default=MAX_BODY);a.set_defaults(action=assemble)
    a=s.add_parser('qa-preflight');
    for x in ('script','manifest','output'):a.add_argument('--'+x,required=True)
    a.set_defaults(action=qa_preflight)
    a=s.add_parser('repair-once');
    for x in ('script','qa-frozen','patches','out-script','proof'):a.add_argument('--'+x,required=True)
    a.add_argument('--min-chars',type=int,default=MIN_BODY);a.add_argument('--max-chars',type=int,default=MAX_BODY);a.set_defaults(action=repair_once)
    a=s.add_parser('editorial-diagnostics');
    a.add_argument('--script',required=True);a.add_argument('--output',required=True)
    a.set_defaults(action=diagnostics_command)
    a=s.add_parser('seo-verify');
    for x in ('script','qa-final','title-lock','outline-lock','outline'):a.add_argument('--'+x,required=True)
    a.add_argument('--proof');a.add_argument('--qa-frozen');a.add_argument('--baseline');a.set_defaults(action=seo_verify)
    args=p.parse_args(argv)
    try:
        result=args.action(args)
        print(json.dumps(result,ensure_ascii=False,indent=2))
        return 0
    except (ValueError,KeyError,UnicodeError,FileNotFoundError,PermissionError,TypeError) as e:
        print(f'BLOCKED: {e}',file=sys.stderr)
        return 2


if __name__=='__main__':
    sys.exit(main())
