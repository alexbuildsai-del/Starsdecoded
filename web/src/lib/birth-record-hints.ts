/**
 * Where a birth time is written down, by the country the geocoder returned.
 * A line is shown only once it has been verified against the official
 * source; an unverified country falls back to the general line. Verified
 * 2026-09-19 against the sources named in each entry.
 */
export interface RecordHint {
  text: string;
  verified: boolean;
  source?: string;
}

export const ELSEWHERE: RecordHint = {
  text: "Ask a parent, or the hospital where you were born: the time is usually in their records even when the certificate leaves it out.",
  verified: true,
};

const HINTS: Record<string, RecordHint> = {
  France: {
    text: "The copie intégrale de l'acte de naissance gives the hour and minute. It is free from service-public.fr or your birth mairie.",
    verified: true,
    source: "service-public.fr, demande d'acte de naissance",
  },
  Belgium: {
    text: "Your birth certificate (akte van geboorte / acte de naissance) records the hour. Request it from the commune or through Mon Dossier.",
    verified: true,
    source: "belgium.be, akte van geboorte",
  },
  Netherlands: {
    text: "An afschrift of your geboorteakte from the gemeente where you were born records the hour and minute.",
    verified: true,
    source: "rijksoverheid.nl, afschrift geboorteakte",
  },
  Germany: {
    text: "Ask the Standesamt of your birth town for a beglaubigter Registerausdruck of the birth entry, not the Geburtsurkunde: only the register entry carries the time.",
    verified: true,
    source: "Personenstandsgesetz §21, the register entry records the time",
  },
  Spain: {
    text: "The certificación literal de nacimiento from the Registro Civil records the hour. It is free online through the Sede Electrónica del Ministerio de Justicia.",
    verified: true,
    source: "sede.mjusticia.gob.es, certificado de nacimiento literal",
  },
  Italy: {
    text: "The estratto dell'atto di nascita from the Comune where you were born records the hour and minute.",
    verified: true,
    source: "Comune anagrafe, estratto per riassunto dell'atto di nascita",
  },
  Switzerland: {
    text: "The Geburtsurkunde / acte de naissance from the Zivilstandsamt of your birth place records the time.",
    verified: true,
    source: "Zivilstandsverordnung, the birth record carries the time",
  },
  "United Kingdom": {
    text: "In Scotland the birth certificate records the time. In England and Wales it does only for twins and multiple births; otherwise ask a parent or the hospital.",
    verified: true,
    source: "GRO England and Wales; National Records of Scotland",
  },
  "United States": {
    text: "The long-form birth certificate from your state's vital records office records the time; the short form usually does not.",
    verified: true,
    source: "state vital records offices, long-form certificate",
  },
  Canada: {
    text: "The long-form birth certificate (registration of birth) from your province records the time; the short form does not.",
    verified: true,
    source: "provincial vital statistics, long-form certificate",
  },
  Poland: {
    text: "The odpis zupełny aktu urodzenia from the Urząd Stanu Cywilnego records the hour and minute.",
    verified: true,
    source: "USC, odpis zupełny aktu urodzenia",
  },
};

const ALIASES: Record<string, string> = {
  UK: "United Kingdom", "Great Britain": "United Kingdom", England: "United Kingdom", Scotland: "United Kingdom", Wales: "United Kingdom",
  USA: "United States", "United States of America": "United States", US: "United States",
  Deutschland: "Germany", España: "Spain", Italia: "Italy", Schweiz: "Switzerland", Suisse: "Switzerland", Nederland: "Netherlands",
  België: "Belgium", Belgique: "Belgium", Polska: "Poland",
};

export function hintFor(country: string | undefined | null): RecordHint {
  if (!country) return ELSEWHERE;
  const key = ALIASES[country.trim()] ?? country.trim();
  const hint = HINTS[key];
  return hint && hint.verified ? hint : ELSEWHERE;
}
