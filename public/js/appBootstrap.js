/**
 * @file appBootstrap.js
 * @description Bootstrapper estándar de Alpine.js con rutas modulares unificadas para Glauk2.
 */

// 1. CONSTANTES COMPARTIDAS
import { LISTA_MONEDAS_ACTIVAS, obtenerInfoMonedasMaestra } from './shared/constants/listaMonedasActivas.js';

// 2. MÓDULO: TASAS (Utils & Services)
import { calcularTasaEnVivo, obtenerClaseTalla } from './modules/tasas/utils/calculoTasaEnVivo.js';
import { obtenerTasasVigentes } from './modules/tasas/services/tasasMercadoService.js';
import { despacharTasaIndividual } from './modules/tasas/services/despachoTasaIndividualService.js';
import { capturarBorradorHoo } from './modules/tasas/services/hooApiService.js';
import { publicarBorradorTasa, reenviarLoteCompleto } from './modules/tasas/services/publicacionTasasService.js';

// 3. MÓDULO: DIRECTORIO (Services)
import { obtenerDirectorioNormalizado } from './modules/directorio/services/directorioService.js';
import { alternarEstadoSocioWA } from './modules/directorio/services/socioEstadoService.js';
import { alternarHerenciaSocio } from './modules/directorio/services/socioHerenciaService.js';
import { prepararEdicionSocio, guardarConfiguracionSocio } from './modules/directorio/services/socioConfigModalService.js';

// 4. MÓDULO: COMPROBANTES (Consolidado en API Service, Calculator y Filter Utils)
import { 
  obtenerComprobantes, 
  prepararEdicionComprobante, 
  guardarCambiosComprobante, 
  eliminarComprobantePorHash,
  solicitarRelecturaIA 
} from './modules/comprobantes/services/comprobantesApiService.js';
import { calcularSociosPendientesConsolidado } from './modules/comprobantes/services/saldosCalculatorService.js';
import { calcularMovimientoFiltradoTotal } from './modules/comprobantes/utils/saldosFilterUtils.js';

function registrarApp() {
  Alpine.data('app', () => ({
    vistaActiva: 'dashboard',
    vistaDashboardSubmenu: 'balance',
    loteSeleccionadoInspector: '',
    comprobantes: [],
    directorio: [],
    socios: [],
    filtroSocio: '',
    filtroFechaInicio: '',
    filtroFechaFin: '',
    listaMonedasActivas: LISTA_MONEDAS_ACTIVAS,
    modoPruebaActivo: false,
    loteActivo: '',
    tasasProduccion: {},
    borradorCapturado: {},
    historialTasas: [],
    socioConfigEdit: null,
    modalConfigSocioAbierto: false,
    modalAbierto: false,
    itemEdicion: null,

    get infoMonedasMaestra() { return obtenerInfoMonedasMaestra(); },

    async init() {
      await Promise.all([
        this.cargarTasasMercado(),
        this.cargarDirectorio(),
        this.cargarComprobantes()
      ]);
    },

    async cargarDirectorio() { this.directorio = await obtenerDirectorioNormalizado() || []; },
    async toggleEstadoSocio(socio) { await alternarEstadoSocioWA(socio); await this.cargarDirectorio(); },
    async toggleHerenciaSocio(socio) { await alternarHerenciaSocio(socio); await this.cargarDirectorio(); },
    async cargarTasasMercado() { const t = await obtenerTasasVigentes(); this.loteActivo = t?.id_tasa || ''; this.tasasProduccion = t?.tasas || {}; },
    async conectarHooAPI() { const b = await capturarBorradorHoo(); if (b) this.borradorCapturado = b; },
    async publicarTasaOficial() { const id = await publicarBorradorTasa(this.borradorCapturado, this.modoPruebaActivo); if (id) this.loteActivo = id; },
    async reenviarTasaActual() { await reenviarLoteCompleto(this.loteActivo, this.modoPruebaActivo); },
    async enviarTasaIndividual(socio, fPrueba = null) { await despacharTasaIndividual(this.loteActivo, socio, fPrueba, this.modoPruebaActivo); },
    calcularTasaEnVivo(code, pct, esResta) { return calcularTasaEnVivo(this.tasasProduccion[code], pct, esResta); },
    abrirConfigSocio(socio) { this.socioConfigEdit = prepararEdicionSocio(socio, this.infoMonedasMaestra); this.modalConfigSocioAbierto = true; },
    async guardarConfigSocioModal() { await guardarConfiguracionSocio(this.socioConfigEdit); this.modalConfigSocioAbierto = false; await this.cargarDirectorio(); },
    getTallaClass(socio) { return obtenerClaseTalla(socio); },
    async cargarComprobantes() { this.comprobantes = await obtenerComprobantes({ socio: this.filtroSocio }) || []; },
    abrirModal(item) { this.itemEdicion = prepararEdicionComprobante(item, this.loteActivo); this.modalAbierto = true; },
    async guardarCambios() { if (await guardarCambiosComprobante(this.itemEdicion?.hash_largo, this.itemEdicion, this.loteActivo)) { this.modalAbierto = false; await this.cargarComprobantes(); } },
    async releerIAModal() { if (await solicitarRelecturaIA(this.itemEdicion?.hash_largo)) { this.modalAbierto = false; await this.cargarComprobantes(); } },
    async eliminarComprobante(hash) { if (await eliminarComprobantePorHash(hash)) { this.modalAbierto = false; await this.cargarComprobantes(); } },
    get movimientoFiltradoTotal() { return calcularMovimientoFiltradoTotal(this.comprobantes, this.filtroSocio); },
    get sociosPendientesConsolidado() { return calcularSociosPendientesConsolidado(this.directorio, this.comprobantes, { fechaInicio: this.filtroFechaInicio, fechaFin: this.filtroFechaFin }); }
  }));
}

if (window.Alpine) {
  registrarApp();
} else {
  document.addEventListener('alpine:init', registrarApp);
}
