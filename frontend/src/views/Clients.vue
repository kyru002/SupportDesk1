<script setup>
import { onMounted, ref, computed } from 'vue';
import { useAppStore } from '../stores/appStore';
import { 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Building2,
  Edit,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  Copy,
  Lock
} from 'lucide-vue-next';

const store = useAppStore();
const showCreateModal = ref(false);
const newClient = ref({
  nombreContacto: '',
  nombreEmpresa: '',
  email: '',
  telefono: ''
});

onMounted(async () => {
  await store.fetchAll();
});

const editingClient = ref(null);
const showEditModal = ref(false);
const expandedClientId = ref(null);
const searchQuery = ref('');

// Trabajadores
const showTrabajadorModal = ref(false);
const selectedClientForTrabajador = ref(null);
const newTrabajador = ref({
  nombre: '',
  email: '',
  telefono: '',
  puesto: 'Cliente'
});
const editingTrabajador = ref(null);
const showEditTrabajadorModal = ref(false);
const showPasswordModal = ref(false);
const passwordToCopy = ref('');
const trabajadoresPorEmpresa = ref({});

// Computadas
const filteredClientes = computed(() => {
  if (!searchQuery.value) return store.clientes;
  const query = searchQuery.value.toLowerCase();
  return store.clientes.filter(c =>
    c.nombreEmpresa?.toLowerCase().includes(query) ||
    c.nombreContacto?.toLowerCase().includes(query) ||
    c.email?.toLowerCase().includes(query)
  );
});

// Funciones para clientes
const openCreateModal = () => {
  newClient.value = {
    nombreContacto: '',
    nombreEmpresa: '',
    email: '',
    telefono: ''
  };
  showCreateModal.value = true;
};

const handleCreateClient = async () => {
  if (!newClient.value.nombreContacto || !newClient.value.nombreEmpresa || !newClient.value.email) {
    alert('Por favor completa todos los campos requeridos');
    return;
  }
  try {
    await store.createCliente(newClient.value);
    showCreateModal.value = false;
    alert('Empresa creada correctamente');
  } catch (err) {
    alert('Error al crear empresa: ' + err.message);
  }
};

const editClient = (client) => {
  editingClient.value = { ...client };
  showEditModal.value = true;
};

const handleUpdateClient = async () => {
  try {
    await store.updateCliente(editingClient.value._id, editingClient.value);
    showEditModal.value = false;
    alert('Empresa actualizada correctamente');
  } catch (err) {
    alert('Error al actualizar: ' + err.message);
  }
};

const handleDeleteClient = async (id) => {
  if (!confirm('¿Estás seguro de que deseas eliminar esta empresa?')) {
    return;
  }
  try {
    await store.deleteCliente(id);
    alert('Empresa eliminada correctamente');
  } catch (err) {
    alert('Error al eliminar: ' + err.message);
  }
};

const toggleExpand = (clientId) => {
  if (expandedClientId.value === clientId) {
    expandedClientId.value = null;
  } else {
    expandedClientId.value = clientId;
    // Los trabajadores se obtienen del store a través de getTrabajadoresEmpresa()
  }
};

// Funciones para trabajadores
const openTrabajadorModal = (client) => {
  selectedClientForTrabajador.value = client;
  newTrabajador.value = {
    nombre: '',
    email: '',
    telefono: '',
    puesto: 'Cliente'
  };
  showTrabajadorModal.value = true;
};

const handleCreateTrabajador = async () => {
  if (!newTrabajador.value.nombre || !newTrabajador.value.email) {
    alert('Por favor completa nombre y email');
    return;
  }

  try {
    const trabajadorData = {
      nombre: newTrabajador.value.nombre,
      email: newTrabajador.value.email,
      telefono: newTrabajador.value.telefono,
      puesto: 'Cliente',
      role: 'cliente',
      empresa: selectedClientForTrabajador.value._id
    };
    
    const result = await store.createTrabajador(trabajadorData);
    
    // El store.trabajadores se actualiza automáticamente en createTrabajador
    // getTrabajadoresEmpresa() lo recogerá desde el store
    
    // Mostrar modal con contraseña temporal
    if (result.contraseñaTemporalTexto) {
      passwordToCopy.value = result.contraseñaTemporalTexto;
      showPasswordModal.value = true;
    }
    
    // Limpiar formulario
    newTrabajador.value = {
      nombre: '',
      email: '',
      telefono: '',
      puesto: 'Cliente'
    };
    
    showTrabajadorModal.value = false;
    alert('Trabajador creado correctamente');
  } catch (err) {
    alert('Error al crear trabajador: ' + err.message);
  }
};

