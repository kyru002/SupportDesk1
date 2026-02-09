/**
 * Middleware para verificar roles de usuario
 * @param {Array} roles - Lista de roles permitidos (ej: ['admin', 'tecnico'])
 */
module.exports = function (roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ msg: "No autorizado, falta el usuario en el request" });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                msg: `Permiso denegado: tu rol (${req.user.role}) no tiene permisos para esta acción`
            });
        }

        next();
    };
};
