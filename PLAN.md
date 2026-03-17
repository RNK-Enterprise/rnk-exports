# RNK™ Exports Module - Plan

## Goal
Build a Foundry VTT module that allows a GM to export Foundry data and local JSON resources into a ZIP archive for backup, sharing, and migration.

## Core Features (Phase 1)
1. **Chat Export**
   - Export all chat messages in the current world.
   - Export a thread (filtered by speaker or time window).
   - Export a single message by ID.
   - Output: ZIP containing JSON file(s) and an index manifest.

2. **Journal Export**
   - Export all journal entries (pages included).
   - Export selected entries.
   - Output: ZIP with JSON and associated media referenced.

3. **Compendium Export**
   - Export selected compendium packs (items/actors/journals/macros).
   - Option to export all packs.
   - Output: ZIP containing pack `.db` files and metadata.

4. **Folder / File Export**
   - Browse Foundry `data/` folders using an in-module UI.
   - Select folders (and subfolders) to include in export.
   - Recursively include all JSON files and optionally other file types.
   - Output: ZIP preserving folder structure.

5. **UI Hub**
   - Single GM-only hub (Scene Control button).
   - Tabbed interface: Chat / Journals / Compendia / Folders.
   - Exports show status and download link.

6. **Export Format**
   - ZIP archives generated in-browser using JSZip.
   - Download triggered via browser save dialog.
   - Include `manifest.json` inside zip describing contents.

## Phase 2 (Future / Stretch Goals)
- **Import features**
  - Import journal entries from exported ZIP.
  - Import compendium packs via drag-drop.
- **Scheduled exports**
  - Automate export on world save or on demand.
- **Cloud integration**
  - Optionally upload ZIPs to a remote location.

## Technical Notes
- Use `FilePicker.browse("data", path)` to list folder contents.
- Use `game.messages` and `game.journal` for exports.
- Use `JSZip` bundled inside the module to build ZIP files.
- Exports should work for both Linux/Windows path conventions (Foundry uses `/`).

## Next Steps
1. Implement export utilities in `src/utils/export-helpers.js`.
2. Wire export actions in `ExportHubApp` to helper functions.
3. Add ZIP generation and download helper.
4. Add unit tests (via Quench) for export helpers.

---

**Notes:**
- This plan follows RNK Dev Bible standards (500 LOC per file, lazy load, hook cleanup).
- The module will be proprietary and include RNK license headers.
