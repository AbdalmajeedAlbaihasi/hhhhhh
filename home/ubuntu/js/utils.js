/**
 * ملف المساعدات والوظائف المشتركة
 * يحتوي على الوظائف المساعدة المستخدمة في جميع أنحاء التطبيق
 */

// ===== تنسيق التواريخ =====
const DateUtils = {
    /**
     * تنسيق التاريخ للعرض
     * @param {Date|string} date - التاريخ المراد تنسيقه
     * @returns {string} التاريخ المنسق
     */
    formatDate(date) {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        
        return d.toLocaleDateString('ar-SA', options);
    },
    
    /**
     * تنسيق التاريخ للإدخال في حقول HTML
     * @param {Date|string} date - التاريخ المراد تنسيقه
     * @returns {string} التاريخ بصيغة YYYY-MM-DD
     */
    formatDateForInput(date) {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        return d.toISOString().split('T')[0];
    },
    
    /**
     * حساب الفرق بين تاريخين بالأيام
     * @param {Date|string} startDate - تاريخ البداية
     * @param {Date|string} endDate - تاريخ النهاية
     * @returns {number} عدد الأيام
     */
    getDaysDifference(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },
    
    /**
     * التحقق من انتهاء صلاحية التاريخ
     * @param {Date|string} date - التاريخ المراد فحصه
     * @returns {boolean} true إذا كان التاريخ منتهي الصلاحية
     */
    isOverdue(date) {
        if (!date) return false;
        
        const targetDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return targetDate < today;
    },
    
    /**
     * التحقق من قرب انتهاء الموعد (خلال 3 أيام)
     * @param {Date|string} date - التاريخ المراد فحصه
     * @returns {boolean} true إذا كان الموعد قريب
     */
    isDueSoon(date) {
        if (!date) return false;
        
        const targetDate = new Date(date);
        const today = new Date();
        const threeDaysFromNow = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));
        
        return targetDate >= today && targetDate <= threeDaysFromNow;
    }
};

// ===== مساعدات DOM =====
const DOMUtils = {
    /**
     * إنشاء عنصر HTML مع خصائص
     * @param {string} tag - نوع العنصر
     * @param {Object} attributes - خصائص العنصر
     * @param {string} content - محتوى العنصر
     * @returns {HTMLElement} العنصر المنشأ
     */
    createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key === 'dataset') {
                Object.keys(attributes[key]).forEach(dataKey => {
                    element.dataset[dataKey] = attributes[key][dataKey];
                });
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });
        
        if (content) {
            element.innerHTML = content;
        }
        
        return element;
    },
    
    /**
     * إضافة مستمع حدث مع إزالة تلقائية
     * @param {HTMLElement} element - العنصر
     * @param {string} event - نوع الحدث
     * @param {Function} handler - معالج الحدث
     * @param {Object} options - خيارات إضافية
     */
    addEventListenerOnce(element, event, handler, options = {}) {
        const wrappedHandler = (e) => {
            handler(e);
            element.removeEventListener(event, wrappedHandler, options);
        };
        
        element.addEventListener(event, wrappedHandler, options);
    },
    
    /**
     * إظهار/إخفاء عنصر مع تأثير
     * @param {HTMLElement} element - العنصر
     * @param {boolean} show - إظهار أم إخفاء
     * @param {string} animation - نوع التأثير
     */
    toggleElement(element, show, animation = 'fade') {
        if (show) {
            element.classList.remove('hidden');
            element.style.display = '';
            
            if (animation === 'fade') {
                element.style.opacity = '0';
                element.style.transition = 'opacity 0.3s ease-in-out';
                setTimeout(() => {
                    element.style.opacity = '1';
                }, 10);
            }
        } else {
            if (animation === 'fade') {
                element.style.opacity = '0';
                element.style.transition = 'opacity 0.3s ease-in-out';
                setTimeout(() => {
                    element.style.display = 'none';
                    element.classList.add('hidden');
                }, 300);
            } else {
                element.style.display = 'none';
                element.classList.add('hidden');
            }
        }
    }
};

