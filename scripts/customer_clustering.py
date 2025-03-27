#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import argparse
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import sys
from collections import defaultdict

# Mapping des programmes de fidélité par catégorie de produit
PRODUCT_LOYALTY_MAPPING = {
    "Alimentaire": {
        "recommended_programs": ["points_achat", "cashback", "personnalise"],
        "explanation": "Secteur à achats fréquents mais marges réduites"
    },
    "Électronique": {
        "recommended_programs": ["paliers", "programme_valeur", "garantie_etendue"],
        "explanation": "Produits à forte valeur, achat peu fréquent"
    },
    "Mode": {
        "recommended_programs": ["paliers", "personnalise", "club_exclusif"],
        "explanation": "Secteur où le statut et l'exclusivité sont importants"
    },
    "Beauté": {
        "recommended_programs": ["points_achat", "échantillons", "paliers"],
        "explanation": "Achat récurrent avec fort potentiel de cross-selling"
    },
    "Maison": {
        "recommended_programs": ["cashback", "garantie", "communautaire"],
        "explanation": "Achats moins fréquents à plus forte valeur"
    },
    "Sport": {
        "recommended_programs": ["gamification", "communautaire", "événements"],
        "explanation": "Clientèle engagée, sensible à la performance et la communauté"
    },
    "Luxe": {
        "recommended_programs": ["club_exclusif", "programme_valeur", "service_premium"],
        "explanation": "Valorise l'exclusivité et le service personnalisé"
    },
    "Voyage": {
        "recommended_programs": ["points_achat", "paliers", "partenaires"],
        "explanation": "Bénéficie de programmes à accumulation sur le long terme"
    },
    "Santé/Bien-être": {
        "recommended_programs": ["abonnement", "communautaire", "coaching"],
        "explanation": "Engagement sur la durée et suivi personnalisé valorisés"
    }
}

def load_data(loyalty_path, purchases_path):
    """Load and merge customer data from loyalty and purchases JSON files."""
    try:
        # Load loyalty data
        with open(loyalty_path, 'r', encoding='utf-8') as f:
            loyalty_data = json.load(f)
        
        # Load purchases data
        with open(purchases_path, 'r', encoding='utf-8') as f:
            purchases_data = json.load(f)
        
        # Convert to pandas DataFrames
        loyalty_df = pd.DataFrame(loyalty_data)
        
        # Extract basic purchase info and product categories
        purchase_info = []
        product_preferences = defaultdict(lambda: defaultdict(float))
        
        for purchase in purchases_data:
            client_id = purchase.get('Client_ID')
            age = purchase.get('Âge', 0)
            sexe = purchase.get('Sexe', '')
            total_achat = purchase.get('Total_Achat (€)', 0)
            nombre_produits = purchase.get('Nombre_Produits', 0)
            
            # Extract product categories
            product_categories = {}
            if 'Produits' in purchase and client_id:
                for product in purchase['Produits']:
                    # Récupération de la catégorie du produit
                    category = product.get('Catégorie', 'Autre')
                    cost = product.get('Total_Coût_Produit (€)', 0)
                    
                    # Ajouter au total par catégorie
                    if category in product_categories:
                        product_categories[category] += cost
                    else:
                        product_categories[category] = cost
                    
                    # Ajouter aux préférences globales du client
                    product_preferences[client_id][category] += cost
            
            purchase_info.append({
                'client_id': client_id,
                'age': age,
                'sexe': sexe,
                'total_achat': total_achat,
                'nombre_produits': nombre_produits,
                'product_categories': product_categories
            })
        
        purchases_df = pd.DataFrame(purchase_info)
        
        # Agréger les achats par client
        if not purchases_df.empty and 'client_id' in purchases_df.columns:
            purchases_agg = purchases_df.groupby('client_id').agg({
                'total_achat': 'sum',
                'nombre_produits': 'sum'
            }).reset_index()
            
            # Merger avec les données de fidélité
            combined_df = pd.merge(loyalty_df, purchases_agg, on='client_id', how='left')
        else:
            combined_df = loyalty_df.copy()
        
        # Convertir les préférences produits en dataframe
        product_categories_list = set()
        for prefs in product_preferences.values():
            product_categories_list.update(prefs.keys())
        
        # Créer des colonnes pour chaque catégorie de produit
        for category in product_categories_list:
            category_col = f"cat_{category.lower().replace(' ', '_').replace('/', '_')}"
            combined_df[category_col] = combined_df['client_id'].map(
                lambda x: product_preferences[x][category] if x in product_preferences else 0
            )
        
        # Ajouter une colonne avec la catégorie préférée de chaque client
        combined_df['categorie_preferee'] = combined_df['client_id'].map(
            lambda x: max(product_preferences[x].items(), key=lambda item: item[1])[0] 
            if x in product_preferences and product_preferences[x] else 'Inconnue'
        )
        
        return combined_df, dict(product_preferences), list(product_categories_list)
    
    except Exception as e:
        print(f"Error loading data: {str(e)}", file=sys.stderr)
        sys.exit(1)

