import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, RefreshCw, Home, HelpCircle } from 'lucide-react';
import logoImg from '../assets/logo.png';

export function PaymentCancelPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const planId = searchParams.get('plan') || 'monthly';
  const orderCode = searchParams.get('orderCode');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none text-slate-800 relative justify-center items-center px-4 py-12">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-slate-200/60 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-lg w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-slate-300/40 text-center relative overflow-hidden"
      >
        {/* Top brand icon */}
        <div className="flex justify-center mb-6">
          <Link to="/">
            <img src={logoImg} alt="Hanora" className="h-10 w-auto object-contain" />
          </Link>
        </div>

        {/* Cancel / Warning Icon */}
        <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/10 border-4 border-white">
          <AlertCircle className="w-10 h-10 stroke-[2.5]" />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display mb-2">
          Giao Dịch Đã Bị Hủy
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          Đơn hàng của bạn chưa được thanh toán hoặc đã bị hủy từ cổng PayOS. Bạn vẫn có thể thử lại bất cứ lúc nào.
        </p>

        {orderCode && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-500 mb-6 flex justify-between items-center">
            <span>Mã đơn hàng:</span>
            <span className="font-mono font-bold text-slate-800">{orderCode}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate(`/payment?plan=${planId}`)}
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-sm shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Thử Lại Thanh Toán</span>
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Quay Về Trang Chủ</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
export default PaymentCancelPage;
