<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from './stores/appStore';
import Sidebar from './components/Sidebar.vue';

const route = useRoute();
const store = useAppStore();

const isLoginPage = computed(() => route.path === '/login');
</script>

<template>
  <div v-if="isLoginPage">
    <router-view />
  </div>
  <div v-else class="app-layout">
    <Sidebar />
    <main class="main-content with-sidebar">
      <router-view />
    </main>
  </div>
</template>

<style>
/* Los estilos globales están en assets/main.css */
</style>
