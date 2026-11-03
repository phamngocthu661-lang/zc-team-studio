# FORENSIC CANON: REQUIRED TABLES IN STEP2

## A. CAST AND KINSHIP
`id | full name | age/birth year | relation to narrator | job/income source | location | desire | fear | secrets | initial belief | final change | register of usted/tú`.

## B. TIMELINE
`YYYY-MM-DD or relative day | clock time | scene IDs | event | how long since previous event | plausibility | who witnessed`.
Distinct roles: spouse deceased date, house purchased date, child's marriage year, when bank support began, when lawsuit/notice could legally happen. All consistent.

## C. OWNERSHIP / AUTHORITY
`asset | paper/title source | holder(s) | who resides/uses | who paid | who may sell/lease | legal unknown | what must be verified | scene where proven`.
Paying a bill is not ownership. Do not create a forged power of attorney solution unless carefully handled as wrongdoing and credible verified authorities.

## D. MONEY
`starting savings + cashflow | income | expense | financial obligation | receipts | who can access | balance after each key decision`.
Never accidentally spend more than established funds or magically close accounts belonging to another adult.

## E. OBJECT AND ACCESS
`item | first appearance | custody by scene | last known location | key/physical access | significance | final payoff`. Examples: envelope, house keys, notarized copy, old recipe card, parking pass, group-chat screenshots.

## F. KNOWLEDGE
`character | what truly happened | what they believe per Part | how acquired knowledge | proof source | false inference corrected`.
Protagonist cannot know private legal/financial conversations if not told, shown records or directly overheard in plausible distance.

## G. COMMITMENTS / THREATS
`promise/threat | issuer | exact wording if used | means of enforcement | cost | resolution`. Includes threats to withhold child access; agency and safety matter.

## H. VOICE AND PLATFORM
`narration tense | Spanish-Mexico glossary | per-character honorific/tú-usted | first-person POV consistency | advertiser suitability | CTA locations | any claim needing verification`.

## I. HIGH-VALUE STRONG SPANS (forward to QA)
`scene + key dialogue | why it must be protected | what dependency depends on it`. Useful to prevent a patch destroying a subtle setup line.

## Exact source identity handoff
`LOCKED_TITLE` verbatim
`OUTLINE_FILE_PATH` absolute/persistent
`OUTLINE_SHA256` verified from file bytes
`TITLE_SHA12` verified from title UTF-8
`VIDEO_ID` SHA256(title+LF+outline_sha256)[:16]
`BODY_TARGET 74,000–78,000; HARD 70,000–80,000`
`A: P1–P2 / B: P3–P5 / C: P6–P7`

Lack of actual file/bytes means `OUTLINE_SHA256: UNVERIFIED` and Step3 manifest cannot be certified, never infer from conversation prose.
