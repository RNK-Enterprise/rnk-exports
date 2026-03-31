# RNK™ Exports Changelog

All notable changes to RNK™ Exports are documented here.

## [Unreleased]

## [1.0.4] - 2026-03-31

### Release Correction

- Corrected the free-module manifest so `protected` remains set to `false`.
- Updated the local validation rule to require the free-tier manifest flag.
- Rebuilt the published release assets for the corrected free-module manifest.

## [1.0.3] - 2026-03-31

### Clean Up

- Aligned the remaining `RNK™ Exports` branding in code, documentation, and validation output.
- Updated export-all wording so the UI and documentation match the actual bundle contents, including selected world folders.
- Cleaned the README structure, installation steps, usage notes, and support section.
- Removed stale changelog claims that no longer matched the current codebase.
- Extended local validation to scan for blocked wording and emoji characters.

## [1.0.2] - 2026-03-19

### Fixes

- Restored import and export parity so RNK™ Exports ZIP bundles can be imported directly from the hub.
- Added ZIP parsing support for the module's store-only archives.
- Changed Export Everything to produce one combined ZIP bundle and respect the current compendium selection.
- Clarified world-folder exports as Foundry world-document folder exports.
- Moved module setting registration from `ready` to `init`.
- Added missing export-failure localization and localized the remaining visible UI strings.
- Split stylesheets to keep tracked files within the RNK 500-line limit.
- Added a local validation script for manifest correctness, required files, line caps, and version parity.

## [1.0.0] - 2026-03-17

### Free Release

- Released RNK™ Exports as a free standalone Foundry VTT module for v13.
- Added export workflows for chat, journals, selected compendium packs, and world folders.
- Added split-file export support for compendium and folder bundles.
- Added optional human-readable `.txt` companion files.
- Fixed the import folder duplication issue affecting restored content.

## [0.1.0] - 2026-03-17

### Pre-Release Build

- Added the first ApplicationV2-based export hub layout.
- Added multi-folder selection for Foundry world-document folders.
- Introduced the Crimson Blood Gothic theme pass for the module interface.
- Refined panel switching, export routing, and file packaging helpers during pre-release work.

## [0.0.0] - 2026-01-XX

### Initial Project Setup

- Created the initial module scaffold, manifest, and package metadata.
- Added the first project structure for the export system.

---

**Author**: RNK Enterprise  
**Last Updated**: March 31, 2026
