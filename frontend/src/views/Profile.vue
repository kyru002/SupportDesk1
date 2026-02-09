<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/appStore';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building,
  Lock,
  Eye,
  EyeOff,
  X,
  CheckCircle
} from 'lucide-vue-next';

const router = useRouter();
const store = useAppStore();

const showChangePasswordModal = ref(false);
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const showCurrentPass = ref(false);
const showNewPass = ref(false);
const changePassMessage = ref('');
const changePassError = ref(false);

const openChangePasswordModal = () => {
  currentPassword.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
  changePassMessage.value = '';
  changePassError.value = false;
  showChangePasswordModal.value = true;
};

const handleChangePassword = async () => {
  changePassMessage.value = '';
  changePassError.value = false;

  // Validaciones
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    changePassMessage.value = 'Por favor completa todos los campos';
    changePassError.value = true;
    return;
  }

  if (newPassword.value.length < 6) {
    changePassMessage.value = 'La nueva contraseña debe tener al menos 6 caracteres';
    changePassError.value = true;
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    changePassMessage.value = 'Las contraseñas no coinciden';
    changePassError.value = true;
    return;
  }

  if (currentPassword.value === newPassword.value) {
    changePassMessage.value = 'La nueva contraseña debe ser diferente a la actual';
    changePassError.value = true;
    return;
  }

  try {
    const userId = store.currentUser?._id || store.currentUser?.id;
    if (!userId) {
      changePassMessage.value = 'Error: No se pudo identificar el usuario';
      changePassError.value = true;
      return;
    }

    await store.cambiarPasswordTrabajador(userId, {
      passwordActual: currentPassword.value,
      passwordNueva: newPassword.value
    });

    changePassMessage.value = '✓ Contraseña cambiada correctamente';
    changePassError.value = false;

    setTimeout(() => {
      showChangePasswordModal.value = false;
    }, 2000);
  } catch (error) {
    changePassMessage.value = error.response?.data?.message || 'Error al cambiar la contraseña';
    changePassError.value = true;
  }
};
</script>

