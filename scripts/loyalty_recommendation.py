#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import argparse
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.metrics.pairwise import cosine_similarity
import sys
import logging
import warnings

# Configure logging
logging.basicConfig(level=logging.INFO, stream=sys.stderr, format='%(message)s')
logger = logging.getLogger('loyalty_recommendation')

# Suppress warnings
warnings.filterwarnings("ignore")

# Définition des programmes de fidélité disponibles
LOYALTY_PROGRAMS = {
    "points_achat": {
        "name": "Points par achat",
        "description": "Programme classique avec accumulation de points sur chaque achat",
        "type": "transactionnel",
        "benefits": ["1 point pour chaque euro dépensé", "Points échangeables contre des réductions"],
        "ideal_segments": ["réguliers", "gros volumes", "fidèles premium"],
        "effectiveness_score": 0.8,
        "implementation_cost": "moyen",
        "retention_rate": 0.7
    },
    "paliers": {
        "name": "Programme à paliers",
        "description": "Différents niveaux de statut avec avantages croissants",
        "type": "niveau",
        "benefits": ["Silver, Gold, Platinum", "Avantages exclusifs par niveau"],
        "ideal_segments": ["fidèles premium", "réguliers", "aspirationnels"],
        "effectiveness_score": 0.85,
        "implementation_cost": "élevé",
        "retention_rate": 0.8
    },
    "programme_valeur": {
        "name": "Récompenses à valeur ajoutée",
        "description": "Offre d'avantages non-monétaires mais à forte valeur perçue",
        "type": "expérientiel",
        "benefits": ["Événements exclusifs", "Accès prioritaire", "Services premium"],
        "ideal_segments": ["high-end", "jeunes urbains", "fidèles premium"],
        "effectiveness_score": 0.9,
        "implementation_cost": "élevé",
        "retention_rate": 0.85
    },
    "cashback": {
        "name": "Remises cash-back",
        "description": "Remboursement d'un pourcentage sur les achats",
        "type": "monétaire",
        "benefits": ["Entre 2% et 5% de remboursement sur les achats"],
        "ideal_segments": ["économes", "réguliers", "sensibles aux prix"],
        "effectiveness_score": 0.75,
        "implementation_cost": "élevé",
        "retention_rate": 0.7
    },
    "coalition": {
        "name": "Programme multi-marques",
        "description": "Partenariat avec d'autres marques pour cumuler/dépenser des points",
        "type": "partenariat",
        "benefits": ["Cumul de points chez plusieurs partenaires", "Plus d'options pour utiliser ses points"],
        "ideal_segments": ["mobiles", "jeunes urbains", "multi-enseignes"],
        "effectiveness_score": 0.8,
        "implementation_cost": "très élevé",
        "retention_rate": 0.75
    },
    "abonnement": {
        "name": "Programme d'abonnement",
        "description": "Frais mensuel/annuel pour des avantages premium",
        "type": "payant",
        "benefits": ["Livraison gratuite", "Réductions exclusives", "Accès prioritaire"],
        "ideal_segments": ["fidèles premium", "gros volumes", "réguliers"],
        "effectiveness_score": 0.85,
        "implementation_cost": "moyen",
        "retention_rate": 0.9
    },
    "personnalise": {
        "name": "Récompenses personnalisées",
        "description": "Offres et avantages sur mesure selon l'historique d'achat",
        "type": "individualisé",
        "benefits": ["Offres basées sur les préférences", "Recommandations produits"],
        "ideal_segments": ["tous segments", "sensibles à la reconnaissance"],
        "effectiveness_score": 0.95,
        "implementation_cost": "élevé",
        "retention_rate": 0.85
    },
    "gamification": {
        "name": "Programme ludique",
        "description": "Mécaniques de jeu pour fidéliser (défis, badges, etc.)",
        "type": "engagement",
        "benefits": ["Défis quotidiens/hebdomadaires", "Badges et accomplissements"],
        "ideal_segments": ["jeunes", "tech-savvy", "joueurs"],
        "effectiveness_score": 0.8,
        "implementation_cost": "moyen",
        "retention_rate": 0.7
    },
    "club_exclusif": {
        "name": "Club VIP",
        "description": "Adhésion à un groupe exclusif avec avantages premium",
        "type": "exclusivité",
        "benefits": ["Événements privés", "Produits en avant-première", "Service dédié"],
        "ideal_segments": ["high-end", "fidèles premium", "aspirationnels"],
        "effectiveness_score": 0.9,
        "implementation_cost": "élevé",
        "retention_rate": 0.9
    },
    "communautaire": {
        "name": "Programme communautaire",
        "description": "Programme axé sur la création d'une communauté de clients",
        "type": "social",
        "benefits": ["Forum entre membres", "Co-création de produits", "Partage d'avis"],
        "ideal_segments": ["engagés", "ambassadeurs", "influenceurs"],
        "effectiveness_score": 0.85,
        "implementation_cost": "moyen",
        "retention_rate": 0.8
    }
}

