import axios from 'axios';
import { ref } from 'vue';

export function useApi(baseConfig = {}) {
    const isLoading = ref(false);
    const apiError = ref(null);

    const request = async (config) => {
        isLoading.value = true;
        apiError.value = null;

        try {
            const response = await axios({
                ...baseConfig,
                ...config,
            });
            return response.data ?? response;
        } catch (error) {
            apiError.value = error;
            if (typeof baseConfig.onError === 'function') {
                baseConfig.onError(error);
            }
            throw error;
        } finally {
            isLoading.value = false;
        }
    };

    const get = (url, config = {}) => request({ method: 'get', url, ...config });
    const post = (url, data, config = {}) => request({ method: 'post', url, data, ...config });
    const put = (url, data, config = {}) => request({ method: 'put', url, data, ...config });
    const del = (url, config = {}) => request({ method: 'delete', url, ...config });

    return {
        request,
        get,
        post,
        put,
        del,
        isLoading,
        apiError,
    };
}

