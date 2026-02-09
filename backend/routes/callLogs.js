const express = require("express");
const router = express.Router();
const CallLog = require("../models/CallLog");
const auth = require("../middleware/auth");
const Ticket = require("../models/Ticket");
const checkRole = require("../middleware/checkRole");

// Crear nuevo registro de llamada (Protegido)
router.post("/", auth, async (req, res) => {
  try {
    const { callerSocketId, callerName, receiverSocketId, receiverName, ticket, callType, status } = req.body;

    if (!callerSocketId || !callerName || !receiverSocketId || !receiverName || !callType) {
      return res.status(400).json({ message: "Faltan campos requeridos" });
    }

    const newCallLog = new CallLog({
      callerSocketId,
      callerName,
      receiverSocketId,
      receiverName,
      ticket: ticket || null,
      callType,
      status: status || "iniciada",
      startTime: new Date()
    });

    const savedCallLog = await newCallLog.save();
    res.status(201).json(savedCallLog);
  } catch (error) {
    res.status(500).json({ message: "Error al crear registro de llamada", error: error.message });
  }
});

// Actualizar registro de llamada (Protegido)
router.patch("/:id", auth, async (req, res) => {
  try {
    const { status, duration, screenShared, endTime } = req.body;

    const callLog = await CallLog.findByIdAndUpdate(
      req.params.id,
      {
        status: status || "completada",
        duration: duration || 0,
        screenShared: screenShared || false,
        endTime: endTime || new Date(),
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!callLog) {
      return res.status(404).json({ message: "Registro de llamada no encontrado" });
    }

    res.json(callLog);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar registro de llamada", error: error.message });
  }
});

// Obtener registros de llamadas por ticket (Protegido)
router.get("/ticket/:ticketId", auth, async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const ticketDoc = await Ticket.findById(ticketId);

    if (!ticketDoc) return res.status(404).json({ message: "Ticket no encontrado" });

    // Control de acceso
    if (req.user.role === 'cliente' && ticketDoc.cliente.toString() !== req.user.empresa.toString()) {
      return res.status(403).json({ message: "No tienes permiso para ver los logs de este ticket" });
    }

    const callLogs = await CallLog.find({ ticket: ticketId })
      .populate("ticket")
      .sort({ startTime: -1 });

    res.json(callLogs);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener registros de llamadas", error: error.message });
  }
});

// Obtener todos los registros de llamadas (Admin/Técnico)
router.get("/", auth, checkRole(['admin', 'tecnico']), async (req, res) => {
  try {
    const callLogs = await CallLog.find()
      .populate("ticket")
      .sort({ startTime: -1 });

    res.json(callLogs);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener registros de llamadas", error: error.message });
  }
});

// Obtener un registro específico (Protegido)
router.get("/:id", auth, async (req, res) => {
  try {
    const callLog = await CallLog.findById(req.params.id).populate("ticket");

    if (!callLog) {
      return res.status(404).json({ message: "Registro de llamada no encontrado" });
    }

    // Control de acceso si está vinculado a un ticket
    if (callLog.ticket && req.user.role === 'cliente') {
      if (callLog.ticket.cliente.toString() !== req.user.empresa.toString()) {
        return res.status(403).json({ message: "No tienes permiso para ver este log" });
      }
    }

    res.json(callLog);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener registro de llamada", error: error.message });
  }
});

module.exports = router;
