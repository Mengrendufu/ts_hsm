# ts_hsm

`ts_hsm` is a descriptor-based hierarchical state machine runtime for TypeScript. Its structure mirrors `rs_hsm_`: states are static descriptor objects, hierarchy is expressed through `super_` state pointers, and handlers return `SM_RetState` values.

## Import

```ts
import {
  SM_Hsm,
  SM_RetState,
  type SM_HsmState,
  type SM_StatePtr,
} from "ts_hsm";
```

## Public API

- `SM_Hsm<ActiveObject, Event>` owns the current state pointer.
- `SM_HsmState<ActiveObject, Event>` describes one state table row.
- `SM_StatePtr<ActiveObject, Event>` is a state descriptor reference.
- `SM_RetState.Handled` marks an event handled.
- `SM_RetState.Super` bubbles to `super_`.
- `SM_RetState.Tran(target)` requests a transition.

## State Descriptor

```ts
const state: SM_HsmState<App, AppEvent> = {
  name: "state",
  super_: parentState,
  init_: null,
  entry_: (me) => me.trace("state-ENTRY."),
  exit_: (me) => me.trace("state-EXIT."),
  handler_: (me, event) => SM_RetState.Super,
};
```

The field names intentionally match the Rust version:

- `super_`: parent state pointer, or `null` for the root state.
- `init_`: optional initial transition function.
- `entry_`: optional entry action.
- `exit_`: optional exit action.
- `handler_`: event handler function.

## Machine Usage

```ts
type AppEvent = { readonly sig: "GO" | "STOP" };

class App {
  private readonly sm_hsm_ = new SM_Hsm<App, AppEvent>(App_TOP_initial, 5);

  public constructor() {
    this.sm_hsm_.init(this);
  }

  public dispatch(event: AppEvent): void {
    this.sm_hsm_.dispatch(this, event);
  }
}

function App_TOP_initial(_me: App): SM_StatePtr<App, AppEvent> {
  return App_idle;
}

const App_root: SM_HsmState<App, AppEvent> = {
  name: "root",
  super_: null,
  init_: null,
  handler_: () => SM_RetState.Super,
};

const App_idle: SM_HsmState<App, AppEvent> = {
  name: "idle",
  super_: App_root,
  init_: null,
  handler_: (_me, event) =>
    event.sig === "GO" ? SM_RetState.Tran(App_active) : SM_RetState.Super,
};

const App_active: SM_HsmState<App, AppEvent> = {
  name: "active",
  super_: App_root,
  init_: null,
  handler_: (_me, event) =>
    event.sig === "STOP" ? SM_RetState.Tran(App_idle) : SM_RetState.Super,
};
```

See `examples/hsmtst.ts` for the full Rust-aligned fixture style.

## Commands

- `npm run build`
- `npm test`
- `npm run typecheck`
- `npm run example:hsmtst`
