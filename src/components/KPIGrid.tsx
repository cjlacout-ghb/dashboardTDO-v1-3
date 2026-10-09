import React from 'react';
import { CheckCircle2, Clock, TrendingUp, Zap, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { KPIStats } from '../types';

interface KPIGridProps {
  kpis: KPIStats;
  historicalStats: { pico: number; eficiencia: number; record: number };
}

export const KPIGrid: React.FC<KPIGridProps> = ({ kpis, historicalStats }) => {
  const cards = [
    {
      title: 'Total Trámites',
      value: kpis.total,
      subtitle: 'Período seleccionado',
      tooltip: 'Cantidad total de trámites registrados en el período y filtros seleccionados.',
      icon: CheckCircle2,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      title: 'Promedio Respuesta',
      value: `${kpis.avgResponse} d`,
      subtitle: 'Media Truncada',
      tooltip: 'Tiempo medio de respuesta calculado mediante media truncada (eliminando valores extremos) para mayor precisión.',
      icon: Clock,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      title: 'Pico Histórico',
      value: historicalStats.pico,
      subtitle: 'Trámites / Mes',
      tooltip: 'Máxima cantidad de trámites procesados en un solo mes considerando toda la base de datos.',
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    {
      title: 'Récord Eficiencia',
      value: `${historicalStats.record} d`,
      subtitle: 'Mínimo absoluto',
      tooltip: 'El tiempo de respuesta más bajo (mejor) registrado históricamente para un trámite individual.',
      icon: Zap,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    }
  ];

  return (
    <div id="kpi-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, idx) => (
        <motion.div
          key={card.title}
          id={`kpi-card-${idx}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5 group relative"
        >
          <div className={`p-4 rounded-2xl ${card.bg}`}>
            <card.icon className={`w-6 h-6 ${card.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-bold text-[#48484a] uppercase tracking-widest">{card.title}</p>
              <div className="relative group p-1 -m-1">
                <HelpCircle className="w-3 h-3 text-slate-300 cursor-help hover:text-slate-500 transition-colors" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] shadow-xl pointer-events-none transform scale-95 group-hover:scale-100">
                  {card.tooltip}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                </div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{card.value}</h3>
            <p className="text-[10px] font-medium text-[#48484a] mt-0.5 italic">{card.subtitle}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
