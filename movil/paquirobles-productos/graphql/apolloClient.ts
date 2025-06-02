import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native'; // Para mostrar alertas de error



const GRAPH_QL_API_URL = 'https://paquirobles.com/api/graphql';

const httpLink = createHttpLink({
  uri: GRAPH_QL_API_URL,
});

const authLink = setContext(async (_, { headers }) => {
  // Obtén el token de autenticación de AsyncStorage
  const token = await AsyncStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL Error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}, Extensions: ${JSON.stringify(extensions)}`
      );

      // Manejo específico para errores de autenticación/autorización
      
      if (extensions?.code === 'UNAUTHENTICATED' || message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('expired') || message.toLowerCase().includes('no autorizado')) {
        console.warn('Token expirado o inválido. Limpiando token y pidiendo re-login.');
        
        // Limpiar el token de AsyncStorage
        AsyncStorage.removeItem('token').then(() => {
              // Hacemos que el usuario cierre y abra la app
             Alert.alert(
              "Sesión Expirada",
              "Tu sesión ha expirado o es inválida. Por favor, inicia sesión de nuevo.",
              [{ text: "OK" }]
            );

        });
      } else {
        // Otros errores de GraphQL
        Alert.alert("Error de GraphQL", message);
      }
    });
  }

  if (networkError) {
    console.error(`[Network Error]: ${JSON.stringify(networkError, null, 2)}`);
    Alert.alert("Error de Red", "No se pudo conectar al servidor. Verifica tu conexión a internet.");
  }
});

const client = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: { // Opciones por defecto como en tu servicio Angular
    watchQuery: {
      fetchPolicy: 'cache-first', // 'network-only' puede ser muy agresivo para el uso de datos,por lo que usamos cache first
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    }
  },
});

export default client;
