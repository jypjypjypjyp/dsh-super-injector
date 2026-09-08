export type RouterCoreSource = {
    kind: 'installed' | 'mirror';
    hash: string;
    match: boolean;
};
export interface RouterCore {
    classifyTask(text: string): string | number;
    bandOf(mode: unknown): string;
    personaFor(mode: unknown, modelId: string): string;
    coreFor(mode: unknown): string[];
    testinessFor(mode: unknown): string;
    isFlashModel(m?: string): boolean;
    isComplexTask(text: string): boolean;
    extractText(data: unknown): string;
    sessionMode(session: unknown): unknown;
    parseMode(token: unknown): string | number | null;
}
export declare function sha256(input: string): string;
export declare function resolveRouterCore(): Promise<{
    core: RouterCore;
    source: RouterCoreSource;
}>;
export type RouterEventType = 'route' | 'promote' | 'tool' | 'guide' | 'calibrate' | 'baseline';
export interface RouterTimelineEvent {
    seq: number;
    ts: number;
    sessionId: string;
    type: RouterEventType;
    band: string;
    mode: string | number;
    source: 'observed' | 'derived' | 'baseline' | 'calibrated';
    override: string | number | null;
    detail?: string;
}
export declare class RouterTimeline {
    private buf;
    private limit;
    constructor(limit?: number);
    get windowStart(): boolean;
    push(e: RouterTimelineEvent): void;
    snapshot(): RouterTimelineEvent[];
}
export interface SessionView {
    sessionId: string;
    mode: string | number;
    band: string;
    override: string | number | null;
    confidence: 'high' | 'low';
    observed: number;
    processed: number;
    drift: number;
    lastEventAt: number | null;
    source: RouterTimelineEvent['source'];
    model?: string;
    timeline: RouterTimeline;
}
export declare class RouterObserverState {
    private map;
    /** 实际解析来源完整信息（kind + SHA-256 + match），装配时赋值；debug() 使用。 */
    srcInfo: RouterCoreSource | null;
    /** 已触发过 promote（窄→全目录提升）的会话集合：只对首个非特殊 tool/call 发 once。 */
    private promoted;
    private core;
    private limit;
    constructor(core: RouterCore, limit?: number);
    private view;
    route(session: string, mode: string | number, modelId: string): void;
    promote(session: string, tool: string): void;
    /** 标记 promote 已触发（当首个非特殊 tool/call 经其他路径处理时）。 */
    markPromoted(session: string): void;
    markObserved(session: string): void;
    tool(session: string, name: string, arg: unknown): void;
    calibrate(session: string, parsed: {
        mode?: string | number;
        override?: string | number | null;
    }): void;
    drift(session: string, expected: string, actual: string): void;
    snapshot(session: string): SessionView | undefined;
    sessions(): SessionView[];
    debug(session: string): object | null;
}
export declare function createRouterObserver(ctx: any): Promise<{
    state: RouterObserverState;
    dispose: () => void;
    selftest: () => Promise<{
        ok: boolean;
        problems: string[];
    }>;
    core: RouterCore;
}>;
/** 从 SessionView + RouterCore 派生 persona（spec §6 快照卡人设摘要用）。 */
export declare function personaOf(s: SessionView, core: RouterCore): string;
/** 从 SessionView + RouterCore 派生首轮核心工具名（spec §6 快照卡用）。 */
export declare function coreNamesOf(s: SessionView, core: RouterCore): string[];
