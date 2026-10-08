/**
 * The vocabulary: the primitives every report is composed from.
 *
 * This replaces a 764-row database of pre-written combinations
 * ("Mars in Scorpio in the 8th" as one blob) with the ideas those blobs were
 * mechanically built from: what each body does, how each sign does it, where
 * each house puts it, what each aspect type is, and the structural concepts
 * that describe a chart as a whole. Composition happens at assembly time.
 *
 * The doctrine follows the classical sources the product is grounded in
 * (Demetra George; Chris Brennan; Avelar & Ribeiro), in our own words. Entries
 * are descriptive, third person, and never explain method: the reader-facing
 * prompts forbid method talk, so the vocabulary must not smuggle it in. The
 * words are everyday words, one idea per sentence (ADR-257), because every
 * system prompt carries the block and a writer echoes the register it is shown.
 *
 * Every body, sign, house and structure entry opens with a `crisp` line, the
 * one line you'd repeat to a friend, because the writer can only be as crisp
 * as what it is fed (ADR-376). Then a `short` (one sentence, printed on the
 * planet rows and the angle lines a report stores) and a `full` (40–80 words,
 * the doctrine in the shared system block). The crisp lines, the `full`
 * entries and the aspects' four lines are written by hand: edit them in place.
 * `pnpm generate:vocabulary` regenerates the shorts from the generation
 * prompts in scripts/src/generate-vocabulary.ts and keeps the rest as
 * written, so a regeneration never brings the textbook register back.
 *
 * Provenance: drafted by Claude in September 2026; the crisp lines and the
 * shorts were written by hand in October 2026 (R19). The script has not yet
 * regenerated it.
 */

export interface VocabEntry {
  /** At most 15 words, never a dignity or sect word; the system block prints it before `full`. */
  crisp: string;
  /** One sentence of at most 15 words. Readers see it on the planet rows and angle lines. */
  short: string;
  /** 40–80 words. Shared system block. */
  full: string;
}

export interface AspectEntry {
  short: string;
  /** What the relationship between the two functions is. */
  dynamic: string;
  /** How it shows when it is working. */
  inFlow: string;
  /** How it shows under pressure. */
  underStress: string;
  /** What working with it looks like. */
  growth: string;
}

export const BODIES = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
  "uranus", "neptune", "pluto", "chiron", "north_node", "south_node",
] as const;
export type Body = (typeof BODIES)[number];

export const SIGNS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
] as const;
export type SignName = (typeof SIGNS)[number];

export const ASPECTS = ["conjunction", "sextile", "square", "trine", "opposition"] as const;
export type AspectName = (typeof ASPECTS)[number];

export const BODY_LABELS: Record<Body, string> = {
  sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars",
  jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune",
  pluto: "Pluto", chiron: "Chiron", north_node: "North Node", south_node: "South Node",
};

// ---------------------------------------------------------------------------
// Bodies: the function
// ---------------------------------------------------------------------------

