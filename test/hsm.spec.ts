import { describe, expect, it } from "vitest";

import {
  handled,
  HsmMachine,
  HsmState,
  superState,
  transition,
  type DispatchStatus,
  type HandlerResult,
} from "../src";

interface TraceCarrier {
  readonly trace: string[];
}

function takeTrace(carrier: TraceCarrier): string {
  const output = carrier.trace.join("");
  carrier.trace.length = 0;
  return output;
}

type SampleEvent =
  | { readonly type: "A" }
  | { readonly type: "C" }
  | { readonly type: "D" }
  | { readonly type: "E" }
  | { readonly type: "G" }
  | { readonly type: "I" };

class SampleTopState extends HsmState<SampleEvent, SampleMachine> {
  public constructor() {
    super("top", null);
  }

  public override init(machine: SampleMachine): HsmState<SampleEvent, SampleMachine> {
    machine.push("top-INIT.");
    return machine.s2;
  }
}

class SampleSState extends HsmState<SampleEvent, SampleMachine> {
  public constructor(parent: SampleTopState) {
    super("s", parent);
  }

  public override entry(machine: SampleMachine): void {
    machine.push("s-ENTRY.");
  }

  public override init(machine: SampleMachine): HsmState<SampleEvent, SampleMachine> {
    machine.push("s-INIT.");
    return machine.s11;
  }

  public override handle(
    machine: SampleMachine,
    event: SampleEvent,
  ): HandlerResult<SampleEvent, SampleMachine> {
    switch (event.type) {
      case "E":
        machine.push("s-E.");
        return transition(machine.s11);
      case "I":
        machine.push("s-I.");
        machine.routeIToSuper = false;
        return handled();
      default:
        return superState();
    }
  }
}

class SampleS1State extends HsmState<SampleEvent, SampleMachine> {
  public constructor(parent: SampleSState) {
    super("s1", parent);
  }

  public override entry(machine: SampleMachine): void {
    machine.push("s1-ENTRY.");
  }

  public override exit(machine: SampleMachine): void {
    machine.push("s1-EXIT.");
  }

  public override init(machine: SampleMachine): HsmState<SampleEvent, SampleMachine> {
    machine.push("s1-INIT.");
    return machine.s11;
  }

  public override handle(
    machine: SampleMachine,
    event: SampleEvent,
  ): HandlerResult<SampleEvent, SampleMachine> {
    switch (event.type) {
      case "A":
        machine.push("s1-A.");
        return transition(machine.s1);
      case "C":
        machine.push("s1-C.");
        return transition(machine.s2);
      case "D":
        machine.push("s1-D.");
        return transition(machine.s);
      case "I":
        machine.push("s1-I.");
        return handled();
      default:
        return superState();
    }
  }
}

class SampleS11State extends HsmState<SampleEvent, SampleMachine> {
  public constructor(parent: SampleS1State) {
    super("s11", parent);
  }

  public override entry(machine: SampleMachine): void {
    machine.push("s11-ENTRY.");
  }

  public override exit(machine: SampleMachine): void {
    machine.push("s11-EXIT.");
  }

  public override handle(
    machine: SampleMachine,
    event: SampleEvent,
  ): HandlerResult<SampleEvent, SampleMachine> {
    switch (event.type) {
      case "D":
        if (!machine.s11HandlesD) {
          machine.s11HandlesD = true;
          return superState();
        }

        machine.push("s11-D.");
        return transition(machine.s1);
      case "G":
        machine.push("s11-G.");
        return transition(machine.s211);
      default:
        return superState();
    }
  }
}

class SampleS2State extends HsmState<SampleEvent, SampleMachine> {
  public constructor(parent: SampleSState) {
    super("s2", parent);
  }

  public override entry(machine: SampleMachine): void {
    machine.push("s2-ENTRY.");
  }

  public override exit(machine: SampleMachine): void {
    machine.push("s2-EXIT.");
  }

