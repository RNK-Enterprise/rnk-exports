import { ZipBuilder } from "./ZipBuilder.js";
export { importExportFile, importJsonDocuments } from "./importHelpers.js";

const safeFileName = (input) => {
  return input.replace(/[^a-zA-Z0-9-_\.]/g, "_");
};

const getTimestamp = () => new Date().toISOString().replace(/[:.]/g, "-");
const getWorldSlug = () => safeFileName(game.world?.name || "world");
const createRootName = (prefix) => `${prefix}-${getWorldSlug()}-${getTimestamp()}`;

const addJsonEntry = (entries, path, data, includeReadableText) => {
  entries.push({ path: `${path}.json`, content: JSON.stringify(data, null, 2) });
  if (includeReadableText) {
    entries.push(jsonTextEntry(path.substring(0, path.lastIndexOf("/")), path.substring(path.lastIndexOf("/") + 1), data));
  }
};

const buildFolderPath = (folder) => {
  if (!folder) return "";
  const parentPath = buildFolderPath(folder.folder);
  return parentPath ? `${parentPath}/${folder.name}` : folder.name;
};

const buildChatExportEntries = ({ rootName, includeAll = true, messageIds = [], splitFiles = false, includeReadableText = true } = {}) => {
  const messages = game.messages.contents
    .filter((message) => (includeAll ? true : messageIds.includes(message.id)))
    .map((message) => message.toObject());

  const entries = [];
  if (splitFiles) {
    for (const message of messages) {
      const id = safeFileName(message.id || foundry.utils.randomID());
      addJsonEntry(entries, `${rootName}/messages/${id}`, message, includeReadableText);
    }
  } else {
    addJsonEntry(entries, `${rootName}/messages`, messages, includeReadableText);
  }

  return entries;
};

const buildJournalExportEntries = ({ rootName, includeAll = true, entryIds = [], splitFiles = false, includeReadableText = true } = {}) => {
  const journals = game.journal.contents
    .filter((entry) => (includeAll ? true : entryIds.includes(entry.id)))
    .map((entry) => entry.toObject());

  const entries = [];
  if (splitFiles) {
    for (const journal of journals) {
      const id = safeFileName(journal.id || foundry.utils.randomID());
      addJsonEntry(entries, `${rootName}/journals/${id}`, journal, includeReadableText);
    }
  } else {
    addJsonEntry(entries, `${rootName}/journals`, journals, includeReadableText);
  }

  return entries;
};

const buildCompendiumExportEntries = async ({ rootName, packIds = [], splitFiles = false, includeReadableText = true } = {}) => {
  const packs = game.packs.filter((pack) => (packIds.length ? packIds.includes(pack.collection) : true));
  const outputEntries = [];

  if (splitFiles) {
    const packMetadata = [];
    for (const pack of packs) {
      const documents = await pack.getDocuments();
      packMetadata.push({
        id: pack.collection,
        label: pack.metadata.label,
        type: pack.metadata.type,
        count: documents.length
      });

      for (const document of documents) {
        const data = document.toObject();
        const id = safeFileName(data.id || foundry.utils.randomID());
        addJsonEntry(outputEntries, `${rootName}/packs/${safeFileName(pack.collection)}/${id}`, data, includeReadableText);
      }
    }

    addJsonEntry(outputEntries, `${rootName}/packs`, packMetadata, includeReadableText);
    return outputEntries;
  }

  const packBundles = [];
  for (const pack of packs) {
    const documents = await pack.getDocuments();
    packBundles.push({
      id: pack.collection,
      label: pack.metadata.label,
      type: pack.metadata.type,
      documents: documents.map((document) => document.toObject())
    });
  }

  addJsonEntry(outputEntries, `${rootName}/packs`, packBundles, includeReadableText);
  return outputEntries;
};

const buildWorldFolderExportEntries = ({ rootName, folderIds = [], includeReadableText = true } = {}) => {
  const documents = [];

  const collectFolderDocuments = (folderId) => {
    const folder = game.folders.get(folderId);
    if (!folder) return;

    const folderPath = buildFolderPath(folder);
    for (const document of folder.contents) {
      documents.push({
        folder: folder.name,
        folderPath,
        type: folder.type,
        data: document.toObject()
      });
    }

    const childFolders = game.folders.filter((candidate) => candidate.folder?.id === folderId);
    for (const child of childFolders) {
      collectFolderDocuments(child.id);
    }
  };

  for (const folderId of folderIds) {
    collectFolderDocuments(folderId);
  }

  const entries = [];
  addJsonEntry(entries, `${rootName}/documents`, documents, includeReadableText);
  return entries;
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
  const rootName = createRootName("chat-export");
  const entries = buildChatExportEntries({ rootName, includeAll, messageIds, splitFiles, includeReadableText });

  return {
    blob: buildZip(entries),
    filename: `${rootName}.zip`
  };
};

export const exportJournalEntries = async ({ includeAll = true, entryIds = [], splitFiles = false, includeReadableText = true } = {}) => {
  const rootName = createRootName("journal-export");
  const output = buildJournalExportEntries({ rootName, includeAll, entryIds, splitFiles, includeReadableText });

  return {
    blob: buildZip(output),
    filename: `${rootName}.zip`
  };
};

export const exportCompendiumPacks = async ({ packIds = [], splitFiles = false, includeReadableText = true } = {}) => {
  const rootName = createRootName("compendium-export");
  const outputEntries = await buildCompendiumExportEntries({ rootName, packIds, splitFiles, includeReadableText });

  return {
    blob: buildZip(outputEntries),
    filename: `${rootName}.zip`
  };
};

export const exportWorldFolders = async ({ folderIds = [], includeReadableText = true } = {}) => {
  const rootName = createRootName("world-folder-export");
  const entries = buildWorldFolderExportEntries({ rootName, folderIds, includeReadableText });

  return {
    blob: buildZip(entries),
    filename: `${rootName}.zip`
  };
};

export const exportAllData = async ({ packIds = [], folderIds = [], splitOptions = {}, includeReadableText = true } = {}) => {
  const rootName = createRootName("full-export");
  const entries = [
    ...buildChatExportEntries({
      rootName: `${rootName}/chat`,
      splitFiles: !!splitOptions.chat,
      includeReadableText
    }),
    ...buildJournalExportEntries({
      rootName: `${rootName}/journals`,
      splitFiles: !!splitOptions.journals,
      includeReadableText
    }),
    ...await buildCompendiumExportEntries({
      rootName: `${rootName}/compendia`,
      packIds,
      splitFiles: !!splitOptions.compendia,
      includeReadableText
    })
  ];

  if (folderIds.length) {
    entries.push(...buildWorldFolderExportEntries({
      rootName: `${rootName}/world-folders`,
      folderIds,
      includeReadableText
    }));
  }

  return {
    blob: buildZip(entries),
    filename: `${rootName}.zip`
  };
};

