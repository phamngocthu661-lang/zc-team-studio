#!/usr/bin/env python3
"""Read-only, deterministic narrative diagnostics for 7-Part DADUS prose.

This instrument measures observables only: Part lengths, words, dialogue,
large unbroken prose paragraphs, exact repeated sentences, and literal
setting anchors. It NEVER edits script, claims CTR/retention, or awards QA READY.

Usage:
 python narrative_diagnostics.py FULL_SCRIPT.txt --expected-location Columbus --out RETENTION_DIAGNOSTICS.json
"""
from pathlib import Path
from collections import Counter
import argparse
import hashlib
import json
import re
import sys

HEADING = re.compile(r'^\[PART ([1-7])\]$')
WEIGHTS = [15, 14, 13, 15, 15, 16, 12]
WORDS = re.compile(r"\b[\w]+(?:[’'-][\w]+)*\b", re.UNICODE)


def diagnose(path, locations):
    source = Path(path)
    raw = source.read_bytes()
    txt = raw.decode('utf-8', errors='strict')
    errors = []
    if raw.startswith(b'\xef\xbb\xbf'):
        errors.append('UTF-8 BOM present')
    if '\r' in txt:
        errors.append('CR/CRLF detected; expected LF')
    parts = {}
    order = []
    current = None
    for line in txt.splitlines(keepends=True):
        m = HEADING.fullmatch(line.rstrip('\r\n'))
        if m:
            current = int(m.group(1))
            order.append(current)
            parts[current] = ''
        elif current is None:
            if line.strip():
                errors.append('Prose before PART 1')
        else:
            parts[current] += line
    if order != list(range(1, 8)):
        errors.append(f'Invalid sequence {order}; seven [PART N] headings required')
    if not errors:
        body = ''.join(parts[i] for i in range(1, 8))
        total_chars = len(body)
        total_words = len(WORDS.findall(body))
        breakdown = []
        for idx in range(1, 8):
            x = parts[idx]
            chars = len(x)
            words = len(WORDS.findall(x))
            share = round(100 * chars / total_chars, 2) if total_chars else 0
            expected_share = WEIGHTS[idx - 1]
            paragraphs = [s.strip() for s in re.split(r'\n\s*\n', x) if s.strip()]
            unbroken = []
            for para_idx, paragraph in enumerate(paragraphs, 1):
                n = len(WORDS.findall(paragraph))
                if n >= 180 and not ('"' in paragraph or '“' in paragraph or '”' in paragraph):
                    unbroken.append({'paragraph': para_idx, 'words': n})
            breakdown.append({
                'part': idx, 'characters': chars, 'words': words, 'share_percent': share,
                'soft_target_percent': expected_share,
                'over_or_under_soft_target_percentage_points': round(share - expected_share, 2),
                'long_non_dialogue_paragraphs': unbroken[:15]
            })
        first_words = WORDS.findall(parts[1])
        # Exact repeated whole sentence is a warning. Intentional refrain is allowed.
        sentences = []
        for idx in range(1, 8):
            for part_sent in re.split(r'(?<=[.!?])\s+', parts[idx].replace('\n', ' ')):
                norm = re.sub(r'\s+', ' ', part_sent.strip()).strip('"“” ')
                if len(WORDS.findall(norm)) >= 12:
                    sentences.append((norm, idx))
        counts = Counter(s.lower() for s, _ in sentences)
        repeated = []
        for unique_sentence, times in counts.most_common():
            if times < 2: break
            indices = sorted({part for sent, part in sentences if sent.lower() == unique_sentence})
            repeated.append({'sentence': unique_sentence[:220], 'occurrences': times, 'parts': indices})
            if len(repeated) >= 30: break
        anchors = []
        for item in locations:
            token = item.strip()
            if not token: continue
            pat = re.compile(r'(?<!\w)' + re.escape(token) + r'(?!\w)', re.IGNORECASE)
            locations_found = [idx for idx in range(1, 8) if pat.search(parts[idx])]
            anchors.append({'expected': token, 'literal_occurrences': len(pat.findall(body)),
                            'parts_with_mentions': locations_found, 'found': bool(locations_found)})
        flags = []
        if sum(p['share_percent'] for p in breakdown[:2]) > 35:
            flags.append('First two Parts occupy >35% of body; manually review whether setup is overlong')
        if sum(p['share_percent'] for p in breakdown[5:]) < 22:
            flags.append('Final two Parts occupy <22% of body; manually review consequence/aftershock space')
        for p in breakdown:
            if abs(p['over_or_under_soft_target_percentage_points']) > 5:
                flags.append(f'Part {p["part"]} more than 5 percentage points from soft story arc target')
        if repeated:
            flags.append('Found exact repeated long sentences; verify whether intentional callbacks')
        if any(not x['found'] for x in anchors):
            flags.append('Some expected city/state anchors absent as literal strings (may still be present semantically)')
        if any(p['long_non_dialogue_paragraphs'] for p in breakdown):
            flags.append('Long non-dialogue paragraphs detected; inspect manually for exposition density')
        result = {
            'tool': 'DADUS_V1_1_NARRATIVE_DIAGNOSTICS_READ_ONLY',
            'scope': 'Observable text features only. NO automated literary quality, originality, CTR or audience retention score.',
            'source_path': str(source.resolve()),
            'source_sha256': hashlib.sha256(raw).hexdigest(),
            'source_bytes': len(raw), 'headings': order,
            'total_body_chars': total_chars, 'total_words_regex': total_words,
            'first_150_words': ' '.join(first_words[:150]),
            'parts': breakdown, 'repeated_exact_long_sentences': repeated,
            'expected_locations': anchors, 'review_flags': flags, 'errors': errors,
            'structural_pass': True
        }
    else:
        result = {'tool': 'DADUS_V1_1_NARRATIVE_DIAGNOSTICS_READ_ONLY',
                  'source_path': str(source.resolve()),
                  'source_sha256': hashlib.sha256(raw).hexdigest(),
                  'headings': order, 'errors': errors, 'structural_pass': False}
    return result


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('script', type=Path)
    ap.add_argument('--expected-location', action='append', default=[], dest='locations')
    ap.add_argument('--out', type=Path)
    args = ap.parse_args()
    try:
        result = diagnose(args.script, args.locations)
        rendered = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
        if args.out:
            if args.out.resolve() == args.script.resolve():
                raise ValueError('Diagnostic output MUST NOT overwrite manuscript')
            args.out.parent.mkdir(parents=True, exist_ok=True)
            args.out.write_text(rendered, encoding='utf-8')
        print(rendered, end='')
        return 0 if result['structural_pass'] else 2
    except (OSError, UnicodeError, ValueError) as exc:
        print(json.dumps({'error': str(exc), 'structural_pass': False}, ensure_ascii=False))
        return 2


if __name__ == '__main__':
    sys.exit(main())
