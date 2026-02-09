const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    cliente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cliente',
        required: true
    },
    status: {
        type: String,
        enum: ["abierto", "en progreso", "cerrado"],
        default: "abierto",
        required: true
    },
    priority: {
        type: String,
        enum: ["alta", "media", "baja"],
        default: "media",
        required: true
    },
    tecnico: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trabajador',
        required: false
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    },
    messages: [
        {
            author: {
                type: String,
                required: true,
                trim: true
            },
            role: {
                type: String,
                enum: ["cliente", "tecnico", "admin"],
                required: true
            },
            content: {
                type: String,
                required: true,
                trim: true
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }
    ]
}, {
    timestamps: true
});

module.exports = mongoose.model("Ticket", TicketSchema);
