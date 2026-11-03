#!/usr/bin/env python3
"""MEXICO CELEBRITY V1.1: structural file-integrity utilities, NOT factual auditing."""
import argparse, hashlib, json, pathlib, re, sys, tempfile, os, datetime

def die(msg):
    raise ValueError(msg)

def sha_bytes(b): return hashlib.sha256(b).hexdigest()
def filebytes(path): return pathlib.Path(path).read_bytes()
def text_bytes(b):
    try: return b.decode('utf-8')
    except UnicodeDecodeError: die('NOT_UTF8: input must be valid UTF-8 bytes')
def iso_now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def save_new(p,b):
    path=pathlib.Path(p)
    path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists(): die(f'FILE_EXISTS_NO_OVERWRITE: {path}')
    with path.open('xb') as f: f.write(b)
def save_json_new(path,x):save_new(path,(json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
def update_json_atomic(path,x):
    p=pathlib.Path(path); b=(json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode('utf8')
    with tempfile.NamedTemporaryFile(dir=p.parent,delete=False) as tf:
        tf.write(b);tmp=tf.name
    os.replace(tmp,p)
def load_json(path):
    obj=json.loads(pathlib.Path(path).read_text(encoding='utf-8'))
    return obj

def chapter_ids(text):
    return [int(m.group(1)) for m in re.finditer(r'(?m)^PARTE\s+([1-7])\s*$',text)]

def body_text(text):
    return '\n'.join(line for line in text.replace('\r\n','\n').split('\n') if not re.fullmatch(r'PARTE\s+[1-7]\s*',line))

def facts(data):
    txt=text_bytes(data)
    headings=chapter_ids(txt)
    return {'sha256':sha_bytes(data),'file_bytes':len(data),'total_chars':len(txt), 'body_chars':len(body_text(txt)), 'body_words':len(body_text(txt).split()),'heading_ids':headings,'has_crlf': '\r' in txt,'has_nul':'\x00' in txt}

def gate_script(data, min_chars=40000,max_chars=49000):
    f=facts(data)
    errors=[]
    if f['heading_ids']!=list(range(1,8)):errors.append('REQUIRED_ORDERED_SEVEN_PART_HEADINGS')
    if f['body_chars']<min_chars:errors.append(f'BODY_TOO_SHORT:{f["body_chars"]}<{min_chars}')
    if f['body_chars']>max_chars:errors.append(f'BODY_TOO_LONG:{f["body_chars"]}>{max_chars}')
    if f['has_crlf'] or f['has_nul']:errors.append('ENCODING_OR_NEWLINE_ERROR')
    return dict(f,ok=not errors,errors=errors)

def gate_stage(data, ids):
    txt=text_bytes(data)
    if chapter_ids(txt)!=ids:die(f'STAGE_HEADINGS expected {ids}, found {chapter_ids(txt)}')
    if not txt.endswith('\n\n'):die('STAGE_END_NEEDS_DOUBLE_LF to concatenate exact bytes')
    if '\r' in txt or '\x00' in txt:die('BAD_LINE_ENDINGS')

def cmd_title(a):
    title=a.text if a.text is not None else pathlib.Path(a.title_file).read_text(encoding='utf8').rstrip('\n')
    if title!=title.strip() or '\n' in title:die('BAD_TITLE_WHITESPACE')
    payload={'title':title,'characters':len(title),'limit':a.max_chars,'sha12':sha_bytes(title.encode('utf8'))[:12],'pass':len(title)<=a.max_chars}
    print(json.dumps(payload,ensure_ascii=False,indent=2))
    if not payload['pass']:sys.exit(2)

def cmd_count(a):print(json.dumps(facts(filebytes(a.file)),ensure_ascii=False,indent=2))
def cmd_verify_script(a):
    r=gate_script(filebytes(a.file),a.min_chars,a.max_chars)
    print(json.dumps(r,ensure_ascii=False,indent=2))
    if not r['ok']:sys.exit(2)

def cmd_manifest(a):
    title=pathlib.Path(a.title_file).read_text(encoding='utf8').rstrip('\r\n')
    if not title:die('EMPTY_TITLE')
    outline_b=filebytes(a.outline_file)
    out_sha=sha_bytes(outline_b)
    v_id=sha_bytes((title+'\n'+out_sha).encode('utf8'))[:16]
    d={'schema':'MEXICO_SCRIPT_MANIFEST_V1','locked_title':title,'title_sha12':sha_bytes(title.encode('utf8'))[:12], 'outline_sha256':out_sha,'video_id':v_id,'source_outline':str(a.outline_file),'created_utc':iso_now()}
    save_json_new(a.out,d);print(json.dumps(d,ensure_ascii=False,indent=2))

def cmd_assemble(a):
    man=load_json(a.manifest)
    if man.get('schema')!='MEXICO_SCRIPT_MANIFEST_V1':die('WRONG_MANIFEST_SCHEMA')
    title=pathlib.Path(a.title_file).read_text(encoding='utf-8').rstrip('\r\n')
    outline_sha=sha_bytes(filebytes(a.outline_file))
    if man.get('locked_title')!=title or man.get('outline_sha256')!=outline_sha:die('TITLE_OR_OUTLINE_IDENTITY_MISMATCH')
    for n,vals in [('a',[1,2]),('b',[3,4,5]),('c',[6,7])]:gate_stage(filebytes(getattr(a,n)),vals)
    all_bytes=b''.join(filebytes(getattr(a,n)) for n in ['a','b','c'])
    report=gate_script(all_bytes,a.min_chars,a.max_chars)
    if not report['ok']:die('ASSEMBLE_LENGTH_STRUCTURE_GATE: '+','.join(report['errors']))
    save_new(a.out,all_bytes)
    report.update(video_id=man['video_id'],outline_sha256=outline_sha,source_segments={n:sha_bytes(filebytes(getattr(a,n))) for n in ['a','b','c']})
    print(json.dumps(report,ensure_ascii=False,indent=2))

def repair_lock_path(source, sha):
    return pathlib.Path(source).resolve().parent / ('.MEXICO_REPAIR_'+sha[:20]+'.lock.json')

def cmd_repair_init(a):
    b=filebytes(a.source); f=facts(b)
    if f['heading_ids']!=list(range(1,8)):die('NOT_SEVEN_PART_BASELINE')
    lock_path=repair_lock_path(a.source,f['sha256'])
    if lock_path.exists():die('BASELINE_REPAIR_ALREADY_INITIALIZED: cannot reset one-shot state')
    if pathlib.Path(a.state).exists():die('STATE_ALREADY_EXISTS')
    st={'schema':'MEXICO_REPAIR_STATE_V1','baseline_sha256':f['sha256'],'baseline_bytes':len(b),'used':False,'batch_count':0,'created_utc':iso_now(),'lock_file':str(lock_path)}
    save_json_new(lock_path,{'baseline_sha256':f['sha256'],'state_file':str(pathlib.Path(a.state).resolve()),'used':False})
    save_json_new(a.state,st)
    print(json.dumps(st,ensure_ascii=False,indent=2))

def validate_patches(patches,orig,maxbytes):
    if not isinstance(patches,list) or not patches:die('PATCHES_MUST_BE_NONEMPTY_LIST')
    req={'issue_id','start_byte','end_byte','replacement'}
    oldpos=0;ids=set(); out=bytearray(); records=[]
    for p in patches:
        if not isinstance(p,dict) or not req.issubset(p):die('INVALID_PATCH_SCHEMA')
        start,end,rep=p['start_byte'],p['end_byte'],p['replacement'];issue=p['issue_id']
        if not isinstance(start,int) or isinstance(start,bool) or not isinstance(end,int) or isinstance(end,bool) or not isinstance(rep,str) or not isinstance(issue,str) or not issue.strip():die('INVALID_PATCH_VALUES')
        if issue in ids:die('DUPLICATE_ISSUE_ID')
        ids.add(issue)
        if not (oldpos<=start<end<=len(orig)):die('UNSORTED_OVERLAPPING_OR_EMPTY_WINDOW')
        if end-start>maxbytes:die('PATCH_WINDOW_TOO_LARGE')
        # confirm offset boundaries align with UTF8 codepoints
        text_bytes(orig[:start]); text_bytes(orig[:end]);text_bytes(orig[start:end])
        if 'expected_original' in p and p['expected_original']!=text_bytes(orig[start:end]):die('ORIGINAL_ANCHOR_MISMATCH')
        out.extend(orig[oldpos:start]);rb=rep.encode('utf8');out.extend(rb)
        records.append({'issue_id':issue,'start_byte':start,'end_byte':end,'original_sha256':sha_bytes(orig[start:end]),'replacement_sha256':sha_bytes(rb)})
        oldpos=end
    out.extend(orig[oldpos:])
    return bytes(out),records

def cmd_repair_apply(a):
    state=load_json(a.state)
    if state.get('schema')!='MEXICO_REPAIR_STATE_V1':die('WRONG_STATE_SCHEMA')
    if state.get('used') or state.get('batch_count')!=0:die('REPAIR_ALREADY_USED: second edit prohibited')
    orig=filebytes(a.source)
    lock_path=repair_lock_path(a.source,state.get('baseline_sha256',''))
    if str(lock_path)!=state.get('lock_file') or not lock_path.exists():die('REPAIR_LOCK_MISSING_OR_MISMATCH')
    lk=load_json(lock_path)
    if lk.get('baseline_sha256')!=state.get('baseline_sha256') or lk.get('used') or lk.get('state_file')!=str(pathlib.Path(a.state).resolve()):die('REPAIR_LOCK_INVALID_OR_CONSUMED')
    if sha_bytes(orig)!=state.get('baseline_sha256'):die('BASELINE_SHA256_MISMATCH')
    patch_bytes=filebytes(a.patches)
    output,records=validate_patches(json.loads(text_bytes(patch_bytes)),orig,a.max_window_bytes)
    source_h=facts(orig);final_h=facts(output)
    if source_h['heading_ids']!=final_h['heading_ids'] or final_h['heading_ids']!=list(range(1,8)):die('PATCH_MUTATED_CHAPTER_HEADINGS')
    if final_h['body_chars']<a.min_chars or final_h['body_chars']>a.max_chars:die('REVISED_LENGTH_GATE_FAIL')
    if final_h['has_crlf'] or final_h['has_nul']:die('ENCODING_OR_NEWLINE_ERROR')
    if pathlib.Path(a.out).exists() or pathlib.Path(a.proof).exists():die('OUTPUT_ALREADY_EXISTS')
    proof={'schema':'MEXICO_ONE_SHOT_REPAIR_PROOF_V1','baseline_sha256':source_h['sha256'],'revised_sha256':final_h['sha256'], 'patches_sha256':sha_bytes(patch_bytes),'patch_count':len(records),'patches':records,'repair_used':True,'batch_count':1,'revised_body_chars':final_h['body_chars'],'part_headings':final_h['heading_ids'],'timestamp_utc':iso_now(),'outside_windows_unchanged':True}
    save_new(a.out,output);save_json_new(a.proof,proof)
    state['used']=True;state['batch_count']=1;state['revised_sha256']=final_h['sha256'];state['proof_sha256']=sha_bytes(filebytes(a.proof));state['completed_utc']=iso_now()
    update_json_atomic(a.state,state)
    lk['used']=True;lk['revised_sha256']=final_h['sha256'];lk['completed_utc']=iso_now()
    update_json_atomic(lock_path,lk)
    print(json.dumps(proof,ensure_ascii=False,indent=2))

def cmd_repair_verify(a):
    proof=load_json(a.proof);st=load_json(a.state)
    r={'ok': proof.get('schema')=='MEXICO_ONE_SHOT_REPAIR_PROOF_V1' and st.get('used') is True and st.get('batch_count')==1 and st.get('revised_sha256')==sha_bytes(filebytes(a.script))==proof.get('revised_sha256') and st.get('baseline_sha256')==proof.get('baseline_sha256') and sha_bytes(filebytes(a.proof))==st.get('proof_sha256') and load_json(st.get('lock_file')) .get('used') is True, 'script_sha256':sha_bytes(filebytes(a.script)),'repair_used':st.get('used'),'batch_count':st.get('batch_count')}
    print(json.dumps(r,ensure_ascii=False,indent=2))
    if not r['ok']:sys.exit(2)

def cmd_seo_check(a):
    qa=load_json(a.qa);h=sha_bytes(filebytes(a.script));issues=qa.get('blocking_issues')
    ok=qa.get('status')=='PASS_READY' and isinstance(qa.get('score'),int) and qa['score']>=97 and qa['score']<=100 and qa.get('script_sha256')==h and issues==[] and isinstance(qa.get('repair_used'),bool)
    if a.title_file:
        title=pathlib.Path(a.title_file).read_text(encoding='utf8').rstrip('\r\n')
        ok=ok and qa.get('title_sha12')==sha_bytes(title.encode('utf8'))[:12]
    r={'ok':bool(ok),'status':qa.get('status'),'score':qa.get('score'),'script_sha256':h,'qa_script_sha256':qa.get('script_sha256'),'blocking_issues':issues,'warning':'Only metadata/hash/score checked; does not substantiate QA or real-world truth.'}
    print(json.dumps(r,ensure_ascii=False,indent=2))
    if not ok:sys.exit(2)


# V1.1 STRICT RELEASE COMMANDS. These check file provenance only; factual accuracy
# and native-language editorial judgments still require actual source review.
def cjson(path): return load_json(path)
def must(condition,message):
    if not condition: die(message)
def script_part_counts(data):
    txt=text_bytes(data)
    spans=list(re.finditer(r'(?m)^PARTE\s+([1-7])\s*$',txt))
    return [{'part':int(m.group(1)),'chars':len(txt[m.end():spans[i+1].start() if i+1<len(spans) else len(txt)]),'words':len(txt[m.end():spans[i+1].start() if i+1<len(spans) else len(txt)].split())} for i,m in enumerate(spans)]
def patch_replay_verify(baseline,patched,patches,proof=None):
    output,recs=validate_patches(patches,baseline,2000)
    must(output==patched,'REPAIR_OUTSIDE_APPROVED_WINDOWS_OR_MISSING_PATCH')
    if proof is not None:
        must(proof.get('schema')=='MEXICO_ONE_SHOT_REPAIR_PROOF_V1','BAD_REPAIR_PROOF_SCHEMA')
        must(proof.get('baseline_sha256')==sha_bytes(baseline),'WRONG_BASELINE_IN_PROOF')
        must(proof.get('revised_sha256')==sha_bytes(patched),'WRONG_REVISED_SHA_IN_PROOF')
        must(proof.get('repair_used') is True and proof.get('batch_count')==1,'REPAIR_BATCH_LIMIT_VIOLATION')
        must(proof.get('patch_count')==len(recs),'PATCH_COUNT_MISMATCH')
        must(proof.get('patches')==recs,'PATCH_PROOF_RECORD_MISMATCH')
        must(proof.get('outside_windows_unchanged') is True,'NO_OUTSIDE_WINDOW_ASSERTION')
        must(proof.get('revised_body_chars')==facts(patched)['body_chars'],'REPAIR_PROOF_BODY_CHARS_MISMATCH')
    return {'ok':True,'patch_count':len(recs),'baseline_sha256':sha_bytes(baseline),'revised_sha256':sha_bytes(patched),'outside_windows_unchanged':True}
def portable_repair_check(root):
    root=pathlib.Path(root)
    baseline=root/'FULL_SCRIPT.txt'; revised=root/'FULL_SCRIPT_REVISED.txt';proofpath=root/'REPAIR_PROOF.json';stpath=root/'REPAIR_STATE.json';patchpath=root/'QA_PATCHES.json'
    must(all(p.exists() for p in (baseline,revised,proofpath,stpath,patchpath)),'INCOMPLETE_REPAIR_ARTIFACTS')
    st=cjson(stpath); pf=cjson(proofpath); pbytes=filebytes(patchpath)
    must(st.get('schema')=='MEXICO_REPAIR_STATE_V1','INVALID_REPAIR_STATE_SCHEMA')
    must(st.get('used') is True and st.get('batch_count')==1,'REPAIR_NOT_USED_ONCE')
    must(st.get('baseline_sha256')==sha_bytes(filebytes(baseline)),'REPAIR_STATE_BASELINE_MISMATCH')
    must(st.get('revised_sha256')==sha_bytes(filebytes(revised)),'REPAIR_STATE_REVISED_MISMATCH')
    must(st.get('proof_sha256')==sha_bytes(filebytes(proofpath)),'REPAIR_STATE_PROOF_MISMATCH')
    must(pf.get('patches_sha256')==sha_bytes(pbytes),'PATCHES_SHA_MISMATCH')
    lock=root/('.MEXICO_REPAIR_'+sha_bytes(filebytes(baseline))[:20]+'.lock.json')
    must(lock.exists(),'PORTABLE_LOCAL_LOCK_NOT_FOUND')
    lk=cjson(lock);must(lk.get('used') is True and lk.get('baseline_sha256')==st.get('baseline_sha256'),'LOCK_INVALID_OR_UNUSED')
    result=patch_replay_verify(filebytes(baseline),filebytes(revised),json.loads(text_bytes(pbytes)),pf)
    return dict(result,portable_lock=str(lock.name),relocatable=True)
def title_from_run(root): return (root/'LOCKED_TITLE.txt').read_text(encoding='utf8').rstrip('\r\n')
def check_run(root,strict=False):
    root=pathlib.Path(root); E=[]; W=[]; D={}
    def demand(cond,msg):
        if not cond:E.append(msg)
    def caution(cond,msg):
        if not cond:W.append(msg)
    title_path=root/'LOCKED_TITLE.txt'; outline=list(root.glob('MEX_*_OUTLINE.md'));parts={k:list(root.glob(f'MEX_*_SCRIPT_{k}.txt')) for k in 'ABC'}
    required=['FULL_SCRIPT.txt','FULL_SCRIPT_REVISED.txt','QA_PATCHES.json','QA_FINAL.json','REPAIR_PROOF.json','REPAIR_STATE.json','SCRIPT_MANIFEST.json','TITLE_LOCK.md','SEO_PACK.md','QA_FINAL_REPORT.md']
    for fn in required:demand((root/fn).is_file(),'MISSING_'+fn)
    if E:return {'ok':False,'errors':E,'warnings':W,'details':D}
    title=title_from_run(root)
    D['title']=title;D['title_chars']=len(title);D['title_sha12']=sha_bytes(title.encode())[:12]
    demand(bool(title) and len(title)<=100,'TITLE_EMPTY_OR_GT100')
    demand(len(outline)==1,'OUTLINE_NOT_UNIQUE');demand(all(len(v)==1 for v in parts.values()),'SEGMENTS_NOT_UNIQUE')
    man=cjson(root/'SCRIPT_MANIFEST.json');qa=cjson(root/'QA_FINAL.json')
    if len(outline)==1:
        oh=sha_bytes(filebytes(outline[0])); demand(man.get('outline_sha256')==oh,'MANIFEST_OUTLINE_MISMATCH'); demand(man.get('video_id')==sha_bytes((title+'\n'+oh).encode())[:16],'VIDEO_ID_MISMATCH')
        demand(qa.get('outline_sha256')==oh,'QA_OUTLINE_MISMATCH')
    demand(man.get('locked_title')==title,'MANIFEST_TITLE_MISMATCH')
    demand(man.get('title_sha12')==D['title_sha12'],'MANIFEST_TITLE_SHA_MISMATCH')
    demand(qa.get('title_sha12')==D['title_sha12'],'QA_TITLE_SHA_MISMATCH')
    demand(qa.get('video_id')==man.get('video_id'),'QA_MANIFEST_ID_MISMATCH')
    bfile=filebytes(root/'FULL_SCRIPT.txt');rfile=filebytes(root/'FULL_SCRIPT_REVISED.txt');fb=facts(bfile);fr=facts(rfile)
    D.update(baseline_chars=fb['body_chars'],revised_chars=fr['body_chars'],revised_words=fr['body_words'],revised_sha256=fr['sha256'],parts=script_part_counts(rfile))
    if all(len(v)==1 for v in parts.values()):
        bb=[filebytes(parts[k][0]) for k in 'ABC'];demand(b''.join(bb)==bfile,'SEGMENT_BYTE_ASSEMBLY_MISMATCH')
        for segment,chapterset in zip(bb,[[1,2],[3,4,5],[6,7]]):demand(facts(segment)['heading_ids']==chapterset,'SEGMENT_HEADING_MISMATCH')
    demand(fr['heading_ids']==list(range(1,8)) and 40000<=fr['body_chars']<=49000,'SCRIPT_LENGTH_OR_7_PARTS_FAIL')
    demand(qa.get('script_sha256')==fr['sha256'],'QA_SCRIPT_HASH_MISMATCH')
    demand(qa.get('body_chars')==fr['body_chars'],'QA_REVISED_BODY_CHARS_MISMATCH')
    demand(qa.get('body_words')==fr['body_words'],'QA_REVISED_BODY_WORDS_MISMATCH')
    demand(qa.get('status')=='PASS_READY' and isinstance(qa.get('score'),int) and qa.get('score')>=97 and qa.get('blocking_issues')==[],'QA_NOT_READY_OR_BLOCKED')
    try:
        D['repair']=portable_repair_check(root)
    except Exception as ex:E.append('REPAIR_PROOF_FAILURE:'+str(ex))
    qf=(root/'QA_FINAL_REPORT.md').read_text(encoding='utf8')
    demand(fr['sha256'] in qf,'QA_FINAL_REPORT_MISSING_SCRIPT_HASH')
    caution(str(fr['body_chars']) in qf,'QA_FINAL_REPORT_BODY_COUNT_NEEDS_REVIEW')
    seo=(root/'SEO_PACK.md').read_text(encoding='utf8')
    demand(title in seo,'SEO_LOCKED_TITLE_MISSING')
    demand(fr['sha256'] in seo,'SEO_SCRIPT_HASH_MISSING')
    expected_headers=['PRIMARY TITLE','SUPPORTING TITLE 1','SUPPORTING TITLE 2','VIDEO DESCRIPTION','HASHTAGS','TAGS','PINNED COMMENT','THUMBNAIL A','THUMBNAIL B','THUMBNAIL C','WINNING THUMBNAIL','8-SECOND VISUAL HOOK']
    for h in expected_headers:demand(h in seo,'SEO_SECTION_MISSING:'+h)
    if (root/'DELIVERY_FILE_CHECKSUMS.json').exists():
        try:
            for item in cjson(root/'DELIVERY_FILE_CHECKSUMS.json'):
                p=root/item['name'];demand(p.exists() and len(filebytes(p))==item['size_bytes'] and sha_bytes(filebytes(p))==item['sha256'],'DELIVERY_CHECKSUM_BAD:'+item['name'])
        except Exception as ex:E.append('DELIVERY_CHECKSUMS_ERROR:'+str(ex))
    # QA score is an editorial rubric, not inferred from patch data.
    score_detail=qa.get('score_breakdown')
    caution(isinstance(score_detail,dict) and sum(v for v in score_detail.values() if isinstance(v,int))==qa.get('score'),'QA_SCORE_BREAKDOWN_NOT_MACHINE_CHECKABLE')
    caution(qa.get('final_report_sha256')==sha_bytes(filebytes(root/'QA_FINAL_REPORT.md')),'QA_FINAL_REPORT_NOT_HASH_BOUND')
    caution(qa.get('source_register_sha256')==sha_bytes(filebytes(root/'SOURCE_REGISTER.md')) if (root/'SOURCE_REGISTER.md').exists() else False,'QA_SOURCE_REGISTER_NOT_HASH_BOUND')
    # Do not equate mechanical checks with independent substantive fact review.
    W.append('SOURCE_TRUTH_NOT_AUTOMATICALLY_VERIFIED')
    W.append('TTS_RUNTIME_AND_RIGHTS_NOT_VERIFIED')
    D['quality_gate_note']='Structural PASS never certifies historical accuracy, pacing, or TTS runtime.'
    return {'ok':not E,'errors':E,'warnings':W,'details':D}
def cmd_audit_run(a):
    report=check_run(a.dir,a.strict)
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if not report['ok'] or (a.strict and any(x for x in report['warnings'] if x not in ['SOURCE_TRUTH_NOT_AUTOMATICALLY_VERIFIED','TTS_RUNTIME_AND_RIGHTS_NOT_VERIFIED'])):sys.exit(2)
def cmd_repair_verify_portable(a):
    report=portable_repair_check(a.dir);print(json.dumps(report,ensure_ascii=False,indent=2))
def cmd_qa_seal(a):
    root=pathlib.Path(a.dir);v=cjson(a.verdict)
    for x,hi in [('factual',35),('chronology',30),('spanish',25),('title_structure',10)]:
        must(isinstance(v.get('score_breakdown'),dict) and type(v['score_breakdown'].get(x)) is int and 0<=v['score_breakdown'][x]<=hi,'INVALID_QA_SCORE_BREAKDOWN_'+x)
    score=sum(v['score_breakdown'].values())
    must(v.get('score')==score,'QA_SUBSCORES_NOT_EQUAL_TOTAL')
    must(v.get('editor_review_confirmed') is True,'NO_EDITORIAL_REVIEW_CONFIRMATION')
    blocking=v.get('blocking_issues')
    must(isinstance(blocking,list),'BLOCKING_ISSUES_MUST_BE_LIST')
    script=root/('FULL_SCRIPT_REVISED.txt' if (root/'FULL_SCRIPT_REVISED.txt').exists() else 'FULL_SCRIPT.txt')
    ff=facts(filebytes(script));must(ff['heading_ids']==list(range(1,8)) and 40000<=ff['body_chars']<=49000,'SCRIPT_NOT_VALID')
    is_repaired=script.name.endswith('REVISED.txt')
    if is_repaired:portable_repair_check(root)
    status='PASS_READY' if score>=97 and not blocking else ('BLOCKED_AFTER_ONE_REPAIR' if is_repaired else 'NOT_READY_FIXABLE')
    title=title_from_run(root);m=cjson(root/'SCRIPT_MANIFEST.json')
    final_report=root/'QA_FINAL_REPORT.md';must(final_report.is_file(),'MISSING_QA_FINAL_REPORT')
    reporttext=final_report.read_text(encoding='utf8')
    must(ff['sha256'] in reporttext,'FINAL_REPORT_MISSING_SHA')
    must(str(ff['body_chars']) in reporttext,'FINAL_REPORT_COUNT_INACCURATE')
    qa_report=root/'QA_REPORT.md';reg=root/'SOURCE_REGISTER.md'
    must(qa_report.exists() and reg.exists(),'MISSING_RESEARCH_OR_INITIAL_QA')
    obj={'schema':'MEXICO_QA_FINAL_V1_1','status':status,'score':score,'score_breakdown':v['score_breakdown'], 'editor_review_confirmed':True,'script_sha256':ff['sha256'], 'script_filename':script.name,'body_chars':ff['body_chars'],'body_words':ff['body_words'],'title_sha12':sha_bytes(title.encode())[:12], 'video_id':m['video_id'],'outline_sha256':m['outline_sha256'], 'blocking_issues':blocking,'resolved_issue_ids':v.get('resolved_issue_ids',[]),'repair_used':is_repaired,'repair_batch_count':int(is_repaired),'qa_report':'QA_REPORT.md','qa_report_sha256':sha_bytes(filebytes(qa_report)),'final_report_sha256':sha_bytes(filebytes(final_report)),'source_register':'SOURCE_REGISTER.md','source_register_sha256':sha_bytes(filebytes(reg)), 'evidence_limitations':v.get('evidence_limitations',[]),'checked_on':datetime.date.today().isoformat()}
    if is_repaired:obj['repair_proof_sha256']=sha_bytes(filebytes(root/'REPAIR_PROOF.json'))
    save_json_new(a.out,(obj) )
    print(json.dumps(obj,ensure_ascii=False,indent=2))
def cmd_qa_check_strict(a):
    root=pathlib.Path(a.dir);qa=cjson(root/'QA_FINAL.json');e=[]
    try:
        man=cjson(root/'SCRIPT_MANIFEST.json');title=title_from_run(root)
        script=root/qa.get('script_filename','FULL_SCRIPT_REVISED.txt')
        if not script.exists():script=root/'FULL_SCRIPT_REVISED.txt'
        f=facts(filebytes(script));breakdown=qa.get('score_breakdown')
        must(qa.get('schema')=='MEXICO_QA_FINAL_V1_1','REQUIRE_QA_V1_1_SEALED')
        must(qa.get('editor_review_confirmed') is True,'REVIEW_NOT_CONFIRMED')
        must(type(qa.get('score')) is int and 97<=qa['score']<=100 and isinstance(breakdown,dict),'BAD_SCORE')
        must(set(breakdown)=={'factual','chronology','spanish','title_structure'},'BAD_BREAKDOWN_KEYS')
        must(all(type(breakdown[k]) is int and 0<=breakdown[k]<=maxv for k,maxv in [('factual',35),('chronology',30),('spanish',25),('title_structure',10)]),'SCORE_RANGE_FAIL')
        must(sum(breakdown.values())==qa['score'],'SCORE_SUM_MISMATCH')
        must(qa.get('status')=='PASS_READY' and qa.get('blocking_issues')==[],'NOT_READY')
        must(qa.get('script_sha256')==f['sha256'] and qa.get('body_chars')==f['body_chars'] and qa.get('body_words')==f['body_words'],'WRONG_SCRIPT_COUNTS_HASH')
        must(qa.get('title_sha12')==sha_bytes(title.encode())[:12] and man.get('locked_title')==title and qa.get('video_id')==man.get('video_id'),'TITLE_MANIFEST_MISMATCH')
        must(qa.get('outline_sha256')==man.get('outline_sha256'),'OUTLINE_MISMATCH')
        for fn,k in [('SOURCE_REGISTER.md','source_register_sha256'),('QA_REPORT.md','qa_report_sha256'),('QA_FINAL_REPORT.md','final_report_sha256')]:must(qa.get(k)==sha_bytes(filebytes(root/fn)),'NOT_BOUND_'+fn)
        if qa.get('repair_used'):
            must(qa.get('repair_batch_count')==1,'REPAIR_COUNT_INVALID')
            must(qa.get('repair_proof_sha256')==sha_bytes(filebytes(root/'REPAIR_PROOF.json')),'REPAIR_PROOF_NOT_BOUND')
            portable_repair_check(root)
        else:
            must(script.name=='FULL_SCRIPT.txt','UNREPAIRED_WRONG_SOURCE')
        must(qa['script_sha256'] in (root/'QA_FINAL_REPORT.md').read_text(encoding='utf8'),'MISSING_FINAL_SHA')
    except Exception as exc:e.append(str(exc))
    result={'ok':not e,'errors':e, 'checked_hash':qa.get('script_sha256'),'warning':'Mechanics/provenance only; human/AI must genuinely review source claims and narration.'}
    print(json.dumps(result,ensure_ascii=False,indent=2))
    if e:sys.exit(2)


def main():
    ap=argparse.ArgumentParser(description=__doc__); sub=ap.add_subparsers(dest='command',required=True)
    q=sub.add_parser('title');one=q.add_mutually_exclusive_group(required=True);one.add_argument('--text');one.add_argument('--title-file');q.add_argument('--max-chars',type=int,default=100);q.set_defaults(fn=cmd_title)
    q=sub.add_parser('count');q.add_argument('--file',required=True);q.set_defaults(fn=cmd_count)
    q=sub.add_parser('verify-script');q.add_argument('--file',required=True);q.add_argument('--min-chars',type=int,default=40000);q.add_argument('--max-chars',type=int,default=49000);q.set_defaults(fn=cmd_verify_script)
    q=sub.add_parser('manifest');q.add_argument('--title-file',required=True);q.add_argument('--outline-file',required=True);q.add_argument('--out',required=True);q.set_defaults(fn=cmd_manifest)
    q=sub.add_parser('assemble');
    for x in ['a','b','c','manifest','title-file','outline-file','out']:q.add_argument('--'+x,required=True)
    q.add_argument('--min-chars',type=int,default=40000);q.add_argument('--max-chars',type=int,default=49000);q.set_defaults(fn=cmd_assemble)
    q=sub.add_parser('repair-init');q.add_argument('--source',required=True);q.add_argument('--state',required=True);q.set_defaults(fn=cmd_repair_init)
    q=sub.add_parser('repair-apply')
    for x in ['source','state','patches','out','proof']:q.add_argument('--'+x,required=True)
    q.add_argument('--max-window-bytes',type=int,default=2000);q.add_argument('--min-chars',type=int,default=40000);q.add_argument('--max-chars',type=int,default=49000);q.set_defaults(fn=cmd_repair_apply)
    q=sub.add_parser('repair-verify');
    for x in ['state','proof','script']:q.add_argument('--'+x,required=True)
    q.set_defaults(fn=cmd_repair_verify)
    q=sub.add_parser('seo-check');q.add_argument('--qa',required=True);q.add_argument('--script',required=True);q.add_argument('--title-file');q.set_defaults(fn=cmd_seo_check)
    q=sub.add_parser('audit-run');q.add_argument('--dir',required=True);q.add_argument('--strict',action='store_true');q.set_defaults(fn=cmd_audit_run)
    q=sub.add_parser('repair-verify-portable');q.add_argument('--dir',required=True);q.set_defaults(fn=cmd_repair_verify_portable)
    q=sub.add_parser('qa-seal');q.add_argument('--dir',required=True);q.add_argument('--verdict',required=True);q.add_argument('--out',required=True);q.set_defaults(fn=cmd_qa_seal)
    q=sub.add_parser('qa-check-strict');q.add_argument('--dir',required=True);q.set_defaults(fn=cmd_qa_check_strict)
    a=ap.parse_args()
    try:a.fn(a)
    except (ValueError,OSError,KeyError,TypeError,json.JSONDecodeError) as e:
        print('GATE_FAIL:',str(e),file=sys.stderr);sys.exit(2)
if __name__=='__main__':main()
