import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { publicAPI, landingPagesAPI } from '../lib/api';
import { useBranding } from '../contexts/BrandingContext';
import {
  ChevronLeft, ChevronRight, Bed, Bath, Square, MapPin, Calendar, Car, Home,
  Phone, Mail, ArrowLeft, X, Loader2, Check, Share2, Heart, Building2,
  DollarSign, Ruler, Eye, FileText, Info, School
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { MortgageCalculator } from '../components/MortgageCalculator';
import { PublicSiteHeader } from '../components/public/PublicSiteHeader';
import { PublicSeoHead } from '../components/public/PublicSeoHead';
import { ListMyHomeModal } from '../components/ListMyHomeModal';

const fmt = (price) => price ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price) : '—';
const fmtNum = (n) => n ? n.toLocaleString() : '—';
const MORTGAGE_CALCULATOR_LIMIT = 2000000;

const DetailRow = ({ label, value }) => value != null && value !== '' && value !== false ? (
  <div className="flex justify-between py-2.5 border-b border-white/5">
    <span className="text-white/50 text-sm">{label}</span>
    <span className="text-white text-sm font-medium text-right max-w-[60%]">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}</span>
  </div>
) : null;

const SectionTitle = ({ icon: Icon, children }) => (
  <h2 className="text-xl font-serif text-white mb-4 flex items-center gap-2">
    <Icon className="w-5 h-5 text-amber-400" /> {children}
  </h2>
);

