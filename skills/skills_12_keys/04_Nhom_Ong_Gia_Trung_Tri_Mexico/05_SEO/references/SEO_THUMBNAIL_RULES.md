# PADRE MX V1.2 — TWO-IMAGE THUMBNAIL DESIGN CONTRACT

These two user-supplied visual examples are stored alongside this skill:
- `example_thumbnail.jpg`: final Spanish thumbnail with text LEFT and man's portrait RIGHT.
- `example_green_screen.png`: the same right-side subject isolated against full vivid pure green.

## Final artifact A: THUMBNAIL.png
- Full 16:9, same exact width/height as green-screen image, RGB PNG (1920x1080 preferred, 1280x720 minimum).
- White/light left copy zone ~60–65%, photographic male subject right ~35–40% with strong credible emotion; correct pose/expression and wardrobe from actual script, NOT copied from sample.
- Inspired by sample visual hierarchy: several readable lines of uppercase natural es-MX text with black, cyan and orange emphasis, red footer bar + yellow kicker. Use one coherent dramatic event from QA-READY script; choose short readable copy, avoid excessive lines. Check accents and line breaks manually.
- Background on portrait side can reflect story setting, but final thumbnail must use SAME portrait cutout and pixel position as matching green image.

## Final artifact B: THUMBNAIL-NENXANH.png
- Background pure RGB #00FF00 (0,255,0) across the ENTIRE canvas under the subject, including full left area; no text, patterns, gradients, banding, shadows, watermarks, props, logos or other people.
- Subject is pixel-positioned at right exactly as in final thumbnail. Copy the SAME alpha portrait layer; do not re-render approximate face or change crop, outfit or size. Keep edges clean and no green outfit regions that will key away.
- 16:9 resolution matches A EXACTLY. PNG lossless; no JPEG artifacts. Human QA face/hair/jacket alignment before PASS.

## Generation order
1. Derive a character identity, wardrobe, lighting and right-side framing from approved script.
2. Generate one alpha portrait/cutout, or mask a single high-quality source portrait without replacing the person.
3. Composite the same cutout onto both backgrounds at identical coordinates. Render A with Spanish title copy and B with full #00FF00 flat backdrop.
4. Save both actual images as `THUMBNAIL.png` and `THUMBNAIL-NENXANH.png` in episode output directory.
5. Run `validate_thumbnail_pair.py` and visually inspect cross-file identity; no 3-up collages, prompts-only PASS or independently generated unmatched faces.

If image tools are unavailable, output two labeled prompts but mark image output BLOCKED. Content sources are fictional unless verified; do not stamp "HISTORIA REAL".
