import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { landingPagesAPI, analyticsAPI } from '../lib/api';
import { 
  Bed, 
  Bath, 
  Square, 
  MapPin, 
  Phone, 
  Mail, 
  User,
  Play,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Home,
  Calendar,
  Check
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export const PropertyLandingPage = () => {
  const { slug } = useParams();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingSessionId, setTrackingSessionId] = useState(null);
  const [trackingStart, setTrackingStart] = useState(null);
  
  // Contact form
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  useEffect(() => {
    fetchPageData();
  }, [slug]);

  useEffect(() => {
    const startTrackingSession = async () => {
      if (!pageData) return;
      const params = new URLSearchParams(window.location.search);
      const paramId = params.get('tracking_id');
      const cookieMatch = document.cookie.match(/(?:^|; )mls_tracking_id=([^;]+)/);
      const cookieId = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
      const trackingId = paramId || cookieId;

      if (!trackingId) return;

      try {
        const response = await analyticsAPI.startSession({
          tracking_id: trackingId,
          landing_slug: slug,
          landing_url: window.location.href,
          user_agent: navigator.userAgent
        });
        setTrackingSessionId(response.data.session_id);
        setTrackingStart(Date.now());
      } catch (error) {
        console.error('Tracking start failed', error);
      }
    };

    startTrackingSession();
  }, [pageData, slug]);

  useEffect(() => {
    if (!trackingSessionId || !trackingStart) return;

    const handleBeforeUnload = () => {
      const duration = Math.floor((Date.now() - trackingStart) / 1000);
      const payload = JSON.stringify({
        session_id: trackingSessionId,
        duration_seconds: duration
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `${process.env.REACT_APP_BACKEND_URL}/api/analytics/session/end`,
          new Blob([payload], { type: 'application/json' })
        );
      } else {
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/analytics/session/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [trackingSessionId, trackingStart]);

  const fetchPageData = async () => {
    try {
      const res = await landingPagesAPI.getPublicPage(slug);
      setPageData(res.data);
    } catch (error) {
      setError('Property not found');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email) {
      toast.error('Please fill in your name and email');
      return;
    }
    
    setSubmitting(true);
    try {
      await landingPagesAPI.submitContactForm(slug, contactForm);
      setSubmitted(true);
      toast.success('Thank you! We will be in touch soon.');
    } catch (error) {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  const getYouTubeId = (url) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const getVimeoId = (url) => {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
        <Loader2 className="w-12 h-12 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error || !pageData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1628] text-white">
        <div className="text-center">
          <Home className="w-16 h-16 mx-auto mb-4 text-amber-400" />
          <h1 className="text-2xl font-serif mb-2">Property Not Found</h1>
          <p className="text-white/60">This listing may no longer be available.</p>
        </div>
      </div>
    );
  }

  const { listing, theme } = pageData;
  const isLuxury = theme === 'luxury';
  const allImages = [...(listing?.images || []), ...(pageData.additional_images || [])];

  // Luxury Dark Theme
  if (isLuxury) {
    return (
      <div className="min-h-screen bg-[#0a1628] text-white">
        {/* Hero Section */}
        <div className="relative h-[70vh] overflow-hidden">
          {allImages.length > 0 && (
            <>
              <img 
                src={allImages[activeImage]?.url} 
                alt={listing?.address}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/30 to-transparent" />
              
              {/* Image Navigation */}
              {allImages.length > 1 && (
                <>
                  <button 
                    onClick={() => setActiveImage(prev => prev === 0 ? allImages.length - 1 : prev - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => setActiveImage(prev => prev === allImages.length - 1 ? 0 : prev + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  
                  {/* Thumbnails */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                    {allImages.slice(0, 6).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImage(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === activeImage ? 'bg-amber-400 w-6' : 'bg-white/50 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          
          {/* Price Badge */}
          <div className="absolute top-6 right-6 bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 rounded-lg shadow-lg">
            <span className="text-2xl font-bold text-black">{formatPrice(listing?.price || 0)}</span>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 -mt-20 relative z-10">
          {/* Title Card */}
          <div className="bg-[#0f1d32] rounded-2xl p-8 shadow-2xl border border-amber-400/20 mb-12">
            <h1 className="text-4xl md:text-5xl font-serif mb-4">
              {pageData.custom_headline || listing?.address}
            </h1>
            <div className="flex items-center gap-2 text-amber-400 mb-6">
              <MapPin className="w-5 h-5" />
              <span className="text-lg">{listing?.city}, {listing?.state} {listing?.zip_code}</span>
            </div>
            
            {/* Property Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <Bed className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                <span className="text-2xl font-bold">{listing?.bedrooms || 0}</span>
                <p className="text-sm text-white/60">Bedrooms</p>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <Bath className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                <span className="text-2xl font-bold">{listing?.bathrooms || 0}</span>
                <p className="text-sm text-white/60">Bathrooms</p>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <Square className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                <span className="text-2xl font-bold">{listing?.sqft?.toLocaleString() || 0}</span>
                <p className="text-sm text-white/60">Sq. Ft.</p>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                <span className="text-2xl font-bold">{listing?.year_built || 'N/A'}</span>
                <p className="text-sm text-white/60">Year Built</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {pageData.custom_description && (
            <div className="mb-12">
              <h2 className="text-2xl font-serif mb-4 text-amber-400">About This Property</h2>
              <p className="text-lg text-white/80 leading-relaxed whitespace-pre-line">
                {pageData.custom_description}
              </p>
            </div>
          )}

          {/* Features */}
          {listing?.features?.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-serif mb-4 text-amber-400">Features</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {listing.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-white/5 rounded-lg">
                    <Check className="w-4 h-4 text-amber-400" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {pageData.videos?.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-serif mb-6 text-amber-400">Property Videos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pageData.videos.map(video => (
                  <div key={video.id} className="relative group">
                    {video.source === 'youtube' && (
                      <div className="aspect-video rounded-xl overflow-hidden">
                        <iframe
                          src={`https://www.youtube.com/embed/${getYouTubeId(video.url)}`}
                          title={video.title}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    )}
                    {video.source === 'vimeo' && (
                      <div className="aspect-video rounded-xl overflow-hidden">
                        <iframe
                          src={`https://player.vimeo.com/video/${getVimeoId(video.url)}`}
                          title={video.title}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    )}
                    {video.source === 'upload' && (
                      <video 
                        src={video.url} 
                        controls 
                        className="w-full aspect-video rounded-xl"
                      />
                    )}
                    {video.title && (
                      <p className="mt-2 text-sm text-white/60">{video.title}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Virtual Tour */}
          {pageData.virtual_tour_url && (
            <div className="mb-12">
              <h2 className="text-2xl font-serif mb-6 text-amber-400">Virtual Tour</h2>
              <div className="aspect-video rounded-xl overflow-hidden">
                <iframe
                  src={pageData.virtual_tour_url}
                  title="Virtual Tour"
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* Image Gallery */}
          {allImages.length > 1 && (
            <div className="mb-12">
              <h2 className="text-2xl font-serif mb-6 text-amber-400">Photo Gallery</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {allImages.map((img, idx) => (
                  <div 
                    key={idx} 
                    className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => { setActiveImage(idx); setShowLightbox(true); }}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map */}
          {pageData.show_map && listing?.address && (
            <div className="mb-12">
              <h2 className="text-2xl font-serif mb-6 text-amber-400">Location</h2>
              <div className="aspect-[2/1] rounded-xl overflow-hidden">
                <iframe
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(`${listing.address}, ${listing.city}, ${listing.state} ${listing.zip_code}`)}`}
                  className="w-full h-full"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Agent & Contact */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Agent Info */}
            {pageData.agent_name && (
              <div className="bg-[#0f1d32] rounded-2xl p-8 border border-amber-400/20">
                <h2 className="text-2xl font-serif mb-6 text-amber-400">Your Agent</h2>
                <div className="flex items-start gap-4">
                  {pageData.agent_photo ? (
                    <img 
                      src={pageData.agent_photo} 
                      alt={pageData.agent_name}
                      className="w-24 h-24 rounded-full object-cover border-2 border-amber-400"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-amber-400/20 flex items-center justify-center">
                      <User className="w-10 h-10 text-amber-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{pageData.agent_name}</h3>
                    {pageData.agent_phone && (
                      <a href={`tel:${pageData.agent_phone}`} className="flex items-center gap-2 text-white/70 hover:text-amber-400 mb-2">
                        <Phone className="w-4 h-4" />
                        {pageData.agent_phone}
                      </a>
                    )}
                    {pageData.agent_email && (
                      <a href={`mailto:${pageData.agent_email}`} className="flex items-center gap-2 text-white/70 hover:text-amber-400">
                        <Mail className="w-4 h-4" />
                        {pageData.agent_email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Contact Form */}
            {pageData.show_contact_form && (
              <div className="bg-[#0f1d32] rounded-2xl p-8 border border-amber-400/20">
                <h2 className="text-2xl font-serif mb-6 text-amber-400">Schedule a Viewing</h2>
                {submitted ? (
                  <div className="text-center py-8">
                    <Check className="w-16 h-16 mx-auto mb-4 text-green-500" />
                    <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
                    <p className="text-white/60">We'll be in touch shortly.</p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div>
                      <Label className="text-white/80">Name *</Label>
                      <Input
                        value={contactForm.name}
                        onChange={e => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-white/80">Email *</Label>
                      <Input
                        type="email"
                        value={contactForm.email}
                        onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-white/80">Phone</Label>
                      <Input
                        value={contactForm.phone}
                        onChange={e => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white/80">Message</Label>
                      <Textarea
                        value={contactForm.message}
                        onChange={e => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white"
                        rows={3}
                        placeholder="I'm interested in scheduling a viewing..."
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold"
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Request Information
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center py-8 border-t border-white/10">
            <p className="text-white/40 text-sm">
              © {new Date().getFullYear()} Hidden Haven Realty. All rights reserved.
            </p>
          </div>
        </div>

        {/* Lightbox */}
        {showLightbox && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setShowLightbox(false)}
          >
            <button 
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
            >
              <X className="w-8 h-8" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveImage(prev => prev === 0 ? allImages.length - 1 : prev - 1); }}
              className="absolute left-4 p-3 bg-white/10 rounded-full hover:bg-white/20"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <img 
              src={allImages[activeImage]?.url} 
              alt=""
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={e => e.stopPropagation()}
            />
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveImage(prev => prev === allImages.length - 1 ? 0 : prev + 1); }}
              className="absolute right-4 p-3 bg-white/10 rounded-full hover:bg-white/20"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Modern Light Theme (default)
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Hero */}
      <div className="relative h-[60vh] bg-gray-200">
        {allImages.length > 0 && (
          <>
            <img 
              src={allImages[activeImage]?.url} 
              alt={listing?.address}
              className="w-full h-full object-cover"
            />
            {allImages.length > 1 && (
              <>
                <button 
                  onClick={() => setActiveImage(prev => prev === 0 ? allImages.length - 1 : prev - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 rounded-full shadow-lg hover:bg-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setActiveImage(prev => prev === allImages.length - 1 ? 0 : prev + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 rounded-full shadow-lg hover:bg-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </>
        )}
        <div className="absolute top-4 right-4 bg-blue-600 text-white px-5 py-2 rounded-lg shadow-lg">
          <span className="text-xl font-bold">{formatPrice(listing?.price || 0)}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {pageData.custom_headline || listing?.address}
          </h1>
          <p className="text-gray-500 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {listing?.city}, {listing?.state} {listing?.zip_code}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="text-center p-4 bg-white rounded-xl shadow-sm">
            <Bed className="w-6 h-6 mx-auto mb-1 text-blue-600" />
            <span className="text-xl font-bold">{listing?.bedrooms}</span>
            <p className="text-xs text-gray-500">Beds</p>
          </div>
          <div className="text-center p-4 bg-white rounded-xl shadow-sm">
            <Bath className="w-6 h-6 mx-auto mb-1 text-blue-600" />
            <span className="text-xl font-bold">{listing?.bathrooms}</span>
            <p className="text-xs text-gray-500">Baths</p>
          </div>
          <div className="text-center p-4 bg-white rounded-xl shadow-sm">
            <Square className="w-6 h-6 mx-auto mb-1 text-blue-600" />
            <span className="text-xl font-bold">{listing?.sqft?.toLocaleString()}</span>
            <p className="text-xs text-gray-500">Sq Ft</p>
          </div>
          <div className="text-center p-4 bg-white rounded-xl shadow-sm">
            <Calendar className="w-6 h-6 mx-auto mb-1 text-blue-600" />
            <span className="text-xl font-bold">{listing?.year_built || 'N/A'}</span>
            <p className="text-xs text-gray-500">Year</p>
          </div>
        </div>

        {/* Description */}
        {pageData.custom_description && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3">About This Home</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
              {pageData.custom_description}
            </p>
          </div>
        )}

        {/* Features */}
        {listing?.features?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Features</h2>
            <div className="flex flex-wrap gap-2">
              {listing.features.map((feature, idx) => (
                <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {pageData.videos?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Videos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pageData.videos.map(video => (
                <div key={video.id} className="aspect-video rounded-xl overflow-hidden shadow-sm">
                  {video.source === 'youtube' && (
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeId(video.url)}`}
                      title={video.title}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  )}
                  {video.source === 'vimeo' && (
                    <iframe
                      src={`https://player.vimeo.com/video/${getVimeoId(video.url)}`}
                      title={video.title}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  )}
                  {video.source === 'upload' && (
                    <video src={video.url} controls className="w-full h-full" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Form */}
        {pageData.show_contact_form && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-semibold mb-4">Interested in This Property?</h2>
            {submitted ? (
              <div className="text-center py-8">
                <Check className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p className="text-lg font-medium">Thank you! We'll contact you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={contactForm.name}
                    onChange={e => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={contactForm.email}
                    onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={contactForm.phone}
                    onChange={e => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Message</Label>
                  <Input
                    value={contactForm.message}
                    onChange={e => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="I'd like to schedule a viewing..."
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Send Inquiry
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 py-6 border-t">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Hidden Haven Realty
          </p>
        </div>
      </div>
    </div>
  );
};
