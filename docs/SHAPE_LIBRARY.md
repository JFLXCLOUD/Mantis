# Searchable artwork library

Open **Shape library** in the Create sidebar or collapsed tool rail. Search
names and related words, choose a category or filter by collection. Click a
preview to insert it and return to the canvas. Escape closes the library.

The bundled catalog contains **1,055 designs**: 36 Mantis originals and 1,019
filled designs adapted from Tabler Icons 3.49.0. It works offline without an
account, downloads or API keys. Results are paged in groups of 40; the count
shows all matches. This is a curated vector catalog, not a web image search.

Search examples include shamrocks, clovers, flowers, butterflies, cherries,
hearts, arrows, buildings, vehicles, weather, sports and symbols. Tabler's
upstream names, categories and keywords expand the searchable vocabulary.
Brand marks are excluded from the bundled collection.

Inserted designs are native editable paths, centered on the board at up to
two inches on their longest side. They preserve their proportions and can be
recolored, resized, transformed, repeated or combined. Insertion is undoable.
Project files, SVG exports and print preparation use the existing path workflow.

## Free-use terms

- **Mantis originals:** [CC0 dedication](../SHAPE_LIBRARY_LICENSE.md), allowing
  personal and commercial use without attribution.
- **Tabler filled:** [MIT license](../licenses/TABLER_ICONS.txt), Copyright
  (c) 2020-2026 Pawel Kuna. Personal and commercial use is permitted; retain
  the license notice when redistributing the covered digital artwork. The
  full upstream notice is bundled in the app and included in SVG exports.

Each card identifies its collection/license. Imported user artwork and fonts
keep their own terms. These notices do not promise the suitability of an
intricate design for a particular material, scale or cutting process.

## Rebuilding the catalogs

`npm run shapes:build` regenerates the 36 original designs from their auditable
geometric source in `scripts/build-shape-library.mjs`.

`npm run shapes:tabler` regenerates the Tabler catalog and copies its full
license from the pinned build dependency. The generator handles filled paths,
closes implicitly closed contours, combines component paths and normalizes
geometry to a 100-by-100 coordinate space with a separate aspect ratio.
Outline-only icons and brand marks are not included.

Contributions need clear provenance and compatible free-use terms. Preserve
names, helpful tags and source attribution. `src/shapeCatalog.test.ts` checks
all bundled entries for unique IDs, closed/bounded geometry and project/SVG
round-trips. Browser checks cover offline search, categories, paging, edits,
undo, export, keyboard dismissal, themes and the 1,000-object project limit.
