<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAppStore } from '../stores/appStore';
import { 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  MessageSquare,
  Clock,
  ExternalLink,
  FileText,
  CheckCircle,
  UserPlus
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const store = useAppStore();
const showCreateModal = ref(false);
const newTicket = ref({
  title: '',
  description: '',
  cliente: '',
  priority: 'media',
  tecnico: ''
});

const openCreateModal = () => {
  if (store.currentUser?.role === 'cliente') {
    // Intentar obtener el ID del cliente de clienteId o empresa
    const clienteData = store.currentUser.clienteId || store.currentUser.empresa;
    // Si es un objeto (porque viene poblado del backend), coger el _id
    newTicket.value.cliente = typeof clienteData === 'object' ? (clienteData._id || clienteData.id) : clienteData;
  } else {
    newTicket.value.cliente = '';
  }
  showCreateModal.value = true;
};

const editingTicket = ref(null);
const showEditModal = ref(false);
const searchQuery = ref('');
const filterStatus = ref('');
const filterPriority = ref('');
const filterCliente = ref('');
const filterSinAsignar = ref(false);

onMounted(async () => {
  // Detectar si viene del query param sin-asignar=true
  if (route.query['sin-asignar'] === 'true') {
    filterSinAsignar.value = true;
  }
  await store.fetchAll();
});

const clearFilters = () => {
  searchQuery.value = '';
  filterStatus.value = '';
  filterPriority.value = '';
  filterCliente.value = '';
  filterSinAsignar.value = false;
  // Limpiar el query param si existe
  router.push('/tickets');
};

// Computed property para filtrar tickets
const filteredTickets = computed(() => {
  let tickets = store.tickets;

  // Si es cliente, solo ver tickets de su empresa (redundante pero seguro)
  if (store.currentUser?.role === 'cliente') {
    const userEmpresaId = String(store.currentUser.empresa?._id || store.currentUser.empresa || '');
    if (userEmpresaId) {
      tickets = tickets.filter(t => {
        const ticketEmpresaId = String(t.cliente?._id || t.cliente || '');
        return ticketEmpresaId === userEmpresaId;
      });
    }
  }

  // Filtro: Solo tickets sin asignar
  if (filterSinAsignar.value) {
    tickets = tickets.filter(t => !t.tecnico || t.tecnico === null);
  }

  // Filtro por cliente (Admin/Trabajador)
  if (filterCliente.value && store.currentUser?.role !== 'cliente') {
    tickets = tickets.filter(t => String(t.cliente?._id || t.cliente || '') === filterCliente.value);
  }

  // Filtro por búsqueda de texto
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    tickets = tickets.filter(ticket => {
      const title = String(ticket.title || '').toLowerCase();
      const id = String(ticket._id || '').toLowerCase();
      const clientName = ticket.cliente?.nombreEmpresa?.toLowerCase() || '';
      const clientContact = ticket.cliente?.nombreContacto?.toLowerCase() || '';
      const techName = ticket.tecnico?.nombre?.toLowerCase() || '';
      const description = String(ticket.description || '').toLowerCase();
      
      return title.includes(query) || 
             id.includes(query) || 
             clientName.includes(query) ||
             clientContact.includes(query) ||
             techName.includes(query) ||
             description.includes(query);
    });
  }

  // Filtro por estado (Insensible a mayúsculas)
  if (filterStatus.value) {
    const s = filterStatus.value.toLowerCase();
    tickets = tickets.filter(ticket => String(ticket.status || '').toLowerCase() === s);
  }

  // Filtro por prioridad (Insensible a mayúsculas)
  if (filterPriority.value) {
    const p = filterPriority.value.toLowerCase();
    tickets = tickets.filter(ticket => String(ticket.priority || '').toLowerCase() === p);
  }

  return tickets;
});

const handleCreateTicket = async () => {
  try {
    const createdTicket = await store.createTicket(newTicket.value);
    showCreateModal.value = false;
    newTicket.value = { title: '', description: '', cliente: '', priority: 'media', tecnico: '' };
    // Refrescar datos para que se actualicen todas las vistas
    await store.fetchAll();
  } catch (error) {
    console.error('Error al crear ticket:', error);
    const msg = error.response?.data?.error || error.response?.data?.msg || error.message || 'Error desconocido';
    alert(`Error al crear el ticket: ${msg}`);
  }
};

const handleEditTicket = (ticket) => {
  editingTicket.value = { ...ticket };
  showEditModal.value = true;
};

