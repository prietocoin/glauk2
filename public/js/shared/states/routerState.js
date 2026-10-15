/**
 * @file routerState.js
 * @description Estado de rutas y navegación de la interfaz.
 */

export function createRouterState() {
  return {
    vistaActiva: 'comprobante',
    vistaDashboardSubmenu: 'balance',
    loteSeleccionadoInspector: ''
  };
}
