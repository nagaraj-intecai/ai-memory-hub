'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { apiClient, type ModelOption } from '@/lib/api-client';
import type { UserSettingsDto } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';

type SettingsViewProps = {
  settings?: UserSettingsDto;
  models: ModelOption[];
  onSaved: () => Promise<void>;
};

export function SettingsView({ settings, models, onSaved }: SettingsViewProps) {
  const [defaultModel, setDefaultModel] = useState(settings?.defaultModel ?? '');
  const [responseStyle, setResponseStyle] = useState(settings?.responseStyle || 'concise');
  const [autoExtractMemories, setAutoExtractMemories] = useState(settings?.autoExtractMemories ?? true);
  const [timezone, setTimezone] = useState(settings?.timezone || 'UTC');
  const [maxPageSize, setMaxPageSize] = useState(settings?.maxPageSize || 50);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.settings.update({
        defaultModel,
        responseStyle,
        autoExtractMemories,
        timezone,
        maxPageSize: Number(maxPageSize),
      });
      await onSaved();
      setMessage('Settings saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Workspace Settings</CardTitle>
        <CardDescription>Configure your default OpenRouter model, extraction behavior, and preferences.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Default AI Model</label>
            <Select value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)}>
              <option value="">Environment Default</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Response Style</label>
              <Select value={responseStyle} onChange={(e) => setResponseStyle(e.target.value)}>
                <option value="concise">Concise</option>
                <option value="detailed">Detailed</option>
                <option value="technical">Technical</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Timezone</label>
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 items-center">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Max Page Size</label>
              <Input
                type="number"
                min={1}
                max={200}
                value={maxPageSize}
                onChange={(e) => setMaxPageSize(Number(e.target.value))}
                required
              />
            </div>

            <label className="flex items-center gap-2 pt-5 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoExtractMemories}
                onChange={(e) => setAutoExtractMemories(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Auto-extract memories from chats
            </label>
          </div>

          {message && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">{message}</p>
          )}

          <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
