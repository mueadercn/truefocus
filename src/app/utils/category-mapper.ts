import { translations, Language } from './translations';

export function getCategoryName(category: string | undefined, language: Language): string {
  if (!category) return '';
  
  const categoryMap: Record<string, keyof typeof translations.en> = {
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
  if (key && key in translations[language]) {
    return translations[language][key as keyof typeof translations['en']];
  }
  
  return category;
}

// Alias for getCategoryName - same functionality
export function getCategoryTranslation(category: string | undefined, language: Language): string {
  return getCategoryName(category, language);
}

export const CATEGORY_VALUES = {
  en: ['Work', 'Exercise', 'Study', 'Critical Thinking', 'Spirituality', 'Leisure', 'Health', 'Other'],
  pt: ['Trabalho', 'Exercício', 'Estudo', 'Pensamento Crítico', 'Espiritualidade', 'Lazer', 'Saúde', 'Outro']
};