import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import Tickets from '../views/Tickets.vue';
import TicketDetail from '../views/TicketDetail.vue';
import Technicians from '../views/Technicians.vue';
import Clients from '../views/Clients.vue';
import Albaranes from '../views/Albaranes.vue';
import Profile from '../views/Profile.vue';
import Login from '../views/Login.vue';

const routes = [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', name: 'Login', component: Login },
    { path: '/register', name: 'Register', component: () => import('../views/Register.vue') },
    { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/tickets', name: 'Tickets', component: Tickets, meta: { requiresAuth: true } },
    { path: '/tickets/:id', name: 'TicketDetail', component: TicketDetail, meta: { requiresAuth: true } },
    { path: '/technicians', name: 'Technicians', component: Technicians, meta: { requiresAuth: true, requiresRole: ['admin'] } },
    { path: '/clients', name: 'Clients', component: Clients, meta: { requiresAuth: true, requiresRole: ['admin'] } },
    { path: '/albaranes', name: 'Albaranes', component: Albaranes, meta: { requiresAuth: true, requiresRole: ['admin', 'tecnico'] } },
    { path: '/profile', name: 'Profile', component: Profile, meta: { requiresAuth: true } },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach((to, from, next) => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (to.meta.requiresAuth && !currentUser) {
        next('/login');
    } else if (to.path === '/' && currentUser) {
        if (currentUser.role === 'admin') {
            next('/dashboard');
        } else {
            next('/tickets');
        }
    } else if (to.meta.requiresRole && currentUser) {
        // Protect routes by role
        if (Array.isArray(to.meta.requiresRole)) {
            if (!to.meta.requiresRole.includes(currentUser.role)) {
                next('/tickets'); // Redirect to tickets if not authorized
            } else {
                next();
            }
        } else {
            next();
        }
    } else {
        next();
    }
});

export default router;
