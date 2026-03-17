/**
 * RNK™ Exports - Export Hub UI
 * @copyright 2026 RNK Enterprise
 * @license RNK Proprietary License
 */

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
import {
  exportChatMessages,
  exportJournalEntries,
  exportCompendiumPacks,
  downloadBlob,
  importJsonDocuments
} from "../utils/exportHelpers.js";

export class ExportHubApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "rnk-exports-hub",
    classes: ["rnk-exports", "rnk-hub"],
    position: { width: 960, height: 720 },
    window: { title: "RNKEXPORTS.HubTitle", resizable: true },
    actions: {
      "change-tab": ExportHubApp._onChangeTab,
      "export-chat": ExportHubApp._onExportChat,
      "export-journals": ExportHubApp._onExportJournals,
      "export-compendia": ExportHubApp._onExportCompendia,
      "export-all": ExportHubApp._onExportAll,
      "import-compendia": ExportHubApp._onImportCompendia,
      "refresh-folders": ExportHubApp._onRefreshFolders,
      "browse-folders": ExportHubApp._onBrowseFolders,
      "export-folder": ExportHubApp._onExportFolder
    }
  };

  static PARTS = {
    main: { template: "modules/rnk-exports/templates/export-hub.hbs" }
  };

  constructor(options = {}) {
    super(options);
    this.activeTab = "export";
    this._splitOptions = {
      chat: false,
      journals: false,
      compendia: false
    };
    this._selectedFolders = new Set();
    this._selectedPacks = new Set();
    this._importFile = null;
  }

  async _prepareContext(options = {}) {
    const context = await super._prepareContext(options);

    // Tabs
    const tabDefs = [
      { id: "export",   label: game.i18n.localize("RNKEXPORTS.TabExport"),   icon: "fas fa-file-export" },
      { id: "import",   label: game.i18n.localize("RNKEXPORTS.TabImport"),   icon: "fas fa-file-import" },
      { id: "folders",  label: game.i18n.localize("RNKEXPORTS.TabFolders"),  icon: "fas fa-folder-open" },
      { id: "settings", label: game.i18n.localize("RNKEXPORTS.TabSettings"), icon: "fas fa-cog" }
    ];
    context.tabs = tabDefs.map(t => ({ ...t, active: t.id === this.activeTab }));
    context.activeTab = this.activeTab;

    // Live counts
    context.counts = {
      chat: game.messages?.contents?.length ?? 0,
      journals: game.journal?.contents?.length ?? 0,
      compendia: game.packs?.size ?? 0
    };

    // Split options
    context.splitOptions = { ...this._splitOptions };

    // GM & world
    context.isGM = game.user.isGM;
    context.settings = {
      debug: game.settings.get("rnk-exports", "enableDebug"),
      defaultFolder: game.settings.get("rnk-exports", "defaultExportFolder")
    };
    context.world = {
      name: game.world?.name || "",
      id: game.world?.id || ""
    };

    return context;
  }

  _getHtml() {
    return this.element;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Wire file input for import tab
    const fileInput = this.element.querySelector(".rnk-exports-import-file");
    if (fileInput) {
      fileInput.addEventListener("change", (ev) => {
        this._importFile = ev.target.files[0] || null;
      });
    }

    // Wire split toggles on export tab
    this.element.querySelectorAll("[data-split]").forEach(cb => {
      const key = cb.dataset.split;
      cb.checked = !!this._splitOptions[key];
      cb.addEventListener("change", () => {
        this._splitOptions[key] = cb.checked;
      });
    });

    // Render pack list if on export tab
    if (this.activeTab === "export") {
      this._renderPackList(this.element);
    }

    // Render folder tree if on folders tab
    if (this.activeTab === "folders") {
      this._renderFolderTree(this.element);
    }
  }

  // ========== Tab Switching ==========

  static _onChangeTab(event, target) {
    const tab = target.dataset.tab;
    if (!tab || tab === this.activeTab) return;
    this.activeTab = tab;
    this.render(false, { force: true });
  }

  // ========== Action Handlers ==========

  static async _onExportChat(event, target) {
    await this._exportChat(this._splitOptions.chat);
    this.render(false, { force: true });
  }

  static async _onExportJournals(event, target) {
    await this._exportJournals(this._splitOptions.journals);
    this.render(false, { force: true });
  }

  static async _onExportCompendia(event, target) {
    await this._exportCompendia(this._splitOptions.compendia);
    this.render(false, { force: true });
  }

  static async _onExportAll(event, target) {
    await this._exportAll();
    this.render(false, { force: true });
  }

  static async _onImportCompendia(event, target) {
    await this._importCompendia();
  }

  static async _onRefreshFolders(event, target) {
    this._selectedFolders.clear();
    await this._renderFolderTree(this._getHtml());
  }

  static async _onBrowseFolders(event, target) {
    await this._renderFolderTree(this._getHtml());
  }

  static async _onExportFolder(event, target) {
    await this._exportFolder();
    this.render(false, { force: true });
  }

  // ========== Export Methods ==========

  async _exportChat(splitFiles = false) {
    ui.notifications.info(game.i18n.localize("RNKEXPORTS.Notifications.ExportingChat"));
    try {
      const { blob, filename } = await exportChatMessages({ splitFiles });
      downloadBlob(blob, filename);
      ui.notifications.info(game.i18n.localize("RNKEXPORTS.Notifications.ExportComplete"));
    } catch (err) {
      console.error("[RNK Exports] Export chat error:", err);
      ui.notifications.error(game.i18n.localize("RNKEXPORTS.Notifications.ExportFailed"));
    }
  }

  async _exportJournals(splitFiles = false) {
    ui.notifications.info(game.i18n.localize("RNKEXPORTS.Notifications.ExportingJournals"));
    try {
      const { blob, filename } = await exportJournalEntries({ splitFiles });
      downloadBlob(blob, filename);
      ui.notifications.info(game.i18n.localize("RNKEXPORTS.Notifications.ExportComplete"));
    } catch (err) {
      console.error("[RNK Exports] Export journals error:", err);
      ui.notifications.error(game.i18n.localize("RNKEXPORTS.Notifications.ExportFailed"));
    }
  }

  async _exportCompendia(splitFiles = false) {
    const packIds = Array.from(this._selectedPacks);
    if (packIds.length === 0) {
      ui.notifications.warn("Select at least one compendium pack to export.");
      return;
    }
    ui.notifications.info(game.i18n.localize("RNKEXPORTS.Notifications.ExportingCompendia"));
    try {
      const { blob, filename } = await exportCompendiumPacks({ packIds, splitFiles });
      downloadBlob(blob, filename);
      ui.notifications.info(game.i18n.localize("RNKEXPORTS.Notifications.ExportComplete"));
    } catch (err) {
      console.error("[RNK Exports] Export compendia error:", err);
      ui.notifications.error(game.i18n.localize("RNKEXPORTS.Notifications.ExportFailed"));
    }
  }

  async _exportAll() {
    ui.notifications.info(game.i18n.localize("RNKEXPORTS.Notifications.ExportingAll"));
    try {
      await this._exportChat(this._splitOptions.chat);
      await this._exportJournals(this._splitOptions.journals);
      // Export All uses all packs regardless of selection
      const splitFiles = this._splitOptions.compendia;
      const { blob, filename } = await exportCompendiumPacks({ splitFiles });
      downloadBlob(blob, filename);
      ui.notifications.info(game.i18n.localize("RNKEXPORTS.Notifications.ExportComplete"));
    } catch (err) {
      console.error("[RNK Exports] Export all error:", err);
      ui.notifications.error(game.i18n.localize("RNKEXPORTS.Notifications.ExportFailed"));
    }
  }

  async _exportFolder() {
    if (this._selectedFolders.size === 0) {
      ui.notifications.warn(game.i18n.localize("RNKEXPORTS.Notifications.FolderSelectionRequired"));
      return;
    }

    ui.notifications.info(game.i18n.localize("RNKEXPORTS.Notifications.ExportingFolder"));
    try {
      const { blob, filename } = await this._exportGameFolders(Array.from(this._selectedFolders));
      downloadBlob(blob, filename);
      ui.notifications.info(game.i18n.localize("RNKEXPORTS.Notifications.ExportComplete"));
    } catch (err) {
      console.error("[RNK Exports] Export folder error:", err);
      ui.notifications.error(game.i18n.localize("RNKEXPORTS.Notifications.ExportFailed"));
    }
  }

  async _exportGameFolders(folderIds) {
    const { ZipBuilder } = await import("../utils/ZipBuilder.js");
    const allDocs = [];

    const collectFromFolder = (folderId) => {
      const folder = game.folders.get(folderId);
      if (!folder) return;
      const docs = folder.contents.map(doc => doc.toObject());
      for (const doc of docs) {
        allDocs.push({ folder: folder.name, type: folder.type, data: doc });
      }
      const children = game.folders.filter(f => f.folder?.id === folderId);
      for (const child of children) {
        collectFromFolder(child.id);
      }
    };

    for (const id of folderIds) {
      collectFromFolder(id);
    }

    const date = new Date().toISOString().replace(/[:.]/g, "-");
    const worldName = (game.world.name || "world").replace(/[^a-zA-Z0-9-_\.]/g, "_");
    const rootName = `folder-export-${worldName}-${date}`;

    const zip = new ZipBuilder();
    zip.addFile(`${rootName}/metadata.json`, JSON.stringify({
      world: game.world.name,
      exportedAt: new Date().toISOString(),
      folderCount: folderIds.length,
      documentCount: allDocs.length
    }, null, 2));
    zip.addFile(`${rootName}/documents.json`, JSON.stringify(allDocs, null, 2));

    return { blob: zip.build(), filename: `${rootName}.zip` };
  }

  // ========== Import Methods ==========

  async _importCompendia() {
    if (!this._importFile) {
      ui.notifications.warn(game.i18n.localize("RNKEXPORTS.Notifications.NoImportFile"));
      return;
    }

    ui.notifications.info(game.i18n.localize("RNKEXPORTS.Notifications.ImportingCompendia"));
    try {
      const raw = await this._readFileAsText(this._importFile);
      const imported = await importJsonDocuments(raw);
      ui.notifications.info(
        game.i18n.format("RNKEXPORTS.Notifications.ImportComplete", { count: imported.length })
      );
      this._renderImportResults(imported);
    } catch (err) {
      console.error("[RNK Exports] Import error:", err);
      ui.notifications.error(game.i18n.localize("RNKEXPORTS.Notifications.ImportFailed"));
    }
  }

  _readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  _renderImportResults(imported) {
    const container = this.element.querySelector(".rnk-exports-import-result");
    if (!container) return;

    if (!imported || !imported.length) {
      container.innerHTML = `<div class="rnk-exports-import-empty">${game.i18n.localize("RNKEXPORTS.Import.NoResults")}</div>`;
      return;
    }

    const list = document.createElement("ul");
    list.classList.add("rnk-exports-import-list");
    for (const doc of imported) {
      const li = document.createElement("li");
      li.textContent = `${doc.type} \u2022 ${doc.name || doc.id || "(unknown)"}`;
      list.appendChild(li);
    }
    container.innerHTML = "";
    container.appendChild(list);
  }

  // ========== Pack Selection ==========

  _renderPackList(html) {
    const container = html.querySelector(".rnk-exports-pack-list");
    if (!container) return;

    container.innerHTML = "";

    const packs = [...game.packs].sort((a, b) => a.metadata.label.localeCompare(b.metadata.label));

    if (!packs.length) {
      container.innerHTML = "<p class='rnk-exports-empty'>No compendium packs found</p>";
      return;
    }

    // Select All / None toolbar
    const toolbar = document.createElement("div");
    toolbar.classList.add("rnk-exports-pack-toolbar");
    const selectAll = document.createElement("span");
    selectAll.classList.add("rnk-exports-pack-select-link");
    selectAll.textContent = "All";
    selectAll.addEventListener("click", () => {
      packs.forEach(p => this._selectedPacks.add(p.collection));
      this._renderPackList(html);
    });
    const selectNone = document.createElement("span");
    selectNone.classList.add("rnk-exports-pack-select-link");
    selectNone.textContent = "None";
    selectNone.addEventListener("click", () => {
      this._selectedPacks.clear();
      this._renderPackList(html);
    });
    const countLabel = document.createElement("span");
    countLabel.classList.add("rnk-exports-pack-count");
    countLabel.textContent = `${this._selectedPacks.size}/${packs.length} selected`;
    toolbar.appendChild(selectAll);
    toolbar.appendChild(selectNone);
    toolbar.appendChild(countLabel);
    container.appendChild(toolbar);

    // Group by pack type
    const grouped = new Map();
    for (const pack of packs) {
      const type = pack.metadata.type || "Unknown";
      if (!grouped.has(type)) grouped.set(type, []);
      grouped.get(type).push(pack);
    }

    for (const [type, typePacks] of grouped) {
      const section = document.createElement("div");
      section.classList.add("rnk-exports-pack-type-section");

      const heading = document.createElement("h5");
      heading.classList.add("rnk-exports-pack-type-heading");
      heading.textContent = type;
      section.appendChild(heading);

      for (const pack of typePacks) {
        const row = document.createElement("label");
        row.classList.add("rnk-exports-pack-row");

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = this._selectedPacks.has(pack.collection);
        cb.addEventListener("change", () => {
          if (cb.checked) {
            this._selectedPacks.add(pack.collection);
          } else {
            this._selectedPacks.delete(pack.collection);
          }
          countLabel.textContent = `${this._selectedPacks.size}/${packs.length} selected`;
        });

        const label = document.createElement("span");
        label.textContent = pack.metadata.label;

        const meta = document.createElement("span");
        meta.classList.add("rnk-exports-pack-meta");
        meta.textContent = pack.collection;

        row.appendChild(cb);
        row.appendChild(label);
        row.appendChild(meta);
        section.appendChild(row);
      }

      container.appendChild(section);
    }
  }

  // ========== Folder Tree ==========

  async _renderFolderTree(html) {
    const view = html.querySelector(".rnk-exports-folder-tree");
    if (!view) return;

    view.innerHTML = "";
    this._updateSelectedLabel(html);

    const folderTypes = new Map();
    for (const folder of game.folders) {
      if (!folderTypes.has(folder.type)) folderTypes.set(folder.type, []);
      folderTypes.get(folder.type).push(folder);
    }

    if (!folderTypes.size) {
      view.innerHTML = "<p class='rnk-exports-empty'>No folders found in this world</p>";
      return;
    }

    const makeNode = (folder) => {
      const li = document.createElement("li");
      li.classList.add("rnk-exports-folder-item");
      li.dataset.folderId = folder.id;

      const children = game.folders.filter(f => f.folder?.id === folder.id);

      const toggle = document.createElement("span");
      toggle.classList.add("rnk-exports-folder-expand");
      toggle.textContent = children.length ? "\u2212" : "\u00A0";
      toggle.style.cursor = children.length ? "pointer" : "default";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.classList.add("rnk-exports-folder-checkbox");
      checkbox.checked = this._selectedFolders.has(folder.id);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          this._selectedFolders.add(folder.id);
        } else {
          this._selectedFolders.delete(folder.id);
        }
        this._updateSelectedLabel(html);
      });

      const label = document.createElement("span");
      label.textContent = `${folder.name} (${folder.contents.length})`;
      label.classList.add("rnk-exports-folder-label");
      if (this._selectedFolders.has(folder.id)) label.classList.add("selected");
      label.addEventListener("click", () => {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event("change"));
      });

      li.appendChild(toggle);
      li.appendChild(checkbox);
      li.appendChild(label);

      if (children.length) {
        const ul = document.createElement("ul");
        for (const child of children.sort((a, b) => a.name.localeCompare(b.name))) {
          ul.appendChild(makeNode(child));
        }
        li.appendChild(ul);

        toggle.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const isHidden = ul.style.display === "none";
          ul.style.display = isHidden ? "" : "none";
          toggle.textContent = isHidden ? "\u2212" : "+";
        });
      }

      return li;
    };

    for (const [type, folders] of folderTypes) {
      const section = document.createElement("div");
      section.classList.add("rnk-exports-folder-type-section");

      const heading = document.createElement("h4");
      heading.classList.add("rnk-exports-folder-type-heading");
      heading.textContent = type;
      section.appendChild(heading);

      const rootFolders = folders.filter(f => !f.folder).sort((a, b) => a.name.localeCompare(b.name));
      const ul = document.createElement("ul");
      for (const folder of rootFolders) {
        ul.appendChild(makeNode(folder));
      }
      section.appendChild(ul);
      view.appendChild(section);
    }
  }

  _updateSelectedLabel(html) {
    const selectedSpan = html.querySelector(".rnk-exports-selected-folder");
    if (!selectedSpan) return;

    if (this._selectedFolders.size === 0) {
      selectedSpan.textContent = "No folders selected";
      return;
    }

    const ids = Array.from(this._selectedFolders);
    const names = ids.map(id => game.folders.get(id)?.name || id);
    if (this._selectedFolders.size === 1) {
      selectedSpan.textContent = `Selected: ${names[0]}`;
    } else {
      selectedSpan.textContent = `${this._selectedFolders.size} folders selected`;
      selectedSpan.title = names.join("\n");
    }
  }
}
