import React, { useState } from 'react';

export default function KeywordSeedsDisplay({ research }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!research) return null;

  const { aiGeneratedSeeds = [], userProvidedSeeds = [], totalSeedsCount = 0 } = research;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium text-blue-900">
            Keyword Seeds ({totalSeedsCount})
          </h4>
          <p className="text-sm text-blue-700 mt-1">
            Seeds used to generate {research.totalKeywordsFound} keywords
          </p>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
        >
          {isExpanded ? '▼' : '▶'} {isExpanded ? 'Hide' : 'Show'} Seeds
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-white rounded p-3 border border-blue-100">
          <div className="text-blue-600 font-medium mb-1">🤖 AI Generated</div>
          <div className="text-2xl font-bold text-blue-900">{aiGeneratedSeeds.length}</div>
        </div>
        
        <div className="bg-white rounded p-3 border border-blue-100">
          <div className="text-blue-600 font-medium mb-1">👤 User Provided</div>
          <div className="text-2xl font-bold text-blue-900">{userProvidedSeeds.length}</div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {aiGeneratedSeeds.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-blue-900 mb-2">
                🤖 AI Generated Seeds
              </h5>
              <div className="flex flex-wrap gap-2">
                {aiGeneratedSeeds.map((seed, index) => (
                  <span
                    key={`ai-${index}`}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded border border-blue-200"
                  >
                    {seed}
                  </span>
                ))}
              </div>
            </div>
          )}

          {userProvidedSeeds.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-blue-900 mb-2">
                👤 User Provided Seeds
              </h5>
              <div className="flex flex-wrap gap-2">
                {userProvidedSeeds.map((seed, index) => (
                  <span
                    key={`user-${index}`}
                    className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded border border-green-200"
                  >
                    {seed}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}