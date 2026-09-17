const DISCORD_SNOWFLAKE_PATTERN = /^\d{17,20}$/;
const MAX_UNSIGNED_64_BIT = 18_446_744_073_709_551_615n;

export function isDiscordSnowflake(value: string): boolean {
  if (!DISCORD_SNOWFLAKE_PATTERN.test(value)) return false;

  const numericValue = BigInt(value);
  return numericValue > 0n && numericValue <= MAX_UNSIGNED_64_BIT;
}
