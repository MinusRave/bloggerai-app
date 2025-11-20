import Anthropic from '@anthropic-ai/sdk';
import { EditorialError, ErrorCodes } from '../types.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// AI RESEARCHER - KEYWORD SEED GENERATOR
// ============================================

/**
 * Generate intelligent keyword seeds from project context
 * Called at the start of keyword research to provide strategic seeds
 */
export async function generateKeywordSeeds(projectContext) {
  const startTime = Date.now();

  try {
    const prompt = buildSeedGenerationPrompt(projectContext);

    console.log('[AI Researcher] Generating keyword seeds from project context...');

    const response = await anthropic.messages.create({
      model: process.env.AI_MODEL_RESEARCHER || 'claude-sonnet-4-20250514',
      max_tokens: parseInt(process.env.AI_MAX_TOKENS_RESEARCHER || '8000'),
      temperature: 0.4, // Slightly creative but grounded
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = response.content[0].text;
    const seeds = parseKeywordSeeds(responseText);

    const duration = Date.now() - startTime;

    console.log(`[AI Researcher] Generated ${seeds.length} keyword seeds in ${duration}ms`);

    return {
      seeds,
      aiMetadata: {
        model: response.model,
        tokenCount: response.usage.input_tokens + response.usage.output_tokens,
        processingMs: duration,
      },
    };
  } catch (error) {
    console.error('[AI Researcher] Error:', error);

    if (error.status === 401) {
      throw new EditorialError(
        'AI API authentication failed. Check ANTHROPIC_API_KEY.',
        ErrorCodes.AI_SERVICE_ERROR,
        500
      );
    }

    throw new EditorialError(
      'Keyword seed generation failed',
      ErrorCodes.AI_SERVICE_ERROR,
      500,
      { originalError: error.message }
    );
  }
}

// ============================================
// PROMPT BUILDER
// ============================================

function buildSeedGenerationPrompt(projectContext) {
  const {
    name,
    description,
    target,
    objectives,
    knowledgeBase,
    language,
    location,
    mainSiteUrl,
    blogUrl,
  } = projectContext;

  // Truncate KB if too long
  const truncatedKB = knowledgeBase.length > 4000
    ? knowledgeBase.substring(0, 4000) + '...[truncated]'
    : knowledgeBase;

  return `You are an expert SEO strategist generating seed keywords for a content strategy.

# PROJECT CONTEXT
**Business Name:** ${name}
**Description:** ${description}
**Target Audience:** ${target}
**Business Objectives:** ${objectives}
**Location/Market:** ${location || 'Global'}
**Language:** ${language}
**Website:** ${mainSiteUrl || 'Not provided'}
**Blog URL:** ${blogUrl || 'Not provided'}

# KNOWLEDGE BASE (Services, Products, Features, Pricing)
${truncatedKB}

# YOUR TASK
Generate 40-60 high-quality seed keywords that will be expanded through keyword research tools. These seeds should be strategic starting points for content discovery.

## Requirements

### 1. FULL FUNNEL COVERAGE
- **ToF (Awareness - 50%)**: Problems, questions, educational topics
  - "how to [solve problem]"
  - "what is [concept]"
  - "[problem] explained"
  - "best practices for [topic]"
  
- **MoF (Consideration - 35%)**: Solutions, comparisons, alternatives
  - "[solution] vs [alternative]"
  - "best [product category] for [use case]"
  - "[product] alternatives"
  - "how to choose [product]"
  
- **BoF (Decision - 15%)**: Product-specific, pricing, implementation
  - "[product name] pricing"
  - "[product name] tutorial"
  - "[product name] vs [competitor]"
  - "[product name] review"

### 2. STRATEGIC DIVERSITY
Include seeds across multiple angles:
- **Core offerings**: Direct keywords about your products/services
- **Pain points**: Problems your target audience faces
- **Solutions**: How you solve those problems
- **Industry terms**: Vertical-specific jargon and concepts
- **Use cases**: Specific applications or scenarios
- **Comparisons**: You vs competitors or alternatives
- **Location-specific**: If relevant to the business
- **Long-tail**: Specific, intent-rich phrases

### 3. SPECIFICITY BALANCE
- **Broad seeds (20%)**: For discovery and expansion
  - Example: "content marketing"
- **Medium seeds (50%)**: Core targets with clear intent
  - Example: "B2B content marketing strategy"
- **Specific seeds (30%)**: Long-tail with high intent
  - Example: "content marketing strategy for SaaS startups"

### 4. BUSINESS ALIGNMENT
Every seed should:
- Attract the target audience: ${target}
- Support business objectives: ${objectives}
- Align with products/services in Knowledge Base
- Lead to conversions or business goals

## EXAMPLES

**Bad seeds (too generic):**
❌ "marketing"
❌ "business"
❌ "software"

**Good seeds (specific, intent-driven):**
✅ "B2B email marketing automation tools"
✅ "how to reduce SaaS customer churn"
✅ "content calendar software for agencies"
✅ "[your product] vs [competitor name]"
✅ "[service name] pricing calculator"
✅ "best [solution] for [specific use case]"

## OUTPUT FORMAT

Respond with a JSON object grouping seeds by category:

\`\`\`json
{
  "coreBusiness": [
    "Keywords directly about your products/services"
  ],
  "problemSolution": [
    "Customer pain points and solution keywords"
  ],
  "industry": [
    "Industry/vertical-specific terms and concepts"
  ],
  "useCases": [
    "Specific applications or scenarios"
  ],
  "comparison": [
    "Competitor comparisons and alternatives"
  ],
  "location": [
    "Location-specific keywords (if relevant, otherwise empty)"
  ],
  "longTail": [
    "Specific, high-intent long-tail variations"
  ]
}
\`\`\`

## CRITICAL RULES
1. Generate 40-60 seeds total across all categories
2. Be specific and actionable - avoid generic terms
3. Think about actual search queries your target audience uses
4. Consider the complete customer journey (awareness → decision)
5. Use information from Knowledge Base to create product-specific seeds
6. Include competitor names if you can infer them from context
7. Focus on commercial intent - seeds that lead to business value

Generate the keyword seeds now.`;
}

// ============================================
// RESPONSE PARSER
// ============================================

function parseKeywordSeeds(aiResponseText) {
  try {
    // Extract JSON from markdown code block if present
    const jsonMatch = aiResponseText.match(/```json\n([\s\S]+?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : aiResponseText;

    const parsed = JSON.parse(jsonText);

    // Flatten all categories into a single array
    const allSeeds = [
      ...(parsed.coreBusiness || []),
      ...(parsed.problemSolution || []),
      ...(parsed.industry || []),
      ...(parsed.useCases || []),
      ...(parsed.comparison || []),
      ...(parsed.location || []),
      ...(parsed.longTail || []),
    ];

    // Deduplicate and clean
    const uniqueSeeds = [...new Set(allSeeds.map((s) => s.toLowerCase().trim()))];

    // Validate minimum count
    if (uniqueSeeds.length < 20) {
      console.warn('[AI Researcher] Generated fewer than 20 seeds, may need prompt adjustment');
    }

    return uniqueSeeds;
  } catch (error) {
    console.error('[AI Researcher] Failed to parse AI response:', error);

    // Fallback: try to extract any quoted strings as seeds
    const fallbackSeeds = aiResponseText.match(/"([^"]+)"/g) || [];
    const cleanedFallback = fallbackSeeds
      .map((s) => s.replace(/"/g, '').toLowerCase().trim())
      .filter((s) => s.length > 3);

    if (cleanedFallback.length > 0) {
      console.log('[AI Researcher] Used fallback extraction, found', cleanedFallback.length, 'seeds');
      return [...new Set(cleanedFallback)];
    }

    // If complete failure, throw error
    throw new EditorialError(
      'Failed to parse keyword seeds from AI response',
      ErrorCodes.AI_SERVICE_ERROR,
      500,
      { originalError: error.message, responsePreview: aiResponseText.substring(0, 500) }
    );
  }
}