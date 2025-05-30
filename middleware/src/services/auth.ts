import jwt from 'jsonwebtoken';
import OdooModule from '@fernandoslim/odoo-jsonrpc';
import dotenv from 'dotenv';
const OdooJSONRpc = (OdooModule as any).default || OdooModule;
import { odooClient } from '../instances/odooClientInstance.js';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';




export const generateToken = async (payload: { uid: number; email: string }) => {
  
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '2 days',
  });
  
  return {user: {uid: payload.uid, email: payload.email}, token};
};

export const verifyToken = (token: string) => {
  
  
  
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    return decoded as { uid: number; email: string };
  } catch (error) {
    
    
    if (error.name === 'TokenExpiredError') {
      
    } else if (error.name === 'JsonWebTokenError') {
      
    }
    throw error;
  }
};

export const authenticateUser = async (email: string, password: string) => {
  try {
    
    
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
    
    
    const tokenData = await generateToken({uid, email});
    
    return { 
      uid, 
      email, 
      token: tokenData.token 
    };
  } catch (error) {
    
    return null;
  }
};

export const registerUser = async ({name, email, passwd}: { name: string; email: string; passwd: string }) => {
  try {
    
    
    // Creacion de partner de Odoo
    const partnerId = await odooClient.create('res.partner', {
      name,
      email
    });

// Buscar el ID del grupo portal dinámicamente
    const portalGroups = await odooClient.searchRead(
      'res.groups',
      [['category_id.xml_id', '=', 'base.module_category_user_type'], ['name', '=', 'Portal']],
      ['id']
    );

    let portalGroupId = null;
    if (portalGroups.length > 0) {
      portalGroupId = portalGroups[0].id;
      
    } else {
      
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
    if (!userId) throw new Error('No se pudo crear el usuario');

      // Crear registro de carrito vacio
       try {
      const orderId = await odooClient.create('sale.order', {
        partner_id: partnerId,
        state: 'draft',
      });
    } catch (cartError) {
      // No lanzar error aquí porque el usuario se ha creado correctamente
    }


    const token = await generateToken({ uid: userId, email });
    return { token };
  } catch (error) {
    throw error;
  }
}