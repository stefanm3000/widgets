# Shared ESLint configuration

`@pulse/eslint-config/base` exports the base flat configuration.
`@pulse/eslint-config/react-internal` adds browser globals and React Hooks rules.

Consumers use `eslint . --max-warnings 0` and declare this private workspace package as a development dependency. Lint failures remain errors.
