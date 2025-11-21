module.exports = {
    // Specifies the execution environment
    env: {
        browser: true,
        es2020: true,
        node: true
    },
    // Extends recommended configurations
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
    ],
    // Specifies the parser options
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        // Enable JSX/TSX
        ecmaFeatures: {
            jsx: true,
        },
    },
    // Defines which modules/plugins to use
    plugins: ['react', 'react-refresh'],
    // Custom rules for your project
    rules: {
        // Required for React 17/18 without needing 'import React'
        'react/react-in-jsx-scope': 'off',
        // Allow PropTypes to be optional, but good practice is to define props
        'react/prop-types': 'off',
        // Vite-specific rule to prevent early disposal errors
        'react-refresh/only-export-components': [
            'warn',
            { allowConstantExport: true },
        ],
    },
    // Settings for plugins
    settings: {
        react: {
            version: '18.2' // Tell ESLint which React version to use
        }
    }
};
