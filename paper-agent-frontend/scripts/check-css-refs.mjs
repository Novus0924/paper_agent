import fs from 'fs';
import path from 'path';

const root = process.cwd();
const stylesDir = path.join(root, 'src/styles');
const classes = {};
for (const f of fs.readdirSync(stylesDir)) {
  if (!f.endsWith('.module.css')) continue;
  const src = fs.readFileSync(path.join(stylesDir, f), 'utf8');
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const set = new Set();
  for (const m of clean.matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)/g)) set.add(m[1]);
  classes[f.replace('.module.css', '')] = set;
}

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(e.name)) files.push(p);
  }
})(path.join(root, 'src'));

let bad = 0;
for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  // 先记录 import 别名，再把字符串字面量抹掉：避免把 t('monitor.thinking') 之类当成 monitor.thinking
  const imports = {};
  for (const m of raw.matchAll(/import\s+([A-Za-z]\w*)\s+from\s+['"]@\/styles\/([\w-]+)\.module\.css['"]/g)) {
    imports[m[1]] = m[2];
  }
  const src = raw.replace(/(['"`])(?:\\.|(?!\1)[\s\S])*\1/g, "''");
  for (const [id, mod] of Object.entries(imports)) {
    const defined = classes[mod];
    if (!defined) {
      console.log('MISSING MODULE ' + mod + ' in ' + path.relative(root, f));
      bad += 1;
      continue;
    }
    const re = new RegExp('\\b' + id + '\\.([A-Za-z][A-Za-z0-9_]*)', 'g');
    for (const m of src.matchAll(re)) {
      if (!defined.has(m[1])) {
        console.log(path.relative(root, f) + ': ' + id + '.' + m[1] + ' not defined in ' + mod + '.module.css');
        bad += 1;
      }
    }
  }
}
console.log(bad === 0 ? 'OK: all css-module class references resolve' : 'total problems: ' + bad);
