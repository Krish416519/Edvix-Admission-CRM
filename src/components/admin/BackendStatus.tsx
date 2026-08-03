import React, { useEffect, useState } from 'react';
import { Database, Shield, Wifi, WifiOff, Server, Key, User, Activity } from 'lucide-react';
import { supabase, hasSupabaseKeys, checkSupabaseConnection } from '../../lib/supabase';

export function BackendStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [session, setSession] = useState<any | null>(null);

  useEffect(() => {
    const verifyConnection = async () => {
      setStatus('checking');
      
      const { connected, error } = await checkSupabaseConnection();
      
      if (connected) {
        setStatus('connected');
        // Fetch current session if connected
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      } else {
        setStatus('disconnected');
        setErrorMsg(error);
      }
    };

    verifyConnection();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Backend Status</h1>
          <p className="text-muted-foreground mt-1">Diagnostic tools and Supabase connection health.</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg shadow-sm hover:bg-secondary/80 transition-colors"
        >
          Refresh Status
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection Status Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Connection Health</h2>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center py-6">
            {status === 'checking' && (
              <div className="flex flex-col items-center animate-pulse">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Wifi className="w-8 h-8 text-muted-foreground opacity-50" />
                </div>
                <p className="text-lg font-medium text-foreground">Verifying Connection...</p>
                <p className="text-sm text-muted-foreground mt-1">Pinging Supabase endpoint</p>
              </div>
            )}

            {status === 'connected' && (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
                  <Wifi className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-lg font-medium text-emerald-500">Connected</p>
                <p className="text-sm text-muted-foreground mt-1">Supabase backend is fully operational</p>
              </div>
            )}

            {status === 'disconnected' && (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
                  <WifiOff className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-lg font-medium text-red-500">Disconnected</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">{errorMsg}</p>
              </div>
            )}
          </div>
        </div>

        {/* Configuration Details Card */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex items-center gap-3">
            <Server className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Configuration Details</h2>
          </div>
          <div className="p-0">
            <dl className="divide-y divide-border">
              <div className="px-6 py-4 grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Key className="w-4 h-4" /> Environment Keys
                </dt>
                <dd className="text-sm text-foreground col-span-2 flex items-center gap-2">
                  {hasSupabaseKeys ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 font-medium text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Injected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-500 font-medium text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Missing in .env
                    </span>
                  )}
                </dd>
              </div>
              <div className="px-6 py-4 grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Database className="w-4 h-4" /> Project URL
                </dt>
                <dd className="text-sm text-foreground col-span-2 truncate font-mono">
                  {import.meta.env.VITE_SUPABASE_URL || 'Not configured'}
                </dd>
              </div>
              <div className="px-6 py-4 grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Auth Status
                </dt>
                <dd className="text-sm text-foreground col-span-2">
                  {status === 'connected' ? 'Ready (GoTrue active)' : 'Offline'}
                </dd>
              </div>
              <div className="px-6 py-4 grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" /> Current User
                </dt>
                <dd className="text-sm text-foreground col-span-2 truncate">
                  {status === 'checking' ? (
                    <span className="text-muted-foreground">Checking...</span>
                  ) : session?.user ? (
                    <span className="font-medium">{session.user.email}</span>
                  ) : (
                    <span className="text-muted-foreground italic">No active session (Anonymous)</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
