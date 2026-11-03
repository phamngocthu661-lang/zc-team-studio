# QUICK CLI GUIDE — SHA, ASSEMBLY, ONE REPAIR

Python 3 stdlib, UTF-8, LF newlines. Run with `python path/to/project_tools.py` and `python path/to/one_pass_repair.py`.

```
python project_tools.py lock-title --title-file PROJECT/CURRENT_FINAL_TITLE.txt --out PROJECT/TITLE_LOCK.json
python project_tools.py lock-outline --title-lock PROJECT/TITLE_LOCK.json --outline PROJECT/CURRENT_FINAL_OUTLINE.txt --out PROJECT/OUTLINE_LOCK.json
python project_tools.py save-stage --name A --input A_INPUT.txt --project-dir PROJECT --strict
python project_tools.py save-stage --name B --input B_INPUT.txt --project-dir PROJECT --strict
python project_tools.py save-stage --name C --input C_INPUT.txt --project-dir PROJECT --strict
python project_tools.py assemble --project-dir PROJECT
python project_tools.py check-script --script PROJECT/FULL_SCRIPT.txt --full --strict
```

Only QA auditor after full inspection of script should prepare `QA_DRAFT_LEDGER.json` with UTF-8 byte-offset spans, reason, evidence, P0/P1/P2 severity:
```
python one_pass_repair.py freeze --baseline PROJECT/FULL_SCRIPT.txt --draft-ledger PROJECT/QA_DRAFT_LEDGER.json --out PROJECT/FROZEN_QA_LEDGER.json
```

Then Writer creates `REPLACEMENTS.json`, matching IDs and SHA with replacement Japanese text:
```
python one_pass_repair.py apply --baseline PROJECT/FULL_SCRIPT.txt --ledger PROJECT/FROZEN_QA_LEDGER.json --replacements PROJECT/REPLACEMENTS.json --project-dir PROJECT
python one_pass_repair.py verify --baseline PROJECT/FULL_SCRIPT.txt --ledger PROJECT/FROZEN_QA_LEDGER.json --replacements PROJECT/REPLACEMENTS.json --project-dir PROJECT
```
`apply` is one-time only. A second call to apply with the same project directory is rejected. Verify is read-only and does not certify story quality: independent QA must inspect the repaired story and issue final result.

## Practical note on span offsets
For QA, locate exact line boundaries from `FULL_SCRIPT.txt` bytes, not editor cursor offsets or character indices:
```python
b=open('PROJECT/FULL_SCRIPT.txt','rb').read()
line=b'@ore: '+ '原文の一文'.encode('utf-8') + b'
'
start=b.find(line); end=start+len(line)
assert start >= 0 and (start == 0 or b[start-1:start] == b'
')
```
Prefer full speaker-line windows; for multiple defects generate nonoverlapping, sorted spans. `freeze` stamps SHA for every original span. If the exact text occurs twice, identify the intended Part by searching from its Part heading byte offset rather than taking the first occurrence blindly.

## Limits
The bundled validators test format, content counts and patch integrity. They do not perform native-language editorial judgment or automatic narrative inference. `--dev-skip-length` belongs only to synthetic tests; never use in production.