# Caractéristiques des produits et programmes de fidélité associés
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
        
        # Extract purchase info and product preferences
        purchase_info = []
        product_categories = {}
        
        for purchase in purchases_data:
            client_id = purchase.get('Client_ID')
            total_achat = purchase.get('Total_Achat (€)', 0)
            nombre_produits = purchase.get('Nombre_Produits', 0)
            
            # Process products in purchase
            if 'Produits' in purchase and client_id:
                if client_id not in product_categories:
                    product_categories[client_id] = {}
                
                for product in purchase['Produits']:
                    category = product.get('Catégorie', 'Autre')
                    cost = product.get('Total_Coût_Produit (€)', 0)
                    
                    if category not in product_categories[client_id]:
                        product_categories[client_id][category] = 0
                    
                    product_categories[client_id][category] += cost
            
            purchase_info.append({
                'client_id': client_id,
                'total_achat': total_achat,
                'nombre_produits': nombre_produits
            })
        
        purchases_df = pd.DataFrame(purchase_info)
        
        # Aggregate purchases by client
        purchases_agg = purchases_df.groupby('client_id').agg({
            'total_achat': 'sum',
            'nombre_produits': 'sum'
        }).reset_index()
        
        # Merge dataframes
        combined_df = pd.merge(loyalty_df, purchases_agg, on='client_id', how='left')
        
        # Add additional features
        if 'points_cumules' in combined_df.columns and 'nombre_achats' in combined_df.columns:
            combined_df['points_par_achat'] = combined_df['points_cumules'] / combined_df['nombre_achats'].replace(0, 1)
            combined_df['panier_moyen'] = combined_df['total_achat'] / combined_df['nombre_achats'].replace(0, 1)
        
        return combined_df, product_categories
    
    except Exception as e:
        logger.error(f"Error loading data: {str(e)}")
        sys.exit(1)

