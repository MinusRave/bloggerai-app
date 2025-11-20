import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEditorialProject, startKeywordResearch } from 'wasp/client/operations';

export default function ProjectCreateForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showAdvancedUrls, setShowAdvancedUrls] = useState(false);

  // Calculate default first publish date (today + 7 days)
  const getDefaultFirstPublishDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    language: 'en',
    target: '',
    objectives: '',
    blogUrl: '',
    mainSiteUrl: '',
    sitemapUrl: '',
    aboutPageUrl: '',
    pricingPageUrl: '',
    servicesPageUrl: '',
    competitorUrls: [''],
    keywordSeed: [''],
    firstPublishDate: getDefaultFirstPublishDate(),
    avoidCannibalization: true,
    knowledgeBase: '',
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field, index, value) => {
    setFormData((prev) => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const addArrayItem = (field) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    setIsCreating(true);

    try {
      // Create project
      const project = await createEditorialProject({
        ...formData,
        competitorUrls: formData.competitorUrls.filter((url) => url.trim()),
        keywordSeed: formData.keywordSeed.filter((kw) => kw.trim()),
        firstPublishDate: new Date(formData.firstPublishDate),
      });

      // Auto-start keyword research in background (optional)
      try {
        await startKeywordResearch({ projectId: project.id });
        console.log('Keyword research started automatically');
      } catch (error) {
        console.warn('Failed to auto-start keyword research:', error);
        // Non-blocking - user can start it manually from project page
      }

      // Redirect to project page
      navigate(`/projects/${project.id}`);
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err.message || 'Failed to create project');
      setIsCreating(false);
    }
  };

  const canProceed = () => {
    if (step === 1) {
      return formData.name.trim() && formData.description.trim() && formData.language;
    }
    if (step === 2) {
      return formData.target.trim() && formData.objectives.trim();
    }
    if (step === 3) {
      return formData.knowledgeBase.trim().length >= 50;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Editorial Project</h1>
          <p className="mt-2 text-gray-600">
            Step {step} of 4: {step === 1 ? 'Basic Info' : step === 2 ? 'References' : step === 3 ? 'Knowledge Base' : 'Review'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full ${
                  s <= step ? 'bg-blue-600' : 'bg-gray-200'
                } ${s < 4 ? 'mr-2' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          )}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="My Tech Blog Strategy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="A blog about software development, DevOps, and cloud technologies..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language *
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => handleChange('language', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="en">English</option>
                  <option value="it">Italian</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience *
                </label>
                <textarea
                  value={formData.target}
                  onChange={(e) => handleChange('target', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Software developers, CTOs, tech leads interested in modern DevOps practices..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Objectives *
                </label>
                <textarea
                  value={formData.objectives}
                  onChange={(e) => handleChange('objectives', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Increase organic traffic by 50%, generate qualified leads for SaaS product, establish thought leadership..."
                />
              </div>
            </div>
          )}

          {/* Step 2: References */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Publish Date *
                </label>
                <input
                  type="date"
                  value={formData.firstPublishDate}
                  onChange={(e) => handleChange('firstPublishDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-600">
                  When should the first post be published? (Default: 7 days from today)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blog URL (optional)
                </label>
                <input
                  type="url"
                  value={formData.blogUrl}
                  onChange={(e) => handleChange('blogUrl', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://yourblog.com"
                />
                <p className="mt-1 text-xs text-gray-600">
                  Your existing blog for content gap analysis
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Main Site URL (optional)
                </label>
                <input
                  type="url"
                  value={formData.mainSiteUrl}
                  onChange={(e) => handleChange('mainSiteUrl', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://yourcompany.com"
                />
                <p className="mt-1 text-xs text-gray-600">
                  AI will analyze your site to extract business info automatically
                </p>
              </div>

              {/* Advanced URL Configuration */}
              <div className="border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvancedUrls(!showAdvancedUrls)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  {showAdvancedUrls ? '▼' : '▶'} Advanced: Specify Key Pages
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Provide specific URLs for more accurate AI analysis (leave blank for auto-discovery)
                </p>
              </div>

              {showAdvancedUrls && (
                <div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">
                      Sitemap URL
                    </label>
                    <input
                      type="url"
                      value={formData.sitemapUrl}
                      onChange={(e) => handleChange('sitemapUrl', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://yoursite.com/sitemap.xml"
                    />
                    <p className="text-xs text-blue-700 mt-1">
                      For accurate blog post discovery
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">
                      About Page URL
                    </label>
                    <input
                      type="url"
                      value={formData.aboutPageUrl}
                      onChange={(e) => handleChange('aboutPageUrl', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://yoursite.com/about"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">
                      Pricing Page URL
                    </label>
                    <input
                      type="url"
                      value={formData.pricingPageUrl}
                      onChange={(e) => handleChange('pricingPageUrl', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://yoursite.com/pricing"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">
                      Services/Products Page URL
                    </label>
                    <input
                      type="url"
                      value={formData.servicesPageUrl}
                      onChange={(e) => handleChange('servicesPageUrl', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://yoursite.com/services"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Competitor URLs (optional)
                </label>
                {formData.competitorUrls.map((url, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => handleArrayChange('competitorUrls', index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://competitor.com"
                    />
                    {formData.competitorUrls.length > 1 && (
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keyword Seeds (optional)
                </label>
                {formData.keywordSeed.map((kw, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={kw}
                      onChange={(e) => handleArrayChange('keywordSeed', index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="cloud computing"
                    />
                    {formData.keywordSeed.length > 1 && (
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

              <div className="border-t border-gray-200 pt-6">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.avoidCannibalization}
                    onChange={(e) => handleChange('avoidCannibalization', e.target.checked)}
                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      Avoid Keyword Cannibalization
                    </span>
                    <p className="text-xs text-gray-600 mt-1">
                      Prevent using keywords already covered in your existing blog/main site. Recommended to keep checked.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Knowledge Base */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Knowledge Base * (minimum 50 characters)
                </label>
                <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <p className="font-medium mb-1">💡 What to include:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Services, products, features you offer</li>
                    <li>Pricing, plans, special offers</li>
                    <li>Company history, values, unique selling points</li>
                    <li>Target markets, case studies, success stories</li>
                    <li>Any factual information the AI should know about your business</li>
                  </ul>
                </div>
                <textarea
                  value={formData.knowledgeBase}
                  onChange={(e) => handleChange('knowledgeBase', e.target.value)}
                  rows={15}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Example:

We are DevOps Cloud, a SaaS platform that helps development teams automate their CI/CD pipelines.

Our Services:
- CI/CD Pipeline Automation: $29/month
- Container Orchestration: $49/month  
- Enterprise Plan with custom integrations: $199/month

We specialize in helping mid-size tech companies (50-500 employees) migrate from legacy infrastructure to modern cloud-native architectures.

Key differentiators:
- 99.9% uptime SLA
- Support for AWS, GCP, and Azure
- Free migration assistance for Enterprise customers

Recent achievements:
- Helped 200+ companies migrate to cloud
- Featured in TechCrunch (Jan 2024)
- SOC2 Type II certified"
                />
                <p className="mt-2 text-sm text-gray-600">
                  {formData.knowledgeBase.length} / 50 characters minimum
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Your Project</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Project Name</h4>
                  <p className="text-gray-900">{formData.name}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700">Description</h4>
                  <p className="text-gray-900">{formData.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Language</h4>
                    <p className="text-gray-900 capitalize">{formData.language}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">First Publish Date</h4>
                    <p className="text-gray-900">
                      {new Date(formData.firstPublishDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700">Target Audience</h4>
                  <p className="text-gray-900">{formData.target}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700">Objectives</h4>
                  <p className="text-gray-900">{formData.objectives}</p>
                </div>

                {formData.blogUrl && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Blog URL</h4>
                    <p className="text-gray-900">{formData.blogUrl}</p>
                  </div>
                )}

                {formData.mainSiteUrl && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Main Site URL</h4>
                    <p className="text-gray-900">{formData.mainSiteUrl}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-gray-700">Competitors</h4>
                  <p className="text-gray-900">
                    {formData.competitorUrls.filter((u) => u.trim()).length || 'None'}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700">Keyword Seeds</h4>
                  <p className="text-gray-900">
                    {formData.keywordSeed.filter((k) => k.trim()).join(', ') || 'None'}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700">Keyword Cannibalization Prevention</h4>
                  <p className="text-gray-900">
                    {formData.avoidCannibalization ? 'Enabled ✓' : 'Disabled'}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700">Knowledge Base</h4>
                  <p className="text-gray-900 text-sm">
                    {formData.knowledgeBase.substring(0, 200)}...
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.knowledgeBase.length} characters
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  📋 Next Steps After Project Creation:
                </p>
                <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                  <li><strong>Keyword Research Tab</strong> - Start keyword research (2-5 minutes, runs automatically)</li>
                  <li><strong>Review Keywords</strong> - Select and approve keywords (manual step, minimum 30 required)</li>
                  <li><strong>Strategy Tab</strong> - Generate your 30-day editorial calendar (1-2 minutes)</li>
                </ol>
                <p className="text-xs text-blue-700 mt-3">
                  First post will be scheduled for: {new Date(formData.firstPublishDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => step > 1 && setStep(step - 1)}
              disabled={step === 1 || isCreating}
              className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>

            <div className="flex gap-3">
              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => canProceed() && setStep(step + 1)}
                  disabled={!canProceed()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isCreating}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      Create Project
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}