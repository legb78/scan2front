/**
 * Générateur de données pour le programme de fidélité
 * Ce script permet de générer un fichier JSON contenant les données
 * des points de fidélité pour les clients existants dans achats_clients_500.json
 */

const fs = require('fs');
const path = require('path');

// Chemin vers le fichier de données existant
const dataFilePath = path.join(__dirname, '..', 'data', 'achats_clients_500.json');
// Chemin vers le fichier de données de fidélité à générer
const loyaltyFilePath = path.join(__dirname, '..', 'data', 'loyalty_points.json');

/**
 * Fonction principale pour générer les données de fidélité
 */
function generateLoyaltyData() {
    console.log('Génération des données de points de fidélité...');
    
    try {
        // Lire le fichier de données existant
        const rawData = fs.readFileSync(dataFilePath, 'utf8');
        const clientData = JSON.parse(rawData);
        
        // Extraire les clients uniques et calculer leurs points
        const clientPoints = calculateLoyaltyPoints(clientData);
        
        // Générer les données complètes de fidélité
        const loyaltyData = generateFullLoyaltyData(clientPoints, clientData);
        
        // Écrire les données dans un fichier JSON
        fs.writeFileSync(loyaltyFilePath, JSON.stringify(loyaltyData, null, 2), 'utf8');
        
        console.log(`Données de fidélité générées avec succès pour ${loyaltyData.length} clients.`);
        console.log(`Fichier sauvegardé: ${loyaltyFilePath}`);
        
    } catch (error) {
        console.error('Erreur lors de la génération des données de fidélité:', error);
    }
}

/**
 * Calcule les points de fidélité pour chaque client
 * @param {Array} data - Données d'achats clients
 * @returns {Object} - Objet avec les ID clients et leurs points
 */
function calculateLoyaltyPoints(data) {
    const clientPoints = {};
    const clientInfo = {};
    
    // Parcourir les données d'achat
    data.forEach(purchase => {
        const clientID = purchase.Client_ID;
        const totalAmount = purchase.Total_Achat ? purchase.Total_Achat : 
                           (purchase["Total_Achat (€)"] || purchase.Montant_Total || 0);
        
        // Stocker les informations du client
        if (!clientInfo[clientID]) {
            clientInfo[clientID] = {
                nom: purchase.Nom_Client || `Client ${clientID}`,
                email: purchase.Email_Client || `client${clientID}@example.com`,
                sexe: purchase.Sexe || (Math.random() > 0.5 ? 'Homme' : 'Femme'),
                age: purchase.Âge || Math.floor(Math.random() * 40) + 20,
                dateInscription: getRandomPastDate(365 * 2), // Date dans les 2 dernières années
                dernierAchat: purchase.Jour_Achat,
                nbAchats: 0
            };
        }
        
        // Incrémenter le nombre d'achats
        clientInfo[clientID].nbAchats++;
        
        // Mettre à jour la date du dernier achat si plus récente
        if (purchase.Jour_Achat) {
            const currentDate = new Date(clientInfo[clientID].dernierAchat || '2000-01-01');
            const newDate = new Date(purchase.Jour_Achat);
            if (newDate > currentDate) {
                clientInfo[clientID].dernierAchat = purchase.Jour_Achat;
            }
        }
        
        // Attribution de points: 1 point pour chaque euro dépensé
        const pointsEarned = Math.floor(totalAmount);
        
        // Ajouter des points bonus pour les gros achats
        let bonusPoints = 0;
        if (totalAmount >= 100) {
            bonusPoints += 50; // +50 points pour les achats de plus de 100€
        } else if (totalAmount >= 50) {
            bonusPoints += 20; // +20 points pour les achats de plus de 50€
        }
        
        // Ajouter des points pour chaque produit acheté
        const productPoints = purchase.Produits ? purchase.Produits.length * 5 : 0;
        
        // Calculer le total de points gagnés pour cet achat
        const totalPoints = pointsEarned + bonusPoints + productPoints;
        
        // Mettre à jour les points du client
        if (!clientPoints[clientID]) {
            clientPoints[clientID] = 0;
        }
        clientPoints[clientID] += totalPoints;
    });
    
    return { points: clientPoints, info: clientInfo };
}

