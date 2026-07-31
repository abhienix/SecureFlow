import { useState, type FormEvent, useRef, useEffect } from "react";
import { Send, Sparkles, Bot, User } from "lucide-react";
import { Card, CardBody, PageHeader, Button } from "../../ui";
import { useCopilotAsk } from "../../lib/queries";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm SecureFlow Copilot. Ask me about scan results, policy enforcement, or security findings across your pipeline.",
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const copilot = useCopilotAsk();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, copilot.isPending]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || copilot.isPending) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    copilot.mutate(
      { question },
      {
        onSuccess: (res) => {
          setMessages((m) => [...m, { role: "assistant", content: res.answer }]);
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Copilot is temporarily offline.";
          setMessages((m) => [...m, { role: "assistant", content: `Error: ${msg}` }]);
        },
      }
    );
  };

  return (
    <div className="flex h-full flex-col space-y-6">
      <PageHeader
        title="Copilot"
        description="Ask questions about your scans, policies, and security posture."
      />

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardBody className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={"flex gap-3 " + (m.role === "user" ? "justify-end" : "")}>
              {m.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Bot size={16} />
                </div>
              )}
              <div
                className={
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed " +
                  (m.role === "user"
                    ? "rounded-br-sm bg-indigo-500 text-white"
                    : "rounded-tl-sm border border-slate-800 bg-slate-950/60 text-slate-300")
                }
              >
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                  <User size={16} />
                </div>
              )}
            </div>
          ))}
          {copilot.isPending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                <Bot size={16} />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-slate-800 bg-slate-950/60 px-4 py-3">
                <Sparkles size={14} className="animate-pulse text-indigo-400" />
                <span className="text-sm text-slate-400">Analyzing…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </CardBody>

        <form onSubmit={submit} className="flex items-center gap-2 border-t border-slate-800 p-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Why was the latest commit blocked?"
            className="h-10 flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
          />
          <Button type="submit" loading={copilot.isPending} disabled={!input.trim()}>
            <Send size={15} />
            Ask
          </Button>
        </form>
      </Card>
    </div>
  );
}
