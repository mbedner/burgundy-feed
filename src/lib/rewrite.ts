// ─── Headline Rewrite Logic ───────────────────────────────────────────────────
// All rewrites are template-based — free, fast, deterministic.
// The goal: sports-radio-smart dry wit. Never cringe. Never mean without cause.

import type { ArticleTag, RewriteMode } from './types';

// ─── Witty prefix/suffix banks ────────────────────────────────────────────────
const WITTY_NEGATIVE_PREFIXES = [
  'Naturally,',
  'Sure enough,',
  'Of course,',
  'In unrelated news,',
  'Checks out:',
  'Right on schedule:',
  'Nobody saw this coming, apparently:',
  'Adding to the pile:',
  'Another one:',
  'Fine.',
  'Classic.',
  'And so it goes:',
  'Feels familiar:',
  'As is tradition:',
  'Not ideal:',
  'Cool, cool:',
  'Anyway:',
  'Great timing on that one:',
  'The offseason giveth:',
  'Well.',
];

const WITTY_POSITIVE_PREFIXES = [
  'Finally.',
  'Good news, actually:',
  'Something nice:',
  'Hey, progress:',
  'Mark the date:',
  'Believe it:',
  'Genuinely encouraging:',
  'Not a drill:',
  'For real this time:',
  'Write this down:',
  'A win:',
  'Put this in the books:',
];

const WITTY_NEUTRAL_PREFIXES = [
  'Meanwhile:',
  'Also worth noting:',
  'Per the latest:',
  'For what it\'s worth:',
  'In other news:',
  'Developing:',
  'Worth a read:',
];

const SAVAGE_NEGATIVE_PREFIXES = [
  'Somehow, yes,',
  'In Washington tradition:',
  'The hits keep coming:',
  'Tell us something new:',
  'We live here:',
  'Honestly? Fine.',
  'Clock strikes, ground opens:',
  'You love to see it (you don\'t):',
  'Sure, why not.',
  'Never change.',
  'Phenomenal stuff.',
  'This organization:',
  'Ah yes, the classic:',
  'Building a culture, apparently:',
  'Good grief.',
  'Logging this one.',
  'The hits just keep coming:',
];

const SAVAGE_POSITIVE_PREFIXES = [
  'Actually good news — save this.',
  'This just in: something went right.',
  'Mark it.',
  'Hold.',
  'Real. Actually real.',
  'Screenshotting this.',
  'Don\'t jinx it, but:',
  'Something good happened. Documenting it.',
  'File under: unexpectedly fine.',
  'Against all odds:',
];

// ─── Topic-aware phrase substitutions ────────────────────────────────────────
const SUBSTITUTIONS: Array<[RegExp, string]> = [
  [/placed on (the )?ir/gi,               'shipped to IR'],
  [/non-football injury/gi,               'NFI list (nice)'],
  [/agrees to deal/gi,                    'agrees to terms'],
  [/restructures contract/gi,             'kicks the can'],
  [/expected to (be )?released/gi,        'likely getting the call'],
  [/parting ways/gi,                      'parting ways (classic)'],
  [/mutually agree/gi,                    'mutually agree (sure)'],
  [/looks to bounce back/gi,              'looks to be less bad'],
  [/heading into the offseason/gi,        'entering another offseason'],
  [/keys to success/gi,                   'talking points'],
  [/questions remain/gi,                  'questions remain (they always do)'],
  [/story developing/gi,                  'developing'],
  [/has emerged as a (top )?target/gi,    'is reportedly on the radar'],
  [/source(s)? close to the (team|situation)/gi, 'a source'],
  [/per (sources|reports)/gi,             'per sources'],
  [/contract extension/gi,               'extension talks'],
  [/ahead of schedule/gi,                'ahead of schedule (rare)'],
  [/the team announced/gi,               'officially'],
  [/a person familiar with/gi,           'a source'],
  [/ongoing (contract )?talks/gi,        'ongoing talks (so, unresolved)'],
  [/\blegacy\b/gi,                       'legacy (whatever that means)'],
  [/generational talent/gi,              'generational talent — too early to say, but'],
];

function applySubstitutions(text: string): string {
  let result = text;
  for (const [pattern, replacement] of SUBSTITUTIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function pickRandom<T>(arr: T[], seed: string): T {
  // Deterministic selection based on seed (headline text) so output is stable
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return arr[Math.abs(hash) % arr.length];
}

function capitalizeSentence(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function stripTrailingPunctuation(s: string): string {
  return s.replace(/[.!?]+$/, '');
}

// ─── Main rewrite function ────────────────────────────────────────────────────
export function rewriteHeadline(
  original: string,
  sentiment: 'positive' | 'negative' | 'neutral',
  tags:      ArticleTag[],
  mode:      RewriteMode,
): string {
  if (mode === 'straight') return original;

  const base    = applySubstitutions(original);
  const cleaned = stripTrailingPunctuation(base.trim());

  if (sentiment === 'neutral') {
    // Neutral stories: no snarky prefix, just clean substitutions
    return capitalizeSentence(cleaned);
  }

  if (mode === 'witty') {
    if (sentiment === 'negative') {
      const prefix = pickRandom(WITTY_NEGATIVE_PREFIXES, original);
      return `${prefix} ${capitalizeSentence(cleaned)}`;
    }
    if (sentiment === 'positive') {
      const prefix = pickRandom(WITTY_POSITIVE_PREFIXES, original);
      return `${prefix} ${capitalizeSentence(cleaned)}`;
    }
  }

  if (mode === 'savage') {
    if (sentiment === 'negative') {
      const prefix = pickRandom(SAVAGE_NEGATIVE_PREFIXES, original);
      return `${prefix} ${capitalizeSentence(cleaned)}`;
    }
    if (sentiment === 'positive') {
      const prefix = pickRandom(SAVAGE_POSITIVE_PREFIXES, original);
      return `${prefix} ${capitalizeSentence(cleaned)}`;
    }
  }

  return capitalizeSentence(cleaned);
}
