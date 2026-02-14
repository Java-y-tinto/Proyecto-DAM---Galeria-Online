import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './graphql/typeDefs/typeDefs.js';
import { resolvers } from './graphql/resolvers/resolvers.js';
import { verifyToken, authenticateUser, registerUser } from './services/auth.js';
import { odooClient, connectOdoo } from './instances/odooClientInstance.js';

dotenv.config();

console.log('INICIANDO SERVIDOR MIDDLEWARE...');
console.log('JWT_SECRET definido:', process.env.JWT_SECRET ? 'SÍ' : 'NO');
console.log('Puerto:', process.env.PORT || 4000);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

const startServer = async () => {
  const app = express();
  app.set('trust proxy', 1);
  const port = process.env.PORT || 4000;

  console.log('🔗 Conectando a Odoo...');
  await connectOdoo();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
   plugins: [
  {
    requestDidStart: async (requestContext) => {
  return {
    didResolveOperation: async (requestContext) => {
      console.log(' [Apollo] Query recibida:', requestContext.request.query);
      console.log(' [Apollo] Variables:', requestContext.request.variables);
      return Promise.resolve();
    },
    didEncounterErrors: async (requestContext) => {
      console.error(' [Apollo] Errores en resolver:', requestContext.errors);
      return Promise.resolve();
    }
  };
}
  }
]
  });

  console.log('Iniciando Apollo Server...');
  await server.start();
  console.log('Apollo Server iniciado correctamente');
  app.use(limiter);
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
            console.error('Error verificando token:', err);
            console.error('Stack del error:', err.stack);
            return {};
          }
        }
        
        return {};
      },
    })
  );

  app.get('/health', (req, res) => {
    console.log('Health check solicitado');
    res.send('Servidor OK');
  });

  app.listen(port, () => {
    console.log(`SERVIDOR MIDDLEWARE CORRIENDO EN http://localhost:${port}/graphql`);
    console.log(`Health check disponible en http://localhost:${port}/health`);
    console.log('Esperando requests...');
  });
};

startServer().catch(error => {
  console.error('ERROR FATAL AL INICIAR SERVIDOR:', error);
  process.exit(1);
});
