import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/ole-header.js
var require_ole_header = __commonJS({
  "../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/ole-header.js"(exports, module) {
    var HEADER_DATA = Buffer.from("D0CF11E0A1B11AE1", "hex");
    var Header = class {
      constructor() {
      }
      load(buffer) {
        for (let i = 0; i < HEADER_DATA.length; i++) {
          if (HEADER_DATA[i] != buffer[i])
            return false;
        }
        this.secSize = 1 << buffer.readInt16LE(30);
        this.shortSecSize = 1 << buffer.readInt16LE(32);
        this.SATSize = buffer.readInt32LE(44);
        this.dirSecId = buffer.readInt32LE(48);
        this.shortStreamMax = buffer.readInt32LE(56);
        this.SSATSecId = buffer.readInt32LE(60);
        this.SSATSize = buffer.readInt32LE(64);
        this.MSATSecId = buffer.readInt32LE(68);
        this.MSATSize = buffer.readInt32LE(72);
        this.partialMSAT = new Array(109);
        for (let i = 0; i < 109; i++)
          this.partialMSAT[i] = buffer.readInt32LE(76 + i * 4);
        return true;
      }
    };
    module.exports = Header;
  }
});

// ../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/ole-allocation-table.js
var require_ole_allocation_table = __commonJS({
  "../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/ole-allocation-table.js"(exports, module) {
    var ALLOCATION_TABLE_SEC_ID_FREE = -1;
    var AllocationTable = class {
      constructor(doc) {
        this._doc = doc;
      }
      load(secIds) {
        const doc = this._doc;
        const header = doc._header;
        this._table = new Array(secIds.length * (header.secSize / 4));
        return doc._readSectors(secIds).then((buffer) => {
          for (let i = 0; i < buffer.length / 4; i++) {
            this._table[i] = buffer.readInt32LE(i * 4);
          }
        });
      }
      getSecIdChain(startSecId) {
        let secId = startSecId;
        const secIds = [];
        while (secId > ALLOCATION_TABLE_SEC_ID_FREE) {
          secIds.push(secId);
          const secIdPrior = secId;
          secId = this._table[secId];
          if (secId === secIdPrior) {
            break;
          }
        }
        return secIds;
      }
    };
    module.exports = AllocationTable;
  }
});

// ../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/ole-directory-tree.js
var require_ole_directory_tree = __commonJS({
  "../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/ole-directory-tree.js"(exports, module) {
    var DIRECTORY_TREE_ENTRY_TYPE_STORAGE = 1;
    var DIRECTORY_TREE_ENTRY_TYPE_STREAM = 2;
    var DIRECTORY_TREE_ENTRY_TYPE_ROOT = 5;
    var DIRECTORY_TREE_LEAF = -1;
    var DirectoryTree = class {
      constructor(doc) {
        this._doc = doc;
      }
      load(secIds) {
        const doc = this._doc;
        return doc._readSectors(secIds).then((buffer) => {
          const count = buffer.length / 128;
          this._entries = new Array(count);
          for (let i = 0; i < count; i++) {
            const offset = i * 128;
            const nameLength = Math.max(buffer.readInt16LE(64 + offset) - 1, 0);
            const entry = {};
            entry.name = buffer.toString("utf16le", 0 + offset, nameLength + offset);
            entry.type = buffer.readInt8(66 + offset);
            entry.nodeColor = buffer.readInt8(67 + offset);
            entry.left = buffer.readInt32LE(68 + offset);
            entry.right = buffer.readInt32LE(72 + offset);
            entry.storageDirId = buffer.readInt32LE(76 + offset);
            entry.secId = buffer.readInt32LE(116 + offset);
            entry.size = buffer.readInt32LE(120 + offset);
            this._entries[i] = entry;
          }
          this.root = this._entries.find((entry) => entry.type === DIRECTORY_TREE_ENTRY_TYPE_ROOT);
          this._buildHierarchy(this.root);
        });
      }
      _buildHierarchy(storageEntry) {
        const childIds = this._getChildIds(storageEntry);
        storageEntry.storages = {};
        storageEntry.streams = {};
        for (const childId of childIds) {
          const childEntry = this._entries[childId];
          const name = childEntry.name;
          if (childEntry.type === DIRECTORY_TREE_ENTRY_TYPE_STORAGE) {
            storageEntry.storages[name] = childEntry;
          }
          if (childEntry.type === DIRECTORY_TREE_ENTRY_TYPE_STREAM) {
            storageEntry.streams[name] = childEntry;
          }
        }
        for (const name in storageEntry.storages) {
          this._buildHierarchy(storageEntry.storages[name]);
        }
      }
      _getChildIds(storageEntry) {
        const childIds = [];
        const visit = (visitEntry) => {
          if (visitEntry.left !== DIRECTORY_TREE_LEAF) {
            childIds.push(visitEntry.left);
            visit(this._entries[visitEntry.left]);
          }
          if (visitEntry.right !== DIRECTORY_TREE_LEAF) {
            childIds.push(visitEntry.right);
            visit(this._entries[visitEntry.right]);
          }
        };
        if (storageEntry.storageDirId > -1) {
          childIds.push(storageEntry.storageDirId);
          const rootChildEntry = this._entries[storageEntry.storageDirId];
          visit(rootChildEntry);
        }
        return childIds;
      }
    };
    module.exports = DirectoryTree;
  }
});

// ../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/ole-storage-stream.js
var require_ole_storage_stream = __commonJS({
  "../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/ole-storage-stream.js"(exports, module) {
    var { Readable } = __require("stream");
    var StorageStream = class extends Readable {
      constructor(doc, streamEntry) {
        super();
        this._doc = doc;
        this._streamEntry = streamEntry;
        this.initialize();
      }
      initialize() {
        this._index = 0;
        this._done = true;
        if (!this._streamEntry) {
          return;
        }
        const doc = this._doc;
        this._bytes = this._streamEntry.size;
        this._allocationTable = doc._SAT;
        this._shortStream = false;
        if (this._bytes < doc._header.shortStreamMax) {
          this._shortStream = true;
          this._allocationTable = doc._SSAT;
        }
        this._secIds = this._allocationTable.getSecIdChain(this._streamEntry.secId);
        this._done = false;
      }
      _readSector(sector) {
        if (this._shortStream) {
          return this._doc._readShortSector(sector);
        } else {
          return this._doc._readSector(sector);
        }
      }
      _read() {
        if (this._done) {
          return this.push(null);
        }
        if (this._index >= this._secIds.length) {
          this._done = true;
          return this.push(null);
        }
        return this._readSector(this._secIds[this._index]).then((buffer) => {
          if (this._bytes - buffer.length < 0) {
            buffer = buffer.slice(0, this._bytes);
          }
          this._bytes -= buffer.length;
          this._index++;
          this.push(buffer);
        });
      }
    };
    module.exports = StorageStream;
  }
});

// ../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/ole-storage.js
var require_ole_storage = __commonJS({
  "../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/ole-storage.js"(exports, module) {
    var StorageStream = require_ole_storage_stream();
    var Storage = class _Storage {
      constructor(doc, dirEntry) {
        this._doc = doc;
        this._dirEntry = dirEntry;
      }
      storage(storageName) {
        return new _Storage(this._doc, this._dirEntry.storages[storageName]);
      }
      stream(streamName) {
        return new StorageStream(this._doc, this._dirEntry.streams[streamName]);
      }
    };
    module.exports = Storage;
  }
});

// ../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/ole-compound-doc.js
var require_ole_compound_doc = __commonJS({
  "../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/ole-compound-doc.js"(exports, module) {
    var Header = require_ole_header();
    var AllocationTable = require_ole_allocation_table();
    var DirectoryTree = require_ole_directory_tree();
    var Storage = require_ole_storage();
    var OleCompoundDoc = class {
      constructor(reader) {
        this._reader = reader;
        this._skipBytes = 0;
      }
      read() {
        return Promise.resolve().then(() => this._readHeader()).then(() => this._readMSAT()).then(() => this._readSAT()).then(() => this._readSSAT()).then(() => this._readDirectoryTree()).then(() => {
          if (this._skipBytes != 0) {
            return this._readCustomHeader();
          }
        }).then(() => this);
      }
      _readCustomHeader() {
        const buffer = Buffer.alloc(this._skipBytes);
        return this._reader.read(buffer, 0, this._skipBytes, 0).then((buffer2) => {
          if (!this._customHeaderCallback(buffer2))
            return;
        });
      }
      _readHeader() {
        const buffer = Buffer.alloc(512);
        return this._reader.read(buffer, 0, 512, 0 + this._skipBytes).then((buffer2) => {
          const header = this._header = new Header();
          if (!header.load(buffer2)) {
            throw new Error("Not a valid compound document");
          }
        });
      }
      _readMSAT() {
        const header = this._header;
        this._MSAT = header.partialMSAT.slice(0);
        this._MSAT.length = header.SATSize;
        if (header.SATSize <= 109 || header.MSATSize == 0) {
          return Promise.resolve();
        }
        let currMSATIndex = 109;
        let i = 0;
        const readOneMSAT = (i2, currMSATIndex2, secId) => {
          if (i2 >= header.MSATSize) {
            return Promise.resolve();
          }
          return this._readSector(secId).then((sectorBuffer) => {
            let s;
            for (s = 0; s < header.secSize - 4; s += 4) {
              if (currMSATIndex2 >= header.SATSize)
                break;
              else
                this._MSAT[currMSATIndex2] = sectorBuffer.readInt32LE(s);
              currMSATIndex2++;
            }
            secId = sectorBuffer.readInt32LE(header.secSize - 4);
            return readOneMSAT(i2 + 1, currMSATIndex2, secId);
          });
        };
        return readOneMSAT(i, currMSATIndex, header.MSATSecId);
      }
      _readSector(secId) {
        return this._readSectors([secId]);
      }
      _readSectors(secIds) {
        const header = this._header;
        const buffer = Buffer.alloc(secIds.length * header.secSize);
        const readOneSector = (i) => {
          if (i >= secIds.length) {
            return Promise.resolve(buffer);
          }
          const bufferOffset = i * header.secSize;
          const fileOffset = this._getFileOffsetForSec(secIds[i]);
          return this._reader.read(buffer, bufferOffset, header.secSize, fileOffset).then(() => readOneSector(i + 1));
        };
        return readOneSector(0);
      }
      _readShortSector(secId) {
        return this._readShortSectors([secId]);
      }
      _readShortSectors(secIds) {
        const header = this._header;
        const buffer = Buffer.alloc(secIds.length * header.shortSecSize);
        const readOneShortSector = (i) => {
          if (i >= secIds.length) {
            return Promise.resolve(buffer);
          }
          const bufferOffset = i * header.shortSecSize;
          const fileOffset = this._getFileOffsetForShortSec(secIds[i]);
          return this._reader.read(buffer, bufferOffset, header.shortSecSize, fileOffset).then(() => readOneShortSector(i + 1));
        };
        return readOneShortSector(0);
      }
      _readSAT() {
        this._SAT = new AllocationTable(this);
        return this._SAT.load(this._MSAT);
      }
      _readSSAT() {
        const header = this._header;
        const secIds = this._SAT.getSecIdChain(header.SSATSecId);
        if (secIds.length != header.SSATSize) {
          return Promise.reject(new Error("Invalid Short Sector Allocation Table"));
        }
        this._SSAT = new AllocationTable(this);
        return this._SSAT.load(secIds);
      }
      _readDirectoryTree() {
        const header = this._header;
        this._directoryTree = new DirectoryTree(this);
        const secIds = this._SAT.getSecIdChain(header.dirSecId);
        return this._directoryTree.load(secIds).then(() => {
          const rootEntry = this._directoryTree.root;
          this._rootStorage = new Storage(this, rootEntry);
          this._shortStreamSecIds = this._SAT.getSecIdChain(rootEntry.secId);
        });
      }
      _getFileOffsetForSec(secId) {
        const secSize = this._header.secSize;
        return this._skipBytes + (secId + 1) * secSize;
      }
      _getFileOffsetForShortSec(shortSecId) {
        const shortSecSize = this._header.shortSecSize;
        const shortStreamOffset = shortSecId * shortSecSize;
        const secSize = this._header.secSize;
        const secIdIndex = Math.floor(shortStreamOffset / secSize);
        const secOffset = shortStreamOffset % secSize;
        const secId = this._shortStreamSecIds[secIdIndex];
        return this._getFileOffsetForSec(secId) + secOffset;
      }
      storage(storageName) {
        return this._rootStorage.storage(storageName);
      }
      stream(streamName) {
        return this._rootStorage.stream(streamName);
      }
    };
    module.exports = OleCompoundDoc;
  }
});

// ../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/filters.js
var require_filters = __commonJS({
  "../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/filters.js"(exports, module) {
    var replaceTable = [];
    replaceTable[2] = "\0";
    replaceTable[5] = "\0";
    replaceTable[7] = "	";
    replaceTable[8] = "\0";
    replaceTable[10] = "\n";
    replaceTable[11] = "\n";
    replaceTable[12] = "\n";
    replaceTable[13] = "\n";
    replaceTable[30] = "\u2011";
    var binaryToUnicodeTable = [];
    binaryToUnicodeTable[130] = "\u201A";
    binaryToUnicodeTable[131] = "\u0192";
    binaryToUnicodeTable[132] = "\u201E";
    binaryToUnicodeTable[133] = "\u2026";
    binaryToUnicodeTable[134] = "\u2020";
    binaryToUnicodeTable[135] = "\u2021";
    binaryToUnicodeTable[136] = "\u02C6";
    binaryToUnicodeTable[137] = "\u2030";
    binaryToUnicodeTable[138] = "\u0160";
    binaryToUnicodeTable[139] = "\u2039";
    binaryToUnicodeTable[140] = "\u0152";
    binaryToUnicodeTable[142] = "\u017D";
    binaryToUnicodeTable[145] = "\u2018";
    binaryToUnicodeTable[146] = "\u2019";
    binaryToUnicodeTable[147] = "\u201C";
    binaryToUnicodeTable[148] = "\u201D";
    binaryToUnicodeTable[149] = "\u2022";
    binaryToUnicodeTable[150] = "\u2013";
    binaryToUnicodeTable[151] = "\u2014";
    binaryToUnicodeTable[152] = "\u02DC";
    binaryToUnicodeTable[153] = "\u2122";
    binaryToUnicodeTable[154] = "\u0161";
    binaryToUnicodeTable[155] = "\u203A";
    binaryToUnicodeTable[156] = "\u0153";
    binaryToUnicodeTable[158] = "\u017E";
    binaryToUnicodeTable[159] = "\u0178";
    module.exports.binaryToUnicode = (string) => {
      return string.replace(/([\x80-\x9f])/g, (match) => binaryToUnicodeTable[match.charCodeAt(0)]);
    };
    module.exports.clean = (string) => {
      string = string.replace(/([\x02\x05\x07\x08\x0a\x0b\x0c\x0d\x1f])/g, (match) => replaceTable[match.charCodeAt(0)]);
      let called = true;
      while (called) {
        called = false;
        string = string.replace(/(?:\x13[^\x13\x14\x15]*\x14?([^\x13\x14\x15]*)\x15)/g, (match, p1) => {
          called = true;
          return p1;
        });
      }
      return string.replace(/[\x00-\x07]/g, "");
    };
    var filterTable = [];
    filterTable[8194] = " ";
    filterTable[8195] = " ";
    filterTable[8210] = "-";
    filterTable[8211] = "-";
    filterTable[8212] = "-";
    filterTable[8216] = "'";
    filterTable[8217] = "'";
    filterTable[8220] = '"';
    filterTable[8221] = '"';
    module.exports.filter = (string) => {
      return string.replace(/[\u2002\u2003\u2012\u2013\u2014\u2018\u2019\u201c\u201d]/g, (match) => filterTable[match.charCodeAt(0)]);
    };
  }
});

// ../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/document.js
var require_document = __commonJS({
  "../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/document.js"(exports, module) {
    var { filter } = require_filters();
    var Document = class {
      constructor() {
        this._body = "";
        this._footnotes = "";
        this._endnotes = "";
        this._headers = "";
        this._footers = "";
        this._annotations = "";
        this._textboxes = "";
        this._headerTextboxes = "";
      }
      /**
       * Accessor to read the main body part of a Word file
       * @param {Object} options - options for body data
       * @param {boolean} options.filterUnicode - if true (the default), converts common Unicode quotes
       *   to standard ASCII characters 
       * @returns a string, containing the Word file body
       */
      getBody(options2) {
        options2 = options2 || {};
        const value = this._body;
        return options2.filterUnicode == false ? value : filter(value);
      }
      /**
       * Accessor to read the footnotes part of a Word file
       * @param {Object} options - options for body data
       * @param {boolean} options.filterUnicode - if true (the default), converts common Unicode quotes
       *   to standard ASCII characters 
       * @returns a string, containing the Word file footnotes
       */
      getFootnotes(options2) {
        options2 = options2 || {};
        const value = this._footnotes;
        return options2.filterUnicode == false ? value : filter(value);
      }
      /**
       * Accessor to read the endnotes part of a Word file
       * @param {Object} options - options for body data
       * @param {boolean} options.filterUnicode - if true (the default), converts common Unicode quotes
       *   to standard ASCII characters 
       * @returns a string, containing the Word file endnotes
       */
      getEndnotes(options2) {
        options2 = options2 || {};
        const value = this._endnotes;
        return options2.filterUnicode == false ? value : filter(value);
      }
      /**
       * Accessor to read the headers part of a Word file
       * @param {Object} options - options for body data
       * @param {boolean} options.filterUnicode - if true (the default), converts common Unicode quotes
       *   to standard ASCII characters 
       * @param {boolean} options.includeFooters - if true (the default), returns headers and footers 
       *   as a single string
       * @returns a string, containing the Word file headers
       */
      getHeaders(options2) {
        options2 = options2 || {};
        const value = this._headers + (options2.includeFooters == false ? "" : this._footers);
        return options2.filterUnicode == false ? value : filter(value);
      }
      /**
       * Accessor to read the footers part of a Word file
       * @param {Object} options - options for body data
       * @param {boolean} options.filterUnicode - if true (the default), converts common Unicode quotes
       *   to standard ASCII characters 
       * @returns a string, containing the Word file footers
       */
      getFooters(options2) {
        options2 = options2 || {};
        const value = this._footers;
        return options2.filterUnicode == false ? value : filter(value);
      }
      /**
       * Accessor to read the annotations part of a Word file
       * @param {Object} options - options for body data
       * @param {boolean} options.filterUnicode - if true (the default), converts common Unicode quotes
       *   to standard ASCII characters 
       * @returns a string, containing the Word file annotations
       */
      getAnnotations(options2) {
        options2 = options2 || {};
        const value = this._annotations;
        return options2.filterUnicode == false ? value : filter(value);
      }
      /**
       * Accessor to read the textboxes from a Word file. The text box content is aggregated as a 
       * single long string. When both the body and header content exists, they will be separated
       * by a newline.
       * @param {Object} options - options for body data
       * @param {boolean} options.filterUnicode - if true (the default), converts common Unicode quotes
       *   to standard ASCII characters 
       * @param {boolean} options.includeHeadersAndFooters - if true (the default), includes text box
       *   content in headers and footers
       * @param {boolean} options.includeBody - if true (the default), includes text box
       *   content in the document body
       * @returns a string, containing the Word file text box content
       */
      getTextboxes(options2) {
        options2 = options2 || {};
        const segments = [];
        if (options2.includeBody != false)
          segments.push(this._textboxes);
        if (options2.includeHeadersAndFooters != false)
          segments.push(this._headerTextboxes);
        const value = segments.join("\n");
        return options2.filterUnicode == false ? value : filter(value);
      }
    };
    module.exports = Document;
  }
});

// ../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/word-ole-extractor.js
var require_word_ole_extractor = __commonJS({
  "../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/word-ole-extractor.js"(exports, module) {
    var OleCompoundDoc = require_ole_compound_doc();
    var Document = require_document();
    var { binaryToUnicode, clean } = require_filters();
    var sprmCFRMarkDel = 0;
    var getPieceIndexByCP = (pieces, position) => {
      for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i];
        if (position <= piece.endCp) {
          return i;
        }
      }
    };
    var getPieceIndexByFilePos = (pieces, position) => {
      for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i];
        if (position <= piece.endFilePos) {
          return i;
        }
      }
    };
    function getTextRangeByCP(pieces, start, end) {
      const startPiece = getPieceIndexByCP(pieces, start);
      const endPiece = getPieceIndexByCP(pieces, end);
      const result = [];
      for (let i = startPiece, end1 = endPiece; i <= end1; i++) {
        const piece = pieces[i];
        const xstart = i === startPiece ? start - piece.startCp : 0;
        const xend = i === endPiece ? end - piece.startCp : piece.endCp;
        result.push(piece.text.substring(xstart, xend));
      }
      return result.join("");
    }
    function fillPieceRange(piece, start, end, character) {
      const pieceStart = piece.startCp;
      const pieceEnd = pieceStart + piece.length;
      const original = piece.text;
      if (start < pieceStart) start = pieceStart;
      if (end > pieceEnd) end = pieceEnd;
      const modified = (start == pieceStart ? "" : original.slice(0, start - pieceStart)) + "".padStart(end - start, character) + (end == pieceEnd ? "" : original.slice(end - pieceEnd));
      piece.text = modified;
    }
    function fillPieceRangeByFilePos(piece, start, end, character) {
      const pieceStart = piece.startFilePos;
      const pieceEnd = pieceStart + piece.size;
      const original = piece.text;
      if (start < pieceStart) start = pieceStart;
      if (end > pieceEnd) end = pieceEnd;
      const modified = (start == pieceStart ? "" : original.slice(0, (start - pieceStart) / piece.bpc)) + "".padStart((end - start) / piece.bpc, character) + (end == pieceEnd ? "" : original.slice((end - pieceEnd) / piece.bpc));
      piece.text = modified;
    }
    function replaceSelectedRange(pieces, start, end, character) {
      const startPiece = getPieceIndexByCP(pieces, start);
      const endPiece = getPieceIndexByCP(pieces, end);
      for (let i = startPiece, end1 = endPiece; i <= end1; i++) {
        const piece = pieces[i];
        fillPieceRange(piece, start, end, character);
      }
    }
    function replaceSelectedRangeByFilePos(pieces, start, end, character) {
      const startPiece = getPieceIndexByFilePos(pieces, start);
      const endPiece = getPieceIndexByFilePos(pieces, end);
      for (let i = startPiece, end1 = endPiece; i <= end1; i++) {
        const piece = pieces[i];
        fillPieceRangeByFilePos(piece, start, end, character);
      }
    }
    function markDeletedRange(pieces, start, end) {
      replaceSelectedRangeByFilePos(pieces, start, end, "\0");
    }
    var processSprms = (buffer, offset, handler) => {
      while (offset < buffer.length - 1) {
        const sprm = buffer.readUInt16LE(offset);
        const ispmd = sprm & 31;
        const fspec = sprm >> 9 & 1;
        const sgc = sprm >> 10 & 7;
        const spra = sprm >> 13 & 7;
        offset += 2;
        handler(buffer, offset, sprm, ispmd, fspec, sgc, spra);
        if (spra === 0) {
          offset += 1;
          continue;
        } else if (spra === 1) {
          offset += 1;
          continue;
        } else if (spra === 2) {
          offset += 2;
          continue;
        } else if (spra === 3) {
          offset += 4;
          continue;
        } else if (spra === 4 || spra === 5) {
          offset += 2;
          continue;
        } else if (spra === 6) {
          offset += buffer.readUInt8(offset) + 1;
          continue;
        } else if (spra === 7) {
          offset += 3;
          continue;
        } else {
          throw new Error("Unparsed sprm");
        }
      }
    };
    var WordOleExtractor = class {
      constructor() {
        this._pieces = [];
        this._bookmarks = {};
        this._boundaries = {};
        this._taggedHeaders = [];
      }
      /**
       * The main extraction method. This creates an OLE compound document
       * interface, then opens up a stream and extracts out the main
       * stream.
       * @param {*} reader 
       */
      extract(reader) {
        const document2 = new OleCompoundDoc(reader);
        return document2.read().then(
          () => this.documentStream(document2, "WordDocument").then((stream) => this.streamBuffer(stream)).then((buffer) => this.extractWordDocument(document2, buffer))
        );
      }
      /**
       * Builds and returns a {@link Document} object corresponding to the text
       * in the original document. This involves reading and retrieving the text
       * ranges corresponding to the primary document parts. The text segments are
       * read from the extracted table of text pieces.
       * @returns a {@link Document} object
       */
      buildDocument() {
        const document2 = new Document();
        const pieces = this._pieces;
        let start = 0;
        document2._body = clean(getTextRangeByCP(pieces, start, start + this._boundaries.ccpText));
        start += this._boundaries.ccpText;
        if (this._boundaries.ccpFtn) {
          document2._footnotes = clean(getTextRangeByCP(pieces, start, start + this._boundaries.ccpFtn - 1));
          start += this._boundaries.ccpFtn;
        }
        if (this._boundaries.ccpHdd) {
          document2._headers = clean(this._taggedHeaders.filter((s) => s.type === "headers").map((s) => s.text).join(""));
          document2._footers = clean(this._taggedHeaders.filter((s) => s.type === "footers").map((s) => s.text).join(""));
          start += this._boundaries.ccpHdd;
        }
        if (this._boundaries.ccpAtn) {
          document2._annotations = clean(getTextRangeByCP(pieces, start, start + this._boundaries.ccpAtn - 1));
          start += this._boundaries.ccpAtn;
        }
        if (this._boundaries.ccpEdn) {
          document2._endnotes = clean(getTextRangeByCP(pieces, start, start + this._boundaries.ccpEdn - 1));
          start += this._boundaries.ccpEdn;
        }
        if (this._boundaries.ccpTxbx) {
          document2._textboxes = clean(getTextRangeByCP(pieces, start, start + this._boundaries.ccpTxbx - 1));
          start += this._boundaries.ccpTxbx;
        }
        if (this._boundaries.ccpHdrTxbx) {
          document2._headerTextboxes = clean(getTextRangeByCP(pieces, start, start + this._boundaries.ccpHdrTxbx - 1));
          start += this._boundaries.ccpHdrTxbx;
        }
        return document2;
      }
      /**
       * Main logic top level function for unpacking a Word document 
       * @param {*} document the OLE document
       * @param {*} buffer a buffer 
       * @returns a Promise which resolves to a {@link Document}
       */
      extractWordDocument(document2, buffer) {
        const magic = buffer.readUInt16LE(0);
        if (magic !== 42476) {
          return Promise.reject(new Error(`This does not seem to be a Word document: Invalid magic number: ${magic.toString(16)}`));
        }
        const flags = buffer.readUInt16LE(10);
        const streamName = (flags & 512) !== 0 ? "1Table" : "0Table";
        return this.documentStream(document2, streamName).then((stream) => this.streamBuffer(stream)).then((streamBuffer) => {
          this._boundaries.fcMin = buffer.readUInt32LE(24);
          this._boundaries.ccpText = buffer.readUInt32LE(76);
          this._boundaries.ccpFtn = buffer.readUInt32LE(80);
          this._boundaries.ccpHdd = buffer.readUInt32LE(84);
          this._boundaries.ccpAtn = buffer.readUInt32LE(92);
          this._boundaries.ccpEdn = buffer.readUInt32LE(96);
          this._boundaries.ccpTxbx = buffer.readUInt32LE(100);
          this._boundaries.ccpHdrTxbx = buffer.readUInt32LE(104);
          this.writeBookmarks(buffer, streamBuffer);
          this.writePieces(buffer, streamBuffer);
          this.writeCharacterProperties(buffer, streamBuffer);
          this.writeParagraphProperties(buffer, streamBuffer);
          this.normalizeHeaders(buffer, streamBuffer);
          return this.buildDocument();
        });
      }
      /**
       * Returns a promise that resolves to the named stream.
       * @param {*} document 
       * @param {*} streamName 
       * @returns a promise that resolves to the named stream
       */
      documentStream(document2, streamName) {
        return Promise.resolve(document2.stream(streamName));
      }
      /**
       * Returns a promise that resolves to a Buffer containing the contents of 
       * the given stream. 
       * @param {*} stream 
       * @returns a promise that resolves to the sream contents
       */
      streamBuffer(stream) {
        return new Promise((resolve2, reject) => {
          const chunks = [];
          stream.on("data", (chunk) => chunks.push(chunk));
          stream.on("error", (error) => reject(error));
          stream.on("end", () => resolve2(Buffer.concat(chunks)));
          return stream;
        });
      }
      writeFields(buffer, tableBuffer, result) {
        const fcPlcffldMom = buffer.readInt32LE(282);
        const lcbPlcffldMom = buffer.readUInt32LE(286);
        if (lcbPlcffldMom == 0) {
          return;
        }
        const fieldCount = (lcbPlcffldMom - 4) / 6;
        const dataOffset = (fieldCount + 1) * 4;
        const plcffldMom = tableBuffer.slice(fcPlcffldMom, fcPlcffldMom + lcbPlcffldMom);
        for (let i = 0; i < fieldCount; i++) {
          const cp = plcffldMom.readUInt32LE(i * 4);
          const fld = plcffldMom.readUInt16LE(dataOffset + i * 2);
          const byte1 = fld & 255;
          const byte2 = fld >> 8;
          if ((byte1 & 31) == 19) {
          } else {
          }
        }
      }
      /**
       * Extracts and stores the document bookmarks into a local field.
       * @param {*} buffer 
       * @param {*} tableBuffer 
       */
      writeBookmarks(buffer, tableBuffer) {
        const fcSttbfBkmk = buffer.readUInt32LE(322);
        const lcbSttbfBkmk = buffer.readUInt32LE(326);
        const fcPlcfBkf = buffer.readUInt32LE(330);
        const lcbPlcfBkf = buffer.readUInt32LE(334);
        const fcPlcfBkl = buffer.readUInt32LE(338);
        const lcbPlcfBkl = buffer.readUInt32LE(342);
        if (lcbSttbfBkmk === 0) {
          return;
        }
        const sttbfBkmk = tableBuffer.slice(fcSttbfBkmk, fcSttbfBkmk + lcbSttbfBkmk);
        const plcfBkf = tableBuffer.slice(fcPlcfBkf, fcPlcfBkf + lcbPlcfBkf);
        const plcfBkl = tableBuffer.slice(fcPlcfBkl, fcPlcfBkl + lcbPlcfBkl);
        const fcExtend = sttbfBkmk.readUInt16LE(0);
        const cData = sttbfBkmk.readUInt16LE(2);
        const cbExtra = sttbfBkmk.readUInt16LE(4);
        if (fcExtend !== 65535) {
          throw new Error("Internal error: unexpected single-byte bookmark data");
        }
        let offset = 6;
        const index = 0;
        while (offset < lcbSttbfBkmk) {
          let length = sttbfBkmk.readUInt16LE(offset);
          length = length * 2;
          const segment = sttbfBkmk.slice(offset + 2, offset + 2 + length);
          const cpStart = plcfBkf.readUInt32LE(index * 4);
          const cpEnd = plcfBkl.readUInt32LE(index * 4);
          this._bookmarks[segment] = { start: cpStart, end: cpEnd };
          offset = offset + length + 2;
        }
      }
      /**
       * Extracts and stores the document text pieces into a local field. This is
       * probably the most crucial part of text extraction, as it is where we
       * get text corresponding to character positions. These may be stored in a 
       * different order in the file compared to the order we want them. 
       * 
       * @param {*} buffer 
       * @param {*} tableBuffer 
       */
      writePieces(buffer, tableBuffer) {
        let flag;
        let pos = buffer.readUInt32LE(418);
        while (true) {
          flag = tableBuffer.readUInt8(pos);
          if (flag !== 1) {
            break;
          }
          pos = pos + 1;
          const skip = tableBuffer.readUInt16LE(pos);
          pos = pos + 2 + skip;
        }
        flag = tableBuffer.readUInt8(pos);
        pos = pos + 1;
        if (flag !== 2) {
          throw new Error("Internal error: ccorrupted Word file");
        }
        const pieceTableSize = tableBuffer.readUInt32LE(pos);
        pos = pos + 4;
        const pieces = (pieceTableSize - 4) / 12;
        let startCp = 0;
        let startStream = 0;
        for (let x = 0, end = pieces - 1; x <= end; x++) {
          const offset = pos + (pieces + 1) * 4 + x * 8 + 2;
          let startFilePos = tableBuffer.readUInt32LE(offset);
          let unicode = false;
          if ((startFilePos & 1073741824) === 0) {
            unicode = true;
          } else {
            startFilePos = startFilePos & ~1073741824;
            startFilePos = Math.floor(startFilePos / 2);
          }
          const lStart = tableBuffer.readUInt32LE(pos + x * 4);
          const lEnd = tableBuffer.readUInt32LE(pos + (x + 1) * 4);
          const totLength = lEnd - lStart;
          const piece = {
            startCp,
            startStream,
            totLength,
            startFilePos,
            unicode,
            bpc: unicode ? 2 : 1
          };
          piece.size = piece.bpc * (lEnd - lStart);
          const textBuffer = buffer.slice(startFilePos, startFilePos + piece.size);
          if (unicode) {
            piece.text = textBuffer.toString("ucs2");
          } else {
            piece.text = binaryToUnicode(textBuffer.toString("binary"));
          }
          piece.length = piece.text.length;
          piece.endCp = piece.startCp + piece.length;
          piece.endStream = piece.startStream + piece.size;
          piece.endFilePos = piece.startFilePos + piece.size;
          startCp = piece.endCp;
          startStream = piece.endStream;
          this._pieces.push(piece);
        }
      }
      /**
       * Processes the headers and footers. The main logic here is that we might have a mix 
       * of "real" and "pseudo" headers. For example, a footnote generates some footnote
       * separator footer elements, which, unless they contain something interesting, we 
       * can dispense with. In fact, we want to dispense with anything which is made up of
       * whitespace and control characters, in general. This means locating the segments of
       * text in the extracted pieces, and conditionally replacing them with nulls. 
       * 
       * @param {*} buffer 
       * @param {*} tableBuffer 
       */
      normalizeHeaders(buffer, tableBuffer) {
        const pieces = this._pieces;
        const fcPlcfhdd = buffer.readUInt32LE(242);
        const lcbPlcfhdd = buffer.readUInt32LE(246);
        if (lcbPlcfhdd < 8) {
          return;
        }
        const offset = this._boundaries.ccpText + this._boundaries.ccpFtn;
        const ccpHdd = this._boundaries.ccpHdd;
        const plcHdd = tableBuffer.slice(fcPlcfhdd, fcPlcfhdd + lcbPlcfhdd);
        const plcHddCount = lcbPlcfhdd / 4;
        let start = offset + plcHdd.readUInt32LE(0);
        for (let i = 1; i < plcHddCount; i++) {
          let end = offset + plcHdd.readUInt32LE(i * 4);
          if (end > offset + ccpHdd) {
            end = offset + ccpHdd;
          }
          const string = getTextRangeByCP(pieces, start, end);
          const story = i - 1;
          if ([0, 1, 2].includes(story)) {
            this._taggedHeaders.push({ type: "footnoteSeparators", text: string });
          } else if ([3, 4, 5].includes(story)) {
            this._taggedHeaders.push({ type: "endSeparators", text: string });
          } else if ([0, 1, 4].includes(story % 6)) {
            this._taggedHeaders.push({ type: "headers", text: string });
          } else if ([2, 3, 5].includes(story % 6)) {
            this._taggedHeaders.push({ type: "footers", text: string });
          }
          if (!/[^\r\n\u0002-\u0008]/.test(string)) {
            replaceSelectedRange(pieces, start, end, "\0");
          } else {
            replaceSelectedRange(pieces, end - 1, end, "\0");
          }
          start = end;
        }
      }
      writeParagraphProperties(buffer, tableBuffer) {
        const pieces = this._pieces;
        const fcPlcfbtePapx = buffer.readUInt32LE(258);
        const lcbPlcfbtePapx = buffer.readUInt32LE(262);
        const plcBtePapxCount = (lcbPlcfbtePapx - 4) / 8;
        const dataOffset = (plcBtePapxCount + 1) * 4;
        const plcBtePapx = tableBuffer.slice(fcPlcfbtePapx, fcPlcfbtePapx + lcbPlcfbtePapx);
        for (let i = 0; i < plcBtePapxCount; i++) {
          const cp = plcBtePapx.readUInt32LE(i * 4);
          const papxFkpBlock = plcBtePapx.readUInt32LE(dataOffset + i * 4);
          const papxFkpBlockBuffer = buffer.slice(papxFkpBlock * 512, (papxFkpBlock + 1) * 512);
          const crun = papxFkpBlockBuffer.readUInt8(511);
          for (let j = 0; j < crun; j++) {
            const rgfc = papxFkpBlockBuffer.readUInt32LE(j * 4);
            const rgfcNext = papxFkpBlockBuffer.readUInt32LE((j + 1) * 4);
            const cbLocation = (crun + 1) * 4 + j * 13;
            const cbIndex = papxFkpBlockBuffer.readUInt8(cbLocation) * 2;
            const cb = papxFkpBlockBuffer.readUInt8(cbIndex);
            let grpPrlAndIstd = null;
            if (cb !== 0) {
              grpPrlAndIstd = papxFkpBlockBuffer.slice(cbIndex + 1, cbIndex + 1 + 2 * cb - 1);
            } else {
              const cb2 = papxFkpBlockBuffer.readUInt8(cbIndex + 1);
              grpPrlAndIstd = papxFkpBlockBuffer.slice(cbIndex + 2, cbIndex + 2 + 2 * cb2);
            }
            const istd = grpPrlAndIstd.readUInt16LE(0);
            processSprms(grpPrlAndIstd, 2, (buffer2, offset, sprm, ispmd, fspec, sgc, spra) => {
              if (sprm === 9239) {
                replaceSelectedRangeByFilePos(pieces, rgfc, rgfcNext, "\n");
              }
            });
          }
        }
      }
      writeCharacterProperties(buffer, tableBuffer) {
        const pieces = this._pieces;
        const fcPlcfbteChpx = buffer.readUInt32LE(250);
        const lcbPlcfbteChpx = buffer.readUInt32LE(254);
        const plcBteChpxCount = (lcbPlcfbteChpx - 4) / 8;
        const dataOffset = (plcBteChpxCount + 1) * 4;
        const plcBteChpx = tableBuffer.slice(fcPlcfbteChpx, fcPlcfbteChpx + lcbPlcfbteChpx);
        let lastDeletionEnd = null;
        for (let i = 0; i < plcBteChpxCount; i++) {
          const cp = plcBteChpx.readUInt32LE(i * 4);
          const chpxFkpBlock = plcBteChpx.readUInt32LE(dataOffset + i * 4);
          const chpxFkpBlockBuffer = buffer.slice(chpxFkpBlock * 512, (chpxFkpBlock + 1) * 512);
          const crun = chpxFkpBlockBuffer.readUInt8(511);
          for (let j = 0; j < crun; j++) {
            const rgfc = chpxFkpBlockBuffer.readUInt32LE(j * 4);
            const rgfcNext = chpxFkpBlockBuffer.readUInt32LE((j + 1) * 4);
            const rgb = chpxFkpBlockBuffer.readUInt8((crun + 1) * 4 + j);
            if (rgb == 0) {
              continue;
            }
            const chpxOffset = rgb * 2;
            const cb = chpxFkpBlockBuffer.readUInt8(chpxOffset);
            const grpprl = chpxFkpBlockBuffer.slice(chpxOffset + 1, chpxOffset + 1 + cb);
            processSprms(grpprl, 0, (buffer2, offset, sprm, ispmd) => {
              if (ispmd === sprmCFRMarkDel) {
                if ((buffer2[offset] & 1) != 1) {
                  return;
                }
                if (lastDeletionEnd === rgfc) {
                  markDeletedRange(pieces, lastDeletionEnd, rgfcNext);
                } else {
                  markDeletedRange(pieces, rgfc, rgfcNext);
                }
                lastDeletionEnd = rgfcNext;
              }
            });
          }
        }
      }
    };
    module.exports = WordOleExtractor;
  }
});

// ../../../../node_modules/.pnpm/xmlchars@2.2.0/node_modules/xmlchars/xml/1.0/ed5.js
var require_ed5 = __commonJS({
  "../../../../node_modules/.pnpm/xmlchars@2.2.0/node_modules/xmlchars/xml/1.0/ed5.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CHAR = "	\n\r -\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}";
    exports.S = " 	\r\n";
    exports.NAME_START_CHAR = ":A-Z_a-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}";
    exports.NAME_CHAR = "-" + exports.NAME_START_CHAR + ".0-9\xB7\u0300-\u036F\u203F-\u2040";
    exports.CHAR_RE = new RegExp("^[" + exports.CHAR + "]$", "u");
    exports.S_RE = new RegExp("^[" + exports.S + "]+$", "u");
    exports.NAME_START_CHAR_RE = new RegExp("^[" + exports.NAME_START_CHAR + "]$", "u");
    exports.NAME_CHAR_RE = new RegExp("^[" + exports.NAME_CHAR + "]$", "u");
    exports.NAME_RE = new RegExp("^[" + exports.NAME_START_CHAR + "][" + exports.NAME_CHAR + "]*$", "u");
    exports.NMTOKEN_RE = new RegExp("^[" + exports.NAME_CHAR + "]+$", "u");
    var TAB = 9;
    var NL = 10;
    var CR = 13;
    var SPACE = 32;
    exports.S_LIST = [SPACE, NL, CR, TAB];
    function isChar(c) {
      return c >= SPACE && c <= 55295 || c === NL || c === CR || c === TAB || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isChar = isChar;
    function isS(c) {
      return c === SPACE || c === NL || c === CR || c === TAB;
    }
    exports.isS = isS;
    function isNameStartChar(c) {
      return c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 58 || c === 95 || c === 8204 || c === 8205 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNameStartChar = isNameStartChar;
    function isNameChar(c) {
      return isNameStartChar(c) || c >= 48 && c <= 57 || c === 45 || c === 46 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256;
    }
    exports.isNameChar = isNameChar;
  }
});

// ../../../../node_modules/.pnpm/xmlchars@2.2.0/node_modules/xmlchars/xml/1.1/ed2.js
var require_ed2 = __commonJS({
  "../../../../node_modules/.pnpm/xmlchars@2.2.0/node_modules/xmlchars/xml/1.1/ed2.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CHAR = "-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}";
    exports.RESTRICTED_CHAR = "-\b\v\f-\x7F-\x84\x86-\x9F";
    exports.S = " 	\r\n";
    exports.NAME_START_CHAR = ":A-Z_a-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}";
    exports.NAME_CHAR = "-" + exports.NAME_START_CHAR + ".0-9\xB7\u0300-\u036F\u203F-\u2040";
    exports.CHAR_RE = new RegExp("^[" + exports.CHAR + "]$", "u");
    exports.RESTRICTED_CHAR_RE = new RegExp("^[" + exports.RESTRICTED_CHAR + "]$", "u");
    exports.S_RE = new RegExp("^[" + exports.S + "]+$", "u");
    exports.NAME_START_CHAR_RE = new RegExp("^[" + exports.NAME_START_CHAR + "]$", "u");
    exports.NAME_CHAR_RE = new RegExp("^[" + exports.NAME_CHAR + "]$", "u");
    exports.NAME_RE = new RegExp("^[" + exports.NAME_START_CHAR + "][" + exports.NAME_CHAR + "]*$", "u");
    exports.NMTOKEN_RE = new RegExp("^[" + exports.NAME_CHAR + "]+$", "u");
    var TAB = 9;
    var NL = 10;
    var CR = 13;
    var SPACE = 32;
    exports.S_LIST = [SPACE, NL, CR, TAB];
    function isChar(c) {
      return c >= 1 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isChar = isChar;
    function isRestrictedChar(c) {
      return c >= 1 && c <= 8 || c === 11 || c === 12 || c >= 14 && c <= 31 || c >= 127 && c <= 132 || c >= 134 && c <= 159;
    }
    exports.isRestrictedChar = isRestrictedChar;
    function isCharAndNotRestricted(c) {
      return c === 9 || c === 10 || c === 13 || c > 31 && c < 127 || c === 133 || c > 159 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isCharAndNotRestricted = isCharAndNotRestricted;
    function isS(c) {
      return c === SPACE || c === NL || c === CR || c === TAB;
    }
    exports.isS = isS;
    function isNameStartChar(c) {
      return c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 58 || c === 95 || c === 8204 || c === 8205 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNameStartChar = isNameStartChar;
    function isNameChar(c) {
      return isNameStartChar(c) || c >= 48 && c <= 57 || c === 45 || c === 46 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256;
    }
    exports.isNameChar = isNameChar;
  }
});

// ../../../../node_modules/.pnpm/xmlchars@2.2.0/node_modules/xmlchars/xmlns/1.0/ed3.js
var require_ed3 = __commonJS({
  "../../../../node_modules/.pnpm/xmlchars@2.2.0/node_modules/xmlchars/xmlns/1.0/ed3.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NC_NAME_START_CHAR = "A-Z_a-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}";
    exports.NC_NAME_CHAR = "-" + exports.NC_NAME_START_CHAR + ".0-9\xB7\u0300-\u036F\u203F-\u2040";
    exports.NC_NAME_START_CHAR_RE = new RegExp("^[" + exports.NC_NAME_START_CHAR + "]$", "u");
    exports.NC_NAME_CHAR_RE = new RegExp("^[" + exports.NC_NAME_CHAR + "]$", "u");
    exports.NC_NAME_RE = new RegExp("^[" + exports.NC_NAME_START_CHAR + "][" + exports.NC_NAME_CHAR + "]*$", "u");
    function isNCNameStartChar(c) {
      return c >= 65 && c <= 90 || c === 95 || c >= 97 && c <= 122 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8204 && c <= 8205 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNCNameStartChar = isNCNameStartChar;
    function isNCNameChar(c) {
      return isNCNameStartChar(c) || (c === 45 || c === 46 || c >= 48 && c <= 57 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256);
    }
    exports.isNCNameChar = isNCNameChar;
  }
});

// ../../../../node_modules/.pnpm/saxes@5.0.1/node_modules/saxes/saxes.js
var require_saxes = __commonJS({
  "../../../../node_modules/.pnpm/saxes@5.0.1/node_modules/saxes/saxes.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ed5 = require_ed5();
    var ed2 = require_ed2();
    var NSed3 = require_ed3();
    var isS = ed5.isS;
    var isChar10 = ed5.isChar;
    var isNameStartChar = ed5.isNameStartChar;
    var isNameChar = ed5.isNameChar;
    var S_LIST = ed5.S_LIST;
    var NAME_RE = ed5.NAME_RE;
    var isChar11 = ed2.isChar;
    var isNCNameStartChar = NSed3.isNCNameStartChar;
    var isNCNameChar = NSed3.isNCNameChar;
    var NC_NAME_RE = NSed3.NC_NAME_RE;
    var XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
    var XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
    var rootNS = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      __proto__: null,
      xml: XML_NAMESPACE,
      xmlns: XMLNS_NAMESPACE
    };
    var XML_ENTITIES = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      __proto__: null,
      amp: "&",
      gt: ">",
      lt: "<",
      quot: '"',
      apos: "'"
    };
    var EOC = -1;
    var NL_LIKE = -2;
    var S_BEGIN = 0;
    var S_BEGIN_WHITESPACE = 1;
    var S_DOCTYPE = 2;
    var S_DOCTYPE_QUOTE = 3;
    var S_DTD = 4;
    var S_DTD_QUOTED = 5;
    var S_DTD_OPEN_WAKA = 6;
    var S_DTD_OPEN_WAKA_BANG = 7;
    var S_DTD_COMMENT = 8;
    var S_DTD_COMMENT_ENDING = 9;
    var S_DTD_COMMENT_ENDED = 10;
    var S_DTD_PI = 11;
    var S_DTD_PI_ENDING = 12;
    var S_TEXT = 13;
    var S_ENTITY = 14;
    var S_OPEN_WAKA = 15;
    var S_OPEN_WAKA_BANG = 16;
    var S_COMMENT = 17;
    var S_COMMENT_ENDING = 18;
    var S_COMMENT_ENDED = 19;
    var S_CDATA = 20;
    var S_CDATA_ENDING = 21;
    var S_CDATA_ENDING_2 = 22;
    var S_PI_FIRST_CHAR = 23;
    var S_PI_REST = 24;
    var S_PI_BODY = 25;
    var S_PI_ENDING = 26;
    var S_XML_DECL_NAME_START = 27;
    var S_XML_DECL_NAME = 28;
    var S_XML_DECL_EQ = 29;
    var S_XML_DECL_VALUE_START = 30;
    var S_XML_DECL_VALUE = 31;
    var S_XML_DECL_SEPARATOR = 32;
    var S_XML_DECL_ENDING = 33;
    var S_OPEN_TAG = 34;
    var S_OPEN_TAG_SLASH = 35;
    var S_ATTRIB = 36;
    var S_ATTRIB_NAME = 37;
    var S_ATTRIB_NAME_SAW_WHITE = 38;
    var S_ATTRIB_VALUE = 39;
    var S_ATTRIB_VALUE_QUOTED = 40;
    var S_ATTRIB_VALUE_CLOSED = 41;
    var S_ATTRIB_VALUE_UNQUOTED = 42;
    var S_CLOSE_TAG = 43;
    var S_CLOSE_TAG_SAW_WHITE = 44;
    var TAB = 9;
    var NL = 10;
    var CR = 13;
    var SPACE = 32;
    var BANG = 33;
    var DQUOTE = 34;
    var AMP = 38;
    var SQUOTE = 39;
    var MINUS = 45;
    var FORWARD_SLASH = 47;
    var SEMICOLON = 59;
    var LESS = 60;
    var EQUAL = 61;
    var GREATER = 62;
    var QUESTION = 63;
    var OPEN_BRACKET = 91;
    var CLOSE_BRACKET = 93;
    var NEL = 133;
    var LS = 8232;
    var isQuote = (c) => c === DQUOTE || c === SQUOTE;
    var QUOTES = [DQUOTE, SQUOTE];
    var DOCTYPE_TERMINATOR = [...QUOTES, OPEN_BRACKET, GREATER];
    var DTD_TERMINATOR = [...QUOTES, LESS, CLOSE_BRACKET];
    var XML_DECL_NAME_TERMINATOR = [EQUAL, QUESTION, ...S_LIST];
    var ATTRIB_VALUE_UNQUOTED_TERMINATOR = [...S_LIST, GREATER, AMP, LESS];
    function nsPairCheck(parser, prefix, uri) {
      switch (prefix) {
        case "xml":
          if (uri !== XML_NAMESPACE) {
            parser.fail(`xml prefix must be bound to ${XML_NAMESPACE}.`);
          }
          break;
        case "xmlns":
          if (uri !== XMLNS_NAMESPACE) {
            parser.fail(`xmlns prefix must be bound to ${XMLNS_NAMESPACE}.`);
          }
          break;
        default:
      }
      switch (uri) {
        case XMLNS_NAMESPACE:
          parser.fail(prefix === "" ? `the default namespace may not be set to ${uri}.` : `may not assign a prefix (even "xmlns") to the URI ${XMLNS_NAMESPACE}.`);
          break;
        case XML_NAMESPACE:
          switch (prefix) {
            case "xml":
              break;
            case "":
              parser.fail(`the default namespace may not be set to ${uri}.`);
              break;
            default:
              parser.fail("may not assign the xml namespace to another prefix.");
          }
          break;
        default:
      }
    }
    function nsMappingCheck(parser, mapping) {
      for (const local of Object.keys(mapping)) {
        nsPairCheck(parser, local, mapping[local]);
      }
    }
    var isNCName = (name) => NC_NAME_RE.test(name);
    var isName = (name) => NAME_RE.test(name);
    var FORBIDDEN_START = 0;
    var FORBIDDEN_BRACKET = 1;
    var FORBIDDEN_BRACKET_BRACKET = 2;
    exports.EVENTS = [
      "xmldecl",
      "text",
      "processinginstruction",
      "doctype",
      "comment",
      "opentagstart",
      "attribute",
      "opentag",
      "closetag",
      "cdata",
      "error",
      "end",
      "ready"
    ];
    var EVENT_NAME_TO_HANDLER_NAME = {
      xmldecl: "xmldeclHandler",
      text: "textHandler",
      processinginstruction: "piHandler",
      doctype: "doctypeHandler",
      comment: "commentHandler",
      opentagstart: "openTagStartHandler",
      attribute: "attributeHandler",
      opentag: "openTagHandler",
      closetag: "closeTagHandler",
      cdata: "cdataHandler",
      error: "errorHandler",
      end: "endHandler",
      ready: "readyHandler"
    };
    var SaxesParser = class {
      /**
       * @param opt The parser options.
       */
      constructor(opt) {
        this.opt = opt !== null && opt !== void 0 ? opt : {};
        this.fragmentOpt = !!this.opt.fragment;
        const xmlnsOpt = this.xmlnsOpt = !!this.opt.xmlns;
        this.trackPosition = this.opt.position !== false;
        this.fileName = this.opt.fileName;
        if (xmlnsOpt) {
          this.nameStartCheck = isNCNameStartChar;
          this.nameCheck = isNCNameChar;
          this.isName = isNCName;
          this.processAttribs = this.processAttribsNS;
          this.pushAttrib = this.pushAttribNS;
          this.ns = Object.assign({ __proto__: null }, rootNS);
          const additional = this.opt.additionalNamespaces;
          if (additional != null) {
            nsMappingCheck(this, additional);
            Object.assign(this.ns, additional);
          }
        } else {
          this.nameStartCheck = isNameStartChar;
          this.nameCheck = isNameChar;
          this.isName = isName;
          this.processAttribs = this.processAttribsPlain;
          this.pushAttrib = this.pushAttribPlain;
        }
        this.stateTable = [
          /* eslint-disable @typescript-eslint/unbound-method */
          this.sBegin,
          this.sBeginWhitespace,
          this.sDoctype,
          this.sDoctypeQuote,
          this.sDTD,
          this.sDTDQuoted,
          this.sDTDOpenWaka,
          this.sDTDOpenWakaBang,
          this.sDTDComment,
          this.sDTDCommentEnding,
          this.sDTDCommentEnded,
          this.sDTDPI,
          this.sDTDPIEnding,
          this.sText,
          this.sEntity,
          this.sOpenWaka,
          this.sOpenWakaBang,
          this.sComment,
          this.sCommentEnding,
          this.sCommentEnded,
          this.sCData,
          this.sCDataEnding,
          this.sCDataEnding2,
          this.sPIFirstChar,
          this.sPIRest,
          this.sPIBody,
          this.sPIEnding,
          this.sXMLDeclNameStart,
          this.sXMLDeclName,
          this.sXMLDeclEq,
          this.sXMLDeclValueStart,
          this.sXMLDeclValue,
          this.sXMLDeclSeparator,
          this.sXMLDeclEnding,
          this.sOpenTag,
          this.sOpenTagSlash,
          this.sAttrib,
          this.sAttribName,
          this.sAttribNameSawWhite,
          this.sAttribValue,
          this.sAttribValueQuoted,
          this.sAttribValueClosed,
          this.sAttribValueUnquoted,
          this.sCloseTag,
          this.sCloseTagSawWhite
        ];
        this._init();
      }
      /**
       * Indicates whether or not the parser is closed. If ``true``, wait for
       * the ``ready`` event to write again.
       */
      get closed() {
        return this._closed;
      }
      _init() {
        var _a;
        this.openWakaBang = "";
        this.text = "";
        this.name = "";
        this.piTarget = "";
        this.entity = "";
        this.q = null;
        this.tags = [];
        this.tag = null;
        this.topNS = null;
        this.chunk = "";
        this.chunkPosition = 0;
        this.i = 0;
        this.prevI = 0;
        this.carriedFromPrevious = void 0;
        this.forbiddenState = FORBIDDEN_START;
        this.attribList = [];
        const { fragmentOpt } = this;
        this.state = fragmentOpt ? S_TEXT : S_BEGIN;
        this.reportedTextBeforeRoot = this.reportedTextAfterRoot = this.closedRoot = this.sawRoot = fragmentOpt;
        this.xmlDeclPossible = !fragmentOpt;
        this.xmlDeclExpects = ["version"];
        this.entityReturnState = void 0;
        let { defaultXMLVersion } = this.opt;
        if (defaultXMLVersion === void 0) {
          if (this.opt.forceXMLVersion === true) {
            throw new Error("forceXMLVersion set but defaultXMLVersion is not set");
          }
          defaultXMLVersion = "1.0";
        }
        this.setXMLVersion(defaultXMLVersion);
        this.positionAtNewLine = 0;
        this.doctype = false;
        this._closed = false;
        this.xmlDecl = {
          version: void 0,
          encoding: void 0,
          standalone: void 0
        };
        this.line = 1;
        this.column = 0;
        this.ENTITIES = Object.create(XML_ENTITIES);
        (_a = this.readyHandler) === null || _a === void 0 ? void 0 : _a.call(this);
      }
      /**
       * The stream position the parser is currently looking at. This field is
       * zero-based.
       *
       * This field is not based on counting Unicode characters but is to be
       * interpreted as a plain index into a JavaScript string.
       */
      get position() {
        return this.chunkPosition + this.i;
      }
      /**
       * The column number of the next character to be read by the parser.  *
       * This field is zero-based. (The first column in a line is 0.)
       *
       * This field reports the index at which the next character would be in the
       * line if the line were represented as a JavaScript string.  Note that this
       * *can* be different to a count based on the number of *Unicode characters*
       * due to how JavaScript handles astral plane characters.
       *
       * See [[column]] for a number that corresponds to a count of Unicode
       * characters.
       */
      get columnIndex() {
        return this.position - this.positionAtNewLine;
      }
      /**
       * Set an event listener on an event. The parser supports one handler per
       * event type. If you try to set an event handler over an existing handler,
       * the old handler is silently overwritten.
       *
       * @param name The event to listen to.
       *
       * @param handler The handler to set.
       */
      on(name, handler) {
        this[EVENT_NAME_TO_HANDLER_NAME[name]] = handler;
      }
      /**
       * Unset an event handler.
       *
       * @parma name The event to stop listening to.
       */
      off(name) {
        this[EVENT_NAME_TO_HANDLER_NAME[name]] = void 0;
      }
      /**
       * Make an error object. The error object will have a message that contains
       * the ``fileName`` option passed at the creation of the parser. If position
       * tracking was turned on, it will also have line and column number
       * information.
       *
       * @param message The message describing the error to report.
       *
       * @returns An error object with a properly formatted message.
       */
      makeError(message) {
        var _a;
        let msg = (_a = this.fileName) !== null && _a !== void 0 ? _a : "";
        if (this.trackPosition) {
          if (msg.length > 0) {
            msg += ":";
          }
          msg += `${this.line}:${this.column}`;
        }
        if (msg.length > 0) {
          msg += ": ";
        }
        return new Error(msg + message);
      }
      /**
       * Report a parsing error. This method is made public so that client code may
       * check for issues that are outside the scope of this project and can report
       * errors.
       *
       * @param message The error to report.
       *
       * @returns this
       */
      fail(message) {
        const err = this.makeError(message);
        const handler = this.errorHandler;
        if (handler === void 0) {
          throw err;
        } else {
          handler(err);
        }
        return this;
      }
      /**
       * Write a XML data to the parser.
       *
       * @param chunk The XML data to write.
       *
       * @returns this
       */
      write(chunk) {
        if (this.closed) {
          return this.fail("cannot write after close; assign an onready handler.");
        }
        let end = false;
        if (chunk === null) {
          end = true;
          chunk = "";
        } else if (typeof chunk === "object") {
          chunk = chunk.toString();
        }
        if (this.carriedFromPrevious !== void 0) {
          chunk = `${this.carriedFromPrevious}${chunk}`;
          this.carriedFromPrevious = void 0;
        }
        let limit = chunk.length;
        const lastCode = chunk.charCodeAt(limit - 1);
        if (!end && // A trailing CR or surrogate must be carried over to the next
        // chunk.
        (lastCode === CR || lastCode >= 55296 && lastCode <= 56319)) {
          this.carriedFromPrevious = chunk[limit - 1];
          limit--;
          chunk = chunk.slice(0, limit);
        }
        const { stateTable } = this;
        this.chunk = chunk;
        this.i = 0;
        while (this.i < limit) {
          stateTable[this.state].call(this);
        }
        this.chunkPosition += limit;
        return end ? this.end() : this;
      }
      /**
       * Close the current stream. Perform final well-formedness checks and reset
       * the parser tstate.
       *
       * @returns this
       */
      close() {
        return this.write(null);
      }
      /**
       * Get a single code point out of the current chunk. This updates the current
       * position if we do position tracking.
       *
       * This is the algorithm to use for XML 1.0.
       *
       * @returns The character read.
       */
      getCode10() {
        const { chunk, i } = this;
        this.prevI = i;
        this.i = i + 1;
        if (i >= chunk.length) {
          return EOC;
        }
        const code = chunk.charCodeAt(i);
        this.column++;
        if (code < 55296) {
          if (code >= SPACE || code === TAB) {
            return code;
          }
          switch (code) {
            case NL:
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL;
            case CR:
              if (chunk.charCodeAt(i + 1) === NL) {
                this.i = i + 2;
              }
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL_LIKE;
            default:
              this.fail("disallowed character.");
              return code;
          }
        }
        if (code > 56319) {
          if (!(code >= 57344 && code <= 65533)) {
            this.fail("disallowed character.");
          }
          return code;
        }
        const final = 65536 + (code - 55296) * 1024 + (chunk.charCodeAt(i + 1) - 56320);
        this.i = i + 2;
        if (final > 1114111) {
          this.fail("disallowed character.");
        }
        return final;
      }
      /**
       * Get a single code point out of the current chunk. This updates the current
       * position if we do position tracking.
       *
       * This is the algorithm to use for XML 1.1.
       *
       * @returns {number} The character read.
       */
      getCode11() {
        const { chunk, i } = this;
        this.prevI = i;
        this.i = i + 1;
        if (i >= chunk.length) {
          return EOC;
        }
        const code = chunk.charCodeAt(i);
        this.column++;
        if (code < 55296) {
          if (code > 31 && code < 127 || code > 159 && code !== LS || code === TAB) {
            return code;
          }
          switch (code) {
            case NL:
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL;
            case CR: {
              const next = chunk.charCodeAt(i + 1);
              if (next === NL || next === NEL) {
                this.i = i + 2;
              }
            }
            /* yes, fall through */
            case NEL:
            // 0x85
            case LS:
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL_LIKE;
            default:
              this.fail("disallowed character.");
              return code;
          }
        }
        if (code > 56319) {
          if (!(code >= 57344 && code <= 65533)) {
            this.fail("disallowed character.");
          }
          return code;
        }
        const final = 65536 + (code - 55296) * 1024 + (chunk.charCodeAt(i + 1) - 56320);
        this.i = i + 2;
        if (final > 1114111) {
          this.fail("disallowed character.");
        }
        return final;
      }
      /**
       * Like ``getCode`` but with the return value normalized so that ``NL`` is
       * returned for ``NL_LIKE``.
       */
      getCodeNorm() {
        const c = this.getCode();
        return c === NL_LIKE ? NL : c;
      }
      unget() {
        this.i = this.prevI;
        this.column--;
      }
      /**
       * Capture characters into a buffer until encountering one of a set of
       * characters.
       *
       * @param chars An array of codepoints. Encountering a character in the array
       * ends the capture. (``chars`` may safely contain ``NL``.)
       *
       * @return The character code that made the capture end, or ``EOC`` if we hit
       * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
       * instead.
       */
      captureTo(chars) {
        let { i: start } = this;
        const { chunk } = this;
        while (true) {
          const c = this.getCode();
          const isNLLike = c === NL_LIKE;
          const final = isNLLike ? NL : c;
          if (final === EOC || chars.includes(final)) {
            this.text += chunk.slice(start, this.prevI);
            return final;
          }
          if (isNLLike) {
            this.text += `${chunk.slice(start, this.prevI)}
`;
            start = this.i;
          }
        }
      }
      /**
       * Capture characters into a buffer until encountering a character.
       *
       * @param char The codepoint that ends the capture. **NOTE ``char`` MAY NOT
       * CONTAIN ``NL``.** Passing ``NL`` will result in buggy behavior.
       *
       * @return ``true`` if we ran into the character. Otherwise, we ran into the
       * end of the current chunk.
       */
      captureToChar(char) {
        let { i: start } = this;
        const { chunk } = this;
        while (true) {
          let c = this.getCode();
          switch (c) {
            case NL_LIKE:
              this.text += `${chunk.slice(start, this.prevI)}
`;
              start = this.i;
              c = NL;
              break;
            case EOC:
              this.text += chunk.slice(start);
              return false;
            default:
          }
          if (c === char) {
            this.text += chunk.slice(start, this.prevI);
            return true;
          }
        }
      }
      /**
       * Capture characters that satisfy ``isNameChar`` into the ``name`` field of
       * this parser.
       *
       * @return The character code that made the test fail, or ``EOC`` if we hit
       * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
       * instead.
       */
      captureNameChars() {
        const { chunk, i: start } = this;
        while (true) {
          const c = this.getCode();
          if (c === EOC) {
            this.name += chunk.slice(start);
            return EOC;
          }
          if (!isNameChar(c)) {
            this.name += chunk.slice(start, this.prevI);
            return c === NL_LIKE ? NL : c;
          }
        }
      }
      /**
       * Skip white spaces.
       *
       * @return The character that ended the skip, or ``EOC`` if we hit
       * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
       * instead.
       */
      skipSpaces() {
        while (true) {
          const c = this.getCodeNorm();
          if (c === EOC || !isS(c)) {
            return c;
          }
        }
      }
      setXMLVersion(version) {
        this.currentXMLVersion = version;
        if (version === "1.0") {
          this.isChar = isChar10;
          this.getCode = this.getCode10;
        } else {
          this.isChar = isChar11;
          this.getCode = this.getCode11;
        }
      }
      // STATE ENGINE METHODS
      // This needs to be a state separate from S_BEGIN_WHITESPACE because we want
      // to be sure never to come back to this state later.
      sBegin() {
        if (this.chunk.charCodeAt(0) === 65279) {
          this.i++;
          this.column++;
        }
        this.state = S_BEGIN_WHITESPACE;
      }
      sBeginWhitespace() {
        const iBefore = this.i;
        const c = this.skipSpaces();
        if (this.prevI !== iBefore) {
          this.xmlDeclPossible = false;
        }
        switch (c) {
          case LESS:
            this.state = S_OPEN_WAKA;
            if (this.text.length !== 0) {
              throw new Error("no-empty text at start");
            }
            break;
          case EOC:
            break;
          default:
            this.unget();
            this.state = S_TEXT;
            this.xmlDeclPossible = false;
        }
      }
      sDoctype() {
        var _a;
        const c = this.captureTo(DOCTYPE_TERMINATOR);
        switch (c) {
          case GREATER: {
            (_a = this.doctypeHandler) === null || _a === void 0 ? void 0 : _a.call(this, this.text);
            this.text = "";
            this.state = S_TEXT;
            this.doctype = true;
            break;
          }
          case EOC:
            break;
          default:
            this.text += String.fromCodePoint(c);
            if (c === OPEN_BRACKET) {
              this.state = S_DTD;
            } else if (isQuote(c)) {
              this.state = S_DOCTYPE_QUOTE;
              this.q = c;
            }
        }
      }
      sDoctypeQuote() {
        const q = this.q;
        if (this.captureToChar(q)) {
          this.text += String.fromCodePoint(q);
          this.q = null;
          this.state = S_DOCTYPE;
        }
      }
      sDTD() {
        const c = this.captureTo(DTD_TERMINATOR);
        if (c === EOC) {
          return;
        }
        this.text += String.fromCodePoint(c);
        if (c === CLOSE_BRACKET) {
          this.state = S_DOCTYPE;
        } else if (c === LESS) {
          this.state = S_DTD_OPEN_WAKA;
        } else if (isQuote(c)) {
          this.state = S_DTD_QUOTED;
          this.q = c;
        }
      }
      sDTDQuoted() {
        const q = this.q;
        if (this.captureToChar(q)) {
          this.text += String.fromCodePoint(q);
          this.state = S_DTD;
          this.q = null;
        }
      }
      sDTDOpenWaka() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        switch (c) {
          case BANG:
            this.state = S_DTD_OPEN_WAKA_BANG;
            this.openWakaBang = "";
            break;
          case QUESTION:
            this.state = S_DTD_PI;
            break;
          default:
            this.state = S_DTD;
        }
      }
      sDTDOpenWakaBang() {
        const char = String.fromCodePoint(this.getCodeNorm());
        const owb = this.openWakaBang += char;
        this.text += char;
        if (owb !== "-") {
          this.state = owb === "--" ? S_DTD_COMMENT : S_DTD;
          this.openWakaBang = "";
        }
      }
      sDTDComment() {
        if (this.captureToChar(MINUS)) {
          this.text += "-";
          this.state = S_DTD_COMMENT_ENDING;
        }
      }
      sDTDCommentEnding() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        this.state = c === MINUS ? S_DTD_COMMENT_ENDED : S_DTD_COMMENT;
      }
      sDTDCommentEnded() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        if (c === GREATER) {
          this.state = S_DTD;
        } else {
          this.fail("malformed comment.");
          this.state = S_DTD_COMMENT;
        }
      }
      sDTDPI() {
        if (this.captureToChar(QUESTION)) {
          this.text += "?";
          this.state = S_DTD_PI_ENDING;
        }
      }
      sDTDPIEnding() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        if (c === GREATER) {
          this.state = S_DTD;
        }
      }
      sText() {
        if (this.tags.length !== 0) {
          this.handleTextInRoot();
        } else {
          this.handleTextOutsideRoot();
        }
      }
      sEntity() {
        let { i: start } = this;
        const { chunk } = this;
        loop:
          while (true) {
            switch (this.getCode()) {
              case NL_LIKE:
                this.entity += `${chunk.slice(start, this.prevI)}
`;
                start = this.i;
                break;
              case SEMICOLON: {
                const { entityReturnState } = this;
                const entity = this.entity + chunk.slice(start, this.prevI);
                this.state = entityReturnState;
                let parsed;
                if (entity === "") {
                  this.fail("empty entity name.");
                  parsed = "&;";
                } else {
                  parsed = this.parseEntity(entity);
                  this.entity = "";
                }
                if (entityReturnState !== S_TEXT || this.textHandler !== void 0) {
                  this.text += parsed;
                }
                break loop;
              }
              case EOC:
                this.entity += chunk.slice(start);
                break loop;
              default:
            }
          }
      }
      sOpenWaka() {
        const c = this.getCode();
        if (isNameStartChar(c)) {
          this.state = S_OPEN_TAG;
          this.unget();
          this.xmlDeclPossible = false;
        } else {
          switch (c) {
            case FORWARD_SLASH:
              this.state = S_CLOSE_TAG;
              this.xmlDeclPossible = false;
              break;
            case BANG:
              this.state = S_OPEN_WAKA_BANG;
              this.openWakaBang = "";
              this.xmlDeclPossible = false;
              break;
            case QUESTION:
              this.state = S_PI_FIRST_CHAR;
              break;
            default:
              this.fail("disallowed character in tag name");
              this.state = S_TEXT;
              this.xmlDeclPossible = false;
          }
        }
      }
      sOpenWakaBang() {
        this.openWakaBang += String.fromCodePoint(this.getCodeNorm());
        switch (this.openWakaBang) {
          case "[CDATA[":
            if (!this.sawRoot && !this.reportedTextBeforeRoot) {
              this.fail("text data outside of root node.");
              this.reportedTextBeforeRoot = true;
            }
            if (this.closedRoot && !this.reportedTextAfterRoot) {
              this.fail("text data outside of root node.");
              this.reportedTextAfterRoot = true;
            }
            this.state = S_CDATA;
            this.openWakaBang = "";
            break;
          case "--":
            this.state = S_COMMENT;
            this.openWakaBang = "";
            break;
          case "DOCTYPE":
            this.state = S_DOCTYPE;
            if (this.doctype || this.sawRoot) {
              this.fail("inappropriately located doctype declaration.");
            }
            this.openWakaBang = "";
            break;
          default:
            if (this.openWakaBang.length >= 7) {
              this.fail("incorrect syntax.");
            }
        }
      }
      sComment() {
        if (this.captureToChar(MINUS)) {
          this.state = S_COMMENT_ENDING;
        }
      }
      sCommentEnding() {
        var _a;
        const c = this.getCodeNorm();
        if (c === MINUS) {
          this.state = S_COMMENT_ENDED;
          (_a = this.commentHandler) === null || _a === void 0 ? void 0 : _a.call(this, this.text);
          this.text = "";
        } else {
          this.text += `-${String.fromCodePoint(c)}`;
          this.state = S_COMMENT;
        }
      }
      sCommentEnded() {
        const c = this.getCodeNorm();
        if (c !== GREATER) {
          this.fail("malformed comment.");
          this.text += `--${String.fromCodePoint(c)}`;
          this.state = S_COMMENT;
        } else {
          this.state = S_TEXT;
        }
      }
      sCData() {
        if (this.captureToChar(CLOSE_BRACKET)) {
          this.state = S_CDATA_ENDING;
        }
      }
      sCDataEnding() {
        const c = this.getCodeNorm();
        if (c === CLOSE_BRACKET) {
          this.state = S_CDATA_ENDING_2;
        } else {
          this.text += `]${String.fromCodePoint(c)}`;
          this.state = S_CDATA;
        }
      }
      sCDataEnding2() {
        var _a;
        const c = this.getCodeNorm();
        switch (c) {
          case GREATER: {
            (_a = this.cdataHandler) === null || _a === void 0 ? void 0 : _a.call(this, this.text);
            this.text = "";
            this.state = S_TEXT;
            break;
          }
          case CLOSE_BRACKET:
            this.text += "]";
            break;
          default:
            this.text += `]]${String.fromCodePoint(c)}`;
            this.state = S_CDATA;
        }
      }
      // We need this separate state to check the first character fo the pi target
      // with this.nameStartCheck which allows less characters than this.nameCheck.
      sPIFirstChar() {
        const c = this.getCodeNorm();
        if (this.nameStartCheck(c)) {
          this.piTarget += String.fromCodePoint(c);
          this.state = S_PI_REST;
        } else if (c === QUESTION || isS(c)) {
          this.fail("processing instruction without a target.");
          this.state = c === QUESTION ? S_PI_ENDING : S_PI_BODY;
        } else {
          this.fail("disallowed character in processing instruction name.");
          this.piTarget += String.fromCodePoint(c);
          this.state = S_PI_REST;
        }
      }
      sPIRest() {
        const { chunk, i: start } = this;
        while (true) {
          const c = this.getCodeNorm();
          if (c === EOC) {
            this.piTarget += chunk.slice(start);
            return;
          }
          if (!this.nameCheck(c)) {
            this.piTarget += chunk.slice(start, this.prevI);
            const isQuestion = c === QUESTION;
            if (isQuestion || isS(c)) {
              if (this.piTarget === "xml") {
                if (!this.xmlDeclPossible) {
                  this.fail("an XML declaration must be at the start of the document.");
                }
                this.state = isQuestion ? S_XML_DECL_ENDING : S_XML_DECL_NAME_START;
              } else {
                this.state = isQuestion ? S_PI_ENDING : S_PI_BODY;
              }
            } else {
              this.fail("disallowed character in processing instruction name.");
              this.piTarget += String.fromCodePoint(c);
            }
            break;
          }
        }
      }
      sPIBody() {
        if (this.text.length === 0) {
          const c = this.getCodeNorm();
          if (c === QUESTION) {
            this.state = S_PI_ENDING;
          } else if (!isS(c)) {
            this.text = String.fromCodePoint(c);
          }
        } else if (this.captureToChar(QUESTION)) {
          this.state = S_PI_ENDING;
        }
      }
      sPIEnding() {
        var _a;
        const c = this.getCodeNorm();
        if (c === GREATER) {
          const { piTarget } = this;
          if (piTarget.toLowerCase() === "xml") {
            this.fail("the XML declaration must appear at the start of the document.");
          }
          (_a = this.piHandler) === null || _a === void 0 ? void 0 : _a.call(this, {
            target: piTarget,
            body: this.text
          });
          this.piTarget = this.text = "";
          this.state = S_TEXT;
        } else if (c === QUESTION) {
          this.text += "?";
        } else {
          this.text += `?${String.fromCodePoint(c)}`;
          this.state = S_PI_BODY;
        }
        this.xmlDeclPossible = false;
      }
      sXMLDeclNameStart() {
        const c = this.skipSpaces();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          return;
        }
        if (c !== EOC) {
          this.state = S_XML_DECL_NAME;
          this.name = String.fromCodePoint(c);
        }
      }
      sXMLDeclName() {
        const c = this.captureTo(XML_DECL_NAME_TERMINATOR);
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.name += this.text;
          this.text = "";
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (!(isS(c) || c === EQUAL)) {
          return;
        }
        this.name += this.text;
        this.text = "";
        if (!this.xmlDeclExpects.includes(this.name)) {
          switch (this.name.length) {
            case 0:
              this.fail("did not expect any more name/value pairs.");
              break;
            case 1:
              this.fail(`expected the name ${this.xmlDeclExpects[0]}.`);
              break;
            default:
              this.fail(`expected one of ${this.xmlDeclExpects.join(", ")}`);
          }
        }
        this.state = c === EQUAL ? S_XML_DECL_VALUE_START : S_XML_DECL_EQ;
      }
      sXMLDeclEq() {
        const c = this.getCodeNorm();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (isS(c)) {
          return;
        }
        if (c !== EQUAL) {
          this.fail("value required.");
        }
        this.state = S_XML_DECL_VALUE_START;
      }
      sXMLDeclValueStart() {
        const c = this.getCodeNorm();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (isS(c)) {
          return;
        }
        if (!isQuote(c)) {
          this.fail("value must be quoted.");
          this.q = SPACE;
        } else {
          this.q = c;
        }
        this.state = S_XML_DECL_VALUE;
      }
      sXMLDeclValue() {
        const c = this.captureTo([this.q, QUESTION]);
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.text = "";
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (c === EOC) {
          return;
        }
        const value = this.text;
        this.text = "";
        switch (this.name) {
          case "version": {
            this.xmlDeclExpects = ["encoding", "standalone"];
            const version = value;
            this.xmlDecl.version = version;
            if (!/^1\.[0-9]+$/.test(version)) {
              this.fail("version number must match /^1\\.[0-9]+$/.");
            } else if (!this.opt.forceXMLVersion) {
              this.setXMLVersion(version);
            }
            break;
          }
          case "encoding":
            if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(value)) {
              this.fail("encoding value must match /^[A-Za-z0-9][A-Za-z0-9._-]*$/.");
            }
            this.xmlDeclExpects = ["standalone"];
            this.xmlDecl.encoding = value;
            break;
          case "standalone":
            if (value !== "yes" && value !== "no") {
              this.fail('standalone value must match "yes" or "no".');
            }
            this.xmlDeclExpects = [];
            this.xmlDecl.standalone = value;
            break;
          default:
        }
        this.name = "";
        this.state = S_XML_DECL_SEPARATOR;
      }
      sXMLDeclSeparator() {
        const c = this.getCodeNorm();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          return;
        }
        if (!isS(c)) {
          this.fail("whitespace required.");
          this.unget();
        }
        this.state = S_XML_DECL_NAME_START;
      }
      sXMLDeclEnding() {
        var _a;
        const c = this.getCodeNorm();
        if (c === GREATER) {
          if (this.piTarget !== "xml") {
            this.fail("processing instructions are not allowed before root.");
          } else if (this.name !== "version" && this.xmlDeclExpects.includes("version")) {
            this.fail("XML declaration must contain a version.");
          }
          (_a = this.xmldeclHandler) === null || _a === void 0 ? void 0 : _a.call(this, this.xmlDecl);
          this.name = "";
          this.piTarget = this.text = "";
          this.state = S_TEXT;
        } else {
          this.fail("The character ? is disallowed anywhere in XML declarations.");
        }
        this.xmlDeclPossible = false;
      }
      sOpenTag() {
        var _a;
        const c = this.captureNameChars();
        if (c === EOC) {
          return;
        }
        const tag = this.tag = {
          name: this.name,
          attributes: /* @__PURE__ */ Object.create(null)
        };
        this.name = "";
        if (this.xmlnsOpt) {
          this.topNS = tag.ns = /* @__PURE__ */ Object.create(null);
        }
        (_a = this.openTagStartHandler) === null || _a === void 0 ? void 0 : _a.call(this, tag);
        this.sawRoot = true;
        if (!this.fragmentOpt && this.closedRoot) {
          this.fail("documents may contain only one root.");
        }
        switch (c) {
          case GREATER:
            this.openTag();
            break;
          case FORWARD_SLASH:
            this.state = S_OPEN_TAG_SLASH;
            break;
          default:
            if (!isS(c)) {
              this.fail("disallowed character in tag name.");
            }
            this.state = S_ATTRIB;
        }
      }
      sOpenTagSlash() {
        if (this.getCode() === GREATER) {
          this.openSelfClosingTag();
        } else {
          this.fail("forward-slash in opening tag not followed by >.");
          this.state = S_ATTRIB;
        }
      }
      sAttrib() {
        const c = this.skipSpaces();
        if (c === EOC) {
          return;
        }
        if (isNameStartChar(c)) {
          this.unget();
          this.state = S_ATTRIB_NAME;
        } else if (c === GREATER) {
          this.openTag();
        } else if (c === FORWARD_SLASH) {
          this.state = S_OPEN_TAG_SLASH;
        } else {
          this.fail("disallowed character in attribute name.");
        }
      }
      sAttribName() {
        const c = this.captureNameChars();
        if (c === EQUAL) {
          this.state = S_ATTRIB_VALUE;
        } else if (isS(c)) {
          this.state = S_ATTRIB_NAME_SAW_WHITE;
        } else if (c === GREATER) {
          this.fail("attribute without value.");
          this.pushAttrib(this.name, this.name);
          this.name = this.text = "";
          this.openTag();
        } else if (c !== EOC) {
          this.fail("disallowed character in attribute name.");
        }
      }
      sAttribNameSawWhite() {
        const c = this.skipSpaces();
        switch (c) {
          case EOC:
            return;
          case EQUAL:
            this.state = S_ATTRIB_VALUE;
            break;
          default:
            this.fail("attribute without value.");
            this.text = "";
            this.name = "";
            if (c === GREATER) {
              this.openTag();
            } else if (isNameStartChar(c)) {
              this.unget();
              this.state = S_ATTRIB_NAME;
            } else {
              this.fail("disallowed character in attribute name.");
              this.state = S_ATTRIB;
            }
        }
      }
      sAttribValue() {
        const c = this.getCodeNorm();
        if (isQuote(c)) {
          this.q = c;
          this.state = S_ATTRIB_VALUE_QUOTED;
        } else if (!isS(c)) {
          this.fail("unquoted attribute value.");
          this.state = S_ATTRIB_VALUE_UNQUOTED;
          this.unget();
        }
      }
      sAttribValueQuoted() {
        const { q, chunk } = this;
        let { i: start } = this;
        while (true) {
          switch (this.getCode()) {
            case q:
              this.pushAttrib(this.name, this.text + chunk.slice(start, this.prevI));
              this.name = this.text = "";
              this.q = null;
              this.state = S_ATTRIB_VALUE_CLOSED;
              return;
            case AMP:
              this.text += chunk.slice(start, this.prevI);
              this.state = S_ENTITY;
              this.entityReturnState = S_ATTRIB_VALUE_QUOTED;
              return;
            case NL:
            case NL_LIKE:
            case TAB:
              this.text += `${chunk.slice(start, this.prevI)} `;
              start = this.i;
              break;
            case LESS:
              this.text += chunk.slice(start, this.prevI);
              this.fail("disallowed character.");
              return;
            case EOC:
              this.text += chunk.slice(start);
              return;
            default:
          }
        }
      }
      sAttribValueClosed() {
        const c = this.getCodeNorm();
        if (isS(c)) {
          this.state = S_ATTRIB;
        } else if (c === GREATER) {
          this.openTag();
        } else if (c === FORWARD_SLASH) {
          this.state = S_OPEN_TAG_SLASH;
        } else if (isNameStartChar(c)) {
          this.fail("no whitespace between attributes.");
          this.unget();
          this.state = S_ATTRIB_NAME;
        } else {
          this.fail("disallowed character in attribute name.");
        }
      }
      sAttribValueUnquoted() {
        const c = this.captureTo(ATTRIB_VALUE_UNQUOTED_TERMINATOR);
        switch (c) {
          case AMP:
            this.state = S_ENTITY;
            this.entityReturnState = S_ATTRIB_VALUE_UNQUOTED;
            break;
          case LESS:
            this.fail("disallowed character.");
            break;
          case EOC:
            break;
          default:
            if (this.text.includes("]]>")) {
              this.fail('the string "]]>" is disallowed in char data.');
            }
            this.pushAttrib(this.name, this.text);
            this.name = this.text = "";
            if (c === GREATER) {
              this.openTag();
            } else {
              this.state = S_ATTRIB;
            }
        }
      }
      sCloseTag() {
        const c = this.captureNameChars();
        if (c === GREATER) {
          this.closeTag();
        } else if (isS(c)) {
          this.state = S_CLOSE_TAG_SAW_WHITE;
        } else if (c !== EOC) {
          this.fail("disallowed character in closing tag.");
        }
      }
      sCloseTagSawWhite() {
        switch (this.skipSpaces()) {
          case GREATER:
            this.closeTag();
            break;
          case EOC:
            break;
          default:
            this.fail("disallowed character in closing tag.");
        }
      }
      // END OF STATE ENGINE METHODS
      handleTextInRoot() {
        let { i: start, forbiddenState } = this;
        const { chunk, textHandler: handler } = this;
        scanLoop:
          while (true) {
            switch (this.getCode()) {
              case LESS: {
                this.state = S_OPEN_WAKA;
                if (handler !== void 0) {
                  const { text } = this;
                  const slice = chunk.slice(start, this.prevI);
                  if (text.length !== 0) {
                    handler(text + slice);
                    this.text = "";
                  } else if (slice.length !== 0) {
                    handler(slice);
                  }
                }
                forbiddenState = FORBIDDEN_START;
                break scanLoop;
              }
              case AMP:
                this.state = S_ENTITY;
                this.entityReturnState = S_TEXT;
                if (handler !== void 0) {
                  this.text += chunk.slice(start, this.prevI);
                }
                forbiddenState = FORBIDDEN_START;
                break scanLoop;
              case CLOSE_BRACKET:
                switch (forbiddenState) {
                  case FORBIDDEN_START:
                    forbiddenState = FORBIDDEN_BRACKET;
                    break;
                  case FORBIDDEN_BRACKET:
                    forbiddenState = FORBIDDEN_BRACKET_BRACKET;
                    break;
                  case FORBIDDEN_BRACKET_BRACKET:
                    break;
                  default:
                    throw new Error("impossible state");
                }
                break;
              case GREATER:
                if (forbiddenState === FORBIDDEN_BRACKET_BRACKET) {
                  this.fail('the string "]]>" is disallowed in char data.');
                }
                forbiddenState = FORBIDDEN_START;
                break;
              case NL_LIKE:
                if (handler !== void 0) {
                  this.text += `${chunk.slice(start, this.prevI)}
`;
                }
                start = this.i;
                forbiddenState = FORBIDDEN_START;
                break;
              case EOC:
                if (handler !== void 0) {
                  this.text += chunk.slice(start);
                }
                break scanLoop;
              default:
                forbiddenState = FORBIDDEN_START;
            }
          }
        this.forbiddenState = forbiddenState;
      }
      handleTextOutsideRoot() {
        let { i: start } = this;
        const { chunk, textHandler: handler } = this;
        let nonSpace = false;
        outRootLoop:
          while (true) {
            const code = this.getCode();
            switch (code) {
              case LESS: {
                this.state = S_OPEN_WAKA;
                if (handler !== void 0) {
                  const { text } = this;
                  const slice = chunk.slice(start, this.prevI);
                  if (text.length !== 0) {
                    handler(text + slice);
                    this.text = "";
                  } else if (slice.length !== 0) {
                    handler(slice);
                  }
                }
                break outRootLoop;
              }
              case AMP:
                this.state = S_ENTITY;
                this.entityReturnState = S_TEXT;
                if (handler !== void 0) {
                  this.text += chunk.slice(start, this.prevI);
                }
                nonSpace = true;
                break outRootLoop;
              case NL_LIKE:
                if (handler !== void 0) {
                  this.text += `${chunk.slice(start, this.prevI)}
`;
                }
                start = this.i;
                break;
              case EOC:
                if (handler !== void 0) {
                  this.text += chunk.slice(start);
                }
                break outRootLoop;
              default:
                if (!isS(code)) {
                  nonSpace = true;
                }
            }
          }
        if (!nonSpace) {
          return;
        }
        if (!this.sawRoot && !this.reportedTextBeforeRoot) {
          this.fail("text data outside of root node.");
          this.reportedTextBeforeRoot = true;
        }
        if (this.closedRoot && !this.reportedTextAfterRoot) {
          this.fail("text data outside of root node.");
          this.reportedTextAfterRoot = true;
        }
      }
      pushAttribNS(name, value) {
        var _a;
        const { prefix, local } = this.qname(name);
        const attr = { name, prefix, local, value };
        this.attribList.push(attr);
        (_a = this.attributeHandler) === null || _a === void 0 ? void 0 : _a.call(this, attr);
        if (prefix === "xmlns") {
          const trimmed = value.trim();
          if (this.currentXMLVersion === "1.0" && trimmed === "") {
            this.fail("invalid attempt to undefine prefix in XML 1.0");
          }
          this.topNS[local] = trimmed;
          nsPairCheck(this, local, trimmed);
        } else if (name === "xmlns") {
          const trimmed = value.trim();
          this.topNS[""] = trimmed;
          nsPairCheck(this, "", trimmed);
        }
      }
      pushAttribPlain(name, value) {
        var _a;
        const attr = { name, value };
        this.attribList.push(attr);
        (_a = this.attributeHandler) === null || _a === void 0 ? void 0 : _a.call(this, attr);
      }
      /**
       * End parsing. This performs final well-formedness checks and resets the
       * parser to a clean state.
       *
       * @returns this
       */
      end() {
        var _a, _b;
        if (!this.sawRoot) {
          this.fail("document must contain a root element.");
        }
        const { tags } = this;
        while (tags.length > 0) {
          const tag = tags.pop();
          this.fail(`unclosed tag: ${tag.name}`);
        }
        if (this.state !== S_BEGIN && this.state !== S_TEXT) {
          this.fail("unexpected end.");
        }
        const { text } = this;
        if (text.length !== 0) {
          (_a = this.textHandler) === null || _a === void 0 ? void 0 : _a.call(this, text);
          this.text = "";
        }
        this._closed = true;
        (_b = this.endHandler) === null || _b === void 0 ? void 0 : _b.call(this);
        this._init();
        return this;
      }
      /**
       * Resolve a namespace prefix.
       *
       * @param prefix The prefix to resolve.
       *
       * @returns The namespace URI or ``undefined`` if the prefix is not defined.
       */
      resolve(prefix) {
        var _a, _b;
        let uri = this.topNS[prefix];
        if (uri !== void 0) {
          return uri;
        }
        const { tags } = this;
        for (let index = tags.length - 1; index >= 0; index--) {
          uri = tags[index].ns[prefix];
          if (uri !== void 0) {
            return uri;
          }
        }
        uri = this.ns[prefix];
        if (uri !== void 0) {
          return uri;
        }
        return (_b = (_a = this.opt).resolvePrefix) === null || _b === void 0 ? void 0 : _b.call(_a, prefix);
      }
      /**
       * Parse a qname into its prefix and local name parts.
       *
       * @param name The name to parse
       *
       * @returns
       */
      qname(name) {
        const colon = name.indexOf(":");
        if (colon === -1) {
          return { prefix: "", local: name };
        }
        const local = name.slice(colon + 1);
        const prefix = name.slice(0, colon);
        if (prefix === "" || local === "" || local.includes(":")) {
          this.fail(`malformed name: ${name}.`);
        }
        return { prefix, local };
      }
      processAttribsNS() {
        var _a;
        const { attribList } = this;
        const tag = this.tag;
        {
          const { prefix, local } = this.qname(tag.name);
          tag.prefix = prefix;
          tag.local = local;
          const uri = tag.uri = (_a = this.resolve(prefix)) !== null && _a !== void 0 ? _a : "";
          if (prefix !== "") {
            if (prefix === "xmlns") {
              this.fail('tags may not have "xmlns" as prefix.');
            }
            if (uri === "") {
              this.fail(`unbound namespace prefix: ${JSON.stringify(prefix)}.`);
              tag.uri = prefix;
            }
          }
        }
        if (attribList.length === 0) {
          return;
        }
        const { attributes } = tag;
        const seen = /* @__PURE__ */ new Set();
        for (const attr of attribList) {
          const { name, prefix, local } = attr;
          let uri;
          let eqname;
          if (prefix === "") {
            uri = name === "xmlns" ? XMLNS_NAMESPACE : "";
            eqname = name;
          } else {
            uri = this.resolve(prefix);
            if (uri === void 0) {
              this.fail(`unbound namespace prefix: ${JSON.stringify(prefix)}.`);
              uri = prefix;
            }
            eqname = `{${uri}}${local}`;
          }
          if (seen.has(eqname)) {
            this.fail(`duplicate attribute: ${eqname}.`);
          }
          seen.add(eqname);
          attr.uri = uri;
          attributes[name] = attr;
        }
        this.attribList = [];
      }
      processAttribsPlain() {
        const { attribList } = this;
        const attributes = this.tag.attributes;
        for (const { name, value } of attribList) {
          if (attributes[name] !== void 0) {
            this.fail(`duplicate attribute: ${name}.`);
          }
          attributes[name] = value;
        }
        this.attribList = [];
      }
      /**
       * Handle a complete open tag. This parser code calls this once it has seen
       * the whole tag. This method checks for well-formeness and then emits
       * ``onopentag``.
       */
      openTag() {
        var _a;
        this.processAttribs();
        const { tags } = this;
        const tag = this.tag;
        tag.isSelfClosing = false;
        (_a = this.openTagHandler) === null || _a === void 0 ? void 0 : _a.call(this, tag);
        tags.push(tag);
        this.state = S_TEXT;
        this.name = "";
      }
      /**
       * Handle a complete self-closing tag. This parser code calls this once it has
       * seen the whole tag. This method checks for well-formeness and then emits
       * ``onopentag`` and ``onclosetag``.
       */
      openSelfClosingTag() {
        var _a, _b, _c;
        this.processAttribs();
        const { tags } = this;
        const tag = this.tag;
        tag.isSelfClosing = true;
        (_a = this.openTagHandler) === null || _a === void 0 ? void 0 : _a.call(this, tag);
        (_b = this.closeTagHandler) === null || _b === void 0 ? void 0 : _b.call(this, tag);
        const top = this.tag = (_c = tags[tags.length - 1]) !== null && _c !== void 0 ? _c : null;
        if (top === null) {
          this.closedRoot = true;
        }
        this.state = S_TEXT;
        this.name = "";
      }
      /**
       * Handle a complete close tag. This parser code calls this once it has seen
       * the whole tag. This method checks for well-formeness and then emits
       * ``onclosetag``.
       */
      closeTag() {
        const { tags, name } = this;
        this.state = S_TEXT;
        this.name = "";
        if (name === "") {
          this.fail("weird empty close tag.");
          this.text += "</>";
          return;
        }
        const handler = this.closeTagHandler;
        let l = tags.length;
        while (l-- > 0) {
          const tag = this.tag = tags.pop();
          this.topNS = tag.ns;
          handler === null || handler === void 0 ? void 0 : handler(tag);
          if (tag.name === name) {
            break;
          }
          this.fail("unexpected close tag.");
        }
        if (l === 0) {
          this.closedRoot = true;
        } else if (l < 0) {
          this.fail(`unmatched closing tag: ${name}.`);
          this.text += `</${name}>`;
        }
      }
      /**
       * Resolves an entity. Makes any necessary well-formedness checks.
       *
       * @param entity The entity to resolve.
       *
       * @returns The parsed entity.
       */
      parseEntity(entity) {
        if (entity[0] !== "#") {
          const defined = this.ENTITIES[entity];
          if (defined !== void 0) {
            return defined;
          }
          this.fail(this.isName(entity) ? "undefined entity." : "disallowed character in entity name.");
          return `&${entity};`;
        }
        let num = NaN;
        if (entity[1] === "x" && /^#x[0-9a-f]+$/i.test(entity)) {
          num = parseInt(entity.slice(2), 16);
        } else if (/^#[0-9]+$/.test(entity)) {
          num = parseInt(entity.slice(1), 10);
        }
        if (!this.isChar(num)) {
          this.fail("malformed character entity.");
          return `&${entity};`;
        }
        return String.fromCodePoint(num);
      }
    };
    exports.SaxesParser = SaxesParser;
  }
});

// ../../../../node_modules/.pnpm/pend@1.2.0/node_modules/pend/index.js
var require_pend = __commonJS({
  "../../../../node_modules/.pnpm/pend@1.2.0/node_modules/pend/index.js"(exports, module) {
    module.exports = Pend;
    function Pend() {
      this.pending = 0;
      this.max = Infinity;
      this.listeners = [];
      this.waiting = [];
      this.error = null;
    }
    Pend.prototype.go = function(fn) {
      if (this.pending < this.max) {
        pendGo(this, fn);
      } else {
        this.waiting.push(fn);
      }
    };
    Pend.prototype.wait = function(cb) {
      if (this.pending === 0) {
        cb(this.error);
      } else {
        this.listeners.push(cb);
      }
    };
    Pend.prototype.hold = function() {
      return pendHold(this);
    };
    function pendHold(self) {
      self.pending += 1;
      var called = false;
      return onCb;
      function onCb(err) {
        if (called) throw new Error("callback called twice");
        called = true;
        self.error = self.error || err;
        self.pending -= 1;
        if (self.waiting.length > 0 && self.pending < self.max) {
          pendGo(self, self.waiting.shift());
        } else if (self.pending === 0) {
          var listeners = self.listeners;
          self.listeners = [];
          listeners.forEach(cbListener);
        }
      }
      function cbListener(listener) {
        listener(self.error);
      }
    }
    function pendGo(self, fn) {
      fn(pendHold(self));
    }
  }
});

// ../../../../node_modules/.pnpm/fd-slicer@1.1.0/node_modules/fd-slicer/index.js
var require_fd_slicer = __commonJS({
  "../../../../node_modules/.pnpm/fd-slicer@1.1.0/node_modules/fd-slicer/index.js"(exports) {
    var fs = __require("fs");
    var util = __require("util");
    var stream = __require("stream");
    var Readable = stream.Readable;
    var Writable = stream.Writable;
    var PassThrough = stream.PassThrough;
    var Pend = require_pend();
    var EventEmitter = __require("events").EventEmitter;
    exports.createFromBuffer = createFromBuffer;
    exports.createFromFd = createFromFd;
    exports.BufferSlicer = BufferSlicer;
    exports.FdSlicer = FdSlicer;
    util.inherits(FdSlicer, EventEmitter);
    function FdSlicer(fd, options2) {
      options2 = options2 || {};
      EventEmitter.call(this);
      this.fd = fd;
      this.pend = new Pend();
      this.pend.max = 1;
      this.refCount = 0;
      this.autoClose = !!options2.autoClose;
    }
    FdSlicer.prototype.read = function(buffer, offset, length, position, callback) {
      var self = this;
      self.pend.go(function(cb) {
        fs.read(self.fd, buffer, offset, length, position, function(err, bytesRead, buffer2) {
          cb();
          callback(err, bytesRead, buffer2);
        });
      });
    };
    FdSlicer.prototype.write = function(buffer, offset, length, position, callback) {
      var self = this;
      self.pend.go(function(cb) {
        fs.write(self.fd, buffer, offset, length, position, function(err, written, buffer2) {
          cb();
          callback(err, written, buffer2);
        });
      });
    };
    FdSlicer.prototype.createReadStream = function(options2) {
      return new ReadStream(this, options2);
    };
    FdSlicer.prototype.createWriteStream = function(options2) {
      return new WriteStream(this, options2);
    };
    FdSlicer.prototype.ref = function() {
      this.refCount += 1;
    };
    FdSlicer.prototype.unref = function() {
      var self = this;
      self.refCount -= 1;
      if (self.refCount > 0) return;
      if (self.refCount < 0) throw new Error("invalid unref");
      if (self.autoClose) {
        fs.close(self.fd, onCloseDone);
      }
      function onCloseDone(err) {
        if (err) {
          self.emit("error", err);
        } else {
          self.emit("close");
        }
      }
    };
    util.inherits(ReadStream, Readable);
    function ReadStream(context, options2) {
      options2 = options2 || {};
      Readable.call(this, options2);
      this.context = context;
      this.context.ref();
      this.start = options2.start || 0;
      this.endOffset = options2.end;
      this.pos = this.start;
      this.destroyed = false;
    }
    ReadStream.prototype._read = function(n) {
      var self = this;
      if (self.destroyed) return;
      var toRead = Math.min(self._readableState.highWaterMark, n);
      if (self.endOffset != null) {
        toRead = Math.min(toRead, self.endOffset - self.pos);
      }
      if (toRead <= 0) {
        self.destroyed = true;
        self.push(null);
        self.context.unref();
        return;
      }
      self.context.pend.go(function(cb) {
        if (self.destroyed) return cb();
        var buffer = new Buffer(toRead);
        fs.read(self.context.fd, buffer, 0, toRead, self.pos, function(err, bytesRead) {
          if (err) {
            self.destroy(err);
          } else if (bytesRead === 0) {
            self.destroyed = true;
            self.push(null);
            self.context.unref();
          } else {
            self.pos += bytesRead;
            self.push(buffer.slice(0, bytesRead));
          }
          cb();
        });
      });
    };
    ReadStream.prototype.destroy = function(err) {
      if (this.destroyed) return;
      err = err || new Error("stream destroyed");
      this.destroyed = true;
      this.emit("error", err);
      this.context.unref();
    };
    util.inherits(WriteStream, Writable);
    function WriteStream(context, options2) {
      options2 = options2 || {};
      Writable.call(this, options2);
      this.context = context;
      this.context.ref();
      this.start = options2.start || 0;
      this.endOffset = options2.end == null ? Infinity : +options2.end;
      this.bytesWritten = 0;
      this.pos = this.start;
      this.destroyed = false;
      this.on("finish", this.destroy.bind(this));
    }
    WriteStream.prototype._write = function(buffer, encoding, callback) {
      var self = this;
      if (self.destroyed) return;
      if (self.pos + buffer.length > self.endOffset) {
        var err = new Error("maximum file length exceeded");
        err.code = "ETOOBIG";
        self.destroy();
        callback(err);
        return;
      }
      self.context.pend.go(function(cb) {
        if (self.destroyed) return cb();
        fs.write(self.context.fd, buffer, 0, buffer.length, self.pos, function(err2, bytes) {
          if (err2) {
            self.destroy();
            cb();
            callback(err2);
          } else {
            self.bytesWritten += bytes;
            self.pos += bytes;
            self.emit("progress");
            cb();
            callback();
          }
        });
      });
    };
    WriteStream.prototype.destroy = function() {
      if (this.destroyed) return;
      this.destroyed = true;
      this.context.unref();
    };
    util.inherits(BufferSlicer, EventEmitter);
    function BufferSlicer(buffer, options2) {
      EventEmitter.call(this);
      options2 = options2 || {};
      this.refCount = 0;
      this.buffer = buffer;
      this.maxChunkSize = options2.maxChunkSize || Number.MAX_SAFE_INTEGER;
    }
    BufferSlicer.prototype.read = function(buffer, offset, length, position, callback) {
      var end = position + length;
      var delta = end - this.buffer.length;
      var written = delta > 0 ? delta : length;
      this.buffer.copy(buffer, offset, position, end);
      setImmediate(function() {
        callback(null, written);
      });
    };
    BufferSlicer.prototype.write = function(buffer, offset, length, position, callback) {
      buffer.copy(this.buffer, position, offset, offset + length);
      setImmediate(function() {
        callback(null, length, buffer);
      });
    };
    BufferSlicer.prototype.createReadStream = function(options2) {
      options2 = options2 || {};
      var readStream = new PassThrough(options2);
      readStream.destroyed = false;
      readStream.start = options2.start || 0;
      readStream.endOffset = options2.end;
      readStream.pos = readStream.endOffset || this.buffer.length;
      var entireSlice = this.buffer.slice(readStream.start, readStream.pos);
      var offset = 0;
      while (true) {
        var nextOffset = offset + this.maxChunkSize;
        if (nextOffset >= entireSlice.length) {
          if (offset < entireSlice.length) {
            readStream.write(entireSlice.slice(offset, entireSlice.length));
          }
          break;
        }
        readStream.write(entireSlice.slice(offset, nextOffset));
        offset = nextOffset;
      }
      readStream.end();
      readStream.destroy = function() {
        readStream.destroyed = true;
      };
      return readStream;
    };
    BufferSlicer.prototype.createWriteStream = function(options2) {
      var bufferSlicer = this;
      options2 = options2 || {};
      var writeStream = new Writable(options2);
      writeStream.start = options2.start || 0;
      writeStream.endOffset = options2.end == null ? this.buffer.length : +options2.end;
      writeStream.bytesWritten = 0;
      writeStream.pos = writeStream.start;
      writeStream.destroyed = false;
      writeStream._write = function(buffer, encoding, callback) {
        if (writeStream.destroyed) return;
        var end = writeStream.pos + buffer.length;
        if (end > writeStream.endOffset) {
          var err = new Error("maximum file length exceeded");
          err.code = "ETOOBIG";
          writeStream.destroyed = true;
          callback(err);
          return;
        }
        buffer.copy(bufferSlicer.buffer, writeStream.pos, 0, buffer.length);
        writeStream.bytesWritten += buffer.length;
        writeStream.pos = end;
        writeStream.emit("progress");
        callback();
      };
      writeStream.destroy = function() {
        writeStream.destroyed = true;
      };
      return writeStream;
    };
    BufferSlicer.prototype.ref = function() {
      this.refCount += 1;
    };
    BufferSlicer.prototype.unref = function() {
      this.refCount -= 1;
      if (this.refCount < 0) {
        throw new Error("invalid unref");
      }
    };
    function createFromBuffer(buffer, options2) {
      return new BufferSlicer(buffer, options2);
    }
    function createFromFd(fd, options2) {
      return new FdSlicer(fd, options2);
    }
  }
});

// ../../../../node_modules/.pnpm/buffer-crc32@0.2.13/node_modules/buffer-crc32/index.js
var require_buffer_crc32 = __commonJS({
  "../../../../node_modules/.pnpm/buffer-crc32@0.2.13/node_modules/buffer-crc32/index.js"(exports, module) {
    var Buffer2 = __require("buffer").Buffer;
    var CRC_TABLE = [
      0,
      1996959894,
      3993919788,
      2567524794,
      124634137,
      1886057615,
      3915621685,
      2657392035,
      249268274,
      2044508324,
      3772115230,
      2547177864,
      162941995,
      2125561021,
      3887607047,
      2428444049,
      498536548,
      1789927666,
      4089016648,
      2227061214,
      450548861,
      1843258603,
      4107580753,
      2211677639,
      325883990,
      1684777152,
      4251122042,
      2321926636,
      335633487,
      1661365465,
      4195302755,
      2366115317,
      997073096,
      1281953886,
      3579855332,
      2724688242,
      1006888145,
      1258607687,
      3524101629,
      2768942443,
      901097722,
      1119000684,
      3686517206,
      2898065728,
      853044451,
      1172266101,
      3705015759,
      2882616665,
      651767980,
      1373503546,
      3369554304,
      3218104598,
      565507253,
      1454621731,
      3485111705,
      3099436303,
      671266974,
      1594198024,
      3322730930,
      2970347812,
      795835527,
      1483230225,
      3244367275,
      3060149565,
      1994146192,
      31158534,
      2563907772,
      4023717930,
      1907459465,
      112637215,
      2680153253,
      3904427059,
      2013776290,
      251722036,
      2517215374,
      3775830040,
      2137656763,
      141376813,
      2439277719,
      3865271297,
      1802195444,
      476864866,
      2238001368,
      4066508878,
      1812370925,
      453092731,
      2181625025,
      4111451223,
      1706088902,
      314042704,
      2344532202,
      4240017532,
      1658658271,
      366619977,
      2362670323,
      4224994405,
      1303535960,
      984961486,
      2747007092,
      3569037538,
      1256170817,
      1037604311,
      2765210733,
      3554079995,
      1131014506,
      879679996,
      2909243462,
      3663771856,
      1141124467,
      855842277,
      2852801631,
      3708648649,
      1342533948,
      654459306,
      3188396048,
      3373015174,
      1466479909,
      544179635,
      3110523913,
      3462522015,
      1591671054,
      702138776,
      2966460450,
      3352799412,
      1504918807,
      783551873,
      3082640443,
      3233442989,
      3988292384,
      2596254646,
      62317068,
      1957810842,
      3939845945,
      2647816111,
      81470997,
      1943803523,
      3814918930,
      2489596804,
      225274430,
      2053790376,
      3826175755,
      2466906013,
      167816743,
      2097651377,
      4027552580,
      2265490386,
      503444072,
      1762050814,
      4150417245,
      2154129355,
      426522225,
      1852507879,
      4275313526,
      2312317920,
      282753626,
      1742555852,
      4189708143,
      2394877945,
      397917763,
      1622183637,
      3604390888,
      2714866558,
      953729732,
      1340076626,
      3518719985,
      2797360999,
      1068828381,
      1219638859,
      3624741850,
      2936675148,
      906185462,
      1090812512,
      3747672003,
      2825379669,
      829329135,
      1181335161,
      3412177804,
      3160834842,
      628085408,
      1382605366,
      3423369109,
      3138078467,
      570562233,
      1426400815,
      3317316542,
      2998733608,
      733239954,
      1555261956,
      3268935591,
      3050360625,
      752459403,
      1541320221,
      2607071920,
      3965973030,
      1969922972,
      40735498,
      2617837225,
      3943577151,
      1913087877,
      83908371,
      2512341634,
      3803740692,
      2075208622,
      213261112,
      2463272603,
      3855990285,
      2094854071,
      198958881,
      2262029012,
      4057260610,
      1759359992,
      534414190,
      2176718541,
      4139329115,
      1873836001,
      414664567,
      2282248934,
      4279200368,
      1711684554,
      285281116,
      2405801727,
      4167216745,
      1634467795,
      376229701,
      2685067896,
      3608007406,
      1308918612,
      956543938,
      2808555105,
      3495958263,
      1231636301,
      1047427035,
      2932959818,
      3654703836,
      1088359270,
      936918e3,
      2847714899,
      3736837829,
      1202900863,
      817233897,
      3183342108,
      3401237130,
      1404277552,
      615818150,
      3134207493,
      3453421203,
      1423857449,
      601450431,
      3009837614,
      3294710456,
      1567103746,
      711928724,
      3020668471,
      3272380065,
      1510334235,
      755167117
    ];
    if (typeof Int32Array !== "undefined") {
      CRC_TABLE = new Int32Array(CRC_TABLE);
    }
    function ensureBuffer(input) {
      if (Buffer2.isBuffer(input)) {
        return input;
      }
      var hasNewBufferAPI = typeof Buffer2.alloc === "function" && typeof Buffer2.from === "function";
      if (typeof input === "number") {
        return hasNewBufferAPI ? Buffer2.alloc(input) : new Buffer2(input);
      } else if (typeof input === "string") {
        return hasNewBufferAPI ? Buffer2.from(input) : new Buffer2(input);
      } else {
        throw new Error("input must be buffer, number, or string, received " + typeof input);
      }
    }
    function bufferizeInt(num) {
      var tmp = ensureBuffer(4);
      tmp.writeInt32BE(num, 0);
      return tmp;
    }
    function _crc32(buf, previous) {
      buf = ensureBuffer(buf);
      if (Buffer2.isBuffer(previous)) {
        previous = previous.readUInt32BE(0);
      }
      var crc = ~~previous ^ -1;
      for (var n = 0; n < buf.length; n++) {
        crc = CRC_TABLE[(crc ^ buf[n]) & 255] ^ crc >>> 8;
      }
      return crc ^ -1;
    }
    function crc323() {
      return bufferizeInt(_crc32.apply(null, arguments));
    }
    crc323.signed = function() {
      return _crc32.apply(null, arguments);
    };
    crc323.unsigned = function() {
      return _crc32.apply(null, arguments) >>> 0;
    };
    module.exports = crc323;
  }
});

// ../../../../node_modules/.pnpm/yauzl@2.10.0/node_modules/yauzl/index.js
var require_yauzl = __commonJS({
  "../../../../node_modules/.pnpm/yauzl@2.10.0/node_modules/yauzl/index.js"(exports) {
    var fs = __require("fs");
    var zlib = __require("zlib");
    var fd_slicer = require_fd_slicer();
    var crc323 = require_buffer_crc32();
    var util = __require("util");
    var EventEmitter = __require("events").EventEmitter;
    var Transform = __require("stream").Transform;
    var PassThrough = __require("stream").PassThrough;
    var Writable = __require("stream").Writable;
    exports.open = open;
    exports.fromFd = fromFd;
    exports.fromBuffer = fromBuffer;
    exports.fromRandomAccessReader = fromRandomAccessReader;
    exports.dosDateTimeToDate = dosDateTimeToDate;
    exports.validateFileName = validateFileName;
    exports.ZipFile = ZipFile;
    exports.Entry = Entry;
    exports.RandomAccessReader = RandomAccessReader;
    function open(path, options2, callback) {
      if (typeof options2 === "function") {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      if (options2.autoClose == null) options2.autoClose = true;
      if (options2.lazyEntries == null) options2.lazyEntries = false;
      if (options2.decodeStrings == null) options2.decodeStrings = true;
      if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
      if (options2.strictFileNames == null) options2.strictFileNames = false;
      if (callback == null) callback = defaultCallback;
      fs.open(path, "r", function(err, fd) {
        if (err) return callback(err);
        fromFd(fd, options2, function(err2, zipfile) {
          if (err2) fs.close(fd, defaultCallback);
          callback(err2, zipfile);
        });
      });
    }
    function fromFd(fd, options2, callback) {
      if (typeof options2 === "function") {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      if (options2.autoClose == null) options2.autoClose = false;
      if (options2.lazyEntries == null) options2.lazyEntries = false;
      if (options2.decodeStrings == null) options2.decodeStrings = true;
      if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
      if (options2.strictFileNames == null) options2.strictFileNames = false;
      if (callback == null) callback = defaultCallback;
      fs.fstat(fd, function(err, stats) {
        if (err) return callback(err);
        var reader = fd_slicer.createFromFd(fd, { autoClose: true });
        fromRandomAccessReader(reader, stats.size, options2, callback);
      });
    }
    function fromBuffer(buffer, options2, callback) {
      if (typeof options2 === "function") {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      options2.autoClose = false;
      if (options2.lazyEntries == null) options2.lazyEntries = false;
      if (options2.decodeStrings == null) options2.decodeStrings = true;
      if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
      if (options2.strictFileNames == null) options2.strictFileNames = false;
      var reader = fd_slicer.createFromBuffer(buffer, { maxChunkSize: 65536 });
      fromRandomAccessReader(reader, buffer.length, options2, callback);
    }
    function fromRandomAccessReader(reader, totalSize, options2, callback) {
      if (typeof options2 === "function") {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      if (options2.autoClose == null) options2.autoClose = true;
      if (options2.lazyEntries == null) options2.lazyEntries = false;
      if (options2.decodeStrings == null) options2.decodeStrings = true;
      var decodeStrings = !!options2.decodeStrings;
      if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
      if (options2.strictFileNames == null) options2.strictFileNames = false;
      if (callback == null) callback = defaultCallback;
      if (typeof totalSize !== "number") throw new Error("expected totalSize parameter to be a number");
      if (totalSize > Number.MAX_SAFE_INTEGER) {
        throw new Error("zip file too large. only file sizes up to 2^52 are supported due to JavaScript's Number type being an IEEE 754 double.");
      }
      reader.ref();
      var eocdrWithoutCommentSize = 22;
      var maxCommentSize = 65535;
      var bufferSize = Math.min(eocdrWithoutCommentSize + maxCommentSize, totalSize);
      var buffer = newBuffer(bufferSize);
      var bufferReadStart = totalSize - buffer.length;
      readAndAssertNoEof(reader, buffer, 0, bufferSize, bufferReadStart, function(err) {
        if (err) return callback(err);
        for (var i = bufferSize - eocdrWithoutCommentSize; i >= 0; i -= 1) {
          if (buffer.readUInt32LE(i) !== 101010256) continue;
          var eocdrBuffer = buffer.slice(i);
          var diskNumber = eocdrBuffer.readUInt16LE(4);
          if (diskNumber !== 0) {
            return callback(new Error("multi-disk zip files are not supported: found disk number: " + diskNumber));
          }
          var entryCount = eocdrBuffer.readUInt16LE(10);
          var centralDirectoryOffset = eocdrBuffer.readUInt32LE(16);
          var commentLength = eocdrBuffer.readUInt16LE(20);
          var expectedCommentLength = eocdrBuffer.length - eocdrWithoutCommentSize;
          if (commentLength !== expectedCommentLength) {
            return callback(new Error("invalid comment length. expected: " + expectedCommentLength + ". found: " + commentLength));
          }
          var comment = decodeStrings ? decodeBuffer(eocdrBuffer, 22, eocdrBuffer.length, false) : eocdrBuffer.slice(22);
          if (!(entryCount === 65535 || centralDirectoryOffset === 4294967295)) {
            return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options2.autoClose, options2.lazyEntries, decodeStrings, options2.validateEntrySizes, options2.strictFileNames));
          }
          var zip64EocdlBuffer = newBuffer(20);
          var zip64EocdlOffset = bufferReadStart + i - zip64EocdlBuffer.length;
          readAndAssertNoEof(reader, zip64EocdlBuffer, 0, zip64EocdlBuffer.length, zip64EocdlOffset, function(err2) {
            if (err2) return callback(err2);
            if (zip64EocdlBuffer.readUInt32LE(0) !== 117853008) {
              return callback(new Error("invalid zip64 end of central directory locator signature"));
            }
            var zip64EocdrOffset = readUInt64LE(zip64EocdlBuffer, 8);
            var zip64EocdrBuffer = newBuffer(56);
            readAndAssertNoEof(reader, zip64EocdrBuffer, 0, zip64EocdrBuffer.length, zip64EocdrOffset, function(err3) {
              if (err3) return callback(err3);
              if (zip64EocdrBuffer.readUInt32LE(0) !== 101075792) {
                return callback(new Error("invalid zip64 end of central directory record signature"));
              }
              entryCount = readUInt64LE(zip64EocdrBuffer, 32);
              centralDirectoryOffset = readUInt64LE(zip64EocdrBuffer, 48);
              return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options2.autoClose, options2.lazyEntries, decodeStrings, options2.validateEntrySizes, options2.strictFileNames));
            });
          });
          return;
        }
        callback(new Error("end of central directory record signature not found"));
      });
    }
    util.inherits(ZipFile, EventEmitter);
    function ZipFile(reader, centralDirectoryOffset, fileSize, entryCount, comment, autoClose, lazyEntries, decodeStrings, validateEntrySizes, strictFileNames) {
      var self = this;
      EventEmitter.call(self);
      self.reader = reader;
      self.reader.on("error", function(err) {
        emitError(self, err);
      });
      self.reader.once("close", function() {
        self.emit("close");
      });
      self.readEntryCursor = centralDirectoryOffset;
      self.fileSize = fileSize;
      self.entryCount = entryCount;
      self.comment = comment;
      self.entriesRead = 0;
      self.autoClose = !!autoClose;
      self.lazyEntries = !!lazyEntries;
      self.decodeStrings = !!decodeStrings;
      self.validateEntrySizes = !!validateEntrySizes;
      self.strictFileNames = !!strictFileNames;
      self.isOpen = true;
      self.emittedError = false;
      if (!self.lazyEntries) self._readEntry();
    }
    ZipFile.prototype.close = function() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.reader.unref();
    };
    function emitErrorAndAutoClose(self, err) {
      if (self.autoClose) self.close();
      emitError(self, err);
    }
    function emitError(self, err) {
      if (self.emittedError) return;
      self.emittedError = true;
      self.emit("error", err);
    }
    ZipFile.prototype.readEntry = function() {
      if (!this.lazyEntries) throw new Error("readEntry() called without lazyEntries:true");
      this._readEntry();
    };
    ZipFile.prototype._readEntry = function() {
      var self = this;
      if (self.entryCount === self.entriesRead) {
        setImmediate(function() {
          if (self.autoClose) self.close();
          if (self.emittedError) return;
          self.emit("end");
        });
        return;
      }
      if (self.emittedError) return;
      var buffer = newBuffer(46);
      readAndAssertNoEof(self.reader, buffer, 0, buffer.length, self.readEntryCursor, function(err) {
        if (err) return emitErrorAndAutoClose(self, err);
        if (self.emittedError) return;
        var entry = new Entry();
        var signature = buffer.readUInt32LE(0);
        if (signature !== 33639248) return emitErrorAndAutoClose(self, new Error("invalid central directory file header signature: 0x" + signature.toString(16)));
        entry.versionMadeBy = buffer.readUInt16LE(4);
        entry.versionNeededToExtract = buffer.readUInt16LE(6);
        entry.generalPurposeBitFlag = buffer.readUInt16LE(8);
        entry.compressionMethod = buffer.readUInt16LE(10);
        entry.lastModFileTime = buffer.readUInt16LE(12);
        entry.lastModFileDate = buffer.readUInt16LE(14);
        entry.crc32 = buffer.readUInt32LE(16);
        entry.compressedSize = buffer.readUInt32LE(20);
        entry.uncompressedSize = buffer.readUInt32LE(24);
        entry.fileNameLength = buffer.readUInt16LE(28);
        entry.extraFieldLength = buffer.readUInt16LE(30);
        entry.fileCommentLength = buffer.readUInt16LE(32);
        entry.internalFileAttributes = buffer.readUInt16LE(36);
        entry.externalFileAttributes = buffer.readUInt32LE(38);
        entry.relativeOffsetOfLocalHeader = buffer.readUInt32LE(42);
        if (entry.generalPurposeBitFlag & 64) return emitErrorAndAutoClose(self, new Error("strong encryption is not supported"));
        self.readEntryCursor += 46;
        buffer = newBuffer(entry.fileNameLength + entry.extraFieldLength + entry.fileCommentLength);
        readAndAssertNoEof(self.reader, buffer, 0, buffer.length, self.readEntryCursor, function(err2) {
          if (err2) return emitErrorAndAutoClose(self, err2);
          if (self.emittedError) return;
          var isUtf8 = (entry.generalPurposeBitFlag & 2048) !== 0;
          entry.fileName = self.decodeStrings ? decodeBuffer(buffer, 0, entry.fileNameLength, isUtf8) : buffer.slice(0, entry.fileNameLength);
          var fileCommentStart = entry.fileNameLength + entry.extraFieldLength;
          var extraFieldBuffer = buffer.slice(entry.fileNameLength, fileCommentStart);
          entry.extraFields = [];
          var i = 0;
          while (i < extraFieldBuffer.length - 3) {
            var headerId = extraFieldBuffer.readUInt16LE(i + 0);
            var dataSize = extraFieldBuffer.readUInt16LE(i + 2);
            var dataStart = i + 4;
            var dataEnd = dataStart + dataSize;
            if (dataEnd > extraFieldBuffer.length) return emitErrorAndAutoClose(self, new Error("extra field length exceeds extra field buffer size"));
            var dataBuffer = newBuffer(dataSize);
            extraFieldBuffer.copy(dataBuffer, 0, dataStart, dataEnd);
            entry.extraFields.push({
              id: headerId,
              data: dataBuffer
            });
            i = dataEnd;
          }
          entry.fileComment = self.decodeStrings ? decodeBuffer(buffer, fileCommentStart, fileCommentStart + entry.fileCommentLength, isUtf8) : buffer.slice(fileCommentStart, fileCommentStart + entry.fileCommentLength);
          entry.comment = entry.fileComment;
          self.readEntryCursor += buffer.length;
          self.entriesRead += 1;
          if (entry.uncompressedSize === 4294967295 || entry.compressedSize === 4294967295 || entry.relativeOffsetOfLocalHeader === 4294967295) {
            var zip64EiefBuffer = null;
            for (var i = 0; i < entry.extraFields.length; i++) {
              var extraField = entry.extraFields[i];
              if (extraField.id === 1) {
                zip64EiefBuffer = extraField.data;
                break;
              }
            }
            if (zip64EiefBuffer == null) {
              return emitErrorAndAutoClose(self, new Error("expected zip64 extended information extra field"));
            }
            var index = 0;
            if (entry.uncompressedSize === 4294967295) {
              if (index + 8 > zip64EiefBuffer.length) {
                return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include uncompressed size"));
              }
              entry.uncompressedSize = readUInt64LE(zip64EiefBuffer, index);
              index += 8;
            }
            if (entry.compressedSize === 4294967295) {
              if (index + 8 > zip64EiefBuffer.length) {
                return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include compressed size"));
              }
              entry.compressedSize = readUInt64LE(zip64EiefBuffer, index);
              index += 8;
            }
            if (entry.relativeOffsetOfLocalHeader === 4294967295) {
              if (index + 8 > zip64EiefBuffer.length) {
                return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include relative header offset"));
              }
              entry.relativeOffsetOfLocalHeader = readUInt64LE(zip64EiefBuffer, index);
              index += 8;
            }
          }
          if (self.decodeStrings) {
            for (var i = 0; i < entry.extraFields.length; i++) {
              var extraField = entry.extraFields[i];
              if (extraField.id === 28789) {
                if (extraField.data.length < 6) {
                  continue;
                }
                if (extraField.data.readUInt8(0) !== 1) {
                  continue;
                }
                var oldNameCrc32 = extraField.data.readUInt32LE(1);
                if (crc323.unsigned(buffer.slice(0, entry.fileNameLength)) !== oldNameCrc32) {
                  continue;
                }
                entry.fileName = decodeBuffer(extraField.data, 5, extraField.data.length, true);
                break;
              }
            }
          }
          if (self.validateEntrySizes && entry.compressionMethod === 0) {
            var expectedCompressedSize = entry.uncompressedSize;
            if (entry.isEncrypted()) {
              expectedCompressedSize += 12;
            }
            if (entry.compressedSize !== expectedCompressedSize) {
              var msg = "compressed/uncompressed size mismatch for stored file: " + entry.compressedSize + " != " + entry.uncompressedSize;
              return emitErrorAndAutoClose(self, new Error(msg));
            }
          }
          if (self.decodeStrings) {
            if (!self.strictFileNames) {
              entry.fileName = entry.fileName.replace(/\\/g, "/");
            }
            var errorMessage = validateFileName(entry.fileName, self.validateFileNameOptions);
            if (errorMessage != null) return emitErrorAndAutoClose(self, new Error(errorMessage));
          }
          self.emit("entry", entry);
          if (!self.lazyEntries) self._readEntry();
        });
      });
    };
    ZipFile.prototype.openReadStream = function(entry, options2, callback) {
      var self = this;
      var relativeStart = 0;
      var relativeEnd = entry.compressedSize;
      if (callback == null) {
        callback = options2;
        options2 = {};
      } else {
        if (options2.decrypt != null) {
          if (!entry.isEncrypted()) {
            throw new Error("options.decrypt can only be specified for encrypted entries");
          }
          if (options2.decrypt !== false) throw new Error("invalid options.decrypt value: " + options2.decrypt);
          if (entry.isCompressed()) {
            if (options2.decompress !== false) throw new Error("entry is encrypted and compressed, and options.decompress !== false");
          }
        }
        if (options2.decompress != null) {
          if (!entry.isCompressed()) {
            throw new Error("options.decompress can only be specified for compressed entries");
          }
          if (!(options2.decompress === false || options2.decompress === true)) {
            throw new Error("invalid options.decompress value: " + options2.decompress);
          }
        }
        if (options2.start != null || options2.end != null) {
          if (entry.isCompressed() && options2.decompress !== false) {
            throw new Error("start/end range not allowed for compressed entry without options.decompress === false");
          }
          if (entry.isEncrypted() && options2.decrypt !== false) {
            throw new Error("start/end range not allowed for encrypted entry without options.decrypt === false");
          }
        }
        if (options2.start != null) {
          relativeStart = options2.start;
          if (relativeStart < 0) throw new Error("options.start < 0");
          if (relativeStart > entry.compressedSize) throw new Error("options.start > entry.compressedSize");
        }
        if (options2.end != null) {
          relativeEnd = options2.end;
          if (relativeEnd < 0) throw new Error("options.end < 0");
          if (relativeEnd > entry.compressedSize) throw new Error("options.end > entry.compressedSize");
          if (relativeEnd < relativeStart) throw new Error("options.end < options.start");
        }
      }
      if (!self.isOpen) return callback(new Error("closed"));
      if (entry.isEncrypted()) {
        if (options2.decrypt !== false) return callback(new Error("entry is encrypted, and options.decrypt !== false"));
      }
      self.reader.ref();
      var buffer = newBuffer(30);
      readAndAssertNoEof(self.reader, buffer, 0, buffer.length, entry.relativeOffsetOfLocalHeader, function(err) {
        try {
          if (err) return callback(err);
          var signature = buffer.readUInt32LE(0);
          if (signature !== 67324752) {
            return callback(new Error("invalid local file header signature: 0x" + signature.toString(16)));
          }
          var fileNameLength = buffer.readUInt16LE(26);
          var extraFieldLength = buffer.readUInt16LE(28);
          var localFileHeaderEnd = entry.relativeOffsetOfLocalHeader + buffer.length + fileNameLength + extraFieldLength;
          var decompress;
          if (entry.compressionMethod === 0) {
            decompress = false;
          } else if (entry.compressionMethod === 8) {
            decompress = options2.decompress != null ? options2.decompress : true;
          } else {
            return callback(new Error("unsupported compression method: " + entry.compressionMethod));
          }
          var fileDataStart = localFileHeaderEnd;
          var fileDataEnd = fileDataStart + entry.compressedSize;
          if (entry.compressedSize !== 0) {
            if (fileDataEnd > self.fileSize) {
              return callback(new Error("file data overflows file bounds: " + fileDataStart + " + " + entry.compressedSize + " > " + self.fileSize));
            }
          }
          var readStream = self.reader.createReadStream({
            start: fileDataStart + relativeStart,
            end: fileDataStart + relativeEnd
          });
          var endpointStream = readStream;
          if (decompress) {
            var destroyed = false;
            var inflateFilter = zlib.createInflateRaw();
            readStream.on("error", function(err2) {
              setImmediate(function() {
                if (!destroyed) inflateFilter.emit("error", err2);
              });
            });
            readStream.pipe(inflateFilter);
            if (self.validateEntrySizes) {
              endpointStream = new AssertByteCountStream(entry.uncompressedSize);
              inflateFilter.on("error", function(err2) {
                setImmediate(function() {
                  if (!destroyed) endpointStream.emit("error", err2);
                });
              });
              inflateFilter.pipe(endpointStream);
            } else {
              endpointStream = inflateFilter;
            }
            endpointStream.destroy = function() {
              destroyed = true;
              if (inflateFilter !== endpointStream) inflateFilter.unpipe(endpointStream);
              readStream.unpipe(inflateFilter);
              readStream.destroy();
            };
          }
          callback(null, endpointStream);
        } finally {
          self.reader.unref();
        }
      });
    };
    function Entry() {
    }
    Entry.prototype.getLastModDate = function() {
      return dosDateTimeToDate(this.lastModFileDate, this.lastModFileTime);
    };
    Entry.prototype.isEncrypted = function() {
      return (this.generalPurposeBitFlag & 1) !== 0;
    };
    Entry.prototype.isCompressed = function() {
      return this.compressionMethod === 8;
    };
    function dosDateTimeToDate(date, time) {
      var day = date & 31;
      var month = (date >> 5 & 15) - 1;
      var year = (date >> 9 & 127) + 1980;
      var millisecond = 0;
      var second = (time & 31) * 2;
      var minute = time >> 5 & 63;
      var hour = time >> 11 & 31;
      return new Date(year, month, day, hour, minute, second, millisecond);
    }
    function validateFileName(fileName) {
      if (fileName.indexOf("\\") !== -1) {
        return "invalid characters in fileName: " + fileName;
      }
      if (/^[a-zA-Z]:/.test(fileName) || /^\//.test(fileName)) {
        return "absolute path: " + fileName;
      }
      if (fileName.split("/").indexOf("..") !== -1) {
        return "invalid relative path: " + fileName;
      }
      return null;
    }
    function readAndAssertNoEof(reader, buffer, offset, length, position, callback) {
      if (length === 0) {
        return setImmediate(function() {
          callback(null, newBuffer(0));
        });
      }
      reader.read(buffer, offset, length, position, function(err, bytesRead) {
        if (err) return callback(err);
        if (bytesRead < length) {
          return callback(new Error("unexpected EOF"));
        }
        callback();
      });
    }
    util.inherits(AssertByteCountStream, Transform);
    function AssertByteCountStream(byteCount) {
      Transform.call(this);
      this.actualByteCount = 0;
      this.expectedByteCount = byteCount;
    }
    AssertByteCountStream.prototype._transform = function(chunk, encoding, cb) {
      this.actualByteCount += chunk.length;
      if (this.actualByteCount > this.expectedByteCount) {
        var msg = "too many bytes in the stream. expected " + this.expectedByteCount + ". got at least " + this.actualByteCount;
        return cb(new Error(msg));
      }
      cb(null, chunk);
    };
    AssertByteCountStream.prototype._flush = function(cb) {
      if (this.actualByteCount < this.expectedByteCount) {
        var msg = "not enough bytes in the stream. expected " + this.expectedByteCount + ". got only " + this.actualByteCount;
        return cb(new Error(msg));
      }
      cb();
    };
    util.inherits(RandomAccessReader, EventEmitter);
    function RandomAccessReader() {
      EventEmitter.call(this);
      this.refCount = 0;
    }
    RandomAccessReader.prototype.ref = function() {
      this.refCount += 1;
    };
    RandomAccessReader.prototype.unref = function() {
      var self = this;
      self.refCount -= 1;
      if (self.refCount > 0) return;
      if (self.refCount < 0) throw new Error("invalid unref");
      self.close(onCloseDone);
      function onCloseDone(err) {
        if (err) return self.emit("error", err);
        self.emit("close");
      }
    };
    RandomAccessReader.prototype.createReadStream = function(options2) {
      var start = options2.start;
      var end = options2.end;
      if (start === end) {
        var emptyStream = new PassThrough();
        setImmediate(function() {
          emptyStream.end();
        });
        return emptyStream;
      }
      var stream = this._readStreamForRange(start, end);
      var destroyed = false;
      var refUnrefFilter = new RefUnrefFilter(this);
      stream.on("error", function(err) {
        setImmediate(function() {
          if (!destroyed) refUnrefFilter.emit("error", err);
        });
      });
      refUnrefFilter.destroy = function() {
        stream.unpipe(refUnrefFilter);
        refUnrefFilter.unref();
        stream.destroy();
      };
      var byteCounter = new AssertByteCountStream(end - start);
      refUnrefFilter.on("error", function(err) {
        setImmediate(function() {
          if (!destroyed) byteCounter.emit("error", err);
        });
      });
      byteCounter.destroy = function() {
        destroyed = true;
        refUnrefFilter.unpipe(byteCounter);
        refUnrefFilter.destroy();
      };
      return stream.pipe(refUnrefFilter).pipe(byteCounter);
    };
    RandomAccessReader.prototype._readStreamForRange = function(start, end) {
      throw new Error("not implemented");
    };
    RandomAccessReader.prototype.read = function(buffer, offset, length, position, callback) {
      var readStream = this.createReadStream({ start: position, end: position + length });
      var writeStream = new Writable();
      var written = 0;
      writeStream._write = function(chunk, encoding, cb) {
        chunk.copy(buffer, offset + written, 0, chunk.length);
        written += chunk.length;
        cb();
      };
      writeStream.on("finish", callback);
      readStream.on("error", function(error) {
        callback(error);
      });
      readStream.pipe(writeStream);
    };
    RandomAccessReader.prototype.close = function(callback) {
      setImmediate(callback);
    };
    util.inherits(RefUnrefFilter, PassThrough);
    function RefUnrefFilter(context) {
      PassThrough.call(this);
      this.context = context;
      this.context.ref();
      this.unreffedYet = false;
    }
    RefUnrefFilter.prototype._flush = function(cb) {
      this.unref();
      cb();
    };
    RefUnrefFilter.prototype.unref = function(cb) {
      if (this.unreffedYet) return;
      this.unreffedYet = true;
      this.context.unref();
    };
    var cp437 = "\0\u263A\u263B\u2665\u2666\u2663\u2660\u2022\u25D8\u25CB\u25D9\u2642\u2640\u266A\u266B\u263C\u25BA\u25C4\u2195\u203C\xB6\xA7\u25AC\u21A8\u2191\u2193\u2192\u2190\u221F\u2194\u25B2\u25BC !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\u2302\xC7\xFC\xE9\xE2\xE4\xE0\xE5\xE7\xEA\xEB\xE8\xEF\xEE\xEC\xC4\xC5\xC9\xE6\xC6\xF4\xF6\xF2\xFB\xF9\xFF\xD6\xDC\xA2\xA3\xA5\u20A7\u0192\xE1\xED\xF3\xFA\xF1\xD1\xAA\xBA\xBF\u2310\xAC\xBD\xBC\xA1\xAB\xBB\u2591\u2592\u2593\u2502\u2524\u2561\u2562\u2556\u2555\u2563\u2551\u2557\u255D\u255C\u255B\u2510\u2514\u2534\u252C\u251C\u2500\u253C\u255E\u255F\u255A\u2554\u2569\u2566\u2560\u2550\u256C\u2567\u2568\u2564\u2565\u2559\u2558\u2552\u2553\u256B\u256A\u2518\u250C\u2588\u2584\u258C\u2590\u2580\u03B1\xDF\u0393\u03C0\u03A3\u03C3\xB5\u03C4\u03A6\u0398\u03A9\u03B4\u221E\u03C6\u03B5\u2229\u2261\xB1\u2265\u2264\u2320\u2321\xF7\u2248\xB0\u2219\xB7\u221A\u207F\xB2\u25A0\xA0";
    function decodeBuffer(buffer, start, end, isUtf8) {
      if (isUtf8) {
        return buffer.toString("utf8", start, end);
      } else {
        var result = "";
        for (var i = start; i < end; i++) {
          result += cp437[buffer[i]];
        }
        return result;
      }
    }
    function readUInt64LE(buffer, offset) {
      var lower32 = buffer.readUInt32LE(offset);
      var upper32 = buffer.readUInt32LE(offset + 4);
      return upper32 * 4294967296 + lower32;
    }
    var newBuffer;
    if (typeof Buffer.allocUnsafe === "function") {
      newBuffer = function(len) {
        return Buffer.allocUnsafe(len);
      };
    } else {
      newBuffer = function(len) {
        return new Buffer(len);
      };
    }
    function defaultCallback(err) {
      if (err) throw err;
    }
  }
});

// ../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/buffer-reader.js
var require_buffer_reader = __commonJS({
  "../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/buffer-reader.js"(exports, module) {
    var BufferReader = class _BufferReader {
      constructor(buffer) {
        this._buffer = buffer;
      }
      open() {
        return Promise.resolve();
      }
      close() {
        return Promise.resolve();
      }
      read(buffer, offset, length, position) {
        this._buffer.copy(buffer, offset, position, position + length);
        return Promise.resolve(buffer);
      }
      buffer() {
        return this._buffer;
      }
      static isBufferReader(instance) {
        return instance instanceof _BufferReader;
      }
    };
    module.exports = BufferReader;
  }
});

// ../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/file-reader.js
var require_file_reader = __commonJS({
  "../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/file-reader.js"(exports, module) {
    var fs = __require("fs");
    var FileReader = class _FileReader {
      /**
       * Creates a new file reader instance, using the given filename.
       * @param {*} filename 
       */
      constructor(filename) {
        this._filename = filename;
      }
      /**
       * Opens the file descriptor for a file, and returns a promise that resolves
       * when the file is open. After this, {@link FileReader#read} can be called 
       * to read file content into a buffer.
       * @returns a promise
       */
      open() {
        return new Promise((resolve2, reject) => {
          fs.open(this._filename, "r", 438, (err, fd) => {
            if (err) {
              return reject(err);
            }
            this._fd = fd;
            resolve2();
          });
        });
      }
      /**
       * Closes the file descriptor associated with an open document, if there
       * is one, and returns a promise that resolves when the file handle is closed.
       * @returns a promise
       */
      close() {
        return new Promise((resolve2, reject) => {
          if (this._fd) {
            fs.close(this._fd, (err) => {
              if (err) {
                return reject(err);
              }
              delete this._fd;
              resolve2();
            });
          } else {
            resolve2();
          }
        });
      }
      /**
       * Reads a buffer of `length` bytes into the `buffer`. The new data will
       * be added to the buffer at offset `offset`, and will be read from the
       * file starting at position `position`
       * @param {*} buffer 
       * @param {*} offset 
       * @param {*} length 
       * @param {*} position 
       * @returns a promise that resolves to the buffer when the data is present
       */
      read(buffer, offset, length, position) {
        return new Promise((resolve2, reject) => {
          if (!this._fd) {
            return reject(new Error("file not open"));
          }
          fs.read(this._fd, buffer, offset, length, position, (err, bytesRead, buffer2) => {
            if (err) {
              return reject(err);
            }
            resolve2(buffer2);
          });
        });
      }
      /**
       * Returns the open file descriptor
       * @returns the file descriptor
       */
      fd() {
        return this._fd;
      }
      /**
       * Returns true if the passed instance is an instance of this class.
       * @param {*} instance 
       * @returns true if `instance` is an instance of {@link FileReader}.
       */
      static isFileReader(instance) {
        return instance instanceof _FileReader;
      }
    };
    module.exports = FileReader;
  }
});

// ../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/open-office-extractor.js
var require_open_office_extractor = __commonJS({
  "../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/open-office-extractor.js"(exports, module) {
    var path = __require("path");
    var SAXES = require_saxes();
    var yauzl2 = require_yauzl();
    var BufferReader = require_buffer_reader();
    var FileReader = require_file_reader();
    var Document = require_document();
    function each(callback, array, index) {
      if (index === array.length) {
        return Promise.resolve();
      } else {
        return Promise.resolve(callback(array[index++])).then(() => each(callback, array, index));
      }
    }
    var OpenOfficeExtractor = class {
      constructor() {
        this._streamTypes = {
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": true,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml": true,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml": true,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml": true,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml": true,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml": true,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml": true,
          "application/vnd.openxmlformats-package.relationships+xml": true
        };
        this._headerTypes = {
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header": true,
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer": true
        };
        this._actions = {};
        this._defaults = {};
      }
      shouldProcess(filename) {
        if (this._actions[filename]) {
          return true;
        }
        const extension = path.posix.extname(filename).replace(/^\./, "");
        if (!extension) {
          return false;
        }
        const defaultType = this._defaults[extension];
        if (defaultType && this._streamTypes[defaultType]) {
          return true;
        }
        return false;
      }
      openArchive(reader) {
        if (BufferReader.isBufferReader(reader)) {
          return new Promise((resolve2, reject) => {
            yauzl2.fromBuffer(reader.buffer(), { lazyEntries: true }, function(err, zipfile) {
              if (err) {
                return reject(err);
              }
              resolve2(zipfile);
            });
          });
        } else if (FileReader.isFileReader(reader)) {
          return new Promise((resolve2, reject) => {
            yauzl2.fromFd(reader.fd(), { lazyEntries: true, autoClose: false }, function(err, zipfile) {
              if (err) {
                return reject(err);
              }
              resolve2(zipfile);
            });
          });
        } else {
          throw new Error("Unexpected reader type: " + reader.constructor.name);
        }
      }
      processEntries(zipfile) {
        let entryTable = {};
        let entryNames = [];
        return new Promise((resolve2, reject) => {
          zipfile.readEntry();
          zipfile.on("error", reject);
          zipfile.on("entry", (entry) => {
            const filename = entry.fileName;
            entryTable[filename] = entry;
            entryNames.push(filename);
            zipfile.readEntry();
          });
          zipfile.on("end", () => resolve2(this._document));
        }).then(() => {
          const index = entryNames.indexOf("[Content_Types].xml");
          if (index === -1) {
            throw new Error("Invalid Open Office XML: missing content types");
          }
          entryNames.splice(index, 1);
          entryNames.unshift("[Content_Types].xml");
          this._actions["[Content_Types].xml"] = true;
          return each((name) => {
            if (this.shouldProcess(name)) {
              return this.handleEntry(zipfile, entryTable[name]);
            }
          }, entryNames, 0);
        });
      }
      extract(reader) {
        let archive = this.openArchive(reader);
        this._document = new Document();
        this._relationships = {};
        this._entryTable = {};
        this._entries = [];
        return archive.then((zipfile) => this.processEntries(zipfile)).then(() => {
          let document2 = this._document;
          if (document2._textboxes && document2._textboxes.length > 0) {
            document2._textboxes = document2._textboxes + "\n";
          }
          if (document2._headerTextboxes && document2._headerTextboxes.length > 0) {
            document2._headerTextboxes = document2._headerTextboxes + "\n";
          }
          return document2;
        });
      }
      handleOpenTag(node) {
        if (node.name === "Override") {
          const actionFunction = this._streamTypes[node.attributes["ContentType"]];
          if (actionFunction) {
            const partName = node.attributes["PartName"].replace(/^[/]+/, "");
            const action = { action: actionFunction, type: node.attributes["ContentType"] };
            this._actions[partName] = action;
          }
        } else if (node.name === "Default") {
          const extension = node.attributes["Extension"];
          const contentType = node.attributes["ContentType"];
          this._defaults[extension] = contentType;
        } else if (node.name === "Relationship") {
          this._relationships[node.attributes["Id"]] = {
            type: node.attributes["Type"],
            target: node.attributes["Target"]
          };
        } else if (node.name === "w:document" || node.name === "w:footnotes" || node.name === "w:endnotes" || node.name === "w:comments") {
          this._context = ["content", "body"];
          this._pieces = [];
        } else if (node.name === "w:hdr" || node.name === "w:ftr") {
          this._context = ["content", "header"];
          this._pieces = [];
        } else if (node.name === "w:endnote" || node.name === "w:footnote") {
          const type = node.attributes["w:type"] || this._context[0];
          this._context.unshift(type);
        } else if (node.name === "w:tab" && this._context[0] === "content") {
          this._pieces.push("	");
        } else if (node.name === "w:br" && this._context[0] === "content") {
          if ((node.attributes["w:type"] || "") === "page") {
            this._pieces.push("\n");
          } else {
            this._pieces.push("\n");
          }
        } else if (node.name === "w:del" || node.name === "w:instrText") {
          this._context.unshift("deleted");
        } else if (node.name === "w:tabs") {
          this._context.unshift("tabs");
        } else if (node.name === "w:tc") {
          this._context.unshift("cell");
        } else if (node.name === "w:drawing") {
          this._context.unshift("drawing");
        } else if (node.name === "w:txbxContent") {
          this._context.unshift(this._pieces);
          this._context.unshift("textbox");
          this._pieces = [];
        }
      }
      handleCloseTag(node) {
        if (node.name === "w:document") {
          this._context = null;
          this._document._body = this._pieces.join("");
        } else if (node.name === "w:footnote" || node.name === "w:endnote") {
          this._context.shift();
        } else if (node.name === "w:footnotes") {
          this._context = null;
          this._document._footnotes = this._pieces.join("");
        } else if (node.name === "w:endnotes") {
          this._context = null;
          this._document._endnotes = this._pieces.join("");
        } else if (node.name === "w:comments") {
          this._context = null;
          this._document._annotations = this._pieces.join("");
        } else if (node.name === "w:hdr") {
          this._context = null;
          this._document._headers = this._document._headers + this._pieces.join("");
        } else if (node.name === "w:ftr") {
          this._context = null;
          this._document._footers = this._document._footers + this._pieces.join("");
        } else if (node.name === "w:p") {
          if (this._context[0] === "content" || this._context[0] === "cell" || this._context[0] === "textbox") {
            this._pieces.push("\n");
          }
        } else if (node.name === "w:del" || node.name === "w:instrText") {
          this._context.shift();
        } else if (node.name === "w:tabs") {
          this._context.shift();
        } else if (node.name === "w:tc") {
          this._pieces.pop();
          this._pieces.push("	");
          this._context.shift();
        } else if (node.name === "w:tr") {
          this._pieces.push("\n");
        } else if (node.name === "w:drawing") {
          this._context.shift();
        } else if (node.name === "w:txbxContent") {
          const textBox = this._pieces.join("");
          const context = this._context.shift();
          if (context !== "textbox") {
            throw new Error("Invalid textbox context");
          }
          this._pieces = this._context.shift();
          if (this._context[0] === "drawing")
            return;
          if (textBox.length == 0)
            return;
          const inHeader = this._context.includes("header");
          const documentField = inHeader ? "_headerTextboxes" : "_textboxes";
          if (this._document[documentField]) {
            this._document[documentField] = this._document[documentField] + "\n" + textBox;
          } else {
            this._document[documentField] = textBox;
          }
        }
      }
      createXmlParser() {
        const parser = new SAXES.SaxesParser();
        parser.on("opentag", (node) => {
          try {
            this.handleOpenTag(node);
          } catch (e) {
            parser.fail(e.message);
          }
        });
        parser.on("closetag", (node) => {
          try {
            this.handleCloseTag(node);
          } catch (e) {
            parser.fail(e.message);
          }
        });
        parser.on("text", (string) => {
          try {
            if (!this._context)
              return;
            if (this._context[0] === "content" || this._context[0] === "cell" || this._context[0] === "textbox") {
              this._pieces.push(string);
            }
          } catch (e) {
            parser.fail(e.message);
          }
        });
        return parser;
      }
      handleEntry(zipfile, entry) {
        return new Promise((resolve2, reject) => {
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              return reject(err);
            }
            this._source = entry.fileName;
            const parser = this.createXmlParser();
            parser.on("error", (e) => {
              readStream.destroy(e);
              reject(e);
            });
            parser.on("end", () => resolve2());
            readStream.on("end", () => parser.close());
            readStream.on("error", (e) => reject(e));
            readStream.on("readable", () => {
              while (true) {
                const chunk = readStream.read(4096);
                if (chunk === null) {
                  return;
                }
                parser.write(chunk);
              }
            });
          });
        });
      }
    };
    module.exports = OpenOfficeExtractor;
  }
});

// ../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/word.js
var require_word = __commonJS({
  "../../../../node_modules/.pnpm/word-extractor@1.0.4/node_modules/word-extractor/lib/word.js"(exports, module) {
    var { Buffer: Buffer2 } = __require("buffer");
    var WordOleExtractor = require_word_ole_extractor();
    var OpenOfficeExtractor = require_open_office_extractor();
    var BufferReader = require_buffer_reader();
    var FileReader = require_file_reader();
    var WordExtractor2 = class {
      constructor() {
      }
      /**
       * Extracts the main contents of the file. If a Buffer is passed, that
       * is used instead. Opens the file, and reads the first block, uses that
       * to detect whether this is a .doc file or a .docx file, and then calls
       * either {@link WordOleDocument#extract} or {@link OpenOfficeDocument#extract}
       * accordingly.
       * 
       * @param {string|Buffer} source - either a string filename, or a Buffer containing the file content
       * @returns a {@link Document} providing accessors onto the text
       */
      extract(source) {
        let reader = null;
        if (Buffer2.isBuffer(source)) {
          reader = new BufferReader(source);
        } else if (typeof source === "string") {
          reader = new FileReader(source);
        }
        const buffer = Buffer2.alloc(512);
        return reader.open().then(() => reader.read(buffer, 0, 512, 0)).then((buffer2) => {
          let extractor = null;
          if (buffer2.readUInt16BE(0) === 53455) {
            extractor = WordOleExtractor;
          } else if (buffer2.readUInt16BE(0) === 20555) {
            const next = buffer2.readUInt16BE(2);
            if (next === 772 || next === 1286 || next === 1800) {
              extractor = OpenOfficeExtractor;
            }
          }
          if (!extractor) {
            throw new Error("Unable to read this type of file");
          }
          return new extractor().extract(reader);
        }).finally(() => reader.close());
      }
    };
    module.exports = WordExtractor2;
  }
});

// ../../../../node_modules/.pnpm/yauzl@3.4.0/node_modules/yauzl/fd-slicer.js
var require_fd_slicer2 = __commonJS({
  "../../../../node_modules/.pnpm/yauzl@3.4.0/node_modules/yauzl/fd-slicer.js"(exports) {
    var fs = __require("fs");
    var util = __require("util");
    var stream = __require("stream");
    var Readable = stream.Readable;
    var PassThrough = stream.PassThrough;
    var Pend = require_pend();
    var EventEmitter = __require("events").EventEmitter;
    exports.BufferSlicer = BufferSlicer;
    exports.FdSlicer = FdSlicer;
    util.inherits(FdSlicer, EventEmitter);
    function FdSlicer(fd) {
      EventEmitter.call(this);
      this.fd = fd;
      this.pend = new Pend();
      this.pend.max = 1;
      this.refCount = 0;
    }
    FdSlicer.prototype.read = function(buffer, offset, length, position, callback) {
      var self = this;
      self.pend.go(function(cb) {
        fs.read(self.fd, buffer, offset, length, position, function(err, bytesRead, buffer2) {
          cb();
          callback(err, bytesRead, buffer2);
        });
      });
    };
    FdSlicer.prototype.createReadStream = function(options2) {
      return new ReadStream(this, options2);
    };
    FdSlicer.prototype.ref = function() {
      this.refCount += 1;
    };
    FdSlicer.prototype.unref = function() {
      var self = this;
      self.refCount -= 1;
      if (self.refCount < 0) throw new Error("invalid unref");
      if (self.refCount > 0) return;
      fs.close(self.fd, onCloseDone);
      function onCloseDone(err) {
        if (err) {
          self.emit("error", err);
        } else {
          self.emit("close");
        }
      }
    };
    util.inherits(ReadStream, Readable);
    function ReadStream(context, options2) {
      options2 = options2 || {};
      Readable.call(this, options2);
      this.context = context;
      this.context.ref();
      this.start = options2.start || 0;
      this.endOffset = options2.end;
      this.pos = this.start;
    }
    ReadStream.prototype._read = function(n) {
      var self = this;
      var toRead = Math.min(self._readableState.highWaterMark, n);
      if (self.endOffset != null) {
        toRead = Math.min(toRead, self.endOffset - self.pos);
      }
      if (toRead <= 0) {
        self.push(null);
        this._cleanup();
        return;
      }
      self.context.pend.go(function(cb) {
        var buffer = Buffer.allocUnsafe(toRead);
        fs.read(self.context.fd, buffer, 0, toRead, self.pos, function(err, bytesRead) {
          if (err) {
            self.destroy(err);
          } else if (bytesRead === 0) {
            self.push(null);
            self._cleanup();
          } else {
            self.pos += bytesRead;
            self.push(buffer.slice(0, bytesRead));
          }
          cb();
        });
      });
    };
    ReadStream.prototype._destroy = function(err, cb) {
      this._cleanup();
      cb(err);
    };
    ReadStream.prototype._cleanup = function() {
      if (this.context != null) {
        this.context.unref();
        this.context = null;
      }
    };
    util.inherits(BufferSlicer, EventEmitter);
    function BufferSlicer(buffer) {
      EventEmitter.call(this);
      this.refCount = 0;
      this.buffer = buffer;
    }
    BufferSlicer.prototype.read = function(buffer, offset, length, position, callback) {
      if (!(0 <= offset && offset <= buffer.length)) throw new RangeError("offset outside buffer: 0 <= " + offset + " <= " + buffer.length);
      if (position < 0) throw new RangeError("position is negative: " + position);
      if (offset + length > buffer.length) {
        length = buffer.length - offset;
      }
      if (position + length > this.buffer.length) {
        length = this.buffer.length - position;
      }
      if (length <= 0) {
        setImmediate(function() {
          callback(null, 0);
        });
        return;
      }
      this.buffer.copy(buffer, offset, position, position + length);
      setImmediate(function() {
        callback(null, length);
      });
    };
    BufferSlicer.prototype.createReadStream = function(options2) {
      options2 = options2 || {};
      var readStream = new PassThrough(options2);
      readStream.start = options2.start || 0;
      readStream.endOffset = options2.end;
      readStream.pos = readStream.endOffset || this.buffer.length;
      var entireSlice = this.buffer.slice(readStream.start, readStream.pos);
      var maxChunkSize = 65536;
      var offset = 0;
      while (true) {
        var nextOffset = offset + maxChunkSize;
        if (nextOffset >= entireSlice.length) {
          if (offset < entireSlice.length) {
            readStream.write(entireSlice.slice(offset, entireSlice.length));
          }
          break;
        }
        readStream.write(entireSlice.slice(offset, nextOffset));
        offset = nextOffset;
      }
      readStream.end();
      return readStream;
    };
    BufferSlicer.prototype.ref = function() {
      this.refCount += 1;
    };
    BufferSlicer.prototype.unref = function() {
      this.refCount -= 1;
      if (this.refCount < 0) {
        throw new Error("invalid unref");
      }
    };
  }
});

// ../../../../node_modules/.pnpm/yauzl@3.4.0/node_modules/yauzl/crc32.js
var require_crc32 = __commonJS({
  "../../../../node_modules/.pnpm/yauzl@3.4.0/node_modules/yauzl/crc32.js"(exports, module) {
    var CRC_TABLE = new Int32Array([
      0,
      1996959894,
      3993919788,
      2567524794,
      124634137,
      1886057615,
      3915621685,
      2657392035,
      249268274,
      2044508324,
      3772115230,
      2547177864,
      162941995,
      2125561021,
      3887607047,
      2428444049,
      498536548,
      1789927666,
      4089016648,
      2227061214,
      450548861,
      1843258603,
      4107580753,
      2211677639,
      325883990,
      1684777152,
      4251122042,
      2321926636,
      335633487,
      1661365465,
      4195302755,
      2366115317,
      997073096,
      1281953886,
      3579855332,
      2724688242,
      1006888145,
      1258607687,
      3524101629,
      2768942443,
      901097722,
      1119000684,
      3686517206,
      2898065728,
      853044451,
      1172266101,
      3705015759,
      2882616665,
      651767980,
      1373503546,
      3369554304,
      3218104598,
      565507253,
      1454621731,
      3485111705,
      3099436303,
      671266974,
      1594198024,
      3322730930,
      2970347812,
      795835527,
      1483230225,
      3244367275,
      3060149565,
      1994146192,
      31158534,
      2563907772,
      4023717930,
      1907459465,
      112637215,
      2680153253,
      3904427059,
      2013776290,
      251722036,
      2517215374,
      3775830040,
      2137656763,
      141376813,
      2439277719,
      3865271297,
      1802195444,
      476864866,
      2238001368,
      4066508878,
      1812370925,
      453092731,
      2181625025,
      4111451223,
      1706088902,
      314042704,
      2344532202,
      4240017532,
      1658658271,
      366619977,
      2362670323,
      4224994405,
      1303535960,
      984961486,
      2747007092,
      3569037538,
      1256170817,
      1037604311,
      2765210733,
      3554079995,
      1131014506,
      879679996,
      2909243462,
      3663771856,
      1141124467,
      855842277,
      2852801631,
      3708648649,
      1342533948,
      654459306,
      3188396048,
      3373015174,
      1466479909,
      544179635,
      3110523913,
      3462522015,
      1591671054,
      702138776,
      2966460450,
      3352799412,
      1504918807,
      783551873,
      3082640443,
      3233442989,
      3988292384,
      2596254646,
      62317068,
      1957810842,
      3939845945,
      2647816111,
      81470997,
      1943803523,
      3814918930,
      2489596804,
      225274430,
      2053790376,
      3826175755,
      2466906013,
      167816743,
      2097651377,
      4027552580,
      2265490386,
      503444072,
      1762050814,
      4150417245,
      2154129355,
      426522225,
      1852507879,
      4275313526,
      2312317920,
      282753626,
      1742555852,
      4189708143,
      2394877945,
      397917763,
      1622183637,
      3604390888,
      2714866558,
      953729732,
      1340076626,
      3518719985,
      2797360999,
      1068828381,
      1219638859,
      3624741850,
      2936675148,
      906185462,
      1090812512,
      3747672003,
      2825379669,
      829329135,
      1181335161,
      3412177804,
      3160834842,
      628085408,
      1382605366,
      3423369109,
      3138078467,
      570562233,
      1426400815,
      3317316542,
      2998733608,
      733239954,
      1555261956,
      3268935591,
      3050360625,
      752459403,
      1541320221,
      2607071920,
      3965973030,
      1969922972,
      40735498,
      2617837225,
      3943577151,
      1913087877,
      83908371,
      2512341634,
      3803740692,
      2075208622,
      213261112,
      2463272603,
      3855990285,
      2094854071,
      198958881,
      2262029012,
      4057260610,
      1759359992,
      534414190,
      2176718541,
      4139329115,
      1873836001,
      414664567,
      2282248934,
      4279200368,
      1711684554,
      285281116,
      2405801727,
      4167216745,
      1634467795,
      376229701,
      2685067896,
      3608007406,
      1308918612,
      956543938,
      2808555105,
      3495958263,
      1231636301,
      1047427035,
      2932959818,
      3654703836,
      1088359270,
      936918e3,
      2847714899,
      3736837829,
      1202900863,
      817233897,
      3183342108,
      3401237130,
      1404277552,
      615818150,
      3134207493,
      3453421203,
      1423857449,
      601450431,
      3009837614,
      3294710456,
      1567103746,
      711928724,
      3020668471,
      3272380065,
      1510334235,
      755167117
    ]);
    function crc323(buf) {
      let crc = -1;
      for (let x of buf) {
        crc = CRC_TABLE[(crc ^ x) & 255] ^ crc >>> 8;
      }
      return (crc ^ -1) >>> 0;
    }
    module.exports = crc323;
  }
});

// ../../../../node_modules/.pnpm/yauzl@3.4.0/node_modules/yauzl/index.js
var require_yauzl2 = __commonJS({
  "../../../../node_modules/.pnpm/yauzl@3.4.0/node_modules/yauzl/index.js"(exports) {
    var fs = __require("fs");
    var zlib = __require("zlib");
    var fd_slicer = require_fd_slicer2();
    var util = __require("util");
    var EventEmitter = __require("events").EventEmitter;
    var Transform = __require("stream").Transform;
    var PassThrough = __require("stream").PassThrough;
    var Writable = __require("stream").Writable;
    var crc323 = typeof zlib.crc32 === "function" ? zlib.crc32 : require_crc32();
    exports.open = open;
    exports.fromFd = fromFd;
    exports.fromBuffer = fromBuffer;
    exports.fromRandomAccessReader = fromRandomAccessReader;
    exports.openPromise = openPromise;
    exports.fromFdPromise = fromFdPromise;
    exports.fromBufferPromise = fromBufferPromise;
    exports.fromRandomAccessReaderPromise = fromRandomAccessReaderPromise;
    exports.dosDateTimeToDate = dosDateTimeToDate;
    exports.getFileNameLowLevel = getFileNameLowLevel;
    exports.validateFileName = validateFileName;
    exports.parseExtraFields = parseExtraFields;
    exports.ZipFile = ZipFile;
    exports.Entry = Entry;
    exports.LocalFileHeader = LocalFileHeader;
    exports.RandomAccessReader = RandomAccessReader;
    function openPromise(path, options2) {
      return new Promise((resolve2, reject) => {
        open(path, { ...options2, lazyEntries: true }, function(err, zipfile) {
          if (err) return reject(err);
          resolve2(zipfile);
        });
      });
    }
    function fromFdPromise(fd, options2) {
      return new Promise((resolve2, reject) => {
        fromFd(fd, { ...options2, lazyEntries: true }, function(err, zipfile) {
          if (err) return reject(err);
          resolve2(zipfile);
        });
      });
    }
    function fromBufferPromise(buffer, options2) {
      return new Promise((resolve2, reject) => {
        fromBuffer(buffer, { ...options2, lazyEntries: true }, function(err, zipfile) {
          if (err) return reject(err);
          resolve2(zipfile);
        });
      });
    }
    function fromRandomAccessReaderPromise(reader, totalSize, options2) {
      return new Promise((resolve2, reject) => {
        fromRandomAccessReader(reader, totalSize, { ...options2, lazyEntries: true }, function(err, zipfile) {
          if (err) return reject(err);
          resolve2(zipfile);
        });
      });
    }
    function open(path, options2, callback) {
      if (typeof options2 === "function") {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      if (options2.autoClose == null) options2.autoClose = true;
      if (options2.lazyEntries == null) options2.lazyEntries = false;
      if (options2.decodeStrings == null) options2.decodeStrings = true;
      if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
      if (options2.strictFileNames == null) options2.strictFileNames = false;
      if (callback == null) callback = defaultCallback;
      fs.open(path, "r", function(err, fd) {
        if (err) return callback(err);
        fromFd(fd, options2, function(err2, zipfile) {
          if (err2) fs.close(fd, defaultCallback);
          callback(err2, zipfile);
        });
      });
    }
    function fromFd(fd, options2, callback) {
      if (typeof options2 === "function") {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      if (options2.autoClose == null) options2.autoClose = false;
      if (options2.lazyEntries == null) options2.lazyEntries = false;
      if (options2.decodeStrings == null) options2.decodeStrings = true;
      if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
      if (options2.strictFileNames == null) options2.strictFileNames = false;
      if (callback == null) callback = defaultCallback;
      fs.fstat(fd, function(err, stats) {
        if (err) return callback(err);
        var reader = new fd_slicer.FdSlicer(fd);
        fromRandomAccessReader(reader, stats.size, options2, callback);
      });
    }
    function fromBuffer(buffer, options2, callback) {
      if (typeof options2 === "function") {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      options2.autoClose = false;
      if (options2.lazyEntries == null) options2.lazyEntries = false;
      if (options2.decodeStrings == null) options2.decodeStrings = true;
      if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
      if (options2.strictFileNames == null) options2.strictFileNames = false;
      var reader = new fd_slicer.BufferSlicer(buffer);
      fromRandomAccessReader(reader, buffer.length, options2, callback);
    }
    function fromRandomAccessReader(reader, totalSize, options2, callback) {
      if (typeof options2 === "function") {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      if (options2.autoClose == null) options2.autoClose = true;
      if (options2.lazyEntries == null) options2.lazyEntries = false;
      if (options2.decodeStrings == null) options2.decodeStrings = true;
      var decodeStrings = !!options2.decodeStrings;
      if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
      if (options2.strictFileNames == null) options2.strictFileNames = false;
      if (callback == null) callback = defaultCallback;
      if (typeof totalSize !== "number") throw new Error("expected totalSize parameter to be a number");
      if (totalSize > Number.MAX_SAFE_INTEGER) {
        throw new Error("zip file too large. only file sizes up to 2^52 are supported due to JavaScript's Number type being an IEEE 754 double.");
      }
      reader.ref();
      var eocdrWithoutCommentSize = 22;
      var zip64EocdlSize = 20;
      var maxCommentSize = 65535;
      var bufferSize = Math.min(zip64EocdlSize + eocdrWithoutCommentSize + maxCommentSize, totalSize);
      var buffer = newBuffer(bufferSize);
      var bufferReadStart = totalSize - buffer.length;
      readAndAssertNoEof(reader, buffer, 0, bufferSize, bufferReadStart, function(err) {
        if (err) return callback(err);
        for (var i = bufferSize - eocdrWithoutCommentSize; i >= 0; i -= 1) {
          if (buffer.readUInt32LE(i) !== 101010256) continue;
          var eocdrBuffer = buffer.subarray(i);
          var diskNumber = eocdrBuffer.readUInt16LE(4);
          var entryCount = eocdrBuffer.readUInt16LE(10);
          var centralDirectoryOffset = eocdrBuffer.readUInt32LE(16);
          var commentLength = eocdrBuffer.readUInt16LE(20);
          var expectedCommentLength = eocdrBuffer.length - eocdrWithoutCommentSize;
          if (commentLength !== expectedCommentLength) {
            return callback(new Error("Invalid comment length. Expected: " + expectedCommentLength + ". Found: " + commentLength + ". Are there extra bytes at the end of the file? Or is the end of central dir signature `PK\u263A\u263B` in the comment?"));
          }
          var comment = decodeStrings ? decodeBuffer(eocdrBuffer.subarray(22), false) : eocdrBuffer.subarray(22);
          if (i - zip64EocdlSize >= 0 && buffer.readUInt32LE(i - zip64EocdlSize) === 117853008) {
            var zip64EocdlBuffer = buffer.subarray(i - zip64EocdlSize, i - zip64EocdlSize + zip64EocdlSize);
            var zip64EocdrOffset = readUInt64LE(zip64EocdlBuffer, 8);
            var zip64EocdrBuffer = newBuffer(56);
            return readAndAssertNoEof(reader, zip64EocdrBuffer, 0, zip64EocdrBuffer.length, zip64EocdrOffset, function(err2) {
              if (err2) return callback(err2);
              if (zip64EocdrBuffer.readUInt32LE(0) !== 101075792) {
                return callback(new Error("invalid zip64 end of central directory record signature"));
              }
              diskNumber = zip64EocdrBuffer.readUInt32LE(16);
              if (diskNumber !== 0) {
                return callback(new Error("multi-disk zip files are not supported: found disk number: " + diskNumber));
              }
              entryCount = readUInt64LE(zip64EocdrBuffer, 32);
              centralDirectoryOffset = readUInt64LE(zip64EocdrBuffer, 48);
              return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options2.autoClose, options2.lazyEntries, decodeStrings, options2.validateEntrySizes, options2.strictFileNames));
            });
          }
          if (diskNumber !== 0) {
            return callback(new Error("multi-disk zip files are not supported: found disk number: " + diskNumber));
          }
          return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options2.autoClose, options2.lazyEntries, decodeStrings, options2.validateEntrySizes, options2.strictFileNames));
        }
        callback(new Error("End of central directory record signature not found. Either not a zip file, or file is truncated."));
      });
    }
    util.inherits(ZipFile, EventEmitter);
    function ZipFile(reader, centralDirectoryOffset, fileSize, entryCount, comment, autoClose, lazyEntries, decodeStrings, validateEntrySizes, strictFileNames) {
      var self = this;
      EventEmitter.call(self);
      self.reader = reader;
      self.reader.on("error", function(err) {
        emitError(self, err);
      });
      self.reader.once("close", function() {
        self.emit("close");
      });
      self.readEntryCursor = centralDirectoryOffset;
      self.fileSize = fileSize;
      self.entryCount = entryCount;
      self.comment = comment;
      self.entriesRead = 0;
      self.autoClose = !!autoClose;
      self.lazyEntries = !!lazyEntries;
      self.decodeStrings = !!decodeStrings;
      self.validateEntrySizes = !!validateEntrySizes;
      self.strictFileNames = !!strictFileNames;
      self.isOpen = true;
      self.emittedError = false;
      self.hasEachEntryBeenCalled = false;
      if (!self.lazyEntries) self._readEntry();
    }
    ZipFile.prototype.close = function() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.reader.unref();
    };
    function emitErrorAndAutoClose(self, err) {
      if (self.autoClose) self.close();
      emitError(self, err);
    }
    function emitError(self, err) {
      if (self.emittedError) return;
      self.emittedError = true;
      self.emit("error", err);
    }
    ZipFile.prototype.readEntry = function() {
      if (!this.lazyEntries) throw new Error("readEntry() called without lazyEntries:true");
      this._readEntry();
    };
    ZipFile.prototype._readEntry = function() {
      var self = this;
      if (self.entryCount === self.entriesRead) {
        setImmediate(function() {
          if (self.autoClose) self.close();
          if (self.emittedError) return;
          self.emit("end");
        });
        return;
      }
      if (self.emittedError) return;
      var buffer = newBuffer(46);
      readAndAssertNoEof(self.reader, buffer, 0, buffer.length, self.readEntryCursor, function(err) {
        if (err) return emitErrorAndAutoClose(self, err);
        if (self.emittedError) return;
        var entry = new Entry();
        var signature = buffer.readUInt32LE(0);
        if (signature !== 33639248) return emitErrorAndAutoClose(self, new Error("invalid central directory file header signature: 0x" + signature.toString(16)));
        entry.versionMadeBy = buffer.readUInt16LE(4);
        entry.versionNeededToExtract = buffer.readUInt16LE(6);
        entry.generalPurposeBitFlag = buffer.readUInt16LE(8);
        entry.compressionMethod = buffer.readUInt16LE(10);
        entry.lastModFileTime = buffer.readUInt16LE(12);
        entry.lastModFileDate = buffer.readUInt16LE(14);
        entry.crc32 = buffer.readUInt32LE(16);
        entry.compressedSize = buffer.readUInt32LE(20);
        entry.uncompressedSize = buffer.readUInt32LE(24);
        entry.fileNameLength = buffer.readUInt16LE(28);
        entry.extraFieldLength = buffer.readUInt16LE(30);
        entry.fileCommentLength = buffer.readUInt16LE(32);
        entry.internalFileAttributes = buffer.readUInt16LE(36);
        entry.externalFileAttributes = buffer.readUInt32LE(38);
        entry.relativeOffsetOfLocalHeader = buffer.readUInt32LE(42);
        if (entry.generalPurposeBitFlag & 64) return emitErrorAndAutoClose(self, new Error("strong encryption is not supported"));
        self.readEntryCursor += 46;
        buffer = newBuffer(entry.fileNameLength + entry.extraFieldLength + entry.fileCommentLength);
        readAndAssertNoEof(self.reader, buffer, 0, buffer.length, self.readEntryCursor, function(err2) {
          if (err2) return emitErrorAndAutoClose(self, err2);
          if (self.emittedError) return;
          entry.fileNameRaw = buffer.subarray(0, entry.fileNameLength);
          var fileCommentStart = entry.fileNameLength + entry.extraFieldLength;
          entry.extraFieldRaw = buffer.subarray(entry.fileNameLength, fileCommentStart);
          entry.fileCommentRaw = buffer.subarray(fileCommentStart, fileCommentStart + entry.fileCommentLength);
          try {
            entry.extraFields = parseExtraFields(entry.extraFieldRaw);
          } catch (err3) {
            return emitErrorAndAutoClose(self, err3);
          }
          if (self.decodeStrings) {
            var isUtf8 = (entry.generalPurposeBitFlag & 2048) !== 0;
            entry.fileComment = decodeBuffer(entry.fileCommentRaw, isUtf8);
            entry.fileName = getFileNameLowLevel(entry.generalPurposeBitFlag, entry.fileNameRaw, entry.extraFields, self.strictFileNames);
            var errorMessage = validateFileName(entry.fileName);
            if (errorMessage != null) return emitErrorAndAutoClose(self, new Error(errorMessage));
          } else {
            entry.fileComment = entry.fileCommentRaw;
            entry.fileName = entry.fileNameRaw;
          }
          entry.comment = entry.fileComment;
          self.readEntryCursor += buffer.length;
          self.entriesRead += 1;
          for (var i = 0; i < entry.extraFields.length; i++) {
            var extraField = entry.extraFields[i];
            if (extraField.id !== 1) continue;
            var zip64EiefBuffer = extraField.data;
            var index = 0;
            if (entry.uncompressedSize === 4294967295) {
              if (index + 8 > zip64EiefBuffer.length) {
                return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include uncompressed size"));
              }
              entry.uncompressedSize = readUInt64LE(zip64EiefBuffer, index);
              index += 8;
            }
            if (entry.compressedSize === 4294967295) {
              if (index + 8 > zip64EiefBuffer.length) {
                return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include compressed size"));
              }
              entry.compressedSize = readUInt64LE(zip64EiefBuffer, index);
              index += 8;
            }
            if (entry.relativeOffsetOfLocalHeader === 4294967295) {
              if (index + 8 > zip64EiefBuffer.length) {
                return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include relative header offset"));
              }
              entry.relativeOffsetOfLocalHeader = readUInt64LE(zip64EiefBuffer, index);
              index += 8;
            }
            break;
          }
          if (self.validateEntrySizes && entry.compressionMethod === 0) {
            var expectedCompressedSize = entry.uncompressedSize;
            if (entry.isEncrypted()) {
              expectedCompressedSize += 12;
            }
            if (entry.compressedSize !== expectedCompressedSize) {
              var msg = "compressed/uncompressed size mismatch for stored file: " + entry.compressedSize + " != " + entry.uncompressedSize;
              return emitErrorAndAutoClose(self, new Error(msg));
            }
          }
          self.emit("entry", entry);
          if (!self.lazyEntries) self._readEntry();
        });
      });
    };
    ZipFile.prototype.eachEntry = function() {
      const self = this;
      if (!self.lazyEntries) throw new Error("eachEntry() requires lazyEntries: true");
      if (self.hasEachEntryBeenCalled) throw new Error("eachEntry() must only be called once per ZipFile");
      self.hasEachEntryBeenCalled = true;
      let pendingResolveReject = null;
      self.on("entry", onEntry);
      self.on("end", onEnd);
      self.on("error", onError);
      function cleanup() {
        self.removeListener("entry", onEntry);
        self.removeListener("end", onEnd);
        self.removeListener("error", onError);
        if (self.autoClose) self.close();
      }
      function onEntry(entry) {
        let { resolve: resolve2 } = pendingResolveReject;
        pendingResolveReject = null;
        resolve2({ value: entry });
      }
      function onEnd() {
        let { resolve: resolve2 } = pendingResolveReject;
        pendingResolveReject = null;
        cleanup();
        resolve2({ done: true });
      }
      function onError(err) {
        let { reject } = pendingResolveReject;
        pendingResolveReject = null;
        cleanup();
        reject(err);
      }
      return {
        [Symbol.asyncIterator]() {
          return this;
        },
        next() {
          const promise = new Promise((resolve2, reject) => {
            if (pendingResolveReject != null) throw new Error("next() called before previous Promise was resolved.");
            pendingResolveReject = { resolve: resolve2, reject };
          });
          self.readEntry();
          return promise;
        },
        return(value) {
          cleanup();
          return Promise.resolve({ done: true, value });
        },
        throw(value) {
          cleanup();
          return Promise.reject(value);
        }
      };
    };
    ZipFile.prototype.openReadStream = function(entry, options2, callback) {
      var self = this;
      var relativeStart = 0;
      var relativeEnd = entry.compressedSize;
      if (callback == null) {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) {
        options2 = {};
      } else {
        if (options2.decodeFileData === false) {
          if (options2.decrypt != null) {
            throw new Error("cannot use options.decrypt when options.decodeFileData === false");
          }
          if (options2.decompress != null) {
            throw new Error("cannot use options.decompress when options.decodeFileData === false");
          }
        } else {
          if (options2.decrypt != null) {
            if (!entry.isEncrypted()) {
              throw new Error("options.decrypt can only be specified for encrypted entries. See also option decodeFileData.");
            }
            if (options2.decrypt !== false) throw new Error("invalid options.decrypt value: " + options2.decrypt);
            if (entry.isCompressed()) {
              if (options2.decompress !== false) throw new Error("entry is encrypted and compressed, and options.decompress !== false. See also option decodeFileData.");
            }
          }
          if (options2.decompress != null) {
            if (!entry.isCompressed()) {
              throw new Error("options.decompress can only be specified for compressed entries. See also option decodeFileData.");
            }
            if (!(options2.decompress === false || options2.decompress === true)) {
              throw new Error("invalid options.decompress value: " + options2.decompress);
            }
            decompress = options2.decompress;
          }
        }
        if (options2.start != null) {
          relativeStart = options2.start;
          if (relativeStart < 0) throw new Error("options.start < 0");
          if (relativeStart > entry.compressedSize) throw new Error("options.start > entry.compressedSize");
        }
        if (options2.end != null) {
          relativeEnd = options2.end;
          if (relativeEnd < 0) throw new Error("options.end < 0");
          if (relativeEnd > entry.compressedSize) throw new Error("options.end > entry.compressedSize");
          if (relativeEnd < relativeStart) throw new Error("options.end < options.start");
        }
      }
      var rawMode = options2.decodeFileData === false || // Explicitly requested raw.
      (entry.compressionMethod === 0 || // Naturally without compression.
      entry.compressionMethod === 8 && options2.decompress === false) && (!entry.isEncrypted() || // Naturally without encryption.
      options2.decrypt === false);
      if (options2.start != null || options2.end != null) {
        if (!rawMode) throw new Error("start/end range require options.decodeFileData === false for non-trivial encoded entries.");
      }
      if (!self.isOpen) return callback(new Error("closed"));
      if (entry.isEncrypted() && !rawMode) {
        if (options2.decrypt !== false) return callback(new Error("entry is encrypted, and options.decodeFileData !== false"));
      }
      var decompress;
      if (rawMode) {
        decompress = false;
      } else if (entry.compressionMethod === 8) {
        decompress = options2.decodeFileData !== true;
      } else {
        return callback(new Error("unsupported compression method: " + entry.compressionMethod));
      }
      self.readLocalFileHeader(entry, { minimal: true }, function(err, localFileHeader) {
        if (err) return callback(err);
        self.openReadStreamLowLevel(
          localFileHeader.fileDataStart,
          entry.compressedSize,
          relativeStart,
          relativeEnd,
          decompress,
          entry.uncompressedSize,
          callback
        );
      });
    };
    ZipFile.prototype.openReadStreamLowLevel = function(fileDataStart, compressedSize, relativeStart, relativeEnd, decompress, uncompressedSize, callback) {
      var self = this;
      var fileDataEnd = fileDataStart + compressedSize;
      var readStream = self.reader.createReadStream({
        start: fileDataStart + relativeStart,
        end: fileDataStart + relativeEnd
      });
      var endpointStream = readStream;
      if (decompress) {
        var destroyed = false;
        var inflateFilter = zlib.createInflateRaw();
        readStream.on("error", function(err) {
          setImmediate(function() {
            if (!destroyed) inflateFilter.emit("error", err);
          });
        });
        readStream.pipe(inflateFilter);
        if (self.validateEntrySizes) {
          endpointStream = new AssertByteCountStream(uncompressedSize);
          inflateFilter.on("error", function(err) {
            setImmediate(function() {
              if (!destroyed) endpointStream.emit("error", err);
            });
          });
          inflateFilter.pipe(endpointStream);
        } else {
          endpointStream = inflateFilter;
        }
        installDestroyFn(endpointStream, function() {
          destroyed = true;
          if (inflateFilter !== endpointStream) inflateFilter.unpipe(endpointStream);
          readStream.unpipe(inflateFilter);
          readStream.destroy();
        });
      }
      callback(null, endpointStream);
    };
    ZipFile.prototype.readLocalFileHeader = function(entry, options2, callback) {
      var self = this;
      if (callback == null) {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      self.reader.ref();
      var buffer = newBuffer(30);
      readAndAssertNoEof(self.reader, buffer, 0, buffer.length, entry.relativeOffsetOfLocalHeader, function(err) {
        try {
          if (err) return callback(err);
          var signature = buffer.readUInt32LE(0);
          if (signature !== 67324752) {
            return callback(new Error("invalid local file header signature: 0x" + signature.toString(16)));
          }
          var fileNameLength = buffer.readUInt16LE(26);
          var extraFieldLength = buffer.readUInt16LE(28);
          var fileDataStart = entry.relativeOffsetOfLocalHeader + 30 + fileNameLength + extraFieldLength;
          if (fileDataStart + entry.compressedSize > self.fileSize) {
            return callback(new Error("file data overflows file bounds: " + fileDataStart + " + " + entry.compressedSize + " > " + self.fileSize));
          }
          if (options2.minimal) {
            return callback(null, { fileDataStart });
          }
          var localFileHeader = new LocalFileHeader();
          localFileHeader.fileDataStart = fileDataStart;
          localFileHeader.versionNeededToExtract = buffer.readUInt16LE(4);
          localFileHeader.generalPurposeBitFlag = buffer.readUInt16LE(6);
          localFileHeader.compressionMethod = buffer.readUInt16LE(8);
          localFileHeader.lastModFileTime = buffer.readUInt16LE(10);
          localFileHeader.lastModFileDate = buffer.readUInt16LE(12);
          localFileHeader.crc32 = buffer.readUInt32LE(14);
          localFileHeader.compressedSize = buffer.readUInt32LE(18);
          localFileHeader.uncompressedSize = buffer.readUInt32LE(22);
          localFileHeader.fileNameLength = fileNameLength;
          localFileHeader.extraFieldLength = extraFieldLength;
          buffer = newBuffer(fileNameLength + extraFieldLength);
          self.reader.ref();
          readAndAssertNoEof(self.reader, buffer, 0, buffer.length, entry.relativeOffsetOfLocalHeader + 30, function(err2) {
            try {
              if (err2) return callback(err2);
              localFileHeader.fileName = buffer.subarray(0, fileNameLength);
              localFileHeader.extraField = buffer.subarray(fileNameLength);
              return callback(null, localFileHeader);
            } finally {
              self.reader.unref();
            }
          });
        } finally {
          self.reader.unref();
        }
      });
    };
    ZipFile.prototype.openReadStreamPromise = function(entry, options2) {
      return new Promise((resolve2, reject) => {
        this.openReadStream(entry, options2, function(err, readStream) {
          if (err) return reject(err);
          resolve2(readStream);
        });
      });
    };
    ZipFile.prototype.openReadStreamLowLevelPromise = function(fileDataStart, compressedSize, relativeStart, relativeEnd, decompress, uncompressedSize) {
      return new Promise((resolve2, reject) => {
        this.openReadStream(fileDataStart, compressedSize, relativeStart, relativeEnd, decompress, uncompressedSize, function(err, readStream) {
          if (err) return reject(err);
          resolve2(readStream);
        });
      });
    };
    ZipFile.prototype.readLocalFileHeaderPromise = function(entry, options2) {
      return new Promise((resolve2, reject) => {
        this.readLocalFileHeader(entry, options2, function(err, localFileHeader) {
          if (err) return reject(err);
          resolve2(localFileHeader);
        });
      });
    };
    function Entry() {
    }
    Entry.prototype.getLastModDate = function(options2) {
      if (options2 == null) options2 = {};
      if (!options2.forceDosFormat) {
        for (var i = 0; i < this.extraFields.length; i++) {
          var extraField = this.extraFields[i];
          if (extraField.id === 21589) {
            var data = extraField.data;
            if (data.length < 5) continue;
            var flags = data[0];
            var HAS_MTIME = 1;
            if (!(flags & HAS_MTIME)) continue;
            var posixTimestamp = data.readInt32LE(1);
            return new Date(posixTimestamp * 1e3);
          } else if (extraField.id === 10) {
            var data = extraField.data;
            if (data.length !== 32) continue;
            if (data.readUInt16LE(4) !== 1) continue;
            if (data.readUInt16LE(6) !== 24) continue;
            var hundredNanoSecondsSince1601 = data.readUInt32LE(8) + 4294967296 * data.readInt32LE(12);
            var millisecondsSince1970 = hundredNanoSecondsSince1601 / 1e4 - 116444736e5;
            return new Date(millisecondsSince1970);
          }
        }
      }
      return dosDateTimeToDate(this.lastModFileDate, this.lastModFileTime, options2.timezone);
    };
    Entry.prototype.canDecodeFileData = function() {
      return !this.isEncrypted() && (this.compressionMethod === 0 || this.compressionMethod === 8);
    };
    Entry.prototype.isEncrypted = function() {
      return (this.generalPurposeBitFlag & 1) !== 0;
    };
    Entry.prototype.isCompressed = function() {
      return this.compressionMethod === 8;
    };
    function LocalFileHeader() {
    }
    function dosDateTimeToDate(date, time, timezone) {
      var day = date & 31;
      var month = (date >> 5 & 15) - 1;
      var year = (date >> 9 & 127) + 1980;
      var millisecond = 0;
      var second = (time & 31) * 2;
      var minute = time >> 5 & 63;
      var hour = time >> 11 & 31;
      if (timezone == null || timezone === "local") {
        return new Date(year, month, day, hour, minute, second, millisecond);
      } else if (timezone === "UTC") {
        return new Date(Date.UTC(year, month, day, hour, minute, second, millisecond));
      } else {
        throw new Error("unrecognized options.timezone: " + options.timezone);
      }
    }
    function getFileNameLowLevel(generalPurposeBitFlag, fileNameBuffer, extraFields, strictFileNames) {
      var fileName = null;
      for (var i = 0; i < extraFields.length; i++) {
        var extraField = extraFields[i];
        if (extraField.id === 28789) {
          if (extraField.data.length < 6) {
            continue;
          }
          if (extraField.data.readUInt8(0) !== 1) {
            continue;
          }
          var oldNameCrc32 = extraField.data.readUInt32LE(1);
          if (crc323(fileNameBuffer) !== oldNameCrc32) {
            continue;
          }
          fileName = decodeBuffer(extraField.data.subarray(5), true);
          break;
        }
      }
      if (fileName == null) {
        var isUtf8 = (generalPurposeBitFlag & 2048) !== 0;
        fileName = decodeBuffer(fileNameBuffer, isUtf8);
      }
      if (!strictFileNames) {
        fileName = fileName.replace(/\\/g, "/");
      }
      return fileName;
    }
    function validateFileName(fileName) {
      if (fileName.indexOf("\\") !== -1) {
        return "invalid characters in fileName: " + fileName;
      }
      if (/^[a-zA-Z]:/.test(fileName) || /^\//.test(fileName)) {
        return "absolute path: " + fileName;
      }
      if (fileName.split("/").indexOf("..") !== -1) {
        return "invalid relative path: " + fileName;
      }
      return null;
    }
    function parseExtraFields(extraFieldBuffer) {
      var extraFields = [];
      var i = 0;
      while (i < extraFieldBuffer.length - 3) {
        var headerId = extraFieldBuffer.readUInt16LE(i + 0);
        var dataSize = extraFieldBuffer.readUInt16LE(i + 2);
        var dataStart = i + 4;
        var dataEnd = dataStart + dataSize;
        if (dataEnd > extraFieldBuffer.length) throw new Error("extra field length exceeds extra field buffer size");
        var dataBuffer = extraFieldBuffer.subarray(dataStart, dataEnd);
        extraFields.push({
          id: headerId,
          data: dataBuffer
        });
        i = dataEnd;
      }
      return extraFields;
    }
    function readAndAssertNoEof(reader, buffer, offset, length, position, callback) {
      if (length === 0) {
        return setImmediate(function() {
          callback(null, newBuffer(0));
        });
      }
      reader.read(buffer, offset, length, position, function(err, bytesRead) {
        if (err) return callback(err);
        if (bytesRead < length) {
          return callback(new Error("unexpected EOF"));
        }
        callback();
      });
    }
    util.inherits(AssertByteCountStream, Transform);
    function AssertByteCountStream(byteCount) {
      Transform.call(this);
      this.actualByteCount = 0;
      this.expectedByteCount = byteCount;
    }
    AssertByteCountStream.prototype._transform = function(chunk, encoding, cb) {
      this.actualByteCount += chunk.length;
      if (this.actualByteCount > this.expectedByteCount) {
        var msg = "too many bytes in the stream. expected " + this.expectedByteCount + ". got at least " + this.actualByteCount;
        return cb(new Error(msg));
      }
      cb(null, chunk);
    };
    AssertByteCountStream.prototype._flush = function(cb) {
      if (this.actualByteCount < this.expectedByteCount) {
        var msg = "not enough bytes in the stream. expected " + this.expectedByteCount + ". got only " + this.actualByteCount;
        return cb(new Error(msg));
      }
      cb();
    };
    util.inherits(RandomAccessReader, EventEmitter);
    function RandomAccessReader() {
      EventEmitter.call(this);
      this.refCount = 0;
    }
    RandomAccessReader.prototype.ref = function() {
      this.refCount += 1;
    };
    RandomAccessReader.prototype.unref = function() {
      var self = this;
      self.refCount -= 1;
      if (self.refCount > 0) return;
      if (self.refCount < 0) throw new Error("invalid unref");
      self.close(onCloseDone);
      function onCloseDone(err) {
        if (err) return self.emit("error", err);
        self.emit("close");
      }
    };
    RandomAccessReader.prototype.createReadStream = function(options2) {
      if (options2 == null) options2 = {};
      var start = options2.start;
      var end = options2.end;
      if (start === end) {
        var emptyStream = new PassThrough();
        setImmediate(function() {
          emptyStream.end();
        });
        return emptyStream;
      }
      var stream = this._readStreamForRange(start, end);
      var destroyed = false;
      var refUnrefFilter = new RefUnrefFilter(this);
      stream.on("error", function(err) {
        setImmediate(function() {
          if (!destroyed) refUnrefFilter.emit("error", err);
        });
      });
      installDestroyFn(refUnrefFilter, function() {
        stream.unpipe(refUnrefFilter);
        refUnrefFilter.unref();
        stream.destroy();
      });
      var byteCounter = new AssertByteCountStream(end - start);
      refUnrefFilter.on("error", function(err) {
        setImmediate(function() {
          if (!destroyed) byteCounter.emit("error", err);
        });
      });
      installDestroyFn(byteCounter, function() {
        destroyed = true;
        refUnrefFilter.unpipe(byteCounter);
        refUnrefFilter.destroy();
      });
      return stream.pipe(refUnrefFilter).pipe(byteCounter);
    };
    RandomAccessReader.prototype._readStreamForRange = function(start, end) {
      throw new Error("not implemented");
    };
    RandomAccessReader.prototype.read = function(buffer, offset, length, position, callback) {
      var readStream = this.createReadStream({ start: position, end: position + length });
      var writeStream = new Writable();
      var written = 0;
      writeStream._write = function(chunk, encoding, cb) {
        chunk.copy(buffer, offset + written, 0, chunk.length);
        written += chunk.length;
        cb();
      };
      writeStream.on("finish", callback);
      readStream.on("error", function(error) {
        callback(error);
      });
      readStream.pipe(writeStream);
    };
    RandomAccessReader.prototype.close = function(callback) {
      setImmediate(callback);
    };
    util.inherits(RefUnrefFilter, PassThrough);
    function RefUnrefFilter(context) {
      PassThrough.call(this);
      this.context = context;
      this.context.ref();
      this.unreffedYet = false;
    }
    RefUnrefFilter.prototype._flush = function(cb) {
      this.unref();
      cb();
    };
    RefUnrefFilter.prototype.unref = function(cb) {
      if (this.unreffedYet) return;
      this.unreffedYet = true;
      this.context.unref();
    };
    var cp437 = "\0\u263A\u263B\u2665\u2666\u2663\u2660\u2022\u25D8\u25CB\u25D9\u2642\u2640\u266A\u266B\u263C\u25BA\u25C4\u2195\u203C\xB6\xA7\u25AC\u21A8\u2191\u2193\u2192\u2190\u221F\u2194\u25B2\u25BC !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\u2302\xC7\xFC\xE9\xE2\xE4\xE0\xE5\xE7\xEA\xEB\xE8\xEF\xEE\xEC\xC4\xC5\xC9\xE6\xC6\xF4\xF6\xF2\xFB\xF9\xFF\xD6\xDC\xA2\xA3\xA5\u20A7\u0192\xE1\xED\xF3\xFA\xF1\xD1\xAA\xBA\xBF\u2310\xAC\xBD\xBC\xA1\xAB\xBB\u2591\u2592\u2593\u2502\u2524\u2561\u2562\u2556\u2555\u2563\u2551\u2557\u255D\u255C\u255B\u2510\u2514\u2534\u252C\u251C\u2500\u253C\u255E\u255F\u255A\u2554\u2569\u2566\u2560\u2550\u256C\u2567\u2568\u2564\u2565\u2559\u2558\u2552\u2553\u256B\u256A\u2518\u250C\u2588\u2584\u258C\u2590\u2580\u03B1\xDF\u0393\u03C0\u03A3\u03C3\xB5\u03C4\u03A6\u0398\u03A9\u03B4\u221E\u03C6\u03B5\u2229\u2261\xB1\u2265\u2264\u2320\u2321\xF7\u2248\xB0\u2219\xB7\u221A\u207F\xB2\u25A0\xA0";
    function decodeBuffer(buffer, isUtf8) {
      if (isUtf8) {
        return buffer.toString("utf8");
      } else {
        var result = "";
        for (var i = 0; i < buffer.length; i++) {
          result += cp437[buffer[i]];
        }
        return result;
      }
    }
    function readUInt64LE(buffer, offset) {
      var lower32 = buffer.readUInt32LE(offset);
      var upper32 = buffer.readUInt32LE(offset + 4);
      return upper32 * 4294967296 + lower32;
    }
    var newBuffer;
    if (typeof Buffer.allocUnsafe === "function") {
      newBuffer = function(len) {
        return Buffer.allocUnsafe(len);
      };
    } else {
      newBuffer = function(len) {
        return new Buffer(len);
      };
    }
    function installDestroyFn(stream, fn) {
      if (typeof stream.destroy === "function") {
        stream._destroy = function(err, cb) {
          fn();
          if (cb != null) cb(err);
        };
      } else {
        stream.destroy = fn;
      }
    }
    function defaultCallback(err) {
      if (err) throw err;
    }
  }
});

// src/engine.mjs
import { readFile } from "node:fs/promises";

// ../../../../node_modules/.pnpm/@hyzyla+pdfium@2.1.13/node_modules/@hyzyla/pdfium/dist/index.esm.js
function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve2) {
      resolve2(value);
    });
  }
  return new (P || (P = Promise))(function(resolve2, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
var BYTES_PER_PIXEL = 4;
var FPDFErrorCode = {
  UNKNOWN: 1,
  // Unknown error.
  FILE: 2,
  // File not found or could not be opened.
  FORMAT: 3,
  // File not in PDF format or corrupted.
  PASSWORD: 4,
  // Password required or incorrect password.
  SECURITY: 5,
  // Unsupported security scheme.
  PAGE: 6
  // Page not found or content error.
};
var FPDFBitmap = {
  Unknown: 0,
  Gray: 1,
  // Gray scale bitmap, one byte per pixel.
  BGR: 2,
  // 3 bytes per pixel, byte order: blue, green, red.
  BGRx: 3,
  // 4 bytes per pixel, byte order: blue, green, red, unused.
  BGRA: 4
  // 4 bytes per pixel, byte order: blue, green, red, alpha.
};
var FPDFRenderFlag = {
  // Set if annotations are to be rendered (high-lights, sticky-notes, ink, etc.)
  ANNOT: 1,
  // Set if using text rendering optimized for LCD display. This flag will only
  // take effect if anti-aliasing is enabled for text.
  LCD_TEXT: 2,
  // Don't use the native text output available on some platforms
  NO_NATIVETEXT: 4,
  // Grayscale output.
  GRAYSCALE: 8,
  // Obsolete, has no effect, retained for compatibility.
  DEBUG_INFO: 128,
  // Obsolete, has no effect, retained for compatibility.
  NO_CATCH: 256,
  // Limit image cache size.
  RENDER_LIMITEDIMAGECACHE: 512,
  // Always use halftone for image stretching.
  RENDER_FORCEHALFTONE: 1024,
  // Render for printing.
  PRINTING: 2048,
  // Set to disable anti-aliasing on text. This flag will also disable LCD
  // optimization for text rendering.
  RENDER_NO_SMOOTHTEXT: 4096,
  // Set to disable anti-aliasing on images.
  RENDER_NO_SMOOTHIMAGE: 8192,
  // Set to disable anti-aliasing on paths.
  RENDER_NO_SMOOTHPATH: 16384,
  // Set whether to render in a reverse Byte order, this flag is only used when
  // rendering to a bitmap. (what Canvas likes)
  REVERSE_BYTE_ORDER: 16,
  // Set whether fill paths need to be stroked. This flag is only used when
  // FPDF_COLORSCHEME is passed in, since with a single fill color for paths the
  // boundaries of adjacent fill paths are less visible.
  CONVERT_FILL_TO_STROKE: 32
};
var FPDFPageObjectType = {
  TEXT: 1,
  PATH: 2,
  IMAGE: 3,
  SHADING: 4,
  FORM: 5
};
var DEFAULT_PAGE_RENDER_OPTIONS = {
  scale: 1,
  render: "bitmap",
  colorSpace: "BGRA",
  renderFormFields: false,
  transparent: false
};
function convertBitmapToImage(options2) {
  return __awaiter(this, void 0, void 0, function* () {
    const { data, render } = options2;
    if (typeof render === "function") {
      return yield render(options2);
    }
    return data;
  });
}
function readUInt16LE(buffer, offset = 0) {
  return buffer[offset] | buffer[offset + 1] << 8;
}
var PDFiumObjectBase = class {
  constructor(options2) {
    this.module = options2.module;
    this.objectIdx = options2.objectIdx;
    this.documentIdx = options2.documentIdx;
    this.pageIdx = options2.pageIdx;
  }
  static create(options2) {
    const type = options2.module._FPDFPageObj_GetType(options2.objectIdx);
    switch (type) {
      case FPDFPageObjectType.TEXT:
        return new PDFiumTextObject(options2);
      case FPDFPageObjectType.PATH:
        return new PDFiumPathObject(options2);
      case FPDFPageObjectType.IMAGE:
        return new PDFiumImageObject(options2);
      case FPDFPageObjectType.SHADING:
        return new PDFiumShadingObject(options2);
      case FPDFPageObjectType.FORM:
        return new PDFiumFormObject(options2);
      default:
        throw new Error(`Unknown object type: ${type}`);
    }
  }
};
var PDFiumTextObject = class extends PDFiumObjectBase {
  constructor() {
    super(...arguments);
    this.type = "text";
  }
};
var PDFiumPathObject = class extends PDFiumObjectBase {
  constructor() {
    super(...arguments);
    this.type = "path";
  }
};
var PDFiumImageObject = class _PDFiumImageObject extends PDFiumObjectBase {
  constructor() {
    super(...arguments);
    this.type = "image";
  }
  static formatToBPP(format) {
    switch (format) {
      case FPDFBitmap.Gray:
        return 1;
      case FPDFBitmap.BGR:
        return 3;
      case FPDFBitmap.BGRx:
      case FPDFBitmap.BGRA:
        return 4;
      default:
        throw new Error(`Unsupported bitmap format: ${format}`);
    }
  }
  /**
   * Return the raw uncompressed image data.
   */
  getImageDataRaw() {
    return __awaiter(this, void 0, void 0, function* () {
      const bufferSize = this.module._FPDFImageObj_GetImageDataRaw(this.objectIdx, 0, 0);
      if (!bufferSize) {
        throw new Error("Failed to get bitmap from image object.");
      }
      const bufferPtr = this.module.wasmExports.malloc(bufferSize);
      if (!this.module._FPDFImageObj_GetImageDataRaw(this.objectIdx, bufferPtr, bufferSize)) {
        throw new Error("Failed to get bitmap buffer.");
      }
      const oData = this.module.HEAPU8.slice(bufferPtr, bufferPtr + bufferSize);
      this.module.wasmExports.free(bufferPtr);
      const sizePtr = this.module.wasmExports.malloc(2 + 2);
      const widthPtr = sizePtr;
      const heightPtr = sizePtr + 2;
      if (!this.module._FPDFImageObj_GetImagePixelSize(this.objectIdx, widthPtr, heightPtr)) {
        throw new Error("Failed to get image size.");
      }
      const widthBuffer = this.module.HEAPU8.slice(widthPtr, widthPtr + 2);
      const heightBuffer = this.module.HEAPU8.slice(heightPtr, heightPtr + 2);
      this.module.wasmExports.free(sizePtr);
      const width = readUInt16LE(widthBuffer);
      const height = readUInt16LE(heightBuffer);
      const filtersCount = this.module._FPDFImageObj_GetImageFilterCount(this.objectIdx);
      const filters = [];
      for (let i = 0; i < filtersCount; i++) {
        const filterSize = this.module._FPDFImageObj_GetImageFilter(this.objectIdx, i, 0, 0);
        const filterPtr = this.module.wasmExports.malloc(filterSize);
        if (!this.module._FPDFImageObj_GetImageFilter(this.objectIdx, i, filterPtr, filterSize)) {
          throw new Error("Failed to get image filter.");
        }
        const filterBuffer = this.module.HEAPU8.slice(filterPtr, filterPtr + filterSize - 1);
        const filter = new TextDecoder().decode(filterBuffer).trim();
        this.module.wasmExports.free(filterPtr);
        filters.push(filter);
      }
      return {
        width,
        height,
        data: oData,
        filters
      };
    });
  }
  /**
   * Render the image object to a buffer with the specified render function.
   */
  render() {
    return __awaiter(this, arguments, void 0, function* (options2 = {
      render: "bitmap"
    }) {
      const bitmapIdx = this.module._FPDFImageObj_GetBitmap(this.objectIdx);
      if (!bitmapIdx) {
        throw new Error("Failed to get bitmap from image object.");
      }
      const bufferPtr = this.module._FPDFBitmap_GetBuffer(bitmapIdx);
      if (!bufferPtr) {
        throw new Error("Failed to get bitmap buffer.");
      }
      const stride = this.module._FPDFBitmap_GetStride(bitmapIdx);
      const width = this.module._FPDFBitmap_GetWidth(bitmapIdx);
      const height = this.module._FPDFBitmap_GetHeight(bitmapIdx);
      const format = this.module._FPDFBitmap_GetFormat(bitmapIdx);
      const oBPP = _PDFiumImageObject.formatToBPP(format);
      const bufferSize = height * stride;
      const oData = this.module.HEAPU8.slice(bufferPtr, bufferPtr + bufferSize);
      this.module.wasmExports.free(bufferPtr);
      const tBPP = BYTES_PER_PIXEL;
      const tData = new Uint8Array(width * height * tBPP);
      tData.fill(255);
      for (let rowIndex = 0; rowIndex < height; rowIndex++) {
        const tRowStart = rowIndex * tBPP * width;
        const oRowStart = rowIndex * stride;
        for (let columnIndex = 0; columnIndex < width; columnIndex++) {
          const tPixelStart = tRowStart + columnIndex * tBPP;
          const oPixelStart = oRowStart + columnIndex * oBPP;
          switch (format) {
            case FPDFBitmap.Gray: {
              const gray = oData[oPixelStart];
              tData[tPixelStart + 0] = gray;
              tData[tPixelStart + 1] = gray;
              tData[tPixelStart + 2] = gray;
              break;
            }
            case FPDFBitmap.BGR: {
              tData[tPixelStart + 0] = oData[oPixelStart + 2];
              tData[tPixelStart + 1] = oData[oPixelStart + 1];
              tData[tPixelStart + 2] = oData[oPixelStart + 0];
              break;
            }
            case FPDFBitmap.BGRx: {
              tData[tPixelStart + 0] = oData[oPixelStart + 2];
              tData[tPixelStart + 1] = oData[oPixelStart + 1];
              tData[tPixelStart + 2] = oData[oPixelStart + 0];
              break;
            }
            case FPDFBitmap.BGRA: {
              tData[tPixelStart + 0] = oData[oPixelStart + 2];
              tData[tPixelStart + 1] = oData[oPixelStart + 1];
              tData[tPixelStart + 2] = oData[oPixelStart + 0];
              tData[tPixelStart + 3] = oData[oPixelStart + 3];
              break;
            }
            default:
              throw new Error(`Unsupported bitmap format: ${format}`);
          }
        }
      }
      const image = yield convertBitmapToImage({
        render: options2.render,
        width,
        height,
        data: tData
      });
      return {
        width,
        height,
        data: image
      };
    });
  }
};
var PDFiumShadingObject = class extends PDFiumObjectBase {
  constructor() {
    super(...arguments);
    this.type = "shading";
  }
};
var PDFiumFormObject = class extends PDFiumObjectBase {
  constructor() {
    super(...arguments);
    this.type = "form";
  }
};
var PDFiumPage = class {
  constructor(options2) {
    this.module = options2.module;
    this.pageIdx = options2.pageIdx;
    this.documentIdx = options2.documentIdx;
    this.document = options2.document;
    this.number = options2.pageIndex;
  }
  getOriginalSize() {
    const originalWidth = this.module._FPDF_GetPageWidth(this.pageIdx);
    const originalHeight = this.module._FPDF_GetPageHeight(this.pageIdx);
    return {
      originalWidth,
      originalHeight
    };
  }
  /**
   * Get the size of the page in points (1/72 inch)
   * Floored original values needed in testing. Scale can be a float number.
   */
  getSize(renderOptions) {
    const { scale, width, height } = renderOptions;
    const { originalHeight, originalWidth } = this.getOriginalSize();
    const computedWidth = Math.floor(width !== null && width !== void 0 ? width : originalWidth);
    const computedHeight = Math.floor(height !== null && height !== void 0 ? height : originalHeight);
    return {
      originalWidth: Math.floor(originalWidth),
      originalHeight: Math.floor(originalHeight),
      width: Math.floor(computedWidth * scale),
      height: Math.floor(computedHeight * scale)
    };
  }
  /**
   * Extract text from the page
   */
  getText() {
    const textPage = this.module._FPDFText_LoadPage(this.pageIdx);
    if (!textPage) {
      throw new Error("Failed to load text page");
    }
    try {
      const charCount = this.module._FPDFText_CountChars(textPage);
      if (charCount <= 0) {
        return "";
      }
      const bufferSize = (charCount + 1) * 2;
      const textPtr = this.module.wasmExports.malloc(bufferSize);
      try {
        const length = this.module._FPDFText_GetText(textPage, 0, charCount, textPtr);
        if (length <= 0) {
          return "";
        }
        const buffer = new Uint8Array(this.module.HEAPU8.buffer, textPtr, (length - 1) * 2);
        const text = new TextDecoder("utf-16le").decode(buffer);
        return text;
      } finally {
        this.module.wasmExports.free(textPtr);
      }
    } finally {
      this.module._FPDFText_ClosePage(textPage);
    }
  }
  render() {
    return __awaiter(this, arguments, void 0, function* (options2 = {}) {
      let formIdx = null;
      const renderOptions = Object.assign(Object.assign({}, DEFAULT_PAGE_RENDER_OPTIONS), options2);
      const { colorSpace, render, renderFormFields, transparent } = renderOptions;
      const { width, height, originalWidth, originalHeight } = this.getSize(renderOptions);
      if (renderFormFields) {
        formIdx = this.document.initializeFormFields();
        this.module._FORM_OnAfterLoadPage(this.pageIdx, formIdx);
      }
      const bytesPerPixel = FPDFBitmap[colorSpace];
      const buffSize = width * height * bytesPerPixel;
      const ptr = this.module.wasmExports.malloc(buffSize);
      let bitmap = null;
      if (ptr === 0) {
        throw new Error("Failed to allocate memory for bitmap");
      }
      try {
        bitmap = this.module._FPDFBitmap_CreateEx(width, height, bytesPerPixel, ptr, width * bytesPerPixel);
        const fillColor = transparent && colorSpace === "BGRA" ? 0 : 4294967295;
        this.module._FPDFBitmap_FillRect(
          bitmap,
          0,
          // left
          0,
          // top
          width,
          // width
          height,
          // height
          fillColor
        );
        let flags = FPDFRenderFlag.ANNOT | FPDFRenderFlag.LCD_TEXT;
        flags = colorSpace === "Gray" ? flags | FPDFRenderFlag.GRAYSCALE : flags | FPDFRenderFlag.REVERSE_BYTE_ORDER;
        this.module._FPDF_RenderPageBitmap(
          bitmap,
          this.pageIdx,
          0,
          // start_x
          0,
          // start_y
          width,
          // size_x
          height,
          // size_y
          0,
          // rotate (0, normal)
          flags
        );
        if (formIdx !== null) {
          const formFlags = flags & ~FPDFRenderFlag.ANNOT;
          this.module._FPDF_FFLDraw(
            formIdx,
            bitmap,
            this.pageIdx,
            0,
            // start_x
            0,
            // start_y
            width,
            // size_x
            height,
            // size_y
            0,
            // rotate (0, normal)
            formFlags
          );
          this.module._FORM_OnBeforeClosePage(this.pageIdx, formIdx);
        }
        const image = yield this.convertBitmapToImage({
          render,
          width,
          height,
          // ⚠️ creation of a copy is necessary to avoid memory corruption
          data: this.module.HEAPU8.slice(ptr, ptr + buffSize)
        });
        return {
          width,
          height,
          originalHeight,
          originalWidth,
          data: image
        };
      } finally {
        if (bitmap !== null) {
          this.module._FPDFBitmap_Destroy(bitmap);
        }
        this.module._FPDF_ClosePage(this.pageIdx);
        this.module.wasmExports.free(ptr);
      }
    });
  }
  convertBitmapToImage(options2) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield convertBitmapToImage(options2);
    });
  }
  getObjectCount() {
    return this.module._FPDFPage_CountObjects(this.pageIdx);
  }
  getObject(i) {
    const object = this.module._FPDFPage_GetObject(this.pageIdx, i);
    return PDFiumObjectBase.create({
      module: this.module,
      objectIdx: object,
      documentIdx: this.documentIdx,
      pageIdx: this.pageIdx
    });
  }
  *objects() {
    const objectsCount = this.getObjectCount();
    for (let i = 0; i < objectsCount; i++) {
      yield this.getObject(i);
    }
  }
};
var PDFiumDocument = class {
  constructor(options2) {
    this.formIdx = null;
    this.formPtr = null;
    this.module = options2.module;
    this.documentPtr = options2.documentPtr;
    this.documentIdx = options2.documentIdx;
  }
  /**
   * Initialize form environment for this document
   * This is required for rendering form fields such as signatures.
   * @returns The form handle
   */
  initializeFormFields() {
    if (this.formIdx !== null) {
      return this.formIdx;
    }
    const formSize = 256;
    this.formPtr = this.module.wasmExports.malloc(formSize);
    if (this.formPtr === 0) {
      throw new Error("Failed to allocate memory for form fill environment");
    }
    this.module.HEAPU8.fill(0, this.formPtr, this.formPtr + formSize);
    new DataView(this.module.HEAPU8.buffer).setUint32(this.formPtr, 2, true);
    this.formIdx = this.module._FPDFDOC_InitFormFillEnvironment(this.documentIdx, this.formPtr);
    if (this.formIdx === 0) {
      this.module.wasmExports.free(this.formPtr);
      this.formPtr = null;
      throw new Error("Failed to initialize form fill environment");
    }
    return this.formIdx;
  }
  /**
   * Get a page from the document by its index. The index is zero-based.
   */
  getPage(pageIndex) {
    const pageIdx = this.module._FPDF_LoadPage(this.documentIdx, pageIndex);
    return new PDFiumPage({
      module: this.module,
      pageIdx,
      documentIdx: this.documentIdx,
      pageIndex,
      document: this
    });
  }
  /**
   * User-friendly iterator to iterate over all pages in the document.
   */
  *pages() {
    const pageCount = this.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      yield this.getPage(i);
    }
  }
  /**
   * Get the number of pages in the document.
   */
  getPageCount() {
    return this.module._FPDF_GetPageCount(this.documentIdx);
  }
  /**
   * After you're done with the document, you should destroy it to free the memory.
   *
   * Otherwise, you'll be fired from your job for causing a memory leak. 😱
   */
  destroy() {
    if (this.formIdx) {
      this.module._FPDFDOC_ExitFormFillEnvironment(this.formIdx);
      this.formIdx = null;
    }
    if (this.formPtr) {
      this.module.wasmExports.free(this.formPtr);
      this.formPtr = null;
    }
    this.module._FPDF_CloseDocument(this.documentIdx);
    this.module.wasmExports.free(this.documentPtr);
  }
};
function lengthBytesUTF8(str) {
  let len = 0;
  for (let i = 0; i < str.length; ++i) {
    const c = str.charCodeAt(i);
    if (c <= 127) {
      len++;
    } else if (c <= 2047) {
      len += 2;
    } else if (c >= 55296 && c <= 57343) {
      len += 4;
      ++i;
    } else {
      len += 3;
    }
  }
  return len;
}
function stringToUTF8(str, heap, outIdx, maxBytesToWrite) {
  outIdx >>>= 0;
  if (!(maxBytesToWrite > 0))
    return 0;
  const startIdx = outIdx;
  const endIdx = outIdx + maxBytesToWrite - 1;
  for (let i = 0; i < str.length; ++i) {
    let u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343) {
      const u1 = str.charCodeAt(++i);
      u = 65536 + ((u & 1023) << 10) | u1 & 1023;
    }
    if (u <= 127) {
      if (outIdx >= endIdx)
        break;
      heap[outIdx++] = u;
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx)
        break;
      heap[outIdx++] = 192 | u >> 6;
      heap[outIdx++] = 128 | u & 63;
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx)
        break;
      heap[outIdx++] = 224 | u >> 12;
      heap[outIdx++] = 128 | u >> 6 & 63;
      heap[outIdx++] = 128 | u & 63;
    } else {
      if (outIdx + 3 >= endIdx)
        break;
      heap[outIdx++] = 240 | u >> 18;
      heap[outIdx++] = 128 | u >> 12 & 63;
      heap[outIdx++] = 128 | u >> 6 & 63;
      heap[outIdx++] = 128 | u & 63;
    }
  }
  heap[outIdx] = 0;
  return outIdx - startIdx;
}
var NO_OPTION_WARNING = "@hyzyla/pdfium: wasmUrl, wasmBinary is required for browser environment. \n\nPlease provide the wasm binary or URL to the init method. You can also use '@hyzyla/pdfium/browser/cdn'or '@hyzyla/pdfium/browser/base64' for quick setup, but it's not recommended for production use.";
function stringToCString(module, str) {
  const length = lengthBytesUTF8(str) + 1;
  const passwordPtr = module.wasmExports.malloc(length);
  stringToUTF8(str, module.HEAPU8, passwordPtr, length);
  return passwordPtr;
}
var PDFiumLibrary$1 = class PDFiumLibrary {
  static initBase(options2) {
    return __awaiter(this, void 0, void 0, function* () {
      const { wasmUrl, wasmBinary, instantiateWasm } = options2 || {};
      const loadOptions = {};
      if (wasmUrl) {
        loadOptions.locateFile = (_path) => wasmUrl;
      } else if (wasmBinary) {
        loadOptions.wasmBinary = wasmBinary;
        loadOptions.locateFile = () => "";
      } else if (instantiateWasm) {
        loadOptions.instantiateWasm = instantiateWasm;
      } else {
        if (typeof window !== "undefined") {
          console.error(NO_OPTION_WARNING);
          throw new Error(NO_OPTION_WARNING);
        }
      }
      const module = yield options2.vendor(loadOptions);
      module._FPDF_InitLibraryWithConfig({
        version: 2,
        m_pIsolate: null,
        m_pUserFontPaths: null,
        m_v8EmbedderSlot: 0,
        m_pPlatform: null
      });
      return new PDFiumLibrary(module);
    });
  }
  constructor(module) {
    this.module = module;
  }
  loadDocument(buff_1) {
    return __awaiter(this, arguments, void 0, function* (buff, password = "") {
      const size = buff.length;
      const documentPtr = this.module.wasmExports.malloc(size);
      this.module.HEAPU8.set(buff, documentPtr);
      let passwordPtr = 0;
      if (password) {
        passwordPtr = stringToCString(this.module, password);
      }
      const documentIdx = this.module._FPDF_LoadMemDocument(documentPtr, size, passwordPtr);
      if (!documentIdx) {
        const lastError = this.module._FPDF_GetLastError();
        this.module.wasmExports.free(documentPtr);
        if (passwordPtr !== 0) {
          this.module.wasmExports.free(passwordPtr);
        }
        switch (lastError) {
          case FPDFErrorCode.UNKNOWN:
            throw new Error("Unknown error");
          case FPDFErrorCode.FILE:
            throw new Error("File not found or could not be opened");
          case FPDFErrorCode.FORMAT:
            throw new Error("File not in PDF format or corrupted");
          case FPDFErrorCode.PASSWORD:
            throw new Error("Password required or incorrect password");
          case FPDFErrorCode.SECURITY:
            throw new Error("Unsupported security scheme");
          case FPDFErrorCode.PAGE:
            throw new Error("Page not found or content error");
          default:
            throw new Error(`PDF Loading = ${lastError}`);
        }
      }
      const document2 = new PDFiumDocument({
        module: this.module,
        documentPtr,
        documentIdx
      });
      if (passwordPtr !== null) {
        this.module.wasmExports.free(passwordPtr);
      }
      return document2;
    });
  }
  destroy() {
    this.module._FPDF_DestroyLibrary();
  }
};
var PDFiumModule = /* @__PURE__ */ (() => {
  return async function(moduleArg = {}) {
    var moduleRtn;
    var Module2 = moduleArg;
    var ENVIRONMENT_IS_WEB = typeof window == "object";
    var ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope != "undefined";
    var ENVIRONMENT_IS_NODE = typeof process == "object" && process.versions?.node && process.type != "renderer";
    var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
    if (ENVIRONMENT_IS_NODE) {
      const { createRequire } = await import("module");
      var require2 = createRequire(import.meta.url);
    }
    var thisProgram = "./this.program";
    var _scriptName = import.meta.url;
    var scriptDirectory = "";
    function locateFile(path) {
      if (Module2["locateFile"]) {
        return Module2["locateFile"](path, scriptDirectory);
      }
      return scriptDirectory + path;
    }
    var readAsync, readBinary;
    if (ENVIRONMENT_IS_NODE) {
      const isNode = typeof process == "object" && process.versions?.node && process.type != "renderer";
      if (!isNode)
        throw new Error(
          "not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)"
        );
      var nodeVersion = process.versions.node;
      var numericVersion = nodeVersion.split(".").slice(0, 3);
      numericVersion = numericVersion[0] * 1e4 + numericVersion[1] * 100 + numericVersion[2].split("-")[0] * 1;
      if (numericVersion < 16e4) {
        throw new Error("This emscripten-generated code requires node v16.0.0 (detected v" + nodeVersion + ")");
      }
      var fs = require2("fs");
      if (_scriptName.startsWith("file:")) {
        scriptDirectory = require2("path").dirname(require2("url").fileURLToPath(_scriptName)) + "/";
      }
      readBinary = (filename) => {
        filename = isFileURI(filename) ? new URL(filename) : filename;
        var ret = fs.readFileSync(filename);
        assert(Buffer.isBuffer(ret));
        return ret;
      };
      readAsync = async (filename, binary = true) => {
        filename = isFileURI(filename) ? new URL(filename) : filename;
        var ret = fs.readFileSync(filename, binary ? void 0 : "utf8");
        assert(binary ? Buffer.isBuffer(ret) : typeof ret == "string");
        return ret;
      };
      if (process.argv.length > 1) {
        thisProgram = process.argv[1].replace(/\\/g, "/");
      }
      process.argv.slice(2);
    } else if (ENVIRONMENT_IS_SHELL) {
      const isNode = typeof process == "object" && process.versions?.node && process.type != "renderer";
      if (isNode || typeof window == "object" || typeof WorkerGlobalScope != "undefined")
        throw new Error(
          "not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)"
        );
    } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      try {
        scriptDirectory = new URL(".", _scriptName).href;
      } catch {
      }
      if (!(typeof window == "object" || typeof WorkerGlobalScope != "undefined"))
        throw new Error(
          "not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)"
        );
      {
        if (ENVIRONMENT_IS_WORKER) {
          readBinary = (url) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, false);
            xhr.responseType = "arraybuffer";
            xhr.send(null);
            return new Uint8Array(xhr.response);
          };
        }
        readAsync = async (url) => {
          if (isFileURI(url)) {
            return new Promise((resolve2, reject) => {
              var xhr = new XMLHttpRequest();
              xhr.open("GET", url, true);
              xhr.responseType = "arraybuffer";
              xhr.onload = () => {
                if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                  resolve2(xhr.response);
                  return;
                }
                reject(xhr.status);
              };
              xhr.onerror = reject;
              xhr.send(null);
            });
          }
          var response = await fetch(url, { credentials: "same-origin" });
          if (response.ok) {
            return response.arrayBuffer();
          }
          throw new Error(response.status + " : " + response.url);
        };
      }
    } else {
      throw new Error("environment detection error");
    }
    var out = console.log.bind(console);
    var err = console.error.bind(console);
    assert(
      !ENVIRONMENT_IS_SHELL,
      "shell environment detected but not enabled at build time.  Add `shell` to `-sENVIRONMENT` to enable."
    );
    var wasmBinary;
    if (typeof WebAssembly != "object") {
      err("no native wasm support detected");
    }
    var ABORT = false;
    function assert(condition, text) {
      if (!condition) {
        abort("Assertion failed" + (text ? ": " + text : ""));
      }
    }
    var isFileURI = (filename) => filename.startsWith("file://");
    function writeStackCookie() {
      var max = _emscripten_stack_get_end();
      assert((max & 3) == 0);
      if (max == 0) {
        max += 4;
      }
      HEAPU32[max >> 2] = 34821223;
      HEAPU32[max + 4 >> 2] = 2310721022;
      HEAPU32[0 >> 2] = 1668509029;
    }
    function checkStackCookie() {
      if (ABORT) return;
      var max = _emscripten_stack_get_end();
      if (max == 0) {
        max += 4;
      }
      var cookie1 = HEAPU32[max >> 2];
      var cookie2 = HEAPU32[max + 4 >> 2];
      if (cookie1 != 34821223 || cookie2 != 2310721022) {
        abort(
          `Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${ptrToString(cookie2)} ${ptrToString(cookie1)}`
        );
      }
      if (HEAPU32[0 >> 2] != 1668509029) {
        abort("Runtime error: The application has corrupted its heap memory area (address zero)!");
      }
    }
    (() => {
      var h16 = new Int16Array(1);
      var h8 = new Int8Array(h16.buffer);
      h16[0] = 25459;
      if (h8[0] !== 115 || h8[1] !== 99)
        throw "Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)";
    })();
    function consumedModuleProp(prop) {
      if (!Object.getOwnPropertyDescriptor(Module2, prop)) {
        Object.defineProperty(Module2, prop, {
          configurable: true,
          set() {
            abort(
              `Attempt to set \`Module.${prop}\` after it has already been processed.  This can happen, for example, when code is injected via '--post-js' rather than '--pre-js'`
            );
          }
        });
      }
    }
    function makeInvalidEarlyAccess(name) {
      return () => assert(false, `call to '${name}' via reference taken before Wasm module initialization`);
    }
    function ignoredModuleProp(prop) {
      if (Object.getOwnPropertyDescriptor(Module2, prop)) {
        abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
      }
    }
    function isExportedByForceFilesystem(name) {
      return name === "FS_createPath" || name === "FS_createDataFile" || name === "FS_createPreloadedFile" || name === "FS_unlink" || name === "addRunDependency" || name === "FS_createLazyFile" || name === "FS_createDevice" || name === "removeRunDependency";
    }
    function hookGlobalSymbolAccess(sym, func) {
      if (typeof globalThis != "undefined" && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
        Object.defineProperty(globalThis, sym, {
          configurable: true,
          get() {
            func();
            return void 0;
          }
        });
      }
    }
    function missingGlobal(sym, msg) {
      hookGlobalSymbolAccess(sym, () => {
        warnOnce(`\`${sym}\` is not longer defined by emscripten. ${msg}`);
      });
    }
    missingGlobal("buffer", "Please use HEAP8.buffer or wasmMemory.buffer");
    missingGlobal("asm", "Please use wasmExports instead");
    function missingLibrarySymbol(sym) {
      hookGlobalSymbolAccess(sym, () => {
        var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
        var librarySymbol = sym;
        if (!librarySymbol.startsWith("_")) {
          librarySymbol = "$" + sym;
        }
        msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
        if (isExportedByForceFilesystem(sym)) {
          msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
        }
        warnOnce(msg);
      });
      unexportedRuntimeSymbol(sym);
    }
    function unexportedRuntimeSymbol(sym) {
      if (!Object.getOwnPropertyDescriptor(Module2, sym)) {
        Object.defineProperty(Module2, sym, {
          configurable: true,
          get() {
            var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
            if (isExportedByForceFilesystem(sym)) {
              msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
            }
            abort(msg);
          }
        });
      }
    }
    var readyPromiseResolve, readyPromiseReject;
    var wasmMemory;
    var HEAP8, HEAPU8, HEAP16, HEAP32, HEAPU32;
    var HEAP64;
    var runtimeInitialized = false;
    function updateMemoryViews() {
      var b = wasmMemory.buffer;
      Module2["HEAP8"] = HEAP8 = new Int8Array(b);
      Module2["HEAP16"] = HEAP16 = new Int16Array(b);
      Module2["HEAPU8"] = HEAPU8 = new Uint8Array(b);
      Module2["HEAPU16"] = new Uint16Array(b);
      Module2["HEAP32"] = HEAP32 = new Int32Array(b);
      Module2["HEAPU32"] = HEAPU32 = new Uint32Array(b);
      Module2["HEAPF32"] = new Float32Array(b);
      Module2["HEAPF64"] = new Float64Array(b);
      HEAP64 = new BigInt64Array(b);
      new BigUint64Array(b);
    }
    assert(
      typeof Int32Array != "undefined" && typeof Float64Array !== "undefined" && Int32Array.prototype.subarray != void 0 && Int32Array.prototype.set != void 0,
      "JS engine does not provide full typed array support"
    );
    function preRun() {
      if (Module2["preRun"]) {
        if (typeof Module2["preRun"] == "function") Module2["preRun"] = [Module2["preRun"]];
        while (Module2["preRun"].length) {
          addOnPreRun(Module2["preRun"].shift());
        }
      }
      consumedModuleProp("preRun");
      callRuntimeCallbacks(onPreRuns);
    }
    function initRuntime() {
      assert(!runtimeInitialized);
      runtimeInitialized = true;
      checkStackCookie();
      if (!Module2["noFSInit"] && !FS.initialized) FS.init();
      wasmExports["__wasm_call_ctors"]();
      FS.ignorePermissions = false;
    }
    function postRun() {
      checkStackCookie();
      if (Module2["postRun"]) {
        if (typeof Module2["postRun"] == "function") Module2["postRun"] = [Module2["postRun"]];
        while (Module2["postRun"].length) {
          addOnPostRun(Module2["postRun"].shift());
        }
      }
      consumedModuleProp("postRun");
      callRuntimeCallbacks(onPostRuns);
    }
    var runDependencies = 0;
    var dependenciesFulfilled = null;
    var runDependencyTracking = {};
    var runDependencyWatcher = null;
    function addRunDependency(id) {
      runDependencies++;
      Module2["monitorRunDependencies"]?.(runDependencies);
      if (id) {
        assert(!runDependencyTracking[id]);
        runDependencyTracking[id] = 1;
        if (runDependencyWatcher === null && typeof setInterval != "undefined") {
          runDependencyWatcher = setInterval(() => {
            if (ABORT) {
              clearInterval(runDependencyWatcher);
              runDependencyWatcher = null;
              return;
            }
            var shown = false;
            for (var dep in runDependencyTracking) {
              if (!shown) {
                shown = true;
                err("still waiting on run dependencies:");
              }
              err(`dependency: ${dep}`);
            }
            if (shown) {
              err("(end of list)");
            }
          }, 1e4);
        }
      } else {
        err("warning: run dependency added without ID");
      }
    }
    function removeRunDependency(id) {
      runDependencies--;
      Module2["monitorRunDependencies"]?.(runDependencies);
      if (id) {
        assert(runDependencyTracking[id]);
        delete runDependencyTracking[id];
      } else {
        err("warning: run dependency removed without ID");
      }
      if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    function abort(what) {
      Module2["onAbort"]?.(what);
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject?.(e);
      throw e;
    }
    function createExportWrapper(name, nargs) {
      return (...args) => {
        assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
        var f = wasmExports[name];
        assert(f, `exported native function \`${name}\` not found`);
        assert(
          args.length <= nargs,
          `native function \`${name}\` called with ${args.length} args but expects ${nargs}`
        );
        return f(...args);
      };
    }
    var wasmBinaryFile;
    function findWasmBinary() {
      if (Module2["locateFile"]) {
        return locateFile("pdfium.wasm");
      }
      return new URL("pdfium.wasm", import.meta.url).href;
    }
    function getBinarySync(file) {
      if (file == wasmBinaryFile && wasmBinary) {
        return new Uint8Array(wasmBinary);
      }
      if (readBinary) {
        return readBinary(file);
      }
      throw "both async and sync fetching of the wasm failed";
    }
    async function getWasmBinary(binaryFile) {
      if (!wasmBinary) {
        try {
          var response = await readAsync(binaryFile);
          return new Uint8Array(response);
        } catch {
        }
      }
      return getBinarySync(binaryFile);
    }
    async function instantiateArrayBuffer(binaryFile, imports) {
      try {
        var binary = await getWasmBinary(binaryFile);
        var instance = await WebAssembly.instantiate(binary, imports);
        return instance;
      } catch (reason) {
        err(`failed to asynchronously prepare wasm: ${reason}`);
        if (isFileURI(wasmBinaryFile)) {
          err(
            `warning: Loading from a file URI (${wasmBinaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`
          );
        }
        abort(reason);
      }
    }
    async function instantiateAsync(binary, binaryFile, imports) {
      if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE) {
        try {
          var response = fetch(binaryFile, { credentials: "same-origin" });
          var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
          return instantiationResult;
        } catch (reason) {
          err(`wasm streaming compile failed: ${reason}`);
          err("falling back to ArrayBuffer instantiation");
        }
      }
      return instantiateArrayBuffer(binaryFile, imports);
    }
    function getWasmImports() {
      return { env: wasmImports, wasi_snapshot_preview1: wasmImports };
    }
    async function createWasm() {
      function receiveInstance(instance, module) {
        wasmExports = instance.exports;
        Module2["wasmExports"] = wasmExports;
        wasmMemory = wasmExports["memory"];
        assert(wasmMemory, "memory not found in wasm exports");
        updateMemoryViews();
        wasmTable = wasmExports["__indirect_function_table"];
        assert(wasmTable, "table not found in wasm exports");
        assignWasmExports(wasmExports);
        removeRunDependency("wasm-instantiate");
        return wasmExports;
      }
      addRunDependency("wasm-instantiate");
      var trueModule = Module2;
      function receiveInstantiationResult(result2) {
        assert(
          Module2 === trueModule,
          "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?"
        );
        trueModule = null;
        return receiveInstance(result2["instance"]);
      }
      var info = getWasmImports();
      if (Module2["instantiateWasm"]) {
        return new Promise((resolve2, reject) => {
          try {
            Module2["instantiateWasm"](info, (mod, inst) => {
              resolve2(receiveInstance(mod, inst));
            });
          } catch (e) {
            err(`Module.instantiateWasm callback failed with error: ${e}`);
            reject(e);
          }
        });
      }
      wasmBinaryFile ??= findWasmBinary();
      var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
      var exports$1 = receiveInstantiationResult(result);
      return exports$1;
    }
    var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        callbacks.shift()(Module2);
      }
    };
    var onPostRuns = [];
    var addOnPostRun = (cb) => onPostRuns.push(cb);
    var onPreRuns = [];
    var addOnPreRun = (cb) => onPreRuns.push(cb);
    var ptrToString = (ptr) => {
      assert(typeof ptr === "number");
      ptr >>>= 0;
      return "0x" + ptr.toString(16).padStart(8, "0");
    };
    var stackRestore = (val) => __emscripten_stack_restore(val);
    var stackSave = () => _emscripten_stack_get_current();
    var warnOnce = (text) => {
      warnOnce.shown ||= {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        if (ENVIRONMENT_IS_NODE) text = "warning: " + text;
        err(text);
      }
    };
    var syscallGetVarargI = () => {
      assert(SYSCALLS.varargs != void 0);
      var ret = HEAP32[+SYSCALLS.varargs >> 2];
      SYSCALLS.varargs += 4;
      return ret;
    };
    var syscallGetVarargP = syscallGetVarargI;
    var PATH = {
      isAbs: (path) => path.charAt(0) === "/",
      splitPath: (filename) => {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },
      normalizeArray: (parts, allowAboveRoot) => {
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === ".") {
            parts.splice(i, 1);
          } else if (last === "..") {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift("..");
          }
        }
        return parts;
      },
      normalize: (path) => {
        var isAbsolute = PATH.isAbs(path), trailingSlash = path.slice(-1) === "/";
        path = PATH.normalizeArray(
          path.split("/").filter((p) => !!p),
          !isAbsolute
        ).join("/");
        if (!path && !isAbsolute) {
          path = ".";
        }
        if (path && trailingSlash) {
          path += "/";
        }
        return (isAbsolute ? "/" : "") + path;
      },
      dirname: (path) => {
        var result = PATH.splitPath(path), root = result[0], dir = result[1];
        if (!root && !dir) {
          return ".";
        }
        if (dir) {
          dir = dir.slice(0, -1);
        }
        return root + dir;
      },
      basename: (path) => path && path.match(/([^\/]+|\/)\/*$/)[1],
      join: (...paths) => PATH.normalize(paths.join("/")),
      join2: (l, r) => PATH.normalize(l + "/" + r)
    };
    var initRandomFill = () => {
      if (ENVIRONMENT_IS_NODE) {
        var nodeCrypto = require2("crypto");
        return (view) => nodeCrypto.randomFillSync(view);
      }
      return (view) => crypto.getRandomValues(view);
    };
    var randomFill = (view) => {
      (randomFill = initRandomFill())(view);
    };
    var PATH_FS = {
      resolve: (...args) => {
        var resolvedPath = "", resolvedAbsolute = false;
        for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = i >= 0 ? args[i] : FS.cwd();
          if (typeof path != "string") {
            throw new TypeError("Arguments to path.resolve must be strings");
          } else if (!path) {
            return "";
          }
          resolvedPath = path + "/" + resolvedPath;
          resolvedAbsolute = PATH.isAbs(path);
        }
        resolvedPath = PATH.normalizeArray(
          resolvedPath.split("/").filter((p) => !!p),
          !resolvedAbsolute
        ).join("/");
        return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
      },
      relative: (from, to) => {
        from = PATH_FS.resolve(from).slice(1);
        to = PATH_FS.resolve(to).slice(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== "") break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== "") break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split("/"));
        var toParts = trim(to.split("/"));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push("..");
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join("/");
      }
    };
    var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder() : void 0;
    var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead = NaN) => {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = "";
      while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          if ((u0 & 248) != 240)
            warnOnce(
              "Invalid UTF-8 leading byte " + ptrToString(u0) + " encountered when deserializing a UTF-8 string in wasm memory to a JS string!"
            );
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    };
    var FS_stdin_getChar_buffer = [];
    var lengthBytesUTF82 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var c = str.charCodeAt(i);
        if (c <= 127) {
          len++;
        } else if (c <= 2047) {
          len += 2;
        } else if (c >= 55296 && c <= 57343) {
          len += 4;
          ++i;
        } else {
          len += 3;
        }
      }
      return len;
    };
    var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
      assert(typeof str === "string", `stringToUTF8Array expects a string (got ${typeof str})`);
      if (!(maxBytesToWrite > 0)) return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i = 0; i < str.length; ++i) {
        var u = str.codePointAt(i);
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | u >> 6;
          heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | u >> 12;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        } else {
          if (outIdx + 3 >= endIdx) break;
          if (u > 1114111)
            warnOnce(
              "Invalid Unicode code point " + ptrToString(u) + " encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF)."
            );
          heap[outIdx++] = 240 | u >> 18;
          heap[outIdx++] = 128 | u >> 12 & 63;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
          i++;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    };
    var intArrayFromString = (stringy, dontAddNull, length) => {
      var len = lengthBytesUTF82(stringy) + 1;
      var u8array = new Array(len);
      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
      u8array.length = numBytesWritten;
      return u8array;
    };
    var FS_stdin_getChar = () => {
      if (!FS_stdin_getChar_buffer.length) {
        var result = null;
        if (ENVIRONMENT_IS_NODE) {
          var BUFSIZE = 256;
          var buf = Buffer.alloc(BUFSIZE);
          var bytesRead = 0;
          var fd = process.stdin.fd;
          try {
            bytesRead = fs.readSync(fd, buf, 0, BUFSIZE);
          } catch (e) {
            if (e.toString().includes("EOF")) bytesRead = 0;
            else throw e;
          }
          if (bytesRead > 0) {
            result = buf.slice(0, bytesRead).toString("utf-8");
          }
        } else if (typeof window != "undefined" && typeof window.prompt == "function") {
          result = window.prompt("Input: ");
          if (result !== null) {
            result += "\n";
          }
        } else ;
        if (!result) {
          return null;
        }
        FS_stdin_getChar_buffer = intArrayFromString(result);
      }
      return FS_stdin_getChar_buffer.shift();
    };
    var TTY = {
      ttys: [],
      init() {
      },
      shutdown() {
      },
      register(dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },
      stream_ops: {
        open(stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(43);
          }
          stream.tty = tty;
          stream.seekable = false;
        },
        close(stream) {
          stream.tty.ops.fsync(stream.tty);
        },
        fsync(stream) {
          stream.tty.ops.fsync(stream.tty);
        },
        read(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(60);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === void 0 && bytesRead === 0) {
              throw new FS.ErrnoError(6);
            }
            if (result === null || result === void 0) break;
            bytesRead++;
            buffer[offset + i] = result;
          }
          if (bytesRead) {
            stream.node.atime = Date.now();
          }
          return bytesRead;
        },
        write(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(60);
          }
          try {
            for (var i = 0; i < length; i++) {
              stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
            }
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (length) {
            stream.node.mtime = stream.node.ctime = Date.now();
          }
          return i;
        }
      },
      default_tty_ops: {
        get_char(tty) {
          return FS_stdin_getChar();
        },
        put_char(tty, val) {
          if (val === null || val === 10) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },
        fsync(tty) {
          if (tty.output?.length > 0) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        },
        ioctl_tcgets(tty) {
          return {
            c_iflag: 25856,
            c_oflag: 5,
            c_cflag: 191,
            c_lflag: 35387,
            c_cc: [
              3,
              28,
              127,
              21,
              4,
              0,
              1,
              0,
              17,
              19,
              26,
              0,
              18,
              15,
              23,
              22,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0
            ]
          };
        },
        ioctl_tcsets(tty, optional_actions, data) {
          return 0;
        },
        ioctl_tiocgwinsz(tty) {
          return [24, 80];
        }
      },
      default_tty1_ops: {
        put_char(tty, val) {
          if (val === null || val === 10) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },
        fsync(tty) {
          if (tty.output?.length > 0) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        }
      }
    };
    var zeroMemory = (ptr, size) => HEAPU8.fill(0, ptr, ptr + size);
    var alignMemory = (size, alignment) => {
      assert(alignment, "alignment argument is required");
      return Math.ceil(size / alignment) * alignment;
    };
    var mmapAlloc = (size) => {
      size = alignMemory(size, 65536);
      var ptr = _emscripten_builtin_memalign(65536, size);
      if (ptr) zeroMemory(ptr, size);
      return ptr;
    };
    var MEMFS = {
      ops_table: null,
      mount(mount) {
        return MEMFS.createNode(null, "/", 16895, 0);
      },
      createNode(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          throw new FS.ErrnoError(63);
        }
        MEMFS.ops_table ||= {
          dir: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              lookup: MEMFS.node_ops.lookup,
              mknod: MEMFS.node_ops.mknod,
              rename: MEMFS.node_ops.rename,
              unlink: MEMFS.node_ops.unlink,
              rmdir: MEMFS.node_ops.rmdir,
              readdir: MEMFS.node_ops.readdir,
              symlink: MEMFS.node_ops.symlink
            },
            stream: { llseek: MEMFS.stream_ops.llseek }
          },
          file: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek,
              read: MEMFS.stream_ops.read,
              write: MEMFS.stream_ops.write,
              mmap: MEMFS.stream_ops.mmap,
              msync: MEMFS.stream_ops.msync
            }
          },
          link: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              readlink: MEMFS.node_ops.readlink
            },
            stream: {}
          },
          chrdev: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: FS.chrdev_stream_ops
          }
        };
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0;
          node.contents = null;
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.atime = node.mtime = node.ctime = Date.now();
        if (parent) {
          parent.contents[name] = node;
          parent.atime = parent.mtime = parent.ctime = node.atime;
        }
        return node;
      },
      getFileDataAsTypedArray(node) {
        if (!node.contents) return new Uint8Array(0);
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
        return new Uint8Array(node.contents);
      },
      expandFileStorage(node, newCapacity) {
        var prevCapacity = node.contents ? node.contents.length : 0;
        if (prevCapacity >= newCapacity) return;
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
        var oldContents = node.contents;
        node.contents = new Uint8Array(newCapacity);
        if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
      },
      resizeFileStorage(node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null;
          node.usedBytes = 0;
        } else {
          var oldContents = node.contents;
          node.contents = new Uint8Array(newSize);
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
          }
          node.usedBytes = newSize;
        }
      },
      node_ops: {
        getattr(node) {
          var attr = {};
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.atime);
          attr.mtime = new Date(node.mtime);
          attr.ctime = new Date(node.ctime);
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },
        setattr(node, attr) {
          for (const key of ["mode", "atime", "mtime", "ctime"]) {
            if (attr[key] != null) {
              node[key] = attr[key];
            }
          }
          if (attr.size !== void 0) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },
        lookup(parent, name) {
          throw new FS.ErrnoError(44);
        },
        mknod(parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },
        rename(old_node, new_dir, new_name) {
          var new_node;
          try {
            new_node = FS.lookupNode(new_dir, new_name);
          } catch (e) {
          }
          if (new_node) {
            if (FS.isDir(old_node.mode)) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(55);
              }
            }
            FS.hashRemoveNode(new_node);
          }
          delete old_node.parent.contents[old_node.name];
          new_dir.contents[new_name] = old_node;
          old_node.name = new_name;
          new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
        },
        unlink(parent, name) {
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
        rmdir(parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(55);
          }
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
        readdir(node) {
          return [".", "..", ...Object.keys(node.contents)];
        },
        symlink(parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
          node.link = oldpath;
          return node;
        },
        readlink(node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(28);
          }
          return node.link;
        }
      },
      stream_ops: {
        read(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) {
            buffer.set(contents.subarray(position, position + size), offset);
          } else {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },
        write(stream, buffer, offset, length, position, canOwn) {
          assert(!(buffer instanceof ArrayBuffer));
          if (buffer.buffer === HEAP8.buffer) {
            canOwn = false;
          }
          if (!length) return 0;
          var node = stream.node;
          node.mtime = node.ctime = Date.now();
          if (buffer.subarray && (!node.contents || node.contents.subarray)) {
            if (canOwn) {
              assert(position === 0, "canOwn must imply no weird position inside the file");
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) {
              node.contents = buffer.slice(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) {
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
          MEMFS.expandFileStorage(node, position + length);
          if (node.contents.subarray && buffer.subarray) {
            node.contents.set(buffer.subarray(offset, offset + length), position);
          } else {
            for (var i = 0; i < length; i++) {
              node.contents[position + i] = buffer[offset + i];
            }
          }
          node.usedBytes = Math.max(node.usedBytes, position + length);
          return length;
        },
        llseek(stream, offset, whence) {
          var position = offset;
          if (whence === 1) {
            position += stream.position;
          } else if (whence === 2) {
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(28);
          }
          return position;
        },
        mmap(stream, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          if (!(flags & 2) && contents && contents.buffer === HEAP8.buffer) {
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            allocated = true;
            ptr = mmapAlloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(48);
            }
            if (contents) {
              if (position > 0 || position + length < contents.length) {
                if (contents.subarray) {
                  contents = contents.subarray(position, position + length);
                } else {
                  contents = Array.prototype.slice.call(contents, position, position + length);
                }
              }
              HEAP8.set(contents, ptr);
            }
          }
          return { ptr, allocated };
        },
        msync(stream, buffer, offset, length, mmapFlags) {
          MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          return 0;
        }
      }
    };
    var asyncLoad = async (url) => {
      var arrayBuffer = await readAsync(url);
      assert(arrayBuffer, `Loading data file "${url}" failed (no arrayBuffer).`);
      return new Uint8Array(arrayBuffer);
    };
    var FS_createDataFile = (...args) => FS.createDataFile(...args);
    var getUniqueRunDependency = (id) => {
      var orig = id;
      while (1) {
        if (!runDependencyTracking[id]) return id;
        id = orig + Math.random();
      }
    };
    var preloadPlugins = [];
    var FS_handledByPreloadPlugin = (byteArray, fullname, finish, onerror) => {
      if (typeof Browser != "undefined") Browser.init();
      var handled = false;
      preloadPlugins.forEach((plugin) => {
        if (handled) return;
        if (plugin["canHandle"](fullname)) {
          plugin["handle"](byteArray, fullname, finish, onerror);
          handled = true;
        }
      });
      return handled;
    };
    var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency(`cp ${fullname}`);
      function processData(byteArray) {
        function finish(byteArray2) {
          preFinish?.();
          if (!dontCreateFile) {
            FS_createDataFile(parent, name, byteArray2, canRead, canWrite, canOwn);
          }
          onload?.();
          removeRunDependency(dep);
        }
        if (FS_handledByPreloadPlugin(byteArray, fullname, finish, () => {
          onerror?.();
          removeRunDependency(dep);
        })) {
          return;
        }
        finish(byteArray);
      }
      addRunDependency(dep);
      if (typeof url == "string") {
        asyncLoad(url).then(processData, onerror);
      } else {
        processData(url);
      }
    };
    var FS_modeStringToFlags = (str) => {
      var flagModes = {
        r: 0,
        "r+": 2,
        w: 512 | 64 | 1,
        "w+": 512 | 64 | 2,
        a: 1024 | 64 | 1,
        "a+": 1024 | 64 | 2
      };
      var flags = flagModes[str];
      if (typeof flags == "undefined") {
        throw new Error(`Unknown file open mode: ${str}`);
      }
      return flags;
    };
    var FS_getMode = (canRead, canWrite) => {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode;
    };
    var UTF8ToString = (ptr, maxBytesToRead) => {
      assert(typeof ptr == "number", `UTF8ToString expects a number (got ${typeof ptr})`);
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
    };
    var strError = (errno) => UTF8ToString(_strerror(errno));
    var ERRNO_CODES = {
      EPERM: 63,
      ENOENT: 44,
      ESRCH: 71,
      EINTR: 27,
      EIO: 29,
      ENXIO: 60,
      E2BIG: 1,
      ENOEXEC: 45,
      EBADF: 8,
      ECHILD: 12,
      EAGAIN: 6,
      EWOULDBLOCK: 6,
      ENOMEM: 48,
      EACCES: 2,
      EFAULT: 21,
      ENOTBLK: 105,
      EBUSY: 10,
      EEXIST: 20,
      EXDEV: 75,
      ENODEV: 43,
      ENOTDIR: 54,
      EISDIR: 31,
      EINVAL: 28,
      ENFILE: 41,
      EMFILE: 33,
      ENOTTY: 59,
      ETXTBSY: 74,
      EFBIG: 22,
      ENOSPC: 51,
      ESPIPE: 70,
      EROFS: 69,
      EMLINK: 34,
      EPIPE: 64,
      EDOM: 18,
      ERANGE: 68,
      ENOMSG: 49,
      EIDRM: 24,
      ECHRNG: 106,
      EL2NSYNC: 156,
      EL3HLT: 107,
      EL3RST: 108,
      ELNRNG: 109,
      EUNATCH: 110,
      ENOCSI: 111,
      EL2HLT: 112,
      EDEADLK: 16,
      ENOLCK: 46,
      EBADE: 113,
      EBADR: 114,
      EXFULL: 115,
      ENOANO: 104,
      EBADRQC: 103,
      EBADSLT: 102,
      EDEADLOCK: 16,
      EBFONT: 101,
      ENOSTR: 100,
      ENODATA: 116,
      ETIME: 117,
      ENOSR: 118,
      ENONET: 119,
      ENOPKG: 120,
      EREMOTE: 121,
      ENOLINK: 47,
      EADV: 122,
      ESRMNT: 123,
      ECOMM: 124,
      EPROTO: 65,
      EMULTIHOP: 36,
      EDOTDOT: 125,
      EBADMSG: 9,
      ENOTUNIQ: 126,
      EBADFD: 127,
      EREMCHG: 128,
      ELIBACC: 129,
      ELIBBAD: 130,
      ELIBSCN: 131,
      ELIBMAX: 132,
      ELIBEXEC: 133,
      ENOSYS: 52,
      ENOTEMPTY: 55,
      ENAMETOOLONG: 37,
      ELOOP: 32,
      EOPNOTSUPP: 138,
      EPFNOSUPPORT: 139,
      ECONNRESET: 15,
      ENOBUFS: 42,
      EAFNOSUPPORT: 5,
      EPROTOTYPE: 67,
      ENOTSOCK: 57,
      ENOPROTOOPT: 50,
      ESHUTDOWN: 140,
      ECONNREFUSED: 14,
      EADDRINUSE: 3,
      ECONNABORTED: 13,
      ENETUNREACH: 40,
      ENETDOWN: 38,
      ETIMEDOUT: 73,
      EHOSTDOWN: 142,
      EHOSTUNREACH: 23,
      EINPROGRESS: 26,
      EALREADY: 7,
      EDESTADDRREQ: 17,
      EMSGSIZE: 35,
      EPROTONOSUPPORT: 66,
      ESOCKTNOSUPPORT: 137,
      EADDRNOTAVAIL: 4,
      ENETRESET: 39,
      EISCONN: 30,
      ENOTCONN: 53,
      ETOOMANYREFS: 141,
      EUSERS: 136,
      EDQUOT: 19,
      ESTALE: 72,
      ENOTSUP: 138,
      ENOMEDIUM: 148,
      EILSEQ: 25,
      EOVERFLOW: 61,
      ECANCELED: 11,
      ENOTRECOVERABLE: 56,
      EOWNERDEAD: 62,
      ESTRPIPE: 135
    };
    var FS = {
      root: null,
      mounts: [],
      devices: {},
      streams: [],
      nextInode: 1,
      nameTable: null,
      currentPath: "/",
      initialized: false,
      ignorePermissions: true,
      filesystems: null,
      syncFSRequests: 0,
      readFiles: {},
      ErrnoError: class extends Error {
        name = "ErrnoError";
        constructor(errno) {
          super(runtimeInitialized ? strError(errno) : "");
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
        }
      },
      FSStream: class {
        shared = {};
        get object() {
          return this.node;
        }
        set object(val) {
          this.node = val;
        }
        get isRead() {
          return (this.flags & 2097155) !== 1;
        }
        get isWrite() {
          return (this.flags & 2097155) !== 0;
        }
        get isAppend() {
          return this.flags & 1024;
        }
        get flags() {
          return this.shared.flags;
        }
        set flags(val) {
          this.shared.flags = val;
        }
        get position() {
          return this.shared.position;
        }
        set position(val) {
          this.shared.position = val;
        }
      },
      FSNode: class {
        node_ops = {};
        stream_ops = {};
        readMode = 292 | 73;
        writeMode = 146;
        mounted = null;
        constructor(parent, name, mode, rdev) {
          if (!parent) {
            parent = this;
          }
          this.parent = parent;
          this.mount = parent.mount;
          this.id = FS.nextInode++;
          this.name = name;
          this.mode = mode;
          this.rdev = rdev;
          this.atime = this.mtime = this.ctime = Date.now();
        }
        get read() {
          return (this.mode & this.readMode) === this.readMode;
        }
        set read(val) {
          val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
        }
        get write() {
          return (this.mode & this.writeMode) === this.writeMode;
        }
        set write(val) {
          val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
        }
        get isFolder() {
          return FS.isDir(this.mode);
        }
        get isDevice() {
          return FS.isChrdev(this.mode);
        }
      },
      lookupPath(path, opts = {}) {
        if (!path) {
          throw new FS.ErrnoError(44);
        }
        opts.follow_mount ??= true;
        if (!PATH.isAbs(path)) {
          path = FS.cwd() + "/" + path;
        }
        linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
          var parts = path.split("/").filter((p) => !!p);
          var current = FS.root;
          var current_path = "/";
          for (var i = 0; i < parts.length; i++) {
            var islast = i === parts.length - 1;
            if (islast && opts.parent) {
              break;
            }
            if (parts[i] === ".") {
              continue;
            }
            if (parts[i] === "..") {
              current_path = PATH.dirname(current_path);
              if (FS.isRoot(current)) {
                path = current_path + "/" + parts.slice(i + 1).join("/");
                continue linkloop;
              } else {
                current = current.parent;
              }
              continue;
            }
            current_path = PATH.join2(current_path, parts[i]);
            try {
              current = FS.lookupNode(current, parts[i]);
            } catch (e) {
              if (e?.errno === 44 && islast && opts.noent_okay) {
                return { path: current_path };
              }
              throw e;
            }
            if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) {
              current = current.mounted.root;
            }
            if (FS.isLink(current.mode) && (!islast || opts.follow)) {
              if (!current.node_ops.readlink) {
                throw new FS.ErrnoError(52);
              }
              var link = current.node_ops.readlink(current);
              if (!PATH.isAbs(link)) {
                link = PATH.dirname(current_path) + "/" + link;
              }
              path = link + "/" + parts.slice(i + 1).join("/");
              continue linkloop;
            }
          }
          return { path: current_path, node: current };
        }
        throw new FS.ErrnoError(32);
      },
      getPath(node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
          }
          path = path ? `${node.name}/${path}` : node.name;
          node = node.parent;
        }
      },
      hashName(parentid, name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
          hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
        }
        return (parentid + hash >>> 0) % FS.nameTable.length;
      },
      hashAddNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },
      hashRemoveNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },
      lookupNode(parent, name) {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        return FS.lookup(parent, name);
      },
      createNode(parent, name, mode, rdev) {
        assert(typeof parent == "object");
        var node = new FS.FSNode(parent, name, mode, rdev);
        FS.hashAddNode(node);
        return node;
      },
      destroyNode(node) {
        FS.hashRemoveNode(node);
      },
      isRoot(node) {
        return node === node.parent;
      },
      isMountpoint(node) {
        return !!node.mounted;
      },
      isFile(mode) {
        return (mode & 61440) === 32768;
      },
      isDir(mode) {
        return (mode & 61440) === 16384;
      },
      isLink(mode) {
        return (mode & 61440) === 40960;
      },
      isChrdev(mode) {
        return (mode & 61440) === 8192;
      },
      isBlkdev(mode) {
        return (mode & 61440) === 24576;
      },
      isFIFO(mode) {
        return (mode & 61440) === 4096;
      },
      isSocket(mode) {
        return (mode & 49152) === 49152;
      },
      flagsToPermissionString(flag) {
        var perms = ["r", "w", "rw"][flag & 3];
        if (flag & 512) {
          perms += "w";
        }
        return perms;
      },
      nodePermissions(node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        if (perms.includes("r") && !(node.mode & 292)) {
          return 2;
        } else if (perms.includes("w") && !(node.mode & 146)) {
          return 2;
        } else if (perms.includes("x") && !(node.mode & 73)) {
          return 2;
        }
        return 0;
      },
      mayLookup(dir) {
        if (!FS.isDir(dir.mode)) return 54;
        var errCode = FS.nodePermissions(dir, "x");
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0;
      },
      mayCreate(dir, name) {
        if (!FS.isDir(dir.mode)) {
          return 54;
        }
        try {
          var node = FS.lookupNode(dir, name);
          return 20;
        } catch (e) {
        }
        return FS.nodePermissions(dir, "wx");
      },
      mayDelete(dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var errCode = FS.nodePermissions(dir, "wx");
        if (errCode) {
          return errCode;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return 54;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return 10;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return 31;
          }
        }
        return 0;
      },
      mayOpen(node, flags) {
        if (!node) {
          return 44;
        }
        if (FS.isLink(node.mode)) {
          return 32;
        } else if (FS.isDir(node.mode)) {
          if (FS.flagsToPermissionString(flags) !== "r" || flags & (512 | 64)) {
            return 31;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },
      checkOpExists(op, err2) {
        if (!op) {
          throw new FS.ErrnoError(err2);
        }
        return op;
      },
      MAX_OPEN_FDS: 4096,
      nextfd() {
        for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(33);
      },
      getStreamChecked(fd) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        return stream;
      },
      getStream: (fd) => FS.streams[fd],
      createStream(stream, fd = -1) {
        assert(fd >= -1);
        stream = Object.assign(new FS.FSStream(), stream);
        if (fd == -1) {
          fd = FS.nextfd();
        }
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },
      closeStream(fd) {
        FS.streams[fd] = null;
      },
      dupStream(origStream, fd = -1) {
        var stream = FS.createStream(origStream, fd);
        stream.stream_ops?.dup?.(stream);
        return stream;
      },
      doSetAttr(stream, node, attr) {
        var setattr = stream?.stream_ops.setattr;
        var arg = setattr ? stream : node;
        setattr ??= node.node_ops.setattr;
        FS.checkOpExists(setattr, 63);
        setattr(arg, attr);
      },
      chrdev_stream_ops: {
        open(stream) {
          var device = FS.getDevice(stream.node.rdev);
          stream.stream_ops = device.stream_ops;
          stream.stream_ops.open?.(stream);
        },
        llseek() {
          throw new FS.ErrnoError(70);
        }
      },
      major: (dev) => dev >> 8,
      minor: (dev) => dev & 255,
      makedev: (ma, mi) => ma << 8 | mi,
      registerDevice(dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },
      getDevice: (dev) => FS.devices[dev],
      getMounts(mount) {
        var mounts = [];
        var check = [mount];
        while (check.length) {
          var m = check.pop();
          mounts.push(m);
          check.push(...m.mounts);
        }
        return mounts;
      },
      syncfs(populate, callback) {
        if (typeof populate == "function") {
          callback = populate;
          populate = false;
        }
        FS.syncFSRequests++;
        if (FS.syncFSRequests > 1) {
          err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
        }
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
        function doCallback(errCode) {
          assert(FS.syncFSRequests > 0);
          FS.syncFSRequests--;
          return callback(errCode);
        }
        function done(errCode) {
          if (errCode) {
            if (!done.errored) {
              done.errored = true;
              return doCallback(errCode);
            }
            return;
          }
          if (++completed >= mounts.length) {
            doCallback(null);
          }
        }
        mounts.forEach((mount) => {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },
      mount(type, opts, mountpoint) {
        if (typeof type == "string") {
          throw type;
        }
        var root = mountpoint === "/";
        var pseudo = !mountpoint;
        var node;
        if (root && FS.root) {
          throw new FS.ErrnoError(10);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
          mountpoint = lookup.path;
          node = lookup.node;
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10);
          }
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54);
          }
        }
        var mount = { type, opts, mountpoint, mounts: [] };
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          node.mounted = mount;
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
        return mountRoot;
      },
      unmount(mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(28);
        }
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
        Object.keys(FS.nameTable).forEach((hash) => {
          var current = FS.nameTable[hash];
          while (current) {
            var next = current.name_next;
            if (mounts.includes(current.mount)) {
              FS.destroyNode(current);
            }
            current = next;
          }
        });
        node.mounted = null;
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },
      lookup(parent, name) {
        return parent.node_ops.lookup(parent, name);
      },
      mknod(path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name) {
          throw new FS.ErrnoError(28);
        }
        if (name === "." || name === "..") {
          throw new FS.ErrnoError(20);
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },
      statfs(path) {
        return FS.statfsNode(FS.lookupPath(path, { follow: true }).node);
      },
      statfsStream(stream) {
        return FS.statfsNode(stream.node);
      },
      statfsNode(node) {
        var rtn = {
          bsize: 4096,
          frsize: 4096,
          blocks: 1e6,
          bfree: 5e5,
          bavail: 5e5,
          files: FS.nextInode,
          ffree: FS.nextInode - 1,
          fsid: 42,
          flags: 2,
          namelen: 255
        };
        if (node.node_ops.statfs) {
          Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
        }
        return rtn;
      },
      create(path, mode = 438) {
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },
      mkdir(path, mode = 511) {
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },
      mkdirTree(path, mode) {
        var dirs = path.split("/");
        var d = "";
        for (var dir of dirs) {
          if (!dir) continue;
          if (d || PATH.isAbs(path)) d += "/";
          d += dir;
          try {
            FS.mkdir(d, mode);
          } catch (e) {
            if (e.errno != 20) throw e;
          }
        }
      },
      mkdev(path, mode, dev) {
        if (typeof dev == "undefined") {
          dev = mode;
          mode = 438;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },
      symlink(oldpath, newpath) {
        if (!PATH_FS.resolve(oldpath)) {
          throw new FS.ErrnoError(44);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },
      rename(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        var lookup, old_dir, new_dir;
        lookup = FS.lookupPath(old_path, { parent: true });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, { parent: true });
        new_dir = lookup.node;
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(75);
        }
        var old_node = FS.lookupNode(old_dir, old_name);
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== ".") {
          throw new FS.ErrnoError(28);
        }
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== ".") {
          throw new FS.ErrnoError(55);
        }
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
        }
        if (old_node === new_node) {
          return;
        }
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
          throw new FS.ErrnoError(10);
        }
        if (new_dir !== old_dir) {
          errCode = FS.nodePermissions(old_dir, "w");
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        FS.hashRemoveNode(old_node);
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
          old_node.parent = new_dir;
        } catch (e) {
          throw e;
        } finally {
          FS.hashAddNode(old_node);
        }
      },
      rmdir(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },
      readdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        var readdir = FS.checkOpExists(node.node_ops.readdir, 54);
        return readdir(node);
      },
      unlink(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },
      readlink(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(44);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(28);
        }
        return link.node_ops.readlink(link);
      },
      stat(path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        var getattr = FS.checkOpExists(node.node_ops.getattr, 63);
        return getattr(node);
      },
      fstat(fd) {
        var stream = FS.getStreamChecked(fd);
        var node = stream.node;
        var getattr = stream.stream_ops.getattr;
        var arg = getattr ? stream : node;
        getattr ??= node.node_ops.getattr;
        FS.checkOpExists(getattr, 63);
        return getattr(arg);
      },
      lstat(path) {
        return FS.stat(path, true);
      },
      doChmod(stream, node, mode, dontFollow) {
        FS.doSetAttr(stream, node, {
          mode: mode & 4095 | node.mode & -4096,
          ctime: Date.now(),
          dontFollow
        });
      },
      chmod(path, mode, dontFollow) {
        var node;
        if (typeof path == "string") {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doChmod(null, node, mode, dontFollow);
      },
      lchmod(path, mode) {
        FS.chmod(path, mode, true);
      },
      fchmod(fd, mode) {
        var stream = FS.getStreamChecked(fd);
        FS.doChmod(stream, stream.node, mode, false);
      },
      doChown(stream, node, dontFollow) {
        FS.doSetAttr(stream, node, { timestamp: Date.now(), dontFollow });
      },
      chown(path, uid, gid, dontFollow) {
        var node;
        if (typeof path == "string") {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doChown(null, node, dontFollow);
      },
      lchown(path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },
      fchown(fd, uid, gid) {
        var stream = FS.getStreamChecked(fd);
        FS.doChown(stream, stream.node, false);
      },
      doTruncate(stream, node, len) {
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.nodePermissions(node, "w");
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.doSetAttr(stream, node, { size: len, timestamp: Date.now() });
      },
      truncate(path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(28);
        }
        var node;
        if (typeof path == "string") {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doTruncate(null, node, len);
      },
      ftruncate(fd, len) {
        var stream = FS.getStreamChecked(fd);
        if (len < 0 || (stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(28);
        }
        FS.doTruncate(stream, stream.node, len);
      },
      utime(path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        var setattr = FS.checkOpExists(node.node_ops.setattr, 63);
        setattr(node, { atime, mtime });
      },
      open(path, flags, mode = 438) {
        if (path === "") {
          throw new FS.ErrnoError(44);
        }
        flags = typeof flags == "string" ? FS_modeStringToFlags(flags) : flags;
        if (flags & 64) {
          mode = mode & 4095 | 32768;
        } else {
          mode = 0;
        }
        var node;
        var isDirPath;
        if (typeof path == "object") {
          node = path;
        } else {
          isDirPath = path.endsWith("/");
          var lookup = FS.lookupPath(path, {
            follow: !(flags & 131072),
            noent_okay: true
          });
          node = lookup.node;
          path = lookup.path;
        }
        var created = false;
        if (flags & 64) {
          if (node) {
            if (flags & 128) {
              throw new FS.ErrnoError(20);
            }
          } else if (isDirPath) {
            throw new FS.ErrnoError(31);
          } else {
            node = FS.mknod(path, mode | 511, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        if (FS.isChrdev(node.mode)) {
          flags &= -513;
        }
        if (flags & 65536 && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
        if (!created) {
          var errCode = FS.mayOpen(node, flags);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        if (flags & 512 && !created) {
          FS.truncate(node, 0);
        }
        flags &= -131713;
        var stream = FS.createStream({
          node,
          path: FS.getPath(node),
          flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          ungotten: [],
          error: false
        });
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (created) {
          FS.chmod(node, mode & 511);
        }
        if (Module2["logReadFiles"] && !(flags & 1)) {
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
          }
        }
        return stream;
      },
      close(stream) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (stream.getdents) stream.getdents = null;
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
        stream.fd = null;
      },
      isClosed(stream) {
        return stream.fd === null;
      },
      llseek(stream, offset, whence) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(70);
        }
        if (whence != 0 && whence != 1 && whence != 2) {
          throw new FS.ErrnoError(28);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },
      read(stream, buffer, offset, length, position) {
        assert(offset >= 0);
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(28);
        }
        var seeking = typeof position != "undefined";
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },
      write(stream, buffer, offset, length, position, canOwn) {
        assert(offset >= 0);
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(28);
        }
        if (stream.seekable && stream.flags & 1024) {
          FS.llseek(stream, 0, 2);
        }
        var seeking = typeof position != "undefined";
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },
      mmap(stream, length, position, prot, flags) {
        if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
          throw new FS.ErrnoError(2);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(2);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(43);
        }
        if (!length) {
          throw new FS.ErrnoError(28);
        }
        return stream.stream_ops.mmap(stream, length, position, prot, flags);
      },
      msync(stream, buffer, offset, length, mmapFlags) {
        assert(offset >= 0);
        if (!stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },
      ioctl(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(59);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },
      readFile(path, opts = {}) {
        opts.flags = opts.flags || 0;
        opts.encoding = opts.encoding || "binary";
        if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
          throw new Error(`Invalid encoding type "${opts.encoding}"`);
        }
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === "utf8") {
          buf = UTF8ArrayToString(buf);
        }
        FS.close(stream);
        return buf;
      },
      writeFile(path, data, opts = {}) {
        opts.flags = opts.flags || 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        if (typeof data == "string") {
          data = new Uint8Array(intArrayFromString(data));
        }
        if (ArrayBuffer.isView(data)) {
          FS.write(stream, data, 0, data.byteLength, void 0, opts.canOwn);
        } else {
          throw new Error("Unsupported data type");
        }
        FS.close(stream);
      },
      cwd: () => FS.currentPath,
      chdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (lookup.node === null) {
          throw new FS.ErrnoError(44);
        }
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(54);
        }
        var errCode = FS.nodePermissions(lookup.node, "x");
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.currentPath = lookup.path;
      },
      createDefaultDirectories() {
        FS.mkdir("/tmp");
        FS.mkdir("/home");
        FS.mkdir("/home/web_user");
      },
      createDefaultDevices() {
        FS.mkdir("/dev");
        FS.registerDevice(FS.makedev(1, 3), {
          read: () => 0,
          write: (stream, buffer, offset, length, pos) => length,
          llseek: () => 0
        });
        FS.mkdev("/dev/null", FS.makedev(1, 3));
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev("/dev/tty", FS.makedev(5, 0));
        FS.mkdev("/dev/tty1", FS.makedev(6, 0));
        var randomBuffer = new Uint8Array(1024), randomLeft = 0;
        var randomByte = () => {
          if (randomLeft === 0) {
            randomFill(randomBuffer);
            randomLeft = randomBuffer.byteLength;
          }
          return randomBuffer[--randomLeft];
        };
        FS.createDevice("/dev", "random", randomByte);
        FS.createDevice("/dev", "urandom", randomByte);
        FS.mkdir("/dev/shm");
        FS.mkdir("/dev/shm/tmp");
      },
      createSpecialDirectories() {
        FS.mkdir("/proc");
        var proc_self = FS.mkdir("/proc/self");
        FS.mkdir("/proc/self/fd");
        FS.mount(
          {
            mount() {
              var node = FS.createNode(proc_self, "fd", 16895, 73);
              node.stream_ops = { llseek: MEMFS.stream_ops.llseek };
              node.node_ops = {
                lookup(parent, name) {
                  var fd = +name;
                  var stream = FS.getStreamChecked(fd);
                  var ret = {
                    parent: null,
                    mount: { mountpoint: "fake" },
                    node_ops: { readlink: () => stream.path },
                    id: fd + 1
                  };
                  ret.parent = ret;
                  return ret;
                },
                readdir() {
                  return Array.from(FS.streams.entries()).filter(([k, v]) => v).map(([k, v]) => k.toString());
                }
              };
              return node;
            }
          },
          {},
          "/proc/self/fd"
        );
      },
      createStandardStreams(input, output, error) {
        if (input) {
          FS.createDevice("/dev", "stdin", input);
        } else {
          FS.symlink("/dev/tty", "/dev/stdin");
        }
        if (output) {
          FS.createDevice("/dev", "stdout", null, output);
        } else {
          FS.symlink("/dev/tty", "/dev/stdout");
        }
        if (error) {
          FS.createDevice("/dev", "stderr", null, error);
        } else {
          FS.symlink("/dev/tty1", "/dev/stderr");
        }
        var stdin = FS.open("/dev/stdin", 0);
        var stdout = FS.open("/dev/stdout", 1);
        var stderr = FS.open("/dev/stderr", 1);
        assert(stdin.fd === 0, `invalid handle for stdin (${stdin.fd})`);
        assert(stdout.fd === 1, `invalid handle for stdout (${stdout.fd})`);
        assert(stderr.fd === 2, `invalid handle for stderr (${stderr.fd})`);
      },
      staticInit() {
        FS.nameTable = new Array(4096);
        FS.mount(MEMFS, {}, "/");
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
        FS.filesystems = { MEMFS };
      },
      init(input, output, error) {
        assert(
          !FS.initialized,
          "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)"
        );
        FS.initialized = true;
        input ??= Module2["stdin"];
        output ??= Module2["stdout"];
        error ??= Module2["stderr"];
        FS.createStandardStreams(input, output, error);
      },
      quit() {
        FS.initialized = false;
        _fflush(0);
        for (var stream of FS.streams) {
          if (stream) {
            FS.close(stream);
          }
        }
      },
      findObject(path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (!ret.exists) {
          return null;
        }
        return ret.object;
      },
      analyzePath(path, dontResolveLastLink) {
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false,
          exists: false,
          error: 0,
          name: null,
          path: null,
          object: null,
          parentExists: false,
          parentPath: null,
          parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === "/";
        } catch (e) {
          ret.error = e.errno;
        }
        return ret;
      },
      createPath(parent, path, canRead, canWrite) {
        parent = typeof parent == "string" ? parent : FS.getPath(parent);
        var parts = path.split("/").reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            if (e.errno != 20) throw e;
          }
          parent = current;
        }
        return current;
      },
      createFile(parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(canRead, canWrite);
        return FS.create(path, mode);
      },
      createDataFile(parent, name, data, canRead, canWrite, canOwn) {
        var path = name;
        if (parent) {
          parent = typeof parent == "string" ? parent : FS.getPath(parent);
          path = name ? PATH.join2(parent, name) : parent;
        }
        var mode = FS_getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data == "string") {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 577);
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
      },
      createDevice(parent, name, input, output) {
        var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(!!input, !!output);
        FS.createDevice.major ??= 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        FS.registerDevice(dev, {
          open(stream) {
            stream.seekable = false;
          },
          close(stream) {
            if (output?.buffer?.length) {
              output(10);
            }
          },
          read(stream, buffer, offset, length, pos) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
              if (result === void 0 && bytesRead === 0) {
                throw new FS.ErrnoError(6);
              }
              if (result === null || result === void 0) break;
              bytesRead++;
              buffer[offset + i] = result;
            }
            if (bytesRead) {
              stream.node.atime = Date.now();
            }
            return bytesRead;
          },
          write(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset + i]);
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
            }
            if (length) {
              stream.node.mtime = stream.node.ctime = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },
      forceLoadFile(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        if (typeof XMLHttpRequest != "undefined") {
          throw new Error(
            "Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread."
          );
        } else {
          try {
            obj.contents = readBinary(obj.url);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        }
      },
      createLazyFile(parent, name, url, canRead, canWrite) {
        class LazyUint8Array {
          lengthKnown = false;
          chunks = [];
          get(idx) {
            if (idx > this.length - 1 || idx < 0) {
              return void 0;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = idx / this.chunkSize | 0;
            return this.getter(chunkNum)[chunkOffset];
          }
          setDataGetter(getter) {
            this.getter = getter;
          }
          cacheLength() {
            var xhr = new XMLHttpRequest();
            xhr.open("HEAD", url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304))
              throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            var datalength = Number(xhr.getResponseHeader("Content-length"));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
            var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
            var chunkSize = 1024 * 1024;
            if (!hasByteServing) chunkSize = datalength;
            var doXHR = (from, to) => {
              if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
              if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
              var xhr2 = new XMLHttpRequest();
              xhr2.open("GET", url, false);
              if (datalength !== chunkSize) xhr2.setRequestHeader("Range", "bytes=" + from + "-" + to);
              xhr2.responseType = "arraybuffer";
              if (xhr2.overrideMimeType) {
                xhr2.overrideMimeType("text/plain; charset=x-user-defined");
              }
              xhr2.send(null);
              if (!(xhr2.status >= 200 && xhr2.status < 300 || xhr2.status === 304))
                throw new Error("Couldn't load " + url + ". Status: " + xhr2.status);
              if (xhr2.response !== void 0) {
                return new Uint8Array(xhr2.response || []);
              }
              return intArrayFromString(xhr2.responseText || "");
            };
            var lazyArray2 = this;
            lazyArray2.setDataGetter((chunkNum) => {
              var start = chunkNum * chunkSize;
              var end = (chunkNum + 1) * chunkSize - 1;
              end = Math.min(end, datalength - 1);
              if (typeof lazyArray2.chunks[chunkNum] == "undefined") {
                lazyArray2.chunks[chunkNum] = doXHR(start, end);
              }
              if (typeof lazyArray2.chunks[chunkNum] == "undefined") throw new Error("doXHR failed!");
              return lazyArray2.chunks[chunkNum];
            });
            if (usesGzip || !datalength) {
              chunkSize = datalength = 1;
              datalength = this.getter(0).length;
              chunkSize = datalength;
              out("LazyFiles on gzip forces download of the whole file when length is accessed");
            }
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true;
          }
          get length() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._length;
          }
          get chunkSize() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._chunkSize;
          }
        }
        if (typeof XMLHttpRequest != "undefined") {
          if (!ENVIRONMENT_IS_WORKER)
            throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
          var lazyArray = new LazyUint8Array();
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url };
        }
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        Object.defineProperties(node, {
          usedBytes: {
            get: function() {
              return this.contents.length;
            }
          }
        });
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach((key) => {
          var fn = node.stream_ops[key];
          stream_ops[key] = (...args) => {
            FS.forceLoadFile(node);
            return fn(...args);
          };
        });
        function writeChunks(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length) return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) {
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        }
        stream_ops.read = (stream, buffer, offset, length, position) => {
          FS.forceLoadFile(node);
          return writeChunks(stream, buffer, offset, length, position);
        };
        stream_ops.mmap = (stream, length, position, prot, flags) => {
          FS.forceLoadFile(node);
          var ptr = mmapAlloc(length);
          if (!ptr) {
            throw new FS.ErrnoError(48);
          }
          writeChunks(stream, HEAP8, ptr, length, position);
          return { ptr, allocated: true };
        };
        node.stream_ops = stream_ops;
        return node;
      },
      absolutePath() {
        abort("FS.absolutePath has been removed; use PATH_FS.resolve instead");
      },
      createFolder() {
        abort("FS.createFolder has been removed; use FS.mkdir instead");
      },
      createLink() {
        abort("FS.createLink has been removed; use FS.symlink instead");
      },
      joinPath() {
        abort("FS.joinPath has been removed; use PATH.join instead");
      },
      mmapAlloc() {
        abort("FS.mmapAlloc has been replaced by the top level function mmapAlloc");
      },
      standardizePath() {
        abort("FS.standardizePath has been removed; use PATH.normalize instead");
      }
    };
    var SYSCALLS = {
      DEFAULT_POLLMASK: 5,
      calculateAt(dirfd, path, allowEmpty) {
        if (PATH.isAbs(path)) {
          return path;
        }
        var dir;
        if (dirfd === -100) {
          dir = FS.cwd();
        } else {
          var dirstream = SYSCALLS.getStreamFromFD(dirfd);
          dir = dirstream.path;
        }
        if (path.length == 0) {
          if (!allowEmpty) {
            throw new FS.ErrnoError(44);
          }
          return dir;
        }
        return dir + "/" + path;
      },
      writeStat(buf, stat) {
        HEAP32[buf >> 2] = stat.dev;
        HEAP32[buf + 4 >> 2] = stat.mode;
        HEAPU32[buf + 8 >> 2] = stat.nlink;
        HEAP32[buf + 12 >> 2] = stat.uid;
        HEAP32[buf + 16 >> 2] = stat.gid;
        HEAP32[buf + 20 >> 2] = stat.rdev;
        HEAP64[buf + 24 >> 3] = BigInt(stat.size);
        HEAP32[buf + 32 >> 2] = 4096;
        HEAP32[buf + 36 >> 2] = stat.blocks;
        var atime = stat.atime.getTime();
        var mtime = stat.mtime.getTime();
        var ctime = stat.ctime.getTime();
        HEAP64[buf + 40 >> 3] = BigInt(Math.floor(atime / 1e3));
        HEAPU32[buf + 48 >> 2] = atime % 1e3 * 1e3 * 1e3;
        HEAP64[buf + 56 >> 3] = BigInt(Math.floor(mtime / 1e3));
        HEAPU32[buf + 64 >> 2] = mtime % 1e3 * 1e3 * 1e3;
        HEAP64[buf + 72 >> 3] = BigInt(Math.floor(ctime / 1e3));
        HEAPU32[buf + 80 >> 2] = ctime % 1e3 * 1e3 * 1e3;
        HEAP64[buf + 88 >> 3] = BigInt(stat.ino);
        return 0;
      },
      writeStatFs(buf, stats) {
        HEAP32[buf + 4 >> 2] = stats.bsize;
        HEAP32[buf + 40 >> 2] = stats.bsize;
        HEAP32[buf + 8 >> 2] = stats.blocks;
        HEAP32[buf + 12 >> 2] = stats.bfree;
        HEAP32[buf + 16 >> 2] = stats.bavail;
        HEAP32[buf + 20 >> 2] = stats.files;
        HEAP32[buf + 24 >> 2] = stats.ffree;
        HEAP32[buf + 28 >> 2] = stats.fsid;
        HEAP32[buf + 44 >> 2] = stats.flags;
        HEAP32[buf + 36 >> 2] = stats.namelen;
      },
      doMsync(addr, stream, len, flags, offset) {
        if (!FS.isFile(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (flags & 2) {
          return 0;
        }
        var buffer = HEAPU8.slice(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags);
      },
      getStreamFromFD(fd) {
        var stream = FS.getStreamChecked(fd);
        return stream;
      },
      varargs: void 0,
      getStr(ptr) {
        var ret = UTF8ToString(ptr);
        return ret;
      }
    };
    function ___syscall_fcntl64(fd, cmd, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (cmd) {
          case 0: {
            var arg = syscallGetVarargI();
            if (arg < 0) {
              return -28;
            }
            while (FS.streams[arg]) {
              arg++;
            }
            var newStream;
            newStream = FS.dupStream(stream, arg);
            return newStream.fd;
          }
          case 1:
          case 2:
            return 0;
          case 3:
            return stream.flags;
          case 4: {
            var arg = syscallGetVarargI();
            stream.flags |= arg;
            return 0;
          }
          case 12: {
            var arg = syscallGetVarargP();
            var offset = 0;
            HEAP16[arg + offset >> 1] = 2;
            return 0;
          }
          case 13:
          case 14:
            return 0;
        }
        return -28;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_fstat64(fd, buf) {
      try {
        return SYSCALLS.writeStat(buf, FS.fstat(fd));
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    var INT53_MAX = 9007199254740992;
    var INT53_MIN = -9007199254740992;
    var bigintToI53Checked = (num) => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num);
    function ___syscall_ftruncate64(fd, length) {
      length = bigintToI53Checked(length);
      try {
        if (isNaN(length)) return -61;
        FS.ftruncate(fd, length);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    var stringToUTF82 = (str, outPtr, maxBytesToWrite) => {
      assert(
        typeof maxBytesToWrite == "number",
        "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!"
      );
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    };
    function ___syscall_getdents64(fd, dirp, count) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        stream.getdents ||= FS.readdir(stream.path);
        var struct_size = 280;
        var pos = 0;
        var off = FS.llseek(stream, 0, 1);
        var startIdx = Math.floor(off / struct_size);
        var endIdx = Math.min(stream.getdents.length, startIdx + Math.floor(count / struct_size));
        for (var idx = startIdx; idx < endIdx; idx++) {
          var id;
          var type;
          var name = stream.getdents[idx];
          if (name === ".") {
            id = stream.node.id;
            type = 4;
          } else if (name === "..") {
            var lookup = FS.lookupPath(stream.path, { parent: true });
            id = lookup.node.id;
            type = 4;
          } else {
            var child;
            try {
              child = FS.lookupNode(stream.node, name);
            } catch (e) {
              if (e?.errno === 28) {
                continue;
              }
              throw e;
            }
            id = child.id;
            type = FS.isChrdev(child.mode) ? 2 : FS.isDir(child.mode) ? 4 : FS.isLink(child.mode) ? 10 : 8;
          }
          assert(id);
          HEAP64[dirp + pos >> 3] = BigInt(id);
          HEAP64[dirp + pos + 8 >> 3] = BigInt((idx + 1) * struct_size);
          HEAP16[dirp + pos + 16 >> 1] = 280;
          HEAP8[dirp + pos + 18] = type;
          stringToUTF82(name, dirp + pos + 19, 256);
          pos += struct_size;
        }
        FS.llseek(stream, idx * struct_size, 0);
        return pos;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_ioctl(fd, op, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (op) {
          case 21509: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21505: {
            if (!stream.tty) return -59;
            if (stream.tty.ops.ioctl_tcgets) {
              var termios = stream.tty.ops.ioctl_tcgets(stream);
              var argp = syscallGetVarargP();
              HEAP32[argp >> 2] = termios.c_iflag || 0;
              HEAP32[argp + 4 >> 2] = termios.c_oflag || 0;
              HEAP32[argp + 8 >> 2] = termios.c_cflag || 0;
              HEAP32[argp + 12 >> 2] = termios.c_lflag || 0;
              for (var i = 0; i < 32; i++) {
                HEAP8[argp + i + 17] = termios.c_cc[i] || 0;
              }
              return 0;
            }
            return 0;
          }
          case 21510:
          case 21511:
          case 21512: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21506:
          case 21507:
          case 21508: {
            if (!stream.tty) return -59;
            if (stream.tty.ops.ioctl_tcsets) {
              var argp = syscallGetVarargP();
              var c_iflag = HEAP32[argp >> 2];
              var c_oflag = HEAP32[argp + 4 >> 2];
              var c_cflag = HEAP32[argp + 8 >> 2];
              var c_lflag = HEAP32[argp + 12 >> 2];
              var c_cc = [];
              for (var i = 0; i < 32; i++) {
                c_cc.push(HEAP8[argp + i + 17]);
              }
              return stream.tty.ops.ioctl_tcsets(stream.tty, op, {
                c_iflag,
                c_oflag,
                c_cflag,
                c_lflag,
                c_cc
              });
            }
            return 0;
          }
          case 21519: {
            if (!stream.tty) return -59;
            var argp = syscallGetVarargP();
            HEAP32[argp >> 2] = 0;
            return 0;
          }
          case 21520: {
            if (!stream.tty) return -59;
            return -28;
          }
          case 21531: {
            var argp = syscallGetVarargP();
            return FS.ioctl(stream, op, argp);
          }
          case 21523: {
            if (!stream.tty) return -59;
            if (stream.tty.ops.ioctl_tiocgwinsz) {
              var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
              var argp = syscallGetVarargP();
              HEAP16[argp >> 1] = winsize[0];
              HEAP16[argp + 2 >> 1] = winsize[1];
            }
            return 0;
          }
          case 21524: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21515: {
            if (!stream.tty) return -59;
            return 0;
          }
          default:
            return -28;
        }
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_lstat64(path, buf) {
      try {
        path = SYSCALLS.getStr(path);
        return SYSCALLS.writeStat(buf, FS.lstat(path));
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_newfstatat(dirfd, path, buf, flags) {
      try {
        path = SYSCALLS.getStr(path);
        var nofollow = flags & 256;
        var allowEmpty = flags & 4096;
        flags = flags & ~6400;
        assert(!flags, `unknown flags in __syscall_newfstatat: ${flags}`);
        path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
        return SYSCALLS.writeStat(buf, nofollow ? FS.lstat(path) : FS.stat(path));
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_openat(dirfd, path, flags, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        var mode = varargs ? syscallGetVarargI() : 0;
        return FS.open(path, flags, mode).fd;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_rmdir(path) {
      try {
        path = SYSCALLS.getStr(path);
        FS.rmdir(path);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_stat64(path, buf) {
      try {
        path = SYSCALLS.getStr(path);
        return SYSCALLS.writeStat(buf, FS.stat(path));
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_unlinkat(dirfd, path, flags) {
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        if (!flags) {
          FS.unlink(path);
        } else if (flags === 512) {
          FS.rmdir(path);
        } else {
          return -28;
        }
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    var __abort_js = () => abort("native code called abort()");
    var __emscripten_throw_longjmp = () => {
      throw Infinity;
    };
    function __gmtime_js(time, tmPtr) {
      time = bigintToI53Checked(time);
      var date = new Date(time * 1e3);
      HEAP32[tmPtr >> 2] = date.getUTCSeconds();
      HEAP32[tmPtr + 4 >> 2] = date.getUTCMinutes();
      HEAP32[tmPtr + 8 >> 2] = date.getUTCHours();
      HEAP32[tmPtr + 12 >> 2] = date.getUTCDate();
      HEAP32[tmPtr + 16 >> 2] = date.getUTCMonth();
      HEAP32[tmPtr + 20 >> 2] = date.getUTCFullYear() - 1900;
      HEAP32[tmPtr + 24 >> 2] = date.getUTCDay();
      var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
      var yday = (date.getTime() - start) / (1e3 * 60 * 60 * 24) | 0;
      HEAP32[tmPtr + 28 >> 2] = yday;
    }
    var isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    var MONTH_DAYS_LEAP_CUMULATIVE = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
    var MONTH_DAYS_REGULAR_CUMULATIVE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var ydayFromDate = (date) => {
      var leap = isLeapYear(date.getFullYear());
      var monthDaysCumulative = leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE;
      var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1;
      return yday;
    };
    function __localtime_js(time, tmPtr) {
      time = bigintToI53Checked(time);
      var date = new Date(time * 1e3);
      HEAP32[tmPtr >> 2] = date.getSeconds();
      HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
      HEAP32[tmPtr + 8 >> 2] = date.getHours();
      HEAP32[tmPtr + 12 >> 2] = date.getDate();
      HEAP32[tmPtr + 16 >> 2] = date.getMonth();
      HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
      HEAP32[tmPtr + 24 >> 2] = date.getDay();
      var yday = ydayFromDate(date) | 0;
      HEAP32[tmPtr + 28 >> 2] = yday;
      HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
      var start = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
      HEAP32[tmPtr + 32 >> 2] = dst;
    }
    var __tzset_js = (timezone, daylight, std_name, dst_name) => {
      var currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      var winter = new Date(currentYear, 0, 1);
      var summer = new Date(currentYear, 6, 1);
      var winterOffset = winter.getTimezoneOffset();
      var summerOffset = summer.getTimezoneOffset();
      var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
      HEAPU32[timezone >> 2] = stdTimezoneOffset * 60;
      HEAP32[daylight >> 2] = Number(winterOffset != summerOffset);
      var extractZone = (timezoneOffset) => {
        var sign = timezoneOffset >= 0 ? "-" : "+";
        var absOffset = Math.abs(timezoneOffset);
        var hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
        var minutes = String(absOffset % 60).padStart(2, "0");
        return `UTC${sign}${hours}${minutes}`;
      };
      var winterName = extractZone(winterOffset);
      var summerName = extractZone(summerOffset);
      assert(winterName);
      assert(summerName);
      assert(lengthBytesUTF82(winterName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${winterName})`);
      assert(lengthBytesUTF82(summerName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${summerName})`);
      if (summerOffset < winterOffset) {
        stringToUTF82(winterName, std_name, 17);
        stringToUTF82(summerName, dst_name, 17);
      } else {
        stringToUTF82(winterName, dst_name, 17);
        stringToUTF82(summerName, std_name, 17);
      }
    };
    var _emscripten_date_now = () => Date.now();
    var getHeapMax = () => 2147483648;
    var growMemory = (size) => {
      var b = wasmMemory.buffer;
      var pages = (size - b.byteLength + 65535) / 65536 | 0;
      try {
        wasmMemory.grow(pages);
        updateMemoryViews();
        return 1;
      } catch (e) {
        err(`growMemory: Attempted to grow heap from ${b.byteLength} bytes to ${size} bytes, but got error: ${e}`);
      }
    };
    var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      requestedSize >>>= 0;
      assert(requestedSize > oldSize);
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        err(`Cannot enlarge memory, requested ${requestedSize} bytes, but the limit is ${maxHeapSize} bytes!`);
        return false;
      }
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = growMemory(newSize);
        if (replacement) {
          return true;
        }
      }
      err(`Failed to grow the heap from ${oldSize} bytes to ${newSize} bytes, not enough memory!`);
      return false;
    };
    var ENV = {};
    var getExecutableName = () => thisProgram || "./this.program";
    var getEnvStrings = () => {
      if (!getEnvStrings.strings) {
        var lang = (typeof navigator == "object" && navigator.language || "C").replace("-", "_") + ".UTF-8";
        var env = {
          USER: "web_user",
          LOGNAME: "web_user",
          PATH: "/",
          PWD: "/",
          HOME: "/home/web_user",
          LANG: lang,
          _: getExecutableName()
        };
        for (var x in ENV) {
          if (ENV[x] === void 0) delete env[x];
          else env[x] = ENV[x];
        }
        var strings = [];
        for (var x in env) {
          strings.push(`${x}=${env[x]}`);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    };
    var _environ_get = (__environ, environ_buf) => {
      var bufSize = 0;
      var envp = 0;
      for (var string of getEnvStrings()) {
        var ptr = environ_buf + bufSize;
        HEAPU32[__environ + envp >> 2] = ptr;
        bufSize += stringToUTF82(string, ptr, Infinity) + 1;
        envp += 4;
      }
      return 0;
    };
    var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
      var strings = getEnvStrings();
      HEAPU32[penviron_count >> 2] = strings.length;
      var bufSize = 0;
      for (var string of strings) {
        bufSize += lengthBytesUTF82(string) + 1;
      }
      HEAPU32[penviron_buf_size >> 2] = bufSize;
      return 0;
    };
    function _fd_close(fd) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.close(stream);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    var doReadv = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break;
      }
      return ret;
    };
    function _fd_read(fd, iov, iovcnt, pnum) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doReadv(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    function _fd_seek(fd, offset, whence, newOffset) {
      offset = bigintToI53Checked(offset);
      try {
        if (isNaN(offset)) return 61;
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.llseek(stream, offset, whence);
        HEAP64[newOffset >> 3] = BigInt(stream.position);
        if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    function _fd_sync(fd) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        if (stream.stream_ops?.fsync) {
          return stream.stream_ops.fsync(stream);
        }
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    var doWritev = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        var curr = FS.write(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) {
          break;
        }
      }
      return ret;
    };
    function _fd_write(fd, iov, iovcnt, pnum) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doWritev(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    var wasmTableMirror = [];
    var wasmTable;
    var getWasmTableEntry = (funcPtr) => {
      var func = wasmTableMirror[funcPtr];
      if (!func) {
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
      }
      assert(wasmTable.get(funcPtr) == func, "JavaScript-side Wasm function table mirror is out of date!");
      return func;
    };
    var getCFunc = (ident) => {
      var func = Module2["_" + ident];
      assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
      return func;
    };
    var writeArrayToMemory = (array, buffer) => {
      assert(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
      HEAP8.set(array, buffer);
    };
    var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
    var stringToUTF8OnStack = (str) => {
      var size = lengthBytesUTF82(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF82(str, ret, size);
      return ret;
    };
    var ccall = (ident, returnType, argTypes, args, opts) => {
      var toC = {
        string: (str) => {
          var ret2 = 0;
          if (str !== null && str !== void 0 && str !== 0) {
            ret2 = stringToUTF8OnStack(str);
          }
          return ret2;
        },
        array: (arr) => {
          var ret2 = stackAlloc(arr.length);
          writeArrayToMemory(arr, ret2);
          return ret2;
        }
      };
      function convertReturnValue(ret2) {
        if (returnType === "string") {
          return UTF8ToString(ret2);
        }
        if (returnType === "boolean") return Boolean(ret2);
        return ret2;
      }
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      assert(returnType !== "array", 'Return type should not be "array".');
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func(...cArgs);
      function onDone(ret2) {
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret2);
      }
      ret = onDone(ret);
      return ret;
    };
    var cwrap = (ident, returnType, argTypes, opts) => (...args) => ccall(ident, returnType, argTypes, args);
    FS.createPreloadedFile = FS_createPreloadedFile;
    FS.staticInit();
    {
      if (Module2["noExitRuntime"]) Module2["noExitRuntime"];
      if (Module2["preloadPlugins"]) preloadPlugins = Module2["preloadPlugins"];
      if (Module2["print"]) out = Module2["print"];
      if (Module2["printErr"]) err = Module2["printErr"];
      if (Module2["wasmBinary"]) wasmBinary = Module2["wasmBinary"];
      checkIncomingModuleAPI();
      if (Module2["arguments"]) Module2["arguments"];
      if (Module2["thisProgram"]) thisProgram = Module2["thisProgram"];
      assert(
        typeof Module2["memoryInitializerPrefixURL"] == "undefined",
        "Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead"
      );
      assert(
        typeof Module2["pthreadMainPrefixURL"] == "undefined",
        "Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead"
      );
      assert(
        typeof Module2["cdInitializerPrefixURL"] == "undefined",
        "Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead"
      );
      assert(
        typeof Module2["filePackagePrefixURL"] == "undefined",
        "Module.filePackagePrefixURL option was removed, use Module.locateFile instead"
      );
      assert(typeof Module2["read"] == "undefined", "Module.read option was removed");
      assert(typeof Module2["readAsync"] == "undefined", "Module.readAsync option was removed (modify readAsync in JS)");
      assert(
        typeof Module2["readBinary"] == "undefined",
        "Module.readBinary option was removed (modify readBinary in JS)"
      );
      assert(
        typeof Module2["setWindowTitle"] == "undefined",
        "Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)"
      );
      assert(
        typeof Module2["TOTAL_MEMORY"] == "undefined",
        "Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY"
      );
      assert(
        typeof Module2["ENVIRONMENT"] == "undefined",
        "Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)"
      );
      assert(
        typeof Module2["STACK_SIZE"] == "undefined",
        "STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time"
      );
      assert(
        typeof Module2["wasmMemory"] == "undefined",
        "Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally"
      );
      assert(
        typeof Module2["INITIAL_MEMORY"] == "undefined",
        "Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically"
      );
    }
    Module2["wasmExports"] = wasmExports;
    Module2["ccall"] = ccall;
    Module2["cwrap"] = cwrap;
    var missingLibrarySymbols = [
      "writeI53ToI64",
      "writeI53ToI64Clamped",
      "writeI53ToI64Signaling",
      "writeI53ToU64Clamped",
      "writeI53ToU64Signaling",
      "readI53FromI64",
      "readI53FromU64",
      "convertI32PairToI53",
      "convertI32PairToI53Checked",
      "convertU32PairToI53",
      "getTempRet0",
      "setTempRet0",
      "exitJS",
      "withStackSave",
      "inetPton4",
      "inetNtop4",
      "inetPton6",
      "inetNtop6",
      "readSockaddr",
      "writeSockaddr",
      "emscriptenLog",
      "readEmAsmArgs",
      "jstoi_q",
      "autoResumeAudioContext",
      "getDynCaller",
      "dynCall",
      "handleException",
      "keepRuntimeAlive",
      "runtimeKeepalivePush",
      "runtimeKeepalivePop",
      "callUserCallback",
      "maybeExit",
      "asmjsMangle",
      "HandleAllocator",
      "getNativeTypeSize",
      "addOnInit",
      "addOnPostCtor",
      "addOnPreMain",
      "addOnExit",
      "STACK_SIZE",
      "STACK_ALIGN",
      "POINTER_SIZE",
      "ASSERTIONS",
      "uleb128Encode",
      "sigToWasmTypes",
      "generateFuncType",
      "convertJsFunctionToWasm",
      "getEmptyTableSlot",
      "updateTableMap",
      "getFunctionAddress",
      "addFunction",
      "removeFunction",
      "reallyNegative",
      "unSign",
      "strLen",
      "reSign",
      "formatString",
      "intArrayToString",
      "AsciiToString",
      "stringToAscii",
      "UTF16ToString",
      "stringToUTF16",
      "lengthBytesUTF16",
      "UTF32ToString",
      "stringToUTF32",
      "lengthBytesUTF32",
      "stringToNewUTF8",
      "registerKeyEventCallback",
      "maybeCStringToJsString",
      "findEventTarget",
      "getBoundingClientRect",
      "fillMouseEventData",
      "registerMouseEventCallback",
      "registerWheelEventCallback",
      "registerUiEventCallback",
      "registerFocusEventCallback",
      "fillDeviceOrientationEventData",
      "registerDeviceOrientationEventCallback",
      "fillDeviceMotionEventData",
      "registerDeviceMotionEventCallback",
      "screenOrientation",
      "fillOrientationChangeEventData",
      "registerOrientationChangeEventCallback",
      "fillFullscreenChangeEventData",
      "registerFullscreenChangeEventCallback",
      "JSEvents_requestFullscreen",
      "JSEvents_resizeCanvasForFullscreen",
      "registerRestoreOldStyle",
      "hideEverythingExceptGivenElement",
      "restoreHiddenElements",
      "setLetterbox",
      "softFullscreenResizeWebGLRenderTarget",
      "doRequestFullscreen",
      "fillPointerlockChangeEventData",
      "registerPointerlockChangeEventCallback",
      "registerPointerlockErrorEventCallback",
      "requestPointerLock",
      "fillVisibilityChangeEventData",
      "registerVisibilityChangeEventCallback",
      "registerTouchEventCallback",
      "fillGamepadEventData",
      "registerGamepadEventCallback",
      "registerBeforeUnloadEventCallback",
      "fillBatteryEventData",
      "battery",
      "registerBatteryEventCallback",
      "setCanvasElementSize",
      "getCanvasElementSize",
      "jsStackTrace",
      "getCallstack",
      "convertPCtoSourceLocation",
      "checkWasiClock",
      "wasiRightsToMuslOFlags",
      "wasiOFlagsToMuslOFlags",
      "safeSetTimeout",
      "setImmediateWrapped",
      "safeRequestAnimationFrame",
      "clearImmediateWrapped",
      "registerPostMainLoop",
      "registerPreMainLoop",
      "getPromise",
      "makePromise",
      "idsToPromises",
      "makePromiseCallback",
      "ExceptionInfo",
      "findMatchingCatch",
      "Browser_asyncPrepareDataCounter",
      "arraySum",
      "addDays",
      "getSocketFromFD",
      "getSocketAddress",
      "FS_mkdirTree",
      "_setNetworkCallback",
      "heapObjectForWebGLType",
      "toTypedArrayIndex",
      "webgl_enable_ANGLE_instanced_arrays",
      "webgl_enable_OES_vertex_array_object",
      "webgl_enable_WEBGL_draw_buffers",
      "webgl_enable_WEBGL_multi_draw",
      "webgl_enable_EXT_polygon_offset_clamp",
      "webgl_enable_EXT_clip_control",
      "webgl_enable_WEBGL_polygon_mode",
      "emscriptenWebGLGet",
      "computeUnpackAlignedImageSize",
      "colorChannelsInGlTextureFormat",
      "emscriptenWebGLGetTexPixelData",
      "emscriptenWebGLGetUniform",
      "webglGetUniformLocation",
      "webglPrepareUniformLocationsBeforeFirstUse",
      "webglGetLeftBracePos",
      "emscriptenWebGLGetVertexAttrib",
      "__glGetActiveAttribOrUniform",
      "writeGLArray",
      "registerWebGlEventCallback",
      "runAndAbortIfError",
      "ALLOC_NORMAL",
      "ALLOC_STACK",
      "allocate",
      "writeStringToMemory",
      "writeAsciiToMemory",
      "demangle",
      "stackTrace"
    ];
    missingLibrarySymbols.forEach(missingLibrarySymbol);
    var unexportedSymbols = [
      "run",
      "addRunDependency",
      "removeRunDependency",
      "out",
      "err",
      "callMain",
      "abort",
      "wasmMemory",
      "HEAP64",
      "HEAPU64",
      "writeStackCookie",
      "checkStackCookie",
      "INT53_MAX",
      "INT53_MIN",
      "bigintToI53Checked",
      "stackSave",
      "stackRestore",
      "stackAlloc",
      "ptrToString",
      "zeroMemory",
      "getHeapMax",
      "growMemory",
      "ENV",
      "ERRNO_CODES",
      "strError",
      "DNS",
      "Protocols",
      "Sockets",
      "timers",
      "warnOnce",
      "readEmAsmArgsArray",
      "getExecutableName",
      "asyncLoad",
      "alignMemory",
      "mmapAlloc",
      "wasmTable",
      "getUniqueRunDependency",
      "noExitRuntime",
      "addOnPreRun",
      "addOnPostRun",
      "freeTableIndexes",
      "functionsInTableMap",
      "setValue",
      "getValue",
      "PATH",
      "PATH_FS",
      "UTF8Decoder",
      "UTF8ArrayToString",
      "UTF8ToString",
      "stringToUTF8Array",
      "stringToUTF8",
      "lengthBytesUTF8",
      "intArrayFromString",
      "UTF16Decoder",
      "stringToUTF8OnStack",
      "writeArrayToMemory",
      "JSEvents",
      "specialHTMLTargets",
      "findCanvasEventTarget",
      "currentFullscreenStrategy",
      "restoreOldWindowedStyle",
      "UNWIND_CACHE",
      "ExitStatus",
      "getEnvStrings",
      "doReadv",
      "doWritev",
      "initRandomFill",
      "randomFill",
      "emSetImmediate",
      "emClearImmediate_deps",
      "emClearImmediate",
      "promiseMap",
      "uncaughtExceptionCount",
      "exceptionLast",
      "exceptionCaught",
      "Browser",
      "requestFullscreen",
      "requestFullScreen",
      "setCanvasSize",
      "getUserMedia",
      "createContext",
      "getPreloadedImageData__data",
      "wget",
      "MONTH_DAYS_REGULAR",
      "MONTH_DAYS_LEAP",
      "MONTH_DAYS_REGULAR_CUMULATIVE",
      "MONTH_DAYS_LEAP_CUMULATIVE",
      "isLeapYear",
      "ydayFromDate",
      "SYSCALLS",
      "preloadPlugins",
      "FS_createPreloadedFile",
      "FS_modeStringToFlags",
      "FS_getMode",
      "FS_stdin_getChar_buffer",
      "FS_stdin_getChar",
      "FS_unlink",
      "FS_createPath",
      "FS_createDevice",
      "FS_readFile",
      "FS",
      "FS_root",
      "FS_mounts",
      "FS_devices",
      "FS_streams",
      "FS_nextInode",
      "FS_nameTable",
      "FS_currentPath",
      "FS_initialized",
      "FS_ignorePermissions",
      "FS_filesystems",
      "FS_syncFSRequests",
      "FS_readFiles",
      "FS_lookupPath",
      "FS_getPath",
      "FS_hashName",
      "FS_hashAddNode",
      "FS_hashRemoveNode",
      "FS_lookupNode",
      "FS_createNode",
      "FS_destroyNode",
      "FS_isRoot",
      "FS_isMountpoint",
      "FS_isFile",
      "FS_isDir",
      "FS_isLink",
      "FS_isChrdev",
      "FS_isBlkdev",
      "FS_isFIFO",
      "FS_isSocket",
      "FS_flagsToPermissionString",
      "FS_nodePermissions",
      "FS_mayLookup",
      "FS_mayCreate",
      "FS_mayDelete",
      "FS_mayOpen",
      "FS_checkOpExists",
      "FS_nextfd",
      "FS_getStreamChecked",
      "FS_getStream",
      "FS_createStream",
      "FS_closeStream",
      "FS_dupStream",
      "FS_doSetAttr",
      "FS_chrdev_stream_ops",
      "FS_major",
      "FS_minor",
      "FS_makedev",
      "FS_registerDevice",
      "FS_getDevice",
      "FS_getMounts",
      "FS_syncfs",
      "FS_mount",
      "FS_unmount",
      "FS_lookup",
      "FS_mknod",
      "FS_statfs",
      "FS_statfsStream",
      "FS_statfsNode",
      "FS_create",
      "FS_mkdir",
      "FS_mkdev",
      "FS_symlink",
      "FS_rename",
      "FS_rmdir",
      "FS_readdir",
      "FS_readlink",
      "FS_stat",
      "FS_fstat",
      "FS_lstat",
      "FS_doChmod",
      "FS_chmod",
      "FS_lchmod",
      "FS_fchmod",
      "FS_doChown",
      "FS_chown",
      "FS_lchown",
      "FS_fchown",
      "FS_doTruncate",
      "FS_truncate",
      "FS_ftruncate",
      "FS_utime",
      "FS_open",
      "FS_close",
      "FS_isClosed",
      "FS_llseek",
      "FS_read",
      "FS_write",
      "FS_mmap",
      "FS_msync",
      "FS_ioctl",
      "FS_writeFile",
      "FS_cwd",
      "FS_chdir",
      "FS_createDefaultDirectories",
      "FS_createDefaultDevices",
      "FS_createSpecialDirectories",
      "FS_createStandardStreams",
      "FS_staticInit",
      "FS_init",
      "FS_quit",
      "FS_findObject",
      "FS_analyzePath",
      "FS_createFile",
      "FS_createDataFile",
      "FS_forceLoadFile",
      "FS_createLazyFile",
      "FS_absolutePath",
      "FS_createFolder",
      "FS_createLink",
      "FS_joinPath",
      "FS_mmapAlloc",
      "FS_standardizePath",
      "MEMFS",
      "TTY",
      "PIPEFS",
      "SOCKFS",
      "tempFixedLengthArray",
      "miniTempWebGLFloatBuffers",
      "miniTempWebGLIntBuffers",
      "GL",
      "AL",
      "GLUT",
      "EGL",
      "GLEW",
      "IDBStore",
      "SDL",
      "SDL_gfx",
      "allocateUTF8",
      "allocateUTF8OnStack",
      "print",
      "printErr",
      "jstoi_s"
    ];
    unexportedSymbols.forEach(unexportedRuntimeSymbol);
    function checkIncomingModuleAPI() {
      ignoredModuleProp("fetchSettings");
    }
    Module2["_PDFium_Init"] = makeInvalidEarlyAccess("_PDFium_Init");
    Module2["_FPDF_InitLibraryWithConfig"] = makeInvalidEarlyAccess("_FPDF_InitLibraryWithConfig");
    Module2["_FPDFAnnot_IsSupportedSubtype"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_IsSupportedSubtype"
    );
    Module2["_FPDFPage_CreateAnnot"] = makeInvalidEarlyAccess("_FPDFPage_CreateAnnot");
    Module2["_FPDFPage_GetAnnotCount"] = makeInvalidEarlyAccess("_FPDFPage_GetAnnotCount");
    Module2["_FPDFPage_GetAnnot"] = makeInvalidEarlyAccess("_FPDFPage_GetAnnot");
    Module2["_FPDFPage_GetAnnotIndex"] = makeInvalidEarlyAccess("_FPDFPage_GetAnnotIndex");
    Module2["_FPDFPage_CloseAnnot"] = makeInvalidEarlyAccess("_FPDFPage_CloseAnnot");
    Module2["_FPDFPage_RemoveAnnot"] = makeInvalidEarlyAccess("_FPDFPage_RemoveAnnot");
    Module2["_FPDFAnnot_GetSubtype"] = makeInvalidEarlyAccess("_FPDFAnnot_GetSubtype");
    Module2["_FPDFAnnot_IsObjectSupportedSubtype"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_IsObjectSupportedSubtype"
    );
    Module2["_FPDFAnnot_UpdateObject"] = makeInvalidEarlyAccess("_FPDFAnnot_UpdateObject");
    Module2["_FPDFAnnot_AddInkStroke"] = makeInvalidEarlyAccess("_FPDFAnnot_AddInkStroke");
    Module2["_FPDFAnnot_RemoveInkList"] = makeInvalidEarlyAccess("_FPDFAnnot_RemoveInkList");
    Module2["_FPDFAnnot_AppendObject"] = makeInvalidEarlyAccess("_FPDFAnnot_AppendObject");
    Module2["_FPDFAnnot_GetObjectCount"] = makeInvalidEarlyAccess("_FPDFAnnot_GetObjectCount");
    Module2["_FPDFAnnot_GetObject"] = makeInvalidEarlyAccess("_FPDFAnnot_GetObject");
    Module2["_FPDFAnnot_RemoveObject"] = makeInvalidEarlyAccess("_FPDFAnnot_RemoveObject");
    Module2["_FPDFAnnot_SetColor"] = makeInvalidEarlyAccess("_FPDFAnnot_SetColor");
    Module2["_FPDFAnnot_GetColor"] = makeInvalidEarlyAccess("_FPDFAnnot_GetColor");
    Module2["_FPDFAnnot_HasAttachmentPoints"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_HasAttachmentPoints"
    );
    Module2["_FPDFAnnot_SetAttachmentPoints"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_SetAttachmentPoints"
    );
    Module2["_FPDFAnnot_AppendAttachmentPoints"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_AppendAttachmentPoints"
    );
    Module2["_FPDFAnnot_CountAttachmentPoints"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_CountAttachmentPoints"
    );
    Module2["_FPDFAnnot_GetAttachmentPoints"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_GetAttachmentPoints"
    );
    Module2["_FPDFAnnot_SetRect"] = makeInvalidEarlyAccess("_FPDFAnnot_SetRect");
    Module2["_FPDFAnnot_GetRect"] = makeInvalidEarlyAccess("_FPDFAnnot_GetRect");
    Module2["_FPDFAnnot_GetVertices"] = makeInvalidEarlyAccess("_FPDFAnnot_GetVertices");
    Module2["_FPDFAnnot_GetInkListCount"] = makeInvalidEarlyAccess("_FPDFAnnot_GetInkListCount");
    Module2["_FPDFAnnot_GetInkListPath"] = makeInvalidEarlyAccess("_FPDFAnnot_GetInkListPath");
    Module2["_FPDFAnnot_GetLine"] = makeInvalidEarlyAccess("_FPDFAnnot_GetLine");
    Module2["_FPDFAnnot_SetBorder"] = makeInvalidEarlyAccess("_FPDFAnnot_SetBorder");
    Module2["_FPDFAnnot_GetBorder"] = makeInvalidEarlyAccess("_FPDFAnnot_GetBorder");
    Module2["_FPDFAnnot_HasKey"] = makeInvalidEarlyAccess("_FPDFAnnot_HasKey");
    Module2["_FPDFAnnot_GetValueType"] = makeInvalidEarlyAccess("_FPDFAnnot_GetValueType");
    Module2["_FPDFAnnot_SetStringValue"] = makeInvalidEarlyAccess("_FPDFAnnot_SetStringValue");
    Module2["_FPDFAnnot_GetStringValue"] = makeInvalidEarlyAccess("_FPDFAnnot_GetStringValue");
    Module2["_FPDFAnnot_GetNumberValue"] = makeInvalidEarlyAccess("_FPDFAnnot_GetNumberValue");
    Module2["_FPDFAnnot_SetAP"] = makeInvalidEarlyAccess("_FPDFAnnot_SetAP");
    Module2["_FPDFAnnot_GetAP"] = makeInvalidEarlyAccess("_FPDFAnnot_GetAP");
    Module2["_FPDFAnnot_GetLinkedAnnot"] = makeInvalidEarlyAccess("_FPDFAnnot_GetLinkedAnnot");
    Module2["_FPDFAnnot_GetFlags"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFlags");
    Module2["_FPDFAnnot_SetFlags"] = makeInvalidEarlyAccess("_FPDFAnnot_SetFlags");
    Module2["_FPDFAnnot_GetFormFieldFlags"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFormFieldFlags");
    Module2["_FPDFAnnot_SetFormFieldFlags"] = makeInvalidEarlyAccess("_FPDFAnnot_SetFormFieldFlags");
    Module2["_FPDFAnnot_GetFormFieldAtPoint"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_GetFormFieldAtPoint"
    );
    Module2["_FPDFAnnot_GetFormFieldName"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFormFieldName");
    Module2["_FPDFAnnot_GetFormFieldType"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFormFieldType");
    Module2["_FPDFAnnot_GetFormAdditionalActionJavaScript"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFormAdditionalActionJavaScript");
    Module2["_FPDFAnnot_GetFormFieldAlternateName"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_GetFormFieldAlternateName"
    );
    Module2["_FPDFAnnot_GetFormFieldValue"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFormFieldValue");
    Module2["_FPDFAnnot_GetOptionCount"] = makeInvalidEarlyAccess("_FPDFAnnot_GetOptionCount");
    Module2["_FPDFAnnot_GetOptionLabel"] = makeInvalidEarlyAccess("_FPDFAnnot_GetOptionLabel");
    Module2["_FPDFAnnot_IsOptionSelected"] = makeInvalidEarlyAccess("_FPDFAnnot_IsOptionSelected");
    Module2["_FPDFAnnot_GetFontSize"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFontSize");
    Module2["_FPDFAnnot_SetFontColor"] = makeInvalidEarlyAccess("_FPDFAnnot_SetFontColor");
    Module2["_FPDFAnnot_GetFontColor"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFontColor");
    Module2["_FPDFAnnot_IsChecked"] = makeInvalidEarlyAccess("_FPDFAnnot_IsChecked");
    Module2["_FPDFAnnot_SetFocusableSubtypes"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_SetFocusableSubtypes"
    );
    Module2["_FPDFAnnot_GetFocusableSubtypesCount"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_GetFocusableSubtypesCount"
    );
    Module2["_FPDFAnnot_GetFocusableSubtypes"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_GetFocusableSubtypes"
    );
    Module2["_FPDFAnnot_GetLink"] = makeInvalidEarlyAccess("_FPDFAnnot_GetLink");
    Module2["_FPDFAnnot_GetFormControlCount"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_GetFormControlCount"
    );
    Module2["_FPDFAnnot_GetFormControlIndex"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_GetFormControlIndex"
    );
    Module2["_FPDFAnnot_GetFormFieldExportValue"] = makeInvalidEarlyAccess(
      "_FPDFAnnot_GetFormFieldExportValue"
    );
    Module2["_FPDFAnnot_SetURI"] = makeInvalidEarlyAccess("_FPDFAnnot_SetURI");
    Module2["_FPDFAnnot_GetFileAttachment"] = makeInvalidEarlyAccess("_FPDFAnnot_GetFileAttachment");
    Module2["_FPDFAnnot_AddFileAttachment"] = makeInvalidEarlyAccess("_FPDFAnnot_AddFileAttachment");
    Module2["_FPDFDoc_GetAttachmentCount"] = makeInvalidEarlyAccess("_FPDFDoc_GetAttachmentCount");
    Module2["_FPDFDoc_AddAttachment"] = makeInvalidEarlyAccess("_FPDFDoc_AddAttachment");
    Module2["_FPDFDoc_GetAttachment"] = makeInvalidEarlyAccess("_FPDFDoc_GetAttachment");
    Module2["_FPDFDoc_DeleteAttachment"] = makeInvalidEarlyAccess("_FPDFDoc_DeleteAttachment");
    Module2["_FPDFAttachment_GetName"] = makeInvalidEarlyAccess("_FPDFAttachment_GetName");
    Module2["_FPDFAttachment_HasKey"] = makeInvalidEarlyAccess("_FPDFAttachment_HasKey");
    Module2["_FPDFAttachment_GetValueType"] = makeInvalidEarlyAccess("_FPDFAttachment_GetValueType");
    Module2["_FPDFAttachment_SetStringValue"] = makeInvalidEarlyAccess(
      "_FPDFAttachment_SetStringValue"
    );
    Module2["_FPDFAttachment_GetStringValue"] = makeInvalidEarlyAccess(
      "_FPDFAttachment_GetStringValue"
    );
    Module2["_FPDFAttachment_SetFile"] = makeInvalidEarlyAccess("_FPDFAttachment_SetFile");
    Module2["_FPDFAttachment_GetFile"] = makeInvalidEarlyAccess("_FPDFAttachment_GetFile");
    Module2["_FPDFAttachment_GetSubtype"] = makeInvalidEarlyAccess("_FPDFAttachment_GetSubtype");
    Module2["_FPDFCatalog_IsTagged"] = makeInvalidEarlyAccess("_FPDFCatalog_IsTagged");
    Module2["_FPDFCatalog_SetLanguage"] = makeInvalidEarlyAccess("_FPDFCatalog_SetLanguage");
    Module2["_FPDFAvail_Create"] = makeInvalidEarlyAccess("_FPDFAvail_Create");
    Module2["_FPDFAvail_Destroy"] = makeInvalidEarlyAccess("_FPDFAvail_Destroy");
    Module2["_FPDFAvail_IsDocAvail"] = makeInvalidEarlyAccess("_FPDFAvail_IsDocAvail");
    Module2["_FPDFAvail_GetDocument"] = makeInvalidEarlyAccess("_FPDFAvail_GetDocument");
    Module2["_FPDFAvail_GetFirstPageNum"] = makeInvalidEarlyAccess("_FPDFAvail_GetFirstPageNum");
    Module2["_FPDFAvail_IsPageAvail"] = makeInvalidEarlyAccess("_FPDFAvail_IsPageAvail");
    Module2["_FPDFAvail_IsFormAvail"] = makeInvalidEarlyAccess("_FPDFAvail_IsFormAvail");
    Module2["_FPDFAvail_IsLinearized"] = makeInvalidEarlyAccess("_FPDFAvail_IsLinearized");
    Module2["_FPDFBookmark_GetFirstChild"] = makeInvalidEarlyAccess("_FPDFBookmark_GetFirstChild");
    Module2["_FPDFBookmark_GetNextSibling"] = makeInvalidEarlyAccess("_FPDFBookmark_GetNextSibling");
    Module2["_FPDFBookmark_GetTitle"] = makeInvalidEarlyAccess("_FPDFBookmark_GetTitle");
    Module2["_FPDFBookmark_GetCount"] = makeInvalidEarlyAccess("_FPDFBookmark_GetCount");
    Module2["_FPDFBookmark_Find"] = makeInvalidEarlyAccess("_FPDFBookmark_Find");
    Module2["_FPDFBookmark_GetDest"] = makeInvalidEarlyAccess("_FPDFBookmark_GetDest");
    Module2["_FPDFBookmark_GetAction"] = makeInvalidEarlyAccess("_FPDFBookmark_GetAction");
    Module2["_FPDFAction_GetType"] = makeInvalidEarlyAccess("_FPDFAction_GetType");
    Module2["_FPDFAction_GetDest"] = makeInvalidEarlyAccess("_FPDFAction_GetDest");
    Module2["_FPDFAction_GetFilePath"] = makeInvalidEarlyAccess("_FPDFAction_GetFilePath");
    Module2["_FPDFAction_GetURIPath"] = makeInvalidEarlyAccess("_FPDFAction_GetURIPath");
    Module2["_FPDFDest_GetDestPageIndex"] = makeInvalidEarlyAccess("_FPDFDest_GetDestPageIndex");
    Module2["_FPDFDest_GetView"] = makeInvalidEarlyAccess("_FPDFDest_GetView");
    Module2["_FPDFDest_GetLocationInPage"] = makeInvalidEarlyAccess("_FPDFDest_GetLocationInPage");
    Module2["_FPDFLink_GetLinkAtPoint"] = makeInvalidEarlyAccess("_FPDFLink_GetLinkAtPoint");
    Module2["_FPDFLink_GetLinkZOrderAtPoint"] = makeInvalidEarlyAccess(
      "_FPDFLink_GetLinkZOrderAtPoint"
    );
    Module2["_FPDFLink_GetDest"] = makeInvalidEarlyAccess("_FPDFLink_GetDest");
    Module2["_FPDFLink_GetAction"] = makeInvalidEarlyAccess("_FPDFLink_GetAction");
    Module2["_FPDFLink_Enumerate"] = makeInvalidEarlyAccess("_FPDFLink_Enumerate");
    Module2["_FPDFLink_GetAnnot"] = makeInvalidEarlyAccess("_FPDFLink_GetAnnot");
    Module2["_FPDFLink_GetAnnotRect"] = makeInvalidEarlyAccess("_FPDFLink_GetAnnotRect");
    Module2["_FPDFLink_CountQuadPoints"] = makeInvalidEarlyAccess("_FPDFLink_CountQuadPoints");
    Module2["_FPDFLink_GetQuadPoints"] = makeInvalidEarlyAccess("_FPDFLink_GetQuadPoints");
    Module2["_FPDF_GetPageAAction"] = makeInvalidEarlyAccess("_FPDF_GetPageAAction");
    Module2["_FPDF_GetFileIdentifier"] = makeInvalidEarlyAccess("_FPDF_GetFileIdentifier");
    Module2["_FPDF_GetMetaText"] = makeInvalidEarlyAccess("_FPDF_GetMetaText");
    Module2["_FPDF_GetPageLabel"] = makeInvalidEarlyAccess("_FPDF_GetPageLabel");
    Module2["_FPDFPageObj_NewImageObj"] = makeInvalidEarlyAccess("_FPDFPageObj_NewImageObj");
    Module2["_FPDFImageObj_LoadJpegFile"] = makeInvalidEarlyAccess("_FPDFImageObj_LoadJpegFile");
    Module2["_FPDFImageObj_LoadJpegFileInline"] = makeInvalidEarlyAccess(
      "_FPDFImageObj_LoadJpegFileInline"
    );
    Module2["_FPDFImageObj_SetMatrix"] = makeInvalidEarlyAccess("_FPDFImageObj_SetMatrix");
    Module2["_FPDFImageObj_SetBitmap"] = makeInvalidEarlyAccess("_FPDFImageObj_SetBitmap");
    Module2["_FPDFImageObj_GetBitmap"] = makeInvalidEarlyAccess("_FPDFImageObj_GetBitmap");
    Module2["_FPDFImageObj_GetRenderedBitmap"] = makeInvalidEarlyAccess(
      "_FPDFImageObj_GetRenderedBitmap"
    );
    Module2["_FPDFImageObj_GetImageDataDecoded"] = makeInvalidEarlyAccess(
      "_FPDFImageObj_GetImageDataDecoded"
    );
    Module2["_FPDFImageObj_GetImageDataRaw"] = makeInvalidEarlyAccess(
      "_FPDFImageObj_GetImageDataRaw"
    );
    Module2["_FPDFImageObj_GetImageFilterCount"] = makeInvalidEarlyAccess(
      "_FPDFImageObj_GetImageFilterCount"
    );
    Module2["_FPDFImageObj_GetImageFilter"] = makeInvalidEarlyAccess("_FPDFImageObj_GetImageFilter");
    Module2["_FPDFImageObj_GetImageMetadata"] = makeInvalidEarlyAccess(
      "_FPDFImageObj_GetImageMetadata"
    );
    Module2["_FPDFImageObj_GetImagePixelSize"] = makeInvalidEarlyAccess(
      "_FPDFImageObj_GetImagePixelSize"
    );
    Module2["_FPDFImageObj_GetIccProfileDataDecoded"] = makeInvalidEarlyAccess("_FPDFImageObj_GetIccProfileDataDecoded");
    Module2["_FPDF_CreateNewDocument"] = makeInvalidEarlyAccess("_FPDF_CreateNewDocument");
    Module2["_FPDFPage_Delete"] = makeInvalidEarlyAccess("_FPDFPage_Delete");
    Module2["_FPDF_MovePages"] = makeInvalidEarlyAccess("_FPDF_MovePages");
    Module2["_FPDFPage_New"] = makeInvalidEarlyAccess("_FPDFPage_New");
    Module2["_FPDFPage_GetRotation"] = makeInvalidEarlyAccess("_FPDFPage_GetRotation");
    Module2["_FPDFPage_InsertObject"] = makeInvalidEarlyAccess("_FPDFPage_InsertObject");
    Module2["_FPDFPage_InsertObjectAtIndex"] = makeInvalidEarlyAccess(
      "_FPDFPage_InsertObjectAtIndex"
    );
    Module2["_FPDFPage_RemoveObject"] = makeInvalidEarlyAccess("_FPDFPage_RemoveObject");
    Module2["_FPDFPage_CountObjects"] = makeInvalidEarlyAccess("_FPDFPage_CountObjects");
    Module2["_FPDFPage_GetObject"] = makeInvalidEarlyAccess("_FPDFPage_GetObject");
    Module2["_FPDFPage_HasTransparency"] = makeInvalidEarlyAccess("_FPDFPage_HasTransparency");
    Module2["_FPDFPageObj_Destroy"] = makeInvalidEarlyAccess("_FPDFPageObj_Destroy");
    Module2["_FPDFPageObj_GetMarkedContentID"] = makeInvalidEarlyAccess(
      "_FPDFPageObj_GetMarkedContentID"
    );
    Module2["_FPDFPageObj_CountMarks"] = makeInvalidEarlyAccess("_FPDFPageObj_CountMarks");
    Module2["_FPDFPageObj_GetMark"] = makeInvalidEarlyAccess("_FPDFPageObj_GetMark");
    Module2["_FPDFPageObj_AddMark"] = makeInvalidEarlyAccess("_FPDFPageObj_AddMark");
    Module2["_FPDFPageObj_RemoveMark"] = makeInvalidEarlyAccess("_FPDFPageObj_RemoveMark");
    Module2["_FPDFPageObjMark_GetName"] = makeInvalidEarlyAccess("_FPDFPageObjMark_GetName");
    Module2["_FPDFPageObjMark_CountParams"] = makeInvalidEarlyAccess("_FPDFPageObjMark_CountParams");
    Module2["_FPDFPageObjMark_GetParamKey"] = makeInvalidEarlyAccess("_FPDFPageObjMark_GetParamKey");
    Module2["_FPDFPageObjMark_GetParamValueType"] = makeInvalidEarlyAccess(
      "_FPDFPageObjMark_GetParamValueType"
    );
    Module2["_FPDFPageObjMark_GetParamIntValue"] = makeInvalidEarlyAccess(
      "_FPDFPageObjMark_GetParamIntValue"
    );
    Module2["_FPDFPageObjMark_GetParamStringValue"] = makeInvalidEarlyAccess(
      "_FPDFPageObjMark_GetParamStringValue"
    );
    Module2["_FPDFPageObjMark_GetParamBlobValue"] = makeInvalidEarlyAccess(
      "_FPDFPageObjMark_GetParamBlobValue"
    );
    Module2["_FPDFPageObj_HasTransparency"] = makeInvalidEarlyAccess("_FPDFPageObj_HasTransparency");
    Module2["_FPDFPageObjMark_SetIntParam"] = makeInvalidEarlyAccess("_FPDFPageObjMark_SetIntParam");
    Module2["_FPDFPageObjMark_SetStringParam"] = makeInvalidEarlyAccess(
      "_FPDFPageObjMark_SetStringParam"
    );
    Module2["_FPDFPageObjMark_SetBlobParam"] = makeInvalidEarlyAccess(
      "_FPDFPageObjMark_SetBlobParam"
    );
    Module2["_FPDFPageObjMark_RemoveParam"] = makeInvalidEarlyAccess("_FPDFPageObjMark_RemoveParam");
    Module2["_FPDFPageObj_GetType"] = makeInvalidEarlyAccess("_FPDFPageObj_GetType");
    Module2["_FPDFPageObj_GetIsActive"] = makeInvalidEarlyAccess("_FPDFPageObj_GetIsActive");
    Module2["_FPDFPageObj_SetIsActive"] = makeInvalidEarlyAccess("_FPDFPageObj_SetIsActive");
    Module2["_FPDFPage_GenerateContent"] = makeInvalidEarlyAccess("_FPDFPage_GenerateContent");
    Module2["_FPDFPageObj_Transform"] = makeInvalidEarlyAccess("_FPDFPageObj_Transform");
    Module2["_FPDFPageObj_TransformF"] = makeInvalidEarlyAccess("_FPDFPageObj_TransformF");
    Module2["_FPDFPageObj_GetMatrix"] = makeInvalidEarlyAccess("_FPDFPageObj_GetMatrix");
    Module2["_FPDFPageObj_SetMatrix"] = makeInvalidEarlyAccess("_FPDFPageObj_SetMatrix");
    Module2["_FPDFPageObj_SetBlendMode"] = makeInvalidEarlyAccess("_FPDFPageObj_SetBlendMode");
    Module2["_FPDFPage_TransformAnnots"] = makeInvalidEarlyAccess("_FPDFPage_TransformAnnots");
    Module2["_FPDFPage_SetRotation"] = makeInvalidEarlyAccess("_FPDFPage_SetRotation");
    Module2["_FPDFPageObj_SetFillColor"] = makeInvalidEarlyAccess("_FPDFPageObj_SetFillColor");
    Module2["_FPDFPageObj_GetFillColor"] = makeInvalidEarlyAccess("_FPDFPageObj_GetFillColor");
    Module2["_FPDFPageObj_GetBounds"] = makeInvalidEarlyAccess("_FPDFPageObj_GetBounds");
    Module2["_FPDFPageObj_GetRotatedBounds"] = makeInvalidEarlyAccess(
      "_FPDFPageObj_GetRotatedBounds"
    );
    Module2["_FPDFPageObj_SetStrokeColor"] = makeInvalidEarlyAccess("_FPDFPageObj_SetStrokeColor");
    Module2["_FPDFPageObj_GetStrokeColor"] = makeInvalidEarlyAccess("_FPDFPageObj_GetStrokeColor");
    Module2["_FPDFPageObj_SetStrokeWidth"] = makeInvalidEarlyAccess("_FPDFPageObj_SetStrokeWidth");
    Module2["_FPDFPageObj_GetStrokeWidth"] = makeInvalidEarlyAccess("_FPDFPageObj_GetStrokeWidth");
    Module2["_FPDFPageObj_GetLineJoin"] = makeInvalidEarlyAccess("_FPDFPageObj_GetLineJoin");
    Module2["_FPDFPageObj_SetLineJoin"] = makeInvalidEarlyAccess("_FPDFPageObj_SetLineJoin");
    Module2["_FPDFPageObj_GetLineCap"] = makeInvalidEarlyAccess("_FPDFPageObj_GetLineCap");
    Module2["_FPDFPageObj_SetLineCap"] = makeInvalidEarlyAccess("_FPDFPageObj_SetLineCap");
    Module2["_FPDFPageObj_GetDashPhase"] = makeInvalidEarlyAccess("_FPDFPageObj_GetDashPhase");
    Module2["_FPDFPageObj_SetDashPhase"] = makeInvalidEarlyAccess("_FPDFPageObj_SetDashPhase");
    Module2["_FPDFPageObj_GetDashCount"] = makeInvalidEarlyAccess("_FPDFPageObj_GetDashCount");
    Module2["_FPDFPageObj_GetDashArray"] = makeInvalidEarlyAccess("_FPDFPageObj_GetDashArray");
    Module2["_FPDFPageObj_SetDashArray"] = makeInvalidEarlyAccess("_FPDFPageObj_SetDashArray");
    Module2["_FPDFFormObj_CountObjects"] = makeInvalidEarlyAccess("_FPDFFormObj_CountObjects");
    Module2["_FPDFFormObj_GetObject"] = makeInvalidEarlyAccess("_FPDFFormObj_GetObject");
    Module2["_FPDFFormObj_RemoveObject"] = makeInvalidEarlyAccess("_FPDFFormObj_RemoveObject");
    Module2["_FPDFPageObj_CreateNewPath"] = makeInvalidEarlyAccess("_FPDFPageObj_CreateNewPath");
    Module2["_FPDFPageObj_CreateNewRect"] = makeInvalidEarlyAccess("_FPDFPageObj_CreateNewRect");
    Module2["_FPDFPath_CountSegments"] = makeInvalidEarlyAccess("_FPDFPath_CountSegments");
    Module2["_FPDFPath_GetPathSegment"] = makeInvalidEarlyAccess("_FPDFPath_GetPathSegment");
    Module2["_FPDFPath_MoveTo"] = makeInvalidEarlyAccess("_FPDFPath_MoveTo");
    Module2["_FPDFPath_LineTo"] = makeInvalidEarlyAccess("_FPDFPath_LineTo");
    Module2["_FPDFPath_BezierTo"] = makeInvalidEarlyAccess("_FPDFPath_BezierTo");
    Module2["_FPDFPath_Close"] = makeInvalidEarlyAccess("_FPDFPath_Close");
    Module2["_FPDFPath_SetDrawMode"] = makeInvalidEarlyAccess("_FPDFPath_SetDrawMode");
    Module2["_FPDFPath_GetDrawMode"] = makeInvalidEarlyAccess("_FPDFPath_GetDrawMode");
    Module2["_FPDFPathSegment_GetPoint"] = makeInvalidEarlyAccess("_FPDFPathSegment_GetPoint");
    Module2["_FPDFPathSegment_GetType"] = makeInvalidEarlyAccess("_FPDFPathSegment_GetType");
    Module2["_FPDFPathSegment_GetClose"] = makeInvalidEarlyAccess("_FPDFPathSegment_GetClose");
    Module2["_FPDFPageObj_NewTextObj"] = makeInvalidEarlyAccess("_FPDFPageObj_NewTextObj");
    Module2["_FPDFText_SetText"] = makeInvalidEarlyAccess("_FPDFText_SetText");
    Module2["_FPDFText_SetCharcodes"] = makeInvalidEarlyAccess("_FPDFText_SetCharcodes");
    Module2["_FPDFText_LoadFont"] = makeInvalidEarlyAccess("_FPDFText_LoadFont");
    Module2["_FPDFText_LoadStandardFont"] = makeInvalidEarlyAccess("_FPDFText_LoadStandardFont");
    Module2["_FPDFText_LoadCidType2Font"] = makeInvalidEarlyAccess("_FPDFText_LoadCidType2Font");
    Module2["_FPDFTextObj_GetFontSize"] = makeInvalidEarlyAccess("_FPDFTextObj_GetFontSize");
    Module2["_FPDFTextObj_GetText"] = makeInvalidEarlyAccess("_FPDFTextObj_GetText");
    Module2["_FPDFTextObj_GetRenderedBitmap"] = makeInvalidEarlyAccess(
      "_FPDFTextObj_GetRenderedBitmap"
    );
    Module2["_FPDFFont_Close"] = makeInvalidEarlyAccess("_FPDFFont_Close");
    Module2["_FPDFPageObj_CreateTextObj"] = makeInvalidEarlyAccess("_FPDFPageObj_CreateTextObj");
    Module2["_FPDFTextObj_GetTextRenderMode"] = makeInvalidEarlyAccess(
      "_FPDFTextObj_GetTextRenderMode"
    );
    Module2["_FPDFTextObj_SetTextRenderMode"] = makeInvalidEarlyAccess(
      "_FPDFTextObj_SetTextRenderMode"
    );
    Module2["_FPDFTextObj_GetFont"] = makeInvalidEarlyAccess("_FPDFTextObj_GetFont");
    Module2["_FPDFFont_GetBaseFontName"] = makeInvalidEarlyAccess("_FPDFFont_GetBaseFontName");
    Module2["_FPDFFont_GetFamilyName"] = makeInvalidEarlyAccess("_FPDFFont_GetFamilyName");
    Module2["_FPDFFont_GetFontData"] = makeInvalidEarlyAccess("_FPDFFont_GetFontData");
    Module2["_FPDFFont_GetIsEmbedded"] = makeInvalidEarlyAccess("_FPDFFont_GetIsEmbedded");
    Module2["_FPDFFont_GetFlags"] = makeInvalidEarlyAccess("_FPDFFont_GetFlags");
    Module2["_FPDFFont_GetWeight"] = makeInvalidEarlyAccess("_FPDFFont_GetWeight");
    Module2["_FPDFFont_GetItalicAngle"] = makeInvalidEarlyAccess("_FPDFFont_GetItalicAngle");
    Module2["_FPDFFont_GetAscent"] = makeInvalidEarlyAccess("_FPDFFont_GetAscent");
    Module2["_FPDFFont_GetDescent"] = makeInvalidEarlyAccess("_FPDFFont_GetDescent");
    Module2["_FPDFFont_GetGlyphWidth"] = makeInvalidEarlyAccess("_FPDFFont_GetGlyphWidth");
    Module2["_FPDFFont_GetGlyphPath"] = makeInvalidEarlyAccess("_FPDFFont_GetGlyphPath");
    Module2["_FPDFGlyphPath_CountGlyphSegments"] = makeInvalidEarlyAccess(
      "_FPDFGlyphPath_CountGlyphSegments"
    );
    Module2["_FPDFGlyphPath_GetGlyphPathSegment"] = makeInvalidEarlyAccess(
      "_FPDFGlyphPath_GetGlyphPathSegment"
    );
    Module2["_FSDK_SetUnSpObjProcessHandler"] = makeInvalidEarlyAccess(
      "_FSDK_SetUnSpObjProcessHandler"
    );
    Module2["_FSDK_SetTimeFunction"] = makeInvalidEarlyAccess("_FSDK_SetTimeFunction");
    Module2["_FSDK_SetLocaltimeFunction"] = makeInvalidEarlyAccess("_FSDK_SetLocaltimeFunction");
    Module2["_FPDFDoc_GetPageMode"] = makeInvalidEarlyAccess("_FPDFDoc_GetPageMode");
    Module2["_FPDFPage_Flatten"] = makeInvalidEarlyAccess("_FPDFPage_Flatten");
    Module2["_FPDFPage_HasFormFieldAtPoint"] = makeInvalidEarlyAccess(
      "_FPDFPage_HasFormFieldAtPoint"
    );
    Module2["_FPDFPage_FormFieldZOrderAtPoint"] = makeInvalidEarlyAccess(
      "_FPDFPage_FormFieldZOrderAtPoint"
    );
    Module2["_FPDFDOC_InitFormFillEnvironment"] = makeInvalidEarlyAccess(
      "_FPDFDOC_InitFormFillEnvironment"
    );
    Module2["_FPDFDOC_ExitFormFillEnvironment"] = makeInvalidEarlyAccess(
      "_FPDFDOC_ExitFormFillEnvironment"
    );
    Module2["_FORM_OnMouseMove"] = makeInvalidEarlyAccess("_FORM_OnMouseMove");
    Module2["_FORM_OnMouseWheel"] = makeInvalidEarlyAccess("_FORM_OnMouseWheel");
    Module2["_FORM_OnFocus"] = makeInvalidEarlyAccess("_FORM_OnFocus");
    Module2["_FORM_OnLButtonDown"] = makeInvalidEarlyAccess("_FORM_OnLButtonDown");
    Module2["_FORM_OnLButtonUp"] = makeInvalidEarlyAccess("_FORM_OnLButtonUp");
    Module2["_FORM_OnLButtonDoubleClick"] = makeInvalidEarlyAccess("_FORM_OnLButtonDoubleClick");
    Module2["_FORM_OnRButtonDown"] = makeInvalidEarlyAccess("_FORM_OnRButtonDown");
    Module2["_FORM_OnRButtonUp"] = makeInvalidEarlyAccess("_FORM_OnRButtonUp");
    Module2["_FORM_OnKeyDown"] = makeInvalidEarlyAccess("_FORM_OnKeyDown");
    Module2["_FORM_OnKeyUp"] = makeInvalidEarlyAccess("_FORM_OnKeyUp");
    Module2["_FORM_OnChar"] = makeInvalidEarlyAccess("_FORM_OnChar");
    Module2["_FORM_GetFocusedText"] = makeInvalidEarlyAccess("_FORM_GetFocusedText");
    Module2["_FORM_GetSelectedText"] = makeInvalidEarlyAccess("_FORM_GetSelectedText");
    Module2["_FORM_ReplaceAndKeepSelection"] = makeInvalidEarlyAccess(
      "_FORM_ReplaceAndKeepSelection"
    );
    Module2["_FORM_ReplaceSelection"] = makeInvalidEarlyAccess("_FORM_ReplaceSelection");
    Module2["_FORM_SelectAllText"] = makeInvalidEarlyAccess("_FORM_SelectAllText");
    Module2["_FORM_CanUndo"] = makeInvalidEarlyAccess("_FORM_CanUndo");
    Module2["_FORM_CanRedo"] = makeInvalidEarlyAccess("_FORM_CanRedo");
    Module2["_FORM_Undo"] = makeInvalidEarlyAccess("_FORM_Undo");
    Module2["_FORM_Redo"] = makeInvalidEarlyAccess("_FORM_Redo");
    Module2["_FORM_ForceToKillFocus"] = makeInvalidEarlyAccess("_FORM_ForceToKillFocus");
    Module2["_FORM_GetFocusedAnnot"] = makeInvalidEarlyAccess("_FORM_GetFocusedAnnot");
    Module2["_FORM_SetFocusedAnnot"] = makeInvalidEarlyAccess("_FORM_SetFocusedAnnot");
    Module2["_FPDF_FFLDraw"] = makeInvalidEarlyAccess("_FPDF_FFLDraw");
    Module2["_FPDF_SetFormFieldHighlightColor"] = makeInvalidEarlyAccess(
      "_FPDF_SetFormFieldHighlightColor"
    );
    Module2["_FPDF_SetFormFieldHighlightAlpha"] = makeInvalidEarlyAccess(
      "_FPDF_SetFormFieldHighlightAlpha"
    );
    Module2["_FPDF_RemoveFormFieldHighlight"] = makeInvalidEarlyAccess(
      "_FPDF_RemoveFormFieldHighlight"
    );
    Module2["_FORM_OnAfterLoadPage"] = makeInvalidEarlyAccess("_FORM_OnAfterLoadPage");
    Module2["_FORM_OnBeforeClosePage"] = makeInvalidEarlyAccess("_FORM_OnBeforeClosePage");
    Module2["_FORM_DoDocumentJSAction"] = makeInvalidEarlyAccess("_FORM_DoDocumentJSAction");
    Module2["_FORM_DoDocumentOpenAction"] = makeInvalidEarlyAccess("_FORM_DoDocumentOpenAction");
    Module2["_FORM_DoDocumentAAction"] = makeInvalidEarlyAccess("_FORM_DoDocumentAAction");
    Module2["_FORM_DoPageAAction"] = makeInvalidEarlyAccess("_FORM_DoPageAAction");
    Module2["_FORM_SetIndexSelected"] = makeInvalidEarlyAccess("_FORM_SetIndexSelected");
    Module2["_FORM_IsIndexSelected"] = makeInvalidEarlyAccess("_FORM_IsIndexSelected");
    Module2["_FPDFDoc_GetJavaScriptActionCount"] = makeInvalidEarlyAccess(
      "_FPDFDoc_GetJavaScriptActionCount"
    );
    Module2["_FPDFDoc_GetJavaScriptAction"] = makeInvalidEarlyAccess("_FPDFDoc_GetJavaScriptAction");
    Module2["_FPDFDoc_CloseJavaScriptAction"] = makeInvalidEarlyAccess(
      "_FPDFDoc_CloseJavaScriptAction"
    );
    Module2["_FPDFJavaScriptAction_GetName"] = makeInvalidEarlyAccess(
      "_FPDFJavaScriptAction_GetName"
    );
    Module2["_FPDFJavaScriptAction_GetScript"] = makeInvalidEarlyAccess(
      "_FPDFJavaScriptAction_GetScript"
    );
    Module2["_FPDF_ImportPagesByIndex"] = makeInvalidEarlyAccess("_FPDF_ImportPagesByIndex");
    Module2["_FPDF_ImportPages"] = makeInvalidEarlyAccess("_FPDF_ImportPages");
    Module2["_FPDF_ImportNPagesToOne"] = makeInvalidEarlyAccess("_FPDF_ImportNPagesToOne");
    Module2["_FPDF_NewXObjectFromPage"] = makeInvalidEarlyAccess("_FPDF_NewXObjectFromPage");
    Module2["_FPDF_CloseXObject"] = makeInvalidEarlyAccess("_FPDF_CloseXObject");
    Module2["_FPDF_NewFormObjectFromXObject"] = makeInvalidEarlyAccess(
      "_FPDF_NewFormObjectFromXObject"
    );
    Module2["_FPDF_CopyViewerPreferences"] = makeInvalidEarlyAccess("_FPDF_CopyViewerPreferences");
    Module2["_FPDF_RenderPageBitmapWithColorScheme_Start"] = makeInvalidEarlyAccess("_FPDF_RenderPageBitmapWithColorScheme_Start");
    Module2["_FPDF_RenderPageBitmap_Start"] = makeInvalidEarlyAccess("_FPDF_RenderPageBitmap_Start");
    Module2["_FPDF_RenderPage_Continue"] = makeInvalidEarlyAccess("_FPDF_RenderPage_Continue");
    Module2["_FPDF_RenderPage_Close"] = makeInvalidEarlyAccess("_FPDF_RenderPage_Close");
    Module2["_FPDF_SaveAsCopy"] = makeInvalidEarlyAccess("_FPDF_SaveAsCopy");
    Module2["_FPDF_SaveWithVersion"] = makeInvalidEarlyAccess("_FPDF_SaveWithVersion");
    Module2["_FPDFText_GetCharIndexFromTextIndex"] = makeInvalidEarlyAccess(
      "_FPDFText_GetCharIndexFromTextIndex"
    );
    Module2["_FPDFText_GetTextIndexFromCharIndex"] = makeInvalidEarlyAccess(
      "_FPDFText_GetTextIndexFromCharIndex"
    );
    Module2["_FPDF_GetSignatureCount"] = makeInvalidEarlyAccess("_FPDF_GetSignatureCount");
    Module2["_FPDF_GetSignatureObject"] = makeInvalidEarlyAccess("_FPDF_GetSignatureObject");
    Module2["_FPDFSignatureObj_GetContents"] = makeInvalidEarlyAccess(
      "_FPDFSignatureObj_GetContents"
    );
    Module2["_FPDFSignatureObj_GetByteRange"] = makeInvalidEarlyAccess(
      "_FPDFSignatureObj_GetByteRange"
    );
    Module2["_FPDFSignatureObj_GetSubFilter"] = makeInvalidEarlyAccess(
      "_FPDFSignatureObj_GetSubFilter"
    );
    Module2["_FPDFSignatureObj_GetReason"] = makeInvalidEarlyAccess("_FPDFSignatureObj_GetReason");
    Module2["_FPDFSignatureObj_GetTime"] = makeInvalidEarlyAccess("_FPDFSignatureObj_GetTime");
    Module2["_FPDFSignatureObj_GetDocMDPPermission"] = makeInvalidEarlyAccess("_FPDFSignatureObj_GetDocMDPPermission");
    Module2["_FPDF_StructTree_GetForPage"] = makeInvalidEarlyAccess("_FPDF_StructTree_GetForPage");
    Module2["_FPDF_StructTree_Close"] = makeInvalidEarlyAccess("_FPDF_StructTree_Close");
    Module2["_FPDF_StructTree_CountChildren"] = makeInvalidEarlyAccess(
      "_FPDF_StructTree_CountChildren"
    );
    Module2["_FPDF_StructTree_GetChildAtIndex"] = makeInvalidEarlyAccess(
      "_FPDF_StructTree_GetChildAtIndex"
    );
    Module2["_FPDF_StructElement_GetAltText"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_GetAltText"
    );
    Module2["_FPDF_StructElement_GetActualText"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_GetActualText"
    );
    Module2["_FPDF_StructElement_GetID"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetID");
    Module2["_FPDF_StructElement_GetLang"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetLang");
    Module2["_FPDF_StructElement_GetAttributeCount"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetAttributeCount");
    Module2["_FPDF_StructElement_GetAttributeAtIndex"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetAttributeAtIndex");
    Module2["_FPDF_StructElement_GetStringAttribute"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetStringAttribute");
    Module2["_FPDF_StructElement_GetMarkedContentID"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetMarkedContentID");
    Module2["_FPDF_StructElement_GetType"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetType");
    Module2["_FPDF_StructElement_GetObjType"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_GetObjType"
    );
    Module2["_FPDF_StructElement_GetTitle"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetTitle");
    Module2["_FPDF_StructElement_CountChildren"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_CountChildren"
    );
    Module2["_FPDF_StructElement_GetChildAtIndex"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_GetChildAtIndex"
    );
    Module2["_FPDF_StructElement_GetChildMarkedContentID"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetChildMarkedContentID");
    Module2["_FPDF_StructElement_GetParent"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_GetParent"
    );
    Module2["_FPDF_StructElement_Attr_GetCount"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_Attr_GetCount"
    );
    Module2["_FPDF_StructElement_Attr_GetName"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_Attr_GetName"
    );
    Module2["_FPDF_StructElement_Attr_GetValue"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_Attr_GetValue"
    );
    Module2["_FPDF_StructElement_Attr_GetType"] = makeInvalidEarlyAccess(
      "_FPDF_StructElement_Attr_GetType"
    );
    Module2["_FPDF_StructElement_Attr_GetBooleanValue"] = makeInvalidEarlyAccess("_FPDF_StructElement_Attr_GetBooleanValue");
    Module2["_FPDF_StructElement_Attr_GetNumberValue"] = makeInvalidEarlyAccess("_FPDF_StructElement_Attr_GetNumberValue");
    Module2["_FPDF_StructElement_Attr_GetStringValue"] = makeInvalidEarlyAccess("_FPDF_StructElement_Attr_GetStringValue");
    Module2["_FPDF_StructElement_Attr_GetBlobValue"] = makeInvalidEarlyAccess("_FPDF_StructElement_Attr_GetBlobValue");
    Module2["_FPDF_StructElement_Attr_CountChildren"] = makeInvalidEarlyAccess("_FPDF_StructElement_Attr_CountChildren");
    Module2["_FPDF_StructElement_Attr_GetChildAtIndex"] = makeInvalidEarlyAccess("_FPDF_StructElement_Attr_GetChildAtIndex");
    Module2["_FPDF_StructElement_GetMarkedContentIdCount"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetMarkedContentIdCount");
    Module2["_FPDF_StructElement_GetMarkedContentIdAtIndex"] = makeInvalidEarlyAccess("_FPDF_StructElement_GetMarkedContentIdAtIndex");
    Module2["_FPDF_AddInstalledFont"] = makeInvalidEarlyAccess("_FPDF_AddInstalledFont");
    Module2["_FPDF_SetSystemFontInfo"] = makeInvalidEarlyAccess("_FPDF_SetSystemFontInfo");
    Module2["_FPDF_GetDefaultTTFMap"] = makeInvalidEarlyAccess("_FPDF_GetDefaultTTFMap");
    Module2["_FPDF_GetDefaultTTFMapCount"] = makeInvalidEarlyAccess("_FPDF_GetDefaultTTFMapCount");
    Module2["_FPDF_GetDefaultTTFMapEntry"] = makeInvalidEarlyAccess("_FPDF_GetDefaultTTFMapEntry");
    Module2["_FPDF_GetDefaultSystemFontInfo"] = makeInvalidEarlyAccess(
      "_FPDF_GetDefaultSystemFontInfo"
    );
    Module2["_FPDF_FreeDefaultSystemFontInfo"] = makeInvalidEarlyAccess(
      "_FPDF_FreeDefaultSystemFontInfo"
    );
    Module2["_FPDFText_LoadPage"] = makeInvalidEarlyAccess("_FPDFText_LoadPage");
    Module2["_FPDFText_ClosePage"] = makeInvalidEarlyAccess("_FPDFText_ClosePage");
    Module2["_FPDFText_CountChars"] = makeInvalidEarlyAccess("_FPDFText_CountChars");
    Module2["_FPDFText_GetUnicode"] = makeInvalidEarlyAccess("_FPDFText_GetUnicode");
    Module2["_FPDFText_GetTextObject"] = makeInvalidEarlyAccess("_FPDFText_GetTextObject");
    Module2["_FPDFText_IsGenerated"] = makeInvalidEarlyAccess("_FPDFText_IsGenerated");
    Module2["_FPDFText_IsHyphen"] = makeInvalidEarlyAccess("_FPDFText_IsHyphen");
    Module2["_FPDFText_HasUnicodeMapError"] = makeInvalidEarlyAccess("_FPDFText_HasUnicodeMapError");
    Module2["_FPDFText_GetFontSize"] = makeInvalidEarlyAccess("_FPDFText_GetFontSize");
    Module2["_FPDFText_GetFontInfo"] = makeInvalidEarlyAccess("_FPDFText_GetFontInfo");
    Module2["_FPDFText_GetFontWeight"] = makeInvalidEarlyAccess("_FPDFText_GetFontWeight");
    Module2["_FPDFText_GetFillColor"] = makeInvalidEarlyAccess("_FPDFText_GetFillColor");
    Module2["_FPDFText_GetStrokeColor"] = makeInvalidEarlyAccess("_FPDFText_GetStrokeColor");
    Module2["_FPDFText_GetCharAngle"] = makeInvalidEarlyAccess("_FPDFText_GetCharAngle");
    Module2["_FPDFText_GetCharBox"] = makeInvalidEarlyAccess("_FPDFText_GetCharBox");
    Module2["_FPDFText_GetLooseCharBox"] = makeInvalidEarlyAccess("_FPDFText_GetLooseCharBox");
    Module2["_FPDFText_GetMatrix"] = makeInvalidEarlyAccess("_FPDFText_GetMatrix");
    Module2["_FPDFText_GetCharOrigin"] = makeInvalidEarlyAccess("_FPDFText_GetCharOrigin");
    Module2["_FPDFText_GetCharIndexAtPos"] = makeInvalidEarlyAccess("_FPDFText_GetCharIndexAtPos");
    Module2["_FPDFText_GetText"] = makeInvalidEarlyAccess("_FPDFText_GetText");
    Module2["_FPDFText_CountRects"] = makeInvalidEarlyAccess("_FPDFText_CountRects");
    Module2["_FPDFText_GetRect"] = makeInvalidEarlyAccess("_FPDFText_GetRect");
    Module2["_FPDFText_GetBoundedText"] = makeInvalidEarlyAccess("_FPDFText_GetBoundedText");
    Module2["_FPDFText_FindStart"] = makeInvalidEarlyAccess("_FPDFText_FindStart");
    Module2["_FPDFText_FindNext"] = makeInvalidEarlyAccess("_FPDFText_FindNext");
    Module2["_FPDFText_FindPrev"] = makeInvalidEarlyAccess("_FPDFText_FindPrev");
    Module2["_FPDFText_GetSchResultIndex"] = makeInvalidEarlyAccess("_FPDFText_GetSchResultIndex");
    Module2["_FPDFText_GetSchCount"] = makeInvalidEarlyAccess("_FPDFText_GetSchCount");
    Module2["_FPDFText_FindClose"] = makeInvalidEarlyAccess("_FPDFText_FindClose");
    Module2["_FPDFLink_LoadWebLinks"] = makeInvalidEarlyAccess("_FPDFLink_LoadWebLinks");
    Module2["_FPDFLink_CountWebLinks"] = makeInvalidEarlyAccess("_FPDFLink_CountWebLinks");
    Module2["_FPDFLink_GetURL"] = makeInvalidEarlyAccess("_FPDFLink_GetURL");
    Module2["_FPDFLink_CountRects"] = makeInvalidEarlyAccess("_FPDFLink_CountRects");
    Module2["_FPDFLink_GetRect"] = makeInvalidEarlyAccess("_FPDFLink_GetRect");
    Module2["_FPDFLink_GetTextRange"] = makeInvalidEarlyAccess("_FPDFLink_GetTextRange");
    Module2["_FPDFLink_CloseWebLinks"] = makeInvalidEarlyAccess("_FPDFLink_CloseWebLinks");
    Module2["_FPDFPage_GetDecodedThumbnailData"] = makeInvalidEarlyAccess(
      "_FPDFPage_GetDecodedThumbnailData"
    );
    Module2["_FPDFPage_GetRawThumbnailData"] = makeInvalidEarlyAccess(
      "_FPDFPage_GetRawThumbnailData"
    );
    Module2["_FPDFPage_GetThumbnailAsBitmap"] = makeInvalidEarlyAccess(
      "_FPDFPage_GetThumbnailAsBitmap"
    );
    Module2["_FPDFPage_SetMediaBox"] = makeInvalidEarlyAccess("_FPDFPage_SetMediaBox");
    Module2["_FPDFPage_SetCropBox"] = makeInvalidEarlyAccess("_FPDFPage_SetCropBox");
    Module2["_FPDFPage_SetBleedBox"] = makeInvalidEarlyAccess("_FPDFPage_SetBleedBox");
    Module2["_FPDFPage_SetTrimBox"] = makeInvalidEarlyAccess("_FPDFPage_SetTrimBox");
    Module2["_FPDFPage_SetArtBox"] = makeInvalidEarlyAccess("_FPDFPage_SetArtBox");
    Module2["_FPDFPage_GetMediaBox"] = makeInvalidEarlyAccess("_FPDFPage_GetMediaBox");
    Module2["_FPDFPage_GetCropBox"] = makeInvalidEarlyAccess("_FPDFPage_GetCropBox");
    Module2["_FPDFPage_GetBleedBox"] = makeInvalidEarlyAccess("_FPDFPage_GetBleedBox");
    Module2["_FPDFPage_GetTrimBox"] = makeInvalidEarlyAccess("_FPDFPage_GetTrimBox");
    Module2["_FPDFPage_GetArtBox"] = makeInvalidEarlyAccess("_FPDFPage_GetArtBox");
    Module2["_FPDFPage_TransFormWithClip"] = makeInvalidEarlyAccess("_FPDFPage_TransFormWithClip");
    Module2["_FPDFPageObj_TransformClipPath"] = makeInvalidEarlyAccess(
      "_FPDFPageObj_TransformClipPath"
    );
    Module2["_FPDFPageObj_GetClipPath"] = makeInvalidEarlyAccess("_FPDFPageObj_GetClipPath");
    Module2["_FPDFClipPath_CountPaths"] = makeInvalidEarlyAccess("_FPDFClipPath_CountPaths");
    Module2["_FPDFClipPath_CountPathSegments"] = makeInvalidEarlyAccess(
      "_FPDFClipPath_CountPathSegments"
    );
    Module2["_FPDFClipPath_GetPathSegment"] = makeInvalidEarlyAccess("_FPDFClipPath_GetPathSegment");
    Module2["_FPDF_CreateClipPath"] = makeInvalidEarlyAccess("_FPDF_CreateClipPath");
    Module2["_FPDF_DestroyClipPath"] = makeInvalidEarlyAccess("_FPDF_DestroyClipPath");
    Module2["_FPDFPage_InsertClipPath"] = makeInvalidEarlyAccess("_FPDFPage_InsertClipPath");
    Module2["_FPDF_InitLibrary"] = makeInvalidEarlyAccess("_FPDF_InitLibrary");
    Module2["_malloc"] = makeInvalidEarlyAccess("_malloc");
    Module2["_free"] = makeInvalidEarlyAccess("_free");
    Module2["_FPDF_DestroyLibrary"] = makeInvalidEarlyAccess("_FPDF_DestroyLibrary");
    Module2["_FPDF_SetSandBoxPolicy"] = makeInvalidEarlyAccess("_FPDF_SetSandBoxPolicy");
    Module2["_FPDF_LoadDocument"] = makeInvalidEarlyAccess("_FPDF_LoadDocument");
    Module2["_FPDF_GetFormType"] = makeInvalidEarlyAccess("_FPDF_GetFormType");
    Module2["_FPDF_LoadXFA"] = makeInvalidEarlyAccess("_FPDF_LoadXFA");
    Module2["_FPDF_LoadMemDocument"] = makeInvalidEarlyAccess("_FPDF_LoadMemDocument");
    Module2["_FPDF_LoadMemDocument64"] = makeInvalidEarlyAccess("_FPDF_LoadMemDocument64");
    Module2["_FPDF_LoadCustomDocument"] = makeInvalidEarlyAccess("_FPDF_LoadCustomDocument");
    Module2["_FPDF_GetFileVersion"] = makeInvalidEarlyAccess("_FPDF_GetFileVersion");
    Module2["_FPDF_DocumentHasValidCrossReferenceTable"] = makeInvalidEarlyAccess("_FPDF_DocumentHasValidCrossReferenceTable");
    Module2["_FPDF_GetDocPermissions"] = makeInvalidEarlyAccess("_FPDF_GetDocPermissions");
    Module2["_FPDF_GetDocUserPermissions"] = makeInvalidEarlyAccess("_FPDF_GetDocUserPermissions");
    Module2["_FPDF_GetSecurityHandlerRevision"] = makeInvalidEarlyAccess(
      "_FPDF_GetSecurityHandlerRevision"
    );
    Module2["_FPDF_GetPageCount"] = makeInvalidEarlyAccess("_FPDF_GetPageCount");
    Module2["_FPDF_LoadPage"] = makeInvalidEarlyAccess("_FPDF_LoadPage");
    Module2["_FPDF_GetPageWidthF"] = makeInvalidEarlyAccess("_FPDF_GetPageWidthF");
    Module2["_FPDF_GetPageWidth"] = makeInvalidEarlyAccess("_FPDF_GetPageWidth");
    Module2["_FPDF_GetPageHeightF"] = makeInvalidEarlyAccess("_FPDF_GetPageHeightF");
    Module2["_FPDF_GetPageHeight"] = makeInvalidEarlyAccess("_FPDF_GetPageHeight");
    Module2["_FPDF_GetPageBoundingBox"] = makeInvalidEarlyAccess("_FPDF_GetPageBoundingBox");
    Module2["_FPDF_RenderPageBitmap"] = makeInvalidEarlyAccess("_FPDF_RenderPageBitmap");
    Module2["_FPDF_RenderPageBitmapWithMatrix"] = makeInvalidEarlyAccess(
      "_FPDF_RenderPageBitmapWithMatrix"
    );
    Module2["_FPDF_ClosePage"] = makeInvalidEarlyAccess("_FPDF_ClosePage");
    Module2["_FPDF_CloseDocument"] = makeInvalidEarlyAccess("_FPDF_CloseDocument");
    Module2["_FPDF_GetLastError"] = makeInvalidEarlyAccess("_FPDF_GetLastError");
    Module2["_FPDF_DeviceToPage"] = makeInvalidEarlyAccess("_FPDF_DeviceToPage");
    Module2["_FPDF_PageToDevice"] = makeInvalidEarlyAccess("_FPDF_PageToDevice");
    Module2["_FPDFBitmap_Create"] = makeInvalidEarlyAccess("_FPDFBitmap_Create");
    Module2["_FPDFBitmap_CreateEx"] = makeInvalidEarlyAccess("_FPDFBitmap_CreateEx");
    Module2["_FPDFBitmap_GetFormat"] = makeInvalidEarlyAccess("_FPDFBitmap_GetFormat");
    Module2["_FPDFBitmap_FillRect"] = makeInvalidEarlyAccess("_FPDFBitmap_FillRect");
    Module2["_FPDFBitmap_GetBuffer"] = makeInvalidEarlyAccess("_FPDFBitmap_GetBuffer");
    Module2["_FPDFBitmap_GetWidth"] = makeInvalidEarlyAccess("_FPDFBitmap_GetWidth");
    Module2["_FPDFBitmap_GetHeight"] = makeInvalidEarlyAccess("_FPDFBitmap_GetHeight");
    Module2["_FPDFBitmap_GetStride"] = makeInvalidEarlyAccess("_FPDFBitmap_GetStride");
    Module2["_FPDFBitmap_Destroy"] = makeInvalidEarlyAccess("_FPDFBitmap_Destroy");
    Module2["_FPDF_GetPageSizeByIndexF"] = makeInvalidEarlyAccess("_FPDF_GetPageSizeByIndexF");
    Module2["_FPDF_GetPageSizeByIndex"] = makeInvalidEarlyAccess("_FPDF_GetPageSizeByIndex");
    Module2["_FPDF_VIEWERREF_GetPrintScaling"] = makeInvalidEarlyAccess(
      "_FPDF_VIEWERREF_GetPrintScaling"
    );
    Module2["_FPDF_VIEWERREF_GetNumCopies"] = makeInvalidEarlyAccess("_FPDF_VIEWERREF_GetNumCopies");
    Module2["_FPDF_VIEWERREF_GetPrintPageRange"] = makeInvalidEarlyAccess(
      "_FPDF_VIEWERREF_GetPrintPageRange"
    );
    Module2["_FPDF_VIEWERREF_GetPrintPageRangeCount"] = makeInvalidEarlyAccess("_FPDF_VIEWERREF_GetPrintPageRangeCount");
    Module2["_FPDF_VIEWERREF_GetPrintPageRangeElement"] = makeInvalidEarlyAccess("_FPDF_VIEWERREF_GetPrintPageRangeElement");
    Module2["_FPDF_VIEWERREF_GetDuplex"] = makeInvalidEarlyAccess("_FPDF_VIEWERREF_GetDuplex");
    Module2["_FPDF_VIEWERREF_GetName"] = makeInvalidEarlyAccess("_FPDF_VIEWERREF_GetName");
    Module2["_FPDF_CountNamedDests"] = makeInvalidEarlyAccess("_FPDF_CountNamedDests");
    Module2["_FPDF_GetNamedDestByName"] = makeInvalidEarlyAccess("_FPDF_GetNamedDestByName");
    Module2["_FPDF_GetNamedDest"] = makeInvalidEarlyAccess("_FPDF_GetNamedDest");
    Module2["_FPDF_GetXFAPacketCount"] = makeInvalidEarlyAccess("_FPDF_GetXFAPacketCount");
    Module2["_FPDF_GetXFAPacketName"] = makeInvalidEarlyAccess("_FPDF_GetXFAPacketName");
    Module2["_FPDF_GetXFAPacketContent"] = makeInvalidEarlyAccess("_FPDF_GetXFAPacketContent");
    Module2["_FPDF_GetTrailerEnds"] = makeInvalidEarlyAccess("_FPDF_GetTrailerEnds");
    var _fflush = makeInvalidEarlyAccess("_fflush");
    var _emscripten_stack_get_end = makeInvalidEarlyAccess("_emscripten_stack_get_end");
    var _emscripten_builtin_memalign = makeInvalidEarlyAccess("_emscripten_builtin_memalign");
    var _strerror = makeInvalidEarlyAccess("_strerror");
    var _setThrew = makeInvalidEarlyAccess("_setThrew");
    var _emscripten_stack_init = makeInvalidEarlyAccess("_emscripten_stack_init");
    var __emscripten_stack_restore = makeInvalidEarlyAccess("__emscripten_stack_restore");
    var __emscripten_stack_alloc = makeInvalidEarlyAccess("__emscripten_stack_alloc");
    var _emscripten_stack_get_current = makeInvalidEarlyAccess("_emscripten_stack_get_current");
    function assignWasmExports(wasmExports2) {
      Module2["_PDFium_Init"] = createExportWrapper("PDFium_Init", 0);
      Module2["_FPDF_InitLibraryWithConfig"] = createExportWrapper(
        "FPDF_InitLibraryWithConfig",
        1
      );
      Module2["_FPDFAnnot_IsSupportedSubtype"] = createExportWrapper(
        "FPDFAnnot_IsSupportedSubtype",
        1
      );
      Module2["_FPDFPage_CreateAnnot"] = createExportWrapper("FPDFPage_CreateAnnot", 2);
      Module2["_FPDFPage_GetAnnotCount"] = createExportWrapper("FPDFPage_GetAnnotCount", 1);
      Module2["_FPDFPage_GetAnnot"] = createExportWrapper("FPDFPage_GetAnnot", 2);
      Module2["_FPDFPage_GetAnnotIndex"] = createExportWrapper("FPDFPage_GetAnnotIndex", 2);
      Module2["_FPDFPage_CloseAnnot"] = createExportWrapper("FPDFPage_CloseAnnot", 1);
      Module2["_FPDFPage_RemoveAnnot"] = createExportWrapper("FPDFPage_RemoveAnnot", 2);
      Module2["_FPDFAnnot_GetSubtype"] = createExportWrapper("FPDFAnnot_GetSubtype", 1);
      Module2["_FPDFAnnot_IsObjectSupportedSubtype"] = createExportWrapper(
        "FPDFAnnot_IsObjectSupportedSubtype",
        1
      );
      Module2["_FPDFAnnot_UpdateObject"] = createExportWrapper("FPDFAnnot_UpdateObject", 2);
      Module2["_FPDFAnnot_AddInkStroke"] = createExportWrapper("FPDFAnnot_AddInkStroke", 3);
      Module2["_FPDFAnnot_RemoveInkList"] = createExportWrapper("FPDFAnnot_RemoveInkList", 1);
      Module2["_FPDFAnnot_AppendObject"] = createExportWrapper("FPDFAnnot_AppendObject", 2);
      Module2["_FPDFAnnot_GetObjectCount"] = createExportWrapper(
        "FPDFAnnot_GetObjectCount",
        1
      );
      Module2["_FPDFAnnot_GetObject"] = createExportWrapper("FPDFAnnot_GetObject", 2);
      Module2["_FPDFAnnot_RemoveObject"] = createExportWrapper("FPDFAnnot_RemoveObject", 2);
      Module2["_FPDFAnnot_SetColor"] = createExportWrapper("FPDFAnnot_SetColor", 6);
      Module2["_FPDFAnnot_GetColor"] = createExportWrapper("FPDFAnnot_GetColor", 6);
      Module2["_FPDFAnnot_HasAttachmentPoints"] = createExportWrapper(
        "FPDFAnnot_HasAttachmentPoints",
        1
      );
      Module2["_FPDFAnnot_SetAttachmentPoints"] = createExportWrapper(
        "FPDFAnnot_SetAttachmentPoints",
        3
      );
      Module2["_FPDFAnnot_AppendAttachmentPoints"] = createExportWrapper(
        "FPDFAnnot_AppendAttachmentPoints",
        2
      );
      Module2["_FPDFAnnot_CountAttachmentPoints"] = createExportWrapper(
        "FPDFAnnot_CountAttachmentPoints",
        1
      );
      Module2["_FPDFAnnot_GetAttachmentPoints"] = createExportWrapper(
        "FPDFAnnot_GetAttachmentPoints",
        3
      );
      Module2["_FPDFAnnot_SetRect"] = createExportWrapper("FPDFAnnot_SetRect", 2);
      Module2["_FPDFAnnot_GetRect"] = createExportWrapper("FPDFAnnot_GetRect", 2);
      Module2["_FPDFAnnot_GetVertices"] = createExportWrapper("FPDFAnnot_GetVertices", 3);
      Module2["_FPDFAnnot_GetInkListCount"] = createExportWrapper(
        "FPDFAnnot_GetInkListCount",
        1
      );
      Module2["_FPDFAnnot_GetInkListPath"] = createExportWrapper(
        "FPDFAnnot_GetInkListPath",
        4
      );
      Module2["_FPDFAnnot_GetLine"] = createExportWrapper("FPDFAnnot_GetLine", 3);
      Module2["_FPDFAnnot_SetBorder"] = createExportWrapper("FPDFAnnot_SetBorder", 4);
      Module2["_FPDFAnnot_GetBorder"] = createExportWrapper("FPDFAnnot_GetBorder", 4);
      Module2["_FPDFAnnot_HasKey"] = createExportWrapper("FPDFAnnot_HasKey", 2);
      Module2["_FPDFAnnot_GetValueType"] = createExportWrapper("FPDFAnnot_GetValueType", 2);
      Module2["_FPDFAnnot_SetStringValue"] = createExportWrapper(
        "FPDFAnnot_SetStringValue",
        3
      );
      Module2["_FPDFAnnot_GetStringValue"] = createExportWrapper(
        "FPDFAnnot_GetStringValue",
        4
      );
      Module2["_FPDFAnnot_GetNumberValue"] = createExportWrapper(
        "FPDFAnnot_GetNumberValue",
        3
      );
      Module2["_FPDFAnnot_SetAP"] = createExportWrapper("FPDFAnnot_SetAP", 3);
      Module2["_FPDFAnnot_GetAP"] = createExportWrapper("FPDFAnnot_GetAP", 4);
      Module2["_FPDFAnnot_GetLinkedAnnot"] = createExportWrapper(
        "FPDFAnnot_GetLinkedAnnot",
        2
      );
      Module2["_FPDFAnnot_GetFlags"] = createExportWrapper("FPDFAnnot_GetFlags", 1);
      Module2["_FPDFAnnot_SetFlags"] = createExportWrapper("FPDFAnnot_SetFlags", 2);
      Module2["_FPDFAnnot_GetFormFieldFlags"] = createExportWrapper(
        "FPDFAnnot_GetFormFieldFlags",
        2
      );
      Module2["_FPDFAnnot_SetFormFieldFlags"] = createExportWrapper(
        "FPDFAnnot_SetFormFieldFlags",
        3
      );
      Module2["_FPDFAnnot_GetFormFieldAtPoint"] = createExportWrapper(
        "FPDFAnnot_GetFormFieldAtPoint",
        3
      );
      Module2["_FPDFAnnot_GetFormFieldName"] = createExportWrapper(
        "FPDFAnnot_GetFormFieldName",
        4
      );
      Module2["_FPDFAnnot_GetFormFieldType"] = createExportWrapper(
        "FPDFAnnot_GetFormFieldType",
        2
      );
      Module2["_FPDFAnnot_GetFormAdditionalActionJavaScript"] = createExportWrapper("FPDFAnnot_GetFormAdditionalActionJavaScript", 5);
      Module2["_FPDFAnnot_GetFormFieldAlternateName"] = createExportWrapper(
        "FPDFAnnot_GetFormFieldAlternateName",
        4
      );
      Module2["_FPDFAnnot_GetFormFieldValue"] = createExportWrapper(
        "FPDFAnnot_GetFormFieldValue",
        4
      );
      Module2["_FPDFAnnot_GetOptionCount"] = createExportWrapper(
        "FPDFAnnot_GetOptionCount",
        2
      );
      Module2["_FPDFAnnot_GetOptionLabel"] = createExportWrapper(
        "FPDFAnnot_GetOptionLabel",
        5
      );
      Module2["_FPDFAnnot_IsOptionSelected"] = createExportWrapper(
        "FPDFAnnot_IsOptionSelected",
        3
      );
      Module2["_FPDFAnnot_GetFontSize"] = createExportWrapper("FPDFAnnot_GetFontSize", 3);
      Module2["_FPDFAnnot_SetFontColor"] = createExportWrapper("FPDFAnnot_SetFontColor", 5);
      Module2["_FPDFAnnot_GetFontColor"] = createExportWrapper("FPDFAnnot_GetFontColor", 5);
      Module2["_FPDFAnnot_IsChecked"] = createExportWrapper("FPDFAnnot_IsChecked", 2);
      Module2["_FPDFAnnot_SetFocusableSubtypes"] = createExportWrapper(
        "FPDFAnnot_SetFocusableSubtypes",
        3
      );
      Module2["_FPDFAnnot_GetFocusableSubtypesCount"] = createExportWrapper(
        "FPDFAnnot_GetFocusableSubtypesCount",
        1
      );
      Module2["_FPDFAnnot_GetFocusableSubtypes"] = createExportWrapper(
        "FPDFAnnot_GetFocusableSubtypes",
        3
      );
      Module2["_FPDFAnnot_GetLink"] = createExportWrapper("FPDFAnnot_GetLink", 1);
      Module2["_FPDFAnnot_GetFormControlCount"] = createExportWrapper(
        "FPDFAnnot_GetFormControlCount",
        2
      );
      Module2["_FPDFAnnot_GetFormControlIndex"] = createExportWrapper(
        "FPDFAnnot_GetFormControlIndex",
        2
      );
      Module2["_FPDFAnnot_GetFormFieldExportValue"] = createExportWrapper(
        "FPDFAnnot_GetFormFieldExportValue",
        4
      );
      Module2["_FPDFAnnot_SetURI"] = createExportWrapper("FPDFAnnot_SetURI", 2);
      Module2["_FPDFAnnot_GetFileAttachment"] = createExportWrapper(
        "FPDFAnnot_GetFileAttachment",
        1
      );
      Module2["_FPDFAnnot_AddFileAttachment"] = createExportWrapper(
        "FPDFAnnot_AddFileAttachment",
        2
      );
      Module2["_FPDFDoc_GetAttachmentCount"] = createExportWrapper(
        "FPDFDoc_GetAttachmentCount",
        1
      );
      Module2["_FPDFDoc_AddAttachment"] = createExportWrapper("FPDFDoc_AddAttachment", 2);
      Module2["_FPDFDoc_GetAttachment"] = createExportWrapper("FPDFDoc_GetAttachment", 2);
      Module2["_FPDFDoc_DeleteAttachment"] = createExportWrapper(
        "FPDFDoc_DeleteAttachment",
        2
      );
      Module2["_FPDFAttachment_GetName"] = createExportWrapper("FPDFAttachment_GetName", 3);
      Module2["_FPDFAttachment_HasKey"] = createExportWrapper("FPDFAttachment_HasKey", 2);
      Module2["_FPDFAttachment_GetValueType"] = createExportWrapper(
        "FPDFAttachment_GetValueType",
        2
      );
      Module2["_FPDFAttachment_SetStringValue"] = createExportWrapper(
        "FPDFAttachment_SetStringValue",
        3
      );
      Module2["_FPDFAttachment_GetStringValue"] = createExportWrapper(
        "FPDFAttachment_GetStringValue",
        4
      );
      Module2["_FPDFAttachment_SetFile"] = createExportWrapper("FPDFAttachment_SetFile", 4);
      Module2["_FPDFAttachment_GetFile"] = createExportWrapper("FPDFAttachment_GetFile", 4);
      Module2["_FPDFAttachment_GetSubtype"] = createExportWrapper(
        "FPDFAttachment_GetSubtype",
        3
      );
      Module2["_FPDFCatalog_IsTagged"] = createExportWrapper("FPDFCatalog_IsTagged", 1);
      Module2["_FPDFCatalog_SetLanguage"] = createExportWrapper("FPDFCatalog_SetLanguage", 2);
      Module2["_FPDFAvail_Create"] = createExportWrapper("FPDFAvail_Create", 2);
      Module2["_FPDFAvail_Destroy"] = createExportWrapper("FPDFAvail_Destroy", 1);
      Module2["_FPDFAvail_IsDocAvail"] = createExportWrapper("FPDFAvail_IsDocAvail", 2);
      Module2["_FPDFAvail_GetDocument"] = createExportWrapper("FPDFAvail_GetDocument", 2);
      Module2["_FPDFAvail_GetFirstPageNum"] = createExportWrapper(
        "FPDFAvail_GetFirstPageNum",
        1
      );
      Module2["_FPDFAvail_IsPageAvail"] = createExportWrapper("FPDFAvail_IsPageAvail", 3);
      Module2["_FPDFAvail_IsFormAvail"] = createExportWrapper("FPDFAvail_IsFormAvail", 2);
      Module2["_FPDFAvail_IsLinearized"] = createExportWrapper("FPDFAvail_IsLinearized", 1);
      Module2["_FPDFBookmark_GetFirstChild"] = createExportWrapper(
        "FPDFBookmark_GetFirstChild",
        2
      );
      Module2["_FPDFBookmark_GetNextSibling"] = createExportWrapper(
        "FPDFBookmark_GetNextSibling",
        2
      );
      Module2["_FPDFBookmark_GetTitle"] = createExportWrapper("FPDFBookmark_GetTitle", 3);
      Module2["_FPDFBookmark_GetCount"] = createExportWrapper("FPDFBookmark_GetCount", 1);
      Module2["_FPDFBookmark_Find"] = createExportWrapper("FPDFBookmark_Find", 2);
      Module2["_FPDFBookmark_GetDest"] = createExportWrapper("FPDFBookmark_GetDest", 2);
      Module2["_FPDFBookmark_GetAction"] = createExportWrapper("FPDFBookmark_GetAction", 1);
      Module2["_FPDFAction_GetType"] = createExportWrapper("FPDFAction_GetType", 1);
      Module2["_FPDFAction_GetDest"] = createExportWrapper("FPDFAction_GetDest", 2);
      Module2["_FPDFAction_GetFilePath"] = createExportWrapper("FPDFAction_GetFilePath", 3);
      Module2["_FPDFAction_GetURIPath"] = createExportWrapper("FPDFAction_GetURIPath", 4);
      Module2["_FPDFDest_GetDestPageIndex"] = createExportWrapper(
        "FPDFDest_GetDestPageIndex",
        2
      );
      Module2["_FPDFDest_GetView"] = createExportWrapper("FPDFDest_GetView", 3);
      Module2["_FPDFDest_GetLocationInPage"] = createExportWrapper(
        "FPDFDest_GetLocationInPage",
        7
      );
      Module2["_FPDFLink_GetLinkAtPoint"] = createExportWrapper("FPDFLink_GetLinkAtPoint", 3);
      Module2["_FPDFLink_GetLinkZOrderAtPoint"] = createExportWrapper(
        "FPDFLink_GetLinkZOrderAtPoint",
        3
      );
      Module2["_FPDFLink_GetDest"] = createExportWrapper("FPDFLink_GetDest", 2);
      Module2["_FPDFLink_GetAction"] = createExportWrapper("FPDFLink_GetAction", 1);
      Module2["_FPDFLink_Enumerate"] = createExportWrapper("FPDFLink_Enumerate", 3);
      Module2["_FPDFLink_GetAnnot"] = createExportWrapper("FPDFLink_GetAnnot", 2);
      Module2["_FPDFLink_GetAnnotRect"] = createExportWrapper("FPDFLink_GetAnnotRect", 2);
      Module2["_FPDFLink_CountQuadPoints"] = createExportWrapper(
        "FPDFLink_CountQuadPoints",
        1
      );
      Module2["_FPDFLink_GetQuadPoints"] = createExportWrapper("FPDFLink_GetQuadPoints", 3);
      Module2["_FPDF_GetPageAAction"] = createExportWrapper("FPDF_GetPageAAction", 2);
      Module2["_FPDF_GetFileIdentifier"] = createExportWrapper("FPDF_GetFileIdentifier", 4);
      Module2["_FPDF_GetMetaText"] = createExportWrapper("FPDF_GetMetaText", 4);
      Module2["_FPDF_GetPageLabel"] = createExportWrapper("FPDF_GetPageLabel", 4);
      Module2["_FPDFPageObj_NewImageObj"] = createExportWrapper("FPDFPageObj_NewImageObj", 1);
      Module2["_FPDFImageObj_LoadJpegFile"] = createExportWrapper(
        "FPDFImageObj_LoadJpegFile",
        4
      );
      Module2["_FPDFImageObj_LoadJpegFileInline"] = createExportWrapper(
        "FPDFImageObj_LoadJpegFileInline",
        4
      );
      Module2["_FPDFImageObj_SetMatrix"] = createExportWrapper("FPDFImageObj_SetMatrix", 7);
      Module2["_FPDFImageObj_SetBitmap"] = createExportWrapper("FPDFImageObj_SetBitmap", 4);
      Module2["_FPDFImageObj_GetBitmap"] = createExportWrapper("FPDFImageObj_GetBitmap", 1);
      Module2["_FPDFImageObj_GetRenderedBitmap"] = createExportWrapper(
        "FPDFImageObj_GetRenderedBitmap",
        3
      );
      Module2["_FPDFImageObj_GetImageDataDecoded"] = createExportWrapper(
        "FPDFImageObj_GetImageDataDecoded",
        3
      );
      Module2["_FPDFImageObj_GetImageDataRaw"] = createExportWrapper(
        "FPDFImageObj_GetImageDataRaw",
        3
      );
      Module2["_FPDFImageObj_GetImageFilterCount"] = createExportWrapper(
        "FPDFImageObj_GetImageFilterCount",
        1
      );
      Module2["_FPDFImageObj_GetImageFilter"] = createExportWrapper(
        "FPDFImageObj_GetImageFilter",
        4
      );
      Module2["_FPDFImageObj_GetImageMetadata"] = createExportWrapper(
        "FPDFImageObj_GetImageMetadata",
        3
      );
      Module2["_FPDFImageObj_GetImagePixelSize"] = createExportWrapper(
        "FPDFImageObj_GetImagePixelSize",
        3
      );
      Module2["_FPDFImageObj_GetIccProfileDataDecoded"] = createExportWrapper(
        "FPDFImageObj_GetIccProfileDataDecoded",
        5
      );
      Module2["_FPDF_CreateNewDocument"] = createExportWrapper("FPDF_CreateNewDocument", 0);
      Module2["_FPDFPage_Delete"] = createExportWrapper("FPDFPage_Delete", 2);
      Module2["_FPDF_MovePages"] = createExportWrapper("FPDF_MovePages", 4);
      Module2["_FPDFPage_New"] = createExportWrapper("FPDFPage_New", 4);
      Module2["_FPDFPage_GetRotation"] = createExportWrapper("FPDFPage_GetRotation", 1);
      Module2["_FPDFPage_InsertObject"] = createExportWrapper("FPDFPage_InsertObject", 2);
      Module2["_FPDFPage_InsertObjectAtIndex"] = createExportWrapper(
        "FPDFPage_InsertObjectAtIndex",
        3
      );
      Module2["_FPDFPage_RemoveObject"] = createExportWrapper("FPDFPage_RemoveObject", 2);
      Module2["_FPDFPage_CountObjects"] = createExportWrapper("FPDFPage_CountObjects", 1);
      Module2["_FPDFPage_GetObject"] = createExportWrapper("FPDFPage_GetObject", 2);
      Module2["_FPDFPage_HasTransparency"] = createExportWrapper(
        "FPDFPage_HasTransparency",
        1
      );
      Module2["_FPDFPageObj_Destroy"] = createExportWrapper("FPDFPageObj_Destroy", 1);
      Module2["_FPDFPageObj_GetMarkedContentID"] = createExportWrapper(
        "FPDFPageObj_GetMarkedContentID",
        1
      );
      Module2["_FPDFPageObj_CountMarks"] = createExportWrapper("FPDFPageObj_CountMarks", 1);
      Module2["_FPDFPageObj_GetMark"] = createExportWrapper("FPDFPageObj_GetMark", 2);
      Module2["_FPDFPageObj_AddMark"] = createExportWrapper("FPDFPageObj_AddMark", 2);
      Module2["_FPDFPageObj_RemoveMark"] = createExportWrapper("FPDFPageObj_RemoveMark", 2);
      Module2["_FPDFPageObjMark_GetName"] = createExportWrapper("FPDFPageObjMark_GetName", 4);
      Module2["_FPDFPageObjMark_CountParams"] = createExportWrapper(
        "FPDFPageObjMark_CountParams",
        1
      );
      Module2["_FPDFPageObjMark_GetParamKey"] = createExportWrapper(
        "FPDFPageObjMark_GetParamKey",
        5
      );
      Module2["_FPDFPageObjMark_GetParamValueType"] = createExportWrapper(
        "FPDFPageObjMark_GetParamValueType",
        2
      );
      Module2["_FPDFPageObjMark_GetParamIntValue"] = createExportWrapper(
        "FPDFPageObjMark_GetParamIntValue",
        3
      );
      Module2["_FPDFPageObjMark_GetParamStringValue"] = createExportWrapper(
        "FPDFPageObjMark_GetParamStringValue",
        5
      );
      Module2["_FPDFPageObjMark_GetParamBlobValue"] = createExportWrapper(
        "FPDFPageObjMark_GetParamBlobValue",
        5
      );
      Module2["_FPDFPageObj_HasTransparency"] = createExportWrapper(
        "FPDFPageObj_HasTransparency",
        1
      );
      Module2["_FPDFPageObjMark_SetIntParam"] = createExportWrapper(
        "FPDFPageObjMark_SetIntParam",
        5
      );
      Module2["_FPDFPageObjMark_SetStringParam"] = createExportWrapper(
        "FPDFPageObjMark_SetStringParam",
        5
      );
      Module2["_FPDFPageObjMark_SetBlobParam"] = createExportWrapper(
        "FPDFPageObjMark_SetBlobParam",
        6
      );
      Module2["_FPDFPageObjMark_RemoveParam"] = createExportWrapper(
        "FPDFPageObjMark_RemoveParam",
        3
      );
      Module2["_FPDFPageObj_GetType"] = createExportWrapper("FPDFPageObj_GetType", 1);
      Module2["_FPDFPageObj_GetIsActive"] = createExportWrapper("FPDFPageObj_GetIsActive", 2);
      Module2["_FPDFPageObj_SetIsActive"] = createExportWrapper("FPDFPageObj_SetIsActive", 2);
      Module2["_FPDFPage_GenerateContent"] = createExportWrapper(
        "FPDFPage_GenerateContent",
        1
      );
      Module2["_FPDFPageObj_Transform"] = createExportWrapper("FPDFPageObj_Transform", 7);
      Module2["_FPDFPageObj_TransformF"] = createExportWrapper("FPDFPageObj_TransformF", 2);
      Module2["_FPDFPageObj_GetMatrix"] = createExportWrapper("FPDFPageObj_GetMatrix", 2);
      Module2["_FPDFPageObj_SetMatrix"] = createExportWrapper("FPDFPageObj_SetMatrix", 2);
      Module2["_FPDFPageObj_SetBlendMode"] = createExportWrapper(
        "FPDFPageObj_SetBlendMode",
        2
      );
      Module2["_FPDFPage_TransformAnnots"] = createExportWrapper(
        "FPDFPage_TransformAnnots",
        7
      );
      Module2["_FPDFPage_SetRotation"] = createExportWrapper("FPDFPage_SetRotation", 2);
      Module2["_FPDFPageObj_SetFillColor"] = createExportWrapper(
        "FPDFPageObj_SetFillColor",
        5
      );
      Module2["_FPDFPageObj_GetFillColor"] = createExportWrapper(
        "FPDFPageObj_GetFillColor",
        5
      );
      Module2["_FPDFPageObj_GetBounds"] = createExportWrapper("FPDFPageObj_GetBounds", 5);
      Module2["_FPDFPageObj_GetRotatedBounds"] = createExportWrapper(
        "FPDFPageObj_GetRotatedBounds",
        2
      );
      Module2["_FPDFPageObj_SetStrokeColor"] = createExportWrapper(
        "FPDFPageObj_SetStrokeColor",
        5
      );
      Module2["_FPDFPageObj_GetStrokeColor"] = createExportWrapper(
        "FPDFPageObj_GetStrokeColor",
        5
      );
      Module2["_FPDFPageObj_SetStrokeWidth"] = createExportWrapper(
        "FPDFPageObj_SetStrokeWidth",
        2
      );
      Module2["_FPDFPageObj_GetStrokeWidth"] = createExportWrapper(
        "FPDFPageObj_GetStrokeWidth",
        2
      );
      Module2["_FPDFPageObj_GetLineJoin"] = createExportWrapper("FPDFPageObj_GetLineJoin", 1);
      Module2["_FPDFPageObj_SetLineJoin"] = createExportWrapper("FPDFPageObj_SetLineJoin", 2);
      Module2["_FPDFPageObj_GetLineCap"] = createExportWrapper("FPDFPageObj_GetLineCap", 1);
      Module2["_FPDFPageObj_SetLineCap"] = createExportWrapper("FPDFPageObj_SetLineCap", 2);
      Module2["_FPDFPageObj_GetDashPhase"] = createExportWrapper(
        "FPDFPageObj_GetDashPhase",
        2
      );
      Module2["_FPDFPageObj_SetDashPhase"] = createExportWrapper(
        "FPDFPageObj_SetDashPhase",
        2
      );
      Module2["_FPDFPageObj_GetDashCount"] = createExportWrapper(
        "FPDFPageObj_GetDashCount",
        1
      );
      Module2["_FPDFPageObj_GetDashArray"] = createExportWrapper(
        "FPDFPageObj_GetDashArray",
        3
      );
      Module2["_FPDFPageObj_SetDashArray"] = createExportWrapper(
        "FPDFPageObj_SetDashArray",
        4
      );
      Module2["_FPDFFormObj_CountObjects"] = createExportWrapper(
        "FPDFFormObj_CountObjects",
        1
      );
      Module2["_FPDFFormObj_GetObject"] = createExportWrapper("FPDFFormObj_GetObject", 2);
      Module2["_FPDFFormObj_RemoveObject"] = createExportWrapper(
        "FPDFFormObj_RemoveObject",
        2
      );
      Module2["_FPDFPageObj_CreateNewPath"] = createExportWrapper(
        "FPDFPageObj_CreateNewPath",
        2
      );
      Module2["_FPDFPageObj_CreateNewRect"] = createExportWrapper(
        "FPDFPageObj_CreateNewRect",
        4
      );
      Module2["_FPDFPath_CountSegments"] = createExportWrapper("FPDFPath_CountSegments", 1);
      Module2["_FPDFPath_GetPathSegment"] = createExportWrapper("FPDFPath_GetPathSegment", 2);
      Module2["_FPDFPath_MoveTo"] = createExportWrapper("FPDFPath_MoveTo", 3);
      Module2["_FPDFPath_LineTo"] = createExportWrapper("FPDFPath_LineTo", 3);
      Module2["_FPDFPath_BezierTo"] = createExportWrapper("FPDFPath_BezierTo", 7);
      Module2["_FPDFPath_Close"] = createExportWrapper("FPDFPath_Close", 1);
      Module2["_FPDFPath_SetDrawMode"] = createExportWrapper("FPDFPath_SetDrawMode", 3);
      Module2["_FPDFPath_GetDrawMode"] = createExportWrapper("FPDFPath_GetDrawMode", 3);
      Module2["_FPDFPathSegment_GetPoint"] = createExportWrapper(
        "FPDFPathSegment_GetPoint",
        3
      );
      Module2["_FPDFPathSegment_GetType"] = createExportWrapper("FPDFPathSegment_GetType", 1);
      Module2["_FPDFPathSegment_GetClose"] = createExportWrapper(
        "FPDFPathSegment_GetClose",
        1
      );
      Module2["_FPDFPageObj_NewTextObj"] = createExportWrapper("FPDFPageObj_NewTextObj", 3);
      Module2["_FPDFText_SetText"] = createExportWrapper("FPDFText_SetText", 2);
      Module2["_FPDFText_SetCharcodes"] = createExportWrapper("FPDFText_SetCharcodes", 3);
      Module2["_FPDFText_LoadFont"] = createExportWrapper("FPDFText_LoadFont", 5);
      Module2["_FPDFText_LoadStandardFont"] = createExportWrapper(
        "FPDFText_LoadStandardFont",
        2
      );
      Module2["_FPDFText_LoadCidType2Font"] = createExportWrapper(
        "FPDFText_LoadCidType2Font",
        6
      );
      Module2["_FPDFTextObj_GetFontSize"] = createExportWrapper("FPDFTextObj_GetFontSize", 2);
      Module2["_FPDFTextObj_GetText"] = createExportWrapper("FPDFTextObj_GetText", 4);
      Module2["_FPDFTextObj_GetRenderedBitmap"] = createExportWrapper(
        "FPDFTextObj_GetRenderedBitmap",
        4
      );
      Module2["_FPDFFont_Close"] = createExportWrapper("FPDFFont_Close", 1);
      Module2["_FPDFPageObj_CreateTextObj"] = createExportWrapper(
        "FPDFPageObj_CreateTextObj",
        3
      );
      Module2["_FPDFTextObj_GetTextRenderMode"] = createExportWrapper(
        "FPDFTextObj_GetTextRenderMode",
        1
      );
      Module2["_FPDFTextObj_SetTextRenderMode"] = createExportWrapper(
        "FPDFTextObj_SetTextRenderMode",
        2
      );
      Module2["_FPDFTextObj_GetFont"] = createExportWrapper("FPDFTextObj_GetFont", 1);
      Module2["_FPDFFont_GetBaseFontName"] = createExportWrapper(
        "FPDFFont_GetBaseFontName",
        3
      );
      Module2["_FPDFFont_GetFamilyName"] = createExportWrapper("FPDFFont_GetFamilyName", 3);
      Module2["_FPDFFont_GetFontData"] = createExportWrapper("FPDFFont_GetFontData", 4);
      Module2["_FPDFFont_GetIsEmbedded"] = createExportWrapper("FPDFFont_GetIsEmbedded", 1);
      Module2["_FPDFFont_GetFlags"] = createExportWrapper("FPDFFont_GetFlags", 1);
      Module2["_FPDFFont_GetWeight"] = createExportWrapper("FPDFFont_GetWeight", 1);
      Module2["_FPDFFont_GetItalicAngle"] = createExportWrapper("FPDFFont_GetItalicAngle", 2);
      Module2["_FPDFFont_GetAscent"] = createExportWrapper("FPDFFont_GetAscent", 3);
      Module2["_FPDFFont_GetDescent"] = createExportWrapper("FPDFFont_GetDescent", 3);
      Module2["_FPDFFont_GetGlyphWidth"] = createExportWrapper("FPDFFont_GetGlyphWidth", 4);
      Module2["_FPDFFont_GetGlyphPath"] = createExportWrapper("FPDFFont_GetGlyphPath", 3);
      Module2["_FPDFGlyphPath_CountGlyphSegments"] = createExportWrapper(
        "FPDFGlyphPath_CountGlyphSegments",
        1
      );
      Module2["_FPDFGlyphPath_GetGlyphPathSegment"] = createExportWrapper(
        "FPDFGlyphPath_GetGlyphPathSegment",
        2
      );
      Module2["_FSDK_SetUnSpObjProcessHandler"] = createExportWrapper(
        "FSDK_SetUnSpObjProcessHandler",
        1
      );
      Module2["_FSDK_SetTimeFunction"] = createExportWrapper("FSDK_SetTimeFunction", 1);
      Module2["_FSDK_SetLocaltimeFunction"] = createExportWrapper(
        "FSDK_SetLocaltimeFunction",
        1
      );
      Module2["_FPDFDoc_GetPageMode"] = createExportWrapper("FPDFDoc_GetPageMode", 1);
      Module2["_FPDFPage_Flatten"] = createExportWrapper("FPDFPage_Flatten", 2);
      Module2["_FPDFPage_HasFormFieldAtPoint"] = createExportWrapper(
        "FPDFPage_HasFormFieldAtPoint",
        4
      );
      Module2["_FPDFPage_FormFieldZOrderAtPoint"] = createExportWrapper(
        "FPDFPage_FormFieldZOrderAtPoint",
        4
      );
      Module2["_FPDFDOC_InitFormFillEnvironment"] = createExportWrapper(
        "FPDFDOC_InitFormFillEnvironment",
        2
      );
      Module2["_FPDFDOC_ExitFormFillEnvironment"] = createExportWrapper(
        "FPDFDOC_ExitFormFillEnvironment",
        1
      );
      Module2["_FORM_OnMouseMove"] = createExportWrapper("FORM_OnMouseMove", 5);
      Module2["_FORM_OnMouseWheel"] = createExportWrapper("FORM_OnMouseWheel", 6);
      Module2["_FORM_OnFocus"] = createExportWrapper("FORM_OnFocus", 5);
      Module2["_FORM_OnLButtonDown"] = createExportWrapper("FORM_OnLButtonDown", 5);
      Module2["_FORM_OnLButtonUp"] = createExportWrapper("FORM_OnLButtonUp", 5);
      Module2["_FORM_OnLButtonDoubleClick"] = createExportWrapper(
        "FORM_OnLButtonDoubleClick",
        5
      );
      Module2["_FORM_OnRButtonDown"] = createExportWrapper("FORM_OnRButtonDown", 5);
      Module2["_FORM_OnRButtonUp"] = createExportWrapper("FORM_OnRButtonUp", 5);
      Module2["_FORM_OnKeyDown"] = createExportWrapper("FORM_OnKeyDown", 4);
      Module2["_FORM_OnKeyUp"] = createExportWrapper("FORM_OnKeyUp", 4);
      Module2["_FORM_OnChar"] = createExportWrapper("FORM_OnChar", 4);
      Module2["_FORM_GetFocusedText"] = createExportWrapper("FORM_GetFocusedText", 4);
      Module2["_FORM_GetSelectedText"] = createExportWrapper("FORM_GetSelectedText", 4);
      Module2["_FORM_ReplaceAndKeepSelection"] = createExportWrapper(
        "FORM_ReplaceAndKeepSelection",
        3
      );
      Module2["_FORM_ReplaceSelection"] = createExportWrapper("FORM_ReplaceSelection", 3);
      Module2["_FORM_SelectAllText"] = createExportWrapper("FORM_SelectAllText", 2);
      Module2["_FORM_CanUndo"] = createExportWrapper("FORM_CanUndo", 2);
      Module2["_FORM_CanRedo"] = createExportWrapper("FORM_CanRedo", 2);
      Module2["_FORM_Undo"] = createExportWrapper("FORM_Undo", 2);
      Module2["_FORM_Redo"] = createExportWrapper("FORM_Redo", 2);
      Module2["_FORM_ForceToKillFocus"] = createExportWrapper("FORM_ForceToKillFocus", 1);
      Module2["_FORM_GetFocusedAnnot"] = createExportWrapper("FORM_GetFocusedAnnot", 3);
      Module2["_FORM_SetFocusedAnnot"] = createExportWrapper("FORM_SetFocusedAnnot", 2);
      Module2["_FPDF_FFLDraw"] = createExportWrapper("FPDF_FFLDraw", 9);
      Module2["_FPDF_SetFormFieldHighlightColor"] = createExportWrapper(
        "FPDF_SetFormFieldHighlightColor",
        3
      );
      Module2["_FPDF_SetFormFieldHighlightAlpha"] = createExportWrapper(
        "FPDF_SetFormFieldHighlightAlpha",
        2
      );
      Module2["_FPDF_RemoveFormFieldHighlight"] = createExportWrapper(
        "FPDF_RemoveFormFieldHighlight",
        1
      );
      Module2["_FORM_OnAfterLoadPage"] = createExportWrapper("FORM_OnAfterLoadPage", 2);
      Module2["_FORM_OnBeforeClosePage"] = createExportWrapper("FORM_OnBeforeClosePage", 2);
      Module2["_FORM_DoDocumentJSAction"] = createExportWrapper("FORM_DoDocumentJSAction", 1);
      Module2["_FORM_DoDocumentOpenAction"] = createExportWrapper(
        "FORM_DoDocumentOpenAction",
        1
      );
      Module2["_FORM_DoDocumentAAction"] = createExportWrapper("FORM_DoDocumentAAction", 2);
      Module2["_FORM_DoPageAAction"] = createExportWrapper("FORM_DoPageAAction", 3);
      Module2["_FORM_SetIndexSelected"] = createExportWrapper("FORM_SetIndexSelected", 4);
      Module2["_FORM_IsIndexSelected"] = createExportWrapper("FORM_IsIndexSelected", 3);
      Module2["_FPDFDoc_GetJavaScriptActionCount"] = createExportWrapper(
        "FPDFDoc_GetJavaScriptActionCount",
        1
      );
      Module2["_FPDFDoc_GetJavaScriptAction"] = createExportWrapper(
        "FPDFDoc_GetJavaScriptAction",
        2
      );
      Module2["_FPDFDoc_CloseJavaScriptAction"] = createExportWrapper(
        "FPDFDoc_CloseJavaScriptAction",
        1
      );
      Module2["_FPDFJavaScriptAction_GetName"] = createExportWrapper(
        "FPDFJavaScriptAction_GetName",
        3
      );
      Module2["_FPDFJavaScriptAction_GetScript"] = createExportWrapper(
        "FPDFJavaScriptAction_GetScript",
        3
      );
      Module2["_FPDF_ImportPagesByIndex"] = createExportWrapper("FPDF_ImportPagesByIndex", 5);
      Module2["_FPDF_ImportPages"] = createExportWrapper("FPDF_ImportPages", 4);
      Module2["_FPDF_ImportNPagesToOne"] = createExportWrapper("FPDF_ImportNPagesToOne", 5);
      Module2["_FPDF_NewXObjectFromPage"] = createExportWrapper("FPDF_NewXObjectFromPage", 3);
      Module2["_FPDF_CloseXObject"] = createExportWrapper("FPDF_CloseXObject", 1);
      Module2["_FPDF_NewFormObjectFromXObject"] = createExportWrapper(
        "FPDF_NewFormObjectFromXObject",
        1
      );
      Module2["_FPDF_CopyViewerPreferences"] = createExportWrapper(
        "FPDF_CopyViewerPreferences",
        2
      );
      Module2["_FPDF_RenderPageBitmapWithColorScheme_Start"] = createExportWrapper("FPDF_RenderPageBitmapWithColorScheme_Start", 10);
      Module2["_FPDF_RenderPageBitmap_Start"] = createExportWrapper(
        "FPDF_RenderPageBitmap_Start",
        9
      );
      Module2["_FPDF_RenderPage_Continue"] = createExportWrapper(
        "FPDF_RenderPage_Continue",
        2
      );
      Module2["_FPDF_RenderPage_Close"] = createExportWrapper("FPDF_RenderPage_Close", 1);
      Module2["_FPDF_SaveAsCopy"] = createExportWrapper("FPDF_SaveAsCopy", 3);
      Module2["_FPDF_SaveWithVersion"] = createExportWrapper("FPDF_SaveWithVersion", 4);
      Module2["_FPDFText_GetCharIndexFromTextIndex"] = createExportWrapper(
        "FPDFText_GetCharIndexFromTextIndex",
        2
      );
      Module2["_FPDFText_GetTextIndexFromCharIndex"] = createExportWrapper(
        "FPDFText_GetTextIndexFromCharIndex",
        2
      );
      Module2["_FPDF_GetSignatureCount"] = createExportWrapper("FPDF_GetSignatureCount", 1);
      Module2["_FPDF_GetSignatureObject"] = createExportWrapper("FPDF_GetSignatureObject", 2);
      Module2["_FPDFSignatureObj_GetContents"] = createExportWrapper(
        "FPDFSignatureObj_GetContents",
        3
      );
      Module2["_FPDFSignatureObj_GetByteRange"] = createExportWrapper(
        "FPDFSignatureObj_GetByteRange",
        3
      );
      Module2["_FPDFSignatureObj_GetSubFilter"] = createExportWrapper(
        "FPDFSignatureObj_GetSubFilter",
        3
      );
      Module2["_FPDFSignatureObj_GetReason"] = createExportWrapper(
        "FPDFSignatureObj_GetReason",
        3
      );
      Module2["_FPDFSignatureObj_GetTime"] = createExportWrapper(
        "FPDFSignatureObj_GetTime",
        3
      );
      Module2["_FPDFSignatureObj_GetDocMDPPermission"] = createExportWrapper(
        "FPDFSignatureObj_GetDocMDPPermission",
        1
      );
      Module2["_FPDF_StructTree_GetForPage"] = createExportWrapper(
        "FPDF_StructTree_GetForPage",
        1
      );
      Module2["_FPDF_StructTree_Close"] = createExportWrapper("FPDF_StructTree_Close", 1);
      Module2["_FPDF_StructTree_CountChildren"] = createExportWrapper(
        "FPDF_StructTree_CountChildren",
        1
      );
      Module2["_FPDF_StructTree_GetChildAtIndex"] = createExportWrapper(
        "FPDF_StructTree_GetChildAtIndex",
        2
      );
      Module2["_FPDF_StructElement_GetAltText"] = createExportWrapper(
        "FPDF_StructElement_GetAltText",
        3
      );
      Module2["_FPDF_StructElement_GetActualText"] = createExportWrapper(
        "FPDF_StructElement_GetActualText",
        3
      );
      Module2["_FPDF_StructElement_GetID"] = createExportWrapper(
        "FPDF_StructElement_GetID",
        3
      );
      Module2["_FPDF_StructElement_GetLang"] = createExportWrapper(
        "FPDF_StructElement_GetLang",
        3
      );
      Module2["_FPDF_StructElement_GetAttributeCount"] = createExportWrapper(
        "FPDF_StructElement_GetAttributeCount",
        1
      );
      Module2["_FPDF_StructElement_GetAttributeAtIndex"] = createExportWrapper(
        "FPDF_StructElement_GetAttributeAtIndex",
        2
      );
      Module2["_FPDF_StructElement_GetStringAttribute"] = createExportWrapper(
        "FPDF_StructElement_GetStringAttribute",
        4
      );
      Module2["_FPDF_StructElement_GetMarkedContentID"] = createExportWrapper(
        "FPDF_StructElement_GetMarkedContentID",
        1
      );
      Module2["_FPDF_StructElement_GetType"] = createExportWrapper(
        "FPDF_StructElement_GetType",
        3
      );
      Module2["_FPDF_StructElement_GetObjType"] = createExportWrapper(
        "FPDF_StructElement_GetObjType",
        3
      );
      Module2["_FPDF_StructElement_GetTitle"] = createExportWrapper(
        "FPDF_StructElement_GetTitle",
        3
      );
      Module2["_FPDF_StructElement_CountChildren"] = createExportWrapper(
        "FPDF_StructElement_CountChildren",
        1
      );
      Module2["_FPDF_StructElement_GetChildAtIndex"] = createExportWrapper(
        "FPDF_StructElement_GetChildAtIndex",
        2
      );
      Module2["_FPDF_StructElement_GetChildMarkedContentID"] = createExportWrapper("FPDF_StructElement_GetChildMarkedContentID", 2);
      Module2["_FPDF_StructElement_GetParent"] = createExportWrapper(
        "FPDF_StructElement_GetParent",
        1
      );
      Module2["_FPDF_StructElement_Attr_GetCount"] = createExportWrapper(
        "FPDF_StructElement_Attr_GetCount",
        1
      );
      Module2["_FPDF_StructElement_Attr_GetName"] = createExportWrapper(
        "FPDF_StructElement_Attr_GetName",
        5
      );
      Module2["_FPDF_StructElement_Attr_GetValue"] = createExportWrapper(
        "FPDF_StructElement_Attr_GetValue",
        2
      );
      Module2["_FPDF_StructElement_Attr_GetType"] = createExportWrapper(
        "FPDF_StructElement_Attr_GetType",
        1
      );
      Module2["_FPDF_StructElement_Attr_GetBooleanValue"] = createExportWrapper("FPDF_StructElement_Attr_GetBooleanValue", 2);
      Module2["_FPDF_StructElement_Attr_GetNumberValue"] = createExportWrapper(
        "FPDF_StructElement_Attr_GetNumberValue",
        2
      );
      Module2["_FPDF_StructElement_Attr_GetStringValue"] = createExportWrapper(
        "FPDF_StructElement_Attr_GetStringValue",
        4
      );
      Module2["_FPDF_StructElement_Attr_GetBlobValue"] = createExportWrapper(
        "FPDF_StructElement_Attr_GetBlobValue",
        4
      );
      Module2["_FPDF_StructElement_Attr_CountChildren"] = createExportWrapper(
        "FPDF_StructElement_Attr_CountChildren",
        1
      );
      Module2["_FPDF_StructElement_Attr_GetChildAtIndex"] = createExportWrapper("FPDF_StructElement_Attr_GetChildAtIndex", 2);
      Module2["_FPDF_StructElement_GetMarkedContentIdCount"] = createExportWrapper("FPDF_StructElement_GetMarkedContentIdCount", 1);
      Module2["_FPDF_StructElement_GetMarkedContentIdAtIndex"] = createExportWrapper("FPDF_StructElement_GetMarkedContentIdAtIndex", 2);
      Module2["_FPDF_AddInstalledFont"] = createExportWrapper("FPDF_AddInstalledFont", 3);
      Module2["_FPDF_SetSystemFontInfo"] = createExportWrapper("FPDF_SetSystemFontInfo", 1);
      Module2["_FPDF_GetDefaultTTFMap"] = createExportWrapper("FPDF_GetDefaultTTFMap", 0);
      Module2["_FPDF_GetDefaultTTFMapCount"] = createExportWrapper(
        "FPDF_GetDefaultTTFMapCount",
        0
      );
      Module2["_FPDF_GetDefaultTTFMapEntry"] = createExportWrapper(
        "FPDF_GetDefaultTTFMapEntry",
        1
      );
      Module2["_FPDF_GetDefaultSystemFontInfo"] = createExportWrapper(
        "FPDF_GetDefaultSystemFontInfo",
        0
      );
      Module2["_FPDF_FreeDefaultSystemFontInfo"] = createExportWrapper(
        "FPDF_FreeDefaultSystemFontInfo",
        1
      );
      Module2["_FPDFText_LoadPage"] = createExportWrapper("FPDFText_LoadPage", 1);
      Module2["_FPDFText_ClosePage"] = createExportWrapper("FPDFText_ClosePage", 1);
      Module2["_FPDFText_CountChars"] = createExportWrapper("FPDFText_CountChars", 1);
      Module2["_FPDFText_GetUnicode"] = createExportWrapper("FPDFText_GetUnicode", 2);
      Module2["_FPDFText_GetTextObject"] = createExportWrapper("FPDFText_GetTextObject", 2);
      Module2["_FPDFText_IsGenerated"] = createExportWrapper("FPDFText_IsGenerated", 2);
      Module2["_FPDFText_IsHyphen"] = createExportWrapper("FPDFText_IsHyphen", 2);
      Module2["_FPDFText_HasUnicodeMapError"] = createExportWrapper(
        "FPDFText_HasUnicodeMapError",
        2
      );
      Module2["_FPDFText_GetFontSize"] = createExportWrapper("FPDFText_GetFontSize", 2);
      Module2["_FPDFText_GetFontInfo"] = createExportWrapper("FPDFText_GetFontInfo", 5);
      Module2["_FPDFText_GetFontWeight"] = createExportWrapper("FPDFText_GetFontWeight", 2);
      Module2["_FPDFText_GetFillColor"] = createExportWrapper("FPDFText_GetFillColor", 6);
      Module2["_FPDFText_GetStrokeColor"] = createExportWrapper("FPDFText_GetStrokeColor", 6);
      Module2["_FPDFText_GetCharAngle"] = createExportWrapper("FPDFText_GetCharAngle", 2);
      Module2["_FPDFText_GetCharBox"] = createExportWrapper("FPDFText_GetCharBox", 6);
      Module2["_FPDFText_GetLooseCharBox"] = createExportWrapper(
        "FPDFText_GetLooseCharBox",
        3
      );
      Module2["_FPDFText_GetMatrix"] = createExportWrapper("FPDFText_GetMatrix", 3);
      Module2["_FPDFText_GetCharOrigin"] = createExportWrapper("FPDFText_GetCharOrigin", 4);
      Module2["_FPDFText_GetCharIndexAtPos"] = createExportWrapper(
        "FPDFText_GetCharIndexAtPos",
        5
      );
      Module2["_FPDFText_GetText"] = createExportWrapper("FPDFText_GetText", 4);
      Module2["_FPDFText_CountRects"] = createExportWrapper("FPDFText_CountRects", 3);
      Module2["_FPDFText_GetRect"] = createExportWrapper("FPDFText_GetRect", 6);
      Module2["_FPDFText_GetBoundedText"] = createExportWrapper("FPDFText_GetBoundedText", 7);
      Module2["_FPDFText_FindStart"] = createExportWrapper("FPDFText_FindStart", 4);
      Module2["_FPDFText_FindNext"] = createExportWrapper("FPDFText_FindNext", 1);
      Module2["_FPDFText_FindPrev"] = createExportWrapper("FPDFText_FindPrev", 1);
      Module2["_FPDFText_GetSchResultIndex"] = createExportWrapper(
        "FPDFText_GetSchResultIndex",
        1
      );
      Module2["_FPDFText_GetSchCount"] = createExportWrapper("FPDFText_GetSchCount", 1);
      Module2["_FPDFText_FindClose"] = createExportWrapper("FPDFText_FindClose", 1);
      Module2["_FPDFLink_LoadWebLinks"] = createExportWrapper("FPDFLink_LoadWebLinks", 1);
      Module2["_FPDFLink_CountWebLinks"] = createExportWrapper("FPDFLink_CountWebLinks", 1);
      Module2["_FPDFLink_GetURL"] = createExportWrapper("FPDFLink_GetURL", 4);
      Module2["_FPDFLink_CountRects"] = createExportWrapper("FPDFLink_CountRects", 2);
      Module2["_FPDFLink_GetRect"] = createExportWrapper("FPDFLink_GetRect", 7);
      Module2["_FPDFLink_GetTextRange"] = createExportWrapper("FPDFLink_GetTextRange", 4);
      Module2["_FPDFLink_CloseWebLinks"] = createExportWrapper("FPDFLink_CloseWebLinks", 1);
      Module2["_FPDFPage_GetDecodedThumbnailData"] = createExportWrapper(
        "FPDFPage_GetDecodedThumbnailData",
        3
      );
      Module2["_FPDFPage_GetRawThumbnailData"] = createExportWrapper(
        "FPDFPage_GetRawThumbnailData",
        3
      );
      Module2["_FPDFPage_GetThumbnailAsBitmap"] = createExportWrapper(
        "FPDFPage_GetThumbnailAsBitmap",
        1
      );
      Module2["_FPDFPage_SetMediaBox"] = createExportWrapper("FPDFPage_SetMediaBox", 5);
      Module2["_FPDFPage_SetCropBox"] = createExportWrapper("FPDFPage_SetCropBox", 5);
      Module2["_FPDFPage_SetBleedBox"] = createExportWrapper("FPDFPage_SetBleedBox", 5);
      Module2["_FPDFPage_SetTrimBox"] = createExportWrapper("FPDFPage_SetTrimBox", 5);
      Module2["_FPDFPage_SetArtBox"] = createExportWrapper("FPDFPage_SetArtBox", 5);
      Module2["_FPDFPage_GetMediaBox"] = createExportWrapper("FPDFPage_GetMediaBox", 5);
      Module2["_FPDFPage_GetCropBox"] = createExportWrapper("FPDFPage_GetCropBox", 5);
      Module2["_FPDFPage_GetBleedBox"] = createExportWrapper("FPDFPage_GetBleedBox", 5);
      Module2["_FPDFPage_GetTrimBox"] = createExportWrapper("FPDFPage_GetTrimBox", 5);
      Module2["_FPDFPage_GetArtBox"] = createExportWrapper("FPDFPage_GetArtBox", 5);
      Module2["_FPDFPage_TransFormWithClip"] = createExportWrapper(
        "FPDFPage_TransFormWithClip",
        3
      );
      Module2["_FPDFPageObj_TransformClipPath"] = createExportWrapper(
        "FPDFPageObj_TransformClipPath",
        7
      );
      Module2["_FPDFPageObj_GetClipPath"] = createExportWrapper("FPDFPageObj_GetClipPath", 1);
      Module2["_FPDFClipPath_CountPaths"] = createExportWrapper("FPDFClipPath_CountPaths", 1);
      Module2["_FPDFClipPath_CountPathSegments"] = createExportWrapper(
        "FPDFClipPath_CountPathSegments",
        2
      );
      Module2["_FPDFClipPath_GetPathSegment"] = createExportWrapper(
        "FPDFClipPath_GetPathSegment",
        3
      );
      Module2["_FPDF_CreateClipPath"] = createExportWrapper("FPDF_CreateClipPath", 4);
      Module2["_FPDF_DestroyClipPath"] = createExportWrapper("FPDF_DestroyClipPath", 1);
      Module2["_FPDFPage_InsertClipPath"] = createExportWrapper("FPDFPage_InsertClipPath", 2);
      Module2["_FPDF_InitLibrary"] = createExportWrapper("FPDF_InitLibrary", 0);
      Module2["_malloc"] = createExportWrapper("malloc", 1);
      Module2["_free"] = createExportWrapper("free", 1);
      Module2["_FPDF_DestroyLibrary"] = createExportWrapper("FPDF_DestroyLibrary", 0);
      Module2["_FPDF_SetSandBoxPolicy"] = createExportWrapper("FPDF_SetSandBoxPolicy", 2);
      Module2["_FPDF_LoadDocument"] = createExportWrapper("FPDF_LoadDocument", 2);
      Module2["_FPDF_GetFormType"] = createExportWrapper("FPDF_GetFormType", 1);
      Module2["_FPDF_LoadXFA"] = createExportWrapper("FPDF_LoadXFA", 1);
      Module2["_FPDF_LoadMemDocument"] = createExportWrapper("FPDF_LoadMemDocument", 3);
      Module2["_FPDF_LoadMemDocument64"] = createExportWrapper("FPDF_LoadMemDocument64", 3);
      Module2["_FPDF_LoadCustomDocument"] = createExportWrapper("FPDF_LoadCustomDocument", 2);
      Module2["_FPDF_GetFileVersion"] = createExportWrapper("FPDF_GetFileVersion", 2);
      Module2["_FPDF_DocumentHasValidCrossReferenceTable"] = createExportWrapper("FPDF_DocumentHasValidCrossReferenceTable", 1);
      Module2["_FPDF_GetDocPermissions"] = createExportWrapper("FPDF_GetDocPermissions", 1);
      Module2["_FPDF_GetDocUserPermissions"] = createExportWrapper(
        "FPDF_GetDocUserPermissions",
        1
      );
      Module2["_FPDF_GetSecurityHandlerRevision"] = createExportWrapper(
        "FPDF_GetSecurityHandlerRevision",
        1
      );
      Module2["_FPDF_GetPageCount"] = createExportWrapper("FPDF_GetPageCount", 1);
      Module2["_FPDF_LoadPage"] = createExportWrapper("FPDF_LoadPage", 2);
      Module2["_FPDF_GetPageWidthF"] = createExportWrapper("FPDF_GetPageWidthF", 1);
      Module2["_FPDF_GetPageWidth"] = createExportWrapper("FPDF_GetPageWidth", 1);
      Module2["_FPDF_GetPageHeightF"] = createExportWrapper("FPDF_GetPageHeightF", 1);
      Module2["_FPDF_GetPageHeight"] = createExportWrapper("FPDF_GetPageHeight", 1);
      Module2["_FPDF_GetPageBoundingBox"] = createExportWrapper("FPDF_GetPageBoundingBox", 2);
      Module2["_FPDF_RenderPageBitmap"] = createExportWrapper("FPDF_RenderPageBitmap", 8);
      Module2["_FPDF_RenderPageBitmapWithMatrix"] = createExportWrapper(
        "FPDF_RenderPageBitmapWithMatrix",
        5
      );
      Module2["_FPDF_ClosePage"] = createExportWrapper("FPDF_ClosePage", 1);
      Module2["_FPDF_CloseDocument"] = createExportWrapper("FPDF_CloseDocument", 1);
      Module2["_FPDF_GetLastError"] = createExportWrapper("FPDF_GetLastError", 0);
      Module2["_FPDF_DeviceToPage"] = createExportWrapper("FPDF_DeviceToPage", 10);
      Module2["_FPDF_PageToDevice"] = createExportWrapper("FPDF_PageToDevice", 10);
      Module2["_FPDFBitmap_Create"] = createExportWrapper("FPDFBitmap_Create", 3);
      Module2["_FPDFBitmap_CreateEx"] = createExportWrapper("FPDFBitmap_CreateEx", 5);
      Module2["_FPDFBitmap_GetFormat"] = createExportWrapper("FPDFBitmap_GetFormat", 1);
      Module2["_FPDFBitmap_FillRect"] = createExportWrapper("FPDFBitmap_FillRect", 6);
      Module2["_FPDFBitmap_GetBuffer"] = createExportWrapper("FPDFBitmap_GetBuffer", 1);
      Module2["_FPDFBitmap_GetWidth"] = createExportWrapper("FPDFBitmap_GetWidth", 1);
      Module2["_FPDFBitmap_GetHeight"] = createExportWrapper("FPDFBitmap_GetHeight", 1);
      Module2["_FPDFBitmap_GetStride"] = createExportWrapper("FPDFBitmap_GetStride", 1);
      Module2["_FPDFBitmap_Destroy"] = createExportWrapper("FPDFBitmap_Destroy", 1);
      Module2["_FPDF_GetPageSizeByIndexF"] = createExportWrapper(
        "FPDF_GetPageSizeByIndexF",
        3
      );
      Module2["_FPDF_GetPageSizeByIndex"] = createExportWrapper("FPDF_GetPageSizeByIndex", 4);
      Module2["_FPDF_VIEWERREF_GetPrintScaling"] = createExportWrapper(
        "FPDF_VIEWERREF_GetPrintScaling",
        1
      );
      Module2["_FPDF_VIEWERREF_GetNumCopies"] = createExportWrapper(
        "FPDF_VIEWERREF_GetNumCopies",
        1
      );
      Module2["_FPDF_VIEWERREF_GetPrintPageRange"] = createExportWrapper(
        "FPDF_VIEWERREF_GetPrintPageRange",
        1
      );
      Module2["_FPDF_VIEWERREF_GetPrintPageRangeCount"] = createExportWrapper(
        "FPDF_VIEWERREF_GetPrintPageRangeCount",
        1
      );
      Module2["_FPDF_VIEWERREF_GetPrintPageRangeElement"] = createExportWrapper("FPDF_VIEWERREF_GetPrintPageRangeElement", 2);
      Module2["_FPDF_VIEWERREF_GetDuplex"] = createExportWrapper(
        "FPDF_VIEWERREF_GetDuplex",
        1
      );
      Module2["_FPDF_VIEWERREF_GetName"] = createExportWrapper("FPDF_VIEWERREF_GetName", 4);
      Module2["_FPDF_CountNamedDests"] = createExportWrapper("FPDF_CountNamedDests", 1);
      Module2["_FPDF_GetNamedDestByName"] = createExportWrapper("FPDF_GetNamedDestByName", 2);
      Module2["_FPDF_GetNamedDest"] = createExportWrapper("FPDF_GetNamedDest", 4);
      Module2["_FPDF_GetXFAPacketCount"] = createExportWrapper("FPDF_GetXFAPacketCount", 1);
      Module2["_FPDF_GetXFAPacketName"] = createExportWrapper("FPDF_GetXFAPacketName", 4);
      Module2["_FPDF_GetXFAPacketContent"] = createExportWrapper(
        "FPDF_GetXFAPacketContent",
        5
      );
      Module2["_FPDF_GetTrailerEnds"] = createExportWrapper("FPDF_GetTrailerEnds", 3);
      _fflush = createExportWrapper("fflush", 1);
      _emscripten_stack_get_end = wasmExports2["emscripten_stack_get_end"];
      wasmExports2["emscripten_stack_get_base"];
      _emscripten_builtin_memalign = createExportWrapper("emscripten_builtin_memalign", 2);
      _strerror = createExportWrapper("strerror", 1);
      _setThrew = createExportWrapper("setThrew", 2);
      _emscripten_stack_init = wasmExports2["emscripten_stack_init"];
      wasmExports2["emscripten_stack_get_free"];
      __emscripten_stack_restore = wasmExports2["_emscripten_stack_restore"];
      __emscripten_stack_alloc = wasmExports2["_emscripten_stack_alloc"];
      _emscripten_stack_get_current = wasmExports2["emscripten_stack_get_current"];
    }
    var wasmImports = {
      __syscall_fcntl64: ___syscall_fcntl64,
      __syscall_fstat64: ___syscall_fstat64,
      __syscall_ftruncate64: ___syscall_ftruncate64,
      __syscall_getdents64: ___syscall_getdents64,
      __syscall_ioctl: ___syscall_ioctl,
      __syscall_lstat64: ___syscall_lstat64,
      __syscall_newfstatat: ___syscall_newfstatat,
      __syscall_openat: ___syscall_openat,
      __syscall_rmdir: ___syscall_rmdir,
      __syscall_stat64: ___syscall_stat64,
      __syscall_unlinkat: ___syscall_unlinkat,
      _abort_js: __abort_js,
      _emscripten_throw_longjmp: __emscripten_throw_longjmp,
      _gmtime_js: __gmtime_js,
      _localtime_js: __localtime_js,
      _tzset_js: __tzset_js,
      emscripten_date_now: _emscripten_date_now,
      emscripten_resize_heap: _emscripten_resize_heap,
      environ_get: _environ_get,
      environ_sizes_get: _environ_sizes_get,
      fd_close: _fd_close,
      fd_read: _fd_read,
      fd_seek: _fd_seek,
      fd_sync: _fd_sync,
      fd_write: _fd_write,
      invoke_ii,
      invoke_iii,
      invoke_iiii,
      invoke_iiiii,
      invoke_v,
      invoke_viii,
      invoke_viiii
    };
    var wasmExports = await createWasm();
    function invoke_viii(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_ii(index, a1) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iii(index, a1, a2) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iiii(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viiii(index, a1, a2, a3, a4) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiii(index, a1, a2, a3, a4) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_v(index) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)();
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    var calledRun;
    function stackCheckInit() {
      _emscripten_stack_init();
      writeStackCookie();
    }
    function run() {
      if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return;
      }
      stackCheckInit();
      preRun();
      if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return;
      }
      function doRun() {
        assert(!calledRun);
        calledRun = true;
        Module2["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        readyPromiseResolve?.(Module2);
        Module2["onRuntimeInitialized"]?.();
        consumedModuleProp("onRuntimeInitialized");
        assert(
          !Module2["_main"],
          'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]'
        );
        postRun();
      }
      if (Module2["setStatus"]) {
        Module2["setStatus"]("Running...");
        setTimeout(() => {
          setTimeout(() => Module2["setStatus"](""), 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
      checkStackCookie();
    }
    function preInit() {
      if (Module2["preInit"]) {
        if (typeof Module2["preInit"] == "function") Module2["preInit"] = [Module2["preInit"]];
        while (Module2["preInit"].length > 0) {
          Module2["preInit"].shift()();
        }
      }
      consumedModuleProp("preInit");
    }
    preInit();
    run();
    if (runtimeInitialized) {
      moduleRtn = Module2;
    } else {
      moduleRtn = new Promise((resolve2, reject) => {
        readyPromiseResolve = resolve2;
        readyPromiseReject = reject;
      });
    }
    for (const prop of Object.keys(Module2)) {
      if (!(prop in moduleArg)) {
        Object.defineProperty(moduleArg, prop, {
          configurable: true,
          get() {
            abort(
              `Access to module property ('${prop}') is no longer possible via the module constructor argument; Instead, use the result of the module constructor.`
            );
          }
        });
      }
    }
    return moduleRtn;
  };
})();
var PDFiumLibrary2 = class extends PDFiumLibrary$1 {
  static init(options2) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield PDFiumLibrary$1.initBase({
        vendor: PDFiumModule,
        wasmBinary: options2 === null || options2 === void 0 ? void 0 : options2.wasmBinary,
        wasmUrl: options2 === null || options2 === void 0 ? void 0 : options2.wasmUrl,
        instantiateWasm: options2 === null || options2 === void 0 ? void 0 : options2.instantiateWasm
      });
    });
  }
};

// ../../../../node_modules/.pnpm/tesseract-wasm@0.11.0/node_modules/tesseract-wasm/dist/lib.js
function isMessagePort(endpoint) {
  return endpoint.constructor.name === "MessagePort";
}
function closeEndPoint(endpoint) {
  if (isMessagePort(endpoint))
    endpoint.close();
}
function releaseEndpoint(ep) {
  return requestResponseMessage(ep, {
    type: "RELEASE"
  }).then(() => {
    closeEndPoint(ep);
  });
}
var proxyCounter = /* @__PURE__ */ new WeakMap();
var proxyFinalizers = "FinalizationRegistry" in globalThis && new FinalizationRegistry((ep) => {
  const newCount = (proxyCounter.get(ep) || 0) - 1;
  proxyCounter.set(ep, newCount);
  if (newCount === 0) {
    releaseEndpoint(ep);
  }
});
function requestResponseMessage(ep, msg, transfers) {
  return new Promise((resolve2) => {
    const id = generateUUID();
    ep.addEventListener("message", function l(ev) {
      if (!ev.data || !ev.data.id || ev.data.id !== id) {
        return;
      }
      ep.removeEventListener("message", l);
      resolve2(ev.data);
    });
    if (ep.start) {
      ep.start();
    }
    ep.postMessage(Object.assign({ id }, msg), transfers);
  });
}
function generateUUID() {
  return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
}
function imageDataFromBitmap(bitmap) {
  let canvas;
  if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  } else if (typeof HTMLCanvasElement !== "undefined") {
    const canvasEl = document.createElement("canvas");
    canvasEl.width = bitmap.width;
    canvasEl.height = bitmap.height;
    canvas = canvasEl;
  } else {
    throw new Error("No canvas implementation available");
  }
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
  return context.getImageData(0, 0, bitmap.width, bitmap.height);
}
var Module = (() => {
  var _scriptDir = import.meta.url;
  return (function(Module2 = {}) {
    var Module2 = typeof Module2 != "undefined" ? Module2 : {};
    var readyPromiseResolve, readyPromiseReject;
    Module2["ready"] = new Promise(function(resolve2, reject) {
      readyPromiseResolve = resolve2;
      readyPromiseReject = reject;
    });
    var moduleOverrides = Object.assign({}, Module2);
    var thisProgram = "./this.program";
    var ENVIRONMENT_IS_WEB = true;
    var scriptDirectory = "";
    function locateFile(path) {
      if (Module2["locateFile"]) {
        return Module2["locateFile"](path, scriptDirectory);
      }
      return scriptDirectory + path;
    }
    var readBinary;
    {
      if (typeof document != "undefined" && document.currentScript) {
        scriptDirectory = document.currentScript.src;
      }
      if (_scriptDir) {
        scriptDirectory = _scriptDir;
      }
      if (scriptDirectory.indexOf("blob:") !== 0) {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
      } else {
        scriptDirectory = "";
      }
    }
    var out = Module2["print"] || console.log.bind(console);
    var err = Module2["printErr"] || console.warn.bind(console);
    Object.assign(Module2, moduleOverrides);
    moduleOverrides = null;
    if (Module2["arguments"]) Module2["arguments"];
    if (Module2["thisProgram"]) thisProgram = Module2["thisProgram"];
    if (Module2["quit"]) Module2["quit"];
    var wasmBinary;
    if (Module2["wasmBinary"]) wasmBinary = Module2["wasmBinary"];
    Module2["noExitRuntime"] || true;
    if (typeof WebAssembly != "object") {
      abort("no native wasm support detected");
    }
    var wasmMemory;
    var ABORT = false;
    function assert(condition, text) {
      if (!condition) {
        abort(text);
      }
    }
    var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : void 0;
    function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = "";
      while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    }
    function UTF8ToString(ptr, maxBytesToRead) {
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
    }
    function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
      if (!(maxBytesToWrite > 0)) return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
          var u1 = str.charCodeAt(++i);
          u = 65536 + ((u & 1023) << 10) | u1 & 1023;
        }
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | u >> 6;
          heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | u >> 12;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        } else {
          if (outIdx + 3 >= endIdx) break;
          heap[outIdx++] = 240 | u >> 18;
          heap[outIdx++] = 128 | u >> 12 & 63;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    }
    function stringToUTF82(str, outPtr, maxBytesToWrite) {
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    }
    function lengthBytesUTF82(str) {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var c = str.charCodeAt(i);
        if (c <= 127) {
          len++;
        } else if (c <= 2047) {
          len += 2;
        } else if (c >= 55296 && c <= 57343) {
          len += 4;
          ++i;
        } else {
          len += 3;
        }
      }
      return len;
    }
    var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
    function updateMemoryViews() {
      var b = wasmMemory.buffer;
      Module2["HEAP8"] = HEAP8 = new Int8Array(b);
      Module2["HEAP16"] = HEAP16 = new Int16Array(b);
      Module2["HEAP32"] = HEAP32 = new Int32Array(b);
      Module2["HEAPU8"] = HEAPU8 = new Uint8Array(b);
      Module2["HEAPU16"] = HEAPU16 = new Uint16Array(b);
      Module2["HEAPU32"] = HEAPU32 = new Uint32Array(b);
      Module2["HEAPF32"] = HEAPF32 = new Float32Array(b);
      Module2["HEAPF64"] = HEAPF64 = new Float64Array(b);
    }
    var wasmTable;
    var __ATPRERUN__ = [];
    var __ATINIT__ = [];
    var __ATPOSTRUN__ = [];
    function preRun() {
      if (Module2["preRun"]) {
        if (typeof Module2["preRun"] == "function") Module2["preRun"] = [Module2["preRun"]];
        while (Module2["preRun"].length) {
          addOnPreRun(Module2["preRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPRERUN__);
    }
    function initRuntime() {
      callRuntimeCallbacks(__ATINIT__);
    }
    function postRun() {
      if (Module2["postRun"]) {
        if (typeof Module2["postRun"] == "function") Module2["postRun"] = [Module2["postRun"]];
        while (Module2["postRun"].length) {
          addOnPostRun(Module2["postRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPOSTRUN__);
    }
    function addOnPreRun(cb) {
      __ATPRERUN__.unshift(cb);
    }
    function addOnInit(cb) {
      __ATINIT__.unshift(cb);
    }
    function addOnPostRun(cb) {
      __ATPOSTRUN__.unshift(cb);
    }
    var runDependencies = 0;
    var dependenciesFulfilled = null;
    function addRunDependency(id) {
      runDependencies++;
      if (Module2["monitorRunDependencies"]) {
        Module2["monitorRunDependencies"](runDependencies);
      }
    }
    function removeRunDependency(id) {
      runDependencies--;
      if (Module2["monitorRunDependencies"]) {
        Module2["monitorRunDependencies"](runDependencies);
      }
      if (runDependencies == 0) {
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    function abort(what) {
      if (Module2["onAbort"]) {
        Module2["onAbort"](what);
      }
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      what += ". Build with -sASSERTIONS for more info.";
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject(e);
      throw e;
    }
    var dataURIPrefix = "data:application/octet-stream;base64,";
    function isDataURI(filename) {
      return filename.startsWith(dataURIPrefix);
    }
    var wasmBinaryFile;
    if (Module2["locateFile"]) {
      wasmBinaryFile = "tesseract-core.wasm";
      if (!isDataURI(wasmBinaryFile)) {
        wasmBinaryFile = locateFile(wasmBinaryFile);
      }
    } else {
      wasmBinaryFile = new URL("tesseract-core.wasm", import.meta.url).href;
    }
    function getBinary(file) {
      try {
        if (file == wasmBinaryFile && wasmBinary) {
          return new Uint8Array(wasmBinary);
        }
        if (readBinary) ;
        throw "both async and sync fetching of the wasm failed";
      } catch (err2) {
        abort(err2);
      }
    }
    function getBinaryPromise() {
      if (!wasmBinary && ENVIRONMENT_IS_WEB) {
        if (typeof fetch == "function") {
          return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function(response) {
            if (!response["ok"]) {
              throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
            }
            return response["arrayBuffer"]();
          }).catch(function() {
            return getBinary(wasmBinaryFile);
          });
        }
      }
      return Promise.resolve().then(function() {
        return getBinary(wasmBinaryFile);
      });
    }
    function createWasm() {
      var info = { "a": wasmImports };
      function receiveInstance(instance, module) {
        var exports2 = instance.exports;
        Module2["asm"] = exports2;
        wasmMemory = Module2["asm"]["U"];
        updateMemoryViews();
        wasmTable = Module2["asm"]["X"];
        addOnInit(Module2["asm"]["V"]);
        removeRunDependency();
      }
      addRunDependency();
      function receiveInstantiationResult(result) {
        receiveInstance(result["instance"]);
      }
      function instantiateArrayBuffer(receiver) {
        return getBinaryPromise().then(function(binary) {
          return WebAssembly.instantiate(binary, info);
        }).then(function(instance) {
          return instance;
        }).then(receiver, function(reason) {
          err("failed to asynchronously prepare wasm: " + reason);
          abort(reason);
        });
      }
      function instantiateAsync() {
        if (!wasmBinary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(wasmBinaryFile) && typeof fetch == "function") {
          return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function(response) {
            var result = WebAssembly.instantiateStreaming(response, info);
            return result.then(receiveInstantiationResult, function(reason) {
              err("wasm streaming compile failed: " + reason);
              err("falling back to ArrayBuffer instantiation");
              return instantiateArrayBuffer(receiveInstantiationResult);
            });
          });
        } else {
          return instantiateArrayBuffer(receiveInstantiationResult);
        }
      }
      if (Module2["instantiateWasm"]) {
        try {
          var exports = Module2["instantiateWasm"](info, receiveInstance);
          return exports;
        } catch (e) {
          err("Module.instantiateWasm callback failed with error: " + e);
          readyPromiseReject(e);
        }
      }
      instantiateAsync().catch(readyPromiseReject);
      return {};
    }
    function callRuntimeCallbacks(callbacks) {
      while (callbacks.length > 0) {
        callbacks.shift()(Module2);
      }
    }
    function ExceptionInfo(excPtr) {
      this.excPtr = excPtr;
      this.ptr = excPtr - 24;
      this.set_type = function(type) {
        HEAPU32[this.ptr + 4 >> 2] = type;
      };
      this.get_type = function() {
        return HEAPU32[this.ptr + 4 >> 2];
      };
      this.set_destructor = function(destructor) {
        HEAPU32[this.ptr + 8 >> 2] = destructor;
      };
      this.get_destructor = function() {
        return HEAPU32[this.ptr + 8 >> 2];
      };
      this.set_refcount = function(refcount) {
        HEAP32[this.ptr >> 2] = refcount;
      };
      this.set_caught = function(caught) {
        caught = caught ? 1 : 0;
        HEAP8[this.ptr + 12 >> 0] = caught;
      };
      this.get_caught = function() {
        return HEAP8[this.ptr + 12 >> 0] != 0;
      };
      this.set_rethrown = function(rethrown) {
        rethrown = rethrown ? 1 : 0;
        HEAP8[this.ptr + 13 >> 0] = rethrown;
      };
      this.get_rethrown = function() {
        return HEAP8[this.ptr + 13 >> 0] != 0;
      };
      this.init = function(type, destructor) {
        this.set_adjusted_ptr(0);
        this.set_type(type);
        this.set_destructor(destructor);
        this.set_refcount(0);
        this.set_caught(false);
        this.set_rethrown(false);
      };
      this.add_ref = function() {
        var value = HEAP32[this.ptr >> 2];
        HEAP32[this.ptr >> 2] = value + 1;
      };
      this.release_ref = function() {
        var prev = HEAP32[this.ptr >> 2];
        HEAP32[this.ptr >> 2] = prev - 1;
        return prev === 1;
      };
      this.set_adjusted_ptr = function(adjustedPtr) {
        HEAPU32[this.ptr + 16 >> 2] = adjustedPtr;
      };
      this.get_adjusted_ptr = function() {
        return HEAPU32[this.ptr + 16 >> 2];
      };
      this.get_exception_ptr = function() {
        var isPointer = ___cxa_is_pointer_type(this.get_type());
        if (isPointer) {
          return HEAPU32[this.excPtr >> 2];
        }
        var adjusted = this.get_adjusted_ptr();
        if (adjusted !== 0) return adjusted;
        return this.excPtr;
      };
    }
    function ___cxa_throw(ptr, type, destructor) {
      var info = new ExceptionInfo(ptr);
      info.init(type, destructor);
      throw ptr;
    }
    function ___syscall_fcntl64(fd, cmd, varargs) {
      return 0;
    }
    function ___syscall_getcwd(buf, size) {
    }
    function ___syscall_ioctl(fd, op, varargs) {
      return 0;
    }
    function ___syscall_openat(dirfd, path, flags, varargs) {
    }
    function ___syscall_rmdir(path) {
    }
    function ___syscall_unlinkat(dirfd, path, flags) {
    }
    var structRegistrations = {};
    function runDestructors(destructors) {
      while (destructors.length) {
        var ptr = destructors.pop();
        var del = destructors.pop();
        del(ptr);
      }
    }
    function simpleReadValueFromPointer(pointer) {
      return this["fromWireType"](HEAP32[pointer >> 2]);
    }
    var awaitingDependencies = {};
    var registeredTypes = {};
    var typeDependencies = {};
    var char_0 = 48;
    var char_9 = 57;
    function makeLegalFunctionName(name) {
      if (void 0 === name) {
        return "_unknown";
      }
      name = name.replace(/[^a-zA-Z0-9_]/g, "$");
      var f = name.charCodeAt(0);
      if (f >= char_0 && f <= char_9) {
        return "_" + name;
      }
      return name;
    }
    function createNamedFunction(name, body) {
      name = makeLegalFunctionName(name);
      return function() {
        return body.apply(this, arguments);
      };
    }
    function extendError(baseErrorType, errorName) {
      var errorClass = createNamedFunction(errorName, function(message) {
        this.name = errorName;
        this.message = message;
        var stack = new Error(message).stack;
        if (stack !== void 0) {
          this.stack = this.toString() + "\n" + stack.replace(/^Error(:[^\n]*)?\n/, "");
        }
      });
      errorClass.prototype = Object.create(baseErrorType.prototype);
      errorClass.prototype.constructor = errorClass;
      errorClass.prototype.toString = function() {
        if (this.message === void 0) {
          return this.name;
        } else {
          return this.name + ": " + this.message;
        }
      };
      return errorClass;
    }
    var InternalError = void 0;
    function throwInternalError(message) {
      throw new InternalError(message);
    }
    function whenDependentTypesAreResolved(myTypes, dependentTypes, getTypeConverters) {
      myTypes.forEach(function(type) {
        typeDependencies[type] = dependentTypes;
      });
      function onComplete(typeConverters2) {
        var myTypeConverters = getTypeConverters(typeConverters2);
        if (myTypeConverters.length !== myTypes.length) {
          throwInternalError("Mismatched type converter count");
        }
        for (var i = 0; i < myTypes.length; ++i) {
          registerType(myTypes[i], myTypeConverters[i]);
        }
      }
      var typeConverters = new Array(dependentTypes.length);
      var unregisteredTypes = [];
      var registered = 0;
      dependentTypes.forEach((dt, i) => {
        if (registeredTypes.hasOwnProperty(dt)) {
          typeConverters[i] = registeredTypes[dt];
        } else {
          unregisteredTypes.push(dt);
          if (!awaitingDependencies.hasOwnProperty(dt)) {
            awaitingDependencies[dt] = [];
          }
          awaitingDependencies[dt].push(() => {
            typeConverters[i] = registeredTypes[dt];
            ++registered;
            if (registered === unregisteredTypes.length) {
              onComplete(typeConverters);
            }
          });
        }
      });
      if (0 === unregisteredTypes.length) {
        onComplete(typeConverters);
      }
    }
    function __embind_finalize_value_object(structType) {
      var reg = structRegistrations[structType];
      delete structRegistrations[structType];
      var rawConstructor = reg.rawConstructor;
      var rawDestructor = reg.rawDestructor;
      var fieldRecords = reg.fields;
      var fieldTypes = fieldRecords.map((field) => field.getterReturnType).concat(fieldRecords.map((field) => field.setterArgumentType));
      whenDependentTypesAreResolved([structType], fieldTypes, (fieldTypes2) => {
        var fields = {};
        fieldRecords.forEach((field, i) => {
          var fieldName = field.fieldName;
          var getterReturnType = fieldTypes2[i];
          var getter = field.getter;
          var getterContext = field.getterContext;
          var setterArgumentType = fieldTypes2[i + fieldRecords.length];
          var setter = field.setter;
          var setterContext = field.setterContext;
          fields[fieldName] = { read: (ptr) => {
            return getterReturnType["fromWireType"](getter(getterContext, ptr));
          }, write: (ptr, o) => {
            var destructors = [];
            setter(setterContext, ptr, setterArgumentType["toWireType"](destructors, o));
            runDestructors(destructors);
          } };
        });
        return [{ name: reg.name, "fromWireType": function(ptr) {
          var rv = {};
          for (var i in fields) {
            rv[i] = fields[i].read(ptr);
          }
          rawDestructor(ptr);
          return rv;
        }, "toWireType": function(destructors, o) {
          for (var fieldName in fields) {
            if (!(fieldName in o)) {
              throw new TypeError('Missing field:  "' + fieldName + '"');
            }
          }
          var ptr = rawConstructor();
          for (fieldName in fields) {
            fields[fieldName].write(ptr, o[fieldName]);
          }
          if (destructors !== null) {
            destructors.push(rawDestructor, ptr);
          }
          return ptr;
        }, "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: rawDestructor }];
      });
    }
    function __embind_register_bigint(primitiveType, name, size, minRange, maxRange) {
    }
    function getShiftFromSize(size) {
      switch (size) {
        case 1:
          return 0;
        case 2:
          return 1;
        case 4:
          return 2;
        case 8:
          return 3;
        default:
          throw new TypeError("Unknown type size: " + size);
      }
    }
    function embind_init_charCodes() {
      var codes = new Array(256);
      for (var i = 0; i < 256; ++i) {
        codes[i] = String.fromCharCode(i);
      }
      embind_charCodes = codes;
    }
    var embind_charCodes = void 0;
    function readLatin1String(ptr) {
      var ret = "";
      var c = ptr;
      while (HEAPU8[c]) {
        ret += embind_charCodes[HEAPU8[c++]];
      }
      return ret;
    }
    var BindingError = void 0;
    function throwBindingError(message) {
      throw new BindingError(message);
    }
    function registerType(rawType, registeredInstance, options2 = {}) {
      if (!("argPackAdvance" in registeredInstance)) {
        throw new TypeError("registerType registeredInstance requires argPackAdvance");
      }
      var name = registeredInstance.name;
      if (!rawType) {
        throwBindingError('type "' + name + '" must have a positive integer typeid pointer');
      }
      if (registeredTypes.hasOwnProperty(rawType)) {
        if (options2.ignoreDuplicateRegistrations) {
          return;
        } else {
          throwBindingError("Cannot register type '" + name + "' twice");
        }
      }
      registeredTypes[rawType] = registeredInstance;
      delete typeDependencies[rawType];
      if (awaitingDependencies.hasOwnProperty(rawType)) {
        var callbacks = awaitingDependencies[rawType];
        delete awaitingDependencies[rawType];
        callbacks.forEach((cb) => cb());
      }
    }
    function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
      var shift = getShiftFromSize(size);
      name = readLatin1String(name);
      registerType(rawType, { name, "fromWireType": function(wt) {
        return !!wt;
      }, "toWireType": function(destructors, o) {
        return o ? trueValue : falseValue;
      }, "argPackAdvance": 8, "readValueFromPointer": function(pointer) {
        var heap;
        if (size === 1) {
          heap = HEAP8;
        } else if (size === 2) {
          heap = HEAP16;
        } else if (size === 4) {
          heap = HEAP32;
        } else {
          throw new TypeError("Unknown boolean type size: " + name);
        }
        return this["fromWireType"](heap[pointer >> shift]);
      }, destructorFunction: null });
    }
    function ClassHandle_isAliasOf(other) {
      if (!(this instanceof ClassHandle)) {
        return false;
      }
      if (!(other instanceof ClassHandle)) {
        return false;
      }
      var leftClass = this.$$.ptrType.registeredClass;
      var left = this.$$.ptr;
      var rightClass = other.$$.ptrType.registeredClass;
      var right = other.$$.ptr;
      while (leftClass.baseClass) {
        left = leftClass.upcast(left);
        leftClass = leftClass.baseClass;
      }
      while (rightClass.baseClass) {
        right = rightClass.upcast(right);
        rightClass = rightClass.baseClass;
      }
      return leftClass === rightClass && left === right;
    }
    function shallowCopyInternalPointer(o) {
      return { count: o.count, deleteScheduled: o.deleteScheduled, preservePointerOnDelete: o.preservePointerOnDelete, ptr: o.ptr, ptrType: o.ptrType, smartPtr: o.smartPtr, smartPtrType: o.smartPtrType };
    }
    function throwInstanceAlreadyDeleted(obj) {
      function getInstanceTypeName(handle) {
        return handle.$$.ptrType.registeredClass.name;
      }
      throwBindingError(getInstanceTypeName(obj) + " instance already deleted");
    }
    var finalizationRegistry = false;
    function detachFinalizer(handle) {
    }
    function runDestructor($$) {
      if ($$.smartPtr) {
        $$.smartPtrType.rawDestructor($$.smartPtr);
      } else {
        $$.ptrType.registeredClass.rawDestructor($$.ptr);
      }
    }
    function releaseClassHandle($$) {
      $$.count.value -= 1;
      var toDelete = 0 === $$.count.value;
      if (toDelete) {
        runDestructor($$);
      }
    }
    function downcastPointer(ptr, ptrClass, desiredClass) {
      if (ptrClass === desiredClass) {
        return ptr;
      }
      if (void 0 === desiredClass.baseClass) {
        return null;
      }
      var rv = downcastPointer(ptr, ptrClass, desiredClass.baseClass);
      if (rv === null) {
        return null;
      }
      return desiredClass.downcast(rv);
    }
    var registeredPointers = {};
    function getInheritedInstanceCount() {
      return Object.keys(registeredInstances).length;
    }
    function getLiveInheritedInstances() {
      var rv = [];
      for (var k in registeredInstances) {
        if (registeredInstances.hasOwnProperty(k)) {
          rv.push(registeredInstances[k]);
        }
      }
      return rv;
    }
    var deletionQueue = [];
    function flushPendingDeletes() {
      while (deletionQueue.length) {
        var obj = deletionQueue.pop();
        obj.$$.deleteScheduled = false;
        obj["delete"]();
      }
    }
    var delayFunction = void 0;
    function setDelayFunction(fn) {
      delayFunction = fn;
      if (deletionQueue.length && delayFunction) {
        delayFunction(flushPendingDeletes);
      }
    }
    function init_embind() {
      Module2["getInheritedInstanceCount"] = getInheritedInstanceCount;
      Module2["getLiveInheritedInstances"] = getLiveInheritedInstances;
      Module2["flushPendingDeletes"] = flushPendingDeletes;
      Module2["setDelayFunction"] = setDelayFunction;
    }
    var registeredInstances = {};
    function getBasestPointer(class_, ptr) {
      if (ptr === void 0) {
        throwBindingError("ptr should not be undefined");
      }
      while (class_.baseClass) {
        ptr = class_.upcast(ptr);
        class_ = class_.baseClass;
      }
      return ptr;
    }
    function getInheritedInstance(class_, ptr) {
      ptr = getBasestPointer(class_, ptr);
      return registeredInstances[ptr];
    }
    function makeClassHandle(prototype, record) {
      if (!record.ptrType || !record.ptr) {
        throwInternalError("makeClassHandle requires ptr and ptrType");
      }
      var hasSmartPtrType = !!record.smartPtrType;
      var hasSmartPtr = !!record.smartPtr;
      if (hasSmartPtrType !== hasSmartPtr) {
        throwInternalError("Both smartPtrType and smartPtr must be specified");
      }
      record.count = { value: 1 };
      return attachFinalizer(Object.create(prototype, { $$: { value: record } }));
    }
    function RegisteredPointer_fromWireType(ptr) {
      var rawPointer = this.getPointee(ptr);
      if (!rawPointer) {
        this.destructor(ptr);
        return null;
      }
      var registeredInstance = getInheritedInstance(this.registeredClass, rawPointer);
      if (void 0 !== registeredInstance) {
        if (0 === registeredInstance.$$.count.value) {
          registeredInstance.$$.ptr = rawPointer;
          registeredInstance.$$.smartPtr = ptr;
          return registeredInstance["clone"]();
        } else {
          var rv = registeredInstance["clone"]();
          this.destructor(ptr);
          return rv;
        }
      }
      function makeDefaultHandle() {
        if (this.isSmartPointer) {
          return makeClassHandle(this.registeredClass.instancePrototype, { ptrType: this.pointeeType, ptr: rawPointer, smartPtrType: this, smartPtr: ptr });
        } else {
          return makeClassHandle(this.registeredClass.instancePrototype, { ptrType: this, ptr });
        }
      }
      var actualType = this.registeredClass.getActualType(rawPointer);
      var registeredPointerRecord = registeredPointers[actualType];
      if (!registeredPointerRecord) {
        return makeDefaultHandle.call(this);
      }
      var toType;
      if (this.isConst) {
        toType = registeredPointerRecord.constPointerType;
      } else {
        toType = registeredPointerRecord.pointerType;
      }
      var dp = downcastPointer(rawPointer, this.registeredClass, toType.registeredClass);
      if (dp === null) {
        return makeDefaultHandle.call(this);
      }
      if (this.isSmartPointer) {
        return makeClassHandle(toType.registeredClass.instancePrototype, { ptrType: toType, ptr: dp, smartPtrType: this, smartPtr: ptr });
      } else {
        return makeClassHandle(toType.registeredClass.instancePrototype, { ptrType: toType, ptr: dp });
      }
    }
    function attachFinalizer(handle) {
      if ("undefined" === typeof FinalizationRegistry) {
        attachFinalizer = (handle2) => handle2;
        return handle;
      }
      finalizationRegistry = new FinalizationRegistry((info) => {
        releaseClassHandle(info.$$);
      });
      attachFinalizer = (handle2) => {
        var $$ = handle2.$$;
        var hasSmartPtr = !!$$.smartPtr;
        if (hasSmartPtr) {
          var info = { $$ };
          finalizationRegistry.register(handle2, info, handle2);
        }
        return handle2;
      };
      detachFinalizer = (handle2) => finalizationRegistry.unregister(handle2);
      return attachFinalizer(handle);
    }
    function ClassHandle_clone() {
      if (!this.$$.ptr) {
        throwInstanceAlreadyDeleted(this);
      }
      if (this.$$.preservePointerOnDelete) {
        this.$$.count.value += 1;
        return this;
      } else {
        var clone = attachFinalizer(Object.create(Object.getPrototypeOf(this), { $$: { value: shallowCopyInternalPointer(this.$$) } }));
        clone.$$.count.value += 1;
        clone.$$.deleteScheduled = false;
        return clone;
      }
    }
    function ClassHandle_delete() {
      if (!this.$$.ptr) {
        throwInstanceAlreadyDeleted(this);
      }
      if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
        throwBindingError("Object already scheduled for deletion");
      }
      detachFinalizer(this);
      releaseClassHandle(this.$$);
      if (!this.$$.preservePointerOnDelete) {
        this.$$.smartPtr = void 0;
        this.$$.ptr = void 0;
      }
    }
    function ClassHandle_isDeleted() {
      return !this.$$.ptr;
    }
    function ClassHandle_deleteLater() {
      if (!this.$$.ptr) {
        throwInstanceAlreadyDeleted(this);
      }
      if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
        throwBindingError("Object already scheduled for deletion");
      }
      deletionQueue.push(this);
      if (deletionQueue.length === 1 && delayFunction) {
        delayFunction(flushPendingDeletes);
      }
      this.$$.deleteScheduled = true;
      return this;
    }
    function init_ClassHandle() {
      ClassHandle.prototype["isAliasOf"] = ClassHandle_isAliasOf;
      ClassHandle.prototype["clone"] = ClassHandle_clone;
      ClassHandle.prototype["delete"] = ClassHandle_delete;
      ClassHandle.prototype["isDeleted"] = ClassHandle_isDeleted;
      ClassHandle.prototype["deleteLater"] = ClassHandle_deleteLater;
    }
    function ClassHandle() {
    }
    function ensureOverloadTable(proto, methodName, humanName) {
      if (void 0 === proto[methodName].overloadTable) {
        var prevFunc = proto[methodName];
        proto[methodName] = function() {
          if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
            throwBindingError("Function '" + humanName + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + proto[methodName].overloadTable + ")!");
          }
          return proto[methodName].overloadTable[arguments.length].apply(this, arguments);
        };
        proto[methodName].overloadTable = [];
        proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
      }
    }
    function exposePublicSymbol(name, value, numArguments) {
      if (Module2.hasOwnProperty(name)) {
        if (void 0 === numArguments || void 0 !== Module2[name].overloadTable && void 0 !== Module2[name].overloadTable[numArguments]) {
          throwBindingError("Cannot register public name '" + name + "' twice");
        }
        ensureOverloadTable(Module2, name, name);
        if (Module2.hasOwnProperty(numArguments)) {
          throwBindingError("Cannot register multiple overloads of a function with the same number of arguments (" + numArguments + ")!");
        }
        Module2[name].overloadTable[numArguments] = value;
      } else {
        Module2[name] = value;
        if (void 0 !== numArguments) {
          Module2[name].numArguments = numArguments;
        }
      }
    }
    function RegisteredClass(name, constructor, instancePrototype, rawDestructor, baseClass, getActualType, upcast, downcast) {
      this.name = name;
      this.constructor = constructor;
      this.instancePrototype = instancePrototype;
      this.rawDestructor = rawDestructor;
      this.baseClass = baseClass;
      this.getActualType = getActualType;
      this.upcast = upcast;
      this.downcast = downcast;
      this.pureVirtualFunctions = [];
    }
    function upcastPointer(ptr, ptrClass, desiredClass) {
      while (ptrClass !== desiredClass) {
        if (!ptrClass.upcast) {
          throwBindingError("Expected null or instance of " + desiredClass.name + ", got an instance of " + ptrClass.name);
        }
        ptr = ptrClass.upcast(ptr);
        ptrClass = ptrClass.baseClass;
      }
      return ptr;
    }
    function constNoSmartPtrRawPointerToWireType(destructors, handle) {
      if (handle === null) {
        if (this.isReference) {
          throwBindingError("null is not a valid " + this.name);
        }
        return 0;
      }
      if (!handle.$$) {
        throwBindingError('Cannot pass "' + embindRepr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
        throwBindingError("Cannot pass deleted object as a pointer of type " + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      return ptr;
    }
    function genericPointerToWireType(destructors, handle) {
      var ptr;
      if (handle === null) {
        if (this.isReference) {
          throwBindingError("null is not a valid " + this.name);
        }
        if (this.isSmartPointer) {
          ptr = this.rawConstructor();
          if (destructors !== null) {
            destructors.push(this.rawDestructor, ptr);
          }
          return ptr;
        } else {
          return 0;
        }
      }
      if (!handle.$$) {
        throwBindingError('Cannot pass "' + embindRepr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
        throwBindingError("Cannot pass deleted object as a pointer of type " + this.name);
      }
      if (!this.isConst && handle.$$.ptrType.isConst) {
        throwBindingError("Cannot convert argument of type " + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + " to parameter type " + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      if (this.isSmartPointer) {
        if (void 0 === handle.$$.smartPtr) {
          throwBindingError("Passing raw pointer to smart pointer is illegal");
        }
        switch (this.sharingPolicy) {
          case 0:
            if (handle.$$.smartPtrType === this) {
              ptr = handle.$$.smartPtr;
            } else {
              throwBindingError("Cannot convert argument of type " + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + " to parameter type " + this.name);
            }
            break;
          case 1:
            ptr = handle.$$.smartPtr;
            break;
          case 2:
            if (handle.$$.smartPtrType === this) {
              ptr = handle.$$.smartPtr;
            } else {
              var clonedHandle = handle["clone"]();
              ptr = this.rawShare(ptr, Emval.toHandle(function() {
                clonedHandle["delete"]();
              }));
              if (destructors !== null) {
                destructors.push(this.rawDestructor, ptr);
              }
            }
            break;
          default:
            throwBindingError("Unsupporting sharing policy");
        }
      }
      return ptr;
    }
    function nonConstNoSmartPtrRawPointerToWireType(destructors, handle) {
      if (handle === null) {
        if (this.isReference) {
          throwBindingError("null is not a valid " + this.name);
        }
        return 0;
      }
      if (!handle.$$) {
        throwBindingError('Cannot pass "' + embindRepr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
        throwBindingError("Cannot pass deleted object as a pointer of type " + this.name);
      }
      if (handle.$$.ptrType.isConst) {
        throwBindingError("Cannot convert argument of type " + handle.$$.ptrType.name + " to parameter type " + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      return ptr;
    }
    function RegisteredPointer_getPointee(ptr) {
      if (this.rawGetPointee) {
        ptr = this.rawGetPointee(ptr);
      }
      return ptr;
    }
    function RegisteredPointer_destructor(ptr) {
      if (this.rawDestructor) {
        this.rawDestructor(ptr);
      }
    }
    function RegisteredPointer_deleteObject(handle) {
      if (handle !== null) {
        handle["delete"]();
      }
    }
    function init_RegisteredPointer() {
      RegisteredPointer.prototype.getPointee = RegisteredPointer_getPointee;
      RegisteredPointer.prototype.destructor = RegisteredPointer_destructor;
      RegisteredPointer.prototype["argPackAdvance"] = 8;
      RegisteredPointer.prototype["readValueFromPointer"] = simpleReadValueFromPointer;
      RegisteredPointer.prototype["deleteObject"] = RegisteredPointer_deleteObject;
      RegisteredPointer.prototype["fromWireType"] = RegisteredPointer_fromWireType;
    }
    function RegisteredPointer(name, registeredClass, isReference, isConst, isSmartPointer, pointeeType, sharingPolicy, rawGetPointee, rawConstructor, rawShare, rawDestructor) {
      this.name = name;
      this.registeredClass = registeredClass;
      this.isReference = isReference;
      this.isConst = isConst;
      this.isSmartPointer = isSmartPointer;
      this.pointeeType = pointeeType;
      this.sharingPolicy = sharingPolicy;
      this.rawGetPointee = rawGetPointee;
      this.rawConstructor = rawConstructor;
      this.rawShare = rawShare;
      this.rawDestructor = rawDestructor;
      if (!isSmartPointer && registeredClass.baseClass === void 0) {
        if (isConst) {
          this["toWireType"] = constNoSmartPtrRawPointerToWireType;
          this.destructorFunction = null;
        } else {
          this["toWireType"] = nonConstNoSmartPtrRawPointerToWireType;
          this.destructorFunction = null;
        }
      } else {
        this["toWireType"] = genericPointerToWireType;
      }
    }
    function replacePublicSymbol(name, value, numArguments) {
      if (!Module2.hasOwnProperty(name)) {
        throwInternalError("Replacing nonexistant public symbol");
      }
      if (void 0 !== Module2[name].overloadTable && void 0 !== numArguments) {
        Module2[name].overloadTable[numArguments] = value;
      } else {
        Module2[name] = value;
        Module2[name].argCount = numArguments;
      }
    }
    function dynCallLegacy(sig, ptr, args) {
      var f = Module2["dynCall_" + sig];
      return args && args.length ? f.apply(null, [ptr].concat(args)) : f.call(null, ptr);
    }
    function getWasmTableEntry(funcPtr) {
      return wasmTable.get(funcPtr);
    }
    function dynCall(sig, ptr, args) {
      if (sig.includes("j")) {
        return dynCallLegacy(sig, ptr, args);
      }
      var rtn = getWasmTableEntry(ptr).apply(null, args);
      return rtn;
    }
    function getDynCaller(sig, ptr) {
      var argCache = [];
      return function() {
        argCache.length = 0;
        Object.assign(argCache, arguments);
        return dynCall(sig, ptr, argCache);
      };
    }
    function embind__requireFunction(signature, rawFunction) {
      signature = readLatin1String(signature);
      function makeDynCaller() {
        if (signature.includes("j")) {
          return getDynCaller(signature, rawFunction);
        }
        return getWasmTableEntry(rawFunction);
      }
      var fp = makeDynCaller();
      if (typeof fp != "function") {
        throwBindingError("unknown function pointer with signature " + signature + ": " + rawFunction);
      }
      return fp;
    }
    var UnboundTypeError = void 0;
    function getTypeName(type) {
      var ptr = ___getTypeName(type);
      var rv = readLatin1String(ptr);
      _free(ptr);
      return rv;
    }
    function throwUnboundTypeError(message, types) {
      var unboundTypes = [];
      var seen = {};
      function visit(type) {
        if (seen[type]) {
          return;
        }
        if (registeredTypes[type]) {
          return;
        }
        if (typeDependencies[type]) {
          typeDependencies[type].forEach(visit);
          return;
        }
        unboundTypes.push(type);
        seen[type] = true;
      }
      types.forEach(visit);
      throw new UnboundTypeError(message + ": " + unboundTypes.map(getTypeName).join([", "]));
    }
    function __embind_register_class(rawType, rawPointerType, rawConstPointerType, baseClassRawType, getActualTypeSignature, getActualType, upcastSignature, upcast, downcastSignature, downcast, name, destructorSignature, rawDestructor) {
      name = readLatin1String(name);
      getActualType = embind__requireFunction(getActualTypeSignature, getActualType);
      if (upcast) {
        upcast = embind__requireFunction(upcastSignature, upcast);
      }
      if (downcast) {
        downcast = embind__requireFunction(downcastSignature, downcast);
      }
      rawDestructor = embind__requireFunction(destructorSignature, rawDestructor);
      var legalFunctionName = makeLegalFunctionName(name);
      exposePublicSymbol(legalFunctionName, function() {
        throwUnboundTypeError("Cannot construct " + name + " due to unbound types", [baseClassRawType]);
      });
      whenDependentTypesAreResolved([rawType, rawPointerType, rawConstPointerType], baseClassRawType ? [baseClassRawType] : [], function(base) {
        base = base[0];
        var baseClass;
        var basePrototype;
        if (baseClassRawType) {
          baseClass = base.registeredClass;
          basePrototype = baseClass.instancePrototype;
        } else {
          basePrototype = ClassHandle.prototype;
        }
        var constructor = createNamedFunction(legalFunctionName, function() {
          if (Object.getPrototypeOf(this) !== instancePrototype) {
            throw new BindingError("Use 'new' to construct " + name);
          }
          if (void 0 === registeredClass.constructor_body) {
            throw new BindingError(name + " has no accessible constructor");
          }
          var body = registeredClass.constructor_body[arguments.length];
          if (void 0 === body) {
            throw new BindingError("Tried to invoke ctor of " + name + " with invalid number of parameters (" + arguments.length + ") - expected (" + Object.keys(registeredClass.constructor_body).toString() + ") parameters instead!");
          }
          return body.apply(this, arguments);
        });
        var instancePrototype = Object.create(basePrototype, { constructor: { value: constructor } });
        constructor.prototype = instancePrototype;
        var registeredClass = new RegisteredClass(name, constructor, instancePrototype, rawDestructor, baseClass, getActualType, upcast, downcast);
        var referenceConverter = new RegisteredPointer(name, registeredClass, true, false, false);
        var pointerConverter = new RegisteredPointer(name + "*", registeredClass, false, false, false);
        var constPointerConverter = new RegisteredPointer(name + " const*", registeredClass, false, true, false);
        registeredPointers[rawType] = { pointerType: pointerConverter, constPointerType: constPointerConverter };
        replacePublicSymbol(legalFunctionName, constructor);
        return [referenceConverter, pointerConverter, constPointerConverter];
      });
    }
    function heap32VectorToArray(count, firstElement) {
      var array = [];
      for (var i = 0; i < count; i++) {
        array.push(HEAPU32[firstElement + i * 4 >> 2]);
      }
      return array;
    }
    function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc) {
      var argCount = argTypes.length;
      if (argCount < 2) {
        throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
      }
      var isClassMethodFunc = argTypes[1] !== null && classType !== null;
      var needsDestructorStack = false;
      for (var i = 1; i < argTypes.length; ++i) {
        if (argTypes[i] !== null && argTypes[i].destructorFunction === void 0) {
          needsDestructorStack = true;
          break;
        }
      }
      var returns = argTypes[0].name !== "void";
      var expectedArgCount = argCount - 2;
      var argsWired = new Array(expectedArgCount);
      var invokerFuncArgs = [];
      var destructors = [];
      return function() {
        if (arguments.length !== expectedArgCount) {
          throwBindingError("function " + humanName + " called with " + arguments.length + " arguments, expected " + expectedArgCount + " args!");
        }
        destructors.length = 0;
        var thisWired;
        invokerFuncArgs.length = isClassMethodFunc ? 2 : 1;
        invokerFuncArgs[0] = cppTargetFunc;
        if (isClassMethodFunc) {
          thisWired = argTypes[1]["toWireType"](destructors, this);
          invokerFuncArgs[1] = thisWired;
        }
        for (var i2 = 0; i2 < expectedArgCount; ++i2) {
          argsWired[i2] = argTypes[i2 + 2]["toWireType"](destructors, arguments[i2]);
          invokerFuncArgs.push(argsWired[i2]);
        }
        var rv = cppInvokerFunc.apply(null, invokerFuncArgs);
        function onDone(rv2) {
          if (needsDestructorStack) {
            runDestructors(destructors);
          } else {
            for (var i3 = isClassMethodFunc ? 1 : 2; i3 < argTypes.length; i3++) {
              var param = i3 === 1 ? thisWired : argsWired[i3 - 2];
              if (argTypes[i3].destructorFunction !== null) {
                argTypes[i3].destructorFunction(param);
              }
            }
          }
          if (returns) {
            return argTypes[0]["fromWireType"](rv2);
          }
        }
        return onDone(rv);
      };
    }
    function __embind_register_class_constructor(rawClassType, argCount, rawArgTypesAddr, invokerSignature, invoker, rawConstructor) {
      assert(argCount > 0);
      var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      invoker = embind__requireFunction(invokerSignature, invoker);
      whenDependentTypesAreResolved([], [rawClassType], function(classType) {
        classType = classType[0];
        var humanName = "constructor " + classType.name;
        if (void 0 === classType.registeredClass.constructor_body) {
          classType.registeredClass.constructor_body = [];
        }
        if (void 0 !== classType.registeredClass.constructor_body[argCount - 1]) {
          throw new BindingError("Cannot register multiple constructors with identical number of parameters (" + (argCount - 1) + ") for class '" + classType.name + "'! Overload resolution is currently only performed using the parameter count, not actual type info!");
        }
        classType.registeredClass.constructor_body[argCount - 1] = () => {
          throwUnboundTypeError("Cannot construct " + classType.name + " due to unbound types", rawArgTypes);
        };
        whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
          argTypes.splice(1, 0, null);
          classType.registeredClass.constructor_body[argCount - 1] = craftInvokerFunction(humanName, argTypes, null, invoker, rawConstructor);
          return [];
        });
        return [];
      });
    }
    function __embind_register_class_function(rawClassType, methodName, argCount, rawArgTypesAddr, invokerSignature, rawInvoker, context, isPureVirtual) {
      var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      methodName = readLatin1String(methodName);
      rawInvoker = embind__requireFunction(invokerSignature, rawInvoker);
      whenDependentTypesAreResolved([], [rawClassType], function(classType) {
        classType = classType[0];
        var humanName = classType.name + "." + methodName;
        if (methodName.startsWith("@@")) {
          methodName = Symbol[methodName.substring(2)];
        }
        if (isPureVirtual) {
          classType.registeredClass.pureVirtualFunctions.push(methodName);
        }
        function unboundTypesHandler() {
          throwUnboundTypeError("Cannot call " + humanName + " due to unbound types", rawArgTypes);
        }
        var proto = classType.registeredClass.instancePrototype;
        var method = proto[methodName];
        if (void 0 === method || void 0 === method.overloadTable && method.className !== classType.name && method.argCount === argCount - 2) {
          unboundTypesHandler.argCount = argCount - 2;
          unboundTypesHandler.className = classType.name;
          proto[methodName] = unboundTypesHandler;
        } else {
          ensureOverloadTable(proto, methodName, humanName);
          proto[methodName].overloadTable[argCount - 2] = unboundTypesHandler;
        }
        whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
          var memberFunction = craftInvokerFunction(humanName, argTypes, classType, rawInvoker, context);
          if (void 0 === proto[methodName].overloadTable) {
            memberFunction.argCount = argCount - 2;
            proto[methodName] = memberFunction;
          } else {
            proto[methodName].overloadTable[argCount - 2] = memberFunction;
          }
          return [];
        });
        return [];
      });
    }
    var emval_free_list = [];
    var emval_handle_array = [{}, { value: void 0 }, { value: null }, { value: true }, { value: false }];
    function __emval_decref(handle) {
      if (handle > 4 && 0 === --emval_handle_array[handle].refcount) {
        emval_handle_array[handle] = void 0;
        emval_free_list.push(handle);
      }
    }
    function count_emval_handles() {
      var count = 0;
      for (var i = 5; i < emval_handle_array.length; ++i) {
        if (emval_handle_array[i] !== void 0) {
          ++count;
        }
      }
      return count;
    }
    function get_first_emval() {
      for (var i = 5; i < emval_handle_array.length; ++i) {
        if (emval_handle_array[i] !== void 0) {
          return emval_handle_array[i];
        }
      }
      return null;
    }
    function init_emval() {
      Module2["count_emval_handles"] = count_emval_handles;
      Module2["get_first_emval"] = get_first_emval;
    }
    var Emval = { toValue: (handle) => {
      if (!handle) {
        throwBindingError("Cannot use deleted val. handle = " + handle);
      }
      return emval_handle_array[handle].value;
    }, toHandle: (value) => {
      switch (value) {
        case void 0:
          return 1;
        case null:
          return 2;
        case true:
          return 3;
        case false:
          return 4;
        default: {
          var handle = emval_free_list.length ? emval_free_list.pop() : emval_handle_array.length;
          emval_handle_array[handle] = { refcount: 1, value };
          return handle;
        }
      }
    } };
    function __embind_register_emval(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, { name, "fromWireType": function(handle) {
        var rv = Emval.toValue(handle);
        __emval_decref(handle);
        return rv;
      }, "toWireType": function(destructors, value) {
        return Emval.toHandle(value);
      }, "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: null });
    }
    function enumReadValueFromPointer(name, shift, signed) {
      switch (shift) {
        case 0:
          return function(pointer) {
            var heap = signed ? HEAP8 : HEAPU8;
            return this["fromWireType"](heap[pointer]);
          };
        case 1:
          return function(pointer) {
            var heap = signed ? HEAP16 : HEAPU16;
            return this["fromWireType"](heap[pointer >> 1]);
          };
        case 2:
          return function(pointer) {
            var heap = signed ? HEAP32 : HEAPU32;
            return this["fromWireType"](heap[pointer >> 2]);
          };
        default:
          throw new TypeError("Unknown integer type: " + name);
      }
    }
    function __embind_register_enum(rawType, name, size, isSigned) {
      var shift = getShiftFromSize(size);
      name = readLatin1String(name);
      function ctor() {
      }
      ctor.values = {};
      registerType(rawType, { name, constructor: ctor, "fromWireType": function(c) {
        return this.constructor.values[c];
      }, "toWireType": function(destructors, c) {
        return c.value;
      }, "argPackAdvance": 8, "readValueFromPointer": enumReadValueFromPointer(name, shift, isSigned), destructorFunction: null });
      exposePublicSymbol(name, ctor);
    }
    function requireRegisteredType(rawType, humanName) {
      var impl = registeredTypes[rawType];
      if (void 0 === impl) {
        throwBindingError(humanName + " has unknown type " + getTypeName(rawType));
      }
      return impl;
    }
    function __embind_register_enum_value(rawEnumType, name, enumValue) {
      var enumType = requireRegisteredType(rawEnumType, "enum");
      name = readLatin1String(name);
      var Enum = enumType.constructor;
      var Value = Object.create(enumType.constructor.prototype, { value: { value: enumValue }, constructor: { value: createNamedFunction(enumType.name + "_" + name, function() {
      }) } });
      Enum.values[enumValue] = Value;
      Enum[name] = Value;
    }
    function embindRepr(v) {
      if (v === null) {
        return "null";
      }
      var t = typeof v;
      if (t === "object" || t === "array" || t === "function") {
        return v.toString();
      } else {
        return "" + v;
      }
    }
    function floatReadValueFromPointer(name, shift) {
      switch (shift) {
        case 2:
          return function(pointer) {
            return this["fromWireType"](HEAPF32[pointer >> 2]);
          };
        case 3:
          return function(pointer) {
            return this["fromWireType"](HEAPF64[pointer >> 3]);
          };
        default:
          throw new TypeError("Unknown float type: " + name);
      }
    }
    function __embind_register_float(rawType, name, size) {
      var shift = getShiftFromSize(size);
      name = readLatin1String(name);
      registerType(rawType, { name, "fromWireType": function(value) {
        return value;
      }, "toWireType": function(destructors, value) {
        return value;
      }, "argPackAdvance": 8, "readValueFromPointer": floatReadValueFromPointer(name, shift), destructorFunction: null });
    }
    function integerReadValueFromPointer(name, shift, signed) {
      switch (shift) {
        case 0:
          return signed ? function readS8FromPointer(pointer) {
            return HEAP8[pointer];
          } : function readU8FromPointer(pointer) {
            return HEAPU8[pointer];
          };
        case 1:
          return signed ? function readS16FromPointer(pointer) {
            return HEAP16[pointer >> 1];
          } : function readU16FromPointer(pointer) {
            return HEAPU16[pointer >> 1];
          };
        case 2:
          return signed ? function readS32FromPointer(pointer) {
            return HEAP32[pointer >> 2];
          } : function readU32FromPointer(pointer) {
            return HEAPU32[pointer >> 2];
          };
        default:
          throw new TypeError("Unknown integer type: " + name);
      }
    }
    function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
      name = readLatin1String(name);
      var shift = getShiftFromSize(size);
      var fromWireType = (value) => value;
      if (minRange === 0) {
        var bitshift = 32 - 8 * size;
        fromWireType = (value) => value << bitshift >>> bitshift;
      }
      var isUnsignedType = name.includes("unsigned");
      var checkAssertions = (value, toTypeName) => {
      };
      var toWireType;
      if (isUnsignedType) {
        toWireType = function(destructors, value) {
          checkAssertions(value, this.name);
          return value >>> 0;
        };
      } else {
        toWireType = function(destructors, value) {
          checkAssertions(value, this.name);
          return value;
        };
      }
      registerType(primitiveType, { name, "fromWireType": fromWireType, "toWireType": toWireType, "argPackAdvance": 8, "readValueFromPointer": integerReadValueFromPointer(name, shift, minRange !== 0), destructorFunction: null });
    }
    function __embind_register_memory_view(rawType, dataTypeIndex, name) {
      var typeMapping = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
      var TA = typeMapping[dataTypeIndex];
      function decodeMemoryView(handle) {
        handle = handle >> 2;
        var heap = HEAPU32;
        var size = heap[handle];
        var data = heap[handle + 1];
        return new TA(heap.buffer, data, size);
      }
      name = readLatin1String(name);
      registerType(rawType, { name, "fromWireType": decodeMemoryView, "argPackAdvance": 8, "readValueFromPointer": decodeMemoryView }, { ignoreDuplicateRegistrations: true });
    }
    function __embind_register_std_string(rawType, name) {
      name = readLatin1String(name);
      var stdStringIsUTF8 = name === "std::string";
      registerType(rawType, { name, "fromWireType": function(value) {
        var length = HEAPU32[value >> 2];
        var payload = value + 4;
        var str;
        if (stdStringIsUTF8) {
          var decodeStartPtr = payload;
          for (var i = 0; i <= length; ++i) {
            var currentBytePtr = payload + i;
            if (i == length || HEAPU8[currentBytePtr] == 0) {
              var maxRead = currentBytePtr - decodeStartPtr;
              var stringSegment = UTF8ToString(decodeStartPtr, maxRead);
              if (str === void 0) {
                str = stringSegment;
              } else {
                str += String.fromCharCode(0);
                str += stringSegment;
              }
              decodeStartPtr = currentBytePtr + 1;
            }
          }
        } else {
          var a = new Array(length);
          for (var i = 0; i < length; ++i) {
            a[i] = String.fromCharCode(HEAPU8[payload + i]);
          }
          str = a.join("");
        }
        _free(value);
        return str;
      }, "toWireType": function(destructors, value) {
        if (value instanceof ArrayBuffer) {
          value = new Uint8Array(value);
        }
        var length;
        var valueIsOfTypeString = typeof value == "string";
        if (!(valueIsOfTypeString || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Int8Array)) {
          throwBindingError("Cannot pass non-string to std::string");
        }
        if (stdStringIsUTF8 && valueIsOfTypeString) {
          length = lengthBytesUTF82(value);
        } else {
          length = value.length;
        }
        var base = _malloc(4 + length + 1);
        var ptr = base + 4;
        HEAPU32[base >> 2] = length;
        if (stdStringIsUTF8 && valueIsOfTypeString) {
          stringToUTF82(value, ptr, length + 1);
        } else {
          if (valueIsOfTypeString) {
            for (var i = 0; i < length; ++i) {
              var charCode = value.charCodeAt(i);
              if (charCode > 255) {
                _free(ptr);
                throwBindingError("String has UTF-16 code units that do not fit in 8 bits");
              }
              HEAPU8[ptr + i] = charCode;
            }
          } else {
            for (var i = 0; i < length; ++i) {
              HEAPU8[ptr + i] = value[i];
            }
          }
        }
        if (destructors !== null) {
          destructors.push(_free, base);
        }
        return base;
      }, "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: function(ptr) {
        _free(ptr);
      } });
    }
    var UTF16Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf-16le") : void 0;
    function UTF16ToString(ptr, maxBytesToRead) {
      var endPtr = ptr;
      var idx = endPtr >> 1;
      var maxIdx = idx + maxBytesToRead / 2;
      while (!(idx >= maxIdx) && HEAPU16[idx]) ++idx;
      endPtr = idx << 1;
      if (endPtr - ptr > 32 && UTF16Decoder) return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
      var str = "";
      for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
        var codeUnit = HEAP16[ptr + i * 2 >> 1];
        if (codeUnit == 0) break;
        str += String.fromCharCode(codeUnit);
      }
      return str;
    }
    function stringToUTF16(str, outPtr, maxBytesToWrite) {
      if (maxBytesToWrite === void 0) {
        maxBytesToWrite = 2147483647;
      }
      if (maxBytesToWrite < 2) return 0;
      maxBytesToWrite -= 2;
      var startPtr = outPtr;
      var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
      for (var i = 0; i < numCharsToWrite; ++i) {
        var codeUnit = str.charCodeAt(i);
        HEAP16[outPtr >> 1] = codeUnit;
        outPtr += 2;
      }
      HEAP16[outPtr >> 1] = 0;
      return outPtr - startPtr;
    }
    function lengthBytesUTF16(str) {
      return str.length * 2;
    }
    function UTF32ToString(ptr, maxBytesToRead) {
      var i = 0;
      var str = "";
      while (!(i >= maxBytesToRead / 4)) {
        var utf32 = HEAP32[ptr + i * 4 >> 2];
        if (utf32 == 0) break;
        ++i;
        if (utf32 >= 65536) {
          var ch = utf32 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        } else {
          str += String.fromCharCode(utf32);
        }
      }
      return str;
    }
    function stringToUTF32(str, outPtr, maxBytesToWrite) {
      if (maxBytesToWrite === void 0) {
        maxBytesToWrite = 2147483647;
      }
      if (maxBytesToWrite < 4) return 0;
      var startPtr = outPtr;
      var endPtr = startPtr + maxBytesToWrite - 4;
      for (var i = 0; i < str.length; ++i) {
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 55296 && codeUnit <= 57343) {
          var trailSurrogate = str.charCodeAt(++i);
          codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023;
        }
        HEAP32[outPtr >> 2] = codeUnit;
        outPtr += 4;
        if (outPtr + 4 > endPtr) break;
      }
      HEAP32[outPtr >> 2] = 0;
      return outPtr - startPtr;
    }
    function lengthBytesUTF32(str) {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 55296 && codeUnit <= 57343) ++i;
        len += 4;
      }
      return len;
    }
    function __embind_register_std_wstring(rawType, charSize, name) {
      name = readLatin1String(name);
      var decodeString, encodeString, getHeap, lengthBytesUTF, shift;
      if (charSize === 2) {
        decodeString = UTF16ToString;
        encodeString = stringToUTF16;
        lengthBytesUTF = lengthBytesUTF16;
        getHeap = () => HEAPU16;
        shift = 1;
      } else if (charSize === 4) {
        decodeString = UTF32ToString;
        encodeString = stringToUTF32;
        lengthBytesUTF = lengthBytesUTF32;
        getHeap = () => HEAPU32;
        shift = 2;
      }
      registerType(rawType, { name, "fromWireType": function(value) {
        var length = HEAPU32[value >> 2];
        var HEAP = getHeap();
        var str;
        var decodeStartPtr = value + 4;
        for (var i = 0; i <= length; ++i) {
          var currentBytePtr = value + 4 + i * charSize;
          if (i == length || HEAP[currentBytePtr >> shift] == 0) {
            var maxReadBytes = currentBytePtr - decodeStartPtr;
            var stringSegment = decodeString(decodeStartPtr, maxReadBytes);
            if (str === void 0) {
              str = stringSegment;
            } else {
              str += String.fromCharCode(0);
              str += stringSegment;
            }
            decodeStartPtr = currentBytePtr + charSize;
          }
        }
        _free(value);
        return str;
      }, "toWireType": function(destructors, value) {
        if (!(typeof value == "string")) {
          throwBindingError("Cannot pass non-string to C++ string type " + name);
        }
        var length = lengthBytesUTF(value);
        var ptr = _malloc(4 + length + charSize);
        HEAPU32[ptr >> 2] = length >> shift;
        encodeString(value, ptr + 4, length + charSize);
        if (destructors !== null) {
          destructors.push(_free, ptr);
        }
        return ptr;
      }, "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: function(ptr) {
        _free(ptr);
      } });
    }
    function __embind_register_value_object(rawType, name, constructorSignature, rawConstructor, destructorSignature, rawDestructor) {
      structRegistrations[rawType] = { name: readLatin1String(name), rawConstructor: embind__requireFunction(constructorSignature, rawConstructor), rawDestructor: embind__requireFunction(destructorSignature, rawDestructor), fields: [] };
    }
    function __embind_register_value_object_field(structType, fieldName, getterReturnType, getterSignature, getter, getterContext, setterArgumentType, setterSignature, setter, setterContext) {
      structRegistrations[structType].fields.push({ fieldName: readLatin1String(fieldName), getterReturnType, getter: embind__requireFunction(getterSignature, getter), getterContext, setterArgumentType, setter: embind__requireFunction(setterSignature, setter), setterContext });
    }
    function __embind_register_void(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, { isVoid: true, name, "argPackAdvance": 0, "fromWireType": function() {
        return void 0;
      }, "toWireType": function(destructors, o) {
        return void 0;
      } });
    }
    var nowIsMonotonic = true;
    function __emscripten_get_now_is_monotonic() {
      return nowIsMonotonic;
    }
    function emval_lookupTypes(argCount, argTypes) {
      var a = new Array(argCount);
      for (var i = 0; i < argCount; ++i) {
        a[i] = requireRegisteredType(HEAPU32[argTypes + i * 4 >> 2], "parameter " + i);
      }
      return a;
    }
    function __emval_call(handle, argCount, argTypes, argv) {
      handle = Emval.toValue(handle);
      var types = emval_lookupTypes(argCount, argTypes);
      var args = new Array(argCount);
      for (var i = 0; i < argCount; ++i) {
        var type = types[i];
        args[i] = type["readValueFromPointer"](argv);
        argv += type["argPackAdvance"];
      }
      var rv = handle.apply(void 0, args);
      return Emval.toHandle(rv);
    }
    function __emval_incref(handle) {
      if (handle > 4) {
        emval_handle_array[handle].refcount += 1;
      }
    }
    function __emval_take_value(type, arg) {
      type = requireRegisteredType(type, "_emval_take_value");
      var v = type["readValueFromPointer"](arg);
      return Emval.toHandle(v);
    }
    function readI53FromI64(ptr) {
      return HEAPU32[ptr >> 2] + HEAP32[ptr + 4 >> 2] * 4294967296;
    }
    function __gmtime_js(time, tmPtr) {
      var date = new Date(readI53FromI64(time) * 1e3);
      HEAP32[tmPtr >> 2] = date.getUTCSeconds();
      HEAP32[tmPtr + 4 >> 2] = date.getUTCMinutes();
      HEAP32[tmPtr + 8 >> 2] = date.getUTCHours();
      HEAP32[tmPtr + 12 >> 2] = date.getUTCDate();
      HEAP32[tmPtr + 16 >> 2] = date.getUTCMonth();
      HEAP32[tmPtr + 20 >> 2] = date.getUTCFullYear() - 1900;
      HEAP32[tmPtr + 24 >> 2] = date.getUTCDay();
      var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
      var yday = (date.getTime() - start) / (1e3 * 60 * 60 * 24) | 0;
      HEAP32[tmPtr + 28 >> 2] = yday;
    }
    function __isLeapYear(year) {
      return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    }
    var __MONTH_DAYS_LEAP_CUMULATIVE = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
    var __MONTH_DAYS_REGULAR_CUMULATIVE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    function __yday_from_date(date) {
      var isLeapYear = __isLeapYear(date.getFullYear());
      var monthDaysCumulative = isLeapYear ? __MONTH_DAYS_LEAP_CUMULATIVE : __MONTH_DAYS_REGULAR_CUMULATIVE;
      var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1;
      return yday;
    }
    function __localtime_js(time, tmPtr) {
      var date = new Date(readI53FromI64(time) * 1e3);
      HEAP32[tmPtr >> 2] = date.getSeconds();
      HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
      HEAP32[tmPtr + 8 >> 2] = date.getHours();
      HEAP32[tmPtr + 12 >> 2] = date.getDate();
      HEAP32[tmPtr + 16 >> 2] = date.getMonth();
      HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
      HEAP32[tmPtr + 24 >> 2] = date.getDay();
      var yday = __yday_from_date(date) | 0;
      HEAP32[tmPtr + 28 >> 2] = yday;
      HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
      var start = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
      HEAP32[tmPtr + 32 >> 2] = dst;
    }
    function __mktime_js(tmPtr) {
      var date = new Date(HEAP32[tmPtr + 20 >> 2] + 1900, HEAP32[tmPtr + 16 >> 2], HEAP32[tmPtr + 12 >> 2], HEAP32[tmPtr + 8 >> 2], HEAP32[tmPtr + 4 >> 2], HEAP32[tmPtr >> 2], 0);
      var dst = HEAP32[tmPtr + 32 >> 2];
      var guessedOffset = date.getTimezoneOffset();
      var start = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dstOffset = Math.min(winterOffset, summerOffset);
      if (dst < 0) {
        HEAP32[tmPtr + 32 >> 2] = Number(summerOffset != winterOffset && dstOffset == guessedOffset);
      } else if (dst > 0 != (dstOffset == guessedOffset)) {
        var nonDstOffset = Math.max(winterOffset, summerOffset);
        var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
        date.setTime(date.getTime() + (trueOffset - guessedOffset) * 6e4);
      }
      HEAP32[tmPtr + 24 >> 2] = date.getDay();
      var yday = __yday_from_date(date) | 0;
      HEAP32[tmPtr + 28 >> 2] = yday;
      HEAP32[tmPtr >> 2] = date.getSeconds();
      HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
      HEAP32[tmPtr + 8 >> 2] = date.getHours();
      HEAP32[tmPtr + 12 >> 2] = date.getDate();
      HEAP32[tmPtr + 16 >> 2] = date.getMonth();
      HEAP32[tmPtr + 20 >> 2] = date.getYear();
      return date.getTime() / 1e3 | 0;
    }
    function allocateUTF8(str) {
      var size = lengthBytesUTF82(str) + 1;
      var ret = _malloc(size);
      if (ret) stringToUTF8Array(str, HEAP8, ret, size);
      return ret;
    }
    function __tzset_js(timezone, daylight, tzname) {
      var currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      var winter = new Date(currentYear, 0, 1);
      var summer = new Date(currentYear, 6, 1);
      var winterOffset = winter.getTimezoneOffset();
      var summerOffset = summer.getTimezoneOffset();
      var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
      HEAPU32[timezone >> 2] = stdTimezoneOffset * 60;
      HEAP32[daylight >> 2] = Number(winterOffset != summerOffset);
      function extractZone(date) {
        var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
        return match ? match[1] : "GMT";
      }
      var winterName = extractZone(winter);
      var summerName = extractZone(summer);
      var winterNamePtr = allocateUTF8(winterName);
      var summerNamePtr = allocateUTF8(summerName);
      if (summerOffset < winterOffset) {
        HEAPU32[tzname >> 2] = winterNamePtr;
        HEAPU32[tzname + 4 >> 2] = summerNamePtr;
      } else {
        HEAPU32[tzname >> 2] = summerNamePtr;
        HEAPU32[tzname + 4 >> 2] = winterNamePtr;
      }
    }
    function _abort() {
      abort("");
    }
    function _emscripten_date_now() {
      return Date.now();
    }
    var _emscripten_get_now;
    _emscripten_get_now = () => performance.now();
    function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.copyWithin(dest, src, src + num);
    }
    function getHeapMax() {
      return 1073741824;
    }
    function emscripten_realloc_buffer(size) {
      var b = wasmMemory.buffer;
      try {
        wasmMemory.grow(size - b.byteLength + 65535 >>> 16);
        updateMemoryViews();
        return 1;
      } catch (e) {
      }
    }
    function _emscripten_resize_heap(requestedSize) {
      var oldSize = HEAPU8.length;
      requestedSize = requestedSize >>> 0;
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        return false;
      }
      let alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = emscripten_realloc_buffer(newSize);
        if (replacement) {
          return true;
        }
      }
      return false;
    }
    var ENV = {};
    function getExecutableName() {
      return thisProgram || "./this.program";
    }
    function getEnvStrings() {
      if (!getEnvStrings.strings) {
        var lang = (typeof navigator == "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8";
        var env = { "USER": "web_user", "LOGNAME": "web_user", "PATH": "/", "PWD": "/", "HOME": "/home/web_user", "LANG": lang, "_": getExecutableName() };
        for (var x in ENV) {
          if (ENV[x] === void 0) delete env[x];
          else env[x] = ENV[x];
        }
        var strings = [];
        for (var x in env) {
          strings.push(x + "=" + env[x]);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    }
    function writeAsciiToMemory(str, buffer, dontAddNull) {
      for (var i = 0; i < str.length; ++i) {
        HEAP8[buffer++ >> 0] = str.charCodeAt(i);
      }
      if (!dontAddNull) HEAP8[buffer >> 0] = 0;
    }
    function _environ_get(__environ, environ_buf) {
      var bufSize = 0;
      getEnvStrings().forEach(function(string, i) {
        var ptr = environ_buf + bufSize;
        HEAPU32[__environ + i * 4 >> 2] = ptr;
        writeAsciiToMemory(string, ptr);
        bufSize += string.length + 1;
      });
      return 0;
    }
    function _environ_sizes_get(penviron_count, penviron_buf_size) {
      var strings = getEnvStrings();
      HEAPU32[penviron_count >> 2] = strings.length;
      var bufSize = 0;
      strings.forEach(function(string) {
        bufSize += string.length + 1;
      });
      HEAPU32[penviron_buf_size >> 2] = bufSize;
      return 0;
    }
    function _fd_close(fd) {
      return 52;
    }
    function _fd_read(fd, iov, iovcnt, pnum) {
      return 52;
    }
    function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
      return 70;
    }
    var printCharBuffers = [null, [], []];
    function printChar(stream, curr) {
      var buffer = printCharBuffers[stream];
      if (curr === 0 || curr === 10) {
        (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
        buffer.length = 0;
      } else {
        buffer.push(curr);
      }
    }
    function _fd_write(fd, iov, iovcnt, pnum) {
      var num = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        for (var j = 0; j < len; j++) {
          printChar(fd, HEAPU8[ptr + j]);
        }
        num += len;
      }
      HEAPU32[pnum >> 2] = num;
      return 0;
    }
    function __arraySum(array, index) {
      var sum = 0;
      for (var i = 0; i <= index; sum += array[i++]) {
      }
      return sum;
    }
    var __MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var __MONTH_DAYS_REGULAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    function __addDays(date, days) {
      var newDate = new Date(date.getTime());
      while (days > 0) {
        var leap = __isLeapYear(newDate.getFullYear());
        var currentMonth = newDate.getMonth();
        var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
        if (days > daysInCurrentMonth - newDate.getDate()) {
          days -= daysInCurrentMonth - newDate.getDate() + 1;
          newDate.setDate(1);
          if (currentMonth < 11) {
            newDate.setMonth(currentMonth + 1);
          } else {
            newDate.setMonth(0);
            newDate.setFullYear(newDate.getFullYear() + 1);
          }
        } else {
          newDate.setDate(newDate.getDate() + days);
          return newDate;
        }
      }
      return newDate;
    }
    function intArrayFromString(stringy, dontAddNull, length) {
      var len = length > 0 ? length : lengthBytesUTF82(stringy) + 1;
      var u8array = new Array(len);
      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
      if (dontAddNull) u8array.length = numBytesWritten;
      return u8array;
    }
    function writeArrayToMemory(array, buffer) {
      HEAP8.set(array, buffer);
    }
    function _strftime(s, maxsize, format, tm) {
      var tm_zone = HEAP32[tm + 40 >> 2];
      var date = { tm_sec: HEAP32[tm >> 2], tm_min: HEAP32[tm + 4 >> 2], tm_hour: HEAP32[tm + 8 >> 2], tm_mday: HEAP32[tm + 12 >> 2], tm_mon: HEAP32[tm + 16 >> 2], tm_year: HEAP32[tm + 20 >> 2], tm_wday: HEAP32[tm + 24 >> 2], tm_yday: HEAP32[tm + 28 >> 2], tm_isdst: HEAP32[tm + 32 >> 2], tm_gmtoff: HEAP32[tm + 36 >> 2], tm_zone: tm_zone ? UTF8ToString(tm_zone) : "" };
      var pattern = UTF8ToString(format);
      var EXPANSION_RULES_1 = { "%c": "%a %b %d %H:%M:%S %Y", "%D": "%m/%d/%y", "%F": "%Y-%m-%d", "%h": "%b", "%r": "%I:%M:%S %p", "%R": "%H:%M", "%T": "%H:%M:%S", "%x": "%m/%d/%y", "%X": "%H:%M:%S", "%Ec": "%c", "%EC": "%C", "%Ex": "%m/%d/%y", "%EX": "%H:%M:%S", "%Ey": "%y", "%EY": "%Y", "%Od": "%d", "%Oe": "%e", "%OH": "%H", "%OI": "%I", "%Om": "%m", "%OM": "%M", "%OS": "%S", "%Ou": "%u", "%OU": "%U", "%OV": "%V", "%Ow": "%w", "%OW": "%W", "%Oy": "%y" };
      for (var rule in EXPANSION_RULES_1) {
        pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule]);
      }
      var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      function leadingSomething(value, digits, character) {
        var str = typeof value == "number" ? value.toString() : value || "";
        while (str.length < digits) {
          str = character[0] + str;
        }
        return str;
      }
      function leadingNulls(value, digits) {
        return leadingSomething(value, digits, "0");
      }
      function compareByDay(date1, date2) {
        function sgn(value) {
          return value < 0 ? -1 : value > 0 ? 1 : 0;
        }
        var compare;
        if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
          if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
            compare = sgn(date1.getDate() - date2.getDate());
          }
        }
        return compare;
      }
      function getFirstWeekStartDate(janFourth) {
        switch (janFourth.getDay()) {
          case 0:
            return new Date(janFourth.getFullYear() - 1, 11, 29);
          case 1:
            return janFourth;
          case 2:
            return new Date(janFourth.getFullYear(), 0, 3);
          case 3:
            return new Date(janFourth.getFullYear(), 0, 2);
          case 4:
            return new Date(janFourth.getFullYear(), 0, 1);
          case 5:
            return new Date(janFourth.getFullYear() - 1, 11, 31);
          case 6:
            return new Date(janFourth.getFullYear() - 1, 11, 30);
        }
      }
      function getWeekBasedYear(date2) {
        var thisDate = __addDays(new Date(date2.tm_year + 1900, 0, 1), date2.tm_yday);
        var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
        var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
        var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
        var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
        if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
          if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
            return thisDate.getFullYear() + 1;
          }
          return thisDate.getFullYear();
        }
        return thisDate.getFullYear() - 1;
      }
      var EXPANSION_RULES_2 = { "%a": function(date2) {
        return WEEKDAYS[date2.tm_wday].substring(0, 3);
      }, "%A": function(date2) {
        return WEEKDAYS[date2.tm_wday];
      }, "%b": function(date2) {
        return MONTHS[date2.tm_mon].substring(0, 3);
      }, "%B": function(date2) {
        return MONTHS[date2.tm_mon];
      }, "%C": function(date2) {
        var year = date2.tm_year + 1900;
        return leadingNulls(year / 100 | 0, 2);
      }, "%d": function(date2) {
        return leadingNulls(date2.tm_mday, 2);
      }, "%e": function(date2) {
        return leadingSomething(date2.tm_mday, 2, " ");
      }, "%g": function(date2) {
        return getWeekBasedYear(date2).toString().substring(2);
      }, "%G": function(date2) {
        return getWeekBasedYear(date2);
      }, "%H": function(date2) {
        return leadingNulls(date2.tm_hour, 2);
      }, "%I": function(date2) {
        var twelveHour = date2.tm_hour;
        if (twelveHour == 0) twelveHour = 12;
        else if (twelveHour > 12) twelveHour -= 12;
        return leadingNulls(twelveHour, 2);
      }, "%j": function(date2) {
        return leadingNulls(date2.tm_mday + __arraySum(__isLeapYear(date2.tm_year + 1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date2.tm_mon - 1), 3);
      }, "%m": function(date2) {
        return leadingNulls(date2.tm_mon + 1, 2);
      }, "%M": function(date2) {
        return leadingNulls(date2.tm_min, 2);
      }, "%n": function() {
        return "\n";
      }, "%p": function(date2) {
        if (date2.tm_hour >= 0 && date2.tm_hour < 12) {
          return "AM";
        }
        return "PM";
      }, "%S": function(date2) {
        return leadingNulls(date2.tm_sec, 2);
      }, "%t": function() {
        return "	";
      }, "%u": function(date2) {
        return date2.tm_wday || 7;
      }, "%U": function(date2) {
        var days = date2.tm_yday + 7 - date2.tm_wday;
        return leadingNulls(Math.floor(days / 7), 2);
      }, "%V": function(date2) {
        var val = Math.floor((date2.tm_yday + 7 - (date2.tm_wday + 6) % 7) / 7);
        if ((date2.tm_wday + 371 - date2.tm_yday - 2) % 7 <= 2) {
          val++;
        }
        if (!val) {
          val = 52;
          var dec31 = (date2.tm_wday + 7 - date2.tm_yday - 1) % 7;
          if (dec31 == 4 || dec31 == 5 && __isLeapYear(date2.tm_year % 400 - 1)) {
            val++;
          }
        } else if (val == 53) {
          var jan1 = (date2.tm_wday + 371 - date2.tm_yday) % 7;
          if (jan1 != 4 && (jan1 != 3 || !__isLeapYear(date2.tm_year))) val = 1;
        }
        return leadingNulls(val, 2);
      }, "%w": function(date2) {
        return date2.tm_wday;
      }, "%W": function(date2) {
        var days = date2.tm_yday + 7 - (date2.tm_wday + 6) % 7;
        return leadingNulls(Math.floor(days / 7), 2);
      }, "%y": function(date2) {
        return (date2.tm_year + 1900).toString().substring(2);
      }, "%Y": function(date2) {
        return date2.tm_year + 1900;
      }, "%z": function(date2) {
        var off = date2.tm_gmtoff;
        var ahead = off >= 0;
        off = Math.abs(off) / 60;
        off = off / 60 * 100 + off % 60;
        return (ahead ? "+" : "-") + String("0000" + off).slice(-4);
      }, "%Z": function(date2) {
        return date2.tm_zone;
      }, "%%": function() {
        return "%";
      } };
      pattern = pattern.replace(/%%/g, "\0\0");
      for (var rule in EXPANSION_RULES_2) {
        if (pattern.includes(rule)) {
          pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date));
        }
      }
      pattern = pattern.replace(/\0\0/g, "%");
      var bytes = intArrayFromString(pattern, false);
      if (bytes.length > maxsize) {
        return 0;
      }
      writeArrayToMemory(bytes, s);
      return bytes.length - 1;
    }
    function _strftime_l(s, maxsize, format, tm, loc) {
      return _strftime(s, maxsize, format, tm);
    }
    InternalError = Module2["InternalError"] = extendError(Error, "InternalError");
    embind_init_charCodes();
    BindingError = Module2["BindingError"] = extendError(Error, "BindingError");
    init_ClassHandle();
    init_embind();
    init_RegisteredPointer();
    UnboundTypeError = Module2["UnboundTypeError"] = extendError(Error, "UnboundTypeError");
    init_emval();
    var wasmImports = { "e": ___cxa_throw, "s": ___syscall_fcntl64, "F": ___syscall_getcwd, "H": ___syscall_ioctl, "t": ___syscall_openat, "B": ___syscall_rmdir, "C": ___syscall_unlinkat, "g": __embind_finalize_value_object, "y": __embind_register_bigint, "Q": __embind_register_bool, "k": __embind_register_class, "j": __embind_register_class_constructor, "a": __embind_register_class_function, "P": __embind_register_emval, "w": __embind_register_enum, "q": __embind_register_enum_value, "v": __embind_register_float, "d": __embind_register_integer, "b": __embind_register_memory_view, "u": __embind_register_std_string, "o": __embind_register_std_wstring, "i": __embind_register_value_object, "c": __embind_register_value_object_field, "R": __embind_register_void, "J": __emscripten_get_now_is_monotonic, "T": __emval_call, "f": __emval_decref, "p": __emval_incref, "m": __emval_take_value, "K": __gmtime_js, "L": __localtime_js, "M": __mktime_js, "N": __tzset_js, "h": _abort, "l": _emscripten_date_now, "I": _emscripten_get_now, "O": _emscripten_memcpy_big, "A": _emscripten_resize_heap, "D": _environ_get, "E": _environ_sizes_get, "n": _fd_close, "G": _fd_read, "x": _fd_seek, "r": _fd_write, "S": _strftime, "z": _strftime_l };
    createWasm();
    var _malloc = function() {
      return (_malloc = Module2["asm"]["W"]).apply(null, arguments);
    };
    var _free = function() {
      return (_free = Module2["asm"]["Y"]).apply(null, arguments);
    };
    var ___getTypeName = Module2["___getTypeName"] = function() {
      return (___getTypeName = Module2["___getTypeName"] = Module2["asm"]["Z"]).apply(null, arguments);
    };
    Module2["__embind_initialize_bindings"] = function() {
      return (Module2["__embind_initialize_bindings"] = Module2["asm"]["_"]).apply(null, arguments);
    };
    var ___cxa_is_pointer_type = function() {
      return (___cxa_is_pointer_type = Module2["asm"]["$"]).apply(null, arguments);
    };
    Module2["dynCall_jiji"] = function() {
      return (Module2["dynCall_jiji"] = Module2["asm"]["aa"]).apply(null, arguments);
    };
    Module2["dynCall_viijii"] = function() {
      return (Module2["dynCall_viijii"] = Module2["asm"]["ba"]).apply(null, arguments);
    };
    Module2["dynCall_iiiiij"] = function() {
      return (Module2["dynCall_iiiiij"] = Module2["asm"]["ca"]).apply(null, arguments);
    };
    Module2["dynCall_iiiiijj"] = function() {
      return (Module2["dynCall_iiiiijj"] = Module2["asm"]["da"]).apply(null, arguments);
    };
    Module2["dynCall_iiiiiijj"] = function() {
      return (Module2["dynCall_iiiiiijj"] = Module2["asm"]["ea"]).apply(null, arguments);
    };
    Module2["dynCall_jijii"] = function() {
      return (Module2["dynCall_jijii"] = Module2["asm"]["fa"]).apply(null, arguments);
    };
    Module2["dynCall_vijii"] = function() {
      return (Module2["dynCall_vijii"] = Module2["asm"]["ga"]).apply(null, arguments);
    };
    Module2["dynCall_jij"] = function() {
      return (Module2["dynCall_jij"] = Module2["asm"]["ha"]).apply(null, arguments);
    };
    Module2["dynCall_iij"] = function() {
      return (Module2["dynCall_iij"] = Module2["asm"]["ia"]).apply(null, arguments);
    };
    Module2["dynCall_viji"] = function() {
      return (Module2["dynCall_viji"] = Module2["asm"]["ja"]).apply(null, arguments);
    };
    Module2["dynCall_jii"] = function() {
      return (Module2["dynCall_jii"] = Module2["asm"]["ka"]).apply(null, arguments);
    };
    var calledRun;
    dependenciesFulfilled = function runCaller() {
      if (!calledRun) run();
      if (!calledRun) dependenciesFulfilled = runCaller;
    };
    function run() {
      if (runDependencies > 0) {
        return;
      }
      preRun();
      if (runDependencies > 0) {
        return;
      }
      function doRun() {
        if (calledRun) return;
        calledRun = true;
        Module2["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        readyPromiseResolve(Module2);
        if (Module2["onRuntimeInitialized"]) Module2["onRuntimeInitialized"]();
        postRun();
      }
      if (Module2["setStatus"]) {
        Module2["setStatus"]("Running...");
        setTimeout(function() {
          setTimeout(function() {
            Module2["setStatus"]("");
          }, 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
    }
    if (Module2["preInit"]) {
      if (typeof Module2["preInit"] == "function") Module2["preInit"] = [Module2["preInit"]];
      while (Module2["preInit"].length > 0) {
        Module2["preInit"].pop()();
      }
    }
    run();
    function wasmSIMDSupported2() {
      const simdTest = Uint8Array.from([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);
      return WebAssembly.validate(simdTest);
    }
    if (wasmSIMDSupported2()) {
      ENV.DOTPRODUCT = "sse";
    }
    return Module2.ready;
  });
})();
function jsArrayFromStdVector(vec) {
  const size = vec.size();
  const result = [];
  for (let i = 0; i < size; i++) {
    result.push(vec.get(i));
  }
  return result;
}
var OCREngine = class {
  /**
   * Initialize the OCREngine.
   *
   * Use {@link createOCREngine} rather than calling this directly.
   *
   * @param tessLib - Emscripten entry point for the compiled WebAssembly module.
   * @param progressChannel - Channel used to report progress
   *   updates when OCREngine is run on a background thread
   */
  constructor(tessLib, progressChannel) {
    this._tesseractLib = tessLib;
    this._engine = new tessLib.OCREngine();
    this._modelLoaded = false;
    this._imageLoaded = false;
    this._progressChannel = progressChannel;
  }
  /**
   * Shut down the OCR engine and free up resources.
   */
  destroy() {
    this._engine.delete();
    this._engine = null;
  }
  /**
   * Get the value, represented as a string, of a Tesseract configuration variable.
   *
   * See {@link setVariable} for available variables.
   */
  getVariable(name) {
    const result = this._engine.getVariable(name);
    if (!result.success) {
      throw new Error(`Unable to get variable ${name}`);
    }
    return result.value;
  }
  /**
   * Set the value of a Tesseract configuration variable.
   *
   * For a list of configuration variables, see
   * https://github.com/tesseract-ocr/tesseract/blob/677f5822f247ccb12b4e026265e88b959059fb59/src/ccmain/tesseractclass.cpp#L53
   *
   * If you have Tesseract installed locally, executing `tesseract --print-parameters`
   * will also display a list of configuration variables.
   */
  setVariable(name, value) {
    const result = this._engine.setVariable(name, value);
    if (result.error) {
      throw new Error(`Unable to set variable ${name}`);
    }
  }
  /**
   * Load a trained text recognition model.
   */
  loadModel(model) {
    const modelArray = model instanceof ArrayBuffer ? new Uint8Array(model) : model;
    const result = this._engine.loadModel(modelArray);
    if (result.error) {
      throw new Error("Text recognition model failed to load");
    }
    this._modelLoaded = true;
  }
  /**
   * Load a document image for processing by subsequent operations.
   *
   * This is a cheap operation as expensive processing is deferred until
   * bounding boxes or text content is requested.
   */
  loadImage(image) {
    let imageData;
    if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
      imageData = imageDataFromBitmap(image);
    } else {
      imageData = image;
    }
    if (imageData.data.length < imageData.width * imageData.height * 4) {
      throw new Error("Image data length does not match width/height");
    }
    if (imageData.width <= 0 || imageData.height <= 0) {
      throw new Error("Image width or height is zero");
    }
    this._engine.clearImage();
    const engineImage = new this._tesseractLib.Image(imageData.width, imageData.height);
    const engineImageBuf = engineImage.data();
    engineImageBuf.set(new Uint32Array(imageData.data.buffer));
    const result = this._engine.loadImage(engineImage);
    engineImage.delete();
    if (result.error) {
      throw new Error("Failed to load image");
    }
    this._imageLoaded = true;
  }
  /**
   * Clear the current image and text recognition results.
   *
   * This will clear the loaded image data internally, but keep the text
   * recognition model loaded.
   *
   * At present there is no way to shrink WebAssembly memory, so this will not
   * return the memory used by the image to the OS/browser. To release memory,
   * the `OCREngine` instance needs to be destroyed via {@link destroy}.
   */
  clearImage() {
    this._engine.clearImage();
    this._imageLoaded = false;
  }
  /**
   * Perform layout analysis on the current image, if not already done, and
   * return bounding boxes for a given unit of text.
   *
   * This operation is relatively cheap compared to text recognition, so can
   * provide much faster results if only the location of lines/words etc. on
   * the page is required, not the text content. This operation can also be
   * performed before a text recognition model is loaded.
   *
   * This method may return a different number/positions of words on a line
   * compared to {@link getTextBoxes} due to the simpler analysis. After full
   * OCR has been performed by {@link getTextBoxes} or {@link getText}, this
   * method should return the same results.
   */
  getBoundingBoxes(unit) {
    this._checkImageLoaded();
    const textUnit = this._textUnitForUnit(unit);
    return jsArrayFromStdVector(this._engine.getBoundingBoxes(textUnit));
  }
  /**
   * Perform layout analysis and text recognition on the current image, if
   * not already done, and return bounding boxes and text content for a given
   * unit of text.
   *
   * A text recognition model must be loaded with {@link loadModel} before this
   * is called.
   */
  getTextBoxes(unit, onProgress) {
    this._checkImageLoaded();
    this._checkModelLoaded();
    const textUnit = this._textUnitForUnit(unit);
    return jsArrayFromStdVector(this._engine.getTextBoxes(textUnit, (progress) => {
      var _a;
      onProgress === null || onProgress === void 0 ? void 0 : onProgress(progress);
      (_a = this._progressChannel) === null || _a === void 0 ? void 0 : _a.postMessage({ progress });
    }));
  }
  /**
   * Perform layout analysis and text recognition on the current image, if
   * not already done, and return the page text as a string.
   *
   * A text recognition model must be loaded with {@link loadModel} before this
   * is called.
   */
  getText(onProgress) {
    this._checkImageLoaded();
    this._checkModelLoaded();
    return this._engine.getText((progress) => {
      var _a;
      onProgress === null || onProgress === void 0 ? void 0 : onProgress(progress);
      (_a = this._progressChannel) === null || _a === void 0 ? void 0 : _a.postMessage({ progress });
    });
  }
  /**
   * Perform layout analysis and text recognition on the current image, if
   * not already done, and return the page text in hOCR format.
   *
   * A text recognition model must be loaded with {@link loadModel} before this
   * is called.
   */
  getHOCR(onProgress) {
    this._checkImageLoaded();
    this._checkModelLoaded();
    return this._engine.getHOCR((progress) => {
      var _a;
      onProgress === null || onProgress === void 0 ? void 0 : onProgress(progress);
      (_a = this._progressChannel) === null || _a === void 0 ? void 0 : _a.postMessage({ progress });
    });
  }
  /**
   * Attempt to determine the orientation of the document image in degrees.
   *
   * This currently uses a simplistic algorithm [1] which is designed for
   * non-uppercase Latin text. It will likely perform badly for other scripts or
   * if the text is all uppercase.
   *
   * [1] See http://www.leptonica.org/papers/skew-measurement.pdf
   */
  getOrientation() {
    this._checkImageLoaded();
    return this._engine.getOrientation();
  }
  _checkModelLoaded() {
    if (!this._modelLoaded) {
      throw new Error("No text recognition model loaded");
    }
  }
  _checkImageLoaded() {
    if (!this._imageLoaded) {
      throw new Error("No image loaded");
    }
  }
  _textUnitForUnit(unit) {
    const { TextUnit } = this._tesseractLib;
    switch (unit) {
      case "word":
        return TextUnit.Word;
      case "line":
        return TextUnit.Line;
      default:
        throw new Error("Invalid text unit");
    }
  }
};
function wasmSIMDSupported() {
  const simdTest = Uint8Array.from([
    0,
    97,
    115,
    109,
    1,
    0,
    0,
    0,
    1,
    5,
    1,
    96,
    0,
    1,
    123,
    3,
    2,
    1,
    0,
    10,
    10,
    1,
    8,
    0,
    65,
    0,
    253,
    15,
    253,
    98,
    11
  ]);
  return WebAssembly.validate(simdTest);
}
function resolve(path, baseURL) {
  return new URL(path, baseURL).href;
}
function supportsFastBuild() {
  return wasmSIMDSupported();
}
async function createOCREngine({ wasmBinary, progressChannel } = {}) {
  if (!wasmBinary) {
    const wasmPath = supportsFastBuild() ? "./tesseract-core.wasm" : "./tesseract-core-fallback.wasm";
    const wasmURL = resolve(wasmPath, import.meta.url);
    const wasmBinaryResponse = await fetch(wasmURL);
    wasmBinary = await wasmBinaryResponse.arrayBuffer();
  }
  const tessLib = await Module({ wasmBinary });
  return new OCREngine(tessLib, progressChannel);
}

// src/engine.mjs
var import_word_extractor = __toESM(require_word(), 1);

// src/archive.mjs
var import_yauzl = __toESM(require_yauzl2(), 1);
import { crc32 } from "node:zlib";

// src/limits.mjs
var LIMITS = Object.freeze({
  inputBytes: 100 * 1024 * 1024,
  textBytes: 8 * 1024 * 1024,
  pages: 2e3,
  pixels: 8e6,
  dimension: 4096,
  imageDimension: 1456,
  imageBytes: 4 * 1024 * 1024,
  timeoutMs: 9e4,
  workers: 2
});
function fail(code, message) {
  return Object.assign(new Error(message), { code });
}
function checkedText(text) {
  if (Buffer.byteLength(text, "utf8") > LIMITS.textBytes)
    throw fail("DOCUMENT_TEXT_LIMIT", "Extracted text exceeds 8 MiB.");
  return text.replaceAll("\0", "");
}

// src/archive.mjs
function openArchive(bytes) {
  return new Promise((resolve2, reject) => {
    import_yauzl.default.fromBuffer(
      Buffer.from(bytes),
      { lazyEntries: true, autoClose: false, strictFileNames: true },
      (error, zip) => {
        if (error) return reject(fail("INVALID_ZIP", "The ZIP archive is damaged or unsupported."));
        const entries = [], names = /* @__PURE__ */ new Set();
        let settled = false;
        const refuse = (error2) => {
          if (settled) return;
          settled = true;
          zip.close();
          reject(error2);
        };
        zip.on("error", () => refuse(fail("INVALID_ZIP", "The ZIP archive could not be read.")));
        zip.on("entry", (entry) => {
          const name = entry.fileName, clean = name.endsWith("/") ? name.slice(0, -1) : name;
          const mode = entry.externalFileAttributes >>> 16 & 61440;
          if (!clean || clean.length > 1024 || // biome-ignore lint/suspicious/noControlCharactersInRegex: reject control bytes in archive labels.
          /[\u0000-\u001f\u007f\\:]/u.test(clean) || clean.split("/").some((part) => !part || part === "." || part === "..") || names.has(name) || ![0, 16384, 32768].includes(mode) || entry.generalPurposeBitFlag & 1 || ![0, 8].includes(entry.compressionMethod))
            return refuse(
              fail(
                "UNSAFE_ZIP_ENTRY",
                "The ZIP contains an unsafe, duplicate, encrypted or unsupported entry."
              )
            );
          names.add(name);
          if (!Number.isSafeInteger(entry.uncompressedSize) || entry.uncompressedSize < 0)
            return refuse(fail("INVALID_ZIP", "The ZIP entry has an invalid declared size."));
          entries.push(entry);
          zip.readEntry();
        });
        zip.on("end", () => {
          if (settled) return;
          settled = true;
          resolve2({ entries, close: () => zip.close(), read: (name) => readEntry(zip, entries, name) });
        });
        zip.readEntry();
      }
    );
  });
}
function readEntry(zip, entries, name) {
  const entry = entries.find((item) => item.fileName === name);
  if (!entry || entry.fileName.endsWith("/"))
    throw fail("ZIP_ENTRY_NOT_FOUND", "Select a file using its exact name from the ZIP listing.");
  if (entry.uncompressedSize > LIMITS.inputBytes)
    throw fail("DOCUMENT_SIZE_LIMIT", "The selected document exceeds the reader's 100 MiB input budget.");
  return new Promise((resolve2, reject) => {
    zip.openReadStream(entry, (error, stream) => {
      if (error) return reject(fail("ZIP_ENTRY_READ_FAILED", "The selected ZIP entry could not be read."));
      const chunks = [];
      let size = 0, checksum = 0;
      stream.on("error", () => reject(fail("ZIP_ENTRY_READ_FAILED", "The selected ZIP entry is damaged.")));
      stream.on("data", (chunk) => {
        size += chunk.length;
        if (size > entry.uncompressedSize || size > LIMITS.inputBytes) {
          stream.destroy(
            fail(
              "ZIP_ENTRY_READ_FAILED",
              "Expanded entry exceeds its declared size or the reader input budget."
            )
          );
          return;
        }
        chunks.push(chunk);
        checksum = crc32(chunk, checksum);
      });
      stream.on("end", () => {
        if (size !== entry.uncompressedSize)
          return reject(fail("ZIP_ENTRY_READ_FAILED", "The ZIP entry length is invalid."));
        if (checksum !== entry.crc32)
          return reject(fail("ZIP_ENTRY_READ_FAILED", "The ZIP entry checksum is invalid."));
        resolve2(Buffer.concat(chunks, size));
      });
    });
  });
}

// src/png.mjs
import { crc32 as crc322, deflateSync } from "node:zlib";
function pagePng({ width, height, data }) {
  const chunk = (type, bytes) => {
    const out = Buffer.alloc(bytes.length + 12);
    out.writeUInt32BE(bytes.length);
    out.write(type, 4, "ascii");
    out.set(bytes, 8);
    out.writeUInt32BE(crc322(out.subarray(4, bytes.length + 8)), bytes.length + 8);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const stride = width * 3 + 1;
  const rows = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const source = (y * width + x) * 4;
      const target = y * stride + 1 + x * 3;
      rows[target] = data[source];
      rows[target + 1] = data[source + 1];
      rows[target + 2] = data[source + 2];
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

// src/engine.mjs
var isZip = (bytes) => bytes[0] === 80 && bytes[1] === 75 && [3, 5, 7].includes(bytes[2]);
var isDoc = (bytes) => Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([208, 207, 17, 224, 161, 177, 26, 225]));
var isPdf = (bytes) => Buffer.from(bytes.subarray(0, 1024)).includes(Buffer.from("%PDF-"));
var isWordArchive = (entries) => ["[Content_Types].xml", "word/document.xml"].every(
  (name) => entries.some((entry) => entry.fileName === name)
);
async function parseDocument(bytes, args, assets) {
  if (!["auto", "text", "image"].includes(args.mode ?? "auto"))
    throw fail("DOCUMENT_MODE_UNSUPPORTED", "Select auto, text or image mode.");
  if (!bytes.length) {
    requireTextMode(args);
    return { format: "text", text: "", note: "Empty file." };
  }
  if (isZip(bytes)) {
    const zip = await openArchive(bytes);
    try {
      if (isWordArchive(zip.entries)) {
        requireTextMode(args);
        if (args.entry)
          throw fail("ENTRY_REQUIRES_ZIP", "The entry parameter is for ZIP archives, not Word documents.");
        return await readWord(bytes, "docx");
      }
      if (!args.entry) {
        requireTextMode(args);
        return {
          format: "zip",
          text: zip.entries.map((entry) => `${JSON.stringify(entry.fileName)} (${entry.uncompressedSize} bytes)`).join("\n"),
          note: "ZIP listing only. Call document_read again with entry set to an exact file name to inspect its contents."
        };
      }
      const selected = await zip.read(args.entry);
      if (isZip(selected)) {
        const child = await openArchive(selected);
        try {
          if (!isWordArchive(child.entries))
            throw fail(
              "NESTED_ZIP_UNSUPPORTED",
              "Nested ZIP archives are not expanded recursively. Upload the inner archive separately."
            );
        } finally {
          child.close();
        }
      }
      return await parseDocument(selected, { ...args, entry: void 0 }, assets);
    } finally {
      zip.close();
    }
  }
  if (args.entry) throw fail("ENTRY_REQUIRES_ZIP", "The entry parameter requires a ZIP archive.");
  if (isPdf(bytes)) return readPdf(bytes, args, assets);
  requireTextMode(args);
  if (isDoc(bytes)) return readWord(bytes, "doc");
  if (/^(audio|video|image)\//iu.test(args.mimeType ?? ""))
    throw fail(
      "DOCUMENT_FORMAT_UNSUPPORTED",
      "This document reader does not interpret image, audio or video files. Use the available image/media tools."
    );
  try {
    const encoding = bytes[0] === 255 && bytes[1] === 254 ? "utf-16le" : bytes[0] === 254 && bytes[1] === 255 ? "utf-16be" : "utf-8";
    const text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
    if (/[\u0000-\u0008\u000b\u000e-\u001f]/u.test(text)) throw new Error("binary");
    return {
      format: "text",
      text: checkedText(text),
      note: "Plain text; HTML and document instructions are not executed."
    };
  } catch (error) {
    if (error.code === "DOCUMENT_TEXT_LIMIT") throw error;
    throw fail(
      "DOCUMENT_FORMAT_UNSUPPORTED",
      "The bytes are neither a supported document nor valid UTF-8/BOM UTF-16 text."
    );
  }
}
function requireTextMode(args) {
  if (args.mode === "image")
    throw fail(
      "DOCUMENT_IMAGE_REQUIRES_PDF",
      "Image mode requires a PDF page, including a selected PDF inside ZIP."
    );
}
async function renderPage(page, dimension) {
  const { originalWidth, originalHeight } = page.getOriginalSize();
  if (![originalWidth, originalHeight].every((size) => Number.isFinite(size) && size > 0))
    throw fail("DOCUMENT_PAGE_SIZE", "PDF page dimensions are invalid.");
  const scale = Math.min(
    2.5,
    dimension / Math.max(originalWidth, originalHeight),
    Math.sqrt(LIMITS.pixels / (originalWidth * originalHeight))
  );
  if (!Number.isFinite(scale) || scale <= 0 || Math.floor(originalWidth * scale) < 1 || Math.floor(originalHeight * scale) < 1)
    throw fail("DOCUMENT_PAGE_SIZE", "PDF page dimensions cannot be rendered safely.");
  const bitmap = await page.render({ scale, render: "bitmap", colorSpace: "BGRA", transparent: false });
  if (bitmap.width * bitmap.height > LIMITS.pixels || Math.max(bitmap.width, bitmap.height) > dimension || bitmap.data.length !== bitmap.width * bitmap.height * 4)
    throw fail("DOCUMENT_PIXEL_LIMIT", "Rendered PDF page exceeds the pixel limit or has invalid pixels.");
  return bitmap;
}
async function readWord(bytes, format) {
  const document2 = await new import_word_extractor.default().extract(Buffer.from(bytes));
  const sections = [
    ["Body and tables", document2.getBody()],
    ["Headers", document2.getHeaders({ includeFooters: false })],
    ["Footers", document2.getFooters()],
    ["Footnotes", document2.getFootnotes()],
    ["Endnotes", document2.getEndnotes()],
    ["Text boxes", document2.getTextboxes()]
  ].filter(([, text]) => text?.trim());
  return {
    format,
    text: checkedText(sections.map(([label, text]) => `[${label}]
${text}`).join("\n\n")),
    note: "Extracted Word text. Layout and embedded pictures are not interpreted; macros and links are not executed."
  };
}
async function readPdf(bytes, args, assets) {
  const wasm = await readFile(new URL("pdfium.wasm", assets));
  const library = await PDFiumLibrary2.init({
    wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength)
  });
  let document2;
  try {
    document2 = await library.loadDocument(bytes);
    const totalPages = document2.getPageCount(), pageNumber = args.page ?? 1;
    if (totalPages > LIMITS.pages) throw fail("DOCUMENT_PAGE_LIMIT", "PDF exceeds the 2000-page limit.");
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > totalPages)
      throw fail("DOCUMENT_PAGE_NOT_FOUND", `PDF has ${totalPages} pages.`);
    const page = document2.getPage(pageNumber - 1);
    let text = page.getText(), method = "embedded text";
    let bitmap;
    const mode = args.mode ?? "auto";
    if (mode !== "image" && (args.ocr === "always" || args.ocr !== "off" && !text.trim())) {
      const language = args.language ?? "chi_sim";
      if (!["chi_sim", "eng"].includes(language))
        throw fail("DOCUMENT_LANGUAGE_UNSUPPORTED", "Select the bundled chi_sim or eng OCR model.");
      bitmap = await renderPage(page, LIMITS.dimension);
      const rgba = Uint8ClampedArray.from(bitmap.data);
      const ocrWasm = await readFile(
        new URL(supportsFastBuild() ? "tesseract-core.wasm" : "tesseract-core-fallback.wasm", assets)
      );
      const engine = await createOCREngine({
        wasmBinary: ocrWasm.buffer.slice(ocrWasm.byteOffset, ocrWasm.byteOffset + ocrWasm.byteLength)
      });
      try {
        engine.loadModel(await readFile(new URL(`${language}.traineddata`, assets)));
        engine.loadImage({ data: rgba, width: bitmap.width, height: bitmap.height });
        text = engine.getText();
        method = "OCR (may contain recognition errors)";
      } finally {
        engine.destroy();
      }
    }
    let image;
    if (mode === "image" || mode === "auto" && !text.trim()) {
      if (!bitmap || Math.max(bitmap.width, bitmap.height) > LIMITS.imageDimension)
        bitmap = await renderPage(bitmap ? document2.getPage(pageNumber - 1) : page, LIMITS.imageDimension);
      let encoded = pagePng(bitmap);
      if (encoded.length > LIMITS.imageBytes) {
        bitmap = await renderPage(document2.getPage(pageNumber - 1), 1024);
        encoded = pagePng(bitmap);
      }
      if (encoded.length > LIMITS.imageBytes)
        throw fail("DOCUMENT_IMAGE_LIMIT", "Rendered PDF page exceeds the image byte limit.");
      image = Uint8Array.from(encoded);
    }
    return {
      format: "pdf",
      text: checkedText(text),
      ...image ? { image } : {},
      note: `PDF page ${pageNumber}/${totalPages}; ${method}. ${!text.trim() ? "No text recognized; this does not prove the page is blank. " : ""}${image ? "Page image saved; inspect only when an image block is supplied in this request. If absent, explain that visual content is unavailable to this model; select an image-capable model. " : "Use mode=image to inspect pictures, charts or layout. "}${pageNumber < totalPages ? `Call document_read with page=${pageNumber + 1} for the next page.` : "Last page."}`
    };
  } finally {
    document2?.destroy();
    library.destroy();
  }
}
export {
  parseDocument
};
/*! Bundled license information:

xmlchars/xml/1.0/ed5.js:
  (**
   * Character classes and associated utilities for the 5th edition of XML 1.0.
   *
   * @author Louis-Dominique Dubeau
   * @license MIT
   * @copyright Louis-Dominique Dubeau
   *)

xmlchars/xml/1.1/ed2.js:
  (**
   * Character classes and associated utilities for the 2nd edition of XML 1.1.
   *
   * @author Louis-Dominique Dubeau
   * @license MIT
   * @copyright Louis-Dominique Dubeau
   *)

xmlchars/xmlns/1.0/ed3.js:
  (**
   * Character class utilities for XML NS 1.0 edition 3.
   *
   * @author Louis-Dominique Dubeau
   * @license MIT
   * @copyright Louis-Dominique Dubeau
   *)

tesseract-wasm/dist/lib.js:
tesseract-wasm/dist/lib.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)
*/
