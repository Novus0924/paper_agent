var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../protocol/src/constants.ts
var EXT_EVENT_PATTERN = /^x\/(?:(?:core|agnes)\/[a-z0-9-]+|host\/session-title|[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+)$/;
var EXT_EVENT_PATTERN_SOURCE = EXT_EVENT_PATTERN.source;
var META_KEY = "ai.agnes.harness";
var MAX_FRAME_BYTES = 144 * 1024 * 1024;
var ARTIFACT_READ_RPC_MAX_BYTES = 1024 * 1024;
var UI_OPENING_DEFAULT_MAX_NODES = 200;
var UI_HISTORY_DEFAULT_LIMIT = 100;
var UI_PROJECTION_DEFAULT_MAX_BYTES = 256 * 1024;
var UI_PROJECTION_MIN_MAX_BYTES = 16 * 1024;
var UI_PROJECTION_MAX_BYTES = MAX_FRAME_BYTES - 4096;

// ../protocol-validation/src/safe-image.ts
var USER_MESSAGE_IMAGE_LIMITS = Object.freeze({
  maxBytesPerImage: 100 * 1024 * 1024,
  // Matches the 1456 edge limit the vision paths enforce: a full-HD screenshot is 2,073,600px,
  // which a round 2,000,000 rejects along with most Retina and phone captures.
  maxPixelsPerImage: 1456 * 1456,
  maxAggregateBytes: 100 * 1024 * 1024,
  maxAggregatePixels: 8e6
});
var SafeImageError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "SafeImageError";
    this.code = code;
  }
};
var BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var BASE64_VALUE = new Int16Array(128).fill(-1);
for (let i = 0; i < BASE64.length; i += 1) BASE64_VALUE[BASE64.charCodeAt(i)] = i;
var typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
var typedArrayByteLength = Object.getOwnPropertyDescriptor(typedArrayPrototype, "byteLength")?.get;
function positiveLimit(value, name) {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new TypeError(`${name} must be a positive safe integer`);
  return value;
}
function checkedLimits(input) {
  return {
    maxBytesPerImage: positiveLimit(input.maxBytesPerImage, "maxBytesPerImage"),
    maxPixelsPerImage: positiveLimit(input.maxPixelsPerImage, "maxPixelsPerImage"),
    maxAggregateBytes: positiveLimit(input.maxAggregateBytes, "maxAggregateBytes"),
    maxAggregatePixels: positiveLimit(input.maxAggregatePixels, "maxAggregatePixels")
  };
}
function decodeBase64(value, maxBytes) {
  if (value.length === 0 || value.length % 4 !== 0)
    throw new SafeImageError("BASE64_INVALID", "image data is not padded standard base64");
  const maxEncodedLength = Math.ceil(maxBytes / 3) * 4;
  if (value.length > maxEncodedLength)
    throw new SafeImageError("BYTE_LIMIT", "encoded image exceeds byte limit");
  let padding = 0;
  if (value.endsWith("==")) padding = 2;
  else if (value.endsWith("=")) padding = 1;
  const byteLength = value.length / 4 * 3 - padding;
  if (byteLength > maxBytes) throw new SafeImageError("BYTE_LIMIT", "decoded image exceeds byte limit");
  const bytes = new Uint8Array(byteLength);
  let out = 0;
  for (let offset = 0; offset < value.length; offset += 4) {
    const last = offset + 4 === value.length;
    const a = value.charCodeAt(offset);
    const b = value.charCodeAt(offset + 1);
    const c = value.charCodeAt(offset + 2);
    const d = value.charCodeAt(offset + 3);
    const va = a < 128 ? BASE64_VALUE[a] ?? -1 : -1;
    const vb = b < 128 ? BASE64_VALUE[b] ?? -1 : -1;
    if (va < 0 || vb < 0)
      throw new SafeImageError("BASE64_INVALID", "image data contains invalid base64 characters");
    const cPad = c === 61;
    const dPad = d === 61;
    const vc = cPad ? 0 : c < 128 ? BASE64_VALUE[c] ?? -1 : -1;
    const vd = dPad ? 0 : d < 128 ? BASE64_VALUE[d] ?? -1 : -1;
    if (!last && (cPad || dPad) || cPad && !dPad || vc < 0 || vd < 0)
      throw new SafeImageError("BASE64_INVALID", "image data has invalid base64 padding");
    if (cPad && (vb & 15) !== 0 || dPad && !cPad && (vc & 3) !== 0)
      throw new SafeImageError("BASE64_INVALID", "image data is non-canonical base64");
    if (out < byteLength) bytes[out++] = va << 2 | vb >> 4;
    if (out < byteLength) bytes[out++] = (vb & 15) << 4 | vc >> 2;
    if (out < byteLength) bytes[out++] = (vc & 3) << 6 | vd;
  }
  return bytes;
}
function decodeAttachmentData(value, maxBytes) {
  positiveLimit(maxBytes, "maxBytes");
  return value === "" ? new Uint8Array() : decodeBase64(value, maxBytes);
}
function u16(bytes, offset) {
  return bytes[offset] << 8 | bytes[offset + 1];
}
function u32(bytes, offset) {
  return bytes[offset] * 16777216 + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3];
}
function dimensions(width, height, maxPixels) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1)
    throw new SafeImageError("DIMENSIONS_INVALID", "image dimensions must be positive integers");
  if (width > Math.floor(maxPixels / height))
    throw new SafeImageError("PIXEL_LIMIT", "image dimensions exceed pixel limit");
  return { width, height, pixels: width * height };
}
var PNG_MAGIC = [137, 80, 78, 71, 13, 10, 26, 10];
var CRC32_TABLE = new Uint32Array(256);
for (let index = 0; index < CRC32_TABLE.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) === 1 ? 3988292384 ^ value >>> 1 : value >>> 1;
  CRC32_TABLE[index] = value >>> 0;
}
function crc32(bytes, start, end) {
  let crc = 4294967295;
  for (let offset = start; offset < end; offset += 1)
    crc = CRC32_TABLE[(crc ^ bytes[offset]) & 255] ^ crc >>> 8;
  return (crc ^ 4294967295) >>> 0;
}
var BitReader = class {
  bytes;
  bitOffset = 0;
  constructor(bytes) {
    this.bytes = bytes;
  }
  read(count) {
    if (count < 0 || count > 24 || this.bitOffset + count > this.bytes.length * 8)
      throw new SafeImageError("FORMAT_INVALID", "truncated PNG deflate stream");
    let value = 0;
    for (let bit = 0; bit < count; bit += 1) {
      const offset = this.bitOffset + bit;
      value |= (this.bytes[offset >>> 3] >>> (offset & 7) & 1) << bit;
    }
    this.bitOffset += count;
    return value;
  }
  align() {
    this.bitOffset = this.bitOffset + 7 & ~7;
  }
};
function reverseBits(value, length) {
  let reversed = 0;
  for (let bit = 0; bit < length; bit += 1) reversed = reversed << 1 | value >>> bit & 1;
  return reversed;
}
function huffman(lengths, options = {}) {
  const counts = new Uint16Array(16);
  let maxLength = 0;
  for (const length of lengths) {
    if (!Number.isInteger(length) || length < 0 || length > 15)
      throw new SafeImageError("FORMAT_INVALID", "PNG deflate tree has an invalid code length");
    if (length > 0) {
      counts[length] = counts[length] + 1;
      maxLength = Math.max(maxLength, length);
    }
  }
  if (maxLength === 0) {
    if (options.allowEmpty) return void 0;
    throw new SafeImageError("FORMAT_INVALID", "PNG deflate tree is empty");
  }
  let available = 1;
  for (let length = 1; length <= 15; length += 1) {
    available = available * 2 - counts[length];
    if (available < 0) throw new SafeImageError("FORMAT_INVALID", "PNG deflate tree is oversubscribed");
  }
  if (available > 0 && !(options.allowSingleIncomplete && maxLength === 1 && counts[1] === 1))
    throw new SafeImageError("FORMAT_INVALID", "PNG deflate tree is incomplete");
  const next = new Uint16Array(16);
  let code = 0;
  for (let length = 1; length <= 15; length += 1) {
    code = code + counts[length - 1] << 1;
    next[length] = code;
  }
  const byLength = Array.from({ length: maxLength + 1 }, () => /* @__PURE__ */ new Map());
  for (let symbol = 0; symbol < lengths.length; symbol += 1) {
    const length = lengths[symbol];
    if (length === 0) continue;
    const canonical = next[length];
    next[length] = canonical + 1;
    byLength[length]?.set(reverseBits(canonical, length), symbol);
  }
  return { byLength, maxLength };
}
function decodeSymbol(reader, tree) {
  if (!tree) throw new SafeImageError("FORMAT_INVALID", "PNG deflate distance tree is missing");
  let code = 0;
  for (let length = 1; length <= tree.maxLength; length += 1) {
    code |= reader.read(1) << length - 1;
    const symbol = tree.byLength[length]?.get(code);
    if (symbol !== void 0) return symbol;
  }
  throw new SafeImageError("FORMAT_INVALID", "PNG deflate stream uses an invalid Huffman code");
}
var FIXED_LITERAL_LENGTHS = Array.from(
  { length: 288 },
  (_, symbol) => symbol <= 143 ? 8 : symbol <= 255 ? 9 : symbol <= 279 ? 7 : 8
);
var FIXED_DISTANCE_LENGTHS = Array.from({ length: 32 }, () => 5);
var FIXED_LITERAL_TREE = huffman(FIXED_LITERAL_LENGTHS);
var FIXED_DISTANCE_TREE = huffman(FIXED_DISTANCE_LENGTHS);
var LENGTH_BASE = [
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  13,
  15,
  17,
  19,
  23,
  27,
  31,
  35,
  43,
  51,
  59,
  67,
  83,
  99,
  115,
  131,
  163,
  195,
  227,
  258
];
var LENGTH_EXTRA = [
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0
];
var DISTANCE_BASE = [
  1,
  2,
  3,
  4,
  5,
  7,
  9,
  13,
  17,
  25,
  33,
  49,
  65,
  97,
  129,
  193,
  257,
  385,
  513,
  769,
  1025,
  1537,
  2049,
  3073,
  4097,
  6145,
  8193,
  12289,
  16385,
  24577
];
var DISTANCE_EXTRA = [
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13
];
var CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
function dynamicTrees(reader) {
  const literalCount = reader.read(5) + 257;
  if (literalCount > 286) throw new SafeImageError("FORMAT_INVALID", "PNG deflate literal count is reserved");
  const distanceCount = reader.read(5) + 1;
  const codeLengthCount = reader.read(4) + 4;
  const codeLengths = new Array(19).fill(0);
  for (let index = 0; index < codeLengthCount; index += 1)
    codeLengths[CODE_LENGTH_ORDER[index]] = reader.read(3);
  const codeLengthTree = huffman(codeLengths);
  const lengths = [];
  while (lengths.length < literalCount + distanceCount) {
    const symbol = decodeSymbol(reader, codeLengthTree);
    if (symbol <= 15) {
      lengths.push(symbol);
      continue;
    }
    let repeat;
    let value;
    if (symbol === 16) {
      if (lengths.length === 0)
        throw new SafeImageError("FORMAT_INVALID", "PNG deflate repeats a missing code length");
      repeat = reader.read(2) + 3;
      value = lengths[lengths.length - 1];
    } else if (symbol === 17) {
      repeat = reader.read(3) + 3;
      value = 0;
    } else if (symbol === 18) {
      repeat = reader.read(7) + 11;
      value = 0;
    } else throw new SafeImageError("FORMAT_INVALID", "PNG deflate code-length symbol is invalid");
    if (lengths.length + repeat > literalCount + distanceCount)
      throw new SafeImageError("FORMAT_INVALID", "PNG deflate code lengths overflow their trees");
    for (let count = 0; count < repeat; count += 1) lengths.push(value);
  }
  if (lengths[256] === 0)
    throw new SafeImageError("FORMAT_INVALID", "PNG deflate literal tree has no end marker");
  return [
    huffman(lengths.slice(0, literalCount), { allowSingleIncomplete: true }),
    huffman(lengths.slice(literalCount), { allowEmpty: true, allowSingleIncomplete: true })
  ];
}
function inflateSink(expected, rowLengths, maxDistance) {
  const window2 = new Uint8Array(32768);
  let output = 0;
  let row = 0;
  let withinRow = 0;
  let adlerA = 1;
  let adlerB = 0;
  const write = (value) => {
    if (output >= expected)
      throw new SafeImageError("PIXEL_LIMIT", "PNG decompressed data exceeds its scanline bound");
    if (withinRow === 0 && value > 4)
      throw new SafeImageError("FORMAT_INVALID", "PNG scanline uses an invalid filter");
    window2[output & 32767] = value;
    output += 1;
    withinRow += 1;
    adlerA = (adlerA + value) % 65521;
    adlerB = (adlerB + adlerA) % 65521;
    if (withinRow === rowLengths[row]) {
      row += 1;
      withinRow = 0;
    }
  };
  return {
    expected,
    rowLengths,
    write,
    finish: () => {
      if (output !== expected || row !== rowLengths.length || withinRow !== 0)
        throw new SafeImageError("FORMAT_INVALID", "PNG decompressed data does not match its scanlines");
    },
    adler: () => (adlerB << 16 | adlerA) >>> 0,
    produced: () => output,
    prior: (distance) => {
      if (distance < 1 || distance > Math.min(output, maxDistance))
        throw new SafeImageError("FORMAT_INVALID", "PNG deflate stream uses an invalid distance");
      return window2[output - distance & 32767];
    }
  };
}
function inflateCodes(reader, literalTree, distanceTree, sink) {
  for (; ; ) {
    const symbol = decodeSymbol(reader, literalTree);
    if (symbol < 256) {
      sink.write(symbol);
      continue;
    }
    if (symbol === 256) return;
    if (symbol < 257 || symbol > 285)
      throw new SafeImageError("FORMAT_INVALID", "PNG deflate stream uses an invalid length");
    const lengthIndex = symbol - 257;
    const length = LENGTH_BASE[lengthIndex] + reader.read(LENGTH_EXTRA[lengthIndex]);
    const distanceSymbol = decodeSymbol(reader, distanceTree);
    if (distanceSymbol > 29)
      throw new SafeImageError("FORMAT_INVALID", "PNG deflate stream uses an invalid distance");
    const distance = DISTANCE_BASE[distanceSymbol] + reader.read(DISTANCE_EXTRA[distanceSymbol]);
    for (let copied = 0; copied < length; copied += 1) sink.write(sink.prior(distance));
  }
}
function inflateZlib(compressed, expected, rowLengths) {
  if (compressed.length < 6) throw new SafeImageError("FORMAT_INVALID", "PNG zlib stream is truncated");
  const cmf = compressed[0];
  const flags = compressed[1];
  if ((cmf & 15) !== 8 || cmf >>> 4 > 7 || (cmf << 8 | flags) % 31 !== 0 || (flags & 32) !== 0)
    throw new SafeImageError("FORMAT_INVALID", "PNG zlib header is invalid or unsupported");
  const deflate = compressed.subarray(2, compressed.length - 4);
  const reader = new BitReader(deflate);
  const sink = inflateSink(expected, rowLengths, 1 << (cmf >>> 4) + 8);
  let final = false;
  while (!final) {
    final = reader.read(1) === 1;
    const blockType = reader.read(2);
    if (blockType === 0) {
      reader.align();
      const length = reader.read(16);
      const inverse = reader.read(16);
      if ((length ^ 65535) !== inverse)
        throw new SafeImageError("FORMAT_INVALID", "PNG deflate stored block length is invalid");
      for (let index = 0; index < length; index += 1) sink.write(reader.read(8));
    } else if (blockType === 1) inflateCodes(reader, FIXED_LITERAL_TREE, FIXED_DISTANCE_TREE, sink);
    else if (blockType === 2) {
      const [literalTree, distanceTree] = dynamicTrees(reader);
      inflateCodes(reader, literalTree, distanceTree, sink);
    } else throw new SafeImageError("FORMAT_INVALID", "PNG deflate block type is reserved");
  }
  sink.finish();
  if (Math.ceil(reader.bitOffset / 8) !== deflate.length)
    throw new SafeImageError("FORMAT_INVALID", "PNG zlib stream has trailing compressed data");
  const expectedAdler = u32(compressed, compressed.length - 4);
  if (sink.adler() !== expectedAdler)
    throw new SafeImageError("FORMAT_INVALID", "PNG zlib checksum does not match");
}
var ADAM7 = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2]
];
function pngScanlines(width, height, bitDepth, colorType, interlace) {
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : 4;
  const bitsPerPixel = channels * bitDepth;
  const rows = [];
  const passes = interlace === 0 ? [[0, 0, 1, 1]] : ADAM7;
  for (const [xStart, yStart, xStep, yStep] of passes) {
    const passWidth = width <= xStart ? 0 : Math.ceil((width - xStart) / xStep);
    const passHeight = height <= yStart ? 0 : Math.ceil((height - yStart) / yStep);
    if (passWidth === 0 || passHeight === 0) continue;
    const rowLength = 1 + Math.ceil(passWidth * bitsPerPixel / 8);
    if (!Number.isSafeInteger(rowLength) || !Number.isSafeInteger(rowLength * passHeight))
      throw new SafeImageError("PIXEL_LIMIT", "PNG scanline size is unsafe");
    for (let row = 0; row < passHeight; row += 1) rows.push(rowLength);
  }
  return rows;
}
function rejectCompressedAncillary(type, data) {
  if (type === "acTL" || type === "fcTL" || type === "fdAT")
    throw new SafeImageError("FORMAT_INVALID", "animated PNG chunks are not accepted");
  if (type === "zTXt" || type === "iCCP")
    throw new SafeImageError("FORMAT_INVALID", "PNG compressed ancillary chunks are not accepted");
  if (type !== "iTXt") return;
  const keywordEnd = data.indexOf(0);
  if (keywordEnd < 1 || keywordEnd > 79 || keywordEnd + 2 >= data.length || data[keywordEnd + 1] !== 0 && data[keywordEnd + 1] !== 1 || data[keywordEnd + 2] !== 0)
    throw new SafeImageError("FORMAT_INVALID", "PNG iTXt compression fields are invalid");
  if (data[keywordEnd + 1] === 1)
    throw new SafeImageError("FORMAT_INVALID", "PNG compressed ancillary chunks are not accepted");
}
function pngDimensions(bytes, maxPixels) {
  if (bytes.length < 33 || !PNG_MAGIC.every((value, index) => bytes[index] === value))
    throw new SafeImageError("FORMAT_INVALID", "invalid PNG signature or header");
  let offset = PNG_MAGIC.length;
  let size;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let sawData = false;
  let endedData = false;
  let sawPalette = false;
  const dataChunks = [];
  let compressedLength = 0;
  for (; ; ) {
    if (offset + 12 > bytes.length) throw new SafeImageError("FORMAT_INVALID", "truncated PNG chunk");
    const length = u32(bytes, offset);
    const dataOffset = offset + 8;
    const end = dataOffset + length + 4;
    if (!Number.isSafeInteger(end) || end > bytes.length)
      throw new SafeImageError("FORMAT_INVALID", "truncated PNG chunk data");
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    );
    if (!/^[A-Za-z]{4}$/.test(type) || (bytes[offset + 6] & 32) !== 0)
      throw new SafeImageError("FORMAT_INVALID", "PNG chunk type is invalid");
    if (crc32(bytes, offset + 4, dataOffset + length) !== u32(bytes, dataOffset + length))
      throw new SafeImageError("FORMAT_INVALID", `PNG ${type} CRC does not match`);
    if (!size) {
      if (type !== "IHDR" || length !== 13)
        throw new SafeImageError("FORMAT_INVALID", "PNG must begin with a complete IHDR");
      bitDepth = bytes[dataOffset + 8];
      colorType = bytes[dataOffset + 9];
      interlace = bytes[dataOffset + 12];
      const validDepth = colorType === 0 && [1, 2, 4, 8, 16].includes(bitDepth) || colorType === 2 && [8, 16].includes(bitDepth) || colorType === 3 && [1, 2, 4, 8].includes(bitDepth) || (colorType === 4 || colorType === 6) && [8, 16].includes(bitDepth);
      if (!validDepth || bytes[dataOffset + 10] !== 0 || bytes[dataOffset + 11] !== 0 || interlace > 1)
        throw new SafeImageError(
          "FORMAT_INVALID",
          "PNG IHDR uses unsupported compression, filter, or interlace"
        );
      size = dimensions(u32(bytes, dataOffset), u32(bytes, dataOffset + 4), maxPixels);
    } else if (type === "IHDR")
      throw new SafeImageError("FORMAT_INVALID", "PNG contains multiple IHDR chunks");
    else if (type === "PLTE") {
      if (sawPalette || sawData || colorType === 0 || colorType === 4 || length === 0 || length % 3 !== 0 || length > 768 || colorType === 3 && length / 3 > 2 ** bitDepth)
        throw new SafeImageError("FORMAT_INVALID", "PNG palette is misplaced or invalid");
      sawPalette = true;
    } else if (type === "IDAT") {
      if (endedData) throw new SafeImageError("FORMAT_INVALID", "PNG IDAT chunks must be consecutive");
      sawData = true;
      compressedLength += length;
      dataChunks.push(bytes.subarray(dataOffset, dataOffset + length));
    } else if (sawData && type !== "IEND") endedData = true;
    rejectCompressedAncillary(type, bytes.subarray(dataOffset, dataOffset + length));
    if ((bytes[offset + 4] & 32) === 0 && !["IHDR", "PLTE", "IDAT", "IEND"].includes(type))
      throw new SafeImageError("FORMAT_INVALID", `PNG critical chunk ${type} is unsupported`);
    if (type === "IEND") {
      if (length !== 0 || !sawData || end !== bytes.length || colorType === 3 && !sawPalette)
        throw new SafeImageError("FORMAT_INVALID", "PNG has an invalid or non-terminal IEND");
      const compressed = new Uint8Array(compressedLength);
      let writeOffset = 0;
      for (const chunk of dataChunks) {
        compressed.set(chunk, writeOffset);
        writeOffset += chunk.length;
      }
      const rows = pngScanlines(size.width, size.height, bitDepth, colorType, interlace);
      const expected = rows.reduce((sum, rowLength) => sum + rowLength, 0);
      if (!Number.isSafeInteger(expected))
        throw new SafeImageError("PIXEL_LIMIT", "PNG decompressed scanline size is unsafe");
      inflateZlib(compressed, expected, rows);
      return size;
    }
    offset = end;
  }
}
function isStartOfFrame(marker) {
  return marker >= 192 && marker <= 207 && ![196, 200, 204].includes(marker);
}
function jpegDimensions(bytes, maxPixels) {
  if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216)
    throw new SafeImageError("FORMAT_INVALID", "invalid JPEG signature");
  let offset = 2;
  let size;
  let sawScan = false;
  while (offset < bytes.length) {
    if (bytes[offset] !== 255) throw new SafeImageError("FORMAT_INVALID", "JPEG marker prefix is missing");
    while (offset < bytes.length && bytes[offset] === 255) offset += 1;
    if (offset >= bytes.length) throw new SafeImageError("FORMAT_INVALID", "truncated JPEG marker");
    const marker = bytes[offset++];
    if (marker === 0)
      throw new SafeImageError("FORMAT_INVALID", "unexpected stuffed byte outside JPEG scan");
    if (marker === 217) {
      if (!size || !sawScan) throw new SafeImageError("FORMAT_INVALID", "JPEG ended before image data");
      return size;
    }
    if (marker === 216 || marker === 1 || marker >= 208 && marker <= 215) continue;
    if (offset + 2 > bytes.length) throw new SafeImageError("FORMAT_INVALID", "truncated JPEG segment length");
    const length = u16(bytes, offset);
    if (length < 2 || offset + length > bytes.length)
      throw new SafeImageError("FORMAT_INVALID", "truncated JPEG segment");
    if (isStartOfFrame(marker)) {
      if (length < 8) throw new SafeImageError("FORMAT_INVALID", "JPEG frame header is too short");
      const found = dimensions(u16(bytes, offset + 5), u16(bytes, offset + 3), maxPixels);
      if (size && (size.width !== found.width || size.height !== found.height))
        throw new SafeImageError("FORMAT_INVALID", "JPEG frame dimensions disagree");
      size = found;
    }
    offset += length;
    if (marker !== 218) continue;
    if (!size) throw new SafeImageError("FORMAT_INVALID", "JPEG scan precedes its frame header");
    sawScan = true;
    for (; ; ) {
      if (offset >= bytes.length) throw new SafeImageError("FORMAT_INVALID", "truncated JPEG scan data");
      if (bytes[offset++] !== 255) continue;
      if (offset >= bytes.length) throw new SafeImageError("FORMAT_INVALID", "truncated JPEG scan marker");
      const markerOffset = offset - 1;
      while (offset < bytes.length && bytes[offset] === 255) offset += 1;
      if (offset >= bytes.length) throw new SafeImageError("FORMAT_INVALID", "truncated JPEG scan marker");
      const next = bytes[offset];
      if (next === 0 || next >= 208 && next <= 215) {
        offset += 1;
        continue;
      }
      offset = markerOffset;
      break;
    }
  }
  throw new SafeImageError("FORMAT_INVALID", "JPEG is missing EOI");
}
function detectedMime(bytes) {
  if (PNG_MAGIC.every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216) return "image/jpeg";
  throw new SafeImageError("FORMAT_INVALID", "image magic is neither PNG nor JPEG");
}
function inspectSafeImage(bytes, mimeType, limits) {
  if (mimeType !== "image/png" && mimeType !== "image/jpeg")
    throw new SafeImageError("MIME_MISMATCH", "declared image MIME is unsupported");
  const mime = detectedMime(bytes);
  if (mime !== mimeType)
    throw new SafeImageError("MIME_MISMATCH", "declared image MIME does not match image magic");
  const size = mime === "image/png" ? pngDimensions(bytes, limits.maxPixelsPerImage) : jpegDimensions(bytes, limits.maxPixelsPerImage);
  return Object.freeze({ bytes, mime, ...size });
}
function decodeSafeImageBytes(input, limitsInput) {
  const limits = checkedLimits(limitsInput);
  if (!(input.bytes instanceof Uint8Array) || !typedArrayByteLength)
    throw new SafeImageError("FORMAT_INVALID", "image bytes must be a Uint8Array");
  const byteLength = typedArrayByteLength.call(input.bytes);
  if (byteLength > limits.maxBytesPerImage)
    throw new SafeImageError("BYTE_LIMIT", "decoded image exceeds byte limit");
  const bytes = new Uint8Array(byteLength);
  Uint8Array.prototype.set.call(bytes, input.bytes);
  return inspectSafeImage(bytes, input.mimeType, limits);
}
function decodeSafeImage(input, limitsInput) {
  const limits = checkedLimits(limitsInput);
  const bytes = decodeBase64(input.data, limits.maxBytesPerImage);
  return inspectSafeImage(bytes, input.mimeType, limits);
}
function decodeSafeImages(inputs, limitsInput) {
  const limits = checkedLimits(limitsInput);
  const decoded = [];
  let bytes = 0;
  let pixels = 0;
  for (const input of inputs) {
    const remainingBytes = limits.maxAggregateBytes - bytes;
    const remainingPixels = limits.maxAggregatePixels - pixels;
    if (remainingBytes < 1) throw new SafeImageError("BYTE_LIMIT", "images exceed aggregate byte limit");
    if (remainingPixels < 1) throw new SafeImageError("PIXEL_LIMIT", "images exceed aggregate pixel limit");
    const image = decodeSafeImage(input, {
      ...limits,
      maxBytesPerImage: Math.min(limits.maxBytesPerImage, remainingBytes),
      maxPixelsPerImage: Math.min(limits.maxPixelsPerImage, remainingPixels)
    });
    bytes += image.bytes.length;
    pixels += image.pixels;
    decoded.push(image);
  }
  return Object.freeze(decoded);
}

// ../protocol-validation/src/attachments.ts
var USER_MESSAGE_ATTACHMENT_LIMITS = Object.freeze({
  maxCount: 50,
  maxAggregateBytes: USER_MESSAGE_IMAGE_LIMITS.maxAggregateBytes
});
var AttachmentValidationError = class extends Error {
  code;
  constructor(code, message, options) {
    super(message, options);
    this.name = "AttachmentValidationError";
    this.code = code;
  }
};
function decodeAttachmentSize(data, maxBytes) {
  try {
    return decodeAttachmentData(data, maxBytes).byteLength;
  } catch (error) {
    if (error instanceof SafeImageError)
      throw new AttachmentValidationError(
        error.code === "BYTE_LIMIT" ? "ATTACHMENT_BYTES" : "ATTACHMENT_DATA",
        error.message,
        { cause: error }
      );
    throw error;
  }
}
function validateUserAttachments(content) {
  const attachments = content.filter((block) => block.type === "file" || block.type === "image");
  if (attachments.length > USER_MESSAGE_ATTACHMENT_LIMITS.maxCount)
    throw new AttachmentValidationError(
      "ATTACHMENT_COUNT",
      `A message can hold at most ${USER_MESSAGE_ATTACHMENT_LIMITS.maxCount} attachments.`
    );
  let total = 0;
  for (const block of attachments) {
    if (typeof block.data !== "string")
      throw new AttachmentValidationError("ATTACHMENT_DATA", "Attachment data must be Base64.");
    if (block.type === "file" && (typeof block.name !== "string" || block.name.length === 0 || block.name.length > 256 || [...block.name].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    ) || typeof block.mimeType !== "string" || !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/iu.test(block.mimeType) || block.mimeType.length > 128))
      throw new AttachmentValidationError("ATTACHMENT_NAME", "Attachment name or MIME type is invalid.");
    const remaining = USER_MESSAGE_ATTACHMENT_LIMITS.maxAggregateBytes - total;
    const decodedSize = block.data.length / 4 * 3 - (block.data.endsWith("==") ? 2 : block.data.endsWith("=") ? 1 : 0);
    if (decodedSize > remaining)
      throw new AttachmentValidationError(
        "ATTACHMENT_BYTES",
        "Attachments in one message must total no more than 100 MiB."
      );
    total += decodeAttachmentSize(block.data, Math.max(remaining, 1));
    if (total > USER_MESSAGE_ATTACHMENT_LIMITS.maxAggregateBytes)
      throw new AttachmentValidationError(
        "ATTACHMENT_BYTES",
        "Attachments in one message must total no more than 100 MiB."
      );
  }
}

// ../protocol-validation/src/model-images.ts
function userImagePolicy(model) {
  const limits = model?.inputLimits?.images;
  return {
    supported: model?.input?.includes("image") === true,
    maxCount: Math.min(limits?.maxPerMessage ?? Infinity, limits?.maxPerRequest ?? Infinity),
    maxWidth: Math.min(1456, limits?.resize?.maxWidth ?? Infinity),
    maxHeight: Math.min(1456, limits?.resize?.maxHeight ?? Infinity),
    maxBase64Bytes: limits?.resize?.maxBytes,
    jpegQuality: limits?.resize?.jpegQuality
  };
}
function modelImageInputError(model, messages) {
  const groups = messages.map((message) => message.content.filter((block) => block.type === "image"));
  const count = groups.reduce((sum, images) => sum + images.length, 0);
  if (!count) return void 0;
  if (!model) return "Image input is unavailable until the model capabilities are loaded.";
  if (!model.input?.includes("image")) return "The selected model does not support image input.";
  const limits = model.inputLimits?.images;
  const perMessage = limits?.maxPerMessage;
  if (perMessage !== void 0 && groups.some((images) => images.length > perMessage))
    return `The model accepts at most ${perMessage} images per message.`;
  if (limits?.maxPerRequest !== void 0 && count > limits.maxPerRequest)
    return `The model accepts at most ${limits.maxPerRequest} images per request, including history and tool results.`;
  const resize = limits?.resize;
  for (const images of groups) {
    for (const image of images) {
      if (typeof image.data !== "string" || typeof image.mimeType !== "string") return "Invalid image input.";
      if (resize?.maxBytes !== void 0 && image.data.length > resize.maxBytes)
        return `An image exceeds the model's ${resize.maxBytes}-byte Base64 limit.`;
      if (resize?.maxWidth !== void 0 || resize?.maxHeight !== void 0) {
        try {
          const [decoded] = decodeSafeImages([{ data: image.data, mimeType: image.mimeType }], {
            maxBytesPerImage: image.data.length,
            maxAggregateBytes: image.data.length,
            maxPixelsPerImage: Number.MAX_SAFE_INTEGER,
            maxAggregatePixels: Number.MAX_SAFE_INTEGER
          });
          if (!decoded || decoded.width > (resize.maxWidth ?? Infinity) || decoded.height > (resize.maxHeight ?? Infinity))
            return "An image exceeds the model image dimensions. Resize it before sending.";
        } catch {
          return "The image format or dimensions could not be validated for this model.";
        }
      }
    }
  }
  return void 0;
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/guard/value.mjs
var value_exports = {};
__export(value_exports, {
  HasPropertyKey: () => HasPropertyKey,
  IsArray: () => IsArray,
  IsAsyncIterator: () => IsAsyncIterator,
  IsBigInt: () => IsBigInt,
  IsBoolean: () => IsBoolean,
  IsDate: () => IsDate,
  IsFunction: () => IsFunction,
  IsIterator: () => IsIterator,
  IsNull: () => IsNull,
  IsNumber: () => IsNumber,
  IsObject: () => IsObject,
  IsRegExp: () => IsRegExp,
  IsString: () => IsString,
  IsSymbol: () => IsSymbol,
  IsUint8Array: () => IsUint8Array,
  IsUndefined: () => IsUndefined
});
function HasPropertyKey(value, key) {
  return key in value;
}
function IsAsyncIterator(value) {
  return IsObject(value) && !IsArray(value) && !IsUint8Array(value) && Symbol.asyncIterator in value;
}
function IsArray(value) {
  return Array.isArray(value);
}
function IsBigInt(value) {
  return typeof value === "bigint";
}
function IsBoolean(value) {
  return typeof value === "boolean";
}
function IsDate(value) {
  return value instanceof globalThis.Date;
}
function IsFunction(value) {
  return typeof value === "function";
}
function IsIterator(value) {
  return IsObject(value) && !IsArray(value) && !IsUint8Array(value) && Symbol.iterator in value;
}
function IsNull(value) {
  return value === null;
}
function IsNumber(value) {
  return typeof value === "number";
}
function IsObject(value) {
  return typeof value === "object" && value !== null;
}
function IsRegExp(value) {
  return value instanceof globalThis.RegExp;
}
function IsString(value) {
  return typeof value === "string";
}
function IsSymbol(value) {
  return typeof value === "symbol";
}
function IsUint8Array(value) {
  return value instanceof globalThis.Uint8Array;
}
function IsUndefined(value) {
  return value === void 0;
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/clone/value.mjs
function ArrayType(value) {
  return value.map((value2) => Visit(value2));
}
function DateType(value) {
  return new Date(value.getTime());
}
function Uint8ArrayType(value) {
  return new Uint8Array(value);
}
function RegExpType(value) {
  return new RegExp(value.source, value.flags);
}
function ObjectType(value) {
  const result = {};
  for (const key of Object.getOwnPropertyNames(value)) {
    result[key] = Visit(value[key]);
  }
  for (const key of Object.getOwnPropertySymbols(value)) {
    result[key] = Visit(value[key]);
  }
  return result;
}
function Visit(value) {
  return IsArray(value) ? ArrayType(value) : IsDate(value) ? DateType(value) : IsUint8Array(value) ? Uint8ArrayType(value) : IsRegExp(value) ? RegExpType(value) : IsObject(value) ? ObjectType(value) : value;
}
function Clone(value) {
  return Visit(value);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/clone/type.mjs
function CloneType(schema, options) {
  return options === void 0 ? Clone(schema) : Clone({ ...options, ...schema });
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/guard/guard.mjs
function IsAsyncIterator2(value) {
  return IsObject2(value) && globalThis.Symbol.asyncIterator in value;
}
function IsIterator2(value) {
  return IsObject2(value) && globalThis.Symbol.iterator in value;
}
function IsStandardObject(value) {
  return IsObject2(value) && (globalThis.Object.getPrototypeOf(value) === Object.prototype || globalThis.Object.getPrototypeOf(value) === null);
}
function IsPromise(value) {
  return value instanceof globalThis.Promise;
}
function IsDate2(value) {
  return value instanceof Date && globalThis.Number.isFinite(value.getTime());
}
function IsMap(value) {
  return value instanceof globalThis.Map;
}
function IsSet(value) {
  return value instanceof globalThis.Set;
}
function IsTypedArray(value) {
  return globalThis.ArrayBuffer.isView(value);
}
function IsUint8Array2(value) {
  return value instanceof globalThis.Uint8Array;
}
function HasPropertyKey2(value, key) {
  return key in value;
}
function IsObject2(value) {
  return value !== null && typeof value === "object";
}
function IsArray2(value) {
  return globalThis.Array.isArray(value) && !globalThis.ArrayBuffer.isView(value);
}
function IsUndefined2(value) {
  return value === void 0;
}
function IsNull2(value) {
  return value === null;
}
function IsBoolean2(value) {
  return typeof value === "boolean";
}
function IsNumber2(value) {
  return typeof value === "number";
}
function IsInteger(value) {
  return globalThis.Number.isInteger(value);
}
function IsBigInt2(value) {
  return typeof value === "bigint";
}
function IsString2(value) {
  return typeof value === "string";
}
function IsFunction2(value) {
  return typeof value === "function";
}
function IsSymbol2(value) {
  return typeof value === "symbol";
}
function IsValueType(value) {
  return IsBigInt2(value) || IsBoolean2(value) || IsNull2(value) || IsNumber2(value) || IsString2(value) || IsSymbol2(value) || IsUndefined2(value);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/system/policy.mjs
var TypeSystemPolicy;
(function(TypeSystemPolicy2) {
  TypeSystemPolicy2.InstanceMode = "default";
  TypeSystemPolicy2.ExactOptionalPropertyTypes = false;
  TypeSystemPolicy2.AllowArrayObject = false;
  TypeSystemPolicy2.AllowNaN = false;
  TypeSystemPolicy2.AllowNullVoid = false;
  function IsExactOptionalProperty(value, key) {
    return TypeSystemPolicy2.ExactOptionalPropertyTypes ? key in value : value[key] !== void 0;
  }
  TypeSystemPolicy2.IsExactOptionalProperty = IsExactOptionalProperty;
  function IsObjectLike(value) {
    const isObject = IsObject2(value);
    return TypeSystemPolicy2.AllowArrayObject ? isObject : isObject && !IsArray2(value);
  }
  TypeSystemPolicy2.IsObjectLike = IsObjectLike;
  function IsRecordLike(value) {
    return IsObjectLike(value) && !(value instanceof Date) && !(value instanceof Uint8Array);
  }
  TypeSystemPolicy2.IsRecordLike = IsRecordLike;
  function IsNumberLike(value) {
    return TypeSystemPolicy2.AllowNaN ? IsNumber2(value) : Number.isFinite(value);
  }
  TypeSystemPolicy2.IsNumberLike = IsNumberLike;
  function IsVoidLike(value) {
    const isUndefined = IsUndefined2(value);
    return TypeSystemPolicy2.AllowNullVoid ? isUndefined || value === null : isUndefined;
  }
  TypeSystemPolicy2.IsVoidLike = IsVoidLike;
})(TypeSystemPolicy || (TypeSystemPolicy = {}));

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/create/immutable.mjs
function ImmutableArray(value) {
  return globalThis.Object.freeze(value).map((value2) => Immutable(value2));
}
function ImmutableDate(value) {
  return value;
}
function ImmutableUint8Array(value) {
  return value;
}
function ImmutableRegExp(value) {
  return value;
}
function ImmutableObject(value) {
  const result = {};
  for (const key of Object.getOwnPropertyNames(value)) {
    result[key] = Immutable(value[key]);
  }
  for (const key of Object.getOwnPropertySymbols(value)) {
    result[key] = Immutable(value[key]);
  }
  return globalThis.Object.freeze(result);
}
function Immutable(value) {
  return IsArray(value) ? ImmutableArray(value) : IsDate(value) ? ImmutableDate(value) : IsUint8Array(value) ? ImmutableUint8Array(value) : IsRegExp(value) ? ImmutableRegExp(value) : IsObject(value) ? ImmutableObject(value) : value;
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/create/type.mjs
function CreateType(schema, options) {
  const result = options !== void 0 ? { ...options, ...schema } : schema;
  switch (TypeSystemPolicy.InstanceMode) {
    case "freeze":
      return Immutable(result);
    case "clone":
      return Clone(result);
    default:
      return result;
  }
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/error/error.mjs
var TypeBoxError = class extends Error {
  constructor(message) {
    super(message);
  }
};

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/symbols/symbols.mjs
var TransformKind = /* @__PURE__ */ Symbol.for("TypeBox.Transform");
var ReadonlyKind = /* @__PURE__ */ Symbol.for("TypeBox.Readonly");
var OptionalKind = /* @__PURE__ */ Symbol.for("TypeBox.Optional");
var Hint = /* @__PURE__ */ Symbol.for("TypeBox.Hint");
var Kind = /* @__PURE__ */ Symbol.for("TypeBox.Kind");

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/guard/kind.mjs
function IsReadonly(value) {
  return IsObject(value) && value[ReadonlyKind] === "Readonly";
}
function IsOptional(value) {
  return IsObject(value) && value[OptionalKind] === "Optional";
}
function IsAny(value) {
  return IsKindOf(value, "Any");
}
function IsArgument(value) {
  return IsKindOf(value, "Argument");
}
function IsArray3(value) {
  return IsKindOf(value, "Array");
}
function IsAsyncIterator3(value) {
  return IsKindOf(value, "AsyncIterator");
}
function IsBigInt3(value) {
  return IsKindOf(value, "BigInt");
}
function IsBoolean3(value) {
  return IsKindOf(value, "Boolean");
}
function IsComputed(value) {
  return IsKindOf(value, "Computed");
}
function IsConstructor(value) {
  return IsKindOf(value, "Constructor");
}
function IsDate3(value) {
  return IsKindOf(value, "Date");
}
function IsFunction3(value) {
  return IsKindOf(value, "Function");
}
function IsInteger2(value) {
  return IsKindOf(value, "Integer");
}
function IsIntersect(value) {
  return IsKindOf(value, "Intersect");
}
function IsIterator3(value) {
  return IsKindOf(value, "Iterator");
}
function IsKindOf(value, kind) {
  return IsObject(value) && Kind in value && value[Kind] === kind;
}
function IsLiteralValue(value) {
  return IsBoolean(value) || IsNumber(value) || IsString(value);
}
function IsLiteral(value) {
  return IsKindOf(value, "Literal");
}
function IsMappedKey(value) {
  return IsKindOf(value, "MappedKey");
}
function IsMappedResult(value) {
  return IsKindOf(value, "MappedResult");
}
function IsNever(value) {
  return IsKindOf(value, "Never");
}
function IsNot(value) {
  return IsKindOf(value, "Not");
}
function IsNull3(value) {
  return IsKindOf(value, "Null");
}
function IsNumber3(value) {
  return IsKindOf(value, "Number");
}
function IsObject3(value) {
  return IsKindOf(value, "Object");
}
function IsPromise2(value) {
  return IsKindOf(value, "Promise");
}
function IsRecord(value) {
  return IsKindOf(value, "Record");
}
function IsRef(value) {
  return IsKindOf(value, "Ref");
}
function IsRegExp2(value) {
  return IsKindOf(value, "RegExp");
}
function IsString3(value) {
  return IsKindOf(value, "String");
}
function IsSymbol3(value) {
  return IsKindOf(value, "Symbol");
}
function IsTemplateLiteral(value) {
  return IsKindOf(value, "TemplateLiteral");
}
function IsThis(value) {
  return IsKindOf(value, "This");
}
function IsTransform(value) {
  return IsObject(value) && TransformKind in value;
}
function IsTuple(value) {
  return IsKindOf(value, "Tuple");
}
function IsUndefined3(value) {
  return IsKindOf(value, "Undefined");
}
function IsUnion(value) {
  return IsKindOf(value, "Union");
}
function IsUint8Array3(value) {
  return IsKindOf(value, "Uint8Array");
}
function IsUnknown(value) {
  return IsKindOf(value, "Unknown");
}
function IsUnsafe(value) {
  return IsKindOf(value, "Unsafe");
}
function IsVoid(value) {
  return IsKindOf(value, "Void");
}
function IsKind(value) {
  return IsObject(value) && Kind in value && IsString(value[Kind]);
}
function IsSchema(value) {
  return IsAny(value) || IsArgument(value) || IsArray3(value) || IsBoolean3(value) || IsBigInt3(value) || IsAsyncIterator3(value) || IsComputed(value) || IsConstructor(value) || IsDate3(value) || IsFunction3(value) || IsInteger2(value) || IsIntersect(value) || IsIterator3(value) || IsLiteral(value) || IsMappedKey(value) || IsMappedResult(value) || IsNever(value) || IsNot(value) || IsNull3(value) || IsNumber3(value) || IsObject3(value) || IsPromise2(value) || IsRecord(value) || IsRef(value) || IsRegExp2(value) || IsString3(value) || IsSymbol3(value) || IsTemplateLiteral(value) || IsThis(value) || IsTuple(value) || IsUndefined3(value) || IsUnion(value) || IsUint8Array3(value) || IsUnknown(value) || IsUnsafe(value) || IsVoid(value) || IsKind(value);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/guard/type.mjs
var type_exports = {};
__export(type_exports, {
  IsAny: () => IsAny2,
  IsArgument: () => IsArgument2,
  IsArray: () => IsArray4,
  IsAsyncIterator: () => IsAsyncIterator4,
  IsBigInt: () => IsBigInt4,
  IsBoolean: () => IsBoolean4,
  IsComputed: () => IsComputed2,
  IsConstructor: () => IsConstructor2,
  IsDate: () => IsDate4,
  IsFunction: () => IsFunction4,
  IsImport: () => IsImport,
  IsInteger: () => IsInteger3,
  IsIntersect: () => IsIntersect2,
  IsIterator: () => IsIterator4,
  IsKind: () => IsKind2,
  IsKindOf: () => IsKindOf2,
  IsLiteral: () => IsLiteral2,
  IsLiteralBoolean: () => IsLiteralBoolean,
  IsLiteralNumber: () => IsLiteralNumber,
  IsLiteralString: () => IsLiteralString,
  IsLiteralValue: () => IsLiteralValue2,
  IsMappedKey: () => IsMappedKey2,
  IsMappedResult: () => IsMappedResult2,
  IsNever: () => IsNever2,
  IsNot: () => IsNot2,
  IsNull: () => IsNull4,
  IsNumber: () => IsNumber4,
  IsObject: () => IsObject4,
  IsOptional: () => IsOptional2,
  IsPromise: () => IsPromise3,
  IsProperties: () => IsProperties,
  IsReadonly: () => IsReadonly2,
  IsRecord: () => IsRecord2,
  IsRecursive: () => IsRecursive,
  IsRef: () => IsRef2,
  IsRegExp: () => IsRegExp3,
  IsSchema: () => IsSchema2,
  IsString: () => IsString4,
  IsSymbol: () => IsSymbol4,
  IsTemplateLiteral: () => IsTemplateLiteral2,
  IsThis: () => IsThis2,
  IsTransform: () => IsTransform2,
  IsTuple: () => IsTuple2,
  IsUint8Array: () => IsUint8Array4,
  IsUndefined: () => IsUndefined4,
  IsUnion: () => IsUnion2,
  IsUnionLiteral: () => IsUnionLiteral,
  IsUnknown: () => IsUnknown2,
  IsUnsafe: () => IsUnsafe2,
  IsVoid: () => IsVoid2,
  TypeGuardUnknownTypeError: () => TypeGuardUnknownTypeError
});
var TypeGuardUnknownTypeError = class extends TypeBoxError {
};
var KnownTypes = [
  "Argument",
  "Any",
  "Array",
  "AsyncIterator",
  "BigInt",
  "Boolean",
  "Computed",
  "Constructor",
  "Date",
  "Enum",
  "Function",
  "Integer",
  "Intersect",
  "Iterator",
  "Literal",
  "MappedKey",
  "MappedResult",
  "Not",
  "Null",
  "Number",
  "Object",
  "Promise",
  "Record",
  "Ref",
  "RegExp",
  "String",
  "Symbol",
  "TemplateLiteral",
  "This",
  "Tuple",
  "Undefined",
  "Union",
  "Uint8Array",
  "Unknown",
  "Void"
];
function IsPattern(value) {
  try {
    new RegExp(value);
    return true;
  } catch {
    return false;
  }
}
function IsControlCharacterFree(value) {
  if (!IsString(value))
    return false;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 7 && code <= 13 || code === 27 || code === 127) {
      return false;
    }
  }
  return true;
}
function IsAdditionalProperties(value) {
  return IsOptionalBoolean(value) || IsSchema2(value);
}
function IsOptionalBigInt(value) {
  return IsUndefined(value) || IsBigInt(value);
}
function IsOptionalNumber(value) {
  return IsUndefined(value) || IsNumber(value);
}
function IsOptionalBoolean(value) {
  return IsUndefined(value) || IsBoolean(value);
}
function IsOptionalString(value) {
  return IsUndefined(value) || IsString(value);
}
function IsOptionalPattern(value) {
  return IsUndefined(value) || IsString(value) && IsControlCharacterFree(value) && IsPattern(value);
}
function IsOptionalFormat(value) {
  return IsUndefined(value) || IsString(value) && IsControlCharacterFree(value);
}
function IsOptionalSchema(value) {
  return IsUndefined(value) || IsSchema2(value);
}
function IsReadonly2(value) {
  return IsObject(value) && value[ReadonlyKind] === "Readonly";
}
function IsOptional2(value) {
  return IsObject(value) && value[OptionalKind] === "Optional";
}
function IsAny2(value) {
  return IsKindOf2(value, "Any") && IsOptionalString(value.$id);
}
function IsArgument2(value) {
  return IsKindOf2(value, "Argument") && IsNumber(value.index);
}
function IsArray4(value) {
  return IsKindOf2(value, "Array") && value.type === "array" && IsOptionalString(value.$id) && IsSchema2(value.items) && IsOptionalNumber(value.minItems) && IsOptionalNumber(value.maxItems) && IsOptionalBoolean(value.uniqueItems) && IsOptionalSchema(value.contains) && IsOptionalNumber(value.minContains) && IsOptionalNumber(value.maxContains);
}
function IsAsyncIterator4(value) {
  return IsKindOf2(value, "AsyncIterator") && value.type === "AsyncIterator" && IsOptionalString(value.$id) && IsSchema2(value.items);
}
function IsBigInt4(value) {
  return IsKindOf2(value, "BigInt") && value.type === "bigint" && IsOptionalString(value.$id) && IsOptionalBigInt(value.exclusiveMaximum) && IsOptionalBigInt(value.exclusiveMinimum) && IsOptionalBigInt(value.maximum) && IsOptionalBigInt(value.minimum) && IsOptionalBigInt(value.multipleOf);
}
function IsBoolean4(value) {
  return IsKindOf2(value, "Boolean") && value.type === "boolean" && IsOptionalString(value.$id);
}
function IsComputed2(value) {
  return IsKindOf2(value, "Computed") && IsString(value.target) && IsArray(value.parameters) && value.parameters.every((schema) => IsSchema2(schema));
}
function IsConstructor2(value) {
  return IsKindOf2(value, "Constructor") && value.type === "Constructor" && IsOptionalString(value.$id) && IsArray(value.parameters) && value.parameters.every((schema) => IsSchema2(schema)) && IsSchema2(value.returns);
}
function IsDate4(value) {
  return IsKindOf2(value, "Date") && value.type === "Date" && IsOptionalString(value.$id) && IsOptionalNumber(value.exclusiveMaximumTimestamp) && IsOptionalNumber(value.exclusiveMinimumTimestamp) && IsOptionalNumber(value.maximumTimestamp) && IsOptionalNumber(value.minimumTimestamp) && IsOptionalNumber(value.multipleOfTimestamp);
}
function IsFunction4(value) {
  return IsKindOf2(value, "Function") && value.type === "Function" && IsOptionalString(value.$id) && IsArray(value.parameters) && value.parameters.every((schema) => IsSchema2(schema)) && IsSchema2(value.returns);
}
function IsImport(value) {
  return IsKindOf2(value, "Import") && HasPropertyKey(value, "$defs") && IsObject(value.$defs) && IsProperties(value.$defs) && HasPropertyKey(value, "$ref") && IsString(value.$ref) && value.$ref in value.$defs;
}
function IsInteger3(value) {
  return IsKindOf2(value, "Integer") && value.type === "integer" && IsOptionalString(value.$id) && IsOptionalNumber(value.exclusiveMaximum) && IsOptionalNumber(value.exclusiveMinimum) && IsOptionalNumber(value.maximum) && IsOptionalNumber(value.minimum) && IsOptionalNumber(value.multipleOf);
}
function IsProperties(value) {
  return IsObject(value) && Object.entries(value).every(([key, schema]) => IsControlCharacterFree(key) && IsSchema2(schema));
}
function IsIntersect2(value) {
  return IsKindOf2(value, "Intersect") && (IsString(value.type) && value.type !== "object" ? false : true) && IsArray(value.allOf) && value.allOf.every((schema) => IsSchema2(schema) && !IsTransform2(schema)) && IsOptionalString(value.type) && (IsOptionalBoolean(value.unevaluatedProperties) || IsOptionalSchema(value.unevaluatedProperties)) && IsOptionalString(value.$id);
}
function IsIterator4(value) {
  return IsKindOf2(value, "Iterator") && value.type === "Iterator" && IsOptionalString(value.$id) && IsSchema2(value.items);
}
function IsKindOf2(value, kind) {
  return IsObject(value) && Kind in value && value[Kind] === kind;
}
function IsLiteralString(value) {
  return IsLiteral2(value) && IsString(value.const);
}
function IsLiteralNumber(value) {
  return IsLiteral2(value) && IsNumber(value.const);
}
function IsLiteralBoolean(value) {
  return IsLiteral2(value) && IsBoolean(value.const);
}
function IsLiteral2(value) {
  return IsKindOf2(value, "Literal") && IsOptionalString(value.$id) && IsLiteralValue2(value.const);
}
function IsLiteralValue2(value) {
  return IsBoolean(value) || IsNumber(value) || IsString(value);
}
function IsMappedKey2(value) {
  return IsKindOf2(value, "MappedKey") && IsArray(value.keys) && value.keys.every((key) => IsNumber(key) || IsString(key));
}
function IsMappedResult2(value) {
  return IsKindOf2(value, "MappedResult") && IsProperties(value.properties);
}
function IsNever2(value) {
  return IsKindOf2(value, "Never") && IsObject(value.not) && Object.getOwnPropertyNames(value.not).length === 0;
}
function IsNot2(value) {
  return IsKindOf2(value, "Not") && IsSchema2(value.not);
}
function IsNull4(value) {
  return IsKindOf2(value, "Null") && value.type === "null" && IsOptionalString(value.$id);
}
function IsNumber4(value) {
  return IsKindOf2(value, "Number") && value.type === "number" && IsOptionalString(value.$id) && IsOptionalNumber(value.exclusiveMaximum) && IsOptionalNumber(value.exclusiveMinimum) && IsOptionalNumber(value.maximum) && IsOptionalNumber(value.minimum) && IsOptionalNumber(value.multipleOf);
}
function IsObject4(value) {
  return IsKindOf2(value, "Object") && value.type === "object" && IsOptionalString(value.$id) && IsProperties(value.properties) && IsAdditionalProperties(value.additionalProperties) && IsOptionalNumber(value.minProperties) && IsOptionalNumber(value.maxProperties);
}
function IsPromise3(value) {
  return IsKindOf2(value, "Promise") && value.type === "Promise" && IsOptionalString(value.$id) && IsSchema2(value.item);
}
function IsRecord2(value) {
  return IsKindOf2(value, "Record") && value.type === "object" && IsOptionalString(value.$id) && IsAdditionalProperties(value.additionalProperties) && IsObject(value.patternProperties) && ((schema) => {
    const keys = Object.getOwnPropertyNames(schema.patternProperties);
    return keys.length === 1 && IsPattern(keys[0]) && IsObject(schema.patternProperties) && IsSchema2(schema.patternProperties[keys[0]]);
  })(value);
}
function IsRecursive(value) {
  return IsObject(value) && Hint in value && value[Hint] === "Recursive";
}
function IsRef2(value) {
  return IsKindOf2(value, "Ref") && IsOptionalString(value.$id) && IsString(value.$ref);
}
function IsRegExp3(value) {
  return IsKindOf2(value, "RegExp") && IsOptionalString(value.$id) && IsString(value.source) && IsString(value.flags) && IsOptionalNumber(value.maxLength) && IsOptionalNumber(value.minLength);
}
function IsString4(value) {
  return IsKindOf2(value, "String") && value.type === "string" && IsOptionalString(value.$id) && IsOptionalNumber(value.minLength) && IsOptionalNumber(value.maxLength) && IsOptionalPattern(value.pattern) && IsOptionalFormat(value.format);
}
function IsSymbol4(value) {
  return IsKindOf2(value, "Symbol") && value.type === "symbol" && IsOptionalString(value.$id);
}
function IsTemplateLiteral2(value) {
  return IsKindOf2(value, "TemplateLiteral") && value.type === "string" && IsString(value.pattern) && value.pattern[0] === "^" && value.pattern[value.pattern.length - 1] === "$";
}
function IsThis2(value) {
  return IsKindOf2(value, "This") && IsOptionalString(value.$id) && IsString(value.$ref);
}
function IsTransform2(value) {
  return IsObject(value) && TransformKind in value;
}
function IsTuple2(value) {
  return IsKindOf2(value, "Tuple") && value.type === "array" && IsOptionalString(value.$id) && IsNumber(value.minItems) && IsNumber(value.maxItems) && value.minItems === value.maxItems && // empty
  (IsUndefined(value.items) && IsUndefined(value.additionalItems) && value.minItems === 0 || IsArray(value.items) && value.items.every((schema) => IsSchema2(schema)));
}
function IsUndefined4(value) {
  return IsKindOf2(value, "Undefined") && value.type === "undefined" && IsOptionalString(value.$id);
}
function IsUnionLiteral(value) {
  return IsUnion2(value) && value.anyOf.every((schema) => IsLiteralString(schema) || IsLiteralNumber(schema));
}
function IsUnion2(value) {
  return IsKindOf2(value, "Union") && IsOptionalString(value.$id) && IsObject(value) && IsArray(value.anyOf) && value.anyOf.every((schema) => IsSchema2(schema));
}
function IsUint8Array4(value) {
  return IsKindOf2(value, "Uint8Array") && value.type === "Uint8Array" && IsOptionalString(value.$id) && IsOptionalNumber(value.minByteLength) && IsOptionalNumber(value.maxByteLength);
}
function IsUnknown2(value) {
  return IsKindOf2(value, "Unknown") && IsOptionalString(value.$id);
}
function IsUnsafe2(value) {
  return IsKindOf2(value, "Unsafe");
}
function IsVoid2(value) {
  return IsKindOf2(value, "Void") && value.type === "void" && IsOptionalString(value.$id);
}
function IsKind2(value) {
  return IsObject(value) && Kind in value && IsString(value[Kind]) && !KnownTypes.includes(value[Kind]);
}
function IsSchema2(value) {
  return IsObject(value) && (IsAny2(value) || IsArgument2(value) || IsArray4(value) || IsBoolean4(value) || IsBigInt4(value) || IsAsyncIterator4(value) || IsComputed2(value) || IsConstructor2(value) || IsDate4(value) || IsFunction4(value) || IsInteger3(value) || IsIntersect2(value) || IsIterator4(value) || IsLiteral2(value) || IsMappedKey2(value) || IsMappedResult2(value) || IsNever2(value) || IsNot2(value) || IsNull4(value) || IsNumber4(value) || IsObject4(value) || IsPromise3(value) || IsRecord2(value) || IsRef2(value) || IsRegExp3(value) || IsString4(value) || IsSymbol4(value) || IsTemplateLiteral2(value) || IsThis2(value) || IsTuple2(value) || IsUndefined4(value) || IsUnion2(value) || IsUint8Array4(value) || IsUnknown2(value) || IsUnsafe2(value) || IsVoid2(value) || IsKind2(value));
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/patterns/patterns.mjs
var PatternBoolean = "(true|false)";
var PatternNumber = "(0|[1-9][0-9]*)";
var PatternString = "(.*)";
var PatternNever = "(?!.*)";
var PatternBooleanExact = `^${PatternBoolean}$`;
var PatternNumberExact = `^${PatternNumber}$`;
var PatternStringExact = `^${PatternString}$`;
var PatternNeverExact = `^${PatternNever}$`;

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/registry/format.mjs
var format_exports = {};
__export(format_exports, {
  Clear: () => Clear,
  Delete: () => Delete,
  Entries: () => Entries,
  Get: () => Get,
  Has: () => Has,
  Set: () => Set2
});
var map = /* @__PURE__ */ new Map();
function Entries() {
  return new Map(map);
}
function Clear() {
  return map.clear();
}
function Delete(format) {
  return map.delete(format);
}
function Has(format) {
  return map.has(format);
}
function Set2(format, func) {
  map.set(format, func);
}
function Get(format) {
  return map.get(format);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/registry/type.mjs
var type_exports2 = {};
__export(type_exports2, {
  Clear: () => Clear2,
  Delete: () => Delete2,
  Entries: () => Entries2,
  Get: () => Get2,
  Has: () => Has2,
  Set: () => Set3
});
var map2 = /* @__PURE__ */ new Map();
function Entries2() {
  return new Map(map2);
}
function Clear2() {
  return map2.clear();
}
function Delete2(kind) {
  return map2.delete(kind);
}
function Has2(kind) {
  return map2.has(kind);
}
function Set3(kind, func) {
  map2.set(kind, func);
}
function Get2(kind) {
  return map2.get(kind);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/sets/set.mjs
function SetIncludes(T, S) {
  return T.includes(S);
}
function SetDistinct(T) {
  return [...new Set(T)];
}
function SetIntersect(T, S) {
  return T.filter((L) => S.includes(L));
}
function SetIntersectManyResolve(T, Init) {
  return T.reduce((Acc, L) => {
    return SetIntersect(Acc, L);
  }, Init);
}
function SetIntersectMany(T) {
  return T.length === 1 ? T[0] : T.length > 1 ? SetIntersectManyResolve(T.slice(1), T[0]) : [];
}
function SetUnionMany(T) {
  const Acc = [];
  for (const L of T)
    Acc.push(...L);
  return Acc;
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/any/any.mjs
function Any(options) {
  return CreateType({ [Kind]: "Any" }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/array/array.mjs
function Array2(items, options) {
  return CreateType({ [Kind]: "Array", type: "array", items }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/argument/argument.mjs
function Argument(index) {
  return CreateType({ [Kind]: "Argument", index });
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/async-iterator/async-iterator.mjs
function AsyncIterator(items, options) {
  return CreateType({ [Kind]: "AsyncIterator", type: "AsyncIterator", items }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/computed/computed.mjs
function Computed(target, parameters, options) {
  return CreateType({ [Kind]: "Computed", target, parameters }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/discard/discard.mjs
function DiscardKey(value, key) {
  const { [key]: _, ...rest } = value;
  return rest;
}
function Discard(value, keys) {
  return keys.reduce((acc, key) => DiscardKey(acc, key), value);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/never/never.mjs
function Never(options) {
  return CreateType({ [Kind]: "Never", not: {} }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/mapped/mapped-result.mjs
function MappedResult(properties) {
  return CreateType({
    [Kind]: "MappedResult",
    properties
  });
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/constructor/constructor.mjs
function Constructor(parameters, returns, options) {
  return CreateType({ [Kind]: "Constructor", type: "Constructor", parameters, returns }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/function/function.mjs
function Function(parameters, returns, options) {
  return CreateType({ [Kind]: "Function", type: "Function", parameters, returns }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/union/union-create.mjs
function UnionCreate(T, options) {
  return CreateType({ [Kind]: "Union", anyOf: T }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/union/union-evaluated.mjs
function IsUnionOptional(types) {
  return types.some((type) => IsOptional(type));
}
function RemoveOptionalFromRest(types) {
  return types.map((left) => IsOptional(left) ? RemoveOptionalFromType(left) : left);
}
function RemoveOptionalFromType(T) {
  return Discard(T, [OptionalKind]);
}
function ResolveUnion(types, options) {
  const isOptional = IsUnionOptional(types);
  return isOptional ? Optional(UnionCreate(RemoveOptionalFromRest(types), options)) : UnionCreate(RemoveOptionalFromRest(types), options);
}
function UnionEvaluated(T, options) {
  return T.length === 1 ? CreateType(T[0], options) : T.length === 0 ? Never(options) : ResolveUnion(T, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/union/union.mjs
function Union(types, options) {
  return types.length === 0 ? Never(options) : types.length === 1 ? CreateType(types[0], options) : UnionCreate(types, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/template-literal/parse.mjs
var TemplateLiteralParserError = class extends TypeBoxError {
};
function Unescape(pattern) {
  return pattern.replace(/\\\$/g, "$").replace(/\\\*/g, "*").replace(/\\\^/g, "^").replace(/\\\|/g, "|").replace(/\\\(/g, "(").replace(/\\\)/g, ")");
}
function IsNonEscaped(pattern, index, char) {
  return pattern[index] === char && pattern.charCodeAt(index - 1) !== 92;
}
function IsOpenParen(pattern, index) {
  return IsNonEscaped(pattern, index, "(");
}
function IsCloseParen(pattern, index) {
  return IsNonEscaped(pattern, index, ")");
}
function IsSeparator(pattern, index) {
  return IsNonEscaped(pattern, index, "|");
}
function IsGroup(pattern) {
  if (!(IsOpenParen(pattern, 0) && IsCloseParen(pattern, pattern.length - 1)))
    return false;
  let count = 0;
  for (let index = 0; index < pattern.length; index++) {
    if (IsOpenParen(pattern, index))
      count += 1;
    if (IsCloseParen(pattern, index))
      count -= 1;
    if (count === 0 && index !== pattern.length - 1)
      return false;
  }
  return true;
}
function InGroup(pattern) {
  return pattern.slice(1, pattern.length - 1);
}
function IsPrecedenceOr(pattern) {
  let count = 0;
  for (let index = 0; index < pattern.length; index++) {
    if (IsOpenParen(pattern, index))
      count += 1;
    if (IsCloseParen(pattern, index))
      count -= 1;
    if (IsSeparator(pattern, index) && count === 0)
      return true;
  }
  return false;
}
function IsPrecedenceAnd(pattern) {
  for (let index = 0; index < pattern.length; index++) {
    if (IsOpenParen(pattern, index))
      return true;
  }
  return false;
}
function Or(pattern) {
  let [count, start] = [0, 0];
  const expressions = [];
  for (let index = 0; index < pattern.length; index++) {
    if (IsOpenParen(pattern, index))
      count += 1;
    if (IsCloseParen(pattern, index))
      count -= 1;
    if (IsSeparator(pattern, index) && count === 0) {
      const range2 = pattern.slice(start, index);
      if (range2.length > 0)
        expressions.push(TemplateLiteralParse(range2));
      start = index + 1;
    }
  }
  const range = pattern.slice(start);
  if (range.length > 0)
    expressions.push(TemplateLiteralParse(range));
  if (expressions.length === 0)
    return { type: "const", const: "" };
  if (expressions.length === 1)
    return expressions[0];
  return { type: "or", expr: expressions };
}
function And(pattern) {
  function Group(value, index) {
    if (!IsOpenParen(value, index))
      throw new TemplateLiteralParserError(`TemplateLiteralParser: Index must point to open parens`);
    let count = 0;
    for (let scan = index; scan < value.length; scan++) {
      if (IsOpenParen(value, scan))
        count += 1;
      if (IsCloseParen(value, scan))
        count -= 1;
      if (count === 0)
        return [index, scan];
    }
    throw new TemplateLiteralParserError(`TemplateLiteralParser: Unclosed group parens in expression`);
  }
  function Range(pattern2, index) {
    for (let scan = index; scan < pattern2.length; scan++) {
      if (IsOpenParen(pattern2, scan))
        return [index, scan];
    }
    return [index, pattern2.length];
  }
  const expressions = [];
  for (let index = 0; index < pattern.length; index++) {
    if (IsOpenParen(pattern, index)) {
      const [start, end] = Group(pattern, index);
      const range = pattern.slice(start, end + 1);
      expressions.push(TemplateLiteralParse(range));
      index = end;
    } else {
      const [start, end] = Range(pattern, index);
      const range = pattern.slice(start, end);
      if (range.length > 0)
        expressions.push(TemplateLiteralParse(range));
      index = end - 1;
    }
  }
  return expressions.length === 0 ? { type: "const", const: "" } : expressions.length === 1 ? expressions[0] : { type: "and", expr: expressions };
}
function TemplateLiteralParse(pattern) {
  return IsGroup(pattern) ? TemplateLiteralParse(InGroup(pattern)) : IsPrecedenceOr(pattern) ? Or(pattern) : IsPrecedenceAnd(pattern) ? And(pattern) : { type: "const", const: Unescape(pattern) };
}
function TemplateLiteralParseExact(pattern) {
  return TemplateLiteralParse(pattern.slice(1, pattern.length - 1));
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/template-literal/finite.mjs
var TemplateLiteralFiniteError = class extends TypeBoxError {
};
function IsNumberExpression(expression) {
  return expression.type === "or" && expression.expr.length === 2 && expression.expr[0].type === "const" && expression.expr[0].const === "0" && expression.expr[1].type === "const" && expression.expr[1].const === "[1-9][0-9]*";
}
function IsBooleanExpression(expression) {
  return expression.type === "or" && expression.expr.length === 2 && expression.expr[0].type === "const" && expression.expr[0].const === "true" && expression.expr[1].type === "const" && expression.expr[1].const === "false";
}
function IsStringExpression(expression) {
  return expression.type === "const" && expression.const === ".*";
}
function IsTemplateLiteralExpressionFinite(expression) {
  return IsNumberExpression(expression) || IsStringExpression(expression) ? false : IsBooleanExpression(expression) ? true : expression.type === "and" ? expression.expr.every((expr) => IsTemplateLiteralExpressionFinite(expr)) : expression.type === "or" ? expression.expr.every((expr) => IsTemplateLiteralExpressionFinite(expr)) : expression.type === "const" ? true : (() => {
    throw new TemplateLiteralFiniteError(`Unknown expression type`);
  })();
}
function IsTemplateLiteralFinite(schema) {
  const expression = TemplateLiteralParseExact(schema.pattern);
  return IsTemplateLiteralExpressionFinite(expression);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/template-literal/generate.mjs
var TemplateLiteralGenerateError = class extends TypeBoxError {
};
function* GenerateReduce(buffer) {
  if (buffer.length === 1)
    return yield* buffer[0];
  for (const left of buffer[0]) {
    for (const right of GenerateReduce(buffer.slice(1))) {
      yield `${left}${right}`;
    }
  }
}
function* GenerateAnd(expression) {
  return yield* GenerateReduce(expression.expr.map((expr) => [...TemplateLiteralExpressionGenerate(expr)]));
}
function* GenerateOr(expression) {
  for (const expr of expression.expr)
    yield* TemplateLiteralExpressionGenerate(expr);
}
function* GenerateConst(expression) {
  return yield expression.const;
}
function* TemplateLiteralExpressionGenerate(expression) {
  return expression.type === "and" ? yield* GenerateAnd(expression) : expression.type === "or" ? yield* GenerateOr(expression) : expression.type === "const" ? yield* GenerateConst(expression) : (() => {
    throw new TemplateLiteralGenerateError("Unknown expression");
  })();
}
function TemplateLiteralGenerate(schema) {
  const expression = TemplateLiteralParseExact(schema.pattern);
  return IsTemplateLiteralExpressionFinite(expression) ? [...TemplateLiteralExpressionGenerate(expression)] : [];
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/literal/literal.mjs
function Literal(value, options) {
  return CreateType({
    [Kind]: "Literal",
    const: value,
    type: typeof value
  }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/boolean/boolean.mjs
function Boolean2(options) {
  return CreateType({ [Kind]: "Boolean", type: "boolean" }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/bigint/bigint.mjs
function BigInt2(options) {
  return CreateType({ [Kind]: "BigInt", type: "bigint" }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/number/number.mjs
function Number2(options) {
  return CreateType({ [Kind]: "Number", type: "number" }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/string/string.mjs
function String2(options) {
  return CreateType({ [Kind]: "String", type: "string" }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/template-literal/syntax.mjs
function* FromUnion(syntax) {
  const trim = syntax.trim().replace(/"|'/g, "");
  return trim === "boolean" ? yield Boolean2() : trim === "number" ? yield Number2() : trim === "bigint" ? yield BigInt2() : trim === "string" ? yield String2() : yield (() => {
    const literals = trim.split("|").map((literal) => Literal(literal.trim()));
    return literals.length === 0 ? Never() : literals.length === 1 ? literals[0] : UnionEvaluated(literals);
  })();
}
function* FromTerminal(syntax) {
  if (syntax[1] !== "{") {
    const L = Literal("$");
    const R = FromSyntax(syntax.slice(1));
    return yield* [L, ...R];
  }
  for (let i = 2; i < syntax.length; i++) {
    if (syntax[i] === "}") {
      const L = FromUnion(syntax.slice(2, i));
      const R = FromSyntax(syntax.slice(i + 1));
      return yield* [...L, ...R];
    }
  }
  yield Literal(syntax);
}
function* FromSyntax(syntax) {
  for (let i = 0; i < syntax.length; i++) {
    if (syntax[i] === "$") {
      const L = Literal(syntax.slice(0, i));
      const R = FromTerminal(syntax.slice(i));
      return yield* [L, ...R];
    }
  }
  yield Literal(syntax);
}
function TemplateLiteralSyntax(syntax) {
  return [...FromSyntax(syntax)];
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/template-literal/pattern.mjs
var TemplateLiteralPatternError = class extends TypeBoxError {
};
function Escape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function Visit2(schema, acc) {
  return IsTemplateLiteral(schema) ? schema.pattern.slice(1, schema.pattern.length - 1) : IsUnion(schema) ? `(${schema.anyOf.map((schema2) => Visit2(schema2, acc)).join("|")})` : IsNumber3(schema) ? `${acc}${PatternNumber}` : IsInteger2(schema) ? `${acc}${PatternNumber}` : IsBigInt3(schema) ? `${acc}${PatternNumber}` : IsString3(schema) ? `${acc}${PatternString}` : IsLiteral(schema) ? `${acc}${Escape(schema.const.toString())}` : IsBoolean3(schema) ? `${acc}${PatternBoolean}` : (() => {
    throw new TemplateLiteralPatternError(`Unexpected Kind '${schema[Kind]}'`);
  })();
}
function TemplateLiteralPattern(kinds) {
  return `^${kinds.map((schema) => Visit2(schema, "")).join("")}$`;
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/template-literal/union.mjs
function TemplateLiteralToUnion(schema) {
  const R = TemplateLiteralGenerate(schema);
  const L = R.map((S) => Literal(S));
  return UnionEvaluated(L);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/template-literal/template-literal.mjs
function TemplateLiteral(unresolved, options) {
  const pattern = IsString(unresolved) ? TemplateLiteralPattern(TemplateLiteralSyntax(unresolved)) : TemplateLiteralPattern(unresolved);
  return CreateType({ [Kind]: "TemplateLiteral", type: "string", pattern }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/indexed/indexed-property-keys.mjs
function FromTemplateLiteral(templateLiteral) {
  const keys = TemplateLiteralGenerate(templateLiteral);
  return keys.map((key) => key.toString());
}
function FromUnion2(types) {
  const result = [];
  for (const type of types)
    result.push(...IndexPropertyKeys(type));
  return result;
}
function FromLiteral(literalValue) {
  return [literalValue.toString()];
}
function IndexPropertyKeys(type) {
  return [...new Set(IsTemplateLiteral(type) ? FromTemplateLiteral(type) : IsUnion(type) ? FromUnion2(type.anyOf) : IsLiteral(type) ? FromLiteral(type.const) : IsNumber3(type) ? ["[number]"] : IsInteger2(type) ? ["[number]"] : [])];
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/indexed/indexed-from-mapped-result.mjs
function FromProperties(type, properties, options) {
  const result = {};
  for (const K2 of Object.getOwnPropertyNames(properties)) {
    result[K2] = Index(type, IndexPropertyKeys(properties[K2]), options);
  }
  return result;
}
function FromMappedResult(type, mappedResult, options) {
  return FromProperties(type, mappedResult.properties, options);
}
function IndexFromMappedResult(type, mappedResult, options) {
  const properties = FromMappedResult(type, mappedResult, options);
  return MappedResult(properties);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/indexed/indexed.mjs
function FromRest(types, key) {
  return types.map((type) => IndexFromPropertyKey(type, key));
}
function FromIntersectRest(types) {
  return types.filter((type) => !IsNever(type));
}
function FromIntersect(types, key) {
  return IntersectEvaluated(FromIntersectRest(FromRest(types, key)));
}
function FromUnionRest(types) {
  return types.some((L) => IsNever(L)) ? [] : types;
}
function FromUnion3(types, key) {
  return UnionEvaluated(FromUnionRest(FromRest(types, key)));
}
function FromTuple(types, key) {
  return key in types ? types[key] : key === "[number]" ? UnionEvaluated(types) : Never();
}
function FromArray(type, key) {
  return key === "[number]" ? type : Never();
}
function FromProperty(properties, propertyKey) {
  return propertyKey in properties ? properties[propertyKey] : Never();
}
function IndexFromPropertyKey(type, propertyKey) {
  return IsIntersect(type) ? FromIntersect(type.allOf, propertyKey) : IsUnion(type) ? FromUnion3(type.anyOf, propertyKey) : IsTuple(type) ? FromTuple(type.items ?? [], propertyKey) : IsArray3(type) ? FromArray(type.items, propertyKey) : IsObject3(type) ? FromProperty(type.properties, propertyKey) : Never();
}
function IndexFromPropertyKeys(type, propertyKeys) {
  return propertyKeys.map((propertyKey) => IndexFromPropertyKey(type, propertyKey));
}
function FromSchema(type, propertyKeys) {
  return UnionEvaluated(IndexFromPropertyKeys(type, propertyKeys));
}
function Index(type, key, options) {
  if (IsRef(type) || IsRef(key)) {
    const error = `Index types using Ref parameters require both Type and Key to be of TSchema`;
    if (!IsSchema(type) || !IsSchema(key))
      throw new TypeBoxError(error);
    return Computed("Index", [type, key]);
  }
  if (IsMappedResult(key))
    return IndexFromMappedResult(type, key, options);
  if (IsMappedKey(key))
    return IndexFromMappedKey(type, key, options);
  return CreateType(IsSchema(key) ? FromSchema(type, IndexPropertyKeys(key)) : FromSchema(type, key), options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/indexed/indexed-from-mapped-key.mjs
function MappedIndexPropertyKey(type, key, options) {
  return { [key]: Index(type, [key], Clone(options)) };
}
function MappedIndexPropertyKeys(type, propertyKeys, options) {
  return propertyKeys.reduce((result, left) => {
    return { ...result, ...MappedIndexPropertyKey(type, left, options) };
  }, {});
}
function MappedIndexProperties(type, mappedKey, options) {
  return MappedIndexPropertyKeys(type, mappedKey.keys, options);
}
function IndexFromMappedKey(type, mappedKey, options) {
  const properties = MappedIndexProperties(type, mappedKey, options);
  return MappedResult(properties);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/iterator/iterator.mjs
function Iterator(items, options) {
  return CreateType({ [Kind]: "Iterator", type: "Iterator", items }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/object/object.mjs
function RequiredKeys(properties) {
  const keys = [];
  for (let key in properties) {
    if (!IsOptional(properties[key]))
      keys.push(key);
  }
  return keys;
}
function _Object(properties, options) {
  const required = RequiredKeys(properties);
  const schematic = required.length > 0 ? { [Kind]: "Object", type: "object", properties, required } : { [Kind]: "Object", type: "object", properties };
  return CreateType(schematic, options);
}
var Object2 = _Object;

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/promise/promise.mjs
function Promise2(item, options) {
  return CreateType({ [Kind]: "Promise", type: "Promise", item }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/readonly/readonly.mjs
function RemoveReadonly(schema) {
  return CreateType(Discard(schema, [ReadonlyKind]));
}
function AddReadonly(schema) {
  return CreateType({ ...schema, [ReadonlyKind]: "Readonly" });
}
function ReadonlyWithFlag(schema, F) {
  return F === false ? RemoveReadonly(schema) : AddReadonly(schema);
}
function Readonly(schema, enable) {
  const F = enable ?? true;
  return IsMappedResult(schema) ? ReadonlyFromMappedResult(schema, F) : ReadonlyWithFlag(schema, F);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/readonly/readonly-from-mapped-result.mjs
function FromProperties2(K, F) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(K))
    Acc[K2] = Readonly(K[K2], F);
  return Acc;
}
function FromMappedResult2(R, F) {
  return FromProperties2(R.properties, F);
}
function ReadonlyFromMappedResult(R, F) {
  const P = FromMappedResult2(R, F);
  return MappedResult(P);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/tuple/tuple.mjs
function Tuple(types, options) {
  return CreateType(types.length > 0 ? { [Kind]: "Tuple", type: "array", items: types, additionalItems: false, minItems: types.length, maxItems: types.length } : { [Kind]: "Tuple", type: "array", minItems: types.length, maxItems: types.length }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/mapped/mapped.mjs
function FromMappedResult3(K, P) {
  return K in P ? FromSchemaType(K, P[K]) : MappedResult(P);
}
function MappedKeyToKnownMappedResultProperties(K) {
  return { [K]: Literal(K) };
}
function MappedKeyToUnknownMappedResultProperties(P) {
  const Acc = {};
  for (const L of P)
    Acc[L] = Literal(L);
  return Acc;
}
function MappedKeyToMappedResultProperties(K, P) {
  return SetIncludes(P, K) ? MappedKeyToKnownMappedResultProperties(K) : MappedKeyToUnknownMappedResultProperties(P);
}
function FromMappedKey(K, P) {
  const R = MappedKeyToMappedResultProperties(K, P);
  return FromMappedResult3(K, R);
}
function FromRest2(K, T) {
  return T.map((L) => FromSchemaType(K, L));
}
function FromProperties3(K, T) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(T))
    Acc[K2] = FromSchemaType(K, T[K2]);
  return Acc;
}
function FromSchemaType(K, T) {
  const options = { ...T };
  return (
    // unevaluated modifier types
    IsOptional(T) ? Optional(FromSchemaType(K, Discard(T, [OptionalKind]))) : IsReadonly(T) ? Readonly(FromSchemaType(K, Discard(T, [ReadonlyKind]))) : (
      // unevaluated mapped types
      IsMappedResult(T) ? FromMappedResult3(K, T.properties) : IsMappedKey(T) ? FromMappedKey(K, T.keys) : (
        // unevaluated types
        IsConstructor(T) ? Constructor(FromRest2(K, T.parameters), FromSchemaType(K, T.returns), options) : IsFunction3(T) ? Function(FromRest2(K, T.parameters), FromSchemaType(K, T.returns), options) : IsAsyncIterator3(T) ? AsyncIterator(FromSchemaType(K, T.items), options) : IsIterator3(T) ? Iterator(FromSchemaType(K, T.items), options) : IsIntersect(T) ? Intersect(FromRest2(K, T.allOf), options) : IsUnion(T) ? Union(FromRest2(K, T.anyOf), options) : IsTuple(T) ? Tuple(FromRest2(K, T.items ?? []), options) : IsObject3(T) ? Object2(FromProperties3(K, T.properties), options) : IsArray3(T) ? Array2(FromSchemaType(K, T.items), options) : IsPromise2(T) ? Promise2(FromSchemaType(K, T.item), options) : T
      )
    )
  );
}
function MappedFunctionReturnType(K, T) {
  const Acc = {};
  for (const L of K)
    Acc[L] = FromSchemaType(L, T);
  return Acc;
}
function Mapped(key, map3, options) {
  const K = IsSchema(key) ? IndexPropertyKeys(key) : key;
  const RT = map3({ [Kind]: "MappedKey", keys: K });
  const R = MappedFunctionReturnType(K, RT);
  return Object2(R, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/optional/optional.mjs
function RemoveOptional(schema) {
  return CreateType(Discard(schema, [OptionalKind]));
}
function AddOptional(schema) {
  return CreateType({ ...schema, [OptionalKind]: "Optional" });
}
function OptionalWithFlag(schema, F) {
  return F === false ? RemoveOptional(schema) : AddOptional(schema);
}
function Optional(schema, enable) {
  const F = enable ?? true;
  return IsMappedResult(schema) ? OptionalFromMappedResult(schema, F) : OptionalWithFlag(schema, F);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/optional/optional-from-mapped-result.mjs
function FromProperties4(P, F) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P))
    Acc[K2] = Optional(P[K2], F);
  return Acc;
}
function FromMappedResult4(R, F) {
  return FromProperties4(R.properties, F);
}
function OptionalFromMappedResult(R, F) {
  const P = FromMappedResult4(R, F);
  return MappedResult(P);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/intersect/intersect-create.mjs
function IntersectCreate(T, options = {}) {
  const allObjects = T.every((schema) => IsObject3(schema));
  const clonedUnevaluatedProperties = IsSchema(options.unevaluatedProperties) ? { unevaluatedProperties: options.unevaluatedProperties } : {};
  return CreateType(options.unevaluatedProperties === false || IsSchema(options.unevaluatedProperties) || allObjects ? { ...clonedUnevaluatedProperties, [Kind]: "Intersect", type: "object", allOf: T } : { ...clonedUnevaluatedProperties, [Kind]: "Intersect", allOf: T }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/intersect/intersect-evaluated.mjs
function IsIntersectOptional(types) {
  return types.every((left) => IsOptional(left));
}
function RemoveOptionalFromType2(type) {
  return Discard(type, [OptionalKind]);
}
function RemoveOptionalFromRest2(types) {
  return types.map((left) => IsOptional(left) ? RemoveOptionalFromType2(left) : left);
}
function ResolveIntersect(types, options) {
  return IsIntersectOptional(types) ? Optional(IntersectCreate(RemoveOptionalFromRest2(types), options)) : IntersectCreate(RemoveOptionalFromRest2(types), options);
}
function IntersectEvaluated(types, options = {}) {
  if (types.length === 1)
    return CreateType(types[0], options);
  if (types.length === 0)
    return Never(options);
  if (types.some((schema) => IsTransform(schema)))
    throw new Error("Cannot intersect transform types");
  return ResolveIntersect(types, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/intersect/intersect.mjs
function Intersect(types, options) {
  if (types.length === 1)
    return CreateType(types[0], options);
  if (types.length === 0)
    return Never(options);
  if (types.some((schema) => IsTransform(schema)))
    throw new Error("Cannot intersect transform types");
  return IntersectCreate(types, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/ref/ref.mjs
function Ref(...args) {
  const [$ref, options] = typeof args[0] === "string" ? [args[0], args[1]] : [args[0].$id, args[1]];
  if (typeof $ref !== "string")
    throw new TypeBoxError("Ref: $ref must be a string");
  return CreateType({ [Kind]: "Ref", $ref }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/awaited/awaited.mjs
function FromComputed(target, parameters) {
  return Computed("Awaited", [Computed(target, parameters)]);
}
function FromRef($ref) {
  return Computed("Awaited", [Ref($ref)]);
}
function FromIntersect2(types) {
  return Intersect(FromRest3(types));
}
function FromUnion4(types) {
  return Union(FromRest3(types));
}
function FromPromise(type) {
  return Awaited(type);
}
function FromRest3(types) {
  return types.map((type) => Awaited(type));
}
function Awaited(type, options) {
  return CreateType(IsComputed(type) ? FromComputed(type.target, type.parameters) : IsIntersect(type) ? FromIntersect2(type.allOf) : IsUnion(type) ? FromUnion4(type.anyOf) : IsPromise2(type) ? FromPromise(type.item) : IsRef(type) ? FromRef(type.$ref) : type, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/keyof/keyof-property-keys.mjs
function FromRest4(types) {
  const result = [];
  for (const L of types)
    result.push(KeyOfPropertyKeys(L));
  return result;
}
function FromIntersect3(types) {
  const propertyKeysArray = FromRest4(types);
  const propertyKeys = SetUnionMany(propertyKeysArray);
  return propertyKeys;
}
function FromUnion5(types) {
  const propertyKeysArray = FromRest4(types);
  const propertyKeys = SetIntersectMany(propertyKeysArray);
  return propertyKeys;
}
function FromTuple2(types) {
  return types.map((_, indexer) => indexer.toString());
}
function FromArray2(_) {
  return ["[number]"];
}
function FromProperties5(T) {
  return globalThis.Object.getOwnPropertyNames(T);
}
function FromPatternProperties(patternProperties) {
  if (!includePatternProperties)
    return [];
  const patternPropertyKeys = globalThis.Object.getOwnPropertyNames(patternProperties);
  return patternPropertyKeys.map((key) => {
    return key[0] === "^" && key[key.length - 1] === "$" ? key.slice(1, key.length - 1) : key;
  });
}
function KeyOfPropertyKeys(type) {
  return IsIntersect(type) ? FromIntersect3(type.allOf) : IsUnion(type) ? FromUnion5(type.anyOf) : IsTuple(type) ? FromTuple2(type.items ?? []) : IsArray3(type) ? FromArray2(type.items) : IsObject3(type) ? FromProperties5(type.properties) : IsRecord(type) ? FromPatternProperties(type.patternProperties) : [];
}
var includePatternProperties = false;
function KeyOfPattern(schema) {
  includePatternProperties = true;
  const keys = KeyOfPropertyKeys(schema);
  includePatternProperties = false;
  const pattern = keys.map((key) => `(${key})`);
  return `^(${pattern.join("|")})$`;
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/keyof/keyof.mjs
function FromComputed2(target, parameters) {
  return Computed("KeyOf", [Computed(target, parameters)]);
}
function FromRef2($ref) {
  return Computed("KeyOf", [Ref($ref)]);
}
function KeyOfFromType(type, options) {
  const propertyKeys = KeyOfPropertyKeys(type);
  const propertyKeyTypes = KeyOfPropertyKeysToRest(propertyKeys);
  const result = UnionEvaluated(propertyKeyTypes);
  return CreateType(result, options);
}
function KeyOfPropertyKeysToRest(propertyKeys) {
  return propertyKeys.map((L) => L === "[number]" ? Number2() : Literal(L));
}
function KeyOf(type, options) {
  return IsComputed(type) ? FromComputed2(type.target, type.parameters) : IsRef(type) ? FromRef2(type.$ref) : IsMappedResult(type) ? KeyOfFromMappedResult(type, options) : KeyOfFromType(type, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/keyof/keyof-from-mapped-result.mjs
function FromProperties6(properties, options) {
  const result = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(properties))
    result[K2] = KeyOf(properties[K2], Clone(options));
  return result;
}
function FromMappedResult5(mappedResult, options) {
  return FromProperties6(mappedResult.properties, options);
}
function KeyOfFromMappedResult(mappedResult, options) {
  const properties = FromMappedResult5(mappedResult, options);
  return MappedResult(properties);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/keyof/keyof-property-entries.mjs
function KeyOfPropertyEntries(schema) {
  const keys = KeyOfPropertyKeys(schema);
  const schemas = IndexFromPropertyKeys(schema, keys);
  return keys.map((_, index) => [keys[index], schemas[index]]);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/composite/composite.mjs
function CompositeKeys(T) {
  const Acc = [];
  for (const L of T)
    Acc.push(...KeyOfPropertyKeys(L));
  return SetDistinct(Acc);
}
function FilterNever(T) {
  return T.filter((L) => !IsNever(L));
}
function CompositeProperty(T, K) {
  const Acc = [];
  for (const L of T)
    Acc.push(...IndexFromPropertyKeys(L, [K]));
  return FilterNever(Acc);
}
function CompositeProperties(T, K) {
  const Acc = {};
  for (const L of K) {
    Acc[L] = IntersectEvaluated(CompositeProperty(T, L));
  }
  return Acc;
}
function Composite(T, options) {
  const K = CompositeKeys(T);
  const P = CompositeProperties(T, K);
  const R = Object2(P, options);
  return R;
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/date/date.mjs
function Date2(options) {
  return CreateType({ [Kind]: "Date", type: "Date" }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/null/null.mjs
function Null(options) {
  return CreateType({ [Kind]: "Null", type: "null" }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/symbol/symbol.mjs
function Symbol2(options) {
  return CreateType({ [Kind]: "Symbol", type: "symbol" }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/undefined/undefined.mjs
function Undefined(options) {
  return CreateType({ [Kind]: "Undefined", type: "undefined" }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/uint8array/uint8array.mjs
function Uint8Array2(options) {
  return CreateType({ [Kind]: "Uint8Array", type: "Uint8Array" }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/unknown/unknown.mjs
function Unknown(options) {
  return CreateType({ [Kind]: "Unknown" }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/const/const.mjs
function FromArray3(T) {
  return T.map((L) => FromValue(L, false));
}
function FromProperties7(value) {
  const Acc = {};
  for (const K of globalThis.Object.getOwnPropertyNames(value))
    Acc[K] = Readonly(FromValue(value[K], false));
  return Acc;
}
function ConditionalReadonly(T, root) {
  return root === true ? T : Readonly(T);
}
function FromValue(value, root) {
  return IsAsyncIterator(value) ? ConditionalReadonly(Any(), root) : IsIterator(value) ? ConditionalReadonly(Any(), root) : IsArray(value) ? Readonly(Tuple(FromArray3(value))) : IsUint8Array(value) ? Uint8Array2() : IsDate(value) ? Date2() : IsObject(value) ? ConditionalReadonly(Object2(FromProperties7(value)), root) : IsFunction(value) ? ConditionalReadonly(Function([], Unknown()), root) : IsUndefined(value) ? Undefined() : IsNull(value) ? Null() : IsSymbol(value) ? Symbol2() : IsBigInt(value) ? BigInt2() : IsNumber(value) ? Literal(value) : IsBoolean(value) ? Literal(value) : IsString(value) ? Literal(value) : Object2({});
}
function Const(T, options) {
  return CreateType(FromValue(T, true), options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/constructor-parameters/constructor-parameters.mjs
function ConstructorParameters(schema, options) {
  return IsConstructor(schema) ? Tuple(schema.parameters, options) : Never(options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/enum/enum.mjs
function Enum(item, options) {
  if (IsUndefined(item))
    throw new Error("Enum undefined or empty");
  const values1 = globalThis.Object.getOwnPropertyNames(item).filter((key) => isNaN(key)).map((key) => item[key]);
  const values2 = [...new Set(values1)];
  const anyOf = values2.map((value) => Literal(value));
  return Union(anyOf, { ...options, [Hint]: "Enum" });
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/extends/extends-check.mjs
var ExtendsResolverError = class extends TypeBoxError {
};
var ExtendsResult;
(function(ExtendsResult2) {
  ExtendsResult2[ExtendsResult2["Union"] = 0] = "Union";
  ExtendsResult2[ExtendsResult2["True"] = 1] = "True";
  ExtendsResult2[ExtendsResult2["False"] = 2] = "False";
})(ExtendsResult || (ExtendsResult = {}));
function IntoBooleanResult(result) {
  return result === ExtendsResult.False ? result : ExtendsResult.True;
}
function Throw(message) {
  throw new ExtendsResolverError(message);
}
function IsStructuralRight(right) {
  return type_exports.IsNever(right) || type_exports.IsIntersect(right) || type_exports.IsUnion(right) || type_exports.IsUnknown(right) || type_exports.IsAny(right);
}
function StructuralRight(left, right) {
  return type_exports.IsNever(right) ? FromNeverRight(left, right) : type_exports.IsIntersect(right) ? FromIntersectRight(left, right) : type_exports.IsUnion(right) ? FromUnionRight(left, right) : type_exports.IsUnknown(right) ? FromUnknownRight(left, right) : type_exports.IsAny(right) ? FromAnyRight(left, right) : Throw("StructuralRight");
}
function FromAnyRight(left, right) {
  return ExtendsResult.True;
}
function FromAny(left, right) {
  return type_exports.IsIntersect(right) ? FromIntersectRight(left, right) : type_exports.IsUnion(right) && right.anyOf.some((schema) => type_exports.IsAny(schema) || type_exports.IsUnknown(schema)) ? ExtendsResult.True : type_exports.IsUnion(right) ? ExtendsResult.Union : type_exports.IsUnknown(right) ? ExtendsResult.True : type_exports.IsAny(right) ? ExtendsResult.True : ExtendsResult.Union;
}
function FromArrayRight(left, right) {
  return type_exports.IsUnknown(left) ? ExtendsResult.False : type_exports.IsAny(left) ? ExtendsResult.Union : type_exports.IsNever(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromArray4(left, right) {
  return type_exports.IsObject(right) && IsObjectArrayLike(right) ? ExtendsResult.True : IsStructuralRight(right) ? StructuralRight(left, right) : !type_exports.IsArray(right) ? ExtendsResult.False : IntoBooleanResult(Visit3(left.items, right.items));
}
function FromAsyncIterator(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : !type_exports.IsAsyncIterator(right) ? ExtendsResult.False : IntoBooleanResult(Visit3(left.items, right.items));
}
function FromBigInt(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports.IsObject(right) ? FromObjectRight(left, right) : type_exports.IsRecord(right) ? FromRecordRight(left, right) : type_exports.IsBigInt(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromBooleanRight(left, right) {
  return type_exports.IsLiteralBoolean(left) ? ExtendsResult.True : type_exports.IsBoolean(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromBoolean(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports.IsObject(right) ? FromObjectRight(left, right) : type_exports.IsRecord(right) ? FromRecordRight(left, right) : type_exports.IsBoolean(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromConstructor(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports.IsObject(right) ? FromObjectRight(left, right) : !type_exports.IsConstructor(right) ? ExtendsResult.False : left.parameters.length > right.parameters.length ? ExtendsResult.False : !left.parameters.every((schema, index) => IntoBooleanResult(Visit3(right.parameters[index], schema)) === ExtendsResult.True) ? ExtendsResult.False : IntoBooleanResult(Visit3(left.returns, right.returns));
}
function FromDate(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports.IsObject(right) ? FromObjectRight(left, right) : type_exports.IsRecord(right) ? FromRecordRight(left, right) : type_exports.IsDate(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromFunction(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports.IsObject(right) ? FromObjectRight(left, right) : !type_exports.IsFunction(right) ? ExtendsResult.False : left.parameters.length > right.parameters.length ? ExtendsResult.False : !left.parameters.every((schema, index) => IntoBooleanResult(Visit3(right.parameters[index], schema)) === ExtendsResult.True) ? ExtendsResult.False : IntoBooleanResult(Visit3(left.returns, right.returns));
}
function FromIntegerRight(left, right) {
  return type_exports.IsLiteral(left) && value_exports.IsNumber(left.const) ? ExtendsResult.True : type_exports.IsNumber(left) || type_exports.IsInteger(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromInteger(left, right) {
  return type_exports.IsInteger(right) || type_exports.IsNumber(right) ? ExtendsResult.True : IsStructuralRight(right) ? StructuralRight(left, right) : type_exports.IsObject(right) ? FromObjectRight(left, right) : type_exports.IsRecord(right) ? FromRecordRight(left, right) : ExtendsResult.False;
}
function FromIntersectRight(left, right) {
  return right.allOf.every((schema) => Visit3(left, schema) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromIntersect4(left, right) {
  return left.allOf.some((schema) => Visit3(schema, right) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromIterator(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : !type_exports.IsIterator(right) ? ExtendsResult.False : IntoBooleanResult(Visit3(left.items, right.items));
}
function FromLiteral2(left, right) {
  return type_exports.IsLiteral(right) && right.const === left.const ? ExtendsResult.True : IsStructuralRight(right) ? StructuralRight(left, right) : type_exports.IsObject(right) ? FromObjectRight(left, right) : type_exports.IsRecord(right) ? FromRecordRight(left, right) : type_exports.IsString(right) ? FromStringRight(left, right) : type_exports.IsNumber(right) ? FromNumberRight(left, right) : type_exports.IsInteger(right) ? FromIntegerRight(left, right) : type_exports.IsBoolean(right) ? FromBooleanRight(left, right) : ExtendsResult.False;
}
function FromNeverRight(left, right) {
  return ExtendsResult.False;
}
function FromNever(left, right) {
  return ExtendsResult.True;
}
function UnwrapTNot(schema) {
  let [current, depth] = [schema, 0];
  while (true) {
    if (!type_exports.IsNot(current))
      break;
    current = current.not;
    depth += 1;
  }
  return depth % 2 === 0 ? current : Unknown();
}
function FromNot(left, right) {
  return type_exports.IsNot(left) ? Visit3(UnwrapTNot(left), right) : type_exports.IsNot(right) ? Visit3(left, UnwrapTNot(right)) : Throw("Invalid fallthrough for Not");
}
function FromNull(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports.IsObject(right) ? FromObjectRight(left, right) : type_exports.IsRecord(right) ? FromRecordRight(left, right) : type_exports.IsNull(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromNumberRight(left, right) {
  return type_exports.IsLiteralNumber(left) ? ExtendsResult.True : type_exports.IsNumber(left) || type_exports.IsInteger(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromNumber(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports.IsObject(right) ? FromObjectRight(left, right) : type_exports.IsRecord(right) ? FromRecordRight(left, right) : type_exports.IsInteger(right) || type_exports.IsNumber(right) ? ExtendsResult.True : ExtendsResult.False;
}
function IsObjectPropertyCount(schema, count) {
  return Object.getOwnPropertyNames(schema.properties).length === count;
}
function IsObjectStringLike(schema) {
  return IsObjectArrayLike(schema);
}
function IsObjectSymbolLike(schema) {
  return IsObjectPropertyCount(schema, 0) || IsObjectPropertyCount(schema, 1) && "description" in schema.properties && type_exports.IsUnion(schema.properties.description) && schema.properties.description.anyOf.length === 2 && (type_exports.IsString(schema.properties.description.anyOf[0]) && type_exports.IsUndefined(schema.properties.description.anyOf[1]) || type_exports.IsString(schema.properties.description.anyOf[1]) && type_exports.IsUndefined(schema.properties.description.anyOf[0]));
}
function IsObjectNumberLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectBooleanLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectBigIntLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectDateLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectUint8ArrayLike(schema) {
  return IsObjectArrayLike(schema);
}
function IsObjectFunctionLike(schema) {
  const length = Number2();
  return IsObjectPropertyCount(schema, 0) || IsObjectPropertyCount(schema, 1) && "length" in schema.properties && IntoBooleanResult(Visit3(schema.properties["length"], length)) === ExtendsResult.True;
}
function IsObjectConstructorLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectArrayLike(schema) {
  const length = Number2();
  return IsObjectPropertyCount(schema, 0) || IsObjectPropertyCount(schema, 1) && "length" in schema.properties && IntoBooleanResult(Visit3(schema.properties["length"], length)) === ExtendsResult.True;
}
function IsObjectPromiseLike(schema) {
  const then = Function([Any()], Any());
  return IsObjectPropertyCount(schema, 0) || IsObjectPropertyCount(schema, 1) && "then" in schema.properties && IntoBooleanResult(Visit3(schema.properties["then"], then)) === ExtendsResult.True;
}
function Property(left, right) {
  return Visit3(left, right) === ExtendsResult.False ? ExtendsResult.False : type_exports.IsOptional(left) && !type_exports.IsOptional(right) ? ExtendsResult.False : ExtendsResult.True;
}
function FromObjectRight(left, right) {
  return type_exports.IsUnknown(left) ? ExtendsResult.False : type_exports.IsAny(left) ? ExtendsResult.Union : type_exports.IsNever(left) || type_exports.IsLiteralString(left) && IsObjectStringLike(right) || type_exports.IsLiteralNumber(left) && IsObjectNumberLike(right) || type_exports.IsLiteralBoolean(left) && IsObjectBooleanLike(right) || type_exports.IsSymbol(left) && IsObjectSymbolLike(right) || type_exports.IsBigInt(left) && IsObjectBigIntLike(right) || type_exports.IsString(left) && IsObjectStringLike(right) || type_exports.IsSymbol(left) && IsObjectSymbolLike(right) || type_exports.IsNumber(left) && IsObjectNumberLike(right) || type_exports.IsInteger(left) && IsObjectNumberLike(right) || type_exports.IsBoolean(left) && IsObjectBooleanLike(right) || type_exports.IsUint8Array(left) && IsObjectUint8ArrayLike(right) || type_exports.IsDate(left) && IsObjectDateLike(right) || type_exports.IsConstructor(left) && IsObjectConstructorLike(right) || type_exports.IsFunction(left) && IsObjectFunctionLike(right) ? ExtendsResult.True : type_exports.IsRecord(left) && type_exports.IsString(RecordKey(left)) ? (() => {
    return right[Hint] === "Record" ? ExtendsResult.True : ExtendsResult.False;
  })() : type_exports.IsRecord(left) && type_exports.IsNumber(RecordKey(left)) ? (() => {
    return IsObjectPropertyCount(right, 0) ? ExtendsResult.True : ExtendsResult.False;
  })() : ExtendsResult.False;
}
function FromObject(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports.IsRecord(right) ? FromRecordRight(left, right) : !type_exports.IsObject(right) ? ExtendsResult.False : (() => {
    for (const key of Object.getOwnPropertyNames(right.properties)) {
      if (!(key in left.properties) && !type_exports.IsOptional(right.properties[key])) {
        return ExtendsResult.False;
      }
      if (type_exports.IsOptional(right.properties[key])) {
        return ExtendsResult.True;
      }
      if (Property(left.properties[key], right.properties[key]) === ExtendsResult.False) {
        return ExtendsResult.False;
      }
    }
    return ExtendsResult.True;
  })();
}
function FromPromise2(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports.IsObject(right) && IsObjectPromiseLike(right) ? ExtendsResult.True : !type_exports.IsPromise(right) ? ExtendsResult.False : IntoBooleanResult(Visit3(left.item, right.item));
}
function RecordKey(schema) {
  return PatternNumberExact in schema.patternProperties ? Number2() : PatternStringExact in schema.patternProperties ? String2() : Throw("Unknown record key pattern");
}
function RecordValue(schema) {
  return PatternNumberExact in schema.patternProperties ? schema.patternProperties[PatternNumberExact] : PatternStringExact in schema.patternProperties ? schema.patternProperties[PatternStringExact] : Throw("Unable to get record value schema");
}
function FromRecordRight(left, right) {
  const [Key, Value] = [RecordKey(right), RecordValue(right)];
  return type_exports.IsLiteralString(left) && type_exports.IsNumber(Key) && IntoBooleanResult(Visit3(left, Value)) === ExtendsResult.True ? ExtendsResult.True : type_exports.IsUint8Array(left) && type_exports.IsNumber(Key) ? Visit3(left, Value) : type_exports.IsString(left) && type_exports.IsNumber(Key) ? Visit3(left, Value) : type_exports.IsArray(left) && type_exports.IsNumber(Key) ? Visit3(left, Value) : type_exports.IsObject(left) ? (() => {
    for (const key of Object.getOwnPropertyNames(left.properties)) {
      if (Property(Value, left.properties[key]) === ExtendsResult.False) {
        return ExtendsResult.False;
      }
    }
    return ExtendsResult.True;
  })() : ExtendsResult.False;
}
function FromRecord(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports.IsObject(right) ? FromObjectRight(left, right) : !type_exports.IsRecord(right) ? ExtendsResult.False : Visit3(RecordValue(left), RecordValue(right));
}
function FromRegExp(left, right) {
  const L = type_exports.IsRegExp(left) ? String2() : left;
  const R = type_exports.IsRegExp(right) ? String2() : right;
  return Visit3(L, R);
}
function FromStringRight(left, right) {
  return type_exports.IsLiteral(left) && value_exports.IsString(left.const) ? ExtendsResult.True : type_exports.IsString(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromString(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports.IsObject(right) ? FromObjectRight(left, right) : type_exports.IsRecord(right) ? FromRecordRight(left, right) : type_exports.IsString(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromSymbol(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports.IsObject(right) ? FromObjectRight(left, right) : type_exports.IsRecord(right) ? FromRecordRight(left, right) : type_exports.IsSymbol(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromTemplateLiteral2(left, right) {
  return type_exports.IsTemplateLiteral(left) ? Visit3(TemplateLiteralToUnion(left), right) : type_exports.IsTemplateLiteral(right) ? Visit3(left, TemplateLiteralToUnion(right)) : Throw("Invalid fallthrough for TemplateLiteral");
}
function IsArrayOfTuple(left, right) {
  return type_exports.IsArray(right) && left.items !== void 0 && left.items.every((schema) => Visit3(schema, right.items) === ExtendsResult.True);
}
function FromTupleRight(left, right) {
  return type_exports.IsNever(left) ? ExtendsResult.True : type_exports.IsUnknown(left) ? ExtendsResult.False : type_exports.IsAny(left) ? ExtendsResult.Union : ExtendsResult.False;
}
function FromTuple3(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports.IsObject(right) && IsObjectArrayLike(right) ? ExtendsResult.True : type_exports.IsArray(right) && IsArrayOfTuple(left, right) ? ExtendsResult.True : !type_exports.IsTuple(right) ? ExtendsResult.False : value_exports.IsUndefined(left.items) && !value_exports.IsUndefined(right.items) || !value_exports.IsUndefined(left.items) && value_exports.IsUndefined(right.items) ? ExtendsResult.False : value_exports.IsUndefined(left.items) && !value_exports.IsUndefined(right.items) ? ExtendsResult.True : left.items.every((schema, index) => Visit3(schema, right.items[index]) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUint8Array(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports.IsObject(right) ? FromObjectRight(left, right) : type_exports.IsRecord(right) ? FromRecordRight(left, right) : type_exports.IsUint8Array(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUndefined(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports.IsObject(right) ? FromObjectRight(left, right) : type_exports.IsRecord(right) ? FromRecordRight(left, right) : type_exports.IsVoid(right) ? FromVoidRight(left, right) : type_exports.IsUndefined(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUnionRight(left, right) {
  return right.anyOf.some((schema) => Visit3(left, schema) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUnion6(left, right) {
  return left.anyOf.every((schema) => Visit3(schema, right) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUnknownRight(left, right) {
  return ExtendsResult.True;
}
function FromUnknown(left, right) {
  return type_exports.IsNever(right) ? FromNeverRight(left, right) : type_exports.IsIntersect(right) ? FromIntersectRight(left, right) : type_exports.IsUnion(right) ? FromUnionRight(left, right) : type_exports.IsAny(right) ? FromAnyRight(left, right) : type_exports.IsString(right) ? FromStringRight(left, right) : type_exports.IsNumber(right) ? FromNumberRight(left, right) : type_exports.IsInteger(right) ? FromIntegerRight(left, right) : type_exports.IsBoolean(right) ? FromBooleanRight(left, right) : type_exports.IsArray(right) ? FromArrayRight(left, right) : type_exports.IsTuple(right) ? FromTupleRight(left, right) : type_exports.IsObject(right) ? FromObjectRight(left, right) : type_exports.IsUnknown(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromVoidRight(left, right) {
  return type_exports.IsUndefined(left) ? ExtendsResult.True : type_exports.IsUndefined(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromVoid(left, right) {
  return type_exports.IsIntersect(right) ? FromIntersectRight(left, right) : type_exports.IsUnion(right) ? FromUnionRight(left, right) : type_exports.IsUnknown(right) ? FromUnknownRight(left, right) : type_exports.IsAny(right) ? FromAnyRight(left, right) : type_exports.IsObject(right) ? FromObjectRight(left, right) : type_exports.IsVoid(right) ? ExtendsResult.True : ExtendsResult.False;
}
function Visit3(left, right) {
  return (
    // resolvable
    type_exports.IsTemplateLiteral(left) || type_exports.IsTemplateLiteral(right) ? FromTemplateLiteral2(left, right) : type_exports.IsRegExp(left) || type_exports.IsRegExp(right) ? FromRegExp(left, right) : type_exports.IsNot(left) || type_exports.IsNot(right) ? FromNot(left, right) : (
      // standard
      type_exports.IsAny(left) ? FromAny(left, right) : type_exports.IsArray(left) ? FromArray4(left, right) : type_exports.IsBigInt(left) ? FromBigInt(left, right) : type_exports.IsBoolean(left) ? FromBoolean(left, right) : type_exports.IsAsyncIterator(left) ? FromAsyncIterator(left, right) : type_exports.IsConstructor(left) ? FromConstructor(left, right) : type_exports.IsDate(left) ? FromDate(left, right) : type_exports.IsFunction(left) ? FromFunction(left, right) : type_exports.IsInteger(left) ? FromInteger(left, right) : type_exports.IsIntersect(left) ? FromIntersect4(left, right) : type_exports.IsIterator(left) ? FromIterator(left, right) : type_exports.IsLiteral(left) ? FromLiteral2(left, right) : type_exports.IsNever(left) ? FromNever(left, right) : type_exports.IsNull(left) ? FromNull(left, right) : type_exports.IsNumber(left) ? FromNumber(left, right) : type_exports.IsObject(left) ? FromObject(left, right) : type_exports.IsRecord(left) ? FromRecord(left, right) : type_exports.IsString(left) ? FromString(left, right) : type_exports.IsSymbol(left) ? FromSymbol(left, right) : type_exports.IsTuple(left) ? FromTuple3(left, right) : type_exports.IsPromise(left) ? FromPromise2(left, right) : type_exports.IsUint8Array(left) ? FromUint8Array(left, right) : type_exports.IsUndefined(left) ? FromUndefined(left, right) : type_exports.IsUnion(left) ? FromUnion6(left, right) : type_exports.IsUnknown(left) ? FromUnknown(left, right) : type_exports.IsVoid(left) ? FromVoid(left, right) : Throw(`Unknown left type operand '${left[Kind]}'`)
    )
  );
}
function ExtendsCheck(left, right) {
  return Visit3(left, right);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/extends/extends-from-mapped-result.mjs
function FromProperties8(P, Right, True, False, options) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P))
    Acc[K2] = Extends(P[K2], Right, True, False, Clone(options));
  return Acc;
}
function FromMappedResult6(Left, Right, True, False, options) {
  return FromProperties8(Left.properties, Right, True, False, options);
}
function ExtendsFromMappedResult(Left, Right, True, False, options) {
  const P = FromMappedResult6(Left, Right, True, False, options);
  return MappedResult(P);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/extends/extends.mjs
function ExtendsResolve(left, right, trueType, falseType) {
  const R = ExtendsCheck(left, right);
  return R === ExtendsResult.Union ? Union([trueType, falseType]) : R === ExtendsResult.True ? trueType : falseType;
}
function Extends(L, R, T, F, options) {
  return IsMappedResult(L) ? ExtendsFromMappedResult(L, R, T, F, options) : IsMappedKey(L) ? CreateType(ExtendsFromMappedKey(L, R, T, F, options)) : CreateType(ExtendsResolve(L, R, T, F), options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/extends/extends-from-mapped-key.mjs
function FromPropertyKey(K, U, L, R, options) {
  return {
    [K]: Extends(Literal(K), U, L, R, Clone(options))
  };
}
function FromPropertyKeys(K, U, L, R, options) {
  return K.reduce((Acc, LK) => {
    return { ...Acc, ...FromPropertyKey(LK, U, L, R, options) };
  }, {});
}
function FromMappedKey2(K, U, L, R, options) {
  return FromPropertyKeys(K.keys, U, L, R, options);
}
function ExtendsFromMappedKey(T, U, L, R, options) {
  const P = FromMappedKey2(T, U, L, R, options);
  return MappedResult(P);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/extends/extends-undefined.mjs
function Intersect2(schema) {
  return schema.allOf.every((schema2) => ExtendsUndefinedCheck(schema2));
}
function Union2(schema) {
  return schema.anyOf.some((schema2) => ExtendsUndefinedCheck(schema2));
}
function Not(schema) {
  return !ExtendsUndefinedCheck(schema.not);
}
function ExtendsUndefinedCheck(schema) {
  return schema[Kind] === "Intersect" ? Intersect2(schema) : schema[Kind] === "Union" ? Union2(schema) : schema[Kind] === "Not" ? Not(schema) : schema[Kind] === "Undefined" ? true : false;
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/exclude/exclude-from-template-literal.mjs
function ExcludeFromTemplateLiteral(L, R) {
  return Exclude(TemplateLiteralToUnion(L), R);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/exclude/exclude.mjs
function ExcludeRest(L, R) {
  const excluded = L.filter((inner) => ExtendsCheck(inner, R) === ExtendsResult.False);
  return excluded.length === 1 ? excluded[0] : Union(excluded);
}
function Exclude(L, R, options = {}) {
  if (IsTemplateLiteral(L))
    return CreateType(ExcludeFromTemplateLiteral(L, R), options);
  if (IsMappedResult(L))
    return CreateType(ExcludeFromMappedResult(L, R), options);
  return CreateType(IsUnion(L) ? ExcludeRest(L.anyOf, R) : ExtendsCheck(L, R) !== ExtendsResult.False ? Never() : L, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/exclude/exclude-from-mapped-result.mjs
function FromProperties9(P, U) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P))
    Acc[K2] = Exclude(P[K2], U);
  return Acc;
}
function FromMappedResult7(R, T) {
  return FromProperties9(R.properties, T);
}
function ExcludeFromMappedResult(R, T) {
  const P = FromMappedResult7(R, T);
  return MappedResult(P);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/extract/extract-from-template-literal.mjs
function ExtractFromTemplateLiteral(L, R) {
  return Extract(TemplateLiteralToUnion(L), R);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/extract/extract.mjs
function ExtractRest(L, R) {
  const extracted = L.filter((inner) => ExtendsCheck(inner, R) !== ExtendsResult.False);
  return extracted.length === 1 ? extracted[0] : Union(extracted);
}
function Extract(L, R, options) {
  if (IsTemplateLiteral(L))
    return CreateType(ExtractFromTemplateLiteral(L, R), options);
  if (IsMappedResult(L))
    return CreateType(ExtractFromMappedResult(L, R), options);
  return CreateType(IsUnion(L) ? ExtractRest(L.anyOf, R) : ExtendsCheck(L, R) !== ExtendsResult.False ? L : Never(), options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/extract/extract-from-mapped-result.mjs
function FromProperties10(P, T) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P))
    Acc[K2] = Extract(P[K2], T);
  return Acc;
}
function FromMappedResult8(R, T) {
  return FromProperties10(R.properties, T);
}
function ExtractFromMappedResult(R, T) {
  const P = FromMappedResult8(R, T);
  return MappedResult(P);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/instance-type/instance-type.mjs
function InstanceType(schema, options) {
  return IsConstructor(schema) ? CreateType(schema.returns, options) : Never(options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/readonly-optional/readonly-optional.mjs
function ReadonlyOptional(schema) {
  return Readonly(Optional(schema));
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/record/record.mjs
function RecordCreateFromPattern(pattern, T, options) {
  return CreateType({ [Kind]: "Record", type: "object", patternProperties: { [pattern]: T } }, options);
}
function RecordCreateFromKeys(K, T, options) {
  const result = {};
  for (const K2 of K)
    result[K2] = T;
  return Object2(result, { ...options, [Hint]: "Record" });
}
function FromTemplateLiteralKey(K, T, options) {
  return IsTemplateLiteralFinite(K) ? RecordCreateFromKeys(IndexPropertyKeys(K), T, options) : RecordCreateFromPattern(K.pattern, T, options);
}
function FromUnionKey(key, type, options) {
  return RecordCreateFromKeys(IndexPropertyKeys(Union(key)), type, options);
}
function FromLiteralKey(key, type, options) {
  return RecordCreateFromKeys([key.toString()], type, options);
}
function FromRegExpKey(key, type, options) {
  return RecordCreateFromPattern(key.source, type, options);
}
function FromStringKey(key, type, options) {
  const pattern = IsUndefined(key.pattern) ? PatternStringExact : key.pattern;
  return RecordCreateFromPattern(pattern, type, options);
}
function FromAnyKey(_, type, options) {
  return RecordCreateFromPattern(PatternStringExact, type, options);
}
function FromNeverKey(_key, type, options) {
  return RecordCreateFromPattern(PatternNeverExact, type, options);
}
function FromBooleanKey(_key, type, options) {
  return Object2({ true: type, false: type }, options);
}
function FromIntegerKey(_key, type, options) {
  return RecordCreateFromPattern(PatternNumberExact, type, options);
}
function FromNumberKey(_, type, options) {
  return RecordCreateFromPattern(PatternNumberExact, type, options);
}
function Record(key, type, options = {}) {
  return IsUnion(key) ? FromUnionKey(key.anyOf, type, options) : IsTemplateLiteral(key) ? FromTemplateLiteralKey(key, type, options) : IsLiteral(key) ? FromLiteralKey(key.const, type, options) : IsBoolean3(key) ? FromBooleanKey(key, type, options) : IsInteger2(key) ? FromIntegerKey(key, type, options) : IsNumber3(key) ? FromNumberKey(key, type, options) : IsRegExp2(key) ? FromRegExpKey(key, type, options) : IsString3(key) ? FromStringKey(key, type, options) : IsAny(key) ? FromAnyKey(key, type, options) : IsNever(key) ? FromNeverKey(key, type, options) : Never(options);
}
function RecordPattern(record) {
  return globalThis.Object.getOwnPropertyNames(record.patternProperties)[0];
}
function RecordKey2(type) {
  const pattern = RecordPattern(type);
  return pattern === PatternStringExact ? String2() : pattern === PatternNumberExact ? Number2() : String2({ pattern });
}
function RecordValue2(type) {
  return type.patternProperties[RecordPattern(type)];
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/instantiate/instantiate.mjs
function FromConstructor2(args, type) {
  type.parameters = FromTypes(args, type.parameters);
  type.returns = FromType(args, type.returns);
  return type;
}
function FromFunction2(args, type) {
  type.parameters = FromTypes(args, type.parameters);
  type.returns = FromType(args, type.returns);
  return type;
}
function FromIntersect5(args, type) {
  type.allOf = FromTypes(args, type.allOf);
  return type;
}
function FromUnion7(args, type) {
  type.anyOf = FromTypes(args, type.anyOf);
  return type;
}
function FromTuple4(args, type) {
  if (IsUndefined(type.items))
    return type;
  type.items = FromTypes(args, type.items);
  return type;
}
function FromArray5(args, type) {
  type.items = FromType(args, type.items);
  return type;
}
function FromAsyncIterator2(args, type) {
  type.items = FromType(args, type.items);
  return type;
}
function FromIterator2(args, type) {
  type.items = FromType(args, type.items);
  return type;
}
function FromPromise3(args, type) {
  type.item = FromType(args, type.item);
  return type;
}
function FromObject2(args, type) {
  const mappedProperties = FromProperties11(args, type.properties);
  return { ...type, ...Object2(mappedProperties) };
}
function FromRecord2(args, type) {
  const mappedKey = FromType(args, RecordKey2(type));
  const mappedValue = FromType(args, RecordValue2(type));
  const result = Record(mappedKey, mappedValue);
  return { ...type, ...result };
}
function FromArgument(args, argument) {
  return argument.index in args ? args[argument.index] : Unknown();
}
function FromProperty2(args, type) {
  const isReadonly = IsReadonly(type);
  const isOptional = IsOptional(type);
  const mapped = FromType(args, type);
  return isReadonly && isOptional ? ReadonlyOptional(mapped) : isReadonly && !isOptional ? Readonly(mapped) : !isReadonly && isOptional ? Optional(mapped) : mapped;
}
function FromProperties11(args, properties) {
  return globalThis.Object.getOwnPropertyNames(properties).reduce((result, key) => {
    return { ...result, [key]: FromProperty2(args, properties[key]) };
  }, {});
}
function FromTypes(args, types) {
  return types.map((type) => FromType(args, type));
}
function FromType(args, type) {
  return IsConstructor(type) ? FromConstructor2(args, type) : IsFunction3(type) ? FromFunction2(args, type) : IsIntersect(type) ? FromIntersect5(args, type) : IsUnion(type) ? FromUnion7(args, type) : IsTuple(type) ? FromTuple4(args, type) : IsArray3(type) ? FromArray5(args, type) : IsAsyncIterator3(type) ? FromAsyncIterator2(args, type) : IsIterator3(type) ? FromIterator2(args, type) : IsPromise2(type) ? FromPromise3(args, type) : IsObject3(type) ? FromObject2(args, type) : IsRecord(type) ? FromRecord2(args, type) : IsArgument(type) ? FromArgument(args, type) : type;
}
function Instantiate(type, args) {
  return FromType(args, CloneType(type));
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/integer/integer.mjs
function Integer(options) {
  return CreateType({ [Kind]: "Integer", type: "integer" }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/intrinsic/intrinsic-from-mapped-key.mjs
function MappedIntrinsicPropertyKey(K, M, options) {
  return {
    [K]: Intrinsic(Literal(K), M, Clone(options))
  };
}
function MappedIntrinsicPropertyKeys(K, M, options) {
  const result = K.reduce((Acc, L) => {
    return { ...Acc, ...MappedIntrinsicPropertyKey(L, M, options) };
  }, {});
  return result;
}
function MappedIntrinsicProperties(T, M, options) {
  return MappedIntrinsicPropertyKeys(T["keys"], M, options);
}
function IntrinsicFromMappedKey(T, M, options) {
  const P = MappedIntrinsicProperties(T, M, options);
  return MappedResult(P);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/intrinsic/intrinsic.mjs
function ApplyUncapitalize(value) {
  const [first, rest] = [value.slice(0, 1), value.slice(1)];
  return [first.toLowerCase(), rest].join("");
}
function ApplyCapitalize(value) {
  const [first, rest] = [value.slice(0, 1), value.slice(1)];
  return [first.toUpperCase(), rest].join("");
}
function ApplyUppercase(value) {
  return value.toUpperCase();
}
function ApplyLowercase(value) {
  return value.toLowerCase();
}
function FromTemplateLiteral3(schema, mode, options) {
  const expression = TemplateLiteralParseExact(schema.pattern);
  const finite = IsTemplateLiteralExpressionFinite(expression);
  if (!finite)
    return { ...schema, pattern: FromLiteralValue(schema.pattern, mode) };
  const strings = [...TemplateLiteralExpressionGenerate(expression)];
  const literals = strings.map((value) => Literal(value));
  const mapped = FromRest5(literals, mode);
  const union = Union(mapped);
  return TemplateLiteral([union], options);
}
function FromLiteralValue(value, mode) {
  return typeof value === "string" ? mode === "Uncapitalize" ? ApplyUncapitalize(value) : mode === "Capitalize" ? ApplyCapitalize(value) : mode === "Uppercase" ? ApplyUppercase(value) : mode === "Lowercase" ? ApplyLowercase(value) : value : value.toString();
}
function FromRest5(T, M) {
  return T.map((L) => Intrinsic(L, M));
}
function Intrinsic(schema, mode, options = {}) {
  return (
    // Intrinsic-Mapped-Inference
    IsMappedKey(schema) ? IntrinsicFromMappedKey(schema, mode, options) : (
      // Standard-Inference
      IsTemplateLiteral(schema) ? FromTemplateLiteral3(schema, mode, options) : IsUnion(schema) ? Union(FromRest5(schema.anyOf, mode), options) : IsLiteral(schema) ? Literal(FromLiteralValue(schema.const, mode), options) : (
        // Default Type
        CreateType(schema, options)
      )
    )
  );
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/intrinsic/capitalize.mjs
function Capitalize(T, options = {}) {
  return Intrinsic(T, "Capitalize", options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/intrinsic/lowercase.mjs
function Lowercase(T, options = {}) {
  return Intrinsic(T, "Lowercase", options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/intrinsic/uncapitalize.mjs
function Uncapitalize(T, options = {}) {
  return Intrinsic(T, "Uncapitalize", options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/intrinsic/uppercase.mjs
function Uppercase(T, options = {}) {
  return Intrinsic(T, "Uppercase", options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/omit/omit-from-mapped-result.mjs
function FromProperties12(properties, propertyKeys, options) {
  const result = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(properties))
    result[K2] = Omit(properties[K2], propertyKeys, Clone(options));
  return result;
}
function FromMappedResult9(mappedResult, propertyKeys, options) {
  return FromProperties12(mappedResult.properties, propertyKeys, options);
}
function OmitFromMappedResult(mappedResult, propertyKeys, options) {
  const properties = FromMappedResult9(mappedResult, propertyKeys, options);
  return MappedResult(properties);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/omit/omit.mjs
function FromIntersect6(types, propertyKeys) {
  return types.map((type) => OmitResolve(type, propertyKeys));
}
function FromUnion8(types, propertyKeys) {
  return types.map((type) => OmitResolve(type, propertyKeys));
}
function FromProperty3(properties, key) {
  const { [key]: _, ...R } = properties;
  return R;
}
function FromProperties13(properties, propertyKeys) {
  return propertyKeys.reduce((T, K2) => FromProperty3(T, K2), properties);
}
function FromObject3(properties, propertyKeys) {
  const options = Discard(properties, [TransformKind, "$id", "required", "properties"]);
  const omittedProperties = FromProperties13(properties["properties"], propertyKeys);
  return Object2(omittedProperties, options);
}
function UnionFromPropertyKeys(propertyKeys) {
  const result = propertyKeys.reduce((result2, key) => IsLiteralValue(key) ? [...result2, Literal(key)] : result2, []);
  return Union(result);
}
function OmitResolve(properties, propertyKeys) {
  return IsIntersect(properties) ? Intersect(FromIntersect6(properties.allOf, propertyKeys)) : IsUnion(properties) ? Union(FromUnion8(properties.anyOf, propertyKeys)) : IsObject3(properties) ? FromObject3(properties, propertyKeys) : Object2({});
}
function Omit(type, key, options) {
  const typeKey = IsArray(key) ? UnionFromPropertyKeys(key) : key;
  const propertyKeys = IsSchema(key) ? IndexPropertyKeys(key) : key;
  const isTypeRef = IsRef(type);
  const isKeyRef = IsRef(key);
  return IsMappedResult(type) ? OmitFromMappedResult(type, propertyKeys, options) : IsMappedKey(key) ? OmitFromMappedKey(type, key, options) : isTypeRef && isKeyRef ? Computed("Omit", [type, typeKey], options) : !isTypeRef && isKeyRef ? Computed("Omit", [type, typeKey], options) : isTypeRef && !isKeyRef ? Computed("Omit", [type, typeKey], options) : CreateType({ ...OmitResolve(type, propertyKeys), ...options });
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/omit/omit-from-mapped-key.mjs
function FromPropertyKey2(type, key, options) {
  return { [key]: Omit(type, [key], Clone(options)) };
}
function FromPropertyKeys2(type, propertyKeys, options) {
  return propertyKeys.reduce((Acc, LK) => {
    return { ...Acc, ...FromPropertyKey2(type, LK, options) };
  }, {});
}
function FromMappedKey3(type, mappedKey, options) {
  return FromPropertyKeys2(type, mappedKey.keys, options);
}
function OmitFromMappedKey(type, mappedKey, options) {
  const properties = FromMappedKey3(type, mappedKey, options);
  return MappedResult(properties);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/pick/pick-from-mapped-result.mjs
function FromProperties14(properties, propertyKeys, options) {
  const result = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(properties))
    result[K2] = Pick(properties[K2], propertyKeys, Clone(options));
  return result;
}
function FromMappedResult10(mappedResult, propertyKeys, options) {
  return FromProperties14(mappedResult.properties, propertyKeys, options);
}
function PickFromMappedResult(mappedResult, propertyKeys, options) {
  const properties = FromMappedResult10(mappedResult, propertyKeys, options);
  return MappedResult(properties);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/pick/pick.mjs
function FromIntersect7(types, propertyKeys) {
  return types.map((type) => PickResolve(type, propertyKeys));
}
function FromUnion9(types, propertyKeys) {
  return types.map((type) => PickResolve(type, propertyKeys));
}
function FromProperties15(properties, propertyKeys) {
  const result = {};
  for (const K2 of propertyKeys)
    if (K2 in properties)
      result[K2] = properties[K2];
  return result;
}
function FromObject4(T, K) {
  const options = Discard(T, [TransformKind, "$id", "required", "properties"]);
  const properties = FromProperties15(T["properties"], K);
  return Object2(properties, options);
}
function UnionFromPropertyKeys2(propertyKeys) {
  const result = propertyKeys.reduce((result2, key) => IsLiteralValue(key) ? [...result2, Literal(key)] : result2, []);
  return Union(result);
}
function PickResolve(properties, propertyKeys) {
  return IsIntersect(properties) ? Intersect(FromIntersect7(properties.allOf, propertyKeys)) : IsUnion(properties) ? Union(FromUnion9(properties.anyOf, propertyKeys)) : IsObject3(properties) ? FromObject4(properties, propertyKeys) : Object2({});
}
function Pick(type, key, options) {
  const typeKey = IsArray(key) ? UnionFromPropertyKeys2(key) : key;
  const propertyKeys = IsSchema(key) ? IndexPropertyKeys(key) : key;
  const isTypeRef = IsRef(type);
  const isKeyRef = IsRef(key);
  return IsMappedResult(type) ? PickFromMappedResult(type, propertyKeys, options) : IsMappedKey(key) ? PickFromMappedKey(type, key, options) : isTypeRef && isKeyRef ? Computed("Pick", [type, typeKey], options) : !isTypeRef && isKeyRef ? Computed("Pick", [type, typeKey], options) : isTypeRef && !isKeyRef ? Computed("Pick", [type, typeKey], options) : CreateType({ ...PickResolve(type, propertyKeys), ...options });
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/pick/pick-from-mapped-key.mjs
function FromPropertyKey3(type, key, options) {
  return {
    [key]: Pick(type, [key], Clone(options))
  };
}
function FromPropertyKeys3(type, propertyKeys, options) {
  return propertyKeys.reduce((result, leftKey) => {
    return { ...result, ...FromPropertyKey3(type, leftKey, options) };
  }, {});
}
function FromMappedKey4(type, mappedKey, options) {
  return FromPropertyKeys3(type, mappedKey.keys, options);
}
function PickFromMappedKey(type, mappedKey, options) {
  const properties = FromMappedKey4(type, mappedKey, options);
  return MappedResult(properties);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/partial/partial.mjs
function FromComputed3(target, parameters) {
  return Computed("Partial", [Computed(target, parameters)]);
}
function FromRef3($ref) {
  return Computed("Partial", [Ref($ref)]);
}
function FromProperties16(properties) {
  const partialProperties = {};
  for (const K of globalThis.Object.getOwnPropertyNames(properties))
    partialProperties[K] = Optional(properties[K]);
  return partialProperties;
}
function FromObject5(type) {
  const options = Discard(type, [TransformKind, "$id", "required", "properties"]);
  const properties = FromProperties16(type["properties"]);
  return Object2(properties, options);
}
function FromRest6(types) {
  return types.map((type) => PartialResolve(type));
}
function PartialResolve(type) {
  return (
    // Mappable
    IsComputed(type) ? FromComputed3(type.target, type.parameters) : IsRef(type) ? FromRef3(type.$ref) : IsIntersect(type) ? Intersect(FromRest6(type.allOf)) : IsUnion(type) ? Union(FromRest6(type.anyOf)) : IsObject3(type) ? FromObject5(type) : (
      // Intrinsic
      IsBigInt3(type) ? type : IsBoolean3(type) ? type : IsInteger2(type) ? type : IsLiteral(type) ? type : IsNull3(type) ? type : IsNumber3(type) ? type : IsString3(type) ? type : IsSymbol3(type) ? type : IsUndefined3(type) ? type : (
        // Passthrough
        Object2({})
      )
    )
  );
}
function Partial(type, options) {
  if (IsMappedResult(type)) {
    return PartialFromMappedResult(type, options);
  } else {
    return CreateType({ ...PartialResolve(type), ...options });
  }
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/partial/partial-from-mapped-result.mjs
function FromProperties17(K, options) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(K))
    Acc[K2] = Partial(K[K2], Clone(options));
  return Acc;
}
function FromMappedResult11(R, options) {
  return FromProperties17(R.properties, options);
}
function PartialFromMappedResult(R, options) {
  const P = FromMappedResult11(R, options);
  return MappedResult(P);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/required/required.mjs
function FromComputed4(target, parameters) {
  return Computed("Required", [Computed(target, parameters)]);
}
function FromRef4($ref) {
  return Computed("Required", [Ref($ref)]);
}
function FromProperties18(properties) {
  const requiredProperties = {};
  for (const K of globalThis.Object.getOwnPropertyNames(properties))
    requiredProperties[K] = Discard(properties[K], [OptionalKind]);
  return requiredProperties;
}
function FromObject6(type) {
  const options = Discard(type, [TransformKind, "$id", "required", "properties"]);
  const properties = FromProperties18(type["properties"]);
  return Object2(properties, options);
}
function FromRest7(types) {
  return types.map((type) => RequiredResolve(type));
}
function RequiredResolve(type) {
  return (
    // Mappable
    IsComputed(type) ? FromComputed4(type.target, type.parameters) : IsRef(type) ? FromRef4(type.$ref) : IsIntersect(type) ? Intersect(FromRest7(type.allOf)) : IsUnion(type) ? Union(FromRest7(type.anyOf)) : IsObject3(type) ? FromObject6(type) : (
      // Intrinsic
      IsBigInt3(type) ? type : IsBoolean3(type) ? type : IsInteger2(type) ? type : IsLiteral(type) ? type : IsNull3(type) ? type : IsNumber3(type) ? type : IsString3(type) ? type : IsSymbol3(type) ? type : IsUndefined3(type) ? type : (
        // Passthrough
        Object2({})
      )
    )
  );
}
function Required(type, options) {
  if (IsMappedResult(type)) {
    return RequiredFromMappedResult(type, options);
  } else {
    return CreateType({ ...RequiredResolve(type), ...options });
  }
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/required/required-from-mapped-result.mjs
function FromProperties19(P, options) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P))
    Acc[K2] = Required(P[K2], options);
  return Acc;
}
function FromMappedResult12(R, options) {
  return FromProperties19(R.properties, options);
}
function RequiredFromMappedResult(R, options) {
  const P = FromMappedResult12(R, options);
  return MappedResult(P);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/module/compute.mjs
function DereferenceParameters(moduleProperties, types) {
  return types.map((type) => {
    return IsRef(type) ? Dereference(moduleProperties, type.$ref) : FromType2(moduleProperties, type);
  });
}
function Dereference(moduleProperties, ref) {
  return ref in moduleProperties ? IsRef(moduleProperties[ref]) ? Dereference(moduleProperties, moduleProperties[ref].$ref) : FromType2(moduleProperties, moduleProperties[ref]) : Never();
}
function FromAwaited(parameters) {
  return Awaited(parameters[0]);
}
function FromIndex(parameters) {
  return Index(parameters[0], parameters[1]);
}
function FromKeyOf(parameters) {
  return KeyOf(parameters[0]);
}
function FromPartial(parameters) {
  return Partial(parameters[0]);
}
function FromOmit(parameters) {
  return Omit(parameters[0], parameters[1]);
}
function FromPick(parameters) {
  return Pick(parameters[0], parameters[1]);
}
function FromRequired(parameters) {
  return Required(parameters[0]);
}
function FromComputed5(moduleProperties, target, parameters) {
  const dereferenced = DereferenceParameters(moduleProperties, parameters);
  return target === "Awaited" ? FromAwaited(dereferenced) : target === "Index" ? FromIndex(dereferenced) : target === "KeyOf" ? FromKeyOf(dereferenced) : target === "Partial" ? FromPartial(dereferenced) : target === "Omit" ? FromOmit(dereferenced) : target === "Pick" ? FromPick(dereferenced) : target === "Required" ? FromRequired(dereferenced) : Never();
}
function FromArray6(moduleProperties, type) {
  return Array2(FromType2(moduleProperties, type));
}
function FromAsyncIterator3(moduleProperties, type) {
  return AsyncIterator(FromType2(moduleProperties, type));
}
function FromConstructor3(moduleProperties, parameters, instanceType) {
  return Constructor(FromTypes2(moduleProperties, parameters), FromType2(moduleProperties, instanceType));
}
function FromFunction3(moduleProperties, parameters, returnType) {
  return Function(FromTypes2(moduleProperties, parameters), FromType2(moduleProperties, returnType));
}
function FromIntersect8(moduleProperties, types) {
  return Intersect(FromTypes2(moduleProperties, types));
}
function FromIterator3(moduleProperties, type) {
  return Iterator(FromType2(moduleProperties, type));
}
function FromObject7(moduleProperties, properties) {
  return Object2(globalThis.Object.keys(properties).reduce((result, key) => {
    return { ...result, [key]: FromType2(moduleProperties, properties[key]) };
  }, {}));
}
function FromRecord3(moduleProperties, type) {
  const [value, pattern] = [FromType2(moduleProperties, RecordValue2(type)), RecordPattern(type)];
  const result = CloneType(type);
  result.patternProperties[pattern] = value;
  return result;
}
function FromTransform(moduleProperties, transform) {
  return IsRef(transform) ? { ...Dereference(moduleProperties, transform.$ref), [TransformKind]: transform[TransformKind] } : transform;
}
function FromTuple5(moduleProperties, types) {
  return Tuple(FromTypes2(moduleProperties, types));
}
function FromUnion10(moduleProperties, types) {
  return Union(FromTypes2(moduleProperties, types));
}
function FromTypes2(moduleProperties, types) {
  return types.map((type) => FromType2(moduleProperties, type));
}
function FromType2(moduleProperties, type) {
  return (
    // Modifiers
    IsOptional(type) ? CreateType(FromType2(moduleProperties, Discard(type, [OptionalKind])), type) : IsReadonly(type) ? CreateType(FromType2(moduleProperties, Discard(type, [ReadonlyKind])), type) : (
      // Transform
      IsTransform(type) ? CreateType(FromTransform(moduleProperties, type), type) : (
        // Types
        IsArray3(type) ? CreateType(FromArray6(moduleProperties, type.items), type) : IsAsyncIterator3(type) ? CreateType(FromAsyncIterator3(moduleProperties, type.items), type) : IsComputed(type) ? CreateType(FromComputed5(moduleProperties, type.target, type.parameters)) : IsConstructor(type) ? CreateType(FromConstructor3(moduleProperties, type.parameters, type.returns), type) : IsFunction3(type) ? CreateType(FromFunction3(moduleProperties, type.parameters, type.returns), type) : IsIntersect(type) ? CreateType(FromIntersect8(moduleProperties, type.allOf), type) : IsIterator3(type) ? CreateType(FromIterator3(moduleProperties, type.items), type) : IsObject3(type) ? CreateType(FromObject7(moduleProperties, type.properties), type) : IsRecord(type) ? CreateType(FromRecord3(moduleProperties, type)) : IsTuple(type) ? CreateType(FromTuple5(moduleProperties, type.items || []), type) : IsUnion(type) ? CreateType(FromUnion10(moduleProperties, type.anyOf), type) : type
      )
    )
  );
}
function ComputeType(moduleProperties, key) {
  return key in moduleProperties ? FromType2(moduleProperties, moduleProperties[key]) : Never();
}
function ComputeModuleProperties(moduleProperties) {
  return globalThis.Object.getOwnPropertyNames(moduleProperties).reduce((result, key) => {
    return { ...result, [key]: ComputeType(moduleProperties, key) };
  }, {});
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/module/module.mjs
var TModule = class {
  constructor($defs) {
    const computed = ComputeModuleProperties($defs);
    const identified = this.WithIdentifiers(computed);
    this.$defs = identified;
  }
  /** `[Json]` Imports a Type by Key. */
  Import(key, options) {
    const $defs = { ...this.$defs, [key]: CreateType(this.$defs[key], options) };
    return CreateType({ [Kind]: "Import", $defs, $ref: key });
  }
  // prettier-ignore
  WithIdentifiers($defs) {
    return globalThis.Object.getOwnPropertyNames($defs).reduce((result, key) => {
      return { ...result, [key]: { ...$defs[key], $id: key } };
    }, {});
  }
};
function Module(properties) {
  return new TModule(properties);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/not/not.mjs
function Not2(type, options) {
  return CreateType({ [Kind]: "Not", not: type }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/parameters/parameters.mjs
function Parameters(schema, options) {
  return IsFunction3(schema) ? Tuple(schema.parameters, options) : Never();
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/recursive/recursive.mjs
var Ordinal = 0;
function Recursive(callback, options = {}) {
  if (IsUndefined(options.$id))
    options.$id = `T${Ordinal++}`;
  const thisType = CloneType(callback({ [Kind]: "This", $ref: `${options.$id}` }));
  thisType.$id = options.$id;
  return CreateType({ [Hint]: "Recursive", ...thisType }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/regexp/regexp.mjs
function RegExp2(unresolved, options) {
  const expr = IsString(unresolved) ? new globalThis.RegExp(unresolved) : unresolved;
  return CreateType({ [Kind]: "RegExp", type: "RegExp", source: expr.source, flags: expr.flags }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/rest/rest.mjs
function RestResolve(T) {
  return IsIntersect(T) ? T.allOf : IsUnion(T) ? T.anyOf : IsTuple(T) ? T.items ?? [] : [];
}
function Rest(T) {
  return RestResolve(T);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/return-type/return-type.mjs
function ReturnType(schema, options) {
  return IsFunction3(schema) ? CreateType(schema.returns, options) : Never(options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/transform/transform.mjs
var TransformDecodeBuilder = class {
  constructor(schema) {
    this.schema = schema;
  }
  Decode(decode) {
    return new TransformEncodeBuilder(this.schema, decode);
  }
};
var TransformEncodeBuilder = class {
  constructor(schema, decode) {
    this.schema = schema;
    this.decode = decode;
  }
  EncodeTransform(encode, schema) {
    const Encode2 = (value) => schema[TransformKind].Encode(encode(value));
    const Decode2 = (value) => this.decode(schema[TransformKind].Decode(value));
    const Codec = { Encode: Encode2, Decode: Decode2 };
    return { ...schema, [TransformKind]: Codec };
  }
  EncodeSchema(encode, schema) {
    const Codec = { Decode: this.decode, Encode: encode };
    return { ...schema, [TransformKind]: Codec };
  }
  Encode(encode) {
    return IsTransform(this.schema) ? this.EncodeTransform(encode, this.schema) : this.EncodeSchema(encode, this.schema);
  }
};
function Transform(schema) {
  return new TransformDecodeBuilder(schema);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/unsafe/unsafe.mjs
function Unsafe(options = {}) {
  return CreateType({ [Kind]: options[Kind] ?? "Unsafe" }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/void/void.mjs
function Void(options) {
  return CreateType({ [Kind]: "Void", type: "void" }, options);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/type/type.mjs
var type_exports3 = {};
__export(type_exports3, {
  Any: () => Any,
  Argument: () => Argument,
  Array: () => Array2,
  AsyncIterator: () => AsyncIterator,
  Awaited: () => Awaited,
  BigInt: () => BigInt2,
  Boolean: () => Boolean2,
  Capitalize: () => Capitalize,
  Composite: () => Composite,
  Const: () => Const,
  Constructor: () => Constructor,
  ConstructorParameters: () => ConstructorParameters,
  Date: () => Date2,
  Enum: () => Enum,
  Exclude: () => Exclude,
  Extends: () => Extends,
  Extract: () => Extract,
  Function: () => Function,
  Index: () => Index,
  InstanceType: () => InstanceType,
  Instantiate: () => Instantiate,
  Integer: () => Integer,
  Intersect: () => Intersect,
  Iterator: () => Iterator,
  KeyOf: () => KeyOf,
  Literal: () => Literal,
  Lowercase: () => Lowercase,
  Mapped: () => Mapped,
  Module: () => Module,
  Never: () => Never,
  Not: () => Not2,
  Null: () => Null,
  Number: () => Number2,
  Object: () => Object2,
  Omit: () => Omit,
  Optional: () => Optional,
  Parameters: () => Parameters,
  Partial: () => Partial,
  Pick: () => Pick,
  Promise: () => Promise2,
  Readonly: () => Readonly,
  ReadonlyOptional: () => ReadonlyOptional,
  Record: () => Record,
  Recursive: () => Recursive,
  Ref: () => Ref,
  RegExp: () => RegExp2,
  Required: () => Required,
  Rest: () => Rest,
  ReturnType: () => ReturnType,
  String: () => String2,
  Symbol: () => Symbol2,
  TemplateLiteral: () => TemplateLiteral,
  Transform: () => Transform,
  Tuple: () => Tuple,
  Uint8Array: () => Uint8Array2,
  Uncapitalize: () => Uncapitalize,
  Undefined: () => Undefined,
  Union: () => Union,
  Unknown: () => Unknown,
  Unsafe: () => Unsafe,
  Uppercase: () => Uppercase,
  Void: () => Void
});

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/type/type/index.mjs
var Type = type_exports3;

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/errors/function.mjs
function DefaultErrorFunction(error) {
  switch (error.errorType) {
    case ValueErrorType.ArrayContains:
      return "Expected array to contain at least one matching value";
    case ValueErrorType.ArrayMaxContains:
      return `Expected array to contain no more than ${error.schema.maxContains} matching values`;
    case ValueErrorType.ArrayMinContains:
      return `Expected array to contain at least ${error.schema.minContains} matching values`;
    case ValueErrorType.ArrayMaxItems:
      return `Expected array length to be less or equal to ${error.schema.maxItems}`;
    case ValueErrorType.ArrayMinItems:
      return `Expected array length to be greater or equal to ${error.schema.minItems}`;
    case ValueErrorType.ArrayUniqueItems:
      return "Expected array elements to be unique";
    case ValueErrorType.Array:
      return "Expected array";
    case ValueErrorType.AsyncIterator:
      return "Expected AsyncIterator";
    case ValueErrorType.BigIntExclusiveMaximum:
      return `Expected bigint to be less than ${error.schema.exclusiveMaximum}`;
    case ValueErrorType.BigIntExclusiveMinimum:
      return `Expected bigint to be greater than ${error.schema.exclusiveMinimum}`;
    case ValueErrorType.BigIntMaximum:
      return `Expected bigint to be less or equal to ${error.schema.maximum}`;
    case ValueErrorType.BigIntMinimum:
      return `Expected bigint to be greater or equal to ${error.schema.minimum}`;
    case ValueErrorType.BigIntMultipleOf:
      return `Expected bigint to be a multiple of ${error.schema.multipleOf}`;
    case ValueErrorType.BigInt:
      return "Expected bigint";
    case ValueErrorType.Boolean:
      return "Expected boolean";
    case ValueErrorType.DateExclusiveMinimumTimestamp:
      return `Expected Date timestamp to be greater than ${error.schema.exclusiveMinimumTimestamp}`;
    case ValueErrorType.DateExclusiveMaximumTimestamp:
      return `Expected Date timestamp to be less than ${error.schema.exclusiveMaximumTimestamp}`;
    case ValueErrorType.DateMinimumTimestamp:
      return `Expected Date timestamp to be greater or equal to ${error.schema.minimumTimestamp}`;
    case ValueErrorType.DateMaximumTimestamp:
      return `Expected Date timestamp to be less or equal to ${error.schema.maximumTimestamp}`;
    case ValueErrorType.DateMultipleOfTimestamp:
      return `Expected Date timestamp to be a multiple of ${error.schema.multipleOfTimestamp}`;
    case ValueErrorType.Date:
      return "Expected Date";
    case ValueErrorType.Function:
      return "Expected function";
    case ValueErrorType.IntegerExclusiveMaximum:
      return `Expected integer to be less than ${error.schema.exclusiveMaximum}`;
    case ValueErrorType.IntegerExclusiveMinimum:
      return `Expected integer to be greater than ${error.schema.exclusiveMinimum}`;
    case ValueErrorType.IntegerMaximum:
      return `Expected integer to be less or equal to ${error.schema.maximum}`;
    case ValueErrorType.IntegerMinimum:
      return `Expected integer to be greater or equal to ${error.schema.minimum}`;
    case ValueErrorType.IntegerMultipleOf:
      return `Expected integer to be a multiple of ${error.schema.multipleOf}`;
    case ValueErrorType.Integer:
      return "Expected integer";
    case ValueErrorType.IntersectUnevaluatedProperties:
      return "Unexpected property";
    case ValueErrorType.Intersect:
      return "Expected all values to match";
    case ValueErrorType.Iterator:
      return "Expected Iterator";
    case ValueErrorType.Literal:
      return `Expected ${typeof error.schema.const === "string" ? `'${error.schema.const}'` : error.schema.const}`;
    case ValueErrorType.Never:
      return "Never";
    case ValueErrorType.Not:
      return "Value should not match";
    case ValueErrorType.Null:
      return "Expected null";
    case ValueErrorType.NumberExclusiveMaximum:
      return `Expected number to be less than ${error.schema.exclusiveMaximum}`;
    case ValueErrorType.NumberExclusiveMinimum:
      return `Expected number to be greater than ${error.schema.exclusiveMinimum}`;
    case ValueErrorType.NumberMaximum:
      return `Expected number to be less or equal to ${error.schema.maximum}`;
    case ValueErrorType.NumberMinimum:
      return `Expected number to be greater or equal to ${error.schema.minimum}`;
    case ValueErrorType.NumberMultipleOf:
      return `Expected number to be a multiple of ${error.schema.multipleOf}`;
    case ValueErrorType.Number:
      return "Expected number";
    case ValueErrorType.Object:
      return "Expected object";
    case ValueErrorType.ObjectAdditionalProperties:
      return "Unexpected property";
    case ValueErrorType.ObjectMaxProperties:
      return `Expected object to have no more than ${error.schema.maxProperties} properties`;
    case ValueErrorType.ObjectMinProperties:
      return `Expected object to have at least ${error.schema.minProperties} properties`;
    case ValueErrorType.ObjectRequiredProperty:
      return "Expected required property";
    case ValueErrorType.Promise:
      return "Expected Promise";
    case ValueErrorType.RegExp:
      return "Expected string to match regular expression";
    case ValueErrorType.StringFormatUnknown:
      return `Unknown format '${error.schema.format}'`;
    case ValueErrorType.StringFormat:
      return `Expected string to match '${error.schema.format}' format`;
    case ValueErrorType.StringMaxLength:
      return `Expected string length less or equal to ${error.schema.maxLength}`;
    case ValueErrorType.StringMinLength:
      return `Expected string length greater or equal to ${error.schema.minLength}`;
    case ValueErrorType.StringPattern:
      return `Expected string to match '${error.schema.pattern}'`;
    case ValueErrorType.String:
      return "Expected string";
    case ValueErrorType.Symbol:
      return "Expected symbol";
    case ValueErrorType.TupleLength:
      return `Expected tuple to have ${error.schema.maxItems || 0} elements`;
    case ValueErrorType.Tuple:
      return "Expected tuple";
    case ValueErrorType.Uint8ArrayMaxByteLength:
      return `Expected byte length less or equal to ${error.schema.maxByteLength}`;
    case ValueErrorType.Uint8ArrayMinByteLength:
      return `Expected byte length greater or equal to ${error.schema.minByteLength}`;
    case ValueErrorType.Uint8Array:
      return "Expected Uint8Array";
    case ValueErrorType.Undefined:
      return "Expected undefined";
    case ValueErrorType.Union:
      return "Expected union value";
    case ValueErrorType.Void:
      return "Expected void";
    case ValueErrorType.Kind:
      return `Expected kind '${error.schema[Kind]}'`;
    default:
      return "Unknown error type";
  }
}
var errorFunction = DefaultErrorFunction;
function GetErrorFunction() {
  return errorFunction;
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/deref/deref.mjs
var TypeDereferenceError = class extends TypeBoxError {
  constructor(schema) {
    super(`Unable to dereference schema with $id '${schema.$ref}'`);
    this.schema = schema;
  }
};
function Resolve(schema, references) {
  const target = references.find((target2) => target2.$id === schema.$ref);
  if (target === void 0)
    throw new TypeDereferenceError(schema);
  return Deref(target, references);
}
function Pushref(schema, references) {
  if (!IsString2(schema.$id) || references.some((target) => target.$id === schema.$id))
    return references;
  references.push(schema);
  return references;
}
function Deref(schema, references) {
  return schema[Kind] === "This" || schema[Kind] === "Ref" ? Resolve(schema, references) : schema;
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/hash/hash.mjs
var ValueHashError = class extends TypeBoxError {
  constructor(value) {
    super(`Unable to hash value`);
    this.value = value;
  }
};
var ByteMarker;
(function(ByteMarker2) {
  ByteMarker2[ByteMarker2["Undefined"] = 0] = "Undefined";
  ByteMarker2[ByteMarker2["Null"] = 1] = "Null";
  ByteMarker2[ByteMarker2["Boolean"] = 2] = "Boolean";
  ByteMarker2[ByteMarker2["Number"] = 3] = "Number";
  ByteMarker2[ByteMarker2["String"] = 4] = "String";
  ByteMarker2[ByteMarker2["Object"] = 5] = "Object";
  ByteMarker2[ByteMarker2["Array"] = 6] = "Array";
  ByteMarker2[ByteMarker2["Date"] = 7] = "Date";
  ByteMarker2[ByteMarker2["Uint8Array"] = 8] = "Uint8Array";
  ByteMarker2[ByteMarker2["Symbol"] = 9] = "Symbol";
  ByteMarker2[ByteMarker2["BigInt"] = 10] = "BigInt";
})(ByteMarker || (ByteMarker = {}));
var Accumulator = BigInt("14695981039346656037");
var [Prime, Size] = [BigInt("1099511628211"), BigInt(
  "18446744073709551616"
  /* 2 ^ 64 */
)];
var Bytes = Array.from({ length: 256 }).map((_, i) => BigInt(i));
var F64 = new Float64Array(1);
var F64In = new DataView(F64.buffer);
var F64Out = new Uint8Array(F64.buffer);
function* NumberToBytes(value) {
  const byteCount = value === 0 ? 1 : Math.ceil(Math.floor(Math.log2(value) + 1) / 8);
  for (let i = 0; i < byteCount; i++) {
    yield value >> 8 * (byteCount - 1 - i) & 255;
  }
}
function ArrayType2(value) {
  FNV1A64(ByteMarker.Array);
  for (const item of value) {
    Visit4(item);
  }
}
function BooleanType(value) {
  FNV1A64(ByteMarker.Boolean);
  FNV1A64(value ? 1 : 0);
}
function BigIntType(value) {
  FNV1A64(ByteMarker.BigInt);
  F64In.setBigInt64(0, value);
  for (const byte of F64Out) {
    FNV1A64(byte);
  }
}
function DateType2(value) {
  FNV1A64(ByteMarker.Date);
  Visit4(value.getTime());
}
function NullType(value) {
  FNV1A64(ByteMarker.Null);
}
function NumberType(value) {
  FNV1A64(ByteMarker.Number);
  F64In.setFloat64(0, value);
  for (const byte of F64Out) {
    FNV1A64(byte);
  }
}
function ObjectType2(value) {
  FNV1A64(ByteMarker.Object);
  for (const key of globalThis.Object.getOwnPropertyNames(value).sort()) {
    Visit4(key);
    Visit4(value[key]);
  }
}
function StringType(value) {
  FNV1A64(ByteMarker.String);
  for (let i = 0; i < value.length; i++) {
    for (const byte of NumberToBytes(value.charCodeAt(i))) {
      FNV1A64(byte);
    }
  }
}
function SymbolType(value) {
  FNV1A64(ByteMarker.Symbol);
  Visit4(value.description);
}
function Uint8ArrayType2(value) {
  FNV1A64(ByteMarker.Uint8Array);
  for (let i = 0; i < value.length; i++) {
    FNV1A64(value[i]);
  }
}
function UndefinedType(value) {
  return FNV1A64(ByteMarker.Undefined);
}
function Visit4(value) {
  if (IsArray2(value))
    return ArrayType2(value);
  if (IsBoolean2(value))
    return BooleanType(value);
  if (IsBigInt2(value))
    return BigIntType(value);
  if (IsDate2(value))
    return DateType2(value);
  if (IsNull2(value))
    return NullType(value);
  if (IsNumber2(value))
    return NumberType(value);
  if (IsObject2(value))
    return ObjectType2(value);
  if (IsString2(value))
    return StringType(value);
  if (IsSymbol2(value))
    return SymbolType(value);
  if (IsUint8Array2(value))
    return Uint8ArrayType2(value);
  if (IsUndefined2(value))
    return UndefinedType(value);
  throw new ValueHashError(value);
}
function FNV1A64(byte) {
  Accumulator = Accumulator ^ Bytes[byte];
  Accumulator = Accumulator * Prime % Size;
}
function Hash(value) {
  Accumulator = BigInt("14695981039346656037");
  Visit4(value);
  return Accumulator;
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/check/check.mjs
var ValueCheckUnknownTypeError = class extends TypeBoxError {
  constructor(schema) {
    super(`Unknown type`);
    this.schema = schema;
  }
};
function IsAnyOrUnknown(schema) {
  return schema[Kind] === "Any" || schema[Kind] === "Unknown";
}
function IsDefined(value) {
  return value !== void 0;
}
function FromAny2(schema, references, value) {
  return true;
}
function FromArgument2(schema, references, value) {
  return true;
}
function FromArray7(schema, references, value) {
  if (!IsArray2(value))
    return false;
  if (IsDefined(schema.minItems) && !(value.length >= schema.minItems)) {
    return false;
  }
  if (IsDefined(schema.maxItems) && !(value.length <= schema.maxItems)) {
    return false;
  }
  if (!value.every((value2) => Visit5(schema.items, references, value2))) {
    return false;
  }
  if (schema.uniqueItems === true && !(function() {
    const set = /* @__PURE__ */ new Set();
    for (const element of value) {
      const hashed = Hash(element);
      if (set.has(hashed)) {
        return false;
      } else {
        set.add(hashed);
      }
    }
    return true;
  })()) {
    return false;
  }
  if (!(IsDefined(schema.contains) || IsNumber2(schema.minContains) || IsNumber2(schema.maxContains))) {
    return true;
  }
  const containsSchema = IsDefined(schema.contains) ? schema.contains : Never();
  const containsCount = value.reduce((acc, value2) => Visit5(containsSchema, references, value2) ? acc + 1 : acc, 0);
  if (containsCount === 0) {
    return false;
  }
  if (IsNumber2(schema.minContains) && containsCount < schema.minContains) {
    return false;
  }
  if (IsNumber2(schema.maxContains) && containsCount > schema.maxContains) {
    return false;
  }
  return true;
}
function FromAsyncIterator4(schema, references, value) {
  return IsAsyncIterator2(value);
}
function FromBigInt2(schema, references, value) {
  if (!IsBigInt2(value))
    return false;
  if (IsDefined(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    return false;
  }
  if (IsDefined(schema.maximum) && !(value <= schema.maximum)) {
    return false;
  }
  if (IsDefined(schema.minimum) && !(value >= schema.minimum)) {
    return false;
  }
  if (IsDefined(schema.multipleOf) && !(value % schema.multipleOf === BigInt(0))) {
    return false;
  }
  return true;
}
function FromBoolean2(schema, references, value) {
  return IsBoolean2(value);
}
function FromConstructor4(schema, references, value) {
  return Visit5(schema.returns, references, value.prototype);
}
function FromDate2(schema, references, value) {
  if (!IsDate2(value))
    return false;
  if (IsDefined(schema.exclusiveMaximumTimestamp) && !(value.getTime() < schema.exclusiveMaximumTimestamp)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMinimumTimestamp) && !(value.getTime() > schema.exclusiveMinimumTimestamp)) {
    return false;
  }
  if (IsDefined(schema.maximumTimestamp) && !(value.getTime() <= schema.maximumTimestamp)) {
    return false;
  }
  if (IsDefined(schema.minimumTimestamp) && !(value.getTime() >= schema.minimumTimestamp)) {
    return false;
  }
  if (IsDefined(schema.multipleOfTimestamp) && !(value.getTime() % schema.multipleOfTimestamp === 0)) {
    return false;
  }
  return true;
}
function FromFunction4(schema, references, value) {
  return IsFunction2(value);
}
function FromImport(schema, references, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit5(target, [...references, ...definitions], value);
}
function FromInteger2(schema, references, value) {
  if (!IsInteger(value)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    return false;
  }
  if (IsDefined(schema.maximum) && !(value <= schema.maximum)) {
    return false;
  }
  if (IsDefined(schema.minimum) && !(value >= schema.minimum)) {
    return false;
  }
  if (IsDefined(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
    return false;
  }
  return true;
}
function FromIntersect9(schema, references, value) {
  const check1 = schema.allOf.every((schema2) => Visit5(schema2, references, value));
  if (schema.unevaluatedProperties === false) {
    const keyPattern = new RegExp(KeyOfPattern(schema));
    const check22 = Object.getOwnPropertyNames(value).every((key) => keyPattern.test(key));
    return check1 && check22;
  } else if (IsSchema(schema.unevaluatedProperties)) {
    const keyCheck = new RegExp(KeyOfPattern(schema));
    const check22 = Object.getOwnPropertyNames(value).every((key) => keyCheck.test(key) || Visit5(schema.unevaluatedProperties, references, value[key]));
    return check1 && check22;
  } else {
    return check1;
  }
}
function FromIterator4(schema, references, value) {
  return IsIterator2(value);
}
function FromLiteral3(schema, references, value) {
  return value === schema.const;
}
function FromNever2(schema, references, value) {
  return false;
}
function FromNot2(schema, references, value) {
  return !Visit5(schema.not, references, value);
}
function FromNull2(schema, references, value) {
  return IsNull2(value);
}
function FromNumber2(schema, references, value) {
  if (!TypeSystemPolicy.IsNumberLike(value))
    return false;
  if (IsDefined(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    return false;
  }
  if (IsDefined(schema.minimum) && !(value >= schema.minimum)) {
    return false;
  }
  if (IsDefined(schema.maximum) && !(value <= schema.maximum)) {
    return false;
  }
  if (IsDefined(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
    return false;
  }
  return true;
}
function FromObject8(schema, references, value) {
  if (!TypeSystemPolicy.IsObjectLike(value))
    return false;
  if (IsDefined(schema.minProperties) && !(Object.getOwnPropertyNames(value).length >= schema.minProperties)) {
    return false;
  }
  if (IsDefined(schema.maxProperties) && !(Object.getOwnPropertyNames(value).length <= schema.maxProperties)) {
    return false;
  }
  const knownKeys = Object.getOwnPropertyNames(schema.properties);
  for (const knownKey of knownKeys) {
    const property = schema.properties[knownKey];
    if (schema.required && schema.required.includes(knownKey)) {
      if (!Visit5(property, references, value[knownKey])) {
        return false;
      }
      if ((ExtendsUndefinedCheck(property) || IsAnyOrUnknown(property)) && !(knownKey in value)) {
        return false;
      }
    } else {
      if (TypeSystemPolicy.IsExactOptionalProperty(value, knownKey) && !Visit5(property, references, value[knownKey])) {
        return false;
      }
    }
  }
  if (schema.additionalProperties === false) {
    const valueKeys = Object.getOwnPropertyNames(value);
    if (schema.required && schema.required.length === knownKeys.length && valueKeys.length === knownKeys.length) {
      return true;
    } else {
      return valueKeys.every((valueKey) => knownKeys.includes(valueKey));
    }
  } else if (typeof schema.additionalProperties === "object") {
    const valueKeys = Object.getOwnPropertyNames(value);
    return valueKeys.every((key) => knownKeys.includes(key) || Visit5(schema.additionalProperties, references, value[key]));
  } else {
    return true;
  }
}
function FromPromise4(schema, references, value) {
  return IsPromise(value);
}
function FromRecord4(schema, references, value) {
  if (!TypeSystemPolicy.IsRecordLike(value)) {
    return false;
  }
  if (IsDefined(schema.minProperties) && !(Object.getOwnPropertyNames(value).length >= schema.minProperties)) {
    return false;
  }
  if (IsDefined(schema.maxProperties) && !(Object.getOwnPropertyNames(value).length <= schema.maxProperties)) {
    return false;
  }
  const [patternKey, patternSchema] = Object.entries(schema.patternProperties)[0];
  const regex = new RegExp(patternKey);
  const check1 = Object.entries(value).every(([key, value2]) => {
    return regex.test(key) ? Visit5(patternSchema, references, value2) : true;
  });
  const check22 = typeof schema.additionalProperties === "object" ? Object.entries(value).every(([key, value2]) => {
    return !regex.test(key) ? Visit5(schema.additionalProperties, references, value2) : true;
  }) : true;
  const check32 = schema.additionalProperties === false ? Object.getOwnPropertyNames(value).every((key) => {
    return regex.test(key);
  }) : true;
  return check1 && check22 && check32;
}
function FromRef5(schema, references, value) {
  return Visit5(Deref(schema, references), references, value);
}
function FromRegExp2(schema, references, value) {
  const regex = new RegExp(schema.source, schema.flags);
  if (IsDefined(schema.minLength)) {
    if (!(value.length >= schema.minLength))
      return false;
  }
  if (IsDefined(schema.maxLength)) {
    if (!(value.length <= schema.maxLength))
      return false;
  }
  return regex.test(value);
}
function FromString2(schema, references, value) {
  if (!IsString2(value)) {
    return false;
  }
  if (IsDefined(schema.minLength)) {
    if (!(value.length >= schema.minLength))
      return false;
  }
  if (IsDefined(schema.maxLength)) {
    if (!(value.length <= schema.maxLength))
      return false;
  }
  if (IsDefined(schema.pattern)) {
    const regex = new RegExp(schema.pattern);
    if (!regex.test(value))
      return false;
  }
  if (IsDefined(schema.format)) {
    if (!format_exports.Has(schema.format))
      return false;
    const func = format_exports.Get(schema.format);
    return func(value);
  }
  return true;
}
function FromSymbol2(schema, references, value) {
  return IsSymbol2(value);
}
function FromTemplateLiteral4(schema, references, value) {
  return IsString2(value) && new RegExp(schema.pattern).test(value);
}
function FromThis(schema, references, value) {
  return Visit5(Deref(schema, references), references, value);
}
function FromTuple6(schema, references, value) {
  if (!IsArray2(value)) {
    return false;
  }
  if (schema.items === void 0 && !(value.length === 0)) {
    return false;
  }
  if (!(value.length === schema.maxItems)) {
    return false;
  }
  if (!schema.items) {
    return true;
  }
  for (let i = 0; i < schema.items.length; i++) {
    if (!Visit5(schema.items[i], references, value[i]))
      return false;
  }
  return true;
}
function FromUndefined2(schema, references, value) {
  return IsUndefined2(value);
}
function FromUnion11(schema, references, value) {
  return schema.anyOf.some((inner) => Visit5(inner, references, value));
}
function FromUint8Array2(schema, references, value) {
  if (!IsUint8Array2(value)) {
    return false;
  }
  if (IsDefined(schema.maxByteLength) && !(value.length <= schema.maxByteLength)) {
    return false;
  }
  if (IsDefined(schema.minByteLength) && !(value.length >= schema.minByteLength)) {
    return false;
  }
  return true;
}
function FromUnknown2(schema, references, value) {
  return true;
}
function FromVoid2(schema, references, value) {
  return TypeSystemPolicy.IsVoidLike(value);
}
function FromKind(schema, references, value) {
  if (!type_exports2.Has(schema[Kind]))
    return false;
  const func = type_exports2.Get(schema[Kind]);
  return func(schema, value);
}
function Visit5(schema, references, value) {
  const references_ = IsDefined(schema.$id) ? Pushref(schema, references) : references;
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Any":
      return FromAny2(schema_, references_, value);
    case "Argument":
      return FromArgument2(schema_, references_, value);
    case "Array":
      return FromArray7(schema_, references_, value);
    case "AsyncIterator":
      return FromAsyncIterator4(schema_, references_, value);
    case "BigInt":
      return FromBigInt2(schema_, references_, value);
    case "Boolean":
      return FromBoolean2(schema_, references_, value);
    case "Constructor":
      return FromConstructor4(schema_, references_, value);
    case "Date":
      return FromDate2(schema_, references_, value);
    case "Function":
      return FromFunction4(schema_, references_, value);
    case "Import":
      return FromImport(schema_, references_, value);
    case "Integer":
      return FromInteger2(schema_, references_, value);
    case "Intersect":
      return FromIntersect9(schema_, references_, value);
    case "Iterator":
      return FromIterator4(schema_, references_, value);
    case "Literal":
      return FromLiteral3(schema_, references_, value);
    case "Never":
      return FromNever2(schema_, references_, value);
    case "Not":
      return FromNot2(schema_, references_, value);
    case "Null":
      return FromNull2(schema_, references_, value);
    case "Number":
      return FromNumber2(schema_, references_, value);
    case "Object":
      return FromObject8(schema_, references_, value);
    case "Promise":
      return FromPromise4(schema_, references_, value);
    case "Record":
      return FromRecord4(schema_, references_, value);
    case "Ref":
      return FromRef5(schema_, references_, value);
    case "RegExp":
      return FromRegExp2(schema_, references_, value);
    case "String":
      return FromString2(schema_, references_, value);
    case "Symbol":
      return FromSymbol2(schema_, references_, value);
    case "TemplateLiteral":
      return FromTemplateLiteral4(schema_, references_, value);
    case "This":
      return FromThis(schema_, references_, value);
    case "Tuple":
      return FromTuple6(schema_, references_, value);
    case "Undefined":
      return FromUndefined2(schema_, references_, value);
    case "Union":
      return FromUnion11(schema_, references_, value);
    case "Uint8Array":
      return FromUint8Array2(schema_, references_, value);
    case "Unknown":
      return FromUnknown2(schema_, references_, value);
    case "Void":
      return FromVoid2(schema_, references_, value);
    default:
      if (!type_exports2.Has(schema_[Kind]))
        throw new ValueCheckUnknownTypeError(schema_);
      return FromKind(schema_, references_, value);
  }
}
function Check(...args) {
  return args.length === 3 ? Visit5(args[0], args[1], args[2]) : Visit5(args[0], [], args[1]);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/errors/errors.mjs
var ValueErrorType;
(function(ValueErrorType2) {
  ValueErrorType2[ValueErrorType2["ArrayContains"] = 0] = "ArrayContains";
  ValueErrorType2[ValueErrorType2["ArrayMaxContains"] = 1] = "ArrayMaxContains";
  ValueErrorType2[ValueErrorType2["ArrayMaxItems"] = 2] = "ArrayMaxItems";
  ValueErrorType2[ValueErrorType2["ArrayMinContains"] = 3] = "ArrayMinContains";
  ValueErrorType2[ValueErrorType2["ArrayMinItems"] = 4] = "ArrayMinItems";
  ValueErrorType2[ValueErrorType2["ArrayUniqueItems"] = 5] = "ArrayUniqueItems";
  ValueErrorType2[ValueErrorType2["Array"] = 6] = "Array";
  ValueErrorType2[ValueErrorType2["AsyncIterator"] = 7] = "AsyncIterator";
  ValueErrorType2[ValueErrorType2["BigIntExclusiveMaximum"] = 8] = "BigIntExclusiveMaximum";
  ValueErrorType2[ValueErrorType2["BigIntExclusiveMinimum"] = 9] = "BigIntExclusiveMinimum";
  ValueErrorType2[ValueErrorType2["BigIntMaximum"] = 10] = "BigIntMaximum";
  ValueErrorType2[ValueErrorType2["BigIntMinimum"] = 11] = "BigIntMinimum";
  ValueErrorType2[ValueErrorType2["BigIntMultipleOf"] = 12] = "BigIntMultipleOf";
  ValueErrorType2[ValueErrorType2["BigInt"] = 13] = "BigInt";
  ValueErrorType2[ValueErrorType2["Boolean"] = 14] = "Boolean";
  ValueErrorType2[ValueErrorType2["DateExclusiveMaximumTimestamp"] = 15] = "DateExclusiveMaximumTimestamp";
  ValueErrorType2[ValueErrorType2["DateExclusiveMinimumTimestamp"] = 16] = "DateExclusiveMinimumTimestamp";
  ValueErrorType2[ValueErrorType2["DateMaximumTimestamp"] = 17] = "DateMaximumTimestamp";
  ValueErrorType2[ValueErrorType2["DateMinimumTimestamp"] = 18] = "DateMinimumTimestamp";
  ValueErrorType2[ValueErrorType2["DateMultipleOfTimestamp"] = 19] = "DateMultipleOfTimestamp";
  ValueErrorType2[ValueErrorType2["Date"] = 20] = "Date";
  ValueErrorType2[ValueErrorType2["Function"] = 21] = "Function";
  ValueErrorType2[ValueErrorType2["IntegerExclusiveMaximum"] = 22] = "IntegerExclusiveMaximum";
  ValueErrorType2[ValueErrorType2["IntegerExclusiveMinimum"] = 23] = "IntegerExclusiveMinimum";
  ValueErrorType2[ValueErrorType2["IntegerMaximum"] = 24] = "IntegerMaximum";
  ValueErrorType2[ValueErrorType2["IntegerMinimum"] = 25] = "IntegerMinimum";
  ValueErrorType2[ValueErrorType2["IntegerMultipleOf"] = 26] = "IntegerMultipleOf";
  ValueErrorType2[ValueErrorType2["Integer"] = 27] = "Integer";
  ValueErrorType2[ValueErrorType2["IntersectUnevaluatedProperties"] = 28] = "IntersectUnevaluatedProperties";
  ValueErrorType2[ValueErrorType2["Intersect"] = 29] = "Intersect";
  ValueErrorType2[ValueErrorType2["Iterator"] = 30] = "Iterator";
  ValueErrorType2[ValueErrorType2["Kind"] = 31] = "Kind";
  ValueErrorType2[ValueErrorType2["Literal"] = 32] = "Literal";
  ValueErrorType2[ValueErrorType2["Never"] = 33] = "Never";
  ValueErrorType2[ValueErrorType2["Not"] = 34] = "Not";
  ValueErrorType2[ValueErrorType2["Null"] = 35] = "Null";
  ValueErrorType2[ValueErrorType2["NumberExclusiveMaximum"] = 36] = "NumberExclusiveMaximum";
  ValueErrorType2[ValueErrorType2["NumberExclusiveMinimum"] = 37] = "NumberExclusiveMinimum";
  ValueErrorType2[ValueErrorType2["NumberMaximum"] = 38] = "NumberMaximum";
  ValueErrorType2[ValueErrorType2["NumberMinimum"] = 39] = "NumberMinimum";
  ValueErrorType2[ValueErrorType2["NumberMultipleOf"] = 40] = "NumberMultipleOf";
  ValueErrorType2[ValueErrorType2["Number"] = 41] = "Number";
  ValueErrorType2[ValueErrorType2["ObjectAdditionalProperties"] = 42] = "ObjectAdditionalProperties";
  ValueErrorType2[ValueErrorType2["ObjectMaxProperties"] = 43] = "ObjectMaxProperties";
  ValueErrorType2[ValueErrorType2["ObjectMinProperties"] = 44] = "ObjectMinProperties";
  ValueErrorType2[ValueErrorType2["ObjectRequiredProperty"] = 45] = "ObjectRequiredProperty";
  ValueErrorType2[ValueErrorType2["Object"] = 46] = "Object";
  ValueErrorType2[ValueErrorType2["Promise"] = 47] = "Promise";
  ValueErrorType2[ValueErrorType2["RegExp"] = 48] = "RegExp";
  ValueErrorType2[ValueErrorType2["StringFormatUnknown"] = 49] = "StringFormatUnknown";
  ValueErrorType2[ValueErrorType2["StringFormat"] = 50] = "StringFormat";
  ValueErrorType2[ValueErrorType2["StringMaxLength"] = 51] = "StringMaxLength";
  ValueErrorType2[ValueErrorType2["StringMinLength"] = 52] = "StringMinLength";
  ValueErrorType2[ValueErrorType2["StringPattern"] = 53] = "StringPattern";
  ValueErrorType2[ValueErrorType2["String"] = 54] = "String";
  ValueErrorType2[ValueErrorType2["Symbol"] = 55] = "Symbol";
  ValueErrorType2[ValueErrorType2["TupleLength"] = 56] = "TupleLength";
  ValueErrorType2[ValueErrorType2["Tuple"] = 57] = "Tuple";
  ValueErrorType2[ValueErrorType2["Uint8ArrayMaxByteLength"] = 58] = "Uint8ArrayMaxByteLength";
  ValueErrorType2[ValueErrorType2["Uint8ArrayMinByteLength"] = 59] = "Uint8ArrayMinByteLength";
  ValueErrorType2[ValueErrorType2["Uint8Array"] = 60] = "Uint8Array";
  ValueErrorType2[ValueErrorType2["Undefined"] = 61] = "Undefined";
  ValueErrorType2[ValueErrorType2["Union"] = 62] = "Union";
  ValueErrorType2[ValueErrorType2["Void"] = 63] = "Void";
})(ValueErrorType || (ValueErrorType = {}));
var ValueErrorsUnknownTypeError = class extends TypeBoxError {
  constructor(schema) {
    super("Unknown type");
    this.schema = schema;
  }
};
function EscapeKey(key) {
  return key.replace(/~/g, "~0").replace(/\//g, "~1");
}
function IsDefined2(value) {
  return value !== void 0;
}
var ValueErrorIterator = class {
  constructor(iterator) {
    this.iterator = iterator;
  }
  [Symbol.iterator]() {
    return this.iterator;
  }
  /** Returns the first value error or undefined if no errors */
  First() {
    const next = this.iterator.next();
    return next.done ? void 0 : next.value;
  }
};
function Create(errorType, schema, path, value, errors = []) {
  return {
    type: errorType,
    schema,
    path,
    value,
    message: GetErrorFunction()({ errorType, path, schema, value, errors }),
    errors
  };
}
function* FromAny3(schema, references, path, value) {
}
function* FromArgument3(schema, references, path, value) {
}
function* FromArray8(schema, references, path, value) {
  if (!IsArray2(value)) {
    return yield Create(ValueErrorType.Array, schema, path, value);
  }
  if (IsDefined2(schema.minItems) && !(value.length >= schema.minItems)) {
    yield Create(ValueErrorType.ArrayMinItems, schema, path, value);
  }
  if (IsDefined2(schema.maxItems) && !(value.length <= schema.maxItems)) {
    yield Create(ValueErrorType.ArrayMaxItems, schema, path, value);
  }
  for (let i = 0; i < value.length; i++) {
    yield* Visit6(schema.items, references, `${path}/${i}`, value[i]);
  }
  if (schema.uniqueItems === true && !(function() {
    const set = /* @__PURE__ */ new Set();
    for (const element of value) {
      const hashed = Hash(element);
      if (set.has(hashed)) {
        return false;
      } else {
        set.add(hashed);
      }
    }
    return true;
  })()) {
    yield Create(ValueErrorType.ArrayUniqueItems, schema, path, value);
  }
  if (!(IsDefined2(schema.contains) || IsDefined2(schema.minContains) || IsDefined2(schema.maxContains))) {
    return;
  }
  const containsSchema = IsDefined2(schema.contains) ? schema.contains : Never();
  const containsCount = value.reduce((acc, value2, index) => Visit6(containsSchema, references, `${path}${index}`, value2).next().done === true ? acc + 1 : acc, 0);
  if (containsCount === 0) {
    yield Create(ValueErrorType.ArrayContains, schema, path, value);
  }
  if (IsNumber2(schema.minContains) && containsCount < schema.minContains) {
    yield Create(ValueErrorType.ArrayMinContains, schema, path, value);
  }
  if (IsNumber2(schema.maxContains) && containsCount > schema.maxContains) {
    yield Create(ValueErrorType.ArrayMaxContains, schema, path, value);
  }
}
function* FromAsyncIterator5(schema, references, path, value) {
  if (!IsAsyncIterator2(value))
    yield Create(ValueErrorType.AsyncIterator, schema, path, value);
}
function* FromBigInt3(schema, references, path, value) {
  if (!IsBigInt2(value))
    return yield Create(ValueErrorType.BigInt, schema, path, value);
  if (IsDefined2(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    yield Create(ValueErrorType.BigIntExclusiveMaximum, schema, path, value);
  }
  if (IsDefined2(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    yield Create(ValueErrorType.BigIntExclusiveMinimum, schema, path, value);
  }
  if (IsDefined2(schema.maximum) && !(value <= schema.maximum)) {
    yield Create(ValueErrorType.BigIntMaximum, schema, path, value);
  }
  if (IsDefined2(schema.minimum) && !(value >= schema.minimum)) {
    yield Create(ValueErrorType.BigIntMinimum, schema, path, value);
  }
  if (IsDefined2(schema.multipleOf) && !(value % schema.multipleOf === BigInt(0))) {
    yield Create(ValueErrorType.BigIntMultipleOf, schema, path, value);
  }
}
function* FromBoolean3(schema, references, path, value) {
  if (!IsBoolean2(value))
    yield Create(ValueErrorType.Boolean, schema, path, value);
}
function* FromConstructor5(schema, references, path, value) {
  yield* Visit6(schema.returns, references, path, value.prototype);
}
function* FromDate3(schema, references, path, value) {
  if (!IsDate2(value))
    return yield Create(ValueErrorType.Date, schema, path, value);
  if (IsDefined2(schema.exclusiveMaximumTimestamp) && !(value.getTime() < schema.exclusiveMaximumTimestamp)) {
    yield Create(ValueErrorType.DateExclusiveMaximumTimestamp, schema, path, value);
  }
  if (IsDefined2(schema.exclusiveMinimumTimestamp) && !(value.getTime() > schema.exclusiveMinimumTimestamp)) {
    yield Create(ValueErrorType.DateExclusiveMinimumTimestamp, schema, path, value);
  }
  if (IsDefined2(schema.maximumTimestamp) && !(value.getTime() <= schema.maximumTimestamp)) {
    yield Create(ValueErrorType.DateMaximumTimestamp, schema, path, value);
  }
  if (IsDefined2(schema.minimumTimestamp) && !(value.getTime() >= schema.minimumTimestamp)) {
    yield Create(ValueErrorType.DateMinimumTimestamp, schema, path, value);
  }
  if (IsDefined2(schema.multipleOfTimestamp) && !(value.getTime() % schema.multipleOfTimestamp === 0)) {
    yield Create(ValueErrorType.DateMultipleOfTimestamp, schema, path, value);
  }
}
function* FromFunction5(schema, references, path, value) {
  if (!IsFunction2(value))
    yield Create(ValueErrorType.Function, schema, path, value);
}
function* FromImport2(schema, references, path, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  yield* Visit6(target, [...references, ...definitions], path, value);
}
function* FromInteger3(schema, references, path, value) {
  if (!IsInteger(value))
    return yield Create(ValueErrorType.Integer, schema, path, value);
  if (IsDefined2(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    yield Create(ValueErrorType.IntegerExclusiveMaximum, schema, path, value);
  }
  if (IsDefined2(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    yield Create(ValueErrorType.IntegerExclusiveMinimum, schema, path, value);
  }
  if (IsDefined2(schema.maximum) && !(value <= schema.maximum)) {
    yield Create(ValueErrorType.IntegerMaximum, schema, path, value);
  }
  if (IsDefined2(schema.minimum) && !(value >= schema.minimum)) {
    yield Create(ValueErrorType.IntegerMinimum, schema, path, value);
  }
  if (IsDefined2(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
    yield Create(ValueErrorType.IntegerMultipleOf, schema, path, value);
  }
}
function* FromIntersect10(schema, references, path, value) {
  let hasError = false;
  for (const inner of schema.allOf) {
    for (const error of Visit6(inner, references, path, value)) {
      hasError = true;
      yield error;
    }
  }
  if (hasError) {
    return yield Create(ValueErrorType.Intersect, schema, path, value);
  }
  if (schema.unevaluatedProperties === false) {
    const keyCheck = new RegExp(KeyOfPattern(schema));
    for (const valueKey of Object.getOwnPropertyNames(value)) {
      if (!keyCheck.test(valueKey)) {
        yield Create(ValueErrorType.IntersectUnevaluatedProperties, schema, `${path}/${valueKey}`, value);
      }
    }
  }
  if (typeof schema.unevaluatedProperties === "object") {
    const keyCheck = new RegExp(KeyOfPattern(schema));
    for (const valueKey of Object.getOwnPropertyNames(value)) {
      if (!keyCheck.test(valueKey)) {
        const next = Visit6(schema.unevaluatedProperties, references, `${path}/${valueKey}`, value[valueKey]).next();
        if (!next.done)
          yield next.value;
      }
    }
  }
}
function* FromIterator5(schema, references, path, value) {
  if (!IsIterator2(value))
    yield Create(ValueErrorType.Iterator, schema, path, value);
}
function* FromLiteral4(schema, references, path, value) {
  if (!(value === schema.const))
    yield Create(ValueErrorType.Literal, schema, path, value);
}
function* FromNever3(schema, references, path, value) {
  yield Create(ValueErrorType.Never, schema, path, value);
}
function* FromNot3(schema, references, path, value) {
  if (Visit6(schema.not, references, path, value).next().done === true)
    yield Create(ValueErrorType.Not, schema, path, value);
}
function* FromNull3(schema, references, path, value) {
  if (!IsNull2(value))
    yield Create(ValueErrorType.Null, schema, path, value);
}
function* FromNumber3(schema, references, path, value) {
  if (!TypeSystemPolicy.IsNumberLike(value))
    return yield Create(ValueErrorType.Number, schema, path, value);
  if (IsDefined2(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    yield Create(ValueErrorType.NumberExclusiveMaximum, schema, path, value);
  }
  if (IsDefined2(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    yield Create(ValueErrorType.NumberExclusiveMinimum, schema, path, value);
  }
  if (IsDefined2(schema.maximum) && !(value <= schema.maximum)) {
    yield Create(ValueErrorType.NumberMaximum, schema, path, value);
  }
  if (IsDefined2(schema.minimum) && !(value >= schema.minimum)) {
    yield Create(ValueErrorType.NumberMinimum, schema, path, value);
  }
  if (IsDefined2(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
    yield Create(ValueErrorType.NumberMultipleOf, schema, path, value);
  }
}
function* FromObject9(schema, references, path, value) {
  if (!TypeSystemPolicy.IsObjectLike(value))
    return yield Create(ValueErrorType.Object, schema, path, value);
  if (IsDefined2(schema.minProperties) && !(Object.getOwnPropertyNames(value).length >= schema.minProperties)) {
    yield Create(ValueErrorType.ObjectMinProperties, schema, path, value);
  }
  if (IsDefined2(schema.maxProperties) && !(Object.getOwnPropertyNames(value).length <= schema.maxProperties)) {
    yield Create(ValueErrorType.ObjectMaxProperties, schema, path, value);
  }
  const requiredKeys = Array.isArray(schema.required) ? schema.required : [];
  const knownKeys = Object.getOwnPropertyNames(schema.properties);
  const unknownKeys = Object.getOwnPropertyNames(value);
  for (const requiredKey of requiredKeys) {
    if (unknownKeys.includes(requiredKey))
      continue;
    yield Create(ValueErrorType.ObjectRequiredProperty, schema.properties[requiredKey], `${path}/${EscapeKey(requiredKey)}`, void 0);
  }
  if (schema.additionalProperties === false) {
    for (const valueKey of unknownKeys) {
      if (!knownKeys.includes(valueKey)) {
        yield Create(ValueErrorType.ObjectAdditionalProperties, schema, `${path}/${EscapeKey(valueKey)}`, value[valueKey]);
      }
    }
  }
  if (typeof schema.additionalProperties === "object") {
    for (const valueKey of unknownKeys) {
      if (knownKeys.includes(valueKey))
        continue;
      yield* Visit6(schema.additionalProperties, references, `${path}/${EscapeKey(valueKey)}`, value[valueKey]);
    }
  }
  for (const knownKey of knownKeys) {
    const property = schema.properties[knownKey];
    if (schema.required && schema.required.includes(knownKey)) {
      yield* Visit6(property, references, `${path}/${EscapeKey(knownKey)}`, value[knownKey]);
      if (ExtendsUndefinedCheck(schema) && !(knownKey in value)) {
        yield Create(ValueErrorType.ObjectRequiredProperty, property, `${path}/${EscapeKey(knownKey)}`, void 0);
      }
    } else {
      if (TypeSystemPolicy.IsExactOptionalProperty(value, knownKey)) {
        yield* Visit6(property, references, `${path}/${EscapeKey(knownKey)}`, value[knownKey]);
      }
    }
  }
}
function* FromPromise5(schema, references, path, value) {
  if (!IsPromise(value))
    yield Create(ValueErrorType.Promise, schema, path, value);
}
function* FromRecord5(schema, references, path, value) {
  if (!TypeSystemPolicy.IsRecordLike(value))
    return yield Create(ValueErrorType.Object, schema, path, value);
  if (IsDefined2(schema.minProperties) && !(Object.getOwnPropertyNames(value).length >= schema.minProperties)) {
    yield Create(ValueErrorType.ObjectMinProperties, schema, path, value);
  }
  if (IsDefined2(schema.maxProperties) && !(Object.getOwnPropertyNames(value).length <= schema.maxProperties)) {
    yield Create(ValueErrorType.ObjectMaxProperties, schema, path, value);
  }
  const [patternKey, patternSchema] = Object.entries(schema.patternProperties)[0];
  const regex = new RegExp(patternKey);
  for (const [propertyKey, propertyValue] of Object.entries(value)) {
    if (regex.test(propertyKey))
      yield* Visit6(patternSchema, references, `${path}/${EscapeKey(propertyKey)}`, propertyValue);
  }
  if (typeof schema.additionalProperties === "object") {
    for (const [propertyKey, propertyValue] of Object.entries(value)) {
      if (!regex.test(propertyKey))
        yield* Visit6(schema.additionalProperties, references, `${path}/${EscapeKey(propertyKey)}`, propertyValue);
    }
  }
  if (schema.additionalProperties === false) {
    for (const [propertyKey, propertyValue] of Object.entries(value)) {
      if (regex.test(propertyKey))
        continue;
      return yield Create(ValueErrorType.ObjectAdditionalProperties, schema, `${path}/${EscapeKey(propertyKey)}`, propertyValue);
    }
  }
}
function* FromRef6(schema, references, path, value) {
  yield* Visit6(Deref(schema, references), references, path, value);
}
function* FromRegExp3(schema, references, path, value) {
  if (!IsString2(value))
    return yield Create(ValueErrorType.String, schema, path, value);
  if (IsDefined2(schema.minLength) && !(value.length >= schema.minLength)) {
    yield Create(ValueErrorType.StringMinLength, schema, path, value);
  }
  if (IsDefined2(schema.maxLength) && !(value.length <= schema.maxLength)) {
    yield Create(ValueErrorType.StringMaxLength, schema, path, value);
  }
  const regex = new RegExp(schema.source, schema.flags);
  if (!regex.test(value)) {
    return yield Create(ValueErrorType.RegExp, schema, path, value);
  }
}
function* FromString3(schema, references, path, value) {
  if (!IsString2(value))
    return yield Create(ValueErrorType.String, schema, path, value);
  if (IsDefined2(schema.minLength) && !(value.length >= schema.minLength)) {
    yield Create(ValueErrorType.StringMinLength, schema, path, value);
  }
  if (IsDefined2(schema.maxLength) && !(value.length <= schema.maxLength)) {
    yield Create(ValueErrorType.StringMaxLength, schema, path, value);
  }
  if (IsString2(schema.pattern)) {
    const regex = new RegExp(schema.pattern);
    if (!regex.test(value)) {
      yield Create(ValueErrorType.StringPattern, schema, path, value);
    }
  }
  if (IsString2(schema.format)) {
    if (!format_exports.Has(schema.format)) {
      yield Create(ValueErrorType.StringFormatUnknown, schema, path, value);
    } else {
      const format = format_exports.Get(schema.format);
      if (!format(value)) {
        yield Create(ValueErrorType.StringFormat, schema, path, value);
      }
    }
  }
}
function* FromSymbol3(schema, references, path, value) {
  if (!IsSymbol2(value))
    yield Create(ValueErrorType.Symbol, schema, path, value);
}
function* FromTemplateLiteral5(schema, references, path, value) {
  if (!IsString2(value))
    return yield Create(ValueErrorType.String, schema, path, value);
  const regex = new RegExp(schema.pattern);
  if (!regex.test(value)) {
    yield Create(ValueErrorType.StringPattern, schema, path, value);
  }
}
function* FromThis2(schema, references, path, value) {
  yield* Visit6(Deref(schema, references), references, path, value);
}
function* FromTuple7(schema, references, path, value) {
  if (!IsArray2(value))
    return yield Create(ValueErrorType.Tuple, schema, path, value);
  if (schema.items === void 0 && !(value.length === 0)) {
    return yield Create(ValueErrorType.TupleLength, schema, path, value);
  }
  if (!(value.length === schema.maxItems)) {
    return yield Create(ValueErrorType.TupleLength, schema, path, value);
  }
  if (!schema.items) {
    return;
  }
  for (let i = 0; i < schema.items.length; i++) {
    yield* Visit6(schema.items[i], references, `${path}/${i}`, value[i]);
  }
}
function* FromUndefined3(schema, references, path, value) {
  if (!IsUndefined2(value))
    yield Create(ValueErrorType.Undefined, schema, path, value);
}
function* FromUnion12(schema, references, path, value) {
  if (Check(schema, references, value))
    return;
  const errors = schema.anyOf.map((variant) => new ValueErrorIterator(Visit6(variant, references, path, value)));
  yield Create(ValueErrorType.Union, schema, path, value, errors);
}
function* FromUint8Array3(schema, references, path, value) {
  if (!IsUint8Array2(value))
    return yield Create(ValueErrorType.Uint8Array, schema, path, value);
  if (IsDefined2(schema.maxByteLength) && !(value.length <= schema.maxByteLength)) {
    yield Create(ValueErrorType.Uint8ArrayMaxByteLength, schema, path, value);
  }
  if (IsDefined2(schema.minByteLength) && !(value.length >= schema.minByteLength)) {
    yield Create(ValueErrorType.Uint8ArrayMinByteLength, schema, path, value);
  }
}
function* FromUnknown3(schema, references, path, value) {
}
function* FromVoid3(schema, references, path, value) {
  if (!TypeSystemPolicy.IsVoidLike(value))
    yield Create(ValueErrorType.Void, schema, path, value);
}
function* FromKind2(schema, references, path, value) {
  const check4 = type_exports2.Get(schema[Kind]);
  if (!check4(schema, value))
    yield Create(ValueErrorType.Kind, schema, path, value);
}
function* Visit6(schema, references, path, value) {
  const references_ = IsDefined2(schema.$id) ? [...references, schema] : references;
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Any":
      return yield* FromAny3(schema_, references_, path, value);
    case "Argument":
      return yield* FromArgument3(schema_, references_, path, value);
    case "Array":
      return yield* FromArray8(schema_, references_, path, value);
    case "AsyncIterator":
      return yield* FromAsyncIterator5(schema_, references_, path, value);
    case "BigInt":
      return yield* FromBigInt3(schema_, references_, path, value);
    case "Boolean":
      return yield* FromBoolean3(schema_, references_, path, value);
    case "Constructor":
      return yield* FromConstructor5(schema_, references_, path, value);
    case "Date":
      return yield* FromDate3(schema_, references_, path, value);
    case "Function":
      return yield* FromFunction5(schema_, references_, path, value);
    case "Import":
      return yield* FromImport2(schema_, references_, path, value);
    case "Integer":
      return yield* FromInteger3(schema_, references_, path, value);
    case "Intersect":
      return yield* FromIntersect10(schema_, references_, path, value);
    case "Iterator":
      return yield* FromIterator5(schema_, references_, path, value);
    case "Literal":
      return yield* FromLiteral4(schema_, references_, path, value);
    case "Never":
      return yield* FromNever3(schema_, references_, path, value);
    case "Not":
      return yield* FromNot3(schema_, references_, path, value);
    case "Null":
      return yield* FromNull3(schema_, references_, path, value);
    case "Number":
      return yield* FromNumber3(schema_, references_, path, value);
    case "Object":
      return yield* FromObject9(schema_, references_, path, value);
    case "Promise":
      return yield* FromPromise5(schema_, references_, path, value);
    case "Record":
      return yield* FromRecord5(schema_, references_, path, value);
    case "Ref":
      return yield* FromRef6(schema_, references_, path, value);
    case "RegExp":
      return yield* FromRegExp3(schema_, references_, path, value);
    case "String":
      return yield* FromString3(schema_, references_, path, value);
    case "Symbol":
      return yield* FromSymbol3(schema_, references_, path, value);
    case "TemplateLiteral":
      return yield* FromTemplateLiteral5(schema_, references_, path, value);
    case "This":
      return yield* FromThis2(schema_, references_, path, value);
    case "Tuple":
      return yield* FromTuple7(schema_, references_, path, value);
    case "Undefined":
      return yield* FromUndefined3(schema_, references_, path, value);
    case "Union":
      return yield* FromUnion12(schema_, references_, path, value);
    case "Uint8Array":
      return yield* FromUint8Array3(schema_, references_, path, value);
    case "Unknown":
      return yield* FromUnknown3(schema_, references_, path, value);
    case "Void":
      return yield* FromVoid3(schema_, references_, path, value);
    default:
      if (!type_exports2.Has(schema_[Kind]))
        throw new ValueErrorsUnknownTypeError(schema);
      return yield* FromKind2(schema_, references_, path, value);
  }
}
function Errors(...args) {
  const iterator = args.length === 3 ? Visit6(args[0], args[1], "", args[2]) : Visit6(args[0], [], "", args[1]);
  return new ValueErrorIterator(iterator);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/assert/assert.mjs
var __classPrivateFieldSet = function(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet = function(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _AssertError_instances;
var _AssertError_iterator;
var _AssertError_Iterator;
var AssertError = class extends TypeBoxError {
  constructor(iterator) {
    const error = iterator.First();
    super(error === void 0 ? "Invalid Value" : error.message);
    _AssertError_instances.add(this);
    _AssertError_iterator.set(this, void 0);
    __classPrivateFieldSet(this, _AssertError_iterator, iterator, "f");
    this.error = error;
  }
  /** Returns an iterator for each error in this value. */
  Errors() {
    return new ValueErrorIterator(__classPrivateFieldGet(this, _AssertError_instances, "m", _AssertError_Iterator).call(this));
  }
};
_AssertError_iterator = /* @__PURE__ */ new WeakMap(), _AssertError_instances = /* @__PURE__ */ new WeakSet(), _AssertError_Iterator = function* _AssertError_Iterator2() {
  if (this.error)
    yield this.error;
  yield* __classPrivateFieldGet(this, _AssertError_iterator, "f");
};
function AssertValue(schema, references, value) {
  if (Check(schema, references, value))
    return;
  throw new AssertError(Errors(schema, references, value));
}
function Assert(...args) {
  return args.length === 3 ? AssertValue(args[0], args[1], args[2]) : AssertValue(args[0], [], args[1]);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/clone/clone.mjs
function FromObject10(value) {
  const Acc = {};
  for (const key of Object.getOwnPropertyNames(value)) {
    Acc[key] = Clone2(value[key]);
  }
  for (const key of Object.getOwnPropertySymbols(value)) {
    Acc[key] = Clone2(value[key]);
  }
  return Acc;
}
function FromArray9(value) {
  return value.map((element) => Clone2(element));
}
function FromTypedArray(value) {
  return value.slice();
}
function FromMap(value) {
  return new Map(Clone2([...value.entries()]));
}
function FromSet(value) {
  return new Set(Clone2([...value.entries()]));
}
function FromDate4(value) {
  return new Date(value.toISOString());
}
function FromValue2(value) {
  return value;
}
function Clone2(value) {
  if (IsArray2(value))
    return FromArray9(value);
  if (IsDate2(value))
    return FromDate4(value);
  if (IsTypedArray(value))
    return FromTypedArray(value);
  if (IsMap(value))
    return FromMap(value);
  if (IsSet(value))
    return FromSet(value);
  if (IsObject2(value))
    return FromObject10(value);
  if (IsValueType(value))
    return FromValue2(value);
  throw new Error("ValueClone: Unable to clone value");
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/create/create.mjs
var ValueCreateError = class extends TypeBoxError {
  constructor(schema, message) {
    super(message);
    this.schema = schema;
  }
};
function FromDefault(value) {
  return IsFunction2(value) ? value() : Clone2(value);
}
function FromAny4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return {};
  }
}
function FromArgument4(schema, references) {
  return {};
}
function FromArray10(schema, references) {
  if (schema.uniqueItems === true && !HasPropertyKey2(schema, "default")) {
    throw new ValueCreateError(schema, "Array with the uniqueItems constraint requires a default value");
  } else if ("contains" in schema && !HasPropertyKey2(schema, "default")) {
    throw new ValueCreateError(schema, "Array with the contains constraint requires a default value");
  } else if ("default" in schema) {
    return FromDefault(schema.default);
  } else if (schema.minItems !== void 0) {
    return Array.from({ length: schema.minItems }).map((item) => {
      return Visit7(schema.items, references);
    });
  } else {
    return [];
  }
}
function FromAsyncIterator6(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return (async function* () {
    })();
  }
}
function FromBigInt4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return BigInt(0);
  }
}
function FromBoolean4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return false;
  }
}
function FromConstructor6(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    const value = Visit7(schema.returns, references);
    if (typeof value === "object" && !Array.isArray(value)) {
      return class {
        constructor() {
          for (const [key, val] of Object.entries(value)) {
            const self = this;
            self[key] = val;
          }
        }
      };
    } else {
      return class {
      };
    }
  }
}
function FromDate5(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.minimumTimestamp !== void 0) {
    return new Date(schema.minimumTimestamp);
  } else {
    return /* @__PURE__ */ new Date();
  }
}
function FromFunction6(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return () => Visit7(schema.returns, references);
  }
}
function FromImport3(schema, references) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit7(target, [...references, ...definitions]);
}
function FromInteger4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.minimum !== void 0) {
    return schema.minimum;
  } else {
    return 0;
  }
}
function FromIntersect11(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    const value = schema.allOf.reduce((acc, schema2) => {
      const next = Visit7(schema2, references);
      return typeof next === "object" ? { ...acc, ...next } : next;
    }, {});
    if (!Check(schema, references, value))
      throw new ValueCreateError(schema, "Intersect produced invalid value. Consider using a default value.");
    return value;
  }
}
function FromIterator6(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return (function* () {
    })();
  }
}
function FromLiteral5(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return schema.const;
  }
}
function FromNever4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    throw new ValueCreateError(schema, "Never types cannot be created. Consider using a default value.");
  }
}
function FromNot4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    throw new ValueCreateError(schema, "Not types must have a default value");
  }
}
function FromNull4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return null;
  }
}
function FromNumber4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.minimum !== void 0) {
    return schema.minimum;
  } else {
    return 0;
  }
}
function FromObject11(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    const required = new Set(schema.required);
    const Acc = {};
    for (const [key, subschema] of Object.entries(schema.properties)) {
      if (!required.has(key))
        continue;
      Acc[key] = Visit7(subschema, references);
    }
    return Acc;
  }
}
function FromPromise6(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return Promise.resolve(Visit7(schema.item, references));
  }
}
function FromRecord6(schema, references) {
  const [keyPattern, valueSchema] = Object.entries(schema.patternProperties)[0];
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else if (!(keyPattern === PatternStringExact || keyPattern === PatternNumberExact)) {
    const propertyKeys = keyPattern.slice(1, keyPattern.length - 1).split("|");
    const Acc = {};
    for (const key of propertyKeys)
      Acc[key] = Visit7(valueSchema, references);
    return Acc;
  } else {
    return {};
  }
}
function FromRef7(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return Visit7(Deref(schema, references), references);
  }
}
function FromRegExp4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    throw new ValueCreateError(schema, "RegExp types cannot be created. Consider using a default value.");
  }
}
function FromString4(schema, references) {
  if (schema.pattern !== void 0) {
    if (!HasPropertyKey2(schema, "default")) {
      throw new ValueCreateError(schema, "String types with patterns must specify a default value");
    } else {
      return FromDefault(schema.default);
    }
  } else if (schema.format !== void 0) {
    if (!HasPropertyKey2(schema, "default")) {
      throw new ValueCreateError(schema, "String types with formats must specify a default value");
    } else {
      return FromDefault(schema.default);
    }
  } else {
    if (HasPropertyKey2(schema, "default")) {
      return FromDefault(schema.default);
    } else if (schema.minLength !== void 0) {
      return Array.from({ length: schema.minLength }).map(() => " ").join("");
    } else {
      return "";
    }
  }
}
function FromSymbol4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else if ("value" in schema) {
    return Symbol.for(schema.value);
  } else {
    return /* @__PURE__ */ Symbol();
  }
}
function FromTemplateLiteral6(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  }
  if (!IsTemplateLiteralFinite(schema))
    throw new ValueCreateError(schema, "Can only create template literals that produce a finite variants. Consider using a default value.");
  const generated = TemplateLiteralGenerate(schema);
  return generated[0];
}
function FromThis3(schema, references) {
  if (recursiveDepth++ > recursiveMaxDepth)
    throw new ValueCreateError(schema, "Cannot create recursive type as it appears possibly infinite. Consider using a default.");
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return Visit7(Deref(schema, references), references);
  }
}
function FromTuple8(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  }
  if (schema.items === void 0) {
    return [];
  } else {
    return Array.from({ length: schema.minItems }).map((_, index) => Visit7(schema.items[index], references));
  }
}
function FromUndefined4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return void 0;
  }
}
function FromUnion13(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.anyOf.length === 0) {
    throw new Error("ValueCreate.Union: Cannot create Union with zero variants");
  } else {
    return Visit7(schema.anyOf[0], references);
  }
}
function FromUint8Array4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.minByteLength !== void 0) {
    return new Uint8Array(schema.minByteLength);
  } else {
    return new Uint8Array(0);
  }
}
function FromUnknown4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return {};
  }
}
function FromVoid4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return void 0;
  }
}
function FromKind3(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    throw new Error("User defined types must specify a default value");
  }
}
function Visit7(schema, references) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Any":
      return FromAny4(schema_, references_);
    case "Argument":
      return FromArgument4(schema_, references_);
    case "Array":
      return FromArray10(schema_, references_);
    case "AsyncIterator":
      return FromAsyncIterator6(schema_, references_);
    case "BigInt":
      return FromBigInt4(schema_, references_);
    case "Boolean":
      return FromBoolean4(schema_, references_);
    case "Constructor":
      return FromConstructor6(schema_, references_);
    case "Date":
      return FromDate5(schema_, references_);
    case "Function":
      return FromFunction6(schema_, references_);
    case "Import":
      return FromImport3(schema_, references_);
    case "Integer":
      return FromInteger4(schema_, references_);
    case "Intersect":
      return FromIntersect11(schema_, references_);
    case "Iterator":
      return FromIterator6(schema_, references_);
    case "Literal":
      return FromLiteral5(schema_, references_);
    case "Never":
      return FromNever4(schema_, references_);
    case "Not":
      return FromNot4(schema_, references_);
    case "Null":
      return FromNull4(schema_, references_);
    case "Number":
      return FromNumber4(schema_, references_);
    case "Object":
      return FromObject11(schema_, references_);
    case "Promise":
      return FromPromise6(schema_, references_);
    case "Record":
      return FromRecord6(schema_, references_);
    case "Ref":
      return FromRef7(schema_, references_);
    case "RegExp":
      return FromRegExp4(schema_, references_);
    case "String":
      return FromString4(schema_, references_);
    case "Symbol":
      return FromSymbol4(schema_, references_);
    case "TemplateLiteral":
      return FromTemplateLiteral6(schema_, references_);
    case "This":
      return FromThis3(schema_, references_);
    case "Tuple":
      return FromTuple8(schema_, references_);
    case "Undefined":
      return FromUndefined4(schema_, references_);
    case "Union":
      return FromUnion13(schema_, references_);
    case "Uint8Array":
      return FromUint8Array4(schema_, references_);
    case "Unknown":
      return FromUnknown4(schema_, references_);
    case "Void":
      return FromVoid4(schema_, references_);
    default:
      if (!type_exports2.Has(schema_[Kind]))
        throw new ValueCreateError(schema_, "Unknown type");
      return FromKind3(schema_, references_);
  }
}
var recursiveMaxDepth = 512;
var recursiveDepth = 0;
function Create2(...args) {
  recursiveDepth = 0;
  return args.length === 2 ? Visit7(args[0], args[1]) : Visit7(args[0], []);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/cast/cast.mjs
var ValueCastError = class extends TypeBoxError {
  constructor(schema, message) {
    super(message);
    this.schema = schema;
  }
};
function ScoreUnion(schema, references, value) {
  if (schema[Kind] === "Object" && typeof value === "object" && !IsNull2(value)) {
    const object = schema;
    const keys = Object.getOwnPropertyNames(value);
    const entries = Object.entries(object.properties);
    const [point, max] = [1 / entries.length, entries.length];
    return entries.reduce((acc, [key, schema2]) => {
      const literal = schema2[Kind] === "Literal" && schema2.const === value[key] ? max : 0;
      const checks = Check(schema2, references, value[key]) ? point : 0;
      const exists = keys.includes(key) ? point : 0;
      return acc + (literal + checks + exists);
    }, 0);
  } else {
    return Check(schema, references, value) ? 1 : 0;
  }
}
function SelectUnion(union, references, value) {
  const schemas = union.anyOf.map((schema) => Deref(schema, references));
  let [select, best] = [schemas[0], 0];
  for (const schema of schemas) {
    const score = ScoreUnion(schema, references, value);
    if (score > best) {
      select = schema;
      best = score;
    }
  }
  return select;
}
function CastUnion(union, references, value) {
  if ("default" in union) {
    return typeof value === "function" ? union.default : Clone2(union.default);
  } else {
    const schema = SelectUnion(union, references, value);
    return Cast(schema, references, value);
  }
}
function DefaultClone(schema, references, value) {
  return Check(schema, references, value) ? Clone2(value) : Create2(schema, references);
}
function Default(schema, references, value) {
  return Check(schema, references, value) ? value : Create2(schema, references);
}
function FromArray11(schema, references, value) {
  if (Check(schema, references, value))
    return Clone2(value);
  const created = IsArray2(value) ? Clone2(value) : Create2(schema, references);
  const minimum = IsNumber2(schema.minItems) && created.length < schema.minItems ? [...created, ...Array.from({ length: schema.minItems - created.length }, () => null)] : created;
  const maximum = IsNumber2(schema.maxItems) && minimum.length > schema.maxItems ? minimum.slice(0, schema.maxItems) : minimum;
  const casted = maximum.map((value2) => Visit8(schema.items, references, value2));
  if (schema.uniqueItems !== true)
    return casted;
  const unique = [...new Set(casted)];
  if (!Check(schema, references, unique))
    throw new ValueCastError(schema, "Array cast produced invalid data due to uniqueItems constraint");
  return unique;
}
function FromConstructor7(schema, references, value) {
  if (Check(schema, references, value))
    return Create2(schema, references);
  const required = new Set(schema.returns.required || []);
  const result = function() {
  };
  for (const [key, property] of Object.entries(schema.returns.properties)) {
    if (!required.has(key) && value.prototype[key] === void 0)
      continue;
    result.prototype[key] = Visit8(property, references, value.prototype[key]);
  }
  return result;
}
function FromImport4(schema, references, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit8(target, [...references, ...definitions], value);
}
function FromIntersect12(schema, references, value) {
  const created = Create2(schema, references);
  const mapped = IsObject2(created) && IsObject2(value) ? { ...created, ...value } : value;
  return Check(schema, references, mapped) ? mapped : Create2(schema, references);
}
function FromNever5(schema, references, value) {
  throw new ValueCastError(schema, "Never types cannot be cast");
}
function FromObject12(schema, references, value) {
  if (Check(schema, references, value))
    return value;
  if (value === null || typeof value !== "object")
    return Create2(schema, references);
  const required = new Set(schema.required || []);
  const result = {};
  for (const [key, property] of Object.entries(schema.properties)) {
    if (!required.has(key) && value[key] === void 0)
      continue;
    result[key] = Visit8(property, references, value[key]);
  }
  if (typeof schema.additionalProperties === "object") {
    const propertyNames = Object.getOwnPropertyNames(schema.properties);
    for (const propertyName of Object.getOwnPropertyNames(value)) {
      if (propertyNames.includes(propertyName))
        continue;
      result[propertyName] = Visit8(schema.additionalProperties, references, value[propertyName]);
    }
  }
  return result;
}
function FromRecord7(schema, references, value) {
  if (Check(schema, references, value))
    return Clone2(value);
  if (value === null || typeof value !== "object" || Array.isArray(value) || value instanceof Date)
    return Create2(schema, references);
  const subschemaPropertyName = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const subschema = schema.patternProperties[subschemaPropertyName];
  const result = {};
  for (const [propKey, propValue] of Object.entries(value)) {
    result[propKey] = Visit8(subschema, references, propValue);
  }
  return result;
}
function FromRef8(schema, references, value) {
  return Visit8(Deref(schema, references), references, value);
}
function FromThis4(schema, references, value) {
  return Visit8(Deref(schema, references), references, value);
}
function FromTuple9(schema, references, value) {
  if (Check(schema, references, value))
    return Clone2(value);
  if (!IsArray2(value))
    return Create2(schema, references);
  if (schema.items === void 0)
    return [];
  return schema.items.map((schema2, index) => Visit8(schema2, references, value[index]));
}
function FromUnion14(schema, references, value) {
  return Check(schema, references, value) ? Clone2(value) : CastUnion(schema, references, value);
}
function Visit8(schema, references, value) {
  const references_ = IsString2(schema.$id) ? Pushref(schema, references) : references;
  const schema_ = schema;
  switch (schema[Kind]) {
    // --------------------------------------------------------------
    // Structural
    // --------------------------------------------------------------
    case "Array":
      return FromArray11(schema_, references_, value);
    case "Constructor":
      return FromConstructor7(schema_, references_, value);
    case "Import":
      return FromImport4(schema_, references_, value);
    case "Intersect":
      return FromIntersect12(schema_, references_, value);
    case "Never":
      return FromNever5(schema_, references_, value);
    case "Object":
      return FromObject12(schema_, references_, value);
    case "Record":
      return FromRecord7(schema_, references_, value);
    case "Ref":
      return FromRef8(schema_, references_, value);
    case "This":
      return FromThis4(schema_, references_, value);
    case "Tuple":
      return FromTuple9(schema_, references_, value);
    case "Union":
      return FromUnion14(schema_, references_, value);
    // --------------------------------------------------------------
    // DefaultClone
    // --------------------------------------------------------------
    case "Date":
    case "Symbol":
    case "Uint8Array":
      return DefaultClone(schema, references, value);
    // --------------------------------------------------------------
    // Default
    // --------------------------------------------------------------
    default:
      return Default(schema_, references_, value);
  }
}
function Cast(...args) {
  return args.length === 3 ? Visit8(args[0], args[1], args[2]) : Visit8(args[0], [], args[1]);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/clean/clean.mjs
function IsCheckable(schema) {
  return IsKind(schema) && schema[Kind] !== "Unsafe";
}
function FromArray12(schema, references, value) {
  if (!IsArray2(value))
    return value;
  return value.map((value2) => Visit9(schema.items, references, value2));
}
function FromImport5(schema, references, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit9(target, [...references, ...definitions], value);
}
function FromIntersect13(schema, references, value) {
  const unevaluatedProperties = schema.unevaluatedProperties;
  const intersections = schema.allOf.map((schema2) => Visit9(schema2, references, Clone2(value)));
  const composite = intersections.reduce((acc, value2) => IsObject2(value2) ? { ...acc, ...value2 } : value2, {});
  if (!IsObject2(value) || !IsObject2(composite) || !IsKind(unevaluatedProperties))
    return composite;
  const knownkeys = KeyOfPropertyKeys(schema);
  for (const key of Object.getOwnPropertyNames(value)) {
    if (knownkeys.includes(key))
      continue;
    if (Check(unevaluatedProperties, references, value[key])) {
      composite[key] = Visit9(unevaluatedProperties, references, value[key]);
    }
  }
  return composite;
}
function FromObject13(schema, references, value) {
  if (!IsObject2(value) || IsArray2(value))
    return value;
  const additionalProperties = schema.additionalProperties;
  for (const key of Object.getOwnPropertyNames(value)) {
    if (HasPropertyKey2(schema.properties, key)) {
      value[key] = Visit9(schema.properties[key], references, value[key]);
      continue;
    }
    if (IsKind(additionalProperties) && Check(additionalProperties, references, value[key])) {
      value[key] = Visit9(additionalProperties, references, value[key]);
      continue;
    }
    delete value[key];
  }
  return value;
}
function FromRecord8(schema, references, value) {
  if (!IsObject2(value))
    return value;
  const additionalProperties = schema.additionalProperties;
  const propertyKeys = Object.getOwnPropertyNames(value);
  const [propertyKey, propertySchema] = Object.entries(schema.patternProperties)[0];
  const propertyKeyTest = new RegExp(propertyKey);
  for (const key of propertyKeys) {
    if (propertyKeyTest.test(key)) {
      value[key] = Visit9(propertySchema, references, value[key]);
      continue;
    }
    if (IsKind(additionalProperties) && Check(additionalProperties, references, value[key])) {
      value[key] = Visit9(additionalProperties, references, value[key]);
      continue;
    }
    delete value[key];
  }
  return value;
}
function FromRef9(schema, references, value) {
  return Visit9(Deref(schema, references), references, value);
}
function FromThis5(schema, references, value) {
  return Visit9(Deref(schema, references), references, value);
}
function FromTuple10(schema, references, value) {
  if (!IsArray2(value))
    return value;
  if (IsUndefined2(schema.items))
    return [];
  const length = Math.min(value.length, schema.items.length);
  for (let i = 0; i < length; i++) {
    value[i] = Visit9(schema.items[i], references, value[i]);
  }
  return value.length > length ? value.slice(0, length) : value;
}
function FromUnion15(schema, references, value) {
  for (const inner of schema.anyOf) {
    if (IsCheckable(inner) && Check(inner, references, value)) {
      return Visit9(inner, references, value);
    }
  }
  return value;
}
function Visit9(schema, references, value) {
  const references_ = IsString2(schema.$id) ? Pushref(schema, references) : references;
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Array":
      return FromArray12(schema_, references_, value);
    case "Import":
      return FromImport5(schema_, references_, value);
    case "Intersect":
      return FromIntersect13(schema_, references_, value);
    case "Object":
      return FromObject13(schema_, references_, value);
    case "Record":
      return FromRecord8(schema_, references_, value);
    case "Ref":
      return FromRef9(schema_, references_, value);
    case "This":
      return FromThis5(schema_, references_, value);
    case "Tuple":
      return FromTuple10(schema_, references_, value);
    case "Union":
      return FromUnion15(schema_, references_, value);
    default:
      return value;
  }
}
function Clean(...args) {
  return args.length === 3 ? Visit9(args[0], args[1], args[2]) : Visit9(args[0], [], args[1]);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/convert/convert.mjs
function IsStringNumeric(value) {
  return IsString2(value) && !isNaN(value) && !isNaN(parseFloat(value));
}
function IsValueToString(value) {
  return IsBigInt2(value) || IsBoolean2(value) || IsNumber2(value);
}
function IsValueTrue(value) {
  return value === true || IsNumber2(value) && value === 1 || IsBigInt2(value) && value === BigInt("1") || IsString2(value) && (value.toLowerCase() === "true" || value === "1");
}
function IsValueFalse(value) {
  return value === false || IsNumber2(value) && (value === 0 || Object.is(value, -0)) || IsBigInt2(value) && value === BigInt("0") || IsString2(value) && (value.toLowerCase() === "false" || value === "0" || value === "-0");
}
function IsTimeStringWithTimeZone(value) {
  return IsString2(value) && /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i.test(value);
}
function IsTimeStringWithoutTimeZone(value) {
  return IsString2(value) && /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)?$/i.test(value);
}
function IsDateTimeStringWithTimeZone(value) {
  return IsString2(value) && /^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i.test(value);
}
function IsDateTimeStringWithoutTimeZone(value) {
  return IsString2(value) && /^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)?$/i.test(value);
}
function IsDateString(value) {
  return IsString2(value) && /^\d\d\d\d-[0-1]\d-[0-3]\d$/i.test(value);
}
function TryConvertLiteralString(value, target) {
  const conversion = TryConvertString(value);
  return conversion === target ? conversion : value;
}
function TryConvertLiteralNumber(value, target) {
  const conversion = TryConvertNumber(value);
  return conversion === target ? conversion : value;
}
function TryConvertLiteralBoolean(value, target) {
  const conversion = TryConvertBoolean(value);
  return conversion === target ? conversion : value;
}
function TryConvertLiteral(schema, value) {
  return IsString2(schema.const) ? TryConvertLiteralString(value, schema.const) : IsNumber2(schema.const) ? TryConvertLiteralNumber(value, schema.const) : IsBoolean2(schema.const) ? TryConvertLiteralBoolean(value, schema.const) : value;
}
function TryConvertBoolean(value) {
  return IsValueTrue(value) ? true : IsValueFalse(value) ? false : value;
}
function TryConvertBigInt(value) {
  const truncateInteger = (value2) => value2.split(".")[0];
  return IsStringNumeric(value) ? BigInt(truncateInteger(value)) : IsNumber2(value) ? BigInt(Math.trunc(value)) : IsValueFalse(value) ? BigInt(0) : IsValueTrue(value) ? BigInt(1) : value;
}
function TryConvertString(value) {
  return IsSymbol2(value) && value.description !== void 0 ? value.description.toString() : IsValueToString(value) ? value.toString() : value;
}
function TryConvertNumber(value) {
  return IsStringNumeric(value) ? parseFloat(value) : IsValueTrue(value) ? 1 : IsValueFalse(value) ? 0 : value;
}
function TryConvertInteger(value) {
  return IsStringNumeric(value) ? parseInt(value) : IsNumber2(value) ? Math.trunc(value) : IsValueTrue(value) ? 1 : IsValueFalse(value) ? 0 : value;
}
function TryConvertNull(value) {
  return IsString2(value) && value.toLowerCase() === "null" ? null : value;
}
function TryConvertUndefined(value) {
  return IsString2(value) && value === "undefined" ? void 0 : value;
}
function TryConvertDate(value) {
  return IsDate2(value) ? value : IsNumber2(value) ? new Date(value) : IsValueTrue(value) ? /* @__PURE__ */ new Date(1) : IsValueFalse(value) ? /* @__PURE__ */ new Date(0) : IsStringNumeric(value) ? new Date(parseInt(value)) : IsTimeStringWithoutTimeZone(value) ? /* @__PURE__ */ new Date(`1970-01-01T${value}.000Z`) : IsTimeStringWithTimeZone(value) ? /* @__PURE__ */ new Date(`1970-01-01T${value}`) : IsDateTimeStringWithoutTimeZone(value) ? /* @__PURE__ */ new Date(`${value}.000Z`) : IsDateTimeStringWithTimeZone(value) ? new Date(value) : IsDateString(value) ? /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`) : value;
}
function Default2(value) {
  return value;
}
function FromArray13(schema, references, value) {
  const elements = IsArray2(value) ? value : [value];
  return elements.map((element) => Visit10(schema.items, references, element));
}
function FromBigInt5(schema, references, value) {
  return TryConvertBigInt(value);
}
function FromBoolean5(schema, references, value) {
  return TryConvertBoolean(value);
}
function FromDate6(schema, references, value) {
  return TryConvertDate(value);
}
function FromImport6(schema, references, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit10(target, [...references, ...definitions], value);
}
function FromInteger5(schema, references, value) {
  return TryConvertInteger(value);
}
function FromIntersect14(schema, references, value) {
  return schema.allOf.reduce((value2, schema2) => Visit10(schema2, references, value2), value);
}
function FromLiteral6(schema, references, value) {
  return TryConvertLiteral(schema, value);
}
function FromNull5(schema, references, value) {
  return TryConvertNull(value);
}
function FromNumber5(schema, references, value) {
  return TryConvertNumber(value);
}
function FromObject14(schema, references, value) {
  if (!IsObject2(value))
    return value;
  for (const propertyKey of Object.getOwnPropertyNames(schema.properties)) {
    if (!HasPropertyKey2(value, propertyKey))
      continue;
    value[propertyKey] = Visit10(schema.properties[propertyKey], references, value[propertyKey]);
  }
  return value;
}
function FromRecord9(schema, references, value) {
  const isConvertable = IsObject2(value);
  if (!isConvertable)
    return value;
  const propertyKey = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const property = schema.patternProperties[propertyKey];
  for (const [propKey, propValue] of Object.entries(value)) {
    value[propKey] = Visit10(property, references, propValue);
  }
  return value;
}
function FromRef10(schema, references, value) {
  return Visit10(Deref(schema, references), references, value);
}
function FromString5(schema, references, value) {
  return TryConvertString(value);
}
function FromSymbol5(schema, references, value) {
  return IsString2(value) || IsNumber2(value) ? Symbol(value) : value;
}
function FromThis6(schema, references, value) {
  return Visit10(Deref(schema, references), references, value);
}
function FromTuple11(schema, references, value) {
  const isConvertable = IsArray2(value) && !IsUndefined2(schema.items);
  if (!isConvertable)
    return value;
  return value.map((value2, index) => {
    return index < schema.items.length ? Visit10(schema.items[index], references, value2) : value2;
  });
}
function FromUndefined5(schema, references, value) {
  return TryConvertUndefined(value);
}
function FromUnion16(schema, references, value) {
  for (const subschema of schema.anyOf) {
    const converted = Visit10(subschema, references, Clone2(value));
    if (!Check(subschema, references, converted))
      continue;
    return converted;
  }
  return value;
}
function Visit10(schema, references, value) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema[Kind]) {
    case "Array":
      return FromArray13(schema_, references_, value);
    case "BigInt":
      return FromBigInt5(schema_, references_, value);
    case "Boolean":
      return FromBoolean5(schema_, references_, value);
    case "Date":
      return FromDate6(schema_, references_, value);
    case "Import":
      return FromImport6(schema_, references_, value);
    case "Integer":
      return FromInteger5(schema_, references_, value);
    case "Intersect":
      return FromIntersect14(schema_, references_, value);
    case "Literal":
      return FromLiteral6(schema_, references_, value);
    case "Null":
      return FromNull5(schema_, references_, value);
    case "Number":
      return FromNumber5(schema_, references_, value);
    case "Object":
      return FromObject14(schema_, references_, value);
    case "Record":
      return FromRecord9(schema_, references_, value);
    case "Ref":
      return FromRef10(schema_, references_, value);
    case "String":
      return FromString5(schema_, references_, value);
    case "Symbol":
      return FromSymbol5(schema_, references_, value);
    case "This":
      return FromThis6(schema_, references_, value);
    case "Tuple":
      return FromTuple11(schema_, references_, value);
    case "Undefined":
      return FromUndefined5(schema_, references_, value);
    case "Union":
      return FromUnion16(schema_, references_, value);
    default:
      return Default2(value);
  }
}
function Convert(...args) {
  return args.length === 3 ? Visit10(args[0], args[1], args[2]) : Visit10(args[0], [], args[1]);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/transform/decode.mjs
var TransformDecodeCheckError = class extends TypeBoxError {
  constructor(schema, value, error) {
    super(`Unable to decode value as it does not match the expected schema`);
    this.schema = schema;
    this.value = value;
    this.error = error;
  }
};
var TransformDecodeError = class extends TypeBoxError {
  constructor(schema, path, value, error) {
    super(error instanceof Error ? error.message : "Unknown error");
    this.schema = schema;
    this.path = path;
    this.value = value;
    this.error = error;
  }
};
function Default3(schema, path, value) {
  try {
    return IsTransform(schema) ? schema[TransformKind].Decode(value) : value;
  } catch (error) {
    throw new TransformDecodeError(schema, path, value, error);
  }
}
function FromArray14(schema, references, path, value) {
  return IsArray2(value) ? Default3(schema, path, value.map((value2, index) => Visit11(schema.items, references, `${path}/${index}`, value2))) : Default3(schema, path, value);
}
function FromIntersect15(schema, references, path, value) {
  if (!IsObject2(value) || IsValueType(value))
    return Default3(schema, path, value);
  const knownEntries = KeyOfPropertyEntries(schema);
  const knownKeys = knownEntries.map((entry) => entry[0]);
  const knownProperties = { ...value };
  for (const [knownKey, knownSchema] of knownEntries)
    if (knownKey in knownProperties) {
      knownProperties[knownKey] = Visit11(knownSchema, references, `${path}/${knownKey}`, knownProperties[knownKey]);
    }
  if (!IsTransform(schema.unevaluatedProperties)) {
    return Default3(schema, path, knownProperties);
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const unevaluatedProperties = schema.unevaluatedProperties;
  const unknownProperties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.includes(key)) {
      unknownProperties[key] = Default3(unevaluatedProperties, `${path}/${key}`, unknownProperties[key]);
    }
  return Default3(schema, path, unknownProperties);
}
function FromImport7(schema, references, path, value) {
  const additional = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  const result = Visit11(target, [...references, ...additional], path, value);
  return Default3(schema, path, result);
}
function FromNot5(schema, references, path, value) {
  return Default3(schema, path, Visit11(schema.not, references, path, value));
}
function FromObject15(schema, references, path, value) {
  if (!IsObject2(value))
    return Default3(schema, path, value);
  const knownKeys = KeyOfPropertyKeys(schema);
  const knownProperties = { ...value };
  for (const key of knownKeys) {
    if (!HasPropertyKey2(knownProperties, key))
      continue;
    if (IsUndefined2(knownProperties[key]) && (!IsUndefined3(schema.properties[key]) || TypeSystemPolicy.IsExactOptionalProperty(knownProperties, key)))
      continue;
    knownProperties[key] = Visit11(schema.properties[key], references, `${path}/${key}`, knownProperties[key]);
  }
  if (!IsSchema(schema.additionalProperties)) {
    return Default3(schema, path, knownProperties);
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const additionalProperties = schema.additionalProperties;
  const unknownProperties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.includes(key)) {
      unknownProperties[key] = Default3(additionalProperties, `${path}/${key}`, unknownProperties[key]);
    }
  return Default3(schema, path, unknownProperties);
}
function FromRecord10(schema, references, path, value) {
  if (!IsObject2(value))
    return Default3(schema, path, value);
  const pattern = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const knownKeys = new RegExp(pattern);
  const knownProperties = { ...value };
  for (const key of Object.getOwnPropertyNames(value))
    if (knownKeys.test(key)) {
      knownProperties[key] = Visit11(schema.patternProperties[pattern], references, `${path}/${key}`, knownProperties[key]);
    }
  if (!IsSchema(schema.additionalProperties)) {
    return Default3(schema, path, knownProperties);
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const additionalProperties = schema.additionalProperties;
  const unknownProperties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.test(key)) {
      unknownProperties[key] = Default3(additionalProperties, `${path}/${key}`, unknownProperties[key]);
    }
  return Default3(schema, path, unknownProperties);
}
function FromRef11(schema, references, path, value) {
  const target = Deref(schema, references);
  return Default3(schema, path, Visit11(target, references, path, value));
}
function FromThis7(schema, references, path, value) {
  const target = Deref(schema, references);
  return Default3(schema, path, Visit11(target, references, path, value));
}
function FromTuple12(schema, references, path, value) {
  return IsArray2(value) && IsArray2(schema.items) ? Default3(schema, path, schema.items.map((schema2, index) => Visit11(schema2, references, `${path}/${index}`, value[index]))) : Default3(schema, path, value);
}
function FromUnion17(schema, references, path, value) {
  for (const subschema of schema.anyOf) {
    if (!Check(subschema, references, value))
      continue;
    const decoded = Visit11(subschema, references, path, value);
    return Default3(schema, path, decoded);
  }
  return Default3(schema, path, value);
}
function Visit11(schema, references, path, value) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema[Kind]) {
    case "Array":
      return FromArray14(schema_, references_, path, value);
    case "Import":
      return FromImport7(schema_, references_, path, value);
    case "Intersect":
      return FromIntersect15(schema_, references_, path, value);
    case "Not":
      return FromNot5(schema_, references_, path, value);
    case "Object":
      return FromObject15(schema_, references_, path, value);
    case "Record":
      return FromRecord10(schema_, references_, path, value);
    case "Ref":
      return FromRef11(schema_, references_, path, value);
    case "Symbol":
      return Default3(schema_, path, value);
    case "This":
      return FromThis7(schema_, references_, path, value);
    case "Tuple":
      return FromTuple12(schema_, references_, path, value);
    case "Union":
      return FromUnion17(schema_, references_, path, value);
    default:
      return Default3(schema_, path, value);
  }
}
function TransformDecode(schema, references, value) {
  return Visit11(schema, references, "", value);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/transform/encode.mjs
var TransformEncodeCheckError = class extends TypeBoxError {
  constructor(schema, value, error) {
    super(`The encoded value does not match the expected schema`);
    this.schema = schema;
    this.value = value;
    this.error = error;
  }
};
var TransformEncodeError = class extends TypeBoxError {
  constructor(schema, path, value, error) {
    super(`${error instanceof Error ? error.message : "Unknown error"}`);
    this.schema = schema;
    this.path = path;
    this.value = value;
    this.error = error;
  }
};
function Default4(schema, path, value) {
  try {
    return IsTransform(schema) ? schema[TransformKind].Encode(value) : value;
  } catch (error) {
    throw new TransformEncodeError(schema, path, value, error);
  }
}
function FromArray15(schema, references, path, value) {
  const defaulted = Default4(schema, path, value);
  return IsArray2(defaulted) ? defaulted.map((value2, index) => Visit12(schema.items, references, `${path}/${index}`, value2)) : defaulted;
}
function FromImport8(schema, references, path, value) {
  const additional = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  const result = Default4(schema, path, value);
  return Visit12(target, [...references, ...additional], path, result);
}
function FromIntersect16(schema, references, path, value) {
  const defaulted = Default4(schema, path, value);
  if (!IsObject2(value) || IsValueType(value))
    return defaulted;
  const knownEntries = KeyOfPropertyEntries(schema);
  const knownKeys = knownEntries.map((entry) => entry[0]);
  const knownProperties = { ...defaulted };
  for (const [knownKey, knownSchema] of knownEntries)
    if (knownKey in knownProperties) {
      knownProperties[knownKey] = Visit12(knownSchema, references, `${path}/${knownKey}`, knownProperties[knownKey]);
    }
  if (!IsTransform(schema.unevaluatedProperties)) {
    return knownProperties;
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const unevaluatedProperties = schema.unevaluatedProperties;
  const properties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.includes(key)) {
      properties[key] = Default4(unevaluatedProperties, `${path}/${key}`, properties[key]);
    }
  return properties;
}
function FromNot6(schema, references, path, value) {
  return Default4(schema.not, path, Default4(schema, path, value));
}
function FromObject16(schema, references, path, value) {
  const defaulted = Default4(schema, path, value);
  if (!IsObject2(defaulted))
    return defaulted;
  const knownKeys = KeyOfPropertyKeys(schema);
  const knownProperties = { ...defaulted };
  for (const key of knownKeys) {
    if (!HasPropertyKey2(knownProperties, key))
      continue;
    if (IsUndefined2(knownProperties[key]) && (!IsUndefined3(schema.properties[key]) || TypeSystemPolicy.IsExactOptionalProperty(knownProperties, key)))
      continue;
    knownProperties[key] = Visit12(schema.properties[key], references, `${path}/${key}`, knownProperties[key]);
  }
  if (!IsSchema(schema.additionalProperties)) {
    return knownProperties;
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const additionalProperties = schema.additionalProperties;
  const properties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.includes(key)) {
      properties[key] = Default4(additionalProperties, `${path}/${key}`, properties[key]);
    }
  return properties;
}
function FromRecord11(schema, references, path, value) {
  const defaulted = Default4(schema, path, value);
  if (!IsObject2(value))
    return defaulted;
  const pattern = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const knownKeys = new RegExp(pattern);
  const knownProperties = { ...defaulted };
  for (const key of Object.getOwnPropertyNames(value))
    if (knownKeys.test(key)) {
      knownProperties[key] = Visit12(schema.patternProperties[pattern], references, `${path}/${key}`, knownProperties[key]);
    }
  if (!IsSchema(schema.additionalProperties)) {
    return knownProperties;
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const additionalProperties = schema.additionalProperties;
  const properties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.test(key)) {
      properties[key] = Default4(additionalProperties, `${path}/${key}`, properties[key]);
    }
  return properties;
}
function FromRef12(schema, references, path, value) {
  const target = Deref(schema, references);
  const resolved = Visit12(target, references, path, value);
  return Default4(schema, path, resolved);
}
function FromThis8(schema, references, path, value) {
  const target = Deref(schema, references);
  const resolved = Visit12(target, references, path, value);
  return Default4(schema, path, resolved);
}
function FromTuple13(schema, references, path, value) {
  const value1 = Default4(schema, path, value);
  return IsArray2(schema.items) ? schema.items.map((schema2, index) => Visit12(schema2, references, `${path}/${index}`, value1[index])) : [];
}
function FromUnion18(schema, references, path, value) {
  for (const subschema of schema.anyOf) {
    if (!Check(subschema, references, value))
      continue;
    const value1 = Visit12(subschema, references, path, value);
    return Default4(schema, path, value1);
  }
  for (const subschema of schema.anyOf) {
    const value1 = Visit12(subschema, references, path, value);
    if (!Check(schema, references, value1))
      continue;
    return Default4(schema, path, value1);
  }
  return Default4(schema, path, value);
}
function Visit12(schema, references, path, value) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema[Kind]) {
    case "Array":
      return FromArray15(schema_, references_, path, value);
    case "Import":
      return FromImport8(schema_, references_, path, value);
    case "Intersect":
      return FromIntersect16(schema_, references_, path, value);
    case "Not":
      return FromNot6(schema_, references_, path, value);
    case "Object":
      return FromObject16(schema_, references_, path, value);
    case "Record":
      return FromRecord11(schema_, references_, path, value);
    case "Ref":
      return FromRef12(schema_, references_, path, value);
    case "This":
      return FromThis8(schema_, references_, path, value);
    case "Tuple":
      return FromTuple13(schema_, references_, path, value);
    case "Union":
      return FromUnion18(schema_, references_, path, value);
    default:
      return Default4(schema_, path, value);
  }
}
function TransformEncode(schema, references, value) {
  return Visit12(schema, references, "", value);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/transform/has.mjs
function FromArray16(schema, references) {
  return IsTransform(schema) || Visit13(schema.items, references);
}
function FromAsyncIterator7(schema, references) {
  return IsTransform(schema) || Visit13(schema.items, references);
}
function FromConstructor8(schema, references) {
  return IsTransform(schema) || Visit13(schema.returns, references) || schema.parameters.some((schema2) => Visit13(schema2, references));
}
function FromFunction7(schema, references) {
  return IsTransform(schema) || Visit13(schema.returns, references) || schema.parameters.some((schema2) => Visit13(schema2, references));
}
function FromIntersect17(schema, references) {
  return IsTransform(schema) || IsTransform(schema.unevaluatedProperties) || schema.allOf.some((schema2) => Visit13(schema2, references));
}
function FromImport9(schema, references) {
  const additional = globalThis.Object.getOwnPropertyNames(schema.$defs).reduce((result, key) => [...result, schema.$defs[key]], []);
  const target = schema.$defs[schema.$ref];
  return IsTransform(schema) || Visit13(target, [...additional, ...references]);
}
function FromIterator7(schema, references) {
  return IsTransform(schema) || Visit13(schema.items, references);
}
function FromNot7(schema, references) {
  return IsTransform(schema) || Visit13(schema.not, references);
}
function FromObject17(schema, references) {
  return IsTransform(schema) || Object.values(schema.properties).some((schema2) => Visit13(schema2, references)) || IsSchema(schema.additionalProperties) && Visit13(schema.additionalProperties, references);
}
function FromPromise7(schema, references) {
  return IsTransform(schema) || Visit13(schema.item, references);
}
function FromRecord12(schema, references) {
  const pattern = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const property = schema.patternProperties[pattern];
  return IsTransform(schema) || Visit13(property, references) || IsSchema(schema.additionalProperties) && IsTransform(schema.additionalProperties);
}
function FromRef13(schema, references) {
  if (IsTransform(schema))
    return true;
  return Visit13(Deref(schema, references), references);
}
function FromThis9(schema, references) {
  if (IsTransform(schema))
    return true;
  return Visit13(Deref(schema, references), references);
}
function FromTuple14(schema, references) {
  return IsTransform(schema) || !IsUndefined2(schema.items) && schema.items.some((schema2) => Visit13(schema2, references));
}
function FromUnion19(schema, references) {
  return IsTransform(schema) || schema.anyOf.some((schema2) => Visit13(schema2, references));
}
function Visit13(schema, references) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  if (schema.$id && visited.has(schema.$id))
    return false;
  if (schema.$id)
    visited.add(schema.$id);
  switch (schema[Kind]) {
    case "Array":
      return FromArray16(schema_, references_);
    case "AsyncIterator":
      return FromAsyncIterator7(schema_, references_);
    case "Constructor":
      return FromConstructor8(schema_, references_);
    case "Function":
      return FromFunction7(schema_, references_);
    case "Import":
      return FromImport9(schema_, references_);
    case "Intersect":
      return FromIntersect17(schema_, references_);
    case "Iterator":
      return FromIterator7(schema_, references_);
    case "Not":
      return FromNot7(schema_, references_);
    case "Object":
      return FromObject17(schema_, references_);
    case "Promise":
      return FromPromise7(schema_, references_);
    case "Record":
      return FromRecord12(schema_, references_);
    case "Ref":
      return FromRef13(schema_, references_);
    case "This":
      return FromThis9(schema_, references_);
    case "Tuple":
      return FromTuple14(schema_, references_);
    case "Union":
      return FromUnion19(schema_, references_);
    default:
      return IsTransform(schema);
  }
}
var visited = /* @__PURE__ */ new Set();
function HasTransform(schema, references) {
  visited.clear();
  return Visit13(schema, references);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/decode/decode.mjs
function Decode(...args) {
  const [schema, references, value] = args.length === 3 ? [args[0], args[1], args[2]] : [args[0], [], args[1]];
  if (!Check(schema, references, value))
    throw new TransformDecodeCheckError(schema, value, Errors(schema, references, value).First());
  return HasTransform(schema, references) ? TransformDecode(schema, references, value) : value;
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/default/default.mjs
function ValueOrDefault(schema, value) {
  const defaultValue = HasPropertyKey2(schema, "default") ? schema.default : void 0;
  const clone = IsFunction2(defaultValue) ? defaultValue() : Clone2(defaultValue);
  return IsUndefined2(value) ? clone : IsObject2(value) && IsObject2(clone) ? Object.assign(clone, value) : value;
}
function HasDefaultProperty(schema) {
  return IsKind(schema) && "default" in schema;
}
function FromArray17(schema, references, value) {
  if (IsArray2(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = Visit14(schema.items, references, value[i]);
    }
    return value;
  }
  const defaulted = ValueOrDefault(schema, value);
  if (!IsArray2(defaulted))
    return defaulted;
  for (let i = 0; i < defaulted.length; i++) {
    defaulted[i] = Visit14(schema.items, references, defaulted[i]);
  }
  return defaulted;
}
function FromDate7(schema, references, value) {
  return IsDate2(value) ? value : ValueOrDefault(schema, value);
}
function FromImport10(schema, references, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit14(target, [...references, ...definitions], value);
}
function FromIntersect18(schema, references, value) {
  const defaulted = ValueOrDefault(schema, value);
  return schema.allOf.reduce((acc, schema2) => {
    const next = Visit14(schema2, references, defaulted);
    return IsObject2(next) ? { ...acc, ...next } : next;
  }, {});
}
function FromObject18(schema, references, value) {
  const defaulted = ValueOrDefault(schema, value);
  if (!IsObject2(defaulted))
    return defaulted;
  const knownPropertyKeys = Object.getOwnPropertyNames(schema.properties);
  for (const key of knownPropertyKeys) {
    const propertyValue = Visit14(schema.properties[key], references, defaulted[key]);
    if (IsUndefined2(propertyValue))
      continue;
    defaulted[key] = Visit14(schema.properties[key], references, defaulted[key]);
  }
  if (!HasDefaultProperty(schema.additionalProperties))
    return defaulted;
  for (const key of Object.getOwnPropertyNames(defaulted)) {
    if (knownPropertyKeys.includes(key))
      continue;
    defaulted[key] = Visit14(schema.additionalProperties, references, defaulted[key]);
  }
  return defaulted;
}
function FromRecord13(schema, references, value) {
  const defaulted = ValueOrDefault(schema, value);
  if (!IsObject2(defaulted))
    return defaulted;
  const additionalPropertiesSchema = schema.additionalProperties;
  const [propertyKeyPattern, propertySchema] = Object.entries(schema.patternProperties)[0];
  const knownPropertyKey = new RegExp(propertyKeyPattern);
  for (const key of Object.getOwnPropertyNames(defaulted)) {
    if (!(knownPropertyKey.test(key) && HasDefaultProperty(propertySchema)))
      continue;
    defaulted[key] = Visit14(propertySchema, references, defaulted[key]);
  }
  if (!HasDefaultProperty(additionalPropertiesSchema))
    return defaulted;
  for (const key of Object.getOwnPropertyNames(defaulted)) {
    if (knownPropertyKey.test(key))
      continue;
    defaulted[key] = Visit14(additionalPropertiesSchema, references, defaulted[key]);
  }
  return defaulted;
}
function FromRef14(schema, references, value) {
  return Visit14(Deref(schema, references), references, ValueOrDefault(schema, value));
}
function FromThis10(schema, references, value) {
  return Visit14(Deref(schema, references), references, value);
}
function FromTuple15(schema, references, value) {
  const defaulted = ValueOrDefault(schema, value);
  if (!IsArray2(defaulted) || IsUndefined2(schema.items))
    return defaulted;
  const [items, max] = [schema.items, Math.max(schema.items.length, defaulted.length)];
  for (let i = 0; i < max; i++) {
    if (i < items.length)
      defaulted[i] = Visit14(items[i], references, defaulted[i]);
  }
  return defaulted;
}
function FromUnion20(schema, references, value) {
  const defaulted = ValueOrDefault(schema, value);
  for (const inner of schema.anyOf) {
    const result = Visit14(inner, references, Clone2(defaulted));
    if (Check(inner, references, result)) {
      return result;
    }
  }
  return defaulted;
}
function Visit14(schema, references, value) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Array":
      return FromArray17(schema_, references_, value);
    case "Date":
      return FromDate7(schema_, references_, value);
    case "Import":
      return FromImport10(schema_, references_, value);
    case "Intersect":
      return FromIntersect18(schema_, references_, value);
    case "Object":
      return FromObject18(schema_, references_, value);
    case "Record":
      return FromRecord13(schema_, references_, value);
    case "Ref":
      return FromRef14(schema_, references_, value);
    case "This":
      return FromThis10(schema_, references_, value);
    case "Tuple":
      return FromTuple15(schema_, references_, value);
    case "Union":
      return FromUnion20(schema_, references_, value);
    default:
      return ValueOrDefault(schema_, value);
  }
}
function Default5(...args) {
  return args.length === 3 ? Visit14(args[0], args[1], args[2]) : Visit14(args[0], [], args[1]);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/pointer/pointer.mjs
var pointer_exports = {};
__export(pointer_exports, {
  Delete: () => Delete3,
  Format: () => Format,
  Get: () => Get3,
  Has: () => Has3,
  Set: () => Set4,
  ValuePointerRootDeleteError: () => ValuePointerRootDeleteError,
  ValuePointerRootSetError: () => ValuePointerRootSetError
});
var ValuePointerRootSetError = class extends TypeBoxError {
  constructor(value, path, update) {
    super("Cannot set root value");
    this.value = value;
    this.path = path;
    this.update = update;
  }
};
var ValuePointerRootDeleteError = class extends TypeBoxError {
  constructor(value, path) {
    super("Cannot delete root value");
    this.value = value;
    this.path = path;
  }
};
function Escape2(component) {
  return component.indexOf("~") === -1 ? component : component.replace(/~1/g, "/").replace(/~0/g, "~");
}
function* Format(pointer) {
  if (pointer === "")
    return;
  let [start, end] = [0, 0];
  for (let i = 0; i < pointer.length; i++) {
    const char = pointer.charAt(i);
    if (char === "/") {
      if (i === 0) {
        start = i + 1;
      } else {
        end = i;
        yield Escape2(pointer.slice(start, end));
        start = i + 1;
      }
    } else {
      end = i;
    }
  }
  yield Escape2(pointer.slice(start));
}
function Set4(value, pointer, update) {
  if (pointer === "")
    throw new ValuePointerRootSetError(value, pointer, update);
  let [owner, next, key] = [null, value, ""];
  for (const component of Format(pointer)) {
    if (next[component] === void 0)
      next[component] = {};
    owner = next;
    next = next[component];
    key = component;
  }
  owner[key] = update;
}
function Delete3(value, pointer) {
  if (pointer === "")
    throw new ValuePointerRootDeleteError(value, pointer);
  let [owner, next, key] = [null, value, ""];
  for (const component of Format(pointer)) {
    if (next[component] === void 0 || next[component] === null)
      return;
    owner = next;
    next = next[component];
    key = component;
  }
  if (Array.isArray(owner)) {
    const index = parseInt(key);
    owner.splice(index, 1);
  } else {
    delete owner[key];
  }
}
function Has3(value, pointer) {
  if (pointer === "")
    return true;
  let [owner, next, key] = [null, value, ""];
  for (const component of Format(pointer)) {
    if (next[component] === void 0)
      return false;
    owner = next;
    next = next[component];
    key = component;
  }
  return Object.getOwnPropertyNames(owner).includes(key);
}
function Get3(value, pointer) {
  if (pointer === "")
    return value;
  let current = value;
  for (const component of Format(pointer)) {
    if (current[component] === void 0)
      return void 0;
    current = current[component];
  }
  return current;
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/equal/equal.mjs
function ObjectType3(left, right) {
  if (!IsObject2(right))
    return false;
  const leftKeys = [...Object.keys(left), ...Object.getOwnPropertySymbols(left)];
  const rightKeys = [...Object.keys(right), ...Object.getOwnPropertySymbols(right)];
  if (leftKeys.length !== rightKeys.length)
    return false;
  return leftKeys.every((key) => Equal(left[key], right[key]));
}
function DateType3(left, right) {
  return IsDate2(right) && left.getTime() === right.getTime();
}
function ArrayType3(left, right) {
  if (!IsArray2(right) || left.length !== right.length)
    return false;
  return left.every((value, index) => Equal(value, right[index]));
}
function TypedArrayType(left, right) {
  if (!IsTypedArray(right) || left.length !== right.length || Object.getPrototypeOf(left).constructor.name !== Object.getPrototypeOf(right).constructor.name)
    return false;
  return left.every((value, index) => Equal(value, right[index]));
}
function ValueType(left, right) {
  return left === right;
}
function Equal(left, right) {
  if (IsDate2(left))
    return DateType3(left, right);
  if (IsTypedArray(left))
    return TypedArrayType(left, right);
  if (IsArray2(left))
    return ArrayType3(left, right);
  if (IsObject2(left))
    return ObjectType3(left, right);
  if (IsValueType(left))
    return ValueType(left, right);
  throw new Error("ValueEquals: Unable to compare value");
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/delta/delta.mjs
var Insert = Object2({
  type: Literal("insert"),
  path: String2(),
  value: Unknown()
});
var Update = Object2({
  type: Literal("update"),
  path: String2(),
  value: Unknown()
});
var Delete4 = Object2({
  type: Literal("delete"),
  path: String2()
});
var Edit = Union([Insert, Update, Delete4]);
var ValueDiffError = class extends TypeBoxError {
  constructor(value, message) {
    super(message);
    this.value = value;
  }
};
function CreateUpdate(path, value) {
  return { type: "update", path, value };
}
function CreateInsert(path, value) {
  return { type: "insert", path, value };
}
function CreateDelete(path) {
  return { type: "delete", path };
}
function AssertDiffable(value) {
  if (globalThis.Object.getOwnPropertySymbols(value).length > 0)
    throw new ValueDiffError(value, "Cannot diff objects with symbols");
}
function* ObjectType4(path, current, next) {
  AssertDiffable(current);
  AssertDiffable(next);
  if (!IsStandardObject(next))
    return yield CreateUpdate(path, next);
  const currentKeys = globalThis.Object.getOwnPropertyNames(current);
  const nextKeys = globalThis.Object.getOwnPropertyNames(next);
  for (const key of nextKeys) {
    if (HasPropertyKey2(current, key))
      continue;
    yield CreateInsert(`${path}/${key}`, next[key]);
  }
  for (const key of currentKeys) {
    if (!HasPropertyKey2(next, key))
      continue;
    if (Equal(current, next))
      continue;
    yield* Visit15(`${path}/${key}`, current[key], next[key]);
  }
  for (const key of currentKeys) {
    if (HasPropertyKey2(next, key))
      continue;
    yield CreateDelete(`${path}/${key}`);
  }
}
function* ArrayType4(path, current, next) {
  if (!IsArray2(next))
    return yield CreateUpdate(path, next);
  for (let i = 0; i < Math.min(current.length, next.length); i++) {
    yield* Visit15(`${path}/${i}`, current[i], next[i]);
  }
  for (let i = 0; i < next.length; i++) {
    if (i < current.length)
      continue;
    yield CreateInsert(`${path}/${i}`, next[i]);
  }
  for (let i = current.length - 1; i >= 0; i--) {
    if (i < next.length)
      continue;
    yield CreateDelete(`${path}/${i}`);
  }
}
function* TypedArrayType2(path, current, next) {
  if (!IsTypedArray(next) || current.length !== next.length || globalThis.Object.getPrototypeOf(current).constructor.name !== globalThis.Object.getPrototypeOf(next).constructor.name)
    return yield CreateUpdate(path, next);
  for (let i = 0; i < Math.min(current.length, next.length); i++) {
    yield* Visit15(`${path}/${i}`, current[i], next[i]);
  }
}
function* ValueType2(path, current, next) {
  if (current === next)
    return;
  yield CreateUpdate(path, next);
}
function* Visit15(path, current, next) {
  if (IsStandardObject(current))
    return yield* ObjectType4(path, current, next);
  if (IsArray2(current))
    return yield* ArrayType4(path, current, next);
  if (IsTypedArray(current))
    return yield* TypedArrayType2(path, current, next);
  if (IsValueType(current))
    return yield* ValueType2(path, current, next);
  throw new ValueDiffError(current, "Unable to diff value");
}
function Diff(current, next) {
  return [...Visit15("", current, next)];
}
function IsRootUpdate(edits) {
  return edits.length > 0 && edits[0].path === "" && edits[0].type === "update";
}
function IsIdentity(edits) {
  return edits.length === 0;
}
function Patch(current, edits) {
  if (IsRootUpdate(edits)) {
    return Clone2(edits[0].value);
  }
  if (IsIdentity(edits)) {
    return Clone2(current);
  }
  const clone = Clone2(current);
  for (const edit of edits) {
    switch (edit.type) {
      case "insert": {
        pointer_exports.Set(clone, edit.path, edit.value);
        break;
      }
      case "update": {
        pointer_exports.Set(clone, edit.path, edit.value);
        break;
      }
      case "delete": {
        pointer_exports.Delete(clone, edit.path);
        break;
      }
    }
  }
  return clone;
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/encode/encode.mjs
function Encode(...args) {
  const [schema, references, value] = args.length === 3 ? [args[0], args[1], args[2]] : [args[0], [], args[1]];
  const encoded = HasTransform(schema, references) ? TransformEncode(schema, references, value) : value;
  if (!Check(schema, references, encoded))
    throw new TransformEncodeCheckError(schema, encoded, Errors(schema, references, encoded).First());
  return encoded;
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/mutate/mutate.mjs
function IsStandardObject2(value) {
  return IsObject2(value) && !IsArray2(value);
}
var ValueMutateError = class extends TypeBoxError {
  constructor(message) {
    super(message);
  }
};
function ObjectType5(root, path, current, next) {
  if (!IsStandardObject2(current)) {
    pointer_exports.Set(root, path, Clone2(next));
  } else {
    const currentKeys = Object.getOwnPropertyNames(current);
    const nextKeys = Object.getOwnPropertyNames(next);
    for (const currentKey of currentKeys) {
      if (!nextKeys.includes(currentKey)) {
        delete current[currentKey];
      }
    }
    for (const nextKey of nextKeys) {
      if (!currentKeys.includes(nextKey)) {
        current[nextKey] = null;
      }
    }
    for (const nextKey of nextKeys) {
      Visit16(root, `${path}/${nextKey}`, current[nextKey], next[nextKey]);
    }
  }
}
function ArrayType5(root, path, current, next) {
  if (!IsArray2(current)) {
    pointer_exports.Set(root, path, Clone2(next));
  } else {
    for (let index = 0; index < next.length; index++) {
      Visit16(root, `${path}/${index}`, current[index], next[index]);
    }
    current.splice(next.length);
  }
}
function TypedArrayType3(root, path, current, next) {
  if (IsTypedArray(current) && current.length === next.length) {
    for (let i = 0; i < current.length; i++) {
      current[i] = next[i];
    }
  } else {
    pointer_exports.Set(root, path, Clone2(next));
  }
}
function ValueType3(root, path, current, next) {
  if (current === next)
    return;
  pointer_exports.Set(root, path, next);
}
function Visit16(root, path, current, next) {
  if (IsArray2(next))
    return ArrayType5(root, path, current, next);
  if (IsTypedArray(next))
    return TypedArrayType3(root, path, current, next);
  if (IsStandardObject2(next))
    return ObjectType5(root, path, current, next);
  if (IsValueType(next))
    return ValueType3(root, path, current, next);
}
function IsNonMutableValue(value) {
  return IsTypedArray(value) || IsValueType(value);
}
function IsMismatchedValue(current, next) {
  return IsStandardObject2(current) && IsArray2(next) || IsArray2(current) && IsStandardObject2(next);
}
function Mutate(current, next) {
  if (IsNonMutableValue(current) || IsNonMutableValue(next))
    throw new ValueMutateError("Only object and array types can be mutated at the root level");
  if (IsMismatchedValue(current, next))
    throw new ValueMutateError("Cannot assign due type mismatch of assignable values");
  Visit16(current, "", current, next);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/parse/parse.mjs
var ParseError = class extends TypeBoxError {
  constructor(message) {
    super(message);
  }
};
var ParseRegistry;
(function(ParseRegistry2) {
  const registry = /* @__PURE__ */ new Map([
    ["Assert", (type, references, value) => {
      Assert(type, references, value);
      return value;
    }],
    ["Cast", (type, references, value) => Cast(type, references, value)],
    ["Clean", (type, references, value) => Clean(type, references, value)],
    ["Clone", (_type, _references, value) => Clone2(value)],
    ["Convert", (type, references, value) => Convert(type, references, value)],
    ["Decode", (type, references, value) => HasTransform(type, references) ? TransformDecode(type, references, value) : value],
    ["Default", (type, references, value) => Default5(type, references, value)],
    ["Encode", (type, references, value) => HasTransform(type, references) ? TransformEncode(type, references, value) : value]
  ]);
  function Delete5(key) {
    registry.delete(key);
  }
  ParseRegistry2.Delete = Delete5;
  function Set5(key, callback) {
    registry.set(key, callback);
  }
  ParseRegistry2.Set = Set5;
  function Get4(key) {
    return registry.get(key);
  }
  ParseRegistry2.Get = Get4;
})(ParseRegistry || (ParseRegistry = {}));
var ParseDefault = [
  "Clone",
  "Clean",
  "Default",
  "Convert",
  "Assert",
  "Decode"
];
function ParseValue(operations, type, references, value) {
  return operations.reduce((value2, operationKey) => {
    const operation = ParseRegistry.Get(operationKey);
    if (IsUndefined2(operation))
      throw new ParseError(`Unable to find Parse operation '${operationKey}'`);
    return operation(type, references, value2);
  }, value);
}
function Parse(...args) {
  const [operations, schema, references, value] = args.length === 4 ? [args[0], args[1], args[2], args[3]] : args.length === 3 ? IsArray2(args[0]) ? [args[0], args[1], [], args[2]] : [ParseDefault, args[0], args[1], args[2]] : args.length === 2 ? [ParseDefault, args[0], [], args[1]] : (() => {
    throw new ParseError("Invalid Arguments");
  })();
  return ParseValue(operations, schema, references, value);
}

// ../../node_modules/.pnpm/@sinclair+typebox@0.34.33/node_modules/@sinclair/typebox/build/esm/value/value/value.mjs
var value_exports2 = {};
__export(value_exports2, {
  Assert: () => Assert,
  Cast: () => Cast,
  Check: () => Check,
  Clean: () => Clean,
  Clone: () => Clone2,
  Convert: () => Convert,
  Create: () => Create2,
  Decode: () => Decode,
  Default: () => Default5,
  Diff: () => Diff,
  Edit: () => Edit,
  Encode: () => Encode,
  Equal: () => Equal,
  Errors: () => Errors,
  Hash: () => Hash,
  Mutate: () => Mutate,
  Parse: () => Parse,
  Patch: () => Patch,
  ValueErrorIterator: () => ValueErrorIterator
});

// ../protocol-validation/src/validate.ts
var MAX_LOCATION = 200;
function describeValidationErrors(errors) {
  const first = errors[0];
  if (!first) return "invalid";
  const full = first.code === "MISSING" && first.key ? `${first.path}/${first.key}` : first.path;
  const where = full.length > MAX_LOCATION ? `${full.slice(0, MAX_LOCATION)}…` : full;
  const text = where === "" ? first.message : `${where} ${first.message}`;
  return errors.length > 1 ? `${text} (+${errors.length - 1} more)` : text;
}
function classify(e) {
  const key = e.path.split("/").pop() || void 0;
  if (e.type === ValueErrorType.ObjectRequiredProperty) {
    const path = key ? e.path.slice(0, e.path.length - key.length - 1) : e.path;
    return { path, message: e.message, code: "MISSING", ...key ? { key } : {} };
  }
  const base = { path: e.path, message: e.message, ...key ? { key } : {} };
  switch (e.type) {
    case ValueErrorType.ObjectAdditionalProperties:
      return { ...base, code: "UNKNOWN_KEY" };
    case ValueErrorType.Union:
    case ValueErrorType.Literal:
      return { ...base, code: "ENUM" };
    case ValueErrorType.StringPattern:
    // A format violation (e.g. a `ts` field that is not a valid date-time string) is classified as
    // PATTERN rather than getting its own FORMAT code: both mean "the string's content has the wrong
    // shape", and reusing one of the five existing codes is a smaller change than widening the
    // ValidationError.code union. Callers such as toRpcError do not need to tell "bad regex" from
    // "bad format" — both should surface as the same kind of INVALID_PARAMS hint.
    case ValueErrorType.StringFormat:
      return { ...base, code: "PATTERN" };
    // An unregistered format cannot actually occur — generateModule fails fast on one — so this is
    // defence only: it falls through to `default` and lands on OTHER rather than being handled here.
    case ValueErrorType.StringMinLength:
    case ValueErrorType.StringMaxLength:
    case ValueErrorType.NumberMinimum:
    case ValueErrorType.NumberMaximum:
    // Type.Integer has its own error types, separate from Type.Number's. Without these four an
    // integer out of range fell through to `default` and was reported as OTHER, i.e. INVALID with
    // no hint at all - and integer bounds are the most common constraint in these schemas
    // (`minimum: 1` on every seq, `minimum: 0` on every count).
    case ValueErrorType.IntegerMinimum:
    case ValueErrorType.IntegerMaximum:
    case ValueErrorType.IntegerExclusiveMinimum:
    case ValueErrorType.IntegerExclusiveMaximum:
    case ValueErrorType.NumberExclusiveMinimum:
    case ValueErrorType.NumberExclusiveMaximum:
    case ValueErrorType.ArrayMinItems:
    case ValueErrorType.ArrayMaxItems:
      return { ...base, code: "RANGE" };
    // Null belongs with the other primitive type mismatches. Without it, an observe hook returning
    // an object where the schema says null was reported as OTHER, i.e. INVALID with no hint.
    case ValueErrorType.Null:
    case ValueErrorType.String:
    case ValueErrorType.Number:
    case ValueErrorType.Integer:
    case ValueErrorType.Boolean:
    case ValueErrorType.Object:
    case ValueErrorType.Array:
      return { ...base, code: "TYPE" };
    default:
      return { ...base, code: "OTHER" };
  }
}
function validateAgainst(schema, x, pathPrefix = "") {
  if (value_exports2.Check(schema, x)) return { ok: true, value: x };
  const errors = [...value_exports2.Errors(schema, x)].map(classify).map((e) => ({ ...e, path: pathPrefix + e.path }));
  return {
    ok: false,
    errors: errors.length ? errors : [{ path: pathPrefix, message: "invalid", code: "OTHER" }]
  };
}

// ../protocol/gen/ts/session-v1.ts
var session_v1_exports = {};
__export(session_v1_exports, {
  Actor: () => Actor,
  ApprovalAsked: () => ApprovalAsked,
  ApprovalDecided: () => ApprovalDecided,
  ApprovalGrant: () => ApprovalGrant,
  ApprovalGuardianDecision: () => ApprovalGuardianDecision,
  ArtifactJob: () => ArtifactJob,
  ArtifactRef: () => ArtifactRef,
  AssistantMessage: () => AssistantMessage,
  AssistantOutput: () => AssistantOutput,
  Billing: () => Billing,
  BudgetState: () => BudgetState,
  ContentBlock: () => ContentBlock,
  CostLedger: () => CostLedger,
  DispatchPhase: () => DispatchPhase,
  EffectIntent: () => EffectIntent,
  EffectSettled: () => EffectSettled,
  EventEnvelope: () => EventEnvelope,
  ExecutionDomain: () => ExecutionDomain,
  FeedbackImplicit: () => FeedbackImplicit,
  FeedbackRating: () => FeedbackRating,
  FormatDeviation: () => FormatDeviation,
  HarnessEntry: () => HarnessEntry,
  HarnessEntryValue: () => HarnessEntryValue,
  HarnessRefine: () => HarnessRefine,
  Inbox: () => Inbox,
  InboxItem: () => InboxItem,
  JsonValue: () => JsonValue,
  ModelSettings: () => ModelSettings,
  OpState: () => OpState,
  Participant: () => Participant,
  PlanItems: () => PlanItems,
  RepairDecision: () => RepairDecision,
  RequestHeader: () => RequestHeader,
  RequestMediaHeader: () => RequestMediaHeader,
  RequestMediaManifest: () => RequestMediaManifest,
  RequestMediaManifestEntry: () => RequestMediaManifestEntry,
  RequestSent: () => RequestSent,
  ResolvedToolCallPolicy: () => ResolvedToolCallPolicy,
  ResponseMeta: () => ResponseMeta,
  Root: () => Root,
  SessionModelSelection: () => SessionModelSelection,
  SessionStart: () => SessionStart,
  SessionV1: () => SessionV1,
  StepEnd: () => StepEnd,
  StepStart: () => StepStart,
  SubagentCost: () => SubagentCost,
  SurfaceOp: () => SurfaceOp,
  ThinkingLevel: () => ThinkingLevel,
  ToolCall: () => ToolCall,
  ToolCallState: () => ToolCallState,
  ToolResult: () => ToolResult,
  TurnEnd: () => TurnEnd,
  TurnStart: () => TurnStart,
  UserMessage: () => UserMessage,
  Verdict: () => Verdict,
  VerifierSignal: () => VerifierSignal,
  X_AGNES_DATA: () => X_AGNES_DATA
});
if (!format_exports.Has("date-time")) format_exports.Set("date-time", (value) => {
  const parts = value.split(/t/i);
  if (parts.length !== 2) return false;
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(parts[0] ?? "");
  const time = /^(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)(z|([+-])(\d{2}):(\d{2}))$/i.exec(parts[1] ?? "");
  if (!date || !time) return false;
  const year = Number(date[1]), month = Number(date[2]), day = Number(date[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > (days[month] ?? 0)) return false;
  const hour = Number(time[1]), minute = Number(time[2]), second = Number(time[3]);
  const offsetHour = Number(time[6] || 0), offsetMinute = Number(time[7] || 0);
  if (hour > 23 || minute > 59 || offsetHour > 23 || offsetMinute > 59) return false;
  if (second < 60) return true;
  const sign = time[5] === "-" ? -1 : 1;
  const utcMinute = minute - offsetMinute * sign;
  const utcHour = hour - offsetHour * sign - (utcMinute < 0 ? 1 : 0);
  return (utcHour === 23 || utcHour === -1) && (utcMinute === 59 || utcMinute === -1) && second < 61;
});
var JsonValue = Type.Recursive((This) => Type.Union([Type.Null(), Type.Boolean(), Type.Number(), Type.String(), Type.Array(This), Type.Record(Type.String(), This)]));
var SessionV1 = Type.Module({
  "Actor": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 256 }), "org": Type.String({ maxLength: 256 }), "role": Type.String({ maxLength: 64 }), "deptPath": Type.Array(Type.String({ maxLength: 256 })), "attrs": Type.Record(Type.String(), Type.String({ maxLength: 1024 })) }, { additionalProperties: false }),
  "ContentBlock": Type.Union([Type.Object({ "type": Type.Literal("text"), "text": Type.String({ maxLength: 1048576 }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("image"), "data": Type.String(), "mimeType": Type.String({ maxLength: 128 }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("file"), "data": Type.String(), "mimeType": Type.String({ minLength: 1, maxLength: 128 }), "name": Type.String({ minLength: 1, maxLength: 256 }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("resource_link"), "uri": Type.String({ maxLength: 4096 }), "name": Type.Optional(Type.String({ maxLength: 256 })), "mimeType": Type.Optional(Type.String({ maxLength: 128 })) }, { additionalProperties: false })]),
  "SurfaceOp": Type.Union([Type.Literal("append"), Type.Object({ "op": Type.Literal("replace"), "start": Type.Integer({ minimum: 1 }), "end": Type.Integer({ minimum: 1 }) }, { additionalProperties: false })]),
  "EventEnvelope": Type.Object({ "seq": Type.Integer({ minimum: 1 }), "ts": Type.String({ format: "date-time" }), "id": Type.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" }), "type": Type.Union([Type.Union([Type.Literal("session/start"), Type.Literal("turn/start"), Type.Literal("turn/end"), Type.Literal("step/start"), Type.Literal("step/end"), Type.Literal("user/message"), Type.Literal("assistant/message"), Type.Literal("tool/result"), Type.Literal("assistant/output"), Type.Literal("tool/call"), Type.Literal("request/header"), Type.Literal("request/sent"), Type.Literal("plan.items"), Type.Literal("budget.state"), Type.Literal("artifact/job"), Type.Literal("inbox"), Type.Literal("harness/entry"), Type.Literal("effect/intent"), Type.Literal("effect/settled"), Type.Literal("verifier/signal"), Type.Literal("repair/decision"), Type.Literal("format/deviation"), Type.Literal("cost/ledger"), Type.Literal("approval/asked"), Type.Literal("approval/decided"), Type.Literal("approval/guardian-decided"), Type.Literal("feedback/rating"), Type.Literal("feedback/implicit"), Type.Literal("participant"), Type.Literal("harness/refine"), Type.Literal("subagent/cost")]), Type.String({ maxLength: 128, pattern: "^x\\/(?:(?:core|agnes)\\/[a-z0-9-]+|host\\/session-title|[a-z0-9-]+\\/[a-z0-9-]+\\/[a-z0-9-]+)$" })]), "data": JsonValue, "actor": Type.Ref("Actor"), "origin": Type.String({ maxLength: 256, pattern: "^(principal|model|system|memory|tool:[^\\s]+|external:[^\\s]+|skill:[^\\s]+|subagent:[^\\s]+|ext:[^\\s]+|import:[^\\s]+)$" }), "trust": Type.Union([Type.Literal("trusted"), Type.Literal("untrusted")]), "lane": Type.Optional(Type.String({ minLength: 1, maxLength: 64 })), "v": Type.Optional(Type.Integer({ minimum: 1 })), "register": Type.Optional(Type.String({ maxLength: 128 })), "ignorable": Type.Optional(Type.Literal(true)), "surfaceOp": Type.Optional(Type.Ref("SurfaceOp")), "sourceEventSeqs": Type.Optional(Type.Array(Type.Integer({ minimum: 1 }))) }, { additionalProperties: false }),
  "SessionModelSelection": Type.Object({ "slot": Type.String(), "route": Type.String(), "model": Type.String(), "settings": Type.Ref("ModelSettings") }, { additionalProperties: false }),
  "SessionStart": Type.Object({ "key": Type.String({ maxLength: 512 }), "resolvedProfileHash": Type.Union([Type.String({ maxLength: 128 }), Type.Null()]), "preset": Type.Union([Type.String({ maxLength: 128 }), Type.Null()]), "agnesVersion": Type.String({ maxLength: 64 }), "modelSettings": Type.Optional(Type.Array(Type.Ref("SessionModelSelection"), { maxItems: 7 })), "parent": Type.Optional(Type.Object({ "key": Type.String({ maxLength: 512 }), "boundarySeq": Type.Integer({ minimum: 1 }) }, { additionalProperties: false })), "imported": Type.Optional(Type.Object({ "source": Type.Union([Type.Literal("claude-code"), Type.Literal("codex"), Type.Literal("pi"), Type.Literal("agnes")]), "sourceId": Type.String({ maxLength: 256 }), "cwd": Type.String({ maxLength: 4096 }) }, { additionalProperties: false })), "presetId": Type.Optional(Type.Union([Type.String({ maxLength: 128 }), Type.Null()])), "resolvedPresetHash": Type.Optional(Type.Union([Type.String({ maxLength: 128 }), Type.Null()])), "platform": Type.Optional(Type.Object({ "os": Type.Optional(Type.String({ maxLength: 32 })), "arch": Type.Optional(Type.String({ maxLength: 32 })), "shell": Type.Optional(Type.String({ maxLength: 32 })) }, { additionalProperties: false })), "delegation": Type.Optional(Type.Object({ "kind": Type.Union([Type.Literal("fork"), Type.Literal("spawn")]), "creationId": Type.String({ minLength: 1, maxLength: 512 }), "rootTaskId": Type.String({ minLength: 1, maxLength: 512 }), "generationDepth": Type.Integer({ minimum: 0 }) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "SubagentCost": Type.Object({ "childKey": Type.String({ minLength: 1, maxLength: 512 }), "originSessionKey": Type.String({ minLength: 1, maxLength: 512 }), "originCostSeq": Type.Integer({ minimum: 1 }), "settlementRevision": Type.Integer({ minimum: 1 }), "credits": Type.Optional(Type.Number({ minimum: 0 })), "creditSource": Type.Optional(Type.Union([Type.Literal("gateway"), Type.Literal("estimated"), Type.Literal("unknown")])), "complete": Type.Optional(Type.Boolean()) }, { additionalProperties: false }),
  "TurnStart": Type.Object({ "turn": Type.Integer({ minimum: 1 }), "trigger": Type.Union([Type.Literal("prompt"), Type.Literal("steer"), Type.Literal("follow_up"), Type.Literal("job"), Type.Literal("approval-resume")]), "continues": Type.Optional(Type.Object({ "turn": Type.Integer(), "step": Type.Integer(), "toolUseId": Type.Optional(Type.String({ maxLength: 128 })), "requestId": Type.Optional(Type.String({ maxLength: 128 })) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "TurnEnd": Type.Object({ "reason": Type.Union([Type.Literal("completed"), Type.Literal("aborted"), Type.Literal("error"), Type.Literal("parked"), Type.Literal("blocked"), Type.Literal("budget"), Type.Literal("max_steps"), Type.Literal("interrupted")]), "lastAssistantSeq": Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]), "error": Type.Optional(Type.Object({ "code": Type.String({ maxLength: 64 }), "message": Type.String({ maxLength: 4096 }) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "StepStart": Type.Object({ "turn": Type.Integer({ minimum: 1 }), "step": Type.Integer({ minimum: 1 }) }, { additionalProperties: false }),
  "StepEnd": Type.Object({ "turn": Type.Integer({ minimum: 1 }), "step": Type.Integer({ minimum: 1 }) }, { additionalProperties: false }),
  "UserMessage": Type.Object({ "content": Type.Array(Type.Ref("ContentBlock"), { minItems: 1 }), "kind": Type.Optional(Type.Union([Type.Literal("prompt"), Type.Literal("steer"), Type.Literal("follow_up"), Type.Literal("runtime_context")])), "titleLocale": Type.Optional(Type.Union([Type.Literal("en"), Type.Literal("zh-CN")])) }, { additionalProperties: false }),
  "AssistantMessage": Type.Object({ "content": Type.Array(Type.Union([Type.Object({ "type": Type.Literal("text"), "text": Type.String() }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("thinking"), "text": Type.String() }, { additionalProperties: false })])), "stopReason": Type.Union([Type.Literal("end_turn"), Type.Literal("tool_use"), Type.Literal("max_tokens"), Type.Literal("refusal"), Type.Literal("error")]), "requestSeq": Type.Optional(Type.Integer({ minimum: 1 })) }, { additionalProperties: false }),
  "ResolvedToolCallPolicy": Type.Object({ "isReadOnly": Type.Boolean(), "isDestructive": Type.Boolean(), "isConcurrencySafe": Type.Optional(Type.Boolean()), "isOpenWorld": Type.Optional(Type.Boolean()), "returnsImages": Type.Optional(Type.Literal(true)), "replay": Type.Union([Type.Literal("safe"), Type.Literal("never"), Type.Literal("idempotent")]), "requiresApproval": Type.Union([Type.Literal("never"), Type.Literal("destructive"), Type.Literal("always")]), "approvalScopes": Type.Array(Type.String({ pattern: "^[A-Za-z][A-Za-z0-9_.:-]{0,63}$" }), { maxItems: 16, uniqueItems: true }), "policyVersion": Type.String({ pattern: "^[A-Za-z][A-Za-z0-9_.:-]{0,63}$" }) }, { additionalProperties: false }),
  "ExecutionDomain": Type.Union([Type.Literal("workspace"), Type.Literal("host-computer-use")]),
  "DispatchPhase": Type.Union([Type.Literal("not_sent"), Type.Literal("may_have_sent"), Type.Literal("responded")]),
  "ToolCall": Type.Intersect([Type.Object({ "toolUseId": Type.String({ maxLength: 128 }), "name": Type.String({ pattern: "^[A-Za-z_][A-Za-z0-9_]{0,63}$" }), "args": JsonValue, "ordinal": Type.Integer({ minimum: 0 }), "depth": Type.Optional(Type.Integer({ minimum: 0 })), "parentEffectId": Type.Optional(Type.String({ maxLength: 128 })), "resolvedPolicy": Type.Optional(Type.Ref("ResolvedToolCallPolicy")), "executionDomain": Type.Optional(Type.Ref("ExecutionDomain")), "definitionFingerprint": Type.Optional(Type.String({ pattern: "^[0-9a-f]{64}$" })), "policyHash": Type.Optional(Type.String({ pattern: "^[0-9a-f]{64}$" })) }, { additionalProperties: false }), Type.Union([Type.Not(Type.Union([Type.Object({ "resolvedPolicy": Type.Unknown() }), Type.Object({ "executionDomain": Type.Unknown() }), Type.Object({ "definitionFingerprint": Type.Unknown() }), Type.Object({ "policyHash": Type.Unknown() })])), Type.Object({ "resolvedPolicy": Type.Unknown(), "executionDomain": Type.Unknown(), "definitionFingerprint": Type.Unknown(), "policyHash": Type.Unknown() })])]),
  "ToolResult": Type.Object({ "toolUseId": Type.String({ maxLength: 128 }), "content": Type.Array(Type.Ref("ContentBlock")), "structured": Type.Optional(JsonValue), "isError": Type.Boolean(), "code": Type.Optional(Type.String({ maxLength: 64 })), "enforcement": Type.Object({ "level": Type.Union([Type.Literal("full"), Type.Literal("partial"), Type.Literal("none")]), "scope": Type.Array(Type.Union([Type.Literal("file"), Type.Literal("network"), Type.Literal("process")])) }, { additionalProperties: false }), "authz": Type.Object({ "decisionId": Type.String({ maxLength: 128 }) }, { additionalProperties: false }), "partial": Type.Optional(Type.Boolean()), "cancelledBy": Type.Optional(Type.Ref("Actor")), "interrupted": Type.Optional(Type.Boolean()), "transformedBy": Type.Optional(Type.String({ maxLength: 128 })) }, { additionalProperties: false }),
  "RequestMediaManifestEntry": Type.Object({ "nodeSeq": Type.Integer({ minimum: 1 }), "artifactUri": Type.String({ pattern: "^artifact://[0-9a-f]{64}$" }), "sha256": Type.String({ pattern: "^[0-9a-f]{64}$" }), "mime": Type.Union([Type.Literal("image/png"), Type.Literal("image/jpeg")]), "width": Type.Integer({ minimum: 1 }), "height": Type.Integer({ minimum: 1 }), "selected": Type.Boolean(), "reason": Type.Optional(Type.Union([Type.Literal("latest-three"), Type.Literal("deduplicated"), Type.Literal("compacted"), Type.Literal("unsupported"), Type.Literal("too-small")])), "elementMapDigest": Type.Optional(Type.String({ pattern: "^[0-9a-f]{64}$" })) }, { additionalProperties: false }),
  "RequestMediaManifest": Type.Array(Type.Ref("RequestMediaManifestEntry")),
  "RequestMediaHeader": Type.Object({ "version": Type.Literal(1), "selectionOrder": Type.Array(Type.Integer({ minimum: 0 }), { uniqueItems: true }), "route": Type.Union([Type.Literal("native-image"), Type.Literal("auxiliary-vision"), Type.Literal("text-only")]), "manifest": Type.Ref("RequestMediaManifest") }, { additionalProperties: false }),
  "RequestHeader": Type.Object({ "derived_hash": Type.String({ maxLength: 128 }), "sent_hash": Type.Optional(Type.String({ maxLength: 128 })), "transforms": Type.Optional(Type.Array(Type.Object({ "event": Type.String({ maxLength: 64 }), "ext": Type.String({ maxLength: 128 }) }, { additionalProperties: false }))), "prompt_prefix_hash": Type.String({ maxLength: 128 }), "tool_schema_hash": Type.String({ maxLength: 128 }), "parser_version": Type.String({ maxLength: 32 }), "contract_id": Type.Union([Type.String({ maxLength: 128 }), Type.Null()]), "model": Type.String({ maxLength: 256 }), "envelopeNonce": Type.String({ maxLength: 64 }), "media": Type.Optional(Type.Ref("RequestMediaHeader")) }, { additionalProperties: false }),
  "RequestSent": Type.Object({ "prompt_prefix_hash": Type.Union([Type.String({ pattern: "^[0-9a-f]{64}$" }), Type.Null()]), "tool_schema_hash": Type.String({ pattern: "^[0-9a-f]{64}$" }), "parser_version": Type.String({ maxLength: 32 }), "contract_id": Type.Union([Type.String({ maxLength: 128 }), Type.Null()]), "model": Type.Object({ "route": Type.String({ maxLength: 128 }), "id": Type.String({ maxLength: 256 }), "responseModel": Type.Optional(Type.String({ maxLength: 256 })) }, { additionalProperties: false }), "derived_hash": Type.String({ pattern: "^[0-9a-f]{64}$" }), "sent_hash": Type.String({ pattern: "^[0-9a-f]{64}$" }), "transforms": Type.Array(Type.Object({ "event": Type.String({ maxLength: 64 }), "ext": Type.String({ maxLength: 128 }) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "OpState": Type.Union([Type.Null(), Type.Object({ "meta": Type.Object({ "turn": Type.Integer({ minimum: 1 }), "lane": Type.String(), "acceptedAt": Type.String(), "triggerSeq": Type.Integer({ minimum: 1 }), "presetName": Type.String(), "profileHash": Type.Union([Type.String(), Type.Null()]), "depthLimit": Type.Integer({ minimum: 0 }) }, { additionalProperties: false }), "control": Type.Union([Type.Object({ "status": Type.Literal("running") }, { additionalProperties: false }), Type.Object({ "status": Type.Literal("cancel_requested"), "requestedAt": Type.String(), "by": Type.Ref("Actor") }, { additionalProperties: false })]), "step": Type.Integer({ minimum: 0 }), "latestAssistantSeq": Type.Union([Type.Integer(), Type.Null()]), "taint": Type.Boolean(), "phase": Type.Union([Type.Object({ "kind": Type.Literal("checkpoint"), "continuation": Type.Union([Type.Literal("need_assistant"), Type.Literal("may_finish")]), "triggerSeq": Type.Integer(), "thresholdCheckedSeq": Type.Optional(Type.Integer()), "skipInboxOnce": Type.Optional(Type.Literal(true)) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("inference"), "gen": Type.Union([Type.Object({ "status": Type.Literal("ready"), "attempt": Type.Integer() }, { additionalProperties: false }), Type.Object({ "status": Type.Literal("effect_pending"), "attempt": Type.Integer(), "effectId": Type.String(), "slot": Type.String() }, { additionalProperties: false }), Type.Object({ "status": Type.Literal("retry_wait"), "attempt": Type.Integer(), "notBefore": Type.String(), "code": Type.String() }, { additionalProperties: false })]) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("tools"), "batch": Type.Object({ "assistantSeq": Type.Integer(), "calls": Type.Array(Type.Ref("ToolCallState")) }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("compaction"), "reason": Type.Union([Type.Literal("threshold"), Type.Literal("overflow"), Type.Literal("requested")]), "plan": Type.Optional(JsonValue), "effectIds": Type.Optional(Type.Array(Type.String())), "resumeAfter": JsonValue }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("deferred"), "jobs": Type.Array(Type.Object({ "jobId": Type.String({ maxLength: 128 }), "toolUseId": Type.String({ maxLength: 128 }), "callSeq": Type.Optional(Type.Integer({ minimum: 1 })) }, { additionalProperties: false })), "resumeAfter": JsonValue }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("failure_drain"), "error": Type.Object({ "code": Type.String(), "message": Type.String() }, { additionalProperties: false }), "provenance": Type.Object({ "kind": Type.Union([Type.Literal("inference"), Type.Literal("tool"), Type.Literal("seam")]), "seq": Type.Optional(Type.Integer()) }, { additionalProperties: false }) }, { additionalProperties: false })]) }, { additionalProperties: false })]),
  "ToolCallState": Type.Union([Type.Intersect([Type.Intersect([Type.Object({ "ordinal": Type.Integer({ minimum: 0 }), "toolUseId": Type.String(), "name": Type.String(), "argsSeq": Type.Integer({ minimum: 1 }), "effectId": Type.Optional(Type.String()), "replay": Type.Union([Type.Literal("safe"), Type.Literal("never"), Type.Literal("idempotent")]), "terminate": Type.Optional(Type.Boolean()), "depth": Type.Optional(Type.Integer({ minimum: 0 })), "parentEffectId": Type.Optional(Type.String({ maxLength: 128 })), "resolvedPolicy": Type.Optional(Type.Ref("ResolvedToolCallPolicy")), "executionDomain": Type.Optional(Type.Ref("ExecutionDomain")), "definitionFingerprint": Type.Optional(Type.String({ pattern: "^[0-9a-f]{64}$" })), "policyHash": Type.Optional(Type.String({ pattern: "^[0-9a-f]{64}$" })), "dispatchAttempt": Type.Optional(Type.Union([Type.Literal(1), Type.Literal(2)])), "dispatchPhase": Type.Optional(Type.Ref("DispatchPhase")), "status": Type.Union([Type.Literal("planned"), Type.Literal("awaiting_approval")]) }, { additionalProperties: false }), Type.Union([Type.Not(Type.Union([Type.Object({ "resolvedPolicy": Type.Unknown() }), Type.Object({ "executionDomain": Type.Unknown() }), Type.Object({ "definitionFingerprint": Type.Unknown() }), Type.Object({ "policyHash": Type.Unknown() })])), Type.Object({ "resolvedPolicy": Type.Unknown(), "executionDomain": Type.Unknown(), "definitionFingerprint": Type.Unknown(), "policyHash": Type.Unknown() })])]), Type.Not(Type.Union([Type.Object({ "effectId": Type.Unknown() }), Type.Object({ "dispatchAttempt": Type.Unknown() }), Type.Object({ "dispatchPhase": Type.Unknown() })]))]), Type.Intersect([Type.Object({ "ordinal": Type.Integer({ minimum: 0 }), "toolUseId": Type.String(), "name": Type.String(), "argsSeq": Type.Integer({ minimum: 1 }), "effectId": Type.Optional(Type.String()), "replay": Type.Union([Type.Literal("safe"), Type.Literal("never"), Type.Literal("idempotent")]), "terminate": Type.Optional(Type.Boolean()), "depth": Type.Optional(Type.Integer({ minimum: 0 })), "parentEffectId": Type.Optional(Type.String({ maxLength: 128 })), "resolvedPolicy": Type.Ref("ResolvedToolCallPolicy"), "executionDomain": Type.Ref("ExecutionDomain"), "definitionFingerprint": Type.String({ pattern: "^[0-9a-f]{64}$" }), "policyHash": Type.String({ pattern: "^[0-9a-f]{64}$" }), "dispatchAttempt": Type.Optional(Type.Union([Type.Literal(1), Type.Literal(2)])), "dispatchPhase": Type.Optional(Type.Ref("DispatchPhase")), "status": Type.Literal("approved") }, { additionalProperties: false }), Type.Not(Type.Union([Type.Object({ "effectId": Type.Unknown() }), Type.Object({ "dispatchAttempt": Type.Unknown() }), Type.Object({ "dispatchPhase": Type.Unknown() })]))]), Type.Intersect([Type.Intersect([Type.Object({ "ordinal": Type.Integer({ minimum: 0 }), "toolUseId": Type.String(), "name": Type.String(), "argsSeq": Type.Integer({ minimum: 1 }), "effectId": Type.String(), "replay": Type.Union([Type.Literal("safe"), Type.Literal("never"), Type.Literal("idempotent")]), "terminate": Type.Optional(Type.Boolean()), "depth": Type.Optional(Type.Integer({ minimum: 0 })), "parentEffectId": Type.Optional(Type.String({ maxLength: 128 })), "resolvedPolicy": Type.Ref("ResolvedToolCallPolicy"), "executionDomain": Type.Ref("ExecutionDomain"), "definitionFingerprint": Type.String({ pattern: "^[0-9a-f]{64}$" }), "policyHash": Type.String({ pattern: "^[0-9a-f]{64}$" }), "dispatchAttempt": Type.Union([Type.Literal(1), Type.Literal(2)]), "dispatchPhase": Type.Optional(Type.Literal("not_sent")), "status": Type.Literal("dispatch_pending") }, { additionalProperties: false }), Type.Union([Type.Not(Type.Union([Type.Object({ "resolvedPolicy": Type.Unknown() }), Type.Object({ "executionDomain": Type.Unknown() }), Type.Object({ "definitionFingerprint": Type.Unknown() }), Type.Object({ "policyHash": Type.Unknown() })])), Type.Object({ "resolvedPolicy": Type.Unknown(), "executionDomain": Type.Unknown(), "definitionFingerprint": Type.Unknown(), "policyHash": Type.Unknown() })])]), Type.Not(Type.Intersect([Type.Object({ "dispatchPhase": Type.Unknown() }), Type.Object({ "executionDomain": Type.Literal("workspace") })]))]), Type.Intersect([Type.Intersect([Type.Object({ "ordinal": Type.Integer({ minimum: 0 }), "toolUseId": Type.String(), "name": Type.String(), "argsSeq": Type.Integer({ minimum: 1 }), "effectId": Type.String(), "replay": Type.Union([Type.Literal("safe"), Type.Literal("never"), Type.Literal("idempotent")]), "terminate": Type.Optional(Type.Boolean()), "depth": Type.Optional(Type.Integer({ minimum: 0 })), "parentEffectId": Type.Optional(Type.String({ maxLength: 128 })), "resolvedPolicy": Type.Optional(Type.Ref("ResolvedToolCallPolicy")), "executionDomain": Type.Optional(Type.Ref("ExecutionDomain")), "definitionFingerprint": Type.Optional(Type.String({ pattern: "^[0-9a-f]{64}$" })), "policyHash": Type.Optional(Type.String({ pattern: "^[0-9a-f]{64}$" })), "dispatchAttempt": Type.Optional(Type.Union([Type.Literal(1), Type.Literal(2)])), "dispatchPhase": Type.Optional(Type.Ref("DispatchPhase")), "status": Type.Literal("effect_pending") }, { additionalProperties: false }), Type.Union([Type.Not(Type.Union([Type.Object({ "resolvedPolicy": Type.Unknown() }), Type.Object({ "executionDomain": Type.Unknown() }), Type.Object({ "definitionFingerprint": Type.Unknown() }), Type.Object({ "policyHash": Type.Unknown() })])), Type.Object({ "resolvedPolicy": Type.Unknown(), "executionDomain": Type.Unknown(), "definitionFingerprint": Type.Unknown(), "policyHash": Type.Unknown() })])]), Type.Not(Type.Union([Type.Object({ "dispatchAttempt": Type.Unknown() }), Type.Object({ "dispatchPhase": Type.Unknown() })]))]), Type.Intersect([Type.Object({ "ordinal": Type.Integer({ minimum: 0 }), "toolUseId": Type.String(), "name": Type.String(), "argsSeq": Type.Integer({ minimum: 1 }), "effectId": Type.String(), "replay": Type.Union([Type.Literal("safe"), Type.Literal("never"), Type.Literal("idempotent")]), "terminate": Type.Optional(Type.Boolean()), "depth": Type.Optional(Type.Integer({ minimum: 0 })), "parentEffectId": Type.Optional(Type.String({ maxLength: 128 })), "resolvedPolicy": Type.Ref("ResolvedToolCallPolicy"), "executionDomain": Type.Ref("ExecutionDomain"), "definitionFingerprint": Type.String({ pattern: "^[0-9a-f]{64}$" }), "policyHash": Type.String({ pattern: "^[0-9a-f]{64}$" }), "dispatchAttempt": Type.Union([Type.Literal(1), Type.Literal(2)]), "dispatchPhase": Type.Literal("may_have_sent"), "status": Type.Literal("dispatched") }, { additionalProperties: false }), Type.Union([Type.Not(Type.Union([Type.Object({ "resolvedPolicy": Type.Unknown() }), Type.Object({ "executionDomain": Type.Unknown() }), Type.Object({ "definitionFingerprint": Type.Unknown() }), Type.Object({ "policyHash": Type.Unknown() })])), Type.Object({ "resolvedPolicy": Type.Unknown(), "executionDomain": Type.Unknown(), "definitionFingerprint": Type.Unknown(), "policyHash": Type.Unknown() })])]), Type.Intersect([Type.Object({ "ordinal": Type.Integer({ minimum: 0 }), "toolUseId": Type.String(), "name": Type.String(), "argsSeq": Type.Integer({ minimum: 1 }), "effectId": Type.String(), "replay": Type.Union([Type.Literal("safe"), Type.Literal("never"), Type.Literal("idempotent")]), "terminate": Type.Optional(Type.Boolean()), "depth": Type.Optional(Type.Integer({ minimum: 0 })), "parentEffectId": Type.Optional(Type.String({ maxLength: 128 })), "resolvedPolicy": Type.Ref("ResolvedToolCallPolicy"), "executionDomain": Type.Ref("ExecutionDomain"), "definitionFingerprint": Type.String({ pattern: "^[0-9a-f]{64}$" }), "policyHash": Type.String({ pattern: "^[0-9a-f]{64}$" }), "dispatchAttempt": Type.Union([Type.Literal(1), Type.Literal(2)]), "dispatchPhase": Type.Literal("responded"), "status": Type.Literal("responded") }, { additionalProperties: false }), Type.Union([Type.Not(Type.Union([Type.Object({ "resolvedPolicy": Type.Unknown() }), Type.Object({ "executionDomain": Type.Unknown() }), Type.Object({ "definitionFingerprint": Type.Unknown() }), Type.Object({ "policyHash": Type.Unknown() })])), Type.Object({ "resolvedPolicy": Type.Unknown(), "executionDomain": Type.Unknown(), "definitionFingerprint": Type.Unknown(), "policyHash": Type.Unknown() })])]), Type.Intersect([Type.Intersect([Type.Object({ "ordinal": Type.Integer({ minimum: 0 }), "toolUseId": Type.String(), "name": Type.String(), "argsSeq": Type.Integer({ minimum: 1 }), "effectId": Type.Optional(Type.String()), "replay": Type.Union([Type.Literal("safe"), Type.Literal("never"), Type.Literal("idempotent")]), "terminate": Type.Optional(Type.Boolean()), "depth": Type.Optional(Type.Integer({ minimum: 0 })), "parentEffectId": Type.Optional(Type.String({ maxLength: 128 })), "resolvedPolicy": Type.Optional(Type.Ref("ResolvedToolCallPolicy")), "executionDomain": Type.Optional(Type.Ref("ExecutionDomain")), "definitionFingerprint": Type.Optional(Type.String({ pattern: "^[0-9a-f]{64}$" })), "policyHash": Type.Optional(Type.String({ pattern: "^[0-9a-f]{64}$" })), "dispatchAttempt": Type.Optional(Type.Union([Type.Literal(1), Type.Literal(2)])), "dispatchPhase": Type.Optional(Type.Ref("DispatchPhase")), "status": Type.Literal("completed") }, { additionalProperties: false }), Type.Union([Type.Not(Type.Union([Type.Object({ "resolvedPolicy": Type.Unknown() }), Type.Object({ "executionDomain": Type.Unknown() }), Type.Object({ "definitionFingerprint": Type.Unknown() }), Type.Object({ "policyHash": Type.Unknown() })])), Type.Object({ "resolvedPolicy": Type.Unknown(), "executionDomain": Type.Unknown(), "definitionFingerprint": Type.Unknown(), "policyHash": Type.Unknown() })])]), Type.Not(Type.Union([Type.Object({ "dispatchAttempt": Type.Unknown() }), Type.Object({ "dispatchPhase": Type.Unknown() })]))]), Type.Intersect([Type.Object({ "ordinal": Type.Integer({ minimum: 0 }), "toolUseId": Type.String(), "name": Type.String(), "argsSeq": Type.Integer({ minimum: 1 }), "effectId": Type.String(), "replay": Type.Union([Type.Literal("safe"), Type.Literal("never"), Type.Literal("idempotent")]), "terminate": Type.Optional(Type.Boolean()), "depth": Type.Optional(Type.Integer({ minimum: 0 })), "parentEffectId": Type.Optional(Type.String({ maxLength: 128 })), "resolvedPolicy": Type.Ref("ResolvedToolCallPolicy"), "executionDomain": Type.Ref("ExecutionDomain"), "definitionFingerprint": Type.String({ pattern: "^[0-9a-f]{64}$" }), "policyHash": Type.String({ pattern: "^[0-9a-f]{64}$" }), "dispatchAttempt": Type.Union([Type.Literal(1), Type.Literal(2)]), "dispatchPhase": Type.Ref("DispatchPhase"), "status": Type.Literal("completed") }, { additionalProperties: false }), Type.Union([Type.Not(Type.Union([Type.Object({ "resolvedPolicy": Type.Unknown() }), Type.Object({ "executionDomain": Type.Unknown() }), Type.Object({ "definitionFingerprint": Type.Unknown() }), Type.Object({ "policyHash": Type.Unknown() })])), Type.Object({ "resolvedPolicy": Type.Unknown(), "executionDomain": Type.Unknown(), "definitionFingerprint": Type.Unknown(), "policyHash": Type.Unknown() })])])]),
  "ArtifactRef": Type.Object({ "sha256": Type.String({ pattern: "^[0-9a-f]{64}$" }), "size": Type.Integer({ minimum: 0 }), "mime": Type.String({ maxLength: 128 }) }, { additionalProperties: false }),
  "Verdict": Type.Object({ "outcome": Type.Union([Type.Literal("pass"), Type.Literal("fail"), Type.Literal("needs_revision"), Type.Literal("unavailable")]), "reasons": Type.Array(Type.String({ maxLength: 1024 })) }, { additionalProperties: false }),
  "AssistantOutput": Type.Union([Type.Object({ "state": Type.Union([Type.Literal("started"), Type.Literal("progress")]), "effectId": Type.String({ maxLength: 128 }), "chars": Type.Object({ "text": Type.Integer({ minimum: 0 }), "thinking": Type.Integer({ minimum: 0 }) }, { additionalProperties: false }), "estimatedTokens": Type.Integer({ minimum: 0 }) }, { additionalProperties: false }), Type.Object({ "state": Type.Literal("interrupted"), "effectId": Type.String({ maxLength: 128 }), "chars": Type.Object({ "text": Type.Integer({ minimum: 0 }), "thinking": Type.Integer({ minimum: 0 }) }, { additionalProperties: false }), "estimatedTokens": Type.Integer({ minimum: 0 }), "content": Type.Array(Type.Union([Type.Object({ "type": Type.Literal("text"), "text": Type.String() }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("thinking"), "text": Type.String() }, { additionalProperties: false })])) }, { additionalProperties: false })]),
  "PlanItems": Type.Union([Type.Null(), Type.Object({ "items": Type.Array(Type.Object({ "id": Type.String({ maxLength: 64 }), "text": Type.String({ maxLength: 2048 }), "status": Type.Union([Type.Literal("todo"), Type.Literal("doing"), Type.Literal("done"), Type.Literal("blocked")]), "check": Type.Optional(Type.String({ maxLength: 2048 })) }, { additionalProperties: false })), "customInstructions": Type.Optional(Type.String({ maxLength: 8192 })) }, { additionalProperties: false })]),
  "BudgetState": Type.Union([Type.Null(), Type.Object({ "slot": Type.String({ maxLength: 32 }), "escalate": Type.Boolean(), "creditsUsed": Type.Number({ minimum: 0 }), "creditsCap": Type.Union([Type.Number({ minimum: 0 }), Type.Null()]), "lastPreflight": Type.Optional(Type.Object({ "tokens": Type.Integer({ minimum: 0 }), "source": Type.Union([Type.Literal("count"), Type.Literal("estimate")]), "boundHash": Type.Optional(Type.String({ pattern: "^[0-9a-f]{64}$" })), "at": Type.Optional(Type.String()), "seq": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false })) }, { additionalProperties: false })]),
  "ArtifactJob": Type.Union([Type.Null(), Type.Object({ "jobId": Type.String({ maxLength: 128 }), "status": Type.Union([Type.Literal("queued"), Type.Literal("running"), Type.Literal("done"), Type.Literal("failed"), Type.Literal("cancelled")]), "ref": Type.Optional(Type.Ref("ArtifactRef")), "error": Type.Optional(Type.String({ maxLength: 4096 })) }, { additionalProperties: false })]),
  "InboxItem": Type.Object({ "itemId": Type.String({ maxLength: 128 }), "target": Type.Union([Type.Literal("next-turn"), Type.Literal("next-step")]), "content": Type.Array(Type.Ref("ContentBlock"), { minItems: 1 }), "actor": Type.Ref("Actor"), "commandId": Type.Optional(Type.String({ maxLength: 128 })), "admissionId": Type.Optional(Type.String({ pattern: "^[0-9a-f]{64}$" })), "enqueuedAt": Type.String(), "titleLocale": Type.Optional(Type.Union([Type.Literal("en"), Type.Literal("zh-CN")])), "kind": Type.Optional(Type.Union([Type.Literal("prompt"), Type.Literal("steer"), Type.Literal("follow_up")])), "trust": Type.Optional(Type.Union([Type.Literal("trusted"), Type.Literal("untrusted")])) }, { additionalProperties: false }),
  "Inbox": Type.Union([Type.Null(), Type.Object({ "items": Type.Array(Type.Ref("InboxItem")) }, { additionalProperties: false })]),
  "HarnessEntryValue": Type.Object({ "kind": Type.Union([Type.Literal("prompt"), Type.Literal("memory"), Type.Literal("skill"), Type.Literal("subagent")]), "id": Type.String({ maxLength: 128 }), "title": Type.String({ maxLength: 256 }), "content": Type.String({ maxLength: 65536 }), "scope": Type.Union([Type.Literal("local"), Type.Literal("global")]), "version": Type.Integer({ minimum: 1 }), "source": Type.String({ maxLength: 256 }), "reference": Type.Optional(Type.String({ maxLength: 1024 })), "arguments": Type.Optional(JsonValue) }, { additionalProperties: false }),
  "HarnessEntry": Type.Union([Type.Null(), Type.Object({ "kind": Type.Union([Type.Literal("prompt"), Type.Literal("memory"), Type.Literal("skill"), Type.Literal("subagent")]), "id": Type.String({ maxLength: 128 }), "tombstone": Type.Literal(true) }, { additionalProperties: false }), Type.Ref("HarnessEntryValue")]),
  "EffectIntent": Type.Intersect([Type.Object({ "effectId": Type.String({ maxLength: 128 }), "parentEffectId": Type.Optional(Type.String({ maxLength: 128 })), "kind": Type.Union([Type.Literal("inference"), Type.Literal("tool"), Type.Literal("compaction"), Type.Literal("job"), Type.Literal("approval-guardian"), Type.Literal("media")]), "tool": Type.Optional(Type.Object({ "toolUseId": Type.String({ maxLength: 128 }), "name": Type.String({ maxLength: 64 }) }, { additionalProperties: false })), "replay": Type.Union([Type.Literal("safe"), Type.Literal("never"), Type.Literal("idempotent")]), "argsSeq": Type.Optional(Type.Integer({ minimum: 1 })), "slot": Type.Optional(Type.String({ maxLength: 32 })), "idempotencyKey": Type.Optional(Type.String({ maxLength: 256 })) }, { additionalProperties: false }), Type.Not(Type.Object({ "kind": Type.Literal("media"), "replay": Type.Union([Type.Literal("safe"), Type.Literal("idempotent")]) }))]),
  "EffectSettled": Type.Object({ "effectId": Type.String({ maxLength: 128 }), "outcome": Type.Union([Type.Literal("ok"), Type.Literal("error"), Type.Literal("aborted"), Type.Literal("unknown")]), "code": Type.Optional(Type.String({ maxLength: 64 })), "durationMs": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false }),
  "VerifierSignal": Type.Object({ "scope": Type.Union([Type.Literal("tool"), Type.Literal("step"), Type.Literal("turn"), Type.Literal("task")]), "tier": Type.Union([Type.Literal(0), Type.Literal(1), Type.Literal(2)]), "verdict": Type.Union([Type.Literal("pass"), Type.Literal("fail"), Type.Literal("needs_revision")]), "reasons": Type.Array(Type.String({ maxLength: 1024 })), "toolUseId": Type.Optional(Type.String({ maxLength: 128 })), "credits": Type.Optional(Type.Number({ minimum: 0 })) }, { additionalProperties: false }),
  "RepairDecision": Type.Object({ "round": Type.Integer({ minimum: 1 }), "decision": Type.Union([Type.Literal("repair"), Type.Literal("park"), Type.Literal("escalate"), Type.Literal("complete")]), "reason": Type.Optional(Type.String({ maxLength: 1024 })), "verdictSeq": Type.Integer({ minimum: 1 }) }, { additionalProperties: false }),
  "FormatDeviation": Type.Object({ "rule": Type.String({ maxLength: 64 }), "model": Type.String({ maxLength: 256 }), "responseModel": Type.Optional(Type.String({ maxLength: 256 })), "parserVersion": Type.String({ maxLength: 32 }), "sampleHash": Type.String({ pattern: "^[0-9a-f]{64}$" }) }, { additionalProperties: false }),
  "Billing": Type.Object({ "usdMicros": Type.Integer({ minimum: 0 }), "source": Type.Union([Type.Literal("gateway"), Type.Literal("estimated")]), "subscription": Type.Boolean() }, { additionalProperties: false }),
  "ResponseMeta": Type.Object({ "status": Type.Optional(Type.Integer()), "id": Type.Optional(Type.String({ maxLength: 128 })), "model": Type.Optional(Type.String({ maxLength: 256 })), "headers": Type.Optional(Type.Record(Type.String({ pattern: "^[a-z0-9-]{1,64}$" }), Type.String({ maxLength: 256 }), { additionalProperties: false, maxProperties: 16 })), "headerNames": Type.Optional(Type.Array(Type.String({ maxLength: 128 }), { maxItems: 64 })) }, { additionalProperties: false }),
  "CostLedger": Type.Object({ "purpose": Type.Union([Type.Literal("inference"), Type.Literal("compaction"), Type.Literal("verifier"), Type.Literal("subagent"), Type.Literal("media"), Type.Literal("tool"), Type.Literal("title"), Type.Literal("approval-guardian")]), "sourceTurn": Type.Optional(Type.Integer({ minimum: 1 })), "credits": Type.Optional(Type.Number({ minimum: 0 })), "billing": Type.Optional(Type.Ref("Billing")), "response": Type.Optional(Type.Ref("ResponseMeta")), "creditSource": Type.Union([Type.Literal("gateway"), Type.Literal("estimated")]), "tokens": Type.Object({ "input": Type.Integer({ minimum: 0 }), "output": Type.Integer({ minimum: 0 }), "cacheRead": Type.Integer({ minimum: 0 }), "cacheWrite": Type.Integer({ minimum: 0 }), "reasoning": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false }), "model": Type.String({ maxLength: 256 }), "effectId": Type.String({ maxLength: 128 }), "timing": Type.Optional(Type.Object({ "ttftMs": Type.Optional(Type.Integer({ minimum: 0 })), "durationMs": Type.Optional(Type.Integer({ minimum: 0 })), "stepGapMs": Type.Optional(Type.Integer({ minimum: 0 })), "toolWallMs": Type.Optional(Type.Integer({ minimum: 0 })), "gapPhases": Type.Optional(Type.Record(Type.String(), Type.Integer())), "transport": Type.Optional(Type.String({ maxLength: 32 })) }, { additionalProperties: false })), "interrupted": Type.Optional(Type.Boolean()), "adjustment": Type.Optional(Type.Object({ "of": Type.Integer({ minimum: 1 }), "delta": Type.Number(), "usdMicrosDelta": Type.Optional(Type.Integer()), "reason": Type.String({ maxLength: 512 }) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "ApprovalAsked": Type.Object({ "requestId": Type.String({ maxLength: 128 }), "kind": Type.Union([Type.Literal("tool"), Type.Literal("budget"), Type.Literal("unknown-outcome"), Type.Literal("refine")]), "toolUseId": Type.Optional(Type.String({ maxLength: 128 })), "tool": Type.Optional(Type.String({ maxLength: 64 })), "argvHash": Type.Optional(Type.String({ pattern: "^[0-9a-f]{64}$" })), "risk": Type.Union([Type.Literal("destructive"), Type.Literal("always"), Type.Literal("budget"), Type.Literal("unknown")]), "summary": Type.String({ maxLength: 4096 }), "bindingHash": Type.String({ pattern: "^([0-9a-f]{64})?$" }), "deadline": Type.Optional(Type.String()), "requester": Type.Optional(Type.Ref("Actor")), "pending": Type.Optional(Type.Object({ "ticket": Type.String({ maxLength: 128 }), "expiresAt": Type.String() }, { additionalProperties: false })), "scope": Type.Optional(Type.String({ minLength: 1, maxLength: 256 })), "policyVersion": Type.Optional(Type.String({ minLength: 1, maxLength: 64 })), "profileHash": Type.Optional(Type.String({ pattern: "^sha256-[a-f0-9]{64}$" })), "options": Type.Optional(Type.Array(Type.Union([Type.Literal("allowed-once"), Type.Literal("allowed-session"), Type.Literal("allowed-permanent"), Type.Literal("rejected")]), { uniqueItems: true })) }, { additionalProperties: false }),
  "ApprovalDecided": Type.Object({ "requestId": Type.String({ maxLength: 128 }), "verdict": Type.Union([Type.Literal("allowed-once"), Type.Literal("allowed-session"), Type.Literal("allowed-permanent"), Type.Literal("rejected"), Type.Literal("cancelled"), Type.Literal("unavailable")]), "via": Type.Union([Type.Literal("sync"), Type.Literal("callback"), Type.Literal("timeout"), Type.Literal("guardian")]), "decidedBy": Type.Optional(Type.Ref("Actor")), "ticket": Type.Optional(Type.String({ maxLength: 128 })), "reason": Type.Optional(Type.String({ maxLength: 1024 })), "scope": Type.Optional(Type.String({ minLength: 1, maxLength: 256 })), "grantId": Type.Optional(Type.String({ minLength: 1, maxLength: 128 })) }, { additionalProperties: false }),
  "ApprovalGrant": Type.Object({ "grantId": Type.String({ minLength: 1, maxLength: 128 }), "profileHash": Type.String({ pattern: "^sha256-[a-f0-9]{64}$" }), "actorId": Type.String({ minLength: 1, maxLength: 256 }), "actorOrg": Type.String({ minLength: 1, maxLength: 256 }), "toolId": Type.String({ minLength: 1, maxLength: 128 }), "scope": Type.String({ minLength: 1, maxLength: 256 }), "policyVersion": Type.String({ minLength: 1, maxLength: 64 }), "createdAt": Type.String({ format: "date-time" }), "revokedAt": Type.Optional(Type.String({ format: "date-time" })) }, { additionalProperties: false }),
  "ApprovalGuardianDecision": Type.Object({ "requestId": Type.String({ minLength: 1, maxLength: 128 }), "effectId": Type.String({ minLength: 1, maxLength: 128 }), "toolUseId": Type.String({ minLength: 1, maxLength: 128 }), "scope": Type.String({ minLength: 1, maxLength: 256 }), "bindingHash": Type.String({ pattern: "^[a-f0-9]{64}$" }), "policyHash": Type.String({ pattern: "^[a-f0-9]{64}$" }), "decision": Type.Union([Type.Literal("allow-once"), Type.Literal("allow-session"), Type.Literal("escalate"), Type.Literal("reject")]), "ruleVersion": Type.String({ minLength: 1, maxLength: 64 }), "reasons": Type.Array(Type.String({ maxLength: 512 }), { maxItems: 32 }), "model": Type.Optional(Type.String({ maxLength: 128 })), "budget": Type.Object({ "tokensReserved": Type.Integer({ minimum: 0 }), "credits": Type.Number({ minimum: 0 }), "creditSource": Type.Union([Type.Literal("gateway"), Type.Literal("estimated")]), "cap": Type.Union([Type.Number({ minimum: 0 }), Type.Null()]), "approved": Type.Boolean() }, { additionalProperties: false }) }, { additionalProperties: false }),
  "FeedbackRating": Type.Object({ "targetSeq": Type.Integer({ minimum: 1 }), "rating": Type.Union([Type.Literal("up"), Type.Literal("down")]), "comment": Type.Optional(Type.String({ maxLength: 4096 })) }, { additionalProperties: false }),
  "FeedbackImplicit": Type.Object({ "targetSeq": Type.Integer({ minimum: 1 }), "kind": Type.Union([Type.Literal("regenerate"), Type.Literal("edit-resend"), Type.Literal("reaction"), Type.Literal("copy"), Type.Literal("abort")]), "value": Type.Optional(Type.String({ maxLength: 256 })) }, { additionalProperties: false }),
  "Participant": Type.Object({ "action": Type.Union([Type.Literal("join"), Type.Literal("leave")]), "participant": Type.Ref("Actor"), "surface": Type.String({ maxLength: 64 }), "credentialKind": Type.Optional(Type.String({ maxLength: 32 })) }, { additionalProperties: false }),
  "HarnessRefine": Type.Object({ "trigger": Type.Union([Type.Literal("auto"), Type.Literal("manual"), Type.Literal("compact"), Type.Literal("rollback")]), "proposalId": Type.String({ maxLength: 128 }), "rationale": Type.String({ maxLength: 4096 }), "edits": Type.Array(Type.Union([Type.Object({ "op": Type.Literal("upsert"), "entry": Type.Ref("HarnessEntryValue") }, { additionalProperties: false }), Type.Object({ "op": Type.Literal("delete"), "kind": Type.Union([Type.Literal("prompt"), Type.Literal("memory"), Type.Literal("skill"), Type.Literal("subagent")]), "id": Type.String({ maxLength: 128 }) }, { additionalProperties: false })])), "baseline": Type.Array(Type.Object({ "key": Type.String({ maxLength: 258 }), "version": Type.Integer({ minimum: 0 }) }, { additionalProperties: false })), "expectedOutcome": Type.Optional(Type.String({ maxLength: 2048 })), "outcome": Type.Union([Type.Literal("applied"), Type.Literal("rejected:conflict"), Type.Literal("rejected:limit"), Type.Literal("rejected:evidence"), Type.Literal("rejected:prefix")]), "rollbackOf": Type.Optional(Type.Integer({ minimum: 1 })), "evidenceSeqs": Type.Optional(Type.Array(Type.Integer({ minimum: 1 }))) }, { additionalProperties: false }),
  "ModelSettings": Type.Object({ "thinking": Type.Optional(Type.Ref("ThinkingLevel")), "contextWindow": Type.Optional(Type.Integer({ minimum: 1, maximum: 9007199254740991 })) }, { additionalProperties: false }),
  "ThinkingLevel": Type.Union([Type.Literal("off"), Type.Literal("minimal"), Type.Literal("low"), Type.Literal("medium"), Type.Literal("high"), Type.Literal("xhigh"), Type.Literal("max")])
});
var Actor = SessionV1.Import("Actor");
var ContentBlock = SessionV1.Import("ContentBlock");
var SurfaceOp = SessionV1.Import("SurfaceOp");
var EventEnvelope = SessionV1.Import("EventEnvelope");
var SessionModelSelection = SessionV1.Import("SessionModelSelection");
var SessionStart = SessionV1.Import("SessionStart");
var SubagentCost = SessionV1.Import("SubagentCost");
var TurnStart = SessionV1.Import("TurnStart");
var TurnEnd = SessionV1.Import("TurnEnd");
var StepStart = SessionV1.Import("StepStart");
var StepEnd = SessionV1.Import("StepEnd");
var UserMessage = SessionV1.Import("UserMessage");
var AssistantMessage = SessionV1.Import("AssistantMessage");
var ResolvedToolCallPolicy = SessionV1.Import("ResolvedToolCallPolicy");
var ExecutionDomain = SessionV1.Import("ExecutionDomain");
var DispatchPhase = SessionV1.Import("DispatchPhase");
var ToolCall = SessionV1.Import("ToolCall");
var ToolResult = SessionV1.Import("ToolResult");
var RequestMediaManifestEntry = SessionV1.Import("RequestMediaManifestEntry");
var RequestMediaManifest = SessionV1.Import("RequestMediaManifest");
var RequestMediaHeader = SessionV1.Import("RequestMediaHeader");
var RequestHeader = SessionV1.Import("RequestHeader");
var RequestSent = SessionV1.Import("RequestSent");
var OpState = SessionV1.Import("OpState");
var ToolCallState = SessionV1.Import("ToolCallState");
var ArtifactRef = SessionV1.Import("ArtifactRef");
var Verdict = SessionV1.Import("Verdict");
var AssistantOutput = SessionV1.Import("AssistantOutput");
var PlanItems = SessionV1.Import("PlanItems");
var BudgetState = SessionV1.Import("BudgetState");
var ArtifactJob = SessionV1.Import("ArtifactJob");
var InboxItem = SessionV1.Import("InboxItem");
var Inbox = SessionV1.Import("Inbox");
var HarnessEntryValue = SessionV1.Import("HarnessEntryValue");
var HarnessEntry = SessionV1.Import("HarnessEntry");
var EffectIntent = SessionV1.Import("EffectIntent");
var EffectSettled = SessionV1.Import("EffectSettled");
var VerifierSignal = SessionV1.Import("VerifierSignal");
var RepairDecision = SessionV1.Import("RepairDecision");
var FormatDeviation = SessionV1.Import("FormatDeviation");
var Billing = SessionV1.Import("Billing");
var ResponseMeta = SessionV1.Import("ResponseMeta");
var CostLedger = SessionV1.Import("CostLedger");
var ApprovalAsked = SessionV1.Import("ApprovalAsked");
var ApprovalDecided = SessionV1.Import("ApprovalDecided");
var ApprovalGrant = SessionV1.Import("ApprovalGrant");
var ApprovalGuardianDecision = SessionV1.Import("ApprovalGuardianDecision");
var FeedbackRating = SessionV1.Import("FeedbackRating");
var FeedbackImplicit = SessionV1.Import("FeedbackImplicit");
var Participant = SessionV1.Import("Participant");
var HarnessRefine = SessionV1.Import("HarnessRefine");
var ModelSettings = SessionV1.Import("ModelSettings");
var ThinkingLevel = SessionV1.Import("ThinkingLevel");
var Root = EventEnvelope;
var X_AGNES_DATA = {
  "session/start": "SessionStart",
  "turn/start": "TurnStart",
  "turn/end": "TurnEnd",
  "step/start": "StepStart",
  "step/end": "StepEnd",
  "user/message": "UserMessage",
  "assistant/message": "AssistantMessage",
  "tool/result": "ToolResult",
  "tool/call": "ToolCall",
  "request/header": "RequestHeader",
  "request/sent": "RequestSent",
  "assistant/output": "AssistantOutput",
  "plan.items": "PlanItems",
  "budget.state": "BudgetState",
  "artifact/job": "ArtifactJob",
  "inbox": "Inbox",
  "harness/entry": "HarnessEntry",
  "effect/intent": "EffectIntent",
  "effect/settled": "EffectSettled",
  "verifier/signal": "VerifierSignal",
  "repair/decision": "RepairDecision",
  "format/deviation": "FormatDeviation",
  "cost/ledger": "CostLedger",
  "approval/asked": "ApprovalAsked",
  "approval/decided": "ApprovalDecided",
  "approval/guardian-decided": "ApprovalGuardianDecision",
  "feedback/rating": "FeedbackRating",
  "feedback/implicit": "FeedbackImplicit",
  "participant": "Participant",
  "harness/refine": "HarnessRefine",
  "subagent/cost": "SubagentCost"
};

// ../protocol/gen/ts/tooldef.ts
var JsonValue2 = Type.Recursive((This) => Type.Union([Type.Null(), Type.Boolean(), Type.Number(), Type.String(), Type.Array(This), Type.Record(Type.String(), This)]));
var ToolDefSchema = Type.Module({
  "ToolMeta": Type.Object({ "isReadOnly": Type.Boolean(), "isDestructive": Type.Boolean(), "isConcurrencySafe": Type.Boolean(), "isOpenWorld": Type.Boolean(), "replay": Type.Union([Type.Literal("safe"), Type.Literal("never"), Type.Literal("idempotent")]), "costHint": Type.Union([Type.Null(), Type.Object({ "credits": Type.Optional(Type.Number({ minimum: 0 })), "wallMs": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false })]), "deferLoading": Type.Union([Type.Boolean(), Type.Null()]), "requiresApproval": Type.Union([Type.Union([Type.Literal("never"), Type.Literal("destructive"), Type.Literal("always")]), Type.Null()]), "returnsImages": Type.Optional(Type.Boolean()) }, { additionalProperties: false }),
  "ParametersSchema": Type.Object({ "type": Type.Literal("object"), "properties": Type.Record(Type.String(), JsonValue2), "required": Type.Optional(Type.Array(Type.String())), "additionalProperties": Type.Literal(false), "description": Type.Optional(Type.String({ maxLength: 2048 })) }, { additionalProperties: false }),
  "ToolDef": Type.Object({ "name": Type.String({ pattern: "^[A-Za-z_][A-Za-z0-9_]{0,63}$" }), "description": Type.String({ minLength: 1, maxLength: 4096 }), "parameters": Type.Ref("ParametersSchema"), "meta": Type.Ref("ToolMeta") }, { additionalProperties: false })
});
var ToolMeta = ToolDefSchema.Import("ToolMeta");
var ParametersSchema = ToolDefSchema.Import("ParametersSchema");
var ToolDef = ToolDefSchema.Import("ToolDef");

// ../protocol/src/errors.ts
var AGNES_ERRORS = {
  OVERLOADED: -32001,
  SESSION_BUSY: -32002,
  SESSION_NOT_FOUND: -32003,
  GENERATION_STALE: -32004,
  CURSOR_OUT_OF_RANGE: -32005,
  CAPABILITY_DENIED: -32006,
  AUTH_INVALID: -32007,
  PRESET_SWITCH_REJECTED: -32008,
  APPROVAL_REJECTED: -32009,
  CLAIM_DENIED: -32010,
  SEMANTIC_REJECTED: -32011,
  REQUEST_TIMEOUT: -32012,
  OUTCOME_UNKNOWN: -32013
};
var JSONRPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603
};
function rpcError(name, data = {}) {
  const code = name in AGNES_ERRORS ? AGNES_ERRORS[name] : JSONRPC_ERRORS[name];
  const dataCode = typeof data.code === "string" ? data.code : name;
  return { code, message: name, data: { ...data, code: dataCode } };
}

// ../protocol/src/request-media.ts
var invalid = (path, message, code = "OTHER") => ({ ok: false, errors: [{ path, message, code }] });
function validateRequestMedia(value) {
  const checked = validateAgainst(RequestMediaHeader, value);
  if (!checked.ok) return checked;
  const media = checked.value;
  for (const [index, entry] of media.manifest.entries()) {
    if (entry.artifactUri.slice("artifact://".length) !== entry.sha256)
      return invalid(`/manifest/${index}/artifactUri`, "artifact URI digest does not match sha256");
    if (entry.selected && entry.reason !== void 0)
      return invalid(`/manifest/${index}/reason`, "selected media cannot carry an omission reason");
    if (!entry.selected && entry.reason === void 0)
      return invalid(`/manifest/${index}/reason`, "omitted media must carry an omission reason");
  }
  for (const [position, index] of media.selectionOrder.entries())
    if (index >= media.manifest.length)
      return invalid(`/selectionOrder/${position}`, "selection index is outside the manifest", "RANGE");
  const marked = media.manifest.flatMap((entry, index) => entry.selected ? [index] : []);
  const ordered = new Set(media.selectionOrder);
  if (marked.length !== media.selectionOrder.length || marked.some((index) => !ordered.has(index)))
    return invalid("/selectionOrder", "selection order must contain exactly the selected manifest indexes");
  if (media.route === "text-only" && media.selectionOrder.length !== 0)
    return invalid("/route", "text-only media route cannot select image bytes");
  return {
    ok: true,
    value: Object.freeze({
      media,
      selected: Object.freeze(
        media.selectionOrder.map((index) => media.manifest[index])
      )
    })
  };
}

// ../protocol/src/validate.ts
var DATA_DEFS = Object.fromEntries(
  Object.entries(X_AGNES_DATA).map(([type, def]) => [
    type,
    session_v1_exports[def]
  ])
);
function validateEvent(x) {
  const env = validateAgainst(EventEnvelope, x);
  if (!env.ok) return env;
  const def = DATA_DEFS[env.value.type];
  if (!def) {
    if (EXT_EVENT_PATTERN.test(env.value.type)) return env;
    return { ok: false, errors: [{ path: "/type", message: "no data schema", code: "OTHER" }] };
  }
  const data = validateAgainst(def, env.value.data, "/data");
  if (!data.ok) return { ok: false, errors: data.errors };
  if (env.value.type === "request/header") {
    const media = data.value.media;
    if (media !== void 0) {
      const checked = validateRequestMedia(media);
      if (!checked.ok)
        return {
          ok: false,
          errors: checked.errors.map((error) => ({
            ...error,
            path: `/data/media${error.path}`
          }))
        };
    }
  }
  return env;
}

// ../protocol/src/session-title.ts
var SESSION_TITLE_EVENT = "x/host/session-title";
var identity = {
  turn: Type.Integer({ minimum: 1 }),
  startSeq: Type.Integer({ minimum: 1 }),
  route: Type.String({ minLength: 1, maxLength: 128 }),
  model: Type.String({ minLength: 1, maxLength: 256 }),
  prompt: Type.String({ maxLength: 6e3 }),
  titleLocale: Type.Optional(Type.Union([Type.Literal("en"), Type.Literal("zh-CN")])),
  budgetCap: Type.Union([Type.Null(), Type.Number({ minimum: 0 })]),
  treeBudgetCap: Type.Union([Type.Null(), Type.Number({ exclusiveMinimum: 0 })])
};
var SessionTitleRecord = Type.Union([
  Type.Object({ ...identity, status: Type.Literal("pending") }, { additionalProperties: false }),
  Type.Object({ ...identity, status: Type.Literal("requested") }, { additionalProperties: false }),
  Type.Object(
    { ...identity, status: Type.Literal("generated"), title: Type.String({ minLength: 1, maxLength: 256 }) },
    { additionalProperties: false }
  ),
  Type.Object(
    { ...identity, status: Type.Literal("failed"), reason: Type.String({ maxLength: 128 }) },
    { additionalProperties: false }
  )
]);
function readSessionTitle(event) {
  if (event.type !== SESSION_TITLE_EVENT || event.origin !== "system" || event.trust !== "trusted" || event.ignorable !== true || (event.lane ?? "main") !== "main" || !validateAgainst(SessionTitleRecord, event.data).ok)
    return void 0;
  return event.data;
}

// ../protocol/src/attachments.ts
var PREFIX = "agnes-attachment:";
function toAcpPrompt(content) {
  return content.map(
    (block) => block.type === "file" ? {
      type: "resource",
      resource: {
        uri: `${PREFIX}${encodeURIComponent(block.name)}`,
        mimeType: block.mimeType,
        blob: block.data
      }
    } : block
  );
}

// ../protocol/src/codec/permission.ts
function toAcpOptionKind(v) {
  return v === "allowed-once" ? "allow_once" : v === "allowed-session" ? "allow_always" : "reject_once";
}

// ../protocol/src/codec/stop-reason.ts
var STOP_REASON_TABLE = {
  completed: "end_turn",
  max_steps: "max_turn_requests",
  aborted: "cancelled",
  interrupted: "cancelled",
  budget: "refusal",
  blocked: "end_turn",
  parked: "end_turn"
};
function toAcpStopReason(reason) {
  const v = STOP_REASON_TABLE[reason];
  if (!v) throw new Error(`turn/end.reason ${String(reason)} has no ACP stopReason (error → JSON-RPC error)`);
  return v;
}

// ../protocol/gen/ts/authz.ts
if (!format_exports.Has("date-time")) format_exports.Set("date-time", (value) => {
  const parts = value.split(/t/i);
  if (parts.length !== 2) return false;
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(parts[0] ?? "");
  const time = /^(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)(z|([+-])(\d{2}):(\d{2}))$/i.exec(parts[1] ?? "");
  if (!date || !time) return false;
  const year = Number(date[1]), month = Number(date[2]), day = Number(date[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > (days[month] ?? 0)) return false;
  const hour = Number(time[1]), minute = Number(time[2]), second = Number(time[3]);
  const offsetHour = Number(time[6] || 0), offsetMinute = Number(time[7] || 0);
  if (hour > 23 || minute > 59 || offsetHour > 23 || offsetMinute > 59) return false;
  if (second < 60) return true;
  const sign = time[5] === "-" ? -1 : 1;
  const utcMinute = minute - offsetMinute * sign;
  const utcHour = hour - offsetHour * sign - (utcMinute < 0 ? 1 : 0);
  return (utcHour === 23 || utcHour === -1) && (utcMinute === 59 || utcMinute === -1) && second < 61;
});
var AuthzSchema = Type.Module({
  "Actor": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 256 }), "org": Type.String({ maxLength: 256 }), "role": Type.String({ maxLength: 64 }), "deptPath": Type.Array(Type.String({ maxLength: 256 })), "attrs": Type.Record(Type.String(), Type.String({ maxLength: 1024 })) }, { additionalProperties: false }),
  "Target": Type.Object({ "kind": Type.Union([Type.Literal("datasource"), Type.Literal("db"), Type.Literal("table"), Type.Literal("field"), Type.Literal("model"), Type.Literal("skill"), Type.Literal("mcp"), Type.Literal("kb"), Type.Literal("menu"), Type.Literal("button")]), "id": Type.String({ maxLength: 256 }), "parent": Type.Optional(Type.String({ maxLength: 256 })) }, { additionalProperties: false }),
  "Action": Type.String({ pattern: "^(select|export|execute|discover|admin\\.[a-z_]{1,32})$" }),
  "RowScope": Type.Union([Type.Union([Type.Literal("all_org"), Type.Literal("self"), Type.Literal("own_dept"), Type.Literal("dept_subtree")]), Type.String({ maxLength: 271, pattern: "^named_regions\\[[a-z0-9_-]+(?:,[a-z0-9_-]+)*\\]$" }), Type.String({ pattern: "^ref\\([a-z0-9_-]{1,64}\\)$" })]),
  "Decision": Type.Object({ "decisionId": Type.String({ maxLength: 128 }), "effect": Type.Union([Type.Literal("allow"), Type.Literal("deny"), Type.Literal("require_approval")]), "rowFilter": Type.Optional(Type.Ref("RowScope")), "fieldMask": Type.Optional(Type.Object({ "visible": Type.Array(Type.String()), "masked": Type.Array(Type.String()) }, { additionalProperties: false })), "limits": Type.Optional(Type.Object({ "maxRows": Type.Optional(Type.Integer({ minimum: 0 })), "exportRequiresGrant": Type.Optional(Type.Boolean()) }, { additionalProperties: false })), "reason": Type.String({ maxLength: 1024 }), "expiresAt": Type.Optional(Type.String({ format: "date-time" })) }, { additionalProperties: false })
});
var Actor2 = AuthzSchema.Import("Actor");
var Target = AuthzSchema.Import("Target");
var Action = AuthzSchema.Import("Action");
var RowScope = AuthzSchema.Import("RowScope");
var Decision = AuthzSchema.Import("Decision");

// ../protocol/gen/ts/bridge.ts
var JsonValue3 = Type.Recursive((This) => Type.Union([Type.Null(), Type.Boolean(), Type.Number(), Type.String(), Type.Array(This), Type.Record(Type.String(), This)]));
var BridgeSchema = Type.Module({
  "BridgeMethod": Type.Union([Type.Literal("bridge.tools.invoke"), Type.Literal("bridge.subagent.spawn"), Type.Literal("bridge.subagent.fork"), Type.Literal("bridge.subagent.collect"), Type.Literal("bridge.artifacts.put"), Type.Literal("bridge.artifacts.get"), Type.Literal("bridge.plan.set"), Type.Literal("bridge.log")]),
  "BridgeRequest": Type.Union([Type.Object({ "jsonrpc": Type.Literal("2.0"), "id": Type.Union([Type.Integer(), Type.String()]), "method": Type.Literal("bridge.tools.invoke"), "params": Type.Ref("ToolsInvokeParams") }, { additionalProperties: false }), Type.Object({ "jsonrpc": Type.Literal("2.0"), "id": Type.Union([Type.Integer(), Type.String()]), "method": Type.Union([Type.Literal("bridge.subagent.spawn"), Type.Literal("bridge.subagent.fork"), Type.Literal("bridge.subagent.collect"), Type.Literal("bridge.artifacts.put"), Type.Literal("bridge.artifacts.get"), Type.Literal("bridge.plan.set"), Type.Literal("bridge.log")]), "params": JsonValue3 }, { additionalProperties: false })]),
  "BridgeResponse": Type.Union([Type.Object({ "jsonrpc": Type.Literal("2.0"), "id": Type.Union([Type.Integer(), Type.String()]), "result": JsonValue3 }, { additionalProperties: false }), Type.Object({ "jsonrpc": Type.Literal("2.0"), "id": Type.Union([Type.Integer(), Type.String(), Type.Null()]), "error": Type.Object({ "code": Type.Union([Type.Literal(1001), Type.Literal(1002), Type.Literal(1003), Type.Literal(1004), Type.Literal(1005), Type.Literal(-32600), Type.Literal(-32601), Type.Literal(-32602), Type.Literal(-32603), Type.Literal(-32700), Type.Literal(-32800)]), "message": Type.String({ maxLength: 4096 }), "data": Type.Optional(JsonValue3) }, { additionalProperties: false }) }, { additionalProperties: false })]),
  "ToolsInvokeParams": Type.Object({ "name": Type.String({ pattern: "^[A-Za-z_][A-Za-z0-9_]{0,63}$" }), "args": JsonValue3 }, { additionalProperties: false })
});
var BridgeMethod = BridgeSchema.Import("BridgeMethod");
var BridgeRequest = BridgeSchema.Import("BridgeRequest");
var BridgeResponse = BridgeSchema.Import("BridgeResponse");
var ToolsInvokeParams = BridgeSchema.Import("ToolsInvokeParams");
var X_AGNES_BRIDGE_ERRORS = {
  "1001": "BUDGET_EXCEEDED",
  "1002": "APPROVAL_REJECTED",
  "1003": "DEPTH_EXCEEDED",
  "1004": "TOOL_NOT_FOUND",
  "1005": "SCHEMA_INVALID"
};

// ../protocol/gen/ts/channel.ts
if (!format_exports.Has("date-time")) format_exports.Set("date-time", (value) => {
  const parts = value.split(/t/i);
  if (parts.length !== 2) return false;
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(parts[0] ?? "");
  const time = /^(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)(z|([+-])(\d{2}):(\d{2}))$/i.exec(parts[1] ?? "");
  if (!date || !time) return false;
  const year = Number(date[1]), month = Number(date[2]), day = Number(date[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > (days[month] ?? 0)) return false;
  const hour = Number(time[1]), minute = Number(time[2]), second = Number(time[3]);
  const offsetHour = Number(time[6] || 0), offsetMinute = Number(time[7] || 0);
  if (hour > 23 || minute > 59 || offsetHour > 23 || offsetMinute > 59) return false;
  if (second < 60) return true;
  const sign = time[5] === "-" ? -1 : 1;
  const utcMinute = minute - offsetMinute * sign;
  const utcHour = hour - offsetHour * sign - (utcMinute < 0 ? 1 : 0);
  return (utcHour === 23 || utcHour === -1) && (utcMinute === 59 || utcMinute === -1) && second < 61;
});
var ChannelSchema = Type.Module({
  "Credential": Type.Union([Type.Ref("JwtCredential"), Type.Ref("SourceAuthCredential"), Type.Ref("PortalIdentityCredential"), Type.Ref("LocalCredential"), Type.Ref("ChannelCredential")]),
  "ApprovalAction": Type.Union([Type.Object({ "ticket": Type.String({ maxLength: 128 }), "verdict": Type.Union([Type.Literal("allowed-once"), Type.Literal("allowed-session"), Type.Literal("allowed-permanent"), Type.Literal("rejected")]), "approverCredential": Type.Ref("Credential") }, { additionalProperties: false }), Type.Object({ "requestSeq": Type.Integer({ minimum: 1 }), "verdict": Type.Union([Type.Literal("allowed-once"), Type.Literal("allowed-session"), Type.Literal("allowed-permanent"), Type.Literal("rejected")]), "approverCredential": Type.Ref("Credential") }, { additionalProperties: false }), Type.Object({ "ticket": Type.String({ maxLength: 128 }), "requestSeq": Type.Integer({ minimum: 1 }), "verdict": Type.Union([Type.Literal("allowed-once"), Type.Literal("allowed-session"), Type.Literal("allowed-permanent"), Type.Literal("rejected")]), "approverCredential": Type.Ref("Credential") }, { additionalProperties: false })]),
  "DirectoryEntry": Type.Object({ "kind": Type.Union([Type.Literal("user"), Type.Literal("dept")]), "id": Type.String({ maxLength: 256 }), "name": Type.String({ maxLength: 256 }), "parentId": Type.Optional(Type.String({ maxLength: 256 })), "userIds": Type.Optional(Type.Array(Type.String({ maxLength: 256 }))), "attrs": Type.Optional(Type.Record(Type.String(), Type.String({ maxLength: 1024 }))), "deletedAt": Type.Optional(Type.String({ format: "date-time" })), "syncedAt": Type.String({ format: "date-time" }) }, { additionalProperties: false }),
  "ChannelCapabilities": Type.Object({ "edit": Type.Boolean(), "card": Type.Boolean(), "thread": Type.Boolean(), "attachment": Type.Boolean(), "reactions": Type.Optional(Type.Boolean()), "typing": Type.Optional(Type.Boolean()), "voice": Type.Optional(Type.Boolean()) }, { additionalProperties: false }),
  "ChannelManifest": Type.Object({ "id": Type.String({ pattern: "^[a-z][a-z0-9-]{0,31}$" }), "displayName": Type.String({ maxLength: 64 }), "version": Type.String({ maxLength: 32 }), "connection": Type.Object({ "modes": Type.Array(Type.Union([Type.Literal("stream"), Type.Literal("websocket"), Type.Literal("longpoll"), Type.Literal("webhook")]), { minItems: 1 }), "default": Type.Union([Type.Literal("stream"), Type.Literal("websocket"), Type.Literal("longpoll"), Type.Literal("webhook")]) }, { additionalProperties: false }), "capabilities": Type.Ref("ChannelCapabilities"), "credentials": Type.Object({ "required": Type.Array(Type.String()), "optional": Type.Array(Type.String()), "exposes": Type.Array(Type.String({ pattern: "^[A-Za-z][A-Za-z0-9_]{0,63}$" })) }, { additionalProperties: false }), "limits": Type.Object({ "textChars": Type.Integer({ minimum: 1 }), "cardBytes": Type.Integer({ minimum: 1 }), "editWindowMs": Type.Integer({ minimum: 0 }), "rate": Type.Optional(Type.Object({ "perChatPerMin": Type.Optional(Type.Integer({ minimum: 1 })), "perAccountPerSec": Type.Optional(Type.Integer({ minimum: 1 })) }, { additionalProperties: false })) }, { additionalProperties: false }), "events": Type.Object({ "supported": Type.Array(Type.Union([Type.Literal("message"), Type.Literal("cardAction"), Type.Literal("groupJoin"), Type.Literal("reaction")])) }, { additionalProperties: false }), "directory": Type.Optional(Type.Object({ "supported": Type.Boolean(), "unit": Type.Optional(Type.Union([Type.Literal("dept"), Type.Literal("group")])) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "JwtCredential": Type.Object({ "kind": Type.Literal("jwt"), "token": Type.String({ maxLength: 8192 }) }, { additionalProperties: false }),
  "SourceAuthCredential": Type.Object({ "kind": Type.Literal("source-auth"), "timestamp": Type.Integer(), "signature": Type.String({ pattern: "^v0=[0-9a-f]{64}$" }), "nonce": Type.String({ pattern: "^[0-9a-f]{32}$" }) }, { additionalProperties: false }),
  "PortalIdentityCredential": Type.Object({ "kind": Type.Literal("portal-identity"), "token": Type.String({ maxLength: 8192 }) }, { additionalProperties: false }),
  "LocalCredential": Type.Object({ "kind": Type.Literal("local") }, { additionalProperties: false }),
  "SurfaceAuthCredential": Type.Object({ "kind": Type.Literal("surface"), "sourceId": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9-]{0,63}$" }), "source": Type.Ref("SourceAuthCredential"), "subject": Type.Union([Type.Ref("JwtCredential"), Type.Ref("PortalIdentityCredential")]) }, { additionalProperties: false }),
  "Auth": Type.Union([Type.Ref("JwtCredential"), Type.Ref("SourceAuthCredential"), Type.Ref("PortalIdentityCredential"), Type.Ref("LocalCredential"), Type.Ref("SurfaceAuthCredential")]),
  "ChannelCredential": Type.Object({ "kind": Type.Literal("channel"), "channel": Type.String({ maxLength: 32 }), "accountId": Type.String({ maxLength: 128 }), "userId": Type.String({ maxLength: 256 }), "unionId": Type.Optional(Type.String({ maxLength: 256 })), "chatId": Type.String({ maxLength: 256 }), "chatType": Type.Union([Type.Literal("dm"), Type.Literal("group"), Type.Literal("thread")]), "displayName": Type.Optional(Type.String({ maxLength: 256 })), "raw": Type.Optional(Type.Record(Type.String(), Type.String({ maxLength: 1024 }))) }, { additionalProperties: false })
});
var Credential = ChannelSchema.Import("Credential");
var ApprovalAction = ChannelSchema.Import("ApprovalAction");
var DirectoryEntry = ChannelSchema.Import("DirectoryEntry");
var ChannelCapabilities = ChannelSchema.Import("ChannelCapabilities");
var ChannelManifest = ChannelSchema.Import("ChannelManifest");
var JwtCredential = ChannelSchema.Import("JwtCredential");
var SourceAuthCredential = ChannelSchema.Import("SourceAuthCredential");
var PortalIdentityCredential = ChannelSchema.Import("PortalIdentityCredential");
var LocalCredential = ChannelSchema.Import("LocalCredential");
var SurfaceAuthCredential = ChannelSchema.Import("SurfaceAuthCredential");
var Auth = ChannelSchema.Import("Auth");
var ChannelCredential = ChannelSchema.Import("ChannelCredential");

// ../protocol/gen/ts/deploy-manifest.ts
var DeployManifestSchema = Type.Module({
  "DeployManifest": Type.Object({ "id": Type.String({ pattern: "^[a-z0-9-]{1,64}$" }), "version": Type.String({ maxLength: 64 }), "harnessRange": Type.String({ maxLength: 64 }), "extensions": Type.Array(Type.Object({ "path": Type.String({ pattern: "^extensions/" }), "id": Type.String({ pattern: "^[a-z0-9-]+/[a-z0-9-]+$" }) }, { additionalProperties: false })), "profileFragment": Type.String({ pattern: "^profile/" }), "presets": Type.Array(Type.String({ pattern: "^preset/" })), "fixtures": Type.String({ pattern: "^fixtures/" }), "surfaces": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 80, pattern: "^surfaces/[a-z][a-z0-9-]{0,63}\\.json$" }), { maxItems: 64, uniqueItems: true })) }, { additionalProperties: false })
});
var DeployManifest = DeployManifestSchema.Import("DeployManifest");

// ../protocol/gen/ts/extension-manifest.ts
var JsonValue4 = Type.Recursive((This) => Type.Union([Type.Null(), Type.Boolean(), Type.Number(), Type.String(), Type.Array(This), Type.Record(Type.String(), This)]));
var ExtensionManifestSchema = Type.Module({
  "Capabilities": Type.Object({ "tools": Type.Optional(Type.Object({ "prefix": Type.String({ pattern: "^(?:[a-z][a-z0-9_]{0,31}_)?$" }), "names": Type.Optional(Type.Array(Type.String({ pattern: "^[A-Za-z_][A-Za-z0-9_]{0,63}$" }))) }, { additionalProperties: false })), "tools.invoke": Type.Optional(Type.Boolean()), "hooks": Type.Optional(Type.Array(Type.Ref("HookEvent"))), "slots": Type.Optional(Type.Array(Type.Ref("UiSlotName"))), "events": Type.Optional(Type.Boolean()), "ui": Type.Optional(Type.Array(Type.Union([Type.Literal("skin"), Type.Literal("client")]), { maxItems: 8, uniqueItems: true })), "resources": Type.Optional(Type.Array(Type.Union([Type.Literal("skill"), Type.Literal("mcp"), Type.Literal("kb"), Type.Literal("datasource"), Type.Literal("model")]))), "network.publicRead": Type.Optional(Type.Boolean()), "network": Type.Optional(Type.Union([Type.Array(Type.String(), { maxItems: 0 }), Type.Object({ "hosts": Type.Array(Type.String({ pattern: "^[a-z0-9.-]+(:[0-9]{1,5})?$" })) }, { additionalProperties: false })])), "artifacts": Type.Optional(Type.Boolean()), "subagent": Type.Optional(Type.Boolean()), "services": Type.Optional(Type.Array(Type.Ref("ServiceCapability"), { uniqueItems: true })), "projections": Type.Optional(Type.Array(Type.Ref("ProjectionCapability"), { uniqueItems: true })) }, { additionalProperties: false }),
  "SkinContribution": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?!(?:light|dark|system|none)$)[a-z0-9]+(?:-[a-z0-9]+)*$" }), "name": Type.String({ minLength: 1, maxLength: 64 }), "css": Type.String({ minLength: 3, maxLength: 256, pattern: "^\\./" }), "tokens": Type.Optional(Type.Record(Type.String(), Type.Object({ "light": Type.Ref("SkinTokenValue"), "dark": Type.Ref("SkinTokenValue") }, { additionalProperties: false }))) }, { additionalProperties: false }),
  "SkinTokenValue": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?!.*url\\()[^;{}@]*$" }),
  "ClientContribution": Type.Object({ "id": Type.Optional(Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$" })), "entry": Type.String({ minLength: 1, maxLength: 512 }), "styles": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 512 }), { maxItems: 32 })), "slots": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 128 }), { maxItems: 32 })), "slotCatalogVersion": Type.Optional(Type.String({ pattern: "^dsh-client-slots/v[0-9]+$" })), "services": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 128 }), { maxItems: 32 })), "projections": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 128 }), { maxItems: 32 })), "legacyRowIds": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 256, pattern: "^web:[^\\x00]{1,251}$" }), { maxItems: 16, uniqueItems: true })), "publicConfig": Type.Optional(Type.Record(Type.String(), JsonValue4)) }, { additionalProperties: false }),
  "ExtensionManifest": Type.Object({ "id": Type.String({ pattern: "^[a-z0-9-]+/[a-z0-9-]+$" }), "version": Type.String({ maxLength: 64 }), "apiRange": Type.String({ maxLength: 64 }), "entry": Type.String({ pattern: "^\\./" }), "capabilities": Type.Ref("Capabilities"), "contributes": Type.Optional(Type.Object({ "skins": Type.Optional(Type.Array(Type.Ref("SkinContribution"), { maxItems: 8 })), "client": Type.Optional(Type.Ref("ClientContribution")) }, { additionalProperties: false })), "provides": Type.Optional(Type.Array(Type.Ref("SeamName"))), "lease": Type.Optional(Type.Object({ "budget": Type.Optional(Type.Integer({ minimum: 1 })) }, { additionalProperties: false })), "runtime": Type.Optional(Type.Object({ "supports": Type.Array(Type.Union([Type.Literal("in-process"), Type.Literal("isolated")]), { minItems: 1, maxItems: 2, uniqueItems: true }) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "HookEvent": Type.Union([Type.Literal("session_start"), Type.Literal("resources_discover"), Type.Literal("before_step"), Type.Literal("context"), Type.Literal("before_request"), Type.Literal("request_error"), Type.Literal("tool_call"), Type.Literal("tool_result"), Type.Literal("turn_stopping"), Type.Literal("approval_request"), Type.Literal("before_compact"), Type.Literal("compact"), Type.Literal("subagent_start"), Type.Literal("subagent_end"), Type.Literal("format_deviation"), Type.Literal("shutdown")]),
  "UiSlotName": Type.Union([Type.Literal("tool.card.inline"), Type.Literal("sidebar.action"), Type.Literal("status.line"), Type.Literal("notification")]),
  "SeamName": Type.Union([Type.Literal("approval"), Type.Literal("checkpoint"), Type.Literal("ledger"), Type.Literal("sandbox"), Type.Literal("verifier"), Type.Literal("repair"), Type.Literal("artifacts"), Type.Literal("principals"), Type.Literal("platform"), Type.Literal("harness")]),
  "ProjectionCapability": Type.Object({ "name": Type.String({ maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "inputEventTypes": Type.Array(Type.String({ minLength: 1, maxLength: 128, pattern: "^[a-z][a-z0-9]*(?:[./-][a-z0-9]+)*$" }), { minItems: 1, uniqueItems: true }), "maxStateBytes": Type.Integer({ minimum: 1, maximum: 262144 }) }, { additionalProperties: false }),
  "ServiceCapability": Type.Object({ "name": Type.String({ maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "kind": Type.Union([Type.Literal("query"), Type.Literal("effect")]), "inputSchema": Type.Ref("ParametersSchema"), "outputSchema": Type.Record(Type.String(), JsonValue4), "timeoutMs": Type.Integer({ minimum: 1, maximum: 3e4 }), "maxResultBytes": Type.Integer({ minimum: 1, maximum: 1048576 }) }, { additionalProperties: false }),
  "ParametersSchema": Type.Object({ "type": Type.Literal("object"), "properties": Type.Record(Type.String(), JsonValue4), "required": Type.Optional(Type.Array(Type.String())), "additionalProperties": Type.Literal(false), "description": Type.Optional(Type.String({ maxLength: 2048 })) }, { additionalProperties: false })
});
var Capabilities = ExtensionManifestSchema.Import("Capabilities");
var SkinContribution = ExtensionManifestSchema.Import("SkinContribution");
var SkinTokenValue = ExtensionManifestSchema.Import("SkinTokenValue");
var ClientContribution = ExtensionManifestSchema.Import("ClientContribution");
var ExtensionManifest = ExtensionManifestSchema.Import("ExtensionManifest");
var HookEvent = ExtensionManifestSchema.Import("HookEvent");
var UiSlotName = ExtensionManifestSchema.Import("UiSlotName");
var SeamName = ExtensionManifestSchema.Import("SeamName");
var ProjectionCapability = ExtensionManifestSchema.Import("ProjectionCapability");
var ServiceCapability = ExtensionManifestSchema.Import("ServiceCapability");
var ParametersSchema2 = ExtensionManifestSchema.Import("ParametersSchema");

// ../protocol/gen/ts/jobs.ts
if (!format_exports.Has("date-time")) format_exports.Set("date-time", (value) => {
  const parts = value.split(/t/i);
  if (parts.length !== 2) return false;
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(parts[0] ?? "");
  const time = /^(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)(z|([+-])(\d{2}):(\d{2}))$/i.exec(parts[1] ?? "");
  if (!date || !time) return false;
  const year = Number(date[1]), month = Number(date[2]), day = Number(date[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > (days[month] ?? 0)) return false;
  const hour = Number(time[1]), minute = Number(time[2]), second = Number(time[3]);
  const offsetHour = Number(time[6] || 0), offsetMinute = Number(time[7] || 0);
  if (hour > 23 || minute > 59 || offsetHour > 23 || offsetMinute > 59) return false;
  if (second < 60) return true;
  const sign = time[5] === "-" ? -1 : 1;
  const utcMinute = minute - offsetMinute * sign;
  const utcHour = hour - offsetHour * sign - (utcMinute < 0 ? 1 : 0);
  return (utcHour === 23 || utcHour === -1) && (utcMinute === 59 || utcMinute === -1) && second < 61;
});
var JsonValue5 = Type.Recursive((This) => Type.Union([Type.Null(), Type.Boolean(), Type.Number(), Type.String(), Type.Array(This), Type.Record(Type.String(), This)]));
var JobsSchema = Type.Module({
  "Schedule": Type.Union([Type.Object({ "kind": Type.Literal("once") }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("at"), "at": Type.Integer({ minimum: 0 }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("every"), "everyMs": Type.Integer({ minimum: 1e3 }), "anchorMs": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("cron"), "expr": Type.String({ maxLength: 128 }), "tz": Type.Optional(Type.String({ maxLength: 64 })), "staggerMs": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false })]),
  "JobSpec": Type.Object({ "idempotencyKey": Type.String({ maxLength: 256 }), "sessionKey": Type.String({ maxLength: 512 }), "payload": Type.Union([Type.Object({ "prompt": Type.Union([Type.String({ maxLength: 65536 }), Type.Array(Type.Ref("ContentBlock"))]), "delivery": Type.Optional(Type.Union([Type.Literal("steer"), Type.Literal("follow_up")])) }, { additionalProperties: false }), Type.Object({ "command": Type.Object({ "method": Type.String({ pattern: "^(?:resume|_agnes/v1/[A-Za-z][A-Za-z0-9./_-]*)$" }), "params": JsonValue5 }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("directory.sync"), "channel": Type.String({ minLength: 1, maxLength: 64 }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("shell"), "command": Type.String({ maxLength: 65536 }), "cwd": Type.String({ maxLength: 4096 }) }, { additionalProperties: false })]), "schedule": Type.Ref("Schedule"), "budget": Type.Optional(Type.Number({ minimum: 0 })), "protected": Type.Optional(Type.Boolean()), "maxAttempts": Type.Optional(Type.Integer({ minimum: 1, maximum: 10 })) }, { additionalProperties: false }),
  "JobStatus": Type.Object({ "jobId": Type.String(), "status": Type.Union([Type.Literal("waiting"), Type.Literal("delayed"), Type.Literal("active"), Type.Literal("completed"), Type.Literal("failed"), Type.Literal("dead"), Type.Literal("cancelled")]), "attempts": Type.Integer({ minimum: 0 }), "delayUntil": Type.Optional(Type.Integer({ minimum: 0 })), "leaseUntil": Type.Optional(Type.Integer({ minimum: 0 })), "stalledCounter": Type.Optional(Type.Integer({ minimum: 0 })), "result": Type.Optional(JsonValue5), "error": Type.Optional(Type.Object({ "code": Type.String(), "message": Type.String() }, { additionalProperties: false })), "createdAt": Type.String({ format: "date-time" }), "updatedAt": Type.String({ format: "date-time" }) }, { additionalProperties: false }),
  "ContentBlock": Type.Union([Type.Object({ "type": Type.Literal("text"), "text": Type.String({ maxLength: 1048576 }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("image"), "data": Type.String(), "mimeType": Type.String({ maxLength: 128 }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("file"), "data": Type.String(), "mimeType": Type.String({ minLength: 1, maxLength: 128 }), "name": Type.String({ minLength: 1, maxLength: 256 }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("resource_link"), "uri": Type.String({ maxLength: 4096 }), "name": Type.Optional(Type.String({ maxLength: 256 })), "mimeType": Type.Optional(Type.String({ maxLength: 128 })) }, { additionalProperties: false })])
});
var Schedule = JobsSchema.Import("Schedule");
var JobSpec = JobsSchema.Import("JobSpec");
var JobStatus = JobsSchema.Import("JobStatus");
var ContentBlock2 = JobsSchema.Import("ContentBlock");

// ../protocol/gen/ts/lockfile.ts
if (!format_exports.Has("date-time")) format_exports.Set("date-time", (value) => {
  const parts = value.split(/t/i);
  if (parts.length !== 2) return false;
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(parts[0] ?? "");
  const time = /^(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)(z|([+-])(\d{2}):(\d{2}))$/i.exec(parts[1] ?? "");
  if (!date || !time) return false;
  const year = Number(date[1]), month = Number(date[2]), day = Number(date[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > (days[month] ?? 0)) return false;
  const hour = Number(time[1]), minute = Number(time[2]), second = Number(time[3]);
  const offsetHour = Number(time[6] || 0), offsetMinute = Number(time[7] || 0);
  if (hour > 23 || minute > 59 || offsetHour > 23 || offsetMinute > 59) return false;
  if (second < 60) return true;
  const sign = time[5] === "-" ? -1 : 1;
  const utcMinute = minute - offsetMinute * sign;
  const utcHour = hour - offsetHour * sign - (utcMinute < 0 ? 1 : 0);
  return (utcHour === 23 || utcHour === -1) && (utcMinute === 59 || utcMinute === -1) && second < 61;
});
var JsonValue6 = Type.Recursive((This) => Type.Union([Type.Null(), Type.Boolean(), Type.Number(), Type.String(), Type.Array(This), Type.Record(Type.String(), This)]));
var LockfileSchema = Type.Module({
  "PackageLock": Type.Union([Type.Object({ "version": Type.String({ maxLength: 64 }), "source": Type.Object({ "type": Type.Union([Type.Literal("npm"), Type.Literal("market")]), "ref": Type.String({ maxLength: 1024 }) }, { additionalProperties: false }), "integrity": Type.String({ pattern: "^sha(256|512)-[A-Za-z0-9+/=]+$" }), "trust": Type.Union([Type.Literal("builtin"), Type.Literal("trusted")]), "license": Type.String({ maxLength: 64 }), "apiRange": Type.Optional(Type.String({ maxLength: 64 })), "provides": Type.Optional(Type.Array(Type.Ref("SeamName"))), "capabilities": Type.Optional(Type.Ref("Capabilities")), "state": Type.Object({ "installed": Type.String({ format: "date-time" }), "trusted": Type.Union([Type.String({ format: "date-time" }), Type.Null()]), "enabled": Type.Boolean() }, { additionalProperties: false }), "releasedAt": Type.String({ format: "date-time" }), "dependencies": Type.Record(Type.String(), Type.String()), "previous": Type.Union([Type.Null(), Type.Object({ "version": Type.String(), "integrity": Type.String({ pattern: "^sha(256|512)-[A-Za-z0-9+/=]+$" }), "surfaces": Type.Optional(Type.Array(Type.Ref("SurfaceDescriptor"), { maxItems: 64, uniqueItems: true })), "source": Type.Optional(Type.Object({ "type": Type.Union([Type.Literal("npm"), Type.Literal("market"), Type.Literal("git"), Type.Literal("file"), Type.Literal("workspace")]), "ref": Type.String({ maxLength: 1024 }) }, { additionalProperties: false })), "trust": Type.Optional(Type.Union([Type.Literal("builtin"), Type.Literal("trusted")])), "license": Type.Optional(Type.String({ maxLength: 64 })), "apiRange": Type.Optional(Type.String({ maxLength: 64 })), "provides": Type.Optional(Type.Array(Type.Ref("SeamName"))), "capabilities": Type.Optional(Type.Ref("Capabilities")), "state": Type.Optional(Type.Object({ "installed": Type.String({ format: "date-time" }), "trusted": Type.Union([Type.String({ format: "date-time" }), Type.Null()]), "enabled": Type.Boolean() }, { additionalProperties: false })), "releasedAt": Type.Optional(Type.String({ format: "date-time" })), "dependencies": Type.Optional(Type.Record(Type.String(), Type.String())), "contributions": Type.Optional(Type.Array(Type.Ref("PackageContributionSummary"), { maxItems: 128 })), "treeIntegrity": Type.Optional(Type.String({ minLength: 1, maxLength: 71, pattern: "^sha256-[a-f0-9]{64}$" })), "trustDecision": Type.Optional(Type.Ref("PackageTrustDecision")) }, { additionalProperties: false })]), "surfaces": Type.Optional(Type.Array(Type.Ref("SurfaceDescriptor"), { maxItems: 64, uniqueItems: true })), "contributions": Type.Optional(Type.Array(Type.Ref("PackageContributionSummary"), { maxItems: 128 })), "treeIntegrity": Type.Optional(Type.String({ minLength: 1, maxLength: 71, pattern: "^sha256-[a-f0-9]{64}$" })), "trustDecision": Type.Optional(Type.Ref("PackageTrustDecision")) }, { additionalProperties: false }), Type.Object({ "version": Type.String({ maxLength: 64 }), "source": Type.Object({ "type": Type.Union([Type.Literal("git"), Type.Literal("workspace"), Type.Literal("file")]), "ref": Type.String({ maxLength: 1024 }) }, { additionalProperties: false }), "integrity": Type.String({ pattern: "^sha(256|512)-[A-Za-z0-9+/=]+$" }), "trust": Type.Union([Type.Literal("builtin"), Type.Literal("trusted")]), "license": Type.String({ maxLength: 64 }), "apiRange": Type.Optional(Type.String({ maxLength: 64 })), "provides": Type.Optional(Type.Array(Type.Ref("SeamName"))), "capabilities": Type.Optional(Type.Ref("Capabilities")), "state": Type.Object({ "installed": Type.String({ format: "date-time" }), "trusted": Type.Union([Type.String({ format: "date-time" }), Type.Null()]), "enabled": Type.Boolean() }, { additionalProperties: false }), "releasedAt": Type.Optional(Type.String({ format: "date-time" })), "dependencies": Type.Record(Type.String(), Type.String()), "previous": Type.Union([Type.Null(), Type.Object({ "version": Type.String(), "integrity": Type.String({ pattern: "^sha(256|512)-[A-Za-z0-9+/=]+$" }), "surfaces": Type.Optional(Type.Array(Type.Ref("SurfaceDescriptor"), { maxItems: 64, uniqueItems: true })), "source": Type.Optional(Type.Object({ "type": Type.Union([Type.Literal("npm"), Type.Literal("market"), Type.Literal("git"), Type.Literal("file"), Type.Literal("workspace")]), "ref": Type.String({ maxLength: 1024 }) }, { additionalProperties: false })), "trust": Type.Optional(Type.Union([Type.Literal("builtin"), Type.Literal("trusted")])), "license": Type.Optional(Type.String({ maxLength: 64 })), "apiRange": Type.Optional(Type.String({ maxLength: 64 })), "provides": Type.Optional(Type.Array(Type.Ref("SeamName"))), "capabilities": Type.Optional(Type.Ref("Capabilities")), "state": Type.Optional(Type.Object({ "installed": Type.String({ format: "date-time" }), "trusted": Type.Union([Type.String({ format: "date-time" }), Type.Null()]), "enabled": Type.Boolean() }, { additionalProperties: false })), "releasedAt": Type.Optional(Type.String({ format: "date-time" })), "dependencies": Type.Optional(Type.Record(Type.String(), Type.String())), "contributions": Type.Optional(Type.Array(Type.Ref("PackageContributionSummary"), { maxItems: 128 })), "treeIntegrity": Type.Optional(Type.String({ minLength: 1, maxLength: 71, pattern: "^sha256-[a-f0-9]{64}$" })), "trustDecision": Type.Optional(Type.Ref("PackageTrustDecision")) }, { additionalProperties: false })]), "surfaces": Type.Optional(Type.Array(Type.Ref("SurfaceDescriptor"), { maxItems: 64, uniqueItems: true })), "contributions": Type.Optional(Type.Array(Type.Ref("PackageContributionSummary"), { maxItems: 128 })), "treeIntegrity": Type.Optional(Type.String({ minLength: 1, maxLength: 71, pattern: "^sha256-[a-f0-9]{64}$" })), "trustDecision": Type.Optional(Type.Ref("PackageTrustDecision")) }, { additionalProperties: false })]),
  "Lockfile": Type.Object({ "lockfileVersion": Type.Literal(1), "profile": Type.String(), "resolvedProfileHash": Type.String({ pattern: "^sha256-[a-f0-9]{64}$" }), "generatedAt": Type.String({ format: "date-time" }), "generatedBy": Type.Object({ "agnesVersion": Type.String() }, { additionalProperties: false }), "packages": Type.Record(Type.String(), Type.Ref("PackageLock")), "provider": Type.Object({ "package": Type.String(), "adapters": Type.Array(Type.String()) }, { additionalProperties: false }), "workspace": Type.Optional(Type.Object({ "path": Type.String({ pattern: "^(?!/)(?![A-Za-z]:)(?!\\.\\.(?:/|$))(?!.*\\/\\.\\.(?:/|$))[^\\\\\\u0000]+$" }), "hash": Type.String({ pattern: "^sha256-[a-f0-9]{64}$" }), "manifestId": Type.String(), "trustedAt": Type.String({ format: "date-time" }) }, { additionalProperties: false })), "policySnapshot": Type.Object({ "capabilityCeiling": Type.Array(Type.Ref("Capability")), "workspacePackages": Type.Union([Type.Literal("deny"), Type.Literal("require-project-trust")]), "hash": Type.Optional(Type.String({ pattern: "^sha256-[a-f0-9]{64}$" })) }, { additionalProperties: false }), "seams": Type.Object({ "approval": Type.String(), "checkpoint": Type.String(), "ledger": Type.String(), "sandbox": Type.String(), "verifier": Type.String(), "repair": Type.String(), "artifacts": Type.String(), "principals": Type.String(), "platform": Type.String(), "harness": Type.String() }, { additionalProperties: false }) }, { additionalProperties: false }),
  "Capabilities": Type.Object({ "tools": Type.Optional(Type.Object({ "prefix": Type.String({ pattern: "^(?:[a-z][a-z0-9_]{0,31}_)?$" }), "names": Type.Optional(Type.Array(Type.String({ pattern: "^[A-Za-z_][A-Za-z0-9_]{0,63}$" }))) }, { additionalProperties: false })), "tools.invoke": Type.Optional(Type.Boolean()), "hooks": Type.Optional(Type.Array(Type.Ref("HookEvent"))), "slots": Type.Optional(Type.Array(Type.Ref("UiSlotName"))), "events": Type.Optional(Type.Boolean()), "ui": Type.Optional(Type.Array(Type.Union([Type.Literal("skin"), Type.Literal("client")]), { maxItems: 8, uniqueItems: true })), "resources": Type.Optional(Type.Array(Type.Union([Type.Literal("skill"), Type.Literal("mcp"), Type.Literal("kb"), Type.Literal("datasource"), Type.Literal("model")]))), "network.publicRead": Type.Optional(Type.Boolean()), "network": Type.Optional(Type.Union([Type.Array(Type.String(), { maxItems: 0 }), Type.Object({ "hosts": Type.Array(Type.String({ pattern: "^[a-z0-9.-]+(:[0-9]{1,5})?$" })) }, { additionalProperties: false })])), "artifacts": Type.Optional(Type.Boolean()), "subagent": Type.Optional(Type.Boolean()), "services": Type.Optional(Type.Array(Type.Ref("ServiceCapability"), { uniqueItems: true })), "projections": Type.Optional(Type.Array(Type.Ref("ProjectionCapability"), { uniqueItems: true })) }, { additionalProperties: false }),
  "HookEvent": Type.Union([Type.Literal("session_start"), Type.Literal("resources_discover"), Type.Literal("before_step"), Type.Literal("context"), Type.Literal("before_request"), Type.Literal("request_error"), Type.Literal("tool_call"), Type.Literal("tool_result"), Type.Literal("turn_stopping"), Type.Literal("approval_request"), Type.Literal("before_compact"), Type.Literal("compact"), Type.Literal("subagent_start"), Type.Literal("subagent_end"), Type.Literal("format_deviation"), Type.Literal("shutdown")]),
  "UiSlotName": Type.Union([Type.Literal("tool.card.inline"), Type.Literal("sidebar.action"), Type.Literal("status.line"), Type.Literal("notification")]),
  "SeamName": Type.Union([Type.Literal("approval"), Type.Literal("checkpoint"), Type.Literal("ledger"), Type.Literal("sandbox"), Type.Literal("verifier"), Type.Literal("repair"), Type.Literal("artifacts"), Type.Literal("principals"), Type.Literal("platform"), Type.Literal("harness")]),
  "Capability": Type.String({ pattern: "^[a-z][A-Za-z0-9.-]{0,63}$" }),
  "PackageContributionSummary": Type.Union([Type.Object({ "kind": Type.Literal("client"), "id": Type.String({ pattern: "^plugin/[0-9a-f]{16}$" }), "rowId": Type.String({ minLength: 1, maxLength: 256 }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "client": Type.Ref("ClientContribution"), "skins": Type.Optional(Type.Array(Type.Ref("SkinContribution"), { minItems: 1, maxItems: 16 })) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("client"), "id": Type.String({ pattern: "^plugin/[0-9a-f]{16}$" }), "rowId": Type.String({ minLength: 1, maxLength: 256 }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "skins": Type.Array(Type.Ref("SkinContribution"), { minItems: 1, maxItems: 16 }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("extension"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "apiRange": Type.String({ minLength: 1, maxLength: 64 }), "capabilities": Type.Ref("Capabilities"), "client": Type.Optional(Type.Ref("ClientContribution")), "runtimeSupports": Type.Optional(Type.Array(Type.Union([Type.Literal("in-process"), Type.Literal("isolated")]), { minItems: 1, maxItems: 2, uniqueItems: true })) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("seam"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "apiRange": Type.String({ minLength: 1, maxLength: 64 }), "provides": Type.Array(Type.Ref("SeamName"), { minItems: 1, maxItems: 32, uniqueItems: true }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("provider"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "apiRange": Type.String({ minLength: 1, maxLength: 64 }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("runtime"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "apiRange": Type.String({ minLength: 1, maxLength: 64 }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("skill"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("preset"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("surface"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "descriptor": Type.Ref("SurfaceDescriptor") }, { additionalProperties: false })]),
  "PackageTrustDecision": Type.Object({ "integrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "capabilityHash": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-f0-9]{64}$" }), "decidedAt": Type.String({ format: "date-time" }) }, { additionalProperties: false }),
  "SurfaceDescriptor": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9-]{0,63}$" }), "apiRange": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:(?:>=|<=|>|<|=|\\^|~)?(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|\\^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|(?:0|[1-9][0-9]*)(?:\\.(?:0|[1-9][0-9]*))?\\.(?:x|\\*)|\\*)(?: +(?:(?:>=|<=|>|<|=|\\^|~)?(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|\\^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|(?:0|[1-9][0-9]*)(?:\\.(?:0|[1-9][0-9]*))?\\.(?:x|\\*)|\\*))*$" }), "artifact": Type.Ref("SurfaceArtifact"), "healthPath": Type.String({ minLength: 1, maxLength: 256, pattern: "^/(?:[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*)?$" }), "requires": Type.Object({ "services": Type.Array(Type.Ref("SurfaceServiceGrant"), { maxItems: 64, uniqueItems: true }) }, { additionalProperties: false }) }, { additionalProperties: false }),
  "SurfaceArtifact": Type.Union([Type.Object({ "kind": Type.Literal("node"), "entry": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./dist/(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+)*\\.(?:js|mjs|cjs)$" }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("oci"), "image": Type.String({ minLength: 1, maxLength: 512, pattern: "^[a-z0-9]+(?:[.-][a-z0-9]+)*(?::[0-9]{1,5})?/(?:[a-z0-9]+(?:[._-][a-z0-9]+)*/)*[a-z0-9]+(?:[._-][a-z0-9]+)*@sha256:[a-f0-9]{64}$" }) }, { additionalProperties: false })]),
  "SurfaceServiceGrant": Type.Object({ "extension": Type.String({ minLength: 1, maxLength: 256, pattern: "^[a-z0-9-]+/[a-z0-9-]+$" }), "name": Type.String({ minLength: 1, maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "range": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:(?:>=|<=|>|<|=|\\^|~)?(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|\\^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|(?:0|[1-9][0-9]*)(?:\\.(?:0|[1-9][0-9]*))?\\.(?:x|\\*)|\\*)(?: +(?:(?:>=|<=|>|<|=|\\^|~)?(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|\\^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|(?:0|[1-9][0-9]*)(?:\\.(?:0|[1-9][0-9]*))?\\.(?:x|\\*)|\\*))*$" }) }, { additionalProperties: false }),
  "ClientContribution": Type.Object({ "id": Type.Optional(Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$" })), "entry": Type.String({ minLength: 1, maxLength: 512 }), "styles": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 512 }), { maxItems: 32 })), "slots": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 128 }), { maxItems: 32 })), "slotCatalogVersion": Type.Optional(Type.String({ pattern: "^dsh-client-slots/v[0-9]+$" })), "services": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 128 }), { maxItems: 32 })), "projections": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 128 }), { maxItems: 32 })), "legacyRowIds": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 256, pattern: "^web:[^\\x00]{1,251}$" }), { maxItems: 16, uniqueItems: true })), "publicConfig": Type.Optional(Type.Record(Type.String(), JsonValue6)) }, { additionalProperties: false }),
  "SkinContribution": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?!(?:light|dark|system|none)$)[a-z0-9]+(?:-[a-z0-9]+)*$" }), "name": Type.String({ minLength: 1, maxLength: 64 }), "css": Type.String({ minLength: 3, maxLength: 256, pattern: "^\\./" }), "tokens": Type.Optional(Type.Record(Type.String(), Type.Object({ "light": Type.Ref("SkinTokenValue"), "dark": Type.Ref("SkinTokenValue") }, { additionalProperties: false }))) }, { additionalProperties: false }),
  "SkinTokenValue": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?!.*url\\()[^;{}@]*$" }),
  "ProjectionCapability": Type.Object({ "name": Type.String({ maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "inputEventTypes": Type.Array(Type.String({ minLength: 1, maxLength: 128, pattern: "^[a-z][a-z0-9]*(?:[./-][a-z0-9]+)*$" }), { minItems: 1, uniqueItems: true }), "maxStateBytes": Type.Integer({ minimum: 1, maximum: 262144 }) }, { additionalProperties: false }),
  "ServiceCapability": Type.Object({ "name": Type.String({ maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "kind": Type.Union([Type.Literal("query"), Type.Literal("effect")]), "inputSchema": Type.Ref("ParametersSchema"), "outputSchema": Type.Record(Type.String(), JsonValue6), "timeoutMs": Type.Integer({ minimum: 1, maximum: 3e4 }), "maxResultBytes": Type.Integer({ minimum: 1, maximum: 1048576 }) }, { additionalProperties: false }),
  "ParametersSchema": Type.Object({ "type": Type.Literal("object"), "properties": Type.Record(Type.String(), JsonValue6), "required": Type.Optional(Type.Array(Type.String())), "additionalProperties": Type.Literal(false), "description": Type.Optional(Type.String({ maxLength: 2048 })) }, { additionalProperties: false })
});
var PackageLock = LockfileSchema.Import("PackageLock");
var Lockfile = LockfileSchema.Import("Lockfile");
var Capabilities2 = LockfileSchema.Import("Capabilities");
var HookEvent2 = LockfileSchema.Import("HookEvent");
var UiSlotName2 = LockfileSchema.Import("UiSlotName");
var SeamName2 = LockfileSchema.Import("SeamName");
var Capability = LockfileSchema.Import("Capability");
var PackageContributionSummary = LockfileSchema.Import("PackageContributionSummary");
var PackageTrustDecision = LockfileSchema.Import("PackageTrustDecision");
var SurfaceDescriptor = LockfileSchema.Import("SurfaceDescriptor");
var SurfaceArtifact = LockfileSchema.Import("SurfaceArtifact");
var SurfaceServiceGrant = LockfileSchema.Import("SurfaceServiceGrant");
var ClientContribution2 = LockfileSchema.Import("ClientContribution");
var SkinContribution2 = LockfileSchema.Import("SkinContribution");
var SkinTokenValue2 = LockfileSchema.Import("SkinTokenValue");
var ProjectionCapability2 = LockfileSchema.Import("ProjectionCapability");
var ServiceCapability2 = LockfileSchema.Import("ServiceCapability");
var ParametersSchema3 = LockfileSchema.Import("ParametersSchema");

// ../protocol/gen/ts/package-admin.ts
if (!format_exports.Has("agnes-git-source")) format_exports.Set("agnes-git-source", (value) => {
  const raw = value.slice(4);
  const hashAt = raw.lastIndexOf("#");
  const commit = raw.slice(hashAt + 1);
  try {
    const url = new URL(raw.slice(0, hashAt));
    return value.startsWith("git:") && hashAt > 0 && /^[a-f0-9]{40}$/.test(commit) && url.protocol === "https:" && url.username === "" && url.password === "" && url.search === "" && url.hash === "";
  } catch {
    return false;
  }
});
if (!format_exports.Has("date-time")) format_exports.Set("date-time", (value) => {
  const parts = value.split(/t/i);
  if (parts.length !== 2) return false;
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(parts[0] ?? "");
  const time = /^(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)(z|([+-])(\d{2}):(\d{2}))$/i.exec(parts[1] ?? "");
  if (!date || !time) return false;
  const year = Number(date[1]), month = Number(date[2]), day = Number(date[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > (days[month] ?? 0)) return false;
  const hour = Number(time[1]), minute = Number(time[2]), second = Number(time[3]);
  const offsetHour = Number(time[6] || 0), offsetMinute = Number(time[7] || 0);
  if (hour > 23 || minute > 59 || offsetHour > 23 || offsetMinute > 59) return false;
  if (second < 60) return true;
  const sign = time[5] === "-" ? -1 : 1;
  const utcMinute = minute - offsetMinute * sign;
  const utcHour = hour - offsetHour * sign - (utcMinute < 0 ? 1 : 0);
  return (utcHour === 23 || utcHour === -1) && (utcMinute === 59 || utcMinute === -1) && second < 61;
});
var JsonValue7 = Type.Recursive((This) => Type.Union([Type.Null(), Type.Boolean(), Type.Number(), Type.String(), Type.Array(This), Type.Record(Type.String(), This)]));
var PackageAdminSchema = Type.Module({
  "SkinListResult": Type.Object({ "revision": Type.String({ minLength: 1, maxLength: 128 }), "skins": Type.Array(Type.Object({ "id": Type.String({ minLength: 1, maxLength: 64 }), "name": Type.String({ minLength: 1, maxLength: 64 }), "packageName": Type.String({ minLength: 1, maxLength: 256 }), "cssUrl": Type.String({ minLength: 1, maxLength: 1024 }), "css": Type.Optional(Type.String({ maxLength: 131072 })), "assetBase": Type.Optional(Type.String({ minLength: 1, maxLength: 1024 })), "tokens": Type.Optional(Type.Record(Type.String(), Type.Object({ "light": Type.String({ minLength: 1, maxLength: 256 }), "dark": Type.String({ minLength: 1, maxLength: 256 }) }, { additionalProperties: false }))) }, { additionalProperties: false }), { maxItems: 128 }), "shadowed": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 256 }), { maxItems: 128 })) }, { additionalProperties: false }),
  "PackageAdminPermission": Type.Union([Type.Literal("packages.read"), Type.Literal("packages.install"), Type.Literal("packages.trust"), Type.Literal("packages.activate"), Type.Literal("packages.remove"), Type.Literal("catalog.configure"), Type.Literal("extensions.execute")]),
  "PackageSource": Type.Union([Type.Object({ "type": Type.Literal("npm"), "ref": Type.String({ minLength: 1, maxLength: 1024, pattern: "^npm:(?:@[a-z0-9][a-z0-9._-]*/)?[a-z0-9][a-z0-9._-]*@(?=.{1,64}$)(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*))(?:\\.(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$" }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("file"), "ref": Type.String({ minLength: 1, maxLength: 1024, pattern: "^file:\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("workspace"), "ref": Type.String({ minLength: 1, maxLength: 1024, pattern: "^workspace:extensions/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("git"), "ref": Type.String({ minLength: 1, maxLength: 1024, pattern: "^git:", format: "agnes-git-source" }) }, { additionalProperties: false })]),
  "PackageContributionSummary": Type.Union([Type.Object({ "kind": Type.Literal("client"), "id": Type.String({ pattern: "^plugin/[0-9a-f]{16}$" }), "rowId": Type.String({ minLength: 1, maxLength: 256 }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "client": Type.Ref("ClientContribution"), "skins": Type.Optional(Type.Array(Type.Ref("SkinContribution"), { minItems: 1, maxItems: 16 })) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("client"), "id": Type.String({ pattern: "^plugin/[0-9a-f]{16}$" }), "rowId": Type.String({ minLength: 1, maxLength: 256 }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "skins": Type.Array(Type.Ref("SkinContribution"), { minItems: 1, maxItems: 16 }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("extension"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "apiRange": Type.String({ minLength: 1, maxLength: 64 }), "capabilities": Type.Ref("Capabilities"), "client": Type.Optional(Type.Ref("ClientContribution")), "runtimeSupports": Type.Optional(Type.Array(Type.Union([Type.Literal("in-process"), Type.Literal("isolated")]), { minItems: 1, maxItems: 2, uniqueItems: true })) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("seam"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "apiRange": Type.String({ minLength: 1, maxLength: 64 }), "provides": Type.Array(Type.Ref("SeamName"), { minItems: 1, maxItems: 32, uniqueItems: true }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("provider"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "apiRange": Type.String({ minLength: 1, maxLength: 64 }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("runtime"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "apiRange": Type.String({ minLength: 1, maxLength: 64 }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("skill"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("preset"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("surface"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "descriptor": Type.Ref("SurfaceDescriptor") }, { additionalProperties: false })]),
  "PackageCapabilityDiff": Type.Object({ "added": Type.Array(Type.String({ minLength: 1, maxLength: 256 }), { maxItems: 128 }), "removed": Type.Array(Type.String({ minLength: 1, maxLength: 256 }), { maxItems: 128 }), "runtimeSupportRemoved": Type.Array(Type.String({ minLength: 1, maxLength: 256 }), { maxItems: 128 }), "dependenciesAdded": Type.Array(Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), { maxItems: 128 }), "serviceGrantsAdded": Type.Array(Type.Ref("SurfaceServiceGrant"), { maxItems: 128 }) }, { additionalProperties: false }),
  "PackageBlocker": Type.Object({ "code": Type.Union([Type.Literal("dependency"), Type.Literal("profile"), Type.Literal("generation"), Type.Literal("deployment"), Type.Literal("policy"), Type.Literal("incompatible"), Type.Literal("unknown-contribution")]), "references": Type.Array(Type.String({ minLength: 1, maxLength: 256 }), { maxItems: 128 }) }, { additionalProperties: false }),
  "PackageWarning": Type.Object({ "code": Type.Union([Type.Literal("unverified-provenance"), Type.Literal("unlicensed"), Type.Literal("capability-change"), Type.Literal("runtime-support-change"), Type.Literal("dependency-change"), Type.Literal("service-grant-change")]), "safeMessage": Type.String({ minLength: 1, maxLength: 512 }) }, { additionalProperties: false }),
  "PackageProvenance": Type.Object({ "source": Type.Ref("PackageSource"), "integrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "releasedAt": Type.Optional(Type.String({ format: "date-time" })), "signatureVerified": Type.Boolean() }, { additionalProperties: false }),
  "PackagePreview": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "version": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*))(?:\\.(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$" }), "source": Type.Ref("PackageSource"), "integrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "license": Type.String({ minLength: 1, maxLength: 64 }), "provenance": Type.Ref("PackageProvenance"), "contributions": Type.Array(Type.Ref("PackageContributionSummary"), { maxItems: 128 }), "capabilityDiff": Type.Ref("PackageCapabilityDiff"), "dependencies": Type.Record(Type.String({ pattern: "^(?=.{1,256}$)(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), Type.String({ minLength: 1, maxLength: 1024 }), { additionalProperties: false, maxProperties: 256 }), "warnings": Type.Array(Type.Ref("PackageWarning"), { maxItems: 128 }), "blockers": Type.Array(Type.Ref("PackageBlocker"), { maxItems: 128 }), "capabilityHash": Type.Optional(Type.String({ minLength: 64, maxLength: 64, pattern: "^[a-f0-9]{64}$" })) }, { additionalProperties: false }),
  "PackageTrustDecision": Type.Object({ "integrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "capabilityHash": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-f0-9]{64}$" }), "decidedAt": Type.String({ format: "date-time" }) }, { additionalProperties: false }),
  "PackageActivationTrust": Type.Object({ "integrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "capabilityHash": Type.String({ minLength: 64, maxLength: 64, pattern: "^[a-f0-9]{64}$" }) }, { additionalProperties: false }),
  "PackageActivationRequest": Type.Object({ "expectedInstalledIntegrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "expectedActiveIntegrity": Type.Union([Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), Type.Null()]), "trust": Type.Ref("PackageActivationTrust") }, { additionalProperties: false }),
  "PackageRollbackTarget": Type.Object({ "version": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*))(?:\\.(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$" }), "integrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "capabilityHash": Type.String({ minLength: 64, maxLength: 64, pattern: "^[a-f0-9]{64}$" }) }, { additionalProperties: false }),
  "PackageAdminContext": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "permissions": Type.Array(Type.Ref("PackageAdminPermission"), { maxItems: 7, uniqueItems: true }), "readOnly": Type.Boolean(), "authScope": Type.Optional(Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" })), "features": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), { maxItems: 32, uniqueItems: true })) }, { additionalProperties: false }),
  "PackageInstalledDescriptor": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "version": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*))(?:\\.(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$" }), "source": Type.Ref("PackageSource"), "integrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "trusted": Type.Boolean(), "desired": Type.Union([Type.Literal("installed-disabled"), Type.Literal("enabled")]), "actual": Type.Union([Type.Literal("not-running"), Type.Literal("starting"), Type.Literal("running"), Type.Literal("failed"), Type.Literal("restart-required"), Type.Literal("unavailable")]), "contributions": Type.Array(Type.Ref("PackageContributionSummary"), { maxItems: 128 }), "blockers": Type.Array(Type.Ref("PackageBlocker"), { maxItems: 128 }), "capabilityHash": Type.Optional(Type.String({ minLength: 64, maxLength: 64, pattern: "^[a-f0-9]{64}$" })), "actualVersion": Type.Optional(Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*))(?:\\.(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$" })), "actualIntegrity": Type.Optional(Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" })), "actualReason": Type.Optional(Type.String({ minLength: 1, maxLength: 512 })), "cleanupPending": Type.Optional(Type.Boolean()), "rollbackTarget": Type.Optional(Type.Union([Type.Ref("PackageRollbackTarget"), Type.Null()])) }, { additionalProperties: false }),
  "PackageCatalogDescriptor": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "version": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*))(?:\\.(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$" }), "source": Type.Ref("PackageSource"), "integrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "license": Type.String({ minLength: 1, maxLength: 64 }), "contributions": Type.Array(Type.Ref("PackageContributionSummary"), { maxItems: 128 }), "compatibility": Type.Union([Type.Literal("supported"), Type.Literal("adapted"), Type.Literal("generation-only"), Type.Literal("unsupported")]), "sourceId": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9-]{0,63}$" }), "retrievedAt": Type.String({ format: "date-time" }) }, { additionalProperties: false }),
  "PackageAdminError": Type.Object({ "code": Type.Union([Type.Literal("E_PACKAGE_SOURCE"), Type.Literal("E_PACKAGE_INTEGRITY"), Type.Literal("E_PACKAGE_TRUST"), Type.Literal("E_PACKAGE_STATE"), Type.Literal("E_PACKAGE_BLOCKED"), Type.Literal("E_PACKAGE_PREVIEW_STALE"), Type.Literal("E_PACKAGE_CANCELLED")]), "safeMessage": Type.String({ minLength: 1, maxLength: 512 }), "blockers": Type.Array(Type.Ref("PackageBlocker"), { maxItems: 128 }) }, { additionalProperties: false }),
  "PackageOperationReceipt": Type.Object({ "operationId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }) }, { additionalProperties: false }),
  "PackageOperation": Type.Object({ "operationId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "operation": Type.Union([Type.Literal("inspect"), Type.Literal("install"), Type.Literal("trust"), Type.Literal("untrust"), Type.Literal("enable"), Type.Literal("disable"), Type.Literal("update"), Type.Literal("rollback"), Type.Literal("remove")]), "state": Type.Union([Type.Literal("received"), Type.Literal("inspecting"), Type.Literal("installing"), Type.Literal("staging"), Type.Literal("quiescing"), Type.Literal("switching"), Type.Literal("draining"), Type.Literal("completed"), Type.Literal("failed"), Type.Literal("cancelled"), Type.Literal("rolled-back")]), "progress": Type.Integer({ minimum: 0, maximum: 100 }), "startedAt": Type.String({ format: "date-time" }), "updatedAt": Type.String({ format: "date-time" }), "preview": Type.Optional(Type.Ref("PackagePreview")), "installed": Type.Optional(Type.Ref("PackageInstalledDescriptor")), "error": Type.Optional(Type.Ref("PackageAdminError")), "packageId": Type.Optional(Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" })), "cancellable": Type.Optional(Type.Boolean()), "retryable": Type.Optional(Type.Boolean()) }, { additionalProperties: false }),
  "PackageCatalogPage": Type.Object({ "items": Type.Array(Type.Ref("PackageCatalogDescriptor"), { maxItems: 100 }), "nextCursor": Type.Union([Type.String({ minLength: 1, maxLength: 256 }), Type.Null()]) }, { additionalProperties: false }),
  "PackageListResult": Type.Object({ "packages": Type.Array(Type.Ref("PackageInstalledDescriptor"), { maxItems: 1024 }) }, { additionalProperties: false }),
  "PackageCatalogListParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "query": Type.Optional(Type.String({ minLength: 1, maxLength: 256 })), "cursor": Type.Optional(Type.String({ minLength: 1, maxLength: 256 })), "limit": Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })) }, { additionalProperties: false }),
  "PackageCatalogGetParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "version": Type.Optional(Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*))(?:\\.(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$" })) }, { additionalProperties: false }),
  "PackageListParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }) }, { additionalProperties: false }),
  "PackageInspectParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "source": Type.Ref("PackageSource") }, { additionalProperties: false }),
  "PackageInstallParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "source": Type.Ref("PackageSource"), "expectedIntegrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }) }, { additionalProperties: false }),
  "PackageTrustParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "expectedIntegrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "capabilityHash": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-f0-9]{64}$" }) }, { additionalProperties: false }),
  "PackageUntrustParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*\\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:\\/[a-z0-9][a-z0-9._-]*)?)$" }), "expectedIntegrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "capabilityHash": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-f0-9]{64}$" }) }, { additionalProperties: false }),
  "PackageEnableParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "expectedInstalledIntegrity": Type.Optional(Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" })), "expectedActiveIntegrity": Type.Optional(Type.Union([Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), Type.Null()])) }, { additionalProperties: false }),
  "PackageDisableParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }) }, { additionalProperties: false }),
  "PackageRollbackParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "expectedTargetIntegrity": Type.Optional(Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" })), "activation": Type.Optional(Type.Ref("PackageActivationRequest")) }, { additionalProperties: false }),
  "PackageRemoveParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }) }, { additionalProperties: false }),
  "PackageUpdateParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "source": Type.Ref("PackageSource"), "expectedIntegrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "activation": Type.Optional(Type.Ref("PackageActivationRequest")) }, { additionalProperties: false }),
  "PackageOperationGetParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "operationId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }) }, { additionalProperties: false }),
  "PackageOperationCancelParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "operationId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }) }, { additionalProperties: false }),
  "RuntimePinDescriptor": Type.Object({ "pinId": Type.String({ minLength: 1, maxLength: 256 }), "purpose": Type.Union([Type.Literal("active"), Type.Literal("candidate"), Type.Literal("recovery"), Type.Literal("rollback"), Type.Literal("turn")]), "packageId": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "version": Type.String({ minLength: 1, maxLength: 64 }), "snapshotId": Type.String({ minLength: 1, maxLength: 128 }), "operationId": Type.String({ minLength: 1, maxLength: 128 }) }, { additionalProperties: false }),
  "RuntimePinReleaseResult": Type.Object({ "pinId": Type.String({ minLength: 1, maxLength: 256 }), "outcome": Type.Union([Type.Literal("released"), Type.Literal("skipped-no-longer-orphaned"), Type.Literal("failed")]), "error": Type.Optional(Type.Ref("PackageAdminError")) }, { additionalProperties: false }),
  "PackagePinsInspectParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }) }, { additionalProperties: false }),
  "PackagePinsInspectResult": Type.Object({ "orphans": Type.Array(Type.Ref("RuntimePinDescriptor"), { maxItems: 4096 }) }, { additionalProperties: false }),
  "PackagePinsReleaseParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "pinIds": Type.Array(Type.String({ minLength: 1, maxLength: 256 }), { minItems: 1, maxItems: 64 }) }, { additionalProperties: false }),
  "PackagePinsReleaseResult": Type.Object({ "results": Type.Array(Type.Ref("RuntimePinReleaseResult"), { maxItems: 64 }) }, { additionalProperties: false }),
  "PackageTrustWorkspaceParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "deployDir": Type.String({ minLength: 1, maxLength: 4096 }) }, { additionalProperties: false }),
  "PackageTrustWorkspaceResult": Type.Object({ "hash": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }) }, { additionalProperties: false }),
  "SkinReadParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "path": Type.String({ minLength: 1, maxLength: 1024, pattern: "^/skins/" }) }, { additionalProperties: false }),
  "SkinReadResult": Type.Union([Type.Object({ "found": Type.Literal(false) }, { additionalProperties: false }), Type.Object({ "found": Type.Literal(true), "base64": Type.String({ minLength: 1, maxLength: 4194304 }) }, { additionalProperties: false })]),
  "ClientModuleListResult": Type.Object({ "revision": Type.String({ minLength: 1, maxLength: 128 }), "serverTime": Type.String({ minLength: 1, maxLength: 64 }), "rows": Type.Optional(Type.Array(Type.Ref("ClientModuleRosterRow"), { maxItems: 256 })), "rowAliases": Type.Optional(Type.Record(Type.String({ pattern: "^web:[^\\x00]{1,251}$" }), Type.String({ minLength: 1, maxLength: 256, pattern: "^web:[^\\x00]{1,251}$" }), { additionalProperties: false, maxProperties: 256 })), "modules": Type.Array(Type.Object({ "rowId": Type.Optional(Type.String({ minLength: 1, maxLength: 256, pattern: "^web:[^\\x00]{1,251}$" })), "packageId": Type.String({ minLength: 1, maxLength: 256 }), "revision": Type.String({ minLength: 1, maxLength: 128 }), "entryUrl": Type.String({ minLength: 1, maxLength: 1024, pattern: "^/plugins/" }), "styleUrls": Type.Array(Type.String({ minLength: 1, maxLength: 1024, pattern: "^/plugins/" }), { maxItems: 32 }), "slots": Type.Array(Type.String({ minLength: 1, maxLength: 128 }), { maxItems: 32 }), "slotCatalogVersion": Type.Optional(Type.String({ pattern: "^dsh-client-slots/v[0-9]+$" })), "contentDigest": Type.Optional(Type.String({ pattern: "^sha256-[a-f0-9]{64}$" })), "extIds": Type.Array(Type.String({ minLength: 1, maxLength: 128 }), { maxItems: 64 }), "publicConfig": Type.Optional(Type.Record(Type.String(), JsonValue7)) }, { additionalProperties: false }), { maxItems: 256 }), "statuses": Type.Array(Type.Object({ "packageId": Type.String({ minLength: 1, maxLength: 256 }), "installedRevision": Type.String({ minLength: 1, maxLength: 128 }), "backendRevision": Type.Union([Type.String({ maxLength: 128 }), Type.Null()]), "state": Type.Union([Type.Literal("ready"), Type.Literal("pending-activation"), Type.Literal("blocked")]), "reason": Type.Optional(Type.Union([Type.Literal("backend-revision-unavailable"), Type.Literal("backend-not-running"), Type.Literal("unsupported-slot"), Type.Literal("resources-invalid"), Type.Literal("snapshot-quota-exceeded"), Type.Literal("snapshot-retention-limit")])), "retained": Type.Optional(Type.Array(Type.Object({ "revision": Type.String({ minLength: 1, maxLength: 128 }), "expiresAt": Type.String({ minLength: 1, maxLength: 64 }) }, { additionalProperties: false }), { maxItems: 8 })) }, { additionalProperties: false }), { maxItems: 256 }) }, { additionalProperties: false }),
  "ClientModuleRosterRow": Type.Object({ "rowId": Type.String({ minLength: 1, maxLength: 256, pattern: "^web:[^\\x00]{1,251}$" }), "moduleName": Type.String({ minLength: 1, maxLength: 256 }), "packageId": Type.Optional(Type.String({ minLength: 1, maxLength: 256 })), "enabled": Type.Boolean(), "phase": Type.Union([Type.Literal("ready"), Type.Literal("pending-activation"), Type.Literal("blocked"), Type.Literal("disabled")]), "revision": Type.Optional(Type.String({ minLength: 1, maxLength: 128 })), "entryUrl": Type.Optional(Type.String({ minLength: 1, maxLength: 1024, pattern: "^/plugins/" })), "styleUrls": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 1024, pattern: "^/plugins/" }), { maxItems: 32 })), "slots": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 128 }), { maxItems: 32 })), "slotCatalogVersion": Type.Optional(Type.String({ pattern: "^dsh-client-slots/v[0-9]+$" })), "contentDigest": Type.Optional(Type.String({ pattern: "^sha256-[a-f0-9]{64}$" })), "extIds": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 128 }), { maxItems: 64 })), "services": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), { maxItems: 32 })), "publicConfig": Type.Optional(Type.Record(Type.String(), JsonValue7)) }, { additionalProperties: false }),
  "ClientModuleReadParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "path": Type.String({ minLength: 1, maxLength: 1024, pattern: "^/plugins/" }) }, { additionalProperties: false }),
  "ClientModuleReadResult": Type.Union([Type.Object({ "found": Type.Literal(false) }, { additionalProperties: false }), Type.Object({ "found": Type.Literal(true), "base64": Type.String({ minLength: 1, maxLength: 6e6 }) }, { additionalProperties: false })]),
  "ClientModuleServiceCallParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "rowId": Type.String({ minLength: 1, maxLength: 256, pattern: "^web:[^\\x00]{1,251}$" }), "sessionId": Type.String({ minLength: 1, maxLength: 512 }), "service": Type.String({ minLength: 1, maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "input": Type.Record(Type.String(), JsonValue7) }, { additionalProperties: false }),
  "ClientModuleServiceCallResult": Type.Ref("ExtensionCallResult"),
  "ClientModuleEffectCallParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "rowId": Type.String({ minLength: 1, maxLength: 256, pattern: "^web:[^\\x00]{1,251}$" }), "sessionId": Type.String({ minLength: 1, maxLength: 512 }), "service": Type.String({ minLength: 1, maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "input": Type.Record(Type.String(), JsonValue7) }, { additionalProperties: false }),
  "ClientModuleEffectCallResult": Type.Ref("ExtensionCallResult"),
  "PluginTreeArtifact": Type.Object({ "encoding": Type.Literal("base64"), "canonicalBase64": Type.String({ minLength: 4, maxLength: 16776788, pattern: "^[A-Za-z0-9+/]+={0,2}$" }), "digest": Type.String({ pattern: "^sha256-[0-9a-f]{64}$" }), "identity": Type.Object({ "treeHash": Type.String({ pattern: "^[0-9a-f]{64}$" }), "resourceRevision": Type.String({ pattern: "^[0-9a-f]{64}$" }), "compositeRevision": Type.String({ pattern: "^[0-9a-f]{64}$" }) }, { additionalProperties: false }) }, { additionalProperties: false }),
  "PluginTreeGetParams": Type.Ref("PackageListParams"),
  "PluginTreeListParams": Type.Ref("PackageListParams"),
  "PluginTreeApplyParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "artifact": Type.Ref("PluginTreeArtifact") }, { additionalProperties: false }),
  "PluginTreeRollbackParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }) }, { additionalProperties: false }),
  "PluginTreeView": Type.Object({ "actual": Type.Boolean(), "pending": Type.Boolean(), "desiredDigest": Type.Optional(Type.String({ pattern: "^sha256-[0-9a-f]{64}$" })), "reportOk": Type.Optional(Type.Boolean()), "failurePhase": Type.Optional(Type.String({ minLength: 1, maxLength: 128 })), "workerGeneration": Type.Optional(Type.Integer({ minimum: 1, maximum: 9007199254740991 })), "identity": Type.Optional(Type.Object({ "treeHash": Type.String({ pattern: "^[0-9a-f]{64}$" }), "resourceRevision": Type.String({ pattern: "^[0-9a-f]{64}$" }), "compositeRevision": Type.String({ pattern: "^[0-9a-f]{64}$" }) }, { additionalProperties: false })), "desired": Type.Optional(Type.Ref("PluginTreeArtifact")) }, { additionalProperties: false }),
  "PluginTreeApplyResult": Type.Object({ "desiredDigest": Type.String({ pattern: "^sha256-[0-9a-f]{64}$" }), "pending": Type.Boolean() }, { additionalProperties: false }),
  "PluginTreeRollbackResult": Type.Object({ "rolledBack": Type.Boolean(), "desiredDigest": Type.Optional(Type.String({ pattern: "^sha256-[0-9a-f]{64}$" })) }, { additionalProperties: false }),
  "SurfaceDescriptor": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9-]{0,63}$" }), "apiRange": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:(?:>=|<=|>|<|=|\\^|~)?(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|\\^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|(?:0|[1-9][0-9]*)(?:\\.(?:0|[1-9][0-9]*))?\\.(?:x|\\*)|\\*)(?: +(?:(?:>=|<=|>|<|=|\\^|~)?(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|\\^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|(?:0|[1-9][0-9]*)(?:\\.(?:0|[1-9][0-9]*))?\\.(?:x|\\*)|\\*))*$" }), "artifact": Type.Ref("SurfaceArtifact"), "healthPath": Type.String({ minLength: 1, maxLength: 256, pattern: "^/(?:[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*)?$" }), "requires": Type.Object({ "services": Type.Array(Type.Ref("SurfaceServiceGrant"), { maxItems: 64, uniqueItems: true }) }, { additionalProperties: false }) }, { additionalProperties: false }),
  "SurfaceArtifact": Type.Union([Type.Object({ "kind": Type.Literal("node"), "entry": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./dist/(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+)*\\.(?:js|mjs|cjs)$" }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("oci"), "image": Type.String({ minLength: 1, maxLength: 512, pattern: "^[a-z0-9]+(?:[.-][a-z0-9]+)*(?::[0-9]{1,5})?/(?:[a-z0-9]+(?:[._-][a-z0-9]+)*/)*[a-z0-9]+(?:[._-][a-z0-9]+)*@sha256:[a-f0-9]{64}$" }) }, { additionalProperties: false })]),
  "SurfaceServiceGrant": Type.Object({ "extension": Type.String({ minLength: 1, maxLength: 256, pattern: "^[a-z0-9-]+/[a-z0-9-]+$" }), "name": Type.String({ minLength: 1, maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "range": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:(?:>=|<=|>|<|=|\\^|~)?(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|\\^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|(?:0|[1-9][0-9]*)(?:\\.(?:0|[1-9][0-9]*))?\\.(?:x|\\*)|\\*)(?: +(?:(?:>=|<=|>|<|=|\\^|~)?(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|\\^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|(?:0|[1-9][0-9]*)(?:\\.(?:0|[1-9][0-9]*))?\\.(?:x|\\*)|\\*))*$" }) }, { additionalProperties: false }),
  "Capabilities": Type.Object({ "tools": Type.Optional(Type.Object({ "prefix": Type.String({ pattern: "^(?:[a-z][a-z0-9_]{0,31}_)?$" }), "names": Type.Optional(Type.Array(Type.String({ pattern: "^[A-Za-z_][A-Za-z0-9_]{0,63}$" }))) }, { additionalProperties: false })), "tools.invoke": Type.Optional(Type.Boolean()), "hooks": Type.Optional(Type.Array(Type.Ref("HookEvent"))), "slots": Type.Optional(Type.Array(Type.Ref("UiSlotName"))), "events": Type.Optional(Type.Boolean()), "ui": Type.Optional(Type.Array(Type.Union([Type.Literal("skin"), Type.Literal("client")]), { maxItems: 8, uniqueItems: true })), "resources": Type.Optional(Type.Array(Type.Union([Type.Literal("skill"), Type.Literal("mcp"), Type.Literal("kb"), Type.Literal("datasource"), Type.Literal("model")]))), "network.publicRead": Type.Optional(Type.Boolean()), "network": Type.Optional(Type.Union([Type.Array(Type.String(), { maxItems: 0 }), Type.Object({ "hosts": Type.Array(Type.String({ pattern: "^[a-z0-9.-]+(:[0-9]{1,5})?$" })) }, { additionalProperties: false })])), "artifacts": Type.Optional(Type.Boolean()), "subagent": Type.Optional(Type.Boolean()), "services": Type.Optional(Type.Array(Type.Ref("ServiceCapability"), { uniqueItems: true })), "projections": Type.Optional(Type.Array(Type.Ref("ProjectionCapability"), { uniqueItems: true })) }, { additionalProperties: false }),
  "ClientContribution": Type.Object({ "id": Type.Optional(Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$" })), "entry": Type.String({ minLength: 1, maxLength: 512 }), "styles": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 512 }), { maxItems: 32 })), "slots": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 128 }), { maxItems: 32 })), "slotCatalogVersion": Type.Optional(Type.String({ pattern: "^dsh-client-slots/v[0-9]+$" })), "services": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 128 }), { maxItems: 32 })), "projections": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 128 }), { maxItems: 32 })), "legacyRowIds": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 256, pattern: "^web:[^\\x00]{1,251}$" }), { maxItems: 16, uniqueItems: true })), "publicConfig": Type.Optional(Type.Record(Type.String(), JsonValue7)) }, { additionalProperties: false }),
  "SkinContribution": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?!(?:light|dark|system|none)$)[a-z0-9]+(?:-[a-z0-9]+)*$" }), "name": Type.String({ minLength: 1, maxLength: 64 }), "css": Type.String({ minLength: 3, maxLength: 256, pattern: "^\\./" }), "tokens": Type.Optional(Type.Record(Type.String(), Type.Object({ "light": Type.Ref("SkinTokenValue"), "dark": Type.Ref("SkinTokenValue") }, { additionalProperties: false }))) }, { additionalProperties: false }),
  "SkinTokenValue": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?!.*url\\()[^;{}@]*$" }),
  "HookEvent": Type.Union([Type.Literal("session_start"), Type.Literal("resources_discover"), Type.Literal("before_step"), Type.Literal("context"), Type.Literal("before_request"), Type.Literal("request_error"), Type.Literal("tool_call"), Type.Literal("tool_result"), Type.Literal("turn_stopping"), Type.Literal("approval_request"), Type.Literal("before_compact"), Type.Literal("compact"), Type.Literal("subagent_start"), Type.Literal("subagent_end"), Type.Literal("format_deviation"), Type.Literal("shutdown")]),
  "UiSlotName": Type.Union([Type.Literal("tool.card.inline"), Type.Literal("sidebar.action"), Type.Literal("status.line"), Type.Literal("notification")]),
  "SeamName": Type.Union([Type.Literal("approval"), Type.Literal("checkpoint"), Type.Literal("ledger"), Type.Literal("sandbox"), Type.Literal("verifier"), Type.Literal("repair"), Type.Literal("artifacts"), Type.Literal("principals"), Type.Literal("platform"), Type.Literal("harness")]),
  "ProjectionCapability": Type.Object({ "name": Type.String({ maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "inputEventTypes": Type.Array(Type.String({ minLength: 1, maxLength: 128, pattern: "^[a-z][a-z0-9]*(?:[./-][a-z0-9]+)*$" }), { minItems: 1, uniqueItems: true }), "maxStateBytes": Type.Integer({ minimum: 1, maximum: 262144 }) }, { additionalProperties: false }),
  "ServiceCapability": Type.Object({ "name": Type.String({ maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "kind": Type.Union([Type.Literal("query"), Type.Literal("effect")]), "inputSchema": Type.Ref("ParametersSchema"), "outputSchema": Type.Record(Type.String(), JsonValue7), "timeoutMs": Type.Integer({ minimum: 1, maximum: 3e4 }), "maxResultBytes": Type.Integer({ minimum: 1, maximum: 1048576 }) }, { additionalProperties: false }),
  "ExtensionCallResult": Type.Object({ "output": JsonValue7 }, { additionalProperties: false }),
  "ParametersSchema": Type.Object({ "type": Type.Literal("object"), "properties": Type.Record(Type.String(), JsonValue7), "required": Type.Optional(Type.Array(Type.String())), "additionalProperties": Type.Literal(false), "description": Type.Optional(Type.String({ maxLength: 2048 })) }, { additionalProperties: false })
});
var SkinListResult = PackageAdminSchema.Import("SkinListResult");
var PackageAdminPermission = PackageAdminSchema.Import("PackageAdminPermission");
var PackageSource = PackageAdminSchema.Import("PackageSource");
var PackageContributionSummary2 = PackageAdminSchema.Import("PackageContributionSummary");
var PackageCapabilityDiff = PackageAdminSchema.Import("PackageCapabilityDiff");
var PackageBlocker = PackageAdminSchema.Import("PackageBlocker");
var PackageWarning = PackageAdminSchema.Import("PackageWarning");
var PackageProvenance = PackageAdminSchema.Import("PackageProvenance");
var PackagePreview = PackageAdminSchema.Import("PackagePreview");
var PackageTrustDecision2 = PackageAdminSchema.Import("PackageTrustDecision");
var PackageActivationTrust = PackageAdminSchema.Import("PackageActivationTrust");
var PackageActivationRequest = PackageAdminSchema.Import("PackageActivationRequest");
var PackageRollbackTarget = PackageAdminSchema.Import("PackageRollbackTarget");
var PackageAdminContext = PackageAdminSchema.Import("PackageAdminContext");
var PackageInstalledDescriptor = PackageAdminSchema.Import("PackageInstalledDescriptor");
var PackageCatalogDescriptor = PackageAdminSchema.Import("PackageCatalogDescriptor");
var PackageAdminError = PackageAdminSchema.Import("PackageAdminError");
var PackageOperationReceipt = PackageAdminSchema.Import("PackageOperationReceipt");
var PackageOperation = PackageAdminSchema.Import("PackageOperation");
var PackageCatalogPage = PackageAdminSchema.Import("PackageCatalogPage");
var PackageListResult = PackageAdminSchema.Import("PackageListResult");
var PackageCatalogListParams = PackageAdminSchema.Import("PackageCatalogListParams");
var PackageCatalogGetParams = PackageAdminSchema.Import("PackageCatalogGetParams");
var PackageListParams = PackageAdminSchema.Import("PackageListParams");
var PackageInspectParams = PackageAdminSchema.Import("PackageInspectParams");
var PackageInstallParams = PackageAdminSchema.Import("PackageInstallParams");
var PackageTrustParams = PackageAdminSchema.Import("PackageTrustParams");
var PackageUntrustParams = PackageAdminSchema.Import("PackageUntrustParams");
var PackageEnableParams = PackageAdminSchema.Import("PackageEnableParams");
var PackageDisableParams = PackageAdminSchema.Import("PackageDisableParams");
var PackageRollbackParams = PackageAdminSchema.Import("PackageRollbackParams");
var PackageRemoveParams = PackageAdminSchema.Import("PackageRemoveParams");
var PackageUpdateParams = PackageAdminSchema.Import("PackageUpdateParams");
var PackageOperationGetParams = PackageAdminSchema.Import("PackageOperationGetParams");
var PackageOperationCancelParams = PackageAdminSchema.Import("PackageOperationCancelParams");
var RuntimePinDescriptor = PackageAdminSchema.Import("RuntimePinDescriptor");
var RuntimePinReleaseResult = PackageAdminSchema.Import("RuntimePinReleaseResult");
var PackagePinsInspectParams = PackageAdminSchema.Import("PackagePinsInspectParams");
var PackagePinsInspectResult = PackageAdminSchema.Import("PackagePinsInspectResult");
var PackagePinsReleaseParams = PackageAdminSchema.Import("PackagePinsReleaseParams");
var PackagePinsReleaseResult = PackageAdminSchema.Import("PackagePinsReleaseResult");
var PackageTrustWorkspaceParams = PackageAdminSchema.Import("PackageTrustWorkspaceParams");
var PackageTrustWorkspaceResult = PackageAdminSchema.Import("PackageTrustWorkspaceResult");
var SkinReadParams = PackageAdminSchema.Import("SkinReadParams");
var SkinReadResult = PackageAdminSchema.Import("SkinReadResult");
var ClientModuleListResult = PackageAdminSchema.Import("ClientModuleListResult");
var ClientModuleRosterRow = PackageAdminSchema.Import("ClientModuleRosterRow");
var ClientModuleReadParams = PackageAdminSchema.Import("ClientModuleReadParams");
var ClientModuleReadResult = PackageAdminSchema.Import("ClientModuleReadResult");
var ClientModuleServiceCallParams = PackageAdminSchema.Import("ClientModuleServiceCallParams");
var ClientModuleServiceCallResult = PackageAdminSchema.Import("ClientModuleServiceCallResult");
var ClientModuleEffectCallParams = PackageAdminSchema.Import("ClientModuleEffectCallParams");
var ClientModuleEffectCallResult = PackageAdminSchema.Import("ClientModuleEffectCallResult");
var PluginTreeArtifact = PackageAdminSchema.Import("PluginTreeArtifact");
var PluginTreeGetParams = PackageAdminSchema.Import("PluginTreeGetParams");
var PluginTreeListParams = PackageAdminSchema.Import("PluginTreeListParams");
var PluginTreeApplyParams = PackageAdminSchema.Import("PluginTreeApplyParams");
var PluginTreeRollbackParams = PackageAdminSchema.Import("PluginTreeRollbackParams");
var PluginTreeView = PackageAdminSchema.Import("PluginTreeView");
var PluginTreeApplyResult = PackageAdminSchema.Import("PluginTreeApplyResult");
var PluginTreeRollbackResult = PackageAdminSchema.Import("PluginTreeRollbackResult");
var SurfaceDescriptor2 = PackageAdminSchema.Import("SurfaceDescriptor");
var SurfaceArtifact2 = PackageAdminSchema.Import("SurfaceArtifact");
var SurfaceServiceGrant2 = PackageAdminSchema.Import("SurfaceServiceGrant");
var Capabilities3 = PackageAdminSchema.Import("Capabilities");
var ClientContribution3 = PackageAdminSchema.Import("ClientContribution");
var SkinContribution3 = PackageAdminSchema.Import("SkinContribution");
var SkinTokenValue3 = PackageAdminSchema.Import("SkinTokenValue");
var HookEvent3 = PackageAdminSchema.Import("HookEvent");
var UiSlotName3 = PackageAdminSchema.Import("UiSlotName");
var SeamName3 = PackageAdminSchema.Import("SeamName");
var ProjectionCapability3 = PackageAdminSchema.Import("ProjectionCapability");
var ServiceCapability3 = PackageAdminSchema.Import("ServiceCapability");
var ExtensionCallResult = PackageAdminSchema.Import("ExtensionCallResult");
var ParametersSchema4 = PackageAdminSchema.Import("ParametersSchema");

// ../protocol/gen/ts/preset.ts
var PresetSchema = Type.Module({
  "RouteTable": Type.Object({ "primary": Type.Ref("RouteTarget"), "escalation": Type.Optional(Type.Ref("RouteTarget")), "fast": Type.Optional(Type.Ref("RouteTarget")), "compaction": Type.Optional(Type.Ref("RouteTarget")), "verifier": Type.Optional(Type.Ref("RouteTarget")), "image": Type.Optional(Type.Ref("RouteTarget")), "video": Type.Optional(Type.Ref("RouteTarget")) }, { additionalProperties: false }),
  "PresetDoc": Type.Object({ "name": Type.String({ pattern: "^[a-z][a-z0-9-]{0,63}$" }), "extends": Type.Optional(Type.Intersect([Type.String({ pattern: "^[a-z][a-z0-9-]{0,63}$" }), Type.Not(Type.Literal("minimal-rl"))])), "surfaces": Type.Optional(Type.Array(Type.Union([Type.Literal("cli"), Type.Literal("sdk"), Type.Literal("acp"), Type.Literal("daemon"), Type.Literal("channel")]))), "model": Type.Optional(Type.Object({ "contract_id": Type.Optional(Type.Union([Type.String({ maxLength: 128 }), Type.Null()])), "route": Type.Optional(Type.Ref("RouteTable")), "prompt_sections": Type.Optional(Type.Array(Type.String({ pattern: "^[a-z][a-z0-9-]{0,63}$" }))), "thinking": Type.Optional(Type.Object({ "primary": Type.Optional(Type.Ref("ThinkingLevel")), "escalation": Type.Optional(Type.Ref("ThinkingLevel")), "fast": Type.Optional(Type.Ref("ThinkingLevel")), "compaction": Type.Optional(Type.Ref("ThinkingLevel")), "verifier": Type.Optional(Type.Ref("ThinkingLevel")), "image": Type.Optional(Type.Ref("ThinkingLevel")), "video": Type.Optional(Type.Ref("ThinkingLevel")) }, { additionalProperties: false })), "retry": Type.Optional(Type.Object({ "max_attempts": Type.Optional(Type.Integer({ minimum: 1, maximum: 8 })), "backoff_ms": Type.Optional(Type.Integer({ minimum: 0 })), "base_delay_ms": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false })), "timeout_ms": Type.Optional(Type.Integer({ minimum: 1 })), "max_tokens": Type.Optional(Type.Integer({ minimum: 1, maximum: 9007199254740991 })) }, { additionalProperties: false })), "disclosure": Type.Optional(Type.Union([Type.Literal("standard"), Type.Literal("hybrid"), Type.Literal("code")])), "tools": Type.Optional(Type.Object({ "core": Type.Optional(Type.Array(Type.String({ pattern: "^[A-Za-z_][A-Za-z0-9_]{0,63}$" }))), "timeout_ms": Type.Optional(Type.Integer({ minimum: 1e3 })), "output_max_bytes": Type.Optional(Type.Integer({ minimum: 4096, maximum: 1048576 })), "timeouts": Type.Optional(Type.Record(Type.String(), Type.Integer({ minimum: 1e3 }))) }, { additionalProperties: false })), "mcp": Type.Optional(Type.Object({ "servers": Type.Optional(Type.Array(Type.Object({ "id": Type.String({ maxLength: 64 }), "transport": Type.Union([Type.Literal("stdio"), Type.Literal("http")]), "cmd": Type.Optional(Type.Array(Type.String())), "url": Type.Optional(Type.String({ maxLength: 2048 })), "env": Type.Optional(Type.Record(Type.String(), Type.String({ pattern: "^secret://" }))), "defer": Type.Optional(Type.Boolean()) }, { additionalProperties: false }))), "defer": Type.Optional(Type.Boolean()) }, { additionalProperties: false })), "code_runtime": Type.Optional(Type.Object({ "language": Type.Union([Type.Literal("python"), Type.Literal("typescript")]), "state": Type.Union([Type.Literal("persistent"), Type.Literal("stateless")]), "isolation": Type.Optional(Type.Union([Type.Literal("process"), Type.Literal("worker-thread"), Type.Literal("container")])), "raw_io": Type.Optional(Type.Boolean()), "max_parallel_sub_calls": Type.Optional(Type.Integer({ minimum: 1, maximum: 32 })), "cell_timeout_ms": Type.Optional(Type.Integer({ minimum: 1e3 })), "max_output_chars": Type.Optional(Type.Integer({ minimum: 1024 })) }, { additionalProperties: false })), "budget": Type.Optional(Type.Object({ "preflight": Type.Optional(Type.Union([Type.Literal("count"), Type.Literal("estimate")])), "per_request_cap": Type.Optional(Type.Union([Type.Number({ minimum: 0 }), Type.Null()])), "on_exceed": Type.Optional(Type.Union([Type.Literal("quote"), Type.Literal("deny")])), "max_steps": Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])), "attribution": Type.Optional(Type.Union([Type.Literal("own"), Type.Literal("aggregate")])) }, { additionalProperties: false })), "compaction": Type.Optional(Type.Object({ "enabled": Type.Optional(Type.Boolean()), "reserve_tokens": Type.Optional(Type.Integer({ minimum: 0 })), "keep_recent_tokens": Type.Optional(Type.Integer({ minimum: 0 })), "agent_callable": Type.Optional(Type.Boolean()) }, { additionalProperties: false })), "checkpoint": Type.Optional(Type.Object({ "keep": Type.Optional(Type.Integer({ minimum: 1 })), "max_file_bytes": Type.Optional(Type.Integer({ minimum: 1 })) }, { additionalProperties: false })), "sandbox": Type.Optional(Type.Object({ "level": Type.Optional(Type.Union([Type.Literal("L0"), Type.Literal("L1"), Type.Literal("L2")])), "required": Type.Optional(Type.Boolean()), "on_unavailable": Type.Optional(Type.Union([Type.Literal("deny"), Type.Literal("allow")])), "extra_paths": Type.Optional(Type.Array(Type.String())), "deny_paths": Type.Optional(Type.Array(Type.String())), "network_allow": Type.Optional(Type.Array(Type.String())) }, { additionalProperties: false })), "approval": Type.Optional(Type.Object({ "on_unavailable": Type.Optional(Type.Union([Type.Literal("deny"), Type.Literal("park")])), "on_timeout": Type.Optional(Type.Literal("rejected")), "timeout_ms": Type.Optional(Type.Integer({ minimum: 1 })), "pending_ttl_ms": Type.Optional(Type.Integer({ minimum: 1e3 })), "bind": Type.Optional(Type.Array(Type.Union([Type.Literal("scope"), Type.Literal("tool"), Type.Literal("argv_hash"), Type.Literal("session")]))), "command_policy": Type.Optional(Type.Array(Type.Object({ "tool": Type.String({ maxLength: 256 }), "argv": Type.String({ maxLength: 1024 }), "action": Type.Union([Type.Literal("allow"), Type.Literal("require_approval"), Type.Literal("deny")]) }, { additionalProperties: false }))) }, { additionalProperties: false })), "loop": Type.Optional(Type.Object({ "repeat_threshold": Type.Optional(Type.Integer({ minimum: 1 })), "no_progress_steps": Type.Optional(Type.Integer({ minimum: 1 })) }, { additionalProperties: false })), "repair": Type.Optional(Type.Object({ "max_rounds": Type.Optional(Type.Integer({ minimum: 0 })), "escalate_after": Type.Optional(Type.Integer({ minimum: 0 })), "timeout_ms": Type.Optional(Type.Integer({ minimum: 100 })) }, { additionalProperties: false })), "verifier": Type.Optional(Type.Object({ "timeout_ms": Type.Optional(Type.Integer({ minimum: 100 })), "default_tier": Type.Optional(Type.Union([Type.Literal(0), Type.Literal(1), Type.Literal(2)])), "tier2_backend": Type.Optional(Type.String()) }, { additionalProperties: false })), "completion_gate": Type.Optional(Type.Object({ "enabled": Type.Optional(Type.Boolean()), "min_items": Type.Optional(Type.Integer({ minimum: 0 })), "scale_by_task_size": Type.Optional(Type.Boolean()), "allow_override": Type.Optional(Type.Boolean()) }, { additionalProperties: false })), "subagent": Type.Optional(Type.Object({ "max_depth": Type.Optional(Type.Integer({ minimum: 0 })), "max_fan_out": Type.Optional(Type.Integer({ minimum: 0 })), "isolation": Type.Optional(Type.Union([Type.Literal("worktree"), Type.Literal("shared")])), "budget_inherit": Type.Optional(Type.Union([Type.Literal("own"), Type.Literal("aggregate")])), "tree_budget_credits": Type.Optional(Type.Number({ minimum: 0 })) }, { additionalProperties: false })), "harness": Type.Optional(Type.Object({ "max_entries": Type.Optional(Type.Object({ "prompt": Type.Optional(Type.Integer()), "memory": Type.Optional(Type.Integer()), "skill": Type.Optional(Type.Integer()), "subagent": Type.Optional(Type.Integer()) }, { additionalProperties: false })), "max_chars_per_entry": Type.Optional(Type.Integer({ minimum: 1 })), "queue_max": Type.Optional(Type.Integer({ minimum: 1 })), "auto_refine": Type.Optional(Type.Object({ "enabled": Type.Optional(Type.Boolean()), "gate": Type.Optional(Type.Union([Type.Literal("verifier"), Type.Literal("review-model"), Type.Literal("human")])), "global_needs_human": Type.Optional(Type.Boolean()), "cooldown_turns": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false })) }, { additionalProperties: false })), "ext_ui": Type.Optional(Type.Object({ "input": Type.Optional(Type.Union([Type.Literal("prompt"), Type.Literal("decline")])), "unattended": Type.Optional(Type.Union([Type.Literal("decline"), Type.Literal("park")])) }, { additionalProperties: false })), "ext": Type.Optional(Type.Object({ "events_per_turn": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false })), "telemetry": Type.Optional(Type.Object({ "consent": Type.Optional(Type.Union([Type.Literal("DISABLED"), Type.Literal("LOCAL"), Type.Literal("ANON"), Type.Literal("FULL")])), "invariants": Type.Optional(Type.Union([Type.Boolean(), Type.Literal("strict")])), "timing": Type.Optional(Type.Boolean()) }, { additionalProperties: false })), "recovery": Type.Optional(Type.Object({ "unknown_child": Type.Optional(Type.Union([Type.Literal("model"), Type.Literal("park"), Type.Literal("human")])) }, { additionalProperties: false })), "quality": Type.Optional(Type.Object({ "deviation_max": Type.Optional(Type.Number({ minimum: 0, maximum: 1 })) }, { additionalProperties: false })), "media": Type.Optional(Type.Object({ "image_slot": Type.Optional(Type.String()), "video_slot": Type.Optional(Type.String()), "poll_ms": Type.Optional(Type.Integer({ minimum: 100 })) }, { additionalProperties: false })), "channel": Type.Optional(Type.Object({ "ttl_ms": Type.Optional(Type.Integer({ minimum: 0 })), "fingerprint_invalidation": Type.Optional(Type.Boolean()) }, { additionalProperties: false })), "cron": Type.Optional(Type.Object({ "tz": Type.Optional(Type.String({ maxLength: 64 })) }, { additionalProperties: false })), "locale": Type.Optional(Type.String({ pattern: "^[a-z]{2}(-[A-Z]{2})?$" })), "hooks": Type.Optional(Type.Array(Type.Ref("HookEvent"))), "skills_roots": Type.Optional(Type.Array(Type.String({ maxLength: 4096 }))), "operations": Type.Optional(Type.Object({ "remove": Type.Optional(Type.Array(Type.Intersect([Type.String(), Type.Not(Type.Union([Type.Literal("Inbox"), Type.Literal("Budget"), Type.Literal("Inference"), Type.Literal("Approval"), Type.Literal("ToolExecution"), Type.Literal("StopGate")]))]))), "replace": Type.Optional(Type.Record(Type.String(), Type.String())) }, { additionalProperties: false })), "deferred": Type.Optional(Type.Object({ "poll_ms": Type.Optional(Type.Integer({ minimum: 1 })) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "RouteTarget": Type.Object({ "route": Type.String({ maxLength: 128 }), "model": Type.String({ maxLength: 256 }), "fallbacks": Type.Optional(Type.Array(Type.Object({ "route": Type.String({ maxLength: 128 }), "model": Type.String({ maxLength: 256 }) }, { additionalProperties: false }))) }, { additionalProperties: false }),
  "HookEvent": Type.Union([Type.Literal("session_start"), Type.Literal("resources_discover"), Type.Literal("before_step"), Type.Literal("context"), Type.Literal("before_request"), Type.Literal("request_error"), Type.Literal("tool_call"), Type.Literal("tool_result"), Type.Literal("turn_stopping"), Type.Literal("approval_request"), Type.Literal("before_compact"), Type.Literal("compact"), Type.Literal("subagent_start"), Type.Literal("subagent_end"), Type.Literal("format_deviation"), Type.Literal("shutdown")]),
  "ThinkingLevel": Type.Union([Type.Literal("off"), Type.Literal("minimal"), Type.Literal("low"), Type.Literal("medium"), Type.Literal("high"), Type.Literal("xhigh"), Type.Literal("max")])
});
var RouteTable = PresetSchema.Import("RouteTable");
var PresetDoc = PresetSchema.Import("PresetDoc");
var RouteTarget = PresetSchema.Import("RouteTarget");
var HookEvent4 = PresetSchema.Import("HookEvent");
var ThinkingLevel2 = PresetSchema.Import("ThinkingLevel");

// ../protocol/gen/ts/profile.ts
var JsonValue8 = Type.Recursive((This) => Type.Union([Type.Null(), Type.Boolean(), Type.Number(), Type.String(), Type.Array(This), Type.Record(Type.String(), This)]));
var ProfileSchema = Type.Module({
  "Capability": Type.String({ pattern: "^[a-z][A-Za-z0-9.-]{0,63}$" }),
  "ApprovalMode": Type.Union([Type.Literal("manual"), Type.Literal("smart"), Type.Literal("off")]),
  "ApprovalProfile": Type.Object({ "mode": Type.Ref("ApprovalMode") }, { additionalProperties: false }),
  "SeamName": Type.Union([Type.Literal("approval"), Type.Literal("checkpoint"), Type.Literal("ledger"), Type.Literal("sandbox"), Type.Literal("verifier"), Type.Literal("repair"), Type.Literal("artifacts"), Type.Literal("principals"), Type.Literal("platform"), Type.Literal("harness")]),
  "PackageRef": Type.Object({ "id": Type.String({ pattern: "^(@[a-z0-9-]+/)?[a-z0-9][a-z0-9._-]{0,127}$" }), "source": Type.String({ maxLength: 1024 }), "version": Type.Optional(Type.String({ maxLength: 64 })), "enabled": Type.Optional(Type.Boolean()), "tombstone": Type.Optional(Type.Boolean()), "config": Type.Optional(Type.Record(Type.String(), JsonValue8)) }, { additionalProperties: false }),
  "SecretRef": Type.String({ pattern: "^secret://[a-z0-9-]+/[a-z0-9._-]+$" }),
  "Transport": Type.Object({ "kind": Type.Union([Type.Literal("stdio"), Type.Literal("unix"), Type.Literal("ws-tls")]), "path": Type.Optional(Type.String()), "listen": Type.Optional(Type.String()), "tls": Type.Optional(Type.Object({ "cert": Type.Optional(Type.Ref("SecretRef")), "key": Type.Optional(Type.Ref("SecretRef")) }, { additionalProperties: false })), "auth": Type.Optional(Type.Object({ "sourceAuthSecrets": Type.Optional(Type.Array(Type.Ref("SecretRef"), { maxItems: 2 })), "rotationGraceMs": Type.Optional(Type.Integer({ minimum: 0 })), "jwt": Type.Optional(Type.Object({ "issuer": Type.Optional(Type.String()), "jwks": Type.Optional(Type.String()), "secret": Type.Optional(Type.Ref("SecretRef")) }, { additionalProperties: false })) }, { additionalProperties: false })), "artifactsUrl": Type.Optional(Type.String({ maxLength: 2048 })) }, { additionalProperties: false }),
  "Policy": Type.Object({ "capabilityCeiling": Type.Optional(Type.Array(Type.Ref("Capability"))), "workspacePackages": Type.Optional(Type.Union([Type.Literal("deny"), Type.Literal("require-project-trust")])) }, { additionalProperties: false }),
  "ComputerUseAppIdentity": Type.Union([Type.Object({ "platform": Type.Literal("win32"), "executablePath": Type.String({ minLength: 1, maxLength: 4096 }), "publisherSha256": Type.String({ pattern: "^[a-f0-9]{64}$" }) }, { additionalProperties: false }), Type.Object({ "platform": Type.Literal("win32"), "executablePath": Type.String({ minLength: 1, maxLength: 4096 }), "packageFamilyName": Type.String({ minLength: 3, maxLength: 255 }) }, { additionalProperties: false }), Type.Object({ "platform": Type.Literal("darwin"), "bundleId": Type.String({ minLength: 1, maxLength: 255 }), "teamId": Type.String({ minLength: 1, maxLength: 64 }), "signatureSha256": Type.String({ pattern: "^[a-f0-9]{64}$" }) }, { additionalProperties: false }), Type.Object({ "platform": Type.Literal("linux"), "desktopId": Type.String({ minLength: 1, maxLength: 255 }), "executablePath": Type.String({ minLength: 1, maxLength: 4096 }), "installSource": Type.String({ minLength: 1, maxLength: 1024 }) }, { additionalProperties: false })]),
  "ComputerUseCapturePolicy": Type.Object({ "allowFullDesktop": Type.Optional(Type.Boolean()), "maxImageDimension": Type.Optional(Type.Integer({ minimum: 8, maximum: 1456 })), "maxBytesPerImage": Type.Optional(Type.Integer({ minimum: 1024, maximum: 4194304 })), "maxImagesPerResult": Type.Optional(Type.Integer({ minimum: 1, maximum: 1 })), "maxImagesPerMutationResult": Type.Optional(Type.Integer({ minimum: 1, maximum: 2 })), "maxImagesPerModelRequest": Type.Optional(Type.Integer({ minimum: 1, maximum: 4 })), "maxCapturesPerHour": Type.Optional(Type.Integer({ minimum: 1, maximum: 120 })) }, { additionalProperties: false }),
  "ComputerUseRetentionPolicy": Type.Object({ "maxRecentPerSession": Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })), "ttlMs": Type.Optional(Type.Integer({ minimum: 6e4, maximum: 6048e5 })), "gcIntervalMs": Type.Optional(Type.Integer({ minimum: 6e4, maximum: 36e5 })), "maxExtendedTtlMs": Type.Optional(Type.Integer({ minimum: 6e4, maximum: 6048e5 })), "globalMaxBytes": Type.Optional(Type.Integer({ minimum: 4194304, maximum: 1073741824 })) }, { additionalProperties: false }),
  "ComputerUseProfile": Type.Object({ "enabled": Type.Optional(Type.Boolean()), "appAccess": Type.Optional(Type.Union([Type.Literal("allowlist"), Type.Literal("all")])), "appAllowlist": Type.Optional(Type.Array(Type.Ref("ComputerUseAppIdentity"), { maxItems: 128 })), "capture": Type.Optional(Type.Ref("ComputerUseCapturePolicy")), "retention": Type.Optional(Type.Ref("ComputerUseRetentionPolicy")) }, { additionalProperties: false }),
  "ComputerUseRestriction": Type.Object({ "enabled": Type.Optional(Type.Literal(false)), "appAccess": Type.Optional(Type.Literal("allowlist")), "appAllowlist": Type.Optional(Type.Array(Type.Ref("ComputerUseAppIdentity"), { maxItems: 128 })), "capture": Type.Optional(Type.Ref("ComputerUseCapturePolicy")), "retention": Type.Optional(Type.Ref("ComputerUseRetentionPolicy")) }, { additionalProperties: false }),
  "ResolvedComputerUseProfile": Type.Object({ "enabled": Type.Boolean(), "appAccess": Type.Union([Type.Literal("allowlist"), Type.Literal("all")]), "appAllowlist": Type.Array(Type.Ref("ComputerUseAppIdentity"), { maxItems: 128 }), "capture": Type.Object({ "allowFullDesktop": Type.Boolean(), "maxImageDimension": Type.Integer({ minimum: 8, maximum: 1456 }), "maxBytesPerImage": Type.Integer({ minimum: 1024, maximum: 4194304 }), "maxImagesPerResult": Type.Integer({ minimum: 1, maximum: 1 }), "maxImagesPerMutationResult": Type.Integer({ minimum: 1, maximum: 2 }), "maxImagesPerModelRequest": Type.Integer({ minimum: 1, maximum: 4 }), "maxCapturesPerHour": Type.Integer({ minimum: 1, maximum: 120 }) }, { additionalProperties: false }), "retention": Type.Object({ "maxRecentPerSession": Type.Integer({ minimum: 1, maximum: 100 }), "ttlMs": Type.Integer({ minimum: 6e4, maximum: 6048e5 }), "gcIntervalMs": Type.Integer({ minimum: 6e4, maximum: 36e5 }), "maxExtendedTtlMs": Type.Integer({ minimum: 6e4, maximum: 6048e5 }), "globalMaxBytes": Type.Integer({ minimum: 4194304, maximum: 1073741824 }) }, { additionalProperties: false }) }, { additionalProperties: false }),
  "RuntimeProfileManifest": Type.Object({ "name": Type.String({ pattern: "^[a-z][a-z0-9-]{0,63}$" }), "schemaVersion": Type.Optional(Type.Integer({ minimum: 1 })), "extends": Type.Optional(Type.String({ maxLength: 64 })), "packages": Type.Optional(Type.Array(Type.Ref("PackageRef"))), "seams": Type.Optional(Type.Object({ "approval": Type.Optional(Type.String()), "checkpoint": Type.Optional(Type.String()), "ledger": Type.Optional(Type.String()), "sandbox": Type.Optional(Type.String()), "verifier": Type.Optional(Type.String()), "repair": Type.Optional(Type.String()), "artifacts": Type.Optional(Type.String()), "principals": Type.Optional(Type.String()), "platform": Type.Optional(Type.String()), "harness": Type.Optional(Type.String()) }, { additionalProperties: false })), "provider": Type.Optional(Type.Object({ "package": Type.String(), "adapters": Type.Optional(Type.Array(Type.String())), "routes": Type.Optional(Type.Array(Type.Ref("RouteDecl"))), "catalog": Type.Optional(Type.Object({ "include": Type.Array(Type.String()) }, { additionalProperties: false })), "contract": Type.Optional(Type.Object({ "dir": Type.String(), "contractIds": Type.Array(Type.String()) }, { additionalProperties: false })) }, { additionalProperties: false })), "adapters": Type.Optional(Type.Object({ "storage": Type.Optional(Type.String()), "fs": Type.Optional(Type.String()), "exec": Type.Optional(Type.String()), "platform": Type.Optional(Type.String()), "secrets": Type.Optional(Type.Object({ "kind": Type.Union([Type.Literal("file"), Type.Literal("env"), Type.Literal("vault")]), "path": Type.Optional(Type.String()) }, { additionalProperties: false })) }, { additionalProperties: false })), "transports": Type.Optional(Type.Array(Type.Ref("Transport"))), "dataDir": Type.Optional(Type.String()), "cacheDir": Type.Optional(Type.String()), "limits": Type.Optional(Type.Record(Type.String(), Type.Number())), "presets": Type.Optional(Type.Object({ "default": Type.Optional(Type.String()), "allowed": Type.Optional(Type.Array(Type.String())) }, { additionalProperties: false })), "policy": Type.Optional(Type.Ref("Policy")), "reconcile": Type.Optional(Type.Ref("ReconcilePolicy")), "approvals": Type.Optional(Type.Ref("ApprovalProfile")), "computerUse": Type.Optional(Type.Ref("ComputerUseProfile")), "extensionIsolation": Type.Optional(Type.Ref("ExtensionIsolationPolicy")), "commandHooks": Type.Optional(Type.Ref("CommandHooksPolicy")) }, { additionalProperties: false }),
  "ProfileFragment": Type.Object({ "approvals": Type.Optional(Type.Object({ "mode": Type.Union([Type.Literal("manual"), Type.Literal("smart")]) }, { additionalProperties: false })), "packages": Type.Optional(Type.Array(Type.Object({ "id": Type.String({ pattern: "^(@[a-z0-9-]+/)?[a-z0-9][a-z0-9._-]{0,127}$" }), "source": Type.String({ maxLength: 1024 }), "version": Type.Optional(Type.String({ maxLength: 64 })), "enabled": Type.Optional(Type.Boolean()), "tombstone": Type.Optional(Type.Boolean()) }, { additionalProperties: false }))), "policy": Type.Optional(Type.Object({ "capabilityCeiling": Type.Optional(Type.Array(Type.Ref("Capability"))) }, { additionalProperties: false })), "extensionIsolation": Type.Optional(Type.Ref("ExtensionIsolationRequest")), "computerUse": Type.Optional(Type.Ref("ComputerUseRestriction")) }, { additionalProperties: false }),
  "ManagedPolicy": Type.Object({ "version": Type.Integer({ minimum: 1 }), "policy": Type.Ref("Policy"), "packagesDeny": Type.Optional(Type.Array(Type.String())), "extensionIsolation": Type.Optional(Type.Ref("ExtensionIsolationPolicy")) }, { additionalProperties: false }),
  "ResolvedProfile": Type.Object({ "name": Type.String(), "schemaVersion": Type.Integer(), "chain": Type.Array(Type.String()), "packages": Type.Array(Type.Object({ "id": Type.String(), "version": Type.String(), "source": Type.String(), "integrity": Type.String(), "trust": Type.Union([Type.Literal("builtin"), Type.Literal("trusted")]), "enabled": Type.Boolean(), "provides": Type.Optional(Type.Array(Type.Ref("SeamName"))), "config": Type.Optional(Type.Record(Type.String(), JsonValue8)) }, { additionalProperties: false })), "seams": Type.Object({ "approval": Type.String(), "checkpoint": Type.String(), "ledger": Type.String(), "sandbox": Type.String(), "verifier": Type.String(), "repair": Type.String(), "artifacts": Type.String(), "principals": Type.String(), "platform": Type.String(), "harness": Type.String() }, { additionalProperties: false }), "provider": Type.Object({ "package": Type.String(), "adapters": Type.Array(Type.String()), "routes": Type.Optional(Type.Array(Type.Ref("RouteDecl"))), "catalog": Type.Optional(Type.Object({ "include": Type.Array(Type.String()) }, { additionalProperties: false })), "contract": Type.Optional(Type.Object({ "dir": Type.String(), "contractIds": Type.Array(Type.String()) }, { additionalProperties: false })) }, { additionalProperties: false }), "adapters": Type.Object({ "storage": Type.String(), "fs": Type.String(), "exec": Type.String(), "platform": Type.String(), "secrets": Type.Object({ "kind": Type.Union([Type.Literal("file"), Type.Literal("env"), Type.Literal("vault")]), "path": Type.Optional(Type.String()) }, { additionalProperties: false }) }, { additionalProperties: false }), "transports": Type.Array(Type.Ref("Transport")), "dataDir": Type.String(), "cacheDir": Type.String(), "limits": Type.Record(Type.String(), Type.Number()), "presets": Type.Object({ "default": Type.String(), "allowed": Type.Array(Type.String()) }, { additionalProperties: false }), "policy": Type.Object({ "capabilityCeiling": Type.Array(Type.Ref("Capability")), "workspacePackages": Type.Union([Type.Literal("deny"), Type.Literal("require-project-trust")]) }, { additionalProperties: false }), "reconcile": Type.Ref("ReconcilePolicy"), "approvals": Type.Optional(Type.Ref("ApprovalProfile")), "computerUse": Type.Ref("ResolvedComputerUseProfile"), "runtimes": Type.Optional(Type.Array(Type.Union([Type.Literal("python"), Type.Literal("typescript")]))), "hash": Type.String({ pattern: "^sha256-[a-f0-9]{64}$" }), "extensionIsolation": Type.Optional(Type.Ref("ExtensionIsolationPolicy")), "commandHooks": Type.Optional(Type.Ref("CommandHooksPolicy")) }, { additionalProperties: false }),
  "RouteDecl": Type.Object({ "route": Type.String({ pattern: "^[a-z0-9][a-z0-9-]{0,63}$" }), "api": Type.String({ maxLength: 64 }), "baseUrl": Type.String({ maxLength: 2048 }), "credentialRef": Type.Optional(Type.String({ pattern: "^secret://[A-Za-z0-9_./-]+$" })), "compat": Type.Optional(JsonValue8), "displayName": Type.Optional(Type.String({ maxLength: 128 })), "models": Type.Optional(Type.Array(Type.Ref("ModelRecord"))) }, { additionalProperties: false }),
  "DecodeRule": Type.Union([Type.Literal("reasoning_field"), Type.Literal("think_tag"), Type.Literal("qwen3_coder"), Type.Literal("anthropic_invoke"), Type.Literal("hermes_tool_call"), Type.Literal("inline_json"), Type.Literal("lenient_json")]),
  "ModelCost": Type.Object({ "input": Type.Number(), "output": Type.Number(), "cacheRead": Type.Number(), "cacheWrite": Type.Number() }, { additionalProperties: false }),
  "ModelRecord": Type.Object({ "id": Type.String({ maxLength: 256 }), "name": Type.String({ maxLength: 256 }), "api": Type.String({ maxLength: 64 }), "route": Type.String({ maxLength: 128 }), "baseUrl": Type.String({ maxLength: 2048 }), "reasoning": Type.Boolean(), "thinkingLevelMap": Type.Optional(Type.Record(Type.String(), Type.String())), "input": Type.Array(Type.Union([Type.Literal("text"), Type.Literal("image")])), "inputLimits": Type.Optional(Type.Ref("ModelInputLimits")), "cost": Type.Ref("ModelCost"), "contextWindow": Type.Integer({ minimum: 1 }), "defaultSettings": Type.Optional(Type.Ref("ModelSettings")), "maxTokens": Type.Integer({ minimum: 1 }), "samplingParams": Type.Optional(JsonValue8), "headers": Type.Optional(Type.Record(Type.String(), Type.String())), "compat": Type.Optional(JsonValue8), "toolCallFormats": Type.Array(Type.Union([Type.Literal("native"), Type.Ref("DecodeRule")])), "thinkingReplay": Type.Union([Type.Literal("native"), Type.Literal("drop"), Type.Literal("text")]), "contract_id": Type.Union([Type.String({ maxLength: 128 }), Type.Null()]), "slot": Type.Optional(Type.Ref("SlotName")) }, { additionalProperties: false }),
  "SlotName": Type.Union([Type.Literal("primary"), Type.Literal("escalation"), Type.Literal("fast"), Type.Literal("compaction"), Type.Literal("verifier"), Type.Literal("image"), Type.Literal("video")]),
  "ExtensionIsolationPolicy": Type.Object({ "backend": Type.Optional(Type.Union([Type.Literal("auto"), Type.Literal("seatbelt"), Type.Literal("bwrap"), Type.Literal("restricted-token")])), "extensions": Type.Record(Type.String({ pattern: "^(?=.{1,256}$)[a-z0-9-]+/[a-z0-9-]+$" }), Type.Union([Type.Literal("off"), Type.Literal("preferred"), Type.Literal("required")]), { additionalProperties: false, maxProperties: 128 }) }, { additionalProperties: false }),
  "ExtensionIsolationRequest": Type.Object({ "extensions": Type.Record(Type.String({ pattern: "^(?=.{1,256}$)[a-z0-9-]+/[a-z0-9-]+$" }), Type.Union([Type.Literal("preferred"), Type.Literal("required")]), { additionalProperties: false, maxProperties: 128 }) }, { additionalProperties: false }),
  "CommandHookGrant": Type.Object({ "source": Type.Union([Type.Literal("data"), Type.Literal("workspace")]), "configDigest": Type.String({ pattern: "^sha256-[0-9a-f]{64}$" }), "workspaceRoot": Type.String({ minLength: 1, maxLength: 32767, pattern: "^(?:/|[A-Za-z]:[\\\\/]|\\\\\\\\(?![.?][\\\\/])[^\\\\/]+[\\\\/][^\\\\/]+(?:[\\\\/]|$))[^\\u0000-\\u001f\\u007f]*$" }) }, { additionalProperties: false }),
  "CommandHooksPolicy": Type.Object({ "trustedUnconfined": Type.Array(Type.Ref("CommandHookGrant"), { maxItems: 128, uniqueItems: true }) }, { additionalProperties: false }),
  "ReconcilePoint": Type.Union([Type.Literal("immediate"), Type.Literal("turn"), Type.Literal("step")]),
  "ReconcilePolicy": Type.Union([Type.Object({ "point": Type.Literal("immediate") }, { additionalProperties: false }), Type.Object({ "point": Type.Union([Type.Literal("turn"), Type.Literal("step")]), "maxWaitMs": Type.Optional(Type.Integer({ minimum: 0, maximum: 2147483647 })) }, { additionalProperties: false })]),
  "ModelInputLimits": Type.Object({ "maxRequestBytes": Type.Optional(Type.Integer({ minimum: 1 })), "images": Type.Optional(Type.Object({ "maxPerMessage": Type.Optional(Type.Integer({ minimum: 1 })), "maxPerRequest": Type.Optional(Type.Integer({ minimum: 1 })), "resize": Type.Optional(Type.Object({ "maxWidth": Type.Optional(Type.Integer({ minimum: 1 })), "maxHeight": Type.Optional(Type.Integer({ minimum: 1 })), "maxBytes": Type.Optional(Type.Integer({ minimum: 1 })), "jpegQuality": Type.Optional(Type.Number({ minimum: 1, maximum: 100 })) }, { additionalProperties: false })) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "ModelSettings": Type.Object({ "thinking": Type.Optional(Type.Ref("ThinkingLevel")), "contextWindow": Type.Optional(Type.Integer({ minimum: 1, maximum: 9007199254740991 })) }, { additionalProperties: false }),
  "ThinkingLevel": Type.Union([Type.Literal("off"), Type.Literal("minimal"), Type.Literal("low"), Type.Literal("medium"), Type.Literal("high"), Type.Literal("xhigh"), Type.Literal("max")])
});
var Capability2 = ProfileSchema.Import("Capability");
var ApprovalMode = ProfileSchema.Import("ApprovalMode");
var ApprovalProfile = ProfileSchema.Import("ApprovalProfile");
var SeamName4 = ProfileSchema.Import("SeamName");
var PackageRef = ProfileSchema.Import("PackageRef");
var SecretRef = ProfileSchema.Import("SecretRef");
var Transport = ProfileSchema.Import("Transport");
var Policy = ProfileSchema.Import("Policy");
var ComputerUseAppIdentity = ProfileSchema.Import("ComputerUseAppIdentity");
var ComputerUseCapturePolicy = ProfileSchema.Import("ComputerUseCapturePolicy");
var ComputerUseRetentionPolicy = ProfileSchema.Import("ComputerUseRetentionPolicy");
var ComputerUseProfile = ProfileSchema.Import("ComputerUseProfile");
var ComputerUseRestriction = ProfileSchema.Import("ComputerUseRestriction");
var ResolvedComputerUseProfile = ProfileSchema.Import("ResolvedComputerUseProfile");
var RuntimeProfileManifest = ProfileSchema.Import("RuntimeProfileManifest");
var ProfileFragment = ProfileSchema.Import("ProfileFragment");
var ManagedPolicy = ProfileSchema.Import("ManagedPolicy");
var ResolvedProfile = ProfileSchema.Import("ResolvedProfile");
var RouteDecl = ProfileSchema.Import("RouteDecl");
var DecodeRule = ProfileSchema.Import("DecodeRule");
var ModelCost = ProfileSchema.Import("ModelCost");
var ModelRecord = ProfileSchema.Import("ModelRecord");
var SlotName = ProfileSchema.Import("SlotName");
var ExtensionIsolationPolicy = ProfileSchema.Import("ExtensionIsolationPolicy");
var ExtensionIsolationRequest = ProfileSchema.Import("ExtensionIsolationRequest");
var CommandHookGrant = ProfileSchema.Import("CommandHookGrant");
var CommandHooksPolicy = ProfileSchema.Import("CommandHooksPolicy");
var ReconcilePoint = ProfileSchema.Import("ReconcilePoint");
var ReconcilePolicy = ProfileSchema.Import("ReconcilePolicy");
var ModelInputLimits = ProfileSchema.Import("ModelInputLimits");
var ModelSettings2 = ProfileSchema.Import("ModelSettings");
var ThinkingLevel3 = ProfileSchema.Import("ThinkingLevel");

// ../protocol-validation/src/json-data.ts
var DEFAULT_JSON_DATA_MAX_BYTES = 65536;
var encoder = new TextEncoder();
function inspectJsonData(value, maxBytes = DEFAULT_JSON_DATA_MAX_BYTES) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) return { ok: false, reason: "invalid byte limit" };
  const active = /* @__PURE__ */ new Set();
  const reject = (reason) => {
    throw new Error(reason);
  };
  const walk = (v, depth) => {
    if (depth > 32) return reject("nesting exceeds 32");
    if (v === null || typeof v === "string" || typeof v === "boolean") return v;
    if (typeof v === "number") return Number.isFinite(v) ? v : reject("non-finite number");
    if (typeof v !== "object") return reject(`unsupported ${typeof v}`);
    if (active.has(v)) return reject("cycle");
    if (JSON.isRawJSON?.(v))
      return reject("raw JSON");
    const array = Array.isArray(v), proto = Object.getPrototypeOf(v);
    if (array ? proto !== Array.prototype : proto !== null && proto !== Object.prototype)
      return reject("non-plain object");
    const descriptors = Object.getOwnPropertyDescriptors(v);
    if (Object.getOwnPropertySymbols(v).length) return reject("symbol key");
    if (array && (Object.keys(descriptors).length !== v.length + 1 || Object.keys(descriptors).filter((k) => k !== "length").some((k, i) => k !== String(i))))
      return reject("sparse or decorated array");
    active.add(v);
    const result = array ? [] : /* @__PURE__ */ Object.create(null);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (array && key === "length") continue;
      if (!descriptor.enumerable || !("value" in descriptor)) return reject("non-data property");
      const child = walk(descriptor.value, depth + 1);
      Object.defineProperty(result, key, {
        value: child,
        enumerable: true,
        writable: true,
        configurable: true
      });
    }
    active.delete(v);
    return result;
  };
  try {
    const snapshot = walk(value, 0);
    const bytes = encoder.encode(JSON.stringify(snapshot)).byteLength;
    return bytes <= maxBytes ? { ok: true, bytes, value: snapshot } : { ok: false, reason: `size ${bytes} > ${maxBytes}` };
  } catch {
    return { ok: false, reason: "payload is not bounded JSON data" };
  }
}

// ../protocol/gen/ts/surface.ts
var SurfaceConfigValue = Type.Recursive((This) => Type.Union([Type.Null(), Type.Boolean(), Type.Number(), Type.String({ maxLength: 16384, pattern: "^(?!secret://)" }), Type.Array(This, { maxItems: 256 }), Type.Record(Type.String({ pattern: "^(?!(?:[A-Za-z0-9]+[_.-])*(?:[sS][eE][cC][rR][eE][tT]|[sS][eE][cC][rR][eE][tT][sS]|[tT][oO][kK][eE][nN]|[tT][oO][kK][eE][nN][sS]|[pP][aA][sS][sS][wW][oO][rR][dD]|[cC][rR][eE][dD][eE][nN][tT][iI][aA][lL]|[cC][rR][eE][dD][eE][nN][tT][iI][aA][lL][sS]|[aA][uU][tT][hH][oO][rR][iI][zZ][aA][tT][iI][oO][nN]|[aA][pP][iI][_.-]?[kK][eE][yY]|[pP][rR][iI][vV][aA][tT][eE][_.-]?[kK][eE][yY]|[aA][cC][cC][eE][sS][sS][_.-]?[tT][oO][kK][eE][nN]|[rR][eE][fF][rR][eE][sS][hH][_.-]?[tT][oO][kK][eE][nN]|[cC][lL][iI][eE][nN][tT][_.-]?[sS][eE][cC][rR][eE][tT])$)[A-Za-z][A-Za-z0-9_.-]{0,63}$" }), This, { additionalProperties: false })]));
var SurfaceSchema = Type.Module({
  "SurfaceServiceGrant": Type.Object({ "extension": Type.String({ minLength: 1, maxLength: 256, pattern: "^[a-z0-9-]+/[a-z0-9-]+$" }), "name": Type.String({ minLength: 1, maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "range": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:(?:>=|<=|>|<|=|\\^|~)?(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|\\^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|(?:0|[1-9][0-9]*)(?:\\.(?:0|[1-9][0-9]*))?\\.(?:x|\\*)|\\*)(?: +(?:(?:>=|<=|>|<|=|\\^|~)?(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|\\^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|(?:0|[1-9][0-9]*)(?:\\.(?:0|[1-9][0-9]*))?\\.(?:x|\\*)|\\*))*$" }) }, { additionalProperties: false }),
  "SurfaceArtifact": Type.Union([Type.Object({ "kind": Type.Literal("node"), "entry": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./dist/(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+)*\\.(?:js|mjs|cjs)$" }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("oci"), "image": Type.String({ minLength: 1, maxLength: 512, pattern: "^[a-z0-9]+(?:[.-][a-z0-9]+)*(?::[0-9]{1,5})?/(?:[a-z0-9]+(?:[._-][a-z0-9]+)*/)*[a-z0-9]+(?:[._-][a-z0-9]+)*@sha256:[a-f0-9]{64}$" }) }, { additionalProperties: false })]),
  "SurfaceDescriptor": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9-]{0,63}$" }), "apiRange": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:(?:>=|<=|>|<|=|\\^|~)?(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|\\^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|(?:0|[1-9][0-9]*)(?:\\.(?:0|[1-9][0-9]*))?\\.(?:x|\\*)|\\*)(?: +(?:(?:>=|<=|>|<|=|\\^|~)?(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|\\^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|(?:0|[1-9][0-9]*)(?:\\.(?:0|[1-9][0-9]*))?\\.(?:x|\\*)|\\*))*$" }), "artifact": Type.Ref("SurfaceArtifact"), "healthPath": Type.String({ minLength: 1, maxLength: 256, pattern: "^/(?:[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*)?$" }), "requires": Type.Object({ "services": Type.Array(Type.Ref("SurfaceServiceGrant"), { maxItems: 64, uniqueItems: true }) }, { additionalProperties: false }) }, { additionalProperties: false }),
  "SurfaceInstance": Type.Object({ "package": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "surfaceId": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9-]{0,63}$" }), "mount": Type.String({ minLength: 1, maxLength: 256, pattern: "^/(?!_agnes(?:/|$))[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*$" }), "sourceId": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9-]{0,63}$" }), "config": Type.Record(Type.String({ pattern: "^(?!(?:[A-Za-z0-9]+[_.-])*(?:[sS][eE][cC][rR][eE][tT]|[sS][eE][cC][rR][eE][tT][sS]|[tT][oO][kK][eE][nN]|[tT][oO][kK][eE][nN][sS]|[pP][aA][sS][sS][wW][oO][rR][dD]|[cC][rR][eE][dD][eE][nN][tT][iI][aA][lL]|[cC][rR][eE][dD][eE][nN][tT][iI][aA][lL][sS]|[aA][uU][tT][hH][oO][rR][iI][zZ][aA][tT][iI][oO][nN]|[aA][pP][iI][_.-]?[kK][eE][yY]|[pP][rR][iI][vV][aA][tT][eE][_.-]?[kK][eE][yY]|[aA][cC][cC][eE][sS][sS][_.-]?[tT][oO][kK][eE][nN]|[rR][eE][fF][rR][eE][sS][hH][_.-]?[tT][oO][kK][eE][nN]|[cC][lL][iI][eE][nN][tT][_.-]?[sS][eE][cC][rR][eE][tT])$)[A-Za-z][A-Za-z0-9_.-]{0,63}$" }), SurfaceConfigValue, { additionalProperties: false }), "secrets": Type.Record(Type.String({ pattern: "^[A-Za-z][A-Za-z0-9_-]{0,63}$" }), Type.Ref("SecretRef"), { additionalProperties: false }), "grants": Type.Array(Type.Ref("SurfaceServiceGrant"), { maxItems: 64, uniqueItems: true }) }, { additionalProperties: false }),
  "SurfacePackageMetadata": Type.Object({ "surfaces": Type.Array(Type.Ref("SurfaceDescriptor"), { maxItems: 64, uniqueItems: true }) }, { additionalProperties: false }),
  "SecretRef": Type.String({ pattern: "^secret://[a-z0-9-]+/[a-z0-9._-]+$" })
});
var SurfaceServiceGrant3 = SurfaceSchema.Import("SurfaceServiceGrant");
var SurfaceArtifact3 = SurfaceSchema.Import("SurfaceArtifact");
var SurfaceDescriptor3 = SurfaceSchema.Import("SurfaceDescriptor");
var SurfaceInstance = SurfaceSchema.Import("SurfaceInstance");
var SurfacePackageMetadata = SurfaceSchema.Import("SurfacePackageMetadata");
var SecretRef2 = SurfaceSchema.Import("SecretRef");

// ../protocol/src/configs.ts
var BRIDGE_ERRORS = Object.freeze(X_AGNES_BRIDGE_ERRORS);

// ../protocol/gen/ts/hooks.ts
var hooks_exports = {};
__export(hooks_exports, {
  Actor: () => Actor3,
  ApprovalRequest: () => ApprovalRequest,
  ApprovalRequestPayload: () => ApprovalRequestPayload,
  ApprovalRequestReturn: () => ApprovalRequestReturn,
  BeforeCompactPayload: () => BeforeCompactPayload,
  BeforeCompactReturn: () => BeforeCompactReturn,
  BeforeRequestPayload: () => BeforeRequestPayload,
  BeforeRequestReturn: () => BeforeRequestReturn,
  BeforeStepPayload: () => BeforeStepPayload,
  BeforeStepReturn: () => BeforeStepReturn,
  CompactPayload: () => CompactPayload,
  CompactReturn: () => CompactReturn,
  CompactionPlan: () => CompactionPlan,
  ContentBlock: () => ContentBlock3,
  ContextPayload: () => ContextPayload,
  ContextReturn: () => ContextReturn,
  ExecutionDomain: () => ExecutionDomain2,
  FormatDeviationPayload: () => FormatDeviationPayload,
  FormatDeviationReturn: () => FormatDeviationReturn,
  HookEvent: () => HookEvent5,
  HooksSchema: () => HooksSchema,
  JsonValue: () => JsonValue9,
  PlanItems: () => PlanItems2,
  PromptSection: () => PromptSection,
  RequestErrorPayload: () => RequestErrorPayload,
  RequestErrorReturn: () => RequestErrorReturn,
  ResolvedToolCallPolicy: () => ResolvedToolCallPolicy2,
  ResourceEntry: () => ResourceEntry,
  ResourcesDiscoverPayload: () => ResourcesDiscoverPayload,
  ResourcesDiscoverReturn: () => ResourcesDiscoverReturn,
  SessionStartPayload: () => SessionStartPayload,
  SessionStartReturn: () => SessionStartReturn,
  ShutdownPayload: () => ShutdownPayload,
  ShutdownReturn: () => ShutdownReturn,
  SubagentEndPayload: () => SubagentEndPayload,
  SubagentEndReturn: () => SubagentEndReturn,
  SubagentStartPayload: () => SubagentStartPayload,
  SubagentStartReturn: () => SubagentStartReturn,
  SurfaceDigest: () => SurfaceDigest,
  ToolCallPayload: () => ToolCallPayload,
  ToolCallReturn: () => ToolCallReturn,
  ToolMeta: () => ToolMeta2,
  ToolResult: () => ToolResult2,
  ToolResultPayload: () => ToolResultPayload,
  ToolResultReturn: () => ToolResultReturn,
  TurnStoppingPayload: () => TurnStoppingPayload,
  TurnStoppingReturn: () => TurnStoppingReturn,
  Verdict: () => Verdict2,
  X_AGNES_HOOK_IO: () => X_AGNES_HOOK_IO,
  X_AGNES_HOOK_TABLE: () => X_AGNES_HOOK_TABLE
});
var JsonValue9 = Type.Recursive((This) => Type.Union([Type.Null(), Type.Boolean(), Type.Number(), Type.String(), Type.Array(This), Type.Record(Type.String(), This)]));
var HooksSchema = Type.Module({
  "Actor": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 256 }), "org": Type.String({ maxLength: 256 }), "role": Type.String({ maxLength: 64 }), "deptPath": Type.Array(Type.String({ maxLength: 256 })), "attrs": Type.Record(Type.String(), Type.String({ maxLength: 1024 })) }, { additionalProperties: false }),
  "ContentBlock": Type.Union([Type.Object({ "type": Type.Literal("text"), "text": Type.String({ maxLength: 1048576 }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("image"), "data": Type.String(), "mimeType": Type.String({ maxLength: 128 }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("file"), "data": Type.String(), "mimeType": Type.String({ minLength: 1, maxLength: 128 }), "name": Type.String({ minLength: 1, maxLength: 256 }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("resource_link"), "uri": Type.String({ maxLength: 4096 }), "name": Type.Optional(Type.String({ maxLength: 256 })), "mimeType": Type.Optional(Type.String({ maxLength: 128 })) }, { additionalProperties: false })]),
  "ToolResult": Type.Object({ "toolUseId": Type.String({ maxLength: 128 }), "content": Type.Array(Type.Ref("ContentBlock")), "structured": Type.Optional(JsonValue9), "isError": Type.Boolean(), "code": Type.Optional(Type.String({ maxLength: 64 })), "enforcement": Type.Object({ "level": Type.Union([Type.Literal("full"), Type.Literal("partial"), Type.Literal("none")]), "scope": Type.Array(Type.Union([Type.Literal("file"), Type.Literal("network"), Type.Literal("process")])) }, { additionalProperties: false }), "authz": Type.Object({ "decisionId": Type.String({ maxLength: 128 }) }, { additionalProperties: false }), "partial": Type.Optional(Type.Boolean()), "cancelledBy": Type.Optional(Type.Ref("Actor")), "interrupted": Type.Optional(Type.Boolean()), "transformedBy": Type.Optional(Type.String({ maxLength: 128 })) }, { additionalProperties: false }),
  "PlanItems": Type.Union([Type.Null(), Type.Object({ "items": Type.Array(Type.Object({ "id": Type.String({ maxLength: 64 }), "text": Type.String({ maxLength: 2048 }), "status": Type.Union([Type.Literal("todo"), Type.Literal("doing"), Type.Literal("done"), Type.Literal("blocked")]), "check": Type.Optional(Type.String({ maxLength: 2048 })) }, { additionalProperties: false })), "customInstructions": Type.Optional(Type.String({ maxLength: 8192 })) }, { additionalProperties: false })]),
  "Verdict": Type.Object({ "outcome": Type.Union([Type.Literal("pass"), Type.Literal("fail"), Type.Literal("needs_revision"), Type.Literal("unavailable")]), "reasons": Type.Array(Type.String({ maxLength: 1024 })) }, { additionalProperties: false }),
  "ToolMeta": Type.Object({ "isReadOnly": Type.Boolean(), "isDestructive": Type.Boolean(), "isConcurrencySafe": Type.Boolean(), "isOpenWorld": Type.Boolean(), "replay": Type.Union([Type.Literal("safe"), Type.Literal("never"), Type.Literal("idempotent")]), "costHint": Type.Union([Type.Null(), Type.Object({ "credits": Type.Optional(Type.Number({ minimum: 0 })), "wallMs": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false })]), "deferLoading": Type.Union([Type.Boolean(), Type.Null()]), "requiresApproval": Type.Union([Type.Union([Type.Literal("never"), Type.Literal("destructive"), Type.Literal("always")]), Type.Null()]), "returnsImages": Type.Optional(Type.Boolean()) }, { additionalProperties: false }),
  "ResolvedToolCallPolicy": Type.Object({ "isReadOnly": Type.Boolean(), "isDestructive": Type.Boolean(), "isConcurrencySafe": Type.Optional(Type.Boolean()), "isOpenWorld": Type.Optional(Type.Boolean()), "returnsImages": Type.Optional(Type.Literal(true)), "replay": Type.Union([Type.Literal("safe"), Type.Literal("never"), Type.Literal("idempotent")]), "requiresApproval": Type.Union([Type.Literal("never"), Type.Literal("destructive"), Type.Literal("always")]), "approvalScopes": Type.Array(Type.String({ pattern: "^[A-Za-z][A-Za-z0-9_.:-]{0,63}$" }), { maxItems: 16, uniqueItems: true }), "policyVersion": Type.String({ pattern: "^[A-Za-z][A-Za-z0-9_.:-]{0,63}$" }) }, { additionalProperties: false }),
  "ExecutionDomain": Type.Union([Type.Literal("workspace"), Type.Literal("host-computer-use")]),
  "HookEvent": Type.Union([Type.Literal("session_start"), Type.Literal("resources_discover"), Type.Literal("before_step"), Type.Literal("context"), Type.Literal("before_request"), Type.Literal("request_error"), Type.Literal("tool_call"), Type.Literal("tool_result"), Type.Literal("turn_stopping"), Type.Literal("approval_request"), Type.Literal("before_compact"), Type.Literal("compact"), Type.Literal("subagent_start"), Type.Literal("subagent_end"), Type.Literal("format_deviation"), Type.Literal("shutdown")]),
  "PromptSection": Type.Object({ "id": Type.String({ maxLength: 64 }), "order": Type.Integer({ minimum: 0 }), "text": Type.String({ maxLength: 65536 }) }, { additionalProperties: false }),
  "ResourceEntry": Type.Object({ "id": Type.String({ maxLength: 128 }), "kind": Type.Union([Type.Literal("skill"), Type.Literal("mcp"), Type.Literal("kb"), Type.Literal("datasource"), Type.Literal("model")]), "name": Type.String({ maxLength: 256 }), "description": Type.String({ maxLength: 2048 }), "schema": Type.Optional(JsonValue9) }, { additionalProperties: false }),
  "SurfaceDigest": Type.Object({ "nodes": Type.Integer({ minimum: 0 }), "tokensEstimate": Type.Integer({ minimum: 0 }) }, { additionalProperties: false }),
  "ApprovalRequest": Type.Object({ "tool": Type.String({ maxLength: 64 }), "argvHash": Type.String({ pattern: "^[0-9a-f]{64}$" }), "risk": Type.Union([Type.Literal("destructive"), Type.Literal("always"), Type.Literal("budget"), Type.Literal("unknown")]), "actor": Type.Ref("Actor"), "context": Type.String({ maxLength: 4096 }) }, { additionalProperties: false }),
  "CompactionPlan": Type.Object({ "keepFromSeq": Type.Integer({ minimum: 1 }), "summarizeRange": Type.Array(Type.Integer({ minimum: 1 }), { minItems: 2, maxItems: 2 }), "turnPrefixRange": Type.Optional(Type.Array(Type.Integer({ minimum: 1 }), { minItems: 2, maxItems: 2 })), "previousSummarySeq": Type.Optional(Type.Integer({ minimum: 1 })), "prompts": Type.Object({ "system": Type.String(), "history": Type.String(), "prefix": Type.Optional(Type.String()) }, { additionalProperties: false }), "maxTokens": Type.Integer({ minimum: 1 }), "details": Type.Object({ "readFiles": Type.Array(Type.String()), "modifiedFiles": Type.Array(Type.String()) }, { additionalProperties: false }), "customInstructions": Type.Optional(Type.String({ maxLength: 8192 })) }, { additionalProperties: false }),
  "SessionStartPayload": Type.Object({ "reason": Type.Union([Type.Literal("new"), Type.Literal("resume"), Type.Literal("fork")]), "preset": Type.String(), "cwd": Type.String(), "parent": Type.Optional(Type.String()) }, { additionalProperties: false }),
  "SessionStartReturn": Type.Null(),
  "ResourcesDiscoverPayload": Type.Object({ "actor": Type.Ref("Actor"), "cwd": Type.String(), "registered": Type.Array(Type.Ref("ResourceEntry")) }, { additionalProperties: false }),
  "ResourcesDiscoverReturn": Type.Object({ "resources": Type.Optional(Type.Array(Type.Ref("ResourceEntry"))), "additionalContext": Type.Optional(Type.String({ maxLength: 8192 })) }, { additionalProperties: false }),
  "BeforeStepPayload": Type.Object({ "turn": Type.Integer(), "step": Type.Integer(), "depth": Type.Integer({ minimum: 0 }), "budget": Type.Object({ "remaining": Type.Union([Type.Number(), Type.Null()]), "cap": Type.Union([Type.Number(), Type.Null()]) }, { additionalProperties: false }) }, { additionalProperties: false }),
  "BeforeStepReturn": Type.Object({ "block": Type.Optional(Type.Boolean()), "reason": Type.Optional(Type.String({ maxLength: 1024 })) }, { additionalProperties: false }),
  "ContextPayload": Type.Object({ "sections": Type.Array(Type.Ref("PromptSection")), "surfaceDigest": Type.Ref("SurfaceDigest") }, { additionalProperties: false }),
  "ContextReturn": Type.Object({ "sections": Type.Optional(Type.Array(Type.Ref("PromptSection"))), "additionalContext": Type.Optional(Type.String({ maxLength: 8192 })) }, { additionalProperties: false }),
  "BeforeRequestPayload": Type.Object({ "request": JsonValue9, "slot": Type.String(), "model": Type.String(), "attempt": Type.Integer({ minimum: 1 }) }, { additionalProperties: false }),
  "BeforeRequestReturn": Type.Object({ "patch": Type.Optional(Type.Object({ "samplingParams": Type.Optional(Type.Record(Type.String(), JsonValue9)), "maxTokens": Type.Optional(Type.Integer({ minimum: 1 })), "metadata": Type.Optional(Type.Record(Type.String(), JsonValue9)) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "RequestErrorPayload": Type.Object({ "code": Type.String(), "message": Type.String(), "attempt": Type.Integer(), "retryable": Type.Boolean() }, { additionalProperties: false }),
  "RequestErrorReturn": Type.Null(),
  "ToolCallPayload": Type.Intersect([Type.Object({ "toolUseId": Type.String(), "name": Type.String(), "args": JsonValue9, "meta": Type.Ref("ToolMeta"), "actor": Type.Ref("Actor"), "taint": Type.Boolean(), "resolvedPolicy": Type.Optional(Type.Ref("ResolvedToolCallPolicy")), "executionDomain": Type.Optional(Type.Ref("ExecutionDomain")), "definitionFingerprint": Type.Optional(Type.String({ pattern: "^[0-9a-f]{64}$" })), "policyHash": Type.Optional(Type.String({ pattern: "^[0-9a-f]{64}$" })) }, { additionalProperties: false }), Type.Union([Type.Not(Type.Union([Type.Object({ "resolvedPolicy": Type.Unknown() }), Type.Object({ "executionDomain": Type.Unknown() }), Type.Object({ "definitionFingerprint": Type.Unknown() }), Type.Object({ "policyHash": Type.Unknown() })])), Type.Object({ "resolvedPolicy": Type.Unknown(), "executionDomain": Type.Unknown(), "definitionFingerprint": Type.Unknown(), "policyHash": Type.Unknown() })])]),
  "ToolCallReturn": Type.Union([Type.Object({ "allow": Type.Literal(true) }, { additionalProperties: false }), Type.Object({ "allow": Type.Literal(false), "reason": Type.String({ maxLength: 1024 }) }, { additionalProperties: false })]),
  "ToolResultPayload": Type.Object({ "toolUseId": Type.String(), "name": Type.String(), "args": JsonValue9, "result": Type.Ref("ToolResult"), "enforcement": Type.Object({ "level": Type.Union([Type.Literal("full"), Type.Literal("partial"), Type.Literal("none")]), "scope": Type.Array(Type.Union([Type.Literal("file"), Type.Literal("network"), Type.Literal("process")])) }, { additionalProperties: false }) }, { additionalProperties: false }),
  "ToolResultReturn": Type.Object({ "result": Type.Optional(Type.Ref("ToolResult")) }, { additionalProperties: false }),
  "TurnStoppingPayload": Type.Object({ "turn": Type.Integer(), "step": Type.Integer(), "proposedReason": Type.Union([Type.Literal("completed"), Type.Literal("aborted"), Type.Literal("error"), Type.Literal("parked"), Type.Literal("blocked"), Type.Literal("budget"), Type.Literal("max_steps"), Type.Literal("interrupted")]), "plan": Type.Optional(Type.Ref("PlanItems")), "verifier": Type.Optional(Type.Ref("Verdict")) }, { additionalProperties: false }),
  "TurnStoppingReturn": Type.Union([Type.Object({ "action": Type.Literal("stop") }, { additionalProperties: false }), Type.Object({ "action": Type.Literal("continue"), "note": Type.String({ maxLength: 2048 }) }, { additionalProperties: false })]),
  "ApprovalRequestPayload": Type.Object({ "request": Type.Ref("ApprovalRequest") }, { additionalProperties: false }),
  "ApprovalRequestReturn": Type.Object({ "request": Type.Optional(Type.Object({ "risk": Type.Optional(Type.Union([Type.Literal("destructive"), Type.Literal("always"), Type.Literal("budget"), Type.Literal("unknown")])), "context": Type.Optional(Type.String({ maxLength: 4096 })) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "BeforeCompactPayload": Type.Object({ "contextTokens": Type.Integer({ minimum: 0 }), "contextWindow": Type.Integer({ minimum: 1 }), "reserveTokens": Type.Integer({ minimum: 1 }), "reason": Type.Union([Type.Literal("threshold"), Type.Literal("overflow"), Type.Literal("requested")]), "previousSummarySeq": Type.Optional(Type.Integer({ minimum: 1 })), "customInstructions": Type.Optional(Type.String({ maxLength: 8192 })) }, { additionalProperties: false }),
  "BeforeCompactReturn": Type.Union([Type.Null(), Type.Ref("CompactionPlan")]),
  "CompactPayload": Type.Object({ "replaceSeq": Type.Integer({ minimum: 1 }), "range": Type.Array(Type.Integer(), { minItems: 2, maxItems: 2 }), "tokensBefore": Type.Integer({ minimum: 0 }), "tokensAfter": Type.Integer({ minimum: 0 }) }, { additionalProperties: false }),
  "CompactReturn": Type.Null(),
  "SubagentStartPayload": Type.Object({ "childKey": Type.String(), "kind": Type.Union([Type.Literal("fork"), Type.Literal("spawn")]), "budget": Type.Union([Type.Number(), Type.Null()]) }, { additionalProperties: false }),
  "SubagentStartReturn": Type.Null(),
  "SubagentEndPayload": Type.Object({ "childKey": Type.String(), "outcome": Type.Union([Type.Literal("completed"), Type.Literal("aborted"), Type.Literal("error"), Type.Literal("parked"), Type.Literal("blocked"), Type.Literal("budget"), Type.Literal("max_steps"), Type.Literal("interrupted")]), "credits": Type.Number({ minimum: 0 }) }, { additionalProperties: false }),
  "SubagentEndReturn": Type.Null(),
  "FormatDeviationPayload": Type.Object({ "rule": Type.String(), "model": Type.String(), "sampleHash": Type.String({ pattern: "^[0-9a-f]{64}$" }) }, { additionalProperties: false }),
  "FormatDeviationReturn": Type.Null(),
  "ShutdownPayload": Type.Object({ "reason": Type.Union([Type.Literal("close"), Type.Literal("revoke"), Type.Literal("reload")]) }, { additionalProperties: false }),
  "ShutdownReturn": Type.Null()
});
var Actor3 = HooksSchema.Import("Actor");
var ContentBlock3 = HooksSchema.Import("ContentBlock");
var ToolResult2 = HooksSchema.Import("ToolResult");
var PlanItems2 = HooksSchema.Import("PlanItems");
var Verdict2 = HooksSchema.Import("Verdict");
var ToolMeta2 = HooksSchema.Import("ToolMeta");
var ResolvedToolCallPolicy2 = HooksSchema.Import("ResolvedToolCallPolicy");
var ExecutionDomain2 = HooksSchema.Import("ExecutionDomain");
var HookEvent5 = HooksSchema.Import("HookEvent");
var PromptSection = HooksSchema.Import("PromptSection");
var ResourceEntry = HooksSchema.Import("ResourceEntry");
var SurfaceDigest = HooksSchema.Import("SurfaceDigest");
var ApprovalRequest = HooksSchema.Import("ApprovalRequest");
var CompactionPlan = HooksSchema.Import("CompactionPlan");
var SessionStartPayload = HooksSchema.Import("SessionStartPayload");
var SessionStartReturn = HooksSchema.Import("SessionStartReturn");
var ResourcesDiscoverPayload = HooksSchema.Import("ResourcesDiscoverPayload");
var ResourcesDiscoverReturn = HooksSchema.Import("ResourcesDiscoverReturn");
var BeforeStepPayload = HooksSchema.Import("BeforeStepPayload");
var BeforeStepReturn = HooksSchema.Import("BeforeStepReturn");
var ContextPayload = HooksSchema.Import("ContextPayload");
var ContextReturn = HooksSchema.Import("ContextReturn");
var BeforeRequestPayload = HooksSchema.Import("BeforeRequestPayload");
var BeforeRequestReturn = HooksSchema.Import("BeforeRequestReturn");
var RequestErrorPayload = HooksSchema.Import("RequestErrorPayload");
var RequestErrorReturn = HooksSchema.Import("RequestErrorReturn");
var ToolCallPayload = HooksSchema.Import("ToolCallPayload");
var ToolCallReturn = HooksSchema.Import("ToolCallReturn");
var ToolResultPayload = HooksSchema.Import("ToolResultPayload");
var ToolResultReturn = HooksSchema.Import("ToolResultReturn");
var TurnStoppingPayload = HooksSchema.Import("TurnStoppingPayload");
var TurnStoppingReturn = HooksSchema.Import("TurnStoppingReturn");
var ApprovalRequestPayload = HooksSchema.Import("ApprovalRequestPayload");
var ApprovalRequestReturn = HooksSchema.Import("ApprovalRequestReturn");
var BeforeCompactPayload = HooksSchema.Import("BeforeCompactPayload");
var BeforeCompactReturn = HooksSchema.Import("BeforeCompactReturn");
var CompactPayload = HooksSchema.Import("CompactPayload");
var CompactReturn = HooksSchema.Import("CompactReturn");
var SubagentStartPayload = HooksSchema.Import("SubagentStartPayload");
var SubagentStartReturn = HooksSchema.Import("SubagentStartReturn");
var SubagentEndPayload = HooksSchema.Import("SubagentEndPayload");
var SubagentEndReturn = HooksSchema.Import("SubagentEndReturn");
var FormatDeviationPayload = HooksSchema.Import("FormatDeviationPayload");
var FormatDeviationReturn = HooksSchema.Import("FormatDeviationReturn");
var ShutdownPayload = HooksSchema.Import("ShutdownPayload");
var ShutdownReturn = HooksSchema.Import("ShutdownReturn");
var X_AGNES_HOOK_TABLE = {
  "session_start": {
    "mode": "parallel",
    "category": "observe",
    "failPolicy": "open",
    "timeoutMs": 500,
    "replayOnResume": true
  },
  "resources_discover": {
    "mode": "waterfall",
    "category": "transform",
    "failPolicy": "open",
    "timeoutMs": 1e3,
    "replayOnResume": true
  },
  "before_step": {
    "mode": "serial",
    "category": "directive",
    "failPolicy": "closed",
    "timeoutMs": 1e3,
    "replayOnResume": false
  },
  "context": {
    "mode": "waterfall",
    "category": "transform",
    "failPolicy": "closed",
    "timeoutMs": 1500,
    "replayOnResume": false
  },
  "before_request": {
    "mode": "waterfall",
    "category": "transform",
    "failPolicy": "closed",
    "timeoutMs": 1500,
    "replayOnResume": false
  },
  "request_error": {
    "mode": "parallel",
    "category": "observe",
    "failPolicy": "open",
    "timeoutMs": 500,
    "replayOnResume": false
  },
  "tool_call": {
    "mode": "serial",
    "category": "directive",
    "failPolicy": "closed",
    "timeoutMs": 2e3,
    "replayOnResume": false
  },
  "tool_result": {
    "mode": "waterfall",
    "category": "transform",
    "failPolicy": "open",
    "timeoutMs": 2e3,
    "replayOnResume": false
  },
  "turn_stopping": {
    "mode": "serial",
    "category": "directive",
    "failPolicy": "open",
    "timeoutMs": 1e3,
    "replayOnResume": false
  },
  "approval_request": {
    "mode": "waterfall",
    "category": "transform",
    "failPolicy": "closed",
    "timeoutMs": 1e3,
    "replayOnResume": false
  },
  "before_compact": {
    "mode": "waterfall",
    "category": "transform",
    "failPolicy": "closed",
    "timeoutMs": 3e3,
    "replayOnResume": false
  },
  "compact": {
    "mode": "parallel",
    "category": "observe",
    "failPolicy": "open",
    "timeoutMs": 1e3,
    "replayOnResume": false
  },
  "subagent_start": {
    "mode": "emit",
    "category": "observe",
    "failPolicy": "open",
    "timeoutMs": 200,
    "replayOnResume": false
  },
  "subagent_end": {
    "mode": "emit",
    "category": "observe",
    "failPolicy": "open",
    "timeoutMs": 200,
    "replayOnResume": false
  },
  "format_deviation": {
    "mode": "parallel",
    "category": "observe",
    "failPolicy": "open",
    "timeoutMs": 500,
    "replayOnResume": false
  },
  "shutdown": {
    "mode": "parallel",
    "category": "observe",
    "failPolicy": "open",
    "timeoutMs": 1e3,
    "replayOnResume": false
  }
};
var X_AGNES_HOOK_IO = {
  "session_start": [
    "SessionStartPayload",
    "SessionStartReturn"
  ],
  "resources_discover": [
    "ResourcesDiscoverPayload",
    "ResourcesDiscoverReturn"
  ],
  "before_step": [
    "BeforeStepPayload",
    "BeforeStepReturn"
  ],
  "context": [
    "ContextPayload",
    "ContextReturn"
  ],
  "before_request": [
    "BeforeRequestPayload",
    "BeforeRequestReturn"
  ],
  "request_error": [
    "RequestErrorPayload",
    "RequestErrorReturn"
  ],
  "tool_call": [
    "ToolCallPayload",
    "ToolCallReturn"
  ],
  "tool_result": [
    "ToolResultPayload",
    "ToolResultReturn"
  ],
  "turn_stopping": [
    "TurnStoppingPayload",
    "TurnStoppingReturn"
  ],
  "approval_request": [
    "ApprovalRequestPayload",
    "ApprovalRequestReturn"
  ],
  "before_compact": [
    "BeforeCompactPayload",
    "BeforeCompactReturn"
  ],
  "compact": [
    "CompactPayload",
    "CompactReturn"
  ],
  "subagent_start": [
    "SubagentStartPayload",
    "SubagentStartReturn"
  ],
  "subagent_end": [
    "SubagentEndPayload",
    "SubagentEndReturn"
  ],
  "format_deviation": [
    "FormatDeviationPayload",
    "FormatDeviationReturn"
  ],
  "shutdown": [
    "ShutdownPayload",
    "ShutdownReturn"
  ]
};

// ../protocol/src/hooks.ts
var HOOK_EVENTS = [
  "session_start",
  "resources_discover",
  "before_step",
  "context",
  "before_request",
  "request_error",
  "tool_call",
  "tool_result",
  "turn_stopping",
  "approval_request",
  "before_compact",
  "compact",
  "subagent_start",
  "subagent_end",
  "format_deviation",
  "shutdown"
];
var HOOK_TABLE = X_AGNES_HOOK_TABLE;
var IO = X_AGNES_HOOK_IO;
for (const e of HOOK_EVENTS) {
  const row = HOOK_TABLE[e];
  if (!row) throw new Error(`hooks.json is missing the table row for ${e}`);
  const legal = row.category === "observe" && (row.mode === "emit" || row.mode === "parallel") || row.category === "transform" && row.mode === "waterfall" || row.category === "directive" && row.mode === "serial";
  if (!legal) throw new Error(`hooks.json declares an illegal mode/category pair for ${e}`);
  const pair = IO[e];
  if (pair?.length !== 2) throw new Error(`hooks.json is missing the payload/return pair for ${e}`);
  for (const name of pair)
    if (!(name in hooks_exports))
      throw new Error(`hooks.json names a definition that does not exist: ${name}`);
}

// ../protocol/src/jcs.ts
function jcs(value) {
  const invalid2 = () => new Error("invalid JCS input");
  const active = /* @__PURE__ */ new Set();
  const string = (text) => {
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code >= 55296 && code <= 56319) {
        const next = text.charCodeAt(++i);
        if (!(next >= 56320 && next <= 57343)) throw invalid2();
      } else if (code >= 56320 && code <= 57343) throw invalid2();
    }
    return JSON.stringify(text);
  };
  const encode = (item) => {
    if (item === null) return "null";
    if (typeof item === "string") return string(item);
    if (typeof item === "boolean") return item ? "true" : "false";
    if (typeof item === "number") {
      if (!Number.isFinite(item)) throw invalid2();
      return JSON.stringify(item);
    }
    if (typeof item !== "object" || active.has(item)) throw invalid2();
    const array = Array.isArray(item);
    const prototype = Object.getPrototypeOf(item);
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null)
      throw invalid2();
    active.add(item);
    try {
      const descriptors = Object.getOwnPropertyDescriptors(item);
      const keys = Reflect.ownKeys(descriptors);
      if (keys.some((key) => typeof key !== "string")) throw invalid2();
      const get = (key) => {
        const property = descriptors[key];
        if (!Object.hasOwn(descriptors, key) || !property?.enumerable || !Object.hasOwn(property, "value"))
          throw invalid2();
        return property.value;
      };
      if (array) {
        if (keys.length !== item.length + 1) throw invalid2();
        const values = [];
        for (let i = 0; i < item.length; i++) values.push(encode(get(String(i))));
        return `[${values.join(",")}]`;
      }
      return `{${keys.sort().map((key) => `${string(key)}:${encode(get(key))}`).join(",")}}`;
    } finally {
      active.delete(item);
    }
  };
  try {
    return encode(value);
  } catch {
    throw invalid2();
  }
}

// ../protocol/gen/ts/agnes-v1.ts
if (!format_exports.Has("agnes-git-source")) format_exports.Set("agnes-git-source", (value) => {
  const raw = value.slice(4);
  const hashAt = raw.lastIndexOf("#");
  const commit = raw.slice(hashAt + 1);
  try {
    const url = new URL(raw.slice(0, hashAt));
    return value.startsWith("git:") && hashAt > 0 && /^[a-f0-9]{40}$/.test(commit) && url.protocol === "https:" && url.username === "" && url.password === "" && url.search === "" && url.hash === "";
  } catch {
    return false;
  }
});
if (!format_exports.Has("date-time")) format_exports.Set("date-time", (value) => {
  const parts = value.split(/t/i);
  if (parts.length !== 2) return false;
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(parts[0] ?? "");
  const time = /^(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)(z|([+-])(\d{2}):(\d{2}))$/i.exec(parts[1] ?? "");
  if (!date || !time) return false;
  const year = Number(date[1]), month = Number(date[2]), day = Number(date[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > (days[month] ?? 0)) return false;
  const hour = Number(time[1]), minute = Number(time[2]), second = Number(time[3]);
  const offsetHour = Number(time[6] || 0), offsetMinute = Number(time[7] || 0);
  if (hour > 23 || minute > 59 || offsetHour > 23 || offsetMinute > 59) return false;
  if (second < 60) return true;
  const sign = time[5] === "-" ? -1 : 1;
  const utcMinute = minute - offsetMinute * sign;
  const utcHour = hour - offsetHour * sign - (utcMinute < 0 ? 1 : 0);
  return (utcHour === 23 || utcHour === -1) && (utcMinute === 59 || utcMinute === -1) && second < 61;
});
var JsonValue10 = Type.Recursive((This) => Type.Union([Type.Null(), Type.Boolean(), Type.Number(), Type.String(), Type.Array(This), Type.Record(Type.String(), This)]));
var UISpan = Type.Recursive((This) => Type.Object({ "id": Type.String({ maxLength: 128 }), "kind": Type.Union([Type.Literal("turn"), Type.Literal("step"), Type.Literal("generation"), Type.Literal("tool"), Type.Literal("subagent"), Type.Literal("compaction"), Type.Literal("approval"), Type.Literal("other")]), "name": Type.String({ maxLength: 256 }), "status": Type.Union([Type.Literal("running"), Type.Literal("waiting"), Type.Literal("completed"), Type.Literal("failed"), Type.Literal("cancelled")]), "startSeq": Type.Integer({ minimum: 1 }), "startedAt": Type.String({ format: "date-time" }), "endSeq": Type.Optional(Type.Integer({ minimum: 1 })), "endedAt": Type.Optional(Type.String({ format: "date-time" })), "durationMs": Type.Optional(Type.Integer({ minimum: 0 })), "ttftMs": Type.Optional(Type.Integer({ minimum: 0 })), "purpose": Type.Optional(Type.Union([Type.Literal("inference"), Type.Literal("compaction"), Type.Literal("verifier"), Type.Literal("subagent"), Type.Literal("media"), Type.Literal("tool"), Type.Literal("title"), Type.Literal("approval-guardian")])), "model": Type.Optional(Type.String({ maxLength: 256 })), "effectId": Type.Optional(Type.String({ maxLength: 128 })), "toolUseId": Type.Optional(Type.String({ maxLength: 128 })), "childSessionKey": Type.Optional(Type.String({ maxLength: 512 })), "nodeIds": Type.Optional(Type.Array(Type.String())), "callSeq": Type.Optional(Type.Integer({ minimum: 1 })), "error": Type.Optional(Type.Object({ "code": Type.Optional(Type.String({ maxLength: 64 })), "message": Type.Optional(Type.String({ maxLength: 4096 })) }, { additionalProperties: false })), "children": Type.Array(This) }, { additionalProperties: false }));
var AgnesV1 = Type.Module({
  "ExtensionCallParams": Type.Object({ "sessionId": Type.String({ minLength: 1, maxLength: 512 }), "extension": Type.String({ pattern: "^[a-z0-9-]+/[a-z0-9-]+$" }), "service": Type.String({ maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "input": Type.Record(Type.String(), JsonValue10), "commandId": Type.Optional(Type.String({ minLength: 1, maxLength: 128 })) }, { additionalProperties: false }),
  "ExtensionCallResult": Type.Object({ "output": JsonValue10 }, { additionalProperties: false }),
  "ExtensionAckParams": Type.Object({ "extension": Type.String({ pattern: "^[a-z0-9-]+/[a-z0-9-]+$" }), "service": Type.String({ maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "commandId": Type.String({ minLength: 1, maxLength: 128 }) }, { additionalProperties: false }),
  "ExtensionCallError": Type.Union([Type.Object({ "code": Type.Literal(-32001), "message": Type.Literal("OVERLOADED"), "data": Type.Object({ "code": Type.Literal("OVERLOADED") }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "code": Type.Literal(-32006), "message": Type.Literal("CAPABILITY_DENIED"), "data": Type.Object({ "code": Type.Literal("CAPABILITY_DENIED") }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "code": Type.Literal(-32602), "message": Type.Literal("INVALID_PARAMS"), "data": Type.Object({ "code": Type.Literal("INVALID_PARAMS") }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "code": Type.Literal(-32011), "message": Type.Literal("SEMANTIC_REJECTED"), "data": Type.Object({ "code": Type.Literal("ID_CONFLICT") }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "code": Type.Literal(-32012), "message": Type.Literal("REQUEST_TIMEOUT"), "data": Type.Object({ "code": Type.Literal("REQUEST_TIMEOUT") }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "code": Type.Literal(-32603), "message": Type.Literal("INTERNAL_ERROR"), "data": Type.Object({ "code": Type.Union([Type.Literal("INTERNAL_ERROR"), Type.Literal("E_WORKSPACE_REQUIRED")]) }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "code": Type.Literal(-32013), "message": Type.Literal("OUTCOME_UNKNOWN"), "data": Type.Object({ "code": Type.Literal("OUTCOME_UNKNOWN") }, { additionalProperties: false }) }, { additionalProperties: false })]),
  "ContentBlock": Type.Union([Type.Object({ "type": Type.Literal("text"), "text": Type.String({ maxLength: 1048576 }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("image"), "data": Type.String(), "mimeType": Type.String({ maxLength: 128 }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("file"), "data": Type.String(), "mimeType": Type.String({ minLength: 1, maxLength: 128 }), "name": Type.String({ minLength: 1, maxLength: 256 }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("resource_link"), "uri": Type.String({ maxLength: 4096 }), "name": Type.Optional(Type.String({ maxLength: 256 })), "mimeType": Type.Optional(Type.String({ maxLength: 128 })) }, { additionalProperties: false })]),
  "Actor": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 256 }), "org": Type.String({ maxLength: 256 }), "role": Type.String({ maxLength: 64 }), "deptPath": Type.Array(Type.String({ maxLength: 256 })), "attrs": Type.Record(Type.String(), Type.String({ maxLength: 1024 })) }, { additionalProperties: false }),
  "SurfaceOp": Type.Union([Type.Literal("append"), Type.Object({ "op": Type.Literal("replace"), "start": Type.Integer({ minimum: 1 }), "end": Type.Integer({ minimum: 1 }) }, { additionalProperties: false })]),
  "EventEnvelope": Type.Object({ "seq": Type.Integer({ minimum: 1 }), "ts": Type.String({ format: "date-time" }), "id": Type.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" }), "type": Type.Union([Type.Union([Type.Literal("session/start"), Type.Literal("turn/start"), Type.Literal("turn/end"), Type.Literal("step/start"), Type.Literal("step/end"), Type.Literal("user/message"), Type.Literal("assistant/message"), Type.Literal("tool/result"), Type.Literal("assistant/output"), Type.Literal("tool/call"), Type.Literal("request/header"), Type.Literal("request/sent"), Type.Literal("plan.items"), Type.Literal("budget.state"), Type.Literal("artifact/job"), Type.Literal("inbox"), Type.Literal("harness/entry"), Type.Literal("effect/intent"), Type.Literal("effect/settled"), Type.Literal("verifier/signal"), Type.Literal("repair/decision"), Type.Literal("format/deviation"), Type.Literal("cost/ledger"), Type.Literal("approval/asked"), Type.Literal("approval/decided"), Type.Literal("approval/guardian-decided"), Type.Literal("feedback/rating"), Type.Literal("feedback/implicit"), Type.Literal("participant"), Type.Literal("harness/refine"), Type.Literal("subagent/cost")]), Type.String({ maxLength: 128, pattern: "^x\\/(?:(?:core|agnes)\\/[a-z0-9-]+|host\\/session-title|[a-z0-9-]+\\/[a-z0-9-]+\\/[a-z0-9-]+)$" })]), "data": JsonValue10, "actor": Type.Ref("Actor"), "origin": Type.String({ maxLength: 256, pattern: "^(principal|model|system|memory|tool:[^\\s]+|external:[^\\s]+|skill:[^\\s]+|subagent:[^\\s]+|ext:[^\\s]+|import:[^\\s]+)$" }), "trust": Type.Union([Type.Literal("trusted"), Type.Literal("untrusted")]), "lane": Type.Optional(Type.String({ minLength: 1, maxLength: 64 })), "v": Type.Optional(Type.Integer({ minimum: 1 })), "register": Type.Optional(Type.String({ maxLength: 128 })), "ignorable": Type.Optional(Type.Literal(true)), "surfaceOp": Type.Optional(Type.Ref("SurfaceOp")), "sourceEventSeqs": Type.Optional(Type.Array(Type.Integer({ minimum: 1 }))) }, { additionalProperties: false }),
  "HarnessMeta": Type.Object({ "promptTurnId": Type.String({ maxLength: 64 }), "eventSequence": Type.Integer({ minimum: 1 }), "generation": Type.Integer({ minimum: 1 }), "lane": Type.String({ maxLength: 64 }), "phase": Type.Union([Type.Literal("event"), Type.Literal("responseBoundary"), Type.Literal("terminalQuiescence"), Type.Literal("parked")]), "credits": Type.Optional(Type.Object({ "used": Type.Number(), "remaining": Type.Optional(Type.Number()), "source": Type.Union([Type.Literal("gateway"), Type.Literal("estimated")]) }, { additionalProperties: false })), "turnEnd": Type.Optional(Type.Object({ "reason": Type.Union([Type.Literal("completed"), Type.Literal("aborted"), Type.Literal("error"), Type.Literal("parked"), Type.Literal("blocked"), Type.Literal("budget"), Type.Literal("max_steps"), Type.Literal("interrupted")]) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "Auth": Type.Union([Type.Ref("JwtCredential"), Type.Ref("SourceAuthCredential"), Type.Ref("PortalIdentityCredential"), Type.Ref("LocalCredential"), Type.Ref("SurfaceAuthCredential")]),
  "Credential": Type.Union([Type.Ref("JwtCredential"), Type.Ref("SourceAuthCredential"), Type.Ref("PortalIdentityCredential"), Type.Ref("LocalCredential"), Type.Ref("ChannelCredential")]),
  "DirectoryEntry": Type.Object({ "kind": Type.Union([Type.Literal("user"), Type.Literal("dept")]), "id": Type.String({ maxLength: 256 }), "name": Type.String({ maxLength: 256 }), "parentId": Type.Optional(Type.String({ maxLength: 256 })), "userIds": Type.Optional(Type.Array(Type.String({ maxLength: 256 }))), "attrs": Type.Optional(Type.Record(Type.String(), Type.String({ maxLength: 1024 }))), "deletedAt": Type.Optional(Type.String({ format: "date-time" })), "syncedAt": Type.String({ format: "date-time" }) }, { additionalProperties: false }),
  "InitializeMeta": Type.Object({ "auth": Type.Optional(Type.Ref("Auth")), "clientId": Type.Optional(Type.String({ maxLength: 128 })) }, { additionalProperties: false }),
  "NewSessionMeta": Type.Object({ "preset": Type.Optional(Type.String({ maxLength: 128 })), "sessionKey": Type.Optional(Type.String({ maxLength: 512 })) }, { additionalProperties: false }),
  "Cursor": Type.Object({ "fromSeq": Type.Integer({ minimum: 0 }), "generation": Type.Integer({ minimum: 1 }) }, { additionalProperties: false }),
  "AttachFilter": Type.Object({ "types": Type.Optional(Type.Array(Type.String({ maxLength: 128 }))), "lanes": Type.Optional(Type.Array(Type.String({ maxLength: 64 }))), "preview": Type.Optional(Type.Boolean()), "acpUpdates": Type.Optional(Type.Boolean()) }, { additionalProperties: false }),
  "SessionAttachParams": Type.Object({ "sessionId": Type.String({ maxLength: 512 }), "cursor": Type.Optional(Type.Ref("Cursor")), "filter": Type.Optional(Type.Ref("AttachFilter")) }, { additionalProperties: false }),
  "SessionAttachResult": Type.Object({ "generation": Type.Integer({ minimum: 1 }), "lastSeq": Type.Integer({ minimum: 0 }), "resolvedProfileHash": Type.Union([Type.String(), Type.Null()]) }, { additionalProperties: false }),
  "SessionSteerParams": Type.Object({ "sessionId": Type.String({ maxLength: 512 }), "content": Type.Array(Type.Ref("ContentBlock"), { minItems: 1 }), "commandId": Type.String({ maxLength: 128 }), "generation": Type.Optional(Type.Integer({ minimum: 1 })) }, { additionalProperties: false }),
  "SessionSendNowParams": Type.Object({ "sessionId": Type.String({ maxLength: 512 }), "itemId": Type.String({ minLength: 1, maxLength: 512 }), "commandId": Type.String({ maxLength: 128 }), "generation": Type.Optional(Type.Integer({ minimum: 1 })) }, { additionalProperties: false }),
  "SessionRemoveQueuedParams": Type.Ref("SessionSendNowParams"),
  "SessionSteerResult": Type.Object({ "seq": Type.Integer({ minimum: 1 }) }, { additionalProperties: false }),
  "SessionCompactParams": Type.Object({ "sessionId": Type.String({ maxLength: 512 }), "instructions": Type.Optional(Type.String({ maxLength: 4096 })), "commandId": Type.String({ maxLength: 128 }), "generation": Type.Optional(Type.Integer({ minimum: 1 })) }, { additionalProperties: false }),
  "ApisListParams": Type.Object({}, { additionalProperties: false }),
  "ApisListResult": Type.Object({ "profile": Type.Object({ "name": Type.String(), "resolvedProfileHash": Type.Union([Type.String(), Type.Null()]), "presets": Type.Object({ "default": Type.String(), "allowed": Type.Array(Type.String()) }, { additionalProperties: false }), "models": Type.Optional(Type.Array(Type.Object({ "route": Type.String({ pattern: "^[a-z0-9][a-z0-9-]{0,63}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^[^\\u0000-\\u001F\\u007F-\\u009F\\u2028\\u2029]+$" }), "reasoning": Type.Optional(Type.Boolean()), "input": Type.Optional(Type.Array(Type.Union([Type.Literal("text"), Type.Literal("image")]))), "inputLimits": Type.Optional(Type.Ref("ModelInputLimits")), "thinkingLevelMap": Type.Optional(Type.Record(Type.String(), Type.String())), "contextWindow": Type.Optional(Type.Integer({ minimum: 1 })), "defaultSettings": Type.Optional(Type.Ref("ModelSettings")) }, { additionalProperties: false }))), "branding": Type.Optional(Type.Object({ "accent": Type.String(), "mark": Type.String(), "selfLabel": Type.String() }, { additionalProperties: false })) }, { additionalProperties: false }), "families": Type.Array(Type.Object({ "name": Type.String(), "methods": Type.Array(Type.String()), "guidance": Type.String({ maxLength: 4096 }) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "SubmitParams": Type.Object({ "clientId": Type.String({ maxLength: 128 }), "commandId": Type.String({ maxLength: 128 }), "kind": Type.Union([Type.Literal("steer"), Type.Literal("followUp"), Type.Literal("sendNow"), Type.Literal("removeQueued"), Type.Literal("compact"), Type.Literal("fork"), Type.Literal("jobs.enqueue")]), "generation": Type.Optional(Type.Integer({ minimum: 1 })), "payload": JsonValue10 }, { additionalProperties: false }),
  "CommandAckParams": Type.Object({ "clientId": Type.String({ maxLength: 128 }), "sessionId": Type.String({ maxLength: 512 }), "commandId": Type.String({ maxLength: 128 }) }, { additionalProperties: false }),
  "Ack": Type.Object({ "seq": Type.Optional(Type.Integer({ minimum: 1 })), "replayed": Type.Boolean(), "status": Type.Optional(Type.Literal("uncertain")), "result": Type.Optional(JsonValue10), "compact": Type.Optional(Type.Ref("CompactOutcome")) }, { additionalProperties: false }),
  "CompactOutcome": Type.Union([Type.Object({ "state": Type.Literal("completed"), "endSeq": Type.Integer({ minimum: 1 }) }, { additionalProperties: false }), Type.Object({ "state": Type.Literal("failed"), "endSeq": Type.Integer({ minimum: 1 }) }, { additionalProperties: false }), Type.Object({ "state": Type.Literal("unknown") }, { additionalProperties: false })]),
  "ErrorData": Type.Object({ "code": Type.String({ maxLength: 64 }) }),
  "SessionIdParams": Type.Object({ "sessionId": Type.String({ maxLength: 512 }) }, { additionalProperties: false }),
  "ApprovalGrantListParams": Type.Object({ "sessionId": Type.String({ minLength: 1, maxLength: 512 }), "toolId": Type.String({ minLength: 1, maxLength: 128 }), "scope": Type.String({ minLength: 1, maxLength: 256 }), "policyVersion": Type.String({ minLength: 1, maxLength: 64 }) }, { additionalProperties: false }),
  "ApprovalGrantRecord": Type.Object({ "grantId": Type.String({ minLength: 1, maxLength: 128 }), "profileHash": Type.String({ pattern: "^sha256-[a-f0-9]{64}$" }), "actorId": Type.String({ minLength: 1, maxLength: 256 }), "actorOrg": Type.String({ minLength: 1, maxLength: 256 }), "toolId": Type.String({ minLength: 1, maxLength: 128 }), "scope": Type.String({ minLength: 1, maxLength: 256 }), "policyVersion": Type.String({ minLength: 1, maxLength: 64 }), "createdAt": Type.String({ format: "date-time" }), "revokedAt": Type.Optional(Type.String({ format: "date-time" })) }, { additionalProperties: false }),
  "ApprovalGrantRevokeParams": Type.Object({ "sessionId": Type.String({ minLength: 1, maxLength: 512 }), "toolId": Type.String({ minLength: 1, maxLength: 128 }), "scope": Type.String({ minLength: 1, maxLength: 256 }), "policyVersion": Type.String({ minLength: 1, maxLength: 64 }), "grantId": Type.String({ minLength: 1, maxLength: 128 }) }, { additionalProperties: false }),
  "ApprovalGrantListResult": Type.Object({ "grants": Type.Array(Type.Ref("ApprovalGrantRecord")) }, { additionalProperties: false }),
  "Empty": Type.Object({}, { additionalProperties: false }),
  "ComputerUseLockedPackageMutationStatus": Type.Object({ "activationReady": Type.Boolean(), "recoveryReady": Type.Boolean(), "blockers": Type.Array(Type.Union([Type.Literal("environment-unavailable"), Type.Literal("mutation-engine-unavailable"), Type.Literal("publisher-keyring-unavailable"), Type.Literal("safe-extraction-unavailable"), Type.Literal("store-directory-unavailable"), Type.Literal("trusted-directory-handle-unavailable")]), { maxItems: 6, uniqueItems: true }) }, { additionalProperties: false }),
  "ComputerUseStatusResult": Type.Union([Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("blocked"), "admission": Type.Object({ "state": Type.Literal("blocked"), "reason": Type.Union([Type.Literal("p0-evidence-incomplete"), Type.Literal("runtime-unavailable")]) }, { additionalProperties: false }), "runtime": Type.Object({ "state": Type.Literal("not-started"), "startAttempted": Type.Literal(false) }, { additionalProperties: false }), "blockers": Type.Array(Type.Union([Type.Literal("release-provenance-incomplete"), Type.Literal("compatibility-evidence-incomplete"), Type.Literal("platform-acceptance-incomplete"), Type.Literal("feature-disabled"), Type.Literal("platform-unsupported"), Type.Literal("driver-not-prepared"), Type.Literal("driver-preparing"), Type.Literal("driver-prepare-failed")]), { minItems: 1, uniqueItems: true }), "lockedPackageMutations": Type.Optional(Type.Ref("ComputerUseLockedPackageMutationStatus")) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("ready"), "admission": Type.Object({ "state": Type.Literal("ready"), "reason": Type.Union([Type.Literal("windows-verified-driver"), Type.Literal("macos-verified-driver"), Type.Literal("linux-verified-driver")]) }, { additionalProperties: false }), "runtime": Type.Object({ "state": Type.Union([Type.Literal("idle"), Type.Literal("running")]), "startAttempted": Type.Boolean(), "activeSessions": Type.Integer({ minimum: 0 }) }, { additionalProperties: false }), "blockers": Type.Array(Type.Unknown(), { maxItems: 0 }), "driver": Type.Object({ "platform": Type.Union([Type.Literal("win32"), Type.Literal("darwin"), Type.Literal("linux")]), "version": Type.String({ minLength: 1, maxLength: 64 }), "publisher": Type.String({ minLength: 1, maxLength: 256 }) }, { additionalProperties: false }), "lockedPackageMutations": Type.Optional(Type.Ref("ComputerUseLockedPackageMutationStatus")) }, { additionalProperties: false })]),
  "ComputerUsePermissionsStatusResult": Type.Union([Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("unavailable"), "admission": Type.Object({ "state": Type.Literal("blocked"), "reason": Type.Literal("p0-evidence-incomplete") }, { additionalProperties: false }), "probe": Type.Object({ "state": Type.Literal("not-run"), "reason": Type.Literal("production-driver-admission-disabled") }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("not-required"), "admission": Type.Object({ "state": Type.Literal("ready"), "reason": Type.Literal("linux-verified-driver") }, { additionalProperties: false }), "probe": Type.Object({ "state": Type.Literal("passed"), "reason": Type.Literal("linux-no-os-grant-required") }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("not-required"), "admission": Type.Object({ "state": Type.Literal("ready"), "reason": Type.Literal("windows-verified-driver") }, { additionalProperties: false }), "probe": Type.Object({ "state": Type.Literal("passed"), "reason": Type.Literal("windows-no-os-grant-required") }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("granted"), "admission": Type.Object({ "state": Type.Literal("ready"), "reason": Type.Literal("macos-verified-driver") }, { additionalProperties: false }), "probe": Type.Object({ "state": Type.Literal("passed"), "reason": Type.Literal("macos-tcc-permissions-granted"), "accessibility": Type.Literal(true), "screenRecording": Type.Literal(true) }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("required"), "admission": Type.Object({ "state": Type.Literal("ready"), "reason": Type.Literal("macos-verified-driver") }, { additionalProperties: false }), "probe": Type.Object({ "state": Type.Literal("passed"), "reason": Type.Literal("macos-tcc-permissions-missing"), "accessibility": Type.Literal(false), "screenRecording": Type.Boolean() }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("required"), "admission": Type.Object({ "state": Type.Literal("ready"), "reason": Type.Literal("macos-verified-driver") }, { additionalProperties: false }), "probe": Type.Object({ "state": Type.Literal("passed"), "reason": Type.Literal("macos-tcc-permissions-missing"), "accessibility": Type.Literal(true), "screenRecording": Type.Literal(false) }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("unknown"), "admission": Type.Object({ "state": Type.Literal("ready"), "reason": Type.Literal("macos-verified-driver") }, { additionalProperties: false }), "probe": Type.Object({ "state": Type.Literal("failed"), "reason": Type.Literal("macos-tcc-probe-failed") }, { additionalProperties: false }) }, { additionalProperties: false })]),
  "ComputerUseDoctorParams": Type.Object({ "include": Type.Optional(Type.Array(Type.String({ pattern: "^[a-z][a-z0-9_-]{0,63}$" }), { minItems: 1, maxItems: 32, uniqueItems: true })), "skip": Type.Optional(Type.Array(Type.String({ pattern: "^[a-z][a-z0-9_-]{0,63}$" }), { minItems: 1, maxItems: 32, uniqueItems: true })) }, { additionalProperties: false }),
  "ComputerUseDoctorResult": Type.Union([Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("blocked"), "admission": Type.Object({ "state": Type.Literal("blocked"), "reason": Type.Literal("p0-evidence-incomplete") }, { additionalProperties: false }), "checks": Type.Object({ "state": Type.Literal("not-run"), "reason": Type.Literal("production-driver-admission-disabled") }, { additionalProperties: false }), "lockedPackageMutations": Type.Optional(Type.Ref("ComputerUseLockedPackageMutationStatus")) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("ready"), "admission": Type.Object({ "state": Type.Literal("ready"), "reason": Type.Literal("linux-verified-driver") }, { additionalProperties: false }), "checks": Type.Object({ "state": Type.Literal("passed"), "reason": Type.Literal("linux-driver-health-and-identity-verified") }, { additionalProperties: false }), "lockedPackageMutations": Type.Optional(Type.Ref("ComputerUseLockedPackageMutationStatus")) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("ready"), "admission": Type.Object({ "state": Type.Literal("ready"), "reason": Type.Literal("windows-verified-driver") }, { additionalProperties: false }), "checks": Type.Object({ "state": Type.Literal("passed"), "reason": Type.Literal("windows-driver-health-and-identity-verified") }, { additionalProperties: false }), "lockedPackageMutations": Type.Optional(Type.Ref("ComputerUseLockedPackageMutationStatus")) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("failed"), "admission": Type.Object({ "state": Type.Literal("ready"), "reason": Type.Literal("linux-verified-driver") }, { additionalProperties: false }), "checks": Type.Object({ "state": Type.Literal("failed"), "reason": Type.Literal("linux-driver-health-or-identity-failed") }, { additionalProperties: false }), "lockedPackageMutations": Type.Optional(Type.Ref("ComputerUseLockedPackageMutationStatus")) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("ready"), "admission": Type.Object({ "state": Type.Literal("ready"), "reason": Type.Literal("macos-verified-driver") }, { additionalProperties: false }), "checks": Type.Object({ "state": Type.Literal("passed"), "reason": Type.Literal("macos-driver-health-and-identity-verified") }, { additionalProperties: false }), "lockedPackageMutations": Type.Optional(Type.Ref("ComputerUseLockedPackageMutationStatus")) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("failed"), "admission": Type.Object({ "state": Type.Literal("ready"), "reason": Type.Literal("windows-verified-driver") }, { additionalProperties: false }), "checks": Type.Object({ "state": Type.Literal("failed"), "reason": Type.Literal("windows-driver-health-or-identity-failed") }, { additionalProperties: false }), "lockedPackageMutations": Type.Optional(Type.Ref("ComputerUseLockedPackageMutationStatus")) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("failed"), "admission": Type.Object({ "state": Type.Literal("ready"), "reason": Type.Literal("macos-verified-driver") }, { additionalProperties: false }), "checks": Type.Object({ "state": Type.Literal("failed"), "reason": Type.Literal("macos-driver-health-or-identity-failed") }, { additionalProperties: false }), "lockedPackageMutations": Type.Optional(Type.Ref("ComputerUseLockedPackageMutationStatus")) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("unreachable"), "admission": Type.Object({ "state": Type.Literal("ready"), "reason": Type.Union([Type.Literal("windows-verified-driver"), Type.Literal("macos-verified-driver"), Type.Literal("linux-verified-driver")]) }, { additionalProperties: false }), "checks": Type.Object({ "state": Type.Literal("unavailable"), "reason": Type.Literal("live-driver-doctor-unavailable") }, { additionalProperties: false }), "lockedPackageMutations": Type.Optional(Type.Ref("ComputerUseLockedPackageMutationStatus")) }, { additionalProperties: false })]),
  "ComputerUseOperationStartParams": Type.Object({ "kind": Type.Union([Type.Literal("install"), Type.Literal("update"), Type.Literal("restart")]) }, { additionalProperties: false }),
  "ComputerUseOperationStatusParams": Type.Object({ "operationId": Type.Optional(Type.String({ pattern: "^cu-[a-zA-Z0-9-]{1,128}$" })) }, { additionalProperties: false }),
  "ComputerUseOperationIdParams": Type.Object({ "operationId": Type.String({ pattern: "^cu-[a-zA-Z0-9-]{1,128}$" }) }, { additionalProperties: false }),
  "ComputerUseOperationResult": Type.Union([Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("not-found") }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("found"), "operationId": Type.String({ pattern: "^cu-[a-zA-Z0-9-]{1,128}$" }), "kind": Type.Union([Type.Literal("install"), Type.Literal("update"), Type.Literal("restart")]), "state": Type.Literal("queued"), "phase": Type.Literal("queued"), "startedAtMs": Type.Integer({ minimum: 0 }), "updatedAtMs": Type.Integer({ minimum: 0 }) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("found"), "operationId": Type.String({ pattern: "^cu-[a-zA-Z0-9-]{1,128}$" }), "kind": Type.Union([Type.Literal("install"), Type.Literal("update")]), "state": Type.Union([Type.Literal("running"), Type.Literal("cancelling")]), "phase": Type.Union([Type.Literal("installing"), Type.Literal("restarting")]), "startedAtMs": Type.Integer({ minimum: 0 }), "updatedAtMs": Type.Integer({ minimum: 0 }) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("found"), "operationId": Type.String({ pattern: "^cu-[a-zA-Z0-9-]{1,128}$" }), "kind": Type.Literal("restart"), "state": Type.Union([Type.Literal("running"), Type.Literal("cancelling")]), "phase": Type.Literal("restarting"), "startedAtMs": Type.Integer({ minimum: 0 }), "updatedAtMs": Type.Integer({ minimum: 0 }) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("found"), "operationId": Type.String({ pattern: "^cu-[a-zA-Z0-9-]{1,128}$" }), "kind": Type.Union([Type.Literal("install"), Type.Literal("update")]), "state": Type.Literal("succeeded"), "phase": Type.Literal("complete"), "startedAtMs": Type.Integer({ minimum: 0 }), "updatedAtMs": Type.Integer({ minimum: 0 }), "outcome": Type.Union([Type.Literal("installed"), Type.Literal("already-current"), Type.Literal("repaired"), Type.Literal("lkg-restored")]) }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("found"), "operationId": Type.String({ pattern: "^cu-[a-zA-Z0-9-]{1,128}$" }), "kind": Type.Literal("restart"), "state": Type.Literal("succeeded"), "phase": Type.Literal("complete"), "startedAtMs": Type.Integer({ minimum: 0 }), "updatedAtMs": Type.Integer({ minimum: 0 }), "outcome": Type.Literal("restarted") }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("found"), "operationId": Type.String({ pattern: "^cu-[a-zA-Z0-9-]{1,128}$" }), "kind": Type.Union([Type.Literal("install"), Type.Literal("update"), Type.Literal("restart")]), "state": Type.Literal("failed"), "phase": Type.Literal("complete"), "startedAtMs": Type.Integer({ minimum: 0 }), "updatedAtMs": Type.Integer({ minimum: 0 }), "failure": Type.Literal("operation-failed") }, { additionalProperties: false }), Type.Object({ "schemaVersion": Type.Literal(1), "status": Type.Literal("found"), "operationId": Type.String({ pattern: "^cu-[a-zA-Z0-9-]{1,128}$" }), "kind": Type.Union([Type.Literal("install"), Type.Literal("update"), Type.Literal("restart")]), "state": Type.Literal("cancelled"), "phase": Type.Literal("complete"), "startedAtMs": Type.Integer({ minimum: 0 }), "updatedAtMs": Type.Integer({ minimum: 0 }) }, { additionalProperties: false })]),
  "AuthClaimParams": Type.Union([Type.Object({ "kind": Type.String({ maxLength: 64 }), "value": Type.String({ maxLength: 512 }), "expiresAtMs": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false }), Type.Object({ "kind": Type.String({ maxLength: 64 }), "value": Type.String({ maxLength: 512 }), "limit": Type.Integer({ minimum: 1 }), "windowMs": Type.Integer({ minimum: 1 }) }, { additionalProperties: false })]),
  "AuthClaimResult": Type.Object({ "granted": Type.Boolean(), "slot": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false }),
  "SessionEventParams": Type.Object({ "sessionId": Type.String({ maxLength: 512 }), "event": Type.Ref("EventEnvelope"), "_meta": Type.Optional(Type.Object({ "ai.agnes.harness": Type.Ref("HarnessMeta") }, { additionalProperties: false })) }, { additionalProperties: false }),
  "SessionPreviewParams": Type.Object({ "sessionId": Type.String({ maxLength: 512 }), "lane": Type.String({ minLength: 1, maxLength: 64 }), "effectId": Type.String({ maxLength: 128 }), "stream": Type.Union([Type.Literal("text"), Type.Literal("thinking")]), "offset": Type.Integer({ minimum: 0 }), "delta": Type.String() }, { additionalProperties: false }),
  "DaemonNotice": Type.Union([Type.Object({ "kind": Type.Literal("packages_changed"), "detail": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "revision": Type.String({ minLength: 1, maxLength: 128 }), "reason": Type.Union([Type.Literal("inventory"), Type.Literal("activation"), Type.Literal("trust"), Type.Literal("resources"), Type.Literal("rebuilt")]), "packageId": Type.Optional(Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" })) }, { additionalProperties: false }), "at": Type.String() }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("tree_changed"), "detail": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "targetDigest": Type.String({ pattern: "^sha256-[0-9a-f]{64}$" }), "hash": Type.String({ pattern: "^sha256-[0-9a-f]{64}$" }), "identity": Type.Object({ "treeHash": Type.String({ pattern: "^[0-9a-f]{64}$" }), "resourceRevision": Type.String({ pattern: "^[0-9a-f]{64}$" }), "compositeRevision": Type.String({ pattern: "^[0-9a-f]{64}$" }) }, { additionalProperties: false }) }, { additionalProperties: false }), "at": Type.String() }, { additionalProperties: false }), Type.Object({ "kind": Type.Union([Type.Literal("resumed"), Type.Literal("worker_crashed"), Type.Literal("worker_quarantined"), Type.Literal("overloaded"), Type.Literal("job_dispatched"), Type.Literal("job_dead"), Type.Literal("shutting_down")]), "sessionId": Type.Optional(Type.String({ maxLength: 512 })), "detail": JsonValue10, "at": Type.String() }, { additionalProperties: false })]),
  "BudgetState": Type.Union([Type.Null(), Type.Object({ "slot": Type.String({ maxLength: 32 }), "escalate": Type.Boolean(), "creditsUsed": Type.Number({ minimum: 0 }), "creditsCap": Type.Union([Type.Number({ minimum: 0 }), Type.Null()]), "lastPreflight": Type.Optional(Type.Object({ "tokens": Type.Integer({ minimum: 0 }), "source": Type.Union([Type.Literal("count"), Type.Literal("estimate")]), "boundHash": Type.Optional(Type.String({ pattern: "^[0-9a-f]{64}$" })), "at": Type.Optional(Type.String()), "seq": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false })) }, { additionalProperties: false })]),
  "ArtifactRef": Type.Object({ "sha256": Type.String({ pattern: "^[0-9a-f]{64}$" }), "size": Type.Integer({ minimum: 0 }), "mime": Type.String({ maxLength: 128 }) }, { additionalProperties: false }),
  "ArtifactJob": Type.Union([Type.Null(), Type.Object({ "jobId": Type.String({ maxLength: 128 }), "status": Type.Union([Type.Literal("queued"), Type.Literal("running"), Type.Literal("done"), Type.Literal("failed"), Type.Literal("cancelled")]), "ref": Type.Optional(Type.Ref("ArtifactRef")), "error": Type.Optional(Type.String({ maxLength: 4096 })) }, { additionalProperties: false })]),
  "JobSpec": Type.Object({ "idempotencyKey": Type.String({ maxLength: 256 }), "sessionKey": Type.String({ maxLength: 512 }), "payload": Type.Union([Type.Object({ "prompt": Type.Union([Type.String({ maxLength: 65536 }), Type.Array(Type.Ref("ContentBlock"))]), "delivery": Type.Optional(Type.Union([Type.Literal("steer"), Type.Literal("follow_up")])) }, { additionalProperties: false }), Type.Object({ "command": Type.Object({ "method": Type.String({ pattern: "^(?:resume|_agnes/v1/[A-Za-z][A-Za-z0-9./_-]*)$" }), "params": JsonValue10 }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("directory.sync"), "channel": Type.String({ minLength: 1, maxLength: 64 }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("shell"), "command": Type.String({ maxLength: 65536 }), "cwd": Type.String({ maxLength: 4096 }) }, { additionalProperties: false })]), "schedule": Type.Ref("Schedule"), "budget": Type.Optional(Type.Number({ minimum: 0 })), "protected": Type.Optional(Type.Boolean()), "maxAttempts": Type.Optional(Type.Integer({ minimum: 1, maximum: 10 })) }, { additionalProperties: false }),
  "JobStatus": Type.Object({ "jobId": Type.String(), "status": Type.Union([Type.Literal("waiting"), Type.Literal("delayed"), Type.Literal("active"), Type.Literal("completed"), Type.Literal("failed"), Type.Literal("dead"), Type.Literal("cancelled")]), "attempts": Type.Integer({ minimum: 0 }), "delayUntil": Type.Optional(Type.Integer({ minimum: 0 })), "leaseUntil": Type.Optional(Type.Integer({ minimum: 0 })), "stalledCounter": Type.Optional(Type.Integer({ minimum: 0 })), "result": Type.Optional(JsonValue10), "error": Type.Optional(Type.Object({ "code": Type.String(), "message": Type.String() }, { additionalProperties: false })), "createdAt": Type.String({ format: "date-time" }), "updatedAt": Type.String({ format: "date-time" }) }, { additionalProperties: false }),
  "SessionBudgetResult": Type.Object({ "state": Type.Union([Type.Ref("BudgetState"), Type.Null()]), "ledger": Type.Array(Type.Object({ "credits": Type.Optional(Type.Number()), "creditSource": Type.Union([Type.Literal("gateway"), Type.Literal("estimated")]), "purpose": Type.Optional(Type.String()), "seq": Type.Integer({ minimum: 1 }) }, { additionalProperties: false }), { maxItems: 200 }) }, { additionalProperties: false }),
  "SessionProjectUIParams": Type.Object({ "sessionId": Type.String({ maxLength: 512 }), "upto": Type.Optional(Type.Integer({ minimum: 0 })), "surface": Type.Optional(Type.Union([Type.Literal("tui"), Type.Literal("web"), Type.Literal("channel")])) }, { additionalProperties: false }),
  "SessionProjectUIPatchParams": Type.Object({ "sessionId": Type.String({ maxLength: 512 }), "after": Type.Integer({ minimum: 0 }), "upto": Type.Optional(Type.Integer({ minimum: 0 })), "surface": Type.Optional(Type.Union([Type.Literal("tui"), Type.Literal("web"), Type.Literal("channel")])) }, { additionalProperties: false }),
  "SessionProjectUIOpeningParams": Type.Object({ "sessionId": Type.String({ maxLength: 512 }), "surface": Type.Optional(Type.Union([Type.Literal("tui"), Type.Literal("web"), Type.Literal("channel")])), "maxNodes": Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })), "maxBytes": Type.Optional(Type.Integer({ minimum: 16384, maximum: 150990848 })) }, { additionalProperties: false }),
  "UIHistoryCursor": Type.String({ minLength: 1, maxLength: 2048 }),
  "SessionProjectUIHistoryParams": Type.Object({ "sessionId": Type.String({ maxLength: 512 }), "cursor": Type.Ref("UIHistoryCursor"), "limit": Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })), "maxBytes": Type.Optional(Type.Integer({ minimum: 16384, maximum: 150990848 })) }, { additionalProperties: false }),
  "SessionReadToolDetailParams": Type.Object({ "sessionId": Type.String({ minLength: 1, maxLength: 512 }), "callSeq": Type.Integer({ minimum: 1 }), "resultSeq": Type.Optional(Type.Integer({ minimum: 1 })), "offset": Type.Optional(Type.Integer({ minimum: 0 })), "maxBytes": Type.Optional(Type.Integer({ minimum: 1, maximum: 262144 })) }, { additionalProperties: false }),
  "SessionReadToolDetailResult": Type.Object({ "sessionId": Type.String({ minLength: 1, maxLength: 512 }), "callSeq": Type.Integer({ minimum: 1 }), "resultSeq": Type.Optional(Type.Integer({ minimum: 1 })), "offset": Type.Integer({ minimum: 0 }), "totalBytes": Type.Integer({ minimum: 0 }), "data": Type.String({ maxLength: 349528, pattern: "^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$" }), "nextOffset": Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]) }, { additionalProperties: false }),
  "SlotFillView": Type.Object({ "slot": Type.Union([Type.Literal("tool.card.inline"), Type.Literal("sidebar.action"), Type.Literal("status.line"), Type.Literal("notification")]), "extId": Type.String({ maxLength: 128 }), "payload": JsonValue10, "requestSeq": Type.Optional(Type.Integer({ minimum: 1 })) }, { additionalProperties: false }),
  "UINode": Type.Union([Type.Object({ "kind": Type.Literal("user"), "id": Type.String(), "seq": Type.Integer(), "content": Type.Array(Type.Ref("ContentBlock")), "actorLabel": Type.Optional(Type.String({ maxLength: 128 })) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("assistant"), "id": Type.String(), "seq": Type.Integer(), "text": Type.String(), "thinking": Type.Optional(Type.String()), "streaming": Type.Optional(Type.Boolean()), "effectId": Type.Optional(Type.String({ maxLength: 128 })), "lostChars": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("tool"), "id": Type.String(), "seq": Type.Integer(), "toolUseId": Type.String(), "name": Type.String(), "status": Type.Union([Type.Literal("planned"), Type.Literal("awaiting_approval"), Type.Literal("running"), Type.Literal("completed"), Type.Literal("failed"), Type.Literal("cancelled")]), "summary": Type.String({ maxLength: 512 }), "argsPreview": Type.Optional(Type.String({ maxLength: 2048 })), "resultPreview": Type.Optional(Type.String({ maxLength: 4096 })), "resultSeq": Type.Optional(Type.Integer({ minimum: 1 })), "enforcement": Type.Optional(Type.Object({ "level": Type.Union([Type.Literal("full"), Type.Literal("partial"), Type.Literal("none")]), "scope": Type.Array(Type.Union([Type.Literal("file"), Type.Literal("network"), Type.Literal("process")])) }, { additionalProperties: false })), "depth": Type.Optional(Type.Integer({ minimum: 0 })), "children": Type.Optional(Type.Array(Type.String())), "slots": Type.Optional(Type.Array(Type.Ref("SlotFillView"))) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("approval"), "id": Type.String(), "seq": Type.Integer(), "state": Type.Union([Type.Literal("pending"), Type.Literal("decided"), Type.Literal("expired")]), "summary": Type.String({ maxLength: 4096 }), "risk": Type.Union([Type.Literal("destructive"), Type.Literal("always"), Type.Literal("budget"), Type.Literal("unknown")]), "options": Type.Array(Type.Union([Type.Literal("allow_once"), Type.Literal("allow_always"), Type.Literal("allow_permanent"), Type.Literal("reject_once")])), "ticket": Type.Optional(Type.String()), "expiresAt": Type.Optional(Type.String()), "requestSeq": Type.Optional(Type.Integer()), "decision": Type.Optional(Type.Object({ "verdict": Type.String(), "via": Type.String(), "byLabel": Type.Optional(Type.String()), "reason": Type.Optional(Type.String()) }, { additionalProperties: false })) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("cost"), "id": Type.String(), "seq": Type.Integer(), "credits": Type.Optional(Type.Number()), "source": Type.Union([Type.Literal("gateway"), Type.Literal("estimated")]), "purpose": Type.Optional(Type.String()), "tokens": Type.Optional(Type.Ref("TokenCounts")), "billing": Type.Optional(Type.Ref("Billing")), "model": Type.Optional(Type.String({ maxLength: 256 })), "interrupted": Type.Optional(Type.Boolean()), "timing": Type.Optional(Type.Object({ "ttftMs": Type.Optional(Type.Integer({ minimum: 0 })), "durationMs": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false })) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("artifact"), "id": Type.String(), "seq": Type.Integer(), "name": Type.String({ maxLength: 256 }), "ref": Type.Ref("ArtifactRef") }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("compaction"), "id": Type.String(), "seq": Type.Integer(), "range": Type.Array(Type.Integer(), { minItems: 2, maxItems: 2 }), "tokensBefore": Type.Optional(Type.Integer()), "tokensAfter": Type.Optional(Type.Integer()), "summary": Type.Optional(Type.String()), "customInstructions": Type.Optional(Type.String()) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("slot"), "id": Type.String(), "seq": Type.Optional(Type.Integer()), "fill": Type.Ref("SlotFillView") }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("context-sections"), "id": Type.String(), "seq": Type.Integer(), "sections": Type.Array(Type.Object({ "id": Type.String({ maxLength: 256 }), "order": Type.Integer(), "source": Type.String({ maxLength: 256 }), "tokens": Type.Integer({ minimum: 0 }) }, { additionalProperties: false })) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("contribute-conflict"), "id": Type.String(), "seq": Type.Integer(), "key": Type.String({ maxLength: 256 }), "ops": Type.Array(Type.String({ maxLength: 128 })) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("context"), "id": Type.String(), "seq": Type.Integer(), "text": Type.String() }, { additionalProperties: false })]),
  "UsageView": Type.Object({ "totals": Type.Object({ "input": Type.Integer({ minimum: 0 }), "output": Type.Integer({ minimum: 0 }), "cacheRead": Type.Integer({ minimum: 0 }), "cacheWrite": Type.Integer({ minimum: 0 }), "reasoning": Type.Integer({ minimum: 0 }) }, { additionalProperties: false }), "cost": Type.Optional(Type.Ref("Billing")), "credits": Type.Optional(Type.Object({ "amount": Type.Number({ minimum: 0 }), "source": Type.Union([Type.Literal("gateway"), Type.Literal("estimated")]), "complete": Type.Boolean() }, { additionalProperties: false })), "reasoningComplete": Type.Optional(Type.Boolean()), "billingComplete": Type.Optional(Type.Boolean()), "context": Type.Object({ "tokens": Type.Integer({ minimum: 0 }), "window": Type.Integer({ minimum: 1 }), "autoCompact": Type.Boolean(), "source": Type.Optional(Type.Literal("estimated")) }, { additionalProperties: false }), "model": Type.Object({ "settings": Type.Optional(Type.Ref("ModelSettings")), "route": Type.String({ pattern: "^[a-z0-9][a-z0-9-]{0,63}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^[^\\u0000-\\u001F\\u007F-\\u009F\\u2028\\u2029]+$" }), "thinking": Type.Ref("ThinkingLevel"), "maxTokens": Type.Optional(Type.Integer({ minimum: 1 })) }, { additionalProperties: false }), "cache": Type.Optional(Type.Object({ "hitRate": Type.Optional(Type.Number({ minimum: 0, maximum: 1 })), "lastInvalidation": Type.Optional(Type.Object({ "seq": Type.Integer({ minimum: 1 }), "reprocessedTokens": Type.Integer({ minimum: 0 }), "cause": Type.Union([Type.Literal("compaction"), Type.Literal("system-changed"), Type.Literal("history-changed")]) }, { additionalProperties: false })) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "UITurnCall": Type.Object({ "id": Type.String({ maxLength: 128 }), "seq": Type.Integer({ minimum: 1 }), "purpose": Type.Union([Type.Literal("inference"), Type.Literal("compaction"), Type.Literal("verifier"), Type.Literal("subagent"), Type.Literal("media"), Type.Literal("tool"), Type.Literal("title"), Type.Literal("approval-guardian")]), "model": Type.String({ maxLength: 256 }), "tokens": Type.Optional(Type.Ref("TokenCounts")), "credits": Type.Optional(Type.Number({ minimum: 0 })), "creditSource": Type.Union([Type.Literal("gateway"), Type.Literal("estimated")]), "billing": Type.Optional(Type.Ref("Billing")), "interrupted": Type.Optional(Type.Boolean()), "timing": Type.Optional(Type.Object({ "ttftMs": Type.Optional(Type.Integer({ minimum: 0 })), "durationMs": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false })), "adjustment": Type.Optional(Type.Object({ "of": Type.Integer({ minimum: 1 }), "delta": Type.Number(), "usdMicrosDelta": Type.Optional(Type.Integer()), "reason": Type.String({ maxLength: 512 }) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "UITurnUsage": Type.Object({ "totals": Type.Object({ "input": Type.Integer({ minimum: 0 }), "output": Type.Integer({ minimum: 0 }), "cacheRead": Type.Integer({ minimum: 0 }), "cacheWrite": Type.Integer({ minimum: 0 }), "reasoning": Type.Integer({ minimum: 0 }) }, { additionalProperties: false }), "cost": Type.Optional(Type.Ref("Billing")), "credits": Type.Optional(Type.Object({ "amount": Type.Number({ minimum: 0 }), "source": Type.Union([Type.Literal("gateway"), Type.Literal("estimated")]), "complete": Type.Boolean() }, { additionalProperties: false })), "reasoningComplete": Type.Boolean(), "billingComplete": Type.Boolean(), "calls": Type.Array(Type.Ref("UITurnCall")) }, { additionalProperties: false }),
  "UITurn": Type.Object({ "id": Type.String({ maxLength: 128 }), "turn": Type.Integer({ minimum: 1 }), "startSeq": Type.Integer({ minimum: 1 }), "endSeq": Type.Optional(Type.Integer({ minimum: 1 })), "startedAt": Type.String({ format: "date-time" }), "endedAt": Type.Optional(Type.String({ format: "date-time" })), "durationMs": Type.Optional(Type.Integer({ minimum: 0 })), "status": Type.Union([Type.Literal("running"), Type.Literal("waiting"), Type.Literal("completed"), Type.Literal("failed"), Type.Literal("cancelled")]), "reason": Type.Optional(Type.Union([Type.Literal("completed"), Type.Literal("aborted"), Type.Literal("error"), Type.Literal("parked"), Type.Literal("blocked"), Type.Literal("budget"), Type.Literal("max_steps"), Type.Literal("interrupted")])), "error": Type.Optional(Type.Object({ "code": Type.String({ maxLength: 64 }), "message": Type.String({ maxLength: 4096 }) }, { additionalProperties: false })), "nodeIds": Type.Array(Type.String()), "finalAssistantId": Type.Optional(Type.String()), "finalModel": Type.Optional(Type.String({ maxLength: 256 })), "usage": Type.Ref("UITurnUsage"), "inherited": Type.Boolean(), "forkable": Type.Boolean(), "trace": Type.Optional(UISpan) }, { additionalProperties: false }),
  "UIOperationState": Type.Union([Type.Null(), Type.Object({ "turn": Type.Integer(), "step": Type.Integer(), "phase": Type.String({ maxLength: 32 }), "parked": Type.Optional(Type.Object({ "ticket": Type.String(), "expiresAt": Type.String() }, { additionalProperties: false })) }, { additionalProperties: false })]),
  "UIPendingInput": Type.Object({ "itemId": Type.String(), "preview": Type.String({ maxLength: 2e3 }) }, { additionalProperties: false }),
  "UITimeline": Type.Object({ "pendingInputs": Type.Optional(Type.Array(Type.Ref("UIPendingInput"))), "yolo": Type.Optional(Type.Boolean()), "sessionId": Type.String(), "upto": Type.Integer({ minimum: 0 }), "generation": Type.Integer({ minimum: 1 }), "opState": Type.Ref("UIOperationState"), "nodes": Type.Array(Type.Ref("UINode")), "turns": Type.Array(Type.Ref("UITurn")), "budget": Type.Optional(Type.Ref("BudgetState")), "usage": Type.Optional(Type.Ref("UsageView")) }, { additionalProperties: false }),
  "UIHistoryInfo": Type.Union([Type.Object({ "hasEarlier": Type.Literal(true), "cursor": Type.Ref("UIHistoryCursor"), "startIndex": Type.Integer({ minimum: 0, maximum: 9007199254740991 }), "totalNodes": Type.Integer({ minimum: 0, maximum: 9007199254740991 }) }, { additionalProperties: false }), Type.Object({ "hasEarlier": Type.Literal(false), "startIndex": Type.Integer({ minimum: 0, maximum: 9007199254740991 }), "totalNodes": Type.Integer({ minimum: 0, maximum: 9007199254740991 }) }, { additionalProperties: false })]),
  "UIOpeningResult": Type.Object({ "timeline": Type.Ref("UITimeline"), "history": Type.Ref("UIHistoryInfo") }, { additionalProperties: false }),
  "UIHistoryPage": Type.Union([Type.Object({ "sessionId": Type.String({ maxLength: 512 }), "generation": Type.Integer({ minimum: 1, maximum: 9007199254740991 }), "cut": Type.Integer({ minimum: 0, maximum: 9007199254740991 }), "nodes": Type.Array(Type.Ref("UINode"), { maxItems: 200 }), "turns": Type.Array(Type.Ref("UITurn")), "hasEarlier": Type.Literal(true), "cursor": Type.Ref("UIHistoryCursor"), "startIndex": Type.Integer({ minimum: 0, maximum: 9007199254740991 }), "totalNodes": Type.Integer({ minimum: 0, maximum: 9007199254740991 }) }, { additionalProperties: false }), Type.Object({ "sessionId": Type.String({ maxLength: 512 }), "generation": Type.Integer({ minimum: 1, maximum: 9007199254740991 }), "cut": Type.Integer({ minimum: 0, maximum: 9007199254740991 }), "nodes": Type.Array(Type.Ref("UINode"), { maxItems: 200 }), "turns": Type.Array(Type.Ref("UITurn")), "hasEarlier": Type.Literal(false), "startIndex": Type.Integer({ minimum: 0, maximum: 9007199254740991 }), "totalNodes": Type.Integer({ minimum: 0, maximum: 9007199254740991 }) }, { additionalProperties: false })]),
  "UIProjectionNodeChange": Type.Union([Type.Object({ "op": Type.Literal("remove"), "id": Type.String() }, { additionalProperties: false }), Type.Object({ "op": Type.Literal("upsert"), "index": Type.Integer({ minimum: 0 }), "node": Type.Ref("UINode") }, { additionalProperties: false })]),
  "UIProjectionTurnChange": Type.Union([Type.Object({ "op": Type.Literal("remove"), "id": Type.String() }, { additionalProperties: false }), Type.Object({ "op": Type.Literal("upsert"), "index": Type.Integer({ minimum: 0 }), "turn": Type.Ref("UITurn") }, { additionalProperties: false })]),
  "UITimelinePatch": Type.Object({ "pendingInputs": Type.Optional(Type.Array(Type.Ref("UIPendingInput"))), "yolo": Type.Optional(Type.Boolean()), "sessionId": Type.String(), "generation": Type.Integer({ minimum: 1 }), "from": Type.Integer({ minimum: 0 }), "upto": Type.Integer({ minimum: 0 }), "totalNodes": Type.Optional(Type.Integer({ minimum: 0, maximum: 9007199254740991 })), "opState": Type.Ref("UIOperationState"), "changes": Type.Array(Type.Ref("UIProjectionNodeChange")), "turnChanges": Type.Array(Type.Ref("UIProjectionTurnChange")), "budget": Type.Optional(Type.Ref("BudgetState")), "usage": Type.Optional(Type.Ref("UsageView")) }, { additionalProperties: false }),
  "UIProjectionUpdate": Type.Union([Type.Object({ "kind": Type.Literal("patch"), "patch": Type.Ref("UITimelinePatch") }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("replace"), "timeline": Type.Ref("UITimeline") }, { additionalProperties: false })]),
  "JwtCredential": Type.Object({ "kind": Type.Literal("jwt"), "token": Type.String({ maxLength: 8192 }) }, { additionalProperties: false }),
  "SourceAuthCredential": Type.Object({ "kind": Type.Literal("source-auth"), "timestamp": Type.Integer(), "signature": Type.String({ pattern: "^v0=[0-9a-f]{64}$" }), "nonce": Type.String({ pattern: "^[0-9a-f]{32}$" }) }, { additionalProperties: false }),
  "PortalIdentityCredential": Type.Object({ "kind": Type.Literal("portal-identity"), "token": Type.String({ maxLength: 8192 }) }, { additionalProperties: false }),
  "LocalCredential": Type.Object({ "kind": Type.Literal("local") }, { additionalProperties: false }),
  "SurfaceAuthCredential": Type.Object({ "kind": Type.Literal("surface"), "sourceId": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9-]{0,63}$" }), "source": Type.Ref("SourceAuthCredential"), "subject": Type.Union([Type.Ref("JwtCredential"), Type.Ref("PortalIdentityCredential")]) }, { additionalProperties: false }),
  "SlotName": Type.Union([Type.Literal("primary"), Type.Literal("escalation"), Type.Literal("fast"), Type.Literal("compaction"), Type.Literal("verifier"), Type.Literal("image"), Type.Literal("video")]),
  "SessionForkParams": Type.Object({ "sessionId": Type.String(), "at": Type.Integer({ minimum: 1 }), "childKey": Type.Optional(Type.String({ maxLength: 512 })) }, { additionalProperties: false }),
  "WorkspaceEntry": Type.Object({ "path": Type.String({ minLength: 1, maxLength: 4096 }), "name": Type.String({ minLength: 1, maxLength: 256 }), "lastUsedAt": Type.Union([Type.String({ format: "date-time" }), Type.Null()]), "sessionCount": Type.Integer({ minimum: 0 }), "available": Type.Boolean(), "workspaceId": Type.Optional(Type.String({ pattern: "^[a-f0-9]{64}$" })), "revision": Type.Optional(Type.Integer({ minimum: 1 })) }, { additionalProperties: false }),
  "WorkspaceListParams": Type.Object({}, { additionalProperties: false }),
  "WorkspaceListResult": Type.Object({ "items": Type.Array(Type.Ref("WorkspaceEntry")) }, { additionalProperties: false }),
  "WorkspaceAddParams": Type.Object({ "path": Type.String({ minLength: 1, maxLength: 4096 }) }, { additionalProperties: false }),
  "WorkspaceAddResult": Type.Object({ "workspace": Type.Ref("WorkspaceEntry") }, { additionalProperties: false }),
  "SurfacesMountsParams": Type.Object({}, { additionalProperties: false }),
  "SurfacesMountsResult": Type.Object({ "mounts": Type.Array(Type.Object({ "package": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "surfaceId": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9-]{0,63}$" }), "mount": Type.String({ minLength: 1, maxLength: 256, pattern: "^/(?!_agnes(?:/|$))[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*$" }), "host": Type.Literal("127.0.0.1"), "port": Type.Integer({ minimum: 1, maximum: 65535 }) }, { additionalProperties: false }), { maxItems: 256 }) }, { additionalProperties: false }),
  "SessionPreferences": Type.Object({ "title": Type.Optional(Type.String({ minLength: 1, maxLength: 80 })), "archived": Type.Boolean() }, { additionalProperties: false }),
  "SessionRenameParams": Type.Object({ "sessionId": Type.String({ minLength: 1, maxLength: 512 }), "title": Type.String({ minLength: 1, maxLength: 256 }) }, { additionalProperties: false }),
  "SessionArchiveParams": Type.Object({ "sessionId": Type.String({ minLength: 1, maxLength: 512 }), "archived": Type.Boolean() }, { additionalProperties: false }),
  "DiagnosticsCollectParams": Type.Object({}, { additionalProperties: false }),
  "DiagnosticsCollectResult": Type.Object({ "collectedAt": Type.String({ format: "date-time" }), "agh": Type.Object({ "version": Type.String({ maxLength: 128 }) }, { additionalProperties: false }), "runtime": Type.Object({ "platform": Type.String({ maxLength: 64 }), "arch": Type.String({ maxLength: 64 }), "osRelease": Type.String({ maxLength: 256 }), "node": Type.String({ maxLength: 64 }), "pid": Type.Integer({ minimum: 0 }), "uptimeMs": Type.Integer({ minimum: 0 }) }, { additionalProperties: false }), "logs": Type.Array(Type.Object({ "name": Type.Union([Type.Literal("daemon.jsonl"), Type.Literal("host.jsonl")]), "size": Type.Integer({ minimum: 0 }), "text": Type.String(), "truncated": Type.Boolean(), "missing": Type.Boolean() }, { additionalProperties: false }), { maxItems: 2 }) }, { additionalProperties: false }),
  "DiagnosticsEventsParams": Type.Object({ "sessionId": Type.String({ minLength: 1, maxLength: 512 }), "afterSeq": Type.Integer({ minimum: 0 }), "limit": Type.Integer({ minimum: 1, maximum: 500 }), "maxBytes": Type.Integer({ minimum: 1, maximum: 2097152 }) }, { additionalProperties: false }),
  "DiagnosticsEventsResult": Type.Object({ "events": Type.Array(Type.Ref("EventEnvelope"), { maxItems: 500 }), "lastSeq": Type.Integer({ minimum: 0 }), "nextAfterSeq": Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]) }, { additionalProperties: false }),
  "SessionMeta": Type.Object({ "sessionId": Type.String(), "parent": Type.Optional(Type.String()), "createdAt": Type.String(), "lastSeq": Type.Integer({ minimum: 0 }), "generation": Type.Integer({ minimum: 1 }), "preset": Type.String(), "title": Type.Optional(Type.String({ maxLength: 256 })), "archived": Type.Optional(Type.Boolean()), "titleSource": Type.Optional(Type.Literal("user")), "cwd": Type.Optional(Type.String()) }, { additionalProperties: false }),
  "SessionListParams": Type.Object({ "q": Type.Optional(Type.Object({ "cwd": Type.Optional(Type.String()), "prefix": Type.Optional(Type.String({ maxLength: 512 })), "text": Type.Optional(Type.String({ maxLength: 256 })) }, { additionalProperties: false })), "cursor": Type.Optional(Type.String({ maxLength: 512 })), "limit": Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })) }, { additionalProperties: false }),
  "PageSessionMeta": Type.Object({ "items": Type.Array(Type.Ref("SessionMeta")), "next": Type.Optional(Type.String({ maxLength: 512 })) }, { additionalProperties: false }),
  "SessionSetPresetParams": Type.Object({ "sessionId": Type.String(), "preset": Type.String({ maxLength: 128 }) }, { additionalProperties: false }),
  "SessionSetModelParams": Type.Object({ "sessionId": Type.String(), "slot": Type.Ref("SlotName"), "route": Type.String(), "model": Type.String(), "thinking": Type.Optional(Type.Union([Type.Ref("ThinkingLevel"), Type.Null()])), "contextWindow": Type.Optional(Type.Union([Type.Integer({ minimum: 1, maximum: 9007199254740991 }), Type.Null()])) }, { additionalProperties: false }),
  "SessionSetYoloParams": Type.Object({ "sessionId": Type.String(), "enabled": Type.Boolean() }, { additionalProperties: false }),
  "EffectiveFromResult": Type.Object({ "effectiveFromSeq": Type.Integer({ minimum: 1 }) }, { additionalProperties: false }),
  "SeqResult": Type.Object({ "seq": Type.Integer({ minimum: 1 }) }, { additionalProperties: false }),
  "ApprovalDecideParams": Type.Object({ "ticket": Type.String({ maxLength: 128 }), "verdict": Type.Union([Type.Literal("allowed-once"), Type.Literal("allowed-session"), Type.Literal("allowed-permanent"), Type.Literal("rejected")]), "approverCredential": Type.Ref("Credential") }, { additionalProperties: false }),
  "ParticipantParams": Type.Object({ "sessionId": Type.String({ maxLength: 512 }), "credential": Type.Ref("Credential") }, { additionalProperties: false }),
  "ParticipantListResult": Type.Object({ "participants": Type.Array(Type.Object({ "actor": Type.Ref("Actor"), "joinedAt": Type.String({ format: "date-time" }), "surface": Type.Optional(Type.String({ maxLength: 64 })) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "DirectoryUpsertParams": Type.Object({ "entries": Type.Array(Type.Ref("DirectoryEntry"), { maxItems: 5e3 }) }, { additionalProperties: false }),
  "DirectoryUpsertResult": Type.Object({ "upserted": Type.Integer({ minimum: 0 }), "deleted": Type.Integer({ minimum: 0 }) }, { additionalProperties: false }),
  "JobIdParams": Type.Object({ "jobId": Type.String({ maxLength: 128 }) }, { additionalProperties: false }),
  "JobIdResult": Type.Object({ "jobId": Type.String({ maxLength: 128 }) }, { additionalProperties: false }),
  "ExtUiResponseParams": Type.Object({ "sessionId": Type.String({ maxLength: 512 }), "requestSeq": Type.Integer({ minimum: 1 }), "action": Type.Union([Type.Literal("accept"), Type.Literal("decline"), Type.Literal("cancel"), Type.Literal("expired")]), "data": Type.Optional(JsonValue10) }, { additionalProperties: false }),
  "ConfigOAuthInput": Type.Object({ "defaultSettings": Type.Optional(Type.Ref("ModelSettings")), "action": Type.Union([Type.Literal("start"), Type.Literal("poll"), Type.Literal("answer"), Type.Literal("test"), Type.Literal("commit"), Type.Literal("cancel")]), "operationId": Type.Optional(Type.String({ minLength: 1, maxLength: 64 })), "accountId": Type.Optional(Type.String({ minLength: 1, maxLength: 48, pattern: "^[a-z0-9][a-z0-9-]{0,47}$" })), "providerId": Type.Optional(Type.String({ minLength: 1, maxLength: 64 })), "label": Type.Optional(Type.String({ minLength: 1, maxLength: 128 })), "expectedRevision": Type.Optional(Type.Integer({ minimum: 0 })), "loginMethod": Type.Optional(Type.Union([Type.Literal("browser"), Type.Literal("device_code")])), "promptId": Type.Optional(Type.String({ minLength: 1, maxLength: 64 })), "answer": Type.Optional(Type.String({ maxLength: 8192 })), "model": Type.Optional(Type.String({ minLength: 1, maxLength: 256 })) }, { additionalProperties: false }),
  "ConfigOAuthPrompt": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 64 }), "message": Type.String({ minLength: 1, maxLength: 2048 }), "type": Type.Union([Type.Literal("text"), Type.Literal("secret"), Type.Literal("manual_code")]), "placeholder": Type.Optional(Type.String({ maxLength: 512 })) }, { additionalProperties: false }),
  "ConfigOAuthNotice": Type.Object({ "message": Type.String({ minLength: 1, maxLength: 4096 }), "url": Type.Optional(Type.String({ minLength: 1, maxLength: 4096 })) }, { additionalProperties: false }),
  "ConfigOAuthResult": Type.Object({ "operationId": Type.String({ minLength: 1, maxLength: 64 }), "state": Type.Union([Type.Literal("running"), Type.Literal("ready"), Type.Literal("failed"), Type.Literal("cancelled"), Type.Literal("saved")]), "prompt": Type.Optional(Type.Ref("ConfigOAuthPrompt")), "notices": Type.Optional(Type.Array(Type.Ref("ConfigOAuthNotice"), { maxItems: 100 })), "models": Type.Optional(Type.Array(Type.Ref("ConfigModel"), { maxItems: 4096 })), "snapshot": Type.Optional(Type.Ref("ConfigSnapshot")), "error": Type.Optional(Type.Union([Type.Literal("CONFIG_AUTH_FAILED"), Type.Literal("CONFIG_AUTH_CANCELLED"), Type.Literal("CONFIG_AUTH_EXPIRED")])) }, { additionalProperties: false }),
  "ConfigProvider": Type.Object({ "authType": Type.Optional(Type.Union([Type.Literal("api-key"), Type.Literal("oauth")])), "authMethods": Type.Optional(Type.Array(Type.Union([Type.Literal("api-key"), Type.Literal("oauth")]), { minItems: 1, maxItems: 2, uniqueItems: true })), "loginMethods": Type.Optional(Type.Array(Type.Union([Type.Literal("browser"), Type.Literal("device_code")]), { maxItems: 2, uniqueItems: true })), "id": Type.String({ minLength: 1, maxLength: 64 }), "label": Type.String({ minLength: 1, maxLength: 256 }), "api": Type.String({ minLength: 1, maxLength: 64 }), "baseUrl": Type.String({ minLength: 1, maxLength: 2048 }) }, { additionalProperties: false }),
  "ConfigModel": Type.Object({ "reasoning": Type.Optional(Type.Boolean()), "thinkingLevelMap": Type.Optional(Type.Record(Type.String(), Type.String())), "contextWindow": Type.Optional(Type.Integer({ minimum: 1 })), "defaultSettings": Type.Optional(Type.Ref("ModelSettings")), "id": Type.String({ minLength: 1, maxLength: 256 }), "name": Type.String({ minLength: 1, maxLength: 256 }), "thinkingEfforts": Type.Optional(Type.Union([Type.Literal(false), Type.Record(Type.String(), Type.String({ minLength: 1 }))])) }, { additionalProperties: false }),
  "ConfigSnapshot": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64 }), "revision": Type.Integer({ minimum: 0 }), "configured": Type.Boolean(), "provider": Type.Union([Type.Null(), Type.Object({ "id": Type.String({ minLength: 1, maxLength: 64 }), "baseUrl": Type.String({ minLength: 1, maxLength: 2048 }), "model": Type.String({ minLength: 1, maxLength: 256 }), "credentialConfigured": Type.Boolean(), "route": Type.Optional(Type.String({ minLength: 1, maxLength: 64 })) }, { additionalProperties: false })]), "effect": Type.Union([Type.Literal("new-sessions"), Type.Literal("restart-required")]), "accounts": Type.Optional(Type.Array(Type.Ref("ConfigAccount"), { maxItems: 64 })), "defaultAccountId": Type.Optional(Type.Union([Type.String({ maxLength: 48, pattern: "^[a-z0-9][a-z0-9-]{0,47}$" }), Type.Null()])) }, { additionalProperties: false }),
  "ConfigTestInput": Type.Object({ "providerId": Type.String({ minLength: 1, maxLength: 64 }), "baseUrl": Type.Optional(Type.String({ minLength: 1, maxLength: 2048 })), "apiKey": Type.Optional(Type.String({ minLength: 1, maxLength: 65536 })), "model": Type.Optional(Type.String({ minLength: 1, maxLength: 256 })), "accountId": Type.Optional(Type.String({ maxLength: 48, pattern: "^[a-z0-9][a-z0-9-]{0,47}$" })) }, { additionalProperties: false }),
  "ConfigSaveInput": Type.Object({ "defaultSettings": Type.Optional(Type.Ref("ModelSettings")), "providerId": Type.String({ minLength: 1, maxLength: 64 }), "baseUrl": Type.Optional(Type.String({ minLength: 1, maxLength: 2048 })), "apiKey": Type.Optional(Type.String({ minLength: 1, maxLength: 65536 })), "model": Type.String({ minLength: 1, maxLength: 256 }), "expectedRevision": Type.Optional(Type.Integer({ minimum: 0 })), "accountId": Type.Optional(Type.String({ maxLength: 48, pattern: "^[a-z0-9][a-z0-9-]{0,47}$" })), "label": Type.Optional(Type.String({ minLength: 1, maxLength: 128 })), "enabled": Type.Optional(Type.Boolean()), "makeDefault": Type.Optional(Type.Boolean()) }, { additionalProperties: false }),
  "ConfigTestResult": Type.Object({ "models": Type.Array(Type.Ref("ConfigModel"), { maxItems: 4096 }), "verified": Type.Boolean() }, { additionalProperties: false }),
  "ConfigProvidersResult": Type.Object({ "providers": Type.Array(Type.Ref("ConfigProvider"), { maxItems: 128 }) }, { additionalProperties: false }),
  "ConfigEmptyParams": Type.Object({}, { additionalProperties: false }),
  "PackageCatalogListParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "query": Type.Optional(Type.String({ minLength: 1, maxLength: 256 })), "cursor": Type.Optional(Type.String({ minLength: 1, maxLength: 256 })), "limit": Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })) }, { additionalProperties: false }),
  "PackageCatalogPage": Type.Object({ "items": Type.Array(Type.Ref("PackageCatalogDescriptor"), { maxItems: 100 }), "nextCursor": Type.Union([Type.String({ minLength: 1, maxLength: 256 }), Type.Null()]) }, { additionalProperties: false }),
  "PackageCatalogGetParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "version": Type.Optional(Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*))(?:\\.(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$" })) }, { additionalProperties: false }),
  "PackageCatalogDescriptor": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "version": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*))(?:\\.(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$" }), "source": Type.Ref("PackageSource"), "integrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "license": Type.String({ minLength: 1, maxLength: 64 }), "contributions": Type.Array(Type.Ref("PackageContributionSummary"), { maxItems: 128 }), "compatibility": Type.Union([Type.Literal("supported"), Type.Literal("adapted"), Type.Literal("generation-only"), Type.Literal("unsupported")]), "sourceId": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9-]{0,63}$" }), "retrievedAt": Type.String({ format: "date-time" }) }, { additionalProperties: false }),
  "PackageListParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }) }, { additionalProperties: false }),
  "SkinReadParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "path": Type.String({ minLength: 1, maxLength: 1024, pattern: "^/skins/" }) }, { additionalProperties: false }),
  "ClientModuleReadParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "path": Type.String({ minLength: 1, maxLength: 1024, pattern: "^/plugins/" }) }, { additionalProperties: false }),
  "PackageListResult": Type.Object({ "packages": Type.Array(Type.Ref("PackageInstalledDescriptor"), { maxItems: 1024 }) }, { additionalProperties: false }),
  "PackageInspectParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "source": Type.Ref("PackageSource") }, { additionalProperties: false }),
  "PackageOperationReceipt": Type.Object({ "operationId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }) }, { additionalProperties: false }),
  "PackageInstallParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "source": Type.Ref("PackageSource"), "expectedIntegrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }) }, { additionalProperties: false }),
  "PackageTrustParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "expectedIntegrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "capabilityHash": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-f0-9]{64}$" }) }, { additionalProperties: false }),
  "PackageUntrustParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*\\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:\\/[a-z0-9][a-z0-9._-]*)?)$" }), "expectedIntegrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "capabilityHash": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-f0-9]{64}$" }) }, { additionalProperties: false }),
  "PackageActivationTrust": Type.Object({ "integrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "capabilityHash": Type.String({ minLength: 64, maxLength: 64, pattern: "^[a-f0-9]{64}$" }) }, { additionalProperties: false }),
  "PackageActivationRequest": Type.Object({ "expectedInstalledIntegrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "expectedActiveIntegrity": Type.Union([Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), Type.Null()]), "trust": Type.Ref("PackageActivationTrust") }, { additionalProperties: false }),
  "PackageRollbackTarget": Type.Object({ "version": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*))(?:\\.(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$" }), "integrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "capabilityHash": Type.String({ minLength: 64, maxLength: 64, pattern: "^[a-f0-9]{64}$" }) }, { additionalProperties: false }),
  "PackageAdminContext": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "permissions": Type.Array(Type.Ref("PackageAdminPermission"), { maxItems: 7, uniqueItems: true }), "readOnly": Type.Boolean(), "authScope": Type.Optional(Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" })), "features": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), { maxItems: 32, uniqueItems: true })) }, { additionalProperties: false }),
  "PackageEnableParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "expectedInstalledIntegrity": Type.Optional(Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" })), "expectedActiveIntegrity": Type.Optional(Type.Union([Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), Type.Null()])) }, { additionalProperties: false }),
  "PackageDisableParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }) }, { additionalProperties: false }),
  "PackageUpdateParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "source": Type.Ref("PackageSource"), "expectedIntegrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "activation": Type.Optional(Type.Ref("PackageActivationRequest")) }, { additionalProperties: false }),
  "PackageRollbackParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "expectedTargetIntegrity": Type.Optional(Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" })), "activation": Type.Optional(Type.Ref("PackageActivationRequest")) }, { additionalProperties: false }),
  "PackageRemoveParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }) }, { additionalProperties: false }),
  "PackageOperationGetParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "operationId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }) }, { additionalProperties: false }),
  "PackageOperation": Type.Object({ "operationId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "operation": Type.Union([Type.Literal("inspect"), Type.Literal("install"), Type.Literal("trust"), Type.Literal("untrust"), Type.Literal("enable"), Type.Literal("disable"), Type.Literal("update"), Type.Literal("rollback"), Type.Literal("remove")]), "state": Type.Union([Type.Literal("received"), Type.Literal("inspecting"), Type.Literal("installing"), Type.Literal("staging"), Type.Literal("quiescing"), Type.Literal("switching"), Type.Literal("draining"), Type.Literal("completed"), Type.Literal("failed"), Type.Literal("cancelled"), Type.Literal("rolled-back")]), "progress": Type.Integer({ minimum: 0, maximum: 100 }), "startedAt": Type.String({ format: "date-time" }), "updatedAt": Type.String({ format: "date-time" }), "preview": Type.Optional(Type.Ref("PackagePreview")), "installed": Type.Optional(Type.Ref("PackageInstalledDescriptor")), "error": Type.Optional(Type.Ref("PackageAdminError")), "packageId": Type.Optional(Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" })), "cancellable": Type.Optional(Type.Boolean()), "retryable": Type.Optional(Type.Boolean()) }, { additionalProperties: false }),
  "PackageOperationCancelParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "operationId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }) }, { additionalProperties: false }),
  "PackagePinsInspectParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }) }, { additionalProperties: false }),
  "PackagePinsInspectResult": Type.Object({ "orphans": Type.Array(Type.Ref("RuntimePinDescriptor"), { maxItems: 4096 }) }, { additionalProperties: false }),
  "PackagePinsReleaseParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "pinIds": Type.Array(Type.String({ minLength: 1, maxLength: 256 }), { minItems: 1, maxItems: 64 }) }, { additionalProperties: false }),
  "PackagePinsReleaseResult": Type.Object({ "results": Type.Array(Type.Ref("RuntimePinReleaseResult"), { maxItems: 64 }) }, { additionalProperties: false }),
  "PackageTrustWorkspaceParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "deployDir": Type.String({ minLength: 1, maxLength: 4096 }) }, { additionalProperties: false }),
  "PackageTrustWorkspaceResult": Type.Object({ "hash": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }) }, { additionalProperties: false }),
  "PluginTreeApplyParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "artifact": Type.Ref("PluginTreeArtifact") }, { additionalProperties: false }),
  "PluginTreeRollbackParams": Type.Object({ "profile": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9.-]{0,63}$" }), "clientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }), "commandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" }) }, { additionalProperties: false }),
  "PluginTreeView": Type.Object({ "actual": Type.Boolean(), "pending": Type.Boolean(), "desiredDigest": Type.Optional(Type.String({ pattern: "^sha256-[0-9a-f]{64}$" })), "reportOk": Type.Optional(Type.Boolean()), "failurePhase": Type.Optional(Type.String({ minLength: 1, maxLength: 128 })), "workerGeneration": Type.Optional(Type.Integer({ minimum: 1, maximum: 9007199254740991 })), "identity": Type.Optional(Type.Object({ "treeHash": Type.String({ pattern: "^[0-9a-f]{64}$" }), "resourceRevision": Type.String({ pattern: "^[0-9a-f]{64}$" }), "compositeRevision": Type.String({ pattern: "^[0-9a-f]{64}$" }) }, { additionalProperties: false })), "desired": Type.Optional(Type.Ref("PluginTreeArtifact")) }, { additionalProperties: false }),
  "PluginTreeApplyResult": Type.Object({ "desiredDigest": Type.String({ pattern: "^sha256-[0-9a-f]{64}$" }), "pending": Type.Boolean() }, { additionalProperties: false }),
  "PluginTreeRollbackResult": Type.Object({ "rolledBack": Type.Boolean(), "desiredDigest": Type.Optional(Type.String({ pattern: "^sha256-[0-9a-f]{64}$" })) }, { additionalProperties: false }),
  "ConfigAccount": Type.Object({ "accountId": Type.String({ maxLength: 48, pattern: "^[a-z0-9][a-z0-9-]{0,47}$" }), "label": Type.String({ minLength: 1, maxLength: 128 }), "providerId": Type.String({ minLength: 1, maxLength: 64 }), "route": Type.String({ minLength: 1, maxLength: 64 }), "baseUrl": Type.String({ minLength: 1, maxLength: 2048 }), "model": Type.String({ minLength: 1, maxLength: 256 }), "models": Type.Array(Type.Ref("ConfigModel"), { maxItems: 4096 }), "enabled": Type.Boolean(), "credentialConfigured": Type.Boolean(), "authType": Type.Optional(Type.Union([Type.Literal("api-key"), Type.Literal("oauth")])) }, { additionalProperties: false }),
  "ArtifactReadParams": Type.Object({ "sessionId": Type.String({ minLength: 1, maxLength: 512 }), "laneId": Type.String({ minLength: 1, maxLength: 512 }), "artifact": Type.Ref("ArtifactRef"), "range": Type.Optional(Type.String({ minLength: 1, maxLength: 128, pattern: "^bytes=(?:[0-9]+-[0-9]*|-[0-9]+)$" })) }, { additionalProperties: false }),
  "ArtifactReadResult": Type.Union([Type.Object({ "ok": Type.Literal(false), "status": Type.Literal(400), "code": Type.Literal("invalid_request") }, { additionalProperties: false }), Type.Object({ "ok": Type.Literal(false), "status": Type.Literal(401), "code": Type.Literal("authentication_required") }, { additionalProperties: false }), Type.Object({ "ok": Type.Literal(false), "status": Type.Literal(403), "code": Type.Literal("artifact_forbidden") }, { additionalProperties: false }), Type.Object({ "ok": Type.Literal(false), "status": Type.Literal(404), "code": Type.Literal("artifact_not_found") }, { additionalProperties: false }), Type.Object({ "ok": Type.Literal(false), "status": Type.Literal(409), "code": Type.Literal("artifact_identity_mismatch") }, { additionalProperties: false }), Type.Object({ "ok": Type.Literal(false), "status": Type.Literal(410), "code": Type.Literal("artifact_reclaimed") }, { additionalProperties: false }), Type.Object({ "ok": Type.Literal(false), "status": Type.Literal(413), "code": Type.Literal("artifact_too_large") }, { additionalProperties: false }), Type.Object({ "ok": Type.Literal(false), "status": Type.Literal(416), "code": Type.Literal("range_not_satisfiable") }, { additionalProperties: false }), Type.Object({ "ok": Type.Literal(false), "status": Type.Literal(500), "code": Type.Literal("artifact_unavailable") }, { additionalProperties: false }), Type.Object({ "ok": Type.Literal(true), "status": Type.Literal(200), "artifact": Type.Ref("ArtifactRef"), "acceptRanges": Type.Literal("bytes"), "contentLength": Type.Integer({ minimum: 0, maximum: 1048576 }), "etag": Type.String({ pattern: '^"[0-9a-f]{64}"$' }), "base64": Type.String({ maxLength: 1398104, pattern: "^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$" }) }, { additionalProperties: false }), Type.Object({ "ok": Type.Literal(true), "status": Type.Literal(206), "artifact": Type.Ref("ArtifactRef"), "acceptRanges": Type.Literal("bytes"), "contentLength": Type.Integer({ minimum: 0, maximum: 1048576 }), "etag": Type.String({ pattern: '^"[0-9a-f]{64}"$' }), "contentRange": Type.String({ maxLength: 128, pattern: "^bytes [0-9]+-[0-9]+/[0-9]+$" }), "base64": Type.String({ maxLength: 1398104, pattern: "^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$" }) }, { additionalProperties: false })]),
  "ConfigAccountInput": Type.Object({ "accountId": Type.String({ maxLength: 48, pattern: "^[a-z0-9][a-z0-9-]{0,47}$" }), "action": Type.Union([Type.Literal("enable"), Type.Literal("disable"), Type.Literal("remove"), Type.Literal("default")]), "expectedRevision": Type.Integer({ minimum: 0 }) }, { additionalProperties: false }),
  "PackageAdminPermission": Type.Union([Type.Literal("packages.read"), Type.Literal("packages.install"), Type.Literal("packages.trust"), Type.Literal("packages.activate"), Type.Literal("packages.remove"), Type.Literal("catalog.configure"), Type.Literal("extensions.execute")]),
  "PackageSource": Type.Union([Type.Object({ "type": Type.Literal("npm"), "ref": Type.String({ minLength: 1, maxLength: 1024, pattern: "^npm:(?:@[a-z0-9][a-z0-9._-]*/)?[a-z0-9][a-z0-9._-]*@(?=.{1,64}$)(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*))(?:\\.(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$" }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("file"), "ref": Type.String({ minLength: 1, maxLength: 1024, pattern: "^file:\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("workspace"), "ref": Type.String({ minLength: 1, maxLength: 1024, pattern: "^workspace:extensions/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("git"), "ref": Type.String({ minLength: 1, maxLength: 1024, pattern: "^git:", format: "agnes-git-source" }) }, { additionalProperties: false })]),
  "PackageContributionSummary": Type.Union([Type.Object({ "kind": Type.Literal("client"), "id": Type.String({ pattern: "^plugin/[0-9a-f]{16}$" }), "rowId": Type.String({ minLength: 1, maxLength: 256 }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "client": Type.Ref("ClientContribution"), "skins": Type.Optional(Type.Array(Type.Ref("SkinContribution"), { minItems: 1, maxItems: 16 })) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("client"), "id": Type.String({ pattern: "^plugin/[0-9a-f]{16}$" }), "rowId": Type.String({ minLength: 1, maxLength: 256 }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "skins": Type.Array(Type.Ref("SkinContribution"), { minItems: 1, maxItems: 16 }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("extension"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "apiRange": Type.String({ minLength: 1, maxLength: 64 }), "capabilities": Type.Ref("Capabilities"), "client": Type.Optional(Type.Ref("ClientContribution")), "runtimeSupports": Type.Optional(Type.Array(Type.Union([Type.Literal("in-process"), Type.Literal("isolated")]), { minItems: 1, maxItems: 2, uniqueItems: true })) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("seam"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "apiRange": Type.String({ minLength: 1, maxLength: 64 }), "provides": Type.Array(Type.Ref("SeamName"), { minItems: 1, maxItems: 32, uniqueItems: true }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("provider"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "apiRange": Type.String({ minLength: 1, maxLength: 64 }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("runtime"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }), "apiRange": Type.String({ minLength: 1, maxLength: 64 }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("skill"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("preset"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "path": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\x00:]+)*$" }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("surface"), "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "descriptor": Type.Ref("SurfaceDescriptor") }, { additionalProperties: false })]),
  "PackageCapabilityDiff": Type.Object({ "added": Type.Array(Type.String({ minLength: 1, maxLength: 256 }), { maxItems: 128 }), "removed": Type.Array(Type.String({ minLength: 1, maxLength: 256 }), { maxItems: 128 }), "runtimeSupportRemoved": Type.Array(Type.String({ minLength: 1, maxLength: 256 }), { maxItems: 128 }), "dependenciesAdded": Type.Array(Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), { maxItems: 128 }), "serviceGrantsAdded": Type.Array(Type.Ref("SurfaceServiceGrant"), { maxItems: 128 }) }, { additionalProperties: false }),
  "PackageBlocker": Type.Object({ "code": Type.Union([Type.Literal("dependency"), Type.Literal("profile"), Type.Literal("generation"), Type.Literal("deployment"), Type.Literal("policy"), Type.Literal("incompatible"), Type.Literal("unknown-contribution")]), "references": Type.Array(Type.String({ minLength: 1, maxLength: 256 }), { maxItems: 128 }) }, { additionalProperties: false }),
  "PackageWarning": Type.Object({ "code": Type.Union([Type.Literal("unverified-provenance"), Type.Literal("unlicensed"), Type.Literal("capability-change"), Type.Literal("runtime-support-change"), Type.Literal("dependency-change"), Type.Literal("service-grant-change")]), "safeMessage": Type.String({ minLength: 1, maxLength: 512 }) }, { additionalProperties: false }),
  "PackageProvenance": Type.Object({ "source": Type.Ref("PackageSource"), "integrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "releasedAt": Type.Optional(Type.String({ format: "date-time" })), "signatureVerified": Type.Boolean() }, { additionalProperties: false }),
  "PackagePreview": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "version": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*))(?:\\.(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$" }), "source": Type.Ref("PackageSource"), "integrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "license": Type.String({ minLength: 1, maxLength: 64 }), "provenance": Type.Ref("PackageProvenance"), "contributions": Type.Array(Type.Ref("PackageContributionSummary"), { maxItems: 128 }), "capabilityDiff": Type.Ref("PackageCapabilityDiff"), "dependencies": Type.Record(Type.String({ pattern: "^(?=.{1,256}$)(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), Type.String({ minLength: 1, maxLength: 1024 }), { additionalProperties: false, maxProperties: 256 }), "warnings": Type.Array(Type.Ref("PackageWarning"), { maxItems: 128 }), "blockers": Type.Array(Type.Ref("PackageBlocker"), { maxItems: 128 }), "capabilityHash": Type.Optional(Type.String({ minLength: 64, maxLength: 64, pattern: "^[a-f0-9]{64}$" })) }, { additionalProperties: false }),
  "PackageTrustDecision": Type.Object({ "integrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "capabilityHash": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-f0-9]{64}$" }), "decidedAt": Type.String({ format: "date-time" }) }, { additionalProperties: false }),
  "PackageInstalledDescriptor": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "version": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*))(?:\\.(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$" }), "source": Type.Ref("PackageSource"), "integrity": Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" }), "trusted": Type.Boolean(), "desired": Type.Union([Type.Literal("installed-disabled"), Type.Literal("enabled")]), "actual": Type.Union([Type.Literal("not-running"), Type.Literal("starting"), Type.Literal("running"), Type.Literal("failed"), Type.Literal("restart-required"), Type.Literal("unavailable")]), "contributions": Type.Array(Type.Ref("PackageContributionSummary"), { maxItems: 128 }), "blockers": Type.Array(Type.Ref("PackageBlocker"), { maxItems: 128 }), "capabilityHash": Type.Optional(Type.String({ minLength: 64, maxLength: 64, pattern: "^[a-f0-9]{64}$" })), "actualVersion": Type.Optional(Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*))(?:\\.(?:(?:0|[1-9]\\d*)|(?:\\d*[A-Za-z-][0-9A-Za-z-]*)))*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$" })), "actualIntegrity": Type.Optional(Type.String({ minLength: 1, maxLength: 95, pattern: "^(?:sha256-[a-f0-9]{64}|sha512-[A-Za-z0-9+/]{86}==)$" })), "actualReason": Type.Optional(Type.String({ minLength: 1, maxLength: 512 })), "cleanupPending": Type.Optional(Type.Boolean()), "rollbackTarget": Type.Optional(Type.Union([Type.Ref("PackageRollbackTarget"), Type.Null()])) }, { additionalProperties: false }),
  "PackageAdminError": Type.Object({ "code": Type.Union([Type.Literal("E_PACKAGE_SOURCE"), Type.Literal("E_PACKAGE_INTEGRITY"), Type.Literal("E_PACKAGE_TRUST"), Type.Literal("E_PACKAGE_STATE"), Type.Literal("E_PACKAGE_BLOCKED"), Type.Literal("E_PACKAGE_PREVIEW_STALE"), Type.Literal("E_PACKAGE_CANCELLED")]), "safeMessage": Type.String({ minLength: 1, maxLength: 512 }), "blockers": Type.Array(Type.Ref("PackageBlocker"), { maxItems: 128 }) }, { additionalProperties: false }),
  "RuntimePinDescriptor": Type.Object({ "pinId": Type.String({ minLength: 1, maxLength: 256 }), "purpose": Type.Union([Type.Literal("active"), Type.Literal("candidate"), Type.Literal("recovery"), Type.Literal("rollback"), Type.Literal("turn")]), "packageId": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?:@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?)$" }), "version": Type.String({ minLength: 1, maxLength: 64 }), "snapshotId": Type.String({ minLength: 1, maxLength: 128 }), "operationId": Type.String({ minLength: 1, maxLength: 128 }) }, { additionalProperties: false }),
  "RuntimePinReleaseResult": Type.Object({ "pinId": Type.String({ minLength: 1, maxLength: 256 }), "outcome": Type.Union([Type.Literal("released"), Type.Literal("skipped-no-longer-orphaned"), Type.Literal("failed")]), "error": Type.Optional(Type.Ref("PackageAdminError")) }, { additionalProperties: false }),
  "PluginTreeArtifact": Type.Object({ "encoding": Type.Literal("base64"), "canonicalBase64": Type.String({ minLength: 4, maxLength: 16776788, pattern: "^[A-Za-z0-9+/]+={0,2}$" }), "digest": Type.String({ pattern: "^sha256-[0-9a-f]{64}$" }), "identity": Type.Object({ "treeHash": Type.String({ pattern: "^[0-9a-f]{64}$" }), "resourceRevision": Type.String({ pattern: "^[0-9a-f]{64}$" }), "compositeRevision": Type.String({ pattern: "^[0-9a-f]{64}$" }) }, { additionalProperties: false }) }, { additionalProperties: false }),
  "SurfaceDescriptor": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z][a-z0-9-]{0,63}$" }), "apiRange": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:(?:>=|<=|>|<|=|\\^|~)?(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|\\^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|(?:0|[1-9][0-9]*)(?:\\.(?:0|[1-9][0-9]*))?\\.(?:x|\\*)|\\*)(?: +(?:(?:>=|<=|>|<|=|\\^|~)?(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|\\^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|(?:0|[1-9][0-9]*)(?:\\.(?:0|[1-9][0-9]*))?\\.(?:x|\\*)|\\*))*$" }), "artifact": Type.Ref("SurfaceArtifact"), "healthPath": Type.String({ minLength: 1, maxLength: 256, pattern: "^/(?:[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*)?$" }), "requires": Type.Object({ "services": Type.Array(Type.Ref("SurfaceServiceGrant"), { maxItems: 64, uniqueItems: true }) }, { additionalProperties: false }) }, { additionalProperties: false }),
  "SurfaceArtifact": Type.Union([Type.Object({ "kind": Type.Literal("node"), "entry": Type.String({ minLength: 1, maxLength: 512, pattern: "^\\./dist/(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+)*\\.(?:js|mjs|cjs)$" }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("oci"), "image": Type.String({ minLength: 1, maxLength: 512, pattern: "^[a-z0-9]+(?:[.-][a-z0-9]+)*(?::[0-9]{1,5})?/(?:[a-z0-9]+(?:[._-][a-z0-9]+)*/)*[a-z0-9]+(?:[._-][a-z0-9]+)*@sha256:[a-f0-9]{64}$" }) }, { additionalProperties: false })]),
  "SurfaceServiceGrant": Type.Object({ "extension": Type.String({ minLength: 1, maxLength: 256, pattern: "^[a-z0-9-]+/[a-z0-9-]+$" }), "name": Type.String({ minLength: 1, maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "range": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?:(?:>=|<=|>|<|=|\\^|~)?(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|\\^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|(?:0|[1-9][0-9]*)(?:\\.(?:0|[1-9][0-9]*))?\\.(?:x|\\*)|\\*)(?: +(?:(?:>=|<=|>|<|=|\\^|~)?(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|\\^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)|(?:0|[1-9][0-9]*)(?:\\.(?:0|[1-9][0-9]*))?\\.(?:x|\\*)|\\*))*$" }) }, { additionalProperties: false }),
  "Capabilities": Type.Object({ "tools": Type.Optional(Type.Object({ "prefix": Type.String({ pattern: "^(?:[a-z][a-z0-9_]{0,31}_)?$" }), "names": Type.Optional(Type.Array(Type.String({ pattern: "^[A-Za-z_][A-Za-z0-9_]{0,63}$" }))) }, { additionalProperties: false })), "tools.invoke": Type.Optional(Type.Boolean()), "hooks": Type.Optional(Type.Array(Type.Ref("HookEvent"))), "slots": Type.Optional(Type.Array(Type.Ref("UiSlotName"))), "events": Type.Optional(Type.Boolean()), "ui": Type.Optional(Type.Array(Type.Union([Type.Literal("skin"), Type.Literal("client")]), { maxItems: 8, uniqueItems: true })), "resources": Type.Optional(Type.Array(Type.Union([Type.Literal("skill"), Type.Literal("mcp"), Type.Literal("kb"), Type.Literal("datasource"), Type.Literal("model")]))), "network.publicRead": Type.Optional(Type.Boolean()), "network": Type.Optional(Type.Union([Type.Array(Type.String(), { maxItems: 0 }), Type.Object({ "hosts": Type.Array(Type.String({ pattern: "^[a-z0-9.-]+(:[0-9]{1,5})?$" })) }, { additionalProperties: false })])), "artifacts": Type.Optional(Type.Boolean()), "subagent": Type.Optional(Type.Boolean()), "services": Type.Optional(Type.Array(Type.Ref("ServiceCapability"), { uniqueItems: true })), "projections": Type.Optional(Type.Array(Type.Ref("ProjectionCapability"), { uniqueItems: true })) }, { additionalProperties: false }),
  "ClientContribution": Type.Object({ "id": Type.Optional(Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$" })), "entry": Type.String({ minLength: 1, maxLength: 512 }), "styles": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 512 }), { maxItems: 32 })), "slots": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 128 }), { maxItems: 32 })), "slotCatalogVersion": Type.Optional(Type.String({ pattern: "^dsh-client-slots/v[0-9]+$" })), "services": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 128 }), { maxItems: 32 })), "projections": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 128 }), { maxItems: 32 })), "legacyRowIds": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 256, pattern: "^web:[^\\x00]{1,251}$" }), { maxItems: 16, uniqueItems: true })), "publicConfig": Type.Optional(Type.Record(Type.String(), JsonValue10)) }, { additionalProperties: false }),
  "SkinContribution": Type.Object({ "id": Type.String({ minLength: 1, maxLength: 64, pattern: "^(?!(?:light|dark|system|none)$)[a-z0-9]+(?:-[a-z0-9]+)*$" }), "name": Type.String({ minLength: 1, maxLength: 64 }), "css": Type.String({ minLength: 3, maxLength: 256, pattern: "^\\./" }), "tokens": Type.Optional(Type.Record(Type.String(), Type.Object({ "light": Type.Ref("SkinTokenValue"), "dark": Type.Ref("SkinTokenValue") }, { additionalProperties: false }))) }, { additionalProperties: false }),
  "SkinTokenValue": Type.String({ minLength: 1, maxLength: 256, pattern: "^(?!.*url\\()[^;{}@]*$" }),
  "HookEvent": Type.Union([Type.Literal("session_start"), Type.Literal("resources_discover"), Type.Literal("before_step"), Type.Literal("context"), Type.Literal("before_request"), Type.Literal("request_error"), Type.Literal("tool_call"), Type.Literal("tool_result"), Type.Literal("turn_stopping"), Type.Literal("approval_request"), Type.Literal("before_compact"), Type.Literal("compact"), Type.Literal("subagent_start"), Type.Literal("subagent_end"), Type.Literal("format_deviation"), Type.Literal("shutdown")]),
  "UiSlotName": Type.Union([Type.Literal("tool.card.inline"), Type.Literal("sidebar.action"), Type.Literal("status.line"), Type.Literal("notification")]),
  "SeamName": Type.Union([Type.Literal("approval"), Type.Literal("checkpoint"), Type.Literal("ledger"), Type.Literal("sandbox"), Type.Literal("verifier"), Type.Literal("repair"), Type.Literal("artifacts"), Type.Literal("principals"), Type.Literal("platform"), Type.Literal("harness")]),
  "ProjectionCapability": Type.Object({ "name": Type.String({ maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "inputEventTypes": Type.Array(Type.String({ minLength: 1, maxLength: 128, pattern: "^[a-z][a-z0-9]*(?:[./-][a-z0-9]+)*$" }), { minItems: 1, uniqueItems: true }), "maxStateBytes": Type.Integer({ minimum: 1, maximum: 262144 }) }, { additionalProperties: false }),
  "ParametersSchema": Type.Object({ "type": Type.Literal("object"), "properties": Type.Record(Type.String(), JsonValue10), "required": Type.Optional(Type.Array(Type.String())), "additionalProperties": Type.Literal(false), "description": Type.Optional(Type.String({ maxLength: 2048 })) }, { additionalProperties: false }),
  "ChannelCredential": Type.Object({ "kind": Type.Literal("channel"), "channel": Type.String({ maxLength: 32 }), "accountId": Type.String({ maxLength: 128 }), "userId": Type.String({ maxLength: 256 }), "unionId": Type.Optional(Type.String({ maxLength: 256 })), "chatId": Type.String({ maxLength: 256 }), "chatType": Type.Union([Type.Literal("dm"), Type.Literal("group"), Type.Literal("thread")]), "displayName": Type.Optional(Type.String({ maxLength: 256 })), "raw": Type.Optional(Type.Record(Type.String(), Type.String({ maxLength: 1024 }))) }, { additionalProperties: false }),
  "Billing": Type.Object({ "usdMicros": Type.Integer({ minimum: 0 }), "source": Type.Union([Type.Literal("gateway"), Type.Literal("estimated")]), "subscription": Type.Boolean() }, { additionalProperties: false }),
  "ServiceCapability": Type.Object({ "name": Type.String({ maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "kind": Type.Union([Type.Literal("query"), Type.Literal("effect")]), "inputSchema": Type.Ref("ParametersSchema"), "outputSchema": Type.Record(Type.String(), JsonValue10), "timeoutMs": Type.Integer({ minimum: 1, maximum: 3e4 }), "maxResultBytes": Type.Integer({ minimum: 1, maximum: 1048576 }) }, { additionalProperties: false }),
  "Schedule": Type.Union([Type.Object({ "kind": Type.Literal("once") }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("at"), "at": Type.Integer({ minimum: 0 }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("every"), "everyMs": Type.Integer({ minimum: 1e3 }), "anchorMs": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("cron"), "expr": Type.String({ maxLength: 128 }), "tz": Type.Optional(Type.String({ maxLength: 64 })), "staggerMs": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false })]),
  "ThinkingLevel": Type.Union([Type.Literal("off"), Type.Literal("minimal"), Type.Literal("low"), Type.Literal("medium"), Type.Literal("high"), Type.Literal("xhigh"), Type.Literal("max")]),
  "ModelSettings": Type.Object({ "thinking": Type.Optional(Type.Ref("ThinkingLevel")), "contextWindow": Type.Optional(Type.Integer({ minimum: 1, maximum: 9007199254740991 })) }, { additionalProperties: false }),
  "ModelInputLimits": Type.Object({ "maxRequestBytes": Type.Optional(Type.Integer({ minimum: 1 })), "images": Type.Optional(Type.Object({ "maxPerMessage": Type.Optional(Type.Integer({ minimum: 1 })), "maxPerRequest": Type.Optional(Type.Integer({ minimum: 1 })), "resize": Type.Optional(Type.Object({ "maxWidth": Type.Optional(Type.Integer({ minimum: 1 })), "maxHeight": Type.Optional(Type.Integer({ minimum: 1 })), "maxBytes": Type.Optional(Type.Integer({ minimum: 1 })), "jpegQuality": Type.Optional(Type.Number({ minimum: 1, maximum: 100 })) }, { additionalProperties: false })) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "TokenCounts": Type.Object({ "input": Type.Integer({ minimum: 0 }), "output": Type.Integer({ minimum: 0 }), "cacheRead": Type.Integer({ minimum: 0 }), "cacheWrite": Type.Integer({ minimum: 0 }), "reasoning": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false })
});
var ExtensionCallParams = AgnesV1.Import("ExtensionCallParams");
var ExtensionCallResult2 = AgnesV1.Import("ExtensionCallResult");
var ExtensionAckParams = AgnesV1.Import("ExtensionAckParams");
var ExtensionCallError = AgnesV1.Import("ExtensionCallError");
var ContentBlock4 = AgnesV1.Import("ContentBlock");
var Actor4 = AgnesV1.Import("Actor");
var SurfaceOp2 = AgnesV1.Import("SurfaceOp");
var EventEnvelope2 = AgnesV1.Import("EventEnvelope");
var HarnessMeta = AgnesV1.Import("HarnessMeta");
var Auth2 = AgnesV1.Import("Auth");
var Credential2 = AgnesV1.Import("Credential");
var DirectoryEntry2 = AgnesV1.Import("DirectoryEntry");
var InitializeMeta = AgnesV1.Import("InitializeMeta");
var NewSessionMeta = AgnesV1.Import("NewSessionMeta");
var Cursor = AgnesV1.Import("Cursor");
var AttachFilter = AgnesV1.Import("AttachFilter");
var SessionAttachParams = AgnesV1.Import("SessionAttachParams");
var SessionAttachResult = AgnesV1.Import("SessionAttachResult");
var SessionSteerParams = AgnesV1.Import("SessionSteerParams");
var SessionSendNowParams = AgnesV1.Import("SessionSendNowParams");
var SessionRemoveQueuedParams = AgnesV1.Import("SessionRemoveQueuedParams");
var SessionSteerResult = AgnesV1.Import("SessionSteerResult");
var SessionCompactParams = AgnesV1.Import("SessionCompactParams");
var ApisListParams = AgnesV1.Import("ApisListParams");
var ApisListResult = AgnesV1.Import("ApisListResult");
var SubmitParams = AgnesV1.Import("SubmitParams");
var CommandAckParams = AgnesV1.Import("CommandAckParams");
var Ack = AgnesV1.Import("Ack");
var CompactOutcome = AgnesV1.Import("CompactOutcome");
var ErrorData = AgnesV1.Import("ErrorData");
var SessionIdParams = AgnesV1.Import("SessionIdParams");
var ApprovalGrantListParams = AgnesV1.Import("ApprovalGrantListParams");
var ApprovalGrantRecord = AgnesV1.Import("ApprovalGrantRecord");
var ApprovalGrantRevokeParams = AgnesV1.Import("ApprovalGrantRevokeParams");
var ApprovalGrantListResult = AgnesV1.Import("ApprovalGrantListResult");
var Empty = AgnesV1.Import("Empty");
var ComputerUseLockedPackageMutationStatus = AgnesV1.Import("ComputerUseLockedPackageMutationStatus");
var ComputerUseStatusResult = AgnesV1.Import("ComputerUseStatusResult");
var ComputerUsePermissionsStatusResult = AgnesV1.Import("ComputerUsePermissionsStatusResult");
var ComputerUseDoctorParams = AgnesV1.Import("ComputerUseDoctorParams");
var ComputerUseDoctorResult = AgnesV1.Import("ComputerUseDoctorResult");
var ComputerUseOperationStartParams = AgnesV1.Import("ComputerUseOperationStartParams");
var ComputerUseOperationStatusParams = AgnesV1.Import("ComputerUseOperationStatusParams");
var ComputerUseOperationIdParams = AgnesV1.Import("ComputerUseOperationIdParams");
var ComputerUseOperationResult = AgnesV1.Import("ComputerUseOperationResult");
var AuthClaimParams = AgnesV1.Import("AuthClaimParams");
var AuthClaimResult = AgnesV1.Import("AuthClaimResult");
var SessionEventParams = AgnesV1.Import("SessionEventParams");
var SessionPreviewParams = AgnesV1.Import("SessionPreviewParams");
var DaemonNotice = AgnesV1.Import("DaemonNotice");
var BudgetState2 = AgnesV1.Import("BudgetState");
var ArtifactRef2 = AgnesV1.Import("ArtifactRef");
var ArtifactJob2 = AgnesV1.Import("ArtifactJob");
var JobSpec2 = AgnesV1.Import("JobSpec");
var JobStatus2 = AgnesV1.Import("JobStatus");
var SessionBudgetResult = AgnesV1.Import("SessionBudgetResult");
var SessionProjectUIParams = AgnesV1.Import("SessionProjectUIParams");
var SessionProjectUIPatchParams = AgnesV1.Import("SessionProjectUIPatchParams");
var SessionProjectUIOpeningParams = AgnesV1.Import("SessionProjectUIOpeningParams");
var UIHistoryCursor = AgnesV1.Import("UIHistoryCursor");
var SessionProjectUIHistoryParams = AgnesV1.Import("SessionProjectUIHistoryParams");
var SessionReadToolDetailParams = AgnesV1.Import("SessionReadToolDetailParams");
var SessionReadToolDetailResult = AgnesV1.Import("SessionReadToolDetailResult");
var SlotFillView = AgnesV1.Import("SlotFillView");
var UINode = AgnesV1.Import("UINode");
var UsageView = AgnesV1.Import("UsageView");
var UITurnCall = AgnesV1.Import("UITurnCall");
var UITurnUsage = AgnesV1.Import("UITurnUsage");
var UITurn = AgnesV1.Import("UITurn");
var UIOperationState = AgnesV1.Import("UIOperationState");
var UIPendingInput = AgnesV1.Import("UIPendingInput");
var UITimeline = AgnesV1.Import("UITimeline");
var UIHistoryInfo = AgnesV1.Import("UIHistoryInfo");
var UIOpeningResult = AgnesV1.Import("UIOpeningResult");
var UIHistoryPage = AgnesV1.Import("UIHistoryPage");
var UIProjectionNodeChange = AgnesV1.Import("UIProjectionNodeChange");
var UIProjectionTurnChange = AgnesV1.Import("UIProjectionTurnChange");
var UITimelinePatch = AgnesV1.Import("UITimelinePatch");
var UIProjectionUpdate = AgnesV1.Import("UIProjectionUpdate");
var JwtCredential2 = AgnesV1.Import("JwtCredential");
var SourceAuthCredential2 = AgnesV1.Import("SourceAuthCredential");
var PortalIdentityCredential2 = AgnesV1.Import("PortalIdentityCredential");
var LocalCredential2 = AgnesV1.Import("LocalCredential");
var SurfaceAuthCredential2 = AgnesV1.Import("SurfaceAuthCredential");
var SlotName2 = AgnesV1.Import("SlotName");
var SessionForkParams = AgnesV1.Import("SessionForkParams");
var WorkspaceEntry = AgnesV1.Import("WorkspaceEntry");
var WorkspaceListParams = AgnesV1.Import("WorkspaceListParams");
var WorkspaceListResult = AgnesV1.Import("WorkspaceListResult");
var WorkspaceAddParams = AgnesV1.Import("WorkspaceAddParams");
var WorkspaceAddResult = AgnesV1.Import("WorkspaceAddResult");
var SurfacesMountsParams = AgnesV1.Import("SurfacesMountsParams");
var SurfacesMountsResult = AgnesV1.Import("SurfacesMountsResult");
var SessionPreferences = AgnesV1.Import("SessionPreferences");
var SessionRenameParams = AgnesV1.Import("SessionRenameParams");
var SessionArchiveParams = AgnesV1.Import("SessionArchiveParams");
var DiagnosticsCollectParams = AgnesV1.Import("DiagnosticsCollectParams");
var DiagnosticsCollectResult = AgnesV1.Import("DiagnosticsCollectResult");
var DiagnosticsEventsParams = AgnesV1.Import("DiagnosticsEventsParams");
var DiagnosticsEventsResult = AgnesV1.Import("DiagnosticsEventsResult");
var SessionMeta = AgnesV1.Import("SessionMeta");
var SessionListParams = AgnesV1.Import("SessionListParams");
var PageSessionMeta = AgnesV1.Import("PageSessionMeta");
var SessionSetPresetParams = AgnesV1.Import("SessionSetPresetParams");
var SessionSetModelParams = AgnesV1.Import("SessionSetModelParams");
var SessionSetYoloParams = AgnesV1.Import("SessionSetYoloParams");
var EffectiveFromResult = AgnesV1.Import("EffectiveFromResult");
var SeqResult = AgnesV1.Import("SeqResult");
var ApprovalDecideParams = AgnesV1.Import("ApprovalDecideParams");
var ParticipantParams = AgnesV1.Import("ParticipantParams");
var ParticipantListResult = AgnesV1.Import("ParticipantListResult");
var DirectoryUpsertParams = AgnesV1.Import("DirectoryUpsertParams");
var DirectoryUpsertResult = AgnesV1.Import("DirectoryUpsertResult");
var JobIdParams = AgnesV1.Import("JobIdParams");
var JobIdResult = AgnesV1.Import("JobIdResult");
var ExtUiResponseParams = AgnesV1.Import("ExtUiResponseParams");
var ConfigOAuthInput = AgnesV1.Import("ConfigOAuthInput");
var ConfigOAuthPrompt = AgnesV1.Import("ConfigOAuthPrompt");
var ConfigOAuthNotice = AgnesV1.Import("ConfigOAuthNotice");
var ConfigOAuthResult = AgnesV1.Import("ConfigOAuthResult");
var ConfigProvider = AgnesV1.Import("ConfigProvider");
var ConfigModel = AgnesV1.Import("ConfigModel");
var ConfigSnapshot = AgnesV1.Import("ConfigSnapshot");
var ConfigTestInput = AgnesV1.Import("ConfigTestInput");
var ConfigSaveInput = AgnesV1.Import("ConfigSaveInput");
var ConfigTestResult = AgnesV1.Import("ConfigTestResult");
var ConfigProvidersResult = AgnesV1.Import("ConfigProvidersResult");
var ConfigEmptyParams = AgnesV1.Import("ConfigEmptyParams");
var PackageCatalogListParams2 = AgnesV1.Import("PackageCatalogListParams");
var PackageCatalogPage2 = AgnesV1.Import("PackageCatalogPage");
var PackageCatalogGetParams2 = AgnesV1.Import("PackageCatalogGetParams");
var PackageCatalogDescriptor2 = AgnesV1.Import("PackageCatalogDescriptor");
var PackageListParams2 = AgnesV1.Import("PackageListParams");
var SkinReadParams2 = AgnesV1.Import("SkinReadParams");
var ClientModuleReadParams2 = AgnesV1.Import("ClientModuleReadParams");
var PackageListResult2 = AgnesV1.Import("PackageListResult");
var PackageInspectParams2 = AgnesV1.Import("PackageInspectParams");
var PackageOperationReceipt2 = AgnesV1.Import("PackageOperationReceipt");
var PackageInstallParams2 = AgnesV1.Import("PackageInstallParams");
var PackageTrustParams2 = AgnesV1.Import("PackageTrustParams");
var PackageUntrustParams2 = AgnesV1.Import("PackageUntrustParams");
var PackageActivationTrust2 = AgnesV1.Import("PackageActivationTrust");
var PackageActivationRequest2 = AgnesV1.Import("PackageActivationRequest");
var PackageRollbackTarget2 = AgnesV1.Import("PackageRollbackTarget");
var PackageAdminContext2 = AgnesV1.Import("PackageAdminContext");
var PackageEnableParams2 = AgnesV1.Import("PackageEnableParams");
var PackageDisableParams2 = AgnesV1.Import("PackageDisableParams");
var PackageUpdateParams2 = AgnesV1.Import("PackageUpdateParams");
var PackageRollbackParams2 = AgnesV1.Import("PackageRollbackParams");
var PackageRemoveParams2 = AgnesV1.Import("PackageRemoveParams");
var PackageOperationGetParams2 = AgnesV1.Import("PackageOperationGetParams");
var PackageOperation2 = AgnesV1.Import("PackageOperation");
var PackageOperationCancelParams2 = AgnesV1.Import("PackageOperationCancelParams");
var PackagePinsInspectParams2 = AgnesV1.Import("PackagePinsInspectParams");
var PackagePinsInspectResult2 = AgnesV1.Import("PackagePinsInspectResult");
var PackagePinsReleaseParams2 = AgnesV1.Import("PackagePinsReleaseParams");
var PackagePinsReleaseResult2 = AgnesV1.Import("PackagePinsReleaseResult");
var PackageTrustWorkspaceParams2 = AgnesV1.Import("PackageTrustWorkspaceParams");
var PackageTrustWorkspaceResult2 = AgnesV1.Import("PackageTrustWorkspaceResult");
var PluginTreeApplyParams2 = AgnesV1.Import("PluginTreeApplyParams");
var PluginTreeRollbackParams2 = AgnesV1.Import("PluginTreeRollbackParams");
var PluginTreeView2 = AgnesV1.Import("PluginTreeView");
var PluginTreeApplyResult2 = AgnesV1.Import("PluginTreeApplyResult");
var PluginTreeRollbackResult2 = AgnesV1.Import("PluginTreeRollbackResult");
var ConfigAccount = AgnesV1.Import("ConfigAccount");
var ArtifactReadParams = AgnesV1.Import("ArtifactReadParams");
var ArtifactReadResult = AgnesV1.Import("ArtifactReadResult");
var ConfigAccountInput = AgnesV1.Import("ConfigAccountInput");
var PackageAdminPermission2 = AgnesV1.Import("PackageAdminPermission");
var PackageSource2 = AgnesV1.Import("PackageSource");
var PackageContributionSummary3 = AgnesV1.Import("PackageContributionSummary");
var PackageCapabilityDiff2 = AgnesV1.Import("PackageCapabilityDiff");
var PackageBlocker2 = AgnesV1.Import("PackageBlocker");
var PackageWarning2 = AgnesV1.Import("PackageWarning");
var PackageProvenance2 = AgnesV1.Import("PackageProvenance");
var PackagePreview2 = AgnesV1.Import("PackagePreview");
var PackageTrustDecision3 = AgnesV1.Import("PackageTrustDecision");
var PackageInstalledDescriptor2 = AgnesV1.Import("PackageInstalledDescriptor");
var PackageAdminError2 = AgnesV1.Import("PackageAdminError");
var RuntimePinDescriptor2 = AgnesV1.Import("RuntimePinDescriptor");
var RuntimePinReleaseResult2 = AgnesV1.Import("RuntimePinReleaseResult");
var PluginTreeArtifact2 = AgnesV1.Import("PluginTreeArtifact");
var SurfaceDescriptor4 = AgnesV1.Import("SurfaceDescriptor");
var SurfaceArtifact4 = AgnesV1.Import("SurfaceArtifact");
var SurfaceServiceGrant4 = AgnesV1.Import("SurfaceServiceGrant");
var Capabilities4 = AgnesV1.Import("Capabilities");
var ClientContribution4 = AgnesV1.Import("ClientContribution");
var SkinContribution4 = AgnesV1.Import("SkinContribution");
var SkinTokenValue4 = AgnesV1.Import("SkinTokenValue");
var HookEvent6 = AgnesV1.Import("HookEvent");
var UiSlotName4 = AgnesV1.Import("UiSlotName");
var SeamName5 = AgnesV1.Import("SeamName");
var ProjectionCapability4 = AgnesV1.Import("ProjectionCapability");
var ParametersSchema5 = AgnesV1.Import("ParametersSchema");
var ChannelCredential2 = AgnesV1.Import("ChannelCredential");
var Billing2 = AgnesV1.Import("Billing");
var ServiceCapability4 = AgnesV1.Import("ServiceCapability");
var Schedule2 = AgnesV1.Import("Schedule");
var ThinkingLevel4 = AgnesV1.Import("ThinkingLevel");
var ModelSettings3 = AgnesV1.Import("ModelSettings");
var ModelInputLimits2 = AgnesV1.Import("ModelInputLimits");
var TokenCounts = AgnesV1.Import("TokenCounts");

// ../protocol/src/meta.ts
function getHarnessMeta(msg) {
  if (typeof msg !== "object" || msg === null) return void 0;
  const raw = msg._meta?.[META_KEY];
  return value_exports2.Check(HarnessMeta, raw) ? raw : void 0;
}

// ../protocol/gen/ts/acp.ts
if (!format_exports.Has("uri")) format_exports.Set("uri", (v) => {
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
});
var Acp = Type.Module({
  "AgentRequest": Type.Object({ "id": Type.Intersect([Type.Ref("RequestId")]), "method": Type.String(), "params": Type.Optional(Type.Union([Type.Union([Type.Intersect([Type.Ref("WriteTextFileRequest")]), Type.Intersect([Type.Ref("ReadTextFileRequest")]), Type.Intersect([Type.Ref("RequestPermissionRequest")]), Type.Intersect([Type.Ref("CreateTerminalRequest")]), Type.Intersect([Type.Ref("TerminalOutputRequest")]), Type.Intersect([Type.Ref("ReleaseTerminalRequest")]), Type.Intersect([Type.Ref("WaitForTerminalExitRequest")]), Type.Intersect([Type.Ref("KillTerminalRequest")]), Type.Intersect([Type.Ref("CreateElicitationRequest")]), Type.Intersect([Type.Ref("ExtRequest")])]), Type.Null()])) }),
  "RequestId": Type.Union([Type.Null(), Type.Integer(), Type.String()]),
  "WriteTextFileRequest": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "path": Type.String(), "content": Type.String(), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SessionId": Type.String(),
  "ReadTextFileRequest": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "path": Type.String(), "line": Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.Null()])), "limit": Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "RequestPermissionRequest": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "toolCall": Type.Intersect([Type.Ref("ToolCallUpdate")]), "options": Type.Array(Type.Ref("PermissionOption")), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ToolCallUpdate": Type.Object({ "toolCallId": Type.Intersect([Type.Ref("ToolCallId")]), "kind": Type.Optional(Type.Union([Type.Ref("ToolKind"), Type.Null()])), "status": Type.Optional(Type.Union([Type.Ref("ToolCallStatus"), Type.Null()])), "title": Type.Optional(Type.Union([Type.String(), Type.Null()])), "content": Type.Optional(Type.Union([Type.Array(Type.Ref("ToolCallContent")), Type.Null()])), "locations": Type.Optional(Type.Union([Type.Array(Type.Ref("ToolCallLocation")), Type.Null()])), "rawInput": Type.Optional(Type.Unknown()), "rawOutput": Type.Optional(Type.Unknown()), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ToolCallId": Type.String(),
  "ToolKind": Type.Union([Type.Literal("read"), Type.Literal("edit"), Type.Literal("delete"), Type.Literal("move"), Type.Literal("search"), Type.Literal("execute"), Type.Literal("think"), Type.Literal("fetch"), Type.Literal("switch_mode"), Type.Literal("other")]),
  "ToolCallStatus": Type.Union([Type.Literal("pending"), Type.Literal("in_progress"), Type.Literal("completed"), Type.Literal("failed")]),
  "ToolCallContent": Type.Union([Type.Intersect([Type.Object({ "type": Type.Literal("content") }), Type.Ref("Content")]), Type.Intersect([Type.Object({ "type": Type.Literal("diff") }), Type.Ref("Diff")]), Type.Intersect([Type.Object({ "type": Type.Literal("terminal") }), Type.Ref("Terminal")])]),
  "ContentBlock": Type.Union([Type.Intersect([Type.Object({ "type": Type.Literal("text") }), Type.Ref("TextContent")]), Type.Intersect([Type.Object({ "type": Type.Literal("image") }), Type.Ref("ImageContent")]), Type.Intersect([Type.Object({ "type": Type.Literal("audio") }), Type.Ref("AudioContent")]), Type.Intersect([Type.Object({ "type": Type.Literal("resource_link") }), Type.Ref("ResourceLink")]), Type.Intersect([Type.Object({ "type": Type.Literal("resource") }), Type.Ref("EmbeddedResource")])]),
  "Annotations": Type.Object({ "audience": Type.Optional(Type.Union([Type.Array(Type.Ref("Role")), Type.Null()])), "lastModified": Type.Optional(Type.Union([Type.String(), Type.Null()])), "priority": Type.Optional(Type.Union([Type.Number(), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "Role": Type.Union([Type.Literal("assistant"), Type.Literal("user")]),
  "TextContent": Type.Object({ "annotations": Type.Optional(Type.Union([Type.Ref("Annotations"), Type.Null()])), "text": Type.String(), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ImageContent": Type.Object({ "annotations": Type.Optional(Type.Union([Type.Ref("Annotations"), Type.Null()])), "data": Type.String(), "mimeType": Type.String(), "uri": Type.Optional(Type.Union([Type.String(), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "AudioContent": Type.Object({ "annotations": Type.Optional(Type.Union([Type.Ref("Annotations"), Type.Null()])), "data": Type.String(), "mimeType": Type.String(), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ResourceLink": Type.Object({ "annotations": Type.Optional(Type.Union([Type.Ref("Annotations"), Type.Null()])), "description": Type.Optional(Type.Union([Type.String(), Type.Null()])), "mimeType": Type.Optional(Type.Union([Type.String(), Type.Null()])), "name": Type.String(), "size": Type.Optional(Type.Union([Type.Integer(), Type.Null()])), "title": Type.Optional(Type.Union([Type.String(), Type.Null()])), "uri": Type.String(), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "EmbeddedResourceResource": Type.Union([Type.Intersect([Type.Ref("TextResourceContents")]), Type.Intersect([Type.Ref("BlobResourceContents")])]),
  "TextResourceContents": Type.Object({ "mimeType": Type.Optional(Type.Union([Type.String(), Type.Null()])), "text": Type.String(), "uri": Type.String(), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "BlobResourceContents": Type.Object({ "blob": Type.String(), "mimeType": Type.Optional(Type.Union([Type.String(), Type.Null()])), "uri": Type.String(), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "EmbeddedResource": Type.Object({ "annotations": Type.Optional(Type.Union([Type.Ref("Annotations"), Type.Null()])), "resource": Type.Intersect([Type.Ref("EmbeddedResourceResource")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "Content": Type.Object({ "content": Type.Intersect([Type.Ref("ContentBlock")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "Diff": Type.Object({ "path": Type.String(), "oldText": Type.Optional(Type.Union([Type.String(), Type.Null()])), "newText": Type.String(), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "TerminalId": Type.String(),
  "Terminal": Type.Object({ "terminalId": Type.Intersect([Type.Ref("TerminalId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ToolCallLocation": Type.Object({ "path": Type.String(), "line": Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "PermissionOption": Type.Object({ "optionId": Type.Intersect([Type.Ref("PermissionOptionId")]), "name": Type.String(), "kind": Type.Intersect([Type.Ref("PermissionOptionKind")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "PermissionOptionId": Type.String(),
  "PermissionOptionKind": Type.Union([Type.Literal("allow_once"), Type.Literal("allow_always"), Type.Literal("reject_once"), Type.Literal("reject_always")]),
  "CreateTerminalRequest": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "command": Type.String(), "args": Type.Optional(Type.Array(Type.String())), "env": Type.Optional(Type.Array(Type.Ref("EnvVariable"))), "cwd": Type.Optional(Type.Union([Type.String(), Type.Null()])), "outputByteLimit": Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "EnvVariable": Type.Object({ "name": Type.String(), "value": Type.String(), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "TerminalOutputRequest": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "terminalId": Type.Intersect([Type.Ref("TerminalId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ReleaseTerminalRequest": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "terminalId": Type.Intersect([Type.Ref("TerminalId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "WaitForTerminalExitRequest": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "terminalId": Type.Intersect([Type.Ref("TerminalId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "KillTerminalRequest": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "terminalId": Type.Intersect([Type.Ref("TerminalId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "CreateElicitationRequest": Type.Unknown(),
  "ElicitationSessionScope": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "toolCallId": Type.Optional(Type.Union([Type.Ref("ToolCallId"), Type.Null()])) }),
  "ElicitationRequestScope": Type.Object({ "requestId": Type.Intersect([Type.Ref("RequestId")]) }),
  "ElicitationSchema": Type.Object({ "type": Type.Optional(Type.Intersect([Type.Ref("ElicitationSchemaType")])), "title": Type.Optional(Type.Union([Type.String(), Type.Null()])), "properties": Type.Optional(Type.Record(Type.String(), Type.Ref("ElicitationPropertySchema"))), "required": Type.Optional(Type.Union([Type.Array(Type.String()), Type.Null()])), "description": Type.Optional(Type.Union([Type.String(), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ElicitationSchemaType": Type.Union([Type.Literal("object")]),
  "ElicitationPropertySchema": Type.Unknown(),
  "StringFormat": Type.Union([Type.Literal("email"), Type.Literal("uri"), Type.Literal("date"), Type.Literal("date-time")]),
  "EnumOption": Type.Object({ "const": Type.String(), "title": Type.String(), "description": Type.Optional(Type.Union([Type.String(), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "StringPropertySchema": Type.Object({ "title": Type.Optional(Type.Union([Type.String(), Type.Null()])), "description": Type.Optional(Type.Union([Type.String(), Type.Null()])), "minLength": Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.Null()])), "maxLength": Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.Null()])), "pattern": Type.Optional(Type.Union([Type.String(), Type.Null()])), "format": Type.Optional(Type.Union([Type.Ref("StringFormat"), Type.Null()])), "default": Type.Optional(Type.Union([Type.String(), Type.Null()])), "enum": Type.Optional(Type.Union([Type.Array(Type.String()), Type.Null()])), "oneOf": Type.Optional(Type.Union([Type.Array(Type.Ref("EnumOption")), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "NumberPropertySchema": Type.Object({ "title": Type.Optional(Type.Union([Type.String(), Type.Null()])), "description": Type.Optional(Type.Union([Type.String(), Type.Null()])), "minimum": Type.Optional(Type.Union([Type.Number(), Type.Null()])), "maximum": Type.Optional(Type.Union([Type.Number(), Type.Null()])), "default": Type.Optional(Type.Union([Type.Number(), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "IntegerPropertySchema": Type.Object({ "title": Type.Optional(Type.Union([Type.String(), Type.Null()])), "description": Type.Optional(Type.Union([Type.String(), Type.Null()])), "minimum": Type.Optional(Type.Union([Type.Integer(), Type.Null()])), "maximum": Type.Optional(Type.Union([Type.Integer(), Type.Null()])), "default": Type.Optional(Type.Union([Type.Integer(), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "BooleanPropertySchema": Type.Object({ "title": Type.Optional(Type.Union([Type.String(), Type.Null()])), "description": Type.Optional(Type.Union([Type.String(), Type.Null()])), "default": Type.Optional(Type.Union([Type.Boolean(), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "MultiSelectItems": Type.Unknown(),
  "StringMultiSelectItems": Type.Object({ "enum": Type.Array(Type.String()), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "TitledMultiSelectItems": Type.Object({ "anyOf": Type.Array(Type.Ref("EnumOption")), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "MultiSelectPropertySchema": Type.Object({ "title": Type.Optional(Type.Union([Type.String(), Type.Null()])), "description": Type.Optional(Type.Union([Type.String(), Type.Null()])), "minItems": Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.Null()])), "maxItems": Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.Null()])), "items": Type.Intersect([Type.Ref("MultiSelectItems")]), "default": Type.Optional(Type.Union([Type.Array(Type.String()), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ElicitationFormMode": Type.Union([Type.Intersect([Type.Object({ "requestedSchema": Type.Intersect([Type.Ref("ElicitationSchema")]) }), Type.Intersect([Type.Ref("ElicitationSessionScope")])]), Type.Intersect([Type.Object({ "requestedSchema": Type.Intersect([Type.Ref("ElicitationSchema")]) }), Type.Intersect([Type.Ref("ElicitationRequestScope")])])]),
  "ElicitationId": Type.String(),
  "ElicitationUrlMode": Type.Union([Type.Intersect([Type.Object({ "elicitationId": Type.Intersect([Type.Ref("ElicitationId")]), "url": Type.String({ format: "uri" }) }), Type.Intersect([Type.Ref("ElicitationSessionScope")])]), Type.Intersect([Type.Object({ "elicitationId": Type.Intersect([Type.Ref("ElicitationId")]), "url": Type.String({ format: "uri" }) }), Type.Intersect([Type.Ref("ElicitationRequestScope")])])]),
  "ExtRequest": Type.Unknown(),
  "AgentResponse": Type.Union([Type.Object({ "id": Type.Intersect([Type.Ref("RequestId")]), "result": Type.Union([Type.Intersect([Type.Ref("InitializeResponse")]), Type.Intersect([Type.Ref("AuthenticateResponse")]), Type.Intersect([Type.Ref("LogoutResponse")]), Type.Intersect([Type.Ref("NewSessionResponse")]), Type.Intersect([Type.Ref("LoadSessionResponse")]), Type.Intersect([Type.Ref("ListSessionsResponse")]), Type.Intersect([Type.Ref("DeleteSessionResponse")]), Type.Intersect([Type.Ref("ResumeSessionResponse")]), Type.Intersect([Type.Ref("CloseSessionResponse")]), Type.Intersect([Type.Ref("SetSessionModeResponse")]), Type.Intersect([Type.Ref("SetSessionConfigOptionResponse")]), Type.Intersect([Type.Ref("PromptResponse")]), Type.Intersect([Type.Ref("ExtResponse")])]) }), Type.Object({ "id": Type.Intersect([Type.Ref("RequestId")]), "error": Type.Intersect([Type.Ref("Error")]) })]),
  "InitializeResponse": Type.Object({ "protocolVersion": Type.Intersect([Type.Ref("ProtocolVersion")]), "agentCapabilities": Type.Optional(Type.Intersect([Type.Ref("AgentCapabilities")])), "authMethods": Type.Optional(Type.Array(Type.Ref("AuthMethod"))), "agentInfo": Type.Optional(Type.Union([Type.Ref("Implementation"), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ProtocolVersion": Type.Integer({ minimum: 0, maximum: 65535 }),
  "AgentCapabilities": Type.Object({ "loadSession": Type.Optional(Type.Boolean()), "promptCapabilities": Type.Optional(Type.Intersect([Type.Ref("PromptCapabilities")])), "mcpCapabilities": Type.Optional(Type.Intersect([Type.Ref("McpCapabilities")])), "sessionCapabilities": Type.Optional(Type.Intersect([Type.Ref("SessionCapabilities")])), "auth": Type.Optional(Type.Intersect([Type.Ref("AgentAuthCapabilities")])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "PromptCapabilities": Type.Object({ "image": Type.Optional(Type.Boolean()), "audio": Type.Optional(Type.Boolean()), "embeddedContext": Type.Optional(Type.Boolean()), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "McpCapabilities": Type.Object({ "http": Type.Optional(Type.Boolean()), "sse": Type.Optional(Type.Boolean()), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SessionCapabilities": Type.Object({ "list": Type.Optional(Type.Union([Type.Ref("SessionListCapabilities"), Type.Null()])), "delete": Type.Optional(Type.Union([Type.Ref("SessionDeleteCapabilities"), Type.Null()])), "additionalDirectories": Type.Optional(Type.Union([Type.Ref("SessionAdditionalDirectoriesCapabilities"), Type.Null()])), "resume": Type.Optional(Type.Union([Type.Ref("SessionResumeCapabilities"), Type.Null()])), "close": Type.Optional(Type.Union([Type.Ref("SessionCloseCapabilities"), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SessionListCapabilities": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SessionDeleteCapabilities": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SessionAdditionalDirectoriesCapabilities": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SessionResumeCapabilities": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SessionCloseCapabilities": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "AgentAuthCapabilities": Type.Object({ "logout": Type.Optional(Type.Union([Type.Ref("LogoutCapabilities"), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "LogoutCapabilities": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "AuthMethod": Type.Union([Type.Intersect([Type.Object({ "type": Type.Literal("terminal") }), Type.Ref("AuthMethodTerminal")]), Type.Intersect([Type.Ref("AuthMethodAgent")])]),
  "AuthMethodId": Type.String(),
  "AuthMethodTerminal": Type.Object({ "id": Type.Intersect([Type.Ref("AuthMethodId")]), "name": Type.String(), "description": Type.Optional(Type.Union([Type.String(), Type.Null()])), "args": Type.Optional(Type.Array(Type.String())), "env": Type.Optional(Type.Record(Type.String(), Type.String())), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "AuthMethodAgent": Type.Object({ "id": Type.Intersect([Type.Ref("AuthMethodId")]), "name": Type.String(), "description": Type.Optional(Type.Union([Type.String(), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "Implementation": Type.Object({ "name": Type.String(), "title": Type.Optional(Type.Union([Type.String(), Type.Null()])), "version": Type.String(), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "AuthenticateResponse": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "LogoutResponse": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "NewSessionResponse": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "modes": Type.Optional(Type.Union([Type.Ref("SessionModeState"), Type.Null()])), "configOptions": Type.Optional(Type.Union([Type.Array(Type.Ref("SessionConfigOption")), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SessionModeState": Type.Object({ "currentModeId": Type.Intersect([Type.Ref("SessionModeId")]), "availableModes": Type.Array(Type.Ref("SessionMode")), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SessionModeId": Type.String(),
  "SessionMode": Type.Object({ "id": Type.Intersect([Type.Ref("SessionModeId")]), "name": Type.String(), "description": Type.Optional(Type.Union([Type.String(), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SessionConfigOption": Type.Union([Type.Intersect([Type.Object({ "id": Type.Intersect([Type.Ref("SessionConfigId")]), "name": Type.String(), "description": Type.Optional(Type.Union([Type.String(), Type.Null()])), "category": Type.Optional(Type.Union([Type.Ref("SessionConfigOptionCategory"), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }), Type.Intersect([Type.Object({ "type": Type.Literal("select") }), Type.Ref("SessionConfigSelect")])]), Type.Intersect([Type.Object({ "id": Type.Intersect([Type.Ref("SessionConfigId")]), "name": Type.String(), "description": Type.Optional(Type.Union([Type.String(), Type.Null()])), "category": Type.Optional(Type.Union([Type.Ref("SessionConfigOptionCategory"), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }), Type.Intersect([Type.Object({ "type": Type.Literal("boolean") }), Type.Ref("SessionConfigBoolean")])])]),
  "SessionConfigId": Type.String(),
  "SessionConfigOptionCategory": Type.Union([Type.Literal("mode"), Type.Literal("model"), Type.Literal("model_config"), Type.Literal("thought_level"), Type.String()]),
  "SessionConfigValueId": Type.String(),
  "SessionConfigSelectOptions": Type.Union([Type.Array(Type.Ref("SessionConfigSelectOption")), Type.Array(Type.Ref("SessionConfigSelectGroup"))]),
  "SessionConfigSelectOption": Type.Object({ "value": Type.Intersect([Type.Ref("SessionConfigValueId")]), "name": Type.String(), "description": Type.Optional(Type.Union([Type.String(), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SessionConfigSelectGroup": Type.Object({ "group": Type.Intersect([Type.Ref("SessionConfigGroupId")]), "name": Type.String(), "options": Type.Array(Type.Ref("SessionConfigSelectOption")), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SessionConfigGroupId": Type.String(),
  "SessionConfigSelect": Type.Object({ "currentValue": Type.Intersect([Type.Ref("SessionConfigValueId")]), "options": Type.Intersect([Type.Ref("SessionConfigSelectOptions")]) }),
  "SessionConfigBoolean": Type.Object({ "currentValue": Type.Boolean() }),
  "LoadSessionResponse": Type.Object({ "modes": Type.Optional(Type.Union([Type.Ref("SessionModeState"), Type.Null()])), "configOptions": Type.Optional(Type.Union([Type.Array(Type.Ref("SessionConfigOption")), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ListSessionsResponse": Type.Object({ "sessions": Type.Array(Type.Ref("SessionInfo")), "nextCursor": Type.Optional(Type.Union([Type.String(), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SessionInfo": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "cwd": Type.String(), "additionalDirectories": Type.Optional(Type.Array(Type.String())), "title": Type.Optional(Type.Union([Type.String(), Type.Null()])), "updatedAt": Type.Optional(Type.Union([Type.String(), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "DeleteSessionResponse": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ResumeSessionResponse": Type.Object({ "modes": Type.Optional(Type.Union([Type.Ref("SessionModeState"), Type.Null()])), "configOptions": Type.Optional(Type.Union([Type.Array(Type.Ref("SessionConfigOption")), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "CloseSessionResponse": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SetSessionModeResponse": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SetSessionConfigOptionResponse": Type.Object({ "configOptions": Type.Array(Type.Ref("SessionConfigOption")), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "PromptResponse": Type.Object({ "stopReason": Type.Intersect([Type.Ref("StopReason")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "StopReason": Type.Union([Type.Literal("end_turn"), Type.Literal("max_tokens"), Type.Literal("max_turn_requests"), Type.Literal("refusal"), Type.Literal("cancelled")]),
  "ExtResponse": Type.Unknown(),
  "Error": Type.Object({ "code": Type.Intersect([Type.Ref("ErrorCode")]), "message": Type.String(), "data": Type.Optional(Type.Unknown()) }),
  "ErrorCode": Type.Union([Type.Literal(-32700), Type.Literal(-32600), Type.Literal(-32601), Type.Literal(-32602), Type.Literal(-32603), Type.Literal(-32800), Type.Literal(-32e3), Type.Literal(-32002), Type.Integer()]),
  "AgentNotification": Type.Object({ "method": Type.String(), "params": Type.Optional(Type.Union([Type.Union([Type.Intersect([Type.Ref("SessionNotification")]), Type.Intersect([Type.Ref("CompleteElicitationNotification")]), Type.Intersect([Type.Ref("ExtNotification")])]), Type.Null()])) }),
  "SessionNotification": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "update": Type.Intersect([Type.Ref("SessionUpdate")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SessionUpdate": Type.Union([Type.Intersect([Type.Object({ "sessionUpdate": Type.Literal("user_message_chunk") }), Type.Ref("ContentChunk")]), Type.Intersect([Type.Object({ "sessionUpdate": Type.Literal("agent_message_chunk") }), Type.Ref("ContentChunk")]), Type.Intersect([Type.Object({ "sessionUpdate": Type.Literal("agent_thought_chunk") }), Type.Ref("ContentChunk")]), Type.Intersect([Type.Object({ "sessionUpdate": Type.Literal("tool_call") }), Type.Ref("ToolCall")]), Type.Intersect([Type.Object({ "sessionUpdate": Type.Literal("tool_call_update") }), Type.Ref("ToolCallUpdate")]), Type.Intersect([Type.Object({ "sessionUpdate": Type.Literal("plan") }), Type.Ref("Plan")]), Type.Intersect([Type.Object({ "sessionUpdate": Type.Literal("available_commands_update") }), Type.Ref("AvailableCommandsUpdate")]), Type.Intersect([Type.Object({ "sessionUpdate": Type.Literal("current_mode_update") }), Type.Ref("CurrentModeUpdate")]), Type.Intersect([Type.Object({ "sessionUpdate": Type.Literal("config_option_update") }), Type.Ref("ConfigOptionUpdate")]), Type.Intersect([Type.Object({ "sessionUpdate": Type.Literal("session_info_update") }), Type.Ref("SessionInfoUpdate")]), Type.Intersect([Type.Object({ "sessionUpdate": Type.Literal("usage_update") }), Type.Ref("UsageUpdate")])]),
  "MessageId": Type.String(),
  "ContentChunk": Type.Object({ "content": Type.Intersect([Type.Ref("ContentBlock")]), "messageId": Type.Optional(Type.Union([Type.Ref("MessageId"), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ToolCall": Type.Object({ "toolCallId": Type.Intersect([Type.Ref("ToolCallId")]), "title": Type.String(), "kind": Type.Optional(Type.Intersect([Type.Ref("ToolKind")])), "status": Type.Optional(Type.Intersect([Type.Ref("ToolCallStatus")])), "content": Type.Optional(Type.Array(Type.Ref("ToolCallContent"))), "locations": Type.Optional(Type.Array(Type.Ref("ToolCallLocation"))), "rawInput": Type.Optional(Type.Unknown()), "rawOutput": Type.Optional(Type.Unknown()), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "PlanEntry": Type.Object({ "content": Type.String(), "priority": Type.Intersect([Type.Ref("PlanEntryPriority")]), "status": Type.Intersect([Type.Ref("PlanEntryStatus")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "PlanEntryPriority": Type.Union([Type.Literal("high"), Type.Literal("medium"), Type.Literal("low")]),
  "PlanEntryStatus": Type.Union([Type.Literal("pending"), Type.Literal("in_progress"), Type.Literal("completed")]),
  "Plan": Type.Object({ "entries": Type.Array(Type.Ref("PlanEntry")), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "AvailableCommand": Type.Object({ "name": Type.String(), "description": Type.String(), "input": Type.Optional(Type.Union([Type.Ref("AvailableCommandInput"), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "AvailableCommandInput": Type.Union([Type.Intersect([Type.Ref("UnstructuredCommandInput")])]),
  "UnstructuredCommandInput": Type.Object({ "hint": Type.String(), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "AvailableCommandsUpdate": Type.Object({ "availableCommands": Type.Array(Type.Ref("AvailableCommand")), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "CurrentModeUpdate": Type.Object({ "currentModeId": Type.Intersect([Type.Ref("SessionModeId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ConfigOptionUpdate": Type.Object({ "configOptions": Type.Array(Type.Ref("SessionConfigOption")), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SessionInfoUpdate": Type.Object({ "title": Type.Optional(Type.Union([Type.String(), Type.Null()])), "updatedAt": Type.Optional(Type.Union([Type.String(), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "Cost": Type.Object({ "amount": Type.Number(), "currency": Type.String(), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "UsageUpdate": Type.Object({ "used": Type.Integer({ minimum: 0 }), "size": Type.Integer({ minimum: 0 }), "cost": Type.Optional(Type.Union([Type.Ref("Cost"), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "CompleteElicitationNotification": Type.Object({ "elicitationId": Type.Intersect([Type.Ref("ElicitationId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ExtNotification": Type.Unknown(),
  "ClientRequest": Type.Object({ "id": Type.Intersect([Type.Ref("RequestId")]), "method": Type.String(), "params": Type.Optional(Type.Union([Type.Union([Type.Intersect([Type.Ref("InitializeRequest")]), Type.Intersect([Type.Ref("AuthenticateRequest")]), Type.Intersect([Type.Ref("LogoutRequest")]), Type.Intersect([Type.Ref("NewSessionRequest")]), Type.Intersect([Type.Ref("LoadSessionRequest")]), Type.Intersect([Type.Ref("ListSessionsRequest")]), Type.Intersect([Type.Ref("DeleteSessionRequest")]), Type.Intersect([Type.Ref("ResumeSessionRequest")]), Type.Intersect([Type.Ref("CloseSessionRequest")]), Type.Intersect([Type.Ref("SetSessionModeRequest")]), Type.Intersect([Type.Ref("SetSessionConfigOptionRequest")]), Type.Intersect([Type.Ref("PromptRequest")]), Type.Intersect([Type.Ref("ExtRequest")])]), Type.Null()])) }),
  "InitializeRequest": Type.Object({ "protocolVersion": Type.Intersect([Type.Ref("ProtocolVersion")]), "clientCapabilities": Type.Optional(Type.Intersect([Type.Ref("ClientCapabilities")])), "clientInfo": Type.Optional(Type.Union([Type.Ref("Implementation"), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ClientCapabilities": Type.Object({ "fs": Type.Optional(Type.Intersect([Type.Ref("FileSystemCapabilities")])), "terminal": Type.Optional(Type.Boolean()), "session": Type.Optional(Type.Union([Type.Ref("ClientSessionCapabilities"), Type.Null()])), "auth": Type.Optional(Type.Intersect([Type.Ref("AuthCapabilities")])), "elicitation": Type.Optional(Type.Union([Type.Ref("ElicitationCapabilities"), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "FileSystemCapabilities": Type.Object({ "readTextFile": Type.Optional(Type.Boolean()), "writeTextFile": Type.Optional(Type.Boolean()), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ClientSessionCapabilities": Type.Object({ "configOptions": Type.Optional(Type.Union([Type.Ref("SessionConfigOptionsCapabilities"), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SessionConfigOptionsCapabilities": Type.Object({ "boolean": Type.Optional(Type.Union([Type.Ref("BooleanConfigOptionCapabilities"), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "BooleanConfigOptionCapabilities": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "AuthCapabilities": Type.Object({ "terminal": Type.Optional(Type.Boolean()), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ElicitationCapabilities": Type.Object({ "form": Type.Optional(Type.Union([Type.Ref("ElicitationFormCapabilities"), Type.Null()])), "url": Type.Optional(Type.Union([Type.Ref("ElicitationUrlCapabilities"), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ElicitationFormCapabilities": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ElicitationUrlCapabilities": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "AuthenticateRequest": Type.Object({ "methodId": Type.Intersect([Type.Ref("AuthMethodId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "LogoutRequest": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "NewSessionRequest": Type.Object({ "cwd": Type.String(), "additionalDirectories": Type.Optional(Type.Array(Type.String())), "mcpServers": Type.Array(Type.Ref("McpServer")), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "McpServer": Type.Union([Type.Intersect([Type.Object({ "type": Type.Literal("http") }), Type.Ref("McpServerHttp")]), Type.Intersect([Type.Object({ "type": Type.Literal("sse") }), Type.Ref("McpServerSse")]), Type.Intersect([Type.Ref("McpServerStdio")])]),
  "HttpHeader": Type.Object({ "name": Type.String(), "value": Type.String(), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "McpServerHttp": Type.Object({ "name": Type.String(), "url": Type.String(), "headers": Type.Array(Type.Ref("HttpHeader")), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "McpServerSse": Type.Object({ "name": Type.String(), "url": Type.String(), "headers": Type.Array(Type.Ref("HttpHeader")), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "McpServerStdio": Type.Object({ "name": Type.String(), "command": Type.String(), "args": Type.Array(Type.String()), "env": Type.Array(Type.Ref("EnvVariable")), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "LoadSessionRequest": Type.Object({ "mcpServers": Type.Array(Type.Ref("McpServer")), "cwd": Type.String(), "additionalDirectories": Type.Optional(Type.Array(Type.String())), "sessionId": Type.Intersect([Type.Ref("SessionId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ListSessionsRequest": Type.Object({ "cwd": Type.Optional(Type.Union([Type.String(), Type.Null()])), "cursor": Type.Optional(Type.Union([Type.String(), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "DeleteSessionRequest": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ResumeSessionRequest": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "cwd": Type.String(), "additionalDirectories": Type.Optional(Type.Array(Type.String())), "mcpServers": Type.Optional(Type.Array(Type.Ref("McpServer"))), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "CloseSessionRequest": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SetSessionModeRequest": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "modeId": Type.Intersect([Type.Ref("SessionModeId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "SetSessionConfigOptionRequest": Type.Union([Type.Intersect([Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "configId": Type.Intersect([Type.Ref("SessionConfigId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }), Type.Object({ "value": Type.Boolean(), "type": Type.Literal("boolean") })]), Type.Intersect([Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "configId": Type.Intersect([Type.Ref("SessionConfigId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }), Type.Object({ "value": Type.Intersect([Type.Ref("SessionConfigValueId")]) })])]),
  "PromptRequest": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "prompt": Type.Array(Type.Ref("ContentBlock")), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ClientResponse": Type.Union([Type.Object({ "id": Type.Intersect([Type.Ref("RequestId")]), "result": Type.Union([Type.Intersect([Type.Ref("WriteTextFileResponse")]), Type.Intersect([Type.Ref("ReadTextFileResponse")]), Type.Intersect([Type.Ref("RequestPermissionResponse")]), Type.Intersect([Type.Ref("CreateTerminalResponse")]), Type.Intersect([Type.Ref("TerminalOutputResponse")]), Type.Intersect([Type.Ref("ReleaseTerminalResponse")]), Type.Intersect([Type.Ref("WaitForTerminalExitResponse")]), Type.Intersect([Type.Ref("KillTerminalResponse")]), Type.Intersect([Type.Ref("CreateElicitationResponse")]), Type.Intersect([Type.Ref("ExtResponse")])]) }), Type.Object({ "id": Type.Intersect([Type.Ref("RequestId")]), "error": Type.Intersect([Type.Ref("Error")]) })]),
  "WriteTextFileResponse": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ReadTextFileResponse": Type.Object({ "content": Type.String(), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "RequestPermissionResponse": Type.Object({ "outcome": Type.Intersect([Type.Ref("RequestPermissionOutcome")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "RequestPermissionOutcome": Type.Union([Type.Object({ "outcome": Type.Literal("cancelled") }), Type.Intersect([Type.Object({ "outcome": Type.Literal("selected") }), Type.Ref("SelectedPermissionOutcome")])]),
  "SelectedPermissionOutcome": Type.Object({ "optionId": Type.Intersect([Type.Ref("PermissionOptionId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "CreateTerminalResponse": Type.Object({ "terminalId": Type.Intersect([Type.Ref("TerminalId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "TerminalOutputResponse": Type.Object({ "output": Type.String(), "truncated": Type.Boolean(), "exitStatus": Type.Optional(Type.Union([Type.Ref("TerminalExitStatus"), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "TerminalExitStatus": Type.Object({ "exitCode": Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.Null()])), "signal": Type.Optional(Type.Union([Type.String(), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "ReleaseTerminalResponse": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "WaitForTerminalExitResponse": Type.Object({ "exitCode": Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.Null()])), "signal": Type.Optional(Type.Union([Type.String(), Type.Null()])), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "KillTerminalResponse": Type.Object({ "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "CreateElicitationResponse": Type.Unknown(),
  "ElicitationContentValue": Type.Union([Type.String(), Type.Integer(), Type.Number(), Type.Boolean(), Type.Array(Type.String())]),
  "ElicitationAcceptAction": Type.Object({ "content": Type.Optional(Type.Union([Type.Record(Type.String(), Type.Ref("ElicitationContentValue")), Type.Null()])) }),
  "ClientNotification": Type.Object({ "method": Type.String(), "params": Type.Optional(Type.Union([Type.Union([Type.Intersect([Type.Ref("CancelNotification")]), Type.Intersect([Type.Ref("ExtNotification")])]), Type.Null()])) }),
  "CancelNotification": Type.Object({ "sessionId": Type.Intersect([Type.Ref("SessionId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) }),
  "CancelRequestNotification": Type.Object({ "requestId": Type.Intersect([Type.Ref("RequestId")]), "_meta": Type.Optional(Type.Union([Type.Object({}), Type.Null()])) })
});
var AgentRequest = Acp.Import("AgentRequest");
var RequestId = Acp.Import("RequestId");
var WriteTextFileRequest = Acp.Import("WriteTextFileRequest");
var SessionId = Acp.Import("SessionId");
var ReadTextFileRequest = Acp.Import("ReadTextFileRequest");
var RequestPermissionRequest = Acp.Import("RequestPermissionRequest");
var ToolCallUpdate = Acp.Import("ToolCallUpdate");
var ToolCallId = Acp.Import("ToolCallId");
var ToolKind = Acp.Import("ToolKind");
var ToolCallStatus = Acp.Import("ToolCallStatus");
var ToolCallContent = Acp.Import("ToolCallContent");
var ContentBlock5 = Acp.Import("ContentBlock");
var Annotations = Acp.Import("Annotations");
var Role = Acp.Import("Role");
var TextContent = Acp.Import("TextContent");
var ImageContent = Acp.Import("ImageContent");
var AudioContent = Acp.Import("AudioContent");
var ResourceLink = Acp.Import("ResourceLink");
var EmbeddedResourceResource = Acp.Import("EmbeddedResourceResource");
var TextResourceContents = Acp.Import("TextResourceContents");
var BlobResourceContents = Acp.Import("BlobResourceContents");
var EmbeddedResource = Acp.Import("EmbeddedResource");
var Content = Acp.Import("Content");
var Diff2 = Acp.Import("Diff");
var TerminalId = Acp.Import("TerminalId");
var Terminal = Acp.Import("Terminal");
var ToolCallLocation = Acp.Import("ToolCallLocation");
var PermissionOption = Acp.Import("PermissionOption");
var PermissionOptionId = Acp.Import("PermissionOptionId");
var PermissionOptionKind = Acp.Import("PermissionOptionKind");
var CreateTerminalRequest = Acp.Import("CreateTerminalRequest");
var EnvVariable = Acp.Import("EnvVariable");
var TerminalOutputRequest = Acp.Import("TerminalOutputRequest");
var ReleaseTerminalRequest = Acp.Import("ReleaseTerminalRequest");
var WaitForTerminalExitRequest = Acp.Import("WaitForTerminalExitRequest");
var KillTerminalRequest = Acp.Import("KillTerminalRequest");
var CreateElicitationRequest = Acp.Import("CreateElicitationRequest");
var ElicitationSessionScope = Acp.Import("ElicitationSessionScope");
var ElicitationRequestScope = Acp.Import("ElicitationRequestScope");
var ElicitationSchema = Acp.Import("ElicitationSchema");
var ElicitationSchemaType = Acp.Import("ElicitationSchemaType");
var ElicitationPropertySchema = Acp.Import("ElicitationPropertySchema");
var StringFormat = Acp.Import("StringFormat");
var EnumOption = Acp.Import("EnumOption");
var StringPropertySchema = Acp.Import("StringPropertySchema");
var NumberPropertySchema = Acp.Import("NumberPropertySchema");
var IntegerPropertySchema = Acp.Import("IntegerPropertySchema");
var BooleanPropertySchema = Acp.Import("BooleanPropertySchema");
var MultiSelectItems = Acp.Import("MultiSelectItems");
var StringMultiSelectItems = Acp.Import("StringMultiSelectItems");
var TitledMultiSelectItems = Acp.Import("TitledMultiSelectItems");
var MultiSelectPropertySchema = Acp.Import("MultiSelectPropertySchema");
var ElicitationFormMode = Acp.Import("ElicitationFormMode");
var ElicitationId = Acp.Import("ElicitationId");
var ElicitationUrlMode = Acp.Import("ElicitationUrlMode");
var ExtRequest = Acp.Import("ExtRequest");
var AgentResponse = Acp.Import("AgentResponse");
var InitializeResponse = Acp.Import("InitializeResponse");
var ProtocolVersion = Acp.Import("ProtocolVersion");
var AgentCapabilities = Acp.Import("AgentCapabilities");
var PromptCapabilities = Acp.Import("PromptCapabilities");
var McpCapabilities = Acp.Import("McpCapabilities");
var SessionCapabilities = Acp.Import("SessionCapabilities");
var SessionListCapabilities = Acp.Import("SessionListCapabilities");
var SessionDeleteCapabilities = Acp.Import("SessionDeleteCapabilities");
var SessionAdditionalDirectoriesCapabilities = Acp.Import("SessionAdditionalDirectoriesCapabilities");
var SessionResumeCapabilities = Acp.Import("SessionResumeCapabilities");
var SessionCloseCapabilities = Acp.Import("SessionCloseCapabilities");
var AgentAuthCapabilities = Acp.Import("AgentAuthCapabilities");
var LogoutCapabilities = Acp.Import("LogoutCapabilities");
var AuthMethod = Acp.Import("AuthMethod");
var AuthMethodId = Acp.Import("AuthMethodId");
var AuthMethodTerminal = Acp.Import("AuthMethodTerminal");
var AuthMethodAgent = Acp.Import("AuthMethodAgent");
var Implementation = Acp.Import("Implementation");
var AuthenticateResponse = Acp.Import("AuthenticateResponse");
var LogoutResponse = Acp.Import("LogoutResponse");
var NewSessionResponse = Acp.Import("NewSessionResponse");
var SessionModeState = Acp.Import("SessionModeState");
var SessionModeId = Acp.Import("SessionModeId");
var SessionMode = Acp.Import("SessionMode");
var SessionConfigOption = Acp.Import("SessionConfigOption");
var SessionConfigId = Acp.Import("SessionConfigId");
var SessionConfigOptionCategory = Acp.Import("SessionConfigOptionCategory");
var SessionConfigValueId = Acp.Import("SessionConfigValueId");
var SessionConfigSelectOptions = Acp.Import("SessionConfigSelectOptions");
var SessionConfigSelectOption = Acp.Import("SessionConfigSelectOption");
var SessionConfigSelectGroup = Acp.Import("SessionConfigSelectGroup");
var SessionConfigGroupId = Acp.Import("SessionConfigGroupId");
var SessionConfigSelect = Acp.Import("SessionConfigSelect");
var SessionConfigBoolean = Acp.Import("SessionConfigBoolean");
var LoadSessionResponse = Acp.Import("LoadSessionResponse");
var ListSessionsResponse = Acp.Import("ListSessionsResponse");
var SessionInfo = Acp.Import("SessionInfo");
var DeleteSessionResponse = Acp.Import("DeleteSessionResponse");
var ResumeSessionResponse = Acp.Import("ResumeSessionResponse");
var CloseSessionResponse = Acp.Import("CloseSessionResponse");
var SetSessionModeResponse = Acp.Import("SetSessionModeResponse");
var SetSessionConfigOptionResponse = Acp.Import("SetSessionConfigOptionResponse");
var PromptResponse = Acp.Import("PromptResponse");
var StopReason = Acp.Import("StopReason");
var ExtResponse = Acp.Import("ExtResponse");
var Error2 = Acp.Import("Error");
var ErrorCode = Acp.Import("ErrorCode");
var AgentNotification = Acp.Import("AgentNotification");
var SessionNotification = Acp.Import("SessionNotification");
var SessionUpdate = Acp.Import("SessionUpdate");
var MessageId = Acp.Import("MessageId");
var ContentChunk = Acp.Import("ContentChunk");
var ToolCall2 = Acp.Import("ToolCall");
var PlanEntry = Acp.Import("PlanEntry");
var PlanEntryPriority = Acp.Import("PlanEntryPriority");
var PlanEntryStatus = Acp.Import("PlanEntryStatus");
var Plan = Acp.Import("Plan");
var AvailableCommand = Acp.Import("AvailableCommand");
var AvailableCommandInput = Acp.Import("AvailableCommandInput");
var UnstructuredCommandInput = Acp.Import("UnstructuredCommandInput");
var AvailableCommandsUpdate = Acp.Import("AvailableCommandsUpdate");
var CurrentModeUpdate = Acp.Import("CurrentModeUpdate");
var ConfigOptionUpdate = Acp.Import("ConfigOptionUpdate");
var SessionInfoUpdate = Acp.Import("SessionInfoUpdate");
var Cost = Acp.Import("Cost");
var UsageUpdate = Acp.Import("UsageUpdate");
var CompleteElicitationNotification = Acp.Import("CompleteElicitationNotification");
var ExtNotification = Acp.Import("ExtNotification");
var ClientRequest = Acp.Import("ClientRequest");
var InitializeRequest = Acp.Import("InitializeRequest");
var ClientCapabilities = Acp.Import("ClientCapabilities");
var FileSystemCapabilities = Acp.Import("FileSystemCapabilities");
var ClientSessionCapabilities = Acp.Import("ClientSessionCapabilities");
var SessionConfigOptionsCapabilities = Acp.Import("SessionConfigOptionsCapabilities");
var BooleanConfigOptionCapabilities = Acp.Import("BooleanConfigOptionCapabilities");
var AuthCapabilities = Acp.Import("AuthCapabilities");
var ElicitationCapabilities = Acp.Import("ElicitationCapabilities");
var ElicitationFormCapabilities = Acp.Import("ElicitationFormCapabilities");
var ElicitationUrlCapabilities = Acp.Import("ElicitationUrlCapabilities");
var AuthenticateRequest = Acp.Import("AuthenticateRequest");
var LogoutRequest = Acp.Import("LogoutRequest");
var NewSessionRequest = Acp.Import("NewSessionRequest");
var McpServer = Acp.Import("McpServer");
var HttpHeader = Acp.Import("HttpHeader");
var McpServerHttp = Acp.Import("McpServerHttp");
var McpServerSse = Acp.Import("McpServerSse");
var McpServerStdio = Acp.Import("McpServerStdio");
var LoadSessionRequest = Acp.Import("LoadSessionRequest");
var ListSessionsRequest = Acp.Import("ListSessionsRequest");
var DeleteSessionRequest = Acp.Import("DeleteSessionRequest");
var ResumeSessionRequest = Acp.Import("ResumeSessionRequest");
var CloseSessionRequest = Acp.Import("CloseSessionRequest");
var SetSessionModeRequest = Acp.Import("SetSessionModeRequest");
var SetSessionConfigOptionRequest = Acp.Import("SetSessionConfigOptionRequest");
var PromptRequest = Acp.Import("PromptRequest");
var ClientResponse = Acp.Import("ClientResponse");
var WriteTextFileResponse = Acp.Import("WriteTextFileResponse");
var ReadTextFileResponse = Acp.Import("ReadTextFileResponse");
var RequestPermissionResponse = Acp.Import("RequestPermissionResponse");
var RequestPermissionOutcome = Acp.Import("RequestPermissionOutcome");
var SelectedPermissionOutcome = Acp.Import("SelectedPermissionOutcome");
var CreateTerminalResponse = Acp.Import("CreateTerminalResponse");
var TerminalOutputResponse = Acp.Import("TerminalOutputResponse");
var TerminalExitStatus = Acp.Import("TerminalExitStatus");
var ReleaseTerminalResponse = Acp.Import("ReleaseTerminalResponse");
var WaitForTerminalExitResponse = Acp.Import("WaitForTerminalExitResponse");
var KillTerminalResponse = Acp.Import("KillTerminalResponse");
var CreateElicitationResponse = Acp.Import("CreateElicitationResponse");
var ElicitationContentValue = Acp.Import("ElicitationContentValue");
var ElicitationAcceptAction = Acp.Import("ElicitationAcceptAction");
var ClientNotification = Acp.Import("ClientNotification");
var CancelNotification = Acp.Import("CancelNotification");
var CancelRequestNotification = Acp.Import("CancelRequestNotification");

// ../protocol/src/package-admin.ts
var WEB_CLIENT_MODULE_SLOT_NAMES = Object.freeze([
  "tool.card.inline",
  "client.card",
  "workbench.panel",
  "conversation.approval.detail",
  "conversation.chat.assistant-actions",
  "conversation.chat.node",
  "conversation.chat.commandview",
  "conversation.chat.turnTail",
  "conversation.composer.dock",
  "conversation.composer",
  "conversation.composer.bar",
  "conversation.hero.agentPreset",
  "conversation.hero.brand.mark",
  "conversation.hero.workspace",
  "conversation.hero.workspace.directoryFlow",
  "conversation.input.attachments",
  "conversation.input.dock",
  "conversation.input.left",
  "conversation.input.model",
  "conversation.input.overlay",
  "conversation.input.permission",
  "conversation.input.plan",
  "conversation.input.right",
  "conversation.session",
  "conversation.session.header",
  "conversation.session.header.actions",
  "conversation.session.header.corner",
  "conversation.session.header.lineage",
  "conversation.session.header.utilities",
  "conversation.view",
  "conversation.message.images",
  "conversation.trajectory.images",
  "settings.action",
  "settings.close",
  "settings.general.item",
  "settings.header",
  "settings.models.footer",
  "settings.models.provider-card",
  "settings.onboarding",
  "settings.plugin.item",
  "settings.plugins.tab",
  "settings.section",
  "settings.trigger",
  "rightbar",
  "rightbar.session",
  "sidebar.right.pane.tab",
  "sidebar.right.pane.tab.title",
  "sidebar.right.tab.document",
  "sidebar.right.tab.guide",
  "sidebar.right.tab.guide.entry",
  "sidebar.right.tab.menu.item",
  "sidebar",
  "sidebar.brand.mark",
  "sidebar.brand.name",
  "sidebar.footer.action",
  "sidebar.panellist",
  "sidebar.settings",
  "sidebar.workspaces",
  "sidebar.workspaces.directoryFlow",
  "main",
  "main.conversation",
  "shell.overlay",
  "tool.call.toolview",
  "tool.call.images",
  "tool.view.cordis"
]);
var WEB_HOST_REGION_SLOT_NAMES = /* @__PURE__ */ new Set([
  "ui:empty-state",
  "ui:sidebar",
  "ui:transcript",
  "ui:conversation",
  "ui:topbar",
  "ui:approval",
  "ui:composer",
  "ui:trace",
  "ui:settings-pane",
  "ui:settings-pane.model",
  "ui:settings-pane.plugin",
  "ui:settings-pane.resources",
  "ui:settings-pane.archived",
  "ui:settings-pane.computer-use",
  "ui:settings-pane.appearance",
  "conversation.message.actions",
  "conversation.attachments",
  "conversation.tool-card",
  "conversation.feedback"
]);
function isWebClientModuleSlotName(value) {
  return WEB_CLIENT_MODULE_SLOT_NAMES.includes(value) || WEB_HOST_REGION_SLOT_NAMES.has(value);
}
function projectClientModuleRows(result) {
  const modules = result.modules.map((source) => ({
    ...source.rowId === void 0 ? {} : { rowId: source.rowId },
    packageId: source.packageId,
    revision: source.revision,
    entryUrl: source.entryUrl,
    styleUrls: [...source.styleUrls],
    slots: [...source.slots],
    ...source.slotCatalogVersion === void 0 ? {} : { slotCatalogVersion: source.slotCatalogVersion },
    ...source.contentDigest === void 0 ? {} : { contentDigest: source.contentDigest },
    extIds: [...source.extIds],
    ...source.publicConfig === void 0 ? {} : { publicConfig: { ...source.publicConfig } }
  }));
  const statuses = result.statuses.map((source) => ({
    packageId: source.packageId,
    installedRevision: source.installedRevision,
    backendRevision: source.backendRevision,
    state: source.state,
    ...source.reason === void 0 ? {} : { reason: source.reason },
    ...source.retained === void 0 ? {} : {
      retained: source.retained.map((entry) => ({
        revision: entry.revision,
        expiresAt: entry.expiresAt
      }))
    }
  }));
  const safeResult = (rows2) => ({
    revision: result.revision,
    serverTime: result.serverTime,
    rows: rows2,
    ...result.rowAliases === void 0 ? {} : {
      rowAliases: Object.fromEntries(
        Object.entries(result.rowAliases).sort(([left], [right]) => left.localeCompare(right))
      )
    },
    modules,
    statuses
  });
  if (result.rows !== void 0) {
    const rows2 = result.rows.map((source) => {
      const row = {
        rowId: source.rowId,
        moduleName: source.moduleName,
        enabled: source.enabled,
        phase: source.phase
      };
      if (source.packageId !== void 0) row.packageId = source.packageId;
      if (source.revision !== void 0) row.revision = source.revision;
      if (source.entryUrl !== void 0) row.entryUrl = source.entryUrl;
      if (source.styleUrls !== void 0) row.styleUrls = [...source.styleUrls];
      if (source.slots !== void 0) row.slots = [...source.slots];
      if (source.slotCatalogVersion !== void 0) row.slotCatalogVersion = source.slotCatalogVersion;
      if (source.contentDigest !== void 0) row.contentDigest = source.contentDigest;
      if (source.extIds !== void 0) row.extIds = [...source.extIds];
      if (source.services !== void 0) row.services = [...source.services];
      if (source.publicConfig !== void 0) row.publicConfig = { ...source.publicConfig };
      return row;
    });
    return safeResult(rows2);
  }
  const modulesByRow = new Map(
    result.modules.map((module) => [module.rowId ?? `web:${module.packageId}`, module])
  );
  const statusesByPackage = new Map(result.statuses.map((status) => [status.packageId, status]));
  const modulePackages = new Set(result.modules.map((module) => module.packageId));
  const rowIds = [
    .../* @__PURE__ */ new Set([
      ...modulesByRow.keys(),
      ...[...statusesByPackage.keys()].filter((packageId) => !modulePackages.has(packageId)).map((packageId) => `web:${packageId}`)
    ])
  ].sort((a, b) => a.localeCompare(b));
  const rows = [];
  for (const rowId of rowIds) {
    const module = modulesByRow.get(rowId);
    const packageId = module?.packageId ?? rowId.slice("web:".length);
    const status = statusesByPackage.get(packageId);
    const phase = status?.state ?? (module === void 0 ? "blocked" : "ready");
    const row = {
      rowId,
      moduleName: packageId,
      enabled: status === void 0 ? module !== void 0 : status.state !== "blocked",
      phase
    };
    if (module !== void 0) row.packageId = module.packageId;
    if (module !== void 0 && phase === "ready") {
      row.revision = module.revision;
      row.entryUrl = module.entryUrl;
      row.styleUrls = [...module.styleUrls];
      row.slots = [...module.slots];
      if (module.contentDigest !== void 0) row.contentDigest = module.contentDigest;
      row.extIds = [...module.extIds];
      if (module.publicConfig !== void 0) row.publicConfig = { ...module.publicConfig };
    }
    rows.push(row);
  }
  return safeResult(rows);
}
var PACKAGE_ADMIN_PERMISSIONS = Object.freeze([
  "packages.read",
  "packages.install",
  "packages.trust",
  "packages.activate",
  "packages.remove",
  "catalog.configure",
  "extensions.execute"
]);
var contract = (params, result, execution, permission) => Object.freeze({
  kind: "request",
  direction: "c2s",
  params,
  result,
  administration: Object.freeze({
    execution,
    permission,
    identity: execution === "read" ? "none" : "principal-client-command"
  })
});
var PACKAGE_ADMIN_METHODS = Object.freeze({
  "_agnes/v1/packages.catalog.list": contract(
    PackageCatalogListParams,
    PackageCatalogPage,
    "read",
    "packages.read"
  ),
  "_agnes/v1/packages.catalog.get": contract(
    PackageCatalogGetParams,
    PackageCatalogDescriptor,
    "read",
    "packages.read"
  ),
  "_agnes/v1/packages.list": contract(PackageListParams, PackageListResult, "read", "packages.read"),
  // Skins are derived from the installed-package inventory: the request reuses PackageListParams and
  // the read permission rather than adding a permission that would ripple into the authorization surface.
  "_agnes/v1/skins.list": contract(PackageListParams, SkinListResult, "read", "packages.read"),
  // One skin file's bytes. The path is a same-origin URL path, never a filesystem path, and the
  // daemon answers only for ids its enabled+trusted roster claims (design §22).
  "_agnes/v1/skins.read": contract(SkinReadParams, SkinReadResult, "read", "packages.read"),
  // Web client modules (design WC2/WC3): the roster is derived from inventory + activation state,
  // so the request reuses PackageListParams and the read permission, same as skins.
  "_agnes/v1/clientModules.list": contract(
    PackageListParams,
    ClientModuleListResult,
    "read",
    "packages.read"
  ),
  // One client-module file's bytes from the daemon-managed immutable snapshot. The path is a
  // same-origin URL path, never a filesystem path; miss and refusal share one negative answer.
  "_agnes/v1/clientModules.read": contract(
    ClientModuleReadParams,
    ClientModuleReadResult,
    "read",
    "packages.read"
  ),
  // A private launcher BFF uses this fixed typed route.  It is never granted to the WebSocket
  // page connection and the daemon re-checks the live row/service authority before dispatch.
  "_agnes/v1/clientModules.callService": contract(
    ClientModuleServiceCallParams,
    ClientModuleServiceCallResult,
    "read",
    "packages.read"
  ),
  // Effects use a separate private BFF/RPC path. The browser first passes the host-owned command
  // authorizer; the daemon then rechecks the live row and applies durable command semantics.
  "_agnes/v1/clientModules.callEffect": contract(
    ClientModuleEffectCallParams,
    ClientModuleEffectCallResult,
    "effect",
    "extensions.execute"
  ),
  "_agnes/v1/packages.inspect": contract(
    PackageInspectParams,
    PackageOperationReceipt,
    "effect",
    "packages.install"
  ),
  "_agnes/v1/packages.install": contract(
    PackageInstallParams,
    PackageOperationReceipt,
    "effect",
    "packages.install"
  ),
  "_agnes/v1/packages.trust": contract(
    PackageTrustParams,
    PackageOperationReceipt,
    "effect",
    "packages.trust"
  ),
  "_agnes/v1/packages.untrust": contract(
    PackageUntrustParams,
    PackageOperationReceipt,
    "effect",
    "packages.trust"
  ),
  "_agnes/v1/packages.enable": contract(
    PackageEnableParams,
    PackageOperationReceipt,
    "effect",
    "packages.activate"
  ),
  "_agnes/v1/packages.disable": contract(
    PackageDisableParams,
    PackageOperationReceipt,
    "effect",
    "packages.activate"
  ),
  "_agnes/v1/packages.update": contract(
    PackageUpdateParams,
    PackageOperationReceipt,
    "effect",
    "packages.install"
  ),
  "_agnes/v1/packages.rollback": contract(
    PackageRollbackParams,
    PackageOperationReceipt,
    "effect",
    "packages.remove"
  ),
  "_agnes/v1/packages.remove": contract(
    PackageRemoveParams,
    PackageOperationReceipt,
    "effect",
    "packages.remove"
  ),
  "_agnes/v1/packages.operation.get": contract(
    PackageOperationGetParams,
    PackageOperation,
    "read",
    "packages.read"
  ),
  "_agnes/v1/packages.operation.cancel": contract(
    PackageOperationCancelParams,
    PackageOperationReceipt,
    "unblock",
    "packages.activate"
  ),
  "_agnes/v1/packages.pins.inspect": contract(
    PackagePinsInspectParams,
    PackagePinsInspectResult,
    "read",
    "packages.read"
  ),
  "_agnes/v1/packages.pins.release": contract(
    PackagePinsReleaseParams,
    PackagePinsReleaseResult,
    "effect",
    "packages.remove"
  ),
  "_agnes/v1/packages.trustWorkspace": contract(
    PackageTrustWorkspaceParams,
    PackageTrustWorkspaceResult,
    "effect",
    "packages.trust"
  ),
  "_agnes/v1/plugins.tree.get": contract(PackageListParams, PluginTreeView, "read", "packages.read"),
  "_agnes/v1/plugins.tree.list": contract(PackageListParams, PluginTreeView, "read", "packages.read"),
  "_agnes/v1/plugins.tree.apply": contract(
    PluginTreeApplyParams,
    PluginTreeApplyResult,
    "effect",
    "packages.activate"
  ),
  "_agnes/v1/plugins.tree.rollback": contract(
    PluginTreeRollbackParams,
    PluginTreeRollbackResult,
    "effect",
    "packages.activate"
  )
});
var DATA_SCHEMAS = {
  PackageAdminPermission,
  PackageSource,
  PackageContributionSummary: PackageContributionSummary2,
  PackageCapabilityDiff,
  PackageBlocker,
  PackageWarning,
  PackageProvenance,
  PackagePreview,
  PackageTrustDecision: PackageTrustDecision2,
  PackageActivationTrust,
  PackageActivationRequest,
  PackageRollbackTarget,
  PackageAdminContext,
  PackageInstalledDescriptor,
  PackageCatalogDescriptor,
  PackageAdminError,
  PackageOperationReceipt,
  PackageOperation,
  PackageCatalogPage,
  PackageListResult,
  PackageCatalogListParams,
  PackageCatalogGetParams,
  PackageListParams,
  PackageInspectParams,
  PackageInstallParams,
  PackageTrustParams,
  PackageUntrustParams,
  PackageEnableParams,
  PackageDisableParams,
  PackageRollbackParams,
  PackageRemoveParams,
  PackageUpdateParams,
  PackageOperationGetParams,
  PackageOperationCancelParams,
  RuntimePinDescriptor,
  RuntimePinReleaseResult,
  PackagePinsInspectParams,
  PackagePinsInspectResult,
  PackagePinsReleaseParams,
  PackagePinsReleaseResult,
  PackageTrustWorkspaceParams,
  PackageTrustWorkspaceResult,
  PluginTreeArtifact,
  PluginTreeApplyParams,
  PluginTreeRollbackParams,
  PluginTreeView,
  PluginTreeApplyResult,
  PluginTreeRollbackResult,
  ClientModuleRosterRow,
  ClientModuleEffectCallParams
};
function check(schema, value) {
  const inspected = inspectJsonData(value, 1048576);
  if (!inspected.ok)
    return { ok: false, errors: [{ path: "", code: "TYPE", message: "expected bounded strict JSON data" }] };
  return validateAgainst(schema, inspected.value);
}
function validatePackageAdminData(name, value) {
  return check(DATA_SCHEMAS[name], value);
}
function validatePackageAdminCall(name, side, value) {
  return check(PACKAGE_ADMIN_METHODS[name][side], value);
}

// ../resource-control-contracts/src/gen/resource-control.ts
if (!format_exports.Has("date-time")) format_exports.Set("date-time", (value) => {
  const parts = value.split(/t/i);
  if (parts.length !== 2) return false;
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(parts[0] ?? "");
  const time = /^(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)(z|([+-])(\d{2}):(\d{2}))$/i.exec(parts[1] ?? "");
  if (!date || !time) return false;
  const year = Number(date[1]), month = Number(date[2]), day = Number(date[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > (days[month] ?? 0)) return false;
  const hour = Number(time[1]), minute = Number(time[2]), second = Number(time[3]);
  const offsetHour = Number(time[6] || 0), offsetMinute = Number(time[7] || 0);
  if (hour > 23 || minute > 59 || offsetHour > 23 || offsetMinute > 59) return false;
  if (second < 60) return true;
  const sign = time[5] === "-" ? -1 : 1;
  const utcMinute = minute - offsetMinute * sign;
  const utcHour = hour - offsetHour * sign - (utcMinute < 0 ? 1 : 0);
  return (utcHour === 23 || utcHour === -1) && (utcMinute === 59 || utcMinute === -1) && second < 61;
});
var JsonValue11 = Type.Recursive((This) => Type.Union([Type.Null(), Type.Boolean(), Type.Number(), Type.String(), Type.Array(This), Type.Record(Type.String(), This)]));
var ResourceControlSchema = Type.Module({
  "ResourcePermission": Type.Union([Type.Literal("resources.read"), Type.Literal("resources.skills.write"), Type.Literal("resources.reconcile"), Type.Literal("skills.refresh"), Type.Literal("skills.trust"), Type.Literal("mcp.read"), Type.Literal("mcp.tools.read"), Type.Literal("mcp.manage"), Type.Literal("mcp.trust"), Type.Literal("mcp.test"), Type.Literal("mcp.activate"), Type.Literal("mcp.reconnect"), Type.Literal("secrets.use")]),
  "ProfileId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[a-z][a-z0-9._-]{0,127}$" }),
  "ResourceId": Type.String({ minLength: 1, maxLength: 384, pattern: "^(?:skill|mcp)/[a-z0-9][a-z0-9._/-]{0,255}$" }),
  "ServerId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[a-z][a-z0-9._-]{0,127}$" }),
  "Revision": Type.String({ pattern: "^[a-f0-9]{64}$" }),
  "WorkspaceId": Type.String({ pattern: "^[a-f0-9]{64}$" }),
  "CommandId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$" }),
  "ClientId": Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$" }),
  "SourceScope": Type.Union([Type.Literal("workspace"), Type.Literal("user"), Type.Literal("package"), Type.Literal("runtime")]),
  "SkillRootKey": Type.Union([Type.Literal("workspace-agnes"), Type.Literal("user-agnes"), Type.Literal("user-agents"), Type.Literal("user-claude"), Type.Literal("user-codex"), Type.Literal("package"), Type.Literal("runtime")]),
  "SkillRootDiagnostic": Type.Object({ "code": Type.Union([Type.Literal("root-unreadable"), Type.Literal("root-unresolvable"), Type.Literal("entry-limit"), Type.Literal("root-bytes-limit"), Type.Literal("workspace-key-missing"), Type.Literal("entry-outside-root"), Type.Literal("skill-file-unreadable"), Type.Literal("skill-body-too-large"), Type.Literal("invalid-frontmatter"), Type.Literal("entries-skipped")]) }, { additionalProperties: false }),
  "SkillRootStatus": Type.Object({ "rootKey": Type.Ref("SkillRootKey"), "scope": Type.Ref("SourceScope"), "state": Type.Union([Type.Literal("ready"), Type.Literal("empty"), Type.Literal("stale"), Type.Literal("unavailable")]), "workspaceId": Type.Optional(Type.Ref("WorkspaceId")), "diagnostic": Type.Optional(Type.Ref("SkillRootDiagnostic")) }, { additionalProperties: false }),
  "SkillSourceIdentity": Type.Object({ "scope": Type.Ref("SourceScope"), "rootKey": Type.Ref("SkillRootKey"), "sourceId": Type.String({ pattern: "^[a-f0-9]{64}$" }) }, { additionalProperties: false }),
  "SkillResolution": Type.Object({ "winner": Type.Boolean(), "shadowed": Type.Array(Type.Object({ "resourceId": Type.Ref("ResourceId"), "sourceIdentity": Type.Ref("SkillSourceIdentity"), "revision": Type.Ref("Revision"), "reason": Type.Literal("lower-priority") }, { additionalProperties: false }), { maxItems: 32 }) }, { additionalProperties: false }),
  "TrustState": Type.Union([Type.Literal("untrusted"), Type.Literal("trusted"), Type.Literal("rejected")]),
  "DesiredState": Type.Union([Type.Literal("enabled"), Type.Literal("disabled")]),
  "ActualState": Type.Union([Type.Literal("unavailable"), Type.Literal("disabled"), Type.Literal("preparing"), Type.Literal("ready"), Type.Literal("degraded")]),
  "SafeError": Type.Object({ "code": Type.String({ minLength: 1, maxLength: 64, pattern: "^[A-Z][A-Z0-9_]{0,63}$" }), "message": Type.String({ minLength: 1, maxLength: 256 }) }, { additionalProperties: false }),
  "SkillDescriptor": Type.Object({ "kind": Type.Literal("skill"), "resourceId": Type.Ref("ResourceId"), "name": Type.String({ minLength: 1, maxLength: 128 }), "description": Type.Optional(Type.String({ maxLength: 1024 })), "revision": Type.Ref("Revision"), "sourceIdentity": Type.Ref("SkillSourceIdentity"), "priority": Type.Integer({ minimum: 50, maximum: 500 }), "resolution": Type.Ref("SkillResolution"), "trust": Type.Ref("TrustState"), "desired": Type.Ref("DesiredState"), "actual": Type.Ref("ActualState"), "stale": Type.Boolean(), "lastSafeError": Type.Optional(Type.Ref("SafeError")), "workspaceId": Type.Optional(Type.Ref("WorkspaceId")) }, { additionalProperties: false }),
  "McpEnvName": Type.String({ pattern: "^(?!(?:PATH|HOME|SHELL|NODE_OPTIONS|LD_PRELOAD|DYLD_INSERT_LIBRARIES)$)[A-Z][A-Z0-9_]{0,63}$" }),
  "McpStdioTransport": Type.Object({ "kind": Type.Literal("stdio"), "executable": Type.String({ minLength: 1, maxLength: 512, pattern: "^(?!(?:.*[/\\\\])?(?:[sS][hH]|[bB][aA][sS][hH]|[zZ][sS][hH]|[fF][iI][sS][hH]|[cC][mM][dD]|[pP][oO][wW][eE][rR][sS][hH][eE][lL][lL]|[pP][wW][sS][hH])(?:\\.[eE][xX][eE])?$)(?:[^\\x00-\\x1f\\x7f\\s]+|(?:/|[a-zA-Z]:[/\\\\]|\\\\\\\\)[^\\x00-\\x1f\\x7f]+)$" }), "args": Type.Array(Type.String({ maxLength: 512, pattern: "^(?!-c$|/c$)[^\\x00\\r\\n]+$" }), { maxItems: 32 }) }, { additionalProperties: false }),
  "McpHttpTransport": Type.Object({ "kind": Type.Literal("http"), "url": Type.String({ minLength: 8, maxLength: 2048, pattern: "^https?://(?![^/]*@)(?![^#?]*\\?(?:[^#]*&)?(?:token|key|secret|credential|password)=)[^\\s#?]+(?:/[^\\s#?]*)?(?:\\?[^\\s#]*)?$" }) }, { additionalProperties: false }),
  "McpSseTransport": Type.Object({ "kind": Type.Literal("sse"), "url": Type.String({ minLength: 8, maxLength: 2048, pattern: "^https?://(?![^/]*@)(?![^#?]*\\?(?:[^#]*&)?(?:token|key|secret|credential|password)=)[^\\s#?]+(?:/[^\\s#?]*)?(?:\\?[^\\s#]*)?$" }) }, { additionalProperties: false }),
  "McpSecretBinding": Type.Union([Type.Object({ "kind": Type.Literal("none") }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("stdio-env"), "env": Type.Record(Type.String({ pattern: "^(?!(?:PATH|HOME|SHELL|NODE_OPTIONS|LD_PRELOAD|DYLD_INSERT_LIBRARIES)$)[A-Z][A-Z0-9_]{0,63}$" }), Type.Ref("SecretRef"), { additionalProperties: false, minProperties: 1, maxProperties: 16 }) }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("http-bearer"), "credentialRef": Type.Ref("SecretRef") }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("http-header"), "headerName": Type.Union([Type.Literal("x-api-key"), Type.Literal("x-api-token")]), "credentialRef": Type.Ref("SecretRef") }, { additionalProperties: false })]),
  "McpStdioSecretBinding": Type.Union([Type.Object({ "kind": Type.Literal("none") }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("stdio-env"), "env": Type.Record(Type.String({ pattern: "^(?!(?:PATH|HOME|SHELL|NODE_OPTIONS|LD_PRELOAD|DYLD_INSERT_LIBRARIES)$)[A-Z][A-Z0-9_]{0,63}$" }), Type.Ref("SecretRef"), { additionalProperties: false, minProperties: 1, maxProperties: 16 }) }, { additionalProperties: false })]),
  "McpOAuthSecretBinding": Type.Object({ "kind": Type.Literal("oauth"), "staticClientId": Type.Optional(Type.String({ minLength: 1, maxLength: 512 })) }, { additionalProperties: false }),
  "McpHttpSecretBinding": Type.Union([Type.Object({ "kind": Type.Literal("none") }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("http-bearer"), "credentialRef": Type.Ref("SecretRef") }, { additionalProperties: false }), Type.Object({ "kind": Type.Literal("http-header"), "headerName": Type.Union([Type.Literal("x-api-key"), Type.Literal("x-api-token")]), "credentialRef": Type.Ref("SecretRef") }, { additionalProperties: false }), Type.Ref("McpOAuthSecretBinding")]),
  "McpToolPolicy": Type.Object({ "allow": Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z][A-Za-z0-9_.-]{0,127}$" }), { maxItems: 128, uniqueItems: true })) }, { additionalProperties: false }),
  "McpServerDefinitionInput": Type.Union([Type.Object({ "serverId": Type.Ref("ServerId"), "displayName": Type.String({ minLength: 1, maxLength: 128 }), "transport": Type.Ref("McpStdioTransport"), "secretBinding": Type.Ref("McpStdioSecretBinding"), "toolPolicy": Type.Optional(Type.Ref("McpToolPolicy")) }, { additionalProperties: false }), Type.Object({ "serverId": Type.Ref("ServerId"), "displayName": Type.String({ minLength: 1, maxLength: 128 }), "transport": Type.Ref("McpHttpTransport"), "secretBinding": Type.Ref("McpHttpSecretBinding"), "toolPolicy": Type.Optional(Type.Ref("McpToolPolicy")) }, { additionalProperties: false }), Type.Object({ "serverId": Type.Ref("ServerId"), "displayName": Type.String({ minLength: 1, maxLength: 128 }), "transport": Type.Ref("McpSseTransport"), "secretBinding": Type.Ref("McpHttpSecretBinding"), "toolPolicy": Type.Optional(Type.Ref("McpToolPolicy")) }, { additionalProperties: false })]),
  "McpServerDescriptor": Type.Object({ "kind": Type.Literal("mcp"), "resourceId": Type.Ref("ResourceId"), "serverId": Type.Ref("ServerId"), "displayName": Type.String({ minLength: 1, maxLength: 128 }), "revision": Type.Ref("Revision"), "definition": Type.Ref("McpServerDefinitionInput"), "transportKind": Type.Union([Type.Literal("stdio"), Type.Literal("http"), Type.Literal("sse")]), "secretBindingKind": Type.Union([Type.Literal("none"), Type.Literal("stdio-env"), Type.Literal("http-bearer"), Type.Literal("http-header"), Type.Literal("oauth")]), "trust": Type.Ref("TrustState"), "desired": Type.Ref("DesiredState"), "actual": Type.Ref("ActualState"), "source": Type.Union([Type.Literal("managed"), Type.Literal("legacy-preset")]), "lastSafeError": Type.Optional(Type.Ref("SafeError")), "authorizationStatus": Type.Optional(Type.Union([Type.Union([Type.Literal("pending"), Type.Literal("authorized"), Type.Literal("needs-reconnect"), Type.Literal("error")]), Type.Null()])) }, { additionalProperties: false }),
  "McpStatus": Type.Object({ "serverId": Type.Ref("ServerId"), "connectionState": Type.Union([Type.Literal("disabled"), Type.Literal("connecting"), Type.Literal("ready"), Type.Literal("degraded"), Type.Literal("unavailable")]), "observedRevision": Type.Union([Type.Ref("Revision"), Type.Null()]), "catalogRevision": Type.Union([Type.Ref("Revision"), Type.Null()]), "toolCount": Type.Integer({ minimum: 0, maximum: 1e4 }), "observedAt": Type.String({ format: "date-time" }), "lastSafeError": Type.Optional(Type.Ref("SafeError")), "skippedToolCount": Type.Optional(Type.Integer({ minimum: 0, maximum: 1e4 })), "skippedTools": Type.Optional(Type.Array(Type.Object({ "code": Type.Union([Type.Literal("malformed"), Type.Literal("invalid-name"), Type.Literal("invalid-schema"), Type.Literal("schema-too-large"), Type.Literal("description-too-long")]), "name": Type.Optional(Type.String({ minLength: 1, maxLength: 128 })) }, { additionalProperties: false }), { maxItems: 32 })) }, { additionalProperties: false }),
  "McpInputSchema": Type.Object({ "type": Type.Literal("object"), "properties": Type.Optional(Type.Record(Type.String(), JsonValue11)), "required": Type.Optional(Type.Array(Type.String())), "description": Type.Optional(Type.String({ maxLength: 2048 })) }, { additionalProperties: JsonValue11 }),
  "McpTool": Type.Object({ "name": Type.String({ minLength: 1, maxLength: 128 }), "description": Type.String({ maxLength: 4096 }), "inputSchema": Type.Ref("McpInputSchema") }, { additionalProperties: false }),
  "McpToolCatalogPage": Type.Object({ "serverId": Type.Ref("ServerId"), "catalogRevision": Type.Ref("Revision"), "items": Type.Array(Type.Ref("McpTool"), { maxItems: 100 }), "nextCursor": Type.Optional(Type.String({ maxLength: 256 })) }, { additionalProperties: false }),
  "ResourceOperationReceipt": Type.Object({ "operationId": Type.String({ minLength: 1, maxLength: 128 }), "state": Type.Union([Type.Literal("received"), Type.Literal("running"), Type.Literal("succeeded"), Type.Literal("failed"), Type.Literal("cancelled")]) }, { additionalProperties: false }),
  "ResourceOperation": Type.Object({ "operationId": Type.String({ minLength: 1, maxLength: 128 }), "kind": Type.String({ minLength: 1, maxLength: 64 }), "state": Type.Union([Type.Literal("received"), Type.Literal("running"), Type.Literal("succeeded"), Type.Literal("failed"), Type.Literal("cancelled")]), "profile": Type.Ref("ProfileId"), "target": Type.Ref("ResourceId"), "revision": Type.Ref("Revision"), "createdAt": Type.String({ format: "date-time" }), "updatedAt": Type.String({ format: "date-time" }), "progress": Type.Optional(Type.Integer({ minimum: 0, maximum: 100 })), "result": Type.Optional(Type.Object({ "toolCount": Type.Optional(Type.Integer({ minimum: 0 })), "catalogRevision": Type.Optional(Type.Ref("Revision")) }, { additionalProperties: false })), "lastSafeError": Type.Optional(Type.Ref("SafeError")) }, { additionalProperties: false }),
  "ResourceDescriptor": Type.Union([Type.Ref("SkillDescriptor"), Type.Ref("McpServerDescriptor")]),
  "ResourceListParams": Type.Object({ "profile": Type.Ref("ProfileId"), "kind": Type.Optional(Type.Union([Type.Literal("skill"), Type.Literal("mcp")])), "cursor": Type.Optional(Type.String({ maxLength: 256 })), "workspaceId": Type.Optional(Type.Ref("WorkspaceId")) }, { additionalProperties: false }),
  "ResourceListResult": Type.Object({ "items": Type.Array(Type.Ref("ResourceDescriptor"), { maxItems: 100 }), "nextCursor": Type.Optional(Type.String({ maxLength: 256 })), "skillRoots": Type.Optional(Type.Array(Type.Ref("SkillRootStatus"), { maxItems: 64 })) }, { additionalProperties: false }),
  "ResourceGetParams": Type.Object({ "profile": Type.Ref("ProfileId"), "resourceId": Type.Ref("ResourceId") }, { additionalProperties: false }),
  "ResourceDesiredSetParams": Type.Object({ "profile": Type.Ref("ProfileId"), "resourceId": Type.String({ pattern: "^skill/" }), "state": Type.Ref("DesiredState"), "expectedRevision": Type.Optional(Type.Ref("Revision")), "config": Type.Optional(Type.Object({ "kind": Type.Literal("none") }, { additionalProperties: false })), "clientId": Type.Ref("ClientId"), "commandId": Type.Ref("CommandId") }, { additionalProperties: false }),
  "ResourceOperationGetParams": Type.Object({ "profile": Type.Ref("ProfileId"), "operationId": Type.String({ minLength: 1, maxLength: 128 }) }, { additionalProperties: false }),
  "ResourceOperationCancelParams": Type.Object({ "profile": Type.Ref("ProfileId"), "operationId": Type.String({ minLength: 1, maxLength: 128 }), "clientId": Type.Ref("ClientId"), "commandId": Type.Ref("CommandId") }, { additionalProperties: false }),
  "SkillRefreshParams": Type.Object({ "profile": Type.Ref("ProfileId"), "rootKey": Type.Optional(Type.Ref("SkillRootKey")), "workspaceId": Type.Optional(Type.Ref("WorkspaceId")), "reinstall": Type.Optional(Type.Object({ "resourceId": Type.String({ pattern: "^skill/" }), "expectedRevision": Type.Ref("Revision") }, { additionalProperties: false })), "clientId": Type.Ref("ClientId"), "commandId": Type.Ref("CommandId") }, { additionalProperties: false }),
  "SkillTrustSetParams": Type.Object({ "profile": Type.Ref("ProfileId"), "resourceId": Type.String({ pattern: "^skill/" }), "expectedRevision": Type.Ref("Revision"), "trust": Type.Union([Type.Literal("trusted"), Type.Literal("rejected")]), "clientId": Type.Ref("ClientId"), "commandId": Type.Ref("CommandId") }, { additionalProperties: false }),
  "SkillRemoveParams": Type.Object({ "profile": Type.Ref("ProfileId"), "resourceId": Type.String({ pattern: "^skill/" }), "expectedRevision": Type.Ref("Revision"), "clientId": Type.Ref("ClientId"), "commandId": Type.Ref("CommandId") }, { additionalProperties: false }),
  "SkillPrioritySetParams": Type.Object({ "profile": Type.Ref("ProfileId"), "resourceId": Type.String({ pattern: "^skill/" }), "expectedRevision": Type.Ref("Revision"), "clientId": Type.Ref("ClientId"), "commandId": Type.Ref("CommandId"), "priority": Type.Union([Type.Integer({ minimum: 50, maximum: 500 }), Type.Null()]), "expectedPriority": Type.Integer({ minimum: 50, maximum: 500 }) }, { additionalProperties: false }),
  "McpServerListParams": Type.Object({ "profile": Type.Ref("ProfileId"), "cursor": Type.Optional(Type.String({ maxLength: 256 })) }, { additionalProperties: false }),
  "McpServerListResult": Type.Object({ "items": Type.Array(Type.Ref("McpServerDescriptor"), { maxItems: 100 }), "nextCursor": Type.Optional(Type.String({ maxLength: 256 })) }, { additionalProperties: false }),
  "McpServerGetParams": Type.Object({ "profile": Type.Ref("ProfileId"), "serverId": Type.Ref("ServerId") }, { additionalProperties: false }),
  "McpServerCreateParams": Type.Object({ "profile": Type.Ref("ProfileId"), "definition": Type.Ref("McpServerDefinitionInput"), "clientId": Type.Ref("ClientId"), "commandId": Type.Ref("CommandId") }, { additionalProperties: false }),
  "McpServerUpdateParams": Type.Object({ "profile": Type.Ref("ProfileId"), "serverId": Type.Ref("ServerId"), "expectedRevision": Type.Ref("Revision"), "definition": Type.Ref("McpServerDefinitionInput"), "clientId": Type.Ref("ClientId"), "commandId": Type.Ref("CommandId") }, { additionalProperties: false }),
  "McpServerRemoveParams": Type.Object({ "profile": Type.Ref("ProfileId"), "serverId": Type.Ref("ServerId"), "expectedRevision": Type.Ref("Revision"), "clientId": Type.Ref("ClientId"), "commandId": Type.Ref("CommandId") }, { additionalProperties: false }),
  "McpTrustSetParams": Type.Object({ "profile": Type.Ref("ProfileId"), "serverId": Type.Ref("ServerId"), "expectedRevision": Type.Ref("Revision"), "trust": Type.Union([Type.Literal("trusted"), Type.Literal("rejected")]), "clientId": Type.Ref("ClientId"), "commandId": Type.Ref("CommandId") }, { additionalProperties: false }),
  "McpServerTestParams": Type.Object({ "profile": Type.Ref("ProfileId"), "serverId": Type.Ref("ServerId"), "expectedRevision": Type.Ref("Revision"), "clientId": Type.Ref("ClientId"), "commandId": Type.Ref("CommandId") }, { additionalProperties: false }),
  "McpServerEnableParams": Type.Object({ "profile": Type.Ref("ProfileId"), "serverId": Type.Ref("ServerId"), "expectedRevision": Type.Ref("Revision"), "clientId": Type.Ref("ClientId"), "commandId": Type.Ref("CommandId") }, { additionalProperties: false }),
  "McpServerDisableParams": Type.Object({ "profile": Type.Ref("ProfileId"), "serverId": Type.Ref("ServerId"), "expectedRevision": Type.Ref("Revision"), "clientId": Type.Ref("ClientId"), "commandId": Type.Ref("CommandId") }, { additionalProperties: false }),
  "McpServerReconnectParams": Type.Object({ "profile": Type.Ref("ProfileId"), "serverId": Type.Ref("ServerId"), "expectedRevision": Type.Ref("Revision"), "clientId": Type.Ref("ClientId"), "commandId": Type.Ref("CommandId") }, { additionalProperties: false }),
  "McpToolsListParams": Type.Object({ "profile": Type.Ref("ProfileId"), "serverId": Type.Ref("ServerId"), "cursor": Type.Optional(Type.String({ maxLength: 256 })) }, { additionalProperties: false }),
  "McpOAuthStatusSetParams": Type.Object({ "profile": Type.Ref("ProfileId"), "serverId": Type.Ref("ServerId"), "status": Type.Union([Type.Literal("authorized"), Type.Literal("needs-reconnect"), Type.Literal("error")]) }, { additionalProperties: false }),
  "McpOAuthStatusResult": Type.Object({ "authorizationStatus": Type.Union([Type.Union([Type.Literal("pending"), Type.Literal("authorized"), Type.Literal("needs-reconnect"), Type.Literal("error")]), Type.Null()]), "lastSafeError": Type.Optional(Type.Ref("SafeError")) }, { additionalProperties: false }),
  "SecretRef": Type.String({ pattern: "^secret://[a-z0-9-]+/[a-z0-9._-]+$" })
});
var ResourcePermission = ResourceControlSchema.Import("ResourcePermission");
var ProfileId = ResourceControlSchema.Import("ProfileId");
var ResourceId = ResourceControlSchema.Import("ResourceId");
var ServerId = ResourceControlSchema.Import("ServerId");
var Revision = ResourceControlSchema.Import("Revision");
var WorkspaceId = ResourceControlSchema.Import("WorkspaceId");
var CommandId = ResourceControlSchema.Import("CommandId");
var ClientId = ResourceControlSchema.Import("ClientId");
var SourceScope = ResourceControlSchema.Import("SourceScope");
var SkillRootKey = ResourceControlSchema.Import("SkillRootKey");
var SkillRootDiagnostic = ResourceControlSchema.Import("SkillRootDiagnostic");
var SkillRootStatus = ResourceControlSchema.Import("SkillRootStatus");
var SkillSourceIdentity = ResourceControlSchema.Import("SkillSourceIdentity");
var SkillResolution = ResourceControlSchema.Import("SkillResolution");
var TrustState = ResourceControlSchema.Import("TrustState");
var DesiredState = ResourceControlSchema.Import("DesiredState");
var ActualState = ResourceControlSchema.Import("ActualState");
var SafeError = ResourceControlSchema.Import("SafeError");
var SkillDescriptor = ResourceControlSchema.Import("SkillDescriptor");
var McpEnvName = ResourceControlSchema.Import("McpEnvName");
var McpStdioTransport = ResourceControlSchema.Import("McpStdioTransport");
var McpHttpTransport = ResourceControlSchema.Import("McpHttpTransport");
var McpSseTransport = ResourceControlSchema.Import("McpSseTransport");
var McpSecretBinding = ResourceControlSchema.Import("McpSecretBinding");
var McpStdioSecretBinding = ResourceControlSchema.Import("McpStdioSecretBinding");
var McpOAuthSecretBinding = ResourceControlSchema.Import("McpOAuthSecretBinding");
var McpHttpSecretBinding = ResourceControlSchema.Import("McpHttpSecretBinding");
var McpToolPolicy = ResourceControlSchema.Import("McpToolPolicy");
var McpServerDefinitionInput = ResourceControlSchema.Import("McpServerDefinitionInput");
var McpServerDescriptor = ResourceControlSchema.Import("McpServerDescriptor");
var McpStatus = ResourceControlSchema.Import("McpStatus");
var McpInputSchema = ResourceControlSchema.Import("McpInputSchema");
var McpTool = ResourceControlSchema.Import("McpTool");
var McpToolCatalogPage = ResourceControlSchema.Import("McpToolCatalogPage");
var ResourceOperationReceipt = ResourceControlSchema.Import("ResourceOperationReceipt");
var ResourceOperation = ResourceControlSchema.Import("ResourceOperation");
var ResourceDescriptor = ResourceControlSchema.Import("ResourceDescriptor");
var ResourceListParams = ResourceControlSchema.Import("ResourceListParams");
var ResourceListResult = ResourceControlSchema.Import("ResourceListResult");
var ResourceGetParams = ResourceControlSchema.Import("ResourceGetParams");
var ResourceDesiredSetParams = ResourceControlSchema.Import("ResourceDesiredSetParams");
var ResourceOperationGetParams = ResourceControlSchema.Import("ResourceOperationGetParams");
var ResourceOperationCancelParams = ResourceControlSchema.Import("ResourceOperationCancelParams");
var SkillRefreshParams = ResourceControlSchema.Import("SkillRefreshParams");
var SkillTrustSetParams = ResourceControlSchema.Import("SkillTrustSetParams");
var SkillRemoveParams = ResourceControlSchema.Import("SkillRemoveParams");
var SkillPrioritySetParams = ResourceControlSchema.Import("SkillPrioritySetParams");
var McpServerListParams = ResourceControlSchema.Import("McpServerListParams");
var McpServerListResult = ResourceControlSchema.Import("McpServerListResult");
var McpServerGetParams = ResourceControlSchema.Import("McpServerGetParams");
var McpServerCreateParams = ResourceControlSchema.Import("McpServerCreateParams");
var McpServerUpdateParams = ResourceControlSchema.Import("McpServerUpdateParams");
var McpServerRemoveParams = ResourceControlSchema.Import("McpServerRemoveParams");
var McpTrustSetParams = ResourceControlSchema.Import("McpTrustSetParams");
var McpServerTestParams = ResourceControlSchema.Import("McpServerTestParams");
var McpServerEnableParams = ResourceControlSchema.Import("McpServerEnableParams");
var McpServerDisableParams = ResourceControlSchema.Import("McpServerDisableParams");
var McpServerReconnectParams = ResourceControlSchema.Import("McpServerReconnectParams");
var McpToolsListParams = ResourceControlSchema.Import("McpToolsListParams");
var McpOAuthStatusSetParams = ResourceControlSchema.Import("McpOAuthStatusSetParams");
var McpOAuthStatusResult = ResourceControlSchema.Import("McpOAuthStatusResult");
var SecretRef3 = ResourceControlSchema.Import("SecretRef");

// ../resource-control-contracts/src/resource-control.ts
var jsonData = (value, maxBytes = 1048576) => {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) return { ok: false };
  const active = /* @__PURE__ */ new Set();
  const walk = (item, depth) => {
    if (depth > 32) throw new Error("nesting exceeds 32");
    if (item === null || typeof item === "string" || typeof item === "boolean") return item;
    if (typeof item === "number") {
      if (Number.isFinite(item)) return item;
      throw new Error("non-finite number");
    }
    if (typeof item !== "object" || active.has(item)) throw new Error("not data");
    const array = Array.isArray(item);
    const prototype = Object.getPrototypeOf(item);
    if (array ? prototype !== Array.prototype : prototype !== null && prototype !== Object.prototype)
      throw new Error("non-plain object");
    const descriptors = Object.getOwnPropertyDescriptors(item);
    if (Object.getOwnPropertySymbols(item).length) throw new Error("symbol key");
    active.add(item);
    const result = array ? [] : /* @__PURE__ */ Object.create(null);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (array && key === "length") continue;
      if (!descriptor.enumerable || !("value" in descriptor)) throw new Error("non-data property");
      Object.defineProperty(result, key, { value: walk(descriptor.value, depth + 1), enumerable: true });
    }
    active.delete(item);
    return result;
  };
  try {
    const snapshot = walk(value, 0);
    return new TextEncoder().encode(JSON.stringify(snapshot)).byteLength <= maxBytes ? { ok: true, value: snapshot } : { ok: false };
  } catch {
    return { ok: false };
  }
};
var classify2 = (error) => {
  const key = error.path.split("/").pop() || void 0;
  if (error.type === ValueErrorType.ObjectRequiredProperty)
    return {
      path: key ? error.path.slice(0, -key.length - 1) : error.path,
      message: error.message,
      code: "MISSING",
      ...key ? { key } : {}
    };
  const base = { path: error.path, message: error.message, ...key ? { key } : {} };
  if (error.type === ValueErrorType.ObjectAdditionalProperties) return { ...base, code: "UNKNOWN_KEY" };
  if (error.type === ValueErrorType.Union || error.type === ValueErrorType.Literal)
    return { ...base, code: "ENUM" };
  if (error.type === ValueErrorType.StringPattern || error.type === ValueErrorType.StringFormat)
    return { ...base, code: "PATTERN" };
  if ([
    ValueErrorType.StringMinLength,
    ValueErrorType.StringMaxLength,
    ValueErrorType.NumberMinimum,
    ValueErrorType.NumberMaximum,
    ValueErrorType.IntegerMinimum,
    ValueErrorType.IntegerMaximum,
    ValueErrorType.IntegerExclusiveMinimum,
    ValueErrorType.IntegerExclusiveMaximum,
    ValueErrorType.NumberExclusiveMinimum,
    ValueErrorType.NumberExclusiveMaximum,
    ValueErrorType.ArrayMinItems,
    ValueErrorType.ArrayMaxItems
  ].includes(error.type))
    return { ...base, code: "RANGE" };
  if ([
    ValueErrorType.Null,
    ValueErrorType.String,
    ValueErrorType.Number,
    ValueErrorType.Integer,
    ValueErrorType.Boolean,
    ValueErrorType.Object,
    ValueErrorType.Array
  ].includes(error.type))
    return { ...base, code: "TYPE" };
  return { ...base, code: "OTHER" };
};
var validate = (schema, value) => {
  if (value_exports2.Check(schema, value)) return { ok: true, value };
  const errors = [...value_exports2.Errors(schema, value)].map(classify2);
  return { ok: false, errors: errors.length ? errors : [{ path: "", message: "invalid", code: "OTHER" }] };
};
var RESOURCE_CONTROL_PERMISSIONS = Object.freeze([
  "resources.read",
  "resources.skills.write",
  "resources.reconcile",
  "skills.refresh",
  "skills.trust",
  "mcp.read",
  "mcp.tools.read",
  "mcp.manage",
  "mcp.trust",
  "mcp.test",
  "mcp.activate",
  "mcp.reconnect",
  "secrets.use"
]);
var contract2 = (params, result, execution, permission) => Object.freeze({
  kind: "request",
  direction: "c2s",
  params,
  result,
  administration: Object.freeze({
    execution,
    permission,
    identity: execution === "read" ? "none" : "principal-client-command"
  })
});
var RESOURCE_CONTROL_METHODS = Object.freeze({
  "_agnes/v1/resources.list": contract2(ResourceListParams, ResourceListResult, "read", "resources.read"),
  "_agnes/v1/resources.get": contract2(ResourceGetParams, ResourceDescriptor, "read", "resources.read"),
  "_agnes/v1/resources.desired.set": contract2(
    ResourceDesiredSetParams,
    ResourceOperationReceipt,
    "effect",
    "resources.skills.write"
  ),
  "_agnes/v1/resources.operation.get": contract2(
    ResourceOperationGetParams,
    ResourceOperation,
    "read",
    "resources.read"
  ),
  "_agnes/v1/resources.operation.cancel": contract2(
    ResourceOperationCancelParams,
    ResourceOperationReceipt,
    "unblock",
    "resources.reconcile"
  ),
  "_agnes/v1/skills.refresh": contract2(
    SkillRefreshParams,
    ResourceOperationReceipt,
    "effect",
    "skills.refresh"
  ),
  "_agnes/v1/skills.remove": contract2(
    SkillRemoveParams,
    ResourceOperationReceipt,
    "effect",
    "resources.skills.write"
  ),
  "_agnes/v1/skills.priority.set": contract2(
    SkillPrioritySetParams,
    ResourceOperationReceipt,
    "effect",
    "resources.skills.write"
  ),
  "_agnes/v1/skills.trust.set": contract2(
    SkillTrustSetParams,
    ResourceOperationReceipt,
    "effect",
    "skills.trust"
  ),
  "_agnes/v1/mcp.servers.list": contract2(McpServerListParams, McpServerListResult, "read", "mcp.read"),
  "_agnes/v1/mcp.servers.get": contract2(McpServerGetParams, McpServerDescriptor, "read", "mcp.read"),
  "_agnes/v1/mcp.servers.status": contract2(McpServerGetParams, McpStatus, "read", "mcp.read"),
  "_agnes/v1/mcp.servers.tools.list": contract2(
    McpToolsListParams,
    McpToolCatalogPage,
    "read",
    "mcp.tools.read"
  ),
  "_agnes/v1/mcp.servers.create": contract2(
    McpServerCreateParams,
    ResourceOperationReceipt,
    "effect",
    "mcp.manage"
  ),
  "_agnes/v1/mcp.servers.update": contract2(
    McpServerUpdateParams,
    ResourceOperationReceipt,
    "effect",
    "mcp.manage"
  ),
  "_agnes/v1/mcp.servers.remove": contract2(
    McpServerRemoveParams,
    ResourceOperationReceipt,
    "effect",
    "mcp.manage"
  ),
  "_agnes/v1/mcp.servers.trust.set": contract2(
    McpTrustSetParams,
    ResourceOperationReceipt,
    "effect",
    "mcp.trust"
  ),
  "_agnes/v1/mcp.servers.test": contract2(
    McpServerTestParams,
    ResourceOperationReceipt,
    "effect",
    "mcp.test"
  ),
  "_agnes/v1/mcp.servers.enable": contract2(
    McpServerEnableParams,
    ResourceOperationReceipt,
    "effect",
    "mcp.activate"
  ),
  "_agnes/v1/mcp.servers.disable": contract2(
    McpServerDisableParams,
    ResourceOperationReceipt,
    "effect",
    "mcp.activate"
  ),
  "_agnes/v1/mcp.servers.reconnect": contract2(
    McpServerReconnectParams,
    ResourceOperationReceipt,
    "effect",
    "mcp.reconnect"
  ),
  // Pure durable-journal read: mirrors '_agnes/v1/mcp.servers.status' exactly (same params type,
  // same 'read'/'mcp.read' pairing) - it is the same kind of operation, just projecting a narrower
  // slice (authorizationStatus/lastSafeError) of the same descriptor mcp.servers.get already
  // returns in full. See McpResourceStore.call() in resource-control-store for the read path.
  "_agnes/v1/mcp.servers.oauth.status": contract2(
    McpServerGetParams,
    McpOAuthStatusResult,
    "read",
    "mcp.read"
  ),
  // Durable write, closing the gap the mcp-oauth-authorization plan's Task 4 deliberately left open
  // (oauth-http-handler.ts's `onAuthorizationStatus` hook): the daemon HTTP callback endpoint runs
  // in a different process than the daemon that owns this journal, so it cannot write
  // authorizationStatus directly - it calls this method over the same private Unix-socket transport
  // every other mcp.servers.* method already uses. 'mcp.manage' (not a new permission) because this
  // mutates the same server-level configuration surface create/update/remove already gate behind
  // it. Params deliberately omit clientId/commandId/expectedRevision: unlike trust.set/enable/
  // disable, this is never a browser-initiated, replay-sensitive command - its only caller is the
  // trusted local launcher process reporting the outcome of a flow it alone drove end to end, once,
  // synchronously after a real token exchange. See McpResourceStore's direct (non-effect()-pipeline)
  // dispatch for why it is still labelled 'effect' despite that: it genuinely mutates durable state,
  // which is what this label - and excluding it from the resource-admin BFF's read-only recovery
  // mode - is actually for; the unused 'principal-client-command' identity metadata is the one part
  // of the sibling convention this method does not literally satisfy, and administration.identity is
  // not read by any runtime code today (verified: only .execution and .permission are consumed).
  "_agnes/v1/mcp.servers.oauth.status.set": contract2(
    McpOAuthStatusSetParams,
    McpOAuthStatusResult,
    "effect",
    "mcp.manage"
  )
});
function check2(schema, value) {
  const inspected = jsonData(value, 1048576);
  return inspected.ok ? validate(schema, inspected.value) : { ok: false, errors: [{ path: "", code: "TYPE", message: "expected bounded strict JSON data" }] };
}
function validateResourceControlCall(name, side, value) {
  return check2(RESOURCE_CONTROL_METHODS[name][side], value);
}

// ../protocol/gen/ts/extension-service.ts
var JsonValue12 = Type.Recursive((This) => Type.Union([Type.Null(), Type.Boolean(), Type.Number(), Type.String(), Type.Array(This), Type.Record(Type.String(), This)]));
var ExtensionServiceSchema = Type.Module({
  "ServiceCapability": Type.Object({ "name": Type.String({ maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "kind": Type.Union([Type.Literal("query"), Type.Literal("effect")]), "inputSchema": Type.Ref("ParametersSchema"), "outputSchema": Type.Record(Type.String(), JsonValue12), "timeoutMs": Type.Integer({ minimum: 1, maximum: 3e4 }), "maxResultBytes": Type.Integer({ minimum: 1, maximum: 1048576 }) }, { additionalProperties: false }),
  "ExtensionCallParams": Type.Object({ "sessionId": Type.String({ minLength: 1, maxLength: 512 }), "extension": Type.String({ pattern: "^[a-z0-9-]+/[a-z0-9-]+$" }), "service": Type.String({ maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "input": Type.Record(Type.String(), JsonValue12), "commandId": Type.Optional(Type.String({ minLength: 1, maxLength: 128 })) }, { additionalProperties: false }),
  "ExtensionCallResult": Type.Object({ "output": JsonValue12 }, { additionalProperties: false }),
  "ExtensionAckParams": Type.Object({ "extension": Type.String({ pattern: "^[a-z0-9-]+/[a-z0-9-]+$" }), "service": Type.String({ maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "commandId": Type.String({ minLength: 1, maxLength: 128 }) }, { additionalProperties: false }),
  "ExtensionCallError": Type.Union([Type.Object({ "code": Type.Literal(-32001), "message": Type.Literal("OVERLOADED"), "data": Type.Object({ "code": Type.Literal("OVERLOADED") }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "code": Type.Literal(-32006), "message": Type.Literal("CAPABILITY_DENIED"), "data": Type.Object({ "code": Type.Literal("CAPABILITY_DENIED") }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "code": Type.Literal(-32602), "message": Type.Literal("INVALID_PARAMS"), "data": Type.Object({ "code": Type.Literal("INVALID_PARAMS") }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "code": Type.Literal(-32011), "message": Type.Literal("SEMANTIC_REJECTED"), "data": Type.Object({ "code": Type.Literal("ID_CONFLICT") }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "code": Type.Literal(-32012), "message": Type.Literal("REQUEST_TIMEOUT"), "data": Type.Object({ "code": Type.Literal("REQUEST_TIMEOUT") }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "code": Type.Literal(-32603), "message": Type.Literal("INTERNAL_ERROR"), "data": Type.Object({ "code": Type.Union([Type.Literal("INTERNAL_ERROR"), Type.Literal("E_WORKSPACE_REQUIRED")]) }, { additionalProperties: false }) }, { additionalProperties: false }), Type.Object({ "code": Type.Literal(-32013), "message": Type.Literal("OUTCOME_UNKNOWN"), "data": Type.Object({ "code": Type.Literal("OUTCOME_UNKNOWN") }, { additionalProperties: false }) }, { additionalProperties: false })]),
  "ParametersSchema": Type.Object({ "type": Type.Literal("object"), "properties": Type.Record(Type.String(), JsonValue12), "required": Type.Optional(Type.Array(Type.String())), "additionalProperties": Type.Literal(false), "description": Type.Optional(Type.String({ maxLength: 2048 })) }, { additionalProperties: false })
});
var ServiceCapability5 = ExtensionServiceSchema.Import("ServiceCapability");
var ExtensionCallParams2 = ExtensionServiceSchema.Import("ExtensionCallParams");
var ExtensionCallResult3 = ExtensionServiceSchema.Import("ExtensionCallResult");
var ExtensionAckParams2 = ExtensionServiceSchema.Import("ExtensionAckParams");
var ExtensionCallError2 = ExtensionServiceSchema.Import("ExtensionCallError");
var ParametersSchema6 = ExtensionServiceSchema.Import("ParametersSchema");

// ../protocol/src/services.ts
var jsonBytes = (value) => new TextEncoder().encode(jcs(value)).byteLength;
function check3(schema, value) {
  try {
    jsonBytes(value);
    return validateAgainst(schema, value);
  } catch {
    return { ok: false, errors: [{ path: "", code: "TYPE", message: "expected strict JSON data" }] };
  }
}
function validateExtensionCall(side, value) {
  const checked = check3(
    side === "params" ? ExtensionCallParams : ExtensionCallResult2,
    value
  );
  if (!checked.ok) return checked;
  const key = side === "params" ? "input" : "output";
  const data = checked.value[key];
  if (jsonBytes(data) > 1048576)
    return { ok: false, errors: [{ path: `/${key}`, code: "RANGE", message: "JSON exceeds 1 MiB" }] };
  return checked;
}

// ../protocol/src/methods.ts
var clientRequest = (params, result) => ({
  kind: "request",
  direction: "c2s",
  params,
  result
});
var METHODS = {
  ...PACKAGE_ADMIN_METHODS,
  ...RESOURCE_CONTROL_METHODS,
  "_agnes/v1/extension.ack": clientRequest(ExtensionAckParams, Empty),
  "_agnes/v1/extension.call": clientRequest(ExtensionCallParams, ExtensionCallResult2),
  "_agnes/v1/config.get": clientRequest(ConfigEmptyParams, ConfigSnapshot),
  "_agnes/v1/config.oauth": clientRequest(ConfigOAuthInput, ConfigOAuthResult),
  "_agnes/v1/config.providers": clientRequest(ConfigEmptyParams, ConfigProvidersResult),
  "_agnes/v1/config.test": clientRequest(ConfigTestInput, ConfigTestResult),
  "_agnes/v1/config.save": clientRequest(ConfigSaveInput, ConfigSnapshot),
  "_agnes/v1/config.account": clientRequest(ConfigAccountInput, ConfigSnapshot),
  "_agnes/v1/computerUse.status": clientRequest(Empty, ComputerUseStatusResult),
  "_agnes/v1/computerUse.permissions.status": clientRequest(Empty, ComputerUsePermissionsStatusResult),
  "_agnes/v1/computerUse.permissions.grant": clientRequest(Empty, ComputerUsePermissionsStatusResult),
  "_agnes/v1/computerUse.doctor": clientRequest(ComputerUseDoctorParams, ComputerUseDoctorResult),
  "_agnes/v1/computerUse.operation.start": clientRequest(
    ComputerUseOperationStartParams,
    ComputerUseOperationResult
  ),
  "_agnes/v1/computerUse.operation.status": clientRequest(
    ComputerUseOperationStatusParams,
    ComputerUseOperationResult
  ),
  "_agnes/v1/computerUse.operation.cancel": clientRequest(
    ComputerUseOperationIdParams,
    ComputerUseOperationResult
  ),
  "_agnes/v1/approvalGrants.list": clientRequest(ApprovalGrantListParams, ApprovalGrantListResult),
  "_agnes/v1/approvalGrants.revoke": clientRequest(ApprovalGrantRevokeParams, ApprovalGrantRecord),
  "_agnes/v1/artifact.read": clientRequest(ArtifactReadParams, ArtifactReadResult),
  initialize: {
    kind: "request",
    direction: "c2s",
    params: InitializeRequest,
    result: InitializeResponse
  },
  "session/new": {
    kind: "request",
    direction: "c2s",
    params: NewSessionRequest,
    result: NewSessionResponse
  },
  "session/prompt": {
    kind: "request",
    direction: "c2s",
    params: PromptRequest,
    result: PromptResponse
  },
  "session/cancel": { kind: "notification", direction: "c2s", params: CancelNotification },
  "session/update": { kind: "notification", direction: "s2c", params: SessionNotification },
  "session/request_permission": {
    kind: "request",
    direction: "s2c",
    params: RequestPermissionRequest,
    result: RequestPermissionResponse
  },
  "_agnes/v1/session.attach": {
    kind: "request",
    direction: "c2s",
    params: SessionAttachParams,
    result: SessionAttachResult
  },
  "_agnes/v1/session.steer": {
    kind: "request",
    direction: "c2s",
    params: SessionSteerParams,
    result: SessionSteerResult
  },
  "_agnes/v1/session.budget": {
    kind: "request",
    direction: "c2s",
    params: SessionIdParams,
    result: SessionBudgetResult
  },
  "_agnes/v1/session.projectUI": {
    kind: "request",
    direction: "c2s",
    params: SessionProjectUIParams,
    result: UITimeline
  },
  "_agnes/v1/session.projectUIPatch": {
    kind: "request",
    direction: "c2s",
    params: SessionProjectUIPatchParams,
    result: UIProjectionUpdate
  },
  "_agnes/v1/session.projectUIOpening": {
    kind: "request",
    direction: "c2s",
    params: SessionProjectUIOpeningParams,
    result: UIOpeningResult
  },
  "_agnes/v1/session.projectUIHistory": {
    kind: "request",
    direction: "c2s",
    params: SessionProjectUIHistoryParams,
    result: UIHistoryPage
  },
  "_agnes/v1/session.readToolDetail": clientRequest(
    SessionReadToolDetailParams,
    SessionReadToolDetailResult
  ),
  "_agnes/v1/session.followUp": {
    kind: "request",
    direction: "c2s",
    params: SessionSteerParams,
    result: SessionSteerResult
  },
  "_agnes/v1/session.fork": {
    kind: "request",
    direction: "c2s",
    params: SessionForkParams,
    result: SessionIdParams
  },
  "_agnes/v1/session.rename": clientRequest(SessionRenameParams, SessionPreferences),
  "_agnes/v1/session.archive": clientRequest(SessionArchiveParams, SessionPreferences),
  "_agnes/v1/diagnostics.collect": clientRequest(DiagnosticsCollectParams, DiagnosticsCollectResult),
  "_agnes/v1/diagnostics.events": clientRequest(DiagnosticsEventsParams, DiagnosticsEventsResult),
  "_agnes/v1/session.list": {
    kind: "request",
    direction: "c2s",
    params: SessionListParams,
    result: PageSessionMeta
  },
  "_agnes/v1/workspace.list": clientRequest(WorkspaceListParams, WorkspaceListResult),
  "_agnes/v1/workspace.add": clientRequest(WorkspaceAddParams, WorkspaceAddResult),
  "_agnes/v1/session.setPreset": {
    kind: "request",
    direction: "c2s",
    params: SessionSetPresetParams,
    result: EffectiveFromResult
  },
  "_agnes/v1/session.setModel": {
    kind: "request",
    direction: "c2s",
    params: SessionSetModelParams,
    result: EffectiveFromResult
  },
  "_agnes/v1/session.setYolo": clientRequest(SessionSetYoloParams, EffectiveFromResult),
  "_agnes/v1/approval.decide": clientRequest(ApprovalDecideParams, SeqResult),
  "_agnes/v1/participant.join": clientRequest(ParticipantParams, SeqResult),
  "_agnes/v1/participant.leave": clientRequest(ParticipantParams, SeqResult),
  "_agnes/v1/participant.list": clientRequest(SessionIdParams, ParticipantListResult),
  "_agnes/v1/jobs.enqueue": clientRequest(JobSpec2, JobIdResult),
  "_agnes/v1/jobs.poll": clientRequest(JobIdParams, JobStatus2),
  "_agnes/v1/jobs.cancel": clientRequest(JobIdParams, Empty),
  "_agnes/v1/artifact.job.status": clientRequest(JobIdParams, ArtifactJob2),
  "_agnes/v1/ext.ui.response": clientRequest(ExtUiResponseParams, SeqResult),
  "_agnes/v1/directory.upsert": clientRequest(DirectoryUpsertParams, DirectoryUpsertResult),
  "_agnes/v1/apis.list": {
    kind: "request",
    direction: "c2s",
    params: ApisListParams,
    result: ApisListResult
  },
  "_agnes/v1/submit": { kind: "request", direction: "c2s", params: SubmitParams, result: Ack },
  "_agnes/v1/submit.ack": {
    kind: "request",
    direction: "c2s",
    params: CommandAckParams,
    result: Empty
  },
  // Read-only Surface mount->endpoint table, consulted by the CLI/Web OS process (`agnes serve`) to
  // bridge createMountProxy's lookup() across the process boundary to `agnesd` (see
  // packages/daemon/src/local/methods/surfaces.ts and packages/cli/launch/web-command.ts). No
  // authKind restriction beyond LocalEndpoint's own initialize gate, same as workspace.list/add.
  "_agnes/v1/surfaces.mounts": clientRequest(SurfacesMountsParams, SurfacesMountsResult),
  // Pulled forward from I3. daemon's dispatcher answers -32601 from this table before it reaches any
  // handler, so a method daemon registers and this table omits is unreachable rather than merely
  // unvalidated.
  authenticate: {
    kind: "request",
    direction: "c2s",
    params: AuthenticateRequest,
    result: AuthenticateResponse
  },
  "session/load": {
    kind: "request",
    direction: "c2s",
    params: LoadSessionRequest,
    result: LoadSessionResponse
  },
  "session/set_mode": {
    kind: "request",
    direction: "c2s",
    params: SetSessionModeRequest,
    result: SetSessionModeResponse
  },
  "_agnes/v1/session.detach": {
    kind: "request",
    direction: "c2s",
    params: SessionIdParams,
    result: Empty
  },
  "_agnes/v1/auth.claim": {
    kind: "request",
    direction: "c2s",
    params: AuthClaimParams,
    result: AuthClaimResult
  },
  // Outbound only. Their params are consulted on both sides: a client validating what it receives
  // reads them, so does the conformance runner, and so does the server before it puts the frame on
  // the wire - daemon's LocalEndpoint refuses an s2c frame this table's schema rejects.
  "_agnes/v1/session.event": { kind: "notification", direction: "s2c", params: SessionEventParams },
  "_agnes/v1/session.preview": { kind: "notification", direction: "s2c", params: SessionPreviewParams },
  "_agnes/v1/daemon.notice": { kind: "notification", direction: "s2c", params: DaemonNotice }
};
function validateMethod(name, side, x) {
  if (Object.hasOwn(PACKAGE_ADMIN_METHODS, name))
    return validatePackageAdminCall(name, side, x);
  if (Object.hasOwn(RESOURCE_CONTROL_METHODS, name))
    return validateResourceControlCall(name, side, x);
  if (name === "_agnes/v1/extension.call") return validateExtensionCall(side, x);
  const spec = METHODS[name];
  const schema = side === "params" ? spec.params : spec.result;
  if (!schema) return { ok: false, errors: [{ path: "", message: `${name} has no ${side}`, code: "OTHER" }] };
  return validateAgainst(schema, x);
}

// ../protocol/gen/ts/model.ts
if (!format_exports.Has("date-time")) format_exports.Set("date-time", (value) => {
  const parts = value.split(/t/i);
  if (parts.length !== 2) return false;
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(parts[0] ?? "");
  const time = /^(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)(z|([+-])(\d{2}):(\d{2}))$/i.exec(parts[1] ?? "");
  if (!date || !time) return false;
  const year = Number(date[1]), month = Number(date[2]), day = Number(date[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > (days[month] ?? 0)) return false;
  const hour = Number(time[1]), minute = Number(time[2]), second = Number(time[3]);
  const offsetHour = Number(time[6] || 0), offsetMinute = Number(time[7] || 0);
  if (hour > 23 || minute > 59 || offsetHour > 23 || offsetMinute > 59) return false;
  if (second < 60) return true;
  const sign = time[5] === "-" ? -1 : 1;
  const utcMinute = minute - offsetMinute * sign;
  const utcHour = hour - offsetHour * sign - (utcMinute < 0 ? 1 : 0);
  return (utcHour === 23 || utcHour === -1) && (utcMinute === 59 || utcMinute === -1) && second < 61;
});
var JsonValue13 = Type.Recursive((This) => Type.Union([Type.Null(), Type.Boolean(), Type.Number(), Type.String(), Type.Array(This), Type.Record(Type.String(), This)]));
var ModelV1 = Type.Module({
  "ContentBlock": Type.Union([Type.Object({ "type": Type.Literal("text"), "text": Type.String({ maxLength: 1048576 }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("image"), "data": Type.String(), "mimeType": Type.String({ maxLength: 128 }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("file"), "data": Type.String(), "mimeType": Type.String({ minLength: 1, maxLength: 128 }), "name": Type.String({ minLength: 1, maxLength: 256 }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("resource_link"), "uri": Type.String({ maxLength: 4096 }), "name": Type.Optional(Type.String({ maxLength: 256 })), "mimeType": Type.Optional(Type.String({ maxLength: 128 })) }, { additionalProperties: false })]),
  "ToolCall": Type.Intersect([Type.Object({ "toolUseId": Type.String({ maxLength: 128 }), "name": Type.String({ pattern: "^[A-Za-z_][A-Za-z0-9_]{0,63}$" }), "args": JsonValue13, "ordinal": Type.Integer({ minimum: 0 }), "depth": Type.Optional(Type.Integer({ minimum: 0 })), "parentEffectId": Type.Optional(Type.String({ maxLength: 128 })), "resolvedPolicy": Type.Optional(Type.Ref("ResolvedToolCallPolicy")), "executionDomain": Type.Optional(Type.Ref("ExecutionDomain")), "definitionFingerprint": Type.Optional(Type.String({ pattern: "^[0-9a-f]{64}$" })), "policyHash": Type.Optional(Type.String({ pattern: "^[0-9a-f]{64}$" })) }, { additionalProperties: false }), Type.Union([Type.Not(Type.Union([Type.Object({ "resolvedPolicy": Type.Unknown() }), Type.Object({ "executionDomain": Type.Unknown() }), Type.Object({ "definitionFingerprint": Type.Unknown() }), Type.Object({ "policyHash": Type.Unknown() })])), Type.Object({ "resolvedPolicy": Type.Unknown(), "executionDomain": Type.Unknown(), "definitionFingerprint": Type.Unknown(), "policyHash": Type.Unknown() })])]),
  "SlotName": Type.Union([Type.Literal("primary"), Type.Literal("escalation"), Type.Literal("fast"), Type.Literal("compaction"), Type.Literal("verifier"), Type.Literal("image"), Type.Literal("video")]),
  "ThinkingLevel": Type.Union([Type.Literal("off"), Type.Literal("minimal"), Type.Literal("low"), Type.Literal("medium"), Type.Literal("high"), Type.Literal("xhigh"), Type.Literal("max")]),
  "ModelSettings": Type.Object({ "thinking": Type.Optional(Type.Ref("ThinkingLevel")), "contextWindow": Type.Optional(Type.Integer({ minimum: 1, maximum: 9007199254740991 })) }, { additionalProperties: false }),
  "AiErrorCode": Type.Union([Type.Literal("AUTH"), Type.Literal("RATE_LIMIT"), Type.Literal("QUOTA"), Type.Literal("OVERFLOW"), Type.Literal("TIMEOUT"), Type.Literal("NO_MODEL"), Type.Literal("NO_ADAPTER"), Type.Literal("FORMAT"), Type.Literal("TRANSPORT"), Type.Literal("CONTRACT_MISMATCH"), Type.Literal("ABORTED")]),
  "DecodeRule": Type.Union([Type.Literal("reasoning_field"), Type.Literal("think_tag"), Type.Literal("qwen3_coder"), Type.Literal("anthropic_invoke"), Type.Literal("hermes_tool_call"), Type.Literal("inline_json"), Type.Literal("lenient_json")]),
  "Sha256": Type.String({ pattern: "^[0-9a-f]{64}$" }),
  "ToolSchema": Type.Object({ "name": Type.String({ pattern: "^[A-Za-z_][A-Za-z0-9_]{0,63}$" }), "description": Type.String({ maxLength: 4096 }), "parameters": JsonValue13 }, { additionalProperties: false }),
  "RequestMessage": Type.Union([Type.Object({ "role": Type.Literal("user"), "content": Type.Array(Type.Ref("ContentBlock")) }, { additionalProperties: false }), Type.Object({ "role": Type.Literal("assistant"), "content": Type.Array(Type.Union([Type.Object({ "type": Type.Literal("text"), "text": Type.String() }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("thinking"), "text": Type.String() }, { additionalProperties: false })])), "toolCalls": Type.Optional(Type.Array(Type.Ref("ToolCall"))) }, { additionalProperties: false }), Type.Object({ "role": Type.Literal("tool_result"), "toolUseId": Type.String({ maxLength: 128 }), "content": Type.Array(Type.Ref("ContentBlock")), "isError": Type.Boolean() }, { additionalProperties: false })]),
  "RequestBody": Type.Object({ "kind": Type.Union([Type.Literal("inference"), Type.Literal("summary")]), "sessionKey": Type.String({ maxLength: 512 }), "slot": Type.Ref("SlotName"), "route": Type.String({ maxLength: 128 }), "model": Type.String({ maxLength: 256 }), "contractId": Type.Union([Type.String({ maxLength: 128 }), Type.Null()]), "derivedHash": Type.Ref("Sha256"), "system": Type.String({ maxLength: 1048576 }), "messages": Type.Array(Type.Ref("RequestMessage")), "tools": Type.Array(Type.Ref("ToolSchema")), "sampling": Type.Optional(Type.Object({ "temperature": Type.Optional(Type.Number({ minimum: 0, maximum: 2 })), "maxTokens": Type.Optional(Type.Integer({ minimum: 1 })), "thinking": Type.Optional(Type.Ref("ThinkingLevel")) }, { additionalProperties: false })), "timeoutMs": Type.Optional(Type.Object({ "firstToken": Type.Integer({ minimum: 1e3 }), "total": Type.Integer({ minimum: 1e3 }) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "ModelCost": Type.Object({ "input": Type.Number(), "output": Type.Number(), "cacheRead": Type.Number(), "cacheWrite": Type.Number() }, { additionalProperties: false }),
  "ModelInputLimits": Type.Object({ "maxRequestBytes": Type.Optional(Type.Integer({ minimum: 1 })), "images": Type.Optional(Type.Object({ "maxPerMessage": Type.Optional(Type.Integer({ minimum: 1 })), "maxPerRequest": Type.Optional(Type.Integer({ minimum: 1 })), "resize": Type.Optional(Type.Object({ "maxWidth": Type.Optional(Type.Integer({ minimum: 1 })), "maxHeight": Type.Optional(Type.Integer({ minimum: 1 })), "maxBytes": Type.Optional(Type.Integer({ minimum: 1 })), "jpegQuality": Type.Optional(Type.Number({ minimum: 1, maximum: 100 })) }, { additionalProperties: false })) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "ModelRecord": Type.Object({ "id": Type.String({ maxLength: 256 }), "name": Type.String({ maxLength: 256 }), "api": Type.String({ maxLength: 64 }), "route": Type.String({ maxLength: 128 }), "baseUrl": Type.String({ maxLength: 2048 }), "reasoning": Type.Boolean(), "thinkingLevelMap": Type.Optional(Type.Record(Type.String(), Type.String())), "input": Type.Array(Type.Union([Type.Literal("text"), Type.Literal("image")])), "inputLimits": Type.Optional(Type.Ref("ModelInputLimits")), "cost": Type.Ref("ModelCost"), "contextWindow": Type.Integer({ minimum: 1 }), "defaultSettings": Type.Optional(Type.Ref("ModelSettings")), "maxTokens": Type.Integer({ minimum: 1 }), "samplingParams": Type.Optional(JsonValue13), "headers": Type.Optional(Type.Record(Type.String(), Type.String())), "compat": Type.Optional(JsonValue13), "toolCallFormats": Type.Array(Type.Union([Type.Literal("native"), Type.Ref("DecodeRule")])), "thinkingReplay": Type.Union([Type.Literal("native"), Type.Literal("drop"), Type.Literal("text")]), "contract_id": Type.Union([Type.String({ maxLength: 128 }), Type.Null()]), "slot": Type.Optional(Type.Ref("SlotName")) }, { additionalProperties: false }),
  "ContractStamp": Type.Object({ "prompt_prefix_hash": Type.Union([Type.Ref("Sha256"), Type.Null()]), "tool_schema_hash": Type.Ref("Sha256"), "parser_version": Type.String({ maxLength: 32 }), "contract_id": Type.Union([Type.String({ maxLength: 128 }), Type.Null()]), "model": Type.Object({ "route": Type.String({ maxLength: 128 }), "id": Type.String({ maxLength: 256 }), "responseModel": Type.Optional(Type.String({ maxLength: 256 })) }, { additionalProperties: false }), "derived_hash": Type.Ref("Sha256"), "sent_hash": Type.Ref("Sha256"), "transforms": Type.Array(Type.Object({ "event": Type.String({ maxLength: 64 }), "ext": Type.String({ maxLength: 128 }) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "TokenCounts": Type.Object({ "input": Type.Integer({ minimum: 0 }), "output": Type.Integer({ minimum: 0 }), "cacheRead": Type.Integer({ minimum: 0 }), "cacheWrite": Type.Integer({ minimum: 0 }), "reasoning": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false }),
  "Billing": Type.Object({ "usdMicros": Type.Integer({ minimum: 0 }), "source": Type.Union([Type.Literal("gateway"), Type.Literal("estimated")]), "subscription": Type.Boolean() }, { additionalProperties: false }),
  "ResponseMeta": Type.Object({ "status": Type.Optional(Type.Integer()), "id": Type.Optional(Type.String({ maxLength: 128 })), "model": Type.Optional(Type.String({ maxLength: 256 })), "headers": Type.Optional(Type.Record(Type.String({ pattern: "^[a-z0-9-]{1,64}$" }), Type.String({ maxLength: 256 }), { additionalProperties: false, maxProperties: 16 })), "headerNames": Type.Optional(Type.Array(Type.String({ maxLength: 128 }), { maxItems: 64 })) }, { additionalProperties: false }),
  "Timing": Type.Object({ "ttftMs": Type.Optional(Type.Integer({ minimum: 0 })), "durationMs": Type.Optional(Type.Integer({ minimum: 0 })) }, { additionalProperties: false }),
  "CountResult": Type.Union([Type.Object({ "tokens": Type.Integer({ minimum: 0 }), "source": Type.Union([Type.Literal("provider"), Type.Literal("local-tokenizer")]), "boundHash": Type.Ref("Sha256"), "modelSnapshot": Type.Optional(Type.String({ maxLength: 256 })) }, { additionalProperties: false }), Type.Object({ "source": Type.Literal("unsupported") }, { additionalProperties: false })]),
  "InferenceEvent": Type.Union([Type.Object({ "type": Type.Literal("sent"), "stamp": Type.Ref("ContractStamp") }, { additionalProperties: false }), Type.Object({ "type": Type.Union([Type.Literal("text_delta"), Type.Literal("thinking_delta"), Type.Literal("toolcall_delta")]), "delta": Type.String() }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("toolcall_end"), "call": Type.Ref("ToolCall"), "via": Type.Union([Type.Literal("native"), Type.Ref("DecodeRule")]) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("deviation"), "rule": Type.Literal("unparsed"), "sampleHash": Type.Ref("Sha256") }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("usage"), "tokens": Type.Ref("TokenCounts"), "credits": Type.Optional(Type.Number({ minimum: 0 })), "creditSource": Type.Union([Type.Literal("gateway"), Type.Literal("estimated")]), "billing": Type.Optional(Type.Ref("Billing")), "timing": Type.Optional(Type.Ref("Timing")), "response": Type.Optional(Type.Ref("ResponseMeta")) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("done"), "reason": Type.Union([Type.Literal("stop"), Type.Literal("length"), Type.Literal("toolUse")]) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("error"), "reason": Type.Union([Type.Literal("aborted"), Type.Literal("error")]), "code": Type.Ref("AiErrorCode"), "message": Type.String({ maxLength: 4096 }), "retryable": Type.Boolean(), "retryAfterMs": Type.Optional(Type.Integer({ minimum: 0 })), "requestId": Type.Optional(Type.String({ maxLength: 128 })), "response": Type.Optional(Type.Ref("ResponseMeta")) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("media"), "kind": Type.Literal("image"), "data": Type.String(), "mimeType": Type.String({ maxLength: 128 }) }, { additionalProperties: false }), Type.Object({ "type": Type.Literal("media"), "kind": Type.Literal("video_job"), "jobId": Type.String({ maxLength: 128 }), "status": Type.Union([Type.Literal("submitted"), Type.Literal("running"), Type.Literal("succeeded"), Type.Literal("failed"), Type.Literal("cancelled"), Type.Literal("expired")]), "url": Type.Optional(Type.String({ maxLength: 4096 })) }, { additionalProperties: false })]),
  "RouteDecl": Type.Object({ "route": Type.String({ pattern: "^[a-z0-9][a-z0-9-]{0,63}$" }), "api": Type.String({ maxLength: 64 }), "baseUrl": Type.String({ maxLength: 2048 }), "credentialRef": Type.Optional(Type.String({ pattern: "^secret://[A-Za-z0-9_./-]+$" })), "compat": Type.Optional(JsonValue13), "displayName": Type.Optional(Type.String({ maxLength: 128 })), "models": Type.Optional(Type.Array(Type.Ref("ModelRecord"))) }, { additionalProperties: false }),
  "RouteTarget": Type.Object({ "route": Type.String({ maxLength: 128 }), "model": Type.String({ maxLength: 256 }), "fallbacks": Type.Optional(Type.Array(Type.Object({ "route": Type.String({ maxLength: 128 }), "model": Type.String({ maxLength: 256 }) }, { additionalProperties: false }))) }, { additionalProperties: false }),
  "RouteTable": Type.Object({ "primary": Type.Ref("RouteTarget"), "escalation": Type.Optional(Type.Ref("RouteTarget")), "fast": Type.Optional(Type.Ref("RouteTarget")), "compaction": Type.Optional(Type.Ref("RouteTarget")), "verifier": Type.Optional(Type.Ref("RouteTarget")), "image": Type.Optional(Type.Ref("RouteTarget")), "video": Type.Optional(Type.Ref("RouteTarget")) }, { additionalProperties: false }),
  "ProbeReport": Type.Object({ "route": Type.String({ maxLength: 128 }), "ok": Type.Boolean(), "latencyMs": Type.Integer({ minimum: 0 }), "checks": Type.Array(Type.Object({ "name": Type.String({ maxLength: 64 }), "ok": Type.Boolean(), "detail": Type.Optional(Type.String({ maxLength: 1024 })) }, { additionalProperties: false })) }, { additionalProperties: false }),
  "ContractManifest": Type.Object({ "version": Type.String({ maxLength: 32 }), "model_family": Type.String({ maxLength: 128 }), "parser_version": Type.String({ maxLength: 32 }), "released_at": Type.String({ format: "date-time" }), "sha256": Type.Object({ "prefix": Type.Ref("Sha256"), "tools": Type.Ref("Sha256"), "syntax": Type.Ref("Sha256") }, { additionalProperties: false }) }, { additionalProperties: false }),
  "ResolvedToolCallPolicy": Type.Object({ "isReadOnly": Type.Boolean(), "isDestructive": Type.Boolean(), "isConcurrencySafe": Type.Optional(Type.Boolean()), "isOpenWorld": Type.Optional(Type.Boolean()), "returnsImages": Type.Optional(Type.Literal(true)), "replay": Type.Union([Type.Literal("safe"), Type.Literal("never"), Type.Literal("idempotent")]), "requiresApproval": Type.Union([Type.Literal("never"), Type.Literal("destructive"), Type.Literal("always")]), "approvalScopes": Type.Array(Type.String({ pattern: "^[A-Za-z][A-Za-z0-9_.:-]{0,63}$" }), { maxItems: 16, uniqueItems: true }), "policyVersion": Type.String({ pattern: "^[A-Za-z][A-Za-z0-9_.:-]{0,63}$" }) }, { additionalProperties: false }),
  "ExecutionDomain": Type.Union([Type.Literal("workspace"), Type.Literal("host-computer-use")])
});
var ContentBlock6 = ModelV1.Import("ContentBlock");
var ToolCall3 = ModelV1.Import("ToolCall");
var SlotName3 = ModelV1.Import("SlotName");
var ThinkingLevel5 = ModelV1.Import("ThinkingLevel");
var ModelSettings4 = ModelV1.Import("ModelSettings");
var AiErrorCode = ModelV1.Import("AiErrorCode");
var DecodeRule2 = ModelV1.Import("DecodeRule");
var Sha256 = ModelV1.Import("Sha256");
var ToolSchema = ModelV1.Import("ToolSchema");
var RequestMessage = ModelV1.Import("RequestMessage");
var RequestBody = ModelV1.Import("RequestBody");
var ModelCost2 = ModelV1.Import("ModelCost");
var ModelInputLimits3 = ModelV1.Import("ModelInputLimits");
var ModelRecord2 = ModelV1.Import("ModelRecord");
var ContractStamp = ModelV1.Import("ContractStamp");
var TokenCounts2 = ModelV1.Import("TokenCounts");
var Billing3 = ModelV1.Import("Billing");
var ResponseMeta2 = ModelV1.Import("ResponseMeta");
var Timing = ModelV1.Import("Timing");
var CountResult = ModelV1.Import("CountResult");
var InferenceEvent = ModelV1.Import("InferenceEvent");
var RouteDecl2 = ModelV1.Import("RouteDecl");
var RouteTarget2 = ModelV1.Import("RouteTarget");
var RouteTable2 = ModelV1.Import("RouteTable");
var ProbeReport = ModelV1.Import("ProbeReport");
var ContractManifest = ModelV1.Import("ContractManifest");
var ResolvedToolCallPolicy3 = ModelV1.Import("ResolvedToolCallPolicy");
var ExecutionDomain3 = ModelV1.Import("ExecutionDomain");

// ../protocol/src/model.ts
var minimumContextBudget = (capacity = Number.POSITIVE_INFINITY) => Math.min(2048, capacity);

// ../protocol/gen/ts/projection.ts
var JsonValue14 = Type.Recursive((This) => Type.Union([Type.Null(), Type.Boolean(), Type.Number(), Type.String(), Type.Array(This), Type.Record(Type.String(), This)]));
var ProjectionSchema = Type.Module({
  "ProjectionCapability": Type.Object({ "name": Type.String({ maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "inputEventTypes": Type.Array(Type.String({ minLength: 1, maxLength: 128, pattern: "^[a-z][a-z0-9]*(?:[./-][a-z0-9]+)*$" }), { minItems: 1, uniqueItems: true }), "maxStateBytes": Type.Integer({ minimum: 1, maximum: 262144 }) }, { additionalProperties: false }),
  "ProjectionReadResult": Type.Union([Type.Object({ "status": Type.Literal("available"), "name": Type.String({ maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "asOfSeq": Type.Integer({ minimum: 0 }), "stateVersion": Type.Integer({ minimum: 1 }), "value": JsonValue14 }, { additionalProperties: false }), Type.Object({ "status": Type.Literal("unavailable"), "name": Type.String({ maxLength: 128, pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$" }), "error": Type.Object({ "code": Type.Literal("E_PROJECTION_STATE"), "safeMessage": Type.String({ maxLength: 256 }) }, { additionalProperties: false }) }, { additionalProperties: false })])
});
var ProjectionCapability5 = ProjectionSchema.Import("ProjectionCapability");
var ProjectionReadResult = ProjectionSchema.Import("ProjectionReadResult");

// ../protocol/gen/ts/worker.ts
var WorkerSchema = Type.Module({
  "WorkerGeneration": Type.Integer({ minimum: 1, maximum: 9007199254740991 }),
  "RuntimeTargetIdentity": Type.Object({ "treeHash": Type.String({ pattern: "^[0-9a-f]{64}$" }), "resourceRevision": Type.String({ pattern: "^[0-9a-f]{64}$" }), "compositeRevision": Type.String({ pattern: "^[0-9a-f]{64}$" }) }, { additionalProperties: false }),
  "RuntimeTargetArtifact": Type.Object({ "encoding": Type.Literal("base64"), "canonicalBase64": Type.String({ minLength: 4, maxLength: 16776788, pattern: "^[A-Za-z0-9+/]+={0,2}$" }), "digest": Type.String({ pattern: "^sha256-[0-9a-f]{64}$" }), "identity": Type.Ref("RuntimeTargetIdentity") }, { additionalProperties: false }),
  "RuntimeStaleFrame": Type.Object({ "type": Type.Literal("runtime.stale"), "artifact": Type.Ref("RuntimeTargetArtifact") }, { additionalProperties: false }),
  "RuntimeConvergenceRow": Type.Object({ "id": Type.String({ minLength: 1 }), "state": Type.Union([Type.Literal("pending"), Type.Literal("loading"), Type.Literal("active"), Type.Literal("failed"), Type.Literal("disabled"), Type.Literal("waiting-drain")]), "reason": Type.Optional(Type.String({ minLength: 1 })) }, { additionalProperties: false }),
  "RuntimeConvergenceReport": Type.Object({ "hash": Type.String({ pattern: "^[0-9a-f]{64}$" }), "ok": Type.Boolean(), "rows": Type.Array(Type.Ref("RuntimeConvergenceRow")) }, { additionalProperties: false }),
  "RuntimeBootReadyFrame": Type.Object({ "type": Type.Literal("runtime.boot_ready"), "workerKind": Type.Literal("session"), "workerKey": Type.Literal("@shared"), "generation": Type.Ref("WorkerGeneration"), "digest": Type.String({ pattern: "^sha256-[0-9a-f]{64}$" }), "identity": Type.Ref("RuntimeTargetIdentity"), "source": Type.Union([Type.Literal("lastGood"), Type.Literal("bootstrap")]) }, { additionalProperties: false }),
  "RuntimeConvergedFrame": Type.Object({ "type": Type.Literal("runtime.converged"), "workerKind": Type.Literal("session"), "workerKey": Type.Literal("@shared"), "generation": Type.Ref("WorkerGeneration"), "digest": Type.String({ pattern: "^sha256-[0-9a-f]{64}$" }), "identity": Type.Ref("RuntimeTargetIdentity"), "report": Type.Ref("RuntimeConvergenceReport") }, { additionalProperties: false }),
  "RuntimeApplyFailedFrame": Type.Object({ "type": Type.Literal("runtime.apply_failed"), "workerKind": Type.Literal("session"), "workerKey": Type.Literal("@shared"), "generation": Type.Ref("WorkerGeneration"), "digest": Type.String({ pattern: "^sha256-[0-9a-f]{64}$" }), "identity": Type.Ref("RuntimeTargetIdentity"), "phase": Type.String({ minLength: 1 }), "message": Type.String({ minLength: 1 }) }, { additionalProperties: false })
});
var WorkerGeneration = WorkerSchema.Import("WorkerGeneration");
var RuntimeTargetIdentity = WorkerSchema.Import("RuntimeTargetIdentity");
var RuntimeTargetArtifact = WorkerSchema.Import("RuntimeTargetArtifact");
var RuntimeStaleFrame = WorkerSchema.Import("RuntimeStaleFrame");
var RuntimeConvergenceRow = WorkerSchema.Import("RuntimeConvergenceRow");
var RuntimeConvergenceReport = WorkerSchema.Import("RuntimeConvergenceReport");
var RuntimeBootReadyFrame = WorkerSchema.Import("RuntimeBootReadyFrame");
var RuntimeConvergedFrame = WorkerSchema.Import("RuntimeConvergedFrame");
var RuntimeApplyFailedFrame = WorkerSchema.Import("RuntimeApplyFailedFrame");

// ../protocol/gen/ts/slots.ts
var SlotsSchema = Type.Module({
  "UiSlotName": Type.Union([Type.Literal("tool.card.inline"), Type.Literal("sidebar.action"), Type.Literal("status.line"), Type.Literal("notification")]),
  "ToolCardInlinePayload": Type.Object({ "title": Type.String({ maxLength: 256 }), "table": Type.Optional(Type.Object({ "columns": Type.Array(Type.String({ maxLength: 128 }), { maxItems: 32 }), "rows": Type.Array(Type.Array(Type.String({ maxLength: 1024 })), { maxItems: 500 }) }, { additionalProperties: false })), "chart": Type.Optional(Type.Object({ "kind": Type.Union([Type.Literal("bar"), Type.Literal("line")]), "series": Type.Array(Type.Object({ "name": Type.String({ maxLength: 64 }), "points": Type.Array(Type.Object({ "x": Type.String({ maxLength: 64 }), "y": Type.Number() }, { additionalProperties: false }), { maxItems: 1e3 }) }, { additionalProperties: false }), { maxItems: 8 }) }, { additionalProperties: false })), "actions": Type.Optional(Type.Array(Type.Object({ "id": Type.String({ pattern: "^[a-z0-9_-]{1,64}$" }), "label": Type.String({ maxLength: 64 }) }, { additionalProperties: false }), { maxItems: 8 })) }, { additionalProperties: false }),
  "SidebarActionPayload": Type.Object({ "id": Type.String({ pattern: "^[a-z0-9_-]{1,64}$" }), "label": Type.String({ maxLength: 64 }), "icon": Type.Optional(Type.String({ maxLength: 32 })), "disabled": Type.Optional(Type.Boolean()) }, { additionalProperties: false }),
  "StatusLinePayload": Type.Object({ "text": Type.String({ maxLength: 512 }), "level": Type.Union([Type.Literal("info"), Type.Literal("warn"), Type.Literal("error")]) }, { additionalProperties: false }),
  "NotificationPayload": Type.Object({ "title": Type.String({ maxLength: 256 }), "body": Type.String({ maxLength: 4096 }), "link": Type.Optional(Type.String({ maxLength: 2048 })) }, { additionalProperties: false })
});
var UiSlotName5 = SlotsSchema.Import("UiSlotName");
var ToolCardInlinePayload = SlotsSchema.Import("ToolCardInlinePayload");
var SidebarActionPayload = SlotsSchema.Import("SidebarActionPayload");
var StatusLinePayload = SlotsSchema.Import("StatusLinePayload");
var NotificationPayload = SlotsSchema.Import("NotificationPayload");

// ../web-ui/src/locales/admin.ts
var ADMIN_LOCALE_NAMESPACE = "@agnes/web-ui/admin";
var adminLocaleCatalog = {
  en: {
    "state.title": "{label}: {value}",
    "list.separator": ", ",
    "source.npm": "npm",
    "source.file": "Local file",
    "source.workspace": "Workspace",
    "source.git": "Git",
    "contribution.client": "Browser UI",
    "contribution.extension": "Extension",
    "contribution.seam": "Service seam",
    "contribution.provider": "Provider",
    "contribution.runtime": "Runtime",
    "contribution.skill": "Skill",
    "contribution.preset": "Preset",
    "contribution.surface": "Surface",
    "contribution.none": "No contributions reported",
    "contribution.more": "and {count} more",
    "desired.enabled": "Desired enabled",
    "desired.disabled": "Desired disabled",
    "actual.not-running": "Not running",
    "actual.starting": "Starting",
    "actual.running": "Running",
    "actual.failed": "Failed",
    "actual.restart-required": "Restart required",
    "actual.unavailable": "Unavailable",
    "actual.cleanup-pending": "Old resources pending cleanup",
    "actual.unknown-version": "The actual version or digest was not confirmed by the host",
    "state.separator": "{desired} · {actual}{cleanup}",
    "runtime.unconfirmed": "Not confirmed",
    "runtime.idle": "Not loaded",
    "runtime.loading": "Loading",
    "runtime.active": "Loaded",
    "runtime.stopping": "Stopping",
    "runtime.failed": "Failed to load; retry available",
    "runtime.waiting": "Browser UI state will be confirmed when the workbench opens.",
    "runtime.retry": "The Agnes UI remains available; you can retry.",
    "operation.inspect": "Preview",
    "operation.install": "Install",
    "operation.trust": "Pre-install check",
    "operation.untrust": "Update security state",
    "operation.enable": "Enable",
    "operation.disable": "Disable",
    "operation.update": "Update",
    "operation.rollback": "Roll back",
    "operation.remove": "Uninstall",
    "operation-state.received": "Request recorded",
    "operation-state.inspecting": "Checking content",
    "operation-state.installing": "Installing",
    "operation-state.staging": "Preparing switch",
    "operation-state.quiescing": "Waiting for a safe boundary",
    "operation-state.switching": "Switching",
    "operation-state.draining": "Draining the previous version",
    "operation-state.completed": "Completed",
    "operation-state.failed": "Not completed",
    "operation-state.cancelled": "Cancelled",
    "operation-state.rolled-back": "Rolled back",
    "operation.label": "{operation}: {state}",
    "blocker.dependency": "Dependency conflict",
    "blocker.profile": "Profile configuration",
    "blocker.generation": "Runtime generation",
    "blocker.deployment": "Deployment reference",
    "blocker.policy": "Security policy",
    "blocker.incompatible": "Compatibility",
    "blocker.unknown-contribution": "Unknown contribution",
    "blocker.message": "{name} blocks this operation{references}",
    "blocker.references": ": {references}",
    "capability.added": "Added {item}",
    "capability.removed": "Removed {item}",
    "capability.runtime-removed": "No longer supports {item}",
    "capability.dependency-added": "Added dependency {item}",
    "capability.service-added": "Added service grant {extension} · {name} · {range}",
    "capability.none": "The host reported no capability differences from the current baseline; this does not mean the package has no capabilities."
  },
  "zh-CN": {
    "state.title": "{label}：{value}",
    "list.separator": "，",
    "source.npm": "npm",
    "source.file": "本地文件",
    "source.workspace": "工作区",
    "source.git": "Git",
    "contribution.client": "浏览器 UI",
    "contribution.extension": "扩展",
    "contribution.seam": "服务接缝",
    "contribution.provider": "Provider",
    "contribution.runtime": "运行时",
    "contribution.skill": "技能",
    "contribution.preset": "预设",
    "contribution.surface": "表面",
    "contribution.none": "未报告贡献",
    "contribution.more": "另有 {count} 项",
    "desired.enabled": "期望启用",
    "desired.disabled": "期望停用",
    "actual.not-running": "未运行",
    "actual.starting": "正在启动",
    "actual.running": "运行中",
    "actual.failed": "运行失败",
    "actual.restart-required": "需要重启",
    "actual.unavailable": "不可用",
    "actual.cleanup-pending": "旧资源待清理",
    "actual.unknown-version": "后台未确认实际版本或摘要",
    "state.separator": "{desired} · {actual}{cleanup}",
    "runtime.unconfirmed": "未确认",
    "runtime.idle": "未加载",
    "runtime.loading": "正在加载",
    "runtime.active": "已加载",
    "runtime.stopping": "正在停用",
    "runtime.failed": "加载失败，可重试",
    "runtime.waiting": "浏览器 UI 状态将在工作台打开后确认。",
    "runtime.retry": "Agnes 原界面保持可用，可重试。",
    "operation.inspect": "预览",
    "operation.install": "安装",
    "operation.trust": "启用前校验",
    "operation.untrust": "安全状态更新",
    "operation.enable": "启用",
    "operation.disable": "停用",
    "operation.update": "更新",
    "operation.rollback": "回滚",
    "operation.remove": "卸载",
    "operation-state.received": "请求已记录",
    "operation-state.inspecting": "正在检查内容",
    "operation-state.installing": "正在安装",
    "operation-state.staging": "正在准备切换",
    "operation-state.quiescing": "正在等待安全边界",
    "operation-state.switching": "正在切换",
    "operation-state.draining": "正在排干旧版本",
    "operation-state.completed": "已完成",
    "operation-state.failed": "未完成",
    "operation-state.cancelled": "已取消",
    "operation-state.rolled-back": "已回滚",
    "operation.label": "{operation}：{state}",
    "blocker.dependency": "依赖关系",
    "blocker.profile": "Profile 配置",
    "blocker.generation": "运行代际",
    "blocker.deployment": "部署引用",
    "blocker.policy": "安全策略",
    "blocker.incompatible": "兼容性",
    "blocker.unknown-contribution": "未知贡献",
    "blocker.message": "{name}阻止此操作{references}",
    "blocker.references": "：{references}",
    "capability.added": "新增 {item}",
    "capability.removed": "移除 {item}",
    "capability.runtime-removed": "不再支持 {item}",
    "capability.dependency-added": "新增依赖 {item}",
    "capability.service-added": "新增服务授权 {extension} · {name} · {range}",
    "capability.none": "后台未报告相对于当前基线的能力差异；这不表示这个包不包含能力。"
  }
};

// ../web-ui/src/ui-locale.ts
import {
  createContext,
  createElement,
  useContext,
  useMemo,
  useSyncExternalStore
} from "react";
var UI_LOCALE_STORAGE_KEY = "agnes-locale";
function createDocumentLocaleSource(catalogs) {
  const readLocale = () => document.documentElement.lang === "zh-CN" ? "zh-CN" : "en";
  let locale = readLocale();
  let version = 0;
  const listeners = /* @__PURE__ */ new Set();
  const translate = (key, vars) => {
    for (const catalog of Object.values(catalogs)) {
      const value = catalog[locale][key] ?? (locale === "en" ? void 0 : catalog.en[key]);
      if (value !== void 0) return interpolate(value, vars);
    }
    return key;
  };
  const translateStaticText = () => {
    for (const node of document.querySelectorAll("[data-i18n]")) {
      const key = node.dataset.i18n;
      if (key) {
        const value = translate(key);
        if (value !== key) node.textContent = value;
      }
    }
    for (const [attribute, selector] of [
      ["aria-label", "data-i18n-aria"],
      ["placeholder", "data-i18n-placeholder"],
      ["title", "data-i18n-title"]
    ]) {
      for (const node of document.querySelectorAll(`[${selector}]`)) {
        const key = node.getAttribute(selector);
        if (key) {
          const value = translate(key);
          if (value !== key) node.setAttribute(attribute, value);
        }
      }
    }
  };
  const refresh = () => {
    const next = readLocale();
    if (next === locale) return;
    locale = next;
    version++;
    translateStaticText();
    for (const listener of [...listeners]) listener();
  };
  const onStorage = (event) => {
    if (event.key === UI_LOCALE_STORAGE_KEY) refresh();
  };
  window.addEventListener("agnes:locale-changed", refresh);
  window.addEventListener("storage", onStorage);
  translateStaticText();
  const source = {
    getSnapshot: () => locale,
    getVersion: () => version,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    t: translate,
    bind: (namespace) => {
      const catalog = catalogs[namespace];
      return (key, vars) => {
        const value = catalog?.[locale][key] ?? (locale === "en" ? void 0 : catalog?.en[key]);
        return value === void 0 ? key : interpolate(value, vars);
      };
    }
  };
  return {
    source,
    dispose: () => {
      window.removeEventListener("agnes:locale-changed", refresh);
      window.removeEventListener("storage", onStorage);
      listeners.clear();
    }
  };
}
var LocaleSourceContext = createContext(void 0);
var noSubscribe = () => () => void 0;
var zeroVersion = () => 0;
function UiLocaleProvider({
  source,
  children
}) {
  return createElement(LocaleSourceContext.Provider, { value: source }, children ?? null);
}
function useUiText(namespace, fallback) {
  const source = useContext(LocaleSourceContext);
  const subscribe2 = source?.subscribe ?? noSubscribe;
  const getVersion = source?.getVersion ?? zeroVersion;
  useSyncExternalStore(subscribe2, getVersion, getVersion);
  const locale = source?.getSnapshot() ?? "en";
  const t = useMemo(
    () => createUiTranslator(source, namespace, fallback, locale),
    [fallback, locale, namespace, source]
  );
  return { locale, t };
}
function createUiTranslator(source, namespace, fallback, locale = source?.getSnapshot() ?? "en") {
  const fallbackText = createCatalogTranslator(fallback, locale);
  if (!source) return fallbackText;
  const boundText = source.bind(namespace);
  return (key, vars) => {
    const value = boundText(key, vars);
    return value === key ? fallbackText(key, vars) : value;
  };
}
function createCatalogTranslator(catalog, locale) {
  return (key, vars) => {
    const template = catalog[locale][key] ?? (locale === "en" ? void 0 : catalog.en[key]) ?? key;
    return interpolate(template, vars);
  };
}
function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(
    /\{(\w+)\}/g,
    (match, name) => Object.hasOwn(vars, name) ? String(vars[name]) : match
  );
}

// ../web-ui/src/admin-text.ts
var englishText = createCatalogTranslator(adminLocaleCatalog, "en");
function hasPermission(permissions, permission) {
  return permissions.includes(permission);
}
function sourceLabel(source, t = englishText) {
  const sourceTypeKey = `source.${source.type}`;
  const translatedType = t(sourceTypeKey);
  const type = translatedType === sourceTypeKey ? source.type : translatedType;
  return `${type} · ${source.ref}`;
}
function contributionText(item, t = englishText) {
  if (!item.contributions.length) return t("contribution.none");
  const labels = item.contributions.slice(0, 3).map((contribution) => {
    const kindKey = `contribution.${contribution.kind}`;
    const translatedKind = t(kindKey);
    const kind = translatedKind === kindKey ? contribution.kind : translatedKind;
    return `${kind} · ${contribution.id}`;
  });
  const more = item.contributions.length - labels.length;
  return more ? `${labels.join(t("list.separator"))}${t("list.separator")}${t("contribution.more", { count: more })}` : labels.join(t("list.separator"));
}
function integrityLabel(integrity) {
  return integrity.length > 27 ? `${integrity.slice(0, 14)}…${integrity.slice(-12)}` : integrity;
}
function operationLabel(operation, t = englishText) {
  return t("operation.label", {
    operation: operationName(operation.operation, t),
    state: t(`operation-state.${operation.state}`)
  });
}
function operationName(operation, t = englishText) {
  return t(`operation.${operation}`);
}
function terminal(operation) {
  return ["completed", "failed", "cancelled", "rolled-back"].includes(operation.state);
}
function blockerText(blocker, t = englishText) {
  const name = t(`blocker.${blocker.code}`);
  const references = blocker.references.length ? t("blocker.references", { references: blocker.references.join(t("list.separator")) }) : "";
  return t("blocker.message", { name, references });
}

// ../web-ui/src/locales/admin-confirmation.ts
var ADMIN_CONFIRMATION_LOCALE_NAMESPACE = "@agnes/web-ui/admin-confirmation";
var adminConfirmationLocaleCatalog = {
  en: {
    "list.separator": ", ",
    "boolean.allowed": "Allowed",
    "boolean.denied": "Not allowed",
    "value.none": "None",
    "value.not-reported": "Not reported by the host",
    "value.not-reported-cannot-trust": "Not reported; this preview cannot be used as a trust decision.",
    "value.not-reported-cannot-activate": "Not reported; combined activation is unavailable.",
    "value.unverified": "Not verified",
    "value.verified": "Verified",
    "value.no-prefix": "(no prefix)",
    "capability.tools": "Tools",
    "capability.prefix": "prefix",
    "capability.names": "names: {names}",
    "capability.names-unknown": "specific names not reported",
    "capability.invoke": "Invoke other tools",
    "capability.hooks": "Hooks",
    "capability.slots": "UI slots",
    "capability.events": "Events",
    "capability.resources": "Resources",
    "capability.network-denied": "Network: no host access granted",
    "capability.network-hosts": "Network hosts: {hosts}",
    "capability.artifacts": "Artifacts",
    "capability.public-read": "Public web read",
    "capability.public-read-allowed": "Allowed (anonymous, rate-limited)",
    "capability.subagent": "Subagents",
    "capability.service": "Service: {name} ({kind}, timeout {timeoutMs} ms)",
    "capability.projection": "Projection: {name} (inputs {inputs}, state limit {maxStateBytes} B)",
    "contribution.description": "Description: {value}",
    "contribution.backend-row": "Backend row: {value}",
    "contribution.browser-entry": "Browser entry: {value}",
    "contribution.services": "Query services: {services}",
    "contribution.entry": "Entry: {value}",
    "contribution.api-range": "API range: {value}",
    "contribution.run-mode": "Runtime support: {modes}",
    "contribution.no-declared-capabilities": "This extension does not report capabilities in its capability field; this does not prove that the package has no capabilities.",
    "contribution.client-slots": "Browser UI slots: {slots}",
    "contribution.unsupported-slots": "The Web host does not support {slots}; installing will not publish browser UI.",
    "contribution.provides": "Provides: {value}",
    "contribution.surface": "Surface: {value}",
    "contribution.artifact": "Artifact: {kind} · {value}",
    "contribution.health-check": "Health check: {value}",
    "contribution.required-service": "Required service: {value}",
    "contribution.no-required-services": "No required service grants reported.",
    "empty.contributions": "No contributions reported by the host; still verify the integrity digest for this installation.",
    "empty.blockers": "No blockers reported by the host.",
    "empty.capability-diff": "The host reported no capability differences from the current baseline; this does not mean the package has no capabilities.",
    "empty.dependencies": "No dependencies reported by the host.",
    "empty.warnings": "No warnings reported by the host.",
    "diff.added": "Added capability: {item}",
    "diff.removed": "Removed capability: {item}",
    "diff.runtime-removed": "No longer supports runtime: {item}",
    "diff.dependency-added": "Added dependency: {item}",
    "diff.service-added": "Added service grant: {value}",
    "lead.preview": "Review the integrity, capability summary, and installation facts reported by the host.",
    "fact.version": "Version",
    "fact.source": "Source",
    "fact.integrity": "Integrity digest",
    "fact.capability-hash": "Capability summary hash",
    "fact.license": "License",
    "fact.provenance-signature": "Provenance signature",
    "fact.provenance-source": "Provenance source",
    "fact.provenance-integrity": "Provenance integrity",
    "fact.release-time": "Release time",
    "fact.signature-verification": "Signature verification",
    "section.provenance": "Source and provenance",
    "section.reported-contributions": "Contributions and reported capabilities",
    "section.capability-diff": "Capability differences and service grants",
    "section.dependencies-license": "Dependencies and license",
    "section.warnings-blockers": "Warnings and blockers",
    "section.trust-contributions": "Reported contributions and capability fields",
    "section.current-blockers": "Current blockers",
    "section.revoked-contributions": "Contributions and capability fields to be revoked",
    "section.current-baseline": "Current installation and runtime baseline",
    "section.rollback-blockers": "Current blockers",
    "lead.trust": "A trust decision will be bound to the integrity digest and capability summary hash below. Trusting a package does not enable it.",
    "lead.trust-enable": "Before enabling, the decision will be bound to the integrity digest and capability summary hash below, and the current version and capability scope will be checked.",
    "lead.untrust": "Revoking trust will bind to the integrity digest and capability summary hash below, immediately disable this package, and remove it from recovery and rollback candidates. Preview and trust it again before using it.",
    "lead.rollback": "Rollback confirmation is bound to the host-verified target, current installation digest, and current runtime digest.",
    "fact.current-install-version": "Current installed version",
    "fact.current-install-integrity": "Current installation digest",
    "fact.current-runtime-version": "Current runtime version",
    "fact.current-runtime-integrity": "Current runtime digest",
    "fact.target-trust-integrity": "Target trust digest",
    "fact.target-capability-hash": "Target capability summary hash",
    "fact.rollback-target-version": "Rollback target version",
    "fact.rollback-target-integrity": "Rollback target digest",
    "fact.not-confirmed": "Not confirmed by the host",
    "fact.not-running": "Not running",
    "fact.rollback-target-missing": "No verified target provided by the host",
    "warning.label": "{code}: {message}",
    "facts.value-separator": "{label}: {value}",
    "facts.no-composite-activation": "Not reported; combined activation is unavailable."
  },
  "zh-CN": {
    "list.separator": "、",
    "boolean.allowed": "允许",
    "boolean.denied": "不允许",
    "value.none": "（无）",
    "value.not-reported": "后台未报告",
    "value.not-reported-cannot-trust": "后台未报告；此预览不能据此作为信任决定的依据。",
    "value.not-reported-cannot-activate": "后台未报告，不能组合激活。",
    "value.unverified": "未验证",
    "value.verified": "已验证",
    "value.no-prefix": "（无前缀）",
    "capability.tools": "工具",
    "capability.prefix": "前缀",
    "capability.names": "名称 {names}",
    "capability.names-unknown": "未报告具体名称",
    "capability.invoke": "调用其他工具",
    "capability.hooks": "钩子",
    "capability.slots": "界面插槽",
    "capability.events": "事件",
    "capability.resources": "资源",
    "capability.network-denied": "网络：未授予主机访问权限",
    "capability.network-hosts": "网络主机：{hosts}",
    "capability.artifacts": "工件",
    "capability.public-read": "公开网页读取",
    "capability.public-read-allowed": "允许（匿名、限额）",
    "capability.subagent": "子代理",
    "capability.service": "服务：{name}（{kind}，超时 {timeoutMs} ms）",
    "capability.projection": "投影：{name}（输入 {inputs}，状态上限 {maxStateBytes} B）",
    "contribution.description": "描述：{value}",
    "contribution.backend-row": "后端行：{value}",
    "contribution.browser-entry": "浏览器入口：{value}",
    "contribution.services": "查询服务：{services}",
    "contribution.entry": "入口：{value}",
    "contribution.api-range": "API 范围：{value}",
    "contribution.run-mode": "运行方式：{modes}",
    "contribution.no-declared-capabilities": "此扩展未在 capability 字段中报告能力；不能由此推断整个包没有能力。",
    "contribution.client-slots": "浏览器 UI 槽位：{slots}",
    "contribution.unsupported-slots": "Web 宿主暂不支持 {slots}；安装后不会发布浏览器 UI。",
    "contribution.provides": "提供：{value}",
    "contribution.surface": "表面：{value}",
    "contribution.artifact": "工件：{kind} · {value}",
    "contribution.health-check": "健康检查：{value}",
    "contribution.required-service": "所需服务：{value}",
    "contribution.no-required-services": "未报告所需服务授权。",
    "empty.contributions": "后台未报告贡献；请仍核对本次安装的完整性摘要。",
    "empty.blockers": "后台未报告阻断项。",
    "empty.capability-diff": "后台未报告相对于当前基线的能力差异；这不表示这个包不包含能力。",
    "empty.dependencies": "后台未报告依赖项。",
    "empty.warnings": "后台未报告警告。",
    "diff.added": "新增能力：{item}",
    "diff.removed": "移除能力：{item}",
    "diff.runtime-removed": "不再支持运行方式：{item}",
    "diff.dependency-added": "新增依赖：{item}",
    "diff.service-added": "新增服务授权：{value}",
    "lead.preview": "请核对完整性、能力摘要及以下后台已报告的安装事实。",
    "fact.version": "版本",
    "fact.source": "来源",
    "fact.integrity": "完整性摘要",
    "fact.capability-hash": "能力摘要哈希",
    "fact.license": "许可证",
    "fact.provenance-signature": "溯源签名",
    "fact.provenance-source": "溯源来源",
    "fact.provenance-integrity": "溯源完整性",
    "fact.release-time": "发布时间",
    "fact.signature-verification": "签名验证",
    "section.provenance": "来源与溯源",
    "section.reported-contributions": "贡献与已报告能力",
    "section.capability-diff": "能力差异与服务授权",
    "section.dependencies-license": "依赖与许可证",
    "section.warnings-blockers": "警告与阻断项",
    "section.trust-contributions": "已报告的贡献与能力字段",
    "section.current-blockers": "当前阻断项",
    "section.revoked-contributions": "将被撤销的贡献与能力字段",
    "section.current-baseline": "当前安装与运行基线",
    "section.rollback-blockers": "当前阻断项",
    "lead.trust": "信任决定会绑定下列完整性摘要与能力摘要哈希；信任本身不会启用插件。",
    "lead.trust-enable": "启用前会绑定下列完整性摘要与能力摘要哈希，并校验当前版本及能力范围。",
    "lead.untrust": "撤销信任会绑定下列完整性摘要与能力摘要哈希，立刻停用此包，并从恢复与回滚候选中移除。再次使用必须重新预览并信任。",
    "lead.rollback": "回滚确认会绑定后台已核验的目标、当前安装摘要和当前运行摘要。",
    "fact.current-install-version": "当前安装版本",
    "fact.current-install-integrity": "当前安装摘要",
    "fact.current-runtime-version": "当前运行版本",
    "fact.current-runtime-integrity": "当前运行摘要",
    "fact.target-trust-integrity": "目标信任摘要",
    "fact.target-capability-hash": "目标能力摘要哈希",
    "fact.rollback-target-version": "回滚目标版本",
    "fact.rollback-target-integrity": "回滚目标摘要",
    "fact.not-confirmed": "后台未确认",
    "fact.not-running": "未运行",
    "fact.rollback-target-missing": "后台未提供已核验目标",
    "warning.label": "{code}：{message}",
    "facts.value-separator": "{label}：{value}",
    "facts.no-composite-activation": "后台未报告组合激活能力。"
  }
};

// ../web-ui/src/admin-confirmation.tsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function FactsList({ items }) {
  return /* @__PURE__ */ jsx("dl", { className: "confirm-facts-list", children: items.map(([label, value]) => /* @__PURE__ */ jsx(Fragmented, { label, value }, `${label}:${value}`)) });
}
function Fragmented({ label, value }) {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("dt", { children: label }),
    /* @__PURE__ */ jsx("dd", { children: value })
  ] });
}
function ReviewSection({ title, children }) {
  return /* @__PURE__ */ jsxs("details", { className: "confirm-review-section", children: [
    /* @__PURE__ */ jsx("summary", { children: title }),
    /* @__PURE__ */ jsx("div", { className: "confirm-review-content", children })
  ] });
}
function TextList({ items, empty }) {
  if (!items.length) return /* @__PURE__ */ jsx("p", { className: "confirm-empty-fact", children: empty });
  return /* @__PURE__ */ jsx("ul", { children: items.map((item) => /* @__PURE__ */ jsx("li", { children: item }, item)) });
}
function serviceGrant(grant) {
  return `${grant.extension} · ${grant.name} · ${grant.range}`;
}
function capabilityLines(capabilities, t) {
  const lines = [];
  if (capabilities.tools) {
    const names = capabilities.tools.names?.length ? t("capability.names", { names: capabilities.tools.names.join(t("list.separator")) }) : t("capability.names-unknown");
    lines.push(
      `${t("capability.tools")}: ${t("capability.prefix")} ${capabilities.tools.prefix || t("value.no-prefix")} · ${names}`
    );
  }
  if (capabilities["tools.invoke"] !== void 0)
    lines.push(
      `${t("capability.invoke")}: ${t(capabilities["tools.invoke"] ? "boolean.allowed" : "boolean.denied")}`
    );
  if (capabilities.hooks?.length)
    lines.push(`${t("capability.hooks")}: ${capabilities.hooks.join(t("list.separator"))}`);
  if (capabilities.slots?.length)
    lines.push(`${t("capability.slots")}: ${capabilities.slots.join(t("list.separator"))}`);
  if (capabilities.events !== void 0)
    lines.push(`${t("capability.events")}: ${t(capabilities.events ? "boolean.allowed" : "boolean.denied")}`);
  if (capabilities.resources?.length)
    lines.push(`${t("capability.resources")}: ${capabilities.resources.join(t("list.separator"))}`);
  if (capabilities.network !== void 0) {
    lines.push(
      Array.isArray(capabilities.network) ? t("capability.network-denied") : t("capability.network-hosts", { hosts: capabilities.network.hosts.join(t("list.separator")) })
    );
  }
  if (capabilities.artifacts !== void 0)
    lines.push(
      `${t("capability.artifacts")}: ${t(capabilities.artifacts ? "boolean.allowed" : "boolean.denied")}`
    );
  if (capabilities["network.publicRead"] !== void 0)
    lines.push(
      `${t("capability.public-read")}: ${t(
        capabilities["network.publicRead"] ? "capability.public-read-allowed" : "boolean.denied"
      )}`
    );
  if (capabilities.subagent !== void 0)
    lines.push(
      `${t("capability.subagent")}: ${t(capabilities.subagent ? "boolean.allowed" : "boolean.denied")}`
    );
  for (const service of capabilities.services ?? []) {
    lines.push(
      t("capability.service", { name: service.name, kind: service.kind, timeoutMs: service.timeoutMs })
    );
  }
  for (const projection of capabilities.projections ?? []) {
    lines.push(
      t("capability.projection", {
        name: projection.name,
        inputs: projection.inputEventTypes.join(t("list.separator")),
        maxStateBytes: projection.maxStateBytes
      })
    );
  }
  return lines;
}
function contributionLines(contribution, t, adminText) {
  const contributionKey = `contribution.${contribution.kind}`;
  const translatedKind = adminText(contributionKey);
  const kind = translatedKind === contributionKey ? contribution.kind : translatedKind;
  const lines = [`${kind} · ${contribution.id}`];
  switch (contribution.kind) {
    case "client":
      return [
        ...lines,
        t("contribution.description", { value: contribution.path }),
        t("contribution.backend-row", { value: contribution.rowId }),
        ..."client" in contribution ? [t("contribution.browser-entry", { value: contribution.client.entry })] : [],
        ..."client" in contribution && contribution.client.services?.length ? [t("contribution.services", { services: contribution.client.services.join(t("list.separator")) })] : []
      ];
    case "extension": {
      lines.push(
        t("contribution.entry", { value: contribution.path }),
        t("contribution.api-range", { value: contribution.apiRange })
      );
      if (contribution.runtimeSupports?.length)
        lines.push(
          t("contribution.run-mode", { modes: contribution.runtimeSupports.join(t("list.separator")) })
        );
      const declared = capabilityLines(contribution.capabilities, t);
      lines.push(...declared.length ? declared : [t("contribution.no-declared-capabilities")]);
      const clientSlots = contribution.client?.slots ?? [];
      if (clientSlots.length) {
        lines.push(t("contribution.client-slots", { slots: clientSlots.join(t("list.separator")) }));
        const unsupported = clientSlots.filter((slot) => !isWebClientModuleSlotName(slot));
        if (unsupported.length)
          lines.push(t("contribution.unsupported-slots", { slots: unsupported.join(t("list.separator")) }));
      }
      return lines;
    }
    case "seam":
      return [
        ...lines,
        t("contribution.entry", { value: contribution.path }),
        t("contribution.api-range", { value: contribution.apiRange }),
        t("contribution.provides", { value: contribution.provides.join(t("list.separator")) })
      ];
    case "provider":
    case "runtime":
      return [
        ...lines,
        t("contribution.entry", { value: contribution.path }),
        t("contribution.api-range", { value: contribution.apiRange })
      ];
    case "skill":
    case "preset":
      return [...lines, t("contribution.entry", { value: contribution.path })];
    case "surface": {
      const { descriptor } = contribution;
      const artifact = descriptor.artifact.kind === "node" ? descriptor.artifact.entry : descriptor.artifact.image;
      return [
        ...lines,
        t("contribution.surface", { value: descriptor.id }),
        t("contribution.api-range", { value: descriptor.apiRange }),
        t("contribution.artifact", { kind: descriptor.artifact.kind, value: artifact }),
        t("contribution.health-check", { value: descriptor.healthPath }),
        ...descriptor.requires.services.length ? descriptor.requires.services.map(
          (grant) => t("contribution.required-service", { value: serviceGrant(grant) })
        ) : [t("contribution.no-required-services")]
      ];
    }
  }
}
function Contributions({
  values,
  t,
  adminText
}) {
  if (!values.length) {
    return /* @__PURE__ */ jsx(TextList, { items: [], empty: t("empty.contributions") });
  }
  return /* @__PURE__ */ jsx("ul", { className: "confirm-contributions", children: values.map((contribution) => /* @__PURE__ */ jsx(
    "li",
    {
      children: contributionLines(contribution, t, adminText).map((line) => /* @__PURE__ */ jsx("p", { children: line }, line))
    },
    `${contribution.kind}:${contribution.id}:${contributionLines(contribution, t, adminText).join("|")}`
  )) });
}
function Blockers({
  values,
  t,
  adminText
}) {
  return /* @__PURE__ */ jsx(TextList, { items: values.map((blocker) => blockerText(blocker, adminText)), empty: t("empty.blockers") });
}
function CapabilityDiff({ preview, t }) {
  const diff = preview.capabilityDiff;
  const changes = [
    ...diff.added.map((item) => t("diff.added", { item })),
    ...diff.removed.map((item) => t("diff.removed", { item })),
    ...diff.runtimeSupportRemoved.map((item) => t("diff.runtime-removed", { item })),
    ...diff.dependenciesAdded.map((item) => t("diff.dependency-added", { item })),
    ...diff.serviceGrantsAdded.map((item) => t("diff.service-added", { value: serviceGrant(item) }))
  ];
  return /* @__PURE__ */ jsx(TextList, { items: changes, empty: t("empty.capability-diff") });
}
function Dependencies({
  entries,
  t
}) {
  return /* @__PURE__ */ jsx(
    TextList,
    {
      items: Object.entries(entries).map(([name, range]) => `${name} · ${range}`),
      empty: t("empty.dependencies")
    }
  );
}
function Warnings({ preview, t }) {
  return /* @__PURE__ */ jsx(
    TextList,
    {
      items: preview.warnings.map(
        (warning) => t("warning.label", { code: warning.code, message: warning.safeMessage })
      ),
      empty: t("empty.warnings")
    }
  );
}
function PreviewConfirmationFacts({ preview }) {
  const { locale, t } = useUiText(ADMIN_CONFIRMATION_LOCALE_NAMESPACE, adminConfirmationLocaleCatalog);
  const { t: adminText } = useUiText(ADMIN_LOCALE_NAMESPACE, adminLocaleCatalog);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("p", { className: "confirm-facts-lead", children: t("lead.preview") }),
    /* @__PURE__ */ jsx(
      FactsList,
      {
        items: [
          [t("fact.version"), preview.version],
          [t("fact.source"), sourceLabel(preview.source, adminText)],
          [t("fact.integrity"), preview.integrity],
          [t("fact.capability-hash"), preview.capabilityHash ?? t("value.not-reported-cannot-trust")],
          [t("fact.license"), preview.license],
          [
            t("fact.provenance-signature"),
            t(preview.provenance.signatureVerified ? "value.verified" : "value.unverified")
          ]
        ]
      }
    ),
    /* @__PURE__ */ jsx(ReviewSection, { title: t("section.provenance"), children: /* @__PURE__ */ jsx(
      FactsList,
      {
        items: [
          [t("fact.provenance-source"), sourceLabel(preview.provenance.source, adminText)],
          [t("fact.provenance-integrity"), preview.provenance.integrity],
          [
            t("fact.release-time"),
            preview.provenance.releasedAt ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
              new Date(preview.provenance.releasedAt)
            ) : t("value.not-reported")
          ],
          [
            t("fact.signature-verification"),
            t(preview.provenance.signatureVerified ? "value.verified" : "value.unverified")
          ]
        ]
      }
    ) }),
    /* @__PURE__ */ jsx(ReviewSection, { title: t("section.reported-contributions"), children: /* @__PURE__ */ jsx(Contributions, { values: preview.contributions, t, adminText }) }),
    /* @__PURE__ */ jsx(ReviewSection, { title: t("section.capability-diff"), children: /* @__PURE__ */ jsx(CapabilityDiff, { preview, t }) }),
    /* @__PURE__ */ jsxs(ReviewSection, { title: t("section.dependencies-license"), children: [
      /* @__PURE__ */ jsx(FactsList, { items: [[t("fact.license"), preview.license]] }),
      /* @__PURE__ */ jsx(Dependencies, { entries: preview.dependencies, t })
    ] }),
    /* @__PURE__ */ jsxs(ReviewSection, { title: t("section.warnings-blockers"), children: [
      /* @__PURE__ */ jsx(Warnings, { preview, t }),
      /* @__PURE__ */ jsx(Blockers, { values: preview.blockers, t, adminText })
    ] })
  ] });
}
function TrustConfirmationFacts({
  item,
  lead,
  leadKey = "lead.trust"
}) {
  const { t } = useUiText(ADMIN_CONFIRMATION_LOCALE_NAMESPACE, adminConfirmationLocaleCatalog);
  const { t: adminText } = useUiText(ADMIN_LOCALE_NAMESPACE, adminLocaleCatalog);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("p", { className: "confirm-facts-lead", children: lead ?? t(leadKey) }),
    /* @__PURE__ */ jsx(
      FactsList,
      {
        items: [
          [t("fact.version"), item.version],
          [t("fact.source"), sourceLabel(item.source, adminText)],
          [t("fact.integrity"), item.integrity],
          [t("fact.capability-hash"), item.capabilityHash ?? t("value.not-reported")]
        ]
      }
    ),
    /* @__PURE__ */ jsx(ReviewSection, { title: t("section.trust-contributions"), children: /* @__PURE__ */ jsx(Contributions, { values: item.contributions, t, adminText }) }),
    /* @__PURE__ */ jsx(ReviewSection, { title: t("section.current-blockers"), children: /* @__PURE__ */ jsx(Blockers, { values: item.blockers, t, adminText }) })
  ] });
}
function UpdateActivationFacts({
  installed,
  preview
}) {
  const { t } = useUiText(ADMIN_CONFIRMATION_LOCALE_NAMESPACE, adminConfirmationLocaleCatalog);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(PreviewConfirmationFacts, { preview }),
    /* @__PURE__ */ jsx(ReviewSection, { title: t("section.current-baseline"), children: /* @__PURE__ */ jsx(
      FactsList,
      {
        items: [
          [t("fact.current-install-version"), installed.version],
          [t("fact.current-install-integrity"), installed.integrity],
          [t("fact.current-runtime-version"), installed.actualVersion ?? t("fact.not-confirmed")],
          [
            t("fact.current-runtime-integrity"),
            installed.actualIntegrity ?? (installed.actual === "not-running" ? t("fact.not-running") : t("fact.not-confirmed"))
          ],
          [t("fact.target-trust-integrity"), preview.integrity],
          [
            t("fact.target-capability-hash"),
            preview.capabilityHash ?? t("value.not-reported-cannot-activate")
          ]
        ]
      }
    ) })
  ] });
}
function RollbackActivationFacts({
  installed
}) {
  const { t } = useUiText(ADMIN_CONFIRMATION_LOCALE_NAMESPACE, adminConfirmationLocaleCatalog);
  const { t: adminText } = useUiText(ADMIN_LOCALE_NAMESPACE, adminLocaleCatalog);
  const target = installed.rollbackTarget;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("p", { className: "confirm-facts-lead", children: t("lead.rollback") }),
    /* @__PURE__ */ jsx(
      FactsList,
      {
        items: [
          [t("fact.current-install-version"), installed.version],
          [t("fact.current-install-integrity"), installed.integrity],
          [t("fact.current-runtime-version"), installed.actualVersion ?? t("fact.not-confirmed")],
          [
            t("fact.current-runtime-integrity"),
            installed.actualIntegrity ?? (installed.actual === "not-running" ? t("fact.not-running") : t("fact.not-confirmed"))
          ],
          [t("fact.rollback-target-version"), target?.version ?? t("fact.rollback-target-missing")],
          [t("fact.rollback-target-integrity"), target?.integrity ?? t("fact.rollback-target-missing")],
          [t("fact.target-capability-hash"), target?.capabilityHash ?? t("fact.rollback-target-missing")]
        ]
      }
    ),
    /* @__PURE__ */ jsx(ReviewSection, { title: t("section.rollback-blockers"), children: /* @__PURE__ */ jsx(Blockers, { values: installed.blockers, t, adminText }) })
  ] });
}

// ../web-ui/src/locales/admin-detail.ts
var ADMIN_DETAIL_LOCALE_NAMESPACE = "@agnes/web-ui/admin-detail";
var adminDetailLocaleCatalog = {
  en: {
    "close.aria": "Close {heading} details",
    "close.label": "Close details",
    "operations.recent": "Recently completed operations",
    "operations.ongoing": "Ongoing operations",
    "operations.retry": "Backend allows retry",
    "operations.cancel": "Request cancellation"
  },
  "zh-CN": {
    "close.aria": "关闭 {heading} 的详情",
    "close.label": "关闭详情",
    "operations.recent": "最近完成的操作",
    "operations.ongoing": "正在进行的操作",
    "operations.retry": "后台允许重试",
    "operations.cancel": "请求取消"
  }
};

// ../web-ui/src/admin-detail.tsx
import { Fragment as Fragment2, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function BlockersSection({
  title,
  items
}) {
  if (!items.length) return void 0;
  return /* @__PURE__ */ jsxs2("section", { className: "plugin-blockers", children: [
    /* @__PURE__ */ jsx2("h3", { children: title }),
    /* @__PURE__ */ jsx2("ul", { children: items.map((item) => /* @__PURE__ */ jsx2("li", { children: item }, item)) })
  ] });
}
function DetailContent({
  heading,
  intro,
  version,
  stateText,
  facts,
  blockerSections,
  operations,
  lastOperationLabel,
  actions,
  onClose,
  onCancelOperation
}) {
  const { t } = useUiText(ADMIN_DETAIL_LOCALE_NAMESPACE, adminDetailLocaleCatalog);
  const { t: adminText } = useUiText(ADMIN_LOCALE_NAMESPACE, adminLocaleCatalog);
  return /* @__PURE__ */ jsxs2(Fragment2, { children: [
    /* @__PURE__ */ jsxs2("div", { className: "admin-detail-head", children: [
      /* @__PURE__ */ jsxs2("div", { className: "plugin-detail-heading", children: [
        /* @__PURE__ */ jsx2("h2", { children: heading }),
        /* @__PURE__ */ jsx2(
          "button",
          {
            type: "button",
            className: "secondary-button compact plugin-detail-close",
            onClick: onClose,
            "aria-label": t("close.aria", { heading }),
            children: t("close.label")
          }
        )
      ] }),
      version && /* @__PURE__ */ jsx2("p", { className: "plugin-detail-version", children: version }),
      stateText && /* @__PURE__ */ jsx2("p", { className: "plugin-detail-state", children: stateText }),
      /* @__PURE__ */ jsx2("p", { children: intro })
    ] }),
    /* @__PURE__ */ jsxs2("div", { className: "admin-detail-scroll", children: [
      facts.length > 0 && /* @__PURE__ */ jsx2("dl", { className: "plugin-facts", children: facts.map(([label, value]) => /* @__PURE__ */ jsx2(FragmentedFact, { label, value }, `${label}:${value}`)) }),
      blockerSections.map((section) => /* @__PURE__ */ jsx2(BlockersSection, { title: section.title, items: section.items }, section.title)),
      lastOperationLabel && /* @__PURE__ */ jsxs2("section", { className: "plugin-operations", children: [
        /* @__PURE__ */ jsx2("h3", { children: t("operations.recent") }),
        /* @__PURE__ */ jsx2("p", { children: lastOperationLabel })
      ] }),
      operations.length > 0 && /* @__PURE__ */ jsxs2("section", { className: "plugin-operations", children: [
        /* @__PURE__ */ jsx2("h3", { children: t("operations.ongoing") }),
        operations.map(({ operation, canCancel }) => /* @__PURE__ */ jsxs2("div", { className: "operation-row", children: [
          /* @__PURE__ */ jsxs2("p", { children: [
            operationLabel(operation, adminText),
            operation.progress ? ` · ${operation.progress}%` : "",
            operation.retryable ? ` · ${t("operations.retry")}` : ""
          ] }),
          canCancel && /* @__PURE__ */ jsx2(
            "button",
            {
              type: "button",
              className: "secondary-button compact",
              onClick: (event) => onCancelOperation(operation.operationId, event.currentTarget),
              children: t("operations.cancel")
            }
          )
        ] }, operation.operationId))
      ] })
    ] }),
    /* @__PURE__ */ jsx2("div", { className: "admin-detail-actions", children: actions.map(
      (action) => action.href ? /* @__PURE__ */ jsx2(
        "a",
        {
          className: action.className,
          href: action.href,
          target: "_blank",
          rel: "noopener",
          "aria-label": action.ariaLabel,
          onClick: action.onClick,
          children: action.label
        },
        action.label
      ) : /* @__PURE__ */ jsx2(
        "button",
        {
          type: "button",
          className: action.className,
          disabled: action.disabled,
          title: action.title,
          "aria-label": action.ariaLabel,
          onClick: action.onClick,
          children: action.label
        },
        action.label
      )
    ) })
  ] });
}
function FragmentedFact({ label, value }) {
  return /* @__PURE__ */ jsxs2(Fragment2, { children: [
    /* @__PURE__ */ jsx2("dt", { children: label }),
    /* @__PURE__ */ jsx2("dd", { children: value })
  ] });
}

// ../web-ui/src/locales/admin-dialogs.ts
var ADMIN_DIALOGS_LOCALE_NAMESPACE = "@agnes/web-ui/admin-dialogs";
var adminDialogsLocaleCatalog = {
  en: {
    "source.kicker": "Source",
    "source.type": "Source type",
    "source.reference": "Source reference",
    "source.checking": "Checking…",
    "source.check": "Check source",
    "confirmation.kicker": "Confirmation",
    cancel: "Cancel"
  },
  "zh-CN": {
    "source.kicker": "来源",
    "source.type": "来源类型",
    "source.reference": "来源引用",
    "source.checking": "正在检查…",
    "source.check": "检查来源",
    "confirmation.kicker": "确认",
    cancel: "取消"
  }
};

// ../web-ui/src/admin-dialogs.tsx
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function SourceDialogContent({
  title,
  intro,
  typeOptions,
  type,
  ref_,
  placeholder,
  error,
  busy,
  onTypeChange,
  onRefChange,
  onSubmit,
  onCancel
}) {
  const { t } = useUiText(ADMIN_DIALOGS_LOCALE_NAMESPACE, adminDialogsLocaleCatalog);
  return /* @__PURE__ */ jsxs3(
    "form",
    {
      id: "source-form",
      className: "plugin-dialog-form",
      onSubmit: (event) => {
        event.preventDefault();
      },
      children: [
        /* @__PURE__ */ jsx3("div", { className: "dialog-heading", children: /* @__PURE__ */ jsxs3("div", { children: [
          /* @__PURE__ */ jsx3("p", { className: "dialog-kicker", children: t("source.kicker") }),
          /* @__PURE__ */ jsx3("h2", { id: "source-dialog-title", children: title })
        ] }) }),
        /* @__PURE__ */ jsx3("p", { className: "dialog-intro", children: intro }),
        /* @__PURE__ */ jsxs3("label", { className: "form-field", htmlFor: "source-type", children: [
          t("source.type"),
          /* @__PURE__ */ jsx3("select", { id: "source-type", value: type, onChange: (event) => onTypeChange(event.currentTarget.value), children: typeOptions.map((option) => /* @__PURE__ */ jsx3("option", { value: option.value, children: option.label }, option.value)) })
        ] }),
        /* @__PURE__ */ jsxs3("label", { className: "form-field", htmlFor: "source-ref", children: [
          t("source.reference"),
          /* @__PURE__ */ jsx3(
            "input",
            {
              id: "source-ref",
              required: true,
              autoComplete: "off",
              spellCheck: false,
              placeholder,
              value: ref_,
              onChange: (event) => onRefChange(event.currentTarget.value),
              onKeyDown: (event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (!busy) onSubmit();
                }
              }
            }
          )
        ] }),
        /* @__PURE__ */ jsx3("p", { id: "source-error", className: "plugin-form-error", role: "alert", children: error }),
        /* @__PURE__ */ jsxs3("div", { className: "dialog-actions", children: [
          /* @__PURE__ */ jsx3("button", { id: "source-cancel", type: "button", className: "secondary-button", onClick: onCancel, children: t("cancel") }),
          /* @__PURE__ */ jsx3("button", { type: "button", className: "primary-button", disabled: busy, onClick: onSubmit, children: busy ? t("source.checking") : t("source.check") })
        ] })
      ]
    }
  );
}
function ConfirmDialogContent({
  title,
  description,
  facts,
  actionLabel,
  actionDisabled,
  onAction,
  onCancel
}) {
  const { t } = useUiText(ADMIN_DIALOGS_LOCALE_NAMESPACE, adminDialogsLocaleCatalog);
  return /* @__PURE__ */ jsxs3("div", { className: "plugin-dialog-form", children: [
    /* @__PURE__ */ jsx3("div", { className: "dialog-heading", children: /* @__PURE__ */ jsxs3("div", { children: [
      /* @__PURE__ */ jsx3("p", { className: "dialog-kicker", children: t("confirmation.kicker") }),
      /* @__PURE__ */ jsx3("h2", { id: "plugin-confirm-title", children: title })
    ] }) }),
    /* @__PURE__ */ jsx3("p", { id: "plugin-confirm-description", className: "dialog-intro", children: description }),
    facts && /* @__PURE__ */ jsx3("div", { id: "plugin-confirm-preview", className: "confirm-facts", children: facts }),
    /* @__PURE__ */ jsxs3("div", { className: "dialog-actions", children: [
      /* @__PURE__ */ jsx3("button", { id: "plugin-confirm-cancel", type: "button", className: "secondary-button", onClick: onCancel, children: t("cancel") }),
      /* @__PURE__ */ jsx3(
        "button",
        {
          id: "plugin-confirm-action",
          type: "button",
          className: "primary-button",
          disabled: actionDisabled,
          onClick: onAction,
          children: actionLabel
        }
      )
    ] })
  ] });
}

// ../web-ui/src/locales/admin-list.ts
var ADMIN_LIST_LOCALE_NAMESPACE = "@agnes/web-ui/admin-list";
var adminListLocaleCatalog = {
  en: {
    "surface.open-aria": "Open the {surfaceId} page for {packageId} at {mount}",
    "surface.open-page": "Open page · {mount}",
    "orphan.title": "Orphan runtime pins have not been released",
    "orphan.release-all": "Release all",
    "orphan.snapshot": "snapshot",
    "orphan.release": "Release",
    "compatibility.label": "Compatibility",
    "compatibility.supported": "Compatible",
    "compatibility.unsupported": "Unsupported",
    "switch.disable": "Request to disable {id}",
    "switch.enable": "Request to enable {id}",
    "empty.loading": "Loading plugin status…",
    "empty.installed": "No packages are installed",
    "empty.installed-unknown": "Installed status is not yet confirmed",
    "empty.query": "No catalog entries match",
    "empty.catalog": "No plugins are available in the catalog right now",
    "empty.installed-help": "Browse the catalog or check a plugin from a known source.",
    "empty.installed-recovery": "The host has not confirmed the installed state; it will refresh after recovery.",
    "empty.catalog-help": "Adjust the search term or confirm the catalog connection and try again.",
    "inventory.stale": "Showing the last-read state; the host has not confirmed it yet.",
    "row.details": "View details for {id}",
    "load-more": "Load more catalog entries"
  },
  "zh-CN": {
    "surface.open-aria": "打开 {packageId} 的 {surfaceId} 页面 {mount}",
    "surface.open-page": "打开页面 · {mount}",
    "orphan.title": "存在未释放的孤儿运行时 pin",
    "orphan.release-all": "全部释放",
    "orphan.snapshot": "快照",
    "orphan.release": "释放",
    "compatibility.label": "兼容",
    "compatibility.supported": "兼容",
    "compatibility.unsupported": "不支持",
    "switch.disable": "请求停用 {id}",
    "switch.enable": "请求启用 {id}",
    "empty.loading": "正在读取插件状态…",
    "empty.installed": "尚未安装插件",
    "empty.installed-unknown": "已安装状态暂不可确认",
    "empty.query": "没有匹配的目录条目",
    "empty.catalog": "目录暂时没有可显示的插件",
    "empty.installed-help": "可以浏览目录，或从已知来源检查一个插件。",
    "empty.installed-recovery": "后台尚未确认当前已安装状态；恢复后会自动刷新。",
    "empty.catalog-help": "请调整搜索词，或确认目录连接后重试。",
    "inventory.stale": "以下为上次读取的状态，当前后台尚未确认。",
    "row.details": "查看 {id} 的详情",
    "load-more": "加载更多目录条目"
  }
};

// ../web-ui/src/ui/state-lights.tsx
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function StateLights({ states }) {
  const { t } = useUiText(ADMIN_LOCALE_NAMESPACE, adminLocaleCatalog);
  return /* @__PURE__ */ jsx4("div", { className: "state-lights", children: states.map((state) => /* @__PURE__ */ jsxs4(
    "span",
    {
      className: "state-light",
      "data-tone": state.tone,
      title: t("state.title", { label: state.label, value: state.value }),
      children: [
        /* @__PURE__ */ jsx4("span", { className: "state-light-dot", "aria-hidden": "true" }),
        /* @__PURE__ */ jsxs4("span", { className: "state-light-copy", children: [
          /* @__PURE__ */ jsx4("span", { className: "state-light-name", children: state.label }),
          /* @__PURE__ */ jsx4("span", { className: "state-light-value", children: state.value })
        ] })
      ]
    },
    state.label
  )) });
}
function StateSwitch({ label, checked, disabled, onToggle }) {
  return /* @__PURE__ */ jsx4(
    "button",
    {
      type: "button",
      className: "switch",
      role: "switch",
      "aria-checked": checked,
      "aria-label": label,
      title: label,
      disabled,
      onClick: (event) => {
        event.stopPropagation();
        if (disabled) return;
        onToggle(!checked);
      },
      children: /* @__PURE__ */ jsx4("span", { className: "switch-track", "aria-hidden": "true", children: /* @__PURE__ */ jsx4("span", { className: "switch-knob" }) })
    }
  );
}

// ../web-ui/src/admin-list.tsx
import { Fragment as Fragment3, jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
function SurfaceLinks({
  links,
  packageId,
  t
}) {
  if (!links.length) return void 0;
  return /* @__PURE__ */ jsx5("div", { className: "plugin-surface-links", children: links.map((surface) => /* @__PURE__ */ jsx5(
    "a",
    {
      className: "secondary-button compact plugin-surface-link",
      href: surface.mount,
      target: "_blank",
      rel: "noopener",
      onClick: (event) => event.stopPropagation(),
      "aria-label": t("surface.open-aria", {
        packageId,
        surfaceId: surface.surfaceId,
        mount: surface.mount
      }),
      children: links.length === 1 ? t("surface.open-page", { mount: surface.mount }) : `${surface.surfaceId} · ${surface.mount}`
    },
    surface.surfaceId
  )) });
}
function OrphanPins({
  pins,
  errors,
  notice,
  fetchError,
  canRelease,
  onRelease
}) {
  const { t } = useUiText(ADMIN_LIST_LOCALE_NAMESPACE, adminListLocaleCatalog);
  return /* @__PURE__ */ jsxs5(Fragment3, { children: [
    /* @__PURE__ */ jsxs5("div", { className: "orphan-pins-heading", children: [
      /* @__PURE__ */ jsx5("strong", { children: t("orphan.title") }),
      /* @__PURE__ */ jsx5(
        "button",
        {
          type: "button",
          id: "orphan-pins-release-all",
          className: "secondary-button compact",
          disabled: !canRelease || pins.length === 0,
          onClick: (event) => onRelease(
            pins.map((pin) => pin.pinId),
            event.currentTarget
          ),
          children: t("orphan.release-all")
        }
      )
    ] }),
    /* @__PURE__ */ jsx5("p", { id: "orphan-pins-status", className: "orphan-pins-status", hidden: !fetchError && !notice, children: fetchError ?? notice ?? "" }),
    /* @__PURE__ */ jsx5("ul", { id: "orphan-pins-list", className: "orphan-pins-list", children: pins.map((pin) => /* @__PURE__ */ jsxs5("li", { className: "orphan-pin-row", "data-pin-id": pin.pinId, children: [
      /* @__PURE__ */ jsxs5("div", { className: "orphan-pin-content", children: [
        /* @__PURE__ */ jsxs5("p", { children: [
          pin.packageId,
          "@",
          pin.version,
          " · ",
          pin.purpose
        ] }),
        /* @__PURE__ */ jsxs5("p", { className: "orphan-pin-meta", children: [
          "pin ",
          pin.pinId,
          " · ",
          t("orphan.snapshot"),
          " ",
          pin.snapshotId
        ] }),
        errors.get(pin.pinId) && /* @__PURE__ */ jsx5("p", { className: "orphan-pin-error", children: errors.get(pin.pinId) })
      ] }),
      /* @__PURE__ */ jsx5(
        "button",
        {
          type: "button",
          className: "secondary-button compact",
          disabled: !canRelease,
          onClick: (event) => onRelease([pin.pinId], event.currentTarget),
          children: t("orphan.release")
        }
      )
    ] }, pin.pinId)) })
  ] });
}
function CatalogCompatibility({ item }) {
  const { t } = useUiText(ADMIN_LIST_LOCALE_NAMESPACE, adminListLocaleCatalog);
  return /* @__PURE__ */ jsx5(
    StateLights,
    {
      states: [
        {
          label: t("compatibility.label"),
          value: t(
            item.compatibility === "unsupported" ? "compatibility.unsupported" : "compatibility.supported"
          ),
          tone: item.compatibility === "unsupported" ? "bad" : "ok"
        }
      ]
    }
  );
}
function RowControl({
  tab,
  item,
  runtime,
  primaryAction,
  switchDisabled,
  onToggleDesired,
  t
}) {
  const actionButton = (extraClass) => /* @__PURE__ */ jsx5(
    "button",
    {
      type: "button",
      className: `secondary-button compact${extraClass ? ` ${extraClass}` : ""}`,
      disabled: primaryAction.disabled,
      onClick: (event) => {
        event.stopPropagation();
        void primaryAction.run();
      },
      children: primaryAction.label
    }
  );
  if (tab === "installed") {
    const installed = item;
    const enabled = installed.actual === "running";
    if (runtime?.phase === "failed") {
      return /* @__PURE__ */ jsxs5("div", { className: "plugin-row-actions", children: [
        /* @__PURE__ */ jsx5(
          StateSwitch,
          {
            label: t(enabled ? "switch.disable" : "switch.enable", { id: installed.id }),
            checked: enabled,
            disabled: switchDisabled,
            onToggle: (next) => onToggleDesired(installed, next)
          }
        ),
        actionButton("plugin-row-retry")
      ] });
    }
    return /* @__PURE__ */ jsx5(
      StateSwitch,
      {
        label: t(enabled ? "switch.disable" : "switch.enable", { id: installed.id }),
        checked: enabled,
        disabled: switchDisabled,
        onToggle: (next) => onToggleDesired(installed, next)
      }
    );
  }
  return actionButton();
}
function PluginList({
  tab,
  rows,
  loading,
  inventoryAuthoritative,
  query,
  nextCursor,
  surfaceLinksOf,
  runtimeOf,
  primaryActionOf,
  switchDisabledOf,
  onOpen,
  onToggleDesired,
  onLoadMore
}) {
  const { t } = useUiText(ADMIN_LIST_LOCALE_NAMESPACE, adminListLocaleCatalog);
  const { t: adminText } = useUiText(ADMIN_LOCALE_NAMESPACE, adminLocaleCatalog);
  if (loading && !rows.length) {
    return /* @__PURE__ */ jsx5("p", { className: "plugin-empty", children: t("empty.loading") });
  }
  if (!rows.length) {
    const title = tab === "installed" ? inventoryAuthoritative ? t("empty.installed") : t("empty.installed-unknown") : query ? t("empty.query") : t("empty.catalog");
    const copy = tab === "installed" ? inventoryAuthoritative ? t("empty.installed-help") : t("empty.installed-recovery") : t("empty.catalog-help");
    return /* @__PURE__ */ jsxs5("div", { className: "plugin-empty admin-empty-state", children: [
      /* @__PURE__ */ jsx5("span", { className: "agnes-mark admin-empty-state-mark", "aria-hidden": "true" }),
      /* @__PURE__ */ jsx5("h2", { children: title }),
      /* @__PURE__ */ jsx5("p", { children: copy })
    ] });
  }
  return /* @__PURE__ */ jsxs5(Fragment3, { children: [
    tab === "installed" && !inventoryAuthoritative && /* @__PURE__ */ jsx5("p", { className: "plugin-inventory-status", children: t("inventory.stale") }),
    rows.map((item) => {
      const runtime = runtimeOf(item.id);
      const failureReason = tab === "installed" ? runtime?.error?.message ?? (item.actual === "running" ? void 0 : item.actualReason) : void 0;
      return /* @__PURE__ */ jsxs5(
        "article",
        {
          className: "plugin-row",
          "data-plugin-id": item.id,
          "data-tab": tab,
          tabIndex: 0,
          role: "button",
          "aria-label": t("row.details", { id: item.id }),
          onClick: (event) => {
            if (event.target instanceof Element && event.target.closest(".switch, button, a")) return;
            onOpen(item);
          },
          onKeyDown: (event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpen(item);
            }
          },
          children: [
            /* @__PURE__ */ jsxs5("div", { className: "plugin-row-content", children: [
              /* @__PURE__ */ jsx5("h2", { children: item.id }),
              /* @__PURE__ */ jsx5("p", { children: contributionText(item, adminText) }),
              /* @__PURE__ */ jsxs5("p", { className: "plugin-source", children: [
                item.version,
                " · ",
                sourceLabel(item.source, adminText)
              ] }),
              tab === "installed" && /* @__PURE__ */ jsx5(SurfaceLinks, { links: surfaceLinksOf(item.id), packageId: item.id, t }),
              failureReason && /* @__PURE__ */ jsx5("p", { className: "resource-safe-error", children: failureReason })
            ] }),
            tab === "discover" && /* @__PURE__ */ jsx5(CatalogCompatibility, { item }),
            /* @__PURE__ */ jsx5(
              RowControl,
              {
                tab,
                item,
                runtime,
                primaryAction: primaryActionOf(item),
                switchDisabled: tab === "installed" ? switchDisabledOf(item) : true,
                t,
                onToggleDesired
              }
            )
          ]
        },
        `${item.id}@${item.version}`
      );
    }),
    tab === "discover" && nextCursor && /* @__PURE__ */ jsx5("button", { type: "button", className: "secondary-button plugin-more", onClick: onLoadMore, children: t("load-more") })
  ] });
}

// ../web-ui/src/antd-root.tsx
import { ConfigProvider as ConfigProvider2 } from "antd";
import { createElement as createElement2 } from "react";
import { createRoot } from "react-dom/client";
function createAntdRoot(container) {
  const root = createRoot(container);
  const nonce = container.ownerDocument.querySelector(
    'meta[name="agnes-csp-nonce"]'
  )?.content;
  const csp = nonce ? { nonce } : void 0;
  return {
    render(children) {
      root.render(createElement2(ConfigProvider2, csp ? { csp } : {}, children));
    },
    unmount() {
      root.unmount();
    }
  };
}

// ../web-ui/src/locales/conversation.ts
var conversationLocaleCatalog = {
  en: {
    "timeline.userLabel": "You",
    "conversation.imageUnavailable": "Image unavailable",
    "conversation.imageAlt": "Attached image {index}",
    "timeline.thinkingSummary": "Deep thinking",
    "timeline.lostOutput": "_Output interrupted; at least {count} characters were not saved_",
    "timeline.approvalLabel": "Approval: {status}",
    "timeline.approvalTitle": "Approval",
    "timeline.approval.pending": "Needs your confirmation",
    "timeline.approval.decided": "Approval processed",
    "timeline.approval.expired": "Approval expired",
    "timeline.decision.allowedOnce": "Allowed once",
    "timeline.decision.allowedSession": "Allowed for this session",
    "timeline.decision.allowedPermanent": "Always allowed for this profile",
    "timeline.decision.rejected": "Rejected",
    "timeline.decision.cancelled": "Cancelled",
    "timeline.reason.userRejected": "Rejected",
    "timeline.reason.timeout": "Timed out, not run",
    "timeline.reason.noApprover": "No one to approve, not run",
    "timeline.reason.stopped": "Stopped",
    "timeline.reason.policyDenied": "Blocked by command policy",
    "timeline.reason.subagentScope": "Refused automatically: outside the sub-agent scope",
    "timeline.artifactLabel": "Artifact",
    "timeline.compactionLabel": "Context compaction",
    "timeline.compactionFallback": "Context compacted (range: {range})",
    "timeline.unsupportedLabel": "Unsupported content",
    "timeline.conflictLabel": "Context configuration conflict",
    "timeline.conflictJoiner": ": ",
    "timeline.conflictOpsJoiner": ", ",
    "timeline.loadEarlier": "Load earlier records",
    "turn.status.running": "Running",
    "turn.status.waiting": "Waiting",
    "turn.status.completed": "Completed",
    "turn.status.failed": "Failed",
    "turn.status.cancelled": "Cancelled",
    "turn.status.awaitingApproval": "Awaiting approval",
    "turn.status.runningTool": "Running a tool",
    "turn.status.replying": "Replying",
    "turn.status.thinking": "Thinking",
    "turn.status.preparing": "Preparing a reply",
    "turn.duration.ms": "{n} ms",
    "turn.duration.s": "{n} s",
    "turn.duration.minSec": "{min} min {sec} s",
    "turn.elapsedSuffix": " · took {duration}",
    "turn.error.codeJoin": "{code}: {message}",
    "turn.error.unknownReason": "unknown reason",
    "turn.error.noDetail": "The run did not finish ({reason}); no error details were received.",
    "tool.status.planned": "Planned",
    "tool.status.awaitingApproval": "Awaiting approval",
    "tool.status.running": "Running",
    "tool.status.completed": "Completed",
    "tool.status.failed": "Failed",
    "tool.status.cancelled": "Cancelled",
    "tool.status.exitCode": "Exit code {code}",
    "tool.card.aria": "Tool {name}: {status}",
    "tool.detail.header": "Tool: {name}",
    "tool.detail.status": "Status: {status}",
    "tool.detail.args": "Arguments",
    "tool.detail.result": "Result",
    "tool.detail.error": "Error details",
    "tool.detail.noOutput": "(no output)",
    "tool.detail.expand": "View details",
    "tool.detail.collapse": "Hide details",
    "slot.notReady": "Plugin for this card is not ready",
    "slot.entryFailed": "Plugin render failed",
    "cost.detailsAria": "View the cost breakdown for this call",
    "cost.summary.input": "In {n}",
    "cost.summary.output": "Out {n}",
    "cost.source.gateway": "gateway record",
    "cost.source.estimated": "estimated",
    "cost.billing.usd": "{usd} ({source})",
    "cost.summary.noBilling": "Cost not provided",
    "cost.summary.credits": "{credits} credits ({source})",
    "cost.summary.interrupted": "Interrupted",
    "cost.rows.tokensInNoCache": "Input tokens (excl. cache)",
    "cost.rows.tokensOutReasoning": "Output tokens (incl. reasoning)",
    "cost.rows.cacheRead": "Cache read tokens",
    "cost.rows.cacheWrite": "Cache write tokens",
    "cost.rows.reasoning": "Reasoning tokens (subset of output)",
    "cost.rows.notProvided": "Not provided",
    "cost.rows.range": "Record range",
    "cost.rows.singleRecord": "Single call cost record",
    "cost.purpose.inference": "Model call",
    "cost.purpose.compaction": "Context compaction",
    "cost.purpose.subagent": "Subtask",
    "cost.purpose.verifier": "Result verification",
    "cost.purpose.media": "Media",
    "cost.purpose.tool": "Tool",
    "cost.rows.model": "Model",
    "cost.rows.tokenDetail": "Token detail",
    "cost.rows.usd": "USD cost",
    "cost.rows.credits": "Credits",
    "cost.rows.ttft": "Time to first output",
    "cost.rows.requestDuration": "Model request duration",
    "cost.rows.status": "Status",
    "cost.rows.interruptedNote": "Interrupted; usage may be incomplete or partially estimated",
    "cost.time.s": "{n} s",
    "usage.stale": " · last synced",
    "usage.caption": "About {used} / {window}{stale}",
    "usage.summary": "Context about {used} / {window} · {pct}%{stale}",
    "usage.rows.context": "Context used",
    "usage.rows.window": "Model window",
    "usage.rows.maxOutput": "Max output",
    "usage.rows.autoCompact": "Auto compaction",
    "usage.enabled": "Enabled",
    "usage.disabled": "Disabled",
    "usage.viewAria": "View {summary}",
    "usage.viewAriaFallback": "View session context usage",
    "usage.title": "Context usage",
    "usage.usedTitle": "Context used",
    "usage.note": "Context is estimated by the backend and includes retained conversation content; the model window and output cap come from the model configuration.",
    "markdown.copyCode": "Copy code",
    "markdown.copied": "Copied",
    "markdown.copyFailed": "Copy failed",
    "markdown.copy": "Copy",
    "markdown.tableScroll": "Table, scrollable horizontally",
    "turnactions.copy": "Copy answer",
    "turnactions.fork": "Fork into a new chat",
    "turnactions.copied": "Copied",
    "turnactions.copyFailed": "Copy failed",
    "turnactions.forkFailed": "Fork failed. Try again.",
    "turnactions.metaAria": "View usage and call details for this turn",
    "turnactions.rows.tokensIn": "Input tokens",
    "turnactions.rows.tokensOut": "Output tokens",
    "turnactions.rows.cache": "Cache read / write",
    "turnactions.rows.cost": "Cost",
    "turnactions.rows.credits": "Credits",
    "turnactions.rows.duration": "Duration",
    "turnactions.subscription": " · subscription",
    "turnactions.billingPartial": " · partially known",
    "turnactions.creditsPartial": " · partial",
    "turnactions.inherited": "Inherited history",
    "doc.preview.unavailable": "{kind} resource {reason}",
    "doc.reason.unauthorized": "not authorized",
    "doc.reason.unavailable": "unavailable",
    "doc.kind.image": "Image",
    "doc.kind.pdf": "PDF",
    "doc.imageFallback": "Document image",
    "doc.pdfFallback": "PDF document",
    "runtime.lostOutput": "Output interrupted; at least {count} characters not saved",
    "runtime.compactionFallback": "Context compacted {range}",
    "accounts.disable": "Disable",
    "accounts.enable": "Enable",
    "accounts.makeDefault": "Set as default",
    "accounts.confirmRemove": "Confirm removal",
    "accounts.remove": "Remove",
    "accounts.enabled": "Enabled",
    "accounts.disabled": "Disabled",
    "accounts.defaultBadge": "Default",
    "accounts.editAria": "Edit {label}",
    "accounts.edit": "Edit",
    "accounts.cancelRemove": "Cancel removal",
    "accounts.keyPlaceholder": "Enter a new key or keep the current one",
    "accounts.save": "Save account",
    "accounts.testConnection": "Test connection",
    "accounts.closeAria": "Close account details",
    "accounts.kicker": "Account configuration",
    "accounts.title": "Account details",
    "accounts.context": "Edit the connection and default model",
    "accounts.connectionLegend": "Connection",
    "accounts.nameLabel": "Account name",
    "accounts.namePlaceholder": "e.g. work account, local model",
    "accounts.providerLabel": "Provider",
    "accounts.baseUrlLabel": "Base URL",
    "accounts.apiKeyLabel": "API Key",
    "accounts.validationLegend": "Validation & default model",
    "accounts.retryRead": "Retry reading the configuration",
    "accounts.defaultModelLabel": "Default model",
    "accounts.defaultThinkingLabel": "Default thinking level",
    "accounts.contextBudgetLabel": "Default context budget (tokens)",
    "accounts.contextBudgetPlaceholder": "Automatic (model catalog default)",
    "accounts.modelSettingsHint": "K and M suffixes are supported; 100K means 100,000 tokens. New sessions inherit these defaults; existing sessions keep their settings.",
    "accounts.guard": "The default account cannot be disabled or deleted; set another enabled account as default first.",
    "settings.oauth.methodLabel": "Auth method"
  },
  "zh-CN": {
    "timeline.userLabel": "你",
    "conversation.imageUnavailable": "图片无法显示",
    "conversation.imageAlt": "附图 {index}",
    "timeline.thinkingSummary": "深度思考",
    "timeline.lostOutput": "_输出中断，至少 {count} 字未保存_",
    "timeline.approvalLabel": "审批：{status}",
    "timeline.approvalTitle": "审批",
    "timeline.approval.pending": "需要你确认",
    "timeline.approval.decided": "审批已处理",
    "timeline.approval.expired": "审批已过期",
    "timeline.decision.allowedOnce": "仅允许这次",
    "timeline.decision.allowedSession": "本会话允许",
    "timeline.decision.allowedPermanent": "对此配置始终允许",
    "timeline.decision.rejected": "已拒绝",
    "timeline.decision.cancelled": "已取消",
    "timeline.reason.userRejected": "已拒绝",
    "timeline.reason.timeout": "等待超时，未执行",
    "timeline.reason.noApprover": "无人审批，未执行",
    "timeline.reason.stopped": "已停止",
    "timeline.reason.policyDenied": "被命令策略拦截",
    "timeline.reason.subagentScope": "子代理权限范围内，已自动拒绝",
    "timeline.artifactLabel": "产物",
    "timeline.compactionLabel": "上下文整理",
    "timeline.compactionFallback": "已整理上下文（范围：{range}）",
    "timeline.unsupportedLabel": "暂不支持的内容",
    "timeline.conflictLabel": "上下文配置冲突",
    "timeline.conflictJoiner": "：",
    "timeline.conflictOpsJoiner": "、",
    "timeline.loadEarlier": "加载更早的记录",
    "turn.status.running": "正在执行",
    "turn.status.waiting": "等待处理",
    "turn.status.completed": "已完成",
    "turn.status.failed": "执行失败",
    "turn.status.cancelled": "已取消",
    "turn.status.awaitingApproval": "等待审批",
    "turn.status.runningTool": "正在执行工具",
    "turn.status.replying": "正在回复",
    "turn.status.thinking": "正在思考",
    "turn.status.preparing": "正在准备回复",
    "turn.duration.ms": "{n} 毫秒",
    "turn.duration.s": "{n} 秒",
    "turn.duration.minSec": "{min} 分 {sec} 秒",
    "turn.elapsedSuffix": " · 用时 {duration}",
    "turn.error.codeJoin": "{code}：{message}",
    "turn.error.unknownReason": "未知原因",
    "turn.error.noDetail": "本次执行未完成（{reason}），暂未收到具体错误信息。",
    "tool.status.planned": "等待执行",
    "tool.status.awaitingApproval": "等待审批",
    "tool.status.running": "正在执行",
    "tool.status.completed": "执行完成",
    "tool.status.failed": "执行失败",
    "tool.status.cancelled": "已取消",
    "tool.status.exitCode": "退出码 {code}",
    "tool.card.aria": "工具 {name}：{status}",
    "tool.detail.header": "工具：{name}",
    "tool.detail.status": "状态：{status}",
    "tool.detail.args": "执行参数",
    "tool.detail.result": "执行结果",
    "tool.detail.error": "错误详情",
    "tool.detail.noOutput": "（无输出）",
    "tool.detail.expand": "查看详情",
    "tool.detail.collapse": "收起详情",
    "slot.notReady": "此卡片的插件未就绪",
    "slot.entryFailed": "插件渲染失败",
    "cost.detailsAria": "查看本次调用用量明细",
    "cost.summary.input": "输入 {n}",
    "cost.summary.output": "输出 {n}",
    "cost.source.gateway": "网关记录",
    "cost.source.estimated": "估算",
    "cost.billing.usd": "{usd}（{source}）",
    "cost.summary.noBilling": "费用未提供",
    "cost.summary.credits": "{credits} credits（{source}）",
    "cost.summary.interrupted": "已中断",
    "cost.rows.tokensInNoCache": "输入 Token（不含缓存）",
    "cost.rows.tokensOutReasoning": "输出 Token（含推理）",
    "cost.rows.cacheRead": "缓存读取 Token",
    "cost.rows.cacheWrite": "缓存写入 Token",
    "cost.rows.reasoning": "推理 Token（输出的子集）",
    "cost.rows.notProvided": "未提供",
    "cost.rows.range": "记录范围",
    "cost.rows.singleRecord": "单次费用记录",
    "cost.purpose.inference": "模型调用",
    "cost.purpose.compaction": "上下文整理",
    "cost.purpose.subagent": "子任务",
    "cost.purpose.verifier": "结果验证",
    "cost.purpose.media": "媒体",
    "cost.purpose.tool": "工具",
    "cost.rows.model": "模型",
    "cost.rows.tokenDetail": "Token 明细",
    "cost.rows.usd": "美元费用",
    "cost.rows.credits": "额度",
    "cost.rows.ttft": "首次输出等待",
    "cost.rows.requestDuration": "模型请求耗时",
    "cost.rows.status": "状态",
    "cost.rows.interruptedNote": "已中断；用量可能不完整或包含估算",
    "cost.time.s": "{n} 秒",
    "usage.stale": " · 上次同步",
    "usage.caption": "约 {used} / {window}{stale}",
    "usage.summary": "上下文约 {used} / {window} · {pct}%{stale}",
    "usage.rows.context": "上下文占用",
    "usage.rows.window": "模型窗口",
    "usage.rows.maxOutput": "最大输出上限",
    "usage.rows.autoCompact": "自动整理上下文",
    "usage.enabled": "已启用",
    "usage.disabled": "未启用",
    "usage.viewAria": "查看{summary}",
    "usage.viewAriaFallback": "查看会话上下文占用",
    "usage.title": "上下文用量",
    "usage.usedTitle": "上下文已用",
    "usage.note": "上下文为后台估算，包含当前保留的对话等内容；模型窗口与输出上限来自模型配置。",
    "markdown.copyCode": "复制代码",
    "markdown.copied": "已复制",
    "markdown.copyFailed": "复制失败",
    "markdown.copy": "复制",
    "markdown.tableScroll": "表格，可横向滚动",
    "turnactions.copy": "复制回答",
    "turnactions.fork": "分支到新聊天",
    "turnactions.copied": "已复制",
    "turnactions.copyFailed": "复制失败",
    "turnactions.forkFailed": "分支失败，请重试。",
    "turnactions.metaAria": "查看本轮用量与调用明细",
    "turnactions.rows.tokensIn": "输入 Token",
    "turnactions.rows.tokensOut": "输出 Token",
    "turnactions.rows.cache": "缓存读取 / 写入",
    "turnactions.rows.cost": "费用",
    "turnactions.rows.credits": "额度",
    "turnactions.rows.duration": "用时",
    "turnactions.subscription": " · 订阅",
    "turnactions.billingPartial": " · 已知部分",
    "turnactions.creditsPartial": " · 部分",
    "turnactions.inherited": "继承历史",
    "doc.preview.unavailable": "{kind}资源{reason}",
    "doc.reason.unauthorized": "未获授权",
    "doc.reason.unavailable": "不可用",
    "doc.kind.image": "图片",
    "doc.kind.pdf": "PDF ",
    "doc.imageFallback": "文档图片",
    "doc.pdfFallback": "PDF 文档",
    "runtime.lostOutput": "输出中断，至少 {count} 字未保存",
    "runtime.compactionFallback": "已整理上下文 {range}",
    "accounts.disable": "停用",
    "accounts.enable": "启用",
    "accounts.makeDefault": "设为默认",
    "accounts.confirmRemove": "确认删除",
    "accounts.remove": "删除",
    "accounts.enabled": "已启用",
    "accounts.disabled": "已停用",
    "accounts.defaultBadge": "默认",
    "accounts.editAria": "编辑 {label}",
    "accounts.edit": "编辑",
    "accounts.cancelRemove": "取消删除",
    "accounts.keyPlaceholder": "输入新密钥或保留当前密钥",
    "accounts.save": "保存账户",
    "accounts.testConnection": "测试连接",
    "accounts.closeAria": "关闭账户详情",
    "accounts.kicker": "账户配置",
    "accounts.title": "账户详情",
    "accounts.context": "编辑连接与默认模型",
    "accounts.connectionLegend": "连接信息",
    "accounts.nameLabel": "账户名称",
    "accounts.namePlaceholder": "例如：工作账户、本地模型",
    "accounts.providerLabel": "Provider",
    "accounts.baseUrlLabel": "服务地址",
    "accounts.apiKeyLabel": "API Key",
    "accounts.validationLegend": "验证与默认模型",
    "accounts.retryRead": "重试读取配置",
    "accounts.defaultModelLabel": "默认模型",
    "accounts.defaultThinkingLabel": "默认思考强度",
    "accounts.contextBudgetLabel": "默认上下文预算（Token）",
    "accounts.contextBudgetPlaceholder": "自动（模型目录默认值）",
    "accounts.modelSettingsHint": "支持 K/M 单位，如 100K 表示 100,000 Token。新会话继承这些默认值；已有会话保留自己的配置。",
    "accounts.guard": "默认账户不可停用或删除；如需调整，请先将其他已启用账户设为默认。",
    "settings.oauth.methodLabel": "认证方式"
  }
};

// ../web-ui/src/locales/model-settings.ts
var modelSettingsLocaleCatalog = {
  en: {
    "modelSettings.thinking.off": "Off",
    "modelSettings.thinking.minimal": "Minimal",
    "modelSettings.thinking.low": "Low",
    "modelSettings.thinking.medium": "Medium",
    "modelSettings.thinking.high": "High",
    "modelSettings.thinking.xhigh": "Very high",
    "modelSettings.thinking.max": "Max",
    "modelSettings.thinking.auto": "Automatic (provider default)",
    "modelSettings.thinkingLabel": "Reasoning level",
    "modelSettings.savedThinkingUnavailable": "The saved level is currently unavailable: {value}",
    "modelSettings.detailAria": "Settings for this session's model",
    "modelSettings.capacityLabel": "Model capacity",
    "modelSettings.windowLabel": "Context window",
    "modelSettings.presetAuto": "Automatic",
    "modelSettings.customAria": "Custom context budget in tokens",
    "modelSettings.windowPlaceholder": "Automatic · {tokens}",
    "modelSettings.windowHint": "Model capacity {tokens} tokens. Enter 100K (100,000 tokens) or the full number; leave empty to restore the automatic value. A smaller budget compacts the context earlier.",
    "modelSettings.windowRange": "Enter a positive integer between {min} and {max} tokens. K/M units are accepted."
  },
  "zh-CN": {
    "modelSettings.thinking.off": "关闭",
    "modelSettings.thinking.minimal": "最低",
    "modelSettings.thinking.low": "低",
    "modelSettings.thinking.medium": "中",
    "modelSettings.thinking.high": "高",
    "modelSettings.thinking.xhigh": "更高",
    "modelSettings.thinking.max": "最高",
    "modelSettings.thinking.auto": "自动（Provider 默认）",
    "modelSettings.thinkingLabel": "思考强度",
    "modelSettings.savedThinkingUnavailable": "已保存的档位当前不可用：{value}",
    "modelSettings.detailAria": "所选模型的会话设置",
    "modelSettings.capacityLabel": "模型容量",
    "modelSettings.windowLabel": "上下文窗口",
    "modelSettings.presetAuto": "自动",
    "modelSettings.customAria": "自定义上下文预算（Token）",
    "modelSettings.windowPlaceholder": "自动 · {tokens}",
    "modelSettings.windowHint": "模型容量 {tokens} Token。可输入 100K（100,000 Token）或完整数量；留空恢复自动。较小预算会提前整理上下文。",
    "modelSettings.windowRange": "请输入 {min} 至 {max} 之间的正整数 Token，可使用 K/M 单位。"
  }
};

// ../web-ui/src/locales/index.ts
var WEB_UI_LOCALE_NAMESPACE = "@agnes/web-ui";
var fallbackT = (key) => key;
var DICTS = [conversationLocaleCatalog, modelSettingsLocaleCatalog];
var webUiLocaleCatalog = {
  en: Object.fromEntries(DICTS.flatMap((dict) => Object.entries(dict.en))),
  "zh-CN": Object.fromEntries(DICTS.flatMap((dict) => Object.entries(dict["zh-CN"])))
};

// ../web-ui/src/confirm.ts
function lookup(id, tag) {
  const node = document.getElementById(id);
  if (!node || node.tagName.toLowerCase() !== tag) throw new Error(`missing ${tag}#${id}`);
  return node;
}
function createConfirmController() {
  const dialog = lookup("admin-confirm", "dialog");
  const title = lookup("admin-confirm-title", "h2");
  const description = lookup("admin-confirm-description", "p");
  const facts = lookup("admin-confirm-preview", "div");
  const cancel = lookup("admin-confirm-cancel", "button");
  const action = lookup("admin-confirm-action", "button");
  let settle;
  let canClose;
  let trigger;
  const finish = (confirmed) => {
    const resolve = settle;
    settle = void 0;
    canClose = void 0;
    if (dialog.open) dialog.close();
    action.disabled = false;
    cancel.disabled = false;
    trigger?.focus({ preventScroll: true });
    trigger = void 0;
    resolve?.(confirmed);
  };
  const dismiss = () => {
    if (!settle) return;
    if (canClose?.() === false) return;
    finish(false);
  };
  cancel.addEventListener("click", dismiss);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dismiss();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dismiss();
  });
  action.addEventListener("click", () => finish(true));
  return {
    ask(request) {
      if (settle) throw new Error("confirm dialog is already open");
      canClose = request.canClose;
      trigger = document.activeElement instanceof HTMLElement ? document.activeElement : void 0;
      title.textContent = request.title;
      description.textContent = request.description;
      action.textContent = request.confirmLabel ?? (request.t ?? fallbackT)("settings.confirm.default");
      facts.replaceChildren();
      facts.hidden = !request.renderFacts;
      request.renderFacts?.(facts);
      dialog.showModal();
      action.focus();
      return new Promise((resolve) => {
        settle = resolve;
      });
    },
    busy(value) {
      action.disabled = value;
      cancel.disabled = value;
    }
  };
}

// ../web-ui/src/locales/resource-detail.ts
var RESOURCE_DETAIL_LOCALE_NAMESPACE = "@agnes/web-ui/resource-detail";
var resourceDetailLocaleCatalog = {
  en: {
    "close.aria": "Close details for {title}",
    close: "Close details",
    "skill.kind": "Skill resource",
    "mcp.kind": "MCP service",
    "skill.no-description": "This Skill has no description.",
    "fact.source": "Source",
    "fact.priority": "Priority",
    "fact.resolution": "Resolution",
    "fact.current-winner": "Current winner",
    "fact.not-winner": "Not selected",
    "fact.version": "Version",
    "fact.catalog-state": "Catalog status",
    "fact.catalog-stale": "Using the last safe catalog (refresh failed)",
    "fact.catalog-current": "Latest catalog",
    shadowed: "Shadowed candidates ({count})",
    "priority.label": "Same-name priority (50–500; higher values take precedence)",
    "skill.plugin-managed": "This Skill is provided by a plugin. Remove it through plugin management; its files cannot be deleted here.",
    "operation.cancel": "Cancel operation",
    "priority.save": "Save priority",
    "mcp.fact.source": "Source",
    "safe-error": "{code}: {message}",
    "mcp.credentials": "Credentials: {kind}",
    "mcp.status.show": "View connection status",
    "mcp.tools.show": "View tool catalog",
    "mcp.tools.title": "Tool catalog ({count})",
    "mcp.tools.more": "Load more tools",
    "mcp.edit": "Edit"
  },
  "zh-CN": {
    "close.aria": "关闭 {title} 的详情",
    close: "关闭详情",
    "skill.kind": "Skill 资源",
    "mcp.kind": "MCP 服务",
    "skill.no-description": "该 Skill 未提供说明。",
    "fact.source": "来源",
    "fact.priority": "优先级",
    "fact.resolution": "解析",
    "fact.current-winner": "当前 winner",
    "fact.not-winner": "非 winner",
    "fact.version": "版本",
    "fact.catalog-state": "目录状态",
    "fact.catalog-stale": "使用最近一次安全目录（刷新失败）",
    "fact.catalog-current": "最新目录",
    shadowed: "被遮蔽的候选（{count}）",
    "priority.label": "同名覆盖优先级（50–500，越大越优先）",
    "skill.plugin-managed": "此 Skill 由插件提供，请通过插件管理移除，不能单独删除文件。",
    "operation.cancel": "取消操作",
    "priority.save": "保存优先级",
    "mcp.fact.source": "来源",
    "safe-error": "{code}：{message}",
    "mcp.credentials": "凭据：{kind}",
    "mcp.status.show": "查看连接状态",
    "mcp.tools.show": "查看工具目录",
    "mcp.tools.title": "工具目录（{count}）",
    "mcp.tools.more": "加载更多工具",
    "mcp.edit": "编辑"
  }
};

// ../web-ui/src/locales/resource-list.ts
var RESOURCE_LIST_LOCALE_NAMESPACE = "@agnes/web-ui/resource-list";
var resourceListLocaleCatalog = {
  en: {
    loading: "Reading the local resource catalog…",
    error: "Could not read the resource catalog.",
    retry: "Retry",
    "load-more": "Load more",
    "root.root-unreadable": "Directory is unreadable",
    "root.root-unresolvable": "Directory location could not be resolved",
    "root.entry-limit": "Directory contains too many entries",
    "root.root-bytes-limit": "Directory contents exceed the size limit",
    "root.workspace-key-missing": "Workspace identifier is missing",
    "root.entry-outside-root": "An entry points outside this source",
    "root.skill-file-unreadable": "SKILL.md is unreadable or has an invalid size",
    "root.skill-body-too-large": "SKILL.md body exceeds the size limit",
    "root.invalid-frontmatter": "A SKILL.md frontmatter block is invalid (commonly an empty description)",
    "root.entries-skipped": "Some entries were invalid and have been skipped",
    "root.ready": "Scanned",
    "root.empty": "No skills found",
    "root.stale": "Refresh failed · using the last successful result",
    "root.unavailable": "Refresh failed · no usable result is available",
    "root.source-count": "Skill sources: {count}",
    "root.ready-count": "Scanned: {count}",
    "root.empty-count": "No skills: {count}",
    "root.failed-count": "Failed: {count}",
    "row.open-aria": "View details for {name}",
    "row.skill-no-description": "This Skill has no description.",
    "row.priority": "priority {priority}",
    "row.winner": "current winner",
    "row.not-winner": "not selected",
    "row.secret": "Credentials: {kind}",
    "row.tools-allowed": "{count} tools allowed",
    "row.tools-unrestricted": "tools are unrestricted",
    "row.safe-error": "{code}: {message}",
    "row.disable": "Request to disable {name}",
    "row.enable": "Request to enable {name}"
  },
  "zh-CN": {
    loading: "正在读取本地资源目录…",
    error: "资源目录读取失败。",
    retry: "重试读取",
    "load-more": "加载更多",
    "root.root-unreadable": "目录读不到",
    "root.root-unresolvable": "目录位置无法解析",
    "root.entry-limit": "目录里的条目数超过上限",
    "root.root-bytes-limit": "目录内容超过体积上限",
    "root.workspace-key-missing": "缺少工作区标识",
    "root.entry-outside-root": "有条目指向该来源之外",
    "root.skill-file-unreadable": "SKILL.md 读不到或大小不合法",
    "root.skill-body-too-large": "SKILL.md 正文超过体积上限",
    "root.invalid-frontmatter": "有 SKILL.md 的 frontmatter 不合法（常见：description 为空）",
    "root.entries-skipped": "部分条目不合规，已跳过",
    "root.ready": "已扫描",
    "root.empty": "未发现技能",
    "root.stale": "刷新失败 · 正在使用上次成功的结果",
    "root.unavailable": "刷新失败 · 本次没有可用结果",
    "root.source-count": "技能来源 {count} 个",
    "root.ready-count": "已扫描 {count}",
    "root.empty-count": "未发现技能 {count}",
    "root.failed-count": "失败 {count}",
    "row.open-aria": "查看 {name} 的详情",
    "row.skill-no-description": "该 Skill 未提供说明。",
    "row.priority": "优先级 {priority}",
    "row.winner": "当前 winner",
    "row.not-winner": "非 winner",
    "row.secret": "凭据 {kind}",
    "row.tools-allowed": "允许 {count} 个工具",
    "row.tools-unrestricted": "未限制工具",
    "row.safe-error": "{code}：{message}",
    "row.disable": "请求停用 {name}",
    "row.enable": "请求启用 {name}"
  }
};

// ../web-ui/src/regions.ts
import { flushSync } from "react-dom";
var roots = /* @__PURE__ */ new Map();
function mountRegion(host, element) {
  if (roots.has(host)) throw new Error("React region is already mounted");
  const root = createAntdRoot(host);
  roots.set(host, root);
  flushSync(() => root.render(element));
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    if (roots.get(host) !== root) return;
    root.unmount();
    roots.delete(host);
  };
}
function renderRegion(host, element) {
  const root = roots.get(host);
  if (!root) {
    mountRegion(host, element);
    return;
  }
  flushSync(() => root.render(element));
}
function createRegionHost(parent, tagName, className) {
  const owner = parent.ownerDocument ?? globalThis.document;
  const host = owner.createElement(tagName);
  if (className) host.className = className;
  parent.append(host);
  return host;
}
function unmountRegion(host) {
  roots.get(host)?.unmount();
  roots.delete(host);
}

// ../web-ui/src/resource-detail.tsx
import { useState } from "react";
import { Fragment as Fragment4, jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
function FragmentedFact2({ label, value }) {
  return /* @__PURE__ */ jsxs6(Fragment4, { children: [
    /* @__PURE__ */ jsx6("dt", { children: label }),
    /* @__PURE__ */ jsx6("dd", { children: value })
  ] });
}
function FactList({
  className,
  items
}) {
  return /* @__PURE__ */ jsx6("dl", { className, children: items.map(([label, value]) => /* @__PURE__ */ jsx6(FragmentedFact2, { label, value }, `${label}:${value}`)) });
}
function DetailHead({
  kindLabel,
  title,
  subtitle,
  onClose
}) {
  const { t } = useUiText(RESOURCE_DETAIL_LOCALE_NAMESPACE, resourceDetailLocaleCatalog);
  return /* @__PURE__ */ jsxs6("div", { className: "admin-detail-head", children: [
    /* @__PURE__ */ jsx6("p", { className: "eyebrow", children: kindLabel }),
    /* @__PURE__ */ jsxs6("div", { className: "plugin-detail-heading", children: [
      /* @__PURE__ */ jsx6("h2", { children: title }),
      /* @__PURE__ */ jsx6(
        "button",
        {
          type: "button",
          className: "secondary-button compact plugin-detail-close",
          "aria-label": t("close.aria", { title }),
          onClick: onClose,
          children: t("close")
        }
      )
    ] }),
    /* @__PURE__ */ jsx6("p", { className: "dialog-intro", children: subtitle })
  ] });
}
function SkillDetailContent({
  skill,
  disabled,
  actions,
  progress,
  onAction,
  onPrioritySave,
  onClose
}) {
  const { t } = useUiText(RESOURCE_DETAIL_LOCALE_NAMESPACE, resourceDetailLocaleCatalog);
  const [priority, setPriority] = useState(String(skill.priority));
  const removing = skill.lastSafeError?.code === "SKILL_REMOVAL_PENDING";
  return /* @__PURE__ */ jsxs6(Fragment4, { children: [
    /* @__PURE__ */ jsx6(
      DetailHead,
      {
        kindLabel: t("skill.kind"),
        title: skill.name,
        subtitle: skill.description ?? t("skill.no-description"),
        onClose
      }
    ),
    /* @__PURE__ */ jsxs6("div", { className: "admin-detail-scroll", children: [
      /* @__PURE__ */ jsx6(
        FactList,
        {
          className: "resource-facts",
          items: [
            [t("fact.source"), `${skill.sourceIdentity.scope} · ${skill.sourceIdentity.rootKey}`],
            [t("fact.priority"), String(skill.priority)],
            [t("fact.resolution"), t(skill.resolution.winner ? "fact.current-winner" : "fact.not-winner")],
            [t("fact.version"), skill.revision],
            [t("fact.catalog-state"), t(skill.stale ? "fact.catalog-stale" : "fact.catalog-current")]
          ]
        }
      ),
      skill.resolution.shadowed.length > 0 && /* @__PURE__ */ jsxs6("details", { className: "confirm-review-section", children: [
        /* @__PURE__ */ jsx6("summary", { children: t("shadowed", { count: skill.resolution.shadowed.length }) }),
        /* @__PURE__ */ jsx6("ul", { children: skill.resolution.shadowed.map((candidate) => /* @__PURE__ */ jsx6(
          "li",
          {
            children: `${candidate.sourceIdentity.scope} · ${candidate.sourceIdentity.rootKey} · ${candidate.reason}`
          },
          `${candidate.sourceIdentity.scope}:${candidate.sourceIdentity.rootKey}:${candidate.reason}`
        )) })
      ] }),
      skill.lastSafeError && /* @__PURE__ */ jsx6("p", { className: "resource-safe-error", children: t("safe-error", { code: skill.lastSafeError.code, message: skill.lastSafeError.message }) }),
      skill.sourceIdentity.scope !== "runtime" && !removing && /* @__PURE__ */ jsxs6("label", { children: [
        t("priority.label"),
        /* @__PURE__ */ jsx6(
          "input",
          {
            type: "number",
            min: 50,
            max: 500,
            step: 1,
            required: true,
            value: priority,
            disabled,
            onChange: (event) => setPriority(event.currentTarget.value)
          }
        )
      ] }),
      skill.sourceIdentity.scope === "runtime" && /* @__PURE__ */ jsx6("p", { children: t("skill.plugin-managed") }),
      progress && /* @__PURE__ */ jsxs6("div", { className: "resource-operation", children: [
        /* @__PURE__ */ jsx6("span", { children: progress.text }),
        progress.canCancel && /* @__PURE__ */ jsx6(
          "button",
          {
            type: "button",
            className: "secondary-button compact",
            title: progress.cancelTitle,
            onClick: progress.onCancel,
            children: t("operation.cancel")
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs6("div", { className: "admin-detail-actions", children: [
      actions.map((action) => /* @__PURE__ */ jsx6(
        "button",
        {
          type: "button",
          className: action.className ?? "secondary-button compact",
          disabled: action.disabled,
          title: action.title,
          onClick: () => onAction(action),
          children: action.label
        },
        action.label
      )),
      skill.sourceIdentity.scope !== "runtime" && !removing && /* @__PURE__ */ jsx6(
        "button",
        {
          type: "button",
          className: "secondary-button compact",
          disabled,
          onClick: () => {
            const next = Number.parseInt(priority, 10);
            if (!Number.isInteger(next) || next < 50 || next > 500) return;
            onPrioritySave(next);
          },
          children: t("priority.save")
        }
      )
    ] })
  ] });
}
function McpDetailContent({
  server,
  disabled,
  actions,
  progress,
  onAction,
  onStatus,
  onTools,
  onEdit,
  onClose
}) {
  const { t } = useUiText(RESOURCE_DETAIL_LOCALE_NAMESPACE, resourceDetailLocaleCatalog);
  const [status, setStatus] = useState();
  const [catalog, setCatalog] = useState();
  return /* @__PURE__ */ jsxs6(Fragment4, { children: [
    /* @__PURE__ */ jsx6(
      DetailHead,
      {
        kindLabel: t("mcp.kind"),
        title: server.displayName,
        subtitle: `${server.serverId} · ${server.transportKind.toUpperCase()} · ${t("mcp.credentials", { kind: server.secretBindingKind })}`,
        onClose
      }
    ),
    /* @__PURE__ */ jsxs6("div", { className: "admin-detail-scroll", children: [
      /* @__PURE__ */ jsx6(FactList, { className: "resource-facts", items: [[t("mcp.fact.source"), server.source]] }),
      server.lastSafeError && /* @__PURE__ */ jsx6("p", { className: "resource-safe-error", children: t("safe-error", { code: server.lastSafeError.code, message: server.lastSafeError.message }) }),
      !status && /* @__PURE__ */ jsx6(
        "button",
        {
          type: "button",
          className: "secondary-button compact",
          disabled,
          onClick: () => void onStatus().then(setStatus),
          children: t("mcp.status.show")
        }
      ),
      status && /* @__PURE__ */ jsx6(FactList, { className: "resource-facts", items: status }),
      !catalog && /* @__PURE__ */ jsx6(
        "button",
        {
          type: "button",
          className: "secondary-button compact",
          disabled,
          onClick: () => void onTools().then(setCatalog),
          children: t("mcp.tools.show")
        }
      ),
      catalog && /* @__PURE__ */ jsxs6("details", { className: "confirm-review-section", open: true, children: [
        /* @__PURE__ */ jsx6("summary", { children: t("mcp.tools.title", { count: catalog.names.length }) }),
        /* @__PURE__ */ jsxs6("div", { children: [
          catalog.names.map((name) => /* @__PURE__ */ jsx6("p", { children: name }, name)),
          catalog.nextCursor && /* @__PURE__ */ jsx6(
            "button",
            {
              type: "button",
              className: "secondary-button compact",
              disabled,
              onClick: () => void onTools(catalog.nextCursor).then(
                (next) => setCatalog({
                  names: [...catalog.names, ...next.names],
                  nextCursor: next.nextCursor
                })
              ),
              children: t("mcp.tools.more")
            }
          )
        ] })
      ] }),
      progress && /* @__PURE__ */ jsxs6("div", { className: "resource-operation", children: [
        /* @__PURE__ */ jsx6("span", { children: progress.text }),
        progress.canCancel && /* @__PURE__ */ jsx6(
          "button",
          {
            type: "button",
            className: "secondary-button compact",
            title: progress.cancelTitle,
            onClick: progress.onCancel,
            children: t("operation.cancel")
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs6("div", { className: "admin-detail-actions", children: [
      actions.map((action) => /* @__PURE__ */ jsx6(
        "button",
        {
          type: "button",
          className: action.className ?? "secondary-button compact",
          disabled: action.disabled,
          title: action.title,
          onClick: () => onAction(action),
          children: action.label
        },
        action.label
      )),
      /* @__PURE__ */ jsx6("button", { type: "button", className: "secondary-button compact", disabled, onClick: onEdit, children: t("mcp.edit") })
    ] })
  ] });
}

// ../web-ui/src/resource-list.tsx
import { Fragment as Fragment5, jsx as jsx7, jsxs as jsxs7 } from "react/jsx-runtime";
function ResourceListContent({
  tab,
  loadState,
  items,
  skillRoots,
  selectedId,
  nextCursor,
  loadingMore,
  emptyTitle,
  emptyDescription,
  emptyHints,
  switchDisabled,
  itemNameOf,
  onOpen,
  onToggleDesired,
  onLoadMore,
  onRetry
}) {
  const { t } = useUiText(RESOURCE_LIST_LOCALE_NAMESPACE, resourceListLocaleCatalog);
  if (loadState === "loading" && !items.length) {
    return /* @__PURE__ */ jsx7("p", { className: "plugin-empty", children: t("loading") });
  }
  if (loadState === "error") {
    return /* @__PURE__ */ jsxs7("p", { className: "plugin-empty", children: [
      t("error"),
      /* @__PURE__ */ jsx7("button", { type: "button", className: "secondary-button compact", "data-resource-retry": true, onClick: onRetry, children: t("retry") })
    ] });
  }
  return /* @__PURE__ */ jsxs7(Fragment5, { children: [
    tab === "skills" && skillRoots.length > 0 && /* @__PURE__ */ jsx7(ResourceRoots, { roots: skillRoots }),
    !items.length && /* @__PURE__ */ jsx7(
      ResourceEmpty,
      {
        tab,
        title: emptyTitle,
        description: emptyDescription,
        hints: tab === "skills" ? emptyHints : void 0
      }
    ),
    items.map((item) => /* @__PURE__ */ jsx7(
      ResourceRow,
      {
        item,
        selected: item.resourceId === selectedId,
        switchDisabled,
        itemName: itemNameOf(item),
        onOpen,
        onToggleDesired
      },
      item.resourceId
    )),
    nextCursor && /* @__PURE__ */ jsx7(
      "button",
      {
        type: "button",
        className: "secondary-button compact",
        "aria-busy": loadingMore,
        onClick: onLoadMore,
        children: t("load-more")
      }
    )
  ] });
}
function resourceDesiredEnabled(item) {
  return item.desired === "enabled";
}
var ROOT_FAILURE_KEYS = {
  "root-unreadable": "root.root-unreadable",
  "root-unresolvable": "root.root-unresolvable",
  "entry-limit": "root.entry-limit",
  "root-bytes-limit": "root.root-bytes-limit",
  "workspace-key-missing": "root.workspace-key-missing",
  "entry-outside-root": "root.entry-outside-root",
  "skill-file-unreadable": "root.skill-file-unreadable",
  "skill-body-too-large": "root.skill-body-too-large",
  "invalid-frontmatter": "root.invalid-frontmatter",
  "entries-skipped": "root.entries-skipped"
};
function ResourceRoots({ roots: roots2 }) {
  const { t } = useUiText(RESOURCE_LIST_LOCALE_NAMESPACE, resourceListLocaleCatalog);
  const counts = { ready: 0, empty: 0, failed: 0 };
  for (const root of roots2) {
    if (root.state === "ready") counts.ready += 1;
    else if (root.state === "empty") counts.empty += 1;
    else counts.failed += 1;
  }
  const labels = {
    ready: t("root.ready"),
    empty: t("root.empty"),
    stale: t("root.stale"),
    unavailable: t("root.unavailable")
  };
  return /* @__PURE__ */ jsxs7("details", { className: "resource-roots", children: [
    /* @__PURE__ */ jsx7("summary", { children: [
      t("root.source-count", { count: roots2.length }),
      t("root.ready-count", { count: counts.ready }),
      t("root.empty-count", { count: counts.empty }),
      counts.failed ? t("root.failed-count", { count: counts.failed }) : ""
    ].filter(Boolean).join(" · ") }),
    /* @__PURE__ */ jsx7("ul", { children: roots2.map((root) => /* @__PURE__ */ jsx7("li", { children: `${root.scope} · ${root.rootKey}: ${labels[root.state]}${root.diagnostic ? ` (${t(ROOT_FAILURE_KEYS[root.diagnostic.code])})` : ""}` }, `${root.scope}:${root.rootKey}`)) })
  ] });
}
function ResourceEmpty({
  tab,
  title,
  description,
  hints
}) {
  return /* @__PURE__ */ jsxs7("div", { className: "admin-empty-state resource-empty", children: [
    /* @__PURE__ */ jsx7("span", { className: "agnes-mark admin-empty-state-mark", "aria-hidden": "true" }),
    /* @__PURE__ */ jsx7("h2", { children: title }),
    /* @__PURE__ */ jsx7("p", { children: description }),
    tab === "skills" && hints?.length ? /* @__PURE__ */ jsx7("ul", { className: "admin-empty-state-hints", children: hints.map((hint) => /* @__PURE__ */ jsx7("li", { children: hint }, hint)) }) : null
  ] });
}
function ResourceRow({
  item,
  selected,
  switchDisabled,
  itemName,
  onOpen,
  onToggleDesired
}) {
  const { t } = useUiText(RESOURCE_LIST_LOCALE_NAMESPACE, resourceListLocaleCatalog);
  const enabled = resourceDesiredEnabled(item);
  return /* @__PURE__ */ jsxs7(
    "article",
    {
      className: "plugin-row resource-row",
      "data-resource-id": item.resourceId,
      tabIndex: 0,
      role: "button",
      "data-selected": String(selected),
      "aria-pressed": selected,
      "aria-label": t("row.open-aria", { name: itemName }),
      onClick: (event) => {
        if (event.target instanceof Element && event.target.closest(".switch")) return;
        onOpen(item);
      },
      onKeyDown: (event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(item);
        }
      },
      children: [
        /* @__PURE__ */ jsxs7("div", { className: "plugin-row-content", children: [
          /* @__PURE__ */ jsx7("h2", { title: itemName, children: itemName }),
          item.kind === "skill" ? /* @__PURE__ */ jsxs7(Fragment5, { children: [
            /* @__PURE__ */ jsx7("p", { children: item.description ?? t("row.skill-no-description") }),
            /* @__PURE__ */ jsx7("p", { className: "plugin-source", children: `${item.sourceIdentity.rootKey} · ${t("row.priority", { priority: item.priority })} · ${t(item.resolution.winner ? "row.winner" : "row.not-winner")}` })
          ] }) : /* @__PURE__ */ jsxs7(Fragment5, { children: [
            /* @__PURE__ */ jsx7("p", { children: `${item.serverId} · ${item.transportKind.toUpperCase()}` }),
            /* @__PURE__ */ jsx7("p", { className: "plugin-source", children: `${t("row.secret", { kind: item.secretBindingKind })} · ${item.definition.toolPolicy?.allow?.length ? t("row.tools-allowed", { count: item.definition.toolPolicy.allow.length }) : t("row.tools-unrestricted")}` })
          ] }),
          item.lastSafeError && /* @__PURE__ */ jsx7("p", { className: "resource-safe-error", children: t("row.safe-error", { code: item.lastSafeError.code, message: item.lastSafeError.message }) })
        ] }),
        /* @__PURE__ */ jsx7(
          StateSwitch,
          {
            label: t(enabled ? "row.disable" : "row.enable", { name: itemName }),
            checked: enabled,
            disabled: switchDisabled,
            onToggle: (next) => onToggleDesired(item, next)
          }
        )
      ]
    }
  );
}

// ../web-ui/src/popover.ts
function positionPopover(trigger, panel, options) {
  const padding = options.viewportPadding ?? 12;
  const gap = options.gap ?? 8;
  const triggerBounds = trigger.getBoundingClientRect();
  const viewportWidth = Math.max(0, window.innerWidth);
  const viewportHeight = Math.max(0, window.innerHeight);
  const measuredWidth = panel.getBoundingClientRect().width || options.preferredWidth;
  const width = Math.max(
    0,
    Math.min(
      options.width === "content" ? measuredWidth : options.preferredWidth,
      viewportWidth - padding * 2
    )
  );
  const left = Math.max(
    padding,
    Math.min(triggerBounds.left, Math.max(padding, viewportWidth - width - padding))
  );
  const measuredHeight = Math.max(panel.getBoundingClientRect().height, panel.scrollHeight) || options.preferredHeight;
  const roomAbove = Math.max(0, triggerBounds.top - padding - gap);
  const roomBelow = Math.max(0, viewportHeight - triggerBounds.bottom - padding - gap);
  const above = roomAbove >= Math.min(measuredHeight, options.preferredHeight) || roomAbove >= roomBelow;
  const availableHeight = Math.min(options.preferredHeight, above ? roomAbove : roomBelow);
  const height = Math.min(measuredHeight, availableHeight);
  const top = above ? Math.max(padding, triggerBounds.top - height - gap) : Math.min(viewportHeight - height - padding, triggerBounds.bottom + gap);
  if (options.width !== "content") panel.style.width = `${width}px`;
  panel.style.maxHeight = `${Math.max(0, availableHeight)}px`;
  panel.style.left = `${left}px`;
  panel.style.top = `${Math.max(padding, top)}px`;
  panel.dataset.placement = above ? "above" : "below";
  return above ? "above" : "below";
}
function positionSubmenu(anchor, parent, panel, options) {
  const padding = options.viewportPadding ?? 12;
  const gap = options.gap ?? 4;
  const anchorBounds = anchor.getBoundingClientRect();
  const parentBounds = parent.getBoundingClientRect();
  const viewportWidth = Math.max(0, window.innerWidth);
  const viewportHeight = Math.max(0, window.innerHeight);
  const width = Math.max(0, Math.min(options.preferredWidth, viewportWidth - padding * 2));
  const toRight = parentBounds.right + gap;
  const toLeft = parentBounds.left - gap - width;
  const opensRight = toRight + width + padding <= viewportWidth || toLeft < padding;
  const left = Math.max(padding, Math.min(opensRight ? toRight : toLeft, viewportWidth - width - padding));
  const measuredHeight = Math.max(panel.getBoundingClientRect().height, panel.scrollHeight) || options.preferredHeight;
  const height = Math.min(measuredHeight, options.preferredHeight, viewportHeight - padding * 2);
  const top = Math.max(padding, Math.min(anchorBounds.top, viewportHeight - height - padding));
  panel.style.width = `${width}px`;
  panel.style.maxHeight = `${Math.max(0, Math.min(options.preferredHeight, viewportHeight - top - padding))}px`;
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.dataset.placement = opensRight ? "right" : "left";
  return opensRight ? "right" : "left";
}
function listboxIntent(event) {
  switch (event.key) {
    case "ArrowDown":
      return { kind: "move", delta: 1 };
    case "ArrowUp":
      return { kind: "move", delta: -1 };
    case "Home":
      return { kind: "first" };
    case "End":
      return { kind: "last" };
    case "Enter":
    case " ":
      return { kind: "activate" };
    case "Escape":
      return { kind: "dismiss", returnFocus: true };
    // Returning focus to the trigger lets the browser continue Tab from its ordinary place.
    case "Tab":
      return { kind: "dismiss", returnFocus: true };
    default:
      return void 0;
  }
}
function bindListboxKeys(listbox, handle) {
  listbox.addEventListener("keydown", (event) => {
    const intent = listboxIntent(event);
    if (!intent) return;
    event.preventDefault();
    handle(intent);
  });
}

// ../web-ui/src/select-picker.ts
var optionLabel = (item) => item.getAttribute("label") || item.textContent || "";
function createSelectPicker(select, options) {
  const doc = select.ownerDocument;
  const view = doc.defaultView;
  const trigger = doc.createElement("button");
  trigger.type = "button";
  trigger.id = `${select.id}-trigger`;
  trigger.className = "select-picker-trigger";
  trigger.setAttribute("role", "combobox");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  const label = doc.createElement("span");
  label.className = "select-picker-value";
  const arrow = doc.createElement("span");
  arrow.className = "select-picker-chevron";
  arrow.setAttribute("aria-hidden", "true");
  trigger.append(label, arrow);
  const wasHidden = select.hidden;
  select.hidden = true;
  select.after(trigger);
  const field = select.closest("label");
  const originalFor = field?.getAttribute("for");
  if (field) field.htmlFor = trigger.id;
  let panel;
  let choices = [];
  let active = 0;
  let typed = "";
  let typedAt = 0;
  const available = (item) => (options.includeEmpty !== false || !!item.value) && !item.hidden && !item.disabled && !item.closest("optgroup")?.disabled && !item.closest("optgroup")?.hidden;
  function close() {
    panel?.remove();
    panel = void 0;
    trigger.setAttribute("aria-expanded", "false");
    trigger.removeAttribute("aria-controls");
    trigger.removeAttribute("aria-activedescendant");
    doc.removeEventListener("pointerdown", outside, true);
    doc.removeEventListener("scroll", onScroll, true);
    view?.removeEventListener("resize", close);
  }
  function sync() {
    close();
    const selected = select.options[select.selectedIndex];
    const selectedLabel = selected ? optionLabel(selected) : void 0;
    const text = selectedLabel ? options.formatOption?.(selectedLabel) ?? selectedLabel : (options.translate ?? fallbackT)("settings.selectPicker.fallback", { label: options.label });
    label.textContent = text;
    trigger.title = text;
    trigger.setAttribute(
      "aria-label",
      (options.translate ?? fallbackT)("settings.selectPicker.ariaJoin", {
        label: options.label,
        value: text
      })
    );
    trigger.disabled = select.disabled || !Array.from(select.options).some(available);
  }
  function outside(event) {
    const path = event.composedPath();
    if (!path.includes(trigger) && (!panel || !path.includes(panel))) close();
  }
  function onScroll(event) {
    if (panel && !event.composedPath().includes(panel)) close();
  }
  function highlight(index) {
    active = Math.max(0, Math.min(index, choices.length - 1));
    const rows = panel?.querySelectorAll('[role="option"]');
    rows?.forEach((row2, i) => {
      row2.dataset.active = String(i === active);
    });
    const row = rows?.[active];
    if (!row) return;
    trigger.setAttribute("aria-activedescendant", row.id);
    row.scrollIntoView?.({ block: "nearest" });
  }
  function choose(index) {
    const choice = choices[index];
    if (!choice || select.disabled) return;
    const changed = select.value !== choice.value;
    select.value = choice.value;
    sync();
    trigger.focus({ preventScroll: true });
    if (changed && view) select.dispatchEvent(new view.Event("change", { bubbles: true }));
  }
  function open() {
    if (trigger.disabled || panel) return;
    choices = Array.from(select.options).filter(available);
    if (!choices.length) return;
    typed = "";
    panel = doc.createElement("div");
    panel.id = `${select.id}-listbox`;
    panel.className = "select-picker-panel";
    panel.setAttribute("role", "listbox");
    panel.setAttribute("aria-label", options.label);
    panel.addEventListener("mousedown", (event) => event.preventDefault());
    let previousGroup;
    let container = panel;
    for (const [index, choice] of choices.entries()) {
      const group = choice.closest("optgroup");
      if (group !== previousGroup) {
        previousGroup = group;
        container = panel;
        if (group) {
          container = doc.createElement("div");
          container.className = "select-picker-group";
          container.setAttribute("role", "group");
          const heading = doc.createElement("div");
          heading.id = `${panel.id}-group-${index}`;
          heading.className = "select-picker-heading";
          heading.textContent = group.label;
          container.setAttribute("aria-labelledby", heading.id);
          container.append(heading);
          panel.append(container);
        }
      }
      const row = doc.createElement("div");
      row.id = `${panel.id}-${index}`;
      row.className = "select-picker-option";
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(choice.selected));
      const copy = doc.createElement("span");
      copy.textContent = options.formatOption?.(optionLabel(choice)) ?? optionLabel(choice);
      const check4 = doc.createElement("span");
      check4.className = "select-picker-check";
      check4.setAttribute("aria-hidden", "true");
      check4.textContent = choice.selected ? "✓" : "";
      row.append(copy, check4);
      row.addEventListener("click", () => choose(index));
      container.append(row);
    }
    ;
    (select.closest("dialog") ?? doc.body).append(panel);
    if (typeof panel.showPopover === "function") {
      panel.setAttribute("popover", "manual");
      panel.showPopover();
    }
    positionPopover(trigger, panel, {
      preferredWidth: Math.max(trigger.getBoundingClientRect().width, 300),
      preferredHeight: 360,
      gap: 6
    });
    const bottom = trigger.getBoundingClientRect().bottom + 6;
    if (view && view.innerHeight - bottom - 12 >= panel.getBoundingClientRect().height) {
      panel.style.top = `${bottom}px`;
      panel.dataset.placement = "below";
    }
    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute("aria-controls", panel.id);
    highlight(
      Math.max(
        0,
        choices.findIndex((item) => item.selected)
      )
    );
    doc.addEventListener("pointerdown", outside, true);
    doc.addEventListener("scroll", onScroll, true);
    view?.addEventListener("resize", close);
  }
  trigger.addEventListener("click", () => {
    trigger.focus({ preventScroll: true });
    if (panel) close();
    else open();
  });
  trigger.addEventListener("blur", close);
  trigger.addEventListener("keydown", (event) => {
    const intent = listboxIntent(event);
    if (event.key === "Tab") {
      close();
      return;
    }
    if (intent) {
      if (intent.kind === "dismiss" && !panel) return;
      event.preventDefault();
      event.stopPropagation();
      if (intent.kind === "dismiss") close();
      else if (!panel) {
        open();
        if (event.key === "ArrowUp" || intent.kind === "last") highlight(choices.length - 1);
        else if (intent.kind === "first") highlight(0);
      } else if (intent.kind === "activate") choose(active);
      else if (intent.kind === "move") highlight(active + intent.delta);
      else highlight(intent.kind === "first" ? 0 : choices.length - 1);
      if (panel) panel.dataset.keyboard = "true";
      return;
    }
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    open();
    if (panel) panel.dataset.keyboard = "true";
    const now = Date.now();
    typed = (now - typedAt > 700 ? "" : typed) + event.key.toLocaleLowerCase();
    typedAt = now;
    const match = choices.findIndex((item) => optionLabel(item).toLocaleLowerCase().startsWith(typed));
    if (match >= 0) highlight(match);
  });
  select.closest("dialog")?.addEventListener("close", close);
  select.addEventListener("change", sync);
  const onReset = () => queueMicrotask(sync);
  select.form?.addEventListener("reset", onReset);
  sync();
  return {
    sync,
    close,
    destroy: () => {
      close();
      trigger.remove();
      select.hidden = wasHidden;
      if (field) {
        if (originalFor === null) field.removeAttribute("for");
        else if (originalFor !== void 0) field.setAttribute("for", originalFor);
      }
      select.removeEventListener("change", sync);
      select.form?.removeEventListener("reset", onReset);
      select.closest("dialog")?.removeEventListener("close", close);
    }
  };
}

// ../web-ui/src/ui/notification.tsx
import { notification as antNotification } from "antd";
import { useLayoutEffect } from "react";
var DEFAULTS = { placement: "topRight", duration: 6 };
function NotificationHost({ onReady }) {
  const [api, contextHolder] = antNotification.useNotification(DEFAULTS);
  useLayoutEffect(() => {
    onReady({
      notify({ text, kind }) {
        api.open({
          title: text,
          // 没声明严重程度时按中性处理：只有调用方知道这是错误还是提示，猜成错误会画出红叉。
          type: kind ?? "info",
          closable: true,
          role: "alert",
          className: "agnes-ui-notification"
        });
      }
    });
  }, [api, onReady]);
  return contextHolder;
}

// ../web-ui/src/diagnostics-dialog.tsx
import { jsx as jsx8, jsxs as jsxs8 } from "react/jsx-runtime";
function DiagnosticsDialogView({
  snapshot,
  actions,
  text
}) {
  const { step, include } = snapshot;
  const label = (key, fallback) => text?.(key) ?? fallback;
  return /* @__PURE__ */ jsxs8("div", { className: "diagnostics-body", children: [
    /* @__PURE__ */ jsx8("div", { className: "dialog-heading", children: /* @__PURE__ */ jsx8("h2", { id: "diagnostics-heading", children: snapshot.title }) }),
    /* @__PURE__ */ jsxs8("section", { "data-step": "menu", hidden: step !== "menu", children: [
      /* @__PURE__ */ jsx8("p", { className: "dialog-intro", children: label(
        "diagnostics.intro",
        "Create a diagnostics ZIP you can share with support. It can include this session’s conversation and trace, logs, and system information."
      ) }),
      /* @__PURE__ */ jsx8("p", { className: "diagnostics-badge", children: label("diagnostics.redaction", "Secrets are redacted before sharing.") }),
      /* @__PURE__ */ jsxs8("div", { className: "dialog-actions", children: [
        /* @__PURE__ */ jsx8("button", { className: "secondary-button", type: "button", "data-action": "cancel", onClick: actions.close, children: label("diagnostics.cancel", "Cancel") }),
        /* @__PURE__ */ jsx8("button", { className: "primary-button", type: "button", "data-action": "share", onClick: actions.share, children: label("diagnostics.share", "Share diagnostics") })
      ] })
    ] }),
    /* @__PURE__ */ jsxs8("section", { "data-step": "share", hidden: step !== "share", children: [
      /* @__PURE__ */ jsxs8("fieldset", { className: "diagnostics-include", "aria-labelledby": "diagnostics-heading", children: [
        /* @__PURE__ */ jsxs8("label", { children: [
          /* @__PURE__ */ jsx8(
            "input",
            {
              type: "checkbox",
              name: "conversation",
              checked: include.conversation,
              disabled: !snapshot.hasSession,
              onChange: (event) => actions.setInclude("conversation", event.currentTarget.checked)
            }
          ),
          " ",
          label("diagnostics.include.conversation", "Conversation and trace")
        ] }),
        /* @__PURE__ */ jsxs8("label", { children: [
          /* @__PURE__ */ jsx8(
            "input",
            {
              type: "checkbox",
              name: "logs",
              checked: include.logs,
              onChange: (event) => actions.setInclude("logs", event.currentTarget.checked)
            }
          ),
          " ",
          label("diagnostics.include.logs", "Logs")
        ] }),
        /* @__PURE__ */ jsxs8("label", { children: [
          /* @__PURE__ */ jsx8(
            "input",
            {
              type: "checkbox",
              name: "system",
              checked: include.system,
              onChange: (event) => actions.setInclude("system", event.currentTarget.checked)
            }
          ),
          " ",
          label("diagnostics.include.system", "System information")
        ] })
      ] }),
      /* @__PURE__ */ jsxs8("div", { className: "dialog-actions", children: [
        /* @__PURE__ */ jsx8(
          "button",
          {
            className: "secondary-button",
            type: "button",
            "data-back": "menu",
            disabled: snapshot.generating,
            onClick: () => actions.back("menu"),
            children: label("diagnostics.back", "Back")
          }
        ),
        /* @__PURE__ */ jsx8(
          "button",
          {
            className: "primary-button",
            type: "button",
            "data-action": "generate",
            disabled: snapshot.generating,
            onClick: actions.generate,
            children: snapshot.generating ? label("diagnostics.generating", "Generating…") : label("diagnostics.generate", "Generate package")
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs8("section", { "data-step": "ready", hidden: step !== "ready", children: [
      /* @__PURE__ */ jsx8("p", { className: "dialog-intro", "data-ready-summary": true, children: snapshot.summary }),
      /* @__PURE__ */ jsx8("p", { className: "dialog-intro", "data-ready-warning": true, hidden: !snapshot.hasWarnings, children: label(
        "diagnostics.warning",
        "Some diagnostics were unavailable or over the export limit. See diagnostic-export-warnings.json in the package."
      ) }),
      /* @__PURE__ */ jsxs8("div", { className: "dialog-actions", children: [
        /* @__PURE__ */ jsx8(
          "button",
          {
            className: "secondary-button",
            type: "button",
            "data-back": "share",
            onClick: () => actions.back("share"),
            children: label("diagnostics.back", "Back")
          }
        ),
        /* @__PURE__ */ jsx8(
          "button",
          {
            className: "primary-button",
            type: "button",
            "data-action": "save",
            disabled: snapshot.saving,
            onClick: actions.save,
            children: label("diagnostics.save", "Save ZIP")
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs8("section", { "data-step": "saved", hidden: step !== "saved", children: [
      /* @__PURE__ */ jsx8("p", { className: "dialog-intro", children: label(
        "diagnostics.savedIntro",
        "Share this ZIP with support or engineering. Unzip it and open index.html."
      ) }),
      /* @__PURE__ */ jsx8("p", { className: "diagnostics-file", "data-saved-name": true, children: snapshot.savedName }),
      /* @__PURE__ */ jsx8("div", { className: "dialog-actions", children: /* @__PURE__ */ jsx8("button", { className: "primary-button", type: "button", "data-action": "close", onClick: actions.close, children: label("diagnostics.close", "Close") }) })
    ] }),
    /* @__PURE__ */ jsx8("p", { className: "dialog-error", role: "alert", children: snapshot.error })
  ] });
}

// ../web-ui/src/model-settings.ts
var THINKING_LABEL_KEYS = {
  off: "modelSettings.thinking.off",
  minimal: "modelSettings.thinking.minimal",
  low: "modelSettings.thinking.low",
  medium: "modelSettings.thinking.medium",
  high: "modelSettings.thinking.high",
  xhigh: "modelSettings.thinking.xhigh",
  max: "modelSettings.thinking.max"
};
function modelThinkingOptions(map3, t = fallbackT) {
  return [
    { label: t("modelSettings.thinking.auto"), value: "" },
    ...Object.entries(THINKING_LABEL_KEYS).filter(([level]) => map3 && Object.hasOwn(map3, level)).map(([value, key]) => ({ value, label: `${t(key)} · ${value}` }))
  ];
}
function parseContextBudget(value) {
  const match = /^(\d+(?:\.\d+)?)\s*([km]?)$/i.exec(value.trim());
  if (!match) return void 0;
  const tokens = Number(match[1]) * (match[2]?.toLowerCase() === "m" ? 1e6 : match[2] ? 1e3 : 1);
  return Number.isSafeInteger(tokens) && tokens > 0 ? tokens : void 0;
}
var BUDGET_PRESETS = [32e3, 64e3, 128e3, 256e3, 512e3, 1e6];
function contextBudgetPresets(capacity) {
  const minimum = minimumContextBudget(capacity);
  return BUDGET_PRESETS.filter((tokens) => tokens >= minimum && tokens <= capacity);
}
function contextBudgetLabel(tokens) {
  if (tokens >= 1e6) return `${Number((tokens / 1e6).toFixed(1))}M`;
  if (tokens >= 1e3) return `${Number((tokens / 1e3).toFixed(1))}K`;
  return String(tokens);
}

// ../web-ui/src/settings-option-select.tsx
import { useLayoutEffect as useLayoutEffect2, useRef, useState as useState2 } from "react";
import { flushSync as flushSync2 } from "react-dom";
import { Fragment as Fragment6, jsx as jsx9, jsxs as jsxs9 } from "react/jsx-runtime";
var OPTIONS_EVENT = "agnes:settings-select-options";
function subscribe(select, update) {
  const onOptions = (event) => {
    const change = event;
    change.preventDefault();
    flushSync2(() => update(change.detail));
  };
  select.addEventListener(OPTIONS_EVENT, onOptions);
  return () => select.removeEventListener(OPTIONS_EVENT, onOptions);
}
function optionNodes(content) {
  return /* @__PURE__ */ jsxs9(Fragment6, { children: [
    content.options.map(({ label, value }) => /* @__PURE__ */ jsx9("option", { value, children: label }, value)),
    content.groups.filter(({ options }) => options.length > 0).map(({ label, options }) => /* @__PURE__ */ jsx9("optgroup", { label, children: options.map(({ label: optionLabel2, value }) => /* @__PURE__ */ jsx9("option", { value, children: optionLabel2 }, value)) }, label))
  ] });
}
function setSettingsSelectOptions(select, options, groups = []) {
  const EventConstructor = select.ownerDocument.defaultView?.CustomEvent ?? CustomEvent;
  const event = new EventConstructor(OPTIONS_EVENT, {
    bubbles: false,
    cancelable: true,
    detail: { options, groups }
  });
  if (select.dispatchEvent(event)) throw new Error(`settings select #${select.id} is not mounted by React`);
}
function SettingsOptionSelect({ id }) {
  const ref = useRef(null);
  const [content, setContent] = useState2({ options: [], groups: [] });
  useLayoutEffect2(() => {
    const select = ref.current;
    if (!select) return;
    return subscribe(select, setContent);
  }, []);
  return /* @__PURE__ */ jsx9("select", { id, ref, children: optionNodes(content) });
}

// ../web-ui/src/ui/button.tsx
import { Button as AntButton } from "antd";
import { jsx as jsx10 } from "react/jsx-runtime";
function Button({ className, children, ...props }) {
  const classes = ["agnes-ui-button", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx10(AntButton, { ...props, className: classes, children });
}

// ../web-ui/src/ui/field.tsx
import { jsx as jsx11, jsxs as jsxs10 } from "react/jsx-runtime";
function Field({ children, error, hint, label, htmlFor, ...props }) {
  return /* @__PURE__ */ jsxs10(
    "label",
    {
      ...props,
      className: ["agnes-ui-field", props.className].filter(Boolean).join(" "),
      htmlFor,
      children: [
        /* @__PURE__ */ jsx11("span", { className: "agnes-ui-field-label", children: label }),
        children,
        hint !== void 0 && /* @__PURE__ */ jsx11("span", { className: "agnes-ui-field-hint", children: hint }),
        error !== void 0 && /* @__PURE__ */ jsx11("span", { className: "agnes-ui-field-error", role: "alert", children: error })
      ]
    }
  );
}

// ../web-ui/src/settings-account-dialog.tsx
import { jsx as jsx12, jsxs as jsxs11 } from "react/jsx-runtime";
function SettingsAccountDialog({ t = fallbackT }) {
  return /* @__PURE__ */ jsxs11("dialog", { "data-agnes-region": "dialog", id: "account-dialog", "aria-labelledby": "config-detail-title", children: [
    /* @__PURE__ */ jsx12(
      Button,
      {
        id: "account-dialog-close",
        type: "text",
        htmlType: "button",
        className: "icon-button account-dialog-close",
        "aria-label": t("accounts.closeAria"),
        children: /* @__PURE__ */ jsx12("svg", { className: "icon", "data-agnes-region": "icon", viewBox: "0 0 24 24", "aria-hidden": "true", children: /* @__PURE__ */ jsx12("path", { d: "m6 6 12 12M18 6 6 18" }) })
      }
    ),
    /* @__PURE__ */ jsxs11("section", { className: "account-dialog-body", "aria-labelledby": "config-detail-title", children: [
      /* @__PURE__ */ jsxs11("div", { className: "config-detail-heading", children: [
        /* @__PURE__ */ jsxs11("div", { children: [
          /* @__PURE__ */ jsx12("p", { className: "eyebrow", children: t("accounts.kicker") }),
          /* @__PURE__ */ jsx12("h3", { id: "config-detail-title", children: t("accounts.title") })
        ] }),
        /* @__PURE__ */ jsx12("p", { id: "config-account-context", children: t("accounts.context") })
      ] }),
      /* @__PURE__ */ jsxs11("div", { className: "config-detail-grid", children: [
        /* @__PURE__ */ jsxs11("fieldset", { className: "config-section", children: [
          /* @__PURE__ */ jsx12("legend", { children: t("accounts.connectionLegend") }),
          /* @__PURE__ */ jsx12(Field, { className: "form-field", label: t("accounts.nameLabel"), children: /* @__PURE__ */ jsx12(
            "input",
            {
              id: "config-account-name",
              maxLength: 128,
              autoComplete: "off",
              placeholder: t("accounts.namePlaceholder")
            }
          ) }),
          /* @__PURE__ */ jsx12(Field, { className: "form-field", label: t("accounts.providerLabel"), children: /* @__PURE__ */ jsx12(SettingsOptionSelect, { id: "config-provider" }) }),
          /* @__PURE__ */ jsx12(
            Field,
            {
              className: "form-field form-field-wide",
              id: "config-auth-method-field",
              label: t("settings.oauth.methodLabel"),
              children: /* @__PURE__ */ jsx12(SettingsOptionSelect, { id: "config-auth-method" })
            }
          ),
          /* @__PURE__ */ jsx12(Field, { className: "form-field form-field-wide", label: t("accounts.baseUrlLabel"), children: /* @__PURE__ */ jsx12("input", { id: "config-base-url", autoComplete: "url" }) }),
          /* @__PURE__ */ jsx12(Field, { className: "form-field form-field-wide", label: t("accounts.apiKeyLabel"), children: /* @__PURE__ */ jsx12(
            "input",
            {
              id: "config-api-key",
              type: "password",
              autoComplete: "new-password",
              placeholder: t("accounts.keyPlaceholder"),
              "aria-describedby": "config-key-hint"
            }
          ) }),
          /* @__PURE__ */ jsx12("p", { id: "config-key-hint", className: "field-hint form-field-wide" }),
          /* @__PURE__ */ jsx12("div", { id: "config-oauth-controls", className: "form-field-wide" })
        ] }),
        /* @__PURE__ */ jsxs11("fieldset", { className: "config-section config-validation-section", children: [
          /* @__PURE__ */ jsx12("legend", { children: t("accounts.validationLegend") }),
          /* @__PURE__ */ jsxs11("div", { className: "config-validation-controls", children: [
            /* @__PURE__ */ jsx12(Field, { className: "form-field", label: t("accounts.defaultModelLabel"), children: /* @__PURE__ */ jsx12(SettingsOptionSelect, { id: "config-model" }) }),
            /* @__PURE__ */ jsxs11(Button, { id: "config-test", className: "secondary-button", htmlType: "button", children: [
              /* @__PURE__ */ jsx12("svg", { className: "icon", "data-agnes-region": "icon", viewBox: "0 0 24 24", "aria-hidden": "true", children: /* @__PURE__ */ jsx12("path", { d: "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" }) }),
              /* @__PURE__ */ jsx12("span", { children: t("accounts.testConnection") })
            ] })
          ] }),
          /* @__PURE__ */ jsx12(Field, { className: "form-field", label: t("accounts.defaultThinkingLabel"), children: /* @__PURE__ */ jsx12(SettingsOptionSelect, { id: "config-thinking" }) }),
          /* @__PURE__ */ jsx12(Field, { className: "form-field", label: t("accounts.contextBudgetLabel"), children: /* @__PURE__ */ jsx12(
            "input",
            {
              id: "config-context-window",
              type: "text",
              maxLength: 32,
              placeholder: t("accounts.contextBudgetPlaceholder"),
              "aria-describedby": "config-model-settings-hint config-error"
            }
          ) }),
          /* @__PURE__ */ jsx12("p", { id: "config-model-settings-hint", className: "field-hint", children: t("accounts.modelSettingsHint") }),
          /* @__PURE__ */ jsx12("p", { id: "config-state", "aria-live": "polite" }),
          /* @__PURE__ */ jsx12(Button, { id: "config-retry", className: "secondary-button compact", htmlType: "button", hidden: true, children: t("accounts.retryRead") }),
          /* @__PURE__ */ jsx12("p", { id: "config-error", role: "alert" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs11("div", { className: "config-detail-footer", children: [
        /* @__PURE__ */ jsx12("p", { id: "config-account-guard", children: t("accounts.guard") }),
        /* @__PURE__ */ jsx12(Button, { id: "config-save", className: "primary-button", htmlType: "submit", form: "config-form", disabled: true, children: t("accounts.save") })
      ] })
    ] })
  ] });
}

// ../web-ui/src/settings-accounts.tsx
import { jsx as jsx13, jsxs as jsxs12 } from "react/jsx-runtime";
function accountStatus(account) {
  if (!account.enabled) return "inactive";
  return account.credentialConfigured ? "ready" : "missing";
}
function SettingsAccounts({
  accounts,
  defaultAccountId,
  disabled,
  editingId,
  removingId,
  onEdit,
  onAction,
  onCancelRemove,
  t = fallbackT
}) {
  return accounts.map((account) => {
    const isDefault = defaultAccountId === account.accountId;
    const canTransferDefault = accounts.some(
      (other) => other.enabled && other.accountId !== account.accountId
    );
    const actions = [
      [
        account.enabled ? "disable" : "enable",
        account.enabled ? t("accounts.disable") : t("accounts.enable")
      ],
      ["default", t("accounts.makeDefault")],
      ["remove", removingId === account.accountId ? t("accounts.confirmRemove") : t("accounts.remove")]
    ];
    return /* @__PURE__ */ jsxs12(
      "div",
      {
        className: "config-account",
        "data-selected": account.accountId === editingId,
        "data-status": accountStatus(account),
        children: [
          /* @__PURE__ */ jsx13(
            "button",
            {
              type: "button",
              className: "config-account-select",
              "aria-pressed": account.accountId === editingId,
              disabled,
              onClick: () => onEdit(account.accountId),
              children: account.label
            }
          ),
          /* @__PURE__ */ jsxs12("span", { className: "config-account-meta", children: [
            /* @__PURE__ */ jsxs12("span", { children: [
              account.providerId,
              " · ",
              account.model
            ] }),
            /* @__PURE__ */ jsx13("span", { className: "config-account-status", "data-tone": account.enabled ? "success" : "neutral", children: account.enabled ? t("accounts.enabled") : t("accounts.disabled") }),
            isDefault && /* @__PURE__ */ jsx13("span", { className: "config-account-status", "data-tone": "brand", children: t("accounts.defaultBadge") })
          ] }),
          /* @__PURE__ */ jsxs12("div", { className: "config-account-actions", children: [
            /* @__PURE__ */ jsx13(
              "button",
              {
                type: "button",
                "aria-label": t("accounts.editAria", { label: account.label }),
                disabled,
                onClick: () => onEdit(account.accountId),
                children: t("accounts.edit")
              }
            ),
            actions.map(([action, label]) => {
              if (action === "default" && (!account.enabled || isDefault)) return null;
              if ((action === "disable" || action === "remove") && isDefault && canTransferDefault) return null;
              return /* @__PURE__ */ jsx13(
                "button",
                {
                  type: "button",
                  "aria-label": `${label} ${account.label}`,
                  disabled,
                  onClick: () => onAction(account, action),
                  children: label
                },
                action
              );
            }),
            removingId === account.accountId && /* @__PURE__ */ jsx13("button", { type: "button", disabled, onClick: onCancelRemove, children: t("accounts.cancelRemove") })
          ] })
        ]
      },
      account.accountId
    );
  });
}

// ../web-ui/src/settings-computer-use.tsx
import { jsx as jsx14, jsxs as jsxs13 } from "react/jsx-runtime";
function SettingsComputerUse({
  view,
  actions,
  text
}) {
  const label = (key, fallback) => text?.(key) ?? fallback;
  return /* @__PURE__ */ jsxs13(
    "section",
    {
      id: "computer-use-settings-pane",
      className: "settings-content",
      "data-agnes-region": "settings-pane",
      hidden: true,
      children: [
        /* @__PURE__ */ jsxs13("header", { className: "config-heading", children: [
          /* @__PURE__ */ jsxs13("div", { children: [
            /* @__PURE__ */ jsx14("h2", { children: "Computer Use" }),
            /* @__PURE__ */ jsx14("p", { children: label(
              "computerUse.intro",
              "Let Agnes see the screen and operate apps. This needs a model that accepts images."
            ) })
          ] }),
          /* @__PURE__ */ jsx14(
            Button,
            {
              id: "computer-use-refresh",
              className: "secondary-button compact",
              htmlType: "button",
              disabled: view.controls.refreshDisabled,
              onClick: () => void actions.refresh(),
              children: label("computerUse.action.refresh", "Refresh status")
            }
          )
        ] }),
        /* @__PURE__ */ jsxs13("div", { className: "config-workspace", children: [
          /* @__PURE__ */ jsxs13("section", { className: "config-card", "aria-labelledby": "computer-use-state", children: [
            /* @__PURE__ */ jsx14("p", { className: "eyebrow", children: label("computerUse.status.eyebrow", "Status") }),
            /* @__PURE__ */ jsx14("strong", { id: "computer-use-state", role: "status", children: view.status.label }),
            /* @__PURE__ */ jsx14("p", { id: "computer-use-summary", children: view.status.summary }),
            /* @__PURE__ */ jsx14("p", { id: "computer-use-runtime", children: view.status.runtime }),
            /* @__PURE__ */ jsx14("ul", { id: "computer-use-blockers", children: view.status.blockers.map((text2) => /* @__PURE__ */ jsx14("li", { children: text2 }, text2)) })
          ] }),
          /* @__PURE__ */ jsxs13("section", { className: "config-card", "aria-labelledby": "computer-use-permission-state", children: [
            /* @__PURE__ */ jsx14("p", { className: "eyebrow", children: label("computerUse.permissions.eyebrow", "System permissions") }),
            /* @__PURE__ */ jsx14("strong", { id: "computer-use-permission-state", children: view.permissions.label }),
            /* @__PURE__ */ jsx14("p", { id: "computer-use-permission-summary", children: view.permissions.summary }),
            /* @__PURE__ */ jsx14(
              Button,
              {
                id: "computer-use-permission-grant",
                className: "primary-button compact",
                htmlType: "button",
                hidden: view.permissions.grantHidden,
                disabled: view.controls.grantDisabled,
                onClick: () => void actions.grantPermissions(),
                children: label("computerUse.permissions.grant", "Open macOS authorization")
              }
            )
          ] }),
          /* @__PURE__ */ jsxs13("section", { className: "config-card", "aria-labelledby": "computer-use-doctor-state", children: [
            /* @__PURE__ */ jsx14("p", { className: "eyebrow", children: label("computerUse.doctor.eyebrow", "Driver diagnostics") }),
            /* @__PURE__ */ jsx14("strong", { id: "computer-use-doctor-state", children: view.doctor.label }),
            /* @__PURE__ */ jsx14("p", { id: "computer-use-doctor-summary", children: view.doctor.summary }),
            /* @__PURE__ */ jsx14(
              Button,
              {
                id: "computer-use-doctor-run",
                className: "secondary-button compact",
                htmlType: "button",
                disabled: view.controls.doctorDisabled,
                onClick: () => void actions.doctor(),
                children: label("computerUse.doctor.run", "Run diagnostics")
              }
            )
          ] }),
          /* @__PURE__ */ jsxs13("section", { className: "config-card", "aria-labelledby": "computer-use-operation-state", children: [
            /* @__PURE__ */ jsx14("p", { className: "eyebrow", children: label("computerUse.operation.eyebrow", "Install and maintenance") }),
            /* @__PURE__ */ jsx14("strong", { id: "computer-use-operation-state", children: view.operation.label }),
            /* @__PURE__ */ jsx14("p", { id: "computer-use-operation-summary", children: view.operation.summary }),
            /* @__PURE__ */ jsxs13("div", { className: "config-actions", children: [
              /* @__PURE__ */ jsx14(
                Button,
                {
                  id: "computer-use-install",
                  className: "secondary-button compact",
                  htmlType: "button",
                  disabled: view.controls.installDisabled,
                  onClick: () => void actions.install(),
                  children: label("computerUse.action.install", "Prepare driver")
                }
              ),
              /* @__PURE__ */ jsx14(
                Button,
                {
                  id: "computer-use-update",
                  className: "secondary-button compact",
                  htmlType: "button",
                  disabled: view.controls.updateDisabled,
                  onClick: () => void actions.update(),
                  children: label("computerUse.action.update", "Update driver")
                }
              ),
              /* @__PURE__ */ jsx14(
                Button,
                {
                  id: "computer-use-restart",
                  className: "secondary-button compact",
                  htmlType: "button",
                  disabled: view.controls.restartDisabled,
                  onClick: () => void actions.restart(),
                  children: label("computerUse.action.restart", "Restart driver")
                }
              ),
              /* @__PURE__ */ jsx14(
                Button,
                {
                  id: "computer-use-operation-refresh",
                  className: "secondary-button compact",
                  htmlType: "button",
                  disabled: view.controls.operationRefreshDisabled,
                  onClick: () => void actions.refreshOperation(),
                  children: label("computerUse.action.operationRefresh", "Refresh progress")
                }
              ),
              /* @__PURE__ */ jsx14(
                Button,
                {
                  id: "computer-use-operation-cancel",
                  className: "secondary-button compact",
                  htmlType: "button",
                  hidden: view.controls.cancelHidden,
                  disabled: view.controls.cancelDisabled,
                  onClick: () => void actions.cancelOperation(),
                  children: label("computerUse.action.cancel", "Cancel operation")
                }
              )
            ] })
          ] })
        ] })
      ]
    }
  );
}

// ../web-ui/src/settings-model-pane.tsx
import { jsx as jsx15, jsxs as jsxs14 } from "react/jsx-runtime";
function SettingsModelPane({
  beforeAccounts,
  afterAccounts,
  t = fallbackT
}) {
  return /* @__PURE__ */ jsxs14("section", { id: "model-settings-pane", className: "settings-content", "data-agnes-region": "settings-pane", children: [
    /* @__PURE__ */ jsx15("header", { className: "config-heading", children: /* @__PURE__ */ jsxs14("div", { children: [
      /* @__PURE__ */ jsx15("p", { className: "eyebrow", children: t("settings-shell.modelKicker") }),
      /* @__PURE__ */ jsx15("h2", { id: "config-title", children: t("settings-shell.modelTitle") }),
      /* @__PURE__ */ jsx15("p", { children: t("settings-shell.modelIntro") })
    ] }) }),
    /* @__PURE__ */ jsxs14("div", { className: "config-workspace", children: [
      beforeAccounts,
      /* @__PURE__ */ jsxs14(
        "section",
        {
          className: "config-accounts-section config-card",
          "aria-label": t("settings-shell.accountsAria"),
          children: [
            /* @__PURE__ */ jsxs14("div", { className: "config-accounts-heading", children: [
              /* @__PURE__ */ jsxs14("div", { children: [
                /* @__PURE__ */ jsx15("h3", { children: t("settings-shell.accountsTitle") }),
                /* @__PURE__ */ jsx15("p", { children: t("settings-shell.accountsIntro") })
              ] }),
              /* @__PURE__ */ jsxs14(Button, { id: "config-add-account", className: "secondary-button compact", htmlType: "button", children: [
                /* @__PURE__ */ jsx15("svg", { className: "icon", "data-agnes-region": "icon", viewBox: "0 0 24 24", "aria-hidden": "true", children: /* @__PURE__ */ jsx15("path", { d: "M12 5v14M5 12h14" }) }),
                /* @__PURE__ */ jsx15("span", { children: t("settings-shell.addAccount") })
              ] })
            ] }),
            /* @__PURE__ */ jsx15("div", { id: "config-accounts" }),
            /* @__PURE__ */ jsx15("p", { className: "config-list-note", children: t("settings-shell.accountsNote") })
          ]
        }
      ),
      afterAccounts
    ] })
  ] });
}

// ../web-ui/src/ui/dialog.tsx
import { Modal as AntModal } from "antd";
import { jsx as jsx16 } from "react/jsx-runtime";

// ../web-ui/src/ui/select.tsx
import { Select as AntSelect } from "antd";
import { jsx as jsx17 } from "react/jsx-runtime";

// ../web-ui/src/ui/switch.tsx
import { Switch as AntSwitch } from "antd";
import { jsx as jsx18 } from "react/jsx-runtime";

// ../web-ui/src/ui/tabs.tsx
import { Tabs as AntTabs } from "antd";
import { jsx as jsx19 } from "react/jsx-runtime";

// ../web-ui/src/ui/tooltip.tsx
import { Tooltip as AntTooltip } from "antd";
import { jsx as jsx20 } from "react/jsx-runtime";
function Tooltip({ rootClassName, ...props }) {
  const classes = ["agnes-ui-tooltip", rootClassName].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx20(AntTooltip, { ...props, rootClassName: classes });
}

export {
  describeValidationErrors,
  validateAgainst,
  ToolCall,
  ToolResult,
  META_KEY,
  MAX_FRAME_BYTES,
  UI_OPENING_DEFAULT_MAX_NODES,
  UI_HISTORY_DEFAULT_LIMIT,
  UI_PROJECTION_DEFAULT_MAX_BYTES,
  UI_PROJECTION_MAX_BYTES,
  AGNES_ERRORS,
  JSONRPC_ERRORS,
  rpcError,
  USER_MESSAGE_IMAGE_LIMITS,
  SafeImageError,
  decodeAttachmentData,
  decodeSafeImageBytes,
  decodeSafeImages,
  USER_MESSAGE_ATTACHMENT_LIMITS,
  AttachmentValidationError,
  validateUserAttachments,
  userImagePolicy,
  modelImageInputError,
  validateEvent,
  readSessionTitle,
  toAcpPrompt,
  toAcpOptionKind,
  toAcpStopReason,
  jcs,
  Cursor,
  SessionSteerParams,
  SessionSendNowParams,
  SessionRemoveQueuedParams,
  SessionCompactParams,
  SessionForkParams,
  getHarnessMeta,
  projectClientModuleRows,
  validatePackageAdminData,
  validatePackageAdminCall,
  RESOURCE_CONTROL_METHODS,
  METHODS,
  validateMethod,
  minimumContextBudget,
  ADMIN_LOCALE_NAMESPACE,
  adminLocaleCatalog,
  createDocumentLocaleSource,
  UiLocaleProvider,
  createUiTranslator,
  createCatalogTranslator,
  hasPermission,
  sourceLabel,
  contributionText,
  integrityLabel,
  operationLabel,
  terminal,
  blockerText,
  ADMIN_CONFIRMATION_LOCALE_NAMESPACE,
  adminConfirmationLocaleCatalog,
  PreviewConfirmationFacts,
  TrustConfirmationFacts,
  UpdateActivationFacts,
  RollbackActivationFacts,
  ADMIN_DETAIL_LOCALE_NAMESPACE,
  adminDetailLocaleCatalog,
  DetailContent,
  ADMIN_DIALOGS_LOCALE_NAMESPACE,
  adminDialogsLocaleCatalog,
  SourceDialogContent,
  ConfirmDialogContent,
  ADMIN_LIST_LOCALE_NAMESPACE,
  adminListLocaleCatalog,
  OrphanPins,
  PluginList,
  createAntdRoot,
  WEB_UI_LOCALE_NAMESPACE,
  webUiLocaleCatalog,
  createConfirmController,
  DiagnosticsDialogView,
  RESOURCE_DETAIL_LOCALE_NAMESPACE,
  resourceDetailLocaleCatalog,
  RESOURCE_LIST_LOCALE_NAMESPACE,
  resourceListLocaleCatalog,
  modelThinkingOptions,
  parseContextBudget,
  contextBudgetPresets,
  contextBudgetLabel,
  positionPopover,
  positionSubmenu,
  bindListboxKeys,
  mountRegion,
  renderRegion,
  createRegionHost,
  unmountRegion,
  SkillDetailContent,
  McpDetailContent,
  ResourceListContent,
  resourceDesiredEnabled,
  createSelectPicker,
  setSettingsSelectOptions,
  Button,
  Field,
  SettingsAccountDialog,
  SettingsAccounts,
  SettingsComputerUse,
  SettingsModelPane,
  NotificationHost,
  Tooltip
};
