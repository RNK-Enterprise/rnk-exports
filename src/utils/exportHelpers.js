import { ZipBuilder } from "./ZipBuilder.js";

const safeFileName = (input) => {
  return input.replace(/[^a-zA-Z0-9-_\.]/g, "_");
};

const objectToReadableText = (value, depth = 0) => {
  const indent = "  ".repeat(depth);
  if (value === null) return `${indent}null`;
  if (typeof value !== "object") return `${indent}${value}`;
  if (Array.isArray(value)) {
    if (value.length === 0) return `${indent}[]`;
    let out = `${indent}[\n`;
    for (const item of value) {
      out += `${objectToReadableText(item, depth + 1)}\n`;
    }
    return out + `${indent}]`;
  }

  const entries = Object.entries(value);
  if (!entries.length) return `${indent}{}`;
  let out = `${indent}{\n`;
  for (const [key, val] of entries) {
    if (val !== null && typeof val === "object") {
      out += `${indent}  ${key}:\n${objectToReadableText(val, depth + 2)}\n`;
    } else {
      out += `${indent}  ${key}: ${val}\n`;
    }
  }
  return out + `${indent}` + `}`;
};

const jsonTextEntry = (basePath, filename, data) => ({
  path: `${basePath}/${filename}.txt`,
  content: objectToReadableText(data)
});

export const downloadBlob = (blob, filename) => {
  if (window.navigator && typeof window.navigator.msSaveOrOpenBlob === "function") {
    window.navigator.msSaveOrOpenBlob(blob, filename);
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const buildZip = (entries) => {
  const zip = new ZipBuilder();
  for (const entry of entries) {
    zip.addFile(entry.path, entry.content);
  }
  return zip.build();
};

export const exportChatMessages = async ({ includeAll = true, messageIds = [], splitFiles = false, includeReadableText = true } = {}) => {
  const messages = game.messages.contents
    .filter((msg) => (includeAll ? true : messageIds.includes(msg.id)))
    .map((msg) => msg.toObject());

  const date = new Date().toISOString().replace(/[:.]/g, "-");
  const rootName = `chat-export-${safeFileName(game.world.name || "world")}-${date}`;

  const entries = [];

  if (splitFiles) {
    for (const msg of messages) {
      const id = msg.id || foundry.utils.randomID();
      const jsonPath = `${rootName}/messages/${safeFileName(id)}.json`;
      entries.push({ path: jsonPath, content: JSON.stringify(msg, null, 2) });
      if (includeReadableText) {
        entries.push({ path: `${rootName}/messages/${safeFileName(id)}.txt`, content: objectToReadableText(msg) });
      }
    }
  } else {
    entries.push({ path: `${rootName}/messages.json`, content: JSON.stringify(messages, null, 2) });
    if (includeReadableText) {
      entries.push({ path: `${rootName}/messages.txt`, content: objectToReadableText(messages) });
    }
  }

  return {
    blob: buildZip(entries),
    filename: `${rootName}.zip`
  };
};

export const exportJournalEntries = async ({ includeAll = true, entryIds = [], splitFiles = false, includeReadableText = true } = {}) => {
  const entries = game.journal.contents
    .filter((entry) => (includeAll ? true : entryIds.includes(entry.id)))
    .map((entry) => entry.toObject());

  const date = new Date().toISOString().replace(/[:.]/g, "-");
  const rootName = `journal-export-${safeFileName(game.world.name || "world")}-${date}`;

  const output = [];

  if (splitFiles) {
    for (const entry of entries) {
      const id = entry.id || foundry.utils.randomID();
      output.push({ path: `${rootName}/journals/${safeFileName(id)}.json`, content: JSON.stringify(entry, null, 2) });
      if (includeReadableText) {
        output.push({ path: `${rootName}/journals/${safeFileName(id)}.txt`, content: objectToReadableText(entry) });
      }
    }
  } else {
    output.push({ path: `${rootName}/journals.json`, content: JSON.stringify(entries, null, 2) });
    if (includeReadableText) {
      output.push({ path: `${rootName}/journals.txt`, content: objectToReadableText(entries) });
    }
  }

  return {
    blob: buildZip(output),
    filename: `${rootName}.zip`
  };
};

export const exportCompendiumPacks = async ({ packIds = [], splitFiles = false, includeReadableText = true } = {}) => {
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
        entries.push({ path: `${rootName}/packs/${safeFileName(pack.collection)}/${safeFileName(id)}.json`, content: JSON.stringify(item, null, 2) });
        if (includeReadableText) {
          entries.push({ path: `${rootName}/packs/${safeFileName(pack.collection)}/${safeFileName(id)}.txt`, content: objectToReadableText(item) });
        }
      }
    }
  }

  const outputEntries = [];

  if (splitFiles) {
    outputEntries.push({ path: `${rootName}/packs.json`, content: JSON.stringify(packsData, null, 2) });
    if (includeReadableText) {
      outputEntries.push({ path: `${rootName}/packs.txt`, content: objectToReadableText(packsData) });
    }
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
    outputEntries.push({ path: `${rootName}/packs.json`, content: JSON.stringify(packsWithEntries, null, 2) });
    if (includeReadableText) {
      outputEntries.push({ path: `${rootName}/packs.txt`, content: objectToReadableText(packsWithEntries) });
    }
  }

  return {
    blob: buildZip(outputEntries),
    filename: `${rootName}.zip`
  };
};

