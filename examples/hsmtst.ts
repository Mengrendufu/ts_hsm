import {
  SM_Hsm,
  SM_RetState,
  type SM_HsmState,
  type SM_RetState as SM_RetStateType,
  type SM_StatePtr,
} from "../src";

export enum SmHsmTstSig {
  A_SIG = "A_SIG",
  B_SIG = "B_SIG",
  C_SIG = "C_SIG",
  D_SIG = "D_SIG",
  E_SIG = "E_SIG",
  F_SIG = "F_SIG",
  G_SIG = "G_SIG",
  H_SIG = "H_SIG",
  I_SIG = "I_SIG",
  Z_SIG = "Z_SIG",
}

export interface SmHsmTstEvt {
  readonly sig: SmHsmTstSig;
}

function SmHsmTstEvt_new(sig: SmHsmTstSig): SmHsmTstEvt {
  return { sig };
}

export const SMHSMTST_SEQUENCE_A: readonly SmHsmTstSig[] = [
  SmHsmTstSig.A_SIG,
  SmHsmTstSig.B_SIG,
  SmHsmTstSig.D_SIG,
  SmHsmTstSig.E_SIG,
  SmHsmTstSig.I_SIG,
  SmHsmTstSig.F_SIG,
  SmHsmTstSig.I_SIG,
  SmHsmTstSig.I_SIG,
  SmHsmTstSig.F_SIG,
  SmHsmTstSig.A_SIG,
  SmHsmTstSig.B_SIG,
  SmHsmTstSig.D_SIG,
  SmHsmTstSig.D_SIG,
  SmHsmTstSig.E_SIG,
  SmHsmTstSig.G_SIG,
  SmHsmTstSig.H_SIG,
  SmHsmTstSig.H_SIG,
  SmHsmTstSig.C_SIG,
  SmHsmTstSig.G_SIG,
  SmHsmTstSig.C_SIG,
  SmHsmTstSig.C_SIG,
];

export const SMHSMTST_SEQUENCE_B: readonly SmHsmTstSig[] = [
  SmHsmTstSig.G_SIG,
  SmHsmTstSig.I_SIG,
  SmHsmTstSig.A_SIG,
  SmHsmTstSig.D_SIG,
  SmHsmTstSig.D_SIG,
  SmHsmTstSig.C_SIG,
  SmHsmTstSig.E_SIG,
  SmHsmTstSig.E_SIG,
  SmHsmTstSig.G_SIG,
  SmHsmTstSig.I_SIG,
  SmHsmTstSig.I_SIG,
];

export class SmHsmTst {
  public readonly sm_hsm_ = new SM_Hsm<SmHsmTst, SmHsmTstEvt>(
    SmHsmTst_TOP_initial,
    5,
  );
  public trace_ = "";
  public foo = 0;

  public constructor() {
    this.init();
  }

  private init(): void {
    this.sm_hsm_.init(this);
  }

  public trace(): string {
    return this.trace_;
  }

  public curr_name(): string {
    return SmHsmTst_state_name(
      this.sm_hsm_.curr() ?? fail("hsmtst machine must stay initialized"),
    );
  }

  public dispatch(sig: SmHsmTstSig): void {
    this.sm_hsm_.dispatch(this, SmHsmTstEvt_new(sig));
  }

  public dispatch_with_separator(sig: SmHsmTstSig): void {
    SmHsmTst_trace(this, "\n");
    this.dispatch(sig);
  }

  public finish(): SmHsmTstRun {
    return {
      trace: this.trace_,
      curr_name: this.curr_name(),
    };
  }
}

function fail(message: string): never {
  throw new Error(message);
}

function SmHsmTst_TOP_initial(me: SmHsmTst): SM_StatePtr<SmHsmTst, SmHsmTstEvt> {
  SmHsmTst_trace(me, "top-INIT.");
  return SmHsmTst_s2;
}

function SmHsmTst_trace(me: SmHsmTst, msg: string): void {
  me.trace_ += msg;
}

function SmHsmTst_s_init_(me: SmHsmTst): SM_StatePtr<SmHsmTst, SmHsmTstEvt> {
  SmHsmTst_trace(me, "s-INIT.");
  return SmHsmTst_s11;
}

function SmHsmTst_s_entry_(me: SmHsmTst): void {
  SmHsmTst_trace(me, "s-ENTRY.");
}

function SmHsmTst_s_exit_(me: SmHsmTst): void {
  SmHsmTst_trace(me, "s-EXIT.");
}

function SmHsmTst_s_(
  me: SmHsmTst,
  e: SmHsmTstEvt,
): SM_RetStateType<SmHsmTst, SmHsmTstEvt> {
  switch (e.sig) {
    case SmHsmTstSig.I_SIG:
      if (me.foo !== 0) {
        me.foo = 0;
        SmHsmTst_trace(me, "s-I.");
        return SM_RetState.Handled;
      }

      return SM_RetState.Super;
    case SmHsmTstSig.E_SIG:
      SmHsmTst_trace(me, "s-E.");
      return SM_RetState.Tran(SmHsmTst_s11);
    default:
      return SM_RetState.Super;
  }
}

