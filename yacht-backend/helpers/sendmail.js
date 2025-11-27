const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const path = require("path");
const fs = require("fs");

const sendEmail = async (options) => {

    try {
        const transporter = nodemailer.createTransport({
            service: "ovh",
            host: 'smtp.gmail.com',
            port: '587',
            secure: false,
            auth: {
                user: 'nizarnifo@gmail.com',
                pass: 'srvndylxoucpezmh',


            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        let message = {
            from: `${'MASTER YACHT'} <${'nizarnifo@gmail.com'}>`,
            to: options.email,
            subject: options.subject,
        };

        if (options.template) {
            const templatePath = path.join(__dirname, `../public/email-templates/${options.template}.html`);

            const html = fs.readFileSync(templatePath, "utf-8");
            const template = handlebars.compile(html);




            options.variables ={
                name : options.name,
                statusMessage : options.statusMessage,
                role :options.role,
                totalPrice :options.totalPrice,
                yachtName :options.yachtName,
                reviewComment :options.reviewComment,
                clientName :options.clientName,
                ownerName :options.ownerName,
                startDate :options.startDate,
                endDate :options.endDate,
                status: options.status === "ongoing"
                    ? "En cours"
                    : options.status === "canceled"
                        ? "Annulée"
                        : options.status === "pending"
                            ? "En attente"
                            : options.status === "accepted"
                                ? "Acceptée"
                                : "Terminée",
                statusClass: options.status === "ongoing" ? "" : options.status === "canceled" ? "cancelled" : "done"
            }
            message.html = template(options.variables);
        } else {
            message.text = options.message;
        }

        const info = await transporter.sendMail(message);

        console.log(`Message envoyé : ${info.messageId}`);
        return info;
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'email :", error);
        throw new Error("Impossible d'envoyer l'email");
    }
};


module.exports = sendEmail;
