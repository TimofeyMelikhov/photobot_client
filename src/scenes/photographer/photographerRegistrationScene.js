import { Scenes, Markup } from "telegraf";
import {
  createResourcesKeyboard,
  photographerMenuKeyboard,
} from "../../handlers/keyboards.js";
import { MESSAGES } from "../../constants/messages.js";
import { Axios } from "../../api/index.js";

// Константы для шагов регистрации
const STEPS = {
  NAME: 1,
  CITY: 2,
  RESOURCES: 3,
  RESOURCE_INPUT: 3.5,
  PHOTO: 4,
};

// Создаем сцену для регистрации фотографа
const photographerRegistrationScene = new Scenes.BaseScene(
  "photographerRegistration"
);

// Вспомогательная функция для отправки сообщения с кнопкой "Пропустить"
async function sendSkipMessage(ctx) {
  const skipMessage = await ctx.reply(
    "Загрузите фото Вашего профиля или нажмите 'Пропустить'",
    {
      disable_notification: true,
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("Пропустить", "skip_step")],
      ]).reply_markup,
    }
  );
  ctx.scene.state.skipMessageId = skipMessage.message_id;
}

// Вспомогательная функция для удаления сообщения с кнопкой "Пропустить"
async function deleteSkipMessage(ctx) {
  if (ctx.scene.state.skipMessageId) {
    try {
      await ctx.deleteMessage(ctx.scene.state.skipMessageId);
    } catch (error) {
      console.error(
        "Ошибка при удалении сообщения с кнопкой 'Пропустить':",
        error
      );
    } finally {
      ctx.scene.state.skipMessageId = null;
    }
  }
}

photographerRegistrationScene.enter(async (ctx) => {
  ctx.scene.state.userData = {
    step: STEPS.NAME,
    data: {
      tg_channel: null,
      portfolio_url: null,
      other_resource: null,
      profile_photo: null,
    },
  };
  await ctx.reply(
    "Укажите свое имя или псевдоним, чтобы клиенты могли найти Вас",
    { disable_notification: true }
  );
});

photographerRegistrationScene.on("text", async (ctx) => {
  const userData = ctx.scene.state.userData;
  const message = ctx.message.text;

  switch (userData.step) {
    case STEPS.NAME:
      userData.data.name = message;
      userData.step = STEPS.CITY;
      await ctx.reply("Укажите город, где фотографируете", {
        disable_notification: true,
      });
      break;
    case STEPS.CITY:
      userData.data.city = message;
      userData.step = STEPS.RESOURCES;
      await askForResources(ctx, false);
      break;
    case STEPS.RESOURCE_INPUT:
      await handleResourceInput(ctx, message);
      break;
    default:
      await ctx.reply("Что-то пошло не так. Попробуйте снова.", {
        disable_notification: true,
      });
      break;
  }
});

photographerRegistrationScene.action(/fill_(.+)/, async (ctx) => {
  const resourceType = ctx.match[1];
  ctx.scene.state.userData.selectedResource = resourceType;
  ctx.scene.state.userData.step = STEPS.RESOURCE_INPUT;

  await ctx.deleteMessage();
  await ctx.reply(
    `Введите ссылку на ваш ${
      resourceType === "telegram"
        ? "Telegram-канал"
        : resourceType === "website"
        ? "сайт-портфолио"
        : "другой ресурс"
    }:`,
    { disable_notification: true }
  );
  await ctx.answerCbQuery();
});

photographerRegistrationScene.action("skip_step", async (ctx) => {
  const userData = ctx.scene.state.userData;

  if (userData.step === STEPS.RESOURCES) {
    const { tg_channel, portfolio_url, other_resource } = userData.data;

    if (!tg_channel && !portfolio_url && !other_resource) {
      await ctx.answerCbQuery(
        "Вы должны указать хотя бы одну ссылку на ваши работы."
      );
      return;
    }

    await ctx.deleteMessage();
    userData.step = STEPS.PHOTO;
    await sendSkipMessage(ctx);
  } else if (userData.step === STEPS.PHOTO) {
    await deleteSkipMessage(ctx);
    await finalizePhotographerRegistration(ctx);
  }

  await ctx.answerCbQuery();
});

photographerRegistrationScene.on("photo", async (ctx) => {
  if (ctx.scene.state.userData.step === STEPS.PHOTO) {
    const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    ctx.scene.state.userData.data.profile_photo = photoId;

    await deleteSkipMessage(ctx);
    await finalizePhotographerRegistration(ctx);
  }
});

async function askForResources(ctx, showSavedMessage = true) {
  const message = showSavedMessage
    ? "Ваши данные сохранены. Если хотите, можете указать ещё один ресурс, либо нажмите 'Пропустить':"
    : "Выберите ресурс который хотите заполнить. Минимум один:";

  await ctx.reply(message, {
    disable_notification: true,
    reply_markup: createResourcesKeyboard(),
  });
}

async function handleResourceInput(ctx, message) {
  const userData = ctx.scene.state.userData;
  const { selectedResource, data } = userData;

  switch (selectedResource) {
    case "telegram":
      data.tg_channel = message;
      break;
    case "website":
      data.portfolio_url = message;
      break;
    case "other":
      data.other_resource = message;
      break;
  }

  const allResourcesFilled =
    data.tg_channel && data.portfolio_url && data.other_resource;

  if (allResourcesFilled) {
    userData.step = STEPS.PHOTO;
    await sendSkipMessage(ctx);
  } else {
    await askForResources(ctx, true);
    userData.step = STEPS.RESOURCES;
  }
}

async function finalizePhotographerRegistration(ctx) {
  const data = ctx.scene.state.userData.data;

  const payload = {
    tg_user_id: ctx.from.id,
    tg_username: ctx.from.username,
    ...data,
  };

  try {
    const res = await Axios.post("/photographers/create", payload);
    if (res.status === 201) {
      ctx.session.userData = {
        role: "photographer",
        ...res.data,
      };

      await ctx.reply(MESSAGES.createPhotographer, {
        disable_notification: true,
        reply_markup: photographerMenuKeyboard.reply_markup,
      });
      ctx.scene.enter("photographerScene");
    }
  } catch (error) {
    await ctx.reply("Ошибка на стороне сервера.", {
      disable_notification: true,
    });
  } finally {
    ctx.scene.leave();
  }
}

export { photographerRegistrationScene };
