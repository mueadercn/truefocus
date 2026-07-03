import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Users, DollarSign, LogOut, Eye, Edit2, X, RefreshCw, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { supabase } from '../app/lib/supabase';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const ENDPOINT = `https://${projectId}.supabase.co/functions/v1/make-server-41f917a5`;

interface AdminUser {
  id: string;
  email: string;
  name: string;
  created_at: string;
  license_type: string;
  planLabel: string;
  tasksCount: number;
  notesCount: number;
  deadlinesCount: number;
  lastActiveAt: string | null;
}

interface Overview {
  month: string;
  stats: {
    totalUsers: number;
    newThisMonth: number;
    paidUsers: number;
    trialUsers: number;
    revenueTotal: number;
    revenueThisMonth: number;
  };
  dailySignups: { day: number; count: number }[];
  users: AdminUser[];
}

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function lastActiveText(iso: string | null): string {
  const d = daysAgo(iso);
  if (d === null) return 'nunca';
  if (d <= 0) return 'hoje';
  if (d === 1) return 'ontem';
  return `há ${d} dias`;
}

function lastActiveColor(iso: string | null): string {
  const d = daysAgo(iso);
  if (d === null || d > 30) return 'text-red-500';
  if (d > 7) return 'text-[#9E9E9E]';
  return 'text-green-600';
}

