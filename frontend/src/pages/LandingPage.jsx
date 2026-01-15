import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicAPI, propertySubmissionsAPI } from '../lib/api';
import { 
  ChevronLeft, 
  ChevronRight, 
  Bed, 
  Bath, 
  Square, 
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Play,
  Menu,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { EmailVerification } from '../components/EmailVerification';
import { PhoneVerification } from '../components/PhoneVerification';
import { toast } from 'sonner';

// Fallback listings if database is empty
const FALLBACK_LISTINGS = [
  {
    id: '1',
    address: '1200 S Ocean Blvd',
    city: 'Palm Beach',
    state: 'FL',
    price: 45000000,
    bedrooms: 8,
    bathrooms: 12,
    sqft: 18500,
    images: [{ url: 'https://images.unsplash.com/photo-1578439297699-eb414262c2de?w=800&q=80' }]
  }
];

const formatPrice = (price) => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 0 
  }).format(price);
};

export const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [leadType, setLeadType] = useState('buyer');
  const [submitting, setSubmitting] = useState(false);
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Buyer-specific fields
  const [buyerBudget, setBuyerBudget] = useState('');
  const [buyerAreas, setBuyerAreas] = useState('');
  
  // Seller-specific fields
  const [sellerAddress, setSellerAddress] = useState('');
  const [sellerCity, setSellerCity] = useState('');
  const [sellerState, setSellerState] = useState('FL');
  const [sellerPropertyType, setSellerPropertyType] = useState('single_family');
  const [sellerBedrooms, setSellerBedrooms] = useState('');
  const [sellerBathrooms, setSellerBathrooms] = useState('');
  const [sellerSqft, setSellerSqft] = useState('');
  const [sellerAskingPrice, setSellerAskingPrice] = useState('');
  const [sellerTimeline, setSellerTimeline] = useState('');
  const [sellerDescription, setSellerDescription] = useState('');

  // Verification states
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  
  // Consent states
  const [consentEmail, setConsentEmail] = useState(false);
  const [consentSMS, setConsentSMS] = useState(false);

  // Fetch listings from database
  useEffect(() => {
    const fetchListings = async () => {
      try {
        const res = await publicAPI.getListings(12);
        setListings(res.data || []);
      } catch (error) {
        console.error('Failed to load listings');
      } finally {
        setLoadingListings(false);
      }
    };
    fetchListings();
  }, []);

  const checkScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', checkScrollButtons);
      return () => scrollEl.removeEventListener('scroll', checkScrollButtons);
    }
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Auto-scroll effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (scrollRef.current && canScrollRight) {
        scrollRef.current.scrollBy({ left: 1, behavior: 'auto' });
      } else if (scrollRef.current && !canScrollRight) {
        scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }, 50);
    return () => clearInterval(interval);
  }, [canScrollRight]);

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#0a1628]/95 to-transparent backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded flex items-center justify-center">
                <span className="font-serif text-black font-bold text-xl">F</span>
              </div>
              <div>
                <h1 className="text-xl font-serif tracking-wide">FUSION</h1>
                <p className="text-[10px] tracking-[0.3em] text-amber-400/80">LUXURY ESTATES</p>
              </div>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#listings" className="text-sm tracking-wide hover:text-amber-400 transition-colors">LISTINGS</a>
              <a href="#about" className="text-sm tracking-wide hover:text-amber-400 transition-colors">ABOUT</a>
              <a href="#contact" className="text-sm tracking-wide hover:text-amber-400 transition-colors">CONTACT</a>
              <Link to="/login">
                <Button variant="outline" className="border-amber-400/50 text-amber-400 hover:bg-amber-400 hover:text-black">
                  AGENT LOGIN
                </Button>
              </Link>
            </div>

            <button 
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a1628]/98 backdrop-blur-lg border-t border-amber-400/10">
            <div className="px-6 py-4 space-y-4">
              <a href="#listings" className="block text-sm tracking-wide hover:text-amber-400">LISTINGS</a>
              <a href="#about" className="block text-sm tracking-wide hover:text-amber-400">ABOUT</a>
              <a href="#contact" className="block text-sm tracking-wide hover:text-amber-400">CONTACT</a>
              <Link to="/login" className="block">
                <Button variant="outline" className="w-full border-amber-400/50 text-amber-400">
                  AGENT LOGIN
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1578439297699-eb414262c2de?w=1920&q=80)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628]/70 via-[#0a1628]/50 to-[#0a1628]" />
        </div>
        
        <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
          <p className="text-amber-400 tracking-[0.4em] text-sm mb-6 animate-fade-in">OFF MARKET COLLECTION</p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif mb-6 leading-tight">
            Luxury
            <span className="block italic text-amber-400">Defined</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Exclusive access to Florida's most prestigious off-market luxury estates. 
            Where privacy meets unparalleled elegance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#listings">
              <Button size="lg" className="bg-amber-400 text-black hover:bg-amber-300 px-8 py-6 text-base">
                VIEW COLLECTION
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
            <a href="#contact">
              <Button size="lg" variant="outline" className="border-white/30 hover:bg-white/10 px-8 py-6 text-base">
                PRIVATE INQUIRY
              </Button>
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-amber-400 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-amber-400/10 bg-[#071020]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl md:text-5xl font-serif text-amber-400">$2.8B+</p>
              <p className="text-sm text-white/50 mt-2 tracking-wide">PORTFOLIO VALUE</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-serif text-amber-400">150+</p>
              <p className="text-sm text-white/50 mt-2 tracking-wide">OFF-MARKET HOMES</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-serif text-amber-400">25+</p>
              <p className="text-sm text-white/50 mt-2 tracking-wide">YEARS EXPERIENCE</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-serif text-amber-400">100%</p>
              <p className="text-sm text-white/50 mt-2 tracking-wide">DISCRETION</p>
            </div>
          </div>
        </div>
      </section>

      {/* Luxury Listings Carousel */}
      <section id="listings" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6 mb-12">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-amber-400 tracking-[0.3em] text-sm mb-3">EXCLUSIVE PORTFOLIO</p>
              <h2 className="text-4xl md:text-5xl font-serif">
                Off-Market <span className="italic text-amber-400">Estates</span>
              </h2>
            </div>
            <div className="hidden md:flex gap-2">
              <button 
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className={`w-12 h-12 border border-white/20 rounded-full flex items-center justify-center transition-all ${canScrollLeft ? 'hover:bg-white/10 hover:border-amber-400' : 'opacity-30 cursor-not-allowed'}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className={`w-12 h-12 border border-white/20 rounded-full flex items-center justify-center transition-all ${canScrollRight ? 'hover:bg-white/10 hover:border-amber-400' : 'opacity-30 cursor-not-allowed'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrolling Listings */}
        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide px-6 pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loadingListings ? (
            <div className="flex items-center justify-center w-full py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            </div>
          ) : (
            [...(listings.length > 0 ? listings : FALLBACK_LISTINGS), ...(listings.length > 0 ? listings : FALLBACK_LISTINGS)].map((listing, index) => (
              <div 
                key={`${listing.id}-${index}`}
                className="flex-shrink-0 w-[350px] md:w-[400px] group cursor-pointer"
                onClick={() => navigate(`/property/${listing.id}`)}
              >
                <div className="relative overflow-hidden rounded-lg mb-4">
                  <img 
                    src={listing.images?.[0]?.url || 'https://images.unsplash.com/photo-1578439297699-eb414262c2de?w=800&q=80'} 
                    alt={listing.address}
                    className="w-full h-[280px] object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-transparent to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="bg-amber-400 text-black text-xs font-medium px-3 py-1 rounded">
                      OFF MARKET
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-2xl font-serif mb-1">{formatPrice(listing.price)}</p>
                    <p className="text-white/70 text-sm">{listing.address}</p>
                    <p className="text-white/50 text-sm">{listing.city}, {listing.state}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-white/60">
                  <span className="flex items-center gap-1">
                    <Bed className="w-4 h-4" /> {listing.bedrooms} Beds
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="w-4 h-4" /> {listing.bathrooms} Baths
                  </span>
                  <span className="flex items-center gap-1">
                    <Square className="w-4 h-4" /> {listing.sqft?.toLocaleString()} SF
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-center mt-12">
          <a href="#contact">
            <Button variant="outline" className="border-amber-400/50 text-amber-400 hover:bg-amber-400 hover:text-black px-8">
              REQUEST PRIVATE SHOWING
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 md:py-32 bg-gradient-to-b from-transparent via-[#0d1f3c]/50 to-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-amber-400 tracking-[0.3em] text-sm mb-3">ABOUT US</p>
              <h2 className="text-4xl md:text-5xl font-serif mb-6">
                Florida's Premier <span className="italic text-amber-400">Off-Market</span> Specialists
              </h2>
              <p className="text-white/70 leading-relaxed mb-6">
                For over two decades, we have cultivated an exclusive network of ultra-high-net-worth individuals, 
                family offices, and discerning buyers seeking Florida's most exceptional properties—before they 
                ever reach the open market.
              </p>
              <p className="text-white/70 leading-relaxed mb-8">
                Our off-market expertise spans Palm Beach's legendary estates, Miami Beach's waterfront mansions, 
                and Naples' most coveted Gulf-front properties. Every transaction is handled with the utmost 
                discretion and professionalism.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="bg-[#0d1f3c]/80 border border-amber-400/20 rounded-lg px-6 py-4 backdrop-blur-sm">
                  <p className="text-amber-400 font-serif text-2xl">Palm Beach</p>
                  <p className="text-white/50 text-sm">Island Estates</p>
                </div>
                <div className="bg-[#0d1f3c]/80 border border-amber-400/20 rounded-lg px-6 py-4 backdrop-blur-sm">
                  <p className="text-amber-400 font-serif text-2xl">Miami Beach</p>
                  <p className="text-white/50 text-sm">Star Island</p>
                </div>
                <div className="bg-[#0d1f3c]/80 border border-amber-400/20 rounded-lg px-6 py-4 backdrop-blur-sm">
                  <p className="text-amber-400 font-serif text-2xl">Naples</p>
                  <p className="text-white/50 text-sm">Port Royal</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/5] rounded-lg overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1600137444380-ce5aea5c43c8?w=800&q=80" 
                  alt="Luxury Florida Estate"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-amber-400 text-black p-6 rounded-lg">
                <p className="text-3xl font-serif">25+</p>
                <p className="text-sm">Years of Excellence</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Markets */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-amber-400 tracking-[0.3em] text-sm mb-3">MARKETS</p>
            <h2 className="text-4xl md:text-5xl font-serif">
              Premier <span className="italic text-amber-400">Destinations</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Palm Beach', desc: 'Island Estates & Oceanfront', image: 'https://images.unsplash.com/photo-1578439297699-eb414262c2de?w=600&q=80' },
              { name: 'Miami Beach', desc: 'Star Island & Fisher Island', image: 'https://images.unsplash.com/photo-1607142426460-0185c446f1d7?w=600&q=80' },
              { name: 'Naples', desc: 'Port Royal & Gulf Shore', image: 'https://images.unsplash.com/photo-1623701675999-9406ece2d150?w=600&q=80' }
            ].map((market, i) => (
              <div key={i} className="relative group overflow-hidden rounded-lg aspect-[3/4] cursor-pointer">
                <img 
                  src={market.image} 
                  alt={market.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-serif mb-1">{market.name}</h3>
                  <p className="text-white/60 text-sm">{market.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 md:py-32 bg-gradient-to-b from-transparent to-[#071020]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-amber-400 tracking-[0.3em] text-sm mb-3">PRIVATE INQUIRY</p>
          <h2 className="text-4xl md:text-5xl font-serif mb-6">
            {leadType === 'buyer' ? (
              <>Access <span className="italic text-amber-400">Exclusive Auctions</span></>
            ) : (
              <>List Your <span className="italic text-amber-400">Off-Market Property</span></>
            )}
          </h2>
          <p className="text-white/70 mb-8 max-w-2xl mx-auto">
            {leadType === 'buyer' 
              ? 'Get exclusive access to luxury property auctions, private viewings, and priority bidding opportunities.'
              : 'Sell your property discreetly to qualified buyers without public listings. Maximum privacy, premium results.'
            }
          </p>
          
          {/* Buyer/Seller Toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-[#0d1f3c]/80 rounded-lg p-1 border border-amber-400/20">
              <button
                type="button"
                onClick={() => setLeadType('buyer')}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${
                  leadType === 'buyer' 
                    ? 'bg-amber-400 text-black' 
                    : 'text-white/70 hover:text-white'
                }`}
              >
                I Want to Buy
              </button>
              <button
                type="button"
                onClick={() => setLeadType('seller')}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${
                  leadType === 'seller' 
                    ? 'bg-amber-400 text-black' 
                    : 'text-white/70 hover:text-white'
                }`}
              >
                I Want to Sell
              </button>
            </div>
          </div>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!name || !email) {
              toast.error('Please enter your name and email');
              return;
            }
            setSubmitting(true);
            try {
              // Check verifications
              if (!emailVerified) {
                toast.error('Please verify your email address');
                setSubmitting(false);
                return;
              }
              if (phone && !phoneVerified) {
                toast.error('Please verify your phone number');
                setSubmitting(false);
                return;
              }
              
              if (leadType === 'buyer') {
                // Submit buyer lead
                const leadData = {
                  name, email, phone,
                  lead_type: 'buyer',
                  source: 'landing_page',
                  email_verified: emailVerified,
                  phone_verified: phoneVerified,
                  budget: buyerBudget,
                  areas_of_interest: buyerAreas
                };
                await publicAPI.submitLead(leadData);
                toast.success('Thank you! You\'ll receive auction invitations soon.');
              } else {
                // Submit seller property submission
                const submissionData = {
                  seller_name: name,
                  seller_email: email,
                  seller_phone: phone,
                  property_address: sellerAddress,
                  city: sellerCity,
                  state: sellerState,
                  property_type: sellerPropertyType,
                  bedrooms: sellerBedrooms ? parseInt(sellerBedrooms) : null,
                  bathrooms: sellerBathrooms ? parseFloat(sellerBathrooms) : null,
                  sqft: sellerSqft ? parseInt(sellerSqft) : null,
                  asking_price: sellerAskingPrice ? parseFloat(sellerAskingPrice.replace(/[^0-9.]/g, '')) : null,
                  timeline: sellerTimeline,
                  description: sellerDescription,
                  email_verified: emailVerified,
                  phone_verified: phoneVerified
                };
                await propertySubmissionsAPI.submit(submissionData);
                toast.success('Property submitted! Our team will review and contact you soon.');
              }
              
              // Reset form
              setName(''); setEmail(''); setPhone('');
              setBuyerBudget(''); setBuyerAreas('');
              setSellerAddress(''); setSellerCity(''); setSellerState('FL');
              setSellerPropertyType('single_family'); setSellerBedrooms(''); setSellerBathrooms('');
              setSellerSqft(''); setSellerAskingPrice(''); setSellerTimeline(''); setSellerDescription('');
              setEmailVerified(false); setPhoneVerified(false);
            } catch (error) {
              toast.error('Something went wrong. Please try again.');
            } finally {
              setSubmitting(false);
            }
          }} className="max-w-lg mx-auto space-y-4 mb-8">
            <Input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name *"
              required
              className="bg-[#0d1f3c]/80 border-amber-400/20 text-white placeholder:text-white/40 focus:border-amber-400"
            />
            <EmailVerification
              value={email}
              onChange={setEmail}
              onVerified={() => setEmailVerified(true)}
              required
              label={null}
              darkMode
            />
            <PhoneVerification
              value={phone}
              onChange={setPhone}
              onVerified={() => setPhoneVerified(true)}
              label={null}
              darkMode
            />
            
            {/* Buyer-specific fields */}
            {leadType === 'buyer' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select
                  value={buyerBudget}
                  onChange={(e) => setBuyerBudget(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-[#0d1f3c]/80 border border-amber-400/20 text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="" className="bg-[#0d1f3c]">Budget Range</option>
                  <option value="10-25m" className="bg-[#0d1f3c]">$10M - $25M</option>
                  <option value="25-50m" className="bg-[#0d1f3c]">$25M - $50M</option>
                  <option value="50-100m" className="bg-[#0d1f3c]">$50M - $100M</option>
                  <option value="100m+" className="bg-[#0d1f3c]">$100M+</option>
                </select>
                <Input 
                  type="text"
                  value={buyerAreas}
                  onChange={(e) => setBuyerAreas(e.target.value)}
                  placeholder="Preferred Areas (e.g., Palm Beach)"
                  className="bg-[#0d1f3c]/80 border-amber-400/20 text-white placeholder:text-white/40 focus:border-amber-400"
                />
              </div>
            )}
            
            {/* Seller-specific fields */}
            {leadType === 'seller' && (
              <div className="space-y-4">
                <Input 
                  type="text"
                  value={sellerAddress}
                  onChange={(e) => setSellerAddress(e.target.value)}
                  placeholder="Property Address *"
                  required
                  className="bg-[#0d1f3c]/80 border-amber-400/20 text-white placeholder:text-white/40 focus:border-amber-400"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    type="text"
                    value={sellerCity}
                    onChange={(e) => setSellerCity(e.target.value)}
                    placeholder="City"
                    className="bg-[#0d1f3c]/80 border-amber-400/20 text-white placeholder:text-white/40 focus:border-amber-400"
                  />
                  <select
                    value={sellerState}
                    onChange={(e) => setSellerState(e.target.value)}
                    className="h-10 px-3 rounded-md bg-[#0d1f3c]/80 border border-amber-400/20 text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="FL" className="bg-[#0d1f3c]">Florida</option>
                    <option value="CA" className="bg-[#0d1f3c]">California</option>
                    <option value="NY" className="bg-[#0d1f3c]">New York</option>
                    <option value="TX" className="bg-[#0d1f3c]">Texas</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={sellerPropertyType}
                    onChange={(e) => setSellerPropertyType(e.target.value)}
                    className="h-10 px-3 rounded-md bg-[#0d1f3c]/80 border border-amber-400/20 text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="single_family" className="bg-[#0d1f3c]">Single Family</option>
                    <option value="condo" className="bg-[#0d1f3c]">Condo/Penthouse</option>
                    <option value="townhouse" className="bg-[#0d1f3c]">Townhouse</option>
                    <option value="estate" className="bg-[#0d1f3c]">Estate</option>
                    <option value="land" className="bg-[#0d1f3c]">Land</option>
                  </select>
                  <Input 
                    type="text"
                    value={sellerAskingPrice}
                    onChange={(e) => setSellerAskingPrice(e.target.value)}
                    placeholder="Asking Price ($)"
                    className="bg-[#0d1f3c]/80 border-amber-400/20 text-white placeholder:text-white/40 focus:border-amber-400"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Input 
                    type="number"
                    value={sellerBedrooms}
                    onChange={(e) => setSellerBedrooms(e.target.value)}
                    placeholder="Beds"
                    className="bg-[#0d1f3c]/80 border-amber-400/20 text-white placeholder:text-white/40 focus:border-amber-400"
                  />
                  <Input 
                    type="number"
                    value={sellerBathrooms}
                    onChange={(e) => setSellerBathrooms(e.target.value)}
                    placeholder="Baths"
                    step="0.5"
                    className="bg-[#0d1f3c]/80 border-amber-400/20 text-white placeholder:text-white/40 focus:border-amber-400"
                  />
                  <Input 
                    type="number"
                    value={sellerSqft}
                    onChange={(e) => setSellerSqft(e.target.value)}
                    placeholder="Sq Ft"
                    className="bg-[#0d1f3c]/80 border-amber-400/20 text-white placeholder:text-white/40 focus:border-amber-400"
                  />
                </div>
                <select
                  value={sellerTimeline}
                  onChange={(e) => setSellerTimeline(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-[#0d1f3c]/80 border border-amber-400/20 text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="" className="bg-[#0d1f3c]">Selling Timeline</option>
                  <option value="immediate" className="bg-[#0d1f3c]">Immediate</option>
                  <option value="1-3_months" className="bg-[#0d1f3c]">1-3 Months</option>
                  <option value="3-6_months" className="bg-[#0d1f3c]">3-6 Months</option>
                  <option value="flexible" className="bg-[#0d1f3c]">Flexible</option>
                </select>
                <textarea
                  value={sellerDescription}
                  onChange={(e) => setSellerDescription(e.target.value)}
                  placeholder="Tell us about your property (optional)"
                  rows={3}
                  className="w-full px-3 py-2 rounded-md bg-[#0d1f3c]/80 border border-amber-400/20 text-white placeholder:text-white/40 focus:border-amber-400 focus:outline-none resize-none"
                />
              </div>
            )}
            
            {/* Consent Checkboxes */}
            <div className="space-y-3 text-sm">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={consentEmail}
                  onChange={(e) => setConsentEmail(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-amber-400/30 bg-[#0d1f3c] text-amber-400 focus:ring-amber-400 focus:ring-offset-0"
                />
                <span className="text-white/70 group-hover:text-white/90 transition-colors">
                  I agree to receive email communications about property updates, market insights, and exclusive listings.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={consentSMS}
                  onChange={(e) => setConsentSMS(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-amber-400/30 bg-[#0d1f3c] text-amber-400 focus:ring-amber-400 focus:ring-offset-0"
                />
                <span className="text-white/70 group-hover:text-white/90 transition-colors">
                  I agree to receive SMS/text messages for appointment reminders and urgent updates. Msg & data rates may apply.
                </span>
              </label>
            </div>
            
            <Button 
              type="submit" 
              disabled={submitting || !consentEmail}
              className="w-full bg-amber-400 text-black hover:bg-amber-300 py-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {leadType === 'buyer' ? 'REQUEST AUCTION ACCESS' : 'SUBMIT MY PROPERTY'}
            </Button>
          </form>

          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center text-white/60">
            <a href="tel:+15551234567" className="flex items-center gap-2 hover:text-amber-400 transition-colors">
              <Phone className="w-4 h-4" />
              +1 (555) 123-4567
            </a>
            <a href="mailto:info@fusionestates.com" className="flex items-center gap-2 hover:text-amber-400 transition-colors">
              <Mail className="w-4 h-4" />
              info@fusionestates.com
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-amber-400/10 bg-[#071020]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded flex items-center justify-center">
                <span className="font-serif text-black font-bold">F</span>
              </div>
              <span className="font-serif text-lg">FUSION LUXURY ESTATES</span>
            </div>
            <div className="flex gap-8 text-sm text-white/50">
              <a href="#" className="hover:text-amber-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-amber-400 transition-colors">Terms</a>
              <a href="#" className="hover:text-amber-400 transition-colors">Contact</a>
            </div>
            <p className="text-sm text-white/30">
            © 2025 Fusion Luxury Estates. Powered By: <a href="https://a2gdesigns.com" target="_blank" rel="noopener noreferrer" className="text-amber-400/70 hover:text-amber-400 transition-colors">A2G</a>
          </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
