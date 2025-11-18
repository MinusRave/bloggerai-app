import Anthropic from '@anthropic-ai/sdk';
import {
  expandKeywordsGoogleSuggest,
  scrapeSERPFeatures,
  fetchRedditTrends,
  scrapeCompetitorKeywords,
  estimateDifficultyFree,
  estimateVolumeFree,
} from './keywordResearchFree.js';
import { researchKeywordsPremium } from './keywordResearchPremium.js';
import { EditorialError, ErrorCodes } from '../types.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// MAIN ORCHESTRATOR
// ============================================

export async function executeKeywordResearch({
  projectContext,
  usePremiumAPI = false,
  premiumProvider = null,
  premiumAPIKey = null,
}) {
  const startTime = Date.now();
  const allKeywords = new Set();

  console.log('[Keyword Research] Starting research...');

  try {
    // STEP 1: Expand keywords using free tools
    const freeResults = await executeFreeResearch(projectContext);

    // Aggregate all unique keywords
    freeResults.expandedKeywords.forEach((k) => allKeywords.add(k.toLowerCase()));
    freeResults.competitorKeywords.forEach((k) => allKeywords.add(k.toLowerCase()));
    freeResults.trendingKeywords.forEach((k) => allKeywords.add(k.toLowerCase()));

    console.log(`[Keyword Research] Found ${allKeywords.size} unique keywords from free tools`);

    // STEP 2: Enrich with premium data (if enabled)
    let premiumResults = null;
    if (usePremiumAPI && premiumProvider && premiumAPIKey) {
      premiumResults = await enrichWithPremiumData(
        Array.from(allKeywords),
        premiumProvider,
        premiumAPIKey,
        projectContext.language
      );
      console.log(`[Keyword Research] Enriched with premium data from ${premiumProvider}`);
    }

    // STEP 3: Merge free + premium data
    const mergedKeywords = mergeKeywordData(
      Array.from(allKeywords),
      freeResults.serpFeatures,
      premiumResults
    );

    console.log(`[Keyword Research] Merged ${mergedKeywords.length} keywords with full data`);

    // STEP 4: Classify keywords (intent, funnel, cannibalization)
    const classifiedKeywords = await classifyKeywords(
      mergedKeywords,
      projectContext
    );

    // STEP 5: AI Clustering
    const clusters = await clusterKeywordsWithAI(
      classifiedKeywords,
      projectContext
    );

    console.log(`[Keyword Research] Created ${clusters.length} clusters`);

    // STEP 6: AI Selection (optimal keywords per cluster)
    const selectedClusters = await selectOptimalKeywords(clusters, projectContext);

    const duration = Date.now() - startTime;

    return {
      success: true,
      duration,
      totalKeywords: mergedKeywords.length,
      clusters: selectedClusters,
      rawData: {
        freeResults,
        premiumResults,
        classifiedKeywords,
      },
    };
  } catch (error) {
    console.error('[Keyword Research] Error:', error);
    throw new EditorialError(
      'Keyword research failed',
      ErrorCodes.RESEARCH_FAILED,
      500,
      { originalError: error.message }
    );
  }
}

// ============================================
// STEP 1: FREE RESEARCH
// ============================================

async function executeFreeResearch(projectContext) {
  const { keywordSeed, competitorUrls, language, target, objectives } = projectContext;

  const [googleSuggest, serpFeatures, redditTrends, competitorData] =
    await Promise.allSettled([
      keywordSeed.length > 0
        ? expandKeywordsGoogleSuggest(keywordSeed, language)
        : Promise.resolve([]),
      keywordSeed.length > 0
        ? scrapeSERPFeatures(keywordSeed.slice(0, 5), language)
        : Promise.resolve([]),
      fetchRedditTrends(inferSector(projectContext), language),
      competitorUrls.length > 0
        ? scrapeCompetitorKeywords(competitorUrls.slice(0, 3))
        : Promise.resolve([]),
    ]);

  // Extract keywords
  const expandedKeywords = googleSuggest.status === 'fulfilled'
    ? googleSuggest.value.flatMap((item) => item.suggestions)
    : [];

  const serpFeaturesData = serpFeatures.status === 'fulfilled'
    ? serpFeatures.value
    : [];

  const trendingKeywords = redditTrends.status === 'fulfilled'
    ? redditTrends.value.flatMap((post) => post.keywords)
    : [];

  const competitorKeywords = competitorData.status === 'fulfilled'
    ? competitorData.value.flatMap((comp) => comp.extractedKeywords || [])
    : [];

  return {
    expandedKeywords,
    serpFeatures: serpFeaturesData,
    trendingKeywords,
    competitorKeywords,
  };
}

