/**
 * /checkout (stripe-payments, Checkout; ADR-274), drawn at 390 px first: the item and its price, our tick, Stripe's
 * Express Checkout and Payment Element in our look, then Pay with the amount. POST /checkout refuses without the tick
 * and Stripe's fields need the session it makes, so the fields open under the box once it is ticked, and Pay follows
 * them. Stripe.js loads on this route alone: it is lazy, and the pure loader adds Stripe's script only when asked.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useUser } from "@clerk/react";
import { loadStripe } from "@stripe/stripe-js/pure";
import type {
  Appearance,
  AvailablePaymentMethods,
  CustomFontSource,
  Stripe,
  StripeCheckoutExpressCheckoutElementOptions,
  StripeCheckoutLoadActionsResult,
  StripeCheckoutPaymentElementOptions,
  StripeExpressCheckoutElementConfirmEvent,
} from "@stripe/stripe-js";
import { getCheckout, useCreateCheckout, type CheckoutStarted } from "@workspace/api-client-react";
import type { CatalogueItemId } from "@workspace/commerce";
import { StatusDots } from "@/components/StatusDots";
import { Wordmark } from "@/components/Wordmark";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import {
  CHECKOUT_LINES,
  backLabel,
  campaignLine,
  checkoutChoices,
  checkoutHref,
  checkoutItem,
  checkoutQuery,
  doneHref,
  isPlanId,
  payLabel,
  replacedCheckout,
  startRefusal,
  startRetries,
  stepName,
  type CheckoutItemView,
} from "@/lib/checkout-view";
import { usePageTitle } from "@/lib/page-title";
import { campaignSlug, pricedItems, useCheckoutOptions } from "@/lib/prices";
import { refusalLine } from "@/lib/refusals";
import { cn } from "@/lib/utils";

// The tokens' own values (§9): Stripe draws its fields in a frame of its own, where our stylesheet cannot reach.
const TOKEN = {
  void: "#06080C",
  surface: "#11161F",
  line: "#242C3B",
  paper: "#E8EBF2",
  muted: "#9AA3B5",
  placeholder: "#6E7789",
  indigo: "#5C6BC0",
  ok: "#6FBF8E",
  warn: "#D99A5B",
  danger: "#E14747",
} as const;

const APPEARANCE: Appearance = {
  theme: "night",
  labels: "above",
  variables: {
    fontFamily: "Inter, system-ui, sans-serif",
    // A phone zooms into any field under 16 px.
    fontSizeBase: "16px",
    colorPrimary: TOKEN.indigo,
    colorBackground: TOKEN.void,
    colorText: TOKEN.paper,
    colorTextSecondary: TOKEN.muted,
    colorTextPlaceholder: TOKEN.placeholder,
    colorDanger: TOKEN.danger,
    colorSuccess: TOKEN.ok,
    colorWarning: TOKEN.warn,
    iconColor: TOKEN.muted,
    borderRadius: "10px",
    focusBoxShadow: `0 0 0 2px ${TOKEN.indigo}`,
    focusOutline: "none",
  },
  rules: {
    ".Input": { border: `1px solid ${TOKEN.line}`, backgroundColor: TOKEN.void, boxShadow: "none" },
    ".Input:focus": { borderColor: TOKEN.indigo },
    ".Input--invalid": { borderColor: TOKEN.danger, boxShadow: "none" },
    ".Label": { color: TOKEN.muted, fontSize: "13px", fontWeight: "500" },
    ".Tab": { border: `1px solid ${TOKEN.line}`, backgroundColor: TOKEN.surface, boxShadow: "none" },
    ".Tab:hover": { borderColor: TOKEN.muted },
    ".Tab--selected": { borderColor: TOKEN.indigo },
    ".Error": { fontSize: "13px" },
  },
};

// fonts.css's two subsets of Inter, so Stripe's frame fetches the second only for a letter in it.
const LATIN =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const LATIN_EXT =
  "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";

/**
 * Inter from our own origin (ADR-145): Stripe's frame takes a font only from an https address that answers CORS, which
 * vercel.json gives /fonts. A local build keeps Stripe's own face in the fields.
 */
