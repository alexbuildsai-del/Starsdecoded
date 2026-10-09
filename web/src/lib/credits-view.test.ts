import { describe, expect, it } from "vitest";
import type { PriceItem } from "@workspace/api-client-react";
import { BUNDLES, bundleById, type BundleId } from "@workspace/commerce";
import { RETURN_TO } from "./checkout-view";
import type { DateOrder } from "./date-entry";
import {
  REOPENS, bundleRow, bundleRows, creditCount, creditDots, historyLine, openFrom, returnPath, signInFirst, withoutOpen,
} from "./credits-view";
import * as view from "./credits-view";

/** The server's price for a bundle, as `GET /checkout/options` lists it. */
function priced(id: BundleId, cents: number, campaign: PriceItem["campaign"] = null): PriceItem {
  const bundle = bundleById(id);
  return { id, kind: "bundle", name: bundle.name, line: bundle.line, credits: bundle.credits, interval: null, cents, fullCents: bundle.cents, campaign };
}

const AUTUMN = { name: "Autumn", endsOn: "2026-10-12" };

describe("zero means zero (ADR-275, 276)", () => {
  it("leaves no soft pass and no free test checkout for a surface to read", () => {
    expect(Object.keys(view)).not.toContain("creditsEnforced");
    expect(Object.keys(view)).not.toContain("TEST_CHECKOUT");
  });
});

describe("creditDots", () => {
  it("lights one dot per credit up to ten, then counts the rest", () => {
    expect(creditDots(0)).toEqual({ lit: 0, more: 0 });
    expect(creditDots(1)).toEqual({ lit: 1, more: 0 });
    expect(creditDots(3)).toEqual({ lit: 3, more: 0 });
    expect(creditDots(10)).toEqual({ lit: 10, more: 0 });
    expect(creditDots(11)).toEqual({ lit: 10, more: 1 });
    expect(creditDots(14)).toEqual({ lit: 10, more: 4 });
  });

  it("never draws a dot for a credit that is not there", () => {
    expect(creditDots(-2)).toEqual({ lit: 0, more: 0 });
    expect(creditDots(Number.NaN)).toEqual({ lit: 0, more: 0 });
    expect(creditDots(2.9)).toEqual({ lit: 2, more: 0 });
  });
});

describe("creditCount", () => {
  it("says credit for one and credits otherwise", () => {
    expect(creditCount(0)).toBe("0 credits");
    expect(creditCount(1)).toBe("1 credit");
    expect(creditCount(6)).toBe("6 credits");
  });
});

describe("bundleRows", () => {
  it("prints the catalogue's three bundles: names, prices, the launch price against the Singles total, the mixes", () => {
    expect(bundleRows()).toEqual([
      {
        id: "solo",
        name: "Single",
        line: "1 credit · a Personal report or a Compatibility report",
        credits: 1,
        lead: null,
        either: true,
        mixes: [
          { text: "1 Personal report", kind: "personal" },
          { text: "1 Compatibility report", kind: "compatibility" },
        ],
        price: "€24",
        launch: false,
        singles: null,
        save: null,
        campaign: null,
      },
      {
        id: "couple",
        name: "Couple",
        line: "3 credits · a report each and how you get along",
        credits: 3,
        lead: "For example:",
        either: false,
        mixes: [
          { text: "2 Personal reports", kind: "personal" },
          { text: "1 Compatibility report", kind: "compatibility" },
        ],
        price: "€54",
        launch: true,
        singles: "3 Singles €72",
        save: "you save €18",
        campaign: null,
      },
      {
        id: "family",
        name: "Family & friends",
        line: "5 credits · for the people close to you",
        credits: 5,
        lead: "For example:",
        either: false,
        mixes: [
          { text: "3 Personal reports", kind: "personal" },
          { text: "2 Compatibility reports", kind: "compatibility" },
        ],
        price: "€72",
        launch: true,
        singles: "5 Singles €120",
        save: "you save €48",
        campaign: null,
      },
    ]);
  });

  it("carries each bundle's line word for word, the description the home page's JSON-LD gives its Offer (MB-140)", () => {
    expect(bundleRows().map((row) => row.line)).toEqual(BUNDLES.map((bundle) => bundle.line));
    expect(bundleRow({ ...bundleById("couple"), line: "a moved line" }).line).toBe("a moved line");
  });

  it("follows the catalogue, so a moved price moves every list", () => {
    const couple = bundleById("couple");
    expect(bundleRow({ ...couple, cents: couple.cents + 100 })).toMatchObject({
      price: "€55",
      singles: "3 Singles €72",
      save: "you save €17",
    });
  });

  it("shows no comparison where a launch price would save nothing, and never one on Single (ADR-146, 169)", () => {
    const couple = bundleById("couple");
    expect(bundleRow({ ...couple, cents: couple.fullCents })).toMatchObject({ launch: false, singles: null, save: null });
    expect(bundleRow({ ...bundleById("solo"), launch: true })).toMatchObject({ launch: false, singles: null, save: null });
  });

  it("prints no end date and no earlier price (ADR-169)", () => {
    for (const row of bundleRows()) {
      const words = [row.name, row.line, row.lead, row.price, row.singles, row.save, ...row.mixes.map((mix) => mix.text)].join(" ");
      expect(words).not.toMatch(/\bwas\b|\buntil\b|\bends?\b|\boffer\b|\d{4}/i);
    }
  });
});

