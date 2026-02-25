import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Download, 
  CheckCircle, 
  ArrowRightCircle, 
  Home,
  DollarSign,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import api from '../../lib/api';
import { toast } from 'sonner';

export const MLSOverview = () => {
  const [stats, setStats] = useState(null);
  const [mlsStatus, setMlsStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, statusRes] = await Promise.all([
        api.get('/mls-listings/stats'),
        api.get('/mls/status')
      ]);
      setStats(statsRes.data);
      setMlsStatus(statusRes.data);
    } catch (error) {
      console.error('Error fetching MLS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Pending Review',
      value: stats?.by_sync_status?.pending || 0,
      icon: AlertCircle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      link: '/mls/moderate'
    },
    {
      title: 'Approved',
      value: stats?.by_sync_status?.approved || 0,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      link: '/mls/moderate?status=approved'
    },
    {
      title: 'Converted to Showcase',
      value: stats?.by_sync_status?.converted || 0,
      icon: ArrowRightCircle,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      link: '/mls/converted'
    },
    {
      title: 'Total Listings',
      value: stats?.total || 0,
      icon: Home,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      link: '/mls/moderate'
    }
  ];

  const mlsStatCards = [
    {
      title: 'Active Listings',
      value: stats?.by_mls_status?.active || 0,
      color: 'text-green-500'
    },
    {
      title: 'Pending Sale',
      value: stats?.by_mls_status?.pending_sale || 0,
      color: 'text-yellow-500'
    },
    {
      title: 'Closed/Sold',
      value: stats?.by_mls_status?.closed || 0,
      color: 'text-gray-500'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="mls-overview">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">MLS Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your MLS listings and sync to showcase
          </p>
        </div>
        <Link to="/mls/pull">
          <Button className="bg-amber-500 hover:bg-amber-600" data-testid="pull-listings-btn">
            <Download className="w-4 h-4 mr-2" />
            Pull Listings
          </Button>
        </Link>
      </div>

      {/* Connection Status */}
      <Card className={mlsStatus?.configured ? 'border-green-500/50' : 'border-red-500/50'}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${mlsStatus?.configured ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <div>
                <p className="font-medium">{mlsStatus?.provider || 'Bridge API'}</p>
                <p className="text-sm text-muted-foreground">{mlsStatus?.dataset || 'Not Connected'}</p>
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>{mlsStatus?.message}</p>
              {mlsStatus?.last_sync && (
                <p>Last sync: {new Date(mlsStatus.last_sync).toLocaleString()}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} to={stat.link}>
              <Card className="hover:border-amber-500/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* MLS Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">MLS Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {mlsStatCards.map((stat) => (
              <div key={stat.title} className="text-center p-4 bg-muted/50 rounded-lg">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/mls/pull">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Download className="w-6 h-6 text-amber-500" />
                <span>Pull New Listings</span>
              </Button>
            </Link>
            <Link to="/mls/moderate">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span>Review Pending ({stats?.by_sync_status?.pending || 0})</span>
              </Button>
            </Link>
            <Link to="/mls/search">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <DollarSign className="w-6 h-6 text-blue-500" />
                <span>Search MLS</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MLSOverview;
