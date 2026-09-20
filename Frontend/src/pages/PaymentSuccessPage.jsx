import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, ArrowRight, Home, BookOpen, Crown, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { paymentApi } from '../services/paymentService';
import logoImg from '../assets/logo.png';

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hydrate, refreshStats, user } = useAuthStore();

  const orderCode = searchParams.get('orderCode');
  const planId = searchParams.get('plan') || 'monthly';

  const [isLoading, setIsLoading] = useState(Boolean(orderCode));
  const [paymentDetails, setPaymentDetails] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const verifyOrder = async () => {
      if (!orderCode) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await paymentApi.getOrderStatus(orderCode);
        if (isMounted) {
          setPaymentDetails(res);
          // Refresh user profile and stats so Pro status is reflected immediately
          await hydrate();
          refreshStats();
        }
      } catch (err) {
        console.warn('Could not query order status:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    verifyOrder();

    return () => {
      isMounted = false;
    };
  }, [orderCode, hydrate, refreshStats]);

  const planName = planId === 'yearly' ? 'Gói Năm (Hanora VIP)' : 'Gói Tháng (Hanora Pro)';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none text-slate-800 relative justify-center items-center px-4 py-12">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-emerald-100/60 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-lg w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-emerald-600/5 text-center relative overflow-hidden"
      >
        {/* Top brand icon */}
        <div className="flex justify-center mb-6">
          <Link to="/">
            <img src={logoImg} alt="Hanora" className="h-10 w-auto object-contain" />
          </Link>
        </div>

        {/* Success Icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20 border-4 border-white">
          <CheckCircle className="w-10 h-10 stroke-[2.5]" />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display mb-2">
          Thanh Toán Thành Công!
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          Chúc mừng bạn đã nâng cấp tài khoản thành công. Gói dịch vụ đã được kích hoạt trên tài khoản của bạn.
        </p>

        {/* Info card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-left mb-6 space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-slate-500">
            <span>Gói đăng ký:</span>
            <span className="font-extrabold text-blue-600 flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" />
              {planName}
            </span>
          </div>

          {orderCode && (
            <div className="flex justify-between items-center text-slate-500">
              <span>Mã đơn hàng:</span>
              <span className="font-mono font-bold text-slate-800">{orderCode}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-slate-500">
            <span>Trạng thái:</span>
            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              Đã thanh toán (PAID)
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-500 pt-2 border-t border-slate-200/70">
            <span>Tài khoản kích hoạt:</span>
            <span className="font-bold text-slate-800 truncate max-w-[200px]">
              {user?.name || user?.email || 'Tài khoản của bạn'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-sm shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Khám Phá Bảng Điều Khiển</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate('/reader')}
            className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            <span>Mở bài đọc & Trải nghiệm AI</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
export default PaymentSuccessPage;
