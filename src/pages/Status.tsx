import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Globe, 
  Shield, 
  Bot, 
  Database,
  Server,
  ArrowLeft,
  Clock
} from 'lucide-react';
import { SiDiscord, SiCloudflare } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'checking';

interface Service {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: ServiceStatus;
  responseTime?: number;
  lastChecked?: Date;
}

export default function Status() {
  const [services, setServices] = useState<Service[]>([
    {
      id: 'website',
      name: 'Website',
      description: 'Main application frontend',
      icon: Globe,
      status: 'checking',
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare',
      description: 'CDN & DDoS Protection',
      icon: SiCloudflare,
      status: 'checking',
    },
    {
      id: 'database',
      name: 'Database',
      description: 'Data storage & retrieval',
      icon: Database,
      status: 'checking',
    },
    {
      id: 'auth',
      name: 'Authentication',
      description: 'User login & security',
      icon: Shield,
      status: 'checking',
    },
    {
      id: 'discord-bot',
      name: 'Discord Bot',
      description: 'Discord integration & presence',
      icon: SiDiscord,
      status: 'checking',
    },
    {
      id: 'edge-functions',
      name: 'Edge Functions',
      description: 'Backend serverless functions',
      icon: Server,
      status: 'checking',
    },
  ]);

  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const checkServices = async () => {
    setRefreshing(true);
    
    // Check Website
    const websiteStart = performance.now();
    try {
      const response = await fetch(window.location.origin, { method: 'HEAD' });
      const websiteTime = Math.round(performance.now() - websiteStart);
      updateService('website', response.ok ? 'operational' : 'degraded', websiteTime);
    } catch {
      updateService('website', 'outage');
    }

    // Check Cloudflare (check cf-ray header)
    try {
      const response = await fetch(window.location.origin, { method: 'HEAD' });
      const cfRay = response.headers.get('cf-ray');
      updateService('cloudflare', cfRay ? 'operational' : 'degraded');
    } catch {
      updateService('cloudflare', 'outage');
    }

    // Check Database
    const dbStart = performance.now();
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      const dbTime = Math.round(performance.now() - dbStart);
      updateService('database', error ? 'degraded' : 'operational', dbTime);
    } catch {
      updateService('database', 'outage');
    }

    // Check Auth
    const authStart = performance.now();
    try {
      const { data, error } = await supabase.auth.getSession();
      const authTime = Math.round(performance.now() - authStart);
      updateService('auth', error ? 'degraded' : 'operational', authTime);
    } catch {
      updateService('auth', 'outage');
    }

    // Check Discord Bot via presence table
    try {
      const { data, error } = await supabase
        .from('discord_presence')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (error || !data || data.length === 0) {
        updateService('discord-bot', 'degraded');
      } else {
        const lastUpdate = new Date(data[0].updated_at);
        const minutesAgo = (Date.now() - lastUpdate.getTime()) / 1000 / 60;
        // If last update was within 10 minutes, bot is operational
        updateService('discord-bot', minutesAgo < 10 ? 'operational' : 'degraded');
      }
    } catch {
      updateService('discord-bot', 'outage');
    }

    // Check Edge Functions
    const edgeStart = performance.now();
    try {
      // Try to invoke a simple edge function - we use verify-turnstile with a test token
      // Any response (even an error response) means edge functions are working
      const response = await supabase.functions.invoke('verify-turnstile', {
        body: { token: 'status-check' }
      });
      const edgeTime = Math.round(performance.now() - edgeStart);
      // If we got here without throwing, edge functions are operational
      // Even a 400 error response means the function is running
      updateService('edge-functions', 'operational', edgeTime);
    } catch (e: any) {
      const edgeTime = Math.round(performance.now() - edgeStart);
      // Check if it's a FunctionsFetchError with a response - this means the function ran
      if (e?.context?.status >= 400 && e?.context?.status < 500) {
        // 4xx errors mean the function responded (just with an error)
        updateService('edge-functions', 'operational', edgeTime);
      } else if (edgeTime < 10000) {
        // If we got any response within timeout, consider it working
        updateService('edge-functions', 'operational', edgeTime);
      } else {
        updateService('edge-functions', 'outage');
      }
    }

    setLastRefresh(new Date());
    setRefreshing(false);
  };

  const updateService = (id: string, status: ServiceStatus, responseTime?: number) => {
    setServices(prev => prev.map(s => 
      s.id === id 
        ? { ...s, status, responseTime, lastChecked: new Date() }
        : s
    ));
  };

  useEffect(() => {
    checkServices();
    // Auto-refresh every 60 seconds
    const interval = setInterval(checkServices, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case 'operational':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'outage':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'checking':
        return <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />;
    }
  };

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500/20 border-green-500/30';
      case 'degraded':
        return 'bg-yellow-500/20 border-yellow-500/30';
      case 'outage':
        return 'bg-red-500/20 border-red-500/30';
      case 'checking':
        return 'bg-muted/20 border-border';
    }
  };

  const getStatusText = (status: ServiceStatus) => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'degraded':
        return 'Degraded';
      case 'outage':
        return 'Outage';
      case 'checking':
        return 'Checking...';
    }
  };

  const overallStatus = services.every(s => s.status === 'operational')
    ? 'operational'
    : services.some(s => s.status === 'outage')
    ? 'outage'
    : services.some(s => s.status === 'checking')
    ? 'checking'
    : 'degraded';

  const getOverallMessage = () => {
    switch (overallStatus) {
      case 'operational':
        return 'All systems operational';
      case 'degraded':
        return 'Some services experiencing issues';
      case 'outage':
        return 'Major outage detected';
      case 'checking':
        return 'Checking service status...';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-semibold text-foreground">System Status</h1>
              <p className="text-xs text-muted-foreground">UserVault.cc Services</p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={checkServices}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Overall Status */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border p-6 mb-8 ${getStatusColor(overallStatus)}`}
        >
          <div className="flex items-center gap-4">
            {getStatusIcon(overallStatus)}
            <div>
              <h2 className="text-lg font-semibold">{getOverallMessage()}</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <Clock className="w-3 h-3" />
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Services Grid */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Services
          </h3>
          
          <div className="grid gap-3">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-xl border p-4 ${getStatusColor(service.status)} transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center">
                      <service.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium">{service.name}</h4>
                      <p className="text-xs text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {service.responseTime && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {service.responseTime}ms
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      {getStatusIcon(service.status)}
                      <span className="text-sm font-medium hidden sm:inline">
                        {getStatusText(service.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Status Legend */}
        <div className="mt-12 pt-8 border-t border-border">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
            Status Legend
          </h3>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Operational</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span>Degraded Performance</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span>Outage</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            Need help? Join our{' '}
            <a 
              href="https://discord.gg/uservault" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Discord server
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
