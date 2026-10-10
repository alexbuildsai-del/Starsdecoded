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
import { tokens } from "@workspace/design";
import { Button } from "@/ds/atoms/Button";
import { Card } from "@/ds/molecules/Card";
import { Eyebrow } from "@/ds/atoms/Eyebrow";
import { StatusDots } from "@/ds/atoms/StatusDots";
import { TextButton } from "@/ds/atoms/TextButton";
import { TopBar } from "@/ds/organisms/TopBar";
import { Wordmark } from "@/ds/atoms/Wordmark";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import {
  CHECKOUT_LINES,
  afterPaying,
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
  type CheckoutItemView,
} from "@/lib/checkout-view";
import { usePageTitle } from "@/lib/page-title";
import { campaignSlug, pricedItems, useCheckoutOptions } from "@/lib/prices";
import { refusalLine } from "@/lib/refusals";
import { cn } from "@/lib/utils";

// Stripe draws its fields in a frame of its own, where our stylesheet cannot reach, so it is handed the token values (§9).
const c = tokens.color;
const TOKEN = {
  void: c.void,
  surface: c.surface,
  edge: c["control-edge"],
  paper: c.paper,
  muted: c["paper-dim"],
  placeholder: c["label-dim"],
  indigo: c.indigo,
  ok: c.teal,
  warn: c.brass,
  danger: c.back,
} as const;

const APPEARANCE: Appearance = {
  theme: "night",
  labels: "above",
  variables: {
    fontFamily: tokens.fontFamily.body,
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
    ".Input": { border: `1px solid ${TOKEN.edge}`, backgroundColor: TOKEN.void, boxShadow: "none" },
    ".Input:focus": { borderColor: TOKEN.indigo },
    ".Input--invalid": { borderColor: TOKEN.danger, boxShadow: "none" },
    ".Label": { color: TOKEN.muted, fontSize: "13px", fontWeight: "500" },
    ".Tab": { border: `1px solid ${TOKEN.edge}`, backgroundColor: TOKEN.surface, boxShadow: "none" },
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

const MUTED = "text-small text-paper-dim";
const LINK =
  "rounded-inner text-indigo-lt underline underline-offset-2 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus";
// The report's tick box (Checklist), in the control's indigo: one look for a box the reader ticks (§9).
const TICK_BOX =
  "peer m-0 h-5 w-5 cursor-pointer appearance-none rounded-inner border-[1.5px] border-control-edge bg-transparent transition-colors hover:border-paper-dim checked:border-indigo checked:bg-indigo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-default disabled:opacity-50";

function NewTab() {
  return <span className="sr-only"> {CHECKOUT_LINES.newTab}</span>;
}

/** The price a reader pays, read first; while a campaign runs the full price is drawn before it, struck (reading 6). */
function Price({ view }: { view: CheckoutItemView }) {
  return (
    <span className="flex shrink-0 items-baseline gap-2 font-numeric text-prose leading-none text-paper">
      <span>{view.price}</span>
      {view.full && (
        <s className="order-first text-small text-muted">
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
    <span className="block text-small text-paper-dim">{campaignLine(view.campaign, order)}</span>
  ) : null;
}

function BackLine({ returnTo, plan }: { returnTo: string; plan: boolean }) {
  const next = afterPaying(returnTo, plan);
  return (
    <p className={MUTED}>
      {next.lead} <span className="text-paper">{next.to}</span>
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
    <div className="min-h-[100dvh] bg-ground text-paper">
      <TopBar
        version="checkout"
        widthClass="max-w-[440px]"
        left={<Wordmark size={17} />}
        right={
          <h1 className="m-0">
            <Eyebrow>{CHECKOUT_LINES.title}</Eyebrow>
          </h1>
        }
      />
      <main className="mx-auto grid w-full max-w-[440px] gap-4 px-4 pb-12 pt-5 sm:pt-8">

        {views.length === 1 ? (
          <Card aria-labelledby={itemId} className="gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={itemId} className="m-0 font-display text-card-title-sm text-paper">
                {view.name}
              </h2>
              <Price view={view} />
            </div>
            <p className={MUTED}>{view.line}</p>
            <CampaignLine view={view} />
            <BackLine returnTo={returnTo} plan={view.plan} />
          </Card>
        ) : (
          <fieldset className="grid gap-2" disabled={paying || replaced}>
            <legend className="sr-only">{view.plan ? CHECKOUT_LINES.choosePlan : CHECKOUT_LINES.chooseBundle}</legend>
            {views.map((one) => (
              <label
                key={one.id}
                className={cn(
                  "grid cursor-pointer gap-1.5 rounded-card border bg-surface p-4 transition-colors",
                  one.id === selected ? "border-indigo" : "border-line hover:border-control-edge",
                )}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name={radios}
                    value={one.id}
                    checked={one.id === selected}
                    onChange={() => choose(one.id)}
                    className="h-4 w-4 shrink-0 accent-indigo"
                  />
                  <span className="font-display text-card-title-sm text-paper">{one.name}</span>
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
            <BackLine returnTo={returnTo} plan={view.plan} />
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
              className="pointer-events-none absolute h-[13px] w-[13px] opacity-0 transition-opacity duration-(--dur-fast) peer-checked:opacity-100"
              fill="none"
              stroke={c["on-indigo"]}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12l5 5 9-10" />
            </svg>
          </label>
          <p className="text-small text-paper-dim">
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
            <TextButton onClick={() => void refetch()}>{CHECKOUT_LINES.tryAgain}</TextButton>
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
                <TextButton onClick={() => window.location.reload()}>{CHECKOUT_LINES.tryAgain}</TextButton>
              </p>
            )}
            {/* Unticked or replaced, the wallets go with Pay: a wallet's own sheet would otherwise pay without the box. */}
            <div ref={expressBox} className={cn((!ticked || wallets === false || replaced) && "hidden")} />
            {ticked && wallets === true && fields === "ready" && !replaced && (
              <p className="flex items-center gap-3 text-caption text-paper-dim">
                <span aria-hidden className="h-px flex-1 bg-line" />
                {CHECKOUT_LINES.orAnotherWay}
                <span aria-hidden className="h-px flex-1 bg-line" />
              </p>
            )}
            <div ref={paymentBox} />
          </div>
        )}

        <div className="grid gap-2">
          <Button
            full
            onClick={() => payNow.current()}
            disabled={!canPay}
            busy={paying ? CHECKOUT_LINES.paying : undefined}
            className="disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100"
          >
            {payLabel(amountCents)}
          </Button>
          {/* MB-225 decided, ADR-361: the plan renews, said as plain text under Pay beside its box. */}
          {view.renewal && <p className={MUTED}>{view.renewal}</p>}
          <p ref={errorLine} tabIndex={-1} role="alert" className="text-small text-paper empty:hidden focus:outline-none">
            {lineNow}
          </p>
          {replaced && here && (
            <p role="alert" className="text-small text-paper">
              {CHECKOUT_LINES.replaced}{" "}
              {/* A whole new page, so the new checkout starts unticked under its own box. */}
              <a ref={newerCheckout} href={checkoutHref(here.item, returnTo)} className={LINK}>
                {CHECKOUT_LINES.startAgain}
              </a>
            </p>
          )}
          {startError?.retry && !paying && (
            <p>
              <TextButton onClick={() => setStartError(null)}>{CHECKOUT_LINES.tryAgain}</TextButton>
            </p>
          )}
        </div>

        <footer className="grid gap-2 pt-2 text-center text-caption text-paper-dim">
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
