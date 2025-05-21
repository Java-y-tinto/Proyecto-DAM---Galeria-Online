import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './graphql/typeDefs/typeDefs.js';
import { resolvers } from './graphql/resolvers/resolvers.js';
import { verifyToken, authenticateUser,registerUser } from './services/auth.js';
import { odooClient,connectOdoo } from './instances/odooClientInstance.js';

dotenv.config();

const startServer = async () => {
  const app = express();
  const port = process.env.PORT || 4000;

  await connectOdoo();

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

const test = (async () => {
  console.log("Intentando autenticar usuario");
  var user = await authenticateUser('itsmytesting@mytesting.com', '1234');
  console.log(user);
  if (user){
    console.log("Intentando verificar token");
    console.log(verifyToken(user.token));
  }
  console.log("Intentando autenticar usuario que no existe")  
  var user2 = await authenticateUser('pene@pene.com', '1234');
  console.log(user2);

  console.log("Intentando registrar un usuario");
  var user3 = await registerUser({name: 'prueba',email: 'prueba@test.com',passwd: '1234'});
  console.log(user3);
})


test();

startServer();
