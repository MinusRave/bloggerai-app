import Anthropic from '@anthropic-ai/sdk';
import { EditorialError, ErrorCodes } from '../types.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// AI SITE ANALYZER
// Analyzes company website to extract business context
// ============================================

export async function analyzeCompanySite(mainSiteUrl) {
  const startTime = Date.now();

  console.log(`[AI Site Analyzer] Analyzing ${mainSiteUrl}...`);

  try {
    // Step 1: Discover and fetch key pages
    const pages = await discoverAndFetchPages(mainSiteUrl);

    if (pages.length === 0) {
      throw new Error('Could not fetch any pages from the website');
    }

    console.log(`[AI Site Analyzer] Fetched ${pages.length} pages`);

    // Step 2: Send to Claude for extraction
    const extraction = await extractBusinessContext(pages, mainSiteUrl);

    const duration = Date.now() - startTime;

    return {
      success: true,
      extractedInfo: extraction,
      pagesAnalyzed: pages.map(p => p.url),
      duration,
      aiMetadata: extraction.aiMetadata,
    };
  } catch (error) {
    console.error('[AI Site Analyzer] Error:', error);
    throw new EditorialError(
      'Site analysis failed',
      ErrorCodes.AI_SERVICE_ERROR,
      500,
      { originalError: error.message }
    );
  }
}

// ============================================
// PAGE DISCOVERY & FETCHING
// ============================================

async function discoverAndFetchPages(mainSiteUrl) {
  const pages = [];
  const baseUrl = new URL(mainSiteUrl).origin;

  // 1. Fetch homepage
  const homepage = await fetchPage(mainSiteUrl);
  if (homepage) {
    pages.push({ url: mainSiteUrl, type: 'homepage', content: homepage });
  }

  // 2. Check robots.txt for sitemap
  const sitemap = await findSitemapUrl(baseUrl);

  // 3. Try common page paths
  const commonPaths = [
    '/about',
    '/about-us',
    '/services',
    '/products',
    '/pricing',
    '/solutions',
    '/blog',
    '/resources',
  ];

  // Fetch common pages (limit to 5 successful fetches)
  let fetchedCount = 1; // Already have homepage
  for (const path of commonPaths) {
    if (fetchedCount >= 5) break;

    const url = `${baseUrl}${path}`;
    const content = await fetchPage(url);
    
    if (content) {
      pages.push({ url, type: path.replace('/', ''), content });
      fetchedCount++;
    }
  }

  // 4. If sitemap found, get recent blog posts
  if (sitemap && fetchedCount < 5) {
    const blogPosts = await getRecentPostsFromSitemap(sitemap);
    
    for (const postUrl of blogPosts.slice(0, 5 - fetchedCount)) {
      const content = await fetchPage(postUrl);
      if (content) {
        pages.push({ url: postUrl, type: 'blog', content });
        fetchedCount++;
      }
    }
  }

  return pages;
}

async function fetchPage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EditorialBot/1.0)',
      },
      timeout: 10000,
    });

    if (!response.ok) return null;

    const html = await response.text();
    
    // Extract meaningful content (title, meta, headings, main text)
    return extractPageContent(html);
  } catch (error) {
    console.warn(`[AI Site Analyzer] Failed to fetch ${url}:`, error.message);
    return null;
  }
}

