import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { seedAPI } from '../lib/api';
import { Building2, Eye, EyeOff, Home } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Seed data on first load
    seedAPI.seed().catch(() => {});
  }, []);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-[#0a1628] relative overflow-hidden"
      data-testid="login-page"
    >
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1640109478916-f445f8f19b11?crop=entropy&cs=srgb&fm=jpg&q=85')`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628]/95 via-[#0a1628]/85 to-[#0a1628]/95" />
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl"></div>
      <div className="absolute top-1/4 left-10 w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
      <div className="absolute top-1/3 right-20 w-1.5 h-1.5 bg-amber-400/60 rounded-full"></div>
      <div className="absolute bottom-1/4 left-1/4 w-1 h-1 bg-amber-400/40 rounded-full"></div>
      
      {/* Corner Accents */}
      <div className="absolute top-8 left-8 w-20 h-20 border-l-2 border-t-2 border-amber-400/20 rounded-tl-3xl"></div>
      <div className="absolute top-8 right-8 w-20 h-20 border-r-2 border-t-2 border-amber-400/20 rounded-tr-3xl"></div>
      <div className="absolute bottom-8 left-8 w-20 h-20 border-l-2 border-b-2 border-amber-400/20 rounded-bl-3xl"></div>
      <div className="absolute bottom-8 right-8 w-20 h-20 border-r-2 border-b-2 border-amber-400/20 rounded-br-3xl"></div>
      
      {/* Back to Home Link */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-white/70 hover:text-amber-400 transition-colors z-20"
      >
        <Home className="w-5 h-5" />
        <span className="text-sm">Back to Home</span>
      </Link>
      
      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Decorative rings around card */}
        <div className="absolute -inset-4 rounded-3xl border border-amber-400/10 pointer-events-none"></div>
        <div className="absolute -inset-8 rounded-3xl border border-amber-400/5 pointer-events-none"></div>
        
        <Card className="bg-[#0d1f3c]/90 backdrop-blur-xl border-amber-400/20 shadow-2xl shadow-amber-400/5">
          <CardHeader className="text-center space-y-4 pb-2">
            {/* Logo with decorative frame */}
            <div className="relative mx-auto">
              <div className="absolute -inset-3 bg-gradient-to-br from-amber-400/20 to-amber-600/20 rounded-2xl blur-sm"></div>
              <div className="relative w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-400/30">
                <span className="font-serif text-black font-bold text-2xl">F</span>
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-serif text-white">Fusion CRM</CardTitle>
              <CardDescription className="text-white/50">Real Estate Management Platform</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="login-email"
                  className="h-12 bg-[#0a1628]/80 border-amber-400/20 text-white placeholder:text-white/40 focus:border-amber-400 focus:ring-amber-400/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/80">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="login-password"
                    className="h-12 pr-12 bg-[#0a1628]/80 border-amber-400/20 text-white placeholder:text-white/40 focus:border-amber-400 focus:ring-amber-400/20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-12 w-12 text-white/50 hover:text-amber-400 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-semibold rounded-lg transition-all duration-300"
                disabled={isLoading}
                data-testid="login-submit"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-white/50">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
                Create account
              </Link>
            </div>
          </CardContent>
        </Card>
        
        {/* Powered by footer */}
        <p className="text-center text-sm text-white/30 mt-8">
          Powered By: <a href="https://a2gdesigns.com" target="_blank" rel="noopener noreferrer" className="text-amber-400/70 hover:text-amber-400 transition-colors">A2G</a>
        </p>
      </div>
    </div>
  );
};
