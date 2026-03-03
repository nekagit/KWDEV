/**
 * Web scraping and browser automation skill template for zeroclaw.
 * Used by the AI Bots Web tab and optionally the Templates tab.
 * Prioritizes zeroclaw's built-in browser automation; falls back to Puppeteer/Playwright/Selenium with anti-detection.
 */

export const WEB_SCRAPING_SKILL_MARKDOWN = `# Web scraping and browser automation

Use this skill when the bot must automate a browser: scrape pages, log into sites (e.g. Instagram), fill forms, or run flows that need to avoid bot detection. Prefer zeroclaw's built-in browser automation when the agent runs under zeroclaw; use Puppeteer/Playwright/Selenium with stealth and human-like behavior when you need more control or run outside zeroclaw.

## When to use
- Scraping content from websites that require JavaScript or login
- Logging into sites that use anti-bot protection (e.g. Instagram, protected dashboards)
- Form filling or multi-step flows that must look human
- Any automation where Cloudflare, Arkose, or similar detection may block headless browsers

## What to do
1. Prefer zeroclaw's built-in browser automation: it is one of the built-in tools (use \`zeroclaw tools list\` to confirm). Configure allowlisted domains and browser tool options in zeroclaw's TOML/config so the agent can browse only approved sites. Use this tool first for scraping and navigation when running inside zeroclaw.
2. When you need custom automation (e.g. anti-detection, human-like behavior for strict sites), use Puppeteer or Playwright with stealth plugins (puppeteer-extra-plugin-stealth, undetected-browser, or undetectable-fingerprint-browser), or Selenium with equivalent evasion.
3. For all clicks and movement, use human-like behavior: ghost-cursor (or equivalent) for mouse paths, random coordinates within elements, variable speed.
4. Add random delays between actions (e.g. 500–2000 ms) and occasional scrolls or small movements before critical steps (e.g. before clicking login).
5. For typing, use humanize (variable speed, occasional typos); avoid pasting credentials in one shot when the site may detect it.
6. Before or during login on protected sites: perform harmless human-like actions first (scroll the page a bit, click an empty area, then focus the login form).
7. Keep credentials and tokens in env/secrets (e.g. INSTAGRAM_USER, INSTAGRAM_PASSWORD or API keys); never hardcode.
8. Prefer headless with anti-detection when not using zeroclaw's browser tool; use undetectable-fingerprint-browser or similar for fingerprint spoofing and WebRTC/proxy if needed.

## Important
- Use zeroclaw's built-in browser automation when possible; it integrates with the agent's tool ecosystem and allowlist controls.
- Respect each site's Terms of Service and rate limits; automation can violate ToS (e.g. Instagram) and carry account or legal risk.
- Use stealth/undetected wrappers and human-like behavior to reduce detection when using Puppeteer/Playwright/Selenium; there is no guarantee sites won't block or flag accounts.
- Store secrets in the agent's Env tab (secrets/.env) or base .env; never log or expose credentials.
- Prefer minimal automation (e.g. only what's needed) and back off on errors or captchas.`;
