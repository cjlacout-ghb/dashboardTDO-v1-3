import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Info } from 'lucide-react';
import { Tramite } from '../types';
import { formatResponseTime } from '../lib/utils';

interface DataTableProps {
  data: Tramite[];
  sortConfig: { key: keyof Tramite; direction: 'asc' | 'desc' } | null;
  onSort: (key: keyof Tramite) => void;
}

const SortIcon = ({ columnKey, currentSort }: { columnKey: string, currentSort: { key: string, direction: 'asc' | 'desc' } | null }) => {
  if (!currentSort || currentSort.key !== columnKey) {
    return <ChevronsUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
  }
  return currentSort.direction === 'asc' 
    ? <ChevronUp className="w-3 h-3 text-[#1a56db]" /> 
    : <ChevronDown className="w-3 h-3 text-[#1a56db]" />;
};

export const DataTable: React.FC<DataTableProps> = ({ data, sortConfig, onSort }) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-8 border-bottom border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Registro de Trámites autorizados</h3>
          <p className="text-xs text-[#48484a] font-medium">durante el período seleccionado</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
          <Info className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">{data.length} registros</span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-y border-slate-100">
              {[
                { label: 'Tipo', key: 'tipo_tramite' },
                { label: 'TDO Nº', key: 'td_no' },
                { label: 'TDI Nº', key: 'exe_nro' },
                { label: 'TDO Ingreso', key: 'TD_fecha_ingr' },
                { label: 'TDO Autorización', key: 'TD_fecha_autorizacion' },
                { label: 'Días', key: 'diasRespuesta' },
                { label: 'Distrito', key: 'distrito' }
              ].map((col) => (
                <th 
                  key={col.key}
                  onClick={() => onSort(col.key as keyof Tramite)}
                  className="px-8 py-4 text-[10px] font-bold text-[#48484a] uppercase tracking-widest cursor-pointer group hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    <SortIcon columnKey={col.key} currentSort={sortConfig} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((t, idx) => (
              <tr key={t.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-4">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-tight border ${
                    t.tipo_tramite === 'FACTIBILIDAD' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    (t.tipo_tramite === 'TDO' || t.tipo_tramite === 'TRAMITE DIGITAL') ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    (t.tipo_tramite === 'TDO+PROYECTO' || t.tipo_tramite === 'TD+PROYECTO') ? 'bg-purple-50 text-purple-600 border-purple-100' :
                    t.tipo_tramite === 'TDO+TDI' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                    t.tipo_tramite === 'PROYECTO' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {t.tipo_tramite}
                  </span>
                </td>
                <td className="px-8 py-4 text-xs font-bold text-slate-700">{t.td_no}</td>
                <td className="px-8 py-4 text-xs font-medium text-slate-700">{t.exe_nro || ''}</td>
                <td className="px-8 py-4 text-xs text-[#48484a]">{t.TD_fecha_ingr}</td>
                <td className="px-8 py-4 text-xs text-[#48484a] font-medium">{t.TD_fecha_autorizacion}</td>
                <td className="px-8 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      (t.diasRespuesta || 0) <= 5 ? 'bg-emerald-400' : 
                      (t.diasRespuesta || 0) <= 15 ? 'bg-amber-400' : 'bg-rose-400'
                    }`} />
                    <span className="text-xs font-bold text-slate-700">
                      {formatResponseTime(t.diasRespuesta)}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-4 text-xs font-medium text-[#48484a]">{t.distrito}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
