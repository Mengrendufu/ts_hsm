import {
  handled,
  HsmMachine,
  HsmState,
  superState,
  transition,
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

function runDemo(): void {
  const machine = new SampleMachine();
  machine.start();

  console.log(`startup trace: ${takeTrace(machine)}`);

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

  for (const event of sequence) {
    const status = machine.dispatch(event);

    if (status === "unhandled") {
      throw new Error(`Unexpected unhandled event: ${event.type}`);
    }

    console.log(`${event.type} trace: ${takeTrace(machine)}`);
  }

  console.log(`final active state: ${machine.currentState.id}`);
}

runDemo();
