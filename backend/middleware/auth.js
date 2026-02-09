const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "tu-clave-secreta-muy-segura";

module.exports = function (req, res, next) {
    // Leer el token del header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    // Revisar si no hay token
    if (!token) {
        return res.status(401).json({ msg: "No hay token, permiso no válido" });
    }

    // Validar el token
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ msg: "Token no válido" });
    }
};
