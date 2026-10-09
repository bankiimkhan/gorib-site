# Sustainable advertising strategy

## Decision

Optimise **revenue per engaged session**, not request count. The live baseline is
one high-intent display opportunity per route view, a maximum of four requests
per browser session, and no automatic fixed mobile or player-page advertising.
Expansion is earned through a controlled experiment; it is never enabled simply
because a page has empty space.

## Code audit

The following findings were verified in the repository before this change.

| Finding | Why it matters | Change |
| --- | --- | --- |
| A custom tag was injected globally on idle time on every non-player route. | It could load before an eligible slot reached the viewport, so the slot-level lazy-load rule did not actually control demand requests. | Custom tags are now initiated by an eligible slot only, with that slot's selector only. |
| Production configuration enabled five surfaces: home top, home feed, title detail, player bottom, and mobile sticky. | The large feed unit and fixed mobile anchor increase density without evidence of incremental session revenue. | The baseline enables only home discovery and title-detail discovery. All other placements require an experiment flag. |
| A slot was labelled as an impression when it entered a 250px load margin; providers also emitted their own impression. The native card recorded an impression immediately. | This inflates impression and viewability reporting, so it cannot be used to choose placements. | Telemetry now separates `request`, `filled`, `viewable`, `unfilled`, `blocked`, and `suppressed`; viewable requires a filled creative at 50% visibility for one continuous second. |
| An unfilled provider collapsed its reservation even after it could be on screen. | Late no-fill or blocker events can shift content and hurt CLS. | Slots collapse only before entering the viewport. After visibility, the reserved box remains for that view. |
| Generic network support existed despite no configured publisher account. | It increases attack surface and makes the actual demand source ambiguous. | Unused network support has been removed; Hilltop is the sole live-network integration. |
| Player routes were already isolated from custom multitags. | This protects playback from overlay/click-capture behaviour. | The isolation remains; player-bottom is now off by default and additionally denied on compact screens. |
| The custom tag is opaque and the configuration comments acknowledge possible pop-unders and click overlays. | The codebase cannot verify that a third-party multitag follows ad-policy and UX requirements. | Custom demand is disabled until `NEXT_PUBLIC_CUSTOM_AD_DISPLAY_ONLY_APPROVED=true` is set after a documented vendor/creative audit. |

The codebase does **not** contain enough production telemetry to verify fill
rate, eCPM, CTR, revenue, bounce rate, or retention impact. Those are
measurement questions, not facts that can be inferred from the source.

## Placement policy

| Surface | Baseline | Rule | Rationale |
| --- | --- | --- | --- |
| Home discovery (`home-top`) | On | Between established content rails; lazy-loaded. | Early discovery intent with no interruption to navigation or the hero/player. |
| Title details (`details-mid`) | On | After reviews and before recommendations; lazy-loaded. | Reaches a visitor who has engaged with a specific title. |
| Home / genre feed (`home-feed`) | Off | Test only as a replacement for, never in addition to, `home-top`. | A 250px mobile unit is high-density and should prove incremental value. |
| Catalog header and in-feed card | Off | Test one at a time, only with at least 18 results and no second catalog ad. | Avoids displacing posters or resembling editorial content. |
| Search | Off | Only test after a successful result set, never empty/error/loading search states. | Search is a task-completion flow; an empty-state banner is disruptive. |
| Player and live TV | Off | Enable only a vetted Hilltop display unit below the player on desktop; never in, over, or sticky to playback. | Playback is core functionality and carries elevated accidental-click risk. |
| Mobile sticky | Off | Requires both placement and explicit sticky approval, a visible close button, session dismissal, safe-area spacing, and no player route. | Fixed ads are the easiest way to harm retention; validate separately. |

The caps are configuration, not hard-coded product assumptions:

```dotenv
NEXT_PUBLIC_AD_MAX_REQUESTS_PER_PAGE=1
NEXT_PUBLIC_AD_MAX_REQUESTS_PER_SESSION=4
NEXT_PUBLIC_AD_ALLOW_MOBILE_STICKY=false
```

