import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, Cell, LabelList 
} from 'recharts';
import { motion } from 'motion/react';
import { EvolutionPoint, DistrictPoint } from '../types';

interface AnalyticsChartsProps {
  evolutionData: EvolutionPoint[];
  districtData: DistrictPoint[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ evolutionData, districtData }) => {
  return (
    <div id="analytics-charts" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Evolución Temporal */}
      <motion.div 
        id="evolution-chart"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-200"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Evolución Temporal</h3>
            <p className="text-xs text-[#48484a] font-medium">Volumen vs Tiempo de Respuesta</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-[10px] font-bold text-[#48484a] uppercase">trámites</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-[#48484a] uppercase">Días</span>
            </div>
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolutionData} margin={{ top: 25, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#48484a', fontSize: 10, fontWeight: 600 }}
                dy={10}
              />
              <YAxis 
                yAxisId="left"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#48484a', fontSize: 10 }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#48484a', fontSize: 10 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              />
              <Bar 
                yAxisId="left"
                dataKey="cantidad" 
                fill="#1a56db" 
                radius={[4, 4, 0, 0]}
                barSize={20}
                isAnimationActive={false}
              >
                <LabelList 
                  dataKey="cantidad" 
                  position="top" 
                  offset={10}
                  style={{ fill: '#1a56db', fontSize: 10, fontWeight: 700 }}
                />
              </Bar>
              <Bar 
                yAxisId="right"
                dataKey="promedio" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
                barSize={20}
                isAnimationActive={false}
              >
                <LabelList 
                  dataKey="promedio" 
                  position="top" 
                  offset={10}
                  style={{ fill: '#10b981', fontSize: 10, fontWeight: 700 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Distribución por Distrito */}
      <motion.div 
        id="districts-chart"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="lg:col-span-1 bg-white p-8 rounded-3xl shadow-sm border border-slate-200"
      >
        <div className="mb-8">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Distribución por Distritos</h3>
          <p className="text-xs text-[#48484a] font-medium">según Código Urbano</p>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={districtData.slice(0, 8)} layout="vertical" margin={{ left: 20, right: 40, top: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#48484a', fontSize: 10, fontWeight: 600 }}
                width={80}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12} isAnimationActive={false}>
                {districtData.slice(0, 8).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#1a56db' : '#3b82f6'} fillOpacity={1 - (index * 0.1)} />
                ))}
                <LabelList 
                  dataKey="value" 
                  position="right" 
                  offset={10}
                  fill="#48484a"
                  fontSize={10}
                  fontWeight={700}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};
