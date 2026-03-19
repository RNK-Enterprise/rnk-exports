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
      { id: "export",   label: game.i18n.localize("RNKEXPORTS.TabExport"),   icon: "fas fa-file-export" },
      { id: "import",   label: game.i18n.localize("RNKEXPORTS.TabImport"),   icon: "fas fa-file-import" },
      { id: "folders",  label: game.i18n.localize("RNKEXPORTS.TabFolders"),  icon: "fas fa-folder-open" },
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
      debug: game.settings.get("rnk-exports", "enableDebug"),
      defaultFolder: game.settings.get("rnk-exports", "defaultExportFolder"),
      includeReadableText: game.settings.get("rnk-exports", "includeReadableText")
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

