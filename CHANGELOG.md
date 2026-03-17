# RNK™ Exports - Changelog

All notable changes to the RNK™ Exports module will be documented in this file.

## [0.1.0] - 2026-03-17

### Development Build - Foundry v13 Compliance & UI Refactor

#### New Features

- **Multi-Folder Export System**: Select multiple world folders and export all contents in batches
  - Checkbox-based folder selection with visual tree structure
  - Persistent folder selection state across tab switches
  - Smart folder discovery dynamically listing available worlds
  
- **Crimson Blood Gothic Theme**: Complete UI redesign with immersive Foundry aesthetic
  - Dark crimson color palette (#8B0000, #DC143C, #660000)
  - Gradient backgrounds and smooth transitions
  - Glowing effects and text shadows for depth
  - Responsive card layout (2-column grid with adaptive sizing)
  - Custom scrollbar styling throughout

- **Dynamic Data Structure Discovery**: Automatic detection of available Foundry directories
  - Browses `/worlds` folder to discover actual world folders
  - No hardcoded directory paths - adapts to actual filesystem

#### Improvements

- **ApplicationV2 Lifecycle Compliance**: Full v13 pattern adherence
  - Proper `onRender()` implementation (DOM-guaranteed execution)
  - Single listener attachment with idempotency flag
  - Clean tab switching and state management
  - Proper `close()` hook cleanup to prevent listener duplication

- **CSS-Based State Management**: Eliminated inline style conflicts
  - Removed all `style="display:none;"` attributes from template
  - Pure CSS class toggling via `.rnk-exports-panel-active` class
  - Proper cascading and selector hierarchy
  - Better maintainability and performance

- **Event Delegation Architecture**: Single centralized event listener
  - Button-level click delegation from app.element
  - Action-based routing (`_handleAction()` switch statement)
  - Reduced memory footprint and event listener pollution
  - Improved maintainability and debugging

#### 🔧 Bug Fixes

- **FilePicker API v13 Migration**
  - Fixed deprecation warnings by using namespaced `foundry.applications.apps.FilePicker`
  - Added required empty options object `{}` to all FilePicker.browse() calls
  - Proper v13 API signature compliance

- **Panel Visibility Flickering**: Fixed double-rendering of tabs
  - Removed duplicate `_switchTab()` calls in onRender()
  - Eliminated redundant listener attachment logic
  - Consolidated lifecycle into single, clean execution path

- **Incorrect Directory Listing**: Fixed wrong folders being displayed
  - Changed from browsing root `/data` to `/worlds` directory
  - Now shows actual world folders (germany, nico, test, veil-3, etc.)
  - Removed 22 unrelated system directories from UI

#### Technical Changes

**src/apps/ExportHubApp.js**:
- Simplified `onRender()` to single execution with flag check
- Removed asynchronous lifecycle issues
- Fixed listener attachment idempotency

**templates/export-hub.hbs**:
- Removed inline `style="display:none;"` from all panels
- Added data-action attributes for event delegation routing
- Clean structural markup with proper semantics

**styles/module.css**:
- Complete theme rewrite (400+ lines) with Crimson Blood Gothic aesthetic
- Proper CSS variables for color palette (--rnk-crimson, --rnk-gold, etc.)
- Responsive media queries for small screens
- Smooth animations and transitions (cubic-bezier timing)
- Nested scrollbars for each panel section

**src/utils/exportHelpers.js**:
- Updated helper signatures for v13 compatibility
- Proper error handling for FilePicker results

#### Code Quality

- **100% StyleSheet Compliance**: All CSS follows best practices
- **No Inline Styles**: Pure class-based state management
- **Event Efficiency**: Single delegated listener vs. multiple element listeners
- **Memory Safe**: Proper cleanup in `close()` prevents listener leaks
- **v13 Standards**: Full ApplicationV2 lifecycle adherence

#### UI/UX Enhancements

- **Immersive Dark Theme**: Comprehensive visual redesign
- **Smooth Hover Effects**: Card lift, color transitions, glow effects
- **Responsive Layout**: Adapts from 2-column to 1-column on smaller screens
- **Visual Hierarchy**: Clear distinction between panels and elements
- **Accessibility**: Proper focus states, contrast ratios, keyboard navigation

#### Panel Structure

- **Dashboard**: Overview cards for all export functions
- **Manage Folders**: World folder tree with multi-select checkboxes
- **Settings**: Configuration options for export behavior
- **History**: Sidebar tracking recent exports

#### License & Protection

- RNK Proprietary License enforced
- Protected module flag set in module.json
- Integrity checks and tamper detection ready

#### Testing Checklist

- FilePicker API v13 compliant (no deprecation warnings)
- Folder browsing shows correct world directories
- Multi-folder selection with checkboxes working
- Panel tabs switch without flickering or duplicate events
- Export functions route correctly to appropriate handlers
- CSS-based panel visibility manages all transitions
- Theme renders correctly with proper colors and effects
- Responsive layout adapts to viewport changes
- No console errors related to lifecycle or event handling
- Listener attachment only occurs once per render

#### Version Details

- **Compatibility**: Foundry VTT v13 (minimum: 13, verified: 13)
- **Module ID**: rnk-exports
- **License**: RNK Proprietary License
- **Status**: Development Build - Ready for Beta Testing

#### 🚧 Known Limitations

- World folder browsing limited to `/worlds` directory (by design)
- Multi-world export creates separate ZIP per selected folder (not single bundle)
- CSS theme optimized for dark mode (light mode not supported)

#### Breaking Changes

None - this is the initial development build.

---

## [0.0.0] - 2026-01-XX

### Initial Project Setup

- Project scaffolding and module structure
- Basic manifest and package configuration
- Foundation for export system

---

## Planned for Future Releases

### [0.2.0] - Planned
- Batch ZIP creation (single download for multiple folders)
- Import/restore from exported bundles
- Progress indicators for large exports
- Export scheduling and automation

### [0.3.0] - Planned
- Custom filtering options (date range, entity type, etc.)
- Export templates and presets
- Integration with external backup services

### [1.0.0] - Public Release
- Full feature parity
- Comprehensive documentation
- Patreon availability

---

**Author**: RNK Enterprise  
**Contact**: Asgardinnovations@protonmail.com  
**Repository**: https://github.com/RNK-Enterprise/rnk-exports  
**Last Updated**: March 17, 2026
