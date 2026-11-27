'use client';

import { useMemo, useState } from 'react';
import {
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  Database,
  RotateCcw,
  Save,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { apiClient, type ModelOption } from '@/lib/api-client';
import type { UserSettingsDto } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';

type SettingsViewProps = {
  settings?: UserSettingsDto;
  models: ModelOption[];
  onSaved: () => Promise<void>;
};

const RESPONSE_STYLES = [
  { id: 'concise', label: 'Concise', description: 'Short, direct answers without extra filler.' },
  { id: 'detailed', label: 'Detailed', description: 'Thorough explanations with full context.' },
  { id: 'technical', label: 'Technical', description: 'Code-focused, precise engineering tone.' },
] as const;

export function SettingsView({ settings, models, onSaved }: SettingsViewProps) {
  const [defaultModel, setDefaultModel] = useState(settings?.defaultModel ?? '');
  const [responseStyle, setResponseStyle] = useState(settings?.responseStyle || 'concise');
  const [autoExtractMemories, setAutoExtractMemories] = useState(settings?.autoExtractMemories ?? true);
  const [timezone, setTimezone] = useState(settings?.timezone || 'UTC');
  const [maxPageSize, setMaxPageSize] = useState(settings?.maxPageSize || 50);
  const [freeOnly, setFreeOnly] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const visibleModels = useMemo(() => {
    if (!freeOnly) return models;
    const free = models.filter(
      (model) => model.id.includes(':free') || (model.pricing?.prompt === '0' && model.pricing?.completion === '0'),
    );
    return free.length > 0 ? free : models;
  }, [models, freeOnly]);

  function handleReset() {
    setDefaultModel(settings?.defaultModel ?? '');
    setResponseStyle(settings?.responseStyle || 'concise');
    setAutoExtractMemories(settings?.autoExtractMemories ?? true);
    setTimezone(settings?.timezone || 'UTC');
    setMaxPageSize(settings?.maxPageSize || 50);
    setFeedback(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await apiClient.settings.update({
        defaultModel,
        responseStyle,
        autoExtractMemories,
        timezone,
        maxPageSize: Number(maxPageSize),
      });
      await onSaved();
      setFeedback({ type: 'success', text: 'Workspace settings saved and synchronized.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Workspace Settings</h2>
          <p className="text-sm text-slate-500">
            Manage your default OpenRouter model, memory extraction behavior, and display preferences.
          </p>
        </div>
        <Badge variant="success" className="gap-1.5 px-3 py-1">
          <Database className="h-3.5 w-3.5" />
          Synced with SpaceTimeDB
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr] items-start">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-sky-600" />
                  <CardTitle>AI Model &amp; Response</CardTitle>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={freeOnly}
                    onChange={(e) => setFreeOnly(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                  Free models only
                </label>
              </div>
              <CardDescription>Choose the default model and tone used for new AI conversations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700">Default OpenRouter Model</label>
                  <span className="text-[11px] text-slate-400">{visibleModels.length} available</span>
                </div>
                <Select value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)} className="h-10">
                  <option value="">Environment Default (openrouter/free)</option>
                  {visibleModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.id}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700">Response Style</label>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {RESPONSE_STYLES.map((style) => {
                    const selected = responseStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setResponseStyle(style.id)}
                        className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          selected
                            ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <p className="text-sm font-medium">{style.label}</p>
                        <p className={`mt-1 text-[11px] leading-snug ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
                          {style.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-sky-600" />
                <CardTitle>Memory &amp; Workspace Preferences</CardTitle>
              </div>
              <CardDescription>Control automatic memory capture, pagination, and regional formatting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-sky-600" />
                    <span className="text-sm font-medium text-slate-900">Auto-Extract Memories</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Automatically identify and save durable facts, preferences, and tasks from chats.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoExtractMemories}
                  onClick={() => setAutoExtractMemories((prev) => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    autoExtractMemories ? 'bg-slate-900' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      autoExtractMemories ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    Timezone
                  </label>
                  <Input
                    list="common-timezones"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="UTC"
                    className="h-10"
                    required
                  />
                  <datalist id="common-timezones">
                    <option value="UTC" />
                    <option value="Asia/Kolkata" />
                    <option value="America/New_York" />
                    <option value="America/Los_Angeles" />
                    <option value="Europe/London" />
                    <option value="Asia/Singapore" />
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Max Page Size (1–200)</label>
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={maxPageSize}
                    onChange={(e) => setMaxPageSize(Number(e.target.value))}
                    className="h-10"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {feedback && (
            <div
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {feedback.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-sky-600" />
                Active Configuration
              </CardTitle>
              <CardDescription>Current saved defaults for your workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Default Model</span>
                <span className="font-medium text-slate-900 truncate max-w-[170px]">
                  {defaultModel || 'Environment default'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Response Style</span>
                <Badge variant="secondary" className="capitalize">
                  {responseStyle}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Auto-Extraction</span>
                <Badge variant={autoExtractMemories ? 'success' : 'outline'}>
                  {autoExtractMemories ? 'Enabled' : 'Paused'}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Timezone</span>
                <span className="font-medium text-slate-900">{timezone}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-500">Page Size</span>
                <span className="font-medium text-slate-900">{maxPageSize} items</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-white border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm text-white">Free-Tier Routing</CardTitle>
              <CardDescription className="text-slate-300">
                Keep &ldquo;Free models only&rdquo; enabled to avoid credit charges on OpenRouter while testing chat and
                memory extraction.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
