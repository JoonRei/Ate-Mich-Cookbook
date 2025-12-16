document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements (UNCHANGED) ---
    const addRecipeBtn = document.getElementById('add-recipe-btn');
    const recipeModal = document.getElementById('recipe-modal');
    const actionModal = document.getElementById('action-modal'); 
    const closeBtns = document.querySelectorAll('.close-btn');
    const addRecipeForm = document.getElementById('add-recipe-form');
    const recipeContainer = document.getElementById('recipe-container');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('recipe-search'); 

    // Modal Form Elements (UNCHANGED)
    const modalTitle = document.getElementById('modal-title');
    const modalSubmitBtn = document.getElementById('modal-submit-btn');
    const recipeIdField = document.getElementById('recipe-id-field');
    const recipeTitleInput = document.getElementById('recipe-title');
    const recipeSummaryInput = document.getElementById('recipe-summary');
    const recipeTimeInput = document.getElementById('recipe-time');
    const recipeCategoryInput = document.getElementById('recipe-category');
    const recipeIngredientsInput = document.getElementById('recipe-ingredients');
    const recipeInstructionsInput = document.getElementById('recipe-instructions');

    // Action Modal Buttons (UNCHANGED)
    const editActionBtn = document.getElementById('edit-recipe-action-btn'); 
    const deleteActionBtn = document.getElementById('delete-recipe-action-btn'); 
    const cancelActionBtn = document.getElementById('cancel-action-btn'); 
    
    // Detailed Modal Elements (UNCHANGED)
    const detailModal = document.getElementById('detail-modal');
    const detailTitle = document.getElementById('detail-title');
    const detailSummary = document.getElementById('detail-summary');
    const detailTime = document.getElementById('detail-time');
    const detailCategory = document.getElementById('detail-category');
    const detailIngredientsContainer = document.getElementById('detail-ingredients');
    const detailInstructionsSteps = document.getElementById('detail-instructions');

    // --- GLOBAL VARIABLES UPDATED ---
    let recipes = []; // Start with an empty array, data will be fetched.
    let currentRecipeId = null; 

    // REMOVED: LOCAL_STORAGE_KEY and DEFAULT_RECIPES logic is gone!

    // --- NEW: API INTERACTION FUNCTIONS ---

    // 1. Fetch recipes from the database
    const fetchRecipes = async () => {
        try {
            const response = await fetch('/.netlify/functions/recipes');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // The function endpoint is recipes.js, Netlify handles the routing
            recipes = await response.json(); 
            // Database handles sorting (DESC by created_at)
            renderRecipes();
        } catch (error) {
            console.error('Could not fetch recipes:', error);
            // Optionally display an error message to the user
            recipeContainer.innerHTML = `<p class="empty-message error">Failed to load recipes. Check your database connection.</p>`;
        }
    };
    
    // 2. Add/Edit recipe in the database
    const saveRecipeToDatabase = async (formData, isEdit) => {
        const url = `/.netlify/functions/recipes`;
        const method = isEdit ? 'PUT' : 'POST'; // We need a PUT endpoint for edits (not yet created)
        
        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                // Send the ID for updates, but not for new creations
                body: JSON.stringify(isEdit ? { id: recipeIdField.value, ...formData } : formData),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // After success, re-fetch the entire list to update the UI
            await fetchRecipes(); 
            closeModal(recipeModal);
        } catch (error) {
            console.error('Could not save recipe:', error);
            alert(`Failed to save recipe: ${error.message}.`);
        }
    };


    // --- MODAL & UI LOGIC (Mostly Unchanged, just renamed functions) ---

    const openModal = (modalElement) => {
        modalElement.style.display = 'block';
    };

    const closeModal = (modalElement) => {
        modalElement.style.display = 'none';
        if (modalElement.id === 'recipe-modal') {
            addRecipeForm.reset(); 
            recipeIdField.value = '';
        }
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
        modalSubmitBtn.textContent = 'Save Culinary Creation';
        openModal(recipeModal);
    });

    // --- Search and Filtering Logic (Uses the 'recipes' array fetched from DB) ---
    
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

    const updateEmptyState = () => {
        emptyState.style.display = recipes.length === 0 ? 'block' : 'none';
    };

    // --- RENDER FUNCTIONS (UNCHANGED) ---
    
    const createRecipeCard = (recipeData) => {
        const card = document.createElement('div');
        card.classList.add('recipe-card');
        // Note: The ID from the DB is usually a string, but this is fine.
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
        
        card.querySelector('.view-btn').addEventListener('click', (e) => {
            e.stopPropagation(); 
            showRecipeDetails(recipeData.id);
        });

        // Long Press Functionality for Edit/Delete (UNCHANGED)
        let pressTimer;
        
        const startPress = (e) => {
            if (e.type === 'mousedown' && e.button !== 0) return; 

            clearTimeout(pressTimer); 
            
            pressTimer = setTimeout(() => {
                document.querySelectorAll('.recipe-card.selected').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');

                currentRecipeId = recipeData.id;
                openModal(actionModal);
            }, 600); 
        };

        const endPress = () => {
            clearTimeout(pressTimer);
        };

        card.addEventListener('mousedown', startPress);
        card.addEventListener('mouseup', endPress);
        card.addEventListener('mouseleave', endPress);
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

    // --- Action Modal Logic (Needs UPDATE for DELETE) ---

    editActionBtn.addEventListener('click', () => {
        const recipe = recipes.find(r => r.id == currentRecipeId);
        if (!recipe) return;
        
        // Ensure form is populated correctly (Database returns number for time, etc.)
        recipeIdField.value = recipe.id;
        recipeTitleInput.value = recipe.title;
        recipeSummaryInput.value = recipe.summary;
        recipeTimeInput.value = recipe.time;
        recipeCategoryInput.value = recipe.category;
        recipeIngredientsInput.value = recipe.ingredients;
        recipeInstructionsInput.value = recipe.instructions;

        modalTitle.textContent = 'Edit Recipe';
        modalSubmitBtn.textContent = 'Save Changes';
        
        closeModal(actionModal);
        openModal(recipeModal);
    });

    deleteActionBtn.addEventListener('click', async () => {
        const recipe = recipes.find(r => r.id == currentRecipeId);
        if (!recipe) return;

        if (confirm(`Are you sure you want to permanently delete "${recipe.title}" from the live database?`)) {
            try {
                // DELETE Endpoint (Needs to be created in recipes.js)
                const response = await fetch(`/.netlify/functions/recipes?id=${currentRecipeId}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                // Re-fetch data and close modal
                await fetchRecipes(); 
                closeModal(actionModal);
            } catch (error) {
                console.error('Could not delete recipe:', error);
                alert(`Failed to delete recipe: ${error.message}`);
            }
        }
    });

    cancelActionBtn.addEventListener('click', () => {
        closeModal(actionModal);
    });

    // --- Form Submission Handler (Calls the new save function) ---

    addRecipeForm.addEventListener('submit', (event) => {
        event.preventDefault(); 

        const formData = {
            title: recipeTitleInput.value,
            summary: recipeSummaryInput.value,
            // Convert time to a number or null if empty
            time: recipeTimeInput.value ? parseInt(recipeTimeInput.value, 10) : null,
            category: recipeCategoryInput.value,
            ingredients: recipeIngredientsInput.value,
            instructions: recipeInstructionsInput.value,
        };
        
        const isEdit = !!recipeIdField.value;

        // Call the new database saving function
        saveRecipeToDatabase(formData, isEdit); 
    });
    
    // --- Detail View Logic (UNCHANGED) ---
    const showRecipeDetails = (id) => {
        const recipe = recipes.find(r => r.id == id);
        if (!recipe) return;

        detailTitle.textContent = recipe.title;
        detailSummary.textContent = recipe.summary;
        detailTime.textContent = recipe.time;
        detailCategory.textContent = recipe.category;

        detailIngredientsContainer.innerHTML = '';
        const ingredients = recipe.ingredients.split('\n').filter(i => i.trim() !== '');

        ingredients.forEach(ing => {
            const tag = document.createElement('div');
            tag.classList.add('ingredient-tag'); 
            tag.textContent = ing.trim();
            detailIngredientsContainer.appendChild(tag);
        });

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
    // Start by fetching data from the database!
    fetchRecipes(); 
});
