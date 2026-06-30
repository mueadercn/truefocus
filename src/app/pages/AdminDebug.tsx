import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface Task {
  id: string;
  text: string;
  category: string;
  duration_min: number;
  date: string;
  mode: string;
  completed: boolean;
  created_at: string;
}

export default function AdminDebug() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState('2026-02-13');
  const [error, setError] = useState('');

  const fetchTasksByDate = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get access token from localStorage (assuming user is logged in)
      const accessToken = localStorage.getItem('access_token');
      
      if (!accessToken) {
        setError('Você precisa estar logado para ver as tarefas');
        setLoading(false);
        return;
      }

      // Chamada de API para buscar tarefas do dia especificado
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-41f917a5/tasks/${date}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao buscar tarefas: ${response.statusText}`);
      }

      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Erro ao buscar tarefas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksByDate();
  }, []);

  // Group tasks by category and calculate totals
  const tasksByCategory = tasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = {
        tasks: [],
        totalMinutes: 0
      };
    }
    acc[task.category].tasks.push(task);
    acc[task.category].totalMinutes += task.duration_min || 0;
    return acc;
  }, {} as Record<string, { tasks: Task[], totalMinutes: number }>);

  const totalMinutes = tasks.reduce((sum, task) => sum + (task.duration_min || 0), 0);

  return (
    <div className="min-h-screen bg-[#F5F3F0] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-serif text-[#8B7355] mb-8">Admin Debug - Tarefas</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#8B7355] mb-2">
                Data (YYYY-MM-DD)
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-[#D4C5B9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
                placeholder="2026-02-13"
              />
            </div>
            <button
              onClick={fetchTasksByDate}
              disabled={loading}
              className="px-6 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#705D47] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Carregando...' : 'Buscar'}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>

        {tasks.length > 0 && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-2xl font-serif text-[#8B7355] mb-4">Resumo Geral</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#F5F3F0] rounded-lg">
                  <div className="text-sm text-[#8B7355] opacity-70">Total de Tarefas</div>
                  <div className="text-3xl font-serif text-[#8B7355]">{tasks.length}</div>
                </div>
                <div className="p-4 bg-[#F5F3F0] rounded-lg">
                  <div className="text-sm text-[#8B7355] opacity-70">Total de Minutos</div>
                  <div className="text-3xl font-serif text-[#8B7355]">{totalMinutes} min</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-2xl font-serif text-[#8B7355] mb-4">Por Categoria</h2>
              <div className="space-y-4">
                {Object.entries(tasksByCategory).map(([category, data]) => (
                  <div key={category} className="border-l-4 border-[#8B7355] pl-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xl font-serif text-[#8B7355]">{category}</h3>
                      <span className="text-lg text-[#8B7355] opacity-70">
                        {data.totalMinutes} minutos ({data.tasks.length} {data.tasks.length === 1 ? 'tarefa' : 'tarefas'})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {data.tasks.map((task) => (
                        <div key={task.id} className="bg-[#F5F3F0] p-3 rounded">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="text-[#8B7355]">{task.text || '(sem texto)'}</div>
                              <div className="text-sm text-[#8B7355] opacity-60 mt-1">
                                Modo: {task.mode} • {task.completed ? '✓ Concluída' : '○ Pendente'}
                              </div>
                            </div>
                            <div className="text-[#8B7355] font-medium ml-4">
                              {task.duration_min} min
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-serif text-[#8B7355] mb-4">Todas as Tarefas (JSON)</h2>
              <pre className="bg-[#F5F3F0] p-4 rounded-lg overflow-auto max-h-96 text-xs">
                {JSON.stringify(tasks, null, 2)}
              </pre>
            </div>
          </>
        )}

        {!loading && tasks.length === 0 && !error && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-[#8B7355] opacity-70">Nenhuma tarefa encontrada para esta data.</p>
          </div>
        )}
      </div>
    </div>
  );
}