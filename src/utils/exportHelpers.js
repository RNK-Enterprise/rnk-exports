/**
 * Helpers for exporting Foundry data as ZIP archives.
 * RNK™ Exports - 2026
 */

import { ZipBuilder } from "./ZipBuilder.js";

const safeFileName = (input) => {
  return input.replace(/[^a-zA-Z0-9-_\.]/g, "_");
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const buildZip = (entries) => {
  const zip = new ZipBuilder();
  for (const entry of entries) {
    zip.addFile(entry.path, entry.content);
  }
  return zip.build();
};

export const exportChatMessages = async ({ includeAll = true, messageIds = [], splitFiles = false } = {}) => {
  const messages = game.messages.contents
    .filter((msg) => (includeAll ? true : messageIds.includes(msg.id)))
    .map((msg) => msg.toObject());

  const date = new Date().toISOString().replace(/[:.]/g, "-");
  const rootName = `chat-export-${safeFileName(game.world.name || "world")}-${date}`;

  const entries = [
    {
      path: `${rootName}/metadata.json`,
      content: JSON.stringify({ world: game.world.name, exportedAt: new Date().toISOString(), count: messages.length }, null, 2)
    }
  ];

  if (splitFiles) {
    for (const msg of messages) {
      const id = msg.id || foundry.utils.randomID();
      entries.push({
        path: `${rootName}/messages/${safeFileName(id)}.json`,
        content: JSON.stringify(msg, null, 2)
      });
    }
  } else {
    entries.push({
      path: `${rootName}/messages.json`,
      content: JSON.stringify(messages, null, 2)
    });
  }

  return {
    blob: buildZip(entries),
    filename: `${rootName}.zip`
  };
};

export const exportJournalEntries = async ({ includeAll = true, entryIds = [], splitFiles = false } = {}) => {
  const entries = game.journal.contents
    .filter((entry) => (includeAll ? true : entryIds.includes(entry.id)))
    .map((entry) => entry.toObject());

  const date = new Date().toISOString().replace(/[:.]/g, "-");
  const rootName = `journal-export-${safeFileName(game.world.name || "world")}-${date}`;

  const output = [
    {
      path: `${rootName}/metadata.json`,
      content: JSON.stringify({ world: game.world.name, exportedAt: new Date().toISOString(), count: entries.length }, null, 2)
    }
  ];

  if (splitFiles) {
    for (const entry of entries) {
      const id = entry.id || foundry.utils.randomID();
      output.push({
        path: `${rootName}/journals/${safeFileName(id)}.json`,
        content: JSON.stringify(entry, null, 2)
      });
    }
  } else {
    output.push({
      path: `${rootName}/journals.json`,
      content: JSON.stringify(entries, null, 2)
    });
  }

  return {
    blob: buildZip(output),
    filename: `${rootName}.zip`
  };
};

export const exportCompendiumPacks = async ({ packIds = [], splitFiles = false } = {}) => {
  const packs = game.packs.filter((p) => (packIds.length ? packIds.includes(p.collection) : true));
  const packsData = [];

  const entries = [];
  const date = new Date().toISOString().replace(/[:.]/g, "-");
  const rootName = `compendium-export-${safeFileName(game.world.name || "world")}-${date}`;

  for (const pack of packs) {
    const contents = await pack.getDocuments();
    const packData = {
      id: pack.collection,
      label: pack.metadata.label,
      type: pack.metadata.type,
      count: contents.length
    };

    packsData.push(packData);

    if (splitFiles) {
      for (const doc of contents) {
        const item = doc.toObject();
        const id = item.id || foundry.utils.randomID();
        entries.push({
          path: `${rootName}/packs/${safeFileName(pack.collection)}/${safeFileName(id)}.json`,
          content: JSON.stringify(item, null, 2)
        });
      }
    }
  }

  const metadata = {
    world: game.world.name,
    exportedAt: new Date().toISOString(),
    packCount: packsData.length
  };

  const outputEntries = [
    {
      path: `${rootName}/metadata.json`,
      content: JSON.stringify(metadata, null, 2)
    }
  ];

  if (splitFiles) {
    outputEntries.push({
      path: `${rootName}/packs.json`,
      content: JSON.stringify(packsData, null, 2)
    });
    outputEntries.push(...entries);
  } else {
    const packsWithEntries = [];
    for (const pack of packs) {
      const contents = await pack.getDocuments();
      packsWithEntries.push({
        id: pack.collection,
        label: pack.metadata.label,
        type: pack.metadata.type,
        entries: contents.map((doc) => doc.toObject())
      });
    }
    outputEntries.push({
      path: `${rootName}/packs.json`,
      content: JSON.stringify(packsWithEntries, null, 2)
    });
  }

  return {
    blob: buildZip(outputEntries),
    filename: `${rootName}.zip`
  };
};

export const exportDataFolder = async (rootPath) => {
  const normalizePath = (path) => path.replace(/\\/g, "/").replace(/\/\/+/, "/");
  rootPath = normalizePath(rootPath);

  const folderEntries = [];

  const walkFolder = async (path) => {
    const result = await FilePicker.browse("data", path);
    if (!result) return;

    for (const file of result.files) {
      // Only include JSON for now
      if (file.endsWith(".json")) {
        const response = await fetch(file);
        const data = await response.text();
        const relative = file.substring(rootPath.length).replace(/^\//, "");
        folderEntries.push({ path: relative, content: data });
      }
    }

    for (const dir of result.dirs) {
      await walkFolder(dir);
    }
  };

  await walkFolder(rootPath);

  const date = new Date().toISOString().replace(/[:.]/g, "-");
  const rootName = `data-export-${safeFileName(rootPath)}-${date}`;

  const entries = [
    {
      path: `${rootName}/metadata.json`,
      content: JSON.stringify({ root: rootPath, exportedAt: new Date().toISOString(), fileCount: folderEntries.length }, null, 2)
    },
    ...folderEntries.map((entry) => ({ path: `${rootName}/${entry.path}`, content: entry.content }))
  ];

  return {
    blob: buildZip(entries),
    filename: `${rootName}.zip`
  };
};

/**
 * Import a strict JSON file into Foundry documents.
 *
 * Expected JSON format:
 * - Array of objects [{type:"Item", folder:"MyFolder/Sub", data:{...}}]
 * - OR { entries:[...]} or { docs:[...] }
 */
export const importJsonDocuments = async (rawText) => {
  const json = JSON.parse(rawText);

  let entries;
  if (Array.isArray(json)) {
    entries = json;
  } else if (Array.isArray(json.entries)) {
    entries = json.entries;
  } else if (Array.isArray(json.docs)) {
    entries = json.docs;
  } else if (typeof json === "object" && json !== null && json.name) {
    // Single document (e.g. native Foundry actor/item export)
    entries = [json];
  } else {
    entries = [];
  }

  console.log(`[RNK Exports] Import: found ${entries.length} entries to process`);

  const created = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Detect our wrapper format: { folder, type, data: {name, ...} }
    const isWrapped = entry.data && typeof entry.data === "object" && entry.data.name;
    const docData = isWrapped ? foundry.utils.deepClone(entry.data) : foundry.utils.deepClone(entry);
    const typeHint = isWrapped ? entry.type : null;

    // Resolve the document class
    const resolvedType = _resolveDocumentType(typeHint, docData);
    console.log(`[RNK Exports] Entry ${i}: wrapped=${isWrapped}, typeHint=${typeHint}, resolved=${resolvedType}, name=${docData.name}`);

    if (!resolvedType) {
      console.warn(`[RNK Exports] Skipping entry ${i}: could not determine document type`);
      continue;
    }

    // Strip old IDs
    delete docData._id;

    // Set folder
    try {
      const folderName = (isWrapped ? entry.folder : null) || entry.folderPath || "RNK Exports";
      const folderId = await _ensureFolder(resolvedType, folderName);
      docData.folder = folderId;
    } catch (err) {
      console.error(`[RNK Exports] Failed to create folder for entry ${i}:`, err);
      delete docData.folder;
    }

    // Create document
    try {
      const cls = CONFIG[resolvedType]?.documentClass;
      if (!cls) {
        console.error(`[RNK Exports] No document class found at CONFIG.${resolvedType}.documentClass`);
        continue;
      }
      console.log(`[RNK Exports] Creating ${resolvedType}: "${docData.name}" via ${cls.name}`);
      const doc = await cls.create(docData);
      console.log(`[RNK Exports] Success: created ${doc.name} (${doc.id})`);
      created.push(doc);
    } catch (err) {
      console.error(`[RNK Exports] Failed to create ${resolvedType} "${docData.name}":`, err);
    }
  }

  console.log(`[RNK Exports] Import complete: ${created.length}/${entries.length} created`);
  return created;
};

/**
 * Resolve the Foundry document class name from type string or data shape.
 */
const _resolveDocumentType = (type, data) => {
  // Known document class names
  const knownTypes = ["Actor", "Item", "JournalEntry", "RollTable", "Macro",
    "Playlist", "Scene", "Cards", "Adventure", "ChatMessage"];

  if (type && knownTypes.includes(type)) return type;

  // Infer from data shape
  if (data.prototypeToken !== undefined || data.items !== undefined) return "Actor";
  if (data.pages !== undefined) return "JournalEntry";
  if (data.results !== undefined) return "RollTable";
  if (data.command !== undefined) return "Macro";
  if (data.sounds !== undefined) return "Playlist";
  if (data.cards !== undefined) return "Cards";
  if (data.walls !== undefined || data.tokens !== undefined) return "Scene";

  // Items have system data + a sub-type like "weapon", "spell", etc.
  if (data.system !== undefined) return "Item";

  return null;
};

const _ensureFolder = async (type, path) => {
  const segments = path.split("/").filter(Boolean);
  const rootName = "RNK Exports";
  const rootFolder = await _ensureFolderNode(type, rootName, null);

  let parent = rootFolder;
  for (const segment of segments) {
    parent = await _ensureFolderNode(type, segment, parent.id);
  }

  return parent.id;
};

const _ensureFolderNode = async (type, name, parentId) => {
  const existing = game.folders
    .filter((f) => f.type === type)
    .find((f) => f.name === name && f.parent?.id === parentId);
  if (existing) return existing;

  return Folder.create({ name, type, parent: parentId });
};
