/**
 * Scenes: everyday moments a section's writer is handed, so a placement lands in a day the reader can check
 * (explain-like-a-friend §10, ADR-375, 381). A section sees a few, picked for its chart, never the pool: a writer
 * shown a list copies from it, and every report would meet the same party.
 *
 * The house sets the place, the planet the action, the sign the style, so two placements in different houses land
 * in different places. Each scene carries one small object or number, the detail that makes a line feel seen, and
 * speaks in could, might and may: a scene shows a habit, never what is going to happen. Every line is ours; the
 * voice study gave the 24 types and the pattern, never a sentence.
 */
import { createHash } from "node:crypto";
import type { Body, SignName } from "./vocabulary.js";

export const SCENE_TYPES = [
  "party", "group-project", "group-chat", "first-date", "breakup", "argument",
  "work-meeting", "family-dinner", "planning-a-trip", "payday", "moving-house", "bad-day",
  "monday-morning", "told-a-secret", "splitting-the-bill", "asking-for-help", "rushed-or-kept-waiting", "learning-something-new",
  "praise-and-criticism", "alone-at-1am", "plans-changed", "free-saturday", "birthdays-and-gifts", "posting-online",
] as const;
export type SceneType = (typeof SCENE_TYPES)[number];

export interface Scene {
  /** "house-6-b": the reuse check names a scene by it, never by its text, so an id never moves to another scene. */
  id: string;
  type: SceneType;
  text: string;
}

type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

