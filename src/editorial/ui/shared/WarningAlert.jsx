import React from 'react';

const WARNING_ICONS = {
  claim_not_in_kb: '⚠️',
  keyword_unverified: '🔍',
  service_mismatch: '❌',
  generic_warning: 'ℹ️',
};

export default function WarningAlert({ warnings, compact = false }) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1">
        <span className="text-yellow-600">⚠️</span>
        <span className="text-xs text-yellow-700">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-yellow-600 text-xl">⚠️</span>
        <h4 className="text-sm font-semibold text-yellow-900">
          Validation Warnings ({warnings.length})
        </h4>
      </div>
      
      <ul className="space-y-2 ml-7">
        {warnings.map((warning, index) => (
          <li key={index} className="text-sm">
            <div className="flex items-start gap-2">
              <span className="text-base">{WARNING_ICONS[warning.type] || 'ℹ️'}</span>
              <div>
                <p className="text-yellow-900 font-medium">{warning.message}</p>
                {warning.detail && (
                  <p className="text-yellow-700 text-xs mt-1">{warning.detail}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}