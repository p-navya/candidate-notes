import React from 'react';
import { auth } from '@/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

function Header() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <header className="w-full bg-white shadow-sm py-4 px-6 flex items-center justify-between">
      <div className="text-2xl font-bold text-blue-700 tracking-tight">Collaborative Candidate Notes</div>
      <div className="flex items-center gap-4">
        {/* Placeholder for user info, nav, or actions */}
        {user && (
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        )}
      </div>
    </header>
  );
}

export default Header;