import React, { useState } from 'react';
import { generateStrategyFromKeywords } from 'wasp/client/operations';
import { ProgressModal, SuccessModal } from '../shared/ModalComponents';

export default function GenerateStrategyButton({ project, onSuccess }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [strategyResult, setStrategyResult] = useState(null);

  const steps = [
    {
      label: 'Loading keyword data',
      description: 'Retrieving selected keywords and clusters',
      duration: '5s',
    },
    {
      label: 'Creating thematic pillars',
      description: 'AI is organizing keywords into content pillars',
      duration: '15s',
    },
    {
      label: 'Assigning keywords to posts',
      description: 'Distributing keywords across 30 blog posts',
      duration: '20s',
    },
    {
      label: 'Generating internal linking suggestions',
      description: 'Planning content connections and user journey',
      duration: '15s',
    },
    {
      label: 'Finding external resources',
      description: 'Identifying authoritative sources to link',
      duration: '10s',
    },
    {
      label: 'Finalizing strategy',
      description: 'Saving to database and preparing calendar',
      duration: '5s',
    },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setCurrentStep(0);
    setError(null);

    // Simulate realistic progress steps
    const progressInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 12000); // Move to next step every 12 seconds (total ~72s)

    try {
      const result = await generateStrategyFromKeywords({
        projectId: project.id,
        userRequest: null,
      });

      clearInterval(progressInterval);
      setCurrentStep(steps.length); // All complete
      setStrategyResult(result);
      
      // Wait a moment to show final step complete
      setTimeout(() => {
        setIsGenerating(false);
        setShowSuccess(true);
      }, 1000);

    } catch (err) {
      clearInterval(progressInterval);
      console.error('Strategy generation failed:', err);
      setError(err.message || 'Failed to generate strategy. Please try again.');
      setIsGenerating(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    if (onSuccess) {
      onSuccess(strategyResult);
    } else {
      // Refresh to show new strategy
      window.location.reload();
    }
  };

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isGenerating ? (
          <>
            <span className="animate-spin">⏳</span>
            Generating...
          </>
        ) : (
          <>
            <span>✨</span>
            Generate Strategy from Keywords
          </>
        )}
      </button>

      {/* Progress Modal */}
      <ProgressModal
        isOpen={isGenerating}
        title="Generating Editorial Strategy"
        steps={steps}
        currentStep={currentStep}
        error={error}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={handleSuccessClose}
        title="Strategy Generated!"
        message={`Successfully created ${strategyResult?.pillarsCount || 0} content pillars with ${strategyResult?.postsCount || 0} blog posts. Your editorial calendar is ready!`}
        actionText="View Strategy"
      />
    </>
  );
}