export const BODY: Record<Body, VocabEntry> = {
  sun: {
    crisp: "The Sun is what you want your life to be about.",
    short: "The Sun is your sense of who you are and what drives you.",
    full: "The Sun is a person's sense of self: who they are, what drives them, and what they want their life to be about. It shows what they build their life around. It shows where they feel most like themselves and want to be seen for it. In a day chart it leads. In a night chart the Moon leads instead. The Sun still gives a sense of direction.",
  },
  moon: {
    crisp: "The Moon is what you reach for when the day goes wrong.",
    short: "The Moon is your feelings, your habits and what makes you feel safe.",
    full: "The Moon is the body and its needs. It shows what calms a person down and what they reach for under stress. It sets the rhythm of their days and the feelings that come before they think. It shows how they look after themselves and others, and what they need in place to cope. In a night chart it leads.",
  },
  mercury: {
    crisp: "Mercury is how you think, and how it comes out when you speak.",
    short: "Mercury is how you think, learn, decide and explain yourself.",
    full: "Mercury is how a person thinks and talks: noticing, language, reasoning, learning and passing on information. It shows how someone takes in the world, explains themselves and decides. It shows what kind of thinking comes easily. It is neither a day planet nor a night planet. It takes on the nature of the planets it sits with.",
  },
  venus: {
    crisp: "Venus is what you enjoy and how you make people feel welcome.",
    short: "Venus is what you love, what you enjoy and how you draw people close.",
    full: "Venus is attraction and making peace. It shows what a person finds beautiful, what they enjoy, and how they draw people closer. It covers taste, affection, cooperation and the pleasures that make life worth the effort. It is the helpful planet of the night side, kinder and more reliable in a night chart.",
  },
  mars: {
    crisp: "Mars is how you go after what you want, and how you push back.",
    short: "Mars is your drive: how you act, compete and stand up for yourself.",
    full: "Mars is how a person pushes for what they want: effort, courage, competition, anger, and the ability to say no and walk away. It shows how they go after things, how they fight and how they handle conflict. It is the hard planet of the night side. It does more good by night. In a day chart it is harsher and costs more.",
  },
  // Reports leaned on Jupiter and Saturn without ever saying them plainly (explain-like-a-friend §10), so these do.
  jupiter: {
    crisp: "Jupiter is where things tend to go your way, and where you overdo it.",
    short: "Jupiter is where help tends to show up, and where you say yes too fast.",
    full: "Jupiter is where things tend to go a person's way, and where they take on too much. It is growth, generosity, hope and the ability to say yes. It shows where help tends to show up when they ask, what they trust and how they grow. It is the helpful planet of the day side. It does the most good in a day chart and is a little less steady by night.",
  },
  saturn: {
    crisp: "Saturn is where you're hard on yourself, and where what you build lasts.",
    short: "Saturn is where nothing comes free, and where you get good slowly.",
    full: "Saturn is where a person is hard on themselves, and where what they build lasts. It is limits and staying power: rules, duty, time and patience. It shows the part of life they have to earn, where they are afraid and where they get good slowly. Results come late there and hold up best. It is the hard planet of the day side and does useful work by day. In a night chart it is harsher and brings more fear.",
  },
  uranus: {
    crisp: "Uranus marks the part of life that changes without asking you first.",
    short: "Uranus is sudden change, and your need to do things your own way.",
    full: "Uranus is sudden change and independence. It covers invention, surprise and refusing to fit in. It shows where a person breaks the pattern and where they need freedom. It shows where life tends to change without warning. It rules no sign and has no dignity. It is read by the house it sits in, never as a ruler.",
  },
  neptune: {
    crisp: "Neptune marks where you see what you hope is there.",
    short: "Neptune is your imagination and ideals, and where you can be fooled.",
    full: "Neptune is imagination and longing. It covers ideals, compassion, confusion and the wish for something beyond everyday life. It shows where a person is most sensitive and most inspired. It also shows where they are most easily fooled. It rules no sign and has no dignity. It adds to the house it sits in and rules nothing.",
  },
  pluto: {
    crisp: "Pluto marks the part of life you can't do halfway.",
    short: "Pluto is intensity and deep change, where you meet what you can't control.",
    full: "Pluto is intensity and deep change. It covers power, compulsion, endings and being changed by what a person cannot control. It shows where someone meets their own intensity. It shows where life asks them to face something fully. It rules no sign and has no dignity. It adds to the house it sits in and rules nothing.",
  },
  // ADR-379: Chiron is read by its house, the sore spot before the gift; its sign is never read.
  chiron: {
    crisp: "Chiron is an old sore spot that teaches you how to help others.",
    short: "Chiron is a sore spot that never fully heals, and what it teaches you.",
    full: "Chiron is a person's sore spot: an old hurt that never fully heals. It is read by its house, never by its sign. The house names the part of life where the sore spot sits. The gift comes after the hurt: because they know it so well, they may become the one who helps other people with it. It is a modern point. It rules nothing and has no home sign.",
  },
  north_node: {
    crisp: "The North Node is the skill you're still learning, and the one you need.",
    short: "The North Node is the direction you grow in: new, uncomfortable and worth it.",
    full: "The North Node marks the direction a life is pulled toward: skills that are still weak, situations that feel new, and areas where effort leads to growth. It rarely feels natural. It is read as a direction, not a placement, and always together with the South Node. It is not a planet.",
  },
  south_node: {
    crisp: "The South Node is what you fall back on.",
    short: "The South Node is what comes easily, and what you lean on too much.",
    full: "The South Node marks what a person falls back on: the skills they arrived with, the habits they return to, and the comfort zone that holds them back when they never leave it. It shows what comes easily and what gets overused. It is read with the North Node as one axis. It is not a planet.",
  },
};

// ---------------------------------------------------------------------------
// Signs: the style
// ---------------------------------------------------------------------------

