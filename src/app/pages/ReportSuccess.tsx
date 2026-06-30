import { useNavigate } from 'react-router';
import { CheckCircle, Home, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translations } from '../utils/translations';

export function ReportSuccess() {
  const navigate = useNavigate();
  const { settings } = useApp();
  const t = translations[settings.language];

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1A1A] flex flex-col items-center justify-center p-6">
      {/* Header com Botão Voltar */}
      <div className="absolute top-5 left-5">
        <button
          onClick={() => navigate('/home')}
          className="p-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-full transition-all duration-300 border border-[#2A2A2A]"
        >
          <X className="w-5 h-5 text-[#A0A0A0]" />
        </button>
      </div>

      {/* Conteúdo mais para cima */}
      <div className="pt-20 px-4 max-w-md w-full mx-auto">
        {/* Ícone de sucesso com animação */}
        <div className="mb-8 relative">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#8B7355] to-[#A89580] rounded-full flex items-center justify-center animate-[scale-in_0.5s_ease-out]">
            <CheckCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
          </div>
          
          {/* Círculos decorativos animados */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 border-4 border-[#8B7355]/30 rounded-full animate-[ping_1.5s_ease-out]"></div>
          </div>
        </div>

        {/* Título */}
        <h1 className="font-serif text-4xl font-light text-[#F5F5F5] mb-4 text-center">
          {t.pdfReportGenerated}
        </h1>

        {/* Descrição */}
        <p className="text-base text-[#A0A0A0] mb-8 leading-relaxed text-center">
          {t.reportReady}<br />
          {t.saveAsPDF}<br />
          {t.printDialogOpened}
        </p>

        {/* Divisor decorativo */}
        <div className="my-8 flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#2A2A2A]"></div>
          <div className="w-2 h-2 bg-[#8B7355] rounded-full"></div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#2A2A2A]"></div>
        </div>

        {/* Instruções extras */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 mb-8">
          <p className="text-sm text-[#6B6B6B] mb-3">{t.reportTip}</p>
          <ul className="space-y-2 text-sm text-[#A0A0A0]">
            <li className="flex items-start gap-2">
              <span className="text-[#8B7355] mt-0.5">•</span>
              <span>{t.popupBlockerWarning}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8B7355] mt-0.5">•</span>
              <span>{t.saveAsPDFInstruction}</span>
            </li>
          </ul>
        </div>

        {/* Botão de ação */}
        <button
          onClick={() => navigate('/home')}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#8B7355] to-[#A89580] text-white rounded-xl hover:shadow-lg hover:shadow-[#8B7355]/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-medium"
        >
          <Home className="w-5 h-5" />
          {t.backToHome}
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
  );
}