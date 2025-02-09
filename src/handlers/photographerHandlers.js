import { Axios } from "../api/index.js";

export const notifyPhotographer = async (ctx, photographerId, client) => {
  const messageToPhotographer = `
У вас новый клиент!\n
👤 Имя пользователя: @${client.tg_username}\n
🔗 Способ связи: ${client.communicationMethod} `;
  try {
    await ctx.telegram.sendMessage(photographerId, messageToPhotographer, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ Подтвердить запись",
              callback_data: `
confirmClient_${client.id}`,
            },
            {
              text: "❌ Отменить запись",
              callback_data: `
cancelClient_${client.id}`,
            },
          ],
        ],
      },
    });
  } catch (error) {
    if (error.code === 403) {
      console.error(`
Пользователь ${ctx.from.username} заблокировал бота`);
    }
    console.error(
      `
Не удалось отправить сообщение фотографу с ID ${photographerId}:`,
      error.message
    );
  }
};

// Показать клиентов фотографа
export const showClients = async (ctx) => {
  const photographer = ctx.session.userData;

  try {
    const clients = await Axios.get(`photographers/${photographer.id}/clients`)
      .then((res) => res.data)
      .catch((err) => {
        console.log(err.message);
        return [];
      });

    if (!clients || clients.length === 0) {
      return ctx.reply(
        "Расскажите о вознаграждении в соц. сетях и список начнет заполняться!",
        { disable_notification: true }
      );
    }

    let message = "Ваши клиенты:\n";
    clients.forEach((client, index) => {
      let clientsStatus =
        client.isConfirmed === 1
          ? "Запись подтверждена"
          : client.isConfirmed === 0
          ? "Запись отменена"
          : "Не просмотрено";
      message += `${index + 1}. @${
        client.tg_username || "без имени"
      } - ${clientsStatus}, способ связи: ${client.communicationMethod}\n`;
    });

    await ctx.reply(message, { disable_notification: true });
  } catch (error) {
    if (error.code === 403) {
      console.log(`Пользователь ${ctx.from.username} заблокировал бота`);
    } else {
      console.error(error.message);
    }
  }
};

// Показать, кто рекомендует фотографа
export const showReferrals = async (ctx) => {
  const photographer = ctx.session.userData;
  try {
    const referrals = await Axios.get(
      `photographers/${photographer.id}/referrals`
    )
      .then((res) => res.data)
      .catch(() => []);

    if (!referrals || referrals.length === 0) {
      return ctx.reply(
        "Не забывай делиться с человеком, который помог найти клиента!",
        {
          disable_notification: true,
        }
      );
    }

    let message =
      "Найдите здесь контакт клиента, который вас рекомендовал и напишите ему о вознаграждении\n";
    referrals.forEach((referral) => {
      message += `\n@${referral.username || "без имени"} привел(а) ${
        referral.clients.length
      } клиентов:\n`;

      if (referral.clients.length > 0) {
        referral.clients.forEach((client, index) => {
          message += `  ${index + 1}. @${client.tg_username || "без имени"}\n`;
        });
      } else {
        message += "Нет клиентов\n";
      }
      message += "---------------------------";
    });

    await ctx.reply(message, { disable_notification: true });
  } catch (error) {
    if (error.code === 403) {
      console.log(`Пользователь ${ctx.from.username} заблокировал бота`);
    } else {
      console.error(error.message);
    }
  }
};

// Подтвердить клиента
export const confirmedClients = async (ctx, clientId) => {
  try {
    await Axios.patch(`clients/${clientId}/confirm`, { isConfirmed: 1 }).then(
      async (res) => {
        if (res.status === 200) {
          await ctx.answerCbQuery(
            "Запись подтверждена. Чтобы договориться о вознаграждении, посмотрите раздел 'Вас рекомендуют'."
          );
          await ctx.editMessageText("Клиент подтвержден ✅", {
            parse_mode: "Markdown",
          });
        }
      }
    );
  } catch (error) {
    console.error("Ошибка подтверждения клиента:", error.message);
    await ctx.answerCbQuery("Ошибка подтверждения записи!");
  }
};

// Отменить запись с клиентом
export const cancelClients = async (ctx, clientId) => {
  try {
    await Axios.patch(`clients/${clientId}/confirm`, { isConfirmed: 0 }).then(
      async (res) => {
        if (res.status === 200) {
          await ctx.answerCbQuery("Запись отменена!");
          await ctx.editMessageText("Запись с клиентом отменена ❌", {
            parse_mode: "Markdown",
          });
        }
      }
    );
  } catch (error) {
    console.error("Ошибка отмены записи:", error.message);
    await ctx.answerCbQuery("Ошибка отмены записи!");
  }
};
