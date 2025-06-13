import { aiRouter } from "~/server/api/routers/ai";
import { documentRouter } from "~/server/api/routers/document";
import { compatibilityRouter } from "~/server/api/routers/compatibility";
import { userSkillsRouter } from "~/server/api/routers/user-skills";
import { skillsRouter } from "~/server/api/routers/skills";
import { subscriptionRouter } from "~/server/api/routers/subscription";
import { accountRouter } from "~/server/api/routers/account";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  ai: aiRouter,
  document: documentRouter,
  compatibility: compatibilityRouter,
  userSkills: userSkillsRouter,
  skills: skillsRouter,
  subscription: subscriptionRouter,
  account: accountRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
