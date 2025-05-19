import { ApplicationConfig, provideZoneChangeDetection, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { ApolloLink, InMemoryCache } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideHttpClient(withInterceptorsFromDi()),
    provideApollo(() => {
      const httpLink = inject(HttpLink);
      
      // Set proper content headers
      const basic = setContext((operation, context) => ({
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }));
      
      const auth = setContext((operation, context) => {
        const token = localStorage.getItem('token');
     
        if (token === null) {
          return {};
        } else {
          return {
            headers: {
              Authorization: `JWT ${token}`,
            },
          };
        }
      });

      return {
        link: ApolloLink.from([
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
