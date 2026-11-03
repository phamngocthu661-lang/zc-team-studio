#!/usr/bin/env python3
"""PADRE MX V1.1 separate content QA: SEO TXT/MD vs persisted source.
Mechanical checks only, not actual CTR, impressions or visual rendering.
"""
import argparse,json,re,sys
from pathlib import Path

def check(package,script,title,minimum=450,maximum=500):
 md=package.read_text(encoding='utf-8')
 story=script.read_text(encoding='utf-8')
 errs=[];stats={}
 if f'**{title}**' not in md:
  errs.append('Primary LOCKED_TITLE does not exactly appear as bold title in package')
 if len(title)>100:errs.append('Locked primary title >100 Unicode codepoints')
 alt=re.findall(r'^- \*\*([AB]):\*\*\s*(.+?)\s*$',md,re.M)
 if len(alt)!=2 or [x[0] for x in alt]!=['A','B']:
  errs.append('Expected exactly A/B 2 secondary titles')
 for name,t in alt:
  if len(t)>100:errs.append(f'Secondary title {name} >100 Unicode chars')
 stats['secondary_title_lengths']={k:len(v) for k,v in alt}
 match=re.search(r'^##\s+Etiquetas[^\n]*\n\s*\n([^\n]+)',md,re.M|re.I)
 if not match:errs.append('Cannot find one dedicated comma-separated tags line')
 else:
  tags=match.group(1).strip();stats['tags_chars']=len(tags)
  if not minimum<=len(tags)<=maximum:
   errs.append(f'Tags length {len(tags)} out of target {minimum}..{maximum}')
  if len(tags.split(','))<10:errs.append('Tags have fewer than 10 topic phrases')
 for code in 'ABC':
  if not re.search(r'^##\s+Miniatura '+code+r'\b',md,re.M|re.I):errs.append('Missing thumbnail '+code)
 if len(re.findall(r'\*\*Prompt 16:9:\*\*',md))!=3:errs.append('Three distinct 16:9 image prompts not found')
 if not re.search(r'^##\s+PROMISE_TO_SCENE_MAP',md,re.M):errs.append('No source-backed scene map')
 else:
  chunk=md.split('## PROMISE_TO_SCENE_MAP',1)[1].split('\n## ',1)[0]
  refs=re.findall(r'^\|[^\n]*\|\s*[1-7]\s*\|\s*([«“][^\n|]+[»”])\s*\|\s*$',chunk,re.M)
  stats['verified_quote_rows']=len(refs)
  if len(refs)<3:errs.append('Less than 3 scene quote rows in PROMISE_TO_SCENE_MAP')
  for quote in refs:
   if quote.strip('«»“” ') not in story:errs.append('PROMISE_TO_SCENE_MAP contains quote not verbatim in story: '+quote[:90])
 return {'pass':not errs,'failures':errs,'metrics':stats}

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--package',type=Path,required=True);a.add_argument('--script',type=Path,required=True);a.add_argument('--title',required=True);a.add_argument('--min-tags',type=int,default=450);a.add_argument('--max-tags',type=int,default=500);ns=a.parse_args()
 try:r=check(ns.package,ns.script,ns.title,ns.min_tags,ns.max_tags)
 except (OSError,ValueError,UnicodeError) as e:r={'pass':False,'failures':[str(e)]}
 print(json.dumps(r,ensure_ascii=False,indent=2));sys.exit(0 if r['pass'] else 2)
