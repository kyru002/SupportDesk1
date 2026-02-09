const express = require("express");
const router = express.Router();
const Trabajador = require("../models/Trabajador");
const Cliente = require("../models/Cliente");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const auth = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

const JWT_SECRET = process.env.JWT_SECRET || "tu-clave-secreta-muy-segura";

// Obtener todos los trabajadores que NO son clientes (Equipo de Soporte/Admin)
router.get("/equipo", auth, checkRole(['admin', 'tecnico']), async (req, res) => {
    try {
        const equipo = await Trabajador.find({ role: { $ne: "cliente" } })
            .select("-password")
            .sort({ nombre: 1 });
        res.json(equipo);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener equipo técnico", error: error.message });
    }
});

// Obtener todos los trabajadores de una empresa (Protegido) - ANTES de la raíz /
router.get("/empresa/:empresaId", auth, async (req, res) => {
    try {
        // Control de acceso para clientes
        if (req.user.role === 'cliente' && req.user.empresa.toString() !== req.params.empresaId) {
            return res.status(403).json({ message: "No tienes permiso para ver los trabajadores de esta empresa" });
        }

        const trabajadores = await Trabajador.find({ empresa: req.params.empresaId })
            .populate("empresa")
            .sort({ createdAt: -1 });
        res.json(trabajadores);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener trabajadores", error: error.message });
    }
});

// Obtener todos los trabajadores (Protegido - Admin ve todos, otros ven solo su empresa)
router.get("/", auth, async (req, res) => {
    try {
        let filter = {};
        
        // Si no es admin, solo puede ver trabajadores de su empresa
        if (req.user.role !== 'admin') {
            if (req.user.empresa) {
                filter.empresa = req.user.empresa;
            } else {
                // Si no tiene empresa asignada, solo puede verse a sí mismo
                filter._id = req.user.id;
            }
        }
        
        const trabajadores = await Trabajador.find(filter)
            .populate("empresa")
            .select("-password")
            .sort({ nombre: 1 });
        res.json(trabajadores);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener trabajadores", error: error.message });
    }
});

// Obtener un trabajador por ID (Protegido)
router.get("/:id", auth, async (req, res) => {
    try {
        const trabajador = await Trabajador.findById(req.params.id).populate("empresa");
        if (!trabajador) {
            return res.status(404).json({ message: "Trabajador no encontrado" });
        }

        // Control de acceso para clientes
        if (req.user.role === 'cliente') {
            const esMismaEmpresa = trabajador.empresa && trabajador.empresa._id.toString() === req.user.empresa.toString();
            const esElMismo = trabajador._id.toString() === req.user.id.toString();
            if (!esMismaEmpresa && !esElMismo) {
                return res.status(403).json({ message: "No tienes permiso para ver este perfil" });
            }
        }

        res.json(trabajador);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener trabajador", error: error.message });
    }
});

