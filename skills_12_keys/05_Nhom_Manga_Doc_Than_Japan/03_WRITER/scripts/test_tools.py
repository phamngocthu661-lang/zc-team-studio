#!/usr/bin/env python3
"""Synthetic regression tests; structural/integrity checks, not proof of editorial quality."""
import json, subprocess, tempfile, unittest, sys
from pathlib import Path
import project_tools as pt
import one_pass_repair as rp

BASE=Path(__file__).parent
JP='雨の朝、俺は古い工場の扉を開けた。彼女が困っている理由を、まだ知らなかった。'

def make_script(count=51):
    return ''.join(f'[PART {i}]\n'+ ''.join('@ore: '+JP+f'{i}。\n' for j in range(count)) for i in range(1,8)).encode('utf-8')

class TestPipeline(unittest.TestCase):
 def setUp(self):
    self.tmp=tempfile.TemporaryDirectory();self.d=Path(self.tmp.name)
 def tearDown(self):self.tmp.cleanup()
 def lock(self):
    title='55歳独身の俺が小さな修理工場で出会った女性が、翌朝もう一度現れた理由'
    (self.d/'CURRENT_FINAL_TITLE.txt').write_text(title,encoding='utf-8')
    pt.cmd_title(type('A',(),{'title_file':self.d/'CURRENT_FINAL_TITLE.txt','out':self.d/'TITLE_LOCK.json'}))
    outline='SEVEN PARTS\n'+''.join(f'PART {i} 正確な時系列と証拠に基づく展開。' for i in range(1,8))+'\n'+ '倫理的な恋愛と現実の職場。'*40
    (self.d/'CURRENT_FINAL_OUTLINE.txt').write_text(outline,encoding='utf-8')
    pt.cmd_outline(type('A',(),{'title_lock':self.d/'TITLE_LOCK.json','outline':self.d/'CURRENT_FINAL_OUTLINE.txt','out':self.d/'OUTLINE_LOCK.json'}))
 def test_count_seven_parts(self):
    b=make_script(55)
    r=pt.parse_script(b,expected=list(range(1,8)))
    self.assertEqual(r['part_order'],list(range(1,8)))
    self.assertGreater(r['total_readable_chars'],0)
    self.assertEqual(r['speech_lines'],385)
 def test_missing_part_and_tags(self):
    with self.assertRaises(ValueError):pt.parse_script(b'[PART 1]\nno speaker here\n',expected=[1])
    with self.assertRaises(ValueError):pt.parse_script(b'[PART 1]\n@ore: hi\n[PART 1]\n@ore: hello\n')
    with self.assertRaises(ValueError):pt.parse_script(b'[PART 1]\n@ore: hi\n',expected=list(range(1,8)))
 def test_title_lock_over_100_rejected(self):
    path=self.d/'t.txt';path.write_text('あ'*101,encoding='utf-8')
    with self.assertRaises(ValueError):pt.cmd_title(type('A',(),{'title_file':path,'out':self.d/'title.json'}))
 def test_stage_assemble_and_tamper(self):
    self.lock()
    b=make_script(55)
    # ensure global hard limit using actual char count
    r=pt.parse_script(b)
    self.assertTrue(13900<=r['total_readable_chars']<=16300, r['total_readable_chars'])
    for label,numbers in pt.STAGES.items():
      lines=b.decode().splitlines(keepends=True)
      picked=[];include=False
      for line in lines:
       if line.startswith('[PART '):include=int(line.split()[1][0]) in numbers
       if include:picked.append(line)
      src=self.d/f'NEW_{label}.txt';src.write_text(''.join(picked),encoding='utf-8')
      pt.cmd_stage(type('A',(),{'project_dir':self.d,'input':src,'name':label,'strict':False}))
    pt.cmd_assemble(type('A',(),{'project_dir':self.d,'dev_skip_length':False}))
    self.assertEqual((self.d/'FULL_SCRIPT.txt').read_bytes(),b)
    self.assertEqual(pt.load_json(self.d/'DRAFT_PROOF.json')['status'],'DRAFT_FROZEN_NOT_QA_READY')
    # detect changed TITLE_LOCK without explicit new lock
    t=pt.load_json(self.d/'TITLE_LOCK.json');t['title_sha256']='a'*64;pt.put_json(self.d/'TITLE_LOCK.json',t)
    with self.assertRaises(ValueError):pt.verify_locks(self.d)
 def test_one_pass_and_no_second_repair(self):
    b=make_script(55);(self.d/'FULL_SCRIPT.txt').write_bytes(b)
    old=('@ore: '+JP+'2。\n').encode('utf-8');start=b.find(old)
    self.assertGreater(start,0);end=start+len(old)
    draft={'baseline_sha256':pt.sha(b),'patches':[{'id':'P01','start_byte':start,'end_byte':end,'severity':'P2','reason':'誤字を修正','evidence':'この台詞が不自然'}]}
    pt.put_json(self.d/'QA_DRAFT_LEDGER.json',draft)
    rp.cmd_freeze(type('A',(),{'baseline':self.d/'FULL_SCRIPT.txt','draft_ledger':self.d/'QA_DRAFT_LEDGER.json','out':self.d/'FROZEN_QA_LEDGER.json'}))
    replacement=('@ore: '+JP+'二。\n')
    pt.put_json(self.d/'REPLACEMENTS.json',{'baseline_sha256':pt.sha(b),'replacements':[{'id':'P01','replacement':replacement}]})
    a=type('A',(),{'baseline':self.d/'FULL_SCRIPT.txt','ledger':self.d/'FROZEN_QA_LEDGER.json','replacements':self.d/'REPLACEMENTS.json','project_dir':self.d})
    rp.cmd_apply(a);rp.cmd_verify(a)
    with self.assertRaises(ValueError):rp.cmd_apply(a)
    (self.d/'FULL_SCRIPT_REVISED.txt').write_bytes(b'fake tampered')
    with self.assertRaises(ValueError):rp.cmd_verify(a)
 def test_span_tamper_and_outside_changes_prohibited(self):
    b=make_script(55)
    p={'id':'P01','start_byte':2,'end_byte':10,'reason':'error','evidence':'quote','severity':'P2','before_sha256':pt.sha(b[2:10])}
    with self.assertRaises(ValueError):rp.verify_patches(b,{'baseline_sha256':pt.sha(b),'patches':[p]})

if __name__=='__main__':unittest.main(verbosity=2)
