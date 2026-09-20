import { apiRequest } from './apiClient';

export const paymentApi = {
  /**
   * Lấy danh sách các gói dịch vụ và bảng giá
   */
  async getPackages() {
    return apiRequest('/payment/packages');
  },

  /**
   * Tạo liên kết thanh toán PayOS VietQR
   * @param {string} planId - 'monthly' | 'yearly'
   * @param {string} [returnUrl]
   * @param {string} [cancelUrl]
   */
  async createPaymentLink(planId, returnUrl, cancelUrl) {
    return apiRequest('/payment/create-payment-link', {
      method: 'POST',
      body: { planId, returnUrl, cancelUrl },
      auth: true,
    });
  },

  /**
   * Kiểm tra trạng thái đơn hàng thanh toán
   * @param {number|string} orderCode
   */
  async getOrderStatus(orderCode) {
    return apiRequest(`/payment/order/${orderCode}`);
  },

  /**
   * Lịch sử giao dịch thanh toán của người dùng hiện tại
   */
  async getMyTransactions() {
    return apiRequest('/payment/history', { auth: true });
  },
};
