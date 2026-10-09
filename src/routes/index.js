/**
 * @file index.js
 * @description Enrutador maestro de glauk2. Monta los módulos de forma aislada.
 */
const express = require('express');
const router = express.Router();

router.use('/tasas', require('../modules/tasas/routes/tasasRoutes'));
router.use('/directorio', require('../modules/directorio/routes/directorioRoutes'));
router.use('/reportes', require('../modules/reportes/routes/reportesRoutes'));
router.use('/comprobantes', require('../modules/comprobantes/routes/comprobantesRoutes'));

// 🟢 NUEVA API V2 DE COMPROBANTES
router.use('/v2/comprobantes', require('../modules/comprobantes/routes/apiRoutes'));

router.use('/admin', require('../modules/admin/routes/adminRoutes'));

module.exports = router;
