/**
 * Minimal ZIP builder (store only; no compression) for browser environments.
 * Produces a Blob containing a valid ZIP archive.
 * This is intentionally small to avoid external dependencies.
 *
 * RNK™ Exports - 2026
 */

const textEncoder = new TextEncoder();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crc32Table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

// Precompute table
const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function toUint8Array(input) {
  if (input instanceof Uint8Array) return input;
  if (typeof input === "string") return textEncoder.encode(input);
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  throw new Error("Unsupported input type for zip entry");
}

function makeNumberLE(value, size) {
  const out = new Uint8Array(size);
  let v = value >>> 0;
  for (let i = 0; i < size; i++) {
    out[i] = v & 0xff;
    v = v >>> 8;
  }
  return out;
}

export class ZipBuilder {
  constructor() {
    this._files = [];
  }

  /**
   * Add a file to the archive.
   * @param {string} path - Path inside zip (use / separators)
   * @param {string|Uint8Array|ArrayBuffer} content
   */
  addFile(path, content) {
    const data = toUint8Array(content);
    const crc = crc32(data);
    this._files.push({ path, data, crc });
  }

  /**
   * Build the final Blob containing the ZIP archive.
   */
  build() {
    const chunks = [];
    const centralDirectory = [];
    let offset = 0;

    const push = (value) => {
      chunks.push(value);
      offset += value.byteLength;
    };

    for (const file of this._files) {
      const filenameBytes = textEncoder.encode(file.path);
      const localHeader = new Uint8Array(30 + filenameBytes.length);
      // Local file header signature
      localHeader.set([0x50, 0x4b, 0x03, 0x04], 0);
      // Version needed to extract (2.0)
      localHeader.set(makeNumberLE(20, 2), 4);
      // General purpose bit flag (0)
      localHeader.set(makeNumberLE(0, 2), 6);
      // Compression method (0 = store)
      localHeader.set(makeNumberLE(0, 2), 8);
      // Last mod file time/date (0)
      localHeader.set(makeNumberLE(0, 4), 10);
      // CRC-32
      localHeader.set(makeNumberLE(file.crc, 4), 14);
      // Compressed size
      localHeader.set(makeNumberLE(file.data.length, 4), 18);
      // Uncompressed size
      localHeader.set(makeNumberLE(file.data.length, 4), 22);
      // Filename length
      localHeader.set(makeNumberLE(filenameBytes.length, 2), 26);
      // Extra field length
      localHeader.set(makeNumberLE(0, 2), 28);
      localHeader.set(filenameBytes, 30);

      push(localHeader);
      push(file.data);

      // Central directory entry
      const centralHeader = new Uint8Array(46 + filenameBytes.length);
      // Central file header signature
      centralHeader.set([0x50, 0x4b, 0x01, 0x02], 0);
      // Version made by
      centralHeader.set(makeNumberLE(20, 2), 4);
      // Version needed to extract
      centralHeader.set(makeNumberLE(20, 2), 6);
      // GP bit flag
      centralHeader.set(makeNumberLE(0, 2), 8);
      // Compression method
      centralHeader.set(makeNumberLE(0, 2), 10);
      // Mod time/date
      centralHeader.set(makeNumberLE(0, 4), 12);
      // CRC
      centralHeader.set(makeNumberLE(file.crc, 4), 16);
      // Compressed size
      centralHeader.set(makeNumberLE(file.data.length, 4), 20);
      // Uncompressed size
      centralHeader.set(makeNumberLE(file.data.length, 4), 24);
      // Filename length
      centralHeader.set(makeNumberLE(filenameBytes.length, 2), 28);
      // Extra field length
      centralHeader.set(makeNumberLE(0, 2), 30);
      // File comment length
      centralHeader.set(makeNumberLE(0, 2), 32);
      // Disk number start
      centralHeader.set(makeNumberLE(0, 2), 34);
      // Internal file attributes
      centralHeader.set(makeNumberLE(0, 2), 36);
      // External file attributes
      centralHeader.set(makeNumberLE(0, 4), 38);
      // Relative offset of local header
      centralHeader.set(makeNumberLE(offset - (30 + filenameBytes.length + file.data.length), 4), 42);
      centralHeader.set(filenameBytes, 46);

      centralDirectory.push(centralHeader);
    }

    const centralSize = centralDirectory.reduce((sum, entry) => sum + entry.byteLength, 0);
    const centralOffset = offset;
    centralDirectory.forEach((entry) => push(entry));

    const endRecord = new Uint8Array(22);
    // End of central dir signature
    endRecord.set([0x50, 0x4b, 0x05, 0x06], 0);
    // Number of this disk
    endRecord.set(makeNumberLE(0, 2), 4);
    // Disk where central directory starts
    endRecord.set(makeNumberLE(0, 2), 6);
    // Number of central directory records on this disk
    endRecord.set(makeNumberLE(this._files.length, 2), 8);
    // Total central directory records
    endRecord.set(makeNumberLE(this._files.length, 2), 10);
    // Size of central directory
    endRecord.set(makeNumberLE(centralSize, 4), 12);
    // Offset of start of central directory
    endRecord.set(makeNumberLE(centralOffset, 4), 16);
    // Comment length
    endRecord.set(makeNumberLE(0, 2), 20);

    push(endRecord);

    return new Blob(chunks, { type: "application/zip" });
  }
}
