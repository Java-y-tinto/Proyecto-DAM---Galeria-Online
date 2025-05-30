import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Configuración para tests de integración
    environment: 'node',
    testTimeout: 60000, // 60 segundos por test (Odoo puede ser lento)
    hookTimeout: 60000, // 60 segundos para hooks (setup/teardown)
    teardownTimeout: 60000,
    
    // Configuración de archivos
    include: [
      'src/**/*.{test,spec}.{js,ts}',
      'src/__tests__/**/*.{test,spec}.{js,ts}'
    ],
    exclude: [
      'dist/**',
      'node_modules/**'
    ],
    
    // Configuración para CI
    reporters: process.env.CI ? ['verbose', 'json'] : ['verbose'],
    
    // Configuración de cobertura
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'dist/**',
        'node_modules/**',
        'src/**/*.d.ts',
        '**/*.config.*',
        '**/types.ts'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    
    // Configuración global para tests
    globals: true,
    
    // Variables de entorno para tests
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-key',
      JWT_EXPIRES_IN: '2h'
    },
    
    // Configuración de setup
    setupFiles: ['src/__tests__/setup.ts'],
    
    // Ejecutar tests secuencialmente para evitar conflictos con Odoo
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    
    // Configuración de retry para CI (Odoo puede ser inestable)
    retry: process.env.CI ? 2 : 0,
    
    // Configuración de logs
    logHeapUsage: true,
    
    // No salir en el primer fallo para ver todos los errores
    bail: process.env.CI ? 5 : 0
  },
  
  // Configuración de resolución de módulos
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  }
});