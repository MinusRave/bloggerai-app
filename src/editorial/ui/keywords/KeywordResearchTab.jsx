import React, { useState, useEffect } from 'react';
import { useQuery } from 'wasp/client/operations';
import { reRunKeywordResearch, getUserAPIKeys, getKeywordResearch } from 'wasp/client/operations';
import APIKeySettings from '../settings/APIKeySettings';
import KeywordResearchStats from './KeywordResearchStats';
import KeywordClusterView from './KeywordClusterView';
import KeywordListView from './KeywordListView';
import KeywordSeedsDisplay from './KeywordSeedsDisplay';

export default function KeywordResearchTab({ project }) {
  const [showAPIKeys, setShowAPIKeys] = useState(false);
  const [usePremium, setUsePremium] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [viewMode, setViewMode] = useState('clusters'); // 'clusters' | 'list'

  const { data: apiKeys } = useQuery(getUserAPIKeys);
  
  // ========== FIX: Get research from project.keywordResearches ==========
  const research = project.keywordResearches?.[0]; // Most recent research
  const hasAPIKeys = apiKeys && apiKeys.length > 0;
  
  // Check research status
  const isResearchInProgress = research?.status === 'IN_PROGRESS';
  const isResearchCompleted = research?.status === 'COMPLETED';
  const isResearchFailed = research?.status === 'FAILED';
  const hasResearchData = isResearchCompleted && research.clusters?.length > 0;
  // ========================================================================

  // ========== FIX: Poll for status updates when research is in progress ==========
  useEffect(() => {
    if (!isResearchInProgress) return;

    const pollInterval = setInterval(() => {
      // Trigger a refetch by reloading
      window.location.reload();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [isResearchInProgress]);
  // ================================================================================

  // Check if strategy is outdated compared to keyword research
  const isStrategyOutdated =
    project.keywordResearchUpdatedAt &&
    project.strategies?.length > 0 &&
    new Date(project.keywordResearchUpdatedAt) >
      new Date(project.strategies[0].updatedAt);

  const handleRunResearch = async () => {
    if (usePremium && !hasAPIKeys) {
      alert('Please add API keys first to use premium research');
      return;
    }

    if (
      hasResearchData &&
      !confirm(
        'This will replace existing keyword research data. Continue?'
      )
    ) {
      return;
    }

    setIsRunning(true);
    try {
      await reRunKeywordResearch({
        projectId: project.id,
        usePremium,
      });
      
      // Reload to show new data
      window.location.reload();
    } catch (error) {
      console.error('Failed to run research:', error);
      alert('Failed to run research: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Calculate stats for display
  const stats = research ? {
    totalKeywords: research.totalKeywordsFound || 0,
    totalClusters: research.totalClustersFound || 0,
    aiSelectedCount: research.aiSelectedCount || 0,
    userSelectedCount: research.userSelectedCount || 0,
    finalSelectedCount: (research.aiSelectedCount || 0) + (research.userSelectedCount || 0),
    funnelDistribution: {
      ToF: research.clusters?.reduce((sum, c) => sum + (c.dominantFunnel === 'ToF' ? c.totalKeywords : 0), 0) || 0,
      MoF: research.clusters?.reduce((sum, c) => sum + (c.dominantFunnel === 'MoF' ? c.totalKeywords : 0), 0) || 0,
      BoF: research.clusters?.reduce((sum, c) => sum + (c.dominantFunnel === 'BoF' ? c.totalKeywords : 0), 0) || 0,
    },
    intentDistribution: {
      INFORMATIONAL: research.clusters?.flatMap(c => c.keywords).filter(k => k.searchIntent === 'INFORMATIONAL').length || 0,
      NAVIGATIONAL: research.clusters?.flatMap(c => c.keywords).filter(k => k.searchIntent === 'NAVIGATIONAL').length || 0,
      TRANSACTIONAL: research.clusters?.flatMap(c => c.keywords).filter(k => k.searchIntent === 'TRANSACTIONAL').length || 0,
      COMMERCIAL: research.clusters?.flatMap(c => c.keywords).filter(k => k.searchIntent === 'COMMERCIAL').length || 0,
    },
  } : null;

  return (
    <div className="space-y-6">
      {/* Strategy outdated warning */}
      {isStrategyOutdated && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-1">
                Strategy May Be Outdated
              </h3>
              <p className="text-sm text-yellow-800">
                Keyword research was updated after the current strategy was generated.
                Your strategy may not reflect the latest keyword data. Consider regenerating
                your strategy to align with the updated research.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========== FIX: Show in-progress banner ========== */}
      {isResearchInProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">
                Research in Progress...
              </h3>
              <p className="text-sm text-blue-700">
                Keyword research is currently running. This may take a few minutes.
                You can leave this page and come back later.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Started: {new Date(research.startedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========== FIX: Show failure banner ========== */}
      {isResearchFailed && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-xl">❌</div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-1">
                Research Failed
              </h3>
              <p className="text-sm text-red-800 mb-2">
                The keyword research process encountered an error:
              </p>
              <p className="text-sm text-red-700 bg-red-100 rounded p-2 font-mono">
                {research.errorMessage}
              </p>
              <p className="text-xs text-red-600 mt-2">
                Failed at: {new Date(research.completedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* API Keys Section (collapsible) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => setShowAPIKeys(!showAPIKeys)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🔑</span>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Premium API Keys</h3>
              <p className="text-sm text-gray-600">
                {hasAPIKeys
                  ? `${apiKeys.length} provider(s) connected`
                  : 'No API keys configured'}
              </p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              showAPIKeys ? 'rotate-180' : ''
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {showAPIKeys && (
          <div className="px-6 pb-6 border-t border-gray-200">
            <div className="pt-6">
              <APIKeySettings />
            </div>
          </div>
        )}
      </div>

      {/* Keyword Research Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Keyword Research
        </h3>

        <div className="space-y-4">
          {/* Premium toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="font-medium text-gray-900 mb-1">
                Use Premium APIs
              </div>
              <p className="text-sm text-gray-600">
                {hasAPIKeys
                  ? 'Get exact search volumes, difficulty scores, and CPC data'
                  : 'Add API keys above to enable premium research'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={usePremium}
                onChange={(e) => setUsePremium(e.target.checked)}
                disabled={!hasAPIKeys || isRunning || isResearchInProgress}
                className="sr-only peer"
              />
              <div
                className={`w-11 h-6 rounded-full peer ${
                  !hasAPIKeys || isRunning || isResearchInProgress
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gray-200 peer-checked:bg-blue-600'
                } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 transition-colors`}
              >
                <div
                  className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                    usePremium ? 'translate-x-5' : ''
                  }`}
                />
              </div>
            </label>
          </div>

          {/* Run button */}
          <button
            onClick={handleRunResearch}
            disabled={isRunning || isResearchInProgress}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isRunning || isResearchInProgress ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {isResearchInProgress ? 'Research Running...' : 'Starting...'}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
                {hasResearchData ? 'Re-run' : 'Run'} Keyword Analysis
              </>
            )}
          </button>

          {research && research.completedAt && (
            <p className="text-xs text-gray-500 text-center">
              Last {isResearchFailed ? 'attempted' : 'updated'}:{' '}
              {new Date(research.completedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {' • '}
              Using {research.usePremiumAPI ? 'Premium' : 'Free'} tools
            </p>
          )}
        </div>
      </div>

      {/* Keyword Seeds Display */}
      {research && <KeywordSeedsDisplay research={research} />}

      {/* Stats */}
      {hasResearchData && stats && (
        <KeywordResearchStats stats={stats} research={research} />
      )}

      {/* View Mode Switcher */}
      {hasResearchData && (
        <div className="flex gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <button
            onClick={() => setViewMode('clusters')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              viewMode === 'clusters'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Cluster View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 List View
          </button>
        </div>
      )}

      {/* Keyword Results */}
      {!hasResearchData && !isResearchInProgress && !isResearchFailed && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <div className="max-w-md mx-auto">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Keyword Research Yet
            </h3>
            <p className="text-gray-600">
              Run keyword analysis to discover the best keywords for your content strategy
            </p>
          </div>
        </div>
      )}

      {hasResearchData && viewMode === 'clusters' && (
        <KeywordClusterView
          clusters={research.clusters}
          stats={stats}
          onUpdate={() => window.location.reload()}
          isApproved={research.isApproved}
        />
      )}

      {hasResearchData && viewMode === 'list' && (
        <KeywordListView
          clusters={research.clusters}
          onUpdate={() => window.location.reload()}
          isApproved={research.isApproved}
        />
      )}
    </div>
  );
}