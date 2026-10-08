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
    // Composición modular del estado
    ...createRouterState(),
    ...createTasasState(),
    ...createDirectorioState(),
    ...comprobantesState(),

    // Inicialización global del ciclo de vida
    async init() {
      await Promise.all([
        this.cargarTasasMercado(),
        this.cargarDirectorio(),
        this.cargarComprobantes()
      ]);
    }
  }));
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-abrir-modal');
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  try {
    const rawData = btn.getAttribute('data-item');
    if (!rawData) return;

    const item = JSON.parse(rawData);
    
    // Obtenemos la instancia raíz de Alpine en el body
    const appEl = document.querySelector('[x-data]');
    if (appEl && window.Alpine) {
      const state = Alpine.$data(appEl);
      if (typeof state.abrirModalEdicion === 'function') {
        state.abrirModalEdicion(item);
      } else {
        state.itemEdicion = item;
        state.modalAbierto = true;
      }
    }
  } catch (err) {
    console.error('Error al capturar clic de apertura de modal:', err);
  }
});

if (window.Alpine) {
  registrarApp();
} else {
  document.addEventListener('alpine:init', registrarApp);
}
