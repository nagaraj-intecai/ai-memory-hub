'use client';

import { useCallback, useEffect, useState } from 'react';
import { Brain, LayoutDashboard, LogOut, MessageSquare, RefreshCw, Settings } from 'lucide-react';
import { apiClient, type ModelOption } from '@/lib/api-client';
import { DbConnection } from '@/lib/spacetimedb/generated';
import type { ActivityDto, AiUsageDto, AuthUserDto, ConversationDto, MemoryDto, MemoryRelationDto, UserSettingsDto } from '@/types/domain';
import { AuthView } from '@/components/workspace/auth-view';
import { ChatView } from '@/components/workspace/chat-view';
import { DashboardView } from '@/components/workspace/dashboard-view';
import { MemoriesView } from '@/components/workspace/memories-view';
import { SettingsView } from '@/components/workspace/settings-view';
import { Button } from '@/components/ui/button';

type Tab = 'dashboard' | 'chat' | 'memories' | 'settings';

function tabFromPathname(pathname: string, fallback: Tab): Tab {
  if (pathname.startsWith('/chat')) return 'chat';
  if (pathname.startsWith('/memories')) return 'memories';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  return fallback;
}

export function AppShell({ initialTab = 'dashboard' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== 'undefined' ? tabFromPathname(window.location.pathname, initialTab) : initialTab,
  );

  useEffect(() => {
    const onPopState = () => {
      setTab(tabFromPathname(window.location.pathname, initialTab));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [initialTab]);

  function navigateTab(nextTab: Tab) {
    setTab(nextTab);
    if (window.location.pathname !== `/${nextTab}`) {
      window.history.pushState(null, '', `/${nextTab}`);
    }
  }

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string | undefined>();
  const [user, setUser] = useState<AuthUserDto | undefined>();
  const [settings, setSettings] = useState<UserSettingsDto | undefined>();

  const [memories, setMemories] = useState<MemoryDto[]>([]);
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [relations, setRelations] = useState<MemoryRelationDto[]>([]);
  const [usage, setUsage] = useState<AiUsageDto[]>([]);
  const [activity, setActivity] = useState<ActivityDto[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loadWorkspaceData = useCallback(async () => {
    setSyncing(true);
    try {
      const [memRes, convRes, relRes, usageRes, activityRes, settingsRes] = await Promise.all([
        apiClient.memories.list({ limit: 200 }),
        apiClient.conversations.list(),
        apiClient.relations.list(),
        apiClient.ai.usage(),
        apiClient.activity.list(),
        apiClient.settings.get(),
      ]);
      setMemories(memRes.memories);
      setConversations(convRes.conversations);
      setRelations(relRes.relations);
      setUsage(usageRes.usage);
      setActivity(activityRes.activity);
      if (settingsRes.settings) setSettings(settingsRes.settings);
    } finally {
      setSyncing(false);
    }
  }, []);

  const loadModels = useCallback(async (refresh = false) => {
    try {
      const res = await apiClient.ai.models(refresh);
      setModels(res.models);
    } catch {
      // OpenRouter catalog may be unavailable if API key is a placeholder
    }
  }, []);

  useEffect(() => {
    apiClient.auth
      .me()
      .then(async (res) => {
        setAuthenticated(true);
        setAuthToken(res.token);
        setUser(res.user);
        setSettings(res.settings);
        await Promise.all([loadWorkspaceData(), loadModels(false)]);
      })
      .catch(() => {
        setAuthenticated(false);
      })
      .finally(() => setCheckingAuth(false));
  }, [loadWorkspaceData, loadModels]);

  // Native SpaceTimeDB WebSocket subscription for real-time updates + polling fallback
  useEffect(() => {
    if (!authenticated) return;
    let conn: DbConnection | undefined;
    if (authToken) {
      try {
        conn = DbConnection.builder()
          .withUri(process.env.NEXT_PUBLIC_SPACETIME_WS_URI ?? 'ws://127.0.0.1:3000')
          .withDatabaseName(process.env.NEXT_PUBLIC_SPACETIME_DB_NAME ?? 'ai-memory-hub-v2')
          .withToken(authToken)
          .onConnect((ctx) => {
            ctx.subscriptionBuilder()
              .onApplied(() => {
                void loadWorkspaceData();
              })
              .subscribe([
                'SELECT * FROM my_memories',
                'SELECT * FROM my_conversations',
                'SELECT * FROM my_memory_relations',
                'SELECT * FROM my_ai_usage',
                'SELECT * FROM my_activity',
              ]);
          })
          .build();

        conn.db.myMemories.onInsert(() => void loadWorkspaceData());
        conn.db.myMemories.onUpdate(() => void loadWorkspaceData());
        conn.db.myMemories.onDelete(() => void loadWorkspaceData());
        conn.db.myConversations.onInsert(() => void loadWorkspaceData());
        conn.db.myConversations.onDelete(() => void loadWorkspaceData());
        conn.db.myMemoryRelations.onInsert(() => void loadWorkspaceData());
        conn.db.myMemoryRelations.onUpdate(() => void loadWorkspaceData());
      } catch {
        // Fallback to polling below if WebSocket connection is unavailable
      }
    }

    const timer = setInterval(() => {
      void loadWorkspaceData();
    }, 15_000);
    return () => {
      clearInterval(timer);
      conn?.disconnect();
    };
  }, [authenticated, authToken, loadWorkspaceData]);

  async function handleLogout() {
    await apiClient.auth.logout();
    setAuthenticated(false);
    setAuthToken(undefined);
    setUser(undefined);
    setSettings(undefined);
    setMemories([]);
    setConversations([]);
    setRelations([]);
    setUsage([]);
    setActivity([]);
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading workspace...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <AuthView
        onAuthenticated={async (payload) => {
          setAuthenticated(true);
          setAuthToken(payload.token);
          setUser(payload.user);
          setSettings(payload.settings);
          await Promise.all([loadWorkspaceData(), loadModels(false)]);
        }}
      />
    );
  }

  const navItems: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'AI Chat', icon: MessageSquare },
    { id: 'memories', label: 'Memories', icon: Brain },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4">
          <div className="flex min-w-0 items-center gap-2 font-semibold text-slate-900">
            <Brain className="h-5 w-5 shrink-0 text-sky-600" />
            <span className="hidden sm:inline">AI Memory Hub</span>
          </div>

          <nav className="flex items-center gap-0.5 sm:gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={tab === item.id ? 'default' : 'ghost'}
                  size="sm"
                  className="h-9 w-9 px-0 sm:h-8 sm:w-auto sm:px-3"
                  title={item.label}
                  aria-label={item.label}
                  onClick={() => navigateTab(item.id)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline">{item.label}</span>
                </Button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              title="Sync now"
              aria-label="Sync now"
              onClick={() => void loadWorkspaceData()}
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
            {user?.displayName && (
              <span className="hidden max-w-[10rem] truncate xl:inline text-xs text-slate-600">{user.displayName}</span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 px-0 sm:h-8 sm:w-auto sm:px-3"
              title="Logout"
              aria-label="Logout"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 p-3 sm:p-4 lg:p-6">
        {tab === 'dashboard' && (
          <DashboardView
            memories={memories}
            conversations={conversations}
            relations={relations}
            usage={usage}
            activity={activity}
            onRefresh={loadWorkspaceData}
          />
        )}
        {tab === 'chat' && (
          <ChatView
            conversations={conversations}
            models={models}
            defaultModel={settings?.defaultModel}
            onRefreshModels={() => loadModels(true)}
            onDataChanged={loadWorkspaceData}
          />
        )}
        {tab === 'memories' && (
          <MemoriesView memories={memories} relations={relations} onRefresh={loadWorkspaceData} />
        )}
        {tab === 'settings' && (
          <SettingsView key={settings?.updatedAt ?? 'default'} settings={settings} models={models} onSaved={loadWorkspaceData} />
        )}
      </main>
    </div>
  );
}
