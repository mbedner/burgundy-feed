# Burgundy Feed Implementation Brief

Use this brief to audit and improve Burgundy Feed. Follow the implementation order at the end. Adapt changes to the existing architecture instead of rewriting the application unnecessarily.

## 1. Begin with a complete repository audit

Before changing code:

1. Read the entire repository structure and identify:
   - Frontend framework and routing
   - Backend or serverless functions
   - Database and schema
   - Article ingestion pipeline
   - Hourly scheduling mechanism
   - News source configuration
   - ESPN or statistics integration
   - Existing service worker and PWA configuration
   - Deployment provider
   - Analytics implementation
   - Existing tests and CI checks
2. Read all repository instructions, including:
   - `README`
   - `AGENTS.md`
   - Environment examples
   - Deployment configuration
   - Database migrations
   - Cron or scheduled-job configuration
3. Run the existing application, unit tests, integration tests, end-to-end tests, type checker, linter, and production build.
4. Record any failures that existed before making changes.
5. Do not rewrite the application or replace major dependencies unless the existing architecture genuinely cannot support the requested behavior.
6. Do not add a paid API, external service, or new recurring expense without asking first.
7. Do not place credentials or production secrets in source code.
8. Preserve the existing visual identity unless a UI change is required to support one of the features below.

## 2. Make the hourly ingestion reliable and observable

The hourly ingestion must become the single reliable source of truth for feed freshness.

1. Give every ingestion run a unique ID.
2. Record:
   - Start time
   - Completion time
   - Overall status
   - Number of sources attempted
   - Number of sources successfully refreshed
   - Number of sources that failed
   - Number of articles discovered
   - Number of new articles inserted
   - Number of existing articles updated
   - Number of duplicate articles rejected
   - Error details by source
3. Support these ingestion statuses:
   - `running`
   - `successful`
   - `partially_successful`
   - `failed`
4. A failure from one source must not prevent other sources from completing.
5. Add reasonable request timeouts, limited retries, exponential backoff, error logging, and input validation.
6. Make ingestion idempotent. Running the same ingestion twice must not create duplicate articles.
7. Prevent overlapping hourly runs with a database lock, scheduler lock, or equivalent mechanism supported by the current architecture.
8. Normalize incoming timestamps to UTC when stored.
9. Preserve the source-provided publication time separately from the time Burgundy Feed discovered the article.
10. Validate every article before saving it. At minimum, require a valid HTTP or HTTPS URL, nonempty title, known publisher or source, and publication or discovery timestamp.
11. Sanitize imported titles, author names, summaries, and source labels.
12. Do not ingest or republish full copyrighted article text. Store only the metadata and excerpts allowed by the source.
13. If an article changes after initial ingestion, update its metadata without changing its stable Burgundy Feed article ID.

## 3. Fix the Updated status

The current `Updated —` state must be replaced with accurate, understandable information.

1. The displayed update time must represent the most recent completed ingestion run, not the page load time, build time, browser time, or start of an incomplete ingestion.
2. Display a relative time in the header, such as `Updated 8 minutes ago` or `Updated 1 hour ago`.
3. Make the exact date and time available through a tooltip, accessible label, or secondary text.
4. Use the visitor's local timezone for display while keeping UTC in storage.
5. If the latest run was only partially successful, show the relative update time plus a subtle status indicating that some sources could not be refreshed.
6. If the last successful or partially successful ingestion is more than two hours old, show a visible stale-feed warning.
7. If no ingestion has ever completed, show `News updates are temporarily unavailable`.
8. Do not display a dash, blank value, or misleading live indicator.
9. Add tests for successful runs, partial runs, failed runs, missing timestamps, stale data, different browser timezones, and daylight-saving-time changes.

## 4. Create a formal article data model

Ensure each article supports the following fields or their architectural equivalent:

1. Stable Burgundy Feed article ID
2. Original URL
3. Canonicalized URL
4. Title
5. Publisher
6. Source domain
7. Author, when available
8. Original publication time
9. Burgundy Feed discovery time
10. Last updated time
11. Source type
12. Content type
13. Topic tags
14. Paywall status
15. Paywall classification reason
16. Source-quality tier
17. Original-reporting status
18. Story-cluster ID
19. Ranking score
20. Ranking explanation or score components
21. Ingestion-run ID
22. Active, removed, or unavailable status

Use explicit enums or validated values instead of inconsistent free-form strings.

## 5. Add accurate paywall labeling

Users must know whether an article is likely to require a subscription before clicking it.

