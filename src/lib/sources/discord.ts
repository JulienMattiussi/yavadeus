/*
 * Discord-bot detection from a repo's README. A dependency signal is unreliable
 * (raw webhooks, tweetnacl, ...), so we key on the README describing a bot.
 * The README is fetched once by the fetch step (github.ts `fetchReadme`) and
 * passed to this pure check.
 */

/**
 * Pure: does README text describe a Discord *bot*? Requires "bot" and "discord"
 * adjacent (either order, FR/EN) so a mere link to a Discord server doesn't
 * count.
 */
export function mentionsDiscordBot(readme: string): boolean {
  return /\bbot[\s-]+discord\b|\bdiscord[\s-]+bot\b/i.test(readme);
}
