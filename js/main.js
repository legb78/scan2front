// Attendre que le DOM soit complètement chargé
document.addEventListener('DOMContentLoaded', function() {
    // Animation pour les éléments apparaissant à l'écran
    const animElements = document.querySelectorAll('.anim-element');
    
    // Observer les éléments et déclencher une animation quand ils sont visibles
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });
    
    animElements.forEach(element => {
        observer.observe(element);
    });
    
    // Ajouter un comportement dynamique pour les boutons
    const buttons = document.querySelectorAll('.action-button');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (this.form && !this.form.checkValidity()) {
                // Ne pas ajouter l'animation si le formulaire n'est pas valide
                return;
            }
            
            this.classList.add('clicked');
            setTimeout(() => this.classList.remove('clicked'), 300);
        });
    });
    
    // Validation des formulaires
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!this.checkValidity()) {
                e.preventDefault();
                // Afficher les messages de validation
                this.classList.add('show-validation');
            }
        });
    });

    // Animations pour les champs de formulaire
    const formInputs = document.querySelectorAll('input, textarea, select');
    formInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
        
        // Initialiser les champs déjà remplis
        if (input.value) {
            input.parentElement.classList.add('focused');
        }
    });
    
    // Mode sombre/clair
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        });
        
        // Appliquer le thème précédemment sélectionné
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
        }
    }

    // Gestion du formulaire de connexion
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        // Effets visuels sur les champs de formulaire
        const inputs = document.querySelectorAll('.interactive-input');
        inputs.forEach(input => {
            // Effet d'activation de l'icône
            input.addEventListener('focus', function() {
                const icon = this.previousElementSibling;
                if (icon && icon.classList.contains('input-icon')) {
                    icon.style.color = '#4a90e2';
                    icon.style.transform = 'translateY(-50%) scale(1.2)';
                }
            });
            
            input.addEventListener('blur', function() {
                const icon = this.previousElementSibling;
                if (icon && icon.classList.contains('input-icon')) {
                    icon.style.color = '#aaa';
                    icon.style.transform = 'translateY(-50%) scale(1)';
                }
            });
        });
        
        // Toggle pour afficher/masquer le mot de passe
        const togglePassword = document.getElementById('toggle-password');
        const passwordInput = document.getElementById('password');
        
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                togglePassword.textContent = type === 'password' ? '👁️' : '��';
            });
        }
    }
    
    // Animation des boutons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseover', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseout', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Vérifier si nous sommes sur la page de connexion
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    // Sélectionner les éléments du formulaire
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');
    const loginButton = document.querySelector('.login-button');

    // Animation des bulles en arrière-plan
    createBubbles();

    // Toggle password visibility
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Changer l'icône
            const icon = this.querySelector('svg');
            if (type === 'text') {
                icon.innerHTML = `
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                `;
            } else {
                icon.innerHTML = `
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                `;
            }
            
            // Animation de clic
            this.classList.add('clicked');
            setTimeout(() => this.classList.remove('clicked'), 300);
        });
    }

    // Validation en temps réel de l'email
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            validateEmail();
        });
    }

    // Validation en temps réel du mot de passe
    if (passwordInput) {
        passwordInput.addEventListener('blur', function() {
            validatePassword();
        });
    }

    // Gérer la soumission du formulaire
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Valider les champs
            const isEmailValid = validateEmail();
            const isPasswordValid = validatePassword();
            
            if (isEmailValid && isPasswordValid) {
                // Simuler l'envoi du formulaire
                loginButton.classList.add('loading');
                
                // Simuler un délai de connexion (à remplacer par votre logique réelle)
                setTimeout(function() {
                    loginButton.classList.remove('loading');
                    
                    // Rediriger vers la page dashboard ou afficher un message de succès
                    window.location.href = 'dashboard.html';
                }, 1500);
            }
        });
    }

    // Fonctions de validation
    function validateEmail() {
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            showError(emailInput, emailError, 'Veuillez entrer votre adresse email');
            return false;
        } else if (!emailRegex.test(email)) {
            showError(emailInput, emailError, 'Veuillez entrer une adresse email valide');
            return false;
        } else {
            hideError(emailInput, emailError);
            return true;
        }
    }

    function validatePassword() {
        const password = passwordInput.value.trim();
        
        if (!password) {
            showError(passwordInput, passwordError, 'Veuillez entrer votre mot de passe');
            return false;
        } else if (password.length < 6) {
            showError(passwordInput, passwordError, 'Le mot de passe doit contenir au moins 6 caractères');
            return false;
        } else {
            hideError(passwordInput, passwordError);
            return true;
        }
    }

    function showError(input, errorElement, message) {
        input.classList.add('error');
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    function hideError(input, errorElement) {
        input.classList.remove('error');
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }

    // Créer des bulles en arrière-plan pour un effet visuel
    function createBubbles() {
        const loginPage = document.querySelector('.login-page');
        if (!loginPage) return;
        
        // Créer l'élément de conteneur de bulles s'il n'existe pas déjà
        let bubblesContainer = document.querySelector('.bubbles-container');
        if (!bubblesContainer) {
            bubblesContainer = document.createElement('div');
            bubblesContainer.classList.add('bubbles-container');
            loginPage.appendChild(bubblesContainer);
            
            // Ajouter les styles
            const style = document.createElement('style');
            style.textContent = `
                .bubbles-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    z-index: -1;
                    pointer-events: none;
                }
                .bubble {
                    position: absolute;
                    bottom: -50px;
                    background-color: rgba(106, 183, 131, 0.1);
                    border-radius: 50%;
                    opacity: 0.5;
                    animation: rise linear infinite;
                }
                @keyframes rise {
                    0% {
                        transform: translateY(0) translateX(0);
                        opacity: 0.2;
                    }
                    50% {
                        opacity: 0.5;
                    }
                    100% {
                        transform: translateY(-100vh) translateX(var(--wander));
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Créer les bulles
        for (let i = 0; i < 15; i++) {
            createBubble(bubblesContainer);
        }
        
        // Créer des nouvelles bulles périodiquement
        setInterval(() => {
            createBubble(bubblesContainer);
        }, 3000);
    }

    function createBubble(container) {
        const bubble = document.createElement('div');
        bubble.classList.add('bubble');
        
        const size = Math.random() * 100 + 20;
        const wander = (Math.random() - 0.5) * 100;
        const duration = Math.random() * 10 + 10;
        const left = Math.random() * 100;
        
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${left}%`;
        bubble.style.setProperty('--wander', `${wander}px`);
        bubble.style.animationDuration = `${duration}s`;
        
        container.appendChild(bubble);
        
        // Supprimer la bulle après la fin de l'animation
        setTimeout(() => {
            bubble.remove();
        }, duration * 1000);
    }

    // Effet de focus sur les inputs
    const inputs = document.querySelectorAll('.interactive-input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('input-focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('input-focused');
        });
    });
}); 