const editTrabajador = (trabajador) => {
  editingTrabajador.value = { ...trabajador };
  showEditTrabajadorModal.value = true;
};

const handleUpdateTrabajador = async () => {
  try {
    await store.updateTrabajador(editingTrabajador.value._id, editingTrabajador.value);
    
    // El store.trabajadores se actualiza automáticamente
    // getTrabajadoresEmpresa() lo recogerá desde el store
    
    showEditTrabajadorModal.value = false;
    alert('Trabajador actualizado correctamente');
  } catch (err) {
    alert('Error al actualizar: ' + err.message);
  }
};

const handleDeleteTrabajador = async (trabajadorId, empresaId) => {
  if (!confirm('¿Estás seguro de que deseas eliminar este trabajador?')) {
    return;
  }
  try {
    await store.deleteTrabajador(trabajadorId);
    
    // El store.trabajadores se actualiza automáticamente
    // getTrabajadoresEmpresa() lo recogerá desde el store
    
    alert('Trabajador eliminado correctamente');
  } catch (err) {
    alert('Error al eliminar: ' + err.message);
  }
};

const copyPassword = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    alert('Contraseña copiada al portapapeles');
  } catch (err) {
    alert('Error al copiar: ' + err.message);
  }
};

const getTrabajadoresEmpresa = (clientId) => {
  // Obtener trabajadores del store en lugar de local state
  // Esto asegura que siempre se muestren los datos del servidor
  return store.trabajadores.filter(t => {
    const empresaId = t.empresa?._id || t.empresa;
    const clientIdStr = clientId._id || clientId;
    return empresaId === clientIdStr || empresaId === String(clientIdStr);
  });
};
</script>

