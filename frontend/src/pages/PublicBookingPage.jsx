import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicBookingAPI } from '../lib/api';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Mail, 
  MessageSquare,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Building2,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Calendar } from '../components/ui/calendar';
import { PhoneVerification } from '../components/PhoneVerification';
import { toast } from 'sonner';

export const PublicBookingPage = () => {
  const { agentCode } = useParams();
  const [agentInfo, setAgentInfo] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [step, setStep] = useState(1); // 1: Select date, 2: Select time, 3: Enter details, 4: Confirmation
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [formData, setFormData] = useState({
    booker_name: '',
    booker_email: '',
    booker_phone: '',
    notes: ''
  });

  useEffect(() => {
    fetchAgentInfo();
  }, [agentCode]);

  const fetchAgentInfo = async () => {
    try {
      const response = await publicBookingAPI.getAgentInfo(agentCode);
      setAgentInfo(response.data);
    } catch (error) {
      toast.error('Booking page not found');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (date) => {
    setLoadingSlots(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const response = await publicBookingAPI.getAvailableSlots(agentCode, dateStr);
      setAvailableSlots(response.data.slots || []);
      if (response.data.slots?.length === 0) {
        toast.info(response.data.message || 'No available slots for this date');
      }
    } catch (error) {
      toast.error('Failed to load available times');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (date) => {
    if (!date) return;
    setSelectedDate(date);
    setSelectedSlot(null);
    fetchAvailableSlots(date);
    setStep(2);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.booker_name || !formData.booker_email) {
      toast.error('Please fill in required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await publicBookingAPI.createBooking(agentCode, {
        ...formData,
        booking_date: selectedDate.toISOString().split('T')[0],
        booking_time: selectedSlot.time
      });
      setConfirmationMessage(response.data.confirmation_message);
      setBookingConfirmed(true);
      setStep(4);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date) => {
    return date?.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Disable dates in the past and beyond advance booking days
  const isDateDisabled = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + (agentInfo?.advance_booking_days || 30));
    
    // Check day of week availability
    const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1; // Convert to Monday=0
    const dayAvailability = agentInfo?.availability_slots?.find(s => s.day_of_week === dayOfWeek);
    const isDayAvailable = dayAvailability?.is_available !== false;
    
    return date < today || date > maxDate || !isDayAvailable;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!agentInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Booking Page Not Found</h2>
            <p className="text-muted-foreground">This booking link may be invalid or expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4" data-testid="public-booking-page">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-serif font-bold">{agentInfo.booking_page_title}</h1>
          <p className="text-muted-foreground mt-2">{agentInfo.booking_page_description}</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{agentInfo.agent_name}</span>
            <span className="text-muted-foreground">•</span>
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{agentInfo.meeting_duration} min meeting</span>
          </div>
        </div>

        {/* Progress Steps */}
        {!bookingConfirmed && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {s}
                </div>
                {s < 3 && <div className={`w-12 h-1 rounded ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Confirmation */}
        {bookingConfirmed && (
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-serif font-bold mb-2">Booking Confirmed!</h2>
              <p className="text-muted-foreground mb-6">{confirmationMessage}</p>
              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{formatDate(selectedDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">{selectedSlot?.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{agentInfo.meeting_duration} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">With:</span>
                  <span className="font-medium">{agentInfo.agent_name}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                A confirmation email has been sent to {formData.booker_email}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 1 & 2: Date and Time Selection */}
        {!bookingConfirmed && step <= 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Select a Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={isDateDisabled}
                  className="rounded-md"
                />
              </CardContent>
            </Card>

            {/* Time Slots */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">
                  {selectedDate ? `Available Times - ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Select a Date First'}
                </CardTitle>
                <CardDescription>
                  {selectedDate ? 'Choose a time slot' : 'Pick a date to see available times'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedDate ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Please select a date</p>
                  </div>
                ) : loadingSlots ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                    <p className="text-muted-foreground mt-2">Loading available times...</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No available times for this date</p>
                    <p className="text-sm">Please select another date</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={selectedSlot?.time === slot.time ? 'default' : 'outline'}
                        className="h-12"
                        onClick={() => handleSlotSelect(slot)}
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Enter Details */}
        {!bookingConfirmed && step === 3 && (
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle className="font-serif">Your Information</CardTitle>
              <CardDescription>
                Booking for {formatDate(selectedDate)} at {selectedSlot?.time}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={formData.booker_name}
                      onChange={(e) => setFormData({ ...formData, booker_name: e.target.value })}
                      placeholder="Your full name"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.booker_email}
                      onChange={(e) => setFormData({ ...formData, booker_email: e.target.value })}
                      placeholder="your@email.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <PhoneVerification
                  value={formData.booker_phone}
                  onChange={(phone) => setFormData({ ...formData, booker_phone: phone })}
                  onVerified={() => setPhoneVerified(true)}
                  label="Phone (requires verification)"
                />
                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Anything you'd like us to know..."
                      className="pl-10"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      'Confirm Booking'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
