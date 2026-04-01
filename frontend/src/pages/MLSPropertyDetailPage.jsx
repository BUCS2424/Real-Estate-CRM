import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Bed, Bath, Square, DollarSign, Calendar, Home,
  Building2, Loader2, ChevronLeft, ChevronRight, X, Share2, Heart,
  Car, Waves, Phone, Mail, Clock, TrendingUp, Thermometer, Wind,
  Droplets, Sun, TreePine, Eye, ExternalLink, School, Ruler
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PublicSiteHeader } from '../components/public/PublicSiteHeader';
import { PublicSeoHead } from '../components/public/PublicSeoHead';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});
const goldIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const fmt = (price) => price ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price) : '—';
const fmtNum = (n) => n ? n.toLocaleString() : '—';

export const MLSPropertyDetailPage = () => {
  const { mlsId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const galleryRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/api/neighborhoods/public/property/${mlsId}`);
        setProperty(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Property not found');
      } finally {
        setLoading(false);
      }
    };
    if (mlsId) fetchData();
    window.scrollTo(0, 0);
  }, [mlsId]);

  const photos = property?.all_photos || property?.photos || [];
  const nextPhoto = () => setActivePhoto(prev => (prev + 1) % photos.length);
  const prevPhoto = () => setActivePhoto(prev => (prev - 1 + photos.length) % photos.length);

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: property?.address, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628]">
        <PublicSiteHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-[#0a1628]">
        <PublicSiteHeader />
        <div className="text-center py-20">
          <Building2 className="w-16 h-16 mx-auto text-white/20 mb-4" />
          <h2 className="text-2xl font-serif text-white mb-2">Property Not Found</h2>
          <p className="text-white/60 mb-6">{error}</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="border-amber-400/50 text-amber-400">
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  const DetailRow = ({ label, value }) => value ? (
    <div className="flex justify-between py-2.5 border-b border-white/5">
      <span className="text-white/50 text-sm">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <PublicSeoHead
        title={`${property.address} | ${fmt(property.list_price)} | Hidden Haven Realty`}
        description={`${property.bedrooms || '—'} bed, ${property.bathrooms || '—'} bath, ${fmtNum(property.sqft)} sqft home at ${property.address}, ${property.city} FL`}
      />
      <PublicSiteHeader />

      {/* ── Photo Gallery ── */}
      {photos.length > 0 && (
        <div className="relative" ref={galleryRef}>
          {/* Main Photo Grid */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-xl overflow-hidden cursor-pointer" onClick={() => setLightboxOpen(true)} data-testid="photo-gallery">
              {/* Large main photo */}
              <div className="md:col-span-2 md:row-span-2 relative group">
                <img src={photos[0]} alt={property.address} className="w-full h-[300px] md:h-[420px] object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>
              {/* 4 smaller photos */}
              {photos.slice(1, 5).map((photo, idx) => (
                <div key={`grid-${idx}`} className="hidden md:block relative group">
                  <img src={photo} alt="" className="w-full h-[207px] object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  {idx === 3 && photos.length > 5 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-medium text-lg">+{photos.length - 5} Photos</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Action bar below photos */}
            <div className="flex items-center justify-between mt-3 mb-2">
              <button onClick={() => navigate(-1)} className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1.5" data-testid="back-button">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="flex items-center gap-3">
                <button onClick={handleShare} className="flex items-center gap-1.5 text-white/60 hover:text-amber-400 text-sm transition-colors" data-testid="share-btn">
                  <Share2 className="w-4 h-4" /> Share
                </button>
                <button onClick={() => setSaved(!saved)} className={`flex items-center gap-1.5 text-sm transition-colors ${saved ? 'text-red-400' : 'text-white/60 hover:text-red-400'}`} data-testid="save-btn">
                  <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} /> {saved ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left Column (2/3) ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Price & Address Header */}
            <div className="pt-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-amber-400 text-3xl lg:text-4xl font-serif font-bold" data-testid="property-price">{fmt(property.list_price)}</p>
                  <h1 className="text-xl lg:text-2xl font-serif text-white mt-1" data-testid="property-address">{property.address}</h1>
                  <p className="text-white/50 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-4 h-4 text-amber-400/60" /> {property.city}, {property.state} {property.zip_code}
                    {property.county && <span className="text-white/30">| {property.county} County</span>}
                  </p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-sm px-3 py-1">{property.status || 'Active'}</Badge>
              </div>

              {/* Stats Bar */}
              <div className="flex flex-wrap gap-x-8 gap-y-3 py-5 mt-4 border-y border-white/10">
                {property.bedrooms != null && (
                  <div className="flex items-center gap-2"><Bed className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">{property.bedrooms}</span><span className="text-white/40 text-sm">Beds</span></div>
                )}
                {property.bathrooms != null && (
                  <div className="flex items-center gap-2"><Bath className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">{property.bathrooms}</span><span className="text-white/40 text-sm">Baths</span></div>
                )}
                {property.sqft && (
                  <div className="flex items-center gap-2"><Square className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">{fmtNum(property.sqft)}</span><span className="text-white/40 text-sm">Sq Ft</span></div>
                )}
                {property.lot_size && (
                  <div className="flex items-center gap-2"><Ruler className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">{property.lot_size}</span><span className="text-white/40 text-sm">Acres</span></div>
                )}
                {property.year_built && (
                  <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">{property.year_built}</span><span className="text-white/40 text-sm">Built</span></div>
                )}
                {property.list_price && property.sqft && (
                  <div className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">${Math.round(property.list_price / property.sqft)}</span><span className="text-white/40 text-sm">/Sq Ft</span></div>
                )}
              </div>
            </div>

            {/* Quick Facts Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { icon: Building2, label: 'Type', value: property.property_sub_type || property.property_type },
                { icon: Calendar, label: 'Year Built', value: property.year_built },
                { icon: Ruler, label: 'Lot Size', value: property.lot_size ? `${property.lot_size} acres` : null },
                { icon: DollarSign, label: 'HOA', value: property.hoa_fee ? `$${property.hoa_fee}/mo` : 'None' },
                { icon: Car, label: 'Parking', value: property.parking || 'Garage' },
              ].filter(f => f.value).map((fact, i) => (
                <div key={`fact-${i}`} className="bg-white/5 rounded-lg p-3 text-center">
                  <fact.icon className="w-5 h-5 text-amber-400/60 mx-auto mb-1" />
                  <p className="text-white text-sm font-medium">{fact.value}</p>
                  <p className="text-white/40 text-[11px]">{fact.label}</p>
                </div>
              ))}
            </div>

            {/* Tab Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-white/5 border border-white/10 w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Property Details</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="schools">Schools</TabsTrigger>
                <TabsTrigger value="map">Map</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-8 mt-6">
                {/* About This Home */}
                {property.description && (
                  <div>
                    <h2 className="text-xl font-serif text-white mb-4 flex items-center gap-2">
                      <Home className="w-5 h-5 text-amber-400" /> About This Home
                    </h2>
                    <p className="text-white/70 leading-relaxed text-[15px]">{property.description}</p>
                  </div>
                )}

                {/* MLS Info */}
                <div className="bg-white/5 rounded-lg p-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
                  {property.mls_id && <span className="text-white/50">MLS# <span className="text-white font-medium">{property.mls_id}</span></span>}
                  {property.listing_agent && <span className="text-white/50">Listed by <span className="text-white font-medium">{property.listing_agent}</span></span>}
                  {property.listing_office && <span className="text-white/50">Office: <span className="text-white font-medium">{property.listing_office}</span></span>}
                  {property.days_on_market != null && <span className="text-white/50"><Clock className="w-3.5 h-3.5 inline mr-1" />{property.days_on_market} days on market</span>}
                </div>
              </TabsContent>

              {/* Property Details Tab */}
              <TabsContent value="details" className="mt-6">
                <h2 className="text-xl font-serif text-white mb-4">Property Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <DetailRow label="Property Type" value={property.property_type} />
                    <DetailRow label="Sub Type" value={property.property_sub_type} />
                    <DetailRow label="Bedrooms" value={property.bedrooms} />
                    <DetailRow label="Bathrooms" value={property.bathrooms} />
                    <DetailRow label="Square Footage" value={fmtNum(property.sqft)} />
                    <DetailRow label="Lot Size" value={property.lot_size ? `${property.lot_size} acres` : null} />
                    <DetailRow label="Year Built" value={property.year_built} />
                  </div>
                  <div>
                    <DetailRow label="Subdivision" value={property.subdivision} />
                    <DetailRow label="County" value={property.county} />
                    <DetailRow label="HOA Fee" value={property.hoa_fee ? `$${property.hoa_fee}/mo` : 'None listed'} />
                    <DetailRow label="Tax Amount" value={property.tax_amount ? `$${fmtNum(property.tax_amount)}/yr` : null} />
                    <DetailRow label="Tax Year" value={property.tax_year} />
                    <DetailRow label="Parking" value={property.parking} />
                    <DetailRow label="Pool" value={property.pool || 'None listed'} />
                    <DetailRow label="Days on Market" value={property.days_on_market} />
                    <DetailRow label="MLS #" value={property.mls_id} />
                  </div>
                </div>
              </TabsContent>

              {/* Features Tab */}
              <TabsContent value="features" className="space-y-6 mt-6">
                {property.features?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-serif text-white mb-3">Interior Features</h3>
                    <div className="flex flex-wrap gap-2">
                      {property.features.map((f, i) => (
                        <Badge key={`int-${i}`} variant="outline" className="border-white/15 text-white/70 bg-white/5">{f}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {property.exterior_features?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-serif text-white mb-3">Exterior Features</h3>
                    <div className="flex flex-wrap gap-2">
                      {property.exterior_features.map((f, i) => (
                        <Badge key={`ext-${i}`} variant="outline" className="border-white/15 text-white/70 bg-white/5">{f}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {property.appliances?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-serif text-white mb-3">Appliances</h3>
                    <div className="flex flex-wrap gap-2">
                      {property.appliances.map((f, i) => (
                        <Badge key={`app-${i}`} variant="outline" className="border-white/15 text-white/70 bg-white/5">{f}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(!property.features?.length && !property.exterior_features?.length && !property.appliances?.length) && (
                  <p className="text-white/40 py-8 text-center">No feature details available for this listing.</p>
                )}
              </TabsContent>

              {/* Schools Tab */}
              <TabsContent value="schools" className="mt-6">
                <h2 className="text-xl font-serif text-white mb-4 flex items-center gap-2">
                  <School className="w-5 h-5 text-amber-400" /> Nearby Schools
                </h2>
                {(property.elementary_school || property.middle_school || property.high_school) ? (
                  <div className="space-y-3">
                    {[
                      { level: 'Elementary School', name: property.elementary_school },
                      { level: 'Middle School', name: property.middle_school },
                      { level: 'High School', name: property.high_school },
                    ].filter(s => s.name).map((school, i) => (
                      <div key={`school-${i}`} className="flex items-center gap-4 bg-white/5 rounded-lg p-4">
                        <div className="w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center shrink-0">
                          <School className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{school.name}</p>
                          <p className="text-white/40 text-sm">{school.level}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/40 py-8 text-center">School information not available for this listing.</p>
                )}
              </TabsContent>

              {/* Map Tab */}
              <TabsContent value="map" className="mt-6">
                <h2 className="text-xl font-serif text-white mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-400" /> Location
                </h2>
                {property.latitude && property.longitude ? (
                  <div className="rounded-xl overflow-hidden h-[400px]" data-testid="property-map">
                    <MapContainer center={[property.latitude, property.longitude]} zoom={15} className="w-full h-full" style={{ background: '#0d1f3c' }}>
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="CARTO" />
                      <Marker position={[property.latitude, property.longitude]} icon={goldIcon}>
                        <Popup><strong>{property.address}</strong><br/>{fmt(property.list_price)}</Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                ) : (
                  <p className="text-white/40 py-8 text-center">Map location not available.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Right Column (1/3) — Sticky Sidebar ── */}
          <div className="space-y-6">
            {/* Schedule Viewing Card */}
            <Card className="bg-white/5 border-white/10 sticky top-6" data-testid="contact-card">
              <CardContent className="p-6 space-y-5">
                <div className="text-center">
                  <h3 className="text-lg font-serif text-white font-bold">Schedule a Private Viewing</h3>
                  <p className="text-white/50 text-sm mt-1">See this property in person with our team</p>
                </div>

                <Button
                  className="w-full bg-amber-400 hover:bg-amber-500 text-black font-semibold h-12 text-base"
                  onClick={() => navigate('/book/mel')}
                  data-testid="schedule-viewing-btn"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Schedule Viewing
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-amber-400/30 text-amber-400 hover:bg-amber-400/10 h-11"
                  onClick={() => window.location.href = `tel:+18134540004`}
                  data-testid="call-agent-btn"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call (813) 454-0004
                </Button>

                <div className="border-t border-white/10 pt-4 space-y-3">
                  <a href="mailto:mel@hiddenhavenrealty.com" className="flex items-center gap-3 text-white/60 hover:text-amber-400 transition-colors text-sm">
                    <Mail className="w-4 h-4" /> mel@hiddenhavenrealty.com
                  </a>
                </div>

                {property.virtual_tour_url && (
                  <a href={property.virtual_tour_url} target="_blank" rel="noopener noreferrer" className="block">
                    <Button variant="outline" className="w-full border-white/20 text-white/70 hover:text-white">
                      <Eye className="w-4 h-4 mr-2" /> Virtual Tour
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Listing Agent Info */}
            {property.listing_agent && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-5">
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Listing Agent</p>
                  <p className="text-white font-medium">{property.listing_agent}</p>
                  {property.listing_office && <p className="text-white/50 text-sm">{property.listing_office}</p>}
                </CardContent>
              </Card>
            )}

            {/* Property Snapshot */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-5 space-y-3">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">At a Glance</p>
                <DetailRow label="Price/SqFt" value={property.list_price && property.sqft ? `$${Math.round(property.list_price / property.sqft)}` : null} />
                <DetailRow label="Status" value={property.status} />
                <DetailRow label="Days on Market" value={property.days_on_market} />
                <DetailRow label="Year Built" value={property.year_built} />
                <DetailRow label="Subdivision" value={property.subdivision} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white z-10" onClick={() => setLightboxOpen(false)} data-testid="lightbox-close">
            <X className="w-8 h-8" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
            <ChevronLeft className="w-8 h-8" />
          </button>
          <img src={photos[activePhoto]} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" onClick={(e) => e.stopPropagation()} />
          <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
            <ChevronRight className="w-8 h-8" />
          </button>
          {/* Thumbnail strip in lightbox */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[80vw] overflow-x-auto pb-2">
            {photos.map((p, idx) => (
              <button
                key={`lb-${idx}`}
                onClick={(e) => { e.stopPropagation(); setActivePhoto(idx); }}
                className={`w-14 h-10 rounded overflow-hidden shrink-0 border-2 transition-all ${idx === activePhoto ? 'border-amber-400 opacity-100' : 'border-transparent opacity-40 hover:opacity-70'}`}
              >
                <img src={p} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MLSPropertyDetailPage;
