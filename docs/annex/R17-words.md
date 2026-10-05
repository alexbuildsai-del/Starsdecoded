# R17's new words, for the Owner's look

Every line a buyer reads that R17 added or changed, by screen. Before → after where a line existed.

## Checkout (`/checkout`, `/checkout/done`)
- "Checkout" · "Couple" / "€54" · "3 credits · 2 Personal reports, 1 Compatibility report" · "VAT included · then back to your pair"
- Single: "1 credit · 1 Personal report or 1 Compatibility report" · Timeline: "Timeline, monthly" / "Paid each month", "Timeline, yearly" / "Paid each year · 1 credit to give someone a report"
- A campaign: "{name} · until 31 October"
- The box: "Write each report as soon as I use a credit on it. I understand I can't cancel or get a refund for a credit once it's used. Terms"
- Timeline's box (MB-225): "Start Timeline as soon as I pay. I give up my right to cancel a month or year once it has started. Terms"; under Pay: "It renews each month. You can stop it any time on your Account page."
- Before the box is ticked: "Tick the box above to see the ways to pay." · "or pay by card" · "Pay €54" · "Paying"
- Foot: "Card details go to Stripe, never to us. Refunds" · "Back to {step}"
- Errors: "The payment didn't go through. Try again, or use another card." · "Checkout isn't open right now. Try again later." · "The payment form didn't load. Check your connection, then try again." · "Tick the box to agree before you pay."
- Done: "Confirming your payment" · "3 credits added" / "Timeline started" · "Taking you back to your pair." · "Your payment is still being confirmed" · "The payment didn't go through" / "You haven't been charged."

## Out of credits
- Writing at zero: "You need a credit to write this report." with Get credits · gifting at zero: "You need a credit to give a report."
- Add someone at zero: "No credits left" · "Adding someone uses one credit."
- Credits sheet: "Credits are free while we test." → "Tap a bundle to buy it." · bundle rows: "3 credits, for example:" → "For example:"

## A failed report (ADR-313)
- Under Try again: "It's free."
- After the third failure: "We couldn't write this report. Your credit is back in your balance."
- Refund rule 2: "If a report fails, its credit comes back to your balance automatically." → "If a report fails, Try again is free. If we still can't write it, its credit comes back to your balance."
- FAQ: "If your report fails, we tell you what happened, and Try again is free. If we still can't write it, its credit comes back to your balance. For a Compatibility report, the credit comes back at once."

## Timeline and the Account page
- Teaser and Account: "€9.99 a month or €69.99 a year" · "Start Timeline"
- With a plan: "Timeline, monthly" · "Renews on 1 November." / "Ends on 1 November." · "Manage payment" · "Cancel Timeline"
- No Personal report yet: "Timeline reads your own Personal report. Write yours first."
- A late payment: "Your last payment didn't go through. Use Manage payment to fix it."
- A day's readings used: "You've opened today's new readings. You can open more tomorrow."
- Ask, after a stop: "This answer was about someone who stopped sharing, so it's hidden."

## Sharing a pair (ADR-285)
- "{Name} stopped sharing their Personal report with you, so you can't share this Compatibility report."
- "Both charts in this Compatibility report are in your account, so there's no one to share it with."
- A claim for someone else: "Wrong account" · "This Compatibility report is for someone else. Ask the person who sent it to check the address."
- A pair claim: "Opening your Compatibility report…"

## The receipt email
- Subject "Your receipt from Stars Decoded" · "Thank you for your purchase. This is your receipt." · "You bought" · "You paid" · "What you agreed to" (the box, word for word) · "If something goes wrong" (the three rules) · "You will also get Stripe's receipt for this payment." · "See my History"

## History
- An admin's grant: "N credits bought" → "From Stars Decoded" · new: "With Timeline", "Refunded"

## Legal pages
- Terms: "There's no subscription." is gone; a Timeline section (renews until you stop it, stop it on your Account page, the box's words); "You pay on our own checkout page. Stripe takes the payment, so your card details go to Stripe and never reach us."
- Privacy: a "How you pay" section; "Stripe takes your payments. It also uses your payment details for its own needs, like stopping fraud."; Stripe's two cookies on the checkout page; `sd.campaign`.
