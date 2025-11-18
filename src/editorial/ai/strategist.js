import Anthropic from '@anthropic-ai/sdk';
import { EditorialError, ErrorCodes } from '../types.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// AI STRATEGIST V2 (WITH KEYWORD RESEARCH)
// ============================================

export async function generateStrategyFromKeywordResearch({
  projectContext,
  keywordResearch,
  selectedClusters,
  selectedKeywords,
  conversationHistory = [],
  previousStrategy = null,
  userRequest = null,
  versionNumber = 1,
}) {
  const startTime = Date.now();

  try {
    const prompt = buildStrategyPromptV2({
      projectContext,
      keywordResearch,
      selectedClusters,
      selectedKeywords,
      conversationHistory,
      previousStrategy,
      userRequest,
      versionNumber,
    });

    console.log('[AI Strategist V2] Generating strategy v' + versionNumber);

    const response = await anthropic.messages.create({
      model: process.env.AI_MODEL_STRATEGIST || 'claude-sonnet-4-20250514',
      max_tokens: parseInt(process.env.AI_MAX_TOKENS_STRATEGIST || '16000'),
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const strategyText = response.content[0].text;
    const parsedStrategy = parseStrategyResponseV2(strategyText, versionNumber);

    const duration = Date.now() - startTime;

    return {
      ...parsedStrategy,
      aiMetadata: {
        model: response.model,
        tokenCount: response.usage.input_tokens + response.usage.output_tokens,
        processingMs: duration,
      },
    };
  } catch (error) {
    console.error('[AI Strategist V2] Error:', error);

    if (error.status === 401) {
      throw new EditorialError(
        'AI API authentication failed',
        ErrorCodes.AI_SERVICE_ERROR,
        500
      );
    }

    throw new EditorialError(
      'Strategy generation failed',
      ErrorCodes.AI_SERVICE_ERROR,
      500,
      { originalError: error.message }
    );
  }
}

// ============================================
// PROMPT BUILDER V2 (KEYWORD-DRIVEN)
// ============================================

function buildStrategyPromptV2({
  projectContext,
  keywordResearch,
  selectedClusters,
  selectedKeywords,
  conversationHistory,
  previousStrategy,
  userRequest,
  versionNumber,
}) {
  // Truncate knowledge base if too long to save tokens
  const knowledgeBase = projectContext.knowledgeBase.length > 4000 
    ? projectContext.knowledgeBase.substring(0, 4000) + '...[truncated]'
    : projectContext.knowledgeBase;

  let prompt = `You are an expert SEO strategist creating a data-driven editorial calendar.

# PROJECT CONTEXT
Name: ${projectContext.name}
Language: ${projectContext.language}
Target Audience: ${projectContext.target}
Business Objectives: ${projectContext.objectives}
Blog URL: ${projectContext.blogUrl || 'Not provided'}
Main Site URL: ${projectContext.mainSiteUrl || 'Not provided'}
First Publish Date: ${projectContext.firstPublishDate || 'Not specified'}

# KNOWLEDGE BASE (source of truth - DO NOT invent facts not present here)
${knowledgeBase}

# KEYWORD RESEARCH DATA (YOUR PRIMARY INPUT)

## Research Summary
- Total Keywords Found: ${keywordResearch.totalKeywordsFound}
- Total Clusters: ${keywordResearch.totalClustersFound}
- Selected Clusters: ${selectedClusters.length}
- Selected Keywords: ${selectedKeywords.length}

## Selected Keyword Clusters
${formatSelectedClusters(selectedClusters)}

## All Selected Keywords (${selectedKeywords.length} total)
${formatSelectedKeywords(selectedKeywords)}

# CRITICAL CONSTRAINTS

## 1. KEYWORD USAGE RULES
- You MUST use ONLY keywords from the selected list above
- Each post MUST have ONE unique primary keyword (no duplicates across all 30 posts)
- Each post should have 2-4 secondary keywords from the same cluster or related clusters
- DO NOT invent new keywords - use only what's in the research data

## 2. ANTI-CANNIBALIZATION (${projectContext.avoidCannibalization ? 'ENABLED' : 'DISABLED'})
${
  projectContext.avoidCannibalization
    ? `
**CANNIBALIZATION PREVENTION IS MANDATORY:**
- NEVER use keywords marked as "isInExistingContent: true"
- If a keyword is already covered, skip it or use a long-tail variant
- Each primary keyword MUST be unique across the entire calendar
- Flag any potential cannibalization risks in post rationale
`
    : `
**CANNIBALIZATION CHECK DISABLED:**
- You may use keywords already in existing content if strategically valuable
- Still avoid exact duplicates within the new calendar
`
}

## 3. DATA-DRIVEN PRIORITIZATION
Prioritize keywords with:
- Lower difficulty + higher volume = quick wins
- Featured snippet opportunities (hasFeaturedSnippet: true)
- High priority score clusters
- Balanced funnel distribution (60% ToF, 30% MoF, 10% BoF)

## 4. PILLAR CREATION FROM CLUSTERS
- Create 3-5 thematic pillars directly from the selected clusters
- Each pillar = one or more related clusters
- Pillar names should be clear, business-relevant, and SEO-focused
- Distribute 30 posts proportionally across pillars based on keyword count

# YOUR TASK

Create a comprehensive SEO editorial strategy with:

1. **3-5 Thematic Pillars** (derived from clusters)
   - Each pillar has: name, rationale (MAX 150 chars), focus keywords (from cluster), color, orderIndex

2. **30 Blog Posts** distributed across pillars
   - Each post MUST include:
     * Pillar assignment (by index 0-4)
     * Title (compelling, SEO-optimized, includes primary keyword naturally)
     * Primary keyword (from selected list, MUST BE UNIQUE)
     * Secondary keywords (2-4 from same/related clusters)
     * Search intent (from keyword data: INFORMATIONAL, NAVIGATIONAL, TRANSACTIONAL, COMMERCIAL)
     * Funnel stage (from keyword data: ToF, MoF, BoF)
     * Rationale (MAX 120 chars: vol + diff + SERP features + quick impact note)
     * Publish date (distributed over 30 days starting ${projectContext.firstPublishDate || 'today'})
     * Internal link suggestions (2-4 links to other posts, use postIndex 0-29)
     * External link suggestions (2-3 authoritative sources)
     * Keyword metrics summary (volume, difficulty, SERP features from research data)

`;

  if (previousStrategy && userRequest) {
    prompt += `
# PREVIOUS STRATEGY (v${versionNumber - 1})
Global Rationale: ${previousStrategy.globalRationale}

Pillars:
${previousStrategy.pillars.map((p, i) => `${i + 1}. ${p.name} - ${p.rationale}`).join('\n')}

Total Posts: ${previousStrategy.posts.length}
Primary Keywords Used: ${previousStrategy.posts.map((p) => p.primaryKeyword).join(', ')}

# USER MODIFICATION REQUEST
"${userRequest}"

IMPORTANT: Modify the strategy according to user request. Explain changes in changesSummary (MAX 200 chars). Maintain keyword uniqueness.
`;
  }

  prompt += `
# JSON GENERATION RULES (CRITICAL FOR VALID OUTPUT)

Your response MUST be valid, complete JSON:
1. Ensure ALL strings are properly escaped (use \\" for quotes inside strings)
2. Do NOT truncate the response - complete all 30 posts
3. Keep ALL text fields concise to avoid token limits:
   - globalRationale: MAX 400 chars
   - identifiedGaps: MAX 300 chars
   - pillar rationale: MAX 150 chars each
   - post rationale: MAX 120 chars each
4. If approaching token limits, prioritize completing the JSON structure over verbose explanations
5. Do NOT include any text before the opening { or after the closing }
6. Use only ASCII characters in rationale text - avoid special unicode characters
7. Double-check all strings are properly closed with quotes

# OUTPUT FORMAT

Respond with a valid JSON object in this EXACT format (NO markdown, NO backticks, JUST the JSON):

{
  "versionNumber": ${versionNumber},
  "globalRationale": "Overall strategy in 2-3 sentences MAX 400 chars: cluster-to-pillar logic, keyword distribution, expected outcomes",
  "identifiedGaps": "Opportunities vs competitors, underserved topics MAX 300 chars",
  "pillars": [
    {
      "name": "Pillar Name (derived from cluster)",
      "rationale": "Strategic importance MAX 150 chars",
      "focusKeywords": ["keyword1", "keyword2", "keyword3"],
      "orderIndex": 0,
      "color": "#3B82F6"
    }
  ],
  "posts": [
    {
      "pillarIndex": 0,
      "publishDate": "2025-01-20",
      "title": "SEO-Optimized Title Including Primary Keyword",
      "primaryKeyword": "exact keyword from research (must be unique)",
      "secondaryKeywords": ["secondary1", "secondary2", "secondary3"],
      "searchIntent": "INFORMATIONAL",
      "funnelStage": "ToF",
      "rationale": "Vol: X Diff: Y SERP: Z Impact note MAX 120 chars",
      "keywordMetrics": {
        "volume": 1200,
        "difficulty": "MEDIUM",
        "hasFeaturedSnippet": false,
        "hasPAA": true,
        "priorityScore": 75.5
      },
      "internalLinks": [
        {"postIndex": 5, "anchorText": "related article about X"},
        {"postIndex": 12, "anchorText": "our guide to Y"}
      ],
      "externalLinks": [
        {"url": "https://example.com/resource", "anchorText": "authoritative source", "reason": "Industry research"}
      ]
    }
  ],
  "changesSummary": "If modification: what changed and why MAX 200 chars"
}

# CRITICAL REMINDERS
- All 30 posts MUST have UNIQUE primary keywords (check the selected keywords list)
- Use ONLY keywords from the research data provided
- Include actual keyword metrics in each post's keywordMetrics field
- Distribute posts evenly across pillars based on cluster keyword counts
- Start dates from ${projectContext.firstPublishDate || 'today'} and spread over 30 days
- EVERY post must have 2-4 internal links and 2-3 external links
- Each post rationale must be ULTRA CONCISE: just metrics + quick impact note (MAX 120 chars)
- Prioritize quick wins early in calendar (low difficulty + high opportunity)
- KEEP ALL TEXT CONCISE TO ENSURE COMPLETE JSON OUTPUT
`;

  return prompt;
}

// ============================================
// CLUSTER & KEYWORD FORMATTERS
// ============================================

function formatSelectedClusters(clusters) {
  return clusters
    .map((cluster, index) => {
      return `
### Cluster ${index + 1}: ${cluster.name}
- Total Keywords: ${cluster.totalKeywords}
- Priority Score: ${cluster.priorityScore?.toFixed(1) || 'N/A'}
- Avg Difficulty: ${cluster.avgDifficulty?.toFixed(1) || 'N/A'}
- Total Volume: ${cluster.totalVolume || 'N/A'}
- Dominant Funnel: ${cluster.dominantFunnel || 'N/A'}
- Dominant Intent: ${cluster.dominantIntent || 'N/A'}
- AI Rationale: ${cluster.aiRationale || 'Not provided'}
- Top Keywords (by volume): ${cluster.keywords
        .filter((k) => k.isSelectedByAI || k.isSelectedByUser)
        .sort((a, b) => (b.premiumVolume || 0) - (a.premiumVolume || 0))
        .slice(0, 10)
        .map((k) => k.keyword)
        .join(', ')}
`;
    })
    .join('\n');
}

function formatSelectedKeywords(keywords) {
  return keywords
    .slice(0, 150) // Limit to avoid token overflow
    .map((kw) => {
      const volume = kw.premiumVolume || kw.freeVolume || 'N/A';
      const difficulty = kw.premiumDifficulty
        ? kw.premiumDifficulty.toFixed(0)
        : kw.freeDifficulty || 'N/A';

      const serpFeatures = [];
      if (kw.hasFeaturedSnippet) serpFeatures.push('FS');
      if (kw.hasPAA) serpFeatures.push('PAA');
      if (kw.hasVideoCarousel) serpFeatures.push('Video');
      
      const serpString = serpFeatures.length > 0 ? ` [${serpFeatures.join(',')}]` : '';
      const cannibalization = kw.isInExistingContent ? ' ⚠️ EXISTING CONTENT' : '';

      return `- "${kw.keyword}" | Vol: ${volume} | Diff: ${difficulty} | ${kw.funnelStage} | ${kw.searchIntent}${serpString}${cannibalization}`;
    })
    .join('\n');
}

// ============================================
// RESPONSE PARSER V2 (IMPROVED)
// ============================================

function parseStrategyResponseV2(aiResponseText, expectedVersion) {
  try {
    let jsonText = aiResponseText.trim();
    
    // Remove markdown code blocks more aggressively
    jsonText = jsonText.replace(/^```(?:json)?\s*/gm, '');
    jsonText = jsonText.replace(/```\s*$/gm, '');
    jsonText = jsonText.trim();
    
    // If still wrapped in backticks, extract
    const jsonMatch = jsonText.match(/^```(?:json)?\s*([\s\S]+?)\s*```$/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }
    
    // Try to find JSON object boundaries if response is truncated
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('No valid JSON object boundaries found');
    }
    
    jsonText = jsonText.substring(firstBrace, lastBrace + 1);

    const parsed = JSON.parse(jsonText);

    if (!parsed.pillars || parsed.pillars.length === 0) {
      throw new Error('No pillars defined in strategy');
    }

    if (!parsed.posts || parsed.posts.length === 0) {
      throw new Error('No posts defined in strategy');
    }

    // Check for duplicate primary keywords
    const keywordCounts = new Map();
    parsed.posts.forEach((post) => {
      const pk = post.primaryKeyword.toLowerCase();
      keywordCounts.set(pk, (keywordCounts.get(pk) || 0) + 1);
    });

    const duplicates = Array.from(keywordCounts.entries()).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.warn('[AI Strategist V2] Duplicate primary keywords detected:', duplicates);
    }

    // Normalize posts
    parsed.posts = parsed.posts.map((post) => ({
      ...post,
      publishDate: new Date(post.publishDate),
      internalLinks: post.internalLinks || [],
      externalLinks: post.externalLinks || [],
      keywordMetrics: post.keywordMetrics || {
        volume: null,
        difficulty: null,
        hasFeaturedSnippet: false,
        hasPAA: false,
        priorityScore: null,
      },
      funnelStage: post.funnelStage || 'ToF',
    }));

    // Normalize pillars
    parsed.pillars = parsed.pillars.map((pillar, index) => ({
      ...pillar,
      color: pillar.color || getDefaultPillarColor(index),
      orderIndex: pillar.orderIndex ?? index,
    }));

    return {
      versionNumber: expectedVersion,
      globalRationale: parsed.globalRationale || 'No rationale provided',
      identifiedGaps: parsed.identifiedGaps || 'No gaps identified',
      pillars: parsed.pillars,
      posts: parsed.posts,
      changesSummary: parsed.changesSummary || null,
    };
  } catch (error) {
    console.error('[AI Strategist V2] Parse failed:', error);
    console.error('Response preview:', aiResponseText.substring(0, 500));
    console.error('Response end:', aiResponseText.substring(aiResponseText.length - 500));

    throw new EditorialError(
      'Failed to parse AI strategy response. Invalid JSON format.',
      ErrorCodes.AI_SERVICE_ERROR,
      500,
      { 
        parsingError: error.message, 
        rawResponseStart: aiResponseText.substring(0, 500),
        rawResponseEnd: aiResponseText.substring(Math.max(0, aiResponseText.length - 500))
      }
    );
  }
}

// ============================================
// HELPERS
// ============================================

function getDefaultPillarColor(index) {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
  ];
  return colors[index % colors.length];
}

// ============================================
// LEGACY FALLBACK (if no keyword research)
// ============================================

export async function generateStrategyLegacy({
  projectContext,
  researchResults,
  conversationHistory = [],
  previousStrategy = null,
  userRequest = null,
  versionNumber = 1,
}) {
  // This is the old strategist.js logic
  // Keep for backward compatibility if user generates strategy without keyword research
  
  console.warn('[AI Strategist] Using legacy mode (no keyword research). Consider running keyword research first.');

  // Use old prompt from original strategist.js
  // (Copy exact logic from your uploaded strategist.js)
  
  throw new EditorialError(
    'Legacy strategy generation not implemented. Please run keyword research first.',
    ErrorCodes.INVALID_INPUT,
    400
  );
}