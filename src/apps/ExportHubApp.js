const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
import {
  exportChatMessages,
  exportJournalEntries,
  exportCompendiumPacks,
  exportAllData,
  exportWorldFolders,
  downloadBlob,
  importExportFile
} from "../utils/exportHelpers.js";

const MODULE_ID = "rnk-exports";
const MODULE_LABEL = "[RNK™ Exports]";

const localize = (key) => game.i18n.localize(key);
const format = (key, data) => game.i18n.format(key, data);

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
      "import-documents": ExportHubApp._onImportDocuments,
      "refresh-folders": ExportHubApp._onRefreshFolders,
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
      chat: true,
      journals: true,
      compendia: true
    };
    this._selectedFolders = new Set();
    this._selectedPacks = new Set();
    this._importFile = null;
  }

  async _prepareContext(options = {}) {
    const context = await super._prepareContext(options);

    const tabDefs = [
      { id: "export", label: game.i18n.localize("RNKEXPORTS.TabExport"), icon: "fas fa-file-export" },
      { id: "import", label: game.i18n.localize("RNKEXPORTS.TabImport"), icon: "fas fa-file-import" },
      { id: "folders", label: game.i18n.localize("RNKEXPORTS.TabFolders"), icon: "fas fa-folder-open" },
      { id: "settings", label: game.i18n.localize("RNKEXPORTS.TabSettings"), icon: "fas fa-cog" }
    ];

    context.tabs = tabDefs.map(t => ({ ...t, active: t.id === this.activeTab }));
    context.activeTab = this.activeTab;

    context.counts = {
      chat: game.messages?.contents?.length ?? 0,
      journals: game.journal?.contents?.length ?? 0,
      compendia: game.packs?.size ?? 0
    };

    context.splitOptions = { ...this._splitOptions };

    context.isGM = game.user.isGM;
    context.settings = {
      debug: game.settings.get(MODULE_ID, "enableDebug"),
      includeReadableText: game.settings.get(MODULE_ID, "includeReadableText")
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

    const fileInput = this.element.querySelector(".rnk-exports-import-file");
    if (fileInput) {
      fileInput.addEventListener("change", (ev) => {
        this._importFile = ev.target.files[0] || null;
      });
    }

    this.element.querySelectorAll(".rnk-exports-setting-input[data-setting]").forEach(input => {
      const setting = input.dataset.setting;
      const value = game.settings.get("rnk-exports", setting);
      if (input.type === "checkbox") {
        input.checked = !!value;
      } else {
        input.value = value ?? "";
      }
      input.addEventListener("change", async () => {
        const newValue = input.type === "checkbox" ? input.checked : input.value;
        await game.settings.set("rnk-exports", setting, newValue);
      });
    });

    this.element.querySelectorAll("[data-split]").forEach(cb => {
      const key = cb.dataset.split;
      cb.checked = !!this._splitOptions[key];
      cb.addEventListener("change", () => {
        this._splitOptions[key] = cb.checked;
      });
    });

    if (this.activeTab === "export") {
      this._renderPackList(this.element);
    }
    if (this.activeTab === "folders") {
      this._renderFolderTree(this.element);
    }
  }

  static _onChangeTab(event, target) {
    const tab = target.dataset.tab;
    if (!tab || tab === this.activeTab) return;
    this.activeTab = tab;
    this.render(false, { force: true });
  }

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

  static async _onImportDocuments(event, target) {
    await this._importDocuments();
  }

  static async _onRefreshFolders(event, target) {
    this._selectedFolders.clear();
    await this._renderFolderTree(this._getHtml());
  }

  static async _onExportFolder(event, target) {
    await this._exportFolder();
    this.render(false, { force: true });
  }

  async _exportChat(splitFiles = false) {
    ui.notifications.info(localize("RNKEXPORTS.Notifications.ExportingChat"));
    try {
      const includeReadableText = game.settings.get(MODULE_ID, "includeReadableText");
      const { blob, filename } = await exportChatMessages({ splitFiles, includeReadableText });
      downloadBlob(blob, filename);
      ui.notifications.info(localize("RNKEXPORTS.Notifications.ExportComplete"));
    } catch (err) {
      console.error(`${MODULE_LABEL} Export chat error:`, err);
      ui.notifications.error(localize("RNKEXPORTS.Notifications.ExportFailed"));
    }
  }

  async _exportJournals(splitFiles = false) {
    ui.notifications.info(localize("RNKEXPORTS.Notifications.ExportingJournals"));
    try {
      const includeReadableText = game.settings.get(MODULE_ID, "includeReadableText");
      const { blob, filename } = await exportJournalEntries({ splitFiles, includeReadableText });
      downloadBlob(blob, filename);
      ui.notifications.info(localize("RNKEXPORTS.Notifications.ExportComplete"));
    } catch (err) {
      console.error(`${MODULE_LABEL} Export journals error:`, err);
      ui.notifications.error(localize("RNKEXPORTS.Notifications.ExportFailed"));
    }
  }

  async _exportCompendia(splitFiles = false) {
    const packIds = Array.from(this._selectedPacks);
    if (packIds.length === 0) {
      ui.notifications.warn(localize("RNKEXPORTS.Notifications.PackSelectionRequired"));
      return;
    }
    ui.notifications.info(localize("RNKEXPORTS.Notifications.ExportingCompendia"));
    try {
      const includeReadableText = game.settings.get(MODULE_ID, "includeReadableText");
      const { blob, filename } = await exportCompendiumPacks({ packIds, splitFiles, includeReadableText });
      downloadBlob(blob, filename);
      ui.notifications.info(localize("RNKEXPORTS.Notifications.ExportComplete"));
    } catch (err) {
      console.error(`${MODULE_LABEL} Export compendia error:`, err);
      ui.notifications.error(localize("RNKEXPORTS.Notifications.ExportFailed"));
    }
  }

  async _exportAll() {
    ui.notifications.info(localize("RNKEXPORTS.Notifications.ExportingAll"));
    try {
      const includeReadableText = game.settings.get(MODULE_ID, "includeReadableText");
      const selectedPackIds = this._selectedPacks.size ? Array.from(this._selectedPacks) : [];
      const { blob, filename } = await exportAllData({
        packIds: selectedPackIds,
        folderIds: Array.from(this._selectedFolders),
        splitOptions: this._splitOptions,
        includeReadableText
      });
      downloadBlob(blob, filename);
      ui.notifications.info(localize("RNKEXPORTS.Notifications.ExportComplete"));
    } catch (err) {
      console.error(`${MODULE_LABEL} Export all error:`, err);
      ui.notifications.error(localize("RNKEXPORTS.Notifications.ExportFailed"));
    }
  }

  async _exportFolder() {
    if (this._selectedFolders.size === 0) {
      ui.notifications.warn(localize("RNKEXPORTS.Notifications.FolderSelectionRequired"));
      return;
    }

    ui.notifications.info(localize("RNKEXPORTS.Notifications.ExportingFolder"));
    try {
      const includeReadableText = game.settings.get(MODULE_ID, "includeReadableText");
      const { blob, filename } = await exportWorldFolders({
        folderIds: Array.from(this._selectedFolders),
        includeReadableText
      });
      downloadBlob(blob, filename);
      ui.notifications.info(localize("RNKEXPORTS.Notifications.ExportComplete"));
    } catch (err) {
      console.error(`${MODULE_LABEL} Export folder error:`, err);
      ui.notifications.error(localize("RNKEXPORTS.Notifications.ExportFailed"));
    }
  }

  async _importDocuments() {
    if (!this._importFile) {
      ui.notifications.warn(localize("RNKEXPORTS.Notifications.NoImportFile"));
      return;
    }

    ui.notifications.info(localize("RNKEXPORTS.Notifications.ImportingDocuments"));
    try {
      const imported = await importExportFile(this._importFile);
      ui.notifications.info(
        format("RNKEXPORTS.Notifications.ImportComplete", { count: imported.length })
      );
      this._renderImportResults(imported);
    } catch (err) {
      console.error(`${MODULE_LABEL} Import error:`, err);
      ui.notifications.error(localize("RNKEXPORTS.Notifications.ImportFailed"));
    }
  }

  _renderImportResults(imported) {
    const container = this.element.querySelector(".rnk-exports-import-result");
    if (!container) return;

    if (!imported || !imported.length) {
      container.innerHTML = `<div class="rnk-exports-import-empty">${localize("RNKEXPORTS.Import.NoResults")}</div>`;
      return;
    }

    const list = document.createElement("ul");
    list.classList.add("rnk-exports-import-list");
    for (const doc of imported) {
      const li = document.createElement("li");
      li.textContent = `${doc.documentName || doc.type} — ${doc.name || doc.id || localize("RNKEXPORTS.Import.Unknown")}`;
      list.appendChild(li);
    }
    container.innerHTML = "";
    container.appendChild(list);
  }

  _renderPackList(html) {
    const container = html.querySelector(".rnk-exports-pack-list");
    if (!container) return;

    container.innerHTML = "";

    const packs = [...game.packs].sort((a, b) => a.metadata.label.localeCompare(b.metadata.label));

    if (!packs.length) {
      container.innerHTML = `<p class="rnk-exports-empty">${localize("RNKEXPORTS.Empty.NoCompendiumPacks")}</p>`;
      return;
    }

    const toolbar = document.createElement("div");
    toolbar.classList.add("rnk-exports-pack-toolbar");
    const selectAll = document.createElement("span");
    selectAll.classList.add("rnk-exports-pack-select-link");
    selectAll.textContent = localize("RNKEXPORTS.Common.All");
    selectAll.addEventListener("click", () => {
      packs.forEach(p => this._selectedPacks.add(p.collection));
      this._renderPackList(html);
    });
    const selectNone = document.createElement("span");
    selectNone.classList.add("rnk-exports-pack-select-link");
    selectNone.textContent = localize("RNKEXPORTS.Common.None");
    selectNone.addEventListener("click", () => {
      this._selectedPacks.clear();
      this._renderPackList(html);
    });
    const countLabel = document.createElement("span");
    countLabel.classList.add("rnk-exports-pack-count");
    countLabel.textContent = format("RNKEXPORTS.Packs.SelectedCount", { selected: this._selectedPacks.size, total: packs.length });
    toolbar.appendChild(selectAll);
    toolbar.appendChild(selectNone);
    toolbar.appendChild(countLabel);
    container.appendChild(toolbar);

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
          countLabel.textContent = format("RNKEXPORTS.Packs.SelectedCount", { selected: this._selectedPacks.size, total: packs.length });
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
      view.innerHTML = `<p class="rnk-exports-empty">${localize("RNKEXPORTS.Empty.NoWorldFolders")}</p>`;
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
      if (children.length) toggle.classList.add("is-clickable");

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
      selectedSpan.textContent = localize("RNKEXPORTS.Folders.NoneSelected");
      return;
    }

    const ids = Array.from(this._selectedFolders);
    const names = ids.map(id => game.folders.get(id)?.name || id);
    if (this._selectedFolders.size === 1) {
      selectedSpan.textContent = format("RNKEXPORTS.Folders.SingleSelected", { name: names[0] });
    } else {
      selectedSpan.textContent = format("RNKEXPORTS.Folders.MultiSelected", { count: this._selectedFolders.size });
      selectedSpan.title = names.join("\n");
    }
  }
}
