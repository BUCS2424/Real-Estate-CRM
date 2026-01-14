import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

// Sample Florida luxury listings data
const SAMPLE_LISTINGS = [
  {
    id: '1',
    address: '1200 S Ocean Blvd',
    city: 'Palm Beach',
    state: 'FL',
    price: 45000000,
    bedrooms: 8,
    bathrooms: 12,
    sqft: 18500,
    lot_size: '1.2 acres',
    image: 'https://images.unsplash.com/photo-1578439297699-eb414262c2de?w=800&q=80',
    status: 'off_market'
  },
  {
    id: '2',
    address: '45 Star Island Dr',
    city: 'Miami Beach',
    state: 'FL',
    price: 65000000,
    bedrooms: 11,
    bathrooms: 14,
    sqft: 22000,
    lot_size: '1.8 acres',
    image: 'https://images.unsplash.com/photo-1607142426460-0185c446f1d7?w=800&q=80',
    status: 'off_market'
  },
  {
    id: '3',
    address: '2800 Gordon Dr',
    city: 'Naples',
    state: 'FL',
    price: 38500000,
    bedrooms: 6,
    bathrooms: 8,
    sqft: 12000,
    lot_size: '0.8 acres',
    image: 'https://images.unsplash.com/photo-1623701675999-9406ece2d150?w=800&q=80',
    status: 'off_market'
  },
  {
    id: '4',
    address: '100 Arvida Pkwy',
    city: 'Coral Gables',
    state: 'FL',
    price: 29000000,
    bedrooms: 7,
    bathrooms: 9,
    sqft: 14500,
    lot_size: '1.5 acres',
    image: 'https://images.unsplash.com/photo-1600137444380-ce5aea5c43c8?w=800&q=80',
    status: 'off_market'
  },
  {
    id: '5',
    address: '3100 N Ocean Blvd',
    city: 'Fort Lauderdale',
    state: 'FL',
    price: 52000000,
    bedrooms: 9,
    bathrooms: 11,
    sqft: 19800,
    lot_size: '2.1 acres',
    image: 'https://images.unsplash.com/photo-1745261394567-9dba1a4b7bb7?w=800&q=80',
    status: 'off_market'
  },
  {
    id: '6',
    address: '888 S Ocean Blvd',
    city: 'Boca Raton',
    state: 'FL',
    price: 34500000,
    bedrooms: 7,
    bathrooms: 10,
    sqft: 15200,
    lot_size: '1.1 acres',
    image: 'https://images.unsplash.com/photo-1765279162736-14c7d64ff820?w=800&q=80',
    status: 'off_market'
  },
  {
    id: '7',
    address: '150 Clarendon Ave',
    city: 'Palm Beach',
    state: 'FL',
    price: 78000000,
    bedrooms: 12,
    bathrooms: 16,
    sqft: 28000,
    lot_size: '3.2 acres',
    image: 'https://images.unsplash.com/photo-1663998468593-1f104e7c9213?w=800&q=80',
    status: 'off_market'
  },
  {
    id: '8',
    address: '5000 Island Estates Dr',
    city: 'Aventura',
    state: 'FL',
    price: 41000000,
    bedrooms: 8,
    bathrooms: 10,
    sqft: 16500,
    lot_size: '0.9 acres',
    image: 'https://images.unsplash.com/photo-1729606559667-fcab83917423?w=800&q=80',
    status: 'off_market'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent">
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
          <div className="md:hidden bg-black/95 backdrop-blur-lg border-t border-white/10">
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
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
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
      <section className="py-16 border-y border-white/10 bg-black/50">
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
          {[...SAMPLE_LISTINGS, ...SAMPLE_LISTINGS].map((listing, index) => (
            <div 
              key={`${listing.id}-${index}`}
              className="flex-shrink-0 w-[350px] md:w-[400px] group cursor-pointer"
            >
              <div className="relative overflow-hidden rounded-lg mb-4">
                <img 
                  src={listing.image} 
                  alt={listing.address}
                  className="w-full h-[280px] object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
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
                  <Square className="w-4 h-4" /> {listing.sqft.toLocaleString()} SF
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/login">
            <Button variant="outline" className="border-amber-400/50 text-amber-400 hover:bg-amber-400 hover:text-black px-8">
              VIEW ALL LISTINGS
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 md:py-32 bg-gradient-to-b from-transparent via-amber-950/10 to-transparent">
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
                <div className="bg-white/5 border border-white/10 rounded-lg px-6 py-4">
                  <p className="text-amber-400 font-serif text-2xl">Palm Beach</p>
                  <p className="text-white/50 text-sm">Island Estates</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg px-6 py-4">
                  <p className="text-amber-400 font-serif text-2xl">Miami Beach</p>
                  <p className="text-white/50 text-sm">Star Island</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg px-6 py-4">
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
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
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
      <section id="contact" className="py-20 md:py-32 bg-gradient-to-b from-transparent to-amber-950/20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-amber-400 tracking-[0.3em] text-sm mb-3">PRIVATE INQUIRY</p>
          <h2 className="text-4xl md:text-5xl font-serif mb-6">
            Join the <span className="italic text-amber-400">Exclusive List</span>
          </h2>
          <p className="text-white/70 mb-10 max-w-2xl mx-auto">
            Get exclusive access to off-market listings, private showings, and insider market updates 
            before they become public. Your privacy is our priority.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto mb-8">
            <Input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 flex-1"
            />
            <Button className="bg-amber-400 text-black hover:bg-amber-300 px-8">
              SUBSCRIBE
            </Button>
          </div>

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
      <footer className="py-12 border-t border-white/10">
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
            <p className="text-sm text-white/30">© 2025 Fusion Luxury Estates. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
