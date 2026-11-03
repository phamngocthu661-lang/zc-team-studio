# ONE-PASS REPAIR PROTOCOL — ABSOLUTE

There is ONE automatic revision after the initial full-script audit. It may contain multiple isolated edits, all in one atomic `repair-apply` operation. It is NOT one issue only, and it is NOT an endless QA->writer->QA loop. Primary repair targets: causal logic and es-MX spelling/grammar, including proper names. Protect plot hooks and strong prose unless those precise bytes were found erroneous and legitimately re-authorized by QA.

S4 owns diagnostic and exact text old zones; S5 supplies replacement strings; utility performs one atomic byte patch with immutable untouched regions. S4B audits revised FULL once and emits either READY or BLOCKED_MANUAL_DECISION. If blocked, system may produce an issue list and editorial alternatives but MUST NOT call S5 again. New version requires separate explicit human request and fresh source/contract; must not call it "same one-shot pass".

Specialist repair checklist:
1. For each Pxx: root cause and all dependent references in same approved patch batch? If not, block before patch; don't silently widen scope.
2. Does replacement preserve exact characters outside authorized `[start,end)` byte ranges? `repair-apply` proves this.
3. Does it alter the woman's own decision, tone or proof chain unexpectedly? No.
4. Does it resolve all P0/P1 first and P2 typographic corrections in the SAME batch? Yes if safely editable.
5. After applying, does S4B still find contradiction anywhere else? If yes BLOCKED, no second repair.
