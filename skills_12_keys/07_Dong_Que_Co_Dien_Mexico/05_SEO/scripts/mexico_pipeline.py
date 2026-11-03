#!/usr/bin/env python3
"""Mexico Rural 1.0: artifact/state gate and ONE-repair enforcement. Stdlib only.

Checks are technical preflight, NOT literary QA. Does not auto-generate stories.
"""
from __future__ import annotations
import argparse
import difflib
import hashlib
import json
import re
import sys
from pathlib import Path

VERSION = '1.1.0'
HEADING = re.compile(r'(?m)^\[PARTE\s+([1-7])\]\s*$')
WORD = re.compile(r"[^\W\d_]+(?:[’'-][^\W\d_]+)*", re.UNICODE)
MAX_WORDS = 13500
MIN_WORDS = 11500
MIN_PART_WORDS = 1000
PLACEHOLDER = re.compile(r'\b(?:TODO|TBD|LOREM IPSUM|CONTINUE HERE|YOUR SCRIPT)\b')


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def load_text(path) -> str:
    raw = Path(path).read_bytes()
    if b'\r\n' in raw:
        raise ValueError(f'{path}: Windows CRLF; normalize file to UTF-8 LF before hashing')
    if raw.startswith(b'\xef\xbb\xbf'):
        raise ValueError(f'{path}: UTF-8 BOM not allowed')
    return raw.decode('utf-8', 'strict')


def single_title(path):
    title = load_text(path).strip('\n')
    if not title.strip() or '\n' in title or title != title.strip():
        raise ValueError('Title file must have exact one nonempty line, no outer spaces')
    return title


def jsonload(path):
    return json.loads(load_text(path))


def jsonwrite(path, obj):
    p = Path(path)
    p.parent.mkdir(exist_ok=True, parents=True)
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True) + '\n', encoding='utf-8', newline='\n')


def read_parts(path, min_words=MIN_WORDS, max_words=MAX_WORDS):
    script = load_text(path)
    matches = list(HEADING.finditer(script))
    seq = [int(x.group(1)) for x in matches]
    if seq != list(range(1, 8)):
        raise ValueError(f'{path}: expected exactly seven ordered headings [PARTE 1]..[PARTE 7], got {seq}')
    if script[:matches[0].start()].strip():
        raise ValueError('TTS script has material before [PARTE 1]')
    chunks = []
    for i, m in enumerate(matches):
        end = matches[i+1].start() if i < 6 else len(script)
        body = script[m.end():end].strip()
        n = len(WORD.findall(body))
        if n < MIN_PART_WORDS:
            raise ValueError(f'Part {i+1} is missing/too short ({n} words)')
        if PLACEHOLDER.search(body):
            raise ValueError(f'Part {i+1} includes placeholder')
        chunks.append((body, n))
    total = sum(n for _, n in chunks)
    if not min_words <= total <= max_words:
        raise ValueError(f'Word count {total}; required [{min_words}, {max_words}] for default longform target')
    return {'sha256': sha(Path(path).read_bytes()), 'words': total, 'per_part': [n for _, n in chunks], 'bytes': len(Path(path).read_bytes())}


def validate_outline(path):
    x = load_text(path)
    seq = [int(z) for z in HEADING.findall(x)]
    if seq != list(range(1,8)):
        raise ValueError(f'Outline must have 7 ordered [PARTE] headers: {seq}')
    if len(x.strip()) < 400:
        raise ValueError('Outline not substantive')
    for term in ('CHARACTER_REGISTRY', 'TIMELINE_LEDGER', 'SETUP_PAYOFF_LEDGER'):
        if term not in x:
            raise ValueError(f'Outline missing {term}')
    return sha(Path(path).read_bytes())


def check_script_matches_state(state, script, min_words=MIN_WORDS, max_words=MAX_WORDS):
    info = read_parts(script, min_words=min_words, max_words=max_words)
    locked = state.get('current_script_sha256')
    if locked and info['sha256'] != locked:
        raise ValueError('Script bytes differ from WORKFLOW_STATE current hash; no silent replacement')
    return info


