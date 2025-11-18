import React from 'react';

export default function KeywordResearchStats({ stats, research }) {
  // Calculate new opportunities if own content was analyzed
  const newOpportunities = research?.ownContentAnalyzed 
    ? stats.finalSelectedCount 
    : null;

  return (
    <div className="space-y-4">
      {/* Own Content Analysis Banner (if analyzed) */}
      {research?.ownContentAnalyzed && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📝</span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900 mb-2">
                Blog Content Analyzed
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-gray-600">Blog Posts:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {research.totalBlogPosts || 0}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Already Covered:</span>
                  <span className="ml-2 font-semibold text-orange-600">
                    {research.existingKeywordsCount || 0} keywords
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">New Opportunities:</span>
                  <span className="ml-2 font-semibold text-green-600">
                    {newOpportunities || 0} keywords
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Keywords */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🔍</span>
            <span className="text-xs text-gray-500">Total</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalKeywords}</div>
          <div className="text-xs text-gray-600">Keywords Found</div>
        </div>

        {/* Clusters */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📊</span>
            <span className="text-xs text-blue-600">Organized</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{stats.totalClusters}</div>
          <div className="text-xs text-blue-700">Topic Clusters</div>
        </div>

        {/* AI Selected */}
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">✨</span>
            <span className="text-xs text-purple-600">AI Choice</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {stats.aiSelectedCount}
          </div>
          <div className="text-xs text-purple-700">AI Recommended</div>
        </div>

        {/* Final Selection */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">
              {stats.finalSelectedCount >= 30 ? '✓' : '⚠️'}
            </span>
            <span
              className={`text-xs ${
                stats.finalSelectedCount >= 30 ? 'text-green-600' : 'text-orange-600'
              }`}
            >
              {stats.finalSelectedCount >= 30 ? 'Ready' : 'Need More'}
            </span>
          </div>
          <div
            className={`text-2xl font-bold ${
              stats.finalSelectedCount >= 30 ? 'text-green-900' : 'text-orange-900'
            }`}
          >
            {stats.finalSelectedCount}
          </div>
          <div
            className={`text-xs ${
              stats.finalSelectedCount >= 30 ? 'text-green-700' : 'text-orange-700'
            }`}
          >
            Selected (min: 30)
          </div>
        </div>

        {/* Funnel Distribution */}
        <div className="col-span-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <div className="text-xs text-gray-600 font-medium mb-3">Funnel Distribution</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                🔝 Top of Funnel (ToF)
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.funnelDistribution.ToF}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                🎯 Middle of Funnel (MoF)
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.funnelDistribution.MoF}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                💰 Bottom of Funnel (BoF)
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.funnelDistribution.BoF}
              </span>
            </div>
          </div>
        </div>

        {/* Intent Distribution */}
        <div className="col-span-2 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
          <div className="text-xs text-gray-600 font-medium mb-3">Search Intent</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">ℹ️ Informational</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.intentDistribution.INFORMATIONAL}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">🧭 Navigational</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.intentDistribution.NAVIGATIONAL}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">💳 Transactional</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.intentDistribution.TRANSACTIONAL}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">🛒 Commercial</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.intentDistribution.COMMERCIAL}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}