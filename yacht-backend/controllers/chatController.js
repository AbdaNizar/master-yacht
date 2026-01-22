const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Variable globale pour stocker wss (meilleure approche)
let wssInstance = null;

exports.setWebSocketServer = (wss) => {
    wssInstance = wss;
    console.log('✅ WebSocket instance définie dans chatController');
};

exports.getConversations = async (req, res) => {
    try {
        const userId = req.user.id;

        const conversations = await Conversation.find({
            participants: userId
        })
        .populate('participants', 'name email image role')
        .populate('yacht', 'name images')
        .populate('booking')
        .populate({
            path: 'lastMessage',
            select: 'content createdAt sender isRead'
        })
        .sort({ lastMessageAt: -1 });

        const conversationsWithUnread = await Promise.all(
            conversations.map(async (conv) => {
                const unreadCount = await Message.countDocuments({
                    conversation: conv._id,
                    receiver: userId,
                    isRead: false
                });

                return {
                    ...conv.toObject(),
                    unreadCount
                };
            })
        );

        res.json({
            success: true,
            data: conversationsWithUnread
        });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching conversations'
        });
    }
};

exports.getOrCreateConversation = async (req, res) => {
    try {
        const userId = req.user.id;
        const { participantId, bookingId } = req.body;

        console.log('🔍 Recherche conversation entre:', userId, 'et', participantId);

        let conversation = await Conversation.findOne({
            participants: { $all: [userId, participantId] }
        })
        .populate('participants', 'name email image role')
        .populate('yacht', 'name images')
        .populate('booking');

        if (conversation) {
            console.log('✅ Conversation existante trouvée:', conversation._id);
            
            if (bookingId && !conversation.booking) {
                const booking = await require('../models/Booking').findById(bookingId);
                conversation.booking = bookingId;
                conversation.yacht = booking ? booking.yacht : conversation.yacht;
                await conversation.save();
                
                conversation = await Conversation.findById(conversation._id)
                    .populate('participants', 'name email image role')
                    .populate('yacht', 'name images')
                    .populate('booking');
            }
        } else {
            console.log('📝 Création d\'une nouvelle conversation');
            
            const booking = bookingId ? await require('../models/Booking').findById(bookingId) : null;
            
            conversation = await Conversation.create({
                participants: [userId, participantId],
                booking: bookingId || null,
                yacht: booking ? booking.yacht : null
            });

            conversation = await Conversation.findById(conversation._id)
                .populate('participants', 'name email image role')
                .populate('yacht', 'name images')
                .populate('booking');
                
            console.log('✅ Nouvelle conversation créée:', conversation._id);
        }

        res.json({
            success: true,
            data: conversation
        });
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating conversation'
        });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 50, page = 1 } = req.query;
        const userId = req.user.id;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.includes(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const total = await Message.countDocuments({ conversation: conversationId });
        const messages = await Message.find({ conversation: conversationId })
            .populate('sender', 'name image')
            .populate('receiver', 'name image')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        res.json({
            success: true,
            data: messages.reverse(),
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching messages'
        });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId, content } = req.body;

        console.log('📨 Envoi message - User:', userId, 'Conversation:', conversationId);

        const conversation = await Conversation.findById(conversationId)
            .populate('participants', 'name email image role');

        if (!conversation || !conversation.participants.find(p => p._id.toString() === userId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const receiver = conversation.participants.find(p => p._id.toString() !== userId);

        const message = await Message.create({
            conversation: conversationId,
            sender: userId,
            receiver: receiver._id,
            content
        });

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: message._id,
            lastMessageAt: new Date()
        });

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'name image')
            .populate('receiver', 'name image');

        // DEBUG: Afficher les participants de la conversation
        console.log('👥 Participants de la conversation:');
        conversation.participants.forEach(p => {
            console.log(`  - ${p.name} (${p._id.toString()})`);
        });

        // Broadcast le message à TOUS les participants via WebSocket
        console.log('📡 Broadcasting message via WebSocket...');
        if (wssInstance) {
            console.log(`📊 Nombre total de clients WebSocket: ${wssInstance.clients.size}`);
            
            let sentCount = 0;
            wssInstance.clients.forEach(client => {
                console.log(`  🔍 Client userId: "${client.userId}", readyState: ${client.readyState}`);
                
                // Envoyer à tous les clients connectés qui font partie de cette conversation
                const isParticipant = conversation.participants.some(
                    p => p._id.toString() === client.userId
                );
                
                console.log(`  → Est participant? ${isParticipant}`);
                
                if (client.readyState === 1 && isParticipant) {
                    client.send(JSON.stringify({
                        type: 'new_message',
                        data: populatedMessage
                    }));
                    sentCount++;
                    console.log(`  ✅ Message envoyé à user: ${client.userId}`);
                }
            });
            console.log(`📡 Message broadcasté à ${sentCount} client(s) sur ${wssInstance.clients.size} connecté(s)`);
            
            if (sentCount === 0) {
                console.warn('⚠️ AUCUN message broadcasté! Vérifier que les clients ont userId défini');
            }
        } else {
            console.error('❌ WebSocket instance NON disponible!');
        }

        res.json({
            success: true,
            data: populatedMessage
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending message'
        });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        const result = await Message.updateMany(
            {
                conversation: conversationId,
                receiver: userId,
                isRead: false
            },
            {
                isRead: true,
                readAt: new Date()
            }
        );

        console.log('✅ Marqué comme lu:', result.modifiedCount, 'messages');

        if (wssInstance && result.modifiedCount > 0) {
            const conversation = await Conversation.findById(conversationId);
            if (conversation) {
                const otherParticipant = conversation.participants.find(
                    p => p.toString() !== userId
                );
                
                wssInstance.clients.forEach(client => {
                    if (client.readyState === 1 && client.userId === otherParticipant.toString()) {
                        client.send(JSON.stringify({
                            type: 'messages_read',
                            data: { conversationId, count: result.modifiedCount }
                        }));
                    }
                });
            }
        }

        res.json({
            success: true,
            message: 'Messages marked as read',
            count: result.modifiedCount
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking messages as read'
        });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const unreadCount = await Message.countDocuments({
            receiver: userId,
            isRead: false
        });

        res.json({
            success: true,
            data: { unreadCount }
        });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting unread count'
        });
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        const message = await Message.findById(messageId);
        
        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        if (message.sender.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const conversationId = message.conversation;
        await Message.findByIdAndDelete(messageId);

        console.log('🗑️ Message supprimé:', messageId);

        if (wssInstance) {
            const conversation = await Conversation.findById(conversationId);
            if (conversation) {
                wssInstance.clients.forEach(client => {
                    const isParticipant = conversation.participants.some(
                        p => p.toString() === client.userId
                    );
                    
                    if (client.readyState === 1 && isParticipant) {
                        client.send(JSON.stringify({
                            type: 'message_deleted',
                            data: { messageId, conversationId }
                        }));
                    }
                });
            }
        }

        res.json({
            success: true,
            message: 'Message deleted'
        });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.notifyTyping = async (req, res) => {
    try {
        const { conversationId, isTyping } = req.body;
        const userId = req.user.id;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.includes(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (wssInstance) {
            wssInstance.clients.forEach(client => {
                const isOtherParticipant = conversation.participants.some(
                    p => p.toString() === client.userId && client.userId !== userId
                );
                
                if (client.readyState === 1 && isOtherParticipant) {
                    client.send(JSON.stringify({
                        type: 'typing',
                        data: {
                            conversationId,
                            userId,
                            isTyping
                        }
                    }));
                }
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error notifying typing:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
