<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '../stores/appStore';
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  LogOut,
  FileText,
  AlertCircle
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const allNavItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { name: 'Tickets', path: '/tickets', icon: Ticket, roles: ['admin', 'tecnico', 'cliente'] },
  { name: 'Albaranes', path: '/albaranes', icon: FileText, roles: ['admin', 'tecnico'] },
  { name: 'Equipo', path: '/technicians', icon: Users, roles: ['admin'] },
  { name: 'Clientes', path: '/clients', icon: Users, roles: ['admin'] },
];

const navItems = computed(() => {
  const userRole = store.currentUser?.role || 'cliente';
  return allNavItems.filter(item => item.roles.includes(userRole));
});

const handleLogout = () => {
  store.logout();
  router.push('/login');
};

const handleAlertClick = () => {
  router.push('/tickets?sin-asignar=true');
};

const goToProfile = () => {
  router.push('/profile');
};

</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <Ticket />
      </div>
      <span class="sidebar-title">SupportDesk</span>
      <div v-if="store.ticketsSinAsignar > 0 && store.currentUser?.role !== 'cliente'" class="alert-badge" :title="`${store.ticketsSinAsignar} tickets sin asignar`" @click="handleAlertClick" style="cursor: pointer;">
        <AlertCircle style="width: 14px; height: 14px;" />
        <span style="font-size: 0.75rem; font-weight: 600;">{{ store.ticketsSinAsignar }}</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <router-link 
        v-for="item in navItems" 
        :key="item.path"
        :to="item.path"
        class="sidebar-nav-item"
        :class="{ active: route.path === item.path }"
      >
        <component :is="item.icon" />
        {{ item.name }}
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <div 
        v-if="store.currentUser" 
        class="sidebar-user" 
        style="cursor: pointer; padding: 0.5rem; border-radius: var(--radius); transition: background-color 0.15s ease;" 
        @click="goToProfile"
        :title="`Ver perfil de ${store.currentUser.name}`"
      >
        <div class="sidebar-avatar">
          {{ store.currentUser.name?.charAt(0) || 'U' }}
        </div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name truncate">{{ store.currentUser.name }}</div>
          <div class="sidebar-user-email truncate">{{ store.currentUser.email }}</div>
        </div>
      </div>
      <button @click="handleLogout" class="sidebar-logout">
        <LogOut />
        Cerrar Sesión
      </button>
    </div>
  </aside>
</template>
