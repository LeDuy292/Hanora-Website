import logoImg from '../../assets/logo.png';

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 text-slate-500 text-xs px-4 py-12 pb-[calc(3rem+env(safe-area-inset-bottom))] xl:pb-12">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 grid grid-cols-4 gap-1.5 xs:gap-3 sm:gap-6 lg:gap-8 mb-8 text-left">
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2">
            <img
              src={logoImg}
              className="h-6 sm:h-8 w-auto object-contain"
              alt="Hanora logo"
            />
          </div>
          <p className="hidden sm:block text-xs text-slate-400 leading-relaxed">
            Trung tâm hỗ trợ ôn tập, đọc hiểu chữ Hán hàng đầu Việt Nam giúp bạn làm chủ tiếng Trung tự nhiên qua từng văn cảnh.
          </p>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <h4 className="text-[9px] xs:text-[10px] sm:text-xs font-bold text-slate-800 uppercase tracking-wider">Đường dẫn</h4>
          <ul className="space-y-1 sm:space-y-2 text-[8.5px] xs:text-[10px] sm:text-xs text-slate-500">
            <li><a href="#" className="hover:text-blue-600 transition-colors">Trang chủ</a></li>
            <li><a href="#about" className="hover:text-blue-600 transition-colors">Giới thiệu</a></li>
            <li><a href="#features" className="hover:text-blue-600 transition-colors">Tính năng</a></li>
            <li><a href="#pricing" className="hover:text-blue-600 transition-colors">Bảng giá</a></li>
          </ul>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <h4 className="text-[9px] xs:text-[10px] sm:text-xs font-bold text-slate-800 uppercase tracking-wider">Hỗ trợ</h4>
          <ul className="space-y-1 sm:space-y-2 text-[8.5px] xs:text-[10px] sm:text-xs text-slate-500">
            <li><a href="#" className="hover:text-blue-600 transition-colors">Trợ giúp</a></li>
            <li><a href="#" className="hover:text-blue-600 transition-colors">Điều khoản</a></li>
            <li><a href="#" className="hover:text-blue-600 transition-colors">Bảo mật</a></li>
          </ul>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <h4 className="text-[9px] xs:text-[10px] sm:text-xs font-bold text-slate-800 uppercase tracking-wider">Liên hệ</h4>
          <p className="text-[8.5px] xs:text-[10px] sm:text-xs text-slate-400 break-all">Email: support@hanora.com</p>
          <p className="text-[8.5px] xs:text-[10px] sm:text-xs text-slate-400">Hotline: 1900 6868</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-6 border-t border-slate-100 pt-6 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        &copy; {new Date().getFullYear()} Hanora Learning Hub. Bảo lưu mọi quyền.
      </div>
    </footer>
  );
}
export default Footer;
