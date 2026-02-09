const express = require("express");
const app = express();
const cors = require("cors");
const connectDB = require("./database");
const { Server } = require("socket.io");
const http = require("http");
const auth = require("./middleware/auth");
const CallLog = require("./models/CallLog");

// Crear servidor HTTP para Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Conectar a MongoDB
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/tickets", require("./routes/tickets"));
app.use("/api/clientes", require("./routes/clientes"));
app.use("/api/albaranes", require("./routes/albaranes"));
app.use("/api/callLogs", require("./routes/callLogs"));
app.use("/api/trabajadores", require("./routes/trabajadores"));
app.use("/api/ai", auth, require("./routes/ai"));

// Ruta inicial
app.get("/", (req, res) => {
  res.send("API funcionando correctamente");
});

// WebSocket - Manejo de videollamadas
const callRooms = new Map(); // Mapeo de ticket IDs a llamadas activas
const activeCallLogs = new Map(); // Mapeo de socket ID a CallLog ID para tracking

io.on("connection", (socket) => {
  console.log("Nuevo cliente conectado:", socket.id);

  // DEBUG: Capturar todos los eventos socket para diagnosticar
  const originalOn = socket.on.bind(socket);
  socket.on = function (event, ...args) {
    if (!['disconnect'].includes(event)) {
      console.log(`📡 Listener registrado para evento: "${event}"`);
    }
    return originalOn(event, ...args);
  };

  // Manejar mensajes de chat en tiempo real
  socket.on("chat-message", (data) => {
    const { ticketId, message } = data;
    const room = `ticket-${ticketId}`;
    console.log(`💬 Nuevo mensaje en sala ${room}:`, message.content);

    // Retransmitir a todos en la sala EXCEPTO al que lo envió (él ya lo ve localmente)
    socket.broadcast.to(room).emit("new-chat-message", message);
  });

  // DEBUG: Log de todos los eventos emitidos al socket

  // Unirse a sala de ticket
  socket.on("join-ticket-room", (ticketId, userData) => {
    const room = `ticket-${ticketId}`;
    socket.join(room);
    console.log(`${userData.name} (${userData.role}) se unió a ${room}`);

    // Notificar a otros en la sala
    socket.broadcast.to(room).emit("user-joined", {
      userId: socket.id,
      userName: userData.name,
      userRole: userData.role
    });
  });

  // Manejar nueva llamada (inicial)
  socket.on("incoming-call", (data) => {
    const { ticketId, offer, callerName, callType } = data;
    const room = `ticket-${ticketId}`;
    console.log(`\n☎️ INCOMING-CALL RECIBIDO (Nueva llamada)`);
    console.log(`   Caller: ${callerName}`);
    console.log(`   Type: ${callType}`);
    console.log(`   Room: ${room}`);
    console.log(`   Socket ID: ${socket.id}`);

    // Enviar a todos en la sala EXCEPTO al que envia
    console.log(`   📤 Emitiendo 'incoming-call' a otros...`);
    socket.broadcast.to(room).emit("incoming-call", {
      from: socket.id,
      callerName: callerName,
      callType: callType,
      offer: offer
    });

    console.log(`   ✅ Evento emitido\n`);
  });

  // Manejar oferta de renegotiación (durante una llamada en curso)
  socket.on("call-offer", (data) => {
    const { ticketId, offer, callerName, callType } = data;
    const room = `ticket-${ticketId}`;
    console.log(`\n🔄 CALL-OFFER RECIBIDO (Renegotiation)`);
    console.log(`   Caller: ${callerName}`);
    console.log(`   Type: ${callType}`);
    console.log(`   Room: ${room}`);
    console.log(`   Socket ID: ${socket.id}`);

    // Enviar a todos en la sala EXCEPTO al que envia
    console.log(`   📤 Emitiendo 'call-offer' a otros...`);
    socket.broadcast.to(room).emit("call-offer", {
      from: socket.id,
      callerName: callerName,
      callType: callType,
      offer: offer
    });

    console.log(`   ✅ Evento emitido\n`);
  });

  // Manejar respuesta de videollamada
  socket.on("call-answer", (data) => {
    const { ticketId, answer, to } = data;
    io.to(to).emit("call-answered", {
      from: socket.id,
      answer: answer
    });
  });

  // Manejar ICE candidates
  socket.on("ice-candidate", (data) => {
    const { ticketId, candidate, to } = data;
    io.to(to).emit("ice-candidate", {
      from: socket.id,
      candidate: candidate
    });
  });

  // Rechazar llamada
  socket.on("reject-call", (data) => {
    const { to } = data;
    io.to(to).emit("call-rejected", {
      from: socket.id
    });
  });

  // Terminar llamada
  socket.on("end-call", (data) => {
    const { ticketId, to } = data;
    io.to(to).emit("call-ended", {
      from: socket.id
    });
  });

  // Screen share iniciado
  socket.on("screen-share-started", (data) => {
    const { ticketId, from } = data;
    const room = `ticket-${ticketId}`;
    console.log(`Usuario ${from} comenzó a compartir pantalla`);
    socket.broadcast.to(room).emit("screen-share-started", {
      from: socket.id
    });
  });

  // Screen share detenido
  socket.on("screen-share-stopped", (data) => {
    const { ticketId, from } = data;
    const room = `ticket-${ticketId}`;
    console.log(`Usuario ${from} dejó de compartir pantalla`);
    socket.broadcast.to(room).emit("screen-share-stopped", {
      from: socket.id
    });
  });

  // Registrar inicio de llamada
  socket.on("call-started", async (data) => {
    console.log(`\n🔔 EVENTO RECIBIDO: call-started (socket: ${socket.id})`);
    console.log('📦 Datos recibidos:', JSON.stringify(data, null, 2));

    try {
      const { callerSocketId, callerName, receiverSocketId, receiverName, ticketId, callType } = data;

      console.log(`📞 Registrando inicio de llamada:`, {
        caller: callerName,
        receiver: receiverName,
        type: callType,
        ticket: ticketId
      });

      const newCallLog = new CallLog({
        callerSocketId,
        callerName,
        receiverSocketId: receiverSocketId || null,
        receiverName: receiverName || null,
        ticket: ticketId || null,
        callType,
        status: "iniciada",
        startTime: new Date()
      });

      const savedCallLog = await newCallLog.save();

      // Almacenar el ID del CallLog SOLO para el caller (receiver se añadirá cuando acepte)
      activeCallLogs.set(callerSocketId, savedCallLog._id.toString());

      console.log(`✅ CallLog registrado (ID: ${savedCallLog._id}) - esperando aceptación de ${receiverName || 'receptor'}\n`);
    } catch (error) {
      console.error("❌ Error registrando inicio de llamada:", error);
      console.error('Stack:', error.stack);
    }
  });

  // Registrar aceptación de llamada
  socket.on("call-accepted", async (data) => {
    console.log(`\n✅ EVENTO RECIBIDO: call-accepted (socket: ${socket.id})`);
    console.log('📦 Datos recibidos:', JSON.stringify(data, null, 2));

    try {
      const { callerSocketId, receiverSocketId, receiverName, ticketId } = data;

      console.log(`✅ Registrando aceptación de llamada por socket: ${socket.id}`);

      const callLogId = activeCallLogs.get(callerSocketId);

      if (callLogId) {
        const updatedCallLog = await CallLog.findByIdAndUpdate(
          callLogId,
          {
            status: "aceptada",
            receiverSocketId: receiverSocketId || socket.id,
            receiverName: receiverName || 'Usuario'
          },
          { new: true }
        );
        // Ahora registrar también en el Map para el receiver
        activeCallLogs.set(socket.id, callLogId);
        console.log(`✅ CallLog (${callLogId}) actualizado a "aceptada" por ${socket.id}\n`);
      } else {
        console.warn(`⚠️ No se encontró CallLog para callerSocketId: ${callerSocketId}`);
      }
    } catch (error) {
      console.error("❌ Error registrando aceptación de llamada:", error);
      console.error('Stack:', error.stack);
    }
  });

  // Registrar rechazo de llamada
  socket.on("call-rejected", async (data) => {
    try {
      const { callerSocketId } = data;

      console.log(`❌ Registrando rechazo de llamada`);

      const callLogId = activeCallLogs.get(callerSocketId) || activeCallLogs.get(socket.id);

      if (callLogId) {
        await CallLog.findByIdAndUpdate(
          callLogId,
          {
            status: "rechazada",
            endTime: new Date(),
            duration: 0
          },
          { new: true }
        );
        activeCallLogs.delete(callerSocketId);
        activeCallLogs.delete(socket.id);
        console.log(`✅ CallLog actualizado a "rechazada"`);
      }
    } catch (error) {
      console.error("Error registrando rechazo de llamada:", error);
    }
  });

  // Registrar término de llamada
  socket.on("call-ended", async (data) => {
    try {
      const { duration, screenShared } = data;

      console.log(`📞 Registrando término de llamada. Duración: ${duration}s, Screen shared: ${screenShared}`);

      const callLogId = activeCallLogs.get(socket.id);

      if (callLogId) {
        const updatedCallLog = await CallLog.findByIdAndUpdate(
          callLogId,
          {
            status: "completada",
            duration: duration || 0,
            screenShared: screenShared || false,
            endTime: new Date()
          },
          { new: true }
        );

        // Limpiar del mapa
        activeCallLogs.forEach((value, key) => {
          if (value === callLogId) {
            activeCallLogs.delete(key);
          }
        });

        console.log(`✅ CallLog registrado como completada. Duración total: ${updatedCallLog.duration}s`);
      }
    } catch (error) {
      console.error("Error registrando término de llamada:", error);
    }
  });

  // Desconexión
  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
    io.emit("user-disconnected", {
      userId: socket.id
    });
  });
});

// Inicio del servidor
server.listen(5001, () => {
  console.log("Servidor ejecutándose en http://localhost:5001");
  console.log("WebSocket disponible en ws://localhost:5001");
});
