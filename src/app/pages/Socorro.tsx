import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';
import type { Task } from '../types';
import { motion } from 'motion/react';
import { translations } from '../utils/translations';
import { getCategoryTranslation } from '../utils/category-mapper';

type Phase = 'intro' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase4-running' | 'phase5' | 'phase6' | 'complete';

export function Socorro() {
  const navigate = useNavigate();
  const { addTask, addRescue, selectedDate, settings } = useApp();
  const [phase, setPhase] = useState<Phase>('intro');
  const [rescueData, setRescueData] = useState({
    phase1_source: '',
    phase1_other: '',
    phase2_activity: '',
    phase3_activity: '',
    phase4_activity: '',
    phase4_custom: '',
    phase5_target: '',
    phase5_category: 'Trabalho' as Task['category'],
    phase5_duration: 60,
    reflection_cause: '',
    reflection_adjust: '',
    reflection_nugget: ''
  });

  const t = translations[settings.language];

  const phase2Options = [
    t.phase2Hyperventilation,
    t.phase2Pushups,
    t.phase2ColdWater,
    t.phase2CrazyMonkey,
    t.phase2ForwardFold,
    t.phase2JumpingJacks,
    t.phase2Plank,
    t.phase2Squats,
    t.phase2Running,
    t.phase2Burpees
  ];

  const phase3Options = [
    t.phase3MakeBed,
    t.phase3Shower,
    t.phase3Water,
    t.phase3Vacuum,
    t.phase3Dishes,
    t.phase3Teeth,
    t.phase3OrganizeDesk,
    t.phase3PutAway5,
    t.phase3Appearance,
    t.phase3Pillows,
    t.phase3Mirror,
    t.phase3Trash,
    t.phase3WaterPlant,
    t.phase3FoldClothes,
    t.phase3Shoes,
    t.phase3Sink,
    t.phase3Bag,
    t.phase3Towel,
    t.phase3AirRoom,
    t.phase3CleanDesk,
    t.phase3StoreItems,
    t.phase3MakeCoffee,
    t.phase3ChangeSheets,
    t.phase3CleanKeyboard,
    t.phase3OrganizeCables,
    t.phase3EmptyTrash,
    t.phase3WipeSurfaces,
    t.phase3SortLaundry
  ];

  const phase4Options = [
    t.phase4Walk,
    t.phase4Read,
    t.phase4Tea,
    t.phase4Stretch,
    t.phase4Cook,
    t.phase4Meditate,
    t.phase4Groom,
    t.phase4Journal
  ];

  const handlePhase1Continue = () => {
    if (!rescueData.phase1_source) return;
    setPhase('phase2');
  };

  const handlePhase2Continue = () => {
    if (!rescueData.phase2_activity) return;
    setPhase('phase3');
  };

  const handlePhase3Continue = () => {
    if (!rescueData.phase3_activity) return;
    setPhase('phase4');
  };

  const handlePhase4Start = () => {
    const activity = rescueData.phase4_activity === 'custom' ? rescueData.phase4_custom : rescueData.phase4_activity;
    if (!activity) return;
    setPhase('phase4-running');
  };

  const handlePhase4Complete = () => {
    setPhase('phase5');
  };

  const handlePhase5Continue = async () => {
    if (!rescueData.phase5_target) return;
    
    // Create task for today
    try {
      await addTask({
        text: rescueData.phase5_target,
        category: rescueData.phase5_category,
        duration_min: rescueData.phase5_duration,
        date: selectedDate,
        mode: 'tempo'
      });
      setPhase('phase6');
    } catch (error) {
      console.error('Error creating focal task:', error);
    }
  };

  const handleSaveAndFinish = async () => {
    try {
      const activity4 = rescueData.phase4_activity === 'custom' ? rescueData.phase4_custom : rescueData.phase4_activity;
      const source1 = rescueData.phase1_source === 'Outro' ? rescueData.phase1_other : rescueData.phase1_source;
      
      await addRescue({
        phase1_source: source1,
        phase2_activity: rescueData.phase2_activity,
        phase3_activity: rescueData.phase3_activity,
        phase4_activity: activity4,
        phase5_target: rescueData.phase5_target,
        phase5_category: rescueData.phase5_category,
        phase5_duration_min: rescueData.phase5_duration,
        reflection_cause: rescueData.reflection_cause,
        reflection_adjust: rescueData.reflection_adjust,
        reflection_nugget: rescueData.reflection_nugget,
        completed_date: selectedDate
      });
      setPhase('complete');
    } catch (error) {
      console.error('Error saving rescue:', error);
    }
  };

  const handleSkipReflection = async () => {
    try {
      const activity4 = rescueData.phase4_activity === 'custom' ? rescueData.phase4_custom : rescueData.phase4_activity;
      const source1 = rescueData.phase1_source === 'Outro' ? rescueData.phase1_other : rescueData.phase1_source;
      
      await addRescue({
        phase1_source: source1,
        phase2_activity: rescueData.phase2_activity,
        phase3_activity: rescueData.phase3_activity,
        phase4_activity: activity4,
        phase5_target: rescueData.phase5_target,
        phase5_category: rescueData.phase5_category,
        phase5_duration_min: rescueData.phase5_duration,
        completed_date: selectedDate
      });
      setPhase('complete');
    } catch (error) {
      console.error('Error saving rescue:', error);
    }
  };

  return (
    <div className="p-6 pb-28 max-w-lg mx-auto">
      {/* Intro Screen */}
      {phase === 'intro' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-2xl p-8 border border-[#E8E8E8] dark:border-[#2A2A2A]"
        >
          <div className="text-center mb-10">
            <div className="mb-6">
              <div className="inline-flex items-center gap-3 text-4xl mb-3">
                <span>🔋</span>
                <motion.div
                  className="h-8 bg-[#FAFAF8] dark:bg-[#2A2A2A] rounded-full overflow-hidden w-48"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                    initial={{ width: '40%' }}
                    animate={{ width: ['40%', '35%', '40%'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>
                <span className="font-serif text-3xl font-light">40%</span>
              </div>
            </div>
            <h2 className="font-serif text-3xl font-light mb-3 text-[#8B7355] dark:text-[#A89580]">{t.energyDrained}</h2>
            <p className="text-lg mb-8 text-[#1A1A1A] dark:text-[#F5F5F5]">{t.youAreInHole}</p>
            <p className="text-[#6B6B6B] dark:text-[#A0A0A0]">
              {t.restoreEnergy}
            </p>
          </div>
          <Button
            onClick={() => setPhase('phase1')}
            className="w-full bg-[#8B7355] dark:bg-[#A89580] hover:bg-[#6D5A43] dark:hover:bg-[#C4B5A0] text-white text-lg py-6 rounded-xl transition-all duration-300"
          >
            {t.startRescue}
          </Button>
        </motion.div>
      )}

      {/* Phase 1: Stop Digging */}
      {phase === 'phase1' && (
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-2xl p-6 border border-[#E8E8E8] dark:border-[#2A2A2A]"
        >
          <div className="mb-6">
            <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] mb-2">{t.phase} 1/6</p>
            <h2 className="font-serif text-2xl font-light mb-4 text-[#1A1A1A] dark:text-[#F5F5F5]">{t.phase1Title}</h2>
            <p className="text-base font-medium mb-4 text-[#8B7355] dark:text-[#A89580]">
              {t.phase1Subtitle}
            </p>
            <p className="mb-4 text-sm text-[#1A1A1A] dark:text-[#F5F5F5]">{t.phase1ChooseWhat}</p>
          </div>

          <div className="space-y-3 mb-6">
            {[
              { key: 'social', label: t.phase1SocialMedia },
              { key: 'videos', label: t.phase1Videos },
              { key: 'games', label: t.phase1Gaming },
              { key: 'food', label: t.phase1JunkFood },
              { key: 'porn', label: t.phase1Pornography },
              { key: 'other', label: t.phase1Other }
            ].map(({ key, label }) => (
              <label
                key={key}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                  rescueData.phase1_source === label
                    ? 'border-[#8B7355] dark:border-[#A89580] bg-[#8B7355]/10 dark:bg-[#A89580]/10'
                    : 'border-[#E8E8E8] dark:border-[#2A2A2A] hover:bg-[#FAFAF8] dark:hover:bg-[#151515]'
                }`}
              >
                <input
                  type="radio"
                  name="phase1"
                  value={label}
                  checked={rescueData.phase1_source === label}
                  onChange={(e) => setRescueData(prev => ({ ...prev, phase1_source: e.target.value }))}
                  className="w-4 h-4"
                />
                <span className="text-sm text-[#1A1A1A] dark:text-[#F5F5F5]">{label}</span>
              </label>
            ))}
            {rescueData.phase1_source === t.phase1Other && (
              <Input
                placeholder={t.phase1TypeWhat}
                value={rescueData.phase1_other}
                onChange={(e) => setRescueData(prev => ({ ...prev, phase1_other: e.target.value }))}
                className="mt-3"
              />
            )}
          </div>

          <div className="bg-[#FAFAF8] dark:bg-[#151515] rounded-xl p-4 mb-6">
            <p className="font-medium mb-2 text-sm text-[#1A1A1A] dark:text-[#F5F5F5]">{t.phase1ActionsNeeded}</p>
            <ul className="space-y-1.5 text-xs text-[#6B6B6B] dark:text-[#A0A0A0]">
              <li>{t.phase1CloseApp}</li>
              <li>{t.phase1TurnOff}</li>
              <li>{t.phase1AnotherRoom}</li>
            </ul>
          </div>

          <Button
            onClick={handlePhase1Continue}
            disabled={!rescueData.phase1_source || (rescueData.phase1_source === t.phase1Other && !rescueData.phase1_other)}
            className="w-full bg-[#FF6B35] dark:bg-[#FF8A65] hover:opacity-90"
          >
            {t.phase1DoneNext}
          </Button>
        </motion.div>
      )}

      {/* Phase 2: Tune Into Body */}
      {phase === 'phase2' && (
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-2xl p-6 border border-[#E8E8E8] dark:border-[#2A2A2A]"
        >
          <div className="mb-6">
            <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] mb-2">{t.phase} 2/6</p>
            <h2 className="font-serif text-2xl font-light mb-4 text-[#1A1A1A] dark:text-[#F5F5F5]">{t.phase2Title}</h2>
            <p className="mb-4 text-sm text-[#1A1A1A] dark:text-[#F5F5F5]">{t.phase2Subtitle}</p>
          </div>

          <div className="space-y-2 mb-6">
            {phase2Options.map((option) => (
              <label
                key={option}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                  rescueData.phase2_activity === option
                    ? 'border-[#8B7355] dark:border-[#A89580] bg-[#8B7355]/10 dark:bg-[#A89580]/10'
                    : 'border-[#E8E8E8] dark:border-[#2A2A2A] hover:bg-[#FAFAF8] dark:hover:bg-[#151515]'
                }`}
              >
                <input
                  type="radio"
                  name="phase2"
                  value={option}
                  checked={rescueData.phase2_activity === option}
                  onChange={(e) => setRescueData(prev => ({ ...prev, phase2_activity: e.target.value }))}
                  className="w-4 h-4"
                />
                <span className="text-xs text-[#1A1A1A] dark:text-[#F5F5F5]">{option}</span>
              </label>
            ))}
          </div>

          <p className="text-center text-[#6B6B6B] dark:text-[#A0A0A0] mb-6 italic text-xs">
            {t.phase2DontThink}
          </p>

          <Button
            onClick={handlePhase2Continue}
            disabled={!rescueData.phase2_activity}
            className="w-full bg-[#FF6B35] dark:bg-[#FF8A65] hover:opacity-90"
          >
            {t.phase2Executed}
          </Button>
        </motion.div>
      )}

      {/* Phase 3: One Small Win */}
      {phase === 'phase3' && (
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-2xl p-6 border border-[#E8E8E8] dark:border-[#2A2A2A]"
        >
          <div className="mb-6">
            <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] mb-2">{t.phase} 3/6</p>
            <h2 className="font-serif text-2xl font-light mb-4 text-[#1A1A1A] dark:text-[#F5F5F5]">{t.phase3Title}</h2>
            <p className="mb-4 text-sm text-[#1A1A1A] dark:text-[#F5F5F5]">{t.phase3Subtitle}</p>
          </div>

          <div className="space-y-2 mb-6">
            {phase3Options.map((option) => (
              <label
                key={option}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                  rescueData.phase3_activity === option
                    ? 'border-[#8B7355] dark:border-[#A89580] bg-[#8B7355]/10 dark:bg-[#A89580]/10'
                    : 'border-[#E8E8E8] dark:border-[#2A2A2A] hover:bg-[#FAFAF8] dark:hover:bg-[#151515]'
                }`}
              >
                <input
                  type="radio"
                  name="phase3"
                  value={option}
                  checked={rescueData.phase3_activity === option}
                  onChange={(e) => setRescueData(prev => ({ ...prev, phase3_activity: e.target.value }))}
                  className="w-4 h-4"
                />
                <span className="text-xs text-[#1A1A1A] dark:text-[#F5F5F5]">{option}</span>
              </label>
            ))}
          </div>

          <p className="text-center text-[#FF6B35] dark:text-[#FF8A65] font-medium mb-6 text-xs">
            {t.phase3SparkWarning}
          </p>

          <Button
            onClick={handlePhase3Continue}
            disabled={!rescueData.phase3_activity}
            className="w-full bg-[#FF6B35] dark:bg-[#FF8A65] hover:opacity-90"
          >
            {t.phase3Completed}
          </Button>
        </motion.div>
      )}

      {/* Phase 4: Regulation */}
      {phase === 'phase4' && (
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-2xl p-6 border border-[#E8E8E8] dark:border-[#2A2A2A]"
        >
          <div className="mb-6">
            <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] mb-2">{t.phase} 4/6</p>
            <h2 className="font-serif text-2xl font-light mb-4 text-[#1A1A1A] dark:text-[#F5F5F5]">{t.phase4Title}</h2>
            <p className="mb-4 text-sm text-[#1A1A1A] dark:text-[#F5F5F5]">{t.phase4ChooseActivity}</p>
          </div>

          <div className="space-y-2 mb-6">
            <label
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                rescueData.phase4_activity === 'custom'
                  ? 'border-[#8B7355] dark:border-[#A89580] bg-[#8B7355]/10 dark:bg-[#A89580]/10'
                  : 'border-[#E8E8E8] dark:border-[#2A2A2A] hover:bg-[#FAFAF8] dark:hover:bg-[#151515]'
              }`}
            >
              <input
                type="radio"
                name="phase4"
                value="custom"
                checked={rescueData.phase4_activity === 'custom'}
                onChange={(e) => setRescueData(prev => ({ ...prev, phase4_activity: e.target.value }))}
                className="w-4 h-4"
              />
              <span className="text-xs text-[#1A1A1A] dark:text-[#F5F5F5]">{t.phase4CustomActivity}</span>
            </label>
            {phase4Options.map((option) => (
              <label
                key={option}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                  rescueData.phase4_activity === option
                    ? 'border-[#8B7355] dark:border-[#A89580] bg-[#8B7355]/10 dark:bg-[#A89580]/10'
                    : 'border-[#E8E8E8] dark:border-[#2A2A2A] hover:bg-[#FAFAF8] dark:hover:bg-[#151515]'
                }`}
              >
                <input
                  type="radio"
                  name="phase4"
                  value={option}
                  checked={rescueData.phase4_activity === option}
                  onChange={(e) => setRescueData(prev => ({ ...prev, phase4_activity: e.target.value }))}
                  className="w-4 h-4"
                />
                <span className="text-xs text-[#1A1A1A] dark:text-[#F5F5F5]">{option}</span>
              </label>
            ))}
          </div>

          {rescueData.phase4_activity === 'custom' && (
            <div className="mb-6">
              <Label htmlFor="phase4-custom">{t.phase4TypeYourChoice}</Label>
              <Input
                id="phase4-custom"
                placeholder={t.phase4PlaceholderExample}
                value={rescueData.phase4_custom}
                onChange={(e) => setRescueData(prev => ({ ...prev, phase4_custom: e.target.value }))}
                className="mt-2"
              />
            </div>
          )}

          <Button
            onClick={handlePhase4Start}
            disabled={!rescueData.phase4_activity || (rescueData.phase4_activity === 'custom' && !rescueData.phase4_custom)}
            className="w-full bg-[#FF6B35] dark:bg-[#FF8A65] hover:opacity-90"
          >
            {t.phase4StartActivity}
          </Button>
        </motion.div>
      )}

      {/* Phase 4 Running */}
      {phase === 'phase4-running' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-2xl p-8 border border-[#E8E8E8] dark:border-[#2A2A2A] text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="text-6xl mb-6"
          >
            ⏳
          </motion.div>
          <h2 className="text-2xl font-bold mb-4">{t.phase4RunningTitle}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">{t.phase4YouChose}</p>
          <p className="text-lg font-medium mb-6">
            → {rescueData.phase4_activity === 'custom' ? rescueData.phase4_custom : rescueData.phase4_activity}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            {t.phase4SuggestedTime}
          </p>
          <p className="mb-6">{t.phase4WhenDone}</p>
          <Button
            onClick={handlePhase4Complete}
            className="w-full bg-[#4CAF50] dark:bg-[#66BB6A] hover:opacity-90"
          >
            {t.phase4Completed}
          </Button>
        </motion.div>
      )}

      {/* Phase 5: Engage One Target */}
      {phase === 'phase5' && (
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-2xl p-8 border border-[#E8E8E8] dark:border-[#2A2A2A]"
        >
          <div className="mb-8">
            <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] mb-3">{t.phase} 5/6</p>
            <h2 className="font-serif text-3xl font-light mb-6 text-[#1A1A1A] dark:text-[#F5F5F5]">{t.phase5Title}</h2>
            <div className="bg-[#FAFAF8] dark:bg-[#151515] rounded-xl p-6 mb-8">
              <p className="font-medium mb-3 text-[#1A1A1A] dark:text-[#F5F5F5]">{t.phase5KeyQuestion}</p>
              <p className="italic text-sm text-[#6B6B6B] dark:text-[#A0A0A0]">
                {t.phase5QuestionText}
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <Label htmlFor="phase5-target">{t.phase5EnterTarget}</Label>
              <Input
                id="phase5-target"
                placeholder={t.phase5PlaceholderTarget}
                value={rescueData.phase5_target}
                onChange={(e) => setRescueData(prev => ({ ...prev, phase5_target: e.target.value }))}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="phase5-duration">{t.phase5EstimatedTime}</Label>
              <Select
                value={String(rescueData.phase5_duration)}
                onValueChange={(v) => setRescueData(prev => ({ ...prev, phase5_duration: parseInt(v) }))}
              >
                <SelectTrigger id="phase5-duration" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">{t.phase5_15min}</SelectItem>
                  <SelectItem value="30">{t.phase5_30min}</SelectItem>
                  <SelectItem value="45">{t.phase5_45min}</SelectItem>
                  <SelectItem value="60">{t.phase5_60min}</SelectItem>
                  <SelectItem value="90">{t.phase5_90min}</SelectItem>
                  <SelectItem value="120">{t.phase5_2hours}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="phase5-category">{t.phase5Category}</Label>
              <Select
                value={rescueData.phase5_category}
                onValueChange={(v) => setRescueData(prev => ({ ...prev, phase5_category: v as Task['category'] }))}
              >
                <SelectTrigger id="phase5-category" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Trabalho">{getCategoryTranslation('Trabalho', settings.language)}</SelectItem>
                  <SelectItem value="Exercício">{getCategoryTranslation('Exercício', settings.language)}</SelectItem>
                  <SelectItem value="Estudo">{getCategoryTranslation('Estudo', settings.language)}</SelectItem>
                  <SelectItem value="Pensamento Crítico">{getCategoryTranslation('Pensamento Crítico', settings.language)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handlePhase5Continue}
            disabled={!rescueData.phase5_target}
            className="w-full bg-[#FF6B35] dark:bg-[#FF8A65] hover:opacity-90"
          >
            {t.phase5AddToList}
          </Button>
        </motion.div>
      )}

      {/* Phase 6: Reflect */}
      {phase === 'phase6' && (
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-2xl p-8 border border-[#E8E8E8] dark:border-[#2A2A2A]"
        >
          <div className="mb-8">
            <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] mb-3">{t.phase} 6/6</p>
            <h2 className="font-serif text-3xl font-light mb-6 text-[#1A1A1A] dark:text-[#F5F5F5]">{t.phase6Title}</h2>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <Label htmlFor="reflection-cause">{t.phase6Question1}</Label>
              <Textarea
                id="reflection-cause"
                placeholder={t.phase6Placeholder1}
                value={rescueData.reflection_cause}
                onChange={(e) => setRescueData(prev => ({ ...prev, reflection_cause: e.target.value }))}
                className="mt-2"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="reflection-adjust">{t.phase6Question2}</Label>
              <Textarea
                id="reflection-adjust"
                placeholder={t.phase6Placeholder2}
                value={rescueData.reflection_adjust}
                onChange={(e) => setRescueData(prev => ({ ...prev, reflection_adjust: e.target.value }))}
                className="mt-2"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="reflection-nugget">{t.phase6Question3}</Label>
              <Textarea
                id="reflection-nugget"
                placeholder={t.phase6Placeholder3}
                value={rescueData.reflection_nugget}
                onChange={(e) => setRescueData(prev => ({ ...prev, reflection_nugget: e.target.value }))}
                className="mt-2"
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSkipReflection}
              variant="outline"
              className="flex-1"
            >
              {t.phase6Close}
            </Button>
            <Button
              onClick={handleSaveAndFinish}
              className="flex-1 bg-[#4CAF50] dark:bg-[#66BB6A] hover:opacity-90"
            >
              {t.phase6SaveAndFinish}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Complete */}
      {phase === 'complete' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-2xl p-8 border border-[#E8E8E8] dark:border-[#2A2A2A] text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-6xl mb-6"
          >
            ✅
          </motion.div>
          <h2 className="text-3xl font-bold mb-4 text-[#4CAF50] dark:text-[#66BB6A]">
            {t.rescueCompleteTitle}
          </h2>
          <p className="text-lg mb-2">{t.youExit}</p>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t.focusOnTarget}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            {t.registeredAt} {format(new Date(), "dd/MM/yyyy")} {t.at} {format(new Date(), "HH:mm")}
          </p>
          <Button
            onClick={() => navigate('/home')}
            className="w-full bg-[#FF6B35] dark:bg-[#FF8A65] hover:opacity-90"
          >
            {t.backToTasks}
          </Button>
        </motion.div>
      )}
    </div>
  );
}