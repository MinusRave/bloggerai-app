import { HttpError } from 'wasp/server';
import { executeKeywordResearch } from './services/keywordResearchOrchestrator.js';
import { generateStrategyFromKeywordResearch } from './ai/strategist.js';
import { analyzeCompanySite } from './ai/siteAnalyzer.js';
import { prisma } from 'wasp/server';


// PASTE THIS INTO YOUR operations_keyword_research.js FILE
// This adds the reRunKeywordResearch function

import { researchKeywordsPremium } from './services/keywordResearchPremium.js';

/**
 * Re-run keyword research for a project (manual trigger by user)
 * Allows user to choose between free and premium tools
 */

export const reRunKeywordResearch = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authenticated');
  }

  const { projectId, usePremium = false } = args;

  const project = await context.entities.EditorialProject.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new HttpError(404, 'Project not found');
  }

  if (project.userId !== context.user.id) {
    throw new HttpError(403, 'Not authorized');
  }

  let premiumProvider = null;
  let premiumAPIKey = null;

  if (usePremium) {
    const userAPIKeys = await context.entities.UserAPIKey.findMany({
      where: {
        userId: context.user.id,
        isActive: true,
      },
    });

    if (userAPIKeys.length === 0) {
      throw new HttpError(400, 'No active API keys found. Please add an API key first.');
    }

    const apiKeyRecord = userAPIKeys[0];
    premiumProvider = apiKeyRecord.provider;
    premiumAPIKey = Buffer.from(apiKeyRecord.apiKey, 'base64').toString('utf-8');

    await context.entities.UserAPIKey.update({
      where: { id: apiKeyRecord.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    });
  }

  console.log(`🔍 Starting keyword research for project ${projectId} (Premium: ${usePremium})`);

  await context.entities.KeywordResearch.deleteMany({
    where: { projectId },
  });

  const research = await context.entities.KeywordResearch.create({
    data: {
      projectId,
      useFreeTool: !usePremium,
      usePremiumAPI: usePremium,
      premiumProvider: usePremium ? premiumProvider : null,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      userProvidedSeeds: project.keywordSeed || [],
    },
  });

  try {
    const projectContext = {
      name: project.name,
      description: project.description,
      language: project.language,
      target: project.target,
      objectives: project.objectives,
      keywordSeed: project.keywordSeed,
      competitorUrls: project.competitorUrls,
      blogUrl: project.blogUrl,
      mainSiteUrl: project.mainSiteUrl,
      avoidCannibalization: project.avoidCannibalization,
      knowledgeBase: project.knowledgeBase,
    };

    const researchResult = await executeKeywordResearch({
      projectContext,
      usePremiumAPI: usePremium,
      premiumProvider: usePremium ? premiumProvider : null,
      premiumAPIKey: usePremium ? premiumAPIKey : null,
    });

    for (const cluster of researchResult.clusters) {
      const savedCluster = await context.entities.KeywordCluster.create({
        data: {
          researchId: research.id,
          name: cluster.name,
          orderIndex: cluster.orderIndex,
          totalKeywords: cluster.totalKeywords,
          avgDifficulty: cluster.avgDifficulty,
          totalVolume: cluster.totalVolume,
          priorityScore: cluster.priorityScore,
          dominantFunnel: cluster.dominantFunnel,
          dominantIntent: cluster.dominantIntent,
          isSelectedByAI: cluster.isSelectedByAI,
          aiRationale: cluster.aiRationale,
        },
      });

      for (const kw of cluster.keywords) {
        await context.entities.Keyword.create({
          data: {
            clusterId: savedCluster.id,
            keyword: kw.keyword,
            language: project.language,
            freeVolume: kw.freeVolume,
            freeDifficulty: kw.freeDifficulty,
            relativePopularity: kw.relativePopularity,
            premiumVolume: kw.premiumVolume,
            premiumDifficulty: kw.premiumDifficulty,
            premiumCPC: kw.premiumCPC,
            premiumCompetition: kw.premiumCompetition,
            searchIntent: kw.searchIntent,
            funnelStage: kw.funnelStage,
            hasFeaturedSnippet: kw.hasFeaturedSnippet,
            hasPAA: kw.hasPAA,
            hasVideoCarousel: kw.hasVideoCarousel,
            hasImagePack: kw.hasImagePack,
            hasLocalPack: kw.hasLocalPack,
            isInExistingContent: kw.isInExistingContent,
            existingContentUrl: kw.existingContentUrl,
            isSelectedByAI: kw.isSelectedByAI,
            isSelectedByUser: kw.isSelectedByUser,
            aiRationale: kw.aiRationale,
            source: kw.source,
            sourceUrl: kw.sourceUrl,
          },
        });
      }
    }

    const allKeywords = await context.entities.Keyword.findMany({
      where: {
        cluster: {
          researchId: research.id,
        },
      },
    });

    const aiSelectedCount = allKeywords.filter(k => k.isSelectedByAI).length;

    await context.entities.KeywordResearch.update({
      where: { id: research.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        totalKeywordsFound: researchResult.totalKeywords,
        totalClustersFound: researchResult.clusters.length,
        aiSelectedCount,
        aiModel: 'claude-sonnet-4-20250514',
        processingMs: researchResult.duration,
        errorMessage: null,
      },
    });

    await context.entities.EditorialProject.update({
      where: { id: projectId },
      data: {
        keywordResearchUpdatedAt: new Date(),
        usePremiumKeywords: usePremium,
        status: 'RESEARCH_READY',
      },
    });

    console.log(`✅ Keyword research completed: ${researchResult.totalKeywords} keywords in ${researchResult.clusters.length} clusters`);

    return {
      success: true,
      researchId: research.id,
      count: researchResult.totalKeywords,
      clusters: researchResult.clusters.length,
      usePremium,
    };

  } catch (error) {
    console.error('❌ Keyword research failed:', error);
    
    await context.entities.KeywordResearch.update({
      where: { id: research.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: error.message || 'Unknown error occurred',
      },
    });

    await context.entities.EditorialProject.update({
      where: { id: projectId },
      data: {
        status: 'DRAFT',
      },
    });

    throw new HttpError(500, `Research failed: ${error.message}`);
  }
};

