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
        // توليد رابط الدعوة مباشرة
        const inviteLink = this.generateInviteLink(memberData);
        
        // عرض نافذة الرابط
        this.showInviteLinkModal(inviteLink);
        
        projects.hideModal('invite-member-modal');
    }
    
    /**
     * توليد رابط دعوة فريد
     * @param {Object} memberData - بيانات العضو
     * @returns {string} رابط الدعوة
     */
    generateInviteLink(memberData) {
        // توليد معرف فريد للدعوة
        const inviteId = this.generateInviteId();
        
        // حفظ بيانات الدعوة
        const inviteData = {
            id: inviteId,
            role: memberData.role,
            projects: memberData.projects || [],
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // تنتهي خلال 7 أيام
            used: false
        };
        
        // حفظ الدعوة في التخزين المحلي
        this.saveInviteData(inviteData);
        
        // إنشاء الرابط
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?invite=${inviteId}`;
    }
    
    /**
     * توليد معرف فريد للدعوة
     * @returns {string} معرف الدعوة
     */
    generateInviteId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    /**
     * حفظ بيانات الدعوة
     * @param {Object} inviteData - بيانات الدعوة
     */
    saveInviteData(inviteData) {
        const invites = JSON.parse(localStorage.getItem('team_invites') || '[]');
        invites.push(inviteData);
        localStorage.setItem('team_invites', JSON.stringify(invites));
    }
    
    /**
     * عرض نافذة رابط الدعوة
     * @param {string} inviteLink - رابط الدعوة
     */
    showInviteLinkModal(inviteLink) {
        // إنشاء النافذة المنبثقة
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'invite-link-modal';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-link"></i> رابط الدعوة جاهز</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="invite-success">
                        <div class="success-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <h4>تم إنشاء رابط الدعوة بنجاح!</h4>
                        <p>يمكنك الآن مشاركة هذا الرابط مع أي شخص تريد دعوته للانضمام للفريق</p>
                    </div>
                    
                    <div class="invite-link-section">
                        <label>رابط الدعوة:</label>
                        <div class="link-container">
                            <input type="text" id="invite-link-input" value="${inviteLink}" readonly>
                            <button class="btn btn-primary" onclick="team.copyInviteLink()">
                                <i class="fas fa-copy"></i> نسخ
                            </button>
                        </div>
                    </div>
                    
                    <div class="invite-instructions">
                        <h5><i class="fas fa-info-circle"></i> كيفية الاستخدام:</h5>
                        <ol>
                            <li>انسخ الرابط أعلاه</li>
                            <li>أرسله للشخص المراد دعوته عبر واتساب، تيليجرام، أو إيميل</li>
                            <li>عندما يفتح الرابط، سيُطلب منه إدخال اسمه</li>
                            <li>سيتم إضافته تلقائياً للفريق بالصلاحيات المحددة</li>
                            <li>الرابط صالح لمدة 7 أيام</li>
                        </ol>
                    </div>
                    
                    <div class="share-options">
                        <h5>مشاركة سريعة:</h5>
                        <div class="share-buttons">
                            <button class="btn btn-success" onclick="team.shareViaWhatsApp('${inviteLink}')">
                                <i class="fab fa-whatsapp"></i> واتساب
                            </button>
                            <button class="btn btn-info" onclick="team.shareViaTelegram('${inviteLink}')">
                                <i class="fab fa-telegram"></i> تيليجرام
                            </button>
                            <button class="btn btn-secondary" onclick="team.shareViaEmail('${inviteLink}')">
                                <i class="fas fa-envelope"></i> إيميل
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-check"></i> تم
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    /**
     * مشاركة عبر واتساب
     * @param {string} inviteLink - رابط الدعوة
     */
    shareViaWhatsApp(inviteLink) {
        const message = `مرحباً! تم دعوتك للانضمام إلى فريق العمل في مدير المشاريع. يرجى النقر على الرابط التالي للانضمام: ${inviteLink}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }
    
    /**
     * مشاركة عبر تيليجرام
     * @param {string} inviteLink - رابط الدعوة
     */
    shareViaTelegram(inviteLink) {
        const message = `مرحباً! تم دعوتك للانضمام إلى فريق العمل في مدير المشاريع. يرجى النقر على الرابط التالي للانضمام: ${inviteLink}`;
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(message)}`;
        window.open(telegramUrl, '_blank');
    }
    
    /**
     * مشاركة عبر الإيميل
     * @param {string} inviteLink - رابط الدعوة
     */
    shareViaEmail(inviteLink) {
        const subject = 'دعوة للانضمام إلى فريق العمل - مدير المشاريع';
        const body = `مرحباً!\n\nتم دعوتك للانضمام إلى فريق العمل في مدير المشاريع.\n\nيرجى النقر على الرابط التالي للانضمام:\n${inviteLink}\n\nمع تحياتي`;
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoUrl, '_blank');
    }
    
    /**
     * نسخ رابط الدعوة
     */
    copyInviteLink() {
        const linkInput = document.getElementById('invite-link-input');
        linkInput.select();
        linkInput.setSelectionRange(0, 99999); // للهواتف المحمولة
        
        try {
            document.execCommand('copy');
            notifications.show('تم النسخ', 'تم نسخ رابط الدعوة بنجاح', 'success', 3000);
        } catch (err) {
            // للمتصفحات الحديثة
            navigator.clipboard.writeText(linkInput.value).then(() => {
                notifications.show('تم النسخ', 'تم نسخ رابط الدعوة بنجاح', 'success', 3000);
            }).catch(() => {
                notifications.show('خطأ', 'فشل في نسخ الرابط', 'error');
            });
        }
    }
    
    /**
     * مشاركة عبر واتساب
     * @param {string} inviteLink - رابط الدعوة
     * @param {string} email - إيميل المدعو
     */
    shareViaWhatsApp(inviteLink, email) {
        const message = `مرحباً! تم دعوتك للانضمام إلى فريق مدير المشاريع.
        
