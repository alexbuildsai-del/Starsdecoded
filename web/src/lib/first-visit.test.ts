import { describe, expect, it } from "vitest";
import type { Home, HomePerson } from "@workspace/api-client-react";
import { bundleById } from "@workspace/commerce";
import {
  EMPTY_HOME,
  FIRST_VISIT,
  FIRST_VISIT_LINES,
  firstVisitNote,
  isFirstVisit,
  ownFinished,
  visitorAsked,
  visitorStep,
  withoutVisitor,
} from "./first-visit";
import { checkoutHref } from "./checkout-view";
import { returnPath } from "./credits-view";

// The first visit (R19-35, ADR-389): a brand-new account sees the circle and three bundle buttons only, and a bundle
// comes back to the birth form set to the reader's own chart.
const person = (over: Partial<HomePerson>): HomePerson => ({ profileId: "p1", isSelf: false, status: "complete", ...over }) as HomePerson;
const home = (over: Partial<Home>): Home => ({ ...EMPTY_HOME, ...over });

describe("who sees the first visit", () => {
  it("a new account with no report of its own, and nobody who might be its own, sees it", () => {
    expect(isFirstVisit(EMPTY_HOME)).toBe(true);
    expect(isFirstVisit(home({ people: [person({})] }))).toBe(true);
  });

  it("a reader with a report of their own, in any state, does not; several marked as theirs ask which first", () => {
    expect(isFirstVisit(home({ you: person({ isSelf: true, status: "interpreting" }) }))).toBe(false);
    expect(isFirstVisit(home({ you: person({ isSelf: true, status: "failed" }) }))).toBe(false);
    expect(isFirstVisit(home({ several: true }))).toBe(false);
  });

  it("Your first steps, Practising and Ask wait for a finished report of the reader's own, not for one being written or a shared one", () => {
    expect(ownFinished(EMPTY_HOME)).toBe(false);
    expect(ownFinished(home({ you: person({ isSelf: true, status: "interpreting" }) }))).toBe(false);
    expect(ownFinished(home({ people: [person({ status: "complete" })] }))).toBe(false);
    expect(ownFinished(home({ you: person({ isSelf: true, status: "complete" }) }))).toBe(true);
    expect(ownFinished(home({ you: person({ isSelf: true, status: "revising" }) }))).toBe(true);
    expect(ownFinished(home({ people: [person({ isSelf: true, status: "complete" })] }))).toBe(true);
  });

  it("the admin's preview is drawn from the home a session that has made nothing is sent, so it asks for nothing of the admin's", () => {
    expect(EMPTY_HOME).toEqual({
      you: null, several: false, people: [], pairs: [], practising: [],
      firstSteps: { step: 1, person: null, gift: false, pairReady: false },
    });
    expect(isFirstVisit(EMPTY_HOME)).toBe(true);
  });
});

describe("what the first visit says", () => {
  it("has one button line for each bundle, with the family count from the catalogue", () => {
    expect(Object.keys(FIRST_VISIT_LINES).sort()).toEqual(["couple", "family", "solo"]);
    expect(FIRST_VISIT_LINES.family).toBe(`${bundleById("family").credits} reports for the people close to you`);
  });

  it("says credits are free only off production", () => {
    expect(firstVisitNote("production")).toBe(FIRST_VISIT.pay);
    for (const env of ["staging", "development"] as const) expect(firstVisitNote(env)).toBe(`${FIRST_VISIT.pay} ${FIRST_VISIT.free}`);
    expect(FIRST_VISIT.heading).toBe("Start with your own report");
  });

  it("sends each bundle through checkout and back to the birth form, where the toggle starts as the reader's own chart", () => {
    expect(returnPath("chart")).toBe("/chart");
    for (const id of ["solo", "couple", "family"] as const) {
      expect(checkoutHref(id, returnPath("chart"))).toBe(`/checkout?item=${id}&returnTo=%2Fchart`);
    }
  });
});

describe("the admin's new-visitor view", () => {
  it("opens on ?visitor=new and nothing else", () => {
    expect(visitorAsked("?visitor=new")).toBe(true);
    expect(visitorAsked("visitor=new&x=1")).toBe(true);
    for (const search of ["", "?visitor=", "?visitor=old", "?visitor=New", "?c=waitlist"]) expect(visitorAsked(search)).toBe(false);
  });

  it("leaves to the reader's own dashboard, keeping the rest of the query", () => {
    expect(withoutVisitor("?visitor=new")).toBe("/dashboard");
    expect(withoutVisitor("?visitor=new&c=waitlist")).toBe("/dashboard?c=waitlist");
  });

  it("says what each tap would do instead of doing it: the bundles and the centre sign in first, then check out", () => {
    expect(visitorStep("solo")).toBe(`${bundleById("solo").name} would open sign-in, then checkout, then the birth form.`);
    expect(visitorStep("family")).toBe(`${bundleById("family").name} would open sign-in, then checkout, then the birth form.`);
    expect(visitorStep("centre")).toBe("Your report would open sign-in, then checkout, then the birth form.");
    expect(visitorStep("sign-in")).toBe("Sign in would open the sign-in page.");
    expect(visitorStep("credits")).toBe("Credits would show your balance and the bundles.");
  });
});
