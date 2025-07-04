/**
 * نظام التنبيهات والإشعارات
 * يتعامل مع عرض التنبيهات، إدارة الإشعارات، وتنبيهات المواعيد النهائية
 */

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.checkInterval = null;
        
        // إعداد النظام
        this.initialize();
    }
    
    /**
     * تهيئة نظام التنبيهات
     */
    initialize() {
        // إنشاء حاوية التنبيهات إذا لم تكن موجودة
        this.createNotificationContainer();
        
        // بدء فحص المواعيد النهائية
        this.startDeadlineCheck();
        
        // طلب إذن التنبيهات من المتصفح
        this.requestNotificationPermission();
    }
    
    /**
     * إنشاء حاوية التنبيهات
     */
    createNotificationContainer() {
        this.container = document.getElementById('notification-container');
        
        if (!this.container) {
            this.container = DOMUtils.createElement('div', {
                id: 'notification-container',
                className: 'notification-container'
            });
            document.body.appendChild(this.container);
        }
    }
    
    /**
     * عرض تنبيه
     * @param {string} title - عنوان التنبيه
     * @param {string} message - رسالة التنبيه
     * @param {string} type - نوع التنبيه (success, error, warning, info)
     * @param {number} duration - مدة العرض بالميلي ثانية (0 = دائم)
     * @returns {string} معرف التنبيه
     */
    show(title, message, type = 'info', duration = 5000) {
        const notification = {
            id: this.generateId(),
            title,
            message,
            type,
            timestamp: new Date(),
            duration
        };
        
        this.notifications.push(notification);
        this.renderNotification(notification);
        
        // إزالة تلقائية إذا كانت المدة محددة
        if (duration > 0) {
            setTimeout(() => {
                this.hide(notification.id);
            }, duration);
        }
        
        // حفظ في التخزين المحلي
        this.saveToStorage(notification);
        
        return notification.id;
    }
    
    /**
     * عرض تنبيه نجاح
     * @param {string} title - عنوان التنبيه
     * @param {string} message - رسالة التنبيه
     * @param {number} duration - مدة العرض
     * @returns {string} معرف التنبيه
     */
    success(title, message, duration = 4000) {
        return this.show(title, message, 'success', duration);
    }
    
    /**
     * عرض تنبيه خطأ
     * @param {string} title - عنوان التنبيه
     * @param {string} message - رسالة التنبيه
     * @param {number} duration - مدة العرض
     * @returns {string} معرف التنبيه
     */
    error(title, message, duration = 6000) {
        return this.show(title, message, 'error', duration);
    }
    
    /**
     * عرض تنبيه تحذير
     * @param {string} title - عنوان التنبيه
     * @param {string} message - رسالة التنبيه
     * @param {number} duration - مدة العرض
     * @returns {string} معرف التنبيه
     */
    warning(title, message, duration = 5000) {
        return this.show(title, message, 'warning', duration);
    }
    
    /**
     * عرض تنبيه معلومات
     * @param {string} title - عنوان التنبيه
     * @param {string} message - رسالة التنبيه
     * @param {number} duration - مدة العرض
     * @returns {string} معرف التنبيه
     */
    info(title, message, duration = 4000) {
        return this.show(title, message, 'info', duration);
    }
    
    /**
     * عرض التنبيه في الواجهة
     * @param {Object} notification - بيانات التنبيه
     */
    renderNotification(notification) {
        const element = DOMUtils.createElement('div', {
            className: `notification notification-${notification.type}`,
            dataset: { notificationId: notification.id }
        });
        
        const icon = this.getNotificationIcon(notification.type);
        
        element.innerHTML = `
            <div class="notification-icon">
                <i class="${icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
            </div>
            <button class="notification-close" onclick="notifications.hide('${notification.id}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // إضافة إلى الحاوية
        this.container.appendChild(element);
        
        // تأثير الظهور
        setTimeout(() => {
            element.classList.add('show');
        }, 100);
        
        // إضافة حدث النقر للإغلاق
        element.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-close')) {
                this.hide(notification.id);
            }
        });
    }
    
    /**
     * إخفاء تنبيه
     * @param {string} notificationId - معرف التنبيه
     */
    hide(notificationId) {
        const element = this.container.querySelector(`[data-notification-id="${notificationId}"]`);
        
        if (element) {
            element.classList.remove('show');
            
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }, 300);
        }
        
        // إزالة من المصفوفة
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
    }
    
    /**
     * إخفاء جميع التنبيهات
     */
    hideAll() {
        this.notifications.forEach(notification => {
            this.hide(notification.id);
        });
    }
    
    /**
     * الحصول على أيقونة التنبيه
     * @param {string} type - نوع التنبيه
     * @returns {string} فئة الأيقونة
     */
    getNotificationIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }
    
    /**
     * حفظ التنبيه في التخزين المحلي
     * @param {Object} notification - بيانات التنبيه
     */
    saveToStorage(notification) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;
        
        storage.addNotification({
            title: notification.title,
            message: notification.message,
            type: notification.type,
            userId: currentUser.id
        });
    }
    
    /**
     * بدء فحص المواعيد النهائية
     */
    startDeadlineCheck() {
        // فحص فوري
        this.checkDeadlines();
        
        // فحص كل 30 دقيقة
        this.checkInterval = setInterval(() => {
            this.checkDeadlines();
        }, 30 * 60 * 1000);
    }
    
    /**
     * إيقاف فحص المواعيد النهائية
     */
    stopDeadlineCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
    
    /**
     * فحص المواعيد النهائية
     */
    checkDeadlines() {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;
        
        // فحص المهام المتأخرة
        this.checkOverdueTasks();
        
        // فحص المهام القادمة
        this.checkUpcomingTasks();
        
        // فحص المشاريع المتأخرة
        this.checkOverdueProjects();
    }
    
    /**
     * فحص المهام المتأخرة
     */
    checkOverdueTasks() {
        const overdueTasks = storage.getOverdueTasks();
        
        overdueTasks.forEach(task => {
            const lastNotified = this.getLastNotificationTime(`overdue_task_${task.id}`);
            const now = new Date();
            
            // إرسال تنبيه مرة واحدة يومياً فقط
            if (!lastNotified || (now - lastNotified) > 24 * 60 * 60 * 1000) {
                const project = storage.findProjectById(task.projectId);
                const projectName = project ? project.name : 'مشروع محذوف';
                
                this.warning(
                    'مهمة متأخرة',
                    `المهمة "${task.name}" في مشروع "${projectName}" متأخرة عن موعدها النهائي`,
                    8000
                );
                
                // إرسال تنبيه المتصفح
                this.sendBrowserNotification(
                    'مهمة متأخرة',
                    `المهمة "${task.name}" متأخرة عن موعدها النهائي`
                );
                
                this.setLastNotificationTime(`overdue_task_${task.id}`, now);
            }
        });
    }
    
    /**
     * فحص المهام القادمة
     */
    checkUpcomingTasks() {
        const upcomingTasks = storage.getUpcomingTasks();
        
        upcomingTasks.forEach(task => {
            const endDate = new Date(task.endDate);
            const now = new Date();
            const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            
            // تنبيه للمهام التي تنتهي خلال 3 أيام
            if (daysLeft <= 3 && daysLeft > 0) {
                const lastNotified = this.getLastNotificationTime(`upcoming_task_${task.id}`);
                
                // إرسال تنبيه مرة واحدة يومياً فقط
                if (!lastNotified || (now - lastNotified) > 24 * 60 * 60 * 1000) {
                    const project = storage.findProjectById(task.projectId);
                    const projectName = project ? project.name : 'مشروع محذوف';
                    
                    this.info(
                        'موعد نهائي قريب',
                        `المهمة "${task.name}" في مشروع "${projectName}" تنتهي خلال ${daysLeft} أيام`,
                        6000
                    );
                    
                    this.setLastNotificationTime(`upcoming_task_${task.id}`, now);
                }
            }
        });
    }
    
    /**
     * فحص المشاريع المتأخرة
     */
    checkOverdueProjects() {
        const currentUser = auth.getCurrentUser();
        const projects = storage.getUserProjects(currentUser.id);
        
        projects.forEach(project => {
            if (project.progress < 100 && DateUtils.isOverdue(project.endDate)) {
                const lastNotified = this.getLastNotificationTime(`overdue_project_${project.id}`);
                const now = new Date();
                
                // إرسال تنبيه مرة واحدة يومياً فقط
                if (!lastNotified || (now - lastNotified) > 24 * 60 * 60 * 1000) {
                    this.warning(
                        'مشروع متأخر',
                        `المشروع "${project.name}" متأخر عن موعده النهائي`,
                        8000
                    );
                    
                    this.setLastNotificationTime(`overdue_project_${project.id}`, now);
                }
            }
        });
    }
    
    /**
     * طلب إذن التنبيهات من المتصفح
     */
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.info(
                        'تم تفعيل التنبيهات',
                        'سيتم إرسال تنبيهات المواعيد النهائية إليك',
                        4000
                    );
                }
            });
        }
    }
    
    /**
     * إرسال تنبيه المتصفح
     * @param {string} title - عنوان التنبيه
     * @param {string} body - نص التنبيه
     * @param {string} icon - أيقونة التنبيه
     */
    sendBrowserNotification(title, body, icon = '/favicon.ico') {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body,
                icon,
                badge: icon,
                tag: 'project-manager',
                requireInteraction: false,
                silent: false
            });
            
            // إغلاق تلقائي بعد 5 ثوان
            setTimeout(() => {
                notification.close();
            }, 5000);
            
            // النقر على التنبيه يفتح التطبيق
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }
    
    /**
     * الحصول على وقت آخر تنبيه
     * @param {string} key - مفتاح التنبيه
     * @returns {Date|null} وقت آخر تنبيه
     */
    getLastNotificationTime(key) {
        const timestamp = StorageUtils.get(`last_notification_${key}`, null);
        return timestamp ? new Date(timestamp) : null;
    }
    
    /**
     * تعيين وقت آخر تنبيه
     * @param {string} key - مفتاح التنبيه
     * @param {Date} time - وقت التنبيه
     */
    setLastNotificationTime(key, time) {
        StorageUtils.set(`last_notification_${key}`, time.toISOString());
    }
    
    /**
     * إنشاء تنبيه مخصص مع أزرار إجراءات
     * @param {Object} options - خيارات التنبيه
     * @returns {string} معرف التنبيه
     */
    showCustom(options) {
        const {
            title,
            message,
            type = 'info',
            duration = 0,
            actions = []
        } = options;
        
        const notification = {
            id: this.generateId(),
            title,
            message,
            type,
            timestamp: new Date(),
            duration,
            actions
        };
        
        this.notifications.push(notification);
        this.renderCustomNotification(notification);
        
        if (duration > 0) {
            setTimeout(() => {
                this.hide(notification.id);
            }, duration);
        }
        
        return notification.id;
    }
    
    /**
     * عرض التنبيه المخصص
     * @param {Object} notification - بيانات التنبيه
     */
    renderCustomNotification(notification) {
        const element = DOMUtils.createElement('div', {
            className: `notification notification-${notification.type} notification-custom`,
            dataset: { notificationId: notification.id }
        });
        
        const icon = this.getNotificationIcon(notification.type);
        
        let actionsHTML = '';
        if (notification.actions && notification.actions.length > 0) {
            actionsHTML = `
                <div class="notification-actions">
                    ${notification.actions.map(action => `
                        <button class="btn btn-sm btn-${action.type || 'secondary'}" 
                                onclick="${action.handler}; notifications.hide('${notification.id}')">
                            ${action.icon ? `<i class="${action.icon}"></i>` : ''}
                            ${action.text}
                        </button>
                    `).join('')}
                </div>
            `;
        }
        
        element.innerHTML = `
            <div class="notification-icon">
                <i class="${icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                ${actionsHTML}
            </div>
            <button class="notification-close" onclick="notifications.hide('${notification.id}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        this.container.appendChild(element);
        
        setTimeout(() => {
            element.classList.add('show');
        }, 100);
    }
    
    /**
     * عرض تنبيه تأكيد
     * @param {string} title - عنوان التنبيه
     * @param {string} message - رسالة التنبيه
     * @param {Function} onConfirm - دالة التأكيد
     * @param {Function} onCancel - دالة الإلغاء
     * @returns {string} معرف التنبيه
     */
    confirm(title, message, onConfirm, onCancel = null) {
        return this.showCustom({
            title,
            message,
            type: 'warning',
            duration: 0,
            actions: [
                {
                    text: 'تأكيد',
                    type: 'primary',
                    icon: 'fas fa-check',
                    handler: `(${onConfirm.toString()})()`
                },
                {
                    text: 'إلغاء',
                    type: 'secondary',
                    icon: 'fas fa-times',
                    handler: onCancel ? `(${onCancel.toString()})()` : ''
                }
            ]
        });
    }
    
    /**
     * توليد معرف فريد
     * @returns {string} المعرف الفريد
     */
    generateId() {
        return 'notification_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    /**
     * الحصول على عدد التنبيهات النشطة
     * @returns {number} عدد التنبيهات
     */
    getActiveCount() {
        return this.notifications.length;
    }
    
    /**
     * تنظيف الموارد
     */
    destroy() {
        this.stopDeadlineCheck();
        this.hideAll();
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

// إنشاء مثيل واحد من مدير التنبيهات
window.notifications = new NotificationManager();