/**
 * Génère les données complètes de fidélité avec historique et récompenses
 * @param {Object} clientPointsData - Données des points par client
 * @param {Array} originalData - Données d'achats originales
 * @returns {Array} - Tableau de données de fidélité
 */
function generateFullLoyaltyData(clientPointsData, originalData) {
    const { points: clientPoints, info: clientInfo } = clientPointsData;
    const loyaltyData = [];
    
    // Liste des récompenses disponibles
    const recompenses = [
        { id: 1, nom: "Réduction 10%", cout: 500, description: "10% de réduction sur votre prochain achat" },
        { id: 2, nom: "Livraison gratuite", cout: 300, description: "Livraison offerte sur votre prochaine commande" },
        { id: 3, nom: "Produit gratuit", cout: 1000, description: "Un produit offert parmi une sélection" },
        { id: 4, nom: "Cadeau anniversaire", cout: 750, description: "Un cadeau spécial pour votre anniversaire" },
        { id: 5, nom: "Code promo VIP", cout: 2000, description: "Accès à des offres exclusives pendant 1 mois" }
    ];
    
    // Pour chaque client, générer ses données de fidélité
    Object.keys(clientPoints).forEach(clientID => {
        const totalPoints = clientPoints[clientID];
        const info = clientInfo[clientID] || {};
        
        // Générer un historique de points (gains et dépenses)
        const historiquePoints = generateHistoriquePoints(clientID, totalPoints, originalData);
        
        // Déterminer les récompenses déjà utilisées
        const recompensesUtilisees = generateRecompensesUtilisees(historiquePoints.depenses, recompenses);
        
        // Déterminer le statut du client
        let statut = 'Bronze';
        if (totalPoints >= 2000) {
            statut = 'Platine';
        } else if (totalPoints >= 1000) {
            statut = 'Or';
        } else if (totalPoints >= 500) {
            statut = 'Argent';
        }
        
        // Déterminer si le compte est actif
        const dernierAchat = new Date(info.dernierAchat || '2022-01-01');
        const maintenant = new Date();
        const differenceJours = Math.floor((maintenant - dernierAchat) / (1000 * 60 * 60 * 24));
        const estActif = differenceJours < 90; // Inactif si pas d'achat depuis 90 jours
        
        // Créer l'objet client
        loyaltyData.push({
            client_id: clientID,
            nom: info.nom,
            email: info.email,
            sexe: info.sexe,
            age: info.age,
            date_inscription: info.dateInscription,
            dernier_achat: info.dernierAchat,
            nombre_achats: info.nbAchats,
            points_actuels: historiquePoints.solde,
            points_cumules: historiquePoints.totalGagnes,
            points_utilises: historiquePoints.totalDepenses,
            statut: statut,
            est_actif: estActif,
            historique_points: historiquePoints.historique,
            recompenses_utilisees: recompensesUtilisees
        });
    });
    
    return loyaltyData;
}

/**
 * Génère l'historique des points pour un client
 * @param {string} clientID - ID du client
 * @param {number} totalPoints - Total des points calculés
 * @param {Array} originalData - Données d'achats originales
 * @returns {Object} - Historique des points
 */
