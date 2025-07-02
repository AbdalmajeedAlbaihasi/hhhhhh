/**
 * نظام مخطط جانت
 * يتعامل مع عرض المهام والمشاريع في مخطط جانت تفاعلي
 */

class GanttManager {
    constructor() {
        this.ganttChart = null;
        this.isInitialized = false;
        this.currentProjectFilter = null;
        
        // ربط الأحداث
        this.bindEvents();
    }
    
    /**
     * ربط أحداث مخطط جانت
     */
    bindEvents() {
        // تصفية المشاريع
        const ganttProjectFilter = document.getElementById('gantt-project-filter');
        if (ganttProjectFilter) {
            ganttProjectFilter.addEventListener('change', (e) => {
                this.currentProjectFilter = e.target.value || null;
                this.loadGanttData();
            });
        }
    }
    
    /**
     * تهيئة مخطط جانت
     */
    initializeGantt() {
        if (this.isInitialized || !window.gantt) return;
        
        try {
            // إعداد مخطط جانت
            this.configureGantt();
            
            // تهيئة المخطط
            gantt.init("gantt_here");
            
            this.isInitialized = true;
            
            // تحميل البيانات
            this.loadGanttData();
            
        } catch (error) {
            console.error('خطأ في تهيئة مخطط جانت:', error);
            this.showGanttError();
        }
    }
    
    /**
     * إعداد مخطط جانت
     */
    configureGantt() {
        if (!window.gantt) return;
        
        // إعداد اللغة العربية
        gantt.config.rtl = true;
        gantt.config.date_format = "%Y-%m-%d";
        gantt.config.xml_date = "%Y-%m-%d";
        
        // إعداد الأعمدة
        gantt.config.columns = [
            {
                name: "text",
                label: "اسم المهمة",
                width: 200,
                tree: true
            },
            {
                name: "start_date",
                label: "تاريخ البداية",
                width: 100,
                align: "center"
            },
            {
                name: "duration",
                label: "المدة",
                width: 60,
                align: "center"
            },
            {
                name: "progress",
                label: "التقدم",
                width: 80,
                align: "center",
                template: function(obj) {
                    return Math.round(obj.progress * 100) + "%";
                }
            }
        ];
        
        // إعداد المقياس الزمني
        gantt.config.scales = [
            {unit: "month", step: 1, format: "%F %Y"},
            {unit: "week", step: 1, format: "الأسبوع #%W"}
        ];
        
        // إعداد الألوان والأنماط
        gantt.config.task_height = 30;
        gantt.config.row_height = 40;
        gantt.config.bar_height = 24;
        
        // إعداد الأحداث
        this.setupGanttEvents();
        
        // إعداد القوالب
        this.setupGanttTemplates();
    }
    
    /**
     * إعداد أحداث مخطط جانت
     */
    setupGanttEvents() {
        if (!window.gantt) return;
        
        // حدث تحديث المهمة
        gantt.attachEvent("onAfterTaskUpdate", (id, task) => {
            this.handleTaskUpdate(id, task);
        });
        
        // حدث إنشاء مهمة جديدة
        gantt.attachEvent("onAfterTaskAdd", (id, task) => {
            this.handleTaskAdd(id, task);
        });
        
        // حدث حذف مهمة
        gantt.attachEvent("onAfterTaskDelete", (id, task) => {
            this.handleTaskDelete(id, task);
        });
        
        // حدث النقر على المهمة
        gantt.attachEvent("onTaskClick", (id, e) => {
            this.handleTaskClick(id, e);
            return true;
        });
        
        // حدث النقر المزدوج على المهمة
        gantt.attachEvent("onTaskDblClick", (id, e) => {
            this.handleTaskDoubleClick(id, e);
            return false; // منع النافذة الافتراضية
        });
    }
    