async function findSitemapUrl(baseUrl) {
  try {
    // Check robots.txt
    const robotsResponse = await fetch(`${baseUrl}/robots.txt`, { timeout: 5000 });
    
    if (robotsResponse.ok) {
      const robotsText = await robotsResponse.text();
      const sitemapMatch = robotsText.match(/Sitemap:\s*(.+)/i);
      
      if (sitemapMatch) {
        return sitemapMatch[1].trim();
      }
    }

    // Try common sitemap paths
    const commonSitemaps = [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap_index.xml`,
      `${baseUrl}/post-sitemap.xml`,
      `${baseUrl}/blog-sitemap.xml`,
    ];

    for (const sitemapUrl of commonSitemaps) {
      const response = await fetch(sitemapUrl, { timeout: 5000 });
      if (response.ok) return sitemapUrl;
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function getRecentPostsFromSitemap(sitemapUrl) {
  try {
    const response = await fetch(sitemapUrl, { timeout: 10000 });
    if (!response.ok) return [];

    const xml = await response.text();
    
    // Extract URLs with lastmod dates
    const urlMatches = xml.match(/<loc>(.*?)<\/loc>/g) || [];
    const lastmodMatches = xml.match(/<lastmod>(.*?)<\/lastmod>/g) || [];

    const urls = urlMatches
      .map((match, index) => {
        const url = match.replace(/<\/?loc>/g, '');
        const lastmod = lastmodMatches[index]?.replace(/<\/?lastmod>/g, '');

        return {
          url,
          lastModified: lastmod ? new Date(lastmod) : new Date(0),
        };
      })
      .filter(item => 
        item.url.includes('/blog/') || 
        item.url.includes('/article/') ||
        item.url.includes('/post/')
      )
      .sort((a, b) => b.lastModified - a.lastModified)
      .slice(0, 10)
      .map(item => item.url);

    return urls;
  } catch (error) {
    return [];
  }
}

function extractPageContent(html) {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extract meta description
  const descMatch = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i
  );
  const metaDescription = descMatch ? descMatch[1].trim() : '';

  // Extract headings
  const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi) || [];
  const h2Matches = html.match(/<h2[^>]*>([^<]+)<\/h2>/gi) || [];
  const h3Matches = html.match(/<h3[^>]*>([^<]+)<\/h3>/gi) || [];

  const headings = [
    ...h1Matches.map(h => h.replace(/<[^>]+>/g, '').trim()),
    ...h2Matches.slice(0, 10).map(h => h.replace(/<[^>]+>/g, '').trim()),
    ...h3Matches.slice(0, 5).map(h => h.replace(/<[^>]+>/g, '').trim()),
  ];

  // Extract main text (simplified - get paragraphs)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;

  // Remove scripts, styles, nav, footer
  const cleanHtml = bodyHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');

  const pMatches = cleanHtml.match(/<p[^>]*>([^<]+)<\/p>/gi) || [];
  const paragraphs = pMatches
    .map(p => p.replace(/<[^>]+>/g, '').trim())
    .filter(p => p.length > 50)
    .slice(0, 15);

  return {
    title,
    metaDescription,
    headings,
    paragraphs,
  };
}

// ============================================
// AI EXTRACTION
// ============================================

async function extractBusinessContext(pages, mainSiteUrl) {
  const prompt = buildExtractionPrompt(pages, mainSiteUrl);

  const response = await anthropic.messages.create({
    model: process.env.AI_MODEL_SITE_ANALYZER || 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = response.content[0].text;
  const extracted = parseExtractionResponse(responseText);

  return {
    ...extracted,
    aiMetadata: {
      model: response.model,
      tokenCount: response.usage.input_tokens + response.usage.output_tokens,
      processingMs: 0,
    },
  };
}

function buildExtractionPrompt(pages, mainSiteUrl) {
  const pagesSummary = pages.map((page, index) => `
### PAGE ${index + 1}: ${page.type.toUpperCase()} (${page.url})

**Title:** ${page.content.title}

**Meta Description:** ${page.content.metaDescription}

**Headings:**
${page.content.headings.slice(0, 10).join('\n')}

**Content Sample:**
${page.content.paragraphs.slice(0, 5).join('\n\n')}
`).join('\n\n---\n\n');

  return `You are analyzing a company website to extract business context for an editorial calendar AI.

# WEBSITE
${mainSiteUrl}

# PAGES ANALYZED
${pagesSummary}

# YOUR TASK
Extract the following information from the website content above:

1. **Business Description** (2-3 sentences)
   - What does this company do?
   - What products/services do they offer?

2. **Target Audience** (1-2 sentences)
   - Who are their customers?
   - What market segment do they serve?

3. **Business Objectives** (1-2 sentences)
   - What are their likely business goals?
   - What actions do they want visitors to take?

4. **Knowledge Base** (comprehensive)
   Extract factual information about:
   - Products/services offered
   - Features and capabilities
   - Pricing information (if found)
   - Company values/mission
   - Key differentiators
   - Industries served
   - Use cases or applications

5. **Existing Blog Topics** (if blog pages found)
   - List the main topics covered in their blog
   - What keywords/themes do they already target?

6. **Location/Market**
   - Geographic focus (if mentioned)
   - Is it B2B or B2C?

# OUTPUT FORMAT
Respond with valid JSON:

\`\`\`json
{
  "description": "Clear 2-3 sentence description",
  "target": "Target audience description",
  "objectives": "Business objectives",
  "knowledgeBase": "Comprehensive factual information about the company, products, services, pricing, etc. Be detailed and include specific information found on the site.",
  "location": "Geographic market or 'Global'",
  "businessType": "B2B" | "B2C" | "B2B+B2C",
  "existingBlogTopics": ["topic1", "topic2", ...],
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}
\`\`\`

CRITICAL RULES:
- Only extract information that's explicitly stated on the website
- If information is missing, use "Not found" or leave arrays empty
- Be factual and specific - avoid assumptions
- Knowledge base should be comprehensive (200-500 words)
- Include specific product names, features, pricing if available`;
}

function parseExtractionResponse(aiResponseText) {
  try {
    const jsonMatch = aiResponseText.match(/```json\n([\s\S]+?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : aiResponseText;

    const parsed = JSON.parse(jsonText);

    return {
      description: parsed.description || '',
      target: parsed.target || '',
      objectives: parsed.objectives || '',
      knowledgeBase: parsed.knowledgeBase || '',
      location: parsed.location || 'Global',
      businessType: parsed.businessType || 'B2B',
      existingBlogTopics: parsed.existingBlogTopics || [],
      confidence: parsed.confidence || 'MEDIUM',
    };
  } catch (error) {
    console.error('[AI Site Analyzer] Failed to parse response:', error);
    throw new Error('Failed to parse site analysis response');
  }
}