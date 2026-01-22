const Notification = require('../models/Notification');
const User = require('../models/User');

// Import conditionnel de nodemailer
let nodemailer;
try {
    nodemailer = require('nodemailer');
} catch (error) {
    console.warn('⚠️  Nodemailer non disponible. Les emails ne seront pas envoyés.');
    nodemailer = null;
}

class NotificationService {
    constructor() {
        // Configuration du transporteur email
        this.transporter = null;
        
        if (nodemailer && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
            try {
                this.transporter = nodemailer.createTransport({
                    service: process.env.EMAIL_SERVICE || 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASSWORD
                    }
                });
                console.log('✅ Email service initialisé');
            } catch (error) {
                console.warn('⚠️  Email transporter non initialisé:', error.message);
                console.warn('Les emails ne seront pas envoyés.');
            }
        } else {
            console.warn('⚠️  Configuration email manquante. Les emails ne seront pas envoyés.');
            console.warn('Configurez EMAIL_USER et EMAIL_PASSWORD dans .env');
        }
    }

    /**
     * Créer une notification dans l'app
     */
    async createNotification(userId, message, url, creatorId = null) {
        try {
            const notification = await Notification.create({
                user: userId,
                userCreate: creatorId || userId,
                message,
                url,
                read: false
            });

            return notification;
        } catch (error) {
            console.error('Erreur création notification:', error);
            throw error;
        }
    }

    /**
     * Envoyer un email
     */
    async sendEmail(to, subject, html) {
        if (!this.transporter) {
            console.warn('⚠️  Email non envoyé: transporter non configuré');
            return { messageId: null, error: 'Transporter non configuré' };
        }

        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to,
                subject,
                html
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email envoyé:', info.messageId);
            return info;
        } catch (error) {
            console.error('❌ Erreur envoi email:', error);
            return { messageId: null, error: error.message };
        }
    }

    /**
     * Notifier un utilisateur d'une recommandation
     */
    async notifyRecommendation(userId, recommendation, yacht, personalizedMessage) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('Utilisateur non trouvé');

            // 1. Créer notification in-app
            const notificationMessage = `🤖 Recommandation IA: ${yacht.name} - Score: ${recommendation.score}/100`;
            await this.createNotification(
                userId,
                notificationMessage,
                `/yacht/${yacht._id}`,
                null
            );

            // 2. Envoyer email (si configuré)
            let emailSent = false;
            if (this.transporter && user.email) {
                const emailSubject = '🚤 Nouvelle recommandation de yacht pour vous !';
                const emailHtml = this.generateRecommendationEmail(user, yacht, recommendation, personalizedMessage);
                
                const result = await this.sendEmail(user.email, emailSubject, emailHtml);
                emailSent = !result.error;
            }

            return {
                notificationSent: true,
                emailSent: emailSent
            };
        } catch (error) {
            console.error('Erreur notification recommandation:', error);
            return {
                notificationSent: false,
                emailSent: false,
                error: error.message
            };
        }
    }

    /**
     * Générer le template HTML pour l'email de recommandation
     */
    generateRecommendationEmail(user, yacht, recommendation, personalizedMessage) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.57), #6c63ff);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 30px;
        }
        .yacht-card {
            border: 2px solid #6c63ff;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            background-color: #f9f9f9;
        }
        .yacht-image {
            width: 100%;
            height: 250px;
            object-fit: cover;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        .score {
            display: inline-block;
            background-color: #6c63ff;
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 18px;
        }
        .reasons {
            margin: 20px 0;
        }
        .reason-item {
            background-color: #e8f5e9;
            padding: 10px;
            margin: 8px 0;
            border-left: 4px solid #4caf50;
            border-radius: 4px;
        }
        .ai-analysis {
            background-color: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .cta-button {
            display: inline-block;
            background-color: #6c63ff;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
        }
        .footer {
            background-color: #f4f4f4;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Recommandation Personnalisée</h1>
            <p>Notre IA a trouvé le yacht parfait pour vous !</p>
        </div>
        
        <div class="content">
            <p>Bonjour <strong>${user.name}</strong>,</p>
            
            <p>${personalizedMessage}</p>
            
            <div class="yacht-card">
                ${yacht.images && yacht.images[0] ? `<img src="${yacht.images[0]}" alt="${yacht.name}" class="yacht-image">` : ''}
                
                <h2 style="color: #6c63ff; margin: 10px 0;">${yacht.name}</h2>
                
                <p><strong>Score de recommandation:</strong> <span class="score">${recommendation.score}/100</span></p>
                
                <p><strong>Prix:</strong> ${yacht.pricePerDay}€/jour | <strong>Capacité:</strong> ${yacht.capacity} personnes</p>
                
                <div class="reasons">
                    <h3>Pourquoi nous le recommandons:</h3>
                    ${recommendation.reasons.map(reason => `
                        <div class="reason-item">${reason}</div>
                    `).join('')}
                </div>
                
                ${recommendation.aiAnalysis ? `
                <div class="ai-analysis">
                    <h4>📊 Analyse IA des avis clients:</h4>
                    <p><strong>Score sentiment:</strong> ${recommendation.aiAnalysis.sentimentScore}/100</p>
                    <p>${recommendation.aiAnalysis.summary}</p>
                </div>
                ` : ''}
                
                <center>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/yacht/${yacht._id}" class="cta-button">
                        Découvrir ce yacht
                    </a>
                </center>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                Cette recommandation est basée sur l'analyse de ${recommendation.basedOnReviews.length} avis clients et nos algorithmes d'IA.
            </p>
        </div>
        
        <div class="footer">
            <p>Vous recevez cet email car vous êtes inscrit sur Master Yacht</p>
            <p>© ${new Date().getFullYear()} Master Yacht - Tous droits réservés</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Notifier plusieurs utilisateurs en masse
     */
    async notifyMultipleUsers(userIds, recommendation, yacht, personalizedMessage) {
        const results = [];
        
        for (const userId of userIds) {
            const result = await this.notifyRecommendation(userId, recommendation, yacht, personalizedMessage);
            results.push({
                userId,
                ...result
            });
        }
        
        return results;
    }
}

module.exports = new NotificationService();