// ============================================
// STEP 2: PREMIUM ENRICHMENT
// ============================================

async function enrichWithPremiumData(keywords, provider, apiKey, language) {
  try {
    // Process in batches
    const BATCH_SIZE = 50;
    const batches = [];

    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
      const batch = keywords.slice(i, i + BATCH_SIZE);
      batches.push(batch);
    }

    const results = [];

    for (const batch of batches) {
      const batchResults = await researchKeywordsPremium(batch, provider, apiKey, {
        language,
      });
      results.push(...batchResults);

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  } catch (error) {
    console.error('Premium enrichment failed:', error);
    return null; // Graceful fallback to free data only
  }
}

// ============================================
// STEP 3: MERGE DATA
// ============================================

function mergeKeywordData(allKeywords, serpFeatures, premiumResults) {
  const keywordMap = new Map();

  // Initialize with all keywords
  allKeywords.forEach((kw) => {
    keywordMap.set(kw, {
      keyword: kw,
      freeVolume: null,
      freeDifficulty: null,
      relativePopularity: null,
      premiumVolume: null,
      premiumDifficulty: null,
      premiumCPC: null,
      premiumCompetition: null,
      hasFeaturedSnippet: false,
      hasPAA: false,
      hasVideoCarousel: false,
      hasImagePack: false,
      hasLocalPack: false,
      source: 'google_suggest',
    });
  });

  // Merge SERP features
  serpFeatures.forEach((serp) => {
    const kw = serp.keyword.toLowerCase();
    if (keywordMap.has(kw)) {
      const existing = keywordMap.get(kw);
      keywordMap.set(kw, {
        ...existing,
        hasFeaturedSnippet: serp.hasFeaturedSnippet,
        hasPAA: serp.hasPAA,
        hasVideoCarousel: serp.hasVideoCarousel,
        hasImagePack: serp.hasImagePack,
        hasLocalPack: serp.hasLocalPack,
        freeDifficulty: estimateDifficultyFree(kw, serp),
      });
    }
  });

  // Merge premium data
  if (premiumResults) {
    premiumResults.forEach((premium) => {
      const kw = premium.keyword.toLowerCase();
      if (keywordMap.has(kw)) {
        const existing = keywordMap.get(kw);
        keywordMap.set(kw, {
          ...existing,
          premiumVolume: premium.premiumVolume,
          premiumDifficulty: premium.premiumDifficulty,
          premiumCPC: premium.premiumCPC,
          premiumCompetition: premium.premiumCompetition,
          hasFeaturedSnippet: premium.hasFeaturedSnippet || existing.hasFeaturedSnippet,
          hasPAA: premium.hasPAA || existing.hasPAA,
        });
      }
    });
  }

  return Array.from(keywordMap.values());
}

// ============================================
// STEP 4: CLASSIFY KEYWORDS
// ============================================

