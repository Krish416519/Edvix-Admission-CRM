import React, { useState, useEffect } from 'react';
import { GraduationCap, BookOpen, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { MasterDataModal } from './MasterDataModal';

export function MasterDataManagement() {
  const [activeTab, setActiveTab] = useState<'universities' | 'courses'>('universities');
  const [universities, setUniversities] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, cRes] = await Promise.all([
        supabase.from('universities').select('*').order('name'),
        supabase.from('courses').select('*, university:universities(name)').order('name')
      ]);
      if (uRes.error) throw uRes.error;
      if (cRes.error) throw cRes.error;
      
      setUniversities(uRes.data || []);
      setCourses(cRes.data || []);
    } catch (err: any) {
      toast.error('Failed to load master data');
    }
    setLoading(false);
  };

  const filteredUniversities = universities.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.code.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, type: 'universities' | 'courses') => {
    if (!confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`)) return;
    try {
      const { error } = await supabase.from(type).delete().eq('id', id);
      if (error) throw error;
      toast.success(`${type.slice(0, -1)} deleted successfully`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) return;
    setIsBulkUpdating(true);
    try {
      const ids = Array.from(selectedIds);
      const CHUNK_SIZE = 50;
      
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from(activeTab).delete().in('id', chunk);
        if (error) throw error;
      }
      
      toast.success(`Successfully deleted ${ids.length} items`);
      setSelectedIds(new Set());
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete items');
    }
    setIsBulkUpdating(false);
  };

  const handleBulkStatusUpdate = async (newStatus: 'Active' | 'Inactive') => {
    if (activeTab !== 'universities') return; // Courses don't have status in this view
    setIsBulkUpdating(true);
    try {
      const ids = Array.from(selectedIds);
      const CHUNK_SIZE = 50;

      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from('universities').update({ status: newStatus }).in('id', chunk);
        if (error) throw error;
      }

      toast.success(`Successfully updated ${ids.length} items`);
      setSelectedIds(new Set());
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update items');
    }
    setIsBulkUpdating(false);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = activeTab === 'universities' ? filteredUniversities : filteredCourses;
    if (e.target.checked) {
      setSelectedIds(new Set(list.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSave = async (formData: any) => {
    try {
      if (selectedItem) {
        const { error } = await supabase.from(activeTab).update(formData).eq('id', selectedItem.id);
        if (error) throw error;
        toast.success(`${activeTab.slice(0, -1)} updated successfully`);
      } else {
        const { error } = await supabase.from(activeTab).insert([formData]);
        if (error) throw error;
        toast.success(`${activeTab.slice(0, -1)} added successfully`);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-500" />
            Master Data
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage global university and course catalogs used across the CRM.</p>
        </div>
        <button 
          onClick={() => {
            setSelectedItem(null);
            setIsModalOpen(true);
          }}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add {activeTab === 'universities' ? 'University' : 'Course'}
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/20">
          <button
            onClick={() => { setActiveTab('universities'); setSelectedIds(new Set()); setSearch(''); }}
            className={`flex-1 sm:flex-none px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'universities' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Universities
          </button>
          <button
            onClick={() => { setActiveTab('courses'); setSelectedIds(new Set()); setSearch(''); }}
            className={`flex-1 sm:flex-none px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'courses' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Courses
          </button>
        </div>

        {/* Search & Bulk Actions */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
          
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
              <span className="text-sm text-muted-foreground mr-2">{selectedIds.size} selected</span>
              {activeTab === 'universities' && (
                <>
                  <button
                    onClick={() => handleBulkStatusUpdate('Active')}
                    disabled={isBulkUpdating}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    Set Active
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('Inactive')}
                    disabled={isBulkUpdating}
                    className="px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    Set Inactive
                  </button>
                </>
              )}
              <button
                onClick={handleBulkDelete}
                disabled={isBulkUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {activeTab === 'universities' ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 w-12">
                    <input 
                      type="checkbox" 
                      className="rounded border-border text-primary focus:ring-primary"
                      checked={filteredUniversities.length > 0 && selectedIds.size === filteredUniversities.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Name</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Code</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Country</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-4 font-medium text-right text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUniversities.map((uni) => (
                  <tr key={uni.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-border text-primary focus:ring-primary"
                        checked={selectedIds.has(uni.id)}
                        onChange={() => handleSelectOne(uni.id)}
                      />
                    </td>
                    <td className="px-6 py-4 font-medium">{uni.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{uni.code}</td>
                    <td className="px-6 py-4 text-muted-foreground">{uni.country}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${uni.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {uni.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(uni)} className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-muted transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(uni.id, 'universities')} className="p-1.5 text-red-500 hover:text-red-600 rounded-md hover:bg-muted transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUniversities.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No universities found</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 w-12">
                    <input 
                      type="checkbox" 
                      className="rounded border-border text-primary focus:ring-primary"
                      checked={filteredCourses.length > 0 && selectedIds.size === filteredCourses.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Course Name</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Level</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Duration</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Avg. Fee</th>
                  <th className="px-6 py-4 font-medium text-right text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-border text-primary focus:ring-primary"
                        checked={selectedIds.has(course.id)}
                        onChange={() => handleSelectOne(course.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{course.name}</div>
                      <div className="text-xs text-muted-foreground">{course.university?.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold uppercase">{course.level}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{course.code}</td>
                    <td className="px-6 py-4 font-medium">₹{course.fee}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(course)} className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-muted transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(course.id, 'courses')} className="p-1.5 text-red-500 hover:text-red-600 rounded-md hover:bg-muted transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCourses.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No courses found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <MasterDataModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
        initialData={selectedItem}
        type={activeTab}
        universities={universities}
      />
    </div>
  );
}
