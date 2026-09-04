/**
 * dsh-super-injector 浏览器端：
 *   - 插件管理 UI 作为官方“插件配置”页的一张 `settings.plugin.item` 卡片
 *     （key `super-injector`），与终端/网页搜索等配置卡片并列。
 *   - 路由观测（Router Observer）：挂 `dsh-better-sidebar` 侧边栏 tab。
 *     `betterSidebar` 声明为硬依赖（公共 cordis 机制）：fiber 会在该服务被
 *     provide 时才 apply（服务就绪即响应），无一次性读取竞态、无内部事件、
 *     无定时器轮询。未装 better-sidebar 时不再降级到设置页（无 fallback）。
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

// `betterSidebar` 是公共硬依赖：由 dsh-better-sidebar 在自身 client apply 时
// `ctx.provide('betterSidebar', service)`。cordis 在服务就绪后自动唤醒本 fiber，
// 再跑 apply —— 拿到的一定是已注册的服务，天然免去“先探后登”的时序竞态。
export const inject = ['slots', 'betterSidebar']

export function apply(ctx: ClientContext): void {
  // 插件管理：注册为官方“插件配置”页的卡片（Host 已注册同 key namespace）。
  ctx.effect(() => ctx.slots.inject('settings.plugin.item', () =>
    ctx.slots.register({
      name: 'settings.plugin.item',
      key: 'super-injector',
    }, PluginManagerTab),
  ), 'super-injector: plugins management card')

  // ── 路由观测（Router Observer）──
  // 已声明进 inject，服务必然可用；直接注册侧边栏 tab，不再走 ctx.get 一次性判定。
  const bs = ctx.get('betterSidebar')
  ctx.effect(() => bs.registerTab({
    id: 'routing-observer',
    title: '路由',
    icon: (size: number) => createElement(RoutingIcon, { size }),
    single: true,
    component: (props: any) => createElement(RouterPanel, props),
  }), 'router-observer: sidebar tab')
}
