import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Pause, Play, Square } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { translations } from '../utils/translations';
import { getCategoryName } from '../utils/category-mapper';

type ClockState = 'setup' | 'running' | 'paused';

type FocusCategory = 'Work' | 'Study' | 'Exercise' | 'Critical Thinking' | 'Spirituality' | null;

export function FocusClock() {
  const navigate = useNavigate();
  const { addTask, selectedDate, settings } = useApp();
  const t = translations[settings.language];
  
  const [state, setState] = useState<ClockState>('setup');
  const [activity, setActivity] = useState('');
  const [freeTextInput, setFreeTextInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FocusCategory>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const totalPausedDurationRef = useRef<number>(0);

  // Cronômetro baseado em timestamps reais (não em incrementos)
  useEffect(() => {
    if (state === 'running') {
      // Atualizar a cada 100ms para maior precisão visual
      intervalRef.current = window.setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current - totalPausedDurationRef.current) / 1000);
        setElapsedSeconds(elapsed);
        
        // Salvar no localStorage
        localStorage.setItem('focusClock', JSON.stringify({
          activity,
          startTime: startTimeRef.current,
          totalPausedDuration: totalPausedDurationRef.current,
          state: 'running'
        }));
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Salvar estado pausado
      if (state === 'paused') {
        localStorage.setItem('focusClock', JSON.stringify({
          activity,
          startTime: startTimeRef.current,
          totalPausedDuration: totalPausedDurationRef.current,
          pausedTime: pausedTimeRef.current,
          state: 'paused'
        }));
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state, activity]);

  // Restaurar sessão ao montar componente
  useEffect(() => {
    const saved = localStorage.getItem('focusClock');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setActivity(data.activity);
        startTimeRef.current = data.startTime;
        totalPausedDurationRef.current = data.totalPausedDuration || 0;
        
        if (data.state === 'paused') {
          pausedTimeRef.current = data.pausedTime;
          const elapsed = Math.floor((data.pausedTime - data.startTime - data.totalPausedDuration) / 1000);
          setElapsedSeconds(elapsed);
          setState('paused');
        } else {
          // Se estava rodando, calcular tempo desde então
          const now = Date.now();
          const elapsed = Math.floor((now - data.startTime - data.totalPausedDuration) / 1000);
          setElapsedSeconds(elapsed);
          setState('running');
        }
      } catch (e) {
        console.error('Error restoring focus session:', e);
        localStorage.removeItem('focusClock');
      }
    }
  }, []);

  // Wake Lock para manter tela ligada
  useEffect(() => {
    const requestWakeLock = async () => {
      // Verificar se Wake Lock está disponível
      if (!('wakeLock' in navigator)) {
        console.log('Wake Lock não suportado neste navegador');
        return;
      }

      // Verificar se já temos um wake lock ativo
      if (wakeLockRef.current !== null) {
        return;
      }

      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('✅ Wake Lock ativado com sucesso');

        // Listener para quando o wake lock é liberado
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock foi liberado');
        });
      } catch (err: any) {
        // Erros comuns:
        // - NotAllowedError: usuário negou permissão ou política de permissões
        // - NotSupportedError: recurso não suportado
        if (err.name === 'NotAllowedError') {
          console.log('Wake Lock não permitido - continuando sem manter tela ligada');
        } else {
          console.log('Wake Lock não disponível:', err.name);
        }
        wakeLockRef.current = null;
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current !== null) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
          console.log('Wake Lock liberado');
        } catch (err) {
          console.error('Erro ao liberar Wake Lock:', err);
        }
      }
    };

    if (state === 'running') {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [state]);

  const handleStart = () => {
    if (!activity.trim()) return;
    
    // Som de início
    if (settings.sound) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0NVKzn77NeGQc+ltryy3ksBSh+zPDbkUAKE2Gy6OyrWBQLSKLi8sFuJAUuhM/z1oU1Bx1uvO/mnVQODlWs6PDOZRsHPJfe8s98LQYmfdDx3Y9ACxBes+nqqlgUC0mi4/K+');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }

    setState('running');
    setElapsedSeconds(0);
    startTimeRef.current = Date.now();
  };

  const handlePause = () => {
    setState('paused');
    pausedTimeRef.current = Date.now();
  };

  const handleResume = () => {
    setState('running');
    totalPausedDurationRef.current += Date.now() - pausedTimeRef.current;
  };

  const handleConfirmFinish = () => {
    setShowFinishDialog(true);
  };

  const handleFinish = async () => {
    setShowFinishDialog(false);
    
    // Som de conclusão
    if (settings.sound) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0NVKzn77NeGQc+ltryy3ksBSh+zPDbkUAKE2Gy6OyrWBQLSKLi8sFuJAUuhM/z1oU1Bx1uvO/mnVQODlWs6PDOZRsHPJfe8s98LQYmfdDx3Y9ACxBes+nqqlgUC0mi4/K+byQFMIXP89eDNQccb7zv5Z5UDQ5VrOjwzmUbBzyX3vLPfC0GJn3Q8d2PQAsQXrPp6qpYFAtJouPyvm8kBTCFz/PXgzUHHG+87+WeVA0OVazo8M5lGwc8l97yz3wtBiZ90PHdj0ALEF6z6eqqWBQLSaLj8r5vJAUwhc/z14M1Bxxvvu/lnlQNDlWs6PDOZRsHPJfe8s98LQYmfdDx3Y9ACxBes+nqqlgUC0mi4/K+');
      audio.volume = 0.4;
      audio.play().catch(() => {});
    }

    try {
      const minutes = Math.floor(elapsedSeconds / 60);
      
      // Definir texto e categoria corretamente
      let taskText: string;
      let taskCategory: string | undefined;
      
      if (selectedCategory) {
        // Se foi categoria: texto = tradução da categoria para exibição
        taskText = `${t.focusLabel} - ${getCategoryName(selectedCategory, settings.language)}`;
        taskCategory = selectedCategory; // Categoria em inglês para o banco
      } else {
        // Se foi texto livre: texto = o que foi digitado
        taskText = activity;
        taskCategory = undefined;
      }
      
      console.log('📌 Salvando tarefa - Texto:', taskText);
      console.log('📌 Salvando tarefa - Categoria:', taskCategory);
      
      // Criar tarefa automática
      await addTask({
        text: taskText,
        category: taskCategory,
        duration_min: minutes,
        date: selectedDate,
        mode: 'tempo'
      });

      // Limpar localStorage
      localStorage.removeItem('focusClock');

      // Voltar para Home
      navigate('/home');
    } catch (error) {
      console.error('Error saving focus session:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}${t.hours} ${minutes}${t.minutesShort} ${secs}${t.secondsShort}`;
    } else if (minutes > 0) {
      return `${minutes}${t.minutesShort} ${secs}${t.secondsShort}`;
    } else {
      return `${secs}${t.secondsShort}`;
    }
  };

  // Setup Screen
  if (state === 'setup') {
    const categories: FocusCategory[] = ['Work', 'Study', 'Exercise', 'Critical Thinking', 'Spirituality'];
    
    const handleCategoryClick = (category: FocusCategory) => {
      if (selectedCategory === category) {
        // Desmarcar se clicar novamente
        setSelectedCategory(null);
      } else {
        setSelectedCategory(category);
        // Limpar texto livre ao selecionar categoria
        setFreeTextInput('');
        // Definir activity como a categoria
        setActivity(category || '');
      }
    };
    
    const handleFreeTextChange = (text: string) => {
      setFreeTextInput(text);
      setActivity(text);
      // Desmarcar categoria ao escrever
      if (text.trim()) {
        setSelectedCategory(null);
      }
    };
    
    const canStart = freeTextInput.trim() || selectedCategory;
    
    return (
      <div className="min-h-screen flex items-start justify-center px-5 pt-8 pb-32 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#151515] rounded-2xl p-8 border border-[#E8E8E8] dark:border-[#2A2A2A]"
        >
          <h2 className="font-serif text-3xl font-light mb-8 text-[#1A1A1A] dark:text-[#F5F5F5] text-center">
            {t.focusClock}
          </h2>
          
          {/* Campo de Texto Livre */}
          <div className="mb-6">
            <label className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] mb-3 block font-medium">
              {t.whatIsYourFocus}
            </label>
            <input
              type="text"
              placeholder={t.writeFreely}
              value={freeTextInput}
              onChange={(e) => handleFreeTextChange(e.target.value)}
              maxLength={100}
              disabled={!!selectedCategory}
              className={`w-full px-4 py-3 rounded-lg border border-[#E8E8E8] dark:border-[#2A2A2A] bg-[#FAFAF8] dark:bg-[#0A0A0A] text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#8B7355] dark:focus:ring-[#A89580] transition-all duration-300 ${
                selectedCategory ? 'opacity-40 cursor-not-allowed' : ''
              }`}
              autoFocus
            />
          </div>

          {/* Divisor */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#E8E8E8] dark:bg-[#2A2A2A]"></div>
            <span className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0]">{t.orChoose}</span>
            <div className="flex-1 h-px bg-[#E8E8E8] dark:bg-[#2A2A2A]"></div>
          </div>

          {/* Categorias */}
          <div className="mb-8">
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  disabled={!!freeTextInput.trim()}
                  className={`px-3 py-3 rounded-lg border-2 transition-all duration-300 font-medium text-xs text-left min-h-[48px] flex items-center ${
                    selectedCategory === category
                      ? 'border-[#8B7355] dark:border-[#A89580] bg-[#8B7355] dark:bg-[#A89580] text-white'
                      : freeTextInput.trim()
                      ? 'border-[#E8E8E8] dark:border-[#2A2A2A] bg-[#FAFAF8] dark:bg-[#0A0A0A] text-[#6B6B6B] dark:text-[#A0A0A0] opacity-40 cursor-not-allowed'
                      : 'border-[#E8E8E8] dark:border-[#2A2A2A] bg-[#FAFAF8] dark:bg-[#0A0A0A] text-[#1A1A1A] dark:text-[#F5F5F5] hover:border-[#8B7355] dark:hover:border-[#A89580] hover:bg-[#8B7355]/5 dark:hover:bg-[#A89580]/5'
                  }`}
                >
                  {getCategoryName(category, settings.language)}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full bg-[#8B7355] dark:bg-[#A89580] hover:bg-[#6B5943] dark:hover:bg-[#8B7355] text-white py-6 text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
          >
            {t.startTimer}
          </Button>
        </motion.div>
      </div>
    );
  }

  // Running/Paused Screen - Fullscreen
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#FAFAFA] via-[#F5F5F5] to-[#FAFAFA] dark:from-[#000000] dark:via-[#0A0A0A] dark:to-[#000000] flex flex-col items-center justify-start pt-16 pb-64">
      {/* Relógio Analgico + Digital */}
      <div className="relative mb-12">
        <AnalogClock elapsedSeconds={elapsedSeconds} isRunning={state === 'running'} />
        
        {/* Cronômetro Digital (centro) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="font-mono text-5xl font-normal text-[#1A1A1A] dark:text-[#E0E0E0]">
            {formatTime(elapsedSeconds)}
          </p>
        </div>
      </div>

      {/* Label de Atividade */}
      <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] mb-2">
        {t.focusingOn}
      </p>
      <p className="text-base font-medium text-[#1A1A1A] dark:text-[#F5F5F5] mb-8 max-w-md text-center px-4">
        {selectedCategory ? getCategoryName(selectedCategory, settings.language) : activity}
      </p>

      {state === 'paused' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[#FF6B35] dark:text-[#FF8A65] font-semibold mb-8"
        >
          {t.paused}
        </motion.p>
      )}

      {/* Botões Inferiores */}
      <div className="fixed bottom-20 left-0 right-0 flex gap-4 justify-center px-5">
        {state === 'running' ? (
          <Button
            onClick={handlePause}
            variant="outline"
            className="min-w-[140px] h-11 border-[#6B6B6B] text-[#6B6B6B] dark:border-[#A0A0A0] dark:text-[#A0A0A0] hover:bg-[#6B6B6B]/10"
          >
            <Pause className="w-4 h-4 mr-2" />
            {t.pause}
          </Button>
        ) : (
          <Button
            onClick={handleResume}
            variant="outline"
            className="min-w-[140px] h-11 border-[#1565C0] text-[#1565C0] dark:border-[#42A5F5] dark:text-[#42A5F5] hover:bg-[#1565C0]/10"
          >
            <Play className="w-4 h-4 mr-2" />
            {t.resume}
          </Button>
        )}

        <Button
          onClick={handleConfirmFinish}
          variant="outline"
          className="min-w-[140px] h-11 border-[#4CAF50] text-[#4CAF50] dark:border-[#66BB6A] dark:text-[#66BB6A] hover:bg-[#4CAF50]/10"
        >
          <Square className="w-4 h-4 mr-2" />
          {t.finishSession}
        </Button>
      </div>

      {/* Confirm Finish Dialog */}
      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent className="bg-[#FFFFFF] dark:bg-[#151515] border border-[#E8E8E8] dark:border-[#2A2A2A]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">
              {t.finishFocusSession}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="mt-6 space-y-4">
                <p className="text-[#1A1A1A] dark:text-[#F5F5F5]">
                  {t.youFocusedFor} <strong>{formatDuration(elapsedSeconds)}</strong>
                </p>
                <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">
                  {t.activity} {selectedCategory ? getCategoryName(selectedCategory, settings.language) : activity}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="border-[#E8E8E8] dark:border-[#2A2A2A]">
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinish}
              className="bg-[#4CAF50] dark:bg-[#66BB6A] hover:opacity-90"
            >
              {t.register}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Componente do Relógio Analógico
