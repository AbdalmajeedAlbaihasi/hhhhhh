/**
 * نظام إدارة التخزين المحلي
 * يتعامل مع حفظ واسترجاع جميع بيانات التطبيق في LocalStorage
 */

class StorageManager {
    constructor() {
        // مفاتيح التخزين
        this.keys = {
            users: 'pm_users',
            currentUser: 'pm_current_user',
            projects: 'pm_projects',
            tasks: 'pm_tasks',
            teams: 'pm_teams',
            settings: 'pm_settings',
            notifications: 'pm_notifications'
        };
        
        // تهيئة البيانات الافتراضية
        this.initializeDefaultData();
    }
    
    /**
     * تهيئة البيانات الافتراضية
     */
    initializeDefaultData() {
        // إنشاء بيانات افتراضية إذا لم تكن موجودة
        if (!this.getUsers().length) {
            this.setUsers([]);
        }
        
        if (!this.getProjects().length) {
            this.setProjects([]);
        }
        
        if (!this.getTasks().length) {
            this.setTasks([]);
        }
        
        if (!this.getTeams().length) {
            this.setTeams([]);
        }
        
        if (!this.getSettings()) {
            this.setSettings({
                theme: 'light',
                language: 'ar',
                notifications: true,
                emailNotifications: false,
                timezone: 'Asia/Riyadh'
            });
        }
    }
    
    // ===== إدارة المستخدمين =====
    
    /**
     * الحصول على جميع المستخدمين
     * @returns {Array} قائمة المستخدمين
     */
    getUsers() {
        return StorageUtils.get(this.keys.users, []);
    }
    
    /**
     * حفظ قائمة المستخدمين
     * @param {Array} users - قائمة المستخدمين
     */
    setUsers(users) {
        StorageUtils.set(this.keys.users, users);
    }
    
    /**
     * إضافة مستخدم جديد
     * @param {Object} user - بيانات المستخدم
     * @returns {Object} المستخدم المضاف
     */
    addUser(user) {
        const users = this.getUsers();
        const newUser = {
            id: this.generateId(),
            name: user.name,
            email: user.email,
            password: user.password, // في التطبيق الحقيقي يجب تشفير كلمة المرور
            avatar: user.avatar || null,
            role: user.role || 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
        };
        
        users.push(newUser);
        this.setUsers(users);
        return newUser;
    }
    
    /**
     * البحث عن مستخدم بالبريد الإلكتروني
     * @param {string} email - البريد الإلكتروني
     * @returns {Object|null} المستخدم أو null
     */
    findUserByEmail(email) {
        const users = this.getUsers();
        return users.find(user => user.email === email) || null;
    }
    
    /**
     * البحث عن مستخدم بالمعرف
     * @param {string} id - معرف المستخدم
     * @returns {Object|null} المستخدم أو null
     */
    findUserById(id) {
        const users = this.getUsers();
        return users.find(user => user.id === id) || null;
    }
    