/** brief.ts reads a rising sign's `full`: sentences 2 and 3 are it at its best, and "Under strain it becomes" opens the last. */
export const SIGN: Record<SignName, VocabEntry> = {
  aries: {
    crisp: "Aries does it now and sorts it out later.",
    short: "Aries goes first and fast, and fixes things afterwards.",
    full: "Aries is a cardinal fire sign, ruled by Mars, with the Sun exalted in it. Anything placed here moves first and moves fast. It would rather act and fix things later than wait. It is honest, brave, competitive and blunt. Under strain it becomes rash, quick to fight, or unable to finish what it started.",
  },
  taurus: {
    crisp: "Taurus likes what works and won't be rushed.",
    short: "Taurus is steady and patient, and slow to start or stop.",
    full: "Taurus is a fixed earth sign, ruled by Venus, with the Moon exalted in it. Anything placed here wants life to be steady and comfortable. It takes its time and likes results it can see and touch. It is patient, loyal, practical and attached to what it has. Under strain it becomes stubborn, possessive, or unwilling to change even when it should.",
  },
  gemini: {
    crisp: "Gemini wants to know a little about everything.",
    short: "Gemini is quick and curious, and loves to talk ideas through.",
    full: "Gemini is a mutable air sign, ruled by Mercury. Anything placed here is curious and quick with words. It wants to know things, talk about them and link one idea to the next. It is clever, friendly, adaptable and quick to see another angle. Under strain it becomes scattered, restless, vague, or unable to stick to one plan.",
  },
  cancer: {
    crisp: "Cancer looks after people and remembers everything.",
    short: "Cancer cares, protects and holds on to the people it loves.",
    full: "Cancer is a cardinal water sign, ruled by the Moon, with Jupiter exalted in it. Anything placed here protects and cares for people. It is shaped by memory and by where it belongs. It is loyal, caring and good at sensing what others need. Under strain it becomes defensive, moody, clingy, or unable to let go.",
  },
  leo: {
    crisp: "Leo wants to make something and have it seen.",
    short: "Leo is warm, proud and generous, and wants to be seen.",
    full: "Leo is a fixed fire sign, ruled by the Sun. Anything placed here wants to stand out and to make things. It wants credit for what it does. It is warm, loyal, open and confident. It leads by example and gives generously. Under strain it becomes proud, demanding, dramatic, or unable to take criticism without feeling hurt.",
  },
  virgo: {
    crisp: "Virgo spots what's wrong and fixes it quietly.",
    short: "Virgo notices the details and wants things to work properly.",
    full: "Virgo is a mutable earth sign, ruled by Mercury, which is also exalted in it. Anything placed here notices details and wants things to work properly. It improves things step by step, with a method. It is skilled, careful and useful. It likes to help in practical ways. Under strain it becomes critical, anxious, perfectionist, or lost in small details.",
  },
  libra: {
    crisp: "Libra weighs both sides and hates to pick one.",
    short: "Libra looks for balance and fairness, and thinks of the other side.",
    full: "Libra is a cardinal air sign, ruled by Venus, with Saturn exalted in it. Anything placed here looks for balance, fairness and partnership. It thinks about the other side and values agreement. It is tactful, fair and has good taste. Under strain it becomes indecisive, afraid of conflict, dependent on approval, or unable to say what it wants.",
  },
  scorpio: {
    crisp: "Scorpio goes all in and keeps things private.",
    short: "Scorpio is intense and private, and wants to know what's really going on.",
    full: "Scorpio is a fixed water sign, ruled by Mars. Anything placed here is intense, private and all or nothing. It wants to know what is really going on. It holds on hard and would rather change completely than adjust a little. It is loyal, perceptive and tough. Under strain it becomes controlling, suspicious, vengeful, or unable to let go.",
  },
  sagittarius: {
    crisp: "Sagittarius says what it thinks and wants to go further.",
    short: "Sagittarius looks for meaning and freedom, and loves to learn and travel.",
    full: "Sagittarius is a mutable fire sign, ruled by Jupiter. Anything placed here looks for meaning, distance and freedom. It explores, teaches and says what it thinks. It is hopeful, generous and drawn to big ideas. It likes to travel and to learn. Under strain it becomes preachy, careless with details, restless, or unable to keep its promises.",
  },
  capricorn: {
    crisp: "Capricorn plays the long game.",
    short: "Capricorn is serious and patient, and works its way up slowly.",
    full: "Capricorn is a cardinal earth sign, ruled by Saturn, with Mars exalted in it. Anything placed here is serious and plans for the long run. It takes responsibility and works its way up slowly. It is capable, reliable and has a dry sense of humour. Under strain it becomes cold, rigid, overworked, or unable to rest until it is too late.",
  },
  aquarius: {
    crisp: "Aquarius stands a little apart and sticks to its principles.",
    short: "Aquarius thinks in systems, values its freedom and cares about the group.",
    full: "Aquarius is a fixed air sign, ruled by Saturn. Anything placed here stands a little apart and lives by its principles. It thinks in patterns and systems. It cares about the group, values independence and is loyal to ideas and to friends. Under strain it becomes distant, contrary, rigid in its views, or unable to be close in person.",
  },
  pisces: {
    crisp: "Pisces picks up how everyone else is feeling.",
    short: "Pisces is open and kind, and finds limits hard to keep.",
    full: "Pisces is a mutable water sign, ruled by Jupiter, with Venus exalted in it. Anything placed here is open, kind and imaginative. It takes on the moods of the people around it. It finds it hard to keep clear limits. It is gentle, generous, intuitive and forgiving. Under strain it becomes escapist, vague, overwhelmed, or unable to say no.",
  },
};

// ---------------------------------------------------------------------------
// Houses: the domain (whole-sign)
// ---------------------------------------------------------------------------