1. Support these user-facing paywall states:
   - `Free`
   - `Subscription required`
   - `May require subscription`
2. An internal `unknown` state may be used, but it should display as `May require subscription` rather than making an unsupported promise.
3. Maintain a centralized source registry containing:
   - Publisher name
   - Domain
   - Alternate domains
   - Default paywall status
   - Whether the publisher mixes free and subscriber-only articles
   - Any known URL patterns indicating subscriber content
   - Date the rule was last reviewed
4. Use source-level rules as the baseline.
5. Allow article-level rules to override the source default when the URL or feed metadata clearly identifies subscriber content.
6. Do not attempt to bypass, defeat, or scrape around a paywall.
7. Do not label a mixed-access publisher entirely free or entirely paywalled unless that is consistently true.
8. Display the paywall label in Top Stories, Latest News, New Since Your Last Visit, expanded story clusters, and anywhere else an article link appears.
9. Add a user-controlled filter labeled `Hide subscription articles` or `Free articles only`.
10. The paywall filter should default to off, persist locally, and apply consistently across all article sections.
11. If every article in a story cluster is paywalled, label the entire cluster.
12. If a cluster contains both free and paywalled coverage, prefer a reputable free article as the primary link when editorial quality is comparable while still allowing users to view all sources.
13. Paywall labels must not rely only on color. Include visible text or an accessible icon label.
14. Add tests covering always-paywalled sources, always-free sources, mixed-access sources, unknown publishers, article-level overrides, mixed clusters, and the paywall filter.

## 6. Normalize URLs and remove exact duplicates

Before story clustering, eliminate straightforward duplicate entries.

1. Normalize URLs by:
   - Lowercasing the hostname
   - Removing URL fragments
   - Removing common tracking parameters such as `utm_*`
   - Removing unnecessary trailing slashes
   - Resolving known mobile and desktop domain variations
   - Respecting a publisher-provided canonical URL when available
2. Do not remove URL parameters that identify genuinely different articles.
3. Treat articles with the same canonical URL as the same article.
4. If the same article arrives from multiple feeds, keep one record, preserve the earliest discovery time, update missing or improved metadata, and record all ingestion sources when useful for debugging.
5. Do not allow exact duplicates to appear in multiple homepage sections unless one section intentionally references the same primary story.
6. Add unit tests for all URL-normalization rules.

## 7. Cluster articles covering the same story

Multiple outlets covering the same event should appear as one developing story rather than as repetitive independent headlines.

1. Create a persistent story-clustering system.
2. Consider normalized title similarity, named players, coaches, opponents, transactions, injuries, games, shared key phrases, publication-time proximity, and article type.
3. Do not cluster articles only because they mention the same popular player.
4. Do not incorrectly combine:
   - Injury news and unrelated player analysis
   - Game previews and postgame recaps
   - Transaction reporting and speculative trade ideas
   - Original reporting and unrelated opinion pieces
5. Use a conservative similarity threshold. It is better to leave two borderline stories separate than to combine unrelated stories.
6. Keep cluster IDs stable across ingestion runs.
7. Select one primary article for each cluster using original reporting, source quality, Commanders relevance, recency, access status, and completeness of metadata.
8. Display the primary headline, primary source, publication time, paywall status, and `Coverage from X sources` when multiple articles exist.
9. Allow users to expand a cluster and see every included article.
10. Clearly distinguish original reporting, additional reporting, analysis, and opinion or speculation.
11. Do not hide meaningful analysis merely because it concerns the same event. It may remain within the cluster under an analysis label.
12. Add fixtures and tests for exact duplicate URLs, slightly different headlines about the same transaction, several game recaps, an original injury report plus follow-up analysis, unrelated stories about the same player, and speculation that must remain separate from verified reporting.

## 8. Replace simplistic Top Stories ranking

Top Stories must prioritize importance and credibility instead of simply favoring the newest or most sensational headline.

1. Build a deterministic, configurable ranking system.
2. Give positive ranking weight to:
   - Verified breaking news
   - Original reporting
   - Official team announcements
   - Established Commanders beat reporters
   - Reputable local and national reporting
   - Multiple independent sources covering the same development
   - High Commanders relevance
   - Recent publication
   - Significant injuries, transactions, game outcomes, coaching news, stadium news, or league decisions affecting the team
3. Apply ranking penalties to:
   - Speculative trades
   - Clickbait headlines
   - Unsupported rumors
   - Repackaged reporting
   - Repetitive reaction pieces
   - Old stories
   - Articles mainly about another team
   - Betting or promotional content
   - Generic listicles
   - Stories already represented by a stronger article in the same cluster
