export type SM_StatePtr<ActiveObject, Event> = SM_HsmState<ActiveObject, Event>;

export type SM_ActionHandler<ActiveObject> = (me: ActiveObject) => void;

export type SM_InitHandler<ActiveObject, Event> = (
  me: ActiveObject,
) => SM_StatePtr<ActiveObject, Event>;

export type SM_StateHandler<ActiveObject, Event> = (
  me: ActiveObject,
  e: Event,
) => SM_RetState<ActiveObject, Event>;

export type SM_TopInitialHandler<ActiveObject, Event> = (
  me: ActiveObject,
) => SM_StatePtr<ActiveObject, Event>;

export interface SM_HsmState<ActiveObject, Event> {
  readonly name?: string;
  readonly super_: SM_StatePtr<ActiveObject, Event> | null;
  readonly init_?: SM_InitHandler<ActiveObject, Event> | null;
  readonly entry_?: SM_ActionHandler<ActiveObject> | null;
  readonly exit_?: SM_ActionHandler<ActiveObject> | null;
  readonly handler_: SM_StateHandler<ActiveObject, Event>;
}

export interface SM_HandledRet {
  readonly kind: "handled";
}

export interface SM_SuperRet {
  readonly kind: "super";
}

export interface SM_TranRet<ActiveObject, Event> {
  readonly kind: "tran";
  readonly target: SM_StatePtr<ActiveObject, Event>;
}

export type SM_RetState<ActiveObject, Event> =
  | SM_HandledRet
  | SM_SuperRet
  | SM_TranRet<ActiveObject, Event>;

const SM_HANDLED_RET: SM_HandledRet = { kind: "handled" };
const SM_SUPER_RET: SM_SuperRet = { kind: "super" };

export const SM_RetState = {
  Handled: SM_HANDLED_RET,
  Super: SM_SUPER_RET,
  Tran<ActiveObject, Event>(
    target: SM_StatePtr<ActiveObject, Event>,
  ): SM_RetState<ActiveObject, Event> {
    return { kind: "tran", target };
  },
} as const;

function SM_stateName<ActiveObject, Event>(
  state: SM_StatePtr<ActiveObject, Event>,
): string {
  return state.name ?? "<anonymous>";
}

class SM_PathOps {
  public static collectToTop<ActiveObject, Event>(
    target: SM_StatePtr<ActiveObject, Event>,
    maxDepth: number,
  ): SM_StatePtr<ActiveObject, Event>[] {
    const path: SM_StatePtr<ActiveObject, Event>[] = [];
    const seen = new Set<SM_StatePtr<ActiveObject, Event>>();
    let cursor: SM_StatePtr<ActiveObject, Event> | null = target;

    while (cursor !== null) {
      if (seen.has(cursor)) {
        throw new Error(
          `State '${SM_stateName(target)}' has a cyclic super_ chain.`,
        );
      }

      if (path.length >= maxDepth) {
        throw new Error(
          `State path from '${SM_stateName(target)}' exceeds max depth ${maxDepth}.`,
        );
      }

      seen.add(cursor);
      path.push(cursor);
      cursor = cursor.super_;
    }

    return path;
  }

  public static collectUntilCurr<ActiveObject, Event>(
    curr: SM_StatePtr<ActiveObject, Event>,
    target: SM_StatePtr<ActiveObject, Event>,
    maxDepth: number,
  ): SM_StatePtr<ActiveObject, Event>[] {
    const path: SM_StatePtr<ActiveObject, Event>[] = [];
    const seen = new Set<SM_StatePtr<ActiveObject, Event>>();
    let cursor: SM_StatePtr<ActiveObject, Event> | null = target;

    while (cursor !== null) {
      if (cursor === curr) {
        return path;
      }

      if (seen.has(cursor)) {
        throw new Error(
          `State '${SM_stateName(target)}' has a cyclic super_ chain.`,
        );
      }

      if (path.length >= maxDepth) {
        throw new Error(
          `State path from '${SM_stateName(target)}' exceeds max depth ${maxDepth}.`,
        );
      }

      seen.add(cursor);
      path.push(cursor);
      cursor = cursor.super_;
    }

    throw new Error(
      `Init target '${SM_stateName(target)}' must be a descendant of current state '${SM_stateName(
        curr,
      )}'.`,
    );
  }

  public static slot<ActiveObject, Event>(
    path: readonly SM_StatePtr<ActiveObject, Event>[],
    idx: number,
  ): SM_StatePtr<ActiveObject, Event> {
    const state = path[idx];
    if (state === undefined) {
      throw new Error(`State path slot ${idx} is unexpectedly empty.`);
    }

    return state;
  }
}

export class SM_Hsm<ActiveObject, Event> {
  private curr_: SM_StatePtr<ActiveObject, Event> | null = null;