// MB-87 provisional
/**
 * The page's one word per house (ADR-98), as the web prints it beside every
 * house number. A short opens with it so the planet rows a report stores and
 * the page name a house alike.
 */
export const HOUSE_WORDS = [
  "Self", "Money", "Mind", "Home", "Play", "Work",
  "Partnership", "Depth", "Belief", "Career", "Friends", "Solitude",
] as const;

/**
 * A house's crisp line is its covers line from the one house set (ADR-321, 391), word for word. The set lives in
 * web/src/lib/houses.ts, which the api cannot import, so the writer's copy is kept here as HOUSE_WORDS is.
 */
export const HOUSE_COVERS = [
  "your body and how you come across",
  "money and the things you own",
  "talking, learning, brothers and sisters",
  "home, family, your roots",
  "fun, making things, love, children",
  "daily work, habits, health",
  "partners and the people you face one to one",
  "what you share, what's passed down",
  "long trips, big ideas, what you believe",
  "your work and what you're known for",
  "friends, groups, shared hopes",
  "rest, time alone, what goes on out of sight",
] as const;

export const HOUSE: Record<number, VocabEntry> = {
  1: { crisp: HOUSE_COVERS[0], short: "The 1st is self: your body, your manner and how people first see you.", full: "The 1st house is the person themselves: the body, the temperament, and how others first see them. It holds the Ascendant. Its ruler is the chart ruler. It is angular and strong. What is here is clearly part of who the person is. Other people notice it first." },
  2: { crisp: HOUSE_COVERS[1], short: "The 2nd is money: what you earn, own and value.", full: "The 2nd house is money and the things a person owns. It covers income, property, what they earn and keep, and whether they feel they have enough. It also shows what they value and how they judge worth. It is succedent. What is here shows how money comes in and how it is handled." },
  3: { crisp: HOUSE_COVERS[2], short: "The 3rd is mind: everyday talk, learning, brothers and sisters, and your neighbours.", full: "The 3rd house is daily life close to home. It covers brothers and sisters, neighbours, short trips, everyday talk, early school and the ordinary chats of a day. The Moon has her joy here. It is cadent. What is here shows how a person handles what is local, what is routine, and what is said out loud." },
  4: { crisp: HOUSE_COVERS[3], short: "The 4th is home: your family, your roots and your private life.", full: "The 4th house is home and family. It covers parents, family history, land and private life. It is the bottom of the chart and the most private place in it. It is angular. What is here shows where a person comes from. It also shows what they need in order to feel settled." },
  5: { crisp: HOUSE_COVERS[4], short: "The 5th is play: fun, love, children and making things for the joy of it.", full: "The 5th house is fun and making things. It covers play, romance, children, art, performing, and whatever a person does just for the joy of it. Venus has her joy here. It is succedent. What is here shows how a person enjoys themselves, what they make, and how they treat pleasure." },
  6: { crisp: HOUSE_COVERS[5], short: "The 6th is work: your daily jobs, habits and health.", full: "The 6th house is daily work and upkeep. It covers jobs, routines, illness, service, and the plain effort that keeps a life running. Mars has his joy here. It is cadent. The tradition counts it as a hard house. What is here shows how a person handles duties, repetition, and a body under strain." },
  7: { crisp: HOUSE_COVERS[6], short: "The 7th is partnership: your partners, and the people you face one to one.", full: "The 7th house is the other person. It covers marriage, partners, contracts and open rivals. It holds the Descendant, opposite the self. It is angular. What is here, and where its ruler goes, shows who a person commits to. It also shows how their partnerships go." },
  8: { crisp: HOUSE_COVERS[7], short: "The 8th is depth: shared money, debts, what's passed down and what's lost.", full: "The 8th house is what belongs to other people and what is lost. It covers shared money, inheritance, debt, death, and the fear that comes with them. The tradition counts it as a hard house. It is succedent. What is here shows how a person handles shared money, endings, and what they cannot control." },
  9: { crisp: HOUSE_COVERS[8], short: "The 9th is belief: long trips, big ideas, study and what you believe.", full: "The 9th house is what is far away and bigger than daily life. It covers beliefs, religion, higher education, long trips, foreign places and the search for meaning. The Sun has his joy here. It is cadent but respected. What is here shows what a person believes, how they study in depth, and where they look for the truth." },
  10: { crisp: HOUSE_COVERS[9], short: "The 10th is career: your work, your reputation and what you're known for.", full: "The 10th house is a person's public life. It covers career, reputation, authority, success, and what they are seen to do in the world. It holds the Midheaven. It is angular and strong. What is here, and where its ruler goes, shows what a working life looks like. It also shows how recognition comes." },
  11: { crisp: HOUSE_COVERS[10], short: "The 11th is friends: the groups you belong to and the people who help you.", full: "The 11th house is friends and allies. The tradition calls it the good spirit. It covers groups, supporters, and the hopes and help that come through other people. Jupiter has his joy here. It is succedent and lucky. What is here shows how a person gets help, who they belong with, and how they work with others toward shared goals." },
  12: { crisp: HOUSE_COVERS[11], short: "The 12th is solitude: time alone, what's hidden and how you trip yourself up.", full: "The 12th house is what is hidden. It covers time alone, retreat, being shut away, hidden enemies, private sadness, and the ways a person works against themselves. Saturn has his joy here. It is cadent. The tradition counts it as the hardest house. What is here works out of sight. It is often only understood later." },
};

