# 🔊 Sons pour les Notifications du Chat

Ce dossier contient les fichiers audio pour les notifications du système de chat.

## Fichiers Requis

Vous devez ajouter les fichiers audio suivants dans ce dossier:

### 1. notification.mp3
- **Usage:** Joué quand un nouveau message est reçu
- **Recommandation:** Son court et agréable (0.5-1 seconde)
- **Volume suggéré:** Moyen

### 2. sent.mp3
- **Usage:** Joué quand un message est envoyé avec succès
- **Recommandation:** Son subtil de confirmation (0.3-0.5 seconde)
- **Volume suggéré:** Faible

### 3. error.mp3
- **Usage:** Joué quand une erreur se produit
- **Recommandation:** Son distinctif d'alerte (0.5-0.7 seconde)
- **Volume suggéré:** Moyen-élevé

## Où Trouver des Sons Gratuits

### Sites Recommandés:

1. **Freesound.org**
   - https://freesound.org/
   - Sons libres de droits
   - Recherchez: "notification", "message", "sent", "error"

2. **Zapsplat**
   - https://www.zapsplat.com/
   - Sons gratuits pour projets commerciaux
   - Catégorie: UI/Notification Sounds

3. **Mixkit**
   - https://mixkit.co/free-sound-effects/
   - Sons de haute qualité gratuits

4. **Pixabay Sound Effects**
   - https://pixabay.com/sound-effects/
   - Gratuit pour usage commercial

## Format Recommandé

- **Format:** MP3 (compatibilité maximale)
- **Bitrate:** 128-192 kbps
- **Durée:** < 1 seconde
- **Taille:** < 50 KB par fichier

## Alternative: Créer vos Propres Sons

Vous pouvez aussi créer vos propres sons avec:
- Audacity (gratuit)
- GarageBand (Mac)
- FL Studio
- Ou des générateurs en ligne

## Installation

1. Téléchargez les fichiers audio
2. Renommez-les en: `notification.mp3`, `sent.mp3`, `error.mp3`
3. Placez-les dans ce dossier
4. Les sons seront automatiquement chargés par le NotificationSoundService

## Test

Après avoir ajouté les fichiers, testez-les:

```typescript
// Dans la console du navigateur
this.soundService.testSound();
```

## Note Importante

⚠️ **Sans ces fichiers audio, les notifications sonores ne fonctionneront pas!**

Le service NotificationSoundService essaiera de charger ces fichiers. Si ils n'existent pas, aucune erreur ne sera affichée mais aucun son ne sera joué.
