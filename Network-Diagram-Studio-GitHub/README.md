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
External documentation and email feedback actions require internet access.

## Optional Windows shortcut

Open `desktop` and run `Create Desktop Shortcut.bat`. This creates Network
Diagram Studio shortcuts on the Desktop and Start menu. If the extracted folder
is moved later, run the shortcut creator again.

## Saving and sharing

- **Save JSON** preserves the editable diagram, Notes, comments, and images.
- **Load JSON** opens a saved diagram.
- **PNG** and **SVG** export static images.
- Browser auto-save is local to the current browser profile and computer.

Review diagrams, screenshots, Notes, and JSON files for sensitive information
before sharing them.

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

Network Diagram Studio v0.9.79

## License

The original application is licensed under the MIT License. Third-party
software and architecture artwork retain their respective licenses, attribution
requirements, and trademark conditions. See `THIRD-PARTY-NOTICES.txt` and
`licenses`.
