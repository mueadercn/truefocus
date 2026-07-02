import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  addMonths,
  subMonths,
  isSameMonth,
} from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { translations } from '../utils/translations';

// Cores por categoria (para as barras horizontais de horas)
const CATEGORY_COLORS: Record<string, string> = {
  Work: '#3B82F6',
  Exercise: '#10B981',
  Study: '#8B5CF6',
  'Critical Thinking': '#F59E0B',
  Spirituality: '#EC4899',
};

// Categorias principais mostradas na seção de horas
const MAIN_CATEGORIES = ['Work', 'Exercise', 'Study', 'Critical Thinking', 'Spirituality'];

// Faixas de cor por quantidade de tarefas concluídas no dia
const TIER_BRONZE = '#CD7F32';
const TIER_SILVER = '#9CA3AF';
const TIER_GOLD = '#D4AF37';

// Retorna a cor da barra conforme a quantidade: 1-2 bronze, 3-4 prata, 5+ ouro
function getTierColor(count: number): string {
  if (count >= 5) return TIER_GOLD;
  if (count >= 3) return TIER_SILVER;
  return TIER_BRONZE; // 1-2
}

export function Dashboard() {
  const navigate = useNavigate();
  const { tasks, rescues, loading, settings } = useApp();

  const t = translations[settings.language];
  const dateLocale = settings.language === 'pt' ? ptBR : enUS;

  // Mês selecionado (padrão: mês atual)
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  // Dia selecionado dentro do mês (para expandir tarefas concluídas)
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  // Ano selecionado no gráfico anual (padrão: ano atual)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Tradução de nomes de categoria
  const translateCategory = (category: string): string => {
    const categoryMap: Record<string, keyof typeof t> = {
      Work: 'work',
      Trabalho: 'work',
      Exercise: 'exercise',
      Exercício: 'exercise',
      Study: 'study',
      Estudo: 'study',
      'Critical Thinking': 'criticalThinking',
      'Pensamento Crítico': 'criticalThinking',
      Spirituality: 'spirituality',
      Espiritualidade: 'spirituality',
    };
    const key = categoryMap[category];
    return key ? (t[key] as string) : category;
  };

  // Retorna a data (YYYY-MM-DD) em que a tarefa foi concluída
  const getCompletedDate = (task: (typeof tasks)[number]): string =>
    task.completed_at ? task.completed_at.split('T')[0] : task.date;

  // Dados agregados do mês selecionado
  const monthData = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const daysInMonth = getDaysInMonth(selectedMonth);

    // Tarefas concluídas dentro do mês selecionado
    const completedInMonth = tasks.filter((task) => {
      if (!task.completed) return false;
      const d = parseISO(getCompletedDate(task));
      return d >= monthStart && d <= monthEnd;
    });

    // Rescues dentro do mês selecionado
    const rescuesInMonth = rescues.filter((rescue) => {
      const rescueDate = rescue.completed_date || rescue.date.split('T')[0];
      const d = parseISO(rescueDate);
      return d >= monthStart && d <= monthEnd;
    });

    // Contagem de tarefas concluídas por dia
    const byDay: { day: number; dateStr: string; tasks: typeof tasks; count: number }[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = format(
        new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day),
        'yyyy-MM-dd'
      );
      const dayTasks = completedInMonth.filter((task) => getCompletedDate(task) === dateStr);
      byDay.push({ day, dateStr, tasks: dayTasks, count: dayTasks.length });
    }
    const maxCount = Math.max(1, ...byDay.map((d) => d.count));

    // Horas por categoria (em minutos, convertidas na renderização)
    const categoryMinutes: Record<string, number> = {};
    MAIN_CATEGORIES.forEach((cat) => {
      categoryMinutes[cat] = 0;
    });
    completedInMonth.forEach((task) => {
      if (task.category && MAIN_CATEGORIES.includes(task.category)) {
        categoryMinutes[task.category] += task.duration_min || 0;
      }
    });
    const maxCategoryMinutes = Math.max(1, ...Object.values(categoryMinutes));

    const totalHours = completedInMonth.reduce((sum, t2) => sum + (t2.duration_min || 0), 0) / 60;

    return {
      byDay,
      maxCount,
      categoryMinutes,
      maxCategoryMinutes,
      totalCompleted: completedInMonth.length,
      totalHours,
      rescues: rescuesInMonth,
    };
  }, [tasks, rescues, selectedMonth]);

  const monthName = format(selectedMonth, 'MMMM yyyy', { locale: dateLocale });
  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  // Dados anuais: tarefas concluídas por mês (Jan–Dez) do ano selecionado
  const annualData = useMemo(() => {
    const months = new Array(12).fill(0);
    tasks.forEach((task) => {
      if (!task.completed) return;
      const d = parseISO(getCompletedDate(task));
      if (d.getFullYear() === selectedYear) {
        months[d.getMonth()]++;
      }
    });
    const maxMonth = Math.max(1, ...months);
    const totalYear = months.reduce((a, b) => a + b, 0);
    return { months, maxMonth, totalYear };
  }, [tasks, selectedYear]);

  const currentYear = new Date().getFullYear();

  // Tarefas do dia selecionado
  const selectedDayTasks = selectedDay
    ? monthData.byDay.find((d) => d.dateStr === selectedDay)?.tasks || []
    : [];

  const handlePrevMonth = () => {
    setSelectedMonth((m) => subMonths(m, 1));
    setSelectedDay(null);
  };
  const handleNextMonth = () => {
    if (isCurrentMonth) return;
    setSelectedMonth((m) => addMonths(m, 1));
    setSelectedDay(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#8B7355] dark:border-[#A89580] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6B6B6B] dark:text-[#A0A0A0]">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-[#FAFAF8] dark:hover:bg-[#2A2A2A] rounded-lg transition-all duration-300"
        >
          <ArrowLeft className="w-5 h-5 text-[#6B6B6B] dark:text-[#A0A0A0]" />
        </button>
        <h1 className="font-serif text-3xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">
          {t.metricsTitle}
        </h1>
      </div>

      {/* Seletor de mês */}
      <div className="flex items-center justify-between bg-[#FFFFFF] dark:bg-[#151515] rounded-xl p-3 border border-[#E8E8E8] dark:border-[#2A2A2A] mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-[#FAFAF8] dark:hover:bg-[#2A2A2A]/50 rounded-lg transition-all duration-200 active:scale-95"
        >
          <ChevronLeft className="w-5 h-5 text-[#6B6B6B] dark:text-[#A0A0A0]" />
        </button>
        <span className="font-serif text-lg font-medium text-[#1A1A1A] dark:text-[#F5F5F5] capitalize">
          {monthName}
        </span>
        <button
          onClick={handleNextMonth}
          disabled={isCurrentMonth}
          className={`p-2 rounded-lg transition-all duration-200 ${
            isCurrentMonth
              ? 'opacity-30 cursor-not-allowed'
              : 'hover:bg-[#FAFAF8] dark:hover:bg-[#2A2A2A]/50 active:scale-95'
          }`}
        >
          <ChevronRight className="w-5 h-5 text-[#6B6B6B] dark:text-[#A0A0A0]" />
        </button>
      </div>

      {/* Resumo do mês */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-3 bg-[#FFFFFF] dark:bg-[#151515] rounded-xl border border-[#E8E8E8] dark:border-[#2A2A2A]">
          <p className="text-[9px] text-[#6B6B6B] dark:text-[#A0A0A0] uppercase tracking-wider mb-1">
            {t.tasksCompleted}
          </p>
          <p className="font-serif text-2xl font-light text-[#8B7355] dark:text-[#A89580]">
            {monthData.totalCompleted}
          </p>
        </div>
        <div className="p-3 bg-[#FFFFFF] dark:bg-[#151515] rounded-xl border border-[#E8E8E8] dark:border-[#2A2A2A]">
          <p className="text-[9px] text-[#6B6B6B] dark:text-[#A0A0A0] uppercase tracking-wider mb-1">
            {t.focusHours}
          </p>
          <p className="font-serif text-2xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">
            {monthData.totalHours.toFixed(1)}h
          </p>
        </div>
        <div className="p-3 bg-[#FFFFFF] dark:bg-[#151515] rounded-xl border border-[#E8E8E8] dark:border-[#2A2A2A]">
          <p className="text-[9px] text-[#6B6B6B] dark:text-[#A0A0A0] uppercase tracking-wider mb-1">
            {t.emergencies}
          </p>
          <p className="font-serif text-2xl font-light text-[#8B7355] dark:text-[#A89580]">
            {monthData.rescues.length}
          </p>
        </div>
      </div>

      {monthData.totalCompleted === 0 && monthData.rescues.length === 0 && annualData.totalYear === 0 ? (
        <div className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-2xl p-10 border border-[#E8E8E8] dark:border-[#2A2A2A] text-center">
          <p className="text-[#6B6B6B] dark:text-[#A0A0A0]">{t.noMetricsYet}</p>
          <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] mt-2">{t.completeTasksToSee}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Barras por dia */}
          <div className="bg-[#FFFFFF] dark:bg-[#151515] rounded-2xl p-4 border border-[#E8E8E8] dark:border-[#2A2A2A]">
            <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] uppercase tracking-wider mb-4">
              {t.tasksCompleted} · {t.perDay}
            </p>
            {/* Gráfico de barras */}
            <div className="flex items-end justify-between gap-[2px] h-32">
              {monthData.byDay.map((d) => {
                const heightPct = d.count > 0 ? (d.count / monthData.maxCount) * 100 : 0;
                const isSelected = selectedDay === d.dateStr;
                const barColor = d.count > 0 ? getTierColor(d.count) : undefined;
                return (
                  <button
                    key={d.dateStr}
                    onClick={() => setSelectedDay(isSelected ? null : d.dateStr)}
                    className="flex-1 h-full flex flex-col items-center justify-end group"
                    title={`${d.day}: ${d.count}`}
                  >
                    <div className="w-full flex items-end justify-center h-full">
                      <div
                        className={`w-full rounded-t-sm transition-all duration-200 ${
                          d.count === 0 ? 'bg-[#E8E8E8] dark:bg-[#2A2A2A]' : ''
                        } ${isSelected ? 'ring-2 ring-[#1A1A1A] dark:ring-[#F5F5F5] ring-offset-1' : 'group-hover:opacity-80'}`}
                        style={{
                          height: d.count > 0 ? `${Math.max(heightPct, 6)}%` : '2px',
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
            {/* Números dos dias (a cada 5 para não poluir) */}
            <div className="flex items-center justify-between gap-[2px] mt-1">
              {monthData.byDay.map((d) => (
                <div key={d.dateStr} className="flex-1 text-center">
                  {(d.day === 1 || d.day % 5 === 0) && (
                    <span className="text-[8px] text-[#6B6B6B] dark:text-[#A0A0A0]">{d.day}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Legenda de cores por quantidade */}
            <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-[#E8E8E8] dark:border-[#2A2A2A]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: TIER_BRONZE }} />
                <span className="text-[10px] text-[#6B6B6B] dark:text-[#A0A0A0]">1–2</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: TIER_SILVER }} />
                <span className="text-[10px] text-[#6B6B6B] dark:text-[#A0A0A0]">3–4</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: TIER_GOLD }} />
                <span className="text-[10px] text-[#6B6B6B] dark:text-[#A0A0A0]">5+</span>
              </div>
            </div>

            {/* Tarefas do dia selecionado */}
            {selectedDay && (
              <div className="mt-4 pt-4 border-t border-[#E8E8E8] dark:border-[#2A2A2A] animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-sm font-medium text-[#1A1A1A] dark:text-[#F5F5F5] mb-3 capitalize">
                  {format(parseISO(selectedDay), "dd 'de' MMMM · EEEE", { locale: dateLocale })}
                </p>
                {selectedDayTasks.length === 0 ? (
                  <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">{t.noTasksForDay}</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayTasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-2 text-sm">
                        <span className="text-[#8B7355] dark:text-[#A89580] mt-0.5">✓</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[#1A1A1A] dark:text-[#F5F5F5]">{task.text}</span>
                          {(task.duration_min || task.category) && (
                            <span className="text-[#6B6B6B] dark:text-[#A0A0A0] text-xs ml-1">
                              ({task.duration_min ? `${task.duration_min}min` : ''}
                              {task.duration_min && task.category ? ', ' : ''}
                              {task.category ? translateCategory(task.category) : ''})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Horas por categoria */}
          <div className="bg-[#FFFFFF] dark:bg-[#151515] rounded-2xl p-4 border border-[#E8E8E8] dark:border-[#2A2A2A]">
            <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] uppercase tracking-wider mb-4">
              {t.focusHours} · {t.byCategory}
            </p>
            <div className="space-y-3">
              {MAIN_CATEGORIES.map((cat) => {
                const minutes = monthData.categoryMinutes[cat] || 0;
                const hours = minutes / 60;
                const widthPct = minutes > 0 ? (minutes / monthData.maxCategoryMinutes) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#1A1A1A] dark:text-[#F5F5F5]">
                        {translateCategory(cat)}
                      </span>
                      <span className="text-xs font-medium text-[#6B6B6B] dark:text-[#A0A0A0]">
                        {hours.toFixed(1)}h
                      </span>
                    </div>
                    <div className="h-2.5 bg-[#F0EDE8] dark:bg-[#2A2A2A] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: CATEGORY_COLORS[cat],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gráfico ANUAL: tarefas concluídas por mês */}
          <div className="bg-[#FFFFFF] dark:bg-[#151515] rounded-2xl p-4 border border-[#E8E8E8] dark:border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] uppercase tracking-wider">
                {settings.language === 'pt' ? 'Evolução anual · concluídas' : 'Annual evolution · completed'}
              </p>
              {/* Navegação de ano */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedYear((y) => y - 1)}
                  className="p-1 hover:bg-[#FAFAF8] dark:hover:bg-[#2A2A2A]/50 rounded transition-all active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4 text-[#6B6B6B] dark:text-[#A0A0A0]" />
                </button>
                <span className="text-sm font-medium text-[#1A1A1A] dark:text-[#F5F5F5] w-12 text-center">
                  {selectedYear}
                </span>
                <button
                  onClick={() => setSelectedYear((y) => Math.min(y + 1, currentYear))}
                  disabled={selectedYear >= currentYear}
                  className={`p-1 rounded transition-all ${
                    selectedYear >= currentYear
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-[#FAFAF8] dark:hover:bg-[#2A2A2A]/50 active:scale-95'
                  }`}
                >
                  <ChevronRight className="w-4 h-4 text-[#6B6B6B] dark:text-[#A0A0A0]" />
                </button>
              </div>
            </div>

            {/* Barras dos 12 meses */}
            <div className="flex items-end justify-between gap-1 h-32">
              {annualData.months.map((count, i) => {
                const heightPct = count > 0 ? (count / annualData.maxMonth) * 100 : 0;
                return (
                  <div key={i} className="flex-1 h-full flex flex-col items-center justify-end" title={`${count}`}>
                    {count > 0 && (
                      <span className="text-[9px] font-medium text-[#8B7355] dark:text-[#A89580] mb-0.5">
                        {count}
                      </span>
                    )}
                    <div className="w-full flex items-end justify-center h-full">
                      <div
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          count === 0 ? 'bg-[#E8E8E8] dark:bg-[#2A2A2A]' : 'bg-[#8B7355] dark:bg-[#A89580]'
                        }`}
                        style={{ height: count > 0 ? `${Math.max(heightPct, 6)}%` : '2px' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Rótulos dos meses */}
            <div className="flex items-center justify-between gap-1 mt-1">
              {annualData.months.map((_, i) => (
                <div key={i} className="flex-1 text-center">
                  <span className="text-[8px] text-[#6B6B6B] dark:text-[#A0A0A0] capitalize">
                    {format(new Date(selectedYear, i, 1), 'MMM', { locale: dateLocale }).slice(0, 3)}
                  </span>
                </div>
              ))}
            </div>
            {/* Total do ano */}
            <p className="text-center text-xs text-[#6B6B6B] dark:text-[#A0A0A0] mt-3 pt-3 border-t border-[#E8E8E8] dark:border-[#2A2A2A]">
              {settings.language === 'pt'
                ? `${annualData.totalYear} tarefas concluídas em ${selectedYear}`
                : `${annualData.totalYear} tasks completed in ${selectedYear}`}
            </p>
          </div>

          {/* Histórico de Socorros (recolhível) */}
          {monthData.rescues.length > 0 && (
            <Accordion type="single" collapsible>
              <AccordionItem
                value="rescues"
                className="bg-[#FFFFFF] dark:bg-[#151515] rounded-2xl border border-[#E8E8E8] dark:border-[#2A2A2A] overflow-hidden"
              >
                <AccordionTrigger className="hover:no-underline px-4 py-3 hover:bg-[#FAFAF8] dark:hover:bg-[#0A0A0A] transition-all duration-300">
                  <span className="font-serif text-base font-light text-[#1A1A1A] dark:text-[#F5F5F5]">
                    {t.rescueHistory} ({monthData.rescues.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4">
                    {monthData.rescues.map((rescue) => (
                      <div
                        key={rescue.id}
                        className="border border-[#E8E8E8] dark:border-[#2A2A2A] rounded-xl p-4"
                      >
                        <p className="text-sm font-medium text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">
                          {format(parseISO(rescue.date), "dd/MM/yyyy 'às' HH:mm")}
                        </p>
                        <div className="space-y-2 text-xs bg-[#FAFAF8] dark:bg-[#0A0A0A] rounded-lg p-3">
                          <div>
                            <span className="text-[#6B6B6B] dark:text-[#A0A0A0]">{t.source}</span>
                            <span className="ml-2 font-medium text-[#1A1A1A] dark:text-[#F5F5F5]">
                              {rescue.phase1_source}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#6B6B6B] dark:text-[#A0A0A0]">{t.phase5Label}</span>
                            <span className="ml-2 font-medium text-[#8B7355] dark:text-[#A89580]">
                              {rescue.phase5_target}
                            </span>
                          </div>
                        </div>
                        {(rescue.reflection_cause ||
                          rescue.reflection_adjust ||
                          rescue.reflection_nugget) && (
                          <div className="mt-3 bg-[#8B7355]/5 dark:bg-[#A89580]/5 rounded-lg p-3">
                            <p className="font-medium mb-2 text-xs text-[#1A1A1A] dark:text-[#F5F5F5]">
                              {t.reflection}
                            </p>
                            <div className="space-y-1 text-xs text-[#1A1A1A] dark:text-[#F5F5F5]">
                              {rescue.reflection_cause && <p>"{rescue.reflection_cause}"</p>}
                              {rescue.reflection_adjust && (
                                <p className="italic">
                                  {t.adjust} {rescue.reflection_adjust}
                                </p>
                              )}
                              {rescue.reflection_nugget && (
                                <p className="font-medium">💡 {rescue.reflection_nugget}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      )}
    </div>
  );
}
