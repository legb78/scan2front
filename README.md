# Scan2Front

Application de dashboard et d'analyse client avec clustering, prédiction d'achats et visualisation avancée.

## Fonctionnalités

- Dashboard de visualisation des données clients
- Système d'authentification (login/signup)
- Analyse de clustering pour la segmentation client
- Prédiction des achats futurs avec modèle XGBoost
- Visualisations interactives des segments de clients
- Profils clients détaillés
- Estimation des montants et probabilités d'achat
- Recommandation de produits personnalisés

## Prérequis

- Node.js (v14 ou supérieur)
- Python (v3.8 ou supérieur)
- pip (gestionnaire de paquets Python)

## Installation

1. Clonez le dépôt
```bash
git clone https://github.com/yourusername/scan2front.git
cd scan2front
```

2. Installez les dépendances Node.js
```bash
npm install
```

3. Installez les dépendances Python nécessaires pour l'analyse
```bash
npm run install-python-deps
```

## Démarrage

Pour lancer l'application en mode développement :
```bash
npm run dev
```

L'application sera accessible à l'adresse [http://localhost:3000](http://localhost:3000).

## Structure du projet

- `/html` - Fichiers HTML pour les différentes pages
- `/css` - Styles CSS
- `/js` - Scripts JavaScript
- `/data` - Données JSON utilisées par l'application
- `/scripts` - Scripts Python pour l'analyse de données, le clustering et les prédictions
- `server.js` - Serveur Express principal

## Segmentation client (Clustering)

1. Accédez à la page de profiling depuis le menu latéral
2. Sélectionnez les caractéristiques souhaitées pour l'analyse
3. Choisissez le nombre de clusters (segments) à créer
4. Cliquez sur "Lancer l'analyse"
5. Explorez les résultats avec les visualisations et tableaux générés

## Prédiction d'achats

1. Accédez à la page de prédiction depuis le menu latéral
2. Sélectionnez la période de prédiction (jour, semaine, mois, trimestre)
3. Choisissez les caractéristiques à utiliser pour l'analyse
4. Cliquez sur "Lancer la prédiction"
5. Visualisez les résultats de prédiction pour chaque client :
   - Montant prédit
   - Nombre d'achats prévus
   - Probabilité d'achat
   - Produits susceptibles d'être achetés
   - Tendances d'achat (à la hausse, stable, à la baisse)

Le système utilise un modèle XGBoost (Gradient Boosting) pour réaliser des prédictions précises basées sur l'historique d'achat et les caractéristiques du client.

## Technologies utilisées

- **Frontend** : HTML, CSS, JavaScript, Bootstrap 5, Chart.js
- **Backend** : Node.js, Express
- **Analyse de données** : Python, pandas, scikit-learn
- **Machine Learning** : Gradient Boosting (XGBoost) via scikit-learn
- **Visualisation** : Chart.js

## Notes

- Assurez-vous que Python est accessible depuis la ligne de commande
- L'application utilise un modèle de machine learning pour fournir des prédictions d'achat avec une précision maximale de 98%
- Les données de fidélité sont générées dynamiquement lors du premier démarrage si elles n'existent pas déjà 