describe("each bundle says its credit count once (B-08)", () => {
  it("counts the credits in the catalogue's line only, and leads the example mixes without a number", () => {
    const campaigned = bundleRows([priced("couple", 4500, AUTUMN), priced("family", 6000, AUTUMN)]);
    for (const row of [...bundleRows(), ...campaigned]) {
      const words = [
        row.name, row.line, row.lead, ...row.mixes.map((mix) => mix.text), row.price, row.singles, row.save,
        row.campaign?.full, row.campaign?.until,
      ].filter(Boolean).join(" | ");
      expect(words.match(/\b\d+ credits?\b/g)).toEqual([creditCount(row.credits)]);
    }
    expect(bundleRows().map((row) => row.lead)).toEqual([null, "For example:", "For example:"]);
  });
});

// MB-149 provisional: reading 6's campaign beside the launch price.
describe("a live campaign on its row (reading 6)", () => {
  it("takes the row's price, strikes the full price, says its last day once, and moves the Singles comparison aside", () => {
    const rows = bundleRows([priced("solo", 2400), priced("couple", 4500, AUTUMN), priced("family", 7200)]);
    expect(rows[1]).toMatchObject({
      id: "couple", price: "€45", launch: false, singles: null, save: null, campaign: { full: "€54", until: "until 12\u00a0October" },
    });
    expect(rows[0]).toEqual(bundleRow(bundleById("solo")));
    expect(rows[2]).toEqual(bundleRow(bundleById("family")));
    const words = [rows[1].line, rows[1].lead, rows[1].price, rows[1].campaign?.full, rows[1].campaign?.until].join(" ");
    expect(words.match(/until/g)).toHaveLength(1);
    expect(words).not.toMatch(/\bwas\b|\bends?\b|days? left|\d{4}/i);
  });

  it("prints the last day as the calendar day itself, in the reader's order as checkout does (ADR-222)", () => {
    const until = (endsOn: string, order: DateOrder = "dmy") =>
      bundleRows([priced("couple", 4500, { name: "Autumn", endsOn })], order)[1].campaign?.until;
    expect(until("2026-12-31")).toBe("until 31\u00a0December");
    expect(until("2027-01-01")).toBe("until 1\u00a0January");
    expect(until("2028-02-29")).toBe("until 29\u00a0February");
    expect(until("2026-10-12", "mdy")).toBe("until October\u00a012");
    expect(until("2026-10-12", "ymd")).toBe("until October\u00a012");
  });

  it("keeps the catalogue's row while the prices load, after a refusal, and for anything but a real day and a lower price", () => {
    expect(bundleRows(null)).toEqual(bundleRows());
    expect(bundleRows([])).toEqual(bundleRows());
    const couple = bundleRow(bundleById("couple"));
    for (const item of [
      priced("couple", 4500),
      priced("couple", 5400, AUTUMN),
      priced("couple", 5600, AUTUMN),
      priced("couple", 4500.5, AUTUMN),
      priced("couple", -100, AUTUMN),
      priced("couple", 4500, { name: "Autumn", endsOn: "2026-02-30" }),
      priced("couple", 4500, { name: "Autumn", endsOn: "12/10/2026" }),
      { ...priced("couple", 4500, AUTUMN), id: "timeline_year" as const },
    ]) {
      expect(bundleRows([item])[1]).toEqual(couple);
    }
  });
});

