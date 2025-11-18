import { EditorialError, ErrorCodes } from '../types.js';

// ============================================
// SOSTITUZIONE STRATEGIA ATTIVA
// ============================================

export async function replaceActiveStrategyLogic(
  context,
  sessionId,
  newStrategyId
) {
  const currentActive = await context.entities.ContentStrategy.findFirst({
    where: {
      sessionId,
      isActive: true,
    },
    include: {
      calendarPosts: true,
    },
  });

  if (!currentActive) {
    throw new EditorialError(
      'No active strategy found for this session',
      ErrorCodes.NO_ACTIVE_STRATEGY,
      404
    );
  }

  const newStrategy = await context.entities.ContentStrategy.findUnique({
    where: { id: newStrategyId },
    include: {
      calendarPosts: true,
    },
  });

  if (!newStrategy) {
    throw new EditorialError(
      'New strategy not found',
      ErrorCodes.STRATEGY_NOT_FOUND,
      404
    );
  }

  if (newStrategy.sessionId !== sessionId) {
    throw new EditorialError(
      'New strategy does not belong to this session',
      ErrorCodes.INVALID_INPUT,
      400
    );
  }

  const newPostTitles = new Set(newStrategy.calendarPosts.map((p) => p.title));
  const postsToReject = currentActive.calendarPosts.filter(
    (post) =>
      post.status === 'APPROVED' && !newPostTitles.has(post.title)
  );

  await context.entities.$transaction(async (prisma) => {
    await prisma.contentStrategy.update({
      where: { id: currentActive.id },
      data: {
        isActive: false,
        replacedBy: newStrategyId,
        replacedAt: new Date(),
      },
    });

    await prisma.contentStrategy.update({
      where: { id: newStrategyId },
      data: {
        isActive: true,
        activatedAt: new Date(),
      },
    });

    if (postsToReject.length > 0) {
      await prisma.calendarPost.updateMany({
        where: {
          id: {
            in: postsToReject.map((p) => p.id),
          },
        },
        data: {
          status: 'REJECTED',
          rejectionReason: `Removed by strategy v${newStrategy.versionNumber} replacement`,
          updatedAt: new Date(),
        },
      });
    }
  });

  return {
    replacedStrategyId: currentActive.id,
    newActiveStrategyId: newStrategyId,
    rejectedPostsCount: postsToReject.length,
  };
}

// ============================================
// EXTEND CALENDAR (con firstPublishDate)
// ============================================

export function calculateNextAvailableDate(existingPosts, additionalDays = 30) {
  if (existingPosts.length === 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      startDate: today,
      endDate: new Date(today.getTime() + additionalDays * 24 * 60 * 60 * 1000),
    };
  }

  const lastDate = existingPosts.reduce((max, post) => {
    const postDate = new Date(post.publishDate);
    postDate.setHours(0, 0, 0, 0);
    return postDate > max ? postDate : max;
  }, new Date(0));

  const nextDate = new Date(lastDate);
  nextDate.setDate(nextDate.getDate() + 1);
  nextDate.setHours(0, 0, 0, 0);

  const endDate = new Date(nextDate);
  endDate.setDate(endDate.getDate() + additionalDays);

  return {
    startDate: nextDate,
    endDate,
  };
}

// ============================================
// DISTRIBUTE POST DATES (usando firstPublishDate)
// ============================================

export function distributePostDates(startDate, postCount, periodDays = 30) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const dates = [];
  const intervalDays = Math.floor(periodDays / postCount);
  
  for (let i = 0; i < postCount; i++) {
    const postDate = new Date(start);
    postDate.setDate(postDate.getDate() + (i * intervalDays));
    postDate.setHours(0, 0, 0, 0);
    dates.push(postDate);
  }

  return dates;
}

// ============================================
// KEYWORD CANNIBALIZATION CHECK
// ============================================

export function detectKeywordCannibalization(posts) {
  const keywordMap = new Map();
  const duplicates = [];

  posts.forEach((post, index) => {
    const pk = post.primaryKeyword.toLowerCase().trim();
    
    if (keywordMap.has(pk)) {
      duplicates.push({
        keyword: pk,
        posts: [keywordMap.get(pk), index],
        titles: [posts[keywordMap.get(pk)].title, post.title],
      });
    } else {
      keywordMap.set(pk, index);
    }
  });

  return duplicates;
}