// ---------------------------------------------------------------------------
// Aspects: the relationship
// ---------------------------------------------------------------------------

export const ASPECT: Record<AspectName, AspectEntry> = {
  conjunction: {
    short: "A conjunction fuses two functions so neither operates without the other.",
    dynamic: "Two planets sit in the same place and act as one. Neither can be used without the other. Their natures blend, for better or worse, depending on how well they get along.",
    inFlow: "The two work as one combined strength.",
    underStress: "The trouble with one affects the other. Neither is easy to use alone.",
    growth: "Learning which of the two is acting, and giving each its turn.",
  },
  sextile: {
    short: "A sextile is an easy, workable connection that rewards a little effort.",
    dynamic: "Two planets in signs that get along support each other when asked. The link is friendly and useful but not automatic. It is a chance, not a given.",
    inFlow: "The two cooperate easily and get practical results with a little effort.",
    underStress: "Unused. The help is there but nobody takes it.",
    growth: "Using the link on purpose instead of waiting for it to act by itself.",
  },
  square: {
    short: "A square is friction between two functions that forces something to develop.",
    dynamic: "Two planets in signs that share a mode but not an element push against each other. Neither gives way easily. The pressure is constant. This is where effort is forced and skill is built.",
    inFlow: "Skill earned the hard way. The tension now pushes the person forward.",
    underStress: "Repeated conflict, frustration and the feeling of being pulled two ways at once.",
    growth: "Accepting that the tension will stay and building something from it instead of trying to make it go away.",
  },
  trine: {
    short: "A trine is a natural ease between two functions that asks nothing.",
    dynamic: "Two planets in signs of the same element work together without effort. What they do together comes easily. It often comes so easily that it goes unnoticed and undervalued.",
    inFlow: "Natural talent. The two work together easily and reliably.",
    underStress: "Taking it for granted. The gift is left undeveloped or used as an excuse to avoid harder things.",
    growth: "Treating the ease as something to invest, not a comfort to rest in.",
  },
  opposition: {
    short: "An opposition sets two functions face to face, each seeing what the other lacks.",
    dynamic: "Two planets in opposite signs pull in opposite directions. Each can see the other clearly. The tension often shows up between the person and someone else. It can also show up as a swing between two extremes.",
    inFlow: "Balance and perspective. Each side keeps the other in check. The person can hold both.",
    underStress: "Taking sides. The person sides with one end and meets the other in someone else, usually as conflict.",
    growth: "Owning both ends instead of putting one on someone else, and finding the middle ground.",
  },
};

// ---------------------------------------------------------------------------
// Structural concepts
// ---------------------------------------------------------------------------

