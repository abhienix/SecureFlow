import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  timestamp?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface VoidStore {
  isOpen: boolean;
  messages: Message[];
  conversationHistory: ChatMessage[];
  isTyping: boolean;
  isStreaming: boolean;
  triggerPrompt: string | null;
  
  open: () => void;
  close: () => void;
  toggle: () => void;
  addMessage: (msg: Message) => void;
  updateLastMessage: (content: string) => void;
  addConversationHistory: (msg: ChatMessage) => void;
  clearConversation: (repoName: string) => void;
  setTyping: (v: boolean) => void;
  setStreaming: (v: boolean) => void;
  setTriggerPrompt: (v: string | null) => void;
  autoAnalyzePipeline: (runId: string, stageName: string) => void;
}

export const useVoidStore = create<VoidStore>()(
  persist(
    (set) => ({
      isOpen: false,
      messages: [
        {
          role: 'assistant',
          content: "Hey! 👋 I'm Void — ask me about your pipelines, commits, CVEs, or scan results.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      conversationHistory: [],
      isTyping: false,
      isStreaming: false,
      triggerPrompt: null,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
      
      addMessage: (msg) => set((state) => ({
        messages: [...state.messages, {
          ...msg,
          timestamp: msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]
      })),

      updateLastMessage: (content) => set((state) => {
        const next = [...state.messages];
        if (next.length > 0) {
          next[next.length - 1] = {
            ...next[next.length - 1],
            content
          };
        }
        return { messages: next };
      }),

      addConversationHistory: (msg) => set((state) => {
        const nextHistory = [...state.conversationHistory, msg];
        if (nextHistory.length > 20) {
          return { conversationHistory: nextHistory.slice(nextHistory.length - 20) };
        }
        return { conversationHistory: nextHistory };
      }),

      clearConversation: (repoName) => set({
        messages: [
          {
            role: 'assistant',
            content: "Hey! 👋 I'm Void — ask me about your pipelines, commits, CVEs, or scan results.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ],
        conversationHistory: [],
        isTyping: false,
        isStreaming: false,
        triggerPrompt: null
      }),

      setTyping: (isTyping) => set({ isTyping }),
      setStreaming: (isStreaming) => set({ isStreaming }),
      setTriggerPrompt: (triggerPrompt) => set({ triggerPrompt }),
      autoAnalyzePipeline: (runId: string, stageName: string) => {
        const prompt = `Automatically analyze this blocked/failed pipeline run #${runId} at stage "${stageName}". Provide root cause, specific CVE findings, policy violations, and step-by-step remediation.`;
        set({ triggerPrompt: prompt, isOpen: true });
      },
    }),
    {
      name: 'sf_void_ai_chat',
      partialize: (state) => ({
        messages: state.messages,
        conversationHistory: state.conversationHistory,
      }),
    }
  )
);
