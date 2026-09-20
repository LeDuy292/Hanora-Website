import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  Clock,
  HelpCircle,
  QrCode,
  CreditCard,
  Crown,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Lock
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { paymentApi } from '../services/paymentService';
import { useToastStore } from '../store/toastStore';
import Header from '../components/layout/Header';
import logoImg from '../assets/logo.png';

const PACKAGES = [
  {
    id: 'monthly',
    name: 'Gói Tháng',
    price: 59000,
    originalPrice: 89000,
    formattedPrice: '59.000đ',
    period: '/tháng',
    description: 'Mở khóa toàn bộ tính năng và trải nghiệm học tập không giới hạn trong 30 ngày.',
    badge: 'Phổ biến',
    badgeColor: 'bg-blue-600 text-white',
    features: [
      'Đọc & phân tích OCR tài liệu không giới hạn (PDF, Ảnh)',
      'Tra cứu Hán tự, Pinyin, nghĩa & toàn bộ cấp độ HSK 1-6, 7-9',
      'Trợ lý AI dịch câu & giải thích ngữ pháp theo ngữ cảnh bài học',
      'Lưu từ vựng không giới hạn vào các bộ thẻ Flashcard SRS',
      'Luyện phát âm AI chuẩn bản xứ với chấm điểm chi tiết từng âm tiết',
      'Đồng bộ tiến độ học tập trên mọi thiết bị cá nhân',
    ],
  },
  {
    id: 'yearly',
    name: 'Gói Năm',
    price: 599000,
    originalPrice: 708000,
    formattedPrice: '599.000đ',
    period: '/năm',
    description: 'Trải nghiệm đỉnh cao và đồng hành suốt 12 tháng với mức giá tiết kiệm nhất.',
    badge: 'Tiết kiệm 15%',
    badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20',
    features: [
      'Trọn bộ đặc quyền cao cấp của Gói Tháng',
      'Tiết kiệm hơn 15% so với thanh toán từng tháng',
      'Không giới hạn dung lượng tải lên và phân tích tài liệu',
      'Ưu tiên trải nghiệm các tính năng AI mới nhất sắp ra mắt',
      'Tham gia cộng đồng học viên Hanora VIP & hỗ trợ 1-1',
      'Cập nhật tài liệu luyện thi HSK 3 - HSK 6 độc quyền',
    ],
  },
];

