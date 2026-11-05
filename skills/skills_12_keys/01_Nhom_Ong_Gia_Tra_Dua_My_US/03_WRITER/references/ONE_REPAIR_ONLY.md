# ONE_REPAIR_MAX=1 HARD REQUIREMENT
- Exactly one run of `apply_authorized_patches.py` per stable video_id; persistent lock created after successful run.
- QA conducts one initial review and freezes *all* actionable defects before patch; do not start Step5 with an incomplete ledger. QA never composes prose.
- QA-owned bytes `[start_byte,end_byte)` non-overlapping, same Part, strong anchors protected; Writer writes only those replacements, copies every other byte unchanged.
- Required command: `python scripts/apply_authorized_patches.py --baseline ORIGINAL_FULL_SCRIPT.txt --frozen QA_FROZEN.json --contract QA_REPAIR_CONTRACT.json --replacements REPLACEMENTS.json --outline-file CURRENT_FINAL_OUTLINE.txt --user-approved --out FULL_SCRIPT_REVISED.txt --proof REPAIR_PROOF.json`
- If any file missing, hash mismatch, replacement out of bound or length fail: do NOT publish. If revisions successfully published, no second automated edit, even if QA finds an error. Do not rename files to bypass lock. QA performs only one independent postrepair re-audit.
- Typos/grammar handled with the same exact byte patch mechanism; no global formatter or invisible search-and-replace allowed.
