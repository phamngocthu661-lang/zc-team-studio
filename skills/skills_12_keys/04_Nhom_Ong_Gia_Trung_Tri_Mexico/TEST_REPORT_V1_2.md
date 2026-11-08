# PADRE MX V1.2 — regression report
Test date: 2026-11-07. Test files were SYNTHETIC fixtures, not quality reviews of a new story or image.

- PASS Stage A: actual 22,000 characters, verified and SHA-bound
- PASS Stage B: actual 32,400 characters, verified and SHA-bound
- PASS Stage C: actual 22,000 characters, verified and SHA-bound
- PASS Complete 76,400-character manuscript, 7 ordered Parts
- PASS Stage A rejects a Part that is too short (4,500)
- PASS Full verifier rejects an approximately 37,800-character half-length manuscript
- PASS SEO validator accepts exactly 2 output prompts + 3 matching source quotes
- PASS SEO validator rejects the missing green-screen prompt
- PASS Thumbnail-pair validator accepts two same-size 16:9 PNGs with flat green and right-side dummy portrait
- PASS Thumbnail-pair validator rejects nonuniform green

TOTAL: 10 new targeted checks, PASS 10 / FAIL 0. Python compileall also passed. Mechanical tests DO NOT certify storytelling, graphics fidelity or identity matching. Visual review is required in STEP6.
