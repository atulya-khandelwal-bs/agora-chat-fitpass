/**
 * Icon Helper Utility
 * 
 * Provides dynamic icon loading with fallback to default placeholder
 */

// Inline SVG placeholder (28x28px grey rounded square with icon)
// This is used as ultimate fallback when icon files don't exist
const DEFAULT_ICON = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgiIGhlaWdodD0iMjgiIHZpZXdCb3g9IjAgMCAyOCAyOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjgiIGhlaWdodD0iMjgiIGZpbGw9IiNlN2U5ZWIiIHJ4PSI0Ii8+PHBhdGggZD0iTTEwIDExSDE4VjEzSDEwVjExWk0xMCAxNUgxNlYxN0gxMFYxNVoiIGZpbGw9IiM5YzljOWMiLz48L3N2Zz4='

// Icon mapping: Maps label keys to icon file paths
const iconMapping = {
  // Health Details
  'Goal': '/images/icons/goal.png',
  'Height': '/images/icons/height.png',
  'Weight': '/images/icons/weight.png',
  'BMI': '/images/icons/bmi.png',
  'Food Preference': '/images/icons/food-preference.png',
  
  // Membership
  'Active Plan': '/images/icons/active-plan.png',
  'Corporate': '/images/icons/corporate.png',
  'Corporate Name': '/images/icons/corporate-name.png',
  'Plan Expiry': '/images/icons/plan-expiry.png',
  
  // Meal Log
  'Last Week log': '/images/icons/last-week-log.png',
  'Water Intake': '/images/icons/water-Intake.png',
  'Heart Rate': '/images/icons/heart-rate.png',
  'Steps': '/images/icons/steps.png',
  'Workout': '/images/icons/workout.png',
  'HRA Completed': '/images/icons/hra-completed.png',
}

/**
 * Get icon path for a given label
 * Returns the mapped icon path or default placeholder if not found
 * 
 * @param {string} label - The label/key for the icon
 * @returns {string} - Icon path
 */
export function getIconPath(label) {
  return iconMapping[label] || DEFAULT_ICON
}

/**
 * Get icon path with error handling
 * If icon fails to load, falls back to default
 * 
 * @param {string} label - The label/key for the icon
 * @returns {Object} - Object with src and onError handler
 */
export function getIconWithFallback(label) {
  const iconPath = getIconPath(label)
  
  return {
    src: iconPath,
    onError: (event) => {
      // If icon fails to load, use default placeholder
      if (event.target.src !== DEFAULT_ICON) {
        event.target.src = DEFAULT_ICON
      }
    }
  }
}

/**
 * Check if icon exists (for future use with API calls)
 * Currently returns the mapped path - can be enhanced to check file existence
 * 
 * @param {string} label - The label/key for the icon
 * @returns {Promise<boolean>} - Whether icon exists
 */
export async function iconExists(label) {
  const iconPath = getIconPath(label)
  
  // For now, just check if it's not the default
  // Can be enhanced to make actual HTTP request to check
  return iconPath !== DEFAULT_ICON
}

/**
 * Add or update icon mapping
 * Useful for dynamic icon updates
 * 
 * @param {string} label - The label/key
 * @param {string} iconPath - Path to the icon file
 */
export function setIconMapping(label, iconPath) {
  iconMapping[label] = iconPath
}

/**
 * Get all icon mappings
 * Useful for debugging or admin panels
 * 
 * @returns {Object} - All icon mappings
 */
export function getAllIconMappings() {
  return { ...iconMapping }
}

