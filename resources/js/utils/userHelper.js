// resources/js/utils/userHelper.js
import { computed } from 'vue';
import { usePage } from '@inertiajs/vue3';
import { EMPTY_VALUE_DISPLAY, isEmptyValue } from './constants';

/**
 * Format name with ucwords (capitalize first letter of each word)
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @returns {string} Formatted name with each word capitalized
 */
export const formatName = (firstName, lastName) => {
	if (!firstName && !lastName) return 'User';
	const fullName = `${firstName || ''} ${lastName || ''}`.trim();
	return fullName
		.split(' ')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');
};

/**
 * Mask mobile number - show all but last 5 digits as stars
 * @param {string|number|null|undefined} mobile - The mobile number to mask
 * @returns {string} - Masked mobile number (e.g., "12345*****" for "1234567890")
 */
export const maskMobileNumber = (mobile) => {
	if (isEmptyValue(mobile)) return EMPTY_VALUE_DISPLAY;
	const mobileStr = String(mobile).trim();
	if (mobileStr.length <= 5) return '*****';
	const visiblePart = mobileStr.slice(0, -5);
	const maskedPart = '*****';
	return visiblePart + maskedPart;
};

/**
 * Vue composable to get formatted user name
 * @returns {Object} Object with user and formattedUserName computed properties
 */
export const useFormattedUserName = () => {
	const page = usePage();
	const user = computed(() => page.props.auth?.user);
	
	const formattedUserName = computed(() => {
		if (!user.value) return 'User';
		return formatName(user.value.first_name, user.value.last_name);
	});
	
	return {
		user,
		formattedUserName
	};
};




