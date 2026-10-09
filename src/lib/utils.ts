import { parse, isValid, differenceInDays } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for Tailwind class merging
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculates a trimmed mean by removing X outliers from each end
 */
export const calculateTrimmedMean = (values: number[], x: number = 1): number => {
  if (values.length === 0) return 0;
  if (values.length <= 2 * x) {
    return values.reduce((acc, v) => acc + v, 0) / values.length;
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const trimmed = sorted.slice(x, sorted.length - x);
  const sum = trimmed.reduce((acc, v) => acc + v, 0);
  return sum / trimmed.length;
};

/**
 * Parses dates from various CSV string formats (d/M/yyyy, yyyy-MM-dd, serial numbers, etc.)
 */
export const parseCSVDate = (dateStr: any): Date | null => {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s) return null;

  // Handle Excel serial date numbers (e.g. 45323)
  if (/^\d{5}$/.test(s)) {
    const serial = parseInt(s, 10);
    const utcDays = serial - 25569;
    const date = new Date(utcDays * 86400 * 1000);
    if (isValid(date)) return date;
  }

  // Strip time component if present
  const cleanStr = s.split(' ')[0].split('T')[0];

  const candidateFormats = [
    'd/M/yyyy',
    'd/M/yy',
    'yyyy-MM-dd',
    'dd-MM-yyyy',
    'd-M-yyyy',
    'yyyy/M/d',
    'd.M.yyyy'
  ];

  for (const fmt of candidateFormats) {
    const d = parse(cleanStr, fmt, new Date());
    if (isValid(d)) {
      if (d.getFullYear() < 100) {
        d.setFullYear(2000 + d.getFullYear());
      }
      return d;
    }
  }

  // Fallback to native Date parser
  const native = new Date(s);
  if (isValid(native) && !isNaN(native.getTime())) {
    if (native.getFullYear() < 100) {
      native.setFullYear(2000 + native.getFullYear());
    }
    return native;
  }

  return null;
};

/**
 * Formats a response time for display
 */
export const formatResponseTime = (days: number | null): string => {
  if (days === null) return '-';
  return `${days} d`;
};

/**
 * Normalizes tipo_tramite values
 * Replaces "TRAMITE DIGITAL" with "TDO"
 * Replaces "TD+PROYECTO" with "TDO+PROYECTO"
 * Supports "TDO+TDI", "FACTIBILIDAD", etc.
 */
export const normalizeTipoTramite = (rawTipo: any): string => {
  if (!rawTipo) return '';
  const s = String(rawTipo).trim();
  const upper = s.toUpperCase();
  if (upper === 'TRAMITE DIGITAL' || upper === 'TRÁMITE DIGITAL') {
    return 'TDO';
  }
  if (upper === 'TD+PROYECTO' || upper === 'TD + PROYECTO') {
    return 'TDO+PROYECTO';
  }
  if (upper === 'TDO+TDI' || upper === 'TDO + TDI') {
    return 'TDO+TDI';
  }
  if (upper === 'FACTIBILIDAD') {
    return 'FACTIBILIDAD';
  }
  return s;
};
