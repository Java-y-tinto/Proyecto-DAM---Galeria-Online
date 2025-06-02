import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useMutation } from '@apollo/client';

import { LOGIN_USER_MUTATION, LoginData, LoginVars } from '../graphql/functions'; 

import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamsList } from "../types/navigation.types";

import AsyncStorage from "@react-native-async-storage/async-storage";

const { height, width } = Dimensions.get('window');

type LoginScreenProps = StackScreenProps<RootStackParamsList, 'LoginScreen'>;

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
  const { setToken } = route.params;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const [loginUser, { loading: isLoggingIn, error }] = useMutation<LoginData, LoginVars>(
    LOGIN_USER_MUTATION,
    {
      onCompleted: async (data) => {
        if (data?.login?.token) {
          const newToken = data.login.token;
          try {
            await AsyncStorage.setItem('token', newToken);
            setToken(newToken);
          } catch (e) {
            console.error("Error al guardar token:", e);
            Alert.alert('Error', 'No se pudo guardar la sesión.');
          }
        } else {
          Alert.alert('Error', 'Las credenciales son incorrectas.');
        }
      },
      onError: (apolloError) => {
        console.error("Error en la mutación de login:", apolloError.message);
        Alert.alert('Error', 'Ocurrió un problema al intentar iniciar sesión.');
      }
    }
  );

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor, introduce tu correo y contraseña.');
      return;
    }
    loginUser({ variables: { email, password } });
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingContainer} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}

    >

      <ScrollView 
        style={styles.scrollViewStyle} // Estilo para el ScrollView en sí
        contentContainerStyle={styles.scrollContentContainer} 
        keyboardShouldPersistTaps="handled" // Buena práctica para que los taps fuera del input cierren el teclado
      >
        <View style={styles.container}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>Paqui Robles</Text>
          </View>
          <Text style={styles.title}>Iniciar sesión</Text>

          <View style={styles.inputContainer}>
            <Icon name="account-outline" size={22} color="#A0A0A0" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor="#A0A0A0"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!isLoggingIn}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock-outline" size={22} color="#A0A0A0" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#A0A0A0"
              secureTextEntry={!isPasswordVisible}
              value={password}
              onChangeText={setPassword}
              editable={!isLoggingIn}
            />
            <TouchableOpacity 
              onPress={() => setIsPasswordVisible(!isPasswordVisible)} 
              style={styles.eyeIconContainer}
              disabled={isLoggingIn}
            >
              <Icon name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={22} color="#A0A0A0" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, isLoggingIn && styles.loginButtonDisabled]} 
            onPress={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <ActivityIndicator color="#0A2342" />
            ) : (
              <Text style={styles.loginButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  // Estilo para KeyboardAvoidingView
  keyboardAvoidingContainer: {
    flex: 1,
    backgroundColor: '#0A2342', // Asegura que el KAV tenga el color de fondo
    flexGrow: 1,
    height: '100%',
  },
  // Estilo para el ScrollView en sí 
  scrollViewStyle: {
    flex: 1,
    backgroundColor: '#0A2342', 
  },
  // Estilo para el CONTENIDO del ScrollView
  scrollContentContainer: {
    flexGrow: 1, // Permite que el contenido crezca para llenar el espacio
 
  },
  // Contenedor principal del contenido de la pantalla
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A2342', // Color de fondo principal
    paddingHorizontal: 30,
  },
  logoPlaceholder: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 48,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 30,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A375A',
    borderRadius: 12,
    width: '100%',
    height: 55,
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  eyeIconContainer: {
    padding: 5,
  },
  loginButton: {
    backgroundColor: '#A9BCDB',
    borderRadius: 12,
    width: '100%',
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20, 
  },
  loginButtonDisabled: {
    backgroundColor: '#7C8C9C',
  },
  loginButtonText: {
    color: '#0A2342',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
