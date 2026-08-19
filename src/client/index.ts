/**
 * dsh-super-injector 浏览器端：
 *   - 插件管理 UI 作为官方 Plugins settings section 的一个 tab 注册
 *     （id `super-injector`，label「插件管理」），与官方「插件列表」tab 并列。
 *   - 路由观测（Router Observer）：better-sidebar 可用时挂 sidebar tab；
 *     否则在设置页挂一个只读 fallback section。
 * 通信：同源 fetch → host webServer API（/super-injector/api）。
 */
import type { SlotsService } from '@deepseek-ai/dsh-client-ui-slots'
import { createElement } from 'react'
import { RouterPanel, RoutingIcon } from './router-panel'
import { PluginManagerTab } from './PluginManagerTab'

type ClientContext = {
  slots: SlotsService
  get(name: string): any
}

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  // 插件管理：贡献到官方 Plugins settings section 的 tab（与官方“插件列表”并列）。
  ctx.effect(() => ctx.slots.inject('settings.plugins.tab', () =>
    ctx.slots.register({
      name: 'settings.plugins.tab',
      id: 'super-injector',
      order: 20,
      label: () => '插件管理',
    }, PluginManagerTab),
  ), 'super-injector: plugins management tab')

  // ── 路由观测（Router Observer）──
  // D5: 不把 betterSidebar 放进必需 inject；用 ctx.get 可选挂载（未装时返回 undefined）。
  const bs = ctx.get('betterSidebar')
  if (bs && typeof bs.registerTab === 'function') {
    ctx.effect(() => bs.registerTab({
      id: 'routing-observer',
      title: '路由',
      icon: (size: number) => createElement(RoutingIcon, { size }),
      single: true,
      component: (props: any) => createElement(RouterPanel, props),
    }), 'router-observer: sidebar tab')
  } else {
    // fallback: 无 better-sidebar 时，在设置页挂一个只读入口
    ctx.effect(() => ctx.slots.inject('settings.section', () =>
      ctx.slots.register({
        name: 'settings.section',
        id: 'routing-observer-fallback',
        order: 60,
        label: () => '路由观测',
        component: () => ({
          render() {
            const wrap = document.createElement('div')
            wrap.style.cssText = 'font-family:ui-monospace, monospace;font-size:12px;padding:8px 4px;color:var(--theme-text-secondary, #999)'
            fetch('/super-injector/api/router/sessions')
              .then((r) => r.json())
              .then((d) => {
                const list = d?.ok ? d.sessions : []
                wrap.textContent = list.length
                  ? `路由观测（${list.length} 个会话）——请安装 dsh-better-sidebar 获得完整时间线面板`
                  : '路由观测：暂无会话'
              })
              .catch(() => { wrap.textContent = '路由观测：暂不可用' })
            return wrap
          },
        }),
      }),
    ), 'router-observer: settings fallback')
  }
}