import React, { useState } from 'react';
import { Phone, CheckCircle2, Loader2, Send } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { phoneAPI } from '../lib/api';

export const PhoneVerification = ({ 
  value, 
  onChange, 
  onVerified, 
  required = false,
  label = "Phone Number",
  darkMode = false
}) => {
  const [step, setStep] = useState('input'); // 'input', 'verify', 'verified'
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [mockCode, setMockCode] = useState('');

  const inputClasses = darkMode 
    ? "bg-[#0d1f3c]/80 border-amber-400/20 text-white placeholder:text-white/40 focus:border-amber-400"
    : "";

  const handleSendCode = async () => {
    if (!value || value.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const res = await phoneAPI.sendCode(value);
      setStep('verify');
      toast.success('Verification code sent!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await phoneAPI.verifyCode(value, code);
      setStep('verified');
      toast.success('Phone number verified!');
      onVerified?.(value);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    // Reset verification if phone number changes
    if (step !== 'input') {
      setStep('input');
      setCode('');
      setMockCode('');
    }
  };

  const handleResend = () => {
    setCode('');
    handleSendCode();
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label className={`flex items-center gap-2 ${darkMode ? 'text-white/80' : ''}`}>
          <Phone className="w-4 h-4" />
          {label} {required && <span className="text-destructive">*</span>}
          {step === 'verified' && (
            <span className="flex items-center gap-1 text-green-500 text-xs font-normal">
              <CheckCircle2 className="w-3 h-3" /> Verified
            </span>
          )}
        </Label>
      )}
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="tel"
            value={value}
            onChange={handlePhoneChange}
            placeholder="+1 (555) 123-4567"
            className={`${inputClasses} ${step === 'verified' ? 'border-green-500' : ''}`}
            disabled={step === 'verify'}
            required={required}
            data-testid={darkMode ? "landing-phone-input" : "phone-verification-input"}
          />
        </div>
        
        {step === 'input' && value && value.length >= 10 && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleSendCode}
            disabled={loading}
            className={`shrink-0 ${darkMode ? 'border-amber-400/50 text-amber-400 hover:bg-amber-400 hover:text-black' : ''}`}
            data-testid={darkMode ? "landing-phone-verify-button" : "phone-verify-button"}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-1" />
                Verify
              </>
            )}
          </Button>
        )}
      </div>

      {step === 'verify' && (
        <div className={`space-y-2 p-3 rounded-lg border animate-fade-in ${darkMode ? 'bg-[#071020] border-amber-400/20' : 'bg-muted/50'}`}>
          <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-muted-foreground'}`}>
            Enter the 6-digit code sent to {value}
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className={`font-mono text-center tracking-widest ${inputClasses}`}
              data-testid={darkMode ? "landing-phone-code-input" : "phone-code-input"}
            />
            <Button 
              type="button" 
              onClick={handleVerifyCode}
              disabled={loading || code.length !== 6}
              className={darkMode ? 'bg-amber-400 text-black hover:bg-amber-300' : ''}
              data-testid={darkMode ? "landing-phone-confirm-button" : "phone-confirm-button"}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
            </Button>
          </div>
          <button 
            type="button"
            onClick={handleResend}
            className={`text-xs hover:underline ${darkMode ? 'text-amber-400' : 'text-primary'}`}
            data-testid={darkMode ? "landing-phone-resend" : "phone-resend"}
          >
            Didn't receive code? Resend
          </button>
        </div>
      )}

      {step === 'verified' && (
        <p className="text-xs text-green-500 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Phone number verified successfully
        </p>
      )}
    </div>
  );
};
