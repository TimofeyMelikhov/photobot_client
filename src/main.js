import { Telegraf, session, Scenes } from "telegraf";
import config from "config";
import {
  handleStartCommand,
  feedbackHandler,
} from "./handlers/commandHandler.js";
import {
  cancelClients,
  confirmedClients,
} from "./handlers/photographerHandlers.js";
import { photographerRegistrationScene } from "./scenes/photographer/photographerRegistrationScene.js";
import { clientRegistrationScene } from "./scenes/clientRegistrationScene.js";
import { sessionMiddleware } from "./middleware/sessionMiddleware.js";
import { deleteProfileScene } from "./scenes/deleteProfileScene.js";
import { distributorPhotographersScene } from "./scenes/distributorPhotographersScene.js";
import { distributorScene } from "./scenes/distributor/baseDistributorScen.js";
import { photographerScene } from "./scenes/photographer/basePhotographerScent.js";
import { sceneHistoryMiddleware } from "./middleware/sceneHistoryMiddleware.js";

const bot = new Telegraf(config.get("TELEGRAM_TOKEN"));
bot.use(session());

const stage = new Scenes.Stage([
  photographerRegistrationScene,
  clientRegistrationScene,
  deleteProfileScene,
  distributorPhotographersScene,
  distributorScene,
  photographerScene,
]);
bot.use(stage.middleware());

bot.use(sessionMiddleware);

bot.use(sceneHistoryMiddleware);

bot.command("start", handleStartCommand);

bot.command("feedback", feedbackHandler);
bot.hears("📸 Фотограф", async (ctx) => {
  ctx.scene.enter("photographerRegistration");
});
bot.hears("👥 Клиент", async (ctx) => ctx.scene.enter("distributorScene"));

bot.hears("❌ Удалить профиль", async (ctx) => {
  ctx.scene.enter("deleteProfileScene");
});

bot.action(/confirmClient_(\d+)/, async (ctx) => {
  const clientId = ctx.match[1];
  await confirmedClients(ctx, clientId);
});
bot.action(/cancelClient_(\d+)/, async (ctx) => {
  const clientId = ctx.match[1];
  await cancelClients(ctx, clientId);
});

bot.telegram.setMyCommands([
  { command: "/feedback", description: "Обратная связь" },
]);

bot
  .launch()
  .then(() => console.log("Бот запущен."))
  .catch((err) => console.error("Ошибка запуска бота:", err.message));

process.once("SIGINT", () => {
  bot.stop("SIGINT");
});
process.once("SIGTERM", () => {
  bot.stop("SIGTERM");
});
