/**
 * Diet Edit Page Configuration
 * 
 * Static configurations for the diet edit page.
 * Extracted to keep the main edit.vue file cleaner.
 */

export const nutritionDataConfig = [
    {
        key: 'calories',
        label: 'Calories',
        color: 'danger',
        icon: 'fire-line',
        givenKey: 'calories_given',
        takenKey: 'calories_taken',
        unit: ''
    },
    {
        key: 'protein',
        label: 'Protein',
        color: 'success',
        icon: 'dumbbell-line',
        givenKey: 'protein_given',
        takenKey: 'protein_taken',
        unit: 'g'
    },
    {
        key: 'carbs',
        label: 'Carbs',
        color: 'warning',
        icon: 'cake-line',
        givenKey: 'carbs_given',
        takenKey: 'carbs_taken',
        unit: 'g'
    },
    {
        key: 'fat',
        label: 'Fat',
        color: 'info',
        icon: 'oil-line',
        givenKey: 'fat_given',
        takenKey: 'fat_taken',
        unit: 'g'
    },
    {
        key: 'fiber',
        label: 'Fiber',
        color: 'secondary',
        icon: 'leaf-line',
        givenKey: 'fibre_given',
        takenKey: 'fibre_taken',
        unit: 'g'
    }
]

export const modalConfigs = {
    copy: {
        title: 'Copy Meal Category',
        icon: 'ri-file-copy-line',
        iconBg: '#e3f2fd',
        iconColor: 'text-primary',
        okVariant: 'primary',
        okTitle: 'Copy Items',
        content: 'copy'
    },
    move: {
        title: 'Move Meal Category',
        icon: 'ri-arrow-right-line',
        iconBg: '#fff3cd',
        iconColor: 'text-warning',
        okVariant: 'warning',
        okTitle: 'Move Items',
        content: 'move'
    },
    copyDate: {
        title: 'Copy Entire Date',
        icon: 'ri-calendar-check-line',
        iconBg: '#e8f5e8',
        iconColor: 'text-success',
        okVariant: 'success',
        okTitle: 'Copy',
        content: 'copyDate'
    },
    moveDate: {
        title: 'Move Entire Date',
        icon: 'ri-calendar-move-line',
        iconBg: '#fff3cd',
        iconColor: 'text-warning',
        okVariant: 'warning',
        okTitle: 'Move Entire Day',
        content: 'moveDate'
    },
    reassign: {
        title: 'Reassign Diet',
        icon: 'ri-repeat-line',
        iconBg: '#d4edda',
        iconColor: 'text-success',
        okVariant: 'success',
        okTitle: 'Reassign Diet',
        content: 'reassign'
    }
}

