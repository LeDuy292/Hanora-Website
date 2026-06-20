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
  const { user, updateProfile, updatePreferences, logout } = useAuthStore();
  const { documents } = useDocumentStore();
  const { vocabList } = useVocabularyStore();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

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
  const handleSaveChanges = () => {
    if (!user) return;
    
    // Parse dailyGoalMinutes to number
    const dailyMins = parseInt(dailyGoalMinutes.replace(' minutes', '')) || 30;

    // Update stores
    updateProfile({
      name: fullName,
      email: emailAddress,
      targetDailyMinutes: dailyMins // update top-level target if applicable
    });

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
    logout();
    localStorage.clear();
    setActiveModal(null);
    navigate('/');
    // Trigger window refresh to clear state
    window.location.reload();
  };

  // Edit fields inside modal submit handlers
  const handleUpdateAccountField = (type) => {
    const newErrors = {};
    if (type === 'edit_profile') {
      if (!editForm.name.trim()) newErrors.name = 'Họ và tên không được để trống';
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setFullName(editForm.name);
      updateProfile({ name: editForm.name });
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
      setEmailAddress(editForm.email);
      updateProfile({ email: editForm.email });
      showToast('Cập nhật địa chỉ email thành công!');
    } else if (type === 'change_password') {
      if (!editForm.currentPassword) newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
      if (!editForm.newPassword || editForm.newPassword.length < 6) newErrors.newPassword = 'Mật khẩu mới phải từ 6 ký tự trở lên';
      if (editForm.newPassword !== editForm.confirmPassword) newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      showToast('Đã cập nhật mật khẩu mới thành công!');
    }
    
    setErrors({});
    setActiveModal(null);
  };

  if (!user) return null;

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto page-transition text-slate-700">
      
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

            {/* Email Address Row */}
            <div 
              onClick={() => {
                setEditForm(prev => ({ ...prev, email: emailAddress }));
                setActiveModal('email_address');
              }}
              className="py-4 flex items-center justify-between hover:bg-slate-50/50 px-2 rounded-xl transition-all cursor-pointer group"
            >
              <span className="text-xs font-bold text-slate-500">Email Address</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800 font-sans">{emailAddress}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
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
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80" 
                alt={fullName}
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
              />
              {user.isPro && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 border border-white flex items-center justify-center text-white" title="Pro Account">
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

            <button 
              onClick={() => {
                setEditForm(prev => ({ ...prev, email: emailAddress }));
                setActiveModal('email_address');
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-650 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all select-none active:scale-[0.98]"
            >
              <Mail className="w-4 h-4 text-slate-400" />
              <span>Email Address</span>
            </button>

            <button 
              onClick={() => setActiveModal('manage_plan')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-650 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all select-none active:scale-[0.98]"
            >
              <Crown className="w-4 h-4 text-amber-500 fill-amber-500/10" />
              <span>Subscription Plan</span>
            </button>
          </div>
        </div>

      </div>

      {/* Middle Section Grid (Subscription vs Preferences) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Subscription Info Widget Card */}
        <div className="lg:col-span-4 bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-md flex flex-col justify-between gap-6">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Subscription</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Trạng thái gói dịch vụ của bạn</p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 bg-gradient-to-br from-amber-50 to-orange-50/20 border border-amber-100/50 p-4 rounded-2xl relative overflow-hidden">
              <div className="absolute right-0 bottom-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
              
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                <Crown className="w-6 h-6 fill-amber-500/10" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800">Hanora Pro</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5">Access to all premium learning features.</p>
              </div>
            </div>

            <button 
              onClick={() => setActiveModal('manage_plan')}
              className="w-full py-2.5 px-4 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95"
            >
              Manage Plan
            </button>
          </div>
        </div>

        {/* Preferences / Options Card */}
        <div className="lg:col-span-8 bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-md flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 fill-blue-500/10" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Preferences</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Cá nhân hóa trải nghiệm học tập của bạn</p>
            </div>
          </div>

          <div className="space-y-6">
            
            {/* Dark Mode Toggle Option */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-slate-50 text-slate-500 border border-slate-100 shrink-0">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-850">Dark Mode</h4>
                  <p className="text-[10px] text-slate-450 font-medium mt-0.5">Reduce eye strain in low light environments</p>
                </div>
              </div>
              
              {/* Toggle Switch */}
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  darkMode ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    darkMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Interface Language Select Dropdown Option */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-slate-50 text-slate-500 border border-slate-100 shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-850">Interface Language</h4>
                  <p className="text-[10px] text-slate-450 font-medium mt-0.5">Choose your preferred language</p>
                </div>
              </div>
              
              <select 
                value={interfaceLanguage}
                onChange={(e) => setInterfaceLanguage(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer min-w-[130px] font-sans"
              >
                <option value="English">English</option>
                <option value="Vietnamese">Vietnamese</option>
                <option value="Chinese">Chinese</option>
              </select>
            </div>

            {/* Pronunciation Speed Select Option */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-slate-50 text-slate-500 border border-slate-100 shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-850">Pronunciation Audio Speed</h4>
                  <p className="text-[10px] text-slate-450 font-medium mt-0.5">Adjust the playback speed for pronunciation</p>
                </div>
              </div>
              
              <select 
                value={pronunciationSpeed}
                onChange={(e) => setPronunciationSpeed(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer min-w-[130px] font-sans"
              >
                <option value="Slow">Slow</option>
                <option value="Normal">Normal</option>
                <option value="Fast">Fast</option>
              </select>
            </div>

            {/* Daily Learning Goal Select Option */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-slate-50 text-slate-500 border border-slate-100 shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-850">Daily Learning Goal</h4>
                  <p className="text-[10px] text-slate-450 font-medium mt-0.5">Set your daily study goal</p>
                </div>
              </div>
              
              <select 
                value={dailyGoalMinutes}
                onChange={(e) => setDailyGoalMinutes(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer min-w-[130px] font-sans"
              >
                <option value="15 minutes">15 minutes</option>
                <option value="30 minutes">30 minutes</option>
                <option value="45 minutes">45 minutes</option>
                <option value="60 minutes">60 minutes</option>
              </select>
            </div>

            {/* Default Flashcard Mode Select Option */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-slate-50 text-slate-500 border border-slate-100 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-850">Default Flashcard Mode</h4>
                  <p className="text-[10px] text-slate-450 font-medium mt-0.5">Choose default side to start reviewing</p>
                </div>
              </div>
              
              <select 
                value={defaultFlashcardMode}
                onChange={(e) => setDefaultFlashcardMode(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer min-w-[130px] font-sans"
              >
                <option value="Flashcard (Q -> A)">Flashcard (Q &rarr; A)</option>
                <option value="Flashcard (A -> Q)">Flashcard (A &rarr; Q)</option>
              </select>
            </div>

          </div>
        </div>

      </div>

      {/* Bottom Section: Privacy & Security Card */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-md flex flex-col gap-6">
        <div className="border-b border-slate-200 pb-4">
          <h3 className="text-sm font-bold text-slate-855">Privacy & Security</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Quản lý bảo mật thông tin và quyền riêng tư</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Download My Data widget */}
          <div 
            onClick={handleDownloadData}
            className="group flex items-center justify-between p-5 bg-white hover:bg-blue-50/20 border-2 border-slate-200 hover:border-blue-500/50 rounded-2xl transition-all cursor-pointer relative overflow-hidden shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-450 flex items-center justify-center shrink-0 group-hover:text-blue-600 group-hover:border-blue-100 shadow-sm transition-all duration-300">
                <Download className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-650 transition-colors">Download My Data</h4>
                <p className="text-[9.5px] text-slate-450 font-medium leading-relaxed mt-0.5">Export your learning data and progress</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Delete Learning History widget */}
          <div 
            onClick={() => setActiveModal('delete_history')}
            className="group flex items-center justify-between p-5 bg-white hover:bg-amber-50/20 border-2 border-slate-200 hover:border-amber-500/50 rounded-2xl transition-all cursor-pointer relative overflow-hidden shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-455 flex items-center justify-center shrink-0 group-hover:text-amber-600 group-hover:border-amber-100 shadow-sm transition-all duration-300">
                <Clock className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 group-hover:text-amber-655 transition-colors">Delete Learning History</h4>
                <p className="text-[9.5px] text-slate-455 font-medium leading-relaxed mt-0.5">Remove all your learning history</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Delete Account widget */}
          <div 
            onClick={() => setActiveModal('delete_account')}
            className="group flex items-center justify-between p-5 bg-white hover:bg-red-50/20 border-2 border-slate-200 hover:border-red-500/50 rounded-2xl transition-all cursor-pointer relative overflow-hidden shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-red-500/70 flex items-center justify-center shrink-0 group-hover:bg-red-50/30 group-hover:text-red-650 group-hover:border-red-150 shadow-sm transition-all duration-300">
                <Trash2 className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-red-600">Delete Account</h4>
                <p className="text-[9.5px] text-slate-450 font-medium leading-relaxed mt-0.5">Permanently delete your account and all data</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Footer Changes Confirmation Buttons */}
      <div className="flex items-center gap-3">
        <Button 
          variant="primary" 
          onClick={handleSaveChanges}
          className="shadow-md hover:shadow-blue-500/10 active:scale-95 font-bold font-sans bg-blue-600 border border-transparent"
        >
          Save Changes
        </Button>
        
        <button 
          onClick={handleCancel}
          className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm active:scale-95 select-none font-sans"
        >
          Cancel
        </button>
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
