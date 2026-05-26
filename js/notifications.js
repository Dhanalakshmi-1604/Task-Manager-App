/**
 * Notification Module
 * Dynamically creates and manages animated toast notifications.
 */

let toastContainer = null;

/**
 * Creates the toast container element if it doesn't exist.
 */
function createContainer() {
  if (toastContainer) return;
  
  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);
}

/**
 * Shows a toast notification.
 * @param {string} message - The text to display.
 * @param {string} type - The alert type ('success', 'info', 'warning', 'danger').
 * @param {number} duration - Time in ms before toast disappears (default 3000).
 */
export function showToast(message, type = 'info', duration = 3000) {
  createContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Set icon based on type
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'warning') icon = 'alert-triangle';
  if (type === 'danger') icon = 'trash-2';

  toast.innerHTML = `
    <span class="toast-icon"><i data-lucide="${icon}"></i></span>
    <span class="toast-message">${message}</span>
    <button class="toast-close-btn">&times;</button>
  `;

  toastContainer.appendChild(toast);

  // Initialize Lucide icons inside the new toast
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        class: 'lucide-icon'
      },
      nameAttr: 'data-lucide',
      node: toast
    });
  }

  // Animation: trigger slide-in
  setTimeout(() => {
    toast.classList.add('toast-show');
  }, 10);

  // Setup auto-close timer
  const closeTimer = setTimeout(() => {
    dismissToast(toast);
  }, duration);

  // Setup click-to-dismiss
  const closeBtn = toast.querySelector('.toast-close-btn');
  closeBtn.addEventListener('click', () => {
    clearTimeout(closeTimer);
    dismissToast(toast);
  });
}

/**
 * Handles sliding out and removing toast from DOM
 * @param {HTMLElement} toast - The toast element to dismiss.
 */
function dismissToast(toast) {
  toast.classList.remove('toast-show');
  toast.classList.add('toast-hide');
  
  // Wait for transition to finish before removing
  toast.addEventListener('transitionend', () => {
    toast.remove();
    // Clean up container if empty
    if (toastContainer && toastContainer.childElementCount === 0) {
      toastContainer.remove();
      toastContainer = null;
    }
  });
}