    /**
     * إعداد قوالب مخطط جانت
     */
    setupGanttTemplates() {
        if (!window.gantt) return;
        
        // قالب نص المهمة
        gantt.templates.task_text = function(start, end, task) {
            return task.text;
        };
        
        // قالب تلميح المهمة
        gantt.templates.tooltip_text = function(start, end, task) {
            const startDate = DateUtils.formatDate(start);
            const endDate = DateUtils.formatDate(end);
            const progress = Math.round(task.progress * 100);
            
            return `
                <div class="gantt-tooltip">
                    <h4>${task.text}</h4>
                    <p><strong>البداية:</strong> ${startDate}</p>
                    <p><strong>النهاية:</strong> ${endDate}</p>
                    <p><strong>التقدم:</strong> ${progress}%</p>
                    ${task.description ? `<p><strong>الوصف:</strong> ${task.description}</p>` : ''}
                </div>
            `;
        };
        
        // قالب لون المهمة
        gantt.templates.task_class = function(start, end, task) {
            let className = '';
            
            // لون حسب الأولوية
            if (task.priority) {
                className += ` priority-${task.priority}`;
            }
            
            // لون حسب الحالة
            if (task.status) {
                className += ` status-${task.status}`;
            }
            
            // تحديد المهام المتأخرة
            if (task.status !== 'completed' && new Date(end) < new Date()) {
                className += ' overdue';
            }
            
            return className;
        };
        
        // قالب شريط التقدم
        gantt.templates.progress_text = function(start, end, task) {
            return Math.round(task.progress * 100) + "%";
        };
    }
    
    /**
     * تحميل بيانات مخطط جانت
     */
    loadGanttData() {
        if (!this.isInitialized || !window.gantt) return;
        
        try {
            const ganttData = this.prepareGanttData();
            
            // مسح البيانات السابقة
            gantt.clearAll();
            
            // تحميل البيانات الجديدة
            gantt.parse(ganttData);
            
        } catch (error) {
            console.error('خطأ في تحميل بيانات مخطط جانت:', error);
            this.showGanttError();
        }
    }
    
    /**
     * إعداد بيانات مخطط جانت
     * @returns {Object} بيانات مخطط جانت
     */
    prepareGanttData() {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return { data: [], links: [] };
        
        let projects = storage.getUserProjects(currentUser.id);
        let tasks = storage.getUserTasks(currentUser.id);
        
        // تصفية حسب المشروع المحدد
        if (this.currentProjectFilter) {
            projects = projects.filter(p => p.id === this.currentProjectFilter);
            tasks = tasks.filter(t => t.projectId === this.currentProjectFilter);
        }
        
        const ganttTasks = [];
        const ganttLinks = [];
        
        // إضافة المشاريع كمهام رئيسية
        projects.forEach(project => {
            const projectTasks = tasks.filter(task => task.projectId === project.id);
            const hasSubTasks = projectTasks.length > 0;
            
            ganttTasks.push({
                id: `project_${project.id}`,
                text: project.name,
                start_date: project.startDate,
                end_date: project.endDate,
                duration: DateUtils.getDaysDifference(project.startDate, project.endDate),
                progress: project.progress / 100,
                type: hasSubTasks ? 'project' : 'task',
                open: true,
                priority: project.priority,
                status: project.progress >= 100 ? 'completed' : 'active',
                description: project.description,
                color: project.color,
                readonly: true // المشاريع للقراءة فقط في المخطط
            });
            
            // إضافة مهام المشروع
            projectTasks.forEach(task => {
                ganttTasks.push({
                    id: `task_${task.id}`,
                    text: task.name,
                    start_date: task.startDate,
                    end_date: task.endDate,
                    duration: DateUtils.getDaysDifference(task.startDate, task.endDate),
                    progress: this.getTaskProgress(task),
                    parent: `project_${project.id}`,
                    type: 'task',
                    priority: task.priority,
                    status: task.status,
                    description: task.description,
                    taskId: task.id,
                    projectId: task.projectId
                });
                
                // إضافة الروابط (التبعيات)
                if (task.dependencies && task.dependencies.length > 0) {
                    task.dependencies.forEach(depId => {
                        ganttLinks.push({
                            id: `link_${task.id}_${depId}`,
                            source: `task_${depId}`,
                            target: `task_${task.id}`,
                            type: "0" // finish_to_start
                        });
                    });
                }
            });
        });
        
        return {
            data: ganttTasks,
            links: ganttLinks
        };
    }
    
