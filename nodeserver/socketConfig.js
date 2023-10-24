const socketIo = require('socket.io');

function configureSocket(httpServer) {
  const io = socketIo(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST']
    }
  });

  return io;
}

module.exports = configureSocket;
