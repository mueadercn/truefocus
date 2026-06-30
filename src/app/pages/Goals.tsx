import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Edit2, Save, Trash2, Plus, ChevronDown, ChevronUp, Calendar, Archive, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translations } from '../utils/translations';
import { supabase } from '../lib/supabase';

interface Goal {
  id: string;
  user_id: string;
  year: number;
  text: string;
  order: number;
  status: 'pending' | 'completed' | 'partial' | 'not_completed';
  created_at: string;
  reviewed_at: string | null;
}

interface YearSummary {
  year: number;
  total: number;
  completed: number;
  partial: number;
  not_completed: number;
}

const INSPIRATIONAL_QUOTES = [
  'goalsQuote1', 'goalsQuote2', 'goalsQuote3', 'goalsQuote4', 'goalsQuote5',
  'goalsQuote6', 'goalsQuote7', 'goalsQuote8', 'goalsQuote9', 'goalsQuote10',
];

export function Goals() {
  const { settings } = useApp();
  const t = translations[settings.language];
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [yearSummaries, setYearSummaries] = useState<YearSummary[]>([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, 'completed' | 'partial' | 'not_completed'>>({});
  const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null);
  const [randomQuote] = useState(() => INSPIRATIONAL_QUOTES[Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length)]);

  useEffect(() => {
    loadAvailableYears();
    loadGoals();
  }, [selectedYear]);

  const loadAvailableYears = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('goals')
        .select('year')
        .eq('user_id', session.user.id);

      if (!error && data) {
        const years = [...new Set(data.map(g => g.year))].sort((a, b) => b - a);
        setAvailableYears(years.length > 0 ? years : [currentYear]);
      }
    } catch (error) {
      console.error('Error loading years:', error);
    }
  };

  const loadGoals = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data: goalsData, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('year', selectedYear)
        .order('order', { ascending: true });

      if (error) {
        console.error('Error loading goals:', error);
        setLoading(false);
        return;
      }

      setGoals(goalsData || []);
    } catch (error) {
      console.error(t.errorLoadingGoals, error);
    } finally {
      setLoading(false);
    }
  };

  const loadYearSummaries = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('goals')
        .select('year, status')
        .eq('user_id', session.user.id)
        .order('year', { ascending: false });

      if (!error && data) {
        const summaries: Record<number, YearSummary> = {};
        
        data.forEach(goal => {
          if (!summaries[goal.year]) {
            summaries[goal.year] = { year: goal.year, total: 0, completed: 0, partial: 0, not_completed: 0 };
          }
          summaries[goal.year].total++;
          if (goal.status === 'completed') summaries[goal.year].completed++;
          else if (goal.status === 'partial') summaries[goal.year].partial++;
          else if (goal.status === 'not_completed') summaries[goal.year].not_completed++;
        });

        setYearSummaries(Object.values(summaries));
      }
    } catch (error) {
      console.error('Error loading summaries:', error);
    }
  };

  const handleAddGoal = async () => {
    if (newGoalText.trim().length < 10 || newGoalText.trim().length > 100) {
      alert(newGoalText.trim().length < 10 ? t.goalTooShort : t.goalTooLong);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        alert('Please log in again');
        return;
      }

      const { data: newGoal, error } = await supabase
        .from('goals')
        .insert({
          user_id: session.user.id,
          year: selectedYear,
          text: newGoalText.trim(),
          order: goals.length + 1,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        alert(`Error: ${error.message}`);
        return;
      }

      setGoals([...goals, newGoal]);
      setNewGoalText('');
      setShowAddModal(false);
      loadAvailableYears();
    } catch (error) {
      console.error(t.errorCreatingGoal, error);
      alert(t.errorCreatingGoal);
    }
  };

  const handleUpdateGoal = async (goalId: string, newText: string) => {
    if (newText.trim().length < 10 || newText.trim().length > 100) {
      alert(newText.trim().length < 10 ? t.goalTooShort : t.goalTooLong);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        alert('Please log in again');
        return;
      }

      const { data: updatedGoal, error } = await supabase
        .from('goals')
        .update({ text: newText.trim() })
        .eq('id', goalId)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating goal:', error);
        alert(t.errorUpdatingGoal);
        return;
      }

      setGoals(goals.map(g => g.id === goalId ? updatedGoal : g));
      setEditingGoal(null);
      setEditText('');
    } catch (error) {
      console.error(t.errorUpdatingGoal, error);
      alert(t.errorUpdatingGoal);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!window.confirm(t.confirmDeleteGoal)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        alert('Please log in again');
        return;
      }

      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error deleting goal:', error);
        alert(t.errorDeletingGoal);
        return;
      }

      setGoals(goals.filter(g => g.id !== goalId));
    } catch (error) {
      console.error(t.errorDeletingGoal, error);
      alert(t.errorDeletingGoal);
    }
  };

  const handleReorderGoal = async (goalId: string, direction: 'up' | 'down') => {
    const goalIndex = goals.findIndex(g => g.id === goalId);
    if ((direction === 'up' && goalIndex === 0) || (direction === 'down' && goalIndex === goals.length - 1)) return;

    const newGoals = [...goals];
    const targetIndex = direction === 'up' ? goalIndex - 1 : goalIndex + 1;
    [newGoals[goalIndex], newGoals[targetIndex]] = [newGoals[targetIndex], newGoals[goalIndex]];
    
    setGoals(newGoals);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const updates = newGoals.map((goal, index) => ({
        id: goal.id,
        order: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from('goals')
          .update({ order: update.order })
          .eq('id', update.id)
          .eq('user_id', session.user.id);
      }
    } catch (error) {
      console.error('Error reordering:', error);
      loadGoals();
    }
  };

  const handleUpdateStatus = async (goalId: string, newStatus: 'pending' | 'completed' | 'partial' | 'not_completed') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        alert('Please log in again');
        return;
      }

      const { data: updatedGoal, error } = await supabase
        .from('goals')
        .update({ status: newStatus })
        .eq('id', goalId)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating status:', error);
        alert('Error updating status');
        return;
      }

      setGoals(goals.map(g => g.id === goalId ? updatedGoal : g));
      setShowStatusMenu(null);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  const handleSaveReview = async () => {
    const allMarked = goals.every(g => reviewStatuses[g.id]);
    if (!allMarked) {
      alert(t.markAllGoalsWarning);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      for (const goal of goals) {
        await supabase
          .from('goals')
          .update({
            status: reviewStatuses[goal.id],
            reviewed_at: new Date().toISOString()
          })
          .eq('id', goal.id)
          .eq('user_id', session.user.id);
      }

      setShowReviewModal(false);
      loadGoals();
      alert('Review saved!');
    } catch (error) {
      console.error('Error saving review:', error);
      alert('Error saving review');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#6B6B6B] dark:text-[#A0A0A0]">Loading...</div>
      </div>
    );
  }

  const canAddGoals = selectedYear >= currentYear && goals.length < 10;
  const canReview = selectedYear < currentYear && goals.length > 0 && goals.some(g => g.status === 'pending');

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0A0A0A] py-8 px-5">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/home')}
              className="p-2 hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A] rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-[#8B7355] dark:text-[#A89580]" />
            </button>
            <h1 className="font-serif text-2xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">
              GOALS {selectedYear}
            </h1>
          </div>
          
          <div className="flex gap-2">
            {/* Year Selector */}
            <div className="relative">
              <button
                onClick={() => setShowYearSelector(!showYearSelector)}
                className="p-2 hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A] rounded-lg transition-colors"
              >
                <Calendar className="w-5 h-5 text-[#8B7355] dark:text-[#A89580]" />
              </button>
              {showYearSelector && (
                <div className="absolute right-0 mt-2 bg-white dark:bg-[#151515] border border-[#E8E8E8] dark:border-[#2A2A2A] rounded-lg shadow-lg p-2 z-10 max-h-64 overflow-y-auto">
                  {/* Gerar array de anos: anos disponíveis + próximos 10 anos */}
                  {Array.from(new Set([...availableYears, ...Array.from({ length: 11 }, (_, i) => currentYear + i)]))
                    .sort((a, b) => b - a)
                    .map(year => (
                      <button
                        key={year}
                        onClick={() => {
                          setSelectedYear(year);
                          setShowYearSelector(false);
                        }}
                        className={`block w-full text-left px-4 py-2 rounded hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A] ${
                          year === selectedYear ? 'bg-[#E8E8E8] dark:bg-[#2A2A2A] font-medium' : ''
                        }`}
                      >
                        {year} {year === currentYear && '(current)'}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Archive */}
            <button
              onClick={() => {
                setShowArchive(true);
                loadYearSummaries();
              }}
              className="p-2 hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A] rounded-lg transition-colors"
            >
              <Archive className="w-5 h-5 text-[#8B7355] dark:text-[#A89580]" />
            </button>
          </div>
        </div>

        {/* Review Button (for past years) */}
        {canReview && (
          <button
            onClick={() => setShowReviewModal(true)}
            className="w-full mb-4 py-3 bg-gradient-to-r from-[#4CAF50] to-[#45A049] text-white font-serif text-base rounded-xl hover:shadow-lg transition-shadow"
          >
            {t.goalsReview} {selectedYear}
          </button>
        )}

        {/* Goals List */}
        <div className="mb-4">
          {goals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#6B6B6B] dark:text-[#A0A0A0] mb-4">
                {t.noGoalsYet}
              </p>
              <p className="text-sm text-[#8B7355] dark:text-[#A89580] mb-6">
                {t.createYourFirstGoal}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal, index) => (
                <div
                  key={goal.id}
                  className="bg-white dark:bg-[#151515] rounded-xl border border-[#E8E8E8] dark:border-[#2A2A2A] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {editingGoal === goal.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FAFAF8] dark:bg-[#0A0A0A] border border-[#E8E8E8] dark:border-[#2A2A2A] rounded-lg text-[#1A1A1A] dark:text-[#F5F5F5] font-serif resize-none"
                            maxLength={100}
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateGoal(goal.id, editText)}
                              className="flex-1 px-3 py-2 bg-[#4CAF50] text-white text-sm rounded-lg hover:bg-[#45A049] transition-colors"
                            >
                              {t.save}
                            </button>
                            <button
                              onClick={() => {
                                setEditingGoal(null);
                                setEditText('');
                              }}
                              className="flex-1 px-3 py-2 bg-[#6B6B6B] text-white text-sm rounded-lg hover:bg-[#5B5B5B] transition-colors"
                            >
                              {t.cancel}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="font-serif text-base text-[#1A1A1A] dark:text-[#F5F5F5] mb-1">
                            {index + 1}. {goal.text}
                          </p>
                          <div className="relative inline-block">
                            <button
                              onClick={() => setShowStatusMenu(showStatusMenu === goal.id ? null : goal.id)}
                              className="text-xs text-[#8B7355] dark:text-[#A89580] hover:text-[#6B5A45] dark:hover:text-[#9A8670] transition-colors"
                            >
                              {goal.status === 'completed' && `✅ ${t.goalCompleted}`}
                              {goal.status === 'partial' && `🟡 ${t.goalPartial}`}
                              {goal.status === 'not_completed' && `❌ ${t.goalNotCompleted}`}
                              {goal.status === 'pending' && `🟡 ${t.inProgress}`}
                            </button>
                            {showStatusMenu === goal.id && (
                              <div className="absolute left-0 mt-1 bg-white dark:bg-[#151515] border border-[#E8E8E8] dark:border-[#2A2A2A] rounded-lg shadow-lg p-2 z-10 min-w-[150px]">
                                <button
                                  onClick={() => handleUpdateStatus(goal.id, 'pending')}
                                  className="block w-full text-left px-3 py-2 rounded hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A] text-sm"
                                >
                                  🟡 {t.inProgress}
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(goal.id, 'completed')}
                                  className="block w-full text-left px-3 py-2 rounded hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A] text-sm"
                                >
                                  ✅ {t.goalCompleted}
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(goal.id, 'partial')}
                                  className="block w-full text-left px-3 py-2 rounded hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A] text-sm"
                                >
                                  🟡 {t.goalPartial}
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(goal.id, 'not_completed')}
                                  className="block w-full text-left px-3 py-2 rounded hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A] text-sm"
                                >
                                  ❌ {t.goalNotCompleted}
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {editingGoal !== goal.id && selectedYear >= currentYear && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleReorderGoal(goal.id, 'up')}
                          disabled={index === 0}
                          className="p-1.5 hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A] rounded transition-colors disabled:opacity-30"
                        >
                          <ChevronUp className="w-4 h-4 text-[#8B7355] dark:text-[#A89580]" />
                        </button>
                        <button
                          onClick={() => handleReorderGoal(goal.id, 'down')}
                          disabled={index === goals.length - 1}
                          className="p-1.5 hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A] rounded transition-colors disabled:opacity-30"
                        >
                          <ChevronDown className="w-4 h-4 text-[#8B7355] dark:text-[#A89580]" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingGoal(goal.id);
                            setEditText(goal.text);
                          }}
                          className="p-1.5 hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A] rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-[#8B7355] dark:text-[#A89580]" />
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="p-1.5 hover:bg-[#FFE5E5] dark:hover:bg-[#3A1A1A] rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-[#FF6B35] dark:text-[#FF8A65]" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Visibility Message */}
        {goals.length > 0 && selectedYear >= currentYear && (
          <div className="mb-4 p-3 bg-[#FFF8E1] dark:bg-[#2A2416] rounded-lg border border-[#FFE082] dark:border-[#4A3A16]">
            <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] font-serif">
              💡 {t.goalsVisibilityMessage}
            </p>
          </div>
        )}

        {/* Add Goal Button */}
        {canAddGoals && (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full py-4 bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#DAA520] text-white font-serif text-lg rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
          >
            <div className="flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" />
              {t.addGoal} ({goals.length}/10)
            </div>
          </button>
        )}

        {/* Add Goal Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowAddModal(false)}>
            <div className="bg-white dark:bg-[#151515] rounded-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">
                  {t.newGoalFor} {selectedYear}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewGoalText('');
                  }}
                  className="text-[#6B6B6B] dark:text-[#A0A0A0] hover:text-[#1A1A1A] dark:hover:text-[#F5F5F5]"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <p className="text-[#6B6B6B] dark:text-[#A0A0A0] mb-3">
                  {t.whatsYourGoal}
                </p>
                <textarea
                  value={newGoalText}
                  onChange={(e) => setNewGoalText(e.target.value)}
                  placeholder={t.goalPlaceholder}
                  maxLength={100}
                  className="w-full px-4 py-3 bg-[#FAFAF8] dark:bg-[#0A0A0A] border border-[#E8E8E8] dark:border-[#2A2A2A] rounded-lg text-[#1A1A1A] dark:text-[#F5F5F5] font-serif resize-none"
                  rows={3}
                />
                <p className="text-sm text-[#8B7355] dark:text-[#A89580] mt-2">
                  {newGoalText.length}/100 {t.charactersCount}
                </p>
              </div>

              <div className="mb-6 p-4 bg-[#FAFAF8] dark:bg-[#0A0A0A] rounded-lg">
                <h3 className="font-serif font-medium text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">
                  {t.tipsForGoodGoals}
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-[#4CAF50] dark:text-[#66BB6A] mb-1">
                      {t.writeTransformations}
                    </p>
                    <p className="text-[#6B6B6B] dark:text-[#A0A0A0] mb-1">
                      {t.writeTransformationsDesc}
                    </p>
                    <p className="text-[#8B7355] dark:text-[#A89580]">{t.exampleGoal1}</p>
                    <p className="text-[#8B7355] dark:text-[#A89580]">{t.exampleGoal2}</p>
                    <p className="text-[#8B7355] dark:text-[#A89580]">{t.exampleGoal3}</p>
                  </div>

                  <div>
                    <p className="font-medium text-[#FF6B35] dark:text-[#FF8A65] mb-1">
                      {t.avoidTasksNumbers}
                    </p>
                    <p className="text-[#8B7355] dark:text-[#A89580]">{t.exampleBadGoal1}</p>
                    <p className="text-[#8B7355] dark:text-[#A89580]">{t.exampleBadGoal2}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAddGoal}
                disabled={newGoalText.trim().length < 10}
                className="w-full py-3 bg-gradient-to-r from-[#FF6B35] to-[#F44336] text-white font-serif text-lg rounded-xl hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.createGoal}
              </button>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowReviewModal(false)}>
            <div className="bg-white dark:bg-[#151515] rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-serif text-2xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">
                    {t.goalsReview} - {selectedYear}
                  </h2>
                  <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] mt-1">
                    {t.beHonestWithYourself} {t.onlyLearning}
                  </p>
                </div>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-[#6B6B6B] dark:text-[#A0A0A0] hover:text-[#1A1A1A] dark:hover:text-[#F5F5F5]"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {goals.map((goal, index) => (
                  <div key={goal.id} className="bg-[#FAFAF8] dark:bg-[#0A0A0A] rounded-lg p-4">
                    <p className="font-serif text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">
                      {index + 1}. {goal.text}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setReviewStatuses({ ...reviewStatuses, [goal.id]: 'completed' })}
                        className={`flex-1 py-2 rounded-lg border transition-colors ${
                          reviewStatuses[goal.id] === 'completed'
                            ? 'bg-[#4CAF50] text-white border-[#4CAF50]'
                            : 'border-[#E8E8E8] dark:border-[#2A2A2A] hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A]'
                        }`}
                      >
                        ✅ {t.goalCompleted}
                      </button>
                      <button
                        onClick={() => setReviewStatuses({ ...reviewStatuses, [goal.id]: 'partial' })}
                        className={`flex-1 py-2 rounded-lg border transition-colors ${
                          reviewStatuses[goal.id] === 'partial'
                            ? 'bg-[#FF9800] text-white border-[#FF9800]'
                            : 'border-[#E8E8E8] dark:border-[#2A2A2A] hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A]'
                        }`}
                      >
                        🟡 {t.goalPartial}
                      </button>
                      <button
                        onClick={() => setReviewStatuses({ ...reviewStatuses, [goal.id]: 'not_completed' })}
                        className={`flex-1 py-2 rounded-lg border transition-colors ${
                          reviewStatuses[goal.id] === 'not_completed'
                            ? 'bg-[#F44336] text-white border-[#F44336]'
                            : 'border-[#E8E8E8] dark:border-[#2A2A2A] hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A]'
                        }`}
                      >
                        ❌ {t.goalNotCompleted}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveReview}
                className="w-full py-3 bg-gradient-to-r from-[#4CAF50] to-[#45A049] text-white font-serif text-lg rounded-xl hover:shadow-lg transition-shadow"
              >
                {t.saveReview}
              </button>
            </div>
          </div>
        )}

        {/* Archive Modal */}
        {showArchive && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowArchive(false)}>
            <div className="bg-white dark:bg-[#151515] rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">
                  {t.goalsArchive}
                </h2>
                <button
                  onClick={() => setShowArchive(false)}
                  className="text-[#6B6B6B] dark:text-[#A0A0A0] hover:text-[#1A1A1A] dark:hover:text-[#F5F5F5]"
                >
                  ✕
                </button>
              </div>

              {yearSummaries.length === 0 ? (
                <p className="text-center text-[#6B6B6B] dark:text-[#A0A0A0] py-12">
                  No previous years found
                </p>
              ) : (
                <div className="space-y-4">
                  {yearSummaries.map(summary => (
                    <div
                      key={summary.year}
                      className="bg-[#FAFAF8] dark:bg-[#0A0A0A] rounded-lg p-6 border border-[#E8E8E8] dark:border-[#2A2A2A]"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-serif text-xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">
                          {summary.year}
                        </h3>
                        <button
                          onClick={() => {
                            setSelectedYear(summary.year);
                            setShowArchive(false);
                          }}
                          className="px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] transition-colors"
                        >
                          {t.viewDetails}
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-center text-sm">
                        <div>
                          <p className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{summary.total}</p>
                          <p className="text-[#6B6B6B] dark:text-[#A0A0A0]">Total</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-[#4CAF50]">{summary.completed}</p>
                          <p className="text-[#6B6B6B] dark:text-[#A0A0A0]">✅ {t.goalCompleted}</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-[#FF9800]">{summary.partial}</p>
                          <p className="text-[#6B6B6B] dark:text-[#A0A0A0]">🟡 {t.goalPartial}</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-[#F44336]">{summary.not_completed}</p>
                          <p className="text-[#6B6B6B] dark:text-[#A0A0A0]">❌ {t.goalNotCompleted}</p>
                        </div>
                      </div>

                      {summary.total > 0 && (
                        <div className="mt-4 pt-4 border-t border-[#E8E8E8] dark:border-[#2A2A2A]">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#6B6B6B] dark:text-[#A0A0A0]">{t.completedPercentage}:</span>
                            <span className="font-medium text-[#1A1A1A] dark:text-[#F5F5F5]">
                              {Math.round(((summary.completed + summary.partial * 0.5) / summary.total) * 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}