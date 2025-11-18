import Anthropic from '@anthropic-ai/sdk';
import { EditorialError, ErrorCodes } from '../types.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// AI VALIDATOR (AGGIORNATO)
// ============================================

export async function validatePostAgainstKB(post, knowledgeBase) {
  const startTime = Date.now();

  try {
    const prompt = buildValidationPrompt(post, knowledgeBase);

    const response = await anthropic.messages.create({
      model: process.env.AI_MODEL_VALIDATOR || 'claude-sonnet-4-20250514',
      max_tokens: parseInt(process.env.AI_MAX_TOKENS_VALIDATOR || '2000'),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const validationText = response.content[0].text;
    const result = parseValidationResponse(validationText);

    const duration = Date.now() - startTime;

    return {
      ...result,
      aiMetadata: {
        model: response.model,
        tokenCount: response.usage.input_tokens + response.usage.output_tokens,
        processingMs: duration,
      },
      kbSnapshot: knowledgeBase.substring(0, 1000),
    };
  } catch (error) {
    console.error('[AI Validator] Error:', error);

    return {
      isValid: true,
      confidenceLevel: 'LOW',
      warnings: [
        {
          type: 'generic_warning',
          message: 'Validation service temporarily unavailable',
          detail: error.message,
        },
      ],
      aiMetadata: {
        model: 'error-fallback',
        tokenCount: 0,
        processingMs: Date.now() - startTime,
      },
      kbSnapshot: knowledgeBase.substring(0, 1000),
    };
  }
}

// ============================================
// BATCH VALIDATION (invariato)
// ============================================

export async function validateAllPosts(posts, knowledgeBase) {
  const BATCH_SIZE = 5;
  const results = [];

  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);
    
    console.log(`[AI Validator] Validating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(posts.length / BATCH_SIZE)}`);

    const batchResults = await Promise.all(
      batch.map((post) => validatePostAgainstKB(post, knowledgeBase))
    );

    results.push(...batchResults);

    if (i + BATCH_SIZE < posts.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// ============================================
// PROMPT BUILDER (invariato)
// ============================================

function buildValidationPrompt(post, knowledgeBase) {
  return `You are a content validator ensuring blog posts do not contain false claims or hallucinations.

# KNOWLEDGE BASE (source of truth)
${knowledgeBase}

# POST TO VALIDATE
Title: ${post.title}
Primary Keyword: ${post.primaryKeyword}
Secondary Keywords: ${post.secondaryKeywords.join(', ')}
Rationale: ${post.rationale}

# YOUR TASK
Analyze the post and check for:
1. **Claim mismatches**: Does the title or rationale reference services/products/prices NOT in the Knowledge Base?
2. **Specificity issues**: Does it claim "we offer X" or "our price is Y" when this isn't documented?
3. **Generic vs Specific**: Generic topics (e.g., "best practices for SEO") are OK even if not in KB. Specific claims about the business MUST be in KB.

# VALIDATION RULES
- If the post is about a **generic industry topic** (how-to, best practices, trends) → VALID (HIGH confidence)
- If the post mentions **specific services, features, or offers** → CHECK KB:
  - Found in KB → VALID (HIGH confidence)
  - Not found in KB → INVALID or LOW confidence + warning
- If unsure → Mark as MEDIUM confidence + explanatory warning

# OUTPUT FORMAT
Respond with a valid JSON object:

\`\`\`json
{
  "isValid": true/false,
  "confidenceLevel": "HIGH" | "MEDIUM" | "LOW",
  "warnings": [
    {
      "type": "claim_not_in_kb" | "keyword_unverified" | "service_mismatch" | "generic_warning",
      "message": "Brief user-facing message",
      "detail": "Technical detail for debugging"
    }
  ]
}
\`\`\`

IMPORTANT:
- Be pragmatic: Don't flag generic educational content
- Focus on specific factual claims about the business
- If post is clearly generic → isValid: true, confidenceLevel: HIGH, warnings: []
`;
}

// ============================================
// RESPONSE PARSER (invariato)
// ============================================

function parseValidationResponse(aiResponseText) {
  try {
    const jsonMatch = aiResponseText.match(/```json\n([\s\S]+?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : aiResponseText;

    const parsed = JSON.parse(jsonText);

    return {
      isValid: parsed.isValid ?? true,
      confidenceLevel: parsed.confidenceLevel || 'MEDIUM',
      warnings: parsed.warnings || [],
    };
  } catch (error) {
    console.error('[AI Validator] Failed to parse response:', error);

    return {
      isValid: true,
      confidenceLevel: 'LOW',
      warnings: [
        {
          type: 'generic_warning',
          message: 'Validation response parsing failed',
          detail: error.message,
        },
      ],
    };
  }
}

// ============================================
// CANNIBALIZATION DETECTION (NEW)
// ============================================

export function validateKeywordUniqueness(posts) {
  const keywordMap = new Map();
  const duplicates = [];

  posts.forEach((post, index) => {
    const pk = post.primaryKeyword.toLowerCase().trim();
    
    if (keywordMap.has(pk)) {
      duplicates.push({
        keyword: pk,
        postIndices: [keywordMap.get(pk), index],
        titles: [posts[keywordMap.get(pk)].title, post.title],
      });
    } else {
      keywordMap.set(pk, index);
    }
  });

  return {
    isValid: duplicates.length === 0,
    duplicates,
  };
}