4. Recency must be one factor, not the entire ranking system.
5. A speculative article should not automatically outrank substantive reporting from The Athletic, ESPN, the team, or a trusted beat reporter simply because it is newer.
6. Keep source-quality rules in a centralized configuration rather than scattering publisher checks throughout the code.
7. Use source tiers:
   - Tier 1: Official announcements and trusted original reporting
   - Tier 2: Reputable local or national analysis
   - Tier 3: Fan analysis, aggregators, opinion, and speculative content
8. Source tier must influence ranking without completely excluding lower-tier sources.
9. Select Top Stories from distinct story clusters so the section does not contain several versions of the same event.
10. Do not display an unexplained numeric score to users.
11. Log score components internally so incorrect ranking can be debugged.
12. If supported by the architecture, allow a temporary manual pin or exclusion without editing application code.
13. Add tests demonstrating that breaking original reporting outranks speculation, a major injury outranks minor opinion, one event cannot consume all Top Story positions, reputable free coverage may be preferred when authority is comparable, and old reporting does not remain at the top indefinitely.

## 9. Add New Since Your Last Visit

Give returning users an immediate explanation of what changed.

1. Add a section titled `New since your last visit`.
2. On a visitor's first visit, do not show an empty personalized section. Establish the first-visit timestamp and show the normal Top Stories and Latest News experience.
3. On future visits, compare the previous session timestamp against article discovery times and show newly discovered articles or story clusters.
4. Avoid counting an updated duplicate as a completely new story unless the update is materially significant.
5. Use stable IDs rather than comparing rendered titles.
6. Treat multiple page reloads in the same browsing session as one visit.
7. Suggested implementation:
   - Store the previous completed session timestamp in local storage
   - Store the current session's starting time in session storage
   - Continue showing the same new set throughout that session
   - Update the persistent previous-visit timestamp only once per new session
8. Add a new-story count and `Mark all as seen` control.
9. If local storage is unavailable, fail gracefully, do not block the page, and omit the personalized section.
10. Do not require an account.
11. Respect the user's paywall filter inside this section.
12. Add tests for first visit, second visit, multiple reloads, new ingestion during an active session, cleared storage, private-browsing restrictions, several articles in one story cluster, and timezone changes.

## 10. Fix the statistics experience

The current zero-yard and blank-leader values must never be displayed as real statistics when data is unavailable.

1. Identify why the site currently shows `0 Pass Yds/G`, `0 Rush Yds/G`, `0.0 Total Yds/G`, and missing statistical leaders.
2. Confirm that the statistics integration requests the current NFL season, regular season, correct Commanders team ID, completed games, and correct API fields.
3. Validate numeric transformations and field mappings.
4. Distinguish between a real zero, missing data, data not yet published, API failure, and a season that has not started.
5. Never convert missing, null, or undefined values into zero.
6. When data is unavailable, display `Not yet available` or omit the statistic entirely.
7. Remove unexplained dashes beside player leaders.
8. Do not name a statistical leader without a valid statistic.
9. Display the date or game through which statistics are current when available.
10. Remove or clarify `Live via ESPN`. Use wording such as `Stats provided by ESPN` or `Updated through Week 1`.
11. Cache statistics appropriately, but refresh the cache after games.
12. If the statistics API fails, retain the most recent valid data and indicate that it may be delayed.
13. Add data validation so obviously impossible responses are rejected rather than displayed.
14. Add tests for preseason, before the first game, after Week 1, missing fields, API timeouts, partial leader data, legitimate zero values, and cached data after a failed refresh.

## 11. Fix schedule and key-date data

1. Use an authoritative source for the schedule and league dates.
2. Remove placeholder copy such as `Trade Deadline Est. — confirm on NFL.com`.
3. If a date is not confirmed, display `Date to be announced` and do not present an estimate as official.
4. Correctly support home and away games, bye week, international games, flexible scheduling, TBD times, network changes, completed scores, and postponed or rescheduled games.
5. Store dates in a consistent timezone and display them correctly for users.
6. Ensure countdown values use the actual event time, not midnight unless the event truly has no specified time.
7. Do not display negative countdowns.
8. Remove stale key dates after they pass or place them in a clearly labeled Past section.
9. Add tests for TBD dates, flexible scheduling, timezone conversion, and completed events.

## 12. Turn Reporter Voices into a real utility

