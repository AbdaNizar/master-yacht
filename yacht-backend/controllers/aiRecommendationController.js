const analyzeUserPreferences = async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const UserPreferences = require('../models/UserPreferences');
    const userId = req.user.id;

    const bookings = await Booking.find({ client: userId })
      .populate('yacht')
      .sort({ createdAt: -1 });

    if (bookings.length === 0) {
      return res.json({
        success: true,
        preferences: {
          budgetRange: { min: 0, max: 5000 },
          preferredCapacity: { min: 2, max: 10 },
          message: 'Aucun historique - préférences par défaut'
        }
      });
    }

    const prices = bookings.map(b => b.yacht.pricePerDay);
    const capacities = bookings.map(b => b.yacht.capacity);

    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const avgCapacity = capacities.reduce((a, b) => a + b, 0) / capacities.length;

    const preferences = {
      budgetRange: {
        min: Math.max(0, Math.floor(avgPrice * 0.7)),
        max: Math.ceil(avgPrice * 1.5)
      },
      preferredCapacity: {
        min: Math.max(1, Math.floor(avgCapacity * 0.8)),
        max: Math.ceil(avgCapacity * 1.3)
      },
      bookingHistory: bookings.map(b => ({
        yacht: b.yacht._id,
        pricePerDay: b.yacht.pricePerDay,
        capacity: b.yacht.capacity,
        bookedAt: b.createdAt
      }))
    };

    await UserPreferences.findOneAndUpdate(
      { user: userId },
      { ...preferences, lastAnalyzed: new Date() },
      { upsert: true, new: true }
    );

    res.json({ success: true, preferences });
  } catch (error) {
    console.error('Error analyzing preferences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAIRecommendations = async (req, res) => {
  try {
    const Yacht = require('../models/Yacht');
    const Booking = require('../models/Booking');
    const Review = require('../models/Review');
    const UserPreferences = require('../models/UserPreferences');
    
    const userId = req.user.id;
    const { budget, capacity, forceAnalyze } = req.body;

    let userPrefs = await UserPreferences.findOne({ user: userId });

    if (!userPrefs || forceAnalyze) {
      const bookings = await Booking.find({ client: userId })
        .populate('yacht')
        .limit(10);

      if (bookings.length > 0) {
        const prices = bookings.map(b => b.yacht.pricePerDay);
        const capacities = bookings.map(b => b.yacht.capacity);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const avgCapacity = capacities.reduce((a, b) => a + b, 0) / capacities.length;

        userPrefs = await UserPreferences.findOneAndUpdate(
          { user: userId },
          {
            budgetRange: {
              min: Math.floor(avgPrice * 0.7),
              max: Math.ceil(avgPrice * 1.5)
            },
            preferredCapacity: {
              min: Math.floor(avgCapacity * 0.8),
              max: Math.ceil(avgCapacity * 1.3)
            },
            lastAnalyzed: new Date()
          },
          { upsert: true, new: true }
        );
      }
    }

    const targetBudget = budget || userPrefs?.budgetRange?.max || 5000;
    const targetCapacity = capacity || userPrefs?.preferredCapacity?.max || 10;

    const yachts = await Yacht.find({ isValidatedByAdmin: true })
      .populate('owner', 'name')
      .lean();

    const reviewsMap = {};
    for (const yacht of yachts) {
      const reviews = await Review.find({ yacht: yacht._id, isValidatedByAdmin: true });
      reviewsMap[yacht._id] = reviews;
    }

    const yachtsWithScores = yachts.map(yacht => {
      const reviews = reviewsMap[yacht._id] || [];
      
      const priceScore = Math.max(0, 100 - Math.abs(yacht.pricePerDay - targetBudget) / targetBudget * 100);
      const capacityScore = Math.max(0, 100 - Math.abs(yacht.capacity - targetCapacity) / targetCapacity * 100);
      
      let reviewScore = 50;
      if (reviews.length > 0) {
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        reviewScore = (avgRating / 5) * 100;
      }

      const historyBonus = userPrefs?.bookingHistory?.some(
        b => b.yacht.toString() === yacht._id.toString()
      ) ? 20 : 0;

      const compatibilityScore = Math.round(
        (priceScore * 0.35 + capacityScore * 0.25 + reviewScore * 0.30 + historyBonus * 0.10)
      );

      return {
        ...yacht,
        compatibilityScore,
        scores: {
          price: Math.round(priceScore),
          capacity: Math.round(capacityScore),
          reviews: Math.round(reviewScore),
          history: historyBonus
        },
        reviewCount: reviews.length,
        averageRating: reviews.length > 0 
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
          : 0
      };
    });

    yachtsWithScores.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    const topRecommendations = yachtsWithScores.slice(0, 6);

    const aiMessage = `🎯 Nous avons analysé ${yachts.length} yachts et sélectionné ${topRecommendations.length} qui correspondent parfaitement à vos critères (Budget: ${targetBudget}DT/jour, Capacité: ${targetCapacity} personnes). Découvrez nos meilleures recommandations !`;

    res.json({
      success: true,
      recommendations: topRecommendations,
      aiMessage,
      userPreferences: userPrefs,
      analysisDate: new Date()
    });

  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const generateSmartResponse = (userMessage, yachts) => {
  const message = userMessage.toLowerCase();
  
  const extractNumber = (text, keyword) => {
    const patterns = [
      new RegExp(`${keyword}\\s+(\\d+)`),
      new RegExp(`(\\d+)\\s+${keyword}`),
      new RegExp(`${keyword}\\s+de\\s+(\\d+)`),
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return parseInt(match[1]);
    }
    return null;
  };

  const budget = extractNumber(message, 'budget') || extractNumber(message, 'dt');
  const capacity = extractNumber(message, 'personnes?') || extractNumber(message, 'pers');

  let filteredYachts = [...yachts];
  if (budget) {
    filteredYachts = filteredYachts.filter(y => y.pricePerDay <= budget * 1.2);
  }
  if (capacity) {
    filteredYachts = filteredYachts.filter(y => y.capacity >= capacity);
  }

  filteredYachts.sort((a, b) => b.pricePerDay - a.pricePerDay);
  const topYachts = filteredYachts.slice(0, 3);

  if (message.includes('bonjour') || message.includes('salut') || message.includes('hello')) {
    return `Bonjour! 👋 Je suis ravi de vous aider à trouver le yacht parfait. Nous avons ${yachts.length} yachts de luxe disponibles. Dites-moi ce que vous recherchez : votre budget et le nombre de personnes? ⛵`;
  }

  if (message.includes('merci')) {
    return `Je vous en prie! 😊 N'hésitez pas si vous avez d'autres questions sur nos yachts. Je suis là pour vous aider! 🌊`;
  }

  if (budget && capacity) {
    if (topYachts.length > 0) {
      const recommendations = topYachts.map((y, i) => 
        `${i+1}. **${y.name}** - ${y.pricePerDay}DT/jour, capacité ${y.capacity} personnes ⭐`
      ).join('\n');
      return `Parfait! Pour un budget de ${budget}DT et ${capacity} personnes, je vous recommande:\n\n${recommendations}\n\nCes yachts correspondent parfaitement à vos critères! ✨`;
    } else {
      return `Je n'ai pas trouvé de yacht exactement dans ces critères, mais nous avons d'excellentes options proches. Le meilleur choix serait **${yachts[0].name}** à ${yachts[0].pricePerDay}DT/jour pour ${yachts[0].capacity} personnes. 🚤`;
    }
  }

  if (budget) {
    if (topYachts.length > 0) {
      return `Avec un budget de ${budget}DT/jour, je vous suggère **${topYachts[0].name}** (${topYachts[0].capacity} personnes) ou **${topYachts[1]?.name || topYachts[0].name}**. Combien de personnes serez-vous? 🤔`;
    }
  }

  if (capacity) {
    if (topYachts.length > 0) {
      return `Pour ${capacity} personnes, **${topYachts[0].name}** serait parfait! Prix: ${topYachts[0].pricePerDay}DT/jour. Avez-vous un budget en tête? 💰`;
    }
  }

  if (message.includes('luxe') || message.includes('luxueux') || message.includes('premium')) {
    const luxuryYachts = yachts.sort((a, b) => b.pricePerDay - a.pricePerDay).slice(0, 2);
    return `Pour une expérience de luxe exceptionnelle, je recommande **${luxuryYachts[0].name}** à ${luxuryYachts[0].pricePerDay}DT/jour. C'est notre yacht premium avec ${luxuryYachts[0].capacity} places. ✨🛥️`;
  }

  if (message.includes('meilleur') || message.includes('recommand')) {
    return `Nos yachts les plus populaires sont **${yachts[0].name}** (${yachts[0].pricePerDay}DT/jour) et **${yachts[1]?.name || yachts[0].name}** (${yachts[1]?.pricePerDay || yachts[0].pricePerDay}DT/jour). Pour mieux vous conseiller, quel est votre budget et combien êtes-vous? 🎯`;
  }

  if (message.includes('prix') || message.includes('tarif') || message.includes('coût')) {
    const avgPrice = Math.round(yachts.reduce((sum, y) => sum + y.pricePerDay, 0) / yachts.length);
    return `Nos yachts vont de ${Math.min(...yachts.map(y => y.pricePerDay))}DT à ${Math.max(...yachts.map(y => y.pricePerDay))}DT par jour. Le prix moyen est environ ${avgPrice}DT. Avez-vous un budget spécifique? 💵`;
  }

  return `Je peux vous aider à trouver le yacht idéal! 😊 Nous avons ${yachts.length} magnifiques yachts disponibles. Pour vous recommander le meilleur, j'ai besoin de savoir:\n- Votre budget par jour? 💰\n- Combien de personnes? 👥\n\nOu dites-moi simplement ce que vous recherchez! ⛵`;
};

const chatWithAI = async (req, res) => {
  try {
    const Yacht = require('../models/Yacht');
    const { message: userMessage } = req.body;

    const yachts = await Yacht.find({ isValidatedByAdmin: true })
      .limit(20)
      .lean();

    if (!process.env.OPENAI_API_KEY) {
      const smartResponse = generateSmartResponse(userMessage, yachts);
      return res.json({
        success: true,
        response: smartResponse
      });
    }

    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const yachtsList = yachts.map((y, i) => 
      `${i+1}. ${y.name}: ${y.pricePerDay}DT/jour, capacité ${y.capacity} personnes`
    ).join('\n');

    const systemPrompt = `Tu es un assistant IA expert pour une plateforme de location de yachts de luxe. Tu dois aider les clients à trouver le yacht parfait pour leurs besoins.

YACHTS DISPONIBLES:
${yachtsList}

INSTRUCTIONS:
- Réponds en français de manière professionnelle, amicale et concise (3-5 phrases max)
- Si le client demande des recommandations, suggère 2-3 yachts pertinents avec leurs noms exacts
- Si le client pose une question générale, réponds de manière utile
- Si le client donne un budget ou nombre de personnes, recommande les yachts qui correspondent
- Utilise des emojis occasionnellement (⛵, 🌊, ✨, etc.) pour rendre la conversation plus engageante`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content;

    res.json({
      success: true,
      response: responseText
    });

  } catch (error) {
    console.error('Error in AI chat:', error);
    
    const Yacht = require('../models/Yacht');
    const yachts = await Yacht.find({ isValidatedByAdmin: true }).limit(20).lean();
    const smartResponse = generateSmartResponse(req.body.message, yachts);
    
    res.json({
      success: true,
      response: smartResponse
    });
  }
};

module.exports = {
  analyzeUserPreferences,
  getAIRecommendations,
  chatWithAI
};
