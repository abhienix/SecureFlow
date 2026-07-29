import { create } from 'zustand';

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
  
  open: () => void;
  close: () => void;
  toggle: () => void;
  addMessage: (msg: Message) => void;
  updateLastMessage: (content: string) => void;
  addConversationHistory: (msg: ChatMessage) => void;
  clearConversation: (repoName: string) => void;
  setTyping: (v: boolean) => void;
  setStreaming: (v: boolean) => void;
}

export const useVoidStore = create<VoidStore>((set) => ({
  isOpen: false,
  messages: [
    {
      role: 'assistant',
      content: "Hello! I am **Void** — SecureFlow's Copilot for abhienix/SecureFlow. I have context on your pipeline runs, security findings, and infrastructure. How can I help?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ],
  conversationHistory: [],
  isTyping: false,
  isStreaming: false,

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
    // Keep last 10 exchanges (20 messages)
    if (nextHistory.length > 20) {
      return { conversationHistory: nextHistory.slice(nextHistory.length - 20) };
    }
    return { conversationHistory: nextHistory };
  }),

  clearConversation: (repoName) => set({
    messages: [
      {
        role: 'assistant',
        content: `Hello! I am **Void** — SecureFlow's Copilot for ${repoName}. I have context on your pipeline runs, security findings, and infrastructure. How can I help?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ],
    conversationHistory: [],
    isTyping: false,
    isStreaming: false
  }),

  setTyping: (isTyping) => set({ isTyping }),
  setStreaming: (isStreaming) => set({ isStreaming })
}));
