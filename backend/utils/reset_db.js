const mongoose = require('mongoose');

async function resetDB() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/MyApp');
        console.log('📦 Conectado a MongoDB para limpieza...');

        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        console.log('Colecciones encontradas:', collectionNames);

        // Listas de colecciones a procesar
        const toDrop = ['tecnicos', 'albaranis', 'trabajadors', 'technicians']; // Basura antigua
        const toClear = ['clientes', 'tickets', 'trabajadores', 'albarans', 'albaranes', 'calllogs']; // Datos actuales

        for (const name of collectionNames) {
            if (toDrop.includes(name.toLowerCase())) {
                await mongoose.connection.db.dropCollection(name);
                console.log(`🗑️  Colección obsoleta eliminada: ${name}`);
            } else if (toClear.includes(name.toLowerCase())) {
                await mongoose.connection.db.collection(name).deleteMany({});
                console.log(`✨ Datos limpiados en: ${name}`);
            }
        }

        console.log('✅ Base de datos reseteada y limpia.');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
        process.exit(1);
    }
}

resetDB();
