import React, { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, auth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Bell, User2 } from "lucide-react";
import { LogOut } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function Dashboard() {
  const [candidates, setCandidates] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const navigate = useNavigate();
  const currentUser = auth.currentUser;
  // Dummy avatar for user (replace with real avatar if available)
  const userAvatar = currentUser?.photoURL || null;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notifOpen]);

  useEffect(() => {
    const q = query(collection(db, "candidates"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCandidates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Listen for notifications for the current user
  useEffect(() => {
    if (!currentUser) return;
    const nq = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(nq, (snapshot) => {
      setNotifications(
        snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(n => n.userId === currentUser.uid)
      );
    });
    return () => unsub();
  }, [currentUser]);

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "candidates"), {
        name,
        email,
        createdAt: new Date()
      });
      setName("");
      setEmail("");
    } catch (err) {
      alert("Error adding candidate: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (notif) => {
    navigate(`/candidate/${notif.candidateId}`, { state: { messageId: notif.messageId } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* App Bar */}
      <header className="w-full bg-white shadow flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 mb-6 sm:mb-8 sticky top-0 z-30 gap-2 sm:gap-0">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
          <span className="text-xl sm:text-2xl font-extrabold text-blue-700 tracking-tight">Algohire</span>
        </div>
        <div className="flex items-center gap-4 relative w-full sm:w-auto justify-center sm:justify-end">
          <button
            className="relative p-2 rounded-full hover:bg-blue-50 transition"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="Show notifications"
          >
            <Bell className="w-6 h-6 text-blue-700" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold shadow">{notifications.length}</span>
            )}
          </button>
          {/* Notifications Dropdown */}
          {notifOpen && (
            <div ref={notifRef} className="absolute right-0 mt-2 w-72 sm:w-80 max-w-xs bg-white rounded-xl shadow-2xl border border-blue-100 z-50 overflow-x-hidden">
              <div className="sticky top-0 z-10 flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-blue-50 bg-blue-50 rounded-t-xl">
                <Bell className="w-5 h-5 text-blue-700" />
                <span className="text-base sm:text-lg font-semibold text-blue-700">Notifications</span>
              </div>
              <div className="max-h-80 overflow-y-auto overflow-x-hidden custom-scrollbar px-2 py-2">
                <ul className="grid grid-cols-1 gap-2">
                  {(showAllNotifications ? notifications : notifications.slice(0, 8)).map(notif => (
                    <li
                      key={notif.id}
                      className="flex items-center gap-2 p-2 bg-white border border-blue-100 rounded-lg shadow hover:shadow-md transition cursor-pointer group text-xs sm:text-sm max-w-full mx-auto"
                      onClick={() => { handleNotificationClick(notif); setNotifOpen(false); }}
                    >
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-base mr-2">
                        <Bell className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="font-semibold text-blue-900 truncate">{notif.candidateName}</div>
                        <div className="text-gray-600 truncate">{notif.message}</div>
                      </div>
                      <div className="text-gray-400 text-xs ml-2 whitespace-nowrap">
                        {notif.createdAt && notif.createdAt.seconds ?
                          formatDistanceToNow(new Date(notif.createdAt.seconds * 1000), { addSuffix: true }) :
                          ''}
                      </div>
                    </li>
                  ))}
                </ul>
                {notifications.length > 8 && !showAllNotifications && (
                  <div className="flex justify-center mt-2">
                    <Button size="sm" variant="outline" onClick={() => setShowAllNotifications(true)}>
                      Show More
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          {userAvatar ? (
            <img src={userAvatar} alt="avatar" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-blue-400" />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-500 flex items-center justify-center text-base sm:text-lg font-bold text-white border-2 border-blue-400">
              {getInitials(currentUser?.displayName || currentUser?.email || 'U')}
            </div>
          )}
          <Button
            variant="ghost"
            className="text-gray-500 hover:text-blue-700 flex items-center gap-1 text-xs sm:text-base"
            onClick={async () => {
              await signOut(auth);
              navigate("/");
            }}
          >
            <LogOut className="w-5 h-5" /> Logout
          </Button>
        </div>
      </header>
      <main className="w-full max-w-5xl mx-auto px-2 sm:px-4">
        {/* Add Candidate Form */}
        <div className="mb-8 sm:mb-10 max-w-xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-blue-100">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-blue-700">Add Candidate</h2>
            <form className="flex flex-col md:flex-row gap-3 sm:gap-4 items-center" onSubmit={handleAddCandidate}>
              <div className="flex-1 w-full">
                <Label htmlFor="name" className="font-semibold">Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="Candidate name" className="mt-1" />
              </div>
              <div className="flex-1 w-full">
                <Label htmlFor="email" className="font-semibold">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Candidate email" className="mt-1" />
              </div>
              <Button type="submit" disabled={loading} className="h-10 px-4 sm:px-6 mt-3 md:mt-0 w-full md:w-auto text-xs sm:text-base">{loading ? "Adding..." : "Add"}</Button>
            </form>
          </div>
        </div>
        {/* Candidates Grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
          {candidates.map(candidate => (
            <div key={candidate.id} className="bg-white rounded-xl shadow-lg p-4 sm:p-6 flex flex-col items-center hover:shadow-2xl transition border border-blue-100 group">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-200 flex items-center justify-center text-xl sm:text-2xl font-bold text-blue-700 mb-2 sm:mb-3 border-2 border-blue-400 group-hover:scale-105 group-hover:shadow-lg transition">
                {getInitials(candidate.name)}
              </div>
              <div className="font-bold text-base sm:text-lg text-gray-900 mb-1 text-center">{candidate.name}</div>
              <div className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-4 text-center">{candidate.email}</div>
              <Button onClick={() => navigate(`/candidate/${candidate.id}`)} className="h-9 sm:h-10 px-4 sm:px-6 text-xs sm:text-base font-semibold w-full mt-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow">Open Notes</Button>
            </div>
          ))}
        </div>
      </main>
      {/* Custom scrollbar for notifications */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          background: #e0e7ef;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #b6c6e3;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}

export default Dashboard; 