  public constructor(
    private readonly topInitial: SM_TopInitialHandler<ActiveObject, Event>,
    private readonly maxNestDepth = 5,
  ) {
    if (!Number.isInteger(maxNestDepth) || maxNestDepth <= 0) {
      throw new Error("maxNestDepth must be a positive integer.");
    }
  }

  public curr(): SM_StatePtr<ActiveObject, Event> | null {
    return this.curr_;
  }

  public init(me: ActiveObject): void {
    const target = this.topInitial(me);
    const path = SM_PathOps.collectToTop(target, this.maxNestDepth);

    this.enterPrimaryPath(me, path);
    this.curr_ = target;
    this.followInitChain(me);
  }

  public dispatch(me: ActiveObject, e: Event): void {
    let state = this.requireInitialized();

    while (true) {
      const result = state.handler_(me, e);

      switch (result.kind) {
        case "handled":
          return;
        case "super":
          if (state.super_ === null) {
            return;
          }

          state = state.super_;
          break;
        case "tran":
          this.transitionFromActive(me, state, result.target, this.requireInitialized());
          return;
        default:
          throw new Error("State handler returned an unknown result.");
      }
    }
  }

  public transition(
    me: ActiveObject,
    source: SM_StatePtr<ActiveObject, Event>,
    target: SM_StatePtr<ActiveObject, Event>,
  ): void {
    const curr = this.requireInitialized();
    this.requireSourceOnActivePath(curr, source);
    this.transitionFromActive(me, source, target, curr);
  }

  private transitionFromActive(
    me: ActiveObject,
    source: SM_StatePtr<ActiveObject, Event>,
    target: SM_StatePtr<ActiveObject, Event>,
    curr: SM_StatePtr<ActiveObject, Event>,
  ): void {
    const path = SM_PathOps.collectToTop(target, this.maxNestDepth);

    let pathIndex = 0;
    let reachedSource = false;
    let lcaFound = false;
    let state: SM_StatePtr<ActiveObject, Event> | null = curr;
    const seen = new Set<SM_StatePtr<ActiveObject, Event>>();

    while (state !== null) {
      if (seen.has(state)) {
        throw new Error(
          `Current state '${SM_stateName(curr)}' has a cyclic super_ chain.`,
        );
      }

      seen.add(state);

      if (state === source) {
        reachedSource = true;
      }

      if (reachedSource && !(state === source && target === source)) {
        for (let idx = 0; idx < path.length; idx += 1) {
          if (state === SM_PathOps.slot(path, idx)) {
            lcaFound = true;
            pathIndex = idx;
            break;
          }
        }
      }

      if (lcaFound) {
        break;
      }

      state.exit_?.(me);

      if (state.super_ !== null) {
        state = state.super_;
        continue;
      }

      if (reachedSource) {
        pathIndex = path.length;
        break;
      }

      throw new Error(
        `Transition source '${SM_stateName(source)}' is not active for current state '${SM_stateName(
          curr,
        )}'.`,
      );
    }

    while (pathIndex > 0) {
      pathIndex -= 1;
      SM_PathOps.slot(path, pathIndex).entry_?.(me);
    }

    this.curr_ = target;
    this.followInitChain(me);
  }

  private requireSourceOnActivePath(
    curr: SM_StatePtr<ActiveObject, Event>,
    source: SM_StatePtr<ActiveObject, Event>,
  ): void {
    const seen = new Set<SM_StatePtr<ActiveObject, Event>>();
    let state: SM_StatePtr<ActiveObject, Event> | null = curr;

    while (state !== null) {
      if (state === source) {
        return;
      }

      if (seen.has(state)) {
        throw new Error(
          `Current state '${SM_stateName(curr)}' has a cyclic super_ chain.`,
        );
      }

      seen.add(state);
      state = state.super_;
    }

    throw new Error(
      `Transition source '${SM_stateName(source)}' is not active for current state '${SM_stateName(
        curr,
      )}'.`,
    );
  }

  private followInitChain(me: ActiveObject): void {
    while (true) {
      const curr = this.requireInitialized();
      const init_ = curr.init_ ?? null;

      if (init_ === null) {
        return;
      }

      const target = init_(me);
      const path = SM_PathOps.collectUntilCurr(curr, target, this.maxNestDepth);

      let idx = path.length;
      while (idx > 0) {
        idx -= 1;
        const state = SM_PathOps.slot(path, idx);
        this.curr_ = state;
        state.entry_?.(me);
      }
    }
  }

  private enterPrimaryPath(
    me: ActiveObject,
    path: readonly SM_StatePtr<ActiveObject, Event>[],
  ): void {
    let idx = path.length;
    while (idx > 0) {
      idx -= 1;
      SM_PathOps.slot(path, idx).entry_?.(me);
    }
  }

  private requireInitialized(): SM_StatePtr<ActiveObject, Event> {
    if (this.curr_ === null) {
      throw new Error("State machine is not initialized.");
    }

    return this.curr_;
  }
}