The request budget is allocated only after a lazy slot approaches the viewport.
It is not based on a visitor ID, a URL query, click behaviour, or ad clicks.

## Performance and measurement implementation

- Slot markup reserves the expected responsive dimensions before an ad request.
- Slots use a 250px `IntersectionObserver` load margin; third-party demand is
  not globally injected during idle time.
- A filled event is distinct from a request. A viewable event requires at least
  50% visibility for one uninterrupted second while the tab is visible.
- No refresh is implemented. Do not auto-refresh display units; any future
  refresh needs written Hilltop approval and an experiment.
- Ad events dispatch `gorib:ad_event` and, if a GTM `dataLayer` already exists,
  push non-identifying placement/provider fields. The product analytics API is
  deliberately not repurposed for advertising data.
- `unfilled`, `blocked`, and `suppressed` are first-class events. This makes
  fill rate and wasted request rate measurable without fabricating views.

Recommended event fields: `event`, `placement`, `provider`, `pageType`,
`compactViewport`, anonymous experiment variant, and timestamp. Do not collect
creative click coordinates, raw query text, or an ad-click proxy.

## Controlled experiment plan

Run one test at a time, with a 50/50 persistent assignment made by the chosen
analytics/CMP platform. Keep a minimum two-week window and stop early only for
a material policy, accessibility, performance, or retention regression.

1. **Baseline:** home-top + details-mid versus no-ad control for a small traffic
   holdout. Establish revenue/session and retention cost.
2. **Replacement test:** home-feed *instead of* home-top on long home/genre
   views. Ship only if incremental revenue/session beats the baseline without
   harming engagement.
3. **Catalog test:** one clearly labelled in-feed card after 18 results versus
   no catalog ad. Exclude search, loading, and empty states.
4. **Mobile sticky:** test only after the preceding placements are stable. Keep
   the close affordance, dismissal, and player exclusion; compare it against a
   no-sticky mobile control.

Segment every result by page type, compact/desktop viewport, provider, country
or consent region where permitted, new/returning cohort, and ad blocker signal.
Do not declare a winner from aggregate CTR alone.

### Launch gates

Promote a treatment only if all are true against its control:

- Revenue per engaged session rises by at least 5% with a confidence interval
  that does not include a material loss.
- Request-to-filled rate is at least 70%, and filled-to-viewable rate is at
  least 60% for the candidate surface.
- No more than a 2% relative decline in playback starts, result-to-detail
  clicks, or session duration; no more than a 1 percentage-point rise in
  single-page sessions.
- Return-within-7-days rate is not down by more than 1% relative.
- p75 CLS does not regress by more than 0.02, p75 INP by more than 20ms, or
  p75 LCP by more than 100ms; mobile and player routes are reported separately.
- No accidental-click reports, provider policy alerts, consent failures, or
  accessibility regressions occur.

## Compliance release checklist

Before enabling live demand:

1. Vet each exact third-party tag and its creatives for pop-ups, pop-unders,
   redirects, overlay/click-capture behaviour, autoplay audio, and player
   interference. Record the result before setting the custom approval flag.
2. Use a production CMP that exposes IAB TCF v2.2 / GPP where applicable,
   presents a revocation path, and configures Hilltop's applicable consent
   mode before its script runs. A boolean environment flag is not a CMP.
3. Publish accessible Privacy, Cookie, and Advertising disclosures, including
   vendors, purposes, retention, and exercise-of-rights instructions.
4. Confirm ads.txt / authorised sellers, domain ownership, inventory/content
   eligibility, and the selected network's current policies. Do not load two
   networks into the same slot unless a tested mediation setup owns the auction.
5. Keep ads clearly labelled and separated from controls, search filters,
   player controls, and poster cards. Never incentivise clicks or use in-house
   click tracking to optimise around network measurements.

These controls align with the Coalition for Better Ads density and sticky-ad
standards. They do not substitute for publisher legal advice or Hilltop's
current publisher policies.