def cmd_init(args):
    if Path(args.state).exists():
        raise ValueError('State already exists; do not reset/overwrite repair_count')
    title = single_title(args.title_file)
    outline_hash = validate_outline(args.outline_file)
    if title not in load_text(args.outline_file):
        raise ValueError('Exact locked title not present in outline')
    video_id = sha((title + '\n' + outline_hash).encode('utf-8'))[:16]
    state = {
        'schema_version': VERSION, 'channel_key': 'MEXICO_RURAL_CLASSIC',
        'title': title, 'title_sha12': sha(title.encode('utf-8'))[:12],
        'outline_sha256': outline_hash, 'video_id': video_id, 'repair_count': 0,
        'current_script_sha256': None, 'current_script_file': None,
        'latest_qa': None, 'seo_ready': False, 'seo_gate_ready': False,
        'qa_frozen_findings': None, 'qa_frozen_digest': None,
    }
    jsonwrite(args.state, state)
    print('STATE_INITIALIZED', video_id, args.state)


def cmd_assemble(args):
    p = [load_text(x).strip('\n') for x in (args.a,args.b,args.c)]
    for i, allowed in enumerate(([1,2],[3,4,5],[6,7])):
        observed = [int(n) for n in HEADING.findall(p[i])]
        if observed != allowed:
            raise ValueError(f'Segment {"ABC"[i]} expected PARTS {allowed}, found {observed}')
    out = '\n\n'.join(p) + '\n'
    Path(args.out).write_text(out, encoding='utf-8', newline='\n')
    print('ASSEMBLED', args.out, 'sha256', sha(out.encode('utf-8')))


def cmd_check_script(args):
    state = jsonload(args.state)
    info = read_parts(args.script)
    if state.get('current_script_sha256') is not None and state['current_script_sha256'] != info['sha256']:
        raise ValueError('Existing script hash locked; must use authorized commit-repair to change source')
    if state['current_script_sha256'] is None:
        state['current_script_sha256'] = info['sha256']
        state['current_script_file'] = str(Path(args.script).name)
        jsonwrite(args.state, state)
    print('SCRIPT_VALID', json.dumps(info, ensure_ascii=False))


def part_paragraphs(script):
    text = load_text(script)
    matches = list(HEADING.finditer(text))
    if [int(m.group(1)) for m in matches] != list(range(1, 8)):
        raise ValueError('Cannot assess scope: 7 Part headings are required')
    result = {}
    for i, m in enumerate(matches):
        end = matches[i+1].start() if i < 6 else len(text)
        result[i+1] = [v.strip() for v in re.split(r'\n\s*\n', text[m.end():end]) if v.strip()]
    return result


def check_repair_scope(before, after, frozen_findings):
    """Deterministic guard; does not determine literary correctness.

    All changed paragraphs must overlap a frozen finding anchor or an explicitly
    declared secondary anchor, +/- one paragraph for sentence continuity.
    Cross-part fixes require `related_anchors`: [{"part": 7, "anchor": "..."}].
    """
    if not frozen_findings:
        raise ValueError('ONE_REPAIR needs at least one frozen initial QA finding')
    orig = part_paragraphs(before)
    revised = part_paragraphs(after)
    support = {p: set() for p in range(1, 8)}
    for finding in frozen_findings:
        refs = [{'part': finding['part'], 'anchor': finding['anchor']}]
        refs.extend(finding.get('related_anchors', []))
        for ref in refs:
            if ref['part'] not in support or not isinstance(ref.get('anchor'), str) or not ref['anchor']:
                raise ValueError('Invalid repair location reference')
            found = [i for i, para in enumerate(orig[ref['part']]) if ref['anchor'] in para]
            if not found:
                raise ValueError(f'Frozen repair anchor not present in original Part {ref["part"]}: {ref["anchor"][:65]}')
            for i in found:
                support[ref['part']].update((i-1, i, i+1))
    total_original_paras = sum(len(v) for v in orig.values())
    touched = 0
    weighted_changed = 0
    changes = []
    for part in range(1, 8):
        old, new = orig[part], revised[part]
        sm = difflib.SequenceMatcher(a=old, b=new, autojunk=False)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == 'equal':
                continue
            vicinity = range(max(0, i1-1), min(len(old), max(i1+1, i2+1)))
            if not any(i in support[part] for i in vicinity):
                raise ValueError(f'UNAUTHORIZED_REWRITE: Part {part} paragraph {i1+1} outside frozen QA anchor zone')
            touched += max(i2-i1, j2-j1)
            weighted_changed += max(sum(len(p) for p in old[i1:i2]), sum(len(p) for p in new[j1:j2]))
            changes.append({'part': part, 'before_paragraphs': [i1+1, i2], 'after_paragraphs': [j1+1, j2]})
    if not changes:
        raise ValueError('ONE_REPAIR has no textual paragraph change')
    ratio = weighted_changed / max(1, sum(len(p) for part in orig.values() for p in part))
    if ratio > 0.25 or touched > max(5, int(total_original_paras * 0.25)):
        raise ValueError(f'UNAUTHORIZED_REWRITE: repair too broad ({ratio:.1%} text, {touched}/{total_original_paras} paragraphs); send for manual review')
    return {'changed_operations': len(changes), 'changed_paragraphs': touched, 'changed_text_ratio': round(ratio, 4), 'locations': changes}


