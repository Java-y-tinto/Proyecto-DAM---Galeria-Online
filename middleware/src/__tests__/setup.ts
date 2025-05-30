import { beforeAll } from 'vitest';
import dotenv from 'dotenv';

// Configurar variables de entorno para testing
beforeAll(() => {
    // Cargar variables de entorno específicas para testing
    process.env.NODE_ENV = 'test';
    process.env.CI = process.env.CI || 'false';
    
    // Configuración de Odoo para CI/testing
    if (process.env.CI) {
        console.log('🧪 Configurando entorno de CI...');
        
        // Variables para CI (GitHub Actions)
        process.env.ODOO_BASE_URL = process.env.ODOO_BASE_URL || 'http://localhost';
        process.env.ODOO_PORT = process.env.ODOO_PORT || '8069';
        process.env.ODOO_DB = process.env.ODOO_DB || 'postgres';
        process.env.ODOO_USERNAME = process.env.ODOO_USERNAME || 'admin';
        process.env.ODOO_PASSWORD = process.env.ODOO_PASSWORD || 'admin';
        
    } else {
        console.log('🏠 Configurando entorno local de testing...');
        
        // Cargar .env.test si existe
        dotenv.config({ path: '.env.test' });
        
        // Variables por defecto para desarrollo local
        process.env.ODOO_BASE_URL = process.env.ODOO_BASE_URL || 'http://localhost';
        process.env.ODOO_PORT = process.env.ODOO_PORT || '8069';
        process.env.ODOO_DB = process.env.ODOO_DB || 'odoo_test';
        process.env.ODOO_USERNAME = process.env.ODOO_USERNAME || 'admin';
        process.env.ODOO_PASSWORD = process.env.ODOO_PASSWORD || 'admin';
    }
    
    // JWT configuración
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';
    
    // Log de configuración (sin mostrar credenciales sensibles)
    console.log('🔧 Configuración de testing:');
    console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   - CI: ${process.env.CI}`);
    console.log(`   - ODOO_BASE_URL: ${process.env.ODOO_BASE_URL}`);
    console.log(`   - ODOO_PORT: ${process.env.ODOO_PORT}`);
    console.log(`   - ODOO_DB: ${process.env.ODOO_DB}`);
    console.log(`   - ODOO_USERNAME: ${process.env.ODOO_USERNAME}`);
    console.log(`   - JWT_SECRET está configurado: ${!!process.env.JWT_SECRET}`);
    
    // Validar configuración mínima
    const requiredVars = [
        'ODOO_BASE_URL',
        'ODOO_PORT', 
        'ODOO_DB',
        'ODOO_USERNAME',
        'JWT_SECRET'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.error('❌ Variables de entorno faltantes:', missingVars);
        throw new Error(`Variables de entorno requeridas faltantes: ${missingVars.join(', ')}`);
    }
    
    console.log('✅ Configuración de entorno de testing completada');
});