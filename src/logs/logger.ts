import winston from 'winston';

const { combine, timestamp, printf } = winston.format;

// Define el formato del log
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Configura el logger
const logger = winston.createLogger({
  level: 'info', // Puedes ajustar el nivel de log según tus necesidades
  format: combine(
    timestamp(),
    logFormat
  ),
  transports: [
    new winston.transports.Console(), // Log en la consola
    new winston.transports.File({ filename: 'logs/app.log' }) // Log en archivo
  ],
});

export default logger;