// ============================================
// KEYWORD RESEARCH OPERATIONS
// ============================================

/**
 * Start keyword research for a project
 * Called automatically after project creation or manually by user
 */
export const startKeywordResearch = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authenticated');
  }

  const { projectId } = args;

  // Get project
  const project = await context.entities.EditorialProject.findUnique({
    where: { id: projectId },
    include: { user: true },
  });

  if (!project) {
    throw new HttpError(404, 'Project not found');
  }

  if (project.userId !== context.user.id) {
    throw new HttpError(403, 'Not authorized');
  }

  // Check if research already exists and is completed
  const existingResearch = await context.entities.KeywordResearch.findFirst({
    where: {
      projectId,
      status: { in: ['COMPLETED', 'IN_PROGRESS'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existingResearch?.status === 'IN_PROGRESS') {
    throw new HttpError(400, 'Research already in progress');
  }

  // Check for user API keys (premium)
  const userAPIKeys = await context.entities.UserAPIKey.findMany({
    where: {
      userId: context.user.id,
      isActive: true,
    },
  });

  const usePremiumAPI = userAPIKeys.length > 0;
  const premiumProvider = usePremiumAPI ? userAPIKeys[0].provider : null;
  const premiumAPIKey = usePremiumAPI ? userAPIKeys[0].apiKey : null;

  // Create research record
  const research = await context.entities.KeywordResearch.create({
    data: {
      projectId,
      useFreeTool: true,
      usePremiumAPI,
      premiumProvider,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  });

  // Update project status immediately
  await context.entities.EditorialProject.update({
    where: { id: projectId },
    data: { status: 'RESEARCH_PENDING' },
  });

  // Execute research in background (async, don't await)
  // Use setImmediate to detach from request context
  setImmediate(() => {
    executeResearchBackground(research.id, project, premiumProvider, premiumAPIKey).catch(
      (error) => {
        console.error('[Keyword Research] Background execution failed:', error);
      }
    );
  });

  return {
    researchId: research.id,
    status: 'IN_PROGRESS',
    message: 'Keyword research started. This may take 2-5 minutes.',
  };
};

/**
 * Background research executor
 * NOTE: Uses Prisma client directly since this runs outside request context
 */
async function executeResearchBackground(
  researchId,
  project,
  premiumProvider,
  premiumAPIKey
) {
  try {
    console.log(`[Keyword Research] Starting background research for project ${project.id}`);

    // STEP 0: AI SITE ANALYSIS (if needed)
    let siteAnalysisData = project.siteAnalysisData;
    
    // Run site analysis if:
    // 1. mainSiteUrl is provided
    // 2. No previous analysis exists OR project was updated
    // 3. Description or KB is minimal
    const needsSiteAnalysis = 
      project.mainSiteUrl && 
      (!siteAnalysisData || 
       project.description.length < 50 || 
       project.knowledgeBase.length < 100);

    if (needsSiteAnalysis) {
      console.log('[Keyword Research] Running AI site analysis...');
      
      try {
        const analysis = await analyzeCompanySite(project.mainSiteUrl);
        
        siteAnalysisData = {
          pagesAnalyzed: analysis.pagesAnalyzed,
          extractedInfo: analysis.extractedInfo,
          confidence: analysis.extractedInfo.confidence,
          analyzedAt: new Date().toISOString(),
        };

        // Update project with analysis and extracted info
        await prisma.editorialProject.update({
          where: { id: project.id },
          data: {
            siteAnalysisData,
            siteAnalyzedAt: new Date(),
            // Auto-fill fields if they're minimal
            description: project.description.length < 50 && analysis.extractedInfo.description
              ? analysis.extractedInfo.description
              : project.description,
            target: project.target.length < 20 && analysis.extractedInfo.target
              ? analysis.extractedInfo.target
              : project.target,
            objectives: project.objectives.length < 20 && analysis.extractedInfo.objectives
              ? analysis.extractedInfo.objectives
              : project.objectives,
            knowledgeBase: project.knowledgeBase.length < 100 && analysis.extractedInfo.knowledgeBase
              ? analysis.extractedInfo.knowledgeBase
              : project.knowledgeBase,
          },
        });

        // Update local project object
        project.description = project.description.length < 50 && analysis.extractedInfo.description
          ? analysis.extractedInfo.description
          : project.description;
        project.target = project.target.length < 20 && analysis.extractedInfo.target
          ? analysis.extractedInfo.target
          : project.target;
        project.objectives = project.objectives.length < 20 && analysis.extractedInfo.objectives
          ? analysis.extractedInfo.objectives
          : project.objectives;
        project.knowledgeBase = project.knowledgeBase.length < 100 && analysis.extractedInfo.knowledgeBase
          ? analysis.extractedInfo.knowledgeBase
          : project.knowledgeBase;

        console.log('[Keyword Research] Site analysis complete and saved');
      } catch (error) {
        console.error('[Keyword Research] Site analysis failed:', error);
        // Continue with research even if site analysis fails
      }
    }

    const projectContext = {
      name: project.name,
      description: project.description,
      language: project.language,
      target: project.target,
      objectives: project.objectives,
      keywordSeed: project.keywordSeed,
      competitorUrls: project.competitorUrls,
      blogUrl: project.blogUrl,
      mainSiteUrl: project.mainSiteUrl,
      avoidCannibalization: project.avoidCannibalization,
      knowledgeBase: project.knowledgeBase,
    };

    const researchResult = await executeKeywordResearch({
      projectContext,
      usePremiumAPI: !!premiumProvider,
      premiumProvider,
      premiumAPIKey,
    });

    // NEW: Process Own Content Analysis
const ownContentAnalysis = researchResult.ownContentAnalysis || {
  analyzed: false,
  existingKeywords: new Set(),
  existingTopics: new Set(),
  totalPosts: 0,
};

// Convert Sets to Arrays for JSON storage
const ownContentData = ownContentAnalysis.analyzed ? {
  existingKeywords: Array.from(ownContentAnalysis.existingKeywords || []),
  existingTopics: Array.from(ownContentAnalysis.existingTopics || []),
  blogPosts: ownContentAnalysis.blogPosts || [],
  analyzed: true,
} : null;

console.log(`[Keyword Research] Own content analyzed: ${ownContentAnalysis.analyzed}`);
console.log(`[Keyword Research] Found ${ownContentAnalysis.totalPosts} blog posts`);

    // Save clusters and keywords to database
    // Use prisma directly instead of context.entities
    const savedClusters = [];

    for (const cluster of researchResult.clusters) {
      const savedCluster = await prisma.keywordCluster.create({
        data: {
          researchId,
          name: cluster.name,
          orderIndex: cluster.orderIndex,
          totalKeywords: cluster.totalKeywords,
          avgDifficulty: cluster.avgDifficulty,
          totalVolume: cluster.totalVolume,
          priorityScore: cluster.priorityScore,
          dominantFunnel: cluster.dominantFunnel,
          dominantIntent: cluster.dominantIntent,
          isSelectedByAI: cluster.isSelectedByAI,
          aiRationale: cluster.aiRationale,
        },
      });

      // Save keywords for this cluster
      for (const kw of cluster.keywords) {
        await prisma.keyword.create({
          data: {
            clusterId: savedCluster.id,
            keyword: kw.keyword,
            language: project.language,
            freeVolume: kw.freeVolume,
            freeDifficulty: kw.freeDifficulty,
            relativePopularity: kw.relativePopularity,
            premiumVolume: kw.premiumVolume,
            premiumDifficulty: kw.premiumDifficulty,
            premiumCPC: kw.premiumCPC,
            premiumCompetition: kw.premiumCompetition,
            searchIntent: kw.searchIntent,
            funnelStage: kw.funnelStage,
            hasFeaturedSnippet: kw.hasFeaturedSnippet,
            hasPAA: kw.hasPAA,
            hasVideoCarousel: kw.hasVideoCarousel,
            hasImagePack: kw.hasImagePack,
            hasLocalPack: kw.hasLocalPack,
            isInExistingContent: kw.isInExistingContent,
            existingContentUrl: kw.existingContentUrl,
            isSelectedByAI: kw.isSelectedByAI,
            isSelectedByUser: kw.isSelectedByUser,
            aiRationale: kw.aiRationale,
            source: kw.source,
            sourceUrl: kw.sourceUrl,
          },
        });
      }

      savedClusters.push(savedCluster);
    }

   // Calculate selection counts
const allSavedKeywords = await prisma.keyword.findMany({
  where: {
    cluster: {
      researchId,
    },
  },
});

let aiSelectedCount = allSavedKeywords.filter((k) => k.isSelectedByAI).length;

// ========== AGGIUNGI QUESTO BLOCCO ==========
console.log('[Keyword Research] Selection Summary:');
console.log(`Total keywords: ${allSavedKeywords.length}`);
console.log(`AI selected: ${aiSelectedCount}`);

// FALLBACK: If AI didn't select anything, auto-select top keywords
if (aiSelectedCount === 0 && allSavedKeywords.length > 0) {
  console.log('[Keyword Research] ⚠️  AI selection empty! Auto-selecting top keywords...');
  
  // Calculate score for each keyword (higher volume + lower difficulty = better)
  const scoredKeywords = allSavedKeywords
    .map(kw => {
      const volume = kw.premiumVolume || 0;
      const difficulty = kw.premiumDifficulty || (
        kw.freeDifficulty === 'EASY' ? 25 :
        kw.freeDifficulty === 'MEDIUM' ? 50 :
        kw.freeDifficulty === 'HARD' ? 75 : 90
      );
      
      // Priority: high volume, low difficulty, has SERP features
      let score = volume - difficulty;
      if (kw.hasFeaturedSnippet) score += 50; // Featured snippet = big opportunity
      if (kw.hasPAA) score += 20; // PAA = good
      if (kw.isInExistingContent) score -= 100; // Avoid cannibalization
      
      return { ...kw, score };
    })
    .sort((a, b) => b.score - a.score);
  
  // Select top 80-120 keywords (enough for 30 posts with secondary keywords)
  const targetCount = Math.min(100, Math.floor(allSavedKeywords.length * 0.7));
  const topKeywords = scoredKeywords.slice(0, targetCount);
  
  // Update them to isSelectedByAI: true
  if (topKeywords.length > 0) {
    await prisma.keyword.updateMany({
      where: {
        id: {
          in: topKeywords.map(k => k.id)
        }
      },
      data: {
        isSelectedByAI: true,
        aiRationale: 'Auto-selected: Optimal volume/difficulty ratio'
      }
    });
    
    aiSelectedCount = topKeywords.length;
    console.log(`[Keyword Research] ✅ Auto-selected ${topKeywords.length} keywords`);
  }
}
// ========== FINE BLOCCO DA AGGIUNGERE ==========

    // Update research status
    await prisma.keywordResearch.update({
  where: { id: researchId },
  data: {
    status: 'COMPLETED',
    completedAt: new Date(),
    totalKeywordsFound: researchResult.totalKeywords,
    totalClustersFound: researchResult.clusters.length,
    aiSelectedCount,
    aiModel: 'claude-sonnet-4-20250514',
    tokenCount: null,
    processingMs: researchResult.duration,
    // Own Content Analysis
    ownContentAnalyzed: ownContentAnalysis.analyzed,
    totalBlogPosts: ownContentAnalysis.totalPosts || 0,
    existingKeywordsCount: ownContentAnalysis.existingKeywords?.size || 0,
    ownContentData: ownContentData,
    // NEW: Keyword Seeds Tracking
    aiGeneratedSeeds: researchResult.aiSeedsMetadata ? 
      projectContext.keywordSeed.filter(seed => 
        !project.keywordSeed.some(userSeed => userSeed.toLowerCase() === seed.toLowerCase())
      ) : [],
    userProvidedSeeds: project.keywordSeed || [],
    totalSeedsCount: projectContext.keywordSeed.length,
  },
});

    // Update project status
    await prisma.editorialProject.update({
      where: { id: project.id },
      data: { status: 'RESEARCH_READY' },
    });

    console.log(`[Keyword Research] Completed for project ${project.id}`);
  } catch (error) {
    console.error('[Keyword Research] Background execution failed:', error);

    await prisma.keywordResearch.update({
      where: { id: researchId },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
        completedAt: new Date(),
      },
    });

    await prisma.editorialProject.update({
      where: { id: project.id },
      data: { status: 'DRAFT' },
    });
  }
}

/**
 * Get keyword research results for a project
 */
export const getKeywordResearch = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authenticated');
  }

  const { projectId } = args;

  const project = await context.entities.EditorialProject.findUnique({
    where: { id: projectId },
  });

  if (!project || project.userId !== context.user.id) {
    throw new HttpError(403, 'Not authorized');
  }

  const research = await context.entities.KeywordResearch.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    include: {
      clusters: {
        include: {
          keywords: {
            orderBy: [
              { isSelectedByAI: 'desc' },
              { premiumVolume: 'desc' },
            ],
          },
        },
        orderBy: { priorityScore: 'desc' },
      },
    },
  });

  if (!research) {
    return null;
  }

  // Calculate stats
  const allKeywords = research.clusters.flatMap((c) => c.keywords);
  const selectedByAI = allKeywords.filter((k) => k.isSelectedByAI);
  const selectedByUser = allKeywords.filter((k) => k.isSelectedByUser);
  const finalSelected = allKeywords.filter((k) => k.isSelectedByAI || k.isSelectedByUser);

  return {
    research,
    stats: {
      totalKeywords: allKeywords.length,
      totalClusters: research.clusters.length,
      aiSelectedCount: selectedByAI.length,
      userSelectedCount: selectedByUser.length,
      finalSelectedCount: finalSelected.length,
      funnelDistribution: {
        ToF: allKeywords.filter((k) => k.funnelStage === 'ToF').length,
        MoF: allKeywords.filter((k) => k.funnelStage === 'MoF').length,
        BoF: allKeywords.filter((k) => k.funnelStage === 'BoF').length,
      },
      intentDistribution: {
        INFORMATIONAL: allKeywords.filter((k) => k.searchIntent === 'INFORMATIONAL').length,
        NAVIGATIONAL: allKeywords.filter((k) => k.searchIntent === 'NAVIGATIONAL').length,
        TRANSACTIONAL: allKeywords.filter((k) => k.searchIntent === 'TRANSACTIONAL').length,
        COMMERCIAL: allKeywords.filter((k) => k.searchIntent === 'COMMERCIAL').length,
      },
    },
  };
};

