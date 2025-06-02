// Guardar navegacion para mantener el estado en toda la aplicacion
export type RootStackParamsList = {
    LoginScreen: { setToken: (token: string | null) => void };
    Home: undefined; 
    ProductDetail: { productId: string };
};
