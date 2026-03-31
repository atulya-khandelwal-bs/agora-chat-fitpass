// Simple, config-driven validator

function isEmpty(value) {
    if (Array.isArray(value)) return value.length === 0
    return value === undefined || value === null || String(value).trim() === ''
}

function isValidDate(value) {
    if (!value) return false
    const date = new Date(value)
    return date instanceof Date && !isNaN(date)
}

function parseRule(rule) {
    const [name, paramStr] = rule.split(':')
    const params = (paramStr || '').split(',').filter(Boolean)
    return { name, params }
}

export function validateFieldByConfig(fieldConfig, formData) {
    if (!fieldConfig || !fieldConfig.validation) return null
    // Skip validation entirely if field is explicitly disabled by config
    if (fieldConfig.disabled === true) return null
    const value = formData[fieldConfig.name]
    for (const rule of fieldConfig.validation) {
        const { name, params } = parseRule(rule)

        if (name === 'required') {
            if (isEmpty(value)) return `${fieldConfig.label} is required`
        }
        if (name === 'requiredIf') {
            // format: requiredIf:otherField=expectedValue
            const [pair] = params
            if (pair && pair.includes('=')) {
                const [otherField, expectedRaw] = pair.split('=')
                const otherValue = formData[otherField]
                const expected = isNaN(Number(expectedRaw)) ? expectedRaw : Number(expectedRaw)
                if (otherValue === expected && isEmpty(value)) return `${fieldConfig.label} is required`
            }
        }
        if (name === 'minLength') {
            const min = Number(params[0] || 0)
            if (!isEmpty(value) && String(value).length < min) return `${fieldConfig.label} must be at least ${min} characters`
        }
        if (name === 'maxLength') {
            const max = Number(params[0] || 0)
            if (!isEmpty(value) && String(value).length > max) return `${fieldConfig.label} must be at most ${max} characters`
        }
        if (name === 'minItems') {
            const min = Number(params[0] || 0)
            if (Array.isArray(value) && value.length < min) return `${fieldConfig.label} must have at least ${min} items`
        }
        if (name === 'date') {
            if (!isEmpty(value) && !isValidDate(value)) return `Please enter a valid date`
        }
        if (name === 'datetime') {
            if (!isEmpty(value) && !isValidDate(value)) return `Please enter a valid date and time`
        }
        if (name === 'after') {
            const otherField = params[0]
            const otherValue = formData[otherField]
            if (isValidDate(value) && isValidDate(otherValue)) {
                if (new Date(value) < new Date(otherValue)) return `${fieldConfig.label} must be after or equal to ${otherField.replaceAll('_', ' ')}`
            }
        }
    }
    return null
}

export function validateDataByConfigs(fieldConfigs, formData) {
    const errors = {}
    for (const field of fieldConfigs) {
        const error = validateFieldByConfig(field, formData)
        if (error) errors[field.name] = error
    }
    return errors
}


