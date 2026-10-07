/**
 * @file directorioState.js
 * @description Estado y acciones del directorio de socios.
 */

import { obtenerDirectorioNormalizado } from '../services/directorioService.js';
import { alternarEstadoSocioWA } from '../services/socioEstadoService.js';
import { alternarHerenciaSocio } from '../services/socioHerenciaService.js';
import { prepararEdicionSocio, guardarConfiguracionSocio } from '../services/socioConfigModalService.js';

export function createDirectorioState() {
  return {
    directorio: [],
    socios: [],
    socioConfigEdit: null,
    modalConfigSocioAbierto: false,

    async cargarDirectorio() {
      this.directorio = await obtenerDirectorioNormalizado() || [];
    },
    async toggleEstadoSocio(socio) {
      await alternarEstadoSocioWA(socio);
      await this.cargarDirectorio();
    },
    async toggleHerenciaSocio(socio) {
      await alternarHerenciaSocio(socio);
      await this.cargarDirectorio();
    },
    abrirConfigSocio(socio) {
      this.socioConfigEdit = prepararEdicionSocio(socio, this.infoMonedasMaestra);
      this.modalConfigSocioAbierto = true;
    },
    async guardarConfigSocioModal() {
      await guardarConfiguracionSocio(this.socioConfigEdit);
      this.modalConfigSocioAbierto = false;
      await this.cargarDirectorio();
    }
  };
}
