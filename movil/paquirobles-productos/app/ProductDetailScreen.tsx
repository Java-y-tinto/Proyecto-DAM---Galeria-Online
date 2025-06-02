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
// Asegúrate de que CREATE_PRODUCT esté definido e importado
import { GET_PRODUCT_BY_ID, UPDATE_PRODUCT, CREATE_PRODUCT, Product as ProductType } from '../graphql/functions'; 

// Tipado para las props de esta pantalla
type ProductDetailProps = StackScreenProps<RootStackParamsList, 'ProductDetail'>;

// Tipado para el formulario y los errores
interface FormData {
  name: string;
  list_price: string; 
  image_1920: string | null; // Base64 string o null
}

interface FormErrors {
  name?: string;
  list_price?: string;
}

// Define el tipo para la respuesta de la mutación CREATE_PRODUCT
interface CreateProductData {
  createProduct: {
    success: boolean;
    message?: string;
    product_id?: number;
    product?: ProductType;
  };
}
// Define el tipo para las variables de la mutación CREATE_PRODUCT
interface CreateProductVariables {
  input: { // ProductCreateInput!
    name: string;
    list_price: number;
    image_1920?: string | null; // Asumiendo que la imagen es opcional al crear
    // Añade otros campos que tu ProductCreateInput requiera
  };
}

// Define el tipo para la respuesta de la mutación UPDATE_PRODUCT
interface UpdateProductData {
  updateProduct: {
    success: boolean;
    message?: string;
    product_id?: number;
    product?: ProductType;
  };
}
// Define el tipo para las variables de la mutación UPDATE_PRODUCT
interface UpdateProductVariables {
  id: number;
  input: {
    name?: string;
    list_price?: number;
    image_1920?: string | null;
  };
}


