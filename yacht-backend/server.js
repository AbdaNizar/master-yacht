require('dotenv').config();
const express = require('express');
const connectDB = require('./config/database.js');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const yachtRoutes = require('./routes/yachtRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const stripe = require('./routes/stripeRoute');
const orderRoute = require('./routes/orderRoutes');
const notificationRoutes = require('./routes/notificationRoute');
const weatherRoute = require('./routes/weatherRoute');
const adminRoutes = require('./routes/adminRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const chatRoutes = require('./routes/chatRoutes');
const aiRoutes = require('./routes/aiRoutes');
const path = require('path');
const fileUpload = require('express-fileupload');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { initScheduledJobs } = require('./actions/prepareCron');
const app = express();
const http = require('http');
connectDB();

app.use(
    cors({
        origin: 'http://localhost:4200',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(
    fileUpload({
        useTempFiles: true,
        tempFileDir: '/tmp/',
        createParentPath: true,
    })
);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/users', userRoutes);
app.use('/yachts', yachtRoutes);
app.use('/bookings', bookingRoutes);
app.use('/notification', notificationRoutes);
app.use('/stripe', stripe);
app.use('/orders', orderRoute);
app.use('/admin', adminRoutes);
app.use('/weathers', weatherRoute);
app.use('/reviews', reviewRoutes);
app.use('/recommendations', recommendationRoutes);
app.use('/chat', chatRoutes);
app.use('/ai', aiRoutes);

initScheduledJobs();

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please close the other application or change the port.`);
        process.exit(1);
    } else {
        throw err;
    }
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${PORT}/api/`);
});

const wss = new WebSocket.Server({ server, path: '/api/' });

// Passer l'instance WebSocket au chatController
const chatController = require('./controllers/chatController');
chatController.setWebSocketServer(wss);

wss.on('connection', (ws, req) => {
    console.log('🔌 New WebSocket connection established');
    console.log('📍 URL:', req.url);

    // Extraire le token de l'URL
    const urlParts = req.url.split('?');
    console.log('📍 URL Parts:', urlParts);
    
    const queryString = urlParts[1];
    console.log('📍 Query String:', queryString);
    
    const urlParams = new URLSearchParams(queryString);
    const token = urlParams.get('token');
    
    console.log('🔑 Token extrait:', token ? `${token.substring(0, 20)}...` : 'null');

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            ws.userId = decoded.id;
            console.log('✅ WebSocket authenticated for user:', ws.userId);
        } catch (error) {
            console.error('❌ WebSocket auth failed:', error.message);
        }
    } else {
        console.warn('⚠️ No token provided in WebSocket connection');
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed for user:', ws.userId);
    });

    ws.send(JSON.stringify({ type: 'connected', message: 'Welcome to WebSocket server!' }));
});

// Export pour compatibilité (optionnel)
const getServerAndWss = async () => {
    return { server, wss };
};

module.exports = { getServerAndWss };