  public override init(machine: SampleMachine): HsmState<SampleEvent, SampleMachine> {
    machine.push("s2-INIT.");
    return machine.s211;
  }

  public override handle(
    machine: SampleMachine,
    event: SampleEvent,
  ): HandlerResult<SampleEvent, SampleMachine> {
    if (event.type === "I") {
      if (!machine.routeIToSuper) {
        machine.push("s2-I.");
        machine.routeIToSuper = true;
        return handled();
      }

      return superState();
    }

    return superState();
  }
}

class SampleS21State extends HsmState<SampleEvent, SampleMachine> {
  public constructor(parent: SampleS2State) {
    super("s21", parent);
  }

  public override entry(machine: SampleMachine): void {
    machine.push("s21-ENTRY.");
  }

  public override exit(machine: SampleMachine): void {
    machine.push("s21-EXIT.");
  }

  public override handle(
    machine: SampleMachine,
    event: SampleEvent,
  ): HandlerResult<SampleEvent, SampleMachine> {
    if (event.type === "G") {
      machine.push("s21-G.");
      return transition(machine.s1);
    }

    return superState();
  }
}

class SampleS211State extends HsmState<SampleEvent, SampleMachine> {
  public constructor(parent: SampleS21State) {
    super("s211", parent);
  }

  public override entry(machine: SampleMachine): void {
    machine.push("s211-ENTRY.");
  }

  public override exit(machine: SampleMachine): void {
    machine.push("s211-EXIT.");
  }

  public override handle(
    _machine: SampleMachine,
    _event: SampleEvent,
  ): HandlerResult<SampleEvent, SampleMachine> {
    return superState();
  }
}

class SampleMachine extends HsmMachine<SampleEvent, SampleMachine> implements TraceCarrier {
  public readonly trace: string[] = [];
  public routeIToSuper = false;
  public s11HandlesD = false;

  public readonly top: SampleTopState;
  public readonly s: SampleSState;
  public readonly s1: SampleS1State;
  public readonly s11: SampleS11State;
  public readonly s2: SampleS2State;
  public readonly s21: SampleS21State;
  public readonly s211: SampleS211State;

  public constructor() {
    const top = new SampleTopState();
    super(top);

    this.top = top;
    this.s = new SampleSState(this.top);
    this.s1 = new SampleS1State(this.s);
    this.s11 = new SampleS11State(this.s1);
    this.s2 = new SampleS2State(this.s);
    this.s21 = new SampleS21State(this.s2);
    this.s211 = new SampleS211State(this.s21);
  }

  public push(fragment: string): void {
    this.trace.push(fragment);
  }
}

describe("class-based hierarchy parity", () => {
  it("matches startup and sequence-B sample traces", () => {
    const machine = new SampleMachine();
    machine.start();

    expect(takeTrace(machine)).toBe(
      "top-INIT.s-ENTRY.s2-ENTRY.s2-INIT.s21-ENTRY.s211-ENTRY.",
    );

    const sequence: SampleEvent[] = [
      { type: "G" },
      { type: "I" },
      { type: "A" },
      { type: "D" },
      { type: "D" },
      { type: "C" },
      { type: "E" },
      { type: "E" },
      { type: "G" },
      { type: "I" },
      { type: "I" },
    ];

    const expected = [
      "s21-G.s211-EXIT.s21-EXIT.s2-EXIT.s1-ENTRY.s1-INIT.s11-ENTRY.",
      "s1-I.",
      "s1-A.s11-EXIT.s1-EXIT.s1-ENTRY.s1-INIT.s11-ENTRY.",
      "s1-D.s11-EXIT.s1-EXIT.s-INIT.s1-ENTRY.s11-ENTRY.",
      "s11-D.s11-EXIT.s1-INIT.s11-ENTRY.",
      "s1-C.s11-EXIT.s1-EXIT.s2-ENTRY.s2-INIT.s21-ENTRY.s211-ENTRY.",
      "s-E.s211-EXIT.s21-EXIT.s2-EXIT.s1-ENTRY.s11-ENTRY.",
      "s-E.s11-EXIT.s1-EXIT.s1-ENTRY.s11-ENTRY.",
      "s11-G.s11-EXIT.s1-EXIT.s2-ENTRY.s21-ENTRY.s211-ENTRY.",
      "s2-I.",
      "s-I.",
    ];

    sequence.forEach((event, index) => {
      const status = machine.dispatch(event);
      expect(status).not.toBe("unhandled");
      expect(takeTrace(machine)).toBe(expected[index]);
    });

    expect(machine.currentState.id).toBe("s211");
  });
});

