#!/usr/bin/env python3
"""V1.1 deterministic aid: validates traceable per-Part audit evidence, rubric,
ages versus birth windows and high-risk dated-pregnancy flashback juxtaposition.
It flags ambiguities; it never pretends to replace a close editorial reading.
"""
import re

RUBRIC_LIMITS={'hook_title':10,'causality':20,'continuity_money_ownership':20,
               'mexico_reality':15,'es_mx_grammar_tts':15,'father_agency':10,
               'retention_closure':10}
HEADINGS=re.compile(r'(?m)^\[PART ([1-7])\]\n')
UNITS={0:'cero',1:'uno',2:'dos',3:'tres',4:'cuatro',5:'cinco',6:'seis',7:'siete',8:'ocho',9:'nueve',10:'diez',11:'once',12:'doce',13:'trece',14:'catorce',15:'quince',16:'dieciséis',17:'diecisiete',18:'dieciocho',19:'diecinueve',20:'veinte',21:'veintiuno',22:'veintidós',23:'veintitrés',24:'veinticuatro',25:'veinticinco',26:'veintiséis',27:'veintisiete',28:'veintiocho',29:'veintinueve'}
TENS={30:'treinta',40:'cuarenta',50:'cincuenta',60:'sesenta',70:'setenta',80:'ochenta',90:'noventa'}