def segment_customers(df, n_clusters=5):
    """Segment customers based on their characteristics."""
    try:
        # Select features for segmentation
        features = ['age', 'points_cumules', 'nombre_achats', 'panier_moyen', 'points_par_achat']
        features = [f for f in features if f in df.columns]
        
        if not features:
            logger.error("No valid features for segmentation")
            sys.exit(1)
        
        # Prepare data
        X = df[features].copy()
        X.fillna(X.mean(), inplace=True)
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Apply clustering
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        clusters = kmeans.fit_predict(X_scaled)
        
        # Add cluster to dataframe
        df_with_clusters = df.copy()
        df_with_clusters['segment_id'] = clusters
        
        # Analyze segments
        segments = []
        for segment_id in range(n_clusters):
            segment_data = df_with_clusters[df_with_clusters['segment_id'] == segment_id]
            
            # Basic statistics
            segment = {
                'segment_id': segment_id,
                'size': len(segment_data),
                'percentage': round((len(segment_data) / len(df)) * 100, 2)
            }
            
            # Feature averages
            for feature in features:
                segment[f'{feature}_mean'] = round(segment_data[feature].mean(), 2)
            
            # Determine segment characteristics
            if 'age' in features and 'age_mean' in segment:
                if segment['age_mean'] < 30:
                    segment['age_group'] = 'Jeune'
                elif segment['age_mean'] < 50:
                    segment['age_group'] = 'Adulte'
                else:
                    segment['age_group'] = 'Senior'
            
            if 'points_cumules' in features and 'nombre_achats' in features:
                # Loyalty level
                if segment['points_cumules_mean'] < 500:
                    segment['loyalty_level'] = 'Faible'
                elif segment['points_cumules_mean'] < 1500:
                    segment['loyalty_level'] = 'Moyen'
                else:
                    segment['loyalty_level'] = 'Élevé'
                
                # Purchase frequency
                if segment['nombre_achats_mean'] < 5:
                    segment['purchase_frequency'] = 'Occasionnel'
                elif segment['nombre_achats_mean'] < 10:
                    segment['purchase_frequency'] = 'Régulier'
                else:
                    segment['purchase_frequency'] = 'Fréquent'
                
                # Average basket
                if 'panier_moyen' in features and 'panier_moyen_mean' in segment:
                    if segment['panier_moyen_mean'] < 30:
                        segment['spending_level'] = 'Économe'
                    elif segment['panier_moyen_mean'] < 75:
                        segment['spending_level'] = 'Moyen'
                    else:
                        segment['spending_level'] = 'Généreux'
            
            # Determine segment persona
            if all(k in segment for k in ['loyalty_level', 'purchase_frequency', 'spending_level']):
                if segment['loyalty_level'] == 'Élevé' and segment['purchase_frequency'] == 'Fréquent':
                    if segment['spending_level'] == 'Généreux':
                        segment['persona'] = 'Client Fidèle Premium'
                    else:
                        segment['persona'] = 'Client Fidèle Régulier'
                elif segment['loyalty_level'] == 'Moyen' and segment['purchase_frequency'] == 'Régulier':
                    segment['persona'] = 'Client Régulier'
                elif segment['loyalty_level'] == 'Faible' and segment['purchase_frequency'] == 'Occasionnel':
                    if segment['spending_level'] == 'Généreux':
                        segment['persona'] = 'Client Occasionnel à Potentiel'
                    else:
                        segment['persona'] = 'Client Occasionnel'
                elif segment['spending_level'] == 'Économe':
                    segment['persona'] = 'Client Sensible aux Prix'
                else:
                    segment['persona'] = 'Client Mixte'
            
            segments.append(segment)
        
        return df_with_clusters, segments
    
    except Exception as e:
        logger.error(f"Error in customer segmentation: {str(e)}")
        sys.exit(1)

