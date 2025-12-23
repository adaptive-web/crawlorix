import { useState, useRef, useEffect } from 'react';
import { Grid3X3, BookOpen, Clock, FileText, Globe, Sparkles, TrendingUp, Bell, X, Briefcase } from 'lucide-react';
import { fetchAppsConfig, FALLBACK_APPS } from '@/lib/adaptrix-apps';

const iconMap = {
  'grid-3x3': Grid3X3,
  'book-open': BookOpen,
  'clock': Clock,
  'file-text': FileText,
  'globe': Globe,
  'sparkles': Sparkles,
  'trending-up': TrendingUp,
  'bell': Bell,
  'briefcase': Briefcase,
};

export function AppLauncher({ currentApp }) {
  const [open, setOpen] = useState(false);
  const [apps, setApps] = useState(FALLBACK_APPS);
  const [hasFetched, setHasFetched] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (open && !hasFetched) {
      setHasFetched(true);
      fetchAppsConfig().then(setApps);
    }
  }, [open, hasFetched]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const activeApps = apps.filter(app => app.status !== 'coming');

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Open app launcher"
      >
        <Grid3X3 className="w-5 h-5 text-gray-600" />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <span className="text-sm font-medium text-gray-700">Adaptrix Apps</span>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-gray-200 rounded-full"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
            {activeApps.map((app) => (
              <AppTile
                key={app.id}
                app={app}
                isCurrent={app.id === currentApp}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AppTile({ app, isCurrent }) {
  const IconComponent = iconMap[app.icon] || Grid3X3;

  return (
    <a href={app.url}>
      <div
        className={`
          flex items-center gap-3 p-3 rounded-lg border transition-all
          hover:bg-gray-50 hover:border-gray-300 cursor-pointer border-gray-200
          ${isCurrent ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' : ''}
        `}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0"
          style={{ backgroundColor: app.color }}
        >
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-sm">
              {app.name}
            </span>
            {app.status !== 'production' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-600">
                {app.status_label || app.status}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">
            {app.description}
          </p>
        </div>
      </div>
    </a>
  );
}

export default AppLauncher;
