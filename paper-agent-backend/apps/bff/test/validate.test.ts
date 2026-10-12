import { describe, expect, it } from 'vitest'
import { ApiError, errorBody } from '../src/infra/errors.js'
import { validateGoal, validateTaskId, validateEnum, validateSources, GOAL_MAX_LENGTH } from '../src/infra/validate.js'

describe('validateGoal', () => {
  it('去空格后非空即通过', () => {
    expect(validateGoal('  检索固态电解质界面阻抗  ')).toBe('检索固态电解质界面阻抗')
  })
  it('非字符串/空串/超长拒绝（BAD_GOAL）', () => {
    expect(() => validateGoal(123)).toThrowError(/goal 必须是字符串/)
    expect(() => validateGoal('   ')).toThrowError(/不能为空/)
    expect(() => validateGoal('x'.repeat(GOAL_MAX_LENGTH + 1))).toThrowError(/长度超限/)
    try {
      validateGoal('')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).code).toBe('BAD_GOAL')
      expect((e as ApiError).status).toBe(400)
    }
  })
})

describe('validateTaskId（防目录穿越白名单）', () => {
  it('合法 id 通过', () => {
    expect(validateTaskId('run-20261009-201530-ab12cd')).toBe('run-20261009-201530-ab12cd')
  })
  it('路径分隔符 / .. / 非法前缀一律拒绝（BAD_ID）', () => {
    for (const bad of ['../etc/passwd', 'run-../x', 'run-a/b', 'task-1', 'run-', 'run-a\\b', '']) {
      expect(() => validateTaskId(bad)).toThrowError()
    }
    try {
      validateTaskId('../../secret')
    } catch (e) {
      expect((e as ApiError).code).toBe('BAD_ID')
    }
  })
})

describe('validateEnum（非法回退默认并显式告知）', () => {
  const allowed = ['research'] as const
  it('合法值原样返回', () => {
    expect(validateEnum('research', allowed, 'research', 'workflow')).toEqual({ value: 'research', fellBack: false })
  })
  it('缺省用默认且不算回退', () => {
    expect(validateEnum(undefined, allowed, 'research', 'workflow')).toEqual({ value: 'research', fellBack: false })
  })
  it('非法值回退并带原因', () => {
    const r = validateEnum('hack', allowed, 'research', 'workflow')
    expect(r.value).toBe('research')
    expect(r.fellBack).toBe(true)
    expect(r.reason).toContain('workflow 非法')
  })
})

describe('validateSources', () => {
  const allowed = ['arxiv', 'crossref', 'openalex', 'semantic_scholar']
  it('保序去重并剔除非法项', () => {
    expect(validateSources(['arxiv', 'arxiv', 'evil', 'crossref'], allowed)).toEqual({
      value: ['arxiv', 'crossref'],
      dropped: ['evil'],
    })
  })
  it('非数组视为丢弃', () => {
    expect(validateSources('arxiv', allowed)).toEqual({ value: [], dropped: ['arxiv'] })
    expect(validateSources(undefined, allowed)).toEqual({ value: [], dropped: [] })
  })
})

describe('errorBody（统一错误体恰好两个字段）', () => {
  it('{error, code} 契约稳定，action 并入 error 文本', () => {
    const body = errorBody(ApiError.busy())
    expect(Object.keys(body).sort()).toEqual(['code', 'error'])
    expect(body.code).toBe('BUSY')
    expect(body.error).toContain('已有步骤在执行')
    // action（修复指引）已并入 error 文本，人类可读
    expect(body.error).toContain('请等待')
  })
  it('状态码按 code 映射', () => {
    expect(ApiError.notFound('任务 x').status).toBe(404)
    expect(ApiError.sessionError('x').status).toBe(500)
    expect(ApiError.badId('x').status).toBe(400)
  })
})
