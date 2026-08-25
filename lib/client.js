window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-super-injector",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/router-panel.tsx
		const API$1 = "/super-injector/api/router";
		/** Tab 图标：雷达 / 分流符号（better-sidebar TabDescriptor.icon 契约）。 */
		function RoutingIcon({ size = 16 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.5",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				style: { display: "block" },
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "8",
						cy: "8",
						r: "6",
						opacity: ".45"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "8",
						cy: "8",
						r: "2.6"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M8 8 L13.4 4.5",
						opacity: ".85"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M8 8 L4 11",
						opacity: ".6"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 1.6 V2.8" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "8",
						cy: "1.6",
						r: ".9",
						fill: "currentColor",
						stroke: "none"
					})
				]
			});
		}
		const BAND_COLORS = {
			spec: "#4a9eff",
			react: "#2ecc71",
			weak: "#f1c40f",
			mixed: "#e67e22",
			transition: "#e67e22"
		};
		const BAND_LABELS = {
			spec: "spec",
			react: "react",
			weak: "weak",
			mixed: "mixed",
			transition: "mixed"
		};
		function BandBadge({ band }) {
			if (!band || band === "–" || band === "") return null;
			const color = BAND_COLORS[band] || "#888";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					display: "inline-block",
					fontSize: 12,
					fontWeight: 600,
					padding: "2px 9px",
					borderRadius: 10,
					background: color + "22",
					color,
					border: `1px solid ${color}55`,
					lineHeight: 1.4
				},
				children: BAND_LABELS[band] || band
			});
		}
		function SourceTag({ source }) {
			if (!source) return null;
			const s = {
				observed: {
					text: "observed",
					color: "#2ecc71"
				},
				derived: {
					text: "≈ 重算",
					color: "#888"
				},
				baseline: {
					text: "baseline",
					color: "#888"
				},
				calibrated: {
					text: "calibrated",
					color: "#f1c40f"
				}
			}[source] || {
				text: source,
				color: "#888"
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					fontSize: 11,
					padding: "1px 6px",
					borderRadius: 4,
					border: `1px solid ${s.color}66`,
					color: s.color,
					whiteSpace: "nowrap"
				},
				children: s.text
			});
		}
		function RouterPanel({ visible, scope }) {
			const [snap, setSnap] = (0, react.useState)(null);
			const [timeline, setTimeline] = (0, react.useState)([]);
			const [dbg, setDbg] = (0, react.useState)(false);
			const [dbgData, setDbgData] = (0, react.useState)(null);
			const [loadError, setLoadError] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (!visible) return;
				let alive = true;
				const sid = scope?.sessionId ?? "";
				setDbgData(null);
				setLoadError(null);
				const load = async () => {
					try {
						const [s, t] = await Promise.all([fetch(`${API$1}/status?sessionId=${sid}`).then((r) => r.json()), fetch(`${API$1}/timeline?sessionId=${sid}`).then((r) => r.json())]);
						if (!alive) return;
						if (s.ok) setSnap(s.status);
						else setSnap({
							mode: "–",
							band: "–",
							override: null,
							source: "unknown",
							confidence: "low",
							persona: "",
							core: []
						});
						if (t.ok) setTimeline(t.timeline || []);
						else setTimeline([]);
						setLoadError(null);
					} catch (e) {
						if (!alive) return;
						setLoadError(String(e instanceof Error ? e.message : e));
					}
				};
				const loadDbg = async () => {
					if (!dbg) return;
					try {
						const d = await fetch(`${API$1}/debug?sessionId=${sid}`).then((r) => r.json());
						if (alive && d.ok) setDbgData(d.debug);
						else if (alive && !d.ok) setDbgData(null);
					} catch {}
				};
				load();
				loadDbg();
				const id = setInterval(() => {
					load();
					loadDbg();
				}, 2e3);
				return () => {
					alive = false;
					clearInterval(id);
				};
			}, [
				visible,
				scope?.sessionId,
				dbg
			]);
			const band = snap?.band || "–";
			const modeText = snap?.mode !== void 0 && snap.mode !== null && snap.mode !== "" ? String(snap.mode) : "–";
			const conf = snap?.confidence || "low";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					padding: "12px 14px",
					fontFamily: "ui-monospace, monospace",
					fontSize: 14,
					color: "var(--foreground)",
					lineHeight: 1.6
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8,
							marginBottom: 10,
							flexWrap: "wrap"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: { fontSize: 15 },
								children: "路由观测"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 12,
									padding: "2px 9px",
									borderRadius: 10,
									fontWeight: 600,
									background: visible ? "rgba(46,204,113,.15)" : "rgba(120,120,120,.15)",
									color: visible ? "#2ecc71" : "var(--muted-foreground)"
								},
								children: visible ? "● 实时" : "已暂停"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									marginLeft: "auto",
									fontSize: 12,
									color: "var(--muted-foreground)"
								},
								children: "2s 轮询"
							})
						]
					}),
					loadError && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							color: "#e5534b",
							fontSize: 13,
							marginBottom: 8,
							padding: "6px 8px",
							background: "rgba(229,83,75,.08)",
							borderRadius: 6
						},
						children: [
							"（加载失败：",
							loadError,
							"）"
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							border: `1px solid var(--border)`,
							borderRadius: 10,
							padding: "10px 12px",
							marginBottom: 10,
							background: "var(--card)"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 10,
									flexWrap: "wrap",
									marginBottom: 6
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 12,
										color: "var(--muted-foreground)"
									},
									children: "当前模式"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										alignItems: "center",
										gap: 6,
										marginTop: 2
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												fontSize: 22,
												fontWeight: 700,
												fontVariantNumeric: "tabular-nums"
											},
											children: modeText
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BandBadge, { band }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SourceTag, { source: snap?.source })
									]
								})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										marginLeft: "auto",
										textAlign: "right"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 12,
											color: "var(--muted-foreground)"
										},
										children: "可信度"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 14,
											fontWeight: 600,
											marginTop: 2,
											color: conf === "high" ? "#2ecc71" : conf === "low" ? "#f1c40f" : "var(--muted-foreground)"
										},
										children: conf
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									fontSize: 13,
									color: "var(--muted-foreground)",
									borderTop: "1px dashed var(--border)",
									paddingTop: 6,
									marginTop: 4
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										color: "var(--muted-foreground)",
										fontSize: 12
									},
									children: "persona · "
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: snap?.persona ? snap.persona : "（等待路由决策）" })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 6,
									flexWrap: "wrap",
									marginTop: 8
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: 12,
											color: "var(--muted-foreground)"
										},
										children: "首轮核心工具"
									}),
									(snap?.core || []).length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: 13,
											color: "var(--muted-foreground)"
										},
										children: "—"
									}) : snap.core.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: 12,
											padding: "1px 8px",
											borderRadius: 5,
											background: "rgba(74,158,255,.12)",
											border: "1px solid rgba(74,158,255,.35)",
											color: "var(--primary)",
											fontFamily: "ui-monospace, monospace"
										},
										children: c
									}, c)),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: {
											marginLeft: "auto",
											fontSize: 12,
											color: "var(--muted-foreground)"
										},
										children: ["override: ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", {
											style: { color: snap?.override != null ? "#f1c40f" : "var(--foreground)" },
											children: snap?.override ?? "无"
										})]
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 10,
							marginBottom: 8,
							fontSize: 12,
							color: "var(--muted-foreground)",
							flexWrap: "wrap"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["处理率 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", {
								style: { color: "var(--foreground)" },
								children: snap?.processed ?? "–"
							})] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["drift ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", {
								style: { color: "var(--foreground)" },
								children: snap?.drift ?? 0
							})] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								onClick: () => setDbg(!dbg),
								style: {
									marginLeft: "auto",
									background: "transparent",
									border: "1px solid var(--border)",
									color: "var(--muted-foreground)",
									borderRadius: 6,
									padding: "3px 10px",
									fontSize: 12,
									cursor: "pointer",
									fontFamily: "inherit"
								},
								children: dbg ? "收起 debug" : "debug JSON"
							})
						]
					}),
					dbg && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						style: {
							border: "1px dashed var(--border)",
							borderRadius: 6,
							padding: 8,
							fontSize: 12,
							whiteSpace: "pre-wrap",
							color: "var(--muted-foreground)",
							marginBottom: 10,
							maxHeight: 180,
							overflow: "auto"
						},
						children: dbgData ? JSON.stringify(dbgData, null, 2) : "（加载中…）"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 12,
							color: "var(--muted-foreground)",
							marginBottom: 6
						},
						children: "时间线 · 自观测窗口"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							position: "relative",
							paddingLeft: 14,
							borderLeft: `2px solid var(--border)`
						},
						children: [timeline.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 13,
								color: "var(--muted-foreground)",
								padding: "4px 0 8px"
							},
							children: "（暂无路由事件——等待首条用户消息）"
						}), timeline.map((ev) => {
							const color = BAND_COLORS[ev.band] || "#888";
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									position: "relative",
									marginBottom: 6,
									padding: "6px 8px",
									background: "var(--card)",
									border: `1px solid var(--border)`,
									borderRadius: 6
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
										position: "absolute",
										left: -19,
										top: 8,
										width: 9,
										height: 9,
										borderRadius: "50%",
										background: "var(--background)",
										border: `2px solid ${color}`
									} }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											alignItems: "center",
											gap: 6,
											flexWrap: "wrap"
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													fontSize: 11,
													color: "var(--muted-foreground)"
												},
												children: new Date(ev.ts || Date.now()).toLocaleTimeString([], { hour12: false })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", {
												style: { fontSize: 13 },
												children: ev.type
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SourceTag, { source: ev.source }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													marginLeft: "auto",
													fontSize: 12,
													color
												},
												children: ev.band
											})
										]
									}),
									ev.detail && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 12,
											color: "var(--muted-foreground)",
											marginTop: 2,
											wordBreak: "break-all"
										},
										children: ev.detail
									})
								]
							}, ev.seq);
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/PluginManagerTab.tsx
		/**
		* dsh-super-injector 插件管理卡片（官方“插件配置”页的 `settings.plugin.item`）。
		* 功能：已注入插件列表 + 一键卸载 + 添加（路径输入/拖放提示）——
		*   - 直接注入：目录已是插件包（package.json + lib/）→ 立即注入
		*   - 内化：任意文件夹 → 新建 agent 会话 → AI 把内容变成插件
		* 通信：同源 fetch → host webServer API（/super-injector/api）
		*
		* 卡片形态参考官方 PluginCard：可折叠标题 + 描述 + 展开内容；但内容为
		* 操作型 UI（注入/卸载），不写入 settings 字段，因此不包含保存/丢弃表单。
		*/
		const API = "/super-injector/api";
		const styles = `
.spi-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;list-style:none;transition:border-color .16s,background .16s}
.spi-card:hover{border-color:var(--dsw-alias-label-dimmed)}
.spi-card.spi-cardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}
.spi-head{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}
.spi-head:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.spi-headText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}
.spi-title{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}
.spi-desc{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}
.spi-chev{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}
.spi-chev.open{transform:rotate(180deg)}
.spi-body{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}
.spi-stats{color:var(--dsw-alias-label-tertiary);margin:12px 0 0;font-size:12px;line-height:1.5}
.spi-field{padding:12px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.spi-field:last-of-type{border-bottom:0}
.spi-label{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:1.5}
.spi-input{width:100%;box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:7px 10px;font-size:13px;line-height:1.5}
.spi-input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.spi-hint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5;margin:4px 0 0}
.spi-actions{display:flex;justify-content:flex-end;gap:8px;padding:10px 0 2px}
.spi-btn{appearance:none;font:inherit;cursor:pointer;border:1px solid #0000;border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5}
.spi-btn.ghost{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:0 0}
.spi-btn.ghost:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}
.spi-btn.primary{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}
.spi-btn.danger{border-color:var(--dsw-alias-label-error);color:var(--dsw-alias-label-error);background:0 0}
.spi-btn.danger:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}
.spi-btn:disabled{opacity:.4;cursor:default}
.spi-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.spi-list{list-style:none;margin:10px 0 0;padding:0}
.spi-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;margin-bottom:6px}
.spi-item .name{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.spi-item .dir{color:var(--dsw-alias-label-tertiary);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:40%}
.spi-item .st{font-size:10px;padding:2px 6px;border-radius:10px}
.spi-item .st.on{background:rgba(46,204,113,.15);color:#2ecc71}
.spi-item .st.off{background:rgba(255,193,7,.12);color:#f1c40f}
.spi-msg{margin-top:10px;padding:8px 10px;border-radius:6px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);white-space:pre-wrap;max-height:180px;overflow:auto;font-size:12px;line-height:1.5}
`;
		async function fetchJson(path, init) {
			return fetch(API + path, {
				headers: { "content-type": "application/json" },
				...init
			}).then((r) => r.json());
		}
		/** 折叠卡片标题：与官方配置卡片同列表视觉，但内容为操作型 UI。 */
		function PluginManagerTab() {
			const [open, setOpen] = (0, react.useState)(false);
			const [entries, setEntries] = (0, react.useState)([]);
			const [stats, setStats] = (0, react.useState)("");
			const [msg, setMsg] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [drag, setDrag] = (0, react.useState)(false);
			const [path, setPath] = (0, react.useState)("");
			const refresh = async () => {
				try {
					const d = await fetchJson("/list");
					if (!d?.ok) {
						setMsg({
							text: JSON.stringify(d),
							isErr: true
						});
						return;
					}
					const s = d.stats ?? {};
					setStats(`inject ${s.inject?.ok ?? 0}✓/${s.inject?.fail ?? 0}✗ · reload ${s.reload?.ok ?? 0}✓ · uninject ${s.uninject?.ok ?? 0}✓/${s.uninject?.fail ?? 0}✗ · 共 ${d.entries.length} 个注入插件`);
					setEntries(d.entries);
				} catch (err) {
					setMsg({
						text: "加载失败: " + String(err),
						isErr: true
					});
				}
			};
			(0, react.useEffect)(() => {
				if (!open) return;
				refresh();
				const timer = window.setInterval(() => {
					refresh();
				}, 6e4);
				return () => window.clearInterval(timer);
			}, [open]);
			const doAction = async (pathName, label) => {
				const dir = path.trim();
				if (!dir) {
					setMsg({
						text: "请先输入文件夹路径",
						isErr: true
					});
					return;
				}
				setBusy(true);
				setMsg(null);
				try {
					const r = await fetchJson(pathName, {
						method: "POST",
						body: JSON.stringify({
							dir,
							title: label
						})
					});
					setMsg({
						text: r?.result ?? JSON.stringify(r),
						isErr: !r?.ok
					});
					if (r?.ok) setTimeout(() => {
						refresh();
					}, 1200);
				} catch (err) {
					setMsg({
						text: "请求失败: " + String(err),
						isErr: true
					});
				} finally {
					setBusy(false);
				}
			};
			const uninstall = async (name) => {
				setMsg(null);
				try {
					const r = await fetchJson("/uninstall", {
						method: "POST",
						body: JSON.stringify({ match: name })
					});
					setMsg({
						text: r?.result ?? JSON.stringify(r),
						isErr: !r?.ok
					});
					setTimeout(() => {
						refresh();
					}, 600);
				} catch (err) {
					setMsg({
						text: "卸载请求失败: " + String(err),
						isErr: true
					});
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "spi-card" + (open ? " spi-cardOpen" : ""),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: styles }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "spi-head",
						"aria-expanded": open,
						onClick: () => setOpen((v) => !v),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "spi-headText",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "spi-title",
								children: "Super Injector"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "spi-desc",
								children: "运行时注入本地 DSH 插件：直接注入 / 内化 / 卸载"
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "spi-chev" + (open ? " open" : ""),
							children: "▼"
						})]
					}),
					open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "spi-body",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "spi-stats",
								children: stats
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "spi-field",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										className: "spi-label",
										htmlFor: "super-injector-path",
										children: "插件路径"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: "super-injector-path",
										className: "spi-input",
										placeholder: "D:/path/to/folder",
										value: path,
										onChange: (e) => setPath(e.target.value),
										onDragOver: (e) => {
											e.preventDefault();
											setDrag(true);
										},
										onDragLeave: () => setDrag(false),
										onDrop: (e) => {
											e.preventDefault();
											setDrag(false);
											setPath("");
											setMsg({
												text: "浏览器无法读取拖入文件夹的绝对路径——请粘贴路径或使用选择器",
												isErr: false
											});
										}
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "spi-hint",
										children: "拖入文件夹，或输入路径——「内化」= 新建会话让 AI 把内容变成插件；「注入」= 目录已是插件包直接注入"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "spi-actions",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											className: "spi-btn",
											disabled: busy,
											onClick: () => {
												doAction("/ingest", "内化插件");
											},
											children: busy ? "处理中…" : "内化（AI 造插件）"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											className: "spi-btn primary",
											disabled: busy,
											onClick: () => {
												doAction("/inject", "直接注入");
											},
											children: busy ? "处理中…" : "直接注入"
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "spi-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "spi-label",
									children: "已注入插件"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
									className: "spi-list",
									children: entries.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
										className: "spi-item",
										children: "（暂无注入插件——输入路径或拖入文件夹开始）"
									}) : entries.map((e) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
										className: "spi-item",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "name",
												children: e.name
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dir",
												children: e.dir
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "st " + (e.active ? "on" : "off"),
												children: e.active ? "运行中" : "未激活"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												className: "spi-btn danger",
												onClick: () => {
													uninstall(e.name);
												},
												children: "卸载"
											})
										]
									}, e.name + e.dir))
								})]
							}),
							msg && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "spi-msg",
								style: {
									display: "block",
									borderColor: msg.isErr ? "var(--dsw-alias-label-error)" : "var(--dsw-alias-border-l2)"
								},
								children: msg.text
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		const inject = ["slots"];
		function apply(ctx) {
			ctx.effect(() => ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: "super-injector"
			}, PluginManagerTab)), "super-injector: plugins management card");
			const bs = ctx.get("betterSidebar");
			if (bs && typeof bs.registerTab === "function") ctx.effect(() => bs.registerTab({
				id: "routing-observer",
				title: "路由",
				icon: (size) => (0, react.createElement)(RoutingIcon, { size }),
				single: true,
				component: (props) => (0, react.createElement)(RouterPanel, props)
			}), "router-observer: sidebar tab");
			else ctx.effect(() => ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "routing-observer-fallback",
				order: 60,
				label: () => "路由观测",
				component: () => ({ render() {
					const wrap = document.createElement("div");
					wrap.style.cssText = "font-family:ui-monospace, monospace;font-size:12px;padding:8px 4px;color:var(--theme-text-secondary, #999)";
					fetch("/super-injector/api/router/sessions").then((r) => r.json()).then((d) => {
						const list = d?.ok ? d.sessions : [];
						wrap.textContent = list.length ? `路由观测（${list.length} 个会话）——请安装 dsh-better-sidebar 获得完整时间线面板` : "路由观测：暂无会话";
					}).catch(() => {
						wrap.textContent = "路由观测：暂不可用";
					});
					return wrap;
				} })
			})), "router-observer: settings fallback");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map