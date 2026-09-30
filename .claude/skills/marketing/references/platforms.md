# Platforms

Facts that change. Each carries its date and source; [u] marks a claim read from a search
summary rather than the page itself. When a platform changes one, fix the line and date it.
Researched 30 Sep 2026.

## Sizes and fields
| | Instagram | TikTok |
|---|---|---|
| Carousel | Up to 20 slides. 3:4 at 1080×1440 from the app: the grid shows 3:4 since Jan 2025, uploads since May 2025 [u]. Schedulers use Meta's API: 4:5 at 1080×1350 and 10 slides at most | Photo mode, up to 35 photos. 9:16 at 1080×1920 fills the screen. Keep text clear of about 130 px top, 350 bottom, 130 right [u]; the kit keeps 250, 430, 160 |
| Words | Caption up to 2,200 characters, the first line shows. Alt text per slide, under Advanced settings, Accessibility | Title up to 90 characters, description up to 4,000, the feed shows the first 100 to 150 [u]. Alt text on photos since Apr 2025 [u] |
| Hashtags | Five at most since Dec 2025, and they add no reach (Mosseri) | Five at most since Aug 2025 [u] |

## What the apps reward
- Instagram ranks on watch time, likes per reach and sends per reach. Sends weigh most with people
  who don't follow you yet (Adam Mosseri, Jan 2025).
- A carousel someone skipped is often shown again from its second slide (Mosseri, late 2024) [u].
  Slide 2 is a second cover.
- Carousels with music can appear in the Reels tab (Instagram, Oct 2024) [u]. Always add a track.
- Captions and alt text from professional accounts are in Google and Bing since Jul 2025.
- Original work only: reposting other people's posts makes an Instagram account unrecommendable
  (Apr 2026). Both apps keep engagement bait out of recommendations.
- TikTok has never said that trending sounds or captions lift reach. Its Creator Academy asks for
  the topic to be clear in the description, on-screen text and voice, and treats hidden keyword
  text as spam [u].
- On TikTok, videos average about 5.6 times the views of photo posts (Metricool 2026) [u]. Carousels
  are the format for now; a video version of a carousel that works is the first test once the kit
  exports video.
- Trial Reels need 1,000 followers (Jul 2025). The median TikTok post gets about 500 views, however
  often an account posts (Buffer, Oct 2025).

## Sound
- Business accounts only get cleared music: TikTok's Commercial Music Library (licensed for TikTok
  only) and Instagram's Sound Collection. Never a licensed song on a post that promotes the product.
- Friday, 15 minutes: TikTok Creative Center, Songs
  (ads.tiktok.com/business/creativecenter/inspiration/popular/music), region, last 7 days,
  "Approved for business use", Breakout. Pick one or two calm tracks for the week, save them as
  favourites in the TikTok app, write them on the rows. On Instagram use the app's own picker.
- The house mood: calm, slow, instrumental, piano or ambient. Nothing that fights reading.

## Scheduling on free plans
- **Instagram:** the app's own scheduler (Advanced settings, Schedule): 20 slides, 3:4, music and
  alt text, weeks ahead [u]. Seven posts take about 20 minutes on Friday.
- **TikTok:** TikTok Studio on the web schedules videos only, not photo carousels. Publer Free (three
  accounts, ten posts waiting each, carousels up to 35 photos) does [u]. Choose "Add recommended
  sound from TikTok" for no daily step, or a phone notification to add the week's track yourself,
  about a minute a day. Buffer Free caps TikTok photo posts at ten images [u], too few for by-sign.
- No free tool publishes a TikTok carousel with a sound you picked. Metricool Starter (about $20 to
  $25 a month) does, and its official MCP would let Claude load the week [u]. Worth it once
  posting is steady.
- A cloud session can't upload to Notion until the environment's network policy allows
  api.notion.com. Until then Claude sends the slides in the chat and writes everything else on the
  rows.

## Posting times
Until there is data: TikTok on Sunday at 09:00, Monday at 13:00 and evenings from 18:00 to 23:00
(Buffer 2026) [u]. After two weeks, each app's follower activity decides.

## Later: motion and ads
- Video versions of carousels, and the launch video with real screens: HyperFrames
  (github.com/heygen-com/hyperframes, Apache-2.0) renders HTML to MP4 and fits this kit; Remotion
  (github.com/remotion-dev/skills, free up to three people) fits React screens from `web/`. Both
  render in a container with Chromium and FFmpeg.
- Ads, from customer 50 (ADR-147): claude-ads (github.com/AgriciDaniel/claude-ads, MIT) audits and
  plans. TikTok bans horoscope ads in about 30 markets; check the targeted ones first.
