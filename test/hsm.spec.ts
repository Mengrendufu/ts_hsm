import { describe, expect, it } from "vitest";

import {
  SMHSMTST_SEQUENCE_A,
  SMHSMTST_SEQUENCE_B,
  SmHsmTst,
  SmHsmTst_run_sequence,
  SmHsmTstSig,
} from "../examples/hsmtst";
import {
  SM_Hsm,
  SM_RetState,
  type SM_HsmState,
  type SM_RetState as SM_RetStateType,
  type SM_StatePtr,
} from "../src";

describe("rs_hsm_ style hsmtst fixture", () => {
  it("matches startup reference output", () => {
    const run = SmHsmTst_run_sequence([]);

    expect(run.trace).toBe("top-INIT.s-ENTRY.s2-ENTRY.s2-INIT.s21-ENTRY.s211-ENTRY.");
    expect(run.curr_name).toBe("S211");
  });

  it("matches sequence B reference output", () => {
    const run = SmHsmTst_run_sequence(SMHSMTST_SEQUENCE_B);

    expect(run.trace).toBe(
      [
        "top-INIT.s-ENTRY.s2-ENTRY.s2-INIT.s21-ENTRY.s211-ENTRY.",
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
      ].join("\n"),
    );
    expect(run.curr_name).toBe("S211");
  });

  it("matches sequence A reference output", () => {
    const run = SmHsmTst_run_sequence(SMHSMTST_SEQUENCE_A);

    expect(run.trace).toBe(
      [
        "top-INIT.s-ENTRY.s2-ENTRY.s2-INIT.s21-ENTRY.s211-ENTRY.",
        "s21-A.s211-EXIT.s21-EXIT.s21-ENTRY.s21-INIT.s211-ENTRY.",
        "s21-B.s211-EXIT.s211-ENTRY.",
        "s211-D.s211-EXIT.s21-INIT.s211-ENTRY.",
        "s-E.s211-EXIT.s21-EXIT.s2-EXIT.s1-ENTRY.s11-ENTRY.",
        "s1-I.",
        "s1-F.s11-EXIT.s1-EXIT.s2-ENTRY.s21-ENTRY.s211-ENTRY.",
        "s2-I.",
        "s-I.",
        "s2-F.s211-EXIT.s21-EXIT.s2-EXIT.s1-ENTRY.s11-ENTRY.",
        "s1-A.s11-EXIT.s1-EXIT.s1-ENTRY.s1-INIT.s11-ENTRY.",
        "s1-B.s11-EXIT.s11-ENTRY.",
        "s1-D.s11-EXIT.s1-EXIT.s-INIT.s1-ENTRY.s11-ENTRY.",
        "s11-D.s11-EXIT.s1-INIT.s11-ENTRY.",
        "s-E.s11-EXIT.s1-EXIT.s1-ENTRY.s11-ENTRY.",
        "s11-G.s11-EXIT.s1-EXIT.s2-ENTRY.s21-ENTRY.s211-ENTRY.",
        "s211-H.s211-EXIT.s21-EXIT.s2-EXIT.s-INIT.s1-ENTRY.s11-ENTRY.",
        "s11-H.s11-EXIT.s1-EXIT.s-INIT.s1-ENTRY.s11-ENTRY.",
        "s1-C.s11-EXIT.s1-EXIT.s2-ENTRY.s2-INIT.s21-ENTRY.s211-ENTRY.",
        "s21-G.s211-EXIT.s21-EXIT.s2-EXIT.s1-ENTRY.s1-INIT.s11-ENTRY.",
        "s1-C.s11-EXIT.s1-EXIT.s2-ENTRY.s2-INIT.s21-ENTRY.s211-ENTRY.",
        "s2-C.s211-EXIT.s21-EXIT.s2-EXIT.s1-ENTRY.s1-INIT.s11-ENTRY.",
      ].join("\n"),
    );
    expect(run.curr_name).toBe("S11");
  });

  it("ignores unhandled events without changing current state", () => {
    const machine = new SmHsmTst();
    const traceBefore = machine.trace();

    machine.dispatch(SmHsmTstSig.Z_SIG);

    expect(machine.trace()).toBe(traceBefore);
    expect(machine.curr_name()).toBe("S211");
  });
});

describe("descriptor runtime contracts", () => {
  it("rejects init targets outside the current state's descendants", () => {
    type BadEvent = undefined;
    interface BadObject {}

    function badTopInitial(_me: BadObject): SM_StatePtr<BadObject, BadEvent> {
      return BAD_PARENT;
    }

    function badParentInit(_me: BadObject): SM_StatePtr<BadObject, BadEvent> {
      return BAD_SIBLING;
    }

    function badStateHandler(
      _me: BadObject,
      _e: BadEvent,
    ): SM_RetStateType<BadObject, BadEvent> {
      return SM_RetState.Handled;
    }

    const BAD_PARENT: SM_HsmState<BadObject, BadEvent> = {
      name: "badParent",
      super_: null,
      init_: badParentInit,
      handler_: badStateHandler,
    };

    const BAD_SIBLING: SM_HsmState<BadObject, BadEvent> = {
      name: "badSibling",
      super_: null,
      init_: null,
      handler_: badStateHandler,
    };

    const hsm = new SM_Hsm<BadObject, BadEvent>(badTopInitial);

    expect(() => hsm.init({})).toThrowError(
      "Init target 'badSibling' must be a descendant of current state 'badParent'.",
    );
  });

  it("rejects explicit transition sources outside the active path before exit actions", () => {
    type BadEvent = undefined;
    interface BadObject {
      exited: boolean;
    }

    function badTopInitial(_me: BadObject): SM_StatePtr<BadObject, BadEvent> {
      return BAD_CHILD;
    }

    function badChildExit(me: BadObject): void {
      me.exited = true;
    }

    function badStateHandler(
      _me: BadObject,
      _e: BadEvent,
    ): SM_RetStateType<BadObject, BadEvent> {
      return SM_RetState.Handled;
    }

    const BAD_PARENT: SM_HsmState<BadObject, BadEvent> = {
      name: "badParent",
      super_: null,
      init_: null,
      handler_: badStateHandler,
    };

    const BAD_CHILD: SM_HsmState<BadObject, BadEvent> = {
      name: "badChild",
      super_: BAD_PARENT,
      init_: null,
      exit_: badChildExit,
      handler_: badStateHandler,
    };

    const BAD_SIBLING: SM_HsmState<BadObject, BadEvent> = {
      name: "badSibling",
      super_: null,
      init_: null,
      handler_: badStateHandler,
    };

    const ctx: BadObject = { exited: false };
    const hsm = new SM_Hsm<BadObject, BadEvent>(badTopInitial);
    hsm.init(ctx);

    expect(() => hsm.transition(ctx, BAD_SIBLING, BAD_PARENT)).toThrowError(
      "Transition source 'badSibling' is not active for current state 'badChild'.",
    );
    expect(ctx.exited).toBe(false);
  });
});
