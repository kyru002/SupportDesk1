const mongoose = require("mongoose");

const ClienteSchema = new mongoose.Schema({
    nombreContacto: {
        type: String,
        required: true,
        trim: true
    },
    nombreEmpresa: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    telefono: {
        type: String,
        trim: true
    },
    usuarioAsociado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trabajador',
        default: null
    },
    horasUsadas: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Cliente", ClienteSchema);
