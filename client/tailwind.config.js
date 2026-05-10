/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            boxShadow: {
                glow: '0 20px 80px rgba(15, 23, 42, 0.18)',
            },
            backgroundImage: {
                'mesh-gradient': 'radial-gradient(circle at top left, rgba(14,165,233,0.22), transparent 30%), radial-gradient(circle at 85% 15%, rgba(16,185,129,0.18), transparent 28%), linear-gradient(135deg, #08111f 0%, #0f172a 40%, #111827 100%)',
            },
        },
    },
    plugins: [],
};
