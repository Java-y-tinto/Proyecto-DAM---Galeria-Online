import jwt from 'jsonwebtoken';
import OdooModule from '@fernandoslim/odoo-jsonrpc';
import dotenv from 'dotenv';
const OdooJSONRpc = OdooModule.default || OdooModule;
import { odooClient } from '../instances/odooClientInstance.js';
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
console.log('🔑 [Auth Service] JWT_SECRET cargado:', JWT_SECRET ? 'SÍ' : 'NO');
console.log('🔑 [Auth Service] JWT_SECRET length:', JWT_SECRET ? JWT_SECRET.length : 0);
export const generateToken = async (payload) => {
    console.log('🏭 [Auth Service] Generando token para:', payload);
    const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '2 days',
    });
    console.log('✅ [Auth Service] Token generado:', token.substring(0, 20) + '...');
    return { user: { uid: payload.uid, email: payload.email }, token };
};
export const verifyToken = (token) => {
    console.log('🔍 [Auth Service] Verificando token...');
    console.log('🔍 [Auth Service] Token recibido:', token.substring(0, 20) + '...');
    console.log('🔍 [Auth Service] JWT_SECRET disponible:', JWT_SECRET ? 'SÍ' : 'NO');
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ [Auth Service] Token decodificado correctamente:', decoded);
        return decoded;
    }
    catch (error) {
        console.error('❌ [Auth Service] Error verificando token:', error.message);
        console.error('❌ [Auth Service] Tipo de error:', error.name);
        if (error.name === 'TokenExpiredError') {
            console.error('⏰ [Auth Service] Token expirado');
        }
        else if (error.name === 'JsonWebTokenError') {
            console.error('🔧 [Auth Service] Token malformado o secreto incorrecto');
        }
        throw error;
    }
};
export const authenticateUser = async (email, password) => {
    try {
        console.log('🔐 [Auth Service] Autenticando usuario:', email);
        const odooConfig = {
            baseUrl: process.env.ODOO_BASE_URL,
            port: Number(process.env.ODOO_PORT),
            db: process.env.ODOO_DB,
            username: email,
            password: password,
        };
        const odoo = new OdooJSONRpc(odooConfig);
        await odoo.connect();
        const uid = await odoo.authResponse.uid;
        if (!uid)
            return null;
        console.log('✅ [Auth Service] Usuario autenticado con Odoo, UID:', uid);
        const tokenData = await generateToken({ uid, email });
        return {
            uid,
            email,
            token: tokenData.token
        };
    }
    catch (error) {
        console.error('❌ [Auth Service] Error autenticando usuario:', error);
        return null;
    }
};
export const registerUser = async ({ name, email, passwd }) => {
    try {
        console.log('📝 [Auth Service] Registrando usuario:', { name, email });
        // Creacion de partner de Odoo
        const partnerId = await odooClient.create('res.partner', {
            name,
            email
        });
        // Buscar el ID del grupo portal dinámicamente
        const portalGroups = await odooClient.searchRead('res.groups', [['category_id.xml_id', '=', 'base.module_category_user_type'], ['name', '=', 'Portal']], ['id']);
        let portalGroupId = null;
        if (portalGroups.length > 0) {
            portalGroupId = portalGroups[0].id;
            console.log('✅ [Auth Service] Portal Group ID encontrado:', portalGroupId);
        }
        else {
            console.warn('⚠️ [Auth Service] No se encontró el grupo Portal, creando usuario sin grupos específicos');
        }
        // Creacion de usuario de odoo
        const userData = {
            name,
            login: email,
            password: passwd,
            partner_id: partnerId,
            groups_id: [],
        };
        if (portalGroupId) {
            userData.groups_id = [[6, false, [portalGroupId]]];
        }
        const userId = await odooClient.create('res.users', userData);
        if (!userId)
            throw new Error('No se pudo crear el usuario');
        console.log('✅ [Auth Service] Usuario registrado, UID:', userId);
        // Crear registro de carrito vacio
        try {
            console.log('🛒 [Auth Service] Creando carrito inicial para el usuario...');
            const orderId = await odooClient.create('sale.order', {
                partner_id: partnerId,
                state: 'draft',
            });
            console.log('✅ [Auth Service] Carrito inicial creado con ID:', orderId);
        }
        catch (cartError) {
            console.error('⚠️ [Auth Service] Error creando carrito inicial (no crítico):', cartError);
            // No lanzar error aquí porque el usuario se ha creado correctamente
        }
        const token = await generateToken({ uid: userId, email });
        return { token };
    }
    catch (error) {
        console.error('❌ [Auth Service] Error registrando usuario:', error);
        throw error;
    }
};