/**
 * Update keyword selection (toggle AI selection or add user selection)
 */
export const updateKeywordSelection = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authenticated');
  }

  const { keywordId, isSelected, selectionType } = args;

  const keyword = await context.entities.Keyword.findUnique({
    where: { id: keywordId },
    include: {
      cluster: {
        include: {
          research: {
            include: {
              project: true,
            },
          },
        },
      },
    },
  });

  if (!keyword) {
    throw new HttpError(404, 'Keyword not found');
  }

  if (keyword.cluster.research.project.userId !== context.user.id) {
    throw new HttpError(403, 'Not authorized');
  }

  // Update selection with correct logic
  const updateData = {};
  
  if (selectionType === 'ai') {
    // Gestione flag AI
    updateData.isSelectedByAI = isSelected;
    // Se sto deselezionando l'AI e l'utente non ha mai selezionato, pulisco anche user
    if (!isSelected && !keyword.isSelectedByUser) {
      updateData.isSelectedByUser = false;
    }
  } else {
    // Gestione flag USER
    updateData.isSelectedByUser = isSelected;
    // Se sto deselezionando USER ma l'AI aveva selezionato, mantieni solo il flag AI
    if (!isSelected && keyword.isSelectedByAI) {
      // Non fare nulla, lascia il flag AI attivo
    } else if (!isSelected) {
      // Se sto deselezionando e non c'è flag AI, pulisco tutto
      updateData.isSelectedByAI = false;
    }
  }

  const updated = await context.entities.Keyword.update({
    where: { id: keywordId },
    data: updateData,
  });

  // Recalculate research selection counts
  const allKeywords = await context.entities.Keyword.findMany({
    where: {
      cluster: {
        researchId: keyword.cluster.researchId,
      },
    },
  });

  const aiSelectedCount = allKeywords.filter((k) => k.isSelectedByAI).length;
  const userSelectedCount = allKeywords.filter((k) => k.isSelectedByUser).length;

  await context.entities.KeywordResearch.update({
    where: { id: keyword.cluster.researchId },
    data: {
      aiSelectedCount,
      userSelectedCount,
    },
  });

  return updated;
};

