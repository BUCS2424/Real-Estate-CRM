import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { 
  Calculator, 
  Home, 
  DollarSign, 
  Percent, 
  Calendar,
  PieChart,
  FileText,
  Mail,
  ChevronDown,
  ChevronUp,
  Info,
  Building2,
  Shield,
  Landmark,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

// Loan type configurations
const LOAN_TYPES = {
  conventional: {
    name: 'Conventional',
    icon: Home,
    color: 'bg-blue-500',
    minDownPayment: 3,
    defaultDownPayment: 20,
    pmiRequired: true,
    pmiThreshold: 20,
    description: 'Traditional mortgage with competitive rates',
    maxDTI: 45
  },
  fha: {
    name: 'FHA',
    icon: Building2,
    color: 'bg-green-500',
    minDownPayment: 3.5,
    defaultDownPayment: 3.5,
    pmiRequired: true,
    pmiThreshold: 100, // Always requires MIP
    description: 'Government-backed, lower down payment',
    maxDTI: 50,
    upfrontMIP: 1.75, // Percentage of loan amount
    annualMIP: 0.85 // Annual percentage
  },
  va: {
    name: 'VA',
    icon: Shield,
    color: 'bg-purple-500',
    minDownPayment: 0,
    defaultDownPayment: 0,
    pmiRequired: false,
    description: 'For veterans, no down payment required',
    maxDTI: 60,
    fundingFee: 2.15 // Can be financed
  },
  usda: {
    name: 'USDA',
    icon: Landmark,
    color: 'bg-amber-500',
    minDownPayment: 0,
    defaultDownPayment: 0,
    pmiRequired: true,
    description: 'Rural areas, no down payment',
    maxDTI: 41,
    guaranteeFee: 1.0,
    annualFee: 0.35
  }
};

const LOAN_TERMS = [
  { years: 30, label: '30-Year Fixed' },
  { years: 20, label: '20-Year Fixed' },
  { years: 15, label: '15-Year Fixed' },
  { years: 10, label: '10-Year Fixed' }
];

export const MortgageCalculator = ({ 
  propertyPrice = 0, 
  propertyAddress = '',
  propertyTaxRate = 1.1, // Default annual tax rate as percentage
  embedded = false,
  onEmailResults = null 
}) => {
  // Rates from backend
  const [ratesConfig, setRatesConfig] = useState(null);
  
  // Basic inputs
  const [homePrice, setHomePrice] = useState(propertyPrice || 350000);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(6.875);
  const [loanTermYears, setLoanTermYears] = useState(30);
  const [loanType, setLoanType] = useState('conventional');
  
  // Additional costs
  const [annualPropertyTax, setAnnualPropertyTax] = useState(0);
  const [annualInsurance, setAnnualInsurance] = useState(0);
  const [monthlyHOA, setMonthlyHOA] = useState(0);
  
  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAmortization, setShowAmortization] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [scenarios, setScenarios] = useState([]);

  // Fetch rates from backend on mount
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/settings/mortgage-rates`);
        if (response.ok) {
          const data = await response.json();
          setRatesConfig(data);
          // Set initial interest rate based on loan type and term
          const rateKey = `${loanType}_${loanTermYears}yr`;
          if (data[rateKey]) {
            setInterestRate(data[rateKey]);
          }
        }
      } catch (error) {
        console.log('Using default rates');
      }
    };
    fetchRates();
  }, []);

  // Update interest rate when loan type or term changes
  useEffect(() => {
    if (ratesConfig) {
      const rateKey = `${loanType}_${loanTermYears}yr`;
      if (ratesConfig[rateKey]) {
        setInterestRate(ratesConfig[rateKey]);
      }
    }
  }, [loanType, loanTermYears, ratesConfig]);

  // Update home price when property price changes
  useEffect(() => {
    if (propertyPrice > 0) {
      setHomePrice(propertyPrice);
    }
  }, [propertyPrice]);

  // Auto-calculate property tax and insurance estimates
  useEffect(() => {
    const taxRate = ratesConfig?.property_tax_rate || propertyTaxRate;
    const insuranceRate = ratesConfig?.insurance_rate || 0.35;
    // Estimate property tax
    setAnnualPropertyTax(Math.round(homePrice * (taxRate / 100)));
    // Estimate homeowners insurance
    setAnnualInsurance(Math.round(homePrice * (insuranceRate / 100)));
  }, [homePrice, propertyTaxRate, ratesConfig]);

  // Set default down payment based on loan type
  useEffect(() => {
    const loanConfig = LOAN_TYPES[loanType];
    if (downPaymentPercent < loanConfig.minDownPayment) {
      setDownPaymentPercent(loanConfig.defaultDownPayment);
    }
  }, [loanType]);

  // Calculate all mortgage details
  const calculations = useMemo(() => {
    const loanConfig = LOAN_TYPES[loanType];
    const downPaymentAmount = homePrice * (downPaymentPercent / 100);
    let loanAmount = homePrice - downPaymentAmount;
    
    // Add any financed fees
    if (loanType === 'fha' && loanConfig.upfrontMIP) {
      loanAmount += loanAmount * (loanConfig.upfrontMIP / 100);
    }
    if (loanType === 'va' && loanConfig.fundingFee && downPaymentPercent < 5) {
      loanAmount += (homePrice - downPaymentAmount) * (loanConfig.fundingFee / 100);
    }
    if (loanType === 'usda' && loanConfig.guaranteeFee) {
      loanAmount += (homePrice - downPaymentAmount) * (loanConfig.guaranteeFee / 100);
    }
    
    // Monthly interest rate
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTermYears * 12;
    
    // Principal & Interest (P&I) using standard amortization formula
    let monthlyPI = 0;
    if (monthlyRate > 0) {
      monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                  (Math.pow(1 + monthlyRate, numPayments) - 1);
    } else {
      monthlyPI = loanAmount / numPayments;
    }
    
    // Property Tax (monthly)
    const monthlyTax = annualPropertyTax / 12;
    
    // Insurance (monthly)
    const monthlyInsurance = annualInsurance / 12;
    
    // PMI/MIP calculation
    let monthlyPMI = 0;
    if (loanType === 'conventional' && downPaymentPercent < 20) {
      // PMI typically 0.5% to 1.5% of loan amount annually
      const pmiRate = downPaymentPercent < 10 ? 1.0 : 0.5;
      monthlyPMI = (loanAmount * (pmiRate / 100)) / 12;
    } else if (loanType === 'fha') {
      monthlyPMI = (loanAmount * (loanConfig.annualMIP / 100)) / 12;
    } else if (loanType === 'usda') {
      monthlyPMI = (loanAmount * (loanConfig.annualFee / 100)) / 12;
    }
    
    // Total monthly payment
    const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance + monthlyPMI + monthlyHOA;
    
    // Total cost over life of loan
    const totalInterest = (monthlyPI * numPayments) - loanAmount;
    const totalCost = totalMonthly * numPayments;
    
    // Generate amortization schedule (first 12 months + yearly summaries)
    const amortization = [];
    let balance = loanAmount;
    let totalPrincipalPaid = 0;
    let totalInterestPaid = 0;
    
    for (let month = 1; month <= numPayments; month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPI - interestPayment;
      balance -= principalPayment;
      totalPrincipalPaid += principalPayment;
      totalInterestPaid += interestPayment;
      
      // Store monthly data for first year, then yearly summaries
      if (month <= 12 || month % 12 === 0) {
        amortization.push({
          month,
          year: Math.ceil(month / 12),
          payment: monthlyPI,
          principal: principalPayment,
          interest: interestPayment,
          balance: Math.max(0, balance),
          totalPrincipal: totalPrincipalPaid,
          totalInterest: totalInterestPaid
        });
      }
    }
    
    return {
      homePrice,
      downPaymentAmount,
      downPaymentPercent,
      loanAmount,
      interestRate,
      loanTermYears,
      monthlyPI,
      monthlyTax,
      monthlyInsurance,
      monthlyPMI,
      monthlyHOA,
      totalMonthly,
      totalInterest,
      totalCost,
      amortization,
      loanType,
      loanConfig
    };
  }, [homePrice, downPaymentPercent, interestRate, loanTermYears, loanType, annualPropertyTax, annualInsurance, monthlyHOA]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Add scenario for comparison
  const addScenario = () => {
    setScenarios([...scenarios, { ...calculations, id: Date.now() }]);
    toast.success('Scenario added for comparison');
  };

  // Generate printable flyer
  const generateFlyer = () => {
    const flyerContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Estimate - ${propertyAddress || 'Property'}</title>
        <style>
          body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a2744; }
          .header { background: linear-gradient(135deg, #1a2744, #2a3a5c); color: #d4a646; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e5e5; }
          .price { font-size: 36px; color: #d4a646; font-weight: bold; text-align: center; margin: 20px 0; }
          .payment-box { background: #f8f4e8; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .payment-amount { font-size: 48px; color: #1a2744; font-weight: bold; }
          .payment-label { color: #666; font-size: 14px; }
          .breakdown { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .breakdown-item { display: flex; justify-content: space-between; padding: 10px; background: #f9f9f9; border-radius: 4px; }
          .loan-details { margin: 20px 0; padding: 20px; background: #1a2744; color: white; border-radius: 8px; }
          .loan-details h3 { color: #d4a646; margin-top: 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Hidden Haven Realty</h1>
          <p>Payment Estimate</p>
        </div>
        <div class="content">
          ${propertyAddress ? `<h2 style="text-align: center; color: #1a2744;">${propertyAddress}</h2>` : ''}
          <div class="price">List Price: ${formatCurrency(calculations.homePrice)}</div>
          
          <div class="payment-box">
            <div class="payment-label">Estimated Monthly Payment</div>
            <div class="payment-amount">${formatCurrency(calculations.totalMonthly)}</div>
            <div class="payment-label">${calculations.loanConfig.name} | ${calculations.loanTermYears}-Year Fixed | ${calculations.interestRate}% APR</div>
          </div>
          
          <h3>Monthly Payment Breakdown</h3>
          <div class="breakdown">
            <div class="breakdown-item"><span>Principal & Interest</span><span>${formatCurrency(calculations.monthlyPI)}</span></div>
            <div class="breakdown-item"><span>Property Tax</span><span>${formatCurrency(calculations.monthlyTax)}</span></div>
            <div class="breakdown-item"><span>Homeowners Insurance</span><span>${formatCurrency(calculations.monthlyInsurance)}</span></div>
            ${calculations.monthlyPMI > 0 ? `<div class="breakdown-item"><span>Mortgage Insurance</span><span>${formatCurrency(calculations.monthlyPMI)}</span></div>` : ''}
            ${calculations.monthlyHOA > 0 ? `<div class="breakdown-item"><span>HOA Fees</span><span>${formatCurrency(calculations.monthlyHOA)}</span></div>` : ''}
          </div>
          
          <div class="loan-details">
            <h3>Loan Details</h3>
            <p>Down Payment: ${formatCurrency(calculations.downPaymentAmount)} (${calculations.downPaymentPercent}%)</p>
            <p>Loan Amount: ${formatCurrency(calculations.loanAmount)}</p>
            <p>Interest Rate: ${calculations.interestRate}% APR</p>
            <p>Loan Term: ${calculations.loanTermYears} Years</p>
          </div>
        </div>
        <div class="footer">
          <p>This is an estimate only. Actual payments may vary based on final loan terms, taxes, and insurance.</p>
          <p>© ${new Date().getFullYear()} Hidden Haven Realty | Generated on ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(flyerContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Payment breakdown for pie chart visualization
  const paymentBreakdown = [
    { label: 'Principal & Interest', amount: calculations.monthlyPI, color: '#1a2744' },
    { label: 'Property Tax', amount: calculations.monthlyTax, color: '#d4a646' },
    { label: 'Insurance', amount: calculations.monthlyInsurance, color: '#4a90a4' },
    ...(calculations.monthlyPMI > 0 ? [{ label: 'Mortgage Insurance', amount: calculations.monthlyPMI, color: '#e57373' }] : []),
    ...(calculations.monthlyHOA > 0 ? [{ label: 'HOA', amount: calculations.monthlyHOA, color: '#81c784' }] : [])
  ];

  return (
    <Card className={embedded ? 'border-amber-500/30' : ''}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calculator className="w-6 h-6 text-amber-500" />
          Mortgage Calculator
        </CardTitle>
        {propertyAddress && (
          <CardDescription>{propertyAddress}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Loan Type Selector */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Loan Type</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(LOAN_TYPES).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setLoanType(key)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    loanType === key 
                      ? 'border-amber-500 bg-amber-500/10' 
                      : 'border-muted hover:border-amber-500/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 mx-auto mb-1 ${loanType === key ? 'text-amber-500' : 'text-muted-foreground'}`} />
                  <p className={`text-xs font-medium ${loanType === key ? 'text-amber-500' : ''}`}>{config.name}</p>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{LOAN_TYPES[loanType].description}</p>
        </div>

        {/* Home Price */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">Home Price</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              value={homePrice.toLocaleString()}
              onChange={(e) => setHomePrice(parseInt(e.target.value.replace(/,/g, '')) || 0)}
              className="pl-10 text-lg font-semibold"
            />
          </div>
        </div>

        {/* Down Payment */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label className="text-sm font-semibold">Down Payment</Label>
            <span className="text-sm font-bold text-amber-500">
              {formatCurrency(homePrice * (downPaymentPercent / 100))} ({downPaymentPercent}%)
            </span>
          </div>
          <Slider
            value={[downPaymentPercent]}
            onValueChange={(value) => setDownPaymentPercent(value[0])}
            min={LOAN_TYPES[loanType].minDownPayment}
            max={50}
            step={0.5}
            className="mb-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{LOAN_TYPES[loanType].minDownPayment}% min</span>
            <span>50%</span>
          </div>
        </div>

        {/* Interest Rate */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label className="text-sm font-semibold">Interest Rate (APR)</Label>
            <span className="text-sm font-bold text-amber-500">{interestRate}%</span>
          </div>
          <Slider
            value={[interestRate]}
            onValueChange={(value) => setInterestRate(value[0])}
            min={3}
            max={12}
            step={0.125}
            className="mb-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>3%</span>
            <span>12%</span>
          </div>
        </div>

        {/* Loan Term */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">Loan Term</Label>
          <div className="grid grid-cols-4 gap-2">
            {LOAN_TERMS.map((term) => (
              <button
                key={term.years}
                onClick={() => setLoanTermYears(term.years)}
                className={`p-2 rounded-lg border text-sm transition-all ${
                  loanTermYears === term.years
                    ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-semibold'
                    : 'border-muted hover:border-amber-500/50'
                }`}
              >
                {term.years} yr
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </button>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Annual Property Tax</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    type="number"
                    value={annualPropertyTax}
                    onChange={(e) => setAnnualPropertyTax(parseInt(e.target.value) || 0)}
                    className="pl-7 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Annual Insurance</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    type="number"
                    value={annualInsurance}
                    onChange={(e) => setAnnualInsurance(parseInt(e.target.value) || 0)}
                    className="pl-7 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Monthly HOA</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    type="number"
                    value={monthlyHOA}
                    onChange={(e) => setMonthlyHOA(parseInt(e.target.value) || 0)}
                    className="pl-7 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        <div className="bg-gradient-to-br from-[#1a2744] to-[#2a3a5c] rounded-xl p-6 text-white">
          <div className="text-center mb-4">
            <p className="text-amber-400 text-sm mb-1">Estimated Monthly Payment</p>
            <p className="text-4xl font-bold">{formatCurrency(calculations.totalMonthly)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {LOAN_TYPES[loanType].name} • {loanTermYears}-Year Fixed • {interestRate}% APR
            </p>
          </div>

          {/* Payment Breakdown */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs text-gray-400">Principal & Interest</p>
              <p className="font-semibold">{formatCurrency(calculations.monthlyPI)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs text-gray-400">Property Tax</p>
              <p className="font-semibold">{formatCurrency(calculations.monthlyTax)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs text-gray-400">Home Insurance</p>
              <p className="font-semibold">{formatCurrency(calculations.monthlyInsurance)}</p>
            </div>
            {calculations.monthlyPMI > 0 && (
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-gray-400">Mortgage Insurance</p>
                <p className="font-semibold">{formatCurrency(calculations.monthlyPMI)}</p>
              </div>
            )}
            {calculations.monthlyHOA > 0 && (
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-gray-400">HOA Fees</p>
                <p className="font-semibold">{formatCurrency(calculations.monthlyHOA)}</p>
              </div>
            )}
          </div>

          {/* Visual Payment Breakdown Bar */}
          <div className="mt-4">
            <div className="h-4 rounded-full overflow-hidden flex">
              {paymentBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${(item.amount / calculations.totalMonthly) * 100}%`,
                    backgroundColor: item.color
                  }}
                  title={`${item.label}: ${formatCurrency(item.amount)}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {paymentBreakdown.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-400">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loan Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Down Payment</p>
            <p className="font-semibold text-sm">{formatCurrency(calculations.downPaymentAmount)}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Loan Amount</p>
            <p className="font-semibold text-sm">{formatCurrency(calculations.loanAmount)}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Total Interest</p>
            <p className="font-semibold text-sm">{formatCurrency(calculations.totalInterest)}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Total Cost</p>
            <p className="font-semibold text-sm">{formatCurrency(calculations.totalCost)}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={generateFlyer} variant="outline" className="flex-1">
            <FileText className="w-4 h-4 mr-2" />
            Print Flyer
          </Button>
          <Button onClick={addScenario} variant="outline" className="flex-1">
            <TrendingUp className="w-4 h-4 mr-2" />
            Compare
          </Button>
          {onEmailResults && (
            <Button onClick={() => onEmailResults(calculations)} variant="outline" className="flex-1">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
          )}
        </div>

        {/* Amortization Toggle */}
        <button
          onClick={() => setShowAmortization(!showAmortization)}
          className="flex items-center gap-2 text-sm text-amber-500 hover:text-amber-600 transition-colors"
        >
          {showAmortization ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showAmortization ? 'Hide' : 'View'} Amortization Schedule
        </button>

        {/* Amortization Schedule */}
        {showAmortization && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 p-3 border-b">
              <h4 className="font-semibold text-sm">Amortization Schedule</h4>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Period</th>
                    <th className="p-2 text-right">Payment</th>
                    <th className="p-2 text-right">Principal</th>
                    <th className="p-2 text-right">Interest</th>
                    <th className="p-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.amortization.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/20">
                      <td className="p-2">
                        {row.month <= 12 ? `Month ${row.month}` : `Year ${row.year}`}
                      </td>
                      <td className="p-2 text-right">{formatCurrency(row.payment)}</td>
                      <td className="p-2 text-right text-green-600">{formatCurrency(row.principal)}</td>
                      <td className="p-2 text-right text-red-500">{formatCurrency(row.interest)}</td>
                      <td className="p-2 text-right">{formatCurrency(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Comparison Scenarios */}
        {scenarios.length > 0 && (
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Saved Scenarios
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scenarios.map((scenario, idx) => (
                <div key={scenario.id} className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline">Scenario {idx + 1}</Badge>
                    <button
                      onClick={() => setScenarios(scenarios.filter(s => s.id !== scenario.id))}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(scenario.totalMonthly)}/mo</p>
                  <p className="text-xs text-muted-foreground">
                    {scenario.loanConfig.name} • {scenario.downPaymentPercent}% down • {scenario.interestRate}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center">
          <Info className="w-3 h-3 inline mr-1" />
          This is an estimate only. Actual payments may vary based on final loan terms, taxes, insurance, and other factors.
          Contact a lender for accurate quotes.
        </p>
      </CardContent>
    </Card>
  );
};

export default MortgageCalculator;
