# OMNI MULTI-SHOT TRAILER SPEC — 10s BLOCKS

This is a model-friendly natural-language specification for creating emotionally intense 10-second video blocks. It intentionally avoids depending on undocumented proprietary syntax.

## CORE DESIGN

Each prompt is exactly one 10-second generated video block.
A complete trailer may contain 1, 2, or 3 blocks = 10, 20, or 30 seconds total.

Each block contains multiple editorial shots.

Default:
- 3-5 shots
- 1.2-3.2 seconds per shot
- exact shot timing totals 10.0 seconds

No character dialogue by default.
No lip sync.
No talking to camera.

---

# PROMPT ORDER

## 1. FORMAT / INTENT

Example shape:

`Create a 10-second cinematic emotional story trailer in 16:9. Use 4 distinct shots with clean hard cuts. The scene must feel immediate, human, and realistic rather than like a slow montage.`

## 2. CHARACTER LOCK

State only story-supported facts:

- age
- hair
- clothing
- physical condition
- emotional state
- child/companion if present

Use the same description in every block.

## 3. ENVIRONMENT / PERIOD LOCK

State:

- exact place
- time period
- season
- weather
- architecture
- vehicle/props

Do not let the environment mutate across cuts.

## 4. EMOTIONAL ARC

Use a short causal phrase such as:

`humiliation → forced departure → stunned first sight`

or

`desperation → physical effort → impossible clue`

## 5. SHOT TIMELINE

Write exact time ranges.

Good pattern:

- Shot 1: immediate wound/action
- Shot 2: close human reaction or physical detail
- Shot 3: movement/escalation
- Shot 4: unresolved visual hook

## 6. PHYSICAL PERFORMANCE

Prefer observable micro-actions:

- grips suitcase until knuckles whiten
- shoves final box into trunk
- stops mid-step
- wipes cheek with sleeve while walking
- pulls child closer
- braces against wind
- fingers hesitate over old key
- knees sink into wet ground
- recoils from cold air coming through crack

Avoid abstract emotions without behavior.

## 7. CAMERA

Use varied but coherent shot grammar:

- wide establishing
- medium tracking
- handheld close detail when stress rises
- low-angle object reveal
- over-shoulder discovery
- controlled push-in only for the final beat

Do not use camera chaos merely to look cinematic.

## 8. LIGHT / WEATHER

Lighting must match the script and emotional phase.

Examples:
- harsh midday eviction
- gray rain at arrival
- warm sunset against derelict motel
- blue-white blizzard exterior / amber shelter interior

## 9. SOUND DESIGN

Prioritize diegetic cues:

- suitcase wheels on gravel
- door slam
- trunk slam
- wind through broken siding
- child breathing
- wet boots
- floorboard groan
- old key scrape
- sudden silence before clue

Optional restrained score:
- low piano pulse
- restrained strings
- low percussive heartbeat

No lyrics.

## 10. CONTINUITY LOCK

Explicitly preserve:

- same face
- same body proportions
- same hairstyle
- same clothing
- same child/companion
- same building
- same vehicle
- same key props
- correct weather progression

## 11. NEGATIVE CONSTRAINTS

Always include:

- no dialogue
- no voiceover unless requested
- no lip sync
- no subtitles
- no text
- no logo
- no watermark
- no extra people
- no outfit changes
- no face morphing
- no duplicate characters
- no random props
- no invented treasure
- no time-period errors
- no impossible camera teleportation
- no slow motion unless specifically motivated

---

# TRAILER ARC TEMPLATES

## 10s — ONE-BEAT HOOK

`human wound → reaction → mystery image`

Use when one scene is enough.

## 20s — TWO-BEAT HOOK

Block 1:
`injustice/loss → forced action`

Block 2:
`arrival/struggle → clue`

Use a sound or motion bridge between blocks.

## 30s — THREE-BEAT HOOK

Block 1:
`wound`

Block 2:
`transition/survival effort`

Block 3:
`title-specific mystery tease`

Do not reveal the final answer.

---

# MULTI-SHOT PACING RULE

The hook should not feel like four unrelated B-roll clips.
Every shot must causally connect.

Use:

**because this happened → she did this → therefore she arrived here → then she noticed this**

This keeps emotional intensity while preserving story logic.