/**
 * Bulk update cluster selection
 */
export const updateClusterSelection = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authenticated');
  }

  const { clusterId, isSelected } = args;

  const cluster = await context.entities.KeywordCluster.findUnique({
    where: { id: clusterId },
    include: {
      keywords: true,
      research: {
        include: { project: true },
      },
    },
  });

  if (!cluster) {
    throw new HttpError(404, 'Cluster not found');
  }

  if (cluster.research.project.userId !== context.user.id) {
    throw new HttpError(403, 'Not authorized');
  }

  // Update cluster
  await context.entities.KeywordCluster.update({
    where: { id: clusterId },
    data: { isSelectedByUser: isSelected },
  });

  // Update all keywords in cluster
  await context.entities.Keyword.updateMany({
    where: { clusterId },
    data: { isSelectedByUser: isSelected },
  });

  return { success: true, updatedKeywords: cluster.keywords.length };
};

/**
 * Approve keyword research and proceed to strategy generation
 */
export const approveKeywordResearch = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authenticated');
  }

  const { researchId } = args;

  const research = await context.entities.KeywordResearch.findUnique({
    where: { id: researchId },
    include: {
      project: true,
      clusters: {
        include: { keywords: true },
      },
    },
  });

  if (!research) {
    throw new HttpError(404, 'Research not found');
  }

  if (research.project.userId !== context.user.id) {
    throw new HttpError(403, 'Not authorized');
  }

  if (research.status !== 'COMPLETED') {
    throw new HttpError(400, 'Research not completed');
  }

  // Validate selection
  const selectedKeywords = research.clusters
    .flatMap((c) => c.keywords)
    .filter((k) => k.isSelectedByAI || k.isSelectedByUser);

  if (selectedKeywords.length < 30) {
    throw new HttpError(
      400,
      `Not enough keywords selected. Need at least 30, got ${selectedKeywords.length}`
    );
  }

  // Mark as approved
  await context.entities.KeywordResearch.update({
    where: { id: researchId },
    data: {
      isApproved: true,
      approvedAt: new Date(),
      status: 'APPROVED',
    },
  });

  // Update project status
  await context.entities.EditorialProject.update({
    where: { id: research.projectId },
    data: { status: 'STRATEGY_READY' },
  });

  return {
    success: true,
    selectedKeywords: selectedKeywords.length,
    message: 'Keyword research approved. Ready to generate strategy.',
  };
};

