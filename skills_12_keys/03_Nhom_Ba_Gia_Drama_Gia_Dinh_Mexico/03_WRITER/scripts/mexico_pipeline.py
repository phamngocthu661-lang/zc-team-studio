#!/usr/bin/env python3
"""Mexican Family Drama V1.1 - deterministic artifact and editorial-evidence controls.
Does not evaluate literature, law, dialogue, or spelling: independent QA must do that.
No third-party packages required.
"""
import argparse, hashlib, json, os, re, sys, tempfile
from pathlib import Path

PART = re.compile(r'^\[PART ([1-7])\]$')
STAGES={'A':[1,2],'B':[3,4,5],'C':[6,7]}
VERSION='MXF1.1'

def sha(b):return hashlib.sha256(b).hexdigest()
def fail(msg):raise ValueError(msg)
def read(path):
 p=Path(path); b=p.read_bytes();s=b.decode('utf-8','strict')
 if b.startswith(b'\xef\xbb\xbf') or '\r' in s:fail(f'BOM/CRLF forbidden: {p}')
 return s,b

def write(path,blob):
 p=Path(path);p.parent.mkdir(parents=True,exist_ok=True)
 with tempfile.NamedTemporaryFile(dir=p.parent,delete=False) as f:f.write(blob);tmp=f.name
 os.replace(tmp,p)

def jread(path):return json.loads(Path(path).read_text(encoding='utf-8'))
def jwrite(path,obj):write(path,(json.dumps(obj,indent=2,ensure_ascii=False,sort_keys=True)+'\n').encode('utf-8'))

def identity(title,outline):
 _,ob=read(outline); osha=sha(ob);return {'title':title,'title_sha256':sha(title.encode('utf-8')),'title_sha12':sha(title.encode('utf-8'))[:12], 'outline_sha256':osha,'video_id':sha((title+'\n'+osha).encode('utf-8'))[:16]}

def title_lock(path):
 o=jread(path)
 title=o['CURRENT_FINAL_TITLE']
 if sha(title.encode())!=o.get('title_sha256') or len(title)>100:fail('Invalid locked title / hash / >100 characters')
 return title

def parse(text, expected=None, full=False):
 if not text.endswith('\n'):fail('Script/segment must finish with LF')
 h=[];body=[];each=[]
 for ln in text.splitlines(keepends=True):
  m=PART.fullmatch(ln.rstrip('\n'))
  if m:
   h.append(int(m.group(1)));each.append('')
  else:
   if not h:
    if ln.strip():fail('Non-heading text before first PART')
    else:fail('Blank content before first PART')
   body.append(ln);each[-1]+=ln
 if expected and h!=expected:fail(f'Headings must be {expected}, got {h}')
 if len(each)!=len(h) or any(len(x)<200 for x in each):fail('Missing/short PART')
 b=''.join(body)
 res={'headings':h,'part_characters':[len(x) for x in each], 'body_characters':len(b),'body_sha256':sha(b.encode('utf-8')),'body_words':len(b.split()),'count_rule':'Remove only exact standalone [PART N] heading lines; retain all prose punctuation and whitespace.'}
 if full and not 70000<=len(b)<=80000:fail(f'Length {len(b)} is outside 70000..80000')
 return res

def manifest_paths(directory,title):
 token=sha(title.encode())[:12]; prefix='MXF_'+token;root=Path(directory)
 return {'manifest':root/(prefix+'_SCRIPT_MANIFEST.json'),'full':root/(prefix+'_FULL_SCRIPT.txt'),**{s:root/(prefix+'_SCRIPT_'+s+'.txt') for s in STAGES}}

def cmd_lock_title(a):
 title=a.title.strip()
 if not title or len(title)>100:fail('Title must be nonempty and <=100 Unicode code points')
 o={'schema':'MXF_TITLE_V1','CURRENT_FINAL_TITLE':title,'title_sha256':sha(title.encode()),'title_sha12':sha(title.encode())[:12], 'source_title':a.source_title or '', 'editorial_scores_must_be_human_verified':True}
 jwrite(a.out,o);return {'PASS':True,'title_length':len(title),'output':str(a.out)}

