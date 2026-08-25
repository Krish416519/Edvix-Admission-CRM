import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApplicationWorkspace } from '../components/applications/ApplicationWorkspace';
import { useAuth } from '../contexts/AuthContext';

export function ApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  if (!id) {
    return <div>Invalid Application ID</div>;
  }
  
  const role = profile?.role === 'Super Admin' || profile?.role === 'Admin' ? 'Admin' :
               profile?.role === 'Partner' ? 'Partner' : 'Counselor';

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ApplicationWorkspace 
        admissionId={id} 
        onClose={() => navigate(-1)} 
        role={role} 
      />
    </div>
  );
}
