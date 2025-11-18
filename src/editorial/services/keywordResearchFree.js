import { EditorialError, ErrorCodes } from '../types.js';

// ============================================
// FREE KEYWORD RESEARCH TOOLS
// ============================================

/**
 * Google Suggest (Autocomplete) - FREE
 * Espande keyword usando l'API pubblica di Google
 */
export async function expandKeywordsGoogleSuggest(seedKeywords, language = 'en') {
  const results = [];

  for (const keyword of seedKeywords) {
    try {
      const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(
        keyword
      )}&hl=${language}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`Google Suggest failed for "${keyword}": ${response.status}`);
        continue;
      }

      const data = await response.json();
      const suggestions = data[1] || [];

      results.push({
        seed: keyword,
        suggestions: suggestions.slice(0, 10),
        source: 'google_suggest',
      });
    } catch (error) {
      console.error(`Error expanding keyword "${keyword}":`, error);
    }
  }

  return results;
}

/**
 * SERP Scraping - FREE
 * Estrae keyword correlate e PAA questions da Google SERP
 */
export async function scrapeSERPFeatures(keywords, language = 'en') {
  const results = [];

  for (const keyword of keywords) {
    try {
      // Usa ScraperAPI o Serpdog (free tier) per evitare ban
      // Per MVP: scraping diretto (rischio rate limit)
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
        keyword
      )}&hl=${language}`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        console.warn(`SERP scraping failed for "${keyword}": ${response.status}`);
        continue;
      }

      const html = await response.text();

      // Parse SERP features
      const serpData = {
        keyword,
        hasFeaturedSnippet: html.includes('featured-snippet') || html.includes('xpdopen'),
        hasPAA: html.includes('related-question-pair'),
        hasVideoCarousel: html.includes('video-voyager'),
        hasImagePack: html.includes('isch'),
        hasLocalPack: html.includes('lclpk'),
        relatedSearches: extractRelatedSearches(html),
        paaQuestions: extractPAAQuestions(html),
      };

      results.push(serpData);

      // Rate limiting: aspetta 2s tra richieste per evitare ban
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error scraping SERP for "${keyword}":`, error);
    }
  }

  return results;
}

/**
 * Reddit Trending Topics - FREE
 * Trova topic popolari su Reddit per un settore
 */
export async function fetchRedditTrends(sector, language = 'en') {
  try {
    const subredditMap = {
      tech: 'technology',
      marketing: 'marketing',
      seo: 'SEO',
      saas: 'SaaS',
      health: 'health',
      finance: 'personalfinance',
      ecommerce: 'ecommerce',
      ai: 'artificial',
      default: 'all',
    };

    const subreddit = subredditMap[sector.toLowerCase()] || subredditMap.default;
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=30`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EditorialCalendar/1.0 (Keyword Research Bot)',
      },
    });

    if (!response.ok) {
      throw new Error(`Reddit API returned ${response.status}`);
    }

    const data = await response.json();
    const posts = data.data.children
      .map((child) => ({
        title: child.data.title,
        score: child.data.score,
        url: `https://reddit.com${child.data.permalink}`,
        numComments: child.data.num_comments,
        keywords: extractKeywordsFromText(child.data.title),
      }))
      .filter((p) => p.score > 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    return posts;
  } catch (error) {
    console.error('Reddit trending topics error:', error);
    return [];
  }
}

/**
 * Competitor Content Scraping - FREE
 * Estrae keyword da competitor URLs
 */
export async function scrapeCompetitorKeywords(urls) {
  const results = [];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; EditorialBot/1.0; +https://your-domain.com/bot)',
        },
        timeout: 10000,
      });

      if (!response.ok) {
        console.warn(`Failed to fetch ${url}: ${response.status}`);
        continue;
      }

      const html = await response.text();

      const competitorData = {
        url,
        pageTitle: extractTitle(html),
        metaDescription: extractMetaDescription(html),
        metaKeywords: extractMetaKeywords(html),
        h1Titles: extractH1Titles(html),
        h2Titles: extractH2Titles(html),
        extractedKeywords: extractKeywordsFromHTML(html),
      };

      results.push(competitorData);

      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      results.push({ url, error: error.message });
    }
  }

  return results;
}

/**
 * Estimate Difficulty (FREE - heuristic based)
 * Stima la difficulty in base a SERP features e domain authority (approssimativa)
 */
export function estimateDifficultyFree(keyword, serpData) {
  let difficultyScore = 0;

  // Featured snippet = più difficile
  if (serpData.hasFeaturedSnippet) difficultyScore += 30;

  // PAA = media difficulty
  if (serpData.hasPAA) difficultyScore += 10;

  // Video carousel = può essere opportunità
  if (serpData.hasVideoCarousel) difficultyScore += 5;

  // Local pack = se non sei local business è difficile
  if (serpData.hasLocalPack) difficultyScore += 15;

  // Keyword length (long-tail = più facile)
  const wordCount = keyword.split(' ').length;
  if (wordCount === 1) difficultyScore += 20; // Short tail
  else if (wordCount === 2) difficultyScore += 10;
  else difficultyScore -= 10; // Long tail (più facile)

  // Normalizza 0-100
  difficultyScore = Math.max(0, Math.min(100, difficultyScore));

  // Converti in enum
  if (difficultyScore < 25) return 'EASY';
  if (difficultyScore < 50) return 'MEDIUM';
  if (difficultyScore < 75) return 'HARD';
  return 'VERY_HARD';
}

/**
 * Estimate Volume (FREE - range based on Google Trends)
 * Restituisce range approssimativo
 */
export function estimateVolumeFree(relativePopularity) {
  if (!relativePopularity) return '0-100';

  if (relativePopularity < 10) return '0-100';
  if (relativePopularity < 25) return '100-500';
  if (relativePopularity < 50) return '500-1K';
  if (relativePopularity < 75) return '1K-10K';
  return '10K+';
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractRelatedSearches(html) {
  const matches = html.match(/<div class="s75CSd[^>]*>([^<]+)<\/div>/gi) || [];
  return matches.map((m) => m.replace(/<[^>]+>/g, '').trim()).slice(0, 8);
}

function extractPAAQuestions(html) {
  const matches =
    html.match(/<div class="[^"]*related-question-pair[^"]*"[^>]*>([^<]+)<\/div>/gi) ||
    [];
  return matches.map((m) => m.replace(/<[^>]+>/g, '').trim()).slice(0, 5);
}

function extractKeywordsFromText(text) {
  // Tokenize e rimuovi stopwords
  const stopwords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
  ]);

  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopwords.has(word))
    .slice(0, 10);
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractMetaDescription(html) {
  const match = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i
  );
  return match ? match[1].trim() : null;
}

function extractMetaKeywords(html) {
  const match = html.match(
    /<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i
  );
  return match ? match[1].split(',').map((k) => k.trim()) : [];
}

function extractH1Titles(html) {
  const matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi) || [];
  return matches.map((m) => m.replace(/<[^>]+>/g, '').trim()).slice(0, 10);
}

function extractH2Titles(html) {
  const matches = html.match(/<h2[^>]*>([^<]+)<\/h2>/gi) || [];
  return matches.map((m) => m.replace(/<[^>]+>/g, '').trim()).slice(0, 20);
}

function extractKeywordsFromHTML(html) {
  // Estrai testo body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyText = bodyMatch ? bodyMatch[1] : html;

  // Rimuovi script/style
  const cleanText = bodyText
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return extractKeywordsFromText(cleanText);
}
