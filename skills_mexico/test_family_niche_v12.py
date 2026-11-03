#!/usr/bin/env python3
"""Synthetic regression only. This gate is metadata and text checks, not real editorial QA."""
from pathlib import Path
from copy import deepcopy
import importlib.util, json
root=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('niche',root/'01_TITULOS_MEXICO/scripts/title_niche_gate_v12.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)

def candidate(title, who, wrong, turn):
    return {'title':title,'niche_lock':{
        'lead_role':'madre','lead_age':72,'lead_gender':'mujer','narrative_pov':'primera_persona',
        'family_culprit':who,'culprit_title_span':who,'family_betrayal_title_span':wrong,
        'reversal_title_span':turn,
        'mother_decision':'Ella decide si acepta la petición, revisa el documento y marca un límite propio.',
        'decision_cost':'Su decisión puede costarle otra ruptura con su familia y su tranquilidad.',
        'seven_part_payoff':'En siete partes se construye una causa y la decisión se ejecuta en P6 con consecuencias en P7.',
        'reversal_lever':'La protagonista tiene conocimiento legalmente obtenido y poder real para decidir en una situación concreta.',
        'lead_agency':True,'family_betrayal':True,'no_outsider_savior':True,'no_magic_reveal':True,
        'length_contract':'70k-80k-7part'
    }}

all_good=[
 candidate('Mis hijos me dejaron en la terminal de Puebla… 7 días después me suplicaron una firma',
           'Mis hijos','me dejaron en la terminal de Puebla','me suplicaron una firma'),
 candidate('Mi hijo me ocultó en su boda por vender tamales… y me negué a pagar el banquete',
           'Mi hijo','me ocultó en su boda por vender tamales','me negué a pagar el banquete'),
 candidate('Mi hija repartió mi casa por WhatsApp… y le negué las llaves frente a todos',
           'Mi hija','repartió mi casa por WhatsApp','le negué las llaves frente a todos'),
 candidate('Mi yerno se burló de mi puesto del mercado… luego me rogó que fuera su aval',
           'Mi yerno','se burló de mi puesto del mercado','me rogó que fuera su aval'),
 candidate('Mi nuera cambió mi recámara para su madre… y recuperé las llaves de mi casa',
           'Mi nuera','cambió mi recámara para su madre','recuperé las llaves de mi casa'),
]
p={'candidates':all_good,'suggested_winner':1}
tests=[]
def check(name,packet,expected):
    r=mod.validate(packet)
    if r['passed'] != expected:
        raise AssertionError(f'{name}: expected {expected}; {r["errors"]}')
    tests.append(name)
check('five older Mexican mom first-person family titles pass structure',deepcopy(p),True)
p2=deepcopy(p);p2['candidates'][0]['niche_lock']['lead_role']='niño';check('child protagonist blocked',p2,False)
p2=deepcopy(p);p2['candidates'][0]['niche_lock']['lead_gender']='hombre';check('male narrator blocked',p2,False)
p2=deepcopy(p);p2['candidates'][0]['niche_lock']['narrative_pov']='tercera_persona';check('third-person narrator blocked',p2,False)
p2=deepcopy(p);p2['candidates'][0]['title']='Un millonario se hizo indigente para probar a sus hijos';check('millionaire fake homeless blocked',p2,False)
p2=deepcopy(p);p2['candidates'][0]['title']='Mi patrón me humilló en el mercado… vino un juez a rescatarme';check('unrelated public cruelty blocked',p2,False)
p2=deepcopy(p);p2['candidates'][0]['title']='Me echaron de la boda de mi hijo por vender tamales… y él dejó el altar para buscarme';p2['candidates'][0]['niche_lock']['culprit_title_span']='Me echaron';check('anonymous wedding expulsion blocked as winner',p2,False)
p2=deepcopy(p);p2['candidates'][0]['title']='Mi hijo me ignoró el cumpleaños y TODOS LLORARON';p2['candidates'][0]['niche_lock'].update({'culprit_title_span':'Mi hijo','family_betrayal_title_span':'me ignoró el cumpleaños','reversal_title_span':'TODOS LLORARON'});check('everyone cried generic ending blocked',p2,False)
p2=deepcopy(p);p2['candidates'][0]['title']='Mi hijo me dejó sola y RECIBIERON UNA LLAMADA';p2['candidates'][0]['niche_lock'].update({'culprit_title_span':'Mi hijo','family_betrayal_title_span':'me dejó sola','reversal_title_span':'RECIBIERON UNA LLAMADA'});check('telephone twist rejected',p2,False)
p2=deepcopy(p);p2['candidates'][0]['niche_lock']['no_outsider_savior']=False;check('outside rescuer blocked',p2,False)
p2=deepcopy(p);p2['candidates'][0]['niche_lock']['lead_agency']=False;check('inactive mother blocked',p2,False)
p2=deepcopy(p);p2['candidates'][0]['niche_lock']['length_contract']='30-45min';check('runtime conflict blocked',p2,False)
p2=deepcopy(p);p2['candidates'][0]['niche_lock']['reversal_title_span']='me regalaron una mansión';check('invented textual span blocked',p2,False)
p2=deepcopy(p);p2['candidates'][0]['niche_lock'].pop('reversal_lever');check('missing leverage metadata blocked',p2,False)
p2=deepcopy(p);p2['candidates'][0]['niche_lock']['family_culprit']='unos ricos';check('nonfamily offender blocked',p2,False)
print(json.dumps({'passed':True,'cases':len(tests),'tests':tests,'warning':'Structural regression only, not a measured click, narrative quality, or Mexican law audit.'},ensure_ascii=False,indent=2))
