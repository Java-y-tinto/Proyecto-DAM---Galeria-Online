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





const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

const startServer = async () => {
  const app = express();
  const port = process.env.PORT || 4000;

  
  await connectOdoo();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
   plugins: [
  {
    requestDidStart: async (requestContext) => {
  return {
    didResolveOperation: async (requestContext) => {
      
      
      return Promise.resolve();
    },
    didEncounterErrors: async (requestContext) => {
      
      return Promise.resolve();
    }
  };
}
  }
]
  });

  
  await server.start();
  
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
            
            
            return {};
          }
        }
        
        
        return {};
      },
    })
  );

  app.get('/health', (req, res) => {
    
    res.send('Servidor OK');
  });

  app.listen(port, () => {
    
    
    
  });
};

startServer().catch(error => {
  
  process.exit(1);
});