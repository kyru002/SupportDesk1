const Trabajador = require('../models/Trabajador');

async function seedDatabase() {
    try {
        const accounts = [
            {
                nombre: 'Administrador Senior',
                email: 'admin@support.com',
                password: 'admin123',
                role: 'admin',
                puesto: 'Administrador del Sistema'
            },
            {
                nombre: 'Técnico de Soporte',
                email: 'tecnico@support.com',
                password: 'tecnico123',
                role: 'tecnico',
                puesto: 'Técnico Nivel 1'
            }
        ];

        for (const acc of accounts) {
            let user = await Trabajador.findOne({ email: acc.email });

            if (!user) {
                user = new Trabajador({
                    ...acc,
                    estado: 'activo',
                    contraseñaTemporal: false
                });
                await user.save();
                console.log(`✅ Usuario creado: ${acc.email} (${acc.role})`);
            } else {
                // Forzar actualización de password y rol para asegurar que las credenciales de la documentación funcionan
                user.password = acc.password;
                user.role = acc.role;
                user.nombre = acc.nombre;
                user.estado = 'activo';
                user.contraseñaTemporal = false;
                await user.save();
                console.log(`🔄 Credenciales sincronizadas para: ${acc.email} (${acc.role})`);
            }
        }
    } catch (error) {
        console.error('❌ Error en el seeder:', error);
    }
}

module.exports = seedDatabase;
