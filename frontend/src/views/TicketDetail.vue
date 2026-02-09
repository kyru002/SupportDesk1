<script setup>
import { onMounted, ref, computed, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '../stores/appStore';
import { io } from 'socket.io-client';
import {
  ArrowLeft,
  MessageCircle,
  Send,
  AlertCircle,
  Clock,
  User,
  Shield,
  CheckCircle,
  FileText,
  Video,
  Phone,
  X,
  Mic,
  MicOff,
  VideoOff,
  Monitor
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const ticket = ref(null);
const messages = ref([]);
const newMessage = ref('');
const loading = ref(true);
const error = ref('');

// Variables para videollamada
const socket = ref(null);
const localStream = ref(null);
const remoteStream = ref(null);
const peerConnection = ref(null);
const inCall = ref(false);
const callInProgress = ref(false);
const callType = ref(null); // 'voice' o 'video'
const incomingCallData = ref(null);
const showIncomingCall = ref(false);
const isMuted = ref(false);
const isVideoOff = ref(false);
const remoteUserId = ref(null);
const localVideoRef = ref(null);
const remoteVideoRef = ref(null);
const remoteAudioRef = ref(null);
const remoteVideoPiPRef = ref(null);

// Variables para screen sharing
const screenStream = ref(null);
const isSharingScreen = ref(false);
const remoteScreenStream = ref(null);
const isRemoteSharingScreen = ref(false);
const localScreenVideoRef = ref(null);
const remoteScreenVideoRef = ref(null);
const remoteVideoRefs = ref([]); // Array para múltiples refs
const originalVideoTrack = ref(null); // Guardar track original de cámara

// Variables para rastrear llamadas
const callStartTime = ref(null);
const callDuration = ref(0);
const callTimerInterval = ref(null);


// Función para asignar refs de video remoto - DEPRECATED, usar ref directo
const setRemoteVideoRef = (el) => {
  if (el) {
    remoteVideoRef.value = el;
    console.log('🎥 Ref de video remoto asignado mediante función:', el);
  }
};

// Configuración de WebRTC
const peerConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

onMounted(async () => {
  try {
    loading.value = true;
    const ticketId = route.params.id;
    
    // Obtener detalles del ticket
    const ticketData = await store.ticketsService?.getById?.(ticketId);
    if (!ticketData) {
      const foundTicket = store.tickets.find(t => t._id === ticketId);
      if (foundTicket) {
        ticket.value = foundTicket;
        messages.value = foundTicket.messages || [];
      } else {
        error.value = 'Ticket no encontrado';
      }
    } else {
      ticket.value = ticketData;
      
      try {
        messages.value = await store.getTicketMessages(ticketId);
      } catch (err) {
        messages.value = ticketData.messages || [];
      }
    }

    // Inicializar WebSocket
    initializeSocket(ticketId);
  } catch (err) {
    error.value = 'Error al cargar el ticket: ' + err.message;
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  if (inCall.value) {
    endCall();
  }
  if (socket.value) {
    socket.value.disconnect();
  }
});

const initializeSocket = (ticketId) => {
  console.log('🔌 Inicializando Socket.io...');
  socket.value = io('/', {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  socket.value.on('connect', () => {
    console.log('✅ Socket conectado. ID:', socket.value.id);
    console.log('🔗 Uniéndose a la sala del ticket...');
    socket.value.emit('join-ticket-room', ticketId, {
      name: store.currentUser?.name || 'Usuario',
      role: store.currentUser?.role || 'cliente'
    });
    console.log('✅ join-ticket-room emitido');
  });

  // Recibir nueva llamada entrante (solo para iniciar una nueva llamada)
  socket.value.on('incoming-call', async (data) => {
    console.log('☎️ EVENTO: incoming-call recibido');
    console.log('   Datos:', data);
    console.log('   Llamada entrante de:', data.callerName);
    
    // Solo mostrar modal si no hay una llamada en curso
    if (!inCall.value) {
      incomingCallData.value = data;
      showIncomingCall.value = true;
    }
  });

  // Recibir oferta de renegotiación (durante una llamada en curso)
  socket.value.on('call-offer', async (data) => {
    console.log('📞 EVENTO: call-offer recibido (posible renegotiation)');
    console.log('   Datos:', data);
    
    // Si ya hay una llamada en curso y se recibe una oferta, es una renegotiación (screen share, etc)
    if (inCall.value && peerConnection.value) {
      console.log('🔄 Renegotiación detectada - procesando oferta...');
      try {
        console.log('📋 Estado actual:', {
          signalingState: peerConnection.value.signalingState,
          connectionState: peerConnection.value.connectionState,
          iceConnectionState: peerConnection.value.iceConnectionState
        });
        
        // Establecer la oferta remota
        await peerConnection.value.setRemoteDescription(new RTCSessionDescription(data.offer));
        console.log('✅ Oferta remota establecida');
        
        // Crear y enviar respuesta
        const answer = await peerConnection.value.createAnswer();
        await peerConnection.value.setLocalDescription(answer);
        console.log('✅ Respuesta creada y establecida');
        
        // Enviar respuesta
        socket.value.emit('call-answer', {
          ticketId: route.params.id,
          answer: answer,
          to: data.from || remoteUserId.value
        });
        console.log('📤 Respuesta de renegotiation enviada');
      } catch (err) {
        console.error('Error procesando renegotiation:', err);
        console.error('Stack:', err.stack);
      }
    } else if (!inCall.value) {
      // Si no hay llamada en curso, es una nueva llamada (handling normal)
      console.log('☎️ Nueva llamada detectada');
      incomingCallData.value = data;
      showIncomingCall.value = true;
    } else {
      console.error('⚠️ Condiciones no cumplidas:', { inCall: inCall.value, hasPeerConnection: !!peerConnection.value });
    }
  });

  // Respuesta a llamada
  socket.value.on('call-answered', async (data) => {
    console.log('Llamada aceptada');
    remoteUserId.value = data.from;
    await handleAnswerReceived(data.answer);
  });

  // Recibir ICE candidate
  socket.value.on('ice-candidate', (data) => {
    if (peerConnection.value && data.candidate) {
      peerConnection.value.addIceCandidate(data.candidate).catch(err =>
        console.error('Error al agregar ICE candidate:', err)
      );
    }
  });

  // Llamada rechazada
  socket.value.on('call-rejected', () => {
    console.log('Llamada rechazada');
    inCall.value = false;
    alert('La llamada fue rechazada');
  });

  // Llamada terminada
  socket.value.on('call-ended', () => {
    console.log('Llamada terminada por el otro usuario');
    endCall();
  });

  // Pantalla compartida por otro usuario
  socket.value.on('screen-share-started', () => {
    console.log('La otra persona comenzó a compartir pantalla');
    isRemoteSharingScreen.value = true;
  });

  // Pantalla dejó de ser compartida por otro usuario
  socket.value.on('screen-share-stopped', () => {
    console.log('La otra persona dejó de compartir pantalla');
    isRemoteSharingScreen.value = false;
    if (remoteScreenVideoRef.value) {
      remoteScreenVideoRef.value.srcObject = null;
    }
  });

  // Recibir nuevo mensaje de chat en tiempo real
  socket.value.on('new-chat-message', (message) => {
    console.log('💬 Nuevo mensaje recibido por socket:', message);
    if (!messages.value.some(m => m._id === message._id)) {
      messages.value.push(message);
      // Hacer scroll al final
      nextTick(() => {
        const container = document.querySelector('.card-content');
        if (container) container.scrollTop = container.scrollHeight;
      });
    }
  });

  // Usuario desconectado
  socket.value.on('user-disconnected', (data) => {
    if (data.userId === remoteUserId.value) {
      endCall();
    }
  });
};

const handleSendMessage = async () => {
  if (!newMessage.value.trim()) return;

  const messageData = {
    author: store.currentUser?.nombre || store.currentUser?.name || "Usuario",
    role: store.currentUser?.role || "cliente",
    content: newMessage.value.trim()
  };

  try {
    const ticketId = route.params.id;
    const updatedTicket = await store.sendTicketMessage(ticketId, messageData);
    
    if (updatedTicket) {
      const lastMessage = updatedTicket.messages[updatedTicket.messages.length - 1];
      
      // Emitir por socket para que el otro usuario lo reciba al instante
      if (socket.value) {
        socket.value.emit("chat-message", {
          ticketId: ticketId,
          message: lastMessage
        });
      }

      messages.value.push(lastMessage);
      newMessage.value = '';
      
      nextTick(() => {
        const container = document.querySelector('.card-content');
        if (container) container.scrollTop = container.scrollHeight;
      });
    }
  } catch (err) {
    console.error("Error al enviar mensaje:", err);
    alert("Error al enviar mensaje");
  }
};


const startCall = async (type) => {
  try {
    console.log(`📞 Iniciando ${type === 'voice' ? 'llamada de voz' : 'videollamada'}...`);
    console.log('🔍 Socket status:', socket.value ? 'Conectado' : 'NO conectado');
    
    if (!socket.value || !socket.value.connected) {
      alert('Socket no está conectado. Espera un momento e intenta de nuevo.');
      return;
    }
    
    // PASO 0: Registrar inicio de llamada INMEDIATAMENTE
    console.log(`\n📤 Emitiendo evento 'call-started'...`);
    console.log('🔌 Socket status:', { connected: socket.value?.connected, id: socket.value?.id });
    
    socket.value.emit('call-started', {
      callerSocketId: socket.value.id,
      callerName: store.currentUser?.name || 'Usuario',
      receiverSocketId: null,
      receiverName: null,
      ticketId: route.params.id,
      callType: type
    });
    
    console.log(`✅ Evento 'call-started' emitido correctamente\n`);
    
    // PASO 1: Iniciar temporizador de llamada
    callStartTime.value = new Date();
    callTimerInterval.value = setInterval(() => {
      if (callStartTime.value) {
        callDuration.value = Math.floor((new Date() - callStartTime.value) / 1000);
      }
    }, 1000);
    
    // PASO 2: Guardar tipo de llamada y mostrar el contenedor
    callType.value = type;
    inCall.value = true;
    callInProgress.value = true;
    
    // PASO 3: Esperar a que Vue renderice el elemento video
    await nextTick();
    console.log('✅ Vue renderizó el elemento video');
    
    // PASO 4: Solicitar stream según el tipo de llamada
    console.log(`🎬 Solicitando acceso a ${type === 'voice' ? 'micrófono' : 'cámara y micrófono'}...`);
    const constraints = type === 'voice' 
      ? { audio: true, video: false }
      : { video: { width: { min: 640, ideal: 1280, max: 1920 }, height: { min: 480, ideal: 720, max: 1080 } }, audio: true };
    
    localStream.value = await navigator.mediaDevices.getUserMedia(constraints);

    console.log('✅ Stream local obtenido:', localStream.value);
    console.log('🎥 Tracks:', localStream.value.getTracks());

    // PASO 5: Mostrar video local solo si es videollamada
    if (type === 'video' && localVideoRef.value) {
      console.log('📹 Asignando video a elemento ref...');
      localVideoRef.value.srcObject = localStream.value;
      localVideoRef.value.play().catch(e => console.error('Error al reproducir:', e));
      console.log('✅ Video local asignado');
    } else if (type === 'video') {
      console.error('❌ localVideoRef no está disponible!');
    }

    // PASO 6: Crear conexión peer
    peerConnection.value = new RTCPeerConnection({ iceServers: peerConfig.iceServers });

    // Agregar tracks locales
    localStream.value.getTracks().forEach(track => {
      peerConnection.value.addTrack(track, localStream.value);
    });

    // Manejar streams remotos
    peerConnection.value.ontrack = (event) => {
      console.log('🎬 ONTRACK EVENT RECEIVED');
      console.log('Track remoto recibido:', event.track.kind);
      console.log('Track details:', { kind: event.track.kind, id: event.track.id, enabled: event.track.enabled });
      console.log('Streams remotos:', event.streams);
      console.log('callType.value:', callType.value);
      
      // Manejo de track de VIDEO remoto (screen share en llamadas de voz, o video en videollamadas)
      if (event.track.kind === 'video') {
        console.log('📹 Procesando track de VIDEO');
        
        if (callType.value === 'voice') {
          // En llamada de voz, cualquier track de video es screen share
          console.log('📺 Track de VIDEO en llamada de voz → Screen share remoto');
          console.log('🔄 Estableciendo isRemoteSharingScreen = true');
          
          // Crear un MediaStream con el track de pantalla
          const screenStream = new MediaStream();
          screenStream.addTrack(event.track);
          console.log('✅ MediaStream creado con track de pantalla');
          console.log('📺 Track details:', { kind: event.track.kind, enabled: event.track.enabled });
          console.log('📺 Tracks en el stream:', screenStream.getTracks());
          
          // IMPORTANTE: Primero activamos isRemoteSharingScreen para que Vue renderice el elemento
          isRemoteSharingScreen.value = true;
          
          // Luego esperamos a que Vue renderice
          nextTick(() => {
            console.log('📺 nextTick ejecutado - elemento debería estar en DOM');
            
            if (remoteScreenVideoRef.value) {
              console.log('📺 remoteScreenVideoRef ENCONTRADO, asignando srcObject...');
              remoteScreenVideoRef.value.srcObject = screenStream;
              console.log('✅ srcObject asignado');
              
              // Intentar reproducir
              remoteScreenVideoRef.value.play()
                .then(() => console.log('✅ Play() ejecutado'))
                .catch(e => console.error('❌ Error en play():', e));
            } else {
              console.error('❌ remoteScreenVideoRef.value NO EXISTE');
            }
          });
        } else if (callType.value === 'video') {
          // En videollamada, el track de video es de la cámara
          console.log('🎥 Track de VIDEO en videollamada → Video remoto');
          
          if (event.streams && event.streams[0]) {
            remoteStream.value = event.streams[0];
            if (remoteVideoRef.value) {
              remoteVideoRef.value.srcObject = remoteStream.value;
              setTimeout(() => {
                remoteVideoRef.value?.play().catch(e => console.error('Error:', e));
              }, 100);
              console.log('✅ Video remoto asignado');
            }
          }
        }
      }
      
      // Manejo de track de AUDIO remoto
      if (event.track.kind === 'audio') {
        console.log('🔊 Procesando track de AUDIO');
        
        if (callType.value === 'voice') {
          // En llamada de voz, audio en remoteAudioRef
          console.log('🔊 Audio en llamada de voz');
          
          if (event.streams && event.streams[0]) {
            const audioStream = event.streams[0];
            if (remoteAudioRef.value) {
              remoteAudioRef.value.srcObject = audioStream;
              setTimeout(() => {
                remoteAudioRef.value?.play().catch(e => console.error('Error:', e));
              }, 100);
              console.log('✅ Audio remoto asignado');
            }
          }
        } else if (callType.value === 'video') {
          // En videollamada, el audio viene con el video (remoteVideoRef)
          console.log('🎥 Audio en videollamada (con video)');
        }
      }
    };

    // Manejar ICE candidates
    peerConnection.value.onicecandidate = (event) => {
      if (event.candidate && socket.value) {
        socket.value.emit('ice-candidate', {
          ticketId: route.params.id,
          candidate: event.candidate,
          to: remoteUserId.value
        });
      }
    };

    // Crear oferta
    const offer = await peerConnection.value.createOffer();
    await peerConnection.value.setLocalDescription(offer);

    // Enviar oferta inicial (nueva llamada, no renegotiation)
    socket.value.emit('incoming-call', {
      ticketId: route.params.id,
      offer: offer,
      callerName: store.currentUser?.name || 'Usuario',
      callType: type
    });

    console.log('📤 Oferta enviada');
  } catch (err) {
    console.error('Error en startCall:', err);
    inCall.value = false;
    callInProgress.value = false;
    alert('Error al iniciar llamada: ' + err.message);
  }
};

const acceptCall = async () => {
  try {
    console.log('📞 Aceptando llamada...');
    
    // PASO 1: Obtener tipo de llamada de los datos incientes
    callType.value = incomingCallData.value.callType || 'video';
    
    // PASO 2: Mostrar el contenedor de video PRIMERO
    remoteUserId.value = incomingCallData.value.from;
    showIncomingCall.value = false;
    inCall.value = true;
    callInProgress.value = true;
    
    // PASO 2.5: Iniciar el contador de duración
    callStartTime.value = new Date();
    callTimerInterval.value = setInterval(() => {
      if (callStartTime.value) {
        callDuration.value = Math.floor((new Date() - callStartTime.value) / 1000);
      }
    }, 1000);
    
    // PASO 2.7: Registrar aceptación de llamada en el servidor
    if (socket.value) {
      console.log(`\n📤 Emitiendo evento 'call-accepted'...`);
      console.log('🔌 currentUser:', store.currentUser);
      console.log('🔌 currentUser?.name:', store.currentUser?.name);
      console.log('🔌 receiverName a enviar:', store.currentUser?.name || 'Usuario');
      console.log('🔌 Datos a enviar:', JSON.stringify({
        callerSocketId: remoteUserId.value,
        receiverSocketId: socket.value.id,
        receiverName: store.currentUser?.name || 'Usuario',
        ticketId: route.params.id
      }, null, 2));
      
      socket.value.emit('call-accepted', {
        callerSocketId: remoteUserId.value,
        receiverSocketId: socket.value.id,
        receiverName: store.currentUser?.name || 'Usuario',
        ticketId: route.params.id
      });
      
      console.log(`✅ Evento 'call-accepted' emitido\n`);
    }
    
    // PASO 3: Esperar a que Vue renderice el elemento video
    await nextTick();
    console.log('✅ Vue renderizó el elemento video');

    // PASO 4: Obtener acceso según el tipo de llamada
    console.log(`🎬 Solicitando acceso a ${callType.value === 'voice' ? 'micrófono' : 'cámara y micrófono'}...`);
    const constraints = callType.value === 'voice' 
      ? { audio: true, video: false }
      : { video: { width: { min: 640, ideal: 1280, max: 1920 }, height: { min: 480, ideal: 720, max: 1080 } }, audio: true };
    
    localStream.value = await navigator.mediaDevices.getUserMedia(constraints);

    console.log('✅ Stream local obtenido:', localStream.value);

    // PASO 5: Mostrar video local solo si es videollamada
    if (callType.value === 'video' && localVideoRef.value) {
      console.log('📹 Asignando video a elemento ref...');
      localVideoRef.value.srcObject = localStream.value;
      localVideoRef.value.play().catch(e => console.error('Error al reproducir:', e));
      console.log('✅ Video local asignado');
    }

    // PASO 6: Crear conexión peer
    peerConnection.value = new RTCPeerConnection({ iceServers: peerConfig.iceServers });

    localStream.value.getTracks().forEach(track => {
      peerConnection.value.addTrack(track, localStream.value);
    });

    peerConnection.value.ontrack = (event) => {
      console.log('Track remoto recibido en acceptCall:', event.track.kind);
      console.log('Track details:', { kind: event.track.kind, id: event.track.id, enabled: event.track.enabled });
      console.log('Streams remotos:', event.streams);
      
      // Manejo de track de VIDEO remoto (screen share en llamadas de voz, o video en videollamadas)
      if (event.track.kind === 'video') {
        console.log('📹 Procesando track de VIDEO');
        
        if (callType.value === 'voice') {
          // En llamada de voz, cualquier track de video es screen share
          console.log('📺 Track de VIDEO en llamada de voz → Screen share remoto (acceptCall)');
          console.log('🔄 Estableciendo isRemoteSharingScreen = true');
          
          // Crear un MediaStream con el track de pantalla
          const screenStream = new MediaStream();
          screenStream.addTrack(event.track);
          console.log('✅ MediaStream creado con track de pantalla (acceptCall)');
          console.log('📺 Track details:', { kind: event.track.kind, enabled: event.track.enabled });
          console.log('📺 Tracks en el stream:', screenStream.getTracks());
          
          // IMPORTANTE: Primero activamos isRemoteSharingScreen para que Vue renderice el elemento
          isRemoteSharingScreen.value = true;
          
          // Luego esperamos a que Vue renderice
          nextTick(() => {
            console.log('📺 nextTick ejecutado (acceptCall) - elemento debería estar en DOM');
            
            if (remoteScreenVideoRef.value) {
              console.log('📺 remoteScreenVideoRef ENCONTRADO, asignando srcObject...');
              remoteScreenVideoRef.value.srcObject = screenStream;
              console.log('✅ srcObject asignado (acceptCall)');
              
              // Intentar reproducir
              remoteScreenVideoRef.value.play()
                .then(() => console.log('✅ Play() ejecutado (acceptCall)'))
                .catch(e => console.error('❌ Error en play() (acceptCall):', e));
            } else {
              console.error('❌ remoteScreenVideoRef.value NO EXISTE en nextTick (acceptCall)');
            }
          });
        } else if (callType.value === 'video') {
          // En videollamada, el track de video es de la cámara
          console.log('🎥 Track de VIDEO en videollamada → Video remoto');
          
          if (event.streams && event.streams[0]) {
            remoteStream.value = event.streams[0];
            if (remoteVideoRef.value) {
              remoteVideoRef.value.srcObject = remoteStream.value;
              setTimeout(() => {
                remoteVideoRef.value?.play().catch(e => console.error('Error:', e));
              }, 100);
              console.log('✅ Video remoto asignado');
            }
          }
        }
      }
      
      // Manejo de track de AUDIO remoto
      if (event.track.kind === 'audio') {
        console.log('🔊 Procesando track de AUDIO');
        
        if (callType.value === 'voice') {
          // En llamada de voz, audio en remoteAudioRef
          console.log('🔊 Audio en llamada de voz');
          
          if (event.streams && event.streams[0]) {
            const audioStream = event.streams[0];
            if (remoteAudioRef.value) {
              remoteAudioRef.value.srcObject = audioStream;
              setTimeout(() => {
                remoteAudioRef.value?.play().catch(e => console.error('Error:', e));
              }, 100);
              console.log('✅ Audio remoto asignado');
            }
          }
        } else if (callType.value === 'video') {
          // En videollamada, el audio viene con el video (remoteVideoRef)
          console.log('🎥 Audio en videollamada (con video)');
        }
      }
    };

    peerConnection.value.onicecandidate = (event) => {
      if (event.candidate && socket.value) {
        socket.value.emit('ice-candidate', {
          ticketId: route.params.id,
          candidate: event.candidate,
          to: remoteUserId.value
        });
      }
    };

    // Establecer oferta remota y crear respuesta
    await peerConnection.value.setRemoteDescription(new RTCSessionDescription(incomingCallData.value.offer));
    const answer = await peerConnection.value.createAnswer();
    await peerConnection.value.setLocalDescription(answer);

    // Enviar respuesta
    socket.value.emit('call-answer', {
      ticketId: route.params.id,
      answer: answer,
      to: remoteUserId.value
    });

    console.log('📤 Respuesta enviada');
  } catch (err) {
    console.error('Error en acceptCall:', err);
    inCall.value = false;
    callInProgress.value = false;
    alert('Error al aceptar llamada: ' + err.message);
  }
};

const handleAnswerReceived = async (answer) => {
  try {
    await peerConnection.value.setRemoteDescription(new RTCSessionDescription(answer));
  } catch (err) {
    console.error('Error al procesar respuesta:', err);
  }
};

const rejectCall = () => {
  socket.value.emit('reject-call', {
    to: incomingCallData.value.from
  });
  showIncomingCall.value = false;
  incomingCallData.value = null;
};

const toggleMute = () => {
  if (localStream.value) {
    localStream.value.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    isMuted.value = !isMuted.value;
  }
};

const toggleVideo = () => {
  if (localStream.value) {
    localStream.value.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    isVideoOff.value = !isVideoOff.value;
  }
};

const startScreenShare = async () => {
  try {
    console.log('🖥️ Solicitando pantalla...');
    
    // PASO 1: Mostrar el contenedor PRIMERO para que Vue renderice el elemento video
    isSharingScreen.value = true;
    await nextTick();
    console.log('📺 Elemento video renderizado');
    
    // PASO 2: Ahora obtener la pantalla
    screenStream.value = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always'
      },
      audio: false
    });

    console.log('✅ Pantalla compartida obtenida');
    console.log('📺 Ref disponible:', !!localScreenVideoRef.value);

    // PASO 3: Asignar el stream de pantalla al video element local
    if (localScreenVideoRef.value) {
      localScreenVideoRef.value.srcObject = screenStream.value;
      // Esperar un poco para asegurar que el navegador lo procese
      setTimeout(() => {
        if (localScreenVideoRef.value && localScreenVideoRef.value.play) {
          localScreenVideoRef.value.play().catch(e => console.error('Error al reproducir:', e));
        }
      }, 0);
      console.log('✅ Video de pantalla asignado');
    } else {
      console.error('❌ localScreenVideoRef.value es NULL');
    }

    // Obtener el track de video de la pantalla
    const screenTrack = screenStream.value.getVideoTracks()[0];

    // Agregar el track de pantalla como track adicional
    if (peerConnection.value) {
      // Guardar el track original por si queremos restaurarlo después
      originalVideoTrack.value = screenTrack;
      
      // Crear un nuevo MediaStream para el track de pantalla (IMPORTANTE)
      const screenMediaStream = new MediaStream();
      screenMediaStream.addTrack(screenTrack);
      
      // Agregar el track de pantalla a la conexión peer
      // Esto causará que el track sea enviado como un stream separado
      peerConnection.value.addTrack(screenTrack, screenMediaStream);
      console.log('✅ Track de pantalla agregado');
      console.log('📺 screenTrack:', { kind: screenTrack.kind, enabled: screenTrack.enabled, id: screenTrack.id });

      // RENEGOTIATION: Crear nueva oferta para que el receiver reciba el nuevo track
      console.log('🔄 Iniciando renegotiation...');
      try {
        const newOffer = await peerConnection.value.createOffer();
        await peerConnection.value.setLocalDescription(newOffer);
        
        // Enviar nueva oferta al otro usuario para que acuerde recibir el nuevo track
        if (socket.value && remoteUserId.value) {
          console.log('📤 Enviando nueva oferta para screen share...');
          socket.value.emit('call-offer', {
            ticketId: route.params.id,
            offer: newOffer,
            callerName: store.currentUser?.name || 'Usuario',
            callType: callType.value
          });
        }
      } catch (err) {
        console.error('Error durante renegotiation:', err);
      }

      // Notificar a la otra persona que estamos compartiendo pantalla
      if (socket.value) {
        socket.value.emit('screen-share-started', {
          ticketId: route.params.id,
          from: store.currentUser.id
        });
      }

      // Si el usuario detiene la pantalla desde el selector del SO
      screenTrack.onended = () => {
        console.log('❌ Pantalla finalizada por el usuario');
        stopScreenShare();
      };
    }
  } catch (err) {
    console.error('Error al compartir pantalla:', err);
    if (err.name !== 'NotAllowedError') {
      alert('Error al compartir pantalla: ' + err.message);
    }
  }
};

const stopScreenShare = async () => {
  try {
    console.log('🖥️ Deteniendo compartición de pantalla...');

    // Limpiar el video de pantalla local
    if (localScreenVideoRef.value) {
      localScreenVideoRef.value.srcObject = null;
    }

    // Detener todos los tracks de la pantalla
    if (screenStream.value) {
      screenStream.value.getTracks().forEach(track => track.stop());
      
      // Remover el sender del track de pantalla de la conexión peer
      if (peerConnection.value) {
        const screenSender = peerConnection.value
          .getSenders()
          .find(s => s.track && s.track.kind === 'video' && screenStream.value && screenStream.value.getTracks().includes(s.track));
        
        if (screenSender) {
          await peerConnection.value.removeTrack(screenSender);
          console.log('✅ Track de pantalla removido de la conexión peer');
        }
      }
      
      screenStream.value = null;
    }

    isSharingScreen.value = false;
    originalVideoTrack.value = null;

    // Notificar a la otra persona que dejamos de compartir
    if (socket.value && store.currentUser) {
      socket.value.emit('screen-share-stopped', {
        ticketId: route.params.id,
        from: store.currentUser.id
      });
    }
  } catch (err) {
    console.error('Error al detener screen share:', err);
  }
};

const endCall = () => {
  if (remoteUserId.value && socket.value) {
    socket.value.emit('end-call', {
      ticketId: route.params.id,
      to: remoteUserId.value
    });
    
    // Registrar término de llamada
    socket.value.emit('call-ended', {
      duration: callDuration.value,
      screenShared: isSharingScreen.value
    });
  }

  // Detener el temporizador de duración
  if (callTimerInterval.value) {
    clearInterval(callTimerInterval.value);
    callTimerInterval.value = null;
  }

  // Detener screen share si está activo
  if (isSharingScreen.value && screenStream.value) {
    screenStream.value.getTracks().forEach(track => track.stop());
    screenStream.value = null;
    isSharingScreen.value = false;
  }

  // Cerrar streams
  if (localStream.value) {
    localStream.value.getTracks().forEach(track => track.stop());
  }

  // Cerrar conexión peer
  if (peerConnection.value) {
    peerConnection.value.close();
  }

  inCall.value = false;
  callInProgress.value = false;
  callType.value = null;
  isSharingScreen.value = false;
  localStream.value = null;
  remoteStream.value = null;
  peerConnection.value = null;
  remoteUserId.value = null;
  isMuted.value = false;
  isVideoOff.value = false;
  callStartTime.value = null;
  callDuration.value = 0;
};


const handleChangeStatus = async (newStatus) => {
  try {
    await store.updateTicket(route.params.id, {
      ...ticket.value,
      status: newStatus
    });
    ticket.value.status = newStatus;
    alert('Estado actualizado correctamente');
  } catch (err) {
    alert('Error al cambiar el estado: ' + err.message);
  }
};

const handleReopenTicket = async () => {
  if (!confirm('¿Deseas reabrir este ticket?')) {
    return;
  }

  try {
    await store.updateTicket(route.params.id, {
      ...ticket.value,
      status: 'abierto',
      endDate: null
    });
    ticket.value.status = 'abierto';
    ticket.value.endDate = null;
    alert('Ticket reabierto correctamente');
  } catch (err) {
    alert('Error al reabrir ticket: ' + err.message);
  }
};

const handleCloseTicketAndCreateAlbaran = async () => {
  if (!confirm('¿Deseas cerrar este ticket y crear un albarán con la información?')) {
    return;
  }

  try {
    // Primero cerrar el ticket
    await store.updateTicket(route.params.id, {
      ...ticket.value,
      status: 'cerrado',
      endDate: new Date()
    });

    // Guardar los datos del ticket en sessionStorage para pre-llenar el albarán
    const albaranData = {
      cliente: ticket.value.cliente || '',
      tecnico: ticket.value.tecnico || '',
      ticket: route.params.id,
      descripcion: `Servicio relacionado con: ${ticket.value.title}`,
      numeroAlbaran: 'AUTO_GENERATE',
      lineas: []
    };

    sessionStorage.setItem('ticketAlbaranData', JSON.stringify(albaranData));
    
    // Navegar a Albaranes
    router.push('/albaranes');
  } catch (err) {
    alert('Error al cerrar ticket: ' + err.message);
  }
};

const getStatusColor = (status) => {
  switch(status) {
    case 'abierto': return 'badge-abierto';
    case 'en progreso': return 'badge-in-progress';
    case 'cerrado': return 'badge-cerrado';
    default: return 'badge-default';
  }
};

const getPriorityColor = (priority) => {
  switch(priority) {
    case 'alta': return 'badge-high';
    case 'media': return 'badge-medium';
    case 'baja': return 'badge-low';
    default: return 'badge-default';
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleString('es-ES');
};
</script>

<template>
  <div class="page-content">
    <!-- Header -->
    <div class="page-header">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <button @click="router.back()" class="btn btn-ghost btn-icon">
          <ArrowLeft />
        </button>
        <div v-if="ticket">
          <h1 class="page-title">{{ ticket.title }}</h1>
          <p class="page-subtitle">#{{ ticket._id?.slice(-6).toUpperCase() }} - {{ ticket.client }}</p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card">
      <p style="text-align: center; padding: 2rem;">Cargando ticket...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card" style="background-color: #fee; border-color: #fcc;">
      <div style="display: flex; gap: 1rem; align-items: flex-start;">
        <AlertCircle style="color: #c33; flex-shrink: 0;" />
        <div>
          <h3 style="color: #c33; margin: 0 0 0.5rem 0;">Error</h3>
          <p style="margin: 0; color: #666;">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Ticket Details -->
    <div v-else-if="ticket" style="display: flex; flex-direction: column; gap: 1.5rem; min-height: calc(100vh - 120px);">
      <!-- Detalles del Ticket - Collapsible -->
      <details class="ticket-details-collapsible" style="border: 1px solid var(--border); border-radius: 0.5rem; overflow: hidden; flex-shrink: 0;">
        <summary style="
          padding: 1rem 1.5rem;
          background-color: var(--muted);
          cursor: pointer;
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
        ">
          <span style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.125rem;">📋</span>
            Detalles del Ticket
          </span>
          <span style="font-size: 0.75rem; color: var(--muted-foreground);">#{{ ticket._id?.slice(-6).toUpperCase() }}</span>
        </summary>
        
        <div class="card-content" style="border-top: 1px solid var(--border);">
          <!-- Estado y Prioridad -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
            <div>
              <div style="font-size: 0.875rem; color: var(--muted-foreground); margin-bottom: 0.5rem; font-weight: 500;">Estado</div>
              <div v-if="ticket.status !== 'cerrado'" style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                <span :class="['badge', getStatusColor(ticket.status)]">{{ ticket.status }}</span>
                <select 
                  :value="ticket.status" 
                  @change="(e) => {
                    if (e.target.value === 'cerrado') {
                      handleCloseTicketAndCreateAlbaran();
                    } else {
                      handleChangeStatus(e.target.value);
                    }
                  }"
                  style="padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: 4px; font-size: 0.875rem;"
                >
                  <option value="abierto">Abierto</option>
                  <option value="en progreso">En Progreso</option>
                  <option value="cerrado">Cerrar y crear albarán</option>
                </select>
              </div>
              <div v-else style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                <span :class="['badge', getStatusColor(ticket.status)]">{{ ticket.status }}</span>
                <button @click="handleReopenTicket" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.75rem;">Reabrir</button>
                <button @click="handleCloseTicketAndCreateAlbaran" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.75rem;">Crear Albarán</button>
              </div>
            </div>
            <div>
              <div style="font-size: 0.875rem; color: var(--muted-foreground); margin-bottom: 0.5rem; font-weight: 500;">Prioridad</div>
              <span :class="['badge', getPriorityColor(ticket.priority)]">{{ ticket.priority }}</span>
            </div>
          </div>

          <!-- Información del Ticket -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <div>
              <div style="font-size: 0.875rem; color: var(--muted-foreground); margin-bottom: 0.25rem; font-weight: 500;">Cliente</div>
              <p style="margin: 0; font-weight: 500;">{{ ticket.cliente?.nombreEmpresa || 'Sin asignar' }}</p>
            </div>

            <div>
              <div style="font-size: 0.875rem; color: var(--muted-foreground); margin-bottom: 0.25rem; font-weight: 500;">Técnico Asignado</div>
              <p style="margin: 0; font-weight: 500;">{{ ticket.tecnico?.nombre || 'Sin asignar' }}</p>
            </div>

            <div style="grid-column: 1 / -1;">
              <div style="font-size: 0.875rem; color: var(--muted-foreground); margin-bottom: 0.25rem; font-weight: 500;">Descripción</div>
              <p style="margin: 0; line-height: 1.5; color: var(--muted-foreground);">{{ ticket.description }}</p>
            </div>

            <div>
              <div style="font-size: 0.875rem; color: var(--muted-foreground); margin-bottom: 0.25rem; font-weight: 500;">Fecha de Apertura</div>
              <p style="margin: 0; font-size: 0.875rem;">{{ formatDate(ticket.startDate) }}</p>
            </div>
            <div v-if="ticket.endDate">
              <div style="font-size: 0.875rem; color: var(--muted-foreground); margin-bottom: 0.25rem; font-weight: 500;">Fecha de Cierre</div>
              <p style="margin: 0; font-size: 0.875rem;">{{ formatDate(ticket.endDate) }}</p>
            </div>
          </div>
        </div>
      </details>

      <!-- Panel Principal - Chat y Llamadas -->
      <div class="card" style="flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: auto;">
        <div class="card-header">
          <h2 class="card-title">
            <MessageCircle style="width: 20px; height: 20px; display: inline; margin-right: 0.5rem;" />
            Conversación
          </h2>
          <!-- Botones de Llamada en Header -->
          <div style="margin-left: auto; display: flex; gap: 0.5rem; align-items: center;">
            <button 
              v-if="!callInProgress && !inCall" 
              @click="startCall('voice')" 
              class="btn btn-primary"
              style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem;"
            >
              <Phone style="width: 18px; height: 18px;" />
              Llamada de voz
            </button>
            <button 
              v-if="!callInProgress && !inCall" 
              @click="startCall('video')" 
              class="btn btn-primary"
              style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem;"
            >
              <Video style="width: 18px; height: 18px;" />
              Videollamada
            </button>
            <span v-if="inCall" style="color: #10b981; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
              <div style="width: 8px; height: 8px; background-color: #10b981; border-radius: 50%; animation: pulse 2s infinite;"></div>
              {{ callType === 'voice' ? 'Llamada de voz' : 'Videollamada' }} en curso
            </span>
          </div>
        </div>

        <!-- Área de Llamada -->
        <div v-if="inCall" class="video-container" style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem; background-color: var(--muted); border-radius: 8px; max-height: 580px; overflow: hidden;">
          
          <!-- Indicador de compartición de pantalla (solo en llamada de voz) -->
          <div v-if="callType === 'voice' && isSharingScreen" style="background-color: #3b82f6; color: white; padding: 0.75rem 1rem; border-radius: 6px; display: flex; align-items: center; gap: 0.5rem; font-weight: 500;">
            <Monitor style="width: 16px; height: 16px;" />
            Estás compartiendo tu pantalla
          </div>

          <!-- Layout para Videollamada -->
          <div v-if="callType === 'video'" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; height: 480px;">
            <!-- Video Local -->
            <div style="position: relative; background-color: #000; border-radius: 6px; overflow: hidden;">
              <video 
                ref="localVideoRef" 
                autoplay 
                playsinline 
                muted
                style="width: 100%; height: 100%; object-fit: cover; display: block;"
              ></video>
              <div style="position: absolute; bottom: 0.5rem; left: 0.5rem; font-size: 0.75rem; color: white; background-color: rgba(0,0,0,0.5); padding: 0.25rem 0.5rem; border-radius: 3px;">
                Tú
              </div>
            </div>
            
            <!-- Video Remoto -->
            <div style="position: relative; background-color: #000; border-radius: 6px; overflow: hidden;">
              <video 
                ref="remoteVideoRef"
                autoplay
                playsinline
                style="width: 100%; height: 100%; object-fit: cover; display: block;"
              ></video>
              <div v-if="!remoteStream" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #999; text-align: center;">
                <div style="font-size: 0.875rem;">Esperando conexión...</div>
              </div>
              <div v-else style="position: absolute; bottom: 0.5rem; left: 0.5rem; font-size: 0.75rem; color: white; background-color: rgba(0,0,0,0.5); padding: 0.25rem 0.5rem; border-radius: 3px;">
                Otra persona
              </div>
            </div>
          </div>

          <!-- Layout para Llamada de Voz (con opción de compartir pantalla) -->
          <div v-else-if="callType === 'voice'" style="height: 480px; overflow: hidden; display: flex; flex-direction: column; gap: 1rem;">
            <!-- Elemento de audio remoto (oculto pero activo) -->
            <audio 
              ref="remoteAudioRef" 
              autoplay
              style="display: none;"
            ></audio>
            
            <!-- Pantalla remota si la otra persona la comparte -->
            <div v-show="isRemoteSharingScreen" style="position: relative; background-color: #000; border-radius: 6px; overflow: hidden; flex: 1;">
              <video 
                ref="remoteScreenVideoRef" 
                autoplay 
                playsinline
                muted
                style="width: 100%; height: 100%; object-fit: contain; display: block; background-color: #000;"
              ></video>
              <div style="position: absolute; bottom: 0.5rem; left: 0.5rem; font-size: 0.75rem; color: white; background-color: rgba(0,0,0,0.5); padding: 0.25rem 0.5rem; border-radius: 3px;">
                Pantalla compartida
              </div>
            </div>
            
            <!-- Pantalla local si se está compartiendo -->
            <div v-show="isSharingScreen && !isRemoteSharingScreen" style="position: relative; background-color: #000; border-radius: 6px; overflow: hidden; flex: 1;">
              <video 
                ref="localScreenVideoRef" 
                autoplay 
                playsinline
                muted
                style="width: 100%; height: 100%; object-fit: contain; display: block; background-color: #000;"
              ></video>
              <div style="position: absolute; bottom: 0.5rem; left: 0.5rem; font-size: 0.75rem; color: white; background-color: rgba(0,0,0,0.5); padding: 0.25rem 0.5rem; border-radius: 3px;">
                Tu pantalla compartida
              </div>
            </div>
            
            <!-- Ícono de llamada de voz cuando no hay screen sharing -->
            <div v-show="!isSharingScreen && !isRemoteSharingScreen" style="background-color: #000; border-radius: 6px; padding: 2rem; text-align: center; flex: 1; display: flex; align-items: center; justify-content: center;">
              <div style="color: white; text-align: center;">
                <Phone style="width: 36px; height: 36px; margin-bottom: 0.5rem; animation: pulse 2s infinite;" />
                <p style="font-size: 0.95rem; font-weight: 600; margin-bottom: 0.25rem;">Llamada de voz en curso</p>
                <p style="color: #999; margin: 0; font-size: 0.8rem;">Presiona "Compartir pantalla" para comenzar</p>
              </div>
            </div>
          </div>

          <!-- Controles de Llamada -->
          <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
            <!-- Controles de Micrófono y Video (solo en videollamada) -->
            <button 
              v-if="callType === 'video'"
              @click="toggleMute" 
              :class="['btn', isMuted ? 'btn-secondary' : 'btn-default']"
              style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; font-size: 0.85rem;"
            >
              <MicOff v-if="isMuted" style="width: 18px; height: 18px;" />
              <Mic v-else style="width: 18px; height: 18px;" />
              {{ isMuted ? 'Mute' : 'Micrófono' }}
            </button>

            <button 
              v-if="callType === 'video'"
              @click="toggleVideo" 
              :class="['btn', isVideoOff ? 'btn-secondary' : 'btn-default']"
              style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; font-size: 0.85rem;"
            >
              <VideoOff v-if="isVideoOff" style="width: 18px; height: 18px;" />
              <Video v-else style="width: 18px; height: 18px;" />
              {{ isVideoOff ? 'Video off' : 'Cámara' }}
            </button>

            <!-- Botón de Micrófono en Llamada de Voz -->
            <button 
              v-if="callType === 'voice'"
              @click="toggleMute" 
              :class="['btn', isMuted ? 'btn-secondary' : 'btn-default']"
              style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; font-size: 0.85rem;"
            >
              <MicOff v-if="isMuted" style="width: 18px; height: 18px;" />
              <Mic v-else style="width: 18px; height: 18px;" />
              {{ isMuted ? 'Mute' : 'Micrófono' }}
            </button>

            <!-- Botón de Compartir Pantalla (solo en llamada de voz) -->
            <button 
              v-if="callType === 'voice'"
              @click="isSharingScreen ? stopScreenShare() : startScreenShare()" 
              :class="['btn', isSharingScreen ? 'btn-primary' : 'btn-default']"
              style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; font-size: 0.85rem;"
            >
              <Monitor style="width: 18px; height: 18px;" />
              {{ isSharingScreen ? 'Parar' : 'Pantalla' }}
            </button>

            <!-- Botón de Finalizar Llamada -->
            <button 
              @click="endCall" 
              class="btn btn-danger"
              style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; font-size: 0.85rem;"
            >
              <Phone style="width: 18px; height: 18px;" />
              Colgar
            </button>
          </div>
        </div>

        <!-- Modal de Llamada Entrante -->
        <div v-if="showIncomingCall" class="incoming-call-modal">
          <div style="background-color: white; border-radius: 8px; padding: 2rem; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-width: 400px;">
            <Phone style="width: 48px; height: 48px; color: var(--primary); margin-bottom: 1rem; animation: ring 1s infinite;" />
            <h3 style="margin-top: 0; margin-bottom: 0.5rem;">{{ incomingCallData?.callType === 'voice' ? 'Llamada de voz entrante' : 'Videollamada entrante' }}</h3>
            <p style="color: var(--muted-foreground); margin-bottom: 2rem;">{{ incomingCallData?.from || 'Otra persona' }} quiere comunicarse contigo</p>
            
            <div style="display: flex; gap: 1rem; justify-content: center;">
              <button 
                @click="acceptCall" 
                class="btn btn-primary"
                style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background-color: #10b981; border: none; color: white; border-radius: 6px; cursor: pointer; font-weight: 600;"
              >
                <Phone style="width: 20px; height: 20px;" />
                Aceptar
              </button>
              <button 
                @click="rejectCall" 
                class="btn btn-secondary"
                style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background-color: #ef4444; border: none; color: white; border-radius: 6px; cursor: pointer; font-weight: 600;"
              >
                <X style="width: 20px; height: 20px;" />
                Rechazar
              </button>
            </div>
          </div>
        </div>

        <!-- Área de Mensajes -->
        <div class="card-content" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem;">
          <div v-if="messages.length === 0" style="text-align: center; color: var(--muted-foreground); padding: 2rem 1rem; margin: auto;">
            <MessageCircle style="width: 40px; height: 40px; opacity: 0.2; margin-bottom: 1rem;" />
            <p>No hay mensajes aún. Sé el primero en escribir.</p>
          </div>

          <div 
            v-for="(msg, index) in messages" 
            :key="index" 
            class="message-item"
            :class="{ 'message-own': msg.author === (store.currentUser?.nombre || store.currentUser?.name) }"
          >
            <div style="font-size: 0.75rem; color: var(--muted-foreground); margin-bottom: 0.25rem; font-weight: 500;">
              {{ msg.author }} • {{ formatDate(msg.createdAt) }}
            </div>
            <p style="margin: 0; line-height: 1.4; word-break: break-word;">{{ msg.content }}</p>
          </div>
        </div>

        <!-- Input de Mensaje -->
        <div class="card-footer" style="border-top: 1px solid var(--border); padding: 1rem; margin-top: auto; display: flex; flex-direction: column; gap: 0.75rem;">

          <form @submit.prevent="handleSendMessage" style="display: flex; gap: 0.75rem;">
            <input
              v-model="newMessage"
              type="text"
              class="form-input"
              placeholder="Escribe tu mensaje..."
              style="flex: 1;"
            />
            <button type="submit" class="btn btn-primary" style="display: flex; align-items: center; gap: 0.5rem;">
              <Send style="width: 18px; height: 18px;" />
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

<style scoped>
.ticket-details-collapsible {
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.ticket-details-collapsible summary {
  padding: 1rem 1.5rem;
  background-color: var(--muted);
  cursor: pointer;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  transition: background-color 0.15s ease;
}

.ticket-details-collapsible summary:hover {
  background-color: var(--border);
}

.ticket-details-collapsible summary::-webkit-details-marker {
  display: none;
}

.ticket-details-collapsible[open] summary {
  background-color: var(--primary-light);
  border-bottom: 2px solid var(--primary);
}

.message-item {
  padding: 0.75rem 1rem;
  border-radius: 18px;
  max-width: 75%;
  word-wrap: break-word;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease-out;
}

.message-item:not(.message-own) {
  align-self: flex-start;
  background-color: #f1f1f1;
  color: #333;
  border-bottom-left-radius: 4px;
}

.message-item.message-own {
  align-self: flex-end;
  background-color: #dcf8c6;
  color: #000;
  border-bottom-right-radius: 4px;
}

.message-item:not(.message-own) + .message-item.message-own,
.message-item.message-own + .message-item:not(.message-own) {
  margin-top: 0.5rem;
}

.message-own strong {
  display: none;
}

.video-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--muted);
  border-radius: 8px;
  flex-shrink: 0;
}

.incoming-call-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease-out;
}

.btn-default {
  background-color: var(--muted);
  color: var(--foreground);
  border: 1px solid var(--border);
}

.btn-default:hover {
  background-color: var(--border);
}

.btn-danger {
  background-color: #ef4444;
  color: white;
  border: none;
}

.btn-danger:hover {
  background-color: #dc2626;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

@keyframes ring {
  0%, 100% {
    transform: rotate(0deg);
  }
  10%, 20% {
    transform: rotate(-25deg);
  }
  30%, 50%, 70%, 90% {
    transform: rotate(25deg);
  }
  40%, 60%, 80% {
    transform: rotate(-25deg);
  }
}

@media (max-width: 1024px) {
  .container-layout {
    grid-template-columns: 1fr;
  }

  .video-container {
    height: auto;
  }
}

@media (max-width: 768px) {
  .container-layout {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .video-container > div {
    grid-template-columns: 1fr !important;
    height: auto !important;
  }
}
</style>
