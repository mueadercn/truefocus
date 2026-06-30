import { useState, useEffect, useMemo, useRef } from 'react';
import { Download, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { translations } from '../utils/translations';
import html2canvas from 'html2canvas';

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

export function ShareReport() {
  const navigate = useNavigate();
  const { tasks, rescues, settings } = useApp();
  const [isGenerating, setIsGenerating] = useState(true);
  const [imageGenerated, setImageGenerated] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  
  const t = translations[settings.language];
  const anoAtual = new Date().getFullYear();

  // Auto-gerar imagem ao carregar
  useEffect(() => {
    const autoGenerate = async () => {
      // Aguardar 1 segundo para garantir que o DOM carregou
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!reportRef.current) return;
      
      try {
        const canvas = await html2canvas(reportRef.current, {
          scale: 2,
          backgroundColor: '#FFFFFF',
          logging: false,
          useCORS: true
        });
        
        const blob = await new Promise<Blob | null>(resolve => {
          canvas.toBlob(resolve, 'image/png', 0.95);
        });
        
        if (blob) {
          setImageBlob(blob);
          setImageGenerated(true);
        }
      } catch (error) {
        console.error('Erro ao gerar imagem:', error);
      } finally {
        setIsGenerating(false);
      }
    };
    
    autoGenerate();
  }, []);

  // Gerar relatório anual (mesma lógica do ExecutiveReport)
  const relatorio = useMemo(() => {
    const meses = [
      'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
      'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
    ];
    
    const dadosMensais: MonthData[] = meses.map((nome, index) => ({
      mes: nome,
      mesNumero: index + 1,
      tarefas: 0,
      horas: 0,
      deepWork: 0,
      resgates: 0
    }));
    
    const tarefasDoAno = tasks.filter(t => {
      const ano = new Date(t.date).getFullYear();
      return ano === anoAtual && t.completed;
    });
    
    tarefasDoAno.forEach(tarefa => {
      const mes = new Date(tarefa.date).getMonth();
      dadosMensais[mes].tarefas++;
      dadosMensais[mes].horas += (tarefa.duration_min || 0) / 60;
      
      if (tarefa.source === 'focus_clock') {
        dadosMensais[mes].deepWork += (tarefa.duration_min || 0) / 60;
      }
    });
    
    const resgatesDoAno = rescues.filter(r => {
      const ano = new Date(r.date).getFullYear();
      return ano === anoAtual;
    });
    
    resgatesDoAno.forEach(resgate => {
      const mes = new Date(resgate.date).getMonth();
      dadosMensais[mes].resgates++;
    });
    
    dadosMensais.forEach(m => {
      m.horas = Math.round(m.horas * 10) / 10;
      m.deepWork = Math.round(m.deepWork * 10) / 10;
    });
    
    const totais = {
      tarefas: dadosMensais.reduce((sum, m) => sum + m.tarefas, 0),
      horas: dadosMensais.reduce((sum, m) => sum + m.horas, 0),
      deepWork: dadosMensais.reduce((sum, m) => sum + m.deepWork, 0),
      resgates: dadosMensais.reduce((sum, m) => sum + m.resgates, 0)
    };
    
    totais.horas = Math.round(totais.horas * 10) / 10;
    totais.deepWork = Math.round(totais.deepWork * 10) / 10;
    
    const categorias = calcularCategorias(tarefasDoAno, totais.horas);
    const melhorMes = dadosMensais.reduce((max, m) => m.tarefas > max.tarefas ? m : max);
    
    return { ano: anoAtual, meses: dadosMensais, totais, categorias, melhorMes };
  }, [tasks, rescues, anoAtual]);

  function calcularCategorias(tarefas: any[], totalHoras: number): CategoryData[] {
    const cats: { [key: string]: { horas: number; color: string } } = {
      'Trabalho': { horas: 0, color: '#1565C0' },
      'Exercício': { horas: 0, color: '#4CAF50' },
      'Estudo': { horas: 0, color: '#FF9800' },
      'Pensamento Crítico': { horas: 0, color: '#9C27B0' }
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

  const handleDownload = () => {
    if (!imageBlob) return;
    
    const url = URL.createObjectURL(imageBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stora-relatorio-${anoAtual}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!imageBlob) return;
    
    const file = new File([imageBlob], `stora-relatorio-${anoAtual}.png`, { type: 'image/png' });
    
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: `Meu Relatório Anual TrueFocus ${anoAtual}`,
          text: `Confira meu progresso em ${anoAtual}! 🎯`,
          files: [file]
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Erro ao compartilhar:', error);
          handleDownload();
        }
      }
    } else {
      handleDownload();
    }
  };

  const maxTarefas = Math.max(...relatorio.meses.map(m => m.tarefas), 50);
  const scaleY = (tarefas: number) => 100 - (tarefas / maxTarefas * 80);

  return (
    <>
      {/* Loading State */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 mx-4 w-full max-w-md shadow-2xl text-center">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto border-4 border-[#8B7355]/20 border-t-[#8B7355] rounded-full animate-spin"></div>
            </div>
            <h3 className="font-serif text-xl font-light text-[#1A1A1A] mb-2">
              {t.generatingImage}
            </h3>
            <p className="text-sm text-[#6B6B6B]">
              {t.preparingShareReport}
            </p>
          </div>
        </div>
      )}

      {/* Success State */}
      {imageGenerated && !isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 mx-4 w-full max-w-md shadow-2xl text-center">
            {/* Ícone de sucesso com animação */}
            <div className="mb-6 relative">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#8B7355] to-[#A89580] rounded-full flex items-center justify-center animate-[scale-in_0.5s_ease-out]">
                <Share2 className="w-12 h-12 text-white" strokeWidth={2.5} />
              </div>
              
              {/* Círculos decorativos animados */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 border-4 border-[#8B7355]/30 rounded-full animate-[ping_1.5s_ease-out]"></div>
              </div>
            </div>

            {/* Título */}
            <h1 className="font-serif text-3xl font-light text-[#1A1A1A] mb-3">
              {t.imageGenerated}
            </h1>

            {/* Descrição */}
            <p className="text-base text-[#6B6B6B] mb-8 leading-relaxed">
              {t.reportReadyToShare}<br />
              {t.showProgressSocial}
            </p>

            {/* Botões de ação */}
            <div className="space-y-3">
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#8B7355] to-[#A89580] text-white rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-medium"
              >
                <Share2 className="w-5 h-5" />
                {t.shareButton}
              </button>
              
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-[#8B7355] text-[#8B7355] rounded-xl hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-medium"
              >
                <Download className="w-5 h-5" />
                {t.downloadImage}
              </button>
              
              <button
                onClick={() => navigate('/home')}
                className="w-full px-6 py-3 text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors font-medium"
              >
                {t.backToHomePage}
              </button>
            </div>

            {/* Animações CSS */}
            <style>{`
              @keyframes scale-in {
                from {
                  transform: scale(0);
                  opacity: 0;
                }
                to {
                  transform: scale(1);
                  opacity: 1;
                }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* Relatório (escondido, apenas para gerar imagem) */}
      <div ref={reportRef} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div style={{
          width: '1080px',
          height: '1920px',
          backgroundColor: '#FFFFFF',
          padding: '60px 50px',
          fontFamily: 'Cormorant Garamond, serif',
          color: '#1A1A1A',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{ 
              fontSize: '72px', 
              fontWeight: 'bold', 
              color: '#1A1A1A', 
              letterSpacing: '0.1em',
              marginBottom: '10px',
              margin: 0
            }}>TRUEFOCUS</h1>
            <p style={{ 
              fontSize: '32px', 
              fontWeight: '600', 
              color: '#6B6B6B',
              margin: 0
            }}>RELATÓRIO ANUAL {relatorio.ano}</p>
          </div>

          {/* Resumo Compacto */}
          <div style={{
            background: 'linear-gradient(to right, #8B7355, #6D5A43)',
            color: '#FFFFFF',
            padding: '40px 30px',
            borderRadius: '20px',
            marginBottom: '40px'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '30px',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '56px', fontWeight: 'bold', marginBottom: '5px' }}>
                  {relatorio.totais.tarefas}
                </div>
                <div style={{ fontSize: '18px', opacity: 0.9 }}>Tarefas</div>
              </div>
              <div>
                <div style={{ fontSize: '56px', fontWeight: 'bold', marginBottom: '5px' }}>
                  {relatorio.totais.horas}h
                </div>
                <div style={{ fontSize: '18px', opacity: 0.9 }}>Horas</div>
              </div>
              <div>
                <div style={{ fontSize: '56px', fontWeight: 'bold', marginBottom: '5px' }}>
                  {relatorio.totais.deepWork}h
                </div>
                <div style={{ fontSize: '18px', opacity: 0.9 }}>Deep Work</div>
              </div>
              <div>
                <div style={{ fontSize: '56px', fontWeight: 'bold', marginBottom: '5px' }}>
                  {relatorio.totais.resgates}
                </div>
                <div style={{ fontSize: '18px', opacity: 0.9 }}>Resgates</div>
              </div>
            </div>
          </div>

          {/* Grid Meses Compacto */}
          <div style={{ marginBottom: '35px' }}>
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: '600', 
              color: '#1A1A1A', 
              marginBottom: '20px',
              margin: '0 0 20px 0'
            }}>12 Meses do Ano</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '12px'
            }}>
              {relatorio.meses.map((mes) => (
                <div
                  key={mes.mes}
                  style={{
                    border: mes.tarefas === 0 ? '2px solid #E5E5E5' : '2px solid #8B7355',
                    backgroundColor: mes.tarefas === 0 ? '#F9F9F9' : '#F5EDE7',
                    padding: '15px 10px',
                    textAlign: 'center',
                    borderRadius: '12px'
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1A1A1A', marginBottom: '5px' }}>
                    {mes.mes}
                  </div>
                  <div style={{ 
                    fontSize: '28px', 
                    fontWeight: 'bold', 
                    color: mes.tarefas > 0 ? '#1A1A1A' : '#D1D1D1'
                  }}>
                    {mes.tarefas}
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    color: mes.tarefas > 0 ? '#6B6B6B' : '#D1D1D1'
                  }}>
                    {mes.horas}h
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico de Evolução */}
          <div style={{ marginBottom: '35px' }}>
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: '600', 
              color: '#1A1A1A', 
              marginBottom: '20px',
              margin: '0 0 20px 0'
            }}>Evolução Mensal - Tarefas</h2>
            <svg viewBox="0 0 1000 200" style={{ width: '100%', height: 'auto' }}>
              {/* Grid horizontal */}
              {[40, 80, 120, 160].map(y => (
                <line key={y} x1="50" y1={y} x2="1000" y2={y} stroke="#F0F0F0" strokeWidth="1.5" />
              ))}
              
              {/* Eixo Y - Labels de quantidade */}
              {[0, 1, 2, 3, 4].map((index) => {
                const valor = Math.round(maxTarefas - (index * maxTarefas / 4));
                const y = 20 + (index * 40);
                return (
                  <text
                    key={index}
                    x="35"
                    y={y + 5}
                    textAnchor="end"
                    fontSize="18"
                    fill="#999"
                  >
                    {valor}
                  </text>
                );
              })}
              
              {/* Linha */}
              <polyline
                points={relatorio.meses.map((m, i) => 
                  `${90 + i * 75},${20 + (1 - m.tarefas / maxTarefas) * 140}`
                ).join(' ')}
                fill="none"
                stroke="#8B7355"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Pontos */}
              {relatorio.meses.map((m, i) => (
                <circle
                  key={i}
                  cx={90 + i * 75}
                  cy={20 + (1 - m.tarefas / maxTarefas) * 140}
                  r="8"
                  fill={m.tarefas > 0 ? '#8B7355' : '#E0E0E0'}
                />
              ))}
              
              {/* Labels dos meses */}
              {relatorio.meses.map((m, i) => (
                <text
                  key={i}
                  x={90 + i * 75}
                  y="185"
                  textAnchor="middle"
                  fontSize="20"
                  fill="#999"
                >
                  {m.mes[0]}
                </text>
              ))}
            </svg>
          </div>

          {/* Distribuição por Categoria */}
          <div style={{ marginBottom: '35px' }}>
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: '600', 
              color: '#1A1A1A', 
              marginBottom: '20px',
              margin: '0 0 20px 0'
            }}>Distribuição por Categoria</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {relatorio.categorias.filter(c => c.horas > 0).map((cat) => (
                <div key={cat.nome} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '180px', fontSize: '18px', fontWeight: '500', color: '#1A1A1A' }}>
                    {cat.nome}
                  </div>
                  <div style={{ 
                    flex: 1, 
                    height: '32px', 
                    backgroundColor: '#E5E5E5', 
                    borderRadius: '16px', 
                    overflow: 'hidden' 
                  }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '16px',
                        width: `${cat.porcentagem || 2}%`,
                        backgroundColor: cat.color
                      }}
                    />
                  </div>
                  <div style={{ 
                    width: '100px', 
                    textAlign: 'right', 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    color: '#1A1A1A' 
                  }}>
                    {cat.horas}h ({cat.porcentagem}%)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Destaque + Rodapé */}
          <div style={{ marginTop: 'auto' }}>
            {/* Melhor Mês */}
            <div style={{ 
              backgroundColor: '#F5EDE7', 
              padding: '25px', 
              borderRadius: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '24px', color: '#6B6B6B', textAlign: 'center' }}>
                🏆 Melhor mês: <span style={{ fontWeight: 'bold', color: '#1A1A1A' }}>{relatorio.melhorMes.mes}</span> ({relatorio.melhorMes.tarefas} tarefas)
              </div>
            </div>

            {/* Rodapé com Data/Hora */}
            <div style={{ 
              textAlign: 'center', 
              padding: '20px 0',
              borderTop: '1px solid #E5E5E5'
            }}>
              <div style={{ fontSize: '16px', color: '#999', marginBottom: '5px' }}>
                Gerado em {new Date().toLocaleDateString('pt-BR', { 
                  day: '2-digit', 
                  month: 'long', 
                  year: 'numeric' 
                })} às {new Date().toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#8B7355',
                letterSpacing: '0.1em'
              }}>
                TRUEFOCUS
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}