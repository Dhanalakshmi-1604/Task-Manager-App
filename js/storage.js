/**
 * Storage Module
 * Manages persisting and loading tasks and user preferences from localStorage.
 */

const TASKS_KEY = 'task_manager_tasks';
const CATEGORIES_KEY = 'task_manager_categories';
const THEME_KEY = 'task_manager_theme';

const DEFAULT_CATEGORIES = [
  { id: 'work', name: 'Work', color: '#8b5cf6' },      // Violet
  { id: 'personal', name: 'Personal', color: '#ec4899' },  // Pink
  { id: 'shopping', name: 'Shopping', color: '#3b82f6' },  // Blue
  { id: 'health', name: 'Health', color: '#10b981' }      // Emerald
];

/**
 * Get all tasks from local storage
 * @returns {Array} List of tasks
 */
export function getTasks() {
  const data = localStorage.getItem(TASKS_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Save all tasks to local storage
 * @param {Array} tasks - List of tasks to save
 */
export function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

/**
 * Get all categories from local storage
 * @returns {Array} List of categories
 */
export function getCategories() {
  const data = localStorage.getItem(CATEGORIES_KEY);
  if (!data) {
    saveCategories(DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }
  return JSON.parse(data);
}

/**
 * Save all categories to local storage
 * @param {Array} categories - List of categories to save
 */
export function saveCategories(categories) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

/**
 * Get current theme preference
 * @returns {string} 'dark' or 'light'
 */
export function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

/**
 * Save theme preference
 * @param {string} theme - 'dark' or 'light'
 */
export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}
