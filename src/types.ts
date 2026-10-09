import { es } from 'date-fns/locale';

export interface Tramite {
  id?: number;
  distrito: string;
  td_no: string;
  exe_nro?: string;
  tipo_tramite: string;
  TD_fecha_ingr: string;
  TD_fecha_autorizacion: string;
  fechaIngreso: Date | null;
  fechaAutorizacion: Date | null;
  diasRespuesta: number | null;
}

export interface FilterState {
  years: string[];
  months: string[];
  tipos: string[];
}

export interface KPIStats {
  total: number;
  avgResponse: string;
}

export interface EvolutionPoint {
  key: string;
  name: string;
  cantidad: number;
  promedio: number;
  rawDate: Date;
}

export interface DistrictPoint {
  name: string;
  value: number;
}

export const MONTHS = [
  { value: '0', label: 'Enero' },
  { value: '1', label: 'Febrero' },
  { value: '2', label: 'Marzo' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Mayo' },
  { value: '5', label: 'Junio' },
  { value: '6', label: 'Julio' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Septiembre' },
  { value: '9', label: 'Octubre' },
  { value: '10', label: 'Noviembre' },
  { value: '11', label: 'Diciembre' },
];

export const DATE_LOCALE = es;