function interFonts(): CustomFontSource[] {
  if (window.location.protocol !== "https:") return [];
  const at = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/fonts`;
  return [
    { family: "Inter", src: `url(${at}/inter-latin-ext-wght-normal.woff2)`, weight: "400 700", display: "swap", unicodeRange: LATIN_EXT },
    { family: "Inter", src: `url(${at}/inter-latin-wght-normal.woff2)`, weight: "400 700", display: "swap", unicodeRange: LATIN },
  ];
}

// ADR-346: Link is off here as on the session, so no button or box of Link's asks for a phone number before Pay.
const EXPRESS: StripeCheckoutExpressCheckoutElementOptions = {
  buttonHeight: 44,
  buttonTheme: { applePay: "black", googlePay: "black" },
  buttonType: undefined,
  layout: { maxColumns: 2, maxRows: 1, overflow: "auto" },
  paymentMethodOrder: ["apple_pay", "google_pay"],
  paymentMethods: { applePay: "auto", googlePay: "auto", link: "never", amazonPay: "never", paypal: "never", klarna: "never" },
};

// The wallets have their buttons above, so the card form doesn't offer them twice.
const PAYMENT: StripeCheckoutPaymentElementOptions = { wallets: { applePay: "never", googlePay: "never", link: "never" } };

const stripes = new Map<string, Promise<Stripe | null>>();

/** One Stripe per key for the tab; a load that failed is asked for again next time. */
function stripeFor(key: string): Promise<Stripe | null> {
  const known = stripes.get(key);
  if (known) return known;
  const loading = loadStripe(key, { locale: "en-GB" });
  stripes.set(key, loading);
  loading.catch(() => stripes.delete(key));
  return loading;
}

function hasWallet(methods: AvailablePaymentMethods | undefined): boolean {
  return Boolean(methods && (methods.applePay || methods.googlePay));
}

interface StartError {
  line: string;
  retry: boolean;
}

/** The API's own line for a refusal (refusals.ts); the page's words only when none came, as from a dropped call. */
function refusalOf(error: { status?: number; data?: unknown }): StartError {
  const body = error.data && typeof error.data === "object" ? (error.data as { error?: unknown; message?: unknown }) : null;
  const code = typeof body?.error === "string" ? body.error : undefined;
  const given = typeof body?.message === "string" && body.message.trim() ? body.message : null;
  return {
    line: refusalLine(error) ?? given ?? startRefusal(error.status, code),
    retry: startRetries(error.status, code),
  };
}

const EYEBROW = "font-label text-[11px] font-medium uppercase leading-none tracking-[.14em] text-[#9AA3B5]";
const MUTED = "text-[13px] leading-snug text-[#9AA3B5]";
const LINK =
  "rounded text-[#9FA8DA] underline underline-offset-2 hover:text-[#E8EBF2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
// The report's tick box (Checklist), in the control's indigo: one look for a box the reader ticks (§9).
const TICK_BOX =
  "peer m-0 h-5 w-5 cursor-pointer appearance-none rounded-[6px] border-[1.5px] border-[#6E7789] bg-transparent transition-colors hover:border-[#AEB6C6] checked:border-[#5C6BC0] checked:bg-[#5C6BC0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9FA8DA] disabled:cursor-default disabled:opacity-50";

function NewTab() {
  return <span className="sr-only"> {CHECKOUT_LINES.newTab}</span>;
}

/** The price a reader pays, read first; while a campaign runs the full price is drawn before it, struck (reading 6). */
function Price({ view }: { view: CheckoutItemView }) {
  return (
    <span className="flex shrink-0 items-baseline gap-2 font-numeric text-base leading-none text-[#E8EBF2]">
      <span>{view.price}</span>
      {view.full && (
        <s className="order-first text-[13px] text-[#7E889A]">
          <span className="sr-only">instead of </span>
          {view.full}
        </s>
      )}
    </span>
  );
}

function CampaignLine({ view }: { view: CheckoutItemView }) {
  const { order } = useEntryFormat();
  return view.campaign ? (
    <span className="block text-[13px] leading-snug text-[#AEB6C6]">{campaignLine(view.campaign, order)}</span>
  ) : null;
}

function BackLine({ returnTo }: { returnTo: string }) {
  return (
    <p className={MUTED}>
      VAT included · then back to <span className="text-[#E8EBF2]">{stepName(returnTo)}</span>
    </p>
  );
}

type Fields = "idle" | "loading" | "ready" | "failed";

interface Session {
  item: CatalogueItemId;
  started: CheckoutStarted;
  /** When it reached the page, so a session past Stripe's day is never read as replaced. */
  at: number;
}

/** Whether a newer plan checkout closed this session, as the server has its purchase (ADR-359). */
async function wasReplaced(session: Session): Promise<boolean> {
  if (!isPlanId(session.item)) return false;
  const state = await getCheckout(session.started.purchaseId).catch(() => null);
  return replacedCheckout(session.item, state, Date.now() - session.at);
}

export default function CheckoutPage() {
  usePageTitle("Checkout");
  const search = useSearch();
  const [location, navigate] = useLocation();
  const { user } = useUser();
  const tickId = useId();
  const radios = useId();
  const itemId = useId();

  const { item: asked, returnTo } = useMemo(() => checkoutQuery(search), [search]);
  const choices = useMemo(() => checkoutChoices(asked), [asked]);
  const [picked, setPicked] = useState<CatalogueItemId | null>(null);
  const selected = picked !== null && choices.ids.includes(picked) ? picked : choices.first;

  const options = useCheckoutOptions();
  const { refetch } = options;
  const items = pricedItems(options.data);
  const views = choices.ids.map((id) => checkoutItem(id, items?.find((one) => one.id === id)));
  const view = views.find((one) => one.id === selected) ?? views[0];
  const publishableKey = options.data?.publishableKey ?? null;
  const open = options.data?.ready === true && publishableKey !== null;
  const closed = options.isSuccess && !open;

  const [ticked, setTicked] = useState(false);
  const { mutate: start, isPending: starting } = useCreateCheckout();
  const [session, setSession] = useState<Session | null>(null);
  const [startError, setStartError] = useState<StartError | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [replaced, setReplaced] = useState(false);

  // Read by Stripe's callbacks and by a session that lands late, which must see the page as it is by then.
  const latest = useRef({ selected, ticked });
  useLayoutEffect(() => {
    latest.current = { selected, ticked };
  });

  const choose = (id: CatalogueItemId) => {
    setPicked(id);
    setStartError(null);
    setPayError(null);
  };

  // A session is for one item; another item, picked here or in the address, waits for its own.
  const here = session?.item === selected ? session : null;

  useEffect(() => {
    if (!ticked || !open || starting || startError || here) return;
    const item = selected;
    const expected = view.cents;
    const campaign = campaignSlug();
    start(
      { data: { item, ticked: true, returnTo, ...(campaign ? { campaign } : {}) } },
      {
        onSuccess: (started) => {
          // A session made for an item the reader has since changed is left to expire on its own.
          if (latest.current.selected !== item) return;
          setSession({ item, started, at: Date.now() });
          // The session's amount is the server's word on this request, so a price that moved since the page loaded is read again.
          if (started.amountCents !== expected) void refetch();
        },
        onError: (error) => {
          if (error.status === 401) {
            navigate(`/sign-in?return_to=${encodeURIComponent(`${location}${search ? `?${search}` : ""}`)}`, { replace: true });
            return;
          }
          setStartError(refusalOf(error));
        },
      },
    );
  }, [ticked, open, starting, startError, here, selected, view.cents, returnTo, start, refetch, navigate, location, search]);

  const expressBox = useRef<HTMLDivElement>(null);
  const paymentBox = useRef<HTMLDivElement>(null);
  const actions = useRef<Promise<StripeCheckoutLoadActionsResult> | null>(null);
  const [fields, setFields] = useState<Fields>("idle");
  const [wallets, setWallets] = useState<boolean | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const clientSecret = here?.started.clientSecret ?? null;
  const payNow = useRef<(express?: StripeExpressCheckoutElementConfirmEvent) => void>(() => {});

  useEffect(() => {
    if (!clientSecret || !publishableKey) return;
    let gone = false;
    const mounted: Array<{ destroy: () => void }> = [];
    setFields("loading");
    setWallets(null);
    stripeFor(publishableKey)
      .then((stripe) => {
        if (gone) return;
        if (!stripe || !expressBox.current || !paymentBox.current) throw new Error("Stripe.js is not available");
        const sdk = stripe.initCheckoutElementsSdk({
          clientSecret,
          elementsOptions: { appearance: APPEARANCE, fonts: interFonts(), loader: "auto" },
        });
        sdk.on("change", (state) => setSessionEmail(state.email));
        actions.current = sdk.loadActions();
        const express = sdk.createExpressCheckoutElement(EXPRESS);
        express.on("ready", ({ availablePaymentMethods }) => setWallets(hasWallet(availablePaymentMethods)));
        express.on("confirm", (event) => payNow.current(event));
        express.mount(expressBox.current);
        const payment = sdk.createPaymentElement(PAYMENT);
        payment.on("ready", () => {
          if (!gone) setFields("ready");
        });
        payment.on("loaderror", () => {
          if (!gone) setFields("failed");
        });
        payment.mount(paymentBox.current);
        mounted.push(express, payment);
      })
      .catch(() => {
        if (!gone) setFields("failed");
      });
    return () => {
      gone = true;
      actions.current = null;
      for (const element of mounted) element.destroy();
    };
  }, [clientSecret, publishableKey]);

  const errorLine = useRef<HTMLParagraphElement>(null);
  const newerCheckout = useRef<HTMLAnchorElement>(null);
  const payingNow = useRef(false);
  const accountEmail = user?.primaryEmailAddress?.emailAddress ?? null;

  // R14-12: a refusal takes focus to its line, which says what to do next.
  const fail = (line: string) => {
    payingNow.current = false;
    setPaying(false);
    setPayError(line);
    requestAnimationFrame(() => errorLine.current?.focus());
  };

  // R14-12: a checkout a newer one replaced can't be paid, so focus goes to the way on, not to Pay.
  const failOrReplaced = async (session: Session, line: string) => {
    if (!(await wasReplaced(session))) return fail(line);
    payingNow.current = false;
    setPaying(false);
    setReplaced(true);
    requestAnimationFrame(() => newerCheckout.current?.focus());
  };

  useLayoutEffect(() => {
    payNow.current = (express) => {
      const pending = actions.current;
      if (!here || !pending || payingNow.current || !latest.current.ticked) {
        express?.paymentFailed({ reason: "fail" });
        return;
      }
      payingNow.current = true;
      setPaying(true);
      setPayError(null);
      void (async () => {
        try {
          const loaded = await pending;
          if (loaded.type === "error") {
            express?.paymentFailed({ reason: "fail" });
            return await failOrReplaced(here, loaded.error.message || CHECKOUT_LINES.payFailed);
          }
          const result = await loaded.actions.confirm({
            redirect: "if_required",
            ...(express ? { expressCheckoutConfirmEvent: express } : {}),
            // The session's Customer carries the account's email; this covers a session that came without it.
            ...(!sessionEmail && accountEmail ? { email: accountEmail } : {}),
          });
          if (result.type === "error") return await failOrReplaced(here, result.error.message || CHECKOUT_LINES.payFailed);
          // In place of this page: Back from the step that asked never reopens a paid checkout.
          navigate(doneHref(here.started.purchaseId), { replace: true });
        } catch {
          await failOrReplaced(here, CHECKOUT_LINES.payFailed);
        }
      })();
    };
  });

  // A refusal of the session itself takes focus to its line too, so the reader hears why the fields didn't open.
  useEffect(() => {
    if (startError) requestAnimationFrame(() => errorLine.current?.focus());
  }, [startError]);

  const onTick = (on: boolean) => {
    setTicked(on);
    setPayError(null);
    if (on) setStartError(null);
  };

  const amountCents = here ? here.started.amountCents : view.cents;
  const canPay = ticked && here !== null && fields === "ready" && !paying && !replaced;
  const waiting = ticked && !here && !startError && (starting || options.isPending);
  const lineNow = payError ?? startError?.line ?? null;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <main className="mx-auto grid w-full max-w-[440px] gap-4 px-4 pb-12 pt-5 sm:pt-10">
        <header className="flex items-center justify-between gap-3">
          <Wordmark className="text-[17px]" />
          <h1 className={EYEBROW}>{CHECKOUT_LINES.title}</h1>
        </header>

        {views.length === 1 ? (
          <section aria-labelledby={itemId} className="grid gap-1.5 rounded-[10px] border border-[#242C3B] bg-[#11161F] p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={itemId} className="font-display text-base font-normal leading-tight text-[#E8EBF2]">
                {view.name}
              </h2>
              <Price view={view} />
            </div>
            <p className={MUTED}>{view.line}</p>
            <CampaignLine view={view} />
            <BackLine returnTo={returnTo} />
          </section>
        ) : (
          <fieldset className="grid gap-2" disabled={paying || replaced}>
            <legend className="sr-only">{view.plan ? CHECKOUT_LINES.choosePlan : CHECKOUT_LINES.chooseBundle}</legend>
            {views.map((one) => (
              <label
                key={one.id}
                className={cn(
                  "grid cursor-pointer gap-1.5 rounded-[10px] border bg-[#11161F] p-4 transition-colors",
                  one.id === selected ? "border-[#5C6BC0]" : "border-[#242C3B] hover:border-[#6E7789]",
                )}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name={radios}
                    value={one.id}
                    checked={one.id === selected}
                    onChange={() => choose(one.id)}
                    className="h-4 w-4 shrink-0 accent-[#5C6BC0]"
                  />
                  <span className="font-display text-base leading-tight text-[#E8EBF2]">{one.name}</span>
                  <span className="ml-auto">
                    <Price view={one} />
                  </span>
                </span>
                <span className={cn(MUTED, "pl-7")}>{one.line}</span>
                {one.campaign && (
                  <span className="pl-7">
                    <CampaignLine view={one} />
                  </span>
                )}
              </label>
            ))}
            <BackLine returnTo={returnTo} />
          </fieldset>
        )}

        <div className="grid grid-cols-[20px_minmax(0,1fr)] items-start gap-x-3">
          {/* The box's label is its 40 px hit area on a phone; the words beside it are a second label for it. */}
          <label className="relative -m-2.5 grid h-10 w-10 cursor-pointer place-items-center">
            <input
              id={tickId}
              type="checkbox"
              required
              checked={ticked}
              disabled={paying || closed}
              onChange={(e) => onTick(e.target.checked)}
              className={TICK_BOX}
            />
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="pointer-events-none absolute h-[13px] w-[13px] opacity-0 transition-opacity duration-200 peer-checked:opacity-100"
              fill="none"
              stroke="#06080C"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12l5 5 9-10" />
            </svg>
          </label>
          <p className="text-[13.5px] leading-[1.5] text-[#AEB6C6]">
            <label htmlFor={tickId} className="cursor-pointer">
              {view.tick}
            </label>{" "}
            <a href="/terms" target="_blank" rel="noopener" className={LINK}>
              {CHECKOUT_LINES.terms}
              <NewTab />
            </a>
          </p>
        </div>

        {options.isError ? (
          <p role="alert" className={MUTED}>
            {CHECKOUT_LINES.optionsFailed}{" "}
            <button type="button" onClick={() => void refetch()} className={LINK}>
              {CHECKOUT_LINES.tryAgain}
            </button>
          </p>
        ) : closed ? (
          <p role="status" className={MUTED}>
            {CHECKOUT_LINES.notReady}
          </p>
        ) : waiting ? (
          <p className={MUTED}>
            <StatusDots label={CHECKOUT_LINES.loading} />
          </p>
        ) : !ticked && !here ? (
          <p className={MUTED}>{CHECKOUT_LINES.tickFirst}</p>
        ) : null}

        {here && (
          <div role="group" aria-label={CHECKOUT_LINES.waysToPay} className="grid gap-3">
            {fields === "loading" && (
              <p className={MUTED}>
                <StatusDots label={CHECKOUT_LINES.loading} />
              </p>
            )}
            {fields === "failed" && (
              <p role="alert" className={MUTED}>
                {CHECKOUT_LINES.stripeFailed}{" "}
                <button type="button" onClick={() => window.location.reload()} className={LINK}>
                  {CHECKOUT_LINES.tryAgain}
                </button>
              </p>
            )}
            {/* Unticked or replaced, the wallets go with Pay: a wallet's own sheet would otherwise pay without the box. */}
            <div ref={expressBox} className={cn((!ticked || wallets === false || replaced) && "hidden")} />
            {ticked && wallets === true && fields === "ready" && !replaced && (
              <p className="flex items-center gap-3 text-xs text-[#9AA3B5]">
                <span aria-hidden className="h-px flex-1 bg-[#242C3B]" />
                {CHECKOUT_LINES.orAnotherWay}
                <span aria-hidden className="h-px flex-1 bg-[#242C3B]" />
              </p>
            )}
            <div ref={paymentBox} />
          </div>
        )}

        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => payNow.current()}
            disabled={!canPay}
            className={cn(
              "inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-primary text-[13.5px] font-semibold text-white",
              "transition duration-200 hover:brightness-110 active:scale-[.99] motion-reduce:transition-none motion-reduce:active:scale-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100",
            )}
          >
            {paying ? <StatusDots label={CHECKOUT_LINES.paying} /> : payLabel(amountCents)}
          </button>
          {/* MB-225 decided, ADR-361: the plan renews, said as plain text under Pay beside its box. */}
          {view.renewal && <p className={MUTED}>{view.renewal}</p>}
          <p ref={errorLine} tabIndex={-1} role="alert" className="text-[13.5px] leading-snug text-[#E8EBF2] empty:hidden focus:outline-none">
            {lineNow}
          </p>
          {replaced && here && (
            <p role="alert" className="text-[13.5px] leading-snug text-[#E8EBF2]">
              {CHECKOUT_LINES.replaced}{" "}
              {/* A whole new page, so the new checkout starts unticked under its own box. */}
              <a ref={newerCheckout} href={checkoutHref(here.item, returnTo)} className={LINK}>
                {CHECKOUT_LINES.startAgain}
              </a>
            </p>
          )}
          {startError?.retry && !paying && (
            <p>
              <button type="button" onClick={() => setStartError(null)} className={cn(LINK, "text-[13px]")}>
                {CHECKOUT_LINES.tryAgain}
              </button>
            </p>
          )}
        </div>

        <footer className="grid gap-2 pt-2 text-center text-xs leading-relaxed text-[#9AA3B5]">
          <p>
            {CHECKOUT_LINES.foot}{" "}
            <a href="/refunds" target="_blank" rel="noopener" className={LINK}>
              {CHECKOUT_LINES.refunds}
              <NewTab />
            </a>
          </p>
          <p>
            <Link href={returnTo} className={LINK}>
              {backLabel(returnTo)}
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
