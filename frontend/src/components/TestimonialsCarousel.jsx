import React, { useState, useEffect, useRef } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { reviewsAPI } from '../lib/api';

const TestimonialsCarousel = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    // Auto-scroll animation
    if (!isPaused && reviews.length > 0 && scrollRef.current) {
      let scrollPosition = 0;
      const scrollSpeed = 0.5; // pixels per frame
      
      const animate = () => {
        if (scrollRef.current && !isPaused) {
          scrollPosition += scrollSpeed;
          
          // Reset when we've scrolled through all items
          const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
          if (scrollPosition >= maxScroll) {
            scrollPosition = 0;
          }
          
          scrollRef.current.scrollLeft = scrollPosition;
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
      // Try to get from API first (public endpoint, no auth needed)
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reviews/public?homepage_only=true`);
      if (res.ok) {
        const data = await res.json();
        if (data.reviews && data.reviews.length > 0) {
          setReviews(data.reviews);
        } else {
          // Use fallback reviews
          setReviews(getFallbackReviews());
        }
      } else {
        setReviews(getFallbackReviews());
      }
    } catch (error) {
      console.log('Using fallback reviews');
      setReviews(getFallbackReviews());
    } finally {
      setLoading(false);
    }
  };

  const getFallbackReviews = () => [
    {
      id: '1',
      title: 'Heaven sent!',
      text: 'Having recently moved from NYC to Tampa—and after dealing with a very shady developer—we met Sheila by chance at an open house. That encounter completely changed our experience of relocating to Tampa. Even before formally becoming our agent, Sheila was generous with her time, forthcoming with information, and genuinely willing to help us navigate issues that had nothing to do with her or any potential transaction. Once we enlisted her to help us find our forever Tampa home, it became immediately clear how exceptional she is. Sheila is incredibly knowledgeable about the Tampa market, the end-to-end buying process, and all the Florida-specific nuances that native New Yorkers would never think to ask about.',
      rating: 5,
      reviewer_name: 'NYC to Tampa Client',
      property_address: 'Temple Terrace, FL',
      source: 'RateMyAgent'
    },
    {
      id: '2',
      title: 'Sheila was amazing to work with!',
      text: 'Sheila was very knowledgeable. She was very easy to reach with any questions. She helped us with the scanning documents part that we struggled with. She sold our house based off our first open house. All around she is just an amazing person and individual. We would highly recommend her to anybody in our family or to our friends.',
      rating: 5,
      reviewer_name: 'Wesley Chapel Seller',
      property_address: 'Wesley Chapel, FL',
      source: 'RateMyAgent'
    },
    {
      id: '3',
      title: 'Professional and Dedicated',
      text: 'Working with Hidden Haven Realty was an absolute pleasure. From start to finish, the team was professional, responsive, and truly dedicated to finding us our dream home. Their knowledge of the Tampa Bay area is unmatched.',
      rating: 5,
      reviewer_name: 'Happy Homeowner',
      property_address: 'Tampa, FL',
      source: 'Google'
    }
  ];

  const renderStars = (rating) => (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}`}
        />
      ))}
    </div>
  );

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="py-16 bg-[#0a1628]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="animate-pulse flex space-x-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/10 rounded-xl h-64 w-80 flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-b from-[#0a1628] to-[#0d1e36] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-4">
            What Our Clients Say
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Real stories from real clients. Discover why families trust us with their most important investment.
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-end gap-2 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollLeft}
            className="border-white/20 text-white hover:bg-white/10 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={scrollRight}
            className="border-white/20 text-white hover:bg-white/10 rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrolling Container */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-4"
          style={{ scrollBehavior: 'auto' }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Duplicate reviews for infinite scroll effect */}
          {[...reviews, ...reviews].map((review, idx) => (
            <div
              key={`${review.id}-${idx}`}
              className="flex-shrink-0 w-[350px] bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 cursor-pointer group"
              onClick={() => setSelectedReview(review)}
            >
              {/* Quote Icon */}
              <Quote className="w-10 h-10 text-amber-400/30 mb-4" />
              
              {/* Rating */}
              <div className="mb-4">
                {renderStars(review.rating)}
              </div>
              
              {/* Title */}
              <h3 className="text-lg font-semibold text-white mb-3 line-clamp-1">
                "{review.title}"
              </h3>
              
              {/* Review Text (truncated) */}
              <p className="text-white/70 text-sm leading-relaxed line-clamp-4 mb-4">
                {review.text}
              </p>
              
              {/* Read More */}
              <button className="text-amber-400 text-sm font-medium hover:text-amber-300 transition-colors mb-4">
                Read More →
              </button>
              
              {/* Reviewer Info */}
              <div className="pt-4 border-t border-white/10">
                <p className="text-white font-medium">{review.reviewer_name}</p>
                {review.property_address && (
                  <p className="text-white/50 text-sm">{review.property_address}</p>
                )}
                <p className="text-amber-400/70 text-xs mt-1">{review.source}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review Modal */}
      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent className="sm:max-w-2xl bg-[#0a1628] border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif flex items-center gap-3">
              <Quote className="w-8 h-8 text-amber-400" />
              {selectedReview?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedReview && (
            <div className="space-y-6">
              {/* Rating */}
              <div className="flex items-center gap-3">
                {renderStars(selectedReview.rating)}
                <span className="text-white/50 text-sm">
                  {selectedReview.rating} out of 5 stars
                </span>
              </div>
              
              {/* Full Review Text */}
              <p className="text-white/80 leading-relaxed text-lg">
                "{selectedReview.text}"
              </p>
              
              {/* Reviewer Info */}
              <div className="pt-6 border-t border-white/10">
                <p className="text-white font-semibold text-lg">{selectedReview.reviewer_name}</p>
                {selectedReview.reviewer_title && (
                  <p className="text-white/60">{selectedReview.reviewer_title}</p>
                )}
                {selectedReview.property_address && (
                  <p className="text-amber-400/80 mt-1">{selectedReview.property_address}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-400/20 text-amber-400">
                    {selectedReview.source}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom scrollbar hide styles */}
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
