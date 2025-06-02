import {jwtDecode} from "jwt-decode";

export const isTokenExpired = (token: string): boolean =>{
    try {
        // Decodifico el token para acceder al contenido
        const decodedToken = jwtDecode(token);
        // Compruebo si la fecha de expiración es menor a la fecha actual
       if (typeof decodedToken.exp === 'undefined'){
        // Asumo que esta caducado si no hay fecha de expiración
        return true;
       }

       // Obtenemos la fecha actual en segundos
       const currentTime = Math.floor(Date.now() / 1000);

       // Comparamos am,bas fechas
       return decodedToken.exp < currentTime;
    } catch (error) {
        console.error("Error al decodificar token", error)
        return true;
    }
}