"use client"

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Calendar } from "lucide-react";

export default function PlanningClient({ auditRun, isSubscribed }: any) {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string, suggestion?: any}[]>([
    { role: 'assistant', content: "Hi! I've analyzed your audit results. How can I help you plan your week?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isSubscribed) {
      return (
          <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
              <Card className="w-full max-w-md text-center">
                  <CardHeader><CardTitle>Upgrade to Access Planning Assistant</CardTitle></CardHeader>
                  <CardContent>
                      <p className="mb-4 text-muted-foreground">Unlock AI-powered calendar planning and optimization.</p>
                      <Button className="w-full">Upgrade Now</Button>
                  </CardContent>
              </Card>
          </div>
      );
  }

  const handleSend = async () => {
      if (!input.trim()) return;
      const userMsg = input;
      setInput("");
      setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
      setIsLoading(true);

      try {
          const res = await fetch('/api/planning/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  message: userMsg,
                  sessionId,
                  auditId: auditRun?.id
              })
          });
          const data = await res.json();
          if (data.sessionId) setSessionId(data.sessionId);
          
          // Parse suggestion
          let content = data.response;
          let suggestion = null;
          const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch) {
              try {
                  suggestion = JSON.parse(jsonMatch[1]);
                  content = content.replace(jsonMatch[0], "").trim();
              } catch (e) {}
          }

          setMessages(prev => [...prev, { role: 'assistant', content, suggestion }]);
      } catch (e) {
          setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, something went wrong." }]);
      } finally {
          setIsLoading(false);
      }
  };

  const handleAddEvent = async (suggestion: any) => {
      // Call create event API
      alert("Adding to calendar: " + suggestion.title);
  };

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-4rem)] flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="border-b py-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Planning Assistant
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="whitespace-pre-wrap">{m.content}</p>
                        </div>
                        {m.suggestion && (
                            <Card className="mt-2 w-full max-w-sm bg-card border-l-4 border-l-primary">
                                <CardContent className="p-3">
                                    <div className="font-bold text-sm mb-1">{m.suggestion.title}</div>
                                    <div className="text-xs text-muted-foreground mb-2">
                                        {new Date(m.suggestion.start).toLocaleString()} - {new Date(m.suggestion.end).toLocaleTimeString()}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Badge variant="outline">{m.suggestion.tier}</Badge>
                                        <Button size="sm" variant="secondary" onClick={() => handleAddEvent(m.suggestion)}>Add to Calendar</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-center gap-1 text-muted-foreground text-sm pl-2">
                        <span>Thinking...</span>
                    </div>
                )}
            </CardContent>
            <div className="p-4 border-t flex gap-2">
                <Input 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Ask for planning help..." 
                    disabled={isLoading}
                />
                <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                    <Send className="w-4 h-4" />
                </Button>
            </div>
        </Card>
    </div>
  );
}
