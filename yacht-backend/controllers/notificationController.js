const {webSocketNotifications} = require("../helpers/fileHelpers");
const Notification = require('../models/Notification');





const createNotification = async function (notification) {
    let notify = await new Notification(notification)
    await webSocketNotifications(notify)
    return notify.save();
}
const readNotification = async function (req, res) {

    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: 'id notification empty.' });
        }

        const updatedNotification = await Notification.findByIdAndUpdate(
            id,
            { read : true },
            { new: true }
        )
        res.status(200).json({
            message: 'Notification read mis à jour avec succès.',
            notification: updatedNotification,
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du notification read :', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }

}
const readAllNotification = async function (req, res) {
    try {
        await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
        res.status(200).json({ message: "Toutes les notifications sont maintenant marquées comme lues." });
    } catch (error) {
        console.error("❌ Error updating notifications:", error);
        res.status(500).json({ message: "Erreur serveur lors de la mise à jour des notifications." });
    }
}
const GetNotifications = async function(req, res) {
    console.log('[notifications] [getNotifications]');
    const userId = req.user._id;

    try {
        const notifications = await Notification.find({ user: userId })
            .populate({
                path: 'userCreate',
                model: 'User',
                select: 'name email image'
            }).sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (error) {
        console.error("❌ Error fetching notifications:", error);
        res.status(500).json({ message: "Erreur serveur lors de la récupération des notifications." });
    }
};






module.exports = {
    createNotification,GetNotifications,readNotification,readAllNotification
};
