import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './graphql/typeDefs/typeDefs';
import { resolvers } from './graphql/resolvers/resolvers';
import { verifyToken } from './services/auth';

dotenv.config();

const startServer = async () => {
  const app = express();
  const port = process.env.PORT || 4000;

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  // 👇 Aquí combinamos todos los middlewares necesarios para /graphql
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    bodyParser.json(),
    
    expressMiddleware(server, {
      context: async ({ req }) => {
        const authHeader = req.headers.authorization || '';
        if (authHeader.startsWith('Bearer ')) {
          const token = authHeader.replace('Bearer ', '');
          try {
            const user = verifyToken(token);
            return { user };
          } catch (err) {
            console.error('Token inválido:', err);
          }
        }
        return {};
      },
    })
      

  );

  app.get('/health', (_, res) => {
    res.send('Servidor OK');
  });

  app.listen(port, () => {
    console.log(`🚀 Servidor iniciado en http://localhost:${port}/graphql`);
  });
};

startServer();