The current reporter directory should become a feed of actual updates when permitted by available APIs.

1. Determine whether the project has authorized access to X, Bluesky, Mastodon, RSS feeds, publisher feeds, or reporter websites and newsletters.
2. Do not scrape X or another platform in violation of its terms.
3. If X access is unavailable:
   - Keep the reporter directory
   - Clearly label it as links to reporters
   - Do not present it as a live reporter feed
   - Build the code behind a provider interface so an authorized feed can be added later
4. If authorized content is available, normalize reporter name, handle, outlet, avatar when permitted, post text, post time, original URL, repost status, and media metadata.
5. Include the established Commanders reporters already listed on the site.
6. Sort posts chronologically.
7. Allow filtering by reporter.
8. Remove duplicates and reposts that add no additional information.
9. Preserve attribution and always link to the original post.
10. Do not copy content beyond what the platform permits.
11. Make Reporter Voices a primary navigation destination once it contains actual content.
12. Handle deleted, unavailable, or protected posts gracefully.

## 13. Improve the page hierarchy

The page should emphasize the task users are most likely to return for: finding out what changed.

Recommended order:

1. Header and accurate update status
2. Game Day module when contextually relevant
3. New since your last visit
4. Top Stories
5. Latest News
6. Reporter Voices preview
7. Schedule and statistics
8. Around the NFC East
9. Key dates and secondary information

Additional requirements:

1. Around the NFC East should remain secondary to Commanders news.
2. Player spotlights should not push timely news farther down the page.
3. On quiet days, secondary modules can provide value, but they must not obscure feed freshness.
4. Avoid showing the same article separately in Top Stories, New Since Your Last Visit, and Latest News without a clear reason.
5. Make all article cards consistently show headline, source, author when available, publication time, content type, and paywall status.
6. Ensure topic buttons and filters work.
7. Persist filter preferences where appropriate.
8. Provide clear empty states rather than blank sections.
9. Keep existing branding unless a change directly improves usability.

## 14. Improve the value proposition

Replace implementation-focused positioning with user-focused positioning.

Recommended primary message:

> Every credible Commanders update in one clean feed, without the X or Reddit noise.

Use `Updated hourly` as supporting information rather than the primary benefit.

Do not claim real-time updates if ingestion remains hourly, complete coverage unless source completeness can be verified, live statistics when data is cached, or paywall-free coverage when some sources require subscriptions.

## 15. Add useful notifications without creating spam

Only implement notifications if the existing infrastructure can support them safely and reliably.

1. Support two user-selectable options:
   - Breaking news only
   - Morning and evening digest
2. Do not request browser-notification permission immediately on page load.
3. Ask only after the user demonstrates interest, such as returning, opening several articles, or choosing a notification option.
4. Explain what the user will receive before requesting permission.
5. Limit breaking notifications to high-confidence events such as confirmed transactions, significant injuries, official roster moves, major coaching news, stadium decisions, game postponements, and final game outcomes.
6. Do not send breaking notifications for speculative trades, generic analysis, listicles, minor opinion pieces, or multiple articles covering the same event.
7. Deduplicate notifications by story-cluster ID.
8. Provide controls to subscribe, change notification type, pause, and unsubscribe.
9. Store push keys and service credentials only in secret management.
10. If notification infrastructure does not exist, provide a technical plan and required dependencies before introducing a new vendor.

## 16. Improve the PWA installation experience

1. Confirm that the web app manifest is valid, required icons exist, the service worker registers, the site operates over HTTPS, the installed app opens correctly, and updates are detected.
2. Do not repeatedly show installation instructions after dismissal.
3. Detect whether the app is already installed.
4. Use the native installation prompt when supported.
5. Continue providing accurate Safari instructions where native prompting is unavailable.
6. Explain the benefit of installation: faster access, optional notifications, and a dedicated Commanders news experience.
7. Ensure the install prompt is accessible and dismissible.

## 17. Add analytics that measure actual usefulness

Track at minimum:

1. Page viewed
2. Session started
3. Returning visitor
4. Article opened
5. Article source
6. Article paywall status
7. Paywalled article opened
8. Paywall filter enabled
9. Topic filter selected
10. Story cluster expanded
11. New Since Your Last Visit viewed
12. New article opened
13. Reporter profile opened
14. Reporter post opened
15. PWA install prompt displayed
16. PWA installed
17. Notification prompt displayed
18. Notification permission accepted or declined
19. Notification subscription type
20. Notification opened

