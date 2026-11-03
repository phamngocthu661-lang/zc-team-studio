#!/usr/bin/env python3
"""Manga JP release integrity + packaging gate V1.1.0 (stdlib). Creative/visual evidence is human-reviewed, not machine-proven."""
import argparse, hashlib, json, re, struct, sys
from pathlib import Path


def digest(b): return hashlib.sha256(b).hexdigest()
def filehash(p): return digest(p.read_bytes())
def readjson(p): return json.loads(p.read_text(encoding='utf-8'))
def no_ws_count(t): return sum(not c.isspace() for c in t)

def script_count(data):
    t=data.decode('utf-8')
    if '\r' in t: raise ValueError('non-LF script')
    seen=[]; total=0; per={}; n=0; speakers={}
    for lineno, line in enumerate(t.splitlines(), 1):
        if not line.strip(): continue
        if re.fullmatch(r'\[PART [1-7]\]', line):
            k=int(line[6]);seen.append(k);per[k]=0;continue
        if not seen:raise ValueError(f'content outside a Part at line {lineno}')
        if line.startswith('[PART'):raise ValueError(f'malformed heading line {lineno}')
        m=re.fullmatch(r'@([A-Za-z_][A-Za-z0-9_-]{0,32}):\s*(?:\[[^\]\n]{1,30}\]\s*)?(.+)',line)
        if m is None:raise ValueError(f'bad speaker line {lineno}')
        v=no_ws_count(m.group(2));total+=v;per[seen[-1]]+=v;n+=1
        speakers[m.group(1)]=speakers.get(m.group(1),0)+v
    if seen!=list(range(1,8)):raise ValueError(f'parts not exact 1..7, actual={seen}')
    if min(per.values())<=0: raise ValueError('empty Part')
    return {'readable_chars':total,'part_chars':per,'speech_lines':n,'speaker_char_share':{k:round(v/total,3) for k,v in speakers.items()}}

def png_dims(p):
    b=p.read_bytes()
    if len(b)<24 or not b.startswith(b'\x89PNG\r\n\x1a\n') or b[12:16]!=b'IHDR':raise ValueError('Not a valid PNG header')
    return struct.unpack('>II',b[16:24])

