# RNK™ Exports

**Version**: 1.0.5  
**Module ID**: `rnk-exports`  
**Release Tier**: Free  
**Compatibility**: Foundry VTT v13-14 (minimum: 13, verified: 14)  
**License**: RNK Proprietary License

## Purpose

RNK™ Exports is a standalone Foundry VTT export hub for packaging world data into portable ZIP bundles. It handles chat logs, journal entries, selected compendium packs, and selected world-document folders, and it can restore RNK™ Exports JSON and ZIP bundles back into the current world.

## Features

- Export chat messages as combined or split JSON bundles
- Export journal entries with optional human-readable `.txt` companion files
- Export selected compendium packs as combined or split bundles
- Export selected world-document folders while preserving nested folder paths
- Restore RNK™ Exports `.json` and `.zip` bundles into world documents
- Create one combined export bundle from the Export tab
- Restrict access to GMs through a Foundry VTT v13-14 `ApplicationV2` interface

## Module Structure

```text
rnk-exports/
├── module.json                 # Foundry manifest
├── package.json                # Local validation metadata
├── CHANGELOG.md                # Version history
├── README.md                   # Module documentation
├── LICENSE                     # RNK Proprietary License
├── lang/
│   └── en.json                 # English localization
├── scripts/
│   └── validate.mjs            # Local validation script
├── src/
│   ├── main.js                 # Module initialization and scene control registration
│   ├── apps/
│   │   └── ExportHubApp.js     # Main ApplicationV2 export hub
│   └── utils/
│       ├── exportHelpers.js    # Export bundle builders
│       ├── importHelpers.js    # Import and restore helpers
│       └── ZipBuilder.js       # Store-only ZIP reader and writer
├── styles/
│   ├── module.css              # Shared module theme
│   ├── import.css              # Import panel styling
│   └── panels.css              # Folder and settings panel styling
└── templates/
    └── export-hub.hbs          # Main hub template
```

## Installation

1. Copy the module folder into your Foundry VTT `Data/modules` directory.
2. Enable `RNK™ Exports` in the world module list.
3. Open the scene controls as a GM and launch the export hub.

## Usage

1. Open the `RNK™ Exports` hub from the scene controls toolbar.
2. Choose the export type you want on the Export tab.
3. Select specific compendium packs before running a compendium export.
4. Select world folders on the World Folders tab before running a folder export.
5. Use the Import tab to restore an RNK™ Exports `.json` or `.zip` bundle into world documents.

## Export Types

- **Chat Export**: Saves chat messages as combined or split JSON bundles with optional `.txt` companion files.
- **Journal Export**: Saves journal entries as combined or split JSON bundles with optional `.txt` companion files.
- **Compendium Export**: Saves selected pack contents as JSON bundles; split mode writes one JSON file per document.
- **World Folder Export**: Saves selected Foundry world-document folders and their nested folder paths as document bundles.
- **Export Everything**: Creates one ZIP bundle containing chat, journals, selected compendia, and any selected world folders.

## Import and Restore

- RNK™ Exports JSON and ZIP bundles can be restored from the Import tab.
- Imported content is created as world documents in the current world.
- Restored compendium bundle content is grouped as world documents and does not recreate compendium packs.

## Screenshots

### RNK™ Exports Screenshot 1

![RNK™ Exports Screenshot 1](./rnk-exports-1.png)

### RNK™ Exports Screenshot 2

![RNK™ Exports Screenshot 2](./rnk-exports-2.png)

### RNK™ Exports Screenshot 3

![RNK™ Exports Screenshot 3](./rnk-exports-3.png)

## Technical Details

- **Framework**: Foundry VTT v13-14 `ApplicationV2`
- **Architecture**: Standalone export hub with separate export, import, and ZIP helper modules
- **Styling**: Split stylesheet layout to keep tracked files under the RNK 500-line limit
- **Validation**: `npm test` validates manifest JSON, version parity, protected flag, required files, line caps, blocked wording, and emoji characters

## Known Limitations

- Restored compendium bundles create world documents instead of rebuilding compendium packs.
- Large exports can take longer depending on world size and browser memory limits.
- The theme is tuned for dark Foundry layouts.

## My Story

RNK Enterprise is built by The Curator, a retired truck driver, self-taught coder, and stroke survivor who keeps building tools for Foundry VTT the hard way: with persistence, grit, and a refusal to quit.

## License

RNK Proprietary License. See `LICENSE` for details.

## Support

For issues, questions, or support, contact RNK Enterprise.

Patreon: [RNK Enterprises Patreon](https://patreon.com/RagNaroks?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink)

---

**Author**: RNK Enterprise  
**Last Updated**: March 31, 2026
