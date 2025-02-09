import { Markup } from "telegraf";
import { mainMenuKeyboard } from "./keyboards.js";
import { MESSAGES } from "../constants/messages.js";
import { Axios, getPhotographer } from "../api/index.js";

export const handleStartCommand = async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const args = ctx.message.text.split(" ");

    if (args.length >= 2) {
      const [photographerId, distributorId] = args[1].split("_").map(Number);

      if (!photographerId || isNaN(photographerId)) {
        return ctx.reply(
          "Ошибка: недействительная ссылка. Попробуйте ещё раз.",
          {
            disable_notification: true,
          }
        );
      }

      const photographer = await getPhotographer("id", photographerId);

      if (!photographer) {
        return ctx.reply(
          "Фотограф из вашей ссылки не найден. Попробуйте ещё раз.",
          {
            disable_notification: true,
          }
        );
      }

      const existingClient = await Axios.get(
        `clients/${photographerId}/${telegramId}`
      )
        .then((res) => res.data)
        .catch((error) => {
          if (error.response?.status === 404) {
            return null;
          }
          console.error("Ошибка при получении клиента:", error.message);
          throw error;
        });

      if (!existingClient) {
        const { tg_user_id } = photographer;

        return ctx.scene.enter("clientRegistration", {
          photographerId,
          distributorId,
          photografer_tg_id: tg_user_id,
        });
      }

      return ctx.reply(
        `Вы уже зарегистрированы как клиент фотографа ${photographer.name}.`,
        { disable_notification: true }
      );
    }

    if (ctx.session.userData) {
      const { role } = ctx.session.userData;
      if (role === "photographer") {
        ctx.scene.enter("photographerScene");
        return;
      }
      if (role === "distributor") {
        ctx.scene.enter("distributorScene");
        return;
      }
    }

    // Если нет никаких данных в сессии, просим выбрать роль
    return ctx.reply(MESSAGES.hello, {
      disable_notification: true,
      reply_markup: mainMenuKeyboard.reply_markup,
    });
  } catch (error) {
    if (error.code === 403) {
      console.log(`Пользователь ${ctx.from.username} заблокировал бота`);
    }
    console.error(error.message);
    await ctx.reply(MESSAGES.error, { disable_notification: true });
  }
};

// Обработчик удаления профиля
export const handleDeleteProfile = async (ctx) => {
  try {
    const user = ctx.session.userData;
    if (!user) {
      return ctx.reply("Вы не зарегистрированы.", {
        disable_notification: true,
      });
    }

    await ctx.reply(MESSAGES.deleteProfile, {
      disable_notification: true,
      reply_markup: Markup.inlineKeyboard([
        Markup.button.callback("✅ Да, удалить", `confirm_delete_${user.id}`),
        Markup.button.callback("❌ Отмена", "cancel_delete"),
      ]).reply_markup,
    });
  } catch (error) {
    console.error("Ошибка удаления профиля:", error.message);
    await ctx.reply(MESSAGES.deleteProfileError, {
      disable_notification: true,
    });
  }
};

// Подтверждение удаления профиля
export const confirmDeleteProfile = async (ctx, userId) => {
  const tableName =
    ctx.session.userData.role === "photographer"
      ? "photographers"
      : "distributors";

  try {
    const user = await Axios.delete(`${tableName}/delete`, {
      data: {
        id: userId,
      },
    }).then((res) => res.data);

    if (!user) {
      return ctx.reply(`Пользователь уже удалён или не существует.`, {
        disable_notification: true,
      });
    }

    await ctx.reply(MESSAGES.profileDeleted, {
      disable_notification: true,
      reply_markup: mainMenuKeyboard.reply_markup,
    });
    ctx.scene.leave();
    ctx.session.userData = null;
  } catch (error) {
    console.error("Ошибка подтверждения удаления профиля:", error.message);
    await ctx.reply(MESSAGES.deleteProfileError, {
      disable_notification: true,
    });
  }
};

// Обработка обратной связи
export const feedbackHandler = async (ctx) => {
  return await ctx.reply(
    "По всем вопросам и предложениям можете писать [сюда](https://t.me/Doitcolit)",
    {
      disable_notification: true,
      parse_mode: "markdown",
    }
  );
};
