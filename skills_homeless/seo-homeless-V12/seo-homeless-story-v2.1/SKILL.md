---
name: seo-homeless-story
version: 2.1.0
description: Analyze a completed Homeless/abandoned-property storytelling script together with its already-finalized title, then build the full YouTube SEO and packaging system: factual viral summary, strategy classification, description, hashtags, tags, high-CTR thumbnail concept/prompt, and a 10-30s non-dialogue emotional trailer made of multi-shot 10s Omni prompts. Never invent story facts or rewrite the locked title unless explicitly asked.
---

# SEO HOMELESS STORY v2.1.0 — TITLE-LOCKED SEO + THUMBNAIL + OMNI TRAILER


## V12 SEO PUBLICATION GATE / EXCLUSIVE ROLE

This is **Step6 only**. Before any SEO output, load `references/CROSS_SKILL_QUALITY_CONTRACT.md`, exact locked primary title, exact approved FINAL_OUTLINE file, current full/revised UTF-8 script, and the newest **completed independent frozen Step4 QA on that exact script**. Run `scripts/verify_seo_ready.py --script ... --qa-frozen ... --outline-file ... --title '...'` and ensure PASS. A Writer repair proof is NOT QA readiness; pre-repair QA READY cannot authorize a changed script. If files/hash/QA gates are missing or mismatch, STOP, output a precise blocker and NO SEO package.

**Exactly TWO Secondary Packaging Titles**: provide exactly two alternatives for later manual packaging tests, separated from the immutable `PRIMARY LOCKED TITLE`; each must remain true to the story's actual facts and title promise, be ≤100 characters, and be clearly labeled as NOT replacing the primary. No new twists, monetary amounts, identities, discoveries, on-screen dialogue, or visuals absent from the script. Factual map must connect each hook/prompt to a specific genuine Part + scene/anchor.

SEO deliverables: Primary Locked Title (unmodified); Secondary A and B (exactly two); factual summary; family classification; YouTube description; hashtags/tags; thumbnail concept and prompt; 1–3 10s Omni multi-shot prompts (10/20/30 sec total); full fact-lock and visual-consistency proof. `SEO QA SCORE` is not independent `QA_SCORE`. No extra step is suggested after successful Step6.

---

## PURPOSE

This skill is used AFTER the story title has already been finalized and AFTER the full script exists.

It does **not** replace the title-rewrite skill.

Its job is to:

1. Read the complete script.
2. Extract and lock all factual story details.
3. Treat the supplied final title as the **TITLE LOCK / viewer contract**.
4. Classify which proven title/content family the final title belongs to.
5. Build SEO metadata that supports the title without keyword stuffing.
6. Choose the strongest thumbnail strategy supported by the script.
7. Select a real, emotionally powerful scene or sequence from the script for the opening trailer/hook.
8. Create 1-3 standalone **10-second Omni video prompts**, each containing multiple short shots, for a total trailer length of 10, 20, or 30 seconds.
9. Run strict factual, CTR, continuity, SEO, thumbnail, and trailer QA before output.

The core rule is:

**TITLE PROMISE → SCRIPT FACTS → SEO SUPPORT → THUMBNAIL VISUAL QUESTION → EMOTIONAL TRAILER**

Never reverse that order.

---

# ACTIVATION

Use this skill when the user asks for SEO/packaging for a completed Homeless / abandoned property / inheritance / frontier-hidden-legacy / quiet-restoration story and supplies:

- a completed script or story text; and
- an already-created final title.

Natural triggers may include:

- "SEO kịch bản homeless"
- "tạo SEO cho kịch bản"
- "SEO homeless"
- "tạo description tags thumbnail"
- "tạo trailer hook Omni"
- "dùng tiêu đề có sẵn để SEO"

If the user supplies only a script but no final title, ask for the final title unless it is unambiguously present in the supplied material.

If the user supplies only a title but no script, do not invent the missing story. Ask for the script.

---

# MANDATORY REFERENCE LOAD

Before execution, use these packaged references:

- `references/CROSS_SKILL_QUALITY_CONTRACT.md`
- `references/CHANNEL_TITLE_DNA.md`
- `references/THUMBNAIL_DNA.md`
- `references/OMNI_TRAILER_SPEC.md`
- `references/SEO_QA_RUBRIC.md`
- `references/OUTPUT_TEMPLATE.md`

The references encode the observed market patterns and output rules. Do not substitute generic YouTube advice when the provided script/DNA supports a more specific decision.

---

# SCOPE LOCK

This skill MAY produce:

- title classification and title-script alignment check
- factual viral summary
- SEO strategy selection
- YouTube description
- hashtags
- tags
- thumbnail concept
- thumbnail image-generation prompt
- optional post-production arrow placement note
- trailer/hook scene selection
- 10s / 20s / 30s Omni multi-shot video prompts
- QA scores

This skill MUST NOT automatically:

- rewrite the finalized title
- create a new story outline
- rewrite the script
- add invented scenes to make packaging more dramatic
- change character age, relationship, property, price, location, object, chronology, weather, inheritance facts, or discoveries

If the locked title contradicts the script, flag the mismatch instead of silently fixing it.

---

# PHASE 0 — FULL SCRIPT READ

Read the entire script before creating any output.

Do not package from the opening paragraphs alone.

Create an internal **FACT LOCK** containing only facts explicitly supported by the script:

- protagonist name
- protagonist age
- protagonist status/condition
- homelessness status: yes/no/temporary/unclear
- family relationships
- source of hardship
- property acquisition method
- purchase price if present
- inheritance details if present
- exact property/location type
- geographic location if present
- time period if present
- key physical objects
- secret/hidden location
- discovery sequence
- money/value if present
- profession/craft/skill
- antagonist or source of pressure
- strongest humiliation/injustice scene
- strongest moving/leaving/arrival scene
- strongest survival scene
- strongest visual clue scene
- strongest discovery scene
- climax
- final emotional payoff

### Hard factual rule

If a detail is not in FACT LOCK, it cannot appear as a factual claim in:

- description
- hashtags
- tags
- thumbnail prompt
- trailer prompt

Do not invent a more viral fact.

---

# PHASE 1 — TITLE LOCK + VIEWER CONTRACT

The user-provided final title is locked.

Do not offer four replacement titles.
Do not score candidate titles.
Do not rewrite it unless the user explicitly asks.

Internally decode the title into:

- protagonist promise
- hardship promise
- property/place promise
- mystery/reveal promise
- emotional promise
- keyword cluster
- visual promise

Then identify:

**What must the viewer see or learn for this title to feel truthful and satisfying?**

### Title-script alignment

Mark one:

- `PASS` — title is supported by the script
- `MINOR RISK` — phrasing is broader than the exact script but still defensible
- `FAIL` — title contains a factual promise not supported by the script

If FAIL, stop title-dependent packaging and identify the exact contradiction. Do not invent support.

---

# PHASE 2 — STRATEGY CLASSIFIER

Classify the locked title into ONE primary packaging family.

## FAMILY A — VULNERABILITY / CHEAP ACQUISITION

Signals:
- Homeless at...
- Broke...
- Left with nothing...
- bought for $X
- took a property no one wanted

SEO focus:
- protagonist condition
- specific property
- acquisition
- second chance
- hidden clue

Thumbnail focus:
- arrival / luggage / vehicle / child when real
- full specific property
- visible isolation

Trailer focus:
- eviction / packing / leaving / arrival / first entry

---

## FAMILY B — INHERITANCE / HIDDEN LEGACY

Signals:
- inherited
- late father/mother/grandparent
- deed / will / keys
- family left her...

SEO focus:
- inheritance
- family legacy
- specific property
- clue tied to the relative

Thumbnail focus:
- protagonist + inherited property + clue location
- emotional connection over generic wealth

Trailer focus:
- will reading / rejection / arrival / handling inherited object / first clue

---

## FAMILY C — INJUSTICE / REJECTION / CONTRAST

Signals:
- they laughed
- kicked out
- siblings took everything
- in-laws left her the worthless part
- cast out / betrayed

SEO focus:
- injustice
- unwanted property
- underdog recovery
- specific clue

Thumbnail focus:
- visible rejection or separation when script supports it
- protagonist isolated against property or antagonists

Trailer focus:
- strongest humiliation / expulsion / abandonment sequence

---

## FAMILY D — IMPOSSIBLE / SPECIFIC CLUE MYSTERY

Signals:
- sealed room
- extra key
- room that did not exist
- warm air underground
- wall rang hollow
- object still untouched after decades

SEO focus:
- exact place/object
- physical clue
- mystery
- hidden history

Thumbnail focus:
- the specific clue location must be visually legible
- do not reveal the final treasure/answer

Trailer focus:
- clue discovery / physical reaction / attempt to open or investigate

---

## FAMILY E — LOST HISTORY / FRONTIER MYSTERY

Signals:
- vanished convoy / wagon train / mining camp
- erased from maps
- lost for 80-100 years
- abandoned railroad / fort / ghost town

SEO focus:
- unique historical object/place
- time gap
- first discovery
- forgotten history

