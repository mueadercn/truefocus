import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Printer, Info, TrendingUp, Award, Calendar, Clock, Target, Zap, Download } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { translations } from '../utils/translations';

interface MonthData {
  mes: string;
  mesNumero: number;
  tarefas: number;
  horas: number;
  deepWork: number;
  resgates: number;
}

interface CategoryData {
  nome: string;
  horas: number;
  porcentagem: number;
  color: string;
}

interface AnnualReport {
  ano: number;
  meses: MonthData[];
  totais: {
    tarefas: number;
    horas: number;
    deepWork: number;
    resgates: number;
  };
  categorias: CategoryData[];
  insights: string[];
}

export function ExecutiveReport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tasks, rescues, settings } = useApp();
  const [showInstructions, setShowInstructions] = useState(false);
  
  const t = translations[settings.language];
  const dateLocale = settings.language === 'pt' ? ptBR : enUS;
  const anoAtual = new Date().getFullYear();

  // Auto-print se veio do modal
  useEffect(() => {
    if (searchParams.get('autoprint') === 'true') {
      // Aguardar um pouco para garantir que a página carregou
      const printTimer = setTimeout(() => {
        window.print();
        
        // Redirecionar IMEDIATAMENTE após o print dialog abrir
        navigate('/home/relatorio-sucesso');
      }, 500);
      
      return () => clearTimeout(printTimer);
    }
  }, [searchParams, navigate]);

  // Gerar relatório anual
  const relatorio = useMemo((): AnnualReport => {
    const meses = t.monthsShort as string[];
    
    // Inicializar todos os meses com zeros
    const dadosMensais: MonthData[] = meses.map((nome, index) => ({
      mes: nome,
      mesNumero: index + 1,
      tarefas: 0,
      horas: 0,
      deepWork: 0,
      resgates: 0
    }));
    
    // Filtrar tarefas do ano atual
    const tarefasDoAno = tasks.filter(t => {
      const ano = new Date(t.date).getFullYear();
      return ano === anoAtual && t.completed;
    });
    
    // Agregar por mês
    tarefasDoAno.forEach(tarefa => {
      const mes = new Date(tarefa.date).getMonth(); // 0-11
      dadosMensais[mes].tarefas++;
      dadosMensais[mes].horas += (tarefa.duration_min || 0) / 60;
      
      if (tarefa.source === 'focus_clock') {
        dadosMensais[mes].deepWork += (tarefa.duration_min || 0) / 60;
      }
    });
    
    // Contar resgates por mês
    const resgatesDoAno = rescues.filter(r => {
      const ano = new Date(r.date).getFullYear();
      return ano === anoAtual;
    });
    
    resgatesDoAno.forEach(resgate => {
      const mes = new Date(resgate.date).getMonth();
      dadosMensais[mes].resgates++;
    });
    
    // Arredondar horas (1 casa decimal)
    dadosMensais.forEach(m => {
      m.horas = Math.round(m.horas * 10) / 10;
      m.deepWork = Math.round(m.deepWork * 10) / 10;
    });
    
    // Calcular totais anuais
    const totais = {
      tarefas: dadosMensais.reduce((sum, m) => sum + m.tarefas, 0),
      horas: dadosMensais.reduce((sum, m) => sum + m.horas, 0),
      deepWork: dadosMensais.reduce((sum, m) => sum + m.deepWork, 0),
      resgates: dadosMensais.reduce((sum, m) => sum + m.resgates, 0)
    };
    
    totais.horas = Math.round(totais.horas * 10) / 10;
    totais.deepWork = Math.round(totais.deepWork * 10) / 10;
    
    // Calcular categorias
    const categorias = calcularCategoriasPorAno(tarefasDoAno, totais.horas);
    
    // Gerar insights
    const insights = gerarInsightsAnuais(dadosMensais, totais, tarefasDoAno);
    
    return {
      ano: anoAtual,
      meses: dadosMensais,
      totais,
      categorias,
      insights
    };
  }, [tasks, rescues, anoAtual, settings.language]);

  function calcularCategoriasPorAno(tarefas: any[], totalHoras: number): CategoryData[] {
    const cats: { [key: string]: { horas: number; color: string } } = {
      'Work': { horas: 0, color: '#1565C0' },
      'Exercise': { horas: 0, color: '#4CAF50' },
      'Study': { horas: 0, color: '#FF9800' },
      'Critical Thinking': { horas: 0, color: '#9C27B0' }
    };
    
    tarefas.forEach(t => {
      if (cats.hasOwnProperty(t.category)) {
        cats[t.category].horas += (t.duration_min || 0) / 60;
      }
    });
    
    return Object.entries(cats).map(([nome, data]) => ({
      nome,
      horas: Math.round(data.horas * 10) / 10,
      porcentagem: totalHoras > 0 ? Math.round((data.horas / totalHoras) * 100) : 0,
      color: data.color
    }));
  }

  function gerarInsightsAnuais(meses: MonthData[], totais: any, tarefas: any[]): string[] {
    const insights = [];
    
    // Se ano vazio
    if (totais.tarefas === 0) {
      return [
        t.yearNotStarted,
        t.startAddingFirstTask,
        t.progressWillAppear
      ];
    }
    
    // Melhor mês
    const melhorMes = meses.reduce((max, m) => 
      m.tarefas > max.tarefas ? m : max
    );
    insights.push(`${t.bestMonth} ${melhorMes.mes} (${melhorMes.tarefas} ${t.tasksLabel.toLowerCase()}, ${melhorMes.horas}h)`);
    
    // Maior streak
    const maiorStreak = calcularMaiorStreak(tarefas);
    if (maiorStreak > 1) {
      insights.push(`${t.longestStreak} ${maiorStreak} ${t.consecutiveDays}`);
    }
    
    // Média mensal
    const mesesComDados = meses.filter(m => m.tarefas > 0).length;
    if (mesesComDados > 0) {
      const mediaTarefas = (totais.tarefas / mesesComDados).toFixed(1);
      const mediaHoras = (totais.horas / mesesComDados).toFixed(1);
      insights.push(`${t.monthlyAverage} ${mediaTarefas} ${t.tasksLabel.toLowerCase()}, ${mediaHoras}h`);
    }
    
    // Deep Work %
    const deepWorkPct = totais.horas > 0 
      ? Math.round((totais.deepWork / totais.horas) * 100)
      : 0;
    
    let avaliacao = t.couldImprove;
    if (deepWorkPct >= 45) avaliacao = t.excellent;
    else if (deepWorkPct >= 30) avaliacao = t.onRightTrack;
    
    insights.push(`Deep Work: ${deepWorkPct}% ${t.ofTotalTime} (${avaliacao})`);
    
    return insights;
  }

  function calcularMaiorStreak(tarefas: any[]): number {
    if (tarefas.length === 0) return 0;
    
    // Ordenar por data
    const datasUnicas = [...new Set(tarefas.map((t: any) => t.date))].sort();
    
    let streakAtual = 1;
    let maiorStreak = 1;
    
    for (let i = 1; i < datasUnicas.length; i++) {
      const anterior = new Date(datasUnicas[i-1]);
      const atual = new Date(datasUnicas[i]);
      const diffDias = (atual.getTime() - anterior.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDias === 1) {
        streakAtual++;
        maiorStreak = Math.max(maiorStreak, streakAtual);
      } else {
        streakAtual = 1;
      }
    }
    
    return maiorStreak;
  }

  // Calcular escala do gráfico
  const maxTarefas = Math.max(...relatorio.meses.map(m => m.tarefas), 50);
  const scaleY = (tarefas: number) => 120 - (tarefas / maxTarefas * 90);

  const handlePrint = () => {
    window.print();
  };
  
  const handleBack = () => {
    console.log('Botão voltar clicado!');
    console.log('window.history.length:', window.history.length);
    
    // Voltar para a página inicial
    navigate('/home');
  };

  const handleDownload = async () => {
    const page1 = document.querySelector('.page-1');
    const page2 = document.querySelector('.page-2');
    
    if (!page1 || !page2) {
      alert('Erro ao capturar as páginas do relatório');
      return;
    }

    try {
      // Capturar página 1
      const canvas1 = await html2canvas(page1 as HTMLElement, {
        scale: 2, // Alta resolução
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      // Capturar página 2
      const canvas2 = await html2canvas(page2 as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      // Criar um canvas combinado com ambas as páginas
      const combinedCanvas = document.createElement('canvas');
      const ctx = combinedCanvas.getContext('2d');
      
      if (!ctx) return;

      // Definir tamanho do canvas combinado (ambas páginas lado a lado ou empilhadas)
      combinedCanvas.width = Math.max(canvas1.width, canvas2.width);
      combinedCanvas.height = canvas1.height + canvas2.height;

      // Desenhar as duas páginas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
      ctx.drawImage(canvas1, 0, 0);
      ctx.drawImage(canvas2, 0, canvas1.height);

      // Converter para JPEG com alta qualidade
      const imageData = combinedCanvas.toDataURL('image/jpeg', 0.95);

      // Criar link de download
      const link = document.createElement('a');
      link.href = imageData;
      link.download = `TrueFocus_Report_${relatorio.ano}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Feedback visual
      alert(`✅ ${t.reportDownloadSuccess}`);
    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
      alert(`❌ ${t.reportDownloadError}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Action Buttons - Hidden on print */}
      <div className="action-buttons fixed top-5 right-5 z-[9999] flex gap-2 bg-white/95 backdrop-blur-sm p-2 rounded-lg border border-gray-200 shadow-lg print:hidden">
        <button
          onClick={handleBack}
          className="p-3 hover:bg-gray-100 rounded-lg transition-colors"
          title={t.back}
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span className="text-sm font-medium">{t.print}</span>
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">{t.download}</span>
        </button>
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="p-3 hover:bg-gray-100 rounded-lg transition-colors"
          title={t.instructions}
        >
          <Info className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:hidden" onClick={() => setShowInstructions(false)}>
          <div className="bg-white p-8 rounded-xl max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">📸 {t.howToSaveReport}</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• {t.iphoneInstructions}</li>
              <li>• {t.androidInstructions}</li>
              <li>• {t.desktopInstructions}</li>
            </ul>
            <button
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              {t.understood}
            </button>
          </div>
        </div>
      )}

      {/* A4 Report Container */}
      <div className="annual-report max-w-[210mm] mx-auto bg-white">
        
        {/* ========== PÁGINA 1 ========== */}
        <div className="page-1 p-[20mm] min-h-[297mm] page-break">
          
          {/* HEADER */}
          <header className="text-center pb-6 mb-6 border-b border-gray-200 flex flex-col items-center">
            <h1 className="text-[28pt] font-bold text-gray-900 tracking-[2px] mb-2">TRUEFOCUS</h1>
            <p className="text-[18pt] font-semibold text-gray-500">{t.annualReportHeader} {relatorio.ano}</p>
          </header>

          {/* RESUMO ANUAL */}
          <section className="summary-box bg-gray-50 p-4 rounded-lg mb-5">
            <h2 className="text-[14pt] font-semibold text-gray-900 mb-2">📊 {t.yearOverview}</h2>
            <div className="text-[14pt] text-gray-900 mb-3">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
            <div className="summary-metrics flex justify-center gap-6 text-[11pt] text-gray-900 flex-wrap">
              <span>✅ {relatorio.totais.tarefas} {t.tasksLabel}</span>
              <span>⏱️ {relatorio.totais.horas}h</span>
              <span>🔵 {relatorio.totais.deepWork}h {t.deep}</span>
              <span>🆘 {relatorio.totais.resgates} {t.rescuesLabel}</span>
            </div>
          </section>

          {/* GRID 3x4 MESES */}
          <section className="month-grid grid grid-cols-4 gap-[2mm] mb-5">
            {relatorio.meses.map((mes) => (
              <div
                key={mes.mes}
                className={`month-cell border border-gray-200 p-3 text-center ${
                  mes.tarefas === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                <div className="month-name text-[12pt] font-bold text-gray-900 uppercase mb-2 pb-2 border-b border-gray-200">
                  {mes.mes}
                </div>
                <div className={`space-y-1 ${mes.tarefas === 0 ? 'text-gray-300' : ''}`}>
                  <div className={`text-[10pt] ${mes.tarefas > 0 ? 'font-semibold text-gray-900' : ''}`}>
                    {mes.tarefas} ✅
                  </div>
                  <div className={`text-[9pt] ${mes.tarefas > 0 ? 'text-gray-600' : ''}`}>
                    {mes.horas}h ⏱️
                  </div>
                  <div className={`text-[9pt] ${mes.tarefas > 0 ? 'text-blue-600' : ''}`}>
                    {mes.deepWork}h 🔵
                  </div>
                  <div className={`text-[9pt] ${mes.tarefas > 0 ? 'text-orange-600' : ''}`}>
                    {mes.resgates} 🆘
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* GRÁFICO EVOLUÇÃO */}
          <section className="evolution-section bg-gray-50 p-4 rounded-lg">
            <h2 className="text-[12pt] font-semibold text-gray-900 mb-2">📈 {t.monthlyEvolution}</h2>
            <div className="text-[12pt] text-gray-900 mb-3">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
            
            <svg viewBox="0 0 600 150" className="w-full h-auto">
              {/* Grid horizontal */}
              {[30, 60, 90, 120].map(y => (
                <line key={y} x1="40" y1={y} x2="580" y2={y} stroke="#F0F0F0" strokeWidth="1" />
              ))}
              
              {/* Linha conectando pontos */}
              <polyline
                points={relatorio.meses.map((m, i) => 
                  `${70 + i * 45},${scaleY(m.tarefas)}`
                ).join(' ')}
                fill="none"
                stroke="#1565C0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Pontos */}
              {relatorio.meses.map((m, i) => (
                <circle
                  key={i}
                  cx={70 + i * 45}
                  cy={scaleY(m.tarefas)}
                  r="4"
                  fill={m.tarefas > 0 ? '#1565C0' : '#E0E0E0'}
                />
              ))}
              
              {/* Labels meses */}
              {relatorio.meses.map((m, i) => (
                <text
                  key={i}
                  x={70 + i * 45}
                  y="145"
                  textAnchor="middle"
                  fontSize="8pt"
                  fill="#6B6B6B"
                >
                  {m.mes[0]}
                </text>
              ))}
              
              {/* Eixo Y labels */}
              <text x="30" y="125" textAnchor="end" fontSize="7pt" fill="#BDBDBD">0</text>
              <text x="30" y="95" textAnchor="end" fontSize="7pt" fill="#BDBDBD">
                {Math.round(maxTarefas * 0.33)}
              </text>
              <text x="30" y="65" textAnchor="end" fontSize="7pt" fill="#BDBDBD">
                {Math.round(maxTarefas * 0.66)}
              </text>
              <text x="30" y="35" textAnchor="end" fontSize="7pt" fill="#BDBDBD">
                {maxTarefas}
              </text>
            </svg>
          </section>

        </div>

        {/* ========== PÁGINA 2 ========== */}
        <div className="page-2 p-[20mm] min-h-[297mm]">
          
          {/* Header repetido (menor) para contexto */}
          <header className="text-center pb-4 mb-6 border-b border-gray-200">
            <h1 className="text-[20pt] font-bold text-gray-900 tracking-[2px] mb-1">TRUEFOCUS</h1>
            <p className="text-[14pt] font-semibold text-gray-500">{t.annualReportHeader} {relatorio.ano} - {t.page} 2</p>
          </header>

          {/* CATEGORIAS */}
          <section className="categories-section bg-gray-50 p-4 rounded-lg mb-6">
            <h2 className="text-[12pt] font-semibold text-gray-900 mb-2">📁 {t.distributionByCategory}</h2>
            <div className="text-[12pt] text-gray-900 mb-3">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
            
            <div className="space-y-2">
              {relatorio.categorias.map((cat) => (
                <div key={cat.nome} className="category-row grid grid-cols-[100px_1fr_80px] items-center gap-3">
                  <div className="text-[10pt] font-medium text-gray-900">{cat.nome}</div>
                  <div className="h-5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.porcentagem || 2}%`,
                        backgroundColor: cat.color,
                        opacity: cat.porcentagem === 0 ? 0.3 : 1
                      }}
                    />
                  </div>
                  <div className="text-[10pt] font-semibold text-gray-900 text-right">
                    {cat.horas}h ({cat.porcentagem}%)
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* INSIGHTS */}
          <section className="insights-section pt-4 border-t border-gray-200">
            <h2 className="text-[12pt] font-semibold text-gray-900 mb-2">💡 {t.yearHighlights}</h2>
            <ul className="space-y-1">
              {relatorio.insights.map((insight, i) => (
                <li key={i} className="text-[9pt] text-gray-600 leading-relaxed">
                  • {insight}
                </li>
              ))}
            </ul>
          </section>

          {/* Rodapé */}
          <footer className="mt-12 pt-6 border-t border-gray-200 text-center">
            <p className="text-[8pt] text-gray-400">
              {t.generatedOn} {format(new Date(), settings.language === 'pt' ? `dd/MM/yyyy '${t.atTime}' HH:mm` : "MM/dd/yyyy 'at' HH:mm", { locale: dateLocale })}
            </p>
            <p className="text-[8pt] text-gray-400 mt-1">
              TrueFocus - {t.appTagline}
            </p>
          </footer>

        </div>

      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          /* Resetar body */
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          /* Ocultar TODOS elementos de navegação e UI */
          .action-buttons,
          .print\\:hidden,
          nav,
          header nav,
          footer nav,
          .bottom-nav,
          .navigation,
          .tab-bar,
          button:not(.annual-report button),
          [role="navigation"],
          .fixed,
          .sticky {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Mostrar apenas o relatório */
          .annual-report {
            display: block !important;
            visibility: visible !important;
          }
          
          /* Quebra de página */
          .page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
          
          /* Evitar quebras dentro das páginas */
          .page-1,
          .page-2 {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Forçar cores na impressão */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Garantir que nada além do relatório apareça */
          body > *:not(:has(.annual-report)) {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}