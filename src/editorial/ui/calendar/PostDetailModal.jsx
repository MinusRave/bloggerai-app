import React, { useState } from 'react';
import { updateCalendarPost } from 'wasp/client/operations';
import PillarBadge from '../shared/PillarBadge';
import StatusBadge from '../shared/StatusBadge';
import WarningAlert from '../shared/WarningAlert';

export default function PostDetailModal({ post, pillars, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: post.title,
    publishDate: new Date(post.publishDate).toISOString().split('T')[0],
    primaryKeyword: post.primaryKeyword,
    pillarId: post.pillarId,
    status: post.status,
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCalendarPost({
        postId: post.id,
        updates: {
          ...formData,
          publishDate: new Date(formData.publishDate),
        },
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to update post:', error);
      alert('Failed to update: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setIsSaving(true);
    try {
      await updateCalendarPost({
        postId: post.id,
        updates: { status: newStatus },
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const internalLinks = post.internalLinkSuggestions || [];
  const externalLinks = post.externalLinkSuggestions || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full text-xl font-semibold px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <h2 className="text-xl font-semibold text-gray-900">{post.title}</h2>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warnings */}
          {post.warningFlags && post.warningFlags.length > 0 && (
            <WarningAlert warnings={post.warningFlags} />
          )}

          {/* Main Info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Publish Date</label>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.publishDate}
                  onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900">
                  {new Date(post.publishDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              {isEditing ? (
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PROPOSED">Proposed</option>
                  <option value="APPROVED">Approved</option>
                  <option value="MODIFIED">Modified</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              ) : (
                <StatusBadge status={post.status} />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme Pillar</label>
              {isEditing ? (
                <select
                  value={formData.pillarId}
                  onChange={(e) => setFormData({ ...formData, pillarId: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {pillars.map((pillar) => (
                    <option key={pillar.id} value={pillar.id}>
                      {pillar.name}
                    </option>
                  ))}
                </select>
              ) : (
                <PillarBadge pillar={post.pillar} />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Intent</label>
              <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                {post.searchIntent}
              </span>
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Primary Keyword</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.primaryKeyword}
                onChange={(e) => setFormData({ ...formData, primaryKeyword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{post.primaryKeyword}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Keywords</label>
            <div className="flex flex-wrap gap-2">
              {post.secondaryKeywords.map((kw, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Link Suggestions */}
          {(internalLinks.length > 0 || externalLinks.length > 0) && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📎 Suggested Links</h3>
              
              {/* Internal Links */}
              {internalLinks.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Internal Links (to other posts)</h4>
                  <div className="space-y-2">
                    {internalLinks.map((link, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{link.anchor}</p>
                          <p className="text-xs text-gray-600 mt-1">→ Post ID: {link.postId}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(link.anchor)}
                          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* External Links */}
              {externalLinks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">External Links (authoritative resources)</h4>
                  <div className="space-y-2">
                    {externalLinks.map((link, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{link.anchor}</p>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block"
                          >
                            {link.url}
                          </a>
                          {link.reason && (
                            <p className="text-xs text-gray-600 mt-1 italic">{link.reason}</p>
                          )}
                        </div>
                        <button
                          onClick={() => copyToClipboard(`[${link.anchor}](${link.url})`)}
                          className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rationale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">AI Rationale</label>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.rationale}</p>
            </div>
          </div>

          {/* Confidence Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confidence Level</label>
            <span
              className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                post.confidenceLevel === 'HIGH'
                  ? 'bg-green-100 text-green-800'
                  : post.confidenceLevel === 'MEDIUM'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {post.confidenceLevel}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-between">
          {!isEditing ? (
            <>
              <div className="flex gap-2">
                {post.status === 'PROPOSED' && (
                  <>
                    <button
                      onClick={() => handleStatusChange('APPROVED')}
                      disabled={isSaving}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusChange('REJECTED')}
                      disabled={isSaving}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Edit Post
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    title: post.title,
                    publishDate: new Date(post.publishDate).toISOString().split('T')[0],
                    primaryKeyword: post.primaryKeyword,
                    pillarId: post.pillarId,
                    status: post.status,
                  });
                }}
                disabled={isSaving}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}