const BODY_SCENES: Record<Body, readonly Scene[]> = {
  sun: [
    { id: "body-sun-a", type: "free-saturday", text: "You might give a spare Saturday to the one hobby you'd happily do for free." },
    { id: "body-sun-b", type: "birthdays-and-gifts", text: "On your birthday, the card that means most might be the one that names what you're good at." },
    { id: "body-sun-c", type: "work-meeting", text: "When the slide about your part comes up in a meeting, you might sit up and talk faster." },
    { id: "body-sun-d", type: "first-date", text: "When a first date asks about you, you might talk for half an hour about the one project you're proudest of." },
    { id: "body-sun-e", type: "posting-online", text: "After posting a photo of a table you built, you might check who noticed more than you'd admit." },
  ],
  moon: [
    { id: "body-moon-a", type: "bad-day", text: "After a hard day, the same blue mug might be in your hand before your shoes are off." },
    { id: "body-moon-b", type: "alone-at-1am", text: "Awake at 1am, you might end up eating cereal standing up in the kitchen." },
    { id: "body-moon-c", type: "moving-house", text: "In a new place, you might not feel settled until your own pillow is on the bed." },
    { id: "body-moon-d", type: "group-chat", text: "When a friend goes quiet in the group chat for two days, you might message them on their own." },
    { id: "body-moon-e", type: "family-dinner", text: "You might notice someone's plate is still full at a family dinner before anyone else does." },
  ],
  mercury: [
    { id: "body-mercury-a", type: "group-chat", text: "A friend sends a four-minute voice note. You might reply with three neat lines of text." },
    { id: "body-mercury-b", type: "work-meeting", text: "The follow-up email listing the five things agreed in a meeting might come from you." },
    { id: "body-mercury-c", type: "learning-something-new", text: "With a new app, you might press every button before you open the help page." },
    { id: "body-mercury-d", type: "argument", text: "In a disagreement, you might quote back the exact words they used last Tuesday." },
    { id: "body-mercury-e", type: "party", text: "At a party, you might drift between three conversations and keep track of all of them." },
  ],
  venus: [
    { id: "body-venus-a", type: "first-date", text: "You might pick the café for a date by its soft lighting and good music." },
    { id: "body-venus-b", type: "birthdays-and-gifts", text: "A friend once mentioned a perfume they liked. You might remember it three months later for their birthday." },
    { id: "body-venus-c", type: "payday", text: "On payday, you might buy flowers for the table before anything you need." },
    { id: "body-venus-d", type: "party", text: "You might spot the guest standing alone at a party and bring them a drink." },
    { id: "body-venus-e", type: "breakup", text: "When a relationship ends, one favourite record might go on while you tidy the whole flat." },
  ],
  mars: [
    { id: "body-mars-a", type: "argument", text: "Someone talks over you twice in a meeting. You might finish your sentence anyway, a little louder." },
    { id: "body-mars-b", type: "rushed-or-kept-waiting", text: "The queue at the post office hasn't moved in ten minutes. You might give up on it and try the one across town." },
    { id: "body-mars-c", type: "monday-morning", text: "Your first hour on a Monday might go on the hardest job on the list." },
    { id: "body-mars-d", type: "group-project", text: "When a group task gets stuck, you might take over that part and finish it by Friday." },
    { id: "body-mars-e", type: "first-date", text: "You might challenge a first date to a game of pool." },
  ],
  jupiter: [
    { id: "body-jupiter-a", type: "asking-for-help", text: "You mention you need someone to feed your cat for a week. You might have three offers by the evening." },
    { id: "body-jupiter-b", type: "planning-a-trip", text: "Booking a weekend away, you might add a second city because it's only two hours further." },
    { id: "body-jupiter-c", type: "learning-something-new", text: "You might buy four books on a new subject before you finish the first one." },
    { id: "body-jupiter-d", type: "birthdays-and-gifts", text: "Planning a friend's birthday dinner for six, you might end up booking for twelve." },
    { id: "body-jupiter-e", type: "family-dinner", text: "You might offer to host next year's big family lunch before the plates are cleared." },
  ],
  saturn: [
    { id: "body-saturn-a", type: "group-project", text: "The night before a team deadline, you might redo the hardest part yourself at 10pm, just to be sure." },
    { id: "body-saturn-b", type: "payday", text: "You might save for two years for a good camera instead of buying a cheap one now." },
    { id: "body-saturn-c", type: "asking-for-help", text: "You might carry a heavy suitcase up two flights of stairs alone rather than ask." },
    { id: "body-saturn-d", type: "work-meeting", text: "Before a big meeting, you might rehearse your first sentence in the lift." },
    { id: "body-saturn-e", type: "learning-something-new", text: "You might practise the same piano piece for a year before you play it for anyone." },
  ],
  uranus: [
    { id: "body-uranus-a", type: "plans-changed", text: "A plan you made a month ago changes overnight. You might feel more relieved than upset." },
    { id: "body-uranus-b", type: "learning-something-new", text: "You might teach yourself a new skill from free videos instead of the course everyone recommends." },
    { id: "body-uranus-c", type: "work-meeting", text: "You might ask why the team still runs the Monday check-in the old way." },
    { id: "body-uranus-d", type: "group-chat", text: "You might suggest a night swim at 11pm in the group chat when everyone expects the pub." },
    { id: "body-uranus-e", type: "posting-online", text: "You might leave a social app all your friends use and not miss it." },
  ],
  neptune: [
    { id: "body-neptune-a", type: "first-date", text: "After one good first date, you might already be picturing a holiday together." },
    { id: "body-neptune-b", type: "alone-at-1am", text: "One sad song might still be on repeat for you at 1am." },
    { id: "body-neptune-c", type: "payday", text: "You might believe the advert for a face cream a little more than you should." },
    { id: "body-neptune-d", type: "bad-day", text: "On a rough evening, you might put on a film you've already seen a dozen times." },
    { id: "body-neptune-e", type: "planning-a-trip", text: "Before a holiday, you might spend longer picturing evenings on the balcony than reading the booking." },
  ],
  pluto: [
    { id: "body-pluto-a", type: "posting-online", text: "In one night, you might delete four years of old posts to start clean." },
    { id: "body-pluto-b", type: "moving-house", text: "Clearing out before a move, you might give away half of what you own." },
    { id: "body-pluto-c", type: "alone-at-1am", text: "At 1am, you might be on your fifteenth article about a question someone asked at dinner." },
    { id: "body-pluto-d", type: "plans-changed", text: "If a plan you cared about stops, you might have a replacement worked out by Sunday." },
    { id: "body-pluto-e", type: "splitting-the-bill", text: "You might pay the whole bill yourself rather than owe anyone a penny." },
  ],
  chiron: [
    { id: "body-chiron-a", type: "learning-something-new", text: "Maths might have been hard for you at school. You might now explain percentages to a friend slowly and kindly." },
    { id: "body-chiron-b", type: "praise-and-criticism", text: "An old comment about your handwriting might still bother you. Someone else's rough first draft could get your kindest notes." },
    { id: "body-chiron-c", type: "asking-for-help", text: "Asking for help might still feel awkward for you. Friends stuck at midnight may call you first anyway." },
    { id: "body-chiron-d", type: "family-dinner", text: "At big family meals, part of you might still feel outside. That could be why you sit with the quiet cousin." },
    { id: "body-chiron-e", type: "posting-online", text: "You might dislike photos of yourself. The kindest group photo from the picnic could be the one you took." },
  ],
  north_node: [
    { id: "body-north_node-a", type: "work-meeting", text: "In meetings, you might usually take the notes. Asking the first question at the next one could feel strange and useful." },
    { id: "body-north_node-b", type: "asking-for-help", text: "Letting someone else carry the shopping might feel odd. Saying yes to that bit of help could be the practice you need." },
    { id: "body-north_node-c", type: "learning-something-new", text: "In a beginners' dance class, your spot might be at the back by the door. Staying to the end could teach you more than the steps." },
    { id: "body-north_node-d", type: "plans-changed", text: "When a plan changes, your first move might be to take charge. Letting a friend choose where to eat could feel new." },
    { id: "body-north_node-e", type: "party", text: "At a party, you might usually leave by ten. One late conversation with a stranger could be worth staying for." },
  ],
  south_node: [
    { id: "body-south_node-a", type: "monday-morning", text: "Monday might start with the three tasks you could do in your sleep." },
    { id: "body-south_node-b", type: "family-dinner", text: "At family dinners, you might slip back into the role you had at fourteen." },
    { id: "body-south_node-c", type: "rushed-or-kept-waiting", text: "Stuck in a long queue, you might open the same phone game you've played a hundred times." },
    { id: "body-south_node-d", type: "bad-day", text: "When a day goes badly, you might go straight back to an old comfort, a long bath with the door locked." },
    { id: "body-south_node-e", type: "free-saturday", text: "Your free Saturday might end at the same pub quiz, with the same team as last week." },
  ],
};

