import { reactive } from 'vue'

const state = reactive({
  isOpen: false,
  title: '',
  text: '',
  html: '',
  icon: '',
  showCancelButton: false,
  showConfirmButton: true,
  confirmButtonText: 'OK',
  cancelButtonText: 'Cancel',
  input: null,
  inputOptions: {},
  inputPlaceholder: '',
  inputValue: '',
  allowOutsideClick: true,
  allowEscapeKey: true,
  isLoading: false,
  validationMessage: ''
})

let resolvePromise = null

const openModal = (options) => {
  state.title = options.title || ''
  state.text = options.text || ''
  state.html = options.html || ''
  state.icon = options.icon || ''
  state.showCancelButton = !!options.showCancelButton
  state.showConfirmButton = options.showConfirmButton !== false
  state.confirmButtonText = options.confirmButtonText || 'OK'
  state.cancelButtonText = options.cancelButtonText || 'Cancel'
  state.input = options.input || null
  state.inputOptions = options.inputOptions || {}
  state.inputPlaceholder = options.inputPlaceholder || ''
  state.inputValue = options.inputValue ?? ''
  state.allowOutsideClick = options.allowOutsideClick !== false
  state.allowEscapeKey = options.allowEscapeKey !== false
  state.isLoading = false
  state.validationMessage = ''
  state.isOpen = true

  if (typeof options.didOpen === 'function') {
    queueMicrotask(() => options.didOpen())
  }

  return new Promise((resolve) => {
    resolvePromise = resolve
  })
}

const closeModal = (result) => {
  state.isOpen = false
  state.isLoading = false
  state.validationMessage = ''
  if (resolvePromise) {
    resolvePromise(result)
    resolvePromise = null
  }
}

const showLoading = () => {
  state.isLoading = true
}

const showValidation = (message) => {
  state.validationMessage = message
}

export const appModalStore = {
  state,
  openModal,
  closeModal,
  showLoading,
  showValidation
}
