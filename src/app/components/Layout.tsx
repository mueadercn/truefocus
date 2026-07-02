import { Home, LifeBuoy, BookOpen, BarChart3, Settings, Menu, X, ChevronLeft, ChevronRight, Clock, HelpCircle, CalendarDays, Target, PenLine } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import { useApp } from '../context/AppContext';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { translations } from '../utils/translations';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, settings, selectedDate, setSelectedDate, resetToToday, loading, accessStatus } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const t = translations[settings.language];
  const dateLocale = settings.language === 'pt' ? ptBR : enUS;

  console.log('🎨 Layout rendering with:', {
    user: user?.email,
    loading,
    pathname: location.pathname,
    accessStatus: {
      hasAccess: accessStatus.hasAccess,
      licenseType: accessStatus.licenseType,
      reason: accessStatus.reason
    }
  });

  // Check if selected date is in the past
  const isPastDate = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return selectedDate < today;
  }, [selectedDate]);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Block access if license expired - redirect to license page
  useEffect(() => {
    // Don't check if still loading or no user
    if (loading || !user) return;
    
    if (!accessStatus.hasAccess) {
      console.log('🔒 Layout: Access denied - redirecting to license page', {
        hasAccess: accessStatus.hasAccess,
        reason: accessStatus.reason,
        licenseType: accessStatus.licenseType,
        currentPath: location.pathname
      });
      
      // Only allow access to license page when expired
      if (location.pathname !== '/home/licenca') {
        console.log('🔒 Forcing redirect to /home/licenca');
        navigate('/home/licenca', { replace: true });
      }
    }
  }, [accessStatus.hasAccess, loading, user, location.pathname, navigate, accessStatus.reason, accessStatus.licenseType]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // Auto mode
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [settings.theme]);

  const isActive = (path: string) => {
    if (path === '/home') return location.pathname === '/home';
    return location.pathname.startsWith(path);
  };

  // Date navigation
  const handlePreviousDay = () => {
    const date = parseISO(selectedDate);
    setSelectedDate(format(subDays(date, 1), 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const date = parseISO(selectedDate);
    setSelectedDate(format(addDays(date, 1), 'yyyy-MM-dd'));
  };

  const handleToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  // Format date for display
  const displayDate = useMemo(() => {
    try {
      const date = parseISO(selectedDate);
      return format(date, "EEEE, dd MMM yyyy", { locale: dateLocale });
    } catch {
      return selectedDate;
    }
  }, [selectedDate, dateLocale]);

  const isHomePage = location.pathname === '/home' && !location.pathname.startsWith('/home/dashboard') && !location.pathname.startsWith('/home/teoria') && !location.pathname.startsWith('/home/configuracoes') && !location.pathname.startsWith('/home/socorro');

  // Detectar se está na página do Calendário
  const isCalendarPage = isActive('/home/calendario');
  
  // Detectar se está na página de Goals
  const isGoalsPage = isActive('/home/goals');

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0A0A0A] text-[#1A1A1A] dark:text-[#F5F5F5] transition-colors duration-300">
      {/* Header - Com navegação de dias (oculto na página Goals) */}
      {!isGoalsPage && (
        <header className="fixed top-0 left-0 right-0 z-40 bg-[#FAFAF8]/95 dark:bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#E8E8E8] dark:border-[#2A2A2A] transition-all duration-300">
          <div className={`max-w-[800px] mx-auto px-5 md:px-10 ${isCalendarPage ? 'py-5' : 'py-10'}`}>
            {isHomePage ? (
              // Navegação de dias na página Home
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePreviousDay}
                  className="p-5 hover:bg-[#FFFFFF] dark:hover:bg-[#151515] rounded-xl transition-all duration-200 active:scale-95"
                >
                  <ChevronLeft className="w-9 h-9 text-[#6B6B6B] dark:text-[#A0A0A0]" />
                </button>
                <button
                  onClick={handleToday}
                  className="flex-1 text-center group px-4"
                >
                  <p className="font-serif text-2xl font-light capitalize text-[#1A1A1A] dark:text-[#F5F5F5] group-hover:text-[#8B7355] dark:group-hover:text-[#A89580] transition-colors duration-300">
                    {displayDate}
                  </p>
                </button>
                <button
                  onClick={handleNextDay}
                  className="p-5 hover:bg-[#FFFFFF] dark:hover:bg-[#151515] rounded-xl transition-all duration-200 active:scale-95"
                >
                  <ChevronRight className="w-9 h-9 text-[#6B6B6B] dark:text-[#A0A0A0]" />
                </button>
              </div>
            ) : (
              // Logo centrado nas outras páginas
              <div className="flex items-center justify-center">
                {isCalendarPage && (
                  <button
                    onClick={() => navigate('/home')}
                    className="absolute left-5 p-3 hover:bg-[#FFFFFF] dark:hover:bg-[#151515] rounded-lg transition-all duration-200 active:scale-95"
                  >
                    <ChevronLeft className="w-7 h-7 text-[#6B6B6B] dark:text-[#A0A0A0]" />
                  </button>
                )}
                <h1 className={`font-serif ${isCalendarPage ? 'text-xl' : 'text-2xl'} font-light tracking-tight`}>
                  {isCalendarPage ? t.calendar : 'TrueFocus'}
                </h1>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`${isGoalsPage ? 'pt-0' : isCalendarPage ? 'pt-20' : 'pt-36'} ${isGoalsPage || isCalendarPage ? 'pb-10' : 'pb-32'} min-h-screen`}>
        <div className={`max-w-[800px] mx-auto ${isGoalsPage ? 'px-0' : 'px-5 md:px-10'}`}>
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation - Com Menu e Gradiente (oculto no Calendário e Goals) */}
      {!isCalendarPage && !isGoalsPage && (
        <div className="fixed bottom-6 left-0 right-0 z-40 pointer-events-none">
          {/* Gradiente para cobrir texto que passa por baixo */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#FAFAF8] via-[#FAFAF8]/80 to-transparent dark:from-[#0A0A0A] dark:via-[#0A0A0A]/80 dark:to-transparent" />
          
          {/* Navigation bar */}
          <nav className="relative bg-[#FFFFFF] dark:bg-[#151515] border-t border-[#E8E8E8] dark:border-[#2A2A2A] pb-safe pointer-events-auto">
            <div className="max-w-[800px] mx-auto px-5 py-6 flex items-center justify-around">
              {/* Menu - Esquerda */}
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <button className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl transition-all duration-300 active:scale-95 text-[#6B6B6B] dark:text-[#A0A0A0] hover:text-[#1A1A1A] dark:hover:text-[#F5F5F5]">
                    <Menu className="w-8 h-8" />
                    <span className="text-xs font-medium">{t.menu}</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 bg-[#FFFFFF] dark:bg-[#151515] border-l border-[#E8E8E8] dark:border-[#2A2A2A]">
                  <SheetTitle className="sr-only">{settings.language === 'en' ? 'Navigation Menu' : 'Menu de Navegação'}</SheetTitle>
                  <SheetDescription className="sr-only">
                    {settings.language === 'en' ? 'Navigate between different sections of the TrueFocus app' : 'Navegue entre as diferentes seções do aplicativo TrueFocus'}
                  </SheetDescription>
                  <div className="flex flex-col gap-2 mt-12">
                    {/* GRUPO 1: GOALS - DESTAQUE */}
                    <button
                      onClick={() => {
                        navigate('/home/goals');
                        setMenuOpen(false);
                      }}
                      className={`relative flex items-center gap-4 px-4 py-5 rounded-lg text-left transition-all duration-300 border-2 ${
                        isActive('/home/goals')
                          ? 'border-[#D4AF37] dark:border-[#D4AF37] bg-gradient-to-br from-[#FF6B35] to-[#F44336] text-white shadow-lg'
                          : 'border-[#D4AF37] dark:border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 dark:from-[#D4AF37]/20 dark:to-[#D4AF37]/10 hover:from-[#D4AF37]/20 hover:to-[#D4AF37]/10 dark:hover:from-[#D4AF37]/30 dark:hover:to-[#D4AF37]/20'
                      }`}
                    >
                      <Target className={`w-5 h-5 ${isActive('/home/goals') ? 'text-white' : 'text-[#D4AF37]'}`} />
                      <div className="flex-1">
                        <span className={`font-serif text-base font-medium ${isActive('/home/goals') ? 'text-white' : 'text-[#1A1A1A] dark:text-[#F5F5F5]'}`}>
                          {t.goalsMenuTitle}
                        </span>
                      </div>
                    </button>
                    
                    {/* SEPARADOR 1 */}
                    <div className="h-px bg-[#E8E8E8] dark:bg-[#2A2A2A] my-2" />
                    
                    {/* GRUPO 2: CORE (Calendar, Deadlines, Rescue) */}
                    <button
                      onClick={() => {
                        navigate('/home/calendario');
                        setMenuOpen(false);
                      }}
                      className={`flex items-center gap-4 px-4 py-4 rounded-lg text-left transition-all duration-300 ${
                        isActive('/home/calendario')
                          ? 'bg-[#8B7355] dark:bg-[#A89580] text-white'
                          : 'hover:bg-[#FAFAF8] dark:hover:bg-[#2A2A2A]/50 text-[#1A1A1A] dark:text-[#F5F5F5]'
                      }`}
                    >
                      <CalendarDays className="w-5 h-5" />
                      <span className="font-serif text-base font-light">{t.calendar}</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/home/anotacoes');
                        setMenuOpen(false);
                      }}
                      className={`flex items-center gap-4 px-4 py-4 rounded-lg text-left transition-all duration-300 ${
                        isActive('/home/anotacoes')
                          ? 'bg-[#8B7355] dark:bg-[#A89580] text-white'
                          : 'hover:bg-[#FAFAF8] dark:hover:bg-[#2A2A2A]/50 text-[#1A1A1A] dark:text-[#F5F5F5]'
                      }`}
                    >
                      <PenLine className="w-5 h-5" />
                      <span className="font-serif text-base font-light">{t.notesTitle || 'Anotações'}</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/home/deadlines');
                        setMenuOpen(false);
                      }}
                      className={`flex items-center gap-4 px-4 py-4 rounded-lg text-left transition-all duration-300 ${
                        isActive('/home/deadlines')
                          ? 'bg-[#8B7355] dark:bg-[#A89580] text-white'
                          : 'hover:bg-[#FAFAF8] dark:hover:bg-[#2A2A2A]/50 text-[#1A1A1A] dark:text-[#F5F5F5]'
                      }`}
                    >
                      <Clock className="w-5 h-5" />
                      <span className="font-serif text-base font-light">{t.deadlines}</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/home/socorro');
                        setMenuOpen(false);
                      }}
                      className={`flex items-center gap-4 px-4 py-4 rounded-lg text-left transition-all duration-300 ${
                        isActive('/home/socorro')
                          ? 'bg-[#8B7355] dark:bg-[#A89580] text-white'
                          : 'hover:bg-[#FAFAF8] dark:hover:bg-[#2A2A2A]/50 text-[#1A1A1A] dark:text-[#F5F5F5]'
                      }`}
                    >
                      <LifeBuoy className="w-5 h-5" />
                      <span className="font-serif text-base font-light">{t.rescue}</span>
                    </button>
                    
                    {/* SEPARADOR 2 */}
                    <div className="h-px bg-[#E8E8E8] dark:bg-[#2A2A2A] my-2" />
                    
                    {/* GRUPO 3: ANÁLISE (Metrics, Annual Report) */}
                    <button
                      onClick={() => {
                        navigate('/home/dashboard');
                        setMenuOpen(false);
                      }}
                      className={`flex items-center gap-4 px-4 py-4 rounded-lg text-left transition-all duration-300 ${
                        isActive('/home/dashboard')
                          ? 'bg-[#8B7355] dark:bg-[#A89580] text-white'
                          : 'hover:bg-[#FAFAF8] dark:hover:bg-[#2A2A2A]/50 text-[#1A1A1A] dark:text-[#F5F5F5]'
                      }`}
                    >
                      <BarChart3 className="w-5 h-5" />
                      <span className="font-serif text-base font-light">{t.metrics}</span>
                    </button>
                    
                    {/* SEPARADOR 3 */}
                    <div className="h-px bg-[#E8E8E8] dark:bg-[#2A2A2A] my-2" />
                    
                    {/* GRUPO 4: APOIO/CONTA (FAQ/Theory, License, Settings) */}
                    <button
                      onClick={() => {
                        navigate('/home/faq-teoria');
                        setMenuOpen(false);
                      }}
                      className={`flex items-center gap-4 px-4 py-4 rounded-lg text-left transition-all duration-300 ${
                        isActive('/home/faq-teoria')
                          ? 'bg-[#8B7355] dark:bg-[#A89580] text-white'
                          : 'hover:bg-[#FAFAF8] dark:hover:bg-[#2A2A2A]/50 text-[#1A1A1A] dark:text-[#F5F5F5]'
                      }`}
                    >
                      <HelpCircle className="w-5 h-5" />
                      <span className="font-serif text-base font-light">{t.faqTheory}</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/home/licenca');
                        setMenuOpen(false);
                      }}
                      className={`flex items-center gap-4 px-4 py-4 rounded-lg text-left transition-all duration-300 ${
                        isActive('/home/licenca')
                          ? 'bg-[#8B7355] dark:bg-[#A89580] text-white'
                          : 'hover:bg-[#FAFAF8] dark:hover:bg-[#2A2A2A]/50 text-[#1A1A1A] dark:text-[#F5F5F5]'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className="font-serif text-base font-light">{t.license}</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/home/configuracoes');
                        setMenuOpen(false);
                      }}
                      className={`flex items-center gap-4 px-4 py-4 rounded-lg text-left transition-all duration-300 ${
                        isActive('/home/configuracoes')
                          ? 'bg-[#8B7355] dark:bg-[#A89580] text-white'
                          : 'hover:bg-[#FAFAF8] dark:hover:bg-[#2A2A2A]/50 text-[#1A1A1A] dark:text-[#F5F5F5]'
                      }`}
                    >
                      <Settings className="w-5 h-5" />
                      <span className="font-serif text-base font-light">{t.settings}</span>
                    </button>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Focus Clock - Centro-Esquerda */}
              {(!isHomePage || !isPastDate) && (
                <button
                  onClick={() => navigate('/home/focus-clock')}
                  className={`flex flex-col items-center gap-2 px-3 py-4 rounded-xl transition-all duration-300 active:scale-95 ${
                    isActive('/home/focus-clock')
                      ? 'text-[#1565C0] dark:text-[#42A5F5]'
                      : 'text-[#6B6B6B] dark:text-[#A0A0A0] hover:text-[#1A1A1A] dark:hover:text-[#F5F5F5]'
                  }`}
                >
                  <Clock className="w-9 h-9" />
                  <span className="text-xs font-medium">{t.focus}</span>
                </button>
              )}

              {/* Calendário - Centro-Direita */}
              <button
                onClick={() => navigate('/home/calendario')}
                className={`flex flex-col items-center gap-2 px-2 py-4 rounded-xl transition-all duration-300 active:scale-95 ${
                  isActive('/home/calendario')
                    ? 'text-[#8B7355] dark:text-[#A89580]'
                    : 'text-[#6B6B6B] dark:text-[#A0A0A0] hover:text-[#1A1A1A] dark:hover:text-[#F5F5F5]'
                }`}
              >
                <CalendarDays className="w-8 h-8" />
                <span className="text-xs font-medium">{t.calendar}</span>
              </button>

              {/* Home - Direita */}
              <button
                onClick={() => {
                  resetToToday();
                  navigate('/home');
                }}
                className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl transition-all duration-300 active:scale-95 ${
                  isHomePage
                    ? 'text-[#8B7355] dark:text-[#A89580]'
                    : 'text-[#6B6B6B] dark:text-[#A0A0A0] hover:text-[#1A1A1A] dark:hover:text-[#F5F5F5]'
                }`}
              >
                <Home className="w-8 h-8" />
                <span className="text-xs font-medium">{t.home}</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Report Modal */}
    </div>
  );
}