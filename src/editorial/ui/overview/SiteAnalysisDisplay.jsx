import React, { useState } from 'react';

export default function SiteAnalysisDisplay({ project }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!project.siteAnalysisData) return null;

  const { pagesAnalyzed, extractedInfo, confidence, analyzedAt } = project.siteAnalysisData;

  const confidenceColor = {
    HIGH: 'text-green-600 bg-green-100',
    MEDIUM: 'text-yellow-600 bg-yellow-100',
    LOW: 'text-orange-600 bg-orange-100',
  }[confidence] || 'text-gray-600 bg-gray-100';

  // Separate user-provided vs AI-discovered pages
  const userProvidedPages = [];
  const aiDiscoveredPages = [];

  if (project.sitemapUrl) userProvidedPages.push({ url: project.sitemapUrl, type: 'sitemap' });
  if (project.aboutPageUrl) userProvidedPages.push({ url: project.aboutPageUrl, type: 'about' });
  if (project.pricingPageUrl) userProvidedPages.push({ url: project.pricingPageUrl, type: 'pricing' });
  if (project.servicesPageUrl) userProvidedPages.push({ url: project.servicesPageUrl, type: 'services' });

  const userProvidedUrls = new Set([
    project.sitemapUrl,
    project.aboutPageUrl,
    project.pricingPageUrl,
    project.servicesPageUrl,
  ].filter(Boolean));

  pagesAnalyzed.forEach(page => {
    if (!userProvidedUrls.has(page.url)) {
      aiDiscoveredPages.push(page);
    }
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            🤖 AI Site Analysis
            <span className={`text-xs px-2 py-1 rounded font-medium ${confidenceColor}`}>
              {confidence} Confidence
            </span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Analyzed {new Date(analyzedAt).toLocaleDateString()} • {pagesAnalyzed.length} pages
          </p>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Type
          </label>
          <p className="text-gray-900">{extractedInfo.businessType || 'N/A'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Market Location
          </label>
          <p className="text-gray-900">{extractedInfo.location || 'Global'}</p>
        </div>
      </div>

      {/* Pages Analysis Summary */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <div className="text-sm font-medium text-blue-900 mb-1">👤 User Provided</div>
          <div className="text-2xl font-bold text-blue-900">{userProvidedPages.length}</div>
          <div className="text-xs text-blue-700 mt-1">
            {userProvidedPages.map(p => p.type).join(', ') || 'None'}
          </div>
        </div>

        <div className="bg-purple-50 p-3 rounded border border-purple-200">
          <div className="text-sm font-medium text-purple-900 mb-1">🤖 AI Discovered</div>
          <div className="text-2xl font-bold text-purple-900">{aiDiscoveredPages.length}</div>
          <div className="text-xs text-purple-700 mt-1">
            {aiDiscoveredPages.slice(0, 3).map(p => p.type).join(', ') || 'None'}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-6 space-y-4 pt-4 border-t border-gray-200">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Extracted Description
            </h4>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
              {extractedInfo.description}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Target Audience
            </h4>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
              {extractedInfo.target}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Business Objectives
            </h4>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
              {extractedInfo.objectives}
            </p>
          </div>

          {extractedInfo.existingBlogTopics && extractedInfo.existingBlogTopics.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Existing Blog Topics ({extractedInfo.existingBlogTopics.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {extractedInfo.existingBlogTopics.map((topic, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* User Provided Pages */}
          {userProvidedPages.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                👤 User-Provided Pages ({userProvidedPages.length})
              </h4>
              <ul className="space-y-1 text-sm">
                {userProvidedPages.map((page, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                      {page.type}
                    </span>
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {page.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Discovered Pages */}
          {aiDiscoveredPages.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                🤖 AI-Discovered Pages ({aiDiscoveredPages.length})
              </h4>
              <ul className="space-y-1 text-sm">
                {aiDiscoveredPages.map((page, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">
                      {page.type}
                    </span>
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-700"
                    >
                      {page.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Extracted Knowledge Base
            </h4>
            <div className="bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                {extractedInfo.knowledgeBase}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}