async function classifyKeywords(keywords, projectContext) {
  const prompt = buildClassificationPrompt(keywords, projectContext);

  const response = await anthropic.messages.create({
    model: process.env.AI_MODEL_COORDINATOR || 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  const classifications = parseClassificationResponse(response.content[0].text);

  // Merge classifications with keywords
  return keywords.map((kw) => {
    const classification = classifications.find(
      (c) => c.keyword.toLowerCase() === kw.keyword.toLowerCase()
    );

    return {
      ...kw,
      searchIntent: classification?.searchIntent || 'INFORMATIONAL',
      funnelStage: classification?.funnelStage || 'ToF',
      isInExistingContent: classification?.isInExistingContent || false,
      existingContentUrl: classification?.existingContentUrl || null,
    };
  });
}

// ============================================
// STEP 5: AI CLUSTERING
// ============================================

async function clusterKeywordsWithAI(keywords, projectContext) {
  const prompt = buildClusteringPrompt(keywords, projectContext);

  const response = await anthropic.messages.create({
    model: process.env.AI_MODEL_STRATEGIST || 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  const clusters = parseClusteringResponse(response.content[0].text);

  // Calculate cluster metrics
  return clusters.map((cluster, index) => {
    const clusterKeywords = keywords.filter((kw) =>
      cluster.keywords.includes(kw.keyword.toLowerCase())
    );

    const totalVolume = clusterKeywords.reduce(
      (sum, kw) => sum + (kw.premiumVolume || 0),
      0
    );

    const avgDifficulty =
      clusterKeywords.reduce(
        (sum, kw) => sum + (kw.premiumDifficulty || difficultyToNumber(kw.freeDifficulty)),
        0
      ) / clusterKeywords.length;

    const dominantFunnel = getMostCommon(clusterKeywords.map((k) => k.funnelStage));
    const dominantIntent = getMostCommon(clusterKeywords.map((k) => k.searchIntent));

    return {
      ...cluster,
      orderIndex: index,
      totalKeywords: clusterKeywords.length,
      avgDifficulty,
      totalVolume,
      priorityScore: calculatePriorityScore(clusterKeywords, avgDifficulty, totalVolume),
      dominantFunnel,
      dominantIntent,
      keywords: clusterKeywords,
    };
  });
}

// ============================================
// STEP 6: AI SELECTION
// ============================================

async function selectOptimalKeywords(clusters, projectContext) {
  const prompt = buildSelectionPrompt(clusters, projectContext);

  const response = await anthropic.messages.create({
    model: process.env.AI_MODEL_STRATEGIST || 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  const selections = parseSelectionResponse(response.content[0].text);

  // Mark selected keywords
  return clusters.map((cluster) => {
    const selection = selections.find((s) => s.clusterName === cluster.name);

    const updatedKeywords = cluster.keywords.map((kw) => ({
      ...kw,
      isSelectedByAI: selection?.selectedKeywords.includes(kw.keyword.toLowerCase()) || false,
      aiRationale: selection?.rationale || null,
    }));

    return {
      ...cluster,
      isSelectedByAI: selection?.isSelected || false,
      aiRationale: selection?.rationale || null,
      keywords: updatedKeywords,
    };
  });
}

// ============================================
// PROMPT BUILDERS
// ============================================

function buildClassificationPrompt(keywords, projectContext) {
  return `You are an SEO expert classifying keywords for an editorial calendar project.

# PROJECT CONTEXT
${JSON.stringify(projectContext, null, 2)}

# KEYWORDS TO CLASSIFY (${keywords.length} total)
${keywords.slice(0, 200).map((k) => k.keyword).join('\n')}

# YOUR TASK
For each keyword, classify:
1. **Search Intent**: INFORMATIONAL, NAVIGATIONAL, TRANSACTIONAL, COMMERCIAL
2. **Funnel Stage**: ToF (awareness), MoF (consideration), BoF (decision)
3. **Cannibalization Check**: Does this keyword already exist in blog/main site content?

# OUTPUT FORMAT
Respond with valid JSON array:
\`\`\`json
[
  {
    "keyword": "keyword phrase",
    "searchIntent": "INFORMATIONAL",
    "funnelStage": "ToF",
    "isInExistingContent": false,
    "existingContentUrl": null
  }
]
\`\`\``;
}

function buildClusteringPrompt(keywords, projectContext) {
  return `You are an SEO strategist grouping keywords into thematic clusters.

# PROJECT CONTEXT
Business: ${projectContext.name}
Objectives: ${projectContext.objectives}
Target: ${projectContext.target}

# KEYWORDS (${keywords.length} total)
${keywords.map((k) => `- ${k.keyword} [${k.funnelStage}] [${k.searchIntent}]`).join('\n')}

# YOUR TASK
Group these keywords into 5-10 thematic clusters based on:
1. Topic similarity
2. Search intent alignment
3. Funnel stage coherence
4. Business objective fit

Each cluster should:
- Have a clear, descriptive name
- Contain 10-30 related keywords
- Have strategic rationale

# OUTPUT FORMAT
\`\`\`json
[
  {
    "name": "Cluster Name",
    "rationale": "Why this cluster is important for the business",
    "keywords": ["keyword1", "keyword2", ...]
  }
]
\`\`\``;
}

function buildSelectionPrompt(clusters, projectContext) {
  return `You are an SEO strategist selecting optimal keywords for a 30-post editorial calendar.

# PROJECT CONTEXT
${JSON.stringify(projectContext, null, 2)}

# KEYWORD CLUSTERS (${clusters.length} clusters, ${clusters.reduce((sum, c) => sum + c.totalKeywords, 0)} keywords)
${clusters.map((c) => `
## ${c.name}
- Total Keywords: ${c.totalKeywords}
- Avg Difficulty: ${c.avgDifficulty?.toFixed(1) || 'N/A'}
- Total Volume: ${c.totalVolume || 'N/A'}
- Priority Score: ${c.priorityScore?.toFixed(1) || 'N/A'}
- Top Keywords: ${c.keywords.slice(0, 5).map(k => k.keyword).join(', ')}
`).join('\n')}

# YOUR TASK
Select the BEST keywords for a 30-post strategy:
1. **Prioritize quick wins**: Low difficulty + high opportunity
2. **Balance funnel coverage**: 60% ToF, 30% MoF, 10% BoF
3. **Ensure cluster representation**: Each important cluster should have keywords selected
4. **Avoid cannibalization**: Skip keywords already in existing content
5. **Consider SERP features**: Featured snippets = opportunity

Total to select: ~80-120 keywords (will be distributed across 30 posts)

# OUTPUT FORMAT
\`\`\`json
[
  {
    "clusterName": "Cluster Name",
    "isSelected": true/false,
    "rationale": "Why selected/rejected",
    "selectedKeywords": ["keyword1", "keyword2", ...]
  }
]
\`\`\``;
}

// ============================================
// RESPONSE PARSERS
// ============================================

function parseClassificationResponse(text) {
  try {
    const jsonMatch = text.match(/```json\n([\s\S]+?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse classification response:', error);
    return [];
  }
}

function parseClusteringResponse(text) {
  try {
    const jsonMatch = text.match(/```json\n([\s\S]+?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse clustering response:', error);
    return [];
  }
}

function parseSelectionResponse(text) {
  try {
    const jsonMatch = text.match(/```json\n([\s\S]+?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse selection response:', error);
    return [];
  }
}

// ============================================
// HELPERS
// ============================================

function inferSector(projectContext) {
  const text = `${projectContext.description} ${projectContext.objectives}`.toLowerCase();

  if (text.includes('tech') || text.includes('software')) return 'tech';
  if (text.includes('market') || text.includes('brand')) return 'marketing';
  if (text.includes('seo')) return 'seo';
  if (text.includes('saas')) return 'saas';
  if (text.includes('health')) return 'health';
  if (text.includes('financ')) return 'finance';

  return 'default';
}

function difficultyToNumber(difficulty) {
  const map = { EASY: 25, MEDIUM: 50, HARD: 75, VERY_HARD: 90 };
  return map[difficulty] || 50;
}

function getMostCommon(arr) {
  const counts = {};
  arr.forEach((item) => {
    counts[item] = (counts[item] || 0) + 1;
  });
  return Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));
}

function calculatePriorityScore(keywords, avgDifficulty, totalVolume) {
  // Lower difficulty + higher volume = higher priority
  const difficultyScore = 100 - (avgDifficulty || 50);
  const volumeScore = Math.min(100, (totalVolume || 0) / 100);
  
  // Featured snippet opportunity adds bonus
  const opportunityBonus = keywords.filter(k => k.hasFeaturedSnippet && k.freeDifficulty === 'EASY').length * 5;

  return (difficultyScore * 0.5 + volumeScore * 0.4 + opportunityBonus * 0.1);
}
