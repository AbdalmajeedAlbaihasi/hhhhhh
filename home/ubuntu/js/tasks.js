/**
 * نظام إدارة المهام
 * يتعامل مع إنشاء، تحديث، حذف وعرض المهام
 */

class TaskManager {
    constructor() {
        this.currentTask = null;
        this.tasks = [];
        this.filteredTasks = [];
        
        // ربط الأحداث
        this.bindEvents();
    }
    
    /**
     * ربط أحداث المهام
     */
    bindEvents() {
        // أزرار التصفية
        const filterProject = document.getElementById('filter-project');
        const filterStatus = document.getElementById('filter-status');
        
        if (filterProject) {
            filterProject.addEventListener('change', () => this.filterTasks());
        }
        
        if (filterStatus) {
            filterStatus.addEventListener('change', () => this.filterTasks());
        }
        
        // نموذج إضافة مهمة
        const addTaskForm = document.getElementById('add-task-form');
        if (addTaskForm) {
            addTaskForm.addEventListener('submit', (e) => this.handleAddTask(e));
        }
    }
    
    /**
     * تحميل وعرض المهام
     */
    loadTasks() {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;
        
        this.tasks = storage.getUserTasks(currentUser.id);
        this.filteredTasks = [...this.tasks];
        
        this.renderTasks();
        this.updateTaskStats();
        this.updateProjectFilters();
    }
    
    /**
     * عرض المهام في الواجهة
     */
    renderTasks() {
        const tasksList = document.getElementById('tasks-list');
        const upcomingTasksList = document.getElementById('upcoming-tasks-list');
        
        if (!tasksList) return;
        
        // مسح المحتوى السابق
        tasksList.innerHTML = '';
        if (upcomingTasksList) upcomingTasksList.innerHTML = '';
        
        if (this.filteredTasks.length === 0) {
            tasksList.innerHTML = this.getEmptyTasksHTML();
            return;
        }
        
        // ترتيب المهام حسب تاريخ النهاية
        const sortedTasks = this.filteredTasks.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
        
        // عرض المهام
        sortedTasks.forEach(task => {
            const taskItem = this.createTaskItem(task);
            tasksList.appendChild(taskItem);
        });
        
        // عرض المهام القادمة في لوحة التحكم
        if (upcomingTasksList) {
            const upcomingTasks = storage.getUpcomingTasks().slice(0, 5);
            upcomingTasks.forEach(task => {
                const taskItem = this.createTaskItem(task, true);
                upcomingTasksList.appendChild(taskItem);
            });
        }
    }
    
    /**
     * إنشاء عنصر مهمة
     * @param {Object} task - بيانات المهمة
     * @param {boolean} isCompact - عرض مضغوط
     * @returns {HTMLElement} عنصر المهمة
     */
    createTaskItem(task, isCompact = false) {
        const item = DOMUtils.createElement('div', {
            className: 'task-item',
            dataset: { taskId: task.id }
        });
        
        // الحصول على بيانات المشروع
        const project = storage.findProjectById(task.projectId);
        const projectName = project ? project.name : 'مشروع محذوف';
        
        // تحديد حالة المهمة
        const taskStatus = this.getTaskStatus(task);
        const statusClass = `status-${taskStatus}`;
        const statusText = this.getStatusText(taskStatus);
        
        // تنسيق التواريخ
        const startDate = DateUtils.formatDate(task.startDate);
        const endDate = DateUtils.formatDate(task.endDate);
        
        // التحقق من قرب الموعد النهائي
        const isDueSoon = DateUtils.isDueSoon(task.endDate);
        const isOverdue = DateUtils.isOverdue(task.endDate) && taskStatus !== 'completed';
        
        item.innerHTML = `
            <div class="task-header">
                <div class="task-info">
                    <h4 class="task-title">${task.name}</h4>
                    <p class="task-project">
                        <i class="fas fa-folder"></i>
                        ${projectName}
                    </p>
                </div>
                <div class="task-status-container">
                    <span class="task-status ${statusClass}">${statusText}</span>
                    <span class="priority-badge priority-${task.priority}">
                        ${this.getPriorityText(task.priority)}
                    </span>
                </div>
            </div>
            
            ${task.description ? `
                <div class="task-description">
                    ${TextUtils.truncate(task.description, isCompact ? 80 : 150)}
                </div>
            ` : ''}
            
            <div class="task-meta">
                <div class="task-dates">
                    <span class="task-date">
                        <i class="fas fa-calendar-start"></i>
                        البداية: ${startDate}
                    </span>
                    <span class="task-date ${isOverdue ? 'overdue' : isDueSoon ? 'due-soon' : ''}">
                        <i class="fas fa-calendar-end"></i>
                        النهاية: ${endDate}
                        ${isOverdue ? '<i class="fas fa-exclamation-triangle"></i>' : ''}
                        ${isDueSoon && !isOverdue ? '<i class="fas fa-clock"></i>' : ''}
                    </span>
                </div>
                
                ${!isCompact ? this.getTaskActionsHTML(task) : ''}
            </div>
        `;
        
        // ربط الأحداث
        this.bindTaskItemEvents(item, task);
        
        return item;
    }
    