def cmd_lock_outline(a):
 title=title_lock(a.title_lock);content,_=read(a.outline_file)
 if not content.strip():fail('Empty outline')
 for n in range(1,8):
  if f'[PART {n}]' not in content:fail(f'Outline missing [PART {n}]')
 o=identity(title,a.outline_file)
 o.update({'schema':'MXF_OUTLINE_V1','outline_path':str(Path(a.outline_file).resolve())})
 jwrite(a.out,o);return {'PASS':True,'video_id':o['video_id'],'output':str(a.out)}

def cmd_stage(a):
 title=title_lock(a.title_lock);idn=identity(title,a.outline_file);ps=manifest_paths(a.directory,title)
 stage=a.segment; p=ps[stage]
 if not p.is_file():fail(f'Create real prose segment first at {p}')
 s,b=read(p);meta=parse(s,STAGES[stage]);meta['file_sha256']=sha(b);meta['file_bytes']=len(b)
 if ps['manifest'].exists():
  man=jread(ps['manifest'])
  for key in ('video_id','title_sha256','outline_sha256'):
   if man.get(key)!=idn[key]:fail('Manifest source conflict: '+key)
  if stage in man['segments']:fail('Existing staged segment is LOCKED and cannot be overwritten')
  for old,proof in man['segments'].items():
   if sha(ps[old].read_bytes())!=proof['file_sha256']:fail('Previously locked segment mutated: '+old)
 else:
  if stage!='A':fail('Must stage A first')
  man={'schema':'MXF_SCRIPT_MANIFEST_V1',**idn,'segments':{}}
 if list(man['segments'])!=list(STAGES)[:len(man['segments'])]:fail('Stages out of order')
 if stage!=list(STAGES)[len(man['segments'])]:fail('Stages must be A then B then C')
 man['segments'][stage]=meta
 if stage=='C':
  full=b''.join(ps[x].read_bytes() for x in STAGES)
  counts=parse(full.decode('utf-8'),list(range(1,8)),True)
  write(ps['full'],full)
  man['full_script']={'file_sha256':sha(full),'body_characters':counts['body_characters'],'body_sha256':counts['body_sha256']}
 jwrite(ps['manifest'],man)
 return {'PASS':True,'staged':stage,'body_characters':meta['body_characters'],'full_script':str(ps['full']) if stage=='C' else None,'video_id':idn['video_id']}

def cmd_verify(a):
 s,b=read(a.script);out=parse(s,list(range(1,8)),True);out.update({'PASS':True,'file_sha256':sha(b),'file_bytes':len(b),'script':str(a.script)})
 if a.manifest:
  man=jread(a.manifest)
  if man.get('full_script',{}).get('file_sha256')!=sha(b):fail('Script mismatch with locked manifest')
 return out

def check_issues(issues,blob):
 allowed={'P0','P1','P2','P3'}; seen=set(); zones=[]
 for item in issues:
  code=item.get('id'); sev=item.get('severity'); st=item.get('start_byte');en=item.get('end_byte')
  if not code or code in seen:fail('Issue IDs must be unique');
  seen.add(code)
  if sev not in allowed:fail('Invalid severity '+str(sev))
  if not isinstance(st,int) or not isinstance(en,int) or st<0 or en>len(blob) or en<=st:fail('Invalid byte window '+str(code))
  if any(not item.get(k) for k in ('category','evidence','reason','acceptance_test')):fail('Issue missing evidence/reason/acceptance_test '+code)
  if item.get('expected_sha256')!=sha(blob[st:en]):fail('Window/source hash mismatch '+code)
  if re.search(rb'\[PART [1-7]\]',blob[st:en]):fail('Heading is protected: '+code)
  zones.append((st,en,code))
 for a,b in zip(sorted(zones),sorted(zones)[1:]):
  if b[0]<a[1]:fail('Overlapping windows')
 return True

def cmd_qa_freeze(a):
 s,b=read(a.script);p=parse(s,list(range(1,8)),True);obj=jread(a.issues)
 if obj.get('full_read_complete') is not True or obj.get('logic_checked') is not True or obj.get('spelling_checked_es_mx') is not True:fail('Independent QA must complete three check flags')
 issues=obj.get('issues')
 if not isinstance(issues,list) or not issues:fail('No repair issue? Use qa-final for direct READY; do not create repair plan')
 check_issues(issues,b)
 out={'schema':'MXF_QA_FROZEN_V1','baseline_file_sha256':sha(b),'baseline_body_sha256':p['body_sha256'],'baseline_body_characters':p['body_characters'],'repair_round':1,'max_repair_rounds':1,'issues':issues,'qa_is_independent':True,'full_read_complete':True,'logic_checked':True,'spelling_checked_es_mx':True}
 jwrite(a.out,out);return {'PASS':True,'issues':len(issues),'frozen_ledger':str(a.out)}

