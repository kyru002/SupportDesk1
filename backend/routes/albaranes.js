const express = require("express");
const router = express.Router();
const Albaran = require("../models/Albaran");
const Cliente = require("../models/Cliente");
const Trabajador = require("../models/Trabajador");
const auth = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

// Obtener próximo número de albarán (Protegido - Admin/Técnico)
router.get("/numero/siguiente", auth, checkRole(['admin', 'tecnico']), async (req, res) => {
    try {
        const ultimoAlbaran = await Albaran.findOne().sort({ createdAt: -1 });

        let proximoNumero = "ALB-2026-001";
        if (ultimoAlbaran && ultimoAlbaran.numeroAlbaran) {
            const partes = ultimoAlbaran.numeroAlbaran.split('-');
            const numero = parseInt(partes[partes.length - 1]) + 1;
            proximoNumero = `ALB-${new Date().getFullYear()}-${String(numero).padStart(3, '0')}`;
        }

        res.json({ proximoNumero });
    } catch (error) {
        res.status(500).json({ message: "Error al obtener próximo número", error: error.message });
    }
});

// Obtener albaranes por estado (Protegido)
router.get("/estado/:estado", auth, async (req, res) => {
    try {
        const filter = { estado: req.params.estado };

        // Control de acceso: Clientes y técnicos solo ven albaranes de su empresa
        if (req.user.role === 'cliente') {
            filter.cliente = req.user.empresa;
        } else if (req.user.role === 'tecnico' && req.user.empresa) {
            filter.cliente = req.user.empresa;
        }

        const albaranes = await Albaran.find(filter)
            .populate('cliente')
            .populate('tecnico')
            .populate('ticket')
            .sort({ fechaAlbaran: -1 });
        res.json(albaranes);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener albaranes por estado", error: error.message });
    }
});

// Obtener albaranes por cliente (Protegido)
router.get("/cliente/:clienteId", auth, async (req, res) => {
    try {
        // Control de acceso: Un cliente no puede ver albaranes de otro cliente
        if (req.user.role === 'cliente' && req.user.empresa.toString() !== req.params.clienteId) {
            return res.status(403).json({ message: "No tienes permiso para ver estos albaranes" });
        }

        const albaranes = await Albaran.find({ cliente: req.params.clienteId })
            .populate('cliente')
            .populate('tecnico')
            .populate('ticket')
            .sort({ fechaAlbaran: -1 });
        res.json(albaranes);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener albaranes del cliente", error: error.message });
    }
});

// Obtener todos los albaranes (Protegido)
router.get("/", auth, async (req, res) => {
    try {
        const filter = {};

        if (req.user.role === 'cliente') {
            filter.cliente = req.user.empresa;
        } else if (req.user.role === 'tecnico') {
            // Los técnicos solo ven albaranes de su empresa
            if (req.user.empresa) {
                filter.cliente = req.user.empresa;
            }
        } else {
            // Solo Admin puede filtrar por cliente si lo desea
            const { cliente } = req.query;
            if (cliente) filter.cliente = cliente;
        }

        const albaranes = await Albaran.find(filter)
            .populate('cliente')
            .populate('tecnico')
            .populate('ticket')
            .sort({ fechaAlbaran: -1 });
        res.json(albaranes);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener albaranes", error: error.message });
    }
});

// Obtener un albarán por ID (Protegido)
router.get("/:id", auth, async (req, res) => {
    try {
        const albaran = await Albaran.findById(req.params.id)
            .populate('cliente')
            .populate('tecnico')
            .populate('ticket');

        if (!albaran) {
            return res.status(404).json({ message: "Albarán no encontrado" });
        }

        // Control de acceso
        if (req.user.role === 'cliente' && albaran.cliente._id.toString() !== req.user.empresa.toString()) {
            return res.status(403).json({ message: "No tienes permiso para ver este albarán" });
        }

        res.json(albaran);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener el albarán", error: error.message });
    }
});

// Crear nuevo albarán (Protegido - Admin/Técnico)
router.post("/", auth, checkRole(['admin', 'tecnico']), async (req, res) => {
    try {
        const { numeroAlbaran, cliente, tecnico, ticket, descripcion, lineas, notas, observaciones } = req.body;

        // Validaciones básicas
        if (!numeroAlbaran || !cliente || !lineas || lineas.length === 0) {
            return res.status(400).json({ message: "Faltan campos requeridos" });
        }

        const nuevoAlbaran = new Albaran({
            numeroAlbaran,
            cliente,
            tecnico: tecnico || req.user.id, // Por defecto el técnico actual si no se especifica
            ticket,
            descripcion,
            lineas,
            notas,
            observaciones
        });

        const albaranGuardado = await nuevoAlbaran.save();
        const albaranPopulado = await albaranGuardado.populate(['cliente', 'tecnico', 'ticket']);
        res.status(201).json(albaranPopulado);
    } catch (error) {
        res.status(500).json({ message: "Error al crear el albarán", error: error.message });
    }
});

