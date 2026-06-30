import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { translations } from '../utils/translations';

interface FAQItem {
  question: string;
  answer: string | string[];
}

export function FAQ() {
  const { settings } = useApp();
  const t = translations[settings.language];

  const faqData: FAQItem[] = [
    {
      question: t.faq_q1,
      answer: t.faq_a1
    },
    {
      question: t.faq_q2,
      answer: t.faq_a2
    },
    {
      question: t.faq_q3,
      answer: t.faq_a3
    },
    {
      question: t.faq_q4,
      answer: t.faq_a4
    },
    {
      question: t.faq_q5,
      answer: t.faq_a5
    },
    {
      question: t.faq_q6,
      answer: t.faq_a6
    },
    {
      question: t.faq_q7,
      answer: t.faq_a7
    },
    {
      question: t.faq_q8,
      answer: t.faq_a8
    },
    {
      question: t.faq_q9,
      answer: t.faq_a9
    },
    {
      question: t.faq_q10,
      answer: t.faq_a10
    },
    {
      question: t.faq_q11,
      answer: t.faq_a11
    }
  ];

  function FAQAccordionItem({ item, index }: { item: FAQItem; index: number }) {
    const [isOpen, setIsOpen] = useState(false);

    const renderAnswer = () => {
      if (Array.isArray(item.answer)) {
        return item.answer.map((line, i) => (
          <p key={i} className={line.trim() === '' ? 'h-4' : ''}>
            {line}
          </p>
        ));
      }
      
      return item.answer.split('\n').map((line, i) => (
        <p key={i} className={line.trim() === '' ? 'h-4' : ''}>
          {line}
        </p>
      ));
    };

    return (
      <div className="border-b border-[#E8E8E8] dark:border-[#2A2A2A] last:border-b-0">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full py-6 flex items-start justify-between gap-4 text-left hover:bg-[#FAFAF8] dark:hover:bg-[#0A0A0A] transition-colors duration-300 px-2 -mx-2 rounded-lg group"
        >
          <span className="font-serif text-xl font-light text-[#1A1A1A] dark:text-[#F5F5F5] leading-relaxed">
            {index + 1}. {item.question}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-shrink-0 mt-1"
          >
            <ChevronDown 
              className="w-5 h-5 text-[#8B7355] dark:text-[#A89580] group-hover:text-[#6B5943] dark:group-hover:text-[#8B7355] transition-colors" 
            />
          </motion.div>
        </button>
        
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="pb-6 px-2 space-y-3 font-serif text-base text-[#6B6B6B] dark:text-[#A0A0A0] leading-relaxed">
                {renderAnswer()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0A0A0A] py-12 px-5">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-light tracking-tight text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">
            TrueFocus — FAQ
          </h1>
          <p className="text-[#6B6B6B] dark:text-[#A0A0A0] text-sm tracking-wide">
            Perguntas Frequentes
          </p>
        </div>

        {/* FAQ Items */}
        <div className="bg-[#FFFFFF] dark:bg-[#151515] rounded-2xl border border-[#E8E8E8] dark:border-[#2A2A2A] overflow-hidden">
          {faqData.map((item, index) => (
            <FAQAccordionItem key={index} item={item} index={index} />
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] italic">
            Foco é escolha. Escolha é poder.
          </p>
        </div>
      </div>
    </div>
  );
}