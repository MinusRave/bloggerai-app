import React, { useState } from 'react';
import { updateProjectMetadata, updateProjectKnowledgeBase } from 'wasp/client/operations';
import StatusBadge from '../shared/StatusBadge';
import SiteAnalysisDisplay from './SiteAnalysisDisplay';

export default function OverviewTab({ project, activeSession, activeStrategy }) {
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isEditingKB, setIsEditingKB] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [infoData, setInfoData] = useState({
    name: project.name,
    description: project.description,
    language: project.language,
    target: project.target,
    objectives: project.objectives,
    blogUrl: project.blogUrl || '',
    mainSiteUrl: project.mainSiteUrl || '',
    competitorUrls: project.competitorUrls || [],
    keywordSeed: project.keywordSeed || [],
    firstPublishDate: project.firstPublishDate ? new Date(project.firstPublishDate).toISOString().split('T')[0] : '',
    avoidCannibalization: project.avoidCannibalization,
  });

  const [kbValue, setKbValue] = useState(project.knowledgeBase);

  // Check if project was modified after strategy creation
  const needsStrategyRegeneration = () => {
    if (!activeStrategy) return false;
    const projectUpdated = new Date(project.updatedAt);
    const strategyCreated = new Date(activeStrategy.createdAt);
    return projectUpdated > strategyCreated;
  };

    // Check if keyword research was updated after strategy creation
  const isKeywordResearchOutdated = () => {
    if (!activeStrategy || !project.keywordResearchUpdatedAt) return false;
    const researchUpdated = new Date(project.keywordResearchUpdatedAt);
    const strategyCreated = new Date(activeStrategy.createdAt);
    return researchUpdated > strategyCreated;
  };


      {/* Keyword Research Outdated Warning */}
      {isKeywordResearchOutdated() && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Strategy May Be Outdated
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Keyword research was updated on{' '}
                  {new Date(project.keywordResearchUpdatedAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  after the current strategy was created. Consider regenerating your strategy
                  to align with the updated keyword data.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

  const handleSaveInfo = async () => {
    setIsSaving(true);
    try {
      await updateProjectMetadata({
        projectId: project.id,
        ...infoData,
        competitorUrls: infoData.competitorUrls.filter((url) => url.trim()),
        keywordSeed: infoData.keywordSeed.filter((kw) => kw.trim()),
        firstPublishDate: infoData.firstPublishDate ? new Date(infoData.firstPublishDate) : null,
      });
      setIsEditingInfo(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('Failed to update project: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveKB = async () => {
    setIsSaving(true);
    try {
      await updateProjectKnowledgeBase({
        projectId: project.id,
        knowledgeBase: kbValue,
      });
      setIsEditingKB(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to update KB:', error);
      alert('Failed to update knowledge base: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArrayChange = (field, index, value) => {
    setInfoData((prev) => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const addArrayItem = (field) => {
    setInfoData((prev) => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  const removeArrayItem = (field, index) => {
    setInfoData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Regeneration Warning Banner */}
      {needsStrategyRegeneration() && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Project Modified
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                You've made changes to this project after the strategy was created. Consider regenerating the strategy to reflect these updates.
              </p>
              <button
                onClick={() => window.location.href = `/projects/${project.id}#strategy`}
                className="mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg font-medium transition-colors"
              >
                Go to Strategy Tab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Project Information</h3>
          {!isEditingInfo && (
            <button
              onClick={() => setIsEditingInfo(true)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit
            </button>
          )}
        </div>

        {isEditingInfo ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={infoData.name}
                onChange={(e) => setInfoData({ ...infoData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={infoData.description}
                onChange={(e) => setInfoData({ ...infoData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                <select
                  value={infoData.language}
                  onChange={(e) => setInfoData({ ...infoData, language: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                  <option value="it">Italian</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Publish Date</label>
                <input
                  type="date"
                  value={infoData.firstPublishDate}
                  onChange={(e) => setInfoData({ ...infoData, firstPublishDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
              <textarea
                value={infoData.target}
                onChange={(e) => setInfoData({ ...infoData, target: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Objectives</label>
              <textarea
                value={infoData.objectives}
                onChange={(e) => setInfoData({ ...infoData, objectives: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Blog URL</label>
              <input
                type="url"
                value={infoData.blogUrl}
                onChange={(e) => setInfoData({ ...infoData, blogUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Main Site URL</label>
              <input
                type="url"
                value={infoData.mainSiteUrl}
                onChange={(e) => setInfoData({ ...infoData, mainSiteUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Competitor URLs</label>
              {infoData.competitorUrls.map((url, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleArrayChange('competitorUrls', index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {infoData.competitorUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('competitorUrls', index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('competitorUrls')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add Competitor
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Keyword Seeds</label>
              {infoData.keywordSeed.map((kw, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={kw}
                    onChange={(e) => handleArrayChange('keywordSeed', index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {infoData.keywordSeed.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('keywordSeed', index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('keywordSeed')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add Keyword
              </button>
            </div>

            <div>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={infoData.avoidCannibalization}
                  onChange={(e) => setInfoData({ ...infoData, avoidCannibalization: e.target.checked })}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Avoid Keyword Cannibalization
                  </span>
                  <p className="text-xs text-gray-600 mt-1">
                    Prevent using keywords already covered in your existing blog/main site
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setIsEditingInfo(false);
                  setInfoData({
                    name: project.name,
                    description: project.description,
                    language: project.language,
                    target: project.target,
                    objectives: project.objectives,
                    blogUrl: project.blogUrl || '',
                    mainSiteUrl: project.mainSiteUrl || '',
                    competitorUrls: project.competitorUrls || [],
                    keywordSeed: project.keywordSeed || [],
                    firstPublishDate: project.firstPublishDate ? new Date(project.firstPublishDate).toISOString().split('T')[0] : '',
                    avoidCannibalization: project.avoidCannibalization,
                  });
                }}
                disabled={isSaving}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInfo}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <p className="text-gray-900">{project.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <StatusBadge status={project.status} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <p className="text-gray-900 capitalize">{project.language}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Publish Date</label>
              <p className="text-gray-900">
                {project.firstPublishDate
                  ? new Date(project.firstPublishDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Not set'}
              </p>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <p className="text-gray-900">{project.description}</p>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
              <p className="text-gray-900">{project.target}</p>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Objectives</label>
              <p className="text-gray-900">{project.objectives}</p>
            </div>

            {project.blogUrl && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Blog URL</label>
                <a
                  href={project.blogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700"
                >
                  {project.blogUrl}
                </a>
              </div>
            )}

            {project.mainSiteUrl && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Main Site URL</label>
                <a
                  href={project.mainSiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700"
                >
                  {project.mainSiteUrl}
                </a>
              </div>
            )}

            {project.competitorUrls && project.competitorUrls.length > 0 && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Competitors</label>
                <ul className="space-y-1">
                  {project.competitorUrls.map((url, index) => (
                    <li key={index}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {project.keywordSeed && project.keywordSeed.length > 0 && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Keyword Seeds</label>
                <div className="flex flex-wrap gap-2">
                  {project.keywordSeed.map((kw, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keyword Cannibalization Prevention
              </label>
              <p className="text-gray-900">
                {project.avoidCannibalization ? (
                  <span className="text-green-600">✓ Enabled</span>
                ) : (
                  <span className="text-gray-600">Disabled</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Knowledge Base Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Knowledge Base</h3>
          {!isEditingKB && (
            <button
              onClick={() => setIsEditingKB(true)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit
            </button>
          )}
        </div>

        {isEditingKB ? (
          <div className="space-y-4">
            <textarea
              value={kbValue}
              onChange={(e) => setKbValue(e.target.value)}
              rows={15}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsEditingKB(false);
                  setKbValue(project.knowledgeBase);
                }}
                disabled={isSaving}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveKB}
                disabled={isSaving || kbValue.trim().length < 50}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
              {project.knowledgeBase}
            </pre>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {activeStrategy && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {activeStrategy.themePillars?.length || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Theme Pillars</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {activeStrategy.calendarPosts?.length || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Posts</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {activeStrategy.coveragePeriodDays || 30}
              </div>
              <div className="text-sm text-gray-600 mt-1">Days Coverage</div>
            </div>
          </div>
        </div>
      )}
      {/* AI Site Analysis */}
<SiteAnalysisDisplay project={project} />
    </div>
  );
}