/**
 * @file server.js
 * @description Entrypoint principal con SSR (EJS) y enrutamiento modular para Glauk2.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// 1. CARGA SEGURA DE WORKERS (BULLMQ)
try {
  require('./src/workers/tasas.worker');
  console.log('[Workers ⚙️] tasas.worker iniciado.');
} catch (e) {
  console.warn('[Workers ⚠️] No se pudo cargar tasas.worker:', e.message);
}

try {
  require('./src/workers/liquidacion.worker');
  console.log('[Workers ⚙️] liquidacion.worker iniciado.');
} catch (e) {
  console.warn('[Workers ⚠️] No se pudo cargar liquidacion.worker:', e.message);
}

// 2. ENRUTADORES MODULARES ATÓMICOS
const tasasRoutes = require('./src/modules/tasas/routes/tasasRoutes');
const directorioRoutes = require('./src/modules/directorio/routes/directorioRoutes');
const comprobantesRoutes = require('./src/modules/comprobantes/routes/comprobantesRoutes');
const reportesRoutes = require('./src/modules/reportes/routes/reportesRoutes');
const adminRoutes = require('./src/modules/admin/routes/adminRoutes');

const app = express();

// 3. CONFIGURACIÓN DEL MOTOR DE VISTAS (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 4. MIDDLEWARES GLOBALES Y RECURSOS ESTÁTICOS
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 5. MONTAJE DE RUTAS API
app.use('/api/tasas', tasasRoutes);
app.use('/api/directorio', directorioRoutes);
app.use('/api/socios', directorioRoutes); // Alias retrocompatible
app.use('/api/comprobantes', comprobantesRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/admin', adminRoutes);

// HEALTH CHECK
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'Glauk2 Engine', timestamp: new Date() });
});

// 6. WILDCARD SSR (Renderiza el index.ejs)
app.get('*', (req, res) => {
  res.render('index');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Glauk2 Engine 🦅] Motor activo en puerto ${PORT}`);
});
