import React, { useState, useEffect } from 'react';
import { MapPin, Save, Loader2, Plus, Trash2, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import api from '../lib/api';

export const NeighborhoodsSettingsPage = () => {
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchNeighborhoods();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const fetchNeighborhoods = async () => {
    setLoading(true);
    try {
      const res = await api.get('/neighborhoods');
      const data = Array.isArray(res?.data) ? res.data : [];
      setNeighborhoods(data);
    } catch (error) {
      toast.error('Failed to load neighborhoods');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (neighborhood) => {
    setSaving(neighborhood.id);
    try {
      await api.put(`/neighborhoods/${neighborhood.id}`, {
        name: neighborhood.name,
        slug: neighborhood.slug,
        criteria: neighborhood.criteria,
        enabled: neighborhood.enabled,
        sort_order: neighborhood.sort_order,
      });
      toast.success(`${neighborhood.name} saved`);
      setEditing(null);
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const handleToggle = async (neighborhood) => {
    const updated = { ...neighborhood, enabled: !neighborhood.enabled };
    setNeighborhoods(prev => prev.map(n => n.id === neighborhood.id ? updated : n));
    try {
      await api.put(`/neighborhoods/${neighborhood.id}`, { enabled: updated.enabled });
      toast.success(`${neighborhood.name} ${updated.enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update');
      setNeighborhoods(prev => prev.map(n => n.id === neighborhood.id ? neighborhood : n));
    }
  };

  const updateField = (id, field, value) => {
    setNeighborhoods(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const updateCriteria = (id, key, value) => {
    setNeighborhoods(prev => prev.map(n => {
      if (n.id !== id) return n;
      return { ...n, criteria: { ...n.criteria, [key]: value } };
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="neighborhoods-settings">
      <div>
        <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
          <MapPin className="w-8 h-8" />
          Neighborhoods
        </h1>
        <p className="text-muted-foreground mt-1">Manage neighborhood pages and MLS search criteria</p>
      </div>

      <div className="space-y-4">
        {neighborhoods.map((n) => (
          <Card key={n.id} className={!n.enabled ? 'opacity-60' : ''} data-testid={`neighborhood-${n.slug}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleToggle(n)} className="shrink-0" data-testid={`toggle-${n.slug}`}>
                      {n.enabled ? (
                        <ToggleRight className="w-8 h-8 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                      )}
                    </button>
                    {editing === n.id ? (
                      <Input
                        value={n.name}
                        onChange={(e) => updateField(n.id, 'name', e.target.value)}
                        className="text-lg font-serif font-bold max-w-md"
                      />
                    ) : (
                      <h3 className="text-lg font-serif font-bold">{n.name}</h3>
                    )}
                    <Badge variant="outline" className="text-xs">/neighborhoods/{n.slug}</Badge>
                  </div>

                  {editing === n.id ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pl-11">
                      <div>
                        <Label className="text-xs">Status</Label>
                        <Input
                          value={n.criteria?.status || ''}
                          onChange={(e) => updateCriteria(n.id, 'status', e.target.value)}
                          placeholder="Active"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Subdivision Pattern</Label>
                        <Input
                          value={n.criteria?.subdivision || ''}
                          onChange={(e) => updateCriteria(n.id, 'subdivision', e.target.value)}
                          placeholder="Davis*,Hyde Park*"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Zip Codes (comma separated)</Label>
                        <Input
                          value={Array.isArray(n.criteria?.zip_codes) ? n.criteria.zip_codes.join(', ') : (n.criteria?.zip_codes || '')}
                          onChange={(e) => updateCriteria(n.id, 'zip_codes', e.target.value.split(',').map(z => z.trim()).filter(Boolean))}
                          placeholder="33606, 33609"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Features Pattern</Label>
                        <Input
                          value={n.criteria?.features || ''}
                          onChange={(e) => updateCriteria(n.id, 'features', e.target.value)}
                          placeholder="Boat*,Dock*"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="pl-11 flex flex-wrap gap-2">
                      {n.criteria?.status && <Badge variant="secondary" className="text-xs">Status: {n.criteria.status}</Badge>}
                      {n.criteria?.subdivision && <Badge variant="secondary" className="text-xs">Subdiv: {n.criteria.subdivision}</Badge>}
                      {n.criteria?.zip_codes?.length > 0 && <Badge variant="secondary" className="text-xs">Zips: {n.criteria.zip_codes.join(', ')}</Badge>}
                      {n.criteria?.features && <Badge variant="secondary" className="text-xs">Features: {n.criteria.features}</Badge>}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {editing === n.id ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(null); fetchNeighborhoods(); }}>Cancel</Button>
                      <Button size="sm" onClick={() => handleSave(n)} disabled={saving === n.id} data-testid={`save-${n.slug}`}>
                        {saving === n.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setEditing(n.id)} data-testid={`edit-${n.slug}`}>
                      Edit Criteria
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default NeighborhoodsSettingsPage;
