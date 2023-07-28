import { app } from "./app";
import { logger } from "./logger";

const port = 8000;
app.listen(port, () => {
  logger.info(`ポート${port}番で起動しました。`);
});
