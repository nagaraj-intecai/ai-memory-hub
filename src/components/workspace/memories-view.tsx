'use client';

import { useEffect, useState } from 'react';
import { Archive, Edit3, GitMerge, History, Plus, Search, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { MemoryDto, MemoryRelationDto, MemorySourceDto, MemoryVersionDto } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';

type MemoriesViewProps = {
  memories: MemoryDto[];
  relations: MemoryRelationDto[];
  onRefresh: () => Promise<void>;
};

const CATEGORIES = ['personal information', 'preferences', 'projects', 'tasks', 'knowledge'];

export function MemoriesView({ memories, relations, onRefresh }: MemoriesViewProps) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('personal information');
  const [importance, setImportance] = useState(75);
  const [changeReason, setChangeReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [details, setDetails] = useState<{
    memory: MemoryDto;
    sources: MemorySourceDto[];
    versions: MemoryVersionDto[];
  } | null>(null);

  const [fromMemoryId, setFromMemoryId] = useState('');
  const [toMemoryId, setToMemoryId] = useState('');
  const [relationType, setRelationType] = useState<'related' | 'supports' | 'contradicts' | 'causes' | 'duplicates'>('duplicates');
  const [strength, setStrength] = useState(0.8);

  const [filtered, setFiltered] = useState(memories);

  useEffect(() => {
    let cancelled = false;
    apiClient.memories
      .list({
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        q: query.trim() || undefined,
        limit: 200,
      })
      .then((result) => {
        if (!cancelled) setFiltered(result.memories);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to filter memories');
      });
    return () => {
      cancelled = true;
    };
  }, [memories, categoryFilter, statusFilter, query]);

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setSummary('');
    setContent('');
    setCategory('personal information');
    setImportance(75);
    setChangeReason('');
  }

  function startEdit(memory: MemoryDto) {
    setEditingId(memory.id);
    setTitle(memory.title);
    setSummary(memory.summary);
    setContent(memory.content);
    setCategory(memory.category);
    setImportance(memory.importance);
    setChangeReason('manual-edit');
  }

  async function handleSaveMemory(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (editingId) {
        await apiClient.memories.update(editingId, {
          title,
          summary,
          content,
          category,
          importance: Number(importance),
          changeReason: changeReason.trim() || 'manual-edit',
        });
      } else {
        await apiClient.memories.create({
          title,
          summary,
          content,
          category,
          importance: Number(importance),
        });
      }
      resetForm();
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save memory');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    setError(null);
    try {
      await apiClient.memories.remove(id);
      if (details?.memory.id === id) setDetails(null);
      if (editingId === id) resetForm();
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete memory');
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive(id: string) {
    setBusy(true);
    setError(null);
    try {
      await apiClient.memories.archive(id);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive memory');
    } finally {
      setBusy(false);
    }
  }

  async function handleInspect(id: string) {
    setError(null);
    try {
      setDetails(await apiClient.memories.details(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memory details');
    }
  }

  async function handleCreateRelation(event: React.FormEvent) {
    event.preventDefault();
    if (!fromMemoryId || !toMemoryId) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.relations.create({
        fromMemoryId,
        toMemoryId,
        relationType,
        strength: Number(strength),
      });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create relation');
    } finally {
      setBusy(false);
    }
  }

  async function handleRelationStatus(id: string, status: 'active' | 'superseded' | 'rejected') {
    setBusy(true);
    setError(null);
    try {
      await apiClient.relations.updateStatus(id, status);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update relation');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Memories ({filtered.length})</CardTitle>
            <CardDescription>Search, filter, inspect versions, or edit stored memories.</CardDescription>
            <div className="grid gap-2 sm:grid-cols-3 pt-2">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  className="pl-9"
                  placeholder="Search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">All categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="active">active</option>
                <option value="archived">archived</option>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[460px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-500">No memories match your filters.</p>
            ) : (
              filtered.map((memory) => (
                <div key={memory.id} className="rounded-lg border border-slate-200 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-medium text-sm text-slate-900">{memory.title}</p>
                      <p className="break-words text-xs text-slate-600">{memory.summary}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                      <Badge variant="outline">{memory.category}</Badge>
                      <Badge variant="secondary">imp {memory.importance}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="min-w-0 break-all text-[11px] text-slate-400">ID: {memory.id} • {memory.status}</span>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleInspect(memory.id)}>
                        <History className="h-3.5 w-3.5" />
                        Versions
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(memory)}>
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      {memory.status === 'active' && (
                        <Button size="sm" variant="ghost" onClick={() => handleArchive(memory.id)} disabled={busy}>
                          <Archive className="h-3.5 w-3.5" />
                          Archive
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(memory.id)} disabled={busy}>
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? `Edit Memory #${editingId}` : 'Create Memory'}</CardTitle>
              <CardDescription>Manually add or update a persistent memory.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveMemory} className="space-y-3">
                <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                <Input placeholder="Short summary" value={summary} onChange={(e) => setSummary(e.target.value)} required />
                <Textarea placeholder="Full memory content" value={content} onChange={(e) => setContent(e.target.value)} required />
                <div className="grid gap-3 grid-cols-2">
                  <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={importance}
                    onChange={(e) => setImportance(Number(e.target.value))}
                    placeholder="Importance (0-100)"
                  />
                </div>
                {editingId && (
                  <Input
                    placeholder="Change reason"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                  />
                )}
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
                    <Plus className="h-4 w-4" />
                    {editingId ? 'Save Changes' : 'Add Memory'}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={resetForm}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {details && (
            <Card>
              <CardHeader>
                <CardTitle>History &amp; Sources — #{details.memory.id}</CardTitle>
                <CardDescription>{details.memory.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-700 mb-1">Versions ({details.versions.length})</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {details.versions.map((v) => (
                      <div key={v.id} className="rounded border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                        v{v.version} ({v.changeReason}) — {v.summary}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-slate-700 mb-1">Sources ({details.sources.length})</p>
                  {details.sources.length === 0 ? (
                    <p className="text-slate-500">Manual entry (no chat source attached).</p>
                  ) : (
                    details.sources.map((s) => (
                      <div key={s.id} className="rounded border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                        {s.sourceType} {s.conversationId ? `• conv #${s.conversationId}` : ''}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="h-4 w-4" />
            Duplicate &amp; Conflict Relations
          </CardTitle>
          <CardDescription>Link related, duplicate, or contradicting memories and resolve their status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreateRelation} className="grid gap-2 md:grid-cols-5">
            <Select value={fromMemoryId} onChange={(e) => setFromMemoryId(e.target.value)} required>
              <option value="">From memory...</option>
              {memories.map((m) => (
                <option key={m.id} value={m.id}>
                  #{m.id} {m.title}
                </option>
              ))}
            </Select>
            <Select value={toMemoryId} onChange={(e) => setToMemoryId(e.target.value)} required>
              <option value="">To memory...</option>
              {memories.map((m) => (
                <option key={m.id} value={m.id}>
                  #{m.id} {m.title}
                </option>
              ))}
            </Select>
            <Select value={relationType} onChange={(e) => setRelationType(e.target.value as typeof relationType)}>
              <option value="duplicates">duplicates</option>
              <option value="contradicts">contradicts</option>
              <option value="supports">supports</option>
              <option value="causes">causes</option>
              <option value="related">related</option>
            </Select>
            <Input
              type="number"
              step="0.1"
              min={0}
              max={1}
              value={strength}
              onChange={(e) => setStrength(Number(e.target.value))}
            />
            <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
              Link Memories
            </Button>
          </form>

          <div className="space-y-2">
            {relations.length === 0 ? (
              <p className="text-sm text-slate-500">No memory relations recorded yet.</p>
            ) : (
              relations.map((rel) => (
                <div key={rel.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs">
                  <div>
                    <span className="font-medium">#{rel.fromMemoryId}</span>{' '}
                    <Badge variant={rel.relationType === 'contradicts' || rel.relationType === 'duplicates' ? 'warning' : 'secondary'}>
                      {rel.relationType}
                    </Badge>{' '}
                    <span className="font-medium">#{rel.toMemoryId}</span>{' '}
                    <span className="text-slate-500">• strength {rel.strength} • {rel.status}</span>
                  </div>
                  <div className="flex gap-1">
                    {(['active', 'superseded', 'rejected'] as const).map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={rel.status === status ? 'default' : 'outline'}
                        onClick={() => handleRelationStatus(rel.id, status)}
                        disabled={busy}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
