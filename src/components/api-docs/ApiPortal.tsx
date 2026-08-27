import { useState } from 'react';
import { ENDPOINTS } from './ApiEndpoints';
import { EndpointBlock } from './EndpointBlock';
import { Link } from 'react-router-dom';
import { ArrowLeft, Key, Book, Code2, Server } from 'lucide-react';

export function ApiPortal() {
  const [apiKey, setApiKey] = useState('');

  const categories = Array.from(new Set(ENDPOINTS.map(e => e.category)));

  const scrollToEndpoint = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">Edvix Developers</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden sm:flex items-center group">
            <Key className="w-4 h-4 text-muted-foreground absolute left-3 group-focus-within:text-primary transition-colors" />
            <input 
              type="password" 
              placeholder="Paste your edvix_live_... key to test endpoints"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pl-9 pr-4 py-1.5 w-80 text-sm bg-muted/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-full outline-none transition-all"
            />
          </div>
          <Link to="/login" className="text-sm font-medium hover:text-primary transition-colors">
            Dashboard
          </Link>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-card/30 overflow-y-auto hidden md:block shrink-0">
          <div className="p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">API Reference</h3>
            
            <nav className="space-y-6">
              {categories.map(category => (
                <div key={category}>
                  <h4 className="text-sm font-semibold mb-2 text-foreground/90">{category}</h4>
                  <ul className="space-y-1">
                    {ENDPOINTS.filter(e => e.category === category).map(endpoint => (
                      <li key={endpoint.id}>
                        <button
                          onClick={() => scrollToEndpoint(endpoint.id)}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors py-1 text-left w-full truncate"
                        >
                          {endpoint.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            
            {/* Hero Section */}
            <div className="pt-20 pb-12 border-b border-border">
              <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-foreground">API Documentation</h1>
              <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed">
                Build deep integrations with the Edvix CRM. Sync leads, process admissions, and receive real-time webhooks using our REST API.
              </p>
              
              <div className="mt-8 flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Server className="w-4 h-4" />
                  <span>Base URL: <code className="font-mono text-primary/80 ml-1">https://api.edvix.in/rest/v1</code></span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Book className="w-4 h-4" />
                  <span>Content-Type: <code className="font-mono text-primary/80 ml-1">application/json</code></span>
                </div>
              </div>
            </div>

            {/* Endpoints List */}
            <div className="pb-32">
              {ENDPOINTS.map(endpoint => (
                <EndpointBlock key={endpoint.id} endpoint={endpoint} apiKey={apiKey} />
              ))}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