const SIGN_SCENES: Record<SignName, readonly Scene[]> = {
  aries: [
    { id: "sign-aries-a", type: "rushed-or-kept-waiting", text: "If a web page takes more than three seconds to load, you might close it." },
    { id: "sign-aries-b", type: "argument", text: "You might say exactly what you think in the first ten seconds of a disagreement." },
    { id: "sign-aries-c", type: "asking-for-help", text: "You might try to fix the washing machine yourself before you ask anyone." },
    { id: "sign-aries-d", type: "first-date", text: "You might ask for a date's number before the bill arrives." },
  ],
  taurus: [
    { id: "sign-taurus-a", type: "rushed-or-kept-waiting", text: "If someone hurries you to choose a paint colour, you might take another week on purpose." },
    { id: "sign-taurus-b", type: "payday", text: "The most expensive thing you own might be a very good mattress." },
    { id: "sign-taurus-c", type: "plans-changed", text: "If a friend swaps your usual Friday curry for somewhere new, you might ask why twice." },
    { id: "sign-taurus-d", type: "free-saturday", text: "For you, a slow Saturday might mean breakfast in bed and a long walk to the bakery." },
  ],
  gemini: [
    { id: "sign-gemini-a", type: "learning-something-new", text: "In one week, you might read about bees, tax law and old films, just because one led to another." },
    { id: "sign-gemini-b", type: "group-chat", text: "You might keep five chats going at once and still remember who said what." },
    { id: "sign-gemini-c", type: "rushed-or-kept-waiting", text: "Waiting for a train, you might read the news, text a friend and start a crossword in ten minutes." },
    { id: "sign-gemini-d", type: "plans-changed", text: "If plans change an hour before, you might have two new ideas before anyone else has replied." },
  ],
  cancer: [
    { id: "sign-cancer-a", type: "family-dinner", text: "At a dinner for ten, you might remember who doesn't eat mushrooms." },
    { id: "sign-cancer-b", type: "moving-house", text: "For a move, you might wrap a chipped vase from your first flat in three jumpers." },
    { id: "sign-cancer-c", type: "bad-day", text: "A friend's bad day might bring you to their door with the board game you both played as kids." },
    { id: "sign-cancer-d", type: "birthdays-and-gifts", text: "You might track down the sweets a friend loved at school for their birthday." },
  ],
  leo: [
    { id: "sign-leo-a", type: "praise-and-criticism", text: "One small criticism might outweigh ten compliments for you." },
    { id: "sign-leo-b", type: "posting-online", text: "You might post the loaf you baked from three different angles." },
    { id: "sign-leo-c", type: "birthdays-and-gifts", text: "You might plan a friend's birthday surprise down to the balloons." },
    { id: "sign-leo-d", type: "free-saturday", text: "Given a free Saturday, you might put on a show for your nephews on a cardboard stage." },
  ],
  virgo: [
    { id: "sign-virgo-a", type: "plans-changed", text: "If the timetable changes, you might have a new plan written up within twenty minutes." },
    { id: "sign-virgo-b", type: "planning-a-trip", text: "The little bag of plasters nobody else thought to pack might be yours." },
    { id: "sign-virgo-c", type: "splitting-the-bill", text: "You might spot the extra drink on the bill that nobody ordered." },
    { id: "sign-virgo-d", type: "monday-morning", text: "Before starting anything on a Monday, you might clear your desk." },
  ],
  libra: [
    { id: "sign-libra-a", type: "argument", text: "When two friends argue, you might end up explaining each one to the other." },
    { id: "sign-libra-b", type: "splitting-the-bill", text: "At a group dinner, you might make sure the person who only had a salad pays less." },
    { id: "sign-libra-c", type: "first-date", text: "You might agree with almost everything a first date says for the first hour." },
    { id: "sign-libra-d", type: "birthdays-and-gifts", text: "You might spend an hour choosing between two scarves that look almost the same." },
  ],
  scorpio: [
    { id: "sign-scorpio-a", type: "first-date", text: "By the second drink on a date, you might know their whole family history. They may have learned only your job." },
    { id: "sign-scorpio-b", type: "told-a-secret", text: "Someone tells you a secret by the coffee machine at work. You might guard it so well they forget they told you." },
    { id: "sign-scorpio-c", type: "posting-online", text: "You might keep your profile private and post twice a year." },
    { id: "sign-scorpio-d", type: "argument", text: "In an argument, you might go quiet for a whole evening rather than say it badly." },
  ],
  sagittarius: [
    { id: "sign-sagittarius-a", type: "planning-a-trip", text: "You might plan a whole trip around one odd museum you read about." },
    { id: "sign-sagittarius-b", type: "praise-and-criticism", text: "If a friend asks your honest view of their new haircut, you might give it." },
    { id: "sign-sagittarius-c", type: "free-saturday", text: "A free Saturday could end with you on a ferry to a town you only know from a map." },
    { id: "sign-sagittarius-d", type: "group-chat", text: "You might answer a light question in the group chat with a long honest message." },
  ],
  capricorn: [
    { id: "sign-capricorn-a", type: "work-meeting", text: "You might close a meeting by writing three names and three deadlines on the board." },
    { id: "sign-capricorn-b", type: "asking-for-help", text: "You might work late three nights in a row rather than ask for more time." },
    { id: "sign-capricorn-c", type: "monday-morning", text: "Your Monday might start with a plan for the whole quarter." },
    { id: "sign-capricorn-d", type: "payday", text: "On payday, you might pay every bill before you buy so much as a sandwich." },
  ],
  aquarius: [
    { id: "sign-aquarius-a", type: "splitting-the-bill", text: "Planning a group trip, you might suggest a fairer way to share the cost of the cabin." },
    { id: "sign-aquarius-b", type: "plans-changed", text: "If everyone else drops out of the gig, you might go alone and enjoy it." },
    { id: "sign-aquarius-c", type: "posting-online", text: "You might post about a cause you care about, even if it gets three likes." },
    { id: "sign-aquarius-d", type: "work-meeting", text: "You might suggest a new system for the rota that nobody asked for." },
  ],
  pisces: [
    { id: "sign-pisces-a", type: "bad-day", text: "You might sense someone's bad day from the way they put their bag down." },
    { id: "sign-pisces-b", type: "alone-at-1am", text: "Lying awake at 1am, you might imagine a whole life for a stranger from the queue at the shop." },
    { id: "sign-pisces-c", type: "asking-for-help", text: "A friend asks for a lift to the station. You might say yes before they've finished asking." },
    { id: "sign-pisces-d", type: "family-dinner", text: "You might feel the tension between two relatives at a family dinner before a word is said." },
  ],
};

