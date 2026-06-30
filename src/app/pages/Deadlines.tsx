import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Check, Trash2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { deadlinesApi, calcularDiasRestantes } from '../lib/deadlines-api';
import type { Deadline } from '../types';
import { toast } from 'sonner';
import { translations } from '../utils/translations';

export function Deadlines() {
  const navigate = useNavigate();
  const { deadlines, refreshDeadlines, settings } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    deadline_date: '',
    notes: ''
  });

  const t = translations[settings.language];

  const [ativas, setAtivas] = useState<Deadline[]>([]);
  const [atrasadas, setAtrasadas] = useState<Deadline[]>([]);
  const [concluidas, setConcluidas] = useState<Deadline[]>([]);

  useEffect(() => {
    organizeDeadlines();
  }, [deadlines]);

  const organizeDeadlines = () => {
    const now = new Date();
    
    const ativasList: Deadline[] = [];
    const atrasadasList: Deadline[] = [];
    const concluidasList: Deadline[] = [];

    deadlines.forEach(d => {
      if (d.status === 'completed') {
        concluidasList.push(d);
      } else if (new Date(d.deadline_date) < now) {
        atrasadasList.push(d);
      } else {
        ativasList.push(d);
      }
    });

    // Ordenar
    ativasList.sort((a, b) => new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime());
    atrasadasList.sort((a, b) => new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime());
    concluidasList.sort((a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime());

    setAtivas(ativasList);
    setAtrasadas(atrasadasList);
    setConcluidas(concluidasList.slice(0, 10)); // Últimas 10
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.title.length < 3 || formData.title.length > 100) {
      toast.error(t.title_length_error);
      return;
    }

    if (!formData.deadline_date) {
      toast.error(t.select_deadline_date);
      return;
    }

    const selectedDate = new Date(formData.deadline_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      toast.error(t.deadline_date_future);
      return;
    }

    try {
      if (editingDeadline) {
        await deadlinesApi.update(editingDeadline.id, formData);
        toast.success(t.deadline_updated);
      } else {
        await deadlinesApi.create(formData);
        const locale = settings.language === 'pt' ? 'pt-BR' : 'en-US';
        const dataFormatada = new Date(formData.deadline_date).toLocaleDateString(locale);
        toast.success(`✅ ${t.deadline_created} ${dataFormatada}`);
      }
      
      await refreshDeadlines();
      setShowModal(false);
      setEditingDeadline(null);
      setFormData({ title: '', deadline_date: '', notes: '' });
    } catch (error) {
      console.error('Error saving deadline:', error);
      toast.error(t.error_saving_deadline);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await deadlinesApi.complete(id);
      toast.success(t.deadline_completed);
      await refreshDeadlines();
    } catch (error) {
      console.error('Error completing deadline:', error);
      toast.error(t.error_completing_deadline);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`${t.confirm_delete_deadline} "${title}"?\n\n${t.confirm_delete_msg}`)) {
      return;
    }

    try {
      await deadlinesApi.delete(id);
      toast.success(t.deadline_deleted);
      await refreshDeadlines();
    } catch (error) {
      console.error('Error deleting deadline:', error);
      toast.error(t.error_deleting_deadline);
    }
  };

  const openEditModal = (deadline: Deadline) => {
    setEditingDeadline(deadline);
    setFormData({
      title: deadline.title,
      deadline_date: deadline.deadline_date.split('T')[0],
      notes: deadline.notes || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDeadline(null);
    setFormData({ title: '', deadline_date: '', notes: '' });
  };

  const DeadlineCard = ({ deadline, isOverdue = false }: { deadline: Deadline; isOverdue?: boolean }) => {
    const { dias, horas, texto, textoHoras, cor } = calcularDiasRestantes(deadline.deadline_date, settings.language);
    
    // Corrigir bug de timezone - usar UTC para mostrar data correta
    const deadlineDate = new Date(deadline.deadline_date);
    const locale = settings.language === 'pt' ? 'pt-BR' : 'en-US';
    const dataFormatada = new Date(deadlineDate.getTime() + deadlineDate.getTimezoneOffset() * 60000).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    return (
      <div className={`bg-white dark:bg-[#151515] border rounded-2xl p-5 mb-4 ${
        isOverdue ? 'border-[#F44336] bg-[#FFEBEE] dark:bg-[#2A1515]' : 'border-[#E8E8E8] dark:border-[#2A2A2A]'
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isOverdue ? (
                <span className="text-[#F44336]">⚠️</span>
              ) : (
                <Clock className="w-5 h-5 text-[#8B7355]" />
              )}
              <h3 className="font-serif text-lg font-medium">{deadline.title}</h3>
            </div>
            
            {/* DIAS RESTANTES - DESTACADO */}
            {deadline.status !== 'completed' && (
              <div className="mb-3">
                <p className={`font-serif text-3xl font-semibold leading-tight ${
                  isOverdue ? 'text-[#F44336]' : 
                  dias <= 3 ? 'text-[#F44336]' : 
                  dias <= 7 ? 'text-[#FF9800]' : 
                  'text-[#8B7355]'
                }`}>
                  {texto}
                </p>
                {/* HORAS RESTANTES - Menor e em outra cor */}
                {textoHoras && (
                  <p className="font-sans text-lg font-normal text-[#9E9E9E] dark:text-[#6B6B6B] mt-1">
                    {textoHoras}
                  </p>
                )}
              </div>
            )}
            
            <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] mb-2">
              📅 {dataFormatada}
            </p>
            
            {deadline.notes ? (
              <p className="text-xs text-[#9E9E9E] italic">
                "{deadline.notes.substring(0, 80)}{deadline.notes.length > 80 ? '...' : ''}"
              </p>
            ) : (
              <p className="text-xs text-[#9E9E9E] italic">{t.noAnnotations}</p>
            )}
          </div>

          <div className="flex gap-2 ml-4">
            <button
              onClick={() => openEditModal(deadline)}
              className="p-2 hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A] rounded-lg transition-colors"
              title={t.edit}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            
            {deadline.status !== 'completed' && (
              <button
                onClick={() => handleComplete(deadline.id)}
                className="p-2 hover:bg-[#E8F5E9] dark:hover:bg-[#1A2A1A] text-[#4CAF50] rounded-lg transition-colors"
                title={t.markCompleted}
              >
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0A0A0A] text-[#1A1A1A] dark:text-[#F5F5F5] pb-32">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#FAFAF8]/95 dark:bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#E8E8E8] dark:border-[#2A2A2A]">
        <div className="max-w-[800px] mx-auto px-5 md:px-10 py-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/home')}
                className="p-2 hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A] rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="font-serif text-2xl font-light">{t.deadlinesTitle}</h1>
            </div>
            
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#8B7355] hover:bg-[#6d5c47] text-white rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>{t.new}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[800px] mx-auto px-5 md:px-10 pt-28">
        {/* Seção Ativas */}
        {ativas.length > 0 && (
          <div className="mb-8">
            <h2 className="font-serif text-lg font-light mb-4 text-[#6B6B6B] dark:text-[#A0A0A0]">
              {t.activeDeadlines} ({ativas.length})
            </h2>
            {ativas.map(deadline => (
              <DeadlineCard key={deadline.id} deadline={deadline} />
            ))}
          </div>
        )}

        {/* Seção Atrasadas */}
        {atrasadas.length > 0 && (
          <div className="mb-8">
            <h2 className="font-serif text-lg font-light mb-4 text-[#F44336]">
              {t.overdueDeadlines} ({atrasadas.length})
            </h2>
            {atrasadas.map(deadline => (
              <DeadlineCard key={deadline.id} deadline={deadline} isOverdue />
            ))}
          </div>
        )}

        {/* Seção Concluídas */}
        {concluidas.length > 0 && (
          <div className="mb-8">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full flex items-center justify-between mb-4 text-left"
            >
              <h2 className="font-serif text-lg font-light text-[#6B6B6B] dark:text-[#A0A0A0]">
                {t.completedDeadlinesSection} ({concluidas.length})
              </h2>
              <span className="text-2xl">{showCompleted ? '▼' : '▶'}</span>
            </button>
            
            {showCompleted && concluidas.map(deadline => (
              <DeadlineCard key={deadline.id} deadline={deadline} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {deadlines.length === 0 && (
          <div className="text-center py-20">
            <Clock className="w-16 h-16 mx-auto mb-4 text-[#6B6B6B] dark:text-[#A0A0A0]" />
            <h3 className="font-serif text-xl font-light mb-2">{t.noDeadlinesSet}</h3>
            <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] mb-6">
              {t.createDeadlinesImportant}
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-[#8B7355] hover:bg-[#6d5c47] text-white rounded-xl transition-colors"
            >
              {t.createFirstDeadlineButton}
            </button>
          </div>
        )}
      </div>

      {/* Modal Criar/Editar */}
      {showModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 z-50 animate-in fade-in duration-200"
            onClick={closeModal}
          />
          
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
            <div className="bg-white dark:bg-[#0A0A0A] rounded-3xl shadow-2xl max-w-[500px] w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              <form onSubmit={handleSubmit}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#E8E8E8] dark:border-[#2A2A2A]">
                  <h2 className="font-serif text-2xl font-light">
                    {editingDeadline ? t.editDeadlineTitle : t.newDeadlineTitle}
                  </h2>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="p-2 hover:bg-[#E8E8E8] dark:hover:bg-[#2A2A2A] rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Título */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t.deadlineTitleLabel}
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder={t.deadlineTitlePlaceholder}
                      className="w-full px-4 py-3 bg-[#FAFAF8] dark:bg-[#151515] border border-[#E8E8E8] dark:border-[#2A2A2A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
                      required
                      minLength={3}
                      maxLength={100}
                    />
                    <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] mt-1">
                      {formData.title.length}/100 {t.characters}
                    </p>
                  </div>

                  {/* Data */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t.deadlineDateLabel}
                    </label>
                    <input
                      type="date"
                      value={formData.deadline_date}
                      onChange={(e) => setFormData({ ...formData, deadline_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-[#FAFAF8] dark:bg-[#151515] border border-[#E8E8E8] dark:border-[#2A2A2A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
                      required
                    />
                  </div>

                  {/* Anotações */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t.notesLabel}
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder={t.notesPlaceholder}
                      rows={4}
                      maxLength={500}
                      className="w-full px-4 py-3 bg-[#FAFAF8] dark:bg-[#151515] border border-[#E8E8E8] dark:border-[#2A2A2A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B7355] resize-none"
                    />
                    <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] mt-1">
                      {formData.notes.length}/500 {t.characters}
                    </p>
                  </div>

                  {/* Dica */}
                  <div className="bg-[#FFF9E6] dark:bg-[#2A2515] border border-[#FFE082] dark:border-[#6B5B35] rounded-xl p-4">
                    <p className="text-sm text-[#6B5B2A] dark:text-[#FFE082]">
                      💡 <strong>{t.tipLabel}</strong> {t.tipDeadlineText}
                    </p>
                  </div>

                  {/* Botões */}
                  <div className="flex gap-3">
                    {editingDeadline && (
                      <button
                        type="button"
                        onClick={() => handleDelete(editingDeadline.id, editingDeadline.title)}
                        className="px-6 py-3 text-[#F44336] hover:bg-[#FFEBEE] dark:hover:bg-[#2A1515] rounded-xl transition-colors"
                      >
                        {t.deleteBtnText}
                      </button>
                    )}
                    
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-[#8B7355] hover:bg-[#6d5c47] text-white rounded-xl font-medium transition-colors"
                    >
                      {editingDeadline ? t.saveChangesBtnText : t.createDeadlineBtnText}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}