import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db, auth } from "@/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, doc, getDoc, deleteDoc, setDoc, getDocs } from "firebase/firestore";
import { collection as fsCollection, onSnapshot as fsOnSnapshot } from "firebase/firestore";
import { toast } from "sonner"; // ShadCN toast
import { format } from 'date-fns';
import { Trash2, Pencil, MessageCircle, Pin, MoreVertical, Star, StarOff, Upload } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog.jsx';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu.jsx';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

function getInitials(name) {
  return name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : '?';
}

function CandidateNotes() {
  const { candidateId } = useParams();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteOptions, setAutocompleteOptions] = useState([]);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const currentUser = auth.currentUser;
  const messageRefs = useRef({});
  const [highlightedId, setHighlightedId] = useState(null);
  const EMOJIS = ['👍', '❤️', '😂'];
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  // const [typingUsers, setTypingUsers] = useState([]); // Removed to fix linter error
  const typingTimeout = useRef(null);
  const [replyTo, setReplyTo] = useState(null);
  const [presentUsers, setPresentUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [threadModal, setThreadModal] = useState({ open: false, rootMsg: null });
  const [threadReply, setThreadReply] = useState("");
  const [starredIds, setStarredIds] = useState([]);
  const [forwardModal, setForwardModal] = useState({ open: false, msg: null });
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [activeReactionId, setActiveReactionId] = useState(null);
  const chatAreaRef = useRef(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    // Fetch candidate info
    const unsubCandidate = onSnapshot(
      collection(db, "candidates"),
      (snapshot) => {
        const found = snapshot.docs.find(doc => doc.id === candidateId);
        setCandidate(found ? { id: found.id, ...found.data() } : null);
      }
    );
    // Listen for messages
    const q = query(
      collection(db, "candidates", candidateId, "notes"),
      orderBy("createdAt", "asc")
    );
    const unsubMessages = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    // Listen for notifications for the current user
    let unsubNotifications = () => {};
    if (currentUser) {
      const nq = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
      unsubNotifications = onSnapshot(nq, (snapshot) => {
        snapshot.docChanges().forEach(change => {
          const notif = change.doc.data();
          if (
            change.type === "added" &&
            notif.userId === currentUser.uid &&
            notif.candidateId === candidateId
          ) {
            toast(notif.message, {
              description: `Candidate: ${notif.candidateName}`,
              action: {
                label: "View",
                onClick: () => {
                  // Scroll to message or highlight
                  if (notif.messageId && messageRefs.current[notif.messageId]) {
                    messageRefs.current[notif.messageId].scrollIntoView({ behavior: "smooth", block: "center" });
                    setHighlightedId(notif.messageId);
                    setTimeout(() => setHighlightedId(null), 2000);
                  }
                },
              },
            });
          }
        });
      });
    }
    return () => {
      unsubCandidate();
      unsubMessages();
      unsubNotifications();
    };
  }, [candidateId, currentUser]);

  useEffect(() => {
    // If navigated with a messageId, scroll to and highlight it
    if (location.state && location.state.messageId && messageRefs.current[location.state.messageId]) {
      messageRefs.current[location.state.messageId].scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedId(location.state.messageId);
      setTimeout(() => setHighlightedId(null), 2000);
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, location.state]);

  // Fetch all users for autocomplete
  useEffect(() => {
    const unsub = fsOnSnapshot(fsCollection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data()));
    });
    return () => unsub();
  }, []);

  // Typing indicator logic
  useEffect(() => {
    const typingRef = collection(db, 'candidates', candidateId, 'typing');
    const unsub = onSnapshot(typingRef, () => {
      // Typing indicator logic removed
    });
    return () => unsub();
  }, [candidateId, currentUser]);

  // User presence logic
  useEffect(() => {
    if (!currentUser) return;
    const presenceRef = doc(db, 'candidates', candidateId, 'presence', currentUser.uid);
    setDoc(presenceRef, {
      uid: currentUser.uid,
      displayName: currentUser.displayName || currentUser.email,
      lastActive: Date.now(),
    });
    const unsub = onSnapshot(collection(db, 'candidates', candidateId, 'presence'), (snapshot) => {
      setPresentUsers(snapshot.docs.map(doc => doc.data()));
    });
    const interval = setInterval(() => {
      setDoc(presenceRef, {
        uid: currentUser.uid,
        displayName: currentUser.displayName || currentUser.email,
        lastActive: Date.now(),
      });
    }, 10000);
    return () => {
      clearInterval(interval);
      deleteDoc(presenceRef);
      unsub();
    };
  }, [candidateId, currentUser]);

  // Reply logic
  const handleReply = (msg) => {
    setReplyTo({ id: msg.id, text: msg.text, sender: users.find(u => u.uid === msg.userId)?.displayName || 'Unknown' });
    inputRef.current?.focus();
  };
  // const handleCancelReply = () => setReplyTo(null); // Removed to fix linter error

  const handleTyping = () => {
    if (!currentUser) return;
    const typingRef = doc(db, 'candidates', candidateId, 'typing', currentUser.uid);
    setDoc(typingRef, {
      uid: currentUser.uid,
      displayName: currentUser.displayName || currentUser.email,
      timestamp: Date.now(),
    });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      deleteDoc(typingRef);
    }, 2000);
  };

  // Edit message
  const handleEdit = (msg) => {
    setEditingId(msg.id);
    setEditingText(msg.text);
  };
  const handleEditSave = async (msg) => {
    await updateDoc(doc(db, 'candidates', candidateId, 'notes', msg.id), { text: editingText });
    setEditingId(null);
    setEditingText("");
  };
  const handleEditCancel = () => {
    setEditingId(null);
    setEditingText("");
  };
  // Delete message
  const handleDelete = async (msg) => {
    if (window.confirm('Delete this message?')) {
      await deleteDoc(doc(db, 'candidates', candidateId, 'notes', msg.id));
    }
  };

  // Autocomplete logic
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    const atIndex = value.lastIndexOf("@");
    if (atIndex !== -1) {
      const query = value.slice(atIndex + 1).toLowerCase();
      if (query.length > 0) {
        const filtered = users.filter(u => (u.displayName || "").toLowerCase().includes(query));
        setAutocompleteOptions(filtered);
        setShowAutocomplete(filtered.length > 0);
        setAutocompleteIndex(0);
        return;
      }
    }
    setShowAutocomplete(false);
  };

  const handleAutocompleteSelect = (user) => {
    const atIndex = newMessage.lastIndexOf("@");
    if (atIndex !== -1) {
      const before = newMessage.slice(0, atIndex + 1);
      setNewMessage(before + (user.displayName || user.email) + " ");
      setShowAutocomplete(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (showAutocomplete) {
      if (e.key === "ArrowDown") {
        setAutocompleteIndex((i) => (i + 1) % autocompleteOptions.length);
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        setAutocompleteIndex((i) => (i - 1 + autocompleteOptions.length) % autocompleteOptions.length);
        e.preventDefault();
      } else if (e.key === "Enter") {
        handleAutocompleteSelect(autocompleteOptions[autocompleteIndex]);
        e.preventDefault();
      }
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    // Detect @username tags
    const tagRegex = /@([\w.@-]+)/g;
    const tags = [];
    let match;
    while ((match = tagRegex.exec(newMessage))) {
      const tag = match[1];
      const user = users.find(u => (u.displayName || u.email) === tag);
      if (user) tags.push(user);
    }
    // Add the note
    const noteRef = await addDoc(collection(db, "candidates", candidateId, "notes"), {
      text: newMessage,
      createdAt: serverTimestamp(),
      userId: currentUser ? currentUser.uid : null,
      replyTo: replyTo ? replyTo.id : null,
      attachment: attachmentUrl,
    });
    // Create notifications for tagged users
    for (const user of tags) {
      await addDoc(collection(db, "notifications"), {
        userId: user.uid,
        candidateId,
        candidateName: candidate ? candidate.name : "",
        message: newMessage,
        messageId: noteRef.id,
        createdAt: serverTimestamp(),
      });
    }
    setNewMessage("");
    setReplyTo(null);
    setAttachmentUrl("");
  };

  // Add or remove a reaction for a message
  const handleReaction = async (msgId, emoji) => {
    if (!currentUser) return;
    const noteRef = doc(db, 'candidates', candidateId, 'notes', msgId);
    const noteSnap = await getDoc(noteRef);
    let reactions = noteSnap.data().reactions || {};
    const userId = currentUser.uid;
    if (reactions[emoji] && reactions[emoji].includes(userId)) {
      // Remove reaction
      reactions[emoji] = reactions[emoji].filter(id => id !== userId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      // Add reaction
      reactions[emoji] = reactions[emoji] ? [...reactions[emoji], userId] : [userId];
    }
    await updateDoc(noteRef, { reactions });
  };

  // Pin/unpin message
  const handlePin = async (msg) => {
    await updateDoc(doc(db, 'candidates', candidateId, 'notes', msg.id), { pinned: !(msg.pinned || false) });
  };
  // Listen for pinned messages
  useEffect(() => {
    const q = query(collection(db, 'candidates', candidateId, 'notes'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, () => {
      // setPinnedIds(snapshot.docs.filter(doc => doc.data().pinned).map(doc => doc.id)); // Removed pinnedIds state
    });
    return () => unsub();
  }, [candidateId]);

  // Star/unstar message
  const handleStar = async (msg) => {
    const userStarRef = doc(db, 'candidates', candidateId, 'notes', msg.id, 'stars', currentUser.uid);
    if (starredIds.includes(msg.id)) {
      await deleteDoc(userStarRef);
    } else {
      await setDoc(userStarRef, { uid: currentUser.uid });
    }
  };
  // Listen for starred messages
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'candidates', candidateId, 'notes'));
    const unsub = onSnapshot(q, async (snapshot) => {
      const ids = [];
      for (const docSnap of snapshot.docs) {
        const starRef = collection(db, 'candidates', candidateId, 'notes', docSnap.id, 'stars');
        const starsSnap = await getDocs(starRef);
        if (starsSnap.docs.some(d => d.id === currentUser.uid)) ids.push(docSnap.id);
      }
      setStarredIds(ids);
    });
    return () => unsub();
  }, [candidateId, currentUser]);
  // Forward message
  const handleForward = (msg) => setForwardModal({ open: true, msg });
  const closeForward = () => setForwardModal({ open: false, msg: null });
  const [forwardCandidate, setForwardCandidate] = useState("");
  const handleForwardSend = async () => {
    if (!forwardCandidate || !forwardModal.msg) return;
    await addDoc(collection(db, 'candidates', forwardCandidate, 'notes'), {
      text: forwardModal.msg.text,
      createdAt: serverTimestamp(),
      userId: currentUser ? currentUser.uid : null,
      replyTo: null,
      attachment: forwardModal.msg.attachment || "",
    });
    closeForward();
  };
  // Handle attachment upload
  const handleAttachment = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // setAttachment(file); // Removed attachment state
    const storage = getStorage();
    const fileRef = ref(storage, `attachments/${candidateId}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    setAttachmentUrl(url);
  };

  // Open thread modal
  const openThread = (msg) => {
    setThreadModal({ open: true, rootMsg: msg });
    setThreadReply("");
  };
  const closeThread = () => setThreadModal({ open: false, rootMsg: null });
  // Handle thread reply
  const handleThreadReply = async (e) => {
    e.preventDefault();
    if (!threadReply.trim() || !threadModal.rootMsg) return;
    await addDoc(collection(db, "candidates", candidateId, "notes"), {
      text: threadReply,
      createdAt: serverTimestamp(),
      userId: currentUser ? currentUser.uid : null,
      replyTo: threadModal.rootMsg.id,
    });
    setThreadReply("");
  };

  // Helper to render avatar
  function renderAvatar(user, size = 'w-9 h-9') {
    if (user?.avatar) {
      return <img src={user.avatar} alt="avatar" className={`${size} rounded-full object-cover border-2 border-blue-400`} />;
    }
    return <div className={`${size} rounded-full bg-blue-500 flex items-center justify-center text-base font-bold text-white`}>{getInitials(user?.displayName || user?.email || 'U')}</div>;
  }

  useEffect(() => {
    function handleDocumentClick(e) {
      if (
        chatAreaRef.current &&
        !chatAreaRef.current.contains(e.target)
      ) {
        setActiveReactionId(null);
      }
    }
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-8 px-1 sm:px-0">
      <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-center">Notes for {candidate ? candidate.name : "..."}</h2>
      <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4">
        {/* Back arrow button, outside chat box, aligned with avatar */}
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-4 sm:mt-6 ml-1 p-2 rounded-full bg-[#23272a] border border-[#36393f] text-gray-200 hover:bg-[#36393f] shadow flex items-center justify-center"
          style={{ height: '40px', width: '40px' }}
          aria-label="Back to Dashboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div
          ref={chatAreaRef}
          className="bg-[#23272a] rounded-lg shadow p-2 sm:p-4 h-[32rem] sm:h-[40rem] overflow-y-auto flex flex-col mb-3 sm:mb-4 border border-[#2c2f33] relative flex-1 min-w-0"
          style={{ position: 'relative', paddingBottom: '4.5rem' }}
          onClick={() => setActiveReactionId(null)}
        >
          {/* WhatsApp-style chat header */}
          <div className="sticky top-0 z-20 flex flex-col sm:flex-row items-center justify-between bg-gradient-to-r from-[#23272a] via-[#23272a] to-[#1e293b] px-2 sm:px-4 py-2 sm:py-3 mb-2 rounded-t-lg shadow border-b border-[#36393f] gap-2 sm:gap-0">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Candidate avatar or initials */}
              {candidate?.avatar ? (
                <img src={candidate.avatar} alt="avatar" className="w-10 h-10 sm:w-14 sm:h-14 rounded-full object-cover border-2 sm:border-4 border-blue-500 shadow" />
              ) : (
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-blue-500 flex items-center justify-center text-lg sm:text-2xl font-bold text-white border-2 sm:border-4 border-blue-400 shadow">
                  {getInitials(candidate?.name || '?')}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-base sm:text-xl font-bold text-white leading-tight">{candidate ? candidate.name : '...'}</span>
                <span className="text-xs text-blue-200 mt-0.5">{candidate?.email || 'Online'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Action icons: video, phone, search, with tooltips */}
              <button title="Video Call" className="p-2 rounded-full bg-[#23272a] hover:bg-blue-600 text-gray-300 hover:text-white shadow transition"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="7" width="13" height="10" rx="2" strokeWidth="2"/><path d="M16 11l4-2v6l-4-2" strokeWidth="2"/></svg></button>
              <button title="Call" className="p-2 rounded-full bg-[#23272a] hover:bg-blue-600 text-gray-300 hover:text-white shadow transition"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M22 16.92V19a2 2 0 0 1-2.18 2A19.72 19.72 0 0 1 3 5.18 2 2 0 0 1 5 3h2.09a2 2 0 0 1 2 1.72c.13.81.36 1.6.68 2.34a2 2 0 0 1-.45 2.11l-.27.27a16 16 0 0 0 6.29 6.29l.27-.27a2 2 0 0 1 2.11-.45c.74.32 1.53.55 2.34.68A2 2 0 0 1 21 16.91z" strokeWidth="2"/></svg></button>
              <button title="Search Messages" className="p-2 rounded-full bg-[#23272a] hover:bg-blue-600 text-gray-300 hover:text-white shadow transition" onClick={() => setShowSearch(s => !s)}><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8" strokeWidth="2"/><path d="M21 21l-4.35-4.35" strokeWidth="2"/></svg></button>
            </div>
          </div>
          {/* Search bar inside chat area, at the top, only if showSearch is true */}
          {showSearch && (
            <div className="mb-2 sm:mb-3 flex items-center gap-2 sticky top-0 z-10 bg-[#23272a] pb-1 sm:pb-2">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search messages..."
                className="bg-[#23272a] text-gray-100 border border-gray-600 max-w-xs"
                autoFocus
              />
              {search && <Button size="sm" variant="outline" onClick={() => setSearch("")}>Clear</Button>}
              <Button size="sm" variant="ghost" onClick={() => setShowSearch(false)}>&#10005;</Button>
            </div>
          )}
          {/* Online users indicator, WhatsApp style, fixed to bottom left above input */}
          {presentUsers.length > 0 && (
            <div className="absolute left-2 sm:left-4 bottom-20 z-10 flex items-center gap-1 sm:gap-2 bg-[#23272a] bg-opacity-90 px-2 sm:px-3 py-1 rounded-full shadow text-xs text-gray-300 border border-[#36393f]">
              <span>Online:</span>
              {presentUsers.map(u => (
                <span key={u.uid} className="flex items-center gap-1 font-semibold text-blue-300">
                  {renderAvatar(u, 'w-4 h-4 sm:w-5 sm:h-5')}
                  {u.displayName}
                </span>
              ))}
            </div>
          )}
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-gray-300">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="text-gray-400 text-center">No notes yet.</div>
            ) : (
              messages
                .filter(msg => !search || msg.text.toLowerCase().includes(search.toLowerCase()))
                .map(msg => {
                  const isSelf = msg.userId === (currentUser && currentUser.uid);
                  const sender = users.find(u => u.uid === msg.userId);
                  const isReply = !!msg.replyTo;
                  const repliedMsg = isReply ? messages.find(m => m.id === msg.replyTo) : null;
                  const highlight = search && msg.text.toLowerCase().includes(search.toLowerCase());
                  return (
                    <div
                      key={msg.id}
                      ref={el => (messageRefs.current[msg.id] = el)}
                      className={`mb-3 flex ${isSelf ? 'justify-end' : 'justify-start'}`}
                      onDoubleClick={() => setActiveReactionId(activeReactionId === msg.id ? null : msg.id)}
                      onClick={e => e.stopPropagation()}
                    >
                      {!isSelf && (
                        <div className="flex flex-col items-center mr-2">
                          {renderAvatar(sender)}
                        </div>
                      )}
                      <div className={`px-4 py-2 rounded-lg max-w-[75%] shadow relative group ${highlightedId === msg.id ? 'ring-2 ring-blue-400 bg-[#36393f]' : ''} ${isSelf ? 'bg-blue-600 text-white' : 'bg-[#36393f] text-gray-100'} ${highlight ? 'ring-2 ring-yellow-400' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-semibold text-blue-300">
                            {sender?.displayName || sender?.email || 'Unknown'}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-6 h-6 p-0 text-gray-400 hover:text-blue-500"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="z-50">
                              <DropdownMenuItem onClick={() => handleReply(msg)}>Reply</DropdownMenuItem>
                              {isSelf && <DropdownMenuItem onClick={() => handleEdit(msg)}>Edit</DropdownMenuItem>}
                              {isSelf && <DropdownMenuItem onClick={() => handleDelete(msg)}>Delete</DropdownMenuItem>}
                              <DropdownMenuItem onClick={() => handlePin(msg)}>{msg.pinned ? 'Unpin' : 'Pin'}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStar(msg)}>{starredIds.includes(msg.id) ? 'Unstar' : 'Star'}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleForward(msg)}>Forward</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openThread(msg)}>View Thread</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {isReply && repliedMsg && (
                          <div className="mb-1 pl-2 border-l-4 border-blue-400 bg-[#23272a] text-xs text-blue-200 py-1">
                            Replying to <span className="font-semibold">{users.find(u => u.uid === repliedMsg.userId)?.displayName || 'Unknown'}</span>: {repliedMsg.text}
                          </div>
                        )}
                        {editingId === msg.id ? (
                          <div className="flex gap-2 items-center">
                            <input
                              className="flex-1 px-2 py-1 rounded bg-[#23272a] text-gray-100 border border-gray-600"
                              value={editingText}
                              onChange={e => setEditingText(e.target.value)}
                              autoFocus
                            />
                            <Button size="sm" className="px-2 py-1" onClick={() => handleEditSave(msg)} type="button">Save</Button>
                            <Button size="sm" className="px-2 py-1 !text-black" variant="outline" onClick={handleEditCancel} type="button">Cancel</Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-end">
                              <span className="break-words">{msg.text}</span>
                              <span className="ml-2 text-xs text-gray-400 whitespace-nowrap">
                                {msg.createdAt && msg.createdAt.seconds ?
                                  format(new Date(msg.createdAt.seconds * 1000), 'p') :
                                  ''}
                              </span>
                            </div>
                            <div className="flex gap-2 mt-2">
                              {msg.attachment && (
                                <a href={msg.attachment} target="_blank" rel="noopener noreferrer" className="block">
                                  <img src={msg.attachment} alt="attachment" className="max-h-32 rounded border mt-1" />
                                </a>
                              )}
                              {activeReactionId === msg.id && (
                                <div onClick={e => e.stopPropagation()} className="flex gap-2">
                                  {EMOJIS.map(emoji => {
                                    const count = msg.reactions && msg.reactions[emoji] ? msg.reactions[emoji].length : 0;
                                    const reacted = msg.reactions && msg.reactions[emoji] && currentUser && msg.reactions[emoji].includes(currentUser.uid);
                                    return (
                                      <button
                                        key={emoji}
                                        type="button"
                                        className={`flex items-center px-2 py-1 rounded-full text-sm transition border border-transparent ${reacted ? 'bg-blue-700 text-white border-blue-400' : 'bg-[#2c2f33] text-gray-200 hover:bg-blue-800'}`}
                                        onClick={() => handleReaction(msg.id, emoji)}
                                      >
                                        <span>{emoji}</span>
                                        {count > 0 && <span className="ml-1 text-xs">{count}</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      {isSelf && (
                        <div className="flex flex-col items-center ml-2">
                          {renderAvatar(sender)}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Message input, fixed to bottom of chat area */}
          <form
            onSubmit={e => { e.preventDefault(); handleSend(e); }}
            className="flex gap-1 sm:gap-2 relative bg-[#2c2f33] p-2 sm:p-3 rounded-lg border border-[#23272a]"
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, margin: '0 0.5rem' }}
          >
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={e => { handleInputChange(e); handleTyping(); }}
              onKeyDown={handleKeyDown}
              placeholder="Type a note... Use @ to tag."
              autoComplete="off"
              className="bg-[#23272a] text-gray-100 border-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <label className="flex items-center cursor-pointer">
              <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-blue-500" />
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleAttachment} />
            </label>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-base">Send</Button>
            {showAutocomplete && (
              <div className="absolute left-0 top-full mt-1 w-48 sm:w-64 bg-[#23272a] border border-[#36393f] rounded shadow z-10">
                {autocompleteOptions.map((user, idx) => (
                  <div
                    key={user.uid}
                    className={`px-3 py-2 cursor-pointer ${idx === autocompleteIndex ? "bg-blue-700 text-white" : "text-gray-100"}`}
                    onMouseDown={() => handleAutocompleteSelect(user)}
                  >
                    {user.displayName || user.email}
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>
      </div>
      <Dialog open={threadModal.open} onOpenChange={v => !v && closeThread()}>
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 ${threadModal.open ? '' : 'hidden'}`}>
          <div className="bg-[#23272a] rounded-lg shadow-lg p-6 w-full max-w-lg">
            <div className="mb-4">
              <div className="text-xs font-semibold text-blue-300 mb-1">Thread root:</div>
              <div className="px-3 py-2 rounded bg-[#36393f] text-gray-100 mb-2">
                <span className="font-semibold">{users.find(u => u.uid === threadModal.rootMsg?.userId)?.displayName || 'Unknown'}:</span> {threadModal.rootMsg?.text}
              </div>
              <div className="text-xs text-gray-400 mb-2">Replies:</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {messages.filter(m => m.replyTo === threadModal.rootMsg?.id).map(reply => (
                  <div key={reply.id} className="px-3 py-2 rounded bg-[#36393f] text-gray-100">
                    <span className="font-semibold">{users.find(u => u.uid === reply.userId)?.displayName || 'Unknown'}:</span> {reply.text}
                  </div>
                ))}
                {messages.filter(m => m.replyTo === threadModal.rootMsg?.id).length === 0 && (
                  <div className="text-gray-500 text-xs">No replies yet.</div>
                )}
              </div>
            </div>
            <form onSubmit={handleThreadReply} className="flex gap-2 mt-2">
              <Input
                value={threadReply}
                onChange={e => setThreadReply(e.target.value)}
                placeholder="Reply in thread..."
                className="bg-[#23272a] text-gray-100 border border-gray-600"
              />
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Send</Button>
              <Button type="button" variant="outline" onClick={closeThread}>Close</Button>
            </form>
          </div>
        </div>
      </Dialog>
      <Dialog open={forwardModal.open} onOpenChange={v => !v && closeForward()}>
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 ${forwardModal.open ? '' : 'hidden'}`}>
          <div className="bg-[#23272a] rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="mb-4 text-white">Forward message to candidate:</div>
            <select value={forwardCandidate} onChange={e => setForwardCandidate(e.target.value)} className="w-full mb-4 p-2 rounded bg-[#36393f] text-white">
              <option value="">Select candidate</option>
              {/* Assuming 'candidates' collection exists and contains candidate data */}
              {/* This part needs to be adjusted based on your actual candidate data structure */}
              {/* For now, it's a placeholder to show the structure */}
              {/* <option value="candidateId1">Candidate 1</option> */}
              {/* <option value="candidateId2">Candidate 2</option> */}
            </select>
            <Button onClick={handleForwardSend} className="bg-blue-600 hover:bg-blue-700 text-white w-full">Forward</Button>
            <Button onClick={closeForward} variant="outline" className="w-full mt-2">Cancel</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default CandidateNotes; 