// js/ui/toast.js
let toastTimeout;

export function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  if (!toast || !toastMessage) {
    console.error("Lỗi: Không tìm thấy element #toast hoặc #toast-message trong DOM.");
    return;
  }

  clearTimeout(toastTimeout);

  toast.classList.remove('bg-green-500','bg-red-500','bg-blue-500','hidden');
  if (type === 'success') toast.classList.add('bg-green-500');
  else if (type === 'error') toast.classList.add('bg-red-500');
  else toast.classList.add('bg-blue-500');

  toastMessage.textContent = message;
  toast.classList.remove('hidden');

  const duration = Math.min(10000, 3500 + message.length * 70);
  toastTimeout = setTimeout(() => { toast.classList.add('hidden'); }, duration);
}
