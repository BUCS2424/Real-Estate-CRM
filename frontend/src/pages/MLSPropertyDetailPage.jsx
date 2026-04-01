import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Bed, Bath, Square, DollarSign, Calendar, Home,
  Building2, Loader2, ChevronLeft, ChevronRight, X, Car, Waves, Phone, Mail
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { PublicSiteHeader } from '../components/public/PublicSiteHeader';
import { PublicSeoHead } from '../components/public/PublicSeoHead';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const formatPrice = (price) => {
  if (!price) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
};

export const MLSPropertyDetailPage = () => {
  const { mlsId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
  }, [mlsId]);

  const photos = property?.all_photos || property?.photos || [];

  const nextPhoto = () => setActivePhoto(prev => (prev + 1) % photos.length);
  const prevPhoto = () => setActivePhoto(prev => (prev - 1 + photos.length) % photos.length);

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

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <PublicSeoHead
        title={`${property.address} | Hidden Haven Realty`}
        description={`${property.bedrooms} bed, ${property.bathrooms} bath property at ${property.address}, ${property.city} FL ${property.zip_code}`}
      />
      <PublicSiteHeader />

      {/* Back Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm mb-4" data-testid="back-button">
          <ArrowLeft className="w-4 h-4" /> Back to Listings
        </button>
      </div>

      {/* Hero Photo Gallery */}
      {photos.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="relative rounded-xl overflow-hidden cursor-pointer group" onClick={() => setLightboxOpen(true)} data-testid="photo-gallery">
            <img
              src={photos[activePhoto]}
              alt={property.address}
              className="w-full h-[400px] lg:h-[500px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <div className="absolute bottom-4 right-4">
              <Badge className="bg-black/60 text-white border-none">
                {activePhoto + 1} / {photos.length} photos
              </Badge>
            </div>
          </div>

          {/* Thumbnail strip */}
          {photos.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              {photos.slice(0, 12).map((photo, idx) => (
                <button
                  key={`thumb-${idx}`}
                  onClick={() => setActivePhoto(idx)}
                  className={`w-20 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                    idx === activePhoto ? 'border-amber-400' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
              {photos.length > 12 && (
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="w-20 h-14 rounded-lg bg-white/10 shrink-0 flex items-center justify-center text-white/60 text-xs"
                >
                  +{photos.length - 12} more
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Property Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <p className="text-amber-400 text-3xl lg:text-4xl font-serif font-bold mb-2">
                {formatPrice(property.list_price)}
              </p>
              <h1 className="text-2xl lg:text-3xl font-serif text-white mb-1" data-testid="property-address">
                {property.address}
              </h1>
              <p className="text-white/50 text-lg flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400/70" />
                {property.city}, {property.state} {property.zip_code}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-6 py-4 border-y border-white/10">
              {property.bedrooms && (
                <div className="flex items-center gap-2 text-white">
                  <Bed className="w-5 h-5 text-amber-400/70" />
                  <span className="text-lg font-medium">{property.bedrooms}</span>
                  <span className="text-white/50 text-sm">Beds</span>
                </div>
              )}
              {property.bathrooms && (
                <div className="flex items-center gap-2 text-white">
                  <Bath className="w-5 h-5 text-amber-400/70" />
                  <span className="text-lg font-medium">{property.bathrooms}</span>
                  <span className="text-white/50 text-sm">Baths</span>
                </div>
              )}
              {property.sqft && (
                <div className="flex items-center gap-2 text-white">
                  <Square className="w-5 h-5 text-amber-400/70" />
                  <span className="text-lg font-medium">{property.sqft?.toLocaleString()}</span>
                  <span className="text-white/50 text-sm">Sqft</span>
                </div>
              )}
              {property.year_built && (
                <div className="flex items-center gap-2 text-white">
                  <Calendar className="w-5 h-5 text-amber-400/70" />
                  <span className="text-lg font-medium">{property.year_built}</span>
                  <span className="text-white/50 text-sm">Built</span>
                </div>
              )}
              {property.lot_size && (
                <div className="flex items-center gap-2 text-white">
                  <Home className="w-5 h-5 text-amber-400/70" />
                  <span className="text-lg font-medium">{property.lot_size}</span>
                  <span className="text-white/50 text-sm">Acres</span>
                </div>
              )}
            </div>

            {/* Description */}
            {property.description && (
              <div>
                <h2 className="text-xl font-serif text-white mb-3">About This Property</h2>
                <p className="text-white/70 leading-relaxed">{property.description}</p>
              </div>
            )}

            {/* Features */}
            {property.features?.length > 0 && (
              <div>
                <h2 className="text-xl font-serif text-white mb-3">Interior Features</h2>
                <div className="flex flex-wrap gap-2">
                  {property.features.map((f, i) => (
                    <Badge key={`feat-${i}`} variant="outline" className="border-white/20 text-white/70">{f}</Badge>
                  ))}
                </div>
              </div>
            )}

            {property.exterior_features?.length > 0 && (
              <div>
                <h2 className="text-xl font-serif text-white mb-3">Exterior Features</h2>
                <div className="flex flex-wrap gap-2">
                  {property.exterior_features.map((f, i) => (
                    <Badge key={`ext-${i}`} variant="outline" className="border-white/20 text-white/70">{f}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Property Details Grid */}
            <div>
              <h2 className="text-xl font-serif text-white mb-3">Property Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {property.property_type && (
                  <div><p className="text-white/40 text-xs">Type</p><p className="text-white text-sm">{property.property_type}</p></div>
                )}
                {property.property_sub_type && (
                  <div><p className="text-white/40 text-xs">Sub Type</p><p className="text-white text-sm">{property.property_sub_type}</p></div>
                )}
                {property.subdivision && (
                  <div><p className="text-white/40 text-xs">Subdivision</p><p className="text-white text-sm">{property.subdivision}</p></div>
                )}
                {property.county && (
                  <div><p className="text-white/40 text-xs">County</p><p className="text-white text-sm">{property.county}</p></div>
                )}
                {property.hoa_fee && (
                  <div><p className="text-white/40 text-xs">HOA Fee</p><p className="text-white text-sm">${property.hoa_fee}/mo</p></div>
                )}
                {property.tax_amount && (
                  <div><p className="text-white/40 text-xs">Annual Tax</p><p className="text-white text-sm">${property.tax_amount?.toLocaleString()}</p></div>
                )}
                {property.parking && (
                  <div><p className="text-white/40 text-xs">Parking</p><p className="text-white text-sm">{property.parking}</p></div>
                )}
                {property.pool && (
                  <div><p className="text-white/40 text-xs">Pool</p><p className="text-white text-sm">{property.pool}</p></div>
                )}
                {property.days_on_market != null && (
                  <div><p className="text-white/40 text-xs">Days on Market</p><p className="text-white text-sm">{property.days_on_market}</p></div>
                )}
                {property.mls_id && (
                  <div><p className="text-white/40 text-xs">MLS #</p><p className="text-white text-sm">{property.mls_id}</p></div>
                )}
              </div>
            </div>

            {/* Schools */}
            {(property.elementary_school || property.middle_school || property.high_school) && (
              <div>
                <h2 className="text-xl font-serif text-white mb-3">Schools</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {property.elementary_school && (
                    <div><p className="text-white/40 text-xs">Elementary</p><p className="text-white text-sm">{property.elementary_school}</p></div>
                  )}
                  {property.middle_school && (
                    <div><p className="text-white/40 text-xs">Middle</p><p className="text-white text-sm">{property.middle_school}</p></div>
                  )}
                  {property.high_school && (
                    <div><p className="text-white/40 text-xs">High School</p><p className="text-white text-sm">{property.high_school}</p></div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Schedule Viewing */}
          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10 sticky top-24">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-serif text-white font-bold">Interested in this property?</h3>
                <p className="text-white/60 text-sm">Schedule a private viewing with our team. We'll arrange an exclusive tour just for you.</p>

                <Button
                  className="w-full bg-amber-400 hover:bg-amber-500 text-black font-medium h-12 text-base"
                  onClick={() => navigate('/book/mel')}
                  data-testid="schedule-viewing-btn"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Schedule a Private Viewing
                </Button>

                <div className="border-t border-white/10 pt-4 space-y-3">
                  <p className="text-white/40 text-xs uppercase tracking-wider">Or contact us directly</p>
                  <a href="tel:+18135550000" className="flex items-center gap-3 text-white/70 hover:text-amber-400 transition-colors text-sm">
                    <Phone className="w-4 h-4" /> (813) 555-0000
                  </a>
                  <a href="mailto:mel@hiddenhavenrealty.com" className="flex items-center gap-3 text-white/70 hover:text-amber-400 transition-colors text-sm">
                    <Mail className="w-4 h-4" /> mel@hiddenhavenrealty.com
                  </a>
                </div>

                {property.listing_agent && (
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-white/40 text-xs">Listing Agent</p>
                    <p className="text-white text-sm">{property.listing_agent}</p>
                    {property.listing_office && <p className="text-white/50 text-xs">{property.listing_office}</p>}
                  </div>
                )}

                {property.virtual_tour_url && (
                  <a
                    href={property.virtual_tour_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" className="w-full border-amber-400/30 text-amber-400 hover:bg-amber-400/10">
                      View Virtual Tour
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightboxOpen(false)}>
            <X className="w-8 h-8" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <img
            src={photos[activePhoto]}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
          <div className="absolute bottom-4 text-white/50 text-sm">{activePhoto + 1} / {photos.length}</div>
        </div>
      )}
    </div>
  );
};

export default MLSPropertyDetailPage;