function SmHsmTst_s1_init_(me: SmHsmTst): SM_StatePtr<SmHsmTst, SmHsmTstEvt> {
  SmHsmTst_trace(me, "s1-INIT.");
  return SmHsmTst_s11;
}

function SmHsmTst_s1_entry_(me: SmHsmTst): void {
  SmHsmTst_trace(me, "s1-ENTRY.");
}

function SmHsmTst_s1_exit_(me: SmHsmTst): void {
  SmHsmTst_trace(me, "s1-EXIT.");
}

function SmHsmTst_s1_(
  me: SmHsmTst,
  e: SmHsmTstEvt,
): SM_RetStateType<SmHsmTst, SmHsmTstEvt> {
  switch (e.sig) {
    case SmHsmTstSig.I_SIG:
      SmHsmTst_trace(me, "s1-I.");
      return SM_RetState.Handled;
    case SmHsmTstSig.B_SIG:
      SmHsmTst_trace(me, "s1-B.");
      return SM_RetState.Tran(SmHsmTst_s11);
    case SmHsmTstSig.A_SIG:
      SmHsmTst_trace(me, "s1-A.");
      return SM_RetState.Tran(SmHsmTst_s1);
    case SmHsmTstSig.F_SIG:
      SmHsmTst_trace(me, "s1-F.");
      return SM_RetState.Tran(SmHsmTst_s211);
    case SmHsmTstSig.C_SIG:
      SmHsmTst_trace(me, "s1-C.");
      return SM_RetState.Tran(SmHsmTst_s2);
    case SmHsmTstSig.D_SIG:
      if (me.foo === 0) {
        me.foo = 1;
        SmHsmTst_trace(me, "s1-D.");
        return SM_RetState.Tran(SmHsmTst_s);
      }

      return SM_RetState.Super;
    default:
      return SM_RetState.Super;
  }
}

function SmHsmTst_s11_entry_(me: SmHsmTst): void {
  SmHsmTst_trace(me, "s11-ENTRY.");
}

function SmHsmTst_s11_exit_(me: SmHsmTst): void {
  SmHsmTst_trace(me, "s11-EXIT.");
}

function SmHsmTst_s11_(
  me: SmHsmTst,
  e: SmHsmTstEvt,
): SM_RetStateType<SmHsmTst, SmHsmTstEvt> {
  switch (e.sig) {
    case SmHsmTstSig.H_SIG:
      SmHsmTst_trace(me, "s11-H.");
      return SM_RetState.Tran(SmHsmTst_s);
    case SmHsmTstSig.D_SIG:
      if (me.foo !== 0) {
        me.foo = 0;
        SmHsmTst_trace(me, "s11-D.");
        return SM_RetState.Tran(SmHsmTst_s1);
      }

      return SM_RetState.Super;
    case SmHsmTstSig.G_SIG:
      SmHsmTst_trace(me, "s11-G.");
      return SM_RetState.Tran(SmHsmTst_s211);
    default:
      return SM_RetState.Super;
  }
}

function SmHsmTst_s2_init_(me: SmHsmTst): SM_StatePtr<SmHsmTst, SmHsmTstEvt> {
  SmHsmTst_trace(me, "s2-INIT.");
  return SmHsmTst_s211;
}

function SmHsmTst_s2_entry_(me: SmHsmTst): void {
  SmHsmTst_trace(me, "s2-ENTRY.");
}

function SmHsmTst_s2_exit_(me: SmHsmTst): void {
  SmHsmTst_trace(me, "s2-EXIT.");
}

function SmHsmTst_s2_(
  me: SmHsmTst,
  e: SmHsmTstEvt,
): SM_RetStateType<SmHsmTst, SmHsmTstEvt> {
  switch (e.sig) {
    case SmHsmTstSig.I_SIG:
      if (me.foo === 0) {
        me.foo = 1;
        SmHsmTst_trace(me, "s2-I.");
        return SM_RetState.Handled;
      }

      return SM_RetState.Super;
    case SmHsmTstSig.C_SIG:
      SmHsmTst_trace(me, "s2-C.");
      return SM_RetState.Tran(SmHsmTst_s1);
    case SmHsmTstSig.F_SIG:
      SmHsmTst_trace(me, "s2-F.");
      return SM_RetState.Tran(SmHsmTst_s11);
    default:
      return SM_RetState.Super;
  }
}

function SmHsmTst_s21_init_(me: SmHsmTst): SM_StatePtr<SmHsmTst, SmHsmTstEvt> {
  SmHsmTst_trace(me, "s21-INIT.");
  return SmHsmTst_s211;
}

function SmHsmTst_s21_entry_(me: SmHsmTst): void {
  SmHsmTst_trace(me, "s21-ENTRY.");
}

function SmHsmTst_s21_exit_(me: SmHsmTst): void {
  SmHsmTst_trace(me, "s21-EXIT.");
}

