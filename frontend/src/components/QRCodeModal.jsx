/**
 * QRCodeModal
 * Generates a 1000×1000px print-quality QR code for a property listing.
 * Auto-resolves the best URL: landing page → showcase page → fallback.
 */
import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Printer, Loader2, Check, QrCode, ChevronDown, Edit3, Globe } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API    = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');
const SITE   = 'https://hiddenhavenrealty.com';

const fmtPrice = p => p
  ? new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(p)
  : '';

export const QRCodeModal = ({ listing, onClose }) => {
  const canvasRef  = useRef(null);
  const [urlMode,  setUrlMode]   = useState('auto');   // 'auto' | 'custom'
  const [customUrl, setCustomUrl] = useState('');
  const [landing,   setLanding]   = useState(null);    // landing page slug if found
  const [loadingLP, setLoadingLP] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [done,       setDone]       = useState(false);

  const address = listing?.address || 'Property';
  const price   = listing?.price || listing?.list_price;

  // ── Resolve the best URL ─────────────────────────────────────────────────
  const showcaseUrl   = listing?.slug
    ? `${SITE}/property/${listing.slug}`
    : listing?.id
    ? `${SITE}/property/${listing.id}`
    : SITE;

  const landingUrl    = landing ? `${SITE}/landing/${landing}` : null;
  const resolvedUrl   = urlMode === 'custom'
    ? customUrl
    : (landingUrl || showcaseUrl);   // prefer landing page when available

  // ── Lookup landing page for this listing ─────────────────────────────────
  useEffect(() => {
    if (!listing?.id) { setLoadingLP(false); return; }
    const token = localStorage.getItem('token');
    axios.get(`${API}/api/landing-pages`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const pages = Array.isArray(res.data) ? res.data : res.data?.pages || res.data?.landing_pages || [];
        const match = pages.find(p => p.listing_id === listing.id || p.slug === listing.slug);
        if (match?.slug) {
          setLanding(match.slug);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingLP(false));
  }, [listing]);

  // ── Pre-fill custom URL from resolved URL when switching to custom mode ──
  useEffect(() => {
    if (urlMode === 'custom' && !customUrl) {
      setCustomUrl(resolvedUrl);
    }
  }, [urlMode]);

  // ── Regenerate QR whenever the resolved URL changes ───────────────────────
  useEffect(() => {
    if (loadingLP) return;           // wait until we know if landing page exists
    if (!canvasRef.current) return;
    if (!resolvedUrl || resolvedUrl === SITE) return;

    setGenerating(true);
    setDone(false);

    const SIZE = 1000;
    const canvas = canvasRef.current;
    canvas.width  = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = tempCanvas.height = SIZE;

    QRCode.toCanvas(tempCanvas, resolvedUrl, {
      width: SIZE,
      margin: 2,
      color: { dark: '#0a1628', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    })
    .then(() => {
      // Background
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, 0, SIZE, SIZE);

      // White QR area
      const PAD = 60;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(PAD, PAD, SIZE - PAD*2, SIZE - PAD*2);
      ctx.drawImage(tempCanvas, PAD, PAD, SIZE - PAD*2, SIZE - PAD*2);

      // Top bar — HHR branding
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, 0, SIZE, PAD);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(0, PAD - 3, SIZE, 3);
      ctx.font      = 'bold 22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN HAVEN REALTY', SIZE / 2, 38);

      // Bottom bar
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, SIZE - PAD, SIZE, PAD);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(0, SIZE - PAD, SIZE, 3);

      const maxW   = SIZE - 40;
      let addrText = address;
      ctx.font     = 'bold 18px Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      while (ctx.measureText(addrText).width > maxW && addrText.length > 10) {
        addrText = addrText.slice(0, -4) + '…';
      }
      ctx.fillText(addrText, SIZE / 2, SIZE - 33);
      if (fmtPrice(price)) {
        ctx.fillStyle = '#fbbf24';
        ctx.font      = 'bold 16px Arial, sans-serif';
        ctx.fillText(fmtPrice(price), SIZE / 2, SIZE - 11);
      }

      // Scan hint
      ctx.fillStyle = '#6b7280';
      ctx.font      = '13px Arial, sans-serif';
      ctx.fillText('Scan to view listing', SIZE / 2, PAD + 18);

      setGenerating(false);
      setDone(true);
    })
    .catch(() => { setGenerating(false); toast.error('QR generation failed'); });
  }, [resolvedUrl, loadingLP, address, price]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !done) return;
    const link = document.createElement('a');
    link.download = `qr-${(listing?.slug || listing?.id || 'listing').replace(/\s+/g,'-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('QR Code downloaded — 1000×1000px, print ready');
  };

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas || !done) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>QR — ${address}</title>
      <style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}
      img{max-width:6in;max-height:6in}@media print{body{margin:0}}</style></head>
      <body><img src="${dataUrl}"/>
      <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300))<\/script></body></html>`);
  };

  const isLoading = loadingLP || generating;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-amber-500"/>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">Property QR Code</h3>
              <p className="text-muted-foreground text-xs">1000×1000px — print ready</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground hover:text-foreground"/></button>
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          {/* URL selector */}
          <div className="w-full space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">QR Code links to</p>

            <div className="flex flex-col gap-2">
              {/* Landing page option — shown only if one exists */}
              {landingUrl && (
                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  urlMode === 'auto' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/15' : 'border-border hover:border-amber-500/50'
                }`}>
                  <input type="radio" name="urlMode" value="auto" checked={urlMode==='auto'} onChange={()=>setUrlMode('auto')} className="accent-amber-500"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      Landing Page
                      <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-300 rounded px-1.5 py-0.5 font-bold">RECOMMENDED</span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">/landing/{landing}</p>
                  </div>
                </label>
              )}

              {/* Showcase listing option */}
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                urlMode === 'auto' && !landingUrl ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/15' :
                urlMode === 'showcase' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/15' : 'border-border hover:border-amber-500/50'
              }`}>
                <input type="radio" name="urlMode" value={landingUrl ? 'showcase' : 'auto'}
                  checked={landingUrl ? urlMode==='showcase' : urlMode==='auto'}
                  onChange={()=>setUrlMode(landingUrl ? 'showcase' : 'auto')} className="accent-amber-500"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5"/> Showcase Listing
                  </p>
                  <p className="text-xs text-muted-foreground truncate">/property/{listing?.slug}</p>
                </div>
              </label>

              {/* Custom URL option */}
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                urlMode==='custom' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/15' : 'border-border hover:border-amber-500/50'
              }`}>
                <input type="radio" name="urlMode" value="custom" checked={urlMode==='custom'} onChange={()=>setUrlMode('custom')} className="accent-amber-500"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5"/> Custom URL
                  </p>
                  {urlMode === 'custom' && (
                    <Input
                      value={customUrl}
                      onChange={e=>setCustomUrl(e.target.value)}
                      placeholder="https://hiddenhavenrealty.com/..."
                      className="mt-1.5 h-8 text-xs"
                      onClick={e=>e.stopPropagation()}
                      autoFocus
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* QR Canvas preview */}
          <div className="relative w-52 h-52 rounded-xl overflow-hidden border border-border shadow">
            <canvas ref={canvasRef} className="w-full h-full" style={{ imageRendering:'pixelated' }}/>
            {isLoading && (
              <div className="absolute inset-0 bg-card/80 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-amber-500 animate-spin"/>
              </div>
            )}
          </div>

          {/* URL preview */}
          <p className="text-[11px] text-muted-foreground text-center break-all max-w-full px-2">
            {resolvedUrl || '—'}
          </p>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <Button onClick={handleDownload} disabled={!done} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2 h-11" data-testid="qr-download-btn">
              {done ? <Download className="w-4 h-4"/> : <Loader2 className="w-4 h-4 animate-spin"/>}
              Download PNG
            </Button>
            <Button onClick={handlePrint} disabled={!done} variant="outline" className="flex-1 gap-2 h-11" data-testid="qr-print-btn">
              <Printer className="w-4 h-4"/> Print
            </Button>
          </div>

          {done && (
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 w-full">
              <Check className="w-3.5 h-3.5 shrink-0"/>
              QR code ready — downloads at 1000×1000px for crisp print quality
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
