/**
 * Crown Paints Kenya — Colour Chart Scraper
 * Uses Playwright browser to bypass Cloudflare/bot protection.
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CATEGORIES = [
  { slug: 'accent', name: 'Accent', id: 734, expectedCount: 114 },
  { slug: 'clean-bright', name: 'Clean & Bright', id: 732, expectedCount: 288 },
  { slug: 'neutral-natural', name: 'Neutral & Natural', id: 731, expectedCount: 390 },
  { slug: 'pastels', name: 'Pastels', id: 730, expectedCount: 48 },
  { slug: 'soft-muted', name: 'Soft & Muted', id: 729, expectedCount: 282 },
  { slug: 'whites', name: 'Whites', id: 728, expectedCount: 84 },
];

const CATEGORY_URL = 'https://www.crownpaints.co.ke/colour-chart/';
const AJAX_URL = 'https://www.crownpaints.co.ke/wp-admin/admin-ajax.php';

async function fetchPage(page, catId, pageNum) {
  return await page.evaluate(async ({ ajaxUrl, catId, pageNum }) => {
    const formData = new URLSearchParams();
    formData.append('action', 'colour_chart_pagination');
    formData.append('data[cat]', catId);
    formData.append('data[page]', pageNum);

    const response = await fetch(ajaxUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      credentials: 'include',
    });

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return { message: text };
    }
  }, { ajaxUrl: AJAX_URL, catId, pageNum });
}

function parseColoursFromHtml(html, categoryName) {
  const results = [];
  const debugEntries = [];

  const blocks = html.split(/<div class="mix-inner[^"]*"[^>]*>/);

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    const styleMatch = block.match(/style="display:\s*block;\s*fill:(#[0-9a-fA-F]{3,6})/);
    if (!styleMatch) continue;

    const hex = styleMatch[1].toUpperCase();
    const codeMatch = block.match(/<p class=['"]color-number['"]>([^<]+)<\/p>/);
    const nameMatch = block.match(/<h1>([^<]+)<\/h1>/);

    const code = codeMatch ? codeMatch[1].trim() : '';
    const name = nameMatch ? nameMatch[1].trim() : '';

    const entry = { hex, code, name, rawText: '' };

    if (!code && !name) {
      debugEntries.push({ hex, containerHTML: block.slice(0, 500) });
    } else {
      results.push(entry);
    }
  }

  return { results, debugEntries };
}

async function fetchPageWithRetry(page, catId, pageNum, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await fetchPage(page, catId, pageNum);
      const raw = data.message || '';
      const html = typeof raw === 'string' ? raw : '';

      if (html.includes('Checking your browser') || html.includes('challenge')) {
        console.log(`  -> Bot challenge detected, waiting 15s...`);
        await new Promise((r) => setTimeout(r, 15000 + Math.random() * 5000));
        continue;
      }

      return html;
    } catch (err) {
      const delay = 2000 * attempt + Math.random() * 1000;
      console.log(`  -> Fetch failed (attempt ${attempt}/${maxRetries}): ${err.message}, retrying in ${Math.round(delay / 1000)}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error(`Failed after ${maxRetries} retries`);
}

async function scrapeCategory(browser, category, seen) {
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': CATEGORY_URL,
  });

  console.log(`  Visiting ${CATEGORY_URL} to establish session...`);
  await page.goto(CATEGORY_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise((r) => setTimeout(r, 3000));

  const allResults = [];
  const allDebug = [];

  for (let pageNum = 1; pageNum <= 50; pageNum++) {
    console.log(`  Fetching ${category.name} page ${pageNum}...`);

    try {
      const html = await fetchPageWithRetry(page, category.id, pageNum);

      if (!html || html.length < 50) {
        console.log(`  -> Empty response on page ${pageNum}, stopping`);
        break;
      }

      const { results, debugEntries } = parseColoursFromHtml(html, category.name);

      if (results.length === 0 && debugEntries.length === 0) {
        console.log(`  -> No colours found on page ${pageNum}, stopping`);
        break;
      }

      let newCount = 0;
      for (const r of results) {
        const key = `${r.hex}|${r.code}|${r.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          allResults.push({ category: category.name, ...r });
          newCount++;
        }
      }

      allDebug.push(...debugEntries.map((d) => ({ category: category.name, page: pageNum, ...d })));

      console.log(`  -> Found ${results.length} colours (${newCount} new) on page ${pageNum}`);

      if (newCount === 0 && pageNum > 1) {
        console.log(`  -> No new colours, stopping pagination`);
        break;
      }

      await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));
    } catch (err) {
      console.log(`  -> Error on page ${pageNum}: ${err.message}, stopping`);
      break;
    }
  }

  await page.close();
  return { results: allResults, debug: allDebug };
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  let allColours = [];
  let allDebug = [];

  if (fs.existsSync('crown_colours.json')) {
    try { allColours = JSON.parse(fs.readFileSync('crown_colours.json', 'utf8')); } catch {}
  }
  if (fs.existsSync('crown_colours_debug.json')) {
    try { allDebug = JSON.parse(fs.readFileSync('crown_colours_debug.json', 'utf8')); } catch {}
  }

  const seen = new Set();
  const uniqueColours = [];
  for (const c of allColours) {
    const key = `${c.hex}|${c.code}|${c.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueColours.push(c);
    }
  }
  if (uniqueColours.length !== allColours.length) {
    console.log(`Removed ${allColours.length - uniqueColours.length} duplicate entries`);
    allColours = uniqueColours;
  }

  for (const category of CATEGORIES) {
    console.log(`\nScraping category: ${category.name} (expecting ~${category.expectedCount})`);
    const { results, debug } = await scrapeCategory(browser, category, seen);
    console.log(`Done: ${category.name} -> ${results.length} colours found`);
    allColours.push(...results);
    allDebug.push(...debug);
  }

  await browser.close();

  fs.writeFileSync('crown_colours.json', JSON.stringify(allColours, null, 2));
  fs.writeFileSync('crown_colours_debug.json', JSON.stringify(allDebug, null, 2));

  console.log(`\n=== DONE ===`);
  console.log(`Total colours scraped: ${allColours.length}`);
  console.log(`Unresolved/debug entries: ${allDebug.length}`);
  console.log(`Output: crown_colours.json, crown_colours_debug.json`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
