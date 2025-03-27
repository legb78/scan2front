// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    // Cacher le préchargeur après le chargement de la page
    setTimeout(function() {
        document.querySelector('.preloader').style.opacity = '0';
        document.querySelector('.preloader').style.visibility = 'hidden';
    }, 1000);

    // Initialiser le sélecteur de dates
    flatpickr("#date-range", {
        mode: "range",
        dateFormat: "d/m/Y",
        defaultDate: [new Date().setDate(new Date().getDate() - 30), new Date()],
        locale: {
            firstDayOfWeek: 1,
            weekdays: {
                shorthand: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
                longhand: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
            },
            months: {
                shorthand: ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'],
                longhand: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
            }
        },
        onChange: function(selectedDates, dateStr) {
            if (selectedDates.length === 2) {
                // Nous avons une plage de dates complète
                console.log('Date range selected:', dateStr);
                
                // Filtrer les données en fonction de la plage de dates sélectionnée
                const filteredData = filterDataByDateRange(globalData, selectedDates[0], selectedDates[1]);
                
                // Mettre à jour tous les graphiques et statistiques avec les données filtrées
                updateAllVisualizations(filteredData);
            }
        }
    });

    // Configuration de la navigation fluide du menu
    setupSmoothScrolling();

    // Charger les données du fichier JSON
    loadClientData();
});

// Configuration du défilement fluide pour les éléments de menu
function setupSmoothScrolling() {
    // Récupérer tous les liens du menu
    const menuLinks = document.querySelectorAll('.sidebar-menu a');
    
    menuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Retirer la classe active de tous les liens
            menuLinks.forEach(item => item.parentElement.classList.remove('active'));
            
            // Ajouter la classe active au lien cliqué
            this.parentElement.classList.add('active');
            
            // Récupérer l'élément cible à partir du href
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                // Faire défiler jusqu'à l'élément avec une animation
                window.scrollTo({
                    top: targetElement.offsetTop - 20,
                    behavior: 'smooth'
                });
                
                // Sur mobile, fermer le menu après la sélection
                const sidebar = document.querySelector('.sidebar');
                if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            }
        });
    });
}

// Variables pour stocker les données et l'état actuel
let globalData = [];
let globalLoyaltyData = []; // Variable pour stocker les données de fidélité
let currentPeriod = {
    products: 'semaine',
    stores: 'semaine',
    sales: 'mois'
};

