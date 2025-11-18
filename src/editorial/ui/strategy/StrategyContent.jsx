import React, { useState } from 'react';
import { approveStrategy, replaceActiveStrategy } from 'wasp/client/operations';
import PillarBadge from '../shared/PillarBadge';

export default function StrategyContent({ strategy, project, sessionId, onUpdate }) {
  const [isApproving, setIsApproving] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);

  const handleApprove = async () => {
    if (!confirm('Approve this strategy? This will lock the session and activate the calendar.')) {
      return;
    }

    setIsApproving(true);
    try {
      await approveStrategy({ strategyId: strategy.id });
      if (onUpdate) onUpdate();
      else window.location.reload();
    } catch (error) {
      console.error('Failed to approve strategy:', error);
      alert('Failed to approve: ' + error.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReplace = async () => {
    setIsReplacing(true);
    try {
      await replaceActiveStrategy({
        sessionId: sessionId,
        newStrategyId: strategy.id,
      });
      setShowReplaceModal(false);
      if (onUpdate) onUpdate();
      else window.location.reload();
    } catch (error) {
      console.error('Failed to replace strategy:', error);
      alert('Failed to replace: ' + error.message);
    } finally {
      setIsReplacing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Replace Modal */}
      {showReplaceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Replace Active Strategy?
            </h3>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-700">
                This will:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                <li>Deactivate the current active strategy</li>
                <li>Activate strategy v{strategy.versionNumber}</li>
                <li><strong className="text-red-600">Reject approved posts not present in v{strategy.versionNumber}</strong></li>
                <li>Keep the new calendar posts as proposed</li>
              </ul>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ This action cannot be undone. Make sure you've reviewed the new strategy.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReplaceModal(false)}
                disabled={isReplacing}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReplace}
                disabled={isReplacing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isReplacing ? 'Replacing...' : 'Replace Active Strategy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Banner - Active */}
      {strategy.isActive && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-xl">✓</span>
            <div>
              <p className="font-semibold text-green-900">Active Strategy</p>
              <p className="text-sm text-green-700">
                Activated on {new Date(strategy.activatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Banner - Draft with Replace Option */}
      {!strategy.isActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-blue-900">Draft Strategy v{strategy.versionNumber}</p>
              <p className="text-sm text-blue-700">Review and approve or replace active strategy</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isApproving ? 'Approving...' : 'Approve as New Strategy'}
            </button>
            <button
              onClick={() => setShowReplaceModal(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
            >
              🔄 Replace Active Strategy
            </button>
          </div>
        </div>
      )}

      {/* Global Rationale */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategic Overview</h3>
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap">{strategy.globalRationale}</p>
        </div>
      </div>

      {/* Identified Gaps */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Gaps Identified</h3>
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap">{strategy.identifiedGaps}</p>
        </div>
      </div>

      {/* Theme Pillars */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Theme Pillars</h3>
        <div className="space-y-4">
          {strategy.pillars.map((pillar) => (
            <div key={pillar.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <PillarBadge pillar={pillar} size="lg" />
                <span className="text-sm text-gray-600">
                  {strategy.posts.filter((p) => p.pillarId === pillar.id).length} posts
                </span>
              </div>
              <p className="text-gray-700 text-sm mb-3">{pillar.rationale}</p>
              <div className="flex flex-wrap gap-2">
                {pillar.focusKeywords.map((kw, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Posts Preview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Generated Posts ({strategy.posts.length})
        </h3>
        <div className="space-y-3">
          {strategy.posts.slice(0, 5).map((post) => (
            <div key={post.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 text-sm text-gray-600">
                {new Date(post.publishDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 line-clamp-1">{post.title}</p>
                <p className="text-xs text-gray-600 mt-1">{post.primaryKeyword}</p>
              </div>
              <PillarBadge pillar={post.pillar} size="sm" />
            </div>
          ))}
          
          {strategy.posts.length > 5 && (
            <p className="text-sm text-gray-600 text-center pt-2">
              + {strategy.posts.length - 5} more posts in calendar
            </p>
          )}
        </div>
      </div>
    </div>
  );
}