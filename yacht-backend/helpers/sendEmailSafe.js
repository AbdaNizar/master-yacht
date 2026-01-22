/**
 * Wrapper sécurisé pour sendEmail
 * Garantit que l'envoi d'email ne bloque jamais l'application
 */
const sendEmailOriginal = require("./sendmail");

/**
 * Version sécurisée de sendEmail qui ne lance jamais d'erreur
 * @param {Object} options - Options d'envoi d'email
 * @returns {Promise<Object>} - Résultat de l'envoi { success, messageId, error }
 */
const sendEmailSafe = async (options) => {
    try {
        const result = await sendEmailOriginal(options);
        return result;
    } catch (error) {
        console.error('❌ Erreur inattendue lors de l\'envoi d\'email:', error);
        return {
            success: false,
            messageId: null,
            error: error.message || 'Erreur inconnue'
        };
    }
};

/**
 * Envoie un email sans bloquer l'exécution
 * À utiliser quand l'email n'est pas critique
 * @param {Object} options - Options d'envoi d'email
 */
const sendEmailAsync = (options) => {
    // Fire and forget - ne pas attendre le résultat
    sendEmailSafe(options).then(result => {
        if (result.success) {
            console.log('✅ Email envoyé en arrière-plan:', result.messageId);
        } else {
            console.warn('⚠️  Email non envoyé:', result.error || result.warning);
        }
    });
};

/**
 * Version compatible avec l'ancien code (lance une erreur si échec)
 * NE PLUS UTILISER - Gardé pour compatibilité
 * @deprecated Utiliser sendEmailSafe à la place
 */
const sendEmailLegacy = async (options) => {
    const result = await sendEmailSafe(options);
    if (!result.success && result.error) {
        throw new Error(`Impossible d'envoyer l'email: ${result.error}`);
    }
    return result;
};

module.exports = sendEmailSafe;
module.exports.safe = sendEmailSafe;
module.exports.async = sendEmailAsync;
module.exports.legacy = sendEmailLegacy;
