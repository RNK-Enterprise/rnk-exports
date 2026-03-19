
const textEncoder = new TextEncoder();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crc32Table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

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

  addFile(path, content) {
    const data = toUint8Array(content);
    const crc = crc32(data);
    this._files.push({ path, data, crc });
  }

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
      localHeader.set([0x50, 0x4b, 0x03, 0x04], 0);
      localHeader.set(makeNumberLE(20, 2), 4);
      localHeader.set(makeNumberLE(0, 2), 6);
      localHeader.set(makeNumberLE(0, 2), 8);
      localHeader.set(makeNumberLE(0, 4), 10);
      localHeader.set(makeNumberLE(file.crc, 4), 14);
      localHeader.set(makeNumberLE(file.data.length, 4), 18);
      localHeader.set(makeNumberLE(file.data.length, 4), 22);
      localHeader.set(makeNumberLE(filenameBytes.length, 2), 26);
      localHeader.set(makeNumberLE(0, 2), 28);
      localHeader.set(filenameBytes, 30);

      push(localHeader);
      push(file.data);

      const centralHeader = new Uint8Array(46 + filenameBytes.length);
      centralHeader.set([0x50, 0x4b, 0x01, 0x02], 0);
      centralHeader.set(makeNumberLE(20, 2), 4);
      centralHeader.set(makeNumberLE(20, 2), 6);
      centralHeader.set(makeNumberLE(0, 2), 8);
      centralHeader.set(makeNumberLE(0, 2), 10);
      centralHeader.set(makeNumberLE(0, 4), 12);
      centralHeader.set(makeNumberLE(file.crc, 4), 16);
      centralHeader.set(makeNumberLE(file.data.length, 4), 20);
      centralHeader.set(makeNumberLE(file.data.length, 4), 24);
      centralHeader.set(makeNumberLE(filenameBytes.length, 2), 28);
      centralHeader.set(makeNumberLE(0, 2), 30);
      centralHeader.set(makeNumberLE(0, 2), 32);
      centralHeader.set(makeNumberLE(0, 2), 34);
      centralHeader.set(makeNumberLE(0, 2), 36);
      centralHeader.set(makeNumberLE(0, 4), 38);
      centralHeader.set(makeNumberLE(offset - (30 + filenameBytes.length + file.data.length), 4), 42);
      centralHeader.set(filenameBytes, 46);

      centralDirectory.push(centralHeader);
    }

    const centralSize = centralDirectory.reduce((sum, entry) => sum + entry.byteLength, 0);
    const centralOffset = offset;
    centralDirectory.forEach((entry) => push(entry));

    const endRecord = new Uint8Array(22);
    endRecord.set([0x50, 0x4b, 0x05, 0x06], 0);
    endRecord.set(makeNumberLE(0, 2), 4);
    endRecord.set(makeNumberLE(0, 2), 6);
    endRecord.set(makeNumberLE(this._files.length, 2), 8);
    endRecord.set(makeNumberLE(this._files.length, 2), 10);
    endRecord.set(makeNumberLE(centralSize, 4), 12);
    endRecord.set(makeNumberLE(centralOffset, 4), 16);
    endRecord.set(makeNumberLE(0, 2), 20);

    push(endRecord);

    return new Blob(chunks, { type: "application/zip" });
  }
}