    /**
     * تحديث بيانات المستخدم
     * @param {string} id - معرف المستخدم
     * @param {Object} updates - التحديثات
     * @returns {Object|null} المستخدم المحدث أو null
     */
    updateUser(id, updates) {
        const users = this.getUsers();
        const userIndex = users.findIndex(user => user.id === id);
        
        if (userIndex === -1) return null;
        
        users[userIndex] = {
            ...users[userIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        this.setUsers(users);
        return users[userIndex];
    }
    
    /**
     * الحصول على المستخدم الحالي
     * @returns {Object|null} المستخدم الحالي أو null
     */
    getCurrentUser() {
        return StorageUtils.get(this.keys.currentUser, null);
    }
    
    /**
     * تعيين المستخدم الحالي
     * @param {Object} user - المستخدم
     */
    setCurrentUser(user) {
        StorageUtils.set(this.keys.currentUser, user);
    }
    
    /**
     * تسجيل خروج المستخدم الحالي
     */
    clearCurrentUser() {
        StorageUtils.remove(this.keys.currentUser);
    }
    
    // ===== إدارة المشاريع =====
    
    /**
     * الحصول على جميع المشاريع
     * @returns {Array} قائمة المشاريع
     */
    getProjects() {
        return StorageUtils.get(this.keys.projects, []);
    }
    
    /**
     * حفظ قائمة المشاريع
     * @param {Array} projects - قائمة المشاريع
     */
    setProjects(projects) {
        StorageUtils.set(this.keys.projects, projects);
    }
    
    /**
     * إضافة مشروع جديد
     * @param {Object} project - بيانات المشروع
     * @returns {Object} المشروع المضاف
     */
    addProject(project) {
        const projects = this.getProjects();
        const currentUser = this.getCurrentUser();
        
        const newProject = {
            id: this.generateId(),
            name: project.name,
            description: project.description || '',
            startDate: project.startDate,
            endDate: project.endDate,
            priority: project.priority || 'medium',
            status: project.status || 'active',
            progress: 0,
            ownerId: currentUser.id,
            teamMembers: [currentUser.id],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            color: ColorUtils.generateRandomColor()
        };
        
        projects.push(newProject);
        this.setProjects(projects);
        return newProject;
    }
    
    /**
     * البحث عن مشروع بالمعرف
     * @param {string} id - معرف المشروع
     * @returns {Object|null} المشروع أو null
     */
    findProjectById(id) {
        const projects = this.getProjects();
        return projects.find(project => project.id === id) || null;
    }
    
    /**
     * الحصول على مشاريع المستخدم
     * @param {string} userId - معرف المستخدم
     * @returns {Array} قائمة المشاريع
     */
    getUserProjects(userId) {
        const projects = this.getProjects();
        return projects.filter(project => 
            project.ownerId === userId || 
            project.teamMembers.includes(userId)
        );
    }
    
    /**
     * تحديث بيانات المشروع
     * @param {string} id - معرف المشروع
     * @param {Object} updates - التحديثات
     * @returns {Object|null} المشروع المحدث أو null
     */
    updateProject(id, updates) {
        const projects = this.getProjects();
        const projectIndex = projects.findIndex(project => project.id === id);
        
        if (projectIndex === -1) return null;
        
        projects[projectIndex] = {
            ...projects[projectIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        this.setProjects(projects);
        return projects[projectIndex];
    }
    
    /**
     * حذف مشروع
     * @param {string} id - معرف المشروع
     * @returns {boolean} true إذا تم الحذف بنجاح
     */
    deleteProject(id) {
        const projects = this.getProjects();
        const projectIndex = projects.findIndex(project => project.id === id);
        
        if (projectIndex === -1) return false;
        
        // حذف جميع المهام المرتبطة بالمشروع
        const tasks = this.getTasks();
        const updatedTasks = tasks.filter(task => task.projectId !== id);
        this.setTasks(updatedTasks);
        
        // حذف المشروع
        projects.splice(projectIndex, 1);
        this.setProjects(projects);
        return true;
    }
    
    // ===== إدارة المهام =====
    
    /**
     * الحصول على جميع المهام
     * @returns {Array} قائمة المهام
     */
    getTasks() {
        return StorageUtils.get(this.keys.tasks, []);
    }
    
    /**
     * حفظ قائمة المهام
     * @param {Array} tasks - قائمة المهام
     */
    setTasks(tasks) {
        StorageUtils.set(this.keys.tasks, tasks);
    }
    
    /**
     * إضافة مهمة جديدة
     * @param {Object} task - بيانات المهمة
     * @returns {Object} المهمة المضافة
     */
    addTask(task) {
        const tasks = this.getTasks();
        const currentUser = this.getCurrentUser();
        
        const newTask = {
            id: this.generateId(),
            name: task.name,
            description: task.description || '',
            projectId: task.projectId,
            startDate: task.startDate,
            endDate: task.endDate,
            priority: task.priority || 'medium',
            status: task.status || 'pending',
            progress: 0,
            assignedTo: task.assignedTo || currentUser.id,
            createdBy: currentUser.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dependencies: task.dependencies || []
        };
        
        tasks.push(newTask);
        this.setTasks(tasks);
        
        // تحديث تقدم المشروع
        this.updateProjectProgress(task.projectId);
        
        return newTask;
    }
    
    /**
     * البحث عن مهمة بالمعرف
     * @param {string} id - معرف المهمة
     * @returns {Object|null} المهمة أو null
     */
    findTaskById(id) {
        const tasks = this.getTasks();
        return tasks.find(task => task.id === id) || null;
    }
    
    /**
     * الحصول على مهام المشروع
     * @param {string} projectId - معرف المشروع
     * @returns {Array} قائمة المهام
     */
    getProjectTasks(projectId) {
        const tasks = this.getTasks();
        return tasks.filter(task => task.projectId === projectId);
    }
    
    /**
     * الحصول على مهام المستخدم
     * @param {string} userId - معرف المستخدم
     * @returns {Array} قائمة المهام
     */
    getUserTasks(userId) {
        const tasks = this.getTasks();
        return tasks.filter(task => 
            task.assignedTo === userId || 
            task.createdBy === userId
        );
    }
    
    /**
     * تحديث بيانات المهمة
     * @param {string} id - معرف المهمة
     * @param {Object} updates - التحديثات
     * @returns {Object|null} المهمة المحدثة أو null
     */
    updateTask(id, updates) {
        const tasks = this.getTasks();
        const taskIndex = tasks.findIndex(task => task.id === id);
        
        if (taskIndex === -1) return null;
        
        const oldTask = tasks[taskIndex];
        tasks[taskIndex] = {
            ...oldTask,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        this.setTasks(tasks);
        
        // تحديث تقدم المشروع
        this.updateProjectProgress(oldTask.projectId);
        
        return tasks[taskIndex];
    }
    
    /**
     * حذف مهمة
     * @param {string} id - معرف المهمة
     * @returns {boolean} true إذا تم الحذف بنجاح
     */
    deleteTask(id) {
        const tasks = this.getTasks();
        const taskIndex = tasks.findIndex(task => task.id === id);
        
        if (taskIndex === -1) return false;
        
        const task = tasks[taskIndex];
        tasks.splice(taskIndex, 1);
        this.setTasks(tasks);
        
        // تحديث تقدم المشروع
        this.updateProjectProgress(task.projectId);
        
        return true;
    }
    
    /**
     * تحديث تقدم المشروع بناءً على المهام
     * @param {string} projectId - معرف المشروع
     */
    updateProjectProgress(projectId) {
        const projectTasks = this.getProjectTasks(projectId);
        
        if (projectTasks.length === 0) {
            this.updateProject(projectId, { progress: 0 });
            return;
        }
        
        const completedTasks = projectTasks.filter(task => task.status === 'completed');
        const progress = Math.round((completedTasks.length / projectTasks.length) * 100);
        
        this.updateProject(projectId, { progress });
    }
    
    /**
     * الحصول على المهام المتأخرة
     * @returns {Array} قائمة المهام المتأخرة
     */
    getOverdueTasks() {
        const tasks = this.getTasks();
        return tasks.filter(task => 
            task.status !== 'completed' && 
            DateUtils.isOverdue(task.endDate)
        );
    }
    
    /**
     * الحصول على المهام القادمة (خلال 7 أيام)
     * @returns {Array} قائمة المهام القادمة
     */
    getUpcomingTasks() {
        const tasks = this.getTasks();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        
        return tasks.filter(task => {
            if (task.status === 'completed') return false;
            
            const endDate = new Date(task.endDate);
            const today = new Date();
            
            return endDate >= today && endDate <= sevenDaysFromNow;
        });
    }
    
    // ===== إدارة الفرق =====
    
    /**
     * الحصول على جميع الفرق
     * @returns {Array} قائمة الفرق
     */
    getTeams() {
        return StorageUtils.get(this.keys.teams, []);
    }
    
    /**
     * حفظ قائمة الفرق
     * @param {Array} teams - قائمة الفرق
     */
    setTeams(teams) {
        StorageUtils.set(this.keys.teams, teams);
    }
    
    /**
     * إضافة عضو فريق
     * @param {Object} member - بيانات العضو
     * @returns {Object} العضو المضاف
     */
    addTeamMember(member) {
        const teams = this.getTeams();
        const currentUser = this.getCurrentUser();
        
        const newMember = {
            id: this.generateId(),
            email: member.email,
            role: member.role || 'viewer',
            projects: member.projects || [],
            invitedBy: currentUser.id,
            invitedAt: new Date().toISOString(),
            status: 'pending' // pending, accepted, declined
        };
        
        teams.push(newMember);
        this.setTeams(teams);
        return newMember;
    }
    
    // ===== إدارة الإعدادات =====
    
    /**
     * الحصول على الإعدادات
     * @returns {Object} الإعدادات
     */
    getSettings() {
        return StorageUtils.get(this.keys.settings, null);
    }
    
    /**
     * حفظ الإعدادات
     * @param {Object} settings - الإعدادات
     */
    setSettings(settings) {
        StorageUtils.set(this.keys.settings, settings);
    }
    
    /**
     * تحديث إعداد معين
     * @param {string} key - مفتاح الإعداد
     * @param {any} value - قيمة الإعداد
     */
    updateSetting(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        this.setSettings(settings);
    }
    
    // ===== إدارة التنبيهات =====
    
    /**
     * الحصول على التنبيهات
     * @returns {Array} قائمة التنبيهات
     */
    getNotifications() {
        return StorageUtils.get(this.keys.notifications, []);
    }
    
    /**
     * حفظ التنبيهات
     * @param {Array} notifications - قائمة التنبيهات
     */
    setNotifications(notifications) {
        StorageUtils.set(this.keys.notifications, notifications);
    }
    
    /**
     * إضافة تنبيه جديد
     * @param {Object} notification - بيانات التنبيه
     * @returns {Object} التنبيه المضاف
     */
    addNotification(notification) {
        const notifications = this.getNotifications();
        
        const newNotification = {
            id: this.generateId(),
            title: notification.title,
            message: notification.message,
            type: notification.type || 'info',
            userId: notification.userId,
            read: false,
            createdAt: new Date().toISOString()
        };
        
        notifications.unshift(newNotification); // إضافة في المقدمة
        
        // الاحتفاظ بآخر 100 تنبيه فقط
        if (notifications.length > 100) {
            notifications.splice(100);
        }
        
        this.setNotifications(notifications);
        return newNotification;
    }
    
    // ===== وظائف مساعدة =====
    
    /**
     * توليد معرف فريد
     * @returns {string} المعرف الفريد
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    /**
     * تصدير جميع البيانات
     * @returns {Object} جميع البيانات
     */
    exportData() {
        return {
            users: this.getUsers(),
            projects: this.getProjects(),
            tasks: this.getTasks(),
            teams: this.getTeams(),
            settings: this.getSettings(),
            notifications: this.getNotifications(),
            exportedAt: new Date().toISOString()
        };
    }
    
    /**
     * استيراد البيانات
     * @param {Object} data - البيانات المستوردة
     * @returns {boolean} true إذا تم الاستيراد بنجاح
     */
    importData(data) {
        try {
            if (data.users) this.setUsers(data.users);
            if (data.projects) this.setProjects(data.projects);
            if (data.tasks) this.setTasks(data.tasks);
            if (data.teams) this.setTeams(data.teams);
            if (data.settings) this.setSettings(data.settings);
            if (data.notifications) this.setNotifications(data.notifications);
            
            return true;
        } catch (error) {
            console.error('خطأ في استيراد البيانات:', error);
            return false;
        }
    }
    
    /**
     * مسح جميع البيانات
     */
    clearAllData() {
        Object.values(this.keys).forEach(key => {
            StorageUtils.remove(key);
        });
        this.initializeDefaultData();
    }
}

// إنشاء مثيل واحد من مدير التخزين
window.storage = new StorageManager();

