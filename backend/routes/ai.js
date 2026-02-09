const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Ticket = require("../models/Ticket");
const AIUsage = require("../models/AIUsage");

// Endpoint para resumir un ticket o pedir sugerencias (Mock o Real)
router.post("/process", auth, async (req, res) => {
    try {
        const { ticketId, action } = req.body;

        // Obtener el ticket para tener contexto
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ msg: "Ticket no encontrado" });
        }

        // Contexto de los mensajes
        const lastMessages = ticket.messages.slice(-5).map(m => `${m.role}: ${m.content}`).join("\n");
        const prompt = `Ticket: ${ticket.title}. Descripción: ${ticket.description}. Últimos mensajes:\n${lastMessages}\nAcción solicitada: ${action}`;

        let aiResponse = "";

        // Aquí se integraría con Gemini o OpenAI. Por ahora, un Mock avanzado.
        if (action === "summary") {
            aiResponse = `Resumen del ticket: El cliente reporta "${ticket.title}". La situación actual según los últimos mensajes es que ${ticket.status === 'abierto' ? 'acaba de empezar' : 'está en proceso de resolución'}.`;
        } else {
            aiResponse = `Sugerencia: Dado que el ticket trata sobre "${ticket.title}", se recomienda verificar los logs de conexión y confirmar con el cliente si el problema persiste tras el último reinicio.`;
        }

        // Registrar el uso de la IA
        const log = new AIUsage({
            user: req.user.id,
            ticket: ticketId,
            action: action,
            prompt: prompt,
            response: aiResponse
        });
        await log.save();

        res.json({ response: aiResponse });
    } catch (error) {
        console.error("Error en procesamiento de IA:", error);
        res.status(500).json({ msg: "Error al procesar con IA" });
    }
});

// Endpoint para ver historial de uso (Solo para admins/trabajadores)
router.get("/logs", auth, async (req, res) => {
    try {
        if (req.user.role === 'cliente') {
            return res.status(403).json({ msg: "Acceso no autorizado" });
        }
        const logs = await AIUsage.find().populate('user', 'nombre').populate('ticket', 'title').sort({ timestamp: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener logs" });
    }
});

module.exports = router;
