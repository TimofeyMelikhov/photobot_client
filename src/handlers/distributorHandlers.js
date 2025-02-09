import { Markup } from "telegraf";
import config from "config";
import { Axios } from "../api/index.js";
import { MESSAGES } from "../constants/messages.js";

export const showReferralsForDistributors = async (ctx) => {
  const distributor = ctx.session.userData;

  try {
    const referralsDistributor = await Axios.get(
      `distributors/${distributor.id}/clients`
    )
      .then((res) => res.data)
      .catch(async (error) => {
        if (error?.response?.status === 404) {
          await ctx.reply("У вас пока нет рефералов.", {
            disable_notification: true,
          });
          return [];
        }
        return [];
      });

    if (!referralsDistributor || referralsDistributor.length === 0) {
      return;
    }

    let message = "Пользователи, которых вы пригласили:\n";
    referralsDistributor?.forEach((referral, index) => {
      let referralStatus =
        referral.isConfirmed === 1
          ? "Запись подтверждена"
          : referral.isConfirmed === 0
          ? "Запись отменена"
          : "Не просмотрено";
      message += `${index + 1}. @${
        referral.tg_username || "без имени"
      } - ${referralStatus}.\n`;
    });

    await ctx.reply(message, { disable_notification: true });
  } catch (error) {
    console.log(error.message);
    if (error.code === 403) {
      console.log(`Пользователь ${ctx.from.username} заблокировал бота`);
    }
  }
};

export const showPhotographers = async (ctx, page) => {
  try {
    const PAGE_SIZE = 5;
    const photographers = await Axios.get("/photographers")
      .then((res) => res.data)
      .catch(async (error) => {
        if (error.response?.status === 404) {
          await ctx.reply("К сожалению, в базе нет фотографов.", {
            disable_notification: true,
          });
          return [];
        }
        console.error("Ошибка при запросе фотографов:", error.message);
        return [];
      });

    if (!photographers || photographers.length === 0) {
      return;
    }

    const startIndex = (page - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    const currentPhotographers = photographers.slice(startIndex, endIndex);

    if (currentPhotographers.length === 0) {
      await ctx.reply("Больше фотографов нет.", { disable_notification: true });
      return;
    }

    const message =
      "Вот список доступных фотографов. Выберите одного из них:\n\n" +
      currentPhotographers
        .map(
          (photographer, index) =>
            `${startIndex + index + 1}. ${photographer.name} (Город: ${
              photographer.city
            })`
        )
        .join("\n");

    const buttons = currentPhotographers.map((photographer) => [
      Markup.button.callback(
        `Профиль: ${photographer.name}`,
        `profile_${photographer.id}`
      ),
    ]);

    if (startIndex + PAGE_SIZE < photographers.length) {
      buttons.push([Markup.button.callback("➡️ Далее", `page_${page + 1}`)]);
    }
    if (page > 1) {
      buttons.push([Markup.button.callback("⬅️ Назад", `page_${page - 1}`)]);
    }
    buttons.push([Markup.button.callback("Скрыть", "show_menu")]);

    if (ctx.callbackQuery && ctx.callbackQuery.data !== "back_to_list") {
      await ctx.editMessageText(message, Markup.inlineKeyboard(buttons));
    } else {
      await ctx.reply(message, {
        disable_notification: true,
        reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
      });
    }
    return photographers;
  } catch (error) {
    console.error("Ошибка в showPhotographers:", error.message);
    await ctx.reply("Произошла ошибка. Попробуйте позже.", {
      disable_notification: true,
    });
  }
};

export const showPhotographerProfile = async (
  ctx,
  photographerId,
  isDistributor = false
) => {
  try {
    const photographer = await Axios.get(
      `photographers/id/${photographerId}`
    ).then((res) => res.data);

    if (!photographer) {
      await ctx.answerCbQuery(MESSAGES.notFoundPhotograph);
      return;
    }

    let caption = `🔹 *${photographer.name}*\n📍 Город: ${photographer.city}\n`;

    if (photographer.tg_channel) {
      caption += `📢 [Telegram-канал](${photographer.tg_channel})\n`;
    }
    if (photographer.portfolio_url) {
      caption += `🌐 [Сайт-портфолио](${photographer.portfolio_url})\n`;
    }
    if (photographer.other_resource) {
      caption += `🔗 [Другой ресурс](${photographer.other_resource})\n`;
    }

    const inlineKeyboard = isDistributor
      ? Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "Получить ссылку",
              `get_link_${photographerId}`
            ),
          ],
          [Markup.button.callback("Назад к списку", "back_to_list")],
        ])
      : null;

    if (photographer.profile_photo) {
      await ctx.telegram.sendPhoto(ctx.chat.id, photographer.profile_photo, {
        caption,
        parse_mode: "Markdown",
        disable_notification: true,
        reply_markup: inlineKeyboard ? inlineKeyboard.reply_markup : undefined,
      });
    } else {
      await ctx.reply(caption, {
        parse_mode: "Markdown",
        disable_notification: true,
        reply_markup: inlineKeyboard ? inlineKeyboard.reply_markup : undefined,
      });
    }
  } catch (error) {
    if (error.code === 403) {
      console.log(`Пользователь ${ctx.from.username} заблокировал бота`);
    } else {
      console.log("Ошибка при показе профиля фотографа:", error.message);
    }
  }
};

export const createReferalLink = async (ctx, photographerId) => {
  const referalLink = config.get("REFERAL_LINK");
  try {
    const distributor = ctx.session.userData;
    const referralLinkExists = await Axios.get(
      `/distributors/link/${distributor.id}/${photographerId}`
    )
      .then((res) => res.data)
      .catch(() => null);

    ctx.scene.leave();

    if (!referralLinkExists) {
      const link = `${referalLink}?start=${photographerId}_${distributor.id}`;
      await Axios.post(`/distributors/link`, {
        distributor_id: distributor.id,
        photographer_id: photographerId,
        link,
      });
      await ctx.reply(
        `Расскажите другим о фотографе, поделитесь ссылкой и получите вознаграждение!\n${link}`,
        {
          disable_notification: true,
        }
      );
      if (ctx.session.previousScene) {
        const previousScene = ctx.session.previousScene;
        delete ctx.session.previousScene;
        ctx.scene.enter(previousScene);
      }
    } else {
      await ctx.reply(
        `Расскажите другим о фотографе, поделитесь ссылкой и получите вознаграждение!\n${referralLinkExists.link}`,
        { disable_notification: true }
      );
      if (ctx.session.previousScene) {
        const previousScene = ctx.session.previousScene;
        delete ctx.session.previousScene;
        ctx.scene.enter(previousScene);
      }
    }
  } catch (error) {
    if (error.code === 403) {
      console.error(`Пользователь ${ctx.from.username} заблокировал бота`);
    }
    await ctx.reply(error.message, { disable_notification: true });
  }
};