export const exportDataFolder = async (rootPath, includeReadableText = true) => {
  const normalizePath = (path) => path.replace(/\\/g, "/").replace(/\/\/+/, "/");
  rootPath = normalizePath(rootPath);

  const folderEntries = [];

  const walkFolder = async (path) => {
    const result = await FilePicker.browse("data", path);
    if (!result) return;

    for (const file of result.files) {
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

  const entries = [];

  if (includeReadableText) {
    entries.push({
      path: `${rootName}/data-folder-summary.txt`,
      content: objectToReadableText({ root: rootPath, exportedAt: new Date().toISOString(), fileCount: folderEntries.length })
    });
  }

  for (const entry of folderEntries) {
    entries.push({ path: `${rootName}/${entry.path}`, content: entry.content });
    if (!includeReadableText) continue;
    try {
      const parsed = JSON.parse(entry.content);
      entries.push({ path: `${rootName}/${entry.path.replace(/\.json$/, ".txt")}`, content: objectToReadableText(parsed) });
    } catch {
      entries.push({ path: `${rootName}/${entry.path.replace(/\.json$/, ".txt")}`, content: entry.content });
    }
  }

  return {
    blob: buildZip(entries),
    filename: `${rootName}.zip`
  };
};

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
    entries = [json];
  } else {
    entries = [];
  }

  console.log(`[RNK Exports] Import: found ${entries.length} entries to process`);

  const created = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    const isWrapped = entry.data && typeof entry.data === "object" && entry.data.name;
    const docData = isWrapped ? foundry.utils.deepClone(entry.data) : foundry.utils.deepClone(entry);
    const typeHint = isWrapped ? entry.type : null;

    const resolvedType = _resolveDocumentType(typeHint, docData);
    console.log(`[RNK Exports] Entry ${i}: wrapped=${isWrapped}, typeHint=${typeHint}, resolved=${resolvedType}, name=${docData.name}`);

    if (!resolvedType) {
      console.warn(`[RNK Exports] Skipping entry ${i}: could not determine document type`);
      continue;
    }

    delete docData._id;

    try {
      const folderName = (isWrapped ? entry.folder : null) || entry.folderPath || null;
      if (folderName) {
        const folderId = await _ensureFolder(resolvedType, folderName);
        if (folderId) {
          docData.folder = folderId;
        }
      } else {
        delete docData.folder;
      }
    } catch (err) {
      console.error(`[RNK Exports] Failed to create folder for entry ${i}:`, err);
      delete docData.folder;
    }

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

const _resolveDocumentType = (type, data) => {
  const knownTypes = ["Actor", "Item", "JournalEntry", "RollTable", "Macro",
    "Playlist", "Scene", "Cards", "Adventure", "ChatMessage"];

  if (type && knownTypes.includes(type)) return type;

  if (data.prototypeToken !== undefined || data.items !== undefined) return "Actor";
  if (data.pages !== undefined) return "JournalEntry";
  if (data.results !== undefined) return "RollTable";
  if (data.command !== undefined) return "Macro";
  if (data.sounds !== undefined) return "Playlist";
  if (data.cards !== undefined) return "Cards";
  if (data.walls !== undefined || data.tokens !== undefined) return "Scene";

  if (data.system !== undefined) return "Item";

  return null;
};

const _ensureFolder = async (type, path) => {
  if (!path || typeof path !== "string") return null;
  const normalizedPath = path.replace(/\\/g, "/").replace(/^\/|\/$/g, "");
  const segments = normalizedPath.split("/").filter(Boolean);
  if (!segments.length) return null;

  let parentId = null;
  let node = null;
  for (const segment of segments) {
    node = await _ensureFolderNode(type, segment, parentId);
    parentId = node.id;
  }

  return node?.id || null;
};

const _ensureFolderNode = async (type, name, parentId) => {
  const existing = game.folders
    .filter((f) => f.type === type)
    .find((f) => f.name === name && f.parent?.id === parentId);
  if (existing) return existing;

  return Folder.create({ name, type, parent: parentId });
};
