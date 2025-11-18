import React, { useState } from 'react';
import { updateCalendarPost } from 'wasp/client/operations';
import PillarBadge from '../shared/PillarBadge';
import StatusBadge from '../shared/StatusBadge';
import WarningAlert from '../shared/WarningAlert';

export default function PostCard({ post, onClick, onUpdate, compact = false }) {
  const [isChangingDate, setIsChangingDate] = useState(false);
  const [newDate, setNewDate] = useState(
    new Date(post.publishDate).toISOString().split('T')[0]
  );

  const date = new Date(post.publishDate);
  const hasWarnings = post.warningFlags && post.warningFlags.length > 0;

  const handleQuickDateChange = async (e) => {
    e.stopPropagation();
    
    if (newDate === new Date(post.publishDate).toISOString().split('T')[0]) {
      setIsChangingDate(false);
      return;
    }

    try {
      await updateCalendarPost({
        postId: post.id,
        updates: {
          publishDate: new Date(newDate),
        },
      });
      setIsChangingDate(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to update date:', error);
      alert('Failed to update date: ' + error.message);
    }
  };

  if (compact) {
    return (
      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 text-center min-w-[80px]">
            {isChangingDate ? (
              <div className="flex flex-col gap-1">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={handleQuickDateChange}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleQuickDateChange(e);
                  }}
                  className="text-xs border border-blue-500 rounded px-1 py-0.5 w-full"
                  autoFocus
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsChangingDate(false);
                  }}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsChangingDate(true);
                }}
                className="hover:bg-blue-50 rounded p-1 transition-colors w-full"
              >
                <div className="text-2xl font-bold text-gray-900">
                  {date.getDate()}
                </div>
                <div className="text-xs text-gray-600 uppercase">
                  {date.toLocaleDateString('en-US', { month: 'short' })}
                </div>
              </button>
            )}
          </div>

          <button
            onClick={onClick}
            className="flex-1 min-w-0 text-left"
          >
            <div className="flex items-start gap-2 mb-2">
              <h4 className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">
                {post.title}
              </h4>
              {hasWarnings && <WarningAlert warnings={post.warningFlags} compact />}
            </div>
            <p className="text-xs text-gray-600 mb-2">{post.primaryKeyword}</p>
            <div className="flex items-center gap-2">
              <PillarBadge pillar={post.pillar} size="sm" />
              <StatusBadge status={post.status} size="sm" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        {isChangingDate ? (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onBlur={handleQuickDateChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleQuickDateChange(e);
              }}
              className="text-sm border border-blue-500 rounded px-2 py-1"
              autoFocus
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsChangingDate(false);
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsChangingDate(true);
            }}
            className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            📅 {date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </button>
        )}
        <StatusBadge status={post.status} size="sm" />
      </div>

      <button
        onClick={onClick}
        className="w-full text-left"
      >
        <h4 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2">
          {post.title}
        </h4>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
            {post.primaryKeyword}
          </span>
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
            {post.searchIntent}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <PillarBadge pillar={post.pillar} size="sm" />
          {hasWarnings && <WarningAlert warnings={post.warningFlags} compact />}
        </div>

        {post.manuallyEdited && (
          <div className="mt-2 text-xs text-blue-600">
            ✏️ Manually edited
          </div>
        )}
      </button>
    </div>
  );
}