/**
 * CLEANUP: Fix inconsistent keyword selection flags
 * Run this ONCE to clean up data from old buggy logic
 */
export const cleanupKeywordSelectionFlags = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authenticated');
  }

  const { researchId } = args;

  const research = await context.entities.KeywordResearch.findUnique({
    where: { id: researchId },
    include: {
      project: true,
      clusters: {
        include: { keywords: true },
      },
    },
  });

  if (!research || research.project.userId !== context.user.id) {
    throw new HttpError(403, 'Not authorized');
  }

  // Find keywords with inconsistent flags
  const allKeywords = research.clusters.flatMap((c) => c.keywords);
  const problematic = allKeywords.filter(
    (k) => k.isSelectedByAI && k.isSelectedByUser
  );

  console.log(`[Cleanup] Found ${problematic.length} keywords with both flags`);

  // For each problematic keyword, keep only USER flag if both are true
  for (const kw of problematic) {
    await context.entities.Keyword.update({
      where: { id: kw.id },
      data: {
        isSelectedByAI: false,
        isSelectedByUser: true, // Keep user selection
      },
    });
  }

  // Recalculate counts
  const updated = await context.entities.KeywordResearch.findUnique({
    where: { id: researchId },
    include: {
      clusters: {
        include: { keywords: true },
      },
    },
  });

  const updatedKeywords = updated.clusters.flatMap((c) => c.keywords);
  const aiCount = updatedKeywords.filter((k) => k.isSelectedByAI).length;
  const userCount = updatedKeywords.filter((k) => k.isSelectedByUser).length;

  await context.entities.KeywordResearch.update({
    where: { id: researchId },
    data: {
      aiSelectedCount: aiCount,
      userSelectedCount: userCount,
    },
  });

  return {
    success: true,
    fixed: problematic.length,
    newCounts: { ai: aiCount, user: userCount, total: aiCount + userCount },
  };
};

