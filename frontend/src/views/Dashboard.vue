<script setup>
import { onMounted, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/appStore';
import { 
  Ticket, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Users,
  ChevronRight,
  TrendingUp,
  FileText,
  ArrowRight,
  Plus,
  Zap,
  Target,
  BarChart3
} from 'lucide-vue-next';

const router = useRouter();
const store = useAppStore();

onMounted(async () => {
  await store.fetchAll();
});

const isClientUser = computed(() => store.currentUser?.role === 'cliente');
const currentHour = computed(() => new Date().getHours());

const getGreeting = computed(() => {
  const hour = currentHour.value;
  if (hour < 12) return '🌅 Buenos días';
  if (hour < 18) return '☀️ Buenas tardes';
  return '🌙 Buenas noches';
});

const stats = computed(() => {
  const t = store.tickets;
  return [
    { label: 'Total Tickets', value: t.length, icon: Ticket, class: 'stat-icon-blue', color: '#3b82f6', percent: 100 },
    { label: 'Abiertos', value: t.filter(x => x.status === 'abierto').length, icon: Clock, class: 'stat-icon-amber', color: '#f59e0b', percent: (t.filter(x => x.status === 'abierto').length / t.length * 100) || 0 },
    { label: 'Cerrados', value: t.filter(x => x.status === 'cerrado').length, icon: CheckCircle, class: 'stat-icon-green', color: '#10b981', percent: (t.filter(x => x.status === 'cerrado').length / t.length * 100) || 0 },
    { label: 'Alta Prioridad', value: t.filter(x => x.priority === 'alta' && x.status !== 'cerrado').length, icon: AlertCircle, class: 'stat-icon-red', color: '#ef4444', percent: (t.filter(x => x.priority === 'alta').length / t.length * 100) || 0 },
  ];
});

const recentTickets = computed(() => store.tickets.slice(0, 5));
const recentAlbaranes = computed(() => store.albaranes.slice(0, 5));
</script>

<template>
  <div class="page-content">
    <!-- HEADER LLAMATIVO CON GRADIENTE -->
    <div style="
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 1.25rem;
      margin-bottom: 2.5rem;
      box-shadow: 0 20px 40px rgba(102, 126, 234, 0.2);
    ">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-size: 1.25rem; font-weight: 500; margin-bottom: 0.5rem;">{{ getGreeting }}</div>
          <h1 style="font-size: 2rem; font-weight: 700; margin: 0;">
            {{ store.currentUser?.name || store.currentUser?.nombre || 'Usuario' }}
          </h1>
          <p style="margin-top: 0.75rem; opacity: 0.9; font-size: 0.95rem;">
            {{ isClientUser ? `Panel de ${store.currentUser?.empresa?.nombreEmpresa || 'tu empresa'}` : 'Sistema de Gestión de Soporte' }}
          </p>
        </div>
        <div style="
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 1rem;
          border-radius: 1rem;
          text-align: right;
        ">
          <div style="font-size: 0.85rem; opacity: 0.8;">{{ new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</div>
        </div>
      </div>
    </div>

    <!-- DASHBOARD PARA CLIENTE -->
    <template v-if="isClientUser">
      <!-- STATS CARDS CON GRADIENTES -->
      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2.5rem;
      ">
        <!-- Card: Total Tickets -->
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 1rem;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
          transition: all 0.3s ease;
          cursor: pointer;
        " 
        @mouseenter="$event.target.style.transform = 'translateY(-5px)'; $event.target.style.boxShadow = '0 15px 40px rgba(102, 126, 234, 0.3)'"
        @mouseleave="$event.target.style.transform = 'translateY(0)'; $event.target.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.2)'">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
            <div>
              <div style="font-size: 0.85rem; opacity: 0.9;">Mis Tickets</div>
              <div style="font-size: 2.5rem; font-weight: 700; line-height: 1;">{{ store.tickets.length }}</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.2); padding: 0.75rem; border-radius: 0.75rem;">
              <Ticket style="width: 24px; height: 24px;" />
            </div>
          </div>
          <div style="font-size: 0.8rem; opacity: 0.8;">
            <span style="color: rgba(255, 255, 255, 0.8);">📊 Total en el sistema</span>
          </div>
        </div>

        <!-- Card: Por Resolver -->
        <div style="
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 1rem;
          box-shadow: 0 10px 30px rgba(245, 87, 108, 0.2);
          transition: all 0.3s ease;
          cursor: pointer;
        "
        @mouseenter="$event.target.style.transform = 'translateY(-5px)'; $event.target.style.boxShadow = '0 15px 40px rgba(245, 87, 108, 0.3)'"
        @mouseleave="$event.target.style.transform = 'translateY(0)'; $event.target.style.boxShadow = '0 10px 30px rgba(245, 87, 108, 0.2)'">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
            <div>
              <div style="font-size: 0.85rem; opacity: 0.9;">Por Resolver</div>
              <div style="font-size: 2.5rem; font-weight: 700; line-height: 1;">{{ store.tickets.filter(x => x.status !== 'cerrado').length }}</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.2); padding: 0.75rem; border-radius: 0.75rem;">
              <Clock style="width: 24px; height: 24px;" />
            </div>
          </div>
          <div style="font-size: 0.8rem; opacity: 0.8;">
            <span style="color: rgba(255, 255, 255, 0.8);">⏱️ Acciones pendientes</span>
          </div>
        </div>

        <!-- Card: Resueltos -->
        <div style="
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 1rem;
          box-shadow: 0 10px 30px rgba(79, 172, 254, 0.2);
          transition: all 0.3s ease;
          cursor: pointer;
        "
        @mouseenter="$event.target.style.transform = 'translateY(-5px)'; $event.target.style.boxShadow = '0 15px 40px rgba(79, 172, 254, 0.3)'"
        @mouseleave="$event.target.style.transform = 'translateY(0)'; $event.target.style.boxShadow = '0 10px 30px rgba(79, 172, 254, 0.2)'">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
            <div>
              <div style="font-size: 0.85rem; opacity: 0.9;">Resueltos</div>
              <div style="font-size: 2.5rem; font-weight: 700; line-height: 1;">{{ store.tickets.filter(x => x.status === 'cerrado').length }}</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.2); padding: 0.75rem; border-radius: 0.75rem;">
              <CheckCircle style="width: 24px; height: 24px;" />
            </div>
          </div>
          <div style="font-size: 0.8rem; opacity: 0.8;">
            <span style="color: rgba(255, 255, 255, 0.8);">✨ {{ Math.round((store.tickets.filter(x => x.status === 'cerrado').length / store.tickets.length) * 100 || 0) }}% completados</span>
          </div>
        </div>
      </div>

      <!-- TICKETS RECIENTES -->
      <div class="card" style="
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        border: 1px solid rgba(0, 0, 0, 0.05);
      ">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #f5f7fa 0%, #c3cce3 100%);">
          <div>
            <h2 class="card-title" style="margin: 0; display: flex; align-items: center; gap: 0.75rem;">
              <Zap style="width: 24px; height: 24px; color: #667eea;" />
              Tickets Recientes
            </h2>
          </div>
          <router-link to="/tickets" class="btn btn-ghost" style="font-size: 0.75rem; display: flex; align-items: center; gap: 0.25rem;">
            Ver todos
            <ArrowRight style="width: 14px; height: 14px;" />
          </router-link>
        </div>
        <div class="card-content">
          <div v-if="recentTickets.length === 0" class="empty-state" style="padding: 3rem; text-align: center;">
            <Ticket style="width: 50px; height: 50px; opacity: 0.3; margin-bottom: 1rem; display: block; margin-left: auto; margin-right: auto;" />
            <p style="color: var(--muted-foreground); font-size: 0.95rem;">No tienes tickets aún. ¡Crea uno para empezar!</p>
          </div>
          <div v-else style="display: flex; flex-direction: column; gap: 1rem;">
            <div v-for="ticket in recentTickets" :key="ticket._id" 
              class="ticket-list-item"
              style="
                cursor: pointer;
                padding: 1rem;
                border-radius: 0.75rem;
                border-left: 4px solid;
                background: linear-gradient(135deg, transparent 0%, rgba(102, 126, 234, 0.05) 100%);
                transition: all 0.3s ease;
              "
              :style="{ borderLeftColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'][['alta', 'media', 'baja'].indexOf(ticket.priority)] || '#3b82f6' }"
              @click="router.push(`/tickets/${ticket._id}`)"
              @mouseenter="$event.currentTarget.style.background = 'linear-gradient(135deg, transparent 0%, rgba(102, 126, 234, 0.15) 100%)'; $event.currentTarget.style.transform = 'translateX(5px)'"
              @mouseleave="$event.currentTarget.style.background = 'linear-gradient(135deg, transparent 0%, rgba(102, 126, 234, 0.05) 100%)'; $event.currentTarget.style.transform = 'translateX(0)'"
            >
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                  <div class="ticket-title" style="color: #0f172a; font-weight: 600;">{{ ticket.title }}</div>
                  <div class="ticket-meta" style="color: var(--muted-foreground); font-size: 0.8rem; margin-top: 0.35rem;">
                    <span>📅 {{ new Date(ticket.startDate).toLocaleDateString('es-ES') }}</span>
                    <span v-if="ticket.tecnico" style="margin-left: 0.75rem;">👨‍💼 {{ ticket.tecnico.nombre }}</span>
                  </div>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                  <span class="badge" :class="'badge-' + ticket.status" style="font-size: 0.7rem;">
                    {{ ticket.status === 'abierto' ? '🔵 ' : ticket.status === 'en progreso' ? '🟡 ' : '✅ ' }}{{ ticket.status }}
                  </span>
                  <span class="badge" :class="'badge-' + ticket.priority" style="font-size: 0.7rem;">
                    {{ ticket.priority }}
                  </span>
                  <ChevronRight style="width: 16px; height: 16px; color: var(--muted-foreground); margin-left: 0.5rem;" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- DASHBOARD PARA ADMIN/TÉCNICO -->
    <template v-else>
      <!-- STATS GRID CON GRADIENTES -->
      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2.5rem;
      ">
        <div v-for="stat in stats" :key="stat.label"
          style="
            background: linear-gradient(135deg, var(--stat-gradient-1) 0%, var(--stat-gradient-2) 100%);
            color: white;
            padding: 1.75rem;
            border-radius: 1.25rem;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            overflow: hidden;
          "
          :style="{
            '--stat-gradient-1': stat.color,
            '--stat-gradient-2': stat.color + '99'
          }"
          @mouseenter="$event.currentTarget.style.transform = 'translateY(-8px)'; $event.currentTarget.style.boxShadow = '0 25px 45px rgba(0, 0, 0, 0.15)'"
          @mouseleave="$event.currentTarget.style.transform = 'translateY(0)'; $event.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.1)'"
        >
          <!-- Fondo decorativo -->
          <div style="
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
            pointer-events: none;
          "></div>
          
          <div style="position: relative; z-index: 1;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
              <div>
                <div style="font-size: 0.9rem; opacity: 0.9; font-weight: 500;">{{ stat.label }}</div>
                <div style="font-size: 2.75rem; font-weight: 800; margin-top: 0.5rem; line-height: 1;">{{ stat.value }}</div>
              </div>
              <div style="background: rgba(255, 255, 255, 0.25); padding: 1rem; border-radius: 1rem; backdrop-filter: blur(10px);">
                <component :is="stat.icon" style="width: 28px; height: 28px;" />
              </div>
            </div>
            <div style="
              background: rgba(255, 255, 255, 0.2);
              border-radius: 8px;
              height: 4px;
              overflow: hidden;
            ">
              <div style="
                background: rgba(255, 255, 255, 0.8);
                height: 100%;
                border-radius: 8px;
                transition: width 0.3s ease;
              " :style="{ width: stat.percent + '%' }"></div>
            </div>
            <div style="font-size: 0.8rem; margin-top: 0.75rem; opacity: 0.85;">
              {{ Math.round(stat.percent) }}% de total
            </div>
          </div>
        </div>
      </div>

      <!-- GRILLAS DE CONTENIDO -->
      <div style="
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 1.5rem;
        margin-bottom: 0;
      ">
        <!-- TICKETS RECIENTES -->
        <div class="card" style="
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.05);
        ">
          <div class="card-header" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white;">
            <h2 class="card-title" style="margin: 0; display: flex; align-items: center; gap: 0.75rem; color: white;">
              <Zap style="width: 24px; height: 24px;" />
              Tickets Recientes
            </h2>
          </div>
          <div class="card-content" style="padding: 0;">
            <div v-if="recentTickets.length === 0" class="empty-state" style="padding: 2rem; text-align: center;">
              <p style="color: var(--muted-foreground);">No hay tickets recientes.</p>
            </div>
            <div v-else style="display: flex; flex-direction: column;">
              <div v-for="(ticket, idx) in recentTickets" :key="ticket._id" 
                style="
                  padding: 1rem 1.5rem;
                  border-bottom: 1px solid var(--border);
                  transition: all 0.3s ease;
                  background: idx % 2 === 0 ? 'transparent' : 'rgba(59, 130, 246, 0.03)';
                  cursor: pointer;
                "
                @mouseenter="$event.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'"
                @mouseleave="$event.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(59, 130, 246, 0.03)'"
              >
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div style="flex: 1;">
                    <div class="ticket-title" style="color: #0f172a; font-weight: 600;">{{ ticket.title }}</div>
                    <div style="font-size: 0.8rem; color: var(--muted-foreground); margin-top: 0.35rem;">
                      <span>{{ ticket.cliente?.nombreEmpresa || 'Cargando...' }}</span>
                      <span style="margin: 0 0.5rem;">•</span>
                      <span>{{ ticket.tecnico?.nombre || '👤 Sin asignar' }}</span>
                    </div>
                  </div>
                  <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <span class="badge" :class="'badge-' + ticket.status" style="font-size: 0.7rem;">{{ ticket.status }}</span>
                    <span class="badge" :class="'badge-' + ticket.priority" style="font-size: 0.7rem;">{{ ticket.priority }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style="padding: 1rem 1.5rem; background: var(--muted); border-top: 1px solid var(--border); text-align: center;">
            <router-link to="/tickets" style="color: #3b82f6; font-size: 0.85rem; font-weight: 600; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              Ver todos los tickets
              <ArrowRight style="width: 14px; height: 14px;" />
            </router-link>
          </div>
        </div>

        <!-- ESTADO GENERAL -->
        <div class="card" style="
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.05);
        ">
          <div class="card-header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">
            <h2 class="card-title" style="margin: 0; display: flex; align-items: center; gap: 0.75rem; color: white;">
              <BarChart3 style="width: 24px; height: 24px;" />
              Estado General
            </h2>
          </div>
          <div class="card-content">
            <div v-for="stat in stats" :key="'prog-' + stat.label" style="margin-bottom: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-size: 0.85rem; font-weight: 600; color: #0f172a;">{{ stat.label }}</span>
                <span style="
                  font-size: 0.9rem;
                  font-weight: 700;
                  background: rgba(102, 126, 234, 0.1);
                  color: #667eea;
                  padding: 0.25rem 0.75rem;
                  border-radius: 9999px;
                ">{{ Math.round(stat.percent) }}%</span>
              </div>
              <div style="
                background: #e5e7eb;
                border-radius: 100px;
                height: 6px;
                overflow: hidden;
              ">
                <div style="
                  height: 100%;
                  border-radius: 100px;
                  transition: width 0.4s ease;
                  background: linear-gradient(90deg, var(--color-gradient-1) 0%, var(--color-gradient-2) 100%);
                "
                :style="{
                  width: stat.percent + '%',
                  '--color-gradient-1': stat.color,
                  '--color-gradient-2': stat.color + '99'
                }"
                ></div>
              </div>
            </div>

            <!-- Insight Box -->
            <div style="
              margin-top: 1.5rem;
              padding: 1rem;
              background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
              border: 1px solid rgba(102, 126, 234, 0.2);
              border-radius: 0.75rem;
              display: flex;
              gap: 0.75rem;
              align-items: flex-start;
            ">
              <TrendingUp style="width: 20px; height: 20px; color: #667eea; flex-shrink: 0; margin-top: 0.125rem;" />
              <div style="font-size: 0.85rem; color: #0f172a; font-weight: 500;">
                <span style="color: #667eea; font-weight: 700;">📈 Tendencia:</span> El volumen de tickets ha subido un 12% esta semana.
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
