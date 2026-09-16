// ─── Paywall classification ────────────────────────────────────────────────────
// Determines article paywall status using source-level defaults and optional
// URL-pattern overrides. All logic is deterministic — no external service needed.

import type { PaywallStatus, SourceConfig } from './types';

export function classifyPaywall(
  url:    string,
  source: SourceConfig,
): { status: PaywallStatus; reason: string } {
  // Article-level URL pattern check overrides source default
  if (source.paywallUrlPatterns?.length) {
    const lower = url.toLowerCase();
    for (const pattern of source.paywallUrlPatterns) {
      if (lower.includes(pattern.toLowerCase())) {
        return { status: 'subscription', reason: `url-pattern:${pattern}` };
      }
    }
  }

  return { status: source.paywall, reason: `source-default:${source.id}` };
}