    /**
     * الحصول على تقدم المهمة كرقم عشري
     * @param {Object} task - بيانات المهمة
     * @returns {number} تقدم المهمة (0-1)
     */
    getTaskProgress(task) {
        switch (task.status) {
            case 'completed':
                return 1;
            case 'in-progress':
                return 0.5;
            case 'pending':
                return 0;
            default:
                return 0;
        }
    }
    
    /**
     * معالج تحديث المهمة في مخطط جانت
     * @param {string} id - معرف المهمة في المخطط
     * @param {Object} ganttTask - بيانات المهمة في المخطط
     */
    handleTaskUpdate(id, ganttTask) {
        if (!ganttTask.taskId) return; // تجاهل المشاريع
        
        try {
            const taskId = ganttTask.taskId;
            const updates = {
                startDate: gantt.date.date_to_str("%Y-%m-%d")(ganttTask.start_date),
                endDate: gantt.date.date_to_str("%Y-%m-%d")(ganttTask.end_date)
            };
            
            // تحديث المهمة في التخزين
            const updatedTask = storage.updateTask(taskId, updates);
            
            if (updatedTask) {
                notifications.show('تم التحديث', 'تم تحديث تواريخ المهمة', 'success');
                
                // تحديث المدراء الآخرين
                if (window.tasks) {
                    window.tasks.loadTasks();
                }
                if (window.projects) {
                    window.projects.loadProjects();
                }
            }
            
        } catch (error) {
            console.error('خطأ في تحديث المهمة:', error);
            notifications.show('خطأ', 'حدث خطأ أثناء تحديث المهمة', 'error');
        }
    }
    
    /**
     * معالج إضافة مهمة جديدة في مخطط جانت
     * @param {string} id - معرف المهمة في المخطط
     * @param {Object} ganttTask - بيانات المهمة في المخطط
     */
    handleTaskAdd(id, ganttTask) {
        // منع إضافة مهام جديدة من المخطط مباشرة
        // يجب استخدام النموذج المخصص
        gantt.deleteTask(id);
        notifications.show('تنبيه', 'يرجى استخدام نموذج إضافة المهام', 'warning');
    }
    
    /**
     * معالج حذف المهمة في مخطط جانت
     * @param {string} id - معرف المهمة في المخطط
     * @param {Object} ganttTask - بيانات المهمة في المخطط
     */
    handleTaskDelete(id, ganttTask) {
        if (!ganttTask.taskId) return; // تجاهل المشاريع
        
        try {
            const taskId = ganttTask.taskId;
            const success = storage.deleteTask(taskId);
            
            if (success) {
                notifications.show('تم الحذف', 'تم حذف المهمة', 'success');
                
                // تحديث المدراء الآخرين
                if (window.tasks) {
                    window.tasks.loadTasks();
                }
                if (window.projects) {
                    window.projects.loadProjects();
                }
            }
            
        } catch (error) {
            console.error('خطأ في حذف المهمة:', error);
            notifications.show('خطأ', 'حدث خطأ أثناء حذف المهمة', 'error');
        }
    }
    
    /**
     * معالج النقر على المهمة
     * @param {string} id - معرف المهمة في المخطط
     * @param {Event} e - حدث النقر
     */
    handleTaskClick(id, e) {
        const ganttTask = gantt.getTask(id);
        
        if (ganttTask.taskId) {
            // النقر على مهمة
            const task = storage.findTaskById(ganttTask.taskId);
            if (task && window.tasks) {
                window.tasks.showTaskDetails(task);
            }
        } else if (ganttTask.type === 'project') {
            // النقر على مشروع
            const projectId = ganttTask.id.replace('project_', '');
            const project = storage.findProjectById(projectId);
            if (project && window.projects) {
                window.projects.showProjectDetails(project);
            }
        }
    }
    
