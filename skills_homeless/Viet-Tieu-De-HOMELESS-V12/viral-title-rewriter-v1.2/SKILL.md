---
name: viral-title-rewriter
version: 1.2
description: Rewrite one or many YouTube competitor titles by preserving proven viral DNA while creating a sufficiently original new title. Generate candidates, score strictly, and iterate until a 98-100/100 title is achieved or a genuine quality ceiling is reached. Use for title rewriting only; do not write outlines, scripts, SEO descriptions, thumbnails, or tags unless explicitly asked in a separate task.
---

# VIRAL TITLE REWRITER V1.2 — STRICT 98+ + RETENTION-SERVICEABILITY GATE


## V12 ROLE AND HANDOFF ADDENDUM — NORMATIVE

Read `references/CROSS_SKILL_QUALITY_CONTRACT.md` first. **Owner of step1 only**; do not write outline, script, fix prose, perform QA, or write SEO. A scoring value from this title rubric is an editorial title score, never `QA_SCORE` or `PUBLICATION_READINESS`. Keep source-title forensic analysis, originality and title ≤100 exact characters, with ≥98 if genuinely earned; if not, disclose quality ceiling.

On successful step1, lock one `CURRENT_FINAL_TITLE` as exact UTF-8 text and save a real `TITLE_LOCK.json` file with `source_title`, `current_final_title`, `title_sha256`, `title_sha12`, rubric detail, and source provenance if the runtime supports file creation. Hash ONLY actually persisted bytes; user-supplied title remains the source of truth if artifact cannot be saved. No arbitrary story facts are implied by the title. Title lock is handed to Outline, which may flag an unfulfillable promise but may not silently change it.

**QA lesson uptake:** read only manually approved, versioned prevention rules relevant to title-serviceability; do not treat story-specific QA notes as permission to rewrite another user's title. After step1, suggest step2 exactly once.

---

## PURPOSE

This skill rewrites YouTube titles that already have proven market traction.

The skill must NOT create a random title from scratch when a source title is supplied.
It must first reverse-engineer the source title's viral mechanism, then produce a new title that preserves the strongest click-driving DNA while being sufficiently original.

Default principle:

**Preserve about 60% of the VIRAL DNA, reinvent about 40% of the manifestation.**

This is NOT a literal word-overlap quota.

Preserve, when useful:
- viewer contract
- content family
- protagonist archetype
- emotional trigger
- primary keyword cluster
- conflict type
- curiosity architecture
- title rhythm
- payoff category
- escalation level

Reinvent, when useful:
- setting
- property/object
- age
- price
- quantity
- antagonist action
- discovery detail
- evidence
- secondary consequence
- wording
- reveal angle

The final title should feel familiar to the same audience without feeling copied.

---

# ACTIVATION

Use this skill whenever the user:
- gives one or more YouTube titles and asks to rewrite them
- asks for a stronger / more viral / more clickable title based on an existing title
- asks to preserve competitor DNA or a 60/40 rewrite pattern
- asks to score titles and only accept titles at 98-100

Possible natural-language triggers include:
- "viết lại tiêu đề"
- "rewrite title"
- "viết lại title"
- "chấm điểm tiêu đề"
- "tạo tiêu đề 98 điểm trở lên"
- "giữ 60% thay 40%"

If the user supplies multiple titles, treat each non-empty line as one independent source title unless the user specifies otherwise.

---

# SCOPE LOCK

This skill is ONLY for title rewriting and title evaluation.

Do NOT automatically:
- write a story outline
- write a full script
- create SEO description
- create tags
- create thumbnail prompts
- create channel names
- perform unrelated niche research

If the user asks only for title rewriting, stop after final titles.

---

# INPUT PRIORITY

Use available information in this priority order:

1. User's explicit current instructions
2. User-provided niche/channel DNA, title datasets, channel descriptions, tags, representative-video descriptions, view counts, or prior analysis
3. Source title itself
4. General title-writing principles only when the provided data is silent

Never overwrite strong source-derived niche patterns with generic advice.

If view counts are available, weight title evidence by performance.
A 100K-view outlier should influence the model more than a 2K-view title.
Do not treat all examples as equal.

---

# PHASE 1 — SOURCE TITLE FORENSICS