// Fonction pour charger les données des achats clients
function loadClientData() {
    console.log('Attempting to load client data from /api/data...');
    fetch('/api/data')
        .then(response => {
            if (!response.ok) {
                console.error('Server responded with status:', response.status);
                throw new Error(`Erreur serveur: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Data loaded successfully, entries:', data.length);
            globalData = data;
            initializeAllWithRealData(data);
        })
        .catch(error => {
            console.error('Error loading data:', error);
            // Afficher l'erreur dans l'interface utilisateur
            const errorElements = document.querySelectorAll('.insight-content, .chart-body');
            errorElements.forEach(element => {
                element.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Impossible de charger les données: ${error.message}</p>
                    </div>
                `;
            });
            
            // Afficher aussi l'erreur dans le tableau de données client
            const clientDataTable = document.getElementById('client-data-table');
            if (clientDataTable) {
                clientDataTable.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Impossible de charger les données: ${error.message}</p>
                        <p>Vérifiez la console pour plus de détails.</p>
                    </div>
                `;
            }
        });
}

// Fonction pour initialiser tous les éléments avec les données réelles
function initializeAllWithRealData(data) {
    // Afficher les données dans le tableau
    displayClientData(data);
    
    // Mettre à jour les statistiques
    updateDashboardStats(data);
    
    // Initialiser les graphiques avec les données réelles
    initSalesChart(data);
    initProductsChart(data);
    initDemographicsChart(data);
    
    // Initialiser les nouvelles visualisations
    initHourlyTrendChart(data);
    initSalesHeatmapChart(data);
    initBasketAnalysisChart(data);
    initCategoryPerformanceChart(data);
    
    // Afficher les produits les plus vendus et magasins les plus performants
    displayTopProducts(data, currentPeriod.products);
    displayTopStores(data, currentPeriod.stores);
    
    // Charger les données de fidélité et initialiser le programme de fidélité
    loadLoyaltyData(data);
    
    // Ajouter les écouteurs d'événements après initialisation
    setupEventListeners(data);
}

// Fonction pour configurer les écouteurs d'événements
function setupEventListeners(data) {
    // Gestion des boutons de période pour le graphique des ventes
    const periodButtons = document.querySelectorAll('.chart-actions button');
    periodButtons.forEach(button => {
        button.addEventListener('click', function() {
            periodButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentPeriod.sales = this.textContent.toLowerCase();
            updateSalesChart(data, currentPeriod.sales);
        });
    });

    // Écouteurs d'événements pour les sélecteurs de produits
    const productsPeriodSelector = document.getElementById('top-products-period');
    if (productsPeriodSelector) {
        productsPeriodSelector.addEventListener('change', function() {
            currentPeriod.products = this.value;
            displayTopProducts(data, currentPeriod.products);
        });
    }
    
    // Écouteurs d'événements pour les sélecteurs de magasins
    const storesPeriodSelector = document.getElementById('top-stores-period');
    if (storesPeriodSelector) {
        storesPeriodSelector.addEventListener('change', function() {
            currentPeriod.stores = this.value;
            displayTopStores(data, currentPeriod.stores);
        });
    }

    // Écouteurs d'événements pour les autres sélecteurs
    document.querySelectorAll('.chart-select, .insight-select').forEach(select => {
        select.addEventListener('change', function() {
            const chartId = this.closest('.chart-card') ? 
                this.closest('.chart-card').querySelector('canvas').id : 
                this.closest('.insight-card').querySelector('canvas').id;
            
            updateChart(chartId, this.value, data);
        });
    });

    // Écouteurs d'événements pour les sélecteurs du programme de fidélité
    const loyaltyPointsSelect = document.getElementById('loyalty-points-select');
    if (loyaltyPointsSelect) {
        loyaltyPointsSelect.addEventListener('change', function() {
            // Mettre à jour le graphique de distribution des points selon la période sélectionnée
            // Cette logique serait mise en place dans une implémentation complète
            console.log(`Période de points sélectionnée: ${this.value}`);
        });
    }
    
    const loyaltyConversionSelect = document.getElementById('loyalty-conversion-select');
    if (loyaltyConversionSelect) {
        loyaltyConversionSelect.addEventListener('change', function() {
            // Mettre à jour le graphique de conversion selon la période sélectionnée
            console.log(`Période de conversion sélectionnée: ${this.value}`);
        });
    }
    
    // Recherche dans le tableau de fidélité
    const loyaltySearch = document.getElementById('loyalty-search');
    if (loyaltySearch) {
        loyaltySearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const tableRows = document.querySelectorAll('.loyalty-table tbody tr');
            
            tableRows.forEach(row => {
                const clientName = row.cells[0].textContent.toLowerCase();
                const clientEmail = row.cells[1].textContent.toLowerCase();
                
                if (clientName.includes(searchTerm) || clientEmail.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
}

// Fonction pour filtrer les données par période
function filterDataByPeriod(data, period) {
    const now = new Date();
    let startDate;
    
    switch (period) {
        case 'semaine':
            // Filtrer par la semaine actuelle (les 7 derniers jours)
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
        case 'mois':
            // Filtrer par le mois actuel (les 30 derniers jours)
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 30);
            break;
        case 'trimestre':
            // Filtrer par le trimestre actuel (les 90 derniers jours)
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 90);
            break;
        case 'annee':
            // Filtrer par l'année actuelle (les 365 derniers jours)
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 365);
            break;
        default:
            // Par défaut, renvoyer toutes les données
            return data;
    }
    
    // Filtrer les données selon la date
    return data.filter(item => {
        const itemDate = new Date(item['Jour_Achat']);
        return itemDate >= startDate && itemDate <= now;
    });
}

// Fonction pour afficher les produits les plus vendus
function displayTopProducts(data, period) {
    const topProductsContainer = document.getElementById('top-products-list');
    if (!topProductsContainer) return;
    
    // Filtrer les données par période
    const filteredData = filterDataByPeriod(data, period);

    // Afficher un état de chargement
    topProductsContainer.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Chargement des données...</p>
        </div>
    `;

    // Calculer les produits les plus vendus
    const productCounts = {};
    filteredData.forEach(item => {
        item.Produits.forEach(product => {
            const productName = product.Nom_Produit;
            if (!productCounts[productName]) {
                productCounts[productName] = 0;
            }
            productCounts[productName] += product.Quantité;
        });
    });

    // Trier et prendre les 5 produits les plus populaires
    const sortedProducts = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    // Si aucun produit n'est trouvé
    if (sortedProducts.length === 0) {
        topProductsContainer.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-info-circle"></i>
                <p>Aucune donnée disponible pour cette période</p>
            </div>
        `;
        return;
    }

    // Vider le conteneur existant
    topProductsContainer.innerHTML = '';

    // Ajouter chaque produit à la liste
    sortedProducts.forEach(([productName, count]) => {
        // Déterminer la catégorie du produit (simplifié)
        let category = '';
        if (productName.includes('Eau') || productName.includes('Jus') || productName.includes('Lait')) {
            category = 'Boissons';
        } else if (productName.includes('Fruits') || productName.includes('Légumes')) {
            category = 'Fruits & Légumes';
        } else if (productName.includes('Viande') || productName.includes('Poisson')) {
            category = 'Boucherie';
        } else if (productName.includes('Fromage') || productName.includes('Pain')) {
            category = 'Crèmerie & Boulangerie';
        } else if (productName.includes('Pâtes')) {
            category = 'Épicerie';
        } else {
            category = 'Divers';
        }

        // Calculer le pourcentage de progression pour la barre
        const maxCount = sortedProducts[0][1];
        const progressPercentage = Math.round((count / maxCount) * 100);

        // Créer l'élément HTML
        const productElement = document.createElement('div');
        productElement.className = 'product-item';
        productElement.innerHTML = `
            <div class="product-img">
                <i class="fas fa-shopping-basket"></i>
            </div>
            <div class="product-info">
                <h3>${productName}</h3>
                <span>${category}</span>
            </div>
            <div class="product-stats">
                <span>${count} ventes</span>
                <div class="progress-bar">
                    <div class="progress" style="width: ${progressPercentage}%"></div>
                </div>
            </div>
        `;

        topProductsContainer.appendChild(productElement);
    });
    
    // Mettre à jour le titre de la section avec la période
    updateSectionTitle('top-products-title', period);
}

// Fonction pour afficher les magasins les plus performants
function displayTopStores(data, period) {
    const topStoresContainer = document.getElementById('top-stores-list');
    if (!topStoresContainer) return;
    
    // Filtrer les données par période
    const filteredData = filterDataByPeriod(data, period);
    
    // Afficher un état de chargement
    topStoresContainer.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Chargement des données...</p>
        </div>
    `;

    // Calculer les ventes par magasin
    const storeSales = {};
    filteredData.forEach(item => {
        const store = item.Magasin;
        if (!storeSales[store]) {
            storeSales[store] = 0;
        }
        storeSales[store] += item['Total_Achat (€)'] || 0;
    });

    // Trier et prendre les 5 magasins les plus performants
    const sortedStores = Object.entries(storeSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    // Si aucun magasin n'est trouvé
    if (sortedStores.length === 0) {
        topStoresContainer.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-info-circle"></i>
                <p>Aucune donnée disponible pour cette période</p>
            </div>
        `;
        return;
    }

    // Vider le conteneur existant
    topStoresContainer.innerHTML = '';

    // Ajouter chaque magasin à la liste
    sortedStores.forEach(([storeName, sales]) => {
        // Créer une localisation basée sur le nom du magasin
        let location = '';
        if (storeName.includes('Paris')) {
            location = 'Paris, France';
        } else if (storeName.includes('Lyon')) {
            location = 'Lyon, France';
        } else if (storeName.includes('Marseille')) {
            location = 'Marseille, France';
        } else if (storeName.includes('Bordeaux')) {
            location = 'Bordeaux, France';
        } else if (storeName.includes('Nice')) {
            location = 'Nice, France';
        } else {
            location = 'France';
        }

        // Calculer le pourcentage de progression pour la barre
        const maxSales = sortedStores[0][1];
        const progressPercentage = Math.round((sales / maxSales) * 100);

        // Créer l'élément HTML
        const storeElement = document.createElement('div');
        storeElement.className = 'store-item';
        storeElement.innerHTML = `
            <div class="store-img">
                <i class="fas fa-store"></i>
            </div>
            <div class="store-info">
                <h3>${storeName}</h3>
                <span>${location}</span>
            </div>
            <div class="store-stats">
                <span>€${sales.toFixed(2)}</span>
                <div class="progress-bar">
                    <div class="progress" style="width: ${progressPercentage}%"></div>
                </div>
            </div>
        `;

        topStoresContainer.appendChild(storeElement);
    });
    
    // Mettre à jour le titre de la section avec la période
    updateSectionTitle('top-stores-title', period);
}

// Fonction pour mettre à jour le titre des sections avec la période
function updateSectionTitle(titleId, period) {
    const titleElement = document.getElementById(titleId);
    if (!titleElement) return;
    
    let periodDisplay = '';
    switch(period) {
        case 'semaine':
            periodDisplay = 'cette semaine';
            break;
        case 'mois':
            periodDisplay = 'ce mois';
            break;
        case 'trimestre':
            periodDisplay = 'ce trimestre';
            break;
        case 'annee':
            periodDisplay = 'cette année';
            break;
        default:
            periodDisplay = '';
    }
    
    // Mettre à jour le texte du titre
    titleElement.setAttribute('data-period', periodDisplay);
}

// Fonction pour initialiser le graphique des ventes avec les données réelles
function initSalesChart(data) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    // Options du graphique
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(45, 52, 54, 0.8)',
                padding: 10,
                cornerRadius: 6,
                titleFont: {
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 13
                },
                callbacks: {
                    label: function(context) {
                        return `€${context.parsed.y.toFixed(2)}`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        size: 11
                    },
                    color: '#77797a'
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(229, 233, 235, 0.5)'
                },
                ticks: {
                    font: {
                        size: 11
                    },
                    color: '#77797a',
                    callback: function(value) {
                        return `€${value}`;
                    }
                }
            }
        }
    };
    
    // Créer le graphique avec des données vides (seront mises à jour)
    window.salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Ventes',
                data: [],
                backgroundColor: 'rgba(117, 188, 141, 0.2)',
                borderColor: '#75BC8D',
                borderWidth: 2,
                pointBackgroundColor: '#75BC8D',
                pointRadius: 0,
                pointHoverRadius: 4,
                tension: 0.4
            }]
        },
        options: options
    });
    
    // Initialiser avec les données du mois (par défaut)
    updateSalesChart(data, 'mois');
}

// Fonction pour mettre à jour le graphique des ventes en fonction de la période
function updateSalesChart(data, period) {
    // Filtrer les données selon la période
    const filteredData = filterDataByPeriod(data, period);
    
    let salesByPeriod = {};
    let labels = [];
    
    switch(period) {
        case 'jour':
            // Grouper par heure
            filteredData.forEach(item => {
                const hour = item['Heure_Achat'].split(':')[0];
                if (!salesByPeriod[hour]) {
                    salesByPeriod[hour] = 0;
                }
                salesByPeriod[hour] += item['Total_Achat (€)'] || 0;
            });
            
            // Créer des labels pour chaque heure
            for (let i = 0; i < 24; i++) {
                const hour = i.toString().padStart(2, '0');
                labels.push(`${hour}h`);
                if (!salesByPeriod[hour]) {
                    salesByPeriod[hour] = 0;
                }
            }
            break;
            
        case 'semaine':
            // Convertir les dates en jours de la semaine
            const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
            filteredData.forEach(item => {
                const date = new Date(item['Jour_Achat']);
                const dayOfWeek = daysOfWeek[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Ajuster dimanche (0) pour être le dernier jour
                if (!salesByPeriod[dayOfWeek]) {
                    salesByPeriod[dayOfWeek] = 0;
                }
                salesByPeriod[dayOfWeek] += item['Total_Achat (€)'] || 0;
            });
            
            labels = daysOfWeek;
            break;
            
        case 'mois':
        default:
            // Grouper par jour
            filteredData.forEach(item => {
                const day = item['Jour_Achat'];
                if (!salesByPeriod[day]) {
                    salesByPeriod[day] = 0;
                }
                salesByPeriod[day] += item['Total_Achat (€)'] || 0;
            });
            
            // Récupérer les 30 derniers jours ou tous les jours si période plus courte
            const sortedDays = Object.keys(salesByPeriod).sort();
            const last30Days = sortedDays.slice(-30);
            
            // Formater les dates pour l'affichage
            labels = last30Days.map(day => {
                const date = new Date(day);
                return `${date.getDate()}/${date.getMonth() + 1}`;
            });
            
            // Ne garder que les données des jours sélectionnés
            const oldSalesByPeriod = salesByPeriod;
            salesByPeriod = {};
            last30Days.forEach(day => {
                salesByPeriod[day] = oldSalesByPeriod[day];
            });
    }
    
    // Mettre à jour les données du graphique
    const chartData = labels.map(label => {
        const key = period === 'mois' ? Object.keys(salesByPeriod)[labels.indexOf(label)] : label.replace('h', '');
        return salesByPeriod[key] || 0;
    });
    
    window.salesChart.data.labels = labels;
    window.salesChart.data.datasets[0].data = chartData;
    window.salesChart.update();
    
    // Mettre à jour le titre du graphique
    updateSectionTitle('sales-chart-title', period);
}

// Fonction pour initialiser le graphique des produits populaires
function initProductsChart(data) {
    const ctx = document.getElementById('productsChart').getContext('2d');
    
    // Compter les occurrences de chaque produit
    const productCounts = {};
    data.forEach(item => {
        item.Produits.forEach(product => {
            const productName = product.Nom_Produit;
            if (!productCounts[productName]) {
                productCounts[productName] = 0;
            }
            productCounts[productName] += product.Quantité;
        });
    });
    
    // Trier et prendre les 5 produits les plus populaires
    const sortedProducts = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const productLabels = sortedProducts.map(product => product[0]);
    const productData = sortedProducts.map(product => product[1]);
    
    // Données des produits
    const productsData = {
        labels: productLabels,
        datasets: [{
            data: productData,
            backgroundColor: [
                '#75BC8D',
                '#4BB6C9',
                '#8376B2',
                '#FFA26B',
                '#60A3BC'
            ],
            borderWidth: 0,
            borderRadius: 4
        }]
    };
    
    // Options du graphique
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    font: {
                        size: 12
                    },
                    padding: 15,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(45, 52, 54, 0.8)',
                padding: 10,
                cornerRadius: 6,
                titleFont: {
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 13
                },
                callbacks: {
                    label: function(context) {
                        return `${context.parsed} produits`;
                    }
                }
            }
        }
    };
    
    // Créer le graphique
    window.productsChart = new Chart(ctx, {
        type: 'doughnut',
        data: productsData,
        options: options
    });
}

// Fonction pour initialiser le graphique des démographiques clients
function initDemographicsChart(data) {
    const ctx = document.getElementById('demographicsChart').getContext('2d');
    
    // Calculer les tranches d'âge
    const ageGroups = {
        '18-24': 0,
        '25-34': 0,
        '35-44': 0,
        '45-54': 0,
        '55+': 0
    };
    
    // Compter les clients uniques par ID et âge
    const uniqueClients = {};
    data.forEach(item => {
        const clientId = item.Client_ID;
        if (!uniqueClients[clientId]) {
            uniqueClients[clientId] = item.Âge;
            
            // Ajouter à la tranche d'âge correspondante
            const age = item.Âge;
            if (age < 25) ageGroups['18-24']++;
            else if (age < 35) ageGroups['25-34']++;
            else if (age < 45) ageGroups['35-44']++;
            else if (age < 55) ageGroups['45-54']++;
            else ageGroups['55+']++;
        }
    });
    
    // Calculer les pourcentages
    const totalClients = Object.keys(uniqueClients).length;
    const ageGroupsPercentage = Object.keys(ageGroups).map(group => {
        return Math.round((ageGroups[group] / totalClients) * 100);
    });
    
    // Données démographiques
    const demographicsData = {
        labels: Object.keys(ageGroups),
        datasets: [{
            label: 'Clients par âge',
            data: ageGroupsPercentage,
            backgroundColor: 'rgba(75, 182, 201, 0.7)',
            borderColor: '#4BB6C9',
            borderWidth: 1,
            borderRadius: 4,
            maxBarThickness: 30
        }]
    };
    
    // Options du graphique
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(45, 52, 54, 0.8)',
                padding: 10,
                cornerRadius: 6,
                titleFont: {
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 13
                },
                callbacks: {
                    label: function(context) {
                        return `${context.parsed.y}% des clients`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        size: 11
                    },
                    color: '#77797a'
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(229, 233, 235, 0.5)'
                },
                ticks: {
                    font: {
                        size: 11
                    },
                    color: '#77797a',
                    callback: function(value) {
                        return `${value}%`;
                    }
                }
            }
        }
    };
    
    // Créer le graphique
    window.demographicsChart = new Chart(ctx, {
        type: 'bar',
        data: demographicsData,
        options: options
    });
}

// Fonction pour mettre à jour les graphiques en fonction des sélecteurs
function updateChart(chartId, value, data) {
    switch(chartId) {
        case 'demographicsChart':
            if (value === 'Par sexe') {
                // Calculer les distributions par sexe
                const genderDistribution = { 'Femme': 0, 'Homme': 0 };
                const uniqueClients = new Map();
                
                data.forEach(item => {
                    if (!uniqueClients.has(item.Client_ID)) {
                        uniqueClients.set(item.Client_ID, item.Sexe);
                        genderDistribution[item.Sexe]++;
                    }
                });
                
                const totalClients = uniqueClients.size;
                const genderPercentages = Object.entries(genderDistribution).map(([gender, count]) => ({
                    gender,
                    percentage: Math.round((count / totalClients) * 100)
                }));
                
                window.demographicsChart.data.labels = genderPercentages.map(item => item.gender);
                window.demographicsChart.data.datasets[0].data = genderPercentages.map(item => item.percentage);
                window.demographicsChart.data.datasets[0].backgroundColor = ['#FF9999', '#66B2FF'];
                window.demographicsChart.options.plugins.title = {
                    display: true,
                    text: 'Répartition par sexe'
                };
                window.demographicsChart.type = 'doughnut';
            } else if (value === 'Par localisation') {
                // Calculer les distributions par magasin
                const storeDistribution = new Map();
                const uniqueClients = new Map();
                const storeLocations = {
                    'Paris': 'Paris, Île-de-France',
                    'Lyon': 'Lyon, Auvergne-Rhône-Alpes',
                    'Marseille': 'Marseille, PACA',
                    'Bordeaux': 'Bordeaux, Nouvelle-Aquitaine',
                    'Nice': 'Nice, PACA',
                    'Toulouse': 'Toulouse, Occitanie',
                    'Nantes': 'Nantes, Pays de la Loire',
                    'Strasbourg': 'Strasbourg, Grand Est',
                    'Montpellier': 'Montpellier, Occitanie',
                    'Lille': 'Lille, Hauts-de-France'
                };
                
                data.forEach(item => {
                    if (!uniqueClients.has(item.Client_ID)) {
                        uniqueClients.set(item.Client_ID, item.Magasin);
                        const count = storeDistribution.get(item.Magasin) || 0;
                        storeDistribution.set(item.Magasin, count + 1);
                    }
                });
                
                // Trier par popularité et prendre les 5 premiers
                const sortedStores = Array.from(storeDistribution.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);
                
                const totalClients = uniqueClients.size;
                const storePercentages = sortedStores.map(([store, count]) => ({
                    store: store + ' (' + (storeLocations[store.split(' ')[0]] || 'France') + ')',
                    percentage: Math.round((count / totalClients) * 100)
                }));
                
                window.demographicsChart.data.labels = storePercentages.map(item => item.store);
                window.demographicsChart.data.datasets[0].data = storePercentages.map(item => item.percentage);
                window.demographicsChart.data.datasets[0].backgroundColor = [
                    '#4BB6C9',
                    '#75BC8D',
                    '#8376B2',
                    '#FFA26B',
                    '#60A3BC'
                ];
                window.demographicsChart.options.plugins.title = {
                    display: true,
                    text: 'Répartition par magasin'
                };
                window.demographicsChart.type = 'bar';
            } else {
                // Par âge (par défaut)
                const ageGroups = {
                    '18-24': 0,
                    '25-34': 0,
                    '35-44': 0,
                    '45-54': 0,
                    '55+': 0
                };
                
                const uniqueClients = new Map();
                
                data.forEach(item => {
                    if (!uniqueClients.has(item.Client_ID)) {
                        uniqueClients.set(item.Client_ID, item.Âge);
                        const age = item.Âge;
                        if (age < 25) ageGroups['18-24']++;
                        else if (age < 35) ageGroups['25-34']++;
                        else if (age < 45) ageGroups['35-44']++;
                        else if (age < 55) ageGroups['45-54']++;
                        else ageGroups['55+']++;
                    }
                });
                
                const totalClients = uniqueClients.size;
                const agePercentages = Object.entries(ageGroups).map(([range, count]) => ({
                    range,
                    percentage: Math.round((count / totalClients) * 100)
                }));
                
                window.demographicsChart.data.labels = agePercentages.map(item => item.range);
                window.demographicsChart.data.datasets[0].data = agePercentages.map(item => item.percentage);
                window.demographicsChart.data.datasets[0].backgroundColor = 'rgba(75, 182, 201, 0.7)';
                window.demographicsChart.options.plugins.title = {
                    display: true,
                    text: 'Répartition par âge'
                };
                window.demographicsChart.type = 'bar';
            }
            window.demographicsChart.update();
            break;
            
        case 'productsChart':
            // Calculer les catégories de produits
            const categoryDistribution = new Map();
            
            data.forEach(item => {
                item.Produits.forEach(product => {
                    let category = '';
                    if (product.Nom_Produit.includes('Eau') || product.Nom_Produit.includes('Jus') || product.Nom_Produit.includes('Lait')) {
                        category = 'Boissons';
                    } else if (product.Nom_Produit.includes('Fruits') || product.Nom_Produit.includes('Légumes')) {
                        category = 'Fruits & Légumes';
                    } else if (product.Nom_Produit.includes('Viande') || product.Nom_Produit.includes('Poisson')) {
                        category = 'Boucherie';
                    } else if (product.Nom_Produit.includes('Fromage') || product.Nom_Produit.includes('Pain')) {
                        category = 'Crèmerie & Boulangerie';
                    } else {
                        category = 'Autres';
                    }
                    
                    const count = categoryDistribution.get(category) || 0;
                    categoryDistribution.set(category, count + product.Quantité);
                });
            });
            
            // Trier par popularité
            const sortedCategories = Array.from(categoryDistribution.entries())
                .sort((a, b) => b[1] - a[1]);
            
            window.productsChart.data.labels = sortedCategories.map(item => item[0]);
            window.productsChart.data.datasets[0].data = sortedCategories.map(item => item[1]);
            window.productsChart.update();
            break;
        
        case 'hourlyTrendChart':
            updateHourlyTrendChart(data, value);
            break;
            
        case 'salesHeatmapChart':
            updateSalesHeatmapChart(data, value);
            break;
            
        case 'basketAnalysisChart':
            updateBasketAnalysisChart(data, value);
            break;
            
        case 'categoryPerformanceChart':
            updateCategoryPerformanceChart(data, value);
            break;
    }
}

// Fonction pour afficher les données des clients dans un tableau
function displayClientData(data) {
    const tableContainer = document.getElementById('client-data-table');
    if (!tableContainer) {
        console.error('Container de tableau non trouvé');
        return;
    }
    
    // Ajouter la barre de recherche avec filtres
    let searchHTML = `
        <div class="search-container">
            <div class="search-filters">
                <input type="text" id="client-search" placeholder="Rechercher un client..." class="search-input">
                <select id="filter-sex" class="filter-select">
                    <option value="">Tous les sexes</option>
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                </select>
                <select id="filter-store" class="filter-select">
                    <option value="">Tous les magasins</option>
                    ${[...new Set(data.map(item => item.Magasin))].sort().map(store => 
                        `<option value="${store}">${store}</option>`
                    ).join('')}
                </select>
                <select id="filter-age" class="filter-select">
                    <option value="">Tous les âges</option>
                    <option value="18-24">18-24 ans</option>
                    <option value="25-34">25-34 ans</option>
                    <option value="35-44">35-44 ans</option>
                    <option value="45-54">45-54 ans</option>
                    <option value="55+">55 ans et plus</option>
                </select>
            </div>
        </div>
    `;
    
    // Créer le tableau HTML avec pagination
    let tableHTML = `
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Client ID</th>
                        <th>Âge</th>
                        <th>Sexe</th>
                        <th>Magasin</th>
                        <th>Ticket ID</th>
                        <th>Date d'achat</th>
                        <th>Heure</th>
                        <th>Nb produits</th>
                        <th>Total (€)</th>
                        <th>Détails</th>
                    </tr>
                </thead>
                <tbody id="client-data-body">
    `;
    
    // Variables pour la pagination
    const itemsPerPage = 10;
    let currentPage = 1;
    const totalPages = Math.ceil(data.length / itemsPerPage);
    
    function displayPage(pageNum, filteredData) {
        const start = (pageNum - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageData = filteredData.slice(start, end);
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        
        const tbody = document.getElementById('client-data-body');
        tbody.innerHTML = '';
        
        pageData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.Client_ID}</td>
                <td>${item.Âge}</td>
                <td>${item.Sexe}</td>
                <td>${item.Magasin}</td>
                <td>${item.Ticket_ID}</td>
                <td>${item.Jour_Achat}</td>
                <td>${item.Heure_Achat}</td>
                <td>${item.Nombre_Produits}</td>
                <td>${item['Total_Achat (€)'].toFixed(2)} €</td>
                <td><button class="details-btn" data-ticket="${item.Ticket_ID}">Voir</button></td>
            `;
            tbody.appendChild(row);
        });
        
        // Mettre à jour la pagination
        updatePagination(pageNum, totalPages, filteredData.length);
    }
    
    function updatePagination(currentPage, totalPages, totalItems) {
        const paginationContainer = document.querySelector('.pagination-controls');
        if (!paginationContainer) return;

        let paginationHTML = `
            <button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Logique pour afficher les numéros de page
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            paginationHTML += `
                <button data-page="1">1</button>
                ${startPage > 2 ? '<span>...</span>' : ''}
            `;
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button ${i === currentPage ? 'class="active"' : ''} data-page="${i}">${i}</button>
            `;
        }

        if (endPage < totalPages) {
            paginationHTML += `
                ${endPage < totalPages - 1 ? '<span>...</span>' : ''}
                <button data-page="${totalPages}">${totalPages}</button>
            `;
        }

        paginationHTML += `
            <button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        paginationContainer.innerHTML = paginationHTML;

        // Ajouter les écouteurs d'événements pour les boutons de pagination
        paginationContainer.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', function() {
                if (!this.disabled && this.dataset.page) {
                    const newPage = parseInt(this.dataset.page);
                    const filteredData = filterData();
                    displayPage(newPage, filteredData);
                }
            });
        });

        // Mettre à jour le texte d'information sur les entrées affichées
        const start = (currentPage - 1) * itemsPerPage + 1;
        const end = Math.min(currentPage * itemsPerPage, totalItems);
        document.querySelector('.table-pagination span').textContent = 
            `Affichage de ${start}-${end} sur ${totalItems} entrées`;
    }
    
    // Fonction pour filtrer les données
    function filterData() {
        const searchTerm = document.getElementById('client-search').value.toLowerCase();
        const selectedSex = document.getElementById('filter-sex').value;
        const selectedStore = document.getElementById('filter-store').value;
        const selectedAge = document.getElementById('filter-age').value;
        
        return data.filter(item => {
            const matchesSearch = (
                item.Client_ID.toString().toLowerCase().includes(searchTerm) ||
                item.Magasin.toLowerCase().includes(searchTerm) ||
                item.Sexe.toLowerCase().includes(searchTerm)
            );
            
            const matchesSex = !selectedSex || item.Sexe === selectedSex;
            const matchesStore = !selectedStore || item.Magasin === selectedStore;
            
            let matchesAge = true;
            if (selectedAge) {
                const age = item.Âge;
                switch(selectedAge) {
                    case '18-24': matchesAge = age >= 18 && age < 25; break;
                    case '25-34': matchesAge = age >= 25 && age < 35; break;
                    case '35-44': matchesAge = age >= 35 && age < 45; break;
                    case '45-54': matchesAge = age >= 45 && age < 55; break;
                    case '55+': matchesAge = age >= 55; break;
                }
            }
            
            return matchesSearch && matchesSex && matchesStore && matchesAge;
        });
    }

    // Ajouter les écouteurs d'événements pour les filtres
    function setupFilterListeners() {
        const filters = ['client-search', 'filter-sex', 'filter-store', 'filter-age'];
        filters.forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) {
                element.addEventListener(filterId === 'client-search' ? 'input' : 'change', () => {
                    const filteredData = filterData();
                    currentPage = 1;
                    displayPage(1, filteredData);
                });
            }
        });
    }
    
    tableHTML += `
                </tbody>
            </table>
        </div>
        <div class="table-pagination">
            <span>Affichage de ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, data.length)} sur ${data.length} entrées</span>
            <div class="pagination-controls"></div>
        </div>
    `;
    
    // Assembler le tout et initialiser
    tableContainer.innerHTML = searchHTML + tableHTML;
    setupFilterListeners();
    displayPage(1, data);
    
    // Écouteur pour les boutons de détails
    document.getElementById('client-data-body').addEventListener('click', function(e) {
        if (e.target.classList.contains('details-btn')) {
            const ticketId = e.target.getAttribute('data-ticket');
            const ticketData = data.find(item => item.Ticket_ID === ticketId);
            
            if (ticketData) {
                showTicketDetails(ticketData);
            }
        }
    });
}

// Fonction pour afficher les détails d'un ticket
function showTicketDetails(ticketData) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Détails du ticket #${ticketData.Ticket_ID}</h2>
            <div class="ticket-details">
                <p><strong>Client:</strong> ${ticketData.Client_ID}</p>
                <p><strong>Date:</strong> ${ticketData.Jour_Achat} à ${ticketData.Heure_Achat}</p>
                <p><strong>Magasin:</strong> ${ticketData.Magasin}</p>
                <h3>Produits:</h3>
                <ul>
                    ${ticketData.Produits.map(product => `
                        <li>${product.Nom_Produit} - Quantité: ${product.Quantité}</li>
                    `).join('')}
                </ul>
                <p class="total"><strong>Total:</strong> ${ticketData['Total_Achat (€)'].toFixed(2)} €</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fermer le modal
    modal.querySelector('.close').addEventListener('click', function() {
        modal.remove();
    });
    
    // Fermer le modal en cliquant en dehors
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Fonction pour mettre à jour les statistiques du dashboard avec les données réelles
function updateDashboardStats(data) {
    // Calculer les totaux
    const totalSales = data.reduce((sum, item) => sum + (item['Total_Achat (€)'] || 0), 0);
    const uniqueClients = [...new Set(data.map(item => item.Client_ID))].length;
    const totalProducts = data.reduce((sum, item) => sum + (item.Nombre_Produits || 0), 0);
    const uniqueStores = [...new Set(data.map(item => item.Magasin))].length;
    
    // Mettre à jour les éléments du DOM
    const statCards = document.querySelectorAll('.stat-card');
    
    // Ventes totales
    if (statCards[0]) {
        statCards[0].querySelector('h2').textContent = `€${totalSales.toFixed(2)}`;
    }
    
    // Clients
    if (statCards[1]) {
        statCards[1].querySelector('h2').textContent = uniqueClients;
    }
    
    // Produits scannés
    if (statCards[2]) {
        statCards[2].querySelector('h2').textContent = totalProducts;
    }
    
    // Magasins
    if (statCards[3]) {
        statCards[3].querySelector('h2').textContent = uniqueStores;
    }
}

// Gestion de la barre latérale pour les appareils mobiles
document.addEventListener('DOMContentLoaded', function() {
    const mobileToggle = document.querySelector('.mobile-toggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('active');
        });
    }
    
    // Fermer la barre latérale lors d'un clic à l'extérieur
    document.addEventListener('click', function(event) {
        const sidebar = document.querySelector('.sidebar');
        const toggle = document.querySelector('.mobile-toggle');
        
        if (sidebar && toggle) {
            if (!sidebar.contains(event.target) && !toggle.contains(event.target) && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        }
    });
});

// Fonction pour initialiser le graphique de tendance horaire
function initHourlyTrendChart(data) {
    const ctx = document.getElementById('hourlyTrendChart').getContext('2d');
    
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(200, 200, 200, 0.1)'
                },
                ticks: {
                    font: {
                        family: 'Poppins',
                        size: 11
                    }
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        family: 'Poppins',
                        size: 11
                    }
                }
            }
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    boxWidth: 12,
                    font: {
                        family: 'Poppins'
                    }
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                titleFont: {
                    family: 'Poppins',
                    size: 12
                },
                bodyFont: {
                    family: 'Poppins',
                    size: 12
                }
            }
        }
    };
    
    window.hourlyTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Ventes par heure',
                data: [],
                backgroundColor: 'rgba(77, 119, 255, 0.2)',
                borderColor: '#4D77FF',
                borderWidth: 2,
                pointBackgroundColor: '#4D77FF',
                pointRadius: 0,
                pointHoverRadius: 4,
                tension: 0.4
            }]
        },
        options: options
    });
    
    // Initialiser avec les données d'aujourd'hui (par défaut)
    updateHourlyTrendChart(data, 'today');
}

// Fonction pour mettre à jour le graphique de tendance horaire
function updateHourlyTrendChart(data, period) {
    // Filtrer les données selon la période
    let filteredData = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch(period) {
        case 'today':
            // Filtrer pour aujourd'hui
            filteredData = data.filter(item => {
                const itemDate = new Date(item['Jour_Achat']);
                itemDate.setHours(0, 0, 0, 0);
                return itemDate.getTime() === today.getTime();
            });
            break;
            
        case 'yesterday':
            // Filtrer pour hier
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            filteredData = data.filter(item => {
                const itemDate = new Date(item['Jour_Achat']);
                itemDate.setHours(0, 0, 0, 0);
                return itemDate.getTime() === yesterday.getTime();
            });
            break;
            
        case 'lastWeek':
            // Filtrer pour la semaine dernière
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);
            filteredData = data.filter(item => {
                const itemDate = new Date(item['Jour_Achat']);
                return itemDate >= lastWeek && itemDate < today;
            });
            break;
    }
    
    // Agréger les ventes par heure
    const salesByHour = Array(24).fill(0);
    
    filteredData.forEach(item => {
        const hour = parseInt(item['Heure_Achat'].split(':')[0], 10);
        salesByHour[hour] += item['Total_Achat (€)'] || 0;
    });
    
    // Préparer les labels pour les heures
    const labels = Array.from({length: 24}, (_, i) => `${i}h`);
    
    // Mettre à jour le graphique
    window.hourlyTrendChart.data.labels = labels;
    window.hourlyTrendChart.data.datasets[0].data = salesByHour;
    window.hourlyTrendChart.update();
}

// Fonction pour initialiser la carte thermique des ventes
function initSalesHeatmapChart(data) {
    const ctx = document.getElementById('salesHeatmapChart').getContext('2d');
    
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(200, 200, 200, 0.1)'
                },
                ticks: {
                    font: {
                        family: 'Poppins',
                        size: 11
                    }
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        family: 'Poppins',
                        size: 11
                    }
                }
            }
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    boxWidth: 12,
                    font: {
                        family: 'Poppins'
                    }
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `Ventes: €${context.raw.toFixed(2)}`;
                    }
                },
                titleFont: {
                    family: 'Poppins',
                    size: 12
                },
                bodyFont: {
                    family: 'Poppins',
                    size: 12
                }
            }
        }
    };
    
    window.salesHeatmapChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Distribution des ventes',
                data: [],
                backgroundColor: 'rgba(255, 99, 132, 0.7)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: options
    });
    
    // Initialiser avec les données par jour (par défaut)
    updateSalesHeatmapChart(data, 'day');
}

// Fonction pour mettre à jour la carte thermique des ventes
function updateSalesHeatmapChart(data, type) {
    let labels = [];
    let salesData = [];
    
    if (type === 'day') {
        // Regrouper par jour de la semaine
        const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        const salesByDay = Array(7).fill(0);
        
        data.forEach(item => {
            const date = new Date(item['Jour_Achat']);
            const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1; // Ajuster pour que lundi soit 0
            salesByDay[dayIndex] += item['Total_Achat (€)'] || 0;
        });
        
        labels = daysOfWeek;
        salesData = salesByDay;
    } else if (type === 'hour') {
        // Regrouper par heure de la journée
        const salesByHour = Array(24).fill(0);
        
        data.forEach(item => {
            const hour = parseInt(item['Heure_Achat'].split(':')[0], 10);
            salesByHour[hour] += item['Total_Achat (€)'] || 0;
        });
        
        labels = Array.from({length: 24}, (_, i) => `${i}h`);
        salesData = salesByHour;
    }
    
    // Mettre à jour le graphique
    window.salesHeatmapChart.data.labels = labels;
    window.salesHeatmapChart.data.datasets[0].data = salesData;
    window.salesHeatmapChart.update();
}

// Fonction pour initialiser le graphique d'analyse des paniers
function initBasketAnalysisChart(data) {
    const ctx = document.getElementById('basketAnalysisChart').getContext('2d');
    
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: {
                        family: 'Poppins'
                    }
                }
            },
            tooltip: {
                titleFont: {
                    family: 'Poppins',
                    size: 12
                },
                bodyFont: {
                    family: 'Poppins',
                    size: 12
                }
            }
        }
    };
    
    window.basketAnalysisChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)',
                    'rgba(255, 99, 132, 0.7)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: options
    });
    
    // Initialiser avec les données de taille du panier (par défaut)
    updateBasketAnalysisChart(data, 'size');
}

// Fonction pour mettre à jour le graphique d'analyse des paniers
function updateBasketAnalysisChart(data, type) {
    if (type === 'size') {
        // Analyser la taille des paniers
        const basketSizes = {
            'Petit (1-2 articles)': 0,
            'Moyen (3-5 articles)': 0,
            'Grand (6-9 articles)': 0,
            'Très grand (10+ articles)': 0
        };
        
        data.forEach(item => {
            const products = item.Nombre_Produits || 0;
            if (products <= 2) {
                basketSizes['Petit (1-2 articles)']++;
            } else if (products <= 5) {
                basketSizes['Moyen (3-5 articles)']++;
            } else if (products <= 9) {
                basketSizes['Grand (6-9 articles)']++;
            } else {
                basketSizes['Très grand (10+ articles)']++;
            }
        });
        
        // Mettre à jour le graphique
        window.basketAnalysisChart.data.labels = Object.keys(basketSizes);
        window.basketAnalysisChart.data.datasets[0].data = Object.values(basketSizes);
    } else if (type === 'composition') {
        // Analyser la composition des paniers (catégories les plus fréquentes)
        const categoryCount = {};
        
        data.forEach(item => {
            if (item.Produits && Array.isArray(item.Produits)) {
                item.Produits.forEach(product => {
                    if (product.Categorie) {
                        if (!categoryCount[product.Categorie]) {
                            categoryCount[product.Categorie] = 0;
                        }
                        categoryCount[product.Categorie]++;
                    }
                });
            }
        });
        
        // Trier et limiter aux 5 catégories les plus populaires
        const sortedCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        // Mettre à jour le graphique
        window.basketAnalysisChart.data.labels = sortedCategories.map(item => item[0]);
        window.basketAnalysisChart.data.datasets[0].data = sortedCategories.map(item => item[1]);
    }
    
    window.basketAnalysisChart.update();
}

// Fonction pour initialiser le graphique de performance par catégorie
function initCategoryPerformanceChart(data) {
    const ctx = document.getElementById('categoryPerformanceChart').getContext('2d');
    
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
            x: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(200, 200, 200, 0.1)'
                },
                ticks: {
                    font: {
                        family: 'Poppins',
                        size: 11
                    }
                }
            },
            y: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        family: 'Poppins',
                        size: 11
                    }
                }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                titleFont: {
                    family: 'Poppins',
                    size: 12
                },
                bodyFont: {
                    family: 'Poppins',
                    size: 12
                }
            }
        }
    };
    
    window.categoryPerformanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Performance',
                data: [],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: options
    });
    
    // Initialiser avec les données de chiffre d'affaires (par défaut)
    updateCategoryPerformanceChart(data, 'revenue');
}

// Fonction pour mettre à jour le graphique de performance par catégorie
function updateCategoryPerformanceChart(data, type) {
    // Calculer la performance par catégorie
    const categoryPerformance = {};
    
    data.forEach(item => {
        if (item.Produits && Array.isArray(item.Produits)) {
            item.Produits.forEach(product => {
                if (product.Categorie) {
                    if (!categoryPerformance[product.Categorie]) {
                        categoryPerformance[product.Categorie] = {
                            revenue: 0,
                            units: 0
                        };
                    }
                    
                    categoryPerformance[product.Categorie].revenue += 
                        (product.Prix_Unitaire || 0) * (product.Quantité || 0);
                    categoryPerformance[product.Categorie].units += (product.Quantité || 0);
                }
            });
        }
    });
    
    // Trier selon le type de performance
    const sortedCategories = Object.entries(categoryPerformance)
        .sort((a, b) => {
            if (type === 'revenue') {
                return b[1].revenue - a[1].revenue;
            } else {
                return b[1].units - a[1].units;
            }
        })
        .slice(0, 5); // Limiter aux 5 meilleures catégories
    
    // Mettre à jour le graphique
    window.categoryPerformanceChart.data.labels = sortedCategories.map(item => item[0]);
    window.categoryPerformanceChart.data.datasets[0].data = sortedCategories.map(item => 
        type === 'revenue' ? item[1].revenue : item[1].units
    );
    window.categoryPerformanceChart.options.scales.x.title = {
        display: true,
        text: type === 'revenue' ? 'Chiffre d\'affaires (€)' : 'Unités vendues',
        font: {
            family: 'Poppins'
        }
    };
    window.categoryPerformanceChart.update();
}

// Fonction pour initialiser le programme de fidélité
function initLoyaltyProgram(data) {
    // Initialiser les graphiques du programme de fidélité
    initLoyaltyPointsChart(data);
    initLoyaltyConversionChart(data);
    
    // Afficher le tableau des clients avec leurs points
    displayLoyaltyTable(data);
}

// Fonction pour initialiser le graphique de distribution des points
function initLoyaltyPointsChart(data) {
    const ctx = document.getElementById('loyaltyPointsChart');
    if (!ctx) return;
    
    // Calculer les points de fidélité pour chaque client
    const loyaltyPoints = calculateLoyaltyPoints(data);
    
    // Créer des catégories de points (0-500, 501-1000, 1001-2000, 2001+)
    const pointCategories = {
        '0-500': 0,
        '501-1000': 0,
        '1001-2000': 0,
        '2001+': 0
    };
    
    // Classer les clients selon leurs points
    Object.values(loyaltyPoints).forEach(points => {
        if (points <= 500) {
            pointCategories['0-500']++;
        } else if (points <= 1000) {
            pointCategories['501-1000']++;
        } else if (points <= 2000) {
            pointCategories['1001-2000']++;
        } else {
            pointCategories['2001+']++;
        }
    });
    
    // Créer le graphique
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(pointCategories),
            datasets: [{
                data: Object.values(pointCategories),
                backgroundColor: [
                    'rgba(255, 87, 87, 0.7)',
                    'rgba(255, 193, 7, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(117, 188, 141, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 87, 87, 1)',
                    'rgba(255, 193, 7, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(117, 188, 141, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        font: {
                            size: 11
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Distribution des clients par points de fidélité',
                    font: {
                        size: 14
                    }
                }
            }
        }
    });
}

// Fonction pour initialiser le graphique de conversion des points
function initLoyaltyConversionChart(data) {
    const ctx = document.getElementById('loyaltyConversionChart');
    if (!ctx) return;
    
    // Données simulées de conversion de points par mois
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const pointsEarned = [4500, 5200, 4800, 5500, 6200, 5800, 6500, 7000, 6800, 7200, 7800, 8500];
    const pointsRedeemed = [1200, 1500, 1800, 2000, 2200, 2500, 2700, 3000, 3200, 3500, 3800, 4000];
    
    // Calculer le taux de conversion (points échangés / points gagnés)
    const conversionRate = pointsRedeemed.map((redeemed, index) => {
        if (pointsEarned[index] === 0) return 0;
        return parseFloat((redeemed / pointsEarned[index] * 100).toFixed(1));
    });
    
    // Créer le graphique
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Points gagnés',
                    data: pointsEarned,
                    backgroundColor: 'rgba(117, 188, 141, 0.2)',
                    borderColor: 'rgba(117, 188, 141, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Points échangés',
                    data: pointsRedeemed,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Taux de conversion (%)',
                    data: conversionRate,
                    backgroundColor: 'rgba(255, 159, 64, 0)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    borderDash: [5, 5],
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Points'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Taux de conversion (%)'
                    },
                    min: 0,
                    max: 100,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Fonction pour calculer les points de fidélité pour chaque client
function calculateLoyaltyPoints(data) {
    const clientPoints = {};
    
    // Parcourir les données d'achat
    data.forEach(purchase => {
        const clientID = purchase.Client_ID;
        const totalAmount = purchase.Montant_Total;
        
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
    
    return clientPoints;
}

// Fonction pour afficher le tableau des clients avec leurs points de fidélité
function displayLoyaltyTable(data) {
    const loyaltyTableContainer = document.getElementById('loyalty-table');
    if (!loyaltyTableContainer) return;
    
    // Calculer les points de fidélité pour chaque client
    const loyaltyPoints = calculateLoyaltyPoints(data);
    
    // Créer un tableau des clients avec leurs points
    const clientsData = [];
    data.forEach(purchase => {
        // Vérifier si le client existe déjà dans le tableau
        const existingClient = clientsData.find(client => client.id === purchase.Client_ID);
        
        if (!existingClient) {
            clientsData.push({
                id: purchase.Client_ID,
                nom: purchase.Nom_Client || 'Client ' + purchase.Client_ID,
                email: purchase.Email_Client || '-',
                points: loyaltyPoints[purchase.Client_ID] || 0,
                dernierAchat: purchase.Jour_Achat,
                statut: 'Actif' // Par défaut, tous les clients sont actifs
            });
        } else {
            // Mettre à jour la date du dernier achat si celle-ci est plus récente
            const currentDate = new Date(existingClient.dernierAchat);
            const newDate = new Date(purchase.Jour_Achat);
            if (newDate > currentDate) {
                existingClient.dernierAchat = purchase.Jour_Achat;
            }
        }
    });
    
    // Trier les clients par nombre de points (décroissant)
    clientsData.sort((a, b) => b.points - a.points);
    
    // Créer le tableau HTML
    let tableHTML = `
        <table class="loyalty-table">
            <thead>
                <tr>
                    <th>Client</th>
                    <th>Email</th>
                    <th>Points</th>
                    <th>Dernier Achat</th>
                    <th>Statut</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Ajouter chaque client au tableau
    clientsData.forEach(client => {
        // Déterminer la classe CSS pour l'indicateur de points
        let pointsClass = '';
        if (client.points >= 1000) {
            pointsClass = 'points-high';
        } else if (client.points >= 500) {
            pointsClass = 'points-medium';
        } else {
            pointsClass = 'points-low';
        }
        
        // Formater la date du dernier achat
        const lastPurchaseDate = new Date(client.dernierAchat);
        const formattedDate = lastPurchaseDate.toLocaleDateString('fr-FR');
        
        // Ajouter la ligne au tableau
        tableHTML += `
            <tr>
                <td>${client.nom}</td>
                <td>${client.email}</td>
                <td><span class="points-indicator ${pointsClass}">${client.points}</span></td>
                <td>${formattedDate}</td>
                <td>
                    <div class="point-status">
                        <span class="status-icon status-active"></span>
                        ${client.statut}
                    </div>
                </td>
                <td>
                    <button class="btn btn-small btn-outline" onclick="showClientDetails(${client.id})">
                        <i class="fas fa-eye"></i> Détails
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    // Injecter le tableau dans le conteneur
    loyaltyTableContainer.innerHTML = tableHTML;
}

// Fonction pour afficher les détails d'un client (à implémenter plus tard)
function showClientDetails(clientId) {
    console.log(`Affichage des détails du client ${clientId}`);
    // Cette fonction serait implémentée pour afficher un modal avec les détails complets du client
    alert(`Les détails du client ID: ${clientId} seront affichés ici.`);
}

// Fonction pour charger les données de fidélité
function loadLoyaltyData(purchaseData) {
    console.log('Chargement des données de fidélité...');
    fetch('/api/loyalty')
        .then(response => {
            if (!response.ok) {
                console.error('Server responded with status:', response.status);
                throw new Error(`Erreur serveur: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(loyaltyData => {
            console.log('Données de fidélité chargées avec succès, entrées:', loyaltyData.length);
            // Stocker les données globalement
            globalLoyaltyData = loyaltyData;
            // Initialiser le programme de fidélité avec les données
            initLoyaltyProgram(purchaseData, loyaltyData);
        })
        .catch(error => {
            console.error('Erreur lors du chargement des données de fidélité:', error);
            const loyaltyContainers = document.querySelectorAll('#loyalty-table, #loyaltyPointsChart, #loyaltyConversionChart');
            
            loyaltyContainers.forEach(container => {
                if (container) {
                    container.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Impossible de charger les données de fidélité: ${error.message}</p>
                        </div>
                    `;
                }
            });
            
            // Essayer d'initialiser avec des données calculées directement
            initLoyaltyProgram(purchaseData);
        });
}

// Fonction mise à jour pour initialiser le programme de fidélité
function initLoyaltyProgram(purchaseData, loyaltyData) {
    // Si des données de fidélité sont disponibles, utiliser ces données
    if (loyaltyData) {
        console.log('Initialisation du programme de fidélité avec données complètes');
        // Mettre à jour les statistiques de fidélité
        updateLoyaltyStats(loyaltyData);
        
        // Initialiser les graphiques de fidélité
        initLoyaltyPointsChartWithData(loyaltyData);
        initLoyaltyConversionChartWithData(loyaltyData);
        
        // Afficher le tableau des clients
        displayLoyaltyTableWithData(loyaltyData);
    } else {
        console.log('Initialisation du programme de fidélité avec calcul direct');
        // Utiliser la méthode originale qui calcule à partir des données d'achat
        initLoyaltyPointsChart(purchaseData);
        initLoyaltyConversionChart(purchaseData);
        displayLoyaltyTable(purchaseData);
    }
}

// Fonction pour mettre à jour les statistiques de fidélité
function updateLoyaltyStats(loyaltyData) {
    // Calculer les totaux
    const totalPoints = loyaltyData.reduce((sum, client) => sum + client.points_cumules, 0);
    const pointsRedeemed = loyaltyData.reduce((sum, client) => sum + client.points_utilises, 0);
    const activeClients = loyaltyData.filter(client => client.est_actif).length;
    const totalRewards = loyaltyData.reduce((sum, client) => sum + client.recompenses_utilisees.length, 0);
    
    // Mettre à jour les cartes de statistiques
    const loyaltyStatsCards = document.querySelectorAll('#loyalty-section .stat-card');
    
    // Points distribués
    if (loyaltyStatsCards[0]) {
        loyaltyStatsCards[0].querySelector('h2').textContent = totalPoints.toLocaleString();
    }
    
    // Points échangés
    if (loyaltyStatsCards[1]) {
        loyaltyStatsCards[1].querySelector('h2').textContent = pointsRedeemed.toLocaleString();
    }
    
    // Clients fidèles
    if (loyaltyStatsCards[2]) {
        loyaltyStatsCards[2].querySelector('h2').textContent = activeClients.toLocaleString();
    }
    
    // Nombre de récompenses
    if (loyaltyStatsCards[3]) {
        loyaltyStatsCards[3].querySelector('h2').textContent = totalRewards.toLocaleString();
    }
}

// Fonction pour initialiser le graphique de distribution des points avec données complètes
function initLoyaltyPointsChartWithData(loyaltyData) {
    const ctx = document.getElementById('loyaltyPointsChart');
    if (!ctx) return;
    
    // Créer des catégories de points (0-500, 501-1000, 1001-2000, 2001+)
    const pointCategories = {
        '0-500': 0,
        '501-1000': 0,
        '1001-2000': 0,
        '2001+': 0
    };
    
    // Classer les clients selon leurs points
    loyaltyData.forEach(client => {
        const points = client.points_actuels;
        if (points <= 500) {
            pointCategories['0-500']++;
        } else if (points <= 1000) {
            pointCategories['501-1000']++;
        } else if (points <= 2000) {
            pointCategories['1001-2000']++;
        } else {
            pointCategories['2001+']++;
        }
    });
    
    // Créer le graphique
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(pointCategories),
            datasets: [{
                data: Object.values(pointCategories),
                backgroundColor: [
                    'rgba(255, 87, 87, 0.7)',
                    'rgba(255, 193, 7, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(117, 188, 141, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 87, 87, 1)',
                    'rgba(255, 193, 7, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(117, 188, 141, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        font: {
                            size: 11
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Distribution des clients par points de fidélité',
                    font: {
                        size: 14
                    }
                }
            }
        }
    });
}

// Fonction pour initialiser le graphique de conversion avec données complètes
function initLoyaltyConversionChartWithData(loyaltyData) {
    const ctx = document.getElementById('loyaltyConversionChart');
    if (!ctx) return;
    
    // Analyser l'historique des points pour créer des données mensuelles
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentYear = new Date().getFullYear();
    
    // Initialiser les compteurs mensuels
    const monthlyPointsEarned = Array(12).fill(0);
    const monthlyPointsRedeemed = Array(12).fill(0);
    
    // Parcourir tous les clients
    loyaltyData.forEach(client => {
        // Parcourir l'historique des points de chaque client
        client.historique_points.forEach(entry => {
            const entryDate = new Date(entry.date);
            
            // Ne considérer que les entrées de l'année en cours
            if (entryDate.getFullYear() === currentYear) {
                const monthIndex = entryDate.getMonth();
                
                if (entry.type === 'gain') {
                    monthlyPointsEarned[monthIndex] += entry.points;
                } else if (entry.type === 'depense') {
                    monthlyPointsRedeemed[monthIndex] += Math.abs(entry.points);
                }
            }
        });
    });
    
    // Calculer le taux de conversion (points échangés / points gagnés)
    const conversionRate = monthlyPointsRedeemed.map((redeemed, index) => {
        if (monthlyPointsEarned[index] === 0) return 0;
        return parseFloat((redeemed / monthlyPointsEarned[index] * 100).toFixed(1));
    });
    
    // Créer le graphique
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Points gagnés',
                    data: monthlyPointsEarned,
                    backgroundColor: 'rgba(117, 188, 141, 0.2)',
                    borderColor: 'rgba(117, 188, 141, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Points échangés',
                    data: monthlyPointsRedeemed,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Taux de conversion (%)',
                    data: conversionRate,
                    backgroundColor: 'rgba(255, 159, 64, 0)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    borderDash: [5, 5],
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Points'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Taux de conversion (%)'
                    },
                    min: 0,
                    max: 100,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Fonction pour afficher le tableau des clients avec données complètes
function displayLoyaltyTableWithData(loyaltyData) {
    const loyaltyTableContainer = document.getElementById('loyalty-table');
    if (!loyaltyTableContainer) return;
    
    // Trier les clients par nombre de points (décroissant)
    const sortedClients = [...loyaltyData].sort((a, b) => b.points_actuels - a.points_actuels);
    
    // Créer le tableau HTML
    let tableHTML = `
        <table class="loyalty-table">
            <thead>
                <tr>
                    <th>Client</th>
                    <th>Email</th>
                    <th>Points</th>
                    <th>Dernier Achat</th>
                    <th>Statut</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Ajouter chaque client au tableau
    sortedClients.forEach(client => {
        // Déterminer la classe CSS pour l'indicateur de points
        let pointsClass = '';
        if (client.points_actuels >= 1000) {
            pointsClass = 'points-high';
        } else if (client.points_actuels >= 500) {
            pointsClass = 'points-medium';
        } else {
            pointsClass = 'points-low';
        }
        
        // Formater la date du dernier achat
        const lastPurchaseDate = new Date(client.dernier_achat);
        const formattedDate = lastPurchaseDate.toLocaleDateString('fr-FR');
        
        // Déterminer la classe du statut
        const statusClass = client.est_actif ? 'status-active' : 'status-expired';
        
        // Ajouter la ligne au tableau
        tableHTML += `
            <tr>
                <td>${client.nom}</td>
                <td>${client.email}</td>
                <td><span class="points-indicator ${pointsClass}">${client.points_actuels}</span></td>
                <td>${formattedDate}</td>
                <td>
                    <div class="point-status">
                        <span class="status-icon ${statusClass}"></span>
                        ${client.est_actif ? 'Actif' : 'Inactif'}
                    </div>
                </td>
                <td>
                    <button class="btn btn-small btn-outline" onclick="showClientLoyaltyDetails('${client.client_id}')">
                        <i class="fas fa-eye"></i> Détails
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    // Injecter le tableau dans le conteneur
    loyaltyTableContainer.innerHTML = tableHTML;
}

// Fonction pour afficher les détails d'un client du programme de fidélité
function showClientLoyaltyDetails(clientId) {
    console.log(`Affichage des détails de fidélité du client ${clientId}`);
    
    // Chercher les données du client
    const client = globalLoyaltyData.find(c => c.client_id === clientId);
    
    if (!client) {
        alert(`Aucune information trouvée pour le client ID: ${clientId}`);
        return;
    }
    
    // Créer le contenu HTML du modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    const recompensesHTML = client.recompenses_utilisees.length > 0 
        ? client.recompenses_utilisees.map(r => `
            <li>
                <strong>${r.nom}</strong> - ${r.cout} points 
                <span class="small text-muted">(utilisée le ${new Date(r.date_utilisation).toLocaleDateString('fr-FR')})</span>
            </li>
        `).join('')
        : '<li>Aucune récompense utilisée</li>';
    
    const historiqueHTML = client.historique_points
        .slice(0, 5) // Limiter à 5 entrées récentes
        .map(h => {
            const typeClass = h.type === 'gain' ? 'text-success' : 'text-danger';
            const sign = h.type === 'gain' ? '+' : '';
            return `
                <li>
                    <span class="${typeClass}">${sign}${h.points} points</span> - 
                    ${h.description}
                    <span class="small text-muted">(${new Date(h.date).toLocaleDateString('fr-FR')})</span>
                </li>
            `;
        }).join('');
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <span class="close">&times;</span>
            <h2>Détails du programme de fidélité</h2>
            <div class="client-info">
                <h3>${client.nom} (ID: ${client.client_id})</h3>
                <p><strong>Email:</strong> ${client.email}</p>
                <p><strong>Statut:</strong> <span class="badge ${client.est_actif ? 'badge-success' : 'badge-danger'}">${client.statut} (${client.est_actif ? 'Actif' : 'Inactif'})</span></p>
                <p><strong>Date d'inscription:</strong> ${new Date(client.date_inscription).toLocaleDateString('fr-FR')}</p>
                <p><strong>Dernier achat:</strong> ${new Date(client.dernier_achat).toLocaleDateString('fr-FR')}</p>
                
                <div class="points-summary">
                    <div class="point-stat">
                        <h4>${client.points_actuels}</h4>
                        <p>Points actuels</p>
                    </div>
                    <div class="point-stat">
                        <h4>${client.points_cumules}</h4>
                        <p>Points cumulés</p>
                    </div>
                    <div class="point-stat">
                        <h4>${client.points_utilises}</h4>
                        <p>Points utilisés</p>
                    </div>
                </div>
                
                <h4>Récompenses utilisées</h4>
                <ul class="rewards-list">
                    ${recompensesHTML}
                </ul>
                
                <h4>Historique récent</h4>
                <ul class="history-list">
                    ${historiqueHTML}
                </ul>
                
                <button class="btn btn-primary view-all-history">Voir tout l'historique</button>
            </div>
        </div>
    `;
    
    // Ajouter le modal au document
    document.body.appendChild(modal);
    
    // Fermer le modal
    modal.querySelector('.close').addEventListener('click', function() {
        modal.remove();
    });
    
    // Fermer le modal en cliquant en dehors
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Gestion du bouton "Voir tout l'historique"
    modal.querySelector('.view-all-history').addEventListener('click', function() {
        const historiqueComplet = client.historique_points.map(h => {
            const typeClass = h.type === 'gain' ? 'text-success' : 'text-danger';
            const sign = h.type === 'gain' ? '+' : '';
            return `
                <li>
                    <span class="${typeClass}">${sign}${h.points} points</span> - 
                    ${h.description}
                    <span class="small text-muted">(${new Date(h.date).toLocaleDateString('fr-FR')})</span>
                </li>
            `;
        }).join('');
        
        modal.querySelector('.history-list').innerHTML = historiqueComplet;
        this.style.display = 'none';
    });
}

// Fonction pour filtrer les données par plage de dates
function filterDataByDateRange(data, startDate, endDate) {
    // S'assurer que endDate inclut la fin de la journée
    endDate = new Date(endDate);
    endDate.setHours(23, 59, 59, 999);
    
    console.log(`Filtrage des données du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}`);
    
    // Afficher visuellement la plage de dates sélectionnée
    const dateRangeDisplay = document.querySelector('.date-filter span');
    if (!dateRangeDisplay) {
        // Créer un élément span pour afficher la plage de dates si non existant
        const dateFilter = document.querySelector('.date-filter');
        if (dateFilter) {
            const span = document.createElement('span');
            span.classList.add('selected-date-range');
            span.style.marginLeft = '10px';
            span.style.fontSize = '0.9rem';
            span.style.color = 'var(--primary-color)';
            dateFilter.appendChild(span);
        }
    }
    
    // Mettre à jour le texte de la plage de dates
    const selectedDateDisplay = document.querySelector('.date-filter .selected-date-range');
    if (selectedDateDisplay) {
        selectedDateDisplay.textContent = `${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`;
    }
    
    const filteredResult = data.filter(item => {
        // Déterminer quel champ de date utiliser (certaines données peuvent utiliser 'date' ou 'date_achat')
        const dateField = item.date_achat ? 'date_achat' : (item.date ? 'date' : null);
        
        if (!dateField) {
            console.warn('Item sans champ de date trouvé:', item);
            return false; // Exclure les éléments sans date
        }
        
        let itemDate;
        try {
            itemDate = new Date(item[dateField]);
            
            // Vérifier si la date est valide
            if (isNaN(itemDate.getTime())) {
                console.warn('Date invalide trouvée:', item[dateField], item);
                return false;
            }
            
            return itemDate >= startDate && itemDate <= endDate;
        } catch (error) {
            console.error('Erreur lors du traitement de la date:', error, item);
            return false;
        }
    });
    
    console.log(`Données filtrées: ${filteredResult.length} éléments sur ${data.length} (${Math.round(filteredResult.length / data.length * 100)}%)`);
    
    return filteredResult;
}

// Fonction pour mettre à jour toutes les visualisations avec de nouvelles données
function updateAllVisualizations(filteredData) {
    // Montrer un indicateur de chargement
    showLoadingIndicator();
    
    // Utiliser setTimeout pour permettre à l'indicateur de chargement de s'afficher
    setTimeout(() => {
        try {
            // Mettre à jour les statistiques du tableau de bord
            updateDashboardStats(filteredData);
            
            // Mettre à jour tous les graphiques
            updateSalesChart(filteredData, currentPeriod.sales);
            updateHourlyTrendChart(filteredData, document.getElementById('hourly-trend-select')?.value || 'today');
            updateSalesHeatmapChart(filteredData, document.getElementById('heatmap-select')?.value || 'day');
            updateBasketAnalysisChart(filteredData, document.getElementById('basket-analysis-select')?.value || 'size');
            updateCategoryPerformanceChart(filteredData, document.getElementById('category-performance-select')?.value || 'revenue');
            
            // Mettre à jour les top produits et magasins
            displayTopProducts(filteredData, currentPeriod.products);
            displayTopStores(filteredData, currentPeriod.stores);
            
            // Mettre à jour le tableau de données clients
            displayClientData(filteredData);
            
            console.log('Toutes les visualisations ont été mises à jour avec succès.');
        } catch (error) {
            console.error('Erreur lors de la mise à jour des visualisations:', error);
        } finally {
            // Cacher l'indicateur de chargement
            hideLoadingIndicator();
        }
    }, 50);
}

// Fonction pour afficher l'indicateur de chargement
function showLoadingIndicator() {
    // Vérifier si l'indicateur existe déjà
    let loadingIndicator = document.getElementById('loading-overlay');
    
    if (!loadingIndicator) {
        // Créer l'indicateur de chargement
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loading-overlay';
        loadingIndicator.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>Mise à jour des données...</p>
            </div>
        `;
        
        // Ajouter des styles inline pour l'indicateur
        loadingIndicator.style.position = 'fixed';
        loadingIndicator.style.top = '0';
        loadingIndicator.style.left = '0';
        loadingIndicator.style.width = '100%';
        loadingIndicator.style.height = '100%';
        loadingIndicator.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        loadingIndicator.style.display = 'flex';
        loadingIndicator.style.justifyContent = 'center';
        loadingIndicator.style.alignItems = 'center';
        loadingIndicator.style.zIndex = '9999';
        
        // Ajouter des styles pour le contenu
        const style = document.createElement('style');
        style.textContent = `
            .loading-content {
                text-align: center;
                padding: 20px;
                background-color: white;
                border-radius: 10px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            }
            .spinner {
                border: 5px solid rgba(0, 0, 0, 0.1);
                border-top-color: var(--primary-color, #4361ee);
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 15px;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(loadingIndicator);
    } else {
        // Si l'indicateur existe déjà, assurez-vous qu'il est visible
        loadingIndicator.style.display = 'flex';
    }
}

// Fonction pour cacher l'indicateur de chargement
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-overlay');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
} 