function SmHsmTst_s21_(
  me: SmHsmTst,
  e: SmHsmTstEvt,
): SM_RetStateType<SmHsmTst, SmHsmTstEvt> {
  switch (e.sig) {
    case SmHsmTstSig.G_SIG:
      SmHsmTst_trace(me, "s21-G.");
      return SM_RetState.Tran(SmHsmTst_s1);
    case SmHsmTstSig.A_SIG:
      SmHsmTst_trace(me, "s21-A.");
      return SM_RetState.Tran(SmHsmTst_s21);
    case SmHsmTstSig.B_SIG:
      SmHsmTst_trace(me, "s21-B.");
      return SM_RetState.Tran(SmHsmTst_s211);
    default:
      return SM_RetState.Super;
  }
}

function SmHsmTst_s211_entry_(me: SmHsmTst): void {
  SmHsmTst_trace(me, "s211-ENTRY.");
}

function SmHsmTst_s211_exit_(me: SmHsmTst): void {
  SmHsmTst_trace(me, "s211-EXIT.");
}

function SmHsmTst_s211_(
  me: SmHsmTst,
  e: SmHsmTstEvt,
): SM_RetStateType<SmHsmTst, SmHsmTstEvt> {
  switch (e.sig) {
    case SmHsmTstSig.H_SIG:
      SmHsmTst_trace(me, "s211-H.");
      return SM_RetState.Tran(SmHsmTst_s);
    case SmHsmTstSig.D_SIG:
      SmHsmTst_trace(me, "s211-D.");
      return SM_RetState.Tran(SmHsmTst_s21);
    default:
      return SM_RetState.Super;
  }
}

const SmHsmTst_s: SM_HsmState<SmHsmTst, SmHsmTstEvt> = {
  name: "S",
  super_: null,
  init_: SmHsmTst_s_init_,
  entry_: SmHsmTst_s_entry_,
  exit_: SmHsmTst_s_exit_,
  handler_: SmHsmTst_s_,
};

const SmHsmTst_s1: SM_HsmState<SmHsmTst, SmHsmTstEvt> = {
  name: "S1",
  super_: SmHsmTst_s,
  init_: SmHsmTst_s1_init_,
  entry_: SmHsmTst_s1_entry_,
  exit_: SmHsmTst_s1_exit_,
  handler_: SmHsmTst_s1_,
};

const SmHsmTst_s11: SM_HsmState<SmHsmTst, SmHsmTstEvt> = {
  name: "S11",
  super_: SmHsmTst_s1,
  init_: null,
  entry_: SmHsmTst_s11_entry_,
  exit_: SmHsmTst_s11_exit_,
  handler_: SmHsmTst_s11_,
};

const SmHsmTst_s2: SM_HsmState<SmHsmTst, SmHsmTstEvt> = {
  name: "S2",
  super_: SmHsmTst_s,
  init_: SmHsmTst_s2_init_,
  entry_: SmHsmTst_s2_entry_,
  exit_: SmHsmTst_s2_exit_,
  handler_: SmHsmTst_s2_,
};

const SmHsmTst_s21: SM_HsmState<SmHsmTst, SmHsmTstEvt> = {
  name: "S21",
  super_: SmHsmTst_s2,
  init_: SmHsmTst_s21_init_,
  entry_: SmHsmTst_s21_entry_,
  exit_: SmHsmTst_s21_exit_,
  handler_: SmHsmTst_s21_,
};

const SmHsmTst_s211: SM_HsmState<SmHsmTst, SmHsmTstEvt> = {
  name: "S211",
  super_: SmHsmTst_s21,
  init_: null,
  entry_: SmHsmTst_s211_entry_,
  exit_: SmHsmTst_s211_exit_,
  handler_: SmHsmTst_s211_,
};

function SmHsmTst_state_name(state: SM_StatePtr<SmHsmTst, SmHsmTstEvt>): string {
  switch (state) {
    case SmHsmTst_s:
      return "S";
    case SmHsmTst_s1:
      return "S1";
    case SmHsmTst_s11:
      return "S11";
    case SmHsmTst_s2:
      return "S2";
    case SmHsmTst_s21:
      return "S21";
    case SmHsmTst_s211:
      return "S211";
    default:
      throw new Error("unknown hsmtst state");
  }
}

export interface SmHsmTstRun {
  readonly trace: string;
  readonly curr_name: string;
}

export function SmHsmTst_run_sequence(
  signals: readonly SmHsmTstSig[],
): SmHsmTstRun {
  const machine = new SmHsmTst();
  for (const sig of signals) {
    machine.dispatch_with_separator(sig);
  }

  return machine.finish();
}

export function SmHsmTst_select_sequence(arg: string | undefined): readonly SmHsmTstSig[] {
  switch (arg ?? "b") {
    case "startup":
      return [];
    case "a":
    case "A":
      return SMHSMTST_SEQUENCE_A;
    case "b":
    case "B":
      return SMHSMTST_SEQUENCE_B;
    default:
      throw new Error(`unknown sequence: ${arg}. use: startup | a | b`);
  }
}

function runDemo(): void {
  const run = SmHsmTst_run_sequence(SmHsmTst_select_sequence(process.argv[2]));
  console.log(run.trace);
  console.log(`final active state: ${run.curr_name}`);
}

if (require.main === module) {
  runDemo();
}
