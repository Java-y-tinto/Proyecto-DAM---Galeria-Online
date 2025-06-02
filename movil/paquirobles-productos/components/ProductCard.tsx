import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
// Asegúrate de que la importación del tipo Product sea correcta.
// Si Product está en '../graphql/operations', la ruta sería así:
import type { Product } from '../graphql/functions'; 
// Si está en el mismo directorio que HomeScreen y HomeScreen lo exporta, sería:
// import type { Product } from './HomeScreen'; 

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

const { width } = Dimensions.get('window');
// Calcula el ancho de la tarjeta para que quepan dos por fila, con márgenes.
const cardWidth = width / 2 - 20; // (margen total horizontal de 20 + 10 de paddingHorizontal en FlatList = 30) / 2 items = 15 por item

const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  // Las imágenes de Odoo  vienen como Base64.
  const imageUrl =`data:image/png;base64,${product.image_1920}`;

  // Fallback a una imagen placeholder si no esta disponible
  const imageSource = product.image_1920 ? { uri: imageUrl } : {url: 'https://placehold.co/600x400'}


  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image
        source={imageSource}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={2}>{product.name || "Nombre no disponible"}</Text>
        <Text style={styles.price}>{product.list_price ? `${product.list_price.toFixed(2)} €` : "Precio no disponible"}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: '#FFFFFF', // Fondo blanco para las tarjetas
    borderRadius: 12,          // Bordes redondeados
    marginBottom: 15,          // Margen inferior entre tarjetas
    marginHorizontal: (width - (cardWidth * 2) - 20) / 4, // Centra las tarjetas si hay espacio extra (20 es el paddingHorizontal de FlatList)
                                                        // Si FlatList tiene paddingHorizontal: 10, y numColumns: 2,
                                                        // entonces las tarjetas ya tendrán espacio.
    elevation: 3,              // Sombra para Android
    shadowColor: '#000000',    // Sombra para iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    overflow: 'hidden',        // Importante para que la imagen no se salga de los bordes redondeados
  },
  image: {
    width: '100%',
    height: cardWidth * 1.1,   // Altura proporcional
    backgroundColor: '#E0E0E0', // Color de fondo mientras carga o si no hay imagen
  },
  infoContainer: {
    paddingVertical: 8,      // Padding vertical
    paddingHorizontal: 10,   // Padding horizontal
  },
  name: {
    fontSize: 14,            // Tamaño de fuente para el nombre
    fontWeight: '600',       // Peso de la fuente
    color: '#333333',       // Color del texto
    marginBottom: 4,
    minHeight: 34,           // Altura mínima para asegurar espacio para dos líneas de texto
  },
  price: {
    fontSize: 15,            // Tamaño de fuente para el precio
    fontWeight: 'bold',
    color: '#0A2342',       // Color oscuro para el precio, como el fondo de la app
  },
});

export default ProductCard;
