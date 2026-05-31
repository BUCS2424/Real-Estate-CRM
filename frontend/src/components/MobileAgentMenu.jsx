import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Users, Mic, CheckSquare, CalendarCheck, Search } from 'lucide-react';

const TOOLS = [
  {
    label: 'Dialer',
    icon: Phone,
    path: '/dialer',
    gradient: 'from-blue-500 to-blue-700',
    glow: 'shadow-blue-500/40',
    testid: 'mobile-tool-dialer',
  },
  {
    label: 'Contacts',
    icon: Users,
    path: '/contacts',
    gradient: 'from-indigo-500 to-indigo-700',
    glow: 'shadow-indigo-500/40',
    testid: 'mobile-tool-contacts',
  },
  {
    label: 'Record & Summarize',
    icon: Mic,
    path: '/voice-recorder',
    gradient: 'from-rose-500 to-rose-700',
    glow: 'shadow-rose-500/40',
    testid: 'mobile-tool-voice',
  },
  {
    label: 'Tasks',
    icon: CheckSquare,
    path: '/tasks',
    gradient: 'from-amber-500 to-amber-600',
    glow: 'shadow-amber-500/40',
    testid: 'mobile-tool-tasks',
  },
  {
    label: 'Bookings',
    icon: CalendarCheck,
    path: '/bookings',
    gradient: 'from-emerald-500 to-emerald-700',
    glow: 'shadow-emerald-500/40',
    testid: 'mobile-tool-bookings',
  },
  {
    label: 'Property Lookup',
    icon: Search,
    path: '/property-lookup',
    gradient: 'from-violet-500 to-violet-700',
    glow: 'shadow-violet-500/40',
    testid: 'mobile-tool-lookup',
  },
];

export const MobileAgentMenu = () => {
  const navigate = useNavigate();

  return (
    /* Only visible on mobile — hidden on md+ screens */
    <div className="block md:hidden mb-6">
      {/* Card wrapper with HHR dark-blue gradient */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0a1628 0%, #0d2147 45%, #0a3080 100%)',
          boxShadow: '0 8px 32px rgba(10,22,40,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-base leading-tight">Quick Launch</p>
            <p className="text-white/40 text-xs mt-0.5">Tap to navigate</p>
          </div>
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
            ))}
          </div>
        </div>

        {/* 2 × 3 grid */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-5">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.path}
                data-testid={tool.testid}
                onClick={() => navigate(tool.path)}
                className={`
                  relative flex flex-col items-center justify-center gap-2.5
                  rounded-xl py-5 px-3
                  bg-gradient-to-br ${tool.gradient}
                  shadow-lg ${tool.glow}
                  active:scale-95 transition-transform duration-100
                  overflow-hidden
                `}
              >
                {/* Subtle inner highlight */}
                <div className="absolute inset-0 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)' }} />

                {/* Icon circle */}
                <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm">
                  <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>

                {/* Label */}
                <span className="text-white text-xs font-semibold text-center leading-tight z-10">
                  {tool.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Decorative bottom bar */}
        <div className="h-1 w-full" style={{
          background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 33%, #3b82f6 66%, #6366f1 100%)',
          opacity: 0.7,
        }} />
      </div>
    </div>
  );
};

export default MobileAgentMenu;