export const STRUCTURE: Record<string, VocabEntry> = {
  sect_day: { crisp: "Born by day, the Sun leads and Jupiter is the biggest help.", short: "Born by day: the Sun leads, Jupiter helps, Saturn steadies, Mars costs more.", full: "In a day chart the Sun leads. The chart runs on identity, purpose and direction. Of the two helpful planets, Jupiter helps more. Saturn does steady, useful work. Mars is contrary to sect: out of step with the chart. The person's drive is real but tends to push too hard and cost them something." },
  sect_night: { crisp: "Born by night, the Moon leads and Venus is the biggest help.", short: "Born by night: the Moon leads, Venus helps, Mars steadies, Saturn costs more.", full: "In a night chart the Moon leads. The chart runs on needs, safety, instinct and relationships. Of the two helpful planets, Venus helps more. Mars does steady, useful work. Saturn is contrary to sect: out of step with the chart. The person's discipline is real but tends toward coldness, fear and a low mood." },
  chart_ruler: { crisp: "The planet in charge of your rising sign stands for you.", short: "The chart ruler, the planet in charge of your rising sign, stands for you.", full: "The planet that rules the rising sign is the chart ruler. It stands for the person more directly than any other planet. It shows their health, their drive and where their life is heading. Its sign, house, dignity and sect condition describe the person's own condition." },
  // Home and least at ease are the primer's words (explain-like-a-friend §0c); honoured and doubted are the one plain
  // phrase the brief reads for exaltation and fall. A full keeps its technical word beside those words, with the why (§0b).
  domicile: { crisp: "At home: in its own sign, a planet works with ease.", short: "At home in its sign, a planet works with ease and on its own terms.", full: "A planet in one of its own signs is in domicile: at home. It has everything it needs and works with ease, on its own terms. What it stands for is strong and reliable in this person's life. The why comes from the planet and the sign: Venus wants ease and peace, and Libra takes turns and takes its time." },
  exaltation: { crisp: "Honoured: treated like a guest of honour, it can promise more than it gives.", short: "Honoured in its sign, a planet is admired and sometimes overrated.", full: "A planet in its exaltation sign is honoured, like a guest of honour. It is raised up and treated well, and it can do great things. Sometimes it promises more than it can give. What it stands for is prominent in the person's life and tends to be idealised." },
  detriment: { crisp: "Least at ease: opposite its home, like a guest in a house they can't stand.", short: "Least at ease in its sign, a planet works hard for uneven results.", full: "A planet in the sign opposite its own is in detriment: least at ease, like a guest in a house they can't stand. It works in a style that does not suit it and lacks its usual support. What it stands for is real and often strong, and it comes through effort. The why comes from the two signs: Venus wants ease and peace, and Aries goes first, goes fast and wants to win." },
  fall: { crisp: "Doubted: like a guest nobody takes seriously, it has to prove itself.", short: "Doubted in its sign, a planet gets underrated, even by the person who has it.", full: "A planet in the sign opposite its exaltation is in fall: doubted, like a guest nobody takes seriously. It is overlooked and easily made to feel small. What it stands for is often what the person doubts most in themselves. It is also what most needs deliberate support." },
  peregrine: { crisp: "No special standing here: it leans on its house and the planets near it.", short: "With no special standing in its sign, a planet leans on what's around it.", full: "A planet with no standing in its sign is peregrine: not at home, not honoured, not least at ease and not doubted. It relies on its house, its aspects and the planet in charge of its sign for support. What it stands for is adaptable but unsteady." },
  angular: { crisp: "A planet in the 1st, 4th, 7th or 10th is among the chart's strongest.", short: "A planet in the 1st, 4th, 7th or 10th is strong and shows clearly.", full: "A planet in the 1st, 4th, 7th or 10th house is angular. It sits at one of the four main points of the chart. It is prominent and active. What it stands for shows up clearly in the person's life. It is hard to miss." },
  succedent: { crisp: "A planet in the 2nd, 5th, 8th or 11th builds slowly and lasts.", short: "A planet in the 2nd, 5th, 8th or 11th is steady and follows through.", full: "A planet in the 2nd, 5th, 8th or 11th house is succedent. It is stable and well supported. It works well. It is less visible than an angular planet. What it stands for builds over time and lasts." },
  cadent: { crisp: "A planet in the 3rd, 6th, 9th or 12th works in the background.", short: "A planet in the 3rd, 6th, 9th or 12th works quietly, away from the spotlight.", full: "A planet in the 3rd, 6th, 9th or 12th house is cadent. It sits away from the four main points. It is quieter and works in the background, in thought or out of sight. What it stands for is present but not prominent. It may need to be looked for." },
  // ADR-397's rule, which the engine's chartPatterns computes, and ADR-402's balance by the opposite house.
  stellium: { crisp: "Three or more planets in one sign: that part of life is the loudest.", short: "A stellium is three or more planets in one sign, the chart's busiest spot.", full: "Three or more of the ten planets, Chiron and the North Node in one sign form a stellium. At least two of them must be planets. In whole-sign houses that sign is also one house. That part of life gets most of the attention and becomes the person's main concern. The opposite house is where to balance it." },
  // Review 05/10 §10's definition, then our own picture (explain-like-a-friend §9); each body's own line prints under it.
  retrograde: { crisp: "A planet going backwards at birth tends to work inside first.", short: "A planet going backwards turns inward and runs on its own timetable.", full: "Retrograde means going backwards. From Earth, the planet looked like it moved backwards. It doesn't really: Earth and the planet pass each other on their way round the Sun. What it stands for tends to go inward first: thought over, done in private, slower to show. It runs on the person's own timetable, not the expected one. The picture: missing your exit, turning round and passing the same petrol station three times, as the planet crosses one stretch of sky three times. For Jupiter, the planets beyond it and Chiron, three or four people in ten are born with it going backwards, so it is common. The nodes always move backwards: for them it is normal, so it is never read." },
  // ADR-373: the sign that starts it, its planet in charge, that planet's comfort with the why, and the house it sits in.
  empty_house: { crisp: "An empty house still counts: its planet in charge tells its story.", short: "An empty house plays out wherever its planet in charge sits.", full: "A house with no planets in it still matters. The sign that starts it has a planet in charge, its ruler, and the house runs through that planet. Ask two things. How comfortable is that planet in its sign, and why? Which house does it sit in? That house is where the empty house's story happens. Never call it easy or quiet without that reason." },
  nodal_axis: { crisp: "The nodes run from what you fall back on to what you need to learn.", short: "The nodes are one line, from easy habits to new skills worth the effort.", full: "The nodes form one axis. The South Node marks what is easy, practised and overused. The North Node marks what is still weak and uncomfortable, and where effort leads to growth. The signs and houses at each end name the areas involved." },
  lot_of_fortune: { crisp: "The Lot of Fortune is what comes to you, rather than what you chase.", short: "The Lot of Fortune marks money, health and the luck that comes your way.", full: "The Lot of Fortune is a calculated point. It marks income, the body and a person's material situation. It is about what comes to a person from the world, not what they make happen. Its house shows where luck, good or bad, tends to arrive." },
  lot_of_spirit: { crisp: "The Lot of Spirit is what you set out to do.", short: "The Lot of Spirit marks your choices, your aims and the work you're drawn to.", full: "The Lot of Spirit is the partner of the Lot of Fortune. It is a calculated point. It marks choice, intention and what a person does rather than what happens to them. Its house shows where their drive and the work they feel drawn to are most active." },
  element_fire: { crisp: "Fire acts first and gets excited fast.", short: "Fire is drive, warmth and confidence: the will to start and act.", full: "Fire signs carry initiative, enthusiasm, courage and self-belief. A chart with a lot of fire acts first and gets excited fast. A chart with little fire may lack drive or confidence. It has to build them on purpose." },
  element_earth: { crisp: "Earth wants things it can see, touch and count on.", short: "Earth is practical sense, patience and care for the body and money.", full: "Earth signs carry practical sense, patience, staying power and attention to the physical world. A chart with a lot of earth is steady and slow. A chart with little earth may struggle with money, routine or the body." },
  element_air: { crisp: "Air talks it through and thinks before it feels.", short: "Air is ideas, talk and connection, with a little distance from feelings.", full: "Air signs carry ideas, talk, social ease and perspective. A chart with a lot of air thinks and talks a lot. It can keep its feelings at a distance. A chart with little air may find it hard to explain itself or to see other points of view." },
  element_water: { crisp: "Water feels things first and remembers them for a long time.", short: "Water is feeling, memory and a sense for what goes unsaid.", full: "Water signs carry feeling, intuition, memory and openness. A chart with a lot of water feels everything and is affected by the mood around it. A chart with little water may lose touch with feelings or find it hard to understand others." },
  modality_cardinal: { crisp: "Cardinal signs start things.", short: "Cardinal signs begin things, lead and push forward.", full: "Cardinal signs start things. They begin, lead and push forward. A chart with a lot of cardinal signs starts a great deal and may not finish. A chart with few may wait for others to start." },
  modality_fixed: { crisp: "Fixed signs keep things going.", short: "Fixed signs hold on, build up and resist change.", full: "Fixed signs keep things going. They hold on, build up and resist change. A chart with a lot of fixed signs is stable and stubborn. A chart with few may not follow through or keep to a decision." },
  modality_mutable: { crisp: "Mutable signs adapt and wrap things up.", short: "Mutable signs adjust, spread out and finish what others start.", full: "Mutable signs adapt and finish things. They adjust, spread out and complete. A chart with a lot of mutable signs is flexible and scattered. A chart with few may struggle to adapt when things change." },
  shape_bundle: { crisp: "With every planet in a third of the wheel, life stays focused.", short: "A bundle chart keeps every planet within a third of the wheel.", full: "All the planets sit within about a third of the wheel. The life is focused and specialised. The person cares about a narrow set of things. Much of the wheel stays quiet. What lies in the occupied third shapes everything else." },
  shape_bowl: { crisp: "With every planet in one half, you keep reaching for the other half.", short: "A bowl chart holds every planet in one half of the wheel.", full: "All the planets sit within one half of the wheel. The person is self-contained. They look toward the empty half. They often feel something is missing there and work toward it. The leading planet of the bowl sets the direction of that effort." },
  shape_bucket: { crisp: "One planet stands apart from the rest, and it leads.", short: "A bucket chart has one planet alone on one side, and that one leads.", full: "All the planets sit in one half of the wheel except one, which stands alone as the handle. That single planet becomes the focus and the outlet for everything else. It matters more than usual. The person directs the rest of the chart through it." },
  shape_locomotive: { crisp: "With the planets across two thirds of the wheel, you're driven to fill the gap.", short: "A locomotive chart leaves a third empty and is led by one planet.", full: "The planets spread across two thirds of the wheel, with one third empty. The person is driven and has a sense of something to get done. The planet that leads the group, counted clockwise, sets the pace. The empty third names what they feel is missing." },
  shape_seesaw: { crisp: "With two groups of planets facing each other, life swings between them.", short: "A seesaw chart splits the planets into two groups across the wheel.", full: "The planets form two groups roughly opposite each other. Life moves back and forth between two sets of concerns. The person does best when they keep both in view at once. Other people often bring out the other side." },
  shape_splash: { crisp: "With planets all round the wheel, you have wide interests and spread thin.", short: "A splash chart spreads the planets evenly, with no single cluster.", full: "The planets are spread around the whole wheel with no single cluster. The person has wide interests and adapts to many kinds of situation. They can lose focus by spreading their effort too thin. No one area dominates. The strongest single placements and the chart ruler count for more than usual." },
  shape_splay: { crisp: "With a few separate clusters, you have strong interests that don't always connect.", short: "A splay chart gathers the planets in several clusters with gaps between.", full: "The planets gather in several separate clusters with clear gaps between them. The person is independent and hard to label. Their life is organised around a few strong interests that do not always connect. Each cluster is read as its own concern." },
};

