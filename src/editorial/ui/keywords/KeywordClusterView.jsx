import React, { useState } from 'react';
import { updateClusterSelection, updateKeywordSelection } from 'wasp/client/operations';

export default function KeywordClusterView({ clusters, stats, onUpdate, isApproved }) {
  const [expandedClusters, setExpandedClusters] = useState(new Set());

  const toggleCluster = (clusterId) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(clusterId)) {
      newExpanded.delete(clusterId);
    } else {
      newExpanded.add(clusterId);
    }
    setExpandedClusters(newExpanded);
  };

  const handleClusterToggle = async (cluster) => {
    if (isApproved) return;

    const newState = !cluster.isSelectedByUser;

    try {
      await updateClusterSelection({
        clusterId: cluster.id,
        isSelected: newState,
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to update cluster:', error);
      alert('Failed to update cluster: ' + error.message);
    }
  };

 const handleKeywordToggle = async (keyword) => {
  if (isApproved) return;

  // ========== FIX: Logica corretta ==========
  // Se la keyword è già selezionata (AI o USER), vogliamo DESELEZIONARE
  // Se NON è selezionata, vogliamo SELEZIONARE
  const isCurrentlySelected = keyword.isSelectedByAI || keyword.isSelectedByUser;
  const newState = !isCurrentlySelected;
  
  // Se sto deselezionando E la keyword è stata selezionata dall'AI,
  // allora devo chiamare con selectionType: 'ai' per rimuovere il flag AI
  // Altrimenti uso 'user' per gestire il flag utente
  const selectionType = (!newState && keyword.isSelectedByAI && !keyword.isSelectedByUser) 
    ? 'ai' 
    : 'user';
  // ========== FINE FIX ==========

  try {
    await updateKeywordSelection({
      keywordId: keyword.id,
      isSelected: newState,
      selectionType,
    });
    onUpdate();
  } catch (error) {
    console.error('Failed to update keyword:', error);
    alert('Failed to update keyword: ' + error.message);
  }
};

  const getClusterBadgeColor = (cluster) => {
    if (cluster.isSelectedByUser) return 'bg-green-100 text-green-800';
    if (cluster.isSelectedByAI) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-600';
  };

  const getDifficultyColor = (difficulty) => {
    if (!difficulty) return 'text-gray-500';
    if (typeof difficulty === 'string') {
      if (difficulty === 'EASY') return 'text-green-600';
      if (difficulty === 'MEDIUM') return 'text-yellow-600';
      if (difficulty === 'HARD') return 'text-orange-600';
      if (difficulty === 'VERY_HARD') return 'text-red-600';
    }
    // Numeric difficulty (0-100)
    if (difficulty < 30) return 'text-green-600';
    if (difficulty < 50) return 'text-yellow-600';
    if (difficulty < 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatVolume = (keyword) => {
    if (keyword.premiumVolume) {
      return keyword.premiumVolume.toLocaleString();
    }
    return keyword.freeVolume || 'N/A';
  };

  const formatDifficulty = (keyword) => {
    if (keyword.premiumDifficulty) {
      return keyword.premiumDifficulty.toFixed(0);
    }
    return keyword.freeDifficulty || 'N/A';
  };

  return (
    <div className="space-y-4">
      {clusters.map((cluster) => {
        const isExpanded = expandedClusters.has(cluster.id);
        const selectedKeywords = cluster.keywords.filter(
          (k) => k.isSelectedByAI || k.isSelectedByUser
        );

        return (
          <div
            key={cluster.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            {/* Cluster Header */}
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {/* Cluster checkbox */}
                    {!isApproved && (
                      <input
                        type="checkbox"
                        checked={cluster.isSelectedByUser || cluster.isSelectedByAI}
                        onChange={() => handleClusterToggle(cluster)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    )}

                    <h3 className="text-lg font-semibold text-gray-900">
                      {cluster.name}
                    </h3>

                    {/* Selection badge */}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getClusterBadgeColor(
                        cluster
                      )}`}
                    >
                      {cluster.isSelectedByUser
                        ? '✓ Selected by You'
                        : cluster.isSelectedByAI
                        ? '✨ AI Recommended'
                        : 'Not Selected'}
                    </span>
                  </div>

                  {/* Cluster metrics */}
                  <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Keywords:</span>
                      <span>{cluster.totalKeywords}</span>
                    </div>

                    {cluster.priorityScore && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Priority:</span>
                        <span className="font-semibold text-blue-600">
                          {cluster.priorityScore.toFixed(0)}
                        </span>
                      </div>
                    )}

                    {cluster.avgDifficulty && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Avg Difficulty:</span>
                        <span
                          className={`font-semibold ${getDifficultyColor(
                            cluster.avgDifficulty
                          )}`}
                        >
                          {cluster.avgDifficulty.toFixed(0)}
                        </span>
                      </div>
                    )}

                    {cluster.totalVolume && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Total Volume:</span>
                        <span className="font-semibold">
                          {cluster.totalVolume.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {cluster.dominantFunnel && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Funnel:</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {cluster.dominantFunnel}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* AI Rationale */}
                  {cluster.aiRationale && (
                    <p className="text-sm text-gray-700 bg-purple-50 border border-purple-100 rounded-lg p-3">
                      <span className="font-medium text-purple-900">AI Insight:</span>{' '}
                      {cluster.aiRationale}
                    </p>
                  )}
                </div>

                {/* Expand/Collapse button */}
                <button
                  onClick={() => toggleCluster(cluster.id)}
                  className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className={`w-6 h-6 transform transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>

              {/* Selected keywords preview */}
              {!isExpanded && selectedKeywords.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-600 mb-2">
                    Selected Keywords ({selectedKeywords.length}):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedKeywords.slice(0, 8).map((kw) => (
                      <span
                        key={kw.id}
                        className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs"
                      >
                        {kw.keyword}
                      </span>
                    ))}
                    {selectedKeywords.length > 8 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        +{selectedKeywords.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Expanded keyword list */}
            {isExpanded && (
              <div className="border-t border-gray-200 bg-gray-50">
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">
                      All Keywords ({cluster.keywords.length})
                    </h4>
                    <div className="text-xs text-gray-600">
                      {selectedKeywords.length} selected
                    </div>
                  </div>

                  <div className="space-y-2">
                    {cluster.keywords.map((keyword) => {
                      const isSelected =
                        keyword.isSelectedByAI || keyword.isSelectedByUser;

                      return (
                        <div
                          key={keyword.id}
                          className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-white border-green-200'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {/* Checkbox */}
                          {!isApproved && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleKeywordToggle(keyword)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                          )}

                          {/* Keyword text */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 truncate">
                                {keyword.keyword}
                              </span>

                              {/* SERP features badges */}
                              {keyword.hasFeaturedSnippet && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                  FS
                                </span>
                              )}
                              {keyword.hasPAA && (
                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                  PAA
                                </span>
                              )}
                              {keyword.hasVideoCarousel && (
                                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                                  Video
                                </span>
                              )}

                              {/* Cannibalization warning */}
                              {keyword.isInExistingContent && (
                                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                                  ⚠️ Existing
                                </span>
                              )}

                              {/* AI selection badge */}
                              {keyword.isSelectedByAI && !keyword.isSelectedByUser && (
                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                  ✨ AI
                                </span>
                              )}
                            </div>

                            {/* Metrics */}
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              <span>Vol: {formatVolume(keyword)}</span>
                              <span
                                className={getDifficultyColor(
                                  keyword.premiumDifficulty || keyword.freeDifficulty
                                )}
                              >
                                Diff: {formatDifficulty(keyword)}
                              </span>
                              <span>{keyword.funnelStage}</span>
                              <span className="text-gray-400">
                                {keyword.searchIntent}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}