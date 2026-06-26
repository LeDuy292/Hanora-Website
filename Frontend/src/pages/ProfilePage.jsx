import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Lock, 
  Calendar, 
  ChevronRight, 
  Moon, 
  Globe, 
  Activity, 
  Target, 
  Layers, 
  Download, 
  Trash2, 
  Crown, 
  Check, 
  X,
  Sparkles,
  Clock
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useDocumentStore } from '../store/documentStore';
import { useVocabularyStore } from '../store/vocabularyStore';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import confetti from 'canvas-confetti';

export function ProfilePage() {
  const navigate = useNavigate();
  
  // Stores
  const { user, updateProfile, updatePreferences, logout, refreshProfile, updateProfileOnServer } = useAuthStore();
  const { documents } = useDocumentStore();
  const { vocabList } = useVocabularyStore();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      refreshProfile();
    }
  }, [user, navigate, refreshProfile]);

  // Form State
  const [fullName, setFullName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  
  // Preferences Local State
  const [darkMode, setDarkMode] = useState(false);
  const [interfaceLanguage, setInterfaceLanguage] = useState('English');
  const [pronunciationSpeed, setPronunciationSpeed] = useState('Normal');
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState('30 minutes');
  const [defaultFlashcardMode, setDefaultFlashcardMode] = useState('Flashcard (Q -> A)');

  // Modal Control States
  const [activeModal, setActiveModal] = useState(null); // 'edit_profile' | 'change_password' | 'email_address' | 'manage_plan' | 'delete_history' | 'delete_account'
  
  // Form input validation/error state
  const [editForm, setEditForm] = useState({ name: '', email: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  
  // Toast notifications state
  const [toast, setToast] = useState(null);

  // Initialize form states
  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setEmailAddress(user.email || '');
      
      const prefs = user.preferences || {};
      setDarkMode(prefs.darkMode || false);
      setInterfaceLanguage(prefs.interfaceLanguage || 'English');
      setPronunciationSpeed(prefs.pronunciationSpeed || 'Normal');
      setDailyGoalMinutes(prefs.dailyGoalMinutes ? `${prefs.dailyGoalMinutes} minutes` : '30 minutes');
      setDefaultFlashcardMode(prefs.defaultFlashcardMode || 'Flashcard (Q -> A)');

      setEditForm({
        name: user.name || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Save changes handler
  const handleSaveChanges = async () => {
    if (!user) return;
    
    // Parse dailyGoalMinutes to number
    const dailyMins = parseInt(dailyGoalMinutes.replace(' minutes', '')) || 30;

    // Call server to update display name, email and goal minutes
    const res = await updateProfileOnServer({
      name: fullName,
      email: emailAddress,
      dailyMinutesGoal: dailyMins
    });

    if (!res.success) {
      showToast(res.error || 'Lỗi lưu cấu hình', 'warning');
      return;
    }

    updatePreferences({
      darkMode,
      interfaceLanguage,
      pronunciationSpeed,
      dailyGoalMinutes: dailyMins,
      defaultFlashcardMode
    });

    // Trigger success confetti!
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.8 }
    });

    showToast('Lưu cấu hình thiết lập thành công!');
  };

  // Avatar upload handler
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Convert to Base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      
      // Update locally immediately
      updateProfile({ avatar: base64String });
      
      // Call server
      const res = await updateProfileOnServer({ avatarUrl: base64String });
      if (!res.success) {
        showToast('Lỗi khi tải ảnh lên!', 'warning');
      } else {
        showToast('Đã cập nhật ảnh đại diện thành công!');
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset form / Cancel handler
  const handleCancel = () => {
    navigate('/dashboard');
  };

  // Export/Download data handler
  const handleDownloadData = () => {
    const backupData = {
      user: {
        name: user?.name,
        email: user?.email,
        streak: user?.streak,
        xp: user?.xp,
        level: user?.level,
        joinedDate: user?.joinedDate,
        isPro: user?.isPro,
        preferences: user?.preferences
      },
      documents: documents,
      vocabulary: vocabList,
      exportedAt: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `hanora_learning_backup_${user?.name?.toLowerCase().replace(/\s+/g, '_') || 'user'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast('Đã xuất dữ liệu học tập thành công!');
  };

  // Clear learning history handler
  const handleClearHistory = () => {
    // Clear Document Store and Vocabulary Store
    useDocumentStore.setState({ documents: [], activeDocumentId: null });
    useVocabularyStore.setState({ vocabList: [] });
    
    // Reset user streak and xp
    updateProfile({
      streak: 0,
      xp: 0,
      level: 'HSK 1',
      todayMinutes: 0
    });

    setActiveModal(null);
    showToast('Đã xóa toàn bộ lịch sử học tập!', 'warning');
  };

  // Delete Account handler
  const handleDeleteAccount = () => {
    // Clear all localStorage and stores
    useDocumentStore.setState({ documents: [], activeDocumentId: null });
    useVocabularyStore.setState({ vocabList: [] });
    localStorage.clear();
    setActiveModal(null);
    logout();
  };

  // Edit fields inside modal submit handlers
  const handleUpdateAccountField = async (type) => {
    const newErrors = {};
    if (type === 'edit_profile') {
      if (!editForm.name.trim()) newErrors.name = 'Họ và tên không được để trống';
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      const res = await updateProfileOnServer({ name: editForm.name });
      if (!res.success) {
        setErrors({ name: res.error });
        return;
      }
      setFullName(editForm.name);
      showToast('Cập nhật tên thành công!');
    } else if (type === 'email_address') {
      if (!editForm.email.trim()) {
        newErrors.email = 'Email không được để trống';
      } else if (!/\S+@\S+\.\S+/.test(editForm.email)) {
        newErrors.email = 'Định dạng email không hợp lệ';
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      const res = await updateProfileOnServer({ email: editForm.email });
      if (!res.success) {
        setErrors({ email: res.error });
        return;
      }
      setEmailAddress(editForm.email);
      showToast('Cập nhật địa chỉ email thành công!');
    } else if (type === 'change_password') {
      if (!editForm.currentPassword) newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
      if (!editForm.newPassword || editForm.newPassword.length < 6) newErrors.newPassword = 'Mật khẩu mới phải từ 6 ký tự trở lên';
      if (editForm.newPassword !== editForm.confirmPassword) newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      const res = await updateProfileOnServer({ 
        currentPassword: editForm.currentPassword, 
        newPassword: editForm.newPassword 
      });
      if (!res.success) {
        setErrors({ currentPassword: res.error });
        return;
      }
      showToast('Đã cập nhật mật khẩu mới thành công!');
    }
    
    setErrors({});
    setActiveModal(null);
  };

  if (!user) return null;

  return (
    <div className="space-y-8 w-full page-transition text-slate-700">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-xl border animate-slide-up ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-850' 
            : 'bg-amber-50 border-amber-100 text-amber-900'
        }`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
            toast.type === 'success' ? 'bg-emerald-150 text-emerald-600' : 'bg-amber-150 text-amber-600'
          }`}>
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold font-sans">{toast.message}</span>
        </div>
      )}

      {/* Top Section Grid (Account vs Profile Card) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Account Form Info */}
        <div className="lg:col-span-8 bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-md flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Account</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Thông tin tài khoản chính của bạn</p>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {/* Full Name Row */}
            <div 
              onClick={() => {
                setEditForm(prev => ({ ...prev, name: fullName }));
                setActiveModal('edit_profile');
              }}
              className="py-4 flex items-center justify-between hover:bg-slate-50/50 px-2 rounded-xl transition-all cursor-pointer group"
            >
              <span className="text-xs font-bold text-slate-500">Full Name</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800 font-sans">{fullName || "Chưa thiết lập"}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Email Address Row (Non-editable) */}
            <div className="py-4 flex items-center justify-between px-2 rounded-xl transition-all">
              <span className="text-xs font-bold text-slate-500">Email Address</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800 font-sans">{emailAddress}</span>
                <Lock className="w-3.5 h-3.5 text-slate-300" />
              </div>
            </div>

            {/* Password Row */}
            <div 
              onClick={() => {
                setEditForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
                setActiveModal('change_password');
              }}
              className="py-4 flex items-center justify-between hover:bg-slate-50/50 px-2 rounded-xl transition-all cursor-pointer group"
            >
              <span className="text-xs font-bold text-slate-500">Password</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800 font-sans">********</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Joined Date Row */}
            <div className="py-4 flex items-center justify-between px-2">
              <span className="text-xs font-bold text-slate-500">Joined Date</span>
              <span className="text-xs font-semibold text-slate-800 font-sans">{user.joinedDate || "March 15, 2024"}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Profile Display Card */}
        <div className="lg:col-span-4 bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-md flex flex-col items-center justify-between text-center gap-6">
          <div className="flex flex-col items-center gap-3.5">
            {/* Avatar Circle Container */}
            <div className="relative group">
              <input 
                type="file" 
                accept="image/*" 
                id="avatar-upload"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <label htmlFor="avatar-upload" className="cursor-pointer block relative">
                <img 
                  src={user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80"} 
                  alt={fullName}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md group-hover:opacity-80 transition-opacity"
                />
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
              </label>
              {user.isPro && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 border border-white flex items-center justify-center text-white pointer-events-none" title="Pro Account">
                  <Crown className="w-3.5 h-3.5 fill-white" />
                </div>
              )}
            </div>

            {/* Profile Info Text */}
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-slate-800">{fullName}</h2>
              {user.isPro && (
                <div className="inline-flex items-center justify-center bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full select-none">
                  Pro Member
                </div>
              )}
              <p className="text-[10px] text-slate-400 font-bold block pt-1 font-sans">{emailAddress}</p>
            </div>
          </div>

          {/* Quick Edit Actions Stacks */}
          <div className="w-full flex flex-col gap-2.5">
            <button 
              onClick={() => {
                setEditForm(prev => ({ ...prev, name: fullName }));
                setActiveModal('edit_profile');
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-650 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all select-none active:scale-[0.98]"
            >
              <User className="w-4 h-4 text-slate-400" />
              <span>Edit Profile</span>
            </button>

            <button 
              onClick={() => {
                setEditForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
                setActiveModal('change_password');
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-650 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all select-none active:scale-[0.98]"
            >
              <Lock className="w-4 h-4 text-slate-400" />
              <span>Change Password</span>
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* ========================== MODALS SECTION =============================== */}
      {/* ========================================================================= */}

      {/* Modal: Edit Profile Name */}
      <Modal
        isOpen={activeModal === 'edit_profile'}
        onClose={() => {
          setActiveModal(null);
          setErrors({});
        }}
        title="Edit Full Name"
        size="sm"
      >
        <div className="space-y-4">
          <Input 
            label="Full Name"
            placeholder="Nhập họ và tên mới"
            icon={User}
            value={editForm.name}
            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
            error={errors.name}
            autoFocus
          />
          
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button 
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all"
            >
              Hủy
            </button>
            <Button 
              variant="primary"
              onClick={() => handleUpdateAccountField('edit_profile')}
            >
              Lưu thay đổi
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Edit Email Address */}
      <Modal
        isOpen={activeModal === 'email_address'}
        onClose={() => {
          setActiveModal(null);
          setErrors({});
        }}
        title="Update Email Address"
        size="sm"
      >
        <div className="space-y-4">
          <Input 
            label="Email Address"
            placeholder="name@example.com"
            type="email"
            icon={Mail}
            value={editForm.email}
            onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
            error={errors.email}
            autoFocus
          />
          
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button 
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all"
            >
              Hủy
            </button>
            <Button 
              variant="primary"
              onClick={() => handleUpdateAccountField('email_address')}
            >
              Cập nhật
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Change Password */}
      <Modal
        isOpen={activeModal === 'change_password'}
        onClose={() => {
          setActiveModal(null);
          setErrors({});
        }}
        title="Change Password"
        size="sm"
      >
        <div className="space-y-4">
          <Input 
            label="Current Password"
            placeholder="••••••••"
            type="password"
            icon={Lock}
            value={editForm.currentPassword}
            onChange={(e) => setEditForm(prev => ({ ...prev, currentPassword: e.target.value }))}
            error={errors.currentPassword}
          />

          <Input 
            label="New Password"
            placeholder="••••••••"
            type="password"
            icon={Lock}
            value={editForm.newPassword}
            onChange={(e) => setEditForm(prev => ({ ...prev, newPassword: e.target.value }))}
            error={errors.newPassword}
          />

          <Input 
            label="Confirm New Password"
            placeholder="••••••••"
            type="password"
            icon={Lock}
            value={editForm.confirmPassword}
            onChange={(e) => setEditForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
            error={errors.confirmPassword}
          />
          
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button 
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all"
            >
              Hủy
            </button>
            <Button 
              variant="primary"
              onClick={() => handleUpdateAccountField('change_password')}
            >
              Cập nhật mật khẩu
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Manage Plan / Subscription */}
      <Modal
        isOpen={activeModal === 'manage_plan'}
        onClose={() => setActiveModal(null)}
        title="Subscription Plan"
        size="sm"
      >
        <div className="space-y-5 text-center py-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-200 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
            <Crown className="w-8 h-8 fill-amber-500/10" />
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-black text-slate-800">Bạn đang sử dụng gói Hanora Pro</h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Cảm ơn bạn đã đồng hành cùng Hanora! Gói của bạn hiện được miễn phí trọn đời nhằm hỗ trợ cộng đồng học tiếng Trung tốt nhất.
            </p>
          </div>
          
          <div className="pt-3 border-t border-slate-100 flex justify-center">
            <Button 
              variant="primary"
              onClick={() => setActiveModal(null)}
            >
              Đồng ý
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Delete Learning History Confirmation */}
      <Modal
        isOpen={activeModal === 'delete_history'}
        onClose={() => setActiveModal(null)}
        title="Delete Learning History?"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50/50 border border-amber-100 text-amber-900 rounded-2xl flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs font-semibold leading-relaxed">
              Hành động này sẽ xóa toàn bộ danh sách từ vựng đã lưu, các tài liệu bạn đã tải lên, cũng như reset điểm kinh nghiệm (XP) và Streak về 0. Bạn có chắc chắn muốn tiếp tục?
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button 
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all"
            >
              Hủy bỏ
            </button>
            <button 
              onClick={handleClearHistory}
              className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-all shadow-sm active:scale-95"
            >
              Xác nhận xóa
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Delete Account Confirmation */}
      <Modal
        isOpen={activeModal === 'delete_account'}
        onClose={() => setActiveModal(null)}
        title="Delete Account permanently?"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50/60 border border-red-100 text-red-900 rounded-2xl flex items-start gap-3">
            <Trash2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs font-semibold leading-relaxed">
              Bạn đang chuẩn bị xóa tài khoản vĩnh viễn. Mọi dữ liệu học tập của bạn trên Hanora sẽ bị xóa hoàn toàn khỏi hệ thống lưu trữ local storage và không thể khôi phục lại.
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button 
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all"
            >
              Hủy bỏ
            </button>
            <button 
              onClick={handleDeleteAccount}
              className="px-4 py-2 text-xs font-bold text-white bg-red-650 hover:bg-red-500 rounded-xl transition-all shadow-sm active:scale-95"
            >
              Xóa tài khoản
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

export default ProfilePage;
