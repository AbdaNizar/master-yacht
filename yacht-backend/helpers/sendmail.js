const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const path = require("path");
const fs = require("fs");

const sendEmail = async (options) => {
    try {
        // Vérifier si les credentials email sont configurés
        const emailUser = process.env.EMAIL_USER || 'nizarnifo@gmail.com';
        const emailPass = process.env.EMAIL_PASSWORD || 'srvndylxoucpezmh';

        if (!emailUser || !emailPass) {
            console.warn('⚠️  Configuration email manquante. Email non envoyé.');
            return { 
                success: false, 
                messageId: null, 
                warning: 'Configuration email manquante' 
            };
        }

        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || "gmail",
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: emailUser,
                pass: emailPass,
            },
            tls: {
                rejectUnauthorized: false,
            },
            // Timeout settings - plus courts pour éviter les blocages
            connectionTimeout: 5000, // 5 secondes
            greetingTimeout: 5000,
            socketTimeout: 5000,
        });

        // Vérifier la connexion avec timeout
        try {
            await Promise.race([
                transporter.verify(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout vérification')), 3000)
                )
            ]);
        } catch (verifyError) {
            console.warn('⚠️  Impossible de vérifier la connexion email:', verifyError.message);
            console.warn('⚠️  Email non envoyé - service email indisponible');
            return { 
                success: false, 
                messageId: null, 
                error: 'Service email indisponible' 
            };
        }

        let message = {
            from: `${process.env.EMAIL_FROM_NAME || 'MASTER YACHT'} <${emailUser}>`,
            to: options.email,
            subject: options.subject,
        };

        if (options.template) {
            const templatePath = path.join(__dirname, `../public/email-templates/${options.template}.html`);

            // Vérifier si le template existe
            if (!fs.existsSync(templatePath)) {
                console.warn(`⚠️  Template ${options.template} non trouvé. Email texte envoyé.`);
                message.text = options.message || options.subject;
            } else {
                const html = fs.readFileSync(templatePath, "utf-8");
                const template = handlebars.compile(html);

                options.variables = {
                    name: options.name,
                    statusMessage: options.statusMessage,
                    role: options.role,
                    totalPrice: options.totalPrice,
                    yachtName: options.yachtName,
                    reviewComment: options.reviewComment,
                    clientName: options.clientName,
                    ownerName: options.ownerName,
                    startDate: options.startDate,
                    endDate: options.endDate,
                    status: options.status === "ongoing"
                        ? "En cours"
                        : options.status === "canceled"
                            ? "Annulée"
                            : options.status === "pending"
                                ? "En attente"
                                : options.status === "accepted"
                                    ? "Acceptée"
                                    : "Terminée",
                    statusClass: options.status === "ongoing" 
                        ? "" 
                        : options.status === "canceled" 
                            ? "cancelled" 
                            : "done"
                };
                message.html = template(options.variables);
            }
        } else {
            message.text = options.message;
        }

        // Envoyer avec timeout
        const info = await Promise.race([
            transporter.sendMail(message),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout envoi email')), 8000)
            )
        ]);

        console.log(`✅ Email envoyé : ${info.messageId}`);
        return { 
            success: true, 
            messageId: info.messageId 
        };
    } catch (error) {
        console.error("❌ Erreur lors de l'envoi de l'email :", error.message);
        
        // Ne pas lancer d'erreur, juste logger et retourner un statut
        return { 
            success: false, 
            messageId: null, 
            error: error.message 
        };
    }
};

module.exports = sendEmail;
