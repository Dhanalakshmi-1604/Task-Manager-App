import { getTasks, saveTasks, getCategories, getTheme, saveTheme } from './storage.js';
import { showToast } from './notifications.js';

// CIRCUMFERENCE of SVG progress ring (radius = 24)
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * 24;

// App State
let tasks = [];
let categories = [];
let currentFilter = 'all'; // 'all', 'active', 'completed', or 'cat-[category_id]'
let searchQuery = '';
let priorityFilter = 'all'; // 'all', 'low', 'medium', 'high'
let sortBy = 'newest'; // 'newest', 'oldest', 'dueDate', 'priority'
let editingTaskId = null;

// DOM Elements
const taskListContainer = document.getElementById('task-list');
const emptyStateContainer = document.getElementById('empty-state');
const filterDisplayName = document.getElementById('filter-display-name');
const greetingElement = document.getElementById('greeting');
const dateDisplayElement = document.getElementById('date-display');

// Stat Elements
const statTotal = document.getElementById('stat-total');
const statCompleted = document.getElementById('stat-completed');
const statProgressText = document.getElementById('stat-progress-text');
const progressCircle = document.getElementById('progress-circle');

// Sidebar counts
const countAll = document.getElementById('count-all');
const countActive = document.getElementById('count-active');
const countCompleted = document.getElementById('count-completed');
const sidebarCategoriesContainer = document.getElementById('sidebar-categories');

// Control Elements
const searchInput = document.getElementById('search-input');
const priorityFilterSelect = document.getElementById('priority-filter');
const sortSelect = document.getElementById('sort-select');
const openAddBtn = document.getElementById('open-add-dialog-btn');
const emptyStateAddBtn = document.getElementById('empty-state-add-btn');
const themeToggleBtn = document.getElementById('theme-toggle');

// Modal Elements
const taskModal = document.getElementById('task-modal');
const modalTitle = document.getElementById('modal-title');
const taskForm = document.getElementById('task-form');
const taskIdInput = document.getElementById('task-id');
const taskTitleInput = document.getElementById('task-title-input');
const taskDescInput = document.getElementById('task-desc-input');
const taskPriorityInput = document.getElementById('task-priority-input');
const taskCategoryInput = document.getElementById('task-category-input');
const taskDateInput = document.getElementById('task-date-input');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  // Load data from LocalStorage
  tasks = getTasks();
  categories = getCategories();
  
  // Set Theme
  const currentTheme = getTheme();
  document.documentElement.setAttribute('data-theme', currentTheme);

  // Initialize Progress Circle SVG dimensions
  if (progressCircle) {
    progressCircle.style.strokeDasharray = `${PROGRESS_CIRCUMFERENCE} ${PROGRESS_CIRCUMFERENCE}`;
    progressCircle.style.strokeDashoffset = PROGRESS_CIRCUMFERENCE;
  }

  // Setup Greetings & Date
  initDateAndGreeting();

  // Load Form Select Options
  initCategorySelect();

  // Render sidebar categories
  renderSidebarCategories();

  // Main Render Loop
  updateUI();

  // Setup Event Listeners
  initEventListeners();

  // Initialize icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

/**
 * Display formatted current date and appropriate greeting based on time of day
 */
function initDateAndGreeting() {
  const now = new Date();
  
  // Greeting
  const hour = now.getHours();
  let greetingText = 'Good evening';
  if (hour < 12) {
    greetingText = 'Good morning';
  } else if (hour < 18) {
    greetingText = 'Good afternoon';
  }
  greetingElement.textContent = `${greetingText}!`;

  // Date formatted: "Tuesday, May 26, 2026"
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateDisplayElement.textContent = now.toLocaleDateString('en-US', options);
}

/**
 * Populate the category dropdown options in the Task Creation Modal
 */
function initCategorySelect() {
  taskCategoryInput.innerHTML = categories.map(cat => 
    `<option value="${cat.id}">${cat.name}</option>`
  ).join('');
}

/**
 * Render the categories list in the sidebar with color-coded dot and task counts
 */
function renderSidebarCategories() {
  sidebarCategoriesContainer.innerHTML = categories.map(cat => {
    const catTasks = tasks.filter(t => t.category === cat.id);
    const count = catTasks.length;
    const isActive = currentFilter === `cat-${cat.id}` ? 'active' : '';

    return `
      <button class="category-item ${isActive}" data-category-id="${cat.id}">
        <span class="category-color" style="color: ${cat.color}"></span>
        <span>${cat.name}</span>
        <span class="badge" style="margin-left: auto;">${count}</span>
      </button>
    `;
  }).join('');
}

/**
 * Core rendering controller that updates statistics, counters, and the task list layout
 */
function updateUI() {
  calculateStats();
  renderTaskList();
  renderSidebarCategories();

  // Update text label of current view filter
  let filterText = 'All';
  if (currentFilter === 'active') filterText = 'Active';
  if (currentFilter === 'completed') filterText = 'Completed';
  if (currentFilter.startsWith('cat-')) {
    const catId = currentFilter.replace('cat-', '');
    const category = categories.find(c => c.id === catId);
    filterText = category ? category.name : 'Category';
  }
  filterDisplayName.textContent = filterText;
}