function planBadge(type: string): string {
  const map: Record<string, string> = {
    trial: 'bg-blue-50 border-blue-200 text-blue-700',
    free: 'bg-gray-50 border-gray-200 text-gray-600',
    monthly: 'bg-green-50 border-green-200 text-green-700',
    annual: 'bg-purple-50 border-purple-200 text-purple-700',
    lifetime: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    expired: 'bg-red-50 border-red-200 text-red-700',
  };
  return map[type] || 'bg-gray-50 border-gray-200 text-gray-600';
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Overview | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [newLicenseType, setNewLicenseType] = useState<'trial' | 'annual' | 'lifetime'>('trial');
  const [saving, setSaving] = useState(false);

  // Restaura sessão admin
  useEffect(() => {
    const key = sessionStorage.getItem('truefocus_admin_key');
    if (sessionStorage.getItem('truefocus_admin_auth') === 'true' && key) {
      setAdminKey(key);
      setIsAuthenticated(true);
    }
  }, []);

  // Carrega sempre que autenticar ou trocar de mês
  useEffect(() => {
    if (isAuthenticated && adminKey) loadData(adminKey, selectedMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, adminKey, selectedMonth]);

  const loadData = async (key: string, month: Date) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${ENDPOINT}/admin/overview?month=${monthKey(month)}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}`, 'x-admin-key': key },
      });
      if (res.status === 401) {
        setError('Senha incorreta');
        handleLogout();
        return;
      }
      if (!res.ok) {
        setError(`Erro ${res.status} ao carregar`);
        return;
      }
      setData(await res.json());
    } catch (e) {
      setError(`Erro de conexão: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    sessionStorage.setItem('truefocus_admin_auth', 'true');
    sessionStorage.setItem('truefocus_admin_key', password);
    setAdminKey(password);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('truefocus_admin_auth');
    sessionStorage.removeItem('truefocus_admin_key');
    setIsAuthenticated(false);
    setAdminKey('');
    setPassword('');
    setData(null);
  };

  const openEdit = (u: AdminUser) => {
    setEditingUser(u);
    setNewLicenseType(['trial', 'annual', 'lifetime'].includes(u.license_type) ? (u.license_type as any) : 'trial');
  };

  // Edição de plano feita direto no Supabase (colunas corretas trial_ends_at/subscription_ends_at)
  const applyLicense = async (userId: string, type: 'trial' | 'annual' | 'lifetime' | 'expire') => {
    const now = new Date();
    const updateData: any = { updated_at: now.toISOString() };
    if (type === 'expire') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      // expira conforme o tipo atual
      if (editingUser?.license_type === 'trial') updateData.trial_ends_at = yesterday.toISOString();
      else updateData.subscription_ends_at = yesterday.toISOString();
    } else if (type === 'trial') {
      const end = new Date(now); end.setDate(end.getDate() + 10);
      updateData.license_type = 'trial';
      updateData.trial_started_at = now.toISOString();
      updateData.trial_ends_at = end.toISOString();
      updateData.subscription_started_at = null;
      updateData.subscription_ends_at = null;
    } else if (type === 'annual') {
      const end = new Date(now); end.setFullYear(end.getFullYear() + 1);
      updateData.license_type = 'annual';
      updateData.subscription_started_at = now.toISOString();
      updateData.subscription_ends_at = end.toISOString();
      updateData.subscription_status = 'active';
      updateData.trial_ends_at = null;
    } else if (type === 'lifetime') {
      updateData.license_type = 'lifetime';
      updateData.subscription_started_at = now.toISOString();
      updateData.subscription_status = 'active';
      updateData.trial_ends_at = null;
    }
    const { error: upErr } = await supabase.from('licenses').update(updateData).eq('user_id', userId);
    if (upErr) throw upErr;
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    setError('');
    try {
      await applyLicense(editingUser.id, newLicenseType);
      setEditingUser(null);
      await loadData(adminKey, selectedMonth);
    } catch (e) {
      setError(`Erro ao atualizar plano: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExpireNow = async () => {
    if (!editingUser) return;
    if (!confirm(`Expirar a licença de ${editingUser.email}? (para testar o bloqueio)`)) return;
    setSaving(true);
    setError('');
    try {
      await applyLicense(editingUser.id, 'expire');
      setEditingUser(null);
      await loadData(adminKey, selectedMonth);
    } catch (e) {
      setError(`Erro ao expirar: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const maxSignups = useMemo(
    () => Math.max(1, ...(data?.dailySignups.map((d) => d.count) || [1])),
    [data]
  );

  const isCurrentMonth =
    selectedMonth.getFullYear() === new Date().getFullYear() &&
    selectedMonth.getMonth() === new Date().getMonth();

  // ---- Tela de login ----
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8B7355] to-[#A89580] items-center justify-center mb-4">
              <span className="text-white text-2xl font-bold">T</span>
            </div>
            <h1 className="font-serif text-2xl font-light text-[#1A1A1A]">TrueFocus Admin</h1>
            <p className="text-sm text-[#6B6B6B] mt-1">Acesso restrito</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white border border-[#E8E8E8] rounded-2xl p-6 shadow-sm space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha do admin"
              autoFocus
              className="w-full px-4 py-3 bg-[#FAFAF8] border border-[#E8E8E8] rounded-lg text-[#1A1A1A] focus:outline-none focus:border-[#8B7355]"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="w-full py-3 bg-[#8B7355] text-white font-medium rounded-lg hover:bg-[#6D5A43] transition-colors">
              Entrar
            </button>
            <button type="button" onClick={() => navigate('/')} className="w-full text-center text-sm text-[#6B6B6B] hover:text-[#1A1A1A]">
              ← Voltar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---- Dashboard ----
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A]">
      {/* Header */}
      <header className="bg-white border-b border-[#E8E8E8] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#8B7355] to-[#A89580] flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
            <h1 className="font-serif text-lg font-light">TrueFocus Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(adminKey, selectedMonth)}
              disabled={loading}
              className="p-2 rounded-lg border border-[#E8E8E8] text-[#6B6B6B] hover:bg-[#F5F5F5] disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => navigate('/')} className="p-2 rounded-lg border border-[#E8E8E8] text-[#6B6B6B] hover:bg-[#F5F5F5]" title="Ver site">
              <Eye className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50" title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6 space-y-5">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

        {/* Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Users className="w-4 h-4 text-[#8B7355]" />} label="Usuários" value={data ? String(data.stats.totalUsers) : '—'} sub={data ? `${data.stats.trialUsers} trial · ${data.stats.paidUsers} pagantes` : ''} />
          <StatCard icon={<UserPlus className="w-4 h-4 text-[#8B7355]" />} label="Novos no mês" value={data ? String(data.stats.newThisMonth) : '—'} />
          <StatCard icon={<DollarSign className="w-4 h-4 text-[#8B7355]" />} label="Receita total" value={data ? `$${data.stats.revenueTotal.toFixed(2)}` : '—'} sub="soma dos planos pagos" />
          <StatCard icon={<DollarSign className="w-4 h-4 text-[#8B7355]" />} label="Receita no mês" value={data ? `$${data.stats.revenueThisMonth.toFixed(2)}` : '—'} />
        </div>

        {/* Cadastros por dia */}
        <div className="bg-white rounded-2xl p-4 border border-[#E8E8E8]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-[#6B6B6B] uppercase tracking-wider">Cadastros por dia</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-[#F5F5F5]">
                <ChevronLeft className="w-4 h-4 text-[#6B6B6B]" />
              </button>
              <span className="text-sm font-medium w-24 text-center">
                {MONTHS_PT[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
              </span>
              <button
                onClick={() => !isCurrentMonth && setSelectedMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                disabled={isCurrentMonth}
                className={`p-1.5 rounded-lg ${isCurrentMonth ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#F5F5F5]'}`}
              >
                <ChevronRight className="w-4 h-4 text-[#6B6B6B]" />
              </button>
            </div>
          </div>

          <div className="flex items-end justify-between gap-[2px] h-32">
            {(data?.dailySignups || []).map((d) => {
              const heightPct = d.count > 0 ? (d.count / maxSignups) * 100 : 0;
              return (
                <div key={d.day} className="flex-1 h-full flex flex-col items-center justify-end group" title={`Dia ${d.day}: ${d.count} cadastro(s)`}>
                  {d.count > 0 && <span className="text-[9px] font-medium text-[#8B7355] mb-0.5">{d.count}</span>}
                  <div className="w-full flex items-end justify-center h-full">
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 ${d.count === 0 ? 'bg-[#EDEAE4]' : 'bg-[#8B7355]'}`}
                      style={{ height: d.count > 0 ? `${Math.max(heightPct, 6)}%` : '2px' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-[2px] mt-1">
            {(data?.dailySignups || []).map((d) => (
              <div key={d.day} className="flex-1 text-center">
                {(d.day === 1 || d.day % 5 === 0) && <span className="text-[8px] text-[#9E9E9E]">{d.day}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Lista de usuários */}
        <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E8E8E8]">
            <p className="text-xs text-[#6B6B6B] uppercase tracking-wider">
              Usuários {data ? `(${data.users.length})` : ''} · atividade e retenção
            </p>
          </div>
          <div className="divide-y divide-[#F0EDE8]">
            {loading && !data ? (
              <div className="p-10 text-center text-[#6B6B6B]">
                <div className="w-6 h-6 border-2 border-[#8B7355] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Carregando...
              </div>
            ) : data && data.users.length === 0 ? (
              <div className="p-10 text-center text-[#6B6B6B]">Nenhum usuário ainda.</div>
            ) : (
              (data?.users || []).map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAF8]">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-[#6B6B6B] truncate">{u.email}</p>
                  </div>

                  {/* Contadores de uso */}
                  <div className="hidden sm:flex items-center gap-3 text-xs text-[#6B6B6B] whitespace-nowrap">
                    <span title="Tarefas">✅ {u.tasksCount}</span>
                    <span title="Insights">📝 {u.notesCount}</span>
                    <span title="Prazos">⏰ {u.deadlinesCount}</span>
                  </div>

                  {/* Plano */}
                  <span className={`hidden md:inline-block px-2.5 py-1 border rounded-full text-[11px] font-medium ${planBadge(u.license_type)}`}>
                    {u.planLabel}
                  </span>

                  {/* Última atividade */}
                  <div className="text-right w-24 hidden sm:block">
                    <p className={`text-xs font-medium ${lastActiveColor(u.lastActiveAt)}`}>{lastActiveText(u.lastActiveAt)}</p>
                    <p className="text-[10px] text-[#9E9E9E]">cad. {formatDate(u.created_at)}</p>
                  </div>

                  <button onClick={() => openEdit(u)} className="p-2 rounded-lg border border-[#E8E8E8] text-[#6B6B6B] hover:bg-[#F5F5F5]" title="Editar plano">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Modal editar plano */}
      {editingUser && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => !saving && setEditingUser(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-[#E8E8E8] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg font-light">Editar plano</h3>
                <button onClick={() => !saving && setEditingUser(null)} className="p-1.5 hover:bg-[#F5F5F5] rounded-lg">
                  <X className="w-5 h-5 text-[#6B6B6B]" />
                </button>
              </div>
              <p className="text-sm text-[#1A1A1A] font-medium">{editingUser.name}</p>
              <p className="text-xs text-[#6B6B6B] mb-4">{editingUser.email}</p>

              <select
                value={newLicenseType}
                onChange={(e) => setNewLicenseType(e.target.value as any)}
                disabled={saving}
                className="w-full px-4 py-3 bg-[#FAFAF8] border border-[#E8E8E8] rounded-lg mb-4 focus:outline-none focus:border-[#8B7355]"
              >
                <option value="trial">Trial (10 dias)</option>
                <option value="annual">Anual ($59/ano)</option>
                <option value="lifetime">Vitalício ($149)</option>
              </select>

              <div className="flex gap-2">
                <button onClick={handleSaveEdit} disabled={saving} className="flex-1 py-3 bg-[#8B7355] text-white rounded-lg hover:bg-[#6D5A43] disabled:opacity-50 font-medium">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button onClick={handleExpireNow} disabled={saving} className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 text-sm">
                  Expirar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-[#E8E8E8] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] text-[#6B6B6B] uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-serif text-2xl font-light text-[#1A1A1A]">{value}</p>
      {sub && <p className="text-[10px] text-[#9E9E9E] mt-0.5">{sub}</p>}
    </div>
  );
}
