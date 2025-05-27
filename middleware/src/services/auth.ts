import jwt from 'jsonwebtoken';
import OdooModule from '@fernandoslim/odoo-jsonrpc';
import dotenv from 'dotenv';
const OdooJSONRpc = (OdooModule as any).default || OdooModule;
import { odooClient } from '../instances/odooClientInstance.js';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

console.log('🔑 [Auth Service] JWT_SECRET cargado:', JWT_SECRET ? 'SÍ' : 'NO');
console.log('🔑 [Auth Service] JWT_SECRET length:', JWT_SECRET ? JWT_SECRET.length : 0);

export const generateToken = async (payload: { uid: number; email: string }) => {
  console.log('🏭 [Auth Service] Generando token para:', payload);
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '2 days',
  });
  console.log('✅ [Auth Service] Token generado:', token.substring(0, 20) + '...');
  return {user: {uid: payload.uid, email: payload.email}, token};
};

export const verifyToken = (token: string) => {
  console.log('🔍 [Auth Service] Verificando token...');
  console.log('🔍 [Auth Service] Token recibido:', token.substring(0, 20) + '...');
  console.log('🔍 [Auth Service] JWT_SECRET disponible:', JWT_SECRET ? 'SÍ' : 'NO');
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ [Auth Service] Token decodificado correctamente:', decoded);
    return decoded as { uid: number; email: string };
  } catch (error) {
    console.error('❌ [Auth Service] Error verificando token:', error.message);
    console.error('❌ [Auth Service] Tipo de error:', error.name);
    if (error.name === 'TokenExpiredError') {
      console.error('⏰ [Auth Service] Token expirado');
    } else if (error.name === 'JsonWebTokenError') {
      console.error('🔧 [Auth Service] Token malformado o secreto incorrecto');
    }
    throw error;
  }
};

export const authenticateUser = async (email: string, password: string) => {
  try {
    console.log('🔐 [Auth Service] Autenticando usuario:', email);
    
    const odooConfig = {
      baseUrl: process.env.ODOO_BASE_URL,
      port: Number(process.env.ODOO_PORT),
      db: process.env.ODOO_DB,
      username: email,
      password: password,
    }

    const odoo = new OdooJSONRpc(odooConfig);
    await odoo.connect();

    const uid = await odoo.authResponse.uid;
    if (!uid) return null;
    
    console.log('✅ [Auth Service] Usuario autenticado con Odoo, UID:', uid);
    const tokenData = await generateToken({uid, email});
    
    return { 
      uid, 
      email, 
      token: tokenData.token 
    };
  } catch (error) {
    console.error('❌ [Auth Service] Error autenticando usuario:', error);
    return null;
  }
};

export const registerUser = async ({name, email, passwd}: { name: string; email: string; passwd: string }) => {
  try {
    console.log('📝 [Auth Service] Registrando usuario:', { name, email });
    
    // Creacion de partner de Odoo
    const partnerId = await odooClient.create('res.partner', {
      name,
      email
    });

    // Creacion de usuario de odoo
    const userId = await odooClient.create('res.users', {
      name,
      login: email,
      password: passwd,
      partner_id: partnerId,
      groups_id: [[6, false, []]], // No asignar grupos para no dar acceso al backend Odoo
    });

    if (!userId) throw new Error('No se pudo crear el usuario');

    console.log('✅ [Auth Service] Usuario registrado, UID:', userId);
    const token = await generateToken({ uid: userId, email });
    return { token };
  } catch (error) {
    console.error('❌ [Auth Service] Error registrando usuario:', error);
    throw error;
  }
}