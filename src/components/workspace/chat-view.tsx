'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, Plus, RefreshCw, Send, Trash2, User } from 'lucide-react';
import { apiClient, type ModelOption } from '@/lib/api-client';
import type { ConversationDto, MessageDto } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';

type ChatViewProps = {
  conversations: ConversationDto[];
  models: ModelOption[];
  defaultModel?: string;
  onRefreshModels: () => Promise<void>;
  onDataChanged: () => Promise<void>;
};

export function ChatView({
  conversations,
  models,
  defaultModel,
  onRefreshModels,
  onDataChanged,
}: ChatViewProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>(conversations[0]?.id);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [prompt, setPrompt] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [sending, setSending] = useState(false);
  const [freeOnly, setFreeOnly] = useState(true);
  const [selectedModel, setSelectedModel] = useState(defaultModel ?? '');
  const [error, setError] = useState<string | null>(null);

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        const timeDiff = Date.parse(b.updatedAt || b.createdAt || '') - Date.parse(a.updatedAt || a.createdAt || '');
        if (Number.isFinite(timeDiff) && timeDiff !== 0) return timeDiff;
        return Number(b.id) - Number(a.id);
      }),
    [conversations],
  );

  const activeId = (selectedId || sortedConversations[0]?.id) || undefined;
  const displayedMessages = activeId ? messages : [];

  const filteredModels = useMemo(() => {
    if (!freeOnly) return models;
    const free = models.filter(
      (model) => model.id.includes(':free') || (model.pricing?.prompt === '0' && model.pricing?.completion === '0'),
    );
    return free.length > 0 ? free : models;
  }, [models, freeOnly]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    apiClient.conversations
      .messages(activeId)
      .then((res) => {
        if (!cancelled) {
          setMessages([...res.messages].sort((a, b) => Number(a.id) - Number(b.id)));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load messages');
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  async function handleNewConversation() {
    setError(null);
    try {
      const created = await apiClient.conversations.create({
        title: `Chat ${conversations.length + 1}`,
        model: selectedModel || undefined,
      });
      await onDataChanged();
      setSelectedId(created.id);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create conversation');
    }
  }

  async function handleDeleteConversation(id: string) {
    setError(null);
    try {
      await apiClient.conversations.remove(id);
      if (activeId === id) {
        setSelectedId(undefined);
        setMessages([]);
      }
      await onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete conversation');
    }
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const text = prompt.trim();
    if (!text || sending) return;

    setError(null);
    setSending(true);
    setPrompt('');
    setStreamingText('');

    const optimisticUser: MessageDto = {
      id: `temp-${Date.now()}`,
      conversationId: activeId ?? '',
      role: 'user',
      content: text,
      status: 'complete',
      promptTokens: 0,
      completionTokens: 0,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const result = await apiClient.streamChat({
        conversationId: activeId,
        message: text,
        model: selectedModel || undefined,
        onChunk: (chunk) => setStreamingText((prev) => prev + chunk),
      });
      const targetId = result.conversationId || activeId;
      if (targetId && targetId !== activeId) setSelectedId(targetId);
      await onDataChanged();
      if (targetId) {
        const refreshed = await apiClient.conversations.messages(targetId);
        setMessages([...refreshed.messages].sort((a, b) => Number(a.id) - Number(b.id)));
      }
    } catch (err) {
      const failedId = (err as Error & { conversationId?: string }).conversationId;
      if (failedId && failedId !== activeId) setSelectedId(failedId);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setStreamingText('');
      setSending(false);
    }
  }

  return (
    <div className="grid gap-4 lg:h-[calc(100vh-11rem)] lg:min-h-[520px] lg:grid-cols-[260px_1fr]">
      <Card className="flex min-w-0 flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-900">Conversations</span>
          <Button size="sm" variant="outline" onClick={handleNewConversation}>
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>
        <div className="max-h-48 flex-1 space-y-1 overflow-y-auto p-2 lg:max-h-none">
          {sortedConversations.length === 0 ? (
            <p className="p-3 text-xs text-slate-500">No conversations yet. Send a message to start one.</p>
          ) : (
            sortedConversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer ${
                  activeId === conv.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
                onClick={() => setSelectedId(conv.id)}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{conv.title}</p>
                  <p className={`text-[11px] truncate ${activeId === conv.id ? 'text-slate-300' : 'text-slate-400'}`}>
                    {conv.model || 'default'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Delete conversation"
                  className="rounded p-1 opacity-100 hover:bg-red-500/20 sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="flex min-w-0 flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="h-8 min-w-0 max-w-[12rem] flex-1 text-xs sm:max-w-xs"
            >
              <option value="">Default model</option>
              {filteredModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(e) => setFreeOnly(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Free models
            </label>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 px-0 sm:w-auto sm:px-3"
            title="Refresh Models"
            aria-label="Refresh Models"
            onClick={onRefreshModels}
          >
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Refresh Models</span>
          </Button>
        </div>

        <div className="h-[45vh] min-h-[280px] space-y-4 overflow-y-auto p-3 sm:p-4 lg:h-auto lg:flex-1">
          {displayedMessages.length === 0 && !streamingText && (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 gap-2">
              <Bot className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">AI Chat with Persistent Memory</p>
              <p className="text-xs max-w-md">
                Relevant memories are automatically retrieved and injected into context. Durable facts you mention are
                extracted and stored automatically.
              </p>
            </div>
          )}

          {displayedMessages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[92%] break-words rounded-xl px-3 py-2.5 text-sm whitespace-pre-wrap sm:max-w-[80%] sm:px-4 ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-900 border border-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px] opacity-70">
                  {msg.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                  <span className="capitalize">{msg.role}</span>
                  {msg.completionTokens > 0 && <Badge variant="outline">{msg.completionTokens} tok</Badge>}
                </div>
                {msg.content}
              </div>
            </div>
          ))}

          {streamingText && (
            <div className="flex justify-start gap-2 sm:gap-3">
              <div className="max-w-[92%] break-words rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm whitespace-pre-wrap text-slate-900 sm:max-w-[80%] sm:px-4">
                <div className="flex items-center gap-1.5 mb-1 text-[11px] opacity-70">
                  <Bot className="h-3 w-3" />
                  <span>Assistant (streaming...)</span>
                </div>
                {streamingText}
              </div>
            </div>
          )}
        </div>

        {error && <p className="mx-3 mb-2 break-words rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs text-red-700 sm:mx-4">{error}</p>}

        <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-200 p-3">
          <Input
            placeholder="Ask anything or tell me something to remember..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={sending}
          />
          <Button
            type="submit"
            className="h-9 w-9 shrink-0 px-0 sm:h-9 sm:w-auto sm:px-4"
            title={sending ? 'Sending...' : 'Send'}
            aria-label={sending ? 'Sending...' : 'Send'}
            disabled={sending || !prompt.trim()}
          >
            <Send className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{sending ? 'Sending...' : 'Send'}</span>
          </Button>
        </form>
      </Card>
    </div>
  );
}
