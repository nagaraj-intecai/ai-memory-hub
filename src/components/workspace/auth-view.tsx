'use client';

import { useState } from 'react';
import {
  Brain,
  Database,
  GitMerge,
  Lock,
  Mail,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import { apiClient, type AuthPayload } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type AuthViewProps = {
  onAuthenticated: (payload: AuthPayload) => void;
};

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Automatic Memory Extraction',
    description: 'Captures durable facts, preferences, projects, and tasks directly from your conversations.',
  },
  {
    icon: MessageSquare,
    title: 'Context-Aware AI Chat',
    description: 'Retrieves relevant personal memories across sessions with streaming OpenRouter free models.',
  },
  {
    icon: GitMerge,
    title: 'Duplicate & Conflict Detection',
    description: 'Automatically flags overlapping or contradicting memories with full version history.',
  },
  {
    icon: Database,
    title: 'Real-Time SpaceTimeDB Sync',
    description: 'Per-user isolated workspace with live WebSocket updates and JSON export/import.',
  },
];

const CATEGORIES = ['Personal Information', 'Preferences', 'Projects', 'Tasks', 'Knowledge'];

export function AuthView({ onAuthenticated }: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result =
        mode === 'register'
          ? await apiClient.auth.register({
              email,
              password,
              ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
            })
          : await apiClient.auth.login({ email, password });
      onAuthenticated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-8 bg-slate-950 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/auth-bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-950/80 to-sky-950/75 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-6xl grid gap-8 sm:gap-10 lg:grid-cols-[1.2fr_0.9fr] items-center">
        <div className="space-y-5 text-white lg:space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-[11px] font-medium text-sky-200 sm:px-3.5 sm:text-xs">
            <Zap className="h-3.5 w-3.5 text-sky-400" />
            Next.js 16 • SpaceTimeDB • OpenRouter AI
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/20 border border-sky-400/30">
                <Brain className="h-6 w-6 text-sky-300" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">AI Memory Hub</h1>
            </div>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              Your persistent AI memory workspace. Store structured knowledge, stream conversations with free OpenRouter
              models, and keep every insight synchronized in real time.
            </p>
          </div>

          <div className="hidden gap-3.5 sm:grid sm:grid-cols-2">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm hover:bg-white/[0.08] transition-colors"
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <Icon className="h-4 w-4 text-sky-400 shrink-0" />
                    <h2 className="text-sm font-semibold text-white">{feature.title}</h2>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>

          <div className="hidden space-y-2 pt-1 sm:block">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Structured Memory Categories</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <Badge
                  key={category}
                  variant="outline"
                  className="border-white/15 bg-white/5 text-slate-200 px-3 py-1"
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <Card className="w-full max-w-md mx-auto border-white/20 bg-white/95 backdrop-blur-md shadow-2xl lg:mx-0 lg:max-w-none">
          <CardHeader className="space-y-3">
            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
              <Button
                type="button"
                variant={mode === 'login' ? 'default' : 'ghost'}
                size="sm"
                className="w-full"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
              >
                Sign In
              </Button>
              <Button
                type="button"
                variant={mode === 'register' ? 'default' : 'ghost'}
                size="sm"
                className="w-full"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
              >
                Create Account
              </Button>
            </div>
            <div>
              <CardTitle className="text-xl">
                {mode === 'login' ? 'Sign in to your workspace' : 'Create your personal workspace'}
              </CardTitle>
              <CardDescription className="mt-1">
                {mode === 'login'
                  ? 'Access your synced memories, chat history, and analytics.'
                  : 'Get started with isolated storage, auto-extraction, and free AI chat.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Display Name (optional)</label>
                  <div className="relative">
                    <User className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    <Input
                      className="pl-9 h-10"
                      placeholder="Saran"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <Input
                    type="email"
                    required
                    className="pl-9 h-10"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700">Password</label>
                  {mode === 'register' && <span className="text-[11px] text-slate-400">Min. 8 characters</span>}
                </div>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <Input
                    type="password"
                    required
                    minLength={mode === 'register' ? 8 : 1}
                    className="pl-9 h-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>

              <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Isolated per-user SpaceTimeDB workspace with JWT auth
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