def qa_validate(report, state, script):
    info = check_script_matches_state(state, script)
    if report.get('video_id') != state['video_id'] or report.get('script_sha256') != info['sha256']:
        raise ValueError('QA report video_id/script_sha256 does not match this current script')
    expected = 'VERIFY' if state['repair_count'] == 1 else 'INITIAL'
    if report.get('phase') != expected:
        raise ValueError(f'QA phase must be {expected} for repair_count={state["repair_count"]}')
    if report.get('status') not in ('READY', 'NOT_READY', 'MANUAL_REVIEW_REQUIRED'):
        raise ValueError('QA status must be READY / NOT_READY / MANUAL_REVIEW_REQUIRED')
    score = report.get('score')
    if not isinstance(score, int) or not 0 <= score <= 100:
        raise ValueError('QA score integer 0..100 required')
    cats = report.get('category_scores', {})
    caps = {'logic': 30, 'canon': 22, 'spanish': 22, 'title_payoff': 12, 'historical': 8, 'technical': 6}
    if set(cats) != set(caps) or any(not isinstance(cats[k], int) or not 0 <= cats[k] <= mx for k, mx in caps.items()):
        raise ValueError('QA category scores missing/invalid')
    if sum(cats.values()) != score:
        raise ValueError('QA category score sum does not equal score')
    findings = report.get('findings')
    parts_for_anchors = part_paragraphs(script)
    if not isinstance(findings, list):
        raise ValueError('QA findings[] required')
    seen_ids = set()
    for item in findings:
        if not all(item.get(k) for k in ('id','severity','part','anchor','problem','root_cause','recommended_action','acceptance_test')):
            raise ValueError('Each QA finding requires id,severity,part,anchor,problem,root_cause,recommended_action,acceptance_test')
        if item['severity'] not in ('HARD','MAJOR','MINOR') or type(item['part']) is not int or item['part'] not in range(1,8):
            raise ValueError('Invalid severity/part in findings')
        if item['id'] in seen_ids:
            raise ValueError('Duplicate QA finding ID')
        seen_ids.add(item['id'])
        if item.get('status', 'OPEN') not in ('OPEN', 'WARNING'):
            raise ValueError('Current QA findings must be OPEN/WARNING; put fixed issues in resolved_initial_findings')
        if not any(item['anchor'] in p for p in parts_for_anchors[item['part']]):
            raise ValueError(f'QA finding {item["id"]} anchor does not exist in current Part {item["part"]}')
        for ref in item.get('related_anchors', []):
            if type(ref) is not dict or type(ref.get('part')) is not int or ref['part'] not in range(1,8) or not isinstance(ref.get('anchor'),str) or not any(ref['anchor'] in p for p in parts_for_anchors[ref['part']]):
                raise ValueError(f'Invalid cross-part related_anchors in finding {item["id"]}')
    hard = report.get('hard_fails')
    if not isinstance(hard,int) or hard < 0:
        raise ValueError('QA hard_fails nonnegative integer required')
    active_major = any(x['severity'] in ('HARD','MAJOR') for x in findings)
    true_ready = score >= 97 and hard == 0 and not active_major
    if expected == 'VERIFY' and true_ready:
        previous = state.get('qa_frozen_findings')
        if not previous or set(report.get('resolved_initial_findings', [])) != {f['id'] for f in previous}:
            raise ValueError('VERIFY READY requires resolved_initial_findings matching all frozen INITIAL QA IDs; no lost issues')
    if report['status']=='READY' and not true_ready:
        raise ValueError('QA READY invalid: score, hard fail or unresolved major')
    if report['status']!='READY' and true_ready:
        raise ValueError('QA should be READY when thresholds met; clarify ledger before saving')
    if expected == 'INITIAL' and report['status']=='MANUAL_REVIEW_REQUIRED':
        raise ValueError('MANUAL_REVIEW_REQUIRED only after one repair')
    if expected == 'VERIFY' and report['status']=='NOT_READY':
        raise ValueError('After one repair, unresolved verdict must be MANUAL_REVIEW_REQUIRED')
    if report['status']!='READY' and not findings:
        raise ValueError('Failed audit needs findings to justify score')
    return info