// Actualizar albarán (Protegido - Admin/Técnico)
router.put("/:id", auth, checkRole(['admin', 'tecnico']), async (req, res) => {
    try {
        const albaran = await Albaran.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate(['cliente', 'tecnico', 'ticket']);

        if (!albaran) {
            return res.status(404).json({ message: "Albarán no encontrado" });
        }

        res.json(albaran);
    } catch (error) {
        res.status(400).json({ message: "Error al actualizar el albarán", error: error.message });
    }
});

// Cambiar estado del albarán (Protegido - Admin/Técnico)
router.patch("/:id/estado", auth, checkRole(['admin', 'tecnico']), async (req, res) => {
    try {
        const { estado } = req.body;

        // Obtener albarán actual para verificar estado previo
        const albaranPrevio = await Albaran.findById(req.params.id);
        const horasTotal = albaranPrevio.lineas.reduce((sum, linea) => sum + (linea.cantidad || 0), 0);

        // Si cambia de "entregado" a otro estado, restar horas
        if (albaranPrevio.estado === 'entregado' && estado !== 'entregado') {
            await Cliente.findByIdAndUpdate(
                albaranPrevio.cliente,
                { $inc: { horasUsadas: -horasTotal } },
                { new: true }
            );
        }
        // Si cambia a "entregado" desde otro estado, sumar horas
        else if (albaranPrevio.estado !== 'entregado' && estado === 'entregado') {
            await Cliente.findByIdAndUpdate(
                albaranPrevio.cliente,
                { $inc: { horasUsadas: horasTotal } },
                { new: true }
            );
        }

        const albaran = await Albaran.findByIdAndUpdate(
            req.params.id,
            { estado },
            { new: true }
        ).populate(['cliente', 'tecnico', 'ticket']);

        if (!albaran) {
            return res.status(404).json({ message: "Albarán no encontrado" });
        }

        res.json(albaran);
    } catch (error) {
        res.status(400).json({ message: "Error al cambiar el estado", error: error.message });
    }
});

// Marcar como entregado (Protegido - Permite firma de cliente)
router.patch("/:id/entregar", auth, async (req, res) => {
    try {
        const { firmante } = req.body;

        // Un cliente solo puede firmar SUS albaranes
        const albaranPre = await Albaran.findById(req.params.id);
        if (req.user.role === 'cliente' && albaranPre.cliente.toString() !== req.user.empresa.toString()) {
            return res.status(403).json({ message: "No puedes firmar albaranes de otra empresa" });
        }

        // Calcular horas totales del albarán
        const horasTotal = albaranPre.lineas.reduce((sum, linea) => sum + (linea.cantidad || 0), 0);

        // Actualizar albarán
        const albaran = await Albaran.findByIdAndUpdate(
            req.params.id,
            {
                estado: 'entregado',
                fechaEntrega: new Date(),
                firmante
            },
            { new: true }
        ).populate(['cliente', 'tecnico', 'ticket']);

        // Sumar horas al cliente
        await Cliente.findByIdAndUpdate(
            albaranPre.cliente,
            { $inc: { horasUsadas: horasTotal } },
            { new: true }
        );

        res.json(albaran);
    } catch (error) {
        res.status(400).json({ message: "Error al marcar como entregado", error: error.message });
    }
});

// Eliminar albarán (SOLO ADMIN)
router.delete("/:id", auth, checkRole(['admin']), async (req, res) => {
    try {
        const albaran = await Albaran.findById(req.params.id);
        
        if (!albaran) {
            return res.status(404).json({ message: "Albarán no encontrado" });
        }

        // Si el albarán estaba entregado, restar horas del cliente
        if (albaran.estado === 'entregado') {
            const horasTotal = albaran.lineas.reduce((sum, linea) => sum + (linea.cantidad || 0), 0);
            await Cliente.findByIdAndUpdate(
                albaran.cliente,
                { $inc: { horasUsadas: -horasTotal } },
                { new: true }
            );
        }

        await Albaran.findByIdAndDelete(req.params.id);
        res.json({ message: "Albarán eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar el albarán", error: error.message });
    }
});

module.exports = router;
