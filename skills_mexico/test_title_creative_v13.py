#!/usr/bin/env python3
"""Structural regression tests for V1.3 title portfolio gate; NOT an editorial quality test."""
from pathlib import Path
import importlib.util
from copy import deepcopy
here = Path(__file__).resolve().parent
p = here / "01_TITULOS_MEXICO/scripts/title_creative_gate_v13.py"
spec = importlib.util.spec_from_file_location("creative_gate", p)
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)

titles = [
 "Mi hijo vació mi taller para su suegra… y la encontré durmiendo en mi cama",
 "Mi hija me hizo mesera en su boda… después vino a cobrarme la luna de miel",
 "Mi hijo se rio de mis tamales ante sus socios… luego me pidió ser su aval",
 "Mis hijos pusieron mi fonda en venta… llegué cuando entregaban las llaves",
 "Mi hija me dejó sola en el hospital… a la semana apareció buscando una firma"
]
families = ["reclaimed_space","unresolved_request","reversed_dependency",
            "public_confrontation","procedural_boundary"]
frames = ["caught_in_the_act","humiliation_to_collision","unexpected_request",
          "betrayal_plus_cost","family_contrast"]
def mk(i):
 return {
   "title": titles[i],
   "creative_v13":{
     "resolution_family":families[i],
     "hook_frame":frames[i],
     "specific_family_contrast":"El hijo o hija prefiere el beneficio ajeno al bienestar de su propia madre.",
     "collision_scene":"La madre confronta al familiar en el lugar exacto del abuso con testigos y objetos presentes.",
     "open_question":"¿Aceptará la madre el pedido, pese al daño y al costo de perder el vínculo familiar?",
     "part6_payoff":"La madre llega por iniciativa propia al encuentro y decide frente a su familia con evidencia previa.",
     "story_cost":"Puede perder para siempre una relación valiosa y parte de su estabilidad cotidiana.",
     "originality_delta":"La consecuencia nace de su decisión y no de un juez millonario o salvador desconocido."
   }
 }
pkt={"candidates":[mk(i) for i in range(5)],"suggested_winner":None}
def check(name, obj, expected):
 result=mod.validate(obj)
 assert result["status"] == expected,(name,result)
 print("PASS", name, expected)
check("valid distinct portfolio",pkt,"PASS")
p2=deepcopy(pkt)
for i in range(4): p2["candidates"][i]["creative_v13"]["resolution_family"]="withheld_support"
check("reject same refusal family repeated",p2,"FAIL")
p2=deepcopy(pkt)
for i in range(4):p2["candidates"][i]["creative_v13"]["hook_frame"]="direct_quote"
check("reject same framing repeated",p2,"FAIL")
p2=deepcopy(pkt)
p2["candidates"][0]["creative_v13"]["open_question"]=""
check("reject missing genuine question",p2,"FAIL")
p2=deepcopy(pkt)
p2["candidates"][0]["title"]="A"*101
check("reject >100 title",p2,"FAIL")
p2=deepcopy(pkt)
p2["candidates"]=p2["candidates"][:4]
check("reject <5 titles",p2,"FAIL")
p2=deepcopy(pkt)
for i in range(4):p2["candidates"][i]["title"]="Mi hijo se burló de mí... y le negué lo que pidió esa noche"
check("reject explicit refusal overload",p2,"FAIL")
p2=deepcopy(pkt)
p2["candidates"][0].pop("creative_v13")
check("reject absent extension",p2,"FAIL")
print("V1.3 title gate: 8/8 structural cases passed")
