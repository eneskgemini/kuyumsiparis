import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, writeBatch, doc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Users, ChevronLeft, Trash, X, FileUp, Download, CheckCheck, Check, Loader2, Paperclip, Send, FileText } from 'lucide-react';
import { db, storage } from '../../config/firebase';
import ConfirmationModal from '../common/ConfirmationModal';
import { handleDownload } from '../../utils/helpers';

const FileIcon = FileText;

const MessagingModule = ({ appId, currentUserProfile }) => {
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newMessage, setNewMessage] = useState("");
    const [previewImage, setPreviewImage] = useState(null);
    const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, type: null, id: null, title: '', message: '' });
    const [isUploading, setIsUploading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const fileInputRef = useRef(null);

    const isOnline = (user) => {
        if (!user) return false;
        if (user.isOnline === true) {
            if (user.lastLogin && user.lastLogin.seconds) {
                 const now = new Date();
                 const loginDate = new Date(user.lastLogin.seconds * 1000);
                 const diffMinutes = (now - loginDate) / 1000 / 60;
                 return diffMinutes < 5;
            }
            return true;
        }
        return false;
    };

    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'app_users'), (snap) => {
            const fetchedUsers = snap.docs.map(d => Object.assign({id:d.id}, d.data())).filter(u => u.uid !== currentUserProfile.uid);
            const uniqueUsers = Array.from(new Map(fetchedUsers.map(u => [u.email, u])).values());
            setUsers(uniqueUsers);
        });
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), orderBy('createdAt', 'asc'));
        const unsubMsgs = onSnapshot(q, (snap) => {
            setMessages(snap.docs.map(d => Object.assign({id:d.id}, d.data())).filter(m => (m.senderId === currentUserProfile.uid) || (m.receiverId === currentUserProfile.uid)));
        });
        return () => { unsubUsers(); unsubMsgs(); };
    }, [appId, currentUserProfile]);

    useEffect(() => {
        if (selectedUser && messages.length > 0) {
            const unreadMessages = messages.filter(m =>
                m.senderId === selectedUser.uid &&
                m.receiverId === currentUserProfile.uid &&
                !m.read
            );

            if (unreadMessages.length > 0) {
                const batch = writeBatch(db);
                unreadMessages.forEach(m => {
                    const messageRef = doc(db, 'artifacts', appId, 'public', 'data', 'messages', m.id);
                    batch.update(messageRef, { read: true });
                });
                batch.commit().catch(console.error);
            }
        }
    }, [selectedUser, messages, appId, currentUserProfile.uid]);

    const scrollToBottom = (behavior = 'smooth') => {
         if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
         }
    };

    useLayoutEffect(() => {
        scrollToBottom('auto');
    }, [messages, selectedUser]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if(!newMessage.trim() || !selectedUser) return;

        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), {
            content: newMessage,
            senderId: currentUserProfile.uid,
            senderName: currentUserProfile.displayName || currentUserProfile.email,
            senderEmail: currentUserProfile.email,
            receiverId: selectedUser.uid,
            receiverName: selectedUser.displayName || selectedUser.email,
            createdAt: serverTimestamp(),
            read: false,
            type: 'text'
        });
        setNewMessage("");
    };

    const uploadFile = async (file) => {
        if (!file || !selectedUser) return;
        if (file.size > 25 * 1024 * 1024) { alert("Dosya boyutu çok büyük (Maksimum 25MB)."); return; }
        setIsUploading(true);
        try {
            const storageRef = ref(storage, `chat_attachments/${Date.now()}_${file.name}`);
            const uploadTask = await uploadBytesResumable(storageRef, file);
            const downloadUrl = await getDownloadURL(uploadTask.ref);
            const isImage = file.type.startsWith('image/');
            const messageData = {
                senderId: currentUserProfile.uid, senderName: currentUserProfile.displayName || currentUserProfile.email, senderEmail: currentUserProfile.email,
                receiverId: selectedUser.uid, receiverName: selectedUser.displayName || selectedUser.email, createdAt: serverTimestamp(), read: false,
                type: isImage ? 'image' : 'file', content: isImage ? 'Görsel gönderildi' : 'Dosya gönderildi', fileName: file.name, fileSize: file.size
            };
            if (isImage) { messageData.imageUrl = downloadUrl; } else { messageData.fileUrl = downloadUrl; }
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), messageData);
        } catch (error) { console.error("Dosya yükleme hatası:", error); alert("Dosya gönderilemedi: " + error.message); } finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleInputFileChange = (e) => { const file = e.target.files[0]; if (file) { uploadFile(file); } };
    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); if (!isDragOver) setIsDragOver(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget.contains(e.relatedTarget)) { return; } setIsDragOver(false); };
    const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); const file = e.dataTransfer.files[0]; if (file) { uploadFile(file); } };

    const triggerDelete = (type, id = null) => { setDeleteConfig({ isOpen: true, type, id, title: type === 'all' ? 'Sohbeti Temizle' : 'Mesajı Sil', message: type === 'all' ? 'Bu kişiyle olan TÜM mesajlaşma geçmişini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.' : 'Bu mesajı silmek istediğinize emin misiniz?' }); };

    // Mesaj bir resim/dosya içeriyorsa, Storage'daki gerçek dosyayı da siler.
    // Dosya zaten silinmiş/bulunamıyorsa hatayı yutar - mesaj kaydının
    // silinmesini engellemesin diye.
    const deleteAttachmentIfAny = async (m) => {
        const fileUrl = (m && (m.imageUrl || m.fileUrl)) || null;
        if (!fileUrl) return;
        try { await deleteObject(ref(storage, fileUrl)); } catch (e) { console.warn("Storage dosyası silinemedi:", e); }
    };

    const executeDelete = async () => {
        try {
            if (deleteConfig.type === 'single' && deleteConfig.id) {
                const target = messages.find(m => m.id === deleteConfig.id);
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', deleteConfig.id));
                await deleteAttachmentIfAny(target);
            }
            else if (deleteConfig.type === 'all' && selectedUser) {
                const batch = writeBatch(db);
                const chatMessages = messages.filter(m => (m.senderId === currentUserProfile.uid && m.receiverId === selectedUser.uid) || (m.senderId === selectedUser.uid && m.receiverId === currentUserProfile.uid));
                chatMessages.forEach(m => { batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'messages', m.id)); });
                await batch.commit();
                await Promise.allSettled(chatMessages.map(deleteAttachmentIfAny));
            }
        } catch(e) { console.error("Silme hatası", e); alert("Bir hata oluştu."); } finally {
            setDeleteConfig(Object.assign({}, deleteConfig, { isOpen: false }));
        }
    };

    const getUnreadCount = (userId) => messages.filter(m => m.senderId === userId && m.receiverId === currentUserProfile.uid && !m.read).length;

    return (
        <div className="flex flex-col md:flex-row h-[600px] card overflow-hidden relative">
            <ConfirmationModal isOpen={deleteConfig.isOpen} onClose={() => setDeleteConfig(Object.assign({}, deleteConfig, { isOpen: false }))} onConfirm={executeDelete} title={deleteConfig.title} message={deleteConfig.message} />
            {previewImage && <div className="fixed inset-0 z-[400] bg-ink-950/90 flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}><img src={previewImage} className="max-w-full max-h-full object-contain" alt="Önizleme"/></div>}

            <div className={`w-full md:w-1/3 border-r border-stone-100 dark:border-ink-800 bg-stone-50 dark:bg-ink-800 flex flex-col ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-stone-200 dark:border-ink-700 font-bold text-ink-700 dark:text-ink-200 flex items-center gap-2 text-sm"><Users size={17}/> Kişiler ({users.length})</div>
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {users.length === 0 && <div className="p-4 text-xs text-center text-ink-400 dark:text-ink-500">Henüz kayıtlı kullanıcı yok.</div>}
                    {users.map(u => (
                        <div key={u.id} onClick={() => setSelectedUser(u)} className={`p-3 cursor-pointer border-b border-stone-100 dark:border-ink-800 group relative transition-colors ${selectedUser && selectedUser.id === u.id ? 'bg-gold-50 dark:bg-gold-950/20' : 'hover:bg-white dark:bg-ink-900'}`}>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${isOnline(u) ? 'bg-emerald-500 shadow-emerald-200' : 'bg-red-500 shadow-red-200'}`} title={isOnline(u) ? 'Çevrimiçi' : 'Çevrimdışı'}></div>
                                    <span className="font-bold text-sm text-ink-800 dark:text-ink-200">{u.displayName || "Kullanıcı"}</span>
                                </div>
                                {getUnreadCount(u.uid) > 0 && <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">{getUnreadCount(u.uid)}</span>}
                            </div>
                            <div className="text-[10px] text-ink-400 dark:text-ink-500 truncate pl-4.5">{u.email}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className={`flex-1 flex flex-col bg-white dark:bg-ink-900 relative ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
                 {selectedUser ? (
                    <>
                        <div className="p-3 bg-white dark:bg-ink-900 border-b border-stone-200 dark:border-ink-700 flex justify-between items-center font-bold text-ink-900 dark:text-ink-100">
                            <div className="flex items-center gap-2">
                                <button className="md:hidden mr-2 text-ink-500 dark:text-ink-400" onClick={() => setSelectedUser(null)}><ChevronLeft size={20}/></button>
                                <div className={`w-2 h-2 rounded-full ${isOnline(selectedUser) ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                <span>{selectedUser.displayName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => triggerDelete('all')} className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:bg-red-950/30 p-2 rounded-full transition-colors" title="Tüm Sohbeti Sil"><Trash size={17}/></button>
                                <button onClick={()=>{setSelectedUser(null)}} className="text-ink-400 dark:text-ink-500 hover:text-ink-600 dark:text-ink-300 p-2 hidden md:block"><X size={17}/></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 custom-scrollbar relative bg-stone-50/50 dark:bg-ink-800/40" ref={scrollContainerRef} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                            {isDragOver && (<div className="absolute inset-0 z-50 bg-blue-50/90 border-4 border-dashed border-blue-400 rounded-lg flex flex-col items-center justify-center animate-fade-in backdrop-blur-sm m-2 pointer-events-none"><FileUp size={64} className="text-blue-500 mb-4" /><h3 className="text-xl font-bold text-blue-800">Dosyayı Buraya Bırakın</h3><p className="text-blue-600 font-medium">Göndermek için sürükleyip bırakın</p></div>)}
                            {messages.filter(m => (m.senderId === currentUserProfile.uid && m.receiverId === selectedUser.uid) || (m.senderId === selectedUser.uid && m.receiverId === currentUserProfile.uid)).map(m => (
                                <div key={m.id} className={`flex ${m.senderId === currentUserProfile.uid ? 'justify-end' : 'justify-start'} group relative items-end gap-2`}>
                                    <div className={`${m.senderId === currentUserProfile.uid ? 'order-first' : 'order-last'}`}><button onClick={(e) => { e.stopPropagation(); triggerDelete('single', m.id); }} className="p-2 text-ink-200 hover:text-red-500 transition-colors" title="Mesajı Sil"><Trash size={15}/></button></div>
                                    <div className={`p-3 rounded-2xl text-sm max-w-[85%] break-words shadow-soft relative ${m.senderId === currentUserProfile.uid ? 'bg-ink-900 text-white rounded-br-md' : 'bg-white dark:bg-ink-900 border border-stone-200 dark:border-ink-700 rounded-bl-md text-ink-800 dark:text-ink-200'}`}>
                                        {m.type === 'image' ? (<div className="overflow-hidden rounded-lg relative group/img"><img src={m.imageUrl} className="w-full h-auto max-h-64 object-cover cursor-pointer" onClick={()=>setPreviewImage(m.imageUrl)} onLoad={() => scrollToBottom()} loading="lazy" alt="Gönderilen"/><button onClick={(e) => { e.stopPropagation(); handleDownload(m.imageUrl, `gorsel_${m.id}.png`); }} className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity" title="Görseli İndir"><Download size={16} /></button></div>) : m.type === 'file' ? (<div className="flex items-center gap-3"><div className="bg-white/10 p-2 rounded-lg shrink-0"><FileIcon size={24} /></div><div className="overflow-hidden min-w-0"><div className="font-bold truncate text-xs mb-0.5">{m.fileName}</div><div className="text-[10px] opacity-70">{(m.fileSize / 1024 / 1024).toFixed(1)} MB</div></div><button onClick={() => handleDownload(m.fileUrl, m.fileName)} className="ml-2 p-1.5 bg-white/20 hover:bg-white/40 rounded-full transition-colors shrink-0" title="İndir"><Download size={16} /></button></div>) : (<span className="whitespace-pre-wrap break-words">{m.content}</span>)}
                                        {m.senderId === currentUserProfile.uid && (<div className="flex justify-end mt-1 -mr-1">{m.read ? (<CheckCheck size={14} className="text-gold-400" strokeWidth={3} />) : (<Check size={14} className="text-white/40" strokeWidth={3} />)}</div>)}
                                    </div>
                                </div>
                            ))}
                            {isUploading && (<div className="flex justify-end"><div className="bg-stone-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300 rounded-2xl rounded-br-md p-3 text-xs font-bold flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Dosya yükleniyor...</div></div>)}
                            <div ref={messagesEndRef}></div>
                        </div>
                        <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-ink-900 border-t border-stone-200 dark:border-ink-700 flex gap-2 items-center">
                            <input type="file" className="hidden" ref={fileInputRef} onChange={handleInputFileChange}/>
                            <button type="button" onClick={() => fileInputRef.current.click()} className="bg-stone-100 dark:bg-ink-800 hover:bg-stone-200 dark:hover:bg-ink-700 text-ink-500 dark:text-ink-400 rounded-full p-2 transition-colors flex items-center gap-2 px-3" title="Dosya Ekle" disabled={isUploading}><Paperclip size={17}/><span className="text-xs font-bold hidden md:inline">Dosya</span></button>
                            <input className="field flex-1 !rounded-full !py-2.5" placeholder="Mesaj... (Sürükle bırak yapabilirsiniz)" value={newMessage} onChange={e => setNewMessage(e.target.value)} />
                            <button type="submit" disabled={isUploading || !newMessage.trim()} className="bg-gradient-to-b from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white rounded-full p-2.5 transition-colors disabled:opacity-50 shadow-gold"><Send size={17}/></button>
                        </form>
                    </>
                 ) : <div className="flex-1 flex items-center justify-center text-ink-400 dark:text-ink-500 text-sm font-medium">Kişi Seçin</div>}
            </div>
        </div>
    );
};

export default MessagingModule;
