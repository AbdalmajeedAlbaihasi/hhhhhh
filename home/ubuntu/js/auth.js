/**
 * نظام المصادقة وإدارة المستخدمين
 * يتعامل مع تسجيل الدخول، إنشاء الحسابات، وإدارة الجلسات
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // التحقق من وجود جلسة نشطة
        this.checkExistingSession();
        
        // ربط أحداث النماذج
        this.bindEvents();
    }
    
    /**
     * التحقق من وجود جلسة نشطة
     */
    checkExistingSession() {
        const savedUser = storage.getCurrentUser();
        if (savedUser) {
            this.currentUser = savedUser;
            this.isAuthenticated = true;
            this.showApp();
        } else {
            this.showAuth();
        }
    }
    
    /**
     * ربط أحداث النماذج والأزرار
     */
    bindEvents() {
        // نموذج تسجيل الدخول
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // نموذج إنشاء الحساب
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
        
        // أزرار التبديل بين النماذج
        const showRegisterBtn = document.getElementById('show-register');
        const showLoginBtn = document.getElementById('show-login');
        
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterForm();
            });
        }
        
        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }
        
        // زر تسجيل الخروج
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
        
        // قائمة المستخدم
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userDropdown = document.getElementById('user-dropdown');
        
        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                userDropdown.classList.toggle('active');
            });
            
            // إغلاق القائمة عند النقر خارجها
            document.addEventListener('click', (e) => {
                if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                    userDropdown.classList.remove('active');
                }
            });
        }
    }
    
    /**
     * معالج تسجيل الدخول
     * @param {Event} event - حدث النموذج
     */
    async handleLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        // التحقق من صحة البيانات
        if (!this.validateLoginForm(email, password)) {
            return;
        }
        
        try {
            // إظهار حالة التحميل
            this.setFormLoading(form, true);
            
            // محاولة تسجيل الدخول
            const user = await this.authenticateUser(email, password);
            
            if (user) {
                // تسجيل دخول ناجح
                this.currentUser = user;
                this.isAuthenticated = true;
                storage.setCurrentUser(user);
                
                // إظهار رسالة نجاح
                notifications.show('تم تسجيل الدخول بنجاح', 'مرحباً بك في مدير المشاريع', 'success');
                
                // الانتقال إلى التطبيق
                setTimeout(() => {
                    this.showApp();
                }, 1000);
                
            } else {
                // فشل تسجيل الدخول
                notifications.show('خطأ في تسجيل الدخول', 'البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
            }
            
        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            notifications.show('خطأ', 'حدث خطأ أثناء تسجيل الدخول', 'error');
        } finally {
            this.setFormLoading(form, false);
        }
    }
    
    /**
     * معالج إنشاء الحساب
     * @param {Event} event - حدث النموذج
     */
    async handleRegister(event) {
        event.preventDefault();
        
        const form = event.target;
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // التحقق من صحة البيانات
        if (!this.validateRegisterForm(name, email, password, confirmPassword)) {
            return;
        }
        
        try {
            // إظهار حالة التحميل
            this.setFormLoading(form, true);
            
            // التحقق من عدم وجود المستخدم مسبقاً
            const existingUser = storage.findUserByEmail(email);
            if (existingUser) {
                notifications.show('خطأ', 'يوجد حساب مسجل بهذا البريد الإلكتروني مسبقاً', 'error');
                return;
            }
            
            // إنشاء المستخدم الجديد
            const newUser = storage.addUser({
                name,
                email,
                password: this.hashPassword(password) // تشفير كلمة المرور
            });
            
            // تسجيل دخول تلقائي
            this.currentUser = newUser;
            this.isAuthenticated = true;
            storage.setCurrentUser(newUser);
            
            // إظهار رسالة نجاح
            notifications.show('تم إنشاء الحساب بنجاح', 'مرحباً بك في مدير المشاريع', 'success');
            
            // الانتقال إلى التطبيق
            setTimeout(() => {
                this.showApp();
            }, 1000);
            
        } catch (error) {
            console.error('خطأ في إنشاء الحساب:', error);
            notifications.show('خطأ', 'حدث خطأ أثناء إنشاء الحساب', 'error');
        } finally {
            this.setFormLoading(form, false);
        }
    }
    
    /**
     * معالج تسجيل الخروج
     */
    handleLogout() {
        // مسح بيانات الجلسة
        this.currentUser = null;
        this.isAuthenticated = false;
        storage.clearCurrentUser();
        
        // إظهار رسالة
        notifications.show('تم تسجيل الخروج', 'شكراً لاستخدام مدير المشاريع', 'info');
        
        // الانتقال إلى صفحة المصادقة
        setTimeout(() => {
            this.showAuth();
        }, 1000);
    }
    
    /**
     * التحقق من صحة بيانات تسجيل الدخول
     * @param {string} email - البريد الإلكتروني
     * @param {string} password - كلمة المرور
     * @returns {boolean} true إذا كانت البيانات صحيحة
     */
    validateLoginForm(email, password) {
        const errors = [];
        
        if (!email) {
            errors.push('البريد الإلكتروني مطلوب');
        } else if (!ValidationUtils.isValidEmail(email)) {
            errors.push('البريد الإلكتروني غير صحيح');
        }
        
        if (!password) {
            errors.push('كلمة المرور مطلوبة');
        }
        
        if (errors.length > 0) {
            notifications.show('خطأ في البيانات', errors.join('<br>'), 'error');
            return false;
        }
        
        return true;
    }
    
    /**
     * التحقق من صحة بيانات إنشاء الحساب
     * @param {string} name - الاسم
     * @param {string} email - البريد الإلكتروني
     * @param {string} password - كلمة المرور
     * @param {string} confirmPassword - تأكيد كلمة المرور
     * @returns {boolean} true إذا كانت البيانات صحيحة
     */
    validateRegisterForm(name, email, password, confirmPassword) {
        const errors = [];
        
        if (!name || name.length < 2) {
            errors.push('الاسم يجب أن يكون حرفين على الأقل');
        }
        
        if (!email) {
            errors.push('البريد الإلكتروني مطلوب');
        } else if (!ValidationUtils.isValidEmail(email)) {
            errors.push('البريد الإلكتروني غير صحيح');
        }
        
        const passwordValidation = ValidationUtils.validatePassword(password);
        if (!passwordValidation.isValid) {
            errors.push(...passwordValidation.errors);
        }
        
        if (password !== confirmPassword) {
            errors.push('كلمة المرور وتأكيد كلمة المرور غير متطابقتين');
        }
        
        if (errors.length > 0) {
            notifications.show('خطأ في البيانات', errors.join('<br>'), 'error');
            return false;
        }
        
        return true;
    }
    
    /**
     * التحقق من صحة بيانات المستخدم
     * @param {string} email - البريد الإلكتروني
     * @param {string} password - كلمة المرور
     * @returns {Object|null} المستخدم أو null
     */
    async authenticateUser(email, password) {
        const user = storage.findUserByEmail(email);
        
        if (!user) {
            return null;
        }
        
        // التحقق من كلمة المرور
        const hashedPassword = this.hashPassword(password);
        if (user.password !== hashedPassword) {
            return null;
        }
        
        // التحقق من حالة المستخدم
        if (!user.isActive) {
            return null;
        }
        
        return user;
    }
    
    /**
     * تشفير كلمة المرور (تشفير بسيط للعرض التوضيحي)
     * في التطبيق الحقيقي يجب استخدام تشفير أقوى
     * @param {string} password - كلمة المرور
     * @returns {string} كلمة المرور المشفرة
     */
    hashPassword(password) {
        // تشفير بسيط باستخدام btoa (للعرض التوضيحي فقط)
        return btoa(password + 'project_manager_salt');
    }
    
    /**
     * تعيين حالة التحميل للنموذج
     * @param {HTMLFormElement} form - النموذج
     * @param {boolean} loading - حالة التحميل
     */
    setFormLoading(form, loading) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const inputs = form.querySelectorAll('input');
        
        if (loading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';
            inputs.forEach(input => input.disabled = true);
        } else {
            submitBtn.disabled = false;
            inputs.forEach(input => input.disabled = false);
            
            // استعادة النص الأصلي للزر
            if (form.id === 'loginForm') {
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
            } else if (form.id === 'registerForm') {
                submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> إنشاء الحساب';
            }
        }
    }
    
    /**
     * إظهار نموذج تسجيل الدخول
     */
    showLoginForm() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (loginForm && registerForm) {
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
        }
    }
    
    /**
     * إظهار نموذج إنشاء الحساب
     */
    showRegisterForm() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (loginForm && registerForm) {
            loginForm.classList.remove('active');
            registerForm.classList.add('active');
        }
    }
    
    /**
     * إظهار صفحة المصادقة
     */
    showAuth() {
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');
        const loadingScreen = document.getElementById('loading-screen');
        
        if (authContainer) authContainer.classList.remove('hidden');
        if (appContainer) appContainer.classList.add('hidden');
        if (loadingScreen) loadingScreen.classList.add('hidden');
        
        // مسح النماذج
        this.clearForms();
    }
    
    /**
     * إظهار التطبيق الرئيسي
     */
    showApp() {
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');
        const loadingScreen = document.getElementById('loading-screen');
        
        if (authContainer) authContainer.classList.add('hidden');
        if (loadingScreen) loadingScreen.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
        
        // تحديث معلومات المستخدم في الواجهة
        this.updateUserInterface();
        
        // تحميل بيانات التطبيق
        if (window.app) {
            window.app.loadData();
        }
    }
    
    /**
     * تحديث واجهة المستخدم
     */
    updateUserInterface() {
        const userNameElement = document.getElementById('user-name');
        
        if (userNameElement && this.currentUser) {
            userNameElement.textContent = this.currentUser.name;
        }
    }
    
    /**
     * مسح النماذج
     */
    clearForms() {
        const forms = document.querySelectorAll('#auth-container form');
        forms.forEach(form => {
            form.reset();
            this.setFormLoading(form, false);
        });
    }
    
    /**
     * الحصول على المستخدم الحالي
     * @returns {Object|null} المستخدم الحالي
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * التحقق من حالة المصادقة
     * @returns {boolean} true إذا كان المستخدم مسجل الدخول
     */
    isUserAuthenticated() {
        return this.isAuthenticated && this.currentUser !== null;
    }
    
    /**
     * التحقق من صلاحيات المستخدم
     * @param {string} permission - الصلاحية المطلوبة
     * @returns {boolean} true إذا كان المستخدم يملك الصلاحية
     */
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        const userRole = this.currentUser.role || 'user';
        
        // صلاحيات المدير
        if (userRole === 'admin') return true;
        
        // صلاحيات المحرر
        if (userRole === 'editor') {
            return ['read', 'write', 'edit'].includes(permission);
        }
        
        // صلاحيات المستخدم العادي
        if (userRole === 'user') {
            return ['read', 'write'].includes(permission);
        }
        
        // صلاحيات المشاهد
        if (userRole === 'viewer') {
            return permission === 'read';
        }
        
        return false;
    }
    
    /**
     * تحديث بيانات المستخدم الحالي
     * @param {Object} updates - التحديثات
     */
    updateCurrentUser(updates) {
        if (!this.currentUser) return;
        
        const updatedUser = storage.updateUser(this.currentUser.id, updates);
        if (updatedUser) {
            this.currentUser = updatedUser;
            storage.setCurrentUser(updatedUser);
            this.updateUserInterface();
        }
    }
}

// إنشاء مثيل واحد من مدير المصادقة
window.auth = new AuthManager();

