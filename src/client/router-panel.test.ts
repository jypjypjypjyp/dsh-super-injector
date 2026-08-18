import { test, assert } from 'node:test'
import { RouterPanel } from './router-panel'
// node 下仅验证导出存在；DOM 渲染不在本测试（无 jsdom 依赖）
test('panel exports RouterPanel', () => {
  assert.equal(typeof RouterPanel, 'function')
})