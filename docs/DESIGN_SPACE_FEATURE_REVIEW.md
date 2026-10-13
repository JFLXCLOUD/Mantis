# Design Space workflow review — October 12, 2026

The owner requested a hands-on comparison before the next Mantis feature pass.
The installed Windows Design Space application was opened through its normal
interface (launcher reported 10.6.104). The review used a temporary text example
on an initially empty canvas and inspected rendered controls, labels and menus.
Local screenshots stay in ignored research storage. No proprietary source,
artwork, icons, font files, presets or UI assets were copied into Mantis.

## What was inspected

| Workflow | Evidence from the review | Mantis 0.14.0 |
| --- | --- | --- |
| Starting a project | Live home categories and project-type chooser, including a blank canvas | Blank projects and original sample artwork; task-specific templates remain planned |
| Compact editing | Live selection toolbar and More popover with Format, Size, Flip, Arrange, Align, Rotate, Effects, Combine and Contour | Compact top menus, collapsible left tools, separate layer panel |
| Text format | Live Format panel: family, size, style, alignment, letter/line spacing, wrapping, vertical alignment and separation actions | Text/Style/Curve/Layout tabs; manual word wrapping and line/letter separation added; automatic reflow and vertical text-box alignment remain planned |
| Font browsing | Live Cricut/System/Recent/Bookmarked tabs and filters | Installed/imported fonts and previews; recent/favorite font collections remain planned |
| Effects | Live Offset, Sticker, Warp and Curve menu | Curves, outline/shadow appearance, plus native-shape Offset; geometric warp and sticker workflow remain planned |
| Offset | Live signed distance, corner style, weld switch, Cancel and Apply controls | Rounded/sharp borders and insets; merge or separate outputs; live preview and explicit add; original objects retained |
| Warp | Live subscription notice and 30 preview choices with adjustment/undo controls | Independent distortion tools remain planned; no subscription bypass or proprietary templates used |
| Shape combining | Live Weld, Unite, Subtract, Intersect and Exclude menu; public documentation explains reversible combinations | Weld, Subtract, Intersect, Slice and new Exclude create editable paths; undo restores inputs. Persistent editable compound operations remain planned |
| Contour | Disabled on the live text selection; behavior checked in public documentation | Hide/restore individual native subpaths, preserved in project v6; preview and one-step application |
| Material colors | Live color organizer describes moving layers between colors | Color consolidation with affected layer names; protects locked/hidden/guide layers and preserves operations |
| Shape library | Live free and subscription shape sections | 1,055 independently sourced free designs, searchable offline |
| Mat preparation | Live Make entry, copies field and material-loading chooser; On Mat exposes 12×12 and 12×24 choices | Copies, canvas/compact layout, mat sizes, margins, gaps and multiple-mat SVG/draft export |
| Attach/Flatten | Live layer actions; public descriptions checked | Separate planned work: mixed-operation attachments, printable composites and explicit cut contours |

The Design Space loading chooser remained covered by a busy overlay when
confirming the mat selection, so a complete native mat-to-machine sequence
was **not** verified in this review. No Continue-to-machine or cut command was
issued. A normal application close was requested afterward; the busy window
remained open.

## Scope and practical limits

- Offset and Contour currently accept visible, unlocked **Basic cut native
  shapes and library paths**. Text-to-path conversion and decomposition of
  imported SVG are prerequisites for extending them to those object types.
- Offsets are real vector geometry, distinct from text's outline appearance.
  Curves are approximated within 0.08 canvas pixels before integer polygon
  offsetting. Sharp corners use a bounded miter. This is editor geometry, not
  a physical cutting-accuracy claim.
- Separate lines preserves styled straight-text placement. Separate letters
  supports plain straight single-line text and keeps measured advances;
  separated font ligatures can change. Curves must be straightened first.
  Word wrapping inserts editable line breaks at word boundaries; it is not
  automatic text-box reflow.
- Compact preparation is deterministic shelf packing using transformed object
  bounds, not optimal nesting. Same-color, same-operation groups stay together.
  Operations remain separate; Group is not Attach. Copies and arrangements
  remain preparation state and do not rewrite saved canvas artwork.
- Planned mat SVGs and job drafts contain the preview geometry. They do not
  enable direct sending, supply tested machine margins or create sensor marks.

## Next work

1. Font-to-path conversion, editable SVG decomposition and full text offsets.
2. Automatic text reflow, more shaping controls, font favorites and original
   geometric warp effects.
3. Reversible compound operations and richer contour selection.
4. Explicit Attach/Detach relationships across operations, print composites,
   sticker borders/bleed, manual mat placement and nesting improvements.
5. Resume attended machine-session, motion, stop and real-cut validation before
   any public application release.

## Public references

- [Canvas guide](https://help.cricut.com/hc/en-us/articles/26751604105879-Canvas-screen-Design-Space-Guide)
- [Text editing](https://help.cricut.com/hc/en-us/articles/5280755261719-Design-Space-Working-with-Text)
- [Offset](https://help.cricut.com/hc/en-us/articles/360061650414-How-to-use-the-Offset-feature-in-Design-Space)
- [Combine, Slice and Weld](https://help.cricut.com/hc/en-us/articles/9503908902551-Using-Combine-Slice-and-Weld-to-create-new-shapes-in-Design-Space)
- [Contour](https://help.cricut.com/hc/en-us/articles/360009508613-How-to-use-Contour-in-Design-Space)
- [Attach](https://help.cricut.com/hc/en-us/articles/360009380514-How-to-use-Attach-in-Design-Space)
- [Prepare guide](https://help.cricut.com/hc/en-us/articles/26762475430167-Prepare-screen-Design-Space-Guide)

Public documentation and direct UI observation supply behavior requirements.
Mantis implementation and visual design are independent. See the separate
[provenance record](INDEPENDENT_IMPLEMENTATION.md) for earlier device research.
