# Super Injector 构建说明

本包作为规范 npm 包构建:宿主自包含 + client 独立,`npm pack` 即得可装配的 tgz。

## 构建

```bash
npm run build           # = bash scripts/build.sh
# 或经注入器工具链:
#   dev_build_plugin <本目录>   (构建 + 打包 + 产物新鲜度校验)
```

产出(aligned with `package.json#main/types/exports/files`):

- `lib/index.js` — **宿主自包含 bundle**(tsdown `hostBundle`),把 `cordis`/`schemastery`/`@deepseek-ai/dsh-*` 等运行时依赖全打进包内,**零外部 deps**;官方装配路径任意都能加载。
- `lib/client.js` — 浏览器 client bundle(tsdown `clientBundle`),`react`/`cordis`/`dsh-client-*` 为 external。
- `lib/types/*.d.ts` — tsc `emitDeclarationOnly` 生成的类型(供 `exports.types`)。

## 为什么这样构建(历史教训)

**旧 `build.sh` 硬链 dsh 源码 checkout 的 vendor/core(纯源码、无 `lib/`)并强制用 checkout 的 tsc**,导致:

- 必须 `DSH_CHECKOUT` 指向一个**已 build 出 `lib/`** 的 dsh 源码 checkout(需要 `pnpm install && pnpm build`,很重);
- release 源码 tarball 里 `vendor/cordis`、`packages/core/tools` 只有 `src/`、没有 `lib/types/*.d.ts`,tsc 直接 `Cannot find module`。

**现在的 `build.sh`** 改为链接**预编译 DSH 安装**的 deps(自动探测本机 npx 缓存 / profile 里 `node_modules/@deepseek-ai/dsh-tools` 所在根),并做 tsc 回退(own → framework)。这样:

- 只用框架**已发布类型**,不再需要 build 核心;
- `DSH_CHECKOUT` 不再是硬性前提;
- 依赖面收敛到框架实际用到的少量 `@deepseek-ai` 包,而非全量 monorepo。

> 若本机没有预编译 DSH 安装(npx 缓存 / profile 无 `@deepseek-ai/dsh-tools`),`build.sh` 会报错并提示先启动一次 DSH 让核心落位。

## 备注

- tsconfig `exclude` 含 `src/client` 与 `**/*.test.ts`:client 由 tsdown 单独构建,测试文件不进 lib。
- 源码在开发分支 `router-observer-ui-fixes`(e25aa54)上已修至 `tsc --noEmit` 零错;原有 `router-observer.ts` 的 TS2835/TS2322/TS7006 等 type 错为开发中间态引入,已修复(纯类型,不改行为)。
