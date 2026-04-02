export interface EventObject {
  readonly type: string;
}

export interface HandledResult {
  readonly kind: "handled";
}

export interface SuperResult {
  readonly kind: "super";
}

export interface TransitionResult<
  E extends EventObject,
  M extends HsmMachine<E, M>,
> {
  readonly kind: "transition";
  readonly target: HsmState<E, M>;
  readonly source?: HsmState<E, M>;
}

export type HandlerResult<
  E extends EventObject,
  M extends HsmMachine<E, M>,
> = HandledResult | SuperResult | TransitionResult<E, M>;

const HANDLED_RESULT: HandledResult = { kind: "handled" };
const SUPER_RESULT: SuperResult = { kind: "super" };

export function handled<
  E extends EventObject,
  M extends HsmMachine<E, M>,
>(): HandlerResult<E, M> {
  return HANDLED_RESULT;
}

export function superState<
  E extends EventObject,
  M extends HsmMachine<E, M>,
>(): HandlerResult<E, M> {
  return SUPER_RESULT;
}

export function transition<
  E extends EventObject,
  M extends HsmMachine<E, M>,
>(
  target: HsmState<E, M>,
  source?: HsmState<E, M>,
): TransitionResult<E, M> {
  if (source === undefined) {
    return { kind: "transition", target };
  }

  return { kind: "transition", target, source };
}

export type DispatchStatus = "handled" | "transition" | "unhandled";

export abstract class HsmState<
  E extends EventObject,
  M extends HsmMachine<E, M>,
> {
  public readonly id: string;
  public readonly parent: HsmState<E, M> | null;

  protected constructor(id: string, parent: HsmState<E, M> | null) {
    this.id = id;
    this.parent = parent;
  }

  public entry(_machine: M): void {}

  public exit(_machine: M): void {}

  public init(_machine: M): HsmState<E, M> | null {
    return null;
  }

  public handle(_machine: M, _event: E): HandlerResult<E, M> {
    return superState();
  }
}

export abstract class HsmMachine<
  E extends EventObject,
  M extends HsmMachine<E, M>,
