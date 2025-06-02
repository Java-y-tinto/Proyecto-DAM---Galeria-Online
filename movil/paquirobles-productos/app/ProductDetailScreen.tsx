import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';

// Navegación y Tipos
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamsList } from '../types/navigation.types';
// Asegúrate de que UPDATE_PRODUCT esté definido en tu archivo de operaciones y que coincida con la mutación que proporcionaste
import { GET_PRODUCT_BY_ID, UPDATE_PRODUCT, Product as ProductType } from '../graphql/functions'; 

// Tipado para las props de esta pantalla
type ProductDetailProps = StackScreenProps<RootStackParamsList, 'ProductDetail'>;

// Tipado para el formulario y los errores
interface FormData {
  name: string;
  list_price: string; 
  image_1920: string | null; 
}

interface FormErrors {
  name?: string;
  list_price?: string;
}

// Define el tipo para la respuesta de la mutación, basándote en tu GQL
interface UpdateProductData {
  updateProduct: {
    success: boolean;
    message?: string; // message es opcional
    product_id?: number; // product_id es opcional
    product?: ProductType; // product es opcional
  };
}

// Define el tipo para las variables de la mutación
interface UpdateProductVariables {
  id: number; // ID como número
  input: {
    name?: string;
    list_price?: number;
    image_1920?: string | null;
  };
}


