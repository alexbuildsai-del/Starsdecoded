/**
 * The Timeline reading's blocking checks at their edges (R16-21; annex rows 44 to 48; ADR-81, 206, 210). Each check has
 * the ordinary sentences it must let through beside the faults it must stop, the day and degree boundaries, and the
 * promise that a message never carries the reader's words (R-3.5). Every date and degree is the engine's, computed from
 * a committed fixture's birth data, never typed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { lifeCycles, natalLongitudes, readsAs, skyEvents, type ContactEvent, type SkyEvent } from "@workspace/engine";
import { calculateNatalChart } from "../../lib/chartCalculation.js";
import { chartFromFixture } from "../../lib/testFixtures.js";
import { buildBrief } from "../brief.js";
import { DATA_CLOSE, DATA_OPEN } from "../data.js";
import {
  BODY_BUFFER, LINE_BUFFER, LINE_WORDS, adviceChecks, blockingChecks, checkReading, dateChecks, eventFacts, lengthChecks, predictionChecks,
  type ReadingInput, type ReadingOutput,
} from "./index.js";

const curie = chartFromFixture("marie-curie");
const blindCurie = calculateNatalChart("1867-11-07", "12:00", 52.2297, 21.0122, 1.4, 720);
const FROM = new Date("2026-10-05T00:00:00Z");
const TO = new Date("2027-04-05T00:00:00Z");
const events = skyEvents(curie, FROM, TO).filter(readsAs);
const saturnSquare = events.find((e): e is ContactEvent => e.kind === "contact" && e.body === "saturn" && e.aspect === "square" && e.target === "ascendant")!;
const facts = eventFacts(saturnSquare, curie, false);

function input(extra: Partial<ReadingInput> = {}): ReadingInput {
  return { event: saturnSquare, brief: buildBrief(curie, "Marie Curie"), excerpts: [], name: "Marie Curie", blind: false, ...extra };
}

/** A reading that passes every check, with the engine's own dates in it (as the neighbouring test writes it). */
const CLEAN: ReadingOutput = {
  line: "You think harder about how you come across and what you agree to.",
  body: "Saturn squares your Ascendant three times, on 29 May 2026, 24 September 2026 and 19 February 2027. Astrology reads this as a time when how you come across feels heavier. Your report says “you arrive fast and decide faster”. Now a slower side of you asks for a say. You may notice you take longer before you agree to something. People may see you as more serious than usual. You may feel the gap between how sure you look and how sure you are. Each pass brings that gap back into view. It eases after 9 March 2027, when Saturn moves on.",
};

const rules = (checks: { rule: string; cls: string }[]) => checks.map((c) => `${c.rule}:${c.cls}`);
const blocked = (text: string, names: string[] = []) => rules(blockingChecks(text, facts, "body", names));
const wordsOf = (n: number) => Array.from({ length: n }, () => "calm").join(" ");

