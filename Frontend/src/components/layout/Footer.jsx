

export function Footer() {
  return (
    <footer className="py-6 px-8 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <p>&copy; {new Date().getFullYear()} Hanora — Trợ lý Học & Đọc tiếng Trung thông minh AI.</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-slate-650 transition-colors">Bảo mật</a>
          <a href="#" className="hover:text-slate-650 transition-colors">Điều khoản</a>
          <a href="#" className="hover:text-slate-650 transition-colors">Trợ giúp</a>
        </div>
      </div>
    </footer>
  );
}
export default Footer;