def cmd_repair(a):
 if not a.user_approved:fail('Explicit --user-approved required')
 if Path(a.script).resolve()==Path(a.out).resolve():fail('Cannot overwrite original script')
 if Path(a.proof).exists() or Path(a.out).exists():fail('ONE REPAIR ONLY: output/proof exists. Never repair again')
 if 'revised' in Path(a.script).name.lower():fail('Refuse revised manuscript as new repair baseline')
 s,b=read(a.script);before=parse(s,list(range(1,8)),True)
 lock=Path(a.script).parent/('.MXF_ONE_REPAIR_LOCK_'+sha(b)[:16]+'.json')
 if lock.exists():fail('ONE REPAIR ONLY: source has already been repaired (locked)')
 q=jread(a.qa_ledger)
 if q.get('schema')!='MXF_QA_FROZEN_V1' or q.get('repair_round')!=1 or q.get('max_repair_rounds')!=1:fail('Invalid QA frozen contract / second repair prohibited')
 if sha(b)!=q.get('baseline_file_sha256'):fail('Baseline changed after QA freeze')
 check_issues(q['issues'],b)
 repl=jread(a.replacements); mapping=repl.get('replacements')
 if not isinstance(mapping,dict) or set(mapping)!={x['id'] for x in q['issues']}:fail('Exactly one replacement per frozen issue required')
 chunks=[]; last=0;revised_offset=0;patch_positions=[]
 for issue in sorted(q['issues'],key=lambda x:x['start_byte']):
  st,en=issue['start_byte'],issue['end_byte']; new=mapping[issue['id']]
  if not isinstance(new,str) or not new.strip():fail('Empty replacement')
  nb=new.encode('utf-8');pre=b[last:st];chunks.extend((pre,nb));revised_start=revised_offset+len(pre);patch_positions.append({'issue_id':issue['id'],'revised_start_byte':revised_start,'revised_end_byte':revised_start+len(nb),'replacement_sha256':sha(nb)});revised_offset=revised_start+len(nb);last=en
 chunks.append(b[last:]); revised=b''.join(chunks)
 if revised==b:fail('No actual change')
 changed=revised.decode('utf-8','strict')
 after=parse(changed,list(range(1,8)),True)
 # Persist source-level lock. O_EXCL rejects a second patch with different output paths.
 lock_data=json.dumps({'source_sha256':sha(b),'repair_proof':str(Path(a.proof).resolve()),'max_repair_rounds':1,'used':1},ensure_ascii=False).encode('utf-8')
 try:
  fd=os.open(str(lock), os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o644)
 except FileExistsError:fail('ONE REPAIR ONLY: source lock already exists')
 with os.fdopen(fd,'wb') as lf:lf.write(lock_data)
 write(a.out,revised)
 proof={'schema':'MXF_ONE_REPAIR_PROOF_V1','repair_rounds_used':1,'repair_rounds_max':1,'source_sha256':sha(b),'revised_sha256':sha(revised),'source_body_characters':before['body_characters'],'revised_body_characters':after['body_characters'],'source_qa_ledger_sha256':sha(Path(a.qa_ledger).read_bytes()),'replacements_sha256':sha(Path(a.replacements).read_bytes()),'approved_issue_ids':[x['id'] for x in q['issues']],'patches':patch_positions,'immutable_spans_preserved':True,'ready_status':'NOT_EVALUATED_RETURN_TO_QA'}
 jwrite(a.proof,proof)
 return {'PASS':True,'revised_script':str(a.out),'proof':str(a.proof),'one_repair_used':True}

