// test/asyncWrapper.test.js
const asyncWrapper = require('../src/asyncWrapper')

describe('asyncWrapper', () => {
  test('forwards rejected promise to next', async () => {
    const error = new Error('test error')
    const handler = jest.fn().mockRejectedValue(error)
    const req = {}
    const res = {}
    const next = jest.fn()

    const wrapped = asyncWrapper(handler)
    await wrapped(req, res, next)

    expect(handler).toHaveBeenCalledWith(req, res, next)
    expect(next).toHaveBeenCalledWith(error)
  })

  test('passes through resolved handler without calling next', async () => {
    const handler = jest.fn().mockResolvedValue('ok')
    const req = {}
    const res = { json: jest.fn() }
    const next = jest.fn()

    const wrapped = asyncWrapper(handler)
    await wrapped(req, res, next)

    expect(handler).toHaveBeenCalledWith(req, res, next)
    expect(next).not.toHaveBeenCalled()
  })

  test('catches synchronous throw and forwards to next', async () => {
    const error = new Error('sync error')
    const handler = jest.fn(() => { throw error })
    const req = {}
    const res = {}
    const next = jest.fn()

    const wrapped = asyncWrapper(handler)
    await wrapped(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })
})