def cmd_check_qa(args):
    state=jsonload(args.state)
    report=jsonload(args.report)
    info=qa_validate(report, state, args.script)
    prior=state.get('latest_qa')
    report_digest = sha(Path(args.report).read_bytes())
    if prior and prior['phase']==report['phase'] and (prior['score']!=report['score'] or prior['status']!=report['status'] or prior['script_sha256']!=info['sha256'] or prior.get('report_sha256', report_digest) != report_digest):
        raise ValueError('QA phase already frozen for this manuscript; manual correction required, no repeated re-scoring')
    state['latest_qa']={'phase':report['phase'], 'status':report['status'], 'score':report['score'], 'script_sha256':info['sha256'], 'report_sha256': report_digest}
    if report['phase'] == 'INITIAL' and report['status'] == 'NOT_READY':
        state['qa_frozen_findings'] = report['findings']
        state['qa_frozen_digest'] = report_digest
    state['seo_gate_ready'] = report['status']=='READY'
    state['seo_ready'] = False
    jsonwrite(args.state,state)
    print('QA_GATE',report['phase'],report['status'],report['score'], 'repair_count',state['repair_count'])


def cmd_commit_repair(args):
    state=jsonload(args.state)
    if state['repair_count']!=0:
        raise ValueError('HARD LOCK: ONE_REPAIR ALREADY USED; further automatic editing forbidden')
    qa=state.get('latest_qa')
    if not qa or qa['phase']!='INITIAL' or qa['status']!='NOT_READY':
        raise ValueError('A frozen INITIAL NOT_READY QA must be registered before Step5')
    before=read_parts(args.before)
    if before['sha256']!=state['current_script_sha256'] or qa['script_sha256']!=before['sha256']:
        raise ValueError('Original script/hash/QA source mismatch')
    after=read_parts(args.after)
    if after['sha256']==before['sha256']:
        raise ValueError('Repair must actually change script content')
    proof = check_repair_scope(args.before, args.after, state.get('qa_frozen_findings'))
    state['repair_scope_proof'] = proof
    state['source_before_repair_sha256'] = before['sha256']
    state['repair_count']=1
    state['current_script_sha256']=after['sha256']
    state['current_script_file']=str(Path(args.after).name)
    state['latest_qa']=None
    state['seo_ready']=False
    state['seo_gate_ready']=False
    jsonwrite(args.state,state)
    print('ONE_REPAIR_COMMITTED',state['video_id'],'count=1','before',before['sha256'],'after',after['sha256'])


def cmd_ready(args):
    state=jsonload(args.state)
    report=jsonload(args.report)
    qa_validate(report,state,args.script)
    if report['status'] != 'READY' or not state.get('latest_qa') or state['latest_qa']['script_sha256']!=report['script_sha256'] or state['latest_qa']['status']!='READY' or state['latest_qa'].get('report_sha256') != sha(Path(args.report).read_bytes()):
        raise ValueError('SEO GATE BLOCKED: current QA READY must be registered for current exact script')
    print('SEO_GATE_OK',state['video_id'],report['score'],'repair_count',state['repair_count'])


def cmd_audit_repair(args):
    report = jsonload(args.initial_report)
    if report.get('phase') != 'INITIAL' or report.get('status') != 'NOT_READY':
        raise ValueError('Repair proof requires INITIAL NOT_READY QA')
    if read_parts(args.before)['sha256'] != report.get('script_sha256'):
        raise ValueError('Initial report is not tied to original script bytes')
    read_parts(args.after)
    print('REPAIR_SCOPE_PASS', json.dumps(check_repair_scope(args.before,args.after,report.get('findings')), ensure_ascii=False))


