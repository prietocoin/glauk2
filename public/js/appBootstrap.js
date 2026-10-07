/**
 * @file appBootstrap.js
 * @description Bootstrapper estándar de Alpine.js para servidor EJS.
 */

// 1. CONSTANTES
import { LISTA_MONEDAS_ACTIVAS, obtenerInfoMonedasMaestra } from './shared/constants/listaMonedasActivas.js';

// 2. UTILS
import { calcularTasaEnVivo, obtenerClaseTalla } from './shared/utils/calculoTasaEnVivo.js';

// 3. SERVICES (Rutas unificadas hacia shared/services/)
import { obtenerDirectorioNormalizado } from './shared/services/directorioService.js';
import { alternarEstadoSocioWA } from './shared/services/socioEstadoService.js';
import { alternarHerenciaSocio } from './shared/services/socioHerenciaService.js';
import { obtenerTasasVigentes } from './shared/services/tasasMercadoService.js';
import { despacharTasaIndividual } from './shared/services/despachoTasaIndividualService.js';
import { capturarBorradorHoo } from './shared/services/hooApiService.js';
import { publicarBorradorTasa, reenviarLoteCompleto } from './shared/services/publicacionTasasService.js';
import { prepararEdicionSocio, guardarConfiguracionSocio } from './shared/services/socioConfigModalService.js';
import { obtenerComprobantes, prepararEdicionComprobante, guardarCambiosComprobante, eliminarComprobantePorHash } from './shared/services/comprobantesService.js';
import { solicitarRelecturaIA } from './shared/services/comprobantesIaService.js';
import { calcularMovimientoFiltradoTotal, calcularSociosPendientesConsolidado } from './shared/services/consolidadoSaldosService.js';

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