// Crear nuevo trabajador (Admin o Admin de Empresa)
router.post("/", auth, async (req, res) => {
    try {
        console.log("📝 POST /trabajadores - Creando nuevo trabajador");
        console.log("📦 Body recibido:", req.body);
        console.log("👤 Usuario actual:", { id: req.user.id, role: req.user.role, empresa: req.user.empresa });
        
        const { nombre, email, telefono, puesto, empresa, role } = req.body;

        // Control de Acceso
        let finalRole = role || 'tecnico';
        let empresaFinal = empresa;

        if (req.user.role === 'cliente') {
            // Un cliente solo puede crear trabajadores para SU empresa y con rol 'cliente'
            if (empresa && empresa !== req.user.empresa.toString()) {
                return res.status(403).json({ message: "Solo puedes crear trabajadores para tu propia empresa" });
            }
            finalRole = 'cliente';
            empresaFinal = req.user.empresa;
            console.log("✅ Usuario cliente creando trabajador para su empresa");
        } else if (req.user.role === 'admin') {
            // Admin puede crear trabajadores para cualquier empresa con el rol especificado
            // Si se envía role='cliente', el trabajador será cliente de esa empresa
            // Si se envía role='tecnico', será técnico
            // Si no se especifica, será técnico por defecto
            if (empresa && !role) {
                // Si se especifica empresa pero no rol, asumir role='cliente'
                finalRole = 'cliente';
            }
            console.log("✅ Usuario admin creando trabajador");
        } else {
            // Otros roles no pueden crear trabajadores
            return res.status(403).json({ message: "No tienes permiso para crear trabajadores" });
        }

        // Validar campos requeridos
        if (!nombre || !email || !puesto) {
            return res.status(400).json({ message: "Los campos nombre, email y puesto son requeridos" });
        }

        // Verificar que el email no exista ya
        const emailLower = email.toLowerCase();
        const trabajadorExistente = await Trabajador.findOne({ email: emailLower });
        if (trabajadorExistente) {
            console.log("⚠️ Email ya registrado:", emailLower);
            return res.status(400).json({ message: "El email ya está registrado" });
        }

        // Generar contraseña temporal
        function generarContraseñaTemporal() {
            const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
            let contraseña = "";
            for (let i = 0; i < 12; i++) {
                contraseña += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
            }
            return contraseña;
        }
        const contraseñaTemporal = generarContraseñaTemporal();

        // Crear nuevo trabajador - sin validaciones automáticas por ahora
        const dataGuardar = {
            nombre: nombre.trim(),
            email: emailLower,
            telefono: (telefono || '').trim(),
            puesto: puesto.trim(),
            password: contraseñaTemporal,
            contraseñaTemporal: true,
            role: finalRole,
            estado: "activo"
        };
        
        // Agregar empresa solo si existe
        if (empresaFinal) {
            dataGuardar.empresa = empresaFinal;
        }

        console.log("💾 Intentando guardar trabajador con datos:", dataGuardar);
        
        const nuevoTrabajador = new Trabajador(dataGuardar);
        console.log("📋 Documento creado:", nuevoTrabajador);
        
        // Intentar guardar
        let trabajadorGuardado;
        try {
            trabajadorGuardado = await nuevoTrabajador.save();
            console.log("✅ Trabajador guardado exitosamente en BD con ID:", trabajadorGuardado._id);
            console.log("✅ Verificando que se guardó:", {
                _id: trabajadorGuardado._id,
                nombre: trabajadorGuardado.nombre,
                email: trabajadorGuardado.email,
                role: trabajadorGuardado.role
            });
        } catch (saveError) {
            console.error("❌ Error durante el save():", saveError.message);
            console.error("Error details:", {
                name: saveError.name,
                code: saveError.code,
                keyPattern: saveError.keyPattern,
                keyValue: saveError.keyValue
            });
            throw saveError;
        }
        
        // Populate empresa si existe
        if (trabajadorGuardado.empresa) {
            try {
                trabajadorGuardado = await Trabajador.findById(trabajadorGuardado._id).populate("empresa");
                console.log("✅ Empresa populada");
            } catch (popError) {
                console.warn("⚠️ Error al popular empresa:", popError.message);
                // No es crítico, continuar con respuesta
            }
        }
        
        // Crear respuesta incluyendo la contraseña temporal
        const respuestaTrabajador = trabajadorGuardado.toObject();
        respuestaTrabajador.contraseñaTemporalTexto = contraseñaTemporal;
        
        console.log("📤 Respuesta enviada con ID:", respuestaTrabajador._id);
        res.status(201).json(respuestaTrabajador);
    } catch (error) {
        console.error("❌ Error al crear trabajador:", error.message);
        console.error("Stack:", error.stack);
        
        // Dar respuesta de error específica
        if (error.code === 11000) {
            return res.status(400).json({ message: "El email ya está registrado (error de índice)" });
        }
        
        res.status(500).json({ 
            message: "Error al crear trabajador", 
            error: error.message,
            details: error.keyPattern || null
        });
    }
});

// Actualizar trabajador (Protegido)
router.put("/:id", auth, async (req, res) => {
    try {
        const targetTrabajador = await Trabajador.findById(req.params.id);
        if (!targetTrabajador) return res.status(404).json({ message: "Trabajador no encontrado" });

        // Control de acceso
        if (req.user.role !== 'admin' && req.user.id.toString() !== req.params.id) {
            // Si no es admin y no es él mismo, solo puede si es admin de su empresa
            if (req.user.role === 'cliente') {
                if (!targetTrabajador.empresa || targetTrabajador.empresa.toString() !== req.user.empresa.toString()) {
                    return res.status(403).json({ message: "No tienes permiso para editar este trabajador" });
                }
            } else {
                return res.status(403).json({ message: "No tienes permiso para editar este perfil" });
            }
        }

        const { nombre, email, telefono, puesto, estado } = req.body;
        const updateData = { nombre, email, telefono, puesto, estado };

        const trabajador = await Trabajador.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate("empresa");

        res.json(trabajador);
    } catch (error) {
        res.status(400).json({ message: "Error al actualizar trabajador", error: error.message });
    }
});