describe("the way to checkout and back (reading 2)", () => {
  it("sends each asking step's checkout back to an address the server lets it return to (checkout's copy of its rule)", () => {
    const steps = [...REOPENS, "chart"] as const;
    expect(steps.map(returnPath)).toEqual([
      "/dashboard?open=credits", "/dashboard?open=gift", "/dashboard?open=add", "/dashboard?open=pair", "/chart",
    ]);
    for (const step of steps) expect(returnPath(step)).toMatch(RETURN_TO);
  });

  it("reopens the step a checkout came back to, with or without the query's ?, and nothing else", () => {
    for (const step of REOPENS) {
      expect(openFrom(`?open=${step}`)).toBe(step);
      expect(openFrom(`open=${step}`)).toBe(step);
    }
    for (const search of ["", "?open=", "?open=checkout", "?open=Credits", "c=waitlist"]) expect(openFrom(search)).toBeNull();
  });

  it("drops the step from the address once it opens, and keeps the rest, so a reload or Back never opens it twice", () => {
    expect(withoutOpen("open=credits")).toBe("/dashboard");
    expect(withoutOpen("?open=gift&c=waitlist")).toBe("/dashboard?c=waitlist");
    expect(withoutOpen("")).toBe("/dashboard");
    for (const step of REOPENS) expect(openFrom(withoutOpen(`open=${step}&c=waitlist`).split("?")[1] ?? "")).toBeNull();
  });

  it("signs a reader without an account in on the way and lands them on the same checkout (reading 1)", () => {
    const checkout = "/checkout?item=couple&returnTo=%2Fdashboard%3Fopen%3Dcredits";
    expect(signInFirst(checkout, false)).toBe(checkout);
    const via = signInFirst(checkout, true);
    expect(via.split("?")[0]).toBe("/sign-in");
    expect(new URLSearchParams(via.slice(via.indexOf("?"))).get("return_to")).toBe(checkout);
  });
});

describe("credit-loop's names", () => {
  it("are gone from what the credit surfaces print (pricing-and-launch, ADR-170)", () => {
    expect(Object.keys(view)).not.toContain("BUNDLES");
    const printed = bundleRows().map((row) => row.name).join(" | ");
    for (const old of ["One report", "Someone and the two of you", "Your people and how you fit", "Your people, then how you fit", "orbit"]) {
      expect(printed).not.toContain(old);
    }
  });
});

describe("historyLine", () => {
  it("lets the kind carry the sign: bought and a gift add, spent takes away", () => {
    expect(historyLine({ kind: "bought", count: 3, label: "3 credits bought", test: false }))
      .toEqual({ amount: "+3", text: "3 credits bought", test: false });
    expect(historyLine({ kind: "gift", count: 1, label: "A gift from Alex", test: false }))
      .toEqual({ amount: "+1", text: "A gift from Alex", test: false });
    expect(historyLine({ kind: "spent", count: 1, label: "Gift to Pierre", test: false }))
      .toEqual({ amount: "−1", text: "Gift to Pierre", test: false });
  });

  it("adds a grant and the yearly plan's credit, and takes a refund away (ADR-275, ADR-276)", () => {
    expect(historyLine({ kind: "granted", count: 3, label: "From Stars Decoded", test: true }))
      .toEqual({ amount: "+3", text: "From Stars Decoded", test: false });
    expect(historyLine({ kind: "granted", count: 1, label: "With Timeline", test: false }))
      .toEqual({ amount: "+1", text: "With Timeline", test: false });
    expect(historyLine({ kind: "refunded", count: 2, label: "Refunded", test: false }))
      .toEqual({ amount: "−2", text: "Refunded", test: false });
  });

  it("marks a test bundle's line once, even when the label already says so (ADR-138)", () => {
    expect(historyLine({ kind: "bought", count: 5, label: "5 credits bought", test: true }).test).toBe(true);
    expect(historyLine({ kind: "bought", count: 5, label: "5 test credits", test: true }).test).toBe(false);
  });

  it("leaves a spend or a gift paid from a test credit unmarked, as reading 9 reads", () => {
    expect(historyLine({ kind: "spent", count: 1, label: "Beatrice", test: true }).test).toBe(false);
    expect(historyLine({ kind: "gift", count: 1, label: "A gift from Alex", test: true }).test).toBe(false);
  });

  it("still reads when the ledger sends no label", () => {
    expect(historyLine({ kind: "bought", count: 3, label: " ", test: true }).text).toBe("3 credits added");
    expect(historyLine({ kind: "spent", count: 1, label: "", test: false }).text).toBe("A report");
    expect(historyLine({ kind: "granted", count: 3, label: "", test: true }).text).toBe("From Stars Decoded");
    expect(historyLine({ kind: "refunded", count: 1, label: " ", test: false }).text).toBe("Refunded");
  });
});
