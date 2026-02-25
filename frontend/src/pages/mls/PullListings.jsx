import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Download, 
  RefreshCw, 
  CheckCircle,
  AlertCircle,
  Home,
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import api from '../../lib/api';
import { toast } from 'sonner';

export const PullListings = () => {
  const navigate = useNavigate();
  const [pulling, setPulling] = useState(false);
  const [result, setResult] = useState(null);
  const [options, setOptions] = useState({
    includePending: true,
    includeSold: false
  });

  const handlePull = async () => {
    setPulling(true);
    setResult(null);
    
    try {
      const response = await api.post('/mls-listings/pull', {
        include_pending: options.includePending,
        include_sold: options.includeSold
      });
      
      setResult(response.data);
      
      if (response.data.new_listings > 0 || response.data.updated_listings > 0) {
        toast.success(`Pulled ${response.data.total_pulled} listings!`);
      } else {
        toast.info('No new listings to pull');
      }
    } catch (error) {
      console.error('Error pulling listings:', error);
      toast.error(error.response?.data?.detail || 'Failed to pull listings');
    } finally {
      setPulling(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="pull-listings-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold">Pull Listings</h1>
        <p className="text-muted-foreground">
          Sync your MLS listings from Stellar MLS
        </p>
      </div>

      {/* Pull Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-amber-500" />
            Pull Options
          </CardTitle>
          <CardDescription>
            Choose which listings to pull from the MLS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <User className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-medium">Agent: Sheila Desautels</p>
              <p className="text-sm text-muted-foreground">MLS ID: 261507429</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="active" 
                checked={true}
                disabled
              />
              <Label htmlFor="active" className="text-sm">
                Active Listings (always included)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="pending" 
                checked={options.includePending}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includePending: checked }))}
              />
              <Label htmlFor="pending" className="text-sm">
                Include Pending/Under Contract
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="sold" 
                checked={options.includeSold}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeSold: checked }))}
              />
              <Label htmlFor="sold" className="text-sm">
                Include Sold/Closed (historical)
              </Label>
            </div>
          </div>

          <Button 
            onClick={handlePull} 
            disabled={pulling}
            className="w-full bg-amber-500 hover:bg-amber-600"
            data-testid="start-pull-btn"
          >
            {pulling ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Pulling from MLS...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Pull Listings Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-500">
              <CheckCircle className="w-5 h-5" />
              Pull Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <p className="text-3xl font-bold text-green-500">{result.new_listings}</p>
                <p className="text-sm text-muted-foreground">New Listings</p>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                <p className="text-3xl font-bold text-blue-500">{result.updated_listings}</p>
                <p className="text-sm text-muted-foreground">Updated</p>
              </div>
              <div className="text-center p-4 bg-amber-500/10 rounded-lg">
                <p className="text-3xl font-bold text-amber-500">{result.total_pulled}</p>
                <p className="text-sm text-muted-foreground">Total Processed</p>
              </div>
            </div>

            {result.new_listings > 0 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <p className="text-sm">
                  <span className="font-medium">{result.new_listings} new listings</span> are pending review. 
                  Moderate them before they appear on the website.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate('/mls/moderate')}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Review Listings
              </Button>
              <Button 
                variant="outline" 
                onClick={handlePull}
                disabled={pulling}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Pull Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Home className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How it works:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Pull fetches your listings from Stellar MLS</li>
                <li>New listings are marked as "Pending Review"</li>
                <li>Review and approve listings in the Moderate section</li>
                <li>Convert approved listings to your public Showcase</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PullListings;
