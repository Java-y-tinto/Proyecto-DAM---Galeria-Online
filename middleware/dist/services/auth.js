import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import OdooJSONRpc from '@fernandoslim/odoo-jsonrpc';
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
export const generateToken = async (payload) => {
    return jwt.sign(payload, JWT_SECRET, (err, token) => {
        if (err)
            throw err;
        return token;
    });
};
export const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};
export const authenticateUser = async (email, password) => {
    const odooConfig = {
        url: process.env.ODOO_URL,
        db: process.env.ODOO_DB,
        username: process.env.ODOO_USER,
        apiKey: process.env.ODOO_API_KEY,
        port: Number(process.env.ODOO_PORT),
    };
    const odoo = new OdooJSONRpc(odooConfig);
    const uid = await odoo.authResponse.uid;
    if (!uid)
        return null;
    return { uid, email };
};
