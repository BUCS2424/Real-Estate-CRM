import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, contactsAPI, dealsAPI, tasksAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { MobileAgentMenu } from '../components/MobileAgentMenu';
import { 
  Users, 
  Briefcase, 
  CheckSquare, 
  DollarSign,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';

const StatCard = ({ title, value, icon: Icon, trend, color }) => (
  <Card className="card-interactive">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-serif font-bold mt-1">{value}</p>
          {trend && (
            <p className="text-xs text-chart-1 flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [recentContacts, setRecentContacts] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, contactsRes, tasksRes] = await Promise.all([
          dashboardAPI.stats(),
          contactsAPI.list(),
          tasksAPI.list()
        ]);

        const statsData = statsRes?.data || {};

        const contactsPayload = contactsRes?.data;
        const contactsList = Array.isArray(contactsPayload)
          ? contactsPayload
          : (contactsPayload && Array.isArray(contactsPayload.contacts) ? contactsPayload.contacts : []);

        const tasksPayload = tasksRes?.data;
        const tasksList = Array.isArray(tasksPayload)
          ? tasksPayload
          : (tasksPayload && Array.isArray(tasksPayload.tasks) ? tasksPayload.tasks : []);

        setStats(statsData);
        setRecentContacts(contactsList.slice(0, 5));
        setRecentTasks(tasksList.filter((t) => t?.status !== 'done').slice(0, 5));
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed'];
  const stageLabels = {
    lead: 'Leads',
    qualified: 'Qualified',
    proposal: 'Proposal',
    negotiation: 'Negotiation',
    closed: 'Closed'
  };

  return (
    <div className="space-y-8 animate-fade-in" data-testid="dashboard-page">

      {/* ── Mobile Quick-Launch Menu (visible on phones only) ── */}
      <MobileAgentMenu />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your real estate business</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/contacts')} variant="outline" data-testid="quick-add-contact">
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
          <Button onClick={() => navigate('/deals')} data-testid="quick-add-deal">
            <Plus className="w-4 h-4 mr-2" />
            New Deal
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          title="Total Contacts"
          value={stats?.contacts || 0}
          icon={Users}
          color="bg-chart-1"
        />
        <StatCard
          title="Active Deals"
          value={stats?.deals || 0}
          icon={Briefcase}
          color="bg-chart-2"
        />
        <StatCard
          title="Pipeline Value"
          value={formatCurrency(stats?.pipeline_value || 0)}
          icon={DollarSign}
          color="bg-chart-3"
        />
        <StatCard
          title="Pending Tasks"
          value={stats?.high_priority_tasks || 0}
          icon={AlertCircle}
          color="bg-chart-5"
        />
      </div>

      {/* Pipeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Deal Pipeline</CardTitle>
          <CardDescription>Current distribution across stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {stages.map((stage) => {
              const count = stats?.deals_by_stage?.[stage] || 0;
              const total = stats?.deals || 1;
              const percentage = Math.round((count / total) * 100);
              
              return (
                <div key={stage} className="text-center">
                  <div className="text-2xl font-bold font-serif">{count}</div>
                  <div className="text-xs text-muted-foreground mb-2">{stageLabels[stage]}</div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Contacts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-serif">Recent Contacts</CardTitle>
              <CardDescription>Latest leads and contacts</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/contacts')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentContacts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No contacts yet</p>
              ) : (
                recentContacts.map((contact) => (
                  <div 
                    key={contact.id} 
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {contact.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">{contact.company || contact.email}</p>
                      </div>
                    </div>
                    <Badge variant={contact.lead_score >= 80 ? 'default' : 'secondary'}>
                      Score: {contact.lead_score}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-serif">Pending Tasks</CardTitle>
              <CardDescription>Tasks requiring attention</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No pending tasks</p>
              ) : (
                recentTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CheckSquare className={`w-5 h-5 ${
                        task.priority === 'high' ? 'text-destructive' : 
                        task.priority === 'medium' ? 'text-chart-2' : 'text-muted-foreground'
                      }`} />
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">{task.description || 'No description'}</p>
                      </div>
                    </div>
                    <Badge variant={
                      task.priority === 'high' ? 'destructive' : 
                      task.priority === 'medium' ? 'default' : 'secondary'
                    }>
                      {task.priority}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
