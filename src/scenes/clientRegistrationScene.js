import { Scenes, Markup } from "telegraf";
import { Axios } from "../api/index.js";
import { mainMenuKeyboard } from "../handlers/keyboards.js";
import { validateContactMethod } from "../utils/utils.js";
import { notifyPhotographer } from "../handlers/photographerHandlers.js";
import { showPhotographerProfile } from "../handlers/distributorHandlers.js";

export const clientRegistrationScene = new Scenes.BaseScene(
  "clientRegistration"
);

clientRegistrationScene.enter(async (ctx) => {
  await ctx.reply(
    `Добро пожаловать! Выберите, где Вам удобнее договориться о фотосессии?`,
    {
      disable_notification: true,
      reply_markup: Markup.inlineKeyboard([
        Markup.button.callback(
          "Телеграмм аккаунт",
          "communicationMethod_telegram"
        ),
        Markup.button.callback(
          "Instagram|WhatsApp",
          "communicationMethod_another"
        ),
      ]).reply_markup,
    }
  );
});

clientRegistrationScene.action(/communicationMethod_(.+)/, async (ctx) => {
  const communicationMethod = ctx.match[1];

  if (communicationMethod === "telegram") {
    const userLink = `https://t.me/${ctx.from.username}`;
    ctx.scene.state.communicationMethod = userLink;

    await finalizeClientRegistration(ctx);
    await ctx.deleteMessage();
  } else {
    return await ctx.editMessageText(
      `Пожалуйста, напишите ваш предпочитаемый способ связи в ответном сообщении.`
    );
  }
  await ctx.answerCbQuery();
});

clientRegistrationScene.on("text", async (ctx) => {
  ctx.scene.state.communicationMethod = ctx.message.text;
  const isValidContactMethod = validateContactMethod(
    ctx.scene.state.communicationMethod
  );

  if (!isValidContactMethod) {
    return await ctx.reply(
      "Вы указали некорректный способ связи. Пожалуйста, укажите корректный (например, email или номер телефона).",
      { disable_notification: true }
    );
  }

  await finalizeClientRegistration(ctx);
});

async function finalizeClientRegistration(ctx) {
  const {
    photographerId,
    distributorId,
    photografer_tg_id,
    communicationMethod,
  } = ctx.scene.state;

  const tg_user_id = ctx.from.id;
  const username = ctx.from.username;

  const payload = {
    tg_user_id,
    username,
    photographerId,
    distributorId,
    communicationMethod,
  };

  try {
    const { status, data } = await Axios.post("clients", payload);

    if (distributorId) {
      await Axios.post("photographers/referral", {
        photographerId,
        distributorId,
      });
    }

    if (status === 201) {
      await ctx.reply(
        "Скоро фотограф с вами свяжется, а пока можете ознакомиться с его работами",
        {
          disable_notification: true,
          reply_markup: mainMenuKeyboard.reply_markup,
        }
      );
      await showPhotographerProfile(ctx, photographerId, false);
      await notifyPhotographer(ctx, photografer_tg_id, data.client);
    }

    ctx.scene.leave();
  } catch (error) {
    console.error("Ошибка при регистрации клиента:", error.message);
    await ctx.reply("Произошла ошибка при регистрации. Попробуйте ещё раз.", {
      disable_notification: true,
    });
    ctx.scene.leave();
  }
}
