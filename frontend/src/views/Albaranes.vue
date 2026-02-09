<script setup>
import { onMounted, ref, computed } from 'vue';
import { useAppStore } from '../stores/appStore';
import { 
  Plus, 
  Search, 
  FileText,
  Package,
  CheckCircle,
  Clock,
  ExternalLink,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-vue-next';

const store = useAppStore();
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showMenuId = ref(null);
const editingAlbaran = ref(null);
const searchQuery = ref('');
const filterEstado = ref('');
const filterTecnico = ref('');
const expandedAlbaranId = ref(null);

const newAlbaran = ref({
  numeroAlbaran: '',
  cliente: '',
  tecnico: '',
  ticket: '',
  descripcion: '',
  lineas: [],
  porcentajeIVA: 21,
  notas: '',
  observaciones: ''
});

const newLinea = ref({
  concepto: '',
  cantidad: 1,
  precio: 0,
  importe: 0
});

const generarNumeroAlbaran = async () => {
  try {
    const year = new Date().getFullYear();
    const albaran = store.albaranes
      .filter(a => a.numeroAlbaran.includes(`ALB-${year}`))
      .sort((a, b) => {
        const numA = parseInt(a.numeroAlbaran.split('-')[2]);
        const numB = parseInt(b.numeroAlbaran.split('-')[2]);
        return numB - numA;
      })[0];
    
    let nextNumber = 1;
    if (albaran) {
      const lastNumber = parseInt(albaran.numeroAlbaran.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    
    return `ALB-${year}-${String(nextNumber).padStart(3, '0')}`;
  } catch (err) {
    console.error('Error al generar número de albarán:', err);
    return `ALB-${Date.now()}`;
  }
};

onMounted(async () => {
  await store.fetchAll();
  
  // Verificar si hay datos de ticket pre-llenados desde TicketDetail
  const ticketAlbaranData = sessionStorage.getItem('ticketAlbaranData');
  if (ticketAlbaranData) {
    try {
      const data = JSON.parse(ticketAlbaranData);
      
      // Generar el número de albarán automáticamente
      const numeroAlbaranGenerado = await generarNumeroAlbaran();
      
      newAlbaran.value = {
        ...newAlbaran.value,
        ...data,
        numeroAlbaran: numeroAlbaranGenerado
      };
      // Limpiar del sessionStorage después de usarlo
      sessionStorage.removeItem('ticketAlbaranData');
      // Abrir automáticamente el modal de creación
      showCreateModal.value = true;
    } catch (err) {
      console.error('Error al cargar datos del ticket:', err);
    }
  }
});

const albaranesFiltered = computed(() => {
  return store.albaranes.filter(albaran => {
    const matchesSearch = albaran.numeroAlbaran.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          (albaran.cliente?.nombreEmpresa || '').toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesEstado = !filterEstado.value || albaran.estado === filterEstado.value;
    const matchesTecnico = !filterTecnico.value || albaran.tecnico?._id === filterTecnico.value;
    return matchesSearch && matchesEstado && matchesTecnico;
  });
});

const calcularImporte = () => {
  // Función removida - solo se necesita concepto y cantidad (horas)
};

const agregarLinea = () => {
  // Validar que todos los campos estén completo
  if (!newLinea.value.concepto || newLinea.value.concepto.trim() === '') {
    alert('Por favor, ingresa el concepto');
    return;
  }
  
  const cantidad = parseFloat(newLinea.value.cantidad);
  if (isNaN(cantidad) || cantidad <= 0) {
    alert('La cantidad debe ser un número mayor a 0');
    return;
  }
  
  const precio = parseFloat(newLinea.value.precio) || 0;
  const importe = cantidad * precio;
  
  // Agregar la línea con valores parseados correctamente
  newAlbaran.value.lineas.push({
    concepto: newLinea.value.concepto.trim(),
    cantidad: parseFloat(newLinea.value.cantidad),
    precio: precio,
    importe: importe
  });
  
  // Limpiar formulario
  newLinea.value = {
    concepto: '',
    cantidad: 1,
    precio: 0,
    importe: 0
  };
  
  alert('Línea agregada correctamente');
};

const eliminarLinea = (index) => {
  newAlbaran.value.lineas.splice(index, 1);
};

const handleCreateAlbaran = async () => {
  try {
    // Validar campos requeridos
    if (!newAlbaran.value.numeroAlbaran || newAlbaran.value.numeroAlbaran.trim() === '') {
      alert('Por favor, ingresa el número de albarán');
      return;
    }
    
    if (!newAlbaran.value.cliente) {
      alert('Por favor, selecciona un cliente');
      return;
    }
    
    if (newAlbaran.value.lineas.length === 0) {
      alert('Debes agregar al menos una línea. Completa los campos (Concepto, Cantidad, Precio) y haz clic en el botón "+" para agregar');
      return;
    }

    // Validar que todas las líneas tengan concepto y cantidad
    const lineasValidas = newAlbaran.value.lineas.every(linea => {
      console.log('Validando línea:', linea);
      return linea.concepto && 
             linea.concepto.trim() !== '' &&
             typeof linea.cantidad === 'number' && 
             linea.cantidad > 0;
    });

    if (!lineasValidas) {
      alert('Todas las líneas deben tener concepto y cantidad (horas) válidos');
      console.error('Líneas inválidas:', newAlbaran.value.lineas);
      return;
    }

    // Preparar datos con tipos correctos
    const datosAlbaran = {
      numeroAlbaran: newAlbaran.value.numeroAlbaran.trim(),
      cliente: newAlbaran.value.cliente,
      tecnico: newAlbaran.value.tecnico || null,
      ticket: newAlbaran.value.ticket || null,
      estado: 'pendiente',
      descripcion: newAlbaran.value.descripcion || '',
      lineas: newAlbaran.value.lineas.map(linea => ({
        concepto: String(linea.concepto).trim(),
        cantidad: Number(linea.cantidad),
        precio: Number(linea.precio) || 0,
        importe: Number(linea.cantidad) * (Number(linea.precio) || 0)
      })),
      notas: newAlbaran.value.notas || ''
    };

    console.log('Enviando albarán:', JSON.stringify(datosAlbaran, null, 2));
    
    const respuesta = await store.createAlbaran(datosAlbaran);
    console.log('Respuesta del servidor:', respuesta);
    
    showCreateModal.value = false;
    newAlbaran.value = {
      numeroAlbaran: '',
      cliente: '',
      tecnico: '',
      ticket: '',
      descripcion: '',
      lineas: [],
      porcentajeIVA: 21,
      notas: '',
      observaciones: ''
    };
    alert('¡Albarán creado correctamente!');
  } catch (error) {
    console.error('Error al crear albarán:', error);
    console.error('Respuesta de error:', error.response?.data);
    alert('Error al crear el albarán: ' + (error.response?.data?.message || error.message));
  }
};

const handleEditAlbaran = (albaran) => {
  editingAlbaran.value = { ...albaran };
  showEditModal.value = true;
  showMenuId.value = null;
};

const handleSaveEdit = async () => {
  try {
    await store.updateAlbaran(editingAlbaran.value._id, editingAlbaran.value);
    showEditModal.value = false;
    editingAlbaran.value = null;
  } catch (error) {
    alert('Error al actualizar el albarán: ' + error.message);
  }
};

const handleDeleteAlbaran = async (albaranId) => {
  if (confirm('¿Estás seguro de que quieres eliminar este albarán?')) {
    try {
      await store.deleteAlbaran(albaranId);
      showMenuId.value = null;
    } catch (error) {
      alert('Error al eliminar el albarán');
    }
  }
};

const handleEntregarAlbaran = async (albaranId) => {
  const nombre = prompt('Nombre del firmante:');
  if (nombre) {
    try {
      await store.entregarAlbaran(albaranId, { nombre });
    } catch (error) {
      alert('Error al marcar como entregado: ' + error.message);
    }
  }
};

const toggleMenu = (albaranId) => {
  showMenuId.value = showMenuId.value === albaranId ? null : albaranId;
};

const calcularTotales = (albaran) => {
  const subtotal = albaran.lineas.reduce((sum, linea) => sum + (linea.importe || 0), 0);
  const iva = subtotal * (albaran.porcentajeIVA / 100);
  return {
    subtotal: subtotal.toFixed(2),
    iva: iva.toFixed(2),
    total: (subtotal + iva).toFixed(2)
  };
};

const getEstadoColor = (estado) => {
  const colores = {
    'pendiente': 'badge-in-progress',
    'entregado': 'badge-abierto',
    'devuelto': 'badge-cerrado',
    'cancelado': 'badge-cerrado'
  };
  return colores[estado] || 'badge-medium';
};

const getEstadoTexto = (estado) => {
  const textos = {
    'pendiente': '⏳ Pendiente',
    'entregado': '✓ Entregado',
    'devuelto': '↩️ Devuelto',
    'cancelado': '✗ Cancelado'
  };
  return textos[estado] || estado;
};
</script>

<template>
  <div class="page-content">
    <div class="page-header">
      <div>
        <h1 class="page-title">Albaranes</h1>
        <p class="page-subtitle">Gestiona los albaranes de entrega</p>
      </div>
      <button v-if="store.currentUser?.role !== 'cliente'" @click="showCreateModal = true" class="btn btn-primary">
        <Plus />
        Nuevo Albarán
      </button>
    </div>

    <!-- Barra de Filtros -->
    <div class="card" style="margin-bottom: 1.5rem; padding: 1rem;">
      <div class="filters-bar">
        <div class="input-with-icon" style="flex: 1;">
          <Search />
          <input v-model="searchQuery" type="text" class="form-input" placeholder="Buscar por número o cliente...">
        </div>
        <select v-model="filterEstado" class="form-input form-select">
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="entregado">Entregado</option>
          <option value="devuelto">Devuelto</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select v-if="store.currentUser?.role !== 'cliente'" v-model="filterTecnico" class="form-input form-select">
          <option value="">Todos los técnicos</option>
          <option v-for="t in store.tecnicos" :key="t._id" :value="t._id">{{ t.nombre }}</option>
        </select>
      </div>
    </div>

    <!-- Resumen de Estadísticas -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
      <div class="card" style="padding: 1rem; text-align: center; border-top: 3px solid #6366f1; background: linear-gradient(135deg, #f0f4ff 0%, #ffffff 100%);">
        <div style="font-size: 2rem; font-weight: 700; color: #6366f1;">
          {{ store.albaranes.length }}
        </div>
        <div style="font-size: 0.75rem; color: var(--muted-foreground); margin-top: 0.5rem; text-transform: uppercase; font-weight: 600;">
          Total
        </div>
      </div>

      <div class="card" style="padding: 1rem; text-align: center; border-top: 3px solid #f59e0b; background: linear-gradient(135deg, #fff8f0 0%, #ffffff 100%);">
        <div style="font-size: 2rem; font-weight: 700; color: #f59e0b;">
          {{ store.albaranes.filter(a => a.estado === 'pendiente').length }}
        </div>
        <div style="font-size: 0.75rem; color: var(--muted-foreground); margin-top: 0.5rem; text-transform: uppercase; font-weight: 600;">
          ⏳ Pendientes
        </div>
      </div>

      <div class="card" style="padding: 1rem; text-align: center; border-top: 3px solid #10b981; background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);">
        <div style="font-size: 2rem; font-weight: 700; color: #10b981;">
          {{ store.albaranes.filter(a => a.estado === 'entregado').length }}
        </div>
        <div style="font-size: 0.75rem; color: var(--muted-foreground); margin-top: 0.5rem; text-transform: uppercase; font-weight: 600;">
          ✓ Entregados
        </div>
      </div>

      <div class="card" style="padding: 1rem; text-align: center; border-top: 3px solid #ef4444; background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);">
        <div style="font-size: 2rem; font-weight: 700; color: #ef4444;">
          {{ store.albaranes.filter(a => a.estado === 'devuelto' || a.estado === 'cancelado').length }}
        </div>
        <div style="font-size: 0.75rem; color: var(--muted-foreground); margin-top: 0.5rem; text-transform: uppercase; font-weight: 600;">
          Otros
        </div>
      </div>
    </div>    <!-- Lista de Albaranes -->
    <div v-if="albaranesFiltered.length === 0" class="empty-state">
      <FileText style="width: 48px; height: 48px; opacity: 0.2; margin-bottom: 1rem;" />
      <p>No se encontraron albaranes.</p>
    </div>

    <div v-else style="display: grid; grid-template-columns: 1fr; gap: 1.5rem;">
      <div v-for="albaran in albaranesFiltered" :key="albaran._id" class="card" style="overflow: hidden; border-left: 4px solid; border-left-color: var(--primary);">
        <!-- Encabezado del Albarán - CLICKEABLE -->
        <div 
          @click="expandedAlbaranId = expandedAlbaranId === albaran._id ? null : albaran._id"
          style="display: flex; justify-content: space-between; align-items: flex-start; padding: 1.25rem; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border-bottom: 2px solid var(--border); cursor: pointer; transition: background 0.2s ease;"
          :style="{ backgroundColor: expandedAlbaranId === albaran._id ? '#f3f4f6' : 'transparent' }"
        >
          <div style="flex: 1;">
            <div style="display: flex; align-items: baseline; gap: 1rem; margin-bottom: 0.5rem;">
              <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--foreground);">
                {{ albaran.numeroAlbaran }}
              </h3>
              <span 
                class="badge" 
                :class="getEstadoColor(albaran.estado)"
                style="padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 600;"
              >
                {{ getEstadoTexto(albaran.estado) }}
              </span>
            </div>
            <div style="font-size: 0.85rem; color: var(--muted-foreground);">
              📅 {{ new Date(albaran.fechaAlbaran).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) }}
            </div>
          </div>

          <!-- Chevron + Acciones -->
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <!-- Chevron -->
            <div 
              style="
                display: flex; 
                align-items: center; 
                justify-content: center;
                width: 32px; 
                height: 32px;
                border-radius: 0.5rem;
                background: #e5e7eb;
                transition: transform 0.3s ease;
              "
              :style="{ transform: expandedAlbaranId === albaran._id ? 'rotate(90deg)' : 'rotate(0deg)' }"
            >
              <svg style="width: 18px; height: 18px; color: #6b7280;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>

            <!-- Acciones -->
            <div v-if="store.currentUser?.role !== 'cliente'" style="position: relative;" @click.stop>
              <button @click="toggleMenu(albaran._id)" class="btn btn-ghost btn-icon" title="Opciones">
                <MoreVertical style="width: 20px; height: 20px;" />
              </button>
              <div v-if="showMenuId === albaran._id" style="position: absolute; right: 0; top: 100%; background: white; border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-lg); z-index: 10; min-width: 160px;">
                <button @click="handleEditAlbaran(albaran)" style="display: block; width: 100%; text-align: left; padding: 0.75rem 1rem; border: none; background: transparent; cursor: pointer; font-size: 0.875rem; border-bottom: 1px solid var(--border); transition: background 0.15s;" class="hover:bg-muted" type="button">
                  ✏️ Editar
                </button>
                <button @click="handleEntregarAlbaran(albaran._id)" v-if="albaran.estado === 'pendiente'" style="display: block; width: 100%; text-align: left; padding: 0.75rem 1rem; border: none; background: transparent; cursor: pointer; font-size: 0.875rem; color: var(--success); border-bottom: 1px solid var(--border); transition: background 0.15s;" type="button">
                  ✓ Entregar
                </button>
                <button @click="handleDeleteAlbaran(albaran._id)" style="display: block; width: 100%; text-align: left; padding: 0.75rem 1rem; border: none; background: transparent; cursor: pointer; font-size: 0.875rem; color: var(--destructive); transition: background 0.15s;" type="button">
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Información Principal - SIEMPRE VISIBLE -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1.5rem; padding: 1.25rem; background: white;">
          <!-- Cliente -->
          <div v-if="store.currentUser?.role !== 'cliente'">
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground); text-transform: uppercase; margin-bottom: 0.5rem;">
              🏢 Cliente
            </div>
            <div style="font-size: 0.95rem; font-weight: 600; color: var(--foreground);">
              {{ albaran.cliente?.nombreEmpresa || 'N/A' }}
            </div>
          </div>

          <!-- Horas Totales -->
          <div>
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground); text-transform: uppercase; margin-bottom: 0.5rem;">
              ⏱️ Horas
            </div>
            <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary);">
              {{ albaran.lineas.reduce((sum, l) => sum + (l.cantidad || 0), 0) }}h
            </div>
          </div>

          <!-- Técnico -->
          <div v-if="store.currentUser?.role !== 'cliente'">
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground); text-transform: uppercase; margin-bottom: 0.5rem;">
              👨‍🔧 Técnico
            </div>
            <div style="font-size: 0.9rem; font-weight: 600; color: var(--foreground);">
              {{ albaran.tecnico?.nombre || '—' }}
            </div>
          </div>

          <!-- Precio Total -->
          <div>
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground); text-transform: uppercase; margin-bottom: 0.5rem;">
              💰 Total
            </div>
            <div style="font-size: 1.3rem; font-weight: 700; color: var(--success);">
              {{ calcularTotales(albaran).total }}€
            </div>
          </div>
        </div>

        <!-- Detalles de líneas - EXPANDIBLE -->
        <transition name="expand" v-if="expandedAlbaranId === albaran._id && albaran.lineas.length > 0">
          <div style="padding: 1.25rem; border-top: 2px solid var(--border); background: #fafbfc; animation: slideDown 0.3s ease;">
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--muted-foreground); margin-bottom: 1rem; text-transform: uppercase;">
              📋 Detalles del Albarán
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="background-color: #e8eef1;">
                  <th style="text-align: left; padding: 0.75rem; font-weight: 700; color: var(--foreground);">Concepto</th>
                  <th style="text-align: center; padding: 0.75rem; font-weight: 700; color: var(--foreground);">Horas</th>
                  <th style="text-align: center; padding: 0.75rem; font-weight: 700; color: var(--foreground);">Precio/H</th>
                  <th style="text-align: center; padding: 0.75rem; font-weight: 700; color: var(--foreground);">Importe</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(linea, index) in albaran.lineas" :key="index" :style="{ backgroundColor: index % 2 === 0 ? 'white' : '#f0f4f8' }">
                  <td style="padding: 0.75rem; border-bottom: 1px solid var(--border);">
                    <span style="font-weight: 500; color: var(--foreground);">{{ linea.concepto }}</span>
                  </td>
                  <td style="text-align: center; padding: 0.75rem; border-bottom: 1px solid var(--border);">
                    <span style="background: #e3f2fd; color: #1976d2; padding: 0.25rem 0.75rem; border-radius: 0.5rem; font-weight: 600;">
                      {{ linea.cantidad }}h
                    </span>
                  </td>
                  <td style="text-align: center; padding: 0.75rem; border-bottom: 1px solid var(--border);">
                    <span style="color: var(--muted-foreground); font-weight: 500;">{{ (linea.precio || 0).toFixed(2) }}€</span>
                  </td>
                  <td style="text-align: center; padding: 0.75rem; border-bottom: 1px solid var(--border);">
                    <span style="background: #f0f4f8; padding: 0.25rem 0.75rem; border-radius: 0.5rem; font-weight: 700; color: var(--primary);">
                      {{ ((linea.cantidad || 0) * (linea.precio || 0)).toFixed(2) }}€
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Resumen de totales -->
            <div style="display: flex; justify-content: flex-end; gap: 2rem; margin-top: 1rem; padding-top: 1rem; border-top: 2px solid var(--border);">
              <div style="text-align: right;">
                <div style="font-size: 0.8rem; color: var(--muted-foreground); margin-bottom: 0.25rem;">Subtotal</div>
                <div style="font-size: 1.1rem; font-weight: 700;">{{ calcularTotales(albaran).subtotal }}€</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 0.8rem; color: var(--muted-foreground); margin-bottom: 0.25rem;">IVA ({{ albaran.porcentajeIVA }}%)</div>
                <div style="font-size: 1.1rem; font-weight: 700;">{{ calcularTotales(albaran).iva }}€</div>
              </div>
              <div style="text-align: right; padding-left: 2rem; border-left: 2px solid var(--border);">
                <div style="font-size: 0.8rem; color: var(--muted-foreground); margin-bottom: 0.25rem;">Total</div>
                <div style="font-size: 1.3rem; font-weight: 700; color: var(--success);">{{ calcularTotales(albaran).total }}€</div>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- Modal de Creación -->
    <div v-if="showCreateModal" class="modal-overlay">
      <div class="modal" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h2 class="modal-title">Crear Nuevo Albarán</h2>
        </div>
        <form @submit.prevent="handleCreateAlbaran">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Número de Albarán</label>
                <input v-model="newAlbaran.numeroAlbaran" type="text" class="form-input" required placeholder="ALB-2026-001">
              </div>
              <div class="form-group">
                <label class="form-label">Cliente *</label>
                <select v-model="newAlbaran.cliente" class="form-input form-select" required>
                  <option value="" disabled>Seleccionar cliente</option>
                  <option v-for="c in store.clientes" :key="c._id" :value="c._id">{{ c.nombreEmpresa }} ({{ c.nombreContacto }})</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Técnico</label>
                <select v-model="newAlbaran.tecnico" class="form-input form-select">
                  <option value="">Sin asignar</option>
                  <option v-for="t in store.tecnicos" :key="t._id" :value="t._id">{{ t.nombre }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Ticket</label>
                <select v-model="newAlbaran.ticket" class="form-input form-select">
                  <option value="">Sin vincular</option>
                  <option v-for="tk in store.tickets" :key="tk._id" :value="tk._id">#{{ tk._id?.slice(-6) }} - {{ tk.title }}</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Descripción</label>
              <input v-model="newAlbaran.descripcion" type="text" class="form-input" placeholder="Descripción general del albarán">
            </div>

            <!-- Agregar líneas -->
            <div style="border-top: 2px solid var(--border); padding-top: 1rem; margin-top: 1rem;">
              <h3 style="font-weight: 600; margin-bottom: 1rem;">Líneas de Albarán *</h3>
              <p style="font-size: 0.85rem; color: var(--muted-foreground); margin-bottom: 1rem;">Completa todos los campos y haz clic en "+" para agregar una línea.</p>
              
              <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 50px; gap: 0.5rem; margin-bottom: 1rem;">
                <div>
                  <label style="font-size: 0.75rem; color: var(--muted-foreground); display: block; margin-bottom: 0.25rem;">Concepto</label>
                  <input v-model="newLinea.concepto" type="text" class="form-input" placeholder="Ej: Reparación monitor">
                </div>
                <div>
                  <label style="font-size: 0.75rem; color: var(--muted-foreground); display: block; margin-bottom: 0.25rem;">Horas</label>
                  <input v-model.number="newLinea.cantidad" type="number" class="form-input" placeholder="1" step="0.25" min="0.25">
                </div>
                <div>
                  <label style="font-size: 0.75rem; color: var(--muted-foreground); display: block; margin-bottom: 0.25rem;">Precio/Hora (€)</label>
                  <input v-model.number="newLinea.precio" type="number" class="form-input" placeholder="0" step="0.01" min="0">
                </div>
                <div style="display: flex; align-items: flex-end;">
                  <button type="button" @click="agregarLinea" class="btn btn-primary" style="width: 100%; padding: 0.5rem; font-weight: 600;">+</button>
                </div>
              </div>

              <!-- Tabla de líneas agregadas -->
              <div v-if="newAlbaran.lineas.length > 0" style="margin-bottom: 1rem; padding: 1rem; background-color: var(--muted); border-radius: var(--radius);">
                <p style="font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem;">✓ {{ newAlbaran.lineas.length }} línea(s) agregada(s)</p>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--border);">
                      <th style="text-align: left; padding: 0.5rem;">Concepto</th>
                      <th style="text-align: center; padding: 0.5rem;">Horas</th>
                      <th style="text-align: center; padding: 0.5rem;">Precio/Hora</th>
                      <th style="text-align: center; padding: 0.5rem;">Importe</th>
                      <th style="text-align: center; padding: 0.5rem;">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(linea, index) in newAlbaran.lineas" :key="index" style="border-bottom: 1px solid var(--border);">
                      <td style="padding: 0.5rem;">{{ linea.concepto }}</td>
                      <td style="text-align: center; padding: 0.5rem;">{{ linea.cantidad }}</td>
                      <td style="text-align: center; padding: 0.5rem;">{{ linea.precio.toFixed(2) }}€</td>
                      <td style="text-align: center; padding: 0.5rem; font-weight: 600;">{{ (linea.cantidad * linea.precio).toFixed(2) }}€</td>
                      <td style="text-align: center; padding: 0.5rem;">
                        <button type="button" @click="eliminarLinea(index)" class="btn btn-ghost btn-icon" style="padding: 0.25rem;">×</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else style="padding: 1rem; background-color: var(--primary-light); border-radius: var(--radius); text-align: center; margin-bottom: 1rem;">
                <p style="font-size: 0.85rem; color: var(--primary);">Aún no hay líneas. Completa los campos y haz clic en "+"</p>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
              <div class="form-group">
                <label class="form-label">Notas</label>
                <input v-model="newAlbaran.notas" type="text" class="form-input" placeholder="Notas adicionales">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Observaciones</label>
              <textarea v-model="newAlbaran.observaciones" class="form-input form-textarea" placeholder="Observaciones..." style="min-height: 60px;"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" @click="showCreateModal = false" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary">Crear Albarán</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de Edición -->
    <div v-if="showEditModal" class="modal-overlay">
      <div class="modal" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h2 class="modal-title">Editar Albarán</h2>
        </div>
        <form @submit.prevent="handleSaveEdit" v-if="editingAlbaran">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Número de Albarán</label>
                <input v-model="editingAlbaran.numeroAlbaran" type="text" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label">Estado</label>
                <select v-model="editingAlbaran.estado" class="form-input form-select">
                  <option value="pendiente">Pendiente</option>
                  <option value="entregado">Entregado</option>
                  <option value="devuelto">Devuelto</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Descripción</label>
              <input v-model="editingAlbaran.descripcion" type="text" class="form-input">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">% IVA</label>
                <input v-model.number="editingAlbaran.porcentajeIVA" type="number" class="form-input" step="0.01" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">Notas</label>
                <input v-model="editingAlbaran.notas" type="text" class="form-input">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Observaciones</label>
              <textarea v-model="editingAlbaran.observaciones" class="form-input form-textarea" style="min-height: 60px;"></textarea>
            </div>

            <!-- Sección de Líneas del Albarán -->
            <div style="border-top: 2px solid var(--border); padding-top: 1rem; margin-top: 1rem;">
              <h3 style="font-weight: 600; margin-bottom: 1rem;">Líneas del Albarán</h3>
              <div v-if="editingAlbaran.lineas && editingAlbaran.lineas.length > 0" style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--border);">
                      <th style="text-align: left; padding: 0.5rem;">Concepto</th>
                      <th style="text-align: center; padding: 0.5rem;">Horas</th>
                      <th style="text-align: center; padding: 0.5rem;">Precio/Hora (€)</th>
                      <th style="text-align: center; padding: 0.5rem;">Importe (€)</th>
                      <th style="text-align: center; padding: 0.5rem;">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(linea, index) in editingAlbaran.lineas" :key="index" style="border-bottom: 1px solid var(--border);">
                      <td style="padding: 0.5rem;">
                        <input v-model="linea.concepto" type="text" class="form-input" style="font-size: 0.85rem;">
                      </td>
                      <td style="text-align: center; padding: 0.5rem;">
                        <input v-model.number="linea.cantidad" type="number" class="form-input" style="font-size: 0.85rem;" step="0.25" min="0.25">
                      </td>
                      <td style="text-align: center; padding: 0.5rem;">
                        <input v-model.number="linea.precio" type="number" class="form-input" style="font-size: 0.85rem;" step="0.01" min="0">
                      </td>
                      <td style="text-align: center; padding: 0.5rem; font-weight: 600;">
                        {{ ((linea.cantidad || 0) * (linea.precio || 0)).toFixed(2) }}€
                      </td>
                      <td style="text-align: center; padding: 0.5rem;">
                        <button type="button" @click="editingAlbaran.lineas.splice(index, 1)" class="btn btn-ghost btn-icon" style="padding: 0.25rem;">×</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else style="padding: 1rem; background-color: var(--muted); border-radius: var(--radius); text-align: center;">
                <p style="font-size: 0.85rem; color: var(--muted-foreground);">No hay líneas en este albarán</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" @click="showEditModal = false" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