    /**
     * معالج النقر المزدوج على المهمة
     * @param {string} id - معرف المهمة في المخطط
     * @param {Event} e - حدث النقر
     */
    handleTaskDoubleClick(id, e) {
        const ganttTask = gantt.getTask(id);
        
        if (ganttTask.taskId) {
            // النقر المزدوج على مهمة - فتح نموذج التحرير
            const task = storage.findTaskById(ganttTask.taskId);
            if (task && window.tasks) {
                window.tasks.showEditTaskModal(task);
            }
        }
    }
    
    /**
     * إظهار رسالة خطأ في مخطط جانت
     */
    showGanttError() {
        const ganttContainer = document.getElementById('gantt_here');
        if (ganttContainer) {
            ganttContainer.innerHTML = `
                <div class="gantt-error">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>خطأ في تحميل مخطط جانت</h3>
                    <p>حدث خطأ أثناء تحميل مخطط جانت. يرجى المحاولة مرة أخرى.</p>
                    <button class="btn btn-primary" onclick="ganttManager.initializeGantt()">
                        <i class="fas fa-refresh"></i>
                        إعادة المحاولة
                    </button>
                </div>
            `;
        }
    }
    
    /**
     * تحديث مخطط جانت
     */
    refresh() {
        if (this.isInitialized) {
            this.loadGanttData();
        } else {
            this.initializeGantt();
        }
    }
    
    /**
     * تصدير مخطط جانت كصورة
     */
    exportToPNG() {
        if (!this.isInitialized || !window.gantt) {
            notifications.show('خطأ', 'مخطط جانت غير متاح', 'error');
            return;
        }
        
        try {
            gantt.exportToPNG({
                name: "gantt_chart.png",
                header: "مخطط جانت - مدير المشاريع",
                footer: "تم إنشاؤه بواسطة مدير المشاريع"
            });
        } catch (error) {
            console.error('خطأ في تصدير مخطط جانت:', error);
            notifications.show('خطأ', 'حدث خطأ أثناء تصدير المخطط', 'error');
        }
    }
    
    /**
     * تصدير مخطط جانت كـ PDF
     */
    exportToPDF() {
        if (!this.isInitialized || !window.gantt) {
            notifications.show('خطأ', 'مخطط جانت غير متاح', 'error');
            return;
        }
        
        try {
            gantt.exportToPDF({
                name: "gantt_chart.pdf",
                header: "مخطط جانت - مدير المشاريع",
                footer: "تم إنشاؤه بواسطة مدير المشاريع",
                orientation: "landscape"
            });
        } catch (error) {
            console.error('خطأ في تصدير مخطط جانت:', error);
            notifications.show('خطأ', 'حدث خطأ أثناء تصدير المخطط', 'error');
        }
    }
    
    /**
     * التكبير في مخطط جانت
     */
    zoomIn() {
        if (this.isInitialized && window.gantt) {
            gantt.ext.zoom.zoomIn();
        }
    }
    
    /**
     * التصغير في مخطط جانت
     */
    zoomOut() {
        if (this.isInitialized && window.gantt) {
            gantt.ext.zoom.zoomOut();
        }
    }
    
    /**
     * إعادة تعيين التكبير
     */
    resetZoom() {
        if (this.isInitialized && window.gantt) {
            gantt.ext.zoom.setLevel("day");
        }
    }
    
    /**
     * التحقق من حالة التهيئة
     * @returns {boolean} true إذا كان مخطط جانت مهيأ
     */
    isReady() {
        return this.isInitialized && window.gantt;
    }
}

// إنشاء مثيل واحد من مدير مخطط جانت
window.ganttManager = new GanttManager();