    /**
     * ربط أحداث عنصر المهمة
     * @param {HTMLElement} item - عنصر المهمة
     * @param {Object} task - بيانات المهمة
     */
    bindTaskItemEvents(item, task) {
        // النقر على المهمة لعرض التفاصيل
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.task-actions')) {
                this.showTaskDetails(task);
            }
        });
        
        // أزرار الإجراءات
        const editBtn = item.querySelector('.edit-task-btn');
        const deleteBtn = item.querySelector('.delete-task-btn');
        const statusBtns = item.querySelectorAll('.status-btn');
        
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEditTaskModal(task);
            });
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmDeleteTask(task);
            });
        }
        
        statusBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newStatus = btn.dataset.status;
                this.updateTaskStatus(task.id, newStatus);
            });
        });
    }
    
    /**
     * الحصول على HTML أزرار إجراءات المهمة
     * @param {Object} task - بيانات المهمة
     * @returns {string} HTML الأزرار
     */
    getTaskActionsHTML(task) {
        const currentUser = auth.getCurrentUser();
        const canEdit = task.createdBy === currentUser.id || task.assignedTo === currentUser.id || auth.hasPermission('edit');
        const canDelete = task.createdBy === currentUser.id || auth.hasPermission('admin');
        
        const taskStatus = this.getTaskStatus(task);
        
        return `
            <div class="task-actions">
                <div class="status-actions">
                    ${taskStatus !== 'completed' ? `
                        <button class="btn btn-sm btn-success status-btn" data-status="completed" title="تم الإنجاز">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    ${taskStatus !== 'in-progress' ? `
                        <button class="btn btn-sm btn-info status-btn" data-status="in-progress" title="جاري العمل">
                            <i class="fas fa-play"></i>
                        </button>
                    ` : ''}
                    ${taskStatus !== 'pending' ? `
                        <button class="btn btn-sm btn-secondary status-btn" data-status="pending" title="في الانتظار">
                            <i class="fas fa-pause"></i>
                        </button>
                    ` : ''}
                </div>
                
                <div class="edit-actions">
                    ${canEdit ? `
                        <button class="btn btn-sm btn-secondary edit-task-btn" title="تحرير">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                    ${canDelete ? `
                        <button class="btn btn-sm btn-error delete-task-btn" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * الحصول على HTML للحالة الفارغة
     * @returns {string} HTML الحالة الفارغة
     */
    getEmptyTasksHTML() {
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-tasks"></i>
                </div>
                <h3>لا توجد مهام</h3>
                <p>ابدأ بإضافة مهام جديدة لتنظيم عملك</p>
                <button class="btn btn-primary" onclick="tasks.showAddTaskModal()">
                    <i class="fas fa-plus"></i>
                    إضافة مهمة جديدة
                </button>
            </div>
        `;
    }
    
    /**
     * إظهار نافذة إضافة مهمة
     */
    showAddTaskModal() {
        const modal = document.getElementById('add-task-modal');
        const form = document.getElementById('add-task-form');
        
        if (modal && form) {
            // مسح النموذج
            form.reset();
            
            // تحديث قائمة المشاريع
            this.updateTaskProjectOptions();
            
            // تعيين التواريخ الافتراضية
            const today = new Date();
            const nextWeek = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
            
            document.getElementById('task-start-date').value = DateUtils.formatDateForInput(today);
            document.getElementById('task-end-date').value = DateUtils.formatDateForInput(nextWeek);
            
            // تعيين المشروع الحالي إذا كان متاحاً
            const currentProject = projects.getCurrentProject();
            if (currentProject) {
                document.getElementById('task-project').value = currentProject.id;
            }
            
            projects.showModal('add-task-modal');
        }
    }
    
    /**
     * إظهار نافذة تحرير مهمة
     * @param {Object} task - بيانات المهمة
     */
    showEditTaskModal(task) {
        const modal = document.getElementById('add-task-modal');
        const form = document.getElementById('add-task-form');
        
        if (modal && form) {
            // تحديث قائمة المشاريع
            this.updateTaskProjectOptions();
            
            // ملء النموذج ببيانات المهمة
            document.getElementById('task-project').value = task.projectId;
            document.getElementById('task-name').value = task.name;
            document.getElementById('task-description').value = task.description || '';
            document.getElementById('task-start-date').value = DateUtils.formatDateForInput(task.startDate);
            document.getElementById('task-end-date').value = DateUtils.formatDateForInput(task.endDate);
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('task-status').value = task.status;
            
            // تغيير عنوان النافذة
            modal.querySelector('.modal-header h3').textContent = 'تحرير المهمة';
            modal.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> حفظ التغييرات';
            
            // حفظ معرف المهمة للتحديث
            form.dataset.editingTaskId = task.id;
            
            projects.showModal('add-task-modal');
        }
    }
    
    /**
     * معالج إضافة/تحديث مهمة
     * @param {Event} event - حدث النموذج
     */
    async handleAddTask(event) {
        event.preventDefault();
        
        const form = event.target;
        
        const taskData = {
            projectId: document.getElementById('task-project').value,
            name: document.getElementById('task-name').value.trim(),
            description: document.getElementById('task-description').value.trim(),
            startDate: document.getElementById('task-start-date').value,
            endDate: document.getElementById('task-end-date').value,
            priority: document.getElementById('task-priority').value,
            status: document.getElementById('task-status').value
        };
        
        // التحقق من صحة البيانات
        if (!this.validateTaskForm(taskData)) {
            return;
        }
        
        try {
            // إظهار حالة التحميل
            projects.setFormLoading(form, true);
            
            const editingTaskId = form.dataset.editingTaskId;
            
            if (editingTaskId) {
                // تحديث مهمة موجودة
                const updatedTask = storage.updateTask(editingTaskId, taskData);
                if (updatedTask) {
                    notifications.show('تم التحديث', 'تم تحديث المهمة بنجاح', 'success');
                    this.loadTasks();
                    projects.hideModal('add-task-modal');
                    
                    // تحديث مدير المشاريع
                    if (window.projects) {
                        window.projects.loadProjects();
                    }
                }
            } else {
                // إضافة مهمة جديدة
                const newTask = storage.addTask(taskData);
                if (newTask) {
                    notifications.show('تم الإنشاء', 'تم إنشاء المهمة بنجاح', 'success');
                    this.loadTasks();
                    projects.hideModal('add-task-modal');
                    
                    // تحديث مدير المشاريع
                    if (window.projects) {
                        window.projects.loadProjects();
                    }
                }
            }
            
        } catch (error) {
            console.error('خطأ في حفظ المهمة:', error);
            notifications.show('خطأ', 'حدث خطأ أثناء حفظ المهمة', 'error');
        } finally {
            projects.setFormLoading(form, false);
            
            // إعادة تعيين النموذج
            delete form.dataset.editingTaskId;
            const modal = document.getElementById('add-task-modal');
            modal.querySelector('.modal-header h3').textContent = 'إضافة مهمة جديدة';
            modal.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-plus"></i> إضافة المهمة';
        }
    }
    
    /**
     * التحقق من صحة بيانات المهمة
     * @param {Object} taskData - بيانات المهمة
     * @returns {boolean} true إذا كانت البيانات صحيحة
     */
    validateTaskForm(taskData) {
        const errors = [];
        
        if (!taskData.projectId) {
            errors.push('يجب اختيار المشروع');
        }
        
        if (!taskData.name || taskData.name.length < 3) {
            errors.push('اسم المهمة يجب أن يكون 3 أحرف على الأقل');
        }
        
        if (!taskData.startDate) {
            errors.push('تاريخ البداية مطلوب');
        }
        
        if (!taskData.endDate) {
            errors.push('تاريخ النهاية مطلوب');
        }
        
        const dateValidation = ValidationUtils.validateDateRange(taskData.startDate, taskData.endDate);
        if (!dateValidation.isValid) {
            errors.push(...dateValidation.errors);
        }
        
        // التحقق من أن المهمة ضمن نطاق المشروع
        if (taskData.projectId) {
            const project = storage.findProjectById(taskData.projectId);
            if (project) {
                const projectStart = new Date(project.startDate);
                const projectEnd = new Date(project.endDate);
                const taskStart = new Date(taskData.startDate);
                const taskEnd = new Date(taskData.endDate);
                
                if (taskStart < projectStart || taskEnd > projectEnd) {
                    errors.push('تواريخ المهمة يجب أن تكون ضمن نطاق المشروع');
                }
            }
        }
        
        if (errors.length > 0) {
            notifications.show('خطأ في البيانات', errors.join('<br>'), 'error');
            return false;
        }
        
        return true;
    }
    
    /**
     * تحديث حالة المهمة
     * @param {string} taskId - معرف المهمة
     * @param {string} newStatus - الحالة الجديدة
     */
    updateTaskStatus(taskId, newStatus) {
        const updatedTask = storage.updateTask(taskId, { status: newStatus });
        
        if (updatedTask) {
            const statusText = this.getStatusText(newStatus);
            notifications.show('تم التحديث', `تم تغيير حالة المهمة إلى: ${statusText}`, 'success');
            
            this.loadTasks();
            
            // تحديث مدير المشاريع
            if (window.projects) {
                window.projects.loadProjects();
            }
        }
    }
    
    /**
     * تأكيد حذف المهمة
     * @param {Object} task - بيانات المهمة
     */
    confirmDeleteTask(task) {
        const confirmed = confirm(`هل أنت متأكد من حذف المهمة "${task.name}"؟`);
        
        if (confirmed) {
            this.deleteTask(task);
        }
    }
    
    /**
     * حذف المهمة
     * @param {Object} task - بيانات المهمة
     */
    deleteTask(task) {
        const success = storage.deleteTask(task.id);
        
        if (success) {
            notifications.show('تم الحذف', 'تم حذف المهمة بنجاح', 'success');
            this.loadTasks();
            
            // تحديث مدير المشاريع
            if (window.projects) {
                window.projects.loadProjects();
            }
        } else {
            notifications.show('خطأ', 'حدث خطأ أثناء حذف المهمة', 'error');
        }
    }
    
    /**
     * عرض تفاصيل المهمة
     * @param {Object} task - بيانات المهمة
     */
    showTaskDetails(task) {
        this.currentTask = task;
        
        // يمكن إضافة نافذة منبثقة لعرض تفاصيل المهمة
        console.log('عرض تفاصيل المهمة:', task);
    }
    
    /**
     * تصفية المهام
     */
    filterTasks() {
        const projectFilter = document.getElementById('filter-project');
        const statusFilter = document.getElementById('filter-status');
        
        let filtered = [...this.tasks];
        
        // تصفية حسب المشروع
        if (projectFilter && projectFilter.value) {
            filtered = filtered.filter(task => task.projectId === projectFilter.value);
        }
        
        // تصفية حسب الحالة
        if (statusFilter && statusFilter.value) {
            const statusValue = statusFilter.value;
            filtered = filtered.filter(task => {
                const taskStatus = this.getTaskStatus(task);
                return taskStatus === statusValue;
            });
        }
        
        this.filteredTasks = filtered;
        this.renderTasks();
    }
    
    /**
     * تحديث خيارات تصفية المشاريع
     */
    updateProjectFilters() {
        const projectFilter = document.getElementById('filter-project');
        const ganttProjectFilter = document.getElementById('gantt-project-filter');
        
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;
        
        const userProjects = storage.getUserProjects(currentUser.id);
        
        [projectFilter, ganttProjectFilter].forEach(filter => {
            if (filter) {
                // مسح الخيارات السابقة (عدا الخيار الأول)
                while (filter.children.length > 1) {
                    filter.removeChild(filter.lastChild);
                }
                
                // إضافة المشاريع
                userProjects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = project.id;
                    option.textContent = project.name;
                    filter.appendChild(option);
                });
            }
        });
    }
    
    /**
     * تحديث خيارات المشاريع في نموذج المهمة
     */
    updateTaskProjectOptions() {
        const taskProjectSelect = document.getElementById('task-project');
        
        if (taskProjectSelect) {
            const currentUser = auth.getCurrentUser();
            if (!currentUser) return;
            
            const userProjects = storage.getUserProjects(currentUser.id);
            
            // مسح الخيارات السابقة (عدا الخيار الأول)
            while (taskProjectSelect.children.length > 1) {
                taskProjectSelect.removeChild(taskProjectSelect.lastChild);
            }
            
            // إضافة المشاريع
            userProjects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                taskProjectSelect.appendChild(option);
            });
        }
    }
    
    /**
     * تحديث إحصائيات المهام
     */
    updateTaskStats() {
        const totalTasksElement = document.getElementById('total-tasks');
        const completedTasksElement = document.getElementById('completed-tasks');
        const overdueTasksElement = document.getElementById('overdue-tasks');
        
        const completedTasks = this.tasks.filter(task => task.status === 'completed');
        const overdueTasks = storage.getOverdueTasks();
        
        if (totalTasksElement) {
            totalTasksElement.textContent = this.tasks.length;
        }
        
        if (completedTasksElement) {
            completedTasksElement.textContent = completedTasks.length;
        }
        
        if (overdueTasksElement) {
            overdueTasksElement.textContent = overdueTasks.length;
        }
    }
    
    /**
     * الحصول على حالة المهمة
     * @param {Object} task - بيانات المهمة
     * @returns {string} حالة المهمة
     */
    getTaskStatus(task) {
        if (task.status === 'completed') {
            return 'completed';
        }
        
        if (DateUtils.isOverdue(task.endDate)) {
            return 'overdue';
        }
        
        return task.status || 'pending';
    }
    
    /**
     * الحصول على نص الحالة
     * @param {string} status - الحالة
     * @returns {string} نص الحالة
     */
    getStatusText(status) {
        const statuses = {
            pending: 'قيد الانتظار',
            'in-progress': 'جاري',
            completed: 'مكتملة',
            overdue: 'متأخرة'
        };
        return statuses[status] || 'قيد الانتظار';
    }
    
    /**
     * الحصول على نص الأولوية
     * @param {string} priority - الأولوية
     * @returns {string} نص الأولوية
     */
    getPriorityText(priority) {
        const priorities = {
            low: 'منخفضة',
            medium: 'متوسطة',
            high: 'عالية'
        };
        return priorities[priority] || 'متوسطة';
    }
    
    /**
     * الحصول على المهمة الحالية
     * @returns {Object|null} المهمة الحالية
     */
    getCurrentTask() {
        return this.currentTask;
    }
    
    /**
     * الحصول على جميع المهام
     * @returns {Array} قائمة المهام
     */
    getTasks() {
        return this.tasks;
    }
    
    /**
     * البحث في المهام
     * @param {string} query - نص البحث
     * @returns {Array} نتائج البحث
     */
    searchTasks(query) {
        if (!query) return this.tasks;
        
        const searchTerm = query.toLowerCase();
        return this.tasks.filter(task => 
            task.name.toLowerCase().includes(searchTerm) ||
            task.description.toLowerCase().includes(searchTerm)
        );
    }
    
    /**
     * الحصول على مهام المشروع
     * @param {string} projectId - معرف المشروع
     * @returns {Array} مهام المشروع
     */
    getProjectTasks(projectId) {
        return this.tasks.filter(task => task.projectId === projectId);
    }
}

// إنشاء مثيل واحد من مدير المهام
window.tasks = new TaskManager();

