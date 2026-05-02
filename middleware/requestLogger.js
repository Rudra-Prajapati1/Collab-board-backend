import logger from "../utils/logger.js";

const requestLogger = (req, res, next) => {
  const start = Date.now();

  const originalSend = res.send;

  let responseBodySize = 0;

  res.send = function (body) {
    if (body) {
      responseBodySize = Buffer.byteLength(body, "utf8");
    }
    return originalSend.call(this, body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;

    logger.info(
      `${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Duration: ${duration}ms | Size: ${responseBodySize} bytes`,
    );
  });

  next();
};

export default requestLogger;