// ===== مساعدات التحقق من صحة البيانات =====
const ValidationUtils = {
    /**
     * التحقق من صحة البريد الإلكتروني
     * @param {string} email - البريد الإلكتروني
     * @returns {boolean} true إذا كان صحيحاً
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    /**
     * التحقق من قوة كلمة المرور
     * @param {string} password - كلمة المرور
     * @returns {Object} نتيجة التحقق
     */
    validatePassword(password) {
        const result = {
            isValid: false,
            errors: []
        };
        
        if (!password || password.length < 6) {
            result.errors.push('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        }
        
        if (!/[A-Za-z]/.test(password)) {
            result.errors.push('كلمة المرور يجب أن تحتوي على حرف واحد على الأقل');
        }
        
        if (!/[0-9]/.test(password)) {
            result.errors.push('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');
        }
        
        result.isValid = result.errors.length === 0;
        return result;
    },
    
    /**
     * التحقق من صحة التواريخ
     * @param {string} startDate - تاريخ البداية
     * @param {string} endDate - تاريخ النهاية
     * @returns {Object} نتيجة التحقق
     */
    validateDateRange(startDate, endDate) {
        const result = {
            isValid: false,
            errors: []
        };
        
        if (!startDate) {
            result.errors.push('تاريخ البداية مطلوب');
        }
        
        if (!endDate) {
            result.errors.push('تاريخ النهاية مطلوب');
        }
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (start >= end) {
                result.errors.push('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
            }
        }
        
        result.isValid = result.errors.length === 0;
        return result;
    }
};

// ===== مساعدات النص =====
const TextUtils = {
    /**
     * اقتطاع النص مع إضافة نقاط
     * @param {string} text - النص
     * @param {number} maxLength - الطول الأقصى
     * @returns {string} النص المقتطع
     */
    truncate(text, maxLength = 100) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },
    
    /**
     * تحويل النص إلى slug
     * @param {string} text - النص
     * @returns {string} النص المحول
     */
    slugify(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },
    
    /**
     * تحويل الحرف الأول إلى كبير
     * @param {string} text - النص
     * @returns {string} النص المحول
     */
    capitalize(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
};

// ===== مساعدات الألوان =====
const ColorUtils = {
    /**
     * الحصول على لون حسب الأولوية
     * @param {string} priority - الأولوية
     * @returns {string} اللون
     */
    getPriorityColor(priority) {
        const colors = {
            high: '#ef4444',
            medium: '#f59e0b',
            low: '#10b981'
        };
        return colors[priority] || colors.medium;
    },
    
    /**
     * الحصول على لون حسب الحالة
     * @param {string} status - الحالة
     * @returns {string} اللون
     */
    getStatusColor(status) {
        const colors = {
            pending: '#64748b',
            'in-progress': '#06b6d4',
            completed: '#10b981',
            overdue: '#ef4444'
        };
        return colors[status] || colors.pending;
    },
    
    /**
     * توليد لون عشوائي
     * @returns {string} اللون بصيغة hex
     */
    generateRandomColor() {
        const colors = [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
            '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
};

// ===== مساعدات التخزين المحلي =====
const StorageUtils = {
    /**
     * حفظ البيانات في التخزين المحلي
     * @param {string} key - المفتاح
     * @param {any} value - القيمة
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('خطأ في حفظ البيانات:', error);
        }
    },
    
    /**
     * استرجاع البيانات من التخزين المحلي
     * @param {string} key - المفتاح
     * @param {any} defaultValue - القيمة الافتراضية
     * @returns {any} البيانات المسترجعة
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('خطأ في استرجاع البيانات:', error);
            return defaultValue;
        }
    },
    
    /**
     * حذف البيانات من التخزين المحلي
     * @param {string} key - المفتاح
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('خطأ في حذف البيانات:', error);
        }
    },
    
    /**
     * مسح جميع البيانات
     */
    clear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('خطأ في مسح البيانات:', error);
        }
    }
};

// ===== مساعدات الأحداث =====
const EventUtils = {
    /**
     * إنشاء حدث مخصص
     * @param {string} eventName - اسم الحدث
     * @param {any} detail - تفاصيل الحدث
     * @returns {CustomEvent} الحدث المخصص
     */
    createCustomEvent(eventName, detail = null) {
        return new CustomEvent(eventName, {
            detail,
            bubbles: true,
            cancelable: true
        });
    },
    
    /**
     * إرسال حدث مخصص
     * @param {string} eventName - اسم الحدث
     * @param {any} detail - تفاصيل الحدث
     * @param {HTMLElement} target - العنصر المستهدف
     */
    dispatch(eventName, detail = null, target = document) {
        const event = this.createCustomEvent(eventName, detail);
        target.dispatchEvent(event);
    }
};

// ===== مساعدات الأداء =====
const PerformanceUtils = {
    /**
     * تأخير تنفيذ الوظيفة (debounce)
     * @param {Function} func - الوظيفة
     * @param {number} wait - وقت التأخير بالميلي ثانية
     * @returns {Function} الوظيفة المؤخرة
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * تحديد معدل تنفيذ الوظيفة (throttle)
     * @param {Function} func - الوظيفة
     * @param {number} limit - الحد الأقصى للتنفيذ بالميلي ثانية
     * @returns {Function} الوظيفة المحدودة
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// ===== تصدير الوظائف =====
window.DateUtils = DateUtils;
window.DOMUtils = DOMUtils;
window.ValidationUtils = ValidationUtils;
window.TextUtils = TextUtils;
window.ColorUtils = ColorUtils;
window.StorageUtils = StorageUtils;
window.EventUtils = EventUtils;
window.PerformanceUtils = PerformanceUtils;

