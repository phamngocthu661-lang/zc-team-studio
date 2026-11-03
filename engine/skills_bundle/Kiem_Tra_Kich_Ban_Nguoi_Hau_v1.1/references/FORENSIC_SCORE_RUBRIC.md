# FORENSIC SCORE RUBRIC — NGƯỜI HẦU V1.1

## PURPOSE
Make every `/100` score deterministic and comparable across repeated QA cycles. The same script evaluated under the same frozen contract should receive materially the same score.

## 1. COMPONENT WEIGHTS — TOTAL 100
A. Title / Outline / DNA / Part Fidelity — **20**
B. Continuity / Causality / Knowledge / Action Logic — **20**
C. Heroine Agency / Competence / Climax Contribution — **15**
D. Character / Antagonist / Romance / Consent / Power Balance — **10**
E. Hook / Retention / Open Loops / Payoff — **10**
F. Production Contract: Length / Word Lock / TTS / Structure — **10**
G. YouTube / Advertiser Safety — **10**
H. Human Prose / American English / Copy Quality — **5**

Start every component at its maximum, then deduct only for actionable root defects.

## 2. SEVERITY DEDUCTION INSIDE THE PRIMARY COMPONENT
Each root defect has exactly ONE `Score Component` and ONE severity.

- **P0:** set that component to **0**. Also cap total Forensic Score at **59/100** until the P0 is removed.
- **P1:** deduct **30% of that component's maximum**.
- **P2:** deduct **12% of that component's maximum**.
- **P3:** deduct **4% of that component's maximum**.

Round component scores to one decimal, total to nearest whole number.
Component score cannot go below 0.

## 3. ROOT-ISSUE / OCCURRENCE RULE
Do NOT deduct the same defect multiple times merely because it has many occurrences.
- One recurring root defect = one severity deduction.
- O01...On are edit locations, not extra score deductions.
- If occurrences cause independently different consequences, create separate Pxx root defects.
- A defect may list secondary affected areas, but score deduction occurs only in its primary component.

## 4. STANDARD LENGTH CLASSIFICATION
Unless latest user hard constraints explicitly override the standard contract:

### Visible characters
- 44,000–48,000 = target PASS.
- 40,000–43,999 or 48,001–55,000 = TARGET MISS; normally P2 in Component F.
- <40,000 or >55,000 = hard failure; P0 in Component F.

### Words
- 7,400–7,650 = target PASS.
- 7,200–7,399 or 7,651–7,750 = TARGET MISS; normally P2 in Component F.
- 7,751–7,999 = major target risk; normally P1 in Component F.
- 8,000+ = hard failure; P0 in Component F.

Do not double-deduct character target miss and word target miss as two separate root defects when they are the same length-control root cause. Use one Production Contract defect with all affected metrics.

## 5. TTS CLASSIFICATION
- Any bracketed stage/audio/performance cue violates zero-cue TTS contract.
- Isolated accidental cue = normally P2 in Component F.
- Repeated/systemic cue pattern = normally P1 in Component F.
- Production notes/camera directions contaminating the copy-ready script at scale may be P1.

## 6. READINESS
- Any actionable P0/P1/P2/P3 → `NEEDS PATCHES` in Mode A.
- `READY` requires zero known actionable defects after full protocol.
- A score of 100 means no known actionable defects under the frozen contract, not metaphysical perfection.

## 7. SCORE STABILITY
Do not change weights, severity deductions, or component ownership between QA rounds in the same story workflow.
If the user changes the contract, state `CONTRACT CHANGED` and do not pretend the new score is directly comparable to the old one.

## 8. REPEATED-QA COMPARISON
When a prior QA exists, use `REVISION_SCORE_DELTA_PROTOCOL.md`.
A newly discovered latent defect must be classified as audit omission, not falsely attributed to the revision.
