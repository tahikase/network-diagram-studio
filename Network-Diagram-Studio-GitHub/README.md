# Network Diagram Studio

Network Diagram Studio is a ready-to-run browser application for creating,
editing, exporting, and sharing network diagrams.

## Download and open

1. Download the complete release ZIP.
2. Extract the ZIP into a normal folder.
3. Double-click `Network Diagram Studio.bat`, or open `index.html` in a current
   desktop version of Microsoft Edge or Google Chrome.

No installation, administrator access, Node.js, npm, local server, or sign-in is
required. The application and its four production asset folders work offline.
External documentation and the feedback form require internet access.
Feedback opens Microsoft Forms in a separate tab; access depends on the form's
sharing settings.

## Optional Windows shortcut

Open `desktop` and run `Create Desktop Shortcut.bat`. This creates Network
Diagram Studio shortcuts on the Desktop and Start menu. If the extracted folder
is moved later, run the shortcut creator again.

## Saving and sharing

- **Save JSON** preserves the current tab's editable diagram, Notes, comments,
  and images. It does not save the complete tab strip.
- **Load JSON** opens a saved diagram.
- **PNG** and **SVG** export static images.
- **Screenshot** captures resources, connectors, Shapes and pencil strokes in
  the selected area, using the current zoom and theme.
- Browser auto-save is local to the current browser profile and computer.
- Import SVG/PNG icons or an icon folder; library backup/restore is available.
  Save JSON embeds artwork used in the diagram for sharing.
- Drag palette section headers to reorder them; the browser remembers the order.
- All Icons scrolls with the palette, without a height-capped inner list or
  unused space below it. Search and category headers stay visible while
  scrolling through the catalog. The separate icon picker retains its own
  bounded scroll area.
- Drag diagram tabs, including Overview, to reorder them. The blue insertion
  line shows the destination; the strip scrolls at either edge. Alternatively,
  focus a tab and press **Alt+Left/Right**. Escape cancels a drag. Browser
  auto-save remembers the order without changing the active diagram or its view.
- Imported resources and nested containers can be dragged beyond group borders
  without changing their group membership.
- Double-click an address range, region or custom property value beside a group
  name to edit it on the canvas. Press **Enter** or click elsewhere to save;
  **Escape** cancels. **Tab** saves and moves focus. Undo and Save JSON include
  these edits. Clear a value to hide its chip; it remains available in Properties.
- Connectors inside imported groups can be selected and edited directly.
- Connected shapes remain selectable, movable and text-editable after arrow
  changes, including resized boxes. Click inside a shape to select it.
- Overlapping transparent cards do not block another resource's visible icon
  or name, regardless of the order in which resources were added.
- Hand panning and object dragging avoid unnecessary redraws and toolbar layout
  work without flattening the artwork or changing the editable objects.
- Fullscreen, the drawing toolbar, the tab strip/New tab and the closed Notes
  button use 55%-transparent backgrounds. Text, icons and selected tools remain
  solid. Light/dark themes, hover and keyboard focus are preserved; reduced
  transparency or forced-color preferences use opaque surfaces instead.

Only import and share images you have the legal right to use. This reminder
appears as a warning before importing selected SVG/PNG files or a folder.
Choose **Import icons** / **Import ready icons** to continue, or **Cancel** to
leave the library unchanged. The palette footer does not show this message.

Review diagrams, screenshots, Notes, and JSON files for sensitive information
before sharing them.

## Shape text

**Database** is the last tile in **Shapes**, immediately after the brick wall.
Click or drag it onto the canvas, then move, resize or rotate it like other
shapes. Double-click to add text; it is an editable shape, not a bitmap icon.

Double-click a Text box or another text-capable shape to open its text toolbar.
Choose left, center or right alignment, increase/decrease indentation, or open
**Text alignment > Paragraph spacing** for before/after spacing and line spacing.
These controls apply to **all text in the shape**, not only selected text.
Text sizes include **48, 56, 64, 72, 96 and 128px**. Existing auto-fit behavior
is unchanged: if dense text still appears small, enlarge the shape to give it
more room. Existing diagrams and default text sizes do not change.
**Enter** or **Shift+Enter** starts a new paragraph; automatic wrapping does not.
**Ctrl+Enter** (**Cmd+Enter** on Mac) or clicking elsewhere finishes editing.
**Escape** cancels text edits; Undo also reverses formatting. Save JSON, browser
auto-save and image exports retain the formatting.

## Three-minute demo

Open **Settings > Demo video** for the current UI walkthrough. It covers palette
icons and shapes, importing icons or a folder, drawing VNet peering, Notes and a
colleague's JSON/comment handoff, local ARM import, PNG/SVG exports, screenshots,
Appearance, keyboard shortcuts and Guide.

The 3:00 video includes English narration, optional captions, 12 chapters and
a matching transcript, all available offline. The colleague review is a
simulated file handoff, not live collaboration; names are self-declared.
The synthetic examples do not deploy or change Azure resources.

## What's new

Click **What's new** beside the palette version, or open **Settings > What's
new**. The smaller, centered window lists releases newest first with dates,
short descriptions and before/after images. Scroll through the history or use
the version selector; click an image to enlarge it.

The same layout is used for every release. History and images are included
offline, and the text follows the selected interface language. Screenshot
labels retain the language of the original capture. A quiet New badge marks
an unseen version; the window does not open automatically while you draw.
Viewing or closing history does not change your diagram.
Only new product features and enhancements appear here. Bug fixes and internal
maintenance are omitted and do not trigger a New badge; the fixes remain in the app.
The Settings panel stays inside the drawing area, below the top toolbar and
above the diagram tabs. It adapts to window and side-panel resizing, with
internal scrolling and a visible heading and version.

## Package contents

```text
index.html
Network Diagram Studio.bat
production_arm\
production_demo\
production_editor\
production_vendor\
desktop\
licenses\
LICENSE
README.md
README.txt
AGENTS.md
THIRD-PARTY-NOTICES.txt
development\
```

Keep `index.html` and all four `production_*` folders together. They provide ARM
import, the walkthrough, editor controls, connector routing, screenshots, and
the vendor icon catalog. Keep the license and notice files with redistributed
copies.

## Developing and releasing

This is the main production project. The `development` folder contains its own
editable source, runtime asset templates, dependency lockfile, tests and release
tools. A colleague can copy this complete folder and work without a separate
demo project. See `development\README.md` for setup and the release workflow.

Normal builds stage a candidate without replacing the installed app.
Publication is a separate, verified command and updates only this production
folder. The demo/testing project is independent and is not automatically
updated. Keep `development` when sharing editable source; omit its
`node_modules` and `.release` directories.
Staged runtime-only candidates omit `development`; share the whole main
project, not just a staged candidate, when a colleague needs editable source.

Every release needs a classification checked by the included tools. Only new
product features and enhancements require a localized What's new entry and
real comparison images in the shared layout. Classify bug-fix-only releases as
`fix` and maintenance as `internal`; neither belongs in the user history.
The build rejects public Fix categories and nonpublic classifications. Mixed
releases announce only the new product update. Authors still review the content
and must not relabel bug fixes as features or enhancements.

## Version

Network Diagram Studio v0.9.126

## License

The original application is licensed under the MIT License. Third-party
software and architecture artwork retain their respective licenses, attribution
requirements, and trademark conditions. See `THIRD-PARTY-NOTICES.txt` and
`licenses`.
