import React, { useState, useEffect, useRef } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

const TestimonialsCarousel = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef(null);
  const animationRef = useRef(null);
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    if (!isPaused && reviews.length > 0 && scrollRef.current) {
      const scrollSpeed = 0.5;
      
      const animate = () => {
        if (scrollRef.current && !isPaused) {
          scrollPositionRef.current += scrollSpeed;
          
          const maxScroll = scrollRef.current.scrollWidth / 2;
          if (scrollPositionRef.current >= maxScroll) {
            scrollPositionRef.current = 0;
          }
          
          scrollRef.current.scrollLeft = scrollPositionRef.current;
        }
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isPaused, reviews]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reviews/public?homepage_only=true`);
      if (res.ok) {
        const data = await res.json();
        if (data.reviews && data.reviews.length > 0) {
          setReviews(data.reviews);
        } else {
          setReviews(getFallbackReviews());
        }
      } else {
        setReviews(getFallbackReviews());
      }
    } catch (error) {
      setReviews(getFallbackReviews());
    } finally {
      setLoading(false);
    }
  };

  const getFallbackReviews = () => [
    {
      id: '1',
      title: 'Heaven sent!',
      text: 'Having recently moved from NYC to Tampa—and after dealing with a very shady developer—we met Sheila by chance at an open house. That encounter completely changed our experience of relocating to Tampa.',
      rating: 5,
      reviewer_name: 'NYC to Tampa Client',
      reviewer_location: 'Temple Terrace, FL',
      source: 'RateMyAgent'
    },
    {
      id: '2',
      title: 'Sheila was amazing to work with!',
      text: 'She sold our house based off our first open house. All around she is just an amazing person. We would highly recommend her to anybody.',
      rating: 5,
      reviewer_name: 'Wesley Chapel Seller',
      reviewer_location: 'Wesley Chapel, FL',
      source: 'RateMyAgent'
    },
    {
      id: '3',
      title: 'Found Our Dream Home!',
      text: 'After months of searching, Sheila helped us find the perfect home in South Tampa. Her knowledge of the area made all the difference.',
      rating: 5,
      reviewer_name: 'Michael & Sarah Thompson',
      reviewer_location: 'South Tampa, FL',
      source: 'Google'
    }
  ];

  const renderStars = (rating, size = 'w-4 h-4') => (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`${size} ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-white/20'}`}
        />
      ))}
    </div>
  );

  const getSourceColor = (source) => {
    const colors = {
      'RateMyAgent': 'from-blue-500 to-blue-600',
      'Google': 'from-red-500 to-yellow-500',
      'Zillow': 'from-blue-600 to-blue-700',
      'Realtor.com': 'from-red-600 to-red-700',
      'Website': 'from-amber-500 to-amber-600',
    };
    return colors[source] || 'from-gray-500 to-gray-600';
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollPositionRef.current = Math.max(0, scrollPositionRef.current - 400);
      scrollRef.current.scrollTo({ left: scrollPositionRef.current, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollPositionRef.current += 400;
      scrollRef.current.scrollTo({ left: scrollPositionRef.current, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <section className="py-20 bg-[#060d18]">
        <div className="flex gap-6 px-8 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse bg-white/5 rounded-2xl h-72 w-96 flex-shrink-0" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-24 bg-gradient-to-b from-[#060d18] via-[#0a1628] to-[#060d18] overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-amber-500/3 to-transparent rounded-full" />
      </div>

      {/* Section Header */}
      <div className="relative z-10 text-center mb-16 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-full border border-amber-500/20 mb-6">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-amber-400 text-sm font-medium tracking-wide uppercase">Client Testimonials</span>
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white mb-4">
          What Our <span className="italic text-amber-400">Clients</span> Say
        </h2>
        <p className="text-white/50 max-w-2xl mx-auto text-lg">
          Real stories from real families. Discover why hundreds trust us with their most important investment.
        </p>
      </div>

      {/* Navigation Arrows - Desktop */}
      <div className="hidden md:flex absolute top-1/2 left-4 right-4 z-20 justify-between pointer-events-none">
        <Button
          variant="outline"
          size="icon"
          onClick={scrollLeft}
          className="pointer-events-auto w-14 h-14 rounded-full border-white/10 bg-black/50 backdrop-blur-sm text-white hover:bg-white/10 hover:border-amber-500/50 transition-all shadow-2xl"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={scrollRight}
          className="pointer-events-auto w-14 h-14 rounded-full border-white/10 bg-black/50 backdrop-blur-sm text-white hover:bg-white/10 hover:border-amber-500/50 transition-all shadow-2xl"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>

      {/* Scrolling Container - Full Width */}
      <div
        ref={scrollRef}
        className="relative z-10 flex gap-6 overflow-x-auto scrollbar-hide px-8 md:px-16"
        style={{ scrollBehavior: 'auto' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Duplicate reviews for infinite scroll effect */}
        {[...reviews, ...reviews].map((review, idx) => (
          <div
            key={`${review.id}-${idx}`}
            onClick={() => setSelectedReview(review)}
            className="group flex-shrink-0 w-[380px] md:w-[420px] cursor-pointer pt-6"
          >
            <div className="relative h-full bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-8 transition-all duration-500 hover:border-amber-500/30 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-2">
              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-transparent transition-all duration-500" />
              
              {/* Quote Icon - Inside the card */}
              <div className="absolute top-4 left-6 w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Quote className="w-6 h-6 text-black" />
              </div>

              {/* Content */}
              <div className="relative pt-12">
                {/* Rating */}
                <div className="flex items-center justify-between mb-4">
                  {renderStars(review.rating, 'w-5 h-5')}
                  <span className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${getSourceColor(review.source)} text-white font-medium`}>
                    {review.source}
                  </span>
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-semibold text-white mb-4 line-clamp-2 group-hover:text-amber-100 transition-colors">
                  "{review.title}"
                </h3>
                
                {/* Review Text */}
                <p className="text-white/60 text-sm leading-relaxed line-clamp-4 mb-6 group-hover:text-white/70 transition-colors">
                  {review.text}
                </p>
                
                {/* Read More Link */}
                <button className="text-amber-400 text-sm font-medium hover:text-amber-300 transition-colors flex items-center gap-1 mb-6">
                  Read Full Review
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                
                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />
                
                {/* Reviewer Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-500/30 flex items-center justify-center">
                    <span className="text-amber-400 font-semibold text-lg">
                      {review.reviewer_name?.charAt(0) || 'C'}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{review.reviewer_name}</p>
                    {(review.reviewer_location || review.property_address) && (
                      <p className="text-white/40 text-sm flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {review.reviewer_location || review.property_address}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Bar */}
      <div className="relative z-10 mt-16 flex justify-center gap-8 md:gap-16 px-4">
        <div className="text-center">
          <p className="text-4xl md:text-5xl font-bold text-amber-400">{reviews.length}+</p>
          <p className="text-white/50 text-sm">Happy Clients</p>
        </div>
        <div className="w-px bg-white/10" />
        <div className="text-center">
          <p className="text-4xl md:text-5xl font-bold text-amber-400">5.0</p>
          <p className="text-white/50 text-sm">Average Rating</p>
        </div>
        <div className="w-px bg-white/10" />
        <div className="text-center">
          <p className="text-4xl md:text-5xl font-bold text-amber-400">100%</p>
          <p className="text-white/50 text-sm">Recommend</p>
        </div>
      </div>

      {/* Review Modal */}
      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent className="sm:max-w-2xl bg-gradient-to-br from-[#0a1628] to-[#071020] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <Quote className="w-5 h-5 text-black" />
              </div>
              {selectedReview?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedReview && (
            <div className="space-y-6 mt-4">
              {/* Rating & Source */}
              <div className="flex items-center gap-4">
                {renderStars(selectedReview.rating, 'w-6 h-6')}
                <span className={`text-sm px-3 py-1 rounded-full bg-gradient-to-r ${getSourceColor(selectedReview.source)} text-white font-medium`}>
                  {selectedReview.source}
                </span>
              </div>
              
              {/* Full Review Text */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <p className="text-white/80 leading-relaxed text-lg italic">
                  "{selectedReview.text}"
                </p>
              </div>
              
              {/* Reviewer Info */}
              <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20 border-2 border-amber-500/30 flex items-center justify-center">
                  <span className="text-amber-400 font-bold text-2xl">
                    {selectedReview.reviewer_name?.charAt(0) || 'C'}
                  </span>
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">{selectedReview.reviewer_name}</p>
                  {selectedReview.reviewer_title && (
                    <p className="text-amber-400/80">{selectedReview.reviewer_title}</p>
                  )}
                  {(selectedReview.reviewer_location || selectedReview.property_address) && (
                    <p className="text-white/50 flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {selectedReview.reviewer_location || selectedReview.property_address}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom styles */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
};

export default TestimonialsCarousel;
