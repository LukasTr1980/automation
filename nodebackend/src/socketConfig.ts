import { Server as HttpServer } from 'http';
import { Server, ServerOptions } from 'socket.io';

function configureSocket(httpServer: HttpServer): Server {
  const options: Partial<ServerOptions> = {
    cors: {
      origin: true,
      methods: ['GET', 'POST']
    }
  };
  const io = new Server(httpServer, options);

  return io;
}

export default configureSocket;
