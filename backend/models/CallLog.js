const mongoose = require("mongoose");

const CallLogSchema = new mongoose.Schema({
  // IDs de los usuarios en la llamada (Socket IDs o User IDs)
  callerSocketId: {
    type: String,
    required: true
  },
  callerName: {
    type: String,
    required: true
  },
  receiverSocketId: {
    type: String,
    required: false,
    default: null
  },
  receiverName: {
    type: String,
    required: false,
    default: null
  },

  // Ticket asociado
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ticket",
    required: false
  },

  // Tipo de llamada
  callType: {
    type: String,
    enum: ["voice", "video"],
    required: true
  },

  // Duración en segundos
  duration: {
    type: Number,
    required: false,
    default: 0
  },

  // Estado de la llamada
  status: {
    type: String,
    enum: ["iniciada", "aceptada", "rechazada", "completada"],
    required: true,
    default: "iniciada"
  },

  // Fechas
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    required: false
  },

  // Si se compartió pantalla
  screenShared: {
    type: Boolean,
    default: false
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para queries rápidas
CallLogSchema.index({ ticket: 1 });
CallLogSchema.index({ startTime: -1 });
CallLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("CallLog", CallLogSchema);
