document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const addRecipeBtn = document.getElementById('add-recipe-btn');
    const recipeModal = document.getElementById('recipe-modal');
    const actionModal = document.getElementById('action-modal'); 
    const closeBtns = document.querySelectorAll('.close-btn');
    const addRecipeForm = document.getElementById('add-recipe-form');
    const recipeContainer = document.getElementById('recipe-container');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('recipe-search'); 

    // Modal Form Elements
    const modalTitle = document.getElementById('modal-title');
    const modalSubmitBtn = document.getElementById('modal-submit-btn');
    const recipeIdField = document.getElementById('recipe-id-field');
    const recipeTitleInput = document.getElementById('recipe-title');
    const recipeSummaryInput = document.getElementById('recipe-summary');
    const recipeTimeInput = document.getElementById('recipe-time');
    const recipeCategoryInput = document.getElementById('recipe-category');
    const recipeIngredientsInput = document.getElementById('recipe-ingredients');
    const recipeInstructionsInput = document.getElementById('recipe-instructions');

    // Action Modal Buttons
    const editActionBtn = document.getElementById('edit-recipe-action-btn'); 
    const deleteActionBtn = document.getElementById('delete-recipe-action-btn'); 
    const cancelActionBtn = document.getElementById('cancel-action-btn'); 
    
    // Detailed Modal Elements
    const detailModal = document.getElementById('detail-modal');
    const detailTitle = document.getElementById('detail-title');
    const detailSummary = document.getElementById('detail-summary');
    const detailTime = document.getElementById('detail-time');
    const detailCategory = document.getElementById('detail-category');
    const detailIngredientsContainer = document.getElementById('detail-ingredients');
    const detailInstructionsSteps = document.getElementById('detail-instructions');

    const LOCAL_STORAGE_KEY = 'myModernRecipes';
    let recipes = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
    let currentRecipeId = null; 

    const saveRecipes = () => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(recipes));
        updateEmptyState();
    };

    // --- Modal Functions ---
    
    const openModal = (modalElement) => {
        modalElement.style.display = 'block';
    };

    const closeModal = (modalElement) => {
        modalElement.style.display = 'none';
        if (modalElement.id === 'recipe-modal') {
            addRecipeForm.reset(); 
            recipeIdField.value = '';
        }
        // Remove 'selected' class from all cards when any modal closes
        document.querySelectorAll('.recipe-card.selected').forEach(card => {
            card.classList.remove('selected');
        });
    };

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const modalElement = btn.closest('.modal');
            closeModal(modalElement);
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === recipeModal || event.target === detailModal || event.target === actionModal) {
            closeModal(event.target);
        }
    });

    addRecipeBtn.addEventListener('click', () => {
        modalTitle.textContent = 'Curate a Recipe';
        modalSubmitBtn.textContent = 'Save Recipe';
        openModal(recipeModal);
    });

    // --- Search and Filtering Logic ---
    
    searchInput.addEventListener('input', () => {
        renderRecipes(); 
    });

    const filterRecipes = () => {
        const query = searchInput.value.toLowerCase().trim();
        if (!query) return recipes;

        return recipes.filter(recipe => 
            recipe.title.toLowerCase().includes(query) ||
            recipe.category.toLowerCase().includes(query)
        );
    };

    // --- Recipe Display and Long Press Logic ---

    const updateEmptyState = () => {
        emptyState.style.display = recipes.length === 0 ? 'block' : 'none';
    };

    const createRecipeCard = (recipeData) => {
        const card = document.createElement('div');
        card.classList.add('recipe-card');
        card.setAttribute('data-recipe-id', recipeData.id);

        card.innerHTML = `
            <h3>${recipeData.title}</h3>
            <p class="summary">${recipeData.summary}</p>
            <div class="details">
                <span class="detail-item"><i class="fas fa-clock"></i> ${recipeData.time} min</span>
                <span class="detail-item"><i class="fas fa-utensils"></i> ${recipeData.category}</span>
            </div>
            <button class="view-btn">View Recipe</button>
        `;
        
        // View Button Listener
        card.querySelector('.view-btn').addEventListener('click', (e) => {
            e.stopPropagation(); 
            showRecipeDetails(recipeData.id);
        });

        // Long Press Functionality for Edit/Delete
        let pressTimer;
        
        const startPress = (e) => {
            // Prevent the long press from accidentally triggering while scrolling on touch devices
            if (e.type === 'mousedown' && e.button !== 0) return; 

            clearTimeout(pressTimer); 
            
            pressTimer = setTimeout(() => {
                document.querySelectorAll('.recipe-card.selected').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');

                currentRecipeId = recipeData.id;
                openModal(actionModal);
            }, 600); // 600ms is a standard long-press duration
        };

        const endPress = () => {
            clearTimeout(pressTimer);
        };

        // Standard Mouse Events
        card.addEventListener('mousedown', startPress);
        card.addEventListener('mouseup', endPress);
        card.addEventListener('mouseleave', endPress);

        // Touch Events
        card.addEventListener('touchstart', startPress, {passive: true});
        card.addEventListener('touchend', endPress);
        card.addEventListener('touchcancel', endPress);
        
        return card;
    };
    
    const renderRecipes = () => {
        const filteredRecipes = filterRecipes();

        recipeContainer.innerHTML = ''; 
        if (filteredRecipes.length === 0 && searchInput.value) {
            recipeContainer.innerHTML = `<p class="empty-message">No recipes found matching "${searchInput.value}".</p>`;
        } else if (filteredRecipes.length === 0) {
             updateEmptyState();
        } else {
            filteredRecipes.forEach(recipe => {
                recipeContainer.appendChild(createRecipeCard(recipe));
            });
            emptyState.style.display = 'none';
        }
    };

    // --- Action Modal Logic ---

    editActionBtn.addEventListener('click', () => {
        const recipe = recipes.find(r => r.id === currentRecipeId);
        if (!recipe) return;

        // Populate the form
        recipeIdField.value = recipe.id;
        recipeTitleInput.value = recipe.title;
        recipeSummaryInput.value = recipe.summary;
        recipeTimeInput.value = recipe.time;
        recipeCategoryInput.value = recipe.category;
        recipeIngredientsInput.value = recipe.ingredients;
        recipeInstructionsInput.value = recipe.instructions;

        // Update modal for editing
        modalTitle.textContent = 'Edit Recipe';
        modalSubmitBtn.textContent = 'Save Changes';
        
        closeModal(actionModal);
        openModal(recipeModal);
    });

    deleteActionBtn.addEventListener('click', () => {
        // Simple confirmation before deleting
        if (confirm(`Are you sure you want to permanently delete "${recipes.find(r => r.id === currentRecipeId)?.title || 'this recipe'}"?`)) {
            recipes = recipes.filter(r => r.id !== currentRecipeId);
            saveRecipes();
            renderRecipes();
            closeModal(actionModal);
        }
    });

    cancelActionBtn.addEventListener('click', () => {
        closeModal(actionModal);
    });

    // --- Form Submission Handler (Add/Edit) ---

    addRecipeForm.addEventListener('submit', (event) => {
        event.preventDefault(); 

        const formData = {
            title: recipeTitleInput.value,
            summary: recipeSummaryInput.value,
            time: recipeTimeInput.value,
            category: recipeCategoryInput.value,
            ingredients: recipeIngredientsInput.value,
            instructions: recipeInstructionsInput.value,
        };
        
        const existingId = recipeIdField.value;

        if (existingId) {
            // EDIT MODE
            const index = recipes.findIndex(r => r.id == existingId);
            if (index !== -1) {
                // Ensure the ID and any other non-form fields are preserved
                recipes[index] = { ...recipes[index], ...formData };
            }
        } else {
            // ADD MODE
            const newRecipe = {
                id: Date.now(), 
                ...formData
            };
            recipes.unshift(newRecipe);
        }

        saveRecipes();
        renderRecipes();
        closeModal(recipeModal);
    });
    
    // --- Detail View Logic ---
    const showRecipeDetails = (id) => {
        const recipe = recipes.find(r => r.id === id);
        if (!recipe) return;

        detailTitle.textContent = recipe.title;
        detailSummary.textContent = recipe.summary;
        detailTime.textContent = recipe.time;
        detailCategory.textContent = recipe.category;

        // Ingredients (Stacked Tags)
        detailIngredientsContainer.innerHTML = '';
        const ingredients = recipe.ingredients.split('\n').filter(i => i.trim() !== '');

        ingredients.forEach(ing => {
            const tag = document.createElement('div');
            tag.classList.add('ingredient-tag'); 
            tag.textContent = ing.trim();
            detailIngredientsContainer.appendChild(tag);
        });

        // Instructions (Steps)
        detailInstructionsSteps.innerHTML = '';
        const instructions = recipe.instructions.split('\n').filter(i => i.trim() !== '');

        instructions.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.classList.add('instruction-step');

            stepElement.innerHTML = `
                <div class="step-number">${index + 1}</div>
                <div class="step-content">${step.trim()}</div>
            `;
            detailInstructionsSteps.appendChild(stepElement);
        });

        openModal(detailModal);
    };

    // --- Initializer ---
    renderRecipes();
});
