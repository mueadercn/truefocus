import { X, FileText, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { useState, useEffect } from 'react';
import { translations } from '../utils/translations';

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportModal({ open, onOpenChange }: ReportModalProps) {
  const navigate = useNavigate();
  const { tasks, rescues, settings } = useApp();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const t = translations[settings.language];

  const handlePDFExport = async () => {
    setIsGeneratingPDF(true);
    
    // Aguardar 2 segundos para mostrar o loader
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Navegar para a página com parâmetro para auto-print
    navigate('/home/relatorio-anual?autoprint=true');
    
    // Fechar modal após navegar
    onOpenChange(false);
    setIsGeneratingPDF(false);
  };

  const handleShareExport = () => {
    navigate('/home/relatorio-compartilhar');
    onOpenChange(false);
  };

  if (!open) return null;

  // Se está gerando PDF, mostrar loader
  if (isGeneratingPDF) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-[#151515] rounded-2xl p-8 mx-4 w-full max-w-md shadow-2xl border border-gray-200 dark:border-[#2A2A2A] text-center">
          {/* Loading Animation */}
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto border-4 border-[#8B7355]/20 border-t-[#8B7355] rounded-full animate-spin"></div>
          </div>
          
          {/* Loading Text */}
          <h3 className="font-serif text-xl font-light text-[#1A1A1A] dark:text-[#F5F5F5] mb-2">
            {t.reportGenerating}
          </h3>
          <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">
            {t.preparingPDF}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div 
        className="bg-white dark:bg-[#151515] rounded-2xl p-6 mx-4 w-full max-w-md shadow-2xl border border-gray-200 dark:border-[#2A2A2A]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">
            {t.annualReportTitle}
          </h2>
          <button
            onClick={onOpenChange.bind(null, false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#2A2A2A] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#6B6B6B] dark:text-[#A0A0A0]" />
          </button>
        </div>

        {/* Subtitle */}
        <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] mb-6">
          {t.reportExportChoose} {new Date().getFullYear()}:
        </p>

        {/* Options */}
        <div className="space-y-3">
          {/* PDF Option */}
          <button
            onClick={handlePDFExport}
            className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-[#8B7355] to-[#6D5A43] dark:from-[#A89580] dark:to-[#C4B5A0] text-white rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-base">{t.pdfComplete}</h3>
              <p className="text-sm opacity-90">{t.pdfPages}</p>
            </div>
          </button>

          {/* Share Option */}
          <button
            onClick={handleShareExport}
            className="w-full flex items-center gap-4 p-4 bg-white dark:bg-[#0A0A0A] border-2 border-[#8B7355] dark:border-[#A89580] text-[#1A1A1A] dark:text-[#F5F5F5] rounded-xl hover:bg-gray-50 dark:hover:bg-[#2A2A2A]/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-[#8B7355]/10 dark:bg-[#A89580]/10 rounded-lg flex items-center justify-center">
              <Share2 className="w-6 h-6 text-[#8B7355] dark:text-[#A89580]" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-base">{t.shareReport}</h3>
              <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">{t.shareDescription}</p>
            </div>
          </button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-center text-[#6B6B6B] dark:text-[#A0A0A0] mt-6">
          {t.pdfIdealNote}
        </p>
      </div>
    </div>
  );
}