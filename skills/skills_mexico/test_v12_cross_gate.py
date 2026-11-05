#!/usr/bin/env python3
"""Demonstrates V1.1 score gate alone may accept off-niche, but V1.2 composite gates reject it.
The scores used in this synthetic test are arbitrary and are NOT a human editorial assessment.
"""
from pathlib import Path
import importlib.util, contextlib, io, json, copy
R=Path(__file__).resolve().parent

def load(name,path):
    spec=importlib.util.spec_from_file_location(name,R/path)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
old=load('old','01_TITULOS_MEXICO/scripts/title_quality_gate.py')
new=load('new','01_TITULOS_MEXICO/scripts/title_niche_gate_v12.py')
with contextlib.redirect_stdout(io.StringIO()):
    test=load('test_old','test_title_quality_gate.py')
    v12=load('test_niche','test_family_niche_v12.py')
packet={'suggested_winner':1, 'candidates':[]}
for c in v12.all_good:
    title=c['title']
    v=test.make(title)
    v['niche_lock']=copy.deepcopy(c['niche_lock'])
    packet['candidates'].append(v)
r1=old.validate(packet);r2=new.validate(packet)
assert r1['passed'] and r2['passed'], (r1['errors'],r2['errors'])
assert all(c['characters']<=100 for c in r1['candidates'])

packet_bad=copy.deepcopy(packet)
packet_bad['candidates'][0]['title']='Un millonario se hizo indigente para probar a sus hijos'
prev=old.validate(packet_bad)
newr=new.validate(packet_bad)
assert prev['passed'],prev['errors']
assert not newr['passed'],newr['errors']

# Unknown culprit in wedding sample must not silently win even when original checker passes.
wedding=copy.deepcopy(packet)
wedding['candidates'][0]['title']='Me echaron de la boda de mi hijo por vender tamales… y él dejó el altar para buscarme'
wedding['candidates'][0]['niche_lock']['culprit_title_span']='Me echaron'
assert old.validate(wedding)['passed']
assert not new.validate(wedding)['passed']

print(json.dumps({'passed':True,'cases':3,
                  'old_gate_scores_good_packet':r1['passed'],
                  'new_gate_in_niche_packet':r2['passed'],
                  'old_gate_off_niche_false_positive_reproduced':prev['passed'],
                  'new_gate_off_niche_rejected':not newr['passed'],
                  'old_gate_anonymous_wedding_accepted':old.validate(wedding)['passed'],
                  'new_gate_anonymous_wedding_rejected':not new.validate(wedding)['passed'],
                  'warning':'synthetic scorecard values, no measured CTR or audience response'},ensure_ascii=False,indent=2))