const ProductDetailScreen: React.FC<ProductDetailProps> = ({ route, navigation }) => {
  const { productId } = route.params; 

  const [formData, setFormData] = useState<FormData | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const { data, loading, error: queryError } = useQuery<{ productById: ProductType }>( // Renombrado error a queryError
    GET_PRODUCT_BY_ID,
    { variables: { id: productId } }
  );

  // Mutación para actualizar el producto
  const [updateProductMutation, { loading: saving, error: mutationGqlError }] = useMutation<UpdateProductData, UpdateProductVariables>( // Renombrado error a mutationGqlError
    UPDATE_PRODUCT, // Usa tu mutación importada
    {
      onCompleted: (response) => {
        const updateResult = response.updateProduct;
        if (updateResult.success) {
          Alert.alert('Éxito', updateResult.message || 'Producto actualizado correctamente.');
          console.log('Producto actualizado:', updateResult.product || updateResult.product_id);
          navigation.goBack(); 
        } else {
          Alert.alert('Error', updateResult.message || 'No se pudo actualizar el producto.');
        }
      },
      onError: (error) => { // Este onError es para errores de red/GraphQL, no errores de lógica de negocio
        Alert.alert('Error', `No se pudo guardar el producto: ${error.message}`);
        console.error('Error al guardar:', error);
      },
      refetchQueries: [{ query: GET_PRODUCT_BY_ID, variables: { id: productId } }]
    }
  );

  useEffect(() => {
    if (data?.productById) {
      const product = data.productById;
      setFormData({
        name: product.name,
        list_price: product.list_price.toString(),
        image_1920: product.image_1920, 
      });
    }
  }, [data]);

  const handleOpenCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permiso denegado', 'Necesitas dar permiso a la cámara para tomar una foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1], 
      quality: 0.7,
      base64: true, 
    });

    if (!result.canceled) {
      if (result.assets && result.assets[0].base64) {
        // Guardar la imagen como string Base64 directamente
        setFormData(prev => prev ? { ...prev, image_1920: result.assets[0].base64! } : null);
      }
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
    if (field in errors) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData) return false;
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del producto es obligatorio.';
    }
    const price = parseFloat(formData.list_price);
    if (isNaN(price) || price <= 0) {
      newErrors.list_price = 'El precio debe ser un número positivo.';
    }
    // Podrías añadir validación para la imagen si es obligatoria
    // if (!formData.image_1920) { /* ... */ }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveChanges = () => {
    if (validateForm() && formData) {
      const numericProductId = parseInt(productId, 10); // Convertir productId a número
      if (isNaN(numericProductId)) {
        Alert.alert('Error', 'ID de producto inválido.');
        return;
      }

      console.log('Guardando cambios para ID:', numericProductId, 'con datos:', formData);
      
      updateProductMutation({ // Llamar a la función de mutación
        variables: {
          id: numericProductId, // ID como número
          input: { // Objeto input anidado
            name: formData.name,
            list_price: parseFloat(formData.list_price),
            image_1920: formData.image_1920, // Envía la imagen Base64 (nueva o la original)

          }
        }
      });
    } else {
      console.log('Validación fallida', errors);

       Alert.alert('Atención', 'Por favor, corrige los errores en el formulario.');
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#0A2342" /></View>;
  }

  if (queryError) {
    return <View style={styles.center}><Text style={styles.errorText}>Error al cargar el producto: {queryError.message}</Text></View>;
  }

  if (!formData) {
    return <View style={styles.center}><Text>No se encontraron datos del producto.</Text></View>;
  }

  // Determinar la URI de la imagen a mostrar.
  // Si image_1920 ya es un string base64 (nueva foto), no necesita el prefijo.
  // Si es el base64 del backend, SÍ necesita el prefijo.
  // Esta lógica asume que si es una nueva foto, ya tiene el prefijo 'data:image...'
  // Si no, y la nueva foto es solo base64, necesitarías añadir el prefijo.
  let imageUriToShow = formData.image_1920;
  if (formData.image_1920 && !formData.image_1920.startsWith('data:image')) {
    imageUriToShow = `data:image/png;base64,${formData.image_1920}`;
  }


  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.imageContainer}>
        {imageUriToShow ? (
          <Image source={{ uri: imageUriToShow }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Icon name="camera-off" size={50} color="#A0A0A0" />
            <Text style={styles.imagePlaceholderText}>Sin imagen</Text>
          </View>
        )}
        <TouchableOpacity style={styles.cameraButton} onPress={handleOpenCamera}>
          <Icon name="pencil" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.formContainer}>
        <Text style={styles.label}>Nombre del Producto</Text>
        <TextInput
          style={[styles.input, errors.name ? styles.inputError : null]}
          value={formData.name}
          onChangeText={(value) => handleInputChange('name', value)}
          placeholder="Ej: Cuadro al Óleo"
        />
        {errors.name && <Text style={styles.errorTextValidation}>{errors.name}</Text>}
        
        <Text style={styles.label}>Precio (€)</Text>
        <TextInput
          style={[styles.input, errors.list_price ? styles.inputError : null]}
          value={formData.list_price}
          onChangeText={(value) => handleInputChange('list_price', value)}
          placeholder="Ej: 150.00"
          keyboardType="numeric"
        />
        {errors.list_price && <Text style={styles.errorTextValidation}>{errors.list_price}</Text>}
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, saving && styles.buttonDisabled]} 
        onPress={handleSaveChanges}
        disabled={saving}
      >
        {saving 
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.saveButtonText}>Guardar Cambios</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
    backgroundColor: '#E0E0E0', // Color de fondo para la imagen
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 10,
    color: '#A0A0A0',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.6)', // Un poco más oscuro para mejor contraste
    padding: 12,
    borderRadius: 30, // Círculo perfecto
    elevation: 5, // Sombra
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10, // Menos padding vertical si el scroll es el principal
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242', // Un gris más oscuro
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BDBDBD', // Borde más sutil
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10, // Ajuste de padding para iOS
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#E53935', // Rojo más intenso para errores
    borderWidth: 1.5, // Borde más grueso para destacar el error
  },
  errorText: { // Para errores generales de carga
    color: '#D32F2F',
    fontSize: 16,
    textAlign: 'center',
  },
  errorTextValidation: { // Para errores de validación de campos
    color: '#D32F2F',
    fontSize: 13,
    marginTop: 5,
    marginLeft: 2,
  },
  saveButton: {
    backgroundColor: '#0A2342', 
    marginHorizontal: 20,
    marginTop: 10, // Menos margen superior si hay más campos
    marginBottom: 30, // Más margen inferior para que no quede pegado al final
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#90A4AE', // Un gris más claro para deshabilitado
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17, // Ligeramente más pequeño
    fontWeight: '600', // Un poco menos bold
  },
});

export default ProductDetailScreen;
