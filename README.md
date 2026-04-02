# ts_hsm

`ts_hsm` is a class-based hierarchical state machine for TypeScript. States are classes, machines are classes, and the public helpers build the handler results used by the runtime.

Import from the package root:

```ts
import {
  handled,
  HsmMachine,
  HsmState,
  superState,
  transition,
  type DispatchStatus,
  type EventObject,
  type HandledResult,
  type HandlerResult,
  type SuperResult,
  type TransitionResult,
} from "ts_hsm";
```

## Public API

### `EventObject`

The minimal event shape is:

```ts
interface EventObject {
  readonly type: string;
}
```

Every event must have a string `type`.

### `HsmState<E, M>`

Base class for states. Subclasses provide the hierarchy and behavior.

- `id`, a string identifier
- `parent`, another state or `null` for the top state
- `entry(machine)`
- `exit(machine)`
- `init(machine)`, returns the initial child state or `null`
- `handle(machine, event)`, returns a handler result

### `HsmMachine<E, M>`

Base class for the machine instance.

- `topState`
- `currentState`
- `activePath`
- `isStarted`
- `isStateActive(state)`
- `start()`
- `dispatch(event)`

### Handler helpers and result types

- `handled()` returns a handled result
- `superState()` asks the runtime to bubble to the parent state
- `transition(target, source?)` requests a transition
- `DispatchStatus` is `"handled" | "transition" | "unhandled"`
- `HandlerResult`, `HandledResult`, `SuperResult`, `TransitionResult` are the exported result types used by `handle()`

## Class-based usage

The machine owns concrete state instances and wires them together through inheritance.

```ts
type AppEvent =
  | { readonly type: "GO" }
  | { readonly type: "STOP" };

class TopState extends HsmState<AppEvent, AppMachine> {
  constructor() {
    super("top", null);
  }

  override init(machine: AppMachine): HsmState<AppEvent, AppMachine> {
    return machine.idle;
  }
}

class IdleState extends HsmState<AppEvent, AppMachine> {
  constructor(parent: TopState) {
    super("idle", parent);
  }

  override handle(machine: AppMachine, event: AppEvent) {
    if (event.type === "GO") {
      return transition(machine.active);
    }

    return superState();
  }
}

class ActiveState extends HsmState<AppEvent, AppMachine> {
  constructor(parent: TopState) {
    super("active", parent);
  }

  override handle(machine: AppMachine, event: AppEvent) {
    if (event.type === "STOP") {
      return transition(machine.idle);
    }

    return handled();
  }
}

class AppMachine extends HsmMachine<AppEvent, AppMachine> {
  readonly top: TopState;
  readonly idle: IdleState;
  readonly active: ActiveState;

  constructor() {
    const top = new TopState();
    super(top);

    this.top = top;
    this.idle = new IdleState(this.top);
    this.active = new ActiveState(this.top);
  }
}

const machine = new AppMachine();
machine.start();
machine.dispatch({ type: "GO" });
```

## Semantics

The runtime supports synchronous reentrancy on the same instance. A handler, entry method, or exit method may call `dispatch()` on that same machine before the outer call returns.

That is not classic single-instance, non-reentrant RTC semantics. Treat each HSM instance as owned by one executor at a time. Multiple instances can run independently. If you share mutable state outside the HSM, you still need external synchronization.

## Standard reuse flow

If you want to vendor this package into another Git repository, keep it as a private local package and import from the package root instead of from `src/`.

Recommended layout:

```text
your_repo/
├─ src/
├─ package.json
└─ 3rd_party/
   └─ ts_hsm/
```

Build the vendored package first:

```bash
cd 3rd_party/ts_hsm
npm install
npm run build
```

Then declare it as a local dependency in the host project's `package.json`:

```json
{
  "dependencies": {
    "ts_hsm": "file:./3rd_party/ts_hsm"
  }
}
```

Install dependencies from the host project root:

```bash
cd your_repo
npm install
```

After that, use the package by name:

```ts
import {
  HsmMachine,
  HsmState,
  handled,
  superState,
  transition,
  type EventObject,
} from "ts_hsm";
```

If you update `3rd_party/ts_hsm`, rebuild it before rebuilding the host project:

```bash
cd 3rd_party/ts_hsm
npm run build
```

Avoid importing from `3rd_party/ts_hsm/src` as a long-term integration boundary. The supported package boundary is the package root, which resolves to `dist/`.

## Commands

- `npm run build`
- `npm test`
- `npm run typecheck`
- `npm run example:hsmtst`