export const PropertyDetailPage = () => {
  const { slug } = useParams();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [showListModal, setShowListModal] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await publicAPI.getListingBySlug(slug);
        setProperty(res.data);
      } catch (error) {
        try {
          const res = await publicAPI.getListing(slug);
          setProperty(res.data);
        } catch (fallbackError) {
          // Last resort: check if this slug belongs to a landing page and redirect
          try {
            await landingPagesAPI.getPublicPage(slug);
            navigate(`/landing/${slug}`, { replace: true });
            return;
          } catch {
            // Truly not found — fall through to "Property Not Found" state
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
    window.scrollTo(0, 0);
  }, [slug, navigate]);

  const handleSubmitInquiry = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) { toast.error('Please enter your name and email'); return; }
    setSubmitting(true);
    try {
      await publicAPI.submitLead({ ...formData, property_id: property?.id || slug, property_slug: slug, source: 'property_detail' });
      toast.success('Thank you! An agent will contact you shortly.');
      setFormData({ name: '', email: '', phone: '', message: '' });
      setShowInquiryForm(false);
    } catch (error) { toast.error('Something went wrong. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const handleShare = () => { if (navigator.share) navigator.share({ title: property?.address, url: window.location.href }); else navigator.clipboard.writeText(window.location.href); };

  if (loading) return (<div className="min-h-screen bg-[#0a1628] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-amber-400" /></div>);

  if (!property) return (
    <div className="min-h-screen bg-[#0a1628]">
      <PublicSiteHeader />
      <div className="text-center py-20">
        <Home className="w-16 h-16 mx-auto text-white/20 mb-4" />
        <h2 className="text-2xl font-serif text-white mb-2">Property Not Found</h2>
        <p className="text-white/60 mb-6">This listing may no longer be available.</p>
        <Link to="/showcase"><Button className="bg-amber-400 text-black hover:bg-amber-300"><ArrowLeft className="w-4 h-4 mr-2" /> Browse Properties</Button></Link>
      </div>
    </div>
  );

  const images = property.images?.length > 0
    ? property.images.map(img => typeof img === 'string' ? { url: img } : img)
    : property.gallery_images?.length > 0
      ? property.gallery_images.map(img => typeof img === 'string' ? { url: img } : img)
      : [];
  const photos = images.map(i => i.url).filter(Boolean);
  const p = property;
  const price = typeof p.price === 'string' ? parseInt(p.price.replace(/[^0-9]/g, '')) : (p.price || 0);

  const seoTitle = p.address ? `${p.address}, ${p.city || ''}`.trim() : 'Property Details';
  const seoDescription = p.description || 'Explore this property listed by Hidden Haven Realty.';

  const nextPhoto = () => setActivePhoto(prev => (prev + 1) % photos.length);
  const prevPhoto = () => setActivePhoto(prev => (prev - 1 + photos.length) % photos.length);

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <PublicSeoHead title={`${seoTitle} | ${fmt(price)}`} description={seoDescription} image={photos[0]} urlPath={`/property/${slug}`} type="article" />
      <PublicSiteHeader contactHref="/#contact" />

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-xl overflow-hidden cursor-pointer" onClick={() => setLightboxOpen(true)} data-testid="photo-gallery">
            <div className="md:col-span-2 md:row-span-2 relative group">
              <img src={photos[0]} alt={p.address} className="w-full h-[300px] md:h-[420px] object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>
            {photos.slice(1, 5).map((photo, idx) => (
              <div key={`g-${idx}`} className="hidden md:block relative group">
                <img src={photo} alt="" className="w-full h-[207px] object-cover" />
                {idx === 3 && photos.length > 5 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white font-medium text-lg">+{photos.length - 5} Photos</span></div>}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 mb-2">
            <button onClick={() => navigate(-1)} className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
            <div className="flex items-center gap-3">
              <button onClick={handleShare} className="flex items-center gap-1.5 text-white/60 hover:text-amber-400 text-sm"><Share2 className="w-4 h-4" /> Share</button>
              <button onClick={() => setSaved(!saved)} className={`flex items-center gap-1.5 text-sm ${saved ? 'text-red-400' : 'text-white/60 hover:text-red-400'}`}><Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} /> {saved ? 'Saved' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left (2/3) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div className="pt-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-amber-400 text-3xl lg:text-4xl font-serif font-bold">{fmt(price)}</p>
                  <h1 className="text-xl lg:text-2xl font-serif text-white mt-1">{p.address}</h1>
                  <p className="text-white/50 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-4 h-4 text-amber-400/60" /> {p.city}, {p.state || 'FL'} {p.zip_code}
                    {p.county && <span className="text-white/30">| {p.county} County</span>}
                  </p>
                </div>
                <Badge className="bg-amber-400/20 text-amber-400 border-amber-400/30 text-sm px-3 py-1">{p.status === 'active' ? 'Active' : p.status || 'Exclusive'}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-3 py-5 mt-4 border-y border-white/10">
                {p.bedrooms != null && <div className="flex items-center gap-2"><Bed className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">{p.bedrooms}</span><span className="text-white/40 text-sm">Beds</span></div>}
                {p.bathrooms != null && <div className="flex items-center gap-2"><Bath className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">{p.bathrooms}</span><span className="text-white/40 text-sm">Baths</span></div>}
                {p.sqft && <div className="flex items-center gap-2"><Square className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">{fmtNum(p.sqft)}</span><span className="text-white/40 text-sm">Sq Ft</span></div>}
                {p.lot_size && <div className="flex items-center gap-2"><Ruler className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">{p.lot_size}</span><span className="text-white/40 text-sm">Acres</span></div>}
                {p.year_built && <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">{p.year_built}</span><span className="text-white/40 text-sm">Built</span></div>}
                {price > 0 && p.sqft && <div className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">${Math.round(price / p.sqft)}</span><span className="text-white/40 text-sm">/Sq Ft</span></div>}
              </div>
            </div>

            {/* Quick Facts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { icon: Building2, label: 'Type', value: p.property_type?.replace('_', ' ') },
                { icon: Calendar, label: 'Year Built', value: p.year_built },
                { icon: Ruler, label: 'Lot Size', value: p.lot_size },
                { icon: DollarSign, label: 'HOA', value: 'None' },
                { icon: Car, label: 'Garage', value: p.garage || 'N/A' },
              ].filter(f => f.value).map((fact, i) => (
                <div key={`qf-${i}`} className="bg-white/5 rounded-lg p-3 text-center">
                  <fact.icon className="w-5 h-5 text-amber-400/60 mx-auto mb-1" />
                  <p className="text-white text-sm font-medium capitalize">{fact.value}</p>
                  <p className="text-white/40 text-[11px]">{fact.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10 pointer-events-none" />
                <TabsList className="relative w-full justify-start overflow-x-auto bg-[#0b1d38] border-2 border-amber-500/40 rounded-xl p-1.5 h-auto gap-0.5 flex-wrap shadow-lg shadow-amber-500/10">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-amber-500 data-[state=active]:text-[#0a1628] data-[state=active]:font-bold data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/40 text-white/70 hover:text-amber-300 hover:bg-white/5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200">Overview</TabsTrigger>
                  <TabsTrigger value="details" className="data-[state=active]:bg-amber-500 data-[state=active]:text-[#0a1628] data-[state=active]:font-bold data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/40 text-white/70 hover:text-amber-300 hover:bg-white/5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200">Property Details</TabsTrigger>
                  {p.features?.length > 0 && <TabsTrigger value="features" className="data-[state=active]:bg-amber-500 data-[state=active]:text-[#0a1628] data-[state=active]:font-bold data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/40 text-white/70 hover:text-amber-300 hover:bg-white/5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200">Features</TabsTrigger>}
                </TabsList>
              </div>

              <TabsContent value="overview" className="space-y-8 mt-6">
                {p.description && (
                  <div>
                    <SectionTitle icon={Home}>About This Property</SectionTitle>
                    <p className="text-white/70 leading-relaxed text-[15px] whitespace-pre-line">{p.description}</p>
                  </div>
                )}
                {!p.description && (
                  <div className="bg-white/5 rounded-lg p-6 text-center">
                    <p className="text-white/50">Contact us for more information about this exclusive property.</p>
                  </div>
                )}
                <div className="bg-white/5 rounded-lg p-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
                  {p.mls_id && <span className="text-white/50">MLS# <span className="text-white font-medium">{p.mls_id}</span></span>}
                  {p.owner_name && <span className="text-white/50">Listed by <span className="text-white font-medium">{p.owner_name}</span></span>}
                </div>
              </TabsContent>

              <TabsContent value="details" className="mt-6">
                <SectionTitle icon={FileText}>Property Details</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <DetailRow label="Property Type" value={p.property_type?.replace('_', ' ')} />
                    <DetailRow label="Bedrooms" value={p.bedrooms} />
                    <DetailRow label="Bathrooms" value={p.bathrooms} />
                    <DetailRow label="Square Footage" value={fmtNum(p.sqft)} />
                    <DetailRow label="Lot Size" value={p.lot_size} />
                    <DetailRow label="Year Built" value={p.year_built} />
                  </div>
                  <div>
                    <DetailRow label="County" value={p.county} />
                    <DetailRow label="Garage" value={p.garage} />
                    <DetailRow label="MLS #" value={p.mls_id} />
                    <DetailRow label="Status" value={p.status} />
                    {price > 0 && p.sqft && <DetailRow label="Price/Sq Ft" value={`$${Math.round(price / p.sqft)}`} />}
                  </div>
                </div>
              </TabsContent>

              {p.features?.length > 0 && (
                <TabsContent value="features" className="mt-6">
                  <SectionTitle icon={Check}>Features & Amenities</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {p.features.map((f, i) => (
                      <Badge key={`feat-${i}`} variant="outline" className="border-white/15 text-white/70 bg-white/5">{f}</Badge>
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>

            {/* Mortgage Calculator */}
            {price > 0 && price < MORTGAGE_CALCULATOR_LIMIT && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <SectionTitle icon={DollarSign}>Payment Calculator</SectionTitle>
                  <MortgageCalculator
                    propertyPrice={price}
                    propertyAddress={`${p.address}, ${p.city}, ${p.state || 'FL'}`}
                    embedded={true}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-6 space-y-6 max-h-[calc(100vh-3rem)] overflow-y-auto scrollbar-hide">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-serif text-white font-bold">Schedule a Private Viewing</h3>
                    <p className="text-white/50 text-sm mt-1">See this property in person</p>
                  </div>
                  <Button className="w-full bg-amber-400 hover:bg-amber-500 text-black font-semibold h-12 text-base" onClick={() => setShowInquiryForm(true)} data-testid="schedule-viewing-btn">
                    <Calendar className="w-5 h-5 mr-2" /> Schedule Viewing
                  </Button>
                  <Button variant="outline" className="w-full border-amber-400/30 text-amber-400 hover:bg-amber-400/10 h-11" onClick={() => window.location.href = 'tel:+18134540004'}>
                    <Phone className="w-4 h-4 mr-2" /> Call (813) 454-0004
                  </Button>
                  <a href="mailto:mel@hiddenhavenrealty.com" className="flex items-center gap-3 text-white/60 hover:text-amber-400 text-sm"><Mail className="w-4 h-4" /> mel@hiddenhavenrealty.com</a>
                  {/* List My Home CTA */}
                  <div className="border-t border-white/10 pt-4 mt-2">
                    <p className="text-white/40 text-[11px] uppercase tracking-wider text-center mb-3">Ready to Sell?</p>
                    <Button
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-bold h-11 rounded-xl shadow-lg shadow-amber-500/25"
                      onClick={() => setShowListModal(true)}
                      data-testid="list-my-home-btn"
                    >
                      <Home className="w-4 h-4 mr-2" /> List My Home
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {p.owner_name && (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-5">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Listed By</p>
                    <p className="text-white font-medium">{p.owner_name}</p>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-5">
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-3">At a Glance</p>
                  {price > 0 && p.sqft && <DetailRow label="Price/SqFt" value={`$${Math.round(price / p.sqft)}`} />}
                  <DetailRow label="Status" value={p.status === 'active' ? 'Active' : p.status} />
                  <DetailRow label="Year Built" value={p.year_built} />
                  <DetailRow label="MLS #" value={p.mls_id} />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Mobile sidebar */}
          <div className="lg:hidden space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-serif text-white font-bold text-center">Schedule a Private Viewing</h3>
                <Button className="w-full bg-amber-400 hover:bg-amber-500 text-black font-semibold h-12 text-base" onClick={() => setShowInquiryForm(true)}>
                  <Calendar className="w-5 h-5 mr-2" /> Schedule Viewing
                </Button>
                <Button variant="outline" className="w-full border-amber-400/30 text-amber-400 hover:bg-amber-400/10 h-11" onClick={() => window.location.href = 'tel:+18134540004'}>
                  <Phone className="w-4 h-4 mr-2" /> Call (813) 454-0004
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && photos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white z-10" onClick={() => setLightboxOpen(false)}><X className="w-8 h-8" /></button>
          <button onClick={e => { e.stopPropagation(); prevPhoto(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"><ChevronLeft className="w-8 h-8" /></button>
          <img src={photos[activePhoto]} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" onClick={e => e.stopPropagation()} />
          <button onClick={e => { e.stopPropagation(); nextPhoto(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"><ChevronRight className="w-8 h-8" /></button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[80vw] overflow-x-auto pb-2">
            {photos.map((ph, idx) => (
              <button key={`lb-${idx}`} onClick={e => { e.stopPropagation(); setActivePhoto(idx); }} className={`w-14 h-10 rounded overflow-hidden shrink-0 border-2 ${idx === activePhoto ? 'border-amber-400 opacity-100' : 'border-transparent opacity-40 hover:opacity-70'}`}>
                <img src={ph} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inquiry Form Modal */}
      {showInquiryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0d1f3c] border border-amber-400/20 rounded-2xl p-8 max-w-md w-full relative">
            <button onClick={() => setShowInquiryForm(false)} className="absolute top-4 right-4 text-white/60 hover:text-white"><X className="w-6 h-6" /></button>
            <p className="text-amber-400 uppercase tracking-widest text-xs mb-2">Private Showing</p>
            <h2 className="text-2xl font-serif mb-2">Request a Viewing</h2>
            <p className="text-white/60 text-sm mb-6">{p.address}, {p.city}</p>
            <form onSubmit={handleSubmitInquiry} className="space-y-4">
              <Input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Your Name *" required className="bg-[#0a1628] border-amber-400/20 text-white placeholder:text-white/40 h-12" />
              <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Email Address *" required className="bg-[#0a1628] border-amber-400/20 text-white placeholder:text-white/40 h-12" />
              <Input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone Number" className="bg-[#0a1628] border-amber-400/20 text-white placeholder:text-white/40 h-12" />
              <Textarea value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} placeholder="Message (optional)" rows={3} className="bg-[#0a1628] border-amber-400/20 text-white placeholder:text-white/40" />
              <Button type="submit" disabled={submitting} className="w-full bg-amber-400 hover:bg-amber-500 text-black py-6 font-semibold">
                {submitting && <Loader2 className="w-5 h-5 animate-spin mr-2" />} Submit Inquiry
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* List My Home Modal */}
      {showListModal && (
        <ListMyHomeModal
          onClose={() => setShowListModal(false)}
          propertyAddress={p ? `${p.address || ''}${p.city ? ', ' + p.city : ''}${p.state ? ', ' + p.state : ''}` : ''}
        />
      )}
    </div>
  );
};
