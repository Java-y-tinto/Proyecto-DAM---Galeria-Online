import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Dimensions,
    TouchableOpacity,
    Platform,
    TextInput,
    StatusBar as RNStatusBar, // Renombrar para evitar conflicto
} from 'react-native';
import { useLazyQuery, useQuery } from '@apollo/client';
import RNPickerSelect from 'react-native-picker-select';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Importaciones locales
import ProductCard from '../components/ProductCard';
// Asumiendo que tienes un archivo graphql/operations.ts o similar
// y que CATEGORIES está definido ahí o importado correctamente.
import { GET_PRODUCTS_BY_CATEGORY, CATEGORIES, SEARCH_PRODUCTS, Product as ProductType } from '../graphql/functions'; // Renombré Product a ProductType para evitar conflicto

import { RootStackParamsList } from '../types/navigation.types';
import { StackScreenProps } from '@react-navigation/stack';

const { width } = Dimensions.get('window');

// Hook que evita llamar a la API con cada caracter que se escribe
function useDebounce(value: string, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

type HomeScreenProps = StackScreenProps<RootStackParamsList, 'Home'>;

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
    const initialCategoryValue = CATEGORIES.length > 0 ? CATEGORIES[0].value : 'All';
    const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryValue);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    // Query para productos por categoría
    const { 
        loading: categoryLoading, 
        error: categoryError, 
        data: categoryData, 
        refetch: refetchCategory 
    } = useQuery<{ productsByCategory: ProductType[] }>(
        GET_PRODUCTS_BY_CATEGORY,
        {
            variables: { categoryName: selectedCategory },
            skip: !selectedCategory || !!debouncedSearchQuery.trim(), // No hacer si hay búsqueda o no hay categoría
            fetchPolicy: 'cache-and-network',
        }
    );

    // Lazy Query para búsqueda de productos
    const [
        executeSearch,
        { loading: searchLoading, error: searchError, data: searchData, refetch: refetchSearch }
    ] = useLazyQuery<{ searchProducts: ProductType[] }>(SEARCH_PRODUCTS, {
        fetchPolicy: 'cache-and-network',
       
    });

    // Efecto para ejecutar la búsqueda
    useEffect(() => {
        if (debouncedSearchQuery.trim()) {
            console.log(`Executing search for: "${debouncedSearchQuery.trim()}"`);
            executeSearch({ variables: { searchTerm: debouncedSearchQuery.trim() } });
        }
    }, [debouncedSearchQuery, executeSearch]);
    


    const productsToDisplay = debouncedSearchQuery.trim() 
        ? searchData?.searchProducts || [] 
        : categoryData?.productsByCategory || [];

    const isLoading = categoryLoading || searchLoading;
    // CORRECCIÓN 3: Considerar ambos errores
    const currentError = debouncedSearchQuery.trim() ? searchError : categoryError;

    const handleProductPress = (product: ProductType) => {
      navigation.navigate('ProductDetail', { productId: product.id });
    };

    const handleClearSearch = () => {
        setSearchQuery('');
    };
    
    const handleRefetch = () => {
        if (debouncedSearchQuery.trim() && refetchSearch) {
            refetchSearch({ searchTerm: debouncedSearchQuery.trim() });
        } else if (refetchCategory) {
            refetchCategory({ categoryName: selectedCategory });
        }
    };

    // Navegacion a pagina de crear producto nuevo
    const handleAddNewProduct = () => {
    navigation.navigate('ProductDetail',{}); // No se pasa productId para entrar a modo creacion
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <Text style={styles.screenTitle}>Productos</Text>
            <View style={styles.searchBarContainer}>
                <Icon name="magnify" size={22} color="#A0A0A0" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar productos..."
                    placeholderTextColor="#A0A0A0"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType='search'
                    clearButtonMode='while-editing' // Solo iOS
                />
                {searchQuery.length > 0 && ( // Mostrar botón de limpiar para ambas plataformas si hay texto
                     <TouchableOpacity onPress={handleClearSearch} style={styles.clearSearchIconContainer}>
                        <Icon name="close-circle" size={20} color="#A0A0A0" />
                    </TouchableOpacity>
                )}
            </View>
            <RNPickerSelect
                onValueChange={(value: string | null) => { // El tipo de value puede ser string o null
                    if (value !== null) {
                        setSelectedCategory(value);
                        setSearchQuery(''); // Limpiar búsqueda al cambiar categoría
                    }
                }}
                items={CATEGORIES}
                style={pickerSelectStyles}
                value={selectedCategory}
                placeholder={{ label: "Filtrar por categoría...", value: null }}
                useNativeAndroidPickerStyle={false}
                Icon={() => <Icon name="menu-down" size={30} color="#FFFFFF" style={styles.pickerIconStyle} />}
            />
        </View>
    );

    if (isLoading && !productsToDisplay.length) { // Mostrar solo si no hay datos previos
        return (
            <View style={[styles.container, styles.centerContent]}>
                <RNStatusBar barStyle="light-content" backgroundColor="#0A2342" translucent={false} />
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={{color: '#FFF', marginTop: 10}}>Cargando...</Text>
            </View>
        );
    }

    if (currentError) {
        console.error("Error al cargar productos:", JSON.stringify(currentError, null, 2));
        return (
            <View style={[styles.container, styles.centerContent]}>
                <RNStatusBar barStyle="light-content" backgroundColor="#0A2342" translucent={false} />
                <Text style={styles.errorText}>¡Ups! Algo salió mal.</Text>
                <Text style={styles.errorDetail}>{currentError.message}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleRefetch}>
                    <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <RNStatusBar barStyle="light-content" backgroundColor="#0A2342" translucent={false} />
            <FlatList
                data={productsToDisplay} // Usar los productos correctos
                renderItem={({ item }) => (
                    <ProductCard product={item} onPress={() => handleProductPress(item)} />
                )}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                contentContainerStyle={styles.listContentContainer}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.centerContent}>
                            <Text style={styles.emptyText}>
                                {debouncedSearchQuery.trim() 
                                    ? `No hay resultados para "${debouncedSearchQuery.trim()}"`
                                    : "No hay productos en esta categoría."
                                }
                            </Text>
                            {debouncedSearchQuery.trim() && <Text style={styles.emptyTextSubtitle}>(Intenta con otra búsqueda)</Text>}
                            {!debouncedSearchQuery.trim() && <Text style={styles.emptyTextSubtitle}>(Prueba seleccionando otra categoría)</Text>}
                        </View>
                    ) : null
                }
            />
            {/* Barra de navegación inferior */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navButton}><Icon name="home-outline" size={28} color="#FFFFFF" style={styles.activeNavIcon} /></TouchableOpacity>
                <TouchableOpacity style={styles.navButton}><Icon name="plus-circle-outline" size={28} color="#A9BCDB" onPress={handleAddNewProduct} /></TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A2342',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#0A2342', 
    },
    headerContainer: {
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 20) + 5 : 20,
        paddingBottom: 10,
        backgroundColor: '#0A2342',
        zIndex: 1, // Para que el picker no se solape mal
    },
    screenTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 15,
        textAlign: 'center',
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A375A',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 48, // Altura consistente
        marginBottom: 15,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#FFFFFF',
        height: '100%', // Para que ocupe toda la altura del contenedor
    },
    clearSearchIconContainer: {
        padding: 5, // Área táctil más grande
    },
    pickerIconStyle: { // Estilo para el icono del picker
        // RNPickerSelect usa iconContainer para posicionar, no este directamente para el estilo del icono
    },
    listContentContainer: {
        paddingHorizontal: 10,
        paddingBottom: 80, 
    },
    errorText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FF7675',
        textAlign: 'center',
        marginBottom: 8,
    },
    errorDetail: {
        fontSize: 14,
        color: '#FFC0CB',
        textAlign: 'center',
        marginBottom: 25,
    },
    retryButton: {
        backgroundColor: '#A9BCDB',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#0A2342',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyText: {
        fontSize: 17,
        color: '#B0BEC5',
        marginTop: 30, // Menos margen si está dentro de centerContent
        textAlign: 'center',
    },
    emptyTextSubtitle: {
        fontSize: 14,
        color: '#78909C',
        marginTop: 8,
        textAlign: 'center',
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        height: Platform.OS === 'ios' ? 80 : 70, // Más altura en iOS para el "home indicator"
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        paddingBottom: Platform.OS === 'ios' ? 15 : 0, // SafeArea para iPhone X y posteriores
    },
    navButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%', // Para que toda la altura sea táctil
    },
    activeNavIcon: {
        color: '#0A2342',
    },
});

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: 16,
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#3E5F8A',
        borderRadius: 8,
        color: '#FFFFFF',
        paddingRight: 35, 
        backgroundColor: '#1A375A',
        marginBottom: 15,
        height: 48, // Altura consistente
    },
    inputAndroid: {
        fontSize: 16,
        paddingHorizontal: 15,
        paddingVertical: 10, // Android maneja la altura un poco diferente
        borderWidth: 1,
        borderColor: '#3E5F8A',
        borderRadius: 8,
        color: '#FFFFFF',
        paddingRight: 35,
        backgroundColor: '#1A375A',
        marginBottom: 15,
        height: 48, // Altura consistente
    },
    iconContainer: {
        top: Platform.OS === 'ios' ? 12 : 13, // Ajustar para centrado vertical
        right: 12,
    },
    placeholder: {
        color: '#9DB2BF',
    },
});

export default HomeScreen;
