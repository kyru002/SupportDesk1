const mongoose = require('mongoose');
const Trabajador = require('../models/Trabajador');

async function createAdmin() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/MyApp');
        console.log('📦 Conectado a MongoDB para crear admin...');

        const accounts = [
            { email: 'admin@soporte.com', role: 'admin', nombre: 'Administrador' },
            { email: 'admin@support.com', role: 'admin', nombre: 'Administrador' },
            { email: 'tecnico@support.com', role: 'trabajador', nombre: 'Técnico de Soporte' },
            { email: 'tecnico@soporte.com', role: 'trabajador', nombre: 'Técnico de Soporte' }
        ];

        for (const acc of accounts) {
            const existingUser = await Trabajador.findOne({ email: acc.email });

            if (existingUser) {
                console.log(`⚠️  El usuario ${acc.email} ya existe. Actualizando...`);
                existingUser.password = acc.role === 'admin' ? 'admin123' : 'tecnico123';
                existingUser.estado = 'activo';
                existingUser.role = acc.role;
                await existingUser.save();
            } else {
                const newUser = new Trabajador({
                    nombre: acc.nombre,
                    email: acc.email,
                    password: acc.role === 'admin' ? 'admin123' : 'tecnico123',
                    role: acc.role,
                    puesto: acc.role === 'admin' ? 'Administrador Senior' : 'Técnico Nivel 1',
                    estado: 'activo',
                    contraseñaTemporal: false
                });
                await newUser.save();
                console.log(`✅ Usuario ${acc.email} (${acc.role}) creado.`);
            }
        }

        console.log('📧 Email: admin@soporte.com');
        console.log('🔑 Password: admin123');

        const verificado = await Trabajador.findOne({ email: 'admin@support.com' });
        const esValida = await verificado.comparePassword('admin123');
        console.log('🔍 VERIFICACIÓN FINAL:');
        console.log('📧 Email:', verificado.email);
        console.log('🔑 Password admin123 es válida:', esValida);
        console.log('✅ Estado:', verificado.estado);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creand admin:', error);
        process.exit(1);
    }
}

createAdmin();
