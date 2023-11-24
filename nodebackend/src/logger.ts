import winston from 'winston';

// Custom formatting function
const customFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Create a Winston logger
const logger = winston.createLogger({
  level: 'info', // Log only if level is less than or equal to this level
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'DD-MM-YYYY HH:mm:ss'
    }),
    customFormat // use custom format here
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.timestamp({
          format: 'DD-MM-YYYY HH:mm:ss'
        })
      )
    })
  ]
});

export default logger;