import { Scenes } from "telegraf";
import {
  showPhotographers,
  showPhotographerProfile,
  createReferalLink,
} from "../handlers/distributorHandlers.js";
import { loaderMiddleware } from "../middleware/preloader.js";
import { deletedLastMessage } from "../handlers/keyboards.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

export const distributorPhotographersScene = new Scenes.BaseScene(
  "distributorPhotographersScene"
);

distributorPhotographersScene.use(sessionMiddleware);

distributorPhotographersScene.enter(async (ctx) => {
  const photografers = await showPhotographers(ctx, 1);
  if (!photografers) {
    if (ctx.session.previousScene) {
      const previousScene = ctx.session.previousScene;
      delete ctx.session.previousScene;
      ctx.scene.enter(previousScene);
    }
    await ctx.scene.leave();
  }
});

distributorPhotographersScene.action(
  /^profile_(\d+)/,
  loaderMiddleware,
  async (ctx) => {
    const photographerId = ctx.match[1];
    await showPhotographerProfile(ctx, photographerId, true);
    await deletedLastMessage(ctx);
  }
);

distributorPhotographersScene.action(/page_(\d+)/, async (ctx) => {
  const page = parseInt(ctx.match[1], 10) || 1;
  await showPhotographers(ctx, page);
});

distributorPhotographersScene.action(/get_link_(\d+)/, async (ctx) => {
  const photographerId = ctx.match[1];
  await createReferalLink(ctx, photographerId);
  await deletedLastMessage(ctx);
});

distributorPhotographersScene.action("show_menu", async (ctx) => {
  try {
    // Проверяем, существует ли сообщение, которое нужно удалить
    if (ctx.callbackQuery?.message?.message_id) {
      await ctx.deleteMessage().catch((error) => {
        console.error("Ошибка при удалении сообщения:", error.message);
      });
    }

    if (ctx.session.previousScene) {
      const previousScene = ctx.session.previousScene;
      delete ctx.session.previousScene; // Очищаем сохраненную сцену
      ctx.scene.enter(previousScene); // Переходим в предыдущую сцену
    }
    // Выходим из текущей сцены и возвращаемся в предыдущую
    await ctx.scene.leave();
  } catch (error) {
    console.error("Ошибка в show_menu:", error.message);
    await ctx.reply("Произошла ошибка. Попробуйте позже.", {
      disable_notification: true,
    });
  }
});

distributorPhotographersScene.action("back_to_list", async (ctx) => {
  await showPhotographers(ctx, 1);
  await deletedLastMessage(ctx);
});
