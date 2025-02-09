export const sceneHistoryMiddleware = async (ctx, next) => {
  // Сохраняем текущую сцену перед переходом в новую
  if (ctx.scene?.current?.id) {
    ctx.session.previousScene = ctx.scene.current.id;
  }

  await next();
};
