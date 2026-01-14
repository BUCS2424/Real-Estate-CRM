import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicAPI } from '../lib/api';
import { 
  ChevronLeft, 
  ChevronRight, 
  Bed, 
  Bath, 
  Square, 
  MapPin,
  Calendar,
  Car,
  Home,
  Phone,
  Mail,
  ArrowLeft,
  Heart,
  Share2,
  X,
  Loader2,
  Check
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

const formatPrice = (price) => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 0 
  }).format(price);
};

export const PropertyDetailPage = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await publicAPI.getListing(id);
        setProperty(res.data);
      } catch (error) {
        console.error('Failed to load property');
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

  const handleSubmitInquiry = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('Please enter your name and email');
      return;
    }
    setSubmitting(true);
    try {
      await publicAPI.submitLead({
        ...formData,
        property_id: id,
        source: 'property_detail'
      });
      toast.success('Thank you! An agent will contact you shortly.');
      setFormData({ name: '', email: '', phone: '', message: '' });
      setShowInquiryForm(false);
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center text-white">
        <Home className="w-16 h-16 text-amber-400 mb-4" />
        <h1 className="text-2xl font-serif mb-2">Property Not Found</h1>
        <p className="text-white/60 mb-6">This listing may no longer be available.</p>
        <Link to="/">
          <Button className="bg-amber-400 text-black hover:bg-amber-300">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  const images = property.images?.length > 0 
    ? property.images 
    : [{ url: 'https://images.unsplash.com/photo-1578439297699-eb414262c2de?w=1200&q=80' }];

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a1628]/95 backdrop-blur-sm border-b border-amber-400/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded flex items-center justify-center">
              <span className="font-serif text-black font-bold text-xl">F</span>
            </div>
            <div>
              <h1 className="text-xl font-serif tracking-wide">FUSION</h1>
              <p className="text-[10px] tracking-[0.3em] text-amber-400/80">LUXURY ESTATES</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-white hover:text-amber-400">
              <Heart className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:text-amber-400">
              <Share2 className="w-5 h-5" />
            </Button>
            <Button 
              onClick={() => setShowInquiryForm(true)}
              className="bg-amber-400 text-black hover:bg-amber-300"
            >
              Request Showing
            </Button>
          </div>
        </div>
      </header>

      {/* Image Gallery */}
      <section className="pt-20">
        <div className="relative h-[60vh] md:h-[70vh] bg-black">
          <img 
            src={images[currentImageIndex]?.url}
            alt={property.address}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-transparent to-[#0a1628]/30" />
          
          {images.length > 1 && (
            <>
              <button 
                onClick={() => setCurrentImageIndex(i => i > 0 ? i - 1 : images.length - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setCurrentImageIndex(i => i < images.length - 1 ? i + 1 : 0)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === currentImageIndex ? 'bg-amber-400' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}

          <Badge className="absolute top-24 left-6 bg-amber-400 text-black">OFF MARKET</Badge>
        </div>
      </section>

      {/* Property Details */}
      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-10">
              {/* Title & Price */}
              <div>
                <p className="text-amber-400 tracking-[0.2em] text-sm mb-2">EXCLUSIVE LISTING</p>
                <h1 className="text-4xl md:text-5xl font-serif mb-3">{property.address}</h1>
                <p className="text-xl text-white/70 flex items-center gap-2 mb-6">
                  <MapPin className="w-5 h-5 text-amber-400" />
                  {property.city}, {property.state} {property.zip_code}
                </p>
                <p className="text-5xl md:text-6xl font-serif text-amber-400">{formatPrice(property.price)}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0d1f3c] border border-amber-400/20 rounded-lg p-6 text-center">
                  <Bed className="w-8 h-8 mx-auto mb-3 text-amber-400" />
                  <p className="text-3xl font-serif">{property.bedrooms}</p>
                  <p className="text-white/50 text-sm">Bedrooms</p>
                </div>
                <div className="bg-[#0d1f3c] border border-amber-400/20 rounded-lg p-6 text-center">
                  <Bath className="w-8 h-8 mx-auto mb-3 text-amber-400" />
                  <p className="text-3xl font-serif">{property.bathrooms}</p>
                  <p className="text-white/50 text-sm">Bathrooms</p>
                </div>
                <div className="bg-[#0d1f3c] border border-amber-400/20 rounded-lg p-6 text-center">
                  <Square className="w-8 h-8 mx-auto mb-3 text-amber-400" />
                  <p className="text-3xl font-serif">{property.sqft?.toLocaleString()}</p>
                  <p className="text-white/50 text-sm">Sq Ft</p>
                </div>
                <div className="bg-[#0d1f3c] border border-amber-400/20 rounded-lg p-6 text-center">
                  <Car className="w-8 h-8 mx-auto mb-3 text-amber-400" />
                  <p className="text-3xl font-serif">{property.garage || '-'}</p>
                  <p className="text-white/50 text-sm">Garage</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-2xl font-serif mb-4">About This Property</h2>
                <p className="text-white/70 leading-relaxed whitespace-pre-line">
                  {property.description || 'Contact us for more information about this exclusive off-market property.'}
                </p>
              </div>

              {/* Features */}
              {property.features?.length > 0 && (
                <div>
                  <h2 className="text-2xl font-serif mb-4">Features & Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {property.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-white/70">
                        <Check className="w-4 h-4 text-amber-400" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Details */}
              <div className="grid grid-cols-2 gap-6">
                {property.lot_size && (
                  <div>
                    <p className="text-white/50 text-sm">Lot Size</p>
                    <p className="text-lg">{property.lot_size}</p>
                  </div>
                )}
                {property.year_built && (
                  <div>
                    <p className="text-white/50 text-sm">Year Built</p>
                    <p className="text-lg">{property.year_built}</p>
                  </div>
                )}
                {property.property_type && (
                  <div>
                    <p className="text-white/50 text-sm">Property Type</p>
                    <p className="text-lg capitalize">{property.property_type.replace('_', ' ')}</p>
                  </div>
                )}
                {property.mls_id && (
                  <div>
                    <p className="text-white/50 text-sm">MLS ID</p>
                    <p className="text-lg">{property.mls_id}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-6">
                {/* Contact Card */}
                <div className="bg-[#0d1f3c] border border-amber-400/20 rounded-lg p-6">
                  <h3 className="text-xl font-serif mb-4">Interested in this property?</h3>
                  <p className="text-white/60 text-sm mb-6">
                    This is an exclusive off-market listing. Contact us for a private showing.
                  </p>
                  <Button 
                    onClick={() => setShowInquiryForm(true)}
                    className="w-full bg-amber-400 text-black hover:bg-amber-300 py-6"
                  >
                    Schedule Private Viewing
                  </Button>
                  <div className="mt-6 space-y-3">
                    <a href="tel:+15551234567" className="flex items-center gap-3 text-white/70 hover:text-amber-400 transition-colors">
                      <Phone className="w-5 h-5" />
                      +1 (555) 123-4567
                    </a>
                    <a href="mailto:info@fusionestates.com" className="flex items-center gap-3 text-white/70 hover:text-amber-400 transition-colors">
                      <Mail className="w-5 h-5" />
                      info@fusionestates.com
                    </a>
                  </div>
                </div>

                {/* Back Link */}
                <Link to="/" className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  Back to all listings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Inquiry Form Modal */}
      {showInquiryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0d1f3c] border border-amber-400/20 rounded-lg p-8 max-w-md w-full relative">
            <button 
              onClick={() => setShowInquiryForm(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-serif mb-2">Request Private Showing</h2>
            <p className="text-white/60 text-sm mb-6">{property.address}, {property.city}</p>
            
            <form onSubmit={handleSubmitInquiry} className="space-y-4">
              <Input 
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your Name *"
                required
                className="bg-[#0a1628] border-amber-400/20 text-white placeholder:text-white/40"
              />
              <Input 
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email Address *"
                required
                className="bg-[#0a1628] border-amber-400/20 text-white placeholder:text-white/40"
              />
              <Input 
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone Number"
                className="bg-[#0a1628] border-amber-400/20 text-white placeholder:text-white/40"
              />
              <Textarea 
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Message (optional)"
                rows={3}
                className="bg-[#0a1628] border-amber-400/20 text-white placeholder:text-white/40"
              />
              <Button 
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-400 text-black hover:bg-amber-300 py-6"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Submit Inquiry
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-8 border-t border-amber-400/10 bg-[#071020]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-white/30 text-sm">
            © 2025 Fusion Luxury Estates. Powered By: <a href="https://a2gdesigns.com" target="_blank" rel="noopener noreferrer" className="text-amber-400/70 hover:text-amber-400 transition-colors">A2G</a>
          </p>
        </div>
      </footer>
    </div>
  );
};
