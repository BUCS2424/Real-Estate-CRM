import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Share2,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Music2,
  Image as ImageIcon,
  TrendingUp,
  Loader2,
  RefreshCw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

// Platform icons mapping
const platformIcons = {
  facebook: { icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-500/20' },
  instagram: { icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-500/20' },
  linkedin: { icon: Linkedin, color: 'text-blue-700', bg: 'bg-blue-700/20' },
  twitter: { icon: Twitter, color: 'text-sky-500', bg: 'bg-sky-500/20' },
  tiktok: { icon: Music2, color: 'text-black dark:text-white', bg: 'bg-gray-500/20' },
  pinterest: { icon: ImageIcon, color: 'text-red-600', bg: 'bg-red-500/20' }
};

export const SocialMediaDashboard = () => {
  const [stats, setStats] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [upcomingPosts, setUpcomingPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, accountsRes, postsRes, queueRes] = await Promise.all([
        api.get('/social/stats'),
        api.get('/social/accounts'),
        api.get('/social/posts?limit=5'),
        api.get('/social/queue')
      ]);
      
      setStats(statsRes.data);
      setAccounts(accountsRes.data.accounts || []);
      setRecentPosts(postsRes.data.posts || []);
      setUpcomingPosts(queueRes.data.queue || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform) => {
    const config = platformIcons[platform] || platformIcons.facebook;
    const Icon = config.icon;
    return <Icon className={`w-5 h-5 ${config.color}`} />;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500/20 text-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Published</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-500/20 text-blue-600"><Clock className="w-3 h-3 mr-1" /> Scheduled</Badge>;
      case 'draft':
        return <Badge className="bg-gray-500/20 text-gray-600">Draft</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-600"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="social-media-dashboard">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold">Social Media Dashboard</h1>
          <p className="text-muted-foreground">Manage and schedule your social media posts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboardData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link to="/social-media/compose">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black">
              <Plus className="w-4 h-4 mr-2" />
              Create Post
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Posts</p>
                <p className="text-2xl font-bold">{stats?.total_posts || 0}</p>
              </div>
              <Share2 className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold text-green-600">{stats?.published || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.scheduled || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold text-gray-600">{stats?.drafts || 0}</p>
              </div>
              <Share2 className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold text-purple-600">{stats?.posts_this_week || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accounts</p>
                <p className="text-2xl font-bold text-amber-600">{stats?.connected_accounts || 0}</p>
              </div>
              <Share2 className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Connected Accounts
              <Link to="/social-media/settings">
                <Button variant="ghost" size="sm">Manage</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No accounts connected</p>
                <Link to="/social-media/settings">
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Connect Account
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div key={account.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${platformIcons[account.platform]?.bg || 'bg-gray-500/20'}`}>
                      {getPlatformIcon(account.platform)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{account.account_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{account.platform}</p>
                    </div>
                    <Badge className="bg-green-500/20 text-green-600">Connected</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Upcoming Posts
              <Link to="/social-media/queue">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingPosts.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No scheduled posts</p>
                <Link to="/social-media/compose">
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Post
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingPosts.slice(0, 5).map((post) => (
                  <div key={post.id} className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm line-clamp-2 mb-2">{post.content}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {post.platforms?.map(p => (
                          <span key={p} className="w-5 h-5">{getPlatformIcon(p)}</span>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.scheduled_for).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Posts
              <Link to="/social-media/calendar">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPosts.length === 0 ? (
              <div className="text-center py-8">
                <Share2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No posts yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPosts.slice(0, 5).map((post) => (
                  <div key={post.id} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm line-clamp-2 flex-1">{post.content}</p>
                      {getStatusBadge(post.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {post.platforms?.map(p => (
                          <span key={p} className="w-5 h-5">{getPlatformIcon(p)}</span>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/social-media/compose">
              <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                <Plus className="w-6 h-6 text-amber-500" />
                <span>New Post</span>
              </Button>
            </Link>
            <Link to="/social-media/ai-content">
              <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                <Sparkles className="w-6 h-6 text-purple-500" />
                <span>AI Generate</span>
              </Button>
            </Link>
            <Link to="/social-media/templates">
              <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                <Share2 className="w-6 h-6 text-blue-500" />
                <span>Templates</span>
              </Button>
            </Link>
            <Link to="/social-media/settings">
              <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                <Share2 className="w-6 h-6 text-green-500" />
                <span>Connect Account</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialMediaDashboard;