🔗 اضغط على الرابط للانضمام:
${inviteLink}

📧 الحساب المدعو: ${email}
⏰ الرابط صالح لمدة 7 أيام

مع تحيات فريق مدير المشاريع`;
        
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }
    
    /**
     * مشاركة عبر تيليجرام
     * @param {string} inviteLink - رابط الدعوة
     * @param {string} email - إيميل المدعو
     */
    shareViaTelegram(inviteLink, email) {
        const message = `مرحباً! تم دعوتك للانضمام إلى فريق مدير المشاريع.

🔗 اضغط على الرابط للانضمام:
${inviteLink}

📧 الحساب المدعو: ${email}
⏰ الرابط صالح لمدة 7 أيام`;
        
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(message)}`;
        window.open(telegramUrl, '_blank');
    }
    
    /**
     * مشاركة عبر الإيميل
     * @param {string} inviteLink - رابط الدعوة
     * @param {string} email - إيميل المدعو
     */
    shareViaEmail(inviteLink, email) {
        const subject = 'دعوة للانضمام إلى فريق مدير المشاريع';
        const body = `مرحباً!

تم دعوتك للانضمام إلى فريق مدير المشاريع.

🔗 اضغط على الرابط للانضمام:
${inviteLink}

📧 الحساب المدعو: ${email}
⏰ الرابط صالح لمدة 7 أيام

للانضمام:
1. اضغط على الرابط أعلاه
2. أدخل اسمك عند الطلب
3. ستتم إضافتك تلقائياً للفريق

مع تحيات فريق مدير المشاريع`;
        
        const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoUrl);
    }
    
    /**
     * التحقق من وجود دعوة في الرابط
     */
    checkForInviteInUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const inviteId = urlParams.get('invite');
        
        if (inviteId) {
            this.processInvite(inviteId);
        }
    }
    
    /**
     * معالجة الدعوة
     * @param {string} inviteId - معرف الدعوة
     */
    processInvite(inviteId) {
        const invites = JSON.parse(localStorage.getItem('team_invites') || '[]');
        const invite = invites.find(inv => inv.id === inviteId);
        
        if (!invite) {
            notifications.show('خطأ', 'رابط الدعوة غير صحيح أو منتهي الصلاحية', 'error');
            return;
        }
        
        if (invite.used) {
            notifications.show('تنبيه', 'تم استخدام هذه الدعوة مسبقاً', 'warning');
            return;
        }
        
        if (new Date(invite.expiresAt) < new Date()) {
            notifications.show('خطأ', 'انتهت صلاحية رابط الدعوة', 'error');
            return;
        }
        
        // عرض نافذة قبول الدعوة
        this.showAcceptInviteModal(invite);
    }
    
    /**
     * عرض نافذة قبول الدعوة
     * @param {Object} invite - بيانات الدعوة
     */
    showAcceptInviteModal(invite) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'accept-invite-modal';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3><i class="fas fa-user-plus"></i> دعوة للانضمام</h3>
                </div>
                
                <div class="modal-body">
                    <div class="invite-details">
                        <p><strong>تم دعوتك للانضمام كـ:</strong></p>
                        <p class="role-info">${this.getRoleText(invite.role)}</p>
                        
                        <p><strong>الإيميل المدعو:</strong></p>
                        <p class="email-info">${invite.email}</p>
                    </div>
                    
                    <div class="name-input-section">
                        <label for="join-name">أدخل اسمك:</label>
                        <input type="text" id="join-name" placeholder="الاسم الكامل" required>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        رفض
                    </button>
                    <button class="btn btn-primary" onclick="team.acceptInvite('${invite.id}')">
                        <i class="fas fa-check"></i> قبول الدعوة
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    /**
     * قبول الدعوة
     * @param {string} inviteId - معرف الدعوة
     */
    acceptInvite(inviteId) {
        const name = document.getElementById('join-name').value.trim();
        
        if (!name) {
            notifications.show('خطأ', 'يرجى إدخال اسمك', 'error');
            return;
        }
        
        const invites = JSON.parse(localStorage.getItem('team_invites') || '[]');
        const inviteIndex = invites.findIndex(inv => inv.id === inviteId);
        
        if (inviteIndex === -1) {
            notifications.show('خطأ', 'الدعوة غير موجودة', 'error');
            return;
        }
        
        // تحديث بيانات الدعوة
        invites[inviteIndex].used = true;
        invites[inviteIndex].acceptedAt = new Date().toISOString();
        invites[inviteIndex].acceptedName = name;
        
        localStorage.setItem('team_invites', JSON.stringify(invites));
        
        // حفظ اسم المستخدم
        localStorage.setItem('userName', name);
        
        // إخفاء النافذة
        document.getElementById('accept-invite-modal').remove();
        
        // إزالة معامل الدعوة من الرابط
        const url = new URL(window.location);
        url.searchParams.delete('invite');
        window.history.replaceState({}, document.title, url);
        
        notifications.show('مرحباً!', `أهلاً بك ${name}! تم انضمامك للفريق بنجاح`, 'success', 5000);
        
        // إعادة تحميل الصفحة لتطبيق التغييرات
        setTimeout(() => {
            window.location.reload();
        }, 2000);
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
        
        // التحقق من وجود البريد الإلكتروني
        if (!memberData.email) {
            errors.push('البريد الإلكتروني مطلوب');
        } else {
            // التحقق من صحة تنسيق البريد الإلكتروني
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(memberData.email)) {
                errors.push('البريد الإلكتروني غير صحيح. يجب أن يكون بالتنسيق: example@domain.com');
            }
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

