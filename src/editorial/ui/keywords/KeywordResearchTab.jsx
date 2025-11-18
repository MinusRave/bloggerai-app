import React, { useState, useEffect } from 'react';
import { useQuery } from 'wasp/client/operations';
import {
  getKeywordResearch,
  startKeywordResearch,
  approveKeywordResearch,
} from 'wasp/client/operations';
import KeywordResearchStats from './KeywordResearchStats';
import KeywordClusterView from './KeywordClusterView';
import KeywordListView from './KeywordListView';
import { ConfirmModal, SuccessModal, ErrorModal } from '../shared/ModalComponents';

export default function KeywordResearchTab({ project }) {
  const [viewMode, setViewMode] = useState('clusters'); // 'clusters' | 'list'
  
  // Modals state
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [isStarting, setIsStarting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const { data, isLoading, error, refetch } = useQuery(getKeywordResearch, {
    projectId: project.id,
  });
  // ========== AGGIUNGI QUESTO BLOCCO DI DEBUG ==========
  useEffect(() => {
    if (data?.stats) {
      console.log('🔍 KEYWORD RESEARCH DEBUG:');
      console.log('  Total Keywords:', data.stats.totalKeywords);
      console.log('  AI Selected:', data.stats.aiSelectedCount);
      console.log('  User Selected:', data.stats.userSelectedCount);
      console.log('  Final Selected:', data.stats.finalSelectedCount);
      console.log('  Button should be:', data.stats.finalSelectedCount >= 30 ? 'ENABLED ✅' : 'DISABLED ❌');
      
      // Log some sample keywords to verify selection
      if (data.research?.clusters) {
        const allKeywords = data.research.clusters.flatMap(c => c.keywords);
        const selected = allKeywords.filter(k => k.isSelectedByAI || k.isSelectedByUser);
        console.log('  Sample selected keywords:', selected.slice(0, 5).map(k => k.keyword));
      }
    }
  }, [data]);
  // ========== FINE BLOCCO DEBUG ==========

  const handleStartResearch = async () => {
    setShowStartConfirm(false);
    setIsStarting(true);
    
    try {
      await startKeywordResearch({ projectId: project.id });
      
      // Poll for updates every 5 seconds
      const pollInterval = setInterval(() => {
        refetch();
      }, 5000);

      // Stop polling after 10 minutes
      setTimeout(() => clearInterval(pollInterval), 600000);

      setSuccessMessage('Keyword research started! The page will update automatically when complete.');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to start research:', error);
      setErrorMessage(error.message || 'Failed to start keyword research. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsStarting(false);
    }
  };

  const handleApproveResearch = async () => {
    setShowApproveConfirm(false);
    setIsApproving(true);
    
    try {
      await approveKeywordResearch({ researchId: data.research.id });
      setSuccessMessage('Keyword research approved! You can now generate your editorial strategy.');
      setShowSuccessModal(true);
      refetch();
    } catch (error) {
      console.error('Failed to approve research:', error);
      setErrorMessage(error.message || 'Failed to approve research. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsApproving(false);
    }
  };

  const checkApprovalEligibility = () => {
    if (!data?.research) return false;
    
    const selectedCount = data.stats.finalSelectedCount;

    if (selectedCount < 30) {
      setErrorMessage(
        `Not enough keywords selected. You need at least 30 keywords, but only ${selectedCount} are selected. Please select more keywords before approving.`
      );
      setShowErrorModal(true);
      return false;
    }
    
    return true;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading keyword research...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">Failed to load keyword research: {error.message}</p>
      </div>
    );
  }

  // No research yet - show start button
  if (!data || !data.research) {
    return (
      <>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-blue-600"
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
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Start Keyword Research
            </h3>

            <p className="text-gray-600 mb-6">
              Discover hundreds of keyword opportunities for your blog using AI-powered
              research. We'll analyze your seed keywords, competitors, and industry trends
              to find the best topics to rank for.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-900 mb-2">What we'll analyze:</h4>
              <ul className="text-sm text-blue-800 space-y-1 text-left max-w-md mx-auto">
                <li>✓ Google Suggest keyword expansion</li>
                <li>✓ Competitor content analysis</li>
                <li>✓ SERP features & opportunities</li>
                <li>✓ Trending topics in your industry</li>
                <li>✓ AI-powered keyword clustering</li>
                <li>✓ Automatic selection of optimal keywords</li>
              </ul>
            </div>

            <button
              onClick={() => setShowStartConfirm(true)}
              disabled={isStarting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Starting Research...
                </>
              ) : (
                <>
                  <span className="mr-2">🔍</span>
                  Start Keyword Research
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 mt-4">
              This process takes 2-5 minutes depending on the number of seed keywords and
              competitors.
            </p>
          </div>
        </div>

        {/* Confirmation Modal */}
        <ConfirmModal
          isOpen={showStartConfirm}
          onClose={() => setShowStartConfirm(false)}
          onConfirm={handleStartResearch}
          title="Start Keyword Research?"
          message="This will analyze your seed keywords, competitors, and industry trends. The process takes 2-5 minutes and you'll be notified when complete."
          confirmText="Start Research"
          variant="primary"
        />

        {/* Success Modal */}
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="Research Started!"
          message={successMessage}
        />

        {/* Error Modal */}
        <ErrorModal
          isOpen={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          title="Error"
          message={errorMessage}
        />
      </>
    );
  }

  const { research, stats } = data;

  // Research in progress
  if (research.status === 'IN_PROGRESS' || research.status === 'PENDING') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="max-w-xl mx-auto">
          <div className="animate-pulse mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-blue-600 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Keyword Research in Progress
          </h3>

          <p className="text-gray-600 mb-6">
            We're analyzing your seed keywords, competitors, and industry trends. This
            usually takes 2-5 minutes.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-left">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Expanding seed keywords with Google Suggest</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Analyzing SERP features and opportunities</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <span>⏳</span>
              <span>Clustering keywords by topic</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <span>⏳</span>
              <span>AI-powered keyword selection</span>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            className="mt-6 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Refresh Status
          </button>
        </div>
      </div>
    );
  }

  // Research failed
  if (research.status === 'FAILED') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <div className="max-w-xl mx-auto">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Research Failed
          </h3>

          <p className="text-gray-600 mb-4">
            An error occurred during keyword research:
          </p>

          <div className="bg-white border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 font-mono">
              {research.errorMessage || 'Unknown error'}
            </p>
          </div>

          <button
            onClick={() => setShowStartConfirm(true)}
            disabled={isStarting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Research completed - show results
  return (
    <>
      <div className="space-y-6">
        {/* Header with status and actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Keyword Research Results
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {research.status === 'APPROVED'
                  ? 'Research approved and ready for strategy generation'
                  : 'Review and select keywords for your editorial strategy'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* View mode toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('clusters')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'clusters'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📊 Clusters
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📋 List
                </button>
              </div>

              <button
  onClick={async () => {
    try {
      const result = await cleanupKeywordSelectionFlags({ researchId: data.research.id });
      alert(`Fixed ${result.fixed} keywords! New total: ${result.newCounts.total}`);
      refetch();
    } catch (e) {
      alert('Cleanup failed: ' + e.message);
    }
  }}
  className="bg-orange-600 text-white px-4 py-2 rounded"
>
  🔧 Cleanup Flags
</button>

              {/* Approve button */}
              {research.status !== 'APPROVED' && (
                <button
                  onClick={() => {
                    if (checkApprovalEligibility()) {
                      setShowApproveConfirm(true);
                    }
                  }}
                  disabled={isApproving || stats.finalSelectedCount < 30}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isApproving ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Approving...
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      Approve & Continue
                    </>
                  )}
                </button>
              )}

              {research.status === 'APPROVED' && (
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
                  ✓ Approved
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <KeywordResearchStats stats={stats} research={research} />
        </div>

        {/* Main content */}
        {viewMode === 'clusters' ? (
          <KeywordClusterView
            clusters={research.clusters}
            stats={stats}
            onUpdate={refetch}
            isApproved={research.status === 'APPROVED'}
          />
        ) : (
          <KeywordListView
            clusters={research.clusters}
            stats={stats}
            onUpdate={refetch}
            isApproved={research.status === 'APPROVED'}
          />
        )}
      </div>

      {/* Approve Confirmation Modal */}
      <ConfirmModal
        isOpen={showApproveConfirm}
        onClose={() => setShowApproveConfirm(false)}
        onConfirm={handleApproveResearch}
        title="Approve Keyword Selection?"
        message={`You've selected ${stats.finalSelectedCount} keywords. Once approved, you can generate your editorial strategy based on these keywords. This action cannot be undone.`}
        confirmText="Approve Selection"
        variant="success"
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          refetch();
        }}
        title="Success!"
        message={successMessage}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Error"
        message={errorMessage}
      />
    </>
  );
}