/**
 * Generate strategy from approved keyword research
 */
export const generateStrategyFromKeywords = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authenticated');
  }

  const { projectId, userRequest = null } = args;

  const project = await context.entities.EditorialProject.findUnique({
    where: { id: projectId },
    include: {
      strategySessions: {
        where: { status: 'ACTIVE' },
        include: {
          contentStrategies: {
            where: { isActive: true },
          },
        },
      },
    },
  });

  if (!project || project.userId !== context.user.id) {
    throw new HttpError(403, 'Not authorized');
  }

  // Get approved keyword research
  const research = await context.entities.KeywordResearch.findFirst({
    where: {
      projectId,
      isApproved: true,
    },
    include: {
      clusters: {
        include: {
          keywords: {
            where: {
              OR: [{ isSelectedByAI: true }, { isSelectedByUser: true }],
            },
          },
        },
      },
    },
    orderBy: { approvedAt: 'desc' },
  });

  if (!research) {
    throw new HttpError(400, 'No approved keyword research found');
  }

  // Get or create strategy session
  let session = project.strategySessions[0];
  if (!session) {
    session = await context.entities.StrategySession.create({
      data: {
        projectId,
        status: 'ACTIVE',
      },
    });
  }

  // Prepare data
  const selectedClusters = research.clusters.filter(
    (c) => c.isSelectedByAI || c.isSelectedByUser || c.keywords.length > 0
  );

  const selectedKeywords = selectedClusters.flatMap((c) => c.keywords);

  const projectContext = {
    name: project.name,
    description: project.description,
    language: project.language,
    target: project.target,
    objectives: project.objectives,
    blogUrl: project.blogUrl,
    mainSiteUrl: project.mainSiteUrl,
    firstPublishDate: project.firstPublishDate,
    avoidCannibalization: project.avoidCannibalization,
    knowledgeBase: project.knowledgeBase,
  };

  const keywordResearch = {
    totalKeywordsFound: research.totalKeywordsFound,
    totalClustersFound: research.totalClustersFound,
    aiSelectedCount: research.aiSelectedCount,
    userSelectedCount: research.userSelectedCount,
  };

  // Get previous strategy if exists
  const previousStrategy = session.contentStrategies[0] || null;
  const versionNumber = previousStrategy ? previousStrategy.versionNumber + 1 : 1;

  // Generate strategy
  const strategyResult = await generateStrategyFromKeywordResearch({
    projectContext,
    keywordResearch,
    selectedClusters,
    selectedKeywords,
    previousStrategy,
    userRequest,
    versionNumber,
  });

  // Save to database
  const savedStrategy = await saveStrategyToDatabase(
    context,
    session.id,
    strategyResult,
    research.id
  );

  // Update project status
  await context.entities.EditorialProject.update({
    where: { id: projectId },
    data: { status: 'ACTIVE' },
  });

  return {
    strategyId: savedStrategy.id,
    versionNumber: savedStrategy.versionNumber,
    pillarsCount: savedStrategy.themePillars.length,
    postsCount: savedStrategy.calendarPosts.length,
  };
};