const handleSaveEdit = async () => {
  try {
    await store.updateTicket(editingTicket.value._id, editingTicket.value);
    showEditModal.value = false;
    editingTicket.value = null;
  } catch (error) {
    alert('Error al actualizar el ticket');
  }
};

const handleDeleteTicket = async (ticketId) => {
  if (confirm('¿Estás seguro de que quieres eliminar este ticket?')) {
    try {
      await store.deleteTicket(ticketId);
    } catch (error) {
      alert('Error al eliminar el ticket');
    }
  }
};

const handleViewTicket = (ticket) => {
  router.push(`/tickets/${ticket._id}`);
};

const handleMarkAsCompleted = async (ticket) => {
  if (confirm(`¿Marcar el ticket "${ticket.title}" como completado?`)) {
    try {
      await store.updateTicket(ticket._id, {
        ...ticket,
        status: 'cerrado',
        endDate: new Date()
      });
      alert('Ticket marcado como completado');
      // Refrescar datos para que se actualicen todas las vistas
      await store.fetchAll();
    } catch (error) {
      console.error('Error al marcar como completado:', error);
      alert(`Error al marcar como completado: ${error.response?.data?.message || error.message || 'Error desconocido'}`);
    }
  }
};
const showAssignModal = ref(false);
const quickAssignTech = ref('');
const ticketToAssign = ref(null);
const confirmUnassign = ref(true); // Permitir siempre desasignar si se elige "Sin asignar"

const handleQuickAssign = (ticket) => {
  ticketToAssign.value = ticket;
  quickAssignTech.value = ticket.tecnico?._id || ticket.tecnico || '';
  showAssignModal.value = true;
};

const saveQuickAssign = async () => {
  if (!ticketToAssign.value) return;
  
  try {
    await store.updateTicket(ticketToAssign.value._id, {
      ...ticketToAssign.value,
      tecnico: quickAssignTech.value || null
    });
    showAssignModal.value = false;
    alert('Asignación actualizada con éxito');
    await store.fetchAll();
  } catch (error) {
    alert('Error al actualizar la asignación');
  }
};
</script>

