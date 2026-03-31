import React, { useState, useEffect } from 'react';
import { bookingAPI, contactsAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Settings, 
  Link2, 
  Copy, 
  Check,
  ExternalLink,
  User,
  Mail,
  Trash2,
  CheckCircle2,
  XCircle,
  Bell,
  Plus,
  ChevronLeft,
  ChevronRight,
  Video,
  UserPlus,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Calendar } from '../components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { PhoneVerification } from '../components/PhoneVerification';
import { toast } from 'sonner';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const VIDEO_PLATFORMS = {
  none: { label: 'No Video Call', url: null },
  saysme: { label: 'SaysMe Meet', url: 'https://meet.saysme.org' },
  zoom: { label: 'Zoom', url: null } // Agent provides their own Zoom link
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
};

export const BookingPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('calendar');
  const [bookingSettings, setBookingSettings] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBlockDateOpen, setIsBlockDateOpen] = useState(false);
  const [blockDateInput, setBlockDateInput] = useState('');
  const [blockReason, setBlockReason] = useState('');
  
  // Create Booking Modal State
  const [isCreateBookingOpen, setIsCreateBookingOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [useExistingLead, setUseExistingLead] = useState(true);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [newBooking, setNewBooking] = useState({
    selectedContactId: '',
    booker_name: '',
    booker_email: '',
    booker_phone: '',
    booking_date: '',
    booking_time: '',
    notes: '',
    video_platform: 'none',
    zoom_link: '',
    duration: 30
  });
  const [creatingBooking, setCreatingBooking] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, bookingsRes, blockedRes, contactsRes] = await Promise.all([
        bookingAPI.getSettings(),
        bookingAPI.getBookings(),
        bookingAPI.getBlockedDates(),
        contactsAPI.list()
      ]);
      setBookingSettings(settingsRes.data);
      const bookingsPayload = bookingsRes?.data;
      setBookings(Array.isArray(bookingsPayload) ? bookingsPayload : (bookingsPayload?.bookings || []));
      const blockedPayload = blockedRes?.data;
      setBlockedDates(Array.isArray(blockedPayload) ? blockedPayload : (blockedPayload?.blocked_dates || []));
      const contactsPayload = contactsRes?.data;
      setContacts(Array.isArray(contactsPayload) ? contactsPayload : (contactsPayload?.contacts || []));
    } catch (error) {
      toast.error('Failed to load booking data');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/book/${bookingSettings?.booking_link?.split('/').pop()}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Booking link copied!');
  };

  const handleUpdateSettings = async () => {
    try {
      const res = await bookingAPI.updateSettings({
        meeting_duration: bookingSettings.meeting_duration,
        buffer_time: bookingSettings.buffer_time,
        advance_booking_days: bookingSettings.advance_booking_days,
        availability_slots: bookingSettings.availability_slots,
        booking_page_title: bookingSettings.booking_page_title,
        booking_page_description: bookingSettings.booking_page_description,
        confirmation_message: bookingSettings.confirmation_message,
        email_notifications: bookingSettings.email_notifications,
        sms_notifications: bookingSettings.sms_notifications,
      });
      setBookingSettings(res.data);
      setIsSettingsOpen(false);
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleBookingStatusChange = async (bookingId, newStatus) => {
    try {
      await bookingAPI.updateBookingStatus(bookingId, newStatus);
      setBookings(prev => prev.map(b => 
        b.id === bookingId ? { ...b, status: newStatus } : b
      ));
      toast.success(`Booking ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update booking');
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    try {
      await bookingAPI.deleteBooking(bookingId);
      setBookings(prev => prev.filter(b => b.id !== bookingId));
      toast.success('Booking deleted');
    } catch (error) {
      toast.error('Failed to delete booking');
    }
  };

  const handleBlockDate = async () => {
    if (!blockDateInput) {
      toast.error('Please select a date');
      return;
    }
    try {
      await bookingAPI.addBlockedDate({ date: blockDateInput, reason: blockReason });
      setBlockedDates(prev => [...prev, { date: blockDateInput, reason: blockReason }]);
      setIsBlockDateOpen(false);
      setBlockDateInput('');
      setBlockReason('');
      toast.success('Date blocked');
    } catch (error) {
      toast.error('Failed to block date');
    }
  };

  const handleUnblockDate = async (date) => {
    try {
      await bookingAPI.removeBlockedDate(date);
      setBlockedDates(prev => prev.filter(d => d.date !== date));
      toast.success('Date unblocked');
    } catch (error) {
      toast.error('Failed to unblock date');
    }
  };

  const handleAvailabilityChange = (dayIndex, field, value) => {
    setBookingSettings(prev => ({
      ...prev,
      availability_slots: prev.availability_slots.map((slot, i) => 
        i === dayIndex ? { ...slot, [field]: value } : slot
      )
    }));
  };

  // Create Booking Handlers
  const handleOpenCreateBooking = () => {
    setNewBooking({
      selectedContactId: '',
      booker_name: '',
      booker_email: '',
      booker_phone: '',
      booking_date: selectedDate.toISOString().split('T')[0],
      booking_time: '09:00',
      notes: '',
      video_platform: 'none',
      zoom_link: '',
      duration: bookingSettings?.meeting_duration || 30
    });
    setUseExistingLead(true);
    setContactSearch('');
    setPhoneVerified(false);
    setIsCreateBookingOpen(true);
  };

  const handleSelectContact = (contact) => {
    setNewBooking(prev => ({
      ...prev,
      selectedContactId: contact.id,
      booker_name: contact.name,
      booker_email: contact.email || '',
      booker_phone: contact.phone || ''
    }));
    setContactSearch('');
  };

  const handleCreateBooking = async () => {
    if (!newBooking.booker_name || !newBooking.booker_email || !newBooking.booking_date || !newBooking.booking_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreatingBooking(true);
    try {
      // Build video link
      let videoLink = null;
      if (newBooking.video_platform === 'saysme') {
        const roomId = `hiddenhaven-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        videoLink = `https://meet.saysme.org/${roomId}`;
      } else if (newBooking.video_platform === 'zoom' && newBooking.zoom_link) {
        videoLink = newBooking.zoom_link;
      }

      const bookingData = {
        booker_name: newBooking.booker_name,
        booker_email: newBooking.booker_email,
        booker_phone: newBooking.booker_phone,
        booking_date: newBooking.booking_date,
        booking_time: newBooking.booking_time,
        notes: newBooking.notes,
        video_link: videoLink,
        video_platform: newBooking.video_platform !== 'none' ? newBooking.video_platform : null,
        contact_id: newBooking.selectedContactId || null,
        duration: newBooking.duration
      };

      const res = await bookingAPI.createBooking(bookingData);
      setBookings(prev => [...prev, res.data]);
      setIsCreateBookingOpen(false);
      toast.success('Booking created successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create booking');
    } finally {
      setCreatingBooking(false);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.company?.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const getBookingsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(b => b.booking_date === dateStr);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const selectedDateBookings = getBookingsForDate(selectedDate);
  const bookingLink = bookingSettings?.booking_link ? 
    `${window.location.origin}/book/${bookingSettings.booking_link.split('/').pop()}` : '';

  return (
    <div className="space-y-6 animate-fade-in" data-testid="booking-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
            <CalendarIcon className="w-8 h-8" />
            Booking Calendar
          </h1>
          <p className="text-muted-foreground mt-1">Manage your appointments and availability</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleOpenCreateBooking} data-testid="create-booking-btn">
            <Plus className="w-4 h-4 mr-2" />
            Create Booking
          </Button>
          <Button variant="outline" onClick={() => setIsBlockDateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Block Date
          </Button>
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Booking Link Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Link2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-medium">Your Booking Link</p>
                <p className="text-sm text-muted-foreground truncate max-w-md">{bookingLink}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button size="sm" onClick={() => window.open(bookingLink, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-1" />
                Preview
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">All Bookings</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-1">
              <CardContent className="p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md"
                  modifiers={{
                    booked: bookings.map(b => new Date(b.booking_date)),
                    blocked: blockedDates.map(d => new Date(d.date))
                  }}
                  modifiersStyles={{
                    booked: { backgroundColor: 'hsl(var(--primary) / 0.2)' },
                    blocked: { backgroundColor: 'hsl(var(--destructive) / 0.2)', textDecoration: 'line-through' }
                  }}
                />
              </CardContent>
            </Card>

            {/* Selected Date Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-serif">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </CardTitle>
                <CardDescription>
                  {selectedDateBookings.length} booking{selectedDateBookings.length !== 1 ? 's' : ''} scheduled
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDateBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No bookings for this date</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold">{booking.booking_time}</p>
                            <p className="text-xs text-muted-foreground">{booking.duration} min</p>
                          </div>
                          <div>
                            <p className="font-medium">{booking.booker_name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {booking.booker_email}
                            </div>
                            {booking.booker_phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                {booking.booker_phone}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusColors[booking.status]}>{booking.status}</Badge>
                          {booking.status === 'pending' && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleBookingStatusChange(booking.id, 'confirmed')}>
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleBookingStatusChange(booking.id, 'cancelled')}>
                                <XCircle className="w-4 h-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteBooking(booking.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* All Bookings List */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">All Bookings</CardTitle>
              <CardDescription>View and manage all your appointments</CardDescription>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No bookings yet</p>
                  <p className="text-sm">Share your booking link to start receiving appointments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date)).map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[80px]">
                          <p className="font-medium">{formatDate(booking.booking_date)}</p>
                          <p className="text-lg font-bold">{booking.booking_time}</p>
                        </div>
                        <div>
                          <p className="font-medium">{booking.booker_name}</p>
                          <p className="text-sm text-muted-foreground">{booking.booker_email}</p>
                          {booking.notes && (
                            <p className="text-sm text-muted-foreground mt-1 italic">"{booking.notes}"</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={booking.status} 
                          onValueChange={(value) => handleBookingStatusChange(booking.id, value)}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteBooking(booking.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Availability Settings */}
        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Weekly Availability</CardTitle>
              <CardDescription>Set your available hours for each day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookingSettings?.availability_slots?.map((slot, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                    <div className="w-28">
                      <p className="font-medium">{DAYS_OF_WEEK[slot.day_of_week]}</p>
                    </div>
                    <Switch
                      checked={slot.is_available}
                      onCheckedChange={(checked) => handleAvailabilityChange(index, 'is_available', checked)}
                    />
                    {slot.is_available && (
                      <>
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={slot.start_time}
                            onChange={(e) => handleAvailabilityChange(index, 'start_time', e.target.value)}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={slot.end_time}
                            onChange={(e) => handleAvailabilityChange(index, 'end_time', e.target.value)}
                            className="w-32"
                          />
                        </div>
                      </>
                    )}
                    {!slot.is_available && (
                      <span className="text-muted-foreground">Unavailable</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={handleUpdateSettings}>Save Availability</Button>
              </div>
            </CardContent>
          </Card>

          {/* Blocked Dates */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="font-serif">Blocked Dates</CardTitle>
              <CardDescription>Dates you're unavailable for bookings</CardDescription>
            </CardHeader>
            <CardContent>
              {blockedDates.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No blocked dates</p>
              ) : (
                <div className="space-y-2">
                  {blockedDates.map((blocked) => (
                    <div key={blocked.date} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{formatDate(blocked.date)}</p>
                        {blocked.reason && <p className="text-sm text-muted-foreground">{blocked.reason}</p>}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleUnblockDate(blocked.date)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Booking Settings</DialogTitle>
            <DialogDescription>Configure your booking page and notifications</DialogDescription>
          </DialogHeader>
          {bookingSettings && (
            <div className="space-y-4">
              <div>
                <Label>Booking Page Title</Label>
                <Input
                  value={bookingSettings.booking_page_title}
                  onChange={(e) => setBookingSettings({ ...bookingSettings, booking_page_title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={bookingSettings.booking_page_description}
                  onChange={(e) => setBookingSettings({ ...bookingSettings, booking_page_description: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label>Confirmation Message</Label>
                <Textarea
                  value={bookingSettings.confirmation_message}
                  onChange={(e) => setBookingSettings({ ...bookingSettings, confirmation_message: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    value={bookingSettings.meeting_duration}
                    onChange={(e) => setBookingSettings({ ...bookingSettings, meeting_duration: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Buffer (min)</Label>
                  <Input
                    type="number"
                    value={bookingSettings.buffer_time}
                    onChange={(e) => setBookingSettings({ ...bookingSettings, buffer_time: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Advance Days</Label>
                  <Input
                    type="number"
                    value={bookingSettings.advance_booking_days}
                    onChange={(e) => setBookingSettings({ ...bookingSettings, advance_booking_days: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Get notified via email</p>
                  </div>
                  <Switch
                    checked={bookingSettings.email_notifications}
                    onCheckedChange={(checked) => setBookingSettings({ ...bookingSettings, email_notifications: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Get notified via SMS</p>
                  </div>
                  <Switch
                    checked={bookingSettings.sms_notifications}
                    onCheckedChange={(checked) => setBookingSettings({ ...bookingSettings, sms_notifications: checked })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Date Dialog */}
      <Dialog open={isBlockDateOpen} onOpenChange={setIsBlockDateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block a Date</DialogTitle>
            <DialogDescription>Mark a date as unavailable for bookings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={blockDateInput}
                onChange={(e) => setBlockDateInput(e.target.value)}
              />
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Input
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g., Holiday, Personal day"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlockDateOpen(false)}>Cancel</Button>
            <Button onClick={handleBlockDate}>Block Date</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Booking Dialog */}
      <Dialog open={isCreateBookingOpen} onOpenChange={setIsCreateBookingOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Create New Booking
            </DialogTitle>
            <DialogDescription>Schedule a meeting with a lead or new contact</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5">
            {/* Lead Selection Toggle */}
            <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
              <div 
                className={`flex-1 p-3 rounded-md cursor-pointer transition-all ${useExistingLead ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                onClick={() => setUseExistingLead(true)}
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Select Existing Lead</span>
                </div>
              </div>
              <div 
                className={`flex-1 p-3 rounded-md cursor-pointer transition-all ${!useExistingLead ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                onClick={() => setUseExistingLead(false)}
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span className="font-medium">Enter New Contact</span>
                </div>
              </div>
            </div>

            {/* Existing Lead Search */}
            {useExistingLead && (
              <div className="space-y-2">
                <Label>Search Contacts</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Search by name, email, or company..."
                    className="pl-10"
                  />
                </div>
                {contactSearch && filteredContacts.length > 0 && (
                  <div className="border rounded-lg max-h-40 overflow-y-auto">
                    {filteredContacts.slice(0, 5).map(contact => (
                      <div 
                        key={contact.id}
                        className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => handleSelectContact(contact)}
                      >
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">{contact.email} {contact.company && `• ${contact.company}`}</p>
                      </div>
                    ))}
                  </div>
                )}
                {newBooking.selectedContactId && (
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{newBooking.booker_name}</p>
                        <p className="text-sm text-muted-foreground">{newBooking.booker_email}</p>
                      </div>
                      <Badge variant="secondary">Selected</Badge>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual Entry Fields */}
            {!useExistingLead && (
              <div className="space-y-3">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={newBooking.booker_name}
                    onChange={(e) => setNewBooking(prev => ({ ...prev, booker_name: e.target.value }))}
                    placeholder="Contact name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={newBooking.booker_email}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, booker_email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <PhoneVerification
                  value={newBooking.booker_phone}
                  onChange={(phone) => setNewBooking(prev => ({ ...prev, booker_phone: phone }))}
                  onVerified={() => setPhoneVerified(true)}
                  label="Phone (requires verification)"
                />
              </div>
            )}

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={newBooking.booking_date}
                  onChange={(e) => setNewBooking(prev => ({ ...prev, booking_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Time *</Label>
                <Input
                  type="time"
                  value={newBooking.booking_time}
                  onChange={(e) => setNewBooking(prev => ({ ...prev, booking_time: e.target.value }))}
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <Label>Duration</Label>
              <Select 
                value={String(newBooking.duration)} 
                onValueChange={(v) => setNewBooking(prev => ({ ...prev, duration: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Video Call Options */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Video Call Option
              </Label>
              <div className="space-y-2">
                <div 
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${newBooking.video_platform === 'none' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setNewBooking(prev => ({ ...prev, video_platform: 'none' }))}
                >
                  <div className={`w-4 h-4 rounded-full border-2 ${newBooking.video_platform === 'none' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                    {newBooking.video_platform === 'none' && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span>No Video Call (In-person or phone)</span>
                </div>
                
                <div 
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${newBooking.video_platform === 'saysme' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setNewBooking(prev => ({ ...prev, video_platform: 'saysme' }))}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${newBooking.video_platform === 'saysme' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                    {newBooking.video_platform === 'saysme' && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">SaysMe Meet</span>
                    <p className="text-xs text-muted-foreground">Auto-generate meet.saysme.org link</p>
                  </div>
                </div>
                
                <div 
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${newBooking.video_platform === 'zoom' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setNewBooking(prev => ({ ...prev, video_platform: 'zoom' }))}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${newBooking.video_platform === 'zoom' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                    {newBooking.video_platform === 'zoom' && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">Zoom</span>
                    <p className="text-xs text-muted-foreground">Use your Zoom meeting link</p>
                  </div>
                </div>

                {newBooking.video_platform === 'zoom' && (
                  <div className="pl-7">
                    <Input
                      value={newBooking.zoom_link}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, zoom_link: e.target.value }))}
                      placeholder="https://zoom.us/j/..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newBooking.notes}
                onChange={(e) => setNewBooking(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsCreateBookingOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateBooking} disabled={creatingBooking}>
              {creatingBooking ? 'Creating...' : 'Create Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