For each source title, identify internally:

## 1. Content Family
Examples may include:
- inheritance / hidden legacy
- abandoned property
- homeless comeback
- frontier survival
- winter survival
- lost expedition / vanished convoy
- family betrayal
- rural ingenuity
- salvage-to-fortune
- underdog justice
- revenge
- Mafia
- workplace humiliation
- romance
- or another family clearly supported by the title/DNA

Do not mix unrelated families merely because both are viral.

## 2. Viewer Contract
Answer internally:

**Why would a viewer click this exact title? What are they expecting to discover, witness, or emotionally experience?**

## 3. Title Skeleton
Map the structure.
Examples:
- [DISADVANTAGE] + [ACQUISITION] — [DISCOVERY]
- [OTHERS MOCK/DISMISS] — [REVERSAL]
- [MYSTERY FROM THE PAST] — [FIRST TO FIND] + [CONCEALED PAYOFF]
- [DISCARDED ASSET] — [UNEXPECTED VALUE/TRANSFORMATION]

Do not force these examples if another structure fits better.

## 4. Viral Trigger
Identify the strongest click driver:
- humiliation
- injustice
- extreme vulnerability
- impossible bargain
- absurd price
- enormous quantity
- inheritance
- hidden room
- lost object
- forgotten place
- dangerous weather
- secret
- vanished history
- transformation
- revenge
- status reversal
- unexpected value
- taboo/forbidden discovery

## 5. Keyword Lock
Identify:
- Primary keyword
- Secondary keyword cluster

Preserve strong keywords semantically when they are clearly part of the title's proven appeal.
Do not replace strong keywords with weaker synonyms merely to look different.

## 6. Curiosity Gap
Identify exactly what the title reveals and what it withholds.
A strong title often follows:

**Reveal the premise; conceal the final answer.**

## 7. Thumbnail Compatibility
Ask internally whether the title can produce a simple, instantly readable thumbnail scene.

## 8. Story Expandability
Ensure the rewritten premise can logically support a full story.
Do not accept a title that sounds viral but collapses under basic story logic.

## 9. Instant Comprehension Gate — HARD
The core title must be understandable on first pass by a general U.S. 40+ viewer.

Reject or simplify obscure craft/industrial jargon when the viewer must first learn the term before understanding why the title is interesting. Keep an unfamiliar object term only when:
1. the surrounding title makes its function/category instantly clear; or
2. channel performance data specifically proves that term itself is a click driver.

Prefer a plain-language category over technical vocabulary when clarity increases without weakening uniqueness.

## 10. Click-to-Opening Serviceability Gate — HARD
A final title must be scriptable so the downstream story can:
- put the title-promise object/action/anomaly on screen/in narration within roughly the first ~200 script characters;
- provide physical/verifiable proof by roughly ~400 characters;
- deliver an early micro-payoff without revealing the final answer.

Reject titles that require a minute of explanation/backstory before the audience can understand the clicked mystery.

**The title should create curiosity the opening can immediately service.**

---

# PHASE 2 — 60/40 REWRITE RULE

The 60/40 principle applies to VIRAL DNA, not raw wording.

## Preserve approximately 60% of:
- content family
- viewer contract
- emotional mechanism
- primary keyword cluster
- protagonist archetype
- conflict mechanism
- curiosity structure
- payoff category
- title rhythm or sentence architecture when useful

## Rebuild approximately 40% through:
- new circumstance
- new asset/property/object
- new setting
- new evidence or clue
- new secondary detail
- new antagonist behavior
- new number/price/timeframe only if narratively justified
- new wording
- new reveal angle

### Hard rule
If the rewrite only swaps synonyms, REJECT it.
If the rewrite changes so much that the proven click mechanism disappears, REJECT it.

Target:

**Same audience desire + same proven click engine + new story manifestation.**

---

# PHASE 3 — CANDIDATE GENERATION

For EACH source title:

1. Generate at least 5 candidates internally.
2. If none reaches the quality gate, generate another batch of at least 5.
3. Continue iterative candidate generation and scoring.
4. Do not expose weak drafts unless the user explicitly asks to see them.
5. Prefer meaningful structural improvements over cosmetic word swaps.