/**
 * Recalculate stats counters (Total, Active, Completed, Progress Percentage)
 */
function calculateStats() {
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  const activeCount = totalCount - completedCount;

  // Update UI simple counters
  statTotal.textContent = totalCount;
  statCompleted.textContent = completedCount;

  // Sidebar counters
  countAll.textContent = totalCount;
  countActive.textContent = activeCount;
  countCompleted.textContent = completedCount;

  // Progress Percentage & Radial Circle
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  statProgressText.textContent = `${progressPercent}%`;

  if (progressCircle) {
    const offset = PROGRESS_CIRCUMFERENCE - (progressPercent / 100) * PROGRESS_CIRCUMFERENCE;
    progressCircle.style.strokeDashoffset = offset;
  }
}

/**
 * Render the task cards inside the grid after filtering and sorting
 */
function renderTaskList() {
  // 1. Filtering
  let filteredTasks = tasks.filter(task => {
    // Status / Category Filter
    if (currentFilter === 'active' && task.completed) return false;
    if (currentFilter === 'completed' && !task.completed) return false;
    if (currentFilter.startsWith('cat-')) {
      const catId = currentFilter.replace('cat-', '');
      if (task.category !== catId) return false;
    }

    // Search Query (title and description)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const titleMatch = task.title.toLowerCase().includes(query);
      const descMatch = task.description.toLowerCase().includes(query);
      if (!titleMatch && !descMatch) return false;
    }

    // Priority Filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

    return true;
  });

  // 2. Sorting
  filteredTasks.sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    if (sortBy === 'oldest') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
    if (sortBy === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (sortBy === 'priority') {
      const weight = { high: 3, medium: 2, low: 1 };
      return weight[b.priority] - weight[a.priority];
    }
    return 0;
  });

  // Toggle empty states display
  if (filteredTasks.length === 0) {
    taskListContainer.innerHTML = '';
    emptyStateContainer.style.display = 'flex';
    return;
  }
  
  emptyStateContainer.style.display = 'none';

  // 3. Generating Card Elements
  taskListContainer.innerHTML = filteredTasks.map(task => {
    const categoryInfo = categories.find(c => c.id === task.category) || { name: 'None', color: '#6b7280' };
    const isCompleted = task.completed ? 'completed' : '';
    const isChecked = task.completed ? 'checked' : '';
    
    // Priority specific color mapping
    let priorityColor = 'var(--priority-low)';
    if (task.priority === 'medium') priorityColor = 'var(--priority-medium)';
    if (task.priority === 'high') priorityColor = 'var(--priority-high)';

    // Date formatting helper for card displays
    let dateHTML = '';
    if (task.dueDate) {
      const dateObj = new Date(task.dueDate);
      const dateFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Highlight overdue tasks (if not completed and due date is in the past)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isOverdue = !task.completed && dateObj < today;
      const overdueClass = isOverdue ? 'text-danger font-semibold' : '';

      dateHTML = `
        <span class="meta-item ${overdueClass}">
          <i data-lucide="calendar"></i>
          <span>${dateFormatted}${isOverdue ? ' (Overdue)' : ''}</span>
        </span>
      `;
    }

    // Hex to RGBA wrapper for badge styles
    const rgbColor = hexToRgb(categoryInfo.color) || '107, 114, 128';

    return `
      <div class="task-card ${isCompleted}" style="--priority-color: ${priorityColor};" data-id="${task.id}">
        <div class="task-card-header">
          <label class="task-checkbox-container">
            <input type="checkbox" class="task-complete-toggle" ${isChecked}>
            <span class="checkmark"></span>
          </label>
          
          <div class="task-details">
            <h3 class="task-title">${escapeHTML(task.title)}</h3>
            ${task.description ? `<p class="task-desc">${escapeHTML(task.description)}</p>` : ''}
          </div>

          <div class="task-actions">
            <button class="action-btn task-edit-btn" title="Edit Task">
              <i data-lucide="edit-3"></i>
            </button>
            <button class="action-btn action-btn-danger task-delete-btn" title="Delete Task">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>

        <div class="task-meta">
          <span class="badge-category" style="--badge-color: ${categoryInfo.color}; --badge-bg: rgba(${rgbColor}, 0.08); --badge-border: rgba(${rgbColor}, 0.15)">
            ${categoryInfo.name}
          </span>
          ${dateHTML}
          <span class="meta-item" style="color: ${priorityColor}">
            <i data-lucide="flag"></i>
            <span style="text-transform: capitalize;">${task.priority}</span>
          </span>
        </div>
      </div>
    `;
  }).join('');

  // Re-run Lucide icons for card items
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Bind Card Action Handlers
  bindTaskCardEvents();
}

/**
 * Attach local event listeners to dynamically generated task cards
 */
