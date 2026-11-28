import { GAMEPLAY_LIMITS } from './config';
import { MENU_RECIPE_LIST, RECIPE_LIST } from './recipes';
import type { DrinkInventoryMap, InventorySlot, RecipeId } from './types';

function clampCapacity(ml: number): number {
  const stepped = Math.round(ml / GAMEPLAY_LIMITS.CAPACITY_STEP_ML) * GAMEPLAY_LIMITS.CAPACITY_STEP_ML;
  return Math.max(
    GAMEPLAY_LIMITS.MIN_CAPACITY_ML,
    Math.min(GAMEPLAY_LIMITS.MAX_CAPACITY_ML, stepped)
  );
}

export function createInitialInventory(
  defaultCapacityMl: number = GAMEPLAY_LIMITS.DEFAULT_CAPACITY_ML
): DrinkInventoryMap {
  const maxMl = clampCapacity(defaultCapacityMl);
  const map = {} as DrinkInventoryMap;

  for (const recipe of RECIPE_LIST) {
    map[recipe.id] = {
      recipeId: recipe.id,
      currentMl: maxMl,
      maxMl,
      restockAt: null,
    };
  }
  return map;
}

export function isRecipeAvailable(
  inventory: DrinkInventoryMap,
  recipeId: RecipeId
): boolean {
  return inventory[recipeId].currentMl >= GAMEPLAY_LIMITS.COST_PER_DRINK_ML;
}

export function isRecipeLowStock(slot: InventorySlot): boolean {
  return slot.currentMl > 0 && slot.currentMl <= GAMEPLAY_LIMITS.LOW_STOCK_THRESHOLD_ML;
}

export function areAllRecipesSoldOut(inventory: DrinkInventoryMap): boolean {
  return MENU_RECIPE_LIST.every(
    (recipe) => inventory[recipe.id].currentMl < GAMEPLAY_LIMITS.COST_PER_DRINK_ML
  );
}

export function pickAvailableRecipeId(inventory: DrinkInventoryMap): RecipeId {
  const available = MENU_RECIPE_LIST.filter((r) => isRecipeAvailable(inventory, r.id));
  if (available.length === 0) {
    return MENU_RECIPE_LIST[0].id;
  }
  const index = Math.floor(Math.random() * available.length);
  return available[index].id;
}

export function restockAllRecipes(inventory: DrinkInventoryMap): DrinkInventoryMap {
  const next = { ...inventory };
  for (const recipe of RECIPE_LIST) {
    const slot = next[recipe.id];
    next[recipe.id] = {
      ...slot,
      currentMl: slot.maxMl,
      restockAt: null,
    };
  }
  return next;
}

export function restockSingleRecipe(
  inventory: DrinkInventoryMap,
  recipeId: RecipeId,
  addMl?: number
): DrinkInventoryMap {
  const slot = inventory[recipeId];
  const nextMl =
    typeof addMl === 'number'
      ? Math.min(slot.maxMl, slot.currentMl + Math.max(0, addMl))
      : slot.maxMl;

  return {
    ...inventory,
    [recipeId]: {
      ...slot,
      currentMl: nextMl,
      restockAt: nextMl >= GAMEPLAY_LIMITS.COST_PER_DRINK_ML ? null : slot.restockAt,
    },
  };
}

export function deductDrinkStock(
  inventory: DrinkInventoryMap,
  recipeId: RecipeId,
  autoRestockEnabled: boolean,
  now: number
): DrinkInventoryMap {
  const slot = inventory[recipeId];
  const nextMl = Math.max(0, slot.currentMl - GAMEPLAY_LIMITS.COST_PER_DRINK_ML);
  const becameEmpty = nextMl < GAMEPLAY_LIMITS.COST_PER_DRINK_ML;

  const updated: DrinkInventoryMap = {
    ...inventory,
    [recipeId]: {
      ...slot,
      currentMl: nextMl,
      restockAt:
        becameEmpty && autoRestockEnabled
          ? slot.restockAt ?? now + GAMEPLAY_LIMITS.AUTO_RESTOCK_DELAY_MS
          : null,
    },
  };

  if (areAllRecipesSoldOut(updated)) {
    return restockAllRecipes(updated);
  }
  return updated;
}

export function refundDrinkStock(
  inventory: DrinkInventoryMap,
  recipeId: RecipeId
): DrinkInventoryMap {
  const slot = inventory[recipeId];
  const nextMl = Math.min(slot.maxMl, slot.currentMl + GAMEPLAY_LIMITS.COST_PER_DRINK_ML);
  return {
    ...inventory,
    [recipeId]: {
      ...slot,
      currentMl: nextMl,
      restockAt: nextMl >= GAMEPLAY_LIMITS.COST_PER_DRINK_ML ? null : slot.restockAt,
    },
  };
}

export function resupplyLowestOnGift(
  inventory: DrinkInventoryMap,
  amountMl: number = GAMEPLAY_LIMITS.GIFT_RESUPPLY_ML
): DrinkInventoryMap {
  let targetRecipe: RecipeId = MENU_RECIPE_LIST[0].id;
  let lowestMl = Number.POSITIVE_INFINITY;

  for (const recipe of MENU_RECIPE_LIST) {
    const slot = inventory[recipe.id];
    if (slot.currentMl < slot.maxMl && slot.currentMl < lowestMl) {
      lowestMl = slot.currentMl;
      targetRecipe = recipe.id;
    }
  }

  if (lowestMl === Number.POSITIVE_INFINITY) {
    return inventory;
  }
  return restockSingleRecipe(inventory, targetRecipe, amountMl);
}

export function updateInventoryMaxCapacity(
  inventory: DrinkInventoryMap,
  nextCapacityMl: number
): DrinkInventoryMap {
  const maxMl = clampCapacity(nextCapacityMl);
  const next = { ...inventory };

  for (const recipe of RECIPE_LIST) {
    const slot = next[recipe.id];
    const diff = maxMl - slot.maxMl;
    const adjusted = diff > 0 ? slot.currentMl + diff : Math.min(maxMl, slot.currentMl);
    next[recipe.id] = {
      ...slot,
      maxMl,
      currentMl: Math.max(0, adjusted),
    };
  }
  return next;
}

export function tickInventoryAutoRestock(
  inventory: DrinkInventoryMap,
  autoRestockEnabled: boolean,
  now: number
): DrinkInventoryMap {
  if (areAllRecipesSoldOut(inventory)) {
    return restockAllRecipes(inventory);
  }
  if (!autoRestockEnabled) {
    return inventory;
  }

  let changed = false;
  const next = { ...inventory };

  for (const recipe of RECIPE_LIST) {
    const slot = next[recipe.id];
    if (slot.currentMl < GAMEPLAY_LIMITS.COST_PER_DRINK_ML) {
      if (slot.restockAt === null) {
        changed = true;
        next[recipe.id] = {
          ...slot,
          restockAt: now + GAMEPLAY_LIMITS.AUTO_RESTOCK_DELAY_MS,
        };
      } else if (now >= slot.restockAt) {
        changed = true;
        next[recipe.id] = {
          ...slot,
          currentMl: slot.maxMl,
          restockAt: null,
        };
      }
    }
  }

  return changed ? next : inventory;
}