const ProductDetailScreen: React.FC<ProductDetailProps> = ({ route, navigation }) => {
  const { productId } = route.params; // productId será undefined en modo "crear"
  const isEditMode = !!productId; // Determina si estamos en modo edición

  const [formData, setFormData] = useState<FormData>({ // Inicializar siempre el formulario
    name: '',
    list_price: '',
    image_1920: null,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Query para obtener los datos del producto (solo en modo edición)
  const { data, loading: queryLoading, error: queryError } = useQuery<{ productById: ProductType }>(
    GET_PRODUCT_BY_ID,
    { 
      variables: { id: productId },
      skip: !isEditMode, // No ejecutar si estamos en modo "crear"
    }
  );

  // Mutación para actualizar el producto
  const [updateProductMutation, { loading: updating, error: updateError }] = useMutation<UpdateProductData, UpdateProductVariables>(
    UPDATE_PRODUCT,
    {
      onCompleted: (response) => {
        const updateResult = response.updateProduct;
        if (updateResult.success) {
          Alert.alert('Éxito', updateResult.message || 'Producto actualizado correctamente.');
          navigation.goBack(); 
        } else {
          Alert.alert('Error', updateResult.message || 'No se pudo actualizar el producto.');
        }
      },
      onError: (error) => {
        Alert.alert('Error', `No se pudo guardar el producto: ${error.message}`);
      },
      // Refrescar la query del producto después de la mutación
      refetchQueries: isEditMode ? [{ query: GET_PRODUCT_BY_ID, variables: { id: productId } }] : [],
    }
  );

  // Mutación para crear el producto
  const [createProductMutation, { loading: creating, error: createError }] = useMutation<CreateProductData, CreateProductVariables>(
    CREATE_PRODUCT,
    {
      onCompleted: (response) => {
        const createResult = response.createProduct;
        if (createResult.success) {
          Alert.alert('Éxito', createResult.message || 'Producto creado correctamente.');
          // Podrías navegar al nuevo producto o a la lista
          // navigation.replace('ProductDetail', { productId: createResult.product_id?.toString() });
          navigation.goBack(); 
        } else {
          Alert.alert('Error', createResult.message || 'No se pudo crear el producto.');
        }
      },
      onError: (error) => {
        Alert.alert('Error', `No se pudo crear el producto: ${error.message}`);
      },
      // Opcional: Refrescar la lista de productos si es necesario
      // refetchQueries: [{ query: GET_PRODUCTS_BY_CATEGORY, variables: { categoryName: 'All' } }], // O la categoría relevante
    }
  );

  // Efecto para rellenar el formulario cuando los datos del producto se cargan (en modo edición)
  useEffect(() => {
    if (isEditMode && data?.productById) {
      const product = data.productById;
      setFormData({
        name: product.name,
        list_price: product.list_price.toString(),
        image_1920: product.image_1920, 
      });
      // Cambiar el título de la pantalla en modo edición
      navigation.setOptions({ title: 'Editar Producto' });
    } else if (!isEditMode) {
      // Asegurar que el formulario esté vacío para el modo crear y establecer título
      setFormData({ name: '', list_price: '', image_1920: null });
      navigation.setOptions({ title: 'Crear Nuevo Producto' });
    }
  }, [data, isEditMode, navigation]);

  const handleOpenCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permiso denegado', 'Necesitas dar permiso a la cámara para tomar una foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true, 
    });
    if (!result.canceled && result.assets && result.assets[0].base64) {
      setFormData(prev => ({ ...prev, image_1920: result.assets[0].base64! }));
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field in errors) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es obligatorio.';
    const price = parseFloat(formData.list_price);
    if (isNaN(price) || price <= 0) newErrors.list_price = 'El precio debe ser un número positivo.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveChanges = () => {
    if (!validateForm()) {
      Alert.alert('Atención', 'Por favor, corrige los errores en el formulario.');
      return;
    }

    if (isEditMode) {
      const numericProductId = parseInt(productId!, 10);
      if (isNaN(numericProductId)) {
        Alert.alert('Error', 'ID de producto inválido para actualizar.');
        return;
      }
      updateProductMutation({
        variables: {
          id: numericProductId,
          input: {
            name: formData.name,
            list_price: parseFloat(formData.list_price),
            image_1920: formData.image_1920,
          }
        }
      });
    } else { // Modo Crear
      createProductMutation({
        variables: {
          input: {
            name: formData.name,
            list_price: parseFloat(formData.list_price),
            image_1920: formData.image_1920,
          }
        }
      });
    }
  };

  const isLoading = queryLoading || updating || creating;

  if (queryLoading && isEditMode) { // Mostrar carga solo si es modo edición y está cargando datos iniciales
    return <View style={styles.center}><ActivityIndicator size="large" color="#0A2342" /></View>;
  }
  if (queryError && isEditMode) {
    return <View style={styles.center}><Text style={styles.errorText}>Error al cargar: {queryError.message}</Text></View>;
  }
  // No mostrar "No se encontraron datos" inmediatamente en modo crear
  if (isEditMode && !queryLoading && !data?.productById) {
     return <View style={styles.center}><Text>No se encontraron datos del producto.</Text></View>;
  }

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
            <Icon name="camera-plus-outline" size={50} color="#A0A0A0" />
            <Text style={styles.imagePlaceholderText}>Añadir imagen</Text>
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
        style={[styles.saveButton, isLoading && styles.buttonDisabled]} 
        onPress={handleSaveChanges}
        disabled={isLoading}
      >
        {isLoading 
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.saveButtonText}>{isEditMode ? 'Guardar Cambios' : 'Crear Producto'}</Text>
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
    backgroundColor: '#E0E0E0', 
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
    backgroundColor: 'rgba(0,0,0,0.6)', 
    padding: 12,
    borderRadius: 30, 
    elevation: 5, 
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10, 
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242', 
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BDBDBD', 
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10, 
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#E53935', 
    borderWidth: 1.5, 
  },
  errorText: { 
    color: '#D32F2F',
    fontSize: 16,
    textAlign: 'center',
  },
  errorTextValidation: { 
    color: '#D32F2F',
    fontSize: 13,
    marginTop: 5,
    marginLeft: 2,
  },
  saveButton: {
    backgroundColor: '#0A2342', 
    marginHorizontal: 20,
    marginTop: 10, 
    marginBottom: 30, 
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#90A4AE', 
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17, 
    fontWeight: '600', 
  },
});

export default ProductDetailScreen;
