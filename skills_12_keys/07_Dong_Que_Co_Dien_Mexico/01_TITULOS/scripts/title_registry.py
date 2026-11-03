#!/usr/bin/env python3
"""Small reusable Spanish title-history ledger, CSV (standard-library only).

Fuzzy lexical detection is an early warning, not a semantic same-premise judge.
"""
import argparse
import csv
import re
import unicodedata
from pathlib import Path

FIELDS=['video_id','title','premise_fingerprint','status']


def canonical(t):
    t=''.join(x for x in unicodedata.normalize('NFKD',t.lower()) if not unicodedata.combining(x))
    return ' '.join(re.findall(r'\w+',t))


def tokens(t):
    stop={'el','la','los','las','un','una','y','de','del','para','en','a','que','lo','su','sus','se','por','con','sin','hasta','pero','cuando','nadie','ella','él'}
    return set(canonical(t).split())-stop


def similarity(a,b):
    a,b=tokens(a),tokens(b)
    return len(a & b) / len(a | b) if a or b else 1.0


def main():
    p=argparse.ArgumentParser();p.add_argument('--file',required=True);p.add_argument('--check',required=True);p.add_argument('--add',action='store_true');p.add_argument('--video-id',default='');p.add_argument('--fingerprint',default='');p.add_argument('--status',default='SEO');a=p.parse_args()
    path=Path(a.file)
    if path.exists():
        with path.open(encoding='utf-8',newline='') as f:
            rows=list(csv.DictReader(f))
    else:
        rows=[]
    clashes=[(r.get('title',''),round(similarity(a.check,r.get('title','')),3),r.get('premise_fingerprint','')) for r in rows if canonical(r.get('title',''))==canonical(a.check) or similarity(a.check,r.get('title',''))>=0.62 or (a.fingerprint and canonical(a.fingerprint)==canonical(r.get('premise_fingerprint','')))]
    if clashes:
        for title,sim,premise in clashes:print('REVIEW_DUPLICATE',sim,title,'fingerprint:',premise)
        raise SystemExit(3)
    print('NO_LEXICAL_DUPLICATE_FOUND — semantic review still required')
    if a.add:
        path.parent.mkdir(parents=True,exist_ok=True)
        with path.open('a',encoding='utf-8',newline='') as f:
            w=csv.DictWriter(f,fieldnames=FIELDS)
            if not rows:w.writeheader()
            w.writerow({'video_id':a.video_id,'title':a.check,'premise_fingerprint':a.fingerprint,'status':a.status})

if __name__=='__main__':main()
