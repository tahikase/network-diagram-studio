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

## Optional Windows shortcut

Open `desktop` and run `Create Desktop Shortcut.bat`. This creates Network
Diagram Studio shortcuts on the Desktop and Start menu. If the extracted folder
is moved later, run the shortcut creator again.

## Saving and sharing

- **Save JSON** preserves the editable diagram, Notes, comments, and images.
- **Load JSON** opens a saved diagram.
- **PNG** and **SVG** export static images.
- Browser auto-save is local to the current browser profile and computer.
- Import SVG/PNG icons or an icon folder; library backup/restore is available.
  Save JSON embeds artwork used in the diagram for sharing.
- Drag palette section headers to reorder them; the browser remembers the order.
- Imported resources and nested containers can be dragged beyond group borders
  without changing their group membership.

Only import and share images you have the legal right to use. This reminder
appears as a warning before importing selected SVG/PNG files or a folder.
Choose **Import icons** / **Import ready icons** to continue, or **Cancel** to
leave the library unchanged. The palette footer does not show this message.

Review diagrams, screenshots, Notes, and JSON files for sensitive information
before sharing them.

## Three-minute demo

Open **Settings > Demo video** for the current UI walkthrough. It covers palette
icons and shapes, importing icons or a folder, drawing VNet peering, Notes and a
colleague's JSON/comment handoff, local ARM import, PNG/SVG exports, screenshots,
Appearance, keyboard shortcuts and Guide.

The 3:00 video includes English narration, optional captions, 12 chapters and
a matching transcript, all available offline. The colleague review is a
simulated file handoff, not live collaboration; names are self-declared.
The synthetic examples do not deploy or change Azure resources.

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
THIRD-PARTY-NOTICES.txt
```

Keep `index.html` and all four `production_*` folders together. They provide ARM
import, the walkthrough, editor controls, connector routing, screenshots, and
the vendor icon catalog. Keep the license and notice files with redistributed
copies.

## Version

Network Diagram Studio v0.9.107

## License

The original application is licensed under the MIT License. Third-party
software and architecture artwork retain their respective licenses, attribution
requirements, and trademark conditions. See `THIRD-PARTY-NOTICES.txt` and
`licenses`.