def number_es(n):
 if n<30:return UNITS[n]
 if n<100:
  t=(n//10)*10;return TENS[t]+(' y '+UNITS[n%10] if n%10 else '')
 raise ValueError('Only numbers 0..99 accepted')

def year_es(y):
 if 1900<=y<=1999:return 'mil novecientos'+(' '+number_es(y%100) if y%100 else '')
 if 2000<=y<=2099:return 'dos mil'+(' '+number_es(y%100) if y%100 else '')
 return ''

def parts(text):
 starts=list(HEADINGS.finditer(text))
 if [int(m.group(1)) for m in starts]!=list(range(1,8)):
  raise ValueError('Expected 7 exact PART headers for evidence validation')
 return {i+1:text[m.end():starts[i+1].start() if i<6 else len(text)] for i,m in enumerate(starts)}

def check_review(text,review):
 issues=[]; parts_map=parts(text)
 rubric=review.get('rubric')
 if not isinstance(rubric,dict) or set(rubric)!=set(RUBRIC_LIMITS):
  issues.append('Missing/incomplete 7-category rubric; self-rated score alone is insufficient')
 else:
  for k,maximum in RUBRIC_LIMITS.items():
   if type(rubric[k]) not in (int,float) or not 0<=rubric[k]<=maximum:
    issues.append(f'Invalid rubric component {k}: max {maximum}')
  if all(type(v) in (int,float) for v in rubric.values()) and sum(rubric.values())!=review.get('score'):
   issues.append('Rubric sum does not match score')
 evidence=review.get('reviewer_evidence')
 if not isinstance(evidence,list):
  issues.append('Missing reviewer_evidence list');evidence=[]
 covered=set()
 for i,e in enumerate(evidence):
  if not isinstance(e,dict):issues.append(f'Bad evidence entry {i}');continue
  part=e.get('part','')
  m=re.fullmatch(r'Part ([1-7])',str(part));num=int(m.group(1)) if m else None
  if num is None:issues.append(f'Invalid evidence part {part}');continue
  anchor=e.get('anchor')
  if not isinstance(anchor,str) or len(anchor)<18 or anchor not in parts_map[num]:
   issues.append(f'Part {num}: source anchor missing or not in this Part')
  if not str(e.get('logic','')).strip() or not str(e.get('es_mx','')).strip():
   issues.append(f'Part {num}: missing logic or es_mx scrutiny note')
  covered.add(num)
 if covered!=set(range(1,8)):
  issues.append(f'Reviewer evidence missing Part(s): {sorted(set(range(1,8))-covered)}')
 chron=review.get('chronology')
 if not isinstance(chron,dict) or type(chron.get('reference_year'))!=int or not 1900<=chron['reference_year']<=2100 or not isinstance(chron.get('ages'),list) or not isinstance(chron.get('events'),list):
  issues.append('Missing structured chronology {reference_year,ages,events}; check adult-child births and flashbacks')
  return issues,[]
 refyear=chron['reference_year']; people={}
 if len(chron['ages'])<2:
  issues.append('Age ledger must cover elderly narrator and at least one family member; cannot omit ages to bypass flashback checks')
 for a in chron['ages']:
  if not isinstance(a,dict):issues.append('Bad age ledger entry');continue
  name=a.get('name');age=a.get('age');anchor=a.get('anchor','')
  if not isinstance(name,str) or not name or type(age)!=int or not 0<=age<=110 or not isinstance(anchor,str) or len(anchor)<8 or anchor not in text:
   issues.append('Age ledger requires name, age, exact quoted supporting anchor');continue
  people[name.lower()]=(name,age,refyear-age-1,refyear-age)
 if people and (not any(data[1]>=60 for data in people.values()) or not any(data[1]<60 for data in people.values())):
  issues.append('Age ledger must include protagonist 60+ and a separately aged younger family member')
 for evt in chron['events']:
  if not isinstance(evt,dict):issues.append('Bad dated event');continue
  name=str(evt.get('subject','')).lower();year=evt.get('year');typ=evt.get('type');anchor=evt.get('anchor','')
  if type(year)!=int or not isinstance(anchor,str) or len(anchor)<12 or anchor not in text:
   issues.append('Dated event requires exact source anchor + year');continue
  if name in people and typ in ('pregnancy','birth'):
   _,_,b0,b1=people[name]
   if (typ=='pregnancy' and not b0-1<=year<=b1) or (typ=='birth' and year not in (b0,b1)):
    issues.append(f'Chronological contradiction: {name} age implies birth {b0}/{b1}, but {typ} marked {year}')
 warnings=[]
 # High-recall suspicion only: the year preceding a pregnancy within the SAME
 # paragraph may be a contextual flashback rather than the pregnancy year itself.
 # Require QA to resolve this instead of silently auto-passing.
 for num,part_text in parts_map.items():
  for para in re.split(r'\n\s*\n',part_text):
   for low,(name,age,b0,b1) in people.items():
    pregnancy=re.search(r'embarazad[ao]\s+de\s+'+re.escape(name)+r'\b',para,re.IGNORECASE)
    if not pregnancy:continue
    prev=para[:pregnancy.start()]
    candidates=[]
    for y in range(max(1900,b0-50),min(2099,refyear)+1):
     for needle in (str(y),year_es(y)):
      if needle:
       for hit in re.finditer(re.escape(needle),prev,re.IGNORECASE):candidates.append((hit.start(),y))
    if candidates:
     _,y=max(candidates)
     if y>b1:
      warn_id=f'AGE_FLASHBACK_PART_{num}_{name.upper()}_{y}'
      warnings.append({'id':warn_id,'part':f'Part {num}','subject':name,
          'context_year':y,'possible_birth_years':[b0,b1],
          'anchor':para[pregnancy.start():pregnancy.end()],
          'why':'Pregnancy appears in same paragraph after a year later than implied birth. May be ambiguous; MUST be explicitly adjudicated.'})
 # A warning can be resolved only with evidence-based QA explanation.
 all_findings=review.get('findings',[])
 resolutions=review.get('chronology_resolutions',[])
 if not isinstance(resolutions,list):issues.append('chronology_resolutions must be list');resolutions=[]
 for w in warnings:
  listed=any(isinstance(x,dict) and x.get('classification') in ('TIMELINE','CONTINUITY') and
             (w['anchor'] in x.get('anchor','') or x.get('anchor','') in w['anchor'])
             for x in all_findings)
  resolved=any(isinstance(x,dict) and x.get('warning_id')==w['id'] and
      len(str(x.get('explanation','')).strip())>=40 and
      isinstance(x.get('supporting_anchor'),str) and len(x['supporting_anchor'])>=12 and
      x['supporting_anchor'] in text and
      any((str(y) in x['supporting_anchor'] or year_es(y) in x['supporting_anchor'].lower()) for y in range(b0-1,b1+1)) and
      re.search(r'\b(antes|anterior|previo|previa)\b',x['supporting_anchor'],re.IGNORECASE)
      for x in resolutions)
  if not (listed or resolved):issues.append(f'Unreviewed birth-year/flashback risk: {w["id"]}. Add real TIMELINE finding, or evidence-grounded chronology_resolutions.')
 return issues,warnings
