<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/appStore';
import { trabajadoresService } from '../services/api';
import { Ticket, Mail, Lock, AlertCircle } from 'lucide-vue-next';

const router = useRouter();
const store = useAppStore();

const email = ref('');
const password = ref('');
const error = ref('');

const handleLogin = async () => {
  error.value = '';
  try {
    const data = await trabajadoresService.login(email.value, password.value);
    
    store.login({
      id: data.trabajador._id,
      name: data.trabajador.nombre,
      email: data.trabajador.email,
      role: data.trabajador.role,
      clienteId: data.trabajador.empresa?._id || data.trabajador.empresa,
      token: data.token
    });
    
    router.push('/dashboard');
  } catch (err) {
    error.value = err.message || 'Error al conectar con el servidor';
  }
};
</script>

<template>
  <div class="login-page">
    <div class="card login-card">
      <div class="login-header">
        <div class="login-logo">
          <Ticket />
        </div>
        <h1 class="login-title">SupportDesk</h1>
        <p class="login-description">Loguéate si eres una empresa o técnico</p>
      </div>

      <div class="login-body">
        <div v-if="error" class="login-error">
          <AlertCircle style="width: 16px; height: 16px;" />
          {{ error }}
        </div>

        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label class="form-label">Correo Electrónico</label>
            <div class="input-with-icon">
              <Mail />
              <input v-model="email" type="email" class="form-input" placeholder="correo@ejemplo.com" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Contraseña</label>
            <div class="input-with-icon">
              <Lock />
              <input v-model="password" type="password" class="form-input" placeholder="••••••••" required>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem; height: 44px;">
            Iniciar Sesión
          </button>
        </form>

        <div style="margin-top: 1.5rem; text-align: center;">
          <p style="font-size: 0.875rem; color: var(--muted-foreground); margin-bottom: 0.5rem;">¿Eres una empresa nueva?</p>
          <router-link to="/register" class="btn btn-ghost" style="width: 100%;">
            Registrar mi Empresa
          </router-link>
        </div>

        <div class="login-demo">
          <div class="login-demo-title">CUENTAS DE DEMOSTRACIÓN</div>
          <div class="login-demo-credentials">
            <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb;">
              <strong style="color: #6366f1;">Administrador:</strong><br>
              Email: <strong>admin@support.com</strong><br>
              Pass: <strong>admin123</strong>
            </div>
            <div>
              <strong style="color: #f59e0b;">Técnico:</strong><br>
              Email: <strong>tecnico@support.com</strong><br>
              Pass: <strong>tecnico123</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