def verify_identity(a, script_sha, repair_proof=None):
 title=title_lock(a.title_lock)
 man=jread(a.manifest)
 if man.get('schema')!='MXF_SCRIPT_MANIFEST_V1' or man.get('title_sha256')!=sha(title.encode('utf-8')):
  fail('Title/manifest mismatch')
 original=man.get('full_script',{}).get('file_sha256')
 if not original:fail('Manifest does not contain assembled complete script')
 if repair_proof:
  proof=jread(repair_proof)
  if proof.get('source_sha256')!=original or proof.get('revised_sha256')!=script_sha or proof.get('repair_rounds_used')!=1:
   fail('Revised manuscript is not from this locked title+outline manifest')
 else:
  if original!=script_sha:fail('Script must match original manifest or one-repair proof')
 return man

# Structured evidence is an audit trail, not an automatic truth detector.
# The independent reviewer must populate it from the exact final manuscript.
DAY_RANK={'morning':1,'afternoon':2,'evening':3,'night':4,'unknown':0}

def editorial_audit(script_bytes, evidence, repair_proof=None):
    if evidence.get('schema')!='MXF_EDITORIAL_EVIDENCE_V1_1':fail('V1.1 editorial evidence schema required')
    if evidence.get('script_sha256')!=sha(script_bytes):fail('Editorial evidence points to another script')
    scenes=evidence.get('scenes')
    if not isinstance(scenes,list) or len(scenes)<21:fail('Provide >=21 independently reviewed scene anchors (typically 21-28)')
    scene_ids={}; seen_parts=set(); last_end=-1; findings=[]
    for i,ev in enumerate(scenes):
        sid=ev.get('scene_id');p=ev.get('part');st=ev.get('start_byte');en=ev.get('end_byte')
        if not sid or sid in scene_ids or p not in range(1,8):fail('Invalid scene id/part or duplicate scene id')
        if not isinstance(st,int) or not isinstance(en,int) or st<0 or en>len(script_bytes) or en<=st or st<last_end:
            fail('Scene byte anchors must be nonoverlapping and in manuscript order')
        scene_ids[sid]=ev; seen_parts.add(p);last_end=en
        if ev.get('time_of_day') not in DAY_RANK:fail('Scene time_of_day must be morning/afternoon/evening/night/unknown')
        day=ev.get('story_date')
        if not isinstance(day,str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',day):fail('Scene story_date must be ISO YYYY-MM-DD')
        # Validate date syntax rather than merely regex format.
        import datetime
        try:datetime.date.fromisoformat(day)
        except ValueError:fail('Invalid calendar date: '+day)
        snippet=ev.get('anchor_quote')
        if not isinstance(snippet,str) or len(snippet)<12 or snippet.encode('utf-8') not in script_bytes[st:en]:fail('Scene quote must occur in scene byte window')
        if not isinstance(ev.get('causal_change'),str) or len(ev['causal_change'].strip())<15:fail('Each scene must identify real causal change')
        if not isinstance(ev.get('known_to_narrator_after'),list):fail('Scene must record narrator knowledge changes')
        if i:
            prior=scenes[i-1]; pd=prior['story_date']; pt=prior['time_of_day']; now=ev['time_of_day']
            goes_back=(day<pd or (day==pd and now!='unknown' and pt!='unknown' and DAY_RANK[now]<DAY_RANK[pt]))
            if goes_back and not ev.get('flashback_explicitly_signaled'):
                findings.append({'id':'AUTO_TIMELINE_'+sid,'severity':'P1','category':'timeline','reason':'Manuscript-order scene moves backwards in story date/time without explicit flashback marker','scene_id':sid})
            if goes_back and ev.get('flashback_explicitly_signaled') and not ev.get('flashback_signal_quote'):
                findings.append({'id':'AUTO_SIGNAL_'+sid,'severity':'P1','category':'timeline','reason':'Flashback is declared but no textual signal provided','scene_id':sid})
        if ev.get('flashback_explicitly_signaled'):
            sig=ev.get('flashback_signal_quote','')
            if not sig or sig.encode('utf-8') not in script_bytes[st:en]:fail('Flashback signal must be real text within scene')
    if seen_parts!=set(range(1,8)):fail('Scene evidence must cover all 7 parts')
    # Check that anchor window actually belongs to claimed [PART N].
    cursor=0; current_part=None; ranges=[]
    for line in script_bytes.splitlines(keepends=True):
        m=re.fullmatch(rb'\[PART ([1-7])\]\n',line)
        if m:current_part=int(m.group(1))
        ranges.append((cursor,cursor+len(line),current_part));cursor+=len(line)
    import bisect
    range_starts=[x[0] for x in ranges]
    for ev in scenes:
        ix=bisect.bisect_right(range_starts,ev['start_byte'])-1
        if ix<0 or ranges[ix][2]!=ev['part']:fail('Scene anchor is in wrong PART: '+ev['scene_id'])
    fact_events=evidence.get('knowledge_facts')
    if not isinstance(fact_events,list) or len(fact_events)<1:fail('At least one knowledge fact/source trace required')
    facts={}
    for fact in fact_events:
        fid=fact.get('fact_id');first=fact.get('first_known_scene_id');who=fact.get('character')
        if not fid or fid in facts or first not in scene_ids or not who or not fact.get('source'):
            fail('Knowledge facts require unique id, character, first known scene, and source')
        facts[fid]=fact
    presentations=evidence.get('revelations')
    if not isinstance(presentations,list):fail('Revelations list is required (may be empty)')
    for rev in presentations:
        fid=rev.get('fact_id');sid=rev.get('scene_id')
        if fid not in facts or sid not in scene_ids:fail('Revelation references unknown fact/scene')
        if rev.get('perceived_as_new_by_character') is True:
            first=scene_ids[facts[fid]['first_known_scene_id']];target=scene_ids[sid]
            # Calendar date, then time if both are known. In uncertain cases reviewer must adjudicate.
            known_date=first['story_date'];reveal_date=target['story_date']
            is_earlier=(known_date<reveal_date or (known_date==reveal_date and DAY_RANK[first['time_of_day']]>0 and DAY_RANK[target['time_of_day']]>0 and DAY_RANK[first['time_of_day']]<DAY_RANK[target['time_of_day']]))
            if (is_earlier or facts[fid]['first_known_scene_id']==sid and rev.get('repeated_discovery')) and rev.get('character')==facts[fid]['character']:
                findings.append({'id':'AUTO_KNOWLEDGE_'+fid+'_'+sid,'severity':'P1','category':'knowledge','reason':'A fact already known to this character is staged as a new discovery','scene_id':sid})
    if not isinstance(evidence.get('orthography_review'),dict) or not evidence['orthography_review'].get('es_mx_full_pass'):
        findings.append({'id':'AUTO_ORTHOGRAPHY','severity':'P1','category':'orthography','reason':'No completed es-MX orthography pass'})
    if not isinstance(evidence.get('story_retention_review'),dict) or not evidence['story_retention_review'].get('non_repetitive_revelations_pass'):
        findings.append({'id':'AUTO_PACING','severity':'P2','category':'pacing','reason':'No verified nonrepetitive revelations review'})
    # Mandatory post-repair: source-local and surrounding-context review of EVERY patch.
    if repair_proof:
        patches=repair_proof.get('patches',[]); reviews=evidence.get('patch_reviews')
        if not isinstance(reviews,list) or len(reviews)!=len(patches):fail('Postrepair needs one semantic patch review per patch')
        byid={r.get('issue_id'):r for r in reviews}
        if set(byid)!={p['issue_id'] for p in patches}:fail('Patch review IDs must exactly match repair proof')
        for patch in patches:
            rev=byid[patch['issue_id']];st=patch['revised_start_byte'];en=patch['revised_end_byte']
            if sha(script_bytes[st:en])!=patch['replacement_sha256']:fail('Revised patch does not match proof byte region')
            # Anchored quotes must be in the surrounding 3000 bytes; no forged out-of-context claims.
            bef=rev.get('before_quote');aft=rev.get('after_quote')
            if not isinstance(bef,str) or not isinstance(aft,str) or len(bef)<12 or len(aft)<12 or bef.encode() not in script_bytes[max(0,st-3000):st] or aft.encode() not in script_bytes[en:min(len(script_bytes),en+3000)]:
                fail('Patch context quotes must be exact and within +/-3000 bytes')
            if not all(rev.get(k) is True for k in ('timeline_consistent','knowledge_consistent','adjacent_scenes_checked','spelling_consistent')):
                findings.append({'id':'AUTO_PATCH_'+patch['issue_id'],'severity':'P1','category':'post_repair','reason':'Patch has not passed mandatory context audit'})
    return findings

def cmd_review_evidence(a):
    s,b=read(a.script);parse(s,list(range(1,8)),True)
    ev=jread(a.evidence);proof=jread(a.repair_proof) if a.repair_proof else None
    findings=editorial_audit(b,ev,proof)
    return {'TECH_PASS':True,'structured_editorial_findings':findings,'EDITORIAL_TRUTH_AUTOMATICALLY_PROVEN':False,'script_sha256':sha(b)}

def cmd_qa_final(a):
    s,b=read(a.script);meta=parse(s,list(range(1,8)),True);report=jread(a.report)
    man=verify_identity(a,sha(b),a.repair_proof)
    if not a.repair_proof and (Path(a.script).parent/('.MXF_ONE_REPAIR_LOCK_'+sha(b)[:16]+'.json')).exists():fail('Original has already been repaired; audit revised artifact, not stale original')
    for flag in ['full_read_complete','logic_checked','spelling_checked_es_mx','continuity_checked','title_promise_checked','story_quality_pass','localization_pass']:
        if report.get(flag) is not True:fail('QA flag required: '+flag)
    if report.get('current_script_sha256')!=sha(b):fail('QA report does not match current script bytes')
    if report.get('score') is None or type(report['score']) not in (int,float) or not 0<=report['score']<=100:fail('Independent QA score 0..100 is required')
    unresolved=report.get('unresolved_issues')
    if not isinstance(unresolved,list):fail('unresolved_issues must be list')
    if not a.editorial_evidence:fail('V1.1 requires SHA-bound --editorial-evidence from independent complete reread')
    ev=jread(a.editorial_evidence)
    proof=jread(a.repair_proof) if a.repair_proof else None
    if proof and (proof.get('repair_rounds_used')!=1 or proof.get('revised_sha256')!=sha(b)):fail('Repair proof/current script mismatch')
    findings=editorial_audit(b,ev,proof)
    merged=unresolved+findings
    is_ready=report['score']>=98 and len(merged)==0
    out={'schema':'MXF_INDEPENDENT_QA_FINAL_V1_1','status':'READY' if is_ready else 'NOT_READY','score':report['score'],
        'TECH_PASS':True,'EDITORIAL_PASS':is_ready,'editorial_evidence_sha256':sha(Path(a.editorial_evidence).read_bytes()),
        'editorial_assessment_is_human_or_model_declared':True,
        'human_editor_reviewed':report.get('human_editor_reviewed') is True,
        'current_script_sha256':sha(b),'body_characters':meta['body_characters'],'unresolved_issues':merged,
        'full_read_complete':True,'logic_checked':True,'spelling_checked_es_mx':True,'continuity_checked':True,
        'title_promise_checked':True,'story_quality_pass':True,'localization_pass':True,
        'repair_rounds_used':1 if proof else 0,'repair_closed':bool(proof),
        'video_id':man['video_id'],'title_sha256':man['title_sha256'],'outline_sha256':man['outline_sha256']}
    jwrite(a.out,out);return {'PASS':True,'status':out['status'],'QA':str(a.out),'postrepair_findings':len(findings)}

def cmd_seo_gate(a):
    title=title_lock(a.title_lock);s,b=read(a.script);parse(s,list(range(1,8)),True)
    man=verify_identity(a,sha(b),a.repair_proof)
    if not a.repair_proof and (Path(a.script).parent/('.MXF_ONE_REPAIR_LOCK_'+sha(b)[:16]+'.json')).exists():fail('Source already repaired; SEO requires latest revised script')
    qa=jread(a.qa)
    if qa.get('schema')!='MXF_INDEPENDENT_QA_FINAL_V1_1' or qa.get('status')!='READY' or qa.get('score',0)<98 or qa.get('unresolved_issues')!=[] or qa.get('EDITORIAL_PASS') is not True or qa.get('TECH_PASS') is not True:fail('No matching V1.1 editorial QA READY')
    if qa.get('current_script_sha256')!=sha(b) or qa.get('video_id')!=man['video_id'] or qa.get('title_sha256')!=man['title_sha256'] or qa.get('outline_sha256')!=man['outline_sha256']:fail('Stale/misbound QA script or identity')
    if not qa.get('editorial_evidence_sha256'):fail('Missing evidence hash')
    if not all(qa.get(k) is True for k in ('full_read_complete','logic_checked','spelling_checked_es_mx','title_promise_checked','continuity_checked','story_quality_pass','localization_pass')):fail('Incomplete final QA')
    if a.editorial_evidence:
        if sha(Path(a.editorial_evidence).read_bytes())!=qa['editorial_evidence_sha256']:fail('Editorial evidence changed after QA')
    else:
        fail('V1.1 SEO must reverify --editorial-evidence file against QA hash')
    out={'schema':'MXF_SEO_GATE_V1_1','status':'PUBLISHING_GATE_PASS','TECH_PASS':True,'EDITORIAL_PASS':True,'primary_title':title,'script_sha256':sha(b),'QA_score':qa['score'],'editorial_evidence_sha256':qa['editorial_evidence_sha256'],'secondary_titles_allowed':2,'thumbnail_variations_allowed':3}
    jwrite(a.out,out);return {'PASS':True,'gate':str(a.out)}

def cmd_tts_export(a):
    s,b=read(a.script);meta=parse(s,list(range(1,8)),True)
    qa=jread(a.qa)
    if qa.get('schema')!='MXF_INDEPENDENT_QA_FINAL_V1_1' or qa.get('status')!='READY' or qa.get('current_script_sha256')!=sha(b):fail('TTS export requires exact V1.1 READY QA script')
    if Path(a.out).exists() or Path(a.out).resolve()==Path(a.script).resolve():fail('Refuse overwrite of TTS artifact or source')
    body=''.join(ln for ln in s.splitlines(keepends=True) if not PART.fullmatch(ln.rstrip('\n')))
    if len(body)!=meta['body_characters'] or sha(body.encode('utf-8'))!=meta['body_sha256']:fail('TTS extraction mismatched script body')
    write(a.out,body.encode('utf-8'))
    return {'PASS':True,'output':str(a.out),'body_characters':len(body),'tts_sha256':sha(body.encode('utf-8')),'removed_headings':7}

def run():
 p=argparse.ArgumentParser(description=__doc__); sub=p.add_subparsers(dest='cmd',required=True)
 def add(n,args):
  x=sub.add_parser(n)
  for name,opts in args:
   x.add_argument('--'+name.replace('_','-'),**opts)
  return x
 path={'required':True,'type':Path}
 add('lock-title',[('title',{'required':True}),('source_title',{'default':''}),('out',path)])
 add('lock-outline',[('title_lock',path),('outline_file',path),('out',path)])
 add('stage',[('title_lock',path),('outline_file',path),('directory',path),('segment',{'choices':list(STAGES),'required':True})])
 add('verify',[('script',path),('manifest',{'type':Path})])
 add('qa-freeze',[('script',path),('issues',path),('out',path)])
 add('repair',[('script',path),('qa_ledger',path),('replacements',path),('out',path),('proof',path),('user_approved',{'action':'store_true'})])
 add('qa-final',[('script',path),('report',path),('editorial_evidence',{'type':Path,'required':True}),('repair_proof',{'type':Path}),('title_lock',path),('manifest',path),('out',path)])
 add('review-evidence',[('script',path),('evidence',path),('repair_proof',{'type':Path})])
 add('seo-gate',[('script',path),('qa',path),('title_lock',path),('manifest',path),('repair_proof',{'type':Path}),('editorial_evidence',{'type':Path,'required':True}),('out',path)])
 add('tts-export',[('script',path),('qa',path),('out',path)])
 a=p.parse_args()
 try:
  result={'lock-title':cmd_lock_title,'lock-outline':cmd_lock_outline,'stage':cmd_stage,'verify':cmd_verify,'qa-freeze':cmd_qa_freeze,'repair':cmd_repair,'qa-final':cmd_qa_final,'review-evidence':cmd_review_evidence,'seo-gate':cmd_seo_gate,'tts-export':cmd_tts_export}[a.cmd](a)
  print(json.dumps(result,ensure_ascii=False,indent=2))
 except (ValueError,KeyError,TypeError,UnicodeError,OSError,IndexError) as e:
  print(json.dumps({'PASS':False,'ERROR':str(e)},ensure_ascii=False),file=sys.stderr);sys.exit(2)
if __name__=='__main__':run()
