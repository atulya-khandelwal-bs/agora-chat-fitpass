const configCache = new Map()

// Use Vite's glob import to support dynamic module loading
const configImporters = import.meta.glob('../config/modules/*.js')

export async function loadModuleConfig(moduleKey) {
    if (configCache.has(moduleKey)) return configCache.get(moduleKey)

    const path = `../config/modules/${moduleKey}.js`
    const importer = configImporters[path]
    if (!importer) throw new Error(`Module config not found for key: ${moduleKey}`)

    const mod = (await importer()).default
    configCache.set(moduleKey, mod)
    return mod
}


