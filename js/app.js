/**
 * التطبيق الرئيسي لمدير المشاريع
 * يربط جميع المكونات ويدير التنقل والحالة العامة
 */

class ProjectManagerApp {
    constructor() {
        this.currentView = 'dashboard';
        this.isInitialized = false;
        
        // انتظار تحميل DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }
    
    /**
     * تهيئة التطبيق
     */
    initialize() {
        if (this.isInitialized) return;
        
        try {
            // إخفاء شاشة التحميل
            this.hideLoadingScreen();
            
            // ربط أحداث التنقل
            this.bindNavigationEvents();
            
            // ربط أحداث عامة
            this.bindGlobalEvents();
            
            // تحميل البيانات إذا كان المستخدم مسجل الدخول
            if (auth.isUserAuthenticated()) {
                this.loadData();
            }
            
            this.isInitialized = true;
            
            console.log('تم تهيئة مدير المشاريع بنجاح');
            
        } catch (error) {
            console.error('خطأ في تهيئة التطبيق:', error);
            notifications.error('خطأ', 'حدث خطأ أثناء تهيئة التطبيق');
        }
    }
    
    /**
     * إخفاء شاشة التحميل
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 1000);
        }
    }
    
    /**
     * ربط أحداث التنقل
     */
    bindNavigationEvents() {
        // روابط التنقل في الشريط الجانبي
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const viewName = link.getAttribute('data-view');
                if (viewName) {
                    this.showView(viewName);
                }
            });
        });
        
        // زر القائمة للجوال
        this.bindMobileMenuEvents();
    }
    
    /**
     * ربط أحداث القائمة للجوال
     */
    bindMobileMenuEvents() {
        // إنشاء زر القائمة للجوال
        const headerContent = document.querySelector('.header-content');
        if (headerContent && window.innerWidth <= 991) {
            const menuToggle = DOMUtils.createElement('button', {
                className: 'mobile-menu-toggle',
                id: 'mobile-menu-toggle'
            });
            menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            
            headerContent.insertBefore(menuToggle, headerContent.firstChild);
            
            // ربط حدث النقر
            menuToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }
        
        // إنشاء طبقة التراكب
        const overlay = DOMUtils.createElement('div', {
            className: 'sidebar-overlay',
            id: 'sidebar-overlay'
        });
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', () => {
            this.closeMobileMenu();
        });
        
        // إغلاق القائمة عند تغيير حجم الشاشة
        window.addEventListener('resize', () => {
            if (window.innerWidth > 991) {
                this.closeMobileMenu();
            }
        });
    }
    
    /**
     * تبديل القائمة للجوال
     */
    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (sidebar && overlay) {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }
    }
    
    /**
     * إغلاق القائمة للجوال
     */
    closeMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (sidebar && overlay) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    }
    
    /**
     * ربط الأحداث العامة
     */
    bindGlobalEvents() {
        // مفاتيح الاختصار
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
        
        // حفظ تلقائي عند إغلاق النافذة
        window.addEventListener('beforeunload', (e) => {
            this.handleBeforeUnload(e);
        });
        
        // تحديث الوقت كل دقيقة
        setInterval(() => {
            this.updateTimeElements();
        }, 60000);
        
        // فحص الاتصال بالإنترنت
        window.addEventListener('online', () => {
            notifications.success('متصل', 'تم استعادة الاتصال بالإنترنت');
        });
        
        window.addEventListener('offline', () => {
            notifications.warning('غير متصل', 'تم فقدان الاتصال بالإنترنت');
        });
    }
    
    /**
     * معالج مفاتيح الاختصار
     * @param {KeyboardEvent} e - حدث لوحة المفاتيح
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + مفاتيح أخرى
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'n':
                    e.preventDefault();
                    if (this.currentView === 'projects') {
                        projects.showAddProjectModal();
                    } else if (this.currentView === 'tasks') {
                        tasks.showAddTaskModal();
                    }
                    break;
                    
                case 's':
                    e.preventDefault();
                    this.saveData();
                    break;
                    
                case '/':
                    e.preventDefault();
                    this.focusSearch();
                    break;
            }
        }
        
        // مفاتيح التنقل
        if (e.altKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    this.showView('dashboard');
                    break;
                case '2':
                    e.preventDefault();
                    this.showView('projects');
                    break;
                case '3':
                    e.preventDefault();
                    this.showView('tasks');
                    break;
                case '4':
                    e.preventDefault();
                    this.showView('gantt');
                    break;
                case '5':
                    e.preventDefault();
                    this.showView('team');
                    break;
            }
        }
    }
    
    /**
     * معالج إغلاق النافذة
     * @param {BeforeUnloadEvent} e - حدث إغلاق النافذة
     */
    handleBeforeUnload(e) {
        // حفظ البيانات قبل الإغلاق
        this.saveData();
        
        // تحذير إذا كانت هناك تغييرات غير محفوظة
        const hasUnsavedChanges = this.checkUnsavedChanges();
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'لديك تغييرات غير محفوظة. هل أنت متأكد من الخروج؟';
            return e.returnValue;
        }
    }
    
    /**
     * عرض صفحة معينة
     * @param {string} viewName - اسم الصفحة
     */
    showView(viewName) {
        // إخفاء جميع الصفحات
        const views = document.querySelectorAll('.view');
        views.forEach(view => {
            view.classList.remove('active');
        });
        
        // إزالة الحالة النشطة من روابط التنقل
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // إظهار الصفحة المطلوبة
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
            
            // تفعيل رابط التنقل المناسب
            const activeNavLink = document.querySelector(`[data-view="${viewName}"]`);
            if (activeNavLink) {
                activeNavLink.classList.add('active');
            }
            
            // تحميل بيانات الصفحة
            this.loadViewData(viewName);
            
            // إغلاق القائمة للجوال
            this.closeMobileMenu();
        }
    }
    
    /**
     * تحميل بيانات الصفحة
     * @param {string} viewName - اسم الصفحة
     */
    loadViewData(viewName) {
        switch (viewName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
                
            case 'projects':
                if (window.projects) {
                    projects.loadProjects();
                }
                break;
                
            case 'tasks':
                if (window.tasks) {
                    tasks.loadTasks();
                }
                break;
                
            case 'gantt':
                if (window.ganttManager) {
                    ganttManager.initializeGantt();
                }
                break;
                
            case 'team':
                if (window.team) {
                    team.loadTeamMembers();
                }
                break;
        }
    }
    
    /**
     * تحميل بيانات لوحة التحكم
     */
    loadDashboardData() {
        // تحديث الإحصائيات
        if (window.projects) {
            projects.loadProjects();
        }
        
        if (window.tasks) {
            tasks.loadTasks();
        }
    }
    
    /**
     * تحميل جميع البيانات
     */
    loadData() {
        try {
            // تحميل المشاريع
            if (window.projects) {
                projects.loadProjects();
            }
            
            // تحميل المهام
            if (window.tasks) {
                tasks.loadTasks();
            }
            
            // تحميل أعضاء الفريق
            if (window.team) {
                team.loadTeamMembers();
            }
            
            // تحديث مخطط جانت
            if (window.ganttManager) {
                setTimeout(() => {
                    ganttManager.refresh();
                }, 1000);
            }
            
        } catch (error) {
            console.error('خطأ في تحميل البيانات:', error);
            notifications.error('خطأ', 'حدث خطأ أثناء تحميل البيانات');
        }
    }
    
    /**
     * حفظ البيانات
     */
    saveData() {
        try {
            // البيانات محفوظة تلقائياً في LocalStorage
            console.log('تم حفظ البيانات');
        } catch (error) {
            console.error('خطأ في حفظ البيانات:', error);
        }
    }
    
    /**
     * التحقق من وجود تغييرات غير محفوظة
     * @returns {boolean} true إذا كانت هناك تغييرات غير محفوظة
     */
    checkUnsavedChanges() {
        // في هذا التطبيق، البيانات محفوظة تلقائياً
        return false;
    }
    
    /**
     * تركيز على حقل البحث
     */
    focusSearch() {
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="بحث"]');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    /**
     * تحديث عناصر الوقت
     */
    updateTimeElements() {
        const timeElements = document.querySelectorAll('[data-time]');
        timeElements.forEach(element => {
            const timestamp = element.getAttribute('data-time');
            if (timestamp) {
                element.textContent = DateUtils.formatDate(timestamp);
            }
        });
    }
    
    /**
     * تصدير البيانات
     */
    exportData() {
        try {
            const data = storage.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `project-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            notifications.success('تم التصدير', 'تم تصدير البيانات بنجاح');
            
        } catch (error) {
            console.error('خطأ في تصدير البيانات:', error);
            notifications.error('خطأ', 'حدث خطأ أثناء تصدير البيانات');
        }
    }
    
    /**
     * استيراد البيانات
     * @param {File} file - ملف البيانات
     */
    importData(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const success = storage.importData(data);
                
                if (success) {
                    notifications.success('تم الاستيراد', 'تم استيراد البيانات بنجاح');
                    this.loadData();
                } else {
                    notifications.error('خطأ', 'فشل في استيراد البيانات');
                }
                
            } catch (error) {
                console.error('خطأ في استيراد البيانات:', error);
                notifications.error('خطأ', 'ملف البيانات غير صحيح');
            }
        };
        
        reader.readAsText(file);
    }
    
    /**
     * إعادة تعيين التطبيق
     */
    resetApp() {
        const confirmed = confirm('هل أنت متأكد من إعادة تعيين التطبيق؟\n\nسيتم حذف جميع البيانات نهائياً.');
        
        if (confirmed) {
            storage.clearAllData();
            auth.handleLogout();
            notifications.info('تم الإعادة', 'تم إعادة تعيين التطبيق بنجاح');
        }
    }
    
    /**
     * الحصول على معلومات التطبيق
     * @returns {Object} معلومات التطبيق
     */
    getAppInfo() {
        return {
            name: 'مدير المشاريع',
            version: '1.0.0',
            author: 'فريق التطوير',
            description: 'نظام متكامل لإدارة المشاريع والمهام',
            features: [
                'إدارة المشاريع والمهام',
                'مخطط جانت التفاعلي',
                'نظام التنبيهات الذكي',
                'إدارة الفريق والصلاحيات',
                'واجهة متجاوبة',
                'تخزين محلي آمن'
            ]
        };
    }
    
    /**
     * عرض معلومات التطبيق
     */
    showAbout() {
        const info = this.getAppInfo();
        
        notifications.showCustom({
            title: info.name,
            message: `
                <div class="about-info">
                    <p><strong>الإصدار:</strong> ${info.version}</p>
                    <p><strong>المطور:</strong> ${info.author}</p>
                    <p><strong>الوصف:</strong> ${info.description}</p>
                    <div class="features-list">
                        <strong>الميزات:</strong>
                        <ul>
                            ${info.features.map(feature => `<li>${feature}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `,
            type: 'info',
            duration: 0,
            actions: [
                {
                    text: 'إغلاق',
                    type: 'secondary',
                    handler: () => {}
                }
            ]
        });
    }
    
    /**
     * الحصول على الصفحة الحالية
     * @returns {string} اسم الصفحة الحالية
     */
    getCurrentView() {
        return this.currentView;
    }
    
    /**
     * التحقق من حالة التهيئة
     * @returns {boolean} true إذا كان التطبيق مهيأ
     */
    isReady() {
        return this.isInitialized;
    }
}

// إنشاء مثيل واحد من التطبيق
window.app = new ProjectManagerApp();

// إضافة أحداث عامة للنافذة
window.addEventListener('load', () => {
    console.log('تم تحميل مدير المشاريع');
});

// معالج الأخطاء العامة
window.addEventListener('error', (e) => {
    console.error('خطأ في التطبيق:', e.error);
    if (window.notifications) {
        notifications.error('خطأ', 'حدث خطأ غير متوقع في التطبيق');
    }
});

// معالج الأخطاء غير المعالجة في Promise
window.addEventListener('unhandledrejection', (e) => {
    console.error('خطأ غير معالج في Promise:', e.reason);
    if (window.notifications) {
        notifications.error('خطأ', 'حدث خطأ في معالجة البيانات');
    }
});

