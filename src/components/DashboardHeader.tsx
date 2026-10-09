import React, { useState, useRef, useEffect } from 'react';
import { Filter, Calendar, Download, Lock, ChevronDown, Check, FileUp } from 'lucide-react';
import { FilterState, MONTHS } from '../types';

interface MultiSelectProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  icon: React.ReactNode;
  width?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, selected, onChange, icon, width = '190px' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const displayText = selected.length === 0 
    ? 'Todos' 
    : selected.length === 1 
      ? options.find(o => o.value === selected[0])?.label || selected[0]
      : `${selected.length} seleccionados`;

  return (
    <div className="flex flex-col gap-1.5 items-center relative" ref={containerRef}>
      <span className="text-[10px] font-bold text-[#48484a] uppercase tracking-widest">{label}</span>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-blue-400 transition-colors cursor-pointer select-none`}
        style={{ width }}
      >
        {icon}
        <span className="text-sm font-bold text-slate-700 truncate flex-1">{displayText}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-50 max-h-[250px] overflow-y-auto p-1 animate-in fade-in zoom-in duration-200">
          <div 
            onClick={() => onChange([])}
            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer group"
          >
            <span className={`text-xs font-bold ${selected.length === 0 ? 'text-blue-600' : 'text-[#48484a]'}`}>Todos</span>
            {selected.length === 0 && <Check className="w-3.5 h-3.5 text-blue-600" />}
          </div>
          <div className="h-px bg-slate-100 my-1" />
          {options.map(option => (
            <div 
              key={option.value}
              onClick={() => toggleOption(option.value)}
              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer group"
            >
              <span className={`text-xs font-medium ${selected.includes(option.value) ? 'text-blue-600 font-bold' : 'text-[#48484a]'}`}>
                {option.label}
              </span>
              {selected.includes(option.value) && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface DashboardHeaderProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  years: string[];
  onDownloadPDF: () => void;
  onOpenAdmin: () => void;
  isGeneratingPDF: boolean;
  includeTableInPDF: boolean;
  setIncludeTableInPDF: (value: boolean) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  filters,
  setFilters,
  years,
  onDownloadPDF,
  onOpenAdmin,
  isGeneratingPDF,
  includeTableInPDF,
  setIncludeTableInPDF
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 items-center">
      <div className="lg:col-span-1 space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Autorización TDOs</h1>
        <div className="pt-1">
          <p className="text-[#1a56db] text-[12px] font-bold uppercase tracking-[0.15em]">Dirección de Obras Civiles</p>
          <p className="text-[#48484a] text-[11px] font-medium uppercase tracking-[0.1em]">Municipalidad de Paraná</p>
        </div>
      </div>
      
      <div className="lg:col-span-2 flex flex-wrap items-end justify-end gap-3">
        <MultiSelect 
          label="Tipo de Trámite"
          icon={<Filter className="w-4 h-4 text-slate-400 shrink-0" />}
          options={[
            { value: 'FACTIBILIDAD', label: 'Factibilidad' },
            { value: 'TDO', label: 'TDO' },
            { value: 'TDO+PROYECTO', label: 'TDO+Proyecto' },
            { value: 'TDO+TDI', label: 'TDO+TDI' }
          ]}
          selected={filters.tipos}
          onChange={(tipos) => setFilters(prev => ({ ...prev, tipos }))}
          width="190px"
        />
        
        <MultiSelect 
          label="Año"
          icon={<Filter className="w-4 h-4 text-slate-400 shrink-0" />}
          options={years.map(y => {
            const yr = parseInt(y, 10);
            const fullYear = !isNaN(yr) && yr < 100 ? (2000 + yr).toString() : y;
            return { value: fullYear, label: fullYear };
          })}
          selected={filters.years.map(y => {
            const yr = parseInt(y, 10);
            return !isNaN(yr) && yr < 100 ? (2000 + yr).toString() : y;
          })}
          onChange={(years) => setFilters(prev => ({ ...prev, years }))}
          width="160px"
        />

        <MultiSelect 
          label="Mes"
          icon={<Calendar className="w-4 h-4 text-slate-400 shrink-0" />}
          options={MONTHS}
          selected={filters.months}
          onChange={(months) => setFilters(prev => ({ ...prev, months }))}
          width="160px"
        />

        <div className="flex flex-col gap-1.5 items-center">
          <span className="text-[10px] font-bold text-transparent uppercase tracking-widest select-none">Exportar</span>
          <div className="flex items-start gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <button 
                onClick={onDownloadPDF}
                disabled={isGeneratingPDF}
                className={`flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-1.5 h-[46px] rounded-lg font-bold text-[11px] transition-all border border-slate-200 active:scale-95 uppercase tracking-wider ${isGeneratingPDF ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <Download className={`w-3.5 h-3.5 text-slate-400 ${isGeneratingPDF ? 'animate-bounce' : ''}`} />
                <span>{isGeneratingPDF ? 'Generando...' : 'PDF'}</span>
              </button>
              
              <button
                type="button"
                onClick={() => setIncludeTableInPDF(!includeTableInPDF)}
                className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold rounded-md border transition-all select-none active:scale-95 uppercase tracking-wider ${
                  includeTableInPDF 
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-500 hover:border-slate-300'
                }`}
                title="Habilitar/Deshabilitar listado en PDF"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${includeTableInPDF ? 'bg-blue-600' : 'bg-slate-300'}`} />
                <span>Listado</span>
              </button>
            </div>
            
            <button 
              onClick={onOpenAdmin}
              className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 h-[46px] w-[46px] flex items-center justify-center bg-white shadow-sm"
              title="Acceso Administrador"
            >
              <Lock className="w-5 h-5" />
            </button>
            
            <button 
              onClick={onOpenAdmin}
              className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-xl transition-all border border-slate-200 hover:border-blue-200 h-[46px] w-[46px] flex items-center justify-center bg-white shadow-sm"
              title="Nueva Carga de Datos (CSV)"
            >
              <FileUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