Analytics must avoid unnecessary personal information, respect applicable consent requirements, avoid sensitive query parameters, use consistent event names and properties, and avoid duplicate events on rerenders.

Create reporting for:

1. Daily and weekly active users
2. Seven-day returning-user rate
3. Visits per returning user
4. Articles opened per session
5. Most-opened sources
6. Most-used filters
7. Paywalled versus free click-through rate
8. Story-cluster expansion rate
9. New Since Your Last Visit engagement
10. PWA installation rate
11. Notification opt-in rate
12. Notification click-through rate

## 18. Meet accessibility and responsive-design requirements

1. Test desktop, tablet, and mobile layouts.
2. Ensure keyboard navigation, visible focus indicators, semantic headings, accessible link names, accessible filter controls, sufficient color contrast, screen-reader-friendly timestamps, paywall status that does not rely on color, and adequately sized touch targets.
3. Article cards must remain readable with very long headlines, missing authors, long publisher names, multiple tags, paywall labels, and large system font settings.
4. Avoid horizontal scrolling.
5. Respect reduced-motion preferences.
6. Test the install prompt, cluster expansion, filters, and notifications with keyboard navigation.

## 19. Add comprehensive automated tests

Add unit tests for:

1. URL normalization
2. Article validation
3. Exact duplicate detection
4. Story clustering
5. Source-tier assignment
6. Top Story ranking
7. Paywall classification
8. Paywall filtering
9. Relative timestamp formatting
10. Stale-ingestion detection
11. Statistics mapping
12. Missing-statistics handling
13. Schedule formatting
14. Since-last-visit calculations

Add integration tests for:

1. Fully successful ingestion
2. Partially successful ingestion
3. Completely failed ingestion
4. Running the same ingestion twice
5. Two feeds containing the same article
6. Multiple articles covering the same event
7. Statistics API failure
8. Database migration and rollback
9. Notification deduplication, if implemented

Add end-to-end tests for:

1. First-time visitor
2. Returning visitor
3. Expanding a story cluster
4. Hiding paywalled articles
5. Opening a paywalled article
6. Using topic filters
7. Viewing stale-feed messaging
8. Installing the PWA where testable
9. Mobile navigation
10. Keyboard navigation

All existing tests must continue to pass.

## 20. Handle loading, empty, stale, and error states

Define explicit behavior for:

1. Initial page loading
2. No articles available
3. One source unavailable
4. All sources unavailable
5. Stale articles
6. Statistics unavailable
7. Schedule unavailable
8. Reporter feed unavailable
9. Local storage unavailable
10. Analytics unavailable
11. Notification service unavailable

Secondary service failures must not prevent the main news feed from loading.

Do not show blank components, `undefined`, `null`, raw errors, unexplained placeholder dashes, false zero values, or infinite loading indicators.

## 21. Preserve security and privacy

1. Validate and sanitize all external content.
2. Prevent unsafe URLs and script injection.
3. Restrict article links to HTTP and HTTPS.
4. Use `noopener` and `noreferrer` appropriately for external links.
5. Do not expose API keys, database credentials, scheduler secrets, push-notification private keys, or internal error traces.
6. Review new dependencies for maintenance and security risks.
7. Keep dependency changes minimal.
8. Do not store full user browsing histories for New Since Your Last Visit. Local timestamps and anonymous aggregate analytics are sufficient.

## 22. Deliver the work incrementally

Implement in this order:

1. Repository audit and baseline tests
2. Ingestion reliability and update timestamps
3. Statistics and schedule corrections
4. Article data-model changes
5. Paywall detection
6. URL normalization and exact deduplication
7. Story clustering
8. Top Story ranking
9. New Since Your Last Visit
10. Page hierarchy improvements
11. Reporter Voices
12. PWA improvements
13. Notifications
14. Analytics
15. Final accessibility and responsive review

Do not combine every feature into one enormous, unreviewable change. Use separate, logically organized commits.

## 23. Provide a complete handoff

At completion, provide:

1. Summary of every change
2. Files changed
3. Database migrations added
4. New environment variables
5. New services or dependencies
6. Tests added
7. Test results
8. Build and lint results
9. Known limitations
10. Features intentionally deferred
11. Deployment instructions
12. Rollback instructions
13. Screenshots of important UI changes
14. A list of any production configuration Mark must complete manually

Do not claim a feature is complete if it depends on missing credentials, unavailable APIs, or unconfigured production infrastructure. Clearly separate:

- Fully implemented
- Implemented but awaiting configuration
- Proposed but blocked
- Deferred by design
