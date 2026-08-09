export const tourSteps = [
  // ===== BƯỚC CHUYỂN TRANG NẾU KHÔNG Ở DASHBOARD =====
  {
    id: "navigation-dashboard",
    path: "*",
    target: "#dashboard-menu",
    fallbackTarget: "[data-tour-nav='/dashboard']",
    type: "action",
    action: "navigation",
    targetRoute: "/dashboard",
    title: "Trang Tiến Trình",
    description: "Đây là trang Tiến trình — nơi bạn theo dõi toàn bộ quá trình học tập. Hãy nhấn vào đây để bắt đầu.",
    actionHint: "👉 Nhấp vào mục 'Tiến trình' trên thanh Menu Header",
    next: "dashboard-overview"
  },

  // ===== GIAI ĐOẠN 1 — TIẾN TRÌNH / DASHBOARD =====
  {
    id: "dashboard-overview",
    path: "/dashboard",
    target: "#dashboard-header",
    fallbackTarget: '[data-tour="header-banner"]',
    type: "information",
    action: "acknowledge",
    title: "Trang Tiến trình",
    description: "Đây là trung tâm theo dõi quá trình học tập của bạn.",
    next: "leaderboard"
  },
  {
    id: "leaderboard",
    path: "/dashboard",
    target: "#leaderboard",
    fallbackTarget: '[data-tour="leaderboard-card"]',
    type: "information",
    action: "acknowledge",
    title: "🏆 Bảng xếp hạng",
    description: "Bảng xếp hạng giúp bạn theo dõi vị trí của mình và tạo thêm động lực duy trì việc học.",
    next: "achievements"
  },
  {
    id: "achievements",
    path: "/dashboard",
    target: "#achievements",
    fallbackTarget: '[data-tour="achievements-card"]',
    type: "information",
    action: "acknowledge",
    title: "🏅 Phòng danh hiệu",
    description: "Phòng danh hiệu lưu lại những thành tích bạn đạt được trong quá trình học.",
    next: "streak"
  },
  {
    id: "streak",
    path: "/dashboard",
    target: "#streak",
    fallbackTarget: '[data-tour="streak-card"]',
    type: "information",
    action: "acknowledge",
    title: "🔥 Chuỗi học tập",
    description: "Chuỗi học tập cho biết bạn đã duy trì việc học liên tục trong bao nhiêu ngày.",
    next: "vocabulary-growth"
  },
  {
    id: "vocabulary-growth",
    path: "/dashboard",
    target: "#vocabulary-growth",
    fallbackTarget: '[data-tour="vocab-chart"]',
    type: "information",
    action: "acknowledge",
    title: "📈 Tăng trưởng từ vựng",
    description: "Tại đây bạn có thể theo dõi số lượng từ vựng mình đã học và mức độ phát triển vốn từ theo thời gian.",
    next: "edit-goal"
  },

  // ===== DASHBOARD ACTIONS =====
  {
    id: "edit-goal",
    path: "/dashboard",
    target: "#edit-goal",
    fallbackTarget: '[data-tour="header-banner"] button',
    type: "action",
    action: "click",
    title: "🎯 Sửa mục tiêu",
    description: "Đây là nơi bạn thiết lập hoặc thay đổi mục tiêu học tập của mình.",
    actionHint: "👉 Nhấp vào nút 'Sửa mục tiêu'",
    next: "study-duration"
  },
  {
    id: "study-duration",
    path: "/dashboard",
    target: "#study-duration",
    fallbackTarget: '[data-tour="goal-presets"]',
    type: "action",
    action: "select",
    title: "⏱ Chọn thời gian học",
    description: "Chọn thời lượng học phù hợp với bạn. Bạn có thể chọn 30 phút hoặc 60 phút.",
    actionHint: "👉 Nhấp chọn một mức thời gian (30P / 60P)",
    next: "stats"
  },
  {
    id: "stats",
    path: "/dashboard",
    target: "#stats",
    fallbackTarget: '[data-tour="stat-cards"]',
    type: "information",
    action: "acknowledge",
    title: "🔥 Streak & 🧠 SRS",
    description: "Streak giúp bạn duy trì thói quen học tập. SRS giúp hệ thống xác định thời điểm phù hợp để bạn ôn lại từ vựng.",
    next: "pomodoro-button"
  },
  {
    id: "pomodoro-button",
    path: "/dashboard",
    target: "#pomodoro-button",
    fallbackTarget: '[data-tour="timer-button"]',
    type: "action",
    action: "click",
    title: "⏱ Đồng hồ Pomodoro",
    description: "Pomodoro giúp bạn tập trung học trong từng khoảng thời gian ngắn, hạn chế mất tập trung.",
    actionHint: "👉 Nhấp vào nút 'Đồng hồ' trên Header để thử bật/ẩn đồng hồ",
    next: "translation-menu"
  },
  {
    id: "translation-menu",
    path: "/dashboard",
    target: "#translation-menu",
    fallbackTarget: '[data-tour-nav="/reader"]',
    type: "action",
    action: "navigation",
    targetRoute: "/reader",
    title: "📖 Dịch thuật",
    description: "Dịch thuật giúp bạn đọc tài liệu tiếng Trung, tra cứu từ và xây dựng vốn từ vựng cá nhân.",
    actionHint: "👉 Nhấp vào mục 'Dịch thuật' trên thanh Menu Header",
    next: "upload-document"
  },

  // ===== GIAI ĐOẠN 2 — DỊCH THUẬT & ĐỌC TÀI LIỆU (/reader) =====
  {
    id: "upload-document",
    path: "/reader",
    target: "#upload-document",
    fallbackTarget: 'main',
    type: "action",
    action: "upload",
    title: "📄 Tải file / Chọn tài liệu",
    description: "Bạn có thể tải tài liệu tiếng Trung của mình lên hoặc chọn tài liệu có sẵn để bắt đầu đọc và tra cứu.",
    actionHint: "👉 Nhấp nút Tải file lên hoặc chọn một tài liệu trong danh sách",
    next: "reader-content"
  },
  {
    id: "reader-content",
    path: "/reader",
    target: "#reader-content",
    fallbackTarget: 'main',
    type: "information",
    action: "acknowledge",
    title: "📖 Vùng đọc tài liệu",
    description: "Đây là khu vực đọc tài liệu. Bạn có thể nhấn trực tiếp vào một từ tiếng Trung để tra cứu Pinyin, Hán Việt và nghĩa.",
    next: "lookup-word"
  },
  {
    id: "lookup-word",
    path: "/reader",
    target: "#reader-content",
    fallbackTarget: 'main',
    type: "action",
    action: "click-word",
    title: "🔍 Tra cứu từ vựng 1-Click",
    description: "Hãy thử nhấn trực tiếp vào một từ tiếng Trung trên văn bản.",
    actionHint: "👉 Nhấp vào một từ Tiếng Trung trên màn hình đọc",
    next: "save-word"
  },
  {
    id: "save-word",
    path: "/reader",
    target: "#save-word",
    fallbackTarget: '[data-tour="save-word-btn"]',
    type: "action",
    action: "click",
    title: "⭐ Lưu từ vựng",
    description: "Nhấn 'Lưu từ' để thêm từ này vào Sổ tay Từ vựng cá nhân của bạn.",
    actionHint: "👉 Nhấp nút 'Lưu từ' trong popup tra từ",
    next: "vocabulary-menu"
  },
  {
    id: "vocabulary-menu",
    path: "/reader",
    target: "#vocabulary-menu",
    fallbackTarget: '[data-tour-nav="/vocabulary"]',
    type: "action",
    action: "navigation",
    targetRoute: "/vocabulary",
    title: "📚 Sổ tay Từ vựng",
    description: "Những từ bạn lưu trong quá trình đọc sẽ được tập hợp tại Sổ tay Từ vựng.",
    actionHint: "👉 Nhấp vào mục 'Từ vựng' trên thanh Menu Header",
    next: "vocabulary-table"
  },

  // ===== GIAI ĐOẠN 3 — SỔ TAY TỪ VỰNG (/vocabulary) =====
  {
    id: "vocabulary-table",
    path: "/vocabulary",
    target: "#vocabulary-table",
    fallbackTarget: 'main',
    type: "information",
    action: "acknowledge",
    title: "📚 Sổ tay Từ vựng",
    description: "Đây là Sổ tay Từ vựng cá nhân của bạn. Tại đây bạn có thể quản lý những từ đã lưu, xem Pinyin, Hán Việt, nghĩa và câu ví dụ.",
    next: "audio-button"
  },
  {
    id: "audio-button",
    path: "/vocabulary",
    target: "#audio-button",
    fallbackTarget: '[data-tour="audio-btn"]',
    type: "action",
    action: "click",
    title: "🔊 Phát âm Audio",
    description: "Nhấn nút này để nghe cách phát âm của từ vựng.",
    actionHint: "👉 Nhấp vào biểu tượng loa phát âm bên cạnh từ vựng",
    next: "flashcard-menu"
  },
  {
    id: "flashcard-menu",
    path: "/vocabulary",
    target: "#flashcard-menu",
    fallbackTarget: '[data-tour-nav="/flashcards"]',
    type: "action",
    action: "navigation",
    targetRoute: "/flashcards",
    title: "🃏 Flashcard",
    description: "Flashcard giúp bạn ôn lại những từ đã lưu và ghi nhớ chúng hiệu quả hơn.",
    actionHint: "👉 Nhấp vào mục 'Flashcard' trên thanh Menu Header",
    next: "flashcard-intro"
  },

  // ===== GIAI ĐOẠN 4 — FLASHCARDS 3D & SRS (/flashcards) =====
  {
    id: "flashcard-intro",
    path: "/flashcards",
    target: "#select-deck",
    fallbackTarget: 'main',
    type: "information",
    action: "acknowledge",
    title: "🃏 Thư Viện Flashcard",
    description: "Đây là nơi tập hợp tất cả các bộ thẻ Flashcard từ vựng của bạn.",
    next: "select-deck"
  },
  {
    id: "select-deck",
    path: "/flashcards",
    target: "#select-deck",
    fallbackTarget: '[data-tour="select-deck-btn"]',
    type: "action",
    action: "click",
    title: "📂 Chọn Bộ Thẻ Để Học",
    description: "Hãy nhấp vào nút 'Đọc thẻ' trên bộ thẻ vựng để bắt đầu lật thẻ.",
    actionHint: "👉 Nhấp nút 'Đọc thẻ' để mở bộ thẻ Flashcard",
    next: "flashcard-flip"
  },
  {
    id: "flashcard-flip",
    path: "/flashcards",
    target: "#flashcard",
    fallbackTarget: 'main',
    type: "action",
    action: "click",
    title: "👆 Lật Thẻ Flashcard 3D",
    description: "Hãy nhấn vào Flashcard để lật thẻ 3D và xem đáp án Hán Việt.",
    actionHint: "👉 Nhấp vào thẻ Flashcard để lật mặt sau xem đáp án",
    next: "srs-rating"
  },
  {
    id: "srs-rating",
    path: "/flashcards",
    target: "#srs-rating",
    fallbackTarget: 'main',
    type: "action",
    action: "click",
    title: "🧠 Đánh giá ghi nhớ SRS",
    description: "SRS (Lặp lại ngắt quãng) sẽ dựa trên đánh giá của bạn (Again, Hard, Good, Easy) để tính toán lịch ôn lại thích hợp.",
    actionHint: "👉 Nhấp chọn 1 nút đánh giá (Again / Hard / Good / Easy)",
    next: "FINISH"
  }
];
