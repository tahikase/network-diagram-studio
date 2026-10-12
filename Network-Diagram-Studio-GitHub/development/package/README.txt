NETWORK DIAGRAM STUDIO v{{VERSION}}
================================

HOW TO RUN
----------
1. Extract the complete ZIP into a normal folder.
2. Double-click "Network Diagram Studio.bat".

You can also open index.html directly in a current desktop version of
Microsoft Edge or Google Chrome.

No installation, administrator access, Node.js, npm, local server, or sign-in
is required. The application and its production asset folders work offline.
Feedback opens Microsoft Forms in a separate tab and requires internet access.
Form access depends on its sharing settings.


OPTIONAL WINDOWS SHORTCUT
-------------------------
Open the "desktop" folder and double-click "Create Desktop Shortcut.bat".
If you move the extracted folder later, run the shortcut creator again.


SAVING AND SHARING
------------------
Save JSON preserves the current tab's editable diagram, Notes, comments, and
images. It does not save the complete tab strip.
Load JSON opens a saved diagram. PNG and SVG export static images.
Screenshot captures resources, connectors, Shapes and pencil strokes in the
selected area, using the current zoom and theme.
Hand panning and object dragging avoid unnecessary redraws and toolbar layout
work without flattening the artwork or changing the editable objects.
Fullscreen, the drawing toolbar, the tab strip/New tab and the closed Notes
button use 55%-transparent backgrounds. Text, icons and selected tools stay
solid. Light/dark themes, hover and keyboard focus are preserved. Reduced
transparency or forced-color preferences use opaque surfaces instead.

Browser auto-save stays in the current browser profile and computer.
Import SVG/PNG icons or a folder; back up and restore the library from its menu.
Save JSON embeds icons used by the diagram. Drag palette section headers to
reorder them; the browser remembers that order.
All Icons scrolls with the palette, without a height-capped inner list or unused
space below it. Search and category headers stay visible while scrolling
through the catalog. The separate icon picker keeps its own bounded scroll area.
Drag diagram tabs, including Overview, to reorder them. The blue insertion line
shows the destination; dragging at either edge scrolls the strip. Alternatively,
focus a tab and press Alt+Left/Right. Escape cancels a drag. Browser auto-save
remembers the order without changing the active diagram or its view.
Imported resources and nested containers can be dragged beyond group borders
without changing their group membership.
Double-click an address range, region or custom property value beside a group
name to edit it on the canvas. Enter or clicking elsewhere saves; Escape cancels.
Tab saves and moves focus. Undo and Save JSON include these edits. Clearing a
value hides its chip; the value remains available in Properties.
Connectors inside imported groups can be selected and edited directly.
Connected shapes remain selectable, movable and text-editable after arrow
changes, including resized boxes. Click inside a shape to select it.
Grab anywhere inside a shape's body to move it, including the Actor's limbs
and the empty space between them. Smaller shapes and arrows inside a frame
remain directly selectable even when the frame was added last.
If objects completely cover one another, right-click > Select object, choose
the desired shape, resource, container, image or connector, then drag the
chosen object's body (or edit the connector). Saved stacking order does not
change. Escape dismisses the list; right-drag still pans.
Overlapping transparent cards do not block another resource's visible icon
or name, regardless of the order in which resources were added.
Only import and share images you have the legal right to use. This reminder
appears as a warning before importing selected SVG/PNG files or a folder.
Choose Import icons / Import ready icons to continue, or Cancel to leave the
library unchanged. The palette footer does not show this message.
Review diagrams, screenshots, Notes, and JSON files for sensitive information
before sharing them.


SHAPE TEXT
----------
Database is the last tile in Shapes, immediately after the brick wall.
Click or drag it onto the canvas, then move, resize or rotate it like other
shapes. Double-click to add text; it is an editable shape, not a bitmap icon.

Double-click a Text box or another text-capable shape to open its text toolbar.
Choose left, center or right alignment, increase/decrease indentation, or open
Text alignment > Paragraph spacing for before/after spacing and line spacing.
These controls apply to all text in the shape, not only selected text.
Text sizes include 48, 56, 64, 72, 96 and 128px. Existing auto-fit behavior is
unchanged: if dense text still appears small, enlarge the shape to give it
more room. Existing diagrams and default text sizes do not change.
Enter or Shift+Enter starts a new paragraph; automatic wrapping does not.
Ctrl+Enter (Cmd+Enter on Mac) or clicking elsewhere finishes editing.
Escape cancels text edits; Undo also reverses formatting. Save JSON, browser
auto-save and image exports retain the formatting.


THREE-MINUTE DEMO
-----------------
Open Settings > Demo video for the current UI walkthrough. It covers palette
icons and shapes, importing icons or a folder, drawing VNet peering, Notes and a
colleague's JSON/comment handoff, local ARM import, PNG/SVG exports, screenshots,
Appearance, keyboard shortcuts and Guide.

The 3:00 video includes English narration, optional captions, 12 chapters and
a matching transcript, all available offline. The colleague review is a
simulated file handoff, not live collaboration; names are self-declared.
The synthetic examples do not deploy or change Azure resources.


WHAT'S NEW
----------
Click What's new beside the palette version, or open Settings > What's new.
The smaller centered window lists releases newest first, with dates, short
descriptions and before/after images. Scroll, choose a version or enlarge an
image. The same style is used for every release.

History and images are included offline. Text follows the selected language;
screenshot labels retain their captured language. A quiet New badge marks an
unseen version. The window does not open automatically while you draw, and
viewing history never changes the diagram.
Only new product features and enhancements appear here. Bug fixes and internal
maintenance are omitted and do not trigger a New badge; the fixes remain in the app.
The Settings panel stays inside the drawing area, below the top toolbar and
above the diagram tabs. It adapts to window and side-panel resizing, with
internal scrolling and a visible heading and version.


PACKAGE CONTENTS
----------------
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

Keep index.html and all four production_* folders together. They provide ARM
import, the walkthrough, editor controls, connector routing, screenshots, and
the vendor icon catalog. Keep the license and notice files with redistributed
copies.


DEVELOPING AND RELEASING
------------------------
This is the main production project. Its editable source, runtime asset
templates, dependency lockfile, tests and release tools are in "development".
See development\README.md for setup and the independent release workflow.

Normal builds stage a candidate without changing the installed app.
Publication is a separate verified command and updates only this production
folder. The separate demo/testing project is not automatically updated.
Keep development when sharing editable source; omit node_modules and .release.
Staged runtime-only candidates omit development. Share the whole main project,
not just a staged candidate, when a colleague needs editable source.

Every release is classified. Only new product features and enhancements need a
localized What's new entry and real images in the shared layout. Classify
bug-fix-only releases as "fix" and maintenance as "internal"; neither belongs
in user history. The build rejects public Fix categories and nonpublic
classifications. Mixed releases announce only the new product update. Authors
must review the content and never relabel bug fixes as features or enhancements.
