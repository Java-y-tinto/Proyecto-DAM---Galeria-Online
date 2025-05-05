import jwt from 'jsonwebtoken';
import OdooModule from '@fernandoslim/odoo-jsonrpc';
import dotenv from 'dotenv';
const OdooJSONRpc = OdooModule.default || OdooModule;
import { odooClient } from '../instances/odooClientInstance.js';
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
export const generateToken = async (payload) => {
    const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '2 days',
    });
    return { user: { uid: payload.uid, email: payload.email }, token };
};
export const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};
export const authenticateUser = async (email, password) => {
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
    //return odoo;
    return { uid, email, token: (await generateToken({ uid, email })).token };
};
export const registerUser = async ({ name, email, passwd }) => {
    try {
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
        if (!userId)
            throw new Error('No se pudo crear el usuario');
        const token = await generateToken({ uid: userId, email });
        return { token };
    }
    catch (error) {
        console.error('ERROR al conectar/autenticar con Odoo:', error);
    }
};
