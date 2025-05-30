import { ApplicationConfig, provideZoneChangeDetection, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { ApolloLink, InMemoryCache } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideHttpClient(withInterceptorsFromDi()),
    provideApollo(() => {
      const httpLink = inject(HttpLink);
      
      // Headers básicos
      const basic = setContext((operation, context) => ({
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }));
      
      // Autenticación
      const auth = setContext((operation, context) => {
        const token = localStorage.getItem('token');
        
        if (!token) {
          return {};
        } else {
          return {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          };
        }
      });

      // Manejo de errores (incluyendo tokens expirados)
      const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
        if (graphQLErrors) { 
          graphQLErrors.forEach(({ message, locations, path }) => {
            console.error(`🔥 [GraphQL Error] Message: ${message}, Location: ${locations}, Path: ${path}`);
            
            // Si el error es de autorización (token expirado)
            if (message === 'No autorizado' || message.includes('expired') || message.includes('invalid')) {
              console.warn('🔄 Token expirado o inválido, limpiando localStorage...');
              localStorage.removeItem('token');
              
              // redirigir al login
              if (window.location.pathname !== '/login') {
                console.log('🔄 Redirigiendo al login...');
                window.location.href = '/login';
              }
            }
          });
        }

        if (networkError) {
          console.error(`🌐 [Network Error]: ${networkError}`);
        }
      });

      return {
        link: ApolloLink.from([
          errorLink,
          basic, 
          auth, 
          httpLink.create({
            uri: 'http://localhost:4000/graphql',
          })
        ]),
        cache: new InMemoryCache(),
        defaultOptions: {
          watchQuery: {
            fetchPolicy: 'network-only',
            errorPolicy: 'all'
          },
          query: {
            fetchPolicy: 'network-only',
            errorPolicy: 'all'
          }
        }
      };
    })
  ]
};