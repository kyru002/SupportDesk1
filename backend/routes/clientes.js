const express = require("express");
const router = express.Router();
const Cliente = require("../models/Cliente");
const auth = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

// Obtener todos los clientes (Solo Admin y Técnico)
router.get("/", auth, checkRole(['admin', 'tecnico']), async (req, res) => {
    try {
        const clientes = await Cliente.find().sort({ createdAt: -1 });
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener los clientes" });
    }
});

// Obtener un cliente por ID (Protegido)
router.get("/:id", auth, async (req, res) => {
    try {
        // Control de acceso: Clientes solo pueden ver su propia empresa
        if (req.user.role === 'cliente' && req.user.empresa.toString() !== req.params.id) {
            return res.status(403).json({ msg: "No tienes permiso para ver esta empresa" });
        }

        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ msg: "Cliente no encontrado" });
        }
        res.json(cliente);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener el cliente", error: error.message });
    }
});

// Crear un nuevo cliente (SOLO ADMIN)
router.post("/", auth, checkRole(['admin']), async (req, res) => {
    try {
        const newCliente = new Cliente(req.body);
        const savedCliente = await newCliente.save();
        res.json(savedCliente);
    } catch (error) {
        res.status(500).json({ msg: "Error al crear el cliente", error: error.message });
    }
});

// Actualizar un cliente (SOLO ADMIN)
router.put("/:id", auth, checkRole(['admin']), async (req, res) => {
    try {
        const updatedCliente = await Cliente.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updatedCliente);
    } catch (error) {
        res.status(500).json({ msg: "Error al actualizar el cliente" });
    }
});

// Eliminar un cliente por completo (SOLO ADMIN)
router.delete("/:id", auth, checkRole(['admin']), async (req, res) => {
    try {
        const clienteId = req.params.id;

        // 1. Borrar todos los trabajadores asociados a la empresa
        const Trabajador = require("../models/Trabajador");
        await Trabajador.deleteMany({ empresa: clienteId });

        // 2. Borrar todos los tickets asociados a la empresa
        const Ticket = require("../models/Ticket");
        await Ticket.deleteMany({ cliente: clienteId });

        // 3. Borrar la empresa
        await Cliente.findByIdAndDelete(clienteId);

        res.json({ msg: "Empresa y todos sus datos asociados (trabajadores y tickets) han sido eliminados" });
    } catch (error) {
        console.error("Error al eliminar empresa completa:", error);
        res.status(500).json({ msg: "Error al eliminar la empresa y sus datos", error: error.message });
    }
});

// ========== ENDPOINTS PARA CONTACTOS ==========

// Obtener contactos de un cliente (Protegido)
router.get("/:id/contactos", auth, async (req, res) => {
    try {
        // Control de acceso para clientes
        if (req.user.role === 'cliente' && req.user.empresa.toString() !== req.params.id) {
            return res.status(403).json({ msg: "No tienes acceso a los contactos de esta empresa" });
        }

        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ msg: "Cliente no encontrado" });
        }
        res.json(cliente.contactos);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener contactos", error: error.message });
    }
});

// Crear un nuevo contacto en un cliente (Admin o Técnico)
router.post("/:id/contactos", auth, checkRole(['admin', 'tecnico']), async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ msg: "Cliente no encontrado" });
        }

        const { nombre, email, telefono, puesto, esContactoPrincipal } = req.body;

        if (!nombre || !email) {
            return res.status(400).json({ msg: "Nombre y email son requeridos" });
        }

        const nuevoContacto = {
            nombre,
            email,
            telefono: telefono || "",
            puesto: puesto || "Contacto",
            esContactoPrincipal: esContactoPrincipal || false
        };

        cliente.contactos.push(nuevoContacto);
        const clienteActualizado = await cliente.save();

        res.status(201).json(clienteActualizado);
    } catch (error) {
        res.status(500).json({ msg: "Error al crear contacto", error: error.message });
    }
});

// Actualizar un contacto (Admin o Técnico)
router.put("/:id/contactos/:contactoId", auth, checkRole(['admin', 'tecnico']), async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ msg: "Cliente no encontrado" });
        }

        const contacto = cliente.contactos.id(req.params.contactoId);
        if (!contacto) {
            return res.status(404).json({ msg: "Contacto no encontrado" });
        }

        const { nombre, email, telefono, puesto, esContactoPrincipal } = req.body;

        if (nombre) contacto.nombre = nombre;
        if (email) contacto.email = email;
        if (telefono !== undefined) contacto.telefono = telefono;
        if (puesto) contacto.puesto = puesto;
        if (esContactoPrincipal !== undefined) contacto.esContactoPrincipal = esContactoPrincipal;

        const clienteActualizado = await cliente.save();
        res.json(clienteActualizado);
    } catch (error) {
        res.status(500).json({ msg: "Error al actualizar contacto", error: error.message });
    }
});

// Eliminar un contacto (Admin o Técnico)
router.delete("/:id/contactos/:contactoId", auth, checkRole(['admin', 'tecnico']), async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ msg: "Cliente no encontrado" });
        }

        cliente.contactos.id(req.params.contactoId).deleteOne();
        const clienteActualizado = await cliente.save();

        res.json(clienteActualizado);
    } catch (error) {
        res.status(500).json({ msg: "Error al eliminar contacto", error: error.message });
    }
});

module.exports = router;
