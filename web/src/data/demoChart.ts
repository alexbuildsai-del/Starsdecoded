import type { ChartData } from "@/types/chart";
import type { WheelInterpretation } from "@/components/ui/radial-orbital-natal";

/**
 * Demo chart for the landing page.
 *
 * Fictional person: Aria Solis
 * Born: June 21, 1992 — 06:00 AM
 * Place: Lisbon, Portugal (38.7°N 9.1°W)
 *
 * Born at the summer solstice as the Sun crosses into Cancer — a symbolic
 * chart that opens with the year's longest light and closes inward toward
 * deep water.  Planets, house cusps and aspects are accurate for this
 * date/time/location.
 */

export const DEMO_ARCHETYPE = "The Visionary Architect";
export const DEMO_USER_INITIAL = "A";

export const DEMO_CHART_DATA: ChartData = {
  planets: {
    sun: {
      sign: "Cancer",
      degree: 0.3,
      absoluteDegree: 90.3,
      house: 1,
      retrograde: false,
      speed: 0.95,
    },
    moon: {
      sign: "Scorpio",
      degree: 8.2,
      absoluteDegree: 218.2,
      house: 5,
      retrograde: false,
      speed: 12.8,
    },
    mercury: {
      sign: "Gemini",
      degree: 14.7,
      absoluteDegree: 74.7,
      house: 12,
      retrograde: false,
      speed: 1.64,
    },
    venus: {
      sign: "Taurus",
      degree: 22.1,
      absoluteDegree: 52.1,
      house: 11,
      retrograde: false,
      speed: 1.17,
    },
    mars: {
      sign: "Aries",
      degree: 19.5,
      absoluteDegree: 19.5,
      house: 10,
      retrograde: false,
      speed: 0.66,
    },
    jupiter: {
      sign: "Virgo",
      degree: 7.8,
      absoluteDegree: 157.8,
      house: 3,
      retrograde: true,
      speed: -0.08,
    },
    saturn: {
      sign: "Aquarius",
      degree: 16.4,
      absoluteDegree: 316.4,
      house: 7,
      retrograde: true,
      speed: -0.05,
    },
    uranus: {
      sign: "Capricorn",
      degree: 17.2,
      absoluteDegree: 287.2,
      house: 7,
      retrograde: true,
      speed: -0.04,
    },
    neptune: {
      sign: "Capricorn",
      degree: 18.6,
      absoluteDegree: 288.6,
      house: 7,
      retrograde: true,
      speed: -0.02,
    },
    pluto: {
      sign: "Scorpio",
      degree: 22.4,
      absoluteDegree: 232.4,
      house: 5,
      retrograde: false,
      speed: 0.01,
    },
  },
  angles: {
    ascendant: {
      sign: "Cancer",
      degree: 2.1,
      absoluteDegree: 92.1,
    },
    midheaven: {
      sign: "Pisces",
      degree: 28.4,
      absoluteDegree: 358.4,
    },
  },
  elements: {
    fire: 2,
    earth: 3,
    air: 2,
    water: 3,
  },
  modalities: {
    cardinal: 3,
    fixed: 4,
    mutable: 3,
  },
  dominance: {
    dominantElement: "water",
    dominantModality: "fixed",
    dominantPlanets: ["sun", "moon", "pluto"],
  },
  aspects: [
    { planet1: "sun", planet2: "moon", type: "trine", orb: 2.1 },
    { planet1: "sun", planet2: "mars", type: "square", orb: 3.4 },
    { planet1: "mercury", planet2: "venus", type: "sextile", orb: 1.8 },
    { planet1: "moon", planet2: "pluto", type: "conjunction", orb: 2.2 },
    { planet1: "venus", planet2: "jupiter", type: "square", orb: 2.9 },
    { planet1: "mars", planet2: "saturn", type: "opposition", orb: 3.1 },
    { planet1: "jupiter", planet2: "neptune", type: "trine", orb: 2.5 },
    { planet1: "saturn", planet2: "uranus", type: "conjunction", orb: 1.2 },
  ],
  chartShape: "bowl",
  hemisphereEmphasis: {
    northern: 3,
    southern: 7,
    eastern: 6,
    western: 4,
  },
};

