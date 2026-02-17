import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  Calculator, 
  Save, 
  Loader2, 
  RefreshCw,
  Home,
  Building2,
  Shield,
  Landmark,
  Percent,
  DollarSign,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export const MortgageRatesSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rates, setRates] = useState({
    // Default interest rates by loan type
    conventional_30yr: 6.875,
    conventional_20yr: 6.625,
    conventional_15yr: 6.125,
    conventional_10yr: 5.875,
    fha_30yr: 6.500,
    fha_15yr: 5.875,
    va_30yr: 6.250,
    va_15yr: 5.750,
    usda_30yr: 6.375,
    // Default calculations
    property_tax_rate: 1.1,
    insurance_rate: 0.35,
    pmi_rate_under_10: 1.0,
    pmi_rate_10_to_20: 0.5,
    fha_mip_upfront: 1.75,
    fha_mip_annual: 0.85,
    va_funding_fee: 2.15,
    usda_guarantee_fee: 1.0,
    usda_annual_fee: 0.35,
    // Last updated
    last_updated: null,
    updated_by: null
  });

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/settings/mortgage-rates');
      if (response.data) {
        setRates(prev => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      // If no settings exist yet, use defaults
      console.log('Using default rates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/settings/mortgage-rates', rates);
      toast.success('Mortgage rates updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save rates');
    } finally {
      setSaving(false);
    }
  };

  const updateRate = (key, value) => {
    setRates(prev => ({
      ...prev,
      [key]: parseFloat(value) || 0
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-foreground mb-2">Mortgage Rate Settings</h1>
          <p className="text-muted-foreground">Configure default rates for the mortgage calculator</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchRates}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {rates.last_updated && (
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date(rates.last_updated).toLocaleString()}
          {rates.updated_by && ` by ${rates.updated_by}`}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Conventional Loan Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-500" />
              Conventional Loan Rates
            </CardTitle>
            <CardDescription>Traditional mortgage interest rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">30-Year Fixed</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.125"
                    value={rates.conventional_30yr}
                    onChange={(e) => updateRate('conventional_30yr', e.target.value)}
                    className="pr-8"
                  />
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div>
                <Label className="text-xs">20-Year Fixed</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.125"
                    value={rates.conventional_20yr}
                    onChange={(e) => updateRate('conventional_20yr', e.target.value)}
                    className="pr-8"
                  />
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div>
                <Label className="text-xs">15-Year Fixed</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.125"
                    value={rates.conventional_15yr}
                    onChange={(e) => updateRate('conventional_15yr', e.target.value)}
                    className="pr-8"
                  />
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div>
                <Label className="text-xs">10-Year Fixed</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.125"
                    value={rates.conventional_10yr}
                    onChange={(e) => updateRate('conventional_10yr', e.target.value)}
                    className="pr-8"
                  />
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FHA Loan Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-500" />
              FHA Loan Rates
            </CardTitle>
            <CardDescription>Government-backed FHA loan rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">30-Year Fixed</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.125"
                    value={rates.fha_30yr}
                    onChange={(e) => updateRate('fha_30yr', e.target.value)}
                    className="pr-8"
                  />
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div>
                <Label className="text-xs">15-Year Fixed</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.125"
                    value={rates.fha_15yr}
                    onChange={(e) => updateRate('fha_15yr', e.target.value)}
                    className="pr-8"
                  />
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">FHA Mortgage Insurance</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Upfront MIP</Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      step="0.25"
                      value={rates.fha_mip_upfront}
                      onChange={(e) => updateRate('fha_mip_upfront', e.target.value)}
                      className="pr-8"
                    />
                    <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Annual MIP</Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      step="0.05"
                      value={rates.fha_mip_annual}
                      onChange={(e) => updateRate('fha_mip_annual', e.target.value)}
                      className="pr-8"
                    />
                    <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VA Loan Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-500" />
              VA Loan Rates
            </CardTitle>
            <CardDescription>Veterans Affairs loan rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">30-Year Fixed</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.125"
                    value={rates.va_30yr}
                    onChange={(e) => updateRate('va_30yr', e.target.value)}
                    className="pr-8"
                  />
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div>
                <Label className="text-xs">15-Year Fixed</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.125"
                    value={rates.va_15yr}
                    onChange={(e) => updateRate('va_15yr', e.target.value)}
                    className="pr-8"
                  />
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
            <div className="pt-2 border-t">
              <div>
                <Label className="text-xs">VA Funding Fee (first-time, &lt;5% down)</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.05"
                    value={rates.va_funding_fee}
                    onChange={(e) => updateRate('va_funding_fee', e.target.value)}
                    className="pr-8"
                  />
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* USDA Loan Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-amber-500" />
              USDA Loan Rates
            </CardTitle>
            <CardDescription>Rural development loan rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">30-Year Fixed</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  step="0.125"
                  value={rates.usda_30yr}
                  onChange={(e) => updateRate('usda_30yr', e.target.value)}
                  className="pr-8"
                />
                <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">USDA Guarantee Fees</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Upfront Fee</Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      step="0.25"
                      value={rates.usda_guarantee_fee}
                      onChange={(e) => updateRate('usda_guarantee_fee', e.target.value)}
                      className="pr-8"
                    />
                    <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Annual Fee</Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      step="0.05"
                      value={rates.usda_annual_fee}
                      onChange={(e) => updateRate('usda_annual_fee', e.target.value)}
                      className="pr-8"
                    />
                    <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default Calculations */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-500" />
              Default Calculation Rates
            </CardTitle>
            <CardDescription>These rates are used for automatic estimates in the calculator</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">Property Tax Rate (Annual)</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.1"
                    value={rates.property_tax_rate}
                    onChange={(e) => updateRate('property_tax_rate', e.target.value)}
                    className="pr-8"
                  />
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">% of home value</p>
              </div>
              <div>
                <Label className="text-xs">Insurance Rate (Annual)</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.05"
                    value={rates.insurance_rate}
                    onChange={(e) => updateRate('insurance_rate', e.target.value)}
                    className="pr-8"
                  />
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">% of home value</p>
              </div>
              <div>
                <Label className="text-xs">PMI Rate (&lt;10% down)</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.1"
                    value={rates.pmi_rate_under_10}
                    onChange={(e) => updateRate('pmi_rate_under_10', e.target.value)}
                    className="pr-8"
                  />
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Annual % of loan</p>
              </div>
              <div>
                <Label className="text-xs">PMI Rate (10-20% down)</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.1"
                    value={rates.pmi_rate_10_to_20}
                    onChange={(e) => updateRate('pmi_rate_10_to_20', e.target.value)}
                    className="pr-8"
                  />
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Annual % of loan</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-600 mb-1">Rate Update Tips</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Update rates weekly or when market conditions change significantly</li>
                <li>• Check Freddie Mac, Bankrate, or your preferred lender for current rates</li>
                <li>• Rates shown are used as defaults in the public mortgage calculator</li>
                <li>• Users can still adjust rates manually in the calculator</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MortgageRatesSettings;
