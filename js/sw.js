/**
 * Service Worker لتطبيق مدير المشاريع
 * يوفر إمكانية العمل بدون اتصال وتحسين الأداء
 */

const CACHE_NAME = 'project-manager-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';

// الملفات الأساسية للتخزين المؤقت
const STATIC_FILES = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/responsive.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/projects.js',
    '/js/tasks.js',
    '/js/gantt.js',
    '/js/notifications.js',
    '/js/team.js',
    '/js/storage.js',
    '/js/utils.js',
    '/manifest.json',
    // الخطوط والأيقونات الخارجية
    'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// مكتبات خارجية
const EXTERNAL_RESOURCES = [
    'https://cdn.dhtmlx.com/gantt/edge/dhtmlxgantt.js',
    'https://cdn.dhtmlx.com/gantt/edge/dhtmlxgantt.css'
];

// تثبيت Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        Promise.all([
            // تخزين الملفات الأساسية
            caches.open(STATIC_CACHE).then(cache => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES);
            }),
            // تخزين المكتبات الخارجية
            caches.open(DYNAMIC_CACHE).then(cache => {
                console.log('Service Worker: Caching external resources');
                return Promise.allSettled(
                    EXTERNAL_RESOURCES.map(url => 
                        cache.add(url).catch(err => 
                            console.warn(`Failed to cache ${url}:`, err)
                        )
                    )
                );
            })
        ]).then(() => {
            console.log('Service Worker: Installation complete');
            // فرض تفعيل Service Worker الجديد
            return self.skipWaiting();
        })
    );
});

// تفعيل Service Worker
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // حذف التخزين المؤقت القديم
                    if (cacheName !== STATIC_CACHE && 
                        cacheName !== DYNAMIC_CACHE && 
                        cacheName.startsWith('project-manager-')) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Activation complete');
            // السيطرة على جميع العملاء
            return self.clients.claim();
        })
    );
});

// اعتراض طلبات الشبكة
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // تجاهل طلبات غير HTTP/HTTPS
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // استراتيجية مختلفة للملفات المختلفة
    if (isStaticFile(request.url)) {
        // Cache First للملفات الثابتة
        event.respondWith(cacheFirst(request));
    } else if (isAPIRequest(request.url)) {
        // Network First لطلبات API
        event.respondWith(networkFirst(request));
    } else if (isExternalResource(request.url)) {
        // Stale While Revalidate للموارد الخارجية
        event.respondWith(staleWhileRevalidate(request));
    } else {
        // Network First للباقي
        event.respondWith(networkFirst(request));
    }
});

// استراتيجية Cache First
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        // تخزين الاستجابة الجديدة
        if (networkResponse.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Cache First failed:', error);
        
        // إرجاع صفحة بديلة في حالة عدم وجود اتصال
        if (request.destination === 'document') {
            return caches.match('/index.html');
        }
        
        throw error;
    }
}

// استراتيجية Network First
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        // تخزين الاستجابة الناجحة
        if (networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.warn('Network request failed, trying cache:', error);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // إرجاع صفحة بديلة للمستندات
        if (request.destination === 'document') {
            return caches.match('/index.html');
        }
        
        throw error;
    }
}

// استراتيجية Stale While Revalidate
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    // تحديث التخزين المؤقت في الخلفية
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(error => {
        console.warn('Background fetch failed:', error);
    });
    
    // إرجاع النسخة المخزنة فوراً إن وجدت، وإلا انتظار الشبكة
    return cachedResponse || fetchPromise;
}

// التحقق من نوع الملف
function isStaticFile(url) {
    const staticExtensions = ['.css', '.js', '.html', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
    return staticExtensions.some(ext => url.includes(ext)) || 
           url.endsWith('/') || 
           url.includes('/css/') || 
           url.includes('/js/');
}

function isAPIRequest(url) {
    return url.includes('/api/') || url.includes('api.');
}

function isExternalResource(url) {
    return url.includes('googleapis.com') || 
           url.includes('cdnjs.cloudflare.com') || 
           url.includes('cdn.dhtmlx.com');
}

// معالجة رسائل من التطبيق الرئيسي
self.addEventListener('message', event => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({ version: CACHE_NAME });
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        case 'CACHE_URLS':
            cacheUrls(payload.urls).then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
    }
});

// مسح جميع التخزين المؤقت
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
}

// تخزين URLs محددة
async function cacheUrls(urls) {
    const cache = await caches.open(DYNAMIC_CACHE);
    return Promise.allSettled(
        urls.map(url => cache.add(url))
    );
}

// معالجة إشعارات Push (للمستقبل)
self.addEventListener('push', event => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/assets/icon-192.png',
        badge: '/assets/badge-72.png',
        tag: data.tag || 'default',
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || [],
        data: data.data || {}
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// معالجة النقر على الإشعارات
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    const { action, data } = event;
    let url = '/';
    
    // تحديد الرابط بناءً على الإجراء
    if (action === 'view_task' && data.taskId) {
        url = `/?task=${data.taskId}`;
    } else if (action === 'view_project' && data.projectId) {
        url = `/?project=${data.projectId}`;
    } else if (data.url) {
        url = data.url;
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            // البحث عن نافذة مفتوحة للتطبيق
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            
            // فتح نافذة جديدة إذا لم توجد
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

// معالجة مزامنة البيانات في الخلفية
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

// تنفيذ مزامنة البيانات
async function doBackgroundSync() {
    try {
        // هنا يمكن إضافة منطق مزامنة البيانات
        // مثل رفع البيانات المحفوظة محلياً إلى الخادم
        console.log('Background sync completed');
    } catch (error) {
        console.error('Background sync failed:', error);
        throw error;
    }
}

// تسجيل معلومات Service Worker
console.log('Service Worker: Loaded', {
    version: CACHE_NAME,
    staticFiles: STATIC_FILES.length,
    externalResources: EXTERNAL_RESOURCES.length
});

