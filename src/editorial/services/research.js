import { EditorialError, ErrorCodes } from '../types.js';

// ============================================
// GOOGLE SUGGEST (Keyword Expansion)
// ============================================

/**
 * Espande keyword usando Google Suggest API (autocomplete)
 * Free, nessuna API key richiesta
 */
export async function expandKeywords(seedKeywords, language = 'en') {
  const results = [];

  for (const keyword of seedKeywords) {
    try {
      // Google Suggest endpoint (pubblico)
      const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(
        keyword
      )}&hl=${language}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`Google Suggest failed for "${keyword}": ${response.status}`);
        continue;
      }

      const data = await response.json();
      const suggestions = data[1] || []; // Array di stringhe suggerite

      results.push({
        seed: keyword,
        suggestions: suggestions.slice(0, 10), // Max 10 per keyword
      });
    } catch (error) {
      console.error(`Error expanding keyword "${keyword}":`, error);
    }
  }

  return {
    expandedKeywords: results,
    totalSuggestions: results.reduce((sum, r) => sum + r.suggestions.length, 0),
  };
}

// ============================================
// GOOGLE TRENDS (Volume Relativo)
// ============================================

/**
 * Confronta volume relativo di keyword usando Google Trends
 * Free, ma rate-limited (non abusare)
 */
export async function compareKeywordTrends(keywords, timeframe = 'today 12-m') {
  // NOTE: Google Trends non ha API ufficiale free
  // Qui usiamo un approccio semplificato: scraping leggero o library come google-trends-api
  // Per MVP, ritorniamo dati mock strutturati

  // TODO: Integrare google-trends-api npm package se necessario
  // import googleTrends from 'google-trends-api';

  try {
    // Mock response per MVP (sostituire con vera implementazione)
    const mockTrends = keywords.map((kw, index) => ({
      keyword: kw,
      relativeVolume: Math.floor(Math.random() * 100), // 0-100 score relativo
      trend: index % 2 === 0 ? 'rising' : 'stable',
    }));

    return {
      timeframe,
      keywords: mockTrends.sort((a, b) => b.relativeVolume - a.relativeVolume),
    };
  } catch (error) {
    console.error('Google Trends error:', error);
    throw new EditorialError(
      'Failed to fetch trends data',
      ErrorCodes.RESEARCH_FAILED,
      500,
      { originalError: error.message }
    );
  }
}

// ============================================
// COMPETITOR SCRAPING (Titoli + Meta)
// ============================================

/**
 * Scrapa titoli e meta description da competitor URLs
 * Usa Cheerio per parsing HTML leggero
 */
export async function scrapeCompetitorContent(urls) {
  const results = [];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; EditorialBot/1.0; +https://your-domain.com/bot)',
        },
        timeout: 10000, // 10s timeout
      });

      if (!response.ok) {
        console.warn(`Failed to fetch ${url}: ${response.status}`);
        continue;
      }

      const html = await response.text();

      // Parsing semplice senza Cheerio (per evitare dipendenze pesanti in MVP)
      // In produzione: import cheerio from 'cheerio'; const $ = cheerio.load(html);
      
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(
        /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i
      );
      const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi) || [];

      const titles = h1Matches.map((h1) => h1.replace(/<\/?h1[^>]*>/gi, '').trim());

      results.push({
        url,
        pageTitle: titleMatch ? titleMatch[1].trim() : null,
        metaDescription: descMatch ? descMatch[1].trim() : null,
        h1Titles: titles.slice(0, 20), // Max 20 H1
      });
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      results.push({
        url,
        error: error.message,
      });
    }
  }

  return results;
}

// ============================================
// TRENDING TOPICS (Reddit/HackerNews)
// ============================================

/**
 * Cerca topic trending su Reddit per un dato settore
 * Usa Reddit JSON API (pubblico, no auth per lettura)
 */
export async function fetchTrendingTopics(sector, language = 'en') {
  try {
    // Mapping settore -> subreddit (espandibile)
    const subredditMap = {
      tech: 'technology',
      marketing: 'marketing',
      seo: 'SEO',
      saas: 'SaaS',
      health: 'health',
      finance: 'personalfinance',
      default: 'all',
    };

    const subreddit = subredditMap[sector.toLowerCase()] || subredditMap.default;
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=20`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EditorialBot/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Reddit API returned ${response.status}`);
    }

    const data = await response.json();
    const posts = data.data.children.map((child) => ({
      title: child.data.title,
      score: child.data.score,
      url: child.data.url,
      numComments: child.data.num_comments,
    }));

    // Filtra per score minimo e ordina
    return posts
      .filter((p) => p.score > 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch (error) {
    console.error('Reddit trending topics error:', error);
    return []; // Fallback graceful
  }
}

// ============================================
// RESEARCH ORCHESTRATOR (esegue tutti i tool)
// ============================================

/**
 * Esegue ricerche parallele e aggrega risultati
 * Chiamata da AI Coordinator
 */
export async function executeResearch({
  keywordSeed = [],
  competitorUrls = [],
  sector = 'default',
  language = 'en',
}) {
  const startTime = Date.now();

  try {
    // Esegui ricerche in parallelo
    const [keywordResults, trendsResults, competitorResults, trendingTopics] =
      await Promise.allSettled([
        keywordSeed.length > 0 ? expandKeywords(keywordSeed, language) : null,
        keywordSeed.length > 0 ? compareKeywordTrends(keywordSeed) : null,
        competitorUrls.length > 0 ? scrapeCompetitorContent(competitorUrls) : null,
        fetchTrendingTopics(sector, language),
      ]);

    const duration = Date.now() - startTime;

    return {
      success: true,
      duration,
      results: {
        keywordExpansion:
          keywordResults.status === 'fulfilled' ? keywordResults.value : null,
        trends: trendsResults.status === 'fulfilled' ? trendsResults.value : null,
        competitors:
          competitorResults.status === 'fulfilled' ? competitorResults.value : null,
        trendingTopics:
          trendingTopics.status === 'fulfilled' ? trendingTopics.value : [],
      },
      errors: [
        keywordResults.status === 'rejected' ? keywordResults.reason : null,
        trendsResults.status === 'rejected' ? trendsResults.reason : null,
        competitorResults.status === 'rejected' ? competitorResults.reason : null,
        trendingTopics.status === 'rejected' ? trendingTopics.reason : null,
      ].filter(Boolean),
    };
  } catch (error) {
    console.error('Research orchestration failed:', error);
    throw new EditorialError(
      'Research execution failed',
      ErrorCodes.RESEARCH_FAILED,
      500,
      { originalError: error.message }
    );
  }
}