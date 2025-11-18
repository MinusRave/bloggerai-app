import React from 'react';

const STATUS_STYLES = {
  // Project statuses
  DRAFT: 'bg-gray-100 text-gray-800',
  STRATEGY_READY: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  ARCHIVED: 'bg-gray-100 text-gray-600',
  
  // Post statuses
  PROPOSED: 'bg-purple-100 text-purple-800',
  APPROVED: 'bg-green-100 text-green-800',
  MODIFIED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  DRAFT: 'Draft',
  STRATEGY_READY: 'Strategy Ready',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  ARCHIVED: 'Archived',
  PROPOSED: 'Proposed',
  APPROVED: 'Approved',
  MODIFIED: 'Modified',
  REJECTED: 'Rejected',
};

export default function StatusBadge({ status, size = 'md' }) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${
        STATUS_STYLES[status] || 'bg-gray-100 text-gray-800'
      } ${sizeClasses[size]}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}