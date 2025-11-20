import { HttpError } from 'wasp/server';
import { validateAllPosts, validateKeywordUniqueness } from './ai/validator.js';
import { 
  replaceActiveStrategyLogic, 
  calculateNextAvailableDate, 
  distributePostDates 
} from './services/strategy.js';

export const getEditorialProjects = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const projects = await context.entities.EditorialProject.findMany({
    where: {
      userId: context.user.id,
      archivedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return {
    projects,
    total: projects.length,
  };
};

export const getProjectById = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const project = await context.entities.EditorialProject.findUnique({
    where: { id: args.id },
    include: {
      strategySessions: {
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      keywordResearches: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          clusters: {
            orderBy: { priorityScore: 'desc' },
            include: {
              keywords: {
                orderBy: { keyword: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  if (!project) {
    throw new HttpError(404, 'Project not found');
  }

  if (project.userId !== context.user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  const activeSession = project.strategySessions[0];
  let activeStrategy;

  if (activeSession) {
    const strategy = await context.entities.ContentStrategy.findFirst({
      where: {
        sessionId: activeSession.id,
        isActive: true,
      },
      include: {
        themePillars: {
          orderBy: { orderIndex: 'asc' },
        },
        calendarPosts: {
          orderBy: { publishDate: 'asc' },
        },
      },
    });

    if (strategy) {
      activeStrategy = strategy;
    }
  }

  return {
    project,
    activeSession,
    activeStrategy,
  };
};
export const getStrategyConversation = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const session = await context.entities.StrategySession.findUnique({
    where: { id: args.sessionId },
    include: {
      project: true,
      messages: {
        orderBy: { timestamp: 'asc' },
      },
      contentStrategies: {
        orderBy: { versionNumber: 'asc' },
        include: {
          themePillars: true,
          calendarPosts: true,
        },
      },
    },
  });

  if (!session) {
    throw new HttpError(404, 'Session not found');
  }

  if (session.project.userId !== context.user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  const strategies = session.contentStrategies.map((s) => ({
    ...s,
    pillars: s.themePillars,
    postCount: s.calendarPosts.length,
  }));

  const currentStrategy = session.contentStrategies.find((s) => s.isActive);
  let currentStrategyDetail;

  if (currentStrategy) {
    const postsWithPillar = await context.entities.CalendarPost.findMany({
      where: { strategyId: currentStrategy.id },
      include: { pillar: true },
      orderBy: { publishDate: 'asc' },
    });

    currentStrategyDetail = {
      ...currentStrategy,
      pillars: currentStrategy.themePillars,
      posts: postsWithPillar,
    };
  }

  return {
    project: session.project,
    session,
    messages: session.messages,
    strategies,
    currentStrategy: currentStrategyDetail,
  };
};

export const getCalendarView = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const strategy = await context.entities.ContentStrategy.findUnique({
    where: { id: args.strategyId },
    include: {
      session: {
        include: { project: true },
      },
      themePillars: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!strategy) {
    throw new HttpError(404, 'Strategy not found');
  }

  if (strategy.session.project.userId !== context.user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  const where = { strategyId: args.strategyId };

  if (args.filters?.pillarId) {
    where.pillarId = args.filters.pillarId;
  }

  if (args.filters?.status) {
    where.status = args.filters.status;
  }

  if (args.filters?.dateRange) {
    where.publishDate = {
      gte: args.filters.dateRange.from,
      lte: args.filters.dateRange.to,
    };
  }

  const posts = await context.entities.CalendarPost.findMany({
    where,
    include: { pillar: true },
    orderBy: { publishDate: 'asc' },
  });

  const byPillar = strategy.themePillars.map((pillar) => ({
    pillarId: pillar.id,
    pillarName: pillar.name,
    count: posts.filter((p) => p.pillarId === pillar.id).length,
  }));

  const byStatus = posts.reduce((acc, post) => {
    acc[post.status] = (acc[post.status] || 0) + 1;
    return acc;
  }, {});

  return {
    strategy,
    pillars: strategy.themePillars,
    posts,
    stats: {
      totalPosts: posts.length,
      byPillar,
      byStatus,
    },
  };
};

// ============================================
// ACTIONS (AGGIORNATE con nuovi campi)
// ============================================

export const createEditorialProject = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  if (!args.name || args.name.trim().length === 0) {
    throw new HttpError(400, 'Project name is required');
  }

  if (!args.knowledgeBase || args.knowledgeBase.trim().length < 50) {
    throw new HttpError(400, 'Knowledge base must be at least 50 characters');
  }

  // Parse and validate firstPublishDate
  let firstPublishDate = new Date();
  if (args.firstPublishDate) {
    firstPublishDate = new Date(args.firstPublishDate);
    if (isNaN(firstPublishDate.getTime())) {
      throw new HttpError(400, 'Invalid first publish date');
    }
  }
  firstPublishDate.setHours(0, 0, 0, 0);

  const project = await context.entities.EditorialProject.create({
    data: {
      userId: context.user.id,
      name: args.name.trim(),
      description: args.description.trim(),
      language: args.language,
      target: args.target.trim(),
      objectives: args.objectives.trim(),
      blogUrl: args.blogUrl?.trim() || null,
      mainSiteUrl: args.mainSiteUrl?.trim() || null,
      competitorUrls: args.competitorUrls.filter((url) => url.trim().length > 0),
      keywordSeed: args.keywordSeed?.filter((kw) => kw.trim().length > 0) || [],
      firstPublishDate,
      avoidCannibalization: args.avoidCannibalization ?? true,
      knowledgeBase: args.knowledgeBase.trim(),
      status: 'DRAFT',
    },
  });

  return project;
};



export const sendStrategyMessage = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const session = await context.entities.StrategySession.findUnique({
    where: { id: args.sessionId },
    include: { 
      project: true,
      messages: {
        orderBy: { timestamp: 'asc' },
        take: 20,
      },
      contentStrategies: {
        where: { isActive: true },
        include: {
          themePillars: true,
          calendarPosts: true,
        },
      },
    },
  });

  if (!session) {
    throw new HttpError(404, 'Session not found');
  }

  if (session.project.userId !== context.user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  if (session.status === 'COMPLETED') {
    throw new HttpError(400, 'Session is completed');
  }

  await context.entities.StrategyMessage.create({
    data: {
      sessionId: session.id,
      role: 'USER',
      content: args.content,
      timestamp: new Date(),
    },
  });

  try {
    const currentStrategy = session.contentStrategies[0];
    
    if (!currentStrategy) {
      throw new HttpError(400, 'No active strategy found');
    }

    const researchResults = await context.entities.ResearchResult.findMany({
      where: {
        sessionId: session.id,
        expiresAt: { gte: new Date() },
      },
    });

    const aggregatedResearch = {
      keywordExpansion: researchResults.find(r => r.researchType === 'KEYWORD_EXPANSION')?.results,
      trends: researchResults.find(r => r.researchType === 'SEARCH_VOLUME')?.results,
      competitors: researchResults.find(r => r.researchType === 'COMPETITOR_ANALYSIS')?.results,
      trendingTopics: researchResults.find(r => r.researchType === 'TRENDING_TOPICS')?.results,
    };

    const conversationHistory = session.messages.map(m => ({
      role: m.role === 'USER' ? 'user' : 'assistant',
      content: m.content,
    }));

    const newVersion = currentStrategy.versionNumber + 1;
    
    const strategyOutput = await generateStrategy({
      projectContext: {
        name: session.project.name,
        description: session.project.description,
        language: session.project.language,
        target: session.project.target,
        objectives: session.project.objectives,
        blogUrl: session.project.blogUrl,
        mainSiteUrl: session.project.mainSiteUrl,
        firstPublishDate: session.project.firstPublishDate,
        avoidCannibalization: session.project.avoidCannibalization,
        knowledgeBase: session.project.knowledgeBase,
      },
      researchResults: aggregatedResearch,
      conversationHistory,
      previousStrategy: {
        globalRationale: currentStrategy.globalRationale,
        pillars: currentStrategy.themePillars.map(p => ({
          name: p.name,
          rationale: p.rationale,
          focusKeywords: p.focusKeywords,
        })),
        posts: currentStrategy.calendarPosts.map(p => ({
          title: p.title,
          primaryKeyword: p.primaryKeyword,
          publishDate: p.publishDate,
        })),
      },
      userRequest: args.content,
      versionNumber: newVersion,
    });

    // Check keyword uniqueness for new strategy
    const uniquenessCheck = validateKeywordUniqueness(strategyOutput.posts);
    if (!uniquenessCheck.isValid) {
      console.warn('[sendStrategyMessage] Keyword cannibalization detected:', uniquenessCheck.duplicates);
      
      const warningMsg = `Warning: ${uniquenessCheck.duplicates.length} duplicate keywords detected in the new strategy. Please review or request regeneration.`;
      
      await context.entities.StrategyMessage.create({
        data: {
          sessionId: session.id,
          role: 'ASSISTANT',
          content: warningMsg,
          timestamp: new Date(),
        },
      });

      return {
        aiResponse: warningMsg,
      };
    }

    const newStrategy = await context.entities.ContentStrategy.create({
      data: {
        sessionId: session.id,
        versionNumber: newVersion,
        globalRationale: strategyOutput.globalRationale,
        identifiedGaps: strategyOutput.identifiedGaps,
        coveragePeriodDays: 30,
        isActive: false,
        aiModel: strategyOutput.aiMetadata.model,
        tokenCount: strategyOutput.aiMetadata.tokenCount,
        processingMs: strategyOutput.aiMetadata.processingMs,
      },
    });

    const createdPillars = await Promise.all(
      strategyOutput.pillars.map((pillar) =>
        context.entities.ThemePillar.create({
          data: {
            strategyId: newStrategy.id,
            name: pillar.name,
            rationale: pillar.rationale,
            focusKeywords: pillar.focusKeywords,
            orderIndex: pillar.orderIndex,
            color: pillar.color,
          },
        })
      )
    );

    const validationResults = await validateAllPosts(
      strategyOutput.posts,
      session.project.knowledgeBase
    );

    await Promise.all(
      strategyOutput.posts.map(async (post, index) => {
        const validation = validationResults[index];
        const pillar = createdPillars[post.pillarIndex];

        const calendarPost = await context.entities.CalendarPost.create({
          data: {
            strategyId: newStrategy.id,
            pillarId: pillar.id,
            publishDate: post.publishDate,
            title: post.title,
            primaryKeyword: post.primaryKeyword,
            secondaryKeywords: post.secondaryKeywords,
            searchIntent: post.searchIntent,
            rationale: post.rationale,
            internalLinkSuggestions: post.internalLinks || [],
            externalLinkSuggestions: post.externalLinks || [],
            confidenceLevel: validation.confidenceLevel,
            warningFlags: validation.warnings,
            status: 'PROPOSED',
            aiModel: strategyOutput.aiMetadata.model,
          },
        });

        await context.entities.ValidationResult.create({
          data: {
            postId: calendarPost.id,
            isValid: validation.isValid,
            warnings: validation.warnings,
            confidenceLevel: validation.confidenceLevel,
            aiModel: validation.aiMetadata.model,
            tokenCount: validation.aiMetadata.tokenCount,
            processingMs: validation.aiMetadata.processingMs,
            kbSnapshot: validation.kbSnapshot,
          },
        });
      })
    );

    const aiResponse = `I've generated strategy v${newVersion} based on your request.\n\n${strategyOutput.changesSummary || strategyOutput.globalRationale}\n\nYou can preview this version or replace the active strategy with it.`;

    await context.entities.StrategyMessage.create({
      data: {
        sessionId: session.id,
        role: 'ASSISTANT',
        content: aiResponse,
        aiModel: strategyOutput.aiMetadata.model,
        tokenCount: strategyOutput.aiMetadata.tokenCount,
        processingMs: strategyOutput.aiMetadata.processingMs,
        timestamp: new Date(),
      },
    });

    return {
      newStrategyId: newStrategy.id,
      aiResponse,
    };
  } catch (error) {
    console.error('[sendStrategyMessage] Error:', error);

    const errorMsg = `Sorry, I encountered an error: ${error.message}`;
    
    await context.entities.StrategyMessage.create({
      data: {
        sessionId: session.id,
        role: 'SYSTEM',
        content: errorMsg,
        timestamp: new Date(),
      },
    });

    return {
      aiResponse: errorMsg,
    };
  }
};

export const updateCalendarPost = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const post = await context.entities.CalendarPost.findUnique({
    where: { id: args.postId },
    include: {
      strategy: {
        include: {
          session: {
            include: { project: true },
          },
        },
      },
    },
  });

  if (!post) {
    throw new HttpError(404, 'Post not found');
  }

  if (post.strategy.session.project.userId !== context.user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  await context.entities.CalendarPost.update({
    where: { id: args.postId },
    data: {
      ...args.updates,
      manuallyEdited: true,
      updatedAt: new Date(),
    },
  });

  return { success: true };
};

export const bulkUpdatePostDates = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  await Promise.all(
    args.updates.map((update) =>
      context.entities.CalendarPost.update({
        where: { id: update.postId },
        data: {
          publishDate: update.newDate,
          manuallyEdited: true,
          updatedAt: new Date(),
        },
      })
    )
  );

  return { success: true };
};

export const approveStrategy = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const strategy = await context.entities.ContentStrategy.findUnique({
    where: { id: args.strategyId },
    include: {
      session: {
        include: { project: true },
      },
    },
  });

  if (!strategy) {
    throw new HttpError(404, 'Strategy not found');
  }

  if (strategy.session.project.userId !== context.user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  await context.entities.StrategySession.update({
    where: { id: strategy.sessionId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  await context.entities.EditorialProject.update({
    where: { id: strategy.session.projectId },
    data: { status: 'ACTIVE' },
  });

  await context.entities.CalendarPost.updateMany({
    where: {
      strategyId: strategy.id,
      status: 'PROPOSED',
    },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  });

  return { success: true };
};

export const replaceActiveStrategy = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const session = await context.entities.StrategySession.findUnique({
    where: { id: args.sessionId },
    include: { project: true },
  });

  if (!session) {
    throw new HttpError(404, 'Session not found');
  }

  if (session.project.userId !== context.user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  const result = await replaceActiveStrategyLogic(
    context,
    args.sessionId,
    args.newStrategyId
  );

  return result;
};

export const extendCalendar = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const strategy = await context.entities.ContentStrategy.findUnique({
    where: { id: args.strategyId },
    include: {
      session: {
        include: { project: true },
      },
      calendarPosts: {
        orderBy: { publishDate: 'desc' },
      },
      themePillars: true,
    },
  });

  if (!strategy) {
    throw new HttpError(404, 'Strategy not found');
  }

  if (strategy.session.project.userId !== context.user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  const additionalDays = args.additionalDays || 30;
  const { startDate, endDate } = calculateNextAvailableDate(
    strategy.calendarPosts,
    additionalDays
  );

  const researchResults = await context.entities.ResearchResult.findMany({
    where: {
      sessionId: strategy.sessionId,
      expiresAt: { gte: new Date() },
    },
  });

  const aggregatedResearch = {
    keywordExpansion: researchResults.find(r => r.researchType === 'KEYWORD_EXPANSION')?.results,
    trends: researchResults.find(r => r.researchType === 'SEARCH_VOLUME')?.results,
    competitors: researchResults.find(r => r.researchType === 'COMPETITOR_ANALYSIS')?.results,
    trendingTopics: researchResults.find(r => r.researchType === 'TRENDING_TOPICS')?.results,
  };

  const postsToGenerate = Math.ceil(additionalDays / 7);
  const extendPrompt = `Continue the editorial calendar with ${postsToGenerate} additional posts, maintaining the same pillars and strategic direction. Start from ${startDate.toISOString().split('T')[0]}.`;

  const strategyOutput = await generateStrategy({
    projectContext: {
      name: strategy.session.project.name,
      description: strategy.session.project.description,
      language: strategy.session.project.language,
      target: strategy.session.project.target,
      objectives: strategy.session.project.objectives,
      blogUrl: strategy.session.project.blogUrl,
      mainSiteUrl: strategy.session.project.mainSiteUrl,
      firstPublishDate: strategy.session.project.firstPublishDate,
      avoidCannibalization: strategy.session.project.avoidCannibalization,
      knowledgeBase: strategy.session.project.knowledgeBase,
    },
    researchResults: aggregatedResearch,
    previousStrategy: {
      globalRationale: strategy.globalRationale,
      pillars: strategy.themePillars.map(p => ({
        name: p.name,
        rationale: p.rationale,
        focusKeywords: p.focusKeywords,
      })),
      posts: strategy.calendarPosts.map(p => ({
        title: p.title,
        primaryKeyword: p.primaryKeyword,
        publishDate: p.publishDate,
      })),
    },
    userRequest: extendPrompt,
    versionNumber: strategy.versionNumber,
  });

  const pillarMap = {};
  strategy.themePillars.forEach(p => {
    pillarMap[p.name] = p.id;
  });

  const validationResults = await validateAllPosts(
    strategyOutput.posts,
    strategy.session.project.knowledgeBase
  );

  let createdCount = 0;
  await Promise.all(
    strategyOutput.posts.map(async (post, index) => {
      const validation = validationResults[index];
      const pillarName = strategyOutput.pillars[post.pillarIndex]?.name;
      const pillarId = pillarMap[pillarName];

      if (!pillarId) {
        console.warn(`Pillar not found for post: ${post.title}`);
        return;
      }

      const calendarPost = await context.entities.CalendarPost.create({
        data: {
          strategyId: strategy.id,
          pillarId,
          publishDate: post.publishDate,
          title: post.title,
          primaryKeyword: post.primaryKeyword,
          secondaryKeywords: post.secondaryKeywords,
          searchIntent: post.searchIntent,
          rationale: post.rationale,
          internalLinkSuggestions: post.internalLinks || [],
          externalLinkSuggestions: post.externalLinks || [],
          confidenceLevel: validation.confidenceLevel,
          warningFlags: validation.warnings,
          status: 'PROPOSED',
          aiModel: strategyOutput.aiMetadata.model,
        },
      });

      await context.entities.ValidationResult.create({
        data: {
          postId: calendarPost.id,
          isValid: validation.isValid,
          warnings: validation.warnings,
          confidenceLevel: validation.confidenceLevel,
          aiModel: validation.aiMetadata.model,
          tokenCount: validation.aiMetadata.tokenCount,
          processingMs: validation.aiMetadata.processingMs,
          kbSnapshot: validation.kbSnapshot,
        },
      });

      createdCount++;
    })
  );

  return { newPostsCount: createdCount };
};

export const updateProjectKnowledgeBase = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const project = await context.entities.EditorialProject.findUnique({
    where: { id: args.projectId },
  });

  if (!project) {
    throw new HttpError(404, 'Project not found');
  }

  if (project.userId !== context.user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  await context.entities.EditorialProject.update({
    where: { id: args.projectId },
    data: {
      knowledgeBase: args.knowledgeBase.trim(),
      updatedAt: new Date(),
    },
  });

  return { success: true };
};

export const updateProjectMetadata = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const project = await context.entities.EditorialProject.findUnique({
    where: { id: args.projectId },
  });

  if (!project) {
    throw new HttpError(404, 'Project not found');
  }

  if (project.userId !== context.user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  const updateData = {};
  
  if (args.name !== undefined) updateData.name = args.name.trim();
  if (args.description !== undefined) updateData.description = args.description.trim();
  if (args.language !== undefined) updateData.language = args.language;
  if (args.target !== undefined) updateData.target = args.target.trim();
  if (args.objectives !== undefined) updateData.objectives = args.objectives.trim();
  if (args.blogUrl !== undefined) updateData.blogUrl = args.blogUrl?.trim() || null;
  if (args.mainSiteUrl !== undefined) updateData.mainSiteUrl = args.mainSiteUrl?.trim() || null;
  if (args.competitorUrls !== undefined) updateData.competitorUrls = args.competitorUrls.filter(u => u.trim());
  if (args.keywordSeed !== undefined) updateData.keywordSeed = args.keywordSeed.filter(k => k.trim());
  if (args.avoidCannibalization !== undefined) updateData.avoidCannibalization = args.avoidCannibalization;
  
  if (args.firstPublishDate !== undefined) {
    const date = new Date(args.firstPublishDate);
    date.setHours(0, 0, 0, 0);
    updateData.firstPublishDate = date;
  }

  updateData.updatedAt = new Date();

  await context.entities.EditorialProject.update({
    where: { id: args.projectId },
    data: updateData,
  });

  return { success: true, shouldRegenerateStrategy: true };
};

export const archiveProject = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const project = await context.entities.EditorialProject.findUnique({
    where: { id: args.projectId },
  });

  if (!project) {
    throw new HttpError(404, 'Project not found');
  }

  if (project.userId !== context.user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  await context.entities.EditorialProject.update({
    where: { id: args.projectId },
    data: {
      status: 'ARCHIVED',
      archivedAt: new Date(),
    },
  });

  return { success: true };
};