const HOUSE_SCENES: Record<HouseNumber, readonly Scene[]> = {
  1: [
    { id: "house-1-a", type: "work-meeting", text: "You join a video call with eight people you don't know yet. Within minutes, they might be turning to you with their questions." },
    { id: "house-1-b", type: "party", text: "You arrive at a party holding a dripping umbrella. Someone new might start chatting to you before you've found where to put it." },
    { id: "house-1-c", type: "posting-online", text: "You might take eleven photos before you post one of yourself. The one you pick could be the one that looks most like you on a normal weekday." },
    { id: "house-1-d", type: "praise-and-criticism", text: "A stranger at the bus stop says they like your coat. You might go a little red before your thank-you comes out." },
    { id: "house-1-e", type: "learning-something-new", text: "At the first evening class, everyone wears a paper name badge. You might write a shorter version of your name than the one on your passport." },
  ],
  2: [
    { id: "house-2-a", type: "payday", text: "Your pay lands on the 28th. You might put a set amount aside before you buy a single thing." },
    { id: "house-2-b", type: "rushed-or-kept-waiting", text: "A pair of boots has sat in your online basket for five weeks. You might wait for a sale before you finally buy them." },
    { id: "house-2-c", type: "birthdays-and-gifts", text: "A friend's 30th might get a bigger present than anything you'd buy yourself in a month." },
    { id: "house-2-d", type: "moving-house", text: "Packing to move, you find a drawer of nine old phone chargers. All nine might come with you, just in case." },
    { id: "house-2-e", type: "splitting-the-bill", text: "After a meal out, you might quietly check your share of the bill before you tap your card." },
  ],
  3: [
    { id: "house-3-a", type: "group-chat", text: "The family group chat has 214 unread messages. You might scroll back to find the one that matters." },
    { id: "house-3-b", type: "family-dinner", text: "At a family meal, your brother starts the old story about the broken bike. You might jump in to tell it your way." },
    { id: "house-3-c", type: "learning-something-new", text: "You might learn twenty words of a new language on your walks to the shops." },
    { id: "house-3-d", type: "rushed-or-kept-waiting", text: "The bus is six minutes late. You might fill the wait chatting with the neighbour from number 12." },
    { id: "house-3-e", type: "told-a-secret", text: "Over the garden fence, a neighbour tells you some news about the street. You might decide right there whether it goes any further." },
  ],
  4: [
    { id: "house-4-a", type: "moving-house", text: "After a move, you might hang your grandparents' old clock before anything else goes on the walls." },
    { id: "house-4-b", type: "family-dinner", text: "At Sunday lunch, a parent might bring out the old photo album again. You may notice you're the one asking who everyone is." },
    { id: "house-4-c", type: "bad-day", text: "You might ring home after a long week just to hear the radio in the background." },
    { id: "house-4-d", type: "free-saturday", text: "With a whole Saturday free, you might spend three hours moving one bookshelf until the room feels right." },
    { id: "house-4-e", type: "birthdays-and-gifts", text: "For a cousin's birthday, you might make the pudding from your family's old handwritten recipe." },
  ],
  5: [
    { id: "house-5-a", type: "free-saturday", text: "A Saturday opens up with nothing booked. You might spend it painting an old stool bright yellow, for no reason at all." },
    { id: "house-5-b", type: "first-date", text: "You might suggest crazy golf for a first date. You may get more competitive about the windmill hole than you meant to." },
    { id: "house-5-c", type: "learning-something-new", text: "You might buy a cheap ukulele on a whim. You could end up playing the same four chords every night for a month." },
    { id: "house-5-d", type: "birthdays-and-gifts", text: "At your niece's sixth birthday, you might be the adult on the floor building her new toy." },
    { id: "house-5-e", type: "posting-online", text: "You might bake a lopsided cake and post a photo of it anyway. The comments could please you more than the cake." },
  ],
  6: [
    { id: "house-6-a", type: "monday-morning", text: "Your alarm goes off at 6:55 on a Monday. You might have the day's list written before the kettle boils." },
    { id: "house-6-b", type: "group-project", text: "A team task at work gets split four ways. You might end up checking the 40 rows of figures nobody else wanted." },
    { id: "house-6-c", type: "bad-day", text: "Even with a cold, you might answer work emails from the sofa with a box of tissues beside you." },
    { id: "house-6-d", type: "plans-changed", text: "Your usual 8:10 train is cancelled. Your whole morning might feel slightly off after that." },
    { id: "house-6-e", type: "asking-for-help", text: "Your workload doubles for a week. You might wait until Thursday to hand over even one task." },
  ],
  7: [
    { id: "house-7-a", type: "argument", text: "Your partner leaves a wet towel on the bed again. You might raise it before the towel has dried." },
    { id: "house-7-b", type: "planning-a-trip", text: "Planning a long weekend with a partner, you might check twice that they're happy with the hotel before you book." },
    { id: "house-7-c", type: "work-meeting", text: "In a private chat with a colleague you often clash with, you might open with your three main points." },
    { id: "house-7-d", type: "breakup", text: "Months after a relationship ends, their spare key might still be on your key ring." },
    { id: "house-7-e", type: "rushed-or-kept-waiting", text: "Your partner is twenty minutes late for dinner. You might decide whether to mention it before they sit down." },
  ],
  8: [
    { id: "house-8-a", type: "splitting-the-bill", text: "A friend still owes you for half a concert ticket. Months might pass before you bring it up." },
    { id: "house-8-b", type: "told-a-secret", text: "Over a cold cup of tea, a friend tells you something nobody else knows. It might stay safe with you for years." },
    { id: "house-8-c", type: "asking-for-help", text: "A friend lends you money for a deposit. You might write down the exact amount and a date to pay it back." },
    { id: "house-8-d", type: "payday", text: "On payday, the loan repayment goes out first. Seeing it gone might calm you more than the pay itself." },
    { id: "house-8-e", type: "alone-at-1am", text: "At 1am, you might be adding up what is still owed on the credit card." },
  ],
  9: [
    { id: "house-9-a", type: "planning-a-trip", text: "A long trip is four weeks away. You might read about the history of the place before you check the weather." },
    { id: "house-9-b", type: "learning-something-new", text: "You might start a ten-week evening course just because one question keeps coming back to you." },
    { id: "house-9-c", type: "family-dinner", text: "Talk at a family dinner turns to what people believe. You might put down your fork and ask a real question." },
    { id: "house-9-d", type: "argument", text: "A friend says something about the world you think is wrong. You might argue it out kindly over one long coffee." },
    { id: "house-9-e", type: "posting-online", text: "Back from a trip abroad, you might post one photo of a market stall. The caption could be about what it taught you." },
  ],
  10: [
    { id: "house-10-a", type: "work-meeting", text: "In a meeting of twelve people, your manager turns to you first. You might already have the numbers ready." },
    { id: "house-10-b", type: "praise-and-criticism", text: "Your manager thanks you by name in the Friday email to the whole team. You might read it twice and say nothing." },
    { id: "house-10-c", type: "posting-online", text: "You update your work profile online. You might rewrite the short bit under your name six times." },
    { id: "house-10-d", type: "group-project", text: "A big project needs someone to lead it. You might put your hand up before anyone else has opened the attachment." },
    { id: "house-10-e", type: "rushed-or-kept-waiting", text: "Waiting three weeks to hear back after an interview, you might check your inbox at every lunch break." },
  ],
  11: [
    { id: "house-11-a", type: "party", text: "A friend's party has thirty people you half know. You might spend the night introducing people to each other." },
    { id: "house-11-b", type: "group-chat", text: "The friends' group chat is planning a weekend away. You might set up the poll with three dates to choose from." },
    { id: "house-11-c", type: "asking-for-help", text: "Your laptop crashes the night before a deadline. You might know exactly which friend to message first." },
    { id: "house-11-d", type: "birthdays-and-gifts", text: "A friend's birthday is coming up. You might collect money from fourteen people for one big present." },
    { id: "house-11-e", type: "plans-changed", text: "The group dinner for eight moves to another night at the last minute. You might ring the restaurant to move the booking yourself." },
  ],
  12: [
    { id: "house-12-a", type: "alone-at-1am", text: "Everyone else is asleep at 1am. You might be writing a long message you have no plan to send." },
    { id: "house-12-b", type: "told-a-secret", text: "A colleague tells you their worry in the car park. You might hold onto it without being asked to." },
    { id: "house-12-c", type: "bad-day", text: "A hard day could mean cancelling plans with a polite text. You might spend the evening on a 1,000-piece jigsaw instead." },
    { id: "house-12-d", type: "free-saturday", text: "You might keep one Saturday a month with no plans and your phone switched off." },
    { id: "house-12-e", type: "asking-for-help", text: "A problem might sit with you alone for two weeks before anyone hears about it." },
  ],
};

