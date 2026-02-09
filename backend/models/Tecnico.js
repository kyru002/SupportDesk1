const mongoose = require("mongoose");

const TecnicoSchema = new mongoose.Schema({
    nombre: {
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
    role: {
        type: String,
        enum: ["admin", "technician"],
        default: "technician"
    },
    estado: {
        type: String,
        enum: ["activo", "inactivo"],
        default: "activo",
        required: true
    },
    totalTickets: {
        type: Number,
        default: 0
    },
    fechaIncorporacion: {
        type: Date,
        default: Date.now
    },
    horasTrabajadas: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Tecnico", TecnicoSchema);
