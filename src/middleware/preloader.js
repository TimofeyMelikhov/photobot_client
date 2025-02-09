import { Composer } from "telegraf";

export const loaderMiddleware = new Composer();

loaderMiddleware.use(async (ctx, next) => {
  const loadingMessage = await ctx.reply("⌛ Пожалуйста, подождите...", {
    disable_notification: true,
  });

  try {
    await next();
  } catch (error) {
    if (error.statusCode === 403) {
      console.log("Пользователь заблокировал бота");
    }
  } finally {
    if (loadingMessage && loadingMessage.message_id) {
      await ctx.deleteMessage(loadingMessage.message_id).catch((err) => {
        console.log("Ошибка удаления сообщения о загрузке:", err.message);
      });
    }
  }
});
