/**
 * 同步 spawn 垫片（本机已知坑 workaround）。
 *
 * 背景：本机（WorkBuddy 托管环境）里 Node 的同步 spawn（spawnSync/execFileSync/
 * execSync）一律返回 EBUSY（errno -4082），MessagePort transfer 也会挂起；
 * 异步 spawn 与文件 IO 正常——paper-agent-backend 的代码已全部按"一律异步"
 * 改造（见 README §720、doctor.mjs），但 agnes-harness 的**构建工具链**
 * （build-local.ts / build-native.mjs 等）仍大量使用 execFileSync，且 AGH
 * 仓库对本项目是只读引用、不允许改源码。
 *
 * 本文件以 `node --require` 预加载方式注入：把 child_process 的三个同步 API
 * 替换为「worker_threads + Atomics.wait + 临时文件回传」的真同步桥，内部用
 * 异步 spawn 实现。语义对齐 Node 官方文档：status/signal/stdout/stderr/error、
 * encoding、timeout、killSignal、maxBuffer、stdio inherit/ignore/pipe、input、
 * cwd/env/windowsHide/windowsVerbatimArguments/detached/shell。
 *
 * 通道设计（规避本机两个坑）：
 *   - 同步唤醒：SharedArrayBuffer + Atomics.wait（经 workerData 传入，无 transfer）
 *   - 结果回传：worker 写临时 JSON 文件，主线程 readFileSync 读回（任意大小）
 *   - stdio 'inherit'：worker 内捕获 → 主线程 fs.writeSync(1/2) 直写真实 fd
 *
 * 安全性：加载时先探测本机同步 spawn 是否真的损坏，正常环境**零侵入**；
 * 可用 AGNES_SPAWN_SHIM=0 强制关闭；重复加载幂等。
 *
 * 用法（在需要构建 AGH CLI 的 shell 中）：
 *   export NODE_OPTIONS="--require <backend 仓库>/scripts/sync-spawn-shim.cjs"
 */
'use strict'

/* eslint-disable @typescript-eslint/no-require-imports */
const cp = require('node:child_process')