> {
  private readonly topStateNode: HsmState<E, M>;
  private readonly activePathNodes: HsmState<E, M>[] = [];
  private started = false;

  protected constructor(topState: HsmState<E, M>) {
    if (topState.parent !== null) {
      throw new Error(`Top state '${topState.id}' must not have a parent.`);
    }

    this.topStateNode = topState;
    this.activePathNodes.push(topState);
  }

  public get topState(): HsmState<E, M> {
    return this.topStateNode;
  }

  public get currentState(): HsmState<E, M> {
    const leaf = this.activeLeafOrNull();
    if (leaf === null) {
      throw new Error("Active path is unexpectedly empty.");
    }

    return leaf;
  }

  public get activePath(): readonly HsmState<E, M>[] {
    return [...this.activePathNodes];
  }

  public get isStarted(): boolean {
    return this.started;
  }

  public isStateActive(state: HsmState<E, M>): boolean {
    return this.isActive(state);
  }

  public start(): void {
    if (this.started) {
      throw new Error("State machine has already been started.");
    }

    this.started = true;
    this.activePathNodes.length = 0;
    this.activePathNodes.push(this.topStateNode);

    try {
      this.runInitDescentFrom(this.topStateNode);
    } catch (error) {
      this.started = false;
      this.activePathNodes.length = 0;
      this.activePathNodes.push(this.topStateNode);
      throw error;
    }
  }

  public dispatch(event: E): DispatchStatus {
    if (!this.started) {
      throw new Error("State machine must be started before dispatch.");
    }

    return this.dispatchFrame(event);
  }

  private dispatchFrame(event: E): DispatchStatus {
    let probe = this.currentState;

    while (true) {
      const handlerState = this.resolveActiveProbe(probe);
      if (handlerState === null) {
        return "unhandled";
      }

      const result = handlerState.handle(this.machine(), event);

      if (result.kind === "handled") {
        return "handled";
      }

      if (result.kind === "transition") {
        const source = result.source ?? handlerState;
        this.performTransition(source, result.target);
        return "transition";
      }

      const nextProbe = this.nextSuperProbe(handlerState);
      if (nextProbe === null) {
        return "unhandled";
      }

      probe = nextProbe;
    }
  }

  private performTransition(source: HsmState<E, M>, target: HsmState<E, M>): void {
    this.ensureInTree(source, "source");
    this.ensureInTree(target, "target");

    if (!this.isActive(source)) {
      throw new Error(
        `Transition source '${source.id}' is not active for current leaf '${this.currentState.id}'.`,
      );
    }

    this.exitDescendantsOf(source);

    if (!this.isActive(source)) {
      return;
    }

    if (source === target) {
      if (source.parent === null) {
        throw new Error("Top-state self-transition is not supported.");
      }

      if (this.currentState !== source) {
        return;
      }

      this.exitState(source);

      if (!this.canEnterState(source)) {
        return;
      }

      this.enterState(source);

      if (this.isActive(source)) {
        this.runInitDescentFrom(source);
      }

      return;
    }

    const lca = this.findLeastCommonAncestor(source, target);
    this.exitPathFromSourceToAncestor(source, lca);

    if (!this.isActive(lca)) {
      return;
    }

    this.enterPathFromAncestorToTarget(lca, target);

    if (this.isActive(target)) {
      this.runInitDescentFrom(target);
    }
  }

  private runInitDescentFrom(composite: HsmState<E, M>): void {
    let scan = composite;

    while (true) {
      if (!this.isActive(scan)) {
        return;
      }

      if (this.currentState !== scan) {
        return;
      }

      const target = scan.init(this.machine());

      if (!this.isActive(scan)) {
        return;
      }

      if (this.currentState !== scan) {
        return;
      }

      if (target === null) {
        return;
      }

      this.ensureInTree(target, "init target");

      if (!this.isAncestorOf(scan, target)) {
        throw new Error(
          `Init target '${target.id}' must be a descendant of '${scan.id}'.`,
        );
      }

      const entryPath = this.pathFromAncestorToDescendant(scan, target);

      for (const state of entryPath) {
        if (!this.canEnterState(state)) {
          return;
        }

        this.enterState(state);

        if (!this.isActive(state)) {
          return;
        }

        if (this.currentState !== state) {
          return;
        }
      }

      scan = target;
    }
  }

  private exitDescendantsOf(source: HsmState<E, M>): void {
    while (this.isActive(source)) {
      const leaf = this.currentState;
      if (leaf === source) {
        return;
      }

      this.exitState(leaf);
    }
  }

  private exitPathFromSourceToAncestor(
    source: HsmState<E, M>,
    ancestor: HsmState<E, M>,
  ): void {
    const exitStates = this.pathFromDescendantToAncestor(source, ancestor);

    for (const state of exitStates) {
      if (!this.isActive(state)) {
        return;
      }

      this.exitDescendantsOf(state);

      if (!this.isActive(state)) {
        return;
      }

      if (this.currentState !== state) {
        return;
      }

      this.exitState(state);
    }
  }

  private enterPathFromAncestorToTarget(
    ancestor: HsmState<E, M>,
    target: HsmState<E, M>,
  ): void {
    const entryStates = this.pathFromAncestorToDescendant(ancestor, target);

    for (const state of entryStates) {
      if (!this.canEnterState(state)) {
        return;
      }

      this.enterState(state);

      if (!this.isActive(state)) {
        return;
      }

      if (this.currentState !== state) {
        return;
      }
    }
  }

  private findLeastCommonAncestor(
    left: HsmState<E, M>,
    right: HsmState<E, M>,
  ): HsmState<E, M> {
    const leftAncestors = new Set<HsmState<E, M>>();
    let scan: HsmState<E, M> | null = left;

    while (scan !== null) {
      leftAncestors.add(scan);
      scan = scan.parent;
    }

    scan = right;

    while (scan !== null) {
      if (leftAncestors.has(scan)) {
        return scan;
      }

      scan = scan.parent;
    }

    throw new Error(
      `No least common ancestor exists between '${left.id}' and '${right.id}'.`,
    );
  }

  private pathFromDescendantToAncestor(
    descendant: HsmState<E, M>,
    ancestor: HsmState<E, M>,
  ): HsmState<E, M>[] {
    const path: HsmState<E, M>[] = [];
    let scan: HsmState<E, M> | null = descendant;

    while (scan !== ancestor) {
      path.push(scan);
      scan = scan.parent;

      if (scan === null) {
        throw new Error(
          `State '${ancestor.id}' is not an ancestor of '${descendant.id}'.`,
        );
      }
    }

    return path;
  }

  private pathFromAncestorToDescendant(
    ancestor: HsmState<E, M>,
    descendant: HsmState<E, M>,
  ): HsmState<E, M>[] {
    const reversePath: HsmState<E, M>[] = [];
    let scan: HsmState<E, M> | null = descendant;

    while (scan !== ancestor) {
      reversePath.push(scan);
      scan = scan.parent;

      if (scan === null) {
        throw new Error(
          `State '${descendant.id}' is not a descendant of '${ancestor.id}'.`,
        );
      }
    }

    reversePath.reverse();
    return reversePath;
  }

  private resolveActiveProbe(probe: HsmState<E, M>): HsmState<E, M> | null {
    if (this.isActive(probe)) {
      return probe;
    }

    return this.activeLeafOrNull();
  }

  private nextSuperProbe(invokedState: HsmState<E, M>): HsmState<E, M> | null {
    if (this.isActive(invokedState)) {
      return invokedState.parent;
    }

    const leaf = this.activeLeafOrNull();
    if (leaf === null) {
      return null;
    }

    return leaf.parent;
  }

  private ensureInTree(state: HsmState<E, M>, label: string): void {
    let scan: HsmState<E, M> | null = state;

    while (scan !== null) {
      if (scan === this.topStateNode) {
        return;
      }

      scan = scan.parent;
    }

    throw new Error(`The ${label} state '${state.id}' is not in this machine tree.`);
  }

  private isAncestorOf(ancestor: HsmState<E, M>, candidate: HsmState<E, M>): boolean {
    let scan: HsmState<E, M> | null = candidate;

    while (scan !== null) {
      if (scan === ancestor) {
        return true;
      }

      scan = scan.parent;
    }

    return false;
  }

  private isActive(state: HsmState<E, M>): boolean {
    return this.activePathNodes.includes(state);
  }

  private canEnterState(state: HsmState<E, M>): boolean {
    const parent = state.parent;
    if (parent === null) {
      return false;
    }

    if (!this.isActive(parent)) {
      return false;
    }

    return this.currentState === parent;
  }

  private enterState(state: HsmState<E, M>): void {
    const parent = state.parent;
    if (parent === null) {
      throw new Error(`Cannot enter top state '${state.id}'.`);
    }

    if (this.currentState !== parent) {
      throw new Error(
        `Cannot enter '${state.id}' because its parent '${parent.id}' is not the active leaf.`,
      );
    }

    this.activePathNodes.push(state);
    state.entry(this.machine());
  }

  private exitState(state: HsmState<E, M>): void {
    if (this.currentState !== state) {
      throw new Error(
        `Cannot exit '${state.id}' because it is not the active leaf ('${this.currentState.id}').`,
      );
    }

    this.activePathNodes.pop();
    state.exit(this.machine());
  }

  private activeLeafOrNull(): HsmState<E, M> | null {
    const leaf = this.activePathNodes[this.activePathNodes.length - 1];
    if (leaf === undefined) {
      return null;
    }

    return leaf;
  }

  private machine(): M {
    return this as unknown as M;
  }
}