/**
 * Going backwards, body by body (ADR-396): how long it lasts and who passes whom differ, so each line holds only for
 * its own body and none speaks for all (ADR-386). Lengths and rates are the engine's stations from 1950 to 2030. The
 * nodes always move backwards, so they have no line.
 */
export const RETROGRADE_BY_BODY: Readonly<Record<string, string>> = {
  mercury: "Mercury goes backwards for about three weeks, three times in most years, as it passes Earth on the inside. Thinking turns inward first: ideas get checked and rechecked before they are said. The right words often come later, in the person's own time.",
  venus: "Venus goes backwards for about six weeks, about every year and a half, as it passes Earth on the inside. Feelings and taste turn inward first: the person sorts out what they like on their own before they show it. Affection can take a while to show, on the person's own timetable.",
  mars: "Mars goes backwards for two to nearly three months, about every two years, as Earth passes it. Drive turns inward first: the person thinks before they act, and anger can show late. They push hardest on their own projects, at their own pace.",
  jupiter: "Jupiter goes backwards for about four months, about once a year, as Earth passes it. Growth turns inward first: the person trusts what they find out for themselves over what they are told. Help and luck tend to come quietly, on the person's own timetable.",
  saturn: "Saturn goes backwards for about four and a half months, about once a year, as Earth passes it. Duty turns inward first: the person sets their own rules and can be harder on themselves than anyone asks. Results come slowly, on the person's own timetable.",
  uranus: "Uranus goes backwards for about five months, about once a year, as Earth passes it. Change starts inside first: the person breaks from the usual pattern quietly, before anyone sees it, on their own timetable.",
  neptune: "Neptune goes backwards for about five months, about once a year, as Earth passes it. Hopes and ideals turn inward first: the person keeps their dreams to themselves and finds meaning on their own, in their own time.",
  pluto: "Pluto goes backwards for about five months, about once a year, as Earth passes it. Intensity turns inward first: deep changes happen in private, long before they show, on the person's own timetable.",
  chiron: "Chiron goes backwards for four to five months, about once a year, as Earth passes it. The sore spot turns inward first: it gets worked on alone, out of sight. Helping others with it tends to come later, on the person's own timetable.",
};

