import { getPhotographer, getDistributor } from "../api/index.js";

export const sessionMiddleware = async (ctx, next) => {
  if (!ctx.session) {
    ctx.session = {};
  }

  if (!ctx.session.userData) {
    const telegramId = ctx.from.id;

    // const isPhotographer = await getPhotographer("tg_user_id", telegramId);

    // if (isPhotographer) {
    //   ctx.session.userData = {
    //     role: "photographer",
    //     ...isPhotographer,
    //   };
    // } else {
    // }
    const isDistributor = await getDistributor(telegramId);
    if (isDistributor) {
      ctx.session.userData = {
        role: "distributor",
        ...isDistributor,
      };
    }
  }

  await next();
};
