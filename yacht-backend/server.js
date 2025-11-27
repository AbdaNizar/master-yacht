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
const path = require('path');
const fileUpload = require('express-fileupload');
const WebSocket = require('ws');
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




initScheduledJobs();

const startServer = () => {
    const server = http.createServer(app);
    const PORT = 3001;

    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`WebSocket server running on ws://localhost:${PORT}/api/`);
    });

    const wss = new WebSocket.Server({ server, path: '/api/' });

    wss.on('connection', (ws) => {
        console.log('New WebSocket connection established');

        ws.on('message', (message) => {
            console.log('Received:', message);
        });

        ws.on('close', () => {
            console.log('WebSocket connection closed');
        });

        ws.send(JSON.stringify({ message: 'Welcome to WebSocket server!' }));
    });

    return { server, wss };
};

const { server, wss } = startServer();


const getServerAndWss = async () => {
    let data = {
        server,
        wss
    }
    return data
}

module.exports = {
    getServerAndWss
}
