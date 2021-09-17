module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
    },
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        'object-curly-spacing': ['error', 'never'],
        'curly': ['error', 'multi-line', 'consistent'],
        'no-loss-of-precision': 'error',
        'no-promise-executor-return': 'error',
        'no-useless-backreference': 'error',
        'require-atomic-updates': 'error',
        'default-param-last': 'error',
        'default-case-last': 'error',
        'eqeqeq': 'error',
        'dot-location': ['warn', 'property'],
        'guard-for-in': 'error',
        'no-caller': 'error',
        'no-implicit-coercion': 'error',
        'no-floating-decimal': 'error',
        'no-implied-eval': 'error',
        'no-multi-spaces': 'warn',
        'no-octal-escape': 'error',
        'no-sequences': 'error',
        'no-unused-expressions': 'warn',
        'no-useless-call': 'warn',
        'no-useless-return': 'warn',
        'no-void': 'error',
        'radix': 'error',
        'array-bracket-spacing': ['warn', 'never'],
        'no-restricted-globals': ['error', 'length', 'name', 'event', 'closed', 'history', 'status'],
        '@typescript-eslint/comma-dangle': ['warn', 'always-multiline'],
        '@typescript-eslint/comma-spacing': 'warn',
        'quotes': ['warn', 'single', {allowTemplateLiterals: true}],
        'eol-last': 'warn',
        'func-call-spacing': 'warn',
        'key-spacing': 'warn',
        'semi-spacing': 'warn',
        'semi-style': 'warn',
        'prefer-const': 'warn',
        'no-constant-condition': ['warn', {checkLoops: false}],
        'no-trailing-spaces': 'warn',
        '@typescript-eslint/explicit-module-boundary-types': ['warn', {
            allowArgumentsExplicitlyTypedAsAny: true,
        }],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', {
            args: 'all',
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            
        }],
        '@typescript-eslint/no-namespace': 'off',
        'semi': 'off', // superseded by typescript-eslint/semi
        '@typescript-eslint/semi': 'warn',
        '@typescript-eslint/member-delimiter-style': 'warn',
        '@typescript-eslint/no-invalid-this': 'warn',
        '@typescript-eslint/no-unused-expressions': 'warn',
        '@typescript-eslint/type-annotation-spacing': 'warn',
        '@typescript-eslint/no-floating-promises': 'warn',
        "no-return-await": "off",
        "@typescript-eslint/return-await": ['warn', 'always'],
        "@typescript-eslint/no-misused-promises": ['warn', {
            checksConditionals: true,
            checksVoidReturn: true,
        }],
        '@typescript-eslint/strict-boolean-expressions': ['warn', {
            allowString: false,
            allowNumber: false,
            allowNullableBoolean: true,
        }],
        '@typescript-eslint/no-inferrable-types': ['warn', {
            ignoreParameters: true,
            ignoreProperties: true,
        }],
        '@typescript-eslint/array-type': ['warn', {default: 'generic'}],

        // This would be great, but it's currently too aggressive.
        '@typescript-eslint/no-unnecessary-condition': 'off',

        // This rule has a bunch of bugs: https://github.com/typescript-eslint/typescript-eslint/issues/1824
        // The one I ran into is multi-line parameter lists with parameter decorators.
        // What we want to set it to: ['warn', 4, {SwitchCase: 1}],
        '@typescript-eslint/indent': 'off',
    },
};
