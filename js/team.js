/**
 * نظام إدارة الفريق والصلاحيات
 * يتعامل مع دعوة أعضاء الفريق، إدارة الصلاحيات، ومشاركة المشاريع
 */

class TeamManager {
    constructor() {
        this.teamMembers = [];
        this.pendingInvitations = [];
        
        // ربط الأحداث
        this.bindEvents();
    }
    
    /**
     * ربط أحداث إدارة الفريق
     */
    bindEvents() {
        // زر دعوة عضو جديد
        const inviteMemberBtn = document.getElementById('invite-member-btn');
        if (inviteMemberBtn) {
            inviteMemberBtn.addEventListener('click', () => this.showInviteMemberModal());
        }
        
        // نموذج دعوة عضو
        const inviteMemberForm = document.getElementById('invite-member-form');
        if (inviteMemberForm) {
            inviteMemberForm.addEventListener('submit', (e) => this.handleInviteMember(e));
        }
    }
    
    /**
     * تحميل وعرض أعضاء الفريق
     */
    loadTeamMembers() {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;
        
        this.teamMembers = storage.getTeams();
        this.renderTeamMembers();
    }
    
    /**
     * عرض أعضاء الفريق في الواجهة
     */
    renderTeamMembers() {
        const teamGrid = document.getElementById('team-members');
        
        if (!teamGrid) return;
        
        // مسح المحتوى السابق
        teamGrid.innerHTML = '';
        
        // إضافة المستخدم الحالي
        const currentUser = auth.getCurrentUser();
        if (currentUser) {
            const ownerCard = this.createMemberCard({
                id: currentUser.id,
                name: currentUser.name,
                email: currentUser.email,
                role: 'owner',
                status: 'active',
                projects: storage.getUserProjects(currentUser.id).map(p => p.name),
                joinedAt: currentUser.createdAt
            }, true);
            teamGrid.appendChild(ownerCard);
        }
        
        // إضافة أعضاء الفريق
        this.teamMembers.forEach(member => {
            const memberCard = this.createMemberCard(member);
            teamGrid.appendChild(memberCard);
        });
        
        // إضافة بطاقة دعوة جديدة
        const inviteCard = this.createInviteCard();
        teamGrid.appendChild(inviteCard);
    }
    
    /**
     * إنشاء بطاقة عضو الفريق
     * @param {Object} member - بيانات العضو
     * @param {boolean} isOwner - هل هو المالك
     * @returns {HTMLElement} بطاقة العضو
     */
    createMemberCard(member, isOwner = false) {
        const card = DOMUtils.createElement('div', {
            className: 'team-member',
            dataset: { memberId: member.id }
        });
        
        // تحديد لون الدور
        const roleColor = this.getRoleColor(member.role);
        const roleText = this.getRoleText(member.role);
        const statusText = this.getStatusText(member.status);
        
        // تنسيق تاريخ الانضمام
        const joinedDate = DateUtils.formatDate(member.joinedAt || member.invitedAt);
        
        // قائمة المشاريع
        const projectsList = member.projects && member.projects.length > 0 
            ? member.projects.slice(0, 3).join('، ') + (member.projects.length > 3 ? '...' : '')
            : 'لا توجد مشاريع';
        
        card.innerHTML = `
            <div class="member-avatar" style="background: ${roleColor}">
                <i class="fas fa-user"></i>
            </div>
            
            <div class="member-info">
                <h4 class="member-name">
                    ${member.name || 'مستخدم جديد'}
                    ${isOwner ? '<i class="fas fa-crown" title="المالك"></i>' : ''}
                </h4>
                <p class="member-email">${member.email}</p>
                <div class="member-role">
                    <span class="role-badge" style="background: ${roleColor}">
                        ${roleText}
                    </span>
                    <span class="status-badge status-${member.status}">
                        ${statusText}
                    </span>
                </div>
            </div>
            
            <div class="member-details">
                <div class="member-projects">
                    <strong>المشاريع:</strong>
                    <span>${projectsList}</span>
                </div>
                <div class="member-joined">
                    <strong>انضم في:</strong>
                    <span>${joinedDate}</span>
                </div>
            </div>
            
            ${!isOwner ? this.getMemberActionsHTML(member) : ''}
        `;
        
        // ربط الأحداث
        if (!isOwner) {
            this.bindMemberCardEvents(card, member);
        }
        
        return card;
    }
    
