const express = require("express");
const router = express.Router();
const Ticket = require("../models/Ticket");
const auth = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

// Obtener todos los tickets (Protegido)
router.get("/", auth, async (req, res) => {
    try {
        const filter = {};

        // Control de Acceso: Si es cliente, solo ve sus propios tickets
        if (req.user.role === 'cliente') {
            filter.cliente = req.user.empresa;
        } else if (req.user.role === 'tecnico') {
            // Los técnicos solo ven tickets de su empresa
            if (req.user.empresa) {
                filter.cliente = req.user.empresa;
            }
        } else {
            // Solo Admin puede filtrar por cliente si lo desea
            const { clienteId } = req.query;
            if (clienteId && clienteId !== 'undefined' && clienteId !== 'null') {
                filter.cliente = clienteId;
            }
        }

        const tickets = await Ticket.find(filter)
            .populate('cliente')
            .populate('tecnico')
            .sort({ createdAt: -1 });
        res.json(tickets);
    } catch (error) {
        console.error("Error al obtener tickets:", error);
        res.status(500).json({ msg: "Error al obtener los tickets" });
    }
});

// Crear un nuevo ticket (Protegido)
router.post("/", auth, async (req, res) => {
    try {
        const ticketData = { ...req.body };

        // Si es cliente o técnico, forzar que el ticket sea de su empresa
        if (req.user.role === 'cliente') {
            ticketData.cliente = req.user.empresa;
        } else if (req.user.role === 'tecnico' && req.user.empresa) {
            // Los técnicos crean tickets para su propia empresa si no se especifica
            if (!ticketData.cliente) {
                ticketData.cliente = req.user.empresa;
            }
        }

        const newTicket = new Ticket(ticketData);
        const savedTicket = await newTicket.save();
        res.json(savedTicket);
    } catch (error) {
        res.status(500).json({ msg: "Error al crear el ticket", error: error.message });
    }
});

// Obtener mensajes de un ticket (Protegido)
router.get("/:id/messages", auth, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ msg: "Ticket no encontrado" });
        }

        // Control de Acceso (Privacidad)
        if (req.user.role === 'cliente' && ticket.cliente.toString() !== req.user.empresa.toString()) {
            return res.status(403).json({ msg: "No tienes permiso para ver este ticket" });
        }

        res.json(ticket.messages || []);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener mensajes", error: error.message });
    }
});

// Enviar mensaje en un ticket (Protegido)
router.post("/:id/messages", auth, async (req, res) => {
    try {
        const { author, role, content } = req.body;

        if (!author || !role || !content) {
            return res.status(400).json({ msg: "Faltan campos requeridos: author, role, content" });
        }

        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ msg: "Ticket no encontrado" });
        }

        // Control de Acceso (Privacidad)
        if (req.user.role === 'cliente' && ticket.cliente.toString() !== req.user.empresa.toString()) {
            return res.status(403).json({ msg: "No tienes permiso para comentar en este ticket" });
        }

        ticket.messages.push({
            author: author.trim(),
            role: role,
            content: content.trim(),
            createdAt: new Date()
        });

        await ticket.save();
        res.status(201).json(ticket);
    } catch (error) {
        res.status(500).json({ msg: "Error al enviar mensaje", error: error.message });
    }
});

// Obtener un ticket por ID (Protegido)
router.get("/:id", auth, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id)
            .populate('cliente')
            .populate('tecnico');
        if (!ticket) {
            return res.status(404).json({ msg: "Ticket no encontrado" });
        }

        // Control de Acceso (Privacidad)
        if (req.user.role === 'cliente' && ticket.cliente._id.toString() !== req.user.empresa.toString()) {
            return res.status(403).json({ msg: "No tienes permiso para ver este ticket" });
        }

        res.json(ticket);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener el ticket", error: error.message });
    }
});

// Actualizar un ticket (Protegido)
router.put("/:id", auth, async (req, res) => {
    try {
        // Buscar primero para validar permisos
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ msg: "Ticket no encontrado" });

        // Clientes solo pueden editar sus propios tickets y NO pueden cambiar todo (ej: tecnico asignado)
        if (req.user.role === 'cliente') {
            if (ticket.cliente.toString() !== req.user.empresa.toString()) {
                return res.status(403).json({ msg: "No tienes permiso para modificar este ticket" });
            }
        }

        const updatedTicket = await Ticket.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        )
            .populate('cliente')
            .populate('tecnico');
        res.json(updatedTicket);
    } catch (error) {
        res.status(500).json({ msg: "Error al actualizar el ticket" });
    }
});

// Eliminar un ticket (SOLO ADMIN)
router.delete("/:id", auth, checkRole(['admin']), async (req, res) => {
    try {
        await Ticket.findByIdAndDelete(req.params.id);
        res.json({ msg: "Ticket eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ msg: "Error al eliminar el ticket" });
    }
});

module.exports = router;