describe("reentrant runtime semantics", () => {
  it("supports nested dispatch from handler on same instance", () => {
    type Event = { readonly type: "OUTER" } | { readonly type: "INNER" };

    class TopState extends HsmState<Event, HandlerNestedMachine> {
      public constructor() {
        super("top", null);
      }

      public override init(
        machine: HandlerNestedMachine,
      ): HsmState<Event, HandlerNestedMachine> {
        return machine.active;
      }
    }

    class ActiveState extends HsmState<Event, HandlerNestedMachine> {
      public constructor(parent: TopState) {
        super("active", parent);
      }

      public override handle(
        machine: HandlerNestedMachine,
        event: Event,
      ): HandlerResult<Event, HandlerNestedMachine> {
        if (event.type === "OUTER") {
          machine.push("OUTER-START.");
          const nestedStatus: DispatchStatus = machine.dispatch({ type: "INNER" });
          machine.push(`INNER-STATUS-${nestedStatus}.`);
          machine.push("OUTER-END.");
          return handled();
        }

        machine.push("INNER.");
        return handled();
      }
    }

    class HandlerNestedMachine
      extends HsmMachine<Event, HandlerNestedMachine>
      implements TraceCarrier
    {
      public readonly trace: string[] = [];
      public readonly top: TopState;
      public readonly active: ActiveState;

      public constructor() {
        const top = new TopState();
        super(top);

        this.top = top;
        this.active = new ActiveState(this.top);
      }

      public push(fragment: string): void {
        this.trace.push(fragment);
      }
    }

    const machine = new HandlerNestedMachine();
    machine.start();
    takeTrace(machine);

    expect(machine.dispatch({ type: "OUTER" })).toBe("handled");
    expect(takeTrace(machine)).toBe(
      "OUTER-START.INNER.INNER-STATUS-handled.OUTER-END.",
    );
  });

  it("supports nested dispatch from entry", () => {
    type Event = { readonly type: "GO" } | { readonly type: "NEST" };

    class TopState extends HsmState<Event, EntryNestedMachine> {
      public constructor() {
        super("top", null);
      }

      public override init(machine: EntryNestedMachine): HsmState<Event, EntryNestedMachine> {
        return machine.idle;
      }
    }

    class IdleState extends HsmState<Event, EntryNestedMachine> {
      public constructor(parent: TopState) {
        super("idle", parent);
      }

      public override exit(machine: EntryNestedMachine): void {
        machine.push("idle-EXIT.");
      }

      public override handle(
        machine: EntryNestedMachine,
        event: Event,
      ): HandlerResult<Event, EntryNestedMachine> {
        if (event.type === "GO") {
          machine.push("idle-GO.");
          return transition(machine.target);
        }

        return superState();
      }
    }

    class TargetState extends HsmState<Event, EntryNestedMachine> {
      public constructor(parent: TopState) {
        super("target", parent);
      }

      public override entry(machine: EntryNestedMachine): void {
        machine.push("target-ENTRY.");
        const nestedStatus = machine.dispatch({ type: "NEST" });
        machine.push(`target-ENTRY-NEST-${nestedStatus}.`);
      }

      public override handle(
        machine: EntryNestedMachine,
        event: Event,
      ): HandlerResult<Event, EntryNestedMachine> {
        if (event.type === "NEST") {
          machine.push("target-NEST.");
          return handled();
        }

        return superState();
      }
    }

    class EntryNestedMachine extends HsmMachine<Event, EntryNestedMachine> implements TraceCarrier {
      public readonly trace: string[] = [];
      public readonly top: TopState;
      public readonly idle: IdleState;
      public readonly target: TargetState;

      public constructor() {
        const top = new TopState();
        super(top);

        this.top = top;
        this.idle = new IdleState(this.top);
        this.target = new TargetState(this.top);
      }

      public push(fragment: string): void {
        this.trace.push(fragment);
      }
    }

    const machine = new EntryNestedMachine();
    machine.start();
    takeTrace(machine);

    expect(machine.dispatch({ type: "GO" })).toBe("transition");
    expect(takeTrace(machine)).toBe(
      "idle-GO.idle-EXIT.target-ENTRY.target-NEST.target-ENTRY-NEST-handled.",
    );
    expect(machine.currentState.id).toBe("target");
  });

  it("supports nested dispatch from exit with leaf removed before exit callback", () => {
    type Event = { readonly type: "GO" } | { readonly type: "NEST" };

    class TopState extends HsmState<Event, ExitNestedMachine> {
      public constructor() {
        super("top", null);
      }

      public override init(machine: ExitNestedMachine): HsmState<Event, ExitNestedMachine> {
        return machine.parent;
      }
    }

    class ParentState extends HsmState<Event, ExitNestedMachine> {
      public constructor(parent: TopState) {
        super("parent", parent);
      }

      public override init(machine: ExitNestedMachine): HsmState<Event, ExitNestedMachine> {
        return machine.from;
      }

      public override handle(
        machine: ExitNestedMachine,
        event: Event,
      ): HandlerResult<Event, ExitNestedMachine> {
        if (event.type === "NEST") {
          machine.push("parent-NEST.");
          return handled();
        }

        return superState();
      }
    }

    class FromState extends HsmState<Event, ExitNestedMachine> {
      public constructor(parent: ParentState) {
        super("from", parent);
      }

      public override exit(machine: ExitNestedMachine): void {
        machine.push("from-EXIT.");
        const nestedStatus = machine.dispatch({ type: "NEST" });
        machine.push(`from-EXIT-NEST-${nestedStatus}.`);
      }

      public override handle(
        machine: ExitNestedMachine,
        event: Event,
      ): HandlerResult<Event, ExitNestedMachine> {
        if (event.type === "GO") {
          machine.push("from-GO.");
          return transition(machine.to);
        }

        if (event.type === "NEST") {
          machine.push("from-NEST.");
          return handled();
        }

        return superState();
      }
    }

    class ToState extends HsmState<Event, ExitNestedMachine> {
      public constructor(parent: ParentState) {
        super("to", parent);
      }

      public override entry(machine: ExitNestedMachine): void {
        machine.push("to-ENTRY.");
      }
    }

    class ExitNestedMachine extends HsmMachine<Event, ExitNestedMachine> implements TraceCarrier {
      public readonly trace: string[] = [];
      public readonly top: TopState;
      public readonly parent: ParentState;
      public readonly from: FromState;
      public readonly to: ToState;

      public constructor() {
        const top = new TopState();
        super(top);

        this.top = top;
        this.parent = new ParentState(this.top);
        this.from = new FromState(this.parent);
        this.to = new ToState(this.parent);
      }

      public push(fragment: string): void {
        this.trace.push(fragment);
      }
    }

    const machine = new ExitNestedMachine();
    machine.start();
    takeTrace(machine);

    expect(machine.dispatch({ type: "GO" })).toBe("transition");
    expect(takeTrace(machine)).toBe(
      "from-GO.from-EXIT.parent-NEST.from-EXIT-NEST-handled.to-ENTRY.",
    );
    expect(machine.currentState.id).toBe("to");
  });

  it("supports nested dispatch from init and ignores init return when composite became inactive", () => {
    type Event = { readonly type: "ESCAPE" };

    class TopState extends HsmState<Event, InitNestedMachine> {
      public constructor() {
        super("top", null);
      }

      public override init(machine: InitNestedMachine): HsmState<Event, InitNestedMachine> {
        machine.push("top-INIT.");
        return machine.composite;
      }
    }

    class CompositeState extends HsmState<Event, InitNestedMachine> {
      public constructor(parent: TopState) {
        super("composite", parent);
      }

      public override entry(machine: InitNestedMachine): void {
        machine.push("composite-ENTRY.");
      }

      public override exit(machine: InitNestedMachine): void {
        machine.push("composite-EXIT.");
      }

      public override init(machine: InitNestedMachine): HsmState<Event, InitNestedMachine> {
        machine.push("composite-INIT-START.");
        const nestedStatus = machine.dispatch({ type: "ESCAPE" });
        machine.push(`composite-INIT-ESCAPE-${nestedStatus}.`);
        machine.push("composite-INIT-END.");
        return machine.compositeChild;
      }

      public override handle(
        machine: InitNestedMachine,
        event: Event,
      ): HandlerResult<Event, InitNestedMachine> {
        if (event.type === "ESCAPE") {
          machine.push("composite-ESCAPE.");
          return transition(machine.other);
        }

        return superState();
      }
    }

    class CompositeChildState extends HsmState<Event, InitNestedMachine> {
      public constructor(parent: CompositeState) {
        super("compositeChild", parent);
      }

      public override entry(machine: InitNestedMachine): void {
        machine.push("compositeChild-ENTRY.");
      }
    }

    class OtherState extends HsmState<Event, InitNestedMachine> {
      public constructor(parent: TopState) {
        super("other", parent);
      }

      public override entry(machine: InitNestedMachine): void {
        machine.push("other-ENTRY.");
      }
    }

    class InitNestedMachine extends HsmMachine<Event, InitNestedMachine> implements TraceCarrier {
      public readonly trace: string[] = [];
      public readonly top: TopState;
      public readonly composite: CompositeState;
      public readonly compositeChild: CompositeChildState;
      public readonly other: OtherState;

      public constructor() {
        const top = new TopState();
        super(top);

        this.top = top;
        this.composite = new CompositeState(this.top);
        this.compositeChild = new CompositeChildState(this.composite);
        this.other = new OtherState(this.top);
      }

      public push(fragment: string): void {
        this.trace.push(fragment);
      }
    }

    const machine = new InitNestedMachine();
    machine.start();

    expect(takeTrace(machine)).toBe(
      "top-INIT.composite-ENTRY.composite-INIT-START.composite-ESCAPE.composite-EXIT.other-ENTRY.composite-INIT-ESCAPE-transition.composite-INIT-END.",
    );
    expect(machine.currentState.id).toBe("other");
  });

  it("supports ancestor self-transition semantics with recursive behavior", () => {
    type Event = { readonly type: "RESET" } | { readonly type: "PING" };

    class TopState extends HsmState<Event, AncestorSelfMachine> {
      public constructor() {
        super("top", null);
      }

      public override init(machine: AncestorSelfMachine): HsmState<Event, AncestorSelfMachine> {
        return machine.ancestor;
      }
    }

    class AncestorState extends HsmState<Event, AncestorSelfMachine> {
      public constructor(parent: TopState) {
        super("ancestor", parent);
      }

      public override entry(machine: AncestorSelfMachine): void {
        machine.push("ancestor-ENTRY.");
        const nestedStatus = machine.dispatch({ type: "PING" });
        machine.push(`ancestor-ENTRY-PING-${nestedStatus}.`);
      }

      public override exit(machine: AncestorSelfMachine): void {
        machine.push("ancestor-EXIT.");
      }

      public override init(machine: AncestorSelfMachine): HsmState<Event, AncestorSelfMachine> {
        machine.push("ancestor-INIT.");
        return machine.leaf;
      }

      public override handle(
        machine: AncestorSelfMachine,
        event: Event,
      ): HandlerResult<Event, AncestorSelfMachine> {
        if (event.type === "RESET") {
          machine.push("ancestor-RESET.");
          return transition(machine.ancestor);
        }

        if (event.type === "PING") {
          machine.push("ancestor-PING.");
          return handled();
        }

        return superState();
      }
    }

    class LeafState extends HsmState<Event, AncestorSelfMachine> {
      public constructor(parent: AncestorState) {
        super("leaf", parent);
      }

      public override entry(machine: AncestorSelfMachine): void {
        machine.push("leaf-ENTRY.");
      }

      public override exit(machine: AncestorSelfMachine): void {
        machine.push("leaf-EXIT.");
      }

      public override handle(
        _machine: AncestorSelfMachine,
        _event: Event,
      ): HandlerResult<Event, AncestorSelfMachine> {
        return superState();
      }
    }

    class AncestorSelfMachine
      extends HsmMachine<Event, AncestorSelfMachine>
      implements TraceCarrier
    {
      public readonly trace: string[] = [];
      public readonly top: TopState;
      public readonly ancestor: AncestorState;
      public readonly leaf: LeafState;

      public constructor() {
        const top = new TopState();
        super(top);

        this.top = top;
        this.ancestor = new AncestorState(this.top);
        this.leaf = new LeafState(this.ancestor);
      }

      public push(fragment: string): void {
        this.trace.push(fragment);
      }
    }

    const machine = new AncestorSelfMachine();
    machine.start();
    takeTrace(machine);

    expect(machine.dispatch({ type: "RESET" })).toBe("transition");
    expect(takeTrace(machine)).toBe(
      "ancestor-RESET.leaf-EXIT.ancestor-EXIT.ancestor-ENTRY.ancestor-PING.ancestor-ENTRY-PING-handled.ancestor-INIT.leaf-ENTRY.",
    );
    expect(machine.currentState.id).toBe("leaf");
  });

  it("allows deep same-instance recursive dispatch without busy rejection", () => {
    type Event = { readonly type: "CHAIN"; readonly depth: number };

    class TopState extends HsmState<Event, DeepRecursiveMachine> {
      public constructor() {
        super("top", null);
      }

      public override init(machine: DeepRecursiveMachine): HsmState<Event, DeepRecursiveMachine> {
        return machine.active;
      }
    }

    class ActiveState extends HsmState<Event, DeepRecursiveMachine> {
      public constructor(parent: TopState) {
        super("active", parent);
      }

      public override handle(
        machine: DeepRecursiveMachine,
        event: Event,
      ): HandlerResult<Event, DeepRecursiveMachine> {
        machine.push(`chain-${event.depth}.`);

        if (event.depth > 0) {
          const nestedStatus = machine.dispatch({ type: "CHAIN", depth: event.depth - 1 });
          machine.push(`status-${nestedStatus}.`);
        }

        return handled();
      }
    }

    class DeepRecursiveMachine
      extends HsmMachine<Event, DeepRecursiveMachine>
      implements TraceCarrier
    {
      public readonly trace: string[] = [];
      public readonly top: TopState;
      public readonly active: ActiveState;

      public constructor() {
        const top = new TopState();
        super(top);

        this.top = top;
        this.active = new ActiveState(this.top);
      }

      public push(fragment: string): void {
        this.trace.push(fragment);
      }
    }

    const machine = new DeepRecursiveMachine();
    machine.start();
    takeTrace(machine);

    expect(machine.dispatch({ type: "CHAIN", depth: 3 })).toBe("handled");
    expect(takeTrace(machine)).toBe(
      "chain-3.chain-2.chain-1.chain-0.status-handled.status-handled.status-handled.",
    );
  });
});
