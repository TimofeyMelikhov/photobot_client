import { Scenes } from "telegraf";
import { loaderMiddleware } from "../../middleware/preloader.js";
import {
  showClients,
  showReferrals,
} from "../../handlers/photographerHandlers.js";
import { MESSAGES } from "../../constants/messages.js";
import { photographerMenuKeyboard } from "../../handlers/keyboards.js";
import { sessionMiddleware } from "../../middleware/sessionMiddleware.js";

const photographerScene = new Scenes.BaseScene("photographerScene");

photographerScene.use(sessionMiddleware);

photographerScene.enter(async (ctx) => {
  if (!ctx.session.userData || ctx.session.userData.role !== "photographer") {
    await ctx.reply("Вы не зарегистрированы как фотограф.");
    return ctx.scene.leave();
  }

  ctx.reply(MESSAGES.helloPhotographer, {
    disable_notification: true,
    reply_markup: photographerMenuKeyboard.reply_markup,
  });
});

photographerScene.hears("👥 Мои клиенты", loaderMiddleware, showClients);

photographerScene.hears("📊 Вас рекомендуют", loaderMiddleware, showReferrals);

export { photographerScene };
