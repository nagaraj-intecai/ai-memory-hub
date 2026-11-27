import type {
  ActivityDto,
  AiUsageDto,
  AuthUserDto,
  ConversationDto,
  MemoryDto,
  MemoryRelationDto,
  MemorySourceDto,
  MemoryVersionDto,
  MessageDto,
  UserSettingsDto,
} from '@/types/domain';

export type ModelOption = {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: Record<string, string>;
};

export type AuthPayload = {
  token: string;
  user: AuthUserDto;
  settings?: UserSettingsDto;
};

const inFlightGetRequests = new Map<string, Promise<unknown>>();

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET';
  if (method === 'GET') {
    const pending = inFlightGetRequests.get(url);
    if (pending) return pending as Promise<T>;
  }

  const request = (async () => {
    const response = await fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
    });

    const payload = (await response.json().catch(() => ({}))) as T & {
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(payload.error?.message || `Request failed (${response.status})`);
    }
    return payload;
  })();

  if (method === 'GET') {
    inFlightGetRequests.set(url, request);
    void request
      .finally(() => {
        if (inFlightGetRequests.get(url) === request) inFlightGetRequests.delete(url);
      })
      .catch(() => undefined);
  }

  return request;
}

export const apiClient = {
  auth: {
    register(body: { email: string; password: string; displayName?: string }) {
      return requestJson<AuthPayload>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    login(body: { email: string; password: string }) {
      return requestJson<AuthPayload>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    logout() {
      return requestJson<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
    },
    me() {
      return requestJson<{ token?: string; user?: AuthUserDto; settings?: UserSettingsDto }>('/api/auth/me');
    },
  },

  settings: {
    get() {
      return requestJson<{ settings?: UserSettingsDto }>('/api/settings');
    },
    update(body: {
      defaultModel: string;
      responseStyle: string;
      autoExtractMemories: boolean;
      timezone: string;
      maxPageSize: number;
    }) {
      return requestJson<{ settings?: UserSettingsDto }>('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
  },

  ai: {
    models(refresh = false) {
      return requestJson<{ models: ModelOption[] }>(`/api/ai/models?refresh=${refresh ? 'true' : 'false'}`);
    },
    usage(conversationId?: string) {
      const params = new URLSearchParams({ limit: '50' });
      if (conversationId) params.set('conversationId', conversationId);
      return requestJson<{ usage: AiUsageDto[] }>(`/api/ai/usage?${params.toString()}`);
    },
  },

  conversations: {
    list() {
      return requestJson<{ conversations: ConversationDto[] }>('/api/conversations');
    },
    create(body: { title: string; model?: string }) {
      return requestJson<ConversationDto>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    messages(id: string) {
      return requestJson<{ conversationId: string; messages: MessageDto[] }>(`/api/conversations/${id}`);
    },
    remove(id: string) {
      return requestJson<{ ok: boolean }>(`/api/conversations/${id}`, { method: 'DELETE' });
    },
  },

  memories: {
    list(params?: { category?: string; status?: string; q?: string; limit?: number }) {
      const search = new URLSearchParams();
      if (params?.category) search.set('category', params.category);
      if (params?.status) search.set('status', params.status);
      if (params?.q) search.set('q', params.q);
      if (params?.limit) search.set('limit', String(params.limit));
      const qs = search.toString();
      return requestJson<{ memories: MemoryDto[] }>(`/api/memories${qs ? `?${qs}` : ''}`);
    },
    create(body: {
      title: string;
      content: string;
      summary: string;
      category: string;
      importance: number;
    }) {
      return requestJson<MemoryDto>('/api/memories', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    details(id: string) {
      return requestJson<{
        memory: MemoryDto;
        sources: MemorySourceDto[];
        versions: MemoryVersionDto[];
      }>(`/api/memories/${id}`);
    },
    update(
      id: string,
      body: {
        title: string;
        content: string;
        summary: string;
        category: string;
        importance: number;
        changeReason?: string;
      },
    ) {
      return requestJson<{
        memory: MemoryDto;
        sources: MemorySourceDto[];
        versions: MemoryVersionDto[];
      }>(`/api/memories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    remove(id: string) {
      return requestJson<{ ok: boolean }>(`/api/memories/${id}`, { method: 'DELETE' });
    },
    archive(id: string) {
      return requestJson<{ ok: boolean }>(`/api/memories/${id}/archive`, { method: 'POST' });
    },
    exportJson() {
      return requestJson<{ memories: MemoryDto[] }>('/api/memories/export?format=json');
    },
    importJson(memories: Array<{ title: string; content: string; summary: string; category: string; importance: number }>) {
      return requestJson<{ created: number; memories: MemoryDto[] }>('/api/memories/import', {
        method: 'POST',
        body: JSON.stringify({ memories }),
      });
    },
  },

  activity: {
    list() {
      return requestJson<{ activity: ActivityDto[] }>('/api/activity');
    },
  },

  relations: {
    list() {
      return requestJson<{ relations: MemoryRelationDto[] }>('/api/memory-relations');
    },
    create(body: {
      fromMemoryId: string;
      toMemoryId: string;
      relationType: 'related' | 'supports' | 'contradicts' | 'causes' | 'duplicates';
      strength: number;
    }) {
      return requestJson<{ ok: boolean }>('/api/memory-relations', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    updateStatus(id: string, status: 'active' | 'superseded' | 'rejected') {
      return requestJson<{ ok: boolean }>(`/api/memory-relations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
  },

  async streamChat(input: {
    conversationId?: string;
    message: string;
    model?: string;
    onChunk: (text: string) => void;
  }): Promise<{ conversationId?: string }> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(input.conversationId ? { conversationId: input.conversationId } : {}),
        message: input.message,
        ...(input.model ? { model: input.model } : {}),
      }),
    });

    if (!response.ok || !response.body) {
      const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(payload.error?.message || `Chat failed (${response.status})`);
    }

    const conversationId = response.headers.get('x-conversation-id') ?? undefined;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let failure: string | undefined;

    const processLine = (line: string) => {
      if (!line.trim()) return;
      let event: { type?: string; text?: string; message?: string };
      try {
        event = JSON.parse(line) as { type?: string; text?: string; message?: string };
      } catch {
        throw new Error('Chat response was malformed');
      }
      if (event.type === 'content' && typeof event.text === 'string') {
        input.onChunk(event.text);
      } else if (event.type === 'error') {
        failure = typeof event.message === 'string' ? event.message : 'Chat failed';
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) processLine(line);
    }
    if (buffer.trim()) processLine(buffer);
    if (failure) {
      const error = new Error(failure) as Error & { conversationId?: string };
      error.conversationId = conversationId;
      throw error;
    }
    return { conversationId };
  },
};