// Cambiar contraseña (por el trabajador mismo o admin)
router.patch("/:id/cambiar-password", auth, async (req, res) => {
    try {
        if (req.user.id.toString() !== req.params.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: "No tienes permiso para cambiar esta contraseña" });
        }

        const { passwordActual, passwordNueva } = req.body;

        if (!passwordNueva) {
            return res.status(400).json({ message: "La nueva contraseña es requerida" });
        }

        const trabajador = await Trabajador.findById(req.params.id);
        if (!trabajador) {
            return res.status(404).json({ message: "Trabajador no encontrado" });
        }

        if (trabajador.contraseñaTemporal || req.user.role === 'admin') {
            trabajador.password = passwordNueva;
            trabajador.contraseñaTemporal = false;
        } else {
            if (!passwordActual) {
                return res.status(400).json({ message: "La contraseña actual es requerida" });
            }
            const esValida = await trabajador.comparePassword(passwordActual);
            if (!esValida) {
                return res.status(401).json({ message: "Contraseña actual incorrecta" });
            }
            trabajador.password = passwordNueva;
        }

        await trabajador.save();
        res.json({ message: "Contraseña actualizada correctamente" });
    } catch (error) {
        res.status(400).json({ message: "Error al cambiar contraseña", error: error.message });
    }
});

// Login y Registro (Públicos)
router.post("/auth/register-empresa", async (req, res) => {
    try {
        const { nombreEmpresa, nombreContacto, email, password, telefono } = req.body;

        if (!nombreEmpresa || !nombreContacto || !email || !password) {
            return res.status(400).json({ message: "Todos los campos son requeridos" });
        }

        const [usuarioExistente, clienteExistente] = await Promise.all([
            Trabajador.findOne({ email: email.toLowerCase() }),
            Cliente.findOne({ email: email.toLowerCase() })
        ]);

        if (usuarioExistente || clienteExistente) {
            return res.status(400).json({ message: "El correo electrónico ya está registrado" });
        }

        const nuevaEmpresa = new Cliente({
            nombreEmpresa,
            nombreContacto,
            email: email.toLowerCase(),
            telefono: telefono || ""
        });
        const empresaGuardada = await nuevaEmpresa.save();

        const nuevoUsuario = new Trabajador({
            nombre: nombreContacto,
            email: email.toLowerCase(),
            password,
            empresa: empresaGuardada._id,
            puesto: "Administrador de Empresa",
            role: "cliente",
            contraseñaTemporal: false
        });
        const usuarioGuardado = await nuevoUsuario.save();

        empresaGuardada.usuarioAsociado = usuarioGuardado._id;
        await empresaGuardada.save();

        res.status(201).json({ message: "Empresa registrada con éxito" });
    } catch (error) {
        res.status(500).json({ message: "Error al registrar la empresa", error: error.message });
    }
});

router.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`🔑 Intento de login: ${email}`);

        const trabajador = await Trabajador.findOne({ email: email.toLowerCase() }).populate("empresa");

        if (!trabajador) {
            console.log(`❌ Usuario no encontrado: ${email}`);
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        const isMatch = await trabajador.comparePassword(password);
        if (!isMatch) {
            console.log(`❌ Contraseña incorrecta para: ${email}`);
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        console.log(`✅ Login exitoso: ${email} (Rol: ${trabajador.role})`);

        if (trabajador.estado !== "activo") {
            return res.status(401).json({ message: "Cuenta desactivada" });
        }

        const token = jwt.sign(
            {
                id: trabajador._id,
                email: trabajador.email,
                empresa: trabajador.empresa?._id || null,
                role: trabajador.role || "tecnico",
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.json({
            token,
            trabajador: {
                _id: trabajador._id,
                nombre: trabajador.nombre,
                email: trabajador.email,
                role: trabajador.role || "tecnico",
                empresa: trabajador.empresa
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Error en login", error: error.message });
    }
});

// Eliminar trabajador (Solo Admin o el mismo)
router.delete("/:id", auth, checkRole(['admin']), async (req, res) => {
    try {
        const trabajador = await Trabajador.findByIdAndDelete(req.params.id);
        if (!trabajador) return res.status(404).json({ message: "Trabajador no encontrado" });
        res.json({ message: "Trabajador eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar trabajador", error: error.message });
    }
});

module.exports = router;
