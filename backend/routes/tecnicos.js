const express = require("express");
const router = express.Router();
const Tecnico = require("../models/Tecnico");
const auth = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

// Obtener todos los técnicos (Protegido - Admin/Técnico)
router.get("/", auth, checkRole(['admin', 'tecnico']), async (req, res) => {
    try {
        const technicians = await Tecnico.find().sort({ createdAt: -1 });
        res.json(technicians);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener los técnicos" });
    }
});

// Crear un nuevo técnico (SOLO ADMIN)
router.post("/", auth, checkRole(['admin']), async (req, res) => {
    try {
        const newTecnico = new Tecnico(req.body);
        const savedTecnico = await newTecnico.save();
        res.json(savedTecnico);
    } catch (error) {
        res.status(500).json({ msg: "Error al crear el técnico", error: error.message });
    }
});

// Actualizar un técnico (SOLO ADMIN)
router.put("/:id", auth, checkRole(['admin']), async (req, res) => {
    try {
        const updatedTecnico = await Tecnico.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updatedTecnico);
    } catch (error) {
        res.status(500).json({ msg: "Error al actualizar el técnico" });
    }
});

// Eliminar un técnico (SOLO ADMIN)
router.delete("/:id", auth, checkRole(['admin']), async (req, res) => {
    try {
        await Tecnico.findByIdAndDelete(req.params.id);
        res.json({ msg: "Técnico eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ msg: "Error al eliminar el técnico" });
    }
});

module.exports = router;
