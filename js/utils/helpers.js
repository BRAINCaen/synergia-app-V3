// js/utils/helpers.js
// Fonctions utilitaires pour SYNERGIA v3.0

/**
 * Formatage de dates et heures
 */
export function formatDate(date, options = {}) {
    if (!date) return '';
    
    const d = date instanceof Date ? date : new Date(date);
    const defaultOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    
    return d.toLocaleDateString('fr-FR', { ...defaultOptions, ...options });
}

export function formatTime(time, options = {}) {
    if (!time) return '';
    
    const t = time instanceof Date ? time : new Date(time);
    const defaultOptions = { hour: '2-digit', minute: '2-digit' };
    
    return t.toLocaleTimeString('fr-FR', { ...defaultOptions, ...options });
}

export function formatDateTime(dateTime, options = {}) {
    if (!dateTime) return '';
    
    const dt = dateTime instanceof Date ? dateTime : new Date(dateTime);
    return `${formatDate(dt, options.date)} à ${formatTime(dt, options.time)}`;
}

export function formatDuration(minutes) {
    if (!minutes || minutes < 0) return '0min';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    
    return `${hours}h${mins.toString().padStart(2, '0')}`;
}

export function getTimeAgo(date) {
    if (!date) return '';
    
    const now = new Date();
    const past = date instanceof Date ? date : new Date(date);
    const diffMs = now - past;
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (seconds < 60) return 'À l\'instant';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}j`;
    if (weeks < 4) return `${weeks}sem`;
    if (months < 12) return `${months}mois`;
    
    return `${years}an${years > 1 ? 's' : ''}`;
}

export function getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi = début
    return new Date(d.setDate(diff));
}

export function getWeekEnd(date = new Date()) {
    const weekStart = getWeekStart(date);
    return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
}

export function isToday(date) {
    const today = new Date();
    const checkDate = date instanceof Date ? date : new Date(date);
    
    return checkDate.toDateString() === today.toDateString();
}

export function isSameDay(date1, date2) {
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    
    return d1.toDateString() === d2.toDateString();
}

/**
 * Manipulation de chaînes
 */
export function truncate(str, length = 50, suffix = '...') {
    if (!str || str.length <= length) return str;
    return str.substring(0, length) + suffix;
}

export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function slugify(str) {
    if (!str) return '';
    
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function sanitizeHTML(str) {
    if (!str) return '';
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function stripHTML(str) {
    if (!str) return '';
    
    const div = document.createElement('div');
    div.innerHTML = str;
    return div.textContent || div.innerText || '';
}

export function formatName(firstName, lastName) {
    if (!firstName && !lastName) return '';
    if (!firstName) return lastName;
    if (!lastName) return firstName;
    
    return `${firstName} ${lastName}`;
}

/**
 * Validation
 */
export function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

export function isValidPhone(phone) {
    const re = /^[\+]?[(]?[\d\s\-\(\)]{10,}$/;
    return re.test(phone);
}

export function isValidPassword(password, minLength = 6) {
    return password && password.length >= minLength;
}

export function isValidURL(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

export function isValidTime(time) {
    const re = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return re.test(time);
}

export function isValidDate(date) {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
}

/**
 * Manipulation d'objets et tableaux
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    
    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}

export function deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
    }
    
    return result;
}

export function groupBy(array, key) {
    return array.reduce((groups, item) => {
        const group = typeof key === 'function' ? key(item) : item[key];
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
    }, {});
}

export function sortBy(array, key, direction = 'asc') {
    return [...array].sort((a, b) => {
        const aVal = typeof key === 'function' ? key(a) : a[key];
        const bVal = typeof key === 'function' ? key(b) : b[key];
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

export function unique(array, key = null) {
    if (!key) return [...new Set(array)];
    
    const seen = new Set();
    return array.filter(item => {
        const value = typeof key === 'function' ? key(item) : item[key];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
    });
}

export function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

export function flatten(array, depth = 1) {
    return depth > 0 
        ? array.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatten(val, depth - 1) : val), [])
        : array.slice();
}

/**
 * Utilitaires numériques
 */
export function formatNumber(num, options = {}) {
    const defaults = { minimumFractionDigits: 0, maximumFractionDigits: 2 };
    return new Intl.NumberFormat('fr-FR', { ...defaults, ...options }).format(num);
}

export function formatCurrency(amount, currency = 'EUR') {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

export function formatPercentage(value, decimals = 1) {
    return `${(value * 100).toFixed(decimals)}%`;
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function random(min = 0, max = 1) {
    return Math.random() * (max - min) + min;
}

export function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
}

export function round(value, decimals = 0) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

/**
 * Utilitaires de performance
 */
export function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

export function memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
    const cache = new Map();
    return (...args) => {
        const key = keyGenerator(...args);
        if (cache.has(key)) return cache.get(key);
        
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
}

/**
 * Utilitaires DOM
 */
export function createElement(tag, options = {}) {
    const element = document.createElement(tag);
    
    if (options.className) element.className = options.className;
    if (options.id) element.id = options.id;
    if (options.textContent) element.textContent = options.textContent;
    if (options.innerHTML) element.innerHTML = options.innerHTML;
    
    if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
    }
    
    if (options.styles) {
        Object.assign(element.style, options.styles);
    }
    
    if (options.events) {
        Object.entries(options.events).forEach(([event, handler]) => {
            element.addEventListener(event, handler);
        });
    }
    
    return element;
}

export function getScrollbarWidth() {
    const outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.overflow = 'scroll';
    outer.style.msOverflowStyle = 'scrollbar';
    document.body.appendChild(outer);
    
    const inner = document.createElement('div');
    outer.appendChild(inner);
    
    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
    outer.parentNode.removeChild(outer);
    
    return scrollbarWidth;
}

export function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

export function scrollToElement(element, options = {}) {
    const defaults = { behavior: 'smooth', block: 'center', inline: 'nearest' };
    element.scrollIntoView({ ...defaults, ...options });
}

/**
 * Utilitaires de stockage
 */
export function setLocalStorage(key, value, expiry = null) {
    try {
        const item = {
            value: value,
            timestamp: Date.now(),
            expiry: expiry
        };
        localStorage.setItem(key, JSON.stringify(item));
        return true;
    } catch (error) {
        console.error('Erreur localStorage setItem:', error);
        return false;
    }
}

export function getLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        if (!item) return defaultValue;
        
        const parsed = JSON.parse(item);
        
        // Vérifier l'expiration
        if (parsed.expiry && Date.now() > parsed.expiry) {
            localStorage.removeItem(key);
            return defaultValue;
        }
        
        return parsed.value;
    } catch (error) {
        console.error('Erreur localStorage getItem:', error);
        return defaultValue;
    }
}

export function removeLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Erreur localStorage removeItem:', error);
        return false;
    }
}

export function clearExpiredLocalStorage() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        try {
            const item = localStorage.getItem(key);
            if (item) {
                const parsed = JSON.parse(item);
                if (parsed.expiry && Date.now() > parsed.expiry) {
                    localStorage.removeItem(key);
                }
            }
        } catch (error) {
            // Ignorer les erreurs de parsing
        }
    });
}

/**
 * Utilitaires de génération
 */
export function generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function generateColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
}

export function generateAvatar(name, size = 40) {
    const initials = name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
    
    const color = generateColor(name);
    
    return `data:image/svg+xml;base64,${btoa(`
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${size}" height="${size}" fill="${color}"/>
            <text x="50%" y="50%" text-anchor="middle" dy="0.35em" 
                  font-family="Arial" font-size="${size * 0.4}" fill="white">
                ${initials}
            </text>
        </svg>
    `)}`;
}

/**
 * Utilitaires de fichiers
 */
export function downloadFile(data, filename, type = 'text/plain') {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

export function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * Utilitaires d'événements
 */
export function createCustomEvent(name, detail = {}) {
    return new CustomEvent(name, { detail, bubbles: true, cancelable: true });
}

export function dispatchEvent(element, eventName, detail = {}) {
    const event = createCustomEvent(eventName, detail);
    element.dispatchEvent(event);
    return event;
}

/**
 * Utilitaires de développement
 */
export function log(...args) {
    if (process.env.NODE_ENV !== 'production') {
        console.log('[SYNERGIA]', ...args);
    }
}

export function warn(...args) {
    if (process.env.NODE_ENV !== 'production') {
        console.warn('[SYNERGIA]', ...args);
    }
}

export function error(...args) {
    console.error('[SYNERGIA]', ...args);
}

export function time(label) {
    if (process.env.NODE_ENV !== 'production') {
        console.time(`[SYNERGIA] ${label}`);
    }
}

export function timeEnd(label) {
    if (process.env.NODE_ENV !== 'production') {
        console.timeEnd(`[SYNERGIA] ${label}`);
    }
}

/**
 * Utilitaires de sécurité
 */
export function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/[<>\"']/g, '')
        .trim();
}

export function isValidInput(input, maxLength = 1000) {
    if (!input || typeof input !== 'string') return false;
    return input.length <= maxLength && !/[<>]/.test(input);
}

/**
 * Export de toutes les fonctions
 */
export default {
    // Dates
    formatDate, formatTime, formatDateTime, formatDuration, getTimeAgo,
    getWeekStart, getWeekEnd, isToday, isSameDay,
    
    // Chaînes
    truncate, capitalize, slugify, sanitizeHTML, stripHTML, formatName,
    
    // Validation
    isValidEmail, isValidPhone, isValidPassword, isValidURL, isValidTime, isValidDate,
    
    // Objets/Tableaux
    deepClone, deepMerge, groupBy, sortBy, unique, chunk, flatten,
    
    // Nombres
    formatNumber, formatCurrency, formatPercentage, clamp, random, randomInt, round,
    
    // Performance
    debounce, throttle, memoize,
    
    // DOM
    createElement, getScrollbarWidth, isElementInViewport, scrollToElement,
    
    // Stockage
    setLocalStorage, getLocalStorage, removeLocalStorage, clearExpiredLocalStorage,
    
    // Génération
    generateId, generateUUID, generateColor, generateAvatar,
    
    // Fichiers
    downloadFile, readFile, formatFileSize, getFileExtension,
    
    // Événements
    createCustomEvent, dispatchEvent,
    
    // Développement
    log, warn, error, time, timeEnd,
    
    // Sécurité
    escapeRegExp, sanitizeInput, isValidInput
};
