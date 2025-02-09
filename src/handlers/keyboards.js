import { Markup } from "telegraf";

export const mainMenuKeyboard = Markup.keyboard(["📸 Фотограф", "👥 Клиент"])
  .resize()
  .oneTime();

export const photographerMenuKeyboard = Markup.keyboard([
  "👥 Мои клиенты",
  "📊 Вас рекомендуют",
  "❌ Удалить профиль",
]).resize();

export const distributorMenuKeyboard = Markup.keyboard([
  "📸 Список фотографов",
  "👥 Приглашённые рефералы",
  "❌ Удалить профиль",
]).resize();

export const deletedLastMessage = async (ctx) => {
  const messageId = ctx.callbackQuery?.message?.message_id;
  if (messageId) {
    await ctx.deleteMessage(messageId).catch(() => {});
  }
};

export const createResourcesKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("Telegram-канал", "fill_telegram"),
      Markup.button.callback("Сайт-портфолио", "fill_website"),
    ],
    [Markup.button.callback("Другой ресурс", "fill_other")],
    [Markup.button.callback("Пропустить", "skip_step")],
  ]).reply_markup;
};