Thumbnail focus:
- wide environmental scale
- specific lost object/settlement
- protagonist small enough to show discovery scale

Trailer focus:
- harsh approach / finding tracks or remains / first visual contact / clue reveal

---

## FAMILY F — SURVIVAL / EXTREME ENVIRONMENT

Signals:
- blizzard
- below-zero cold
- cave / underground shelter
- winter survival
- hidden food / heat / shelter system

SEO focus:
- survival method
- weather stakes
- specific shelter feature
- resilience

Thumbnail focus:
- active survival action
- hot/warm interior vs hostile exterior
- clear physical system or shelter

Trailer focus:
- eviction into weather / frantic preparation / storm impact / survival action

---

## FAMILY G — RESTORATION / QUIET SECOND CHANCE

Signals:
- abandoned motel/workshop/school/farm
- rebuilding life
- restoring family craft or forgotten place
- community renewal

SEO focus:
- specific place
- restoration
- craft/legacy
- second chance

Thumbnail focus:
- protagonist at the property before restoration
- specific structure, not generic house

Trailer focus:
- arrival / first inspection / first act of repair / emotionally charged clue

---

# PHASE 3 — VIRAL FACT SUMMARY

Create a concise Vietnamese audit summary.

It must include only supported facts:

- Nhân vật
- Tuổi
- Hoàn cảnh/xung đột
- Cách sở hữu / giá mua
- Địa điểm cụ thể
- Vị trí bí mật hoặc manh mối vật lý
- Thứ tìm thấy / di sản
- Antagonist hoặc áp lực chính
- Điểm cảm xúc mạnh nhất
- Chủ đề cảm xúc
- Primary packaging family
- Title-script alignment

This is an audit layer, not marketing copy.

---

# PHASE 4 — SEO DESCRIPTION

Write a natural American-English YouTube description.

Default length: **170-280 words**, unless the user requests another length.

Use 3-4 compact paragraphs.

### Paragraph 1 — Promise

Include naturally:
- protagonist
- real hardship
- specific property/place
- acquisition/inheritance situation
- the first concrete mystery/clue

### Paragraph 2 — Mystery expansion

Tease the most story-specific objects, documents, room, craft, tracks, mechanism, or legacy without spoiling the final reveal.

### Paragraph 3 — Emotional engine

Frame the deeper story:
- survival
- restoration
- family legacy
- resilience
- community
- second chance
- quiet justice

Use only themes actually present.

### Paragraph 4 — Natural CTA

One short CTA tied to the story experience.
Do not mechanically repeat the title.
Do not use spam language.

### SEO language rule

Use keyword families naturally.
Do not repeat exact keyphrases to force density.
For storytelling channels, prioritize:

**CTR promise + semantic relevance + audience vocabulary > keyword stuffing.**

---

# PHASE 5 — HASHTAGS

Create **5-8 hashtags** maximum.

Prioritize:

1. story-family hashtag
2. specific property/place hashtag
3. emotional/narrative hashtag
4. niche anchor
5. one or two specific theme hashtags

Do not use broad irrelevant hashtags merely for reach.
Do not duplicate near-identical variants.

Examples of possible anchors only when supported:
- #HomelessStory
- #SecondChanceStory
- #HiddenLegacy
- #AbandonedPlaces
- #FrontierStory
- #EmotionalStory
- #FamilySecrets
- #RestorationStory
- #WinterSurvival

---

# PHASE 6 — YOUTUBE TAGS

Create one comma-separated line of targeted English tags.

Target:
- roughly 18-30 useful tags
- **500 characters or fewer total**

Priority order:

1. exact semantic topic from final title
2. protagonist condition if true
3. exact property/place
4. discovery/mystery type
5. story-family terms
6. emotional/second-chance terms
7. channel-style terms such as cinematic storytelling / quiet storytelling / bedtime stories only if they fit

Never use `homeless at [age]` if the protagonist is not actually homeless.
Never invent state, craft, price, age, room, or object.

---

# PHASE 7 — THUMBNAIL STRATEGY SELECTOR

Use `references/THUMBNAIL_DNA.md`.

Choose ONE dominant thumbnail family based on the title + script.

The thumbnail must answer in 1-2 seconds:

1. Who is vulnerable / what is at stake?
2. What specific place/object is this story about?
3. What visual detail creates the unanswered question?

### Non-negotiable

Prefer the **specific title object/property** over a generic house/cabin.

Examples:
- abandoned 16-room motel, not generic building
- railroad car, not generic shed
- boathouse, not generic cottage
- chapel, not generic house
- sealed cellar door, not vague glow
- cliff house, not generic mountain home

### Human composition

