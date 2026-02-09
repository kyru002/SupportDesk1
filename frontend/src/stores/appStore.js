import { defineStore } from 'pinia';
import { ticketsService, tecnicosService, clientesService, albaranesService, trabajadoresService } from '../services/api';

export const useAppStore = defineStore('app', {
    state: () => ({
        tickets: [],
        tecnicos: [],
        clientes: [],
        albaranes: [],
        trabajadores: [],
        loading: false,
        currentUser: JSON.parse(localStorage.getItem('currentUser')) || null,
    }),
    actions: {
        async fetchAll() {
            this.loading = true;
            try {
                // Si es cliente, filtrar tickets y albaranes por su ID
                let ticketsPromise;
                let albaranesPromise;
                let tecnicosPromise;
                let clientesPromise;
                let trabajadoresPromise;

                if (this.currentUser?.role === 'cliente') {
                    // Coger el ID de empresa tanto si está en clienteId como en empresa
                    const cid = this.currentUser.empresa?._id || this.currentUser.empresa || this.currentUser.clienteId;
                    const cleanId = typeof cid === 'object' ? (cid._id || cid.id) : cid;

                    console.log('Fetching for client ID:', cleanId);

                    ticketsPromise = ticketsService.getAll({ clienteId: cleanId });
                    albaranesPromise = albaranesService.getAll({ cliente: cleanId });

                    // Cargar los datos de la empresa propia para que aparezca en el modal de tickets
                    clientesPromise = cleanId ? clientesService.getById(cleanId).then(c => [c]).catch(() => []) : Promise.resolve([]);

                    // Cargar trabajadores de la empresa
                    trabajadoresPromise = cleanId ? trabajadoresService.getByEmpresa(cleanId).catch(() => []) : Promise.resolve([]);

                    tecnicosPromise = Promise.resolve([]);
                } else {
                    ticketsPromise = ticketsService.getAll();
                    albaranesPromise = albaranesService.getAll();
                    tecnicosPromise = trabajadoresService.getEquipo();
                    clientesPromise = clientesService.getAll();
                    trabajadoresPromise = trabajadoresService.getAll();
                }

                // Ejecutar en paralelo pero capturar errores individualmente para no bloquear todo
                const results = await Promise.allSettled([
                    ticketsPromise,
                    tecnicosPromise,
                    clientesPromise,
                    albaranesPromise,
                    trabajadoresPromise
                ]);

                if (results[0].status === 'fulfilled') this.tickets = results[0].value;
                else console.error('Error fetching tickets:', results[0].reason);

                if (results[1].status === 'fulfilled') this.tecnicos = results[1].value;
                else console.error('Error fetching tecnicos:', results[1].reason);

                if (results[2].status === 'fulfilled') this.clientes = results[2].value;
                else console.error('Error fetching clientes:', results[2].reason);

                if (results[3].status === 'fulfilled') this.albaranes = results[3].value;
                else console.error('Error fetching albaranes:', results[3].reason);

                if (results[4].status === 'fulfilled') this.trabajadores = results[4].value;
                else console.error('Error fetching trabajadores:', results[4].reason);

            } catch (error) {
                console.error('Unexpected error in fetchAll:', error);
            } finally {
                this.loading = false;
            }
        },
        async createTicket(data) {
            // Limpiar campos que puedan ser strings vacíos para evitar errores de casting en el backend
            const cleanData = { ...data };
            if (!cleanData.tecnico) delete cleanData.tecnico;

            const newTicket = await ticketsService.create(cleanData);
            this.tickets.unshift(newTicket);
            return newTicket;
        },
        async createTecnico(data) {
            const newTecnico = await tecnicosService.create(data);
            this.tecnicos.unshift(newTecnico);
            return newTecnico;
        },
        async createCliente(data) {
            const newCliente = await clientesService.create(data);
            this.clientes.unshift(newCliente);
            return newCliente;
        },
        async updateCliente(id, data) {
            const updatedCliente = await clientesService.update(id, data);
            const index = this.clientes.findIndex(c => c._id === id);
            if (index !== -1) {
                this.clientes[index] = updatedCliente;
            }
            return updatedCliente;
        },
        async deleteCliente(id) {
            await clientesService.delete(id);
            this.clientes = this.clientes.filter(c => c._id !== id);
        },
        async createTrabajador(data) {
            const nuevoTrabajador = await trabajadoresService.create(data);
            this.trabajadores.unshift(nuevoTrabajador);

            // Si el nuevo trabajador no es cliente, añadirlo también a la lista de técnicos para asignación
            if (nuevoTrabajador.role !== 'cliente') {
                this.tecnicos.push(nuevoTrabajador);
                this.tecnicos.sort((a, b) => a.nombre.localeCompare(b.nombre));
            }

            return nuevoTrabajador;
        },
        async updateTrabajador(id, data) {
            const updatedTrabajador = await trabajadoresService.update(id, data);

            // Actualizar en la lista general de trabajadores
            const tIndex = this.trabajadores.findIndex(t => t._id === id);
            if (tIndex !== -1) this.trabajadores[tIndex] = updatedTrabajador;

            // Actualizar en la lista de técnicos asignables
            const techIndex = this.tecnicos.findIndex(t => t._id === id);
            if (techIndex !== -1) {
                if (updatedTrabajador.role === 'cliente') {
                    // Si el rol cambió a cliente, quitar de técnicos
                    this.tecnicos.splice(techIndex, 1);
                } else {
                    this.tecnicos[techIndex] = updatedTrabajador;
                }
            } else if (updatedTrabajador.role !== 'cliente') {
                // Si antes no era técnico y ahora sí, añadirlo
                this.tecnicos.push(updatedTrabajador);
            }

            this.tecnicos.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
            return updatedTrabajador;
        },
        async deleteTrabajador(id) {
            await trabajadoresService.delete(id);
            this.trabajadores = this.trabajadores.filter(t => t._id !== id);
            this.tecnicos = this.tecnicos.filter(t => t._id !== id);
        },
        async cambiarPasswordTrabajador(id, data) {
            return await trabajadoresService.cambiarPassword(id, data);
        },
        async updateTecnico(id, data) {
            const updatedTecnico = await tecnicosService.update(id, data);
            const index = this.tecnicos.findIndex(t => t._id === id);
            if (index !== -1) {
                this.tecnicos[index] = updatedTecnico;
            }
            return updatedTecnico;
        },
        async deleteTecnico(id) {
            await tecnicosService.delete(id);
            this.tecnicos = this.tecnicos.filter(t => t._id !== id);
        },
        async updateTicket(id, data) {
            const updatedTicket = await ticketsService.update(id, data);
            const index = this.tickets.findIndex(t => t._id === id);
            if (index !== -1) {
                this.tickets[index] = updatedTicket;
            }
            return updatedTicket;
        },
        async deleteTicket(id) {
            await ticketsService.delete(id);
            this.tickets = this.tickets.filter(t => t._id !== id);
        },
        async getTicketMessages(id) {
            return await ticketsService.getMessages(id);
        },
        async sendTicketMessage(id, messageData) {
            const updatedTicket = await ticketsService.sendMessage(id, messageData);
            const index = this.tickets.findIndex(t => t._id === id);
            if (index !== -1) {
                this.tickets[index] = updatedTicket;
            }
            return updatedTicket;
        },
        async createAlbaran(data) {
            const nuevoAlbaran = await albaranesService.create(data);
            this.albaranes.unshift(nuevoAlbaran);
            return nuevoAlbaran;
        },
        async updateAlbaran(id, data) {
            const updatedAlbaran = await albaranesService.update(id, data);
            const index = this.albaranes.findIndex(a => a._id === id);
            if (index !== -1) {
                this.albaranes[index] = updatedAlbaran;
            }
            return updatedAlbaran;
        },
        async deleteAlbaran(id) {
            await albaranesService.delete(id);
            this.albaranes = this.albaranes.filter(a => a._id !== id);
        },
        async cambiarEstadoAlbaran(id, estado) {
            const updatedAlbaran = await albaranesService.cambiarEstado(id, estado);
            const index = this.albaranes.findIndex(a => a._id === id);
            if (index !== -1) {
                this.albaranes[index] = updatedAlbaran;
            }
            return updatedAlbaran;
        },
        async entregarAlbaran(id, firmante) {
            const updatedAlbaran = await albaranesService.entregar(id, firmante);
            const index = this.albaranes.findIndex(a => a._id === id);
            if (index !== -1) {
                this.albaranes[index] = updatedAlbaran;
            }
            return updatedAlbaran;
        },
        logout() {
            this.currentUser = null;
            localStorage.removeItem('currentUser');
        },
        login(user) {
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
        }
    },
    getters: {
        // Contar tickets sin asignar (tecnico === null)
        ticketsSinAsignar: (state) => {
            return state.tickets.filter(t => !t.tecnico || t.tecnico === null).length;
        },
    },
});