<template>
  <div class="page-content">
    <div class="page-header">
      <div>
        <h1 class="page-title">Tickets de Soporte</h1>
        <p class="page-subtitle">Gestiona y responde a las solicitudes de ayuda</p>
      </div>
      <button v-if="store.currentUser?.role === 'admin' || store.currentUser?.role === 'cliente'" @click="openCreateModal" class="btn btn-primary">
        <Plus />
        Nuevo Ticket
      </button>
    </div>

    <!-- Barra de Filtros -->
    <div class="card" style="margin-bottom: 1.5rem; padding: 1rem;">
      <div class="filters-bar" style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
        <div class="input-with-icon" style="flex: 2; min-width: 250px;">
          <Search />
          <input v-model="searchQuery" type="text" class="form-input" placeholder="Buscar por título, ID, técnico o contenido...">
        </div>
        
        <!-- Filtro por Cliente (Solo para Admin/Trabajador) -->
        <select v-if="store.currentUser?.role !== 'cliente'" v-model="filterCliente" class="form-input form-select" style="flex: 1; min-width: 150px;">
          <option value="">Todos los clientes</option>
          <option v-for="c in store.clientes" :key="c._id" :value="c._id">{{ c.nombreEmpresa }}</option>
        </select>

        <select v-model="filterStatus" class="form-input form-select" style="flex: 1; min-width: 140px;">
          <option value="">Todos los estados</option>
          <option value="abierto">Abierto</option>
          <option value="en progreso">En Progreso</option>
          <option value="cerrado">Cerrado</option>
        </select>

        <select v-model="filterPriority" class="form-input form-select" style="flex: 1; min-width: 140px;">
          <option value="">Cualquier prioridad</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>

        <!-- Checkbox para filtrar sin asignar -->
        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius); background-color: var(--muted); flex-wrap: nowrap; white-space: nowrap;" :class="{ 'active': filterSinAsignar }">
          <input type="checkbox" v-model="filterSinAsignar" style="cursor: pointer;">
          <span style="font-size: 0.875rem;">Solo sin asignar</span>
        </label>

        <button @click="clearFilters" class="btn btn-ghost" style="padding: 0.5rem;" title="Limpiar filtros">
          <Filter style="width: 18px; height: 18px;" />
          Limpiar
        </button>
      </div>
    </div>

    <div v-if="filteredTickets.length === 0" class="empty-state">
      <FileText style="width: 48px; height: 48px; opacity: 0.2; margin-bottom: 1rem;" />
      <p v-if="store.tickets.length === 0">No hay tickets creados aún.</p>
      <p v-else>No se encontraron tickets con los filtros actuales.</p>
    </div>

    <div v-else class="card" style="padding: 1rem;">
      <!-- Indicador de resultados filtrados -->
      <div v-if="store.tickets.length > filteredTickets.length" style="padding: 0.75rem 1rem; background-color: var(--muted); border-radius: var(--radius); margin-bottom: 1rem; font-size: 0.875rem; color: var(--muted-foreground);">
        Mostrando {{ filteredTickets.length }} de {{ store.tickets.length }} tickets
      </div>
      
      <div v-for="ticket in filteredTickets" :key="ticket._id" class="ticket-list-item" :class="{ 'ticket-completed': ticket.status === 'cerrado' }">
        <div class="ticket-info">
          <div class="ticket-title">
            {{ ticket.title }}
            <span v-if="ticket.status === 'cerrado'" style="color: var(--success); font-size: 0.75rem; margin-left: 0.5rem;">
              ✓ Completado
            </span>
          </div>
          <div class="ticket-meta">
            <span>#{{ ticket._id ? ticket._id.slice(-6).toUpperCase() : 'N/A' }}</span> • 
            <span>{{ ticket.cliente?.nombreEmpresa || 'Sin cliente' }}</span> • 
            <span style="display: inline-flex; align-items: center; gap: 0.25rem;">
              <Clock style="width: 12px; height: 12px;" />
              {{ ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A' }}
            </span>
            <span v-if="ticket.endDate" style="margin-left: 0.5rem; color: var(--success);">
              • Finalizado: {{ new Date(ticket.endDate).toLocaleDateString() }}
            </span>
            <span v-if="ticket.tecnico" style="margin-left: 0.5rem; color: var(--primary); font-weight: 500;">
              • Técnico: {{ ticket.tecnico.nombre || 'Asignado' }}
            </span>
            <span v-else-if="store.currentUser?.role !== 'cliente'" style="margin-left: 0.5rem; color: var(--destructive); font-style: italic;">
              • Sin técnico asignado
            </span>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 1.5rem;">
          <div style="display: flex; gap: 0.5rem;">
            <span class="badge" :class="'badge-' + (ticket.status === 'en progreso' ? 'in-progress' : ticket.status)">
              <CheckCircle v-if="ticket.status === 'cerrado'" style="width: 12px; height: 12px; margin-right: 0.25rem;" />
              {{ ticket.status }}
            </span>
            <span class="badge" :class="'badge-' + (ticket.priority === 'media' ? 'medium' : (ticket.priority === 'baja' ? 'low' : 'high'))">
              {{ ticket.priority }}
            </span>
          </div>
          
          <div style="display: flex; align-items: center; gap: 0.75rem; color: var(--muted-foreground); font-size: 0.875rem;">
            <div style="display: flex; align-items: center; gap: 0.25rem;">
              <MessageSquare style="width: 14px; height: 14px;" />
              {{ ticket.messages?.length || 0 }}
            </div>
            <button 
              v-if="ticket.status !== 'cerrado'" 
              @click="handleMarkAsCompleted(ticket)" 
              class="btn btn-success btn-icon" 
              title="Marcar como completado"
            >
              <CheckCircle style="width: 14px; height: 14px;" />
            </button>
            <button 
              v-if="store.currentUser?.role !== 'cliente'" 
              @click="handleQuickAssign(ticket)" 
              class="btn btn-secondary btn-icon" 
              title="Asignar técnico"
            >
              <UserPlus style="width: 14px; height: 14px;" />
            </button>
            <button @click="handleEditTicket(ticket)" class="btn btn-secondary btn-icon" title="Editar">
              <MessageSquare style="width: 14px; height: 14px;" />
            </button>
            <button @click="handleViewTicket(ticket)" class="btn btn-ghost btn-icon" title="Ver detalles">
              <ExternalLink />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Asignación Rápida -->
    <div v-if="showAssignModal" class="modal-overlay">
      <div class="modal" style="max-width: 400px;">
        <div class="modal-header">
          <h2 class="modal-title">Asignar Trabajador</h2>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Selecciona quién se encargará de este ticket:</label>
            <select v-model="quickAssignTech" class="form-input form-select">
              <option value="">Sin asignar</option>
              <option v-for="t in store.tecnicos" :key="t._id" :value="t._id">{{ t.nombre }} ({{ t.puesto }})</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showAssignModal = false" class="btn btn-secondary">Cancelar</button>
          <button @click="saveQuickAssign" class="btn btn-primary" :disabled="!quickAssignTech && !confirmUnassign">
            Guardar Asignación
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Edición -->
    <div v-if="showEditModal" class="modal-overlay">
      <div class="modal" style="max-width: 600px;">
        <div class="modal-header">
          <h2 class="modal-title">Editar Ticket</h2>
        </div>
        <form @submit.prevent="handleSaveEdit" v-if="editingTicket">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Título del Problema</label>
              <input v-model="editingTicket.title" type="text" class="form-input" required placeholder="Ej: No puedo acceder al correo">
            </div>
            <div class="form-group">
              <label class="form-label">Cliente / Empresa</label>
              <select v-model="editingTicket.cliente" class="form-input form-select" required>
                <option value="" disabled>Seleccionar cliente</option>
                <option v-for="c in store.clientes" :key="c._id" :value="c._id">{{ c.nombreEmpresa }} ({{ c.nombreContacto }})</option>
              </select>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Prioridad</label>
                <select v-model="editingTicket.priority" class="form-input form-select">
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Estado</label>
                <select v-model="editingTicket.status" class="form-input form-select">
                  <option value="abierto">Abierto</option>
                  <option value="en progreso">En Progreso</option>
                  <option value="cerrado">Cerrado</option>
                </select>
              </div>
            </div>
            <div class="form-group" v-if="store.currentUser?.role !== 'cliente'">
              <label class="form-label">Asignar a Técnico</label>
              <select v-model="editingTicket.tecnico" class="form-input form-select">
                <option value="">Sin asignar</option>
                <option v-for="t in store.tecnicos" :key="t._id" :value="t._id">{{ t.nombre }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Descripción Detallada</label>
              <textarea v-model="editingTicket.description" class="form-input form-textarea" required placeholder="Describe el problema con el mayor detalle posible..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" @click="showEditModal = false" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de Creación -->
    <div v-if="showCreateModal" class="modal-overlay">
      <div class="modal" style="max-width: 600px;">
        <div class="modal-header">
          <h2 class="modal-title">Crear Nuevo Ticket</h2>
        </div>
        <form @submit.prevent="handleCreateTicket">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Título del Problema</label>
              <input v-model="newTicket.title" type="text" class="form-input" required placeholder="Ej: No puedo acceder al correo">
            </div>
            <div class="form-group" v-if="store.currentUser?.role !== 'cliente'">
              <label class="form-label">Cliente / Empresa</label>
              <select v-model="newTicket.cliente" class="form-input form-select" required>
                <option value="" disabled>Seleccionar cliente</option>
                <option v-for="c in store.clientes" :key="c._id" :value="c._id">{{ c.nombreEmpresa }} ({{ c.nombreContacto }})</option>
              </select>
            </div>
            <!-- Si es cliente, mostrar su empresa pero no dejar cambiarla si no tiene permiso -->
            <div class="form-group" v-else>
              <label class="form-label">Empresa Asociada</label>
              <select v-model="newTicket.cliente" class="form-input form-select" disabled>
                <option v-for="c in store.clientes" :key="c._id" :value="c._id">{{ c.nombreEmpresa || c.company || 'Cargando empresa...' }}</option>
              </select>
              <p v-if="store.clientes.length === 0" style="font-size: 0.75rem; color: var(--destructive); margin-top: 0.25rem;">
                ⚠️ No se han podido cargar tus datos de empresa.
              </p>
              <p v-else style="font-size: 0.75rem; color: var(--muted-foreground); margin-top: 0.25rem;">
                Tu ticket se asociará automáticamente a la empresa indicada.
              </p>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Prioridad</label>
                <select v-model="newTicket.priority" class="form-input form-select">
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div class="form-group" v-if="store.currentUser?.role !== 'cliente'">
                <label class="form-label">Asignar a Técnico</label>
                <select v-model="newTicket.tecnico" class="form-input form-select">
                  <option value="">Sin asignar</option>
                <option v-for="t in store.tecnicos" :key="t._id" :value="t._id">{{ t.nombre }}</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Descripción Detallada</label>
              <textarea v-model="newTicket.description" class="form-input form-textarea" required placeholder="Describe el problema con el mayor detalle posible..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" @click="showCreateModal = false" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary">Crear Ticket</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