Default to one primary protagonist unless the script/title requires a child or antagonist.

Do not automatically force the classic rear-view pose.
Choose the pose that creates the strongest emotional question:

- three-quarter back arrival
- face-visible shock
- carrying luggage
- protecting child
- being pushed away
- touching a sealed door
- digging / opening / repairing
- fighting wind/snow

### Arrow policy

AI base image prompt: **NO red arrow by default**.

If an arrow materially improves clarity, output a separate:

`POST-PRODUCTION ARROW NOTE`

with exactly one recommended target.

Do not ask the image model to draw UI arrows unless the user explicitly wants that.

---

# PHASE 8 — THUMBNAIL PROMPT

Write one complete English prompt for a 16:9 YouTube thumbnail.

Include:

- realistic cinematic or period-realistic style appropriate to story
- exact protagonist age/appearance only when supported
- exact clothing period/style inferred only from script
- specific property/object
- physical state of property
- protagonist action/emotion
- camera distance
- composition hierarchy
- lighting/weather supported by script
- title-specific clue location
- negative constraints

### CTR composition principles learned from the supplied competitor thumbnails

Use selectively, not mechanically:

- one dominant property/object occupying a large readable portion of frame
- one emotionally legible protagonist
- strong foreground/background separation
- simple 2-3 element visual hierarchy
- wide enough to identify the exact property
- specific clue or unusual object visible but not fully explained
- brighter, cleaner daylight for modern abandoned-property stories
- earthy cinematic scale for frontier/lost-history stories
- warm-vs-cold contrast and active action for survival stories
- somber estate scale + emotional foreground for gothic inheritance stories
- extreme quantity/scale only when the script actually contains it

No text, logo, watermark, split-screen clutter, random extra people, invented treasure, or spoiler reveal.

---

# PHASE 9 — EMOTIONAL HOOK/TRAILER SCENE MINING

Do not make the protagonist stand and speak to camera.

Default trailer rule:

**NO CHARACTER DIALOGUE. NO LIP SYNC. NO TALKING-HEAD HOOK.**

Use action, reaction, physical stakes, environmental sound, movement, and cinematic cutting.

Read the script and identify up to 5 candidate hook moments from real scenes.

Preferred scene types:

1. **EXPULSION / HUMILIATION**
   - thrown out
   - mocked
   - belongings placed outside
   - inheritance insult
   - antagonist closes door/gate

2. **MOVING / LEAVING / ARRIVAL**
   - packing final belongings
   - old car loaded with boxes
   - walking with child/luggage
   - first sight of abandoned property

3. **SURVIVAL CRISIS**
   - blizzard begins
   - roof leaks
   - fire fails
   - flood rises
   - last food/heat runs out

4. **PHYSICAL MYSTERY CLUE**
   - extra key
   - sealed door
   - hollow wall
   - warm air from crack
   - hidden tracks
   - untouched object

5. **EMOTIONAL LOSS / FAMILY LEGACY**
   - holding final letter/deed
   - touching deceased parent's object
   - seeing abandoned family place

6. **ACTIVE DISCOVERY**
   - prying boards
   - digging
   - opening old drawer
   - following tracks
   - removing wall panel

### Hook candidate score — 100

- Emotional force: 25
- Immediate visual clarity: 20
- Physical movement/action: 15
- Title alignment: 15
- Stakes: 10
- Non-spoiler curiosity: 10
- Feasibility in short-form video: 5

Choose the highest-scoring candidate or a causal sequence of 2-3 candidates.
Do not inflate scores.

---

# PHASE 10 — TRAILER LENGTH DECISION

The skill decides the trailer length automatically:

## 10 seconds
Use when one scene alone carries a complete emotional hook.

Ideal arc:
`wound or shock → reaction → unresolved visual question`

## 20 seconds
Use when two beats are needed.

Ideal arc:
`injustice/loss → forced movement/arrival → mystery tease`

Create two separate 10s Omni prompts.

## 30 seconds
Use only when three distinct beats are genuinely supported.

Ideal arc:
`wound → survival/transition → specific mystery clue`

Create three separate 10s Omni prompts.

Never stretch weak material to 30 seconds.

---

# PHASE 11 — OMNI MULTI-SHOT PROMPT GENERATION

Use `references/OMNI_TRAILER_SPEC.md`.

Each 10-second block must be a **self-contained generation prompt** with multiple short shots.

Default: 3-5 shots per 10 seconds.

Recommended shot duration:
- 1.2-3.2 seconds each

Use hard cuts, motivated match cuts, whip pans, foreground occlusion, or sound bridges only when appropriate.

