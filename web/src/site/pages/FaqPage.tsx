import { useState } from "react";
import { Search } from "lucide-react";
import { Link } from "wouter";
import { PERSONAL_REPORT } from "@/lib/product";
import { FAQ_GROUPS, FAQ_LINK_LABELS } from "../data/faq";
import { PageHead, SiteLayout } from "../SiteLayout";
import { isPublicPath, pageFor } from "../site";

const page = pageFor("/faq");

const NO_MATCH = "No question matches that. Try a shorter word.";

/** Accents and apostrophes dropped, so "dont" finds "don't". */
function fold(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const slug = (text: string) => fold(text).replace(/ /g, "-");

// Folded once here, not on each keystroke. The topic and the link's words are searchable too, so "privacy" finds the
// privacy questions. Ids come from the words, so a link to one answer lasts as long as its question does.
const GROUPS = FAQ_GROUPS.map((group) => ({
  id: `fg-${slug(group.topic)}`,
  topic: group.topic,
  entries: group.items.map((item) => {
    const more = item.link ? FAQ_LINK_LABELS[item.link] : undefined;
    return { id: `q-${slug(item.q)}`, item, more, text: fold(`${group.topic} ${item.q} ${item.a} ${more ?? ""}`) };
  }),
}));

/** All the words, in any order, so each word typed narrows the list instead of widening it. */
function matching(query: string) {
  const words = fold(query).split(" ").filter(Boolean);
  return GROUPS.map((group) => ({
    ...group,
    entries: group.entries.filter((entry) => words.every((word) => entry.text.includes(word))),
  })).filter((group) => group.entries.length > 0);
}

// Under the artifact's 1000 px a 200 px column beside the questions would squeeze them, so the index becomes chips above.
const TOPIC_LINK =
  "block rounded-full border border-[color:var(--line)] px-3 py-2.5 text-[13px] leading-tight text-[color:var(--paper-dim)] no-underline hover:border-[rgba(159,168,218,.6)] hover:text-[color:var(--paper)] " +
  "min-[1000px]:rounded-lg min-[1000px]:border-0 min-[1000px]:px-2.5 min-[1000px]:py-[7px] min-[1000px]:text-[14px] min-[1000px]:leading-normal min-[1000px]:text-[color:var(--sd-muted)] min-[1000px]:hover:bg-[rgba(232,235,242,.04)]";

export default function FaqPage() {
  const [query, setQuery] = useState("");
  const groups = matching(query);
  const count = groups.reduce((sum, group) => sum + group.entries.length, 0);
  const searching = query.trim() !== "";

  return (
    <SiteLayout
      page={page}
      head={
        <PageHead page={page}>
          <form role="search" className="relative mt-1.5 w-full max-w-[520px]" onSubmit={(event) => event.preventDefault()}>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[color:var(--sd-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the questions"
              aria-label="Search the questions"
              autoComplete="off"
              enterKeyHint="search"
              className="h-12 w-full appearance-none rounded-[10px] border border-[color:var(--line)] bg-[rgba(13,17,23,.7)] pl-10 pr-3.5 text-base text-[color:var(--paper)] placeholder:text-[color:var(--sd-muted)] focus:border-[color:var(--indigo-lt)] focus:outline-none focus:ring-1 focus:ring-[color:var(--indigo-lt)]"
            />
          </form>
        </PageHead>
      }
      end={
        <div className="sd-rel">
          {isPublicPath("/sample") && (
            <Link className="sd-relcard" href="/sample">
              <span className="sd-eyebrow">Sample report</span>
              <b>Read a sample report</b>
              <span>Chapters from a real {PERSONAL_REPORT}, word for word</span>
            </Link>
          )}
          <Link className="sd-relcard" href="/method">
            <span className="sd-eyebrow">How it works</span>
            <b>How we make your report</b>
            <span>Each step, from working out your chart to the final check</span>
          </Link>
          <Link className="sd-relcard" href="/sky">
            <span className="sd-eyebrow">Free birth chart</span>
            <b>See your own chart</b>
            <span>Put in your birth details, no account needed</span>
          </Link>
        </div>
      }
    >
      {/* Every answer is in the prerendered HTML: the query starts empty, so the server and the first client render show every question. */}
      <section className="sd-pg-sec sd-sec-a sd-line">
        <div className="sd-wrap grid gap-7 min-[1000px]:grid-cols-[200px_minmax(0,1fr)] min-[1000px]:items-start min-[1000px]:gap-14">
          {groups.length > 0 && (
            <nav aria-label="Topics" className="min-[1000px]:sticky min-[1000px]:top-[calc(var(--nav)_+_24px)]">
              <ul className="flex flex-wrap gap-1.5 min-[1000px]:grid min-[1000px]:gap-0.5">
                {groups.map((group) => (
                  <li key={group.id}>
                    <a href={`#${group.id}`} className={TOPIC_LINK}>
                      {group.topic}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <div className="min-w-0 min-[1000px]:col-start-2">
            <div role="status">
              {searching &&
                (count === 0 ? (
                  <p className="text-[color:var(--sd-muted)]">{NO_MATCH}</p>
                ) : (
                  <p className="sr-only">{count === 1 ? "1 question matches" : `${count} questions match`}</p>
                ))}
            </div>
            <div className="grid max-w-[760px] gap-10 min-[760px]:gap-14">
              {groups.map((group) => (
                <section key={group.id} id={group.id} aria-labelledby={`${group.id}-h`} className="grid gap-1">
                  <h2 id={`${group.id}-h`} className="sd-eyebrow mb-2.5">
                    {group.topic}
                  </h2>
                  {group.entries.map(({ id, item, more }) => (
                    <div key={id} id={id} className="grid gap-2 border-t border-[color:var(--line-soft)] py-[18px]">
                      <h3 className="text-[22px] leading-[1.25]">{item.q}</h3>
                      <p className="max-w-[64ch] text-base leading-[1.7] text-[color:var(--paper-dim)]">{item.a}</p>
                      {item.link && more ? (
                        <Link className="sd-more mt-0 justify-self-start py-2" href={item.link}>
                          {more}
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
