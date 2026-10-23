// Extract a single font from a TrueType Collection (.ttc) into a standalone .ttf.
// Usage: node scripts/ttc2ttf.js <in.ttc> <fontIndex> <out.ttf>
const fs = require("fs");
const path = require("path");

const [, , inPath, indexArg, outPath] = process.argv;
const fontIndex = Number(indexArg || 0);
const b = fs.readFileSync(inPath);

if (b.toString("ascii", 0, 4) !== "ttcf") {
  throw new Error("Not a TTC file");
}
const numFonts = b.readUInt32BE(8);
if (fontIndex >= numFonts) {
  throw new Error(`Font index ${fontIndex} out of range (${numFonts})`);
}
const dirOffset = b.readUInt32BE(12 + fontIndex * 4);
const sfntVersion = b.readUInt32BE(dirOffset);
const numTables = b.readUInt16BE(dirOffset + 4);
const searchRange = b.readUInt16BE(dirOffset + 6);
const entrySelector = b.readUInt16BE(dirOffset + 8);
const rangeShift = b.readUInt16BE(dirOffset + 10);

const records = [];
for (let i = 0; i < numTables; i++) {
  const o = dirOffset + 12 + i * 16;
  records.push({
    tag: b.toString("ascii", o, o + 4),
    checksum: b.readUInt32BE(o + 4),
    offset: b.readUInt32BE(o + 8),
    length: b.readUInt32BE(o + 12),
  });
}

const headerSize = 12 + numTables * 16;
let cursor = headerSize;
const parts = [];
const newRecords = [];
for (const r of records) {
  const pad = (4 - (cursor % 4)) % 4;
  if (pad) {
    parts.push(Buffer.alloc(pad));
    cursor += pad;
  }
  const data = b.subarray(r.offset, r.offset + r.length);
  parts.push(data);
  newRecords.push({ ...r, offset: cursor });
  cursor += r.length;
}

const header = Buffer.alloc(12);
header.writeUInt32BE(sfntVersion, 0);
header.writeUInt16BE(numTables, 4);
header.writeUInt16BE(searchRange, 6);
header.writeUInt16BE(entrySelector, 8);
header.writeUInt16BE(rangeShift, 10);

const dir = Buffer.alloc(numTables * 16);
newRecords.forEach((r, i) => {
  const o = i * 16;
  dir.write(r.tag, o, "ascii");
  dir.writeUInt32BE(r.checksum, o + 4);
  dir.writeUInt32BE(r.offset, o + 8);
  dir.writeUInt32BE(r.length, o + 12);
});

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, Buffer.concat([header, dir, ...parts]));
console.log(`Wrote ${outPath} (${numTables} tables, ${cursor} bytes)`);