def prepare_data(df, features):
    """Prepare data for clustering by selecting and scaling features."""
    try:
        # Select relevant features
        X = df[features].copy()
        
        # Handle missing values
        X.fillna(0, inplace=True)
        
        # Scale the data
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        return X_scaled, X.columns.tolist()
    
    except Exception as e:
        print(f"Error preparing data: {str(e)}", file=sys.stderr)
        sys.exit(1)

def perform_clustering(X, n_clusters=3):
    """Perform K-means clustering on the prepared data."""
    try:
        # Apply K-means clustering
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        clusters = kmeans.fit_predict(X)
        
        # Calculate cluster centers
        cluster_centers = kmeans.cluster_centers_
        
        # Calculate inertia (sum of squared distances to closest centroid)
        inertia = kmeans.inertia_
        
        # If data has more than 2 dimensions, use PCA for visualization
        if X.shape[1] > 2:
            pca = PCA(n_components=2)
            X_pca = pca.fit_transform(X)
            pca_centers = pca.transform(cluster_centers)
            
            # Calculate variance explained by first 2 components
            explained_variance = pca.explained_variance_ratio_
        else:
            X_pca = X
            pca_centers = cluster_centers
            explained_variance = [1.0, 0.0] if X.shape[1] == 1 else [0.5, 0.5]
        
        return clusters, cluster_centers, X_pca, pca_centers, inertia, explained_variance
    
    except Exception as e:
        print(f"Error performing clustering: {str(e)}", file=sys.stderr)
        sys.exit(1)

def recommend_loyalty_programs(client_preferences, product_categories):
    """Recommande des programmes de fidélité basés sur les préférences produit."""
    recommendations = {}
    
    for client_id, preferences in client_preferences.items():
        # Trouver la catégorie dominante
        if not preferences:
            continue
            
        dominant_category = max(preferences.items(), key=lambda x: x[1])[0]
        
        # Récupérer les programmes recommandés pour cette catégorie
        if dominant_category in PRODUCT_LOYALTY_MAPPING:
            recommendations[client_id] = {
                'categorie_dominante': dominant_category,
                'programmes_recommandes': PRODUCT_LOYALTY_MAPPING[dominant_category]['recommended_programs'],
                'explication': PRODUCT_LOYALTY_MAPPING[dominant_category]['explanation'],
                'preferences': dict(preferences)
            }
        else:
            # Catégorie non reconnue, on utilise une approche générique
            recommendations[client_id] = {
                'categorie_dominante': dominant_category,
                'programmes_recommandes': ["points_achat", "personnalise"],
                'explication': "Approche générique pour catégorie non reconnue",
                'preferences': dict(preferences)
            }
    
    return recommendations

