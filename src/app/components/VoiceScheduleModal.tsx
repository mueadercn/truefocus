import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Calendar, Clock, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { aiParseVoiceTask } from '../lib/ai-api';
import type { ParsedVoiceTask } from '../types';

interface VoiceScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: 'en' | 'pt';
  currentDate: string; // hoje (YYYY-MM-DD)
  onConfirm: (task: { title: string; date: string; time: string | null }) => Promise<void>;
  translations: any;
}

export function VoiceScheduleModal({
  open,
  onOpenChange,
  language,
  currentDate,
  onConfirm,
  translations,
}: VoiceScheduleModalProps) {
  const t = translations;
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Campos editáveis após a IA processar
  const [parsed, setParsed] = useState<ParsedVoiceTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Resetar tudo ao fechar
  useEffect(() => {
    if (!open) {
      stopListening();
      setTranscript('');
      setParsed(null);
      setEditTitle('');
      setEditDate('');
      setEditTime('');
      setIsProcessing(false);
      setIsSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(t.voiceNotSupported || 'Voice recognition not supported in this browser');
      return;
    }
    if (isListening) {
      stopListening();
      return;
    }

    const recognition = new SpeechRecognition();
    // Segue o idioma do app: pt-BR quando em português, en-US quando em inglês
    recognition.lang = language === 'pt' ? 'pt-BR' : 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        const base = transcriptRef.current;
        const sep = base && !base.endsWith(' ') ? ' ' : '';
        setTranscript(base + sep + finalTranscript);
      }
    };
    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        toast.error(t.microphonePermission || 'Microphone permission denied');
      }
      stopListening();
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleProcess = async () => {
    const text = transcript.trim();
    if (!text) return;
    stopListening();
    setIsProcessing(true);
    try {
      const result = await aiParseVoiceTask(text, currentDate);
      setParsed(result);
      setEditTitle(result.title || '');
      setEditDate(result.date || currentDate);
      setEditTime(result.time || '');
    } catch (error) {
      console.error('Error processing voice task:', error);
      toast.error(t.aiProcessError || 'Erro ao processar. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!editTitle.trim() || !editDate) return;
    setIsSaving(true);
    try {
      await onConfirm({
        title: editTitle.trim(),
        date: editDate,
        time: editTime || null,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error confirming scheduled task:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#FFFFFF] dark:bg-[#151515] border border-[#E8E8E8] dark:border-[#2A2A2A]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-light text-[#1A1A1A] dark:text-[#F5F5F5] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#8B7355] dark:text-[#A89580]" />
            {t.scheduleByVoice || 'Agendar por voz'}
          </DialogTitle>
          <DialogDescription className="text-[#6B6B6B] dark:text-[#A0A0A0]">
            {parsed
              ? t.scheduleConfirmHint || 'Confira e ajuste se necessário, depois confirme.'
              : t.scheduleVoiceHint || 'Fale a data, hora e o compromisso. Ex: "Consulta médica dia 24 de julho às 9h"'}
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          // ETAPA 1: Gravação / transcrição
          <div className="space-y-4">
            <div className="relative">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={t.scheduleVoicePlaceholder || 'Fale ou escreva o compromisso...'}
                rows={4}
                className="w-full resize-none rounded-xl border border-[#E8E8E8] dark:border-[#2A2A2A] bg-[#FAFAF8] dark:bg-[#0A0A0A] p-4 pr-12 text-sm text-[#1A1A1A] dark:text-[#F5F5F5] placeholder:text-[#6B6B6B] dark:placeholder:text-[#A0A0A0] focus:outline-none focus:border-[#8B7355] dark:focus:border-[#A89580] transition-colors"
              />
              <button
                type="button"
                onClick={startListening}
                className={`absolute top-3 right-3 p-2 rounded-lg transition-all duration-200 ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-[#FFFFFF] dark:bg-[#151515] border border-[#8B7355] dark:border-[#A89580] text-[#8B7355] dark:text-[#A89580] hover:bg-[#8B7355]/10'
                }`}
              >
                {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            {isListening && (
              <p className="text-xs text-red-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {t.listening || 'Ouvindo...'}
              </p>
            )}

            <Button
              onClick={handleProcess}
              disabled={!transcript.trim() || isProcessing}
              className="w-full bg-[#8B7355] dark:bg-[#A89580] text-white hover:bg-[#6D5A43] dark:hover:bg-[#C4B5A0]"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.aiProcessing || 'Processando...'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t.processWithAI || 'Processar com IA'}
                </span>
              )}
            </Button>
          </div>
        ) : (
          // ETAPA 2: Confirmação editável
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] uppercase tracking-wider">
                {t.scheduleTitleLabel || 'Compromisso'}
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full mt-1 rounded-xl border border-[#E8E8E8] dark:border-[#2A2A2A] bg-[#FAFAF8] dark:bg-[#0A0A0A] px-4 py-3 text-sm text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none focus:border-[#8B7355] dark:focus:border-[#A89580]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {t.scheduleDateLabel || 'Data'}
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-[#E8E8E8] dark:border-[#2A2A2A] bg-[#FAFAF8] dark:bg-[#0A0A0A] px-3 py-3 text-sm text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none focus:border-[#8B7355] dark:focus:border-[#A89580]"
                />
              </div>
              <div>
                <label className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {t.scheduleTimeLabel || 'Hora'}
                </label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-[#E8E8E8] dark:border-[#2A2A2A] bg-[#FAFAF8] dark:bg-[#0A0A0A] px-3 py-3 text-sm text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none focus:border-[#8B7355] dark:focus:border-[#A89580]"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setParsed(null)}
                variant="outline"
                className="flex-1 border-[#E8E8E8] dark:border-[#2A2A2A] text-[#6B6B6B] dark:text-[#A0A0A0]"
              >
                {t.back || 'Voltar'}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!editTitle.trim() || !editDate || isSaving}
                className="flex-1 bg-[#8B7355] dark:bg-[#A89580] text-white hover:bg-[#6D5A43] dark:hover:bg-[#C4B5A0]"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t.confirm || 'Confirmar'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
