# USAGE EXAMPLES

## Single title
User:
Her Late Father Left Her Nothing but a Waterfall—Then She Found the Cabin Hidden Behind It

Expected behavior:
- classify content family
- preserve inheritance + unusual bequest + hidden-property discovery DNA
- generate 5+ rewrites internally
- iterate until strict 98+
- output only the best final rewrite unless another output mode is requested

## Multiple titles
User:
Her Late Father Left Her Nothing but a Waterfall—Then She Found the Cabin Hidden Behind It
Homeless at 19, She Paid $2 for a Cursed Cabin—What Was Inside Shocked the Town
She Inherited a Ghost Town Wiped Off Every Map—What She Found Buried Explained Why

Expected behavior:
- treat each line independently
- preserve order
- run cross-title duplication check
- return one approved final title per source title

## Compact mode
User:
TITLE ONLY
[title list]

Expected output:
[rewrite 1]
[rewrite 2]
[rewrite 3]


## Hard 100-character limit
User:
Rewrite this title for maximum CTR.

Expected behavior:
- generate candidates internally
- count every candidate before scoring
- automatically discard any candidate over 100 characters
- score only candidates at 100 characters or fewer
- final approved title must be both <=100 characters and 98-100/100
- if a 98+ candidate is over 100 characters, it is still rejected and must be rewritten shorter


## Retention-serviceability example
If a source title uses a highly technical object name unfamiliar to general viewers, preserve the unusual discovery DNA but prefer a plain-language noun unless the technical term is itself proven. The approved rewrite must be understandable immediately and must support title-promise contact in the first ~200 script characters downstream.
