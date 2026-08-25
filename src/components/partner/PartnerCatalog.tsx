import React, { useState, useEffect } from 'react';
import { Search, MapPin, Building2, Globe, Clock, Banknote, ShieldCheck, GraduationCap } from 'lucide-react';
import { universityCatalogService } from '../../lib/partner/UniversityCatalogService';

export function PartnerCatalog() {
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');

  useEffect(() => {
    loadCatalog();
  }, [levelFilter]);

  async function loadCatalog() {
    setLoading(true);
    try {
      const filters: any = {};
      if (levelFilter !== 'All') {
        filters.courseLevel = levelFilter;
      }
      const data = await universityCatalogService.searchCatalog(filters);
      setUniversities(data || []);
    } catch (error) {
      console.error('Failed to load catalog', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredUniversities = universities.filter(uni => 
    uni.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    uni.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center bg-card/40 backdrop-blur-xl p-6 rounded-2xl border border-border/50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl shadow-inner hidden sm:block">
            <GraduationCap className="h-8 w-8 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">University Catalog</h1>
            <p className="text-muted-foreground mt-1 text-sm">Explore our curated global network of approved institutions.</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 p-1">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search universities, countries, or programs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-card/60 backdrop-blur-xl border border-border/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all shadow-sm"
          />
        </div>
        <div className="relative">
          <select 
            className="appearance-none bg-card/60 backdrop-blur-xl border border-border/60 rounded-2xl pl-5 pr-10 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all shadow-sm w-full sm:w-48 cursor-pointer font-medium"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="All">All Study Levels</option>
            <option value="Undergraduate">Undergraduate</option>
            <option value="Postgraduate">Postgraduate</option>
            <option value="Diploma">Diploma</option>
            <option value="Certificate">Certificate</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-muted-foreground">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin animation-delay-150"></div>
            <GraduationCap className="w-6 h-6 text-indigo-500 animate-pulse" />
          </div>
        </div>
      ) : filteredUniversities.length === 0 ? (
        <div className="text-center py-20 bg-card/30 backdrop-blur-md rounded-3xl border border-dashed border-border/60 shadow-[inset_0_0_40px_rgba(0,0,0,0.02)]">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-6 shadow-inner ring-1 ring-border/50">
            <Building2 className="w-10 h-10 text-muted-foreground/60" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No universities found</h3>
          <p className="text-muted-foreground max-w-md mx-auto">We couldn't find any institutions matching your search criteria. Try broadening your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
          {filteredUniversities.map((uni) => (
            <div key={uni.id} className="group overflow-hidden border border-border/40 bg-card/40 backdrop-blur-xl rounded-2xl transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-indigo-500/20 hover:-translate-y-1 flex flex-col">
              <div className="bg-gradient-to-r from-muted/50 to-background/50 border-b border-border/40 p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none transition-opacity opacity-0 group-hover:opacity-100" />
                <div className="flex justify-between items-start relative z-10">
                  <div className="pr-4">
                    <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">{uni.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm font-medium text-muted-foreground">
                      {uni.city && uni.country && (
                        <span className="flex items-center gap-1.5 bg-background/80 backdrop-blur px-2.5 py-1 rounded-md border border-border/50 shadow-sm">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                          {uni.city}, {uni.country}
                        </span>
                      )}
                      {uni.ranking && (
                        <span className="flex items-center gap-1.5 bg-background/80 backdrop-blur px-2.5 py-1 rounded-md border border-border/50 shadow-sm">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          Rank #{uni.ranking}
                        </span>
                      )}
                    </div>
                  </div>
                  {uni.website && (
                    <a href={uni.website} target="_blank" rel="noopener noreferrer" className="shrink-0 p-2.5 bg-background rounded-xl border border-border/50 hover:bg-muted hover:scale-105 transition-all text-muted-foreground hover:text-indigo-500 shadow-sm">
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-500/10 rounded-md">
                      <GraduationCap className="w-4 h-4 text-indigo-500" />
                    </div>
                    Available Programs
                  </h4>
                  <span className="text-xs font-bold px-2.5 py-1 bg-muted rounded-full text-muted-foreground">
                    {uni.courses?.length || 0}
                  </span>
                </div>
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                  {uni.courses?.length > 0 ? uni.courses.map((course: any) => (
                    <div key={course.id} className="p-3.5 bg-background/50 hover:bg-background rounded-xl border border-border/40 hover:border-indigo-500/30 transition-all group/course">
                      <div className="font-semibold text-sm text-foreground group-hover/course:text-indigo-400 transition-colors">{course.name}</div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2.5 text-xs text-muted-foreground font-medium">
                        <span className="bg-muted text-foreground/80 px-2.5 py-1 rounded-md border border-border/50">{course.level}</span>
                        {course.duration && (
                          <span className="flex items-center gap-1.5 bg-background px-2 py-1 rounded-md">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {course.duration}
                          </span>
                        )}
                        {course.tuition_fee && (
                          <span className="flex items-center gap-1.5 bg-background px-2 py-1 rounded-md text-emerald-500/90 font-semibold">
                            <Banknote className="w-3 h-3" />
                            {course.currency} {course.tuition_fee}
                          </span>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="py-8 text-center text-sm text-muted-foreground italic">
                      No programs cataloged yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
