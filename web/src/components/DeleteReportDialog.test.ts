/**
 * When Delete report says it ends the reader's sharing (ADR-235, ADR-182). Web tests render no components (MB-47), so
 * the dialog's choice is called as the dialog calls it, with GET /home and GET /shares as the page last read them. The
 * people are the fixtures' names and birth dates with no triad: the choice reads none, and no placement is typed in.
 */
import { describe, expect, it } from "vitest";
import type { Home, HomePerson, Share, TimelineAccess } from "@workspace/api-client-react";
import {
  CANCEL_LINK_TEXT,
  ENDS_SHARING_LINE,
  PLAN_ENDS_LINE,
  PLAN_RENEWS_LINE,
  TIMELINE_STOPS_LINE,
  deleteLine,
  endsSharing,
  timelineNote,
} from "./DeleteReportDialog";

const person = (profileId: string, name: string, birthDate: string, over: Partial<HomePerson> = {}): HomePerson => ({
  profileId,
  reportId: `r-${profileId}`,
  name,
  birthDate,
  status: "complete",
  access: "owner",
  isSelf: false,
  triad: null,
  lines: null,
  ...over,
});

const BEATRICE = person("p-beatrice", "Beatrice York", "1988-08-08", { isSelf: true });
const WILLIAM = person("p-william", "William Windsor", "1982-06-21");
const CHARLES = person("p-charles", "Charles Windsor", "1948-11-14", { access: "shared" });
const HOME: Pick<Home, "you" | "people"> = { you: BEATRICE, people: [WILLIAM, CHARLES] };

const share = (state: Share["state"]): Share => ({
  id: `s-${state}`,
  email: state === "waiting" ? "william.windsor@example.com" : "",
  readerName: state === "waiting" ? null : "William",
  state,
  sentAt: "2026-10-03T12:00:00.000Z",
});

describe("Delete report on the reader's own Personal report", () => {
  it("says the sharing ends while a share waits or reads, and when the quick look has not listed the shares yet", () => {
    expect(endsSharing(HOME, [share("active")], BEATRICE.reportId)).toBe(true);
    expect(endsSharing(HOME, [share("waiting")], BEATRICE.reportId)).toBe(true);
    expect(endsSharing(HOME, undefined, BEATRICE.reportId)).toBe(true);
    expect(endsSharing(HOME, null, BEATRICE.reportId)).toBe(true);
  });

  it("says nothing of sharing once the list is known to be empty", () => {
    expect(endsSharing(HOME, [], BEATRICE.reportId)).toBe(false);
  });

  it("finds the reader's own chart among the people too, where several are marked as theirs and `you` is empty", () => {
    const several = { you: null, people: [BEATRICE, WILLIAM] };
    expect(endsSharing(several, undefined, BEATRICE.reportId)).toBe(true);
    expect(endsSharing(several, undefined, WILLIAM.reportId)).toBe(false);
  });
});

describe("Delete report on anything else", () => {
  it("never speaks of sharing: someone else's report, a sharer's seat, a pair, or a page with GET /home unread", () => {
    for (const shares of [undefined, [share("active")]]) {
      expect(endsSharing(HOME, shares, WILLIAM.reportId)).toBe(false);
      expect(endsSharing(HOME, shares, CHARLES.reportId)).toBe(false);
      expect(endsSharing(HOME, shares, "r-pair")).toBe(false);
      expect(endsSharing(undefined, shares, BEATRICE.reportId)).toBe(false);
    }
  });
});

describe("the dialog's words", () => {
  it("name the end of sharing between what goes and what stays, and only where it ends", () => {
    expect(deleteLine(false)).toBe(
      "This deletes the report and its birth data if nothing else uses it. Any purchase record is kept. This cannot be undone.",
    );
    expect(deleteLine(true)).toBe(
      `This deletes the report and its birth data if nothing else uses it. ${ENDS_SHARING_LINE} Any purchase record is kept. This cannot be undone.`,
    );
  });

  it("keep the house rules: plain sentences under 25 words, no dash, semicolon or exclamation", () => {
    for (const sentence of deleteLine(true).split(/(?<=\.) /)) {
      expect(sentence.split(" ").length, sentence).toBeLessThanOrEqual(25);
      expect(sentence, sentence).not.toMatch(/[—–;!]/);
    }
  });
});

const PLAN: NonNullable<TimelineAccess["plan"]> = { item: "timeline_month", status: "active", renewsOn: "2026-11-06", endsOn: null };
const SUBSCRIBER = { access: true, source: "subscription", plan: PLAN } as const;

describe("Delete report for a reader with a live Timeline plan", () => {
  it("says Timeline stops opening and the plan keeps renewing, with Cancel's link, on their own report", () => {
    expect(timelineNote(HOME, SUBSCRIBER, BEATRICE.reportId)).toEqual({
      text: `${TIMELINE_STOPS_LINE} ${PLAN_RENEWS_LINE}`,
      cancel: true,
    });
    expect(CANCEL_LINK_TEXT).toBe("Cancel on the Account page");
  });

  it("says the plan still ends on its set day, with no Cancel link, once a cancel is set", () => {
    const ending = { ...SUBSCRIBER, plan: { ...PLAN, renewsOn: null, endsOn: "2026-11-06" } };
    expect(timelineNote(HOME, ending, BEATRICE.reportId)).toEqual({
      text: `${TIMELINE_STOPS_LINE} ${PLAN_ENDS_LINE}`,
      cancel: false,
    });
  });

  it("says nothing of Timeline without a plan, for the admin's access, or on anyone else's report", () => {
    expect(timelineNote(HOME, { access: false, source: null }, BEATRICE.reportId)).toBeNull();
    expect(timelineNote(HOME, { access: true, source: "admin" }, BEATRICE.reportId)).toBeNull();
    expect(timelineNote(HOME, SUBSCRIBER, WILLIAM.reportId)).toBeNull();
    expect(timelineNote(HOME, SUBSCRIBER, "r-pair")).toBeNull();
    expect(timelineNote(undefined, SUBSCRIBER, BEATRICE.reportId)).toBeNull();
  });

  it("keeps the house rules: plain sentences under 25 words, no dash, semicolon or exclamation", () => {
    for (const sentence of [TIMELINE_STOPS_LINE, PLAN_RENEWS_LINE, PLAN_ENDS_LINE]) {
      expect(sentence.split(" ").length, sentence).toBeLessThanOrEqual(25);
      expect(sentence, sentence).not.toMatch(/[—–;!]/);
    }
  });
});
