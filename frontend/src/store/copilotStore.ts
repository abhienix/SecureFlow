import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface CopilotState {
  isOpen: boolean;
  messages: ChatMessage[];
  context: any;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  addMessage: (sender: 'user' | 'ai', content: string) => void;
  updateLastMessage: (content: string) => void;
  clearHistory: () => void;
  setContext: (context: any) => void;
}

export const useCopilotStore = create<CopilotState>((set) => ({
  isOpen: true, // Permanent right panel by default
  messages: [],
  context: null,
  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  addMessage: (sender, content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: `${Date.now()}-${Math.random()}`,
          sender,
          content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    })),
  updateLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1].content = content;
      }
      return { messages };
    }),
  clearHistory: () => set({ messages: [] }),
  setContext: (context) => set({ context }),
}));
