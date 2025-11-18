import { EditorialError, ErrorCodes } from '../types.js';

// ============================================
// PREMIUM KEYWORD RESEARCH APIS
// ============================================

/**
 * DataForSEO - Keyword Research
 * https://dataforseo.com/apis/keyword-data-api
 */
export async function researchKeywordsDataForSEO(keywords, apiKey, language = 'en') {
  try {
    const credentials = Buffer.from(`${apiKey}:`).toString('base64');

    const response = await fetch(
      'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            language_code: language,
            keywords: keywords.slice(0, 100), // Max 100 per request
          },
        ]),
      }
    );

    if (!response.ok) {
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status_code !== 20000) {
      throw new Error(`DataForSEO returned error: ${data.status_message}`);
    }

    const results = data.tasks[0].result.map((item) => ({
      keyword: item.keyword,
      premiumVolume: item.search_volume || 0,
      premiumCPC: item.cpc || null,
      premiumCompetition: item.competition || null,
      premiumDifficulty: estimateDifficultyFromCompetition(item.competition),
      source: 'datafoerseo',
    }));

    return results;
  } catch (error) {
    console.error('DataForSEO API error:', error);
    throw new EditorialError(
      'Failed to fetch keyword data from DataForSEO',
      ErrorCodes.RESEARCH_FAILED,
      500,
      { originalError: error.message }
    );
  }
}

/**
 * Ahrefs - Keyword Research
 * https://ahrefs.com/api/documentation
 */
export async function researchKeywordsAhrefs(keywords, apiKey, country = 'us') {
  try {
    const response = await fetch('https://api.ahrefs.com/v3/keywords-explorer/keyword', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords: keywords.slice(0, 50), // Max 50 per request
        country,
        mode: 'exact',
      }),
    });

    if (!response.ok) {
      throw new Error(`Ahrefs API error: ${response.status}`);
    }

    const data = await response.json();

    const results = data.keywords.map((kw) => ({
      keyword: kw.keyword,
      premiumVolume: kw.volume || 0,
      premiumDifficulty: kw.difficulty || null, // 0-100
      premiumCPC: kw.cpc || null,
      premiumCompetition: null,
      hasFeaturedSnippet: kw.features?.includes('featured_snippet') || false,
      hasPAA: kw.features?.includes('people_also_ask') || false,
      source: 'ahrefs',
    }));

    return results;
  } catch (error) {
    console.error('Ahrefs API error:', error);
    throw new EditorialError(
      'Failed to fetch keyword data from Ahrefs',
      ErrorCodes.RESEARCH_FAILED,
      500,
      { originalError: error.message }
    );
  }
}

/**
 * SEMrush - Keyword Research
 * https://www.semrush.com/api-documentation/
 */
export async function researchKeywordsSEMrush(keywords, apiKey, database = 'us') {
  const results = [];

  for (const keyword of keywords.slice(0, 50)) {
    try {
      const response = await fetch(
        `https://api.semrush.com/?type=phrase_this&key=${apiKey}&phrase=${encodeURIComponent(
          keyword
        )}&database=${database}&export_columns=Ph,Nq,Cp,Co,Nr,Td`
      );

      if (!response.ok) {
        console.warn(`SEMrush API error for "${keyword}": ${response.status}`);
        continue;
      }

      const csvText = await response.text();
      const lines = csvText.split('\n');

      if (lines.length > 1) {
        const values = lines[1].split(';');

        results.push({
          keyword: values[0],
          premiumVolume: parseInt(values[1]) || 0,
          premiumCPC: parseFloat(values[2]) || null,
          premiumCompetition: parseFloat(values[3]) || null,
          premiumDifficulty: parseFloat(values[5]) || null, // Keyword Difficulty (0-100)
          source: 'semrush',
        });
      }

      // Rate limit: 10 req/sec max
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`SEMrush API error for "${keyword}":`, error);
    }
  }

  return results;
}

// ============================================
// API KEY VALIDATION
// ============================================

export async function validateDataForSEOKey(apiKey) {
  try {
    const credentials = Buffer.from(`${apiKey}:`).toString('base64');

    const response = await fetch(
      'https://api.dataforseo.com/v3/appendix/user_data',
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
        },
      }
    );

    if (!response.ok) return false;

    const data = await response.json();
    return data.status_code === 20000;
  } catch {
    return false;
  }
}

export async function validateAhrefsKey(apiKey) {
  try {
    const response = await fetch('https://api.ahrefs.com/v3/site-explorer/domain', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: 'example.com',
        mode: 'domain',
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function validateSEMrushKey(apiKey) {
  try {
    const response = await fetch(
      `https://api.semrush.com/?type=domain_ranks&key=${apiKey}&export_columns=Db&domain=example.com`
    );

    if (!response.ok) return false;

    const text = await response.text();
    return !text.includes('ERROR');
  } catch {
    return false;
  }
}

// ============================================
// HELPERS
// ============================================

function estimateDifficultyFromCompetition(competition) {
  // Competition is 0-1 scale
  if (!competition) return null;

  if (competition < 0.3) return 25; // EASY
  if (competition < 0.6) return 50; // MEDIUM
  if (competition < 0.8) return 75; // HARD
  return 90; // VERY_HARD
}

// ============================================
// UNIFIED INTERFACE
// ============================================

export async function researchKeywordsPremium(
  keywords,
  provider,
  apiKey,
  options = {}
) {
  switch (provider) {
    case 'datafoerseo':
      return researchKeywordsDataForSEO(
        keywords,
        apiKey,
        options.language || 'en'
      );

    case 'ahrefs':
      return researchKeywordsAhrefs(keywords, apiKey, options.country || 'us');

    case 'semrush':
      return researchKeywordsSEMrush(keywords, apiKey, options.database || 'us');

    default:
      throw new EditorialError(
        `Unknown premium provider: ${provider}`,
        ErrorCodes.INVALID_INPUT,
        400
      );
  }
}

export async function validateAPIKey(provider, apiKey) {
  switch (provider) {
    case 'datafoerseo':
      return validateDataForSEOKey(apiKey);

    case 'ahrefs':
      return validateAhrefsKey(apiKey);

    case 'semrush':
      return validateSEMrushKey(apiKey);

    default:
      return false;
  }
}