function bindTaskCardEvents() {
  // 1. Completion toggles
  document.querySelectorAll('.task-complete-toggle').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const card = e.target.closest('.task-card');
      const id = card.dataset.id;
      toggleTaskCompletion(id, e.target.checked);
    });
  });

  // 2. Edit buttons
  document.querySelectorAll('.task-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.task-card');
      const id = card.dataset.id;
      openEditTaskDialog(id);
    });
  });

  // 3. Delete buttons
  document.querySelectorAll('.task-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.task-card');
      const id = card.dataset.id;
      deleteTask(id);
    });
  });
}

/**
 * Complete or reactivate a task, with celebration effects on completion
 */
function toggleTaskCompletion(id, completed) {
  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) return;

  tasks[taskIndex].completed = completed;
  saveTasks(tasks);

  if (completed) {
    showToast('Task marked as completed!', 'success');
    triggerCompletionConfetti();
  } else {
    showToast('Task marked as active', 'info');
  }

  updateUI();
}

/**
 * Launch premium canvas confetti effect
 */
function triggerCompletionConfetti() {
  if (window.confetti) {
    window.confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#8b5cf6', '#a78bfa', '#10b981', '#3b82f6']
    });
  }
}

/**
 * Open editing dialog and prefill with existing task properties
 */
function openEditTaskDialog(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editingTaskId = id;
  modalTitle.textContent = 'Edit Task';
  taskIdInput.value = task.id;
  taskTitleInput.value = task.title;
  taskDescInput.value = task.description || '';
  taskPriorityInput.value = task.priority;
  taskCategoryInput.value = task.category;
  taskDateInput.value = task.dueDate || '';

  taskModal.showModal();
}

/**
 * Open fresh task creation modal
 */
function openAddTaskDialog() {
  editingTaskId = null;
  modalTitle.textContent = 'Create Task';
  taskForm.reset();
  taskIdInput.value = '';
  
  // Set default due date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  taskDateInput.value = tomorrow.toISOString().substring(0, 10);

  taskModal.showModal();
}

/**
 * Handle dialog close
 */
function closeDialog() {
  taskModal.close();
}

/**
 * Delete a specific task after user trigger
 */
function deleteTask(id) {
  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) return;

  const deletedTaskTitle = tasks[taskIndex].title;
  tasks.splice(taskIndex, 1);
  saveTasks(tasks);

  showToast(`"${deletedTaskTitle}" deleted successfully.`, 'danger');
  updateUI();
}

/**
 * Form Submit logic for creating / editing tasks
 */
function handleFormSubmit(e) {
  e.preventDefault();

  const title = taskTitleInput.value.trim();
  const description = taskDescInput.value.trim();
  const priority = taskPriorityInput.value;
  const category = taskCategoryInput.value;
  const dueDate = taskDateInput.value;

  if (!title) {
    showToast('Task title is required!', 'warning');
    return;
  }

  if (editingTaskId) {
    // Update Mode
    const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
    if (taskIndex !== -1) {
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        title,
        description,
        priority,
        category,
        dueDate
      };
      saveTasks(tasks);
      showToast('Task details updated!', 'success');
    }
  } else {
    // Create Mode
    const newTask = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      title,
      description,
      priority,
      category,
      dueDate,
      completed: false,
      createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
    saveTasks(tasks);
    showToast('New task added successfully!', 'success');
  }

  closeDialog();
  updateUI();
}

/**
 * Setup layout event binding (filtering, sorting, toggling themes)
 */
function initEventListeners() {
  // Navigation filters
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.category-item').forEach(b => b.classList.remove('active'));
      
      const item = e.currentTarget;
      item.classList.add('active');
      currentFilter = item.dataset.filter;
      updateUI();
    });
  });

  // Sidebar dynamic category filters delegation
  sidebarCategoriesContainer.addEventListener('click', (e) => {
    const item = e.target.closest('.category-item');
    if (!item) return;

    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.category-item').forEach(b => b.classList.remove('active'));
    
    item.classList.add('active');
    currentFilter = `cat-${item.dataset.categoryId}`;
    updateUI();
  });

  // Search input events
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    updateUI();
  });

  // Priority select filter
  priorityFilterSelect.addEventListener('change', (e) => {
    priorityFilter = e.target.value;
    updateUI();
  });

  // Sort select
  sortSelect.addEventListener('change', (e) => {
    sortBy = e.target.value;
    updateUI();
  });

  // Modals buttons
  openAddBtn.addEventListener('click', openAddTaskDialog);
  emptyStateAddBtn.addEventListener('click', openAddTaskDialog);
  closeModalBtn.addEventListener('click', closeDialog);
  cancelModalBtn.addEventListener('click', closeDialog);
  taskForm.addEventListener('submit', handleFormSubmit);

  // Theme Toggle Button
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    saveTheme(newTheme);
    showToast(`Switched to ${newTheme} theme`, 'info');
  });
}

/* -------------------------------------------------------------
 * CORE HELPERS / UTILITIES
 * ------------------------------------------------------------- */

/**
 * Escapes characters to prevent HTML injection XSS
 */
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/**
 * Converts Hex code colors to raw RGB channels for background opacity CSS variables
 * @param {string} hex - e.g., "#8b5cf6"
 * @returns {string} - e.g., "139, 92, 246"
 */
function hexToRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
    : null;
}
