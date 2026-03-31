import { ExportHubApp } from "./apps/ExportHubApp.js";

const MODULE_ID = "rnk-exports";
const MODULE_TITLE = "RNK™ Exports";

const registerSettings = () => {
  game.settings.register(MODULE_ID, "enableDebug", {
    name: "RNKEXPORTS.Settings.Debug",
    hint: "RNKEXPORTS.Settings.DebugHint",
    scope: "client",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register(MODULE_ID, "includeReadableText", {
    name: "RNKEXPORTS.Settings.IncludeReadableText",
    hint: "RNKEXPORTS.Settings.IncludeReadableTextHint",
    scope: "client",
    config: true,
    default: true,
    type: Boolean
  });
};

Hooks.on("getSceneControlButtons", (controls) => {
  const toolId = "rnk-exports-open";
  const tool = {
    name: toolId,
    title: MODULE_TITLE,
    icon: "fas fa-file-archive",
    button: true,
    toggle: false,
    onChange: (active) => {
      if (!active) return;
      const app = new ExportHubApp();
      app.render(true);
    }
  };

  const control = {
    name: "rnk-exports",
    title: MODULE_TITLE,
    icon: "fas fa-file-archive",
    order: 99,
    layer: "tokens",
    visible: game.user.isGM,
    tools: Array.isArray(controls) ? [tool] : { [toolId]: tool }
  };

  if (Array.isArray(controls)) {
    controls.push(control);
  } else if (controls && typeof controls === "object") {
    controls["rnk-exports"] = control;
  }
});

Hooks.once("init", () => {
  registerSettings();
});
