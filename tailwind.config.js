/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                maple: {
                    50: '#fef7f3',
                    100: '#fdeee6',
                    200: '#fbd9c7',
                    300: '#f8bfa0',
                    400: '#f49a6e',
                    500: '#EC6C28', // Primary MapleLaw orange
                    600: '#d45a1e',
                    700: '#b0461a',
                    800: '#8d3a1b',
                    900: '#733219',
                    950: '#3e170a',
                },
                trust: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    200: '#bbf7d0',
                    500: '#22c55e',
                    600: '#16a34a',
                    700: '#15803d',
                },
                warning: {
                    50: '#fffbeb',
                    100: '#fef3c7',
                    200: '#fde68a',
                    500: '#f59e0b',
                    600: '#d97706',
                },
                danger: {
                    50: '#fef2f2',
                    100: '#fee2e2',
                    200: '#fecaca',
                    500: '#ef4444',
                    600: '#dc2626',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