<template>
  <div class="page-content">
    <!-- Header -->
    <div class="page-header">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <button @click="router.back()" class="btn btn-ghost btn-icon">
          <ArrowLeft />
        </button>
        <div>
          <h1 class="page-title">Mi Perfil</h1>
          <p class="page-subtitle">Gestiona tu información y configuración</p>
        </div>
      </div>
    </div>

    <!-- Tarjeta de Información del Perfil -->
    <div class="card" style="max-width: 600px; margin: 0 auto;">
      <!-- Avatar y nombre -->
      <div style="display: flex; align-items: center; gap: 1.5rem; padding: 2rem; border-bottom: 1px solid var(--border);">
        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, var(--primary), var(--primary-hover)); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem; font-weight: 600; flex-shrink: 0;">
          {{ store.currentUser?.name?.charAt(0)?.toUpperCase() || 'U' }}
        </div>
        <div>
          <h2 style="margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 600;">{{ store.currentUser?.name || 'Usuario' }}</h2>
          <p style="margin: 0; color: var(--muted-foreground); font-size: 0.875rem;">{{ store.currentUser?.role === 'admin' ? 'Administrador' : store.currentUser?.role === 'tecnico' ? 'Técnico' : store.currentUser?.role === 'cliente' ? 'Cliente' : 'Usuario' }}</p>
        </div>
      </div>

      <!-- Información del usuario -->
      <div style="padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Email -->
        <div style="display: flex; align-items: flex-start; gap: 1rem;">
          <div style="width: 40px; height: 40px; background-color: var(--muted); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <Mail style="width: 20px; height: 20px; color: var(--primary);" />
          </div>
          <div style="flex: 1; min-width: 0;">
            <p style="margin: 0 0 0.25rem 0; font-size: 0.875rem; color: var(--muted-foreground); font-weight: 500;">Correo Electrónico</p>
            <p style="margin: 0; font-size: 0.95rem; word-break: break-all;">{{ store.currentUser?.email || 'No disponible' }}</p>
          </div>
        </div>

        <!-- Teléfono -->
        <div style="display: flex; align-items: flex-start; gap: 1rem;">
          <div style="width: 40px; height: 40px; background-color: var(--muted); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <Phone style="width: 20px; height: 20px; color: var(--primary);" />
          </div>
          <div style="flex: 1; min-width: 0;">
            <p style="margin: 0 0 0.25rem 0; font-size: 0.875rem; color: var(--muted-foreground); font-weight: 500;">Teléfono</p>
            <p style="margin: 0; font-size: 0.95rem;">{{ store.currentUser?.telefono || 'No disponible' }}</p>
          </div>
        </div>

        <!-- Empresa (si aplica) -->
        <div v-if="store.currentUser?.empresa" style="display: flex; align-items: flex-start; gap: 1rem;">
          <div style="width: 40px; height: 40px; background-color: var(--muted); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <Building style="width: 20px; height: 20px; color: var(--primary);" />
          </div>
          <div style="flex: 1; min-width: 0;">
            <p style="margin: 0 0 0.25rem 0; font-size: 0.875rem; color: var(--muted-foreground); font-weight: 500;">Empresa</p>
            <p style="margin: 0; font-size: 0.95rem;">{{ typeof store.currentUser.empresa === 'object' ? store.currentUser.empresa.nombreEmpresa : store.currentUser.empresa || 'No disponible' }}</p>
          </div>
        </div>

        <!-- ID de Usuario -->
        <div style="display: flex; align-items: flex-start; gap: 1rem;">
          <div style="width: 40px; height: 40px; background-color: var(--muted); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <User style="width: 20px; height: 20px; color: var(--primary);" />
          </div>
          <div style="flex: 1; min-width: 0;">
            <p style="margin: 0 0 0.25rem 0; font-size: 0.875rem; color: var(--muted-foreground); font-weight: 500;">ID de Usuario</p>
            <p style="margin: 0; font-size: 0.875rem; font-family: monospace; color: var(--muted-foreground);">{{ store.currentUser?._id || store.currentUser?.id || 'No disponible' }}</p>
          </div>
        </div>
      </div>

      <!-- Separador -->
      <div style="height: 1px; background-color: var(--border);"></div>

      <!-- Botón para cambiar contraseña -->
      <div style="padding: 2rem; display: flex; gap: 1rem;">
        <button @click="openChangePasswordModal" class="btn btn-primary" style="display: flex; align-items: center; gap: 0.5rem; width: 100%; justify-content: center; padding: 0.75rem 1.5rem; font-weight: 600;">
          <Lock style="width: 18px; height: 18px;" />
          Cambiar Contraseña
        </button>
      </div>
    </div>

    <!-- Modal para cambiar contraseña -->
    <div v-if="showChangePasswordModal" class="modal-overlay" @click.self="showChangePasswordModal = false">
      <div class="modal" style="max-width: 400px;">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h2 class="modal-title" style="margin: 0;">
            <Lock style="width: 20px; height: 20px; display: inline; margin-right: 0.5rem;" />
            Cambiar Contraseña
          </h2>
          <button @click="showChangePasswordModal = false" class="btn btn-ghost" style="padding: 0.25rem;">
            <X style="width: 18px; height: 18px;" />
          </button>
        </div>

        <div class="modal-body">
          <!-- Mensaje de estado -->
          <div v-if="changePassMessage" :style="{ 
            padding: '0.75rem', 
            borderRadius: 'var(--radius)', 
            marginBottom: '1rem',
            backgroundColor: changePassError ? '#fee2e2' : '#d1fae5',
            color: changePassError ? '#991b1b' : '#065f46',
            fontSize: '0.875rem',
            fontWeight: 500
          }">
            {{ changePassMessage }}
          </div>

          <div class="form-group">
            <label class="form-label">Contraseña Actual</label>
            <div class="input-with-icon" style="position: relative;">
              <input 
                :type="showCurrentPass ? 'text' : 'password'" 
                v-model="currentPassword" 
                class="form-input" 
                placeholder="Ingresa tu contraseña actual"
              />
              <button 
                @click="showCurrentPass = !showCurrentPass" 
                class="btn btn-ghost" 
                style="position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); padding: 0.25rem;"
              >
                <component :is="showCurrentPass ? EyeOff : Eye" style="width: 16px; height: 16px;" />
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Nueva Contraseña</label>
            <div class="input-with-icon" style="position: relative;">
              <input 
                :type="showNewPass ? 'text' : 'password'" 
                v-model="newPassword" 
                class="form-input" 
                placeholder="Ingresa tu nueva contraseña"
              />
              <button 
                @click="showNewPass = !showNewPass" 
                class="btn btn-ghost" 
                style="position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); padding: 0.25rem;"
              >
                <component :is="showNewPass ? EyeOff : Eye" style="width: 16px; height: 16px;" />
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Confirmar Nueva Contraseña</label>
            <input 
              type="password" 
              v-model="confirmPassword" 
              class="form-input" 
              placeholder="Repite tu nueva contraseña"
            />
          </div>
        </div>

        <div class="modal-footer" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
          <button @click="showChangePasswordModal = false" class="btn btn-secondary">
            Cancelar
          </button>
          <button @click="handleChangePassword" class="btn btn-primary" style="display: flex; align-items: center; gap: 0.5rem;">
            <Lock style="width: 16px; height: 16px;" />
            Cambiar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
  backdrop-filter: blur(4px);
}

.modal {
  background-color: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease-out;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, var(--muted) 0%, var(--background) 100%);
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--foreground);
  margin: 0;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  background-color: var(--muted);
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
