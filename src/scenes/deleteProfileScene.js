import { Scenes } from "telegraf";
import {
  handleDeleteProfile,
  confirmDeleteProfile,
} from "../handlers/commandHandler.js";
import {
  deletedLastMessage,
  distributorMenuKeyboard,
  photographerMenuKeyboard,
} from "../handlers/keyboards.js";

export const deleteProfileScene = new Scenes.BaseScene("deleteProfileScene");

deleteProfileScene.enter(async (ctx) => {
  const loadingMessage = await ctx.reply("⌛ Пожалуйста, подождите...", {
    reply_markup: { remove_keyboard: true },
    disable_notification: true,
  });
  await ctx.deleteMessage(loadingMessage.message_id).catch((error) => {
    console.error("Ошибка при удалении сообщения о загрузке:", error.message);
  });
  await handleDeleteProfile(ctx);
});

deleteProfileScene.action(/confirm_delete_(\d+)/, async (ctx) => {
  const userId = ctx.match[1];
  await confirmDeleteProfile(ctx, userId);
  await deletedLastMessage(ctx);
  ctx.scene.leave(); // Выходим из сцены удаления
});

deleteProfileScene.action("cancel_delete", async (ctx) => {
  const { role } = ctx.session.userData;

  await ctx.answerCbQuery("Удаление отменено.");
  await deletedLastMessage(ctx);

  // Выходим из текущей сцены
  await ctx.scene.leave();

  // Возвращаемся в предыдущую сцену, если она сохранена
  if (ctx.session.previousScene) {
    const previousScene = ctx.session.previousScene;
    delete ctx.session.previousScene; // Очищаем сохраненную сцену
    ctx.scene.enter(previousScene); // Переходим в предыдущую сцену
  } else {
    // Если предыдущая сцена не сохранена, возвращаемся в главное меню
    if (role === "photographer") {
      await ctx.reply("Удаление отменено.", {
        disable_notification: true,
        reply_markup: photographerMenuKeyboard.reply_markup,
      });
    } else {
      await ctx.reply("Удаление отменено.", {
        disable_notification: true,
        reply_markup: distributorMenuKeyboard.reply_markup,
      });
    }
  }
});
