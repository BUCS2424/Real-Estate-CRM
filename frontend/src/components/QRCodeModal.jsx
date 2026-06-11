/**
 * QRCodeModal
 * Generates a 1000×1000px print-quality QR code for a property listing.
 * Uses the `qrcode` npm library to render onto a Canvas.
 */
import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Printer, Loader2, Check, QrCode } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

const SITE = 'https://hiddenhavenrealty.com';

export const QRCodeModal = ({ listing, onClose }) => {
  const canvasRef = useRef(null);
  const [generating, setGenerating] = useState(true);
  const [done, setDone] = useState(false);

  // Build the public URL for this listing
  const listingUrl = listing?.slug
    ? `${SITE}/property/${listing.slug}`
    : listing?.mls_id
    ? `${SITE}/mls-property/${listing.mls_id}`
    : SITE;

  const address = listing?.address || 'Property';
  const price   = listing?.price || listing?.list_price;
  const fmtPrice = price
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price)
    : '';

  useEffect(() => {
    if (!canvasRef.current) return;

    const SIZE = 1000;
    const canvas = canvasRef.current;
    canvas.width  = SIZE;
    canvas.height = SIZE;

    const ctx = canvas.getContext('2d');
    // Dark navy background
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Draw QR code onto a temp canvas, then composite
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width  = SIZE;
    tempCanvas.height = SIZE;

    QRCode.toCanvas(tempCanvas, listingUrl, {
      width:  SIZE,
      margin: 2,
      color: {
        dark:  '#0a1628',   // navy squares
        light: '#ffffff',   // white background
      },
      errorCorrectionLevel: 'H',   // highest — needed for logo overlay
    })
    .then(() => {
      // White border / padding area
      const PAD = 60;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(PAD, PAD, SIZE - PAD*2, SIZE - PAD*2);

      // Draw QR code inside padding
      ctx.drawImage(tempCanvas, PAD, PAD, SIZE - PAD*2, SIZE - PAD*2);

      // ── HHR branding top bar ──────────────────────────────────
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, 0, SIZE, PAD);

      ctx.fillStyle = '#fbbf24';  // amber
      ctx.fillRect(0, PAD - 3, SIZE, 3);

      // Site name in top bar
      ctx.fillStyle = '#fbbf24';
      ctx.font      = 'bold 22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN HAVEN REALTY', SIZE / 2, 38);

      // ── Bottom bar ───────────────────────────────────────────
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, SIZE - PAD, SIZE, PAD);

      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(0, SIZE - PAD, SIZE, 3);

      // Address + price
      ctx.fillStyle = '#ffffff';
      ctx.font      = 'bold 18px Arial, sans-serif';
      ctx.textAlign = 'center';
      // Truncate address to fit
      const maxW    = SIZE - 40;
      let addrText  = address;
      while (ctx.measureText(addrText).width > maxW && addrText.length > 10) {
        addrText = addrText.slice(0, -4) + '…';
      }
      ctx.fillText(addrText, SIZE / 2, SIZE - 33);

      if (fmtPrice) {
        ctx.fillStyle = '#fbbf24';
        ctx.font      = 'bold 16px Arial, sans-serif';
        ctx.fillText(fmtPrice, SIZE / 2, SIZE - 12);
      }

      // ── Scan instruction ─────────────────────────────────────
      // Small text above QR inside the white area
      ctx.fillStyle = '#6b7280';
      ctx.font      = '13px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scan to view listing details', SIZE / 2, PAD + 18);

      setGenerating(false);
      setDone(true);
    })
    .catch(err => {
      console.error('QR generation failed:', err);
      toast.error('QR code generation failed');
      setGenerating(false);
    });
  }, [listingUrl, address, fmtPrice]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `qr-${(listing?.slug || listing?.mls_id || 'listing').replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('QR Code downloaded (1000×1000px, print-ready)');
  };

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>QR Code — ${address}</title>
      <style>
        body { margin:0; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#fff; }
        img  { max-width:6in; max-height:6in; }
        @media print { body { margin:0; } }
      </style>
      </head><body>
      <img src="${dataUrl}" alt="QR Code"/>
      <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300))<\/script>
      </body></html>
    `);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">Property QR Code</h3>
              <p className="text-muted-foreground text-xs mt-0.5">1000×1000px — print ready</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Canvas preview */}
        <div className="p-5 flex flex-col items-center gap-4">
          <div className="relative w-64 h-64 rounded-xl overflow-hidden border border-border shadow-md">
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              style={{ imageRendering: 'pixelated' }}
            />
            {generating && (
              <div className="absolute inset-0 bg-card/80 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin"/>
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-foreground truncate max-w-xs">{address}</p>
            {fmtPrice && <p className="text-amber-500 font-bold text-base">{fmtPrice}</p>}
            <p className="text-xs text-muted-foreground mt-1 break-all">{listingUrl}</p>
          </div>

          <div className="flex gap-3 w-full">
            <Button
              onClick={handleDownload}
              disabled={!done}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2 h-11"
              data-testid="qr-download-btn"
            >
              {done ? <Download className="w-4 h-4"/> : <Loader2 className="w-4 h-4 animate-spin"/>}
              Download PNG
            </Button>
            <Button
              onClick={handlePrint}
              disabled={!done}
              variant="outline"
              className="flex-1 gap-2 h-11"
              data-testid="qr-print-btn"
            >
              <Printer className="w-4 h-4"/>
              Print
            </Button>
          </div>

          {done && (
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 w-full">
              <Check className="w-3.5 h-3.5 shrink-0"/>
              <span>QR code ready — downloads at 1000×1000px for crisp print quality</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