function AnalogClock({ elapsedSeconds, isRunning }: { elapsedSeconds: number; isRunning: boolean }) {
  const now = new Date();
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  
  // Calcular ângulos baseados no tempo atual
  const hourAngle = (hours * 30) + (minutes * 0.5);
  const minuteAngle = minutes * 6;
  
  // Para os segundos, usar elapsedSeconds diretamente para rotação contínua
  const secondAngle = (elapsedSeconds * 6) % 360;

  return (
    <div className="relative w-[280px] h-[280px]">
      {/* Círculo externo */}
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.4"
          className="text-[#E0E0E0] dark:text-[#333333]"
        />
        
        {/* Ponteiro das horas */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="30"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          className="text-[#1A1A1A] dark:text-[#E0E0E0]"
          style={{
            transform: `rotate(${hourAngle}deg)`,
            transformOrigin: '50% 50%',
            transition: isRunning ? 'transform 1s linear' : 'none'
          }}
        />
        
        {/* Ponteiro dos minutos */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="20"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          className="text-[#1A1A1A] dark:text-[#E0E0E0]"
          style={{
            transform: `rotate(${minuteAngle}deg)`,
            transformOrigin: '50% 50%',
            transition: isRunning ? 'transform 1s linear' : 'none'
          }}
        />
        
        {/* Ponteiro dos segundos - rotação contínua sem reset */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="15"
          stroke="#FF6B35"
          strokeWidth="0.4"
          strokeLinecap="round"
          style={{
            transform: `rotate(${elapsedSeconds * 6}deg)`,
            transformOrigin: '50% 50%',
            transition: isRunning ? 'transform 1s linear' : 'none'
          }}
        />
        
        {/* Centro */}
        <circle
          cx="50"
          cy="50"
          r="1"
          fill="currentColor"
          className="text-[#1A1A1A] dark:text-[#E0E0E0]"
        />
      </svg>
    </div>
  );
}