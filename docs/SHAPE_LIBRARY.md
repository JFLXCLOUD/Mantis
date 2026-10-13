# Original shape library

Open **Shape library** in the Create sidebar. Search names or related words
(for example, `shamrocks`, `St Patrick's`, `butterflies` or `flowers`), or choose
a category. Click a shape to insert it and return to editing. Escape closes the
library and returns focus to its button.

The initial collection includes 36 Mantis originals in Nature, Animals,
Celebrations and Essentials. It is bundled with the app: search works offline,
without accounts, downloads or API keys. It is a curated starter collection,
not a search of the entire web. More designs can be added in future updates.

Shapes are native editable paths with their original proportions. They start
centered on the board, up to two inches on their longest side, and can be
recolored, resized, transformed, repeated or combined with other native
shapes. Insertion is undoable. Project saves, SVG export and print preparation
use the same existing path workflow. Very small or intricate output still
needs appropriate sizing for its intended material and workflow.

The [library geometry dedication](../SHAPE_LIBRARY_LICENSE.md) uses
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/): personal and
commercial use, modification and redistribution without required attribution.
This applies to these original catalog shapes; it does not change the terms
of artwork or fonts you import.

## Adding original designs

`scripts/build-shape-library.mjs` is the auditable geometric source; run
`npm run shapes:build` to regenerate `src/shape-catalog.json`. Every entry has
a stable ID, name, category, search aliases, aspect ratio and normalized path.
The generator combines original primitives with Paper.js; it does not trace,
download or extract existing artwork. Paths use a 100-by-100 coordinate space
and retain their intended proportions via the separate aspect ratio.

Contributions must have clear provenance and compatible free-use rights.
Add helpful singular/plural and subject aliases. Review previews at small
sizes and check that closed paths, holes, dimensions, project round-trips and
SVG export pass `src/shapeCatalog.test.ts`. Browser coverage in
`tests/shape-library.spec.ts` exercises offline search, editing, undo, color,
export, keyboard dismissal, dark/light layouts and the project object limit.
