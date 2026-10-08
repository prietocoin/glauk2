/**
 * @file appBootstrap.js
 * @description Bootstrapper principal de Alpine.js para Glauk2 Engine.
 */

import { createRouterState } from './shared/states/routerState.js';
import { createTasasState } from './modules/tasas/states/tasasState.js';
import { createDirectorioState } from './modules/directorio/states/directorioState.js';
import { comprobantesState } from './modules/comprobantes/states/comprobantesState.js';

function registrarApp() {
  Alpine.data('app', () => ({
    // Vista por defecto
    vistaActiva: 'comprobantes',

    // Composición modular del estado
    ...createRouterState(),
    ...createTasasState(),
    ...createDirectorioState(),
    ...comprobantesState(),

    // Inicialización global del ciclo de vida
    async init() {
      await Promise.all([
        this.cargarTasasMercado ? this.cargarTasasMercado() : Promise.resolve(),
        this.cargarDirectorio ? this.cargarDirectorio() : Promise.resolve(),
        this.cargarComprobantes ? this.cargarComprobantes() : Promise.resolve()
      ]);
    }
  }));
}

if (window.Alpine) {
  registrarApp();
} else {
  document.addEventListener('alpine:init', registrarApp);
}
