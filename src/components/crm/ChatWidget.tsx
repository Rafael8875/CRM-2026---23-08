import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { sendChatMessage } from "@/lib/chat-server";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = localStorage.getItem("grok_api_key");
    if (key) setApiKey(key);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createSession = async () => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        title: "Nova Conversa",
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating session:", error);
      return null;
    }
    return data.id;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = await createSession();
        if (!currentSessionId) {
          throw new Error("Failed to create session");
        }
        setSessionId(currentSessionId);
      }

      const result = await sendChatMessage({
        data: {
          sessionId: currentSessionId,
          message: userMessage.content,
          apiKey: apiKey || "",
          model: "grok-4",
        },
      });

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Desculpe, tive um problema. Tente novamente ou fale conosco no WhatsApp: (79) 99884-4913",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-orange-500 shadow-lg hover:bg-orange-600 transition-all duration-300"
        size="icon"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[520px] bg-gray-900 rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-sm">
                Adry Estações Gourmet
              </h3>
              <p className="text-white/80 text-xs">Assistente Virtual</p>
            </div>
            <div className="h-3 w-3 rounded-full bg-green-400 animate-pulse" />
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <Bot className="h-12 w-12 mx-auto mb-3 text-orange-400" />
                  <p className="text-sm font-medium">
                    Olá! 👋 Como posso ajudar?
                  </p>
                  <p className="text-xs mt-2 text-gray-500">
                    Conte-me sobre seu evento e eu monto o pacote perfeito!
                  </p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                      msg.role === "user"
                        ? "bg-orange-500 text-white rounded-br-md"
                        : "bg-white/10 text-gray-100 rounded-bl-md"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {msg.role === "assistant" && (
                        <Bot className="h-4 w-4 mt-0.5 text-orange-400 flex-shrink-0" />
                      )}
                      {msg.role === "user" && (
                        <User className="h-4 w-4 mt-0.5 text-white/80 flex-shrink-0" />
                      )}
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="h-5 w-5 text-orange-400 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-center text-[10px] text-gray-600 mt-2">
              Powered by Adry Estações Gourmet
            </p>
          </div>
        </div>
      )}
    </>
  );
}
