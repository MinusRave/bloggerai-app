import Anthropic from '@anthropic-ai/sdk';
import { executeResearch } from '../services/research.js';
import { EditorialError, ErrorCodes } from '../types.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// AI RESEARCH COORDINATOR (Step 1)
// ============================================

/**
 * Decide quali ricerche fare e le esegue
 * Input: project context
 * Output: aggregated research results + rationale
 */
export async function coordinateResearch(projectContext) {
  const startTime = Date.now();

  try {
    // 1. Chiedi ad AI quali ricerche servono
    const decisionPrompt = buildResearchDecisionPrompt(projectContext);

    const decisionResponse = await anthropic.messages.create({
      model: process.env.AI_MODEL_COORDINATOR || 'claude-sonnet-4-20250514',
      max_tokens: parseInt(process.env.AI_MAX_TOKENS_COORDINATOR || '4000'),
      messages: [
        {
          role: 'user',
          content: decisionPrompt,
        },
      ],
    });

    const decisionText = decisionResponse.content[0].text;
    const researchPlan = parseResearchDecision(decisionText);

    console.log('[AI Coordinator] Research plan:', researchPlan);

    // 2. Esegui ricerche basate su decisione AI
    const researchResults = await executeResearch({
      keywordSeed: researchPlan.doKeywordExpansion
        ? projectContext.keywordSeed || []
        : [],
      competitorUrls: researchPlan.doCompetitorAnalysis
        ? projectContext.competitorUrls || []
        : [],
      sector: inferSectorFromContext(projectContext),
      language: projectContext.language,
    });

    // 3. Aggrega e structure output
    const duration = Date.now() - startTime;

    return {
      researchPlan,
      results: researchResults.results,
      rationale: researchPlan.rationale,
      toolsUsed: researchPlan.toolsUsed,
      aiMetadata: {
        model: decisionResponse.model,
        tokenCount: decisionResponse.usage.input_tokens + decisionResponse.usage.output_tokens,
        processingMs: duration,
      },
    };
  } catch (error) {
    console.error('[AI Coordinator] Error:', error);

    if (error.status === 401) {
      throw new EditorialError(
        'AI API authentication failed. Check ANTHROPIC_API_KEY.',
        ErrorCodes.AI_SERVICE_ERROR,
        500
      );
    }

    throw new EditorialError(
      'Research coordination failed',
      ErrorCodes.RESEARCH_FAILED,
      500,
      { originalError: error.message }
    );
  }
}

// ============================================
// PROMPT BUILDER
// ============================================

function buildResearchDecisionPrompt(projectContext) {
  return `You are a research coordinator for an AI-powered editorial calendar system. 
Your task: decide which research actions to perform based on the project context below.

# PROJECT CONTEXT
Name: ${projectContext.name}
Description: ${projectContext.description}
Language: ${projectContext.language}
Target Audience: ${projectContext.target}
Objectives: ${projectContext.objectives}
Blog URL: ${projectContext.blogUrl || 'Not provided'}
Competitor URLs: ${projectContext.competitorUrls?.join(', ') || 'None'}
Keyword Seeds: ${projectContext.keywordSeed?.join(', ') || 'None'}

Knowledge Base (first 500 chars):
${projectContext.knowledgeBase.substring(0, 500)}...

# YOUR TASK
Decide which of these research actions should be performed:
1. Keyword Expansion (via Google Suggest) - expand seed keywords into related queries
2. Competitor Analysis (via scraping) - extract topics/titles from competitor sites
3. Trending Topics (via Reddit) - find currently popular topics in the sector
4. Trends Comparison (via Google Trends) - compare relative popularity of keywords

Respond with a JSON object in this exact format:
\`\`\`json
{
  "doKeywordExpansion": true/false,
  "doCompetitorAnalysis": true/false,
  "doTrendingTopics": true/false,
  "doTrendsComparison": true/false,
  "rationale": "Brief explanation of why you chose these actions",
  "toolsUsed": ["google_suggest", "scraping", "reddit", "google_trends"]
}
\`\`\`

IMPORTANT: Be strategic. If keyword seeds are empty, skip keyword expansion. If no competitor URLs, skip competitor analysis. Focus on what will provide maximum value for strategy generation.`;
}

// ============================================
// RESPONSE PARSER
// ============================================

function parseResearchDecision(aiResponseText) {
  try {
    // Estrai JSON da markdown code block se presente
    const jsonMatch = aiResponseText.match(/```json\n([\s\S]+?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : aiResponseText;

    const parsed = JSON.parse(jsonText);

    return {
      doKeywordExpansion: parsed.doKeywordExpansion || false,
      doCompetitorAnalysis: parsed.doCompetitorAnalysis || false,
      doTrendingTopics: parsed.doTrendingTopics || false,
      doTrendsComparison: parsed.doTrendsComparison || false,
      rationale: parsed.rationale || 'No rationale provided',
      toolsUsed: parsed.toolsUsed || [],
    };
  } catch (error) {
    console.error('[AI Coordinator] Failed to parse decision:', error);
    // Fallback: esegui tutte le ricerche disponibili
    return {
      doKeywordExpansion: true,
      doCompetitorAnalysis: true,
      doTrendingTopics: true,
      doTrendsComparison: true,
      rationale: 'Fallback: executing all available research',
      toolsUsed: ['google_suggest', 'scraping', 'reddit', 'google_trends'],
    };
  }
}

// ============================================
// HELPER
// ============================================

function inferSectorFromContext(projectContext) {
  const text = `${projectContext.description} ${projectContext.objectives}`.toLowerCase();

  if (text.includes('tech') || text.includes('software')) return 'tech';
  if (text.includes('market') || text.includes('brand')) return 'marketing';
  if (text.includes('seo') || text.includes('search')) return 'seo';
  if (text.includes('saas') || text.includes('subscription')) return 'saas';
  if (text.includes('health') || text.includes('wellness')) return 'health';
  if (text.includes('financ') || text.includes('invest')) return 'finance';

  return 'default';
}