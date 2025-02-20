import { Scenes } from "telegraf";
import { loaderMiddleware } from "../../middleware/preloader.js";
import { showReferralsForDistributors } from "../../handlers/distributorHandlers.js";
import { MESSAGES } from "../../constants/messages.js";
import { distributorMenuKeyboard } from "../../handlers/keyboards.js";
import { sessionMiddleware } from "../../middleware/sessionMiddleware.js";
import { Axios } from "../../api/index.js";
import { sceneHistoryMiddleware } from "../../middleware/sceneHistoryMiddleware.js";

const distributorScene = new Scenes.BaseScene("distributorScene");

distributorScene.use(sessionMiddleware);

distributorScene.use(sceneHistoryMiddleware);

distributorScene.enter(async (ctx) => {
  const telegramId = ctx.from.id;
  const username = ctx.from.username;
  if (ctx.session.isReturning) {
    delete ctx.session.isReturning;
    return;
  }

  if (!ctx.session.userData) {
    try {
      await Axios.post("/distributors", {
        telegramId,
        username,
      });

      return await ctx.reply(
        "Отлично, здесь вы можете записаться на фотосессию или рекомендовать фотографа знакомым",
        {
          disable_notification: true,
          reply_markup: distributorMenuKeyboard.reply_markup,
        }
      );
    } catch (registrationError) {
      console.error(
        "Ошибка регистрации дистрибьютора:",
        registrationError.message
      );
      await ctx.reply("Произошла ошибка при регистрации. Попробуйте позже.", {
        disable_notification: true,
      });
    }
  }

  if (ctx.session.userData.role !== "distributor") {
    await ctx.reply("Вы не зарегистрированы как дистрибьютор.");
    return ctx.scene.leave();
  }

  return await ctx.reply(MESSAGES.helloDistributor, {
    disable_notification: true,
    reply_markup: distributorMenuKeyboard.reply_markup,
  });
});

distributorScene.hears("📸 Список фотографов", async (ctx) => {
  ctx.session.isReturning = true;
  await ctx.scene.enter("distributorPhotographersScene");
});

distributorScene.hears(
  "👥 Приглашённые рефералы",
  loaderMiddleware,
  showReferralsForDistributors
);

export { distributorScene };
