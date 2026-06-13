/*
 * Discord-bot detection from a repo's README. A dependency signal is unreliable
 * (raw webhooks, tweetnacl, ...), so we key on the README describing a bot.
 */

import { ghHeaders } from './http';

/**
 * Pure: does README text describe a Discord *bot*? Requires "bot" and "discord"
 * adjacent (either order, FR/EN) so a mere link to a Discord server doesn't
 * count.
 */
export function mentionsDiscordBot(readme: string): boolean {
  return /\bbot[\s-]+discord\b|\bdiscord[\s-]+bot\b/i.test(readme);
}

/**
 * Whether the repo is a Discord bot, inferred from its README. Reads the README
 * via the GitHub API, so it matches any filename and casing (README.md,
 * readme.md, ...).
 */
export async function fetchIsDiscordBot(repo: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/readme`, {
      headers: ghHeaders(),
    });
    if (!res.ok) return false;
    const d = await res.json();
    const text = Buffer.from(d.content ?? '', d.encoding === 'base64' ? 'base64' : 'utf8').toString(
      'utf8',
    );
    return mentionsDiscordBot(text);
  } catch (err) {
    console.warn(`[sources] README ${repo} fetch failed:`, (err as Error).message);
    return false;
  }
}
