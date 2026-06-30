import { ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Switch } from '../components/ui/switch';
import { Button } from '../components/ui/button';
import { translations } from '../utils/translations';

export function Configuracoes() {
  const navigate = useNavigate();
  const { user, settings, updateSettings, signOut } = useApp();
  
  const t = translations[settings.language];

  const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    console.log('🎨 THEME CHANGE:', theme);
    console.log('📦 Current settings:', settings);
    updateSettings({ 
      theme, 
      notifications: settings.notifications, 
      sound: settings.sound, 
      language: settings.language 
    });
  };

  const handleLanguageChange = (language: 'en' | 'pt') => {
    console.log('🌍 LANGUAGE CHANGE:', language);
    console.log('📦 Current settings:', settings);
    updateSettings({ 
      theme: settings.theme, 
      notifications: settings.notifications, 
      sound: settings.sound, 
      language 
    });
  };

  const handleNotificationsToggle = (notifications: boolean) => {
    console.log('🔔 NOTIFICATIONS TOGGLE:', notifications);
    console.log('📦 Current settings:', settings);
    updateSettings({ 
      theme: settings.theme, 
      notifications, 
      sound: settings.sound, 
      language: settings.language 
    });
  };

  const handleSoundToggle = (sound: boolean) => {
    console.log('🔊 SOUND TOGGLE:', sound);
    console.log('📦 Current settings:', settings);
    updateSettings({ 
      theme: settings.theme, 
      notifications: settings.notifications, 
      sound, 
      language: settings.language 
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-[#FAFAF8] dark:hover:bg-[#2A2A2A] rounded-lg transition-all duration-300"
        >
          <ArrowLeft className="w-5 h-5 text-[#6B6B6B] dark:text-[#A0A0A0]" />
        </button>
        <h1 className="font-serif text-3xl font-light text-[#1A1A1A] dark:text-[#F5F5F5]">{t.settingsTitle}</h1>
      </div>

      <div className="space-y-4">
        {/* Appearance */}
        <div className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-2xl p-5 border border-[#E8E8E8] dark:border-[#2A2A2A] hover:border-[#8B7355] dark:hover:border-[#A89580] transition-all duration-500">
          <h2 className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5] mb-4">{t.appearance}</h2>
          <div className="border-t border-[#E8E8E8] dark:border-[#2A2A2A] pt-4">
            <Label className="mb-3 block text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">{t.theme}</Label>
            <RadioGroup value={settings.theme} onValueChange={handleThemeChange}>
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light" className="cursor-pointer text-sm text-[#1A1A1A] dark:text-[#F5F5F5]">{t.light}</Label>
              </div>
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark" className="cursor-pointer text-sm text-[#1A1A1A] dark:text-[#F5F5F5]">{t.dark}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="auto" />
                <Label htmlFor="auto" className="cursor-pointer text-sm text-[#1A1A1A] dark:text-[#F5F5F5]">{t.auto}</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Language */}
        <div className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-2xl p-5 border border-[#E8E8E8] dark:border-[#2A2A2A] hover:border-[#8B7355] dark:hover:border-[#A89580] transition-all duration-500">
          <h2 className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5] mb-4">{t.language}</h2>
          <div className="border-t border-[#E8E8E8] dark:border-[#2A2A2A] pt-4">
            <RadioGroup value={settings.language} onValueChange={handleLanguageChange}>
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="en" id="en" />
                <Label htmlFor="en" className="cursor-pointer text-sm text-[#1A1A1A] dark:text-[#F5F5F5]">{t.english}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pt" id="pt" />
                <Label htmlFor="pt" className="cursor-pointer text-sm text-[#1A1A1A] dark:text-[#F5F5F5]">{t.portuguese}</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-2xl p-5 border border-[#E8E8E8] dark:border-[#2A2A2A] hover:border-[#8B7355] dark:hover:border-[#A89580] transition-all duration-500">
          <h2 className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5] mb-4">{t.notifications}</h2>
          <div className="border-t border-[#E8E8E8] dark:border-[#2A2A2A] pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications" className="text-sm text-[#1A1A1A] dark:text-[#F5F5F5]">{t.notifications}</Label>
                <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] mt-1">
                  {t.insightsAfterTasks}
                </p>
              </div>
              <Switch
                id="notifications"
                checked={settings.notifications}
                onCheckedChange={handleNotificationsToggle}
              />
            </div>
          </div>
        </div>

        {/* Sound */}
        <div className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-2xl p-5 border border-[#E8E8E8] dark:border-[#2A2A2A] hover:border-[#8B7355] dark:hover:border-[#A89580] transition-all duration-500">
          <h2 className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5] mb-4">{t.sound}</h2>
          <div className="border-t border-[#E8E8E8] dark:border-[#2A2A2A] pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="sound" className="text-sm text-[#1A1A1A] dark:text-[#F5F5F5]">{t.completionSound}</Label>
              <Switch
                id="sound"
                checked={settings.sound}
                onCheckedChange={handleSoundToggle}
              />
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-2xl p-5 border border-[#E8E8E8] dark:border-[#2A2A2A] hover:border-[#8B7355] dark:hover:border-[#A89580] transition-all duration-500">
          <h2 className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5] mb-4">{t.account}</h2>
          <div className="border-t border-[#E8E8E8] dark:border-[#2A2A2A] pt-4">
            {user && (
              <div className="mb-4 text-xs text-[#6B6B6B] dark:text-[#A0A0A0] space-y-1">
                <p><strong className="text-[#1A1A1A] dark:text-[#F5F5F5]">{t.name}:</strong> {user.name || t.notProvided}</p>
                <p><strong className="text-[#1A1A1A] dark:text-[#F5F5F5]">{t.email}:</strong> {user.email}</p>
              </div>
            )}
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t.signOut}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}