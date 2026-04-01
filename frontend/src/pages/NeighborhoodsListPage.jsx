import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, MapPin, ArrowRight, Loader2, Building2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { PublicSiteHeader } from '../components/public/PublicSiteHeader';
import { PublicSeoHead } from '../components/public/PublicSeoHead';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

export const NeighborhoodsListPage = () => {
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/neighborhoods/public/list`);
        setNeighborhoods(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load neighborhoods');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <PublicSeoHead
        title="Neighborhoods | Hidden Haven Realty"
        description="Explore Tampa Bay's most sought-after neighborhoods with Hidden Haven Realty"
      />
      <PublicSiteHeader activePage="neighborhoods" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl sm:text-5xl font-serif text-white mb-3" data-testid="neighborhoods-title">
          Neighborhoods
        </h1>
        <p className="text-white/60 mb-10 text-lg">Explore Tampa Bay's most desirable areas</p>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
          </div>
        ) : neighborhoods.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-16 h-16 mx-auto text-white/20 mb-4" />
            <h2 className="text-xl text-white">Neighborhoods coming soon</h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {neighborhoods.map((n) => (
              <Link
                key={n.id}
                to={`/neighborhoods/${n.slug}`}
                className="group"
                data-testid={`neighborhood-card-${n.slug}`}
              >
                <Card className="bg-white/5 border-white/10 hover:border-amber-400/40 transition-all h-full">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-6 h-6 text-amber-400" />
                      </div>
                      <span className="text-white font-serif text-lg group-hover:text-amber-400 transition-colors">
                        {n.name}
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-amber-400 transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NeighborhoodsListPage;
