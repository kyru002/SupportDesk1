<script setup>
import { onMounted, ref } from 'vue';
import { useAppStore } from '../stores/appStore';
import { 
  Plus, 
  Search, 
  Mail, 
  Shield, 
  Circle,
  MoreVertical,
  UserPlus
} from 'lucide-vue-next';

const store = useAppStore();
const showCreateModal = ref(false);
const newTecnico = ref({
  nombre: '',
  email: '',
  role: 'tecnico',
  puesto: 'Técnico de Soporte',
  empresa: '', 
  estado: 'activo',
  telefono: ''
});

onMounted(async () => {
  await store.fetchAll();
});

const editingTecnico = ref(null);
const showEditModal = ref(false);
const showMenuId = ref(null);

const handleCreateTecnico = async () => {
  try {
    // Si el administrador tiene una empresa asociada, usarla por defecto
    if (!newTecnico.value.empresa && store.currentUser?.clienteId) {
      newTecnico.value.empresa = store.currentUser.clienteId;
    }
    
    await store.createTrabajador({ ...newTecnico.value, empresa: newTecnico.value.empresa || undefined });
    showCreateModal.value = false;
    newTecnico.value = { 
        nombre: '', 
        email: '', 
        role: 'tecnico', 
        puesto: 'Técnico de Soporte', 
        empresa: '', 
        estado: 'activo',
        telefono: ''
    };
    alert('Miembro del equipo creado con éxito. Se le ha asignado una contraseña temporal.');
  } catch (error) {
    console.error('Error al crear trabajador:', error);
    alert(`Error al crear el miembro: ${error.response?.data?.message || error.message || 'Error desconocido'}`);
  }
};

const handleEditTecnico = (tecnico) => {
  editingTecnico.value = { ...tecnico };
  showEditModal.value = true;
  showMenuId.value = null;
};

const handleSaveEdit = async () => {
  try {
    await store.updateTrabajador(editingTecnico.value._id, editingTecnico.value);
    showEditModal.value = false;
    editingTecnico.value = null;
  } catch (error) {
    alert('Error al actualizar el miembro del equipo');
  }
};

const handleDeleteTecnico = async (tecnicoId) => {
  if (confirm('¿Estás seguro de que quieres eliminar este miembro del equipo?')) {
    try {
      await store.deleteTrabajador(tecnicoId);
      showMenuId.value = null;
    } catch (error) {
      alert('Error al eliminar el miembro');
    }
  }
};

const toggleMenu = (tecnicoId) => {
  showMenuId.value = showMenuId.value === tecnicoId ? null : tecnicoId;
};
</script>

<template>
  <div class="page-content">
    <div class="page-header">
      <div>
        <h1 class="page-title">Equipo de Soporte</h1>
        <p class="page-subtitle">Administra los técnicos y sus roles en el sistema</p>
      </div>
      <button @click="showCreateModal = true" class="btn btn-primary">
        <UserPlus />
        Nuevo Miembro
      </button>
    </div>

    <!-- Tabla de Técnicos -->
    <div class="card">
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Miembro</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Tickets</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tecnico in store.tecnicos" :key="tecnico._id">
              <td>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <div class="sidebar-avatar">{{ tecnico.nombre.charAt(0) }}</div>
                  <div>
                    <div style="font-weight: 500;">{{ tecnico.nombre }}</div>
                    <div style="font-size: 0.75rem; color: var(--muted-foreground);">{{ tecnico.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div style="display: flex; align-items: center; gap: 0.375rem; font-size: 0.875rem;">
                  <Shield style="width: 14px; height: 14px; color: var(--primary);" />
                  {{ tecnico.role === 'admin' ? 'Administrador' : 'Técnico' }}
                </div>
              </td>
              <td>
                <span class="badge" :class="tecnico.estado === 'activo' || tecnico.estado === 'active' ? 'badge-active' : 'badge-inactive'">
                  {{ tecnico.estado === 'activo' || tecnico.estado === 'active' ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>{{ tecnico.ticketsAssigned || 0 }}</td>
              <td>
                <div style="position: relative;">
                  <button @click="toggleMenu(tecnico._id)" class="btn btn-ghost btn-icon">
                    <MoreVertical />
                  </button>
                  <div v-if="showMenuId === tecnico._id" style="position: absolute; right: 0; top: 100%; background: white; border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-md); z-index: 10; min-width: 150px;">
                    <button @click="handleEditTecnico(tecnico)" style="display: block; width: 100%; text-align: left; padding: 0.5rem 1rem; border: none; background: transparent; cursor: pointer; font-size: 0.875rem;" type="button">
                      Editar
                    </button>
                    <button @click="handleDeleteTecnico(tecnico._id)" style="display: block; width: 100%; text-align: left; padding: 0.5rem 1rem; border: none; background: transparent; cursor: pointer; font-size: 0.875rem; color: var(--destructive);" type="button">
                      Eliminar
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal de Edición -->
    <div v-if="showEditModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Editar Miembro del Equipo</h2>
        </div>
        <form @submit.prevent="handleSaveEdit" v-if="editingTecnico">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nombre Completo</label>
              <input v-model="editingTecnico.nombre" type="text" class="form-input" required placeholder="Ej: Carlos Soporte">
            </div>
            <div class="form-group">
              <label class="form-label">Correo Electrónico</label>
              <input v-model="editingTecnico.email" type="email" class="form-input" required placeholder="carlos@support.com">
            </div>
            <div class="form-group">
              <label class="form-label">Rol del Usuario</label>
              <select v-model="editingTecnico.role" class="form-input form-select" required>
                <option value="tecnico">Técnico</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Estado</label>
              <select v-model="editingTecnico.estado" class="form-input form-select" required>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
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
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Añadir Miembro al Equipo</h2>
        </div>
        <form @submit.prevent="handleCreateTecnico">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nombre Completo</label>
              <input v-model="newTecnico.nombre" type="text" class="form-input" required placeholder="Ej: Carlos Soporte">
            </div>
            <div class="form-group">
              <label class="form-label">Correo Electrónico</label>
              <input v-model="newTecnico.email" type="email" class="form-input" required placeholder="carlos@support.com">
            </div>
            <div class="form-group">
              <label class="form-label">Rol del Usuario</label>
              <select v-model="newTecnico.role" class="form-input form-select" required>
                <option value="tecnico">Técnico</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Puesto / Cargo</label>
              <input v-model="newTecnico.puesto" type="text" class="form-input" required placeholder="Ej: Técnico de Nivel 1">
            </div>
            <div class="form-group">
              <label class="form-label">Empresa Responsable (Opcional)</label>
              <select v-model="newTecnico.empresa" class="form-input form-select">
                <option value="">Ninguna / Interno</option>
                <option v-for="c in store.clientes" :key="c._id" :value="c._id">{{ c.nombreEmpresa }}</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" @click="showCreateModal = false" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary">Añadir Miembro</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
