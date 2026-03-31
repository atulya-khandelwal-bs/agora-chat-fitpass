import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';

export default defineConfig({
    build: {
        chunkSizeWarningLimit: 4000,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // Check for React dependencies FIRST (before splitting Agora packages)
                    if (id.includes('react/') || id.includes('react-dom/') || id.includes('react/jsx-runtime') || id.includes('react-dom/client')) {
                        return 'react-vendor';
                    }
                    
                    // React-related packages that depend on React - put in same chunk
                    if (id.includes('emoji-picker-react') || id.includes('lucide-react')) {
                        return 'react-vendor';
                    }
                    
                    // Split Agora SDK packages - agora-rtc-react in its own chunk (not react-vendor)
                    // This ensures it only loads when chat/call features are used
                    if (id.includes('agora-rtc-react')) {
                        return 'agora-rtc-react';
                    }
                    
                    // Split other Agora SDK packages
                    if (id.includes('agora-chat')) {
                        return 'agora-chat';
                    }
                    if (id.includes('agora-rtc-sdk-ng')) {
                        return 'agora-rtc-sdk';
                    }
                    if (id.includes('agora-extension-virtual-background')) {
                        return 'agora-extensions';
                    }

                    // Check for Vue dependencies FIRST (before splitting editor)
                    if (id.includes('node_modules')) {
                        if (id.includes('vue') && !id.includes('vue-router') && !id.includes('vuex')) {
                            return 'vue-vendor';
                        }
                    }
                    
                    // CKEditor packages - keep both together in editor chunk to avoid circular dependencies
                    // The Vue dependency will be resolved from vue-vendor chunk when needed
                    if (id.includes('@ckeditor/ckeditor5-build-classic') || id.includes('@ckeditor/ckeditor5-vue')) {
                        return 'editor';
                    }

                    // FullCalendar packages
                    if (id.includes('@fullcalendar/')) {
                        return 'calendar';
                    }

                    // Chart libraries (ApexCharts only)
                    if (id.includes('apexcharts') || id.includes('vue3-apexcharts')) {
                        return 'charts';
                    }

                    // Other large node_modules
                    if (id.includes('node_modules')) {
                        if (id.includes('@inertiajs')) {
                            return 'inertia-vendor';
                        }
                        if (id.includes('axios') || id.includes('sweetalert2')) {
                            return 'utils-vendor';
                        }
                        if (id.includes('bootstrap') || id.includes('@bootstrap')) {
                            return 'bootstrap-vendor';
                        }
                    }

                    // Chat-related components (local files)
                    if (id.includes('ChatConsole') || id.includes('FPChatWrapper') || id.includes('FitpassUserDetailPanel')) {
                        return 'chat-components';
                    }
                },
            },
        },
    },
    plugins: [
        laravel({
            input: 'resources/js/app.js',
            refresh: true,
        }),
        vue({
            template: {
                transformAssetUrls: {
                    base: null,
                    includeAbsolute: false,
                },
            },
        }),
        react({
            fastRefresh: false,
        }),
    ],
    resolve: {
        alias: {
            '@assets': '/resources/', // Update this with the correct path to your images
            '@favicon': '/resources/images/', // Update this with the correct path to your images
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['resources/js/**/*.spec.js', 'resources/js/**/*.spec.ts'],
    },
});