def audit(folder, strict=False):
    f=lambda n:folder/n
    checks=[];errors=[];warnings=[]
    def ck(ok,label,detail=None):
        checks.append({'check':label,'pass':bool(ok),'detail':detail or ''})
        if not ok:errors.append(label+((': '+str(detail)) if detail else ''))
    def getfile(n):
        p=f(n)
        if not p.is_file():raise ValueError('Missing '+n)
        return p
    try:
        t=readjson(getfile('TITLE_LOCK.json'));o=readjson(getfile('OUTLINE_LOCK.json'))
        raw_title=getfile('CURRENT_FINAL_TITLE.txt').read_bytes();title=raw_title.decode('utf-8')
        ck(title==t.get('current_final_title') and digest(raw_title)==t.get('title_sha256') and len(title)<=100 and '\n' not in title,'locked_title_exact')
        outline=getfile('CURRENT_FINAL_OUTLINE.txt').read_bytes()
        vid=digest(raw_title+b'\n'+digest(outline).encode('ascii'))[:16]
        ck(digest(outline)==o.get('outline_sha256') and t.get('title_sha256')==o.get('title_sha256') and vid==o.get('video_id'),'outline_lock_integrity')
        stages=b''.join(getfile('PARTS_'+st+'.txt').read_bytes() for st in 'ABC')
        baseline=getfile('FULL_SCRIPT.txt').read_bytes();draft=readjson(getfile('DRAFT_PROOF.json'))
        ck(stages==baseline and digest(baseline)==draft.get('script_sha256') and draft.get('outline_sha256')==o.get('outline_sha256') and draft.get('video_id')==vid,'draft_3stage_proof')
        try:
            bc=script_count(baseline)
            ck(13900<=bc['readable_chars']<=16300 and bc['readable_chars']==draft.get('readable_chars'),'draft_structure_length',bc['readable_chars'])
        except Exception as e:ck(False,'draft_structure_length',str(e));bc=None
        finalqa=readjson(getfile('FINAL_QA_RESULT.json'))
        attempts=finalqa.get('repair_attempts_used',0)
        if attempts==1:
            led=readjson(getfile('FROZEN_QA_LEDGER.json'));rep=readjson(getfile('REPLACEMENTS.json'));proof=readjson(getfile('REPAIR_PROOF.json'))
            ck(led.get('baseline_sha256')==digest(baseline) and rep.get('baseline_sha256')==digest(baseline) and proof.get('baseline_sha256')==digest(baseline),'repair_baseline_integrity')
            ck(proof.get('ledger_sha256')==filehash(f('FROZEN_QA_LEDGER.json')) and proof.get('replacements_sha256')==filehash(f('REPLACEMENTS.json')),'repair_frozen_inputs')
            replacements={i['id']:i['replacement'] for i in rep.get('replacements',[])}; patches=led.get('patches',[])
            if len(replacements)!=len(patches) or len(patches)>25:raise ValueError('repair IDs not one-to-one')
            rebuilt=[];previous=0;pr=[]
            for p in patches:
                a,b=p['start_byte'],p['end_byte'];old=baseline[a:b]
                if a<previous or b>len(baseline) or digest(old)!=p['before_sha256'] or p['id'] not in replacements:raise ValueError('repair span/ID/hash mismatch')
                if (a and baseline[a-1:a]!=b'\n') or (b<len(baseline) and baseline[b-1:b]!=b'\n'):raise ValueError('patch not line-aligned')
                new=replacements[p['id']].encode('utf-8'); rebuilt.extend((baseline[previous:a],new));previous=b
                pr.append({'id':p['id'],'original_sha256':digest(old),'replacement_sha256':digest(new),'start_byte':a,'end_byte':b})
            rebuilt.append(baseline[previous:]);expected=b''.join(rebuilt)
            actual=getfile('FULL_SCRIPT_REVISED.txt').read_bytes()
            ck(actual==expected and digest(actual)==proof.get('revised_sha256') and proof.get('approved_patches')==pr and proof.get('repair_attempts_used')==1,'one_pass_repair_replay')
        elif attempts==0:
            actual=baseline
            ck(not f('FULL_SCRIPT_REVISED.txt').exists() or f('FULL_SCRIPT_REVISED.txt').read_bytes()==baseline,'no_repair_no_mutations')
        else:ck(False,'single_repair_budget',attempts);actual=baseline
        qa_score=finalqa.get('score');rubric=finalqa.get('score_rubric',{})
        ck(isinstance(qa_score,int) and sum(v for v in rubric.values() if isinstance(v,int))==qa_score and 0<=qa_score<=100,'qa_rubric_arithmetic')
        ck(finalqa.get('status') in ('READY_FINAL','READY_WITHOUT_REPAIR') and finalqa.get('final_script_sha256')==digest(actual) and finalqa.get('final_read_only') is True,'qa_ready_final_sha')
        ck(not any(finalqa.get('remaining_'+lvl,finalqa.get('open_'+lvl,0)) for lvl in ('P0','P1','P2')),'qa_no_open_major_defects')
        ck(getfile('FINAL_SCRIPT_JA_TTS.txt').read_bytes()==actual,'tts_matches_approved_script')
        fc=script_count(actual)
        ck(13900<=fc['readable_chars']<=16300 and fc['readable_chars']==finalqa.get('final_readable_chars'),'final_count',fc['readable_chars'])
        metadata=readjson(getfile('SEO_METADATA.json'))
        ck(metadata.get('title')==title and metadata.get('script_sha256')==digest(actual) and metadata.get('qa_status')==finalqa.get('status'),'seo_title_script_qa_identity')
        supporting=metadata.get('supporting_titles',[])
        ck(isinstance(supporting,list) and len(supporting)==2 and all(isinstance(s,str) and 10<=len(s)<=100 for s in supporting),'seo_two_supporting_titles')
        tags=metadata.get('tags_joined','')
        ck(isinstance(tags,str) and 1<=len(tags)<=500 and len(tags)==metadata.get('tags_chars') and tags==','.join(metadata.get('tags',[])),'seo_tags_exact_count',len(tags))
        ck(isinstance(metadata.get('description'),str) and 80<=len(metadata['description'])<=1000 and 3<=len(metadata.get('hashtags',[]))<=5,'seo_description_hashtags')
        imgsha={}
        for ch in 'ABC':
            path=getfile('THUMBNAIL_'+ch+'.png');w,h=png_dims(path);imgsha[ch]=filehash(path)
            ck(w>=1280 and h>=720 and w*9==h*16,f'thumbnail_{ch}_dimensions',f'{w}x{h}')
        warnings.extend(['Artwork/text/content cannot be certified from PNG headers or metadata; inspect each rendered thumbnail at full and phone size.', 'QA score is editorial judgement, not native-Japanese or retention certification.', 'No audio supplied: TTS runtime not measured.'])
        visual=f('THUMBNAIL_VISUAL_QA.json'); creative=f('CREATIVE_GATE_REPORT.json')
        if strict:
            if not visual.exists():ck(False,'visual_review_attestation_missing')
            else:
                vr=readjson(visual)
                for ch in 'ABC':
                    a=vr.get('thumbnails',{}).get(ch,{})
                    criteria=('exact_caption_japanese','actual_scene_matches_script','age_and_expression','mobile_readability','variant_distinct','no_unwanted_graphics')
                    ck(a.get('sha256')==imgsha[ch] and all(a.get(k) is True for k in criteria) and isinstance(a.get('observations'),str) and len(a['observations'])>=20,f'visual_review_{ch}')
            if not creative.exists():ck(False,'creative_editorial_review_missing')
            else:
                cr=readjson(creative)
                dims=('hook','niche_empathy','conflict_escalation','reveal_payoff','heroine_agency','mature_romance','scene_visuality','ending_payoff')
                c=cr.get('checks',{})
                ck(cr.get('script_sha256')==digest(actual) and all(c.get(d,{}).get('pass') is True and len(c.get(d,{}).get('script_evidence',''))>=12 for d in dims),'creative_evidence_8_dimensions')
        else:
            if not visual.exists() or not creative.exists():warnings.append('Strict publish certification not present: independent visual QA + story creative gate still required.')
        metrics={'readable_chars':fc['readable_chars'],'tts_lines':fc['speech_lines'],'speaker_char_share':fc['speaker_char_share'],'per_part':fc['part_chars'],'title_chars':len(title),'seo_tag_chars':len(tags),'repair_attempts':attempts,'thumbnails_verified':list(imgsha)}
    except Exception as e:
        errors.append('aborted: '+str(e));metrics={}
    status='BLOCKED' if errors else ('TECHNICAL_PASS_PUBLISH_REVIEW_REQUIRED' if not strict else 'PUBLISH_GATE_PASS_WITH_REVIEW_ATTESTATIONS')
    return {'version':'1.1.0','status':status,'strict_publish':strict,'checks':checks,'errors':errors,'warnings':warnings,'metrics':metrics}

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--project-dir',required=True);ap.add_argument('--strict-publish',action='store_true');ap.add_argument('--out')
    a=ap.parse_args(); result=audit(Path(a.project_dir),a.strict_publish)
    s=json.dumps(result,ensure_ascii=False,indent=2)
    if a.out:
        p=Path(a.out)
        if p.exists():raise SystemExit('Refuse overwrite: '+str(p))
        p.write_text(s+'\n',encoding='utf-8')
    print(s);sys.exit(0 if not result['errors'] else 2)
if __name__=='__main__':main()
