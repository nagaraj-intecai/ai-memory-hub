'use client';

import { useRef, useState } from 'react';
import { Activity, Brain, Download, MessageSquare, Upload, Zap } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { importSchema } from '@/lib/validation/schemas';
import type { ActivityDto, AiUsageDto, ConversationDto, MemoryDto, MemoryRelationDto } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type DashboardViewProps = {
  memories: MemoryDto[];
  conversations: ConversationDto[];
  relations: MemoryRelationDto[];
  usage: AiUsageDto[];
  activity: ActivityDto[];
  onRefresh: () => Promise<void>;
};

const CATEGORIES = ['personal information', 'preferences', 'projects', 'tasks', 'knowledge'];

export function DashboardView({ memories, conversations, relations, usage, activity, onRefresh }: DashboardViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activeMemories = memories.filter((m) => m.status === 'active').length;
  const totalTokens = usage.reduce((sum, item) => sum + item.totalTokens, 0);
  const conflictCount = relations.filter((r) => r.status === 'active' && (r.relationType === 'contradicts' || r.relationType === 'duplicates')).length;

  async function handleExport() {
    setBusy(true);
    setStatusMessage(null);
    try {
      const data = await apiClient.memories.exportJson();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'memories.json';
      anchor.click();
      URL.revokeObjectURL(url);
      setStatusMessage(`Exported ${data.memories.length} memories.`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatusMessage(null);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const items = Array.isArray(parsed) ? parsed : (parsed as { memories?: unknown }).memories;
      const validation = importSchema.safeParse({ memories: items });
      if (!validation.success) {
        const issue = validation.error.issues[0];
        const location = issue?.path.length
          ? ` at ${[String(issue.path[0]), String(issue.path[1] ?? ''), ...issue.path.slice(2).map(String)].filter(Boolean).join('.')}`
          : '';
        throw new Error(`Invalid import file${location}: ${issue?.message ?? 'validation failed'}`);
      }
      const res = await apiClient.memories.importJson(validation.data.memories);
      await onRefresh();
      setStatusMessage(`Imported ${res.created} memories.`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Memory Dashboard</h2>
          <p className="text-sm text-slate-500">Overview of your synchronized SpaceTimeDB workspace and AI usage.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={busy}>
            <Upload className="h-4 w-4" />
            Import JSON
          </Button>
          <Button size="sm" onClick={handleExport} disabled={busy}>
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="break-words rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">{statusMessage}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Memories</CardDescription>
            <CardTitle className="text-2xl flex items-center justify-between">
              {memories.length}
              <Brain className="h-5 w-5 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">{activeMemories} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversations</CardDescription>
            <CardTitle className="text-2xl flex items-center justify-between">
              {conversations.length}
              <MessageSquare className="h-5 w-5 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Persistent AI chat threads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Duplicate / Conflict Flags</CardDescription>
            <CardTitle className="text-2xl flex items-center justify-between">
              {conflictCount}
              <Activity className="h-5 w-5 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">{relations.length} total memory relations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tokens Tracked</CardDescription>
            <CardTitle className="text-2xl flex items-center justify-between">
              {totalTokens.toLocaleString()}
              <Zap className="h-5 w-5 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">{usage.length} recorded AI calls</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>Distribution of memories by category</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2">
            {CATEGORIES.map((category) => {
              const count = memories.filter((m) => m.category === category).length;
              return (
                <div key={category} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="text-sm capitalize text-slate-700">{category}</span>
                  <Badge variant={count > 0 ? 'default' : 'secondary'}>{count}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>SpaceTimeDB workspace audit log</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {activity.length === 0 ? (
              <p className="text-sm text-slate-500">No recent activity yet.</p>
            ) : (
              activity.slice(0, 12).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{item.action}</p>
                    <p className="text-slate-500">
                      {item.resourceType} {item.resourceId ? `#${item.resourceId}` : ''}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">{item.resourceType}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent AI Usage</CardTitle>
            <CardDescription>Latest model calls and memory extraction usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {usage.length === 0 ? (
              <p className="text-sm text-slate-500">No AI activity yet. Start a chat to see usage logs.</p>
            ) : (
              usage.slice(0, 12).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{entry.model}</p>
                    <p className="text-slate-500">
                      {entry.operation} • {entry.totalTokens} tokens • {entry.latencyMs}ms
                    </p>
                  </div>
                  <Badge variant={entry.status === 'success' ? 'success' : 'destructive'} className="shrink-0">{entry.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
