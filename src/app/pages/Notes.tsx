import { useMemo, useState } from 'react';
import { ArrowLeft, Search, Trash2, PenLine } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { format, parseISO } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { translations } from '../utils/translations';

export function Notes() {
  const navigate = useNavigate();
  const { notes, deleteNote, loading, settings } = useApp();

  const t = translations[settings.language];
  const dateLocale = settings.language === 'pt' ? ptBR : enUS;

  const [search, setSearch] = useState('');

  // Filtra por busca (substring, case-insensitive) e agrupa por mês
  const notesByMonth = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? notes.filter((n) => n.content.toLowerCase().includes(term))
      : notes;

    // Ordena por created_at desc
    const sorted = [...filtered].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );

    const groups: Record<string, typeof notes> = {};
    sorted.forEach((note) => {
      const monthKey = format(parseISO(note.created_at), 'yyyy-MM');
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(note);
    });

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [notes, search]);

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
          {t.notesTitle || 'Anotações'}
        </h1>
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B] dark:text-[#A0A0A0]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchNotes || 'Buscar em suas anotações...'}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E8E8E8] dark:border-[#2A2A2A] bg-[#FFFFFF] dark:bg-[#151515] text-sm text-[#1A1A1A] dark:text-[#F5F5F5] placeholder:text-[#6B6B6B] dark:placeholder:text-[#A0A0A0] focus:outline-none focus:border-[#8B7355] dark:focus:border-[#A89580] transition-colors"
        />
      </div>

      {/* Estado vazio */}
      {notesByMonth.length === 0 ? (
        <div className="bg-[#FFFFFF] dark:bg-[#151515] rounded-2xl p-10 border border-[#E8E8E8] dark:border-[#2A2A2A] text-center">
          <PenLine className="w-8 h-8 text-[#8B7355]/40 dark:text-[#A89580]/40 mx-auto mb-3" />
          <p className="text-[#6B6B6B] dark:text-[#A0A0A0]">
            {search ? (t.noNotesFound || 'Nenhuma anotação encontrada') : (t.noNotesYet || 'Ainda sem anotações')}
          </p>
          {!search && (
            <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] mt-2">
              {t.notesHint || 'Toque em "Anotações" na tela inicial para começar'}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {notesByMonth.map(([monthKey, monthNotes]) => {
            const monthName = format(parseISO(monthKey + '-01'), 'MMMM yyyy', {
              locale: dateLocale,
            });
            return (
              <div key={monthKey}>
                {/* Cabeçalho do mês */}
                <h2 className="font-serif text-lg font-medium text-[#8B7355] dark:text-[#A89580] capitalize mb-3 sticky top-0">
                  {monthName}
                </h2>
                {/* Bloco de anotações do mês (texto bruto sequencial com data/hora) */}
                <div className="bg-[#FFFFFF] dark:bg-[#151515] rounded-2xl border border-[#E8E8E8] dark:border-[#2A2A2A] divide-y divide-[#E8E8E8] dark:divide-[#2A2A2A]">
                  {monthNotes.map((note) => (
                    <div key={note.id} className="group p-4 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-medium text-[#8B7355] dark:text-[#A89580] uppercase tracking-wider">
                          {format(parseISO(note.created_at), 'dd/MM · HH:mm')}
                        </span>
                        <p className="text-sm text-[#1A1A1A] dark:text-[#F5F5F5] mt-1 whitespace-pre-wrap break-words">
                          {note.content}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 transition-all duration-200 flex-shrink-0"
                        title={t.deleteNote || 'Excluir'}
                      >
                        <Trash2 className="w-4 h-4 text-[#6B6B6B] dark:text-[#A0A0A0] hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
