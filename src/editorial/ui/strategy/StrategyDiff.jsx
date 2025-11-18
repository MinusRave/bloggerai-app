import React from 'react';

// Placeholder for future implementation
// This would show side-by-side comparison of two strategy versions

export default function StrategyDiff({ oldStrategy, newStrategy }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategy Comparison</h3>
      <p className="text-gray-600">
        Diff view coming soon. Currently showing v{newStrategy.versionNumber}.
      </p>
    </div>
  );
}