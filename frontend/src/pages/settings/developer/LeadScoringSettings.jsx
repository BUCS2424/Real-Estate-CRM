import React, { useState, useEffect, useCallback } from 'react';
import { 
  Target, 
  Plus, 
  Edit2, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Building2,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  Settings,
  Play
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../components/ui/collapsible';
import { toast } from 'sonner';
import { leadScoringAPI } from '../../../lib/api';

const CATEGORY_LABELS = {
  contact_info: 'Contact Information',
  property_details: 'Property Details',
  value_info: 'Value Information',
  location: 'Location',
  owner_info: 'Owner Information',
  source: 'Lead Source',
  preferences: 'Buyer Preferences',
  qualification: 'Qualification',
  engagement: 'Engagement'
};

const CATEGORY_COLORS = {
  contact_info: 'bg-blue-500/20 text-blue-600',
  property_details: 'bg-green-500/20 text-green-600',
  value_info: 'bg-amber-500/20 text-amber-600',
  location: 'bg-purple-500/20 text-purple-600',
  owner_info: 'bg-pink-500/20 text-pink-600',
  source: 'bg-gray-500/20 text-gray-600',
  preferences: 'bg-cyan-500/20 text-cyan-600',
  qualification: 'bg-emerald-500/20 text-emerald-600',
  engagement: 'bg-orange-500/20 text-orange-600'
};

export const LeadScoringSettings = () => {
  const [activeTab, setActiveTab] = useState('property_seller');
  const [rules, setRules] = useState([]);
  const [fields, setFields] = useState({});
  const [operators, setOperators] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modal states
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  
  // New rule form
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    lead_type: 'property_seller',
    category: '',
    conditions: [{ field: '', operator: 'exists', value: '' }],
    points: 10,
    is_active: true,
    ai_verified: true,
    priority: 5
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, fieldsRes, operatorsRes, statsRes] = await Promise.all([
        leadScoringAPI.getRules(activeTab),
        leadScoringAPI.getFields(),
        leadScoringAPI.getOperators(),
        leadScoringAPI.getStats()
      ]);
      setRules(rulesRes.data.rules || []);
      setFields(fieldsRes.data || {});
      setOperators(operatorsRes.data || []);
      setStats(statsRes.data || null);
    } catch (error) {
      toast.error('Failed to load scoring rules');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveRule = async () => {
    if (!ruleForm.name.trim()) {
      toast.error('Rule name is required');
      return;
    }
    if (!ruleForm.category) {
      toast.error('Please select a category');
      return;
    }
    if (!ruleForm.conditions.some(c => c.field)) {
      toast.error('At least one condition is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...ruleForm,
        conditions: ruleForm.conditions.filter(c => c.field)
      };

      if (editingRule) {
        await leadScoringAPI.updateRule(editingRule.id, payload);
        toast.success('Rule updated');
      } else {
        await leadScoringAPI.createRule(payload);
        toast.success('Rule created');
      }
      
      setShowRuleModal(false);
      setEditingRule(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      await leadScoringAPI.deleteRule(ruleId);
      toast.success('Rule deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  const handleToggleRule = async (ruleId) => {
    try {
      await leadScoringAPI.toggleRule(ruleId);
      fetchData();
    } catch (error) {
      toast.error('Failed to toggle rule');
    }
  };

  const handleSeedDefaults = async () => {
    if (!window.confirm('This will add default scoring rules. Continue?')) return;
    
    try {
      const res = await leadScoringAPI.seedDefaults();
      toast.success(res.data.message);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to seed defaults');
    }
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      description: rule.description || '',
      lead_type: rule.lead_type,
      category: rule.category,
      conditions: rule.conditions.length > 0 ? rule.conditions : [{ field: '', operator: 'exists', value: '' }],
      points: rule.points,
      is_active: rule.is_active,
      ai_verified: rule.ai_verified,
      priority: rule.priority || 5
    });
    setShowRuleModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    setEditingRule(null);
    setShowRuleModal(true);
  };

  const resetForm = () => {
    setRuleForm({
      name: '',
      description: '',
      lead_type: activeTab,
      category: '',
      conditions: [{ field: '', operator: 'exists', value: '' }],
      points: 10,
      is_active: true,
      ai_verified: true,
      priority: 5
    });
  };

  const addCondition = () => {
    setRuleForm(prev => ({
      ...prev,
      conditions: [...prev.conditions, { field: '', operator: 'exists', value: '' }]
    }));
  };

  const removeCondition = (index) => {
    setRuleForm(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const updateCondition = (index, key, value) => {
    setRuleForm(prev => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => i === index ? { ...c, [key]: value } : c)
    }));
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Group rules by category
  const rulesByCategory = rules.reduce((acc, rule) => {
    const cat = rule.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(rule);
    return acc;
  }, {});

  // Get fields for current lead type
  const currentFields = fields[activeTab] || {};

  // Get operator that needs value
  const operatorNeedsValue = (op) => {
    const opDef = operators.find(o => o.value === op);
    return opDef?.needs_value ?? true;
  };

  return (
    <div className="space-y-6" data-testid="lead-scoring-settings">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Lead Scoring Rules</h1>
          <p className="text-muted-foreground mt-1">
            Configure scoring rules to automatically rate incoming leads based on their data quality
          </p>
        </div>
        <div className="flex gap-2">
          {stats && stats.rules.total === 0 && (
            <Button variant="outline" onClick={handleSeedDefaults} data-testid="seed-defaults-btn">
              <Sparkles className="w-4 h-4 mr-2" />
              Load Default Rules
            </Button>
          )}
          <Button onClick={openCreateModal} className="bg-amber-500 hover:bg-amber-600 text-black" data-testid="create-rule-btn">
            <Plus className="w-4 h-4 mr-2" />
            Create Rule
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Target className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.rules.total}</p>
                  <p className="text-xs text-muted-foreground">Total Rules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.rules.active}</p>
                  <p className="text-xs text-muted-foreground">Active Rules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Building2 className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.scored_leads.property_seller}</p>
                  <p className="text-xs text-muted-foreground">Scored Property Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.scored_leads.buyer}</p>
                  <p className="text-xs text-muted-foreground">Scored Buyer Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for Lead Types */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="property_seller" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
            <Building2 className="w-4 h-4 mr-2" />
            Property / Seller Leads
          </TabsTrigger>
          <TabsTrigger value="buyer" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
            <Users className="w-4 h-4 mr-2" />
            Buyer Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="property_seller" className="mt-6">
          <RulesList 
            rulesByCategory={rulesByCategory}
            expandedCategories={expandedCategories}
            toggleCategory={toggleCategory}
            openEditModal={openEditModal}
            handleDeleteRule={handleDeleteRule}
            handleToggleRule={handleToggleRule}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="buyer" className="mt-6">
          <RulesList 
            rulesByCategory={rulesByCategory}
            expandedCategories={expandedCategories}
            toggleCategory={toggleCategory}
            openEditModal={openEditModal}
            handleDeleteRule={handleDeleteRule}
            handleToggleRule={handleToggleRule}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Rule Modal */}
      <Dialog open={showRuleModal} onOpenChange={setShowRuleModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Scoring Rule' : 'Create Scoring Rule'}</DialogTitle>
            <DialogDescription>
              Define conditions that will award points to leads when matched
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Rule Name *</Label>
                <Input
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Has Owner Email"
                  data-testid="rule-name-input"
                />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Input
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of what this rule checks"
                />
              </div>
              <div>
                <Label>Category *</Label>
                <Select 
                  value={ruleForm.category} 
                  onValueChange={(val) => setRuleForm(prev => ({ ...prev, category: val }))}
                >
                  <SelectTrigger data-testid="category-select">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(currentFields).map(([key, cat]) => (
                      <SelectItem key={key} value={key}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Points</Label>
                <Input
                  type="number"
                  value={ruleForm.points}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                  placeholder="10"
                  data-testid="points-input"
                />
                <p className="text-xs text-muted-foreground mt-1">Use negative for penalty</p>
              </div>
            </div>

            {/* Conditions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Conditions (all must match)</Label>
                <Button variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Condition
                </Button>
              </div>
              <div className="space-y-3">
                {ruleForm.conditions.map((condition, idx) => (
                  <div key={idx} className="flex gap-2 items-start p-3 rounded-lg bg-muted/50 border">
                    <div className="flex-1">
                      <Label className="text-xs">Field</Label>
                      <Select
                        value={condition.field}
                        onValueChange={(val) => updateCondition(idx, 'field', val)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {ruleForm.category && currentFields[ruleForm.category]?.fields?.map(f => (
                            <SelectItem key={f.field} value={f.field}>{f.label}</SelectItem>
                          ))}
                          {!ruleForm.category && (
                            <SelectItem value="__placeholder__" disabled>Select a category first</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-40">
                      <Label className="text-xs">Operator</Label>
                      <Select
                        value={condition.operator}
                        onValueChange={(val) => updateCondition(idx, 'operator', val)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {operators.map(op => (
                            <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {operatorNeedsValue(condition.operator) && (
                      <div className="w-32">
                        <Label className="text-xs">Value</Label>
                        <Input
                          className="h-9"
                          value={condition.value || ''}
                          onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                          placeholder="Value"
                        />
                      </div>
                    )}
                    {ruleForm.conditions.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="mt-5 h-9 w-9 text-destructive"
                        onClick={() => removeCondition(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center gap-6 p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2">
                <Switch
                  checked={ruleForm.is_active}
                  onCheckedChange={(checked) => setRuleForm(prev => ({ ...prev, is_active: checked }))}
                  data-testid="is-active-switch"
                />
                <Label className="text-sm">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={ruleForm.ai_verified}
                  onCheckedChange={(checked) => setRuleForm(prev => ({ ...prev, ai_verified: checked }))}
                />
                <Label className="text-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  AI Verify Data
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Priority:</Label>
                <Input
                  type="number"
                  className="w-16 h-8"
                  value={ruleForm.priority}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  min={0}
                  max={100}
                />
              </div>
            </div>

            {/* AI Verification Info */}
            {ruleForm.ai_verified && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <Info className="w-4 h-4 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-600">AI Verification Enabled</p>
                  <p className="text-muted-foreground">
                    The AI will validate this data (e.g., email format, phone validity) before scoring.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowRuleModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveRule} 
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-black"
              data-testid="save-rule-btn"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Rules List Component
const RulesList = ({ 
  rulesByCategory, 
  expandedCategories, 
  toggleCategory, 
  openEditModal, 
  handleDeleteRule, 
  handleToggleRule,
  loading 
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (Object.keys(rulesByCategory).length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Scoring Rules</h3>
          <p className="text-muted-foreground mb-4">
            Create rules to automatically score incoming leads based on their data
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(rulesByCategory).map(([category, categoryRules]) => (
        <Collapsible 
          key={category} 
          open={expandedCategories[category] !== false}
          onOpenChange={() => toggleCategory(category)}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedCategories[category] !== false ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                    <Badge className={CATEGORY_COLORS[category] || 'bg-gray-500/20 text-gray-600'}>
                      {CATEGORY_LABELS[category] || category}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {categoryRules.length} rule{categoryRules.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Max: +{categoryRules.filter(r => r.is_active && r.points > 0).reduce((sum, r) => sum + r.points, 0)} pts
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {categoryRules.map(rule => (
                    <div 
                      key={rule.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        rule.is_active ? 'bg-card hover:bg-muted/50' : 'bg-muted/30 opacity-60'
                      }`}
                      data-testid={`rule-${rule.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleRule(rule.id)}
                          className="text-muted-foreground hover:text-foreground"
                          data-testid={`toggle-${rule.id}`}
                        >
                          {rule.is_active ? (
                            <ToggleRight className="w-6 h-6 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{rule.name}</span>
                            {rule.ai_verified && (
                              <Sparkles className="w-3 h-3 text-amber-500" title="AI Verified" />
                            )}
                          </div>
                          {rule.description && (
                            <p className="text-sm text-muted-foreground">{rule.description}</p>
                          )}
                          <div className="flex gap-2 mt-1">
                            {rule.conditions?.map((c, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {c.field} {c.operator} {c.value || ''}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={rule.points >= 0 ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}>
                          {rule.points >= 0 ? '+' : ''}{rule.points} pts
                        </Badge>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => openEditModal(rule)}
                            data-testid={`edit-${rule.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteRule(rule.id)}
                            data-testid={`delete-${rule.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
};

export default LeadScoringSettings;