def recommend_loyalty_programs(segments, product_categories=None):
    """Recommend loyalty programs for each customer segment."""
    recommendations = []
    
    for segment in segments:
        segment_id = segment['segment_id']
        persona = segment.get('persona', 'Client Standard')
        
        # Define segment characteristics for matching
        segment_chars = {
            'frequency': segment.get('purchase_frequency', 'Régulier').lower(),
            'loyalty': segment.get('loyalty_level', 'Moyen').lower(),
            'spending': segment.get('spending_level', 'Moyen').lower(),
            'age_group': segment.get('age_group', 'Adulte').lower()
        }
        
        # Map our segment characteristics to program ideal segments
        segment_mapping = {
            'fidèles premium': segment_chars['loyalty'] == 'élevé' and segment_chars['frequency'] == 'fréquent',
            'réguliers': segment_chars['frequency'] == 'régulier',
            'gros volumes': segment_chars['spending'] == 'généreux',
            'économes': segment_chars['spending'] == 'économe',
            'sensibles aux prix': segment_chars['spending'] == 'économe',
            'jeunes': segment_chars['age_group'] == 'jeune',
            'high-end': segment_chars['spending'] == 'généreux' and segment_chars['loyalty'] == 'élevé',
            'aspirationnels': segment_chars['loyalty'] == 'moyen' and segment_chars['spending'] == 'moyen',
            'jeunes urbains': segment_chars['age_group'] == 'jeune',
            'tous segments': True,
            'tech-savvy': segment_chars['age_group'] == 'jeune',
            'joueurs': segment_chars['age_group'] == 'jeune',
            'engagés': segment_chars['loyalty'] == 'élevé',
            'ambassadeurs': segment_chars['loyalty'] == 'élevé' and segment_chars['frequency'] == 'fréquent',
            'sensibles à la reconnaissance': True,
            'multi-enseignes': True,
            'mobiles': segment_chars['age_group'] == 'jeune' or segment_chars['age_group'] == 'adulte'
        }
        
        # Score each loyalty program for this segment
        program_scores = {}
        for program_id, program in LOYALTY_PROGRAMS.items():
            score = 0
            ideal_segments = program.get('ideal_segments', [])
            
            # Calculate match score based on ideal segments
            for ideal in ideal_segments:
                ideal_lower = ideal.lower()
                if ideal_lower in segment_mapping and segment_mapping[ideal_lower]:
                    score += 1
            
            # Normalize score
            if ideal_segments:
                score = score / len(ideal_segments)
            
            # Apply effectiveness weight
            effectiveness = program.get('effectiveness_score', 0.5)
            retention = program.get('retention_rate', 0.5)
            weighted_score = score * 0.5 + effectiveness * 0.3 + retention * 0.2
            
            program_scores[program_id] = weighted_score
        
        # Get top 3 programs
        top_programs = sorted(program_scores.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # Create recommendation object
        recommendation = {
            'segment_id': segment_id,
            'persona': persona,
            'segment_characteristics': {
                'loyalty_level': segment.get('loyalty_level', 'Moyen'),
                'purchase_frequency': segment.get('purchase_frequency', 'Régulier'),
                'spending_level': segment.get('spending_level', 'Moyen'),
                'age_group': segment.get('age_group', 'Adulte')
            },
            'size': segment.get('size', 0),
            'percentage': segment.get('percentage', 0),
            'recommended_programs': []
        }
        
        # Add program details
        for program_id, score in top_programs:
            if program_id in LOYALTY_PROGRAMS:
                program = LOYALTY_PROGRAMS[program_id]
                recommendation['recommended_programs'].append({
                    'program_id': program_id,
                    'name': program['name'],
                    'description': program['description'],
                    'type': program['type'],
                    'benefits': program['benefits'],
                    'match_score': round(score * 100, 2),
                    'implementation_cost': program['implementation_cost'],
                    'retention_rate': program['retention_rate']
                })
        
        recommendations.append(recommendation)
    
    return recommendations

def recommend_product_loyalty_programs(product_categories):
    """Recommend loyalty programs specific to product categories."""
    product_recommendations = []
    
    # Get unique product categories across all customers
    all_categories = set()
    for client, categories in product_categories.items():
        all_categories.update(categories.keys())
    
    # For each product category, recommend programs
    for category in all_categories:
        # Skip categories with no mapping
        category_norm = category.lower().capitalize()
        if category_norm not in PRODUCT_LOYALTY_MAPPING:
            continue
        
        mapping = PRODUCT_LOYALTY_MAPPING[category_norm]
        recommendation = {
            'category': category,
            'explanation': mapping['explanation'],
            'recommended_programs': []
        }
        
        # Add details for each recommended program
        for program_id in mapping['recommended_programs']:
            if program_id in LOYALTY_PROGRAMS:
                program = LOYALTY_PROGRAMS[program_id]
                recommendation['recommended_programs'].append({
                    'program_id': program_id,
                    'name': program['name'],
                    'description': program['description'],
                    'benefits': program['benefits'],
                    'implementation_cost': program['implementation_cost']
                })
            elif program_id == 'garantie_etendue':
                # Special case for programs not in the main list
                recommendation['recommended_programs'].append({
                    'program_id': 'garantie_etendue',
                    'name': 'Garantie Étendue',
                    'description': 'Extension de garantie sur les produits achetés',
                    'benefits': ['Protection prolongée', 'Tranquillité d\'esprit'],
                    'implementation_cost': 'moyen'
                })
            elif program_id == 'échantillons':
                recommendation['recommended_programs'].append({
                    'program_id': 'échantillons',
                    'name': 'Programme d\'échantillons',
                    'description': 'Échantillons gratuits basés sur les achats précédents',
                    'benefits': ['Découverte de nouveaux produits', 'Incitation à l\'achat'],
                    'implementation_cost': 'moyen'
                })
            elif program_id == 'garantie':
                recommendation['recommended_programs'].append({
                    'program_id': 'garantie',
                    'name': 'Garantie Satisfaction',
                    'description': 'Garantie étendue ou satisfait ou remboursé',
                    'benefits': ['Réassurance client', 'Confiance dans l\'achat'],
                    'implementation_cost': 'élevé'
                })
            elif program_id == 'événements':
                recommendation['recommended_programs'].append({
                    'program_id': 'événements',
                    'name': 'Événements exclusifs',
                    'description': 'Accès à des événements sportifs ou challenges',
                    'benefits': ['Expériences uniques', 'Sentiment d\'appartenance'],
                    'implementation_cost': 'élevé'
                })
            elif program_id == 'service_premium':
                recommendation['recommended_programs'].append({
                    'program_id': 'service_premium',
                    'name': 'Service Premium',
                    'description': 'Service client dédié et personnalisé',
                    'benefits': ['Conseiller personnel', 'Traitement prioritaire'],
                    'implementation_cost': 'très élevé'
                })
            elif program_id == 'partenaires':
                recommendation['recommended_programs'].append({
                    'program_id': 'partenaires',
                    'name': 'Réseau de partenaires',
                    'description': 'Avantages croisés avec partenaires complémentaires',
                    'benefits': ['Réductions chez les partenaires', 'Expérience complète'],
                    'implementation_cost': 'élevé'
                })
            elif program_id == 'coaching':
                recommendation['recommended_programs'].append({
                    'program_id': 'coaching',
                    'name': 'Programme de coaching',
                    'description': 'Accompagnement personnalisé bien-être/santé',
                    'benefits': ['Conseils experts', 'Suivi personnalisé'],
                    'implementation_cost': 'élevé'
                })
        
        product_recommendations.append(recommendation)
    
    return product_recommendations

def main():
    parser = argparse.ArgumentParser(description='Loyalty Program Recommendation System')
    parser.add_argument('--loyalty', required=True, help='Path to the loyalty points JSON file')
    parser.add_argument('--purchases', required=True, help='Path to the purchases JSON file')
    parser.add_argument('--segments', type=int, default=5, help='Number of customer segments to create')
    
    args = parser.parse_args()
    
    try:
        # Load data
        df, product_categories = load_data(args.loyalty, args.purchases)
        
        # Segment customers
        df_with_segments, segments = segment_customers(df, args.segments)
        
        # Recommend loyalty programs for segments
        segment_recommendations = recommend_loyalty_programs(segments, product_categories)
        
        # Recommend loyalty programs for products
        product_recommendations = recommend_product_loyalty_programs(product_categories)
        
        # Prepare results
        results = {
            'segment_recommendations': segment_recommendations,
            'product_recommendations': product_recommendations,
            'segments': segments
        }
        
        # Output results as JSON
        print(json.dumps(results))
        
    except Exception as e:
        logger.error(f"Error in main: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 