export function PaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  const initialPlan = searchParams.get('plan') === 'yearly' ? 'yearly' : 'monthly';
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlan);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const selectedPlan = PACKAGES.find((p) => p.id === selectedPlanId) || PACKAGES[0];
  const discountAmount = selectedPlan.originalPrice - selectedPlan.price;

  // Sync with URL query parameter changes
  useEffect(() => {
    const planQuery = searchParams.get('plan');
    if (planQuery === 'yearly' || planQuery === 'monthly') {
      setSelectedPlanId(planQuery);
    }
  }, [searchParams]);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      addToast('Vui lòng đăng nhập để gắn gói Pro vào tài khoản của bạn.', 'info');
      navigate(`/login?redirect=${encodeURIComponent(`/payment?plan=${selectedPlanId}`)}`);
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const returnUrl = `${window.location.origin}/payment/success`;
      const cancelUrl = `${window.location.origin}/payment/cancel`;

      const response = await paymentApi.createPaymentLink(selectedPlanId, returnUrl, cancelUrl);

      if (response && response.checkoutUrl) {
        // Redirect directly to PayOS VietQR Checkout Gateway
        window.location.href = response.checkoutUrl;
      } else {
        throw new Error(response?.error || 'Không nhận được đường dẫn thanh toán từ cổng PayOS.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      const msg = err.message || 'Có lỗi xảy ra khi tạo liên kết thanh toán. Vui lòng thử lại.';
      setErrorMessage(msg);
      addToast(msg, 'error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none text-slate-800 relative">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-blue-100/50 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-10 w-[500px] h-[350px] bg-sky-100/40 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <img src={logoImg} alt="Hanora" className="h-9 w-auto object-contain transition-transform group-hover:scale-105" />
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại</span>
            </button>
            {isAuthenticated ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate max-w-[140px]">{user?.name || user?.email}</span>
              </div>
            ) : (
              <Link
                to={`/login?redirect=${encodeURIComponent(`/payment?plan=${selectedPlanId}`)}`}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Header Title Section */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold tracking-wide uppercase">
            <Crown className="w-3.5 h-3.5 fill-blue-600 text-blue-600" />
            Nâng cấp gói tài khoản Hanora Pro
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-display">
            Thanh Toán Đơn Hàng & Kích Hoạt Gói
          </h1>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
            Mở khóa trọn bộ trợ lý tiếng Trung AI, luyện phát âm thông minh và đọc tài liệu không giới hạn.
          </p>
        </div>

        {/* 2-Column Checkout Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Plan Selection & Features (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Plan Switcher Cards */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                1. Chọn chu kỳ gói đăng ký
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PACKAGES.map((pkg) => {
                  const isSelected = selectedPlanId === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPlanId(pkg.id)}
                      className={`relative p-5 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${
                        isSelected
                          ? 'border-blue-600 bg-white shadow-xl shadow-blue-600/10 scale-[1.02]'
                          : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      {pkg.badge && (
                        <div className={`absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${pkg.badgeColor}`}>
                          {pkg.badge}
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-3">
                        <span className="text-base font-extrabold text-slate-900">{pkg.name}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>

                      <div className="flex items-baseline gap-1 mb-1.5">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900">{pkg.formattedPrice}</span>
                        <span className="text-xs font-bold text-slate-400">{pkg.period}</span>
                      </div>

                      <div className="text-xs text-slate-400 line-through mb-2">
                        {pkg.originalPrice.toLocaleString('vi-VN')}đ
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed">
                        {pkg.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Feature Highlights Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Quyền lợi của {selectedPlan.name}
                  </h3>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                  Mở khóa tức thì
                </span>
              </div>

              <ul className="grid grid-cols-1 gap-2.5">
                {selectedPlan.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                2. Phương thức thanh toán
              </label>

              <div className="bg-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-md shadow-blue-600/5 relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">Cổng Thanh Toán PayOS (VietQR)</h4>
                        <span className="text-[10px] font-extrabold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Tự động 24/7
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Quét mã QR qua mọi ứng dụng ngân hàng (Vietcombank, MB, Techcombank...) & ví MoMo, ZaloPay
                      </p>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 border-blue-600 bg-blue-600 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 text-slate-600 font-semibold">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Xử lý tự động trong 3 giây
                  </span>
                  <span className="flex items-center gap-1 text-slate-600 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Bảo mật chuẩn ngân hàng
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Checkout Action (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xl shadow-slate-200/50 space-y-5 sticky top-24">
              <h3 className="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-3">
                Tóm Tắt Đơn Hàng
              </h3>

              {/* Order items */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Gói dịch vụ đã chọn:</span>
                  <span className="font-bold text-slate-900">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Thời hạn sử dụng:</span>
                  <span className="font-bold text-slate-900">{selectedPlan.id === 'yearly' ? '12 Tháng (365 ngày)' : '1 Tháng (30 ngày)'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Giá gốc niêm yết:</span>
                  <span className="line-through text-slate-400">{selectedPlan.originalPrice.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between items-center text-emerald-600 font-semibold">
                  <span>Ưu đãi áp dụng:</span>
                  <span>-{discountAmount.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              {/* Total Price Banner */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng thanh toán</div>
                  <div className="text-2xl font-black text-blue-600 leading-tight mt-0.5">
                    {selectedPlan.formattedPrice}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold bg-blue-100/80 text-blue-700 px-2 py-1 rounded-md">
                    Đã gồm VAT
                  </span>
                </div>
              </div>

              {/* User Account Notice */}
              {isAuthenticated ? (
                <div className="text-xs bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-slate-600">
                  <div className="font-bold text-blue-900 mb-0.5">Tài khoản được kích hoạt:</div>
                  <div className="truncate font-semibold text-blue-700">{user?.name} ({user?.email})</div>
                </div>
              ) : (
                <div className="text-xs bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    Bạn chưa đăng nhập. Khi nhấn thanh toán, hệ thống sẽ chuyển bạn đến màn hình đăng nhập nhanh để gắn gói vào tài khoản.
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-70 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang kết nối cổng PayOS...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Xác Nhận & Thanh Toán PayOS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Security & Guarantee Guarantees */}
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Cổng thanh toán bảo mật liên kết ngân hàng qua PayOS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Kích hoạt tự động ngay khi chuyển khoản thành công</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
export default PaymentPage;
