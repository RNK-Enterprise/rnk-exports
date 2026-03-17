/**
 * RNK™ Exports
 * @copyright 2026 RNK Enterprise
 * @license RNK Proprietary License
 *
 * This module provides tools to export Foundry data (chat, journals, compendia,
 * and file system folders) into ZIP archives for backup and sharing.
 */

import { ExportHubApp } from "./apps/ExportHubApp.js";

Hooks.on("getSceneControlButtons", (controls) => {
  console.log("[RNK Exports] getSceneControlButtons hook fired");
  const toolId = "rnk-exports-open";
  const tool = {
    name: toolId,
    title: "RNK Exports",
    icon: "fas fa-file-archive",
    button: true,
    toggle: false,
    onChange: (active) => {
      console.log(`[RNK Exports] Button clicked! Active: ${active}`);
      if (!active) return;
      console.log("[RNK Exports] Creating and rendering app...");
      const app = new ExportHubApp();
      console.log("[RNK Exports] App instance created:", app);
      app.render(true);
      console.log("[RNK Exports] App rendered");
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
  console.log("[RNK Exports] Initializing");
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
});
