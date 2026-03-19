import { ExportHubApp } from "./apps/ExportHubApp.js";

Hooks.on("getSceneControlButtons", (controls) => {
  const toolId = "rnk-exports-open";
  const tool = {
    name: toolId,
    title: "RNK Exports",
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
    title: "RNK Exports",
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
});

Hooks.once("ready", () => {
  game.settings.register("rnk-exports", "enableDebug", {
    name: "RNKEXPORTS.Settings.Debug",
    hint: "RNKEXPORTS.Settings.DebugHint",
    scope: "client",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register("rnk-exports", "defaultExportFolder", {
    name: "RNKEXPORTS.Settings.DefaultFolder",
    hint: "RNKEXPORTS.Settings.DefaultFolderHint",
    scope: "client",
    config: true,
    default: "data/",
    type: String
  });

  game.settings.register("rnk-exports", "includeReadableText", {
    name: "RNKEXPORTS.Settings.IncludeReadableText",
    hint: "RNKEXPORTS.Settings.IncludeReadableTextHint",
    scope: "client",
    config: true,
    default: true,
    type: Boolean
  });
});