def analyze_clusters(df, clusters, features, client_preferences, product_categories):
    """Analyze clusters to derive insights about each customer segment."""
    try:
        # Add cluster labels to the dataframe
        df_with_clusters = df.copy()
        df_with_clusters['cluster'] = clusters
        
        # Calculate statistics for each cluster
        cluster_stats = []
        
        for cluster_id in range(len(np.unique(clusters))):
            cluster_data = df_with_clusters[df_with_clusters['cluster'] == cluster_id]
            
            # Basic statistics
            stats = {
                'cluster_id': cluster_id,
                'size': len(cluster_data),
                'percentage': round((len(cluster_data) / len(df)) * 100, 2)
            }
            
            # Add statistics for each feature
            for feature in features:
                if feature in df.columns:
                    stats[f'{feature}_mean'] = round(cluster_data[feature].mean(), 2)
                    stats[f'{feature}_median'] = round(cluster_data[feature].median(), 2)
                    
            # Add qualitative description based on the statistics
            if 'age' in features and 'age_mean' in stats:
                if stats['age_mean'] < 30:
                    stats['age_group'] = 'Jeune'
                elif stats['age_mean'] < 50:
                    stats['age_group'] = 'Adulte'
                else:
                    stats['age_group'] = 'Senior'
            
            if 'points_cumules' in features and 'points_cumules_mean' in stats:
                if stats['points_cumules_mean'] < 500:
                    stats['loyalty_level'] = 'Faible'
                elif stats['points_cumules_mean'] < 1500:
                    stats['loyalty_level'] = 'Moyen'
                else:
                    stats['loyalty_level'] = 'Élevé'
            
            if 'nombre_achats' in features and 'nombre_achats_mean' in stats:
                if stats['nombre_achats_mean'] < 5:
                    stats['purchase_frequency'] = 'Occasionnel'
                elif stats['nombre_achats_mean'] < 10:
                    stats['purchase_frequency'] = 'Régulier'
                else:
                    stats['purchase_frequency'] = 'Fréquent'
            
            # Gender distribution
            if 'sexe' in df.columns:
                gender_counts = cluster_data['sexe'].value_counts()
                if 'Homme' in gender_counts and 'Femme' in gender_counts:
                    stats['homme_percentage'] = round((gender_counts['Homme'] / len(cluster_data)) * 100, 2)
                    stats['femme_percentage'] = round((gender_counts['Femme'] / len(cluster_data)) * 100, 2)
                    stats['dominant_gender'] = 'Homme' if stats['homme_percentage'] > stats['femme_percentage'] else 'Femme'
            
            # Determine customer type based on combination of features
            if all(k in stats for k in ['loyalty_level', 'purchase_frequency', 'age_group']):
                if stats['loyalty_level'] == 'Élevé' and stats['purchase_frequency'] == 'Fréquent':
                    stats['customer_type'] = 'Client Fidèle Premium'
                elif stats['loyalty_level'] == 'Moyen' and stats['purchase_frequency'] == 'Régulier':
                    stats['customer_type'] = 'Client Régulier'
                elif stats['loyalty_level'] == 'Faible' and stats['purchase_frequency'] == 'Occasionnel':
                    if stats['age_group'] == 'Jeune':
                        stats['customer_type'] = 'Jeune Occasionnel'
                    else:
                        stats['customer_type'] = 'Client Occasionnel'
                else:
                    stats['customer_type'] = 'Client Mixte'
            
            # Analyse des préférences de produits pour ce segment
            cluster_client_ids = cluster_data['client_id'].tolist()
            
            # Agréger les préférences de produits pour ce segment
            segment_preferences = defaultdict(float)
            for client_id in cluster_client_ids:
                if client_id in client_preferences:
                    for category, amount in client_preferences[client_id].items():
                        segment_preferences[category] += amount
            
            # Trouver les catégories dominantes pour ce segment
            if segment_preferences:
                total_spending = sum(segment_preferences.values())
                top_categories = sorted(segment_preferences.items(), key=lambda x: x[1], reverse=True)[:3]
                
                stats['product_preferences'] = [
                    {
                        'category': cat,
                        'amount': round(amount, 2),
                        'percentage': round((amount / total_spending) * 100, 2) if total_spending > 0 else 0
                    } for cat, amount in top_categories
                ]
                
                # Recommendations de programmes de fidélité pour ce segment
                top_category = top_categories[0][0] if top_categories else None
                if top_category and top_category in PRODUCT_LOYALTY_MAPPING:
                    stats['loyalty_recommendations'] = {
                        'top_category': top_category,
                        'programs': PRODUCT_LOYALTY_MAPPING[top_category]['recommended_programs'],
                        'explanation': PRODUCT_LOYALTY_MAPPING[top_category]['explanation']
                    }
                else:
                    # Approche générique
                    stats['loyalty_recommendations'] = {
                        'top_category': top_category if top_category else 'Inconnue',
                        'programs': ["points_achat", "personnalise"],
                        'explanation': "Approche générique basée sur les habitudes d'achat"
                    }
            
            cluster_stats.append(stats)
        
        # Get sample clients from each cluster (max 10 per cluster)
        sample_clients = []
        for cluster_id in range(len(np.unique(clusters))):
            cluster_data = df_with_clusters[df_with_clusters['cluster'] == cluster_id]
            samples = cluster_data.sample(min(10, len(cluster_data))).to_dict(orient='records')
            for sample in samples:
                sample['cluster'] = cluster_id
                
                # Ajouter les recommandations personnalisées
                client_id = sample.get('client_id')
                if client_id in client_preferences:
                    preferences = client_preferences[client_id]
                    if preferences:
                        top_category = max(preferences.items(), key=lambda x: x[1])[0]
                        if top_category in PRODUCT_LOYALTY_MAPPING:
                            sample['recommended_programs'] = PRODUCT_LOYALTY_MAPPING[top_category]['recommended_programs']
                            sample['category_explanation'] = PRODUCT_LOYALTY_MAPPING[top_category]['explanation']
                            sample['preferred_category'] = top_category
                
                sample_clients.append(sample)
        
        return cluster_stats, sample_clients
    
    except Exception as e:
        print(f"Error analyzing clusters: {str(e)}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Customer Clustering Analysis')
    parser.add_argument('--loyalty', required=True, help='Path to the loyalty points JSON file')
    parser.add_argument('--purchases', required=True, help='Path to the purchases JSON file')
    parser.add_argument('--clusters', type=int, default=3, help='Number of clusters to create')
    parser.add_argument('--features', default='age,points_cumules,nombre_achats', 
                      help='Comma-separated list of features to use for clustering')
    
    args = parser.parse_args()
    
    # Parse features list
    feature_list = args.features.split(',')
    
    # Load and prepare data
    df, client_preferences, product_categories = load_data(args.loyalty, args.purchases)
    
    # Ensure all requested features exist in the dataframe
    valid_features = [f for f in feature_list if f in df.columns]
    if not valid_features:
        print("Error: None of the specified features exist in the data", file=sys.stderr)
        sys.exit(1)
    
    # Add product category features if requested
    if 'product_categories' in feature_list:
        # Select product category columns that start with 'cat_'
        cat_features = [col for col in df.columns if col.startswith('cat_')]
        valid_features.extend(cat_features)
    
    # Prepare data for clustering
    X_scaled, final_features = prepare_data(df, valid_features)
    
    # Perform clustering
    clusters, centers, X_pca, pca_centers, inertia, explained_variance = perform_clustering(X_scaled, args.clusters)
    
    # Generate product-based loyalty recommendations
    loyalty_recommendations = recommend_loyalty_programs(client_preferences, product_categories)
    
    # Analyze clusters
    cluster_stats, sample_clients = analyze_clusters(df, clusters, valid_features, client_preferences, product_categories)
    
    # Prepare results
    results = {
        'cluster_stats': cluster_stats,
        'sample_clients': sample_clients,
        'features_used': final_features,
        'num_clusters': args.clusters,
        'visualization_data': {
            'points': X_pca.tolist(),
            'centers': pca_centers.tolist(),
            'cluster_labels': clusters.tolist(),
            'explained_variance': explained_variance.tolist()
        },
        'product_categories': product_categories,
        'loyalty_recommendations': loyalty_recommendations
    }
    
    # Output results as JSON
    print(json.dumps(results))

if __name__ == "__main__":
    main() 