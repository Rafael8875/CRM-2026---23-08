import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Badge } from "../components/ui/badge";
import { MessageCircle, Send, Bot, User, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { sendChatMessage } from "../lib/chat-server";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

interface ChatSession {
  id: string;
  title: string;
  status: string;
  client_name: string | null;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const key = localStorage.getItem("grok_api_key");
    if (key) setApiKey(key);
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) loadMessages(selectedSession);
  }, [selectedSession]);

  const loadSessions = async () => {
    const { data } = await supabase
      .from("chat_sessions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSessions(data);
  };

  const loadMessages = async (sessionId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const createSession = async () => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ title: "Nova Conversa", status: "active" })
      .select()
      .single();

    if (data) {
      setSessions((prev) => [data, ...prev]);
      setSelectedSession(data.id);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !selectedSession) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await sendChatMessage({
        data: {
          sessionId: selectedSession,
          message: userMessage.content,
          apiKey: apiKey || "",
          model: "grok-4",
        },
      });

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.reply,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Erro ao conectar. Tente novamente.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4">
      {/* Sessions Sidebar */}
      <Card className="w-80 flex flex-col bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Conversas</CardTitle>
            <Button size="sm" onClick={createSession} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="space-y-2 p-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedSession === session.id
                    ? "bg-orange-500/20 border border-orange-500/30"
                    : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-medium truncate">{session.title}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">
                    {new Date(session.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {session.status === "active" ? "Ativa" : "Fechada"}
                  </Badge>
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-8">
                Nenhuma conversa ainda
              </p>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col bg-white/5 border-white/10">
        {selectedSession ? (
          <>
            <CardHeader className="pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Bot className="h-6 w-6 text-orange-400" />
                <div>
                  <CardTitle className="text-lg">
                    {sessions.find((s) => s.id === selectedSession)?.title || "Chat"}
                  </CardTitle>
                  <p className="text-xs text-gray-400">Adry Estações Gourmet IA</p>
                </div>
              </div>
            </CardHeader>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-orange-500 text-white rounded-br-md"
                          : "bg-white/10 text-gray-100 rounded-bl-md"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {msg.role === "assistant" && <Bot className="h-4 w-4 mt-0.5 text-orange-400" />}
                        {msg.role === "user" && <User className="h-4 w-4 mt-0.5 text-white/80" />}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <p className="text-[10px] opacity-50 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString("pt-BR")}
                      </p>
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
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  disabled={isLoading}
                />
                <Button onClick={handleSend} disabled={!input.trim() || isLoading} className="bg-orange-500 hover:bg-orange-600">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-orange-400/50" />
              <p className="text-lg font-medium">Selecione uma conversa</p>
              <p className="text-sm mt-1">ou crie uma nova para começar</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