function generateHistoriquePoints(clientID, totalPoints, originalData) {
    const historique = [];
    let pointsGagnes = 0;
    let pointsDepenses = 0;
    
    // Filtrer les achats du client
    const clientPurchases = originalData.filter(purchase => purchase.Client_ID === clientID);
    
    // Pour chaque achat, créer une entrée de gain de points
    clientPurchases.forEach(purchase => {
        const date = purchase.Jour_Achat || getRandomPastDate(365);
        const montant = purchase.Total_Achat ? purchase.Total_Achat : 
                      (purchase["Total_Achat (€)"] || purchase.Montant_Total || 0);
        
        // Points de base (1 par euro)
        let points = Math.floor(montant);
        
        // Points bonus
        if (montant >= 100) {
            points += 50;
        } else if (montant >= 50) {
            points += 20;
        }
        
        // Points pour les produits
        const productPoints = purchase.Produits ? purchase.Produits.length * 5 : 0;
        points += productPoints;
        
        // Ajouter au compteur total
        pointsGagnes += points;
        
        // Ajouter l'entrée dans l'historique
        historique.push({
            date: date,
            type: 'gain',
            points: points,
            description: `Achat en magasin - Ticket #${purchase.Ticket_ID || 'N/A'}`
        });
    });
    
    // Générer des dépenses de points (récompenses utilisées)
    const depenses = generateDepensesPoints(pointsGagnes);
    pointsDepenses = depenses.totalPoints;
    
    // Ajouter les dépenses à l'historique
    historique.push(...depenses.historique);
    
    // Trier l'historique par date (du plus récent au plus ancien)
    historique.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return {
        historique: historique,
        totalGagnes: pointsGagnes,
        totalDepenses: pointsDepenses,
        solde: pointsGagnes - pointsDepenses,
        depenses: depenses.historique
    };
}

/**
 * Génère des dépenses de points aléatoires pour un client
 * @param {number} pointsDisponibles - Total des points gagnés
 * @returns {Object} - Informations sur les dépenses
 */
function generateDepensesPoints(pointsDisponibles) {
    const depenses = [];
    let totalPoints = 0;
    
    // Définir les récompenses disponibles
    const recompenses = [
        { id: 1, nom: "Réduction 10%", cout: 500 },
        { id: 2, nom: "Livraison gratuite", cout: 300 },
        { id: 3, nom: "Produit gratuit", cout: 1000 },
        { id: 4, nom: "Cadeau anniversaire", cout: 750 },
        { id: 5, nom: "Code promo VIP", cout: 2000 }
    ];
    
    // Déterminer le nombre de récompenses à générer
    const nombreRecompenses = Math.min(
        Math.floor(Math.random() * 5), // Maximum 5 récompenses
        Math.floor(pointsDisponibles / 300) // Limité par les points disponibles
    );
    
    // Générer les dépenses
    for (let i = 0; i < nombreRecompenses; i++) {
        // Choisir une récompense au hasard
        const recompenseIndex = Math.floor(Math.random() * recompenses.length);
        const recompense = recompenses[recompenseIndex];
        
        // Vérifier si le client a suffisamment de points
        if (pointsDisponibles - totalPoints >= recompense.cout) {
            // Générer une date d'utilisation
            const date = getRandomPastDate(180); // Dans les 6 derniers mois
            
            // Ajouter la dépense
            depenses.push({
                date: date,
                type: 'depense',
                points: -recompense.cout,
                description: `Utilisation de la récompense: ${recompense.nom}`,
                recompense_id: recompense.id
            });
            
            totalPoints += recompense.cout;
        }
    }
    
    return {
        historique: depenses,
        totalPoints: totalPoints
    };
}

/**
 * Génère la liste des récompenses utilisées par un client
 * @param {Array} depenses - Historique des dépenses
 * @param {Array} recompenses - Liste des récompenses disponibles
 * @returns {Array} - Liste des récompenses utilisées
 */
function generateRecompensesUtilisees(depenses, recompenses) {
    const recompensesUtilisees = [];
    
    depenses.forEach(depense => {
        if (depense.recompense_id) {
            const recompense = recompenses.find(r => r.id === depense.recompense_id);
            if (recompense) {
                recompensesUtilisees.push({
                    id: recompense.id,
                    nom: recompense.nom,
                    cout: Math.abs(depense.points),
                    date_utilisation: depense.date
                });
            }
        }
    });
    
    return recompensesUtilisees;
}

/**
 * Génère une date aléatoire dans le passé
 * @param {number} maxDaysAgo - Nombre maximum de jours dans le passé
 * @returns {string} - Date au format YYYY-MM-DD
 */
function getRandomPastDate(maxDaysAgo) {
    const today = new Date();
    const daysAgo = Math.floor(Math.random() * maxDaysAgo);
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - daysAgo);
    
    return pastDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
}

// Exécuter la génération des données
generateLoyaltyData(); 