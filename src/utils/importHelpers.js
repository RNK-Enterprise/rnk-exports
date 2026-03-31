import { readZipEntries } from "./ZipBuilder.js";

const MODULE_ID = "rnk-exports";
const MODULE_LABEL = "[RNK™ Exports]";
const decoder = new TextDecoder();
const FOLDER_SUPPORTED_TYPES = new Set(["Actor", "Item", "JournalEntry", "RollTable", "Macro", "Playlist", "Scene", "Cards", "Adventure"]);
const TYPE_ALIASES = {
  actor: "Actor",
  actors: "Actor",
  item: "Item",
  items: "Item",
  journal: "JournalEntry",
  journalentry: "JournalEntry",
  journalentries: "JournalEntry",
  table: "RollTable",
  rolltable: "RollTable",
  rolltables: "RollTable",
  macro: "Macro",
  macros: "Macro",
  playlist: "Playlist",
  playlists: "Playlist",
  scene: "Scene",
  scenes: "Scene",
  card: "Cards",
  cards: "Cards",
  adventure: "Adventure",
  adventures: "Adventure",
  chat: "ChatMessage",
  chatmessage: "ChatMessage",
  chatmessages: "ChatMessage"
};

const getSetting = (setting, fallback) => {
  try {
    return game?.settings?.get(MODULE_ID, setting) ?? fallback;
  } catch {
    return fallback;
  }
};

const debugLog = (...args) => {
  if (getSetting("enableDebug", false)) {
    console.log(MODULE_LABEL, ...args);
  }
};

const debugWarn = (...args) => {
  if (getSetting("enableDebug", false)) {
    console.warn(MODULE_LABEL, ...args);
  }
};

const errorLog = (...args) => {
  console.error(MODULE_LABEL, ...args);
};

const normalizeDocumentType = (type) => {
  if (!type || typeof type !== "string") return null;
  const compact = type.replace(/[^a-z]/gi, "").toLowerCase();
  return TYPE_ALIASES[compact] || type;
};

const isDocumentLike = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return [
    "name",
    "_id",
    "id",
    "content",
    "pages",
    "results",
    "command",
    "prototypeToken",
    "system",
    "tokens",
    "walls"
  ].some((key) => key in value);
};

const isMetadataOnlyPackList = (value) => {
  return Array.isArray(value) && value.every((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const hasDocs = Array.isArray(entry.documents) || Array.isArray(entry.entries) || Array.isArray(entry.docs);
    return !hasDocs && (entry.id || entry.collection) && entry.label;
  });
};

const deriveImportContextFromPath = (sourcePath = "", packMetadata = new Map()) => {
  const normalizedPath = sourcePath.replace(/\\/g, "/");
  const segments = normalizedPath.split("/").filter(Boolean);
  const packsIndex = segments.indexOf("packs");

  if (packsIndex >= 0 && segments.length > packsIndex + 1) {
    const collection = segments[packsIndex + 1];
    const metadata = packMetadata.get(collection) || null;
    return {
      folderPath: metadata?.label || collection,
      typeHint: normalizeDocumentType(metadata?.type)
    };
  }

  if (segments.includes("journals")) {
    return { typeHint: "JournalEntry", folderPath: null };
  }

  if (segments.includes("messages")) {
    return { typeHint: "ChatMessage", folderPath: null };
  }

  return { folderPath: null, typeHint: null };
};

const normalizeImportEntries = (payload, context = {}) => {
  if (payload == null) return [];

  if (Array.isArray(payload)) {
    return payload.flatMap((entry) => normalizeImportEntries(entry, context));
  }

  if (typeof payload !== "object") {
    return [];
  }

  if (Array.isArray(payload.documents) || Array.isArray(payload.entries) || Array.isArray(payload.docs)) {
    const docs = payload.documents || payload.entries || payload.docs || [];
    const folderPath = payload.folderPath || payload.folder || payload.label || context.folderPath || null;
    const typeHint = normalizeDocumentType(payload.type) || context.typeHint || null;
    return docs.flatMap((entry) => normalizeImportEntries(entry, { ...context, folderPath, typeHint }));
  }

  if (payload.data && typeof payload.data === "object") {
    return [{
      data: payload.data,
      type: normalizeDocumentType(payload.type) || context.typeHint || null,
      folderPath: payload.folderPath || payload.folder || context.folderPath || null
    }];
  }

  if (isDocumentLike(payload)) {
    return [{
      data: payload,
      type: context.typeHint || null,
      folderPath: context.folderPath || null
    }];
  }

  return [];
};

const readJson = (rawText) => JSON.parse(rawText);

