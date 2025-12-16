document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Setup ---
    // The 'db' object is now available globally, initialized in index.html
    const recipesRef = db.ref('recipes'); // Reference to the 'recipes' node in RTDB

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

    // Local array to hold fetched data
    let recipes = []; 
    let currentRecipeId = null; 

    // --- REALTIME DATABASE CRUD Functions ---
    
    const setupRealtimeListener = () => {
        // The core real-time function: runs once and then every time data changes
        recipesRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                // Convert the RTDB object structure into a local array
                // The key in RTDB becomes the recipe ID
                recipes = Object.keys(data).map(key => ({
                    id: key, 
                    ...data[key]
                }));

                // Sort by creation time (descending), using a property we will add in save/update
                recipes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); 
            } else {
                recipes = [];
            }
            renderRecipes(); // Render the UI with the new data
        }, (errorObject) => {
            console.error('The read failed:', errorObject.name);
            recipeContainer.innerHTML = `<p class="empty-message error">Could not connect to the Realtime Database.</p>`;
        });
    };
    
    // Create/Update function
    const saveRecipeToRTDB = async (id, formData) => {
        try {
            const recipeData = {
                ...formData,
                // Use Date.now() as a simple timestamp for sorting
                createdAt: id ? recipes.find(r => r.id === id)?.createdAt : Date.now() 
            };

            if (id) {
                // UPDATE MODE: Update the specific child node
                await recipesRef.child(id).update(recipeData);
            } else {
                // ADD MODE: Use push() to get a unique key, and set() the data
                await recipesRef.push(recipeData);
            }
            
            closeModal(recipeModal);
        } catch (error) {
            console.error('Error saving recipe to RTDB:', error);
            alert('Failed to save recipe. Please try again.');
        }
    };

    const deleteRecipeFromRTDB = async (id) => {
        try {
            // Use remove() to delete the specific child node
            await recipesRef.child(id).remove();
            
            closeModal(actionModal);
        } catch (error) {
            console.error('Error deleting recipe from RTDB:', error);
            alert('Failed to delete recipe. Please try again.');
        }
    };


    // --- Modal Functions (No changes needed) ---
    
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
        modalSubmitBtn.textContent = 'Save Recipe';
        openModal(recipeModal);
    });

    // --- Search and Filtering Logic (No changes needed) ---
    
    searchInput.addEventListener('input', () => {
        renderRecipes(); 
    });

    const filterRecipes = () => {
        const query = searchInput.value.toLowerCase().trim();
        if (!query) return recipes;

        return recipes.filter(recipe => 
            (recipe.title && recipe.title.toLowerCase().includes(query)) ||
            (recipe.category && recipe.category.toLowerCase().includes(query))
        );
    };

    // --- Recipe Display and Long Press Logic (No major functional changes) ---

    const updateEmptyState = () => {
        emptyState.style.display = (recipes.length === 0 && !searchInput.value) ? 'block' : 'none';
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
        } else {
            filteredRecipes.forEach(recipe => {
                recipeContainer.appendChild(createRecipeCard(recipe));
            });
            updateEmptyState();
        }
    };

    // --- Action Modal Logic (Modified to call RTDB delete) ---

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
        const recipeTitle = recipes.find(r => r.id === currentRecipeId)?.title || 'this recipe';
        if (confirm(`Are you sure you want to permanently delete "${recipeTitle}"?`)) {
            // Call RTDB delete function
            deleteRecipeFromRTDB(currentRecipeId); 
        }
    });

    cancelActionBtn.addEventListener('click', () => {
        closeModal(actionModal);
    });

    // --- Form Submission Handler (Add/Edit - Modified to call RTDB save/update) ---

    addRecipeForm.addEventListener('submit', (event) => {
        event.preventDefault(); 

        const formData = {
            title: recipeTitleInput.value,
            summary: recipeSummaryInput.value,
            time: parseInt(recipeTimeInput.value), 
            category: recipeCategoryInput.value,
            ingredients: recipeIngredientsInput.value,
            instructions: recipeInstructionsInput.value,
        };
        
        const existingId = recipeIdField.value;

        // Call the unified save function
        saveRecipeToRTDB(existingId, formData);
    });
    
    // --- Detail View Logic (No changes needed) ---
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
    // Start by setting up the real-time listener
    setupRealtimeListener(); 
});
