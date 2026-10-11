// ESLint 9 flat config —— 需求 §15「CI 质量门：类型检查 + Lint + 构建 + 测试」、§16 DoD 同款要求。
//
// 为什么用**类型感知**规则（`recommendedTypeChecked`）而非仅语法规则：
// 本项目的 bug 多数不是语法错，而是「把可能为 undefined 当有值用」这类
// ——tsc 在 `strict` + `noUncheckedIndexedAccess` 下能挡住一部分，
// 但 ESLint 能把「不必要的非空断言」「any 泄漏」「未处理的 Promise」显式标出来，
// 且**报错信息直接指向修复动作**，这在赶工时比"再看一眼类型"有用。
//
// 分层策略（避免"全开→ 改不动"的死局）：
//   - `src` / `test` / `scripts`：开类型感知规则，零豁免起步；
//   - 先跑一次看真实问题量，再决定是否需要分级 warn。
//     刻意**不写 `any` 豁免**——豁免一旦写下就会被当成垃圾桶，
//     而 §16 要求的是"Lint 通过"，不是"Lint 存在"。

import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/data/**',
      '**/runs/**',
      // 类型声明（paths 映射用，不参与运行）
      'apps/bff/types/**',
      // 生成的产物
      '**/*.d.ts',
    ],
  },

  js.configs.recommended,

  // ── TypeScript 基础（含类型感知）────────────────────────────────
  ...tseslint.configs.recommendedTypeChecked,

  // ── 全局：Node 环境，测试用 vitest 的全局（describe/it/expect）──────
  {
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
      },
      parserOptions: {
        // ⚠️ 必须显式指向**检查期** tsconfig（含 test/ 与 scripts/），
        // 不能靠 projectService 自动发现——它默认读 tsconfig.json（运行期那个，只含 src），
        // 于是 test/scripts 全报"was not found by the project service"。
        //
        // 用了检查期配置，类型感知规则才能看到测试代码的类型信息；
        // 也顺带保证了「Lint 与 tsc 检查的是同一批文件」（§15 要求三者一致）。
        project: ['./apps/bff/tsconfig.check.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // ── 需求 §11：密钥绝不入库、不回显明文 ──
      // 这条不是洁癖：密钥泄漏进日志或响应体是**安全事件**，
      // 而 grep 很难在review 时可靠地拦住它，所以交给工具。
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name=/^(log|console\\.(log|info|warn|error|debug))$/] > ObjectExpression > Property[key.name=/KEY|TOKEN|SECRET|PASSWORD|APIKEY/i]',
          message: '疑似把密钥类字段打进日志（§11 密钥绝不回显）。请改为只记录 (已设置)/(未设置)。',
        },
      ],

      // ── 可复现性红线：产物哈希与时间戳参与账本，不能随手 console ──
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // ── 正确性高价值规则 ──
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // 非空断言是"我确定不是 undefined"的主张。用多了等于关掉 strict。
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      // 空catch 会吞掉真实故障（本项目多处on('error') 回调，必须显式处理）
      'no-empty': ['error', { allowEmptyCatch: false }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

// ── Fastify 路由层 ──
// handler 必须是 `async`（Fastify 约定返回 Promise），但部分 handler 直接 return
// 同步值或抛 ApiError（本项目大量使用 `throw` 而非 `reply.code().send()`），
// 于是没有 await → require-await 误报。
//
// 逐个加 disable 注释会把11 处噪音留在代码里，反而掩盖真问题；
// 故按目录整体豁免，并在上面写清原因——豁免要能解释，不能只是压制。
{
    files: ['apps/bff/src/routes/**/*.ts', 'apps/bff/src/agh/gateway.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
    },
  },

  // ── Exporter SPI ──
  // `export` 必须返回 Promise（SPI 契约统一为异步），当前三个导出器内部都是同步的。
  // **这是刻意的接口预留**：未来 PDF/云端导出器必然要流式或联网，
  // 现在就把签名定为 async，比以后改契约（波及所有调用方）便宜得多。
  {
    files: ['apps/bff/src/export/service.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
    },
  },

  // ── /api信息端点 ──
  {
    files: ['apps/bff/src/app.ts'],
    rules: {
      // app.get 的 handler 同样是 Fastify 约定（可能返回 Promise）。
      // 这条按文件豁免过宽，故改为下面在代码处inline豁免 + 理由。
      '@typescript-eslint/require-await': 'error',
    },
  },

  // ── 测试文件：允许 console 输出、宽松非空断言（断言里`x!.y` 是常规写法）────
  {
    files: ['apps/bff/test/**/*.ts', 'apps/bff/scripts/**/*.ts', 'apps/bff/scripts/**/*.mts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-syntax': 'off',
      // 测试的**本质**就是构造非法/边界输入，因此必然大量使用
      // `as unknown as X` / `as never` 来绕过类型系统。
      // 关掉随之而来的连锁告警（unsafe-member-access / unsafe-assignment /
      // unsafe-argument）：它们不是"又一个问题"，而是"故意做了这件事"的结果，
      // 留着只会淹没真正该看的告警。
      //
      // ⚠️ 边界要清楚：这里只关 `no-unsafe-*`（断言的**后果**），
      //    不关 `no-unnecessary-type-assertion`（断言本身该被质疑）与 parser 错误。
      //    否则"断言写错了"就再也看不见了。
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      // vitest 的 mock 常用 `() => { throw ... }` 作为永不返回的实现
      '@typescript-eslint/require-await': 'off',
    },
  },

  // ── 启动器/脚本（.mjs）：无 TS 项目上下文，关掉类型感知规则 ──
  // 必须用 `tseslint.configs.disableTypeChecked` **整个对象**（它自带
  // parserOptions 与全部类型感知规则的关闭列表）。
  // 我试过手抄规则名列表 —— 漏一条就报"requires type information"，
  // 而且漏的规则会随typescript-eslint 版本变化。
  // 结论：这种"整包关掉"的需求，直接用官方提供的配置对象，别手搓。
  tseslint.configs.disableTypeChecked,
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        AbortController: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      // 这些脚本里大量空 catch 是在"清理路径"或"探测是否存在"，
      // 属于有意为之；有副作用的操作都有日志。
      'no-empty': 'off',
    },
  },
)