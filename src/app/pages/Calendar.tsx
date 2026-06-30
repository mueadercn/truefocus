import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Eye, ArrowLeft, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { translations } from '../utils/translations';
import type { Task, Deadline } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

interface DayData {
  date: Date;
  dayNumber: number;
  isToday: boolean;
  isPast: boolean;
  isCurrentMonth: boolean;
  tasks: Task[];
  deadlines: Deadline[];
}

export function Calendar() {
  const navigate = useNavigate();
  const { tasks, deadlines, setSelectedDate, addTask, settings } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [taskMode, setTaskMode] = useState<'livre' | 'tempo'>('livre');
  const [newTaskData, setNewTaskData] = useState({
    text: '',
    category: 'Trabalho' as Task['category'],
    duration_min: 60,
  });

  const t = translations[settings.language];
  const dateLocale = settings.language === 'pt' ? ptBR : enUS;

  // Gerar dados do calendário
  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const today = startOfDay(new Date());

    // Gerar todos os dias do mês
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Agrupar tarefas e deadlines por dia
    const daysData: DayData[] = daysInMonth.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Filtrar tarefas do dia
      const dayTasks = tasks.filter(task => task.date === dateStr);
      
      // Filtrar deadlines do dia
      const dayDeadlines = deadlines.filter(deadline => {
        // Corrigir bug de timezone - extrair apenas a data sem parseISO
        const deadlineDate = deadline.deadline_date.split('T')[0];
        return deadlineDate === dateStr && deadline.status === 'pending';
      });

      return {
        date,
        dayNumber: date.getDate(),
        isToday: isSameDay(date, today),
        isPast: isBefore(date, today) && !isSameDay(date, today),
        isCurrentMonth: true,
        tasks: dayTasks,
        deadlines: dayDeadlines
      };
    });

    // Calcular dias vazios no início (para alinhar com dia da semana)
    const firstDayOfWeek = monthStart.getDay(); // 0 = Domingo, 6 = Sábado
    const emptyDays = Array(firstDayOfWeek).fill(null);

    return {
      month: format(currentMonth, 'MMMM yyyy', { locale: dateLocale }),
      emptyDays,
      days: daysData
    };
  }, [currentMonth, tasks, deadlines, settings.language]);

  // Navegar mês anterior
  const handlePreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
    setSelectedDay(null);
  };

  // Navegar próximo mês
  const handleNextMonth = () => {
    // Limite: 12 meses no futuro
    const today = new Date();
    const maxDate = new Date(today.getFullYear() + 1, today.getMonth(), 1);
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(currentMonth.getMonth() + 1);

    if (nextMonth < maxDate) {
      setCurrentMonth(nextMonth);
      setSelectedDay(null);
    }
  };

  // Selecionar dia
  const handleSelectDay = (dayData: DayData) => {
    if (dayData.isPast) return; // Não permite selecionar dias passados
    setSelectedDay(dayData);
  };

  // Adicionar tarefa no dia selecionado
  const handleAddTaskClick = () => {
    if (!selectedDay) return;
    // Fechar o dialog de detalhes e abrir o modal de nova tarefa
    setShowNewTaskModal(true);
  };

  // Criar nova tarefa
  const handleCreateTask = async () => {
    if (!newTaskData.text.trim() || !selectedDay) return;

    try {
      const dateStr = format(selectedDay.date, 'yyyy-MM-dd');
      await addTask({
        text: newTaskData.text,
        category: taskMode === 'tempo' ? newTaskData.category : undefined,
        duration_min: taskMode === 'tempo' ? newTaskData.duration_min : undefined,
        date: dateStr,
        mode: taskMode
      });
      setShowNewTaskModal(false);
      setNewTaskData({ text: '', category: 'Trabalho', duration_min: 60 });
      setTaskMode('livre');
      setSelectedDay(null); // Fechar o dialog de detalhes também
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  // Ver dia na home
  const handleViewDay = () => {
    if (!selectedDay) return;
    const dateStr = format(selectedDay.date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    navigate('/home');
  };

  // Voltar para hoje
  const handleBackToToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    navigate('/home');
  };

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Navegação do Mês - Colada ao topo */}
      <div className="bg-[#FFFFFF] dark:bg-[#151515] rounded-xl p-4 mb-6 border border-[#E8E8E8] dark:border-[#2A2A2A]">
        <div className="flex items-center justify-center">
          {/* Navegação Mês */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-[#FAFAF8] dark:hover:bg-[#2A2A2A]/50 rounded-lg transition-all duration-200 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-[#6B6B6B] dark:text-[#A0A0A0]" />
            </button>
            <span className="font-serif text-lg font-medium text-[#1A1A1A] dark:text-[#F5F5F5] capitalize min-w-[180px] text-center">
              {calendarData.month}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-[#FAFAF8] dark:hover:bg-[#2A2A2A]/50 rounded-lg transition-all duration-200 active:scale-95"
            >
              <ChevronRight className="w-5 h-5 text-[#6B6B6B] dark:text-[#A0A0A0]" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid do Calendário */}
      <div className="bg-[#FFFFFF] dark:bg-[#151515] rounded-xl p-4 border border-[#E8E8E8] dark:border-[#2A2A2A]">
        {/* Labels dos dias da semana */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
            <div
              key={i}
              className="text-center text-xs font-medium text-[#6B6B6B] dark:text-[#A0A0A0] py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Células do calendário */}
        <div className="grid grid-cols-7 gap-2">
          {/* Células vazias para alinhar */}
          {calendarData.emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="h-12" />
          ))}

          {/* Células de dias */}
          {calendarData.days.map((dayData) => {
            const hasTasks = dayData.tasks.length > 0;
            const hasDeadlines = dayData.deadlines.length > 0;
            const isSelected = selectedDay?.date && isSameDay(selectedDay.date, dayData.date);

            return (
              <button
                key={dayData.dayNumber}
                onClick={() => handleSelectDay(dayData)}
                disabled={dayData.isPast}
                className={`
                  relative h-10 rounded-lg text-sm font-medium transition-all duration-200
                  ${dayData.isToday
                    ? 'bg-[#8B7355] dark:bg-[#A89580] text-white border-2 border-[#8B7355] dark:border-[#A89580]'
                    : dayData.isPast
                    ? 'bg-[#FAFAF8] dark:bg-[#0A0A0A] text-[#BDBDBD] dark:text-[#4A4A4A] cursor-not-allowed'
                    : isSelected
                    ? 'bg-[#F5EDE7] dark:bg-[#2A2520] border-2 border-[#8B7355] dark:border-[#A89580] text-[#1A1A1A] dark:text-[#F5F5F5]'
                    : 'bg-[#FFFFFF] dark:bg-[#151515] text-[#1A1A1A] dark:text-[#F5F5F5] border border-[#E8E8E8] dark:border-[#2A2A2A] hover:bg-[#FAFAF8] dark:hover:bg-[#2A2A2A]/50 hover:scale-105'
                  }
                `}
              >
                {dayData.dayNumber}

                {/* Indicadores */}
                {!dayData.isPast && (hasTasks || hasDeadlines) && (
                  <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
                    {hasTasks && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF50]" />
                    )}
                    {hasDeadlines && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F44336]" />
                    )}
                  </div>
                )}
              </button>
            );
          })}

          {/* Legenda - Horizontal - col-span-7 */}
          <div className="col-span-7 mt-3 pt-3 border-t border-[#E8E8E8] dark:border-[#2A2A2A] flex items-center justify-center gap-6 text-xs text-[#6B6B6B] dark:text-[#A0A0A0]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#4CAF50]" />
              <span>{t.tasks}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F44336]" />
              <span>{t.deadlines}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-[#8B7355] dark:bg-[#A89580]" />
              <span>{t.today}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Botão Adicionar Tarefa - Entre calendário e tarefas */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => {
            if (!selectedDay) {
              // Se não tem dia selecionado, seleciona hoje
              const today = calendarData.days.find(d => d.isToday);
              if (today) setSelectedDay(today);
            }
            setShowNewTaskModal(true);
          }}
          className="group flex items-center gap-2 px-4 py-2 bg-[#FFFFFF] dark:bg-[#151515] border border-[#E8E8E8] dark:border-[#2A2A2A] rounded-lg hover:border-[#8B7355] dark:hover:border-[#A89580] transition-all duration-200 active:scale-95"
        >
          <Plus className="w-4 h-4 text-[#8B7355] dark:text-[#A89580]" />
          <span className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] group-hover:text-[#8B7355] dark:group-hover:text-[#A89580] transition-colors">
            {t.addTask}
          </span>
        </button>
      </div>

      {/* Detalhes do Dia Selecionado - Inline abaixo do calendário */}
      {selectedDay && (
        <div className="bg-[#FFFFFF] dark:bg-[#151515] rounded-xl p-6 border border-[#E8E8E8] dark:border-[#2A2A2A] mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Deadlines */}
          {selectedDay.deadlines.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-[#F44336] mb-3 flex items-center gap-2">
                <span>⏰</span>
                DEADLINE VENCE
              </h4>
              {selectedDay.deadlines.map(deadline => (
                <div
                  key={deadline.id}
                  className="bg-[#FAFAF8] dark:bg-[#0A0A0A] rounded-lg p-3 mb-2"
                >
                  <p className="text-sm font-medium text-[#1A1A1A] dark:text-[#F5F5F5]">
                    {deadline.title}
                  </p>
                  <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] mt-1">
                    {deadline.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Tarefas */}
          {selectedDay.tasks.length > 0 ? (
            <div>
              <ul className="space-y-2">
                {selectedDay.tasks.map(task => (
                  <li
                    key={task.id}
                    className={`flex items-center gap-3 text-sm py-3 border-b border-[#E8E8E8] dark:border-[#2A2A2A] last:border-0 ${
                      task.completed ? 'opacity-60' : ''
                    }`}
                  >
                    <span className="text-[#6B6B6B] dark:text-[#A0A0A0] text-base">
                      {task.completed ? '✓' : '☐'}
                    </span>
                    <span className={`flex-1 ${
                      task.completed ? 'line-through text-[#6B6B6B] dark:text-[#A0A0A0]' : 'text-[#1A1A1A] dark:text-[#F5F5F5]'
                    }`}>
                      {task.text}
                    </span>
                    {task.duration_min && (
                      <span className={`text-xs font-medium ${
                        task.completed ? 'text-[#6B6B6B] dark:text-[#A0A0A0]' : 'text-[#8B7355] dark:text-[#A89580]'
                      }`}>
                        {task.duration_min}min
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {/* Total estimado */}
              {selectedDay.tasks.some(t => t.duration_min) && (
                <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] mt-4 pt-4 border-t border-[#E8E8E8] dark:border-[#2A2A2A] text-center">
                  Total estimado:{' '}
                  {Math.floor(selectedDay.tasks.reduce((sum, t) => sum + (t.duration_min || 0), 0) / 60)}h{' '}
                  {selectedDay.tasks.reduce((sum, t) => sum + (t.duration_min || 0), 0) % 60}min
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] italic text-center py-8">
              Nenhuma tarefa planejada
            </p>
          )}
        </div>
      )}

      {/* Modal de Nova Tarefa */}
      <Dialog open={showNewTaskModal} onOpenChange={setShowNewTaskModal}>
        <DialogContent className="bg-[#FFFFFF] dark:bg-[#151515] border border-[#E8E8E8] dark:border-[#2A2A2A] max-w-md">
          <DialogTitle className="sr-only">Nova Tarefa</DialogTitle>
          <DialogDescription className="sr-only">
            Adicione uma nova tarefa para este dia
          </DialogDescription>
          
          {selectedDay && (
            <div>
              {/* Header */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#E8E8E8] dark:border-[#2A2A2A]">
                <div className="text-2xl">
                  {selectedDay.deadlines.length > 0 ? '🔴' : '📋'}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-medium text-[#1A1A1A] dark:text-[#F5F5F5] capitalize">
                    {format(selectedDay.date, "EEEE, dd MMM", { locale: dateLocale })}
                  </h3>
                  {selectedDay.isToday && (
                    <span className="text-xs text-[#8B7355] dark:text-[#A89580]">Hoje</span>
                  )}
                </div>
              </div>

              {/* Formulário de Tarefa */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="taskText">Tarefa</Label>
                  <Input
                    id="taskText"
                    value={newTaskData.text}
                    onChange={(e) => setNewTaskData({ ...newTaskData, text: e.target.value })}
                    placeholder="Digite a tarefa"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taskMode">Modo</Label>
                  <Select
                    value={taskMode}
                    onValueChange={(value) => setTaskMode(value as 'livre' | 'tempo')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o modo">
                        {taskMode === 'livre' ? 'Livre' : 'Tempo'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="livre">Livre</SelectItem>
                      <SelectItem value="tempo">Tempo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {taskMode === 'tempo' && (
                  <div className="space-y-2">
                    <Label htmlFor="taskCategory">Categoria</Label>
                    <Select
                      value={newTaskData.category}
                      onValueChange={(value) => setNewTaskData({ ...newTaskData, category: value as Task['category'] })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione a categoria">
                          {newTaskData.category}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Trabalho">Trabalho</SelectItem>
                        <SelectItem value="Estudo">Estudo</SelectItem>
                        <SelectItem value="Lazer">Lazer</SelectItem>
                        <SelectItem value="Saúde">Saúde</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {taskMode === 'tempo' && (
                  <div className="space-y-2">
                    <Label htmlFor="taskDuration">Duração (min)</Label>
                    <Input
                      id="taskDuration"
                      type="number"
                      value={newTaskData.duration_min.toString()}
                      onChange={(e) => setNewTaskData({ ...newTaskData, duration_min: parseInt(e.target.value) })}
                      placeholder="Duração em minutos"
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleCreateTask}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#8B7355] dark:bg-[#A89580] text-white rounded-lg hover:bg-[#755E47] dark:hover:bg-[#93856C] transition-all duration-200 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Criar Tarefa</span>
                </button>
                <button
                  onClick={() => setShowNewTaskModal(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-[#FAFAF8] dark:bg-[#0A0A0A] text-[#1A1A1A] dark:text-[#F5F5F5] border border-[#E8E8E8] dark:border-[#2A2A2A] rounded-lg hover:bg-[#F0F0F0] dark:hover:bg-[#1A1A1A] transition-all duration-200 active:scale-95"
                >
                  <X className="w-4 h-4" />
                  <span className="text-sm font-medium">Cancelar</span>
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}