    /**
     * إنشاء بطاقة دعوة جديدة
     * @returns {HTMLElement} بطاقة الدعوة
     */
    createInviteCard() {
        const card = DOMUtils.createElement('div', {
            className: 'team-member invite-card'
        });
        
        card.innerHTML = `
            <div class="member-avatar invite-avatar">
                <i class="fas fa-plus"></i>
            </div>
            
            <div class="member-info">
                <h4 class="member-name">دعوة عضو جديد</h4>
                <p class="member-email">أضف أعضاء جدد إلى فريقك</p>
            </div>
            
            <button class="btn btn-primary invite-btn" onclick="team.showInviteMemberModal()">
                <i class="fas fa-user-plus"></i>
                إرسال دعوة
            </button>
        `;
        
        return card;
    }
    
    /**
     * ربط أحداث بطاقة العضو
     * @param {HTMLElement} card - بطاقة العضو
     * @param {Object} member - بيانات العضو
     */
    bindMemberCardEvents(card, member) {
        // أزرار الإجراءات
        const editBtn = card.querySelector('.edit-member-btn');
        const removeBtn = card.querySelector('.remove-member-btn');
        const resendBtn = card.querySelector('.resend-invite-btn');
        
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEditMemberModal(member);
            });
        }
        
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmRemoveMember(member);
            });
        }
        
        if (resendBtn) {
            resendBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.resendInvitation(member);
            });
        }
    }
    
    /**
     * الحصول على HTML أزرار إجراءات العضو
     * @param {Object} member - بيانات العضو
     * @returns {string} HTML الأزرار
     */
    getMemberActionsHTML(member) {
        const currentUser = auth.getCurrentUser();
        const canManage = auth.hasPermission('admin');
        
        if (!canManage) return '';
        
        return `
            <div class="member-actions">
                ${member.status === 'pending' ? `
                    <button class="btn btn-sm btn-info resend-invite-btn" title="إعادة إرسال الدعوة">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                ` : `
                    <button class="btn btn-sm btn-secondary edit-member-btn" title="تحرير الصلاحيات">
                        <i class="fas fa-edit"></i>
                    </button>
                `}
                <button class="btn btn-sm btn-error remove-member-btn" title="إزالة العضو">
                    <i class="fas fa-user-times"></i>
                </button>
            </div>
        `;
    }
    
    /**
     * إظهار نافذة دعوة عضو جديد
     */
    showInviteMemberModal() {
        const modal = document.getElementById('invite-member-modal');
        const form = document.getElementById('invite-member-form');
        
        if (modal && form) {
            // مسح النموذج
            form.reset();
            
            // تحديث قائمة المشاريع
            this.updateMemberProjectOptions();
            
            projects.showModal('invite-member-modal');
        }
    }
    
    /**
     * إظهار نافذة تحرير عضو
     * @param {Object} member - بيانات العضو
     */
    showEditMemberModal(member) {
        const modal = document.getElementById('invite-member-modal');
        const form = document.getElementById('invite-member-form');
        
        if (modal && form) {
            // تحديث قائمة المشاريع
            this.updateMemberProjectOptions();
            
            // ملء النموذج ببيانات العضو
            document.getElementById('member-email').value = member.email;
            document.getElementById('member-email').disabled = true;
            document.getElementById('member-role').value = member.role;
            
            // تحديد المشاريع المسموحة
            const projectCheckboxes = document.querySelectorAll('#member-projects input[type="checkbox"]');
            projectCheckboxes.forEach(checkbox => {
                checkbox.checked = member.projects && member.projects.includes(checkbox.value);
            });
            
            // تغيير عنوان النافذة
            modal.querySelector('.modal-header h3').textContent = 'تحرير صلاحيات العضو';
            modal.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> حفظ التغييرات';
            
            // حفظ معرف العضو للتحديث
            form.dataset.editingMemberId = member.id;
            
            projects.showModal('invite-member-modal');
        }
    }
    
    /**
     * معالج دعوة/تحديث عضو
     * @param {Event} event - حدث النموذج
     */
    async handleInviteMember(event) {
        event.preventDefault();
        
        const form = event.target;
        
        const memberData = {
            email: document.getElementById('member-email').value.trim(),
            role: document.getElementById('member-role').value,
            projects: this.getSelectedProjects()
        };
        
        // التحقق من صحة البيانات
        if (!this.validateMemberForm(memberData)) {
            return;
        }
        
        try {
            // إظهار حالة التحميل
            projects.setFormLoading(form, true);
            
            const editingMemberId = form.dataset.editingMemberId;
            
            if (editingMemberId) {
                // تحديث عضو موجود
                this.updateMember(editingMemberId, memberData);
            } else {
                // دعوة عضو جديد
                this.inviteMember(memberData);
            }
            
        } catch (error) {
            console.error('خطأ في معالجة العضو:', error);
            notifications.show('خطأ', 'حدث خطأ أثناء معالجة العضو', 'error');
        } finally {
            projects.setFormLoading(form, false);
            
            // إعادة تعيين النموذج
            delete form.dataset.editingMemberId;
            document.getElementById('member-email').disabled = false;
            const modal = document.getElementById('invite-member-modal');
            modal.querySelector('.modal-header h3').textContent = 'دعوة عضو جديد';
            modal.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الدعوة';
        }
    }
    
    /**
     * دعوة عضو جديد
     * @param {Object} memberData - بيانات العضو
     */
    inviteMember(memberData) {
        // التحقق من عدم وجود العضو مسبقاً
        const existingMember = this.teamMembers.find(m => m.email === memberData.email);
        if (existingMember) {
            notifications.show('خطأ', 'هذا العضو موجود بالفعل في الفريق', 'error');
            return;
        }
        
        // إضافة العضو الجديد
        const newMember = storage.addTeamMember(memberData);
        
        if (newMember) {
            notifications.show('تم الإرسال', 'تم إرسال الدعوة بنجاح', 'success');
            
            // محاكاة إرسال بريد إلكتروني
            this.simulateEmailInvitation(newMember);
            
            this.loadTeamMembers();
            projects.hideModal('invite-member-modal');
        }
    }
    
    /**
     * تحديث عضو موجود
     * @param {string} memberId - معرف العضو
     * @param {Object} memberData - بيانات العضو الجديدة
     */
    updateMember(memberId, memberData) {
        const memberIndex = this.teamMembers.findIndex(m => m.id === memberId);
        
        if (memberIndex === -1) {
            notifications.show('خطأ', 'العضو غير موجود', 'error');
            return;
        }
        
        // تحديث بيانات العضو
        this.teamMembers[memberIndex] = {
            ...this.teamMembers[memberIndex],
            role: memberData.role,
            projects: memberData.projects,
            updatedAt: new Date().toISOString()
        };
        
        // حفظ التحديثات
        storage.setTeams(this.teamMembers);
        
        notifications.show('تم التحديث', 'تم تحديث صلاحيات العضو بنجاح', 'success');
        
        this.loadTeamMembers();
        projects.hideModal('invite-member-modal');
    }
    
    /**
     * التحقق من صحة بيانات العضو
     * @param {Object} memberData - بيانات العضو
     * @returns {boolean} true إذا كانت البيانات صحيحة
     */
    validateMemberForm(memberData) {
        const errors = [];
        
        if (!memberData.email) {
            errors.push('البريد الإلكتروني مطلوب');
        } else if (!ValidationUtils.isValidEmail(memberData.email)) {
            errors.push('البريد الإلكتروني غير صحيح');
        }
        
        if (!memberData.role) {
            errors.push('يجب تحديد الصلاحية');
        }
        
        if (!memberData.projects || memberData.projects.length === 0) {
            errors.push('يجب تحديد مشروع واحد على الأقل');
        }
        
        if (errors.length > 0) {
            notifications.show('خطأ في البيانات', errors.join('<br>'), 'error');
            return false;
        }
        
        return true;
    }
    
    /**
     * الحصول على المشاريع المحددة
     * @returns {Array} قائمة معرفات المشاريع المحددة
     */
    getSelectedProjects() {
        const checkboxes = document.querySelectorAll('#member-projects input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }
    
    /**
     * تحديث خيارات المشاريع في نموذج العضو
     */
    updateMemberProjectOptions() {
        const projectsContainer = document.getElementById('member-projects');
        
        if (projectsContainer) {
            const currentUser = auth.getCurrentUser();
            if (!currentUser) return;
            
            const userProjects = storage.getUserProjects(currentUser.id);
            
            // مسح الخيارات السابقة
            projectsContainer.innerHTML = '';
            
            // إضافة المشاريع
            userProjects.forEach(project => {
                const checkboxItem = DOMUtils.createElement('div', {
                    className: 'checkbox-item'
                });
                
                checkboxItem.innerHTML = `
                    <input type="checkbox" id="project_${project.id}" value="${project.id}">
                    <label for="project_${project.id}">${project.name}</label>
                `;
                
                projectsContainer.appendChild(checkboxItem);
            });
        }
    }
    
    /**
     * تأكيد إزالة العضو
     * @param {Object} member - بيانات العضو
     */
    confirmRemoveMember(member) {
        const statusText = member.status === 'pending' ? 'إلغاء الدعوة' : 'إزالة العضو';
        const confirmed = confirm(`هل أنت متأكد من ${statusText} "${member.email}"؟`);
        
        if (confirmed) {
            this.removeMember(member);
        }
    }
    
    /**
     * إزالة عضو من الفريق
     * @param {Object} member - بيانات العضو
     */
    removeMember(member) {
        const memberIndex = this.teamMembers.findIndex(m => m.id === member.id);
        
        if (memberIndex === -1) {
            notifications.show('خطأ', 'العضو غير موجود', 'error');
            return;
        }
        
        // إزالة العضو
        this.teamMembers.splice(memberIndex, 1);
        storage.setTeams(this.teamMembers);
        
        const actionText = member.status === 'pending' ? 'تم إلغاء الدعوة' : 'تم إزالة العضو';
        notifications.show('تم الإزالة', actionText, 'success');
        
        this.loadTeamMembers();
    }
    
    /**
     * إعادة إرسال الدعوة
     * @param {Object} member - بيانات العضو
     */
    resendInvitation(member) {
        // محاكاة إعادة إرسال البريد الإلكتروني
        this.simulateEmailInvitation(member);
        
        notifications.show('تم الإرسال', 'تم إعادة إرسال الدعوة بنجاح', 'success');
    }
    
    /**
     * محاكاة إرسال بريد إلكتروني للدعوة
     * @param {Object} member - بيانات العضو
     */
    simulateEmailInvitation(member) {
        // في التطبيق الحقيقي، هنا سيتم إرسال بريد إلكتروني فعلي
        console.log('إرسال دعوة إلى:', member.email);
        
        // إظهار تنبيه محاكاة
        setTimeout(() => {
            notifications.info(
                'تم إرسال الدعوة',
                `تم إرسال دعوة إلى ${member.email} للانضمام إلى الفريق`,
                6000
            );
        }, 1000);
    }
    
    /**
     * الحصول على لون الدور
     * @param {string} role - الدور
     * @returns {string} لون الدور
     */
    getRoleColor(role) {
        const colors = {
            owner: '#8b5cf6',
            admin: '#ef4444',
            editor: '#f59e0b',
            viewer: '#10b981'
        };
        return colors[role] || colors.viewer;
    }
    
    /**
     * الحصول على نص الدور
     * @param {string} role - الدور
     * @returns {string} نص الدور
     */
    getRoleText(role) {
        const roles = {
            owner: 'المالك',
            admin: 'مدير',
            editor: 'محرر',
            viewer: 'مشاهد'
        };
        return roles[role] || 'مشاهد';
    }
    
    /**
     * الحصول على نص الحالة
     * @param {string} status - الحالة
     * @returns {string} نص الحالة
     */
    getStatusText(status) {
        const statuses = {
            active: 'نشط',
            pending: 'في الانتظار',
            inactive: 'غير نشط'
        };
        return statuses[status] || 'في الانتظار';
    }
    
    /**
     * التحقق من صلاحية الوصول للمشروع
     * @param {string} projectId - معرف المشروع
     * @param {string} userId - معرف المستخدم
     * @param {string} permission - نوع الصلاحية المطلوبة
     * @returns {boolean} true إذا كان لديه صلاحية
     */
    hasProjectAccess(projectId, userId, permission = 'read') {
        const currentUser = auth.getCurrentUser();
        
        // المالك له صلاحية كاملة
        if (currentUser && currentUser.id === userId) {
            return true;
        }
        
        // البحث عن العضو في الفريق
        const member = this.teamMembers.find(m => m.userId === userId);
        if (!member || member.status !== 'active') {
            return false;
        }
        
        // التحقق من وجود المشروع في قائمة المشاريع المسموحة
        if (!member.projects.includes(projectId)) {
            return false;
        }
        
        // التحقق من الصلاحية حسب الدور
        switch (member.role) {
            case 'admin':
                return true;
            case 'editor':
                return ['read', 'write', 'edit'].includes(permission);
            case 'viewer':
                return permission === 'read';
            default:
                return false;
        }
    }
    
    /**
     * الحصول على أعضاء الفريق
     * @returns {Array} قائمة أعضاء الفريق
     */
    getTeamMembers() {
        return this.teamMembers;
    }
    
    /**
     * الحصول على عدد أعضاء الفريق النشطين
     * @returns {number} عدد الأعضاء النشطين
     */
    getActiveTeamMembersCount() {
        return this.teamMembers.filter(m => m.status === 'active').length + 1; // +1 للمالك
    }
    
    /**
     * الحصول على عدد الدعوات المعلقة
     * @returns {number} عدد الدعوات المعلقة
     */
    getPendingInvitationsCount() {
        return this.teamMembers.filter(m => m.status === 'pending').length;
    }
}

// إنشاء مثيل واحد من مدير الفريق
window.team = new TeamManager();