Candidate diversity should vary:
- reveal angle
- sentence architecture
- object/property detail
- conflict framing
- escalation
- curiosity placement

But all candidates must remain faithful to the same content family unless the user asks for broader experimentation.

---

# PHASE 4 — STRICT SCORING RUBRIC

Score every serious candidate on a 100-point scale.

## A. Viewer Contract Strength — 15
Does the title promise a clear and compelling viewing experience?

## B. CTR / Curiosity Gap — 15
Does it create a strong unanswered question without becoming vague clickbait?

## C. Viral DNA Preservation — 15
Does it retain the source title's proven psychological mechanism?

## D. Freshness / Originality — 10
Is it clearly distinct from the source while retaining the successful pattern?

## E. Keyword Strength — 10
Are the strongest niche keywords present naturally and early enough?

## F. Emotional Trigger — 10
Does the title activate tension, sympathy, injustice, danger, aspiration, mystery, or reversal as appropriate?

## G. Specificity / Concreteness — 8
Does it include concrete details that improve believability and memorability?

## H. Thumbnail Synergy — 7
Can the title pair with a clear thumbnail concept that is understandable in 1-2 seconds?

## I. Native English & Rhythm — 5
Does it read naturally, cleanly, and with strong cadence?

## J. Logic & Story Potential — 5
Can the premise plausibly support a compelling full story?

TOTAL = 100

---

# PHASE 5 — 98-100 QUALITY GATE

## Acceptance threshold

A title is considered READY TO USE only when **both** conditions are satisfied:

1. The title is **100 characters or fewer**.
2. The title scores **98, 99, or 100 / 100**.
3. It passes **Instant Comprehension**.
4. It passes **Click-to-Opening Serviceability**.

Anything over 100 characters is automatically invalid and must be rejected before scoring.
Anything below 98 is NOT READY.

## Mandatory iteration

If the best candidate scores below 98:
- reject it
- identify the lowest scoring dimensions
- generate improved candidates
- rescore
- repeat

Do not stop merely because a title scores 95, 96, or 97.

## No score inflation

Never raise a score simply to pass the gate.
A 98+ score must be justified by the rubric.

If repeated rewriting has not yet produced an honest 98+ candidate, continue generating and improving within the current run.

Never label a sub-98 title as final or READY TO USE.

If an honest 98+ title cannot be achieved without breaking logic, naturalness, originality, or the source viewer contract, return **NO APPROVED TITLE YET** and clearly mark the best score as below standard. Do not lower the threshold and do not inflate the score.

---

# PHASE 6 — REGRESSION CHECK

Before finalizing a 98+ title, compare it against the source title and verify all of the following:

- viewer contract preserved or strengthened
- strongest keyword cluster retained when appropriate
- curiosity gap at least as strong
- title not merely synonym-swapped
- no obvious plot-spoiling
- no fake specificity
- no awkward English
- no unnecessary words
- no contradiction
- no content-family drift
- no thumbnail mismatch
- sufficient originality
- full-story potential remains strong
- instantly understandable without unnecessary niche jargon
- title promise can be activated immediately in the downstream opening

If any regression appears, return to candidate generation even if the numerical score previously reached 98+.

---

# MULTI-TITLE BATCH RULES

When multiple source titles are supplied:

- preserve input order
- rewrite every non-empty line
- do not merge titles
- do not skip weak source titles
- avoid repeating the same new object, location, age, price, ending phrase, or reveal across the batch unless it is a necessary niche anchor
- keep the output feeling like one coherent channel while preserving premise diversity

For batch work, perform a final cross-title duplication check.

---

# SEO RULE

For YouTube storytelling titles:

**CTR + topical relevance + viewer expectation > keyword density.**

SEO means:
- strong topical clarity
- meaningful primary keyword
- natural keyword placement
- alignment with audience vocabulary
- clean title structure

Do NOT:
- keyword-stuff
- write titles like search queries
- append tags
- sacrifice CTR for extra keywords

---

# TITLE LENGTH RULE — HARD 100-CHARACTER LIMIT

Every rewritten YouTube title MUST be **100 characters or fewer**.
This is a non-negotiable eligibility gate and overrides niche rhythm, source-title length, dataset patterns, CTR potential, and scoring quality.

