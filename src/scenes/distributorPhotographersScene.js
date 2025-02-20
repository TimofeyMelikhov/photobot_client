import { Scenes } from "telegraf";
import {
  showPhotographers,
  showPhotographerProfile,
  createReferalLink,
} from "../handlers/distributorHandlers.js";
import { loaderMiddleware } from "../middleware/preloader.js";
import {
  deletedLastMessage,
  distributorMenuKeyboard,
} from "../handlers/keyboards.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

export const distributorPhotographersScene = new Scenes.BaseScene(
  "distributorPhotographersScene"
);

distributorPhotographersScene.use(sessionMiddleware);

distributorPhotographersScene.enter(async (ctx) => {
  const loadingMessage = await ctx.reply("⌛ Пожалуйста, подождите...", {
    reply_markup: { remove_keyboard: true },
    disable_notification: true,
  });

  // Отправляем список фотографов
  const photographers = await showPhotographers(ctx, 1);

  if (!photographers) {
    if (ctx.session.previousScene) {
      const previousScene = ctx.session.previousScene;
      delete ctx.session.previousScene;
      return ctx.scene.enter(previousScene);
    }
    return ctx.scene.leave();
  }

  // Удаляем сообщение о загрузке
  await ctx.deleteMessage(loadingMessage.message_id).catch((error) => {
    console.error("Ошибка при удалении сообщения о загрузке:", error.message);
  });
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
      await ctx.reply("Вы вернулись в главное меню", {
        reply_markup: distributorMenuKeyboard.reply_markup,
        disable_notification: true,
      });
      ctx.scene.enter(previousScene); // Переходим в предыдущую сцену
    }
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
