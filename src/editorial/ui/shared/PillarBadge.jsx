import React from 'react';

export default function PillarBadge({ pillar, size = 'md', showKeywords = false }) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center font-medium rounded-full ${sizeClasses[size]}`}
        style={{
          backgroundColor: pillar.color + '20',
          color: pillar.color,
          borderColor: pillar.color,
          borderWidth: '1px',
        }}
      >
        {pillar.name}
      </span>
      
      {showKeywords && pillar.focusKeywords && pillar.focusKeywords.length > 0 && (
        <span className="text-xs text-gray-500">
          {pillar.focusKeywords.slice(0, 2).join(', ')}
        </span>
      )}
    </div>
  );
}