## Character-count rule
- Count every visible character in the final title, including letters, numbers, spaces, punctuation, quotation marks, currency symbols, and dashes.
- A title with **100 characters is allowed**.
- A title with **101 or more characters is automatically REJECTED**.

## Mandatory pre-score gate
Before scoring any candidate:
1. Count its characters.
2. If the candidate exceeds 100 characters, mark it **LENGTH REJECTED**.
3. Do **not** score it, do **not** compare it as a finalist, and do **not** allow it to become READY TO USE.
4. Generate a shorter replacement that preserves the strongest viral DNA.

A candidate over 100 characters is invalid even if it would otherwise deserve 98-100/100.
No score, originality, CTR strength, keyword strength, or user dataset can override this hard limit.

## Final-output gate
Immediately before outputting any final title:
- count the title again;
- verify it is <=100 characters;
- if it is >100, reject it and return to candidate generation.

Always shorten by removing redundancy or compressing wording before weakening the core viewer contract, primary keyword, curiosity gap, or emotional trigger.
Never output an over-100-character title as a final rewrite.

---

# PUNCTUATION RULE

Treat punctuation as part of title DNA when relevant:
- em dash —
- ellipsis ...
- colon :
- quotation marks
- ages
- dollar amounts
- quantities
- time gaps

Do not normalize punctuation mechanically.

---

# FAILURE MODES TO REJECT

Reject candidates that:
- exceed 100 characters, including spaces and punctuation
- simply replace 3-5 words with synonyms
- copy a unique competitor phrase too closely
- lose the main keyword
- reveal the entire payoff
- use generic "changed everything" when a stronger concrete hook exists
- add random age/price/quantity for clickbait
- sound AI-generated
- create an implausible story premise
- mix content families
- overstuff keywords
- become longer without becoming stronger
- rely on obscure technical jargon that delays comprehension
- require extended backstory before the title promise can appear in the opening
- rely on empty hype words such as unbelievable, insane, shocking unless the niche data specifically supports them

---

# DEFAULT OUTPUT FORMAT

For each source title:

## TITLE [N]

**Original:** [source title]

**Final Rewrite:** [best approved 98-100 title; if none can honestly pass, write NO APPROVED TITLE YET]

**Score:** XX/100

**Status:** READY TO USE / NOT READY

**Preserved Viral DNA:** [1 concise sentence]

**New Creative Layer:** [1 concise sentence]

Do not show internal chain-of-thought, hidden drafts, or the full iterative scoring process.

---

# OUTPUT MODES

If the user says `TITLE ONLY`:
Output only the rewritten final titles, one per line.

If the user says `SHOW SCORE`:
Output final title + score + status.

If the user says `SHOW 5`:
Show 5 strongest candidates and their scores, but still identify the final winner.

If the user says `FORENSIC`:
Add a concise analysis of why the original title works and what DNA was preserved.

If the user says `STRICT 60/40`:
Keep the rewrite closer to the source's structure and viewer contract while maintaining sufficient originality.

If the user says `MORE ORIGINAL`:
Increase novelty of the manifestation, but never sacrifice viewer contract or content-family fit.

---

# FINAL EXECUTION LOOP

For every title, follow this sequence internally:

**READ INPUT
→ IDENTIFY CONTENT FAMILY
→ DECODE VIEWER CONTRACT
→ EXTRACT VIRAL TRIGGERS
→ LOCK STRONG KEYWORDS
→ MAP TITLE SKELETON
→ DESIGN 60/40 TRANSFORMATION
→ GENERATE 5+ CANDIDATES
→ COUNT CHARACTERS
→ REJECT >100 CHARACTERS BEFORE SCORING
→ SCORE ALL ELIGIBLE CANDIDATES
→ REJECT <98
→ GENERATE AGAIN IF NEEDED
→ RUN REGRESSION CHECK
→ RUN INSTANT-COMPREHENSION GATE
→ RUN CLICK-TO-OPENING SERVICEABILITY GATE
→ RUN ANTI-COPY CHECK
→ RUN BATCH DUPLICATION CHECK
→ RECOUNT FINAL TITLE LENGTH (MUST BE <=100)
→ OUTPUT ONLY FINAL APPROVED TITLE(S)**

Never lower the 98-point threshold unless the user explicitly changes the standard.
