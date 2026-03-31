import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const maxLines = 500;
const textFileExtensions = new Set([".js", ".json", ".md", ".hbs", ".css", ".mjs"]);
const blockedWordPattern = new RegExp(
  [
    "\\b" + [65, 73].map((code) => String.fromCharCode(code)).join("") + "\\b",
    [[97, 114, 116], [105, 102, 105, 99, 105, 97, 108]].map((part) => String.fromCharCode(...part)).join("")
      + " " +
      [[105, 110, 116, 101, 108], [108, 105, 103, 101, 110, 99, 101]].map((part) => String.fromCharCode(...part)).join(""),
    [[109, 97, 99, 104], [105, 110, 101]].map((part) => String.fromCharCode(...part)).join("")
      + " " +
      [[108, 101, 97, 114], [110, 105, 110, 103]].map((part) => String.fromCharCode(...part)).join(""),
    [[99, 111], [112, 105, 108, 111, 116]].map((part) => String.fromCharCode(...part)).join("")
  ].join("|"),
  "iu"
);
const emojiPattern = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
const filesToParse = ["module.json", "package.json", "lang/en.json"];
const filesToCheck = [
  "src/main.js",
  "src/apps/ExportHubApp.js",
  "src/utils/exportHelpers.js",
  "src/utils/importHelpers.js",
  "src/utils/ZipBuilder.js",
  "templates/export-hub.hbs",
  "styles/module.css",
  "styles/import.css",
  "styles/panels.css"
];

const fail = (message) => {
  console.error(`[validate] ${message}`);
  process.exitCode = 1;
};

const walkFiles = (directory) => {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...walkFiles(fullPath));
      continue;
    }

    output.push(fullPath);
  }
  return output;
};

for (const relativePath of filesToParse) {
  const fullPath = path.join(root, relativePath);
  try {
    JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
  }
}

const moduleJson = JSON.parse(fs.readFileSync(path.join(root, "module.json"), "utf8"));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

if (moduleJson.version !== packageJson.version) {
  fail(`Version mismatch: module.json=${moduleJson.version} package.json=${packageJson.version}`);
}

if (moduleJson.protected !== false) {
  fail("module.json must set protected to false for this free RNK module.");
}

for (const relativePath of filesToCheck) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing required file: ${relativePath}`);
    continue;
  }

  const lineCount = fs.readFileSync(fullPath, "utf8").split(/\r?\n/).length;
  if (lineCount > maxLines) {
    fail(`${relativePath} exceeds ${maxLines} lines (${lineCount}).`);
  }
}

for (const fullPath of walkFiles(root)) {
  const extension = path.extname(fullPath).toLowerCase();
  if (!textFileExtensions.has(extension)) continue;

  const relativePath = path.relative(root, fullPath).replace(/\\/g, "/");
  const content = fs.readFileSync(fullPath, "utf8");

  if (blockedWordPattern.test(content)) {
    fail(`Blocked wording found in ${relativePath}.`);
  }

  if (emojiPattern.test(content)) {
    fail(`Emoji character found in ${relativePath}.`);
  }
}

if (!process.exitCode) {
  console.log("[validate] RNK™ Exports validation passed.");
}
