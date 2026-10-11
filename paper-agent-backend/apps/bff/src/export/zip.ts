import { deflateRawSync, inflateRawSync } from 'node:zlib'

/**
 * 最小 ZIP 写入器（零第三方依赖，仅用 Node 内置 zlib）。
 *
 * 为什么自己写：项目依赖只有 typescript/tsx/vitest/@types（见 package.json），
 * 为导出审计包引入一个压缩库不划算；ZIP 容器格式简单且稳定。
 *
 * 实现要点（APPNOTE 6.3.x）：
 * - 本地文件头（0x04034b50）+ 数据 + 中央目录 + EOCD；
 * - 采用 **store(0)** 或 **deflate(8)**：文本类文件用 deflate（审计包以 md/jsonl 为主，压缩率高），
 *   二进制/已压缩文件用 store；
 * - 不使用 Zip64（本场景文件数与体积远小于 4GB/65535 条上限）；
 * - 文件名统一 UTF-8 并置general purpose bit 11（0x0800），确保中文名在各解压工具下正确显示。
 *
 * 校验：写入后由调用方用 `unzip -t` 或 Node 侧回读验证（本文件末尾附自检思路）。
 */

export type ZipEntry = {
  /** 包内相对路径（建议正斜杠） */
  name: string
  content: Buffer | string
  /** true = 仅存储不压缩（二进制/已压缩内容） */
  store?: boolean
}

type Prepared = {
  nameBuf: Buffer
  crc: number
  compressed: Buffer
  method: number
  uncompressedSize: number
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

/** 标准 CRC-32（APPNOTE 4.4.7） */
export function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function prepare(entry: ZipEntry): Prepared {
  const raw = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content, 'utf8')
  const method = entry.store ? 0 : 8
  const compressed = method === 0 ? raw : deflateRawSync(raw, { level: 9 })
  return {
    nameBuf: Buffer.from(entry.name.replace(/\\/g, '/'), 'utf8'),
    crc: crc32(raw),
    compressed,
    method,
    uncompressedSize: raw.length,
  }
}

/** 生成 ZIP 归档（Buffer） */
export function buildZip(entries: ZipEntry[]): Buffer {
  const prepared = entries.map(prepare)
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0

  for (const p of prepared) {
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0) // local file header signature
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0x0800, 6) // flags: UTF-8 filename
    local.writeUInt16LE(p.method, 8)
    local.writeUInt16LE(0, 10) // mod time（固定值，保证同样输入 → 同样字节，见下）
    local.writeUInt16LE(0x21, 12) // mod date = 1980-01-01（固定）
    local.writeUInt32LE(p.crc, 14)
    local.writeUInt32LE(p.compressed.length, 18)
    local.writeUInt32LE(p.uncompressedSize, 22)
    local.writeUInt16LE(p.nameBuf.length, 26)
    local.writeUInt16LE(0, 28) // extra length
    locals.push(local, p.nameBuf, p.compressed)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0) // central directory header signature
    central.writeUInt16LE(20, 4) // version made by
    central.writeUInt16LE(20, 6) // version needed
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(p.method, 10)
    central.writeUInt16LE(0, 12) // time
    central.writeUInt16LE(0x21, 14) // date
    central.writeUInt32LE(p.crc, 16)
    central.writeUInt32LE(p.compressed.length, 20)
    central.writeUInt32LE(p.uncompressedSize, 24)
    central.writeUInt16LE(p.nameBuf.length, 28)
    central.writeUInt16LE(0, 30) // extra
    central.writeUInt16LE(0, 32) // comment
    central.writeUInt16LE(0, 34) // disk number start
    central.writeUInt16LE(0, 36) // internal attrs
    central.writeUInt32LE(0, 38) // external attrs
    central.writeUInt32LE(offset, 42) // relative offset of local header
    centrals.push(central, p.nameBuf)

    offset += local.length + p.nameBuf.length + p.compressed.length
  }

  const centralBuf = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // EOCD signature
  eocd.writeUInt16LE(0, 4) // disk number
  eocd.writeUInt16LE(0, 6) // disk with central dir
  eocd.writeUInt16LE(prepared.length, 8)
  eocd.writeUInt16LE(prepared.length, 10)
  eocd.writeUInt32LE(centralBuf.length, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20) // comment length

  return Buffer.concat([...locals, centralBuf, eocd])
}

/** 从 ZIP 回读单个条目（仅支持 store/deflate），用于自检与测试 */
export function readZipEntry(zip: Buffer, targetName: string): Buffer | null {
  // 扫描中央目录（从尾部反向找EOCD）
  let eocd = -1
  for (let i = zip.length - 22; i >= 0; i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return null
  const count = zip.readUInt16LE(eocd + 10)
  let ptr = zip.readUInt32LE(eocd + 16)

  for (let i = 0; i < count; i++) {
    if (zip.readUInt32LE(ptr) !== 0x02014b50) return null
    const method = zip.readUInt16LE(ptr + 10)
    const compressedSize = zip.readUInt32LE(ptr + 20)
    const nameLen = zip.readUInt16LE(ptr + 28)
    const extraLen = zip.readUInt16LE(ptr + 30)
    const commentLen = zip.readUInt16LE(ptr + 32)
    const localOffset = zip.readUInt32LE(ptr + 42)
    const name = zip.subarray(ptr + 46, ptr + 46 + nameLen).toString('utf8')

    if (name === targetName) {
      const localNameLen = zip.readUInt16LE(localOffset + 26)
      const localExtraLen = zip.readUInt16LE(localOffset + 28)
      const dataStart = localOffset + 30 + localNameLen + localExtraLen
      const data = zip.subarray(dataStart, dataStart + compressedSize)
      return method === 0 ? data : inflateRawSync(data)
    }
    ptr += 46 + nameLen + extraLen + commentLen
  }
  return null
}