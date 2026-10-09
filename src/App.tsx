/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { format, startOfMonth, differenceInDays } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Internal Modules
import { 
  Tramite, 
  FilterState, 
  DATE_LOCALE, 
  MONTHS, 
  EvolutionPoint, 
  DistrictPoint 
} from './types';
import { calculateTrimmedMean, parseCSVDate, normalizeTipoTramite } from './lib/utils';

// Components
import { DashboardHeader } from './components/DashboardHeader';
import { KPIGrid } from './components/KPIGrid';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { DataTable } from './components/DataTable';
import { AdminPortal } from './components/AdminPortal';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  // --- State ---
  const [data, setData] = useState<Tramite[]>([]);
  const [filters, setFilters] = useState<FilterState>({ years: [], months: [], tipos: [] });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [includeTableInPDF, setIncludeTableInPDF] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Tramite; direction: 'asc' | 'desc' } | null>({ 
    key: 'TD_fecha_autorizacion', 
    direction: 'desc' 
  });

  // --- Data Normalization & Parsing ---
  const parseRows = useCallback((rawData: any[]): Tramite[] => {
    return rawData.map((row: any) => {
      const fechaIngreso = parseCSVDate(row.TD_fecha_ingr);
      const fechaAutorizacion = parseCSVDate(row.TD_fecha_autorizacion);
      let diasRespuesta = null;
      if (fechaIngreso && fechaAutorizacion) {
        diasRespuesta = differenceInDays(fechaAutorizacion, fechaIngreso);
      }
      return {
        id: row.id,
        distrito: row.distrito || '',
        td_no: row.td_no || '',
        exe_nro: row.exe_nro || row['EXE-NRO'] || row['exe_nro'] || row['exenro'] || row['EXE_NRO'] || '',
        tipo_tramite: normalizeTipoTramite(row.tipo_tramite || ''),
        TD_fecha_ingr: row.TD_fecha_ingr || '',
        TD_fecha_autorizacion: row.TD_fecha_autorizacion || '',
        fechaIngreso,
        fechaAutorizacion,
        diasRespuesta
      };
    });
  }, []);

  // --- Data Fetching ---
  const fetchData = useCallback(async (preloadedData?: any[]) => {
    if (preloadedData && Array.isArray(preloadedData) && preloadedData.length > 0) {
      const parsed = parseRows(preloadedData);
      setData(parsed);
      setIsLoaded(parsed.length > 0);
      setIsLoading(false);
      try {
        localStorage.setItem('tramites_data', JSON.stringify(preloadedData));
      } catch {}
      return;
    }

    // Attempt to load from localStorage cache first so user never sees blank screen
    let cachedRows: any[] = [];
    try {
      const cached = localStorage.getItem('tramites_data');
      if (cached) {
        cachedRows = JSON.parse(cached);
        if (Array.isArray(cachedRows) && cachedRows.length > 0) {
          const parsed = parseRows(cachedRows);
          setData(parsed);
          setIsLoaded(true);
        }
      }
    } catch {}

    try {
      const response = await fetch('/api/tramites');
      if (response.ok) {
        const rawData = await response.json();
        if (Array.isArray(rawData) && rawData.length > 0) {
          const parsedData = parseRows(rawData);
          setData(parsedData);
          setIsLoaded(parsedData.length > 0);
          try {
            localStorage.setItem('tramites_data', JSON.stringify(rawData));
          } catch {}
        } else if (cachedRows.length > 0) {
          // If server was reset (e.g. ephemeral container restart), automatically re-seed it
          fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'clacout', data: cachedRows })
          }).catch(() => {});
        }
      }
    } catch (error) {
      console.warn('Backend fetch error, relying on local storage if available:', error);
    } finally {
      setIsLoading(false);
    }
  }, [parseRows]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Computed Data ---
  const years = useMemo(() => {
    const uniqueYears = new Set<string>();
    data.forEach(t => {
      if (t.fechaAutorizacion) {
        let yr = t.fechaAutorizacion.getFullYear();
        if (yr < 100) yr += 2000;
        uniqueYears.add(yr.toString());
      }
    });
    return Array.from(uniqueYears).sort((a, b) => b.localeCompare(a));
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(t => {
      if (!t.fechaAutorizacion) return false;
      let yr = t.fechaAutorizacion.getFullYear();
      if (yr < 100) yr += 2000;
      const yrStr = yr.toString();
      const yearMatch = filters.years.length === 0 || filters.years.includes(yrStr) || filters.years.includes((yr % 100).toString());
      const monthMatch = filters.months.length === 0 || filters.months.includes(t.fechaAutorizacion.getMonth().toString());
      const tipoMatch = filters.tipos.length === 0 || filters.tipos.includes(t.tipo_tramite);
      return yearMatch && monthMatch && tipoMatch;
    });
  }, [data, filters]);

  const kpis = useMemo(() => {
    const total = filteredData.length;
    const validResponseTimes = filteredData
      .map(t => t.diasRespuesta)
      .filter((d): d is number => d !== null && d >= 0);
    
    const avgResponse = validResponseTimes.length > 0 
      ? calculateTrimmedMean(validResponseTimes).toFixed(1) 
      : '0.0';
      
    return { total, avgResponse };
  }, [filteredData]);

  const evolutionData = useMemo((): EvolutionPoint[] => {
    const groups: Record<string, { count: number; responseTimes: number[]; date: Date }> = {};
    const isSingleMonth = filters.months.length === 1;
    
    filteredData.forEach(t => {
      if (!t.fechaAutorizacion) return;
      const key = isSingleMonth 
        ? format(t.fechaAutorizacion, 'yyyy-MM-dd')
        : format(t.fechaAutorizacion, 'yyyy-MM');
        
      if (!groups[key]) {
        groups[key] = { 
          count: 0, 
          responseTimes: [], 
          date: isSingleMonth ? t.fechaAutorizacion : startOfMonth(t.fechaAutorizacion) 
        };
      }
      groups[key].count += 1;
      if (t.diasRespuesta !== null && t.diasRespuesta >= 0) {
        groups[key].responseTimes.push(t.diasRespuesta);
      }
    });

    return Object.entries(groups)
      .map(([key, val]) => ({
        key,
        name: isSingleMonth 
          ? format(val.date, 'dd/MM') 
          : format(val.date, 'MMM yy', { locale: DATE_LOCALE }).replace('.', '').toLowerCase(),
        cantidad: val.count,
        promedio: val.responseTimes.length > 0 
          ? parseFloat(calculateTrimmedMean(val.responseTimes).toFixed(1))
          : 0,
        rawDate: val.date
      }))
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
  }, [filteredData, filters.months]);

  const districtData = useMemo((): DistrictPoint[] => {
    const groups: Record<string, number> = {};
    filteredData.forEach(t => {
      const dist = t.distrito || 'Sin Distrito';
      groups[dist] = (groups[dist] || 0) + 1;
    });

    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const historicalStats = useMemo(() => {
    if (filteredData.length === 0) return { pico: 0, eficiencia: 0, record: 0 };
    const monthlyGroups: Record<string, { count: number; responseTimes: number[] }> = {};
    filteredData.forEach(t => {
      if (!t.fechaAutorizacion) return;
      const key = format(t.fechaAutorizacion, 'yyyy-MM');
      if (!monthlyGroups[key]) monthlyGroups[key] = { count: 0, responseTimes: [] };
      monthlyGroups[key].count += 1;
      if (t.diasRespuesta !== null && t.diasRespuesta >= 0) {
        monthlyGroups[key].responseTimes.push(t.diasRespuesta);
      }
    });

    const monthlyStats = Object.values(monthlyGroups).map(g => ({
      count: g.count,
      avg: g.responseTimes.length > 0 ? calculateTrimmedMean(g.responseTimes) : 0
    }));

    const pico = monthlyStats.length > 0 ? Math.max(...monthlyStats.map(s => s.count)) : 0;
    const validAvgs = monthlyStats.map(s => s.avg).filter(a => a > 0);
    const eficiencia = validAvgs.length > 0 ? Math.min(...validAvgs) : 0;
    const validDays = filteredData.map(t => t.diasRespuesta).filter((d): d is number => d !== null && d >= 0);
    const record = validDays.length > 0 ? Math.min(...validDays) : 0;

    return { pico, eficiencia: parseFloat(eficiencia.toFixed(1)), record };
  }, [filteredData]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    return [...filteredData].sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];
      if (sortConfig.key === 'TD_fecha_ingr') {
        aValue = a.fechaIngreso?.getTime() || 0;
        bValue = b.fechaIngreso?.getTime() || 0;
      } else if (sortConfig.key === 'TD_fecha_autorizacion') {
        aValue = a.fechaAutorizacion?.getTime() || 0;
        bValue = b.fechaAutorizacion?.getTime() || 0;
      }
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // --- Handlers ---
  const handleSort = (key: keyof Tramite) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const downloadPDF = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      let currentY = 20;

      // --- Header Background ---
      pdf.setFillColor(241, 245, 249); // #f1f5f9 (Slate 100)
      pdf.rect(0, 0, pageWidth, 45, 'F');

      // --- Header ---
      pdf.setTextColor(32, 32, 33); // #202021
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Autorización TDOs', margin, 22);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('DIRECCIÓN DE OBRAS CIVILES - MUNICIPALIDAD DE PARANÁ', margin, 31);

      currentY = 55;

      // --- Filter Info ---
      pdf.setTextColor(32, 32, 33); // #202021
      pdf.setFontSize(10);
      const tipoLabels: Record<string, string> = {
        'FACTIBILIDAD': 'Factibilidad',
        'TDO': 'TDO',
        'TDO+PROYECTO': 'TDO+Proyecto',
        'TDO+TDI': 'TDO+TDI',
        'TRAMITE DIGITAL': 'TDO',
        'TD+PROYECTO': 'TDO+Proyecto'
      };
      const tipoStr = filters.tipos.length === 0 ? 'Todos los tipos' : filters.tipos.map(t => tipoLabels[t] || t).join(', ');
      const periodStr = `${filters.months.length > 0 ? filters.months.map(m => MONTHS.find(mon => mon.value === m)?.label).join(', ') : 'Todo el año'} ${filters.years.length > 0 ? filters.years.join(', ') : ''}`;
      pdf.text(`Filtros aplicados: ${tipoStr} | Período: ${periodStr}`, margin, currentY);
      currentY += 10;

      // --- KPIs Capture ---
      const kpiCards = [
        document.getElementById('kpi-card-0'),
        document.getElementById('kpi-card-1'),
        document.getElementById('kpi-card-2'),
        document.getElementById('kpi-card-3')
      ];

      if (kpiCards.every(el => el !== null)) {
        const cardGap = 5;
        const usableWidth = pageWidth - (margin * 2);
        const cardWidth = (usableWidth - cardGap) / 2;
        
        const captureCard = async (element: HTMLElement) => {
          const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
          const imgData = canvas.toDataURL('image/png');
          const imgHeight = (canvas.height * cardWidth) / canvas.width;
          return { imgData, imgHeight };
        };

        // Row 1
        const card0 = await captureCard(kpiCards[0]!);
        const card1 = await captureCard(kpiCards[1]!);
        const row1Height = Math.max(card0.imgHeight, card1.imgHeight);
        
        pdf.addImage(card0.imgData, 'PNG', margin, currentY, cardWidth, card0.imgHeight);
        pdf.addImage(card1.imgData, 'PNG', margin + cardWidth + cardGap, currentY, cardWidth, card1.imgHeight);
        
        currentY += row1Height + cardGap;

        // Row 2
        const card2 = await captureCard(kpiCards[2]!);
        const card3 = await captureCard(kpiCards[3]!);
        const row2Height = Math.max(card2.imgHeight, card3.imgHeight);
        
        pdf.addImage(card2.imgData, 'PNG', margin, currentY, cardWidth, card2.imgHeight);
        pdf.addImage(card3.imgData, 'PNG', margin + cardWidth + cardGap, currentY, cardWidth, card3.imgHeight);
        
        currentY += row2Height + 5;
        
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(32, 32, 33);
        pdf.text('* Media Truncada: Cálculo estadístico que excluye el valor máximo y mínimo de cada período para evitar distorsiones por casos atípicos.', margin, currentY);
        currentY += 15;
      } else {
        // Fallback to grid capture if individual cards not found
        const kpiElement = document.getElementById('kpi-grid');
        if (kpiElement) {
          const canvas = await html2canvas(kpiElement, { scale: 2, backgroundColor: '#f1f5f9' });
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - (margin * 2);
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 15;
        }
      }

      // --- Charts Capture ---
      const evolutionElement = document.getElementById('evolution-chart');
      const districtsElement = document.getElementById('districts-chart');
      
      if (evolutionElement || districtsElement) {
        // Small delay to ensure Recharts is fully rendered
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const captureChart = async (element: HTMLElement) => {
          const canvas = await html2canvas(element, { 
            scale: 2, 
            backgroundColor: '#f1f5f9',
            useCORS: true,
            logging: false
          });
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - (margin * 2);
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          return { imgData, imgHeight, imgWidth };
        };

        // Capture Evolution Chart
        if (evolutionElement) {
          const { imgData, imgHeight, imgWidth } = await captureChart(evolutionElement);
          if (currentY + imgHeight > 280) {
            pdf.addPage();
            currentY = 20;
          }
          pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 6;
          
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(32, 32, 33);
          pdf.text('* Media Truncada: Cálculo estadístico que excluye el valor máximo y mínimo de cada período para evitar distorsiones por casos atípicos.', margin, currentY);
          currentY += 12;
        }

        // Capture Districts Chart
        if (districtsElement) {
          const { imgData, imgHeight: originalHeight, imgWidth: originalWidth } = await captureChart(districtsElement);
          const reducedWidth = originalWidth * 0.75; // Reduce to 75% of full width
          const reducedHeight = (originalHeight * reducedWidth) / originalWidth;
          const xOffset = margin + (originalWidth - reducedWidth) / 2; // Center it

          if (currentY + reducedHeight > 280) {
            pdf.addPage();
            currentY = 20;
          }
          pdf.addImage(imgData, 'PNG', xOffset, currentY, reducedWidth, reducedHeight);
          currentY += reducedHeight + 20;
        }
      }

      if (includeTableInPDF) {
        // --- Data Table ---
        if (currentY > 240) {
          pdf.addPage();
          currentY = 20;
        }
        
        pdf.setTextColor(32, 32, 33); // #202021
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Registro de Trámites autorizados', margin, currentY);
        currentY += 8;

        autoTable(pdf, {
          startY: currentY,
          head: [['Tipo', 'TDO Nº', 'TDI Nº', 'TDO Ingreso', 'TDO Autorización', 'Días', 'Distrito']],
          body: sortedData.map(t => [
            t.tipo_tramite,
            t.td_no,
            t.exe_nro || '',
            t.TD_fecha_ingr,
            t.TD_fecha_autorizacion,
            t.diasRespuesta?.toString() || '-',
            t.distrito
          ]),
          styles: { fontSize: 8, cellPadding: 3, textColor: [32, 32, 33] },
          headStyles: { fillColor: [241, 245, 249], textColor: [32, 32, 33], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: margin, right: margin }
        });
      }

      // --- Footer ---
      const pageCount = pdf.getNumberOfPages();
      const generationTime = format(new Date(), 'dd/MM/yyyy HH:mm');
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175); // Gray-400 (Soft gray)
        pdf.text(
          `Página ${i} de ${pageCount} - Reporte generado por Arq. Cristian Lacout - ${generationTime}`,
          pageWidth / 2,
          285,
          { align: 'center' }
        );
      }

      pdf.save(`reporte_tramites_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (error) {
      console.error('PDF error:', error);
      alert('Error al generar PDF. Verifique la consola para más detalles.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
        <p className="mt-4 text-slate-500 font-medium">Sincronizando con el servidor...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-8 font-sans text-slate-900">
        <div className="max-w-7xl mx-auto space-y-6">
          <DashboardHeader 
            filters={filters}
            setFilters={setFilters}
            years={years}
            onDownloadPDF={downloadPDF}
            onOpenAdmin={() => setIsAdminModalOpen(true)}
            isGeneratingPDF={isGeneratingPDF}
            includeTableInPDF={includeTableInPDF}
            setIncludeTableInPDF={setIncludeTableInPDF}
          />

          {!isLoaded ? (
            <div className="bg-white rounded-[2.5rem] p-16 text-center shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Bienvenido al Sistema</h2>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">No hay datos cargados. El administrador debe subir un archivo CSV para comenzar el análisis.</p>
              <button onClick={() => setIsAdminModalOpen(true)} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all">Acceso Admin</button>
            </div>
          ) : (
            <div className="space-y-6">
              <KPIGrid kpis={kpis} historicalStats={historicalStats} />
              <AnalyticsCharts evolutionData={evolutionData} districtData={districtData} />
              <DataTable data={sortedData} sortConfig={sortConfig} onSort={handleSort} />
            </div>
          )}

          <footer className="mt-12 py-8 text-center text-slate-400 text-sm border-t border-slate-200">
            <p>© {new Date().getFullYear()} - Dashboard generado por Arq. Cristian Lacout</p>
          </footer>
        </div>

        <AdminPortal 
          isOpen={isAdminModalOpen} 
          onClose={() => setIsAdminModalOpen(false)} 
          onUploadSuccess={fetchData} 
        />
      </div>
    </ErrorBoundary>
  );
}
