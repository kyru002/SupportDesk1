<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/appStore';
import { trabajadoresService } from '../services/api';
import { Building2, User, Mail, Lock, Phone, ArrowLeft, Loader2 } from 'lucide-vue-next';

const router = useRouter();
const store = useAppStore();

const form = ref({
  nombreEmpresa: '',
  nombreContacto: '',
  email: '',
  password: '',
  telefono: ''
});

const loading = ref(false);
const error = ref('');
const success = ref(false);

const handleRegister = async () => {
  loading.value = true;
  error.value = '';
  try {
    await trabajadoresService.registerEmpresa(form.value);
    
    success.value = true;
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-page">
    <div class="card login-card" style="max-width: 500px;">
      <div v-if="!success">
        <div class="login-header">
          <div class="login-logo">
            <Building2 />
          </div>
          <h1 class="login-title">Registro de Empresa</h1>
          <p class="login-description">Crea una cuenta para tu empresa y empieza a gestionar tickets</p>
        </div>

        <div class="login-body">
          <div v-if="error" class="login-error">
            {{ error }}
          </div>

          <form @submit.prevent="handleRegister">
            <div class="form-group">
              <label class="form-label">Nombre de la Empresa</label>
              <div class="input-with-icon">
                <Building2 />
                <input v-model="form.nombreEmpresa" type="text" class="form-input" placeholder="Ej: Mi Empresa S.L." required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Persona de Contacto</label>
              <div class="input-with-icon">
                <User />
                <input v-model="form.nombreContacto" type="text" class="form-input" placeholder="Tu nombre completo" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Correo Electrónico</label>
              <div class="input-with-icon">
                <Mail />
                <input v-model="form.email" type="email" class="form-input" placeholder="correo@empresa.com" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Teléfono (Opcional)</label>
              <div class="input-with-icon">
                <Phone />
                <input v-model="form.telefono" type="tel" class="form-input" placeholder="912 345 678">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Contraseña</label>
              <div class="input-with-icon">
                <Lock />
                <input v-model="form.password" type="password" class="form-input" placeholder="••••••••" required minlength="6">
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem; height: 44px;" :disabled="loading">
              <Loader2 v-if="loading" class="animate-spin" style="margin-right: 0.5rem;" />
              Registrar Empresa
            </button>
          </form>

          <div style="margin-top: 1.5rem; text-align: center;">
            <router-link to="/login" class="btn btn-ghost" style="font-size: 0.875rem;">
              <ArrowLeft style="width: 16px; height: 16px; margin-right: 0.5rem;" />
              Volver al Login
            </router-link>
          </div>
        </div>
      </div>

      <div v-else style="padding: 2rem; text-align: center;">
        <div style="width: 64px; height: 64px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
          <Building2 style="width: 32px; height: 32px;" />
        </div>
        <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--foreground); margin-bottom: 0.5rem;">¡Registro con éxito!</h2>
        <p style="color: var(--muted-foreground); margin-bottom: 2rem;">Tu empresa ha sido registrada correctamente. Te estamos redirigiendo al login...</p>
        <div class="loader-spinner" style="margin: 0 auto;"></div>
      </div>
    </div>
  </div>
</template>