if (!cp.__spawnShimApplied) {
  const disabled = process.env.AGNES_SPAWN_SHIM === '0'

  // 探测：本机同步 spawn 是否可用（正常机器零侵入）
  let broken = false
  if (!disabled) {
    try {
      const probe = cp.spawnSync(process.execPath, ['-e', 'process.exit(0)'], { timeout: 10_000 })
      broken = probe.error != null || probe.status !== 0
    } catch {
      broken = true
    }
  }

  if (broken) {
    const { Worker } = require('node:worker_threads')
    const fs = require('node:fs')
    const os = require('node:os')
    const path = require('node:path')

    const WORKER_SRC = `
      const { parentPort, workerData } = require('node:worker_threads')
      const fs = require('node:fs')
      const cp = require('node:child_process')

      parentPort.on('message', (job) => {
        try {
          run(job)
        } catch (err) {
          done({ fatal: serializeError(err) })
        }
      })

      function run(job) {
        const opts = job.options
        let stdio = normalizeStdio(opts.stdio)
        const inheritEcho = stdio === 'inherit' || (Array.isArray(stdio) && stdio.some((s) => s === 'inherit'))
        if (inheritEcho) stdio = ['ignore', 'pipe', 'pipe']

        let child
        try {
          child = cp.spawn(job.command, job.args, { ...opts, stdio, shell: job.useShell })
        } catch (err) {
          return done({ error: serializeError(err), status: null, signal: null })
        }

        const capOut = Array.isArray(stdio) ? stdio[1] === 'pipe' : true
        const capErr = Array.isArray(stdio) ? stdio[2] === 'pipe' : true
        const outChunks = capOut ? [] : null
        const errChunks = capErr ? [] : null
        let outLen = 0, errLen = 0, exceeded = false
        const maxBuffer = typeof opts.maxBuffer === 'number' && opts.maxBuffer > 0 ? opts.maxBuffer : 64 * 1024 * 1024

        let timer = null
        let timedOut = false
        if (typeof opts.timeout === 'number' && opts.timeout > 0) {
          timer = setTimeout(() => { timedOut = true; child.kill(opts.killSignal || 'SIGTERM') }, opts.timeout)
        }
        if (opts.input != null && child.stdin) {
          child.stdin.end(opts.input)
        } else if (Array.isArray(stdio) && stdio[0] === 'pipe' && child.stdin) {
          child.stdin.end()
        }

        child.on('error', (err) => {
          if (timer) clearTimeout(timer)
          done({ error: serializeError(err), status: null, signal: null })
        })
        if (child.stdout && capOut) child.stdout.on('data', (d) => { outLen += d.length; if (outLen <= maxBuffer) outChunks.push(d); else exceeded = true })
        if (child.stderr && capErr) child.stderr.on('data', (d) => { errLen += d.length; if (errLen <= maxBuffer) errChunks.push(d); else exceeded = true })
        child.on('close', (status, signal) => {
          if (timer) clearTimeout(timer)
          const result = {
            pid: child.pid,
            status,
            signal: timedOut && !signal ? (opts.killSignal || 'SIGTERM') : signal,
          }
          if (capOut) result.stdout = Buffer.concat(outChunks)
          if (capErr) result.stderr = Buffer.concat(errChunks)
          if (exceeded) result.error = serializeError(Object.assign(new Error('spawnSync ENOBUFS'), { code: 'ENOBUFS', errno: -105 }))
          done(result)
        })
      }

      function done(result) {
        // 结果写临时文件（JSON 序列化含 Buffer data 数组），再 SAB 唤醒主线程
        fs.writeFileSync(workerData.resultFile, JSON.stringify(result))
        Atomics.store(workerData.ack, 0, 1)
        Atomics.notify(workerData.ack, 0)
      }

      function normalizeStdio(stdio) {
        if (stdio == null) return ['pipe', 'pipe', 'pipe']
        if (stdio === 'ignore') return 'ignore'
        if (typeof stdio === 'string') return stdio
        if (Array.isArray(stdio)) return stdio.map((s) => (s == null ? 'pipe' : s))
        return ['pipe', 'pipe', 'pipe']
      }
      function serializeError(err) {
        if (!err) return undefined
        return { name: err.name, message: err.message, code: err.code, errno: err.errno, syscall: err.syscall, path: err.path, spawnargs: err.spawnargs }
      }
    `

    let jobSeq = 0
    const tmpRoot = path.join(os.tmpdir(), 'sync-spawn-shim')
    try { fs.mkdirSync(tmpRoot, { recursive: true }) } catch { /* 并发创建竞争无碍 */ }

    function runJob(command, args, opts) {
      const resultFile = path.join(tmpRoot, `job-${process.pid}-${jobSeq++}.json`)
      const ack = new Int32Array(new SharedArrayBuffer(4))
      const worker = new Worker(WORKER_SRC, { eval: true, workerData: { resultFile, ack } })
      // 防死锁：worker 异常退出也要唤醒（finish 侧读到缺失文件即抛错）
      const wake = () => {
        Atomics.store(ack, 0, 1)
        Atomics.notify(ack, 0)
      }
      worker.on('error', wake)
      worker.on('exit', (code) => { if (code !== 0) wake() })
      worker.postMessage({ command, args, options: opts, useShell: opts.shell === true || typeof opts.shell === 'string' })
      Atomics.wait(ack, 0, 0)
      worker.terminate()
      let raw
      try {
        raw = fs.readFileSync(resultFile, 'utf8')
      } finally {
        try { fs.unlinkSync(resultFile) } catch { /* 已被清理则忽略 */ }
      }
      if (!raw) throw new Error('[sync-spawn-shim] worker 异常退出且未产出结果文件')
      return JSON.parse(raw)
    }

    function reviveBuffer(v) {
      if (v == null) return Buffer.alloc(0)
      if (v.type === 'Buffer' && Array.isArray(v.data)) return Buffer.from(v.data)
      return v
    }

    function finish(command, result, opts) {
      const encoding = opts.encoding
      const toOut = (v) => {
        const buf = reviveBuffer(v)
        return encoding && encoding !== 'buffer' ? buf.toString(encoding) : buf
      }
      // stdio inherit：主线程把捕获的输出直写真实 fd（fs.writeSync 同步落盘）
      if (opts.__inheritEcho) {
        const out = reviveBuffer(result.stdout)
        const err = reviveBuffer(result.stderr)
        if (out.length) try { fs.writeSync(1, out) } catch { /* EPIPE 等，静默 */ }
        if (err.length) try { fs.writeSync(2, err) } catch { /* 同上 */ }
      }
      let error = null
      if (result.fatal) {
        error = new Error(`[sync-spawn-shim] worker fatal: ${result.fatal.message}`)
      } else if (result.error) {
        error = new Error(result.error.message)
        Object.assign(error, result.error)
      } else if (opts.__execSemantics && result.status !== 0 && result.status != null) {
        // 仅 execFile/execSync 语义在非零退出时合成错误；spawnSync 与 Node 一致只回传 status
        error = new Error(`Command failed: ${command}\n${toOut(result.stderr).toString().trim()}`)
        error.status = result.status
        error.signal = result.signal
        error.errno = result.status
        error.code = String(result.status)
      }
      const stdout = toOut(result.stdout)
      const stderr = toOut(result.stderr)
      return { pid: result.pid ?? undefined, status: result.status ?? null, signal: result.signal ?? null, stdout, stderr, error, output: [null, stdout, stderr] }
    }

    // ---- 替换 spawnSync ----
    cp.spawnSync = function spawnSyncShim(command, args, options) {
      let opts = options
      let realArgs = args
      if (args != null && !Array.isArray(args) && typeof args === 'object') { opts = args; realArgs = [] }
      opts = opts == null ? {} : typeof opts === 'string' ? { encoding: opts } : { ...opts }
      if (opts.stdio === 'inherit' || (Array.isArray(opts.stdio) && opts.stdio.some((s) => s === 'inherit'))) opts.__inheritEcho = true
      const result = runJob(command, realArgs ?? [], opts)
      return finish(command, result, opts)
    }

    // ---- 替换 execFileSync / execFile（回调形式同步桥上退化为一次性回调）----
    function execFileShim(file, args, options, callback) {
      if (typeof options === 'function') { callback = options; options = null }
      if (typeof args === 'function') { callback = args; args = undefined; options = null }
      const opts = options == null ? {} : typeof options === 'string' ? { encoding: options } : { ...options }
      if (opts.stdio === undefined) opts.stdio = 'pipe'
      if (opts.encoding === undefined) opts.encoding = 'utf8'
      opts.__execSemantics = true
      const r = cp.spawnSync(file, Array.isArray(args) ? args : [], opts)
      const err = r.error || (r.status !== 0 ? Object.assign(new Error(`Command failed: ${file}\n${String(r.stderr).trim()}`), { status: r.status, signal: r.signal, errno: r.status, code: String(r.status) }) : null)
      if (typeof callback === 'function') {
        callback(err, r.stdout, r.stderr)
        return
      }
      if (err) {
        // 对齐 execFileSync：错误对象上挂 stdout/stderr 便于调用方诊断
        err.stdout = r.stdout
        err.stderr = r.stderr
        throw err
      }
      return r.stdout
    }
    cp.execFileSync = execFileShim
    cp.execFile = execFileShim

    // ---- 替换 execSync（shell 字符串语义；回调形式为 exec）----
    function execShim(command, options, callback) {
      if (typeof options === 'function') { callback = options; options = null }
      const opts = options == null ? {} : typeof options === 'string' ? { encoding: options } : { ...options }
      if (opts.encoding === undefined) opts.encoding = 'utf8'
      if (opts.stdio === undefined) opts.stdio = ['pipe', 'pipe', 'pipe']
      opts.shell = true // exec 语义：必经 shell
      opts.__execSemantics = true
      const r = cp.spawnSync(command, [], opts)
      // exec 的 output 是 stdout+stderr 合并（此时可能已被解码为字符串，统一转回 Buffer）
      const asBuf = (v) => (typeof v === 'string' ? Buffer.from(v, 'utf8') : reviveBuffer(v))
      const mergedBuf = Buffer.concat([asBuf(r.stdout), asBuf(r.stderr)])
      const merged = opts.encoding && opts.encoding !== 'buffer' ? mergedBuf.toString(opts.encoding) : mergedBuf
      const err = r.error || (r.status !== 0 ? Object.assign(new Error(`Command failed: ${command}`), { status: r.status, signal: r.signal, errno: r.status, code: String(r.status) }) : null)
      if (typeof callback === 'function') {
        callback(err, merged)
        return
      }
      if (err) {
        err.stdout = merged
        err.stderr = merged
        throw err
      }
      return merged
    }
    cp.execSync = execShim
    cp.exec = execShim

    cp.__spawnShimApplied = true
  }
}
