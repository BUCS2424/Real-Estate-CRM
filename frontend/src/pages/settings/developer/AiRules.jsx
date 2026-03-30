import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Plus, Save, Trash2, ExternalLink } from 'lucide-react';
import { settingsAPI } from '../../../lib/api';
import { toast } from 'sonner';

export const AiRules = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sourceFile, setSourceFile] = useState('/app/AGENT_RULES.md');

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await settingsAPI.getAiRules();
      setRules(Array.isArray(res.data?.rules) ? res.data.rules : []);
      setSourceFile(res.data?.source_file || '/app/AGENT_RULES.md');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load AI rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const updateRule = (index, value) => {
    const next = [...rules];
    next[index] = value;
    setRules(next);
  };

  const addRule = () => {
    setRules((prev) => [...prev, '']);
  };

  const removeRule = (index) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const saveRules = async () => {
    setSaving(true);
    try {
      const cleaned = rules.map((rule) => (rule || '').trim()).filter(Boolean);
      await settingsAPI.updateAiRules({ rules: cleaned });
      setRules(cleaned);
      toast.success('AI rules saved');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save AI rules');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="ai-rules-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ai Rules</h1>
          <p className="text-muted-foreground">Edit the mandatory rule list used by agents.</p>
        </div>
        <a
          href="/api/settings/ai-rules/file"
          target="_blank"
          rel="noreferrer"
          className="inline-flex"
          data-testid="ai-rules-open-file-link"
        >
          <Button variant="outline">
            Open AGENT_RULES.md
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rule List</CardTitle>
          <CardDescription>
            Source file: <span className="font-mono text-xs">{sourceFile}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground" data-testid="ai-rules-loading">Loading rules...</p>
          ) : (
            <>
              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <div key={`ai-rule-${index}`} className="flex items-start gap-2" data-testid={`ai-rule-row-${index}`}>
                    <Label className="w-8 pt-2 text-xs text-muted-foreground">{index + 1}.</Label>
                    <Input
                      value={rule}
                      onChange={(e) => updateRule(index, e.target.value)}
                      data-testid={`ai-rule-input-${index}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRule(index)}
                      data-testid={`ai-rule-remove-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={addRule} data-testid="ai-rule-add-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Rule
                </Button>
                <Button onClick={saveRules} disabled={saving} data-testid="ai-rule-save-button">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Rules'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AiRules;