export const SCENES: {
  body: Record<string, readonly Scene[]>;
  sign: Record<string, readonly Scene[]>;
  house: Record<number, readonly Scene[]>;
} = { body: BODY_SCENES, sign: SIGN_SCENES, house: HOUSE_SCENES };

/** The engine says "Gemini" and "North Node", the vocabulary "gemini" and "north_node": either finds the pool. */
function poolOf(kind: "body" | "sign" | "house", key: string | number): readonly Scene[] {
  if (kind === "house") return SCENES.house[Number(key)] ?? [];
  const name = String(key).trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (kind === "body" ? SCENES.body : SCENES.sign)[name] ?? [];
}

/** A scene's place in its pool for one seed: a hash, so a new scene added to a pool moves only the picks it wins. */
function rank(seed: string, scene: Scene): string {
  return createHash("sha256").update(`${seed}\n${scene.id}`).digest("hex");
}

/**
 * One scene for each wanted key, the same for the same seed, never of a type already in `taken`, whose picks it adds.
 * `taken` belongs to the report: one set across every section is what keeps a type, the party and the group project
 * included, to once a report. A key with no pool (an angle, a lot) or none of its types left gets nothing.
 */
export function pickScenes(
  wanted: readonly { kind: "body" | "sign" | "house"; key: string | number }[],
  seed: string,
  taken: Set<SceneType>,
): Scene[] {
  const picked: Scene[] = [];
  for (const { kind, key } of wanted) {
    let best: { scene: Scene; rank: string } | null = null;
    for (const scene of poolOf(kind, key)) {
      if (taken.has(scene.type)) continue;
      const r = rank(seed, scene);
      if (!best || r < best.rank) best = { scene, rank: r };
    }
    if (!best) continue;
    taken.add(best.scene.type);
    picked.push(best.scene);
  }
  return picked;
}
