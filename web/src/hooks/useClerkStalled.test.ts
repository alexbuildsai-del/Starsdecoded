import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLERK_STALL_MS, stallDelay, whenClerkStalls } from "./useClerkStalled";

describe("the wait for Clerk (reading 12)", () => {
  it("is 8 s", () => {
    expect(CLERK_STALL_MS).toBe(8_000);
  });

  it("counts what the visit has already waited", () => {
    expect(stallDelay(0)).toBe(8_000);
    expect(stallDelay(2_500)).toBe(5_500);
  });

  it("is over at once for a page opened after it ran out", () => {
    expect(stallDelay(8_000)).toBe(0);
    expect(stallDelay(45_000)).toBe(0);
  });

  it("never runs longer than 8 s", () => {
    expect(stallDelay(-40)).toBe(8_000);
  });
});

describe("whenClerkStalls", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls the stall at 8 s and not before", () => {
    const onStall = vi.fn();
    whenClerkStalls(0, onStall);
    vi.advanceTimersByTime(7_999);
    expect(onStall).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onStall).toHaveBeenCalledTimes(1);
  });

  it("takes off the time a visit already spent waiting", () => {
    const onStall = vi.fn();
    whenClerkStalls(6_000, onStall);
    vi.advanceTimersByTime(1_999);
    expect(onStall).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onStall).toHaveBeenCalledTimes(1);
  });

  it("calls at once on a page reached after the wait ran out", () => {
    const onStall = vi.fn();
    whenClerkStalls(20_000, onStall);
    vi.advanceTimersByTime(0);
    expect(onStall).toHaveBeenCalledTimes(1);
  });

  it("never calls once called off, as when Clerk loads in time", () => {
    const onStall = vi.fn();
    const stop = whenClerkStalls(0, onStall);
    vi.advanceTimersByTime(3_000);
    stop();
    vi.advanceTimersByTime(60_000);
    expect(onStall).not.toHaveBeenCalled();
  });
});
