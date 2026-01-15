import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, 
  Award, 
  Users, 
  Heart, 
  MapPin, 
  Phone, 
  Mail,
  ArrowLeft,
  Star,
  Clock,
  Handshake
} from 'lucide-react';
import { Button } from '../components/ui/button';

export const AboutPage = () => {
  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a1628]/95 backdrop-blur-md border-b border-amber-400/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Home className="w-6 h-6 text-amber-400" />
              <span className="font-serif text-xl text-white">Fusion Luxury Estates</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm text-white/70 hover:text-amber-400 transition-colors">HOME</Link>
              <Link to="/showcase" className="text-sm text-white/70 hover:text-amber-400 transition-colors">LISTING SHOWCASE</Link>
              <Link to="/about" className="text-sm text-amber-400 border-b border-amber-400">ABOUT</Link>
              <a href="/#contact" className="text-sm text-white/70 hover:text-amber-400 transition-colors">CONTACT</a>
            </nav>
            <Link to="/login">
              <Button variant="outline" className="border-amber-400/50 text-amber-400 hover:bg-amber-400 hover:text-black">
                Agent Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-b from-[#0a1628] via-[#0d1f3c] to-[#0a1628]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/20 to-transparent rounded-2xl transform rotate-3"></div>
              <img 
                src="https://customer-assets.emergentagent.com/job_fusion-estates/artifacts/sojktbhq_Sheila-Desautels.jpg"
                alt="Sheila Desautels - Luxury Real Estate Agent"
                className="relative rounded-2xl shadow-2xl shadow-amber-400/10 w-full max-w-md mx-auto lg:mx-0"
              />
              <div className="absolute -bottom-4 -right-4 bg-amber-400 text-black px-6 py-3 rounded-lg shadow-lg">
                <p className="font-serif text-2xl font-bold">25+</p>
                <p className="text-sm">Years Experience</p>
              </div>
            </div>

            {/* Content */}
            <div className="text-center lg:text-left">
              <p className="text-amber-400 uppercase tracking-widest text-sm mb-4">Meet Your Agent</p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white mb-6">
                Sheila Desautels
              </h1>
              <p className="text-xl text-white/70 mb-8 leading-relaxed">
                A trusted name in Florida luxury real estate for over <span className="text-amber-400 font-semibold">25 years</span>, 
                serving families and communities with dedication, integrity, and an unwavering commitment to excellence.
              </p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <a href="tel:+15551234567">
                  <Button className="bg-amber-400 text-black hover:bg-amber-300">
                    <Phone className="w-4 h-4 mr-2" />
                    Schedule a Call
                  </Button>
                </a>
                <a href="mailto:sheila@fusionestates.com">
                  <Button variant="outline" className="border-white/30 hover:bg-white/10">
                    <Mail className="w-4 h-4 mr-2" />
                    Send a Message
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-[#0d1f3c]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-amber-400" />
              </div>
              <p className="text-3xl font-serif text-white mb-1">25+</p>
              <p className="text-white/50 text-sm">Years of Experience</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="w-8 h-8 text-amber-400" />
              </div>
              <p className="text-3xl font-serif text-white mb-1">500+</p>
              <p className="text-white/50 text-sm">Properties Sold</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-amber-400" />
              </div>
              <p className="text-3xl font-serif text-white mb-1">1000+</p>
              <p className="text-white/50 text-sm">Happy Families</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-amber-400" />
              </div>
              <p className="text-3xl font-serif text-white mb-1">$500M+</p>
              <p className="text-white/50 text-sm">In Sales Volume</p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-amber-400 uppercase tracking-widest text-sm mb-4">Our Story</p>
            <h2 className="text-3xl md:text-4xl font-serif text-white mb-6">
              A Legacy of Trust & Excellence
            </h2>
          </div>
          
          <div className="prose prose-lg prose-invert mx-auto">
            <p className="text-white/70 leading-relaxed mb-6">
              For over two and a half decades, <span className="text-white font-semibold">Sheila Desautels</span> has been 
              a cornerstone of Florida's luxury real estate market. Working alongside her husband, they have built more 
              than just a business—they've built a legacy of trust, community, and exceptional service.
            </p>
            
            <p className="text-white/70 leading-relaxed mb-6">
              What started as a passion for helping families find their dream homes has evolved into one of the most 
              respected names in off-market luxury properties. Sheila's approach is simple yet powerful: treat every 
              client like family, understand their unique needs, and go above and beyond to exceed expectations.
            </p>

            <p className="text-white/70 leading-relaxed mb-6">
              Beyond real estate, Sheila and her husband are deeply committed to their community. They believe that 
              a home is more than just a property—it's where memories are made, families grow, and dreams come to life. 
              This philosophy has guided their work and earned them the loyalty of hundreds of satisfied clients who 
              have become lifelong friends.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-[#0d1f3c]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-amber-400 uppercase tracking-widest text-sm mb-4">What Sets Us Apart</p>
            <h2 className="text-3xl md:text-4xl font-serif text-white">
              Our Commitment to You
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#0d1f3c]/50 rounded-2xl p-8 border border-amber-400/10 hover:border-amber-400/30 transition-colors">
              <div className="w-14 h-14 bg-amber-400/10 rounded-xl flex items-center justify-center mb-6">
                <Heart className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-xl font-serif text-white mb-3">Family Values</h3>
              <p className="text-white/60">
                As a family-run business, we understand the importance of finding a home where your family can thrive. 
                Your happiness is our success.
              </p>
            </div>

            <div className="bg-[#0d1f3c]/50 rounded-2xl p-8 border border-amber-400/10 hover:border-amber-400/30 transition-colors">
              <div className="w-14 h-14 bg-amber-400/10 rounded-xl flex items-center justify-center mb-6">
                <Handshake className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-xl font-serif text-white mb-3">Trusted Partnership</h3>
              <p className="text-white/60">
                With 25+ years of experience, we've built relationships based on trust, transparency, and delivering 
                on our promises every single time.
              </p>
            </div>

            <div className="bg-[#0d1f3c]/50 rounded-2xl p-8 border border-amber-400/10 hover:border-amber-400/30 transition-colors">
              <div className="w-14 h-14 bg-amber-400/10 rounded-xl flex items-center justify-center mb-6">
                <MapPin className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-xl font-serif text-white mb-3">Local Expertise</h3>
              <p className="text-white/60">
                Deep roots in Florida's communities mean we know every neighborhood, every hidden gem, and every 
                opportunity before it hits the market.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <blockquote className="text-2xl md:text-3xl font-serif text-white italic mb-6">
              "Sheila and her husband didn't just help us find a house—they helped us find our home. 
              Their dedication, knowledge, and genuine care made all the difference."
            </blockquote>
            <p className="text-amber-400 font-medium">— The Martinez Family, Palm Beach</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-amber-400/10 to-amber-600/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-6">
            Ready to Find Your Dream Home?
          </h2>
          <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
            Whether you're buying your first home, selling a luxury estate, or looking for the perfect 
            off-market opportunity, Sheila and her team are here to help.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/showcase">
              <Button size="lg" className="bg-amber-400 text-black hover:bg-amber-300">
                View Properties
              </Button>
            </Link>
            <a href="/#contact">
              <Button size="lg" variant="outline" className="border-white/30 hover:bg-white/10">
                Get in Touch
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-amber-400/10 bg-[#060d18]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-amber-400" />
              <span className="font-serif text-white">Fusion Luxury Estates</span>
            </div>
            <div className="flex gap-6 text-sm text-white/50">
              <Link to="/newsletter-archive" className="hover:text-amber-400 transition-colors">Newsletter Archive</Link>
              <a href="#" className="hover:text-amber-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-amber-400 transition-colors">Terms</a>
            </div>
            <p className="text-sm text-white/30">
              Powered By: <a href="https://a2gdesigns.com" target="_blank" rel="noopener noreferrer" className="text-amber-400/70 hover:text-amber-400">A2G</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