<template>
  <div class="page-content">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">Empresas</h1>
      <button v-if="store.currentUser?.role === 'admin'" @click="openCreateModal" class="btn btn-primary">
        <Plus style="width: 18px; height: 18px;" />
        Nueva Empresa
      </button>
    </div>

    <!-- Search Bar -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <input
        v-model="searchQuery"
        type="text"
        class="form-input"
        placeholder="Buscar por nombre de empresa, contacto o email..."
        style="margin: 0;"
      />
    </div>

    <!-- Clientes Grid -->
    <div v-if="filteredClientes.length === 0" class="empty-state">
      <Building2 style="width: 48px; height: 48px;" />
      <p class="empty-state-text">No hay empresas registradas</p>
    </div>

    <div v-else style="display: grid; gap: 1rem;">
      <div
        v-for="cliente in filteredClientes"
        :key="cliente._id"
        class="card"
        style="overflow: hidden;"
      >
        <!-- Header de Empresa -->
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          cursor: pointer;
          background-color: var(--background);
          border-bottom: 1px solid var(--border);
        "
        @click="toggleExpand(cliente._id)"
        >
          <div style="flex: 1; display: flex; align-items: center; gap: 1rem;">
            <div style="
              width: 48px;
              height: 48px;
              background-color: var(--primary-light);
              border-radius: 0.5rem;
              display: flex;
              align-items: center;
              justify-content: center;
              color: var(--primary);
              flex-shrink: 0;
            ">
              <Building2 style="width: 24px; height: 24px;" />
            </div>
            
            <div style="flex: 1; min-width: 0;">
              <h3 style="margin: 0 0 0.25rem 0; font-weight: 600;">{{ cliente.nombreEmpresa }}</h3>
              <p style="margin: 0; font-size: 0.875rem; color: var(--muted-foreground);">
                {{ cliente.nombreContacto }} • {{ cliente.email }}
              </p>
              <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
                <span v-if="cliente.telefono" style="
                  font-size: 0.75rem;
                  color: var(--muted-foreground);
                  display: flex;
                  align-items: center;
                  gap: 0.25rem;
                ">
                  <Phone style="width: 14px; height: 14px;" />
                  {{ cliente.telefono }}
                </span>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; align-items: center;">
            <div style="text-align: right;">
              <div style="font-weight: 600; color: var(--primary); font-size: 1.125rem;">
                {{ getTrabajadoresEmpresa(cliente._id).length }}
              </div>
              <div style="font-size: 0.75rem; color: var(--muted-foreground);">trabajadores</div>
            </div>

            <div style="text-align: right; padding: 0 0.75rem; border-left: 1px solid var(--border);">
              <div style="font-weight: 600; color: var(--success); font-size: 1.125rem;">
                {{ cliente.horasUsadas || 0 }}h
              </div>
              <div style="font-size: 0.75rem; color: var(--muted-foreground);">horas usadas</div>
            </div>
            
            <button
              v-if="store.currentUser?.role === 'admin'"
              @click.stop="editClient(cliente)"
              class="btn btn-ghost btn-icon"
              title="Editar empresa"
            >
              <Edit style="width: 18px; height: 18px;" />
            </button>
            
            <button
              v-if="store.currentUser?.role === 'admin'"
              @click.stop="handleDeleteClient(cliente._id)"
              class="btn btn-ghost btn-icon"
              title="Eliminar empresa"
              style="color: var(--destructive);"
            >
              <Trash2 style="width: 18px; height: 18px;" />
            </button>

            <div :style="{ transform: expandedClientId === cliente._id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }">
              <ChevronDown style="width: 20px; height: 20px; color: var(--muted-foreground);" />
            </div>
          </div>
        </div>

        <!-- Detalles Expandidos -->
        <div v-if="expandedClientId === cliente._id" style="
          padding: 1.5rem;
          background-color: var(--muted);
          border-top: 1px solid var(--border);
        ">
          <!-- Trabajadores Section -->
          <div style="margin-bottom: 1.5rem;">
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 1rem;
            ">
              <h4 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <Users style="width: 18px; height: 18px;" />
                Trabajadores de {{ cliente.nombreEmpresa }}
              </h4>
              <button
                @click="openTrabajadorModal(cliente)"
                class="btn btn-primary"
                style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; font-size: 0.85rem;"
              >
                <Plus style="width: 16px; height: 16px;" />
                Añadir Trabajador
              </button>
            </div>

            <!-- Lista de Trabajadores -->
            <div v-if="getTrabajadoresEmpresa(cliente._id).length === 0" style="
              padding: 1rem;
              text-align: center;
              color: var(--muted-foreground);
              border-radius: 0.5rem;
              background-color: var(--background);
            ">
              <Users style="width: 32px; height: 32px; opacity: 0.3; margin-bottom: 0.5rem;" />
              <p style="margin: 0;">No hay trabajadores asignados aún</p>
            </div>

            <div v-else style="display: flex; flex-direction: column; gap: 0.75rem;">
              <div
                v-for="trabajador in getTrabajadoresEmpresa(cliente._id)"
                :key="trabajador._id"
                style="
                  padding: 1rem;
                  background-color: var(--background);
                  border-radius: 0.5rem;
                  border: 1px solid var(--border);
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  gap: 1rem;
                "
              >
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 500; margin-bottom: 0.25rem;">{{ trabajador.nombre }}</div>
                  <div style="
                    font-size: 0.875rem;
                    color: var(--muted-foreground);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                  ">
                    <span style="display: flex; align-items: center; gap: 0.25rem;">
                      <Mail style="width: 14px; height: 14px;" />
                      {{ trabajador.email }}
                    </span>
                    <span v-if="trabajador.puesto" style="
                      background-color: var(--primary-light);
                      color: var(--primary);
                      padding: 0.2rem 0.5rem;
                      border-radius: 3px;
                      font-size: 0.75rem;
                    ">{{ trabajador.puesto }}</span>
                    <span v-if="trabajador.contraseñaTemporal" style="
                      background-color: #fef3c7;
                      color: #b45309;
                      padding: 0.2rem 0.5rem;
                      border-radius: 3px;
                      font-size: 0.75rem;
                      display: flex;
                      align-items: center;
                      gap: 0.25rem;
                    ">
                      <Lock style="width: 12px; height: 12px;" />
                      Contraseña temporal
                    </span>
                  </div>
                </div>

                <div style="display: flex; gap: 0.5rem;">
                  <button
                    @click="editTrabajador(trabajador)"
                    class="btn btn-ghost btn-icon"
                    title="Editar trabajador"
                  >
                    <Edit style="width: 16px; height: 16px;" />
                  </button>
                  <button
                    @click="handleDeleteTrabajador(trabajador._id, cliente._id)"
                    class="btn btn-ghost btn-icon"
                    style="color: var(--destructive);"
                    title="Eliminar trabajador"
                  >
                    <Trash2 style="width: 16px; height: 16px;" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Crear Empresa -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Nueva Empresa</h2>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleCreateClient">
            <div class="form-group">
              <label class="form-label">Nombre de la Empresa *</label>
              <input v-model="newClient.nombreEmpresa" type="text" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Nombre de Contacto Principal *</label>
              <input v-model="newClient.nombreContacto" type="text" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Email *</label>
              <input v-model="newClient.email" type="email" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input v-model="newClient.telefono" type="tel" class="form-input" />
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button @click="showCreateModal = false" class="btn btn-secondary">Cancelar</button>
          <button @click="handleCreateClient" class="btn btn-primary">Crear Empresa</button>
        </div>
      </div>
    </div>

    <!-- Modal Editar Empresa -->
    <div v-if="showEditModal && editingClient" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Editar Empresa</h2>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleUpdateClient">
            <div class="form-group">
              <label class="form-label">Nombre de la Empresa</label>
              <input v-model="editingClient.nombreEmpresa" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Nombre de Contacto</label>
              <input v-model="editingClient.nombreContacto" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input v-model="editingClient.email" type="email" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input v-model="editingClient.telefono" type="tel" class="form-input" />
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button @click="showEditModal = false" class="btn btn-secondary">Cancelar</button>
          <button @click="handleUpdateClient" class="btn btn-primary">Actualizar</button>
        </div>
      </div>
    </div>

    <!-- Modal Crear Trabajador -->
    <div v-if="showTrabajadorModal && selectedClientForTrabajador" class="modal-overlay" @click.self="showTrabajadorModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Nuevo Trabajador - {{ selectedClientForTrabajador.nombreEmpresa }}</h2>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleCreateTrabajador">
            <div class="form-group">
              <label class="form-label">Nombre Completo *</label>
              <input v-model="newTrabajador.nombre" type="text" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Email *</label>
              <input v-model="newTrabajador.email" type="email" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input v-model="newTrabajador.telefono" type="tel" class="form-input" />
            </div>
            <div class="form-group" style="background-color: #f0f4f8; padding: 1rem; border-radius: 0.5rem; margin-top: 1rem;">
              <p style="margin: 0; font-size: 0.875rem; color: #64748b;">
                <strong>Rol asignado:</strong> Cliente de {{ selectedClientForTrabajador.nombreEmpresa }}
              </p>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button @click="showTrabajadorModal = false" class="btn btn-secondary">Cancelar</button>
          <button @click="handleCreateTrabajador" class="btn btn-primary">Crear Trabajador</button>
        </div>
      </div>
    </div>

    <!-- Modal Editar Trabajador -->
    <div v-if="showEditTrabajadorModal && editingTrabajador" class="modal-overlay" @click.self="showEditTrabajadorModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Editar Trabajador</h2>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleUpdateTrabajador">
            <div class="form-group">
              <label class="form-label">Nombre Completo</label>
              <input v-model="editingTrabajador.nombre" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input v-model="editingTrabajador.email" type="email" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input v-model="editingTrabajador.telefono" type="tel" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Puesto</label>
              <select v-model="editingTrabajador.puesto" class="form-input form-select">
                <option value="Técnico">Técnico</option>
                <option value="Gerente">Gerente</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Administrativo">Administrativo</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Estado</label>
              <select v-model="editingTrabajador.estado" class="form-input form-select">
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="suspendido">Suspendido</option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button @click="showEditTrabajadorModal = false" class="btn btn-secondary">Cancelar</button>
          <button @click="handleUpdateTrabajador" class="btn btn-primary">Actualizar</button>
        </div>
      </div>
    </div>

    <!-- Modal Mostrar Contraseña Temporal -->
    <div v-if="showPasswordModal" class="modal-overlay" @click.self="showPasswordModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Contraseña Temporal Generada</h2>
        </div>
        <div class="modal-body" style="text-align: center;">
          <div style="
            background-color: var(--muted);
            padding: 1.5rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            border: 2px solid var(--primary-light);
          ">
            <p style="color: var(--muted-foreground); margin-bottom: 0.5rem; font-size: 0.875rem;">
              Contraseña temporal (guárdala en un lugar seguro):
            </p>
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 0.5rem;
              background-color: var(--background);
              padding: 0.75rem 1rem;
              border-radius: 0.5rem;
              font-weight: 600;
              font-family: monospace;
              margin-bottom: 1rem;
            ">
              <span style="flex: 1; word-break: break-all;">{{ passwordToCopy }}</span>
              <button
                @click="copyPassword(passwordToCopy)"
                class="btn btn-primary btn-icon"
                title="Copiar al portapapeles"
              >
                <Copy style="width: 16px; height: 16px;" />
              </button>
            </div>
            <p style="color: var(--muted-foreground); font-size: 0.875rem; margin: 0;">
              El trabajador deberá cambiarla en su primer acceso.
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showPasswordModal = false" class="btn btn-primary">Entendido</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ticket-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 0.75rem;
  background-color: var(--card);
  transition: background-color 0.15s ease;
  cursor: pointer;
}

.ticket-list-item:hover {
  background-color: var(--muted);
}

.message-item {
  padding: 0.75rem;
  background-color: var(--background);
  border-radius: 6px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
