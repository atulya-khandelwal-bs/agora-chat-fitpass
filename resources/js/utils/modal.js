import { appModalStore } from '@/stores/appModal'

const normalizeOptions = (optionsOrTitle, text, icon) => {
    if (typeof optionsOrTitle === 'string') {
        return {
            title: optionsOrTitle,
            text: text || '',
            icon: icon || ''
        }
    }
    return { ...(optionsOrTitle || {}) }
}

const fire = (optionsOrTitle, text, icon) => {
    const options = normalizeOptions(optionsOrTitle, text, icon)

    const modalOptions = {
        title: options.title || '',
        text: options.text || '',
        html: options.html || '',
        icon: options.icon || '',
        showCancelButton: !!options.showCancelButton,
        showConfirmButton: options.showConfirmButton !== false,
        confirmButtonText: options.confirmButtonText || (options.showConfirmButton === false ? 'OK' : 'OK'),
        cancelButtonText: options.cancelButtonText || 'Cancel',
        input: options.input || null,
        inputOptions: options.inputOptions || {},
        inputPlaceholder: options.inputPlaceholder || '',
        inputValue: options.inputValue ?? '',
        allowOutsideClick: options.allowOutsideClick !== false,
        allowEscapeKey: options.allowEscapeKey !== false,
        didOpen: options.didOpen
    }

    const promise = appModalStore.openModal(modalOptions)

    if (options.timer) {
        setTimeout(() => {
            appModalStore.closeModal({ isConfirmed: true, value: modalOptions.inputValue || true })
        }, options.timer)
    }

    return promise
}

const showLoading = () => {
    appModalStore.showLoading()
}

export const modal = {
    fire,
    showLoading
}
