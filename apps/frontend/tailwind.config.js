/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // MapleLaw brand colors
                maple: {
                    50: '#fef7f0',
                    100: '#fdebd9',
                    200: '#fad3b1',
                    300: '#f6b580',
                    400: '#f18c4d',
                    500: '#ec6c28',
                    600: '#dd511e',
                    700: '#b73d1a',
                    800: '#92321d',
                    900: '#762c1b',
                    950: '#40130c',
                },
                // Canadian theme
                canada: {
                    red: '#ff0000',
                    white: '#ffffff',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
