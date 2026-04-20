import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Bed, Bath, Square, DollarSign, Calendar, Home,
  Building2, Loader2, ChevronLeft, ChevronRight, X, Share2, Heart,
  Car, Phone, Mail, Clock, Thermometer, Wind, Droplets, Sun,
  Eye, ExternalLink, School, Ruler, Flame, Shield, TreePine,
  Waves, Compass, FileText, TrendingUp, Info
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PublicSiteHeader } from '../components/public/PublicSiteHeader';
import { PublicSeoHead } from '../components/public/PublicSeoHead';
import { MortgageCalculator } from '../components/MortgageCalculator';
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

const fmt = (p) => p ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p) : '—';
const fmtNum = (n) => n ? n.toLocaleString() : '—';

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

const FeaturePills = ({ items, label }) => items?.length > 0 ? (
  <div className="mb-5">
    <h3 className="text-sm font-medium text-white/60 mb-2 uppercase tracking-wider">{label}</h3>
    <div className="flex flex-wrap gap-2">
      {items.map((f, i) => <Badge key={`${label}-${i}`} variant="outline" className="border-white/15 text-white/70 bg-white/5">{f}</Badge>)}
    </div>
  </div>
) : null;

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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/api/neighborhoods/public/property/${mlsId}`);
        setProperty(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Property not found');
      } finally { setLoading(false); }
    };
    if (mlsId) fetchData();
    window.scrollTo(0, 0);
  }, [mlsId]);

  const photos = property?.all_photos || property?.photos || [];
  const nextPhoto = () => setActivePhoto(p => (p + 1) % photos.length);
  const prevPhoto = () => setActivePhoto(p => (p - 1 + photos.length) % photos.length);
  const handleShare = () => { if (navigator.share) navigator.share({ title: property?.address, url: window.location.href }); else navigator.clipboard.writeText(window.location.href); };

  if (loading) return (<div className="min-h-screen bg-[#0a1628]"><PublicSiteHeader /><div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 animate-spin text-amber-400" /></div></div>);
  if (error || !property) return (<div className="min-h-screen bg-[#0a1628]"><PublicSiteHeader /><div className="text-center py-20"><Building2 className="w-16 h-16 mx-auto text-white/20 mb-4" /><h2 className="text-2xl font-serif text-white mb-2">Property Not Found</h2><p className="text-white/60 mb-6">{error}</p><Button variant="outline" onClick={() => navigate(-1)} className="border-amber-400/50 text-amber-400"><ArrowLeft className="w-4 h-4 mr-2" /> Go Back</Button></div></div>);

  const p = property;

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <PublicSeoHead title={`${p.address} | ${fmt(p.list_price)} | Hidden Haven Realty`} description={`${p.bedrooms || '—'} bed, ${p.bathrooms || '—'} bath, ${fmtNum(p.sqft)} sqft at ${p.address}, ${p.city} FL`} />
      <PublicSiteHeader />

      {/* ── Photo Grid ── */}
      {photos.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-xl overflow-hidden cursor-pointer" onClick={() => setLightboxOpen(true)} data-testid="photo-gallery">
            <div className="md:col-span-2 md:row-span-2 relative group"><img src={photos[0]} alt={p.address} className="w-full h-[300px] md:h-[420px] object-cover" /><div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" /></div>
            {photos.slice(1, 5).map((photo, idx) => (
              <div key={`g-${idx}`} className="hidden md:block relative group"><img src={photo} alt="" className="w-full h-[207px] object-cover" /><div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
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

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left (2/3) ── */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div className="pt-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-amber-400 text-3xl lg:text-4xl font-serif font-bold">{fmt(p.list_price)}</p>
                  <h1 className="text-xl lg:text-2xl font-serif text-white mt-1">{p.address}</h1>
                  <p className="text-white/50 flex items-center gap-1.5 mt-1"><MapPin className="w-4 h-4 text-amber-400/60" /> {p.city}, {p.state} {p.zip_code}{p.county && <span className="text-white/30">| {p.county} County</span>}</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-sm px-3 py-1">{p.status || 'Active'}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-3 py-5 mt-4 border-y border-white/10">
                {p.bedrooms != null && <div className="flex items-center gap-2"><Bed className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">{p.bedrooms}</span><span className="text-white/40 text-sm">Beds</span></div>}
                {p.bathrooms != null && <div className="flex items-center gap-2"><Bath className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">{p.bathrooms}</span><span className="text-white/40 text-sm">Baths</span></div>}
                {p.sqft && <div className="flex items-center gap-2"><Square className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">{fmtNum(p.sqft)}</span><span className="text-white/40 text-sm">Sq Ft</span></div>}
                {p.lot_size && <div className="flex items-center gap-2"><Ruler className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">{p.lot_size}</span><span className="text-white/40 text-sm">Acres</span></div>}
                {p.year_built && <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">{p.year_built}</span><span className="text-white/40 text-sm">Built</span></div>}
                {p.list_price && p.sqft && <div className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-amber-400/70" /><span className="text-white text-lg font-semibold">${Math.round(p.list_price / p.sqft)}</span><span className="text-white/40 text-sm">/Sq Ft</span></div>}
              </div>
            </div>

            {/* Quick Facts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { icon: Building2, label: 'Type', value: p.property_sub_type || p.property_type },
                { icon: Calendar, label: 'Year Built', value: p.year_built },
                { icon: Ruler, label: 'Lot Size', value: p.lot_size ? `${p.lot_size} acres` : null },
                { icon: DollarSign, label: 'HOA', value: p.has_hoa === false ? 'None' : p.hoa_fee ? `$${p.hoa_fee}/mo` : 'None' },
                { icon: Car, label: 'Garage', value: p.garage ? `${p.garage_spaces || ''} Car Garage` : 'No Garage' },
              ].filter(f => f.value).map((fact, i) => (
                <div key={`qf-${i}`} className="bg-white/5 rounded-lg p-3 text-center">
                  <fact.icon className="w-5 h-5 text-amber-400/60 mx-auto mb-1" />
                  <p className="text-white text-sm font-medium">{fact.value}</p>
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
                  <TabsTrigger value="features" className="data-[state=active]:bg-amber-500 data-[state=active]:text-[#0a1628] data-[state=active]:font-bold data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/40 text-white/70 hover:text-amber-300 hover:bg-white/5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200">Features</TabsTrigger>
                  <TabsTrigger value="around" className="data-[state=active]:bg-amber-500 data-[state=active]:text-[#0a1628] data-[state=active]:font-bold data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/40 text-white/70 hover:text-amber-300 hover:bg-white/5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200">Around This Home</TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:bg-amber-500 data-[state=active]:text-[#0a1628] data-[state=active]:font-bold data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/40 text-white/70 hover:text-amber-300 hover:bg-white/5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200">Sale & Tax</TabsTrigger>
                  <TabsTrigger value="public-record" className="data-[state=active]:bg-amber-500 data-[state=active]:text-[#0a1628] data-[state=active]:font-bold data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/40 text-white/70 hover:text-amber-300 hover:bg-white/5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200">Public Record</TabsTrigger>
                  <TabsTrigger value="map" className="data-[state=active]:bg-amber-500 data-[state=active]:text-[#0a1628] data-[state=active]:font-bold data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/40 text-white/70 hover:text-amber-300 hover:bg-white/5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200">Map</TabsTrigger>
                </TabsList>
              </div>

              {/* Overview */}
              <TabsContent value="overview" className="space-y-8 mt-6">
                {/* Open Houses */}
                {p.open_house_date && (
                  <Card className="bg-amber-400/10 border-amber-400/20">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Calendar className="w-6 h-6 text-amber-400" />
                      <div>
                        <p className="text-white font-medium">Open House: {p.open_house_date}</p>
                        {p.open_house_start && <p className="text-white/60 text-sm">{p.open_house_start} — {p.open_house_end}</p>}
                        {p.open_house_remarks && <p className="text-white/50 text-sm">{p.open_house_remarks}</p>}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {!p.open_house_date && (
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-white/40 text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> No upcoming open houses scheduled.
                      <button onClick={() => navigate('/book/mel')} className="text-amber-400 hover:underline ml-1">Schedule a private showing</button>
                    </p>
                  </div>
                )}

                {p.description && (
                  <div>
                    <SectionTitle icon={Home}>About This Home</SectionTitle>
                    <p className="text-white/70 leading-relaxed text-[15px]">{p.description}</p>
                  </div>
                )}

                {p.directions && (
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-white/50 text-sm"><Compass className="w-4 h-4 inline mr-1.5 text-amber-400/60" /><span className="font-medium text-white/70">Directions:</span> {p.directions}</p>
                  </div>
                )}

                <div className="bg-white/5 rounded-lg p-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
                  {p.mls_id && <span className="text-white/50">MLS# <span className="text-white font-medium">{p.mls_id}</span></span>}
                  {p.listing_agent && <span className="text-white/50">Listed by <span className="text-white font-medium">{p.listing_agent}</span></span>}
                  {p.listing_office && <span className="text-white/50">Office: <span className="text-white font-medium">{p.listing_office}</span></span>}
                  {p.days_on_market != null && <span className="text-white/50"><Clock className="w-3.5 h-3.5 inline mr-1" />{p.days_on_market} days on market</span>}
                </div>
              </TabsContent>

              {/* Property Details */}
              <TabsContent value="details" className="mt-6">
                <SectionTitle icon={FileText}>Property Details</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <DetailRow label="Property Type" value={p.property_type} />
                    <DetailRow label="Sub Type" value={p.property_sub_type} />
                    <DetailRow label="Bedrooms" value={p.bedrooms} />
                    <DetailRow label="Bathrooms" value={p.bathrooms} />
                    <DetailRow label="Square Footage" value={fmtNum(p.sqft)} />
                    <DetailRow label="Lot Size" value={p.lot_size ? `${p.lot_size} acres` : null} />
                    <DetailRow label="Year Built" value={p.year_built} />
                    <DetailRow label="New Construction" value={p.new_construction} />
                    <DetailRow label="Direction Faces" value={p.direction_faces} />
                  </div>
                  <div>
                    <DetailRow label="Construction" value={p.construction?.join(', ')} />
                    <DetailRow label="Roof" value={p.roof?.join(', ')} />
                    <DetailRow label="Flooring" value={p.flooring?.join(', ')} />
                    <DetailRow label="Heating" value={p.heating?.join(', ')} />
                    <DetailRow label="Cooling" value={p.cooling?.join(', ')} />
                    <DetailRow label="Water Source" value={p.water_source?.join(', ')} />
                    <DetailRow label="Sewer" value={p.sewer?.join(', ')} />
                    <DetailRow label="Laundry" value={p.laundry?.join(', ')} />
                    <DetailRow label="Garage" value={p.garage ? `Yes (${p.garage_spaces || ''}${p.garage_spaces ? ' spaces' : ''})` : 'No'} />
                    <DetailRow label="Pool" value={p.pool || 'None'} />
                  </div>
                </div>
              </TabsContent>

              {/* Features */}
              <TabsContent value="features" className="space-y-4 mt-6">
                <SectionTitle icon={Home}>Features & Amenities</SectionTitle>
                <FeaturePills items={p.features} label="Interior" />
                <FeaturePills items={p.exterior_features} label="Exterior" />
                <FeaturePills items={p.appliances} label="Appliances" />
                <FeaturePills items={p.community_features} label="Community" />
                <FeaturePills items={p.security_features} label="Security" />
                <FeaturePills items={p.patio_features} label="Patio & Porch" />
                <FeaturePills items={p.window_features} label="Windows" />
                <FeaturePills items={p.parking_features} label="Parking" />
                <FeaturePills items={p.showing_requirements} label="Showing Requirements" />
                {!p.features?.length && !p.exterior_features?.length && !p.appliances?.length && !p.community_features?.length && (
                  <p className="text-white/40 py-8 text-center">No feature details available.</p>
                )}
              </TabsContent>

              {/* Around This Home */}
              <TabsContent value="around" className="space-y-8 mt-6">
                {/* Schools */}
                <div>
                  <SectionTitle icon={School}>Schools</SectionTitle>
                  {(p.elementary_school || p.middle_school || p.high_school) ? (
                    <div className="space-y-3">
                      {[{ level: 'Elementary', name: p.elementary_school }, { level: 'Middle', name: p.middle_school }, { level: 'High School', name: p.high_school }].filter(s => s.name).map((s, i) => (
                        <div key={`sch-${i}`} className="flex items-center gap-4 bg-white/5 rounded-lg p-4">
                          <div className="w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center shrink-0"><School className="w-6 h-6 text-amber-400" /></div>
                          <div><p className="text-white font-medium">{s.name}</p><p className="text-white/40 text-sm">{s.level}</p></div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-white/40 text-sm">School info not available from MLS.</p>}
                </div>

                {/* Community & Lifestyle */}
                {p.community_features?.length > 0 && (
                  <div>
                    <SectionTitle icon={TreePine}>Community Features</SectionTitle>
                    <div className="flex flex-wrap gap-2">
                      {p.community_features.map((f, i) => <Badge key={`cf-${i}`} variant="outline" className="border-white/15 text-white/70 bg-white/5 py-1.5 px-3">{f}</Badge>)}
                    </div>
                  </div>
                )}

                {/* Flood Zone */}
                {p.flood_zone && (
                  <div>
                    <SectionTitle icon={Droplets}>Flood & Environmental</SectionTitle>
                    <div className="bg-white/5 rounded-lg p-4 space-y-2">
                      <DetailRow label="Flood Zone" value={p.flood_zone} />
                      <DetailRow label="Waterfront" value={p.waterfront} />
                      <DetailRow label="Senior Community" value={p.senior_community} />
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Sale & Tax History */}
              <TabsContent value="history" className="space-y-8 mt-6">
                <div>
                  <SectionTitle icon={TrendingUp}>Sale History</SectionTitle>
                  <div className="bg-white/5 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-white/10">
                        <th className="text-left p-3 text-white/50 font-medium">Date</th>
                        <th className="text-left p-3 text-white/50 font-medium">Event</th>
                        <th className="text-right p-3 text-white/50 font-medium">Price</th>
                      </tr></thead>
                      <tbody>
                        {p.listing_contract_date && (
                          <tr className="border-b border-white/5">
                            <td className="p-3 text-white/70">{new Date(p.listing_contract_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td className="p-3"><Badge className="bg-blue-500/20 text-blue-400 border-none">Listed</Badge></td>
                            <td className="p-3 text-right text-white font-medium">{fmt(p.original_list_price || p.list_price)}</td>
                          </tr>
                        )}
                        {p.original_list_price && p.original_list_price !== p.list_price && (
                          <tr className="border-b border-white/5">
                            <td className="p-3 text-white/70">—</td>
                            <td className="p-3"><Badge className="bg-yellow-500/20 text-yellow-400 border-none">Price Changed</Badge></td>
                            <td className="p-3 text-right text-white font-medium">{fmt(p.list_price)}</td>
                          </tr>
                        )}
                        {p.close_date && (
                          <tr className="border-b border-white/5">
                            <td className="p-3 text-white/70">{new Date(p.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td className="p-3"><Badge className="bg-green-500/20 text-green-400 border-none">Sold</Badge></td>
                            <td className="p-3 text-right text-white font-medium">{fmt(p.close_price)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    {!p.listing_contract_date && !p.close_date && <p className="p-4 text-white/40 text-center">No sale history available from MLS.</p>}
                  </div>
                </div>

                <div>
                  <SectionTitle icon={FileText}>Tax Information</SectionTitle>
                  <div className="bg-white/5 rounded-lg p-4">
                    <DetailRow label="Annual Tax" value={p.tax_amount ? `${fmt(p.tax_amount)}` : null} />
                    <DetailRow label="Tax Year" value={p.tax_year} />
                    {p.list_price && p.tax_amount && <DetailRow label="Effective Tax Rate" value={`${((p.tax_amount / p.list_price) * 100).toFixed(2)}%`} />}
                  </div>
                </div>
              </TabsContent>

              {/* Public Record & Zoning */}
              <TabsContent value="public-record" className="space-y-8 mt-6">
                <div>
                  <SectionTitle icon={FileText}>Public Record</SectionTitle>
                  <div className="bg-white/5 rounded-lg p-4">
                    <DetailRow label="Subdivision" value={p.subdivision} />
                    <DetailRow label="County" value={p.county} />
                    <DetailRow label="Tax Legal Description" value={p.tax_legal_description} />
                    <DetailRow label="Tax Block" value={p.tax_block} />
                    <DetailRow label="Tax Lot" value={p.tax_lot} />
                    <DetailRow label="Tax Book" value={p.tax_book} />
                    <DetailRow label="Flood Zone" value={p.flood_zone} />
                    <DetailRow label="Zoning" value={p.zoning} />
                    <DetailRow label="Year Built" value={p.year_built} />
                    <DetailRow label="Lot Size" value={p.lot_size ? `${p.lot_size} acres` : null} />
                    <DetailRow label="Square Footage" value={fmtNum(p.sqft)} />
                  </div>
                </div>

                <div>
                  <SectionTitle icon={Info}>Market Insights</SectionTitle>
                  <div className="bg-white/5 rounded-lg p-4 space-y-3">
                    {p.list_price && p.sqft && <DetailRow label="Price per Sq Ft" value={`$${Math.round(p.list_price / p.sqft)}`} />}
                    <DetailRow label="Days on Market" value={p.days_on_market} />
                    <DetailRow label="Status" value={p.status} />
                    <DetailRow label="MLS #" value={p.mls_id} />
                    <DetailRow label="Listing Date" value={p.listing_contract_date ? new Date(p.listing_contract_date).toLocaleDateString() : null} />
                    <DetailRow label="Expiration Date" value={p.listing_expiration_date ? new Date(p.listing_expiration_date).toLocaleDateString() : null} />
                  </div>
                </div>
              </TabsContent>

              {/* Map */}
              <TabsContent value="map" className="mt-6">
                <SectionTitle icon={MapPin}>Location</SectionTitle>
                {p.latitude && p.longitude ? (
                  <div className="rounded-xl overflow-hidden h-[400px]">
                    <MapContainer center={[p.latitude, p.longitude]} zoom={15} className="w-full h-full" style={{ background: '#0d1f3c' }}>
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                      <Marker position={[p.latitude, p.longitude]} icon={goldIcon}><Popup><strong>{p.address}</strong><br/>{fmt(p.list_price)}</Popup></Marker>
                    </MapContainer>
                  </div>
                ) : <p className="text-white/40 py-8 text-center">Map not available.</p>}
              </TabsContent>
            </Tabs>

            {/* Payment Calculator - after tabs, before agent info */}
            {p.list_price && p.list_price < 2000000 && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <SectionTitle icon={DollarSign}>Payment Calculator</SectionTitle>
                  <MortgageCalculator 
                    propertyPrice={p.list_price} 
                    propertyAddress={`${p.address}, ${p.city}, ${p.state} ${p.zip_code}`}
                    propertyTaxRate={p.tax_amount && p.list_price ? (p.tax_amount / p.list_price) * 100 : 1.1}
                    embedded={true}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right Sidebar ── */}
          <div className="hidden lg:block">
            <div className="sticky top-6 space-y-6 max-h-[calc(100vh-3rem)] overflow-y-auto scrollbar-hide">
            {/* Schedule Viewing */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-serif text-white font-bold">Schedule a Private Viewing</h3>
                  <p className="text-white/50 text-sm mt-1">See this property in person</p>
                </div>
                <Button className="w-full bg-amber-400 hover:bg-amber-500 text-black font-semibold h-12 text-base" onClick={() => navigate('/book/mel')} data-testid="schedule-viewing-btn">
                  <Calendar className="w-5 h-5 mr-2" /> Schedule Viewing
                </Button>
                <Button variant="outline" className="w-full border-amber-400/30 text-amber-400 hover:bg-amber-400/10 h-11" onClick={() => window.location.href = 'tel:+18134540004'}>
                  <Phone className="w-4 h-4 mr-2" /> Call (813) 454-0004
                </Button>
                <a href="mailto:mel@hiddenhavenrealty.com" className="flex items-center gap-3 text-white/60 hover:text-amber-400 text-sm"><Mail className="w-4 h-4" /> mel@hiddenhavenrealty.com</a>
                {p.virtual_tour_url && <a href={p.virtual_tour_url} target="_blank" rel="noopener noreferrer" className="block"><Button variant="outline" className="w-full border-white/20 text-white/70"><Eye className="w-4 h-4 mr-2" /> Virtual Tour</Button></a>}
              </CardContent>
            </Card>

            {/* Listing Agent */}
            {p.listing_agent && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-5">
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Listing Agent</p>
                  <p className="text-white font-medium">{p.listing_agent}</p>
                  {p.listing_office && <p className="text-white/50 text-sm">{p.listing_office}</p>}
                </CardContent>
              </Card>
            )}

            {/* At a Glance */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-5">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-3">At a Glance</p>
                <DetailRow label="Price/SqFt" value={p.list_price && p.sqft ? `$${Math.round(p.list_price / p.sqft)}` : null} />
                <DetailRow label="Status" value={p.status} />
                <DetailRow label="Days on Market" value={p.days_on_market} />
                <DetailRow label="Year Built" value={p.year_built} />
                <DetailRow label="Subdivision" value={p.subdivision} />
                <DetailRow label="Flood Zone" value={p.flood_zone} />
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Mobile-only sidebar content */}
          <div className="lg:hidden space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-serif text-white font-bold">Schedule a Private Viewing</h3>
                  <p className="text-white/50 text-sm mt-1">See this property in person</p>
                </div>
                <Button className="w-full bg-amber-400 hover:bg-amber-500 text-black font-semibold h-12 text-base" onClick={() => navigate('/book/mel')}>
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
      {lightboxOpen && (
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
    </div>
  );
};

export default MLSPropertyDetailPage;
