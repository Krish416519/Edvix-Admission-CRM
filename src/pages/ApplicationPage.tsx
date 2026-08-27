
import { useParams, useNavigate } from 'react-router-dom';
import { ApplicationWorkspace } from '../components/applications/ApplicationWorkspace';
import { useAuth } from '../contexts/AuthContext';

export function ApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  if (!id) {
    return <div>Invalid Application ID</div>;
  }
  
  const role = user?.role === 'Super Admin' || user?.role === 'Admin' ? 'Admin' :
               user?.role === 'Partner' ? 'Partner' : 'Counselor';

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
