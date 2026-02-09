const mongoose = require('mongoose');
const Cliente = require('../models/Cliente');
const Trabajador = require('../models/Trabajador');
const Ticket = require('../models/Ticket');

async function seedEmpresaDemo() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/MyApp');
        console.log('📦 Conectado para seed...');

        // 1. Crear Empresa
        let empresa = await Cliente.findOne({ nombreEmpresa: 'Empresa Demo S.A.' });
        if (!empresa) {
            empresa = new Cliente({
                nombreEmpresa: 'Empresa Demo S.A.',
                nombreContacto: 'Juan Empresa',
                email: 'contacto@demo.com',
                telefono: '123456789',
                direccion: 'Calle Falsa 123',
                cif: 'B12345678'
            });
            await empresa.save();
            console.log('✅ Empresa Demo creada');
        }

        // 2. Crear Usuario Cliente vinculado a la empresa
        const emailCliente = 'cliente@support.com';
        let userCliente = await Trabajador.findOne({ email: emailCliente });

        if (userCliente) {
            userCliente.empresa = empresa._id;
            userCliente.role = 'cliente';
            userCliente.estado = 'activo';
            userCliente.password = 'cliente123';
            await userCliente.save();
            console.log('✅ Usuario cliente actualizado y vinculado a empresa');
        } else {
            userCliente = new Trabajador({
                nombre: 'Usuario Demo Empresa',
                email: emailCliente,
                password: 'cliente123',
                role: 'cliente',
                empresa: empresa._id,
                puesto: 'Gerente',
                estado: 'activo'
            });
            await userCliente.save();
            console.log('✅ Nuevo usuario cliente creado y vinculado');
        }

        // 3. Crear un ticket de prueba para esta empresa
        const ticketExistente = await Ticket.findOne({ title: 'Error de conexión en oficina' });
        if (!ticketExistente) {
            const ticket = new Ticket({
                title: 'Error de conexión en oficina',
                description: 'No podemos conectar al servidor principal desde esta mañana.',
                cliente: empresa._id,
                status: 'abierto',
                priority: 'alta',
                startDate: new Date(),
                messages: [
                    {
                        author: 'Juan Empresa',
                        role: 'cliente',
                        content: 'Hola, tenemos problemas con la conexión.',
                        createdAt: new Date()
                    }
                ]
            });
            await ticket.save();
            console.log('✅ Ticket de prueba creado');
        }

        console.log('\n🚀 DATOS DE ACCESO PARA PRUEBA:');
        console.log('📧 Email:', emailCliente);
        console.log('🔑 Pass: cliente123');
        console.log('🏢 Empresa vinculada:', empresa.nombreEmpresa);

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error en seed:', error);
    }
}

seedEmpresaDemo();
