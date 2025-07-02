/**
 * نظام إدارة المشاريع
 * يتعامل مع إنشاء، تحديث، حذف وعرض المشاريع
 */

class ProjectManager {
    constructor() {
        this.currentProject = null;
        this.projects = [];
        
        // ربط الأحداث
        this.bindEvents();
    }
    
    /**
     * ربط أحداث المشاريع
     */
    bindEvents() {
        // زر إضافة مشروع جديد
        const addProjectBtn = document.getElementById('add-project-btn');
        if (addProjectBtn) {
            addProjectBtn.addEventListener('click', () => this.showAddProjectModal());
        }
        
        // نموذج إضافة مشروع
        const addProjectForm = document.getElementById('add-project-form');
        if (addProjectForm) {
            addProjectForm.addEventListener('submit', (e) => this.handleAddProject(e));
        }
        
        // أزرار إغلاق النوافذ المنبثقة
        const closeModalBtns = document.querySelectorAll('.close-modal');
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = btn.getAttribute('data-modal');
                this.hideModal(modalId);
            });
        });
        
        // إغلاق النوافذ المنبثقة عند النقر خارجها
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });
        
        // مفاتيح الاختصار
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
    }
    
    /**
     * تحميل وعرض المشاريع
     */
    loadProjects() {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;
        
        this.projects = storage.getUserProjects(currentUser.id);
        this.renderProjects();
        this.updateProjectStats();
    }
    
    /**
     * عرض المشاريع في الواجهة
     */
    renderProjects() {
        const projectsGrid = document.getElementById('projects-grid');
        const recentProjectsList = document.getElementById('recent-projects-list');
        
        if (!projectsGrid) return;
        
        // مسح المحتوى السابق
        projectsGrid.innerHTML = '';
        if (recentProjectsList) recentProjectsList.innerHTML = '';
        
        if (this.projects.length === 0) {
            projectsGrid.innerHTML = this.getEmptyProjectsHTML();
            return;
        }
        
        // عرض المشاريع
        this.projects.forEach(project => {
            const projectCard = this.createProjectCard(project);
            projectsGrid.appendChild(projectCard);
            
            // إضافة إلى المشاريع الحديثة (أول 3 مشاريع)
            if (recentProjectsList && this.projects.indexOf(project) < 3) {
                const recentCard = this.createProjectCard(project, true);
                recentProjectsList.appendChild(recentCard);
            }
        });
    }
    
    /**
     * إنشاء بطاقة مشروع
     * @param {Object} project - بيانات المشروع
     * @param {boolean} isCompact - عرض مضغوط
     * @returns {HTMLElement} بطاقة المشروع
     */
    createProjectCard(project, isCompact = false) {
        const card = DOMUtils.createElement('div', {
            className: 'project-card',
            dataset: { projectId: project.id }
        });
        
        // حساب التقدم
        const progress = project.progress || 0;
        const progressColor = this.getProgressColor(progress);
        
        // تنسيق التواريخ
        const startDate = DateUtils.formatDate(project.startDate);
        const endDate = DateUtils.formatDate(project.endDate);
        
        // حالة المشروع
        const isOverdue = DateUtils.isOverdue(project.endDate) && progress < 100;
        const statusClass = isOverdue ? 'overdue' : '';
        
        card.innerHTML = `
            <div class="project-header" style="background: ${project.color || '#3b82f6'}">
                <h3 class="project-title">${project.name}</h3>
                <p class="project-description">${TextUtils.truncate(project.description, isCompact ? 50 : 100)}</p>
            </div>
            
            <div class="project-body">
                <div class="project-meta">
                    <div class="project-dates ${statusClass}">
                        <small><i class="fas fa-calendar-start"></i> ${startDate}</small>
                        <small><i class="fas fa-calendar-end"></i> ${endDate}</small>
                    </div>
                    <span class="priority-badge priority-${project.priority}">
                        ${this.getPriorityText(project.priority)}
                    </span>
                </div>
                
                <div class="project-progress">
                    <div class="progress-label">
                        <span>التقدم</span>
                        <span>${progress}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%; background: ${progressColor}"></div>
                    </div>
                </div>
                
                ${!isCompact ? this.getProjectActionsHTML(project) : ''}
            </div>
        `;
        
        // ربط الأحداث
        this.bindProjectCardEvents(card, project);
        
        return card;
    }
    
    /**
     * ربط أحداث بطاقة المشروع
     * @param {HTMLElement} card - بطاقة المشروع
     * @param {Object} project - بيانات المشروع
     */
    bindProjectCardEvents(card, project) {
        // النقر على البطاقة لعرض التفاصيل
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.project-actions')) {
                this.showProjectDetails(project);
            }
        });
        
        // أزرار الإجراءات
        const editBtn = card.querySelector('.edit-project-btn');
        const deleteBtn = card.querySelector('.delete-project-btn');
        const viewTasksBtn = card.querySelector('.view-tasks-btn');
        
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEditProjectModal(project);
            });
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmDeleteProject(project);
            });
        }
        
        if (viewTasksBtn) {
            viewTasksBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showProjectTasks(project);
            });
        }
    }
    
    /**
     * الحصول على HTML أزرار إجراءات المشروع
     * @param {Object} project - بيانات المشروع
     * @returns {string} HTML الأزرار
     */
    getProjectActionsHTML(project) {
        const currentUser = auth.getCurrentUser();
        const canEdit = project.ownerId === currentUser.id || auth.hasPermission('edit');
        const canDelete = project.ownerId === currentUser.id || auth.hasPermission('admin');
        
        return `
            <div class="project-actions">
                <button class="btn btn-sm btn-secondary view-tasks-btn" title="عرض المهام">
                    <i class="fas fa-tasks"></i>
                </button>
                ${canEdit ? `
                    <button class="btn btn-sm btn-secondary edit-project-btn" title="تحرير">
                        <i class="fas fa-edit"></i>
                    </button>
                ` : ''}
                ${canDelete ? `
                    <button class="btn btn-sm btn-error delete-project-btn" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * الحصول على HTML للحالة الفارغة
     * @returns {string} HTML الحالة الفارغة
     */
    getEmptyProjectsHTML() {
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-folder-plus"></i>
                </div>
                <h3>لا توجد مشاريع بعد</h3>
                <p>ابدأ بإنشاء مشروعك الأول لتنظيم مهامك</p>
                <button class="btn btn-primary" onclick="projects.showAddProjectModal()">
                    <i class="fas fa-plus"></i>
                    إنشاء مشروع جديد
                </button>
            </div>
        `;
    }
    
    /**
     * إظهار نافذة إضافة مشروع
     */
    showAddProjectModal() {
        const modal = document.getElementById('add-project-modal');
        const form = document.getElementById('add-project-form');
        
        if (modal && form) {
            // مسح النموذج
            form.reset();
            
            // تعيين التواريخ الافتراضية
            const today = new Date();
            const nextMonth = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
            
            document.getElementById('project-start-date').value = DateUtils.formatDateForInput(today);
            document.getElementById('project-end-date').value = DateUtils.formatDateForInput(nextMonth);
            
            this.showModal('add-project-modal');
        }
    }
    
    /**
     * إظهار نافذة تحرير مشروع
     * @param {Object} project - بيانات المشروع
     */
    showEditProjectModal(project) {
        const modal = document.getElementById('add-project-modal');
        const form = document.getElementById('add-project-form');
        
        if (modal && form) {
            // ملء النموذج ببيانات المشروع
            document.getElementById('project-name').value = project.name;
            document.getElementById('project-description').value = project.description || '';
            document.getElementById('project-start-date').value = DateUtils.formatDateForInput(project.startDate);
            document.getElementById('project-end-date').value = DateUtils.formatDateForInput(project.endDate);
            document.getElementById('project-priority').value = project.priority;
            
            // تغيير عنوان النافذة
            modal.querySelector('.modal-header h3').textContent = 'تحرير المشروع';
            modal.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> حفظ التغييرات';
            
            // حفظ معرف المشروع للتحديث
            form.dataset.editingProjectId = project.id;
            
            this.showModal('add-project-modal');
        }
    }
    
    /**
     * معالج إضافة/تحديث مشروع
     * @param {Event} event - حدث النموذج
     */
    async handleAddProject(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const projectData = {
            name: document.getElementById('project-name').value.trim(),
            description: document.getElementById('project-description').value.trim(),
            startDate: document.getElementById('project-start-date').value,
            endDate: document.getElementById('project-end-date').value,
            priority: document.getElementById('project-priority').value
        };
        
        // التحقق من صحة البيانات
        if (!this.validateProjectForm(projectData)) {
            return;
        }
        
        try {
            // إظهار حالة التحميل
            this.setFormLoading(form, true);
            
            const editingProjectId = form.dataset.editingProjectId;
            
            if (editingProjectId) {
                // تحديث مشروع موجود
                const updatedProject = storage.updateProject(editingProjectId, projectData);
                if (updatedProject) {
                    notifications.show('تم التحديث', 'تم تحديث المشروع بنجاح', 'success');
                    this.loadProjects();
                    this.hideModal('add-project-modal');
                }
            } else {
                // إضافة مشروع جديد
                const newProject = storage.addProject(projectData);
                if (newProject) {
                    notifications.show('تم الإنشاء', 'تم إنشاء المشروع بنجاح', 'success');
                    this.loadProjects();
                    this.hideModal('add-project-modal');
                }
            }
            
        } catch (error) {
            console.error('خطأ في حفظ المشروع:', error);
            notifications.show('خطأ', 'حدث خطأ أثناء حفظ المشروع', 'error');
        } finally {
            this.setFormLoading(form, false);
            
            // إعادة تعيين النموذج
            delete form.dataset.editingProjectId;
            const modal = document.getElementById('add-project-modal');
            modal.querySelector('.modal-header h3').textContent = 'إضافة مشروع جديد';
            modal.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-plus"></i> إضافة المشروع';
        }
    }
    
    /**
     * التحقق من صحة بيانات المشروع
     * @param {Object} projectData - بيانات المشروع
     * @returns {boolean} true إذا كانت البيانات صحيحة
     */
    validateProjectForm(projectData) {
        const errors = [];
        
        if (!projectData.name || projectData.name.length < 3) {
            errors.push('اسم المشروع يجب أن يكون 3 أحرف على الأقل');
        }
        
        if (!projectData.startDate) {
            errors.push('تاريخ البداية مطلوب');
        }
        
        if (!projectData.endDate) {
            errors.push('تاريخ النهاية مطلوب');
        }
        
        const dateValidation = ValidationUtils.validateDateRange(projectData.startDate, projectData.endDate);
        if (!dateValidation.isValid) {
            errors.push(...dateValidation.errors);
        }
        
        if (errors.length > 0) {
            notifications.show('خطأ في البيانات', errors.join('<br>'), 'error');
            return false;
        }
        
        return true;
    }
    
    /**
     * تأكيد حذف المشروع
     * @param {Object} project - بيانات المشروع
     */
    confirmDeleteProject(project) {
        const confirmed = confirm(`هل أنت متأكد من حذف المشروع "${project.name}"؟\n\nسيتم حذف جميع المهام المرتبطة بهذا المشروع أيضاً.`);
        
        if (confirmed) {
            this.deleteProject(project);
        }
    }
    
    /**
     * حذف المشروع
     * @param {Object} project - بيانات المشروع
     */
    deleteProject(project) {
        const success = storage.deleteProject(project.id);
        
        if (success) {
            notifications.show('تم الحذف', 'تم حذف المشروع بنجاح', 'success');
            this.loadProjects();
            
            // إشعار مدير المهام بالتحديث
            if (window.tasks) {
                window.tasks.loadTasks();
            }
        } else {
            notifications.show('خطأ', 'حدث خطأ أثناء حذف المشروع', 'error');
        }
    }
    
    /**
     * عرض تفاصيل المشروع
     * @param {Object} project - بيانات المشروع
     */
    showProjectDetails(project) {
        this.currentProject = project;
        
        // الانتقال إلى عرض المهام مع تصفية المشروع
        if (window.app) {
            window.app.showView('tasks');
            
            // تطبيق تصفية المشروع
            const projectFilter = document.getElementById('filter-project');
            if (projectFilter) {
                projectFilter.value = project.id;
                
                // تحديث قائمة المهام
                if (window.tasks) {
                    window.tasks.filterTasks();
                }
            }
        }
    }
    
    /**
     * عرض مهام المشروع
     * @param {Object} project - بيانات المشروع
     */
    showProjectTasks(project) {
        this.showProjectDetails(project);
    }
    
    /**
     * تحديث إحصائيات المشاريع
     */
    updateProjectStats() {
        const totalProjectsElement = document.getElementById('total-projects');
        
        if (totalProjectsElement) {
            totalProjectsElement.textContent = this.projects.length;
        }
    }
    
    /**
     * الحصول على لون التقدم
     * @param {number} progress - نسبة التقدم
     * @returns {string} لون التقدم
     */
    getProgressColor(progress) {
        if (progress >= 80) return '#10b981'; // أخضر
        if (progress >= 50) return '#f59e0b'; // أصفر
        if (progress >= 20) return '#06b6d4'; // أزرق
        return '#ef4444'; // أحمر
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
     * إظهار النافذة المنبثقة
     * @param {string} modalId - معرف النافذة
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    /**
     * إخفاء النافذة المنبثقة
     * @param {string} modalId - معرف النافذة
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    /**
     * إخفاء جميع النوافذ المنبثقة
     */
    hideAllModals() {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
    
    /**
     * تعيين حالة التحميل للنموذج
     * @param {HTMLFormElement} form - النموذج
     * @param {boolean} loading - حالة التحميل
     */
    setFormLoading(form, loading) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const inputs = form.querySelectorAll('input, textarea, select');
        
        if (loading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
            inputs.forEach(input => input.disabled = true);
        } else {
            submitBtn.disabled = false;
            inputs.forEach(input => input.disabled = false);
        }
    }
    
    /**
     * الحصول على المشروع الحالي
     * @returns {Object|null} المشروع الحالي
     */
    getCurrentProject() {
        return this.currentProject;
    }
    
    /**
     * الحصول على جميع المشاريع
     * @returns {Array} قائمة المشاريع
     */
    getProjects() {
        return this.projects;
    }
    
    /**
     * البحث في المشاريع
     * @param {string} query - نص البحث
     * @returns {Array} نتائج البحث
     */
    searchProjects(query) {
        if (!query) return this.projects;
        
        const searchTerm = query.toLowerCase();
        return this.projects.filter(project => 
            project.name.toLowerCase().includes(searchTerm) ||
            project.description.toLowerCase().includes(searchTerm)
        );
    }
    
    /**
     * تصفية المشاريع حسب الحالة
     * @param {string} status - الحالة
     * @returns {Array} المشاريع المصفاة
     */
    filterProjectsByStatus(status) {
        if (!status) return this.projects;
        
        return this.projects.filter(project => {
            switch (status) {
                case 'active':
                    return project.progress < 100 && !DateUtils.isOverdue(project.endDate);
                case 'completed':
                    return project.progress >= 100;
                case 'overdue':
                    return project.progress < 100 && DateUtils.isOverdue(project.endDate);
                default:
                    return true;
            }
        });
    }
}

// إنشاء مثيل واحد من مدير المشاريع
window.projects = new ProjectManager();

