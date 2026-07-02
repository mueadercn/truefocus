import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface NotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string; // YYYY-MM-DD
  displayDate: string; // texto amigável do dia
  language: 'en' | 'pt';
  onSave: (content: string) => Promise<void>;
  translations: any;
}

export function NotesModal({
  open,
  onOpenChange,
  date,
  displayDate,
  language,
  onSave,
  translations,
}: NotesModalProps) {
  const t = translations;
  const [content, setContent] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const recognitionRef = useRef<any>(null);
  const contentRef = useRef('');

  // Manter ref sincronizado (para append da transcrição sem perder o que já foi digitado)
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Limpar ao fechar
  useEffect(() => {
    if (!open) {
      stopListening();
      setContent('');
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
        const base = contentRef.current;
        const separator = base && !base.endsWith(' ') && !base.endsWith('\n') ? ' ' : '';
        setContent(base + separator + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error(t.microphonePermission || 'Microphone permission denied');
      }
      stopListening();
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      onOpenChange(false);
      return;
    }
    setIsSaving(true);
    try {
      stopListening();
      await onSave(trimmed);
      setContent('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#FFFFFF] dark:bg-[#151515] border border-[#E8E8E8] dark:border-[#2A2A2A]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">
            {t.notesTitle || 'Anotações'}
          </DialogTitle>
          <DialogDescription className="text-[#6B6B6B] dark:text-[#A0A0A0] capitalize">
            {displayDate}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t.noteInputPlaceholder || 'Escreva ou fale seus pensamentos, insights, ideias...'}
            rows={7}
            autoFocus
            className="w-full resize-none rounded-xl border border-[#E8E8E8] dark:border-[#2A2A2A] bg-[#FAFAF8] dark:bg-[#0A0A0A] p-4 pr-12 text-sm text-[#1A1A1A] dark:text-[#F5F5F5] placeholder:text-[#6B6B6B] dark:placeholder:text-[#A0A0A0] focus:outline-none focus:border-[#8B7355] dark:focus:border-[#A89580] transition-colors"
          />
          {/* Botão de microfone */}
          <button
            type="button"
            onClick={startListening}
            className={`absolute top-3 right-3 p-2 rounded-lg transition-all duration-200 ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-[#FFFFFF] dark:bg-[#151515] border border-[#8B7355] dark:border-[#A89580] text-[#8B7355] dark:text-[#A89580] hover:bg-[#8B7355]/10'
            }`}
            title={isListening ? (t.stopRecording || 'Parar') : (t.startRecording || 'Gravar')}
          >
            {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>

        {isListening && (
          <p className="text-xs text-red-500 flex items-center gap-1.5 -mt-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {t.listening || 'Ouvindo...'}
          </p>
        )}

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-[#8B7355] dark:bg-[#A89580] text-white hover:bg-[#6D5A43] dark:hover:bg-[#C4B5A0]"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t.saveNote || 'Salvar anotação'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
