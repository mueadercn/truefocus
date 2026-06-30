import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { useApp } from '../context/AppContext';
import { translations } from '../utils/translations';

interface FAQItem {
  question: string;
  answer: string | string[];
}

function FAQAccordionItem({ item, index }: { item: FAQItem; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  const renderAnswer = () => {
    if (!item.answer) {
      return <p>No answer available</p>;
    }
    
    if (Array.isArray(item.answer)) {
      return item.answer.map((line, i) => (
        <p key={i} className={line.trim() === '' ? 'h-4' : ''}>
          {line}
        </p>
      ));
    }
    
    return item.answer.split('\\n').map((line, i) => (
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

export function FAQTeoria() {
  const { settings } = useApp();
  const t = translations[settings.language];

  // Create FAQ data using translations
  const faqData: FAQItem[] = [
    { question: t.faq_q1, answer: t.faq_a1 },
    { question: t.faq_q2, answer: t.faq_a2 },
    { question: t.faq_q3, answer: t.faq_a3 },
    { question: t.faq_q4, answer: t.faq_a4 },
    { question: t.faq_q5, answer: t.faq_a5 },
    { question: t.faq_q6, answer: t.faq_a6 },
    { question: t.faq_q7, answer: t.faq_a7 },
    { question: t.faq_q8, answer: t.faq_a8 },
    { question: t.faq_q9, answer: t.faq_a9 },
    { question: t.faq_q10, answer: t.faq_a10 },
    { question: t.faq_q11, answer: t.faq_a11 },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0A0A0A] py-12 px-5">
      <div className="max-w-3xl mx-auto space-y-16">
        {/* FAQ Section */}
        <div>
          <div className="mb-12 text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-light tracking-tight text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">
              FAQ
            </h1>
            <p className="text-[#6B6B6B] dark:text-[#A0A0A0] text-sm tracking-wide">
              {settings.language === 'pt' ? 'Perguntas Frequentes' : 'Frequently Asked Questions'}
            </p>
          </div>

          <div className="bg-[#FFFFFF] dark:bg-[#151515] rounded-2xl border border-[#E8E8E8] dark:border-[#2A2A2A] overflow-hidden">
            {faqData.map((item, index) => (
              <FAQAccordionItem key={index} item={item} index={index} />
            ))}
          </div>
        </div>

        {/* Teoria Section */}
        <div>
          <div className="mb-12 text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-light tracking-tight text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">
              {t.theory_title}
            </h1>
            <p className="text-[#6B6B6B] dark:text-[#A0A0A0] text-sm tracking-wide">
              {t.theory_subtitle}
            </p>
          </div>

          <div className="bg-white dark:bg-[#151515] rounded-2xl border border-[#E8E8E8] dark:border-[#2A2A2A]">
            <Accordion type="single" collapsible className="w-full">
              {/* Theory 1 - What is a Dopamine Hole */}
              <AccordionItem value="item-1" className="border-b border-[#E0E0E0] dark:border-[#2C2C2C] px-6">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5]">{t.theory_q1}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-3 font-serif text-base text-[#6B6B6B] dark:text-[#A0A0A0] leading-relaxed">
                    <p>
                      {t.theory_a1_intro}
                    </p>
                    <p>
                      {t.theory_a1_characteristics}
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>{t.theory_a1_char1}</li>
                      <li>{t.theory_a1_char2}</li>
                      <li>{t.theory_a1_char3}</li>
                      <li>{t.theory_a1_char4}</li>
                    </ul>
                    <p>
                      {t.theory_a1_cause}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Theory 2 - Law of Reciprocity */}
              <AccordionItem value="item-2" className="border-b border-[#E0E0E0] dark:border-[#2C2C2C] px-6">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5]">{t.theory_q2}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-3 font-serif text-base text-[#6B6B6B] dark:text-[#A0A0A0] leading-relaxed">
                    <p className="font-medium">
                      {t.theory_a2_principle}
                    </p>
                    <p>
                      {t.theory_a2_homeostasis}
                    </p>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 my-3">
                      <p className="text-center font-mono">
                        {t.theory_a2_formula}
                      </p>
                    </div>
                    <p>
                      {t.theory_a2_when}
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>{t.theory_a2_step1}</li>
                      <li>{t.theory_a2_step2}</li>
                      <li>{t.theory_a2_step3}</li>
                      <li>{t.theory_a2_step4}</li>
                    </ul>
                    <p className="italic">
                      {t.theory_a2_conclusion}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Theory 3 - Vicious Cycle */}
              <AccordionItem value="item-3" className="border-b border-[#E0E0E0] dark:border-[#2C2C2C] px-6">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5]">{t.theory_q3}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-3 font-serif text-base text-[#6B6B6B] dark:text-[#A0A0A0] leading-relaxed">
                    <p>{t.theory_a3_intro}</p>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 my-3">
                      <ol className="space-y-2">
                        <li><strong>{t.theory_a3_step1_title}</strong> → {t.theory_a3_step1_desc}</li>
                        <li><strong>{t.theory_a3_step2_title}</strong> → {t.theory_a3_step2_desc}</li>
                        <li><strong>{t.theory_a3_step3_title}</strong> → {t.theory_a3_step3_desc}</li>
                        <li><strong>{t.theory_a3_step4_title}</strong> → {t.theory_a3_step4_desc}</li>
                        <li><strong>{t.theory_a3_step5_title}</strong> → {t.theory_a3_step5_desc}</li>
                        <li><strong>{t.theory_a3_step6_title}</strong> → {t.theory_a3_step6_desc}</li>
                      </ol>
                    </div>
                    <p className="text-[#FF6B35] dark:text-[#FF8A65] font-medium">
                      {t.theory_a3_warning}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Theory 4 - What a Hole is NOT */}
              <AccordionItem value="item-4" className="border-b border-[#E0E0E0] dark:border-[#2C2C2C] px-6">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5]">{t.theory_q4}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-3 font-serif text-base text-[#6B6B6B] dark:text-[#A0A0A0] leading-relaxed">
                    <p>{t.theory_a4_intro}</p>
                    <ul className="space-y-3">
                      <li>
                        <strong>{t.theory_a4_not1_title}</strong>
                        <p className="text-sm mt-1">{t.theory_a4_not1_desc}</p>
                      </li>
                      <li>
                        <strong>{t.theory_a4_not2_title}</strong>
                        <p className="text-sm mt-1">{t.theory_a4_not2_desc}</p>
                      </li>
                      <li>
                        <strong>{t.theory_a4_not3_title}</strong>
                        <p className="text-sm mt-1">{t.theory_a4_not3_desc}</p>
                      </li>
                    </ul>
                    <div className="bg-[#4CAF50]/10 dark:bg-[#66BB6A]/10 rounded-lg p-4 mt-4">
                      <p className="text-[#4CAF50] dark:text-[#66BB6A] font-medium">
                        {t.theory_a4_conclusion}
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Theory 5 - Dopamine Leak */}
              <AccordionItem value="item-5" className="border-b border-[#E0E0E0] dark:border-[#2C2C2C] px-6">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5]">{t.theory_q5}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-3 font-serif text-base text-[#6B6B6B] dark:text-[#A0A0A0] leading-relaxed">
                    <p>
                      {t.theory_a5_intro}
                    </p>
                    <p className="font-medium">{t.theory_a5_sources}</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>{t.theory_a5_source1}</li>
                      <li>{t.theory_a5_source2}</li>
                      <li>{t.theory_a5_source3}</li>
                      <li>{t.theory_a5_source4}</li>
                      <li>{t.theory_a5_source5}</li>
                      <li>{t.theory_a5_source6}</li>
                    </ul>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 my-3">
                      <p className="font-medium mb-2">{t.theory_a5_equation_title}</p>
                      <p className="text-sm">
                        {t.theory_a5_eq1}<br/>
                        {t.theory_a5_eq2}<br/>
                        {t.theory_a5_eq3}
                      </p>
                    </div>
                    <p className="italic">
                      {t.theory_a5_conclusion}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Theory 6 - Why Over-Stimulation Drains */}
              <AccordionItem value="item-6" className="border-b border-[#E0E0E0] dark:border-[#2C2C2C] px-6">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5]">{t.theory_q6}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-3 font-serif text-base text-[#6B6B6B] dark:text-[#A0A0A0] leading-relaxed">
                    <p>
                      {t.theory_a6_intro}
                    </p>
                    <p className="font-medium">{t.theory_a6_mechanism}</p>
                    <ol className="list-decimal pl-5 space-y-3">
                      <li>
                        <strong>{t.theory_a6_step1_title}</strong>
                        <p className="text-sm mt-1">{t.theory_a6_step1_desc}</p>
                      </li>
                      <li>
                        <strong>{t.theory_a6_step2_title}</strong>
                        <p className="text-sm mt-1">{t.theory_a6_step2_desc}</p>
                      </li>
                      <li>
                        <strong>{t.theory_a6_step3_title}</strong>
                        <p className="text-sm mt-1">{t.theory_a6_step3_desc}</p>
                      </li>
                      <li>
                        <strong>{t.theory_a6_step4_title}</strong>
                        <p className="text-sm mt-1">{t.theory_a6_step4_desc}</p>
                      </li>
                    </ol>
                    <div className="bg-[#FF6B35]/10 dark:bg-[#FF8A65]/10 rounded-lg p-4 mt-4">
                      <p className="text-[#FF6B35] dark:text-[#FF8A65] font-medium">
                        {t.theory_a6_warning}
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Theory 7 - TrueFocus Method */}
              <AccordionItem value="item-7" className="px-6">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5]">{t.theory_q7}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4 font-serif text-base text-[#6B6B6B] dark:text-[#A0A0A0] leading-relaxed">
                    <p>
                      {t.theory_a7_intro}
                    </p>
                    
                    <div className="space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <p className="font-bold text-[#FF6B35] dark:text-[#FF8A65] mb-2">{t.theory_a7_phase1_title}</p>
                        <p className="text-sm">
                          {t.theory_a7_phase1_desc}
                        </p>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <p className="font-bold text-[#FF6B35] dark:text-[#FF8A65] mb-2">{t.theory_a7_phase2_title}</p>
                        <p className="text-sm">
                          {t.theory_a7_phase2_desc}
                        </p>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <p className="font-bold text-[#FF6B35] dark:text-[#FF8A65] mb-2">{t.theory_a7_phase3_title}</p>
                        <p className="text-sm">
                          {t.theory_a7_phase3_desc}
                        </p>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <p className="font-bold text-[#FF6B35] dark:text-[#FF8A65] mb-2">{t.theory_a7_phase4_title}</p>
                        <p className="text-sm">
                          {t.theory_a7_phase4_desc}
                        </p>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <p className="font-bold text-[#FF6B35] dark:text-[#FF8A65] mb-2">{t.theory_a7_phase5_title}</p>
                        <p className="text-sm">
                          {t.theory_a7_phase5_desc}
                        </p>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <p className="font-bold text-[#FF6B35] dark:text-[#FF8A65] mb-2">{t.theory_a7_phase6_title}</p>
                        <p className="text-sm">
                          {t.theory_a7_phase6_desc}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#4CAF50]/10 dark:bg-[#66BB6A]/10 rounded-lg p-4 mt-6">
                      <p className="text-[#4CAF50] dark:text-[#66BB6A] font-medium">
                        {t.theory_a7_conclusion}
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center pb-8">
          <p className="text-sm text-[#6B6B6B] dark:text-[#A0A0A0] italic">
            {t.theory_footer}
          </p>
        </div>
      </div>
    </div>
  );
}