def cmd_check_seo(args):
    state = jsonload(args.state)
    report = jsonload(args.report)
    cmd_ready(args)
    text = load_text(args.seo)
    matches = list(re.finditer(r'(?m)^##\s+(0?[1-9]|10|11)[.\-]\s+', text))
    if [int(m.group(1)) for m in matches] != list(range(1,12)):
        raise ValueError('SEO must contain exactly 11 ordered numbered sections')
    sections = {int(m.group(1)): text[m.end():matches[i+1].start() if i<10 else len(text)] for i,m in enumerate(matches)}
    if state['title'] not in sections[1]:
        raise ValueError('SEO locked primary title missing from section 01')
    supporting = re.findall(r'(?m)^\*\*([AB])\.\*\*\s+.+$', sections[2])
    if supporting != ['A', 'B']:
        raise ValueError('SEO secondary titles must be exactly A and B in section 02')
    if not all(('**'+letter) in sections[9] for letter in ('A','B','C')):
        raise ValueError('SEO thumbnail A/B/C prompts missing')
    if not all(re.search(r'\b'+str(n)+r'\s*(?:s|segundos?)\b',sections[10],re.I) for n in (10,20,30)):
        raise ValueError('SEO trailers 10/20/30 seconds missing')
    if report['script_sha256'] not in sections[11]:
        raise ValueError('SEO fact check missing exact approved script SHA256')
    tag_text = sections[7].split('\n', 1)[-1].strip().split('\n\n')[0].strip()
    tag_entries = [t.strip() for t in tag_text.split(',') if t.strip()]
    if not 18 <= len(tag_entries) <= 28 or len(', '.join(tag_entries)) > 500:
        raise ValueError(f'SEO tag count or budget invalid: {len(tag_entries)} tags, {len(", ".join(tag_entries))} chars')
    state['seo_ready'] = True
    state['seo_sha256'] = sha(Path(args.seo).read_bytes())
    jsonwrite(args.state,state)
    print('SEO_PACKAGE_VALID', len(tag_entries), 'tags', len(', '.join(tag_entries)), 'chars')


def parser():
    p=argparse.ArgumentParser(description=__doc__)
    sub=p.add_subparsers(dest='cmd',required=True)
    x=sub.add_parser('init'); x.add_argument('--title-file',required=True); x.add_argument('--outline-file',required=True); x.add_argument('--state',required=True);x.set_defaults(fn=cmd_init)
    x=sub.add_parser('assemble');x.add_argument('--a',required=True);x.add_argument('--b',required=True);x.add_argument('--c',required=True);x.add_argument('--out',required=True);x.set_defaults(fn=cmd_assemble)
    x=sub.add_parser('check-script');x.add_argument('--script',required=True);x.add_argument('--state',required=True);x.set_defaults(fn=cmd_check_script)
    x=sub.add_parser('check-qa');x.add_argument('--script',required=True);x.add_argument('--state',required=True);x.add_argument('--report',required=True);x.set_defaults(fn=cmd_check_qa)
    x=sub.add_parser('commit-repair');x.add_argument('--before',required=True);x.add_argument('--after',required=True);x.add_argument('--state',required=True);x.set_defaults(fn=cmd_commit_repair)
    x=sub.add_parser('ready');x.add_argument('--script',required=True);x.add_argument('--state',required=True);x.add_argument('--report',required=True);x.set_defaults(fn=cmd_ready)
    x=sub.add_parser('audit-repair');x.add_argument('--before',required=True);x.add_argument('--after',required=True);x.add_argument('--initial-report',required=True);x.set_defaults(fn=cmd_audit_repair)
    x=sub.add_parser('check-seo');x.add_argument('--seo',required=True);x.add_argument('--script',required=True);x.add_argument('--report',required=True);x.add_argument('--state',required=True);x.set_defaults(fn=cmd_check_seo)
    return p


if __name__=='__main__':
    try:
        args=parser().parse_args();args.fn(args)
    except (ValueError,OSError,KeyError,json.JSONDecodeError) as exc:
        print('BLOCKED:',exc,file=sys.stderr);sys.exit(2)
