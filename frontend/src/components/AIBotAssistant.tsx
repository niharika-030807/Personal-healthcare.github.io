import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Send, Sparkles, RotateCcw, Bot, HelpCircle, 
  ChevronDown, ExternalLink, HeartPulse, Pill, FileText, CheckCircle2 
} from 'lucide-react';
import { useAssistant } from '../context/AssistantContext';
import { useAuth } from '../context/AuthContext';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  suggestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  "🧪 What do abnormal lab values mean?",
  "💊 Explain what my medications do",
  "🩺 Questions I should ask my doctor",
  "📋 How to read my blood count (CBC)",
  "🫀 What is a healthy blood pressure range?",
  "🗣️ Can you explain my records in simple terms?"
];

export const AIBotAssistant: React.FC = () => {
  const { isOpen, setIsOpen, initialQuery, clearInitialQuery } = useAssistant();
  const { user, personalProfile, activePatient } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome_1',
      sender: 'bot',
      text: `Hello ${personalProfile?.name || activePatient?.display_name || user?.full_name || 'friend'}! 🐾 I'm your Copilot Buddy, your personal healthcare AI assistant.\n\nI can help you understand medical reports, explain what abnormal test results mean, review medication instructions, and suggest questions to ask your doctor. What would you like to know today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: DEFAULT_SUGGESTIONS
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Handle incoming query from other parts of the app
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleSendMessage(initialQuery);
      clearInitialQuery();
    }
  }, [initialQuery]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      const botResponseText = await callGeminiChat(query, apiKey, personalProfile?.name || user?.full_name);

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: botResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.warn('Gemini chat failed, using local clinical guide:', err);
      const fallbackText = getClinicalFallbackAnswer(query);
      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  const callGeminiChat = async (prompt: string, apiKey: string, patientName?: string): Promise<string> => {
    const systemPrompt = `You are "Copilot Buddy", an empathetic, highly knowledgeable, and friendly healthcare AI assistant for Personal Health Copilot, represented by a charming golden retriever puppy avatar.
Patient name: ${patientName || 'Patient'}.

YOUR MISSION:
1. Help patients understand medical records, prescriptions, lab panels (CBC, Lipid, CMP, Glucose, HbA1c), diagnostic imaging (X-rays, scans), and hospital discharge summaries.
2. Explain abnormal laboratory flags and clinical terms in plain language, avoiding confusing jargon.
3. Offer practical, patient-centered questions to ask their doctor at their next appointment.
4. Keep answers friendly, well-organized with bullet points, and reassuring.
5. End clinical guidance with a brief gentle reminder that this is for health literacy and does not replace their physician's diagnosis.`;

    const candidateModels = [
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash-lite",
      "gemini-3.5-flash-lite",
      "gemini-flash-latest"
    ];

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt },
                  { text: `User Question: ${prompt}` }
                ]
              }
            ]
          })
        });

        if (resp.ok) {
          const data = await resp.json();
          const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply && reply.trim()) {
            return reply.trim();
          }
        }
      } catch (e) {
        // Continue to fallback model
      }
    }

    throw new Error('All models exhausted');
  };

  const getClinicalFallbackAnswer = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes('abnormal') || q.includes('lab') || q.includes('test')) {
      return `📊 **Understanding Abnormal Lab Values**:\n\nWhen a lab value is marked "Abnormal" or outside the reference range, here is what it usually means:\n\n• **Reference Ranges**: Laboratories test thousands of healthy individuals and establish standard limits (e.g., Hemoglobin 12.0 - 16.0 g/dL).\n• **Borderline Values**: Mild variations are common and can occur due to hydration levels, recent meals, exercise, or sleep.\n• **Important Trends**: Doctors look at whether a number is improving over time rather than a single isolated number.\n\n💡 **Action Step**: Note down which specific test is flagged outside the limits and ask your healthcare provider if follow-up testing or dietary changes are needed.`;
    }

    if (q.includes('medication') || q.includes('medicine') || q.includes('dose') || q.includes('prescription')) {
      return `💊 **Prescription & Medication Guidance**:\n\n• **Timing & Consistency**: Take medications at the same time each day for steady effectiveness.\n• **Food Interactions**: Take antibiotics like Amoxicillin with meals if stomach irritation occurs.\n• **Finish Full Course**: Always complete antibiotic treatments even if you feel 100% better.\n• **Missed Doses**: Never double up doses unless explicitly instructed by your physician.\n\n💡 **Tip**: Review your active medications in the **Medications** tab to track dosages and schedules.`;
    }

    if (q.includes('pressure') || q.includes('bp') || q.includes('hypertension')) {
      return `🫀 **Blood Pressure Standards**:\n\n• **Optimal / Normal**: Under 120/80 mmHg\n• **Elevated**: Systolic 120–129 mmHg and Diastolic under 80 mmHg\n• **Stage 1 Hypertension**: 130–139 / 80–89 mmHg\n• **Stage 2 Hypertension**: 140/90 mmHg or higher\n\n💡 Regular monitoring, reducing sodium intake, staying hydrated, and routine check-ups are effective ways to support healthy cardiovascular readings.`;
    }

    if (q.includes('sugar') || q.includes('glucose') || q.includes('diabetes')) {
      return `🩸 **Blood Glucose Standards**:\n\n• **Fasting Glucose**: Normal is between 70 – 99 mg/dL. 100 – 125 mg/dL indicates prediabetes, and 126+ mg/dL requires clinical evaluation.\n• **Post-Meal Glucose**: Typically under 140 mg/dL 2 hours after a meal.\n• **HbA1c**: Reflects average blood sugar over the last 3 months (Normal is below 5.7%).`;
    }

    return `🐾 **Copilot Buddy Health Guidance**:\n\nThank you for asking! Personal Health Copilot is designed to help you organize and understand your clinical documents.\n\n• **View Trends**: Check your **Biomarker Trends** tab to see historical changes in your blood count and metabolic values.\n• **Upload Reports**: Use the **Upload Record** tab to analyze PDFs, scanned images, and doctor prescriptions.\n• **Questions for Doctor**: Always share unexplained symptoms, persistent headaches, or medication side effects with your physician.`;
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'bot',
        text: `Chat cleared! 🐾 I'm ready for your next question about your health records, lab reports, or medications.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: DEFAULT_SUGGESTIONS
      }
    ]);
  };

  return (
    <>
      {/* 1. FLOATING CHAT WINDOW */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 w-[380px] sm:w-[420px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[82vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 px-5 py-4 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src="/bot-mascot.png" 
                  alt="Copilot Buddy" 
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/80 shadow-md bg-white"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full"></span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm tracking-tight leading-none">Copilot Buddy</h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white">AI</span>
                </div>
                <p className="text-[11px] text-teal-100 flex items-center gap-1 mt-0.5">
                  Health Assistant • Online
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title="Restart Chat"
                className="p-1.5 rounded-xl hover:bg-white/10 text-teal-100 hover:text-white transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize Assistant"
                className="p-1.5 rounded-xl hover:bg-white/10 text-teal-100 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <img
                    src="/bot-mascot.png"
                    alt="Buddy"
                    className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 border border-teal-200 dark:border-teal-800 bg-white"
                  />
                )}

                <div className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-teal-600 text-white rounded-br-xs font-medium'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-xs'
                }`}>
                  <div className="whitespace-pre-line leading-relaxed text-xs">
                    {msg.text}
                  </div>
                  <div className={`text-[10px] flex justify-end ${
                    msg.sender === 'user' ? 'text-teal-200' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {msg.timestamp}
                  </div>

                  {/* Suggestion Chips */}
                  {msg.suggestions && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Quick questions:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.suggestions.map((sug, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendMessage(sug)}
                            className="text-left text-[11px] px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-semibold transition cursor-pointer"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center">
                <img
                  src="/bot-mascot.png"
                  alt="Buddy"
                  className="w-7 h-7 rounded-full object-cover shrink-0 border border-teal-200 bg-white animate-pulse"
                />
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 text-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce delay-100"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce delay-200"></span>
                  <span className="text-[11px] font-medium text-slate-400">Buddy is analyzing your question...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Buddy anything about your health records..."
                disabled={loading}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-40 text-white rounded-xl shadow-xs transition shrink-0 cursor-pointer"
                title="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-2">
              Informational AI assistant • Always consult your physician
            </p>
          </div>

        </div>
      )}

      {/* 2. FLOATING BOTTOM-RIGHT BOT LAUNCHER BUTTON */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {/* Helper Speech Bubble (shows when closed) */}
        {!isOpen && (
          <div 
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer hover:border-teal-400 transition animate-bounce duration-1000"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Ask Copilot Buddy</span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative group w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 bg-gradient-to-tr from-teal-500 via-emerald-400 to-amber-300 shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-teal-500/20"
          title="Open AI Health Bot Assistant"
          aria-label="Open AI Health Bot Assistant"
        >
          <img
            src="/bot-mascot.png"
            alt="AI Health Bot"
            className="w-full h-full rounded-full object-cover shadow-inner bg-white"
          />
          <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-xs"></span>
        </button>
      </div>
    </>
  );
};