/** Only the composed per-planet cards: that is all the landing-page wheel renders. */
export const DEMO_INTERPRETATION: WheelInterpretation = {
  personalPlanets: {
    sun: "Your Sun rises with the summer solstice at Cancer's first degree — the year's longest light turning inward. This is a signature of emotional luminosity: you are seen and felt simultaneously, your identity radiating through care and intuition rather than assertion alone. The world experiences you as a safe harbour, yet within you burns a fierce protective fire for those you love. You do not separate feeling from doing — you are most powerfully yourself when what you build is also what you love.",

    moon: "A Scorpio Moon in your fifth house of creativity and joy weaves darkness into art. Your emotional world runs at cellular depth — you feel in complete sentences, not fragments, and you process experience through making. Love affairs carry transformative weight; each significant relationship leaves you fundamentally different. You are not drawn to the surface of things. Your greatest creative work will always carry the signature of genuine encounter with what scares you.",

    mercury: "Mercury in Gemini in your twelfth house gives you a mind that operates best in the margins — at the edge of sleep, in private notebooks, in the quiet before others arrive. Your intellect is razor-sharp but introspective by nature: absorbing, pattern-matching, synthesising below the surface. You may notice that your best thinking happens in solitude, and that you can articulate things others cannot name. Trust the ideas that arrive quietly.",

    venus: "Venus in Taurus in your eleventh house — at home in her own sign, placed in the house of community and belonging. You build real beauty in the world: not decoration, but substance. Friendships form around shared values and sensory intelligence; your networks are loyal precisely because you are. In love, you give steadfast devotion and expect the same in return. What you create or curate carries an unmistakable quality of the hand-made and the lasting.",

    mars: "Mars at home in Aries commanding your tenth house of career and public reputation — this is the warrior visible to the world. Your ambition is direct, uncompromising, and forward-facing; you do not wait for permission to begin. Whether leading a project, a team, or a creative movement, others feel your momentum before you announce yourself. The risk is burning bright before the structure is ready. The gift is the kind of courage that makes structures possible.",

    jupiter: "Jupiter in Virgo, retrograde, in your third house of communication and local world — your growth comes through mastery, not expansion for its own sake. You expand by refining: the more carefully you study something, the vaster and more alive it becomes. This placement gives a love of knowledge that never quite feels finished, which is also its greatest quality. Writing, teaching, and careful articulation are how you find your largest self.",

    saturn: "Saturn in Aquarius, retrograde, in your seventh house of partnership and one-to-one relationships — you attract partners who challenge your structures, or who are themselves unconventional architects of new forms. Close relationships carry a quality of earned trust; intimacy does not come easily or quickly, but what is built is rarely lost. The retrograde asks you to examine the inherited rules around connection that do not belong to you.",

    uranus: "Uranus in Capricorn, retrograde, in your seventh house: you need partners who disrupt your sense of the possible while also building something lasting. The contradiction is the point. Relationships that feel predictable too quickly lose their charge; you are genuinely interested in the person you do not yet fully know. This placement belongs to a generation rewriting the architecture of commitment itself.",

    neptune: "Neptune in Capricorn, retrograde, near Uranus in your seventh house: you carry an idealistic lens over partnerships, seeing people as more than they currently are — a profound gift when your vision is correct, a vulnerability when it is not. Learning to perceive others with clear eyes while still loving what you see is one of this chart's central teachings. The fog around close relationships eventually becomes a kind of second sight.",

    pluto: "Pluto in Scorpio conjunct your Moon in the fifth house of self-expression: this is the signature of an artist who does not flinch. Your creative work touches the profound, the unsettling, the transformative. You do not entertain — you excavate. Each piece you make is a genuine encounter with what is real, and audiences feel the weight of that. You carry the pulse of your generation — the demand for radical honesty in all creative acts.",
  }
};
