import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Quote, Send, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { useBranding } from '../contexts/BrandingContext';

const WriteReviewPage = () => {
  const { branding } = useBranding();
  const headerLogoUrl = branding.logoUrl || branding.headerLogoUrl;
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  
  const [formData, setFormData] = useState({
    title: '',
    text: '',
    reviewer_name: '',
    reviewer_email: '',
    reviewer_phone: '',
    property_address: '',
    transaction_type: 'buyer'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.text || !formData.reviewer_name || !formData.reviewer_email) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reviews/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          rating,
          source: 'Website',
          status: 'pending' // Requires admin approval
        })
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to submit review');
      }
    } catch (error) {
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHoveredRating(star)}
          onMouseLeave={() => setHoveredRating(0)}
          onClick={() => setRating(star)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-10 h-10 ${
              star <= (hoveredRating || rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-white/30'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] to-[#071020] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-green-500/20 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-400" />
          </div>
          <h1 className="text-3xl font-serif text-white mb-4">Thank You!</h1>
          <p className="text-white/70 mb-8">
            Your review has been submitted and is pending approval. We appreciate you taking the time to share your experience with us.
          </p>
          <Link to="/">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] to-[#071020]">
      {/* Header */}
      <header className="py-6 px-6 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            {headerLogoUrl ? (
              <img src={headerLogoUrl} alt={branding.siteName} className="h-10 object-contain" data-testid="write-review-header-logo" />
            ) : (
              <span className="text-2xl font-serif text-white">{branding.siteName || 'Hidden Haven Realty'}</span>
            )}
          </Link>
          <Link to="/">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Quote className="w-16 h-16 text-amber-400/50 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-serif text-white mb-4">
              Share Your <span className="italic text-amber-400">Experience</span>
            </h1>
            <p className="text-white/60 max-w-lg mx-auto">
              Your feedback helps us serve our clients better and helps others find their dream home.
            </p>
          </div>

          {/* Review Form */}
          <form onSubmit={handleSubmit} className="space-y-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            {/* Rating */}
            <div className="text-center pb-6 border-b border-white/10">
              <Label className="text-white/80 block mb-4">How would you rate your experience?</Label>
              {renderStars()}
              <p className="text-amber-400 mt-2 text-sm">
                {rating === 5 && 'Excellent!'}
                {rating === 4 && 'Great!'}
                {rating === 3 && 'Good'}
                {rating === 2 && 'Fair'}
                {rating === 1 && 'Poor'}
              </p>
            </div>

            {/* Review Title */}
            <div>
              <Label className="text-white/80">Review Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Summarize your experience in a few words"
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 mt-2"
                required
              />
            </div>

            {/* Review Text */}
            <div>
              <Label className="text-white/80">Your Review *</Label>
              <Textarea
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="Tell us about your experience working with us..."
                rows={5}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 mt-2"
                required
              />
            </div>

            {/* Personal Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white/80">Your Name *</Label>
                <Input
                  value={formData.reviewer_name}
                  onChange={(e) => setFormData({ ...formData, reviewer_name: e.target.value })}
                  placeholder="John Smith"
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40 mt-2"
                  required
                />
              </div>
              <div>
                <Label className="text-white/80">Email *</Label>
                <Input
                  type="email"
                  value={formData.reviewer_email}
                  onChange={(e) => setFormData({ ...formData, reviewer_email: e.target.value })}
                  placeholder="john@example.com"
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40 mt-2"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white/80">Phone (Optional)</Label>
                <Input
                  type="tel"
                  value={formData.reviewer_phone}
                  onChange={(e) => setFormData({ ...formData, reviewer_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40 mt-2"
                />
              </div>
              <div>
                <Label className="text-white/80">Transaction Type</Label>
                <Select 
                  value={formData.transaction_type} 
                  onValueChange={(val) => setFormData({ ...formData, transaction_type: val })}
                >
                  <SelectTrigger className="bg-white/5 border-white/20 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">I was a Buyer</SelectItem>
                    <SelectItem value="seller">I was a Seller</SelectItem>
                    <SelectItem value="both">Both Buyer & Seller</SelectItem>
                    <SelectItem value="renter">I was a Renter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-white/80">Property Address (Optional)</Label>
              <Input
                value={formData.property_address}
                onChange={(e) => setFormData({ ...formData, property_address: e.target.value })}
                placeholder="123 Main St, Tampa, FL"
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 mt-2"
              />
            </div>

            {/* Submit */}
            <Button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-6 text-lg"
            >
              {submitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Submit Review
                </>
              )}
            </Button>

            <p className="text-white/40 text-xs text-center">
              By submitting this review, you agree to let us display your feedback on our website.
              Your email will not be published.
            </p>
          </form>

          {/* Review Platforms */}
          <div className="mt-12 text-center">
            <p className="text-white/50 mb-4">You can also leave us a review on:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a 
                href="https://www.ratemyagent.com/real-estate-agent/sheila-desautels-b13b59/sales/write-review" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                RateMyAgent
              </a>
              <a 
                href="#" 
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                Google
              </a>
              <a 
                href="#" 
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                Zillow
              </a>
              <a 
                href="#" 
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                Realtor.com
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10 text-center">
        <p className="text-white/40 text-sm">
          © {new Date().getFullYear()} {branding.siteName || 'Hidden Haven Realty'}. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default WriteReviewPage;
