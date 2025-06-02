import React, {useState, useEffect} from "react";
import {View, Text, ActivityIndicator, StyleSheet, Dimensions, Image} from "react-native";
const {width, height} = Dimensions.get('window');



const LoadingScreen = () => {
    return (
        <View style={styles.container}>
            <Image source={require('../assets/logo.png')} style={styles.logo} />
            <ActivityIndicator size="large" color="#0000ff" style={styles.spinner}/>
        </View>
    );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A2342', // Azul oscuro, ajusta este color a tu gusto
    position: 'absolute',
    width: width,
    height: height,
    top: 0,
    left: 0,
    zIndex: 1000,
  },
  logoText: {
    fontSize: 48, // Tamaño grande para el nombre
    color: '#FFFFFF', // Color blanco para el texto
    fontFamily: 'serif', // Una fuente con serifa podría acercarse, pero idealmente usa una imagen para el logo
    fontWeight: 'bold',
    textAlign: 'center',
  },
  logoBrush: {
    fontSize: 40, // Tamaño del "pincel" (emoji)
    color: '#FFFFFF',
    position: 'absolute', // Para intentar superponerlo o colocarlo creativamente
    // Ajusta estas propiedades para posicionar el pincel como en tu logo
    // Esto es solo una simulación muy básica
    transform: [{ rotate: '-45deg' }],
    top: 30, 
    left: '30%', 
  },
  logo: {
    width: 250, // Ajusta el ancho de tu logo
    height: 150, // Ajusta el alto de tu logo
    marginBottom: 40, // Espacio entre el logo y el spinner
  },
  
  spinner: {
    marginTop: 20, // Espacio adicional si no hay texto de "cargando"
  },
});

export default LoadingScreen;
