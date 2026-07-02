import { format, addDays, subDays, parseISO } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { translations } from '../utils/translations';
import { getCategoryName } from '../utils/category-mapper';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import type { Task, Deadline } from '../types';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { DraggableTask } from '../components/DraggableTask';
import { NotesModal } from '../components/NotesModal';
import { VoiceScheduleModal } from '../components/VoiceScheduleModal';
import {
  Play,
  Check,
  Plus,
  ScrollText,
  CalendarPlus,
  ListChecks,
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Edit2, 
  X, 
  Clock, 
  Mic, 
  Square,
  Volume2,
  VolumeX,
  Loader2,
  Sparkles,
  Pencil
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';

export function Home() {
  const { tasks, deadlines, notes, selectedDate, setSelectedDate, addTask, updateTask, completeTask, deleteTask, addNote, loading, settings } = useApp();
  const navigate = useNavigate();
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [editTaskText, setEditTaskText] = useState('');
  const [taskMode, setTaskMode] = useState<'livre' | 'tempo' | 'recorrentes'>('livre');
  const [newTaskData, setNewTaskData] = useState({
    text: '',
    category: 'Work' as Task['category'],
    duration_min: 60,
  });
  const [selectedRecurrentTasks, setSelectedRecurrentTasks] = useState<Set<string>>(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);

  const t = translations[settings.language];
  const dateLocale = settings.language === 'pt' ? ptBR : enUS;

  // Notes modal state
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Voice input state
  const [showVoiceChoice, setShowVoiceChoice] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceTasks, setVoiceTasks] = useState(['', '', '']);
  const [isListening, setIsListening] = useState(false);
  const [currentVoiceField, setCurrentVoiceField] = useState<number>(0);
  const recognitionRef = useRef<any>(null);

  // Swipe detection
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevDateRef = useRef<string>(selectedDate);
  const isSwiping = useRef<boolean>(false);
  const hasMoved = useRef<boolean>(false);

  // Trigger transition when date changes
  useEffect(() => {
    if (prevDateRef.current !== selectedDate) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 500);
      prevDateRef.current = selectedDate;
      return () => clearTimeout(timer);
    }
  }, [selectedDate]);

  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      isSwiping.current = true;
      hasMoved.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchEndX.current = e.touches[0].clientX;
      if (Math.abs(touchStartX.current - touchEndX.current) > minSwipeDistance) {
        hasMoved.current = true;
      }
    };

    const handleTouchEnd = () => {
      if (!isSwiping.current || !hasMoved.current) {
        isSwiping.current = false;
        hasMoved.current = false;
        return;
      }

      const distance = touchStartX.current - touchEndX.current;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe) {
        // Swipe left -> next day
        handleNextDay();
      } else if (isRightSwipe) {
        // Swipe right -> previous day
        handlePreviousDay();
      }

      isSwiping.current = false;
      hasMoved.current = false;
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [selectedDate]); // Re-attach listeners when date changes

  // Filter tasks for selected date
  const todayTasks = useMemo(() => {
    return tasks.filter(t => t.date === selectedDate);
  }, [tasks, selectedDate]);

  const completedTasks = todayTasks.filter(t => t.completed);
  const pendingTasks = todayTasks.filter(t => !t.completed);

  // Sort pending tasks by order (drag-and-drop)
  const sortedPendingTasks = useMemo(() => {
    return [...pendingTasks].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [pendingTasks.map(t => `${t.id}-${t.order}`).join(',')]);

  // Local state for immediate drag-and-drop feedback
  const [orderedPendingTasks, setOrderedPendingTasks] = useState<Task[]>([]);

  // Update ordered tasks when sorted tasks change
  useEffect(() => {
    setOrderedPendingTasks(sortedPendingTasks);
  }, [sortedPendingTasks]);

  // Drag-and-drop move function
  const moveTask = useCallback(
    async (dragIndex: number, hoverIndex: number) => {
      const dragTask = orderedPendingTasks[dragIndex];
      const newOrderedTasks = [...orderedPendingTasks];
      
      // Remove task from drag position
      newOrderedTasks.splice(dragIndex, 1);
      // Insert at hover position
      newOrderedTasks.splice(hoverIndex, 0, dragTask);
      
      // Update visual order immediately for smooth UX
      setOrderedPendingTasks(newOrderedTasks);
      
      // Debounce database updates - only update the moved task's order
      // This is much faster than updating all tasks
      try {
        await updateTask(dragTask.id, { order: hoverIndex });
        
        // Update other affected tasks in background
        const updatePromises = newOrderedTasks
          .filter((task, idx) => idx !== hoverIndex && task.order !== idx)
          .map((task, idx) => updateTask(task.id, { order: idx }));
        
        // Fire and forget - don't await to keep UI responsive
        Promise.all(updatePromises).catch(err => 
          console.error('Error updating task orders:', err)
        );
      } catch (error) {
        console.error('Error updating dragged task order:', error);
      }
    },
    [orderedPendingTasks, updateTask]
  );

  // Get category color
  const getCategoryColor = (category?: string) => {
    if (!category) return 'bg-[#6B6B6B] dark:bg-[#A0A0A0]';
    switch (category) {
      case 'Trabalho':
      case 'Work':
        return 'bg-[#3B82F6]';
      case 'Exercício':
      case 'Exercise':
        return 'bg-[#10B981]';
      case 'Estudo':
      case 'Study':
        return 'bg-[#8B5CF6]';
      case 'Pensamento Crítico':
      case 'Critical Thinking':
        return 'bg-[#F59E0B]';
      case 'Espiritualidade':
      case 'Spirituality':
        return 'bg-[#EC4899]';
      default:
        return 'bg-[#6B6B6B] dark:bg-[#A0A0A0]';
    }
  };

  // Detect touch device
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Calculate most recurrent tasks (based on text similarity)
  const recurrentTasks = useMemo(() => {
    const taskFrequency = new Map<string, { count: number; task: Task }>();
    
    tasks.forEach(task => {
      const normalizedText = task.text.toLowerCase().trim();
      const existing = taskFrequency.get(normalizedText);
      
      if (existing) {
        existing.count++;
      } else {
        taskFrequency.set(normalizedText, { count: 1, task });
      }
    });
    
    // Filter tasks that appear at least 2 times and sort by frequency
    return Array.from(taskFrequency.values())
      .filter(item => item.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8) // Top 8 most recurrent
      .map(item => ({ ...item.task, frequency: item.count }));
  }, [tasks]);

  // Calculate metrics
  const totalScheduled = todayTasks.length;
  const totalCompleted = completedTasks.length;
  const totalMinutes = completedTasks.reduce((sum, t) => sum + (t.duration_min || 0), 0);
  const totalScheduledMinutes = todayTasks.reduce((sum, t) => sum + (t.duration_min || 0), 0);

  // Format minutes to hours and minutes
  const formatTime = (minutes: number) => {
    const hours = minutes / 60;
    return hours % 1 === 0 ? `${Math.round(hours)}h` : `${hours.toFixed(1)}h`;
  };

  // Date navigation
  const handlePreviousDay = () => {
    setIsTransitioning(true);
    const date = parseISO(selectedDate);
    setSelectedDate(format(subDays(date, 1), 'yyyy-MM-dd'));
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handleNextDay = () => {
    setIsTransitioning(true);
    const date = parseISO(selectedDate);
    setSelectedDate(format(addDays(date, 1), 'yyyy-MM-dd'));
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handleToday = () => {
    setIsTransitioning(true);
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    setTimeout(() => setIsTransitioning(false), 500);
  };

  // Check if selected date is in the past
  const isPastDate = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return selectedDate < today;
  }, [selectedDate]);

  // Format date for display
  const displayDate = useMemo(() => {
    try {
      const date = parseISO(selectedDate);
      return format(date, "EEEE, dd MMM yyyy", { locale: dateLocale });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const handleCreateTask = async () => {
    if (taskMode === 'livre' && !newTaskData.text.trim()) return;
    if (taskMode === 'tempo' && !newTaskData.text.trim()) return;
    if (taskMode === 'recorrentes' && selectedRecurrentTasks.size === 0) return;

    try {
      if (taskMode === 'recorrentes') {
        // Criar múltiplas tarefas das selecionadas
        const tasksToCreate = Array.from(selectedRecurrentTasks).map(taskId => {
          const index = parseInt(taskId.replace('recurrent-', ''));
          const task = recurrentTasks[index];
          return addTask({
            text: task.text,
            category: task.category,
            duration_min: task.duration_min,
            date: selectedDate,
            mode: task.mode
          });
        });
        
        await Promise.all(tasksToCreate);
        setShowNewTaskModal(false);
        setSelectedRecurrentTasks(new Set());
        setTaskMode('livre');
      } else {
        await addTask({
          text: newTaskData.text,
          category: taskMode === 'tempo' ? newTaskData.category : undefined,
          duration_min: taskMode === 'tempo' ? newTaskData.duration_min : undefined,
          date: selectedDate,
          mode: taskMode
        });
        setShowNewTaskModal(false);
        setNewTaskData({ text: '', category: 'Work', duration_min: 60 });
        setTaskMode('livre');
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleCompleteClick = (task: Task) => {
    console.log('✅ Complete clicked:', task.id, task.text);
    setTaskToComplete(task);
  };

  const handleConfirmComplete = async () => {
    if (!taskToComplete) return;
    try {
      console.log('✅ Confirming complete:', taskToComplete.id);
      await completeTask(taskToComplete.id);
      setTaskToComplete(null);
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleEditClick = (task: Task) => {
    console.log('✏️ Edit clicked:', task.id, task.text);
    setTaskToEdit(task);
    setEditTaskText(task.text);
  };

  const handleConfirmEdit = async () => {
    if (!taskToEdit) return;
    try {
      await updateTask(taskToEdit.id, { text: editTaskText });
      setTaskToEdit(null);
    } catch (error) {
      console.error('Error editing task:', error);
    }
  };

  const handleDeleteFromEdit = async () => {
    if (!taskToEdit) return;
    try {
      await deleteTask(taskToEdit.id);
      setTaskToEdit(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Voice recognition functions
  const startVoiceRecognition = (fieldIndex: number) => {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.');
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    // Segue o idioma do app: pt-BR quando em português, en-US quando em inglês
    recognition.lang = settings.language === 'pt' ? 'pt-BR' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setCurrentVoiceField(fieldIndex);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const newVoiceTasks = [...voiceTasks];
      newVoiceTasks[fieldIndex] = transcript;
      setVoiceTasks(newVoiceTasks);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'no-speech') {
        alert('Nenhuma fala detectada. Tente novamente.');
      } else if (event.error === 'not-allowed') {
        alert('Permissão de microfone negada. Habilite nas configurações do navegador.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleCreateVoiceTasks = async () => {
    const validTasks = voiceTasks.filter(task => task.trim() !== '');
    
    if (validTasks.length === 0) {
      alert('Adicione pelo menos uma tarefa antes de criar.');
      return;
    }

    try {
      const tasksToCreate = validTasks.map(taskText => 
        addTask({
          text: taskText,
          date: selectedDate,
          mode: 'livre'
        })
      );
      
      await Promise.all(tasksToCreate);
      setShowVoiceModal(false);
      setVoiceTasks(['', '', '']);
    } catch (error) {
      console.error('Error creating voice tasks:', error);
    }
  };

  const clearVoiceField = (fieldIndex: number) => {
    const newVoiceTasks = [...voiceTasks];
    newVoiceTasks[fieldIndex] = '';
    setVoiceTasks(newVoiceTasks);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6">
          <div className="w-12 h-12 border-2 border-[#8B7355] dark:border-[#A89580] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] uppercase tracking-widest">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DndProvider backend={isTouchDevice ? TouchBackend : HTML5Backend}>
        <div 
          className={`space-y-6 mt-4 transition-all duration-500 ease-out ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} 
          ref={containerRef}
          style={{ paddingBottom: isPastDate ? '2rem' : 'calc(8rem + 6rem)' }}
        >
          {/* Metrics - Pequenas e Discretas */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-left p-2 bg-[#FFFFFF] dark:bg-[#151515] rounded-lg border border-[#E8E8E8] dark:border-[#2A2A2A]">
              <p className="text-[8px] text-[#6B6B6B] dark:text-[#A0A0A0] uppercase tracking-wider mb-1 leading-tight">{t.scheduled}</p>
              <p className="font-serif text-xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">{totalScheduled}</p>
            </div>
            <div className="text-left p-2 bg-[#FFFFFF] dark:bg-[#151515] rounded-lg border border-[#E8E8E8] dark:border-[#2A2A2A]">
              <p className="text-[8px] text-[#6B6B6B] dark:text-[#A0A0A0] uppercase tracking-wider mb-1 leading-tight">{t.completedTasks}</p>
              <p className="font-serif text-xl font-light text-[#8B7355] dark:text-[#A89580]">{totalCompleted}</p>
            </div>
            <div className="text-left p-2 bg-[#FFFFFF] dark:bg-[#151515] rounded-lg border border-[#E8E8E8] dark:border-[#2A2A2A]">
              <p className="text-[8px] text-[#6B6B6B] dark:text-[#A0A0A0] uppercase tracking-wider mb-1 leading-tight">{t.time}</p>
              <p className="font-serif text-base font-light text-[#1A1A1A] dark:text-[#F5F5F5]">
                {formatTime(totalMinutes)}
              </p>
            </div>
            <button
              onClick={() => navigate('/home/deadlines')}
              className="text-left p-2 bg-[#FFFFFF] dark:bg-[#151515] rounded-lg border-2 border-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all duration-300 active:scale-95"
            >
              <p className="text-[8px] text-[#6B6B6B] dark:text-[#A0A0A0] uppercase tracking-wider mb-1 leading-tight flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {t.deadlines}
              </p>
              <p className="font-serif text-xl font-light text-[#D4AF37]">
                {deadlines.filter(d => d.status !== 'completed').length}
              </p>
            </button>
          </div>

          {/* Botão de Daily Insights - centralizado, entre o topo e as tarefas */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowNotesModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-b from-[#FAF6EF] to-[#F3ECDD] dark:from-[#1A1610] dark:to-[#12100A] border border-[#8B7355]/40 dark:border-[#A89580]/40 rounded-full shadow-sm hover:shadow-md hover:border-[#8B7355] dark:hover:border-[#A89580] transition-all duration-200 active:scale-95 group"
            >
              <ScrollText className="w-4 h-4 text-[#8B7355] dark:text-[#A89580]" />
              <span className="text-sm font-medium text-[#8B7355] dark:text-[#A89580]">
                {t.notesButton || 'Daily Insights'}
              </span>
            </button>
          </div>

          {/* Task List */}
          <div className="space-y-3">
            {/* Pending Tasks - Drag and Drop Enabled */}
            {orderedPendingTasks.map((task, index) => (
              <DraggableTask
                key={task.id}
                task={task}
                index={index}
                moveTask={moveTask}
                onComplete={handleCompleteClick}
                onEdit={handleEditClick}
                getCategoryColor={getCategoryColor}
                settings={settings}
                translations={t}
                isPastDate={isPastDate}
              />
            ))}

            {/* Completed Tasks */}
            {completedTasks.map(task => {
              // Verificar se a tarefa foi antecipada
              const taskDate = task.date.split('T')[0]; // Data programada
              const completedDate = task.completed_at ? task.completed_at.split('T')[0] : null; // Data de conclusão
              const isEarly = completedDate && taskDate > completedDate;
              
              return (
                <div
                  key={task.id}
                  className="group bg-[#FFFFFF] dark:bg-[#151515] rounded-lg p-3 border border-[#E8E8E8] dark:border-[#2A2A2A] opacity-50 hover:opacity-70 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#8B7355] dark:text-[#A89580] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-normal line-through text-[#6B6B6B] dark:text-[#A0A0A0] leading-snug">{task.text}</p>
                        {isEarly && (
                          <span className="px-1.5 py-0.5 bg-[#4CAF50]/10 dark:bg-[#66BB6A]/10 border border-[#4CAF50] dark:border-[#66BB6A] text-[#4CAF50] dark:text-[#66BB6A] text-[9px] font-semibold rounded uppercase tracking-wider flex-shrink-0">
                            Antecipada
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {task.duration_min && (
                          <span className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0]">{task.duration_min}min</span>
                        )}
                        {task.duration_min && task.category && (
                          <span className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0]">·</span>
                        )}
                        {task.category && (
                          <span className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0]">{task.category}</span>
                        )}
                        {task.completed_at && (
                          <>
                            {(task.duration_min || task.category) && <span className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0]">·</span>}
                            <span className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0]">{format(parseISO(task.completed_at), 'HH:mm')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditClick(task)}
                      className="p-1.5 hover:bg-[#8B7355]/10 dark:hover:bg-[#A89580]/10 rounded-lg transition-all duration-300 flex-shrink-0"
                    >
                      <Pencil className="w-4 h-4 text-[#6B6B6B] dark:text-[#A0A0A0]" />
                    </button>
                  </div>
                </div>
              );
            })}

            {todayTasks.length === 0 && (
              <div className="text-center py-20 space-y-3">
                <p className="text-base text-[#6B6B6B] dark:text-[#A0A0A0]">{t.noTasksForDay}</p>
                <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">{t.clickNewTask}</p>
              </div>
            )}
          </div>
        </div>
      </DndProvider>

      {/* Floating New Task Button - Positioned above Focus button - OUTSIDE transition container */}
      {!isPastDate && (
        <div className="fixed left-0 right-0 z-50" style={{ bottom: 'calc(24px + 7rem)' }}>
          <div className="max-w-[800px] mx-auto px-5 flex gap-3">
            <button
              onClick={() => setShowVoiceChoice(true)}
              className="bg-[#FFFFFF] dark:bg-[#151515] border border-[#8B7355] dark:border-[#A89580] text-[#8B7355] dark:text-[#A89580] p-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-[#8B7355]/10 dark:hover:bg-[#A89580]/10 transition-all duration-300 active:scale-[0.98] flex items-center justify-center"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                console.log('➕ NEW TASK button clicked!');
                setShowNewTaskModal(true);
              }}
              className="flex-1 bg-[#8B7355] dark:bg-[#A89580] text-white py-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-[#6D5A43] dark:hover:bg-[#C4B5A0] transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">{t.newTask}</span>
            </button>
          </div>
        </div>
      )}

      {/* Daily Insights Modal */}
      <NotesModal
        open={showNotesModal}
        onOpenChange={setShowNotesModal}
        date={selectedDate}
        displayDate={displayDate}
        language={settings.language}
        todaysNotes={notes.filter((n) => n.date === selectedDate)}
        onSave={(content) => addNote(selectedDate, content)}
        translations={t}
      />

      {/* Voice Choice - escolha entre Voice Tasks e Agendar */}
      <Dialog open={showVoiceChoice} onOpenChange={setShowVoiceChoice}>
        <DialogContent className="max-w-sm bg-[#FFFFFF] dark:bg-[#151515] border border-[#E8E8E8] dark:border-[#2A2A2A]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">
              {t.voiceChoiceTitle || 'Adicionar por voz'}
            </DialogTitle>
            <DialogDescription className="text-[#6B6B6B] dark:text-[#A0A0A0]">
              {t.voiceChoiceHint || 'O que você quer fazer?'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              onClick={() => {
                setShowVoiceChoice(false);
                setShowVoiceModal(true);
              }}
              className="flex flex-col items-center gap-2 p-5 rounded-xl border border-[#E8E8E8] dark:border-[#2A2A2A] hover:border-[#8B7355] dark:hover:border-[#A89580] hover:bg-[#8B7355]/5 transition-all duration-200 active:scale-95"
            >
              <ListChecks className="w-7 h-7 text-[#8B7355] dark:text-[#A89580]" />
              <span className="text-sm font-medium text-[#1A1A1A] dark:text-[#F5F5F5] text-center">
                {t.voiceTasksTitle || 'Tarefas de Voz'}
              </span>
              <span className="text-[10px] text-[#6B6B6B] dark:text-[#A0A0A0] text-center leading-tight">
                {t.voiceTasksShort || 'Tarefas de hoje'}
              </span>
            </button>
            <button
              onClick={() => {
                setShowVoiceChoice(false);
                setShowScheduleModal(true);
              }}
              className="flex flex-col items-center gap-2 p-5 rounded-xl border border-[#E8E8E8] dark:border-[#2A2A2A] hover:border-[#8B7355] dark:hover:border-[#A89580] hover:bg-[#8B7355]/5 transition-all duration-200 active:scale-95"
            >
              <CalendarPlus className="w-7 h-7 text-[#8B7355] dark:text-[#A89580]" />
              <span className="text-sm font-medium text-[#1A1A1A] dark:text-[#F5F5F5] text-center">
                {t.scheduleByVoice || 'Agendar'}
              </span>
              <span className="text-[10px] text-[#6B6B6B] dark:text-[#A0A0A0] text-center leading-tight">
                {t.scheduleShort || 'Data futura com IA'}
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Voice Schedule Modal (IA) */}
      <VoiceScheduleModal
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
        language={settings.language}
        currentDate={format(new Date(), 'yyyy-MM-dd')}
        onConfirm={async ({ title, date, time }) => {
          const text = time ? `${title} (${time})` : title;
          await addTask({ text, date, mode: 'livre' });
        }}
        translations={t}
      />

      {/* New Task Modal */}
      <Dialog open={showNewTaskModal} onOpenChange={setShowNewTaskModal}>
        <DialogContent className="max-w-md bg-[#FFFFFF] dark:bg-[#151515] border border-[#E8E8E8] dark:border-[#2A2A2A]">
          <DialogHeader>
            <DialogTitle className="font-serif text-3xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">{t.newTask}</DialogTitle>
            <DialogDescription className="text-[#6B6B6B] dark:text-[#A0A0A0]">
              {t.createNewTask} {displayDate}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={taskMode} onValueChange={(v) => setTaskMode(v as 'livre' | 'tempo' | 'recorrentes')} className="mt-6">
            <TabsList className="grid w-full grid-cols-3 bg-[#FAFAF8] dark:bg-[#0A0A0A] p-1 rounded-lg">
              <TabsTrigger value="livre" className="data-[state=active]:bg-[#8B7355] dark:data-[state=active]:bg-[#A89580] data-[state=active]:text-white rounded-md transition-all duration-300 text-xs">{t.free}</TabsTrigger>
              <TabsTrigger value="tempo" className="data-[state=active]:bg-[#8B7355] dark:data-[state=active]:bg-[#A89580] data-[state=active]:text-white rounded-md transition-all duration-300 text-xs">{t.timed}</TabsTrigger>
              <TabsTrigger value="recorrentes" className="data-[state=active]:bg-[#8B7355] dark:data-[state=active]:bg-[#A89580] data-[state=active]:text-white rounded-md transition-all duration-300 text-xs">{t.mostUsed}</TabsTrigger>
            </TabsList>

            <TabsContent value="livre" className="space-y-6 mt-6">
              <div>
                <Label htmlFor="task-text-livre" className="text-[#6B6B6B] dark:text-[#A0A0A0]">{t.enterYourTask}</Label>
                <Input
                  id="task-text-livre"
                  placeholder={t.exampleReadBook}
                  value={newTaskData.text}
                  onChange={(e) => setNewTaskData(prev => ({ ...prev, text: e.target.value }))}
                  maxLength={120}
                  className="mt-3"
                />
              </div>
            </TabsContent>

            <TabsContent value="tempo" className="space-y-6 mt-6">
              <div>
                <Label htmlFor="task-text-tempo" className="text-[#6B6B6B] dark:text-[#A0A0A0]">{t.enterYourTask}</Label>
                <Input
                  id="task-text-tempo"
                  placeholder={t.exampleWriteReport}
                  value={newTaskData.text}
                  onChange={(e) => setNewTaskData(prev => ({ ...prev, text: e.target.value }))}
                  maxLength={120}
                  className="mt-3"
                />
              </div>

              <div>
                <Label htmlFor="category" className="text-[#6B6B6B] dark:text-[#A0A0A0]">{t.category}</Label>
                <Select
                  value={newTaskData.category}
                  onValueChange={(v) => setNewTaskData(prev => ({ ...prev, category: v as Task['category'] }))}
                >
                  <SelectTrigger id="category" className="mt-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Work">{t.work}</SelectItem>
                    <SelectItem value="Exercise">{t.exercise}</SelectItem>
                    <SelectItem value="Study">{t.study}</SelectItem>
                    <SelectItem value="Critical Thinking">{t.criticalThinking}</SelectItem>
                    <SelectItem value="Spirituality">{t.spirituality}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="duration" className="text-[#6B6B6B] dark:text-[#A0A0A0]">{t.duration}</Label>
                <Select
                  value={String(newTaskData.duration_min)}
                  onValueChange={(v) => setNewTaskData(prev => ({ ...prev, duration_min: parseInt(v) }))}
                >
                  <SelectTrigger id="duration" className="mt-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">{t.minutes15}</SelectItem>
                    <SelectItem value="30">{t.minutes30}</SelectItem>
                    <SelectItem value="45">{t.minutes45}</SelectItem>
                    <SelectItem value="60">{t.minutes60}</SelectItem>
                    <SelectItem value="90">{t.minutes90}</SelectItem>
                    <SelectItem value="120">{t.hours2}</SelectItem>
                    <SelectItem value="180">3 {t.hours}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="recorrentes" className="space-y-6 mt-6">
              {recurrentTasks.length > 0 ? (
                <>
                  <div>
                    <Label className="text-[#6B6B6B] dark:text-[#A0A0A0]">{t.selectMostUsedTasks}</Label>
                    <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] mt-1">{t.checkTasksToAddToday}</p>
                  </div>
                  
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {recurrentTasks.map((task, index) => {
                      const taskId = `recurrent-${index}`;
                      const isSelected = selectedRecurrentTasks.has(taskId);
                      
                      return (
                        <div
                          key={taskId}
                          onClick={() => {
                            const newSelection = new Set(selectedRecurrentTasks);
                            if (isSelected) {
                              newSelection.delete(taskId);
                            } else {
                              newSelection.add(taskId);
                            }
                            setSelectedRecurrentTasks(newSelection);
                          }}
                          className={`
                            p-4 rounded-lg border cursor-pointer transition-all duration-200
                            ${isSelected 
                              ? 'bg-[#8B7355]/10 dark:bg-[#A89580]/10 border-[#8B7355] dark:border-[#A89580]' 
                              : 'bg-[#FAFAF8] dark:bg-[#0A0A0A] border-[#E8E8E8] dark:border-[#2A2A2A] hover:border-[#8B7355]/50 dark:hover:border-[#A89580]/50'
                            }
                          `}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`
                              w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                              ${isSelected 
                                ? 'bg-[#8B7355] dark:bg-[#A89580] border-[#8B7355] dark:border-[#A89580]' 
                                : 'border-[#6B6B6B] dark:border-[#A0A0A0]'
                              }
                            `}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-normal text-[#1A1A1A] dark:text-[#F5F5F5]">{task.text}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {(task.duration_min || task.category) && (
                                  <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0]">
                                    {task.duration_min && `${task.duration_min}min`}
                                    {task.duration_min && task.category && ' · '}
                                    {task.category && getCategoryName(task.category, settings.language)}
                                  </p>
                                )}
                                <span className="px-1.5 py-0.5 bg-[#8B7355]/20 dark:bg-[#A89580]/20 text-[#8B7355] dark:text-[#A89580] text-[9px] font-semibold rounded uppercase tracking-wider">
                                  {task.frequency}x
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">{t.noRecurrentTasksFound}</p>
                  <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0]">{t.createRecurrentTasks}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Button onClick={handleCreateTask} className="w-full mt-6">
            {t.createTask}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Confirm Complete Dialog */}
      <AlertDialog open={!!taskToComplete} onOpenChange={() => setTaskToComplete(null)}>
        <AlertDialogContent className="bg-[#FFFFFF] dark:bg-[#151515] border border-[#E8E8E8] dark:border-[#2A2A2A]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">Confirmar Execução?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {taskToComplete && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#8B7355] dark:text-[#A89580] flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-normal text-[#1A1A1A] dark:text-[#F5F5F5]">{taskToComplete.text}</div>
                        {(taskToComplete.duration_min || taskToComplete.category) && (
                          <div className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] mt-1">
                            {taskToComplete.duration_min && `${taskToComplete.duration_min}min`}
                            {taskToComplete.duration_min && taskToComplete.category && ' · '}
                            {taskToComplete.category}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">
                      Você realmente completou esta tarefa?
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="border-[#E8E8E8] dark:border-[#2A2A2A]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmComplete}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Task Dialog */}
      <AlertDialog open={!!taskToEdit} onOpenChange={() => setTaskToEdit(null)}>
        <AlertDialogContent className="bg-[#FFFFFF] dark:bg-[#151515] border border-[#E8E8E8] dark:border-[#2A2A2A]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">{t.editTask}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {taskToEdit && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <Pencil className="w-5 h-5 text-[#8B7355] dark:text-[#A89580] flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-normal text-[#1A1A1A] dark:text-[#F5F5F5]">{taskToEdit.text}</div>
                        {(taskToEdit.duration_min || taskToEdit.category) && (
                          <div className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] mt-1">
                            {taskToEdit.duration_min && `${taskToEdit.duration_min}min`}
                            {taskToEdit.duration_min && taskToEdit.category && ' · '}
                            {taskToEdit.category}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">
                      {t.editTaskText}
                    </div>
                    <Input
                      value={editTaskText}
                      onChange={(e) => setEditTaskText(e.target.value)}
                      maxLength={120}
                      className="mt-3"
                    />
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="border-[#E8E8E8] dark:border-[#2A2A2A]">{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmEdit}
            >
              {t.save}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleDeleteFromEdit}
              className="bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-700"
            >
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Voice Task Modal */}
      <Dialog open={showVoiceModal} onOpenChange={setShowVoiceModal}>
        <DialogContent className="max-w-md bg-[#FFFFFF] dark:bg-[#151515] border border-[#E8E8E8] dark:border-[#2A2A2A]">
          <DialogHeader>
            <DialogTitle className="font-serif text-3xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">{t.voiceTasksTitle}</DialogTitle>
            <DialogDescription className="text-[#6B6B6B] dark:text-[#A0A0A0]">
              {t.voiceTasksDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-6">
            {voiceTasks.map((task, index) => (
              <div key={index} className="relative">
                <Input
                  value={task}
                  onChange={(e) => {
                    const newVoiceTasks = [...voiceTasks];
                    newVoiceTasks[index] = e.target.value;
                    setVoiceTasks(newVoiceTasks);
                  }}
                  placeholder={index === 0 ? t.voiceTask1 : index === 1 ? t.voiceTask2 : t.voiceTask3}
                  className={task ? 'pr-24' : 'pr-12'}
                  autoFocus={false}
                  autoComplete="off"
                />
                <button
                  onClick={() => startVoiceRecognition(index)}
                  disabled={isListening && currentVoiceField === index}
                  className={`absolute top-1/2 -translate-y-1/2 right-2 p-2 rounded-full transition-all duration-300 active:scale-[0.98] ${
                    isListening && currentVoiceField === index
                      ? 'bg-red-500 dark:bg-red-600 animate-pulse'
                      : 'bg-[#8B7355] dark:bg-[#A89580] hover:bg-[#6D5A43] dark:hover:bg-[#C4B5A0]'
                  }`}
                >
                  <Mic className="w-4 h-4 text-white" />
                </button>
                {task && (
                  <button
                    onClick={() => clearVoiceField(index)}
                    className="absolute top-1/2 -translate-y-1/2 right-12 p-1.5 bg-[#FF5733]/80 dark:bg-[#FF5733]/80 text-white rounded-full transition-all duration-300 hover:bg-[#FF4500] dark:hover:bg-[#FF4500] active:scale-[0.98]"
                  >
                    <Plus className="w-3 h-3 rotate-45" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <Button onClick={handleCreateVoiceTasks} className="w-full mt-6">
            {t.createVoiceTasks}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}