/** Every crisp line and full entry, rendered once as the static vocabulary block for the system prompt. */
export function renderVocabularyBlock(): string {
  // MB-92 provisional: reports echoed entries as sentences ("The Moon is the body…"), so the block is introduced as doctrine.
  const lines: string[] = [
    "VOCABULARY (doctrine for reading a chart, never lines to repeat: put what an entry means into your own plain words).",
    "Each entry opens with its crisp line, the one plain line a friend would say, then goes deeper. A crisp line shows how plain the first mention of an idea should be: say it fresh for this reader, never copy it.",
    "",
  ];
  // A house's crisp line is its covers line, which has no full stop of its own.
  const entry = (label: string, e: VocabEntry) => `- ${label}: ${/[.!?]$/.test(e.crisp) ? e.crisp : `${e.crisp}.`} Deeper: ${e.full}`;
  lines.push("Bodies (what each does):");
  for (const b of BODIES) lines.push(entry(BODY_LABELS[b], BODY[b]));
  lines.push("", "Signs (how it does it):");
  for (const s of SIGNS) lines.push(entry(cap(s), SIGN[s]));
  lines.push("", "Houses (where it plays out, whole-sign):");
  for (let h = 1; h <= 12; h++) lines.push(entry(ordinal(h), HOUSE[h]));
  lines.push("", "Aspects (how two functions relate):");
  for (const a of ASPECTS) {
    const e = ASPECT[a];
    lines.push(`- ${cap(a)}: ${e.dynamic} Working: ${e.inFlow} Under pressure: ${e.underStress} Growth: ${e.growth}`);
  }
  lines.push("", "Structure:");
  for (const [k, e] of Object.entries(STRUCTURE)) {
    lines.push(entry(k, e));
    if (k !== "retrograde") continue;
    for (const b of BODIES) if (RETROGRADE_BY_BODY[b]) lines.push(`  - ${BODY_LABELS[b]}: ${RETROGRADE_BY_BODY[b]}`);
  }
  return lines.join("\n");
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
