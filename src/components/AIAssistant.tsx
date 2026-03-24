import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, ThinkingLevel, Modality } from "@google/genai";
import { 
  Sparkles, 
  Send, 
  Brain, 
  MapPin, 
  Zap, 
  Bot, 
  User, 
  Loader2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Drug, Order } from '../types';
import Markdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode: 'general' | 'thinking' | 'maps' | 'lite';
  groundingChunks?: any[];
}

interface AIAssistantProps {
  drugs: Drug[];
  orders: Order[];
}

export default function AIAssistant({ drugs, orders }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'general' | 'thinking' | 'maps' | 'lite'>('general');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      content: input,
      mode
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      let modelName = "gemini-3-flash-preview";
      let config: any = {
        systemInstruction: `You are PharmaTrack AI, an intelligent assistant for a drug inventory and supply chain management system. 
        You have access to the current inventory, stock movement history, and orders.
        
        Current Inventory: ${JSON.stringify(drugs)}
        Current Orders: ${JSON.stringify(orders)}
        
        Provide professional, accurate, and concise information. 
        If asked about stock trends or history, analyze the 'history' field of the drugs.
        If asked about locations or nearby facilities, use the Google Maps tool.
        If asked for complex analysis or reasoning, use Thinking Mode.`
      };

      if (mode === 'thinking') {
        modelName = "gemini-3.1-pro-preview";
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      } else if (mode === 'lite') {
        modelName = "gemini-3.1-flash-lite-preview";
      } else if (mode === 'maps') {
        config.tools = [{ googleMaps: {} }];
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: input,
        config
      });

      const assistantMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: response.text || "I'm sorry, I couldn't generate a response.",
        mode,
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("AI Error:", error);
      const errorMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: `Error: ${error.message || "Something went wrong. Please try again."}`,
        mode
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] border border-[#141414] rounded-sm bg-white/50 overflow-hidden">
      {/* Header / Mode Selector */}
      <div className="p-4 border-b border-[#141414] bg-[#141414] text-[#E4E3E0] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-blue-400" />
          <h3 className="font-serif italic text-lg">Pharma Intelligence</h3>
        </div>
        
        <div className="flex items-center gap-2 bg-white/10 p-1 rounded-sm">
          <button 
            onClick={() => setMode('general')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-widest font-mono transition-all rounded-sm",
              mode === 'general' ? "bg-white text-[#141414]" : "hover:bg-white/5"
            )}
          >
            <Sparkles size={12} />
            General
          </button>
          <button 
            onClick={() => setMode('thinking')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-widest font-mono transition-all rounded-sm",
              mode === 'thinking' ? "bg-white text-[#141414]" : "hover:bg-white/5"
            )}
          >
            <Brain size={12} />
            Thinking
          </button>
          <button 
            onClick={() => setMode('maps')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-widest font-mono transition-all rounded-sm",
              mode === 'maps' ? "bg-white text-[#141414]" : "hover:bg-white/5"
            )}
          >
            <MapPin size={12} />
            Maps
          </button>
          <button 
            onClick={() => setMode('lite')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-widest font-mono transition-all rounded-sm",
              mode === 'lite' ? "bg-white text-[#141414]" : "hover:bg-white/5"
            )}
          >
            <Zap size={12} />
            Lite
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
            <Bot size={48} strokeWidth={1} />
            <div>
              <p className="font-serif italic text-xl">How can I assist you today?</p>
              <p className="text-xs font-mono uppercase tracking-widest mt-2">
                Analyze inventory, optimize supply chain, or find nearby facilities
              </p>
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-4 max-w-[85%]",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 border border-[#141414]",
                msg.role === 'assistant' ? "bg-[#141414] text-[#E4E3E0]" : "bg-white"
              )}>
                {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
              </div>
              
              <div className="space-y-2">
                <div className={cn(
                  "p-4 rounded-sm border border-[#141414] shadow-sm",
                  msg.role === 'assistant' ? "bg-white" : "bg-[#141414] text-[#E4E3E0]"
                )}>
                  <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:italic">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>

                {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingChunks.map((chunk, idx) => (
                      chunk.maps && (
                        <a 
                          key={idx}
                          href={chunk.maps.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-mono uppercase tracking-widest rounded-sm hover:bg-blue-100 transition-colors"
                        >
                          <MapPin size={10} />
                          {chunk.maps.title || "View on Maps"}
                          <ExternalLink size={10} />
                        </a>
                      )
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 opacity-30">
                  <span className="text-[8px] font-mono uppercase tracking-widest">
                    {msg.mode} mode
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-4"
          >
            <div className="w-8 h-8 rounded-sm bg-[#141414] text-[#E4E3E0] flex items-center justify-center border border-[#141414]">
              <Bot size={16} />
            </div>
            <div className="p-4 rounded-sm border border-[#141414] bg-white flex items-center gap-3">
              <Loader2 size={16} className="animate-spin opacity-40" />
              <span className="text-sm font-serif italic opacity-40">Thinking...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#141414] bg-white">
        <form onSubmit={handleSend} className="relative">
          <input 
            type="text"
            placeholder={
              mode === 'thinking' ? "Ask a complex question..." :
              mode === 'maps' ? "Find nearby pharmacies or suppliers..." :
              "Ask anything about your inventory..."
            }
            className="w-full pl-4 pr-12 py-4 bg-transparent border border-[#141414] rounded-sm focus:outline-none focus:ring-1 focus:ring-[#141414] transition-all font-serif italic"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#141414] text-[#E4E3E0] rounded-sm disabled:opacity-20 transition-all"
          >
            <Send size={18} />
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-4">
            {mode === 'thinking' && (
              <div className="flex items-center gap-1.5 text-blue-600">
                <Brain size={12} />
                <span className="text-[9px] font-mono uppercase tracking-widest font-bold">High Thinking Active</span>
              </div>
            )}
            {mode === 'maps' && (
              <div className="flex items-center gap-1.5 text-green-600">
                <MapPin size={12} />
                <span className="text-[9px] font-mono uppercase tracking-widest font-bold">Google Maps Grounding</span>
              </div>
            )}
            {mode === 'lite' && (
              <div className="flex items-center gap-1.5 text-orange-600">
                <Zap size={12} />
                <span className="text-[9px] font-mono uppercase tracking-widest font-bold">Low Latency Mode</span>
              </div>
            )}
          </div>
          <p className="text-[8px] font-mono uppercase tracking-widest opacity-40">
            Powered by Gemini 3 Series
          </p>
        </div>
      </div>
    </div>
  );
}
