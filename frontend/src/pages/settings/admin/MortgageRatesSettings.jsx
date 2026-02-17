import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
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
  Info,
  Zap,
  Calendar,
  CheckCircle2,
  Clock,
  Lock,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';

export const MortgageRatesSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingFred, setFetchingFred] = useState(false);
  const [automationStatus, setAutomationStatus] = useState(null);
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
    updated_by: null,
    data_source: null,
    auto_updated: false
  });

  useEffect(() => {
    fetchRates();
    fetchAutomationStatus();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/settings/mortgage-rates');
      if (response.data) {
        setRates(prev => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      console.log('Using default rates');
    } finally {
      setLoading(false);
    }
  };

  const fetchAutomationStatus = async () => {
    try {
      const response = await api.get('/settings/mortgage-rates/status');
      setAutomationStatus(response.data);
    } catch (error) {
      console.log('Could not fetch automation status');
    }
  };

  const handleFetchFred = async () => {
    setFetchingFred(true);
    try {
      const response = await api.post('/settings/mortgage-rates/fetch-fred');
      toast.success(`Rates updated from FRED API! 30yr: ${response.data.conventional_30yr}%`);
      fetchRates();
      fetchAutomationStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to fetch rates from FRED');
    } finally {
      setFetchingFred(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Only save the editable calculation rates
      const calculationRates = {
        property_tax_rate: rates.property_tax_rate,
        insurance_rate: rates.insurance_rate,
        pmi_rate_under_10: rates.pmi_rate_under_10,
        pmi_rate_10_to_20: rates.pmi_rate_10_to_20,
        fha_mip_upfront: rates.fha_mip_upfront,
        fha_mip_annual: rates.fha_mip_annual,
        va_funding_fee: rates.va_funding_fee,
        usda_guarantee_fee: rates.usda_guarantee_fee,
        usda_annual_fee: rates.usda_annual_fee
      };
      await api.post('/settings/mortgage-rates', calculationRates);
      toast.success('Calculation rates saved successfully');
      fetchAutomationStatus();
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

  // Read-only rate input component
  const ReadOnlyRateInput = ({ label, value, highlight }) => (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className={`relative mt-1 ${highlight ? 'ring-2 ring-amber-500/30 rounded-md' : ''}`}>
        <Input
          type="text"
          value={value?.toFixed(3) || '0.000'}
          readOnly
          disabled
          className="pr-8 bg-muted/50 cursor-not-allowed font-mono"
        />
        <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-foreground mb-2">Mortgage Rate Settings</h1>
          <p className="text-muted-foreground">View current rates for the mortgage calculator</p>
        </div>
        <Button 
          onClick={handleFetchFred}
          disabled={fetchingFred || !automationStatus?.fred_api_configured}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          {fetchingFred ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Fetch Latest Rates
        </Button>
      </div>

      {/* FRED API Automation Explanation Card */}
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Automated Rate Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your mortgage rates are automatically kept current using the <strong className="text-foreground">Federal Reserve Economic Data (FRED) API</strong> — the same trusted source used by banks, economists, and financial institutions nationwide.
          </p>
          
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border">
              <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Every 2 Weeks</p>
                <p className="text-xs text-muted-foreground">Rates refresh automatically</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border">
              <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Real Market Data</p>
                <p className="text-xs text-muted-foreground">Direct from Federal Reserve</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border">
              <CheckCircle2 className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Always Accurate</p>
                <p className="text-xs text-muted-foreground">No manual updates needed</p>
              </div>
            </div>
          </div>

          {rates.last_updated && (
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Last updated: {new Date(rates.last_updated).toLocaleString()}</span>
              </div>
              {rates.data_source && (
                <span className="px-2 py-1 rounded-full text-xs bg-green-500/10 text-green-600 border border-green-500/30">
                  Source: {rates.data_source}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interest Rates Section - Read Only */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-lg font-medium">Current Interest Rates</h2>
          <span className="text-xs text-muted-foreground">(Auto-updated from FRED)</span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Conventional Loan Rates */}
          <Card className="bg-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Home className="w-5 h-5 text-blue-500" />
                Conventional Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <ReadOnlyRateInput label="30-Year Fixed" value={rates.conventional_30yr} highlight />
                <ReadOnlyRateInput label="20-Year Fixed" value={rates.conventional_20yr} />
                <ReadOnlyRateInput label="15-Year Fixed" value={rates.conventional_15yr} highlight />
                <ReadOnlyRateInput label="10-Year Fixed" value={rates.conventional_10yr} />
              </div>
            </CardContent>
          </Card>

          {/* FHA Loan Rates */}
          <Card className="bg-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-5 h-5 text-green-500" />
                FHA Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <ReadOnlyRateInput label="30-Year Fixed" value={rates.fha_30yr} />
                <ReadOnlyRateInput label="15-Year Fixed" value={rates.fha_15yr} />
              </div>
            </CardContent>
          </Card>

          {/* VA Loan Rates */}
          <Card className="bg-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="w-5 h-5 text-purple-500" />
                VA Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <ReadOnlyRateInput label="30-Year Fixed" value={rates.va_30yr} />
                <ReadOnlyRateInput label="15-Year Fixed" value={rates.va_15yr} />
              </div>
            </CardContent>
          </Card>

          {/* USDA Loan Rates */}
          <Card className="bg-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="w-5 h-5 text-amber-500" />
                USDA Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <ReadOnlyRateInput label="30-Year Fixed" value={rates.usda_30yr} />
                <div></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Editable Calculation Rates Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-amber-500" />
            <h2 className="text-lg font-medium">Calculation Settings</h2>
            <span className="text-xs text-muted-foreground">(Editable)</span>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="w-5 h-5 text-amber-500" />
              Default Calculation Rates
            </CardTitle>
            <CardDescription>These rates are used for automatic estimates in the calculator and can be customized for your market</CardDescription>
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

            {/* Loan-specific fees */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
              <div>
                <Label className="text-xs">FHA Upfront MIP</Label>
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
                <Label className="text-xs">FHA Annual MIP</Label>
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
              <div>
                <Label className="text-xs">VA Funding Fee</Label>
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
              <div>
                <Label className="text-xs">USDA Guarantee Fee</Label>
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
              <p className="font-medium text-blue-600 mb-1">How It Works</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• <strong>Interest rates</strong> (30yr, 15yr, etc.) are fetched directly from the Federal Reserve and cannot be manually changed</li>
                <li>• <strong>Calculation settings</strong> (tax rates, insurance, PMI, fees) can be customized for your local market</li>
                <li>• FHA, VA, and USDA rates are calculated based on typical market spreads from the conventional rate</li>
                <li>• Click "Fetch Latest Rates" anytime to get the most current data immediately</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MortgageRatesSettings;