const readZipJsonEntries = (arrayBuffer) => {
  const zipEntries = readZipEntries(arrayBuffer);
  const jsonEntries = zipEntries
    .filter((entry) => entry.path.toLowerCase().endsWith(".json"))
    .map((entry) => ({ ...entry, text: decoder.decode(entry.data) }));

  const packMetadata = new Map();
  for (const entry of jsonEntries) {
    try {
      const parsed = readJson(entry.text);
      if (!isMetadataOnlyPackList(parsed)) continue;
      for (const pack of parsed) {
        if (!pack?.id) continue;
        packMetadata.set(pack.id, { label: pack.label || pack.id, type: pack.type || null });
      }
    } catch (error) {
      debugWarn("Skipping metadata parse failure for ZIP entry", entry.path, error);
    }
  }

  return jsonEntries.flatMap((entry) => {
    const parsed = readJson(entry.text);
    if (isMetadataOnlyPackList(parsed)) {
      return [];
    }

    const derivedContext = deriveImportContextFromPath(entry.path, packMetadata);
    return normalizeImportEntries(parsed, {
      sourcePath: entry.path,
      folderPath: derivedContext.folderPath,
      typeHint: derivedContext.typeHint,
      packMetadata
    });
  });
};

const supportsFolders = (type) => FOLDER_SUPPORTED_TYPES.has(type);

const createImportedDocuments = async (entries) => {
  debugLog(`Importing ${entries.length} normalized entries`);

  const created = [];
  for (const [index, entry] of entries.entries()) {
    const docData = foundry.utils.deepClone(entry.data);
    const resolvedType = normalizeDocumentType(entry.type) || resolveDocumentType(entry.type, docData);

    if (!resolvedType) {
      debugWarn(`Skipping entry ${index}: unable to resolve document type`, entry);
      continue;
    }

    delete docData._id;

    if (entry.folderPath && supportsFolders(resolvedType)) {
      try {
        const folderId = await ensureFolder(resolvedType, entry.folderPath);
        if (folderId) docData.folder = folderId;
      } catch (error) {
        errorLog(`Failed to ensure folder for ${resolvedType}`, error);
        delete docData.folder;
      }
    } else {
      delete docData.folder;
    }

    try {
      const documentClass = CONFIG[resolvedType]?.documentClass;
      if (!documentClass) {
        errorLog(`Missing CONFIG.${resolvedType}.documentClass`);
        continue;
      }

      const createdDocument = await documentClass.create(docData);
      created.push(createdDocument);
      debugLog(`Created ${resolvedType} ${createdDocument.name || createdDocument.id}`);
    } catch (error) {
      errorLog(`Failed to create ${resolvedType}`, error);
    }
  }

  return created;
};

export const importExportFile = async (file) => {
  if (!file) return [];

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".zip")) {
    const entries = readZipJsonEntries(await file.arrayBuffer());
    return createImportedDocuments(entries);
  }

  return importJsonDocuments(await file.text());
};

export const importJsonDocuments = async (rawText) => {
  const json = readJson(rawText);
  const entries = normalizeImportEntries(json);
  return createImportedDocuments(entries);
};

const resolveDocumentType = (type, data) => {
  const normalizedType = normalizeDocumentType(type);
  const knownTypes = ["Actor", "Item", "JournalEntry", "RollTable", "Macro", "Playlist", "Scene", "Cards", "Adventure", "ChatMessage"];

  if (normalizedType && knownTypes.includes(normalizedType)) return normalizedType;
  if (data.prototypeToken !== undefined || data.items !== undefined) return "Actor";
  if (data.pages !== undefined) return "JournalEntry";
  if (data.results !== undefined) return "RollTable";
  if (data.command !== undefined) return "Macro";
  if (data.sounds !== undefined) return "Playlist";
  if (data.cards !== undefined) return "Cards";
  if (data.walls !== undefined || data.tokens !== undefined) return "Scene";
  if (data.content !== undefined && data.speaker !== undefined) return "ChatMessage";
  if (data.system !== undefined) return "Item";
  return null;
};

const ensureFolder = async (type, path) => {
  if (!path || typeof path !== "string") return null;
  const normalizedPath = path.replace(/\\/g, "/").replace(/^\/|\/$/g, "");
  const segments = normalizedPath.split("/").filter(Boolean);
  if (!segments.length) return null;

  let parentId = null;
  let node = null;
  for (const segment of segments) {
    node = await ensureFolderNode(type, segment, parentId);
    parentId = node.id;
  }

  return node?.id || null;
};

const ensureFolderNode = async (type, name, parentId) => {
  const existing = game.folders
    .filter((folder) => folder.type === type)
    .find((folder) => folder.name === name && folder.parent?.id === parentId);
  if (existing) return existing;

  return Folder.create({ name, type, parent: parentId });
};