Avoid a single slow push-in for the entire 10 seconds unless the script scene specifically needs stillness.

### Prompt structure

Each Omni block must contain:

1. `FORMAT / INTENT`
2. `CHARACTER LOCK`
3. `ENVIRONMENT / PERIOD LOCK`
4. `EMOTIONAL ARC`
5. `SHOT TIMELINE`
6. `PHYSICAL PERFORMANCE`
7. `CAMERA / LENS / MOVEMENT`
8. `LIGHT / WEATHER`
9. `SOUND DESIGN`
10. `CONTINUITY LOCK`
11. `NEGATIVE CONSTRAINTS`

### Shot timeline example shape

`[00:00-00:02.0] SHOT 1 — ...`
`[00:02.0-00:04.4] SHOT 2 — ...`
`[00:04.4-00:07.1] SHOT 3 — ...`
`[00:07.1-00:10.0] SHOT 4 — ...`

The exact timing must total 10 seconds.

### Emotional performance

Do not write vague instructions like "she looks sad."
Use visible behavior:

- breath catches
- jaw tightens
- fingers shake around suitcase handle
- wipes tears without stopping
- shields child with body
- stumbles in wind
- freezes when she sees the sealed door
- slowly lowers a box after recognizing an object

Only use actions compatible with the script scene.

### Audio

Default:
- no dialogue
- no voiceover
- no subtitles
- strong diegetic sound
- optional restrained cinematic score if it strengthens emotion

Examples:
- cardboard scraping pavement
- car trunk slamming
- gate chain rattling
- winter wind
- distant thunder
- floorboard creak
- key turning but stopping
- breath in cold air
- fabric and footsteps

### Continuity

Across all trailer blocks preserve:

- exact protagonist identity
- age
- hair
- clothing
- injuries if any
- child/companion identity if present
- property architecture
- vehicle
- season
- weather progression
- time period
- key props

Do not randomly change outfits or buildings between 10s blocks.

---

# PHASE 12 — TRAILER EDITING RHYTHM

The trailer is not a summary of the entire story.

It is an emotional promise.

Recommended rhythm:

- first 1.5 seconds: immediate human problem or striking action
- by 3 seconds: viewer understands what was lost / what is happening
- by 6 seconds: movement or escalation
- final 2-3 seconds: title-linked mystery image or unresolved emotional beat

For 20-30s trailers, each 10s block must end with a visual or sound bridge that motivates the next block.

Do not reveal the final treasure, legal victory, full secret, final fortune, or final reconciliation.

---

# PHASE 13 — QA GATES

Run all QA internally before output.

## FACTUAL INTEGRITY — HARD PASS

Any invented fact = FAIL.

## TITLE ALIGNMENT — target 98-100

Does every package element support the existing title rather than drift into another story angle?

## SEO QUALITY — target 98-100

Does description/tags use specific story vocabulary naturally and avoid stuffing?

## THUMBNAIL QUALITY — target 98-100

Does the concept produce a 1-2 second visual question, show the specific title object/place, and remain truthful?

## TRAILER HOOK QUALITY — target 98-100

Does the trailer open on emotion/action, stay non-spoiler, use real script scenes, and maintain multi-shot momentum?

## CONTINUITY — HARD PASS

No age, wardrobe, property, child, weather, object, or chronology contradictions.

If any scored component is below 98, revise internally before output.
Do not lower the standard or inflate the score.

---

# OUTPUT BEHAVIOR

When the user provides full script + final title, do **not** ask them to choose among four title options.

The skill chooses the packaging strategy itself and returns one complete package.

Use the format in `references/OUTPUT_TEMPLATE.md`.

If the user asks for only a subset, such as "chỉ thumbnail" or "chỉ trailer", output only that subset but still perform FACT LOCK and title alignment internally.

---

# ABSOLUTE RULES

NEVER:

- invent viral details
- rewrite the locked title without permission
- create four title options in this skill
- use a generic house when the story has a specific motel, depot, lodge, chapel, freight car, workshop, boathouse, etc.
- force `Homeless at...` into metadata if the character is not homeless
- reveal the final secret in the thumbnail
- use a talking-head hook by default
- invent dialogue for the trailer
- create lip-sync unless explicitly requested
- make all trailer shots slow and static
- show random wealth/treasure not in the script
- use multiple unrelated visual hooks in one thumbnail
- let thumbnail and trailer promise different stories

ALWAYS:

**READ FULL SCRIPT → FACT LOCK → TITLE LOCK → CLASSIFY FAMILY → SEO → THUMBNAIL → REAL SCENE MINING → OMNI MULTI-SHOT TRAILER → QA**