/**
 * Save strategy to database
 */
async function saveStrategyToDatabase(context, sessionId, strategyResult, researchId) {
  // Deactivate previous active strategy
  await context.entities.ContentStrategy.updateMany({
    where: {
      sessionId,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  // Create new strategy
  const strategy = await context.entities.ContentStrategy.create({
    data: {
      sessionId,
      versionNumber: strategyResult.versionNumber,
      globalRationale: strategyResult.globalRationale,
      identifiedGaps: strategyResult.identifiedGaps,
      isActive: true,
      activatedAt: new Date(),
      aiModel: strategyResult.aiMetadata.model,
      tokenCount: strategyResult.aiMetadata.tokenCount,
      processingMs: strategyResult.aiMetadata.processingMs,
    },
  });

  // Create pillars
  const pillarMap = new Map();
  for (const pillar of strategyResult.pillars) {
    const savedPillar = await context.entities.ThemePillar.create({
      data: {
        strategyId: strategy.id,
        name: pillar.name,
        rationale: pillar.rationale,
        focusKeywords: pillar.focusKeywords,
        orderIndex: pillar.orderIndex,
        color: pillar.color,
      },
    });
    pillarMap.set(pillar.orderIndex, savedPillar.id);
  }

  // Create posts
  for (const post of strategyResult.posts) {
    const pillarId = pillarMap.get(post.pillarIndex);

    // Find matching keyword in research
    const keyword = await context.entities.Keyword.findFirst({
      where: {
        keyword: post.primaryKeyword,
        cluster: { researchId },
      },
    });

    await context.entities.CalendarPost.create({
      data: {
        strategyId: strategy.id,
        pillarId,
        keywordId: keyword?.id || null,
        publishDate: post.publishDate,
        title: post.title,
        primaryKeyword: post.primaryKeyword,
        secondaryKeywords: post.secondaryKeywords,
        searchIntent: post.searchIntent,
        rationale: post.rationale,
        internalLinkSuggestions: post.internalLinks || [],
        externalLinkSuggestions: post.externalLinks || [],
        confidenceLevel: 'HIGH',
        status: 'PROPOSED',
        aiModel: strategyResult.aiMetadata.model,
      },
    });
  }

  // Fetch complete strategy with relations
  return context.entities.ContentStrategy.findUnique({
    where: { id: strategy.id },
    include: {
      themePillars: true,
      calendarPosts: true,
    },
  });
}