const mongoose = require("mongoose");

const AlbaranSchema = new mongoose.Schema({
    numeroAlbaran: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    cliente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cliente',
        required: true
    },
    tecnico: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trabajador',
        required: false
    },
    ticket: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket',
        required: false
    },
    estado: {
        type: String,
        enum: ["pendiente", "entregado", "devuelto", "cancelado"],
        default: "pendiente",
        required: true
    },
    fechaAlbaran: {
        type: Date,
        default: Date.now,
        required: true
    },
    fechaEntrega: {
        type: Date
    },
    descripcion: {
        type: String,
        required: false,
        trim: true
    },
    lineas: [
        {
            concepto: {
                type: String,
                required: true,
                trim: true
            },
            cantidad: {
                type: Number,
                required: true,
                min: 0.01
            },
            precio: {
                type: Number,
                required: false,
                default: 0,
                min: 0
            },
            importe: {
                type: Number,
                required: false,
                default: 0,
                min: 0
            }
        }
    ],
    subtotal: {
        type: Number,
        default: 0,
        min: 0
    },
    porcentajeIVA: {
        type: Number,
        default: 21,
        min: 0,
        max: 100
    },
    iva: {
        type: Number,
        default: 0,
        min: 0
    },
    total: {
        type: Number,
        default: 0,
        min: 0
    },
    notas: {
        type: String,
        trim: true
    },
    observaciones: {
        type: String,
        trim: true
    },
    anexos: [
        {
            nombre: String,
            url: String,
            fecha: {
                type: Date,
                default: Date.now
            }
        }
    ],
    firmante: {
        nombre: String,
        apellidos: String,
        dni: String,
        fecha: Date
    }
}, {
    timestamps: true
});

// Middleware para calcular automáticamente totales
AlbaranSchema.pre('save', async function () {
    try {
        // Las líneas solo contienen concepto y cantidad (horas)
        // No hay cálculo de subtotal/IVA en este modelo simplificado
    } catch (error) {
        console.error('Error en middleware pre save:', error);
        throw error;
    }
});

module.exports = mongoose.model("Albaran", AlbaranSchema);
