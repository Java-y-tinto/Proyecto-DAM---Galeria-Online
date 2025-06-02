import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoadingScreen from './app/LoadingScreen';
import HomeScreen from './app/HomeScreen';
import LoginScreen from './app/LoginScreen';
import { createStackNavigator, StackScreenProps } from '@react-navigation/stack';
import { NavigationContainer, ParamListBase, RouteProp } from '@react-navigation/native';
import * as React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isTokenExpired } from './scripts/utils';

// Apolloprovider y el cliente que configuramos en el archivo apolloClient.ts
import { ApolloProvider } from '@apollo/client';
import client from './graphql/apolloClient';


// Pantallas y sus parametros
import { RootStackParamsList } from './types/navigation.types';
import ProductDetailScreen from './app/ProductDetailScreen';

const Stack = createStackNavigator<RootStackParamsList>();


export default function App() {
    // Estado de pantalla de carga
    const [isLoading, setLoading] = React.useState(true);

    // Estado que guarda el JWT (No existe o no valido = null)
    const [token, setToken] = React.useState<string | null>(null);

    React.useEffect(() => {
        const bootstrapAsync = async () => {
            let token: string | null = null;
            try {
                // Intenta cargar el JWT del almacenamiento local
                token = await AsyncStorage.getItem('token');

                // Existe un JWT?
                if (token) {
                    // Si existe
                    // Esta caducado?
                    if (isTokenExpired(token)) {
                        // Si esta caducado
                        // Elimina el JWT
                        await AsyncStorage.removeItem('token');
                        // Actualiza el estado
                        setToken(null);
                    } else {
                        // No esta caducado
                        // Actualiza el estado
                        setToken(token);
                    }
                } else {
                    setToken(null);
                }
            } catch (e) {
                console.log(e);
            } finally {
                setLoading(false);
            }
        };
        bootstrapAsync();
    }, []);
    if (isLoading) {
        return <LoadingScreen />
    }
    return (
        <ApolloProvider client={client}>
            <SafeAreaProvider>
                <NavigationContainer>
                    <Stack.Navigator>
                        {token == null ? (
                            <Stack.Screen
                                name="LoginScreen"
                                options={{ headerShown: false }}
                                initialParams={{ setToken: setToken }}>

                                {(props: StackScreenProps<RootStackParamsList, "LoginScreen">) => (
                                       <LoginScreen navigation={props.navigation} route={props.route} />
                                )}

                            </Stack.Screen>

                        ) : (
                            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
                        )}
                        <Stack.Screen
                            name="ProductDetail"
                            component={ProductDetailScreen}
                            options={{
                                title: "Detalles del producto",
                                 headerShown: true,
                                 

                             }}
                        />
                    </Stack.Navigator>
                </NavigationContainer>
            </SafeAreaProvider>
        </ApolloProvider>
    );
}