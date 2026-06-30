import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

export function Teoria() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0A0A0A] py-12 px-5">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-light tracking-tight text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">
            Teoria da Dopamina
          </h1>
          <p className="text-[#6B6B6B] dark:text-[#A0A0A0] text-sm tracking-wide">
            Entenda a ciência por trás do TrueFocus
          </p>
        </div>

        <div className="bg-white dark:bg-[#151515] rounded-2xl border border-[#E8E8E8] dark:border-[#2A2A2A]">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-b border-[#E0E0E0] dark:border-[#2C2C2C] px-6">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5]">O que é um Dopamine Hole?</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-3 font-serif text-base text-[#6B6B6B] dark:text-[#A0A0A0] leading-relaxed">
                  <p>
                    Um <strong>Dopamine Hole</strong> (buraco de dopamina) é um estado de depleção motivacional causado por super-estimulação.
                  </p>
                  <p>
                    Características principais:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Nada satisfaz, tudo parece difícil</li>
                    <li>Falta de energia e motivação</li>
                    <li>Dificuldade em iniciar tarefas simples</li>
                    <li>Sensação de vazio e apatia</li>
                  </ul>
                  <p>
                    É causado por exposição excessiva a estímulos artificiais de alta dopamina (redes sociais, pornografia, jogos, junk food, etc).
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-b border-[#E0E0E0] dark:border-[#2C2C2C] px-6">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5]">Lei da Reciprocidade</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-3 font-serif text-base text-[#6B6B6B] dark:text-[#A0A0A0] leading-relaxed">
                  <p className="font-medium">
                    Todo pico de prazer gera uma dívida de dor equivalente.
                  </p>
                  <p>
                    Seu cérebro mantém homeostase através da Lei da Reciprocidade:
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 my-3">
                    <p className="text-center font-mono">
                      PRAZER ↑ → DOR ↓ → Baseline
                    </p>
                  </div>
                  <p>
                    Quando você experimenta um pico de prazer artificial:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Dopamina sobe rapidamente</li>
                    <li>Seu cérebro compensa baixando o baseline</li>
                    <li>Você cai abaixo do normal (dor/desconforto)</li>
                    <li>Precisa de mais estímulo para voltar ao normal</li>
                  </ul>
                  <p className="italic">
                    Não existe almoço grátis neurológico. Prazer barato = Déficit prolongado.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-b border-[#E0E0E0] dark:border-[#2C2C2C] px-6">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5]">Ciclo Vicioso da Depleção</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-3 font-serif text-base text-[#6B6B6B] dark:text-[#A0A0A0] leading-relaxed">
                  <p>O buraco de dopamina funciona como um ciclo viciado:</p>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 my-3">
                    <ol className="space-y-2">
                      <li><strong>1. Prazer Barato</strong> → Você busca estimulação fácil (redes sociais, pornografia, etc)</li>
                      <li><strong>2. Spike de Dopamina</strong> → Sensação temporária de prazer</li>
                      <li><strong>3. Crash</strong> → Seu baseline cai abaixo do normal</li>
                      <li><strong>4. Desconforto</strong> → Você se sente vazio, desmotivado</li>
                      <li><strong>5. Mais Prazer</strong> → Busca mais estimulação para compensar</li>
                      <li><strong>6. Buraco Mais Fundo</strong> → O ciclo se repete e piora</li>
                    </ol>
                  </div>
                  <p className="text-[#FF6B35] dark:text-[#FF8A65] font-medium">
                    Quanto mais você cava, mais fundo fica o buraco.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-b border-[#E0E0E0] dark:border-[#2C2C2C] px-6">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5]">O que Não É um Buraco</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-3 font-serif text-base text-[#6B6B6B] dark:text-[#A0A0A0] leading-relaxed">
                  <p>É importante entender o que o buraco de dopamina NÃO é:</p>
                  <ul className="space-y-3">
                    <li>
                      <strong>❌ Não é fraqueza moral</strong>
                      <p className="text-sm mt-1">Não é falta de força de vontade ou falha de caráter. É um estado neurológico temporário.</p>
                    </li>
                    <li>
                      <strong>❌ Não é depressão clínica</strong>
                      <p className="text-sm mt-1">Embora os sintomas sejam similares, o buraco é causado por super-estimulação e é reversível rapidamente.</p>
                    </li>
                    <li>
                      <strong>❌ Não é permanente</strong>
                      <p className="text-sm mt-1">Com as ações certas, você pode sair do buraco em 1-3 dias.</p>
                    </li>
                  </ul>
                  <div className="bg-[#4CAF50]/10 dark:bg-[#66BB6A]/10 rounded-lg p-4 mt-4">
                    <p className="text-[#4CAF50] dark:text-[#66BB6A] font-medium">
                      ✓ É um déficit neurquímico temporário que pode ser revertido com ação consciente.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border-b border-[#E0E0E0] dark:border-[#2C2C2C] px-6">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5]">Leak de Dopamina</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-3 font-serif text-base text-[#6B6B6B] dark:text-[#A0A0A0] leading-relaxed">
                  <p>
                    <strong>Dopamine Leak</strong> (vazamento de dopamina) é quando você gasta sua atenção e energia mental em estímulos que não agregam valor.
                  </p>
                  <p className="font-medium">Principais fontes de leak:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Scrolling infinito em redes sociais</li>
                    <li>Notificações constantes</li>
                    <li>Binge watching de séries</li>
                    <li>Pornografia</li>
                    <li>Jogos viciantes</li>
                    <li>Junk food</li>
                  </ul>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 my-3">
                    <p className="font-medium mb-2">A equação do leak:</p>
                    <p className="text-sm">
                      Gastar atenção em prazer barato = Vazamento de energia<br/>
                      Spikes de prazer artificial = Leak futuro garantido<br/>
                      Controlar estimulação = Armazenar energia
                    </p>
                  </div>
                  <p className="italic">
                    Trate a dopamina como moeda preciosa. Não gaste em qualquer coisa.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border-b border-[#E0E0E0] dark:border-[#2C2C2C] px-6">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5]">Por que Super-Estimulação Drena Energia</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-3 font-serif text-base text-[#6B6B6B] dark:text-[#A0A0A0] leading-relaxed">
                  <p>
                    A super-estimulação cria um paradoxo: quanto mais você busca energia em prazeres artificiais, mais drenado fica.
                  </p>
                  <p className="font-medium">O mecanismo:</p>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>
                      <strong>Circuito sobrecarregado</strong>
                      <p className="text-sm mt-1">Seu sistema de recompensa fica saturado com estímulos artificiais intensos</p>
                    </li>
                    <li>
                      <strong>Tolerância aumenta</strong>
                      <p className="text-sm mt-1">Você precisa de cada vez mais estímulo para sentir o mesmo efeito</p>
                    </li>
                    <li>
                      <strong>Baseline cai</strong>
                      <p className="text-sm mt-1">Seu nível normal de dopamina diminui, fazendo tarefas comuns parecerem impossíveis</p>
                    </li>
                    <li>
                      <strong>Necessidade de mais</strong>
                      <p className="text-sm mt-1">Você fica dependente de estímulos artificiais para funcionar</p>
                    </li>
                  </ol>
                  <div className="bg-[#FF6B35]/10 dark:bg-[#FF8A65]/10 rounded-lg p-4 mt-4">
                    <p className="text-[#FF6B35] dark:text-[#FF8A65] font-medium">
                      ⚠️ Super-estimulação não energiza. Ela drena.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="px-6">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="font-serif text-lg font-light text-[#1A1A1A] dark:text-[#F5F5F5]">Método TrueFocus Explicado</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4 font-serif text-base text-[#6B6B6B] dark:text-[#A0A0A0] leading-relaxed">
                  <p>
                    O método <strong>TrueFocus</strong> é um protocolo de 6 fases para sair do buraco de dopamina:
                  </p>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                      <p className="font-bold text-[#FF6B35] dark:text-[#FF8A65] mb-2">1. STOP DIGGING (Pare de cavar)</p>
                      <p className="text-sm">
                        Primeiro, pare de fazer o que está te drenando. Corte a fonte de super-estimulação AGORA.
                        Desligue o celular, feche as abas, saia da situação.
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                      <p className="font-bold text-[#FF6B35] dark:text-[#FF8A65] mb-2">2. TUNE INTO BODY (Faísca física)</p>
                      <p className="text-sm">
                        Crie uma faísca através do corpo. Atividade física intensa (30-60s) gera energia imediata e quebra o estado mental negativo.
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                      <p className="font-bold text-[#FF6B35] dark:text-[#FF8A65] mb-2">3. ONE SMALL WIN (Uma vitória pequena)</p>
                      <p className="text-sm">
                        Conquiste algo simples (2-5min). Fazer a cama, tomar banho, lavar um prato. 
                        A faísca tem prazo - use-a antes que desapareça.
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                      <p className="font-bold text-[#FF6B35] dark:text-[#FF8A65] mb-2">4. REGULATE (Regulação - 10-15min)</p>
                      <p className="text-sm">
                        Atividade regulatória mais longa: caminhada, leitura, meditação. 
                        Reconecte com o momento presente e estabilize seu sistema nervoso.
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                      <p className="font-bold text-[#FF6B35] dark:text-[#FF8A65] mb-2">5. ENGAGE ONE TARGET (Um alvo focal)</p>
                      <p className="text-sm">
                        Escolha UMA coisa importante para focar hoje. Não 10 tarefas - apenas 1.
                        O que te faria sentir realizado com a energia que você tem AGORA?
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                      <p className="font-bold text-[#FF6B35] dark:text-[#FF8A65] mb-2">6. ADJUST/REFLECT (Ajustar)</p>
                      <p className="text-sm">
                        Reflita: O que te levou ao buraco? O que ajustar amanhã? Qual o aprendizado?
                        Use cada buraco como oportunidade de aprender sobre seus gatilhos.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#4CAF50]/10 dark:bg-[#66BB6A]/10 rounded-lg p-4 mt-6">
                    <p className="text-[#4CAF50] dark:text-[#66BB6A] font-medium">
                      ✓ Seguindo este protocolo, você pode sair do buraco em 1-3 dias.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}