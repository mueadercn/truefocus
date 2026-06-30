import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { translations } from '../utils/translations';

export function Dashboard() {
  const navigate = useNavigate();
  const { tasks, rescues, loading, settings } = useApp();

  const t = translations[settings.language];
  const dateLocale = settings.language === 'pt' ? ptBR : enUS;

  // Helper function to translate category names
  const translateCategory = (category: string): string => {
    const categoryMap: Record<string, keyof typeof t> = {
      'Work': 'work',
      'Trabalho': 'work',
      'Exercise': 'exercise',
      'Exercício': 'exercise',
      'Study': 'study',
      'Estudo': 'study',
      'Critical Thinking': 'criticalThinking',
      'Pensamento Crítico': 'criticalThinking',
      'Spirituality': 'spirituality',
      'Espiritualidade': 'spirituality',
      'Leisure': 'leisure',
      'Lazer': 'leisure',
      'Health': 'health',
      'Saúde': 'health',
      'Other': 'other',
      'Outro': 'other',
    };
    
    const key = categoryMap[category];
    return key ? t[key] : category;
  };

  // Group tasks and rescues by month
  const dataByMonth = useMemo(() => {
    const months: Record<string, {
      tasks: typeof tasks;
      rescues: typeof rescues;
      stats: {
        totalCompleted: number;
        totalHours: number;
        categoryBreakdown: Record<string, number>;
        totalRescues: number;
      };
    }> = {};

    // Group tasks by month
    tasks.filter(t => t.completed).forEach(task => {
      const completedDate = task.completed_at ? task.completed_at.split('T')[0] : task.date;
      const monthKey = format(parseISO(completedDate), 'yyyy-MM');
      
      if (!months[monthKey]) {
        months[monthKey] = {
          tasks: [],
          rescues: [],
          stats: {
            totalCompleted: 0,
            totalHours: 0,
            categoryBreakdown: {},
            totalRescues: 0
          }
        };
      }
      
      months[monthKey].tasks.push(task);
    });

    // Group rescues by month
    rescues.forEach(rescue => {
      const rescueDate = rescue.completed_date || rescue.date.split('T')[0];
      const monthKey = format(parseISO(rescueDate), 'yyyy-MM');
      
      if (!months[monthKey]) {
        months[monthKey] = {
          tasks: [],
          rescues: [],
          stats: {
            totalCompleted: 0,
            totalHours: 0,
            categoryBreakdown: {},
            totalRescues: 0
          }
        };
      }
      
      months[monthKey].rescues.push(rescue);
    });

    // Calculate stats for each month
    Object.keys(months).forEach(monthKey => {
      const monthData = months[monthKey];
      
      monthData.stats.totalCompleted = monthData.tasks.length;
      monthData.stats.totalHours = monthData.tasks.reduce((sum, t) => sum + (t.duration_min || 0), 0) / 60;
      
      // Initialize all categories with 0
      const allCategories = ['Work', 'Exercise', 'Study', 'Critical Thinking', 'Spirituality'];
      monthData.stats.categoryBreakdown = allCategories.reduce((acc, category) => {
        acc[category] = 0;
        return acc;
      }, {} as Record<string, number>);
      
      // Add actual values from tasks
      monthData.tasks.forEach(t => {
        if (t.category && allCategories.includes(t.category)) {
          monthData.stats.categoryBreakdown[t.category] = 
            (monthData.stats.categoryBreakdown[t.category] || 0) + (t.duration_min || 0);
        }
      });
      
      monthData.stats.totalRescues = monthData.rescues.length;
    });

    // Sort months descending (newest first)
    return Object.entries(months)
      .sort(([a], [b]) => b.localeCompare(a));
  }, [tasks, rescues]);

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

      {dataByMonth.length === 0 ? (
        <div className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-2xl p-10 border border-[#E8E8E8] dark:border-[#2A2A2A] text-center">
          <p className="text-[#6B6B6B] dark:text-[#A0A0A0]">{t.noMetricsYet}</p>
          <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] mt-2">{t.completeTasksToSee}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Accordion type="multiple" className="w-full space-y-4">
            {dataByMonth.map(([monthKey, monthData]) => {
              const monthDate = parseISO(monthKey + '-01');
              const monthName = format(monthDate, 'MMMM/yyyy', { locale: dateLocale });
              
              // Group tasks by date for this month
              const tasksByDate = monthData.tasks.reduce((acc, task) => {
                const completedDate = task.completed_at ? task.completed_at.split('T')[0] : task.date;
                if (!acc[completedDate]) {
                  acc[completedDate] = [];
                }
                acc[completedDate].push(task);
                return acc;
              }, {} as Record<string, typeof tasks>);

              const sortedDates = Object.entries(tasksByDate).sort(([a], [b]) => b.localeCompare(a));

              return (
                <AccordionItem 
                  key={monthKey} 
                  value={monthKey}
                  className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-2xl border border-[#E8E8E8] dark:border-[#2A2A2A] overflow-hidden"
                >
                  <AccordionTrigger className="hover:no-underline px-5 py-4 hover:bg-[#FAFAF8] dark:hover:bg-[#151515] transition-all duration-300">
                    <span className="font-serif text-xl font-light text-[#1A1A1A] dark:text-[#F5F5F5] capitalize">
                      {monthName}
                    </span>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-5 pb-5">
                    {/* Month Stats */}
                    <div className="mb-5 p-4 bg-[#FAFAF8] dark:bg-[#151515] rounded-xl space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-[#E8E8E8] dark:border-[#2A2A2A]">
                        <span className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">{t.tasksCompleted}</span>
                        <span className="font-serif text-xl font-light text-[#8B7355] dark:text-[#A89580]">
                          {monthData.stats.totalCompleted}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2 border-b border-[#E8E8E8] dark:border-[#2A2A2A]">
                        <span className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">{t.focusHours}</span>
                        <span className="font-serif text-xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">
                          {monthData.stats.totalHours.toFixed(1)}h
                        </span>
                      </div>

                      {Object.keys(monthData.stats.categoryBreakdown).length > 0 && (
                        <div className="py-2 border-b border-[#E8E8E8] dark:border-[#2A2A2A]">
                          <span className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] block mb-3">{t.byCategory}</span>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(monthData.stats.categoryBreakdown).map(([category, minutes]) => (
                              <div key={category} className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-lg p-2">
                                <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0]">{translateCategory(category)}</p>
                                <p className="font-serif text-base font-light text-[#1A1A1A] dark:text-[#F5F5F5] mt-1">
                                  {(minutes / 60).toFixed(1)}h
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">{t.emergencies}</span>
                        <span className="font-serif text-xl font-light text-[#8B7355] dark:text-[#A89580]">
                          {monthData.stats.totalRescues}
                        </span>
                      </div>
                    </div>

                    {/* Tasks by Date */}
                    {sortedDates.length > 0 && (
                      <div className="mb-5">
                        <Accordion type="single" collapsible className="space-y-2">
                          <AccordionItem 
                            value="tasks" 
                            className="bg-[#FAFAF8] dark:bg-[#0A0A0A] rounded-xl border border-[#E8E8E8] dark:border-[#2A2A2A] overflow-hidden"
                          >
                            <AccordionTrigger className="hover:no-underline px-4 py-3 hover:bg-[#F5F5F5] dark:hover:bg-[#151515] transition-all duration-300">
                              <span className="font-serif text-base font-light text-[#1A1A1A] dark:text-[#F5F5F5]">
                                {t.completedTasksLabel} ({monthData.stats.totalCompleted})
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <div className="space-y-4">
                                {sortedDates.map(([date, dateTasks]) => (
                                  <div key={date}>
                                    <p className="text-sm font-medium mb-2 text-[#1A1A1A] dark:text-[#F5F5F5]">
                                      {format(parseISO(date), "dd/MM · EEEE", { locale: dateLocale })}
                                    </p>
                                    <div className="space-y-2 pl-3">
                                      {dateTasks.map(task => {
                                        const completedDate = task.completed_at ? task.completed_at.split('T')[0] : task.date;
                                        const isAdvanced = task.date > completedDate;
                                        
                                        return (
                                          <div
                                            key={task.id}
                                            className="flex items-start gap-2 text-sm"
                                          >
                                            <span className="text-[#8B7355] dark:text-[#A89580] mt-0.5">✓</span>
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[#1A1A1A] dark:text-[#F5F5F5]">{task.text}</span>
                                                {isAdvanced && (
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#8B7355]/10 dark:bg-[#A89580]/10 text-[#8B7355] dark:text-[#A89580] text-[10px] font-medium">
                                                    ⚡ {t.advancedFrom} {format(parseISO(task.date), "dd/MM", { locale: dateLocale })}
                                                  </span>
                                                )}
                                              </div>
                                              {(task.duration_min || task.category) && (
                                                <span className="text-[#6B6B6B] dark:text-[#A0A0A0] text-xs">
                                                  ({task.duration_min && `${task.duration_min}min`}
                                                  {task.duration_min && task.category && ', '} 
                                                  {task.category && translateCategory(task.category)})
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    )}

                    {/* Rescues */}
                    {monthData.rescues.length > 0 && (
                      <div>
                        <Accordion type="single" collapsible className="space-y-2">
                          <AccordionItem 
                            value="rescues" 
                            className="bg-[#FAFAF8] dark:bg-[#0A0A0A] rounded-xl border border-[#E8E8E8] dark:border-[#2A2A2A] overflow-hidden"
                          >
                            <AccordionTrigger className="hover:no-underline px-4 py-3 hover:bg-[#F5F5F5] dark:hover:bg-[#151515] transition-all duration-300">
                              <span className="font-serif text-base font-light text-[#1A1A1A] dark:text-[#F5F5F5]">
                                {t.rescueHistory} ({monthData.stats.totalRescues})
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <div className="space-y-4">
                                {monthData.rescues.map((rescue) => {
                                  const rescueDate = rescue.completed_date || rescue.date.split('T')[0];
                                  const dayTasks = monthData.tasks.filter(
                                    t => t.date === rescueDate && t.completed
                                  );

                                  return (
                                    <div
                                      key={rescue.id}
                                      className="border border-[#E8E8E8] dark:border-[#2A2A2A] rounded-xl p-4"
                                    >
                                      <p className="text-sm font-medium text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">
                                        {format(parseISO(rescue.date), "dd/MM/yyyy 'às' HH:mm")}
                                      </p>

                                      <div className="space-y-2 text-xs bg-[#FAFAF8] dark:bg-[#151515] rounded-lg p-3">
                                        <div>
                                          <span className="text-[#6B6B6B] dark:text-[#A0A0A0]">{t.source}</span>
                                          <span className="ml-2 font-medium text-[#1A1A1A] dark:text-[#F5F5F5]">{rescue.phase1_source}</span>
                                        </div>
                                        <div>
                                          <span className="text-[#6B6B6B] dark:text-[#A0A0A0]">{t.phase2Label}</span>
                                          <span className="ml-2 text-[#1A1A1A] dark:text-[#F5F5F5]">{rescue.phase2_activity}</span>
                                        </div>
                                        <div>
                                          <span className="text-[#6B6B6B] dark:text-[#A0A0A0]">{t.phase3Label}</span>
                                          <span className="ml-2 text-[#1A1A1A] dark:text-[#F5F5F5]">{rescue.phase3_activity}</span>
                                        </div>
                                        <div>
                                          <span className="text-[#6B6B6B] dark:text-[#A0A0A0]">{t.phase4Label}</span>
                                          <span className="ml-2 text-[#1A1A1A] dark:text-[#F5F5F5]">{rescue.phase4_activity}</span>
                                        </div>
                                        <div>
                                          <span className="text-[#6B6B6B] dark:text-[#A0A0A0]">{t.phase5Label}</span>
                                          <span className="ml-2 font-medium text-[#8B7355] dark:text-[#A89580]">
                                            {rescue.phase5_target}
                                          </span>
                                        </div>
                                      </div>

                                      {(rescue.reflection_cause || rescue.reflection_adjust || rescue.reflection_nugget) && (
                                        <div className="mt-3 bg-[#8B7355]/5 dark:bg-[#A89580]/5 rounded-lg p-3">
                                          <p className="font-medium mb-2 text-xs text-[#1A1A1A] dark:text-[#F5F5F5]">{t.reflection}</p>
                                          <div className="space-y-1 text-xs text-[#1A1A1A] dark:text-[#F5F5F5]">
                                            {rescue.reflection_cause && (
                                              <p>\"{rescue.reflection_cause}\"</p>
                                            )}
                                            {rescue.reflection_adjust && (
                                              <p className="italic">{t.adjust} {rescue.reflection_adjust}</p>
                                            )}
                                            {rescue.reflection_nugget && (
                                              <p className="font-medium">💡 {rescue.reflection_nugget}</p>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {dayTasks.length > 0 && (
                                        <div className="mt-3">
                                          <p className="text-xs font-medium text-[#8B7355] dark:text-[#A89580] mb-2">
                                            {t.tasksCompletedCount} {dayTasks.length}
                                          </p>
                                          <div className="space-y-1 pl-3">
                                            {dayTasks.map(task => (
                                              <p key={task.id} className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0]">
                                                → {task.text} {task.duration_min && `(${task.duration_min}min)`}
                                              </p>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}
    </div>
  );
}