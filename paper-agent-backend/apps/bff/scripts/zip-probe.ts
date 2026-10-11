import { buildZip, readZipEntry } from '../src/export/zip.js'
import { writeFileSync } from 'node:fs'

const zip = buildZip([
  { name: 'audit/report.md', content: '# 标题\n中文内容测试\n'.repeat(50) },
  { name: 'audit/manifest.json', content: JSON.stringify({ ok: true }) },
  { name: 'audit/nested/deep.txt', content: 'deep'.repeat(200), store: false },
])
writeFileSync('D:/workBubbyStore/paper-agent-2/data/_zip_test.zip', zip)
console.log('roundtrip:', readZipEntry(zip, 'audit/manifest.json')?.toString('utf8'))
console.log('deep:', readZipEntry(zip, 'audit/nested/deep.txt')?.toString('utf8').slice(0, 8))
console.log('size:', zip.length)