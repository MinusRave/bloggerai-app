import { EditorialError, ErrorCodes } from '../types.js';

// ============================================
// OWN CONTENT ANALYZER
// Scrape user's blog to detect cannibalization & find gaps
// ============================================

/**
 * Analyze user's blog to extract:
 * - Existing blog posts
 * - Keywords already covered
 * - Content gaps
 * - Ranking opportunities
 */
export async function analyzeOwnContent(blogUrl, mainSiteUrl) {
  console.log(`[Own Content Analyzer] Analyzing ${blogUrl}...`);

  const results = {
    blogPosts: [],
    existingKeywords: new Set(),
    existingTopics: new Set(),
    totalPosts: 0,
    analyzed: false,
  };

  try {
    // 1. Try to find sitemap first (most efficient)
    const sitemapUrl = `${blogUrl}/sitemap.xml`;
    const sitemapPosts = await tryParseSitemap(sitemapUrl);

    if (sitemapPosts.length > 0) {
      console.log(`[Own Content Analyzer] Found ${sitemapPosts.length} posts in sitemap`);
      results.blogPosts = sitemapPosts;
    } else {
      // 2. Fallback: Scrape blog homepage
      console.log('[Own Content Analyzer] No sitemap found, scraping homepage...');
      results.blogPosts = await scrapeBlogHomepage(blogUrl);
    }

    // 3. Extract keywords from each post
    for (const post of results.blogPosts.slice(0, 50)) { // Limit to 50 most recent
      const keywords = await extractKeywordsFromPost(post.url);
      keywords.forEach(kw => results.existingKeywords.add(kw.toLowerCase()));
      
      // Extract topic from title
      const topic = extractTopicFromTitle(post.title);
      if (topic) results.existingTopics.add(topic.toLowerCase());
    }

    results.totalPosts = results.blogPosts.length;
    results.analyzed = true;

    console.log(`[Own Content Analyzer] Analysis complete: ${results.totalPosts} posts, ${results.existingKeywords.size} keywords`);

    return results;
  } catch (error) {
    console.error('[Own Content Analyzer] Error:', error);
    return {
      ...results,
      analyzed: false,
      error: error.message,
    };
  }
}

/**
 * Try to parse XML sitemap
 */
async function tryParseSitemap(sitemapUrl) {
  try {
    const response = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EditorialBot/1.0)',
      },
      timeout: 10000,
    });

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();

    // Parse XML (basic regex for MVP, use xml2js for production)
    const urlMatches = xml.match(/<loc>(.*?)<\/loc>/g) || [];
    const lastmodMatches = xml.match(/<lastmod>(.*?)<\/lastmod>/g) || [];

    const posts = urlMatches.map((match, index) => {
      const url = match.replace(/<\/?loc>/g, '');
      const lastmod = lastmodMatches[index]?.replace(/<\/?lastmod>/g, '');

      return {
        url,
        title: extractTitleFromUrl(url),
        lastModified: lastmod ? new Date(lastmod) : null,
        source: 'sitemap',
      };
    });

    return posts.filter(p => p.url.includes('/blog/') || p.url.includes('/article/'));
  } catch (error) {
    console.warn('[Own Content Analyzer] Sitemap parsing failed:', error.message);
    return [];
  }
}

/**
 * Scrape blog homepage to find posts
 */
async function scrapeBlogHomepage(blogUrl) {
  try {
    const response = await fetch(blogUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EditorialBot/1.0)',
      },
      timeout: 10000,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${blogUrl}: ${response.status}`);
    }

    const html = await response.text();

    // Extract blog post links (common patterns)
    const linkMatches = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi) || [];

    const posts = linkMatches
      .map(match => {
        const hrefMatch = match.match(/href=["']([^"']+)["']/);
        const titleMatch = match.match(/>([^<]+)<\/a>/);

        if (!hrefMatch || !titleMatch) return null;

        const url = hrefMatch[1];
        const title = titleMatch[1].trim();

        // Filter for blog posts
        if (!url.includes('/blog/') && !url.includes('/article/') && !url.includes('/post/')) {
          return null;
        }

        return {
          url: url.startsWith('http') ? url : `${blogUrl}${url}`,
          title,
          source: 'homepage_scrape',
        };
      })
      .filter(Boolean);

    return posts.slice(0, 30); // Limit to recent posts
  } catch (error) {
    console.error('[Own Content Analyzer] Homepage scraping failed:', error);
    return [];
  }
}

/**
 * Extract keywords from a blog post
 */
async function extractKeywordsFromPost(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EditorialBot/1.0)',
      },
      timeout: 8000,
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();

    const keywords = [];

    // Extract meta keywords
    const metaKeywords = extractMetaKeywords(html);
    keywords.push(...metaKeywords);

    // Extract from title
    const title = extractTitle(html);
    if (title) {
      keywords.push(...extractKeywordsFromText(title));
    }

    // Extract from H1/H2
    const h1Titles = extractH1Titles(html);
    const h2Titles = extractH2Titles(html);
    keywords.push(...h1Titles.flatMap(extractKeywordsFromText));
    keywords.push(...h2Titles.flatMap(extractKeywordsFromText));

    return [...new Set(keywords)]; // Deduplicate
  } catch (error) {
    console.warn(`[Own Content Analyzer] Failed to extract keywords from ${url}:`, error.message);
    return [];
  }
}

/**
 * Check if a keyword is covered in existing content
 */
export function isKeywordInExistingContent(keyword, existingKeywords, existingTopics) {
  const kwLower = keyword.toLowerCase();

  // Exact match
  if (existingKeywords.has(kwLower)) {
    return { isCovered: true, reason: 'exact_match' };
  }

  // Partial match in topics
  for (const topic of existingTopics) {
    if (kwLower.includes(topic) || topic.includes(kwLower)) {
      return { isCovered: true, reason: 'topic_overlap', matchedTopic: topic };
    }
  }

  return { isCovered: false };
}

/**
 * Identify content gaps (keywords NOT covered)
 */
export function identifyContentGaps(allKeywords, existingKeywords) {
  return allKeywords.filter(kw => !existingKeywords.has(kw.keyword.toLowerCase()));
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractTitleFromUrl(url) {
  const parts = url.split('/').filter(Boolean);
  const slug = parts[parts.length - 1];
  return slug
    .replace(/-/g, ' ')
    .replace(/\.html?$/, '')
    .replace(/\?.*$/, '')
    .trim();
}

function extractTopicFromTitle(title) {
  // Remove common prefixes/suffixes
  let topic = title
    .replace(/^(how to|what is|why|when|where|guide to|introduction to)/i, '')
    .replace(/(guide|tutorial|tips|tricks|best practices)$/i, '')
    .trim();

  // Take first 3-5 words as topic
  const words = topic.split(/\s+/).slice(0, 4).join(' ');
  return words;
}

function extractKeywordsFromText(text) {
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopwords.has(word))
    .slice(0, 10);
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractMetaKeywords(html) {
  const match = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);
  return match ? match[1].split(',').map(k => k.trim()) : [];
}

function extractH1Titles(html) {
  const matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi) || [];
  return matches.map(m => m.replace(/<[^>]+>/g, '').trim());
}

function extractH2Titles(html) {
  const matches = html.match(/<h2[^>]*>([^<]+)<\/h2>/gi) || [];
  return matches.map(m => m.replace(/<[^>]+>/g, '').trim());
}