/** Every sentence of `list` must raise exactly `expected` (nothing when it is empty), and the misses are named together. */
function misses(list: readonly string[], expected: string[], names: string[] = []): string[] {
  return list.filter((s) => JSON.stringify(blocked(s, names)) !== JSON.stringify(expected));
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const day = (at: Date, plus: number) => new Date(Math.floor(at.getTime() / 86_400_000) * 86_400_000 + plus * 86_400_000);

/** One engine instant written the ways a writer writes a day. */
function writtenDays(at: Date): string[] {
  const [y, m, d] = [at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()];
  return [
    `${d} ${MONTHS[m]} ${y}`, `${MONTHS[m]} ${d}, ${y}`, `${MONTHS[m]} ${d} ${y}`, `${d}th of ${MONTHS[m]} ${y}`, `the ${d} of ${MONTHS[m]}, ${y}`,
    `${y}-${pad(m + 1)}-${pad(d)}`, `${pad(d)}/${pad(m + 1)}/${y}`, `${d}.${m + 1}.${y}`, `${d} ${ABBR[m]} ${y}`, `${ABBR[m]}. ${d}, ${y}`,
  ];
}

test("a day is allowed on the engine's pass and the day either side, in every way a writer writes it, and not a day further", () => {
  for (const pass of saturnSquare.window.exact) {
    for (const plus of [-1, 0, 1]) {
      for (const written of writtenDays(day(pass, plus))) assert.deepEqual(blocked(`It is exact on ${written}.`), [], `${written} (${plus >= 0 ? "+" : ""}${plus})`);
    }
    for (const plus of [-2, 2]) {
      // The ISO and spelled forms are unambiguous; a numeric day may read as month first.
      for (const written of writtenDays(day(pass, plus)).filter((w) => !/^\d{1,2}[./]/.test(w))) {
        assert.deepEqual(blocked(`It is exact on ${written}.`), ["chk-44:block"], `${written} (${plus >= 0 ? "+" : ""}${plus})`);
      }
    }
  }
});

test("the window's own edges are days the event computed, and the day before its start is not", () => {
  const { start, end } = saturnSquare.window;
  for (const edge of [start, end]) for (const written of writtenDays(edge).slice(0, 3)) assert.deepEqual(blocked(`It begins on ${written}.`), [], written);
  for (const written of writtenDays(day(start, -2)).slice(0, 3)) assert.deepEqual(blocked(`It begins on ${written}.`), ["chk-44:block"], written);
  for (const written of writtenDays(day(end, 2)).slice(0, 3)) assert.deepEqual(blocked(`It ends on ${written}.`), ["chk-44:block"], written);
});

test("chk-44 counts what it finds, one message per kind, and says the kind and never the date written", () => {
  const out = dateChecks("It began on 3 June 1999, then on 4 June 1999, and again in 2001.", facts, "body");
  assert.deepEqual(rules(out), ["chk-44:block", "chk-44:block"]);
  assert.deepEqual(out.map((c) => c.message), [
    "body: names 2 dates that THE EVENT does not list",
    "body: names a year that THE EVENT does not list",
  ]);
  const degrees = dateChecks("At 3° and 4° and 5°.", facts, "line");
  assert.deepEqual(degrees.map((c) => c.message), ["line: names 3 degrees that THE EVENT does not list"]);
  for (const c of [...out, ...degrees]) assert.doesNotMatch(c.message, /1999|2001|June|\d°/);
});

test("chk-44 stops a season, a holiday, a time counted from today and a clock time, whoever the event is", () => {
  assert.deepEqual(misses([
    "It peaks in the summer.", "This autumn feels heavy.", "By next winter it eases.", "Around Christmas you feel it.", "On your birthday it peaks.",
    "Easter is near.", "Tomorrow feels heavy.", "Next week you may feel it.", "This month feels heavy.", "Last year was hard.", "In two weeks it peaks.",
    "In 3 months it eases.", "Three days ago it began.", "It peaks at 14:30.", "It peaks at 3pm.", "It peaks around 5 o'clock.", "Tonight you feel it.",
  ], ["chk-44:block"]), []);
});

test("chk-44 lets counts, ages and ordinary numbers pass: only a date or a degree is one", () => {
  assert.deepEqual(misses([
    "It lasts about 10 months.", "It lasts 300 days.", "It stays for three passes.", "Saturn takes 29 years to circle.", "Every 29 years it returns.",
    "At 29 you felt it.", "At age 29 you felt it.", "You have 2 or 3 pulls.", "It happens 3 times.", "The first of three passes is exact.",
    "It's 100% clear.", "Early on, you feel it.", "Marching on, you feel it.", "May you find ease.", "A mark of March.", "You were 20 words short.",
    "Over 2 years you grow.", "In your twenties you worked hard.", "Some days feel heavy, others light.",
  ], []), []);
});

test("chk-44 reads a degree at the precision it is written: whole ones match cut or rounded, finer ones to their own digits", () => {
  const target = facts.degrees.find((d) => d % 1 !== 0 && d < 30)!;
  assert.ok(target, "the Ascendant's degree in the sign is among the facts");
  const whole = Math.floor(target);
  const fine = target.toFixed(2);
  assert.deepEqual(misses([`It sits at ${whole}° of the sign.`, `It sits at ${Math.round(target)}°.`, `It sits at ${fine}°.`, `It sits at ${whole} degrees.`, "It comes within 2° of the point.", "It comes within 2 degrees.", "It comes within two degrees."], []), []);
  assert.deepEqual(misses([`It sits at ${whole + 2}° of the sign.`, `It sits at ${(target + 0.3).toFixed(2)}°.`, `It sits at ${whole + 5} degrees.`, "It comes within 3° of the point.", "It comes within three degrees.", "It comes within half a degree."], ["chk-44:block"]), []);
});

test("chk-44 allows the degrees of the whole chart the facts print: the event's own, the target's and the absolute longitude", () => {
  assert.ok(facts.degrees.length >= 3);
  for (const degree of facts.degrees) assert.deepEqual(blocked(`It sits at ${degree.toFixed(2)}°.`), [], String(degree));
});

test("a date that is not the event's is caught beside one that is, in the same sentence", () => {
  const pass = writtenDays(saturnSquare.window.exact[0])[0];
  assert.deepEqual(blocked(`It is exact on ${pass} and again on 4 February 1991.`), ["chk-44:block"]);
  assert.deepEqual(blocked(`It is exact on ${pass} and again on ${writtenDays(saturnSquare.window.exact[1])[0]}.`), []);
});

test("chk-44 for a life cycle allows the cycle's own days and refuses another round's", () => {
  const cycles = lifeCycles(natalLongitudes(curie), new Date(curie.datetimeUtc));
  const ret = cycles.find((c) => c.id === "saturn-return")!;
  const own = eventFacts(ret, curie, false);
  const [first, other] = [writtenDays(ret.window.exact[0])[0], writtenDays(cycles.find((c) => c.id === "jupiter-return")!.window.exact[0])[0]];
  assert.deepEqual(rules(blockingChecks(`It is exact on ${first}.`, own, "body")), []);
  assert.deepEqual(rules(blockingChecks(`It is exact on ${other}.`, own, "body")), ["chk-44:block"]);
  assert.deepEqual(rules(blockingChecks(`It comes at about age ${ret.age}.`, own, "body")), []);
});

test("chk-45 lets a sky event in the future tense and an ordinary will pass, and a feeling that may come", () => {
  assert.deepEqual(misses([
    "You may notice that you take longer to say yes.", "You will notice a change in how you speak.", "You will feel more serious than usual.",
    "This time brings pressure to your sense of self.", "The pressure brings a heavier feeling.", "It may bring a new way of seeing yourself.",
    "Saturn will be at 12 degrees of Capricorn.", "Saturn will cross your Ascendant again.", "The heavy feeling will die down by itself.",
    "It will pass.", "It will ease after the last pass.", "You will find that you slow down.", "What will you notice?", "You will see.",
    "You will probably notice more.", "A job may feel heavier.", "Your work life feels more serious.", "You may feel a break from routine.",
    "A breakup of an old habit may come to mind.", "Your partner may feel distant.", "You may feel lucky or unlucky.",
    "People may see you as a parent.", "You may think of a trip you took.", "You have a deal with yourself.", "They will meet halfway.",
  ], []), []);
});

test("chk-45 stops a life event foretold, in the shapes a writer foretells it", () => {
  assert.deepEqual(misses([
    "You will get married.", "A new love will arrive.", "You will have a baby.", "Someone close to you will die.", "You are going to get a raise.",
    "You will be promoted.", "You will move house.", "You will move to a new city.", "You will get sick.", "You will fall ill.", "You will meet someone who matters.",
    "Your marriage will end.", "A job offer is coming.", "You are bound to meet someone.", "This will lead to a breakup.", "This could bring a pay rise.",
    "This might lead to a divorce.", "The year will be lucky.", "Your luck will turn.", "You will travel abroad.", "You will go on a trip.", "You will inherit a house.",
    "You will be fired.", "You will have a child.", "Things will get better.", "It will all be fine.", "You will succeed.", "This will bring a new job.",
    "Everything will work out.", "It's your destiny.", "It is written in the stars.", "Jupiter brings luck.", "A breakup is coming.",
  ], ["chk-45:block"]), []);
});

test("chk-45 reads each sentence alone, so a life event in one and a will in the next is no prediction", () => {
  assert.deepEqual(blocked("You think about a new job. The sky will move on."), []);
  assert.deepEqual(blocked("A new job is a lot to carry. It eases later."), []);
  assert.deepEqual(blocked("You will get a promotion. Then the sky moves on."), ["chk-45:block"]);
  assert.deepEqual(rules(predictionChecks("It will pass. A breakup will follow.", "body")), ["chk-45:block"]);
});

test("chk-45 names the kind of fault and never the reader's words", () => {
  const out = predictionChecks("Zorblax will bring a new job and a wedding.", "body");
  assert.equal(out.length, 1, "one message however many faults");
  assert.match(out[0].message, /^body: says what will happen in the reader's life \(/);
  assert.doesNotMatch(out[0].message, /Zorblax/i);
  assert.ok(predictionChecks("You will get married.", "line")[0].message.startsWith("line:"));
});

test("chk-46 lets a feeling, a need, a question, a naming of what the reader does, and the house voice pass", () => {
  assert.deepEqual(misses([
    "You feel you should take on more.", "You think you must keep going.", "You need to feel useful.", "Rest feels harder to find.", "Trust comes slowly now.",
    "It's important to you that people are fair.", "What do you carry that you could put down?", "Should you slow down?", "Why not rest?",
    "A good time to look at your plans again.", "This is a time to slow down.", "It is a good time to slow down.", "Slow to trust, you take your time with people.",
    "Open to change, you still like a plan.", "Taking your time is how you cope.", "Making plans helps you feel safe.", "Letting go is hard.",
    "Waiting is not easy for you.", "Time with friends feels heavy.", "You make sure the bills are paid.", "You pay attention to everything.",
    "Look, you have always worked hard.", "Stay or go, you weigh both.", "You might notice you want to rest.", "You could feel tired.", "You can feel a pull to withdraw.",
    "Given the weight, you pull back.", "Notice is a word you use a lot.", "Avoiding conflict is a habit of yours.", "Time to rest.", "Rest is what you need.",
    "Saturn asks a lot of you.", "This asks you to slow down.", "It asks you to be patient.",
  ], []), []);
});

test("chk-46 stops an order, advice and an obligation, in the shapes a writer gives them", () => {
  assert.deepEqual(misses([
    "You should slow down.", "You shouldn't rush.", "You ought to rest.", "You must rest.", "Take your time.", "Don't rush into anything.", "Do not rush.", "Be patient with yourself.",
    "Slow down and breathe.", "Wait for it to pass.", "Give yourself a break.", "Let it go.", "Trust your gut.", "Allow yourself to rest.", "Pause before you answer.",
    "Ask for help.", "Be gentle with yourself.", "It would be wise to wait.", "It's a good idea to wait.", "It's best to wait.", "I suggest you rest.", "Avoid making big decisions.",
    "Never sign anything now.", "Make sure you rest.", "Be sure to rest.", "You may want to rest.", "You might want to rest.", "Perhaps you should rest.",
    "Try resting.", "Listen to your body.", "Notice how you feel when someone asks for more.", "Stay calm.", "Rest if you can.", "Sign nothing yet.", "Consider slowing down.",
    "Remember that this passes.", "Hold off on big decisions.", "Look after yourself.", "Write it down.", "You have a lot on, so take it slowly.",
    "Do rest.", "Never rush.", "Watch out for burnout.",
  ], ["chk-46:block"]), []);
});

test("chk-46 reads a quoted order as an order and a question as none", () => {
  assert.deepEqual(blocked("“Take your time.”"), ["chk-46:block"]);
  assert.deepEqual(blocked("(Take your time.)"), ["chk-46:block"]);
  assert.deepEqual(blocked("Should you take your time?"), []);
  assert.deepEqual(blocked("Do you take your time?"), []);
  assert.deepEqual(rules(adviceChecks("You feel heavy. Take your time.", "body")), ["chk-46:block"]);
});

test("chk-46 names the kind of fault and never the reader's words", () => {
  const out = adviceChecks("Take Zorblax seriously. You should call Zorblax.", "body");
  assert.equal(out.length, 1);
  assert.match(out[0].message, /^body: tells the reader what to do \(/);
  assert.doesNotMatch(out[0].message, /Zorblax/i);
});

test("the three checks stay quiet on ordinary sentences about a heavy time, every one of the sentences a clean reading is made of", () => {
  for (const text of [CLEAN.line, ...CLEAN.body.split(/(?<=\.)\s+/)]) assert.deepEqual(blocked(text), [], text);
  assert.deepEqual(checkReading(CLEAN, input()).checks, []);
});

test("a check says whose field it found the fault in", () => {
  const dated = checkReading({ line: "You feel it most on 3 June 1999.", body: CLEAN.body.replace("9 March 2027", "4 April 1980") }, input());
  assert.deepEqual(dated.checks.map((c) => c.message), [
    "line: names a date that THE EVENT does not list",
    "body: names a date that THE EVENT does not list",
  ]);
  const told = checkReading({ line: "Take your time.", body: `${CLEAN.body} You will meet someone.` }, input());
  assert.deepEqual(rules(told.checks), ["chk-46:block", "chk-45:block"]);
  assert.deepEqual(told.checks.map((c) => c.message.split(":")[0]), ["line", "body"]);
});

test("no message of a reading carries a word the reader or the writer put in it", () => {
  const hostile = {
    line: "Zorblax, take your time on 3 June 1999 at 14:30.",
    body: `${CLEAN.body} Zorblax will bring a new job in the summer at 77° Quuxland. You should call Zorblax. ${DATA_OPEN("quote")} Zorblax ${DATA_CLOSE}`,
  };
  const out = checkReading(hostile, input());
  assert.ok(out.checks.some((c) => c.cls === "block"));
  for (const c of out.checks) assert.doesNotMatch(c.message, /Zorblax|Quuxland|1999|14:30|77|summer/i, c.message);
});

test("lengths: the line takes 20 words, 24 with the buffer and not a word more", () => {
  assert.equal(LINE_WORDS, 20);
  assert.equal(LINE_BUFFER, 24);
  const line = (n: number) => rules(lengthChecks({ line: wordsOf(n), body: CLEAN.body }));
  assert.deepEqual(line(1), []);
  assert.deepEqual(line(20), []);
  assert.deepEqual(line(21), ["chk-47:buffer"]);
  assert.deepEqual(line(24), ["chk-47:buffer"]);
  assert.deepEqual(line(25), ["chk-47:block"]);
});

test("lengths: the body takes 90 to 140 words, 72 to 168 with the buffer", () => {
  assert.deepEqual(BODY_BUFFER, [72, 168]);
  const body = (n: number) => rules(lengthChecks({ line: CLEAN.line, body: wordsOf(n) }));
  assert.deepEqual(body(90), []);
  assert.deepEqual(body(140), []);
  assert.deepEqual(body(89), ["chk-47:buffer"]);
  assert.deepEqual(body(72), ["chk-47:buffer"]);
  assert.deepEqual(body(71), ["chk-47:block"]);
  assert.deepEqual(body(141), ["chk-47:buffer"]);
  assert.deepEqual(body(168), ["chk-47:buffer"]);
  assert.deepEqual(body(169), ["chk-47:block"]);
  assert.deepEqual(body(0), ["chk-47:block"], "an empty body is no reading");
});

test("lengths count words as a reader does: runs of space, a new line and a trailing space are not words", () => {
  const spaced = wordsOf(90).replace(/ /g, "  \n ");
  assert.deepEqual(rules(lengthChecks({ line: `  ${wordsOf(20)}  `, body: `${spaced} ` })), []);
});

test("both fields over their counts are two messages, each naming its field", () => {
  const out = lengthChecks({ line: wordsOf(30), body: wordsOf(10) });
  assert.deepEqual(out.map((c) => c.message), [
    "line: 30 words, the line takes 20 at most",
    "body: 10 words, the body takes 90 to 140",
  ]);
});

test("every kind of marker a model copies out of a prompt is taken out of both fields, once each, and the words stay", () => {
  const marked = {
    line: `${DATA_OPEN("label")} You carry more ${DATA_CLOSE}`,
    body: CLEAN.body.replace("Your report says", `${DATA_OPEN("quote")}Your report says${DATA_CLOSE}`),
  };
  const out = checkReading(marked, input());
  assert.deepEqual(rules(out.checks), ["chk-48:fix", "chk-48:fix"]);
  assert.deepEqual(out.checks.map((c) => c.message.split(":")[0]), ["line", "body"]);
  assert.equal(out.output.line, "You carry more");
  assert.equal(out.output.body, CLEAN.body);
  for (const field of Object.values(out.output)) assert.doesNotMatch(field, /<<|>>/);
});

test("a marker beside a full stop or a comma leaves no stray space, and one between words leaves one", () => {
  const body = (insert: string) => checkReading({ line: CLEAN.line, body: CLEAN.body.replace("Each pass brings", insert) }, input()).output.body;
  assert.ok(body(`Each pass ${DATA_CLOSE}brings`).includes("Each pass brings that gap"));
  assert.ok(body(`${DATA_OPEN("quote")}Each pass brings`).includes("you are. Each pass brings that gap"));
  assert.ok(body(`Each${DATA_CLOSE}pass brings`).includes("Each pass brings that gap"));
});

test("the fixes are applied before the blocks are read: a date inside a copied marker's quote is still caught", () => {
  const out = checkReading({ line: CLEAN.line, body: `${CLEAN.body} ${DATA_OPEN("quote")} It was exact on 3 June 1999; so ${DATA_CLOSE}` }, input());
  assert.ok(rules(out.checks).includes("chk-48:fix"));
  assert.ok(rules(out.checks).includes("chk-41:fix"));
  assert.ok(rules(out.checks).includes("chk-44:block"));
  assert.ok(out.output.body.endsWith("It was exact on 3 June 1999. So"), out.output.body);
});

test("a name block a model copies back is read as the name, and the name spelling a month is never a date", () => {
  const named = checkReading({ line: CLEAN.line, body: `${DATA_OPEN("name")}\nJune Carter\n${DATA_CLOSE} asks a lot of June in this stretch. ${CLEAN.body}` }, input({ name: "June Carter" }));
  assert.ok(named.output.body.startsWith("June Carter asks a lot of June"), named.output.body);
  assert.deepEqual(rules(named.checks), [], "the reader's name is no month");
  const other = checkReading({ line: CLEAN.line, body: `Saturn asks a lot of June in this stretch. ${CLEAN.body}` }, input({ name: "Marie Curie" }));
  assert.deepEqual(rules(other.checks), ["chk-44:block"]);
});

test("the input is not changed by a check", () => {
  const given = input();
  const before = JSON.stringify({ ...given, brief: given.brief.text });
  checkReading({ ...CLEAN, body: `${CLEAN.body} Take your time.` }, given);
  assert.equal(JSON.stringify({ ...given, brief: given.brief.text }), before);
});

test("the sky events beside Saturn's square are all readable by the same checks without a fault of their own", () => {
  const kinds = new Set<SkyEvent["kind"]>();
  for (const event of events.slice(0, 40)) {
    kinds.add(event.kind);
    const f = eventFacts(event, curie, false);
    assert.deepEqual(dateChecks(f.lines.join("\n"), f, "facts"), [], event.key);
  }
  assert.ok(kinds.has("contact"));
});

// The two tests below hold sentences that tell the reader what to do, or foretell their life, in shapes the lists in
// checks.ts do not reach. R16-21 says chk-45 and chk-46 block them (ADR-206, R-5.2 as amended), so they stay failing
// until the lists reach them; none is a near miss, each is the plain thing the rule forbids.
test("chk-46 stops an order that follows an opening clause, a name or a softener, and the commands the verb list leaves out", () => {
  assert.deepEqual(misses([
    "When it gets heavy, take a breath.", "If you can, rest.", "Marie, take your time.", "Maybe take your time.", "Do take your time.",
    "Let go of the pressure.", "Stop and think.", "You'd be wise to wait.",
  ], ["chk-46:block"]), []);
});

test("chk-45 stops a job lost or quit, love found, a house bought, riches and a husband met, foretold", () => {
  assert.deepEqual(misses([
    "You'll lose your job.", "You will quit your job.", "You will fall in love.", "You will meet your future husband.", "You will buy a house.", "You will get rich.",
  ], ["chk-45:block"]), []);
});
